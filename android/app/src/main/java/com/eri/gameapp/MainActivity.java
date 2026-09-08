package com.eri.gameapp;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * 次元星域游戏中心 - Android 套壳
 *
 * 核心目标:真·完整全屏。
 * 1. 沉浸式系统 UI:隐藏状态栏 + 导航栏(IMMERSIVE_STICKY)
 * 2. 锁定横屏(配合竖屏“请横屏游玩”提示,进游戏零打扰)
 * 3. WebView 开启 JS / DOM Storage,游戏与云存档正常运行
 * 4. 页面加载完后注入脚本,隐藏网页自带的云顶栏(cloudbar),
 *    避免游戏画面被 38px 顶栏遮挡,实现“完整全屏”
 */
public class MainActivity extends Activity {

    /**
     * 想打开哪个页面就改这里:
     *  - 游戏中心主页: https://game.107211.xyz
     *  - 仅游戏本体(账号数据不通): https://enisia.107211.xyz
     */
    private static final String WEB_URL = "https://game.107211.xyz";

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        enterImmersiveFullscreen();

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setAllowFileAccess(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                // 套壳 App 里无需网页顶栏,注入脚本隐藏;并再请求一次页面级全屏作为兜底
                view.evaluateJavascript(
                        "try{(function(){var b=document.getElementById('cloudbar');" +
                        "if(b)b.style.display='none';var r=document.documentElement;" +
                        "if(r&&r.requestFullscreen){var p=r.requestFullscreen();" +
                        "if(p&&p.catch)p.catch(function(){});}})();}catch(e){}", null);
            }
        });
        web.setWebChromeClient(new WebChromeClient());

        setContentView(web);
        web.loadUrl(WEB_URL);
    }

    /** 沉浸式全屏:状态栏、导航栏全部隐藏,游戏画面铺满整块屏幕 */
    private void enterImmersiveFullscreen() {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 19) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(0xFF000000);
            getWindow().setNavigationBarColor(0xFF000000);
        }
    }

    /** 返回键:优先回退网页历史,避免误退 App */
    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
        }
        super.onDestroy();
    }
}