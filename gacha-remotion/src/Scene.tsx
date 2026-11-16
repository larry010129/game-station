import React from "react";
import { loadFont } from "@remotion/google-fonts/Outfit";
import {
  ACC, ALR, CAU, CARDB, CARDC, CH, CW, CX0, CX_BASE, CY0, GY, H, INK, MH, MUT, MW, MX0, MY0, NEW_TILE, ORANGE, PAPER, STROKES, TH, TILES, TW, TXT, W,
  T_CHEER0, T_CHEER1, T_FLY0, T_FLY1, T_MODAL_OUT0, T_MODAL_OUT1, T_PAINT_END,
  brushState, clamp, eio, eo, h01, lerp, pathD, polyLen, slotXY, smooth, strokeP, type Pt, type Tile,
} from "./theme";
import { Painter, type PainterMode } from "./Painter";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });
const FONT = `${fontFamily}, 'Segoe UI', system-ui, sans-serif`;

// ---------------------------------------------------------------- the painted card
const Layers: Record<string, React.ReactNode> = {
  bg: <rect x={0} y={0} width={CW} height={CH} rx={30} fill={INK} />,
  card: <rect x={30} y={30} width={CW - 60} height={210} rx={22} fill={CARDC} stroke={CARDB} strokeWidth={3} />,
  text: (
    <text x={62} y={188} fontSize={150} fontWeight={500} fill={ACC} fontFamily={FONT}>
      Aa
    </text>
  ),
  dot0: <circle cx={432} cy={136} r={19} fill={ACC} />,
  dot1: <circle cx={486} cy={136} r={19} fill={CAU} />,
  dot2: <circle cx={540} cy={136} r={19} fill={ALR} />,
  name: (
    <>
      <text x={30} y={312} fontSize={52} fontWeight={500} fill={TXT} fontFamily={FONT}>
        Violet Hour
      </text>
      <text x={32} y={348} fontSize={24} fill={MUT} fontFamily={FONT}>
        Draw Theme
      </text>
    </>
  ),
};
const LAYER_ORDER = ["bg", "card", "text", "dot0", "dot1", "dot2", "name"];

const Sketch: React.FC = () => {
  const g = "#c9c2b2";
  return (
    <>
      <rect x={0} y={0} width={CW} height={CH} rx={30} fill={PAPER} />
      <rect x={30} y={30} width={CW - 60} height={210} fill="none" stroke={g} strokeWidth={3} strokeDasharray="12 10" />
      <text x={62} y={188} fontSize={150} fontWeight={500} fill="#e1dbcc" fontFamily={FONT}>
        Aa
      </text>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={432 + 54 * i} cy={136} r={19} fill="none" stroke={g} strokeWidth={3} />
      ))}
      <line x1={30} y1={292} x2={300} y2={292} stroke={g} strokeWidth={3} />
      <line x1={30} y1={336} x2={190} y2={336} stroke={g} strokeWidth={3} />
    </>
  );
};

/** Paper plus every theme layer, each revealed by a stroke mask that follows the brush. Local coordinates. */
const CardPainting: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <Sketch />
    {LAYER_ORDER.map((name) => {
      const s = STROKES.find((x) => x.layer === name)!;
      const local = s.pts.map(([x, y]) => [x - CX0, y - CY0] as Pt);
      const len = polyLen(local);
      const p = strokeP(s, t);
      const f = smooth((t - s.t1) / 0.25);
      const id = `m-${name}`;
      return (
        <g key={name}>
          <mask id={id} maskUnits="userSpaceOnUse" x={-60} y={-60} width={CW + 120} height={CH + 120}>
            <path
              d={pathD(local)}
              fill="none"
              stroke="#fff"
              strokeWidth={s.w}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${len} ${len + 10}`}
              strokeDashoffset={len * (1 - p)}
              opacity={t > s.t0 ? 1 : 0}
            />
            <rect x={-60} y={-60} width={CW + 120} height={CH + 120} fill="#fff" opacity={f} />
          </mask>
          <g mask={`url(#${id})`}>{Layers[name]}</g>
        </g>
      );
    })}
  </g>
);

