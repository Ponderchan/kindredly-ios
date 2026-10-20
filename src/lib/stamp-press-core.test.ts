/* Stamp Press, the edit page's rules (lib/stamp-press-core). Not wired to a runner; run by hand
   from the repo root with plain node:
     node src/lib/stamp-press-core.test.ts
   Tiers and filters, the topic's shaping (no moderation), the "n OF 3 FREE" line, the quota row,
   every answer stamp-check.js can give (incl. the 503 that keeps a draft), the request body and
   the draft index. */

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

const P = await import("./stamp-press-core.ts");

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};
const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

/* plans and filters */
ok("planOf: entitlement", P.planOf({ premium: false, cofounder: false }) === "free" && P.planOf({ premium: true, cofounder: false }) === "first" && P.planOf({ premium: true, cofounder: true }) === "cofounder");
ok("planOf: the server wins", P.planOf({ premium: true, cofounder: false }, "free") === "free" && P.planOf({ premium: false, cofounder: false }, "cofounder") === "cofounder");
ok("seven bright filters in order", P.PRESS_FILTERS.map((f) => f.id).join() === "original,vivid,warm,golden,film,airy,gilt");
ok("filterAllowed free", P.filterAllowed("free", "original") && P.filterAllowed("free", "vivid") && P.filterAllowed("free", "warm") && !P.filterAllowed("free", "golden") && !P.filterAllowed("free", "gilt"));
ok("filterAllowed first", P.filterAllowed("first", "golden") && P.filterAllowed("first", "film") && P.filterAllowed("first", "airy") && !P.filterAllowed("first", "gilt"));
ok("filterAllowed cofounder", P.filterAllowed("cofounder", "gilt") && P.filterAllowed("cofounder", "airy"));
ok("the old looks are no longer offered", ["paper", "riso", "night", "sun", "sticker"].every((f) => !P.isFilter(f) && !P.filterAllowed("cofounder", f as any)));
const ff = P.filtersFor("free");
ok("filtersFor free: no Gilt, three locked", ff.length === 6 && !ff.some((f) => f.id === "gilt") && ff.filter((f) => f.locked).map((f) => f.id).join() === "golden,film,airy");
ok("filtersFor first: none locked, no Gilt", P.filtersFor("first").every((f) => !f.locked) && P.filtersFor("first").length === 6);
ok("filtersFor cofounder: seven, Gilt last", P.filtersFor("cofounder").length === 7 && P.filtersFor("cofounder")[6].id === "gilt" && P.filtersFor("cofounder").every((f) => !f.locked));
ok("stored filters: current and 2026-10-19's", ["original", "gilt", "paper", "night", "sticker"].every(P.isStoredFilter) && !P.isStoredFilter("noir") && !P.isStoredFilter(null));
ok("nearestFilter: old → nearest, unknown → original", P.nearestFilter("sun") === "warm" && P.nearestFilter("paper") === "film" && P.nearestFilter("night") === "original" && P.nearestFilter("riso") === "original" && P.nearestFilter("sticker") === "original" && P.nearestFilter("golden") === "golden" && P.nearestFilter("noir") === "original" && P.nearestFilter(undefined) === "original");
ok("categories match the server", P.PRESS_CATEGORIES.join() === "confessions,almosts,latenights,small,becoming,missing" && P.DEFAULT_CATEGORY === "small");

/* topic */
ok("topic: # and spaces", P.normalizeTopic("  #  first   snow ") === "first snow");
ok("topic: full-width #", P.normalizeTopic("＃雪") === "雪");
ok("topic: empty", P.normalizeTopic(" # ") === "" && P.normalizeTopic("") === "");
ok("topic: 24 graphemes", P.graphemes(P.normalizeTopic("a".repeat(30))).length === 24);
ok("topic: an emoji family counts as one (Node has Intl.Segmenter)", P.graphemes("👩‍👩‍👧🌧️").length === 2);
ok("topic: no moderation in the client", P.normalizeTopic("call 5551234567") === "call 5551234567");

/* the free line */
ok("freeOrdinal", P.freeOrdinal("free", 0, false) === 1 && P.freeOrdinal("free", 2, false) === 3 && P.freeOrdinal("free", 3, false) === null);
ok("freeOrdinal: paid, editing, unknown", P.freeOrdinal("first", 0, false) === null && P.freeOrdinal("free", 0, true) === null && P.freeOrdinal("free", null, false) === null);

/* quota */
const q = P.parseQuota([{ plan: "free", made: 2, cap: 3, remaining: 1, can_make: true, why: null, gold: false }]);
ok("parseQuota free", !!q && q.plan === "free" && q.made === 2 && q.cap === 3 && q.remaining === 1 && q.canMake && q.why === null && !q.gold);
const qc = P.parseQuota({ plan: "cofounder", made: "40", cap: null, remaining: null, can_make: true, why: null, gold: false });
ok("parseQuota cofounder → gold", !!qc && qc.gold && qc.made === 40 && qc.cap === null);
ok("parseQuota junk → null", P.parseQuota(null) === null && P.parseQuota([]) === null && P.parseQuota([{ plan: "vip" }]) === null);

