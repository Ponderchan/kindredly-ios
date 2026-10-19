/* Behaviour lock for My letters' model (screens/letters/letters-model): the
   matching (by letter id, else by the opening's text — the React Native
   page's rule), the order, the counts, the filters, the status words and
   where a tap goes. Run by hand from the repo root:
     node src/screens/letters/letters-model.test.ts
   Every line prints ok/FAIL; the process exits non-zero if any fail. */

import { buildLetterCards, buildMyLettersView, filterCards, letterCounts, letterDate, letterStatus, type MyLettersFormat } from "./letters-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}{${Object.entries(v).map(([a, b]) => `${a}:${b}`).join(",")}}` : k);
const fmt: MyLettersFormat = { t, upper: (s) => s.toUpperCase(), stamp: (id) => (id === "calm" ? { hex: "#6DAE78", name: "Calm" } : { hex: "", name: "" }) };

const th = (o: Record<string, unknown>) =>
  ({ id: "t", other: "u2", otherName: null, otherFace: null, revealed: false, gone: false, fromMyLetter: true, letterId: null, opening: null, theirs: 1, ...o }) as never;
const letters = [
  { id: "L1", body: "first", created_at: "2026-09-20T10:00:00Z", stamp: "calm", reads: 5 },
  { id: "L2", body: "second", created_at: "2026-09-22T10:00:00Z", stamp: null, reads: 0 },
  { id: "L3", body: "old opening", created_at: "2026-09-01T10:00:00Z", stamp: null, reads: 2 },
] as never[];
const threads = [
  th({ id: "A", letterId: "L1" }),
  th({ id: "B", letterId: "L1", revealed: true, otherName: "Luna" }),
  th({ id: "C", opening: "old opening" }),
  th({ id: "D", letterId: "L2", fromMyLetter: false }), // their letter, not an answer to mine
];
const drafts = [{ id: "D1", body: "", date: "2026-09-21T10:00:00Z", stamp: "" }] as never[];

const cards = buildLetterCards(letters, threads, drafts);
ok("newest first, drafts among them", cards.map((c) => c.id).join() === "L2,D1,L1,L3");
ok("answers by letter id", cards.find((c) => c.id === "L1")!.answers.length === 2);
ok("answers by the opening for older rows", cards.find((c) => c.id === "L3")!.answers.length === 1);
ok("a thread not from my letter is no answer", cards.find((c) => c.id === "L2")!.answers.length === 0);
ok("a named reply wins the status", (() => { const s = cards.find((c) => c.id === "L1")!.status; return s.kind === "replied" && s.who === "Luna" && s.more === 1; })());
ok("unnamed answers count", (() => { const s = cards.find((c) => c.id === "L3")!.status; return s.kind === "answered" && s.n === 1; })());
ok("no answers is quiet", letterStatus([]).kind === "quiet");
ok("a tap opens the first answer's chat (not revealed)", cards.find((c) => c.id === "L1")!.opens === "/chat/A");
ok("a quiet letter opens nothing", cards.find((c) => c.id === "L2")!.opens === null);
ok("a draft opens its composer", cards.find((c) => c.id === "D1")!.opens === "/compose?draft=D1");
const n = letterCounts(cards);
ok("counts", n.all === 3 && n.answered === 2 && n.quiet === 1 && n.drafts === 1);
ok("All holds letters only", filterCards(cards, "all").length === 3);
ok("Drafts holds drafts only", filterCards(cards, "drafts").map((c) => c.id).join() === "D1");
ok("letterDate", letterDate("2026-09-23T01:02:03Z") === "2026.09.23" && letterDate("") === "");
ok("no letters read yet gives the drafts alone", buildLetterCards(null, threads, drafts).length === 1);

const v = buildMyLettersView(cards, fmt);
ok("four filters with their counts", v.filters.map((f) => `${f.key}${f.count}`).join() === "all3,answered2,quiet1,drafts1");
const c1 = v.cards.find((c) => c.id === "L1")!;
ok("replied: who and how many more", c1.tone === "replied" && c1.status === "ml.repliedMore{who:Luna,n:1}" && !!c1.face);
ok("stamp colour from the table", c1.stampHex === "#6DAE78");
ok("a11y says reads and replies", c1.a11y.includes("m4.ml.a11y.reads{n:5}") && c1.a11y.includes("m4.ml.a11y.replies{n:2}"));
const c3 = v.cards.find((c) => c.id === "L3")!;
ok("answered: upper-cased with the count", c3.tone === "answered" && c3.status === "ML.ANSWERED · 1" && c3.tag === "answered");
ok("one reply says replyOne", c3.a11y.includes("m4.ml.a11y.replyOne"));
const c2 = v.cards.find((c) => c.id === "L2")!;
ok("quiet", c2.tone === "quiet" && c2.status === "ML.QUIET" && c2.tag === "quiet" && !c2.opens);
const d = v.cards.find((c) => c.id === "D1")!;
ok("an empty draft says so, dated", d.kind === "draft" && d.tag === "draft" && d.body === "ml.draftEmpty" && d.date === "ML.DRAFT · 2026.09.21");
ok("the drafts' empty line", v.strings.noDrafts === "m4.ml.noDrafts");

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
