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
const BASE = () => location.href.split('#')[0];
const TG = 'https://t.me/btcbullit';
const seoulDate = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
async function getJSON(url, opt) { const r = await fetch(url, opt); if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); }

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
  member: store.get('q_member', false),
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
  p2_l: [['작품별 해설 페이지 · 텍스트/음성', '한국어 · 영어 기본, 다국어 확장', 'QR 벽 라벨 인쇄 파일 자동 생성', '전시 입구용 전체 안내 QR'], ['A page per artwork, text and audio', 'Korean and English, more on request', 'Print-ready QR wall labels', 'One entrance QR for the whole show']],
  per_month: ['/ 월', '/ month'], per_show: ['/ 전시', '/ exhibition'], from: ['부터', 'from'],
  how_eyebrow: ['How it works', 'How it works'], how_h: ['라벨 하나로 시작하는 전시 해설', 'Exhibition interpretation, starting with a label'],
  how_p: ['설치할 장비도, 내려받을 앱도 없습니다. 인쇄한 라벨을 벽에 붙이면 끝.', 'No hardware, no app downloads. Print the labels, put them on the wall, done.'],
  s1h: ['작품을 고르거나 등록', 'Choose or add works'], s1p: ['큐레이션 명작, 해외 미술관 공개 소장품, 혹은 갤러리의 작품을 직접 등록합니다.', 'Pick from curated masterpieces, open museum collections, or add your own works.'],
  s2h: ['QR 라벨 인쇄', 'Print QR labels'], s2p: ['작품명·작가·연도와 QR이 들어간 벽 라벨이 A4로 바로 출력됩니다.', 'Wall labels with title, artist, date and QR print straight to A4.'],
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
  f_quote: ['전시를 직접 세 번 열어 보면 압니다. 관람객이 작품 앞에 머무는 시간은 해설 한 줄에 달려 있다는 것을.', 'Run three exhibitions yourself and you learn this: how long a visitor stays in front of a work depends on a single line of interpretation.'],
  f_body: ['미술사를 전공하고 인사동·코엑스·인천에서 세 번의 전시를 직접 기획한 운영자가 모든 해설 원고를 감수합니다. 기술보다 해설의 질로 승부합니다.', 'Every text is reviewed by a founder trained in art history who organized three exhibitions in Insadong, COEX and Incheon. We compete on the quality of interpretation, not gadgets.'],
  fa1: ['전시 기획', 'Exhibitions organized'], fa2: ['해설 언어', 'Languages'], fa3: ['열람 가능 작품', 'Works searchable'],
  cta_h: ['다음 전시, 관람객의 휴대폰을 도슨트로.', 'Make every visitor\'s phone your docent.'],
  cta_btn: ['텔레그램으로 상담하기', 'Talk to us on Telegram'],
  foot_note: ['작품 이미지와 데이터: 시카고 미술관, 메트로폴리탄 미술관, 클리블랜드 미술관 오픈 액세스(CC0), 위키미디어 커먼즈.', 'Images & data: Art Institute of Chicago, The Met, Cleveland Museum of Art Open Access (CC0), Wikimedia Commons.'],
  // today
  daily_h: ['오늘의 작품', 'Daily Art'], daily_p: ['매일 아침 9시, 세 점의 명작과 영어 해설. 미술과 영어를 함께 읽는 하루 10분.', 'Every morning, three masterpieces with English commentary. Ten minutes of art and English a day.'],
  ko_trans: ['한국어 해설 보기', 'Korean commentary'], words_h: ['Words to know · 오늘의 표현', 'Words to know'],
  open_v: ['작품 페이지 · 음성 해설', 'Artwork page · audio'], locked_h: ['멤버 전용 해설입니다', 'Members only'],
  locked_p: ['나머지 두 점의 영문 해설, 한국어 번역, 음성과 오늘의 표현은 Daily Art 멤버에게 열립니다.', 'The full commentary, translation, audio and words for the other two works are for Daily Art members.'],
  member_on: ['Daily Art 멤버로 보고 있습니다.', 'You are viewing as a Daily Art member.'], archive: ['아카이브', 'Archive'],
  install: ['홈 화면에 설치', 'Install app'],
  // modal
  m_h: ['Daily Art 멤버십', 'Daily Art Membership'], m_p: ['매일 세 점의 명작을 영어 해설로. 언제든 해지할 수 있습니다.', 'Three masterpieces a day in English. Cancel anytime.'],
  m_l: [['매일 3점 영문 해설 + 한국어 번역', '음성 해설 · 감상 포인트 · 오늘의 표현', '지난 작품 아카이브 무제한', '앱처럼 홈 화면에 설치'], ['3 English commentaries daily + Korean', 'Audio · what to look for · words to know', 'Unlimited archive', 'Install on your home screen']],
  m_cta: ['텔레그램으로 구독 신청', 'Subscribe via Telegram'], m_code: ['멤버 코드 입력', 'Member code'], m_apply: ['확인', 'Apply'],
  m_ok: ['멤버십이 활성화되었습니다', 'Membership activated'], m_bad: ['코드를 다시 확인해 주세요', 'Please check the code'],
  // explore
  ex_h: ['작품 탐색', 'Explore'], ex_p: ['큐레이션 명작 24점과 클리블랜드·시카고 미술관 공개 소장품 약 18만 점을 검색하세요. +를 누르면 QR 스튜디오에 담깁니다.', 'Search 24 curated masterpieces and about 180,000 open-access works from Cleveland and Chicago. Tap + to add to QR Studio.'],
  ex_ph: ['작가, 작품명, 주제 — 예: Monet, landscape, 청자', 'Artist, title, subject — e.g. Monet, landscape'],
  all: ['전체', 'All'], curated: ['큐레이션', 'Curated'], kr: ['한국 미술', 'Korean art'], world: ['세계 명작', 'World'],
  searching: ['미술관 소장품 검색 중', 'Searching museum collections'], noresult: ['결과가 없습니다. 영어로도 검색해 보세요.', 'No results. Try another term in English.'],
  results: ['검색 결과', 'Results'], added: ['QR 스튜디오에 추가했습니다', 'Added to QR Studio'], removed: ['스튜디오에서 뺐습니다', 'Removed from studio'],
  // studio
  st_h: ['QR 스튜디오', 'QR Studio'], st_p: ['전시를 구성하고 작품별 QR 벽 라벨을 인쇄하세요. 입구용 전시 안내 QR도 함께 만들어집니다.', 'Build an exhibition and print a QR wall label for each work, plus one entrance QR for the whole show.'],
  st_name: ['전시 제목', 'Exhibition title'], st_sub: ['부제 · 기간 · 장소', 'Subtitle · dates · venue'],
  st_custom: ['직접 작품 등록', 'Add your own work'], st_t: ['작품명', 'Title'], st_a: ['작가', 'Artist'], st_y: ['연도', 'Year'], st_m: ['재료·크기', 'Medium & size'],
  st_img: ['이미지 URL (선택)', 'Image URL (optional)'], st_ko: ['한국어 해설', 'Korean text'], st_en: ['영어 해설', 'English text'], st_add: ['라벨에 추가', 'Add label'],
  st_hint: ['갤러리 작품 해설은 QR 안에 담기므로 서버가 필요 없습니다. 해설이 길수록 QR이 촘촘해지니 1,000자 이내를 권장합니다.', 'Your text is stored inside the QR itself, so no server is needed. Keep it under ~1,000 characters for an easy-to-scan code.'],
  st_print: ['라벨 인쇄 (A4)', 'Print labels (A4)'], st_copy: ['전시 링크 복사', 'Copy exhibition link'], st_clear: ['모두 비우기', 'Clear all'],
  st_empty: ['아직 담긴 작품이 없습니다. 작품 탐색에서 + 를 누르거나 왼쪽에서 직접 등록하세요.', 'No works yet. Tap + in Explore or add your own on the left.'],
  st_xqr: ['전시 입구용 QR — 관람객이 전체 작품 목록을 봅니다.', 'Entrance QR — visitors see the full list of works.'],
  st_count: ['점', 'works'], copied: ['링크를 복사했습니다', 'Link copied'], go_explore: ['작품 탐색으로', 'Go to Explore'],
  // viewer
  v_listen: ['해설 듣기', 'Listen'], v_look: ['이것을 찾아보세요', 'Look closer'], v_words: ['Words to know', 'Words to know'], v_info: ['작품 정보', 'Details'],
  v_more: ['함께 보면 좋은 작품', 'You may also like'], v_artist: ['작가', 'Artist'], v_date: ['연도', 'Date'], v_medium: ['재료', 'Medium'],
  v_coll: ['소장', 'Collection'], v_src: ['출처', 'Source'], v_notfound: ['작품을 찾을 수 없습니다.', 'Artwork not found.'],
  v_orig: ['원문(영어) 해설입니다. ', 'Original English text. '], v_gt: ['구글 번역으로 보기', 'Open in Google Translate'],
  v_auto: ['브라우저 내장 번역으로 옮긴 해설입니다. ', 'Machine-translated in your browser. '],
  v_basic: ['이 작품은 아직 큐레이터 해설이 준비되지 않아 소장처 기록을 바탕으로 안내합니다.', 'A curator\'s text is not ready yet; this guide is based on the museum record.'],
  v_loading: ['작품을 불러오는 중', 'Loading artwork'], v_unknown: ['작가 미상', 'Unknown artist'],
  x_works: ['작품', 'works'], x_scan: ['각 작품 옆 QR을 찍거나 아래 목록에서 선택하세요.', 'Scan the QR beside each work, or choose from the list.'],
  back: ['← 돌아가기', '← Back']
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
    const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith(lang));
    const pref = [/natural/i, /google/i, /yuna|sora|samantha|ava|serena|daniel/i];
    for (const p of pref) { const v = vs.find(x => p.test(x.name)); if (v) return v; }
    return vs[0] || null;
  },
  load(sents, lang) { this.stop(); this.sents = sents; this.lang = lang; this.idx = 0; this.emit(); },
  speakFrom(i) {
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
  pause() { this.playing = false; if (this.ok) speechSynthesis.cancel(); this.emit(); },
  stop() { this.playing = false; if (this.ok) speechSynthesis.cancel(); this.idx = 0; },
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
  $('#nav').innerHTML = [['today', '#/today'], ['explore', '#/explore'], ['studio', '#/studio'], ['pricing', '#/pricing']]
    .map(([k, h]) => `<a href="${h}" class="${route === k ? 'on' : ''}">${t('nav_' + k)}</a>`).join('');
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === S.lang));
  document.documentElement.lang = S.lang;
  $('#foot').innerHTML = `<div class="foot-in"><div><b style="color:var(--ink);letter-spacing:.2em;font-family:var(--serif-en);font-size:16px">QURATOR</b><br>© 2026 QURATOR · ${esc(t('foot_note'))}</div>
    <div><a href="${TG}" target="_blank" rel="noopener">Telegram @btcbullit</a> &nbsp;·&nbsp; <a href="#/pricing">${t('nav_pricing')}</a></div></div>`;
}

