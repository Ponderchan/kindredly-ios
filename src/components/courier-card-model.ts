/* THE COURIER CARD'S MODEL — pure, no React Native, so both renderers and a
   node test can read it (node src/components/courier-card-model.test.ts).
   ────────────────────────────────────────────────────────────────────────
   The hour's four skies, where on the arc she is per state, and the words
   and flags the card shows, for the React Native card (components/
   CourierCard, which re-exports the palette for everyone who already
   imports it from there) and the SwiftUI card on Me (modules/kindredly-ui
   Portable/Me/KCourierCard.swift, behind the "couriercard" switch). The
   React Native card draws the same numbers; the Swift one gets them in
   its record (courierCardData). Living here rather than in CourierCard.tsx
   also takes the palette out of the AuraCard → AuraScene → CourierCard →
   AuraCard require cycle: AuraScene and AuraCard read it from this file. */

import type { WrenMood, WrenStage } from "./WrenBird";
import type { BirdPose } from "../lib/bird-images";

/* THE HOUR PAINTS THE SCENE. Four skies, by the phone's clock — the same
   route, the same bird, but morning is pale and low-lit, noon is clear
   blue with a high sun, evening goes amber, night is the V10 sheet: deep
   indigo, a moon, stars, and both windows lit. Text and chip inks follow
   so they stay legible on each sky. */
export type Daylight = "morning" | "day" | "evening" | "night";
export function daylight(hour = new Date().getHours()): Daylight {
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}
export interface Palette { text: string; scrim: string; button: string; buttonText: string; sky: [string, string]; sea: string; land: string; forest: string; rock: string; ink: string; chip: string; chipText: string; sun: string | null; sunAt: [number, number]; moon: boolean; stars: boolean; lit: boolean; cloud: string | null }
export const PALETTE: Record<Daylight, Palette> = {
  // `ink` draws on the sky; `body` draws on the white below it (the stage chip, the button)
  morning: { text: "#1E1B35", scrim: "#C4E1C6", button: "#2D5B3A", buttonText: "#FFFFFF", land: "#B4DCA6", forest: "#4E9A5C", rock: "#9AA3B0", sea: "#9CC8E6", sky: ["#FBE3D6", "#EAF1E4"], ink: "#2D5B3A", chip: "#2D5B3A", chipText: "#FFFFFF", sun: "#FFD79A", sunAt: [0.1, 0.42], moon: false, stars: false, lit: false, cloud: "#FFFFFF" },
  day: { text: "#1E1B35", scrim: "#ADDBB5", button: "#1F5C33", buttonText: "#FFFFFF", land: "#9CD48C", forest: "#3F8F52", rock: "#8E9AA6", sea: "#6FB6E8", sky: ["#BFE3F8", "#E3F3FB"], ink: "#1F5C33", chip: "#1F5C33", chipText: "#FFFFFF", sun: "#FFD54A", sunAt: [0.82, 0.16], moon: false, stars: false, lit: false, cloud: "#FFFFFF" },
  evening: { text: "#3B2634", scrim: "#E6CBD3", button: "#4A2F3F", buttonText: "#FFFFFF", land: "#93BB8C", forest: "#3A6F46", rock: "#7E7A8E", sea: "#8FA6CF", sky: ["#F6C39A", "#E8C7E6"], ink: "#4A2F3F", chip: "#4A2F3F", chipText: "#FFFFFF", sun: "#FF9A57", sunAt: [0.9, 0.42], moon: false, stars: false, lit: true, cloud: "#FFE0CC" },
  night: { text: "#FFFFFF", scrim: "#2B2660", button: "#FFFFFF", buttonText: "#1E1B35", land: "#2F5148", forest: "#1B3530", rock: "#3A3F5C", sea: "#1F2E5E", sky: ["#1E1B35", "#2E2A6B"], ink: "#DAD6F2", chip: "#FFFFFF", chipText: "#1E1B35", sun: null, sunAt: [0.84, 0.18], moon: true, stars: true, lit: true, cloud: null },
};

/* one block (the owner's V10): the scene is the whole card, and the words
   sit on it — on a second layer, the palette's deep tone, a solid band */
export const SCENE_H = 236;
export const BAND_H = 92;

/** Where she is per state: unsent, at home, exploring, on a delivery, bringing something back. */
export type CourierState = "unsent" | "home" | "exploring" | "delivery" | "bringing";

/* where on the arc she is, per state — 0 = your window, 1 = theirs */
export const ARC_AT: Record<CourierState, number> = { unsent: 0.06, home: 0.06, exploring: 0.5, delivery: 0.72, bringing: 0.3 };

/* a point on the quadratic arc from (x0,y) over (cx,cy) to (x1,y) */
export const onArc = (tt: number, x0: number, x1: number, y: number, cy: number) => {
  const u = 1 - tt;
  const cx = (x0 + x1) / 2;
  return { x: u * u * x0 + 2 * u * tt * cx + tt * tt * x1, y: u * u * y + 2 * u * tt * cy + tt * tt * y };
};

/* THE PLANET's place in the scene: its top, its radius as a share of the
   card's width, and where on its shoulders the two windows stand */
export const GLOBE = { top: 66, r: 0.44, shoulder: 0.3 };

/** She is in the air (bobbing, on the arc) in these states; home and unsent she sits on the sill. */
export const isFlying = (state: CourierState): boolean => state === "exploring" || state === "delivery" || state === "bringing";

