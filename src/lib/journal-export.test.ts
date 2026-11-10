/* Behaviour lock for the journal's text export (lib/journal-export; owner's audit, 2026-11-10):
   which pages go in (the reader's own, once each, oldest first), what each page says (date and
   time, the stored mood, a plain note of what is attached, the words as written, the drifted
   line), that the file says it is the words only, and its name.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/lib/journal-export.test.ts
   The file imports nothing at runtime, so nothing needs stubbing. */

import { attachedNote, buildJournalExport, exportFileName, exportPage, exportPages, type ExportFormat, type ExportPage } from "./journal-export.ts";

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

const WORDS: Record<string, string> = {
  "sc.journalTitle": "Journal",
  "jx.intro": "Saved from Kindredly on {date}. The words only: photos, voice notes and films stay in the app.",
  "jx.drifted": "A line that drifted out:",
  "jt.pictures": "{n} pictures",
  "jt.picture": "1 picture",
  "jt.aVideo": "a video",
  "jp.say": "Voice note",
};
const MOODS: Record<string, string> = { sleepy: "Sleepy", "group-low": "Low", calm: "Calm" };
const fmt: ExportFormat = {
  t: (k, vars) => {
    const s = WORDS[k] ?? k;
    return vars ? s.replace(/\{(\w+)\}/g, (m, v) => (v in vars ? String(vars[v]) : m)) : s;
  },
  moodLabel: (m) => (m && MOODS[m]) || "",
  date: (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  time: (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(/^24/, "00"),
  duration: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
};

/* local-time dates, so the headings are what a phone in any zone would write */
const at = (y: number, m: number, d: number, h = 21, min = 37) => new Date(y, m - 1, d, h, min).toISOString();
const page = (id: string, date: string, extra: Partial<ExportPage> = {}): ExportPage => ({ id, date, type: "text", body: "", mood: "calm", ...extra });
const NOW = new Date(2026, 10, 10, 9, 5); // 10 November 2026, 09:05 local

/* ── which pages ── */
{
  const entries = [
    page("new", at(2026, 10, 16)),
    page("demo-j-text1", at(2026, 10, 15)),
    page("old", at(2026, 9, 1)),
    page("new", at(2026, 10, 2), { body: "an older copy of the same id" }),
    page("mid", at(2026, 10, 3)),
    page("undated", "not a date"),
  ];
  const before = JSON.stringify(entries);
  eq("the reader's pages, once each, oldest first; an unreadable date goes first", exportPages(entries).map((e) => e.id), ["undated", "old", "mid", "new"]);
  ok("a repeated id is the first copy met", exportPages(entries).find((e) => e.id === "new")?.date === at(2026, 10, 16));
  ok("samples are never exported", !exportPages(entries).some((e) => e.id.startsWith("demo-")));
  ok("the journal isn't touched", JSON.stringify(entries) === before);
  eq("no pages, no export", exportPages([]), []);
  eq("only samples: no export", exportPages([page("demo-a", at(2026, 10, 1))]), []);
}

/* ── what is attached, in plain words ── */
eq("a page of words: nothing", attachedNote(page("t", at(2026, 10, 1)), fmt), "");
eq("three pictures", attachedNote(page("p", at(2026, 10, 1), { type: "photo", media: ["a", "b", "c"], mediaUri: "a" }), fmt), "3 pictures");
eq("one picture", attachedNote(page("p", at(2026, 10, 1), { type: "photo", media: ["a"] }), fmt), "1 picture");
eq("a page from before albums: its one picture", attachedNote(page("p", at(2026, 10, 1), { type: "photo", mediaUri: "a" }), fmt), "1 picture");
eq("a photo page with no pictures left: nothing", attachedNote(page("p", at(2026, 10, 1), { type: "photo" }), fmt), "");
eq("a voice note with its length", attachedNote(page("v", at(2026, 10, 1), { type: "voice", mediaUri: "v.m4a", dur: 74 }), fmt), "Voice note, 1:14");
eq("a voice note with no length kept", attachedNote(page("v", at(2026, 10, 1), { type: "voice", mediaUri: "v.m4a" }), fmt), "Voice note");
eq("a voice page whose file is gone: nothing", attachedNote(page("v", at(2026, 10, 1), { type: "voice", dur: 74 }), fmt), "");
eq("a film with its length", attachedNote(page("f", at(2026, 10, 1), { type: "video", mediaUri: "f.mp4", dur: 12 }), fmt), "a video, 0:12");
eq("mediaUri on a page of words means nothing", attachedNote(page("t", at(2026, 10, 1), { mediaUri: "stray" }), fmt), "");

/* ── one page ── */
{
  const words = exportPage(page("w", at(2026, 10, 14), { body: "  I said no today.\n\nIt felt *fine*.  ", mood: "sleepy" }), fmt);
  eq("date and time, the mood, the words as written (only the ends trimmed)", words, "## Wednesday, October 14, 2026 · 21:37\n\n*Sleepy*\n\nI said no today.\n\nIt felt *fine*.");
  const album = exportPage(page("p", at(2026, 10, 14), { type: "photo", body: "the wall", mood: "group-low", media: ["a", "b"] }), fmt);
  eq("the mood and what is attached on one line", album, "## Wednesday, October 14, 2026 · 21:37\n\n*Low · 2 pictures*\n\nthe wall");
  const voice = exportPage(page("v", at(2026, 10, 14), { type: "voice", body: "", mood: undefined, mediaUri: "v.m4a", dur: 74 }), fmt);
  eq("no stored mood, no words: the heading and what is attached", voice, "## Wednesday, October 14, 2026 · 21:37\n\n*Voice note, 1:14*");
  const bare = exportPage(page("b", at(2026, 10, 14), { body: "just words", mood: "zzz" }), fmt);
  eq("an unknown mood is left out", bare, "## Wednesday, October 14, 2026 · 21:37\n\njust words");
  const drifted = exportPage(page("d", at(2026, 10, 14), { body: "I said no.\nThen I left.", driftedLine: "I said no." }), fmt);
  ok("the drifted line follows the words", drifted.endsWith("I said no.\nThen I left.\n\n> A line that drifted out: I said no."));
  const undated = exportPage(page("u", "not a date", { body: "x" }), fmt);
  ok("an unreadable date is shown as stored, never invented", undated.startsWith("## not a date\n"));
}

/* ── the whole file ── */
{
  const out = buildJournalExport(
    [
      page("late", at(2026, 10, 16), { body: "second", mood: "sleepy" }),
      page("demo-j-photo", at(2026, 10, 15), { body: "ours" }),
      page("early", at(2026, 10, 14), { type: "photo", body: "first", media: ["a", "b", "c"] }),
    ],
    NOW,
    fmt,
  );
  ok("two pages (the sample isn't one)", out.pages === 2);
  ok("it opens with the title", out.text.startsWith("# Journal\n\n"));
  ok("it says when it was saved", out.text.includes("Saved from Kindredly on Tuesday, November 10, 2026."));
  ok("it says it is the words only, and where the rest is", out.text.includes("The words only: photos, voice notes and films stay in the app."));
  ok("oldest first", out.text.indexOf("first") < out.text.indexOf("second") && out.text.indexOf("first") > 0);
  ok("the sample's words aren't in it", !out.text.includes("ours"));
  ok("what is attached is said, not included", out.text.includes("*Calm · 3 pictures*") && !out.text.includes("a,b,c"));
  ok("a rule between the pages", out.text.split("\n\n---\n\n").length === 3);
  ok("it ends on one line break", out.text.endsWith("second\n") && !out.text.endsWith("\n\n"));

  eq("an empty journal: nothing to export", buildJournalExport([], NOW, fmt), { text: "", pages: 0 });
  eq("only samples: nothing to export", buildJournalExport([page("demo-a", at(2026, 10, 1), { body: "ours" })], NOW, fmt), { text: "", pages: 0 });
}

/* ── the file's name ── */
eq("named with the day it was made", exportFileName(NOW), "kindredly-journal-2026-11-10.md");
eq("a one-digit month and day are padded", exportFileName(new Date(2027, 0, 5, 23, 59)), "kindredly-journal-2027-01-05.md");

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
