/* What Today's end-of-day pages say (screens/today/after-view; docs/today-after-fifteen.md): her
   lines for one letter and for many, the replies' line left out at none, the mailbox's sign, the
   small thing as a fact, as a line (in quotation marks, under its writer and topic, with nothing
   of hers added) and as sleep-talk, the receipt's rows for the day and for the week with the
   "stayed on" row only when the timer saw it and marked unshared for a photo stamp's own tag,
   the strip when she can and can't play, and bedtime's streak before and after lights out.
   Not wired to a runner; run by hand from the repo root with plain node (Node 22.18+ strips the
   types itself):
     node src/screens/today/after-view.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage), so the words are the English
   block of data/strings-after.ts itself. Every line prints ok/FAIL and the process exits non-zero
   if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

await import("../../data/strings-after.ts");
const EN = { ...((globalThis as any).__blocks[0] as Record<string, string>) };
// the app's own strings the pages reuse (data/strings.ts, strings-today3d.ts), as they read in English
Object.assign(EN, {
  "wl.replied.1": "You wrote back to one.",
  "wl.replied.N": "You wrote back to {n}.",
  "cod.wholePost": "THAT'S ALL FOR TODAY",
  "cod.nextPost": "{name} IS BACK IN",
  "win.fly": "Fly a lap with {name}",
  "pub.letter": "Write a letter",
});

const V = await import("./after-view.ts");
const A = await import("../../lib/after-fifteen-core.ts");
type AfterToday = import("../../lib/after-fifteen-core.ts").AfterToday;
type Thing = import("../../lib/after-fifteen-core.ts").Thing;

let fails = 0;
const ok = (name: string, cond: boolean, extra: unknown = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || extra === "" ? "" : "  " + JSON.stringify(extra)));
  if (!cond) fails++;
};
const eq = (name: string, got: unknown, want: unknown) => ok(name, JSON.stringify(got) === JSON.stringify(want), { got, want });

const t = (key: string, vars?: Record<string, string | number>) => {
  const s = EN[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
};
const NAMES: Record<string, string> = { almosts: "almosts", missing: "missing", "c:1": "tea" };
const fmt = {
  t,
  upper: (s: string) => s.toUpperCase(),
  clockHour: (h: number) => `${h}:00 AM`,
  stampTime: (_ms: number) => "NOV.11 · 3:19 PM",
  dayMark: (key: string) => `NOV.${Number(key.slice(8))}`,
  countdown: (u: { h: number; m: number }) => `${u.h}H ${String(u.m).padStart(2, "0")}M`,
  stampName: (id: string) => NAMES[id] ?? "",
  isOwnWords: (id: string) => id.startsWith("c:"),
  weekdayLetter: (wd: number) => "SMTWTFS"[wd],
  fact: (no: number) => ({ text: `The first stamp went on sale in 1840. Before it, the receiver paid. (${no})`, foot: "Britain · 1840" }),
};

const day = "2026-11-11"; // a Wednesday
const FACT: Thing = { kind: "fact", no: 12 };
const LINE: Thing = { kind: "line", id: "a", text: "I still set two cups out.", who: "No. 6059", stamp: "missing", at: "2026-11-11T09:00:00Z", why: "replied" };
const today = (o: Partial<AfterToday> = {}): AfterToday => ({ day, page: "box", thing: FACT, doneAt: 0, open: false, kept: null, shut: false, receipt: "idle", fed: false, pat: false, asleep: false, ...o });
const now = new Date(2026, 10, 11, 15, 20); // 16 h 40 min to 8:00
const days = new Set([day, A.shiftDay(day, -1), A.shiftDay(day, -2), A.shiftDay(day, -4)]);
const view = (o: Partial<Parameters<typeof V.buildAfterView>[0]> = {}) =>
  V.buildAfterView({ today: today(), name: "Pond", read: 15, replied: 2, canPlay: true, now, days, totals: A.dayTotals({ read: 15, replied: 2, stay: {} }, day), week: false, title: "Today", undo: "", undoHint: "Bring back the last letter", ...o }, fmt);

/* ── the mailbox ── */
const box = view().box;
eq("fifteen letters", box.line, "“that’s 15. i counted twice.”");
eq("two replies", box.sub, "You wrote back to 2.");
eq("one letter has its own words", view({ read: 1 }).box.line, "“that’s one. i counted twice.”");
eq("one reply", view({ replied: 1 }).box.sub, "You wrote back to one.");
eq("no replies: the line is left out, not printed with a zero", view({ replied: 0 }).box.sub, "");
eq("the sign", [box.eyebrow, box.closed, box.back, box.countdown], ["THAT'S ALL FOR TODAY", "Closed", "BACK AT 8:00 AM", "16H 40M"]);
eq("the small labels are in capitals", [box.hint, box.slot, box.pull, box.lift], ["PULL THE CORD →", "THE SLOT STAYS OPEN · DROP A LETTER", "PULL", "LIFT"]);
eq("the shutter follows the record", [view().box.shut, view({ today: today({ shut: true }) }).box.shut], [false, true]);
eq("the slot is 'Write a letter' to VoiceOver", box.slotA11y, "Write a letter");