/* ---------------- views ---------------- */
const app = () => $('#app');

function viewHome(scrollTo) {
  const today = seoulDate(), ids = dailyIds(today), w0 = S.byId[ids[0]];
  const n = L();
  app().innerHTML = `
  ${heroBlock()}
  <div class="marquee" aria-hidden="true"><div class="marquee-in">${(new Array(2)).fill(['Louvre', 'Prado', 'Uffizi', 'Rijksmuseum', '국립중앙박물관', '간송미술관', 'Cleveland Museum of Art', 'Text · Voice · Multilingual']).flat().map(s => `<span>${s}</span>`).join('')}</div></div>

  <section class="sec" id="products"><div class="wrap">
    <div class="products rv">
      ${productCard('p1', '₩30,000', t('per_month'), '#/today', t('cta_today'))}
      ${productCard('p2', '₩300,000', t('per_show') + ' ' + t('from'), '#/studio', t('nav_studio'))}
    </div>
  </div></section>

  ${ribbonBlock()}

  <section class="sec dark"><div class="wrap">
    <div class="sec-head rv"><div><p class="eyebrow">${t('how_eyebrow')}</p><h2>${t('how_h')}</h2></div><p>${t('how_p')}</p></div>
    <div class="steps">${[1, 2, 3].map(i => `<div class="step rv"><div class="n">0${i}</div><h4>${t('s' + i + 'h')}</h4><p>${t('s' + i + 'p')}</p></div>`).join('')}</div>
  </div></section>

  <section class="sec"><div class="wrap">
    <div class="sec-head rv"><div><p class="eyebrow">${t('today_eyebrow')} · ${today}</p><h2>${t('today_h')}</h2></div>
      <a class="link" href="#/today">${t('see_all')} <span class="arrow">→</span></a></div>
    <div class="trio">${ids.map((id, i) => { const w = S.byId[id]; return `<a class="tcard rv" href="#/today">${artBox(w)}<div class="meta"><span class="num">${['I', 'II', 'III'][i]}</span>
      <h3>${esc(pick(w.title))}</h3><div class="by">${esc(pick(w.artist))} · ${esc(w.date)}</div>${i && !S.member ? `<span class="lock-chip">● Members</span>` : ''}</div></a>`; }).join('')}</div>
  </div></section>

  ${pricingBlock()}

  <section class="sec" style="padding-top:0"><div class="wrap founder">
    <div class="rv"><p class="eyebrow">${t('f_eyebrow')}</p><blockquote>${esc(t('f_quote'))}</blockquote></div>
    <div class="rv"><p style="color:var(--ink-2);font-size:17px;margin:0 0 32px">${esc(t('f_body'))}</p>
      <div class="facts"><div class="fact"><b>3</b><span>${t('fa1')}</span></div><div class="fact"><b>2+</b><span>${t('fa2')}</span></div><div class="fact"><b>180K</b><span>${t('fa3')}</span></div></div></div>
  </div></section>

  <section class="cta-band"><div class="wrap"><h2>${t('cta_h')}</h2><a class="btn" href="${TG}" target="_blank" rel="noopener">${t('cta_btn')} <span class="arrow">→</span></a></div></section>`;
  hydrate(); reveal(); startStage();
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
  ['w-starry', '50% 40%'], ['k-inwang', '50% 45%'], ['w-greatwave', '32% 50%'],
  ['w-venus', '50% 34%'], ['k-mongyu', '82% 50%'], ['w-grandejatte', '50% 62%'], ['w-impression', '55% 50%']
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
      <p class="lead">${esc(t('hero_lead'))}</p>
      <div class="hero-ctas">
        <a class="btn btn-cream" href="#/today">${t('cta_today')} <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="#/pricing">${t('cta_gallery')}</a>
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
  const n = L();
  const plan = (k, amt, per, cls, btn) => `<div class="plan ${cls}"><h4>${t(k)}</h4><div class="amt">${amt}<small>${per}</small></div>
    <ul>${T[k + 'l'][n].map(x => `<li>${esc(x)}</li>`).join('')}</ul>${btn}</div>`;
  return `<section class="sec" id="pricing"><div class="wrap">
    <div class="sec-head rv"><div><p class="eyebrow">${t('pr_eyebrow')}</p><h2>${t('pr_h')}</h2></div></div>
    <div class="pricing rv">
      ${plan('pl1', '₩30,000', t('per_month'), 'feat', `<button class="btn btn-seal" data-act="subscribe">${t('subscribe')}</button>`)}
      ${plan('pl2', '₩300,000', t('per_show'), '', `<a class="btn btn-line" href="${TG}" target="_blank" rel="noopener">${t('inquire')}</a>`)}
      ${plan('pl3', '₩1,000,000', t('per_show'), '', `<a class="btn btn-line" href="${TG}" target="_blank" rel="noopener">${t('inquire')}</a>`)}
      ${plan('pl4', '₩99,000', t('per_month'), '', `<a class="btn btn-line" href="${TG}" target="_blank" rel="noopener">${t('inquire')}</a>`)}
    </div></div></section>`;
}

