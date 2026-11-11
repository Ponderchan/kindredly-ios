import { t } from "../../lib/i18n";
import { agoLabel } from "../../lib/flight-log";
import type { ThreadSummary } from "../../lib/db";
import { drivingThread, slipRows } from "../courier/courier-model";
import type { FlightLogFacts } from "./planet-model";

/* HER FLIGHT LOG ON ME'S CARD — THE READS (docs/courier-planet.md; planet-model buildFlightLog
   words them). The run she is on is her own page's slip (screens/courier slipRows: at a door, or
   back with a reply), with the one difference the owner asked for: its times are written as how
   long ago ("2H AGO", lib/flight-log agoLabel) rather than as a date, so the log reads as kept
   up with the hour. Out with a letter nobody has answered, the log is about that letter: your
   newest one with no answer. Only two moments have a time in the data (a letter leaving, a
   reply arriving); the desks a letter has been on is a count, never a time. */

type Where = Parameters<typeof slipRows>[0]["where"];

/** A letter as screens/letters buildLetterCards has it (drafts are left out here). */
type LetterCard = { kind: string; date: string; reads: number; answers: readonly unknown[] };

export function flightLogFacts(a: {
  threads: readonly ThreadSummary[];
  where: Where;
  wren: string;
  /** a pen pal's name as every screen writes it (lib/who) */
  nameOf: (th: ThreadSummary) => string;
  /** your letters; null until they are read */
  cards: readonly LetterCard[] | null;
  /** her own line still has to be said: the Post's letter, hunger, her day off */
  say: boolean;
}): FlightLogFacts {
  const th = drivingThread(a.threads, a.where.state);
  const transit = th
    ? {
        rows: slipRows({ threads: a.threads, where: a.where, wren: a.wren, nameOf: a.nameOf }, { t, upper: (s) => s.toLocaleUpperCase(), dShort: (ms) => agoLabel(ms) }).rows,
        back: a.where.state === "bringing",
      }
    : null;
  const quiet = (a.cards ?? [])
    .filter((c) => c.kind === "letter" && c.answers.length === 0 && !!c.date)
    .sort((x, y) => y.date.localeCompare(x.date))[0];
  const at = quiet ? Date.parse(quiet.date) : NaN;
  const out = quiet && Number.isFinite(at) ? { at, reads: Math.max(0, Math.round(quiet.reads || 0)) } : null;
  return { transit, out, say: a.say };
}
