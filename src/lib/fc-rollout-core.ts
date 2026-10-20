/* FIRST CLASS, BY THE DAY (the owner's rollout, 2026-10-20: "Me First Class Rollout", D1 / D3 /
   D7 / D30). Pure: no imports, so a node test can read it.

   Which of First Class's forms the Me page shows a reader who isn't a member:
     none    days 1–2 (and no threshold touched): First Class isn't mentioned at all
     invite  from day 3, or the first time a threshold is touched (a third photo stamp, a seventh
             pen pal): THE POST's gold-edged letter on the Courier card, for 48 hours
     seat    seven days in a row with something written (a letter or a note): the boarding pass
             over the Courier card, for 48 hours, once ever
     report  from day 30: last month's writing report, sealed, over the Courier card, each month
             (it starts again on the 1st), until it's opened
     tab     the quietest one: a gold pull-tab on the right edge, once any of the above has been
             offered (or would have been), and alongside the report card
   Priority when more than one is due: seat, then report, then invite. Opening any of them goes to
   the paywall and spends that form (its month, for the report). Letting one run out does too.
   Members see none of it.

   The owner's prompts ask for the server to send the stage; v1 works it out on the phone from
   what the app already has (sign-up date, letter and note dates, pen pals, stamps made), and keeps
   what was offered and opened per account on this phone (lib/fc-rollout). A new phone starts the
   clock of what was offered again; the dates themselves come from the account. */

export const FC_WINDOW_MS = 48 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

export type FcForm = "none" | "invite" | "seat" | "report" | "tab";

/** what was offered (first shown, epoch ms) and what was spent, per account */
export type FcRolloutState = {
  inviteShown?: number;
  inviteDone?: boolean;
  seatShown?: number;
  seatDone?: boolean;
  /** the report month ("2026-09") last spent */
  reportDone?: string;
};

export type FcFacts = {
  premium: boolean;
  /** the account's created_at, epoch ms; null when unknown (nothing shows) */
  createdAt: number | null;
  now: number;
  /** local calendar days ("2026-10-20") with a letter or a note written */
  writtenDays: ReadonlySet<string>;
  /** a threshold touched: a third photo stamp, a seventh pen pal */
  threshold: boolean;
  state: FcRolloutState;
};

export type FcDecision = {
  form: FcForm;
  /** the pull-tab shows too (always with tab and report) */
  tab: boolean;
  /** the account's day, 1 on the day it was made */
  day: number;
  /** report: last month ("2026-09"), its day count */
  reportMonth: string;
  reportDays: number;
};

/** "2026-10-20" in local time */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** the account's day number: 1 on the day it was made */
export function accountDay(createdAt: number, now: number): number {
  return Math.floor((startOfDay(now) - startOfDay(createdAt) + DAY_MS / 2) / DAY_MS) + 1;
}

/** days in a row with writing, counting back from today (or from yesterday, when today is still empty) */
export function writingStreak(days: ReadonlySet<string>, now: number): number {
  let d = new Date(startOfDay(now));
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d.getTime()))) {
    n++;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  }
  return n;
}

/** last month, as "2026-09", and how many days it had */
export function lastMonth(now: number): { key: string; days: number } {
  const d = new Date(now);
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const days = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
  return { key: `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}`, days };
}

const live = (shown: number | undefined, now: number) => shown == null || now - shown < FC_WINDOW_MS;

export function decideFc(f: FcFacts): FcDecision {
  const month = lastMonth(f.now);
  const base = { day: 0, reportMonth: month.key, reportDays: month.days };
  if (f.premium || f.createdAt == null) return { form: "none", tab: false, ...base };
  const day = accountDay(f.createdAt, f.now);
  const s = f.state;
  const open = day >= 3 || f.threshold;

  if (!s.seatDone && live(s.seatShown, f.now) && writingStreak(f.writtenDays, f.now) >= 7) {
    return { form: "seat", tab: false, ...base, day };
  }
  if (day >= 30 && s.reportDone !== month.key) {
    return { form: "report", tab: true, ...base, day };
  }
  if (open && !s.inviteDone && live(s.inviteShown, f.now)) {
    return { form: "invite", tab: false, ...base, day };
  }
  const offered = open || s.inviteShown != null || s.seatShown != null;
  return { form: offered ? "tab" : "none", tab: offered, ...base, day };
}

/** the state after a form has been put on screen: its first-shown time, once */
export function markShown(state: FcRolloutState, form: FcForm, now: number): FcRolloutState {
  if (form === "invite" && state.inviteShown == null) return { ...state, inviteShown: now };
  if (form === "seat" && state.seatShown == null) return { ...state, seatShown: now };
  return state;
}

/** the state after a form has been opened (the paywall): that form is spent */
export function markOpened(state: FcRolloutState, form: FcForm, reportMonth: string): FcRolloutState {
  if (form === "invite") return { ...state, inviteDone: true };
  if (form === "seat") return { ...state, seatDone: true };
  if (form === "report") return { ...state, reportDone: reportMonth };
  return state;
}
