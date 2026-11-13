"""Documentary narration for an episode with Kokoro TTS (Apache-2.0), mixed over the bed.
Usage: python3 voice.py 01 <kokoro-dir> [--voice bm_george] [--speed 1.0]
Each subtitle is spoken from its start time; a line is sped up only if it would overrun its window.
Writes eps/out/epNN_mix.wav.
"""
import argparse, json, re, wave
import numpy as np
from kokoro_onnx import Kokoro

ap = argparse.ArgumentParser(); ap.add_argument('ep'); ap.add_argument('kdir')
ap.add_argument('--voice', default='bm_george'); ap.add_argument('--speed', type=float, default=1.0)
ap.add_argument('--sample', action='store_true', help='only write the first 4 lines back to back')
ap.add_argument('--why', action='store_true', help='explainer: lines back to back, writes narration + timing + mouth envelope')
ap.add_argument('--fast', action='store_true', help='fast edit: hook line + sped-up timeline, writes narration + timing json')
a = ap.parse_args()
D = json.load(open(f'eps/ep{a.ep}.json'))
SR = 48000; N = SR * 60
k = Kokoro(f'{a.kdir}/kokoro-v1.0.onnx', f'{a.kdir}/voices-v1.0.bin')
lang = 'en-gb' if a.voice.startswith('b') else 'en-us'


def resample(x, sr_in):
    n = int(len(x) * SR / sr_in); return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
def trim(x, thr=0.01):
    nz = np.where(np.abs(x) > thr)[0]; return x[max(0, nz[0] - 480): nz[-1] + 2400] if len(nz) else x

