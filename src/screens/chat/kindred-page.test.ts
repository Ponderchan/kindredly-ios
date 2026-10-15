/* Behaviour lock for a kindred's page (screens/chat/kindred-page): the taken-back filter, TALK
   TO's way back (spec bug 12) and the face. Not wired to a runner; run by hand from the repo root
   with plain node (it strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/chat/kindred-page.test.ts
   A load hook adds ".ts" to an extensionless relative import, in this process only. Every line
   prints ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const K = await import("./kindred-page.ts");
const { demoDetail } = await import("../../data/demo.ts");

type Detail = import("../../lib/db").ThreadDetail;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(",")})` : key);

const base: Detail = {
  stamp: "tiny-win",
  revealed: true,
  otherName: "Mira",
  other: "u-mira",
  myCount: 2,
  otherCount: 3,
  opening: "the opening",
  openingFromMe: false,
  messages: [
    { id: "1", body: "mine one", mine: true, date: "2026-10-01T10:00:00Z" },
    { id: "2", body: "theirs one", mine: false, date: "2026-10-01T11:00:00Z" },
    { id: "3", body: "(taken back)", mine: false, date: "2026-10-01T12:00:00Z", recalledAt: "2026-10-01T12:01:00Z" },
    { id: "4", body: "(taken back)", mine: false, date: "2026-10-01T12:30:00Z" },
    { id: "5", body: "mine two", mine: true, date: "2026-10-01T13:00:00Z" },
  ],
};

/* ── the taken-back filter (critic) ── */
{
  const w = K.writingOf(base);
  ok("their writing skips lines taken back", w.theirs.join("|") === "the opening|theirs one");
  ok("…by recalledAt and by the placeholder body", !w.theirs.includes("(taken back)"));
  ok("my writing is mine", w.mine.join("|") === "mine one|mine two");
  const mineFirst = K.writingOf({ ...base, openingFromMe: true });
  ok("the opening goes on its own side", mineFirst.mine[0] === "the opening" && mineFirst.theirs[0] === "theirs one");
  ok("no opening, nothing added", K.writingOf({ ...base, opening: "" }).theirs.join("|") === "theirs one");
}

/* ── TALK TO (spec bug 12) ── */
ok("from the room's header: back, not a second room", (() => {
  const r = K.talkTo(base, "th-1", { name: "room/[id]", params: { id: "th-1" } });
  return r.kind === "back";
})());
ok("from Kindreds: replace with the room", (() => {
  const r = K.talkTo(base, "th-1", { name: "(tabs)", params: {} });
  return r.kind === "replace" && r.href === "/room/th-1";
})());
ok("another thread's room underneath: replace", K.talkTo(base, "th-1", { name: "room/[id]", params: { id: "th-2" } }).kind === "replace");
ok("before names, from the chat: back", K.talkTo({ revealed: false }, "th-1", { name: "chat/[id]", params: { id: "th-1" } }).kind === "back");
ok("before names, from elsewhere: replace with the chat", (() => {
  const r = K.talkTo({ revealed: false }, "th-1", null);
  return r.kind === "replace" && r.href === "/chat/th-1";
})());
ok("a room underneath doesn't answer for a pen pal", K.talkTo({ revealed: false }, "th-1", { name: "room/[id]", params: { id: "th-1" } }).kind === "replace");

/* ── the face (owner 10-15) ── */
ok("a kindred is round, face or not", K.faceKind(base) === "round" && K.faceKind({ ...base }) === "round");
ok("a pen pal is a mosaic", K.faceKind({ ...base, revealed: false }) === "mosaic");
ok("a deleted account is the veil", K.faceKind(demoDetail("demo-gone-kindred") as Detail) === "veil");
ok("no TALK TO to a deleted account", !K.canTalk(demoDetail("demo-gone-kindred") as Detail) && K.canTalk(base));

/* ── words ── */
ok("title: A KINDRED / A VOICE YOU KNOW", K.pageTitle(base, t) === "kd.kindred" && K.pageTitle({ revealed: false }, t) === "kd.voiceKnown");
ok("letters: n — mine · theirs", K.lettersValue(base, t) === "kd.lettersVal(n=5,mine=2,theirs=3)");
ok("who began", K.whoBegan(base, "Mira", t, "en-US") === "kd.theyFirst(name=MIRA)" && K.whoBegan({ openingFromMe: true }, "Mira", t, "en-US") === "kd.youFirst");

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
