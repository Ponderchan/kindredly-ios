import { COLS, hashStr, inkedCells } from "../lib/mosaic";
import type { KindredNotice, RoadFact } from "../lib/kindred-read";

/* THE INTRODUCTION, AS DATA (the rules both renderers draw from).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — every word comes in through
   `t` and every date through `day`, so
     node src/components/introduction-model.test.ts
   locks the rules. React Native's sheet and ritual (components/
   Introduction, IntroductionRitual) and the SwiftUI sheet behind the
   "introritual" switch (components/IntroductionNative → KIntroductionView)
   both take their clock, their burst and their words from here, so the two
   can't drift.

   THE MOSAIC RITUAL'S CLOCK (identity off, or names traded before it), in
   ms from the moment the sheet opened:
     road     380   the first letter leaves; one every 240, each crossing in 620
     burst   3700   their mosaic blows apart (1100)
     slap    4220   the kindred-green sticker is slapped down
     name    4740   the caret arrives; 240 later a letter every 95, a jolt 80
                    after the last, the caret gone 600 after it
     bump    6240   the two faces meet; names fade in at +700, the chip at +600
     notice  7340   what she noticed is slapped under them
     done    8040   (a long name can still be typing: mosaicRitualEnd)

   THE BURST. Their own inked cells (FACE v1, lib/mosaic inkedCells, in its
   order), each thrown its own way: outward from its place in the grid, a
   little chaos from its index (hashStr "scrap-"+n), a spin, gravity. */

/* ── the mosaic ritual's clock ─────────────────────────────────────────── */

export const T_ROAD = 380;
/** one letter crosses every 240 ms; the last lands before the burst */
export const T_STEP = 240;
/** how long one crossing takes */
export const T_FLY = 620;
export const T_BURST = T_ROAD + 10 * T_STEP + T_FLY + 300;
export const T_SLAP = T_BURST + 520;
export const T_NAME = T_SLAP + 520;
export const T_BUMP = T_NAME + 1500;
export const T_NOTICE = T_BUMP + 1100;
export const T_RITUAL_DONE = T_NOTICE + 700;

/** how long the scraps fly */
export const BURST_MS = 1100;
/** the name: the caret waits this long before the first letter, then a letter every TYPE_STEP */
export const TYPE_LEAD = 240;
export const TYPE_STEP = 95;
/** the jolt comes this long after the last letter, and the caret goes this long after it */
export const TYPE_JOLT_AFTER = 80;
export const TYPE_CARET_AFTER = 600;
/** the jolt's own length (70 up, 260 back) */
const JOLT_MS = 70 + 260;

/** When each letter of a name typed from `at` lands, and when the caret comes and goes. */
export function typedNameBeats(letters: number, at: number): { caret: number; letter: (i: number) => number; last: number; jolt: number; caretOff: number } {
  const last = at + TYPE_LEAD + letters * TYPE_STEP;
  return {
    caret: at,
    /** letter i (1-based) lands at this time */
    letter: (i: number) => at + TYPE_LEAD + i * TYPE_STEP,
    last,
    jolt: last + TYPE_JOLT_AFTER,
    caretOff: last + TYPE_CARET_AFTER,
  };
}

/** When nothing in the mosaic ritual moves any more: done, or later while a long name is still typed. */
export function mosaicRitualEnd(nameLetters: number): number {
  const typed = typedNameBeats(nameLetters, T_NAME);
  return Math.max(T_RITUAL_DONE, typed.caretOff, typed.jolt + JOLT_MS);
}

/** The prefix shown after each letter lands: what React Native's TypedName shows (name.slice(0, i)). */
export function typedSteps(name: string): string[] {
  return Array.from({ length: name.length }, (_, i) => name.slice(0, i + 1));
}

/* ── the burst ─────────────────────────────────────────────────────────── */

export const SCRAP_CELL = 9;
export const SCRAP_GAP = 3.5;
export const SCRAP_GRID = COLS * SCRAP_CELL + (COLS - 1) * SCRAP_GAP;

/** One scrap of their mosaic: where it sits (its middle, from the grid's middle) and its throw. */
export type Scrap = { r: number; c: number; x0: number; y0: number; ang: number; dist: number; spin: number };

/** Their inked cells, in inkedCells' order, each with its own throw. */
export function burstScraps(seed: string): Scrap[] {
  return Array.from(inkedCells(seed)).map((k, n) => {
    const [r, c] = k.split(",").map(Number);
    const x0 = c * (SCRAP_CELL + SCRAP_GAP) - SCRAP_GRID / 2 + SCRAP_CELL / 2;
    const y0 = r * (SCRAP_CELL + SCRAP_GAP) - SCRAP_GRID / 2 + SCRAP_CELL / 2;
    const h = hashStr(`scrap-${n}`);
    const ang = Math.atan2(y0, x0 || 0.01) + (((h % 40) - 20) * Math.PI) / 180;
    const dist = 70 + (h % 50);
    const spin = (h % 2 ? 1 : -1) * (180 + (h % 180));
    return { r, c, x0, y0, ang, dist, spin };
  });
}

