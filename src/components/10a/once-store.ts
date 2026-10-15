/* WREN'S ONCE-LINES: THE DECISION, WITHOUT REACT (WrenSaysOnce's store).
   ────────────────────────────────────────────────────────────────────────
   One decision per line id per session, kept outside any component so the
   rules can be checked under plain node (stores.test.ts) and so every
   renderer — the React Native line, a Swift line, a screen flipped from one
   to the other by the remote switch — sees the same answer:

   - A line is decided only for a screen that is still mounted when the
     flags answer. A screen gone before then (or React's development double
     mount, whose first pass is torn down at once) decides nothing and
     spends nothing, so the line is still there for the next visit. This is
     what stops the naive version eating itself: first pass writes the flag,
     second reads it and falls silent.
   - Decided "show", the flag (said2:<id>) is spent at once, and the line
     stays for the rest of the session on every remount until tapped away.
   - The tap (dismiss) is kept here too, so no remount brings it back.
   - `enabled` is the screen's "the line can be seen now": a line asked for
     while it can't show is reported hidden, and the caller doesn't start a
     decision until it can (useWrenOnce). */

export type OnceFlags = {
  /** every flag on the phone (lib/flags getFlags) */
  read: () => Promise<Record<string, boolean>>;
  /** write one (lib/flags setFlag) */
  spend: (name: string) => Promise<void> | void;
  /** a failed read: she stays quiet, and says why in the log */
  warn?: (message: string, error: unknown) => void;
};

export type OnceStore = {
  /** for useSyncExternalStore: told when any line is decided or closed */
  subscribe: (listener: () => void) => () => void;
  /** for useSyncExternalStore: changes on every decision or close */
  version: () => number;
  /** Starts deciding `id` for a mounted screen (nothing to do if decided).
      Returns the screen's unmount: after it, the answer is ignored. */
  decide: (id: string) => () => void;
  /** whether the line shows now: decided "show", not closed, and `enabled` */
  visible: (id: string, enabled?: boolean) => boolean;
  /** closes the line for the rest of the session, everywhere */
  dismiss: (id: string) => void;
};

/** the flag a line spends: said2:<id> */
export const onceFlag = (id: string): string => `said2:${id}`;

export function createOnceStore(flags: OnceFlags): OnceStore {
  const decided = new Map<string, boolean>();
  const dismissed = new Set<string>();
  const listeners = new Set<() => void>();
  let version = 0;
  const bump = () => {
    version++;
    listeners.forEach((l) => l());
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version: () => version,
    decide(id) {
      if (decided.has(id)) return () => {};
      let alive = true;
      flags
        .read()
        .then((f) => {
          if (!alive || decided.has(id)) return;
          const should = !f[onceFlag(id)];
          decided.set(id, should);
          if (should) void flags.spend(onceFlag(id));
          bump();
        })
        .catch((e) => flags.warn?.(`flags for "${id}" weren't read; she stays quiet`, e));
      return () => {
        alive = false;
      };
    },
    visible: (id, enabled = true) => enabled && decided.get(id) === true && !dismissed.has(id),
    dismiss(id) {
      if (dismissed.has(id)) return;
      dismissed.add(id);
      bump();
    },
  };
}
