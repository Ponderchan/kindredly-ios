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

/** Wren's gate and her asides: every one of them falls back to something
    written, so none is worth waiting on. */
export const WREN_MS = 3000;

/** TRANSLATION IS NOT AN ASIDE. It has no fallback by design — a made-up
    translation would be a lie — so a deadline that fires does not degrade
    the feature, it deletes it. And it is the one Wren job a reader has
    actually asked for and is watching a spinner for, so the budget is what
    a person will wait for, not what a background task may steal. A real
    letter through a reasoning model measures around seven seconds. */
export const TRANSLATE_MS = 30000;
/** A write we cannot fake the result of. Generous, but finite. */
export const WRITE_MS = 20000;
/** Uploads move real bytes; a photo on 3G is slow, not stuck. */
export const UPLOAD_MS = 60000;
/** How long an action may run before the interface admits it is slow. */
export const SLOW_MS = 2200;

/** An AbortSignal that fires after `ms`, chained to an optional outer one.
    `release` drops the chain to the outer signal; `cancel` also disarms the
    timer. They are separate because a response is not finished when its
    headers arrive — see fetchWithin. */
export function deadline(
  ms: number,
  outer?: AbortSignal,
): { signal: AbortSignal; cancel: () => void; release: () => void } {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error("timeout")), ms);
  const relay = () => ctl.abort(outer?.reason);
  if (outer) {
    if (outer.aborted) relay();
    else outer.addEventListener("abort", relay);
  }
  const release = () => outer?.removeEventListener("abort", relay);
  return {
    signal: ctl.signal,
    release,
    cancel: () => {
      clearTimeout(timer);
      release();
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
    /* HEADERS ARE NOT THE ANSWER. fetch resolves the moment the status line
       lands, with the body still in flight — so disarming the timer here
       (which the first cut did, in a finally) left every response body
       unbounded, which is the exact hang this function exists to prevent.
       The deadline stays armed through the body; aborting a request that
       has already settled is a no-op, and the timer clears itself when it
       fires. Only the chain to the caller's signal is dropped. */
    return await fetch(input, { ...init, signal: d.signal });
  } catch (e) {
    d.cancel();
    throw e;
  } finally {
    d.release();
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
 *  make them the same length. The first cut then picked the shortest length
 *  at which a crossing could still be read — 660ms — and that was the wrong
 *  target: legible is not the same as calm. Across the width of a phone it
 *  put her peak speed past a thousand points a second, and a bird moving
 *  that fast is fleeing, not delivering. A second is the honest length of
 *  this gesture — still nobody's idea of waiting, and slow enough that the
 *  crossing reads as carrying something. The write races this rather than
 *  waiting behind it, so on a healthy network the letter has landed before
 *  she does. */
export const SEND_BEAT_MS = 1000;
