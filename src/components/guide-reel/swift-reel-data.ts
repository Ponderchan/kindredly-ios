import type { BirdPose } from "../../lib/bird-images";
import { frostSpec, type FrostSpec } from "../../lib/frost";
import { t } from "../../lib/i18n";
import { clockTime, localeTag } from "../../lib/format";
import { MORNING_HOUR } from "../../lib/day";
import { OPENING_MIN } from "../../lib/weighted-count";
import { STARTER_STAMPS } from "../../data/stamps";
import { GUIDE_REEL_WIDTHS } from "../Stamp";
import "../../data/strings-reel-guides";
import "../../data/strings-today3d"; // pub.popLetter / pub.popNote, bag.opens

/** the stamp widths a reel may draw (components/Stamp GUIDE_REEL_WIDTHS), as Swift reads them */
const REEL_WIDTHS = GUIDE_REEL_WIDTHS.map(String);

/* WHAT EACH SWIFT REEL IS HANDED (2026-11-09; see swift-reels). One builder a reel Swift draws
   (modules/kindredly-ui Portable/Reels): the snapshots of her it draws, by the name the Swift
   scene asks for (lib/bird-images reel* poses, each at the React Native scene's own size for a
   360 square), the bundled pictures, and its words and facts in the reader's language, built
   when the language or the reels on show change. The words are the React Native reel's own t()
   keys, under those keys; where a React Native scene words a line itself (a count, a clock, a
   name split off another line) the line is built here the same way and sent under a name of its
   own, said beside it. A reel that is not here stays React Native. */

/** KReelData in Portable/Reels/KReelPlayer.swift */
export type ReelData = {
  words: Record<string, string>;
  nums?: Record<string, number>;
  lists?: Record<string, string[]>;
  colors?: Record<string, string>;
  frosts?: Record<string, FrostSpec>;
  sigs?: Record<string, { box: [number, number, number, number]; steps: { d: string; delay: number; duration: number; length: number }[] }>;
  stickers?: Record<string, { name: string; bg: string; fg: string; border: string; tilt: number; pill: boolean }>;
};

export type ReelBuild = {
  /** her snapshots, by the name the Swift scenes ask for */
  birds?: Record<string, BirdPose>;
  /** bundled pictures (require()), by name */
  assets?: Record<string, number>;
  /** the words and facts, now, in the reader's language */
  data: () => ReelData;
};

/** these keys, each worded by t() */
export const wordsOf = (keys: readonly string[]): Record<string, string> => Object.fromEntries(keys.map((k) => [k, t(k)]));

/* ── the sealed journal (guide-reel/sealed) ── */
const SEALED: ReelBuild = {
  birds: { sleepy: "reelSleepy" },
  data: () => ({ words: wordsOf(["tab.notes", "ga.sealedToday", "ga.neverPosted", "ga.phoneOnly", "gd.sealed.title"]) }),
};

/* ── how letters travel (guide-reel/letters) ── */
const LETTERS: ReelBuild = {
  birds: { fly: "reelFlyHappy", content: "reelContent", sleepy: "reelSleepy" },
  data: () => {
    // the hour tomorrow's bag opens, in the reader's clock, as the Desk scene words it
    const morning = new Date();
    morning.setHours(MORNING_HOUR, 0, 0, 0);
    const frosts: Record<string, FrostSpec> = {};
    const me = frostSpec("guide-me");
    if (me) frosts.me = me;
    [0, 1, 2].forEach((i) => {
      const f = frostSpec(`guide-desk-${i}`);
      if (f) frosts[`desk${i}`] = f;
    });
    return {
      words: {
        ...wordsOf(["pub.popLetter", "pub.popNote", "cp.header", "cp.travel", "cp.needStamp", "ui.you", "cod.wholePost", "gd.letters.title"]),
        // "{n} LEFT TODAY": Swift fills {n} as the count runs down
        "ga.left": t("ga.left"),
        "bag.opens": t("bag.opens", { t: clockTime(morning) }).toLocaleUpperCase(localeTag()),
      },
      nums: { openingMin: OPENING_MIN },
      lists: { tray: [STARTER_STAMPS[0], "made-my-day", STARTER_STAMPS[2], STARTER_STAMPS[4]], reelWidths: REEL_WIDTHS },
      frosts,
    };
  },
};

export const REEL_BUILDS: Record<string, ReelBuild> = {
  sealed: SEALED,
  letters: LETTERS,
};
