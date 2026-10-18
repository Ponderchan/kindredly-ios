/* Behaviour lock for the Today tab's model (screens/today/today-cards): the
   saved day (read, phase, pass / bring back / answer / drop, seen, freeze,
   done, the relaunch), left as the desk's own intersection, the seal held
   against the desk, how a load deals, her counted letter and the window,
   how Wren rests on the band (her night hours, her hunger), the card both
   renderers draw, the reply's send key and hint, what a refused reply
   does, and the desk's geometry (the same numbers Swift's KTodayGeometry
   uses). Also lib/day's morning (pure).
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/today/today-cards.test.ts
   The model's own imports are pure; a load hook only adds ".ts" to the
   extensionless relative imports Metro wants. Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const M = await import("./today-cards.ts");
const D = await import("../../lib/day.ts");
const { VEIL_MASK, mosaicMask } = await import("../../lib/mosaic.ts");
type Letter = import("../../lib/db").PoolLetter;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}(${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(",")})` : k);
const fmt = {
  t,
  postmark: (iso: string) => "PM" + iso.slice(5, 7),
  postNo: (uid: string) => uid.length * 1000 + 7,
  penPal: (uid: string, o: { upper: boolean; compact: boolean }) => {
    const n = "No." + (o.compact ? "" : " ") + (uid.length * 1000 + 7);
    return o.upper ? n.toUpperCase() : n;
  },
  clockHour: (h: number) => `${h}:00 AM`,
  stampTime: (ms: number) => `ST${ms}`,
  clock: (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
  stamp: (id: string) => (id === "tiny-win" ? { color: "#2E7D4F", name: "Tiny Win" } : id === "dark" ? { color: "#1E1B33", name: "Dark" } : null),
  stickerName: (id: string) => "S:" + id,
};
const L = (p: Partial<Letter> & { id: string }): Letter => ({
  author: "author-" + p.id,
  stamp: "tiny-win",
  body: "I fixed the wobbly chair today.",
  lang: "en",
  created_at: "2026-09-23T10:00:00Z",
  kind: "text",
  media_path: null,
  duration_s: null,
  ...p,
});

const ids = (xs: readonly { id: string }[]) => xs.map((l) => l.id).join();
const TODAY = "2026-10-16";
const desk3 = () => [L({ id: "a" }), L({ id: "b" }), L({ id: "c" })];
const recOf = (p: Partial<import("./today-cards").DayRecord> = {}) => ({ ...M.emptyDay(TODAY), desk: desk3(), ...p });

/* ── keepDesk: a reload never reshuffles under the thumb ── */
{
  const cur = [L({ id: "a" }), L({ id: "b" }), L({ id: "c" })];
  const fresh = [L({ id: "d" }), L({ id: "a" })];
  const fullPage = Array.from({ length: M.POOL_PAGE }, (_, i) => L({ id: "p" + i }));
  const kept = M.keepDesk(cur, fullPage, false, fresh);
  ok("keepDesk: a full page can't say a letter is gone — the desk keeps its order", ids(kept) === "a,b,c,d");
  const short = [L({ id: "a" }), L({ id: "c" }), L({ id: "d" })];
  ok("keepDesk: the whole pool drops what the server no longer has", ids(M.keepDesk(cur, short, true, fresh)) === "a,c,d");
  // the 2026-10-18 bug: a full page the phone filtered (own, kindreds, blocked) is short but not whole
  ok("keepDesk: a filtered page shorter than a page still can't say a letter is gone", ids(M.keepDesk(cur, short, false, fresh)) === "a,b,c,d");
  ok("keepDesk frozen: a filtered page prunes nothing", M.keepDesk(cur, short, false, fresh, true) === cur);
  const many = Array.from({ length: 20 }, (_, i) => L({ id: "n" + i }));
  ok("keepDesk: new letters join at the end, up to the fifteen", M.keepDesk(cur, fullPage, false, many).length === 15);
  const big = Array.from({ length: 16 }, (_, i) => L({ id: "k" + i }));
  ok("keepDesk: a desk already past fifteen isn't cut", M.keepDesk(big, fullPage, false, many).length === 16);
  ok("keepDesk frozen: nothing joins, even with room", ids(M.keepDesk(cur, fullPage, false, many, true)) === "a,b,c");
  ok("keepDesk frozen: a withdrawn letter still leaves (whole pool)", ids(M.keepDesk(cur, short, true, fresh, true)) === "a,c");
  ok("keepDesk frozen: nothing pruned keeps the same array", M.keepDesk(cur, fullPage, false, many, true) === cur);
}

