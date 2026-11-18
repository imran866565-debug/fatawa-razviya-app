package com.fatawa.razviya.easyurdu;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/**
 * Single-activity shell: the whole reader (HTML/CSS/JS + the 30 jilds as
 * JSON) is bundled under src/main/assets and shown in a WebView, so the app
 * works fully offline. Bookmarks/notes live in WebView localStorage
 * (DOM storage enabled below).
 *
 * The bundled pages are served by WebViewAssetLoader over a real https
 * origin (https://appassets.androidplatform.net/assets/) instead of
 * file:///android_asset/. fetch() from a file:// page is blocked in
 * current Android WebView — setAllowFileAccessFromFileURLs(true) is
 * ignored there — which is why v1.1.0 showed "content could not be
 * loaded" on the phone while the same files worked over
 * python3 -m http.server. The asset loader serves the same files from
 * the APK with no network, and fetch()/localStorage work normally.
 */
public class MainActivity extends Activity {

    private static final String START_URL =
            "https://appassets.androidplatform.net/assets/app/index.html";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view,
                    WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
