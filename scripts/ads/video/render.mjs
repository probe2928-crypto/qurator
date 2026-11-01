import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'child_process';
import fs from 'fs';
const [ad, h, outp, times] = process.argv.slice(2);
const H = +h;
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.error('PAGEERR', e.message));
await p.goto(`file://${process.cwd()}/ad.html?ad=${ad}&h=${H}`);
const DUR = await p.evaluate(() => window.ready);
const shot = async t => { await p.evaluate(t => window.render(t), t); return p.screenshot({ type: 'jpeg', quality: 92 }); };
if (times) {
  for (const t of times.split(',').map(Number)) fs.writeFileSync(`${outp}-${t}.jpg`, await shot(t));
} else {
  const tmp = outp.replace(/\.mp4$/, '.part.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(DUR * 30);
  for (let i = 0; i < N; i++) { const buf = await shot(i / 30); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code === 0) fs.renameSync(tmp, outp); else console.error('ffmpeg failed', code);
}
await b.close();
console.log('done', ad, H, DUR);
