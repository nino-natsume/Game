# iOS 客户端(原生套壳)

iOS 与 Android 不同:**无法像安卓那样直接侧载安装包**。可安装的 `.ipa` 必须由 Apple 签名(需要 Apple Developer 账号 + 证书)。本目录提供:

1. **原生 WebView 套壳工程**——在 Mac 上用 Xcode 构建出真正的 iOS App(全屏横屏、隐藏状态栏,功能和 Android 版一致)
2. **CI 自动构建**——准备好签名证书后,推送代码即自动打出 iPhone 可直接安装的 `GameCenter.ipa`,并和 APK 一起发布到 GitHub Release

## 立即可用:PWA 方案(免费、无需证书)

在 **iPhone 的 Safari** 中打开 `https://game.107211.xyz`,然后:

1. 点 Safari 底部 **分享** 按钮
2. 选择 **添加到主屏幕**
3. 主屏幕上会出现一个 App 图标,点开即是**全屏沉浸式**游戏中心(已配置 `apple-mobile-web-app-capable`、隐藏状态栏、`display: standalone`,无需网页全屏 API)

> iOS Safari 不支持网页 `requestFullscreen`,但「添加到主屏幕」的 PWA 模式天然全屏,这也是 iOS 上零成本获得"像 App 一样"体验的唯一途径。

## 目录结构

```
ios/
├── project.yml                  # XcodeGen 配置(用它生成 .xcodeproj,避免手改 pbxproj)
├── ExportOptions.plist          # ad-hoc 导出配置(CI 签名导出用)
├── GameCenter/
│   ├── App.swift                # App 入口:全屏、隐藏 Home 指示器
│   ├── GameView.swift           # WKWebView 套壳(自动播放、隐藏 cloudbar、拦截新窗口)
│   ├── Info.plist               # 横屏锁定、UIRequiresFullScreen、ATS、启动屏
│   └── Assets.xcassets/         # App 图标(粉色爱心)
└── README.md
```

## 本地构建(Mac)

```bash
brew install xcodegen
cd ios
xcodegen generate          # 生成 GameCenter.xcodeproj
open GameCenter.xcodeproj  # 用 Xcode 打开,选真机/模拟器运行
```

- 真机运行需要你自己的 Apple 签名(免费 Apple ID 也可跑 7 天,付费开发者账号可持久)
- 想改入口地址:编辑 `GameCenter/App.swift` 中的 `webURL`

## CI 自动构建与同步部署

`.github/workflows/build-apk.yml` 每次推送 `android/**` 或 `ios/**` 时**同步构建两个平台**:

| 产物 | 触发条件 | 去向 |
|---|---|---|
| `app-release.apk` | 每次推送 | GitHub Release `apk-latest` |
| `GameCenter.simulator.zip` | 每次推送(无签名) | Actions artifact `ios-app`(可装进模拟器测试) |
| `GameCenter.ipa` | 配置签名 secrets 后 | GitHub Release `apk-latest` |

### 配置签名 secrets 后自动出真机 IPA

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加四个 secrets:

| Secret | 内容 |
|---|---|
| `IOS_CERT_BASE64` | 开发者证书 `.p12` 文件的 base64(`base64 -i cert.p12` 输出) |
| `IOS_CERT_PASSWORD` | 该 `.p12` 的密码 |
| `IOS_PROVISION_BASE64` | 描述文件 `.mobileprovision` 的 base64 |
| `IOS_TEAM_ID`(可选) | 开发者 Team ID(未嵌入描述文件时使用) |

> 描述文件请包含目标设备的 UDID(Ad-Hoc)或使用 Development。签名真机包后,把设备通过 iTunes/爱思助手安装 `GameCenter.ipa` 即可。付费账号还可上传 TestFlight 分发。

### 没有证书时怎么给真机装?

1. iOS 应用**不支持像安卓那样"APK 直装"**
2. 免费 Apple ID + Xcode 可临时签名,7 天过期(仅开发自用)
3. 最省事:直接用上面的 **PWA 方案**,效果与套壳 App 几乎一致

## 常见问题

- **能否在 Windows 上构建 IPA?** 不能。Xcode 仅限 macOS;本项目在 Windows 侧只维护源码与 CI,构建交给 GitHub Actions 的 macOS runner。
- **为什么 PWA 就够了?** 游戏内容是 Web 站点,iOS 套壳本质是"全屏 WebView";PWA 提供同样的全屏效果,免证书、免审核、实时更新。
- **点击游戏内链接如何打开?** 套壳内 target=_blank 链接会在当前 WebView 打开,不会跳去 Safari。