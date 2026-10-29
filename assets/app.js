/* QURATOR — QR docent & Daily Art. Static SPA (GitHub Pages). */
(() => {
'use strict';

/* ---------------- utilities ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const enc = encodeURIComponent;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stripHtml = s => { if (!s) return ''; const d = document.createElement('div'); d.innerHTML = s; return (d.textContent || '').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim(); };
/* Store apps: the iOS app (Capacitor, app/) sets window.QURATOR_APP = { remote, ios } before this file loads.
   Data/audio come from the live site so new works appear without an app update; QR/share links always point to the website. */
const APPX = window.QURATOR_APP || null;
const ASSET = p => (APPX && !/^[a-z][a-z0-9+.-]*:/i.test(p)) ? APPX.remote + p : p;
const BASE = () => APPX ? APPX.remote : location.href.split('#')[0];
const KAKAO = 'https://open.kakao.com/o/gQLZj9Ti';
/* Payments: set live:true + clientKey (토스페이먼츠 라이브 클라이언트 키) + apiBase (worker URL) when the merchant contract is ready. ?paytest=1 runs the Toss test flow. */
const BANK = { name: '우리은행', number: '56731673402101', holder: '박*준' };
const PAY = { live: false, clientKey: '', apiBase: '', testClientKey: 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq', price: 30000 };
/* Google Play app (TWA) = consumption-only: no prices, checkout, bank details or links to them (Play payments policy).
   Launched with ?src=twa; kept in sessionStorage so the same site opened in a normal browser tab is unaffected. */
const PLAY = (() => {
  if (APPX) return true;   // iOS app: same consumption-only rules
  try {
    if (new URLSearchParams(location.search).get('src') === 'twa' || document.referrer.startsWith('android-app://')) sessionStorage.setItem('q_play', '1');
    return sessionStorage.getItem('q_play') === '1';
  } catch { return false; }
})();
if (PLAY) document.documentElement.classList.add('q-play-app');
/* App Store app = free reader: no purchase, no member code/link unlock (App Review 3.1.1), no mention of buying elsewhere.
   Shows the free daily pick, QR docent pages, features and explore. Members keep using the website. */
const IOS = !!(APPX && APPX.ios);
if (IOS) document.documentElement.classList.add('q-ios-app');
/* Giving: a share of QURATOR's revenue goes to Oriel Foundation (오리엘 재단 · 明窗基金會, the founders' foundation in formation; renamed on 2026-10-27, site at /oriel/).
   Facts only: the foundation is preparing its nonprofit registration; the first gift is sent after it registers and is logged in
   data/giving.json + the foundation's public ledger. `share` stays '' until a percentage is decided. The foundation site has no
   donation links while it is unregistered, so linking to it from the Play app is fine; revisit if it ever takes donations. */
const GIVE = { url: 'https://probe2928-crypto.github.io/oriel/', urlKo: 'https://probe2928-crypto.github.io/oriel/ko/', share: '' };
const BRICK = '<svg class="brick" viewBox="0 0 40 56" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M20 6.5a15.5 21.5 0 1 0 .001 0zM20 8.1a9.6 19.9 0 1 1-.001 0z"/><ellipse cx="20" cy="28" rx="9.6" ry="19.9" fill="#B8862D"/><path d="M20 8v40M10.4 28h19.2" stroke="rgba(255,255,255,.78)" stroke-width="1.8" fill="none"/></svg>'; // Oriel Foundation mark: the O with a lit window
const seoulDate = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
async function getJSON(url, opt) {
  try { const r = await fetch(ASSET(url), opt); if (!r.ok) throw new Error(r.status + ' ' + url); return await r.json(); }
  catch (e) { if (APPX && ASSET(url) !== url) { const r = await fetch(url); if (r.ok) return r.json(); } throw e; }   // app offline → copy bundled in the app
}

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400); }

/* compact URL payloads: deflate + base64url */
const b64u = {
  from(bytes) { let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); },
  to(str) { str = str.replace(/-/g,'+').replace(/_/g,'/'); while (str.length % 4) str += '='; const s = atob(str); return Uint8Array.from(s, c => c.charCodeAt(0)); }
};
async function pack(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if ('CompressionStream' in self) {
    const cs = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = new Uint8Array(await new Response(cs).arrayBuffer());
    return 'z' + b64u.from(buf);
  }
  return 'j' + b64u.from(raw);
}
async function unpack(s) {
  const kind = s[0], bytes = b64u.to(s.slice(1));
  if (kind === 'z') {
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(ds).text());
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/* ---------------- state & i18n ---------------- */
const S = {
  lang: store.get('q_lang', (navigator.language || 'ko').startsWith('ko') ? 'ko' : 'en'),
  works: [], byId: {}, daily: {},
  member: store.get('q_member', false), memberExp: store.get('q_exp', ''), memberEnded: '',
  studio: store.get('q_studio', { name: '', sub: '', items: [] })
};
const T = {
  nav_today: ['오늘의 작품', 'Daily Art'], nav_explore: ['작품 탐색', 'Explore'], nav_studio: ['QR 스튜디오', 'QR Studio'], nav_pricing: ['요금', 'Pricing'],
  hero_eyebrow: ['QR 도슨트 · Daily Art', 'QR Docent · Daily Art'],
  hero_h: ['작품 앞에서,<br>한 번의 <em>scan.</em>', 'One scan.<br>The <em>whole story.</em>'],
  hero_lead: ['관람객이 QR을 찍으면 작품 해설이 텍스트·음성·다국어로 열립니다. 앱 설치 없이. 그리고 매일 아침, 세 점의 명작과 영어 해설이 당신에게 도착합니다.', 'Visitors scan a QR code and the artwork opens up in text, voice and multiple languages, with no app to install. And every morning, three masterpieces with English commentary arrive for you.'],
  cta_today: ['오늘의 작품 보기', "See today's art"], cta_gallery: ['갤러리 도입 문의', 'For galleries'],
  scan_label: ['Scan · 음성 해설', 'Scan for audio guide'],
  p1_tag: ['For you · 개인 구독', 'For you · Membership'], p1_h: ['Daily Art — 매일 세 점의 명작', 'Daily Art — three masterpieces a day'],
  p1_p: ['미술사 기반으로 엄선한 작품 3점을 매일 아침 영어 해설과 한국어 번역, 음성으로 받아 보세요. 미술 교양과 영어를 함께.', 'Three works chosen with an art historian\'s eye, every morning, with English commentary, Korean translation and audio. Art and English, together.'],
  p1_l: [['매일 3점 · 영문 해설 + 한국어 번역', '감상 포인트 3가지와 오늘의 영어 표현', '원어민 음성으로 듣는 해설', '지난 작품 아카이브 무제한'], ['3 works daily · English commentary + Korean', 'Three things to look for, plus words to know', 'Listen to every commentary', 'Unlimited archive']],
  p2_tag: ['For galleries · B2B', 'For galleries · B2B'], p2_h: ['QR 도슨트 — 앱 없는 오디오 가이드', 'QR Docent — the audio guide with no app'],
  p2_p: ['작품 옆 라벨에 QR 하나. 관람객의 휴대폰이 곧 도슨트가 됩니다. 해설 원고 작성부터 라벨 인쇄까지 한 번에.', 'One QR on each wall label, and every visitor\'s phone becomes a docent. From writing the texts to printing the labels.'],
  p2_l: [['작품별 해설 페이지 · 텍스트/음성', '한국어 · 영어 기본, 다국어 확장', 'QR 캡션(명제표) 인쇄 파일 자동 생성', '전시 입구용 전체 안내 QR'], ['A page per artwork, text and audio', 'Korean and English, more on request', 'Print-ready QR caption cards', 'One entrance QR for the whole show']],
  per_month: ['/ 월', '/ month'], per_show: ['/ 전시', '/ exhibition'], from: ['부터', 'from'],
  how_eyebrow: ['How it works', 'How it works'], how_h: ['라벨 하나로 시작하는 전시 해설', 'Exhibition interpretation, starting with a label'],
  how_p: ['설치할 장비도, 내려받을 앱도 없습니다. 작품 옆 캡션(명제표)에 QR을 함께 인쇄해 붙이면 준비가 끝납니다.', 'No hardware, no app downloads. Print a QR onto the caption card beside each work, and you are ready.'],
  s1h: ['작품을 고르거나 등록', 'Choose or add works'], s1p: ['큐레이션 명작, 해외 미술관 공개 소장품, 혹은 갤러리의 작품을 직접 등록합니다.', 'Pick from curated masterpieces, open museum collections, or add your own works.'],
  s2h: ['QR 캡션 인쇄', 'Print QR captions'], s2p: ['작품명·작가·연도와 QR이 들어간 작품 캡션(명제표)이 A4로 바로 출력됩니다. 잘라서 작품 옆에 붙이면 됩니다.', 'Caption cards with title, artist, date and QR print straight to A4. Cut them out and place them beside each work.'],
  s3h: ['스캔하고, 듣고, 읽는다', 'Scan, listen, read'], s3p: ['관람객은 카메라로 찍기만 하면 됩니다. 문장 단위로 따라가는 음성 해설이 재생됩니다.', 'Visitors just point their camera. Audio plays sentence by sentence, highlighted as it reads.'],
  today_eyebrow: ["Today's three", "Today's three"], today_h: ['오늘 아침 도착한 세 점', 'This morning\'s three works'], today_p: ['첫 번째 작품은 누구나 무료로 볼 수 있습니다.', 'The first work is free for everyone.'],
  see_all: ['전체 보기', 'See all'],
  pr_eyebrow: ['Pricing', 'Pricing'], pr_h: ['개인에게는 구독, 갤러리에는 전시 단위로', 'Membership for people, per-show for galleries'],
  pl1: ['Daily Art', 'Daily Art'], pl2: ['전시 Basic', 'Show Basic'], pl3: ['전시 Premium', 'Show Premium'], pl4: ['갤러리 구독', 'Gallery plan'],
  pl1l: [['매일 3점 영문 해설', '한국어 번역 · 음성', '아카이브 무제한', '앱처럼 홈 화면 설치'], ['3 commentaries daily', 'Korean translation · audio', 'Unlimited archive', 'Install as an app']],
  pl2l: [['작품 30점까지', '한국어 · 영어 해설', 'QR 라벨 인쇄 파일', '전시 기간 호스팅'], ['Up to 30 works', 'Korean & English texts', 'Print-ready QR labels', 'Hosted for the show']],
  pl3l: [['작품 100점까지', '전문 해설 원고 작성·감수', '한·영·일·중 4개 언어', '전시 전용 디자인'], ['Up to 100 works', 'Texts written and reviewed by us', 'KO · EN · JA · ZH', 'Custom exhibition design']],
  pl4l: [['상설 작품 무제한 등록', '해설 수정 무제한', '한국어 · 영어', '소규모 갤러리·공방용'], ['Unlimited permanent works', 'Unlimited text edits', 'Korean & English', 'For small galleries & studios']],
  subscribe: ['구독 시작하기', 'Start membership'], inquire: ['문의하기', 'Get in touch'],
  f_eyebrow: ['Why us', 'Why us'],
  f_quote: ['전시를 직접 수십 차례 열어 보며 알게 됐습니다. 관람객이 작품 앞에 머무는 시간은 해설 한 줄에 달려 있다는 것을.', 'After opening dozens of exhibitions ourselves, we learned one thing: how long a visitor stays in front of a work depends on a single line of interpretation.'],
  f_body: ['미술사를 전공하고, 20회가 넘는 전시를 직접 열고 기획에 참여해 온 운영진이 모든 해설 원고를 감수합니다. 기술보다 해설의 질로 승부합니다.', 'Every text is reviewed by a team trained in art history that has opened and helped organize more than twenty exhibitions. We compete on the quality of interpretation, not gadgets.'],
  fa1: ['전시 개최·기획 참여', 'Exhibitions opened & organized'], fa2: ['해설 언어', 'Languages'], fa3: ['열람 가능 작품', 'Works searchable'],
  cta_h: ['다음 전시, 관람객의 휴대폰을 도슨트로.', 'Make every visitor\'s phone your docent.'],
  cta_btn: ['카카오톡으로 상담하기', 'Chat with us on KakaoTalk'],
  foot_note: ['작품 이미지와 데이터: 시카고 미술관, 메트로폴리탄 미술관, 클리블랜드 미술관 오픈 액세스(CC0), 위키미디어 커먼즈.', 'Images & data: Art Institute of Chicago, The Met, Cleveland Museum of Art Open Access (CC0), Wikimedia Commons.'],
  // today
  daily_h: ['오늘의 작품', 'Daily Art'], daily_p: ['매일 아침, 세 점의 명작과 영어 해설. 미술과 영어를 함께 읽는 하루 10분.', 'Every morning, three masterpieces with English commentary. Ten minutes of art and English a day.'],
  ko_trans: ['한국어 해설 보기', 'Korean commentary'], words_h: ['Words to know · 오늘의 표현', 'Words to know'],
  open_v: ['작품 페이지 · 음성 해설', 'Artwork page · audio'], locked_h: ['멤버 전용 해설입니다', 'Members only'],
  locked_p: ['나머지 두 점의 영문 해설, 한국어 번역, 음성과 오늘의 표현은 Daily Art 멤버에게 열립니다.', 'The full commentary, translation, audio and words for the other two works are for Daily Art members.'],
  member_on: ['Daily Art 멤버로 보고 있습니다.', 'You are viewing as a Daily Art member.'], archive: ['아카이브', 'Archive'],
  install: ['홈 화면에 설치', 'Install app'],
  // modal
  m_h: ['Daily Art 멤버십', 'Daily Art Membership'], m_p: ['매일 세 점의 명작을 영어 해설로. 언제든 해지할 수 있습니다.', 'Three masterpieces a day in English. Cancel anytime.'],
  m_l: [['매일 3점 영문 해설 + 한국어 번역', '음성 해설 · 감상 포인트 · 오늘의 표현', '지난 작품 아카이브 무제한', '앱처럼 홈 화면에 설치'], ['3 English commentaries daily + Korean', 'Audio · what to look for · words to know', 'Unlimited archive', 'Install on your home screen']],
  nav_giving: ['나눔', 'Giving'],
  gv_eyebrow: ['QURATOR × Oriel Foundation', 'QURATOR × Oriel Foundation'],
  gv_h: ['작품을 읽는 시간이,<br>아이의 <em>첫 교실</em>이 됩니다.', 'Time spent with art<br>becomes a child\'s <em>first classroom.</em>'],
  gv_lead: ['QURATOR는 수익의 일부를 오리엘 재단(Oriel Foundation · 明窗基金會)에 기부합니다. 도움이 필요한 가정과 사랑스런 아이들을 위해, 배움에서 시작해 아이가 계속 학교에 올 수 있게 하는 생활 지원, 그리고 교실과 학교를 짓는 일까지 하려고 준비 중인 재단입니다.', 'QURATOR gives a share of its revenue to Oriel Foundation, a foundation in the making for families who need a hand and the children we love. It starts with learning, adds the everyday support that keeps a child in class, and grows toward classrooms and schools.'],
  gv_short: ['QURATOR 수익의 일부는 오리엘 재단에 기부되어 도움이 필요한 가정과 사랑스런 아이들에게 쓰입니다.', 'A share of QURATOR\'s revenue goes to Oriel Foundation, for families who need a hand and the children we love.'],
  gv_band_h: ['명작 한 점의 시간,<br>아이 한 명의 배움으로.', 'One masterpiece at a time,<br>one child\'s learning at a time.'],
  gv_status: ['재단은 지금 비영리 등록을 준비하고 있습니다. QURATOR의 첫 기부는 등록이 끝난 뒤 보내고, 날짜와 금액을 공개합니다.', 'The foundation is preparing its nonprofit registration. QURATOR sends its first gift once that is done, and publishes the date and amount.'],
  gv_more: ['나눔 이야기', 'How we give'], gv_visit: ['오리엘 재단 보기', 'Visit Oriel Foundation'],
  gv_how: ['어떻게 이어지나요', 'How it works'],
  gv_how_l: [[['구독과 갤러리 프로젝트', 'Daily Art 구독료와 갤러리 QR 도슨트 프로젝트 수익이 모두 대상입니다.'], ['오리엘 재단으로', 'QURATOR가 자기 수익에서 정해진 몫을 재단에 직접 보냅니다. 여러분이 따로 내는 돈은 없습니다.'], ['공개 기록', '보낸 날짜와 금액은 이 페이지와 재단의 공개 장부에 함께 남깁니다. 재단은 모든 기부를 공개 블록체인에서 확인할 수 있게 할 계획입니다.']],
             [['Subscriptions and gallery projects', 'Both Daily Art subscriptions and gallery QR docent projects count.'], ['To Oriel Foundation', 'QURATOR sends a set share of its own revenue to the foundation. You pay nothing extra.'], ['On the record', 'Each gift\'s date and amount is logged here and in the foundation\'s public ledger, which it plans to keep on a public blockchain.']]],
  gv_why: ['왜 미술과 가정, 그리고 아이들인가', 'Why art, and why families and children'],
  gv_why_p: ['QURATOR는 작품 한 점을 깊이 읽는 시간을 만듭니다. 그렇게 생긴 수익의 일부가 도움이 필요한 가정의 하루와 사랑스런 아이들의 배움으로 이어지도록, QURATOR 운영진이 오리엘 재단을 함께 준비하고 있습니다. 배움에는 빛을, 기부에는 창을.', 'QURATOR makes time to read one work of art in depth. So that part of what that earns reaches the everyday lives of families who need a hand and the learning of the children we love, the people behind QURATOR are building Oriel Foundation. Light for learning. Glass for giving.'],
  gv_plan: ['재단의 계획', 'The foundation\'s plan'],
  gv_phases: [[['2026년 10~12월', '설립 준비', '정관과 자문단을 꾸리고, 첫 현지 파트너를 찾고, 비영리 등록 서류를 준비해요.'], ['2027년 1월', '공식 출범', '활동 일지와 SNS 채널을 열고, 창립 서포터 모집을 시작해요.'], ['2027년', '첫 프로그램', '한 마을, 한 파트너와 함께 학습 지원과 생활 지원을 시작하고, 첫 온체인 보고서를 내요.'], ['2028년부터', '짓기', '이미 함께 일한 마을과 교실·도서관·식수 시설·안전한 등굣길을 지어요.']],
              [['Oct–Dec 2026', 'Founding', 'Charter, advisers, a first local partner, and the paperwork to register as a nonprofit.'], ['Jan 2027', 'Public launch', 'The journal and social channels go live and the founding circle opens.'], ['2027', 'First programs', 'One community, one partner: learning support and everyday basics, with the first on-chain reports.'], ['2028 onward', 'Build', 'Classrooms, libraries, water and safe routes to school, built with the communities we already know.']]],
  gv_now: ['지금 단계', 'Now'],
  gv_log: ['기부 기록', 'Giving record'], gv_log_empty: ['아직 기부 기록이 없습니다. 재단 등록 후 첫 기부가 이곳에 기록됩니다.', 'No gifts yet. The first one is recorded here once the foundation is registered.'],
  gv_log_cols: [['날짜', '금액', '내용'], ['Date', 'Amount', 'Note']],
  gv_fine: ['구독료와 갤러리 프로젝트 비용은 기부금이 아니며, 기부금 영수증이나 세액공제 대상이 아닙니다. 기부는 QURATOR가 자기 수익에서 직접 합니다.', 'Subscription and project fees are not donations and are not tax-deductible. QURATOR gives from its own revenue.'],
  play_unlock: ['멤버 코드로 열기', 'Unlock with member code'], play_h: ['멤버 전용 해설', 'Members-only commentary'],
  play_p: ['Daily Art 멤버십은 QURATOR 웹사이트에서 신청할 수 있습니다. 받은 멤버 링크나 코드를 아래에 붙여 넣으면 이용 기간 동안 이 기기에서 열람됩니다.', 'Daily Art membership is available on the QURATOR website. Paste the member link or code you received below and this device stays unlocked for your membership period.'],
  m_cta: ['구독 신청하기', 'Subscribe now'], m_code: ['멤버 코드 또는 링크', 'Member code or link'], m_apply: ['확인', 'Apply'],
  m_ok: ['멤버십이 활성화되었습니다', 'Membership activated'], m_bad: ['코드를 다시 확인해 주세요', 'Please check the code'],
  sp_p_ios: ['작품 해설, 앱 사용, 갤러리 도입에 관한 문의는 카카오톡으로 편하게 남겨 주세요.', 'Questions about the commentary, the app or bringing QURATOR to your gallery: message us on KakaoTalk.'],
  hero_lead_ios: ['작품 옆 QR을 찍으면 해설이 텍스트·음성·다국어로 열립니다. 그리고 매일 한 점, 미술사가 고른 명작을 영어 해설과 함께 소개합니다.', 'Scan the QR code beside an artwork and its story opens in text, voice and several languages. And every day, one masterpiece chosen by an art historian, with English commentary.'],
  daily_p_ios: ['매일 한 점, 명작과 영어 해설. 미술과 영어를 함께 읽는 하루 5분.', 'One masterpiece a day with English commentary. Five minutes of art and English.'],
  ios_archive_p: ['지난 3주 동안 매일 소개한 첫 번째 작품을 다시 볼 수 있습니다.', 'Revisit the first work featured each day over the past three weeks.'],
  m_until: ['{d}까지', 'until {d}'], m_renew: ['연장하기', 'Renew'], m_renew_play: ['연장은 QURATOR 웹사이트에서 할 수 있습니다.', 'You can renew on the QURATOR website.'],
  m_ended: ['멤버십이 {d}에 끝났습니다.', 'Your membership ended on {d}.'],
  ml_ok_h: ['멤버십이 열렸습니다', 'Membership unlocked'], ml_ok_p: ['{d}까지 이 기기에서 모든 해설을 볼 수 있습니다. 다른 기기에서는 같은 링크를 한 번 더 누르면 됩니다.', 'Everything is open on this device until {d}. On another device, just open the same link.'],
  ml_exp_h: ['기간이 끝난 링크입니다', 'This link has expired'], ml_exp_p: ['{d}에 끝난 멤버십입니다. 연장하면 새 링크를 보내 드립니다.', 'This membership ended on {d}. Renew and we will send you a new link.'],
  ml_bad_h: ['링크를 확인할 수 없습니다', 'This link could not be verified'], ml_bad_p: ['링크가 잘렸거나 잘못되었을 수 있습니다. 카카오톡으로 받은 링크 전체를 다시 눌러 주세요.', 'The link may be cut off or mistyped. Open the full link from your KakaoTalk message again.'],
  // explore
  ex_h: ['작품 탐색', 'Explore'], ex_p: ['큐레이션 명작 24점과 클리블랜드·시카고 미술관 공개 소장품 약 18만 점을 검색하세요. +를 누르면 QR 스튜디오에 담깁니다.', 'Search 24 curated masterpieces and about 180,000 open-access works from Cleveland and Chicago. Tap + to add to QR Studio.'],
  ex_ph: ['작가, 작품명, 주제 — 예: Monet, landscape, 청자', 'Artist, title, subject — e.g. Monet, landscape'],
  all: ['전체', 'All'], curated: ['큐레이션', 'Curated'], kr: ['한국 미술', 'Korean art'], world: ['세계 명작', 'World'],
  searching: ['미술관 소장품 검색 중', 'Searching museum collections'], noresult: ['결과가 없습니다. 영어로도 검색해 보세요.', 'No results. Try another term in English.'],
  results: ['검색 결과', 'Results'], added: ['QR 스튜디오에 추가했습니다', 'Added to QR Studio'], removed: ['스튜디오에서 뺐습니다', 'Removed from studio'],
  // studio
  st_h: ['QR 스튜디오', 'QR Studio'], st_p: ['전시를 구성하고 작품별 QR 캡션(명제표)을 인쇄하세요. 입구용 전시 안내 QR도 함께 만들어집니다.', 'Build an exhibition and print a QR caption card for each work, plus one entrance QR for the whole show.'],
  st_name: ['전시 제목', 'Exhibition title'], st_sub: ['부제 · 기간 · 장소', 'Subtitle · dates · venue'],
  st_custom: ['직접 작품 등록', 'Add your own work'], st_t: ['작품명', 'Title'], st_a: ['작가', 'Artist'], st_y: ['연도', 'Year'], st_m: ['재료·크기', 'Medium & size'],
  st_img: ['이미지 URL (선택)', 'Image URL (optional)'], st_ko: ['한국어 해설', 'Korean text'], st_en: ['영어 해설', 'English text'], st_add: ['라벨에 추가', 'Add label'],
  st_hint: ['갤러리 작품 해설은 QR 안에 담기므로 서버가 필요 없습니다. 해설이 길수록 QR이 촘촘해지니 1,000자 이내를 권장합니다.', 'Your text is stored inside the QR itself, so no server is needed. Keep it under ~1,000 characters for an easy-to-scan code.'],
  st_print: ['캡션 인쇄 (A4)', 'Print captions (A4)'], st_copy: ['전시 링크 복사', 'Copy exhibition link'], st_clear: ['모두 비우기', 'Clear all'],
  st_empty: ['아직 담긴 작품이 없습니다. 작품 탐색에서 + 를 누르거나 왼쪽에서 직접 등록하세요.', 'No works yet. Tap + in Explore or add your own on the left.'],
  st_xqr: ['전시 입구용 QR — 관람객이 전체 작품 목록을 봅니다.', 'Entrance QR — visitors see the full list of works.'],
  st_count: ['점', 'works'], copied: ['링크를 복사했습니다', 'Link copied'], go_explore: ['작품 탐색으로', 'Go to Explore'],
  // viewer
  v_card: ['카드 이미지', 'Share card'], v_copy: ['링크 복사', 'Copy link'], v_copied: ['링크를 복사했어요', 'Link copied'], v_card_ok: ['카드 이미지를 저장했어요', 'Card image saved'], v_card_wait: ['카드를 만드는 중…', 'Making your card…'],
  v_listen: ['해설 듣기', 'Listen'], v_look: ['이것을 찾아보세요', 'Look closer'], v_words: ['Words to know', 'Words to know'], v_info: ['작품 정보', 'Details'],
  v_more: ['함께 보면 좋은 작품', 'You may also like'], v_artist: ['작가', 'Artist'], v_date: ['연도', 'Date'], v_medium: ['재료', 'Medium'],
  v_coll: ['소장', 'Collection'], v_src: ['출처', 'Source'], v_notfound: ['작품을 찾을 수 없습니다.', 'Artwork not found.'],
  v_orig: ['원문(영어) 해설입니다. ', 'Original English text. '], v_gt: ['구글 번역으로 보기', 'Open in Google Translate'],
  v_auto: ['브라우저 내장 번역으로 옮긴 해설입니다. ', 'Machine-translated in your browser. '],
  v_basic: ['이 작품은 아직 큐레이터 해설이 준비되지 않아 소장처 기록을 바탕으로 안내합니다.', 'A curator\'s text is not ready yet; this guide is based on the museum record.'],
  v_loading: ['작품을 불러오는 중', 'Loading artwork'], v_unknown: ['작가 미상', 'Unknown artist'],
  x_works: ['작품', 'works'], x_scan: ['각 작품 옆 QR을 찍거나 아래 목록에서 선택하세요.', 'Scan the QR beside each work, or choose from the list.'],
  back: ['← 돌아가기', '← Back'],
  nav_support: ['고객센터', 'Support'], nav_features: ['특집', 'Features'],
  ft_h: ['특집', 'Features'], ft_p: ['지금 미술계에서 가장 뜨거운 작품들을 미술사의 눈으로 읽습니다. 가격과 기록 너머의 의미까지.', 'The works everyone is talking about, read through art history: beyond the price tags and records.'],
  ft_read: ['특집 읽기', 'Read the feature'], ft_works: ['점', 'works'], ft_src: ['출처', 'Sources'],
  ft_cr: ['저작권 보호 작품 — 이미지는 소장처·경매사 페이지에서 볼 수 있습니다.', 'In copyright: see the image on the auction house or museum page.'],
  ft_toc: ['목차', 'Contents'], ft_asof: ['기준', 'As of'], ft_more: ['다른 특집', 'More features'],
  sp_h: ['고객센터', 'Support'], sp_p: ['구독, 결제, 해지, 갤러리 도입까지 카카오톡 오픈채팅으로 문의를 받습니다.', 'Subscriptions, billing, cancellations and gallery projects: talk to us on KakaoTalk.'],
  sp_kakao: ['카카오톡으로 문의하기', 'Message us on KakaoTalk'], sp_kakao_s: ['오픈채팅 · QURATOR 고객센터', 'Open chat · QURATOR Support'],
  sp_faq: ['자주 묻는 질문', 'Frequently asked'], sp_docs: ['약관 및 정책', 'Policies'],
  terms: ['이용약관', 'Terms of Service'], privacy: ['개인정보처리방침', 'Privacy Policy'], refund: ['환불·해지 규정', 'Refund & Cancellation'],
  biz: ['상호 QURATOR(큐레이터) · 사업자등록번호·통신판매업 신고번호·대표자 정보는 등록 완료 후 게시됩니다.', 'QURATOR. Business registration details will be published once registration is complete.'],
  co_h: ['Daily Art 구독 신청', 'Subscribe to Daily Art'], co_name: ['이름', 'Name'], co_email: ['이메일 (주문 확인·멤버 안내)', 'Email (order & membership notices)'],
  co_method: ['결제 방법', 'Payment method'], co_card: ['카드 자동결제', 'Card, billed monthly'], co_card_s: ['토스페이먼츠 · 매월 자동 결제', 'Toss Payments · renews monthly'],
  co_soon: ['곧 오픈', 'Coming soon'], co_bank: ['계좌이체', 'Bank transfer'], co_bank_s: ['우리은행 계좌로 입금 · 확인 후 멤버 링크 발송', 'Transfer to our Woori Bank account · member link after confirmation'],
  co_agree: ['이용약관, 개인정보 수집·이용, 정기결제 및 환불·해지 규정을 확인했으며 동의합니다.', 'I agree to the Terms, Privacy Policy, recurring billing and refund policy.'],
  co_pay: ['결제하기', 'Pay'], co_apply: ['신청하기', 'Place order'], co_need: ['이름, 이메일, 동의 항목을 확인해 주세요', 'Please fill in your name, email and consent'],
  co_order: ['신청이 접수되었습니다', 'Order received'], co_order_p: ['아래 계좌로 입금하신 뒤, 카카오톡 오픈채팅에 주문번호를 보내 주세요. 입금이 확인되면 카카오톡으로 멤버 링크를 보내 드립니다.', 'Transfer to the account below, then send your order number on KakaoTalk. We will send your member link once the payment is confirmed.'],
  co_copy: ['주문 정보 복사', 'Copy order details'], co_acct: ['입금 계좌', 'Bank account'], co_holder: ['예금주', 'Holder'], co_amount: ['입금 금액', 'Amount'], co_payer: ['입금자명', 'Sender name'], co_payer_v: ['이름 + 주문번호 뒤 4자리', 'Your name + last 4 of order no.'], co_cpacct: ['계좌번호 복사', 'Copy account'], co_open: ['카카오톡 열기', 'Open KakaoTalk'], co_have: ['멤버 링크를 받으셨나요? 여기에 붙여 넣어도 열립니다.', 'Got your member link? You can also paste it here.'],
  co_kk: ['주문 정보를 복사했어요. 채팅창에 붙여 넣어 보내 주세요', 'Order details copied. Paste them into the chat and send'],
  co_resume: ['입금 대기 중인 신청이 있습니다', 'You have an order awaiting payment'], co_resume_b: ['입금 안내 다시 보기', 'View payment details'], co_new: ['새로 신청', 'New order'],
  co_renew_h: ['Daily Art 멤버십 연장', 'Renew Daily Art'], co_renew_p: ['연장 신청은 지금 멤버십과 이어서 확인됩니다. 입금이 확인되면 기간을 늘린 새 링크를 카카오톡으로 보내 드립니다.', 'Renewals are matched to your current membership. Once payment is confirmed we send a new link with the extended date on KakaoTalk.'],
  co_month: ['월', 'month'], co_vat: ['부가세 포함 · 언제든 해지 가능', 'VAT included · cancel anytime'], co_test: ['테스트 결제 모드 — 실제 청구되지 않습니다', 'Test mode — no real charge'],
  pay_ok: ['구독이 시작되었습니다', 'Your membership is active'], pay_ok_p: ['아래 멤버 코드를 꼭 저장해 두세요. 다른 기기에서도 이 코드로 열람할 수 있습니다.', 'Keep this member code. Use it to unlock Daily Art on any device.'],
  pay_test_ok: ['카드 등록이 확인되었습니다 (테스트)', 'Card registered (test)'], pay_test_p: ['결제 서버가 연결되면 이 단계에서 첫 달 결제와 멤버 코드 발급이 자동으로 진행됩니다.', 'Once the billing server is connected, the first charge and member code happen automatically here.'],
  pay_fail: ['결제가 완료되지 않았습니다', 'Payment was not completed'], pay_fail_p: ['다시 시도하시거나 카카오톡으로 문의해 주세요.', 'Please try again or contact us on KakaoTalk.'],
  pay_wait: ['결제를 확인하는 중', 'Confirming your payment']
};
const L = () => S.lang === 'ko' ? 0 : 1;
const t = k => (T[k] ? T[k][L()] : k);
const pick = o => (o && typeof o === 'object' && !Array.isArray(o)) ? (o[S.lang] || o.en || o.ko || '') : (o || '');

/* ---------------- museum sources ---------------- */
const AIC_F = 'id,title,artist_title,artist_display,date_display,medium_display,image_id,description,short_description,place_of_origin,credit_line,dimensions';
const Src = {
  aic: {
    label: 'Chicago', museum: 'Art Institute of Chicago',
    img: (id, w = 843) => `https://www.artic.edu/iiif/2/${id}/full/${w},/0/default.jpg`,
    norm(x) {
      return { uid: 'aic-' + x.id, source: 'aic', title: x.title, artist: x.artist_title || (x.artist_display || '').split('\n')[0], date: x.date_display,
        medium: x.medium_display, dims: x.dimensions, place: x.place_of_origin, credit: x.credit_line,
        image: x.image_id ? Src.aic.img(x.image_id) : '', imageLg: x.image_id ? Src.aic.img(x.image_id, 1686) : '',
        text: stripHtml(x.description) || stripHtml(x.short_description) || '', link: `https://www.artic.edu/artworks/${x.id}`, museum: Src.aic.museum };
    },
    async search(q) {
      const base = `https://api.artic.edu/api/v1/artworks/search?q=${enc(q)}&limit=30&fields=${AIC_F}`;
      let r;
      try { r = await getJSON(base + '&query[term][is_public_domain]=true'); } catch { r = await getJSON(base); }
      return (r.data || []).filter(x => x.image_id).map(Src.aic.norm);
    },
    async get(id) { const r = await getJSON(`https://api.artic.edu/api/v1/artworks/${id}?fields=${AIC_F}`); return Src.aic.norm(r.data); }
  },
  met: {
    label: 'The Met', museum: 'The Metropolitan Museum of Art',
    norm(x) {
      return { uid: 'met-' + x.objectID, source: 'met', title: x.title, artist: x.artistDisplayName, date: x.objectDate, medium: x.medium, dims: x.dimensions,
        place: [x.culture, x.country].filter(Boolean).join(', '), credit: x.creditLine, dept: x.department,
        image: x.primaryImageSmall, imageLg: x.primaryImage || x.primaryImageSmall, text: '', link: x.objectURL, museum: Src.met.museum, basic: true };
    },
    async search(q) {
      const r = await getJSON(`https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${enc(q)}`);
      const ids = (r.objectIDs || []).slice(0, 18);
      const got = await Promise.allSettled(ids.map(id => Src.met.get(id)));
      return got.filter(g => g.status === 'fulfilled' && g.value.image).map(g => g.value);
    },
    async get(id) { return Src.met.norm(await getJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)); }
  },
  cma: {
    label: 'Cleveland', museum: 'The Cleveland Museum of Art',
    norm(x) {
      const c = (x.creators && x.creators[0] && x.creators[0].description) || '';
      return { uid: 'cma-' + x.id, source: 'cma', title: x.title, artist: c.replace(/\s*\(.*$/, ''), artistFull: c, date: x.creation_date, medium: x.technique,
        dims: x.measurements, place: (x.culture || []).join(', '), credit: x.creditline,
        image: x.images && x.images.web ? x.images.web.url : '', imageLg: x.images && (x.images.print || x.images.web) ? (x.images.print || x.images.web).url : '',
        text: stripHtml(x.wall_description) || stripHtml(x.description) || stripHtml(x.fun_fact) || '', link: x.url, museum: Src.cma.museum };
    },
    async search(q) {
      const r = await getJSON(`https://openaccess-api.clevelandart.org/api/artworks/?q=${enc(q)}&has_image=1&cc0&limit=24`);
      return (r.data || []).map(Src.cma.norm).filter(x => x.image);
    },
    async get(id) { const r = await getJSON(`https://openaccess-api.clevelandart.org/api/artworks/${id}`); return Src.cma.norm(r.data); }
  }
};

/* The Met retired its public search endpoint on 2026-10-01; single objects (met-ID) still load. */
const SEARCHABLE = ['cma', 'aic'];

/* compose a guide from metadata when a museum has no narrative text */
function composeText(w, lang) {
  const a = w.artist, d = w.date, m = w.medium, p = w.place;
  if (lang === 'ko') {
    let s = `${a ? a + '의 ' : ''}〈${w.title}〉${d ? '(' + d + ')' : ''}입니다.`;
    if (m) s += ` 재료와 기법은 ${m}입니다.`;
    if (p) s += ` 제작 지역 또는 문화권은 ${p}입니다.`;
    s += ` 현재 ${w.museum}${w.dept ? ' ' + w.dept + ' 부문' : ''}에 소장되어 있습니다.`;
    if (w.dims) s += ` 크기는 ${w.dims.split(/\r?\n/)[0]}입니다.`;
    return s;
  }
  let s = `This is ${w.title}${a ? ' by ' + a : ''}${d ? ', dated ' + d : ''}.`;
  if (m) s += ` It is made of ${m.charAt(0).toLowerCase() + m.slice(1)}.`;
  if (p) s += ` It comes from ${p}.`;
  s += ` It belongs to ${w.museum}${w.dept ? ', department of ' + w.dept : ''}.`;
  if (w.credit) s += ` ${w.credit}.`;
  return s.replace(/\.\./g, '.');
}

async function getApiWork(uid) {
  const [src, id] = [uid.slice(0, 3), uid.slice(4)];
  const key = 'q_w_' + uid, cached = store.get(key, null);
  if (cached) return cached;
  const w = await Src[src].get(id);
  store.set(key, w);
  return w;
}

/* on-device translation (Chrome Translator API) */
async function translate(text, target) {
  try {
    if (!('Translator' in self) || !text) return null;
    const opt = { sourceLanguage: 'en', targetLanguage: target };
    if ((await Translator.availability(opt)) === 'unavailable') return null;
    const tr = await Translator.create(opt);
    const parts = text.split(/\n+/);
    const out = [];
    for (const p of parts) out.push(p.trim() ? await tr.translate(p) : '');
    return out.join('\n');
  } catch { return null; }
}

/* ---------------- curated images via Wikipedia ---------------- */
const imgCache = store.get('q_img', {});
const imgPending = {};
async function wikiLookup(lang, params, size = 1200) {
  const u = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=${size}&${params}`;
  const r = await getJSON(u);
  const pages = r.query && r.query.pages ? Object.values(r.query.pages) : [];
  const pg = pages.find(p => p.thumbnail);
  return pg ? pg.thumbnail.source : null;
}
function curatedImage(w, size = 1200) {
  if (w.img) return Promise.resolve(w.img);
  // a pinned Commons file needs no API lookup (faster, and immune to API rate limits)
  if (w.commons) return Promise.resolve(`https://commons.wikimedia.org/wiki/Special:FilePath/${enc(w.commons)}?width=${size}`);
  const key = w.id + '@' + size;
  if (imgCache[key]) return Promise.resolve(imgCache[key]);
  if (imgPending[key]) return imgPending[key];
  return imgPending[key] = (async () => {
    const order = w.region === 'kr' ? ['ko', 'en'] : ['en', 'ko'];
    let url = null;
    for (const lg of order) {
      for (const title of (w.wiki && w.wiki[lg]) || []) {
        try { url = await wikiLookup(lg, 'titles=' + enc(title), size); } catch {}
        if (url) break;
      }
      if (url) break;
    }
    if (!url && w.wiki && w.wiki.q) { try { url = await wikiLookup('ko', 'generator=search&gsrlimit=1&gsrsearch=' + enc(w.wiki.q), size); } catch {} }
    if (url) { imgCache[key] = url; store.set('q_img', imgCache); } // cache successes only, so a failed lookup retries next visit
    delete imgPending[key];
    return url;
  })();
}
function artBox(w, cls = '', size) {
  const title = w.title && typeof w.title === 'object' ? pick(w.title) : w.title;
  const direct = w.image ? ` data-src="${esc(w.image)}"` : '';
  return `<div class="art ${cls}" ${w.id ? `data-wid="${esc(w.id)}"` : ''}${size ? ` data-size="${size}"` : ''}${direct}><span class="ph">${esc(title || '')}</span></div>`;
}
function hydrate(root = document) {
  $$('.art[data-src]:not(.h), .art[data-wid]:not(.h)', root).forEach(el => {
    el.classList.add('h');
    const put = src => {
      if (!src) return;
      const img = new Image();
      img.alt = ''; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
      img.onload = () => { el.appendChild(img); const vs = el.closest('.v-stage'); if (vs) vs.style.setProperty('--bg', `url("${img.src}")`); requestAnimationFrame(() => img.classList.add('in')); const ph = $('.ph', el); if (ph) setTimeout(() => ph.remove(), 900); };
      img.src = src;
    };
    if (el.dataset.src) put(el.dataset.src);
    else { const w = S.byId[el.dataset.wid]; if (w) curatedImage(w, +el.dataset.size || 1200).then(put); }
  });
}
function reveal(root = document) {
  const els = $$('.rv:not(.in)', root);
  if (!('IntersectionObserver' in self)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
}

/* ---------------- daily selection ---------------- */
function dailyIds(date) {
  if (S.daily[date]) return S.daily[date];
  const kr = S.works.filter(w => w.region === 'kr'), wo = S.works.filter(w => w.region !== 'kr');
  const n = Math.floor(Date.parse(date + 'T00:00:00Z') / 864e5);
  return [kr[n % kr.length].id, wo[(2 * n) % wo.length].id, wo[(2 * n + 1) % wo.length].id];
}
function fmtDate(date, lang) {
  const d = new Date(date + 'T12:00:00+09:00');
  return {
    d: d.getDate(),
    m: d.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-GB', { month: 'long', year: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul' })
  };
}