/* ── the small thing ── */
const fact = view().thing;
eq("a fact: her name and its number over it", [fact.isLine, fact.tag, fact.foot], [false, "POND’S FACT · NO. 12", "BRITAIN · 1840"]);
ok("a fact is printed as written", fact.body.startsWith("The first stamp went on sale in 1840."));
eq("keep, kept, the stub", [fact.keep, fact.kept, fact.keepStub, fact.keptStub, fact.isKept], ["KEEP", "KEPT ✦", "Keep the stub", "Kept ✦", false]);
eq("kept follows the record", view({ today: today({ kept: "lore-1" }) }).thing.isKept, true);
const line = view({ today: today({ thing: LINE }) }).thing;
eq("a line: in quotation marks, under its writer and topic", [line.isLine, line.tag, line.body, line.foot], [true, "LINE OF THE DAY", "“I still set two cups out.”", "NO. 6059 · #MISSING"]);
eq("a line that came with its own marks keeps them", V.quoted("“I’m fine.”", t), "“I’m fine.”");
eq("a line with no topic to show: its writer alone", view({ today: today({ thing: { ...LINE, stamp: "c:9" } }) }).thing.foot, "NO. 6059");
eq("a line with no writer known: its topic alone", view({ today: today({ thing: { ...LINE, who: "" } }) }).thing.foot, "#MISSING");
const asleepFact = view({ today: today({ page: "bedtime", asleep: true }) }).thing;
eq("her fact asleep: pauses for full stops, between ellipses", asleepFact.body, "“…The first stamp went on sale in 1840… Before it, the receiver paid… (12)…”");
const asleepLine = view({ today: today({ page: "bedtime", asleep: true, thing: LINE }) }).thing;
eq("a line at bedtime is the line alone: nothing of hers added", asleepLine.body, "“I still set two cups out.”");
eq("sleep-talk drops the last full stop", V.sleepTalk("One. Two."), "One… Two");
eq("sleep-talk, Japanese full stops", V.sleepTalk("一つ。二つ。"), "一つ…二つ");

/* ── the receipt ── */
const rc = view({ today: today({ page: "receipt" }) }).receipt;
eq("the day's receipt: her line, the head, the time", [rc.line, rc.shop, rc.stampLine], ["“that’s 15. there’s a little extra at the bottom.”", "KINDREDLY POST", "NOV.11 · 3:19 PM · COURIER POND"]);
eq("the counts; no 'stayed on' row without the timer", rc.rows.map((r) => [r.id, r.label, r.value]), [["read", "LETTERS READ", "15"], ["replied", "WRITTEN BACK", "2"]]);
eq("when she is back", rc.delivery.map((r) => [r.label, r.value, r.strong]), [["NEXT DELIVERY", "8:00 AM", false], ["POND IS BACK IN", "16H 40M", true]]);
eq("the keys", [rc.print, rc.printing, rc.tear, rc.share, rc.phase], ["Print today’s receipt", "PRINTING…", "Tear it off", "Share my day", "idle"]);
const stayed = view({ today: today({ page: "receipt" }), totals: A.dayTotals({ read: 15, replied: 0, stay: { almosts: 40000 } }, day) }).receipt;
eq("stayed on a topic: the row, and it may be shared", stayed.rows[2], { id: "stay", label: "YOU STAYED ON", value: "#ALMOSTS", strong: false, unshared: false });
eq("nothing written back is printed as a count", stayed.rows[1].value, "0");
const ownWords = view({ today: today({ page: "receipt" }), totals: A.dayTotals({ read: 15, replied: 0, stay: { "c:1": 40000 } }, day) }).receipt;
eq("a photo stamp's own tag is shown here and left out of the picture", [ownWords.rows[2].value, ownWords.rows[2].unshared], ["#TEA", true]);
const noName = view({ today: today({ page: "receipt" }), totals: A.dayTotals({ read: 15, replied: 0, stay: { "c:9": 40000 } }, day) }).receipt;
eq("a topic with no name to show: no row", noName.rows.length, 2);
const logs = { [A.shiftDay(day, -2)]: { read: 9, replied: 1, stay: {} }, [day]: { read: 15, replied: 2, stay: {} } };
const wk = view({ today: today({ page: "receipt" }), week: true, totals: A.weekTotals(logs, day) }).receipt;
eq("the week's receipt: her line, the days it really covers, the sums", [wk.line, wk.stampLine, wk.rows[0].value, wk.rows[1].value, wk.print, wk.share], ["“that’s the week. there’s a little extra at the bottom.”", "NOV.9 – NOV.11 · COURIER POND", "24", "3", "Print this week’s receipt", "Share my week"]);
const wk1 = view({ today: today({ page: "receipt" }), week: true, totals: A.weekTotals({ [day]: logs[day] }, day) }).receipt;
eq("a week with one logged day prints that day alone", wk1.stampLine, "NOV.11 · COURIER POND");
ok("VoiceOver reads the rows and the small thing", rc.a11y.startsWith("Receipt. LETTERS READ, 15. WRITTEN BACK, 2. NEXT DELIVERY, 8:00 AM.") && rc.a11y.includes("POND’S FACT · NO. 12"));

