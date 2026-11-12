/* Behaviour lock for the Today tab's model (screens/today/today-cards): the
   saved day (read, phase, pass / bring back / answer / drop, seen, freeze,
   done, the relaunch), undo after Next (owner's audit, 2026-11-10: the five
   seconds, the most recent pass only, and how it follows every move on the
   saved day), Next's ring (the desk in reading order, an answered
   letter kept in its place; and with her birthday letter standing before the
   desk, owner's audit 2026-11-10: no tick for it, no letter of the desk on
   screen), her birthday letter itself (its lines with the one counted line
   and its forms for one, none and unknown, the card, its Undo; the day is
   lib/birthday-core's own test), left as the desk's own intersection, the seal held
   against the desk, how a load deals, her counted letter and the window,
   how Wren rests on the band (her night hours, her hunger), the card both
   renderers draw (its who slot with the identity switch off — exactly
   today's — and on: the courier name, the frost, the mark and the sign,
   VoiceOver's "{name}, {mark}. {when}."), the reply's send key and hint, what a refused reply
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
const { whoBook } = await import("../../lib/stranger-who.ts");
const { strangerName } = await import("../../lib/stranger-name.ts");
const { frostSpec } = await import("../../lib/frost.ts");
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
  ok("keepDesk: new letters join at the end, up to the ten", M.keepDesk(cur, fullPage, false, many).length === 10);
  const big = Array.from({ length: 16 }, (_, i) => L({ id: "k" + i }));
  ok("keepDesk: a desk already past ten isn't cut", M.keepDesk(big, fullPage, false, many).length === 16);
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
  // the day's last letter passed by mistake (No. 1692): the desk was done, her letter's ⋯ brings it back
  const allPassed = M.markDone(M.passLetter(M.passLetter(M.passLetter(r0, "a"), "b"), "c"), 99);
  ok("bring back: from a done desk, the last pass is offered", M.deskPhase({ loaded: true, offline: false, desk: allPassed.desk, passed: allPassed.passed }) === "done" && M.canBringBack(allPassed));
  const reopened = M.bringBack(allPassed);
  ok("bring back: a done desk reads again, and its done moment goes", M.deskPhase({ loaded: true, offline: false, desk: reopened.desk, passed: reopened.passed }) === "reading" && reopened.doneAt === null && M.unpassed(reopened.desk, reopened.passed)[0].id === "c");
  const r3 = M.passLetter(M.passLetter(r0, "a"), "b");
  ok("bring back: only the last pass", M.bringBack(r3).passed.join() === "a");
  const replied = M.answerLetter(r1, "b");
  ok("bring back: a reply clears nothing it doesn't own (the undo stays for another letter)", M.canBringBack(replied));
  const repliedSame = M.answerLetter({ ...r0, undo: "a", passed: ["a"] }, "a");
  ok("bring back: after that letter was answered, it is blocked", !M.canBringBack(repliedSame) && M.bringBack(repliedSame) === repliedSame);

  /* a letter asked for by name from the Kindreds tab (lib/answer-request): to the front, un-passed */
  {
    const f0 = recOf();
    const fIds = f0.desk.map((l) => l.id);
    const fLast = fIds[fIds.length - 1];
    const fronted = M.frontLetter(f0, fLast);
    ok("front: the letter asked for is the first on the desk; the others keep their order", fronted.desk.map((l) => l.id).join() === [fLast, ...fIds.slice(0, -1)].join());
    ok("front: nothing else moves (passed, answered, undo, the done moment)", fronted.passed === f0.passed && fronted.answered === f0.answered && fronted.undo === f0.undo && fronted.doneAt === f0.doneAt);
    ok("front: already first and not passed: the same record back", M.frontLetter(f0, fIds[0]) === f0);
    ok("front: not on the desk (answered, taken back): the same record back", M.frontLetter(f0, "nobody") === f0 && M.frontLetter(M.answerLetter(f0, fLast), fLast).desk.every((l) => l.id !== fLast));
    const wasPassed = M.passLetter(M.passLetter(f0, fIds[0]), fIds[1]);
    const back = M.frontLetter({ ...wasPassed, doneAt: 5 }, fIds[1]);
    ok("front: a passed letter is un-passed, and its Undo goes with it", back.desk[0].id === fIds[1] && back.passed.join() === fIds[0] && back.undo === null);
    ok("front: bringing a passed letter back opens a done desk again", back.doneAt === null);
    ok("front: the first unpassed letter is then the one asked for", M.unpassed(back.desk, back.passed)[0].id === fIds[1]);
    ok("front: another letter's Undo is left alone", M.frontLetter(M.passLetter(f0, fIds[0]), fLast).undo === fIds[0]);
  }
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

  /* undo after Next (owner's audit, 2026-11-10): five seconds, the most recent pass only, held against the record */
  const phaseOf = (r: typeof r0) => M.deskPhase({ loaded: true, offline: false, desk: r.desk, passed: r.passed });
  const open = (offer: import("./today-cards").UndoOffer | null, r: typeof r0, now: number, away = false) => M.undoOpen({ offer, rec: r, phase: phaseOf(r), now, away });
  const T0 = 1_000_000;
  const offerA = M.undoOffer(r1, "a", T0);
  ok("undo: a pass leaves an offer for that letter, five seconds long", !!offerA && offerA.id === "a" && offerA.until === T0 + 5000 && M.UNDO_MS === 5000);
  ok("undo: no offer for a pass that didn't take, or for a letter that isn't the record's undo", M.undoOffer(r0, "a", T0) === null && M.undoOffer(r1, "b", T0) === null);
  ok("undo: up at once and through the five seconds", open(offerA, r1, T0) && open(offerA, r1, T0 + 4999));
  ok("undo: gone at five seconds", !open(offerA, r1, T0 + 5000));
  ok("undo: no offer, no capsule", !open(null, r1, T0));
  ok("undo: steps aside for a reply, the reader or the + panel", !open(offerA, r1, T0, true));
  const undone = M.bringBack(r1);
  ok("undo: it is the bring back: the letter is on screen again and nothing is left to undo", M.unpassed(undone.desk, undone.passed)[0].id === "a" && !open(offerA, undone, T0 + 1));
  ok("undo: the record is the one from before the pass (Next's count and ring with it)", JSON.stringify(undone) === JSON.stringify(r0));
  // b came on screen for a moment before the undo: the ring is back on a, and b stays read, as after the ⋯'s bring back
  const sawB = M.deskTicks({ ...undone, seen: ["a", "b"] }, M.unpassed(undone.desk, undone.passed).map((l) => l.id));
  ok("undo: Next's ring is back on the letter brought back", sawB.at === 0 && sawB.desk.map((x) => x.state).join() === "read,read,unread");
  const offerB = M.undoOffer(r3, "b", T0 + 1000);
  ok("undo: the next pass takes the offer (only the most recent pass)", !open(offerA, r3, T0 + 1000) && !!offerB && open(offerB, r3, T0 + 1000) && M.bringBack(r3).passed.join() === "a");
  const lastPass = M.passLetter(r3, "c");
  ok("undo: the day's last pass shows none (the desk is done: her letter's ⋯ brings it back)", !open(M.undoOffer(lastPass, "c", T0), lastPass, T0) && M.canBringBack(lastPass));
  ok("undo: goes when its letter is blocked or taken back", !open(offerA, M.dropAuthor(r1, "author-a"), T0 + 1) && !open(offerA, M.dropLetters(r1, ["a"]), T0 + 1));
  ok("undo: goes when a load prunes its letter", !open(offerA, M.withDesk(r1, [L({ id: "b" }), L({ id: "c" })]), T0 + 1));
  ok("undo: stays through a load that keeps the letter, and through another letter's reply", open(offerA, M.withDesk(r1, [...r1.desk, L({ id: "d" })]), T0 + 1) && open(offerA, M.answerLetter(r1, "c"), T0 + 1));
  ok("undo: goes when the day turns", !open(offerA, M.emptyDay("2026-10-17"), T0 + 1));
  // put away and read again (a relaunch): the record still knows its undo; the offer was only ever in memory
  const reread = M.readDayRecord(JSON.stringify(r1), TODAY);
  ok("undo: a relaunch keeps the ⋯'s bring back, and has no capsule of its own", !!reread && M.canBringBack(reread.rec) && !open(null, reread.rec, T0 + 1));
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
  ok("deal: up to the ten", M.dealDesk(cur, [], many).length === 10);
  const onX = [L({ id: "x1", author: "X" })];
  ok("deal: the writer on screen isn't dealt again behind it", ids(M.dealDesk(onX, [], [L({ id: "x2", author: "X" }), L({ id: "y1", author: "Y" })])) === "x1,y1");
  ok("fill: a writer already on the desk isn't added again", ids(M.keepDesk(onX, onX, false, [L({ id: "x2", author: "X" }), L({ id: "y1", author: "Y" })])) === "x1,y1");
  ok("deal: passed in pass order", ids(M.dealDesk(cur, ["p3", "p1"], [])) === "p3,p1,p2");
}

