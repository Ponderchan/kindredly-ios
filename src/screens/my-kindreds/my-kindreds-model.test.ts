/* Behaviour lock for My kindreds in Swift (screens/my-kindreds/my-kindreds-model): only kindreds,
   in the order they became kindreds, only true dates and counts, and the four states.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/my-kindreds/my-kindreds-model.test.ts
   The model imports types only, so nothing needs stubbing. */

import { buildMyKindredsView, kindredsOf, unreadIn, type MyKindredsFormat } from "./my-kindreds-model.ts";
import type { ThreadSummary } from "../../lib/db";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const fmt: MyKindredsFormat = {
  t: (k, v) => (v ? `${k}:${Object.values(v).join("|")}` : k),
  chipDay: (ms) => `D${ms}`,
  when: (ms) => `W${ms}`,
};

const th = (id: string, o: Partial<ThreadSummary> = {}): ThreadSummary => ({
  id,
  stamp: "",
  revealed: true,
  mine: 6,
  theirs: 6,
  otherName: `Name ${id}`,
  otherFace: `face-${id}`,
  other: `uid-${id}`,
  preview: `line ${id}`,
  lastSenderMe: false,
  lastAt: 1000,
  ...o,
});

/* ── who is listed, and the order ── */
{
  const list = kindredsOf([
    th("pal", { revealed: false }),
    th("gone", { gone: true }),
    th("late", { revealedAt: 300 }),
    th("early", { revealedAt: 100 }),
    th("old", { revealedAt: null, lastAt: 200 }),
  ]);
  ok("pen pals are never listed", !list.some((x) => x.id === "pal"));
  ok("a closed account is gone from the book", !list.some((x) => x.id === "gone"));
  ok("oldest kindred first; a row with no seal day sorts by its last letter", list.map((x) => x.id).join() === "early,old,late");
}

/* ── the states ── */
{
  const base = { ledger: {} };
  ok("nothing read yet → loading", buildMyKindredsView({ ...base, threads: null, failed: false }, fmt).state === "loading");
  ok("no answer and nothing kept → failed, never empty", buildMyKindredsView({ ...base, threads: null, failed: true }, fmt).state === "failed");
  ok("a real answer with only pen pals → empty", buildMyKindredsView({ ...base, threads: [th("p", { revealed: false })], failed: false }, fmt).state === "empty");
  ok("a kept list survives a failed read", buildMyKindredsView({ ...base, threads: [th("a")], failed: true }, fmt).state === "ready");
  const loading = buildMyKindredsView({ ...base, threads: null, failed: false }, fmt);
  ok("no count before a list is read", loading.strings.count === "");
  const ready = buildMyKindredsView({ ...base, threads: [th("a"), th("b"), th("p", { revealed: false })], failed: false }, fmt);
  ok("the count is the kindreds only", ready.strings.count === "2");
  ok("the empty line is the new one", ready.strings.empty === "mk.empty");
  ok("the failed line is the offline one", ready.strings.failed === "auth.err.offline");
}

/* ── a card's words: only what the data has ── */
{
  const v = buildMyKindredsView(
    {
      threads: [th("a", { revealedAt: 500, lastSenderMe: true }), th("b", { revealedAt: null, preview: "", lastAt: 0 })],
      failed: false,
      ledger: { a: 2 },
    },
    fmt,
  );
  const a = v.cards.find((c) => c.id === "a")!;
  const b = v.cards.find((c) => c.id === "b")!;
  ok("ordered by the seal day, a row without one by its last letter", v.cards.map((c) => c.id).join() === "b,a");
  ok("the chip carries the seal day", a.since === "in.sinceChip:D500");
  ok("no seal day, no chip (the last letter never stands in)", b.since === "");
  ok("the time is the last letter's", a.when === "W1000");
  ok("nothing written, no time", b.when === "");
  ok("your last line wears You:", a.youPrefix === "mm.you: " && a.preview === "line a");
  ok("no line, no You:", b.youPrefix === "" && b.preview === "");
  ok("the unread badge counts their letters past the ledger", a.badge === "4");
  ok("a room never opened claims nothing", b.badge === "");
  ok("VoiceOver hears the name, the chip, the unread count, the time and the line", a.a11y === "Name a, in.sinceChip:D500, kd.unreadA11y:4, W1000, mm.you: line a");
  ok("VoiceOver skips what isn't there", b.a11y === "Name b");
  ok("the face is the one they gave, round", a.face.role === "kindred" && a.face.avatarId === "face-a" && a.face.seed === "uid-a");
  ok("whose stamp: their user id", a.other === "uid-a");
}

/* ── the badge ── */
{
  ok("unread is never negative", unreadIn({ x: 9 }, th("x", { theirs: 3 })) === 0);
  const many = buildMyKindredsView({ threads: [th("m", { theirs: 30 })], failed: false, ledger: { m: 1 } }, fmt);
  ok("more than nine reads 9+", many.cards[0].badge === "9+");
}

console.log(fails ? `\n${fails} failed` : "\nall ok");
if (fails) process.exit(1);
