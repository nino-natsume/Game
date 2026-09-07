# Game Hub

Cloudflare Workers + R2 + D1 多游戏平台。与 enisia 合并:**共用用户数据**(同一 D1 `users` 表),游戏资源/存档(enisia-game-* 桶)原样保留不覆盖。主页展示所有站点。

支持:账号密码注册/登录 · GitHub OAuth 登录 · 自定义用户名(昵称) · 移动端/平板自适应 · 游玩自动全屏 · 横屏动画提示。

## GitHub OAuth 登录

1. 在 GitHub 创建 OAuth App(Settings → Developer settings → OAuth Apps → New OAuth App)
   - Homepage URL: `https://你的域名/`
   - **Authorization callback URL: `https://你的域名/api/github/callback`**(必须与此一致)
2. 配置环境变量(`worker/wrangler.toml` 已预填 client id/secret):
   - `GITHUB_CLIENT_ID`(可公开)
   - `GITHUB_CLIENT_SECRET`(建议用 `wrangler secret put GITHUB_CLIENT_SECRET`,仓库公开时务必删除明文)
3. 部署后登录弹窗/登录页会出现「GitHub 登录」按钮,首次登录自动创建账号,昵称取 GitHub 显示名,可在个人中心修改。

## 架构速览

| 数据 | 绑定 | 说明 |
|------|------|------|
| 游戏资源 | `GAME_ASSETS` → `enisia-game-assets` | 原 enisia 资源桶,读桶根(js/ data/ img/ ...) |
| 游戏存档 | `GAME_SAVES` → `enisia-game-saves` | 东档键 `saves/{username}.json` |
| 用户库 | `DB` → `enisia-users` | 与原 enisia 共用 users/login_attempts 表 |

- 站点 `kind`: `enisia`(复用 enisia-game-* 桶)、`r2`(通用 `{SLUG}_ASSETS`/`{SLUG}_SAVES` 桶)、`external`(外链跳转)
- 首个注册用户 = 管理员(按 `MIN(created_at)` 判定)
- 密码 PBKDF2 `pbkdf2$salt$hash`,原 enisia 用户可直接登录

## 一次性准备

1. **Cloudflare API Token**(权限: Workers Scripts 编辑 + R2 + D1 + Workers 路由)
2. 本机装 wrangler: `npm i -g wrangler`,登录 `wrangler login`
3. 确保 D1 已存在:`wrangler d1 list` 里能找到 `enisia-users`
   - 若没有: `wrangler d1 create enisia-users`
4. 确保 R2 桶存在:
   - `wrangler r2 bucket create enisia-game-assets`
   - `wrangler r2 bucket create enisia-game-saves`

## 方式 A: 本机部署(推荐,快速)

```bash
cd worker

# 1. 生成配置(自动找 D1 database_id 填入 wrangler.toml 占位符)
node ../scripts/prepare-wrangler.js --auto --out wrangler.generated.toml

# 2. 设置会话密钥(首次必做,常运行只有 ID 不变就一次)
wrangler secret put SESSION_SECRET

# 3. 应用迁移(users 表已存在会跳过,新增 sites 表)
wrangler d1 migrations apply enisia-users --remote --dir migrations

# 4. 部署
wrangler deploy -c wrangler.generated.toml
```

或一键脚本(自动创建桶/D1/填 ID/设 secret/部署):

```bash
node scripts/deploy-worker.js --deploy
```

## 方式 B: GitHub Actions 自动部署

1. `wrangler.toml` 的 `database_id` 占位符不变(脚本会自动填)
2. push 前确保仓库 Secrets 已配:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `SESSION_SECRET`(可选,缺省自动生成)
3. `git push origin main` → Actions 的 `scripts/ci-deploy.sh` 自动完成全部

## 添加新站点(R2 类型)

1. `/admin` 添加站点,选择 `r2` 类型,填 slug/标题/描述/图标
2. 建桶:
   - `wrangler r2 bucket create hub-site-{slug}-assets`
   - `wrangler r2 bucket create hub-site-{slug}-saves`
3. 在 `wrangler.toml` 追加绑定并重新部署:
   ```toml
   [[r2_buckets]]
   binding = "{SLUG}_ASSETS"
   bucket_name = "hub-site-{slug}-assets"

   [[r2_buckets]]
   binding = "{SLUG}_SAVES"
   bucket_name = "hub-site-{slug}-saves"
   ```
4. 上传资源(自动注入 CloudSave.js 云存档插件):
   ```bash
   node scripts/deploy-assets.js --slug {slug} --source "游戏目录" --remote cfr2:hub-site-{slug}-assets
   ```

**enisia 站点**不用新建桶/上传,直接复用 enisia-game-* 桶,`/enisia` 即玩。

## 目录

```
worker/            Worker 源码 + 迁移 + 配置
plugin/            CloudSave.js 云存档插件
scripts/           部署脚本(deploy-worker / deploy-assets / prepare-wrangler / ci-deploy)
.github/workflows/ GitHub Actions 自动部署
```

## 路由 / API

```
GET  /                    主页(可选登录态,右上登录/注册/个人页)
GET  /login               登录/注册页
GET  /me                  个人页(改密/退出)
GET  /admin               站点管理(仅管理员)
GET  /enisia              原版兼容游戏页
GET  /enisia/assets/*     原游戏资源(GAME_ASSETS,桶根)
GET  /enisia/*            资源兜底
GET/PUT /enisia/api/save  原版存档(GAME_SAVES)
GET  /{slug}              通用站点游戏页
GET  /{slug}/assets/*     通用站点资源({SLUG}_ASSETS)
GET/PUT /{slug}/api/save  通用站点存档({SLUG}_SAVES)

认证: POST /api/register|login|logout · PUT /api/password · GET/PUT /api/me · GET /api/github/login|callback
站点: GET/POST /api/sites · PUT/DELETE /api/sites/:id
```

## 前端交互

- **移动端/平板**: 断点 900px / 640px / 480px 自动调整布局(搜索框换行、卡片栅格、弹窗内边距等)
- **全屏游玩**: 游戏页自动请求全屏(浏览器限制时在首次点击后再次请求),cloudbar 提供「全屏/退出全屏」按钮;桌面可 Esc 退出,iOS/部分浏览器按设备自带方式退出
- **横屏提示**: 触屏设备竖屏时显示手机旋转动画(粉白渐变 + 旋转手机 + 光环),横屏自动隐藏
