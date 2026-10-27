/* THE VOICE CARD, AS DATA (both renderers draw from this).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no theme import — the theme's colours,
   the 10a mood pairs and the brand ink come in as arguments, so
     node src/components/audio-card-model.test.ts
   locks the look. The React Native row (AudioCard.tsx AudioCardViewRN)
   draws it; the Swift row (modules/kindredly-ui KAudioCardRow, in a Host
   of its own or inside the composers) is handed it, every colour resolved.

   The rules are AudioCard.tsx's own (see the long comment there): the
   chrome is the theme's (lav2 panel, ind disc with the page colour on it);
   a caller's `tint` is content and keeps its white glyph; on a dark theme
   a tint that is a 10a mood ink sits on that mood's fill, its time walked
   35% toward the brand ink, the disc ringed in that time ink; `system` is
   the postal system's ruled bars, square corners and plain mono. */

/** AudioCard's sixteen bar heights, at full size */
export const AUDIO_BARS = [12, 18, 24, 16, 20, 26, 14, 22, 18, 24, 20, 14, 22, 16, 24, 18] as const;

/** m:ss (lib/format fmt, kept here so the model stays pure) */
export function audioClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

/** The theme's colours the card reads (useTheme().t). */
export type AudioCardTheme = { bg: string; ind: string; lav2: string; sub: string; line: string };

export type AudioCardInput = {
  theme: AudioCardTheme;
  dark: boolean;
  /** the 10a mood pairs, [fill, ink] (themes MOOD10A's values) */
  moods: readonly (readonly [string, string])[];
  /** the brand ink the mood time is walked toward (BRAND.inkOnBrand) */
  inkOnBrand: string;
  compact?: boolean;
  tint?: string;
  tintFill?: string;
  system?: boolean;
  playing: boolean;
  positionS: number;
  durationS: number;
};

/** One bar: its height, its colour and how strongly it is drawn. */
export type AudioCardBar = { h: number; color: string; alpha: number };

/** What either renderer draws. Colours are "#RRGGBB", or "transparent" for no panel. */
export type AudioCardLook = {
  /** the disc's fill */
  ink: string;
  /** the ▶ / ❚❚ on it */
  glyph: string;
  /** the row's ground: the mood's fill, the lav2 panel, or "transparent" (system) */
  panel: string;
  /** the disc's 1.5 ring, "" for none (Midnight, on a mood fill) */
  edge: string;
  /** the time's ink */
  timeInk: string;
  /** what the time says: where it is while playing or paused part-way, else the length */
  time: string;
  /** how far through, 0…1 */
  pct: number;
  padding: number;
  radius: number;
  /** the disc's side and its corner (a circle, square in system) */
  disc: number;
  discRadius: number;
  glyphSize: number;
  /** the ▶ sits 2 right of centre; the ❚❚ doesn't */
  glyphNudge: number;
  barRadius: number;
  bars: AudioCardBar[];
  /** the time's mono weight: 400 in system, 600 otherwise */
  mono: "regular" | "semibold";
};

/** the 10a mood fill whose ink is `ink`, or null for a tint that isn't a mood ink */
export function moodFillOf(ink: string, moods: AudioCardInput["moods"]): string | null {
  const m = moods.find(([, i]) => i.toLowerCase() === ink.toLowerCase());
  return m ? m[0] : null;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** the time's ink on a mood fill: the mood ink walked 35% toward the brand ink */
export function moodTime(hex: string, inkOnBrand: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const a = rgb(hex);
  const b = rgb(inkOnBrand);
  return "#" + a.map((c, i) => Math.round(c * 0.65 + b[i] * 0.35).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** The card's look for one moment of playback. */
export function audioCardLook(x: AudioCardInput): AudioCardLook {
  const compact = !!x.compact;
  const system = !!x.system;
  const tk = x.theme;
  const total = x.durationS || 0;
  const pos = x.positionS || 0;
  const pct = total > 0 ? Math.min(1, pos / total) : 0;

  // P.pen is ind, P.ink60 sub and P.ink12 line (lib/theme postFor)
  const ink = system ? tk.ind : x.tint ?? tk.ind;
  // white on a caller's mood colour, as drawn; the page colour on ind
  const glyph = !system && x.tint ? "#FFFFFF" : tk.bg;
  // Midnight: a mood tint's own fill under the row; null keeps the lav2 panel
  const fill = x.dark && !system && x.tint ? (x.tintFill ?? moodFillOf(x.tint, x.moods)) : null;
  const timeInk = system ? tk.sub : fill ? moodTime(ink, x.inkOnBrand) : ink;
  const time = x.playing || pos > 0 ? audioClock(pos) : audioClock(total);

  const bars = AUDIO_BARS.map((h, i): AudioCardBar => {
    const lit = i / AUDIO_BARS.length <= pct;
    return {
      h: compact ? h * 0.75 : h,
      color: system ? (lit ? tk.ind : tk.line) : ink,
      alpha: system ? 1 : lit ? (fill ? 1 : 0.9) : 0.3,
    };
  });

  return {
    ink,
    glyph,
    panel: system ? "transparent" : (fill ?? tk.lav2),
    edge: fill ? timeInk : "",
    timeInk,
    time,
    pct,
    padding: system ? 0 : compact ? 10 : 14,
    radius: system ? 0 : 14,
    disc: compact ? 36 : 44,
    discRadius: system ? 0 : 22,
    glyphSize: compact ? 13 : 15,
    glyphNudge: x.playing ? 0 : 2,
    barRadius: system ? 0 : 2,
    bars,
    mono: system ? "regular" : "semibold",
  };
}

/** The row's height before Dynamic Type: the disc and the padding round it. */
export function audioCardHeight(compact: boolean, system: boolean): number {
  return (compact ? 36 : 44) + 2 * (system ? 0 : compact ? 10 : 14);
}
