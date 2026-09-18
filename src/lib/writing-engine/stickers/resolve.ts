import type { DimKey } from "../../hatch-engine";
import { dimensionBalanced, THRESHOLDS } from "./aggregate";
import { PRIMARY_TRAITS, STICKER_BY_ID, STICKER_BY_TRAIT, TITLE_ADJECTIVES, TITLE_NOUNS, TRAITS_OF } from "./catalog";
import type { AuraTitle, ResolvedSticker, ShareSnapshot, StickerState, TraitId, TraitObservation } from "./types";
import { RULE_VERSION } from "./types";

/* RESOLVE — from observations to what the reader sees.
   ────────────────────────────────────────────────────────────────────────
   Three steps, each deterministic over the same inputs:
   · a representative sticker per dimension (established beats emerging,
     stronger beats weaker, the previous holder keeps its seat until a
     challenger wins two review batches in a row);
   · the home three — established first, no two in conflict;
   · the title — noun and adjective each resting on ESTABLISHED
     observations with no established contradiction, the previous title
     kept while its basis still stands. */

const strength = (o: TraitObservation): number => o.metrics.share + Math.min(o.supportingPieceCount, 10) / 50;

function lead(obs: TraitObservation[], dim: DimKey): TraitObservation | null {
  const primary = PRIMARY_TRAITS[dim] ?? [];
  const mine = obs.filter((o) => o.dimension === dim && o.stickerId && primary.includes(o.traitId) && (o.state === "established" || o.state === "emerging"));
  if (!mine.length) return null;
  mine.sort((a, b) => Number(b.state === "established") - Number(a.state === "established") || strength(b) - strength(a));
  // two established, opposite poles → the dimension has no lean
  if (dimensionBalanced(obs, dim)) return null;
  return mine[0];
}

function toResolved(o: TraitObservation, since: string): ResolvedSticker {
  return {
    stickerId: o.stickerId!,
    traitId: o.traitId,
    dimension: o.dimension,
    state: o.state === "established" ? "established" : "emerging",
    supporting: o.supportingPieceCount,
    eligible: o.eligiblePieceCount,
    evidence: o.evidence,
    since,
  };
}

/* ── stability: the seat, the challenger, the batches ── */
export function resolveStickers(
  obs: TraitObservation[],
  prev: StickerState,
  windowPieces: number,
  today: string,
): { byDimension: Partial<Record<DimKey, ResolvedSticker>>; state: StickerState } {
  const state: StickerState = {
    ruleVersion: RULE_VERSION,
    current: { ...prev.current },
    candidates: { ...prev.candidates },
    reviewedAt: prev.reviewedAt,
    history: [...prev.history],
    title: prev.title,
  };
  // a rule change re-seats everyone honestly: no debounce across versions
  const versionChanged = prev.ruleVersion !== RULE_VERSION;
  const batch = versionChanged || windowPieces >= prev.reviewedAt + 3;
  if (batch) state.reviewedAt = windowPieces;

  const byDimension: Partial<Record<DimKey, ResolvedSticker>> = {};
  for (const dim of Object.keys(TRAITS_OF) as DimKey[]) {
    const now = lead(obs, dim);
    const held = state.current[dim];
    const heldObs = held ? obs.find((o) => o.stickerId === held.stickerId) : null;
    const heldStands = !!heldObs && (heldObs.state === "established" || heldObs.state === "emerging") && !dimensionBalanced(obs, dim);

    if (!held || versionChanged) {
      // first adoption is immediate — there is no seat to protect
      if (now) state.current[dim] = { stickerId: now.stickerId!, since: now.firstSeenAt || today };
      else delete state.current[dim];
      delete state.candidates[dim];
    } else if (!heldStands) {
      // the basis is gone: withdraw now, never wait for a batch
      state.history.push({ stickerId: held.stickerId, dimension: dim, from: held.since, to: today });
      if (now) state.current[dim] = { stickerId: now.stickerId!, since: now.firstSeenAt || today };
      else delete state.current[dim];
      delete state.candidates[dim];
    } else if (now && now.stickerId !== held.stickerId) {
      // a challenger: it must win two consecutive review batches
      if (batch) {
        const c = state.candidates[dim];
        const wins = c && c.stickerId === now.stickerId ? c.wins + 1 : 1;
        if (wins >= 2) {
          state.history.push({ stickerId: held.stickerId, dimension: dim, from: held.since, to: today });
          state.current[dim] = { stickerId: now.stickerId!, since: today };
          delete state.candidates[dim];
        } else state.candidates[dim] = { stickerId: now.stickerId!, wins };
      }
    } else {
      delete state.candidates[dim];
    }

    const seat = state.current[dim];
    if (seat) {
      const o = obs.find((x) => x.stickerId === seat.stickerId);
      if (o) byDimension[dim] = toResolved(o, seat.since);
    }
  }
  return { byDimension, state };
}

