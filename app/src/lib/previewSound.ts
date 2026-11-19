/**
 * The 20 alert sounds (`alert-sound-01` to `alert-sound-20`). Each is a hand-made recipe synthesized with Web Audio,
 * so the app needs no sound files. Every sound has to work on its own as the station alert tone; `suits` is only a hint.
 *
 * Recipes draw into any `BaseAudioContext`, so the same code plays live (`playAlertPreview`) and renders offline
 * (`renderAlertSound`), for example to export WAV files for the CMS later.
 */

export type AlertSoundFamily = "Chime" | "Pluck" | "Glass" | "Soft synth" | "Digital";
export type AlertSoundMood = "calm" | "bright" | "urgent";

export interface AlertSoundInfo {
  id: string;
  name: string;
  family: AlertSoundFamily;
  mood: AlertSoundMood;
  /** What it sounds like, in a few words. */
  character: string;
  /** The alert it fits best. */
  suits: string;
}

type Recipe = (c: BaseAudioContext, out: AudioNode, t: number) => void;

/* ---------------- Voices ---------------- */

/** MIDI note number to Hz. 72 = C5 (523 Hz), 84 = C6, 96 = C7. */
const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** A gain node that rises over `a` seconds to `peak`, then fades out over `d` seconds. */
function env(c: BaseAudioContext, out: AudioNode, t: number, a: number, d: number, peak: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(out);
  return g;
}

function osc(c: BaseAudioContext, out: AudioNode, t: number, f: number, type: OscillatorType, a: number, d: number, peak: number): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.connect(env(c, out, t, a, d, peak));
  o.start(t);
  o.stop(t + a + d + 0.05);
  return o;
}

function lowpass(c: BaseAudioContext, out: AudioNode, f: number, q = 0.7): BiquadFilterNode {
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = f;
  lp.Q.value = q;
  lp.connect(out);
  return lp;
}

/** FM bell: a sine carrier bent by a sine at `ratio` times its pitch; the bend fades faster than the tone. */
function bell(c: BaseAudioContext, out: AudioNode, t: number, f: number, d = 1.1, peak = 0.22, ratio = 1.4, index = 2.4) {
  const car = osc(c, out, t, f, "sine", 0.004, d, peak);
  const mod = c.createOscillator();
  const depth = c.createGain();
  mod.frequency.value = f * ratio;
  depth.gain.setValueAtTime(f * index, t);
  depth.gain.exponentialRampToValueAtTime(f * 0.05, t + d * 0.6);
  mod.connect(depth).connect(car.frequency);
  mod.start(t);
  mod.stop(t + d + 0.05);
}

/** Marimba: a round fundamental plus a short, bright overtone near the 4th partial. */
function marimba(c: BaseAudioContext, out: AudioNode, t: number, f: number, peak = 0.22, d = 0.45) {
  osc(c, out, t, f, "sine", 0.003, d, peak);
  osc(c, out, t, f * 3.93, "sine", 0.002, 0.07, peak * 0.35);
}

/** Kalimba: a soft triangle with an octave shimmer that dies quickly. */
function kalimba(c: BaseAudioContext, out: AudioNode, t: number, f: number, peak = 0.22) {
  osc(c, out, t, f, "triangle", 0.003, 0.5, peak);
  osc(c, out, t, f * 2, "sine", 0.002, 0.12, peak * 0.3);
}

/** Wood knock: a sine that drops into pitch over 20 ms and stops short. */
function knock(c: BaseAudioContext, out: AudioNode, t: number, f: number, peak = 0.3) {
  const o = osc(c, out, t, f * 1.6, "sine", 0.002, 0.12, peak);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
}

/** Glass: inharmonic sine partials, each higher one fading sooner. */
function glass(c: BaseAudioContext, out: AudioNode, t: number, f: number, d = 0.9, peak = 0.16) {
  const parts: [number, number, number][] = [
    [1, 1, 1],
    [2.32, 0.5, 0.6],
    [4.25, 0.3, 0.35],
    [6.63, 0.15, 0.2],
  ];
  for (const [ratio, amp, life] of parts) osc(c, out, t, f * ratio, "sine", 0.002, d * life, peak * amp);
}

/** Soft synth pad: two detuned saws through a lowpass, slow to rise. */
function pad(c: BaseAudioContext, out: AudioNode, t: number, f: number, a = 0.1, d = 0.6, peak = 0.1, cutoff = 1800) {
  const lp = lowpass(c, out, cutoff);
  for (const cents of [-7, 7]) osc(c, lp, t, f, "sawtooth", a, d, peak).detune.value = cents;
}

/** Retro blip: a square wave with the harsh top cut off. */
function blip(c: BaseAudioContext, out: AudioNode, t: number, f: number, d = 0.08, peak = 0.2, cutoff = 3500) {
  osc(c, lowpass(c, out, cutoff), t, f, "square", 0.002, d, peak);
}

