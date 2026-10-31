/* Behaviour lock for the wrapped monthly report's pure half (wrapped-core.ts). Not wired to a
   runner; run by hand from the repo root with plain node (Node 22.18+ strips the types):
     node src/screens/report/wrapped-core.test.ts
   Every line prints ok/FAIL and the process exits non-zero if any fail. */

import * as W from "./wrapped-core.ts";

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

/* ── the period ── */
const nov3 = new Date(2026, 10, 3, 9);
const lm = W.lastMonth(nov3);
ok("last month is October", lm.month === "2026-10" && lm.start.getDate() === 1 && lm.lastDay.getDate() === 31 && !lm.partial);
const jan = W.lastMonth(new Date(2027, 0, 9));
ok("January's last month is December of the year before", jan.month === "2026-12");
const so = W.thisMonthSoFar(nov3);
ok("this month so far ends today", so.month === "2026-11" && so.lastDay.getDate() === 3 && so.partial);
ok("next report is the 1st", W.nextReportDay(nov3).getMonth() === 11 && W.nextReportDay(nov3).getDate() === 1);

/* ── the hour ── */
ok("under three letters, no hour", W.readHours([23, 1]) === null);
const night = W.readHours([23, 23, 0, 1, 0, 14, 9, 23, 0])!;
ok("night window 23:00–02:00", night.start === 23 && night.kind === "night" && night.inWindow === 7, JSON.stringify(night));
ok("after eleven counts the small hours", night.afterEleven === 7 && night.total === 9);
ok("window ends", W.windowEnds(23).join("|") === "23:00|02:00");
const morning = W.readHours([7, 8, 8, 9, 20])!;
ok("morning window", morning.kind === "morning" && morning.start === 7, JSON.stringify(morning));
const day = W.readHours([13, 14, 14, 15])!;
ok("day window", day.kind === "day");
const eve = W.readHours([18, 19, 19, 20])!;
ok("evening window", eve.kind === "evening" && eve.start === 18);

/* ── the line ── */
const letters = [
  { body: "Hi stranger! How are you today? I reorganised my bookshelf by colour instead of texting him back.", created_at: "2026-10-14T23:10:00Z" },
  { body: "The bus was late again. Something about the rain made the whole street look like a film set somebody forgot to strike.", created_at: "2026-10-02T08:00:00Z" },
];
const line = W.pickLine(letters)!;
ok("the line is a first-person sentence of the reader's", line.text === "I reorganised my bookshelf by colour instead of texting him back.", line?.text);
ok("with its letter's date", line.at === "2026-10-14T23:10:00Z");
ok("questions and greetings are never the line", W.pickLine([{ body: "Hello there my friend how are you. Do you ever think about the moon at night?", created_at: "x" }]) === null);
ok("japanese sentences fit a postcard", W.pickLine([{ body: "今日は駅のホームで知らない人と同じ歌を口ずさんでいた。", created_at: "2026-10-01" }])?.text.startsWith("今日は") === true);

/* ── the tags ── */
const dims = [
  { key: "emotion", score: 80, locked: true, chipId: "dim.chip.emotion.contrast" },
  { key: "sentence", score: 70, locked: true, chipId: "dim.chip.sentence.breathe" },
  { key: "quirks", score: 95, locked: false, chipId: "dim.chip.quirks.has" },
  { key: "rhythm", score: 60, locked: true, chipId: "dim.chip.rhythm.steady" },
];
ok("trusted reads first", W.pickTags(dims, false).join() === "contrast,breathe,steady");
ok("night tag leads at night", W.pickTags(dims, true).join() === "night,contrast,breathe");
ok("every chip has a tag id", W.TAG_IDS.length === 21 && new Set(W.TAG_IDS).size === 21);

/* ── the pairs ── */
ok("twelve pairs", Object.keys(W.PAIRS).length === 12 && W.ARCH_IDS.every((a) => W.isArchId(W.PAIRS[a])));
ok("every pair goes both ways, never to itself", W.ARCH_IDS.every((a) => W.PAIRS[W.PAIRS[a]] === a && W.PAIRS[a] !== a));

/* ── the compare code (the web's decodeVs pattern) ── */
const vs = W.encodeVs("night-courier", "sticker", [{ key: "emotion", score: 81 }]);
ok("vs code is the web's 21-character shape", /^a[0-9a-z][0-4][0-9a-z]{18}$/.test(vs) && vs.length === 21, vs);
ok("vs: arch 1, coat 0, emotion 81 in place 4", vs.slice(0, 3) === "a10" && vs.slice(3 + 3 * 2, 3 + 4 * 2) === (81).toString(36).padStart(2, "0"));
ok("compare url keeps the language path", W.compareUrl("es", "abc") === "https://kindredly.io/es/aura?vs=abc" && W.compareUrl("en", "abc") === "https://kindredly.io/aura?vs=abc");

