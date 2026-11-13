/* ONE WRITER AT A TIME, AND THE SAME ACCOUNT FROM READ TO WRITE (owner, 2026-11-13: after
   signing out and in, "meet mist 又跳出来了", Wren's room showed every post unread again and a
   kindred's ceremony played again).
   ────────────────────────────────────────────────────────────────────────
   The phone's small ledgers (lib/flags, lib/room-seen, the introductions, the notices seen…) are
   each one JSON value under one key, changed by reading it, adding to it and writing it back. Two
   such changes in flight at once both read the same old value, and the second write throws the
   first one's addition away. That happens most right after a sign-in, when every screen mounts and
   records its first things together: seen on the simulator as the account's flags holding
   "said2:kindreds" but not "plush_celebrated", written in the same moment, so "Meet Mist." came
   back on the next visit to Me.

   And the owner of a key used to be worked out twice, once for the read and once for the write
   (lib/scoped-store scoped): a change that began before a sign-in and finished after it read the
   guest's value and wrote it over the account's.

   `makeUpdater` gives each full key (key and owner, "kindredly_flags::<uid>") a queue: a change
   waits for the one before it on that key, then reads, decides and writes. The caller pins the
   owner once, before the read (scoped-store `scoped.update`). Pure: the store is passed in, so
   this runs under plain node (scoped-update-core.test.ts). */

export type KV = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

/** What a change decides from the value it read: the value to write (undefined: write nothing),
    and what to hand back to the caller. */
export type Change<T> = { next?: string; result: T };

export type Updater = <T>(fullKey: string, change: (raw: string | null) => Change<T>) => Promise<T>;

export function makeUpdater(kv: KV): Updater {
  const tails = new Map<string, Promise<unknown>>();
  return function update<T>(fullKey: string, change: (raw: string | null) => Change<T>): Promise<T> {
    const before = tails.get(fullKey) ?? Promise.resolve();
    const run = before.then(async () => {
      const raw = await kv.getItem(fullKey);
      const { next, result } = change(raw);
      if (next !== undefined && next !== raw) await kv.setItem(fullKey, next);
      return result;
    });
    // the next change on this key waits for this one, whether it worked or not
    const tail = run.catch(() => undefined);
    tails.set(fullKey, tail);
    // forget a key once its queue is empty, so the map doesn't keep every key ever written
    void tail.then(() => {
      if (tails.get(fullKey) === tail) tails.delete(fullKey);
    });
    return run;
  };
}

/** A JSON ledger's value, or `empty` when there is none or it can't be read. */
export function parseOr<T>(raw: string | null, empty: T): T {
  if (!raw) return empty;
  try {
    const v = JSON.parse(raw);
    return v === null || v === undefined ? empty : (v as T);
  } catch {
    return empty;
  }
}
