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
| The Met Collection API | 약 47만 점 | 메타데이터 기반 안내 |
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
