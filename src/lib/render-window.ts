import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* HOW MUCH OF A LONG LIST CROSSES TO SWIFT.
   ────────────────────────────────────────────────────────────────────────
   Every prop change re-converts a SwiftUI view's whole props map, so a
   500-message room can't be sent whole (foundation, list_host_pattern d).
   TS keeps the full list — notices, the correspondent read and the
   five-letter road need all of it — and sends a window of it:

     chat   anchor 'end'    the newest 80, +80 when the top is reached,
                            at most ~240 (the 0b spike sets the number)
     notes  anchor 'start'  the first 60, +60 near the bottom

   At the cap the window SLIDES instead of growing: reaching the top of a
   full chat window moves it 80 older (dropping 80 of the newest), and
   reaching its bottom again moves it back. New items arriving at the
   anchored end are followed while the window sits at that end.

   A builder that labels rows against the full list (a day rule when the
   day changes) must label the window's first row too, or the top of the
   window has no date. */

/** Window sizing. `max` defaults to unbounded; `step` to `initial`. */
export type RenderWindowOptions = {
  /** items shown at first (and after reset) */
  initial: number;
  /** items added per grow() */
  step?: number;
  /** most items ever sent at once; at this size grow() slides the window */
  max?: number;
  /** which end the window sticks to: 'end' = newest last (chat), 'start' = first items (notes) */
  anchor: "end" | "start";
};

/** A window over [0, total): render items start..end-1. */
export type RenderWindow = {
  start: number;
  end: number;
  /** items hidden beyond the far end (older for 'end', later for 'start') — show a "more" affordance / keep the reach trigger */
  hasMore: boolean;
  /** items hidden on the anchored side (the window slid away from the newest/first) */
  hasBack: boolean;
  /** reveal `step` more toward the far end (the top of a chat, the bottom of notes); slides at `max`. Idempotent per render. */
  grow: () => void;
  /** after sliding away, move `step` back toward the anchored end. Idempotent per render. */
  back: () => void;
  /** make sure item `index` is inside the window (a quote jump), growing or sliding as needed */
  include: (index: number) => void;
  /** back to `initial` items at the anchored end (an own send, a fresh open) */
  reset: () => void;
};

/** The window's state: how many items, and how far it has slid from the anchored end. */
export type WindowState = { size: number; offset: number };

/** Pure: the [start, end) a state means for `total` items. */
export function windowRange(total: number, s: WindowState, anchor: "end" | "start"): { start: number; end: number } {
  const n = Math.max(0, Math.floor(total));
  const size = Math.max(0, Math.min(n, Math.floor(s.size)));
  const offset = Math.max(0, Math.min(n - size, Math.floor(s.offset)));
  return anchor === "end" ? { start: n - offset - size, end: n - offset } : { start: offset, end: offset + size };
}

/** Pure: the state after a grow(). */
export function windowGrow(total: number, s: WindowState, o: RenderWindowOptions): WindowState {
  const step = o.step ?? o.initial;
  const max = o.max ?? Infinity;
  const size = Math.min(s.size, total);
  if (size + s.offset >= total) return s; // nothing further to show
  if (size < max) return { size: Math.min(max, size + step), offset: s.offset };
  return { size, offset: Math.min(total - size, s.offset + step) };
}

/** Pure: the state after a back(). */
export function windowBack(_total: number, s: WindowState, o: RenderWindowOptions): WindowState {
  if (s.offset <= 0) return s;
  return { size: s.size, offset: Math.max(0, s.offset - (o.step ?? o.initial)) };
}

/** Pure: the smallest change that puts `index` inside the window. */
export function windowInclude(total: number, s: WindowState, o: RenderWindowOptions, index: number): WindowState {
  const n = Math.max(0, Math.floor(total));
  if (index < 0 || index >= n) return s;
  const step = o.step ?? o.initial;
  const max = Math.max(1, o.max ?? Infinity);
  // distance of the index from the anchored end, counted in items
  const fromAnchor = o.anchor === "end" ? n - 1 - index : index;
  const { offset } = s;
  const size = Math.min(s.size, n);
  if (fromAnchor >= offset && fromAnchor < offset + size) return s;
  if (fromAnchor < offset) return { size, offset: Math.max(0, fromAnchor - Math.floor(size / 2)) }; // slid too far: centre it
  // beyond the far end: grow in steps up to max, then slide
  const need = fromAnchor - offset + 1;
  if (need <= max) return { size: Math.min(max, n, Math.max(size, Math.ceil(need / step) * step)), offset };
  const cap = Math.min(max, n);
  return { size: cap, offset: Math.min(n - cap, fromAnchor - Math.floor(cap / 2)) };
}

/** A stored window, re-read against today's total (see useRenderWindow). */
const effectiveWindow = (st: WindowState & { base: number }, n: number): WindowState => ({
  size: st.size,
  offset: st.offset > 0 ? Math.max(0, st.offset + (n - st.base)) : 0,
});

/**
 * A render window over a list of `total` items (see the header for chat/notes sizes).
 * Returns stable callbacks; `start`/`end` follow `total` (items appended at the anchored end
 * stay in view while the window is at that end).
 *
 *   const win = useRenderWindow(items.length, { initial: 80, step: 80, max: 240, anchor: "end" });
 *   const sent = useMemo(() => items.slice(win.start, win.end), [items, win.start, win.end]);
 *   // onReachTop → win.grow(); own send → win.reset()
 */
export function useRenderWindow(total: number, opts: RenderWindowOptions): RenderWindow {
  const { initial, step, max, anchor } = opts;
  const o = useMemo<RenderWindowOptions>(() => ({ initial, step, max, anchor }), [initial, step, max, anchor]);
  /* `base` is the total when the window last moved. Items that arrive at the
     anchored end after that push a slid window's offset along with them, so
     what you are reading stays put; at the anchored end (offset 0) the
     window simply follows the newest. */
  const [stored, setStored] = useState<WindowState & { base: number }>({ size: initial, offset: 0, base: total });
  const live = useRef({ stored, total });
  live.current = { stored, total };
  // one move per rendered window: a reach trigger can fire twice before the new rows land
  const busy = useRef(false);
  useEffect(() => {
    busy.current = false;
  }, [stored]);

  const move = useCallback((next: (cur: WindowState, n: number) => WindowState, dedupe: boolean) => {
    if (dedupe && busy.current) return;
    const { stored: st, total: n } = live.current;
    const cur = effectiveWindow(st, n);
    const to = next(cur, n);
    if (to.size === cur.size && to.offset === cur.offset) return;
    busy.current = true;
    const nextStored = { size: to.size, offset: to.offset, base: n };
    live.current = { stored: nextStored, total: n };
    setStored(nextStored);
  }, []);

  const grow = useCallback(() => move((cur, n) => windowGrow(n, cur, o), true), [move, o]);
  const back = useCallback(() => move((cur, n) => windowBack(n, cur, o), true), [move, o]);
  // a jump or a reset is deliberate: never dropped as a duplicate
  const include = useCallback((index: number) => move((cur, n) => windowInclude(n, cur, o, index), false), [move, o]);
  const reset = useCallback(() => move(() => ({ size: o.initial, offset: 0 }), false), [move, o]);

  const { start, end } = windowRange(total, effectiveWindow(stored, total), anchor);
  const n = Math.max(0, Math.floor(total));
  return {
    start,
    end,
    hasMore: anchor === "end" ? start > 0 : end < n,
    hasBack: anchor === "end" ? end < n : start > 0,
    grow,
    back,
    include,
    reset,
  };
}
