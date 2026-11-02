"""3분 해설 + 도슨트 카메라 병합 (세준 지시 2026-11-02).
작품별 단락 파일 <dir>/<id>.json = {"id":..., "segs":[{"ko","en","x","y","z","tilt"}, ...]} 를
data/works.json 의 text.ko/en(단락을 이어 붙인 3분 해설)과 tour(카메라 동선: 단락이 시작하는 문장 번호)로 넣는다.
사용: python3 scripts/tour.py <단락 폴더> [--check]   (--check 는 검사만, 고치지 않음)
기준: ko 1,000~1,150자(약 3분), en 2,300~2,700자, 단락 9~12개, 첫 단락 z=1(전체)·마지막 z≈1, words[].en 단어가 en에 포함."""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from narrate import split  # 음성 파일과 같은 문장 나누기

OUT = [a for a in sys.argv[1:] if not a.startswith('--')][0]
WJ = os.path.join(ROOT, 'data', 'works.json')
W = json.load(open(WJ, encoding='utf-8'))
check = '--check' in sys.argv

def starts(text, segs):
    """각 단락이 시작하는 문장 번호(split 기준)."""
    sents = split(text)
    pos, offs = 0, []
    for s in sents:
        i = text.find(s, pos); offs.append(i); pos = i + len(s)
    res, cur = [], 0
    for sg in segs:
        k = 0
        for j, o in enumerate(offs):
            if o <= cur + 1: k = j
        res.append(k); cur += len(sg) + 1
    return res, len(sents)

def generic(n):
    """이미지 좌표가 없는 작품: 전체 → 가운데로 천천히 → 위·아래 → 전체."""
    path = [(.5, .5, 1), (.5, .45, 1.25), (.42, .4, 1.45), (.58, .55, 1.45), (.5, .62, 1.3), (.5, .5, 1.1)]
    return [dict(zip('xyz', path[min(i * len(path) // n, len(path) - 1)])) for i in range(n)]

rows, bad = [], []
for w in W:
    f = os.path.join(OUT, w['id'] + '.json')
    if not os.path.exists(f):
        rows.append((w['id'], 'MISSING' if 'tour' not in w else 'kept')); continue
    d = json.load(open(f, encoding='utf-8'))
    segs = d['segs']
    ko = ' '.join(s['ko'].strip() for s in segs); en = ' '.join(s['en'].strip() for s in segs)
    probs = []
    if not 950 <= len(ko) <= 1250: probs.append(f'ko {len(ko)}')
    if not 2100 <= len(en) <= 2900: probs.append(f'en {len(en)}')
    if not 7 <= len(segs) <= 14: probs.append(f'segs {len(segs)}')
    for wd in w.get('words', []):
        if wd['en'].lower() not in en.lower(): probs.append(f"word '{wd['en']}'")
    if re.search(r'[()\[\]{}]', ko): probs.append('ko has brackets')
    if re.search(r'[A-Za-z]{3,}', ko): probs.append('ko has latin')
    nocoord = any(s.get('x') is None for s in segs)
    if not nocoord:
        for s in segs:
            if not (0 <= s['x'] <= 1 and 0 <= s['y'] <= 1 and 1 <= s['z'] <= 3.2): probs.append(f"coord {s['x']},{s['y']},{s['z']}"); break
    sk, nk = starts(ko, [s['ko'].strip() for s in segs]); se, ne = starts(en, [s['en'].strip() for s in segs])
    shots = generic(len(segs)) if nocoord else [{'x': s['x'], 'y': s['y'], 'z': s['z']} for s in segs]
    tour = []
    for i, s in enumerate(segs):
        t = {'x': round(shots[i]['x'], 3), 'y': round(shots[i]['y'], 3), 'z': round(shots[i]['z'], 2), 'ko': sk[i], 'en': se[i]}
        if not nocoord and s.get('tilt'): t['t'] = s['tilt']
        tour.append(t)
    rows.append((w['id'], f"ko {len(ko)} ({nk}문장) en {len(en)} ({ne}) segs {len(segs)}{' generic' if nocoord else ''}" + (' !! ' + '; '.join(probs) if probs else '')))
    if probs: bad.append(w['id'])
    if not check:
        w.setdefault('short', {'ko': w['text']['ko'], 'en': w['text']['en']})
        w['text'] = {'ko': ko, 'en': en}
        w['tour'] = tour
for r in rows: print(*r)
print(len([r for r in rows if r[1] != 'MISSING']), 'ready,', len(bad), 'with problems:', bad)
if not check:
    json.dump(W, open(WJ, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('written')
