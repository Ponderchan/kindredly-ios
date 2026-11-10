/* Behaviour lock for the + tray's draft row (components/plus-draft-model; owner's audit,
   2026-11-10): which draft it offers, the words under its title, the count at its end, and
   where every row of the + goes — with the one rule for the day's count (none left: Letter and
   the draft both go to the paywall).
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/components/plus-draft-model.test.ts
   The model imports types only, so nothing needs stubbing. The last lines read the Swift side
   and the holder, so the key the tray reports and the route it opens can't drift apart. */

import { readFileSync } from "node:fs";
import { DRAFT_WORDS_MAX, PLUS_DRAFT_KEY, PLUS_LETTER_KEY, PLUS_PAYWALL, firstWords, plusDraft, plusDraftCount, plusRoute } from "./plus-draft-model.ts";
import type { Draft } from "../lib/drafts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const draft = (id: string, o: Partial<Draft> = {}): Draft => ({ id, date: "2026-11-10T09:00:00.000Z", stamp: "", body: "Dear stranger, the rain again.", ask: "", ...o });

/* ── the words ── */
ok("a short letter is its own first words", firstWords("Dear stranger, the rain again.") === "Dear stranger, the rain again.");
ok("line breaks and runs of spaces are one space", firstWords("  Dear stranger,\n\nthe   rain\tagain.  ") === "Dear stranger, the rain again.");
{
  const long = "I have been meaning to write this for weeks and every time I sit down the kettle boils and I forget what it was";
  const w = firstWords(long);
  ok("a long letter is cut with an ellipsis", w.endsWith("…") && Array.from(w).length <= DRAFT_WORDS_MAX + 1);
  ok("…on a word's edge", long.startsWith(w.slice(0, -1)) && long[w.length - 1] === " ");
  ok("…and never ends in a space before the ellipsis", !/\s…$/.test(w));
}
{
  const w = firstWords("x".repeat(200));
  ok("one long word is cut at the limit", w === "x".repeat(DRAFT_WORDS_MAX) + "…");
}
{
  const w = firstWords("雨".repeat(200));
  ok("a language without spaces is cut at the limit", w === "雨".repeat(DRAFT_WORDS_MAX) + "…");
}
{
  const w = firstWords("🕊️".repeat(100), 10);
  ok("an emoji is never split in half", !/[\uD800-\uDBFF]…$/.test(w) && !w.includes("�"));
}
ok("exactly at the limit: no ellipsis", firstWords("a".repeat(DRAFT_WORDS_MAX)) === "a".repeat(DRAFT_WORDS_MAX));
ok("nothing written: no words", firstWords("") === "" && firstWords("  \n ") === "");
ok("not a string: no words", firstWords(undefined) === "" && firstWords(7) === "");

/* ── which draft ── */
ok("no drafts: no row", plusDraft([]) === null);
ok("a list that isn't one: no row", plusDraft(null) === null && plusDraft(undefined) === null && plusDraft({} as unknown as Draft[]) === null);
{
  const d = plusDraft([draft("d-1")]);
  ok("one draft: it, its words, a count of one", d?.id === "d-1" && d.words === "Dear stranger, the rain again." && d.count === 1);
}
{
  // saveDraft updates an old draft in place: the newest is not always first
  const d = plusDraft([draft("d-3", { date: "2026-11-08T09:00:00.000Z", body: "third" }), draft("d-2", { date: "2026-11-10T21:30:00.000Z", body: "second, touched last" }), draft("d-1", { date: "2026-11-01T09:00:00.000Z", body: "first" })]);
  ok("several: the one touched last opens", d?.id === "d-2" && d.words === "second, touched last");
  ok("several: the count is all of them", d?.count === 3);
}
ok("equal dates: the earlier in the list (lib/drafts' own order)", plusDraft([draft("a"), draft("b")])?.id === "a");
ok("a draft with no date loses to one with a date", plusDraft([draft("old", { date: undefined as unknown as string }), draft("new")])?.id === "new");
ok("no letter text but a question: the question", plusDraft([draft("q", { body: "  ", ask: "what do you do when it rains?" })])?.words === "what do you do when it rains?");
ok("neither: no words (the holder says ml.draftEmpty)", plusDraft([draft("e", { body: "", ask: "" })])?.words === "");
ok("a body that isn't text: no words, still a row", plusDraft([draft("n", { body: null as unknown as string })])?.words === "");
{
  const d = plusDraft([null, 3, { body: "no id" }, draft("real")] as unknown as Draft[]);
  ok("what isn't a draft is skipped, and not counted", d?.id === "real" && d.count === 1);
  ok("only things that aren't drafts: no row", plusDraft([null, { id: "" }] as unknown as Draft[]) === null);
}

/* ── the count at the row's end ── */
ok("one draft: no figure", plusDraftCount(1) === "" && plusDraftCount(0) === "");
ok("several: the number", plusDraftCount(2) === "2" && plusDraftCount(3) === "3" && plusDraftCount(14) === "14");

/* ── where the rows go ── */
const routes = { letter: "/compose", note: "/journal-pick", stranger: "/compose" };
const go = (key: string, left: number | null, draftId: string | null = "d-9") => plusRoute(key, { left, draftId, routes });
ok("the draft opens the composer on it, the drafts page's route", go("draft", 3) === "/compose?draft=d-9");
ok("…with no count to show too (First Class, a guest, unread)", go("draft", null) === "/compose?draft=d-9");
ok("an odd id is escaped", go("draft", null, "d 1&x") === "/compose?draft=d%201%26x");
ok("Letter opens the composer", go("letter", 3) === "/compose" && go("letter", null) === "/compose");
ok("none left today: Letter goes to the paywall", go("letter", 0) === PLUS_PAYWALL);
ok("none left today: the draft goes where Letter goes", go("draft", 0) === go("letter", 0));
ok("none left today: Note still works", go("note", 0) === "/journal-pick");
ok("a draft row with no draft behind it goes nowhere", go("draft", 3, null) === null && go("draft", 0, null) === null);
ok("the 10a cards keep their routes", go("stranger", 0) === "/compose");
ok("a key nobody knows goes nowhere", go("nope", 3) === null);
ok("the paywall is the compose page's own cap link", PLUS_PAYWALL === "/paywall?src=daily_cap");

/* ── the same keys and route on every side ── */
{
  const swift = readFileSync(new URL("../../modules/kindredly-ui/ios/Portable/KPlusPanel.swift", import.meta.url), "utf8");
  ok("Swift: the tray reports the draft row by the same key", swift.includes(`static let draft = "${PLUS_DRAFT_KEY}"`) && swift.includes(`static let letter = "${PLUS_LETTER_KEY}"`));
  const compose = readFileSync(new URL("../screens/compose/useComposeState.ts", import.meta.url), "utf8");
  ok("the composer still resumes a draft from the `draft` param", compose.includes("params.draft"));
  ok("the composer's cap link is the same paywall", compose.includes(`"${PLUS_PAYWALL}"`));
}

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
