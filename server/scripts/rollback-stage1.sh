#!/usr/bin/env bash
# =============================================================================
#  中集智历 - 阶段 1 回滚脚本 (R0 阶段 1.5 部署抢救)
# =============================================================================
#  用途:回滚阶段 1 部署产生的变更。
#  关联计划:docs/plans/2026-06-25-r0-recovery-plan.md §2.1 + §2.4
#
#  回滚目标(默认行为):
#    1) 备份当前 dist/       → dist.bak.<ts>
#    2) 备份当前 data.db     → data.db.bak.<ts>(用 sqlite3 .backup 事务安全)
#    3) 恢复 dist/ 到上一个 deploy 前的备份
#    4) 恢复 data.db 到上一个 deploy 前的备份
#    5) pm2 restart 让代码生效
#
#  用法:
#    # 默认:回滚到上一个 .bak/ 目录(最近一次 deploy 前的状态)
#    bash scripts/rollback-stage1.sh
#
#    # 回滚到指定 git tag/commit 的 dist(本地需有该 ref)
#    bash scripts/rollback-stage1.sh --to 6b8151a1
#
#    # 只回滚 dist 不动 db
#    bash scripts/rollback-stage1.sh --dist-only
#
#    # 只回滚 db 不动 dist
#    bash scripts/rollback-stage1.sh --db-only
#
#    # 只备份,不做任何恢复
#    bash scripts/rollback-stage1.sh --backup-only
#
#    # 干跑
#    bash scripts/rollback-stage1.sh --dry-run
#
#  退出码:
#    0   成功
#    1   回滚失败(打印行号)
#    2   参数错误
#    3   没找到可回滚的备份
#    4   备份目录不完整(dist 或 db 缺失)
# =============================================================================

set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly REMOTE_DIR="${REMOTE_DIR:-/opt/zjzl-calendar/server}"
readonly LOCAL_SRC="${LOCAL_SRC:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# 颜色(只在交互终端)
if [[ -t 1 ]]; then
  readonly C_RED=$'\033[31m' C_GREEN=$'\033[32m' C_YELLOW=$'\033[33m' C_BLUE=$'\033[34m' C_BOLD=$'\033[1m' C_RESET=$'\033[0m'
else
  readonly C_RED="" C_GREEN="" C_YELLOW="" C_BLUE="" C_BOLD="" C_RESET=""
fi

on_error() {
  local exit_code=$?
  local line_no=${1:-unknown}
  echo "${C_RED}[ERR]${C_RESET} ${SCRIPT_NAME} 第 ${line_no} 行失败,exit=${exit_code}" >&2
  echo "${C_RED}[ERR]${C_RESET} 当前 PWD=$PWD" >&2
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR

# ---------- 帮助 ----------
usage() {
  sed -n '2,42p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

# ---------- 参数解析 ----------
DRY_RUN=0
TARGET_TAG=""
DIST_ONLY=0
DB_ONLY=0
BACKUP_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)     DRY_RUN=1; shift ;;
    --to)          TARGET_TAG="${2:-}"; [[ -z "$TARGET_TAG" ]] && { echo "${C_RED}--to 需要参数${C_RESET}" >&2; exit 2; }; shift 2 ;;
    --dist-only)   DIST_ONLY=1; shift ;;
    --db-only)     DB_ONLY=1; shift ;;
    --backup-only) BACKUP_ONLY=1; shift ;;
    --help|-h)     usage ;;
    *)             echo "${C_RED}未知参数: $1${C_RESET}" >&2; exit 2 ;;
  esac
done

# --dist-only 与 --db-only 互斥
if [[ $DIST_ONLY -eq 1 && $DB_ONLY -eq 1 ]]; then
  echo "${C_RED}--dist-only 与 --db-only 互斥${C_RESET}" >&2
  exit 2
fi

# ---------- 工具 ----------
log_step() { echo "${C_BLUE}${C_BOLD}==[$1]==${C_RESET} $2"; }
log_ok()   { echo "${C_GREEN}  OK${C_RESET} $1"; }
log_warn() { echo "${C_YELLOW}  WARN${C_RESET} $1"; }
log_dry()  { echo "${C_YELLOW}  [dry-run]${C_RESET} $1"; }
log_run()  { echo "  ${C_BOLD}\$${C_RESET} $*"; }

