/* Behaviour lock for one journal page and one day of them in Swift (screens/note-page/
   note-page-model): the gallery's order (the cover first), what drifts, when the cover can change
   and its hint shows, the date line, which media show, and a day's pages oldest first — the same
   rules the React Native pages (app/journal/[id], app/journal/day/[date]) draw.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/note-page/note-page-model.test.ts
   The model imports types only, so nothing needs stubbing. */

import { canDriftPage, dateLine, dayPages, galleryOrder, pagePhotos, pageView } from "./note-page-model.ts";
import type { JournalEntry } from "../../lib/journal";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const page = (o: Partial<JournalEntry> = {}): JournalEntry => ({ id: "p1", date: "2026-10-14T21:37:00.000Z", type: "text", body: "", ...o }) as JournalEntry;

/* ── the gallery's order ── */
ok("no pictures, no order", same(galleryOrder(0, 0), []));
ok("the cover first, the rest as stored", same(galleryOrder(4, 2), [2, 0, 1, 3]));
ok("cover 0 keeps the stored order", same(galleryOrder(3, 0), [0, 1, 2]));
ok("an index past the album is the first", same(galleryOrder(3, 7), [0, 1, 2]));
ok("a negative index is the first", same(galleryOrder(3, -1), [0, 1, 2]));
ok("no index is the first", same(galleryOrder(2, undefined), [0, 1]));
ok("a fractional index is the first", same(galleryOrder(3, 1.5), [0, 1, 2]));

/* ── a photo page's pictures ── */
ok("the album", same(pagePhotos(page({ type: "photo", media: ["a", "b"], mediaUri: "b" })), ["a", "b"]));
ok("a page from before albums: its one cover", same(pagePhotos(page({ type: "photo", mediaUri: "c" })), ["c"]));
ok("a voice page has no pictures", same(pagePhotos(page({ type: "voice", mediaUri: "v.m4a" })), []));

/* ── drifting: only words, only real pages ── */
ok("a text page with words drifts", canDriftPage(page({ body: "I said no today" }), false));
ok("a sample never drifts", !canDriftPage(page({ body: "I said no today" }), true));
ok("two characters don't", !canDriftPage(page({ body: " ok " }), false));
ok("three do", canDriftPage(page({ body: "yes" }), false));
ok("a photo page with words stays in the room", !canDriftPage(page({ type: "photo", body: "the light on the wall" }), false));

/* ── the date line ── */
ok("date and mood", dateLine("WED, OCT 14", "Sleepy", false) === "WED, OCT 14 · Sleepy");
ok("no stored mood, no name", dateLine("WED, OCT 14", "", false) === "WED, OCT 14");
ok("a sample says so", dateLine("WED, OCT 14", "Calm", true) === "WED, OCT 14 · Calm · SAMPLE");

/* ── the page ── */
{
  const v = pageView(page({ type: "photo", body: "the wall", media: ["a", "b", "c"], coverIndex: 1 }), false);
  ok("photos in drawing order, with their album index", same(v.photos, [{ index: 1, uri: "b" }, { index: 0, uri: "a" }, { index: 2, uri: "c" }]));
  ok("a real page's cover can change", v.canSetCover && v.coverHint);
  ok("a photo page isn't pure", !v.pure && v.kind === "photo");
  ok("no voice, no film on a photo page", !v.voice && !v.film);
}
{
  const v = pageView(page({ type: "photo", media: ["a"] }), false);
  ok("one picture: no cover hint", v.canSetCover && !v.coverHint && v.photos.length === 1);
}
{
  const v = pageView(page({ id: "demo-j-photo", type: "photo", media: ["a", "b"] }), true);
  ok("a sample's cover can't change, and no hint", !v.canSetCover && !v.coverHint);
}
{
  const v = pageView(page({ body: "I said no.", driftedLine: "I said no." }), false);
  ok("a text page is pure, with its line out", v.pure && v.drifted === "I said no." && v.canDrift);
  ok("no line out is empty", pageView(page({ body: "x" }), false).drifted === "");
}
ok("a voice page with its recording shows the card", pageView(page({ type: "voice", mediaUri: "v.m4a" }), false).voice);
ok("a voice page without one doesn't", !pageView(page({ type: "voice" }), false).voice);
ok("a video page with its file shows the film", pageView(page({ type: "video", mediaUri: "f.mp4" }), false).film);
ok("a missing body reads as empty", pageView({ id: "x", date: "2026-10-14T00:00:00Z", type: "text" } as JournalEntry, false).body === "");

/* ── one day, oldest first ── */
{
  const key = (iso: string) => iso.slice(0, 10);
  const day = dayPages(
    [
      { id: "late", date: "2026-10-14T22:00:00Z" },
      { id: "other", date: "2026-10-15T08:00:00Z" },
      { id: "early", date: "2026-10-14T07:00:00Z" },
    ],
    "2026-10-14",
    key,
  );
  ok("only that day, oldest first", same(day.map((d) => d.id), ["early", "late"]));
  ok("a day with nothing is empty", dayPages([{ date: "2026-10-14T22:00:00Z" }], "2026-10-13", key).length === 0);
}

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
