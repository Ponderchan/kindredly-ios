import type { Daylight, Palette } from "../../components/courier-card-model";
import type { WrenStage } from "../../components/WrenBird";
import type { FlightMood, FlightStage } from "../../lib/bird-images";
import type { KImageRefProps } from "../../../modules/kindredly-ui/src/types";
import type { KFreeFlightData, KFreeFlightStrings } from "../../../modules/kindredly-ui/src/FreeFlight";

/* FREE FLIGHT IN SWIFT, AS RECORDS (batch 3, 2026-11-09; the "freeflight" switch).
   ────────────────────────────────────────────────────────────────────────
   What the Swift game (modules/kindredly-ui Portable/Courier/KFreeFlight.swift) is handed, worked
   out as the React Native game and its cover work it out (components/FreeFlightGame, WrenHome):
     · the course's height: taller than the 300 cover, always clear of the keyboard (≈290 pt of
       keyboard and header on the smallest phones) — WrenHome playH;
     · the sentence starts below the room's header, 44 down;
     · the hour's sky (PALETTE[daylight()]): its gradient, the pillars in its scrim edged in its
       chip (the night's lilac #DAD6F2), the ground in its land edged in its forest;
     · her three faces at her page stage (no game for an egg: Play is never offered);
     · the words, with "{letter}" and "{n}" left for Swift to fill as the game goes.
   Pure, type-only imports: plain node runs free-flight-model.test.ts. */

/** the room's header rides on the course: the sentence starts below it (WrenHome top={44}) */
export const FLIGHT_TOP = 44;
/** curious before take-off, happy in flight, worried after a crash (FreeFlightGame mood) */
export const FLIGHT_MOODS: readonly FlightMood[] = ["curious", "happy", "worry"];

/** WrenHome playH: the course for a window `winH` tall. */
export const playHeight = (winH: number): number => Math.max(280, Math.min(360, winH - 290));

/** The game's stage for her page stage; null for an egg (she doesn't fly yet). */
export const flightStage = (stage: WrenStage): FlightStage | null => (stage === "egg" ? null : stage);

/** The ff.* words, as the React Native game says them. */
export function flightStrings(t: (key: string, vars?: Record<string, string | number>) => string): KFreeFlightStrings {
  return {
    done: t("ff.done"),
    faster: t("ff.faster"),
    title: t("ff.title").toUpperCase(),
    takeoff: t("ff.takeoff", { letter: "{letter}" }),
    hint: t("ff.hint"),
    best: t("ff.best", { n: "{n}" }),
    newBest: t("ff.newBest"),
    crashTitle: t("ff.crashTitle"),
    statGates: t("ff.statGates"),
    statLetters: t("ff.statLetters"),
    statAccuracy: t("ff.statAccuracy"),
    statPace: t("ff.statPace"),
    again: t("ff.again"),
    anyKey: t("ff.anyKey"),
  };
}

/** The course for the Swift game. */
export function freeFlightData(o: {
  hour: Daylight;
  palette: Palette;
  winH: number;
  best: number;
  birds: Partial<Record<FlightMood, KImageRefProps | null>>;
  strings: KFreeFlightStrings;
}): KFreeFlightData {
  const p = o.palette;
  const night = o.hour === "night";
  return {
    hour: o.hour,
    height: playHeight(o.winH),
    top: FLIGHT_TOP,
    sky0: p.sky[0],
    sky1: p.sky[1],
    scrim: p.scrim,
    pillarInk: night ? "#DAD6F2" : p.chip,
    land: p.land,
    forest: p.forest,
    sun: p.sun ?? "",
    moon: p.moon,
    stars: p.stars,
    night,
    curious: o.birds.curious ?? null,
    happy: o.birds.happy ?? null,
    worry: o.birds.worry ?? null,
    best: Math.max(0, Math.floor(o.best || 0)),
    strings: o.strings,
  };
}