maybe_run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    log_dry "$*"
  else
    log_run "$*"
    "$@"
  fi
}

# ---------- 备份当前状态(事务安全) ----------
backup_current() {
  local ts
  ts="$(date +%Y%m%d-%H%M%S)"
  local bak_dir="${REMOTE_DIR}/.bak/rollback-${ts}"
  maybe_run mkdir -p "$bak_dir"

  if [[ $DIST_ONLY -eq 0 ]]; then
    if [[ -f "${REMOTE_DIR}/prisma/data.db" ]]; then
      if [[ $DRY_RUN -eq 0 ]] && command -v sqlite3 >/dev/null 2>&1; then
        maybe_run sqlite3 "${REMOTE_DIR}/prisma/data.db" ".backup '$bak_dir/data.db.bak'"
      else
        maybe_run cp -a "${REMOTE_DIR}/prisma/data.db" "$bak_dir/data.db.bak"
      fi
      log_ok "db 已备份到 $bak_dir/data.db.bak"
    else
      log_warn "data.db 不存在,跳过 db 备份"
    fi
  fi

  if [[ $DB_ONLY -eq 0 ]]; then
    if [[ -d "${REMOTE_DIR}/dist" ]]; then
      maybe_run cp -a "${REMOTE_DIR}/dist" "$bak_dir/dist.bak"
      log_ok "dist 已备份到 $bak_dir/dist.bak"
    else
      log_warn "dist/ 不存在,跳过 dist 备份"
    fi
  fi

  # 记下"本次回滚前的最新备份"路径,方便连锁回滚
  maybe_run bash -c "echo '$bak_dir' > '${REMOTE_DIR}/.bak/.last-rollback-pre'"
  echo "  ${C_GREEN}pre-rollback snapshot:${C_RESET} $bak_dir"
}

# ---------- 找到上一个 deploy 前的备份 ----------
# 优先级:.bak/.last-backup > .bak/ 下按时间戳排序的最新 stage1-* 目录
find_last_deploy_backup() {
  local bak_root="${REMOTE_DIR}/.bak"
  if [[ ! -d "$bak_root" ]]; then
    return 1
  fi
  # 优先用 .last-backup
  if [[ -f "$bak_root/.last-backup" ]]; then
    local p
    p="$(cat "$bak_root/.last-backup" 2>/dev/null || true)"
    if [[ -n "$p" && -d "$p" ]]; then
      echo "$p"
      return 0
    fi
  fi
  # 退化:找最新 stage1-* 目录
  local latest
  latest="$(ls -1d "$bak_root"/stage1-* 2>/dev/null | sort | tail -1 || true)"
  if [[ -n "$latest" && -d "$latest" ]]; then
    echo "$latest"
    return 0
  fi
  return 1
}

# ---------- 回滚 dist ----------
restore_dist_from_backup() {
  local src="$1"
  if [[ ! -d "$src/dist.bak" ]]; then
    echo "${C_RED}备份里没有 dist.bak: $src${C_RESET}" >&2
    return 4
  fi
  maybe_run rm -rf "${REMOTE_DIR}/dist"
  maybe_run cp -a "$src/dist.bak" "${REMOTE_DIR}/dist"
  log_ok "dist 已从 $src/dist.bak 恢复"
}

# ---------- 回滚 db ----------
restore_db_from_backup() {
  local src="$1"
  if [[ ! -f "$src/data.db.bak" ]]; then
    echo "${C_RED}备份里没有 data.db.bak: $src${C_RESET}" >&2
    return 4
  fi
  # 先停 pm2,避免活动连接导致 sqlite 写锁
  if [[ $DRY_RUN -eq 0 ]] && command -v pm2 >/dev/null 2>&1; then
    maybe_run pm2 stop zjzl-calendar || true
  fi
  maybe_run cp -a "$src/data.db.bak" "${REMOTE_DIR}/prisma/data.db"
  log_ok "data.db 已从 $src/data.db.bak 恢复"
}