/* stamp-check answers */
const stamp = { id: ID.toUpperCase(), topic: "first snow", category: "small", filter: "paper", gold: false, status: "approved", image_path: `u/${ID}/1.jpg`, version: 1, created_at: "2026-10-19T10:00:00Z" };
const a = P.parseCheck(200, { ok: true, stamp, plan: "free" });
ok("approved", a.kind === "approved" && a.stamp.id === ID && a.stamp.imagePath === `u/${ID}/1.jpg` && a.plan === "free");
ok("approved: an old stamp's filter still reads (a rename)", (() => { const o = P.parseCheck(200, { ok: true, stamp: { ...stamp, filter: "night" } }); return o.kind === "approved" && o.stamp.filter === "night"; })());
ok("approved with a broken stamp → unavailable", P.parseCheck(200, { ok: true, stamp: { id: ID, category: "nope", filter: "vivid" } }).kind === "unavailable");
const r = P.parseCheck(200, { ok: false, reason: "contact", field: "topic", plan: "first" });
ok("rejected topic", r.kind === "rejected" && r.reason === "contact" && r.field === "topic");
const r2 = P.parseCheck(200, { ok: false, reason: "weird" });
ok("rejected unknown reason → unsafe, image", r2.kind === "rejected" && r2.reason === "unsafe" && r2.field === "image");
ok("402s", P.parseCheck(402, { error: "quota" }).kind === "quota" && P.parseCheck(402, { error: "filter" }).kind === "filter" && P.parseCheck(402, { error: "edit" }).kind === "edit" && P.parseCheck(402, null).kind === "quota");
ok("429 cap", P.parseCheck(429, { error: "cap" }).kind === "cap");
ok("403 / 401 / 404", P.parseCheck(403, {}).kind === "suspended" && P.parseCheck(401, {}).kind === "auth" && P.parseCheck(404, {}).kind === "not_found");
ok("400 / 413 bad", P.parseCheck(400, { error: "bad_image" }).kind === "bad" && P.parseCheck(413, { error: "too_large" }).kind === "bad");
ok("503 / 500 / 0 → unavailable", P.parseCheck(503, { error: "unavailable" }).kind === "unavailable" && P.parseCheck(500, null).kind === "unavailable" && P.parseCheck(0, null).kind === "unavailable");
ok("phases", P.phaseFor(a) === "approved" && P.phaseFor(r) === "rejected" && P.phaseFor({ kind: "filter", plan: null }) === "editing" && P.phaseFor({ kind: "unavailable" }) === "unavailable" && P.phaseFor({ kind: "suspended" }) === "problem");
ok("drafts kept for 503 / cap / auth only", P.keepsDraft({ kind: "unavailable" }) && P.keepsDraft({ kind: "cap" }) && P.keepsDraft({ kind: "auth" }) && !P.keepsDraft(r) && !P.keepsDraft(a));

/* request body */
const body = JSON.parse(P.checkBody({ image: "AAAA", topic: "#first  snow", category: "small", filter: "warm" }));
ok("body: new", body.image === "AAAA" && body.topic === "first snow" && body.category === "small" && body.filter === "warm" && !("replace" in body));
const rename = JSON.parse(P.checkBody({ image: null, topic: "x", category: "missing", filter: "riso", replace: ID }));
ok("body: rename has no image", !("image" in rename) && rename.replace === ID);

/* drafts */
const d = (i: number) => ({ id: "d" + i, image: `file:///d${i}.jpg`, topic: "t" + i, category: "small" as const, filter: "vivid" as const, at: i });
let list: ReturnType<typeof P.parseDrafts> = [];
let dropped: typeof list = [];
for (let i = 0; i < 14; i++) ({ list, dropped } = P.addDraft(list, d(i)));
ok("drafts: newest first, capped", list.length === P.MAX_DRAFTS && list[0].id === "d13" && dropped.length === 1 && dropped[0].id === "d1");
ok("drafts: re-add moves to the front", P.addDraft(list, d(5)).list[0].id === "d5" && P.addDraft(list, d(5)).list.length === P.MAX_DRAFTS);
ok("drafts: parse round trip", P.parseDrafts(JSON.stringify(list)).length === list.length);
ok("drafts: one kept with an old filter still reads", P.parseDrafts(JSON.stringify([{ ...d(1), filter: "night" }])).length === 1);
ok("drafts: junk", P.parseDrafts("{") .length === 0 && P.parseDrafts(JSON.stringify([{ id: 1 }])).length === 0 && P.parseDrafts(null).length === 0);

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
