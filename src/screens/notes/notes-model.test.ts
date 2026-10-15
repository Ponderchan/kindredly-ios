/* Behaviour lock for the Notes tab's model (screens/notes/notes-model): the
   page order and de-duplication, every label (the mood name in Card and
   List, not in Grid, never for a page with no stored mood), the media each
   kind carries (a photo page's cover is the one coverIndex names), the List
   line, the four groups over the thirty faces, the calendar (bounds,
   paging, lead days per first weekday, today / future, the newest page per
   day, counts and footer), the button's six squares, the stored view, the
   Grid's columns (one at accessibility text sizes, as Swift), and the
   evening question's exact order — the rules both
   renderers draw, so a remote flip between SwiftUI and React Native never
   changes what the reader sees.
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/notes/notes-model.test.ts
   data/moods imports lib/i18n (React Native), so a load hook stands in a
   two-line i18n for this process only, and adds ".ts" to the extensionless
   relative imports Metro wants. Every line prints ok/FAIL and the process
   exits non-zero if any fail. */

import { registerHooks } from "node:module";

const STUBS: Record<string, string> = {
  i18n: `export const t = (k) => k; export const getLang = () => "en";`,
};
registerHooks({
  resolve(specifier, context, next) {
    const m = /(?:^|\/)(i18n)$/.exec(specifier);
    if (m) return { url: "notes-stub:" + m[1], shortCircuit: true };
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("notes-stub:")) return { format: "module", source: STUBS[url.slice("notes-stub:".length)], shortCircuit: true };
    return next(url, context);
  },
});

const M = await import("./notes-model.ts");
const Moods = await import("../../data/moods.ts");
type Entry = import("../../lib/journal").JournalEntry;
type Fmt = import("./notes-model").NotesFormat;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  ok(name + (g === w ? "" : `  (got ${g}, want ${w})`), g === w);
};

