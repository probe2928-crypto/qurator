"""Google Play store listing images: phone screenshots of the app (Play mode) + 1024x500 feature graphic."""
# Run after the Pages deploy finishes: the screenshots use the live site (retake: dynamic work count).
import asyncio, os, json
# the native QR button the iOS app adds (app/shell/qurator-app.js + .css), drawn into the App Store screenshots
SCAN_CSS = open(os.path.join(os.path.dirname(__file__), '..', 'app', 'shell', 'qurator-app.css')).read()
SCAN_BTN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>'
from playwright.async_api import async_playwright
SITE = 'https://probe2928-crypto.github.io/qurator/'
OUT = os.environ.get('OUT', 'store'); os.makedirs(OUT, exist_ok=True)
IOS = os.environ.get('IOS') == '1'   # IOS=1 → App Store screenshots of the iOS app mode
SHOTS = [('01-home', '#/'), ('02-today', '#/today'), ('03-artwork', '#/w/w-kandinsky7'), ('04-korean', '#/w/k-sehando'),
         ('05-features', '#/features/hot-30-2026'), ('06-explore', '#/explore')]
FEATURE = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,500;1,400&family=Noto+Serif+KR:wght@600&family=Cormorant+Garamond:ital@1&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1024px;height:500px;background:#14120F;overflow:hidden;font-family:'Noto Serif KR',serif}
.art{position:absolute;inset:0 0 0 400px;display:flex}.art i{flex:1;display:block}.art .a1{background:url('https://commons.wikimedia.org/wiki/Special:FilePath/Dream_Journey_to_the_Peach_Blossom_Land.jpg?width=900') 82% 50%/cover}.art .a2{background:url('https://commons.wikimedia.org/wiki/Special:FilePath/Composition_VII_-_Wassily_Kandinsky%2C_GAC.jpg?width=900') 46% 50%/cover}
.art:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#14120F 0,rgba(20,18,15,.55) 22%,rgba(20,18,15,0) 55%)}
.copy{position:absolute;left:64px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center;color:#F3EFE6}
.mono{width:54px;height:54px;margin-bottom:22px}.word{font-family:'Bodoni Moda',serif;font-weight:500;font-size:58px;letter-spacing:.16em;line-height:1}
.rule{width:56px;height:1px;background:#A8361F;margin:26px 0 22px}.ko{font-size:27px;line-height:1.5;letter-spacing:-.01em}
.en{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:22px;color:#cfc6b4;margin-top:12px}</style></head><body>
<div class="art"><i class="a1"></i><i class="a2"></i></div><div class="copy">
<svg class="mono" xmlns="http://www.w3.org/2000/svg" viewBox="19.5 24 161 161"><defs><clipPath id="qst"><rect x="30" y="26" width="140" height="140" rx="5"/></clipPath></defs><path fill="#A8361F" d="M93,137 C93,153 96,165 106,171 C116,177 130,177 142,172 L142.5,173.6 C128,181 110,183 99,177 C88,170 86,154 87,137 Z"/><rect x="30" y="26" width="140" height="140" rx="5" fill="#A8361F"/><g clip-path="url(#qst)" fill="#F3EFE6"><path fill-rule="evenodd" d="M63,92 A37,49 0 1 0 137,92 A37,49 0 1 0 63,92 Z M78.5,92 A21.5,46 0 1 0 121.5,92 A21.5,46 0 1 0 78.5,92 Z"/><path d="M93,137 C93,153 96,165 106,171 C116,177 130,177 142,172 L142.5,173.6 C128,181 110,183 99,177 C88,170 86,154 87,137 Z"/></g></svg>
<div class="word">QURATOR</div><div class="rule"></div>
<div class="ko">고전과 현대, 매일 세 점.<br>도슨트의 목소리로.</div><div class="en">Daily Art · Masterpieces, told by a docent</div></div></body></html>"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        if IOS:   # App Store iPhone 6.9" 1320x2868, iOS app mode (window.QURATOR_APP)
            ctx = await b.new_context(viewport={'width': 440, 'height': 956}, device_scale_factor=3, locale='ko-KR', is_mobile=True, has_touch=True)
            await ctx.add_init_script("window.QURATOR_APP = { remote: '%s', ios: true }; document.addEventListener('DOMContentLoaded', () => { document.documentElement.classList.add('q-store-app'); const css = document.createElement('style'); css.textContent = SCAN_CSS; document.head.appendChild(css); const b = document.createElement('button'); b.className = 'q-scan'; b.innerHTML = SCAN_BTN; const tr = document.querySelector('.top-right'); if (tr) tr.insertBefore(b, tr.firstChild); else document.body.appendChild(b); });".replace('SCAN_CSS', json.dumps(SCAN_CSS)).replace('SCAN_BTN', json.dumps(SCAN_BTN)) % SITE)
        else:
            ctx = await b.new_context(viewport={'width': 360, 'height': 640}, device_scale_factor=3, locale='ko-KR', is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        await pg.goto(SITE + ('#/' if IOS else '?src=twa#/'), wait_until='networkidle'); await pg.wait_for_timeout(2500)
        for name, h in SHOTS:
            await pg.evaluate(f"location.hash = '{h}'"); await pg.wait_for_timeout(6000); await pg.evaluate('window.scrollTo(0, 0)')
            await pg.evaluate("document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'))"); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'{OUT}/{"ios" if IOS else "phone"}-{name}.png')
            print('shot', name)
        if IOS:
            await b.close(); return
        f = await b.new_page(viewport={'width': 1024, 'height': 500})
        await f.set_content(FEATURE, wait_until='networkidle'); await f.wait_for_timeout(2500)
        await f.screenshot(path=f'{OUT}/feature-graphic-1024x500.png')
        await b.close()
asyncio.run(main())
