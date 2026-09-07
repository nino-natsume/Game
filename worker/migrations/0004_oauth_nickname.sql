-- 用户表扩展说明: GitHub OAuth 关联(github_id) + 自定义显示名(nickname)
-- 注意: 这两列的添加由 Worker 运行时自动完成(initSchema 通过 pragma 检测,
-- 列不存在才 ALTER,幂等安全), 本文件仅为迁移版本占位与记录。
--
-- 对应运行时逻辑:
--   ALTER TABLE users ADD COLUMN github_id TEXT;
--   ALTER TABLE users ADD COLUMN nickname TEXT;
--   CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id ON users (github_id) WHERE github_id IS NOT NULL;
SELECT 1;