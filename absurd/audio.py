"""Sound bed for an absurd-documentary episode: calm underscore + ambiences + sfx.
Usage: python3 audio.py 01   -> eps/out/ep01_bed.wav (stereo, 48k, 60 s)
Cues come from eps/epNN.json: "amb": [[t0, t1, kind], ...], "sfx": [[t, kind], ...],
optional "music": {"key": semitones from C, "prog": "pop"|"wonder"|"minor", "bpm": 92}.
"""
import json, sys, wave, os
import numpy as np

SR = 48000; DUR = 60.0; N = int(SR * DUR)
ep = sys.argv[1]
D = json.load(open(f'eps/ep{ep}.json'))
rng = np.random.default_rng(int(ep) * 7 + 1)
t = np.arange(N) / SR

def spec_filter(x, lo=None, hi=None, shape=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    if shape is not None: m *= shape(f)
    return np.fft.irfft(X * m, len(x))
def noise(n): return rng.standard_normal(n)
def norm(x, peak=1.0): m = np.abs(x).max(); return x / m * peak if m > 0 else x
def env_window(t0, t1, fade=0.8):
    e = np.zeros(N); a, b = int(t0 * SR), int(min(t1, DUR) * SR)
    if b <= a: return e
    seg = np.ones(b - a); fl = min(int(fade * SR), (b - a) // 2)
    seg[:fl] = np.linspace(0, 1, fl); seg[-fl:] = np.linspace(1, 0, fl); e[a:b] = seg; return e
def slow_lfo(rate, depth, phase=0): return 1 - depth + depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + phase))

# ---------------- music ----------------
mus = D.get('music', {})
key = mus.get('key', [0, 2, 5, 7, -3][int(ep) % 5]); bpm = mus.get('bpm', 88); beat = 60 / bpm
PROG = {
    'pop': [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],          # I vi IV V
    'wonder': [[0, 4, 7, 11], [5, 9, 12, 16], [9, 12, 16, 19], [7, 11, 14, 17]],
    'minor': [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]],
}[mus.get('prog', ['pop', 'wonder', 'pop', 'wonder', 'pop'][int(ep) % 5])]
def hz(semi): return 261.63 * 2 ** ((semi + key) / 12)
music = np.zeros((N, 2))
def add(sig, start, pan=0.0, gain=1.0):
    a = int(start * SR); b = min(N, a + len(sig))
    if b <= a: return
    music[a:b, 0] += sig[:b - a] * gain * (1 - pan) / 2 * 2 ** 0.5
    music[a:b, 1] += sig[:b - a] * gain * (1 + pan) / 2 * 2 ** 0.5
def pluck(f, dur=1.2, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * tt) + 0.35 * bright * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 8) + 0.15 * bright * np.sin(6 * np.pi * f * tt) * np.exp(-tt * 14)
    return s * np.exp(-tt * 3.2) * np.minimum(1, tt / 0.004)