const CardFull: React.FC = () => (
  <g>
    <Sketch />
    {LAYER_ORDER.map((n) => (
      <g key={n}>{Layers[n]}</g>
    ))}
  </g>
);

// ---------------------------------------------------------------- the Themes page
const TileView: React.FC<{ x: number; y: number; tile: Tile; alpha?: number; badge?: boolean }> = ({ x, y, tile, alpha = 1, badge }) => {
  const p = tile.pal;
  if (!p) {
    return (
      <g opacity={alpha}>
        <rect x={x} y={y} width={TW} height={TH} rx={16} fill={ORANGE} />
        <rect x={x + 14} y={y + 14} width={TW - 28} height={TH - 72} rx={12} fill="#fff" opacity={0.16} />
        <text x={x + 30} y={y + 64} fontSize={44} fontWeight={500} fill="#fff" fontFamily={FONT}>Aa</text>
        <text x={x + TW - 40} y={y + 52} fontSize={26} fill="#fff" textAnchor="end" fontFamily={FONT}>???</text>
        <text x={x + 14} y={y + TH - 28} fontSize={20} fontWeight={600} fill="#fff" fontFamily={FONT}>Random</text>
        <text x={x + 14} y={y + TH - 8} fontSize={15} fill="#fff" opacity={0.85} fontFamily={FONT}>Command Station</text>
      </g>
    );
  }
  return (
    <g opacity={alpha}>
      <rect x={x} y={y} width={TW} height={TH} rx={16} fill={p.bg} />
      <rect x={x + 14} y={y + 14} width={TW - 28} height={TH - 72} rx={12} fill={p.card} stroke={p.border} strokeWidth={1.5} />
      <text x={x + 30} y={y + 66} fontSize={46} fontWeight={500} fill={p.accent} fontFamily={FONT}>Aa</text>
      {[p.accent, p.caution, p.alert].map((c, i) => (
        <circle key={i} cx={x + TW - 82 + i * 22} cy={y + 50} r={7} fill={c} />
      ))}
      <text x={x + 14} y={y + TH - 28} fontSize={20} fontWeight={600} fill={p.text} fontFamily={FONT}>{tile.name}</text>
      <text x={x + 14} y={y + TH - 8} fontSize={15} fill={p.muted} fontFamily={FONT}>{tile.author}</text>
      {badge ? (
        <>
          <rect x={x + TW - 62} y={y + 8} width={54} height={22} rx={11} fill={ACC} />
          <text x={x + TW - 35} y={y + 24} fontSize={13} fontWeight={600} fill="#fff" textAnchor="middle" fontFamily={FONT}>NEW</text>
        </>
      ) : null}
    </g>
  );
};

const PageView: React.FC<{ count: number; shift: number; newAlpha: number; countPop: number }> = ({ count, shift, newAlpha, countPop }) => {
  const chips = ["All", "Station", "Blue", "Green", "Teal", "Red", "Amber", "Pink", "Violet", "Neutral", "Brand"];
  let cx = 100;
  return (
    <g fontFamily={FONT}>
      <rect width={W} height={H} fill="#0a0a0b" />
      <text x={100} y={146} fontSize={64} fontWeight={500} fill="#ededee">Themes</text>
      <text x={100} y={186} fontSize={20} fill="#8d8d92">122 looks from the station and 21st.dev. Selecting one recolours the page, the cards, caution, and alerts.</text>
      <rect x={100} y={238} width={360} height={48} rx={24} fill="#fff" opacity={0.06} stroke="#fff" strokeOpacity={0.16} strokeWidth={1.5} />
      <text x={126} y={269} fontSize={19} fill="#7d7d82">Search themes</text>
      <rect x={478} y={236} width={228} height={52} rx={26} fill={ORANGE} />
      <text x={592} y={269} fontSize={21} fontWeight={600} fill="#1a0f05" textAnchor="middle">Draw Theme</text>
      {chips.map((c, i) => {
        const w = 28 + 13 * c.length;
        const x = cx;
        cx += w + 10;
        return (
          <g key={c}>
            <rect x={x} y={316} width={w} height={40} rx={20} fill={i === 0 ? "#ededee" : "#fff"} opacity={i === 0 ? 1 : 0.05} stroke="#fff" strokeOpacity={0.16} strokeWidth={1.5} />
            <text x={x + w / 2} y={342} fontSize={17} fill={i === 0 ? "#111" : "#c0c0c5"} textAnchor="middle">{c}</text>
          </g>
        );
      })}
      <text x={100} y={407} fontSize={26} fontWeight={600} fill="#ededee">Unlocked</text>
      <text x={228} y={407} fontSize={20 * (1 + 0.18 * Math.sin(Math.PI * clamp(countPop)))} fontWeight={600} fill={countPop > 0 ? ACC : "#8d8d92"}>{count}</text>
      {TILES.map((tl, i) => {
        const sl = i >= 6 && i < 11 ? i + shift : i;
        if (sl >= 12) return null;
        const s0 = Math.floor(sl);
        const fr = sl - s0;
        const [x0, y0] = slotXY(s0);
        const [x1, y1] = slotXY(s0 + 1);
        const al = i === 11 ? 1 - clamp(shift / 0.3) : 1;
        return al > 0 ? <TileView key={tl.name} x={lerp(x0, x1, fr)} y={lerp(y0, y1, fr)} tile={tl} alpha={al} /> : null;
      })}
      {newAlpha > 0 ? (() => {
        const [x, y] = slotXY(6);
        return <TileView x={x} y={y} tile={NEW_TILE} alpha={newAlpha} badge />;
      })() : null}
    </g>
  );
};

