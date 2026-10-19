/* Behaviour lock for the report's door on Me → Aura (lib/report-door; Me 4a, ME4A.md §4.1).
   Not wired to a runner; run by hand from the repo root with plain node (Node 22.18+ strips
   the types):
     node src/lib/report-door.test.ts
   voice / report / wren-name pull in AsyncStorage and React, so a load hook swaps them for
   tiny stand-ins: gatherWriting returns globalThis.__pieces texts, reportGate answers
   globalThis.__gate, speakAs swaps "Wren" for the name as the real one does. Every line
   prints ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

const stub = (src: string) => ({ url: "data:text/javascript," + encodeURIComponent(src), shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "./voice") return stub("export const gatherWriting = async () => Array(globalThis.__pieces).fill('x');");
    if (specifier === "./report")
      return stub("export const reportGate = async (pieces, premium) => { globalThis.__asked = { pieces, premium }; return globalThis.__gate; };");
    if (specifier === "./wren-name")
      return stub("export const speakAs = (s, n) => (!n || n === 'Wren' ? s : s.replace(/\\bWren\\b/g, n));");
    return next(specifier, context);
  },
});

const D = await import("./report-door.ts");
type ReportDoor = import("./report-door").ReportDoor;

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};
const t = (key: string, vars?: Record<string, string | number>) =>
  vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(",")})` : key;
const fmt = { t, monthName: (iso: string) => `M[${iso}]` };
const g = globalThis as any;

/* ── the pure view ── */
const vm = (d: ReportDoor) => D.reportDoorVM(d, fmt, "Pip");

const p = vm({ state: "progress", have: 4, need: 10 });
ok("progress: words", p.title === "m4.report.title.progress" && p.sub === "m4.report.sub.progress(need=10,have=4)", p.sub);
ok("progress: goes nowhere", !p.enabled && !p.locked && p.href === null && p.hint === "");
ok("progress: never says more than it needs", vm({ state: "progress", have: 14, need: 10 }).sub === "m4.report.sub.progress(need=10,have=10)");

const r1 = vm({ state: "ready", kind: "first" });
ok("ready first: title, sub", r1.title === "m4.report.title.first" && r1.sub === "m4.report.sub.ready");
ok("ready first: opens /report", r1.enabled && !r1.locked && r1.href === "/report" && r1.hint === "m4.report.hint.open");
const r2 = vm({ state: "ready", kind: "monthly" });
ok("ready monthly: title", r2.title === "m4.report.title.month" && r2.href === "/report");

const l = vm({ state: "locked" });
ok("locked: words", l.title === "m4.report.title.locked" && l.sub === "m4.report.sub.locked");
ok("locked: gold lock, opens the paywall", l.enabled && l.locked && l.href === "/paywall?src=report_lock" && l.hint === "m4.a11y.opensFc");

const d = vm({ state: "done", nextMonth: "2026-11-01" });
ok("done: next month named", d.title === "m4.report.title.done" && d.sub === "m4.report.sub.done(month=M[2026-11-01])", d.sub);
ok("done: goes nowhere", !d.enabled && !d.locked && d.href === null && d.hint === "");
ok("every state shows", [p, r1, r2, l, d].every((x) => x.show === true));

const named = D.reportDoorVM({ state: "ready", kind: "first" }, { ...fmt, t: () => "Wren wrote it" }, "Pip");
ok("her name is spoken", named.title === "Pip wrote it");

/* ── the 1st of next month ── */
ok("next month: mid-year", D.firstOfNextMonth(new Date(2026, 9, 19)) === "2026-11-01");
ok("next month: December rolls the year", D.firstOfNextMonth(new Date(2026, 11, 31)) === "2027-01-01");
ok("next month: January", D.firstOfNextMonth(new Date(2027, 0, 1)) === "2027-02-01");

/* ── the month's name ── */
ok("month name: en", D.monthNameIn("2026-11-01", "en-US") === "November", D.monthNameIn("2026-11-01", "en-US"));
ok("month name: de", D.monthNameIn("2027-01-01", "de-DE") === "Januar", D.monthNameIn("2027-01-01", "de-DE"));
ok("month name: ja", D.monthNameIn("2026-11-01", "ja-JP") === "11月", D.monthNameIn("2026-11-01", "ja-JP"));
ok("month name: junk passes through", D.monthNameIn("soon", "en-US") === "soon");

/* ── the read: same pieces and gate as report.tsx ── */
g.__pieces = 7;
g.__gate = { state: "progress", have: 7, need: 10 };
let got = await D.readReportDoor(false, null);
ok("read: passes the piece count and premium to the gate", g.__asked.pieces === 7 && g.__asked.premium === false);
ok("read: progress comes through", got.state === "progress" && (got as any).have === 7);
g.__gate = { state: "done" };
got = await D.readReportDoor(true, "hello");
ok("read: done gains the next month", got.state === "done" && /^\d{4}-\d{2}-01$/.test((got as any).nextMonth), JSON.stringify(got));
g.__gate = { state: "locked" };
ok("read: locked", (await D.readReportDoor(false, null)).state === "locked");

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
