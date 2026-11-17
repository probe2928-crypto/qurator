#!/usr/bin/env python3
"""Synthesised sound design for the QURATOR "3분 해설" ad.

Everything is synthesised here except the docent line itself: src/voice-ko12.wav is the product's
own narration file (audio/k-ssireum/ko-12.mp3, made by scripts/narrate.py, Supertonic 3 voice M5),
used as the product demo. No outside music or samples.

  python3 src/sound.py  ->  assets/audio/qurator-listen-mix.wav (48 kHz stereo, 20 s)

Cue times come from the GSAP timeline in src/template.html; each hit lands one frame
(33 ms) after its picture. Edit CUES below when the timeline moves.
"""
import numpy as np, pathlib
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

import sys
TARGET_RMS = float(sys.argv[1]) if len(sys.argv) > 1 else -15.5
SR = 48000; DUR = 20.0; N = int(SR * DUR); F = 1 / 30
rng = np.random.default_rng(20261117)
out = np.zeros((N, 2))

def t_(d): return np.arange(int(d * SR)) / SR
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def add(x, at, gain=1.0, pan=0.0):
    i = int((at) * SR); x = x[: max(0, N - i)]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[i : i + len(x), 0] += x * gain * l * 1.414; out[i : i + len(x), 1] += x * gain * r * 1.414
def env(n, a, d):  # attack / exponential decay
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d); return e

# ---- the docent line (product audio), lightly EQ'd, centred; everything else ducks under it
sr_v, v = wavfile.read(pathlib.Path(__file__).resolve().parent / "voice-ko12.wav")
v = v.astype(float) / 32768
v = hp(v, 90); v = v / max(np.abs(v).max(), 1e-9)
VOICE_AT = 0.0
add(v, VOICE_AT, 0.62, 0.0)
voice_end = VOICE_AT + len(v) / SR

# ---- pad bed: D major add9 under the voice → G lydian from the hero → back to D for the end
def pad(freqs, start, end, gain, fade_in=1.2, fade_out=1.0):
    t = t_(end - start); x = np.zeros_like(t)
    for k, f in enumerate(freqs):
        for det in (-0.12, 0.12):
            ph = rng.uniform(0, 2 * np.pi)
            x += np.sin(2 * np.pi * (f + det) * t + ph) + 0.22 * np.sin(4 * np.pi * (f + det) * t + ph)
    x *= (0.78 + 0.22 * np.sin(2 * np.pi * 0.16 * t))
    x = lp(x, 2000); e = np.minimum(1, t / fade_in) * np.minimum(1, (t[-1] - t) / fade_out)
    return x * e * gain / len(freqs)
add(pad([73.4, 146.8, 220, 293.7, 329.6, 440], 0.0, 11.0, 0.11, 0.6, 0.4), 0.0)
add(pad([49.0, 98.0, 196, 246.9, 293.7, 277.2, 587.3], 10.7, 17.25, 0.16, 0.6, 0.5), 10.7)
add(pad([36.7, 73.4, 146.8, 220, 277.2, 329.6, 659.3], 17.1, 20.0, 0.18, 0.25, 0.9), 17.1)

def kick(g=1.0):
    t = t_(0.35); f = 46 + 54 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * env(len(t), 0.004, 0.12)
    return lp(x, 900) * g
beat = 60 / 100
for k in range(int((9.75 - 2.8) / beat)):
    g = 0.2 if 2.8 + k * beat < voice_end else (0.34 if k % 2 == 0 else 0.24)
    add(kick(g), 2.8 + F + k * beat)
for k in range(int((15.2 - 13.0) / beat)):
    add(kick(0.26), 13.0 + F + k * beat)
for k in range(int((6.9 - 3.1) / beat)):
    n = rng.standard_normal(int(0.05 * SR)); add(bp(n, 5000, 11000) * env(len(n), 0.002, 0.016), 3.1 + beat / 2 + k * beat, 0.028, 0.3 * (-1) ** k)