def pad(freqs, dur):
    n = int(dur * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            for h, a in ((1, 1), (2, 0.35), (3, 0.15)): s += a * np.sin(2 * np.pi * ff * h * tt + rng.uniform(0, 6.28))
    e = np.minimum(1, tt / 1.2) * np.minimum(1, (dur - tt) / 1.2); return s * e
bar = beat * 4; nbars = int(DUR / bar) + 1
pattern = [0, 1, 2, 1, 0, 2, 1, 2]  # arpeggio index per 8th
for bi in range(nbars):
    ch = PROG[bi % len(PROG)]; t0 = bi * bar
    if t0 >= DUR: break
    add(spec_filter(np.pad(pad([hz(c - 12) for c in ch], bar + 1.2), (0, 0)), hi=1800), t0, 0, 0.05)
    add(pluck(hz(ch[0] - 24), 2.5, 0.3), t0, 0, 0.25)                 # bass
    add(pluck(hz(ch[0] - 24), 1.5, 0.3), t0 + beat * 2.5, 0, 0.14)
    for k in range(8):
        if bi < 1 and k < 4: continue
        n = ch[pattern[k] % len(ch)] + (12 if k in (3, 7) else 0)
        add(pluck(hz(n), 0.9, 0.8), t0 + k * beat / 2, [-0.4, 0.4][k % 2], 0.09 if k % 2 else 0.12)
    if bi % 2 == 1:  # little glockenspiel answer every other bar
        add(pluck(hz(ch[-1] + 12), 1.6, 1.5) * 0.7, t0 + beat * 3.5, 0.3, 0.07)
music = spec_filter(music[:, 0], hi=7000)[:, None] * [1, 0] + spec_filter(music[:, 1], hi=7000)[:, None] * [0, 1]
music = norm(music, 0.5)
# music sits back during the cold open, swells slightly in the last bar, cut at fadeOut
fo = D.get('fadeOut', 59.2)
menv = np.clip(t / 2.0, 0, 1) * np.clip((fo + 0.6 - t) / 1.2, 0, 1)
music *= menv[:, None]

# ---------------- ambiences ----------------
def amb(kind, n):
    x = noise(n)
    if kind == 'wind': return norm(spec_filter(x, 80, 900)) * slow_lfo(0.11, 0.6) * 0.5
    if kind == 'mountain': return norm(spec_filter(x, 150, 2200)) * slow_lfo(0.17, 0.7, 1) * 0.7
    if kind in ('falls', 'water'): return norm(spec_filter(x, 120, 4000 if kind == 'falls' else 1500)) * (0.8 if kind == 'falls' else 0.45 * slow_lfo(0.09, 0.8))
    if kind == 'waves':
        w = np.clip(np.sin(2 * np.pi * t * 0.12) * 1.4 - 0.2, 0, 1) ** 2
        return norm(spec_filter(x, 200, 3000)) * (0.15 + 0.85 * w) * 0.6
    if kind == 'rain': return norm(spec_filter(x, 1500, 9000)) * 0.35 + norm(spec_filter(noise(n), 100, 600)) * 0.2
    if kind == 'underwater': return norm(spec_filter(x, 30, 300)) * slow_lfo(0.07, 0.5) * 0.7
    if kind in ('city', 'traffic'):
        base = norm(spec_filter(x, 40, 500)) * 0.45
        for _ in range(int(DUR / 3)):
            c = rng.uniform(0, DUR); d = rng.uniform(2, 4)
            g = np.exp(-((t - c) / (d / 3)) ** 2); base += norm(spec_filter(noise(n), 200, 1500)) * g * 0.35
        return base
    if kind == 'crowd':
        s = np.zeros(n)
        for _ in range(28):
            f0 = rng.uniform(250, 700); seg = spec_filter(noise(n), f0 * 0.7, f0 * 1.5)
            syl = (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(2.5, 5) * t + rng.uniform(0, 6))) ** 2 * slow_lfo(rng.uniform(0.1, 0.3), 0.8, rng.uniform(0, 6))
            s += seg * syl
        return norm(s) * 0.45
    if kind == 'birds':
        s = norm(spec_filter(x, 100, 600)) * 0.12
        for _ in range(int(DUR * 0.9)):
            c = rng.uniform(0, DUR); a = int(c * SR); m = int(rng.uniform(0.05, 0.14) * SR)
            if a + m >= n: continue
            tt = np.arange(m) / SR; f = rng.uniform(2500, 4500) + rng.uniform(-1500, 1500) * tt / tt[-1]
            s[a:a + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) * 0.25
        return s
    if kind == 'night':
        s = norm(spec_filter(x, 60, 400)) * 0.1
        cr = (np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 28 * t) > 0.3) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.8 * t)) ** 6)
        return s + cr * 0.12
    if kind == 'room': return norm(spec_filter(x, 60, 300)) * 0.2
    return np.zeros(n)
bed = np.zeros((N, 2))
for t0, t1, kind in D.get('amb', []):
    e = env_window(t0, t1, 0.6)
    a = amb(kind, N) * e
    bed[:, 0] += a; bed[:, 1] += np.roll(a, 300)

