"""QURATOR 자체 작곡 앰비언트 배경음악 (저작권: QURATOR 자체 창작).
천천히 부풀었다 가라앉는 패드 화음 + 드문드문 떨어지는 고음 + 낮은 지속음.
'빨려 들어가듯 모호한' 감상용 소리. 실행: python3 scripts/bgm/ambient.py → scripts/bgm/amb-*.mid
렌더링은 .github/workflows/bgm.yml (FluidSynth)."""
import random, os
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
N = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
N.update({'Db': 1, 'Eb': 3, 'Gb': 6, 'Ab': 8, 'Bb': 10})

def notes(names, octave):
    out, prev = [], -1
    for nm in names:
        v = N[nm] + 12 * (octave + 1)
        while v <= prev: v += 12
        out.append(v); prev = v
    return out

# ---- 카탈로그: 구독자가 한 달에 90점을 보므로 곡을 넉넉히(일반 30 + 한국 작품용 14) ----
MODES = {
    'lydian':  [0, 2, 4, 6, 7, 9, 11], 'ionian': [0, 2, 4, 5, 7, 9, 11], 'dorian': [0, 2, 3, 5, 7, 9, 10],
    'aeolian': [0, 2, 3, 5, 7, 8, 10], 'mixo': [0, 2, 4, 5, 7, 9, 10],
}
PENTA = {'pyeongjo': [0, 2, 5, 7, 9], 'gyemyeon': [0, 3, 5, 7, 10]}   # 평조·계면조 느낌의 오음계
# 화음 진행(음계 도수, 0-based) — 7도 화음 + 9음으로 모호하게
PROGS = [[0, 5, 3, 4], [0, 3, 5, 4], [0, 2, 5, 3], [5, 3, 0, 4], [0, 4, 5, 3], [0, 6, 5, 3], [3, 0, 5, 4], [0, 5, 1, 4]]
PADS = [89, 92, 94, 95, 88, 90, 50, 91]          # warm, bowed, halo, sweep, new age, polysynth, synth strings, choir
BELLS = [8, 11, 46, 0, 10, 9, 75, 73, 98, 46]  # celesta, vibes, harp, piano, music box, glock, pan flute, flute, crystal
KR_PADS = [89, 92, 94, 88]
KR_BELLS = [46, 0, 75, 46, 8]
NAMES = ["안개", "물결", "해질녘", "유리", "새벽", "숲", "첫눈", "빗소리", "달빛", "바람", "호수", "등불", "구름", "모래", "별자리",
         "이끼", "은하", "창가", "정원", "빛살", "고요", "잔향", "물안개", "파도", "오로라", "온실", "등대", "사막의 밤", "깃털", "수면"]
NAMES_EN = ["Mist", "Ripple", "Dusk", "Glass", "Dawn", "Forest", "First Snow", "Rain", "Moonlight", "Wind", "Lake", "Lantern", "Cloud", "Sand", "Constellation",
            "Moss", "Galaxy", "Window", "Garden", "Ray", "Stillness", "Echo", "Fog", "Swell", "Aurora", "Glasshouse", "Lighthouse", "Desert Night", "Feather", "Surface"]
KR_NAMES = ["한지", "처마", "대숲", "산사", "먹빛", "윤슬", "노을", "겨울산", "매화", "연못", "소나무", "달항아리", "돌담", "새벽 종"]
KR_NAMES_EN = ["Hanji", "Eaves", "Bamboo", "Mountain Temple", "Ink", "Glimmer", "Afterglow", "Winter Hill", "Plum Blossom", "Pond", "Pine", "Moon Jar", "Stone Wall", "Dawn Bell"]
KEYS = ['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb', 'B', 'Db', 'F#']

def chord_of(scale_pcs, degree, size=5):
    pcs = [scale_pcs[(degree + 2 * k) % len(scale_pcs)] for k in range(size)]
    return pcs

def catalog():
    out = []
    rnd = random.Random(20261101)
    for i, nm in enumerate(NAMES):
        key = KEYS[(i * 5) % 12]; mode = list(MODES)[i % len(MODES)]
        root = N[key]; pcs = [(root + x) % 12 for x in MODES[mode]]
        prog = PROGS[i % len(PROGS)]
        chords = [[k for k in chord_of(pcs, d, 5)] for d in prog]
        scale = [pcs[j] for j in (0, 1, 2, 4, 5)]
        out.append(dict(id=f"amb-{i + 1:02d}", ko=nm, en=NAMES_EN[i], group="ambient", bpm=44 + (i * 7) % 15, bars=2 + i % 2,
                        chords=chords, scale=scale, pad=PADS[i % len(PADS)], bell=BELLS[(i * 3) % len(BELLS)], root=root, seed=f"amb{i}"))
    for i, nm in enumerate(KR_NAMES):
        key = KEYS[(i * 7 + 5) % 12]; kind = list(PENTA)[i % 2]
        root = N[key]; pcs = [(root + x) % 12 for x in PENTA[kind]]
        # 열린 4·5도 화음(3음 없이) — 국악의 텅 빈 울림
        prog = [[0, 3, 1], [3, 1, 4], [1, 4, 2], [4, 2, 0]][i % 4:] + [[0, 3, 1], [3, 1, 4], [1, 4, 2], [4, 2, 0]][:i % 4]
        chords = [[pcs[d] for d in c] + [pcs[c[0]]] for c in prog]
        out.append(dict(id=f"kr-{i + 1:02d}", ko=nm, en=KR_NAMES_EN[i], group="kr", bpm=40 + (i * 5) % 12, bars=3,
                        chords=chords, scale=pcs, pad=KR_PADS[i % len(KR_PADS)], bell=KR_BELLS[i % len(KR_BELLS)], root=root, seed=f"kr{i}"))
    return out

