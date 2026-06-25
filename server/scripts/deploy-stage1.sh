#!/usr/bin/env bash
# =============================================================================
#  中集智历 - 阶段 1 部署脚本 (R0 阶段 1.5 部署抢救)
# =============================================================================
#  用途:把本地 server/ 同步到生产 ECS 并跑完阶段 1 落地动作。
#  关联计划:docs/plans/2026-06-25-r0-recovery-plan.md §2.1
#
#  阶段 1 阶段 1.5 修复目标(审计 audit 2026-06-25 揭露的 100% 未生效问题):
#    1) prisma generate    — 重新生成含 ProjectSummary model 的 client
#    2) prisma migrate     — apply 20260625000000_add_project_summary
#    3) add-wangtian       — 王田补 5 个核心项目 ProjectMember
#    4) tsc                — 重新编译 dist/app.js
#    5) pm2 restart        — 重启进程
#    6) probe-stage1.sh    — 7 端点 + 1 表 + 1 SQL 全 PASS
#
#  用法:
#    # 1) 默认(在本地开发机跑):rsync + SSH 远端执行
#    server/scripts/deploy-stage1.sh
#
#    # 2) 在生产远端直接跑(已先手动 rsync 过)
#    ssh root@118.178.120.99 'cd /opt/zjzl-calendar/server && bash scripts/deploy-stage1.sh'
#
#    # 3) 干跑一遍,只打印不会真做
#    server/scripts/deploy-stage1.sh --dry-run
#
#    # 4) 只跑某一步(失败重试用)
#    server/scripts/deploy-stage1.sh --step migrate
#    server/scripts/deploy-stage1.sh --step build
#
#    # 5) 跳过某一步(高级)
#    SKIP_RSYNC=1 SKIP_BUILD=1 server/scripts/deploy-stage1.sh
#
#  可跳步骤(SKIP_<STEP>=1):
#    SKIP_RSYNC     不 rsync(默认本地跑会 rsync;远端跑会自动跳过)
#    SKIP_GENERATE  跳过 prisma generate
#    SKIP_MIGRATE   跳过 prisma migrate deploy
#    SKIP_DATA_FIX  跳过 add-wangtian-to-projects.cjs
#    SKIP_BUILD     跳过 tsc(若手工跑了 build)
#    SKIP_PM2       跳过 pm2 restart
#    SKIP_PROBE     跳过最后的 probe
#
#  退出码:
#    0   全部步骤成功
#    1   某一步失败(脚本会打印失败行号)
#    2   参数错误
#    10  rsync 失败
#    20  ssh 失败
# =============================================================================

set -euo pipefail

# ---------- 全局配置 ----------
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 生产远端(可被环境变量覆盖)
readonly REMOTE_HOST="${REMOTE_HOST:-root@118.178.120.99}"
readonly REMOTE_DIR="${REMOTE_DIR:-/opt/zjzl-calendar/server}"
# 端口
readonly REMOTE_PORT="${REMOTE_PORT:-3002}"
# 本地源目录(scripts/ 的上一级, 即 server/)
readonly LOCAL_SRC="${LOCAL_SRC:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# 步骤名 → 描述
declare -A STEP_DESC=(
  [rsync]="rsync 本地 server/ → ${REMOTE_HOST}:${REMOTE_DIR}"
  [generate]="prisma generate(重新生成 @prisma/client)"
  [migrate]="prisma migrate deploy(apply 20260625000000_add_project_summary)"
  [data_fix]="add-wangtian-to-projects.cjs(王田补 5 个核心项目成员)"
  [build]="tsc 重新编译 dist/"
  [pm2]="pm2 restart zjzl-calendar"
  [probe]="probe-stage1.sh 7 端点 + 1 表 + 1 SQL 验证"
)
# 默认执行顺序
readonly STEPS=(rsync generate migrate data_fix build pm2 probe)