/* ── the saved day: what AsyncStorage holds ── */
{
  const rec = recOf({ passed: ["a"], answered: ["z"], seen: ["a", "b"], undo: "a", dealtAt: 5, doneAt: null });
  const r = M.readDayRecord(JSON.stringify(rec), TODAY);
  ok("read: a v2 record of today comes back whole, not a placeholder", !!r && !r.placeholder && JSON.stringify(r.rec) === JSON.stringify(rec));
  ok("read: a record from another day is not painted (null)", M.readDayRecord(JSON.stringify({ ...rec, day: "2026-10-15" }), TODAY) === null);
  ok("read: a legacy { day, desk } from another day is not painted", M.readDayRecord(JSON.stringify({ day: "2026-10-15", desk: desk3() }), TODAY) === null);
  const legacy = M.readDayRecord(JSON.stringify({ day: TODAY, desk: desk3() }), TODAY);
  ok(
    "read: a legacy { day, desk } of today becomes v2 with empty lists, not frozen (it fills, then freezes)",
    !!legacy && !legacy.placeholder && legacy.rec.v === 2 && ids(legacy.rec.desk) === "a,b,c" && legacy.rec.passed.length === 0 && legacy.rec.dealtAt === null && M.loadMode(legacy.rec, false) === "fill",
  );
  const raw = M.readDayRecord(JSON.stringify(desk3()), TODAY);
  ok("read: onboarding's raw list paints as a placeholder (dealt again by the first load)", !!raw && raw.placeholder && ids(raw.rec.desk) === "a,b,c" && M.loadMode(raw.rec, raw.placeholder) === "deal");
  ok("read: an empty raw list is nothing", M.readDayRecord("[]", TODAY) === null);
  ok("read: junk, null and an empty string are nothing", M.readDayRecord("{oops", TODAY) === null && M.readDayRecord(null, TODAY) === null && M.readDayRecord("", TODAY) === null && M.readDayRecord('"x"', TODAY) === null);
  const bad = M.readDayRecord(JSON.stringify({ ...rec, desk: [L({ id: "a" }), { nope: 1 }, null], passed: ["a", 3], undo: 7, dealtAt: "x" }), TODAY);
  ok("read: broken entries are dropped, broken fields reset", !!bad && ids(bad.rec.desk) === "a" && bad.rec.passed.join() === "a" && bad.rec.undo === null && bad.rec.dealtAt === null);
  ok("read: a bare empty record of today doesn't count as knowing the day; anything dealt, passed or answered does", !M.recordKnown(M.emptyDay(TODAY)) && M.recordKnown(recOf()) && M.recordKnown({ ...M.emptyDay(TODAY), answered: ["x"] }));
}

/* ── the phase ── */
{
  const letters = desk3();
  ok("phase: letters left → reading", M.deskPhase({ loaded: true, offline: false, desk: letters, passed: [] }) === "reading");
  ok("phase: a placeholder desk paints before the network → reading", M.deskPhase({ loaded: false, offline: false, desk: letters, passed: [] }) === "reading");
  ok("phase: the first load with nothing yet never says done → loading", M.deskPhase({ loaded: false, offline: false, desk: [], passed: [] }) === "loading");
  ok("phase: a first load that came back with nothing → offline", M.deskPhase({ loaded: false, offline: true, desk: [], passed: [] }) === "offline");
  ok("phase: everything passed → done", M.deskPhase({ loaded: true, offline: false, desk: letters, passed: ["a", "b", "c"] }) === "done");
  ok("phase: a quiet day (loaded, nothing dealt) → done", M.deskPhase({ loaded: true, offline: false, desk: [], passed: [] }) === "done");
  ok("phase: left and current come from the desk, never 15 minus the passed", M.unpassed(letters, ["b"]).length === 2 && M.unpassed(letters, ["a"])[0].id === "b");
  /* left is the intersection of the desk and the passed list: an id in
     passed that isn't on the desk (a dev fixture's id, a letter blocked
     after it was passed) never lowers NEXT's number or moves the letter on
     screen */
  ok("left: a passed id not on the desk doesn't move it", M.unpassed(letters, ["b", "step5-t1"]).length === 2 && M.unpassed(letters, ["b", "step5-t1"])[0].id === "a");
  ok("left: passed ids none of which are on the desk leave the whole desk", M.unpassed(letters, ["zz", "yy"]).length === 3 && M.deskPhase({ loaded: true, offline: false, desk: letters, passed: ["zz", "yy"] }) === "reading");
}

/* ── the seal: the flag held against the desk ── */
{
  ok("seal: nothing is decided before the load (a placeholder desk is reading, but isn't the day yet)", M.sealVerdict({ loaded: false, phase: "reading", flagged: true }) === "wait" && M.sealVerdict({ loaded: false, phase: "loading", flagged: true }) === "wait" && M.sealVerdict({ loaded: false, phase: "offline", flagged: false }) === "wait");
  ok("seal: a flag over a desk that is reading is stale (done is the only sealer, and it is final)", M.sealVerdict({ loaded: true, phase: "reading", flagged: true }) === "stale");
  ok("seal: reading without a flag is simply open", M.sealVerdict({ loaded: true, phase: "reading", flagged: false }) === "open");
  ok("seal: a finished desk with its flag is sealed (a relaunch never seals again)", M.sealVerdict({ loaded: true, phase: "done", flagged: true }) === "sealed");
  ok("seal: a finished desk without its flag is left alone (done may be sealing this moment)", M.sealVerdict({ loaded: true, phase: "done", flagged: false }) === "keep");
  // the recovery, end to end on the record: a legacy { day, desk } under an old flag fills, reads, and may close again
  const legacy = M.readDayRecord(JSON.stringify({ day: TODAY, desk: desk3() }), TODAY);
  const legacyPhase = legacy ? M.deskPhase({ loaded: true, offline: false, desk: legacy.rec.desk, passed: legacy.rec.passed }) : "loading";
  ok("seal: a legacy record of today under an old flag is reading, so the flag goes", legacyPhase === "reading" && M.sealVerdict({ loaded: true, phase: legacyPhase, flagged: true }) === "stale");
  // the phase never comes from the flag: a finished record is done with or without it, a reading one is reading with or without it
  const finished = M.markDone({ ...recOf(), passed: ["a", "b", "c"] }, 1);
  ok("seal: the phase is the record's, never the flag's", M.deskPhase({ loaded: true, offline: false, desk: finished.desk, passed: finished.passed }) === "done" && M.deskPhase({ loaded: true, offline: false, desk: desk3(), passed: ["a"] }) === "reading");
}

