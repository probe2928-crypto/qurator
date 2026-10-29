// 사이트(../index.html · assets/ · data/)를 iOS 앱 화면(www/)으로 옮긴다.
// - 작품 데이터·음성은 앱이 실행될 때 사이트에서 받아옴(새 작품이 앱 업데이트 없이 보임). data/는 오프라인 대비 사본
// - 음성(audio/, 50MB+)은 앱에 넣지 않고 사이트에서 재생
// - shell/qurator-app.js 가 app.js보다 먼저 실행돼 window.QURATOR_APP 을 채움 → app.js가 iOS 앱 규칙(결제·멤버 코드 없음)으로 동작
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(process.env.QURATOR_SITE || path.join(APP, ".."));
const OUT = path.join(APP, "www");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const d of ["assets", "data"]) fs.cpSync(path.join(SITE, d), path.join(OUT, d), { recursive: true });
for (const f of fs.readdirSync(path.join(APP, "shell"))) fs.copyFileSync(path.join(APP, "shell", f), path.join(OUT, f));

let html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
const m = html.match(/<script src="assets\/app\.js\?v=\d+"><\/script>/);
if (!m) throw new Error("사이트 index.html에서 app.js 스크립트를 못 찾음");
html = html.replace(m[0], '<script src="qurator-app.js"></script>' + m[0]);
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', "");
html = html.replace("</head>", '<link rel="stylesheet" href="qurator-app.css">\n</head>');
fs.writeFileSync(path.join(OUT, "index.html"), html);
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`www 준비 완료: ${(size(OUT) / 1e6).toFixed(1)}MB`);
