/* Today after fifteen: the rules (lib/after-fifteen-core; docs/today-after-fifteen.md, the owner's
   decisions of 2026-11-11). Which page a finished desk gets, the one streak's days, the reading
   timer's sums, a letter's opening and which letters give none, whose turn it is between a line
   and a fact, the receipt's totals, and the record the phone keeps through a day, a reopened
   desk and a turned day.
   Not wired to a runner; run by hand from the repo root with plain node (Node 22.18+ strips the
   types itself):
     node src/lib/after-fifteen-core.test.ts
   A load hook only adds ".ts" to the extensionless relative imports Metro wants. Every line
   prints ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const A = await import("./after-fifteen-core.ts");
type AfterState = import("./after-fifteen-core.ts").AfterState;
type LetterNote = import("./after-fifteen-core.ts").LetterNote;

let fails = 0;
const ok = (name: string, cond: boolean, extra: unknown = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || extra === "" ? "" : "  " + JSON.stringify(extra)));
  if (!cond) fails++;
};
const eq = (name: string, got: unknown, want: unknown) => ok(name, JSON.stringify(got) === JSON.stringify(want), { got, want });

// November 2026: the 1st is a Sunday, so 8, 15, 22 are Sundays and 11 is a Wednesday
const at = (day: number, hour: number, min = 0) => new Date(2026, 10, day, hour, min).getTime();
const key = (day: number) => `2026-11-${String(day).padStart(2, "0")}`;
const made = at(2, 10); // the account's day 1 is Monday the 2nd

/* ── days ── */
eq("shiftDay crosses a month", A.shiftDay("2026-11-01", -1), "2026-10-31");
eq("daysApart", A.daysApart("2026-10-30", "2026-11-02"), 3);
eq("the 1st of November 2026 is a Sunday", A.weekdayOf("2026-11-01"), 0);

/* ── which page ── */
const page = (doneAt: number, o: Partial<{ createdAt: number | null; hatched: boolean; nights: { day: string; done: boolean }[] }> = {}) =>
  A.choosePage({ createdAt: made, doneAt, hatched: true, nights: [], ...o });

eq("day 1, afternoon: the mailbox", page(at(2, 15)), "box");
eq("day 1, evening: still the mailbox", page(at(2, 21)), "box");
eq("day 2, evening: still the mailbox", page(at(3, 22)), "box");
eq("day 3, afternoon: the mailbox", page(at(4, 15)), "box");
eq("day 3, 19:59: the mailbox", page(at(4, 19, 59)), "box");
eq("day 3, 20:00: bedtime", page(at(4, 20)), "bedtime");
eq("after midnight, before she is back: bedtime (the desk's day is still yesterday)", page(at(6, 1)), "bedtime");
eq("07:59 is still the evening before", page(at(6, 7, 59)), "bedtime");
eq("08:00 is a new day's morning: the mailbox", page(at(6, 8)), "box");
eq("Sunday afternoon: the receipt", page(at(8, 14)), "receipt");
eq("Sunday evening: the receipt, not bedtime", page(at(8, 22)), "receipt");
eq("Monday 01:00 still belongs to Sunday's desk: the receipt", page(at(9, 1)), "receipt");
eq("Sunday on the account's day 1: the mailbox", A.choosePage({ createdAt: at(8, 9), doneAt: at(8, 14), hatched: true, nights: [] }), "box");
eq("the account's age unknown: the mailbox", page(at(11, 22), { createdAt: null }), "box");
eq("an egg has no bedtime", page(at(11, 22), { hatched: false }), "box");