/* ── pass, bring back, answer, drop ── */
{
  const r0 = recOf();
  const r1 = M.passLetter(r0, "a");
  ok("pass: the letter joins passed and becomes the undo", r1.passed.join() === "a" && r1.undo === "a" && M.unpassed(r1.desk, r1.passed)[0].id === "b");
  ok("pass: an id not on the desk changes nothing (same object)", M.passLetter(r1, "zz") === r1);
  ok("pass: passing twice changes nothing", M.passLetter(r1, "a") === r1);
  ok("bring back: offered after a pass", M.canBringBack(r1));
  const r2 = M.bringBack(r1);
  ok("bring back: the letter is back on screen", r2.passed.length === 0 && r2.undo === null && M.unpassed(r2.desk, r2.passed)[0].id === "a");
  ok("bring back: only once (a second is a no-op)", !M.canBringBack(r2) && M.bringBack(r2) === r2);
  const r3 = M.passLetter(M.passLetter(r0, "a"), "b");
  ok("bring back: only the last pass", M.bringBack(r3).passed.join() === "a");
  const replied = M.answerLetter(r1, "b");
  ok("bring back: a reply clears nothing it doesn't own (the undo stays for another letter)", M.canBringBack(replied));
  const repliedSame = M.answerLetter({ ...r0, undo: "a", passed: ["a"] }, "a");
  ok("bring back: after that letter was answered, it is blocked", !M.canBringBack(repliedSame) && M.bringBack(repliedSame) === repliedSame);
  ok("answer: a passed letter moves from passed to answered (never counted twice)", repliedSame.passed.length === 0 && repliedSame.answered.join() === "a");

  const last = M.passLetter(M.passLetter(r0, "a"), "b");
  const answeredLast = M.answerLetter(last, "c");
  ok(
    "answer: replying to the last letter leaves the desk done",
    ids(answeredLast.desk) === "a,b" && answeredLast.answered.join() === "c" && M.deskPhase({ loaded: true, offline: false, desk: answeredLast.desk, passed: answeredLast.passed }) === "done",
  );
  ok("answer: an id not on the desk changes nothing", M.answerLetter(r0, "zz") === r0);

  const one = { ...M.emptyDay(TODAY), desk: [L({ id: "x1", author: "w" }), L({ id: "x2", author: "w" })] };
  const blocked = M.dropAuthor(one, "w");
  ok("block: every letter by that writer leaves, and the desk is done", blocked.desk.length === 0 && M.deskPhase({ loaded: true, offline: false, desk: blocked.desk, passed: blocked.passed }) === "done");
  const readThenBlocked = M.dropAuthor(M.passLetter(r0, "a"), "author-a");
  ok("block: a letter passed before its writer was blocked still counts as read", readThenBlocked.passed.join() === "a" && !readThenBlocked.desk.some((l) => l.id === "a"));
  ok("block: the undo goes with its letter", readThenBlocked.undo === null && !M.canBringBack(readThenBlocked));
  ok(
    "block: still counted on her letter",
    M.wrenLetterFacts({ rec: readThenBlocked, waiting: 0, canPlay: true }).count === 1,
  );
  ok("drop: nothing on the desk to drop changes nothing", M.dropLetters(r0, ["zz"]) === r0 && M.dropAuthor(r0, "nobody") === r0);
  const withDesk = M.withDesk(M.passLetter(r0, "a"), [L({ id: "b" })]);
  ok("a load that loses the undo letter clears the undo", withDesk.undo === null);
  ok("a load that changes nothing keeps the same record (nothing is put away)", M.withDesk(r0, [...r0.desk]) === r0);
}

/* ── a relaunch mid-day keeps where the reader was ── */
{
  let rec = recOf({ dealtAt: 100 });
  rec = M.passLetter(rec, "a");
  rec = M.answerLetter(rec, "b");
  const back = M.readDayRecord(JSON.stringify(rec), TODAY);
  const left = back ? M.unpassed(back.rec.desk, back.rec.passed) : [];
  ok("relaunch: left and the current letter survive", !!back && left.length === 1 && left[0].id === "c");
  ok("relaunch: the deal stays frozen", !!back && M.loadMode(back.rec, back.placeholder) === "frozen");
  const done = M.markDone(M.passLetter(rec, "c"), 777);
  const reopened = M.readDayRecord(JSON.stringify(done), TODAY);
  ok("relaunch: a finished desk stays done, with when it was done", !!reopened && reopened.rec.doneAt === 777 && M.deskPhase({ loaded: true, offline: false, desk: reopened.rec.desk, passed: reopened.rec.passed }) === "done");
  ok("done: the first time only", M.markDone(done, 999) === done);
}

