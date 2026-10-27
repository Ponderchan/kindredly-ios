/* Behaviour lock for the Notes photo roll in Swift (screens/photo-roll/photo-roll-model): the
   first row (stamps, the newest picture where Camera isn't, none while adding), picking (order,
   taking out, the room left), Next's words, the album list's current row and a film's length —
   the same rules the React Native roll (app/journal-pick) draws.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/photo-roll/photo-roll-model.test.ts */

import { albumCurrent, firstRow, mmss, nextLabel, roomFor, togglePick, ROLL_MAX } from "./photo-roll-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ── the first row ── */
{
  const r = firstRow({ adding: false, camera: true, frames: ["a", "b"] });
  ok("with the camera card: three stamps", same(r.keys, ["camera", "text", "voice"]));
  ok("with the camera card: the whole roll after them", same(r.rest, ["a", "b"]) && r.lead === null && !r.leadBlank);
}
{
  const r = firstRow({ adding: false, camera: false, frames: ["a", "b", "c"] });
  ok("without it: two stamps", same(r.keys, ["text", "voice"]));
  ok("without it: the newest picture third", r.lead === "a" && !r.leadBlank);
  ok("without it: the roll goes on from the second", same(r.rest, ["b", "c"]));
}
{
  const r = firstRow({ adding: false, camera: false, frames: [] as string[] });
  ok("without it and nothing on the roll: an empty third cell", r.lead === null && r.leadBlank && r.rest.length === 0);
}
{
  const r = firstRow({ adding: true, camera: true, frames: ["a"] });
  ok("adding to a page: no first row, the whole roll", r.keys.length === 0 && r.lead === null && !r.leadBlank && same(r.rest, ["a"]));
}
{
  const frames = ["a"];
  const r = firstRow({ adding: true, camera: false, frames });
  ok("the roll handed back is a copy", r.rest !== frames);
}

/* ── picking ── */
ok("nine at most", ROLL_MAX === 9);
ok("room: nine less what the page holds", roomFor(0) === 9 && roomFor(4) === 5 && roomFor(12) === 0);
ok("a tap adds at the end", same(togglePick(["a"], "b", 9), { picked: ["a", "b"], full: false }));
ok("a second tap takes it out, the order kept", same(togglePick(["a", "b", "c"], "b", 9), { picked: ["a", "c"], full: false }));
ok("past the room: refused, unchanged", same(togglePick(["a", "b"], "c", 2), { picked: ["a", "b"], full: true }));
ok("taking out works even when full", same(togglePick(["a", "b"], "a", 2), { picked: ["b"], full: false }));
ok("no room at all refuses the first", togglePick([], "a", 0).full);

/* ── Next ── */
ok("nothing picked: the word", nextLabel("Next", 0, false) === "Next");
ok("three picked: the count", nextLabel("Next", 3, false) === "Next · 3");
ok("busy: an ellipsis", nextLabel("Add", 3, true) === "…");

/* ── the albums ── */
ok("the first row is current while no album is chosen", albumCurrent(0, "smart-recents", null));
ok("the first row isn't current under another album", !albumCurrent(0, "smart-recents", "fav"));
ok("an album's own row is current", albumCurrent(3, "fav", "fav") && !albumCurrent(3, "fav", null));

/* ── a film's length ── */
ok("m:ss", mmss(0) === "0:00" && mmss(7.9) === "0:07" && mmss(75) === "1:15" && mmss(600) === "10:00");
ok("a bad length is 0:00", mmss(Number.NaN) === "0:00" && mmss(-3) === "0:00");

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
