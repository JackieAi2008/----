#!/usr/bin/env bash
# =============================================================================
#  中集智历 - 阶段 1 部署验证探针 (R0 阶段 1.5 部署抢救)
# =============================================================================
#  用途:验证 R0 阶段 1 是否在生产真实生效。
#  关联计划:docs/plans/2026-06-25-r0-recovery-plan.md §2.1 + §2.4
#
#  9 项断言(任一 FAIL → exit 1):
#    A1) GET  /api/health                              → 200
#    A2) GET  /api/projects                            → 401  (老端点无回归)
#    A3) POST /api/dashboard/ai-summary                → 401  (老端点无回归)
#    A4) GET  /api/evaluations/task/<id>               → 401  (老端点无回归)
#    A5) GET  /api/projects/<id>/summaries             → 401  (新端点挂载)
#    A6) POST /api/tasks/<id>/ai-summary               → 401  (新端点挂载)
#    A7) POST /api/users/create                        → 401  (新端点挂载)
#    A8) sqlite: ProjectSummary 表存在                 → present
#    A9) sqlite: wangtian@cimc.com 有 5 行 ProjectMember → 5
#
#  区分原则(关键):
#    401 = 路由可达 + JWT 校验未过 → PASS(说明路由挂载了)
#    404 = 路由未挂载 → FAIL(说明 dist 是旧版或路由没注册)
#
#  用法:
#    # 默认:本地探针(127.0.0.1:3002 + /opt/zjzl-calendar/server/prisma/data.db)
#    bash scripts/probe-stage1.sh
#
#    # 自定义 base_url(远程探针,可通过 ssh tunnel)
#    BASE_URL=http://127.0.0.1:3002 bash scripts/probe-stage1.sh
#
#    # 自定义 db 路径
#    DB_PATH=/path/to/data.db bash scripts/probe-stage1.sh
#
#    # 只打印 JSON 报告,不染色、不 exit(供 CI 集成)
#    bash scripts/probe-stage1.sh --json-only
#
#  输出:
#    stdout:  人类可读报告(默认)/ 纯 JSON(--json-only)
#    stderr:  警告/补充信息
#    exit:    0 全 PASS / 1 任一 FAIL
#
#  退出码:
#    0   全部 PASS
#    1   任一断言 FAIL
#    2   参数错误
#    10  缺少 sqlite3 / curl 工具
# =============================================================================

set -uo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ---------- 默认配置(可被环境变量覆盖) ----------
BASE_URL="${BASE_URL:-http://127.0.0.1:3002}"
DB_PATH="${DB_PATH:-${REMOTE_DIR:-/opt/zjzl-calendar/server}/prisma/data.db}"
EXPECT_HEALTH=200
EXPECT_AUTH=401
WANGTIAN_EMAIL="${WANGTIAN_EMAIL:-wangtian@cimc.com}"
EXPECT_WANGTIAN_MEMBERS="${EXPECT_WANGTIAN_MEMBERS:-5}"

# 一个固定的假 id(格式合法的 cuid-ish 字符串),用于触发 401 而不是 404
# cuid 形如 c<timestamp><counter><fingerprint><random>;用全 0 即可让 route 命中但 DB 找不到
readonly FAKE_ID="c00000000000000000000000a"

# 颜色
if [[ -t 1 ]]; then
  readonly C_RED=$'\033[31m' C_GREEN=$'\033[32m' C_YELLOW=$'\033[33m' C_BLUE=$'\033[34m' C_BOLD=$'\033[1m' C_RESET=$'\033[0m'
else
  readonly C_RED="" C_GREEN="" C_YELLOW="" C_BLUE="" C_BOLD="" C_RESET=""
fi

JSON_ONLY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json-only) JSON_ONLY=1; shift ;;
    --help|-h)
      sed -n '2,46p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "${C_RED}未知参数: $1${C_RESET}" >&2; exit 2 ;;
  esac
done

# ---------- 前置依赖检查 ----------
need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "${C_RED}缺少工具: $1${C_RESET}" >&2; exit 10; }
}
need_cmd curl

# ---------- 结果收集器 ----------
# 用关联数组记录每项断言
declare -A RESULT_STATUS=()  # PASS / FAIL
declare -A RESULT_EXPECT=()
declare -A RESULT_ACTUAL=()
declare -A RESULT_DETAIL=()
declare -a RESULT_ORDER=()    # 保持插入顺序

record() {
  local id="$1" expect="$2" actual="$3" detail="${4:-}"
  RESULT_ORDER+=("$id")
  RESULT_EXPECT[$id]="$expect"
  RESULT_ACTUAL[$id]="$actual"
  RESULT_DETAIL[$id]="$detail"
  if [[ "$actual" == "$expect" ]]; then
    RESULT_STATUS[$id]="PASS"
  else
    RESULT_STATUS[$id]="FAIL"
  fi
}