const skipped = (...days: number[]) => days.map((d) => ({ day: key(d), done: false }));
eq("two skipped bedtimes: bedtime again", page(at(11, 21), { nights: skipped(9, 10) }), "bedtime");
eq("three skipped running: the mailbox in the evening too", page(at(12, 21), { nights: skipped(9, 10, 11) }), "box");
eq("a done one among the last three: bedtime", page(at(12, 21), { nights: [{ day: key(9), done: false }, { day: key(10), done: true }, { day: key(11), done: false }] }), "bedtime");
eq("six days after the last offer: still the mailbox", page(at(17, 21), { nights: skipped(9, 10, 11) }), "box");
eq("seven days after the last offer: bedtime is offered once more", page(at(18, 21), { nights: skipped(9, 10, 11) }), "bedtime");
eq("skipped again, the wait starts again", page(at(19, 21), { nights: skipped(9, 10, 11, 18) }), "box");
eq("tonight's own entry is not counted against tonight", page(at(11, 21), { nights: skipped(9, 10, 11) }), "bedtime");
ok("resting needs three offers", !A.bedtimeResting(skipped(10, 11), key(12)));

/* ── the one streak ── */
const days = new Set([key(5), key(6), key(7), key(9), key(10), key(11)]);
eq("three in a row ending today", A.streakRun(days, key(11)), 3);
eq("today not counted: nothing", A.streakRun(days, key(12)), 0);
eq("a gap ends the run", A.streakRun(days, key(7)), 3);
const dots = A.streakDots(days, key(11));
eq("seven dots, tonight last", [dots.length, dots[6].key, dots[6].tonight, dots[0].key], [7, key(11), true, key(5)]);
eq("the dots that are on", dots.map((d) => (d.on ? 1 : 0)).join(""), "1110111");
eq("each dot knows its weekday (the 11th is a Wednesday)", [dots[6].weekday, dots[3].weekday], [3, 0]);

/* ── the reading timer ── */
let ms: Record<string, number> = {};
ms = A.addDwell(ms, "a", 4000);
ms = A.addDwell(ms, "a", 3000);
eq("dwell adds up", ms, { a: 7000 });
eq("a letter's time is capped at five minutes", A.addDwell({ a: 290000 }, "a", 60000), { a: A.DWELL_CAP_MS });
const capped = { a: A.DWELL_CAP_MS };
ok("at the cap nothing changes (the same object)", A.addDwell(capped, "a", 5000) === capped);
ok("no id, or no time: the same object", A.addDwell(ms, "", 5000) === ms && A.addDwell(ms, "a", 0) === ms);
eq("forty words take ten seconds", A.readMs(Array.from({ length: 40 }, () => "word").join(" ")), 10000);
eq("sixteen kana take two seconds", A.readMs("あ".repeat(16)), 2000);
eq("mixed text counts both", A.readMs("今日は " + "tea ".repeat(4)), 375 + 1000);
ok("19 seconds is not staying", !A.lingered(1000, 19000));
ok("20 seconds on a short letter is", A.lingered(1000, 20000));
ok("a long letter needs twice its reading time", !A.lingered(15000, 25000) && A.lingered(15000, 30000));

/* ── the opening ── */
eq("the first sentence", A.opening("I still set two cups out. Every morning, before I remember."), "I still set two cups out.");
eq("a short first sentence takes the second with it", A.opening("Hi. I almost called, and made tea instead. Then I slept."), "Hi. I almost called, and made tea instead.");
eq("one short sentence alone is the whole letter", A.opening("Hi."), "Hi.");
eq("a question mark ends it", A.opening("Do you ever keep a list of streets? I do."), "Do you ever keep a list of streets?");
eq("a line break ends it", A.opening("The bakery was still open at nine\nand I bought the last roll."), "The bakery was still open at nine");
eq("a closing quote stays with its sentence", A.opening("“I’m fine, honestly, fine.” That is what I said."), "“I’m fine, honestly, fine.”");
eq("a decimal point is not an end", A.opening("It cost 3.50 and I paid without looking. Then left."), "It cost 3.50 and I paid without looking.");
eq("Japanese full stop", A.opening("昨日、十年ぶりに母に手紙を書いた気がします。返事はまだです。"), "昨日、十年ぶりに母に手紙を書いた気がします。");
eq("Korean, by its period", A.opening("오늘은 버스에서 조금 노래를 불렀어요. 아무도 없었거든요."), "오늘은 버스에서 조금 노래를 불렀어요.");
eq("spaces are tidied", A.opening("  I got as far   as your street.  "), "I got as far as your street.");
eq("no sentence end: the whole short letter", A.opening("we nearly moved to lisbon once"), "we nearly moved to lisbon once");
eq("longer than the limit: no line, never a cut one", A.opening("word ".repeat(40) + "."), null);
eq("nothing but marks: no line", A.opening("… !!"), null);
eq("empty: no line", A.opening("   "), null);

