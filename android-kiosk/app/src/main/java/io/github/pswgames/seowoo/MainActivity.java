package io.github.pswgames.seowoo;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.ActivityManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://pswgames.github.io/";
    private static final String APP_HOST = "pswgames.github.io";

    private WebView webView;
    private DevicePolicyManager devicePolicyManager;
    private ComponentName adminComponent;
    private boolean kioskRequested = false;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        devicePolicyManager = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        adminComponent = new ComponentName(this, SeowooDeviceAdminReceiver.class);
        configureDedicatedDeviceIfAvailable();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(247, 251, 255));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " SeowooKiosk/1.0");
        WebView.setWebContentsDebuggingEnabled(false);

        webView.addJavascriptInterface(new NativeKioskBridge(), "SeowooNativeKiosk");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme()) && APP_HOST.equalsIgnoreCase(uri.getHost())) {
                    return false;
                }
                if (kioskRequested) {
                    return true;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                dispatchNativeStatus();
            }
        });

        setContentView(webView);
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(APP_URL);
        }
    }

    private void configureDedicatedDeviceIfAvailable() {
        if (devicePolicyManager == null || !devicePolicyManager.isDeviceOwnerApp(getPackageName())) {
            return;
        }
        try {
            devicePolicyManager.setLockTaskPackages(adminComponent, new String[]{getPackageName()});
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                devicePolicyManager.setLockTaskFeatures(adminComponent, DevicePolicyManager.LOCK_TASK_FEATURE_NONE);
            }
        } catch (SecurityException ignored) {
        }
    }

    private int lockTaskState() {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        return manager == null ? ActivityManager.LOCK_TASK_MODE_NONE : manager.getLockTaskModeState();
    }

    private String lockTaskModeName() {
        int state = lockTaskState();
        if (state == ActivityManager.LOCK_TASK_MODE_LOCKED) return "lock-task";
        if (state == ActivityManager.LOCK_TASK_MODE_PINNED) return "screen-pinning";
        return "none";
    }

    private void enterKioskMode() {
        kioskRequested = true;
        configureDedicatedDeviceIfAvailable();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
        try {
            startLockTask();
        } catch (IllegalArgumentException | IllegalStateException | SecurityException ignored) {
        }
        dispatchNativeStatus();
    }

    private void exitKioskMode() {
        kioskRequested = false;
        try {
            if (lockTaskState() != ActivityManager.LOCK_TASK_MODE_NONE) {
                stopLockTask();
            }
        } catch (IllegalArgumentException | IllegalStateException | SecurityException ignored) {
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        showSystemBars();
        dispatchNativeStatus();
    }

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                View.SYSTEM_UI_FLAG_FULLSCREEN |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    private void showSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        }
    }

    private void dispatchNativeStatus() {
        if (webView == null) return;
        final String mode = lockTaskModeName();
        final boolean deviceOwner = devicePolicyManager != null && devicePolicyManager.isDeviceOwnerApp(getPackageName());
        final String script = "window.dispatchEvent(new CustomEvent('seowoo:nativekioskstatus',{detail:{available:true,mode:'" + mode + "',deviceOwner:" + deviceOwner + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    public class NativeKioskBridge {
        @JavascriptInterface
        public void lock() {
            runOnUiThread(MainActivity.this::enterKioskMode);
        }

        @JavascriptInterface
        public void unlock() {
            runOnUiThread(MainActivity.this::exitKioskMode);
        }

        @JavascriptInterface
        public String mode() {
            return lockTaskModeName();
        }

        @JavascriptInterface
        public boolean isDeviceOwner() {
            return devicePolicyManager != null && devicePolicyManager.isDeviceOwnerApp(getPackageName());
        }
    }

    @Override
    public void onBackPressed() {
        if (kioskRequested || lockTaskState() != ActivityManager.LOCK_TASK_MODE_NONE) {
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (kioskRequested) hideSystemBars();
        dispatchNativeStatus();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && kioskRequested) hideSystemBars();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("SeowooNativeKiosk");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
