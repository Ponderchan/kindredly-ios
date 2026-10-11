import { DAILY_GROUPS, LOCAL_PUSH, POOL_KEYS } from "../data/local-push-copy";
import {
  PUSH_DEFAULTS,
  addable,
  auraDayFor,
  dayOf,
  dayOffBlocked,
  draw,
  emptyState,
  fillLine,
  knockIndex,
  observeLocks,
  plan,
  prefsFrom,
  settleAura,
  serverHungerDays,
  settleDayOff,
  stateFrom,
  withSwitch,
  type DayOffFacts,
  type PlanState,
  type Planned,
  type PushPrefs,
  type WorkSeen,
} from "./wren-lines";

/* Her lines, planned on the phone — the decisions, not the scheduling.
   Run: npx tsx src/lib/wren-lines.test.ts (all dates are local time). */

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };

// a seeded rng, so the bag is the same every run
const seeded = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m); // October 2026: the 11th is a Sunday
const P = (o: Partial<PushPrefs> = {}): PushPrefs => ({ ...PUSH_DEFAULTS, ...o });
const run = (now: Date, o: { prefs?: Partial<PushPrefs>; knockOn?: boolean; emptyDesk?: string | null; dayOff?: DayOffFacts; state?: PlanState; seed?: number } = {}) =>
  plan({ now, prefs: P(o.prefs), knockOn: o.knockOn ?? false, emptyDesk: o.emptyDesk ?? null, dayOff: o.dayOff, state: o.state ?? emptyState(), rng: seeded(o.seed ?? 7) });
const on = (notes: Planned[], day: string, kind?: string) => notes.filter((n) => n.day === day && (!kind || n.kind === kind));

/* ── the contract ── */
ok("defaults: server reminders on, every recording one off, her day off on", prefsFrom(undefined).hungry && prefsFrom(null).room_closing && prefsFrom({}).first_read && !prefsFrom({}).daily_line && !prefsFrom({}).morning_question && !prefsFrom({}).week_in_words && !prefsFrom({}).aura_settled && prefsFrom({}).day_off);
ok("her day off can be turned off on the account", !prefsFrom({ day_off: false }).day_off);
ok("a key set on the account wins; junk is ignored", prefsFrom({ daily_line: true, hungry: false, aura_settled: "yes" }).daily_line && !prefsFrom({ hungry: false }).hungry && !prefsFrom({ aura_settled: "yes" }).aura_settled);
ok("nothing on → nothing scheduled", run(at(12, 10)).notes.length === 0);

/* ── the day turns at local midnight ── */
ok("23:59 is still that day", dayOf(at(12, 23, 59)) === "2026-10-12");
ok("00:00 is the new day", dayOf(at(13, 0, 0)) === "2026-10-13");
ok("an ISO string from the journal reads in local time", dayOf(at(13, 2).toISOString()) === "2026-10-13" && dayOf(at(12, 23, 30).toISOString()) === "2026-10-12");