/* ── her picture on the Swift card (lib/bird-images' card poses) ───────────
   The React Native card draws WrenBird live; Swift draws her snapshot,
   captured from the same WrenBird with the same props: 50 on the arc or the
   sill (flying: the fly drawing, which carries its letter; otherwise her
   mood at her stage), 44 on her day off (the game's cover: happy, the fly
   drawing without its letter when grown, perched before), wilting when
   starving. */
export type CardPose = Extract<BirdPose, `card-${string}`>;
export function courierCardPose(o: { stage: WrenStage; state: CourierState; mood: WrenMood; playing: boolean }): CardPose {
  if (o.playing) return `card-dayoff-${o.stage}`;
  if (isFlying(o.state)) return `card-fly-${o.stage}`;
  return `card-${o.stage}-${o.mood}`;
}

/** What the card needs to know, as Me's model has it (useMeModel MeCourier). */
export type CourierCardFacts = {
  /** her name */
  wren: string;
  state: CourierState;
  stage: WrenStage;
  /** her whereabouts' face (lib/whereabouts WHEREABOUTS_META[state].mood) */
  stateMood: WrenMood;
  /** the diary line (lib/flight-log): `at` null for "right now" */
  entry: { line: string; sub: string | null; at: number | null };
  /** when she is hungry or someone is waiting on you, that is what she says (lib/hunger) */
  hunger: { line: string; sub: string; mood: WrenMood; wilt: boolean } | null;
  /** her day off, with the game to open (CourierCard: dayOff && onPlay) */
  playing: boolean;
  /** your best run, to invite a rematch */
  best: number;
  /** the hour to paint (CourierCard's `hour`): the phone's clock when absent */
  hour?: number;
};

/** The words, in the reader's language (lib/i18n t; lib/flight-log agoLabel). */
export type CourierCardWords = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  ago: (at: number | null) => string;
};

/** The hour's sky, as the Swift card's record carries it: "" for no sun and no cloud. */
export type CourierPaletteRecord = {
  text: string;
  scrim: string;
  button: string;
  buttonText: string;
  sky0: string;
  sky1: string;
  sea: string;
  land: string;
  forest: string;
  rock: string;
  ink: string;
  chip: string;
  chipText: string;
  sun: string;
  sunX: number;
  sunY: number;
  moon: boolean;
  stars: boolean;
  lit: boolean;
  cloud: string;
};

export function courierPaletteRecord(P: Palette): CourierPaletteRecord {
  return {
    text: P.text,
    scrim: P.scrim,
    button: P.button,
    buttonText: P.buttonText,
    sky0: P.sky[0],
    sky1: P.sky[1],
    sea: P.sea,
    land: P.land,
    forest: P.forest,
    rock: P.rock,
    ink: P.ink,
    chip: P.chip,
    chipText: P.chipText,
    sun: P.sun ?? "",
    sunX: P.sunAt[0],
    sunY: P.sunAt[1],
    moon: P.moon,
    stars: P.stars,
    lit: P.lit,
    cloud: P.cloud ?? "",
  };
}

/** Everything the Swift card draws, but her picture (the hook adds it). The same words and
    choices as CourierCard's framed card (Me's 10a frame). */
export type CourierCardModel = {
  daylight: Daylight;
  palette: CourierPaletteRecord;
  state: CourierState;
  /** her place on the arc, 0 (your window) to 1 (theirs) */
  at: number;
  /** her day off: the course instead of the planet, and the game's cover */
  playing: boolean;
  /** in the air: on the arc, bobbing; else on the sill */
  flying: boolean;
  /** her picture (lib/bird-images) and whether it wilts */
  pose: CardPose;
  wilt: boolean;
  /** YOUR COURIER (upper-cased, as the chip draws it) */
  chip: string;
  /** YOU, SOMEWHERE: under the two windows */
  you: string;
  somewhere: string;
  /** DAY OFF: the sticker and the time on her day off */
  dayOffTag: string;
  /** her name · the time, her line, the aside ("" for none) */
  name: string;
  time: string;
  line: string;
  aside: string;
  /** the button: Open, or Play on her day off */
  cta: string;
};

export function courierCardModel(f: CourierCardFacts, w: CourierCardWords): CourierCardModel {
  const { t } = w;
  const light = daylight(f.hour);
  const playing = f.playing;
  const mood = f.hunger ? f.hunger.mood : f.stateMood;
  const line = playing ? t(f.state === "delivery" ? "ff.dayoff.lineCarrying" : "ff.dayoff.line") : f.hunger ? f.hunger.line : f.entry.line;
  const aside = playing ? (f.best > 0 ? t("ff.dayoff.subBest", { n: f.best }) : t("ff.dayoff.sub")) : (f.hunger ? f.hunger.sub : f.entry.sub) || "";
  return {
    daylight: light,
    palette: courierPaletteRecord(PALETTE[light]),
    state: f.state,
    at: ARC_AT[f.state],
    playing,
    flying: isFlying(f.state),
    pose: courierCardPose({ stage: f.stage, state: f.state, mood, playing }),
    // on her day off she is drawn without hunger's grey, as the React Native cover draws her
    wilt: !playing && !!f.hunger?.wilt,
    chip: t("me.sec.courier").toLocaleUpperCase(),
    you: t("me.route.you"),
    somewhere: t("me.route.somewhere"),
    dayOffTag: t("ff.dayoff.tag"),
    name: f.wren,
    time: playing ? t("ff.dayoff.tag") : w.ago(f.entry.at),
    line,
    aside,
    cta: playing ? t("ff.play") : t("me.open"),
  };
}
