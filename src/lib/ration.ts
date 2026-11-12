import { deskDay } from "./day";
/* THE DAY'S RATION.
 * ────────────────────────────────────────────────────────────────────────
 * The founding spec said "matched, not a feed" and "no counter" — and both
 * held while the pool was three letters deep. At fifty-four, the newest-
 * forty query quietly became a feed with a progress counter over it, and
 * unlimited pool-replies meant a person could answer twenty strangers in a
 * sitting — at which point no single answer weighs anything. The owner's
 * words, and the rule: reply to twenty people and it means nothing.
 *
 * So the day has a shape now:
 *   · TEN letters on the desk, rotated daily — tomorrow is different (fifteen
 *     until 2026-11-12: the median reader opened four a day and only one
 *     reader-day in eleven reached fifteen, and the owner found fifteen too many)
 *   · FIVE letters in flight — see the in-flight note below; scarcity is
 *     what makes a reply a decision, and an answer is what buys the next
 *   · replies INSIDE a correspondence are never counted, ever. The paywall
 *     prints "Being heard is always free" and a conversation that a meter
 *     can cut short would make that line a lie.
 *
 * The ration applies to everyone, First Class included. It is the product's
 * character, not its paywall: selling the fast lane would be selling the
 * absence of the product.
 *
 * Client-side by intent. This shapes behaviour, it doesn't defend against
 * an attacker — abuse is the moderation stack's job (screen, report, block,
 * suspend).
 */

export const DAY_LETTERS = 10;

/** the desk's day — turns at the hour she's back, see lib/day */
export const dayKey = (): string => deskDay();

/* FNV-1a — a stable per-day shuffle, not randomness. The same reader sees
   the same ten all day (no re-roll by re-opening), and different ones
   tomorrow. Seeded with the letter id and the day only: matching, not the
   shuffle, is what personalises the desk. */
const fnv = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** Cut the fetched pool down to the day's desk: matched writers always make
    the desk (they are the product working), the rest rotate by day. */
export function rationPool<T extends { id: string; close?: number; author?: string | null }>(pool: T[]): T[] {
  const matched = pool.filter((l) => l.close != null);
  const rest = pool
    .filter((l) => l.close == null)
    .sort((a, b) => fnv(a.id + dayKey()) - fnv(b.id + dayKey()));
  /* one letter per writer on a desk (2026-11-12: some write six a day, and three of one
     person's letters side by side read as the same letter again); the first of theirs in
     this order is the one dealt */
  const writers = new Set<string>();
  const one = [...matched, ...rest].filter((l) => {
    if (!l.author) return true;
    if (writers.has(l.author)) return false;
    writers.add(l.author);
    return true;
  });
  return one.length <= DAY_LETTERS && one.length === pool.length ? pool : one.slice(0, DAY_LETTERS);
}

/* IN FLIGHT — the smarter half of the ration.
 *
 * A first draft capped new correspondences per DAY, and the owner called it
 * what it was: dumb. A daily meter limits the rate of a behaviour; what
 * actually needs limiting is the stock of unkept promises. Answering a
 * stranger is a promise to be there if they answer back — so the cap is on
 * promises outstanding, not on actions per calendar day.
 *
 * You may have FIVE letters in flight: correspondences you opened where
 * the other person has not yet written back. An answer frees the slot.
 * There is nothing to reset at midnight and nothing to game by waiting —
 * the only way to open more doors is for someone to walk through one you
 * already opened, which is to say: write the kind of reply that gets
 * answered. The mechanic rewards exactly what the product wants.
 *
 * A letter nobody answers within a week quietly stops counting — it came
 * back undelivered. Derived entirely from the threads the server already
 * returns: no local storage, nothing to desync across devices.
 */

export const MAX_IN_FLIGHT = 5;
const FLIGHT_EXPIRES_MS = 7 * 24 * 3600 * 1000;

export interface FlightThread {
  mine: number;
  theirs: number;
  gone?: boolean;
  lastAt: number;
}

/** correspondences still waiting on the other side's first word */
export function inFlight(threads: FlightThread[]): number {
  const now = Date.now();
  return threads.filter(
    (t) =>
      t.mine > 0 &&
      t.theirs === 0 &&
      !t.gone &&
      now - t.lastAt < FLIGHT_EXPIRES_MS,
  ).length;
}
