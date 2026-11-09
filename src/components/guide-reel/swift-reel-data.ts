import type { BirdPose } from "../../lib/bird-images";
import { frostSpec, type FrostSpec } from "../../lib/frost";
import { getLang, t } from "../../lib/i18n";
import { defaultName } from "../../lib/default-name";
import { PEN_BASELINE, PEN_H, PEN_W, penDemo, penDrawPlan, penTypedUpright, penViewBox, type PenSig } from "../../lib/pen-signature";
import { PICKS } from "../../data/sparkle-deck";
import { getFace } from "../../data/aura-avatar-lib";
import "../../data/strings-identity2"; // id2.sheet.*, id2.door.waiting
import "../../data/strings-sparkle"; // sp.pick.*
import "../../data/strings-reel-kindreds"; // ga.rowan
import { clockTime, dShort, localeTag } from "../../lib/format";
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
import { EGG_SHELLS } from "../EggShell";
import { kindredsTitleParts, paperLook } from "./swift-reel-model";
import { LETTER_FONT_CHOICES, letterFitSize, type LetterFontKey } from "../../theme/post";
import { THEMES } from "../../theme/themes";
import { PAPERS, type Paper } from "../../data/papers";
import { WAVE_LINES } from "../../data/sparkle-deck";
import { strangerName } from "../../lib/stranger-name";
import { fontTiles } from "../../screens/settings/settings-model";
import { topicTagLook } from "../10a/kit";
import "../../data/strings-news-1-0-5";
import "../../data/strings-papers"; // pp.*
import "../../data/strings-step5-settings"; // set.letterFont
import { CHICK_FILL } from "../WrenBird";
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
  papers?: object[];
};

/** what a reel may draw on beyond t(): her name, the egg she came from, whether she is still in it */
export type ReelCtx = { wren: string; egg: number; egged: boolean; font: LetterFontKey };

export type ReelBuild = {
  /** her snapshots, by the name the Swift scenes ask for */
  birds?: Record<string, BirdPose> | ((ctx: ReelCtx) => Record<string, BirdPose>);
  /** bundled pictures (require()), by name */
  assets?: Record<string, number | null>;
  /** the words and facts, now, in the reader's language */
  data: (ctx: ReelCtx) => ReelData;
};

/** a reel's snapshots for this reader */
export const birdsOf = (b: ReelBuild, ctx: ReelCtx): Record<string, BirdPose> => (typeof b.birds === "function" ? b.birds(ctx) : b.birds ?? {});

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

/* ── how a kindred forms (guide-reel/kindreds) ── */
const K_PAL = "guide-pal-5550";
const K_ME = "guide-you-12688";
const K_PAL_SIG = penDemo(K_PAL);
const K_MY_SIG = penDemo(K_ME);
/** the ceremony's signature slot, .38 × .12 of the square */
const K_SLOT_ASPECT = 0.38 / 0.12;
const kUpper = (x: string) => x.toLocaleUpperCase(localeTag());
const kSentence = (x: string) => {
  const low = x.toLocaleLowerCase(localeTag());
  return low.charAt(0).toLocaleUpperCase(localeTag()) + low.slice(1);
};
const kSig = (sig: PenSig, ms: number, fit: "box" | "ink") => {
  const vb = fit === "ink" ? penViewBox(sig, "ink", { aspect: K_SLOT_ASPECT }) : penViewBox(sig, "box");
  return { box: [vb.x, vb.y, vb.w, vb.h] as [number, number, number, number], steps: (penDrawPlan(sig, ms) ?? []).map((st) => ({ d: st.d, delay: st.delay, duration: st.duration, length: st.length })) };
};
const KINDREDS: ReelBuild = {
  birds: { fly: "reelFlyEmpty" },
  assets: { palFace: getFace("f-02-tender-thinker")?.src ?? null, myFace: getFace("m-16-pattern-finder")?.src ?? null },
  data: () => {
    const lang = getLang();
    const palName = defaultName(K_PAL, lang) ?? "";
    const myName = defaultName(K_ME, lang) ?? "";
    const palPen = kSentence(t("ga.mira"));
    const myPen = kSentence(t("ga.rowan"));
    const pair = (PICKS[lang as keyof typeof PICKS] ?? PICKS.en)[2];
    const title = kindredsTitleParts(t("gd.kindreds.title"), t("tab.kindreds"));
    const frosts: Record<string, FrostSpec> = {};
    const pal = frostSpec(K_PAL);
    const me = frostSpec(K_ME);
    if (pal) frosts.pal = pal;
    if (me) frosts.me = me;
    return {
      words: {
        ...wordsOf(["ui.you", "ch.sendYours", "id2.sheet.title", "id2.sheet.trace", "id2.sheet.traceEmpty", "id2.sheet.send", "id2.door.waiting", "sp.pick.both", "sp.pick.same.1"]),
        // "{n} OF 5": Swift fills {n} as the rows fill
        "mk.ofFive": t("mk.ofFive"),
        // the sheet's labels, upper-cased as its label() does
        "id2.sheet.name": kUpper(t("id2.sheet.name")),
        "id2.sheet.sign": kUpper(t("id2.sheet.sign")),
        palName,
        palNameUp: kUpper(palName),
        myNameUp: kUpper(myName),
        palPen,
        myPen,
        sinceChip: t("in.sinceChip", { date: kUpper(dShort(new Date())) }),
        "pick.label": kUpper(t("sp.pick.label")),
        "pick.asked": kUpper(t("sp.pick.theyAsked", { name: palPen })),
        "pick.q": pair.q,
        "pick.a": pair.a,
        "pick.b": pair.b,
      },
      nums: {
        penAspect: PEN_H / PEN_W,
        penBaseline: PEN_BASELINE,
        uprightPen: penTypedUpright(myPen) ? 1 : 0,
        uprightEmpty: penTypedUpright(t("id2.sheet.traceEmpty")) ? 1 : 0,
        titleFit: title.fit,
        titleAccent: title.accent,
      },
      lists: { titleParts: title.parts },
      frosts,
      sigs: { pad: kSig(K_MY_SIG, 1000, "box"), mine: kSig(K_MY_SIG, 400, "ink"), theirs: kSig(K_PAL_SIG, 650, "ink") },
    };
  },
};

