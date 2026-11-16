import React from "react";
import { ACC, ALR, CAU, INK, ORANGE, PAPER, SKIN, TEAL, WOOD, T_CHEER0, clamp, type Pt } from "./theme";

export type PainterMode = "paint" | "cheer" | "wave" | "hopin";

type Props = {
  cx: number;
  gy: number;
  k: number;
  tip: Pt;
  tipColor: string;
  t: number;
  mode: PainterMode;
};

/** The painter. A pure function of its props: the two-link arm and the long brush follow `tip`. */
export const Painter: React.FC<Props> = ({ cx, gy, k, tip, tipColor, t, mode }) => {
  const q = (v: number) => v * k;
  const bob = 3 * k * Math.sin(t * 6.5);
  let jump = 0;
  if (mode === "cheer") jump = -58 * k * Math.abs(Math.sin(((t - T_CHEER0) * Math.PI) / 0.7));
  if (mode === "hopin") jump = -46 * k * Math.abs(Math.sin(clamp((t - 0.4) / 1.0) * Math.PI * 3));
  const g2 = gy + jump;
  const sh = clamp(1 + jump / (160 * k));
  const by = g2 + bob;

  const hx = cx + clamp((tip[0] - cx) / 400, -1, 1) * q(6);
  const hy = by - q(292);
  const dxe = tip[0] - hx;
  const dye = tip[1] - hy;
  const dl = Math.max(1, Math.hypot(dxe, dye));
  const ox = (dxe / dl) * q(4);
  const oy = (dye / dl) * q(3);
  const blink = t % 3.1 < 0.12;

  // left arm and palette
  const sl: Pt = [cx - q(54), by - q(206)];
  const hl: Pt = mode !== "cheer" ? [cx - q(100), by - q(164)] : [cx - q(112), by - q(338)];
  const pc: Pt = [hl[0] - q(24), hl[1] + q(10)];

  // right arm: hand sits on the line to the tip, two-link IK for the elbow
  const sr: Pt = [cx + q(54), by - q(206)];
  const vx = tip[0] - sr[0];
  const vy = tip[1] - sr[1];
  const dist = Math.max(1, Math.hypot(vx, vy));
  const ux = vx / dist;
  const uy = vy / dist;
  const handD = Math.min(q(185), dist * 0.55);
  let hand: Pt = [sr[0] + ux * handD, sr[1] + uy * handD];
  if (Math.hypot(tip[0] - hand[0], tip[1] - hand[1]) < q(95)) hand = [tip[0] - ux * q(95), tip[1] - uy * q(95)];
  const l1 = q(102);
  const rawD = Math.max(1, Math.hypot(hand[0] - sr[0], hand[1] - sr[1]));
  const dd = Math.min(rawD, 2 * l1 - 2);
  const ex = (hand[0] - sr[0]) / rawD;
  const ey = (hand[1] - sr[1]) / rawD;
  const hh = Math.sqrt(Math.max(0, l1 * l1 - (dd / 2) ** 2));
  let px = -ey;
  let py = ex;
  if (py < 0) {
    px = -px;
    py = -py;
  }
  const elbow: Pt = [sr[0] + (ex * dd) / 2 + px * hh, sr[1] + (ey * dd) / 2 + py * hh];

  // brush
  const bdx = tip[0] - hand[0];
  const bdy = tip[1] - hand[1];
  const bl = Math.max(1, Math.hypot(bdx, bdy));
  const bx = bdx / bl;
  const byy = bdy / bl;
  const nx = -byy;
  const ny = bx;
  const back: Pt = [hand[0] - bx * q(22), hand[1] - byy * q(22)];
  const fer0: Pt = [tip[0] - bx * q(70), tip[1] - byy * q(70)];
  const fer1: Pt = [tip[0] - bx * q(34), tip[1] - byy * q(34)];
  const poly = (a: Pt, wa: number, b: Pt, wb: number) =>
    `${a[0] + nx * wa},${a[1] + ny * wa} ${b[0] + nx * wb},${b[1] + ny * wb} ${b[0] - nx * wb},${b[1] - ny * wb} ${a[0] - nx * wa},${a[1] - ny * wa}`;

  const mouthOpen = mode === "cheer" || mode === "wave";

  return (
    <g>
      <ellipse cx={cx} cy={gy + q(6)} rx={q(80) * (0.7 + 0.3 * sh)} ry={q(13) * (0.7 + 0.3 * sh)} fill="#000" opacity={0.35 * sh} />
      <rect x={cx - q(36)} y={g2 - q(76)} width={q(30)} height={q(78)} rx={q(12)} fill="#2a2640" />
      <rect x={cx + q(6)} y={g2 - q(76)} width={q(30)} height={q(78)} rx={q(12)} fill="#2a2640" />
      <rect x={cx - q(44)} y={g2 - q(12)} width={q(42)} height={q(16)} rx={q(8)} fill="#1a1830" />
      <rect x={cx + q(2)} y={g2 - q(12)} width={q(42)} height={q(16)} rx={q(8)} fill="#1a1830" />
      <rect x={cx - q(64)} y={by - q(236)} width={q(128)} height={q(176)} rx={q(42)} fill={TEAL} />
      <rect x={cx - q(50)} y={by - q(204)} width={q(100)} height={q(140)} rx={q(30)} fill={PAPER} />
      {([[-20, -150, ACC], [14, -120, CAU], [28, -168, ALR], [-6, -96, INK]] as const).map(([dx, dy, col], i) => (
        <circle key={i} cx={cx + q(dx)} cy={by + q(dy)} r={q(7)} fill={col} />
      ))}
      {/* head */}
      <circle cx={hx - q(64)} cy={hy + q(4)} r={q(12)} fill={SKIN} />
      <circle cx={hx + q(64)} cy={hy + q(4)} r={q(12)} fill={SKIN} />
      <circle cx={hx} cy={hy} r={q(68)} fill={SKIN} />
      <ellipse cx={hx + q(8)} cy={hy - q(58)} rx={q(82)} ry={q(30)} fill={ORANGE} />
      <circle cx={hx + q(14)} cy={hy - q(86)} r={q(9)} fill={ORANGE} />
      <rect x={hx - q(70)} y={hy - q(46)} width={q(142)} height={q(14)} rx={q(6)} fill="#d9722a" />
      {[-24, 26].map((e) =>
        blink ? (
          <line key={e} x1={hx + q(e) - q(8)} y1={hy + q(2)} x2={hx + q(e) + q(8)} y2={hy + q(2)} stroke="#2a2640" strokeWidth={q(4)} strokeLinecap="round" />
        ) : (
          <g key={e}>
            <ellipse cx={hx + q(e)} cy={hy} rx={q(10)} ry={q(12)} fill="#fff" />
            <circle cx={hx + q(e) + ox} cy={hy + oy} r={q(6)} fill="#2a2640" />
          </g>
        ),
      )}
      <ellipse cx={hx - q(40)} cy={hy + q(22)} rx={q(11)} ry={q(7)} fill="#ff96aa" opacity={0.6} />
      <ellipse cx={hx + q(42)} cy={hy + q(22)} rx={q(11)} ry={q(7)} fill="#ff96aa" opacity={0.6} />
      {mouthOpen ? (
        <>
          <ellipse cx={hx + q(2)} cy={hy + q(30)} rx={q(15)} ry={q(11)} fill="#7a2a3a" />
          <ellipse cx={hx + q(2)} cy={hy + q(24)} rx={q(13)} ry={q(6)} fill={SKIN} />
        </>
      ) : (
        <polyline
          points={`${hx - q(14)},${hy + q(28)} ${hx - q(4)},${hy + q(34)} ${hx + q(8)},${hy + q(34)} ${hx + q(18)},${hy + q(26)}`}
          fill="none"
          stroke="#7a2a3a"
          strokeWidth={q(4)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* left arm and palette */}
      <line x1={sl[0]} y1={sl[1]} x2={hl[0]} y2={hl[1]} stroke={TEAL} strokeWidth={q(26)} strokeLinecap="round" />
      <circle cx={hl[0]} cy={hl[1]} r={q(14)} fill={SKIN} />
      <ellipse cx={pc[0]} cy={pc[1]} rx={q(56)} ry={q(38)} fill={WOOD} stroke="#a8703a" strokeWidth={q(3)} />
      <circle cx={pc[0] + q(30)} cy={pc[1] + q(8)} r={q(8)} fill="#a8703a" />
      {([[-30, -8, ACC], [-8, -18, CAU], [16, -12, ALR], [-20, 12, INK]] as const).map(([dx, dy, col], i) => (
        <ellipse key={i} cx={pc[0] + q(dx)} cy={pc[1] + q(dy)} rx={q(9)} ry={q(7)} fill={col} />
      ))}
      {/* brush under the hand */}
      <polygon points={poly(back, q(7), fer0, q(5))} fill={WOOD} />
      <polygon points={poly(fer0, q(6), fer1, q(8))} fill="#c9ced6" />
      <polygon points={poly(fer1, q(9), tip, q(2))} fill={tipColor} />
      <circle cx={tip[0]} cy={tip[1]} r={q(3)} fill={tipColor} />
      {/* right arm over the brush */}
      <polyline points={`${sr[0]},${sr[1]} ${elbow[0]},${elbow[1]} ${hand[0]},${hand[1]}`} fill="none" stroke={TEAL} strokeWidth={q(26)} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={elbow[0]} cy={elbow[1]} r={q(13)} fill={TEAL} />
      <circle cx={hand[0]} cy={hand[1]} r={q(15)} fill={SKIN} />
    </g>
  );
};