/* ── heavy letters ── */
ok("a heavy topic", A.isHeavy({ stamp: "grief", body: "The garden is doing well." }));
ok("a word on the care list", A.isHeavy({ stamp: "ordinary", body: "My father died in March." }));
ok("a phrase on the list", A.isHeavy({ stamp: "ordinary", body: "Some nights I want to die a little." }));
ok("a stem with an ending", A.isHeavy({ stamp: "ordinary", body: "It was abusive, looking back." }));
ok("whole words only: a deadline is not a death", !A.isHeavy({ stamp: "ordinary", body: "The deadline moved again and I laughed." }));
ok("whole words only: total is not tot", !A.isHeavy({ stamp: "ordinary", body: "In total I walked nine streets." }));
ok("Spanish", A.isHeavy({ stamp: "ordinary", body: "Mi abuela falleció en enero." }));
ok("German", A.isHeavy({ stamp: "ordinary", body: "Seit der Beerdigung ist es still." }));
ok("Japanese", A.isHeavy({ stamp: "ordinary", body: "祖母が亡くなってから一年です。" }));
ok("Korean", A.isHeavy({ stamp: "ordinary", body: "장례를 치르고 돌아왔어요." }));
ok("an ordinary letter is not heavy", !A.isHeavy({ stamp: "missing", body: "I still set two cups out." }));
// the native editors' additions (2026-11-11), and how entries match
ok("accents don't matter: 'cancer' typed plain in Spanish", A.isHeavy({ stamp: "ordinary", body: "A mi mamá le encontraron cancer en marzo." }));
ok("a stem with any ending, Portuguese", A.isHeavy({ stamp: "ordinary", body: "Minha avó faleceu e eu ainda não chorei." }));
ok("a euphemism, Spanish", A.isHeavy({ stamp: "ordinary", body: "Hace un año perdí a mi papá." }));
ok("a compound, German: any beginning", A.isHeavy({ stamp: "ordinary", body: "Meine Tante hat Brustkrebs und lacht trotzdem." }));
ok("Indonesian with its prefix", A.isHeavy({ stamp: "ordinary", body: "Ibuku keguguran tahun lalu." }));
ok("Korean without its space", A.isHeavy({ stamp: "ordinary", body: "가끔은 죽고싶다는 생각을 해요." }));
ok("Korean with its space", A.isHeavy({ stamp: "ordinary", body: "가끔은 죽고 싶다는 생각을 해요." }));
ok("Japanese: 亡 in any form", A.isHeavy({ stamp: "ordinary", body: "去年、母を亡くしました。" }));
ok("Japanese: がん with its particle", A.isHeavy({ stamp: "ordinary", body: "父ががんで入院しています。" }));
ok("Japanese: がんばる is not がん", !A.isHeavy({ stamp: "ordinary", body: "明日もがんばるね。がんばって。" }));
ok("Japanese: full-width ＤＶ", A.isHeavy({ stamp: "ordinary", body: "ＤＶから逃げて一年です。" }));
ok("French: an ordinary letter is not heavy", !A.isHeavy({ stamp: "ordinary", body: "J'ai pris le bus vide et j'ai chanté un peu." }));
ok("Italian: 'mi sei mancata' (I missed you) is not heavy", !A.isHeavy({ stamp: "missing", body: "Mi sei mancata tutto l'inverno." }));
ok("German: an ordinary letter is not heavy", !A.isHeavy({ stamp: "ordinary", body: "Heute habe ich insgesamt neun Straßen gezählt." }));