/* ── the daily line ── */
{
  const r = run(at(12, 10), { prefs: { daily_line: true } });
  const eves = r.notes.filter((n) => n.kind === "daily");
  ok("daily line: one each evening for fourteen days", eves.length === 14 && new Set(eves.map((n) => n.day)).size === 14);
  ok("daily line: at 21:00 local, one-shot calendar parts", eves.every((n) => n.at.hour === 21 && n.at.minute === 0) && eves[0].at.month === 10 && eves[0].at.day === 12);
  ok("ids are unique and well under iOS's 64", new Set(r.notes.map((n) => n.id)).size === r.notes.length && r.notes.length <= 64);
  ok("Sunday with only the daily line on still gets the daily line", on(r.notes, "2026-10-18", "daily").length === 1);
}
ok("past 21:00 → tonight is not scheduled", on(run(at(12, 21, 30), { prefs: { daily_line: true } }).notes, "2026-10-12").length === 0);
{
  const s = { ...emptyState(), notesDay: "2026-10-12" };
  const r = run(at(12, 15), { prefs: { daily_line: true }, state: s });
  ok("skip after writing: a Notes page today → no line tonight", on(r.notes, "2026-10-12").length === 0);
  ok("…and tomorrow she asks again", on(r.notes, "2026-10-13", "daily").length === 1);
}
ok("skip after writing: a letter sent today also quiets the daily line", on(run(at(12, 15), { prefs: { daily_line: true }, state: { ...emptyState(), letterDay: "2026-10-12" } }).notes, "2026-10-12").length === 0);
{
  // a page at 01:00 on the 13th is the 13th's page — that date's 21:00 stays quiet (plan #g2: midnight turn)
  const s = { ...emptyState(), notesDay: dayOf(at(13, 1)) };
  const r = run(at(13, 1, 5), { prefs: { daily_line: true }, state: s });
  ok("midnight turn: a 1 a.m. page quiets that date's evening", on(r.notes, "2026-10-13").length === 0 && on(r.notes, "2026-10-14", "daily").length === 1);
  const late = run(at(12, 23, 50), { prefs: { daily_line: true }, state: { ...emptyState(), notesDay: dayOf(at(12, 23, 40)) } });
  ok("midnight turn: an 11:40 p.m. page doesn't quiet the next evening", on(late.notes, "2026-10-13", "daily").length === 1);
}

/* ── rotation ── */
{
  let state = emptyState();
  const byDay = new Map<string, number>();
  // re-plan every few hours for 40 days, the way launches and foregrounds would
  for (let d = 0; d < 40; d++) {
    for (const h of [9, 13, 20]) {
      const now = new Date(2026, 9, 12 + d, h);
      const r = plan({ now, prefs: P({ daily_line: true }), knockOn: false, state, rng: seeded(11 + d * 3 + h) });
      for (const n of r.notes) if (n.kind === "daily") {
        if (byDay.has(n.day)) { if (byDay.get(n.day) !== n.index) ok(`a dealt line stays put on re-plan (${n.day})`, false); }
        else byDay.set(n.day, n.index);
      }
      state = r.state;
    }
  }
  const seq = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, i]) => i);
  ok("rotation: a dealt line stays put across re-plans", seq.length >= 40);
  ok("rotation: never the same line two evenings running", seq.every((x, i) => i === 0 || x !== seq[i - 1]));
  ok("rotation: never the same group two evenings running", seq.every((x, i) => i === 0 || DAILY_GROUPS[x] !== DAILY_GROUPS[seq[i - 1]]));
  ok("rotation: no line twice in the first 28 evenings (one bag)", new Set(seq.slice(0, 28)).size === 28);
}
{
  // a fresh bag never opens with the line that closed the last one
  let fine = true;
  for (let s = 1; s < 300; s++) {
    const r = draw([], 8, 3, seeded(s));
    if (r.pick === 3 || r.bag.length !== 7) fine = false;
  }
  ok("rotation: a reshuffled bag never repeats the last line first", fine);
}

/* ── one reminder a day ── */
{
  const r = run(at(10, 10), { prefs: { daily_line: true, week_in_words: true } });
  ok("Sunday: the look-back takes the evening, the daily line doesn't also come", on(r.notes, "2026-10-11").length === 1 && on(r.notes, "2026-10-11", "week").length === 1);
  ok("Saturday: the daily line as usual", on(r.notes, "2026-10-10", "daily").length === 1);
  const weeks = r.notes.filter((n) => n.kind === "week").map((n) => n.index);
  ok("look-back walks its lines in order", weeks.length === 2 && weeks[0] === 0 && weeks[1] === 1);
}
ok("Sunday: a letter doesn't count as a look-back", on(run(at(11, 10), { prefs: { week_in_words: true }, state: { ...emptyState(), letterDay: "2026-10-11" } }).notes, "2026-10-11", "week").length === 1);
ok("Sunday: a Notes page is that week's page", on(run(at(11, 10), { prefs: { week_in_words: true, daily_line: true }, state: { ...emptyState(), notesDay: "2026-10-11" } }).notes, "2026-10-11").length === 0);
{
  const s = { ...emptyState(), auraTold: [], auraPending: { keys: ["rhythm"], day: "2026-10-11" } };
  const r = run(at(11, 9), { prefs: { daily_line: true, week_in_words: true, aura_settled: true }, state: s });
  const day = on(r.notes, "2026-10-11");
  ok("aura outranks Sunday: one notification that day, the aura, at noon", day.length === 1 && day[0].kind === "aura" && day[0].at.hour === 12);
  ok("…and the look-back keeps its line for next Sunday", on(r.notes, "2026-10-18", "week")[0]?.index === 0);
  ok("an aura with its switch off is not sent", run(at(11, 9), { prefs: { daily_line: true }, state: s }).notes.every((n) => n.kind !== "aura"));
}