/* ── the courier (guide-reel/courier) ── */
const COURIER_COATS = ["sticker", "plush", "peach", "ink"] as const;
const COURIER: ReelBuild = {
  birds: ({ egged }) => {
    // her own stage, or hatched while she is still an egg (useHatchedStage)
    const h = (p: string) => (egged ? `${p}-h` : p) as BirdPose;
    return {
      hatchContent: "reelHatchContent",
      hatchDelight: "reelHatchDelight",
      hatchCurious: "reelHatchCurious",
      ...Object.fromEntries(COURIER_COATS.map((c) => [`coat.${c}`, h(`reelCoat-${c}`)])),
      coatBeanie: h("reelCoatBeanie"),
      curious: h("reelCurious"),
      delight: h("reelDelight"),
      fly: "reelFlyHappy",
    };
  },
  data: ({ wren, egg }) => {
    const shell = EGG_SHELLS[egg] ?? EGG_SHELLS[0];
    return {
      words: {
        ...wordsOf(["la.out.back", "la.out.eyebrow", "la.out.repliedHead", "la.out.reads0", "la.out.reads1", "la.out.readsN", "la.out.repliedLine", "la.out.looking", "set.sec.quiet", "set.notify.title", "set.knock.title", "gd.courier.title"]),
        wren,
        ...Object.fromEntries(COURIER_COATS.map((c) => [`skin.${c}`, t(`skin.${c}.name`).toUpperCase()])),
      },
      colors: {
        "shell.base": shell.base,
        "shell.mid": shell.mid,
        "shell.deep": shell.deep,
        "shell.mark": shell.mark,
        ...Object.fromEntries(COURIER_COATS.map((c) => [`chick.${c}`, CHICK_FILL[c]])),
      },
    };
  },
};

/* ── what's new in 1.0.5 (news-reel/v1-0-5; 1.0.6 plays it too) ── */
const N_NAMED = [
  { seed: "news-105-9288", mark: "she", sign: "gemini" },
  { seed: "news-105-32", mark: "he", sign: "leo" },
  { seed: "news-105-13", mark: "", sign: "pisces" },
] as const;
const N_THEM = { seed: "news-105-9288", face: "f-02-tender-thinker", sig: penDemo("news-105-mira") };
const N_ME = { seed: "news-105-37", face: "m-15-curious-mind", sig: penDemo("news-105-theo") };
const N_SIG_OPTS = { gapMs: 40, minStrokeMs: 60 };
/** the trade sheet's pad (.68 × .152 of the square) and the ceremony's slots (.34 × .1) */
const N_PAD_ASPECT = (0.86 - 0.1 - 0.08) / (0.19 * 0.8);
const N_SLOT_ASPECT = 0.34 / 0.1;
const N_FONT_RUN = (
  [
    { key: "newsreader", at: 0 },
    { key: "garamond", at: 1300 },
    { key: "sfmono", at: 2500 },
  ] as const
).filter((r) => LETTER_FONT_CHOICES.includes(r.key));
const nSig = (sig: PenSig, ms: number, aspect: number) => {
  const vb = penViewBox(sig, "ink", { aspect });
  return { box: [vb.x, vb.y, vb.w, vb.h] as [number, number, number, number], steps: (penDrawPlan(sig, ms, N_SIG_OPTS) ?? []).map((st) => ({ d: st.d, delay: st.delay, duration: st.duration, length: st.length })) };
};
/** a face's size against the size asked (letterFitSize: .85 SF Mono, .92 Garamond, else 1) */
const fitOf = (key: LetterFontKey) => letterFitSize(key, 100) / 100;

