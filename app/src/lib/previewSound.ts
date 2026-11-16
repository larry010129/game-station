/**
 * Plays a short preview for an alert-sound item. There are no sound files in the app yet, so each sound id
 * (`alert-sound-01` to `alert-sound-20`) is a small generated motif: its own notes, rhythm and tone. Replace this
 * with the real file when the sounds ship.
 */
let ctx: AudioContext | null = null;

/** Major pentatonic steps, in semitones above the base note. */
const SCALE = [0, 2, 4, 7, 9];
const SHAPES: number[][] = [
  [0, 1, 2], // up
  [2, 1, 0], // down
  [0, 2, 0], // out and back
  [1, 1, 3], // repeat, then lift
];

export function playAlertPreview(id: string): void {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();

  const n = Math.max(1, parseInt(id.replace(/\D+/g, ""), 10) || 1);
  const shape = SHAPES[n % SHAPES.length];
  const root = 392 * 2 ** (SCALE[n % SCALE.length] / 12) * (n > 10 ? 1.5 : 1);
  const wave: OscillatorType = n % 2 ? "triangle" : "sine";
  const gap = 0.13 + (n % 3) * 0.03;
  const now = ctx.currentTime + 0.02;

  shape.forEach((step, i) => {
    const t = now + i * gap;
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = wave;
    osc.frequency.value = root * 2 ** (SCALE[step % SCALE.length] / 12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  });
}