# ---------- HTTP 探针 ----------
# 用法:probe_http <id> <method> <path> <expect_code>
probe_http() {
  local id="$1" method="$2" path="$3" expect="$4"
  local url="${BASE_URL}${path}"
  local code
  # -s 静默 -o /dev/null 丢 body -w '%{http_code}' 只输出码
  # 用 --max-time 防 curl 挂死
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -X "$method" "$url" 2>/dev/null || echo "000")"
  if [[ "$code" == "$expect" ]]; then
    record "$id" "$expect" "$code" "$method $path"
  else
    # 区分 401 vs 404 给更明确的提示
    local hint=""
    if [[ "$expect" == "401" && "$code" == "404" ]]; then
      hint=" ← 路由未挂载(dist 旧版或 router 未注册)"
    elif [[ "$code" == "000" ]]; then
      hint=" ← 连接失败(进程没起来或端口错)"
    fi
    record "$id" "$expect" "$code" "$method $path${hint}"
  fi
}

# ---------- DB 探针 ----------
# 用法:probe_db_table <id> <table_name>
probe_db_table() {
  local id="$1" table="$2"
  if [[ ! -f "$DB_PATH" ]]; then
    record "$id" "present" "missing" "db file not found: $DB_PATH"
    return
  fi
  if ! command -v sqlite3 >/dev/null 2>&1; then
    record "$id" "present" "no-sqlite3" "sqlite3 命令不可用,跳过表检查"
    return
  fi
  local row
  row="$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" 2>/dev/null || echo "")"
  if [[ "$row" == "$table" ]]; then
    record "$id" "present" "present" "sqlite_master has $table"
  else
    record "$id" "present" "missing" "sqlite_master 缺 $table"
  fi
}

# 用法:probe_db_count <id> <sql> <expected_count>
probe_db_count() {
  local id="$1" sql="$2" expected="$3"
  if [[ ! -f "$DB_PATH" ]]; then
    record "$id" "$expected" "no-db" "db file not found: $DB_PATH"
    return
  fi
  if ! command -v sqlite3 >/dev/null 2>&1; then
    record "$id" "$expected" "no-sqlite3" "sqlite3 命令不可用,跳过 count 检查"
    return
  fi
  local cnt
  cnt="$(sqlite3 "$DB_PATH" "$sql" 2>/dev/null || echo "ERR")"
  record "$id" "$expected" "$cnt" "$sql"
}

# ---------- dist mtime 探针(部署新鲜度,辅助) ----------
probe_dist_mtime() {
  local dist_dir="${REMOTE_DIR:-/opt/zjzl-calendar/server}/dist/app.js"
  if [[ ! -f "$dist_dir" ]]; then
    echo "  dist/app.js: 不存在" >&2
    return
  fi
  # GNU stat 与 BSD stat 兼容
  local mtime_epoch
  mtime_epoch="$(stat -c %Y "$dist_dir" 2>/dev/null || stat -f %m "$dist_dir" 2>/dev/null || echo "0")"
  local now
  now="$(date +%s)"
  local age_sec=$(( now - mtime_epoch ))
  local age_human
  if [[ $age_sec -lt 3600 ]]; then
    age_human="$(( age_sec / 60 )) 分钟前"
  elif [[ $age_sec -lt 86400 ]]; then
    age_human="$(( age_sec / 3600 )) 小时前"
  else
    age_human="$(( age_sec / 86400 )) 天前"
  fi
  echo "  dist/app.js mtime: $(date -d "@$mtime_epoch" '+%F %T' 2>/dev/null || date -r "$mtime_epoch" '+%F %T' 2>/dev/null)  ($age_human)" >&2
  echo "$mtime_epoch $age_sec $age_human" >&2
}

# ---------- 执行所有断言 ----------
run_all_checks() {
  # 4 个老端点(回归保护)
  probe_http "A1" "GET"  "/api/health"                          "$EXPECT_HEALTH"
  probe_http "A2" "GET"  "/api/projects"                        "$EXPECT_AUTH"
  probe_http "A3" "POST" "/api/dashboard/ai-summary"            "$EXPECT_AUTH"
  probe_http "A4" "GET"  "/api/evaluations/task/${FAKE_ID}"     "$EXPECT_AUTH"

  # 3 个新端点(阶段 1 落地标志)
  probe_http "A5" "GET"  "/api/projects/${FAKE_ID}/summaries"   "$EXPECT_AUTH"
  probe_http "A6" "POST" "/api/tasks/${FAKE_ID}/ai-summary"     "$EXPECT_AUTH"
  probe_http "A7" "POST" "/api/users/create"                    "$EXPECT_AUTH"

  # 1 张表(ProjectSummary)
  probe_db_table "A8" "ProjectSummary"

  # 1 行 SQL(王田项目成员 = 5)
  local wangtian_count_sql
  wangtian_count_sql="SELECT COUNT(*) FROM ProjectMember WHERE userId = (SELECT id FROM User WHERE email='${WANGTIAN_EMAIL}');"
  probe_db_count "A9" "$wangtian_count_sql" "$EXPECT_WANGTIAN_MEMBERS"
}