/* ── the morning ── */
{
  const r = run(at(12, 6), { knockOn: true });
  const k = r.notes.filter((n) => n.kind === "knock");
  ok("knock: every morning at 8 while it's on, the desk not known either way", k.length === 14 && k.every((n) => n.at.hour === 8));
  ok("knock: never the same line two mornings running", k.every((n, i) => i === 0 || n.index !== k[i - 1].index));
  ok("knock: walks all five", new Set(k.slice(0, 5).map((n) => n.index)).size === 5 && knockIndex("2026-10-12") === k[0].index);
}
ok("knock: off → no knock", run(at(12, 6), { knockOn: false }).notes.length === 0);
{
  // a desk seen empty last night (desk day the 11th) says nothing about the 12th's: it refills at eight
  const r = run(at(12, 6), { knockOn: true, emptyDesk: "2026-10-11" });
  ok("knock: yesterday's empty desk doesn't skip this morning", on(r.notes, "2026-10-12", "knock").length === 1);
  const r2 = run(at(12, 6), { knockOn: true, emptyDesk: "2026-10-12" });
  ok("knock: only a morning whose own desk is known empty is skipped", on(r2.notes, "2026-10-12").length === 0 && on(r2.notes, "2026-10-13", "knock").length === 1);
  const r3 = run(at(12, 6), { knockOn: true, emptyDesk: "2026-10-12", prefs: { morning_question: true } });
  ok("knock: the morning question still comes on a known-empty morning", on(r3.notes, "2026-10-12", "morning").length === 1);
}
{
  const r = run(at(12, 6), { knockOn: true, prefs: { morning_question: true } });
  ok("morning question merges into the knock: one notification at 8, never two", on(r.notes, "2026-10-12").length === 1 && on(r.notes, "2026-10-12")[0].kind === "morning");
  const r2 = run(at(12, 6), { knockOn: false, prefs: { morning_question: true }, state: { ...emptyState(), notesDay: "2026-10-12" } });
  ok("morning question alone at 8 with the knock off, and writing doesn't silence it", on(r2.notes, "2026-10-12", "morning").length === 1 && on(r2.notes, "2026-10-12", "morning")[0].at.hour === 8);
  ok("the morning question doesn't use the evening's slot", run(at(12, 6), { prefs: { morning_question: true, daily_line: true } }).notes.filter((n) => n.day === "2026-10-12").length === 2);
}