function viewToday(date) {
  const today = seoulDate();
  date = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today ? date : today;
  const ids = dailyIds(date), f = fmtDate(date, S.lang);
  const isToday = date === today;
  app().innerHTML = `
  <section class="phead"><div class="wrap">
    <p class="eyebrow">${t('daily_h')} · Daily Art</p>
    <div class="today-date"><span class="d">${f.d}</span><span class="m">${esc(f.m)}</span></div>
    <p style="margin-top:18px">${t('daily_p')}</p>
    ${S.member ? `<div class="member-bar"><span>● ${t('member_on')}</span><a class="link" href="#/archive">${t('archive')} →</a></div>` : ''}
    <button class="btn btn-line btn-sm install" id="installBtn" style="margin-top:18px">↓ ${t('install')}</button>
  </div></section>
  <div class="wrap">${ids.map((id, i) => dayCard(S.byId[id], i, !isToday ? S.member : (i === 0 || S.member))).join('')}</div>
  ${S.member ? '' : pricingBlock()}`;
  hydrate(); reveal(); bindInstall();
}
function dayCard(w, i, open) {
  const first = splitSentences(w.text.en).filter(s => s !== '\n').slice(0, 2).join(' ');
  return `<article class="day-card">
    <div class="day-art rv"><a href="#/w/${w.id}">${artBox(w)}</a></div>
    <div class="day-body rv">
      <span class="day-num">${['I', 'II', 'III'][i]} / III</span>
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
        <button class="btn btn-seal" data-act="subscribe">${t('subscribe')} — ₩30,000${t('per_month')}</button></div></div>`}
    </div></article>`;
}
function viewArchive() {
  const today = seoulDate(), days = [];
  for (let i = 0; i < 21; i++) { const d = new Date(Date.parse(today + 'T00:00:00Z') - i * 864e5).toISOString().slice(0, 10); days.push(d); }
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow">Daily Art</p><h1>${t('archive')}</h1>
    <p>${S.member ? t('member_on') : t('locked_p')}</p>${S.member ? '' : `<button class="btn btn-seal" style="margin-top:20px" data-act="subscribe">${t('subscribe')}</button>`}</div></section>
    <div class="wrap" style="padding-bottom:90px">${days.map(d => {
      const f = fmtDate(d, S.lang);
      return `<div style="border-top:1px solid var(--line);padding:26px 0">
      <a href="#/today/${d}" style="display:flex;gap:14px;align-items:baseline;margin-bottom:16px"><span style="font-family:var(--serif-en);font-size:40px;line-height:1">${f.d}</span><span class="note">${esc(f.m)}</span></a>
      <div class="grid">${dailyIds(d).map(id => { const w = S.byId[id]; return `<a class="gcard" href="${S.member ? '#/w/' + id : '#/today/' + d}">${artBox(w)}<h3>${esc(w.title.en)}</h3><div class="by">${esc(w.artist.en)}</div></a>`; }).join('')}</div></div>`;
    }).join('')}</div>`;
  hydrate();
}

