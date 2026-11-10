/* Behaviour lock for changing a sealed journal page (lib/journal-edit; owner's audit, 2026-11-10):
   the page stays the page (id, date, drifted line, unknown fields), one kind with only the media
   it needs, a cover index that stays inside the album, files known by name, and what an edit may
   delete (never a file any saved page still names).
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/lib/journal-edit.test.ts
   The file imports types only, so nothing needs stubbing. */

import { editedPage, fileName, filesDropped, pageFiles } from "./journal-edit.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  ok(name + (g === w ? "" : `  (got ${g}, want ${w})`), g === w);
};

const DIR = "file:///var/A/Documents/journal/";
const MOVED = "file:///var/B/Documents/journal/";

/* ── files are known by name ── */
ok("a path's name is its last segment", fileName(DIR + "j-1.jpg") === "j-1.jpg");
ok("no path, no name", fileName(undefined) === null && fileName("") === null && fileName(7) === null);
eq("a photo page's files, once each (the cover is in the album)", pageFiles({ mediaUri: DIR + "b.jpg", media: [DIR + "a.jpg", DIR + "b.jpg"] }), ["b.jpg", "a.jpg"]);
eq("a voice page's one file", pageFiles({ type: "voice", mediaUri: DIR + "v.m4a" }), ["v.m4a"]);
eq("a page of words has none", pageFiles({ type: "text", body: "hi" }), []);
eq("what isn't a page has none", pageFiles(null), []);
eq("a malformed album entry is skipped", pageFiles({ media: [DIR + "a.jpg", 3, null, ""] }), ["a.jpg"]);

/* ── the page stays the page ── */
{
  const stored = { id: "j-1", date: "2026-10-14T21:37:00.000Z", type: "text", body: "old words", mood: "sleepy", driftedLine: "old words", later: { x: 1 } };
  const out = editedPage(stored, { type: "text", body: "  new words \n", mood: "group-low" });
  eq("words and mood change; id, date, the drifted line and unknown fields stay", out, {
    id: "j-1",
    date: "2026-10-14T21:37:00.000Z",
    driftedLine: "old words",
    later: { x: 1 },
    type: "text",
    body: "new words",
    mood: "group-low",
  });
  ok("the stored page isn't touched", stored.body === "old words" && stored.mood === "sleepy");
  ok("id and date lead, as saved", Object.keys(out)[0] === "id" && Object.keys(out)[1] === "date");
}

/* ── one kind, and only what it needs ── */
{
  const photo = { id: "p", date: "d", type: "photo", body: "the wall", mood: "calm", mediaUri: DIR + "b.jpg", media: [DIR + "a.jpg", DIR + "b.jpg"], coverIndex: 1 };
  const toText = editedPage(photo, { type: "text", body: "the wall", mood: "calm" });
  ok("a photo page made words keeps no album, cover or file", !("media" in toText) && !("coverIndex" in toText) && !("mediaUri" in toText) && toText.type === "text");

  const album = editedPage(photo, { type: "photo", body: "", mood: "calm", media: [DIR + "b.jpg", DIR + "c.jpg"], coverIndex: 0 });
  eq("an album replaced whole, its cover as mediaUri", [album.media, album.coverIndex, album.mediaUri], [[DIR + "b.jpg", DIR + "c.jpg"], 0, DIR + "b.jpg"]);

  const cover = editedPage(photo, { type: "photo", body: "", mood: "calm", media: [DIR + "a.jpg", DIR + "b.jpg"], coverIndex: 1 });
  ok("the cover the edit names", cover.coverIndex === 1 && cover.mediaUri === DIR + "b.jpg");
  const past = editedPage(photo, { type: "photo", body: "", mood: "calm", media: [DIR + "a.jpg"], coverIndex: 4 });
  ok("a cover index past the album is the first", past.coverIndex === 0 && past.mediaUri === DIR + "a.jpg");
  const none = editedPage(photo, { type: "photo", body: "", mood: "calm", media: [DIR + "a.jpg"] });
  ok("no cover index is the first", none.coverIndex === 0);
  const frac = editedPage(photo, { type: "photo", body: "", mood: "calm", media: [DIR + "a.jpg", DIR + "b.jpg"], coverIndex: 0.5 });
  ok("a fractional cover index is the first", frac.coverIndex === 0);

  const empty = editedPage(photo, { type: "photo", body: "left alone", mood: "calm", media: [] });
  ok("an album of nothing is a page of words", empty.type === "text" && !("media" in empty) && !("mediaUri" in empty));
}
{
  const voice = { id: "v", date: "d", type: "voice", body: "", mood: "tired", mediaUri: DIR + "v.m4a", dur: 74 };
  const kept = editedPage(voice, { type: "voice", body: "what I said", mood: "happy", mediaUri: DIR + "v.m4a", dur: 74 });
  eq("a voice page: new words and mood, the same recording and length", kept, { id: "v", date: "d", type: "voice", body: "what I said", mood: "happy", mediaUri: DIR + "v.m4a", dur: 74 });
  const lost = editedPage(voice, { type: "voice", body: "what I said", mood: "happy" });
  ok("a voice page without its file is a page of words, no length", lost.type === "text" && !("dur" in lost) && !("mediaUri" in lost));
  const noDur = editedPage(voice, { type: "video", body: "", mood: "happy", mediaUri: DIR + "f.mp4", dur: 0 });
  ok("no length is left out, not written as 0", noDur.type === "video" && !("dur" in noDur));
  const stray = editedPage(voice, { type: "voice", body: "", mood: "happy", mediaUri: DIR + "v.m4a", media: [DIR + "x.jpg"], coverIndex: 0 });
  ok("a voice page takes no album", !("media" in stray) && !("coverIndex" in stray));
}

/* ── what an edit leaves behind ── */
{
  const before = { id: "p", media: [DIR + "a.jpg", DIR + "b.jpg", DIR + "c.jpg"], mediaUri: DIR + "a.jpg" };
  const after = { id: "p", media: [DIR + "c.jpg", DIR + "new.jpg"], mediaUri: DIR + "c.jpg" };
  eq("the pictures taken off the page", filesDropped(before, [after]), ["a.jpg", "b.jpg"]);
  eq("nothing taken off, nothing dropped", filesDropped(before, [before]), []);
  eq("a page made words drops all it had", filesDropped(before, [{ id: "p", type: "text" }]), ["a.jpg", "b.jpg", "c.jpg"]);
  eq("a page with no files drops none", filesDropped({ id: "t", type: "text" }, [after]), []);

  const movedAfter = { id: "p", media: [MOVED + "a.jpg", MOVED + "b.jpg", MOVED + "c.jpg"], mediaUri: MOVED + "a.jpg" };
  eq("the same files under a new container path are kept", filesDropped(before, [movedAfter]), []);

  const twin = { id: "p", media: [DIR + "a.jpg"], mediaUri: DIR + "a.jpg" };
  eq("a file another saved page still names is never dropped", filesDropped(before, [after, twin]), ["b.jpg"]);
  eq("pages that aren't pages are passed over", filesDropped(before, [null, 3, after]), ["a.jpg", "b.jpg"]);
}
{
  const voice = { id: "v", type: "voice", mediaUri: DIR + "v.m4a" };
  eq("a recording replaced: the old one goes", filesDropped(voice, [{ id: "v", type: "voice", mediaUri: DIR + "v2.m4a" }]), ["v.m4a"]);
  eq("a recording kept: nothing goes", filesDropped(voice, [{ id: "v", type: "voice", mediaUri: MOVED + "v.m4a" }]), []);
}

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
