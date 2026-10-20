/* The stamp collection (screens/me/stamp-collection): Me › Stamps and the album. Not wired to a
   runner; run by hand from the repo root:
     node src/screens/me/stamp-collection.test.ts
   The doors (D10), the quota line, Free at 3/3, the empty states (the owner's lines), YOUR STAMPS
   official only, the album's hidden button, the sections and the sheet's actions. */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// stamp-collection imports lib/custom-stamps-core without an extension (as Metro wants)
registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const C = await import("./stamp-collection.ts");

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};
const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}(${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(",")})` : k);
const fmt = { t, dateShort: (iso: string) => iso.slice(5, 10), upper: (s: string) => s.toUpperCase(), lower: (s: string) => s.toLowerCase() };
const U1 = "c:0f8fad5b-d9cb-469f-a165-70867728950e";
const U2 = "c:7c9e6679-7425-40de-944b-e07fc1f90ae7";
const U3 = "c:16fd2706-8baf-433b-82eb-8c7fada847da";
const base = { press: true, quota: { plan: "free" as const, made: 2, cap: 3, why: null }, mine: [], kept: [], used: [], fresh: new Set<string>(), ready: null, slots: ["#A790F3", "#679DF2", "#27C8BD", "#FB765A"] };
const mine = (id: string, state: "ok" | "pending" | "removed" | "rejected" = "ok", topic = "First Snow") => ({ id, topic, hex: "#FBBF3E", state, letters: 0, createdAt: "2026-10-19T10:00:00Z" });

// empty everything
const e = C.buildStampsCard(base, fmt);
ok("empty: made shows (press + quota)", e.madeShow);
ok("empty: quota line n of cap", e.madeQuota === "cs2.me.quotaFree(n=2,cap=3)", e.madeQuota);
ok("empty: strangers line is the owner's", e.strangersEmpty === "cs2.me.strangersEmpty" && e.strangers.length === 0);
ok("empty: yours line + write", e.emptyText === "cs2.me.yoursEmpty" && e.emptyCta === "cs2.me.writeLetter" && e.cells.length === 0);
ok("empty: three slot colours", e.yoursSlots.length === 3);
ok("empty: album hidden", e.album === "");
ok("empty: no see all", e.seeAll === "");

// doors closed
ok("no quota: made hidden", !C.buildStampsCard({ ...base, quota: null }, fmt).madeShow);
ok("no press: made hidden", !C.buildStampsCard({ ...base, press: false }, fmt).madeShow);
ok("no press: my stamps don't open the album alone", C.buildStampsCard({ ...base, press: false, mine: [mine(U1)] }, fmt).album === "");

// paid + full
const paid = C.buildStampsCard({ ...base, quota: { plan: "first", made: 9, cap: null, why: null } }, fmt);
ok("paid: unlimited in gold", paid.madeQuota === "cs2.me.unlimited" && paid.madeQuotaGold);
ok("free 3/3: full", C.buildStampsCard({ ...base, quota: { plan: "free", made: 3, cap: 3, why: "quota" } }, fmt).full);
ok("free 2/3: not full", !e.full);

// made
const m = C.buildStampsCard({ ...base, mine: [mine(U1), mine(U2, "pending"), mine(U3, "removed")], fresh: new Set([U1.slice(2)]), ready: U1 }, fmt);
ok("made: two newest", m.made.length === 2 && m.made[0].id === U1);
ok("made: topic lower with #", m.made[0].topic === "#first snow", m.made[0].topic);
ok("made: fresh by uuid", m.made[0].fresh && !m.made[1].fresh);
ok("made: pending looks like any of mine (no in-review label, owner 2026-10-20)", m.made[1].note !== "cs2.col.checking" && !m.made[1].note);
const mr = C.buildStampsCard({ ...base, mine: [{ ...mine(U1, "rejected"), review: { flying: false, reason: "nudity" } }] }, fmt);
ok("made: a refused one says so", mr.made[0].note === "cs2.col.didntPass" && mr.made[0].topic === "");
ok("made: see all past two", m.seeAll === "cs2.me.seeAll");
ok("made: ready bar", m.ready === "cs2.done.toast" && m.readyId === U1);
ok("made: album shows", m.album === "cs2.me.openAlbum");

// yours: official only
const y = C.buildStampsCard({ ...base, used: [{ id: U1, name: "x", hex: "", at: null }, { id: "crush", name: "Crush", hex: "#F8779E", at: "2026-10-18T00:00:00Z" }] }, fmt);
ok("yours: c: dropped", y.cells.length === 1 && y.cells[0].id === "crush" && y.count === "me.stamps.count(n=1)");
ok("yours: name lower under it", y.cells[0].date === "crush");
ok("used official stamps alone open no album (owner 2026-10-20: only what you made)", y.album === "");

// strangers
const k = C.buildStampsCard({ ...base, kept: [{ id: U2, topic: "kite", hex: "#679DF2", state: "ok", keptAt: "2026-10-18T00:00:00Z", from: "SUNDAY KITE" }] }, fmt);
ok("strangers: from line", k.strangers[0].from === "cs2.me.fromName(name=SUNDAY KITE)");
ok("strangers: count", k.strangersCount === "1");

// album
const a = C.buildAlbum(
  {
    ...base,
    mine: [{ ...mine(U1), letters: 4 }, mine(U2, "pending")],
    kept: [
      { id: U3, topic: "kite", hex: "#679DF2", state: "ok", keptAt: "2026-10-18T00:00:00Z", from: "SUNDAY KITE" },
      { id: "c:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", topic: "", hex: "#679DF2", state: "deleted", keptAt: "2026-10-17T00:00:00Z", from: "NO. 7" },
    ],
    used: [{ id: "crush", name: "Crush", hex: "#F8779E", at: "2026-10-18T00:00:00Z" }],
  },
  fmt,
  { hasOriginal: (u) => u === U1.slice(2) },
);
// keeping strangers' stamps waits for the next version (KEEP_STAMPS_ON false): no strangers section yet
ok("album: made only, no used-official section", a.sections.map((s) => s.key).join() === "made");
ok("album: made has the blank first", a.sections[0].make);
ok("album: counts only, titled YOUR STAMPS", a.sections[0].title === "cs2.me.yours · 2");
ok("album: made info", a.sections[0].cells[0].info === "cs2.al.madeOn(date=10-19,n=4)", a.sections[0].cells[0].info);
ok("album: own ok actions", a.sections[0].cells[0].actions.map((x) => x.key).join() === "write,rename,recolour,filter,delete");
ok("album: no original, no filter", !a.sections[0].cells[1].actions.some((x) => x.key === "filter"));
ok("album: pending can only be deleted", a.sections[0].cells[1].actions.map((x) => x.key).join() === "delete");
ok("album: pending info is the made-on line, no in-review", a.sections[0].cells[1].info === "cs2.al.madeOnNone(date=10-19)" && a.sections[0].cells[1].tag === "#first snow");
// in review on this phone (lib/custom-stamps pressInReview)
const ar = C.buildAlbum(
  {
    ...base,
    mine: [
      { ...mine(U1, "pending"), review: { flying: true, reason: null } },
      { ...mine(U2, "pending"), review: { flying: false, reason: null } },
      { ...mine(U3, "rejected"), review: { flying: false, reason: "contact" } },
    ],
  },
  fmt,
  { hasOriginal: () => true },
);
const rc = ar.sections[0].cells;
ok("review: being checked has nothing to do", rc[0].actions.length === 0 && rc[0].under !== "cs2.col.checking");
ok("review: a draft waiting can be deleted", rc[1].actions.map((x) => x.key).join() === "delete");
ok("review: refused = try another photo + delete, the reason, the tag", rc[2].actions.map((x) => x.key).join() === "retry,delete" && rc[2].info === "cs2.chk.contact" && rc[2].under === "cs2.col.didntPass" && rc[2].tag === "#first snow");
ok("review: never 'write with it' before it passes", rc.every((c) => !c.actions.some((x) => x.key === "write")));
ok("album: yours empty line off (the used-official section is gone)", a.strings.yoursEmpty === "");
const ae = C.buildAlbum(base, fmt, { hasOriginal: () => false });
ok("album empty: only made (blank)", ae.sections.length === 1 && ae.sections[0].make);
ok("canEdit", !C.canEdit(base.quota) && C.canEdit({ plan: "first", made: 0, cap: null, why: null }));

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
