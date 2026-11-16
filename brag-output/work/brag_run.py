import os, sys, math, wave, subprocess
import numpy as np
from multiprocessing import Pool
import brag_build as B

HERE = os.path.dirname(os.path.abspath(__file__))
FR = os.path.join(HERE, 'frames')
POSTER_T = 19.2


def do_frame(i):
    t = i / B.FPS
    if i == 0:
        t = POSTER_T
    im = B.final_frame(t)
    im.save(os.path.join(FR, 'f_%04d.png' % i), compress_level=1)
    return i


def render_frames():
    n = int(B.DUR * B.FPS)
    os.makedirs(FR, exist_ok=True)
    with Pool(28) as p:
        for k, _ in enumerate(p.imap_unordered(do_frame, range(n), chunksize=4)):
            if k % 100 == 0:
                print('frames', k, flush=True)
    B.final_frame(POSTER_T).save(os.path.join(HERE, '..', 'brag.jpg'), quality=94)


# ---------------------------------------------------------------- audio
SR = 44100
N = int(B.DUR * SR)
rng = np.random.default_rng(7)


def tarr(d):
    return np.arange(int(d * SR)) / SR


def place(buf, sig, t0, pan=0.0, gain=1.0):
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    sig = sig[: N - i0]
    l = gain * (1 - max(0, pan))
    r = gain * (1 + min(0, pan))
    buf[0, i0:i0 + len(sig)] += sig * l
    buf[1, i0:i0 + len(sig)] += sig * r


def env_ar(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na > 0:
        e[:na] *= np.linspace(0, 1, na) ** 1.5
    if nr > 0:
        e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def pad_note(f, d, gain):
    t = tarr(d)
    s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.003 * t) + 0.25 * np.sin(2 * np.pi * f * 0.997 * t)
    s *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.2 * t + f)  # slow shimmer
    return s * env_ar(len(t), 0.7, 0.9) * gain


def pluck(f, d=0.5, gain=1.0):
    t = tarr(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 14)
    return s * np.exp(-t * 7.5) * gain * np.minimum(1, t * 400)


def bell(f, d=1.2, gain=1.0):
    t = tarr(d)
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 5) + 0.3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 9)
    return s * np.exp(-t * 3.2) * gain * np.minimum(1, t * 300)


def noise_swish(d, lo, gain):
    n = int(d * SR)
    x = rng.standard_normal(n)
    # one-pole lowpass then subtract for a highpass, then smooth for a softer top
    a = math.exp(-2 * math.pi * lo / SR)
    y = np.zeros(n)
    z = 0.0
    for i in range(n):
        z = a * z + (1 - a) * x[i]
        y[i] = x[i] - z
    b = math.exp(-2 * math.pi * 5200 / SR)
    z = 0.0
    for i in range(n):
        z = b * z + (1 - b) * y[i]
        y[i] = z
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.8
    return y * e * gain