/* ── what is noted, and the pick ── */
const L = (id: string, body: string, o: Partial<{ stamp: string; kind: "text" | "voice" }> = {}) => ({ id, stamp: "ordinary", body, created_at: "2026-11-11T09:00:00Z", ...o });
const noteOf = (l: ReturnType<typeof L>) => A.noteLetter(l, "NO.7273");
eq("a note keeps the opening, not the letter", noteOf(L("a", "I almost called. I made tea instead. Then I wrote this whole long thing about it.")).line, "I almost called.");
eq("a voice letter gives no line", noteOf(L("v", "a caption", { kind: "voice" })).line, null);
eq("a heavy letter gives no line", noteOf(L("h", "My father died in March. I set two cups out.")).line, null);
const notes: Record<string, LetterNote> = {
  a: noteOf(L("a", "I got as far as your street.")),
  b: noteOf(L("b", "Someone held the door and I thought about it all day.")),
  c: noteOf(L("c", "My father died in March.")),
  d: noteOf(L("d", "The bus was empty, so I sang a little.")),
};
eq("nothing answered, nothing stayed on: no line", A.pickLine({ notes, answered: [], dwell: { a: 6000, b: 9000 } }), null);
eq("stayed on b longest, and long enough", A.pickLine({ notes, answered: [], dwell: { a: 21000, b: 40000, d: 3000 } }), { id: "b", why: "stayed" });
eq("the one written back to comes before the one stayed on", A.pickLine({ notes, answered: ["d"], dwell: { b: 40000, d: 3000 } }), { id: "d", why: "replied" });
eq("two written back to: the one stayed on longer", A.pickLine({ notes, answered: ["a", "d"], dwell: { a: 5000, d: 9000 } }), { id: "d", why: "replied" });
eq("two written back to and no timer: the first", A.pickLine({ notes, answered: ["a", "d"], dwell: {} }), { id: "a", why: "replied" });
eq("a heavy letter written back to gives none; the stayed-on one stands", A.pickLine({ notes, answered: ["c"], dwell: { c: 90000, b: 30000 } }), { id: "b", why: "stayed" });
eq("a heavy letter stayed on longest is passed over", A.pickLine({ notes, answered: [], dwell: { c: 90000, a: 25000 } }), { id: "a", why: "stayed" });

/* ── whose turn ── */
const turn = (o: Partial<Parameters<typeof A.chooseThing>[0]>) => A.chooseThing({ page: "box", lastKind: null, factNext: 1, factCount: 60, pick: null, notes, ...o });
eq("the first ever is fact NO. 1", turn({ pick: { id: "a", why: "replied" } }), { thing: { kind: "fact", no: 1 }, factNext: 2, lastKind: "fact" });
const lineTurn = turn({ lastKind: "fact", factNext: 2, pick: { id: "a", why: "replied" } });
eq("after a fact, a line when there is a real one", [lineTurn.thing.kind, lineTurn.factNext, lineTurn.lastKind], ["line", 2, "line"]);
eq("the line carries its writer, topic and day", lineTurn.thing, { kind: "line", id: "a", text: "I got as far as your street.", who: "NO.7273", stamp: "ordinary", at: "2026-11-11T09:00:00Z", why: "replied" });
eq("after a fact with no real line: the next fact", turn({ lastKind: "fact", factNext: 2 }), { thing: { kind: "fact", no: 2 }, factNext: 3, lastKind: "fact" });
eq("after a line: a fact", turn({ lastKind: "line", factNext: 2, pick: { id: "a", why: "replied" } }).thing, { kind: "fact", no: 2 });
eq("the receipt always prints a fact", turn({ page: "receipt", lastKind: "fact", factNext: 7, pick: { id: "a", why: "replied" } }).thing, { kind: "fact", no: 7 });
eq("after the last fact they start again", turn({ lastKind: "line", factNext: 61 }), { thing: { kind: "fact", no: 1 }, factNext: 2, lastKind: "fact" });
eq("the last fact itself", turn({ lastKind: "line", factNext: 60 }), { thing: { kind: "fact", no: 60 }, factNext: 61, lastKind: "fact" });