/* ---------------- speech ---------------- */
const Speech = {
  ok: 'speechSynthesis' in self,
  idx: 0, sents: [], lang: 'ko', playing: false, rate: store.get('q_rate', 1), onUpdate: null,
  voice(lang) {
    const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(lang));
    const fav = lang === 'ko' ? /sunhi|injoon|hyunsu|yuna|sora|jian|seoyeon/i : /aria|jenny|ava|andrew|emma|brian|sonia|ryan|libby|samantha|daniel|serena|allison/i;
    const score = v => {
      const n = v.name + ' ' + (v.voiceURI || '');
      let k = 0;
      if (/natural|neural|online/i.test(n)) k += 100;
      if (/premium/i.test(n)) k += 90; else if (/enhanced/i.test(n)) k += 70;
      if (/google/i.test(n)) k += 55;
      if (fav.test(n)) k += 25;
      if (lang === 'en' && /en-(us|gb)/i.test(v.lang)) k += 5;
      if (/compact|espeak|heami|zira|david|mark|novelty|bells|whisper|bad news|good news|organ|bahh|boing|bubbles|cellos|jester|superstar|trinoids|wobble|zarvox|albert|fred|junior|kathy|ralph/i.test(n)) k -= 200;
      return k;
    };
    return vs.sort((a, b) => score(b) - score(a))[0] || null;
  },
  urls: null, audio: null,
  load(sents, lang, urls) { this.stop(); this.sents = sents; this.lang = lang; this.urls = urls || null; this.idx = 0; this.emit(); },
  playFile(i) {
    this.idx = Math.max(0, Math.min(i, this.urls.length - 1));
    if (this.audio) { this.audio.onended = null; this.audio.pause(); }
    this.playing = true;
    const a = this.audio = new Audio(this.urls[this.idx]);
    a.playbackRate = this.rate; a.preload = 'auto';
    a.onended = () => { if (!this.playing) return; if (this.idx + 1 >= this.urls.length) { this.playing = false; this.idx = 0; this.emit(true); return; } this.playFile(this.idx + 1); };
    a.onerror = () => { this.playing = false; this.emit(); };
    a.play().catch(() => { this.playing = false; this.emit(); });
    if (this.urls[this.idx + 1]) { const n = new Audio(); n.preload = 'auto'; n.src = this.urls[this.idx + 1]; }
    this.emit();
  },
  speakFrom(i) {
    if (this.urls) return this.playFile(i);
    if (!this.ok || !this.sents.length) return;
    speechSynthesis.cancel();
    this.idx = Math.max(0, Math.min(i, this.sents.length - 1));
    this.playing = true;
    const go = () => {
      if (!this.playing) return;
      if (this.idx >= this.sents.length) { this.playing = false; this.idx = 0; this.emit(true); return; }
      const u = new SpeechSynthesisUtterance(this.sents[this.idx]);
      const lc = this.lang === 'ko' ? 'ko-KR' : 'en-US';
      u.lang = lc; const v = this.voice(this.lang); if (v) u.voice = v;
      u.rate = this.rate;
      u.onend = () => { if (!this.playing) return; this.idx++; this.emit(); go(); };
      u.onerror = e => { if (e.error === 'interrupted' || e.error === 'canceled') return; this.playing = false; this.emit(); };
      speechSynthesis.speak(u);
      this.emit();
    };
    go();
  },
  toggle() { if (this.playing) this.pause(); else this.speakFrom(this.idx); },
  pause() { this.playing = false; if (this.audio) this.audio.pause(); if (this.ok) speechSynthesis.cancel(); this.emit(); },
  stop() { this.playing = false; if (this.audio) { this.audio.onended = null; this.audio.pause(); this.audio = null; } if (this.ok) speechSynthesis.cancel(); this.idx = 0; },
  emit(done) { this.onUpdate && this.onUpdate(done); }
};
if (Speech.ok) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }
function splitSentences(text) {
  const out = [];
  text.split(/\n+/).forEach(par => {
    const m = par.match(/[^.!?。！？]+(?:[.!?。！？]+["'”’)\]]*|$)\s*/g) || [par];
    let buf = '';
    m.forEach(s => { buf += s; if (buf.trim().length > 12 || /[.!?。！？]["'”’)\]]*\s*$/.test(buf)) { out.push(buf.trim()); buf = ''; } });
    if (buf.trim()) out.push(buf.trim());
    out.push('\n');
  });
  while (out[out.length - 1] === '\n') out.pop();
  return out;
}

/* ---------------- shell ---------------- */
function renderShell(route) {
  $('#nav').innerHTML = [['today', '#/today'], ['features', '#/features'], ['explore', '#/explore'], ['studio', '#/studio'], ['pricing', '#/pricing'], ['support', '#/support']].filter(([k]) => !(PLAY && k === 'pricing'))
    .map(([k, h]) => `<a href="${h}" class="${route === k ? 'on' : ''}">${t('nav_' + k)}</a>`).join('');
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === S.lang));
  document.documentElement.lang = S.lang;
  $('#foot').innerHTML = `<div class="foot-in">
    <div class="foot-brand">${LOGO_MARK}<div><div class="fw">QURATOR</div><div class="fs">MAISON DE DOCENT · SÉOUL</div></div></div>
    <nav class="foot-links">${PLAY ? '' : `<a href="#/galleries">${S.lang === 'ko' ? '갤러리 도입 안내' : 'For galleries'}</a>`}<a href="#/giving">${t('nav_giving')} · Oriel</a><a href="#/support">${t('nav_support')}</a><a href="${KAKAO}" target="_blank" rel="noopener">${S.lang === 'ko' ? '카카오톡 문의' : 'KakaoTalk'}</a><a href="#/policy/terms">${t('terms')}</a><a href="#/policy/privacy"><b>${t('privacy')}</b></a>${IOS ? '' : `<a href="#/policy/refund">${t('refund')}</a>`}</nav>
  </div>
  <div class="foot-in foot-legal"><span>${esc(t('biz'))}</span><span>© 2026 QURATOR · ${esc(t('foot_note'))}</span></div>`;
}

/* ---------------- views ---------------- */
const app = () => $('#app');

function viewHome(scrollTo) {
  const today = seoulDate(), ids = dailyIds(today), w0 = S.byId[ids[0]];
  const n = L();
  app().innerHTML = `
  ${heroBlock()}
  <div class="marquee" aria-hidden="true"><div class="marquee-in">${(new Array(2)).fill(['Louvre', 'Prado', 'Uffizi', 'Rijksmuseum', '국립중앙박물관', '간송미술관', 'Cleveland Museum of Art', 'Text · Voice · Multilingual']).flat().map(s => `<span>${s}</span>`).join('')}</div></div>

  ${PLAY ? '' : `<section class="sec" id="products"><div class="wrap">
    <div class="products rv">
      ${productCard('p1', '₩30,000', t('per_month'), '#/today', t('cta_today'))}
      ${productCard('p2', '₩300,000', t('per_show') + ' ' + t('from'), '#/galleries', S.lang === 'ko' ? '갤러리 도입 안내' : 'For galleries')}
    </div>
  </div></section>`}

  ${ribbonBlock()}

  <section class="sec dark"><div class="wrap">
    <div class="sec-head rv"><div><p class="eyebrow">${t('how_eyebrow')}</p><h2>${t('how_h')}</h2></div><p>${t('how_p')}</p></div>
    <div class="steps">${[1, 2, 3].map(i => `<div class="step rv"><div class="n">0${i}</div><h4>${t('s' + i + 'h')}</h4><p>${t('s' + i + 'p')}</p></div>`).join('')}</div>
  </div></section>

  <section class="sec"><div class="wrap">
    <div class="sec-head rv"><div><p class="eyebrow">${t('today_eyebrow')} · ${today}</p><h2>${t('today_h')}</h2></div>
      <a class="link" href="#/today">${t('see_all')} <span class="arrow">→</span></a></div>
    <div class="trio">${ids.map((id, i) => { const w = S.byId[id]; return `<a class="tcard rv" href="#/today">${artBox(w)}<div class="meta"><span class="num">${['I', 'II', 'III'][i]}</span>
      <h3>${esc(pick(w.title))}</h3><div class="by">${esc(pick(w.artist))} · ${esc(w.date)}</div>${i && !S.member && !IOS ? `<span class="lock-chip">● Members</span>` : ''}</div></a>`; }).join('')}</div>
  </div></section>

  <div id="homeFeature"></div>

  ${pricingBlock()}

  ${giveBand()}

  <section class="sec"><div class="wrap founder">
    <div class="rv"><p class="eyebrow">${t('f_eyebrow')}</p><blockquote>${esc(t('f_quote'))}</blockquote></div>
    <div class="rv"><p style="color:var(--ink-2);font-size:17px;margin:0 0 32px">${esc(t('f_body'))}</p>
      <div class="facts"><div class="fact"><b>20+</b><span>${t('fa1')}</span></div><div class="fact"><b>2+</b><span>${t('fa2')}</span></div><div class="fact"><b>180K</b><span>${t('fa3')}</span></div></div></div>
  </div></section>

  <section class="cta-band"><div class="wrap"><h2>${t('cta_h')}</h2><a class="btn" href="${KAKAO}" target="_blank" rel="noopener">${t('cta_btn')} <span class="arrow">→</span></a></div></section>`;
  hydrate(); reveal(); startStage();
  loadFeatures().then(list => { const f = list[0], box = $('#homeFeature'); if (!f || !box) return;
    box.innerHTML = `<section class="sec ft-home"><div class="wrap"><div class="sec-head rv"><div><p class="eyebrow">${t('nav_features')} · ${esc(pick(f.kicker))}</p><h2>${esc(pick(f.title))}</h2></div><a class="link" href="#/features/${esc(f.id)}">${t('ft_read')} <span class="arrow">→</span></a></div>
      <a class="ft-card rv" href="#/features/${esc(f.id)}">${featCover(f)}<div class="ft-meta"><p>${esc(pick(f.dek))}</p><span class="link">${t('ft_read')} <span class="arrow">→</span></span></div></a></div></section>`;
    hydrate(box); reveal(box); });
  if (scrollTo) setTimeout(() => { const el = document.getElementById(scrollTo); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 60);
  function productCard(p, price, per, href, cta) {
    return `<div class="product"><span class="tag">${t(p + '_tag')}</span><h3>${t(p + '_h')}</h3><p>${t(p + '_p')}</p>
      <ul>${T[p + '_l'][n].map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="price"><b>${price}</b><span>${per}</span></div>
      <a class="btn btn-ink" style="align-self:flex-start" href="${href}">${cta} <span class="arrow">→</span></a></div>`;
  }
}
/* ---------------- hero stage: slow cross-fading masterpieces ---------------- */
const HERO = [
  // classical and modern, East and West, in turn
  ['w-afklint7', '50% 38%'], ['k-mongyu', '82% 50%'], ['w-kandinsky7', '46% 50%'], ['w-hunters', '50% 45%'],
  ['k-inwang', '50% 45%'], ['w-mondrian30', '50% 82%'], ['w-milkmaid', '50% 40%'], ['w-kiss', '50% 30%']
];
const STAGE_MS = 7600;
let stageTimer = null, stageCleanup = null;
function heroBlock() {
  return `<section class="stage" id="stage" style="--dur:${STAGE_MS}ms">
    <div class="slides">${HERO.map(([id, pos], i) => `<figure class="slide${i === 0 ? ' on' : ''}" data-i="${i}"><div class="kb kb${i % 4}" style="background-position:${pos}"></div></figure>`).join('')}</div>
    <div class="stage-shade"></div>
    <div class="stage-copy wrap"><div class="sc-in">
      <p class="eyebrow">${t('hero_eyebrow')}</p>
      <h1>${t('hero_h')}</h1>
      <p class="lead">${esc(t(IOS ? 'hero_lead_ios' : 'hero_lead'))}</p>
      <div class="hero-ctas">
        <a class="btn btn-cream" href="#/today">${t('cta_today')} <span class="arrow">→</span></a>
        ${PLAY ? `<a class="btn btn-ghost" href="#/explore">${t('nav_explore')}</a>` : `<a class="btn btn-ghost" href="#/pricing">${t('cta_gallery')}</a>`}
      </div>
    </div></div>
    <div class="stage-foot wrap">
      <a class="stage-cap" id="stageCap" href="#/w/${HERO[0][0]}"></a>
      <div class="stage-ctrl">
        <span class="stage-idx" id="stageIdx"></span>
        <div class="bars">${HERO.map((_, i) => `<button class="bar" data-i="${i}" aria-label="${i + 1}"><i></i></button>`).join('')}</div>
      </div>
    </div>
    <div class="wall-label stage-label" id="stageLabel"><div><b id="wlT"></b><small id="wlA"></small></div><div class="qr-mini" id="heroQr"></div><div class="scan">${t('scan_label')}</div></div>
    <button class="scroll-cue" id="scrollCue" aria-label="Scroll down"><span></span></button>
  </section>`;
}
function startStage() {
  const st = $('#stage'); if (!st) return;
  const slides = $$('.slide', st), bars = $$('.bar', st), cap = $('#stageCap'), idx = $('#stageIdx');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 0, paused = false;
  HERO.forEach(([id], i) => {
    const w = S.byId[id]; if (!w) return;
    curatedImage(w, 1920).then(src => {
      if (!src) return;
      const im = new Image(); im.referrerPolicy = 'no-referrer';
      im.onload = () => { $('.kb', slides[i]).style.backgroundImage = `url("${src}")`; slides[i].classList.add('ready'); if (i === 0) st.classList.add('ready'); };
      im.src = src;
    });
  });
  function caption() {
    const w = S.byId[HERO[cur][0]];
    cap.classList.remove('in'); void cap.offsetWidth;
    cap.href = '#/w/' + w.id;
    cap.innerHTML = `<span class="cap-k">${esc(pick(w.collection))}</span><b>${esc(pick(w.title))}</b><span class="cap-a">${esc(pick(w.artist))}, ${esc(w.date)}</span><span class="cap-go">${S.lang === 'ko' ? '작품 해설 듣기' : 'Hear the story'} →</span>`;
    cap.classList.add('in');
    idx.innerHTML = `<b>${String(cur + 1).padStart(2, '0')}</b> / ${String(HERO.length).padStart(2, '0')}`;
    $('#wlT').textContent = pick(w.title);
    $('#wlA').innerHTML = `${esc(pick(w.artist))}<br>${esc(w.date)}`;
    makeQR($('#heroQr'), BASE() + '#/w/' + w.id, 64);
  }
  function arm() { clearTimeout(stageTimer); if (!reduce && !paused) stageTimer = setTimeout(() => show(cur + 1), STAGE_MS); }
  function runBar() { bars.forEach((b, k) => { b.classList.toggle('done', k < cur); b.classList.remove('run'); }); void bars[cur].offsetWidth; if (!reduce) bars[cur].classList.add('run'); }
  function show(i) {
    const prev = cur; cur = (i + HERO.length) % HERO.length; if (prev === cur) return;
    slides[prev].classList.remove('on'); slides[prev].classList.add('off');
    setTimeout(() => slides[prev].classList.remove('off'), 2600);
    const kb = $('.kb', slides[cur]); kb.style.animation = 'none'; void kb.offsetWidth; kb.style.animation = '';
    slides[cur].classList.add('on');
    runBar(); caption(); arm();
  }
  bars.forEach(b => b.onclick = () => show(+b.dataset.i));
  $('#scrollCue').onclick = () => { const el = document.getElementById('products'); if (el) el.scrollIntoView({ behavior: 'smooth' }); };
  let x0 = null;
  st.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  st.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
  const onVis = () => { paused = document.hidden; if (paused) clearTimeout(stageTimer); else { runBar(); arm(); } };
  document.addEventListener('visibilitychange', onVis);
  const onKey = e => { if (e.key === 'ArrowRight') show(cur + 1); else if (e.key === 'ArrowLeft') show(cur - 1); };
  addEventListener('keydown', onKey);
  stageCleanup = () => { clearTimeout(stageTimer); document.removeEventListener('visibilitychange', onVis); removeEventListener('keydown', onKey); };
  runBar(); caption(); arm();
}
function ribbonBlock() {
  const kr = S.works.filter(w => w.region === 'kr'), wo = S.works.filter(w => w.region !== 'kr');
  const row1 = [...wo.slice(0, 7), ...kr.slice(0, 5)], row2 = [...kr.slice(5), ...wo.slice(7)];
  const item = (w, cls) => `<a class="rib ${cls}" href="#/w/${w.id}">${artBox(w, '', 800)}<span><b>${esc(pick(w.title))}</b>${esc(pick(w.artist))}</span></a>`;
  const row = (list, cls, rev) => `<div class="rib-row${rev ? ' rev' : ''}"><div class="rib-track">${[...list, ...list].map(w => item(w, cls)).join('')}</div></div>`;
  return `<section class="ribbon-sec"><div class="wrap sec-head rv"><div><p class="eyebrow">The Collection · ${S.works.length}</p>
      <h2>${S.lang === 'ko' ? '미술사가 고른 명작, 한 점씩 깊게' : 'Masterpieces chosen by an art historian, told in depth'}</h2></div>
      <a class="link" href="#/explore">${t('nav_explore')} <span class="arrow">→</span></a></div>
    ${row(row1, 'tall')}${row(row2, 'wide', true)}</section>`;
}
function pricingBlock() {
  if (PLAY) return '';
  const n = L();
  const plan = (k, amt, per, cls, btn) => `<div class="plan ${cls}"><h4>${t(k)}</h4><div class="amt">${amt}<small>${per}</small></div>
    <ul>${T[k + 'l'][n].map(x => `<li>${esc(x)}</li>`).join('')}</ul>${btn}</div>`;
  return `<section class="sec" id="pricing"><div class="wrap">
    <div class="sec-head rv"><div><p class="eyebrow">${t('pr_eyebrow')}</p><h2>${t('pr_h')}</h2></div></div>
    <div class="pricing rv">
      ${plan('pl1', '₩30,000', t('per_month'), 'feat', `<button class="btn btn-seal" data-act="subscribe">${t('subscribe')}</button>`)}
      ${plan('pl2', '₩300,000', t('per_show'), '', `<a class="btn btn-line" href="${KAKAO}" target="_blank" rel="noopener">${t('inquire')}</a>`)}
      ${plan('pl3', '₩1,000,000', t('per_show'), '', `<a class="btn btn-line" href="${KAKAO}" target="_blank" rel="noopener">${t('inquire')}</a>`)}
      ${plan('pl4', '₩99,000', t('per_month'), '', `<a class="btn btn-line" href="${KAKAO}" target="_blank" rel="noopener">${t('inquire')}</a>`)}
    </div>${giveNote('rv')}</div></section>`;
}

function viewToday(date) {
  const today = seoulDate();
  date = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today ? date : today;
  const ids = dailyIds(date), f = fmtDate(date, S.lang);
  const isToday = date === today;
  app().innerHTML = `
  <section class="phead"><div class="wrap">
    <p class="eyebrow">${S.lang === 'ko' ? t('daily_h') + ' · Daily Art' : 'Daily Art'}</p>
    <div class="today-date"><span class="d">${f.d}</span><span class="m">${esc(f.m)}</span></div>
    <p style="margin-top:18px">${t(IOS ? 'daily_p_ios' : 'daily_p')}</p>
    ${memberBar()}
    <button class="btn btn-line btn-sm install" id="installBtn" style="margin-top:18px">↓ ${t('install')}</button>
  </div></section>
  <div class="wrap">${ids.map((id, i) => dayCard(S.byId[id], i, !isToday ? S.member : (i === 0 || S.member))).join('')}${giveNote('give-note-today')}</div>
  ${S.member ? '' : pricingBlock()}`;
  hydrate(); reveal(); bindInstall();
}
function dayCard(w, i, open) {
  if (IOS && !open) return '';
  const first = splitSentences(w.text.en).filter(s => s !== '\n').slice(0, 2).join(' ');
  return `<article class="day-card">
    <div class="day-art rv"><a href="#/w/${w.id}">${artBox(w)}</a></div>
    <div class="day-body rv">
      ${IOS ? '' : `<span class="day-num">${['I', 'II', 'III'][i]} / III</span>`}
      <h2>${esc(w.title.en)}</h2>
      <p class="kot">${esc(w.title.ko)}</p>
      <p class="byline"><span>${esc(w.artist.en)}</span><span>${esc(w.date)}</span><span>${esc(w.collection.en)}</span></p>
      <p class="tagline">${esc(w.tagline.en)}</p>
      ${open ? `
        <div class="commentary" lang="en"><p>${esc(w.text.en)}</p></div>
        <details class="ko-trans"><summary>${t('ko_trans')}</summary><div lang="ko">${esc(w.text.ko)}</div></details>
        <p class="words-h">${t('words_h')}</p>
        <div class="words">${(w.words || []).map(x => `<div><b>${esc(x.en)}</b><span>${esc(x.ko)}</span></div>`).join('')}</div>
        <a class="btn btn-ink" href="#/w/${w.id}">♪ ${t('open_v')} <span class="arrow">→</span></a>`
      : `<div class="locked"><div class="fade commentary" lang="en"><p>${esc(first)}</p></div>
        <div class="lock-box"><h4>${t('locked_h')}</h4><p>${t('locked_p')}</p>
        <button class="btn btn-seal" data-act="subscribe">${PLAY ? t('play_unlock') : `${t('subscribe')} — ₩30,000${t('per_month')}`}</button></div></div>`}
    </div></article>`;
}
function viewArchive() {
  if (IOS) return viewArchiveFree();
  const today = seoulDate(), days = [];
  for (let i = 0; i < 21; i++) { const d = new Date(Date.parse(today + 'T00:00:00Z') - i * 864e5).toISOString().slice(0, 10); days.push(d); }
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow">Daily Art</p><h1>${t('archive')}</h1>
    <p>${S.member ? t('member_on') : t('locked_p')}</p>${S.member ? '' : `<button class="btn btn-seal" style="margin-top:20px" data-act="subscribe">${PLAY ? t('play_unlock') : t('subscribe')}</button>`}</div></section>
    <div class="wrap" style="padding-bottom:90px">${days.map(d => {
      const f = fmtDate(d, S.lang);
      return `<div style="border-top:1px solid var(--line);padding:26px 0">
      <a href="#/today/${d}" style="display:flex;gap:14px;align-items:baseline;margin-bottom:16px"><span style="font-family:var(--serif-en);font-size:40px;line-height:1">${f.d}</span><span class="note">${esc(f.m)}</span></a>
      <div class="grid">${dailyIds(d).map(id => { const w = S.byId[id]; return `<a class="gcard" href="${S.member ? '#/w/' + id : '#/today/' + d}">${artBox(w)}<h3>${esc(w.title.en)}</h3><div class="by">${esc(w.artist.en)}</div></a>`; }).join('')}</div></div>`;
    }).join('')}</div>`;
  hydrate();
}

function viewArchiveFree() {   // iOS app: the free first work of each past day
  const today = seoulDate(), days = [];
  for (let i = 0; i < 21; i++) days.push(new Date(Date.parse(today + 'T00:00:00Z') - i * 864e5).toISOString().slice(0, 10));
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow">Daily Art</p><h1>${t('archive')}</h1><p>${t('ios_archive_p')}</p></div></section>
    <div class="wrap" style="padding-bottom:90px"><div class="grid">${days.map(d => { const id = dailyIds(d)[0], w = S.byId[id]; if (!w) return ''; const f = fmtDate(d, S.lang);
      return `<a class="gcard" href="#/w/${id}">${artBox(w)}<p class="note" style="margin-top:10px">${f.d} · ${esc(f.m)}</p><h3>${esc(w.title.en)}</h3><div class="by">${esc(w.artist.en)}</div></a>`; }).join('')}</div></div>`;
  hydrate();
}

/* explore */
let exploreState = { q: '', filter: 'all', results: null, loading: false };
function viewExplore() {
  const st = exploreState;
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow">Open collections</p><h1>${t('ex_h')}</h1><p>${t('ex_p').replace('24', S.works.length)}</p></div></section>
  <div class="wrap" style="padding-bottom:90px">
    <form class="searchbar" id="sform"><input id="sq" type="search" value="${esc(st.q)}" placeholder="${esc(t('ex_ph'))}" autocomplete="off" enterkeyhint="search">
      <button class="btn btn-ink btn-sm" type="submit">Search</button></form>
    <div class="chips" id="chips">${['all', 'kr', 'world', 'cma', 'aic'].map(k => `<button class="chip ${st.filter === k ? 'on' : ''}" data-f="${k}">${k.length === 3 && Src[k] ? Src[k].label : t(k)}</button>`).join('')}</div>
    <div id="res"></div></div>`;
  $('#sform').onsubmit = e => { e.preventDefault(); st.q = $('#sq').value.trim(); runSearch(); };
  $('#chips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; st.filter = b.dataset.f; $$('.chip').forEach(c => c.classList.toggle('on', c === b)); drawResults(); };
  drawResults();
  if (st.q && !st.results) runSearch();
}
async function runSearch() {
  const st = exploreState;
  if (!st.q) { st.results = null; drawResults(); return; }
  st.loading = true; st.results = { aic: null, cma: null }; drawResults();
  const q = st.q;
  await Promise.all(SEARCHABLE.map(async k => {
    try { st.results[k] = await Src[k].search(q); } catch { st.results[k] = []; }
    if (exploreState.q === q) drawResults();
  }));
  st.loading = false; drawResults();
}
function curatedMatch(q) {
  if (!q) return S.works;
  const s = q.toLowerCase();
  return S.works.filter(w => [w.title.ko, w.title.en, w.artist.ko, w.artist.en, w.collection.ko, w.collection.en, w.tagline.ko, w.tagline.en].join(' ').toLowerCase().includes(s));
}
function drawResults() {
  const box = $('#res'); if (!box) return;
  const st = exploreState, f = st.filter;
  let cur = curatedMatch(st.q);
  if (f === 'kr') cur = cur.filter(w => w.region === 'kr'); else if (f === 'world') cur = cur.filter(w => w.region !== 'kr'); else if (f !== 'all') cur = [];
  const api = [];
  if (st.results) for (const k of SEARCHABLE) if ((f === 'all' || f === k) && st.results[k]) api.push(...st.results[k]);
  const pending = st.results && SEARCHABLE.some(k => (f === 'all' || f === k) && st.results[k] === null);
  const cards = [
    ...cur.map(w => gcard({ uid: w.id, id: w.id, title: pick(w.title), artist: pick(w.artist), date: w.date, srcLabel: t('curated') })),
    ...api.map(w => gcard({ uid: w.uid, title: w.title, artist: w.artist || t('v_unknown'), date: w.date, image: w.image, srcLabel: Src[w.source].label }))
  ];
  box.innerHTML = `${st.q ? `<p class="note" style="margin:-10px 0 20px">${t('results')} · ${cards.length}${pending ? ` &nbsp;<span class="spinner"></span> ${t('searching')}` : ''}</p>` : ''}
    ${cards.length ? `<div class="grid">${cards.join('')}</div>` : (pending ? '' : `<div class="empty">${t('noresult')}</div>`)}`;
  hydrate(box);
  box.onclick = e => { const b = e.target.closest('.add'); if (!b) return; e.preventDefault(); toggleStudio(b.dataset.uid, b); };
}
function gcard(o) {
  const inS = S.studio.items.some(x => x.uid === o.uid);
  return `<a class="gcard" href="#/w/${esc(o.uid)}"><div style="position:relative"><span class="src">${esc(o.srcLabel)}</span>
    <button class="add ${inS ? 'on' : ''}" data-uid="${esc(o.uid)}" data-title="${esc(o.title)}" data-artist="${esc(o.artist)}" data-date="${esc(o.date || '')}" aria-label="Add">${inS ? '✓' : '+'}</button>
    ${artBox({ id: o.id, title: o.title, image: o.image })}</div><h3>${esc(o.title)}</h3><div class="by">${esc(o.artist)}${o.date ? ' · ' + esc(o.date) : ''}</div></a>`;
}
function toggleStudio(uid, btn) {
  const i = S.studio.items.findIndex(x => x.uid === uid);
  if (i >= 0) { S.studio.items.splice(i, 1); toast(t('removed')); }
  else { S.studio.items.push({ uid, title: btn.dataset.title, artist: btn.dataset.artist, date: btn.dataset.date }); toast(t('added')); }
  store.set('q_studio', S.studio);
  btn.classList.toggle('on', i < 0); btn.textContent = i < 0 ? '✓' : '+';
}

/* studio */
function itemLink(it) { return BASE() + (it.uid.startsWith('c:') ? '#/c/' + it.uid.slice(2) : '#/w/' + it.uid); }
function itemInfo(it) {
  const w = S.byId[it.uid];
  if (w) return { ko: w.title.ko, en: w.title.en, artist: S.lang === 'ko' ? w.artist.ko : w.artist.en, date: w.date, medium: pick(w.medium) };
  return { ko: it.title, en: '', artist: it.artist, date: it.date, medium: it.medium || '' };
}
function viewStudio() {
  const st = S.studio;
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow">For galleries</p><h1>${t('st_h')}</h1><p>${t('st_p')}</p></div></section>
  <div class="wrap studio">
    <aside class="panel">
      <h3>Exhibition</h3>
      <div class="field"><label>${t('st_name')}</label><input id="xn" value="${esc(st.name)}" placeholder="예) 여백의 시간 — 조선 회화展"></div>
      <div class="field"><label>${t('st_sub')}</label><input id="xs" value="${esc(st.sub)}" placeholder="2026.11.10 – 11.30 · 인사동"></div>
      <details ${st.items.length ? '' : 'open'}><summary>${t('st_custom')}</summary>
        <form id="cform" style="margin-top:14px">
          <div class="field"><label>${t('st_t')} *</label><input name="t" required></div>
          <div class="row2"><div class="field"><label>${t('st_a')}</label><input name="a"></div><div class="field"><label>${t('st_y')}</label><input name="y"></div></div>
          <div class="field"><label>${t('st_m')}</label><input name="m" placeholder="캔버스에 유채, 72.7×60.6cm"></div>
          <div class="field"><label>${t('st_img')}</label><input name="i" type="url" placeholder="https://…"></div>
          <div class="field"><label>${t('st_ko')}</label><textarea name="ko"></textarea></div>
          <div class="field"><label>${t('st_en')}</label><textarea name="en"></textarea></div>
          <p class="note" style="margin:0 0 14px">${t('st_hint')}</p>
          <button class="btn btn-ink btn-sm" type="submit">${t('st_add')}</button>
        </form></details>
    </aside>
    <section>
      <div class="studio-bar">
        <button class="btn btn-ink btn-sm" id="pr" ${st.items.length ? '' : 'disabled'}>⎙ ${t('st_print')}</button>
        <button class="btn btn-line btn-sm" id="cp" ${st.items.length ? '' : 'disabled'}>${t('st_copy')}</button>
        <a class="btn btn-line btn-sm" href="#/explore">+ ${t('go_explore')}</a>
        ${st.items.length ? `<button class="btn btn-sm" id="clr" style="color:var(--muted)">${t('st_clear')}</button>` : ''}
        <span class="cnt">${st.items.length} ${t('st_count')}</span>
      </div>
      ${st.items.length ? `<div class="labels">${st.items.map((it, i) => { const f = itemInfo(it); return `<div class="label">
        <button class="rm" data-i="${i}" aria-label="remove">×</button>
        <div><div class="lt">${esc(f.ko)}</div>${f.en && f.en !== f.ko ? `<div class="le">${esc(f.en)}</div>` : ''}
        <div class="la">${esc(f.artist || '')}${f.date ? ', ' + esc(f.date) : ''}</div><div class="lm">${esc(f.medium || '')}</div></div>
        <div class="lq" data-q="${esc(itemLink(it))}"></div>
        <div class="ls"><span>Scan · 음성 해설 · Audio guide</span><span>${String(i + 1).padStart(2, '0')}</span></div></div>`; }).join('')}</div>
        <div class="xqr"><div class="q" id="xq"></div><div><b style="font-family:var(--serif);font-size:19px">${esc(st.name || 'Exhibition')}</b><p style="margin:6px 0 0;color:#CFC8BA;font-size:14px">${t('st_xqr')}</p></div></div>`
      : `<div class="empty" style="border:1px dashed var(--line)">${t('st_empty')}</div>`}
    </section></div>`;
  const save = () => { st.name = $('#xn').value; st.sub = $('#xs').value; store.set('q_studio', st); };
  $('#xn').oninput = $('#xs').oninput = save;
  $('#xn').onchange = $('#xs').onchange = () => { save(); viewStudio(); };
  $$('.lq').forEach(el => makeQR(el, el.dataset.q, 192));
  if (st.items.length) exhibitionLink().then(u => makeQR($('#xq'), u, 220));
  $('#cform').onsubmit = async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const obj = { t: fd.t, a: fd.a, y: fd.y, m: fd.m, i: fd.i, ko: fd.ko, en: fd.en };
    Object.keys(obj).forEach(k => { if (!obj[k]) delete obj[k]; });
    const p = await pack(obj);
    st.items.push({ uid: 'c:' + p, title: fd.t, artist: fd.a, date: fd.y, medium: fd.m });
    store.set('q_studio', st); toast(t('added')); viewStudio();
  };
  $$('.rm').forEach(b => b.onclick = () => { st.items.splice(+b.dataset.i, 1); store.set('q_studio', st); viewStudio(); });
  const pr = $('#pr'); if (pr) pr.onclick = () => window.print();
  const cp = $('#cp'); if (cp) cp.onclick = async () => { const u = await exhibitionLink(); try { await navigator.clipboard.writeText(u); toast(t('copied')); } catch { prompt('URL', u); } };
  const clr = $('#clr'); if (clr) clr.onclick = () => { if (confirm(t('st_clear') + '?')) { st.items = []; store.set('q_studio', st); viewStudio(); } };
}
async function exhibitionLink() { const st = S.studio; return BASE() + '#/x/' + await pack({ n: st.name, s: st.sub, i: st.items.map(x => x.uid), m: st.items.map(x => [x.title, x.artist, x.date]) }); }

function makeQR(el, text, size) {
  if (!el || typeof QRCode === 'undefined') return;
  el.innerHTML = '';
  try { new QRCode(el, { text, width: size, height: size, colorDark: '#16140F', colorLight: '#ffffff', correctLevel: text.length > 600 ? QRCode.CorrectLevel.L : QRCode.CorrectLevel.M }); }
  catch { el.innerHTML = '<small style="color:#A8361F">QR too long — shorten text</small>'; }
}

/* exhibition guide (visitor) */
async function viewExhibition(payload) {
  document.body.classList.add('v');
  let x; try { x = await unpack(payload); } catch { app().innerHTML = `<div class="empty">${t('v_notfound')}</div>`; return; }
  app().innerHTML = `<div class="viewer"><div class="xhead"><p class="eyebrow">Exhibition · ${x.i.length} ${t('x_works')}</p><h1>${esc(x.n || 'Exhibition')}</h1><p>${esc(x.s || '')}</p>
    <p class="note" style="margin-top:18px;color:#8E8676">${t('x_scan')}</p></div>
    <ul class="xlist">${x.i.map((uid, k) => { const w = S.byId[uid]; const m = (x.m && x.m[k]) || []; const href = uid.startsWith('c:') ? '#/c/' + uid.slice(2) : '#/w/' + uid;
      const title = w ? pick(w.title) : m[0], artist = w ? pick(w.artist) : m[1];
      return `<li><a href="${href}"><span class="i">${String(k + 1).padStart(2, '0')}</span>${artBox(w ? w : { title: '' })}<span><b>${esc(title || '')}</b><small>${esc(artist || '')}${(w ? w.date : m[2]) ? ' · ' + esc(w ? w.date : m[2]) : ''}</small></span><span>→</span></a></li>`; }).join('')}</ul></div>`;
  hydrate();
  // fill API thumbnails lazily
  x.i.forEach((uid, k) => { if (/^(aic|met|cma)-/.test(uid)) getApiWork(uid).then(w => { const el = $$('.xlist .art')[k]; if (el && w.image) { el.dataset.src = w.image; el.classList.remove('h'); hydrate(el.parentNode); } }).catch(() => {}); });
}

/* artwork viewer */
async function viewWork(uid, custom) {
  document.body.classList.add('v');
  app().innerHTML = `<div class="viewer"><div class="empty" style="color:#8E8676"><span class="spinner"></span> ${t('v_loading')}</div></div>`;
  let model;
  try {
    if (custom) {
      const c = await unpack(custom);
      model = { kind: 'custom', title: c.t, titleAlt: '', artist: c.a, date: c.y, medium: c.m, image: c.i, imageLg: c.i,
        text: { ko: c.ko || '', en: c.en || '' }, collection: '' };
    } else if (S.byId[uid]) {
      const w = S.byId[uid];
      model = { kind: 'curated', w, imgCredit: w.imgCredit, title: pick(w.title), titleAlt: S.lang === 'ko' ? w.title.en : w.title.ko, artist: pick(w.artist), date: w.date,
        medium: pick(w.medium), collection: pick(w.collection), text: w.text, tagline: w.tagline, look: w.look, words: w.words };
    } else if (/^(aic|met|cma)-\d+$/.test(uid)) {
      const w = await getApiWork(uid);
      model = { kind: 'api', api: w, title: w.title, titleAlt: '', artist: w.artist || t('v_unknown'), date: w.date, medium: w.medium,
        collection: w.museum, image: w.image, imageLg: w.imageLg, text: { en: w.text || composeText(w, 'en') }, basic: !w.text, link: w.link, credit: w.credit, place: w.place };
    }
  } catch (e) { console.warn(e); }
  if (!model) { app().innerHTML = `<div class="viewer"><div class="empty">${t('v_notfound')}<br><br><a class="link" href="#/explore">${t('nav_explore')} →</a></div></div>`; return; }

  const avail = ['ko', 'en'].filter(l => model.kind === 'api' || (model.text[l] && model.text[l].trim()));
  let tl = avail.includes(S.lang) ? S.lang : avail[0] || 'en';
  const imgBox = model.kind === 'curated' ? artBox(model.w, 'contain') : artBox({ title: model.title, image: model.image }, 'contain');

  app().innerHTML = `<div class="viewer">
    <div class="v-stage">${imgBox}<button class="v-zoom" id="zoom" aria-label="Zoom">⤢</button></div>
    <div class="v-head">
      <p class="eyebrow">${esc(model.collection || 'QURATOR')}</p>
      <h1>${esc(model.title)}</h1>${model.titleAlt ? `<div class="alt">${esc(model.titleAlt)}</div>` : ''}
      <div class="who"><span>${esc(model.artist || '')}</span>${model.date ? `<span>${esc(model.date)}</span>` : ''}</div>
      <div class="v-acts">${model.kind === 'curated' ? `<button id="vcard"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="1"/><path d="M8 7.5h8v6H8zM8 16.5h5"/></svg>${t('v_card')}</button>` : ''}<button id="vcopy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>${t('v_copy')}</button></div>
    </div>
    ${model.tagline ? `<p class="v-tag ${tl}" id="vtag">${esc(model.tagline[tl])}</p>` : ''}
    <div class="v-tabs" id="vtabs">${avail.map(l => `<button data-l="${l}" class="${l === tl ? 'on' : ''}">${l === 'ko' ? '한국어' : 'English'}</button>`).join('')}</div>
    <div class="v-text" id="vtext"></div>
    <p class="v-note" id="vnote"></p>
    ${model.look ? `<div class="v-sec"><h3>${t('v_look')}</h3><ol class="look" id="vlook"></ol></div>` : ''}
    ${model.words ? `<div class="v-sec"><h3>${t('v_words')}</h3><div class="v-words">${model.words.map(x => `<div><b>${esc(x.en)}</b><span>${esc(x.ko)}</span></div>`).join('')}</div></div>` : ''}
    <div class="v-sec"><h3>${t('v_info')}</h3><table class="meta-t">
      ${row(t('v_artist'), model.artist)}${row(t('v_date'), model.date)}${row(t('v_medium'), model.medium)}${row(t('v_coll'), model.collection)}
      ${model.place ? row('Origin', model.place) : ''}${model.imgCredit ? `<tr><th>Image</th><td><a href="${esc(model.imgCredit.url)}" target="_blank" rel="noopener">${esc(model.imgCredit.text)} ↗</a></td></tr>` : ''}${model.credit ? row('Credit', model.credit) : ''}
      ${model.link ? `<tr><th>${t('v_src')}</th><td><a href="${esc(model.link)}" target="_blank" rel="noopener">${esc(model.collection)} ↗</a></td></tr>` : ''}
    </table></div>
    ${model.kind === 'curated' ? `<div class="v-sec"><h3>${t('v_more')}</h3><div class="v-more">${S.works.filter(w => w.region === model.w.region && w.id !== model.w.id).sort(() => Math.random() - .5).slice(0, 3)
      .map(w => `<a href="#/w/${w.id}">${artBox(w)}<p>${esc(pick(w.title))}</p></a>`).join('')}</div></div>` : ''}
    <div class="v-sec" style="text-align:center;padding-top:20px;border-top:1px solid rgba(237,230,216,.1)">
      <a href="#/" style="font-family:var(--serif-en);letter-spacing:.24em;font-size:15px;color:#8E8676">QURATOR</a><p class="note" style="color:#6d665a;margin:6px 0 0;font-size:12px">QR Docent · Daily Art</p></div>
  </div>
  <div class="player"><div class="player-in">
    <button class="play" id="play" aria-label="${t('v_listen')}"></button>
    <div class="p-info"><div class="p-title">${t('v_listen')} · ${esc(model.title)}</div><div class="p-bar"><i id="pbar"></i></div><div class="p-sub"><span id="pstat"></span><span id="plang"></span></div></div>
    <button class="rate" id="rate">${Speech.rate}×</button>
  </div></div>`;
  hydrate();

  const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
  const textCache = {};
  async function textFor(l) {
    if (textCache[l]) return textCache[l];
    if (model.kind === 'curated') {
      try {
        const n = await getJSON(`audio/${model.w.id}/${l}.json`, { cache: 'no-cache' });
        if (n && n.sentences && n.files) return textCache[l] = { text: model.text[l], note: '', rec: n };
      } catch {}
    }
    if (model.kind !== 'api') return textCache[l] = { text: model.text[l], note: '' };
    const w = model.api;
    if (l === 'en') return textCache[l] = { text: model.text.en, note: model.basic ? t('v_basic') : '' };
    // ko for museum records
    const head = composeText(w, 'ko');
    if (model.basic) return textCache[l] = { text: head, note: t('v_basic') };
    $('#vtext').innerHTML = `<span class="spinner"></span>`;
    const tr = await translate(model.text.en, 'ko');
    if (tr) return textCache[l] = { text: head + '\n' + tr, note: t('v_auto') + `<a href="${esc(model.link)}" target="_blank" rel="noopener">${esc(w.museum)} ↗</a>` };
    const gt = `https://translate.google.com/?sl=en&tl=ko&op=translate&text=${enc(model.text.en.slice(0, 4500))}`;
    return textCache[l] = { text: head + '\n' + model.text.en, note: t('v_orig') + `<a href="${gt}" target="_blank" rel="noopener">${t('v_gt')} ↗</a>`, mixed: true };
  }
  async function showLang(l) {
    tl = l;
    $$('#vtabs button').forEach(b => b.classList.toggle('on', b.dataset.l === l));
    if (model.tagline) { const g = $('#vtag'); g.textContent = model.tagline[l]; g.className = 'v-tag ' + l; }
    if (model.look) $('#vlook').innerHTML = model.look[l].map(x => `<li>${esc(x)}</li>`).join('');
    const r = await textFor(l);
    const sents = r.rec ? r.rec.sentences : splitSentences(r.text || '');
    const vt = $('#vtext');
    vt.className = 'v-text ' + (l === 'en' ? 'en' : '');
    let k = 0;
    vt.innerHTML = sents.map(s => s === '\n' ? '<br><br>' : `<span class="s" data-i="${k++}">${esc(s)}</span> `).join('');
    $('#vnote').innerHTML = r.note || '';
    const speakSents = sents.filter(s => s !== '\n');
    // for mixed (ko header + english original) speak in English except header line
    if (r.rec) Speech.load(speakSents, l, r.rec.files.map(f => ASSET(`audio/${model.w.id}/${f}`)));
    else Speech.load(speakSents, r.mixed ? 'en' : l);
    $('#plang').textContent = r.rec ? (S.lang === 'ko' ? 'AI 도슨트 음성' : 'AI docent voice') : ((l === 'ko' && !r.mixed) ? '한국어 음성' : 'English voice');
  }
  Speech.onUpdate = done => {
    const p = $('#play'); if (!p) return;
    p.innerHTML = Speech.playing ? ICON_PAUSE : ICON_PLAY;
    const n = Speech.sents.length;
    $('#pbar').style.width = n ? ((Speech.idx + (Speech.playing ? .5 : 0)) / n * 100) + '%' : 0;
    if (done) $('#pbar').style.width = '100%';
    $('#pstat').textContent = n ? `${Math.min(Speech.idx + 1, n)} / ${n}` : '';
    $$('#vtext .s').forEach(s => s.classList.toggle('cur', Speech.playing && +s.dataset.i === Speech.idx));
    const cur = $('#vtext .s.cur');
    if (cur && Speech.playing) { const r = cur.getBoundingClientRect(); if (r.top < 80 || r.bottom > innerHeight - 110) cur.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  };
  $('#play').onclick = () => { if (!Speech.ok && !Speech.urls) { toast('Audio is not supported on this browser'); return; } Speech.toggle(); };
  $('#vtext').onclick = e => { const s = e.target.closest('.s'); if (s && (Speech.ok || Speech.urls)) Speech.speakFrom(+s.dataset.i); };
  $('#vtabs').onclick = e => { const b = e.target.closest('button'); if (b) showLang(b.dataset.l); };
  $('#rate').onclick = () => { const rs = [0.9, 1, 1.15, 1.3]; Speech.rate = rs[(rs.indexOf(Speech.rate) + 1) % rs.length]; store.set('q_rate', Speech.rate); $('#rate').textContent = Speech.rate + '×'; if (Speech.audio) Speech.audio.playbackRate = Speech.rate; else if (Speech.playing) Speech.speakFrom(Speech.idx); };
  $('#vcopy').onclick = () => copyLink(location.href);
  if ($('#vcard')) $('#vcard').onclick = async e => {
    const b = e.currentTarget; if (b.disabled) return; b.disabled = true; toast(t('v_card_wait'));
    try { await saveCard(model.w); } catch (err) { console.warn(err); }
    b.disabled = false;
  };
  $('#zoom').onclick = async () => {
    let src = model.imageLg || model.image;
    if (model.kind === 'curated') src = await curatedImage(model.w);
    if (!src) return;
    const z = document.createElement('div'); z.className = 'zoom-layer';
    z.innerHTML = `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer"><button class="x" aria-label="close">×</button>`;
    z.onclick = e => { if (e.target.classList.contains('x') || e.target === z) z.remove(); };
    document.body.appendChild(z);
  };
  await showLang(tl);
  Speech.emit();
  function row(k, v) { return v ? `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>` : ''; }
}

/* ---------------- share: link + 1080×1350 card ---------------- */
async function copyLink(url) {
  try { await navigator.clipboard.writeText(url); toast(t('v_copied')); }
  catch { const i = document.createElement('input'); i.value = url; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); toast(t('v_copied')); } catch {} i.remove(); }
}
function loadCorsImage(src) {
  return new Promise(res => { if (!src) return res(null); const im = new Image(); im.crossOrigin = 'anonymous'; im.referrerPolicy = 'no-referrer'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
async function drawCard(w, lang) {
  const W = 1080, H = 1350, M = 84, PAPER = '#F3EFE6', INK = '#16140F', INK2 = '#3B372F', MUTED = '#7A7264', SEAL = '#A8361F';
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const BOD = '"Bodoni Moda", Didot, "Bodoni 72", Georgia, serif', COR = '"Cormorant Garamond", Georgia, serif', KR = '"Noto Serif KR", serif', SANS = '"IBM Plex Sans KR", system-ui, sans-serif';
  try { await Promise.all([`500 30px ${BOD}`, `italic 400 30px ${COR}`, `600 30px ${KR}`, `400 30px ${KR}`, `500 20px ${SANS}`].map(f => document.fonts.load(f, 'Q가'))); } catch {}
  const spaced = (str, px, py, gap, align = 'left') => {
    const widths = [...str].map(ch => x.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (str.length - 1);
    let cx = align === 'right' ? px - total : align === 'center' ? px - total / 2 : px;
    x.textAlign = 'left'; [...str].forEach((ch, i) => { x.fillText(ch, cx, py); cx += widths[i] + gap; });
  };
  const wrap = (str, maxW, maxLines) => {
    const words = String(str).split(/\s+/), lines = []; let cur = '';
    for (const wd of words) { const tryL = cur ? cur + ' ' + wd : wd; if (x.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tryL; }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines.length = maxLines; let l = lines[maxLines - 1]; while (l && x.measureText(l + '…').width > maxW) l = l.slice(0, -1); lines[maxLines - 1] = l.trim() + '…'; }
    return lines;
  };
  x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
  // masthead: Didone Q + wordmark | Daily Art
  x.save(); x.translate(M - 4, 52); x.scale(1.5, 1.5); x.fillStyle = INK;
  x.fill(new Path2D('M20 4C12.5 4 6.5 10.7 6.5 19S12.5 34 20 34 33.5 27.3 33.5 19 27.5 4 20 4Zm0 .7c-5.4 0-9.9 6.4-9.9 14.3S14.6 33.3 20 33.3 29.9 26.9 29.9 19 25.4 4.7 20 4.7Z'), 'evenodd');
  x.fill(new Path2D('M18.4 31.3c4.3-.6 9.6 1.6 17.1 6.8l-.6.8c-7-4.5-12-6.5-16.3-6.3Z')); x.restore();
  x.fillStyle = INK; x.font = `500 27px ${BOD}`; x.textBaseline = 'alphabetic'; spaced('QURATOR', M + 64, 92, 9);
  x.fillStyle = MUTED; x.font = `500 17px ${SANS}`; spaced('DAILY ART', W - M, 90, 5, 'right');
  x.fillStyle = 'rgba(22,20,15,.16)'; x.fillRect(M, 128, W - 2 * M, 1);
  // artwork, contained in a soft mat
  const fx = M, fy = 160, fw = W - 2 * M, fh = 760;
  x.fillStyle = '#EAE4D7'; x.fillRect(fx, fy, fw, fh);
  let im = null; try { im = await loadCorsImage(await curatedImage(w, 1200)); } catch {}
  let ok = false;
  if (im && im.naturalWidth) {
    const pad = 28, s = Math.min((fw - pad * 2) / im.naturalWidth, (fh - pad * 2) / im.naturalHeight);
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    x.save(); x.shadowColor = 'rgba(22,20,15,.22)'; x.shadowBlur = 28; x.shadowOffsetY = 10;
    x.drawImage(im, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh); x.restore();
    try { x.getImageData(0, 0, 1, 1); ok = true; } catch { ok = false; }
    if (!ok) { x.fillStyle = '#EAE4D7'; x.fillRect(fx, fy, fw, fh); }
  }
  if (!ok) {
    x.fillStyle = 'rgba(22,20,15,.38)'; x.font = `italic 400 64px ${COR}`; x.textAlign = 'center';
    wrap(w.title.en, fw - 160, 3).forEach((l, i, a) => x.fillText(l, W / 2, fy + fh / 2 - (a.length - 1) * 38 + i * 76));
    x.textAlign = 'left';
  }
  // label
  let y = fy + fh + 74;
  const isKo = lang === 'ko';
  x.fillStyle = INK; x.font = isKo ? `600 50px ${KR}` : `500 54px ${BOD}`;
  wrap(w.title[lang], fw, 2).forEach(l => { x.fillText(l, M, y); y += 62; });
  y -= 8;
  x.fillStyle = MUTED; x.font = `italic 400 30px ${COR}`;
  if (isKo) { x.fillText(wrap(w.title.en, fw, 1)[0], M, y); y += 44; }
  x.fillStyle = INK2; x.font = `400 24px ${isKo ? KR : COR}`;
  x.fillText(wrap(`${w.artist[lang]}  ·  ${w.date}`, fw, 1)[0], M, y); y += 34;
  if (w.tagline && y < 1180) {
    x.font = isKo ? `400 25px ${KR}` : `italic 400 30px ${COR}`;
    const tl = wrap(w.tagline[lang], fw - 26, y < 1150 ? 2 : 1);
    x.fillStyle = SEAL; x.fillRect(M, y + 8, 2, tl.length * 38 - 6);
    x.fillStyle = INK2; tl.forEach((l, i) => x.fillText(l, M + 22, y + 34 + i * 38));
  }
  // footer
  x.fillStyle = 'rgba(22,20,15,.16)'; x.fillRect(M, H - 104, W - 2 * M, 1);
  x.fillStyle = INK; x.font = `400 20px ${KR}`; x.textAlign = 'left';
  x.fillText(isKo ? '매일 아침 명작 세 점 — QURATOR Daily Art' : 'Three masterpieces every morning — QURATOR Daily Art', M, H - 58);
  x.fillStyle = MUTED; x.font = `500 15px ${SANS}`; spaced(((location.host + location.pathname).replace(/\/(index\.html)?$/, '') || 'QURATOR').toUpperCase(), W - M, H - 58, 2, 'right');
  return c;
}
async function saveCard(w) {
  const c = await drawCard(w, S.lang === 'en' ? 'en' : 'ko');
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const name = `qurator-${w.id}.png`;
  if (!blob) { window.open(c.toDataURL('image/png'), '_blank'); return; }
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare && matchMedia('(pointer:coarse)').matches && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: pick(w.title) }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast(t('v_card_ok'));
}

/* ---------------- features (editorial lists) ---------------- */
let FEATURES = null;
async function loadFeatures() {
  if (FEATURES) return FEATURES;
  try { FEATURES = await getJSON('data/features.json', { cache: 'no-cache' }); } catch { FEATURES = []; }
  return FEATURES;
}
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
function featCover(f, cls = '') {
  const imgs = (f.cover && f.cover.length ? f.cover : f.sections.flatMap(s => s.items).filter(i => i.img).map(i => i.img)).slice(0, 4);
  return `<div class="ft-cover ${cls} n${imgs.length}">${imgs.map(src => `<div class="art" data-src="${esc(src)}"><span class="ph"></span></div>`).join('')}</div>`;
}
async function viewFeatures() {
  app().innerHTML = `<div class="wrap"><div class="empty"><span class="spinner"></span></div></div>`;
  const list = await loadFeatures();
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow">Éditions · Features</p><h1>${t('ft_h')}</h1><p>${t('ft_p')}</p></div></section>
    <div class="wrap ft-list">${list.length ? list.map(f => {
      const n = f.sections.reduce((a, s) => a + s.items.length, 0);
      return `<a class="ft-card rv" href="#/features/${esc(f.id)}">${featCover(f)}
        <div class="ft-meta"><p class="eyebrow">${esc(pick(f.kicker))} · ${S.lang === 'en' ? `${t('ft_asof')} ${esc(f.asof)}` : `${esc(f.asof)} ${t('ft_asof')}`}</p><h2>${esc(pick(f.title))}</h2><p>${esc(pick(f.dek))}</p>
        <span class="link">${t('ft_read')} · ${n}${S.lang === 'ko' ? t('ft_works') : ' ' + t('ft_works')} <span class="arrow">→</span></span></div></a>`;
    }).join('') : `<div class="empty">${S.lang === 'ko' ? '첫 특집을 준비하고 있습니다.' : 'Our first feature is on its way.'}</div>`}</div>`;
  hydrate(); reveal();
}
async function viewFeature(id) {
  app().innerHTML = `<div class="wrap"><div class="empty"><span class="spinner"></span></div></div>`;
  const list = await loadFeatures(), f = list.find(x => x.id === id);
  if (!f) { viewFeatures(); return; }
  let k = 0;
  const item = it => {
    k++;
    const src = it.img || (it.pd && it.commons ? `https://commons.wikimedia.org/wiki/Special:FilePath/${enc(it.commons)}?width=1200` : '');
    const type = `<span class="ft-type-a">${esc(pick(it.artist))}</span><span class="ft-type-t">${esc(pick(it.title))}</span><span class="ft-type-y">${esc(it.year || '')}</span>${it.pd ? '' : '<small>©</small>'}`;
    // typographic card always underneath; a verified image fades in on top, and if it fails to load the card stays
    const img = `<div class="ft-art ft-type">${type}${src ? `<div class="art ft-img" data-src="${esc(src)}"></div>` : ''}</div>`;
    return `<article class="ft-item rv" id="w${k}">
      <div class="ft-num">${String(k).padStart(2, '0')}</div>
      <div class="ft-fig">${img}${it.imgCredit ? `<a class="ft-credit" href="${esc(it.imgCredit.url)}" target="_blank" rel="noopener">${esc(it.imgCredit.text)}</a>` : ''}${it.pd === false ? `<p class="ft-crnote">${t('ft_cr')}</p>` : ''}</div>
      <div class="ft-body">
        ${it.record ? `<p class="ft-record">${esc(pick(it.record))}</p>` : ''}
        <h3>${esc(pick(it.title))}</h3>
        <p class="ft-by">${esc(pick(it.artist))}${it.year ? ', ' + esc(it.year) : ''}${it.medium ? ` · <span>${esc(pick(it.medium))}</span>` : ''}</p>
        <p class="ft-head">${esc(pick(it.headline))}</p>
        <p class="ft-why">${esc(pick(it.why))}</p>
        ${it.sources && it.sources.length ? `<p class="ft-src">${t('ft_src')} · ${it.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>` : ''}
      </div></article>`;
  };
  app().innerHTML = `<header class="ft-hero">${featCover(f, 'big')}<div class="ft-hero-shade"></div>
      <div class="wrap ft-hero-in"><p class="eyebrow">${esc(pick(f.kicker))} · ${S.lang === 'en' ? `${t('ft_asof')} ${esc(f.asof)}` : `${esc(f.asof)} ${t('ft_asof')}`}</p><h1>${esc(pick(f.title))}</h1><p>${esc(pick(f.dek))}</p></div></header>
    <div class="wrap ft-wrap">
      <div class="ft-intro rv">${pick(f.intro).split('\n').map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <nav class="ft-toc rv"><p class="eyebrow">${t('ft_toc')}</p>${f.sections.map((s, i) => `<a href="javascript:void 0" data-sec="${i}"><span>${ROMAN[i]}</span>${esc(pick(s.title))}<em>${s.items.length}</em></a>`).join('')}</nav>
      ${f.sections.map((s, i) => `<section class="ft-sec" id="sec${i}"><div class="ft-sec-h rv"><span>${ROMAN[i]}</span><div><h2>${esc(pick(s.title))}</h2>${s.dek ? `<p>${esc(pick(s.dek))}</p>` : ''}</div></div>${s.items.map(item).join('')}</section>`).join('')}
      ${f.note ? `<p class="note ft-note">${esc(pick(f.note))}</p>` : ''}
      <div class="ft-end rv"><a class="btn btn-ink" href="#/today">${t('cta_today')} <span class="arrow">→</span></a><a class="btn btn-line" href="#/features">${t('ft_more')}</a></div>
    </div>`;
  $$('.ft-toc a').forEach(a => a.onclick = () => { const el = document.getElementById('sec' + a.dataset.sec); if (el) el.scrollIntoView({ behavior: 'smooth' }); });
  hydrate(); reveal();
}

/* ---------------- for galleries (B2B sales page, printable as a brochure) ---------------- */
const GAL = {
  ko: {
    eyebrow: 'For galleries · 갤러리 도입 안내', h: '관람객의 휴대폰이<br>당신의 <em>도슨트</em>가 됩니다.',
    lead: '작품 옆 캡션에 QR 하나. 앱도, 장비도, 상주 인력도 없이 모든 작품에 해설·음성·영어 안내가 붙습니다. 해설 원고는 미술사를 전공하고 20회 넘는 전시를 직접 열어 온 운영진이 쓰고 감수합니다.',
    why: '왜 QR 도슨트인가', whyItems: [
      ['작품 앞에 더 오래', '캡션 한 줄로 끝나던 감상이 작품의 배경, 기법, 감상 포인트까지 이어집니다.'],
      ['외국인 관람객까지', '한국어와 영어 해설이 기본입니다. 영어 해설은 자연스러운 녹음 음성으로 들려 드립니다.'],
      ['설치는 인쇄 한 번', '앱 설치도, 오디오 가이드 기기 대여도 필요 없습니다. 인쇄한 캡션을 붙이면 끝입니다.'],
      ['전시가 끝나도 남는 기록', '전시 링크 하나로 작품 목록과 해설이 온라인에 남아 홍보와 아카이브로 이어집니다.']],
    steps: '진행 순서', stepItems: [
      ['상담', '카카오톡으로 전시 일정과 작품 목록(작품명·작가·연도·이미지)을 보내 주세요.'],
      ['해설 작성', '작품별 해설을 작성해 검토용 링크로 보내 드립니다. 수정 요청을 반영합니다.'],
      ['캡션 인쇄', '작품명·작가·연도와 QR이 들어간 캡션(명제표) A4 인쇄 파일과 입구용 전시 안내 QR을 드립니다.'],
      ['전시 운영', '관람객은 카메라로 QR을 찍기만 하면 됩니다. 전시 기간 동안 해설 수정도 바로 반영됩니다.']],
    sample: '실제 캡션과 해설 화면', sampleP: '위 캡션의 QR을 휴대폰 카메라로 찍어 보세요. 관람객이 보게 될 해설 화면이 열립니다.',
    plans: '요금', who: '운영진', whoP: '미술사를 전공했고, 20회가 넘는 전시를 직접 열거나 기획에 참여해 왔습니다. 전시를 여는 쪽의 사정을 알기에, 일정과 예산에 맞춰 함께 준비합니다.',
    faq: '자주 묻는 질문', faqItems: [
      ['작품 이미지는 어떻게 하나요?', '갤러리가 보유한 작품 이미지를 받아 해설 화면에 사용합니다. 이미지 없이 해설만 운영할 수도 있습니다.'],
      ['해설을 우리가 직접 써도 되나요?', '네. QR 스튜디오에서 직접 등록하고 수정할 수 있습니다. 원고 작성까지 맡기려면 Premium을 선택하세요.'],
      ['인터넷이 안 되는 공간이면요?', '관람객 휴대폰의 모바일 데이터로 열리므로 갤러리 와이파이가 없어도 됩니다.'],
      ['전시가 끝나면 링크는 어떻게 되나요?', '전시 기간 동안 운영하며, 이후 보관 여부는 상담으로 정합니다.']],
    cta: '도입 상담하기', print: '소개서 PDF로 저장', back: '요금 자세히 보기'
  },
  en: {
    eyebrow: 'For galleries', h: 'Every visitor\'s phone<br>becomes your <em>docent.</em>',
    lead: 'One QR on each caption card. No app, no hardware, no extra staff: every work gets interpretation, audio and an English guide. Texts are written and reviewed by a team trained in art history that has opened more than twenty exhibitions.',
    why: 'Why a QR docent', whyItems: [
      ['Longer looking', 'A one-line caption becomes the story, technique and what to look for.'],
      ['Ready for international visitors', 'Korean and English as standard, with natural recorded English narration.'],
      ['Set up by printing', 'No app downloads, no audio-guide rentals. Print the captions and you are done.'],
      ['A record that lasts', 'One exhibition link keeps the works and texts online for promotion and archive.']],
    steps: 'How it works', stepItems: [
      ['Talk to us', 'Send your dates and list of works (title, artist, year, image) on KakaoTalk.'],
      ['We write', 'We draft a text per work and send a review link; your edits are applied.'],
      ['Print', 'You receive A4 caption files with QR codes and an entrance QR for the whole show.'],
      ['Open the show', 'Visitors just point their camera. Edits during the show go live immediately.']],
    sample: 'A real caption and guide', sampleP: 'Scan the QR on the caption above with your phone camera to open the page your visitors will see.',
    plans: 'Pricing', who: 'Who we are', whoP: 'We trained in art history and have opened or helped organize more than twenty exhibitions. We know the organizer\'s side, so we prepare everything around your schedule and budget.',
    faq: 'FAQ', faqItems: [
      ['What about artwork images?', 'We use the images you provide; you can also run texts without images.'],
      ['Can we write the texts ourselves?', 'Yes, in QR Studio. Choose Premium if you want us to write them.'],
      ['What if the space has no Wi-Fi?', 'Pages open on visitors\' mobile data; gallery Wi-Fi is not required.'],
      ['What happens after the show?', 'The guide runs for the exhibition period; archiving afterwards is agreed with you.']],
    cta: 'Talk to us', print: 'Save as PDF brochure', back: 'See pricing'
  }
};
function viewGalleries() {
  const g = GAL[S.lang] || GAL.ko, w = S.byId['k-sehando'] || S.works[0];
  app().innerHTML = `<section class="gal-hero"><div class="wrap gal-hero-in">
      <div class="rv"><p class="eyebrow">${g.eyebrow}</p><h1>${g.h}</h1><p class="lead">${esc(g.lead)}</p>
        <div class="hero-ctas"><a class="btn btn-kakao" href="${KAKAO}" target="_blank" rel="noopener">${g.cta} <span class="arrow">→</span></a><button class="btn btn-line" id="galPrint">⎙ ${g.print}</button></div></div>
      <div class="gal-sample rv">
        <div class="label gal-label"><div><div class="lt">${esc(w.title.ko)}</div><div class="le">${esc(w.title.en)}</div>
          <div class="la">${esc(S.lang === 'ko' ? w.artist.ko : w.artist.en)}, ${esc(w.date)}</div><div class="lm">${esc(pick(w.medium))}</div></div>
          <div class="lq" id="galQr"></div><div class="ls"><span>Scan · 음성 해설 · Audio guide</span><span>01</span></div></div>
        <p class="note">${esc(g.sampleP)}</p></div>
    </div></section>
    <div class="wrap gal">
      <section class="gal-sec rv"><h2>${g.why}</h2><div class="gal-grid">${g.whyItems.map(([h, p], i) => `<div class="gal-cell"><span>${String(i + 1).padStart(2, '0')}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div></section>
      <section class="gal-sec rv"><h2>${g.steps}</h2><ol class="gal-steps">${g.stepItems.map(([h, p]) => `<li><b>${esc(h)}</b><p>${esc(p)}</p></li>`).join('')}</ol></section>
      <section class="gal-sec rv gal-plans"><h2>${g.plans}</h2>
        <div class="gal-grid">${[['pl2', '₩300,000', t('per_show')], ['pl3', '₩1,000,000', t('per_show')], ['pl4', '₩99,000', t('per_month')]].map(([k, a, per]) => `<div class="gal-cell"><h3>${t(k)}</h3><div class="gal-amt">${a}<small> ${per}</small></div><ul>${T[k + 'l'][L()].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div></section>
      <section class="gal-sec rv gal-who"><h2>${g.who}</h2><p>${esc(g.whoP)}</p><div class="facts"><div class="fact"><b>20+</b><span>${t('fa1')}</span></div><div class="fact"><b>KO·EN</b><span>${t('fa2')}</span></div><div class="fact"><b>QR</b><span>${S.lang === 'ko' ? '앱 설치 없음' : 'No app needed'}</span></div></div>${giveNote()}</section>
      <section class="gal-sec rv"><h2>${g.faq}</h2><div class="faq">${g.faqItems.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>
      <section class="gal-end rv"><h2>${S.lang === 'ko' ? '다음 전시, 관람객의 휴대폰을 도슨트로.' : 'Make every visitor\'s phone your docent.'}</h2>
        <div class="hero-ctas"><a class="btn btn-kakao" href="${KAKAO}" target="_blank" rel="noopener">${g.cta} <span class="arrow">→</span></a><a class="btn btn-line" href="#/pricing">${g.back}</a></div>
        <p class="note gal-contact">QURATOR · ${S.lang === 'ko' ? '카카오톡 오픈채팅' : 'KakaoTalk open chat'} open.kakao.com/o/gQLZj9Ti · probe2928-crypto.github.io/qurator</p></section>
    </div>`;
  makeQR($('#galQr'), BASE() + '#/w/' + w.id, 192);
  $('#galPrint').onclick = () => { $$('.rv').forEach(e => e.classList.add('in')); $$('.faq details').forEach(d => d.open = true); setTimeout(() => window.print(), 150); };
  reveal();
}

/* ---------------- brand ---------------- */
const LOGO_MARK = '<svg class="mono" viewBox="0 0 40 40" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M20 4C12.5 4 6.5 10.7 6.5 19S12.5 34 20 34 33.5 27.3 33.5 19 27.5 4 20 4Zm0 .7c-5.4 0-9.9 6.4-9.9 14.3S14.6 33.3 20 33.3 29.9 26.9 29.9 19 25.4 4.7 20 4.7Z"/><path fill="currentColor" d="M18.4 31.3c4.3-.6 9.6 1.6 17.1 6.8l-.6.8c-7-4.5-12-6.5-16.3-6.3Z"/></svg>';

/* ---------------- membership ---------------- */
/* Subscribers get a signed link #/m/<token> from the private ledger (주문·멤버 장부).
   token = base64url(payload[7] + ECDSA P-256 signature[64]); payload = [key id][expiry: days since 2026-01-01, uint16][order id: 4 bytes].
   Valid through its expiry date (KST). Only the public key lives here, so links cannot be forged.
   Short codes (Play review, beta) live in data/members.json as SHA-256 hashes with an expiry; `revoked` lists token order ids. */
const MEMBER_KEYS = { 1: { kty: 'EC', crv: 'P-256', x: 'c1226lJ2JFkwl9Q3aLm8YxDmLKrR1tAUuXbxZ2L2-OA', y: 'k6iyUgGe_6sKxJkNN9bo9isswcl3Ds44qd_1FscnrQo' } };
const M_EPOCH = Date.UTC(2026, 0, 1);
const b64uBytes = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const hex = a => [...a].map(b => b.toString(16).padStart(2, '0')).join('');
async function verifyToken(tok) {
  try {
    const raw = b64uBytes(tok), jwk = MEMBER_KEYS[raw[0]];
    if (raw.length !== 71 || !jwk || !crypto.subtle) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    if (!await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, raw.slice(7), raw.slice(0, 7))) return null;
    return { exp: new Date(M_EPOCH + ((raw[1] << 8) | raw[2]) * 864e5).toISOString().slice(0, 10), id: hex(raw.slice(3, 7)) };
  } catch { return null; }
}
let membersFile = null;
const membersData = async () => membersFile || (membersFile = await getJSON('data/members.json', { cache: 'no-cache' }).catch(() => ({ codes: [], revoked: [] })));
// { exp } valid today · { exp, expired: true } past its date · null unknown
async function codeStatus(input) {
  let code = String(input || '').trim();
  const link = code.match(/#\/m\/([A-Za-z0-9_-]+)/); if (link) code = link[1];
  if (!code) return null;
  const m = await membersData();
  let r = null;
  if (code.length > 40) { r = await verifyToken(code); if (r && (m.revoked || []).includes(r.id)) r = null; }
  else if (crypto.subtle) {
    const h = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.toUpperCase()))));
    const c = (m.codes || []).find(x => x.h === h); if (c) r = { exp: c.exp };
  }
  if (!r) return null;
  return r.exp >= seoulDate() ? r : { ...r, expired: true };
}
async function checkCode(code) {
  if (!code) return false;
  if (PAY.apiBase) {
    try { const r = await getJSON(PAY.apiBase + '/member/verify?code=' + enc(code)); if (r.active) return { exp: r.until || '' }; } catch {}
  }
  const st = await codeStatus(code);
  return st && !st.expired ? st : false;
}
function activateMember(code, exp = '') {
  const link = String(code).match(/#\/m\/([A-Za-z0-9_-]+)/); if (link) code = link[1];
  S.member = true; S.memberExp = exp; S.memberEnded = '';
  store.set('q_member', true); store.set('q_code', code); store.set('q_exp', exp);
}
async function recheckMember() {
  const code = store.get('q_code', '');
  if (!code) { S.member = false; store.set('q_member', false); return; }
  const st = await checkCode(code);
  if (st) { S.member = true; S.memberExp = st.exp || ''; store.set('q_member', true); store.set('q_exp', S.memberExp); return; }
  const past = await codeStatus(code);
  S.member = false; store.set('q_member', false);
  S.memberEnded = past && past.expired ? past.exp : '';
  if (!past) store.set('q_code', '');
}
const daysLeft = d => Math.round((Date.parse(d) - Date.parse(seoulDate())) / 864e5);
function memberBar() {
  if (IOS) return '';
  if (S.member) {
    const n = S.memberExp ? daysLeft(S.memberExp) : null, soon = n !== null && n <= 5;
    return `<div class="member-bar${soon ? ' soon' : ''}"><span>● ${t('member_on')}${S.memberExp ? ` <em>${esc(t('m_until').replace('{d}', S.memberExp))} · D-${Math.max(n, 0)}</em>` : ''}</span>
      ${soon ? (PLAY ? `<span class="mb-note">${t('m_renew_play')}</span>` : `<a class="link" href="#/checkout">${t('m_renew')} →</a>`) : `<a class="link" href="#/archive">${t('archive')} →</a>`}</div>`;
  }
  if (S.memberEnded) return `<div class="member-bar ended"><span>${esc(t('m_ended').replace('{d}', S.memberEnded))}</span>${PLAY ? `<span class="mb-note">${t('m_renew_play')}</span>` : `<a class="link" href="#/checkout">${t('m_renew')} →</a>`}</div>`;
  return '';
}
async function viewMemberLink(tok) {
  const st = await codeStatus(tok);
  const box = (h, p, acts) => { app().innerHTML = `<section class="phead"><div class="wrap co-done"><p class="eyebrow">Daily Art Membership</p><h1>${h}</h1><p>${p}</p><div class="co-acts">${acts}</div></div></section>`; };
  if (st && !st.expired) {
    activateMember(tok, st.exp);
    history.replaceState(null, '', location.pathname + location.search + '#/today');
    box(t('ml_ok_h'), esc(t('ml_ok_p').replace('{d}', st.exp)), `<a class="btn btn-ink" href="#/today">${t('nav_today')} →</a>`);
  } else if (st) {
    box(t('ml_exp_h'), esc(t('ml_exp_p').replace('{d}', st.exp)), PLAY ? `<span class="note">${t('m_renew_play')}</span>` : `<a class="btn btn-ink" href="#/checkout">${t('m_renew')} →</a><a class="btn btn-kakao" href="${KAKAO}" target="_blank" rel="noopener">${t('co_open')}</a>`);
  } else {
    box(t('ml_bad_h'), esc(t('ml_bad_p')), `<a class="btn btn-kakao" href="${KAKAO}" target="_blank" rel="noopener">${t('co_open')}</a>`);
  }
}

/* ---------------- support / CS ---------------- */
const FAQ = [
  ['오늘의 작품은 언제 올라오나요?', 'When do the daily works arrive?', '매일 아침(한국 시간) 세 점이 새로 올라옵니다. 첫 번째 작품은 누구나 무료로 볼 수 있고, 나머지 두 점과 아카이브는 멤버에게 열립니다.', 'Three new works go up every morning, Korea time. The first is free for everyone; the other two and the archive are for members.'],
  ['앱을 설치해야 하나요?', 'Do I need to install an app?', '아니요. 브라우저에서 바로 열립니다. 오늘의 작품 페이지에서 홈 화면에 추가하면 앱처럼 쓸 수 있습니다.', 'No. It runs in your browser. Add it to your home screen from the Daily Art page to use it like an app.'],
  ['결제는 어떻게 하나요?', 'How do I pay?', '구독 신청 페이지에서 계좌이체를 선택하면 입금 계좌가 바로 안내됩니다. 입금 후 카카오톡으로 주문번호를 보내 주시면 확인 후 멤버 링크를 보내 드립니다. 카드 자동결제(토스페이먼츠)는 곧 열립니다.', 'Choose bank transfer on the checkout page to see our account details; send your order number on KakaoTalk after paying and we will send your member link. Card billing via Toss Payments opens soon.'],
  ['멤버 코드는 어디에 입력하나요?', 'Where do I enter my member code?', '입금이 확인되면 카카오톡으로 멤버 링크를 보내 드립니다. 링크를 누르면 바로 열리고, 화면에 이용 기간(만료일)이 표시됩니다. 다른 기기에서는 같은 링크를 한 번 더 누르면 됩니다. 링크를 열기 어려우면 구독 버튼 아래 입력칸에 링크를 붙여 넣어도 됩니다. 만료 5일 전부터 연장 안내가 나옵니다.', 'Once your payment is confirmed we send a member link on KakaoTalk. Open it and everything unlocks, with your end date shown. On another device, open the same link again, or paste it into the field under Subscribe. A renewal reminder appears 5 days before the end date.'],
  ['해지는 어떻게 하나요?', 'How do I cancel?', '카카오톡으로 해지를 요청하시면 다음 결제일부터 청구되지 않으며, 이미 결제한 기간이 끝날 때까지 계속 이용하실 수 있습니다.', 'Message us on KakaoTalk. You will not be billed again and keep access until the end of the paid period.'],
  ['환불되나요?', 'Can I get a refund?', '결제 후 7일 이내이고 멤버 전용 해설을 열람하지 않았다면 전액 환불됩니다. 자세한 기준은 환불·해지 규정을 확인해 주세요.', 'Within 7 days of payment, if you have not opened member content, you get a full refund. See the Refund & Cancellation policy for details.'],
  ['수익금 기부는 어떻게 이루어지나요?', 'How does the giving work?', 'QURATOR는 Daily Art 구독과 갤러리 프로젝트 수익의 일부를 오리엘 재단에 기부합니다. 재단은 지금 비영리 등록을 준비 중이며, 등록 후 첫 기부를 보내고 날짜와 금액을 나눔 페이지와 재단 공개 장부에 공개합니다. 구독료 자체는 기부금이 아니어서 세액공제 대상이 아닙니다.', 'QURATOR gives a share of its subscription and gallery revenue to Oriel Foundation. The foundation is preparing its nonprofit registration; the first gift goes out after that, with its date and amount published on our Giving page and in the foundation\'s public ledger. Fees themselves are not donations and are not tax-deductible.'],
  ['갤러리 도입은 어떻게 진행되나요?', 'How does a gallery project work?', '카카오톡으로 전시 일정과 작품 목록을 보내 주시면 견적을 드립니다. 해설 작성(Premium)부터 QR 캡션 인쇄 파일, 전시 입구 QR까지 한 번에 준비됩니다.', 'Send your dates and list of works on KakaoTalk for a quote. We prepare texts (Premium), QR caption files and an entrance QR.'],
  ['갤러리가 해설을 직접 수정할 수 있나요?', 'Can a gallery edit the texts itself?', '네. QR 스튜디오에서 작품과 해설을 직접 등록하고 캡션을 바로 인쇄할 수 있습니다.', 'Yes. Add works and texts in QR Studio and print captions immediately.']
];
/* ---------------- giving ---------------- */
const giveUrl = () => S.lang === 'ko' ? GIVE.urlKo : GIVE.url;
function giveNote(extra = '') {
  return `<p class="give-note ${extra}">${BRICK}<span>${esc(t('gv_short'))} <a href="#/giving">${t('gv_more')} →</a></span></p>`;
}
function giveBand() {
  return `<section class="give-band"><div class="wrap give-band-in">
    <div class="rv"><p class="eyebrow">${BRICK}<span>${t('gv_eyebrow')}</span></p><h2>${t('gv_band_h')}</h2></div>
    <div class="rv"><p>${esc(t('gv_short'))}</p><p class="give-status">${esc(t('gv_status'))}</p>
      <a class="link" href="#/giving">${t('gv_more')} <span class="arrow">→</span></a></div>
  </div></section>`;
}
async function viewGiving() {
  const k = L();
  let log = [];
  try { log = await getJSON('data/giving.json', { cache: 'no-cache' }); } catch {}
  const cols = T.gv_log_cols[k];
  app().innerHTML = `<section class="give-hero"><div class="wrap give-hero-in">
      <div class="rv"><p class="eyebrow">${BRICK}<span>${t('gv_eyebrow')}</span></p><h1>${t('gv_h')}</h1><p class="lead">${esc(t('gv_lead'))}</p>
        <div class="hero-ctas"><a class="btn btn-ink" href="${giveUrl()}" target="_blank" rel="noopener">${t('gv_visit')} <span class="arrow">↗</span></a></div></div>
      <figure class="give-mark rv" aria-hidden="true"><svg viewBox="40 30 160 210">
        <path d="M88 112 V88 A32 32 0 0 1 120 56 V112 Z" fill="#B8862D"/>
        <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="square">
          <path d="M72 196 V88 A48 48 0 0 1 168 88 V196"/><path d="M88 196 V88 A32 32 0 0 1 152 88 V196 Z"/>
          <path d="M120 56 V196 M88 112 H152 M88 154 H152"/>
          <path d="M62 196 H178 M66 204 H174"/><path d="M76 204 L120 232 L164 204"/><path d="M96 216 H144"/>
        </g></svg>
        <figcaption>${S.lang === 'ko' ? '배움에는 빛을, 기부에는 창을.' : 'Light for learning. Glass for giving.'}</figcaption></figure>
    </div></section>
    <div class="wrap give">
      <section class="give-sec rv"><h2>${t('gv_how')}</h2><div class="gal-grid">${T.gv_how_l[k].map(([h, p], i) => `<div class="gal-cell"><span>${String(i + 1).padStart(2, '0')}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div></section>
      <section class="give-sec rv give-why"><h2>${t('gv_why')}</h2><p>${esc(t('gv_why_p'))}</p></section>
      <section class="give-sec rv"><h2>${t('gv_plan')}</h2><ol class="give-phases">${T.gv_phases[k].map(([when, h, p], i) => `<li class="${i === 0 ? 'now' : ''}"><span class="when">${esc(when)}${i === 0 ? ` · <b>${t('gv_now')}</b>` : ''}</span><b>${esc(h)}</b><p>${esc(p)}</p></li>`).join('')}</ol>
        <p class="give-status">${esc(t('gv_status'))}</p></section>
      <section class="give-sec rv"><h2>${t('gv_log')}</h2>${log.length ? `<table class="give-log"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${log.map(r => `<tr><td>${esc(r.date)}</td><td>${esc(r.amount)}</td><td>${esc(pick(r.note || { ko: '', en: '' }))}${r.proof ? ` <a href="${esc(r.proof)}" target="_blank" rel="noopener">↗</a>` : ''}</td></tr>`).join('')}</tbody></table>` : `<p class="give-empty">${t('gv_log_empty')}</p>`}</section>
      <p class="give-fine">${esc(t('gv_fine'))}</p>
    </div>`;
  reveal();
}

const FAQ_PLAY = [
  ['멤버십은 어떻게 이용하나요?', 'How does membership work?', 'Daily Art 멤버십은 QURATOR 웹사이트에서 신청할 수 있습니다. 받은 멤버 링크를 누르거나, 앱의 \'멤버 코드로 열기\'에 링크나 코드를 붙여 넣으면 이용 기간 동안 열람됩니다.', 'Daily Art membership is available on the QURATOR website. Open the member link you received, or paste the link or code into "Unlock with member code", and everything stays open for your membership period.']
];
function viewSupport() {
  const k = L();
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow">Service client</p><h1>${t('sp_h')}</h1><p>${t(IOS ? 'sp_p_ios' : 'sp_p')}</p></div></section>
  <div class="wrap support">
    <a class="kakao-card" href="${KAKAO}" target="_blank" rel="noopener">
      <span class="kk-ico"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3.5c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.9 3.4c-.1.3.3.5.5.3l4-2.7c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.1-9-7.1Z"/></svg></span>
      <span class="kk-t"><b>${t('sp_kakao')}</b><small>${t('sp_kakao_s')}</small></span><span class="arrow">→</span></a>
    <div class="sp-grid">
      ${[['구독 신청 · 결제', 'Subscribe & billing', '#/checkout'], ['해지 · 환불', 'Cancel & refund', '#/policy/refund'], ['갤러리 도입 상담', 'Gallery projects', KAKAO], ['멤버 코드 입력', 'Enter member code', 'code'], ['나눔 · 오리엘 재단', 'Giving · Oriel Foundation', '#/giving']].filter(c => !(PLAY && (c[2] === '#/checkout' || c[2] === KAKAO)) && !(IOS && (c[2] === 'code' || c[2] === '#/policy/refund'))).map(([a, b, h]) =>
        h === 'code' ? `<button class="sp-cell" data-act="subscribe"><span>${k ? b : a}</span><i>→</i></button>` :
        `<a class="sp-cell" href="${h}" ${h.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}><span>${k ? b : a}</span><i>→</i></a>`).join('')}
    </div>
    <h2 class="sp-h">${t('sp_faq')}</h2>
    <div class="faq">${(IOS ? FAQ.filter(f => !/결제|구독|멤버|환불|해지|요금|가격|앱을 설치|갤러리 도입|갤러리가/.test(f[0])) : PLAY ? FAQ_PLAY.concat(FAQ.filter(f => !/결제는|앱을 설치|갤러리 도입|갤러리가/.test(f[0]))) : FAQ).map(f => `<details><summary>${esc(f[k])}</summary><p>${esc(f[2 + k])}</p></details>`).join('')}</div>
    <h2 class="sp-h">${t('sp_docs')}</h2>
    <div class="sp-grid"><a class="sp-cell" href="#/policy/terms"><span>${t('terms')}</span><i>→</i></a><a class="sp-cell" href="#/policy/privacy"><span>${t('privacy')}</span><i>→</i></a>${IOS ? '' : `<a class="sp-cell" href="#/policy/refund"><span>${t('refund')}</span><i>→</i></a>`}</div>
  </div>`;
}

/* ---------------- policies (Korean text governs) ---------------- */
const POLICY = {
  terms: ['이용약관', [
    ['제1조 (목적)', '이 약관은 QURATOR(이하 "회사")가 제공하는 Daily Art 구독 서비스와 QR 도슨트 서비스(이하 "서비스")의 이용 조건과 절차, 회사와 이용자의 권리·의무를 정합니다.'],
    ['제2조 (서비스 내용)', 'Daily Art는 매일 선정된 미술 작품의 해설(영어·한국어), 음성 해설, 감상 포인트를 제공하는 월 구독 서비스입니다. QR 도슨트는 전시 작품별 해설 페이지와 QR 캡션 인쇄 파일을 제공하는 기업·기관용 서비스입니다.'],
    ['제3조 (구독과 결제)', 'Daily Art 구독료는 월 30,000원(부가세 포함)이며, 구독 신청 시 안내된 방법으로 결제합니다. 카드 자동결제를 선택한 경우 최초 결제일을 기준으로 매월 같은 날 자동 결제됩니다.'],
    ['제4조 (해지)', '이용자는 언제든 고객센터(카카오톡)를 통해 해지할 수 있으며, 해지 시 다음 결제일부터 요금이 청구되지 않고 이미 결제한 기간이 끝날 때까지 서비스를 이용할 수 있습니다.'],
    ['제5조 (청약철회 및 환불)', '청약철회와 환불은 「전자상거래 등에서의 소비자보호에 관한 법률」과 회사의 환불·해지 규정에 따릅니다.'],
    ['제6조 (콘텐츠의 권리)', '서비스에서 제공하는 해설 원고의 저작권은 회사에 있으며, 이용자는 개인적인 감상 목적 외에 복제·배포할 수 없습니다. 작품 이미지는 각 소장처와 위키미디어 커먼즈의 공개 라이선스에 따라 표시됩니다.'],
    ['제7조 (멤버 코드)', '멤버 코드는 구독자 본인만 사용할 수 있으며, 타인과 공유하거나 판매하는 경우 이용이 제한될 수 있습니다.'],
    ['제8조 (서비스 변경 및 중단)', '회사는 운영상·기술상 필요에 따라 서비스 내용을 변경할 수 있으며, 이용자에게 불리한 변경은 시행 7일 전까지 공지합니다.'],
    ['부칙', '이 약관은 2026년 11월 1일부터 시행합니다.']]],
  privacy: ['개인정보처리방침', [
    ['1. 수집하는 항목', '구독 신청 시 이름, 이메일 주소를 수집합니다. 카드 결제 정보는 결제대행사(토스페이먼츠)가 직접 처리하며 회사는 카드 번호를 저장하지 않습니다.'],
    ['2. 이용 목적', '구독 신청 확인, 멤버 코드 발송, 결제 및 정기결제 처리, 해지·환불 처리, 고객 문의 응대에 이용합니다.'],
    ['3. 보유 기간', '구독 해지 후 1년간 보관 후 파기합니다. 다만 전자상거래법에 따라 계약·결제 기록은 5년, 소비자 불만·분쟁 처리 기록은 3년간 보관합니다.'],
    ['4. 제3자 제공 및 위탁', '결제 처리를 위해 토스페이먼츠에 결제에 필요한 정보를 위탁하며, 그 외에는 이용자의 동의 없이 제3자에게 제공하지 않습니다.'],
    ['5. 브라우저 저장소', '언어 설정, 음성 속도, QR 스튜디오 작업 내용, 멤버 상태는 이용자 기기의 브라우저 저장소(localStorage)에만 저장되며 서버로 전송되지 않습니다.'],
    ['6. 이용자의 권리', '이용자는 언제든 고객센터(카카오톡)를 통해 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다.'],
    ['7. 개인정보 보호책임자', 'QURATOR 고객센터 (카카오톡 오픈채팅)'],
    ['부칙', '이 방침은 2026년 11월 1일부터 시행합니다.']]],
  refund: ['환불·해지 규정', [
    ['1. 해지', '언제든 카카오톡 고객센터로 해지를 요청할 수 있습니다. 해지하면 다음 결제일부터 청구되지 않으며, 이미 결제한 기간이 끝날 때까지 계속 이용할 수 있습니다.'],
    ['2. 7일 이내 전액 환불', '결제일로부터 7일 이내이고 멤버 전용 해설(오늘의 작품 두 번째·세 번째 작품, 아카이브)을 열람하지 않은 경우 전액 환불합니다.'],
    ['3. 열람 후 환불', '디지털 콘텐츠의 특성상 멤버 전용 해설을 열람한 이후에는 청약철회가 제한될 수 있습니다. 다만 서비스 장애 등 회사 사정으로 이용하지 못한 경우 이용하지 못한 기간만큼 환불합니다.'],
    ['4. 환불 방법', '카드 결제는 결제 취소로, 계좌이체는 이용자가 알려 준 계좌로 영업일 기준 3일 이내에 환불합니다.'],
    ['5. 갤러리·기관 상품', '전시 단위 상품은 해설 작성 착수 전에는 전액, 착수 후에는 작업 진행 정도에 따라 별도 협의한 계약 조건에 따릅니다.'],
    ['부칙', '이 규정은 2026년 11월 1일부터 시행합니다.']]]
};
function viewPolicy(kind) {
  const P = POLICY[kind] || POLICY.terms;
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow"><a href="#/support">${t('nav_support')}</a> / Policy</p><h1>${P[0]}</h1>
    ${S.lang === 'en' ? '<p>This policy is provided in Korean, and the Korean text governs. Contact us on KakaoTalk with any questions.</p>' : ''}</div></section>
    <div class="wrap policy">${P[1].map(([h, b]) => `<section><h3>${esc(h)}</h3><p>${esc(b)}</p></section>`).join('')}
    <p class="note">QURATOR · <a href="${KAKAO}" target="_blank" rel="noopener">${S.lang === 'ko' ? '카카오톡 고객센터' : 'KakaoTalk support'}</a></p></div>`;
}

/* ---------------- checkout ---------------- */
function loadScript(src) { return new Promise((res, rej) => { if ($$(`script[src="${src}"]`).length) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
const payBase = () => location.origin + location.pathname;
function viewCheckout() {
  const test = new URLSearchParams(location.hash.split('?')[1] || '').get('paytest') === '1' || store.get('q_paytest', false);
  if (test) store.set('q_paytest', true);
  const cardOn = PAY.live || test, n = L();
  // renewal: membership ends within 5 days or has ended → the order is tagged so the ledger can match it
  const renew = !!(S.memberEnded || (S.member && S.memberExp && daysLeft(S.memberExp) <= 5));
  const po = store.get('q_order', null);
  const pending = po && po.id && Date.now() - Date.parse(po.at || 0) < 14 * 864e5 && (renew ? !!po.renew : !S.member) ? po : null;
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow">Membership · Daily Art</p><h1>${t(renew ? 'co_renew_h' : 'co_h')}</h1>${renew ? `<p>${t('co_renew_p')}</p>` : ''}
    ${pending ? `<div class="co-resume"><p><span>${t('co_resume')}</span><b>${esc(pending.id)}</b></p><button type="button" class="btn btn-ink btn-sm" id="coRes">${t('co_resume_b')} →</button></div>` : ''}</div></section>
  <div class="wrap checkout">
    <aside class="co-sum">
      <div class="co-mark">${LOGO_MARK}</div>
      <p class="eyebrow">Daily Art Membership</p>
      <div class="co-amt">₩${PAY.price.toLocaleString()}<small> / ${t('co_month')}</small></div>
      <p class="co-vat">${t('co_vat')}</p>
      <ul>${T.m_l[n].map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${giveNote('give-note-co')}
    </aside>
    <form class="co-form" id="coForm" novalidate>
      ${test ? `<p class="co-testbar">${t('co_test')}</p>` : ''}
      <div class="field"><label>${t('co_name')}</label><input name="name" autocomplete="name" value="${esc((po && po.name) || '')}" required></div>
      <div class="field"><label>${t('co_email')}</label><input name="email" type="email" autocomplete="email" value="${esc((po && po.email) || '')}" required></div>
      <p class="co-lab">${t('co_method')}</p>
      <label class="co-opt ${cardOn ? '' : 'off'}"><input type="radio" name="m" value="card" ${cardOn ? 'checked' : 'disabled'}><span><b>${t('co_card')}</b><small>${t('co_card_s')}</small></span>${cardOn ? '' : `<em>${t('co_soon')}</em>`}</label>
      <label class="co-opt"><input type="radio" name="m" value="bank" ${cardOn ? '' : 'checked'}><span><b>${t('co_bank')}</b><small>${t('co_bank_s')}</small></span></label>
      <label class="co-agree"><input type="checkbox" name="agree"><span>${t('co_agree')} <a href="#/policy/terms" target="_blank">${t('terms')}</a> · <a href="#/policy/privacy" target="_blank">${t('privacy')}</a> · <a href="#/policy/refund" target="_blank">${t('refund')}</a></span></label>
      <button class="btn btn-ink co-btn" type="submit" id="coBtn"></button>
    </form>
  </div>`;
  const f = $('#coForm'), btn = $('#coBtn');
  const label = () => { const m = f.m.value; btn.innerHTML = `₩${PAY.price.toLocaleString()} · ${m === 'card' ? t('co_pay') : t('co_apply')} <span class="arrow">→</span>`; };
  f.onchange = label; label();
  if (pending) $('#coRes').onclick = () => showOrder(pending.id, pending);
  f.onsubmit = async e => {
    e.preventDefault();
    const o = { name: f.name.value.trim(), email: f.email.value.trim(), plan: 'daily' };
    if (!o.name || !/^\S+@\S+\.\S+$/.test(o.email) || !f.agree.checked) { toast(t('co_need')); return; }
    if (f.m.value === 'card') {
      btn.disabled = true;
      try {
        await loadScript('https://js.tosspayments.com/v2/standard');
        const customerKey = 'q_' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36).slice(2));
        store.set('q_pending', { ...o, customerKey });
        const toss = TossPayments(PAY.live ? PAY.clientKey : PAY.testClientKey);
        await toss.payment({ customerKey }).requestBillingAuth({ method: 'CARD', successUrl: payBase() + '?pay=success', failUrl: payBase() + '?pay=fail', customerEmail: o.email, customerName: o.name });
      } catch (err) { btn.disabled = false; toast((err && err.message) || t('pay_fail')); }
      return;
    }
    const d = seoulDate().slice(2).replace(/-/g, '');
    const id = `Q-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    if (renew) { const st = await codeStatus(store.get('q_code', '')); o.renew = { exp: (st && st.exp) || S.memberExp || S.memberEnded, ref: (st && st.id) || '' }; }
    store.set('q_order', { id, ...o, at: new Date().toISOString() });
    showOrder(id, o);
  };
}
function showOrder(id, o) {
  const payer = `${o.name}${id.slice(-4)}`;
  const rn = o.renew ? `\n현재 만료일: ${o.renew.exp}${o.renew.ref ? `\n링크 번호: ${o.renew.ref}` : ''}` : '';
  const msg = `[QURATOR Daily Art ${o.renew ? '연장' : '구독'} 신청]\n주문번호: ${id}\n이름: ${o.name}\n이메일: ${o.email}\n금액: 월 ${PAY.price.toLocaleString()}원\n입금자명: ${payer}${rn}`;
  $('.checkout').innerHTML = `<div class="co-done">
    <div class="co-mark">${LOGO_MARK}</div><p class="eyebrow">${o.renew ? 'Renewal' : 'Order'}</p><h2>${t('co_order')}</h2>
    <div class="co-id">${esc(id)}</div><p>${t('co_order_p')}</p>
    <dl class="co-bank">
      <div><dt>${t('co_acct')}</dt><dd><b>${BANK.name} ${BANK.number}</b> <button type="button" class="co-mini" id="cpa">${t('co_cpacct')}</button></dd></div>
      <div><dt>${t('co_holder')}</dt><dd>${esc(BANK.holder)}</dd></div>
      <div><dt>${t('co_amount')}</dt><dd>₩${PAY.price.toLocaleString()}</dd></div>
      <div><dt>${t('co_payer')}</dt><dd>${esc(payer)} <small>(${t('co_payer_v')})</small></dd></div>
    </dl>
    <div class="co-acts"><button class="btn btn-line" id="cpo">${t('co_copy')}</button><a class="btn btn-kakao" id="cpk" href="${KAKAO}" target="_blank" rel="noopener">${t('co_open')} →</a></div>
    <p class="note" style="margin-top:28px">${t('co_have')}</p>
    <form class="code-row" id="codeF2"><input id="code2" placeholder="${t('m_code')}" autocomplete="off"><button class="btn btn-ink btn-sm">${t('m_apply')}</button></form></div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('#cpa').onclick = async () => { try { await navigator.clipboard.writeText(BANK.number); toast(t('copied')); } catch { prompt('', BANK.number); } };
  // one tap: copy the order message, then the open chat opens in a new tab
  $('#cpk').onclick = () => { try { navigator.clipboard.writeText(msg).then(() => toast(t('co_kk')), () => {}); } catch {} };
  $('#cpo').onclick = async () => { try { await navigator.clipboard.writeText(msg); toast(t('copied')); } catch { prompt('', msg); } };
  $('#codeF2').onsubmit = e => { e.preventDefault(); const v = $('#code2').value.trim(); checkCode(v).then(ok => { if (ok) { activateMember(v, ok.exp); toast(t('m_ok')); location.hash = '#/today'; } else toast(t('m_bad')); }); };
}
async function viewPayResult(q) {
  const ok = q.get('pay') === 'success', pend = store.get('q_pending', {});
  const box = c => { app().innerHTML = `<div class="wrap checkout"><div class="co-done"><div class="co-mark">${LOGO_MARK}</div>${c}</div></div>`; };
  if (!ok) { box(`<h2>${t('pay_fail')}</h2><p>${esc(q.get('message') || '')}</p><p>${t('pay_fail_p')}</p><div class="co-acts"><a class="btn btn-ink" href="#/checkout">${t('co_pay')}</a><a class="btn btn-kakao" href="${KAKAO}" target="_blank" rel="noopener">${t('co_open')}</a></div>`); return; }
  if (!PAY.apiBase) { box(`<p class="eyebrow">Toss Payments</p><h2>${t('pay_test_ok')}</h2><p>${t('pay_test_p')}</p><div class="co-acts"><a class="btn btn-ink" href="#/today">${t('nav_today')} →</a></div>`); return; }
  box(`<p class="note"><span class="spinner"></span> ${t('pay_wait')}</p>`);
  try {
    const r = await fetch(PAY.apiBase + '/billing/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authKey: q.get('authKey'), customerKey: q.get('customerKey') || pend.customerKey, name: pend.name, email: pend.email, plan: pend.plan || 'daily' }) }).then(r => r.json());
    if (!r.code) throw new Error(r.error || 'error');
    activateMember(r.code); store.set('q_pending', null);
    box(`<p class="eyebrow">Welcome</p><h2>${t('pay_ok')}</h2><div class="co-id">${esc(r.code)}</div><p>${t('pay_ok_p')}</p><div class="co-acts"><a class="btn btn-ink" href="#/today">${t('nav_today')} →</a></div>`);
  } catch (e) { box(`<h2>${t('pay_fail')}</h2><p>${esc(e.message)}</p><p>${t('pay_fail_p')}</p><div class="co-acts"><a class="btn btn-kakao" href="${KAKAO}" target="_blank" rel="noopener">${t('co_open')}</a></div>`); }
}

/* ---------------- modal ---------------- */
function openSubscribe() {
  if (IOS) return;
  const m = $('#modal'), n = L();
  m.innerHTML = PLAY ? `<div class="modal-box" role="dialog" aria-modal="true"><button class="close" aria-label="close">×</button>
    <p class="eyebrow" style="color:var(--seal)">Membership</p><h3>${t('play_h')}</h3><p>${t('play_p')}</p>
    <form class="code-row" id="codeF"><input id="code" placeholder="${t('m_code')}" autocomplete="off"><button class="btn btn-line btn-sm" type="submit">${t('m_apply')}</button></form></div>` : `<div class="modal-box" role="dialog" aria-modal="true"><button class="close" aria-label="close">×</button>
    <p class="eyebrow" style="color:var(--seal)">Membership</p><h3>${t('m_h')}</h3><p>${t('m_p')}</p>
    <div class="amt">₩30,000<small> ${t('per_month')}</small></div>
    <ul>${T.m_l[n].map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <a class="btn btn-ink" style="width:100%;justify-content:center" href="#/checkout">${t('m_cta')} →</a>
    <form class="code-row" id="codeF"><input id="code" placeholder="${t('m_code')}" autocomplete="off"><button class="btn btn-line btn-sm" type="submit">${t('m_apply')}</button></form></div>`;
  m.hidden = false;
  m.onclick = e => { if (e.target === m || e.target.classList.contains('close')) m.hidden = true; };
  $('#codeF').onsubmit = e => {
    e.preventDefault();
    const v = $('#code').value.trim();
    checkCode(v).then(ok => { if (ok) { activateMember(v, ok.exp); m.hidden = true; toast(t('m_ok')); route(); } else toast(t('m_bad')); });
  };
}

/* ---------------- PWA ---------------- */
let deferredPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; bindInstall(); });
function bindInstall() {
  const b = $('#installBtn'); if (!b) return;
  if (deferredPrompt) { b.classList.add('show'); b.onclick = async () => { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; b.classList.remove('show'); }; }
}
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

/* ---------------- router ---------------- */
async function route() {
  Speech.stop(); Speech.onUpdate = null;
  if (stageCleanup) { stageCleanup(); stageCleanup = null; }
  document.body.classList.remove('v', 'menu-open', 'home');
  $('#modal').hidden = true;
  const raw = location.hash.replace(/^#/, '') || '/';
  const parts = raw.split('?')[0].split('/').filter(Boolean);
  const r = parts[0] || '';
  renderShell(r);
  if (r === '' || r === 'pricing') document.body.classList.add('home');
  document.body.classList.toggle('gal-page', r === 'galleries');
  window.scrollTo(0, 0);
  const A = $('#app'); A.classList.remove('enter'); void A.offsetWidth; A.classList.add('enter');
  onScroll();
  if (r === '' ) viewHome();
  else if (PLAY && (r === 'pricing' || r === 'checkout' || r === 'galleries')) viewToday();
  else if (r === 'pricing') viewHome('pricing');
  else if (r === 'today') viewToday(parts[1]);
  else if (r === 'archive') viewArchive();
  else if (r === 'explore') viewExplore();
  else if (r === 'studio') viewStudio();
  else if (r === 'support') viewSupport();
  else if (r === 'giving') await viewGiving();
  else if (r === 'galleries') viewGalleries();
  else if (r === 'features') parts[1] ? await viewFeature(decodeURIComponent(parts[1])) : await viewFeatures();
  else if (r === 'policy') viewPolicy(parts[1]);
  else if (r === 'checkout') viewCheckout();
  else if (r === 'w' && parts[1]) await viewWork(decodeURIComponent(parts[1]));
  else if (r === 'c' && parts[1]) await viewWork(null, parts[1]);
  else if (r === 'x' && parts[1]) await viewExhibition(parts[1]);
  else if (r === 'pay') viewToday();
  else if (IOS && (r === 'm' || r === 'checkout' || r === 'pricing' || r === 'galleries' || (r === 'policy' && parts[1] === 'refund'))) viewToday();
  else if (r === 'm' && parts[1]) await viewMemberLink(parts[1]);
  else viewHome();
  $('#app').focus({ preventScroll: true });
}

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act="subscribe"]'); if (a) { e.preventDefault(); openSubscribe(); }
  const lb = e.target.closest('.lang button');
  if (lb) { S.lang = lb.dataset.lang; store.set('q_lang', S.lang); route(); }
});
$('#menuBtn').onclick = () => document.body.classList.toggle('menu-open');
function onScroll() { $('#top').classList.toggle('solid', scrollY > 40 || !document.body.classList.contains('home')); }
addEventListener('scroll', onScroll, { passive: true });
addEventListener('hashchange', route);
addEventListener('keydown', e => { if (e.key === 'Escape') { $('#modal').hidden = true; const z = $('.zoom-layer'); if (z) z.remove(); } });

(async function boot() {
  try {
    const fresh = { cache: 'no-cache' }; // always revalidate so new daily picks appear immediately
    const [works, daily] = await Promise.all([getJSON('data/works.json', fresh), getJSON('data/daily.json', fresh).catch(() => ({}))]);
    S.works = works; S.daily = daily; works.forEach(w => S.byId[w.id] = w);
  } catch (e) { app().innerHTML = '<div class="empty">Failed to load data.</div>'; return; }
  await recheckMember().catch(() => {});
  const q = new URLSearchParams(location.search);
  if (q.get('pay')) {
    renderShell('');
    history.replaceState(null, '', location.pathname + '#/pay');
    await viewPayResult(q);
    addEventListener('hashchange', () => {}, { once: true });
    return;
  }
  route();
})();
})();
