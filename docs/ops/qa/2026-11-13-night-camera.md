# 도슨트 카메라 동선 점검 — 2026-11-13 밤 (밤이사)

방법: `data/works.json`의 `tour`(카메라 x·y·z)를 `scripts/tour.py`의 `generic()` 기본 동선 6점
{(.5,.5,1) (.5,.45,1.25) (.42,.4,1.45) (.58,.55,1.45) (.5,.62,1.3) (.5,.5,1.1)}과 대조.
기본 동선만 쓰는 작품 = 해설이 "빨간 공", "등잔" 같은 특정 부분을 말해도 카메라는 가운데 근처만 움직인다.
같이 돌린 검사: `python3 scripts/tour.py <단락 폴더> --check` → 84점 준비 완료, 문제 0 (글자 수·단락 수 기준은 통과, 좌표 유무는 검사 안 함).

## 결과: 84점 중 24점이 기본 동선 (약 29%) — 24점 모두 11/18~11/29 daily에 나온다

daily 날짜 순서 = 고칠 순서:
| daily | 기본 동선 작품 |
|---|---|
| 11/18 | k-ganghuian-gosa, w-avercamp-skaters, w-friedrich-seaofice (3점 전부) |
| 11/19 | w-klee-parnassum |
| 11/22 | k-kangsehwang-yeongtong, w-fankuan-travelers, w-hammershoi-strandgade (3점 전부) |
| 11/23 | w-steen-nicholas (SNS 주인공) |
| 11/24 | k-kimmyeongguk-dalma, w-wright-orrery, w-bada-fishrocks (3점 전부, SNS 주인공) |
| 11/25 | k-simsajeong-snowplum, w-holbein-ambassadors, w-guoxi-earlyspring |
| 11/26 | k-byeonsangbyeok-myojak, w-kroyer-summerevening, w-sesshu-winter |
| 11/27 | w-repin-bargehaulers, w-vallotton-ball |
| 11/28 | w-sorolla-stroll, w-kuroda-lakeside |
| 11/29 | k-jangseungeop-gimyeong, w-hals-cavalier, w-duncanson-rainbow |

원인: 17점은 이전부터 기본 동선, 11/13 새 7점은 tour-src 단락에 x·y·z가 없어 tour.py가 generic()으로 채움.

## 고칠 때 규칙
- 좌표는 **이미지를 직접 보고** 정한다. 이 환경에서는 upload.wikimedia.org·commons·museum.go.kr이 프록시에 막혀 이미지를 못 봤다 → 좌표를 추측해 넣지 않았다.
- 볼 수 있는 도구(허용 도메인 추가 후, 또는 품질검수가 쓰는 TinyFish 등 이미지가 열리는 도구)에서 tour-src 단락마다 x·y·z를 넣고 `tour.py --check` → 반영 → 음성은 그대로(문장 안 바뀜).
- 하루 3~4점씩, 위 표 순서. 11/18분 3점이 첫 마감(4일 남음).