/* ── the template ── */
ok("she → B", W.pickTemplate("she", "u1", null) === "B");
ok("he → A", W.pickTemplate("he", "u1", null) === "A");
ok("a choice wins", W.pickTemplate("she", "u1", "A") === "A");
const th = ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"].map((s) => W.pickTemplate("they", s, null));
ok("they: stable per reader, both kinds appear", th.join() === ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"].map((s) => W.pickTemplate(null, s, null)).join() && th.includes("A") && th.includes("B"));

/* ── snapshots and changes ── */
const sep: W.Snapshot = { month: "2026-09", arch: "window-watcher", tags: ["world", "steady"], hour: 21, letters: 6, desks: 29 };
const oct: W.Snapshot = { month: "2026-10", arch: "night-courier", tags: ["night", "steady"], hour: 23, letters: 9, desks: 41 };
const ch = W.changesSince(sep, oct, (id) => id, (id) => "#" + id);
ok("changes: type, letters, desks, hour (four at most)", ch.map((c) => c.key).join() === "type,letters,desks,hour", JSON.stringify(ch));
ok("no previous month, no changes", W.changesSince(null, oct, String, String).length === 0);
ok("same type says so", W.changesSince({ ...sep, arch: "night-courier", letters: 9, desks: 41, hour: 23 }, oct, String, String).map((c) => c.key).join() === "typeSame,hourSame,newTag");
ok("previous snapshot is the latest before", W.previousSnapshot([oct, sep, { ...sep, month: "2026-08" }], "2026-10")?.month === "2026-09");
ok("keep: one per month, newest first", W.keepSnapshot([sep, oct], { ...oct, letters: 10 }).map((s) => s.month + s.letters).join() === "2026-1010,2026-096");

/* ── the view ── */
const t = (key: string, vars?: Record<string, string | number>) => {
  if (key === "rw.case") return "lower";
  if (key === "rw.share.compareMsg") return "Compare: {url}";
  return vars ? `${key}(${Object.entries(vars).filter(([k]) => k !== "wren").map(([k, v]) => `${k}=${v}`).join(",")})` : key;
};
const fmt: W.WrappedFmt = { t, wren: "Wren", monthName: (d, s) => (s ? "OCT" : "October"), dayMonth: (d) => `${d.getMonth() + 1}/${d.getDate()}` };
const facts: W.WrappedFacts = {
  period: lm,
  arch: "night-courier",
  skin: "sticker",
  dims,
  letters: [
    { body: letters[0].body, created_at: "2026-10-14T23:10:00", reads: 5 },
    { body: letters[1].body, created_at: "2026-10-02T23:40:00", reads: 4 },
    { body: "Short one.", created_at: "2026-10-03T00:20:00", reads: 0 },
  ],
  repliesReceived: 2,
  kindredsMade: 1,
  prev: sep,
  member: false,
  prompt: "write to someone about the last thing that made you laugh",
  lang: "en",
  now: nov3,
};
const v = W.wrappedView(facts, fmt);
ok("all eight cards", v.cards.join() === "cover,far,line,vibe,hour,click,share,next", v.cards.join());
ok("desks are Σ reads", v.desks === 9 && v.farBig === "9");
ok("pair is the window watcher", v.pair === "window-watcher" && v.pairName === "arch.window-watcher.name");
ok("night hour with after-eleven", v.hourNight && v.hourAfter === "rw.hour.after(n=3,m=3)", v.hourAfter);
ok("free reader: changes are locked", v.locked && v.changes.length > 0);
ok("member: unlocked", !W.wrappedView({ ...facts, member: true }, fmt).locked);
ok("the line is set in curly quotes", v.line.startsWith("“") && v.line.endsWith("”"));
ok("the line never rides the share message", !v.shareMessage.includes("bookshelf") && !v.compareMessage.includes("bookshelf"));
ok("compare message carries the url", v.compareMessage === "Compare: " + v.compareUrl);
const empty = W.wrappedView({ ...facts, letters: [], prev: null }, fmt);
ok("no letters: cover, vibe, click, share, next", empty.cards.join() === "cover,vibe,click,share,next", empty.cards.join());
ok("no letters, no previous: first note, nothing locked", empty.firstNote !== "" && !empty.locked);
const zero = W.wrappedView({ ...facts, letters: facts.letters.map((l) => ({ ...l, reads: 0 })) }, fmt);
ok("no reads yet: the hero is the letters, the zero lines", zero.farBig === "3" && zero.farUnit.startsWith("rw.far.unitzero"), zero.farUnit);

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
process.exit(fails ? 1 : 0);
