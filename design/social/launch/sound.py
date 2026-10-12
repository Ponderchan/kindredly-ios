#!/usr/bin/env python3
"""The launch video's sound (adapted from the App Preview's design/store/landing/film/sound.py), made here from nothing (no samples, no licensed music):
a small bouncy groove in F that drops in on the YOINK, and a hit for every
thing the film does — pops, thwacks, her whooshes and wingbeats, the egg's
knocks and crack, the typing in Free Flight, the sad dip when she greys and
the bounce when she's back. The hit list comes from the film itself
(out/film/events.json, logged by film-logic.js as it ran).
  python3 design/store/landing/film/sound.py   → out/film/sound.wav (48 kHz stereo)"""
import json, os, math, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HERE, "out")  # or another video's out dir
SR = 48000
EV = json.load(open(os.path.join(OUT, "events.json")))
FPS_FRAMES = len([f for f in os.listdir(os.path.join(OUT, "frames")) if f.endswith(".jpg")])
END = FPS_FRAMES / 30  # exactly the film's length; the last chord rings into a short fade
N = int(SR * END)
rng = np.random.default_rng(7)

def t_(sec): return np.arange(int(SR * sec)) / SR
def env(n, a=0.004, d=0.2, curve=4.0):
    """attack then exponential decay, n samples"""
    x = np.arange(n) / SR
    e = np.minimum(1, x / max(a, 1e-4)) * np.exp(-curve * np.maximum(0, x - a) / max(d, 1e-4))
    return e
def note_hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, a):  # one-pole low-pass, a in (0,1): smaller = darker
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc); y[i] = acc
    return y
def hp(x, a): return x - lp(x, a)

L = np.zeros(N); R = np.zeros(N)
def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    L[i:i + len(sig)] += sig * l * 1.4142; R[i:i + len(sig)] += sig * r * 1.4142

# ── instruments ─────────────────────────────────────────────────────────────
def kick():
    x = t_(0.32); f = 48 + 110 * np.exp(-x * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.002, 0.16, 3) * 0.9
def clap():
    x = t_(0.22); n = rng.standard_normal(len(x))
    burst = np.zeros(len(x))
    for k in range(3): burst[int(k * 0.011 * SR):] += 1  # three hands
    s = hp(n, 0.35) * env(len(x), 0.001, 0.07, 3) * np.minimum(burst, 1)
    body = np.sin(2 * np.pi * 190 * x) * env(len(x), 0.001, 0.05, 4) * 0.4
    return (s * 0.55 + body)
def hat(open_=False):
    x = t_(0.25 if open_ else 0.06)
    return hp(rng.standard_normal(len(x)), 0.85) * env(len(x), 0.0008, 0.12 if open_ else 0.022, 3) * 0.22
def pluck(m, dur=0.42, bright=1.0):
    """a marimba-ish pluck: sine + a little 4th partial, quick decay"""
    x = t_(dur); f = note_hz(m)
    s = np.sin(2 * np.pi * f * x) + 0.35 * bright * np.sin(2 * np.pi * f * 4.0 * x) * np.exp(-x * 30) + 0.15 * np.sin(2 * np.pi * f * 2 * x)
    return s * env(len(x), 0.002, dur * 0.45, 2.6) * 0.32
def bass(m, dur=0.24):
    x = t_(dur); f = note_hz(m)
    s = np.sign(np.sin(2 * np.pi * f * x)) * 0.3 + np.sin(2 * np.pi * f * x)  # soft square-ish
    return lp(s, 0.08) * env(len(x), 0.004, dur * 0.7, 2.2) * 0.55
def glock(m, dur=0.9):
    x = t_(dur); f = note_hz(m)
    s = np.sin(2 * np.pi * f * x) + 0.4 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 12)
    return s * env(len(x), 0.001, 0.35, 2.4) * 0.22