# ---- frame 0: a soft room breath + paper air as the painting opens on the wrestlers
n = rng.standard_normal(int(1.4 * SR)); t = t_(1.4); add(bp(n, 300, 2400) * np.sin(np.pi * t / 1.4) ** 2, 0.0, 0.05)
tt = t_(1.6); add(np.sin(2 * np.pi * 880 * tt) * env(len(tt), 0.01, 0.6) * 0.4 + np.sin(2 * np.pi * 1318.5 * tt) * env(len(tt), 0.01, 0.4) * 0.2, 0.02, 0.05, 0.2)

def whoosh(d, lo, hi, up=True, g=1.0):
    t = t_(d); n = rng.standard_normal(len(t)); fc = np.geomspace(lo, hi, len(t)) if up else np.geomspace(hi, lo, len(t))
    y = np.zeros_like(t); bands = np.geomspace(min(lo, hi), max(lo, hi), 7)
    for b0, b1 in zip(bands[:-1], bands[1:]):
        w = np.exp(-((np.log(fc) - np.log((b0 * b1) ** 0.5)) ** 2) / 0.18); y += bp(n, b0, b1) * w
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.6
    return y * e * g
for at, d, lo, hi, up, g, pan in [
    (2.6, 0.55, 2600, 300, False, 0.12, 0.0),    # painting shrinks into the phone
    (2.78, 0.6, 250, 2000, True, 0.1, 0.2),      # phone rises
    (4.4, 0.75, 250, 1800, True, 0.07, 0.0),     # docent tour camera moves in
    (6.0, 0.7, 300, 2200, True, 0.06, 0.0),      # push onto the lit sentence
    (6.9, 0.6, 2500, 250, False, 0.22, -0.2),    # phone drops away
    (7.12, 0.8, 200, 2400, True, 0.15, 0.3),     # cards fan out
    (9.3, 0.5, 600, 4500, True, 0.18, 0.0),      # cards gather
    (9.8, 1.1, 180, 1400, True, 0.12, -0.3),     # hero swing
    (10.62, 0.78, 250, 2000, True, 0.12, 0.0),    # macro push to the taffy seller
    (12.46, 0.45, 2000, 300, False, 0.13, 0.0),   # pull back
    (12.8, 0.45, 3500, 250, False, 0.16, 0.0),   # hero leaves
    (12.95, 0.7, 250, 2600, True, 0.13, 0.2),    # tour stops arrive
    (15.84, 0.3, 500, 3500, True, 0.1, 0.0),     # copy swap
    (16.9, 0.6, 250, 3500, True, 0.2, 0.0),      # iris flood
]:
    add(whoosh(d, lo, hi, up, 1.0), at, g, pan)

def tick(f=2200, d=0.03, g=1.0):
    t = t_(d); n = rng.standard_normal(len(t)); return (bp(n, f * 0.6, f * 1.6) + 0.6 * np.sin(2 * np.pi * f * t)) * env(len(t), 0.0008, d / 5) * g
