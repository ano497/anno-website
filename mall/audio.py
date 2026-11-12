"""Synthesised sound design for the 60s mall short. Writes audio.wav (48 kHz stereo).

Everything is generated from noise and oscillators: room tone, fluorescent hum, the
roller shutter, breaker thunks, footsteps, escalator, elevator chimes, a low drone score,
risers, heartbeat and the final hit. Event times match the shot list in scene.js.
"""
import numpy as np
import wave

SR = 48000
DUR = 60.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)
t_all = np.arange(N) / SR


def idx(t):
    return max(0, min(N, int(t * SR)))


def lp_fast(x, cutoff):
    # FFT brick-ish low-pass with a soft knee (fast for long buffers)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def bp_fast(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / (1 + (f / hi) ** 4)) * (1 - 1 / (1 + (f / lo) ** 4))
    return np.fft.irfft(X, len(x))


def add(sig, t0, gain=1.0, pan=0.0):
    i0 = idx(t0)
    n = min(len(sig), N - i0)
    if n <= 0:
        return
    l = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
    r = gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    L[i0:i0 + n] += sig[:n] * l
    R[i0:i0 + n] += sig[:n] * r


def env(n, a, d):
    """attack/decay envelope in seconds over n samples"""
    tt = np.arange(n) / SR
    e = np.minimum(1, tt / max(a, 1e-4)) * np.exp(-np.maximum(0, tt - a) / max(d, 1e-4))
    return e


def fade_mask(t0, t1, fi=0.3, fo=0.3):
    m = np.zeros(N)
    i0, i1 = idx(t0), idx(t1)
    seg = np.ones(i1 - i0)
    nfi, nfo = int(fi * SR), int(fo * SR)
    if nfi: seg[:nfi] *= np.linspace(0, 1, nfi)
    if nfo: seg[-nfo:] *= np.linspace(1, 0, nfo)
    m[i0:i1] = seg
    return m


# --- room tone: low rumble everywhere, brighter HVAC while the lights are on
brown = np.cumsum(rng.standard_normal(N)); brown -= lp_fast(brown, 0.5); brown /= np.abs(brown).max()
room = lp_fast(brown, 180) * 0.5
L += room * 0.5; R += room * 0.5
lights_on = fade_mask(3.0, 8.6, 0.05, 0.05)
hum = (np.sin(2 * np.pi * 120 * t_all) * 0.5 + np.sin(2 * np.pi * 240 * t_all) * 0.2 + np.sin(2 * np.pi * 360 * t_all) * 0.08)
hum *= lights_on * 0.05
L += hum; R += hum

# --- CCTV segments: electrical whine + static
for (a, b) in [(0, 3.0), (54.5, 58.3)]:
    m = fade_mask(a, b, 0.02, 0.02)
    whine = np.sin(2 * np.pi * 15734 / 4 * t_all) * 0.006 + bp_fast(rng.standard_normal(N), 2000, 9000) * 0.02
    L += whine * m; R += whine * m
for t0 in [0.0, 2.45, 54.5, 57.9]:
    n = int(0.22 * SR)
    add(bp_fast(rng.standard_normal(n), 800, 12000) * env(n, 0.005, 0.08), t0, 0.35)

# --- score: low drone in D, slowly opening; pulses as tension builds
drone = np.zeros(N)
for f, g in [(36.71, 0.5), (73.42, 0.35), (110.0, 0.12), (146.83, 0.08), (77.78, 0.05)]:
    lfo = 1 + 0.003 * np.sin(2 * np.pi * 0.07 * t_all + f)
    drone += np.sin(2 * np.pi * f * t_all * lfo) * g
drone_env = np.interp(t_all, [0, 3, 8.6, 25, 36, 47, 52, 52.1, 54.5, 58.3, 59.3, 60], [0.25, 0.25, 0.35, 0.45, 0.6, 0.75, 0.95, 0.15, 0.4, 0.75, 0.0, 0.0])
L += drone * drone_env * 0.16; R += drone * drone_env * 0.16
# high eerie pad (detuned) from 29s
pad = sum(np.sin(2 * np.pi * f * t_all) for f in [587.3, 590.1, 880.0, 883.2]) * 0.25
pad_env = np.interp(t_all, [0, 29, 33, 36, 40, 52, 52.1, 54.5, 58.3, 58.31, 60], [0, 0, 0.5, 0.8, 0.9, 1.0, 0, 0.6, 1.0, 0, 0])
L += pad * pad_env * 0.018; R += np.roll(pad, 400) * pad_env * 0.018
# sub pulses: every 1.0s from 25s, every 0.5s from 40s
for t0 in list(np.arange(25, 40, 1.0)) + list(np.arange(40, 52, 0.5)):
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    add(np.sin(2 * np.pi * (55 - 20 * tt) * tt) * env(n, 0.005, 0.18), t0, 0.22)
# riser into the B3 reveal and into the twist
for (a, b) in [(47.0, 52.0), (55.5, 58.3)]:
    n = int((b - a) * SR)
    tt = np.arange(n) / SR
    k = tt / (b - a)
    noise = bp_fast(rng.standard_normal(n), 300, 6000)
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * k ** 2) / SR)
    add((noise * 0.25 + sweep * 0.15) * k ** 2.2, a, 0.5)

# --- shutter: rattle 3.55 -> 4.55, slam at 4.55
n = int(1.0 * SR); tt = np.arange(n) / SR
rattle = bp_fast(rng.standard_normal(n), 400, 5000) * (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 28 * tt)))
add(rattle * np.minimum(1, tt / 0.1), 3.55, 0.35, -0.3)
n = int(1.6 * SR); tt = np.arange(n) / SR
slam = np.sin(2 * np.pi * (70 - 30 * tt) * tt) * env(n, 0.002, 0.35) + bp_fast(rng.standard_normal(n), 200, 6000) * env(n, 0.001, 0.12) * 0.8
add(slam, 4.55, 0.9, -0.3)

