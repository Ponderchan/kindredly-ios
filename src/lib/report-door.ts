import { gatherWriting } from "./voice";
import { reportGate } from "./report";
import { speakAs } from "./wren-name";

/* THE REPORT'S DOOR — Me → Aura, the row under the aura card (Me 4a, O6).
   ────────────────────────────────────────────────────────────────────────
   The monthly writing report (app/report.tsx, lib/report.ts) was built and
   never given a way in, so the paywall could not honestly sell it. This is
   the way in: one row, four states, all read from the same gate report.tsx
   itself obeys (reportGate), over the same pieces of writing it reads
   (gatherWriting), so the door never promises a report the page won't open.

     progress  not enough writing for the first one yet ("10 pieces · 4 so far")
     ready     the first one (free), or this month's (First Class)
     locked    the free one is spent and there is no First Class → the paywall
     done      First Class, this month's is read; the next comes on the 1st

   readReportDoor is the async read (Me's throttled read, and again on focus:
   opening the report marks the month read). reportDoorVM is pure — words and
   where a tap goes — and is what report-door.test.ts checks. lib/report.ts's
   __DEV__ bypass stays: in a dev build the first report is always ready. */

export type ReportDoor =
  | { state: "progress"; have: number; need: number }
  | { state: "ready"; kind: "first" | "monthly" }
  | { state: "locked" }
  | { state: "done"; nextMonth: string /* ISO date of the 1st of next month */ };

export type ReportDoorVM = {
  show: true;
  title: string;
  sub: string;
  /** a tap goes somewhere (ready, locked) */
  enabled: boolean;
  /** the gold lock instead of the ruled card; a tap opens the paywall */
  locked: boolean;
  /** VoiceOver hint ("" when the row does nothing) */
  hint: string;
  /** the route a tap pushes, null when disabled */
  href: string | null;
};

export type ReportDoorFmt = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** "November" for "2026-11-01", in the reader's language */
  monthName: (iso: string) => string;
};

export const REPORT_HREF = "/report";
export const REPORT_LOCK_HREF = "/paywall?src=report_lock";

/** The 1st of the month after `now`, as "YYYY-MM-01" (local calendar, as reportGate's month is). */
export function firstOfNextMonth(now: Date = new Date()): string {
  const y = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const m = (now.getMonth() + 1) % 12;
  return `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

/** fmt.monthName's ready-made form: "November" / "noviembre" / "11月" for "2026-11-01", in
    `locale` (pass format.ts localeTag()). The ISO day is read as a LOCAL date: new Date("2026-11-01")
    is UTC midnight, which west of Greenwich is still October. */
export function monthNameIn(iso: string, locale: string): string {
  const [y, m] = iso.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return iso;
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: "long" });
}

/** Read the door's state: the same pieces and gate the report page uses. */
export async function readReportDoor(premium: boolean, firstLine: string | null): Promise<ReportDoor> {
  const pieces = (await gatherWriting(firstLine)).length;
  const g = await reportGate(pieces, premium);
  if (g.state === "done") return { state: "done", nextMonth: firstOfNextMonth() };
  return g;
}

/** The row's words and its tap, for a door state. `wren` is her name, for any line that speaks of her. */
export function reportDoorVM(d: ReportDoor, fmt: ReportDoorFmt, wren: string): ReportDoorVM {
  const { t } = fmt;
  const say = (s: string) => speakAs(s, wren);
  switch (d.state) {
    case "progress":
      return {
        show: true,
        title: say(t("m4.report.title.progress")),
        sub: say(t("m4.report.sub.progress", { need: d.need, have: Math.min(d.have, d.need) })),
        enabled: false,
        locked: false,
        hint: "",
        href: null,
      };
    case "ready":
      return {
        show: true,
        title: say(t(d.kind === "first" ? "m4.report.title.first" : "m4.report.title.month")),
        sub: say(t("m4.report.sub.ready")),
        enabled: true,
        locked: false,
        hint: t("m4.report.hint.open"),
        href: REPORT_HREF,
      };
    case "locked":
      return {
        show: true,
        title: say(t("m4.report.title.locked")),
        sub: say(t("m4.report.sub.locked")),
        enabled: true,
        locked: true,
        hint: t("m4.a11y.opensFc"),
        href: REPORT_LOCK_HREF,
      };
    case "done":
      return {
        show: true,
        title: say(t("m4.report.title.done")),
        sub: say(t("m4.report.sub.done", { month: fmt.monthName(d.nextMonth) })),
        enabled: false,
        locked: false,
        hint: "",
        href: null,
      };
  }
}
