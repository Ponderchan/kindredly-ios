/* THE BIRTHDAY STAMP — WHEN IT IS OFFERED (owner's audit, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   One official stamp, id "birthday" (a slice of cake with one lit candle;
   data/stamps.ts, drawn from the v3 kit like every other), that the
   composer's tray offers ONLY on the reader's own birthday: first in the
   row that day, under a small marker that says it is today's only. Built on
   the Halloween stamps' pattern (lib/season-core), with the reader's
   birthday where a season has its window:

   ITS DAY is the reader's birthday by lib/birthday-core's rule (the local
   month and day of the account's "YYYY-MM-DD"; 29 February on the 28th in a
   common year; no birthday, never). Decided on the phone.

   ITS SWITCH is the app_surfaces key "birthdaystamp" (the 0033 table,
   lib/surfaces-resolve surfaceOn). ON by default, so it works offline and on
   a fresh install with no row; a false row ('birthdaystamp', '*', false) is
   the kill switch, from the next read of the table.

   ITS DRAWING must be in this binary. A season's stamps wait for a version
   number (season-core stampsFrom); this one asks the binary itself (`drawn`:
   the native module's hasStampArt, lib/birthday-stamp), so no number has to
   be kept in step with a release, and a JS update never offers it on a
   binary whose tray could only draw a bare frame.

   Outside its day it is offered nowhere, not as a recent or a suggestion
   either (birthdayStampAllows), but nothing is taken back: a letter sent
   with it keeps it for good, and every build that has the drawing draws it
   on that letter (an older binary draws the empty frame it draws for any id
   it doesn't know, which the owner accepted).

   Pure: plain node runs src/lib/birthday-stamp-core.test.ts. */

import { isBirthdayOn } from "./birthday-core";
import { surfaceOn, type SurfaceMap } from "./surfaces-resolve";

/** the stamp's id (letters.stamp; data/stamps.ts) */
export const BIRTHDAY_STAMP = "birthday";
/** the app_surfaces key of its switch (on unless a row says false) */
export const BIRTHDAY_STAMP_SURFACE = "birthdaystamp";

/** Is the birthday stamp on offer now? Their birthday today (local), the switch not turned off, and
    a binary that draws it. */
export function birthdayStampOffered(p: { birthday: string | null | undefined; now: Date; remote: SurfaceMap | null; drawn: boolean }): boolean {
  if (!p.drawn || !isBirthdayOn(p.birthday, p.now)) return false;
  return surfaceOn(p.remote, { [BIRTHDAY_STAMP_SURFACE]: true }, BIRTHDAY_STAMP_SURFACE);
}

/** May a tray offer this stamp id now (in a set, as a recent, as a suggestion)? Every id but the
    birthday stamp passes (their own rules decide); the birthday stamp only while it is offered. */
export const birthdayStampAllows = (id: string, offered: boolean): boolean => id !== BIRTHDAY_STAMP || offered;