/* ── the receipt's numbers ── */
const log = A.dayLog({ read: 15, replied: 2, notes: { ...notes, e: { stamp: "almosts", line: null, need: 2000, who: "", at: "" } }, dwell: { a: 25000, b: 40000, e: 30000, d: 3000 } });
eq("a day's log: the counts, and the time stayed by topic", log, { read: 15, replied: 2, stay: { ordinary: 65000, almosts: 30000 } });
eq("the topic stayed on longest", A.topStay(log.stay), "ordinary");
eq("no staying: none", A.topStay({}), null);
const logs = { [key(3)]: { read: 15, replied: 1, stay: {} }, [key(9)]: { read: 9, replied: 0, stay: { almosts: 50000 } }, [key(13)]: { read: 15, replied: 3, stay: { missing: 30000 } }, [key(15)]: { read: 15, replied: 2, stay: { almosts: 20000 } } };
eq("the week: only the logged days in the last seven, from the first of them", A.weekTotals(logs, key(15)), { read: 39, replied: 5, stay: "almosts", from: key(9), to: key(15), days: 3 });
eq("a week with nothing logged", A.weekTotals({}, key(15)), { read: 0, replied: 0, stay: null, from: key(15), to: key(15), days: 0 });
eq("one day's totals", A.dayTotals(logs[key(13)], key(13)), { read: 15, replied: 3, stay: "missing", from: key(13), to: key(13), days: 1 });

/* ── the record through a day ── */
const facts = (day: number, hour: number, o: Partial<{ answered: string[]; read: number; hatched: boolean }> = {}) => ({
  day: A.shiftDay(key(day), hour < 8 ? -1 : 0),
  doneAt: at(day, hour),
  createdAt: made,
  hatched: true,
  answered: [],
  read: 15,
  factCount: 60,
  ...o,
});
let s: AfterState = A.emptyAfter();
eq("an empty record", [s.factNext, s.lastKind, s.today], [1, null, null]);
s = A.turnDay(s, key(11));
s = A.withNote(s, "a", notes.a);
s = A.withNote(s, "b", notes.b);
const again = A.withNote(s, "a", { ...notes.a, line: "something else" });
ok("a letter is noted once (the same object)", again === s);
s = A.withDwell(s, "b", 40000);
s = A.withLog(s, key(11), { read: 7, replied: 0 });
eq("the day is logged as it goes, finished or not", s.days[key(11)], { read: 7, replied: 0, stay: { ordinary: 40000 } });
ok("the same counts again: the same object", A.withLog(s, key(11), { read: 7, replied: 0 }) === s);

const done1 = A.settle(s, facts(11, 15, { answered: ["a"] }));
eq("finished at 15:00 on a Wednesday: the mailbox, fact NO. 1", [done1.today?.page, done1.today?.thing, done1.today?.open], ["box", { kind: "fact", no: 1 }, false]);
eq("the day joins the finished days, once", done1.finished, [key(11)]);
eq("the log has the final counts", [done1.days[key(11)].read, done1.days[key(11)].replied], [15, 1]);
ok("settling again changes nothing (the same object)", A.settle(done1, facts(11, 16, { answered: ["a"] })) === done1);
eq("the page for today", A.pageFor(done1, key(11))?.page, "box");
eq("no page for another day", A.pageFor(done1, key(12)), null);

let marked = A.markShut(done1, true);
eq("the shutter is down", marked.today?.shut, true);
ok("down again: the same object", A.markShut(marked, true) === marked);
marked = A.markKept(marked, "lore-1");
eq("kept", marked.today?.kept, "lore-1");

const back = A.reopen(marked, key(11));
eq("the last letter brought back: the page is put away, the day isn't finished", [A.pageFor(back, key(11)), back.finished, back.today?.open], [null, [], true]);
ok("marks do nothing while it is put away", A.markShut(back, false) === back && A.markStep(back, "snack") === back);
const done2 = A.settle(back, facts(11, 21, { answered: ["a"] }));
eq("finished again in the evening: bedtime now, the same fact, nothing spent twice", [done2.today?.page, done2.today?.thing, done2.factNext, done2.today?.kept, done2.finished], ["bedtime", { kind: "fact", no: 1 }, 2, "lore-1", [key(11)]]);