# ---------------- sfx ----------------
def sfx(kind):
    if kind == 'ding':
        n = int(1.5 * SR); tt = np.arange(n) / SR
        return (np.sin(2 * np.pi * 1318 * tt) + 0.5 * np.sin(2 * np.pi * 1975 * tt) + 0.3 * np.sin(2 * np.pi * 2637 * tt)) * np.exp(-tt * 4) * 0.5
    if kind == 'register':
        n = int(1.2 * SR); tt = np.arange(n) / SR; s = np.zeros(n)
        k = int(0.04 * SR); s[:k] += noise(k) * np.exp(-np.arange(k) / SR * 120) * 0.8
        s += (np.sin(2 * np.pi * 2093 * tt) + 0.6 * np.sin(2 * np.pi * 2637 * tt)) * np.exp(-tt * 5) * 0.5 * (tt > 0.06)
        return s
    if kind in ('geyser', 'whoosh', 'splash', 'boom', 'rumble'):
        L = {'geyser': 5.0, 'whoosh': 1.2, 'splash': 2.0, 'boom': 4.0, 'rumble': 6.0}[kind]
        n = int(L * SR); tt = np.arange(n) / SR; x = noise(n)
        if kind == 'geyser': return spec_filter(x, 150, 5000) * np.minimum(1, tt / 0.4) * np.exp(-np.maximum(0, tt - 1.0) * 0.9) * 0.9
        if kind == 'whoosh': return spec_filter(x, 300, 3000) * np.sin(np.pi * tt / L) ** 2 * 0.6
        if kind == 'splash': return spec_filter(x, 400, 7000) * np.exp(-tt * 3) * 0.8
        if kind == 'boom': return (spec_filter(x, 20, 160) * 3 + np.sin(2 * np.pi * 45 * tt)) * np.exp(-tt * 1.2) * 0.8
        return spec_filter(x, 20, 200) * np.sin(np.pi * tt / L) * 1.5
    if kind == 'horn':
        n = int(0.9 * SR); tt = np.arange(n) / SR
        s = np.sign(np.sin(2 * np.pi * 349 * tt)) * 0.5 + np.sign(np.sin(2 * np.pi * 440 * tt)) * 0.5
        return spec_filter(s, 100, 2500) * np.minimum(1, tt / 0.02) * np.minimum(1, (0.9 - tt) / 0.05) * 0.35
    if kind == 'beep':
        n = int(0.25 * SR); tt = np.arange(n) / SR
        return np.sin(2 * np.pi * 1800 * tt) * (tt < 0.18) * 0.35
    if kind == 'click':
        n = int(0.15 * SR); return spec_filter(noise(n), 1000, 8000) * np.exp(-np.arange(n) / SR * 60) * 0.7
    if kind == 'cheer':
        n = int(3.5 * SR); tt = np.arange(n) / SR; s = np.zeros(n)
        for _ in range(20):
            f0 = rng.uniform(400, 1100); s += spec_filter(noise(n), f0 * 0.8, f0 * 1.3) * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(3, 7) * tt))
        return norm(s) * np.minimum(1, tt / 0.3) * np.exp(-tt * 0.7) * 0.6
    if kind == 'thud':
        n = int(0.8 * SR); tt = np.arange(n) / SR
        return (np.sin(2 * np.pi * 60 * tt) + spec_filter(noise(n), 30, 300) * 2) * np.exp(-tt * 9) * 0.8
    if kind == 'pop':
        n = int(0.3 * SR); tt = np.arange(n) / SR
        return np.sin(2 * np.pi * (900 - 600 * tt / 0.3) * tt) * np.exp(-tt * 18) * 0.6
    return np.zeros(10)
for t0, kind in D.get('sfx', []):
    s = sfx(kind); a = int(t0 * SR); b = min(N, a + len(s))
    bed[a:b, 0] += s[:b - a]; bed[a:b, 1] += s[:b - a]

out = norm(bed, 0.55) + music
out = norm(out, 0.89)
os.makedirs('eps/out', exist_ok=True)
with wave.open(f'eps/out/ep{ep}_bed.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print('wrote bed', ep)
