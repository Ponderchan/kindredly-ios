import { readStickers, toPiece } from "./writing-engine/stickers";
import { loadStickerState } from "./aura";
import type { ThreadMessage } from "./db";

/* WHAT WREN NOTICED ABOUT THE TWO OF YOU — for the introduction.
   ────────────────────────────────────────────────────────────────────────
   Their side of the correspondence is read with the same sticker rules
   that read yours (on this phone, from the letters they sent you — nothing
   leaves). A label you both wear is the sentence; failing that, their
   strongest one. Counted, never generated. */

export interface KindredNotice {
  /** a sticker label id both of you wear, or their strongest */
  stickerId: string;
  shared: boolean;
  /** how many of their letters carried it, out of how many read */
  supporting: number;
  eligible: number;
}

export async function noticeAboutUs(theirs: ThreadMessage[], nowIso: string): Promise<KindredNotice | null> {
  const pieces = theirs.filter((m) => m.body && m.body.trim().length >= 3).map((m, i) => toPiece(`them-${i}`, "reply", m.body, m.date || "", null));
  if (!pieces.length) return null;
  const { readout } = readStickers(pieces, null, { now: nowIso });
  const board = readout.board;
  if (!board.length) return null;
  const mine = await loadStickerState();
  const myIds = new Set(Object.values(mine?.current ?? {}).map((h) => h?.stickerId).filter(Boolean) as string[]);
  const shared = board.find((s) => myIds.has(s.stickerId));
  const pick = shared ?? board[0];
  return { stickerId: pick.stickerId, shared: !!shared, supporting: pick.supporting, eligible: pick.eligible };
}

/* WHEN THERE IS NO LABEL YET — five letters can be too few for a sticker
   to show — she says what the road itself says: how long it took, how
   many of theirs came after dark, the longest wait. Always true, always
   available. */
export interface RoadFact {
  letters: number;
  days: number;
  nightTheirs: number;
  longestWaitDays: number;
}
export function roadFact(road: ThreadMessage[]): RoadFact | null {
  const dated = road.filter((m) => m.date).map((m) => ({ ...m, t: Date.parse(m.date!) })).filter((m) => !Number.isNaN(m.t)).sort((a, b) => a.t - b.t);
  if (dated.length < 2) return null;
  const days = Math.max(1, Math.round((dated[dated.length - 1].t - dated[0].t) / 864e5));
  const nightTheirs = dated.filter((m) => !m.mine && (new Date(m.t).getHours() >= 22 || new Date(m.t).getHours() < 6)).length;
  let longest = 0;
  for (let i = 1; i < dated.length; i++) longest = Math.max(longest, dated[i].t - dated[i - 1].t);
  return { letters: road.length, days, nightTheirs, longestWaitDays: Math.round(longest / 864e5) };
}
