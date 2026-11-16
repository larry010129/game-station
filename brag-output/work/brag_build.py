import math, os, sys, hashlib, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

W, H, FPS, DUR = 1920, 1080, 30, 20.0
S = 2
HERE = os.path.dirname(os.path.abspath(__file__))
FD = r'C:\Windows\Fonts\bahnschrift.ttf'
FB = r'C:\Windows\Fonts\arialbd.ttf'
FR = r'C:\Windows\Fonts\arial.ttf'

_f = {}


def font(path, size):
    k = (path, size)
    if k not in _f:
        _f[k] = ImageFont.truetype(path, int(size * S))
    return _f[k]


def hexc(h, a=255):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def eo(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def eio(x):
    x = clamp(x)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def lerp(a, b, x):
    return a + (b - a) * x


def h01(*a):
    d = hashlib.md5(repr(a).encode()).digest()
    return int.from_bytes(d[:4], 'big') / 2 ** 32


class Lyr:
    def __init__(s, x0, y0, w, h):
        s.x0, s.y0, s.w, s.h = x0, y0, w, h
        s.im = Image.new('RGBA', (int(w * S), int(h * S)), (0, 0, 0, 0))
        s.d = ImageDraw.Draw(s.im, 'RGBA')

    def X(s, x): return (x - s.x0) * S
    def Y(s, y): return (y - s.y0) * S

    def rr(s, x0, y0, x1, y1, r, fill=None, outline=None, width=0):
        s.d.rounded_rectangle([s.X(x0), s.Y(y0), s.X(x1), s.Y(y1)], radius=r * S, fill=fill, outline=outline, width=int(width * S))

    def ell(s, cx, cy, rx, ry=None, fill=None, outline=None, width=0):
        ry = rx if ry is None else ry
        s.d.ellipse([s.X(cx - rx), s.Y(cy - ry), s.X(cx + rx), s.Y(cy + ry)], fill=fill, outline=outline, width=int(width * S))

    def poly(s, pts, fill):
        s.d.polygon([(s.X(x), s.Y(y)) for x, y in pts], fill=fill)

    def line(s, pts, fill, width):
        s.d.line([(s.X(x), s.Y(y)) for x, y in pts], fill=fill, width=max(1, int(width * S)), joint='curve')

    def text(s, x, y, t, fnt, fill, anchor='la'):
        s.d.text((s.X(x), s.Y(y)), t, font=fnt, fill=fill, anchor=anchor)

    def fade(s, a):
        if a >= 0.999:
            return
        al = s.im.getchannel('A').point(lambda v: int(v * a))
        s.im.putalpha(al)

    def put(s, F):
        F.alpha_composite(s.im, dest=(int(round(s.x0 * S)), int(round(s.y0 * S))))


# ---------------------------------------------------------------- palette and geometry
INK = '#120d24'
CARDC = '#1d1638'
CARDB = '#3a2f66'
ACC = '#a78bfa'
CAU = '#ffb454'
ALR = '#ff5d8f'
TXT = '#f3efff'
MUT = '#9b92c4'
ORANGE = '#f0893a'
TEAL = '#39c5bb'
SKIN = '#ffd9b8'
PAPER = '#f4efe6'
WOOD = '#d9a066'

MX0, MY0, MW, MH = 360, 70, 1200, 860
CX0, CY0, CW, CH = 830, 250, 600, 386
GY = 745
CX_BASE = 640
PAL_OFF = (-92, -168)   # palette dip point relative to char (cx, gy)

TILES = [
    ('Random', 'Command Station', None),
    ('Charcoal', 'Command Station', ('#0a0a0b', '#1c1c1e', '#efefef', '#9a9a9e', '#d0d0d4', '#f0893a', '#e5484d', '#303034')),
    ('Miku', 'Command Station', ('#0d0e1a', '#17192b', '#e7fffb', '#8ecfc9', '#39c5bb', '#f0b429', '#e85a8c', '#2a6d68')),
    ('Modern Minimal', '21st.dev', ('#121316', '#1b1d22', '#e8eaf0', '#8a90a0', '#5b8cff', '#f0893a', '#e5484d', '#2c2f36')),
    ('Starry Night', '21st.dev', ('#12142b', '#1c2040', '#e9ecff', '#9aa3d6', '#c9d3ff', '#ffd666', '#b04b8a', '#2b3160')),
    ('Azure Noir', '21st.dev', ('#0b1220', '#121c30', '#e6f0ff', '#8aa0c0', '#4f9dff', '#f0b429', '#e5484d', '#1e2d44')),
    ('Solar Halo', '21st.dev', ('#1a1208', '#271b0d', '#fff4e0', '#c0a47a', '#ffb454', '#ff8a3d', '#e5484d', '#4a3414')),
    ('Paper White', '21st.dev', ('#ffffff', '#f4f4f4', '#202122', '#6a6a6a', '#3366cc', '#d08a1a', '#d33', '#d6d6d6')),
    ('Mint Circuit', '21st.dev', ('#0f1a14', '#16261d', '#e6fff2', '#86c4a2', '#3ecf8e', '#f0b429', '#e5484d', '#244233')),
    ('Rose Ink', '21st.dev', ('#1a0f14', '#26161d', '#ffeef3', '#c49aa8', '#ff5d8f', '#ffb454', '#e5484d', '#47262f')),
    ('Sand Dune', '21st.dev', ('#efe6d2', '#f8f1e0', '#3b3224', '#8a7c62', '#a1743a', '#c47a1a', '#b5452a', '#d8cbae')),
    ('Neon Lime', '21st.dev', ('#070a07', '#101610', '#eaffe0', '#8fb080', '#7dff4f', '#f0e04a', '#ff4f7d', '#1f2f1c')),
]
NEWT = ('Violet Hour', 'Draw Theme', (INK, CARDC, TXT, MUT, ACC, CAU, ALR, CARDB))

TW, TH = 270, 178


def slot_xy(slot):
    return 95 + (slot % 6) * 292, 445 + (slot // 6) * 200


# ---------------------------------------------------------------- strokes
def serp(rows, xa, xb):
    pts, d = [], 1
    for y in rows:
        a, b = (xa, xb) if d == 1 else (xb, xa)
        pts += [(a, y), (b, y)]
        d = -d
    return pts


def dab(cx, cy):
    return [(cx - 7, cy - 7), (cx + 7, cy + 7)]


STROKES = [
    dict(layer='bg', c=INK, w=104, t0=2.7, t1=4.4, pts=serp([CY0 + 6 + 74 * i for i in range(6)], CX0 - 40, CX0 + CW + 40)),
    dict(layer='card', c=CARDC, w=82, t0=4.9, t1=6.0, pts=serp([CY0 + 58, CY0 + 108, CY0 + 158, CY0 + 208], CX0 + 12, CX0 + CW - 12)),
    dict(layer='text', c=ACC, w=82, t0=6.5, t1=7.3, pts=serp([CY0 + 86, CY0 + 134, CY0 + 182], CX0 + 42, CX0 + 290)),
    dict(layer='dot0', c=ACC, w=54, t0=7.75, t1=8.0, pts=dab(CX0 + 432, CY0 + 136)),
    dict(layer='dot1', c=CAU, w=54, t0=8.3, t1=8.55, pts=dab(CX0 + 486, CY0 + 136)),
    dict(layer='dot2', c=ALR, w=54, t0=8.85, t1=9.1, pts=dab(CX0 + 540, CY0 + 136)),
    dict(layer='name', c=TXT, w=64, t0=9.55, t1=10.2, pts=serp([CY0 + 296, CY0 + 340], CX0 + 12, CX0 + 400)),
]
T_PAINT_END = 10.2
T_CHEER0, T_CHEER1 = 10.3, 11.7
T_FLY0, T_FLY1 = 12.8, 13.9
T_MODAL_OUT0, T_MODAL_OUT1 = 12.6, 13.2


def resample(pts, step=5.0):
    xs, ys, fs = [pts[0][0]], [pts[0][1]], [0.0]
    segs = []
    tot = 0.0
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        segs.append((a, b, L))
        tot += L
    acc = 0.0
    for a, b, L in segs:
        n = max(1, int(L / step))
        for i in range(1, n + 1):
            u = i / n
            xs.append(a[0] + (b[0] - a[0]) * u)
            ys.append(a[1] + (b[1] - a[1]) * u)
            fs.append((acc + L * u) / tot)
        acc += L
    return np.array(xs), np.array(ys), np.array(fs)


for _s in STROKES:
    _s['xs'], _s['ys'], _s['fs'] = resample(_s['pts'])
    _s['rj'] = np.array([0.92 + 0.16 * h01('r', _s['layer'], i) for i in range(len(_s['xs']))])

REST_OFF = (175, -140)  # rest tip relative to char


def stroke_p(s, t):
    return clamp((t - s['t0']) / (s['t1'] - s['t0']))


def stroke_pt(s, p):
    return float(np.interp(p, s['fs'], s['xs'])), float(np.interp(p, s['fs'], s['ys']))


def brush_state(t, cx):
    """Tip position, colour, painting flag. Pure function of t."""
    rest = (cx + REST_OFF[0], GY + REST_OFF[1])
    pal = (cx + PAL_OFF[0], GY + PAL_OFF[1])
    st = STROKES
    first = st[0]
    sx, sy = stroke_pt(first, 0)
    if t < 1.5:
        return rest, first['c'], False
    if t < first['t0']:
        u = eio((t - 1.5) / (first['t0'] - 1.5))
        return (lerp(rest[0], sx, u), lerp(rest[1], sy, u) - 30 * math.sin(math.pi * u)), first['c'], False
    for i, s in enumerate(st):
        if s['t0'] <= t <= s['t1']:
            p = stroke_p(s, t)
            x, y = stroke_pt(s, p)
            return (x, y), s['c'], True
        if i + 1 < len(st) and s['t1'] < t < st[i + 1]['t0']:
            n = st[i + 1]
            a = stroke_pt(s, 1.0)
            b = stroke_pt(n, 0.0)
            u = (t - s['t1']) / (n['t0'] - s['t1'])
            if s['c'] != n['c']:
                if u < 0.45:
                    v = eio(u / 0.45)
                    x, y = lerp(a[0], pal[0], v), lerp(a[1], pal[1], v) - 25 * math.sin(math.pi * v)
                    return (x, y), s['c'], False
                v = eio((u - 0.45) / 0.55)
                x, y = lerp(pal[0], b[0], v), lerp(pal[1], b[1], v) - 25 * math.sin(math.pi * v)
                return (x, y), n['c'], False
            x, y = lerp(a[0], b[0], eio(u)), lerp(a[1], b[1], eio(u)) - 18 * math.sin(math.pi * u)
            return (x, y), n['c'], False
    last = st[-1]
    lx, ly = stroke_pt(last, 1.0)
    if t < T_CHEER0:
        u = eio((t - last['t1']) / (T_CHEER0 - last['t1']))
        up = (cx + 140, GY - 540)
        return (lerp(lx, up[0], u), lerp(ly, up[1], u)), last['c'], False
    if t < T_CHEER1:
        w = math.sin((t - T_CHEER0) * 10) * 22
        return (cx + 140 + w, GY - 540), last['c'], False
    u = eio((t - T_CHEER1) / 0.6)
    up = (cx + 140, GY - 540)
    return (lerp(up[0], rest[0], u), lerp(up[1], rest[1], u)), last['c'], False


# ---------------------------------------------------------------- canvas layers
_cache = {}


def theme_layers():
    if 'layers' in _cache:
        return _cache['layers']
    out = {}

    def L():
        return Lyr(CX0, CY0, CW, CH)
    a = L(); a.rr(CX0, CY0, CX0 + CW, CY0 + CH, 30, fill=hexc(INK)); out['bg'] = a
    b = L(); b.rr(CX0 + 30, CY0 + 30, CX0 + CW - 30, CY0 + 240, 22, fill=hexc(CARDC), outline=hexc(CARDB), width=3); out['card'] = b
    c = L(); c.text(CX0 + 64, CY0 + 46, 'Aa', font(FD, 150), hexc(ACC)); out['text'] = c
    for i, col in enumerate([ACC, CAU, ALR]):
        d = L(); d.ell(CX0 + 432 + 54 * i, CY0 + 136, 19, fill=hexc(col)); out['dot%d' % i] = d
    e = L()
    e.text(CX0 + 30, CY0 + 262, 'Violet Hour', font(FD, 52), hexc(TXT))
    e.text(CX0 + 32, CY0 + 326, 'Draw Theme', font(FR, 24), hexc(MUT))
    out['name'] = e
    _cache['layers'] = out
    return out


def paper_layer():
    if 'paper' in _cache:
        return _cache['paper']
    p = Lyr(CX0, CY0, CW, CH)
    p.rr(CX0, CY0, CX0 + CW, CY0 + CH, 30, fill=hexc(PAPER))
    g = hexc('#c9c2b2')
    # pencil sketch of the layout
    def dashed(x0, y0, x1, y1):
        for (a, b, c_, d_) in [(x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)]:
            L_ = math.hypot(c_ - a, d_ - b)
            n = int(L_ / 22)
            for i in range(n):
                u0, u1 = i / n, (i + 0.55) / n
                p.line([(a + (c_ - a) * u0, b + (d_ - b) * u0), (a + (c_ - a) * u1, b + (d_ - b) * u1)], g, 3)
    dashed(CX0 + 30, CY0 + 30, CX0 + CW - 30, CY0 + 240)
    p.text(CX0 + 64, CY0 + 46, 'Aa', font(FD, 150), hexc('#e1dbcc'))
    for i in range(3):
        p.ell(CX0 + 432 + 54 * i, CY0 + 136, 19, outline=g, width=3)
    p.line([(CX0 + 30, CY0 + 292), (CX0 + 300, CY0 + 292)], g, 3)
    p.line([(CX0 + 30, CY0 + 336), (CX0 + 190, CY0 + 336)], g, 3)
    _cache['paper'] = p
    return p


def layer_mask(layer_name, t):
    """L-mode mask (canvas size at SS) of paint revealed so far for one layer."""
    m = Image.new('L', (int(CW * S), int(CH * S)), 0)
    d = ImageDraw.Draw(m)
    s = [x for x in STROKES if x['layer'] == layer_name][0]
    if t > s['t0']:
        p = stroke_p(s, t)
        sel = s['fs'] <= p
        xs, ys, rj = s['xs'][sel], s['ys'][sel], s['rj'][sel]
        r = s['w'] / 2
        for x, y, j in zip(xs, ys, rj):
            rr_ = r * j
            d.ellipse([(x - CX0 - rr_) * S, (y - CY0 - rr_) * S, (x - CX0 + rr_) * S, (y - CY0 + rr_) * S], fill=255)
        f = smooth((t - s['t1']) / 0.25)
        if f > 0:
            m = Image.blend(m, Image.new('L', m.size, 255), f)
    return m


def card_image(t, full=False):
    """Canvas with paper and the painted layers at time t. Returns RGBA at SS."""
    base = paper_layer().im.copy()
    for name in ['bg', 'card', 'text', 'dot0', 'dot1', 'dot2', 'name']:
        lay = theme_layers()[name].im.copy()
        if full:
            base.alpha_composite(lay)
            continue
        m = layer_mask(name, t)
        a = ImageChops.multiply(lay.getchannel('A'), m)
        lay.putalpha(a)
        base.alpha_composite(lay)
    return base


# ---------------------------------------------------------------- character
def draw_char(L, cx, gy, k, tip, tcol, t, mode='paint'):
    q = lambda v: v * k
    bob = 3 * k * math.sin(t * 6.5)
    jump = 0.0
    if mode == 'cheer':
        jump = -58 * k * abs(math.sin((t - T_CHEER0) * math.pi / 0.7))
    if mode == 'hopin':
        jump = -46 * k * abs(math.sin(clamp((t - 0.4) / 1.0) * math.pi * 3))
    g2 = gy + jump
    # shadow
    sh = clamp(1 + jump / (160 * k))
    L.ell(cx, gy + q(6), q(80) * (0.7 + 0.3 * sh), q(13) * (0.7 + 0.3 * sh), fill=(0, 0, 0, int(90 * sh)))
    # legs
    L.rr(cx - q(36), g2 - q(76), cx - q(6), g2 + q(2), q(12), fill=hexc('#2a2640'))
    L.rr(cx + q(6), g2 - q(76), cx + q(36), g2 + q(2), q(12), fill=hexc('#2a2640'))
    L.rr(cx - q(44), g2 - q(12), cx - q(2), g2 + q(4), q(8), fill=hexc('#1a1830'))
    L.rr(cx + q(2), g2 - q(12), cx + q(44), g2 + q(4), q(8), fill=hexc('#1a1830'))
    # body
    by = g2 + bob
    L.rr(cx - q(64), by - q(236), cx + q(64), by - q(60), q(42), fill=hexc(TEAL))
    L.rr(cx - q(50), by - q(204), cx + q(50), by - q(64), q(30), fill=hexc(PAPER))
    for (dx, dy, col) in [(-20, -150, ACC), (14, -120, CAU), (28, -168, ALR), (-6, -96, INK)]:
        L.ell(cx + q(dx), by + q(dy), q(7), fill=hexc(col))
    # head
    hx = cx + clamp((tip[0] - cx) / 400, -1, 1) * q(6)
    hy = by - q(292)
    L.ell(hx - q(64), hy + q(4), q(12), fill=hexc(SKIN))
    L.ell(hx + q(64), hy + q(4), q(12), fill=hexc(SKIN))
    L.ell(hx, hy, q(68), fill=hexc(SKIN))
    # beret
    L.ell(hx + q(8), hy - q(58), q(82), q(30), fill=hexc(ORANGE))
    L.ell(hx + q(14), hy - q(86), q(9), fill=hexc(ORANGE))
    L.rr(hx - q(70), hy - q(46), hx + q(72), hy - q(32), q(6), fill=hexc('#d9722a'))
    # eyes
    dx_, dy_ = tip[0] - hx, tip[1] - hy
    dl = max(1.0, math.hypot(dx_, dy_))
    ox, oy = dx_ / dl * q(4), dy_ / dl * q(3)
    blink = (t % 3.1) < 0.12
    for ex in (-24, 26):
        if blink:
            L.line([(hx + q(ex) - q(8), hy + q(2)), (hx + q(ex) + q(8), hy + q(2))], hexc('#2a2640'), q(4))
        else:
            L.ell(hx + q(ex), hy, q(10), q(12), fill=hexc('#ffffff'))
            L.ell(hx + q(ex) + ox, hy + oy, q(6), fill=hexc('#2a2640'))
    L.ell(hx - q(40), hy + q(22), q(11), q(7), fill=(255, 150, 170, 150))
    L.ell(hx + q(42), hy + q(22), q(11), q(7), fill=(255, 150, 170, 150))
    if mode in ('cheer', 'wave'):
        L.ell(hx + q(2), hy + q(30), q(15), q(11), fill=hexc('#7a2a3a'))
        L.ell(hx + q(2), hy + q(24), q(13), q(6), fill=hexc(SKIN))
    else:
        L.line([(hx - q(14), hy + q(28)), (hx - q(4), hy + q(34)), (hx + q(8), hy + q(34)), (hx + q(18), hy + q(26))], hexc('#7a2a3a'), q(4))
    # left arm and palette
    sl = (cx - q(54), by - q(206))
    hl = (cx - q(100), by - q(164)) if mode != 'cheer' else (cx - q(112), by - q(338))
    L.line([sl, hl], hexc(TEAL), q(26))
    L.ell(hl[0], hl[1], q(14), fill=hexc(SKIN))
    pc = (hl[0] - q(24), hl[1] + q(10))
    L.ell(pc[0], pc[1], q(56), q(38), fill=hexc(WOOD), outline=hexc('#a8703a'), width=q(3))
    L.ell(pc[0] + q(30), pc[1] + q(8), q(8), fill=hexc('#a8703a'))
    for (dx, dy, col) in [(-30, -8, ACC), (-8, -18, CAU), (16, -12, ALR), (-20, 12, INK)]:
        L.ell(pc[0] + q(dx), pc[1] + q(dy), q(9), q(7), fill=hexc(col))
    # right arm with two-link IK and long brush
    sr = (cx + q(54), by - q(206))
    vx, vy = tip[0] - sr[0], tip[1] - sr[1]
    dist = max(1.0, math.hypot(vx, vy))
    ux, uy = vx / dist, vy / dist
    hand_d = min(q(185), dist * 0.55)
    hand = (sr[0] + ux * hand_d, sr[1] + uy * hand_d)
    if math.hypot(tip[0] - hand[0], tip[1] - hand[1]) < q(95):
        hand = (tip[0] - ux * q(95), tip[1] - uy * q(95))
    dd = max(1.0, math.hypot(hand[0] - sr[0], hand[1] - sr[1]))
    l1 = q(102)
    dd = min(dd, 2 * l1 - 2)
    ex_, ey_ = (hand[0] - sr[0]) / max(1.0, math.hypot(hand[0] - sr[0], hand[1] - sr[1])), (hand[1] - sr[1]) / max(1.0, math.hypot(hand[0] - sr[0], hand[1] - sr[1]))
    hh = math.sqrt(max(0.0, l1 * l1 - (dd / 2) ** 2))
    px, py = -ey_, ex_
    if py < 0:
        px, py = -px, -py
    elbow = (sr[0] + ex_ * dd / 2 + px * hh, sr[1] + ey_ * dd / 2 + py * hh)
    # brush first (under hand)
    bdx, bdy = tip[0] - hand[0], tip[1] - hand[1]
    bl = max(1.0, math.hypot(bdx, bdy))
    bx, by_ = bdx / bl, bdy / bl
    nx, ny = -by_, bx
    back = (hand[0] - bx * q(22), hand[1] - by_ * q(22))
    fer0 = (tip[0] - bx * q(70), tip[1] - by_ * q(70))
    fer1 = (tip[0] - bx * q(34), tip[1] - by_ * q(34))
    L.poly([(back[0] + nx * q(7), back[1] + ny * q(7)), (fer0[0] + nx * q(5), fer0[1] + ny * q(5)), (fer0[0] - nx * q(5), fer0[1] - ny * q(5)), (back[0] - nx * q(7), back[1] - ny * q(7))], hexc(WOOD))
    L.poly([(fer0[0] + nx * q(6), fer0[1] + ny * q(6)), (fer1[0] + nx * q(8), fer1[1] + ny * q(8)), (fer1[0] - nx * q(8), fer1[1] - ny * q(8)), (fer0[0] - nx * q(6), fer0[1] - ny * q(6))], hexc('#c9ced6'))
    L.poly([(fer1[0] + nx * q(9), fer1[1] + ny * q(9)), (tip[0] + nx * q(2), tip[1] + ny * q(2)), (tip[0] - nx * q(2), tip[1] - ny * q(2)), (fer1[0] - nx * q(9), fer1[1] - ny * q(9))], hexc(tcol))
    L.ell(tip[0], tip[1], q(3), fill=hexc(tcol))
    # arm over brush
    L.line([sr, elbow, hand], hexc(TEAL), q(26))
    L.ell(elbow[0], elbow[1], q(13), fill=hexc(TEAL))
    L.ell(hand[0], hand[1], q(15), fill=hexc(SKIN))


# ---------------------------------------------------------------- page (Themes grid)
def draw_tile(L, x, y, pal_t, alpha=1.0, badge=False):
    name, author, p = pal_t
    if p is None:
        L.rr(x, y, x + TW, y + TH, 16, fill=hexc(ORANGE, int(255 * alpha)))
        L.rr(x + 14, y + 14, x + TW - 14, y + TH - 58, 12, fill=(255, 255, 255, int(40 * alpha)))
        L.text(x + 30, y + 22, 'Aa', font(FD, 44), (255, 255, 255, int(255 * alpha)))
        L.text(x + TW - 40, y + 44, '???', font(FD, 26), (255, 255, 255, int(220 * alpha)), 'ra')
        L.text(x + 14, y + TH - 46, 'Random', font(FB, 20), (255, 255, 255, int(255 * alpha)))
        L.text(x + 14, y + TH - 22, 'Command Station', font(FR, 15), (255, 255, 255, int(210 * alpha)))
        return
    bg, card, tx, mu, ac, ca, al, bd = p
    a = int(255 * alpha)
    L.rr(x, y, x + TW, y + TH, 16, fill=hexc(bg, a))
    L.rr(x + 14, y + 14, x + TW - 14, y + TH - 58, 12, fill=hexc(card, a), outline=hexc(bd, a), width=1.5)
    L.text(x + 30, y + 22, 'Aa', font(FD, 46), hexc(ac, a))
    for i, col in enumerate([ac, ca, al]):
        L.ell(x + TW - 82 + i * 22, y + 50, 7, fill=hexc(col, a))
    L.text(x + 14, y + TH - 46, name, font(FB, 20), hexc(tx, a))
    L.text(x + 14, y + TH - 22, author, font(FR, 15), hexc(mu, a))
    if badge:
        L.rr(x + TW - 62, y + 8, x + TW - 8, y + 30, 11, fill=hexc(ACC, a))
        L.text(x + TW - 35, y + 19, 'NEW', font(FB, 13), hexc('#ffffff', a), 'mm')


def draw_page(t, count=30, shift=0.0, new_alpha=0.0, count_pop=0.0):
    L = Lyr(0, 0, W, H)
    L.d.rectangle([0, 0, W * S, H * S], fill=hexc('#0a0a0b'))
    L.text(100, 96, 'Themes', font(FD, 64), hexc('#ededee'))
    L.text(100, 178, '122 looks from the station and 21st.dev. Selecting one recolours the page, the cards, caution, and alerts.', font(FR, 20), hexc('#8d8d92'))
    L.rr(100, 238, 460, 286, 24, fill=(255, 255, 255, 14), outline=(255, 255, 255, 40), width=1.5)
    L.text(126, 262, 'Search themes', font(FR, 19), hexc('#7d7d82'), 'lm')
    L.rr(478, 236, 706, 288, 26, fill=hexc(ORANGE))
    L.text(592, 262, 'Draw Theme', font(FB, 21), hexc('#1a0f05'), 'mm')
    cx = 100
    for i, ch in enumerate(['All', 'Station', 'Blue', 'Green', 'Teal', 'Red', 'Amber', 'Pink', 'Violet', 'Neutral', 'Brand']):
        w = 28 + 13 * len(ch)
        L.rr(cx, 316, cx + w, 356, 20, fill=(255, 255, 255, 235 if i == 0 else 12), outline=(255, 255, 255, 40), width=1.5)
        L.text(cx + w / 2, 336, ch, font(FR, 17), hexc('#111111') if i == 0 else hexc('#c0c0c5'), 'mm')
        cx += w + 10
    sc = 1 + 0.18 * math.sin(math.pi * clamp(count_pop))
    L.text(100, 398, 'Unlocked', font(FB, 26), hexc('#ededee'), 'lm')
    L.text(228, 400, str(count), font(FB, int(20 * sc)), hexc(ACC if count_pop > 0 else '#8d8d92'), 'lm')
    for i, tl in enumerate(TILES):
        sl = i + shift if 6 <= i < 11 else i
        if sl >= 12.0:
            continue
        s0 = int(math.floor(sl))
        fr = sl - s0
        x0, y0 = slot_xy(s0)
        x1, y1 = slot_xy(s0 + 1)
        x, y = lerp(x0, x1, fr), lerp(y0, y1, fr)
        al = 1.0
        if i == 11:
            al = 1 - clamp(shift / 0.3)
        if al > 0:
            draw_tile(L, x, y, tl, al)
    if new_alpha > 0:
        x, y = slot_xy(6)
        draw_tile(L, x, y, NEWT, new_alpha, badge=True)
    return L


def page_blur():
    if 'pb' not in _cache:
        P = draw_page(0)
        im = P.im.filter(ImageFilter.GaussianBlur(9 * S))
        dim = Image.new('RGBA', im.size, (6, 6, 8, 150))
        im.alpha_composite(dim)
        _cache['pb'] = im
    return _cache['pb']


# ---------------------------------------------------------------- modal
def draw_modal(t):
    L = Lyr(MX0, MY0, MW, MH)
    L.rr(MX0, MY0, MX0 + MW, MY0 + MH, 26, fill=hexc('#18181b'), outline=hexc('#2c2c31'), width=2)
    L.text(MX0 + 50, MY0 + 38, 'Draw Theme', font(FD, 48), hexc('#f2f2f3'))
    L.text(MX0 + 50, MY0 + 108, 'Spend earned credits on a random preset look you do not own.', font(FR, 20), hexc('#8d8d92'))
    L.text(MX0 + MW - 54, MY0 + 50, 'x', font(FD, 40), hexc('#8d8d92'), 'mm')
    L.rr(MX0 + 50, MY0 + 155, MX0 + MW - 50, MY0 + 700, 18, fill=hexc('#101012'), outline=hexc('#26262b'), width=2)
    # ground line
    L.rr(MX0 + 90, GY + 12, MX0 + MW - 90, GY + 15, 2, fill=(255, 255, 255, 10))
    # easel
    ex0, ex1 = CX0 + 120, CX0 + CW - 120
    L.line([(ex0, CY0 + CH - 10), (ex0 - 60, GY + 16)], hexc('#6a4a2a'), 14)
    L.line([(ex1, CY0 + CH - 10), (ex1 + 60, GY + 16)], hexc('#6a4a2a'), 14)
    L.rr(CX0 - 30, CY0 + CH + 2, CX0 + CW + 30, CY0 + CH + 22, 6, fill=hexc('#8a6238'))
    # shadow under canvas
    L.rr(CX0 + 6, CY0 + 12, CX0 + CW + 6, CY0 + CH + 12, 30, fill=(0, 0, 0, 55))
    # canvas
    if t < T_FLY0:
        im = card_image(t)
        L.im.alpha_composite(im, dest=(int((CX0 - MX0) * S), int((CY0 - MY0) * S)))
    # buttons and footer
    L.rr(MX0 + 330, MY0 + 735, MX0 + 600, MY0 + 785, 25, fill=hexc(ORANGE))
    L.text(MX0 + 465, MY0 + 760, '1 draw, 100 Credits', font(FB, 20), hexc('#1a0f05'), 'mm')
    L.rr(MX0 + 620, MY0 + 735, MX0 + 930, MY0 + 785, 25, outline=(255, 255, 255, 60), width=1.5)
    L.text(MX0 + 775, MY0 + 760, '10 draws, 900 Credits', font(FR, 20), hexc('#c9c9ce'), 'mm')
    L.text(MX0 + 50, MY0 + 820, 'Balance', font(FR, 19), hexc('#8d8d92'), 'lm')
    L.text(MX0 + 132, MY0 + 820, '1200 Credits', font(FB, 19), hexc('#e8e8ea'), 'lm')
    # character
    if t < 1.5:
        q_ = clamp((t - 0.4) / 1.0)
        cx = lerp(MX0 + 90, CX_BASE, eo(q_))
        mode = 'hopin'
    else:
        cx = CX_BASE
        mode = 'cheer' if T_CHEER0 <= t <= T_CHEER1 else 'paint'
    tip, tcol, painting = brush_state(t, cx if t >= 1.5 else CX_BASE)
    if t < 1.5:
        tip = (cx + REST_OFF[0], GY + REST_OFF[1])
    draw_char(L, cx, GY, 1.0, tip, tcol, t, mode)
    # splatter particles
    if 2.7 <= t <= T_PAINT_END + 0.6:
        k0 = int((t - 0.7) / 0.07)
        for k in range(max(0, k0), int(t / 0.07) + 1):
            ts = k * 0.07
            if ts < 2.7:
                continue
            age = t - ts
            if age < 0 or age > 0.7:
                continue
            if h01('sp', k) > 0.55:
                continue
            pt_, pc, pn = brush_state(ts, CX_BASE)
            if not pn:
                continue
            vx = (h01('vx', k) - 0.5) * 180
            vy = -60 - h01('vy', k) * 120
            x = pt_[0] + vx * age
            y = pt_[1] + vy * age + 520 * age * age
            r = 3 + 5 * h01('r', k)
            L.ell(x, y, r, fill=hexc(pc if pc != INK else '#6a5acd', int(220 * (1 - age / 0.7))))
    # sparkles after the paint is done
    if T_PAINT_END <= t <= T_PAINT_END + 2.4:
        for i in range(22):
            life = 0.9 + 0.9 * h01('l', i)
            ts = T_PAINT_END + 0.35 * h01('s', i)
            age = t - ts
            if 0 <= age <= life:
                ang = h01('a', i) * math.tau
                rad = 190 + 150 * h01('d', i)
                px_ = CX0 + CW / 2 + math.cos(ang) * rad * (0.9 + 0.2 * age) * 1.15
                py_ = CY0 + CH / 2 + math.sin(ang) * rad * 0.8 * (0.9 + 0.2 * age) - 14 * age
                sz = (12 + 22 * h01('z', i)) * math.sin(math.pi * age / life)
                col = [TXT, ACC, CAU, ALR][i % 4]
                rot = age * 2 + i
                pts = []
                for j in range(8):
                    rr_ = sz if j % 2 == 0 else sz * 0.28
                    aa = rot + j * math.pi / 4
                    pts.append((px_ + math.cos(aa) * rr_, py_ + math.sin(aa) * rr_))
                L.poly(pts, hexc(col, 235))
    # new look tag
    if 10.35 <= t < T_FLY0 + 0.1:
        a = smooth((t - 10.35) / 0.3) * (1 - smooth((t - 12.4) / 0.4))
        L.rr(CX0 + CW / 2 - 92, CY0 - 56, CX0 + CW / 2 + 92, CY0 - 16, 20, fill=hexc(ACC, int(255 * a)))
        L.text(CX0 + CW / 2, CY0 - 36, 'NEW LOOK', font(FB, 22), hexc('#ffffff', int(255 * a)), 'mm')
    return L


# ---------------------------------------------------------------- captions and outro
CAPS = [
    ('Every draw is painted by hand.', 0.7, 4.7),
    ('A brand new look, painted for you.', 10.5, 13.0),
    ('Added to Unlocked. Yours to keep.', 13.9, 16.8),
]


def draw_caption(F, t):
    for txt, a, b in CAPS:
        if a <= t <= b:
            al = smooth((t - a) / 0.35) * (1 - smooth((t - (b - 0.35)) / 0.35))
            f = font(FD, 40)
            bb = f.getbbox(txt)
            tw = (bb[2] - bb[0]) / S
            L = Lyr(0, 950, W, 130)
            cx = W / 2
            L.rr(cx - tw / 2 - 36, 988 - 950, cx + tw / 2 + 36, 1052 - 950, 32, fill=(10, 10, 12, 215), outline=(255, 255, 255, 40), width=1.5)
            L.text(cx, 1020 - 950, txt, f, (255, 255, 255, 255), 'mm')
            L.fade(al)
            L.put(F)


def flying_card(F, t):
    if t < T_FLY0:
        return
    u = eio((t - T_FLY0) / (T_FLY1 - T_FLY0))
    sx, sy = CX0 + CW / 2, CY0 + CH / 2
    ex_, ey_ = slot_xy(6)
    ex_, ey_ = ex_ + TW / 2, ey_ + TH / 2
    cxm, cym = (sx + ex_) / 2 - 140, min(sy, ey_) - 160
    x = (1 - u) ** 2 * sx + 2 * (1 - u) * u * cxm + u * u * ex_
    y = (1 - u) ** 2 * sy + 2 * (1 - u) * u * cym + u * u * ey_
    sc = lerp(1.0, TW / CW, u)
    full = _cache.get('full')
    if full is None:
        full = card_image(99.0, full=True)
        _cache['full'] = full
    w, h = int(CW * S * sc), int(CH * S * sc)
    im = full.resize((max(2, w), max(2, h)), Image.LANCZOS)
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    shl = Lyr(0, 0, 2, 2)
    del shl
    shadow = Image.new('RGBA', (im.size[0] + 80 * S, im.size[1] + 80 * S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([40 * S, 52 * S, 40 * S + im.size[0], 52 * S + im.size[1]], radius=int(28 * S * sc), fill=(0, 0, 0, int(120 * (1 - u * 0.6))))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14 * S))
    fa = 1.0 - smooth((t - T_FLY1) / 0.25)
    if fa <= 0:
        return
    if fa < 1:
        im.putalpha(im.getchannel('A').point(lambda v: int(v * fa)))
        shadow.putalpha(shadow.getchannel('A').point(lambda v: int(v * fa)))
    px, py = int(x * S - im.size[0] / 2), int(y * S - im.size[1] / 2)
    F.alpha_composite(shadow, dest=(px - 40 * S, py - 40 * S))
    F.alpha_composite(im, dest=(px, py))


def render(t):
    F = Image.new('RGBA', (W * S, H * S), (10, 10, 11, 255))
    modal_a = smooth(t / 0.5) * (1 - smooth((t - T_MODAL_OUT0) / (T_MODAL_OUT1 - T_MODAL_OUT0)))
    # page
    if t < T_MODAL_OUT0:
        F.alpha_composite(page_blur())
    else:
        e = smooth((t - 13.1) / 0.9)
        arrive = smooth((t - T_FLY1 + 0.05) / 0.25)
        pop = clamp((t - T_FLY1) / 0.5)
        live = draw_page(t, count=31 if t >= T_FLY1 else 30, shift=e, new_alpha=arrive, count_pop=pop if t >= T_FLY1 else 0)
        live.put(F)
        if modal_a > 0:
            pb = page_blur().copy()
            al = pb.getchannel('A').point(lambda v: int(v * modal_a))
            pb.putalpha(al)
            F.alpha_composite(pb)
    if modal_a > 0:
        M = draw_modal(t)
        M.fade(modal_a)
        M.y0 = M.y0 + 18 * (1 - modal_a)
        M.put(F)
    flying_card(F, t)
    # arrival flash ring
    if T_FLY1 <= t <= T_FLY1 + 0.7:
        a = (t - T_FLY1) / 0.7
        x, y = slot_xy(6)
        L = Lyr(x - 60, y - 60, TW + 120, TH + 120)
        L.rr(x - 6 - 40 * a, y - 6 - 30 * a, x + TW + 6 + 40 * a, y + TH + 6 + 30 * a, 22 + 20 * a, outline=hexc(ACC, int(255 * (1 - a))), width=4)
        L.put(F)
    # outro
    if t >= 16.8:
        o = smooth((t - 16.8) / 0.6)
        dim = Image.new('RGBA', F.size, (8, 8, 10, int(236 * o)))
        F.alpha_composite(dim)
        L = Lyr(0, 0, W, H)
        ta = smooth((t - 17.2) / 0.7)
        yo = 18 * (1 - ta)
        L.text(W / 2, 450 + yo, 'Draw Theme', font(FD, 150), hexc('#ffffff'), 'mm')
        L.text(W / 2, 580 + yo, 'Every look, painted in.', font(FD, 50), hexc(ACC), 'mm')
        L.text(W / 2, 650 + yo, 'COMMAND STATION', font(FB, 24), hexc('#8d8d92'), 'mm')
        L.fade(ta)
        L.put(F)
        C = Lyr(0, 0, W, H)
        cx = lerp(2050, 1640, eo((t - 17.1) / 0.8))
        draw_char(C, cx, 1040, 0.8, (cx + 60, 1040 - 360 + 40 * math.sin(t * 9)), ACC, t, 'wave')
        C.fade(o)
        C.put(F)
    draw_caption(F, t)
    return F


def render_outro_char(F, t):
    pass


def final_frame(t):
    F = render(t)
    return F.convert('RGB').resize((W, H), Image.LANCZOS)


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'stills':
        outdir = os.path.join(HERE, 'stills')
        for t in [float(x) for x in sys.argv[2:]]:
            final_frame(t).save(os.path.join(outdir, 'still_%05.2f.png' % t))
            print('still', t)
