"""Narration for the mall short with Kokoro (open-source TTS, Apache-2.0).
Each line is placed at its subtitle's start time, sped up only if it would overrun
the subtitle window. The sound-design bed is ducked under the voice.
Usage: python3 voice.py <kokoro-dir>   (needs kokoro-v1.0.onnx + voices-v1.0.bin)
Writes narration.wav and audio_vo.wav (bed + voice).
"""
import argparse, os, subprocess, tempfile, wave
import numpy as np
from kokoro_onnx import Kokoro

ap = argparse.ArgumentParser()
ap.add_argument('kdir')
ap.add_argument('--voice', default='am_onyx')
ap.add_argument("--speed", type=float, default=0.86)
ap.add_argument("--pitch", type=float, default=-1.0, help="semitones")
ap.add_argument("--room", type=float, default=0.2, help="echo amount 0..1")
ap.add_argument('--tag', default='')
ap.add_argument('--only', default='', help='comma list of line indexes (sampler)')
args = ap.parse_args()
VOICE, BASE_SPEED = args.voice, args.speed
LINES = [  # start, end (subtitle window), text
    (3.25, 5.1, 'The doors closed by themselves.'),
    (5.1, 7.0, 'There was no button for B3.'),
    (7.05, 10.2, 'We kept going down anyway.'),
    (10.5, 13.4, 'B3.'),
    (13.6, 15.8, 'It was the same mall.'),
    (15.8, 18.0, 'But nobody had been here in years.'),
    (18.1, 22.0, 'No exits. No windows.'),
    (22.1, 23.8, 'Same table. Same tray.'),
    (23.8, 25.5, 'Same phone. Still seven past midnight.'),
    (25.6, 29.0, 'There was a security office down here too.'),
    (29.1, 31.0, 'Cam seven. Upstairs.'),
    (31.0, 33.0, 'I was still sitting in the chair.'),
    (33.1, 34.8, 'Then he turned around.'),
    (34.8, 36.6, 'And looked straight at the camera.'),
    (36.7, 38.4, 'Behind me, the elevator closed.'),
    (38.4, 40.0, 'And went back up.'),
    (40.1, 42.4, 'All the way to the top.'),
    (42.4, 44.0, 'Then it started coming down.'),
    (44.1, 46.2, 'It stopped at every floor.'),
    (46.2, 48.3, 'Like it was picking people up.'),
    (48.6, 50.2, 'It was full.'),
    (50.2, 52.0, 'Everyone from the cameras.'),
    (52.1, 54.2, 'Someone in the back stepped forward.'),
    (54.2, 56.0, 'He was wearing my jacket.'),
    (56.1, 58.4, 'And holding my flashlight.'),
]
SR = 48000
k = Kokoro(f'{args.kdir}/kokoro-v1.0.onnx', f'{args.kdir}/voices-v1.0.bin')

def pitch_shift(x, semis):
    if abs(semis) < 0.01: return x
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        with wave.open(a, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-af', f'rubberband=pitch={2 ** (semis / 12):.5f}:formant=preserved', b], check=True)
        with wave.open(b) as w:
            return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768

def resample(x, sr_in):
    n = int(len(x) * SR / sr_in)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)

def trim(x, thr=0.01):
    nz = np.where(np.abs(x) > thr)[0]
    return x[max(0, nz[0] - 480): nz[-1] + 2400] if len(nz) else x

N = SR * 60
vo = np.zeros(N)
only = [int(i) for i in args.only.split(',')] if args.only else None
cursor = 0.0
for li, (a, b, text) in enumerate(LINES):
    if only is not None:
        if li not in only: continue
        a, b = cursor, cursor + 6.0  # sampler: lines back to back
    window = (b - a) - 0.15
    speed = BASE_SPEED
    for _ in range(6):
        s, sr = k.create(text, voice=VOICE, speed=speed, lang='en-us')
        s = trim(pitch_shift(resample(np.asarray(s, dtype=np.float64), sr), args.pitch))
        if len(s) / SR <= window or speed >= 1.35: break
        speed = min(1.35, speed * (len(s) / SR) / window * 1.02)
    i0 = int((a + 0.08) * SR)
    n = min(len(s), N - i0)
    vo[i0:i0 + n] += s[:n]
    if only is not None: cursor = a + 0.08 + len(s) / SR + 0.7
    print(f'{a:5.2f}s speed {speed:.2f} dur {len(s)/SR:4.2f}s / window {window:4.2f}s  {text}')

vo /= np.abs(vo).max()
# gentle room so it sits in the mall: short early reflections
rng = np.random.default_rng(3)
ir_n = int(2.6 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR / 0.7)
ir = np.convolve(ir, np.ones(24) / 24, mode='same')  # darker tail
ir /= np.sqrt(np.sum(ir ** 2))
m = len(vo) + ir_n; nfft = 1 << (m - 1).bit_length()
wet = np.fft.irfft(np.fft.rfft(vo, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(vo)]
vo = vo + wet * args.room * 0.6
vo /= np.abs(vo).max()

with wave.open('audio.wav') as w:
    bed = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float64) / 32768
bed = bed[:N] if len(bed) >= N else np.pad(bed, ((0, N - len(bed)), (0, 0)))
# duck the bed ~7 dB while the voice is talking (smoothed envelope)
envl = np.convolve(np.abs(vo), np.ones(4800) / 4800, mode='same')
duck = 1 - 0.55 * np.clip(envl / (envl.max() * 0.15), 0, 1)
duck = np.convolve(duck, np.ones(9600) / 9600, mode='same')
mix = bed * duck[:, None] + vo[:, None] * 0.62
mix /= np.abs(mix).max() / 0.89

def write(name, x):
    x = np.atleast_2d(x.T).T if x.ndim == 1 else x
    if x.ndim == 1 or x.shape[1] == 1: x = np.repeat(x.reshape(-1, 1), 2, 1)
    with wave.open(name, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
if only is not None:
    end = int(min(N, (cursor + 1.5) * SR)); write(f'sample{args.tag}.wav', (vo / np.abs(vo).max() * 0.89)[:end]); print('wrote sample', args.tag)
else:
    write(f'narration{args.tag}.wav', vo * 0.89); write(f'audio_vo{args.tag}.wav', mix); print('wrote', args.tag)