/* ── the aura ── */
ok("aura moment: before 11:30 → today at noon", auraDayFor(at(12, 11, 0)) === "2026-10-12");
ok("aura moment: under 30 minutes away → tomorrow", auraDayFor(at(12, 11, 45)) === "2026-10-13");
{
  const base = observeLocks(emptyState(), ["rhythm", "warmth"], { viewing: false, on: true, now: at(12, 9) });
  ok("first look only takes a baseline — old lines are not news", base.auraPending === null && base.auraTold?.length === 2);
  const fresh = observeLocks(base, ["rhythm", "warmth", "humor"], { viewing: false, on: true, now: at(12, 22) });
  ok("a newly settled line is pending for tomorrow noon", fresh.auraPending?.keys.join() === "humor" && fresh.auraPending.day === "2026-10-13");
  const twice = observeLocks(fresh, ["rhythm", "warmth", "humor", "edge"], { viewing: false, on: true, now: at(12, 23) });
  ok("two lines settling before it goes → still one notification, same day", twice.auraPending?.keys.length === 2 && twice.auraPending.day === "2026-10-13");
  const looked = observeLocks(twice, ["rhythm", "warmth", "humor", "edge"], { viewing: true, on: true, now: at(13, 9) });
  ok("opening the aura page withdraws it and tells all", looked.auraPending === null && looked.auraTold?.includes("edge") === true);
  const off = observeLocks(base, ["rhythm", "warmth", "humor"], { viewing: false, on: false, now: at(12, 22) });
  ok("switch off: the line is told quietly, never saved up", off.auraPending === null && off.auraTold?.includes("humor") === true);
  const again = observeLocks(looked, ["rhythm", "warmth", "humor", "edge"], { viewing: false, on: true, now: at(14, 9) });
  ok("each line is told once in a lifetime", again.auraPending === null);
  ok("settle: after its noon, a pending line counts as told", settleAura(fresh, { on: true, now: at(13, 12, 1) }).auraPending === null && settleAura(fresh, { on: true, now: at(13, 11) }).auraPending !== null);
}

{
  /* the aura keeps its day after its noon: a line settles Monday 22:00, goes
     out Tuesday 12:00, and a re-plan that afternoon (a foreground, a letter,
     the aura notification itself being tapped) must not add the 21:00 line */
  const prefs = { daily_line: true, week_in_words: true, aura_settled: true };
  const base = observeLocks(emptyState(), ["rhythm"], { viewing: false, on: true, now: at(12, 9) });
  const settled = observeLocks(base, ["rhythm", "humor"], { viewing: false, on: true, now: at(12, 22) });
  const mon = run(at(12, 22, 1), { prefs, state: settled });
  ok("aura day: Monday night plans only the aura for Tuesday", on(mon.notes, "2026-10-13").map((n) => n.kind).join() === "aura");
  const plain = run(at(13, 15), { prefs, state: settleAura(mon.state, { on: true, now: at(13, 15) }) });
  ok("aura day: a plain re-plan at 15:00 adds no evening line", on(plain.notes, "2026-10-13").length === 0 && on(plain.notes, "2026-10-14", "daily").length === 1);
  const tapped = observeLocks(mon.state, ["rhythm", "humor"], { viewing: true, on: true, now: at(13, 12, 5) });
  const afterTap = run(at(13, 12, 5), { prefs, state: settleAura(tapped, { on: true, now: at(13, 12, 5) }) });
  ok("aura day: opening the aura from its notification at 12:05 adds no evening line", on(afterTap.notes, "2026-10-13").length === 0);
  const early = observeLocks(mon.state, ["rhythm", "humor"], { viewing: true, on: true, now: at(13, 10) });
  const afterEarly = run(at(13, 10), { prefs, state: early });
  ok("aura day: opened before its noon, it is withdrawn and the evening is free again", on(afterEarly.notes, "2026-10-13").map((n) => n.kind).join() === "daily");
  // Sunday the 18th: the aura settles Saturday night, goes Sunday noon; the look-back waits for next week
  const sat = observeLocks(base, ["rhythm", "edge"], { viewing: false, on: true, now: at(17, 22) });
  const sun = run(at(18, 14), { prefs, state: settleAura(run(at(17, 22, 1), { prefs, state: sat }).state, { on: true, now: at(18, 14) }) });
  ok("aura day: on a Sunday too, nothing else after the aura's noon", on(sun.notes, "2026-10-18").length === 0);
}

