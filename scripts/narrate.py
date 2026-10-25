"""Generate studio-quality docent narration for curated works.

Writes per-sentence MP3s so the site can highlight each sentence as it plays:
  audio/<work-id>/<lang>.json   {"voice": ..., "sentences": [...], "files": [...]}
  audio/<work-id>/<lang>-NN.mp3

Provider per language:
  ELEVENLABS_API_KEY  -> ElevenLabs eleven_multilingual_v2 (needs ELEVENLABS_VOICE_KO / ELEVENLABS_VOICE_EN)
  OPENAI_API_KEY      -> OpenAI gpt-4o-mini-tts
  (no key, English)   -> Kokoro-82M, open-weight neural TTS (Apache-2.0), runs locally on the CI runner
  (no key, Korean)    -> skipped; the site falls back to the visitor's device voice
Only works whose text changed (hash) are regenerated. Stdlib only.
"""
import hashlib, json, os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKS = json.load(open(os.path.join(ROOT, 'data', 'works.json'), encoding='utf-8'))

DOCENT = {
    'ko': '미술관의 노련한 도슨트처럼 말하세요. 따뜻하고 차분하며 품위 있는 목소리로, 서두르지 말고 문장 사이에 자연스럽게 숨을 고르세요. 작품명과 작가 이름은 또렷하게 발음하세요.',
    'en': 'Speak like an experienced museum docent: warm, calm and refined, unhurried, with natural pauses between sentences. Pronounce artwork titles and artist names clearly.'
}

def split(text):
    parts = re.findall(r'[^.!?。！？]+(?:[.!?。！？]+["\'”’)\]]*|$)', text)
    out, buf = [], ''
    for p in parts:
        buf += p
        if len(buf.strip()) > 12:
            out.append(buf.strip()); buf = ''
    if buf.strip():
        out.append(buf.strip())
    return out

def post(url, headers, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method='POST')
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(4 * (attempt + 1)); continue
            raise RuntimeError(f'{e.code} {e.read()[:300]!r}')

def tts_openai(text, lang):
    voice = os.environ.get('OPENAI_VOICE_' + lang.upper()) or ('coral' if lang == 'ko' else 'sage')
    model = os.environ.get('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts')
    audio = post('https://api.openai.com/v1/audio/speech',
                 {'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY'], 'Content-Type': 'application/json'},
                 {'model': model, 'voice': voice, 'input': text, 'instructions': DOCENT[lang], 'response_format': 'mp3'})
    return audio, f'openai:{model}:{voice}'

def tts_eleven(text, lang):
    voice = os.environ['ELEVENLABS_VOICE_' + lang.upper()]
    audio = post(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128',
                 {'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': 'application/json'},
                 {'text': text, 'model_id': 'eleven_multilingual_v2',
                  'voice_settings': {'stability': 0.55, 'similarity_boost': 0.8, 'style': 0.15}})
    return audio, f'elevenlabs:{voice}'

_kokoro = None
def tts_kokoro(text, lang):
    """Natural English narration with Kokoro-82M (Apache-2.0). Returns MP3 bytes."""
    global _kokoro
    import subprocess, tempfile
    import numpy as np, soundfile as sf
    from kokoro import KPipeline
    voice = os.environ.get('KOKORO_VOICE', 'af_heart')
    if _kokoro is None:
        try:
            _kokoro = KPipeline(lang_code=voice[0], repo_id='hexgrad/Kokoro-82M')  # 'a' American / 'b' British
        except Exception as e:  # misaki's English G2P needs spaCy; fall back to espeak phonemes
            print('English G2P unavailable, using espeak-ng phonemes:', repr(e)[:200])
            from misaki.espeak import EspeakG2P
            _kokoro = KPipeline(lang_code='e', repo_id='hexgrad/Kokoro-82M')
            _kokoro.g2p = EspeakG2P(language='en-gb' if voice[0] == 'b' else 'en-us')
    parts = []
    for _, _, audio in _kokoro(text, voice=voice, speed=float(os.environ.get('KOKORO_SPEED', '0.94'))):
        a = audio.numpy() if hasattr(audio, 'numpy') else np.asarray(audio)
        parts.append(a)
        parts.append(np.zeros(int(24000 * 0.12), dtype=a.dtype))  # short breath between clauses
    with tempfile.TemporaryDirectory() as td:
        wav, mp3 = os.path.join(td, 'a.wav'), os.path.join(td, 'a.mp3')
        sf.write(wav, np.concatenate(parts), 24000)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11',
                        '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '112k', mp3], check=True)
        return open(mp3, 'rb').read(), f'kokoro:{voice}'

def provider(lang):
    if os.environ.get('ELEVENLABS_API_KEY') and os.environ.get('ELEVENLABS_VOICE_' + lang.upper()):
        return tts_eleven
    if os.environ.get('OPENAI_API_KEY'):
        return tts_openai
    if lang == 'en':
        return tts_kokoro
    return None

def main():
    only = set(filter(None, os.environ.get('ONLY', '').split(',')))
    made = 0
    for w in WORKS:
        if only and w['id'] not in only:
            continue
        for lang in ('ko', 'en'):
            tts = provider(lang)
            if tts is None:
                continue
            text = w['text'][lang].strip()
            digest = hashlib.sha1((text + tts.__name__ + os.environ.get('KOKORO_VOICE', '')).encode()).hexdigest()[:12]
            d = os.path.join(ROOT, 'audio', w['id']); os.makedirs(d, exist_ok=True)
            mf = os.path.join(d, f'{lang}.json')
            if os.path.exists(mf) and json.load(open(mf, encoding='utf-8')).get('hash') == digest:
                continue
            sents, files, voice = split(text), [], ''
            for old in os.listdir(d):
                if old.startswith(lang + '-') and old.endswith('.mp3'):
                    os.remove(os.path.join(d, old))
            for i, s in enumerate(sents):
                audio, voice = tts(s, lang)
                name = f'{lang}-{i + 1:02d}.mp3'
                open(os.path.join(d, name), 'wb').write(audio)
                files.append(name)
            json.dump({'hash': digest, 'voice': voice, 'sentences': sents, 'files': files},
                      open(mf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            made += 1
            print(f'{w["id"]} {lang}: {len(files)} clips ({voice})')
    print(f'done, {made} narrations generated')

if __name__ == '__main__':
    main()
