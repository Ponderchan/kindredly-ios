/* Behaviour lock for "catch a line", the Kindreds tab's empty page (screens/kindreds/catch-model):
   a letter's first line as a slip carries it, which of today's letters drift (only the reader's
   own desk, text and signed, the unread first, six at a time and further along each visit), and
   what a slip says about its writer (Today's card's own words; the star sign, never the she/he
   mark).
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/kindreds/catch-model.test.ts
   The model's own imports are pure; a load hook only adds ".ts" to the extensionless relative
   imports Metro wants. Every line prints ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const M = await import("./catch-model.ts");
const { whoBook } = await import("../../lib/stranger-who.ts");
type Letter = import("../../lib/db").PoolLetter;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const eq = (name: string, got: unknown, want: unknown) => {
  const same = JSON.stringify(got) === JSON.stringify(want);
  console.log((same ? "ok  " : "FAIL") + " " + name + (same ? "" : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`));
  if (!same) fails++;
};

/* ── the line ── */
const f = M.firstLine;
eq("one sentence stays whole", f("I fixed the wobbly chair today. It took an hour."), "I fixed the wobbly chair today.");
eq("a question ends a line", f("Do you ever miss a place you never lived? I do."), "Do you ever miss a place you never lived?");
eq("a greeting takes the next sentence with it", f("Hi. I can't sleep again tonight. Anyone else?"), "Hi. I can't sleep again tonight.");
eq("a lone greeting is the whole line", f("Hello!"), "Hello!");
eq("a line break ends a sentence", f("no full stop here\nand a second line"), "no full stop here");
eq("a short first line takes the next line", f("hey\nthe rain finally stopped"), "hey the rain finally stopped");
eq("a full stop inside a number is not an end", f("It was 2.5 degrees out and I walked anyway. Cold."), "It was 2.5 degrees out and I walked anyway.");
eq("closing quotes go with the sentence", f("She said \"go home.\" So I did."), "She said \"go home.\"");
eq("an ellipsis ends a sentence", f("I keep thinking about it… and then nothing happens."), "I keep thinking about it…");
eq("Chinese ends at its own full stop", f("今天把那把晃的椅子修好了。花了一个小时。"), "今天把那把晃的椅子修好了。");
eq("spaces and blank lines are tidied", f("  \n\n  Tell me   a street\tyou've never walked down.  "), "Tell me a street you've never walked down.");
eq("nothing is nothing", [f(""), f("   \n "), f(null), f(undefined)], ["", "", "", ""]);
const long = f("It's 2am and I'm listening to the dishwasher because it sounds like rain and I can't sleep.");
ok("a long line is cut at a word and ends in an ellipsis", long.endsWith("…") && !long.endsWith(" …") && Array.from(long).length <= M.LINE_CAP && long.startsWith("It's 2am and I'm listening to the dishwasher"));
ok("…and never mid-word", "It's 2am and I'm listening to the dishwasher because it sounds like rain and I can't sleep.".startsWith(long.slice(0, -1) + " "));
const zh = f("凌晨两点我在听洗碗机的声音因为它听起来像下雨而我怎么也睡不着所以干脆起来写信给一个不认识的人");
ok("a wide character is two columns", zh.endsWith("…") && Array.from(zh).length <= M.LINE_CAP / 2);
ok("a cut line drops the comma it stopped on", !/[,;:，、]…$/.test(f("one two three four five six seven eight nine ten eleven twelve, thirteen fourteen fifteen")));

/* ── which letters ── */
const L = (p: Partial<Letter> & { id: string }): Letter => ({
  author: "author-" + p.id,
  stamp: "tiny-win",
  body: `Letter ${p.id} says something worth catching.`,
  lang: "en",
  created_at: "2026-09-23T10:00:00Z",
  kind: "text",
  media_path: null,
  duration_s: null,
  ...p,
});
const ids = (xs: readonly { id: string }[]) => xs.map((l) => l.id).join();
const desk = [L({ id: "a" }), L({ id: "b" }), L({ id: "v", kind: "voice", media_path: "x.m4a", body: "a caption" }), L({ id: "u", author: null }), L({ id: "e", body: "  " }), L({ id: "c" }), L({ id: "d" })];
eq("text letters with a writer and words, in desk order", ids(M.catchLetters({ desk, passed: [] })), "a,b,c,d");
eq("the unread first, then the ones passed today", ids(M.catchLetters({ desk, passed: ["a", "c"] })), "b,d,a,c");
eq("an empty desk has nothing to catch", ids(M.catchLetters({ desk: [], passed: [] })), "");
const many = Array.from({ length: 15 }, (_, i) => L({ id: "l" + i }));
eq("six at a time", ids(M.catchLetters({ desk: many, passed: [] }, 0)), "l0,l1,l2,l3,l4,l5");
eq("the next visit starts further along", ids(M.catchLetters({ desk: many, passed: [] }, 1)), "l6,l7,l8,l9,l10,l11");
eq("…and wraps round the desk", ids(M.catchLetters({ desk: many, passed: [] }, 2)), "l12,l13,l14,l0,l1,l2");
ok("no letter twice in one sky", new Set(M.catchLetters({ desk: many, passed: [] }, 7).map((l) => l.id)).size === 6);
eq("six or fewer never rotate", ids(M.catchLetters({ desk: many.slice(0, 6), passed: [] }, 3)), "l0,l1,l2,l3,l4,l5");