# --- breakers: lights go out in three banks
for t0, pan in [(7.4, 0.6), (8.0, 0.0), (8.6, -0.6)]:
    n = int(1.2 * SR); tt = np.arange(n) / SR
    thunk = np.sin(2 * np.pi * (55 - 15 * tt) * tt) * env(n, 0.001, 0.3) + bp_fast(rng.standard_normal(n), 1500, 8000) * env(n, 0.0005, 0.02) * 0.6
    add(thunk, t0, 0.8, pan)

# --- footsteps (heel + scuff), on a reverberant floor
def steps(t0, t1, every, gain, jitter=0.02):
    t = t0
    k = 0
    while t < t1:
        n = int(0.25 * SR); tt = np.arange(n) / SR
        heel = bp_fast(rng.standard_normal(n), 120, 2500) * env(n, 0.002, 0.03) + np.sin(2 * np.pi * 90 * tt) * env(n, 0.001, 0.04) * 0.5
        add(heel, t + rng.uniform(-jitter, jitter), gain * rng.uniform(0.8, 1.0), 0.15 if k % 2 else -0.15)
        t += every; k += 1
steps(10.1, 14.0, 0.56, 0.35)
steps(25.1, 29.0, 0.58, 0.35)
steps(33.0, 36.0, 0.31, 0.5)
steps(40.2, 41.5, 0.6, 0.3)
steps(52.0, 54.5, 0.29, 0.55)

# --- escalator: motor whine + step clatter (louder while riding, faint across the atrium)
esc_m = fade_mask(14.0, 18.0, 0.1, 0.1) + fade_mask(18.0, 21.5, 0.05, 0.3) * 0.3
motor = (np.sin(2 * np.pi * 98 * t_all) * 0.4 + bp_fast(rng.standard_normal(N), 300, 1200) * 0.3)
clack = np.zeros(N)
for t0 in np.arange(14.0, 21.5, 0.4):
    n = int(0.05 * SR)
    i0 = idx(t0); clack[i0:i0 + n] += bp_fast(rng.standard_normal(n), 1500, 6000) * env(n, 0.001, 0.01)
L += (motor * 0.12 + clack * 0.3) * esc_m; R += (motor * 0.12 + clack * 0.3) * esc_m

# --- elevator chimes + door slides
def chime(t0, pan, gain=0.45, low=False):
    for k, f in enumerate([1318.5, 1046.5] if not low else [659.3, 523.3]):
        n = int(1.8 * SR); tt = np.arange(n) / SR
        tone = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.01 * tt)) * env(n, 0.003, 0.6)
        add(tone, t0 + k * 0.32, gain, pan)
for t0, pan in [(40.6, 0.0), (44.25, -0.4), (45.75, 0.4)]:
    chime(t0, pan)
    n = int(1.3 * SR); tt = np.arange(n) / SR
    add(bp_fast(rng.standard_normal(n), 300, 2000) * np.sin(np.pi * np.clip(tt / 1.2, 0, 1)) * 0.5, t0 + 0.35, 0.35, pan)
# flickering B3 car: electrical buzz
m = fade_mask(47.0, 52.0, 0.2, 0.05)
buzz = np.sign(np.sin(2 * np.pi * 120 * t_all)) * 0.5 * (rng.random(N) > 0.0)
flick = np.repeat((rng.random(int(DUR * 14) + 1) > 0.3).astype(float), SR // 14)[:N]
L += lp_fast(buzz, 3000) * m * flick * 0.03; R += lp_fast(buzz, 3000) * m * flick * 0.03

# --- heartbeat during the twist
for t0 in np.arange(54.6, 58.3, 0.72):
    for k, g in [(0, 1.0), (0.18, 0.7)]:
        n = int(0.3 * SR); tt = np.arange(n) / SR
        add(np.sin(2 * np.pi * 48 * tt) * env(n, 0.004, 0.09), t0 + k, 0.55 * g)

# --- whoosh on the turn, flashlight click, hit, final chime in the dark
n = int(0.6 * SR); tt = np.arange(n) / SR
add(bp_fast(rng.standard_normal(n), 300, 3000) * np.sin(np.pi * tt / 0.6) ** 2, 58.3, 0.6)
n = int(0.04 * SR)
for t0 in [58.85, 58.95, 59.05]:
    add(bp_fast(rng.standard_normal(n), 2000, 9000) * env(n, 0.0005, 0.008), t0, 0.5)
n = int(2.5 * SR); tt = np.arange(n) / SR
hit = np.sin(2 * np.pi * (45 - 10 * tt) * tt) * env(n, 0.002, 0.9) + bp_fast(rng.standard_normal(n), 60, 3000) * env(n, 0.001, 0.25) * 0.7
add(hit, 59.3, 1.0)
chime(59.45, 0.0, 0.25, low=True)

# --- reverb (mall atrium): convolve with decaying noise
ir_n = int(2.2 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR / 0.55)
ir = lp_fast(ir, 5000); ir /= np.sqrt(np.sum(ir ** 2))
def conv(x):
    m = len(x) + ir_n
    nfft = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x)]
Lw = L + conv(L) * 0.35
Rw = R + conv(np.roll(R, 37)) * 0.35

mix = np.stack([Lw, Rw], 1)
mix /= np.abs(mix).max() / 0.89
mix[idx(59.95):] *= np.linspace(1, 0, N - idx(59.95))[:, None]
pcm = (mix * 32767).astype(np.int16)
with wave.open('audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote audio.wav')
