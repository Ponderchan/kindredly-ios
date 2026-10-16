/* Behaviour lock for lib/publish-stage: which way the tab bar's + opens.
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/lib/publish-stage.test.ts
   Every line prints ok/FAIL and the process exits non-zero if any fail. */

const P = await import("./publish-stage.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-16T12:00:00.000Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

// ── the 7-day boundary ──
ok("NEW_DAYS is 7", P.NEW_DAYS === 7);
ok("signed up just now: new", P.publishStage({ createdAt: ago(0), now, wrenStage: "wren" }) === "new");
ok("signed up 6 days ago: new", P.publishStage({ createdAt: ago(6 * DAY), now, wrenStage: "wren" }) === "new");
ok("signed up exactly 7 days ago: new (≤ 7)", P.publishStage({ createdAt: ago(7 * DAY), now, wrenStage: "wren" }) === "new");
ok("7 days and a second: returning", P.publishStage({ createdAt: ago(7 * DAY + 1000), now, wrenStage: "wren" }) === "returning");
ok("a month in: returning", P.publishStage({ createdAt: ago(30 * DAY), now, wrenStage: "fledge" }) === "returning");
ok("a date ahead of the clock: new", P.publishStage({ createdAt: ago(-2 * DAY), now, wrenStage: "wren" }) === "new");
ok("Supabase's own format (+00:00, microseconds)", P.publishStage({ createdAt: "2026-08-01T09:30:12.123456+00:00", now, wrenStage: "wren" }) === "returning");

// ── still a chick ──
ok("an egg a month in: new", P.publishStage({ createdAt: ago(30 * DAY), now, wrenStage: "egg" }) === "new");
ok("a hatchling a month in: new", P.publishStage({ createdAt: ago(30 * DAY), now, wrenStage: "hatch" }) === "new");
ok("a fledgling a month in: returning (no longer a chick)", P.publishStage({ createdAt: ago(30 * DAY), now, wrenStage: "fledge" }) === "returning");
ok("a grown Wren on day two: new (the week wins)", P.publishStage({ createdAt: ago(2 * DAY), now, wrenStage: "wren" }) === "new");

// ── what can't be read ──
ok("no createdAt: new", P.publishStage({ createdAt: undefined, now, wrenStage: "wren" }) === "new");
ok("null createdAt: new", P.publishStage({ createdAt: null, now, wrenStage: "wren" }) === "new");
ok("empty createdAt: new", P.publishStage({ createdAt: "", now, wrenStage: "wren" }) === "new");
ok("unparseable createdAt: new", P.publishStage({ createdAt: "yesterday-ish", now, wrenStage: "wren" }) === "new");

// ── stage not read yet ──
ok("null stage, a month in: returning (the date decides)", P.publishStage({ createdAt: ago(30 * DAY), now, wrenStage: null }) === "returning");
ok("null stage, day three: new", P.publishStage({ createdAt: ago(3 * DAY), now, wrenStage: null }) === "new");
ok("null stage, no date: new", P.publishStage({ createdAt: null, now, wrenStage: null }) === "new");

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall ok");
