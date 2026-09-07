#!/usr/bin/env bash
set -euo pipefail

WORKER_DIR="${WORKER_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/worker}"
REPO_ROOT="$(cd "$WORKER_DIR/.." && pwd)"
cd "$WORKER_DIR"

echo "== [1/5] R2 bucket (enisia-game-*, 复用原资源/存档,不覆盖) =="
wrangler r2 bucket create enisia-game-assets >/dev/null 2>&1 && echo "created enisia-game-assets" || echo "enisia-game-assets 已存在"
wrangler r2 bucket create enisia-game-saves >/dev/null 2>&1 && echo "created enisia-game-saves" || echo "enisia-game-saves 已存在"

echo "== [2/5] D1 (enisia-users, 与 enisia 共用同一用户数据) =="
EXISTING_ID="$(wrangler d1 list --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const a=JSON.parse(s);const r=a.find(x=>x.name==='enisia-users');console.log(r?(r.database_id||r.uuid||r.id||''):'');}catch(e){console.log('')}});" || true)"
if [ -n "$EXISTING_ID" ]; then
  echo "D1 已存在: $EXISTING_ID"
else
  echo "创建 D1…"
  wrangler d1 create enisia-users 2>&1 || true
fi

echo "== [3/5] 生成配置 =="
if [ -n "$EXISTING_ID" ]; then
  node "$REPO_ROOT/scripts/prepare-wrangler.js" --d1-id "$EXISTING_ID" --out wrangler.generated.toml
else
  node "$REPO_ROOT/scripts/prepare-wrangler.js" --auto --out wrangler.generated.toml
fi

echo "== [4/5] D1 迁移 (users/login_attempts 已存在则跳过,新增 sites 表) =="
wrangler d1 migrations apply enisia-users --remote --dir migrations 2>&1 || echo "迁移已应用或由 Worker 兜底"

echo "== [4.5/5] SESSION_SECRET =="
put_secret() {
  local val="$1"
  printf '%s' "$val" | wrangler secret put SESSION_SECRET -- 2>&1 || \
  printf '%s' "$val" | wrangler secret put SESSION_SECRET 2>&1 || true
}
if [ -n "${SESSION_SECRET:-}" ] && [ "${SESSION_SECRET}" != "__generate__" ]; then
  put_secret "$SESSION_SECRET"
else
  GEN="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  put_secret "$GEN"
fi

echo "== [5/5] 部署 =="
wrangler deploy -c wrangler.generated.toml 2>&1
echo "== 完成 =="
echo "后续: 1) 主页可直接玩 enisia(game 数据在原 enisia-game-* 桶,不受影响)"
echo "      2) /admin 可添加更多站点(R2/外部链接)"