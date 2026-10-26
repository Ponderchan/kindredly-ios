/* Behaviour lock for the courier page's model (screens/courier/courier-model): the rules the
   React Native page (components/WrenHome) works out inline and the SwiftUI page reads from here —
   her face and whether she is bare on the perch, her bubble, Play, the band's colour and second
   line, the tracking slip, the stage's two facts, the journey's stops, the two cells and the
   rack's tiles (the Halloween looks included). A remote flip between the two renderers must
   never change any of them.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/courier/courier-model.test.ts
   The model imports nothing at runtime, so no stubs are needed. Every line prints ok/FAIL and the
   process exits non-zero if any fail. */

import type { ThreadSummary } from "../../lib/db";
import {
  DRESS_SWATCH,
  LOOKS_SWATCH,
  NIGHT_BAND,
  bandSub,
  buildCourierView,
  drivingThread,
  heroOf,
  journeyStops,
  slipRows,
  stageFacts,
  wardrobe,
  type CourierFacts,
  type CourierFormat,
} from "./courier-model.ts";

let failed = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failed++;
  console.log(`${cond ? "ok  " : "FAIL"} ${name}`);
}

/* every word is its key, with its vars after a colon, so a test reads which string was chosen */
const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}:${Object.values(vars).join(",")}` : key);
const fmt: CourierFormat = {
  t,
  upper: (s) => s.toUpperCase(),
  dShort: (ms) => `d${ms}`,
  day: (iso) => `day(${iso.slice(0, 10)})`,
  speak: (line) => `«${line}»`,
};

const th = (o: Partial<ThreadSummary>): ThreadSummary =>
  ({ id: "t1", other: "u1", mine: 1, theirs: 0, lastAt: 100, lastSenderMe: true, revealed: false, otherName: null, ...o }) as unknown as ThreadSummary;

const DAY_SKY = { night: false, sky: ["#BFE3F8", "#E3F3FB"] as const, ink: "#1F5C33", chip: "#1F5C33", scrim: "#ADDBB5", sun: "#FFD54A", moon: false, stars: false };
const NIGHT_SKY = { night: true, sky: ["#1E1B35", "#2E2A6B"] as const, ink: "#DAD6F2", chip: "#FFFFFF", scrim: "#2B2660", sun: null, moon: true, stars: true };

const base: CourierFacts = {
  wren: "Pip",
  stage: "hatch",
  statsReady: true,
  day: 12,
  kindreds: 0,
  lettersSent: 2,
  carried: [{ at: "2026-10-20T10:00:00Z" }],
  dates: {},
  joinedAt: "2026-10-14T09:00:00Z",
  where: { state: "home", line: "wren.where.home", bubble: "wren.bubble.home" },
  whereMood: "content",
  dozy: false,
  hungry: null,
  dayOff: false,
  away: null,
  threads: [],
  nameOf: (x) => `No. ${x.other}`,
  log: { rows: ["r1"], line: "wren.log.line" },
  sky: DAY_SKY,
  cofounderNo: null,
  shelf: [],
  shelfTotal: 0,
  skin: "sticker",
  accessory: "none",
  premium: false,
  skins: [
    { id: "sticker", lock: "free", unlocked: true },
    { id: "moss", lock: "milestone", unlocked: false },
    { id: "plush", lock: "plus", unlocked: false },
    { id: "peach", lock: "plus", unlocked: false },
    { id: "ink", lock: "plus", unlocked: false },
  ],
  pieces: [
    { id: "none", free: true },
    { id: "beanie", free: true },
    { id: "scarf", free: true },
    { id: "phones", free: false },
  ],
  firstClass: { eyebrow: "me.firstClass", headline: "fc.stubHead", rows: [], cta: "fc.stubCta →", trial: "", stampLabel: "fc.firstMark", pose: "fcFree", member: false },
};

/* ── her face on the perch ── */
ok("her whereabouts' face at home", heroOf(base).mood === "content" && heroOf(base).state === "home");
ok("five quiet days at home: asleep", heroOf({ ...base, dozy: true }).mood === "sleepy" && heroOf({ ...base, dozy: true }).state === "dozing");
ok("dozy but out on a delivery: not asleep", heroOf({ ...base, dozy: true, where: { ...base.where, state: "delivery" }, whereMood: "curious" }).mood === "curious");
ok("hunger's face wins", heroOf({ ...base, dozy: true, hungry: { mood: "worry", line: "hg", wilt: false } }).mood === "worry");
ok("a hatchling wears her piece", !heroOf(base).bare);
ok("a grown bird wears her piece", !heroOf({ ...base, stage: "wren" }).bare);
ok("a fledgling is bare on the perch (WrenHome wearsHere)", heroOf({ ...base, stage: "fledge" }).bare);
ok("starving: wilt", heroOf({ ...base, hungry: { mood: "sleepy", line: "hg", wilt: true } }).wilt);

/* ── the cover ── */
{
  const v = buildCourierView(base, fmt);
  ok("the title names her", v.strings.title === "cr.title:Pip");
  ok("the hint splits into its lines, the last is the tap's", v.strings.hints.length === 1 && v.strings.tapHint === "cr.stageHint");
  ok("a day sky's band is its chip", v.cover.band === DAY_SKY.chip);
  ok("DAY n once the counts are in", v.cover.dayChip === "me.dayN:12");
  ok("no DAY chip before", buildCourierView({ ...base, statsReady: false }, fmt).cover.dayChip === "");
  ok("her bubble is her line, in her name", v.cover.bubble === "«wren.bubble.home»");
  ok("she flies: Play and the log are there", v.cover.canPlay && v.cover.bubbleOpens);
  ok("no cofounder mark without a number", v.cover.cofounder === "");
  ok("the cofounder number is padded", buildCourierView({ ...base, cofounderNo: 7 }, fmt).cover.cofounder === "cf.no:007");
  const night = buildCourierView({ ...base, sky: NIGHT_SKY }, fmt);
  ok("the night band is #2B2660", night.cover.band === NIGHT_BAND);
  ok("the night pillars are light", night.cover.pillarInk === "#DAD6F2");
  ok("no sun at night", night.cover.sun === "" && night.cover.moon && night.cover.stars);
  ok("her day off speaks first", buildCourierView({ ...base, dayOff: true, hungry: { mood: "worry", line: "hg", wilt: false } }, fmt).cover.bubble === "ff.dayoff.bubble");
  ok("hunger speaks before her line", buildCourierView({ ...base, hungry: { mood: "worry", line: "hg", wilt: false } }, fmt).cover.bubble === "hg");
  ok("asleep at home: zzz…", buildCourierView({ ...base, dozy: true }, fmt).cover.bubble === "zzz…");
  const egg = buildCourierView({ ...base, stage: "egg" }, fmt);
  ok("in the egg: …, no Play, no band, no log", egg.cover.bubble === "…" && !egg.cover.canPlay && !egg.band.show && !egg.cover.bubbleOpens);
  ok("starving: no Play", !buildCourierView({ ...base, hungry: { mood: "sleepy", line: "hg", wilt: true } }, fmt).cover.canPlay);
}

/* ── the band and the slip ── */
{
  const out = th({ id: "out", lastSenderMe: true, mine: 2, lastAt: 500 });
  const back = th({ id: "back", lastSenderMe: false, mine: 1, theirs: 1, lastAt: 700, revealed: true, otherName: "Luna" });
  ok("delivery: the newest thread you wrote last", drivingThread([out, th({ id: "old", lastAt: 10 })], "delivery")?.id === "out");
  ok("bringing: their reply", drivingThread([out, back], "bringing")?.id === "back");
  ok("home: none", drivingThread([out], "home") === null);
  const where = { state: "delivery" as const, line: "l", bubble: "b" };
  ok("the band names the journey and its day", bandSub({ ...base, threads: [out], where }, fmt) === "No. u1 · d500");
  ok("while you were away wins", bandSub({ ...base, threads: [out], where, away: { carriedOut: 2, broughtBack: 0 } }, fmt) === "wren.away · wren.away.out:2");
  const slip = slipRows({ ...base, threads: [out], where }, fmt);
  ok("delivery slip: left, door, waiting", slip.rows.join("|") === "wren.slip.left:D500|wren.slip.door:NO. U1|wren.slip.waiting" && slip.lit && slip.threadId === "out");
  const slipBack = slipRows({ ...base, threads: [back], where: { ...where, state: "bringing" } }, fmt);
  ok("bringing slip: wrote, carried, for you", slipBack.rows.join("|") === "wren.slip.wrote:NO. U1,D700|wren.slip.carried:PIP|wren.slip.forYou");
  const none = slipRows(base, fmt);
  ok("nothing in transit: two rows, no door", none.rows.length === 2 && !none.lit && none.threadId === "");
}

/* ── the stage's facts and the journey ── */
{
  const hatch = stageFacts(base, fmt);
  ok("hatched: the day you joined, and what fledges her", hatch[0].text === "wren.pill.hatched:day(2026-10-14)" && hatch[1].icon === "next");
  ok("fledged with no date: Flying", stageFacts({ ...base, stage: "fledge" }, fmt)[0].text === "wren.pill.flyingNoDate");
  const grown = stageFacts({ ...base, stage: "wren", kindreds: 1 }, fmt);
  ok("grown: journeys counted (carried + sent), one kindred", grown[0].text === "wren.pill.carried:3" && grown[1].text === "wren.pill.kindredOne");
  ok("no facts before the counts", buildCourierView({ ...base, statsReady: false }, fmt).facts.length === 0);
  const stops = journeyStops({ ...base, stage: "fledge", dates: { fledge: "2026-10-20T00:00:00Z" } }, fmt);
  ok("three stops, no egg", stops.map((s) => s.id).join() === "hatch,fledge,wren");
  ok("done · now · later", stops.map((s) => s.state).join() === "done,now,later");
  ok("a passed stop shows its day", stops[0].sub === "day(2026-10-14)");
  ok("the stop she's at says NOW", stops[1].sub === "day(2026-10-20) · wren.now");
  ok("a stop ahead says what gets her there", stops[2].sub === "wren.milestone.wren");
  ok("a passed stop with no date says nothing", journeyStops({ ...base, stage: "wren", joinedAt: null }, fmt)[1].sub === "");
}

/* ── the wardrobe ── */
{
  const w = wardrobe(base, fmt);
  ok("LOOKS: her coat, owned/all", w.cells[0].value === "skin.sticker.name" && w.cells[0].count === "1/5" && w.cells[0].swatch === LOOKS_SWATCH);
  ok("DRESS: Bare, free-or-member/all but Bare", w.cells[1].value === "wren.bare" && w.cells[1].count === "2/3" && w.cells[1].swatch === DRESS_SWATCH);
  ok("no looks count before the counts", wardrobe({ ...base, statsReady: false }, fmt).cells[0].count === "");
  ok("Mist before a kindred: the kindred tag, no fare hint", w.rack.looks[1].lock === "wren.lock.kindred" && w.rack.looks[1].hint === "");
  ok("a First Class coat: the brass tag and the fare hint", w.rack.looks[2].lock === "wren.lock.plus" && w.rack.looks[2].hint === "wren.a11y.plusHint");
  ok("the coat she wears is on", w.rack.looks[0].on && !w.rack.looks[0].lock);
  ok("a First Class piece is locked for a free reader", w.rack.dress[3].lock === "wren.lock.plus");
  ok("…and not for a member", wardrobe({ ...base, premium: true }, fmt).rack.dress[3].lock === "");
  // Halloween: the season's looks come after Bare and are free (offeredAccessories' order)
  const season = wardrobe({ ...base, accessory: "witch", pieces: [{ id: "none", free: true }, { id: "witch", free: true }, { id: "ghost", free: true }, ...base.pieces.slice(1)] }, fmt);
  ok("the witch hat is offered free, second", season.rack.dress[1].id === "witch" && season.rack.dress[1].lock === "");
  ok("the ghost too", season.rack.dress[2].id === "ghost" && season.rack.dress[2].lock === "");
  ok("wearing the witch hat names it and marks it", season.cells[1].value === "ws.acc.witch" && season.rack.dress[1].on);
  ok("a seasonal look out of its season is still named", wardrobe({ ...base, accessory: "ghost" }, fmt).cells[1].value === "ws.acc.ghost");
}

/* ── keepsakes ── */
{
  const v = buildCourierView({ ...base, shelf: [{ id: "a", evidence: "E", fresh: true }, { id: "b", evidence: "", fresh: false }, { id: "c", evidence: "x", fresh: false }, { id: "d", evidence: "y", fresh: false }], shelfTotal: 4 }, fmt);
  ok("three tiles, the header counts the shelf", v.keepsakes.length === 3 && v.strings.allKept === "wren.allKept:4");
  ok("a new one says so, with its proof", v.keepsakes[0].a11y === "me.keepsakes.newA11y:ks.name.a, E");
  ok("no proof, just the name", v.keepsakes[1].a11y === "ks.name.b");
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
if (failed) process.exit(1);
