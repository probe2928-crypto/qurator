// 광고 영상 재료: 라이브 사이트 앱 모드 화면을 1080×1920(360×640 @3x)으로 캡처 → ad-assets/ui/*.jpg
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'https://probe2928-crypto.github.io/qurator/';
fs.mkdirSync('ad-assets/ui', { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
async function page(lang) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, locale: lang === 'en' ? 'en-US' : 'ko-KR', isMobile: true, hasTouch: true });
  await ctx.addInitScript(l => { try { localStorage.setItem('q_lang', JSON.stringify(l)); localStorage.setItem('q_bgm', 'true'); } catch {} }, lang);
  return ctx.newPage();
}
const shot = async (p, name) => { await p.screenshot({ path: `ad-assets/ui/${name}.jpg`, type: 'jpeg', quality: 92 }); console.log('shot', name); };
for (const lang of ['ko', 'en']) {
  const p = await page(lang);
  await p.goto(BASE + '?src=twa#/', { waitUntil: 'networkidle' }); await p.waitForTimeout(5000);
  await shot(p, `${lang}-home`);
  await p.waitForTimeout(6500); await shot(p, `${lang}-home2`);
  await p.goto(BASE + '?src=twa#/today', { waitUntil: 'networkidle' }); await p.waitForTimeout(4000); await shot(p, `${lang}-today`);
  for (const id of ['k-mongyu', 'w-kandinsky7', 'w-milkmaid', 'k-moonjar', 'w-rousseau-gypsy']) {
    await p.goto(BASE + `?src=twa#/w/${id}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(3500);
    await shot(p, `${lang}-view-${id}`);
    try {
      await p.click('#play'); await p.waitForTimeout(7000); await shot(p, `${lang}-immerse-${id}`);
      await p.waitForTimeout(6000); await shot(p, `${lang}-immerse2-${id}`);
      await p.click('.im-x'); await p.waitForTimeout(800);
    } catch (e) { console.log('immerse fail', id, e.message); }
  }
  await p.goto(BASE + '?src=twa#/explore', { waitUntil: 'networkidle' }); await p.waitForTimeout(4000); await shot(p, `${lang}-explore`);
  await p.close();
}
await b.close();
