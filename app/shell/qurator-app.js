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

  // QR 스캔: 작품 옆 QR을 앱 카메라로 바로 읽어 해설 화면으로
  var REMOTE = window.QURATOR_APP.remote;
  function scan() {
    var S = P.CapacitorBarcodeScanner; if (!S) return;
    var ko = (document.documentElement.lang || "ko").indexOf("en") !== 0;
    S.scanBarcode({ hint: 0, scanInstructions: ko ? "작품 옆 QR 코드를 화면에 비춰 주세요" : "Point at the QR code beside the artwork", cameraDirection: 1 }).then(function (r) {
      var v = (r && (r.ScanResult || r.scanResult)) || ""; if (!v) return;
      if (v.indexOf(REMOTE) === 0 && v.indexOf("#") > 0) { location.hash = v.slice(v.indexOf("#")); return; }
      if (/^https?:\/\//i.test(v)) { openUrl(v); return; }
      alertNote(ko ? "QURATOR 작품 QR이 아니에요." : "That isn't a QURATOR artwork code.");
    }).catch(function () {});
  }
  function alertNote(msg) { var t = document.getElementById("toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 2400); }
  document.addEventListener("DOMContentLoaded", function () {
    if (!P.CapacitorBarcodeScanner) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "q-scan"; b.setAttribute("aria-label", "QR 스캔 · Scan QR");
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>';
    b.onclick = scan;
    var tr = document.querySelector(".top-right");   // 머리줄 언어 버튼 옆 (아래쪽 음성 플레이어·슬라이드와 겹치지 않게)
    if (tr) tr.insertBefore(b, tr.firstChild); else document.body.appendChild(b);
  });
  try { P.StatusBar && P.StatusBar.setStyle({ style: "LIGHT" }); } catch (e) {}
  addEventListener("load", function () { setTimeout(function () { try { P.SplashScreen && P.SplashScreen.hide({ fadeOutDuration: 250 }); } catch (e) {} }, 200); });
  if (P.App) P.App.addListener("backButton", function () {
    if (location.hash && location.hash !== "#/" && location.hash !== "#") history.back(); else P.App.exitApp();
  });
})();