# ---------- 从 git tag 重建 dist(本地源 → 同步到远端) ----------
restore_dist_from_git() {
  local tag="$1"
  # 优先在本地源检出;本地无 .git 时回退
  if [[ -d "${LOCAL_SRC}/.git" ]]; then
    (
      cd "$LOCAL_SRC"
      log_run "git archive $tag -- dist/ | ssh ... 写到远端 dist/"
      # git archive 不直接支持 ssh 远端,用中间 tar 流
      if [[ $DRY_RUN -eq 0 ]]; then
        git archive "$tag" -- dist/ | ssh -o StrictHostKeyChecking=accept-new \
          "${REMOTE_HOST:-root@118.178.120.99}" "rm -rf ${REMOTE_DIR}/dist && mkdir -p ${REMOTE_DIR} && tar -x -C ${REMOTE_DIR}"
      else
        log_dry "git archive $tag -- dist/ | ssh ..."
      fi
    )
  else
    echo "${C_RED}本地源没有 .git,无法用 --to $tag: $LOCAL_SRC${C_RESET}" >&2
    return 4
  fi
  log_ok "dist 已从 git $tag 重建"
}

# ---------- pm2 重启 ----------
restart_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    maybe_run pm2 restart zjzl-calendar
    maybe_run sleep 3
    maybe_run pm2 list | grep zjzl-calendar
  else
    log_warn "pm2 不在 PATH,跳过"
  fi
}

# ---------- 主流程 ----------
main() {
  echo "${C_BOLD}${C_BLUE}"
  echo "================================================================"
  echo "  中集智历 R0 阶段 1.5 回滚脚本"
  echo "  target_dir = ${REMOTE_DIR}"
  echo "  target_tag = ${TARGET_TAG:-(none, 用最近一次 deploy 备份)}"
  echo "  scope      = $([[ $DIST_ONLY -eq 1 ]] && echo 'dist-only' || [[ $DB_ONLY -eq 1 ]] && echo 'db-only' || [[ $BACKUP_ONLY -eq 1 ]] && echo 'backup-only' || echo 'dist+db')"
  echo "  dry_run    = $DRY_RUN"
  echo "  ts         = $(date -Iseconds 2>/dev/null || date)"
  echo "================================================================"
  echo "${C_RESET}"

  log_step "1" "备份当前状态(保险)"
  backup_current

  if [[ $BACKUP_ONLY -eq 1 ]]; then
    log_ok "--backup-only,到此结束"
    exit 0
  fi

  # 决定回滚源
  if [[ -n "$TARGET_TAG" ]]; then
    log_step "2" "从 git tag $TARGET_TAG 重建 dist"
    restore_dist_from_git "$TARGET_TAG"
    # db 单独处理:从最近一次 deploy 备份恢复
    if [[ $DB_ONLY -eq 0 && $DIST_ONLY -eq 0 ]]; then
      local last_bak
      last_bak="$(find_last_deploy_backup || true)"
      if [[ -z "$last_bak" ]]; then
        log_warn "没找到 .bak/ 下的 deploy 备份,db 维持现状"
      else
        log_step "3" "从 $last_bak 恢复 db"
        restore_db_from_backup "$last_bak"
      fi
    fi
  else
    local last_bak
    last_bak="$(find_last_deploy_backup || true)"
    if [[ -z "$last_bak" ]]; then
      echo "${C_RED}没找到可回滚的备份:${REMOTE_DIR}/.bak/ 下没有任何 stage1-* 目录,且 .last-backup 也不存在${C_RESET}" >&2
      echo "${C_RED}建议:确认 deploy-stage1.sh 至少成功跑过一次${C_RESET}" >&2
      exit 3
    fi
    log_step "2" "从 $last_bak 恢复(dist + db)"
    if [[ $DB_ONLY -eq 0 ]]; then
      restore_dist_from_backup "$last_bak"
    fi
    if [[ $DIST_ONLY -eq 0 ]]; then
      restore_db_from_backup "$last_bak"
    fi
  fi

  log_step "9" "pm2 restart zjzl-calendar"
  restart_pm2

  echo ""
  echo "${C_GREEN}${C_BOLD}==[done]== 回滚完成${C_RESET}"
  echo "  下一步:跑 bash scripts/probe-stage1.sh 确认退回到 baseline(3 个新端点 404、ProjectSummary 缺失)"
}

main "$@"