if a.why:
    import wave as _w
    out, lines, cur = [], [], 0.35
    for ln in D['lines']:
        cap, spoken = (ln, ln) if isinstance(ln, str) else (ln[0], ln[1])
        x, sr = k.create(spoken, voice=a.voice, speed=a.speed, lang=lang); x = trim(resample(np.asarray(x, dtype=np.float64), sr))
        lines.append({'start': round(cur, 3), 'dur': round(len(x) / SR, 3), 'text': cap}); out.append((cur, x)); cur += len(x) / SR + 0.16
        print(f'{lines[-1]["start"]:5.2f}s {len(x)/SR:4.2f}s  {spoken}')
    DUR = cur + 0.9; vo = np.zeros(int(SR * DUR))
    for t0, x in out: i0 = int(t0 * SR); vo[i0:i0 + len(x)] += x
    vo = vo / np.abs(vo).max() * 0.95
    hop = SR // 30; env = [float(np.sqrt(np.mean(vo[i:i + hop] ** 2))) for i in range(0, len(vo), hop)]
    m = max(env) or 1; env = [round(min(1, e / m * 1.6), 3) for e in env]
    with _w.open(f'eps/out/ep{a.ep}_narr.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((vo * 32767).astype(np.int16).tobytes())
    json.dump({'hookDur': 0, 'dur': DUR, 'lines': lines, 'env': env}, open(f'eps/out/ep{a.ep}_vo.json', 'w'))
    print('why narration', a.ep, f'{DUR:.1f}s'); raise SystemExit
if a.fast:
    import wave as _w
    F = D['fast']; K = F['K']; S0 = D.get('titleUntil', 3.2)
    def say(text, maxdur, speed0):
        sp = speed0
        for _ in range(6):
            x, sr = k.create(text, voice=a.voice, speed=sp, lang=lang); x = trim(resample(np.asarray(x, dtype=np.float64), sr))
            if len(x) / SR <= maxdur or sp >= 1.55: break
            sp = min(1.55, sp * (len(x) / SR) / maxdur * 1.02)
        return x, sp
    hx, _ = say(F['hook']['say'], 3.2, a.speed)
    H = max(F['hook']['dur'], len(hx) / SR + 0.25)
    tv = lambda t: H + (t - S0) / K
    DUR = tv(D['subs'][-1][1]) + 0.25
    N2 = int(SR * (DUR + 1)); vo = np.zeros(N2); vo[int(0.08 * SR):int(0.08 * SR) + len(hx)] += hx
    lines = []
    for s_ in D['subs']:
        t0, t1 = tv(s_[0]), tv(s_[1]); text = s_[3] if len(s_) > 3 else re.sub(r'<[^>]+>', ' ', s_[2])
        x, sp = say(text, (t1 - t0) - 0.06, a.speed)
        i0 = int((t0 + 0.03) * SR); vo[i0:i0 + len(x)] += x[:N2 - i0]
        lines.append({'start': round(t0 + 0.03, 3), 'dur': round(len(x) / SR, 3), 'text': s_[2]})
        print(f'{t0:5.2f}s speed {sp:.2f} dur {len(x)/SR:4.2f}s / {t1-t0:4.2f}s  {text}')
    vo = vo[:int(SR * DUR)]; vo = vo / np.abs(vo).max() * 0.95
    with _w.open(f'eps/out/ep{a.ep}_narr.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((vo * 32767).astype(np.int16).tobytes())
    json.dump({'hookDur': H, 'dur': DUR, 'lines': lines}, open(f'eps/out/ep{a.ep}_vo.json', 'w'))
    print('fast narration', a.ep, f'{DUR:.1f}s'); raise SystemExit
vo = np.zeros(N); cursor = 0.0
subs = D['subs'][:4] if a.sample else D['subs']
for s in subs:
    t0, t1, cap = s[0], s[1], s[2]
    text = s[3] if len(s) > 3 else re.sub(r'<[^>]+>', ' ', cap)
    if a.sample: t0, t1 = cursor, cursor + 8
    window = (t1 - t0) - 0.12; speed = a.speed
    for _ in range(6):
        x, sr = k.create(text, voice=a.voice, speed=speed, lang=lang)
        x = trim(resample(np.asarray(x, dtype=np.float64), sr))
        if len(x) / SR <= window or speed >= 1.4: break
        speed = min(1.4, speed * (len(x) / SR) / window * 1.02)
    i0 = int((t0 + 0.06) * SR); n = min(len(x), N - i0); vo[i0:i0 + n] += x[:n]
    if a.sample: cursor = t0 + 0.06 + len(x) / SR + 0.5
    print(f'{t0:5.2f}s speed {speed:.2f} dur {len(x)/SR:4.2f}s / {window:4.2f}s  {text}')
vo /= np.abs(vo).max()
# a touch of studio air (very short room)
rng = np.random.default_rng(1); irn = int(0.35 * SR)
ir = rng.standard_normal(irn) * np.exp(-np.arange(irn) / SR / 0.06); ir /= np.sqrt(np.sum(ir ** 2))
m = len(vo) + irn; nf = 1 << (m - 1).bit_length()
vo = vo + np.fft.irfft(np.fft.rfft(vo, nf) * np.fft.rfft(ir, nf), nf)[:len(vo)] * 0.06
vo /= np.abs(vo).max()

def write(name, x):
    if x.ndim == 1: x = np.repeat(x[:, None], 2, 1)
    with wave.open(name, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
if a.sample:
    write(f'eps/out/sample_{a.voice}.wav', vo[:int((cursor + 1) * SR)] * 0.89); print('sample'); raise SystemExit
with wave.open(f'eps/out/ep{a.ep}_bed.wav') as w:
    bed = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float64) / 32768
bed = bed[:N] if len(bed) >= N else np.pad(bed, ((0, N - len(bed)), (0, 0)))
envl = np.convolve(np.abs(vo), np.ones(4800) / 4800, mode='same')
duck = 1 - 0.6 * np.clip(envl / (envl.max() * 0.15), 0, 1)
duck = np.convolve(duck, np.ones(9600) / 9600, mode='same')
mix = bed * duck[:, None] + vo[:, None] * 0.7
mix /= np.abs(mix).max() / 0.89
write(f'eps/out/ep{a.ep}_mix.wav', mix); print('wrote mix', a.ep)
