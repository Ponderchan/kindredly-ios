import { t } from "./i18n";
import { postNo } from "./format";
import type { ThreadSummary } from "./db";
import type { WhereaboutsRead } from "./whereabouts";
import { threadState } from "./thread-state";

/* THE FLIGHT LOG — the courier's own diary, one entry at a time.
   ────────────────────────────────────────────────────────────────────────
   First person, lowercase, a little proud, a little tired, counts things.
   Every line is a fixed template filled with facts already on the phone:
   the hour your last letter left, who wrote back (their name if they
   signed, else their number), how many letters passed your desk today,
   how long you were gone. Nothing is generated; when there is no fact,
   she says the neutral line for the state. The entry carries the time of
   the event it is about — a diary without a clock is not a diary. */

export type Daylight = "morning" | "day" | "evening" | "night";

export interface LogEntry {
  line: string;
  sub: string | null;
  /** when the event happened — null for "right now" lines */
  at: number | null;
}

export interface LogFacts {
  where: WhereaboutsRead;
  threads: ThreadSummary[];
  /** when your last letter or reply left */
  lastWrittenAt: string | null;
  /** letters shown on Today, today */
  seenToday: number;
  daylight: Daylight;
  now?: number;
}

const DAY = 864e5;
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const who = (th: ThreadSummary) => (th.revealed && th.otherName ? th.otherName : `No. ${postNo(th.other)}`);

export function flightLog(f: LogFacts): LogEntry {
  const now = f.now ?? Date.now();
  const last = f.lastWrittenAt ? Date.parse(f.lastWrittenAt) : NaN;
  const gapDays = Number.isNaN(last) ? null : Math.floor((now - last) / DAY);
  const night = f.daylight === "night";
  const early = !Number.isNaN(last) && new Date(last).getHours() < 7;

  /* you were gone — she counted */
  if (gapDays != null && gapDays >= 14 && f.where.state !== "bringing") {
    return { line: t("fl.gone", { n: gapDays }), sub: null, at: last };
  }

  switch (f.where.state) {
    case "unsent":
      return { line: t("fl.unsent"), sub: t("fl.unsent.sub"), at: null };

    case "bringing": {
      // the freshest letter waiting on you
      const th = f.threads.filter((x) => threadState(x)?.needsYou).sort((a, b) => b.lastAt - a.lastAt)[0];
      const name = th ? who(th) : null;
      const wasNight = th ? (new Date(th.lastAt).getHours() >= 22 || new Date(th.lastAt).getHours() < 6) : false;
      const waitingDays = th ? Math.floor((now - th.lastAt) / DAY) : 0;
      // three days on the desk and she starts nagging — kindly
      if (th && waitingDays >= 3) return { line: t("fl.back.old", { who: name ?? "", n: waitingDays }), sub: t("fl.back.old.sub"), at: th.lastAt };
      return {
        line: name ? t("fl.back", { who: name }) : t("fl.back.anon"),
        sub: wasNight ? t("fl.back.night") : t("fl.back.sub"),
        at: th?.lastAt ?? null,
      };
    }

    case "delivery": {
      const th = f.threads.filter((x) => x.lastSenderMe && x.mine > 0 && !threadState(x)?.needsYou).sort((a, b) => b.lastAt - a.lastAt)[0];
      const name = th ? who(th) : null;
      // lastAt is when YOUR reply landed (you wrote last) — how long she has sat there
      const sittingDays = th ? Math.floor((now - th.lastAt) / DAY) : 0;
      return {
        line: night ? t("fl.night.flying") : name ? t("fl.delivery", { who: name }) : t("fl.delivery.anon"),
        sub: sittingDays >= 1 ? t("fl.delivery.sub", { n: sittingDays }) : t("fl.delivery.first"),
        at: th?.lastAt ?? null,
      };
    }

    case "exploring":
      return {
        line: night ? t("fl.night.flying") : early ? t("fl.early") : Number.isNaN(last) ? t("fl.exploring.notime") : t("fl.exploring", { time: hhmm(last) }),
        sub: night ? t("fl.night.flying.sub") : t("fl.exploring.sub"),
        at: Number.isNaN(last) ? null : last,
      };

    case "home":
    default:
      if (night) return { line: t("fl.home.night"), sub: t("fl.home.night.sub"), at: null };
      return { line: f.seenToday > 0 ? t("fl.home", { n: f.seenToday }) : t("fl.home.none"), sub: t("fl.home.sub"), at: null };
  }
}

/** "2H AGO" · "JUST NOW" · "3D AGO" — the entry's own clock */
export function agoLabel(at: number | null, now = Date.now()): string {
  if (at == null) return t("fl.now");
  const m = Math.max(0, Math.round((now - at) / 60000));
  if (m < 2) return t("fl.now");
  if (m < 60) return t("fl.agoM", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t("fl.agoH", { n: h });
  return t("fl.agoD", { n: Math.floor(h / 24) }); // floors, like the lines' own day counts
}
