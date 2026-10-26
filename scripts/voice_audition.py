"""One-off: synthesise the same Korean docent passage with every Supertonic 3 preset voice,
transcribe each with Whisper and score character error rate, so the clearest voice can be chosen."""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import narrate as n

ROOT = n.ROOT
W = {w['id']: w for w in n.WORKS}
passage = ' '.join(n.split(W['k-sehando']['text']['ko'])[:3] + n.split(W['w-starry']['text']['ko'])[:2])
out = os.path.join(ROOT, 'audio', '_audition'); os.makedirs(out, exist_ok=True)
voices = sorted(f[:-5] for f in os.listdir(os.path.join(os.environ.get('SUPERTONIC_DIR', '/tmp/supertonic'), 'assets', 'voice_styles')) if f.endswith('.json'))
print('voices', voices)

from faster_whisper import WhisperModel
asr = WhisperModel(os.environ.get('ASR_MODEL', 'large-v3-turbo'), device='cpu', compute_type='int8')

def clean(t):
    return re.sub(r'[^가-힣]', '', t)

def cer(ref, hyp):
    r, h = clean(ref), clean(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev = cur
    return d[len(h)] / max(1, len(r))

ref = n.norm_ko(passage)
report = {'passage': passage, 'spoken': ref, 'voices': {}}
for v in voices:
    os.environ['SUPERTONIC_VOICE_KO'] = v
    t0 = time.time()
    mp3, _ = n.tts_supertonic(passage, 'ko')
    synth = time.time() - t0
    path = os.path.join(out, f'ko-{v}.mp3'); open(path, 'wb').write(mp3)
    segs, info = asr.transcribe(path, language='ko', beam_size=5)
    hyp = ' '.join(s.text for s in segs)
    report['voices'][v] = {'cer': round(cer(ref, hyp), 4), 'seconds': round(info.duration, 1),
                           'chars_per_sec': round(len(clean(ref)) / info.duration, 2), 'synth_sec': round(synth, 1), 'asr': hyp}
    print(v, report['voices'][v]['cer'], report['voices'][v]['seconds'], 's', hyp[:80])
json.dump(report, open(os.path.join(out, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
