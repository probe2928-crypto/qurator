/* 회원 로그인 설정 (QURATOR) — 2026-11-02
   · 2026-11-03 키 입력 → 로그인 켜짐(이메일). url·anonKey 를 비우면 다시 아무것도 표시하지 않는다(화면 변화 0).
   · 켜는 법: Supabase → Project Settings → API 의 Project URL 과 anon(또는 publishable) 키를 아래 두 칸에 넣고 저장.
     서비스 롤(service_role / secret) 키는 절대 넣지 않는다.
   · 공용 로그인 모듈: https://probe2928-crypto.github.io/chainbrief/auth/auth.js (chainbrief 저장소 public/auth/auth.js)
   · 설명서: chainbrief 저장소 ops/auth/SETUP_GUIDE.md
   · QURATOR 앱(?src=twa, Google Play)에서도 같은 계정으로 로그인. 구독 결제·가격과는 연결하지 않음(결제 변경 금지). */
(function () {
  var c = window.SITE_AUTH = window.SITE_AUTH || {
    "url": "https://szsvihpghadpxhavdhqt.supabase.co",
    "anonKey": "sb_publishable_mRoGWPlaCUl-Z8vdR3NMDg_bXDinag1",
    "site": "qurator",
    "providers": [
      "email"
    ],
    // 구글·카카오·애플: Supabase 공급자 설정이 끝나면 아래 목록에서 providers 로 옮기면 버튼이 켜진다 (2026-11-03 이메일만 우선 공개)
    "providersPending": [
      "google",
      "kakao",
      "apple"
    ],
    "naver": "hidden",
    "brand": "QURATOR",
    "links": {
      "terms": "#/policy/terms",
      "privacy": "#/policy/privacy"
    },
    "versions": {
      "terms": "2026-11-02",
      "privacy": "2026-11-02",
      "marketing": "2026-11-02"
    },
    "channels": [
      "email",
      "kakao",
      "sms"
    ],
    "night": true,
    "theme": {
      "ink": "#16140F",
      "paper": "#FBF9F4",
      "accent": "#16140F",
      "muted": "#6B6457",
      "line": "#E2DCCF",
      "radius": "4px"
    },
    "iapNotice": true
  };
  if (!c.url || !c.anonKey) return;
  var s = document.createElement("script");
  s.src = "https://probe2928-crypto.github.io/chainbrief/auth/auth.js";
  s.defer = true;
  document.head.appendChild(s);
})();