let bed = A.markStep(done2, "lights");
ok("lights out before snack and pat does nothing", bed === done2);
bed = A.markStep(bed, "snack");
bed = A.markStep(bed, "lights");
eq("lights out after the snack alone does nothing", [bed.today?.fed, bed.today?.asleep], [true, false]);
bed = A.markStep(bed, "pat");
bed = A.markStep(bed, "lights");
eq("snack, pat, lights out: asleep", [bed.today?.fed, bed.today?.pat, bed.today?.asleep], [true, true, true]);
ok("asleep, nothing more changes", A.markStep(bed, "snack") === bed);
eq("tonight's bedtime as it stands", A.nightsNow(bed), [{ day: key(11), done: true }]);

// the next day: the timer and the notes go, bedtime joins the nights, a line's turn comes
let next = A.turnDay(bed, key(12));
eq("a new desk day: no page, an empty timer, last night remembered", [next.today, next.desk, next.nights], [null, { day: key(12), ms: {}, notes: {} }, [{ day: key(11), done: true }]]);
ok("the same day again: the same object", A.turnDay(next, key(12)) === next);
next = A.withNote(next, "d", notes.d);
next = A.withDwell(next, "d", 30000);
const day2 = A.settle(next, facts(12, 14));
eq("after a fact, the letter stayed on gives the line", [day2.today?.thing.kind, day2.today?.thing.kind === "line" ? day2.today.thing.text : "", day2.factNext, day2.lastKind], ["line", "The bus was empty, so I sang a little.", 2, "line"]);
const day3 = A.settle(A.turnDay(day2, key(13)), facts(13, 14));
eq("after a line, fact NO. 2", [day3.today?.thing, day3.factNext], [{ kind: "fact", no: 2 }, 3]);
eq("three days finished", day3.finished, [key(11), key(12), key(13)]);

// a skipped bedtime is remembered as skipped
const skip = A.turnDay(A.settle(A.turnDay(day3, key(14)), facts(14, 22)), key(16));
eq("bedtime shown and left: the night is kept as not done", skip.nights, [{ day: key(11), done: true }, { day: key(14), done: false }]);

// a Sunday receipt after a fact still prints a fact, and a line chosen before a reopen can't follow it there
let sun = A.turnDay(skip, key(15));
sun = A.withNote(sun, "a", notes.a);
const sunDone = A.settle(sun, facts(15, 12, { answered: ["a"] }));
eq("Sunday: the receipt prints a fact though a line was due", [sunDone.today?.page, sunDone.today?.thing.kind], ["receipt", "fact"]);
let rc = A.markReceipt(sunDone, "printed");
rc = A.markReceipt(rc, "torn");
eq("printed, then torn", rc.today?.receipt, "torn");
ok("a torn receipt doesn't go back", A.markReceipt(rc, "printed") === rc);

// finished after midnight: the desk's day is the day before
const late = A.settle(A.turnDay(A.emptyAfter(), key(11)), facts(12, 1));
eq("01:00 counts for yesterday's desk", [late.finished, late.today?.day, late.today?.page], [[key(11)], key(11), "bedtime"]);

// what the store holds, read back
const round = A.readAfter(JSON.stringify(bed));
eq("a record survives the store", round, bed);
eq("nothing stored: an empty record", A.readAfter(null), A.emptyAfter());
eq("unreadable: an empty record", A.readAfter("{not json"), A.emptyAfter());
eq("another version: an empty record", A.readAfter(JSON.stringify({ v: 9, finished: ["x"] })), A.emptyAfter());
eq("a broken page is left out, the rest stays", A.readAfter(JSON.stringify({ v: 1, finished: [key(1), 7], today: { day: key(1), page: "moon" }, factNext: 4, lastKind: "line" })), { ...A.emptyAfter(), finished: [key(1)], factNext: 4, lastKind: "line" });

// old logs are dropped when the day turns
const old = A.turnDay({ ...A.emptyAfter(), days: { [key(1)]: { read: 1, replied: 0, stay: {} }, [key(20)]: { read: 2, replied: 0, stay: {} } }, desk: { day: key(20), ms: {}, notes: {} } }, key(25));
eq("logs older than three weeks go", Object.keys(old.days), [key(20)]);

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
if (fails) process.exit(1);
