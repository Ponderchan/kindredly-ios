import type { ReportData } from "../../lib/report";

/* THE VOICE REPORT, AS DATA (2026-10-27): Wren's night letter about how
   you write, one fact per card (app/report.tsx).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — every word comes in through
   `fmt`, so `node src/screens/report/report-model.test.ts` locks the rules.
   VoiceReportNative turns this into the Swift page (KVoiceReportView); the
   React Native page, the "report" switch's fallback, builds the same cards
   inline, in the same order and on the same conditions:

     cover   always: the eyebrow, the archetype, its chips, how many pieces
     stars   always: the sky (3 + up to 9 stars), the brightest three
     hour    only with an hour band from real journal times
     words   only with three favourite words or more
     punct   only with a mark to show
     quote   always: what Wren wrote, signed, and her picture
     end     always: the keepsake card and its two exits (Share, Done)

   The quote is set in curly quotes, the signature with an em dash, a
   mark's bar never under 6% wide — as the page draws them. */

export type ReportCardKey = "cover" | "stars" | "hour" | "words" | "punct" | "quote" | "end";

export type ReportFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** her name, as she is called */
  wren: string;
};

export type ReportMark = { mark: string; pct: number; /** the bar's width, 6…100 */ bar: number };

export type ReportView = {
  cards: ReportCardKey[];
  /** the cover's eyebrow and each card's own */
  eyebrows: Record<ReportCardKey, string>;
  archetype: string;
  chips: string[];
  /** "Written from 12 pieces of you." */
  written: string;
  /** the sky's star count: 3, and one more per piece up to 9 */
  stars: number;
  brightestTitle: string;
  /** the three brightest, joined with " · " */
  brightest: string;
  hourBand: string;
  hourLine: string;
  /** the favourite word, and the rest joined "   ·   " */
  firstWord: string;
  otherWords: string;
  wordsLine: string;
  /** the top mark, big, and every mark's bar */
  topMark: string;
  marks: ReportMark[];
  breathe: string;
  /** “quote” */
  quote: string;
  /** — Wren */
  signature: string;
  brand: string;
  share: string;
  done: string;
  close: string;
  /** what Share hands the share sheet */
  shareMessage: string;
};

/** The cards there are, in order (the React Native page's pushes). */
export function reportCardKeys(d: Pick<ReportData, "hourBand" | "words" | "punct">): ReportCardKey[] {
  const keys: ReportCardKey[] = ["cover", "stars"];
  if (d.hourBand) keys.push("hour");
  if (d.words.length >= 3) keys.push("words");
  if (d.punct.length) keys.push("punct");
  keys.push("quote", "end");
  return keys;
}

/** The sky's star count for `pieces` pieces of writing. */
export const reportStarCount = (pieces: number): number => 3 + Math.min(pieces, 9);

export function reportView(d: ReportData, fmt: ReportFormat): ReportView {
  const { t, wren } = fmt;
  return {
    cards: reportCardKeys(d),
    eyebrows: {
      cover: t("m4.rt.eyebrow"),
      stars: t("rt.sky"),
      hour: t("rt.hour"),
      words: t("rt.words"),
      punct: t("rt.marks"),
      quote: t("rt.after"),
      end: t("rt.keep"),
    },
    archetype: d.archetype,
    chips: [...d.chips],
    written: d.pieces === 1 ? t("m4.rt.writtenOne") : t("m4.rt.written", { n: d.pieces }),
    stars: reportStarCount(d.pieces),
    brightestTitle: t("m4.rt.brightest"),
    brightest: d.brightest.join(" · "),
    hourBand: d.hourBand ?? "",
    hourLine: t("m4.rt.hourLine"),
    firstWord: d.words[0] ?? "",
    otherWords: d.words.slice(1).join("   ·   "),
    wordsLine: t("m4.rt.wordsLine"),
    topMark: d.punct[0]?.mark ?? "",
    marks: d.punct.map((p) => ({ mark: p.mark, pct: p.pct, bar: Math.max(6, p.pct) })),
    breathe: t("m4.rt.breathe"),
    quote: `“${d.quote}”`,
    signature: `— ${wren}`,
    brand: t("rt.brand"),
    share: t("rt.share"),
    done: t("rt.done"),
    close: t("m4.pw.close"),
    shareMessage: t("m4.rt.share", { wren, quote: d.quote, archetype: d.archetype }),
  };
}