// ---------------------------------------------------------------- modal
const Sparkles: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_PAINT_END || t > T_PAINT_END + 2.4) return null;
  const cols = [TXT, ACC, CAU, ALR];
  return (
    <g>
      {Array.from({ length: 22 }, (_, i) => {
        const life = 0.9 + 0.9 * h01(i, 1);
        const ts = T_PAINT_END + 0.35 * h01(i, 2);
        const age = t - ts;
        if (age < 0 || age > life) return null;
        const ang = h01(i, 3) * Math.PI * 2;
        const rad = 190 + 150 * h01(i, 4);
        const px = CX0 + CW / 2 + Math.cos(ang) * rad * (0.9 + 0.2 * age) * 1.15;
        const py = CY0 + CH / 2 + Math.sin(ang) * rad * 0.8 * (0.9 + 0.2 * age) - 14 * age;
        const sz = (12 + 22 * h01(i, 5)) * Math.sin((Math.PI * age) / life);
        const rot = age * 2 + i;
        const pts = Array.from({ length: 8 }, (_, j) => {
          const r = j % 2 === 0 ? sz : sz * 0.28;
          const a = rot + (j * Math.PI) / 4;
          return `${px + Math.cos(a) * r},${py + Math.sin(a) * r}`;
        }).join(" ");
        return <polygon key={i} points={pts} fill={cols[i % 4]} opacity={0.92} />;
      })}
    </g>
  );
};

