/* QURATOR 가입 혜택(체험 연장 + 오픈 기념 첫 달 할인) 설정 — 계획·근거: chainbrief ops/events/PLAN.md
   enabled:true = 공개. 로그인(site-auth) + ops/events/schema.sql + 결제 Worker 의 체험·할인 처리(PLAN.md §6)가 준비된 뒤에만 켠다.
   Google Play·App Store 앱 안에서는 절대 불러오지 않는다(가격·결제 안내 금지 정책). 미리보기: 로컬에서 ?event_preview=1 */
window.SITE_EVENT = {
  enabled: false,
  site: "qurator",
  lang: "ko",
  kind: "welcome",
  id: "qurator-welcome",
  rulesUrl: document.currentScript ? document.currentScript.src.replace(/event-config\.js.*$/, "") : "event/",
  versions: { rules: "2026-11-02", consent: "ev-2026-11-02", marketing: "2026-11-02" },
  width: "1240px",
  theme: { ink: "#16140F", paper: "#FBF9F4", accent: "#16140F", muted: "#7A7264", line: "rgba(22,20,15,.13)", wash: "#EAE4D7", radius: "2px",
           font: '"IBM Plex Sans KR",system-ui,sans-serif', display: '"Noto Serif KR","Cormorant Garamond",Georgia,serif', dw: "600" },
  banner: {
    mount: "#app",                       // 본문 아래·푸터 위 (홈 히어로가 헤더 아래로 깔려서 위쪽에 넣지 않음)
    where: "afterend",
    figure: "14일",
    figureNote: "회원 무료 체험",
    title: "가입하면 Daily Art 체험이 7일에서 14일로",
    body: "오픈 기념으로 첫 달은 21,000원(30% 할인). 체험 중에 해지하면 요금은 청구되지 않아요.",
    cta: "혜택 자세히",
    label: "가입 혜택"
  },
  welcome: {
    title: "회원 체험 14일 + 첫 달 30% 할인",
    points: ["무료 체험 7일에 가입 기념 7일 추가", "오픈 기념 첫 달 21,000원, 이후 월 30,000원", "체험 중 해지하면 요금 없음"],
    note: "가입은 무료예요. 가입하면 이 페이지에서 바로 받을 수 있어요.",
    done: function (d) { return "체험 14일이 내 계정에 등록됐어요. 구독을 시작하면 " + (d.expires_at ? d.expires_at.slice(0, 10) : "") + "까지 무료예요."; }
  }
};
(function () {
  var C = window.SITE_EVENT, d = document.documentElement, local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var app = d.classList.contains("q-play-app") || d.classList.contains("q-ios-app") || /[?&]src=twa/.test(location.search);
  try { if (sessionStorage.getItem("q_play") === "1") app = true; } catch (e) {}
  if (app) return;                                   // 앱에서는 이벤트·가격 안내를 보여 주지 않는다
  if (!C.enabled && !(local && /[?&]event_preview=1(&|$)/.test(location.search)) && !d.hasAttribute("data-event-page")) return;
  var s = document.createElement("script"); s.src = (document.currentScript && document.currentScript.src || "").replace(/event-config\.js.*$/, "event.js"); s.defer = true; document.head.appendChild(s);
})();