/* ── the slip ── */
const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}(${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(",")})` : k);
const penPal = (uid: string, o: { upper: boolean; compact: boolean }) => {
  const n = "No." + (o.compact ? "" : " ") + (uid.length * 1000 + 7);
  return o.upper ? n.toUpperCase() : n;
};
const base = {
  t,
  postmark: (iso: string) => "PM" + iso.slice(5, 7),
  postNo: (uid: string) => uid.length * 1000 + 7,
  penPal,
  clockHour: (h: number) => `${h}:00 AM`,
  stampTime: (ms: number) => `ST${ms}`,
  clock: (s: number) => `${s}`,
  stamp: (id: string) => (id === "tiny-win" ? { color: "#2E7D4F", name: "Tiny Win" } : null),
  stickerName: (id: string) => "S:" + id,
};
const LIGHT = { bg: "#FFFFFF", sf: "#FFFFFF", dark: false };
const DARK = { bg: "#000000", sf: "#16181C", dark: true };
const [off] = M.buildSlips([L({ id: "a", body: "Hi. I fixed the wobbly chair today. It took an hour." })], LIGHT, base);
eq("switch off: the number, as Today's card has it", off.who.name, "No. 8007");
eq("…and the mosaic", off.who.face.kind, "mosaic");
eq("the slip carries the first line, the letter the whole of it", [off.line, off.body], ["Hi. I fixed the wobbly chair today.", "Hi. I fixed the wobbly chair today. It took an hour."]);
eq("the topic as the writer picked it", off.topic, "#tiny win");
ok("the paper is the topic's colour, pale; the opened letter's a little stronger", /^#[0-9A-F]{6}$/i.test(off.wash) && /^#[0-9A-F]{6}$/i.test(off.cardWash) && off.wash !== off.cardWash && off.wash.toUpperCase() !== "#2E7D4F");
eq("a light theme has no hairline; the tag is the stamp's own colour", [off.edge, off.tagFill], ["", "#2E7D4F"]);
const on = whoBook({
  identity: true,
  t,
  lang: "en",
  penPal: (uid, o) => (uid ? penPal(uid, { upper: !!o.upper, compact: !!o.compact }) : "UNSIGNED"),
  marks: () => ({ mark: "she", sign: "gemini" }),
});
const [named] = M.buildSlips([L({ id: "a" })], LIGHT, { ...base, who: on });
ok("switch on: the courier's name and the frosted window", named.who.name !== "No. 8007" && named.who.face.kind === "frost");
eq("the star sign shows", named.who.sign, "gemini");
eq("the she/he mark never does", [named.who.mark, named.who.markLabel], [null, ""]);
ok("VoiceOver: who, the topic, the line; no mark", named.a11y.startsWith(named.who.name) && named.a11y.includes("#tiny win") && named.a11y.endsWith(named.line) && !/\bshe\b/.test(named.a11y));
const [plain] = M.buildSlips([L({ id: "n", stamp: "unknown" })], LIGHT, base);
ok("no topic: no tag, a neutral paper", plain.topic === "" && /^#[0-9A-F]{6}$/i.test(plain.wash));
const [dark] = M.buildSlips([L({ id: "a" })], DARK, base);
const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
ok("a dark theme: the slip is the surface, barely tinted", lum(dark.wash) < lum("#303438") && lum(dark.wash) >= lum("#16181C"));
ok("…and its colour is in a hairline, lighter than the slip", /^#[0-9A-F]{6}$/i.test(dark.edge) && lum(dark.edge) > lum(dark.cardWash) && lum(dark.cardWash) >= lum(dark.wash));
eq("…with the same solid tag", dark.tagFill, "#2E7D4F");

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
process.exit(fails ? 1 : 0);
