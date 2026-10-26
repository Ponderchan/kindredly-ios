/* SEASONS — WHAT A HOLIDAY ADDS, AND WHEN (owner, 2026-10-26).
   ────────────────────────────────────────────────────────────────────────
   A season is a few days a year when the app offers a little more: a set of
   stamps at the front of the tray and a couple of looks for Wren. It is free
   for everyone; nothing here is gated by First Class.

   ITS WINDOW is a range of LOCAL days, first and last included (the reader's
   own calendar: Halloween starts on the 24th wherever you are). Outside it
   nothing seasonal is offered, but nothing is ever taken back: a letter
   stamped with a seasonal stamp always renders (its drawing stays in every
   build), and a Wren already wearing a seasonal look keeps wearing it.

   ITS SWITCH is the app_surfaces key named by `surface` (the 0033 table,
   lib/surfaces-resolve surfaceOn). ON by default, so it works offline and on
   a fresh install with no row; a false row ('halloween', '*', false) is the
   kill switch, from the next read of the table.

   ITS STAMPS need the binary that carries their Swift drawing
   (KStampArtData.swift): on an older binary, a JS update would offer stamps
   the native tray and other people's older phones can only draw as a bare
   frame, so they are offered from `stampsFrom` on. The looks are drawn in JS
   (WrenBird) and travel over the air.

   A new holiday is one more entry in SEASONS (and its stamps in the v3 kit,
   its looks in design/wren-family-gen.mjs). Pure: plain node runs
   src/lib/season-core.test.ts. */

import { surfaceOn, type SurfaceMap } from "./surfaces-resolve";
import { newerVersion } from "./update-prompt-core";

export type Season = {
  id: string;
  /** the app_surfaces key of its switch (on unless a row says false) */
  surface: string;
  /** the first and the last local day, "YYYY-MM-DD", both included */
  from: string;
  to: string;
  /** its stamps (letters.stamp ids, all in src/data/stamps.ts), in tray order */
  stamps: readonly string[];
  /** the first binary (app.json version) whose Swift has the stamps' drawings */
  stampsFrom: string;
  /** its looks for Wren (WrenAccessory ids), in wardrobe order */
  looks: readonly string[];
};

export const SEASONS: readonly Season[] = [
  {
    id: "halloween",
    surface: "halloween",
    from: "2026-10-24",
    to: "2026-11-02",
    stamps: ["spooky-season", "boo", "trick-or-treat"],
    stampsFrom: "1.2.6",
    looks: ["witch", "ghost"],
  },
];

/** Every seasonal stamp id, in or out of its season. */
export const SEASONAL_STAMPS: ReadonlySet<string> = new Set(SEASONS.flatMap((s) => s.stamps));
/** Every seasonal look id, in or out of its season. */
export const SEASONAL_LOOKS: ReadonlySet<string> = new Set(SEASONS.flatMap((s) => s.looks));

const pad = (n: number) => String(n).padStart(2, "0");
/** The local calendar day of `now`, "YYYY-MM-DD". */
export const seasonDay = (now: Date): string => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/** Is this season on now: today (local) inside its window, and its switch not turned off? */
export function seasonOpen(season: Season, now: Date, remote: SurfaceMap | null): boolean {
  const day = seasonDay(now);
  if (day < season.from || day > season.to) return false;
  return surfaceOn(remote, { [season.surface]: true }, season.surface);
}

/** The seasons on now. */
export function openSeasons(now: Date, remote: SurfaceMap | null, seasons: readonly Season[] = SEASONS): Season[] {
  return seasons.filter((s) => seasonOpen(s, now, remote));
}

/** What the seasons offer right now: looks always (JS), stamps only on a binary that draws them. */
export type SeasonOffer = {
  /** the open season's id ("" for none); the first one when two overlap */
  id: string;
  looks: string[];
  stamps: string[];
};

export const NO_SEASON: SeasonOffer = Object.freeze({ id: "", looks: [], stamps: [] }) as SeasonOffer;

/** `binary` is the native version (expo-application); null or anything but a dotted number offers no stamps. */
export function seasonOffer(now: Date, remote: SurfaceMap | null, binary: string | null, seasons: readonly Season[] = SEASONS): SeasonOffer {
  const open = openSeasons(now, remote, seasons);
  if (!open.length) return NO_SEASON;
  const t = binary?.trim() ?? "";
  const b = /^\d+(\.\d+)*$/.test(t) ? t : null;
  return {
    id: open[0].id,
    looks: open.flatMap((s) => [...s.looks]),
    stamps: b ? open.flatMap((s) => (newerVersion(s.stampsFrom, b) ? [] : [...s.stamps])) : [],
  };
}
