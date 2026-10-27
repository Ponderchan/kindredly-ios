/* Behaviour lock for Lore in Swift (screens/lore/lore-model): the same clippings and small print as
   the React Native page (app/lore.tsx). Not wired to a runner; run by hand from the repo root with
   plain node:
     node src/screens/lore/lore-model.test.ts
   The model imports types only, so nothing needs stubbing. */

import { loreCards, type LoreFormat } from "./lore-model.ts";
import type { LoreEntry } from "../../lib/lore";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const fmt: LoreFormat = {
  t: (k, v) => (v ? `${k}:${Object.values(v).join("|")}` : k),
  day: (iso) => `Oct ${Number(iso.slice(8, 10))}`,
};

const entry = (id: string, o: Partial<LoreEntry> = {}): LoreEntry => ({ id, threadId: "t1", who: "Robin", body: "The kettle sang.", at: "2026-10-27T10:00:00Z", said: "2026-10-26T10:00:00Z", ...o });

{
  const [c] = loreCards([entry("a")], fmt);
  ok("the words as written", c.body === "The kettle sang.");
  ok("the small print: their name and the day, in capitals", c.from === "lore.from:ROBIN · OCT 26");
  ok("no question: no prompt", c.prompt === "");
}
ok("a question fold keeps its question", loreCards([entry("b", { prompt: "What did you eat today?" })], fmt)[0].prompt === "What did you eat today?");
ok("a null prompt is none", loreCards([entry("c", { prompt: null })], fmt)[0].prompt === "");
ok("the day unknown: the name alone", loreCards([entry("d", { said: "" })], fmt)[0].from === "lore.from:ROBIN");
ok("the order is lib/lore's own", loreCards([entry("x"), entry("y")], fmt).map((c) => c.id).join() === "x,y");

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
