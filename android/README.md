# 次元星域游戏中心 · Android APK

把网页版游戏中心封装成 Android App,解决「无法完整全屏」问题:

- **沉浸式全屏**:隐藏状态栏 + 导航栏(IMMERSIVE_STICKY),游戏画面铺满整块屏幕
- **锁定横屏**:配合网页的「请横屏游玩」提示,进游戏零打扰
- **自动隐藏网页顶栏**:页面加载后注入脚本隐藏 `cloudbar`,不再遮挡游戏顶部
- **完整网页能力**:JS / DOM Storage 全开,登录、云存档、游戏本体均正常
- **返回键智能**:优先返回网页历史,不会误退 App

## 如何拿到 .apk

### 方式一:GitHub Actions(推荐,零本地环境)

1. 把本仓库 push 到 GitHub(`git push origin main`)
2. 打开仓库 → **Actions** → 左侧 **Build APK**(或推送时自动触发)
3. 构建成功后进入该次运行 → **Artifacts** → 下载 `game-center-apk`
4. 解压得到 `app-release.apk`,传到手机安装即可(首次安装需允许「未知来源」)

也可在 Actions 页面手动点 **Run workflow** 重新构建。

### 方式二:Android Studio(本机构建)

1. 用 Android Studio 打开 `android/` 目录(需 JDK 17 及以上)
2. 菜单 Build → Build App Bundle(s) / APK(s) → Build APK(s)
3. 产物在 `android/app/build/outputs/apk/release/app-release.apk`

## 想改打开哪个页面?

编辑 `android/app/src/main/java/com/eri/gameapp/MainActivity.java`:

```java
private static final String WEB_URL = "https://game.107211.xyz";
```

- 游戏中心主页:`https://game.107211.xyz`
- 仅游戏本体(账号数据不通):`https://enisia.107211.xyz`

改完重新构建即可。

## 签名说明

当前 release 直接用 debug 签名,方便本地/CI 直出可安装包。
正式分发(上架应用商店)时请换成自己的 keystore,并把 `signingConfigs.debug`
改为正式的 `signingConfigs.release`。