/** An echo send: what goes into the returned node repeats every `time` seconds, `fb` quieter each time. */
function echo(c: BaseAudioContext, out: AudioNode, time: number, fb: number): AudioNode {
  const input = c.createGain();
  const delay = c.createDelay(1);
  const loop = c.createGain();
  delay.delayTime.value = time;
  loop.gain.value = fb;
  input.connect(out);
  input.connect(delay);
  delay.connect(loop).connect(delay);
  delay.connect(out);
  return input;
}

/** A short burst of filtered noise whose band sweeps from `f0` to `f1`. */
function whoosh(c: BaseAudioContext, out: AudioNode, t: number, d: number, f0: number, f1: number, peak = 0.12) {
  const len = Math.ceil(c.sampleRate * d);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 2.5;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + d);
  src.connect(bp).connect(env(c, out, t, d * 0.6, d * 0.4, peak));
  src.start(t);
  src.stop(t + d + 0.05);
}

/* ---------------- The 20 sounds ---------------- */

const SOUNDS: (AlertSoundInfo & { play: Recipe })[] = [
  // Chime: FM bells.
  {
    id: "alert-sound-01", name: "Dawn Bell", family: "Chime", mood: "calm",
    character: "Two soft bells rising a fifth", suits: "Calendar event soon",
    play: (c, o, t) => { bell(c, o, t, hz(79)); bell(c, o, t + 0.14, hz(86)); },
  },
  {
    id: "alert-sound-02", name: "Harbor", family: "Chime", mood: "calm",
    character: "One warm two-note bell, struck together", suits: "Any gentle reminder",
    play: (c, o, t) => { bell(c, o, t, hz(72), 1.3, 0.18, 1.4, 1.5); bell(c, o, t, hz(79), 1.3, 0.14, 1.4, 1.5); },
  },
  {
    id: "alert-sound-03", name: "Lantern", family: "Chime", mood: "bright",
    character: "Three bells stepping down", suits: "Calendar event soon",
    play: (c, o, t) => [88, 84, 79].forEach((n, i) => bell(c, o, t + i * 0.11, hz(n), 0.9, 0.18)),
  },
  {
    id: "alert-sound-04", name: "Toll", family: "Chime", mood: "urgent",
    character: "A metal bell struck twice", suits: "GPU too hot",
    play: (c, o, t) => { bell(c, o, t, hz(81), 0.8, 0.2, 3.5, 3); bell(c, o, t + 0.22, hz(81), 0.9, 0.2, 3.5, 3); },
  },
  // Pluck: wood and tines.
  {
    id: "alert-sound-05", name: "Driftwood", family: "Pluck", mood: "bright",
    character: "Marimba, two notes up", suits: "Any friendly heads-up",
    play: (c, o, t) => { marimba(c, o, t, hz(84)); marimba(c, o, t + 0.1, hz(91)); },
  },
  {
    id: "alert-sound-06", name: "Skipstone", family: "Pluck", mood: "bright",
    character: "A quick kalimba flutter", suits: "Calendar event soon",
    play: (c, o, t) => [88, 86, 88].forEach((n, i) => kalimba(c, o, t + i * 0.07, hz(n))),
  },
  {
    id: "alert-sound-07", name: "Doorstep", family: "Pluck", mood: "calm",
    character: "Two wooden knocks", suits: "Calendar event soon",
    play: (c, o, t) => { knock(c, o, t, hz(81)); knock(c, o, t + 0.13, hz(81), 0.24); },
  },
  {
    id: "alert-sound-08", name: "Seedpod", family: "Pluck", mood: "bright",
    character: "A marimba roll that lands high", suits: "Any good-news alert",
    play: (c, o, t) => {
      [84, 86, 88, 91].forEach((n, i) => marimba(c, o, t + i * 0.06, hz(n), 0.2, 0.25));
      marimba(c, o, t + 0.24, hz(93), 0.24, 0.6);
    },
  },
  // Glass: inharmonic, airy.
  {
    id: "alert-sound-09", name: "Prism", family: "Glass", mood: "calm",
    character: "A strummed glass chord", suits: "Any gentle reminder",
    play: (c, o, t) => [84, 88, 91].forEach((n, i) => glass(c, o, t + i * 0.03, hz(n), 1.0, 0.11)),
  },
  {
    id: "alert-sound-10", name: "Frost", family: "Glass", mood: "calm",
    character: "One high glass ping that echoes away", suits: "Calendar event soon",
    play: (c, o, t) => glass(c, echo(c, o, 0.18, 0.32), t, hz(93), 0.9, 0.15),
  },
  {
    id: "alert-sound-11", name: "Thaw", family: "Glass", mood: "bright",
    character: "Four glass drops falling", suits: "Any heads-up",
    play: (c, o, t) => [91, 88, 86, 84].forEach((n, i) => glass(c, o, t + i * 0.07, hz(n), 0.5, 0.13)),
  },
  {
    id: "alert-sound-12", name: "Shard", family: "Glass", mood: "urgent",
    character: "Two sharp, bright glass hits", suits: "Memory nearly full",
    play: (c, o, t) => { glass(c, o, t, hz(96), 0.4, 0.16); glass(c, o, t + 0.12, hz(96), 0.45, 0.16); },
  },
  // Soft synth: rounded, analog-like.
  {
    id: "alert-sound-13", name: "Halo", family: "Soft synth", mood: "calm",
    character: "A soft chord that swells in and out", suits: "Any gentle reminder",
    play: (c, o, t) => { pad(c, o, t, hz(72), 0.12, 0.6); pad(c, o, t, hz(76), 0.12, 0.6); pad(c, o, t + 0.05, hz(79), 0.12, 0.55, 0.08); },
  },
  {
    id: "alert-sound-14", name: "Heartbeat", family: "Soft synth", mood: "urgent",
    character: "Two muffled pulses, the second softer", suits: "GPU too hot",
    play: (c, o, t) => { pad(c, o, t, hz(69), 0.01, 0.16, 0.24, 1400); pad(c, o, t + 0.17, hz(69), 0.01, 0.22, 0.17, 1100); },
  },
  {
    id: "alert-sound-15", name: "Glide", family: "Soft synth", mood: "bright",
    character: "One tone that slides up and settles", suits: "Any heads-up",
    play: (c, o, t) => {
      const v = osc(c, lowpass(c, o, 2600), t, hz(76), "triangle", 0.03, 0.5, 0.26);
      v.frequency.setValueAtTime(hz(76), t);
      v.frequency.exponentialRampToValueAtTime(hz(83), t + 0.16);
    },
  },
  {
    id: "alert-sound-16", name: "Exhale", family: "Soft synth", mood: "calm",
    character: "A breath of air, then a soft note", suits: "Calendar event soon",
    play: (c, o, t) => { whoosh(c, o, t, 0.3, 700, 3200, 0.22); glass(c, o, t + 0.24, hz(91), 0.7, 0.15); },
  },
  // Digital: game-console blips.
  {
    id: "alert-sound-17", name: "Byte", family: "Digital", mood: "bright",
    character: "Two short blips and a high one", suits: "Any heads-up",
    play: (c, o, t) => { blip(c, o, t, hz(86)); blip(c, o, t + 0.09, hz(86)); blip(c, o, t + 0.18, hz(93), 0.16); },
  },
  {
    id: "alert-sound-18", name: "Echolocate", family: "Digital", mood: "bright",
    character: "A clean ping with a long echo", suits: "Ping spike",
    play: (c, o, t) => { osc(c, echo(c, o, 0.2, 0.3), t, hz(84), "sine", 0.004, 0.3, 0.26); },
  },
  {
    id: "alert-sound-19", name: "Overclock", family: "Digital", mood: "urgent",
    character: "A fast arpeggio racing up", suits: "GPU too hot",
    play: (c, o, t) => [84, 88, 91, 96, 91, 96].forEach((n, i) => blip(c, o, t + i * 0.05, hz(n), 0.06, 0.17)),
  },
  {
    id: "alert-sound-20", name: "Red Line", family: "Digital", mood: "urgent",
    character: "Two tones trading places, twice", suits: "Memory nearly full",
    play: (c, o, t) => [86, 81, 86, 81].forEach((n, i) => blip(c, o, t + i * 0.12, hz(n), 0.1, 0.19, 2500)),
  },
];

