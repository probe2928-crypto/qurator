"""광고 영상 재료: 작품 이미지(퍼블릭 도메인) 고해상도 내려받기 → ad-assets/img/<id>.jpg"""
import json, os, sys, time, urllib.parse, urllib.request
UA = {'User-Agent': 'QURATOR-ads/1.0 (https://probe2928-crypto.github.io/qurator/)'}
def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: return r.read()
        except Exception as e:
            print('retry', url[:90], e); time.sleep(3 * (i + 1))
    return None
def wiki_original(lang, title):
    q = f'https://{lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original|thumbnail&pithumbsize=2000&redirects=1&titles=' + urllib.parse.quote(title)
    b = get(q)
    if not b: return None
    for p in json.loads(b).get('query', {}).get('pages', {}).values():
        t = p.get('thumbnail', {}).get('source') or p.get('original', {}).get('source')
        if t: return t
    return None
os.makedirs('ad-assets/img', exist_ok=True)
W = json.load(open('data/works.json'))
for w in W:
    out = f"ad-assets/img/{w['id']}.jpg"
    if os.path.exists(out): continue
    url = None
    if w.get('commons'): url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(w['commons']) + '?width=2000'
    elif w.get('img'): url = w['img']
    else:
        for lg in (['ko', 'en'] if w['region'] == 'kr' else ['en', 'ko']):
            for t in (w.get('wiki') or {}).get(lg, []) or []:
                url = wiki_original(lg, t)
                if url: break
            if url: break
    if not url: print('no image', w['id']); continue
    b = get(url)
    if b and len(b) > 5000:
        open(out, 'wb').write(b); print('ok', w['id'], len(b))
    else: print('fail', w['id'], url[:100])
    time.sleep(1)
