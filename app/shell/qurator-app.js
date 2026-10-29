/* QURATOR iOS 앱 셸 — assets/app.js보다 먼저 실행된다.
   window.QURATOR_APP 을 채우면 app.js가 앱 규칙으로 동작:
   작품·음성은 사이트(remote)에서, QR·공유 링크는 사이트 주소로, 결제·가격·멤버 코드 화면은 없음 (App Review 3.1.1). */
(function () {
  var C = window.Capacitor, native = !!(C && C.isNativePlatform && C.isNativePlatform());
  var P = (C && C.Plugins) || {};
  var platform = (C && C.getPlatform && C.getPlatform()) || "web";
  window.QURATOR_APP = { remote: "https://probe2928-crypto.github.io/qurator/", ios: platform === "ios" || !native, native: native };
  document.documentElement.classList.add("q-store-app");

  function openUrl(url) {
    if (native && P.Browser) return P.Browser.open({ url: url, presentationStyle: "popover" });
    window.open(url, "_blank", "noopener");
  }
  // 바깥 링크(카카오톡 상담·미술관 원문·오리엘 재단)는 앱 안 브라우저로
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href) && a.host !== location.host) { e.preventDefault(); openUrl(a.href); }
  }, true);

  if (!native) return;
  try { P.StatusBar && P.StatusBar.setStyle({ style: "LIGHT" }); } catch (e) {}
  addEventListener("load", function () { setTimeout(function () { try { P.SplashScreen && P.SplashScreen.hide({ fadeOutDuration: 250 }); } catch (e) {} }, 200); });
  if (P.App) P.App.addListener("backButton", function () {
    if (location.hash && location.hash !== "#/" && location.hash !== "#") history.back(); else P.App.exitApp();
  });
})();
