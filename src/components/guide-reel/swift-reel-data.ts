import type { BirdPose } from "../../lib/bird-images";
import { frostSpec, type FrostSpec } from "../../lib/frost";
import { t } from "../../lib/i18n";
import { clockTime, localeTag } from "../../lib/format";
import { MORNING_HOUR } from "../../lib/day";
import { OPENING_MIN } from "../../lib/weighted-count";
import { STAMPS, STAMP_CATEGORIES, STARTER_STAMPS, getStamp, sname } from "../../data/stamps";
import { PHOTO_STAMP, STAMP_FALLBACK_HEX } from "../../lib/stamp-frame";
import { DEFAULT_CATEGORY, filtersFor } from "../../lib/stamp-press-core";
import { TOPIC_TAG_NEUTRAL } from "../10a/kit";
import "../../data/strings-stamps2"; // the press's own words (cs2.cam.*, cs2.ed.*)
import { GUIDE_REEL_WIDTHS } from "../Stamp";
import { DIMENSION_INK, stickerLook, stickerName, titleName } from "../../lib/sticker-copy";
import { dimLabel } from "../../lib/aura-copy";
import type { DimKey } from "../../lib/hatch-engine";
import { AURA_SCENES, AURA_SKETCHES } from "../../data/aura-scenes";
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

/* ── the writing aura (guide-reel/aura) ── */
const AURA_SCENE = "quick-storyteller";
const AURA_DIMS: DimKey[] = ["sentence", "structure", "perspective", "rhythm", "function", "vocabulary", "punctuation", "emotion", "quirks"];
/** the stickers the scenes draw, each at its place in its row (the tilt is the place's) */
const AURA_STICKERS: [string, number][] = [
  ["straight_shooter", 0],
  ["repeat_offender", 1],
  ["laugh_tracker", 2],
  ["scene_setter", 1],
  ["laugh_tracker", 1],
];
const AURA: ReelBuild = {
  assets: { scene: AURA_SCENES[AURA_SCENE], sketch: AURA_SKETCHES[AURA_SCENE] },
  data: () => {
    const stickers: NonNullable<ReelData["stickers"]> = {};
    for (const [id, i] of AURA_STICKERS) {
      const look = stickerLook(id, i);
      stickers[`${id}#${i}`] = { name: stickerName(id), bg: look.bg, fg: look.fg, border: look.border, tilt: parseFloat(look.tilt) || 0, pill: look.radius === 999 };
    }
    return {
      words: {
        ...wordsOf(["cp.travel", "ga.phoneOnly", "gd.aura.title"]),
        // the laugh in this language's own spelling, cut from the laugh sticker's line as Read cuts it
        laugh: t("st.laugh_tracker.line").split(/[,、:：]/)[0].trim(),
        // one name the engine can really give: short lines + opening on a scene
        name: titleName({ state: "formed", noun: "storyteller", adjective: "quick", basis: [] }),
        ...Object.fromEntries(AURA_DIMS.map((k) => [`dim.${k}`, dimLabel(k)])),
      },
      colors: Object.fromEntries(AURA_DIMS.map((k) => [`dim.${k}`, DIMENSION_INK[k].bg])),
      stickers,
    };
  },
};

/* ── the mood stamps (guide-reel/stamps) ── */
const STAMPS_CHOSEN = "made-my-day";
const STAMPS_SUGGESTED = ["tiny-win", STAMPS_CHOSEN, "growing"];
const STAMPS_REEL: ReelBuild = {
  data: () => {
    const row = filtersFor("free");
    const chosen = getStamp(STAMPS_CHOSEN);
    return {
      words: {
        ...wordsOf(["cp.travel", "cp.needStamp", "cp.forThisLetter", "cs2.ed.topicPh", "gd.stamps.pressTopic", "cs2.cam.hint", "cs2.ed.fcBadge", "gd.stamps.title"]),
        ...Object.fromEntries(row.map((f) => [`cs2.ed.f.${f.id}`, t(`cs2.ed.f.${f.id}`)])),
        // the fanned stamps' names as Suggest sets them, and the chosen one's pill as Land sets it
        ...Object.fromEntries(STAMPS_SUGGESTED.map((id) => [`fan.${id}`, sname(getStamp(id)?.name).toUpperCase()])),
        tag: `#${sname(chosen?.name).toLowerCase()}`,
        // the photo stamp's cut on its 100 × 120 box (lib/stamp-frame PHOTO_STAMP.d)
        "photo.d": PHOTO_STAMP.d,
      },
      nums: { openingMin: OPENING_MIN },
      lists: {
        suggested: STAMPS_SUGGESTED,
        all: STAMPS.slice(0, 36).map((x) => x.id),
        row: row.map((f) => f.id),
        locked: row.filter((f) => f.locked).map((f) => f.id),
        reelWidths: REEL_WIDTHS,
        bites: PHOTO_STAMP.bites.map(([x, y]) => `${x},${y}`),
      },
      colors: {
        ...Object.fromEntries(STAMPS_SUGGESTED.map((id) => [`nameLight.${id}`, getStamp(id)?.nameLight ?? "#111113"])),
        chosen: chosen?.color ?? TOPIC_TAG_NEUTRAL,
        topic: STAMP_CATEGORIES.find((c) => c.id === DEFAULT_CATEGORY)?.color ?? STAMP_FALLBACK_HEX,
      },
    };
  },
};

export const REEL_BUILDS: Record<string, ReelBuild> = {
  sealed: SEALED,
  letters: LETTERS,
  aura: AURA,
  stamps: STAMPS_REEL,
};