/* ── the board: every sticker that holds, seat or not ── */
export function board(obs: TraitObservation[], today: string): ResolvedSticker[] {
  return obs
    .filter((o) => o.stickerId && (o.state === "established" || o.state === "emerging"))
    .map((o) => toResolved(o, o.firstSeenAt || today))
    .sort((a, b) => Number(b.state === "established") - Number(a.state === "established") || b.supporting - a.supporting);
}

/* ── the home three ── */
export function homeThree(byDimension: Partial<Record<DimKey, ResolvedSticker>>): ResolvedSticker[] {
  const all = Object.values(byDimension).filter(Boolean) as ResolvedSticker[];
  all.sort((a, b) => Number(b.state === "established") - Number(a.state === "established") || b.supporting / Math.max(1, b.eligible) - a.supporting / Math.max(1, a.eligible));
  const out: ResolvedSticker[] = [];
  for (const s of all) {
    const def = STICKER_BY_ID[s.stickerId];
    if (out.some((o) => def.conflicts.includes(o.stickerId) || STICKER_BY_ID[o.stickerId].conflicts.includes(s.stickerId))) continue;
    out.push(s);
    if (out.length === 3) break;
  }
  return out;
}

/* ── the title ── */
export function resolveTitle(obs: TraitObservation[], prev: AuraTitle | null, nightShare: number | null, nightPieces: number): AuraTitle {
  const est = new Map<TraitId, TraitObservation>();
  for (const o of obs) if (o.state === "established") est.set(o.traitId, o);
  const has = (t: TraitId) => est.has(t);
  const best = (ids: TraitId[]) => ids.filter(has).map((t) => est.get(t)!).sort((a, b) => strength(b) - strength(a))[0] ?? null;

  // nouns that qualify now, strongest first; the previous noun keeps its seat
  // while it still qualifies
  const nouns = TITLE_NOUNS.filter((n) => n.requires.some(has) && !n.conflicts.some(has))
    .map((n) => ({ id: n.id, o: best(n.requires)!, basis: n.requires.filter(has) }))
    .sort((a, b) => strength(b.o) - strength(a.o));
  let noun = nouns[0] ?? null;
  if (prev?.noun && nouns.some((n) => n.id === prev.noun)) noun = nouns.find((n) => n.id === prev.noun)!;
  // "classic": quirks assessed with nothing leading, no other noun qualifies —
  // and the reading is far enough along that a name is due at all. An
  // absence is never the first thing said about anyone.
  if (
    !noun &&
    est.size >= 3 &&
    dimensionBalanced(obs, "quirks") &&
    !obs.some((o) => o.dimension === "quirks" && (o.state === "emerging" || o.state === "established"))
  )
    noun = { id: "classic", o: obs.find((o) => o.dimension === "quirks")!, basis: [] };

  // each axis reads its primary tier first; the secondary only speaks when
  // the primary has nothing established on either side
  const adjs: { id: string; o: TraitObservation; basis: TraitId[] }[] = [];
  for (const axis of ["temperature", "pace"] as const) {
    const onAxis = TITLE_ADJECTIVES.filter((a) => a.axis === axis);
    for (let tier = 0; tier < 2; tier++) {
      const qualified = onAxis
        .map((a) => ({ a, t: a.tiers[tier] }))
        .filter(({ t }) => t && t.requires.some(has) && !t.conflicts.some(has))
        .map(({ a, t }) => ({ id: a.id, o: best(t.requires)!, basis: t.requires.filter(has) }));
      if (qualified.length) {
        adjs.push(...qualified);
        break;
      }
      // the primary tier spoke (something established) but in contradiction → stop, no adjective from this axis
      if (onAxis.some((a) => a.tiers[tier].requires.some(has))) break;
    }
  }
  adjs.sort((a, b) => strength(b.o) - strength(a.o));
  let adj: { id: string; basis: TraitId[] } | null = adjs[0] ?? null;
  if (prev?.adjective && adjs.some((a) => a.id === prev.adjective)) adj = adjs.find((a) => a.id === prev.adjective)!;
  // counted, not read: over half of enough dated letters left at night
  if (nightShare != null && nightPieces >= 5 && nightShare > 0.5) adj = { id: "late_night", basis: [] };

  if (!noun) return { state: "none", noun: null, adjective: null, basis: [] };
  if (!adj) return { state: "partial", noun: noun.id, adjective: null, basis: noun.basis };
  return { state: "formed", noun: noun.id, adjective: adj.id, basis: [...noun.basis, ...adj.basis] };
}

/* ── the share snapshot: names only, never a private sentence ── */
export function buildShareSnapshot(title: AuraTitle, home: ResolvedSticker[], phase: string, createdAt: string): ShareSnapshot {
  return {
    ruleVersion: RULE_VERSION,
    createdAt,
    title: { ...title },
    stickerIds: home.filter((s) => s.state === "established").map((s) => s.stickerId),
    phase,
  };
}

export const windowSize = THRESHOLDS.window;
export { STICKER_BY_TRAIT };
