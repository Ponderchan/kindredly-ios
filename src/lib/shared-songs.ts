import type { ThreadMessage } from "./db";

/* THE SHELF THE TWO OF YOU FILLED.
   ────────────────────────────────────────────────────────────────────────
   A song posted into a scroll is gone by tomorrow — which is why leaving
   one felt like nothing. Gathered, the same messages become the one thing
   this product is actually about: evidence that you are alike, accumulated
   without either of you curating it. No new table; the songs were always
   in the thread. */

export interface SharedSong {
  url: string;
  title: string | null;
  mine: boolean;
  at: string;
}

export function sharedSongs(messages: ThreadMessage[]): SharedSong[] {
  return messages
    .filter((m) => m.kind === "song" && m.meta?.url)
    .map((m) => ({ url: m.meta!.url!, title: m.meta!.title ?? null, mine: m.mine, at: m.date }))
    .filter((s, i, all) => all.findIndex((x) => x.url === s.url) === i);
}

/* what Wren can honestly say about a shelf — evidence, never taste. She
   counts; naming what a count MEANS stays the reader's job. */
export function songNotice(songs: SharedSong[]): { line: string; evidence: string } | null {
  if (songs.length < 3) return null;
  const mine = songs.filter((s) => s.mine).length;
  const theirs = songs.length - mine;
  if (!mine || !theirs) return null;
  const late = songs.filter((s) => {
    const h = new Date(s.at).getHours();
    return h >= 23 || h < 5;
  }).length;
  return {
    line: late >= Math.ceil(songs.length / 2) ? "late" : "both",
    evidence: `${mine} · ${theirs}`,
  };
}
