import { aggregateObservations, currentWindow, dedupPieces, THRESHOLDS } from "./aggregate";
import { contentHash, extractPiece } from "./extract";
import { board, buildShareSnapshot, homeThree, resolveStickers, resolveTitle } from "./resolve";
import type { Piece, PieceFeatures, PieceSource, StickerReadout, StickerState } from "./types";
import { EMPTY_STATE, RULE_VERSION } from "./types";

/* THE STICKER PIPELINE — one call, five steps, no clock inside.
   ────────────────────────────────────────────────────────────────────────
     pieces → extractFeatures → aggregateObservations → resolveStickers
            → resolveAura(title) → buildShareSnapshot
   `now` is passed in (never read from the wall) so the same pieces and the
   same saved state always give the same answer, whenever the page opens. */

export type { Piece, PieceSource, StickerReadout, StickerState, ResolvedSticker, TraitObservation, AuraTitle, ShareSnapshot, Span } from "./types";
export { EMPTY_STATE, RULE_VERSION } from "./types";
export { STICKERS, STICKER_BY_ID, PRIMARY_TRAITS, TITLE_NOUNS, TITLE_ADJECTIVES } from "./catalog";
export { THRESHOLDS } from "./aggregate";
export { contentHash } from "./extract";
export { buildShareSnapshot } from "./resolve";

export type AuraPhase = "empty" | "forming" | "shaping" | "clearing" | "formed";

/** a piece from a raw row — revision derived from the words themselves */
export function toPiece(id: string, source: PieceSource, text: string, createdAt: string | null | undefined, lang?: string | null): Piece {
  return { id, revision: contentHash(text), source, text, createdAt: createdAt || "", lang: lang ?? null };
}

/* a piece's read depends only on its words and its stamp, so it is computed
   once per revision and remembered: the Me tab, the detail screen and the
   share card all call this in a row, and the JS thread is where the taps
   live. A changed piece is a new revision and misses the cache. */
const CACHE = new Map<string, PieceFeatures>();
function extractCached(p: Piece): PieceFeatures {
  const key = `${p.id}:${p.revision}:${p.lang ?? ""}:${p.createdAt}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const f = extractPiece(p);
  if (CACHE.size >= 1200) CACHE.delete(CACHE.keys().next().value as string);
  CACHE.set(key, f);
  return f;
}

export interface ReadOptions {
  /** ISO timestamp of the read — defaults to nothing sensible on purpose */
  now: string;
  /** local hours of dated letters/replies — for the counted night share */
  hours?: number[];
}

export function readStickers(pieces: Piece[], prev: StickerState | null, opts: ReadOptions): { readout: StickerReadout; state: StickerState; phase: AuraPhase } {
  const today = opts.now.slice(0, 10);
  const state0 = prev && prev.ruleVersion === RULE_VERSION ? prev : { ...EMPTY_STATE, ruleVersion: prev?.ruleVersion ?? RULE_VERSION };

  const feats = dedupPieces(pieces.filter((p) => p.text && p.text.trim().length >= 3).map(extractCached));
  const window = currentWindow(feats);
  const observations = aggregateObservations(window, today);
  const writingDays = new Set(window.map((f) => f.day).filter(Boolean)).size;

  const hours = opts.hours ?? [];
  const nightShare = hours.length ? hours.filter((h) => h >= 22 || h < 6).length / hours.length : null;

  const { byDimension, state } = resolveStickers(observations, state0, window.length, today);
  const home = homeThree(byDimension);
  const title = resolveTitle(observations, state0.title, nightShare, hours.length);
  state.title = title;

  const established = observations.filter((o) => o.state === "established").length;
  const emerging = observations.filter((o) => o.state === "emerging").length;
  const phase: AuraPhase = !feats.length
    ? "empty"
    : established === 0
      ? "forming"
      : established <= 2
        ? "shaping"
        : window.length >= 10 && established >= 3 && title.state === "formed"
          ? "formed"
          : "clearing";

  const readout: StickerReadout = {
    ruleVersion: RULE_VERSION,
    assessedAt: today,
    windowPieces: window.length,
    writingDays,
    observations,
    byDimension,
    home,
    board: board(observations, today),
    title,
    nightShare,
  };
  void emerging;
  return { readout, state, phase };
}

export const WINDOW = THRESHOLDS.window;
export { buildShareSnapshot as shareSnapshot };