/* ── seen ── */
{
  const r = M.markSeen(recOf(), "a");
  ok("seen: the first time counts", r.counted && r.rec.seen.join() === "a");
  const again = M.markSeen(r.rec, "a");
  ok("seen: the second doesn't (across relaunches too: it is in the record)", !again.counted && again.rec === r.rec);
}

/* ── Next's ring: the desk in reading order ── */
{
  const ticks = (rec: import("./today-cards").DayRecord) => M.deskTicks(rec, M.unpassed(rec.desk, rec.passed).map((l) => l.id));
  // u unread, r read, R replied; @ the letter on screen's place
  const show = (x: { desk: { id: string; state: string }[]; at: number }) => x.desk.map((d) => d.id + ":" + (d.state === "replied" ? "R" : d.state[0])).join() + "@" + x.at;
  // the reader sees a, passes it, sees b
  let rec = M.markSeen(recOf(), "a").rec;
  ok("ring: a fresh desk, the letter on screen read, the rest unread", show(ticks(rec)) === "a:r,b:u,c:u@0");
  rec = M.markSeen(M.passLetter(rec, "a"), "b").rec;
  ok("ring: a pass moves the letter on screen on", show(ticks(rec)) === "a:r,b:r,c:u@1");
  // b answered: it leaves the desk, but keeps its place by when it was seen
  rec = M.markSeen(M.answerLetter(rec, "b"), "c").rec;
  ok("ring: an answered letter keeps its place and reads replied", show(ticks(rec)) === "a:r,b:R,c:r@2");
  rec = M.passLetter(rec, "c");
  ok("ring: done, every letter behind, at = the desk's size", show(ticks(rec)) === "a:r,b:R,c:r@3");
  const back = M.bringBack(rec);
  ok("ring: bring back puts the letter on screen again", show(ticks(back)) === "a:r,b:R,c:r@2");
  // a letter gone past without being counted seen (a dev letter) still has its tick
  const unseen = M.answerLetter(M.passLetter(recOf(), "a"), "b");
  ok("ring: gone past unseen follows the seen ones, passed before answered", show(ticks(unseen)) === "a:r,b:R,c:r@2");
  // a letter passed, then its writer blocked: still read
  const blocked = M.dropAuthor(M.markSeen(M.passLetter(M.markSeen(recOf(), "a").rec, "a"), "b").rec, "author-a");
  ok("ring: a passed letter whose writer was blocked stays read", show(ticks(blocked)) === "a:r,b:r,c:u@1");
  ok("ring: an empty desk is an empty ring", show(M.deskTicks(M.emptyDay(TODAY), [])) === "@0");

  // her birthday letter stands before the desk (owner's audit, 2026-11-10): it has no tick, and no letter of the desk is on screen
  const before = (r: import("./today-cards").DayRecord) => M.deskTicks(r, M.unpassed(r.desk, r.passed).map((l) => l.id), { before: true });
  ok("ring, her letter first: a fresh desk is all unread, no place yet", show(before(recOf())) === "a:u,b:u,c:u@-1");
  const mid = M.markSeen(M.passLetter(M.markSeen(recOf(), "a").rec, "a"), "b").rec;
  ok("ring, her letter first: what went past stays read, a letter seen earlier too, the place is the last one past", show(before(mid)) === "a:r,b:r,c:u@0");
  const midUnseen = M.passLetter(M.markSeen(recOf(), "a").rec, "a");
  ok("ring, her letter first: the next letter isn't read until it has been on screen", show(before(midUnseen)) === "a:r,b:u,c:u@0");
  const allGone = M.passLetter(M.passLetter(M.passLetter(recOf(), "a"), "b"), "c");
  ok("ring, her letter first over a finished desk: every tick behind, the place on the last (Next shows its ✓)", show(before(allGone)) === "a:r,b:r,c:r@2");
  ok("ring, her letter first: the same ids, in the same order, as without it", before(mid).desk.map((d) => d.id).join() === ticks(mid).desk.map((d) => d.id).join());
  ok("ring, her letter first over an empty desk: an empty ring", show(M.deskTicks(M.emptyDay(TODAY), [], { before: true })) === "@-1");
}

