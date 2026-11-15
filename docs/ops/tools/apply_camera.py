#!/usr/bin/env python3
"""카메라 임시 좌표 일괄 적용 (밤이사 2026-11-15).
사용: python3 docs/ops/tools/apply_camera.py docs/ops/qa/2026-11-15-night-camera-apply.json [--dry]
- data/tour-src/<id>.json 의 segs[i]에 x·y·z를 넣는다. 단락 수가 다르면 그 작품은 건너뛰고 알린다.
- --dry: 파일을 고치지 않고 검사만 한다.
적용 뒤 반드시: python3 scripts/tour.py data/tour-src --check → 문제 0 → python3 scripts/tour.py data/tour-src
"""
import json, re, sys, os

def expand(spec):
    out = []
    for m in re.finditer(r'\(([^)]*)\)(?:×(\d+))?', spec):
        x, y, z = (float(v) for v in m.group(1).split(','))
        out += [(x, y, z)] * int(m.group(2) or 1)
    return out

plan = json.load(open(sys.argv[1]))
dry = '--dry' in sys.argv
ok = 0
for wid, spec in plan['works'].items():
    f = os.path.join('data/tour-src', wid + '.json')
    d = json.load(open(f))
    vals = expand(spec)
    if len(vals) != len(d['segs']):
        print(f'건너뜀 {wid}: 좌표 {len(vals)}개, 단락 {len(d["segs"])}개'); continue
    for s, (x, y, z) in zip(d['segs'], vals):
        s['x'], s['y'], s['z'] = x, y, z
    if not dry:
        json.dump(d, open(f, 'w'), ensure_ascii=False, indent=1)
        open(f, 'a').write('\n')
    ok += 1
    print(f'{"검사" if dry else "적용"} {wid}: 단락 {len(vals)}개')
print(f'{ok}/{len(plan["works"])} 작품', '(dry)' if dry else '')
