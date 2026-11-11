/* First Class by the day (lib/fc-rollout-core). Not wired to a runner; run by hand from the repo
   root with plain node:
     node src/lib/fc-rollout-core.test.ts */
import assert from "node:assert/strict";
import { FC_WINDOW_MS, accountDay, dayKey, decideFc, lastMonth, markOpened, markShown, activeDays, activeStreak, type FcFacts } from "./fc-rollout-core.ts";

const DAY = 24 * 3600 * 1000;
const t0 = new Date(2026, 9, 1, 10, 0).getTime(); // Oct 1, 10:00, local
const at = (day: number, hour = 12) => new Date(2026, 9, day, hour, 0).getTime();
const facts = (o: Partial<FcFacts>): FcFacts => ({ premium: false, createdAt: t0, now: at(1), activeDays: new Set(), threshold: false, state: {}, ...o });
const days = (from: number, to: number) => new Set(Array.from({ length: to - from + 1 }, (_, i) => dayKey(at(from + i))));

// the account's day
assert.equal(accountDay(t0, at(1, 23)), 1);
assert.equal(accountDay(t0, at(3, 0)), 3);

// days 1–2: nothing
assert.deepEqual([decideFc(facts({ now: at(1) })).form, decideFc(facts({ now: at(2) })).tab], ["none", false]);
// a threshold on day 1 brings the invite early
assert.equal(decideFc(facts({ now: at(1), threshold: true })).form, "invite");
// day 3: the invite, for 48 hours from when it was first shown
assert.equal(decideFc(facts({ now: at(3) })).form, "invite");
const shown = markShown({}, "invite", at(3));
assert.equal(decideFc(facts({ now: at(4, 11), state: shown })).form, "invite");
assert.deepEqual(decideFc(facts({ now: at(3, 12) + FC_WINDOW_MS + 1, state: shown })), { form: "tab", tab: true, day: 5, reportMonth: "2026-09", reportDays: 30 });
// opened: spent, the tab stays
assert.equal(decideFc(facts({ now: at(3, 13), state: markOpened(shown, "invite", "") })).form, "tab");

// seven days in a row: the seat (today may still be empty)
assert.equal(activeStreak(days(1, 7), at(7)), 7);
assert.equal(activeStreak(days(1, 7), at(8)), 7);
assert.equal(activeStreak(days(1, 7), at(9)), 0);
assert.equal(decideFc(facts({ now: at(7), activeDays: days(1, 7) })).form, "seat");
assert.equal(decideFc(facts({ now: at(6), activeDays: days(1, 6) })).form, "invite");
// one streak (owner, 2026-11-11): a day counts when something was written or the day's letters were finished
const mixed = activeDays([dayKey(at(1)), dayKey(at(2)), dayKey(at(5))], [dayKey(at(3)), dayKey(at(4)), dayKey(at(6)), dayKey(at(7)), dayKey(at(7))]);
assert.equal(mixed.size, 7);
assert.equal(activeStreak(mixed, at(7)), 7);
assert.equal(decideFc(facts({ now: at(7), activeDays: mixed })).form, "seat");
// with no finished days passed (the pages are off) it is the old rule: writing only
assert.equal(activeStreak(activeDays([dayKey(at(1)), dayKey(at(2)), dayKey(at(5))]), at(7)), 0);
assert.equal(decideFc(facts({ now: at(7), activeDays: activeDays([dayKey(at(5)), dayKey(at(6)), dayKey(at(7))]) })).form, "invite");
// once ever: run out, it doesn't come back with a new streak
const seatGone = markShown({}, "seat", at(7));
assert.equal(decideFc(facts({ now: at(10), activeDays: days(1, 10), state: seatGone })).form, "invite");

// day 30 on: last month's report, sealed, with the tab; spent for that month, back on the 1st
const nov = (d: number) => new Date(2026, 10, d, 12).getTime();
const r = decideFc(facts({ now: nov(2) }));
assert.deepEqual([r.form, r.tab, r.reportMonth, r.reportDays], ["report", true, "2026-10", 31]);
assert.equal(decideFc(facts({ now: nov(20), state: markOpened({}, "report", "2026-10") })).form, "invite");
assert.equal(decideFc(facts({ now: new Date(2026, 11, 1, 9).getTime(), state: { reportDone: "2026-10", inviteDone: true } })).form, "report");
assert.deepEqual(lastMonth(new Date(2026, 0, 15).getTime()), { key: "2025-12", days: 31 });

// members and unknown accounts: nothing
assert.equal(decideFc(facts({ now: nov(2), premium: true })).form, "none");
assert.equal(decideFc(facts({ now: nov(2), createdAt: null })).form, "none");
void DAY;

console.log("all passed");