# ── sound effects ───────────────────────────────────────────────────────────
def pop(pitch=1.0):
    x = t_(0.09); f = (950 - 5200 * x) * pitch
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.001, 0.035, 2.5) * 0.55
def tok():  # a word landing
    x = t_(0.05); f = 520 - 2600 * x
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.0008, 0.018, 2.5) * 0.28
def thwack():
    x = t_(0.3); f = 52 + 160 * np.exp(-x * 24)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.001, 0.12, 3)
    slap = hp(rng.standard_normal(len(x)), 0.5) * env(len(x), 0.0005, 0.03, 3) * 0.5
    return (body + slap) * 0.85
def whoosh(dur=0.32, up=True):
    x = t_(dur); n = rng.standard_normal(len(x))
    sw = np.sin(np.pi * x / dur) ** 2
    a = 0.04 + 0.22 * (x / dur if up else 1 - x / dur)
    y = np.empty_like(n); acc = 0.0
    for i, v in enumerate(n):  # a sweeping band
        acc += a[i] * (v - acc); y[i] = acc
    return hp(y, 0.02) * sw * 0.55
def slide(f0, f1, dur):
    x = t_(dur); f = f0 * (f1 / f0) ** (x / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.004, dur, 0.8) * 0.4
def knock():
    x = t_(0.12); f = 260 + 300 * np.exp(-x * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.0008, 0.04, 3) * 0.5
def crack():
    x = t_(0.22); n = rng.standard_normal(len(x))
    grains = (rng.random(len(x)) < 0.012).astype(float)
    return hp(n * grains * 6 + n * 0.15, 0.6) * env(len(x), 0.001, 0.1, 2.5) * 0.5
def chirp():
    out = np.zeros(int(SR * 0.26))
    for k, (f0, f1) in enumerate([(2300, 3400), (2600, 3800)]):
        s = slide(f0, f1, 0.08) * 0.6
        i = int(k * 0.11 * SR); out[i:i + len(s)] += s
    return out
def key():
    x = t_(0.035)
    return hp(rng.standard_normal(len(x)), 0.7) * env(len(x), 0.0005, 0.008, 2.5) * 0.35 + np.sin(2 * np.pi * 1800 * x) * env(len(x), 0.0005, 0.006, 3) * 0.12
def flap():
    return whoosh(0.16, up=True) * 0.55
def ding(m1=88, m2=93):
    out = np.zeros(int(SR * 0.6)); a = glock(m1, 0.5); b = glock(m2, 0.6)
    out[: len(a)] += a; i = int(0.07 * SR); out[i:i + len(b)] += b[: len(out) - i]
    return out * 1.4
def boing():
    x = t_(0.45); f = 180 + 120 * np.sin(2 * np.pi * 9 * x) * np.exp(-x * 5) + 140 * np.exp(-x * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.003, 0.25, 2) * 0.45
def shake():
    x = t_(0.35); f = 42 + 50 * np.exp(-x * 18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.002, 0.18, 2.5) * 0.7 + hp(rng.standard_normal(len(x)), 0.15) * env(len(x), 0.001, 0.05, 3) * 0.15
def yeet():
    a = slide(500, 1400, 0.3) * 0.6; b = whoosh(0.3) * 0.7; n = min(len(a), len(b))
    return a[:n] + b[:n]

# ── the groove ──────────────────────────────────────────────────────────────
BPM = 116; BEAT = 60 / BPM; BAR = 4 * BEAT
CH = [(53, [65, 69, 72]), (57, [64, 69, 72]), (58, [62, 65, 70]), (60, [64, 67, 72])]   # F, Am, Bb, C
SAD = [(50, [62, 65, 69]), (46, [62, 65, 70])]                                              # Dm, Bb
t_drop = next(e["t"] for e in EV if e["type"] == "drop")
t_end = next(e["t"] for e in EV if e["type"] == "end")