/** a paper as Swift draws it (swift-reel-model paperLook) with its words */
const paperFacts = (p: Paper) => ({
  ...paperLook(p),
  first: p.tier === "first",
  head: t("pp.strip.head", { name: kUpper(t(p.nameKey)) }),
  nameLower: t(p.nameKey).toLocaleLowerCase(localeTag()),
});

const NEWS105: ReelBuild = {
  birds: { happy: "reelHappy" },
  assets: { meFace: getFace(N_ME.face)?.src ?? null, themFace: getFace(N_THEM.face)?.src ?? null },
  data: ({ font }) => {
    const lang = getLang();
    const unsigned = t("ld.unsigned");
    const named = (seed: string) => strangerName(seed, { lang, unsigned });
    const palPen = kSentence(t("ga.mira"));
    const pair = (PICKS[lang as keyof typeof PICKS] ?? PICKS.en)[1];
    const lines = WAVE_LINES[lang as keyof typeof WAVE_LINES] ?? WAVE_LINES.en;
    const tiles = fontTiles(LETTER_FONT_CHOICES, t);
    const cat = STAMP_CATEGORIES.find((c) => c.id === DEFAULT_CATEGORY);
    const frosts: Record<string, FrostSpec> = {};
    N_NAMED.forEach((n, i) => {
      const f = frostSpec(n.seed);
      if (f) frosts[`named${i}`] = f;
    });
    const me = frostSpec(N_ME.seed);
    const them = frostSpec(N_THEM.seed);
    if (me) frosts.me = me;
    if (them) frosts.them = them;
    return {
      words: {
        ...wordsOf([
          "nw105.press", "nw105.papers", "nw105.names", "nw105.trade", "nw105.pick", "nw105.sky", "nw105.font",
          "cs2.cam.hint", "cs2.ed.fcBadge", "cs2.ed.f.original", "cs2.ed.f.vivid", "cs2.ed.f.warm", "cs2.ed.f.golden",
          "nw105.press.topic", "nw105.papers.line", "pp.strip.fc", "pp.badge.fc",
          "id2.sheet.name", "id2.sheet.sign", "id2.sheet.send", "id2.door.waiting",
          "sp.pick.both", "sp.pick.hint", "sp.pick.same.1", "sp.wave.back",
          "set.letterFont", "set.letterFont.sub", "nw105.font.line",
        ]),
        "photo.d": PHOTO_STAMP.d,
        ...Object.fromEntries(N_NAMED.map((n, i) => [`name.${i}`, named(n.seed)])),
        myPen: t("nw105.trade.pen"),
        palPen,
        meCourier: kUpper(named(N_ME.seed)),
        themCourier: kUpper(named(N_THEM.seed)),
        "pick.label": kUpper(t("sp.pick.label")),
        "pick.asked": kUpper(t("sp.pick.theyAsked", { name: palPen })),
        "pick.q": pair.q,
        "pick.a": pair.a,
        "pick.b": pair.b,
        "sky.dusk": kUpper(t("sp.sky.dusk")),
        "sky.night": kUpper(t("sp.sky.night")),
        "line.dusk": lines.dusk[0],
        "line.night": lines.night[0],
        "wave.yours": kUpper(t("sp.wave.yourSky")),
        "wave.theirs": kUpper(t("sp.wave.theirSky", { name: palPen })),
        fontSample: tiles[0]?.sample ?? "",
      },
      nums: {
        "fit.reader": fitOf(font),
        ...Object.fromEntries(N_FONT_RUN.map((r) => [`fit.${r.key}`, fitOf(r.key)])),
      },
      lists: {
        bites: PHOTO_STAMP.bites.map(([x, y]) => `${x},${y}`),
        reelWidths: REEL_WIDTHS,
        marks: N_NAMED.map((n) => n.mark),
        signs: N_NAMED.map((n) => n.sign),
        fontKeys: tiles.map((f) => f.key),
        fontNames: tiles.map((f) => f.name),
        runKeys: N_FONT_RUN.map((r) => r.key),
        runAt: N_FONT_RUN.map((r) => String(r.at)),
      },
      colors: { topic: topicTagLook(cat?.color, THEMES.classic).fill },
      frosts,
      sigs: { "trade.pad": nSig(N_ME.sig, 1000, N_PAD_ASPECT), "trade.me": nSig(N_ME.sig, 900, N_SLOT_ASPECT), "trade.them": nSig(N_THEM.sig, 900, N_SLOT_ASPECT) },
      papers: PAPERS.map(paperFacts),
    };
  },
};

export const REEL_BUILDS: Record<string, ReelBuild> = {
  sealed: SEALED,
  letters: LETTERS,
  aura: AURA,
  stamps: STAMPS_REEL,
  kindreds: KINDREDS,
  courier: COURIER,
  "news-1.0.5": NEWS105,
};
