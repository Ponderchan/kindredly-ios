/* The seasons' rules (lib/season-core). Not wired to a runner; run by hand from the repo root with
   plain node (types stripped by Node itself; the hook below adds ".ts" to the app's extensionless
   imports):
     node src/lib/season-core.test.ts
   The window: local days, first and last included. The switch: on with no row, off only with a
   real false. The stamps: only from the binary that draws them (1.2.6), never on an unknown one;
   the looks on any binary. */

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

const { SEASONS, SEASONAL_STAMPS, SEASONAL_LOOKS, seasonDay, seasonOpen, openSeasons, seasonOffer, NO_SEASON } = await import("./season-core.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** a local time (the constructor's month is 0-based) */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

const H = SEASONS.find((s) => s.id === "halloween")!;

/* ── the table ── */
ok("halloween: 2026-10-24 → 2026-11-02, switch 'halloween'", !!H && H.from === "2026-10-24" && H.to === "2026-11-02" && H.surface === "halloween");
ok("halloween: three stamps in tray order", same(H.stamps, ["spooky-season", "boo", "trick-or-treat"]));
ok("halloween: two looks, witch then ghost", same(H.looks, ["witch", "ghost"]));
ok("halloween: stamps from binary 1.2.6 (App Store 1.0.7)", H.stampsFrom === "1.2.6");
ok("every season's window is a real range", SEASONS.every((s) => /^\d{4}-\d\d-\d\d$/.test(s.from) && /^\d{4}-\d\d-\d\d$/.test(s.to) && s.from <= s.to));
ok("season ids are unique", new Set(SEASONS.map((s) => s.id)).size === SEASONS.length);
ok("the seasonal sets hold every season's ids", SEASONAL_STAMPS.has("boo") && SEASONAL_LOOKS.has("witch") && !SEASONAL_STAMPS.has("crush") && !SEASONAL_LOOKS.has("beanie"));

/* every seasonal stamp is a real stamp, in its own category (stamps.ts is read as text: it imports i18n) */
const stampsText = readFileSync(new URL("../data/stamps.ts", import.meta.url), "utf8");
const listed = new Map([...stampsText.matchAll(/\{ id: "([\w-]+)", cat: "(\w+)"/g)].map((m) => [m[1], m[2]]));
ok("every seasonal stamp is in stamps.ts, in the seasonal category", [...SEASONAL_STAMPS].every((id) => listed.get(id) === "seasonal"));
// …but for the birthday stamp (owner's audit, 2026-11-10): the same category, because it too is offered only on
// certain days, but no season's — the reader's own birthday offers it (lib/birthday-stamp-core, tested there)
ok("nothing else is in the seasonal category, but the birthday stamp", [...listed].filter(([, c]) => c === "seasonal").every(([id]) => SEASONAL_STAMPS.has(id) || id === "birthday"));
ok("the birthday stamp belongs to no season", !SEASONAL_STAMPS.has("birthday") && listed.get("birthday") === "seasonal");
/* every seasonal look is a WrenAccessory with shapes */
const birdText = readFileSync(new URL("../components/WrenBird.tsx", import.meta.url), "utf8");
const famText = readFileSync(new URL("../components/wren-family-data.ts", import.meta.url), "utf8");
ok("every seasonal look is a WrenAccessory", [...SEASONAL_LOOKS].every((id) => new RegExp(`WrenAccessory = [^;]*"${id}"`).test(birdText)));
ok("every seasonal look is drawn at every stage and in flight", [...SEASONAL_LOOKS].every((id) => ["adult", "fledgling", "hatchling", "fly"].every((st) => famText.includes(`"acc-shared-${st}-${id}"`))));

/* ── the day ── */
ok("seasonDay is the local calendar day", seasonDay(at(2026, 10, 24, 0, 5)) === "2026-10-24" && seasonDay(at(2026, 11, 2, 23, 59)) === "2026-11-02");
ok("seasonDay pads month and day", seasonDay(at(2027, 1, 5)) === "2027-01-05");

/* ── the window ── */
ok("the day before: closed", !seasonOpen(H, at(2026, 10, 23, 23, 59), null));
ok("the first day, just after midnight: open", seasonOpen(H, at(2026, 10, 24, 0, 1), null));
ok("Halloween itself: open", seasonOpen(H, at(2026, 10, 31, 20), null));
ok("the last day, late: open", seasonOpen(H, at(2026, 11, 2, 23, 59), null));
ok("the day after: closed", !seasonOpen(H, at(2026, 11, 3, 0, 1), null));
ok("next year's 10-31 (another window, not this one): closed", !seasonOpen(H, at(2027, 10, 31), null));

/* ── the switch ── */
const mid = at(2026, 10, 30);
ok("nothing known (offline, fresh install): on", seasonOpen(H, mid, null));
ok("no row: on", seasonOpen(H, mid, {}));
ok("a true row: on", seasonOpen(H, mid, { halloween: true }));
ok("a false row: off (the kill switch)", !seasonOpen(H, mid, { halloween: false }));
ok("junk is no answer: on", seasonOpen(H, mid, { halloween: "false" as unknown as boolean }));
ok("another key's false row: still on", seasonOpen(H, mid, { identity: false }));
ok("the switch never opens it outside the window", !seasonOpen(H, at(2026, 12, 1), { halloween: true }));
ok("openSeasons lists the open ones", same(openSeasons(mid, null).map((s) => s.id), ["halloween"]) && openSeasons(at(2026, 6, 1), null).length === 0);

/* ── the offer ── */
ok("in season on 1.2.6: looks and stamps", same(seasonOffer(mid, null, "1.2.6"), { id: "halloween", looks: ["witch", "ghost"], stamps: ["spooky-season", "boo", "trick-or-treat"] }));
ok("on a later binary: stamps too", seasonOffer(mid, null, "1.3.0").stamps.length === 3 && seasonOffer(mid, null, "1.2.10").stamps.length === 3);
ok("on 1.2.5 / 1.2.4 (the live binaries, over the air): looks only", same(seasonOffer(mid, null, "1.2.5"), { id: "halloween", looks: ["witch", "ghost"], stamps: [] }) && seasonOffer(mid, null, "1.2.4").stamps.length === 0);
ok("an unknown binary: looks only", seasonOffer(mid, null, null).stamps.length === 0 && seasonOffer(mid, null, "dev").stamps.length === 0 && seasonOffer(mid, null, "").looks.length === 2);
ok("out of season: nothing", same(seasonOffer(at(2026, 11, 3), null, "1.2.6"), NO_SEASON));
ok("switched off: nothing", same(seasonOffer(mid, { halloween: false }, "1.2.6"), NO_SEASON));

/* ── a future holiday is one more entry ── */
const more = [
  ...SEASONS,
  { id: "winter", surface: "winter", from: "2026-12-20", to: "2027-01-02", stamps: ["snow"], stampsFrom: "1.3.0", looks: ["muffler"] },
];
ok("a season across the new year: open on 12-31 and 01-02", seasonOpen(more[1], at(2026, 12, 31), null) && seasonOpen(more[1], at(2027, 1, 2), null) && !seasonOpen(more[1], at(2027, 1, 3), null));
ok("its own switch and its own binary", same(seasonOffer(at(2026, 12, 24), null, "1.2.6", more), { id: "winter", looks: ["muffler"], stamps: [] }) && seasonOffer(at(2026, 12, 24), { winter: false }, "1.3.0", more).id === "");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
