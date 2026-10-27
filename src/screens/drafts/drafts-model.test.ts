/* Behaviour lock for Unsent in Swift (screens/drafts/drafts-model): the same cards, count and
   VoiceOver words as the React Native page (app/drafts.tsx). Not wired to a runner; run by hand
   from the repo root with plain node:
     node src/screens/drafts/drafts-model.test.ts
   The model imports types only, so nothing needs stubbing. */

import { draftCards, draftsCount, type DraftsFormat } from "./drafts-model.ts";
import type { Draft } from "../../lib/drafts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const fmt: DraftsFormat = {
  day: (iso) => `October ${iso.slice(8, 10)}, 2026`,
  stampHex: (id) => (id === "rain" ? "#3B6E9B" : null),
  isPhotoStamp: (id) => id.startsWith("c:"),
};

const draft = (id: string, o: Partial<Draft> = {}): Draft => ({ id, date: "2026-10-27T09:00:00Z", stamp: "rain", body: "  Dear stranger,\nthe rain again.  ", ask: "", ...o });

ok("the count before the drafts are read", draftsCount(false, 0) === "··");
ok("the count once read, two digits", draftsCount(true, 3) === "03" && draftsCount(true, 0) === "00" && draftsCount(true, 12) === "12");

{
  const [c] = draftCards([draft("a")], fmt);
  ok("the date in capitals", c.date === "OCTOBER 27, 2026");
  ok("the words trimmed, the line break kept", c.words === "Dear stranger,\nthe rain again.");
  ok("a known stamp shows, with its colour", c.stamp === "rain" && c.stampHex === "#3B6E9B");
  ok("VoiceOver: the date, then the words", c.a11y === "OCTOBER 27, 2026. Dear stranger,\nthe rain again.");
}
ok("a photo stamp shows, with no colour of its own", (() => { const [c] = draftCards([draft("b", { stamp: "c:1234" })], fmt); return c.stamp === "c:1234" && c.stampHex === ""; })());
ok("a stamp the app doesn't know shows nothing", draftCards([draft("c", { stamp: "retired" })], fmt)[0].stamp === "");
ok("no stamp shows nothing", draftCards([draft("d", { stamp: "" })], fmt)[0].stamp === "");
ok("the order is lib/drafts' own", draftCards([draft("x"), draft("y"), draft("z")], fmt).map((c) => c.id).join() === "x,y,z");
ok("no drafts, no cards", draftCards([], fmt).length === 0);

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
