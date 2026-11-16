export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const DURATION_S = 20;

export const INK = "#120d24";
export const CARDC = "#1d1638";
export const CARDB = "#3a2f66";
export const ACC = "#a78bfa";
export const CAU = "#ffb454";
export const ALR = "#ff5d8f";
export const TXT = "#f3efff";
export const MUT = "#9b92c4";
export const ORANGE = "#f0893a";
export const TEAL = "#39c5bb";
export const SKIN = "#ffd9b8";
export const PAPER = "#f4efe6";
export const WOOD = "#d9a066";

export const MX0 = 360;
export const MY0 = 70;
export const MW = 1200;
export const MH = 860;
export const CX0 = 830;
export const CY0 = 250;
export const CW = 600;
export const CH = 386;
export const GY = 745;
export const CX_BASE = 640;
export const PAL_OFF: [number, number] = [-92, -168];
export const REST_OFF: [number, number] = [175, -140];

export const TW = 270;
export const TH = 178;

export type Pt = [number, number];

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (x: number) => {
  const v = clamp(x);
  return v * v * (3 - 2 * v);
};
export const eo = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const eio = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
export const h01 = (a: number, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const slotXY = (slot: number): Pt => [95 + (slot % 6) * 292, 445 + Math.floor(slot / 6) * 200];

// ---------------------------------------------------------------- polylines
export const polyLen = (pts: Pt[]) => {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return n;
};

export const pointAt = (pts: Pt[], p: number): Pt => {
  const total = polyLen(pts);
  let target = clamp(p) * total;
  for (let i = 1; i < pts.length; i++) {
    const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (target <= L || i === pts.length - 1) {
      const u = L === 0 ? 0 : clamp(target / L);
      return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
    }
    target -= L;
  }
  return pts[pts.length - 1];
};

export const pathD = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");

const serp = (rows: number[], xa: number, xb: number): Pt[] => {
  const pts: Pt[] = [];
  let d = 1;
  rows.forEach((y) => {
    const [a, b] = d === 1 ? [xa, xb] : [xb, xa];
    pts.push([a, y], [b, y]);
    d = -d;
  });
  return pts;
};

const dab = (cx: number, cy: number): Pt[] => [
  [cx - 7, cy - 7],
  [cx + 7, cy + 7],
];

export type Stroke = {
  layer: string;
  c: string;
  w: number;
  t0: number;
  t1: number;
  pts: Pt[];
};

export const STROKES: Stroke[] = [
  { layer: "bg", c: INK, w: 104, t0: 2.7, t1: 4.4, pts: serp([0, 1, 2, 3, 4, 5].map((i) => CY0 + 6 + 74 * i), CX0 - 40, CX0 + CW + 40) },
  { layer: "card", c: CARDC, w: 82, t0: 4.9, t1: 6.0, pts: serp([CY0 + 58, CY0 + 108, CY0 + 158, CY0 + 208], CX0 + 12, CX0 + CW - 12) },
  { layer: "text", c: ACC, w: 82, t0: 6.5, t1: 7.3, pts: serp([CY0 + 86, CY0 + 134, CY0 + 182], CX0 + 42, CX0 + 290) },
  { layer: "dot0", c: ACC, w: 54, t0: 7.75, t1: 8.0, pts: dab(CX0 + 432, CY0 + 136) },
  { layer: "dot1", c: CAU, w: 54, t0: 8.3, t1: 8.55, pts: dab(CX0 + 486, CY0 + 136) },
  { layer: "dot2", c: ALR, w: 54, t0: 8.85, t1: 9.1, pts: dab(CX0 + 540, CY0 + 136) },
  { layer: "name", c: TXT, w: 64, t0: 9.55, t1: 10.2, pts: serp([CY0 + 296, CY0 + 340], CX0 + 12, CX0 + 400) },
];

export const T_PAINT_END = 10.2;
export const T_CHEER0 = 10.3;
export const T_CHEER1 = 11.7;
export const T_FLY0 = 12.8;
export const T_FLY1 = 13.9;
export const T_MODAL_OUT0 = 12.6;
export const T_MODAL_OUT1 = 13.2;

export const strokeP = (s: Stroke, t: number) => clamp((t - s.t0) / (s.t1 - s.t0));

export type Brush = { x: number; y: number; color: string; painting: boolean };

export const brushState = (t: number, cx: number): Brush => {
  const rest: Pt = [cx + REST_OFF[0], GY + REST_OFF[1]];
  const pal: Pt = [cx + PAL_OFF[0], GY + PAL_OFF[1]];
  const st = STROKES;
  const first = st[0];
  const s0 = pointAt(first.pts, 0);
  if (t < 1.5) return { x: rest[0], y: rest[1], color: first.c, painting: false };
  if (t < first.t0) {
    const u = eio((t - 1.5) / (first.t0 - 1.5));
    return { x: lerp(rest[0], s0[0], u), y: lerp(rest[1], s0[1], u) - 30 * Math.sin(Math.PI * u), color: first.c, painting: false };
  }
  for (let i = 0; i < st.length; i++) {
    const s = st[i];
    if (t >= s.t0 && t <= s.t1) {
      const p = pointAt(s.pts, strokeP(s, t));
      return { x: p[0], y: p[1], color: s.c, painting: true };
    }
    if (i + 1 < st.length && t > s.t1 && t < st[i + 1].t0) {
      const n = st[i + 1];
      const a = pointAt(s.pts, 1);
      const b = pointAt(n.pts, 0);
      const u = (t - s.t1) / (n.t0 - s.t1);
      if (s.c !== n.c) {
        if (u < 0.45) {
          const v = eio(u / 0.45);
          return { x: lerp(a[0], pal[0], v), y: lerp(a[1], pal[1], v) - 25 * Math.sin(Math.PI * v), color: s.c, painting: false };
        }
        const v = eio((u - 0.45) / 0.55);
        return { x: lerp(pal[0], b[0], v), y: lerp(pal[1], b[1], v) - 25 * Math.sin(Math.PI * v), color: n.c, painting: false };
      }
      return { x: lerp(a[0], b[0], eio(u)), y: lerp(a[1], b[1], eio(u)) - 18 * Math.sin(Math.PI * u), color: n.c, painting: false };
    }
  }
  const last = st[st.length - 1];
  const l = pointAt(last.pts, 1);
  const up: Pt = [cx + 140, GY - 540];
  if (t < T_CHEER0) {
    const u = eio((t - last.t1) / (T_CHEER0 - last.t1));
    return { x: lerp(l[0], up[0], u), y: lerp(l[1], up[1], u), color: last.c, painting: false };
  }
  if (t < T_CHEER1) {
    const w = Math.sin((t - T_CHEER0) * 10) * 22;
    return { x: up[0] + w, y: up[1], color: last.c, painting: false };
  }
  const u = eio((t - T_CHEER1) / 0.6);
  return { x: lerp(up[0], rest[0], u), y: lerp(up[1], rest[1], u), color: last.c, painting: false };
};

// ---------------------------------------------------------------- tiles
export type Pal = { bg: string; card: string; text: string; muted: string; accent: string; caution: string; alert: string; border: string };
export type Tile = { name: string; author: string; pal: Pal | null };

const P = (bg: string, card: string, text: string, muted: string, accent: string, caution: string, alert: string, border: string): Pal => ({
  bg, card, text, muted, accent, caution, alert, border,
});

export const TILES: Tile[] = [
  { name: "Random", author: "Command Station", pal: null },
  { name: "Charcoal", author: "Command Station", pal: P("#0a0a0b", "#1c1c1e", "#efefef", "#9a9a9e", "#d0d0d4", "#f0893a", "#e5484d", "#303034") },
  { name: "Miku", author: "Command Station", pal: P("#0d0e1a", "#17192b", "#e7fffb", "#8ecfc9", "#39c5bb", "#f0b429", "#e85a8c", "#2a6d68") },
  { name: "Modern Minimal", author: "21st.dev", pal: P("#121316", "#1b1d22", "#e8eaf0", "#8a90a0", "#5b8cff", "#f0893a", "#e5484d", "#2c2f36") },
  { name: "Starry Night", author: "21st.dev", pal: P("#12142b", "#1c2040", "#e9ecff", "#9aa3d6", "#c9d3ff", "#ffd666", "#b04b8a", "#2b3160") },
  { name: "Azure Noir", author: "21st.dev", pal: P("#0b1220", "#121c30", "#e6f0ff", "#8aa0c0", "#4f9dff", "#f0b429", "#e5484d", "#1e2d44") },
  { name: "Solar Halo", author: "21st.dev", pal: P("#1a1208", "#271b0d", "#fff4e0", "#c0a47a", "#ffb454", "#ff8a3d", "#e5484d", "#4a3414") },
  { name: "Paper White", author: "21st.dev", pal: P("#ffffff", "#f4f4f4", "#202122", "#6a6a6a", "#3366cc", "#d08a1a", "#dd3333", "#d6d6d6") },
  { name: "Mint Circuit", author: "21st.dev", pal: P("#0f1a14", "#16261d", "#e6fff2", "#86c4a2", "#3ecf8e", "#f0b429", "#e5484d", "#244233") },
  { name: "Rose Ink", author: "21st.dev", pal: P("#1a0f14", "#26161d", "#ffeef3", "#c49aa8", "#ff5d8f", "#ffb454", "#e5484d", "#47262f") },
  { name: "Sand Dune", author: "21st.dev", pal: P("#efe6d2", "#f8f1e0", "#3b3224", "#8a7c62", "#a1743a", "#c47a1a", "#b5452a", "#d8cbae") },
  { name: "Neon Lime", author: "21st.dev", pal: P("#070a07", "#101610", "#eaffe0", "#8fb080", "#7dff4f", "#f0e04a", "#ff4f7d", "#1f2f1c") },
];

export const NEW_TILE: Tile = {
  name: "Violet Hour",
  author: "Draw Theme",
  pal: P(INK, CARDC, TXT, MUT, ACC, CAU, ALR, CARDB),
};
