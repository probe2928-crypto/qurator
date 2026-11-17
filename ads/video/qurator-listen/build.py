#!/usr/bin/env python3
"""Builds both aspect ratios of the QURATOR "3분 해설" (AI docent) ad from src/template.html.

  python3 build.py   -> index.html (9:16) + ../qurator-listen-16x9/index.html (16:9)

Same 1080x1080 core method as luft-seoul / qurator-daily (HOUSE_STYLE §3). The wordmark is the
real path from assets/logo-lockup.svg (src/wordmark.path), split per glyph. The voice-light in S1
is driven by the loudness of the real docent line (src/voice-ko12.wav = audio/k-ssireum/ko-12.mp3).
"""
import math, pathlib, json
import numpy as np
from scipy.io import wavfile

ROOT = pathlib.Path(__file__).parent
DUR = 20.0
WM = (ROOT / "src/wordmark.path").read_text().strip()
GLYPHS = [(0.6, 23.0), (25.0, 47.6), (50.0, 63.6), (64.0, 85.2), (85.4, 101.6), (102.6, 126.0), (128.0, 141.6)]
VY, VH = -29.0, 40.0
ASPECT = 1747 / 2079  # k-ssireum.jpg


def wordmark(scale):
    out = []
    for x0, x1 in GLYPHS:
        w = x1 - x0
        out.append(f'<span class="mask"><svg width="{w*scale:.1f}" height="{VH*scale:.1f}" viewBox="{x0} {VY} {w} {VH}"><use href="#wmp" fill="currentColor"/></svg></span>')
    return "".join(out)


def voice_env():
    sr, x = wavfile.read(ROOT / "src/voice-ko12.wav")
    x = x.astype(float) / 32768
    hop = sr // 30
    e = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x), hop)])
    e = np.clip(e / np.percentile(e, 96), 0, 1) ** 0.8
    return json.dumps([round(float(v), 3) for v in e])


LAND_CSS = """
#s2-caps{left:-300px;top:400px;width:520px;height:300px}
.cap2{top:0;width:520px;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:12px}
.cap2 .n{font-size:28px}
.cap2 .t{font-size:72px;line-height:1.14}
#s4-cap{left:60px}
#s3-stage{-webkit-mask-image:none;mask-image:none}
"""


