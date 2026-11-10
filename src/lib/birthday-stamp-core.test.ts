/* The birthday stamp's rules (lib/birthday-stamp-core; owner's audit, 2026-11-10). Not wired to a
   runner; run by hand from the repo root with plain node (types stripped by Node itself; the hook
   below adds ".ts" to the app's extensionless imports):
     node src/lib/birthday-stamp-core.test.ts
   Its day: the reader's own birthday, local (29 February on the 28th in a common year). Its switch:
   on with no row, off only with a real false. Its drawing: only on a binary that has it. Outside
   its day it is offered nowhere; every other stamp passes untouched. And the table: one stamp,
   "birthday", in stamps.ts and in the v3 drawings, never one of the every-day 36 or of a season. */

import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const { BIRTHDAY_STAMP, BIRTHDAY_STAMP_SURFACE, birthdayStampOffered, birthdayStampAllows } = await import("./birthday-stamp-core.ts");
const { SEASONAL_STAMPS } = await import("./season-core.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
/** a local time (the constructor's month is 0-based) */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const offered = (o: { birthday?: string | null; now?: Date; remote?: Record<string, boolean> | null; drawn?: boolean } = {}) =>
  birthdayStampOffered({ birthday: "birthday" in o ? o.birthday : "1991-11-10", now: o.now ?? at(2026, 11, 10), remote: o.remote ?? null, drawn: o.drawn ?? true });

/* ── its day ── */
ok("their birthday, a binary that draws it, nothing known of the switch: offered", offered());
ok("from just after midnight to just before the next (local)", offered({ now: at(2026, 11, 10, 0, 1) }) && offered({ now: at(2026, 11, 10, 23, 59) }));
ok("the day before and the day after: not offered", !offered({ now: at(2026, 11, 9, 23, 59) }) && !offered({ now: at(2026, 11, 11, 0, 1) }));
ok("next year's birthday: offered again", offered({ now: at(2027, 11, 10) }));
ok("no birthday: never", !offered({ birthday: null }) && !offered({ birthday: "" }) && !offered({ birthday: undefined }));
ok("29 February: on the 28th in a common year, the 29th in a leap year", offered({ birthday: "2000-02-29", now: at(2027, 2, 28) }) && offered({ birthday: "2000-02-29", now: at(2028, 2, 29) }) && !offered({ birthday: "2000-02-29", now: at(2028, 2, 28) }));

/* ── its switch ── */
ok("the switch's key", BIRTHDAY_STAMP_SURFACE === "birthdaystamp");
ok("no row: on", offered({ remote: {} }));
ok("a true row: on", offered({ remote: { birthdaystamp: true } }));
ok("a false row: off (the kill switch)", !offered({ remote: { birthdaystamp: false } }));
ok("junk is no answer: on", offered({ remote: { birthdaystamp: "false" as unknown as boolean } }));
ok("another key's false row (Halloween's): still on", offered({ remote: { halloween: false } }));
ok("the switch never offers it on another day", !offered({ remote: { birthdaystamp: true }, now: at(2026, 11, 11) }));

/* ── its drawing ── */
ok("a binary without the drawing: never, birthday or not", !offered({ drawn: false }));

/* ── what a tray may offer ── */
ok("the birthday stamp passes only while offered", birthdayStampAllows(BIRTHDAY_STAMP, true) && !birthdayStampAllows(BIRTHDAY_STAMP, false));
ok("every other stamp passes either way (their own rules decide)", ["crush", "boo", "c:1234", ""].every((id) => birthdayStampAllows(id, false) && birthdayStampAllows(id, true)));

/* ── the table (stamps.ts is read as text: it imports i18n) ── */
ok("the id", BIRTHDAY_STAMP === "birthday");
const stampsText = readFileSync(new URL("../data/stamps.ts", import.meta.url), "utf8");
const listed = [...stampsText.matchAll(/\{ id: "([\w-]+)", cat: "(\w+)"/g)].map((m) => ({ id: m[1], cat: m[2] }));
ok("it is in stamps.ts, once, in the seasonal category (so never one of the every-day 36)", listed.filter((s) => s.id === BIRTHDAY_STAMP).length === 1 && listed.find((s) => s.id === BIRTHDAY_STAMP)?.cat === "seasonal");
ok("it is the last stamp listed", listed[listed.length - 1]?.id === BIRTHDAY_STAMP);
ok("it belongs to no season (a season's window never offers it)", !SEASONAL_STAMPS.has(BIRTHDAY_STAMP));
ok("it has an English name and prompt", /\{ id: "birthday",[^\n]*name: \{ en: "Birthday",[^\n]*prompt: \{ en: "It's my birthday today\."/.test(stampsText));
const artText = readFileSync(new URL("../data/stamp-art-v3.ts", import.meta.url), "utf8");
ok("it has a v3 drawing (React Native)", /^\s*"?birthday"?: \{/m.test(artText));
const swiftText = readFileSync(new URL("../../modules/kindredly-ui/ios/Portable/Kit/KStampArtData.swift", import.meta.url), "utf8");
ok("it has a v3 drawing (Swift), in almost-texted's rose", swiftText.includes('KStampV3Entry("birthday", category: "seasonal", hex: 0xF99CB3FF'));

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
process.exit(fails ? 1 : 0);
