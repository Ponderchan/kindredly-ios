/* TWO JOURNALS INTO ONE (pure; node src/lib/journal-merge.test.ts).
   The phone keeps a journal per account and one for the guest (lib/journal, the scoped store).
   Two moves put one into another, and both go through here:
   - takeGuestJournal: the guest's pages go into the account that signs in (owner, TestFlight b43,
     2026-11-13: pages written as the guest "Sol" were gone once he signed in to his own account,
     because an account that already exists adopts nothing of the guest's);
   - handOverJournal: a deleted account's pages go to the guest's journal, which stays on the phone.
   Every page of both is kept. A page with the same id in both is the first list's (the one being
   written into wins: it may have been changed there since). Pages without an id are all kept. The
   result is newest first by date, as the composer writes them; pages with no readable date sink to
   the end in the order they came. */

const idOf = (e: unknown): string | null =>
  e && typeof e === "object" && typeof (e as { id?: unknown }).id === "string" ? (e as { id: string }).id : null;

const when = (e: unknown): number => {
  const d = e && typeof e === "object" ? Date.parse(String((e as { date?: unknown }).date)) : NaN;
  return isNaN(d) ? 0 : d;
};

/** `into`'s pages and `from`'s, one per id (`into`'s copy where both have it), newest first. */
export function mergeJournals(into: readonly unknown[], from: readonly unknown[]): unknown[] {
  const seen = new Set<string>();
  const merged = [...into, ...from].filter((e) => {
    const id = idOf(e);
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  // a stable sort: equal dates keep the order above
  return merged
    .map((e, i) => ({ e, i, t: when(e) }))
    .sort((x, y) => y.t - x.t || x.i - y.i)
    .map((x) => x.e);
}

/** A stored journal's list, [] for none, or null when what is stored isn't a list (never merged over). */
export function parseJournal(raw: string | null): unknown[] | null {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