add(tick(2400, 0.03), 5.82 + F, 0.15)
t = t_(0.35); add(bp(rng.standard_normal(len(t)), 900, 4000) * np.sin(np.pi * t / 0.35) ** 2, 5.86, 0.05)
tt = t_(0.9); add((np.sin(2 * np.pi * 1174.7 * tt) * 0.6 + np.sin(2 * np.pi * 1760 * tt) * 0.25) * env(len(tt), 0.006, 0.25), 6.3 + F, 0.07)
# ---- loupe: air as the mark draws, a soft lens click, then a clear glass tone (no boom)
t = t_(0.36); n = rng.standard_normal(len(t)); add(bp(n, 2500, 9000) * np.sin(np.pi * t / 0.36) ** 2, 11.32, 0.05)
t = t_(0.5)
click = bp(rng.standard_normal(len(t)), 1800, 7000) * env(len(t), 0.0005, 0.008)
body = lp(np.sin(2 * np.pi * 180 * t), 800) * env(len(t), 0.002, 0.05)
sub = np.sin(2 * np.pi * 61.7 * t) * env(len(t), 0.01, 0.25)
add(click * 0.8 + body * 0.35 + sub * 0.35, 11.66 + F, 0.5)
tt = t_(2.0)
glass = sum(a * np.sin(2 * np.pi * f * tt) * env(len(tt), 0.003, d) for f, a, d in [(1760, .5, .7), (2637, .28, .5), (3520, .14, .35), (4699, .06, .2)])
add(glass, 11.68 + F, 0.09, 0.15)
# ---- the tour: light along the line, a soft chime as each stop lights (times from drawTour)
t = t_(1.5); ph = 2 * np.pi * np.cumsum(np.geomspace(440, 880, len(t))) / SR
add(np.sin(ph) * np.sin(np.pi * t / 1.5) ** 2 * 0.25 + bp(rng.standard_normal(len(t)), 2000, 6000) * np.sin(np.pi * t / 1.5) ** 2 * 0.12, 13.25, 0.09)
for k, (at, f) in enumerate(zip([13.55, 13.82, 14.0, 14.18, 14.45], [1174.7, 1318.5, 1480.0, 1568.0, 1760.0])):
    tt = t_(0.6); add(np.sin(2 * np.pi * f * tt) * env(len(tt), 0.003, 0.18), at + F, 0.06, (k - 2) * 0.2)
for k in range(4):
    add(tick(3000 - k * 120, 0.02), 13.2 + k * 0.4 + F, 0.06, (k % 2 - .5) * 0.4)
# ---- copy: underline shimmer; end card: warm wordmark hit + CTA tick
n = rng.standard_normal(int(0.5 * SR)); t = t_(0.5); add(bp(n, 4000, 10000) * np.sin(np.pi * t / 0.5) ** 2, 16.55, 0.07)
tt = t_(1.6); add(lp(np.sin(2 * np.pi * 73.4 * tt) + 0.6 * np.sin(2 * np.pi * 146.8 * tt) + 0.3 * np.sin(2 * np.pi * 293.7 * tt), 1200) * env(len(tt), 0.006, 0.55), 17.28 + F, 0.42)
add(tick(1600, 0.05), 17.4 + F, 0.16)

# ---- room: short plate on everything
ir_t = t_(0.9); ir = rng.standard_normal((len(ir_t), 2)) * np.exp(-ir_t / 0.22)[:, None]
ir[:, 0] = hp(ir[:, 0], 250); ir[:, 1] = hp(ir[:, 1], 250)
wet = np.stack([fftconvolve(out[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = out + wet * (0.18 / np.abs(ir).sum(0).max() * 40)

# master: fade tail, gentle limit, normalise towards ~ -15 LUFS-ish RMS, peak ≤ -1 dBFS
tail = np.ones(N); i0 = int((DUR - 0.7) * SR); tail[i0:] = np.linspace(1, 0, N - i0) ** 1.5
mix *= tail[:, None]
rms = np.sqrt(np.mean(mix ** 2)); mix *= 10 ** (TARGET_RMS / 20) / max(rms, 1e-9)
mix = np.tanh(mix * 1.2) / 1.2
mix *= 10 ** (-1.2 / 20) / max(np.abs(mix).max(), 1e-9) if np.abs(mix).max() > 10 ** (-1.2 / 20) else 1
dst = pathlib.Path(__file__).resolve().parent.parent / "assets/audio/qurator-listen-mix.wav"
wavfile.write(dst, SR, (mix * 32767).astype(np.int16))
print("wrote", dst, "peak", round(20 * np.log10(np.abs(mix).max()), 2), "dBFS rms", round(20 * np.log10(np.sqrt(np.mean(mix ** 2))), 2))
