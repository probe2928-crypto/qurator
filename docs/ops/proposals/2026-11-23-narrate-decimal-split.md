# 해설 음성 소수점 끊김 고침 제안 (밤이사, 2026-11-23 23:15)

문제(품질검수 11/23 저녁 발견): `scripts/narrate.py`의 `split()`이 '119.4' 같은 소수점의 '.'을 문장 끝으로 본다. 해설 문장을 따로 녹음하므로 "세로 119." / "4센티미터, 가로 53." 처럼 숫자가 끊겨 읽힌다.

밤이사 확인(works.json 101점 전수, 옛/새 split 비교):
- 옛 split: 소수점 끊김 **42곳**, 해설 31개(ko·en)·작품 19점.
- 새 split: 끊김 **0곳**, 글자 손실 0, 일반 문장 나누기는 그대로("…enough." / "It is 3.5 m wide!" 각각 한 문장).
- 예: 어몽룡 ko → '비단에 먹으로만 그렸고, 세로 119.4센티미터, 가로 53.6센티미터입니다.' 한 문장.

패치: `2026-11-23-narrate-decimal-split.patch` (`git apply --check` 통과)
1. split 정규식: 숫자 사이 마침표(`(?<=\d)\.(?=\d)`)는 문장 안에 둔다.
2. 해시 salt에 소수점 있는 해설만 'dec1' 추가 → push하면 Docent narration이 **소수점 있는 19점만** 다시 녹음(나머지는 해시 같아 건너뜀). ONLY 입력은 해시가 같으면 건너뛰므로 이 방식이 필요.

적용(운영QA 08:37 — main 코드 반영은 팀 몫, 밤이사는 docs/ops만 쓴다):
```
git apply docs/ops/proposals/2026-11-23-narrate-decimal-split.patch
python3 -m py_compile scripts/narrate.py
git commit -am "해설 음성: 소수점에서 문장 끊김 고침(19점 재녹음)" && git push
```
확인: narration run success, 어몽룡 `audio/k-eomongryong-moonplum/ko.json`의 sentences에 '119.4센티미터'가 한 문장으로 들어 있는지. 남/여 두 번째 목소리(NARR_ALT) 파일은 별도 실행 때 같은 규칙으로 바뀐다.