const Modal: React.FC<{ t: number }> = ({ t }) => {
  let cx = CX_BASE;
  let mode: PainterMode = "paint";
  if (t < 1.5) {
    cx = lerp(MX0 + 90, CX_BASE, eo(clamp((t - 0.4) / 1.0)));
    mode = "hopin";
  } else if (t >= T_CHEER0 && t <= T_CHEER1) mode = "cheer";
  const b = brushState(t, t < 1.5 ? CX_BASE : cx);
  const tip: Pt = t < 1.5 ? [cx + 175, GY - 140] : [b.x, b.y];
  const ex0 = CX0 + 120;
  const ex1 = CX0 + CW - 120;
  const tagA = smooth((t - 10.35) / 0.3) * (1 - smooth((t - 12.4) / 0.4));
  return (
    <g fontFamily={FONT}>
      <rect x={MX0} y={MY0} width={MW} height={MH} rx={26} fill="#18181b" stroke="#2c2c31" strokeWidth={2} />
      <text x={MX0 + 50} y={MY0 + 82} fontSize={48} fontWeight={500} fill="#f2f2f3">Draw Theme</text>
      <text x={MX0 + 50} y={MY0 + 126} fontSize={20} fill="#8d8d92">Spend earned credits on a random preset look you do not own.</text>
      <text x={MX0 + MW - 54} y={MY0 + 60} fontSize={40} fill="#8d8d92" textAnchor="middle">×</text>
      <rect x={MX0 + 50} y={MY0 + 155} width={MW - 100} height={545} rx={18} fill="#101012" stroke="#26262b" strokeWidth={2} />
      <rect x={MX0 + 90} y={GY + 12} width={MW - 180} height={3} rx={2} fill="#fff" opacity={0.04} />
      <line x1={ex0} y1={CY0 + CH - 10} x2={ex0 - 60} y2={GY + 16} stroke="#6a4a2a" strokeWidth={14} strokeLinecap="round" />
      <line x1={ex1} y1={CY0 + CH - 10} x2={ex1 + 60} y2={GY + 16} stroke="#6a4a2a" strokeWidth={14} strokeLinecap="round" />
      <rect x={CX0 - 30} y={CY0 + CH + 2} width={CW + 60} height={20} rx={6} fill="#8a6238" />
      <rect x={CX0 + 6} y={CY0 + 12} width={CW} height={CH} rx={30} fill="#000" opacity={0.22} />
      {t < T_FLY0 ? (
        <g transform={`translate(${CX0} ${CY0})`}>
          <CardPainting t={t} />
        </g>
      ) : null}
      <rect x={MX0 + 330} y={MY0 + 735} width={270} height={50} rx={25} fill={ORANGE} />
      <text x={MX0 + 465} y={MY0 + 767} fontSize={20} fontWeight={600} fill="#1a0f05" textAnchor="middle">1 draw, 100 Credits</text>
      <rect x={MX0 + 620} y={MY0 + 735} width={310} height={50} rx={25} fill="none" stroke="#fff" strokeOpacity={0.24} strokeWidth={1.5} />
      <text x={MX0 + 775} y={MY0 + 767} fontSize={20} fill="#c9c9ce" textAnchor="middle">10 draws, 900 Credits</text>
      <text x={MX0 + 50} y={MY0 + 826} fontSize={19} fill="#8d8d92">Balance</text>
      <text x={MX0 + 132} y={MY0 + 826} fontSize={19} fontWeight={600} fill="#e8e8ea">1200 Credits</text>
      <Painter cx={cx} gy={GY} k={1} tip={tip} tipColor={b.color} t={t} mode={mode} />
      <Sparkles t={t} />
      {tagA > 0 ? (
        <g opacity={tagA}>
          <rect x={CX0 + CW / 2 - 92} y={CY0 - 56} width={184} height={40} rx={20} fill={ACC} />
          <text x={CX0 + CW / 2} y={CY0 - 29} fontSize={22} fontWeight={600} fill="#fff" textAnchor="middle">NEW LOOK</text>
        </g>
      ) : null}
    </g>
  );
};

// ---------------------------------------------------------------- captions
const CAPS: [string, number, number][] = [
  ["Every draw is painted by hand.", 0.7, 4.7],
  ["A brand new look, painted for you.", 10.5, 13.0],
  ["Added to Unlocked. Yours to keep.", 13.9, 16.8],
];

const Caption: React.FC<{ t: number }> = ({ t }) => {
  const c = CAPS.find(([, a, b]) => t >= a && t <= b);
  if (!c) return null;
  const [txt, a, b] = c;
  const al = smooth((t - a) / 0.35) * (1 - smooth((t - (b - 0.35)) / 0.35));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, display: "flex", justifyContent: "center", opacity: al }}>
      <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 500, color: "#fff", background: "rgba(10,10,12,0.85)", border: "1.5px solid rgba(255,255,255,0.16)", borderRadius: 32, padding: "10px 36px" }}>
        {txt}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- the whole scene as a pure function of time
