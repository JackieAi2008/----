#!/usr/bin/env bash
# =============================================================================
#  R0 阶段 1.5 沙箱环境引导 (docker pull 兜底)
#  给 zjzl-deploy 在国内网络拉镜像超时用
#
#  用法: bash sandbox-bootstrap.sh
#  退出: 0 成功跑通;非 0 失败(打印最后尝试的镜像 + 错误行号)
# =============================================================================

set -euo pipefail
SCRIPT_NAME="$(basename "$0")"
on_error() { echo "[ERR] $SCRIPT_NAME line ${1:-?} exit=$?" >&2; exit 1; }
trap 'on_error $LINENO' ERR

echo "==[1/4]== 检测本机工具"
command -v docker >/dev/null 2>&1 || { echo "缺 docker,先装 docker desktop"; exit 1; }
docker info >/dev/null 2>&1 || { echo "docker daemon 未启动"; exit 1; }
echo "  docker OK: $(docker --version)"

# 镜像候选(按优先级排序)
declare -a MIRRORS=(
  "registry.cn-hangzhou.aliyuncs.com/library/ubuntu:24.04"
  "docker.m.daocloud.io/library/ubuntu:24.04"
  "registry.cn-hangzhou.aliyuncs.com/library/debian:bookworm-slim"
  "docker.m.daocloud.io/library/debian:bookworm-slim"
  "library/ubuntu:24.04"
  "library/debian:bookworm-slim"
)
PULL_TIMEOUT=120
RETRIES=2

echo "==[2/4]== 拉镜像(顺序尝试 + timeout + retry)"
pulled=""
for img in "${MIRRORS[@]}"; do
  echo "  尝试: $img"
  attempt=0
  while [[ $attempt -lt $RETRIES ]]; do
    attempt=$((attempt+1))
    echo "    attempt $attempt/$RETRIES (timeout=${PULL_TIMEOUT}s)"
    if timeout "$PULL_TIMEOUT" docker pull "$img" 2>&1 | tail -5; then
      echo "    [OK] $img 拉成功"
      # tag 成统一名
      if [[ "$img" == *ubuntu:24.04 ]]; then
        docker tag "$img" sandbox-ubuntu:24.04 2>/dev/null || true
        pulled="sandbox-ubuntu:24.04"
      else
        docker tag "$img" sandbox-debian:bookworm-slim 2>/dev/null || true
        pulled="sandbox-debian:bookworm-slim"
      fi
      break 2
    fi
    echo "    失败,重试..."
    sleep 3
  done
done

if [[ -z "$pulled" ]]; then
  echo "[ERR] 6 个候选镜像全部拉失败" >&2
  echo "      诊断建议:" >&2
  echo "        docker info | grep -i 'registry\|mirror'" >&2
  echo "        改 /etc/docker/daemon.json 加 mirror:" >&2
  echo '          {"registry-mirrors": ["https://docker.m.daocloud.io"]}' >&2
  echo "        sudo systemctl restart docker" >&2
  echo "        或者直接用生产真机跑 (zjzl.space / 118.178.120.99) 跳 sandbox" >&2
  exit 1
fi

echo "==[3/4]== 启动容器(后台)"
WORKSPACE="${WORKSPACE:-D:\\OneDrive\\双创空间\\VS Code\\协同日历}"
REPO_DIR_HOST="${REPO_DIR_HOST:-$(pwd)}"
CONTAINER_NAME="zjzl-sandbox-stage1"
# 清理旧容器
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

docker run -d --name "$CONTAINER_NAME" \
  -v "${REPO_DIR_HOST}:/workspace" \
  -w /workspace/server \
  -p 3002:3002 \
  "$pulled" \
  sleep infinity >/dev/null

echo "  容器已起: $CONTAINER_NAME (image=$pulled)"
echo "  端口: 3002:3002"
echo "  挂载: $REPO_DIR_HOST -> /workspace"

echo "==[4/4]== 容器内安装运行时"
docker exec "$CONTAINER_NAME" bash -c '
  set -e
  apt-get update -qq
  apt-get install -y -qq curl sqlite3 git ca-certificates gnupg >/dev/null
  # node 20.x from NodeSource
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
  node -v
  npm -v
  sqlite3 --version
'

echo ""
echo "================================================================"
echo "  沙箱引导完成"
echo "  进容器跑演练:"
echo "    docker exec -it $CONTAINER_NAME bash"
echo "    cd /workspace/server"
echo "    bash scripts/deploy-stage1.sh --dry-run        # 预演"
echo "    bash scripts/deploy-stage1.sh --step migrate   # 单步演练"
echo "    bash scripts/probe-stage1.sh                   # 验证 9 项"
echo "================================================================"
