import SwiftUI
import WebKit

/// iOS 全屏 WebView 套壳,功能与 Android 版(MainActivity)保持一致:
/// - 全屏横屏、隐藏状态栏/Home 指示器
/// - 允许网页自动播放音频/视频
/// - 隐藏站点顶部 cloudbar(iOS Safari 不支持 requestFullscreen,套壳无需网页全屏 API)
struct GameView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        if #available(iOS 14.0, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
        }

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // 与 Android 版一致:隐藏顶部 cloudbar,保持沉浸式
            webView.evaluateJavaScript(
                "try{var c=document.getElementById('cloudbar');if(c){c.style.display='none';c.style.visibility='hidden'}}catch(e){}",
                completionHandler: nil
            )
        }

        // 拦截 target=_blank / window.open,在当前 WebView 内打开
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
            }
            return nil
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            print("page load failed: \(error.localizedDescription)")
        }
    }
}