export const Scene: React.FC<{ t: number }> = ({ t }) => {
  const modalA = smooth(t / 0.5) * (1 - smooth((t - T_MODAL_OUT0) / (T_MODAL_OUT1 - T_MODAL_OUT0)));
  const shift = smooth((t - 13.1) / 0.9);
  const arrive = smooth((t - T_FLY1 + 0.05) / 0.25);
  const pop = clamp((t - T_FLY1) / 0.5);
  const live = t >= T_MODAL_OUT0;
  // flying card
  let fly: React.ReactNode = null;
  if (t >= T_FLY0) {
    const u = eio((t - T_FLY0) / (T_FLY1 - T_FLY0));
    const sx = CX0 + CW / 2;
    const sy = CY0 + CH / 2;
    const [tx, ty] = slotXY(6);
    const ex = tx + TW / 2;
    const ey = ty + TH / 2;
    const cxm = (sx + ex) / 2 - 140;
    const cym = Math.min(sy, ey) - 160;
    const x = (1 - u) ** 2 * sx + 2 * (1 - u) * u * cxm + u * u * ex;
    const y = (1 - u) ** 2 * sy + 2 * (1 - u) * u * cym + u * u * ey;
    const sc = lerp(1, TW / CW, u);
    const fa = 1 - smooth((t - T_FLY1) / 0.25);
    if (fa > 0) {
      fly = (
        <g opacity={fa}>
          <rect x={x - (CW * sc) / 2 + 6} y={y - (CH * sc) / 2 + 16} width={CW * sc} height={CH * sc} rx={30 * sc} fill="#000" opacity={0.4 * (1 - u * 0.6)} filter="url(#blur14)" />
          <g transform={`translate(${x - (CW * sc) / 2} ${y - (CH * sc) / 2}) scale(${sc})`}>
            <CardFull />
          </g>
        </g>
      );
    }
  }
  const ring = t >= T_FLY1 && t <= T_FLY1 + 0.7 ? (t - T_FLY1) / 0.7 : null;
  const [rx, ry] = slotXY(6);
  const outro = smooth((t - 16.8) / 0.6);
  const ta = smooth((t - 17.2) / 0.7);
  const cxo = lerp(2050, 1640, eo((t - 17.1) / 0.8));

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0a0a0b", overflow: "hidden" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="blur9" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id="blur14" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" /></filter>
        </defs>
        {/* page: sharp once the pop-up is gone, blurred and dimmed while it is open */}
        {live ? <PageView count={t >= T_FLY1 ? 31 : 30} shift={shift} newAlpha={arrive} countPop={t >= T_FLY1 ? pop : 0} /> : null}
        {!live || modalA > 0 ? (
          <g opacity={live ? modalA : 1}>
            <g filter="url(#blur9)">
              <PageView count={30} shift={0} newAlpha={0} countPop={0} />
            </g>
            <rect width={W} height={H} fill="#060608" opacity={0.59} />
          </g>
        ) : null}
        {modalA > 0 ? (
          <g opacity={modalA} transform={`translate(0 ${18 * (1 - modalA)})`}>
            <Modal t={t} />
          </g>
        ) : null}
        {fly}
        {ring !== null ? (
          <rect x={rx - 6 - 40 * ring} y={ry - 6 - 30 * ring} width={TW + 12 + 80 * ring} height={TH + 12 + 60 * ring} rx={22 + 20 * ring} fill="none" stroke={ACC} strokeWidth={4} opacity={1 - ring} />
        ) : null}
        {outro > 0 ? (
          <>
            <rect width={W} height={H} fill="#080a0a" opacity={0.92 * outro} />
            <g opacity={ta} transform={`translate(0 ${18 * (1 - ta)})`} fontFamily={FONT} textAnchor="middle">
              <text x={W / 2} y={500} fontSize={150} fontWeight={500} fill="#fff">Draw Theme</text>
              <text x={W / 2} y={596} fontSize={50} fontWeight={500} fill={ACC}>Every look, painted in.</text>
              <text x={W / 2} y={660} fontSize={24} fontWeight={600} fill="#8d8d92" letterSpacing={3}>COMMAND STATION</text>
            </g>
            <g opacity={outro}>
              <Painter cx={cxo} gy={1040} k={0.8} tip={[cxo + 60, 1040 - 360 + 40 * Math.sin(t * 9)]} tipColor={ACC} t={t} mode="wave" />
            </g>
          </>
        ) : null}
      </svg>
      <Caption t={t} />
    </div>
  );
};
