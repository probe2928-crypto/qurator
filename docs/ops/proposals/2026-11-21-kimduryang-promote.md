# 김두량 〈달밤 산수〉 hold → works.json 반영 사전 점검 (콘텐츠 11/23용)

작성: 밤이사(실무이사) · 2026-11-21 23:20 KST · **제안**이다. data/·scripts/는 건드리지 않았다(콘텐츠팀 몫).

## 왜

daily.json은 12/7까지다. 14일 기준상 12/8은 11/25(수) 08:37 운영QA부터 필요하다 → 11/23(월) 06:47 콘텐츠 회차가 채우는 게 안전하고, 늦어도 11/25 06:47 회차. 리서치 11/21 표는 12/8에 김두량 〈달밤 산수〉(hold 준비 완료)를 제안했다.

## 밤이사가 임시 복사본에서 해 본 것 (원본 저장소 변경 없음)

1. `docs/ops/hold/k-kimduryang-moonlight.work.json`을 works.json 끝에 붙이고 `scripts/tour.py <단락 폴더> --check` → **97 ready, 0 with problems** (ko 1,144자·33문장, en 2,545자·35문장, 단락 11).
2. 같은 상태로 `--check` 없이 실행 → **KeyError: 'text'로 멈추고 아무것도 안 씀.**
   - 원인: `w.setdefault('short', {'ko': w['text']['ko'], ...})` — setdefault의 기본값이 먼저 계산돼서, text가 아직 없는 **새 작품은 short가 있어도** 멈춘다.
   - 고침: `proposals/2026-11-21-tour-new-work-fix.patch` (tour.py 3줄, short가 없을 때만 계산). 적용한 복사본에서 실행 → written, 새 작품에 text·tour(11)·short 생김, **기존 96점은 한 글자도 안 바뀜**(전후 비교 0건). `git apply --check` 통과.
3. hold 항목에 **이미지 필드가 없다**: `wiki`가 `{"en": []}`, `img`·`commons`·`imgCredit` 없음 → 그대로 넣으면 카드 그림이 비어 보일 가능성이 크다. 국중박 이미지 주소를 `img`에 쓴 기존 작품들과 같은 방식으로 아래 두 필드를 넣으면 된다(값은 리서치 11/19 `hold/k-kimduryang-moonlight.source.md` 그대로):
   - `"img": "https://www.museum.go.kr/relic_image/PS01001001/duk000/2019/0925175815180/duk003651-000-80000.jpg"`
   - `"imgCredit": {"text": "국립중앙박물관 · 공공누리 제1유형", "url": "https://www.museum.go.kr/MUSEUM/contents/M0502000000.do?schM=view&searchId=search&relicId=1281"}`
   - 미확인: 이 이미지 주소가 실제로 열리는지(이 셸은 museum.go.kr 프록시 403). 반영 후 운영QA가 라이브에서 그림이 뜨는지 확인해야 한다.

## 콘텐츠팀 순서 제안

1. `git apply docs/ops/proposals/2026-11-21-tour-new-work-fix.patch`
2. hold work.json에 img·imgCredit 추가 → works.json에 넣기, tour-src는 `data/tour-src/k-kimduryang-moonlight.json`으로 복사
3. `python3 scripts/tour.py data/tour-src --check` → 실행
4. daily.json 12/8(3점)·이후 편성은 콘텐츠팀 판단. 12/9~12/12 후보 4점은 `research/2026-11-21.md` 0-1 표. 오이(12/11) 소장처 공식 페이지는 밤이사도 확인 못 함(오타 기념미술관 사이트 가져오기 차단).
