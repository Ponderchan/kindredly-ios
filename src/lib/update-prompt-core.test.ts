/* The update prompt's rules (lib/update-prompt-core). Not wired to a runner; run by hand from the
   repo root with plain node (types stripped by Node itself; the hook below adds ".ts" to the
   app's extensionless imports):
     node src/lib/update-prompt-core.test.ts
   The switch: only a real true turns it on, and force only counts with it. Apple's answer: only a
   dotted number gets through, and only a release newer than the binary's own counts. The sheet: once per parcel, at most once a day, always in hard mode,
   and another binary's record is no record. */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
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

const { updateAsk, storeVersionOf, parseSeen, sheetDue, bannerShows, localDay, newerVersion, parcelWaiting, keepNewer } = await import("./update-prompt-core.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ── the switch ── */
ok("nothing known → off", same(updateAsk(null), { on: false, force: false }));
ok("no row → off", same(updateAsk({}), { on: false, force: false }));
ok("update_prompt true → on, soft", same(updateAsk({ update_prompt: true }), { on: true, force: false }));
ok("update_prompt false → off", same(updateAsk({ update_prompt: false, update_force: true }), { on: false, force: false }));
ok("force alone turns nothing on", same(updateAsk({ update_force: true }), { on: false, force: false }));
ok("both → hard mode", same(updateAsk({ update_prompt: true, update_force: true }), { on: true, force: true }));
ok("junk is no answer", same(updateAsk({ update_prompt: "true" as unknown as boolean }), { on: false, force: false }));

/* ── Apple's lookup ── */
ok("the version of the first result", storeVersionOf({ resultCount: 1, results: [{ version: "1.0.6" }] }) === "1.0.6");
ok("trimmed", storeVersionOf({ results: [{ version: " 1.0.7 " }] }) === "1.0.7");
ok("no results → null", storeVersionOf({ resultCount: 0, results: [] }) === null);
ok("not a version → null", storeVersionOf({ results: [{ version: "beta" }] }) === null && storeVersionOf({ results: [{ version: 106 }] }) === null);
ok("not an object → null", storeVersionOf(null) === null && storeVersionOf("1.0.6") === null);

/* ── a newer release than this binary's own ── */
ok("1.0.6 > 1.0.5", newerVersion("1.0.6", "1.0.5"));
ok("1.0.10 > 1.0.9 (numbers, not text)", newerVersion("1.0.10", "1.0.9"));
ok("the same → not newer", !newerVersion("1.0.5", "1.0.5") && !newerVersion("1.0", "1.0.0"));
ok("older → not newer", !newerVersion("1.0.4", "1.0.5"));
ok("1.0.5 asks 1.2.4 nothing (itself)", !parcelWaiting("1.2.4", "1.0.5"));
ok("1.0.6 out → 1.2.4 is asked", parcelWaiting("1.2.4", "1.0.6"));
ok("1.0.6 out → 1.2.5 is not (itself)", !parcelWaiting("1.2.5", "1.0.6"));
ok("a known binary waits for Apple's answer", !parcelWaiting("1.2.4", null));
ok("an unlisted binary follows the table", parcelWaiting("9.9.9", null) && parcelWaiting(null, "1.0.6"));

ok("a stale cache never takes a phone back", keepNewer("1.0.6", "1.0.5") === "1.0.6");
ok("a newer answer is taken", keepNewer("1.0.5", "1.0.6") === "1.0.6" && keepNewer(null, "1.0.5") === "1.0.5");

/* ── the record ── */
const rec = JSON.stringify({ binary: "1.2.4", version: "1.0.6", day: "2026-10-25" });
ok("this binary's record reads back", same(parseSeen(rec, "1.2.4"), { binary: "1.2.4", version: "1.0.6", day: "2026-10-25" }));
ok("another binary's record is none", parseSeen(rec, "1.2.5") === null);
ok("torn or empty is none", parseSeen("{", "1.2.4") === null && parseSeen(null, "1.2.4") === null);

/* ── the sheet ── */
const seen = { binary: "1.2.4", version: "1.0.6", day: "2026-10-25" };
ok("never shown → due", sheetDue(null, "1.0.6", "2026-10-25", false));
ok("shown for this parcel → not again", !sheetDue(seen, "1.0.6", "2026-10-26", false));
ok("a newer parcel, another day → due", sheetDue(seen, "1.0.7", "2026-10-26", false));
ok("a newer parcel, the same day → not today", !sheetDue(seen, "1.0.7", "2026-10-25", false));
ok("unknown on either side is the same parcel", !sheetDue(seen, null, "2026-10-26", false) && !sheetDue({ ...seen, version: null }, "1.0.6", "2026-10-26", false));
ok("hard mode → always due", sheetDue(seen, "1.0.6", "2026-10-25", true));

/* ── the banner ── */
ok("soft and seen → banner", bannerShows({ on: true, force: false }, seen));
ok("not seen yet → no banner (the sheet comes first)", !bannerShows({ on: true, force: false }, null));
ok("hard mode → no banner", !bannerShows({ on: true, force: true }, seen));
ok("off → no banner", !bannerShows({ on: false, force: false }, seen));

/* ── the day ── */
ok("local day, zero-padded", localDay(new Date(2026, 0, 5, 23, 59)) === "2026-01-05");

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