export const ALERT_SOUNDS: AlertSoundInfo[] = SOUNDS.map(({ play: _play, ...info }) => info);

export const alertSoundInfo = (id: string): AlertSoundInfo | undefined => ALERT_SOUNDS.find((s) => s.id === id);

/** Unknown ids fall back to Harbor, the most neutral sound. */
const recipeFor = (id: string): Recipe => (SOUNDS.find((s) => s.id === id) ?? SOUNDS[1]).play;

/** Every sound goes through one level and a limiter, so no recipe can come out louder than the rest. */
function master(c: BaseAudioContext): AudioNode {
  const lim = c.createDynamicsCompressor();
  lim.threshold.value = -10;
  lim.knee.value = 4;
  lim.ratio.value = 12;
  lim.attack.value = 0.002;
  lim.release.value = 0.12;
  lim.connect(c.destination);
  const g = c.createGain();
  g.gain.value = 0.85;
  g.connect(lim);
  return g;
}

let ctx: AudioContext | null = null;

/** Plays an alert sound now. */
export function playAlertPreview(id: string): void {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  recipeFor(id)(ctx, master(ctx), ctx.currentTime + 0.02);
}

/** Renders an alert sound offline (mono, 2 seconds is longer than any of them). */
export function renderAlertSound(id: string, sampleRate = 44100): Promise<AudioBuffer> {
  const c = new OfflineAudioContext(1, Math.ceil(sampleRate * 2), sampleRate);
  recipeFor(id)(c, master(c), 0.01);
  return c.startRendering();
}
