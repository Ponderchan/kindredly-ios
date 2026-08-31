/* The Voice report (文心 Wrapped) — Wren wraps a stretch of your writing into
   a night-sky story. The tiers, per the owner's call:
     · your FIRST report is free, once you've written enough (10 pieces)
     · after that it's a First Class thing, one per calendar month
     · sharing the end card is always free; Wren never sells mid-story
   Being heard is never gated — this is the reflective layer, not the
   connection layer. All analysis is honest local math over real text; the
   AI portrait line rides along when it's cached. */

import { scoped as AsyncStorage } from "./scoped-store";
import { loadJournal } from "./journal";
import { analyzeVoice, type VoiceRead } from "./voice";
import { fingerprint } from "./signature";

const KEY = "kindredly_voice_report"; // {firstDone: boolean, lastMonth: "2026-08"}

export const REPORT_AT = 10; // pieces of writing that earn the first report

export type ReportGate =
  | { state: "progress"; have: number; need: number } // not enough writing yet
  | { state: "ready"; kind: "first" | "monthly" } // tap to open
  | { state: "locked" } // first used, no K+ → paywall
  | { state: "done" }; // K+, this month's already read

async function loadState(): Promise<{ firstDone: boolean; lastMonth: string | null }> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { firstDone: false, lastMonth: null };
  } catch {
    return { firstDone: false, lastMonth: null };
  }
}

const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export async function reportGate(pieces: number, premium: boolean): Promise<ReportGate> {
  const s = await loadState();
  if (!s.firstDone) {
    if (pieces >= REPORT_AT || __DEV__) return { state: "ready", kind: "first" };
    return { state: "progress", have: pieces, need: REPORT_AT };
  }
  if (!premium) return { state: "locked" };
  if (s.lastMonth === monthKey()) return { state: "done" };
  return { state: "ready", kind: "monthly" };
}

export async function markReportRead(): Promise<void> {
  try {
    const s = await loadState();
    await AsyncStorage.setItem(KEY, JSON.stringify({ firstDone: true, lastMonth: monthKey() }));
    void s;
  } catch {
    /* best-effort */
  }
}

/* ── the report's raw material ── */

export interface ReportData {
  read: VoiceRead;
  units: number[];
  archetype: string; // cover title, from the born type + how the hand grew
  words: string[]; // up to 5 favourite words (latin; skipped if too few)
  punct: { mark: string; pct: number }[]; // top 3
  hourBand: string | null; // "23:00 – 02:00" style, from real journal times
  quote: string;
  pieces: number;
}

const STOP = new Set(
  "the a an and but or so of in on at to for with about as that this it its is are was were be been am i you we they he she my your our their me him her them just really very not no yes do does did have has had what when where how why can could would should will its it's im i'm dont don't didnt was".split(
    " ",
  ),
);

export async function buildReport(texts: string[], typeName: string | null, aiQuote: string | null): Promise<ReportData> {
  const read = analyzeVoice(texts);
  const all = texts.join("\n\n");
  const units = fingerprint(all).units.slice(0, 24);

  // archetype: the born type carries the name; the dims colour it
  const chipsBit = read.chips[0] || "quiet";
  const archetype = typeName ? `${typeName}, ${chipsBit}` : `A ${chipsBit} writer`;

  // favourite words — latin tokens, stopwords out, top 5 by count (min 2 uses)
  const counts = new Map<string, number>();
  for (const m of all.toLowerCase().match(/[a-zà-ɏ']{3,}/g) || []) {
    if (STOP.has(m)) continue;
    counts.set(m, (counts.get(m) || 0) + 1);
  }
  const words = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);

  // punctuation habit — share of the marks you actually use
  const marks: [string, RegExp][] = [
    [",", /[,，]/g],
    [".", /[.。]/g],
    ["…", /(\.\.\.|…)/g],
    ["?", /[?？]/g],
    ["!", /[!！]/g],
    ["—", /[—–]/g],
  ];
  const tallies = marks.map(([mark, re]) => ({ mark, n: (all.match(re) || []).length }));
  const total = Math.max(1, tallies.reduce((a, b) => a + b.n, 0));
  const punct = tallies
    .filter((t) => t.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((t) => ({ mark: t.mark, pct: Math.round((t.n / total) * 100) }));

  const hourBand = await journalHourBand();

  return { read, units, archetype, words, punct, hourBand, quote: aiQuote || read.quote, pieces: read.pieces };
}

/** your hour — real journal timestamps only (letters aren't dated locally). */
export async function journalHourBand(): Promise<string | null> {
  try {
    const journal = await loadJournal();
    const hours = journal.filter((e) => !e.id.startsWith("demo-")).map((e) => new Date(e.date).getHours());
    const pool = hours.length >= 4 ? hours : __DEV__ ? [23, 23, 0, 1, 22] : [];
    if (pool.length < 4) return null;
    const bands: [string, (h: number) => boolean][] = [
      ["05:00 – 11:00", (h) => h >= 5 && h < 11],
      ["11:00 – 17:00", (h) => h >= 11 && h < 17],
      ["17:00 – 23:00", (h) => h >= 17 && h < 23],
      ["23:00 – 05:00", (h) => h >= 23 || h < 5],
    ];
    let best = bands[0][0];
    let bn = -1;
    for (const [label, test] of bands) {
      const n = pool.filter(test).length;
      if (n > bn) {
        bn = n;
        best = label;
      }
    }
    return best;
  } catch {
    return null;
  }
}