/* a fixed, readable format: English words, fixed dates (en-US), no React */
const WORDS: Record<string, string> = {
  "jt.pictures": "{n} pictures",
  "jt.picture": "1 picture",
  "jt.aVideo": "a video",
  "jp.say": "Voice note",
  "jp.write": "Text note",
  "jt.notesN": "{n} notes",
  "jt.notes1": "1 note",
  "jt.notesNone": "No notes",
  "jt.dayA11y": "{date}, {count}",
  "jt.legendA11y": "{group}, {count}",
  "mood.group.calm": "Calm",
  "mood.group.happy": "Happy",
  "mood.group.tired": "Tired",
  "mood.group.low": "Low",
};
const t = (k: string, vars?: Record<string, string | number>) => {
  const s = WORDS[k] ?? k;
  return vars ? s.replace(/\{(\w+)\}/g, (m, v) => (v in vars ? String(vars[v]) : m)) : s;
};
const fmt: Fmt = {
  t,
  moodName: (id) => Moods.getMood(id).n,
  day: (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
  time: (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(/^24/, "00"),
  longDate: (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
  duration: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
  monthTitle: (d) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  upper: (s) => s.toLocaleUpperCase("en-US"),
};

/* local-time dates, so the day keys are what a phone in any zone would see */
const at = (y: number, m: number, d: number, h = 21, min = 37) => new Date(y, m - 1, d, h, min).toISOString();
const page = (id: string, date: string, extra: Partial<Entry> = {}): Entry => ({ id, date, type: "text", body: "", mood: "calm", ...extra }) as Entry;
const NOW = new Date(2026, 9, 16, 15, 0); // Friday 16 October 2026, 15:00

/* ── the groups ───────────────────────────────────────────────────────── */
{
  const all = Moods.MOOD_GROUPS.flatMap((g) => [...Moods.MOOD_GROUP_FACES[g]]);
  eq("the four groups in the owner's order", Moods.MOOD_GROUPS, ["calm", "happy", "tired", "low"]);
  ok("every one of the thirty faces is in exactly one group", all.length === 30 && new Set(all).size === 30 && Moods.MOOD_IDS.every((id) => all.includes(id)));
  eq("default faces (owner question 8): Calm, Cheerful, Sleepy, Nervous", Moods.MOOD_GROUP_DEFAULT, { calm: "calm", happy: "cheerful", tired: "sleepy", low: "nervous" });
  ok("each default is its group's first face", Moods.MOOD_GROUPS.every((g) => Moods.MOOD_GROUP_FACES[g][0] === Moods.MOOD_GROUP_DEFAULT[g]));
  ok("the angry faces are Low (owner: no fifth group)", ["angry", "mad", "frustrated", "irritable", "grumpy"].every((id) => Moods.moodGroup(id) === "low"));
  eq("legacy ids go by their face (tender→in-love: happy, heavy→drained: tired, restless→irritable: low)", ["tender", "heavy", "restless"].map(Moods.moodGroup), ["happy", "tired", "low"]);
  eq("missing and unknown moods are Calm", [Moods.moodGroup(undefined), Moods.moodGroup(""), Moods.moodGroup("zzz")], ["calm", "calm", "calm"]);
  ok("a stored face or a legacy id is named; nothing or junk is not", Moods.isNamedMood("sleepy") && Moods.isNamedMood("tender") && !Moods.isNamedMood(undefined) && !Moods.isNamedMood("") && !Moods.isNamedMood("zzz"));
}

/* ── order and identity ───────────────────────────────────────────────── */
{
  const a = page("a", at(2026, 10, 14));
  const b = page("b", at(2026, 10, 15));
  const dup = page("a", at(2026, 10, 1), { body: "old copy" });
  const bad = page("x", "not a date");
  const ordered = M.orderPages([a, b, dup, bad]);
  eq("newest first; a repeated id keeps its first copy; an unreadable date sorts last", ordered.map((e) => e.id), ["b", "a", "x"]);
  ok("the first copy of a repeated id wins", ordered.find((e) => e.id === "a")?.body === "");
  const input = [a, b];
  M.orderPages(input);
  ok("ordering never mutates its input", input[0] === a && input[1] === b);
}

/* ── labels ───────────────────────────────────────────────────────────── */
{
  const n = M.buildNote(page("p1", at(2026, 10, 14, 21, 37), { mood: "sleepy", body: "Long day.\nSecond line." }), fmt);
  eq("Card label: day · time · face", n.label, "OCT 14 · 21:37 · Sleepy");
  eq("Grid label: the day only (owner question 9)", n.shortLabel, "OCT 14");
  eq("List label: day · face", n.listLabel, "OCT 14 · Sleepy");
  eq("its group", n.group, "tired");
  eq("List line: the first line of the words", [n.listLine, n.listLineIsWords], ["Long day.", true]);
  ok("VoiceOver hears the long date, time, face, kind and words", n.a11y === "Wednesday, October 14, 21:37, Sleepy, Text note, Long day. Second line.");
  const none = M.buildNote(page("p2", at(2026, 10, 14, 9, 5), { mood: undefined as unknown as Entry["mood"] }), fmt);
  eq("no stored mood: no name anywhere, Calm colour", [none.label, none.listLabel, none.group], ["OCT 14 · 09:05", "OCT 14", "calm"]);
  ok("no stored mood: VoiceOver says no face either", !none.a11y.includes("Calm"));
  const legacy = M.buildNote(page("p3", at(2026, 10, 14), { mood: "wistful" as Entry["mood"] }), fmt);
  eq("a legacy mood is named by its face", [legacy.listLabel, legacy.mood, legacy.group], ["OCT 14 · Sleepy", "sleepy", "tired"]);
  const midnight = M.buildNote(page("p4", at(2026, 10, 14, 0, 5)), fmt);
  ok("midnight reads 00:05, never 24:05", midnight.label.includes("00:05"));
  const long = M.buildNote(page("p5", at(2026, 10, 14), { body: "word ".repeat(80) }), fmt);
  ok("VoiceOver reads at most ~120 characters of the words, cut at a space, with …", long.a11y.endsWith("…") && long.a11y.length < 200);
}

/* ── media per kind ───────────────────────────────────────────────────── */
{
  const album = M.buildNote(page("ph", at(2026, 10, 14), { type: "photo", media: ["f1", "f2", "f3"], mediaUri: "f1" }), fmt);
  eq("an album: its cover and +2", [album.photo, album.photoMore, album.video, album.voice], ["f1", 2, null, null]);
  eq("an album with no words: List says how many", [album.listLine, album.listLineIsWords], ["3 pictures", false]);
  const covered = M.buildNote(page("phc", at(2026, 10, 14), { type: "photo", media: ["fog", "bridge"], coverIndex: 1, mediaUri: "bridge" }), fmt);
  eq("the cover the detail page picked (coverIndex 1), not the first picture; +1 still counts the rest", [covered.photo, covered.photoMore], ["bridge", 1]);
  eq("…even before loadJournal re-resolved mediaUri (the stored album and index decide)", M.buildNote(page("phc2", at(2026, 10, 14), { type: "photo", media: ["fog", "bridge"], coverIndex: 1, mediaUri: "fog" }), fmt).photo, "bridge");
  eq("a cover index past the album (pictures removed) falls back to the first", M.buildNote(page("phc3", at(2026, 10, 14), { type: "photo", media: ["fog"], coverIndex: 4 }), fmt).photo, "fog");
  eq("a negative or fractional cover index falls back to the first", [-1, 0.5].map((coverIndex) => M.coverOf(page("phc4", at(2026, 10, 14), { type: "photo", media: ["a", "b"], coverIndex }))), ["a", "a"]);
  eq("coverOf is null off photo pages", M.coverOf(page("v0", at(2026, 10, 14), { type: "video", media: ["x"], mediaUri: "x" })), null);
  const single = M.buildNote(page("ph1", at(2026, 10, 14), { type: "photo", mediaUri: "only" }), fmt);
  eq("a photo page saved before albums: its one picture, no +N", [single.photo, single.photoMore, single.listLine], ["only", 0, "1 picture"]);
  const voice = M.buildNote(page("v", at(2026, 10, 14), { type: "voice", mediaUri: "rec.m4a", dur: 35 }), fmt);
  eq("a voice page: its file, no picture; length 0:35", [voice.voice, voice.photo, voice.video, voice.duration, voice.durationS], ["rec.m4a", null, null, "0:35", 35]);
  eq("a voice page with no words: List reads Voice note · 0:35", voice.listLine, "Voice note · 0:35");
  const video = M.buildNote(page("vd", at(2026, 10, 14), { type: "video", mediaUri: "film.mp4", dur: 15, body: "the sea" }), fmt);
  eq("a video page: its file for the poster, never as a photo", [video.video, video.photo, video.voice, video.duration], ["film.mp4", null, null, "0:15"]);
  const text = M.buildNote(page("t", at(2026, 10, 14), { mediaUri: "stray" }), fmt);
  eq("a text page never shows media, whatever mediaUri says", [text.photo, text.video, text.voice, text.duration], [null, null, null, ""]);
  ok("a demo page is a sample", M.buildNote(page("demo-j-x", at(2026, 10, 14)), fmt).sample && !text.sample);
}

/* ── the waveform ─────────────────────────────────────────────────────── */
{
  const seed = 2166136261;
  const bars = Array.from({ length: 40 }, (_, i) => M.waveHeight(seed, i));
  ok("bar heights stay within 6…34", bars.every((h) => h >= 6 && h <= 34 && Number.isInteger(h)));
  ok("the same seed always draws the same bars", bars.join() === Array.from({ length: 40 }, (_, i) => M.waveHeight(seed, i)).join());
  ok("bars vary", new Set(bars).size > 8);
  // pinned so Swift's copy (KNoteCard.swift waveHeight) can be checked against the same numbers
  eq("pinned heights for seed 12345, bars 0-4", [0, 1, 2, 3, 4].map((i) => M.waveHeight(12345, i)), [32, 29, 18, 18, 28]);
  eq("pinned heights for the largest seed, bars 0-2", [0, 1, 2].map((i) => M.waveHeight(4294967295, i)), [8, 16, 7]);
}

/* ── views ────────────────────────────────────────────────────────────── */
{
  eq("the button cycles Card → Grid → List → Card", [M.nextView("card"), M.nextView("grid"), M.nextView("list")], ["grid", "list", "card"]);
  eq("stored views: compact is List, card/nothing/junk is Card", ["compact", "list", "grid", "card", null, "wall"].map((v) => M.parseStoredView(v)), ["list", "list", "grid", "card", "card", "card"]);

  // iOS fontScale per text size (RCTAccessibilityManager): large 1.0, xxxLarge 1.353, AX1 1.786, AX5 3.571
  eq("Grid is two to a row up to xxxLarge (not an accessibility size in SwiftUI either)", [1, 1.235, 1.353].map((s) => M.noteColumns("grid", s)), [2, 2, 2]);
  eq("Grid is one to a row at every accessibility size, as KNotesScreen.columns", [1.786, 2.143, 3.571].map((s) => M.noteColumns("grid", s)), [1, 1, 1]);
  eq("Card and List are always one to a row", [M.noteColumns("card", 1), M.noteColumns("list", 1), M.noteColumns("card", 3)], [1, 1, 1]);
  const five = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  eq("rows of two keyed by their first note; an odd last note alone", M.noteRows(five, 2).map((r) => [r.key, r.notes.map((n) => n.id).join("")]), [["a", "ab"], ["c", "cd"], ["e", "e"]]);
  eq("rows of one: each note its own row, keyed by itself", M.noteRows(five, 1).map((r) => r.key), ["a", "b", "c", "d", "e"]);
  eq("no notes, no rows", M.noteRows([], 2), []);
}

/* ── the calendar ─────────────────────────────────────────────────────── */
{
  const pages = [
    page("o14a", at(2026, 10, 14, 8), { mood: "cheerful" }),
    page("o14b", at(2026, 10, 14, 22), { mood: "nervous" }), // the day's newest
    page("o02", at(2026, 10, 2), { mood: "sleepy" }),
    page("s20", at(2026, 9, 20), { mood: "calm" }),
    page("future", at(2026, 10, 30), { mood: "calm" }),
  ];
  const b = M.monthBounds(pages, NOW);
  eq("bounds: from the earliest month with a page to this month", b, { min: { y: 2026, m: 8 }, max: { y: 2026, m: 9 } });
  eq("no pages: only this month", M.monthBounds([], NOW), { min: { y: 2026, m: 9 }, max: { y: 2026, m: 9 } });
  eq("a bogus old date can't open more than 120 months", M.monthBounds([page("old", new Date(1970, 0, 1).toISOString())], NOW).min, { y: 2016, m: 10 });
  eq("paging stops at both ends", [M.stepMonth({ y: 2026, m: 9 }, 1, b), M.stepMonth({ y: 2026, m: 8 }, -1, b), M.stepMonth({ y: 2026, m: 9 }, -1, b)], [{ y: 2026, m: 9 }, { y: 2026, m: 8 }, { y: 2026, m: 8 }]);

  const oct = M.buildMonth(pages, { y: 2026, m: 9 }, NOW, 0, fmt);
  eq("title in capitals", oct.title, "OCTOBER 2026");
  eq("Sunday first: October 2026 starts on a Thursday → 4 blank cells", oct.lead, 4);
  eq("Monday first (de/fr/es/it) → 3 blank cells", M.buildMonth(pages, { y: 2026, m: 9 }, NOW, 1, fmt).lead, 3);
  eq("31 days", oct.days.length, 31);
  const d14 = oct.days[13];
  eq("a day shows its newest page's group, and a tap goes to that page", [d14.group, d14.targetId, d14.count, d14.mood], ["low", "o14b", 2, "nervous"]);
  eq("its VoiceOver line: the date and the count", d14.a11y, "Wednesday, October 14, 2 notes");
  const d3 = oct.days[2];
  eq("a day with no page: nothing to tap, the date alone", [d3.group, d3.targetId, d3.a11y], [null, null, "Saturday, October 3"]);
  ok("today is marked, the days after it are future", oct.days[15].today && !oct.days[15].future && oct.days[16].future && !oct.days[14].future);
  ok("a future-dated page still colours its (future) day", oct.days[29].group === "calm" && oct.days[29].future);
  ok("…but a future day does nothing when tapped", oct.days[29].targetId === null);
  eq("counts per group, every page counted (calm, happy, tired, low)", oct.counts, [1, 1, 1, 1]);
  eq("footer drawn in capitals, read in sentence case", [oct.footer, oct.footerA11y, oct.total], ["4 NOTES", "4 notes", 4]);
  eq("legend for VoiceOver", oct.legendA11y, ["Calm, 1 note", "Happy, 1 note", "Tired, 1 note", "Low, 1 note"]);
  ok("this month: back yes, next no (never the future)", oct.canPrev && !oct.canNext);
  const sep = M.buildMonth(pages, { y: 2026, m: 8 }, NOW, 0, fmt);
  ok("the earliest month: next yes, back no", sep.canNext && !sep.canPrev && sep.footer === "1 NOTE");
  eq("an empty month says so", M.buildMonth([], { y: 2026, m: 9 }, NOW, 0, fmt).footer, "NO NOTES");
  eq("a month asked for outside the bounds is pulled back in", M.buildMonth(pages, { y: 2027, m: 3 }, NOW, 0, fmt).key, "2026-10");
}

/* ── the six squares ──────────────────────────────────────────────────── */
{
  const days = [1, 3, 5, 7, 9, 11, 13].map((d, i) => page("d" + d, at(2026, 10, d), { mood: (["calm", "cheerful", "sleepy", "nervous", "calm", "cheerful", "sleepy"] as const)[i] }));
  const extra = page("d13late", at(2026, 10, 13, 23), { mood: "angry" });
  eq("the latest six days with pages, oldest to newest, each its newest page", M.recentGroups([...days, extra], NOW), ["happy", "tired", "low", "calm", "happy", "low"]);
  eq("fewer than six days: only those", M.recentGroups([days[0]], NOW), ["calm"]);
  eq("last month's pages and future pages don't count", M.recentGroups([page("s", at(2026, 9, 30)), page("f", at(2026, 10, 20))], NOW), []);
  eq("pages this month", M.pagesThisMonth([...days, page("s", at(2026, 9, 30))], NOW), 7);
}

/* ── the evening question ─────────────────────────────────────────────── */
{
  const base = { prefsUnreadable: false, dailyLine: false, morningQuestion: false, notifyOn: true, answered: false, pages: 1 };
  eq("first real page, nothing on → ask", M.decideEvening(base), { show: "ask", spendFlag: false });
  eq("prefs unreadable → nothing, flag kept (ask another day)", M.decideEvening({ ...base, prefsUnreadable: true, dailyLine: true }), { show: "none", spendFlag: false });
  eq("already on → the off row, flag spent", M.decideEvening({ ...base, dailyLine: true }), { show: "on", spendFlag: true });
  eq("already on, Notifications off on this phone → no row, flag spent", M.decideEvening({ ...base, dailyLine: true, notifyOn: false }), { show: "none", spendFlag: true });
  eq("already on with NO pages → the off row anyway (its only off switch)", M.decideEvening({ ...base, dailyLine: true, pages: 0 }), { show: "on", spendFlag: true });
  eq("an earlier yes still shows its row (on is checked before answered)", M.decideEvening({ ...base, dailyLine: true, answered: true }), { show: "on", spendFlag: true });
  eq("no pages, nothing on → nothing", M.decideEvening({ ...base, pages: 0 }), { show: "none", spendFlag: false });
  eq("answered before → nothing", M.decideEvening({ ...base, answered: true }), { show: "none", spendFlag: false });
  eq("the morning question on → nothing, flag spent", M.decideEvening({ ...base, morningQuestion: true }), { show: "none", spendFlag: true });
  eq("answered AND morning on → nothing, no new write", M.decideEvening({ ...base, answered: true, morningQuestion: true }), { show: "none", spendFlag: false });
}

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