/* ── one OR the other: the daily line and the morning question ── */
{
  const a = withSwitch({ morning_question: true, hungry: false }, "daily_line", true);
  ok("turning the daily line on turns the morning question off, in the same object", a.daily_line === true && a.morning_question === false && a.hungry === false);
  const b = withSwitch({ daily_line: true }, "morning_question", true);
  ok("…and the other way round", b.morning_question === true && b.daily_line === false);
  const c = withSwitch({ daily_line: true, morning_question: false }, "daily_line", false);
  ok("turning one off leaves its partner as it was", c.daily_line === false && c.morning_question === false);
  const d = withSwitch({ morning_question: true }, "week_in_words", true);
  ok("other switches have no partner", d.morning_question === true && d.week_in_words === true);
  ok("a phone-only switch never lands on top of its partner already on", JSON.stringify(addable({ daily_line: true, aura_settled: true }, { morning_question: true })) === JSON.stringify({ aura_settled: true }));
  ok("…but a phone-only off rides along", addable({ daily_line: false }, { morning_question: true }).daily_line === false);
}

/* ── her day off ── */
{
  const NOW = at(12, 10); // Monday the 12th, 10:00
  const work = (o: Partial<WorkSeen> = {}): WorkSeen => ({ at: NOW.getTime(), egg: false, state: "home", waitingSince: null, lastWrote: at(11, 20).getTime(), ...o });
  const facts = (o: Partial<DayOffFacts> = {}): DayOffFacts => ({ best: 0, lastPlayed: null, work: work(), ...o });
  const offs = (notes: Planned[]) => notes.filter((n) => n.kind === "dayoff");

  const r = run(NOW, { dayOff: facts() });
  const o = offs(r.notes);
  ok("day off: on by default, at noon local, today when the slot is free", o.length === 1 && o[0].day === "2026-10-12" && o[0].at.hour === 12 && o[0].at.minute === 0 && o[0].id === "wl-2026-10-12-off");
  ok("day off: no best yet → the plain invite, first line", o[0].pool === "day_off_invite" && o[0].index === 0 && !o[0].vars);
  ok("day off: the plan remembers what it scheduled", r.state.offPending?.day === "2026-10-12" && r.state.offPending.pool === "day_off_invite");
  ok("day off: one at a time across the fourteen days", offs(run(at(12, 13), { dayOff: facts() }).notes).length === 1);
  ok("day off: past noon → tomorrow", offs(run(at(12, 13), { dayOff: facts() }).notes)[0]?.day === "2026-10-13");
  ok("day off: switched off → none", offs(run(NOW, { prefs: { day_off: false }, dayOff: facts() }).notes).length === 0);
  ok("day off: no facts handed in → none", offs(run(NOW).notes).length === 0);

  // the best run
  ok("day off: a best of 1 → still the invite (never \"1 gates\")", offs(run(NOW, { dayOff: facts({ best: 1 }) }).notes)[0]?.pool === "day_off_invite");
  const b = offs(run(NOW, { dayOff: facts({ best: 7 }) }).notes)[0];
  ok("day off: a best of 2 or more → the best pool, carrying {n}", b?.pool === "day_off_best" && b.vars?.n === 7);
  ok("day off: {n} filled in every language", Object.values(LOCAL_PUSH).every((L) => L.day_off_best.every((x) => fillLine(x, { n: 7 }).includes("7") && !fillLine(x, { n: 7 }).includes("{n}"))));
  ok("day off: the English line reads right", fillLine(LOCAL_PUSH.en.day_off_best[0], { n: 12 }) === "your best: 12 gates, then bonk");

  // the one slot
  ok("day off: the daily line takes every evening → no race", offs(run(NOW, { prefs: { daily_line: true }, dayOff: facts() }).notes).length === 0);
  ok("day off: …except a day already written, when the daily line stays quiet", offs(run(NOW, { prefs: { daily_line: true }, state: { ...emptyState(), notesDay: "2026-10-12" }, dayOff: facts() }).notes)[0]?.day === "2026-10-12");
  {
    const sun = run(at(11, 9), { prefs: { week_in_words: true }, dayOff: facts({ work: work({ at: at(11, 9).getTime() }) }) });
    ok("day off: the Sunday look-back keeps its Sunday, the race goes the next free day", offs(sun.notes)[0]?.day === "2026-10-12" && on(sun.notes, "2026-10-11").every((n) => n.kind !== "dayoff"));
  }
  {
    const s = { ...emptyState(), auraTold: [], auraPending: { keys: ["rhythm"], day: "2026-10-12" } };
    const a = run(NOW, { prefs: { aura_settled: true }, state: s, dayOff: facts() });
    ok("day off: an aura day is the aura's", on(a.notes, "2026-10-12").map((n) => n.kind).join() === "aura" && offs(a.notes)[0]?.day === "2026-10-13");
  }
  ok("day off: the morning knock doesn't use the slot (8:00 knock and noon race, same day)", on(run(at(12, 6), { knockOn: true, dayOff: facts() }).notes, "2026-10-12").map((n) => n.kind).sort().join() === "dayoff,knock");

  // the week
  // (hungry off here: written Sunday 20:00, the server's day7 could land on the 19th — that rule has its own tests below)
  ok("day off: a game three days ago → not until a week after it", offs(run(NOW, { prefs: { hungry: false }, dayOff: facts({ lastPlayed: "2026-10-09" }) }).notes)[0]?.day === "2026-10-16");
  ok("day off: a game today → a week from today", offs(run(NOW, { prefs: { hungry: false }, dayOff: facts({ lastPlayed: "2026-10-12" }) }).notes)[0]?.day === "2026-10-19");
  ok("day off: a race two days ago → the next a week after it", offs(run(NOW, { state: { ...emptyState(), offDay: "2026-10-10" }, dayOff: facts() }).notes)[0]?.day === "2026-10-17");

  // her work (isDayOff, as far as the phone can carry it)
  ok("day off: never seen her work → none", offs(run(NOW, { dayOff: facts({ work: null }) }).notes).length === 0);
  ok("day off: a look at her work over two weeks old → none", offs(run(NOW, { dayOff: facts({ work: work({ at: at(12, 10).getTime() - 15 * 864e5 }) }) }).notes).length === 0);
  for (const [why, w] of [["an egg", { egg: true }], ["bringing a reply home", { state: "bringing" }], ["before the first letter", { state: "unsent" }]] as const)
    ok(`day off: ${why} → none`, offs(run(NOW, { dayOff: facts({ work: work(w as Partial<WorkSeen>) }) }).notes).length === 0);
  ok("day off: on a delivery (your letter out) she still breaks", offs(run(NOW, { dayOff: facts({ work: work({ state: "delivery" }) }) }).notes).length === 1);
  {
    // a letter waiting on you since Sunday 13:00: owed from Tuesday 13:00, so Monday noon is free, Tuesday noon isn't yet (47h), Wednesday is
    const w = work({ waitingSince: at(11, 13).getTime() });
    ok("day off: someone waiting on you → only before it's been two days", !dayOffBlocked("2026-10-12", w, NOW) && !dayOffBlocked("2026-10-13", w, NOW) && dayOffBlocked("2026-10-14", w, NOW));
    ok("day off: owed already → none", offs(run(at(12, 13), { dayOff: facts({ work: work({ waitingSince: at(10, 13).getTime() }) }) }).notes).length === 0);
  }
  {
    const w = work({ lastWrote: at(1, 10).getTime() }); // written on the 1st: wilting from the 15th
    ok("day off: hungry is not a reason to skip, starving is", !dayOffBlocked("2026-10-14", w, NOW) && dayOffBlocked("2026-10-15", w, NOW));
    ok("day off: starving already → none", offs(run(NOW, { dayOff: facts({ work: work({ lastWrote: at(12, 10).getTime() - 15 * 864e5 }) }) }).notes).length === 0);
  }

  // sent, settled, rotated
  {
    const pend = run(NOW, { dayOff: facts() }).state;
    ok("day off: before its noon the pending race is not yet counted", settleDayOff(pend, at(12, 11, 59)).offPending?.day === "2026-10-12");
    const sent = settleDayOff(pend, at(12, 12, 1));
    ok("day off: after its noon it went out — its day is spent, the pool moves on", sent.offPending === null && sent.offDay === "2026-10-12" && sent.offNext.invite === 1 && sent.offNext.best === 0);
    const eve = run(at(12, 15), { prefs: { daily_line: true }, state: sent, dayOff: facts() });
    ok("day off: the day it went out keeps its one slot (no evening line turned on that afternoon)", on(eve.notes, "2026-10-12").length === 0 && on(eve.notes, "2026-10-13", "daily").length === 1);
    const played = run(at(12, 11), { prefs: { hungry: false }, state: pend, dayOff: facts({ lastPlayed: "2026-10-12" }) });
    ok("day off: a game before noon withdraws today's race", offs(played.notes)[0]?.day === "2026-10-19" && played.state.offPending?.day === "2026-10-19");
    ok("day off: switched off → nothing pending, nothing counted", run(at(12, 11), { prefs: { day_off: false }, state: pend, dayOff: facts() }).state.offPending === null);
  }
  {
    // ten weeks of launches at 9 and 15: once a week at most, lines walked in order, never twice running
    let state = emptyState();
    const sentDays: string[] = [];
    const lines: number[] = [];
    for (let d = 0; d < 70; d++) {
      for (const h of [9, 15]) {
        const now = new Date(2026, 9, 12 + d, h);
        const before = state.offPending;
        state = settleDayOff(state, now);
        if (before && !state.offPending && state.offDay === before.day) { sentDays.push(before.day); lines.push(before.index); }
        state = plan({ now, prefs: P(), knockOn: false, state, dayOff: { best: 0, lastPlayed: null, work: { at: now.getTime(), egg: false, state: "home", waitingSince: null, lastWrote: now.getTime() - 864e5 } }, rng: seeded(d) }).state;
      }
    }
    const gaps = sentDays.slice(1).map((k, i) => (Date.parse(k) - Date.parse(sentDays[i])) / 864e5);
    ok("day off: about once a week over ten weeks", sentDays.length >= 9 && sentDays.length <= 10);
    ok("day off: never two within seven days", gaps.every((g) => g >= 7));
    ok("day off: the same line never twice running", lines.every((x, i) => i === 0 || x !== lines[i - 1]) && lines.slice(0, 4).join() === "0,1,2,3");
  }
  // the server's hunger push (0032: 19:00 local, after 3 and 7 days without writing) — one reminder a day across both halves
  {
    const h = (ms: number, o: Partial<PushPrefs> = {}) => [...serverHungerDays(ms, P(o))].sort().join();
    ok("server hunger: written Fri 9th 10:00 → day3 Mon 12th, day7 Fri 16th", h(at(9, 10).getTime()) === "2026-10-12,2026-10-16");
    ok("server hunger: written after 19:59 → the next evenings", h(at(9, 21).getTime()) === "2026-10-13,2026-10-17");
    ok("server hunger: written inside the 19:00 hour → both evenings around it kept", h(at(9, 19, 30).getTime()) === "2026-10-12,2026-10-13,2026-10-16,2026-10-17");
    ok("server hunger: hungry off, or the daily line on (the server skips it then), or never written → none", h(at(9, 10).getTime(), { hungry: false }) === "" && h(at(9, 10).getTime(), { daily_line: true }) === "" && serverHungerDays(null, P()).size === 0);
    const facts9 = facts({ work: work({ lastWrote: at(9, 10).getTime() }) });
    const st5 = { ...emptyState(), offDay: "2026-10-05" };
    ok("day off: not on the evening the server may say she's peckish (the reviewer's 9th → 12th case)", offs(run(NOW, { state: st5, dayOff: facts9 }).notes)[0]?.day === "2026-10-13");
    ok("day off: …but with hungry off, that day is free", offs(run(NOW, { prefs: { hungry: false }, state: st5, dayOff: facts9 }).notes)[0]?.day === "2026-10-12");
  }
  {
    // ten weeks of mornings with "A line each evening" on: the race never comes (the switch's sub says so)
    let state = emptyState();
    let races = 0;
    for (let d = 0; d < 70; d++) {
      const now = new Date(2026, 9, 12 + d, 9);
      const before = state.offPending;
      state = settleDayOff(state, now);
      if (before && !state.offPending) races++;
      state = plan({ now, prefs: P({ daily_line: true }), knockOn: true, state, dayOff: { best: 5, lastPlayed: null, work: { at: now.getTime(), egg: false, state: "home", waitingSince: null, lastWrote: now.getTime() - 864e5 } }, rng: seeded(d) }).state;
    }
    ok("day off: with the daily line on, no race in ten weeks", races === 0 && state.offPending === null);
  }
  {
    const st = stateFrom({ offNext: { invite: 2, best: "x" }, offPending: { day: "2026-10-12", pool: "day_off_best", index: 9 }, offDay: "2026-10-05" });
    ok("day off: a damaged stored state falls back field by field", st.offNext.invite === 2 && st.offNext.best === 0 && st.offPending === null && st.offDay === "2026-10-05");
    const ok2 = stateFrom({ offPending: { day: "2026-10-12", pool: "day_off_invite", index: 3 } });
    ok("day off: a sound pending race survives a reload", ok2.offPending?.index === 3);
  }
}