def pcs_notes(pcs, octave):
    out, prev = [], -1
    for pc in pcs:
        v = pc + 12 * (octave + 1)
        while v <= prev: v += 12
        out.append(v); prev = v
    return out

def build(name, bpm, bars, chords, scale, pad, bell, root, seconds=160, seed=None):
    rnd = random.Random(seed or name)
    tpb = 480; beat = tpb; bar = 4 * beat
    total_beats = int(seconds * bpm / 60)
    mid = mido.MidiFile(ticks_per_beat=tpb)
    ev = {0: [], 1: [], 2: []}  # (abs_tick, msg)

    def setup(ch, prog, vol, rev, cho):
        ev[ch] += [(0, mido.Message('program_change', channel=ch, program=prog)),
                   (0, mido.Message('control_change', channel=ch, control=7, value=vol)),
                   (0, mido.Message('control_change', channel=ch, control=91, value=rev)),
                   (0, mido.Message('control_change', channel=ch, control=93, value=cho))]
    setup(0, pad, 92, 127, 70)   # 패드
    setup(1, bell, 70, 127, 40)  # 드문 고음
    setup(2, 49, 60, 110, 30)    # 낮은 지속음(느린 현)

    # 패드: 화음이 겹치며 부풀었다 가라앉도록 expression(CC11) 곡선
    t, ci = 0, 0
    span = bars * bar
    while t < total_beats * beat:
        ch = pcs_notes(chords[ci % len(chords)], 3)
        on, off = t, t + span + beat * 2  # 다음 화음과 2박 겹침
        for v in ch: ev[0].append((on, mido.Message('note_on', channel=0, note=v, velocity=rnd.randint(38, 50))))
        for v in ch: ev[0].append((off, mido.Message('note_off', channel=0, note=v, velocity=0)))
        steps = 16
        for k in range(steps + 1):
            x = k / steps
            val = int(40 + 70 * (x * 2 if x < .5 else (1 - x) * 2) ** .8)  # 부풀고 가라앉기
            ev[0].append((on + int(span * x), mido.Message('control_change', channel=0, control=11, value=min(127, val))))
        t += span; ci += 1

    # 낮은 지속음: 두 화음마다 근음
    r = root + 12 * 2
    t = 0
    while t < total_beats * beat:
        ev[2].append((t, mido.Message('note_on', channel=2, note=r, velocity=34)))
        ev[2].append((t + span * 2 - beat // 2, mido.Message('note_off', channel=2, note=r, velocity=0)))
        t += span * 2

    # 드문 고음: 2~7박 간격, 음계 안에서 가까운 음으로 천천히 떠돌기
    pool = sorted(set(pc + 12 * (o + 1) for o in (5, 6) for pc in scale))
    idx = len(pool) // 2
    t = beat * rnd.randint(4, 8)
    while t < total_beats * beat - bar:
        idx = max(0, min(len(pool) - 1, idx + rnd.choice([-2, -1, -1, 1, 1, 2, 0])))
        v = pool[idx]
        dur = beat * rnd.choice([2, 3, 4])
        ev[1].append((t, mido.Message('note_on', channel=1, note=v, velocity=rnd.randint(26, 44))))
        ev[1].append((t + dur, mido.Message('note_off', channel=1, note=v, velocity=0)))
        if rnd.random() < .22:  # 가끔 한 음 더, 메아리처럼
            v2 = pool[max(0, idx - 2)]
            ev[1].append((t + beat, mido.Message('note_on', channel=1, note=v2, velocity=22)))
            ev[1].append((t + beat * 4, mido.Message('note_off', channel=1, note=v2, velocity=0)))
        t += beat * rnd.choice([2, 3, 4, 5, 6, 7])

    for ch in (0, 1, 2):
        tr = mido.MidiTrack()
        if ch == 0: tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=0))
        last = 0
        for at, msg in sorted(ev[ch], key=lambda x: (x[0], x[1].type == 'note_on')):
            tr.append(msg.copy(time=at - last)); last = at
        mid.tracks.append(tr)
    mid.save(os.path.join(HERE, name + '.mid'))
    return round(mid.length)

if __name__ == '__main__':
    import json
    cat = catalog()
    for c in cat:
        build(c['id'], c['bpm'], c['bars'], c['chords'], c['scale'], c['pad'], c['bell'], c['root'], seed=c['seed'])
    json.dump({c['id']: {'ko': c['ko'], 'en': c['en'], 'group': c['group']} for c in cat},
              open(os.path.join(HERE, 'ambient.json'), 'w'), ensure_ascii=False, indent=1)
    print(len(cat), 'pieces')
