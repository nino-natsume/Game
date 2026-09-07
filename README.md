# Game Hub

Cloudflare Workers + R2 + D1 多游戏平台。用户系统共用,主页展示所有已添加站点。

## 部署

1. Cloudflare 创建 API Token(Workers/R2/D1 权限)+ GitHub 仓库 Secrets: `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`
2. push 到 main,GitHub Actions 自动部署
3. 访问域名 → 注册(首个注册用户为管理员)
4. `/admin` 添加站点
5. 创建站点 R2 bucket: `wrangler r2 bucket create hub-site-{slug}-assets` / `hub-site-{slug}-saves`
6. `worker/wrangler.toml` 追加 R2 绑定(见模板注释)
7. `node scripts/deploy-assets.js --slug {slug} --source "游戏目录"`
8. 重新部署

## 目录

```
worker/            Worker 源码 + 迁移 + 配置
plugin/            CloudSave.js 云存档插件
scripts/           部署脚本
.github/workflows/ GitHub Actions
```

## API

```
POST /api/register | login | logout        认证
PUT  /api/password                         改密码
GET  /api/me                               当前用户
GET/POST /api/sites                        站点列表/创建(管理员)
PUT/DELETE /api/sites/:id                  更新/删除(管理员)
GET/PUT /api/sites/:slug/save              存档读写
GET  /site/:slug/play                      游戏页
GET  /site/:slug/assets/*                  站点资源
```