def groove(start, stop, full=True, chords=CH, gain=1.0):
    b = 0; t = start
    while t < stop - 0.05:
        root, tri = chords[b % len(chords)]
        for q in range(4):
            tq = t + q * BEAT
            if tq >= stop: break
            if full:
                if q in (0, 2): add(kick(), tq, 0.7 * gain)
                if q in (1, 3): add(clap(), tq, 0.38 * gain, 0.1)
                add(hat(), tq + BEAT / 2, 0.75 * gain, 0.35)
            add(bass(root - 12 if q % 2 == 0 else root, BEAT * 0.9), tq, 0.7 * gain)
            arp = [tri[0] + 12, tri[1] + 12, tri[2] + 12, tri[1] + 12]
            add(pluck(arp[q], 0.36), tq, 0.5 * gain, -0.25)
            add(pluck(arp[(q + 2) % 4] + (12 if q == 3 else 0), 0.3, 0.7), tq + BEAT / 2, 0.34 * gain, 0.3)
        b += 1; t += BAR

# the title: a bright stab and a sparkle; the groove drops with the first beat
for m in (65, 69, 72, 77): add(pluck(m, 0.9), 0.0, 0.55)
add(glock(89, 1.2), 0.02, 0.8); add(glock(96, 1.0), 0.2, 0.55)
groove(t_drop, t_end, full=True)
for m in (53, 65, 69, 72, 77): add(pluck(m, 1.8, 0.8) if m > 60 else bass(m, 1.6), t_end, 0.65)
add(glock(89, 1.4), t_end + 0.05, 0.8); add(glock(93, 1.4), t_end + 0.2, 0.6); add(glock(96, 1.6), t_end + 0.35, 0.55)

# ── the hits ────────────────────────────────────────────────────────────────
for e in EV:
    t, k = e["t"], e["type"]
    if k == "pop": add(pop(1.0 + 0.08 * ((int(t * 10) % 5) - 2)), t, 0.5, 0.15)
    elif k == "say": add(pop(1.35), t + 0.02, 0.55, 0.25)
    elif k == "tick": add(knock() * 0.5, t, 0.5)
    elif k == "night": pass
    elif k == "slam": add(tok(), t + 0.05, 0.55, -0.1)
    elif k == "slamhl": add(tok(), t + 0.05, 0.6); add(pop(0.8), t + 0.09, 0.4)
    elif k == "thwack": add(thwack(), t, 0.8)
    elif k == "stamp": add(thwack(), t, 0.5); add(pop(1.2), t + 0.02, 0.25)
    elif k == "whoosh": add(whoosh(0.34), t, 0.5, 0.4)
    elif k == "flap": add(flap(), t, 0.55, 0.3)
    elif k == "key": add(key(), t, 0.7, -0.2)
    elif k == "gate": add(ding(), t, 0.7)
    elif k == "count": add(pop(0.9 + 0.12 * e.get("k", 0)), t, 0.45)
    elif k == "shake": add(shake(), t, 0.75)
    elif k == "yoink": add(slide(380, 1700, 0.2), t - 0.12, 0.8); add(thwack(), t, 0.6); add(pop(1.5), t + 0.05, 0.5)
    elif k == "yeet": add(yeet(), t, 0.7, 0.5)
    elif k == "knock": add(knock(), t, 0.7)
    elif k == "crack": add(crack(), t, 0.8)
    elif k == "hatch": add(pop(1.6), t, 0.6); add(glock(84, 0.6), t + 0.02, 0.5)
    elif k == "chirp": add(chirp(), t, 0.5, 0.2)
    elif k == "typing":
        for j in range(e.get("n", 8)): add(key(), t + 0.06 + j * 0.085, 0.4, -0.2)
    elif k == "sad": add(slide(330, 180, 0.6), t + 0.15, 0.35)
    elif k == "happy": add(slide(300, 900, 0.18), t, 0.45)
    elif k == "grab": add(pop(0.7), t, 0.5)
    elif k == "boing": add(boing(), t, 0.8)

# ── mix: gentle glue, a soft limiter, -1 dBFS peak, fades ───────────────────
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix *= 0.89 / max(1e-6, np.abs(mix).max())
fi = int(0.004 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(0.6 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
pcm = (mix * 32767).astype("<i2")
import wave
with wave.open(os.path.join(OUT, "sound.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("sound.wav", f"{END:.2f}s", "peak", float(np.abs(mix).max()))