/* ── the strip ── */
eq("she can play", view().strip, { canPlay: true, eyebrow: "POND’S OFF THE CLOCK", title: "Fly a lap with Pond", hint: "Opens Free Flight" });
eq("she can't: when she is back, and no lap", view({ canPlay: false }).strip, { canPlay: false, eyebrow: "", title: "POND IS BACK IN 16H 40M", hint: "" });

/* ── bedtime ── */
const bed = view({ today: today({ page: "bedtime" }) }).bed;
eq("her lines", [bed.sayIdle, bed.sayFed, bed.sayFull, bed.sayPat, bed.sayNeedSnack, bed.sayNeedPat], ["“that’s 15. i’m wrecked.”", "“15 letters is hungry work. thanks.”", "“i’m full. honest.”", "“you wrote back to 2. proud of you.”", "“not yet. snack first.”", "“one pat. then lights.”"]);
eq("a pat with no replies says nothing about replies", view({ today: today({ page: "bedtime" }), replied: 0 }).bed.sayPat, "“mm. right there.”");
eq("one letter, one reply", [view({ today: today({ page: "bedtime" }), read: 1 }).bed.sayIdle, view({ today: today({ page: "bedtime" }), replied: 1 }).bed.sayPat], ["“that’s one. i’m wrecked anyway.”", "“you wrote back to one. proud of you.”"]);
eq("three in a row with tonight: two before it, tonight makes three", [bed.streak, bed.streakSub, bed.streakDone, bed.streakSubDone], ["2 days in a row", "tonight makes 3", "3 days in a row", "see you at 8:00 AM"]);
eq("the dots: the last seven days, tonight last", bed.dots.map((d) => `${d.letter}${d.on ? "+" : "-"}${d.tonight ? "!" : ""}`).join(" "), "T- F- S+ S- M+ T+ W+!");
const first = view({ today: today({ page: "bedtime" }), days: new Set([day]) }).bed;
eq("the first night of a run", [first.streak, first.streakSub, first.streakDone], ["A new run", "tonight makes 1", "1 day in a row"]);
const full = view({ today: today({ page: "bedtime" }), days: new Set(Array.from({ length: 7 }, (_, i) => A.shiftDay(day, -i))) }).bed;
eq("seven with tonight: a full week", [full.streak, full.streakSub, full.streakDone, full.streakSubDone], ["6 days in a row", "tonight makes 7", "7 days in a row", "a full week"]);
const none = view({ today: today({ page: "bedtime" }), days: new Set<string>() }).bed;
eq("tonight always counts (the desk is finished), even before the record says so", [none.streakSub, none.streakDone], ["tonight makes 1", "1 day in a row"]);
eq("the steps follow the record", [view({ today: today({ page: "bedtime", fed: true, pat: true, asleep: true }) }).bed].map((b) => [b.fed, b.patted, b.asleep])[0], [true, true, true]);
eq("she is 'her'", [bed.lights.sub, bed.sleepTag], ["then she sleeps", "POND, TALKING IN HER SLEEP"]);

/* ── undo, and the title ── */
eq("no undo word, no capsule", [view().undo, view({ undo: "Undo" }).undo, view().title], ["", "Undo", "Today"]);

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
if (fails) process.exit(1);
