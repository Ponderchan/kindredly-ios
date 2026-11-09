import type { BirdPose } from "../../lib/bird-images";
import type { FrostSpec } from "../../lib/frost";
import { t } from "../../lib/i18n";
import "../../data/strings-reel-guides";

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

export const REEL_BUILDS: Record<string, ReelBuild> = {
  sealed: SEALED,
};
