/* THE NETWORK, WITH AN END TO IT.
 *
 * React Native's fetch has no default timeout. Every call in this app could
 * therefore hang for as long as the OS would hold the socket — on a train,
 * in a lift, on hotel wifi that answers the handshake and nothing after it,
 * a tapped SEND showed "···" and stayed there. Nothing was broken and
 * nothing was happening, which is the worst thing an interface can say.
 *
 * Two rules come out of that:
 *   1. every request carries a deadline, and
 *   2. the deadline is short exactly where the answer is optional.
 * Wren's gate falls back to a regex on failure, so a slow model must never
 * hold a letter hostage — 3s and we use the fallback. A write to Supabase
 * has no fallback, so it gets room to finish, but still ends.
 */

/** Wren's gate: it fails open, so it is allowed almost no time. */
export const WREN_MS = 3000;
/** A write we cannot fake the result of. Generous, but finite. */
export const WRITE_MS = 20000;
/** Uploads move real bytes; a photo on 3G is slow, not stuck. */
export const UPLOAD_MS = 60000;
/** How long an action may run before the interface admits it is slow. */
export const SLOW_MS = 2200;

/** An AbortSignal that fires after `ms`, chained to an optional outer one.
    Always call cancel() — an uncancelled timer keeps a timeout alive. */
export function deadline(ms: number, outer?: AbortSignal): { signal: AbortSignal; cancel: () => void } {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error("timeout")), ms);
  const relay = () => ctl.abort(outer?.reason);
  if (outer) {
    if (outer.aborted) relay();
    else outer.addEventListener("abort", relay);
  }
  return {
    signal: ctl.signal,
    cancel: () => {
      clearTimeout(timer);
      outer?.removeEventListener("abort", relay);
    },
  };
}

/** fetch that cannot outlive `ms`. Rejects like fetch does; the abort
    surfaces as an AbortError, which `isOffline` reads as not-offline. */
export async function fetchWithin(
  input: string | URL | Request,
  init: RequestInit | undefined,
  ms: number,
): Promise<Response> {
  const d = deadline(ms, init?.signal ?? undefined);
  try {
    return await fetch(input, { ...init, signal: d.signal });
  } finally {
    d.cancel();
  }
}

/** Tell "there is no network" apart from "the network is slow" or "the
    server said no". RN raises a TypeError with this message when the
    request never reached anyone — the only signal available without adding
    a native module (and a native module means a full rebuild). */
export function isOffline(err: unknown): boolean {
  const m = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return /network request failed|failed to fetch|typeerror/i.test(m) && !/abort/i.test(m);
}


/** ONE CROSSING, AND THE SEND IS EXACTLY THAT LONG.
 *
 *  These two numbers were set independently and so disagreed: the courier
 *  took 1.5s to cross and the send finished in 340ms, so the row vanished
 *  with her a quarter of the way over. She never arrived — which reads as
 *  a bug, because it is one.
 *
 *  The fix is not to hold the send until the animation catches up; it is to
 *  make them the same length, and to pick the shortest length at which a
 *  crossing can still be read. Six hundred milliseconds is about a good
 *  page transition: fast enough that nobody feels held, slow enough to see
 *  her go. The write races this rather than waiting behind it, so on a
 *  healthy network the letter has landed before she does. */
export const SEND_BEAT_MS = 660;
