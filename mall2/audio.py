"""Synthesised sound design for Part 2 ("B3") of the mall short. Writes audio.wav (48 kHz stereo).

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



# --- room tone: night mall upstairs (0-9s inside the car), then B3: deeper, wetter
brown = np.cumsum(rng.standard_normal(N)); brown -= lp_fast(brown, 0.5); brown /= np.abs(brown).max()
room = lp_fast(brown, 160) * 0.5
b3 = fade_mask(10.3, 60, 0.6, 0.01)
L += room * (0.45 + 0.35 * b3); R += room * (0.45 + 0.35 * b3)
sub = np.sin(2 * np.pi * 31 * t_all) * 0.5 + np.sin(2 * np.pi * 47 * t_all) * 0.25
L += sub * b3 * 0.05; R += sub * b3 * 0.05
# emergency-light ballast buzz in B3
buzz = lp_fast(np.sign(np.sin(2 * np.pi * 100 * t_all)) * 0.5, 2500)
L += buzz * b3 * 0.012; R += buzz * b3 * 0.012
# water drips in B3
for t0 in np.cumsum(rng.uniform(0.9, 2.6, 40)) + 11.0:
    if t0 > 58: break
    n = int(0.25 * SR); tt = np.arange(n) / SR
    f0 = rng.uniform(900, 1500)
    drip = np.sin(2 * np.pi * (f0 + 900 * tt) * tt) * env(n, 0.001, 0.035)
    add(drip, t0, 0.12, rng.uniform(-0.8, 0.8))

# --- the car: motor hum + cable creak while it moves; floor ticks and chimes
moving = fade_mask(2.6, 10.1, 0.4, 0.3)
motor = np.sin(2 * np.pi * 82 * t_all) * 0.5 + bp_fast(rng.standard_normal(N), 150, 700) * 0.6
L += motor * moving * 0.09; R += motor * moving * 0.09
for t0 in [3.6, 5.6, 7.8]:
    n = int(0.6 * SR); tt = np.arange(n) / SR
    add(np.sin(2 * np.pi * 1760 * tt) * env(n, 0.002, 0.15), t0, 0.12)
    n = int(1.2 * SR); tt = np.arange(n) / SR  # cable creak
    add(bp_fast(rng.standard_normal(n), 300, 1500) * np.sin(np.pi * tt / 1.2) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt)), t0 + 0.2, 0.18, 0.4)
# light flicker zaps in the car
for t0 in np.arange(5.6, 10.2, 0.37):
    n = int(0.05 * SR); add(bp_fast(rng.standard_normal(n), 2000, 9000) * env(n, 0.001, 0.015), t0 + rng.uniform(0, 0.2), 0.12)

def chime(t0, pan, gain=0.45, low=False):
    for k, f in enumerate([1318.5, 1046.5] if not low else [659.3, 523.3]):
        n = int(1.8 * SR); tt = np.arange(n) / SR
        tone = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.01 * tt)) * env(n, 0.003, 0.6)
        add(tone, t0 + k * 0.32, gain, pan)
def doors(t0, pan, dur=1.2, gain=0.35):
    n = int((dur + 0.1) * SR); tt = np.arange(n) / SR
    add(bp_fast(rng.standard_normal(n), 300, 2000) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) * 0.5, t0, gain, pan)
    n = int(0.4 * SR); tt = np.arange(n) / SR
    add(np.sin(2 * np.pi * 70 * tt) * env(n, 0.002, 0.08), t0 + dur, gain * 1.2, pan)
doors(0.6, 0.0, 1.8, 0.5)        # doors close in the hook
chime(10.0, 0.0, 0.4); doors(10.3, 0.0)
doors(36.6, 0.5, 1.0); chime(36.4, 0.5, 0.3)
# it goes up (far away) then comes down, stopping at every floor
far = fade_mask(37.6, 42.0, 0.5, 0.5) + fade_mask(42.6, 48.3, 0.5, 0.2) * 1.4
L += motor * far * 0.05; R += motor * far * 0.07
for t0 in [44.6, 45.6, 46.6]:
    chime(t0, 0.4, 0.22, low=True)
chime(47.6, 0.3, 0.5); doors(48.3, 0.3, 1.2, 0.5)

# --- footsteps
def steps(t0, t1, every, gain):
    t = t0; k = 0
    while t < t1:
        n = int(0.25 * SR); tt = np.arange(n) / SR
        heel = bp_fast(rng.standard_normal(n), 120, 2500) * env(n, 0.002, 0.03) + np.sin(2 * np.pi * 90 * tt) * env(n, 0.001, 0.04) * 0.5
        add(heel, t + rng.uniform(-0.02, 0.02), gain * rng.uniform(0.8, 1.0), 0.15 if k % 2 else -0.15)
        t += every; k += 1
steps(13.6, 18.0, 0.58, 0.4)
steps(25.6, 29.0, 0.58, 0.38)
steps(53.4, 55.0, 0.8, 0.25)   # the twin steps forward

# --- monitors: CRT whine + static in the office
m = fade_mask(26.5, 36.6, 0.5, 0.2)
whine = np.sin(2 * np.pi * 15734 / 4 * t_all) * 0.006 + bp_fast(rng.standard_normal(N), 2000, 9000) * 0.02
L += whine * m; R += whine * m
n = int(0.25 * SR); add(bp_fast(rng.standard_normal(n), 800, 12000) * env(n, 0.005, 0.1), 33.0, 0.3)

# --- the crowd: many slow breaths, out of sync
crowd = fade_mask(48.6, 58.4, 1.2, 0.1)
breath = np.zeros(N)
for k in range(8):
    ph = rng.uniform(0, 3); rate = rng.uniform(0.22, 0.32)
    breath += bp_fast(rng.standard_normal(N), 400 + 120 * k, 2500) * np.clip(np.sin(2 * np.pi * rate * t_all + ph), 0, 1) ** 2
L += breath * crowd * 0.05; R += np.roll(breath, 900) * crowd * 0.05

# --- score
drone = np.zeros(N)
for f, g in [(36.71, 0.5), (73.42, 0.35), (110.0, 0.12), (146.83, 0.08), (77.78, 0.07)]:
    drone += np.sin(2 * np.pi * f * t_all * (1 + 0.003 * np.sin(2 * np.pi * 0.07 * t_all + f))) * g
drone_env = np.interp(t_all, [0, 3, 10.3, 25, 33, 36.6, 44, 48.3, 52, 57.4, 58.6, 60], [0.35, 0.4, 0.55, 0.5, 0.65, 0.7, 0.8, 0.95, 0.9, 1.0, 0, 0])
L += drone * drone_env * 0.16; R += drone * drone_env * 0.16
pad = sum(np.sin(2 * np.pi * f * t_all) for f in [587.3, 590.1, 880.0, 883.2]) * 0.25
pad_env = np.interp(t_all, [0, 29, 33, 36.6, 48.3, 57.4, 57.45, 60], [0, 0, 0.6, 0.8, 1.0, 1.0, 0, 0])
L += pad * pad_env * 0.018; R += np.roll(pad, 400) * pad_env * 0.018
for t0 in list(np.arange(36.6, 44.6, 1.0)) + list(np.arange(48.3, 57.4, 0.5)):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    add(np.sin(2 * np.pi * (55 - 20 * tt) * tt) * env(n, 0.005, 0.18), t0, 0.22)
for (a, b) in [(7.0, 10.0), (54.0, 57.45)]:
    n = int((b - a) * SR); tt = np.arange(n) / SR; k = tt / (b - a)
    noise = bp_fast(rng.standard_normal(n), 300, 6000)
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * k ** 2) / SR)
    add((noise * 0.25 + sweep * 0.15) * k ** 2.2, a, 0.5)
# hook: flashlight click-click on
for t0 in [0.35, 0.5]:
    n = int(0.04 * SR); add(bp_fast(rng.standard_normal(n), 2000, 9000) * env(n, 0.0005, 0.008), t0, 0.5)
# heartbeat while he steps forward
for t0 in np.arange(52.2, 57.4, 0.62):
    for k, g in [(0, 1.0), (0.17, 0.7)]:
        n = int(0.3 * SR); tt = np.arange(n) / SR
        add(np.sin(2 * np.pi * 48 * tt) * env(n, 0.004, 0.09), t0 + k, 0.55 * g)
# your light dies (clicks), his comes on: a blinding sting, then the hit to black
for t0 in [57.0, 57.1, 57.2]:
    n = int(0.04 * SR); add(bp_fast(rng.standard_normal(n), 2000, 9000) * env(n, 0.0005, 0.008), t0, 0.45)
n = int(1.3 * SR); tt = np.arange(n) / SR
sting = (np.sin(2 * np.pi * 2093 * tt) * 0.4 + bp_fast(rng.standard_normal(n), 3000, 12000)) * env(n, 0.003, 0.5)
add(sting, 57.45, 0.6)
n = int(2.5 * SR); tt = np.arange(n) / SR
hit = np.sin(2 * np.pi * (45 - 10 * tt) * tt) * env(n, 0.002, 0.9) + bp_fast(rng.standard_normal(n), 60, 3000) * env(n, 0.001, 0.25) * 0.7
add(hit, 58.55, 1.0)
chime(59.1, 0.0, 0.25, low=True)
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
