/* Behaviour lock for the song shelf's words (screens/chat/song-shelf), shared by the React Native
   shelf and the SwiftUI one. Not wired to a runner; run by hand from the repo root with plain node
   (it strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/chat/song-shelf.test.ts */

import { readFileSync } from "node:fs";
import { shelfRows, shelfSaysKey, shelfTitleOf, shelfWhoOf } from "./song-shelf.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const day = (at: string) => `d(${at})`;

ok("a title is the song's own", shelfTitleOf({ url: "https://open.spotify.com/track/x", title: "Pink Moon" }) === "Pink Moon");
ok("no title: the link's host", shelfTitleOf({ url: "https://open.spotify.com/track/x", title: null }) === "open.spotify.com");
ok("no title, http: the host", shelfTitleOf({ url: "http://youtu.be/abc", title: "" }) === "youtu.be");
ok("no title, no scheme: the first part", shelfTitleOf({ url: "bandcamp.com/x", title: null }) === "bandcamp.com");

ok("yours: YOU and the day, upper-cased", shelfWhoOf({ mine: true, at: "oct 3" }, "Juno", "you", day) === "YOU · D(OCT 3)");
ok("theirs: their name, upper-cased", shelfWhoOf({ mine: false, at: "x" }, "Juno", "you", day) === "JUNO · D(X)");

ok("late nights: the late line", shelfSaysKey("late") === "rm.shelf.late");
ok("anything else: the both line", shelfSaysKey("both") === "rm.shelf.both" && shelfSaysKey("") === "rm.shelf.both");

{
  const rows = shelfRows(
    [
      { url: "https://a.example/1", title: "One", mine: true, at: "1" },
      { url: "https://b.example/2", title: null, mine: false, at: "2" },
    ],
    { name: "Mira", you: "You", day },
  );
  ok("rows: in order, keyed by the link", rows.length === 2 && rows[0].key === "https://a.example/1" && rows[1].key === "https://b.example/2");
  ok("rows: the titles", rows[0].title === "One" && rows[1].title === "b.example");
  ok("rows: who and when", rows[0].who === "YOU · D(1)" && rows[1].who === "MIRA · D(2)");
  ok("no songs: no rows", shelfRows([], { name: "Mira", you: "You", day }).length === 0);
}

/* the words exist (data/strings, read as text: it imports React Native) */
{
  const src = readFileSync(new URL("../../data/strings.ts", import.meta.url), "utf8");
  const keys = ["rm.shelf.title", "rm.shelf.late", "rm.shelf.both", "wren.trackClose", "ui.you"];
  const missing = keys.filter((k) => !src.includes(`"${k}":`));
  ok(`words: the shelf's keys are in data/strings (${keys.length})`, missing.length === 0);
  if (missing.length) console.log("  missing:", missing.join(", "));
}

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
