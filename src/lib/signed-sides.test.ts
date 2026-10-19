/* Behaviour lock for what each side signed in the ceremony (lib/signed-sides, identity Phase 2,
   PHASE2.md §4). Not wired to a runner; run by hand from the repo root with plain node (it strips
   the types itself from Node 22.18 / 23.6 on):
     node src/lib/signed-sides.test.ts
   A load hook adds ".ts" to an extensionless relative import, in this process only. Every line
   prints ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const S = await import("./signed-sides.ts");
const { penDemo } = await import("./pen-signature.ts");
const { frostSpec } = await import("./frost.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const MIRA = penDemo("Mira");
const ROWAN = penDemo("Rowan");
const FRESH = penDemo("Fresh");

const revealed = {
  other: "u-mira",
  otherName: "Mira",
  otherFace: "f-cloud",
  otherSig: MIRA,
  mySig: ROWAN,
  mySignedName: "Rowan",
  mySignedFace: "m-anchor",
  revealed: true,
};
const base = {
  detail: revealed,
  identity: true,
  demo: false,
  myUid: "u-me",
  handle: "Today's Name",
  signedNow: null,
  courierOf: (uid: string) => `courier(${uid})`,
  myCourier: "Sunday Kite",
  frostOf: (uid: string) => frostSpec(uid, false),
  fallbackName: "cm.kindred",
  demoSig: (seed: string) => penDemo(seed),
};

/* ── the switch ── */
ok("switch off: no signed pair (today's ritual)", S.signedSides({ ...base, identity: false }) === null);
ok("no thread: no signed pair", S.signedSides({ ...base, detail: null }) === null);

/* ── a published reveal ── */
{
  const p = S.signedSides(base)!;
  ok("theirs: the name, face and drawing on the row", p.theirs.name === "Mira" && p.theirs.face === "f-cloud" && p.theirs.sig === MIRA);
  ok("theirs: the courier name from the reader's book, the window they wore", p.theirs.courier === "courier(u-mira)" && JSON.stringify(p.theirs.frost) === JSON.stringify(frostSpec("u-mira", false)) && p.theirs.seed === "u-mira");
  ok("mine: what they received, not today's profile", p.mine.name === "Rowan" && p.mine.face === "m-anchor" && p.mine.sig === ROWAN);
  ok("mine: my courier name and my window", p.mine.courier === "Sunday Kite" && JSON.stringify(p.mine.frost) === JSON.stringify(frostSpec("u-me", false)) && p.mine.seed === "u-me");
}

/* ── typed sides ── */
{
  const typed = S.signedSides({ ...base, detail: { ...revealed, otherSig: null, mySig: null } })!;
  ok("no drawing on the row: both typed", typed.theirs.sig === null && typed.mine.sig === null);
  const junk = S.signedSides({ ...base, detail: { ...revealed, otherSig: { v: 2 } as never } })!;
  ok("a stored value that isn't PEN v1 is typed, never a blank", junk.theirs.sig === null && junk.theirs.name === "Mira");
}

/* ── the pre-0035 safety net: the drawing was dropped, so it's typed even if the sheet drew one ── */
{
  const direct = S.signedSides({
    ...base,
    detail: { ...revealed, mySig: undefined, mySignedName: "Rowan", mySignedFace: null },
    signedNow: { name: "Rowan", face: null, sig: FRESH },
  })!;
  ok("published row without my drawing: typed, not the pad's (it never travelled)", direct.mine.sig === null && direct.mine.name === "Rowan");
}

/* ── before the reload lands (a stale, unrevealed row): what the sheet just sent ── */
{
  const stale = S.signedSides({
    ...base,
    detail: { ...revealed, revealed: false, otherName: null, otherFace: null, otherSig: null, mySig: null, mySignedName: null, mySignedFace: null },
    signedNow: { name: "Fresh Ink", face: "m-anchor", sig: FRESH },
  })!;
  ok("stale row: mine is what the sheet sent", stale.mine.name === "Fresh Ink" && stale.mine.face === "m-anchor" && stale.mine.sig === FRESH);
  ok("stale row: their name falls back, typed", stale.theirs.name === "cm.kindred" && stale.theirs.sig === null && stale.theirs.face === null);
  const none = S.signedSides({ ...base, detail: { ...revealed, mySignedName: null, mySig: null }, handle: "  Profile Name " })!;
  ok("no snapshot and nothing sent here: the profile's pen name, trimmed", none.mine.name === "Profile Name");
  const empty = S.signedSides({ ...base, detail: { ...revealed, mySignedName: null }, handle: "" })!;
  ok("no name anywhere: empty (the ritual says in.meFallback)", empty.mine.name === "");
}

/* ── demo threads (never on a server) ── */
{
  const demo = S.signedSides({
    ...base,
    demo: true,
    detail: { ...revealed, revealed: false, otherSig: null, mySig: null, mySignedName: null, mySignedFace: null, other: "demo-blackberry", otherName: "Someone at Blackberry Row" },
    signedNow: { name: "Rowan", face: null, sig: FRESH },
  })!;
  ok("demo with no drawing of theirs: penDemo of their id", JSON.stringify(demo.theirs.sig) === JSON.stringify(penDemo("demo-blackberry")));
  ok("demo: mine is the fresh drawing from the sheet", demo.mine.sig === FRESH && demo.mine.name === "Rowan" && demo.mine.face === null);
  const mira = S.signedSides({ ...base, demo: true, detail: { ...revealed, other: "demo-mira" } })!;
  ok("demo with drawings on the fixture: the fixture's", mira.theirs.sig === MIRA && mira.mine.sig === ROWAN);
}

/* ── no one there ── */
{
  const ghost = S.signedSides({ ...base, detail: { ...revealed, other: "" }, myUid: null })!;
  ok("no other id: no courier, no window, seeded anon", ghost.theirs.courier === "" && ghost.theirs.frost === null && ghost.theirs.seed === "anon");
  ok("no uid of mine: no window, seeded me", ghost.mine.frost === null && ghost.mine.seed === "me");
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