/* A scrap at p (0..1 of the burst, ease-out cubic over BURST_MS), drawn by both renderers with
   these very sums (React Native's Scrap worklet, Swift's KIntroMosaicRitual):
     x = x0 + cos(ang)·dist·p
     y = y0 + sin(ang)·dist·p·0.6 − 30·sin(pπ) + 90p²     (a lift, then gravity)
     turn = spin·p degrees;  opacity 1 until p .7, then down to 0 at 1 */

/* ── the words ─────────────────────────────────────────────────────────── */

export type IntroductionWordsInput = {
  /** her name (useWrenName) */
  wren: string;
  /** their name as the screen knows it (the pen name traded, or cm.kindred) */
  otherName: string;
  /** the reader's own pen name, "" when they have none */
  myName: string;
  /** identity on: what each side signed (just the words) */
  signed: { theirs: { courier: string; name: string }; mine: { courier: string; name: string } } | null;
  /** how many letters bought this */
  roadLetters: number;
  /** the day the names met */
  since: string;
  notice: KindredNotice | null;
  /** what the road says, when no label showed (lib/kindred-read roadFact) */
  fact: RoadFact | null;
};

export type IntroductionWordsDeps = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** "Oct 14" (lib/format dShort) */
  day: (iso: string) => string;
  /** a sticker label's name (lib/sticker-copy stickerName) */
  stickerName: (id: string) => string;
};

export type IntroductionWords = {
  /** "Carried by {wren}" */
  title: string;
  /** the ✕'s VoiceOver name */
  close: string;
  /** her letter */
  body: string;
  /** "KINDREDS · OCT 14" */
  chip: string;
  /** the whole ritual as one VoiceOver sentence */
  ritualA11y: string;
  /** "{WREN} NOTICED" */
  noticedHead: string;
  /** what she noticed, or what the road says; "" for neither (nothing is shown) */
  noticedLine: string;
  /** the line under it all */
  knowYou: string;
  /** TALK TO {name} */
  talkTo: string;
  /** the name that was signed, when it was: TALK TO and "theirs" follow it */
  theirName: string;
  meName: string;
};

/** Every word of the introduction, the same for both renderers. */
export function introductionWords(i: IntroductionWordsInput, d: IntroductionWordsDeps): IntroductionWords {
  const { t } = d;
  const theirName = i.signed ? i.signed.theirs.name : i.otherName;
  const meName = i.signed ? i.signed.mine.name : i.myName;
  const chip = t("in.sinceChip", { date: d.day(i.since).toUpperCase() });
  const ritualA11y = i.signed
    ? [t("id2.in.a11y", { name: i.signed.theirs.courier, pen: i.signed.theirs.name }), t("id2.in.a11yMine", { name: i.signed.mine.courier, pen: i.signed.mine.name || t("in.meFallback") }), chip].join(" ")
    : /* the mosaic ritual (no signatures: the switch off, or names traded before it) is one
         sentence too, not the jumping counts, ten envelopes' dates and a half-typed name */
      [i.roadLetters ? t("in.a11yOff", { n: i.roadLetters, name: i.otherName }) : i.otherName, chip].filter(Boolean).join(" ");
  // a label you both wear, or their strongest; and when five letters were too few for any label,
  // what the road itself says. Counted, never generated.
  const fact = i.notice ? null : i.fact;
  const noticedLine = i.notice
    ? i.notice.shared
      ? t("in.both", { label: d.stickerName(i.notice.stickerId), n: i.notice.supporting, m: i.notice.eligible })
      : t("in.theirs", { name: theirName, label: d.stickerName(i.notice.stickerId), n: i.notice.supporting, m: i.notice.eligible })
    : fact
      ? fact.nightTheirs > 0
        ? t("in.roadNight", { n: fact.letters, d: fact.days, k: fact.nightTheirs })
        : t("in.roadWait", { n: fact.letters, d: fact.days, g: fact.longestWaitDays })
      : "";
  return {
    title: t("intro.carriedBy", { name: i.wren }),
    close: t("wren.trackClose"),
    body: t("intro.body"),
    chip,
    ritualA11y,
    noticedHead: t("in.noticed", { wren: i.wren.toUpperCase() }),
    noticedLine,
    knowYou: meName ? t("in.knowYou", { name: meName }) : t("in.knowYouUnsigned"),
    talkTo: t("in.talkTo", { name: theirName }),
    theirName,
    meName,
  };
}