/* ── dealing ── */
{
  ok("loadMode: nothing dealt yet → deal", M.loadMode(M.emptyDay(TODAY), false) === "deal");
  ok("loadMode: a placeholder → deal", M.loadMode(recOf(), true) === "deal");
  ok("loadMode: dealt but not frozen → fill", M.loadMode(recOf(), false) === "fill");
  ok("loadMode: frozen → frozen", M.loadMode(recOf({ dealtAt: 1 }), false) === "frozen");
  const empty = M.emptyDay(TODAY);
  ok("freeze: an empty deal stays open (a quiet morning can still fill)", M.freeze(empty, 5) === empty && M.loadMode(M.freeze(empty, 5), false) === "deal");
  const frozen = M.freeze(recOf(), 5);
  ok("freeze: a dealt desk freezes once", frozen.dealtAt === 5 && M.freeze(frozen, 9) === frozen);

  const cur = [L({ id: "p1" }), L({ id: "p2" }), L({ id: "p3" })];
  const dealt = [L({ id: "d1" }), L({ id: "p2" }), L({ id: "d2" })];
  const dd = M.dealDesk(cur, ["p1"], dealt);
  ok("deal: what was passed stays, then the letter on screen, then the deal behind them", ids(dd) === "p1,p2,d1,d2");
  ok("deal: nothing swaps under the thumb", M.unpassed(dd, ["p1"])[0].id === "p2");
  ok("deal: a fresh desk is just the deal", ids(M.dealDesk([], [], dealt)) === "d1,p2,d2");
  const many = Array.from({ length: 30 }, (_, i) => L({ id: "m" + i }));
  ok("deal: up to the fifteen", M.dealDesk(cur, [], many).length === 15);
  ok("deal: passed in pass order", ids(M.dealDesk(cur, ["p3", "p1"], [])) === "p3,p1,p2");
}

/* ── seen ── */
{
  const r = M.markSeen(recOf(), "a");
  ok("seen: the first time counts", r.counted && r.rec.seen.join() === "a");
  const again = M.markSeen(r.rec, "a");
  ok("seen: the second doesn't (across relaunches too: it is in the record)", !again.counted && again.rec === r.rec);
}

/* ── her letter ── */
{
  const L0 = M.wrenLetterLines({ count: 0, replied: 0, waiting: 0, canPlay: true }, "8:00 AM", t);
  ok("her letter: a quiet day says so, then when she's back, then the invite with a lap", L0.join("|") === "wl.count.0|wl.next(t=8:00 AM)|wl.invite");
  const L1 = M.wrenLetterLines({ count: 1, replied: 1, waiting: 1, canPlay: false }, "8:00", t);
  ok("her letter: one, one reply, one waiting; the plain invite when she can't play", L1.join("|") === "wl.count.1|wl.replied.1|wl.waiting.1|wl.next(t=8:00)|wl.invitePlain");
  const LN = M.wrenLetterLines({ count: 15, replied: 3, waiting: 2, canPlay: true }, "8:00", t);
  ok("her letter: the counted plurals", LN.join("|") === "wl.count.N(n=15)|wl.replied.N(n=3)|wl.waiting.N(n=2)|wl.next(t=8:00)|wl.invite");
  const L2 = M.wrenLetterLines({ count: 4, replied: 0, waiting: 0, canPlay: true }, "8:00", t);
  ok("her letter: no reply and nobody waiting leave their lines out", L2.join("|") === "wl.count.N(n=4)|wl.next(t=8:00)|wl.invite");
  const f = M.wrenLetterFacts({ rec: recOf({ passed: ["a", "b"], answered: ["z"] }), waiting: 3, canPlay: true });
  ok("her letter: the count is passed + answered, replies are the answered", f.count === 3 && f.replied === 1 && f.waiting === 3);
  // "That's 15" is only ever fifteen letters passed or answered: the desk's size and the seen list never count
  const fifteen = Array.from({ length: 15 }, (_, i) => L({ id: "f" + i }));
  const two = M.wrenLetterFacts({ rec: { ...M.emptyDay(TODAY), desk: fifteen, passed: ["f0", "f1"], seen: ["f0", "f1", "f2", "f3"] }, waiting: 0, canPlay: true });
  ok("her letter: the count is what went past (2 of a 15 desk), not the desk and not the seen", two.count === 2 && two.replied === 0);
  const allGone = fifteen.reduce((r, l) => M.passLetter(r, l.id), { ...M.emptyDay(TODAY), desk: fifteen });
  ok("her letter: fifteen passed counts fifteen", M.wrenLetterFacts({ rec: allGone, waiting: 2, canPlay: true }).count === 15);
  const mixed = M.answerLetter(M.passLetter(M.passLetter({ ...M.emptyDay(TODAY), desk: fifteen }, "f0"), "f1"), "f2");
  ok("her letter: two passed and one answered count three, one of them a reply", M.wrenLetterFacts({ rec: mixed, waiting: 0, canPlay: true }).count === 3 && M.wrenLetterFacts({ rec: mixed, waiting: 0, canPlay: true }).replied === 1);

  ok("countdown: minutes padded", M.countdownLabel({ h: 8, m: 6 }, t) === "ld.countdown(h=8,m=06)" && M.countdownLabel({ h: 0, m: 45 }, t) === "ld.countdown(h=0,m=45)");

  const now = new Date(2026, 9, 16, 23, 54);
  const vm = M.buildWrenLetter({ facts: f, name: "émile", doneAt: 1234, now }, fmt);
  ok("her letter: postmarked when the desk was done", vm.stamp === "ST1234");
  ok("her letter: postmarked now when it isn't known", M.buildWrenLetter({ facts: f, name: "Wren", doneAt: null, now }, fmt).stamp === `ST${now.getTime()}`);
  ok("her letter: signed with her initial (a grapheme, upper-cased) and her name", vm.sign === "wl.sign(initial=É,name=émile)");
  ok("her letter: the bag opens at her hour, in the reader's clock, with no number", vm.bag === "BAG.OPENS(T=8:00 AM)");
  ok("her letter: the countdown to 08:00 (23:54 → 8H 06M)", vm.countdown === "ld.countdown(h=8,m=06)" && vm.notYet === "ld.notYet · ld.countdown(h=8,m=06)");
  ok("her letter: the foot names her in capitals", vm.foot === "cod.nextPost(name=ÉMILE)" && vm.chip === "cod.wholePost" && vm.a11y === "wl.a11y(name=émile)" && vm.from === "wl.from");
  ok("her letter: a two-word name works", M.buildWrenLetter({ facts: f, name: "Sir Pip", doneAt: 1, now }, fmt).sign === "wl.sign(initial=S,name=Sir Pip)");

  const sky = M.windowSky({ sky: ["#1E1B35", "#2E2A6B"], scrim: "#2B2660", chip: "#FFFFFF", text: "#FFFFFF", stars: true }, true);
  ok("window sky: night takes the night gradient, her moonlit ink on the pipes, white words", sky.top === "#1E1B35" && sky.bottom === "#2E2A6B" && sky.pillarFill === "#2B2660" && sky.pillarInk === "#DAD6F2" && sky.text === "#FFFFFF" && sky.stars && sky.night);
  const day = M.windowSky({ sky: ["#BFE3F8", "#E3F3FB"], scrim: "#ADDBB5", chip: "#1F5C33", text: "#1E1B35", stars: false }, false);
  ok("window sky: by day the day's colours", day.pillarInk === "#1F5C33" && day.text === "#1E1B35" && !day.stars && !day.night);

  const play = M.buildWindow({ canPlay: true, name: "Wren", countdown: "8H 06M", sky }, t);
  ok("window: she can play — a lap, read as the game with its hint", play.canPlay && play.line === "win.fly(name=Wren)" && play.a11yLabel === "ff.title" && play.a11yHint === "ff.hint" && play.eyebrow === "cod.wholePost");
  const rest = M.buildWindow({ canPlay: false, name: "Wren", countdown: "8H 06M", sky }, t);
  ok("window: she can't — when she's back instead, read as it is, no hint", !rest.canPlay && rest.line === "cod.nextPost(name=WREN) 8H 06M" && rest.a11yLabel === rest.line && rest.a11yHint === "");
}

