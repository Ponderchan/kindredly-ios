import type { DimKey } from "../../hatch-engine";
import type { SupportedLanguage } from "../types";
import { DIMENSION_OF, STICKER_BY_TRAIT, TRAITS_OF } from "./catalog";
import type { PieceFeatures, Span, TraitId, TraitObservation } from "./types";
import { RULE_VERSION } from "./types";

/* AGGREGATE — pieces vote, hits do not.
   ────────────────────────────────────────────────────────────────────────
   Each piece answered support / contra / unknown per trait. Here the
   answers are counted ACROSS pieces: one piece is one vote however long it
   is, unknowns are neither for nor against, and a trait only graduates when
   it repeats across independent pieces on more than one day and can show
   its own evidence. The numbers below are the spec's configurable starting
   points for the English MVP — provisional until calibrated on labelled
   samples, and never spoken to the reader as accuracy. */

export const THRESHOLDS = {
  /** the current window: the most recent eligible pieces */
  window: 20,
  emerging: { supporting: 2 },
  established: { eligible: 5, days: 2, supporting: 4, evidence: 2, share: 0.65 },
  /** a dimension is "assessed and balanced" once this many pieces were eligible */
  balancedAt: 5,
  /** per-dimension minimum analysis units */
  minUnits: {
    sentence: { sentences: 20 },
    rhythm: { sentences: 20 },
    punctuation: { terminals: 20 },
    quirks: { endings: 5 },
  } as Partial<Record<DimKey, Record<string, number>>>,
} as const;

/* ── dedup: the same words are one piece, however often they were saved ── */
export function dedupPieces(feats: PieceFeatures[]): PieceFeatures[] {
  const seen = new Set<string>();
  const out: PieceFeatures[] = [];
  for (const f of feats) {
    const key = f.piece.revision;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

/** the current window: newest first, then cut */
export function currentWindow(feats: PieceFeatures[], size = THRESHOLDS.window): PieceFeatures[] {
  const dated = [...feats].sort((a, b) => (b.piece.createdAt || "").localeCompare(a.piece.createdAt || ""));
  return dated.slice(0, size);
}

function units(feats: PieceFeatures[], dim: DimKey): Record<string, number> {
  const u: Record<string, number> = {};
  u.sentences = feats.reduce((a, f) => a + f.sentences.length, 0);
  u.terminals = feats.reduce((a, f) => a + f.sentences.filter((s) => s.ending !== "none").length, 0);
  u.endings = feats.filter((f) => f.full && f.verdicts.open_ender !== undefined).length;
  const min = THRESHOLDS.minUnits[dim];
  u.meetsMin = min ? Number(Object.entries(min).every(([k, v]) => (u[k] ?? 0) >= v)) : 1;
  return u;
}

function langOf(feats: PieceFeatures[]): TraitObservation["language"] {
  const set = new Set(feats.map((f) => f.lang).filter(Boolean) as SupportedLanguage[]);
  if (!set.size) return "unknown";
  return set.size === 1 ? [...set][0] : "mixed";
}

export function aggregateObservations(window: PieceFeatures[], assessedAt: string): TraitObservation[] {
  const out: TraitObservation[] = [];
  for (const dim of Object.keys(TRAITS_OF) as DimKey[]) {
    const dimUnits = units(window, dim);
    for (const trait of TRAITS_OF[dim]) {
      const voted = window.filter((f) => f.verdicts[trait] !== undefined);
      const support = voted.filter((f) => f.verdicts[trait]!.verdict === "support");
      const contra = voted.filter((f) => f.verdicts[trait]!.verdict === "contra");
      const eligible = support.length + contra.length; // unknowns are not eligible units
      const days = new Set(support.map((f) => f.day).filter(Boolean)).size;
      const evidence: Span[] = [];
      // most recent first, at most one sentence per piece unless the rule gave two
      for (const f of [...support].sort((a, b) => (b.piece.createdAt || "").localeCompare(a.piece.createdAt || "")))
        for (const sp of f.verdicts[trait]!.spans) if (evidence.length < 6) evidence.push(sp);
      const share = eligible ? support.length / eligible : 0;
      const E = THRESHOLDS.established;
      let state: TraitObservation["state"] = "unknown";
      if (
        eligible >= E.eligible &&
        days >= E.days &&
        support.length >= E.supporting &&
        share >= E.share &&
        evidence.length >= E.evidence &&
        dimUnits.meetsMin === 1
      )
        state = "established";
      else if (support.length >= THRESHOLDS.emerging.supporting && support.length > contra.length) state = "emerging";
      else if (eligible >= THRESHOLDS.balancedAt) state = "balanced";
      out.push({
        dimension: dim,
        traitId: trait,
        stickerId: STICKER_BY_TRAIT[trait]?.id ?? null,
        state,
        language: langOf(support),
        eligiblePieceCount: eligible,
        supportingPieceCount: support.length,
        contradictingPieceCount: contra.length,
        supportingDays: days,
        metrics: { share: Math.round(share * 100) / 100, ...dimUnits },
        evidence,
        firstSeenAt: support.map((f) => f.day).filter(Boolean).sort()[0] ?? assessedAt,
        assessedAt,
        ruleVersion: RULE_VERSION,
      });
    }
  }
  return out;
}

/** a dimension is "balanced" when it was assessed and nothing leads — or two
    opposite reads both lead. Used by the resolver for the quirks/"classic"
    fallback and for the detail screen's honest "no lean" state. */
export function dimensionBalanced(obs: TraitObservation[], dim: DimKey): boolean {
  const mine = obs.filter((o) => o.dimension === dim);
  const leads = mine.filter((o) => o.state === "emerging" || o.state === "established");
  if (!leads.length) return mine.some((o) => o.eligiblePieceCount >= THRESHOLDS.balancedAt);
  const est = leads.filter((o) => o.state === "established");
  if (est.length >= 2) {
    // two established, opposite poles → no lean
    const a = STICKER_BY_TRAIT[est[0].traitId];
    const b = STICKER_BY_TRAIT[est[1].traitId];
    if (a && b && a.conflicts.includes(b.id)) return true;
  }
  return false;
}

export const dimensionOf = (t: TraitId): DimKey => DIMENSION_OF[t];
