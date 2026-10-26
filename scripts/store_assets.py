"""Google Play store listing images: phone screenshots of the app (Play mode) + 1024x500 feature graphic."""
# Run after the Pages deploy finishes: the screenshots use the live site (retake: dynamic work count).
import asyncio, os
from playwright.async_api import async_playwright
SITE = 'https://probe2928-crypto.github.io/qurator/'
OUT = os.environ.get('OUT', 'store'); os.makedirs(OUT, exist_ok=True)
SHOTS = [('01-home', '#/'), ('02-today', '#/today'), ('03-artwork', '#/w/w-starry'), ('04-korean', '#/w/k-sehando'),
         ('05-features', '#/features/hot-30-2026'), ('06-explore', '#/explore')]
FEATURE = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,500;1,400&family=Noto+Serif+KR:wght@600&family=Cormorant+Garamond:ital@1&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1024px;height:500px;background:#14120F;overflow:hidden;font-family:'Noto Serif KR',serif}
.art{position:absolute;inset:0 0 0 400px;background:url('https://commons.wikimedia.org/wiki/Special:FilePath/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg?width=1400') 50% 40%/cover}
.art:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#14120F 0,rgba(20,18,15,.55) 22%,rgba(20,18,15,0) 55%)}
.copy{position:absolute;left:64px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center;color:#F3EFE6}
.mono{width:54px;height:54px;margin-bottom:22px}.word{font-family:'Bodoni Moda',serif;font-weight:500;font-size:58px;letter-spacing:.16em;line-height:1}
.rule{width:56px;height:1px;background:#A8361F;margin:26px 0 22px}.ko{font-size:27px;line-height:1.5;letter-spacing:-.01em}
.en{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:22px;color:#cfc6b4;margin-top:12px}</style></head><body>
<div class="art"></div><div class="copy">
<svg class="mono" viewBox="0 0 40 40"><path fill="#F3EFE6" fill-rule="evenodd" d="M20 4C12.5 4 6.5 10.7 6.5 19S12.5 34 20 34 33.5 27.3 33.5 19 27.5 4 20 4Zm0 .7c-5.4 0-9.9 6.4-9.9 14.3S14.6 33.3 20 33.3 29.9 26.9 29.9 19 25.4 4.7 20 4.7Z"/><path fill="#A8361F" d="M18.4 31.3c4.3-.6 9.6 1.6 17.1 6.8l-.6.8c-7-4.5-12-6.5-16.3-6.3Z"/></svg>
<div class="word">QURATOR</div><div class="rule"></div>
<div class="ko">매일 아침 세 점의 명작,<br>도슨트의 목소리로.</div><div class="en">Daily Art · Masterpieces, told by a docent</div></div></body></html>"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 360, 'height': 640}, device_scale_factor=3, locale='ko-KR', is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        await pg.goto(SITE + '?src=twa#/', wait_until='networkidle'); await pg.wait_for_timeout(2500)
        for name, h in SHOTS:
            await pg.evaluate(f"location.hash = '{h}'"); await pg.wait_for_timeout(6000); await pg.evaluate('window.scrollTo(0, 0)')
            await pg.evaluate("document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'))"); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'{OUT}/phone-{name}.png')
            print('shot', name)
        f = await b.new_page(viewport={'width': 1024, 'height': 500})
        await f.set_content(FEATURE, wait_until='networkidle'); await f.wait_for_timeout(2500)
        await f.screenshot(path=f'{OUT}/feature-graphic-1024x500.png')
        await b.close()
asyncio.run(main())
