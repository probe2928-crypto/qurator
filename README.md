# QURATOR — QR 도슨트 · Daily Art

정적 웹앱(GitHub Pages). 서버 없이 동작합니다.

## 두 가지 상품
- **Daily Art (B2C, 월 3만원)** — 매일 3점 영문 해설 + 한국어 번역 + 음성 + 오늘의 영어 표현. `#/today`, `#/archive`
- **QR 도슨트 (B2B)** — 작품별 해설 페이지 `#/w/{id}`, QR 벽 라벨 인쇄 `#/studio`, 전시 입구 QR `#/x/{payload}`

## 작품 데이터
| 출처 | 규모 | 해설 |
|---|---|---|
| `data/works.json` 큐레이션 | 35점 (국내 14, 해외 21) | 한·영 도슨트 해설, 감상 포인트, 영어 표현 |
| Art Institute of Chicago API | 약 12만 점 | 미술관 원문 해설 → 브라우저 번역 |
| The Met Collection API | 개별 작품만 (검색 API는 2026-10-01 종료) | 메타데이터 기반 안내 |
| Cleveland Museum of Art Open Access | 약 6만 점 | 벽면 해설 원문 |

- 큐레이션 작품 이미지는 위키백과/위키미디어 커먼즈에서 자동으로 불러옵니다. 특정 이미지를 고정하려면 해당 작품에 `"img": "https://..."` 를 추가하세요.
- 갤러리가 직접 등록한 작품은 해설 전체가 압축되어 URL(QR) 안에 들어갑니다 → `#/c/{payload}`.

## 매일 작품 추가하기
1. `data/works.json` 에 작품 추가 (기존 항목 형식 그대로)
2. `data/daily.json` 에 `"YYYY-MM-DD": [id1, id2, id3]` 추가
3. 지정 안 된 날짜는 큐레이션 풀에서 자동 순환

## 멤버십 (개인별 링크 · 만료일)
- 구독자는 **서명된 멤버 링크** `#/m/<token>` 로 엽니다. 토큰 = 만료일 + 링크 번호(4바이트) + ECDSA P-256 서명. 사이트에는 공개 키(`MEMBER_KEYS`)만 있어 위조할 수 없습니다.
- 발급: 비공개 'QURATOR 멤버 장부'(claude.ai 아티팩트)에서 입금 확인 → 발급 → 카카오톡 문구 복사. 서명 키 파일(`qurator-member-key.json`)은 저장소에 없고 세준 님 기기에만 있습니다. 비상시: `node scripts/members.mjs key.json YYYY-MM-DD`
- 만료일이 지나면 자동으로 잠기고, 5일 전부터 연장 안내가 나옵니다(앱 모드는 결제 링크 없이 문구만).
- 짧은 코드(구글 심사·베타용)는 `data/members.json` 에 SHA-256 해시 + 만료일로만 저장 — 평문 코드는 사이트에 없습니다.
- 이미 보낸 링크 차단: `data/members.json` 의 `revoked` 에 링크 번호(hex 8자리) 추가.

## 고객센터 · 문의
카카오톡 오픈채팅: https://open.kakao.com/o/gQLZj9Ti  (`assets/app.js` 의 `KAKAO`)
고객센터 `#/support`, 약관 `#/policy/terms`, 개인정보 `#/policy/privacy`, 환불·해지 `#/policy/refund`

## 결제
- 지금: 결제 페이지 `#/checkout` → 계좌이체 선택 → 주문번호·입금 계좌 안내(`BANK`) → 손님이 카카오톡으로 주문번호 전송 → 입금 확인 후 멤버 코드 발급
  (입금 확인 후 'QURATOR 멤버 장부'에서 서명 링크 `#/m/` 발급 — 위 '멤버십' 참고. 결제 서버 연결 후에는 서버가 자동 발급)
- 결제 페이지는 이 기기에서 14일 안에 만든 입금 대기 신청을 '입금 안내 다시 보기'로 다시 보여 줍니다. 만료 5일 전·만료 후에는 '연장 신청'으로 바뀌고, 카카오톡 문구에 현재 만료일·링크 번호가 들어가 장부에서 바로 찾을 수 있습니다.
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

## Google Play 앱 (TWA)
- 패키지 `kr.qurator.dailyart`, 설정 `android/twa-config.json` (버전 올리면 CI가 새 AAB 빌드 → `android-build` 브랜치)
- AAB는 서명 없이 빌드됩니다. 업로드 키(공개 저장소에 없음)로 `jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore qurator-upload.keystore app.aab qurator` 서명 후 업로드
- 앱은 `?src=twa`로 열리고, 이때 가격·결제·계좌가 숨겨집니다(구글 결제 정책: 앱 밖에서 산 멤버십을 앱에서 이용만 하는 방식). 같은 사이트를 브라우저로 열면 결제가 그대로 보입니다
- 스토어 이미지: `scripts/store_assets.py` (Actions "Play store images") → `android-build` 브랜치 `store/`

## 나눔 (오리엘 재단)
- 페이지 `#/giving`, 문구는 `assets/app.js` 의 `gv_*`, 설정은 `GIVE` (재단 링크, `share` = 기부 비율, 정해지면 입력)
- 기부를 보내면 `data/giving.json` 에 `{"date":"2027-02-01","amount":"₩000,000","note":{"ko":"…","en":"…"},"proof":"https://…"}` 추가 → 나눔 페이지 '기부 기록'에 자동 표시
- 재단이 등록되기 전에는 '기부합니다/공개합니다'(약속)까지만 쓰고, 성과·금액·수혜 인원 등 숫자는 실제 기록이 생긴 뒤에만 씁니다
