# 次元星域游戏中心
## 说明
- 适合于想在线部署游戏中心的用户
- 支持使用 OpenCode + [绘里酱](https://github.com/nino-natsume/eri.git)本地高效部署
- 无需服务器，借助本地即可完成部署
- 基于 Github + Cloudflare 部署，完全使用云端
- 完整用户登录，支持使用 Github登录
- 游戏过程默认全屏，体验更佳体验

## 站点补充
站点：https://game.107211.xyz

仅游戏本体（**账号数据不互通**）：https://enisia.107211.xyz

账号自创即可，记得自行记住账号和密码，本站不支持找回或重置密码

## Android APK（完整全屏封装）
把网页游戏中心封装成 Android App，解决「无法完整全屏、全屏按钮没反应」问题：
- 沉浸式全屏：隐藏状态栏 + 导航栏，锁定横屏，自动隐藏网页顶栏，画面铺满整块屏幕
- 获取方式：push 到 GitHub 后由 Actions 自动构建，见 `android/README.md`
- 工程目录：`android/`（纯 WebView 套壳，无第三方依赖）

## 当前不足
手机端全屏时体验最佳

电脑端全屏时体验次佳

平板端未测试，效果未知

~~软件版全屏时无响应（或无变化），可能挡住部分交互~~（已由 Android APK 套壳的沉浸式全屏修复）

综上，建议在**手机端**、**电脑端**游玩，或用 **Android APK** 获得完整全屏体验

## 部署相关
若需自部署，请确定你想部署哪方面内容：

若仅游戏相关，请 Clone [云·艾妮希雅与契约纹](https://github.com/loli-house/Game.git)仓库；

若需用户中心相关，请 Clone 本仓库，按照对应文档部署即可

## 不想一步步手动部署？
请使用 OpenCode + [绘里酱](https://github.com/nino-natsume/eri.git)本地高效部署，本地提前创建好必要 API，发出指令即可完成修改，甚至可以直接推送更改至你自己的仓库！！

有问题联系邮箱 ciallo@107211.xyz