#!/usr/bin/env python3
"""Builds both aspect ratios of the QURATOR Daily Art ad from src/template.html.

  python3 build.py   -> index.html (9:16) + ../qurator-daily-16x9/index.html (16:9)

Same 1080x1080 core method as luft-seoul (HOUSE_STYLE §3). The wordmark is the real
path from assets/logo-lockup.svg (saved in src/wordmark.path), split per glyph.
"""
import math, pathlib

ROOT = pathlib.Path(__file__).parent
DUR = 20.0
WM = (ROOT / "src/wordmark.path").read_text().strip()
# glyph x-ranges of the lockup path: q u r a t o r
GLYPHS = [(0.6, 23.0), (25.0, 47.6), (50.0, 63.6), (64.0, 85.2), (85.4, 101.6), (102.6, 126.0), (128.0, 141.6)]
VY, VH = -29.0, 40.0

def wordmark(scale):
    out = []
    for x0, x1 in GLYPHS:
        w = x1 - x0
        out.append(f'<span class="mask"><svg width="{w*scale:.1f}" height="{VH*scale:.1f}" viewBox="{x0} {VY} {w} {VH}"><use href="#wmp" fill="currentColor"/></svg></span>')
    return "".join(out)

LAND_CSS = """
#s2-caps{left:-300px;top:400px;width:520px;height:300px}
.cap2{top:0;width:520px;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:12px}
.cap2 .n{font-size:28px}
.cap2 .t{font-size:72px;line-height:1.14}
#s5-card{left:-370px;top:250px;width:560px}
#s5-steps{flex-wrap:wrap;row-gap:46px}
#s5-steps span{width:50%}
#s5-track{display:none}
#s4-cap{left:60px}
#s3-stage{-webkit-mask-image:none;mask-image:none}
"""

def build(fmt):
    P = fmt == "portrait"
    if P:
        W, H, OX, OY, res, out = 1080, 1920, 0, 240, "portrait", "index.html"
    else:
        W, H, OX, OY, res, out = 1920, 1080, 420, 0, "landscape", "../qurator-daily-16x9/index.html"
    hs = 1.55 if P else 1.2
    hcy = 520 if P else 540
    htop = hcy - 314
    pt_lx, pt_ly = 12 + .337 * 536, 12 + .597 * 604
    ls = 36
    loupe_l, loupe_t = pt_lx - ls * 80 / 164, pt_ly - ls * 80 / 164
    push_ty = 360 if P else 330
    push_tx = 540 if P else 600
    big_s = 6.2 if P else 6.0
    eph_s = 0.9 if P else 0.95
    eph_x = 328 if P else 647
    eph_y = 262 if P else 150
    swoosh_y = 790
    iris_x, iris_y = 820, swoosh_y - 14
    tokens = dict(
        W=W, H=H, OX=OX, OY=OY, RES=res, DUR=DUR, S7DUR=round(DUR - 17.1, 2), LAND=0 if P else 1,
        GLOWY=round((OY + 480) / H * 100, 1),
        WM_PATH=WM, WM_S1=wordmark(5.2), WM_S7=wordmark(big_s),
        PHONE_SCALE=1.55 if P else 1.0, PHONE_TX=0 if P else 250, CAM_Y=-330 if P else -224,
        RING_S=1.5 if P else 1.15, RING_Y=560 if P else 500, NAMES_Y=960 if P else 900,
        HERO_S=hs, HERO_TOP=htop, HERO_CY=hcy,
        PT_LX=round(pt_lx, 1), PT_LY=round(pt_ly, 1),
        LOUPE_L=round(loupe_l, 1), LOUPE_T=round(loupe_t, 1),
        LOUPE_S=ls, DIM_L=round(loupe_l + ls * 21 / 164, 1), DIM_T=round(loupe_t + ls * 21 / 164, 1), DIM_S=round(ls * 118 / 164, 1),
        PUSH_S=3.0, PUSH_TX=push_tx, PUSH_TY=push_ty,
        LEAD_X=push_tx - 1, LEAD_Y=push_ty + (100 if P else 80), LEAD_H=50, S4CAP_Y=push_ty + (170 if P else 150),
        STRIP_Y=330 if P else 160, STRIP_X=0 if P else 180, TH_H=250 if P else 200, HALO_H=870 if P else 720,
        HOOK_Y=860, SCRIM_L=-110 if P else 310, SCRIM_T=OY + 860 - 180, WORDS_L=305 if P else -330, WORDS_T=700 if P else 640,
        ART_L=-181 if P else 84, ART_T=-673 if P else -1271, ART_W=2140 if P else 2600, ART_H=2400 if P else 2916,
        ART_OX=721 if P else 876, ART_OY=1433 if P else 1741, SWOOSH_Y=swoosh_y,
        IRISX=OX + iris_x, IRISY=OY + iris_y, IRISR=int(math.hypot(W, H)) + 40,
        BIG_L=round((1080 - 141.0 * big_s) / 2) if P else -340, BIG_T=-40 if P else 250,
        EPH_X=eph_x, EPH_Y=eph_y, EPH_S=eph_s, EPH_W=round(470 * eph_s), EPH_H=round(815 * eph_s),
        CTA_L=0 if P else -340, CTA_Y=1012 if P else 600, CTA_W=1080 if P else 960, CTA_J="center" if P else "flex-start",
        EXTRA_CSS="" if P else LAND_CSS,
    )
    html = (ROOT / "src/template.html").read_text()
    for k, v in tokens.items():
        html = html.replace("{{" + k + "}}", str(v))
    assert "{{" not in html, html[html.index("{{"):html.index("{{") + 40]
    (ROOT / out).parent.mkdir(exist_ok=True)
    (ROOT / out).write_text(html)
    print("wrote", out, W, "x", H)

if __name__ == "__main__":
    for fmt in ("portrait", "landscape"):
        build(fmt)