# ---------- 输出 ----------
print_human_report() {
  echo "${C_BOLD}${C_BLUE}"
  echo "================================================================"
  echo "  中集智历 R0 阶段 1 部署验证报告"
  echo "  base_url = $BASE_URL"
  echo "  db_path  = $DB_PATH"
  echo "  ts       = $(date -Iseconds 2>/dev/null || date)"
  echo "================================================================"
  echo "${C_RESET}"

  local pass=0 fail=0
  for id in "${RESULT_ORDER[@]}"; do
    local status="${RESULT_STATUS[$id]}"
    local expect="${RESULT_EXPECT[$id]}"
    local actual="${RESULT_ACTUAL[$id]}"
    local detail="${RESULT_DETAIL[$id]}"
    if [[ "$status" == "PASS" ]]; then
      echo "${C_GREEN}  [$id] PASS${C_RESET}  expect=$expect actual=$actual  $detail"
      pass=$((pass+1))
    else
      echo "${C_RED}  [$id] FAIL${C_RESET}  expect=$expect actual=$actual  $detail"
      fail=$((fail+1))
    fi
  done

  echo ""
  echo "  总计: PASS=$pass  FAIL=$fail"
  echo "  dist/app.js:"
  probe_dist_mtime
  echo ""
  if [[ $fail -eq 0 ]]; then
    echo "${C_GREEN}${C_BOLD}  ✓ 阶段 1 在生产已生效,可进入阶段 2 / 3 / 4 / 5 部署${C_RESET}"
  else
    echo "${C_RED}${C_BOLD}  ✗ 阶段 1 仍有 ${fail} 项未通过,需要回滚或重做部署${C_RESET}"
  fi
}

print_json_report() {
  # 纯 JSON,便于 CI 集成 / 自动化判定
  # 用 jq(若可用)否则手工拼
  local pass=0 fail=0
  for id in "${RESULT_ORDER[@]}"; do
    [[ "${RESULT_STATUS[$id]}" == "PASS" ]] && pass=$((pass+1)) || fail=$((fail+1))
  done

  # 优先用 jq
  if command -v jq >/dev/null 2>&1; then
    {
      echo '{'
      echo '  "summary": {"pass": '"$pass"', "fail": '"$fail"', "ts": "'"$(date -Iseconds 2>/dev/null || date)"'"},'
      echo '  "base_url": "'"$BASE_URL"'",'
      echo '  "db_path":  "'"$DB_PATH"'",'
      echo '  "checks": ['
      local first=1
      for id in "${RESULT_ORDER[@]}"; do
        [[ $first -eq 1 ]] && first=0 || echo ','
        printf '    {"id":"%s","status":"%s","expect":"%s","actual":"%s","detail":"%s"}' \
          "$id" "${RESULT_STATUS[$id]}" "${RESULT_EXPECT[$id]}" "${RESULT_ACTUAL[$id]}" "${RESULT_DETAIL[$id]}"
      done
      echo
      echo '  ]'
      echo '}'
    } | jq -c .
  else
    # 退化:手工 JSON(可能含 detail 里的特殊字符,极简方案)
    {
      echo "{"
      echo "  \"summary\": {\"pass\": $pass, \"fail\": $fail, \"ts\": \"$(date -Iseconds 2>/dev/null || date)\"},"
      echo "  \"base_url\": \"$BASE_URL\","
      echo "  \"db_path\": \"$DB_PATH\","
      echo "  \"checks\": ["
      local first=1
      for id in "${RESULT_ORDER[@]}"; do
        [[ $first -eq 1 ]] && first=0 || echo ","
        printf '    {"id":"%s","status":"%s","expect":"%s","actual":"%s","detail":"%s"}' \
          "$id" "${RESULT_STATUS[$id]}" "${RESULT_EXPECT[$id]}" "${RESULT_ACTUAL[$id]}" "${RESULT_DETAIL[$id]}"
      done
      echo
      echo "  ]"
      echo "}"
    }
  fi
}

# ---------- main ----------
main() {
  run_all_checks
  if [[ $JSON_ONLY -eq 1 ]]; then
    print_json_report
  else
    print_human_report
  fi

  # 退出码
  for id in "${RESULT_ORDER[@]}"; do
    [[ "${RESULT_STATUS[$id]}" == "FAIL" ]] && exit 1
  done
  exit 0
}

main "$@"