# ---------- 运行模式检测 ----------
# 远端目录以 /opt/zjzl-calendar/ 开头 → 在生产远端上
# 否则 → 在本地开发机
if [[ "$PWD" == /opt/zjzl-calendar/* ]] || [[ -n "${REMOTE_MODE:-}" ]]; then
  readonly IS_REMOTE=1
else
  readonly IS_REMOTE=0
fi

# ---------- 颜色(仅在交互终端启用) ----------
if [[ -t 1 ]]; then
  readonly C_RED=$'\033[31m'
  readonly C_GREEN=$'\033[32m'
  readonly C_YELLOW=$'\033[33m'
  readonly C_BLUE=$'\033[34m'
  readonly C_BOLD=$'\033[1m'
  readonly C_RESET=$'\033[0m'
else
  readonly C_RED="" C_GREEN="" C_YELLOW="" C_BLUE="" C_BOLD="" C_RESET=""
fi

# ---------- 错误处理(打印行号) ----------
on_error() {
  local exit_code=$?
  local line_no=${1:-unknown}
  echo "${C_RED}[ERR]${C_RESET} ${SCRIPT_NAME} 第 ${line_no} 行失败,exit=${exit_code}" >&2
  echo "${C_RED}[ERR]${C_RESET} 当前步骤上下文:" >&2
  echo "${C_RED}[ERR]${C_RESET}   PWD=$PWD" >&2
  echo "${C_RED}[ERR]${C_RESET}   IS_REMOTE=$IS_REMOTE" >&2
  echo "${C_RED}[ERR]${C_RESET}   SKIP_RSYNC=${SKIP_RSYNC:-0} SKIP_BUILD=${SKIP_BUILD:-0} SKIP_PM2=${SKIP_PM2:-0}" >&2
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR

# ---------- 帮助 ----------
usage() {
  sed -n '2,52p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

# ---------- 参数解析 ----------
DRY_RUN=0
ONLY_STEP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)    DRY_RUN=1; shift ;;
    --step)       ONLY_STEP="${2:-}"; [[ -z "$ONLY_STEP" ]] && { echo "${C_RED}--step 需要参数${C_RESET}" >&2; exit 2; }; shift 2 ;;
    --help|-h)    usage ;;
    *)            echo "${C_RED}未知参数: $1${C_RESET}" >&2; exit 2 ;;
  esac
done

# ---------- 工具函数 ----------
log_step()  { echo "${C_BLUE}${C_BOLD}==[$1]==${C_RESET} $2"; }
log_ok()    { echo "${C_GREEN}  OK${C_RESET} $1"; }
log_warn()  { echo "${C_YELLOW}  WARN${C_RESET} $1"; }
log_skip()  { echo "${C_YELLOW}  SKIP${C_RESET} $1"; }
log_dry()   { echo "${C_YELLOW}  [dry-run]${C_RESET} $1"; }
log_run()   { echo "  ${C_BOLD}\$${C_RESET} $*"; }

# 执行或仅打印(干跑)
maybe_run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    log_dry "$*"
  else
    log_run "$*"
    "$@"
  fi
}

# 检查 SKIP_<STEP> 开关;返回 0 表示应当执行
should_run() {
  local name="$1"
  if [[ -n "$ONLY_STEP" ]]; then
    [[ "$name" == "$ONLY_STEP" ]]
    return
  fi
  local skip_var="SKIP_$(echo "$name" | tr '[:lower:]' '[:upper:]')"
  if [[ -n "${!skip_var:-}" ]]; then
    log_skip "$name (${skip_var}=${!skip_var})"
    return 1
  fi
  return 0
}

# 检查 ONLY_STEP 是否是有效步骤
validate_only_step() {
  if [[ -z "$ONLY_STEP" ]]; then return; fi
  for s in "${STEPS[@]}"; do
    [[ "$s" == "$ONLY_STEP" ]] && return
  done
  echo "${C_RED}未知 --step: $ONLY_STEP (有效: ${STEPS[*]})${C_RESET}" >&2
  exit 2
}

# ---------- 步骤实现 ----------
# 备份 dist/ 和 data.db(在 migrate/build 之前)
backup_state() {
  local ts
  ts="$(date +%Y%m%d-%H%M%S)"
  local bak_dir="${REMOTE_DIR}/.bak/stage1-${ts}"
  maybe_run mkdir -p "$bak_dir"
  if [[ -d "${REMOTE_DIR}/dist" ]]; then
    maybe_run cp -a "${REMOTE_DIR}/dist" "$bak_dir/dist.bak"
  else
    log_warn "dist/ 不存在,跳过备份"
  fi
  if [[ -f "${REMOTE_DIR}/prisma/data.db" ]]; then
    # 备份 db 前确认:sqlite 在线备份更安全
    if [[ $DRY_RUN -eq 0 ]] && command -v sqlite3 >/dev/null 2>&1; then
      maybe_run sqlite3 "${REMOTE_DIR}/prisma/data.db" ".backup '$bak_dir/data.db.bak'"
    else
      maybe_run cp -a "${REMOTE_DIR}/prisma/data.db" "$bak_dir/data.db.bak"
    fi
  fi
  echo "  ${C_GREEN}backup:${C_RESET} $bak_dir"
  # 把最新 bak 路径写到 .last-backup 方便 rollback
  maybe_run bash -c "echo '$bak_dir' > '${REMOTE_DIR}/.bak/.last-backup'"
}

step_rsync() {
  log_step "rsync" "${STEP_DESC[rsync]}"
  # 远端模式下不 rsync(无源)
  if [[ $IS_REMOTE -eq 1 ]]; then
    log_skip "当前在远端 ($PWD),不执行 rsync"
    return
  fi
  # 校验本地源
  [[ -f "$LOCAL_SRC/package.json" ]] || { echo "${C_RED}本地源无效: $LOCAL_SRC${C_RESET}" >&2; exit 10; }
  maybe_run rsync -av --delete \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.env \
    --exclude='*.db' \
    --exclude='*.db-journal' \
    --exclude=logs \
    --exclude=coverage \
    --exclude='.bak' \
    -e 'ssh -o StrictHostKeyChecking=accept-new' \
    "$LOCAL_SRC/" "${REMOTE_HOST}:${REMOTE_DIR}/"
}

step_generate() {
  log_step "generate" "${STEP_DESC[generate]}"
  if [[ $IS_REMOTE -eq 1 ]]; then
    maybe_run npx prisma generate
  else
    maybe_run ssh "$REMOTE_HOST" "cd $REMOTE_DIR && npx prisma generate"
  fi
  log_ok "prisma client 已重新生成"
}

step_migrate() {
  log_step "migrate" "${STEP_DESC[migrate]}"
  backup_state  # 迁移前先备份 db

  if [[ $IS_REMOTE -eq 1 ]]; then
    (
      cd "$REMOTE_DIR"
      # 6-9 老迁移:线上 db 可能已手动加了字段,prisma 会说 drift
      local skip_old='20260609000000_add_completion_evaluation_deliverable'
      if sqlite3 prisma/data.db \
           "SELECT name FROM _prisma_migrations WHERE name='$skip_old';" 2>/dev/null \
           | grep -q "$skip_old"; then
        log_ok "$skip_old 已 applied,跳过 resolve"
      else
        log_warn "标记 $skip_old 为 applied(线上 db 字段已存在,迁移漂移修复)"
        maybe_run npx prisma migrate resolve --applied "$skip_old" || true
      fi
      maybe_run npx prisma migrate deploy
    )
  else
    maybe_run ssh "$REMOTE_HOST" "cd $REMOTE_DIR && bash scripts/deploy-stage1.sh --step migrate"
  fi
  log_ok "迁移已 apply(应包含 20260625000000_add_project_summary)"
}

step_data_fix() {
  log_step "data_fix" "${STEP_DESC[data_fix]}"
  if [[ $IS_REMOTE -eq 1 ]]; then
    maybe_run node scripts/add-wangtian-to-projects.cjs
  else
    maybe_run ssh "$REMOTE_HOST" "cd $REMOTE_DIR && node scripts/add-wangtian-to-projects.cjs"
  fi
}

step_build() {
  log_step "build" "${STEP_DESC[build]}"
  if [[ $IS_REMOTE -eq 1 ]]; then
    maybe_run npx tsc
  else
    maybe_run ssh "$REMOTE_HOST" "cd $REMOTE_DIR && npx tsc"
  fi
  log_ok "dist/ 已重新编译"
}

step_pm2() {
  log_step "pm2" "${STEP_DESC[pm2]}"
  if [[ $IS_REMOTE -eq 1 ]]; then
    maybe_run pm2 restart zjzl-calendar
    maybe_run sleep 3
    maybe_run pm2 list
  else
    maybe_run ssh "$REMOTE_HOST" "cd $REMOTE_DIR && pm2 restart zjzl-calendar && sleep 3 && pm2 list | grep zjzl-calendar"
  fi
}

step_probe() {
  log_step "probe" "${STEP_DESC[probe]}"
  if [[ $IS_REMOTE -eq 1 ]]; then
    maybe_run bash scripts/probe-stage1.sh
  else
    maybe_run ssh "$REMOTE_HOST" "cd $REMOTE_DIR && bash scripts/probe-stage1.sh"
  fi
}

# ---------- 主流程 ----------
main() {
  validate_only_step

  echo "${C_BOLD}${C_BLUE}"
  echo "================================================================"
  echo "  中集智历 R0 阶段 1.5 部署脚本"
  echo "  mode    = $([[ $IS_REMOTE -eq 1 ]] && echo 'REMOTE' || echo 'LOCAL')"
  echo "  target  = ${REMOTE_HOST}:${REMOTE_DIR}"
  echo "  dry_run = $DRY_RUN"
  echo "  only    = ${ONLY_STEP:-(all steps)}"
  echo "  ts      = $(date -Iseconds 2>/dev/null || date)"
  echo "================================================================"
  echo "${C_RESET}"

  # 一次性显示本次实际会跑哪些步骤
  local will_run=()
  for s in "${STEPS[@]}"; do
    if should_run "$s"; then
      will_run+=("$s")
    fi
  done
  echo "  本次将执行:${will_run[*]:-(无)}"
  echo ""

  for s in "${STEPS[@]}"; do
    if should_run "$s"; then
      case "$s" in
        rsync)    step_rsync ;;
        generate) step_generate ;;
        migrate)  step_migrate ;;
        data_fix) step_data_fix ;;
        build)    step_build ;;
        pm2)      step_pm2 ;;
        probe)    step_probe ;;
      esac
    fi
  done

  echo ""
  echo "${C_GREEN}${C_BOLD}==[done]== 阶段 1 部署流程完成${C_RESET}"
  echo "  下一步:跑 docs/plans/2026-MM-DD-stage15-deploy-report.md 模板,把端点码/SQL/pm2 log 贴进去"
}

main "$@"