def build(fmt):
    P = fmt == "portrait"
    if P:
        W, H, OX, OY, res, out = 1080, 1920, 0, 240, "portrait", "index.html"
    else:
        W, H, OX, OY, res, out = 1920, 1080, 420, 0, "landscape", "../qurator-listen-16x9/index.html"
    # S1 cover image + camera
    if P:
        PH = H; PW = PH * ASPECT
    else:
        PW = W; PH = PW / ASPECT
    PL, PT = (1080 - PW) / 2 if P else (1080 - PW) / 2, (H - PH) / 2 - OY
    # pic lives in #s1-art (full frame, not the core) → left/top in frame px
    PL, PT = (W - PW) / 2, (H - PH) / 2
    def cam(s, px, py, ty):
        return round(-s * (px - .5) * PW), round((ty - H / 2) - s * (py - .5) * PH)
    s0 = .93 if P else .6                        # frame 0: the whole ring, so the viewer can search
    x0, y0 = cam(s0, .5, .5, H * (.5 if P else .5))
    s1 = 1.3 if P else .85                       # then a clear push onto the wrestlers
    x1, y1 = cam(s1, .58, .5, H * (.42 if P else .5))
    # hero
    IMG_W = 520; IMG_H = round(IMG_W / ASPECT)
    RW, RH = IMG_W + 24, IMG_H + 24
    hs = 1.5 if P else 1.15
    hcy = 520 if P else 540
    htop = hcy - RH / 2
    pt_lx, pt_ly = 12 + .19 * IMG_W, 12 + .485 * IMG_H   # the taffy seller's face (push target)
    ls = 54                                               # thin Q frame around the face (face stays visible)
    loupe_l, loupe_t = pt_lx - ls * 80 / 164, pt_ly - ls * 80 / 164
    push_ty = 370 if P else 360
    push_tx = 445 if P else 520
    big_s = 4.6 if P else 6.0
    eph_s = 0.94 if P else 0.95
    eph_x = round((1080 - 470 * eph_s) / 2) if P else 647
    eph_y = 136 if P else 150
    swoosh_y = 790
    iris_x, iris_y = 820, swoosh_y - 14
    tokens = dict(
        W=W, H=H, OX=OX, OY=OY, RES=res, DUR=DUR, S7DUR=round(DUR - 17.1, 2), LAND=0 if P else 1,
        GLOWY=round((OY + 480) / H * 100, 1),
        WM_PATH=WM, WM_S7=wordmark(big_s),
        PIC_L=round(PL), PIC_T=round(PT), PIC_W=round(PW), PIC_H=round(PH),
        S1_S0=s0, S1_X0=x0, S1_Y0=y0, S1_S1=s1, S1_X1=x1, S1_Y1=y1, S1_S2=.62 if P else .5, S1_Y2=160 if P else 60,
        SHADE_A=20 if P else 22, SHADE_B=50 if P else 58, SHADE_C=70 if P else 80,
        HEAD_Y=-40 if P else 40, SUB_Y=850 if P else 780, VOICE_Y=1092 if P else 1022, SCRIM_T=780 if P else 680,
        HL_T=346, HL_H=94, HL_CY=120 + 13 + 393,
        PHONE_SCALE=1.55 if P else 1.0, PHONE_TX=0 if P else 250,
        RING_S=1.68 if P else 1.15, RING_Y=650 if P else 500, NAMES_Y=1000 if P else 900,
        HERO_S=hs, HERO_TOP=round(htop, 1), HERO_CY=hcy, RIG_W=RW, RIG_H=RH, RIG_L=540 - RW // 2, IMG_W=IMG_W, IMG_H=IMG_H,
        PT_LX=round(pt_lx, 1), PT_LY=round(pt_ly, 1),
        LOUPE_L=round(loupe_l, 1), LOUPE_T=round(loupe_t, 1),
        LOUPE_S=ls, DIM_L=round(loupe_l + ls * 14 / 164, 1), DIM_T=round(loupe_t + ls * 14 / 164, 1), DIM_S=round(ls * 132 / 164, 1),
        PUSH_S=2.75, PUSH_TX=push_tx, PUSH_TY=push_ty,
        LEAD_X=push_tx - 1, LEAD_Y=push_ty + 110, LEAD_H=60, S4CAP_Y=push_ty + 190,
        STRIP_Y=390 if P else 300, CAM_L=-120 if P else -420, CAM_W=1320 if P else 1920, STRIP_L=126 if P else 270, STRIP_X0=0 if P else 40, STRIP_X1=-860 if P else -40, STRIP_SC=1.4 if P else 1.0, CARD_Y=0 if P else 0,
        SWOOSH_Y=swoosh_y,
        IRISX=OX + iris_x, IRISY=OY + iris_y, IRISR=int(math.hypot(W, H)) + 40,
        BIG_L=round((1080 - 141.0 * big_s) / 2) if P else -340, BIG_T=-72 if P else 220,
        EPH_X=eph_x, EPH_Y=eph_y, EPH_S=eph_s, EPH_W=round(470 * eph_s), EPH_H=round(815 * eph_s),
        SPEC_GAP=24 if P else 40,
        CTA_L=0 if P else -340, CTA_Y=994 if P else 580, BADGE_Y=920 if P else 490, BAND_T=1330 if P else 900, BAND_H=590 if P else 180, SHELF_Y=1440 if P else 0, SHELF_D='flex' if P else 'none', CTA_W=1080 if P else 960, CTA_J="center" if P else "flex-start",
        VOICE_ENV=voice_env(),
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