/* explore */
let exploreState = { q: '', filter: 'all', results: null, loading: false };
function viewExplore() {
  const st = exploreState;
  app().innerHTML = `<section class="phead"><div class="wrap"><p class="eyebrow">Open collections</p><h1>${t('ex_h')}</h1><p>${t('ex_p')}</p></div></section>
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
    const sents = splitSentences(r.text || '');
    const vt = $('#vtext');
    vt.className = 'v-text ' + (l === 'en' ? 'en' : '');
    let k = 0;
    vt.innerHTML = sents.map(s => s === '\n' ? '<br><br>' : `<span class="s" data-i="${k++}">${esc(s)}</span> `).join('');
    $('#vnote').innerHTML = r.note || '';
    const speakSents = sents.filter(s => s !== '\n');
    // for mixed (ko header + english original) speak in English except header line
    Speech.load(speakSents, r.mixed ? 'en' : l);
    $('#plang').textContent = (l === 'ko' && !r.mixed) ? '한국어 음성' : 'English voice';
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
  $('#play').onclick = () => { if (!Speech.ok) { toast('Audio is not supported on this browser'); return; } Speech.toggle(); };
  $('#vtext').onclick = e => { const s = e.target.closest('.s'); if (s && Speech.ok) Speech.speakFrom(+s.dataset.i); };
  $('#vtabs').onclick = e => { const b = e.target.closest('button'); if (b) showLang(b.dataset.l); };
  $('#rate').onclick = () => { const rs = [0.85, 1, 1.15, 1.3]; Speech.rate = rs[(rs.indexOf(Speech.rate) + 1) % rs.length]; store.set('q_rate', Speech.rate); $('#rate').textContent = Speech.rate + '×'; if (Speech.playing) Speech.speakFrom(Speech.idx); };
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

/* ---------------- modal ---------------- */
function openSubscribe() {
  const m = $('#modal'), n = L();
  m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><button class="close" aria-label="close">×</button>
    <p class="eyebrow" style="color:var(--seal)">Membership</p><h3>${t('m_h')}</h3><p>${t('m_p')}</p>
    <div class="amt">₩30,000<small> ${t('per_month')}</small></div>
    <ul>${T.m_l[n].map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <a class="btn btn-ink" style="width:100%;justify-content:center" href="${TG}" target="_blank" rel="noopener">${t('m_cta')} →</a>
    <form class="code-row" id="codeF"><input id="code" placeholder="${t('m_code')}" autocomplete="off"><button class="btn btn-line btn-sm" type="submit">${t('m_apply')}</button></form></div>`;
  m.hidden = false;
  m.onclick = e => { if (e.target === m || e.target.classList.contains('close')) m.hidden = true; };
  $('#codeF').onsubmit = e => {
    e.preventDefault();
    const v = $('#code').value.trim().toUpperCase();
    if (MEMBER_CODES.includes(v)) { S.member = true; store.set('q_member', true); m.hidden = true; toast(t('m_ok')); route(); }
    else toast(t('m_bad'));
  };
}
const MEMBER_CODES = ['QURATOR-BETA', 'DAILYART2026'];

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
  window.scrollTo(0, 0);
  const A = $('#app'); A.classList.remove('enter'); void A.offsetWidth; A.classList.add('enter');
  onScroll();
  if (r === '' ) viewHome();
  else if (r === 'pricing') viewHome('pricing');
  else if (r === 'today') viewToday(parts[1]);
  else if (r === 'archive') viewArchive();
  else if (r === 'explore') viewExplore();
  else if (r === 'studio') viewStudio();
  else if (r === 'w' && parts[1]) await viewWork(decodeURIComponent(parts[1]));
  else if (r === 'c' && parts[1]) await viewWork(null, parts[1]);
  else if (r === 'x' && parts[1]) await viewExhibition(parts[1]);
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
  route();
})();
})();
