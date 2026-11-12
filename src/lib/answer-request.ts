/* A LETTER ASKED FOR BY NAME, FROM ANOTHER TAB (owner, 2026-11-12: the Kindreds tab's empty
   page, "catch a line"). The lines drifting across that page are the first lines of the letters
   on today's desk; "Write back" on one of them does not open a second composer with its own
   rules. It asks Today for that letter: Today brings it to the front of the desk and opens its
   own reply box, so the day's ration, the pouch, the guest sheet, the screen before sending and
   every outcome of a send stay in the one place that has them (screens/today/useTodayDesk).

   One request at a time, kept in memory: asked on one tab, taken by Today when it is ready
   (mounted and its day loaded). A request nobody takes is forgotten with the app. */

let pending: string | null = null;
const listeners = new Set<() => void>();

/** Ask Today for this desk letter. The caller then goes to the Today tab. */
export function requestAnswer(letterId: string): void {
  if (!letterId) return;
  pending = letterId;
  listeners.forEach((f) => f());
}

/** The request waiting, without taking it. */
export const peekAnswerRequest = (): string | null => pending;

/** Take the request (Today, once its day is loaded): it is asked for once. */
export function takeAnswerRequest(): string | null {
  const id = pending;
  pending = null;
  return id;
}

/** Hear when a request arrives (Today may already be mounted behind the tab asking). */
export function subscribeAnswerRequest(f: () => void): () => void {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}
