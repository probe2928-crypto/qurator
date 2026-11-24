#!/usr/bin/env python3
"""QURATOR 「거울 속의 증인」 사운드: 전부 합성 + 제품 자체 도슨트 음성 1문장(voice-ko12.wav = audio/w-arnolfini/ko-12.mp3).
외부 음원 없음. python3 src/sound.py [목표 RMS dB] -> assets/audio/mirror-mix.wav"""
import numpy as np, pathlib
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

import sys
TARGET_RMS = float(sys.argv[1]) if len(sys.argv) > 1 else -15.5
SR = 48000; DUR = 16.2; N = int(SR * DUR); F = 1 / 30
rng = np.random.default_rng(20261124)
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


# ---- the docent line (product narration audio/w-arnolfini/ko-12.mp3), placed at 7.25 s
sr_v, v = wavfile.read(pathlib.Path(__file__).resolve().parent / "voice-ko12.wav")
v = v.astype(float) / 32768; v = hp(v, 90); v = v / max(np.abs(v).max(), 1e-9)
VOICE_AT = 7.10
add(v, VOICE_AT, 0.62, 0.0)

def pad(freqs, start, end, gain, fade_in=1.2, fade_out=1.0):
    t = t_(end - start); x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.1, 0.1):
            ph = rng.uniform(0, 2 * np.pi); x += np.sin(2 * np.pi * (f + det) * t + ph) + 0.2 * np.sin(4 * np.pi * (f + det) * t + ph)
    x *= (0.8 + 0.2 * np.sin(2 * np.pi * 0.14 * t)); x = lp(x, 1800)
    e = np.minimum(1, t / fade_in) * np.minimum(1, (t[-1] - t) / fade_out)
    return x * e * gain / len(freqs)
# quiet room bed: F major 9 (hook, app) -> D minor 7 under the voice -> Bb add9 for the end
add(pad([87.3, 174.6, 261.6, 349.2, 392.0], 0.0, 7.4, 0.10, 0.25, 0.5), 0.0)
add(pad([73.4, 146.8, 220.0, 261.6, 349.2], 7.0, 13.1, 0.08, 0.5, 0.5), 7.0)
add(pad([58.3, 116.5, 233.1, 293.7, 349.2, 523.3], 12.8, 16.2, 0.14, 0.4, 0.9), 12.8)
n = rng.standard_normal(N); add(bp(n, 120, 900) * 0.6, 0.0, 0.018)

def whoosh(d, lo, hi, g=1.0):
    t = t_(d); n = rng.standard_normal(len(t)); y = bp(n, min(lo, hi), max(lo, hi))
    return y * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.8 * g
def tick(f=2200, d=0.03, g=1.0):
    t = t_(d); n = rng.standard_normal(len(t)); return (bp(n, f * 0.6, f * 1.6) + 0.6 * np.sin(2 * np.pi * f * t)) * env(len(t), 0.0008, d / 5) * g
def bell(f, d, g):
    tt = t_(d); return sum(a * np.sin(2 * np.pi * f * m * tt) * env(len(tt), 0.004, d * k) for m, a, k in [(1, .6, .5), (2.76, .2, .25), (5.4, .07, .12)]) * g

add(whoosh(1.05, 300, 2600, 1.0), 2.15, 0.10)          # pull-out into the phone
add(whoosh(0.5, 250, 1800, 1.0), 3.9, 0.06)            # camera pushes into the phone
add(tick(2200, 0.03), 4.35 + F, 0.12)                  # cut: English
add(tick(3000, 0.02), 4.60 + F, 0.07)                  # English tab lit
add(tick(2200, 0.03), 5.80 + F, 0.12)                  # cut: look closer
add(tick(3000, 0.02), 6.30 + F, 0.08)                  # row 02 lit
add(whoosh(0.4, 400, 3200, 1.0), 6.95, 0.08)           # zoom into the row
add(bell(1046.5, 2.2, 1.0), 7.62 + F, 0.05, 0.15)      # light passes over the signature
add(tick(2800, 0.03), 10.0 + F, 0.09)                  # ring
add(bell(1568.0, 1.6, 1.0), 10.32 + F, 0.03, -0.15)    # witness card
t = t_(0.7); add(bp(rng.standard_normal(len(t)), 3500, 9000) * np.sin(np.pi * t / 0.7) ** 2, 12.8, 0.05)  # paper floods in
tt = t_(2.2); add(lp(np.sin(2 * np.pi * 116.5 * tt) + 0.5 * np.sin(2 * np.pi * 233.1 * tt) + 0.25 * np.sin(2 * np.pi * 349.2 * tt), 1400) * env(len(tt), 0.008, 0.7), 13.15 + F, 0.30)
add(bell(1174.7, 1.8, 1.0), 13.55 + F, 0.04)           # CTA

ir_t = t_(0.9); ir = rng.standard_normal((len(ir_t), 2)) * np.exp(-ir_t / 0.24)[:, None]
ir[:, 0] = hp(ir[:, 0], 250); ir[:, 1] = hp(ir[:, 1], 250)
wet = np.stack([fftconvolve(out[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = out + wet * (0.16 / np.abs(ir).sum(0).max() * 40)
tail = np.ones(N); i0 = int((DUR - 0.6) * SR); tail[i0:] = np.linspace(1, 0, N - i0) ** 1.5
mix *= tail[:, None]
rms = np.sqrt(np.mean(mix ** 2)); mix *= 10 ** (TARGET_RMS / 20) / max(rms, 1e-9)
mix = np.tanh(mix * 1.2) / 1.2
pk = np.abs(mix).max()
if pk > 10 ** (-1.2 / 20): mix *= 10 ** (-1.2 / 20) / pk
dst = pathlib.Path(__file__).resolve().parent.parent / "assets/audio/mirror-mix.wav"
wavfile.write(dst, SR, (mix * 32767).astype(np.int16))
print("wrote", dst, "peak", round(20 * np.log10(np.abs(mix).max()), 2), "dBFS rms", round(20 * np.log10(np.sqrt(np.mean(mix ** 2))), 2))