/* ── lib/day: her morning ── */
{
  const at = (h: number, m = 0) => new Date(2026, 9, 16, h, m, 0, 0);
  ok("morning: before eight it is this morning (never tomorrow's)", D.nextMorning(at(2, 30)).getTime() === new Date(2026, 9, 16, 8).getTime());
  ok("morning: at eight it is tomorrow's", D.nextMorning(at(8, 0)).getTime() === new Date(2026, 9, 17, 8).getTime());
  ok("morning: in the evening it is tomorrow's", D.nextMorning(at(22, 14)).getTime() === new Date(2026, 9, 17, 8).getTime());
  const u = D.untilMorning(at(23, 54));
  ok("until morning: whole minutes, rounded down", u.h === 8 && u.m === 6 && u.ms === 8 * 3600_000 + 6 * 60_000);
  const u2 = D.untilMorning(new Date(2026, 9, 16, 7, 59, 30));
  ok("until morning: half a minute is zero minutes", u2.h === 0 && u2.m === 0 && u2.ms === 30_000);
  ok("night hours: 21:00 to 07:59", D.isNightHour(21) && D.isNightHour(0) && D.isNightHour(7) && !D.isNightHour(8) && !D.isNightHour(20));
}

/* ── Wren at rest on the band: her night hours, her hunger ── */
{
  ok("rest: by day she rests content", M.wrenRest({ hour: 14, wilt: false }).face === "idle");
  ok("rest: 20:59 is still day", M.wrenRest({ hour: 20, wilt: false }).face === "idle");
  ok("rest: from 21:00 she rests sleepy", M.wrenRest({ hour: 21, wilt: false }).face === "sleepy");
  ok("rest: past midnight she's still sleepy", M.wrenRest({ hour: 0, wilt: false }).face === "sleepy" && M.wrenRest({ hour: 3, wilt: false }).face === "sleepy");
  ok("rest: 07:59 is still night (her morning is 8)", M.wrenRest({ hour: 7, wilt: false }).face === "sleepy");
  ok("rest: at 8 she's awake (the desk's morning)", M.wrenRest({ hour: D.MORNING_HOUR, wilt: false }).face === "idle");
  ok("rest: starving, she wears her wilted pictures", M.wrenRest({ hour: 14, wilt: true }).wilt === true && M.wrenRest({ hour: 14, wilt: true }).face === "idle");
  ok("rest: starving at night: sleepy AND wilted", (() => { const r = M.wrenRest({ hour: 23, wilt: true }); return r.face === "sleepy" && r.wilt; })());
  ok("rest: fed, she's back in her colours", M.wrenRest({ hour: 14, wilt: false }).wilt === false);
}

/* ── the arrival ── */
{
  ok("arrival: settles once three letters have been passed", !M.arrivalSettled(2) && M.arrivalSettled(3) && M.ARRIVAL_LETTERS === 3);
  ok("arrival: shows when she has just come back and there are letters", M.arrivalShows({ fresh: true, onDesk: 3 }));
  ok("arrival: a quiet day (or a first load with nothing yet) draws none", !M.arrivalShows({ fresh: true, onDesk: 0 }));
  ok("arrival: not fresh, not shown", !M.arrivalShows({ fresh: false, onDesk: 3 }));
}