/* ── the copy and the state ── */
const langs = Object.keys(LOCAL_PUSH) as (keyof typeof LOCAL_PUSH)[];
ok("nine languages, every pool the same length as English", langs.length === 9 && langs.every((l) => (Object.keys(POOL_KEYS) as (keyof typeof POOL_KEYS)[]).every((p) => LOCAL_PUSH[l][p].length === POOL_KEYS[p].length && LOCAL_PUSH[l][p].every((s) => s.trim().length > 0))));
ok("approved pool sizes (28 / 8 / 5 / 4 / 5 / day off 4 + 2)", POOL_KEYS.daily_prompt.length === 28 && POOL_KEYS.morning_question.length === 8 && POOL_KEYS.week_in_words.length === 5 && POOL_KEYS.aura_settled.length === 4 && POOL_KEYS.morning_knock.length === 5 && POOL_KEYS.day_off_invite.length === 4 && POOL_KEYS.day_off_best.length === 2);
ok("day off: every best line carries {n}, no invite line does", langs.every((l) => LOCAL_PUSH[l].day_off_best.every((x) => x.includes("{n}")) && LOCAL_PUSH[l].day_off_invite.every((x) => !x.includes("{"))));
ok("a damaged stored state falls back field by field", stateFrom({ dailyBag: [1, "x", 99], weekNext: "no", auraTold: "nope" }).dailyBag.join() === "1" && stateFrom({ weekNext: "no" }).weekNext === 0 && stateFrom({ auraTold: "nope" }).auraTold === null);
{
  const st = stateFrom({ assigned: { "2026-10-12": { d: 3, m: 99, w: 1 }, "2026-10-13": { d: 28 }, "2026-10-14": { d: -1, m: 2.5 }, junk: { d: 1 }, "2026-10-15": "x" } });
  ok("a dealt line past the end of a (shortened) pool is dropped, to be dealt again", JSON.stringify(st.assigned) === JSON.stringify({ "2026-10-12": { d: 3, w: 1 } }));
  const r = run(at(13, 10), { prefs: { daily_line: true }, state: stateFrom({ assigned: { "2026-10-13": { d: 40 } } }) });
  ok("…and the plan deals that date a real line", on(r.notes, "2026-10-13", "daily")[0]?.index < POOL_KEYS.daily_prompt.length);
}
ok("old assignments are forgotten once their day has passed", Object.keys(run(at(20, 10), { prefs: { daily_line: true }, state: { ...emptyState(), assigned: { "2026-10-01": { d: 3 } } } }).state.assigned).every((k) => k >= "2026-10-20"));

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