def build_audio():
    buf = np.zeros((2, N))
    chords = [
        ([110.0, 164.81, 220.0, 261.63, 329.63], 55.0),
        ([87.31, 130.81, 174.61, 220.0, 261.63], 43.65),
        ([130.81, 196.0, 261.63, 329.63, 392.0], 65.41),
        ([98.0, 146.83, 196.0, 246.94, 293.66], 49.0),
    ]
    step = 2.4
    k = 0
    t = 0.0
    while t < 17.2:
        notes, root = chords[k % 4]
        for j, f in enumerate(notes):
            place(buf, pad_note(f, step + 0.9, 0.045), t, pan=-0.4 + 0.2 * j, gain=1.0)
        place(buf, pluck(root, 1.4, 0.16), t, 0, 1.0)
        t += step
        k += 1
    # outro pad: Am add9 swell
    for j, f in enumerate([110.0, 164.81, 220.0, 261.63, 329.63, 493.88]):
        place(buf, pad_note(f, 3.6, 0.06), 16.6, pan=-0.5 + 0.2 * j)
    place(buf, pluck(55.0, 2.5, 0.2), 17.0)
    # plucked arpeggio while painting and after
    scale = [440.0, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25]
    tt = 2.7
    i = 0
    while tt < 16.6:
        if B.h01('arp', i) > 0.28:
            f = scale[i % len(scale)] * (1.0 if (i // 8) % 2 == 0 else 0.75)
            place(buf, pluck(f, 0.5, 0.05), tt, pan=((i * 37) % 11 - 5) / 12.0)
        tt += 0.3
        i += 1
    # brush swishes and dips
    for si, s in enumerate(B.STROKES):
        d = s['t1'] - s['t0']
        sw = noise_swish(d, 900, 0.075)
        x0 = s['pts'][0][0]
        place(buf, sw, s['t0'], pan=clamp_pan((x0 - 1130) / 700.0))
        if si + 1 < len(B.STROKES):
            n = B.STROKES[si + 1]
            if n['c'] != s['c']:
                mid = s['t1'] + (n['t0'] - s['t1']) * 0.45
                tb = tarr(0.16)
                blip = np.sin(2 * np.pi * (520 - 600 * tb) * tb) * np.exp(-tb * 22)
                place(buf, blip * 0.16, mid, pan=-0.3)
    # dabs: pops
    for s in B.STROKES:
        if s['layer'].startswith('dot'):
            tb = tarr(0.12)
            pop = np.sin(2 * np.pi * (640 - 1200 * tb) * tb) * np.exp(-tb * 30)
            place(buf, pop * 0.3, s['t0'] + 0.1, pan=0.25)
    # reveal chime and sparkle
    for j, f in enumerate([880.0, 1046.5, 1318.5, 1760.0, 2093.0]):
        place(buf, bell(f, 1.4, 0.12), 10.2 + 0.09 * j, pan=-0.3 + 0.15 * j)
    place(buf, noise_swish(0.9, 2500, 0.05), 10.25, 0.0)
    for j in range(5):
        place(buf, pluck(1568.0 * (1 + 0.12 * (j % 3)), 0.3, 0.04), 10.9 + 0.17 * j, pan=(-1) ** j * 0.4)
    # hop landings
    for j in range(2):
        tb = tarr(0.16)
        thud = np.sin(2 * np.pi * (130 - 100 * tb) * tb * 2) * np.exp(-tb * 24)
        place(buf, thud * 0.22, 10.3 + 0.7 * (j + 1) - 0.02)
    # whoosh as the card flies
    wh = noise_swish(1.1, 400, 0.14)
    sweep = np.linspace(0, 1, len(wh))
    place(buf, wh * (0.3 + 0.7 * np.sin(np.pi * sweep)), B.T_FLY0, pan=-0.2)
    # settle chime and tile shuffle ticks
    place(buf, bell(659.25, 1.2, 0.16), B.T_FLY1)
    place(buf, bell(987.77, 1.6, 0.12), B.T_FLY1 + 0.12)
    for j in range(6):
        tb = tarr(0.04)
        place(buf, np.sin(2 * np.pi * 1900 * tb) * np.exp(-tb * 120) * 0.05, 13.2 + 0.1 * j, pan=-0.4 + 0.16 * j)
    # outro chime
    for j, f in enumerate([880.0, 1318.5, 1760.0]):
        place(buf, bell(f, 1.6, 0.1), 17.3 + 0.12 * j)
    place(buf, bell(1174.7, 2.2, 0.08), 19.0)
    # master: soft saturation, fade out, normalise
    buf = np.tanh(buf * 1.4) / 1.4
    fade = np.ones(N)
    nf = int(0.9 * SR)
    fade[-nf:] = np.linspace(1, 0, nf)
    buf *= fade
    fi = int(0.12 * SR)
    buf[:, :fi] *= np.linspace(0, 1, fi)
    buf *= 0.89 / max(1e-6, np.abs(buf).max())
    pcm = (buf.T * 32767).astype('<i2')
    with wave.open(os.path.join(HERE, 'audio.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('audio ok')


def clamp_pan(x):
    return max(-0.7, min(0.7, x))


if __name__ == '__main__':
    what = sys.argv[1]
    if what == 'frames':
        render_frames()
    elif what == 'audio':
        build_audio()
