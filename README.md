# QURATOR — QR 도슨트 · Daily Art

정적 웹앱(GitHub Pages). 서버 없이 동작합니다.

## 두 가지 상품
- **Daily Art (B2C, 월 3만원)** — 매일 3점 영문 해설 + 한국어 번역 + 음성 + 오늘의 영어 표현. `#/today`, `#/archive`
- **QR 도슨트 (B2B)** — 작품별 해설 페이지 `#/w/{id}`, QR 벽 라벨 인쇄 `#/studio`, 전시 입구 QR `#/x/{payload}`

## 작품 데이터
| 출처 | 규모 | 해설 |
|---|---|---|
| `data/works.json` 큐레이션 | 24점 (국내 10, 해외 14) | 한·영 도슨트 해설, 감상 포인트, 영어 표현 |
| Art Institute of Chicago API | 약 12만 점 | 미술관 원문 해설 → 브라우저 번역 |
| The Met Collection API | 개별 작품만 (검색 API는 2026-10-01 종료) | 메타데이터 기반 안내 |
| Cleveland Museum of Art Open Access | 약 6만 점 | 벽면 해설 원문 |

- 큐레이션 작품 이미지는 위키백과/위키미디어 커먼즈에서 자동으로 불러옵니다. 특정 이미지를 고정하려면 해당 작품에 `"img": "https://..."` 를 추가하세요.
- 갤러리가 직접 등록한 작품은 해설 전체가 압축되어 URL(QR) 안에 들어갑니다 → `#/c/{payload}`.

## 매일 작품 추가하기
1. `data/works.json` 에 작품 추가 (기존 항목 형식 그대로)
2. `data/daily.json` 에 `"YYYY-MM-DD": [id1, id2, id3]` 추가
3. 지정 안 된 날짜는 큐레이션 풀에서 자동 순환

## 멤버십 (MVP)
결제 연동 전 베타 단계 — 텔레그램 신청 후 멤버 코드 발급 (`assets/app.js` 의 `MEMBER_CODES`).
다음 단계: 토스페이먼츠 정기결제 + 로그인(Supabase 등) 연동.

## 고객센터 · 문의
카카오톡 오픈채팅: https://open.kakao.com/o/gQLZj9Ti  (`assets/app.js` 의 `KAKAO`)
고객센터 `#/support`, 약관 `#/policy/terms`, 개인정보 `#/policy/privacy`, 환불·해지 `#/policy/refund`

## 결제
- 지금: 결제 페이지 `#/checkout` → 계좌이체 선택 → 주문번호 발급 → 카카오톡으로 입금 안내 → 확인 후 멤버 코드 발급
  (멤버 코드는 `MEMBER_CODES` 에 추가, 결제 서버 연결 후에는 서버가 자동 발급)
- 카드 자동결제 (토스페이먼츠): 테스트는 `#/checkout?paytest=1`
  1. 사업자등록 + 통신판매업 신고 → 토스페이먼츠 가입·심사 → 자동결제(빌링) 계약
  2. Cloudflare 가입 → `cd worker && npx wrangler kv namespace create SUBS` → id를 wrangler.toml에 입력
  3. `npx wrangler secret put TOSS_SECRET_KEY` → `npx wrangler deploy`
  4. `assets/app.js` 의 `PAY` 에 `live: true, clientKey: '라이브 클라이언트 키', apiBase: '워커 주소'`

## 도슨트 음성 (녹음 품질)
GitHub 레포 Settings → Secrets and variables → Actions 에 `OPENAI_API_KEY` (또는 `ELEVENLABS_API_KEY` + 변수 `ELEVENLABS_VOICE_KO/EN`) 등록 →
Actions → "Docent narration" → Run workflow. 작품별 문장 단위 mp3가 `audio/` 에 생성되고, 녹음이 있는 작품은 기기 음성 대신 녹음을 재생합니다.
works.json 이 바뀌면 바뀐 작품만 자동으로 다시 녹음합니다.