/* ── the card ── */
{
  const c = M.buildCard({ letter: L({ id: "a" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: docket is postmark · NO.xxxx", c.postmark === "PM09 · NO.8007");
  ok("card: the face is the author's FACE v1 mask", c.mask === mosaicMask("author-a", 1) && !c.ghost);
  // the who slot (identity-plan §9 + addendum, Phase 0): the final shape, with today's data
  ok("card: who is the pen pal's number in title case until the names switch", c.who.name === "No. 8007");
  ok("card: no mark and no sign until the switch", c.who.mark === null && c.who.markLabel === "" && c.who.sign === null && c.who.signLabel === "");
  ok("card: the face slot holds the FACE v1 mosaic", c.who.face.kind === "mosaic" && c.who.face.mask === mosaicMask("author-a", 1));
  ok("card: when is the postmark's date alone", c.when === "PM09");
  ok("card: the topic tag is the stamp's name in lowercase with a #", c.topic === "#tiny win");
  ok("card: a short letter is a telegram (30/40, centred)", c.bodySize === 30 && c.bodyLine === 40 && c.bodyCenter);
  ok("card: the menu is Report then Block (destructive)", c.menu.map((m) => m.key).join() === "report,block" && c.menu[1].destructive === true);
  ok("card: the reply field names the pen pal", c.replyPlaceholder === "ld.writeBackTo(name=No. 8007)");
  const unwritten = M.buildCard({ letter: L({ id: "a" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", { ...fmt, has: (k: string) => k !== "ld.writeBackTo" });
  ok("card: a language without the named line keeps its own write back", unwritten.replyPlaceholder === "ld.writeBackPh");
  const written = M.buildCard({ letter: L({ id: "a" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", { ...fmt, has: () => true });
  ok("card: a language with the named line uses it", written.replyPlaceholder === "ld.writeBackTo(name=No. 8007)");
  ok("card: the docket's number comes from penPal (the reader's language), upper and compact", M.docket(L({ id: "a" }), { ...fmt, penPal: (_u: string, o: { upper: boolean; compact: boolean }) => (o.upper && o.compact ? "N.º8007" : "?") }) === "PM09 · N.º8007");
  const menuBack = M.cardMenu(L({ id: "a" }), t, { bringBack: true });
  ok("card: Bring back is the third item on a signed letter", menuBack.map((m) => m.key).join() === "report,block,bringBack" && menuBack[2].title === "ld.bringBack" && menuBack[2].icon === "arrow.uturn.backward" && !menuBack[2].destructive);
  ok("card: Bring back is the only item on an unsigned letter", M.cardMenu(L({ id: "g", author: null }), t, { bringBack: true }).map((m) => m.key).join() === "bringBack");
  const pair = M.buildCards(
    [L({ id: "a" }), L({ id: "b" })].map((letter) => ({ letter, offer: null, signal: null, voiceReady: false })),
    "#FFFFFF",
    fmt,
    { bringBackOnFirst: true },
  );
  ok("cards: Bring back goes on the card on screen only", pair[0].menu.some((m) => m.key === "bringBack") && !pair[1].menu.some((m) => m.key === "bringBack"));
  ok("cards: no Bring back unless offered", !M.buildCards([{ letter: L({ id: "a" }), offer: null, signal: null, voiceReady: false }], "#FFFFFF", fmt)[0].menu.some((m) => m.key === "bringBack"));
  ok("card: VoiceOver reads the docket, the topic, then the letter", c.a11yLabel === "PM09 · NO.8007. #tiny win. I fixed the wobbly chair today.");

  const ghost = M.buildCard({ letter: L({ id: "g", author: null }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a deleted account is UNSIGNED, the veil, and has nothing to report", ghost.postmark === "PM09 · ld.unsigned" && ghost.mask === VEIL_MASK && ghost.ghost && ghost.menu.length === 0);
  ok("card: who for a deleted account is UNSIGNED behind the veil", ghost.who.name === "ld.unsigned" && ghost.who.face.kind === "veil" && ghost.who.mark === null && ghost.who.sign === null);
  ok("card: an unsigned letter's field just says write back", ghost.replyPlaceholder === "ld.writeBackPh");

  const unknown = M.buildCard({ letter: L({ id: "u", stamp: "nope" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a stamp stamps.ts doesn't list has no tag and no VoiceOver name", unknown.topic === "" && unknown.stampName === "");

  const long = "word ".repeat(150);
  const lc = M.buildCard({ letter: L({ id: "l", body: long }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a long letter steps down to 18/29, left", lc.bodySize === 18 && lc.bodyLine === 29 && !lc.bodyCenter);

  const light = M.buildCard({ letter: L({ id: "d", stamp: "dark" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  const dark = M.buildCard({ letter: L({ id: "d", stamp: "dark" }), offer: null, signal: null, voiceReady: false }, "#1A1830", fmt);
  ok("card: the topic colours are worked out on the card's own face (Midnight differs)", light.topicWash !== dark.topicWash && light.topicInk !== dark.topicInk);

  const demo = M.buildCard({ letter: L({ id: "demo-p1" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: dev samples are marked demo", demo.demo && !c.demo);
}

/* ── voice letters ── */
{
  const v = M.buildCard({ letter: L({ id: "v", kind: "voice", media_path: "x/v.m4a", duration_s: 74, body: "About my grandmother's kitchen" }), offer: { code: "ES→EN" }, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("voice: the caption is kept, never drawn as the body", v.isVoice && v.body === "" && v.caption === "About my grandmother's kitchen");
  ok("voice: unavailable until its link is signed", v.voiceReady === false);
  ok("voice: the stored length as m:ss", v.durationLabel === "1:14");
  ok("voice: a voice letter is never offered a translation", v.capsule.kind === "none");
  const d = M.buildCard({ letter: L({ id: "v2", kind: "voice", media_path: "x/v.m4a", body: M.DEFAULT_VOICE_CAPTION }), offer: null, signal: null, voiceReady: true }, "#FFFFFF", fmt);
  ok("voice: the default caption is not shown", d.caption === "" && d.voiceReady);
  ok("voice: VoiceOver says it is a voice letter", d.a11yLabel.endsWith("ld.voiceLetter"));
  ok(
    "voice: VoiceOver hears how long it is, that it can't play yet, then the caption",
    v.a11yLabel === "PM09 · NO.8007. #tiny win. ld.voiceLetter. 1:14. ld.voice.unavailable. About my grandmother's kitchen",
  );
  const ready = M.buildCard({ letter: L({ id: "v", kind: "voice", media_path: "x/v.m4a", duration_s: 74, body: "About my grandmother's kitchen" }), offer: null, signal: null, voiceReady: true }, "#FFFFFF", fmt);
  ok("voice: once signed it isn't called unavailable", ready.a11yLabel === "PM09 · NO.8007. #tiny win. ld.voiceLetter. 1:14. About my grandmother's kitchen");
  const vs = M.buildCard({ letter: L({ id: "v", kind: "voice", media_path: "x/v.m4a", body: M.DEFAULT_VOICE_CAPTION }), offer: null, signal: { kind: "close" }, voiceReady: true }, "#FFFFFF", fmt);
  ok("voice: the matcher's reason is read for a voice letter too", vs.capsule.kind === "signal" && vs.a11yLabel === "PM09 · NO.8007. #tiny win. ld.close. ld.voiceLetter");
}

/* ── the capsule slot ── */
{
  const offer = { code: "ES→EN" };
  const close = { kind: "close" } as const;
  const tr = M.capsuleFor(offer, null, close, fmt);
  ok("capsule: translation wins over auras close (owner)", tr.kind === "translate" && tr.code === "ES→EN" && tr.label === "read.invite" && tr.enabled);
  const busy = M.capsuleFor(offer, { text: null, on: false, busy: true }, null, fmt);
  ok("capsule: busy says translating and takes no tap", busy.kind === "translate" && busy.label === "mm.translating" && !busy.enabled);
  const on = M.capsuleFor(offer, { text: "Hello", on: true, busy: false }, null, fmt);
  ok("capsule: translated, the code turns round and offers the original", on.kind === "translate" && on.code === "EN←ES" && on.label === "mm.original");
  const off = M.capsuleFor(offer, { text: "Hello", on: false, busy: false }, null, fmt);
  ok("capsule: flipped back, it invites again", off.kind === "translate" && off.code === "ES→EN" && off.label === "read.invite");
  const rings = M.capsuleFor(null, null, close, fmt);
  ok("capsule: auras close draws the two rings", rings.kind === "signal" && rings.glyph === "rings" && rings.label === "ld.close");
  const hour = M.capsuleFor(null, null, { kind: "hour", stickerId: "night_writer" }, fmt);
  ok("capsule: the same hour draws the clock", hour.kind === "signal" && hour.glyph === "clock" && hour.label === "ld.both.label(name=S:night_writer)");
  const subj = M.capsuleFor(null, null, { kind: "subject", stickerId: "s1" }, fmt);
  ok("capsule: a shared subject or label draws the two stickers", subj.kind === "signal" && subj.glyph === "stickers");
  ok("capsule: a letter that shares nothing gets none", M.capsuleFor(null, null, null, fmt).kind === "none");

  const card = M.buildCard({ letter: L({ id: "x", body: "¿Alguien más siente que septiembre se va demasiado rápido?", lang: "es" }), offer, xl: { text: "Does anyone else feel September goes too fast?", on: true, busy: false }, signal: close, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: the translation swaps the text in place", card.body === "Does anyone else feel September goes too fast?" && card.capsule.kind === "translate");
  ok("card: VoiceOver doesn't read a signal the translate capsule took the slot from", !card.a11yLabel.includes("ld.close"));

  const why = M.buildCard({ letter: L({ id: "w" }), offer: null, signal: close, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: VoiceOver hears why the matcher chose it (the lime capsule), beside the topic", why.a11yLabel === "PM09 · NO.8007. #tiny win. ld.close. I fixed the wobbly chair today.");
  const owl = M.buildCard({ letter: L({ id: "o" }), offer: null, signal: { kind: "hour", stickerId: "night_writer" }, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a shared-sticker reason is read in its words", owl.a11yLabel.includes(". ld.both.label(name=S:night_writer). "));
}

/* ── the fold estimate (React Native card) ── */
{
  ok("fold: a short letter doesn't fold", !M.overflows({ text: "Hello there.", size: 30, line: 40, width: 300, frameH: 400, textH: 80 }));
  ok("fold: the measured height folds it", M.overflows({ text: "Hello there.", size: 30, line: 40, width: 300, frameH: 200, textH: 400 }));
  const zh = "我".repeat(325);
  ok("fold: a 325-weight Chinese letter folds even before measuring (CJK floor)", M.overflows({ text: zh, size: 21, line: 33, width: 300, frameH: 260, textH: 0 }));
}

/* ── the reply ── */
{
  const empty = M.replyState({ text: "", flights: 0, demo: false }, t);
  ok("reply: empty is disabled with the resting hint", empty.sendState === "disabled" && empty.hint === "ld.replyThreadOpens" && !empty.hintWarn);
  const one = M.replyState({ text: " a ", flights: 0, demo: false }, t);
  ok("reply: one character (trimmed) is not enough", one.sendState === "disabled" && !one.ok);
  const fine = M.replyState({ text: "ok.", flights: 2, demo: false }, t);
  ok("reply: 'ok.' is a whole answer — enabled, a thread opens", fine.sendState === "enabled" && fine.hint === "ld.threadOpensTwo");
  const full = M.replyState({ text: "hello there", flights: 5, demo: false }, t);
  ok("reply: a full pouch dims the key but it still takes the tap, and the hint says why", full.sendState === "dimmed" && full.pouchFull && full.hint === "ld.flightFull");
  const demo = M.replyState({ text: "hello there", flights: 9, demo: true }, t);
  ok("reply: a dev letter never counts against the pouch", demo.sendState === "enabled" && !demo.pouchFull);
  const forced = M.replyState({ text: "hello there", flights: 0, demo: true, forceFull: true }, t);
  ok("reply: ?full=1 pretends the pouch is full", forced.sendState === "dimmed");
  const over = M.replyState({ text: "x".repeat(1003), flights: 0, demo: false }, t);
  ok("reply: over the limit is disabled, in red, with the count", over.sendState === "disabled" && over.hintWarn && over.hint === "ui.overLimit(n=3)");
  const slowSend = M.replyState({ text: "hello", flights: 0, demo: false, sending: true, slow: true }, t);
  ok("reply: a send that outlasts a send says the headwind (net.slow), key still disabled", slowSend.hint === "net.slow" && slowSend.sendState === "disabled");
  ok("reply: slow alone (nothing sending) changes nothing", M.replyState({ text: "hello", flights: 0, demo: false, slow: true }, t).hint === "ld.threadOpensTwo");
  const sending = M.replyState({ text: "hello", flights: 0, demo: false, sending: true }, t);
  ok("reply: nothing sends twice while a send is in flight", sending.sendState === "disabled");
  ok("reply: the draft's first line", M.draftPreview("  first line\nsecond") === "first line" && M.draftPreview("") === "");
}

/* ── refused replies ── */
{
  ok("refusal: a guest is asked to sign in", M.replyFailAction(null, true) === "signup");
  ok("refusal: a letter taken back leaves the desk", M.replyFailAction("gone", false) === "remove");
  ok("refusal: a block leaves the desk too (and says the same words)", M.replyFailAction("blocked", false) === "remove");
  ok("refusal: suspended, offline, an expired session or a server error keep the words", ["suspended", "offline", "session", "server", "timeout", null].every((k) => M.replyFailAction(k as never, false) === "keep"));
}

/* ── the geometry ── */
{
  const big = M.deskGeometry({ hostH: 852, safeTop: 54, tabBarRoom: 98 });
  ok("geometry: 393×852 (top 54, room 98), the band 68: 110 / 560 / 684", big.cardTop === 110 && big.cardH === 560 && big.controlTop === 684);
  const se = M.deskGeometry({ hostH: 667, safeTop: 20, tabBarRoom: 84 });
  ok("geometry: an iPhone SE's card stays a letter (360 or more)", se.cardH >= 360 && se.cardTop === 76 && se.controlTop === se.cardTop + se.cardH + 14);
  const tiny = M.deskGeometry({ hostH: 500, safeTop: 20, tabBarRoom: 84 });
  ok("geometry: the card never goes under 360", tiny.cardH === 360);

  /* writing back (A1): the card's top stays, its foot comes up to 14 over the hint */
  const kb = M.replyCardHeight(big, { hostH: 852, keyboard: 336, strip: 73, bottomGap: 30 });
  ok("reply: 393×852 with a 336 keyboard and a one-line bar shrinks the card (560 → 307)", kb === 852 - 348 - 73 - 14 - 110 && kb === 307);
  ok("reply: the bar's foot is 12 over the keyboard, the hint 14 under the card's foot", kb !== null && big.cardTop + kb + 14 + 73 + 12 + 336 === 852);
  const grown = M.replyCardHeight(big, { hostH: 852, keyboard: 336, strip: 130, bottomGap: 30 });
  ok("reply: a bar grown to four lines takes more of the card", grown !== null && kb !== null && grown < kb);
  ok("reply: a hardware keyboard (no inset) leaves the card as it is", M.replyCardHeight(big, { hostH: 852, keyboard: 0, strip: 73, bottomGap: 30 }) === null);
  const seKb = M.replyCardHeight(se, { hostH: 667, keyboard: 260, strip: 73, bottomGap: 16 });
  ok("reply: an iPhone SE's card keeps its head and two lines (200 or more)", seKb !== null && seKb >= 200);
  ok("reply: never under 200", M.replyCardHeight(se, { hostH: 667, keyboard: 400, strip: 130, bottomGap: 16 }) === 200);
  const tele = M.replyBody({ size: 30, line: 40 });
  ok("reply: the telegram drops to 20, its leading with it", tele.size === 20 && Math.abs(tele.line - 80 / 3) < 0.001);
  const letter = M.replyBody({ size: 21, line: 33 });
  ok("reply: a letter's 21/33 goes to 20 at its own leading", letter.size === 20 && Math.abs(letter.line - 660 / 21) < 0.001);
  const long = M.replyBody({ size: 18, line: 29 });
  ok("reply: the long letter's 18/29 stays", long.size === 18 && long.line === 29);
}

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