/* ── her birthday letter (owner's audit, 2026-11-10) ── */
{
  ok("her card's id carries the year and is told from a letter's", M.wrenCardId(2026) === "wren-birthday-2026" && M.isWrenCardId("wren-birthday-2026") && !M.isWrenCardId("a") && !M.isWrenCardId("") && !M.isWrenCardId(null) && !M.isWrenCardId("demo-wren"));
  ok("lines: hello, kept, cake, then the count", M.wrenCardLines(14, t).join("|") === "bd.hello|bd.kept|bd.cake|bd.under.N(n=14)");
  ok("lines: two is the first plural", M.wrenCardLines(2, t)[3] === "bd.under.N(n=2)");
  ok("lines: one has its own line, with no number in it", M.wrenCardLines(1, t)[3] === "bd.under.1");
  ok("lines: none has its own line", M.wrenCardLines(0, t)[3] === "bd.under.0");
  ok("lines: unknown (no desk to count) leaves the line out, never a guess", M.wrenCardLines(null, t).join("|") === "bd.hello|bd.kept|bd.cake");
  ok("lines: three to five short sentences", [null, 0, 1, 15].every((n) => M.wrenCardLines(n, t).length >= 3 && M.wrenCardLines(n, t).length <= 5));

  // the postmark formats an instant in the reader's zone: the card's date must be the birthday itself
  const dayFmt = { t, postmark: (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}`; } };
  const card = M.buildWrenCard({ name: "Pip", day: { y: 2026, m: 11, d: 10 }, under: 14, ends: false }, dayFmt);
  ok("card: its id is the year's", card.id === "wren-birthday-2026");
  ok("card: her name, as the reader named her", card.name === "Pip");
  ok("card: the date is the birthday, like any letter's", card.when === "11/10");
  ok("card: the switch-off docket line, the date and her name in capitals", card.postmark === "11/10 · PIP");
  ok("card: the body is the lines, one per line", card.body === "bd.hello\nbd.kept\nbd.cake\nbd.under.N(n=14)" && card.lines.length === 4);
  ok("card: signed with her whole name", card.sign === "bd.sign(name=Pip)");
  ok("card: a letter's tier, never the telegram's 30pt", card.bodySize === 21 && card.bodyLine === 33);
  ok("card: not the end of the day while letters wait under it", card.ends === false);
  ok("card: VoiceOver hears who, when, the lines and the sign-off", card.a11yLabel === "wl.a11y(name=Pip). 11/10. bd.hello. bd.kept. bd.cake. bd.under.N(n=14). bd.sign(name=Pip)");
  const twoWords = M.buildWrenCard({ name: "Sunday Kite", day: { y: 2027, m: 1, d: 1 }, under: 0, ends: true }, dayFmt);
  ok("card: a two-word name, the first of January, a finished desk", twoWords.id === "wren-birthday-2027" && twoWords.when === "1/1" && twoWords.postmark === "1/1 · SUNDAY KITE" && twoWords.ends && twoWords.lines[3] === "bd.under.0");
  const offline = M.buildWrenCard({ name: "Pip", day: { y: 2028, m: 2, d: 29 }, under: null, ends: false }, dayFmt);
  ok("card: offline with nothing kept, three lines and still a letter's tier", offline.lines.length === 3 && offline.bodySize === 21 && offline.when === "2/29");
  // real sentences end in a full stop: VoiceOver's label doesn't double it
  const real = M.buildWrenCard({ name: "Pip", day: { y: 2026, m: 11, d: 10 }, under: 1, ends: false }, { ...dayFmt, t: (k: string, v?: Record<string, string | number>) => (k === "bd.sign" ? `— ${v?.name}` : k === "wl.a11y" ? `A letter from ${v?.name}` : `${k}.`) });
  ok("card: VoiceOver's label has no doubled full stop", !real.a11yLabel.includes("..") && real.a11yLabel.startsWith("A letter from Pip. 11/10. bd.hello. ") && real.a11yLabel.endsWith("— Pip"));

  // its Undo: the offer is hers, for five seconds, while a letter came up after it
  const offer = { id: M.wrenCardId(2026), until: 1000 + M.UNDO_MS };
  ok("undo: up for her letter while the desk is reading", M.wrenUndoOpen({ offer, phase: "reading", now: 2000 }));
  ok("undo: gone when the five seconds are up", !M.wrenUndoOpen({ offer, phase: "reading", now: 1000 + M.UNDO_MS }));
  ok("undo: not when hers was the last card (the day is done)", !M.wrenUndoOpen({ offer, phase: "done", now: 2000 }));
  ok("undo: not while something is in the way", !M.wrenUndoOpen({ offer, phase: "reading", now: 2000, away: true }));
  ok("undo: a stranger's offer is not hers, and none is none", !M.wrenUndoOpen({ offer: { id: "a", until: 9999 }, phase: "reading", now: 2000 }) && !M.wrenUndoOpen({ offer: null, phase: "reading", now: 2000 }));
  // and the record's own rule never opens for her id (it was never on the record)
  ok("undo: the record's rule doesn't know her letter", !M.undoOpen({ offer, rec: M.passLetter(recOf(), "a"), phase: "reading", now: 2000 }));
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
  ok("her letter: no ⋯ unless the last pass can come back", vm.bringBack === "" && vm.more === "rp.menu.a11y");
  ok("her letter: the ⋯'s one item when it can", M.buildWrenLetter({ facts: f, name: "Wren", doneAt: 1, now, canBringBack: true }, fmt).bringBack === "ld.bringBack");

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
  ok("card: the reply box says who you reply to, by the header's name", c.replyingTo === "rd.replyingTo(name=No. 8007)");
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

  /* the paper (letter papers, contract §4): letters.paper read as an id, unknown / missing = plain;
     plain adds nothing to VoiceOver, any other is named after the letter */
  ok("paper: a letter with none is plain, and VoiceOver hears nothing of it", c.paper === "plain" && !c.a11yLabel.includes("pp."));
  const onKraft = M.buildCard({ letter: L({ id: "a", paper: "kraft" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("paper: the writer's paper rides on the card", onKraft.paper === "kraft");
  ok("paper: VoiceOver names it after the letter (a space after a full stop)", onKraft.a11yLabel === "PM09 · NO.8007. #tiny win. I fixed the wobbly chair today. pp.a11y.onPaper(name=pp.name.kraft)");
  const onGrid = M.buildCard({ letter: L({ id: "a", paper: "grid", body: "no full stop" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("paper: after a letter with no full stop it is a sentence of its own", onGrid.a11yLabel.endsWith("no full stop. pp.a11y.onPaper(name=pp.name.grid)"));
  ok("paper: an unknown id is plain", M.buildCard({ letter: L({ id: "a", paper: "midnight" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt).paper === "plain");
  ok("paper: a null one is plain", M.buildCard({ letter: L({ id: "a", paper: null }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt).paper === "plain");

  const ghost = M.buildCard({ letter: L({ id: "g", author: null }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a deleted account is UNSIGNED, the veil, and has nothing to report", ghost.postmark === "PM09 · ld.unsigned" && ghost.mask === VEIL_MASK && ghost.ghost && ghost.menu.length === 0);
  ok("card: who for a deleted account is UNSIGNED behind the veil", ghost.who.name === "ld.unsigned" && ghost.who.face.kind === "veil" && ghost.who.mark === null && ghost.who.sign === null);
  ok("card: an unsigned letter's field just says write back", ghost.replyPlaceholder === "ld.writeBackPh");

  /* the who slot from the shared book (lib/stranger-who). SWITCH OFF: a book made with the switch
     off gives exactly the card without one — every field, every character */
  const offBook = whoBook({ identity: false, t, lang: "en", penPal: (u, o) => (u ? fmt.penPal(u, { upper: !!o.upper, compact: !!o.compact }) : t("ld.unsigned")), marks: () => ({ mark: "she", sign: "leo" }), dark: true });
  const withOff = (letter: Letter) => M.buildCard({ letter, offer: null, signal: { kind: "close" } as never, voiceReady: false }, "#FFFFFF", { ...fmt, who: offBook });
  const without = (letter: Letter) => M.buildCard({ letter, offer: null, signal: { kind: "close" } as never, voiceReady: false }, "#FFFFFF", fmt);
  ok("identity off: a card is exactly today's (signed)", JSON.stringify(withOff(L({ id: "a" }))) === JSON.stringify(without(L({ id: "a" }))));
  ok("identity off: a card is exactly today's (unsigned)", JSON.stringify(withOff(L({ id: "g", author: null }))) === JSON.stringify(without(L({ id: "g", author: null }))));
  ok("identity off: the docket keeps the number", M.docket(L({ id: "a" }), { ...fmt, who: offBook }) === "PM09 · NO.8007");
  ok("identity off: who.spoken is the number alone", c.who.spoken === "No. 8007");

  /* SWITCH ON: the courier name, the frost, the mark and the sign once answered */
  const UID = "author-a";
  const courier = strangerName(UID, { lang: "en", unsigned: "ld.unsigned" });
  const onBook = (marks: boolean) =>
    whoBook({ identity: true, t, lang: "en", penPal: (u, o) => (u ? fmt.penPal(u, { upper: !!o.upper, compact: !!o.compact }) : t("ld.unsigned")), marks: marks ? () => ({ mark: "she", sign: "gemini" }) : null, dark: false });
  const on = M.buildCard({ letter: L({ id: "a" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", { ...fmt, who: onBook(true) });
  ok("identity on: who is the courier name in title case, never a number", on.who.name === courier && !on.who.name.includes("No."));
  ok("identity on: the face slot is their frosted window (FROST v1)", on.who.face.kind === "frost" && JSON.stringify(on.who.face.spec) === JSON.stringify(frostSpec(UID, false)));
  // a letter is from a stranger: the star sign alone, never the she/he mark (owner, 2026-11-12)
  ok("identity on: a letter shows the sign alone, never the mark", on.who.mark === null && on.who.markLabel === "" && on.who.sign === "gemini" && on.who.signLabel === "zd.gemini");
  ok("identity on: VoiceOver opens with name and sign (never the mark), then when — no number", on.a11yLabel === `${courier}, zd.gemini. PM09. #tiny win. I fixed the wobbly chair today.` && !on.a11yLabel.includes("NO.") && !on.a11yLabel.includes("id.mark"));
  ok("identity on: the reply field names the courier name (id.writeBackTo, in all nine)", on.replyPlaceholder === `id.writeBackTo(name=${courier})`);
  ok("identity on: the reply box replies to the courier name", on.replyingTo === `rd.replyingTo(name=${courier})`);
  ok("identity on: the legacy docket carries the courier name in capitals", on.postmark === `PM09 · ${courier.toLocaleUpperCase()}`);
  ok("identity on: the legacy mask stays today's mosaic (only who has the frost)", on.mask === mosaicMask(UID, 1) && !on.ghost);
  ok("identity on: when is still the date alone", on.when === "PM09");
  const early = M.buildCard({ letter: L({ id: "a" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", { ...fmt, who: onBook(false) });
  ok("identity on: before the marks arrive, no mark and no sign, and nothing else differs", early.who.mark === null && early.who.sign === null && early.who.name === on.who.name && JSON.stringify(early.who.face) === JSON.stringify(on.who.face));
  ok("identity on: before the marks arrive, VoiceOver says the name alone", early.a11yLabel.startsWith(`${courier}. PM09. `));
  const onGhost = M.buildCard({ letter: L({ id: "g", author: null }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", { ...fmt, who: onBook(true) });
  ok("identity on: a deleted account is still UNSIGNED behind the veil, no mark, no sign", onGhost.who.name === "ld.unsigned" && onGhost.who.face.kind === "veil" && onGhost.who.mark === null && onGhost.who.sign === null && onGhost.replyPlaceholder === "ld.writeBackPh");
  ok("identity on: an unsigned card is read as UNSIGNED, then when", onGhost.a11yLabel.startsWith("ld.unsigned. PM09. "));

  const unknown = M.buildCard({ letter: L({ id: "u", stamp: "nope" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a stamp stamps.ts doesn't list has no tag and no VoiceOver name", unknown.topic === "" && unknown.stampName === "");

  const long = "word ".repeat(150);
  const lc = M.buildCard({ letter: L({ id: "l", body: long }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a long letter steps down to 18/29, left", lc.bodySize === 18 && lc.bodyLine === 29 && !lc.bodyCenter);

  const light = M.buildCard({ letter: L({ id: "d", stamp: "dark" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  const dark = M.buildCard({ letter: L({ id: "d", stamp: "dark" }), offer: null, signal: null, voiceReady: false }, "#1A1830", fmt);
  ok("card: the topic tag is the stamp's own colour with ink words, the same on both themes (the App Store tag)", light.topicWash === dark.topicWash && light.topicInk === "#1E1B35" && dark.topicInk === "#1E1B35");
  const bare = M.buildCard({ letter: L({ id: "n", stamp: null as unknown as string }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: no stamp, the quiet grey tag with ink words", bare.topicWash === "#B9B5D0" && bare.topicInk === "#1E1B35");

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
  ok("reply: the resting lines are no notice (the Swift box hides them)", !empty.notice && !M.replyState({ text: "ok.", flights: 0, demo: false }, t).notice);
  const one = M.replyState({ text: " a ", flights: 0, demo: false }, t);
  ok("reply: one character (trimmed) is not enough", one.sendState === "disabled" && !one.ok);
  const fine = M.replyState({ text: "ok.", flights: 2, demo: false }, t);
  ok("reply: 'ok.' is a whole answer — enabled, a thread opens", fine.sendState === "enabled" && fine.hint === "ld.threadOpensTwo");
  const full = M.replyState({ text: "hello there", flights: 5, demo: false }, t);
  ok("reply: a full pouch dims the key but it still takes the tap, and the hint says why", full.sendState === "dimmed" && full.pouchFull && full.hint === "ld.flightFull" && full.notice);
  const demo = M.replyState({ text: "hello there", flights: 9, demo: true }, t);
  ok("reply: a dev letter never counts against the pouch", demo.sendState === "enabled" && !demo.pouchFull);
  const forced = M.replyState({ text: "hello there", flights: 0, demo: true, forceFull: true }, t);
  ok("reply: ?full=1 pretends the pouch is full", forced.sendState === "dimmed");
  const over = M.replyState({ text: "x".repeat(1003), flights: 0, demo: false }, t);
  ok("reply: over the limit is disabled, in red, with the count", over.sendState === "disabled" && over.hintWarn && over.hint === "ui.overLimit(n=3)" && over.notice);
  const slowSend = M.replyState({ text: "hello", flights: 0, demo: false, sending: true, slow: true }, t);
  ok("reply: a send that outlasts a send says the headwind (net.slow), key still disabled", slowSend.hint === "net.slow" && slowSend.sendState === "disabled" && slowSend.notice);
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

/* the inner screen of a folding phone, as Swift's KTodayGeometry lays it out (floating, bend) */
{
  const open = M.deskGeometry({ hostH: 669, safeTop: 14, tabBarRoom: 20, floating: true });
  ok("spread: the sheet runs to the foot and the band floats 12 over its edge", open.cardH === Math.round(669 - 70 - 22) && open.controlTop === open.cardTop + open.cardH - 68 - 12, open);
  const laptop = M.deskGeometry({ hostH: 951, safeTop: 54, tabBarRoom: 20, bend: 476 });
  ok("laptop: the sheet ends 14 over the bend, the band in the middle under it", laptop.cardH === 476 - laptop.cardTop - 14 && laptop.controlTop > 476 && laptop.controlTop + 68 < 951 - 20, laptop);
  const lowBend = M.deskGeometry({ hostH: 951, safeTop: 54, tabBarRoom: 20, bend: 200 });
  const plain = M.deskGeometry({ hostH: 951, safeTop: 54, tabBarRoom: 20 });
  ok("a bend too high for a card: the usual desk", lowBend.cardH === plain.cardH && lowBend.controlTop === plain.controlTop, { lowBend, plain });
}

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
