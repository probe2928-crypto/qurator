# QURATOR — QR 도슨트 · Daily Art

정적 웹앱(GitHub Pages). 서버 없이 동작합니다.

## 두 가지 상품
- **Daily Art (B2C, 월 3만원)** — 매일 3점 영문 해설 + 한국어 번역 + 음성 + 오늘의 영어 표현. `#/today`, `#/archive`
- **QR 도슨트 (B2B)** — 작품별 해설 페이지 `#/w/{id}`, QR 벽 라벨 인쇄 `#/studio`, 전시 입구 QR `#/x/{payload}`

## 작품 데이터
| 출처 | 규모 | 해설 |
|---|---|---|
| `data/works.json` 큐레이션 | 29점 (국내 12, 해외 17) | 한·영 도슨트 해설, 감상 포인트, 영어 표현 |
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
결제 연동 전 베타 단계 — 계좌이체(우리은행) + 카카오톡 주문번호 확인 후 멤버 코드 발급 (`assets/app.js` 의 `MEMBER_CODES`).
다음 단계: 토스페이먼츠 정기결제 + 로그인(Supabase 등) 연동.

## 고객센터 · 문의
카카오톡 오픈채팅: https://open.kakao.com/o/gQLZj9Ti  (`assets/app.js` 의 `KAKAO`)
고객센터 `#/support`, 약관 `#/policy/terms`, 개인정보 `#/policy/privacy`, 환불·해지 `#/policy/refund`

## 결제
- 지금: 결제 페이지 `#/checkout` → 계좌이체 선택 → 주문번호·입금 계좌 안내(`BANK`) → 손님이 카카오톡으로 주문번호 전송 → 입금 확인 후 멤버 코드 발급
  (멤버 코드는 `MEMBER_CODES` 에 추가, 결제 서버 연결 후에는 서버가 자동 발급)
- 카드 자동결제 (토스페이먼츠): 테스트는 `#/checkout?paytest=1`
  1. 사업자등록 + 통신판매업 신고 → 토스페이먼츠 가입·심사 → 자동결제(빌링) 계약
  2. Cloudflare 가입 → `cd worker && npx wrangler kv namespace create SUBS` → id를 wrangler.toml에 입력
  3. `npx wrangler secret put TOSS_SECRET_KEY` → `npx wrangler deploy`
  4. `assets/app.js` 의 `PAY` 에 `live: true, clientKey: '라이브 클라이언트 키', apiBase: '워커 주소'`

## 도슨트 음성 (녹음 품질)
키 없이 기본 작동: 영어는 Kokoro-82M(af_heart), 한국어는 Supertonic 3(Supertone, 목소리 M5 — 따뜻하고 차분한 이야기꾼 톤 남성).
둘 다 오픈 웨이트 모델을 GitHub Actions에서 직접 돌려 문장 단위 mp3로 녹음합니다. 한국어는 숫자를 한글 읽기로 바꿔 녹음합니다(1889년 → 천팔백팔십구년, 6월 → 유월).
한국어 목소리를 바꾸려면 레포 Settings → Variables 에 `SUPERTONIC_VOICE_KO` (F1~F5, M1~M5) 추가 → 전체 재녹음. 비교 샘플: `audio/_audition/ko-*.mp3`.
Supertonic 모델 라이선스(OpenRAIL-M)에 따라 플레이어에 'AI 도슨트 음성'으로 표기합니다.

유료 음성으로 바꾸려면: GitHub 레포 Settings → Secrets and variables → Actions 에 `OPENAI_API_KEY` (또는 `ELEVENLABS_API_KEY` + 변수 `ELEVENLABS_VOICE_KO/EN`) 등록 →
Actions → "Docent narration" → Run workflow. 작품별 문장 단위 mp3가 `audio/` 에 생성되고, 녹음이 있는 작품은 기기 음성 대신 녹음을 재생합니다.
works.json 이 바뀌면 바뀐 작품만 자동으로 다시 녹음합니다.

## 특집 (Features)
`data/features.json` — 배열, 맨 앞이 최신(메인 화면에 노출). 주 3회(월·수·금) 1편씩 추가.
특집: `{id, asof, kicker{ko,en}, title{ko,en}, dek{ko,en}, intro{ko,en}(문단은 \n), cover[이미지 URL 최대 4], sections[{title, dek, items[]}], note}`
항목: `{title, artist, year, medium, headline{ko,en}, why{ko,en}, record?{ko,en}, pd(bool), img?(검증된 URL), commons?(Commons 파일명), imgCredit?{text,url}, sources[{label,url}]}`
- `pd: true`(작가 사후 70년 경과)일 때만 이미지 사용. `img` 또는 `commons` 파일명 → 실패하면 타이포 카드가 자동으로 보임.
- 저작권 작품(`pd: false`)은 이미지 없이 타이포 카드 + '저작권 보호 작품' 안내.
