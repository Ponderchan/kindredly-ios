import type { GrowthStamp, GrowthStats } from "../../data/growth";

/* THE STAMP ALBUM, AS DATA (2026-10-27): Kindredly's growth stamps
   (app/stamps.tsx, dev only).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — her voice comes in through
   `fmt`, so `node src/screens/stamps/stampbook-model.test.ts` locks the
   rules. StampBookNative turns this into the Swift page (KStampBookView);
   the React Native page, the "stampbook" switch's fallback, does the same
   inline:

   - earned in colour, the rest in grey (GrowthStampTile: a gradient from
     the stamp's colour 34 up to 22 down, or #DFDFDB to #C6C6C2), in the
     catalogue's order, and the count at the bar's right ("3/12");
   - a stamp's card: STAMP NO. 01 · its Chinese name, the progress bar and
     "n / of" only while it is not earned and has a target, its story in
     her voice, and "Write a letter" (earned) or "Keep going". The page's
     words are English-only and stay as they are. */

export type StampBookFormat = {
  /** a line in her voice, her name in it (lib/wren-name speakAs) */
  speak: (line: string) => string;
};

export type StampBookTile = {
  id: string;
  name: string;
  emoji: string;
  earned: boolean;
  /** the face's gradient, top-left to bottom-right, "#RRGGBB" */
  faceFrom: string;
  faceTo: string;
  /** STAMP NO. 01 · 第一封信 */
  label: string;
  desc: string;
  /** "2 / 3" while not earned and it has a target; "" otherwise */
  progress: string;
  /** 0…1 for the bar, with `progress` */
  fraction: number;
  /** the card's key */
  action: string;
};

export type StampBookView = {
  tiles: StampBookTile[];
  /** "3/12" */
  count: string;
};

/** lib/format shade, as "#RRGGBB": each channel moved by `d`, held within 0…255. */
export function shadeHex(hex: string, d: number): string {
  const h = hex.replace("#", "");
  const v = (i: number) => Math.max(0, Math.min(255, parseInt(h.substr(i, 2), 16) + d));
  return "#" + [0, 2, 4].map((i) => v(i).toString(16).padStart(2, "0").toUpperCase()).join("");
}

export const STAMPBOOK_WORDS = {
  title: "Your stamps",
  intro: "Earned by the quiet things — writing, answering, keeping, staying. Wren presses one for each.",
  write: "Write a letter",
  keepGoing: "Keep going",
} as const;

export function stampBookView(stamps: readonly GrowthStamp[], stats: GrowthStats, fmt: StampBookFormat): StampBookView {
  const tiles = stamps.map((s, i) => {
    const earned = s.earned(stats);
    const p = !earned && s.progress ? s.progress(stats) : null;
    return {
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      earned,
      faceFrom: earned ? shadeHex(s.color, 34) : "#DFDFDB",
      faceTo: earned ? shadeHex(s.color, -22) : "#C6C6C2",
      label: `STAMP NO. ${String(i + 1).padStart(2, "0")} · ${s.zh}`,
      desc: fmt.speak(s.desc),
      progress: p ? `${p[0]} / ${p[1]}` : "",
      fraction: p && p[1] > 0 ? Math.max(0, Math.min(1, p[0] / p[1])) : 0,
      action: earned ? STAMPBOOK_WORDS.write : STAMPBOOK_WORDS.keepGoing,
    };
  });
  return { tiles, count: `${tiles.filter((t) => t.earned).length}/${stamps.length}` };
}
