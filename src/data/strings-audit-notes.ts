import { strings } from "../lib/i18n";

/* THE JOURNAL'S NEW WORDS FROM THE OWNER'S AUDIT (2026-11-10): editing a sealed page, searching
   Notes, and taking the journal out of the phone as a text file.
   ────────────────────────────────────────────────────────────────────────
   ENGLISH ONLY for now: t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires; fr de it ja ko are optional and left out until they are written.

   Reused, no new copy: jd.delete, jd.more, je.leaveTitle, cp.leave.discard, so.kept (the edit's
   send-off: "KEPT · OCT 14"), sc.ph, sc.journalTitle (also the exported file's title),
   cp.fail.generic, ml.cancel (the search field's Cancel), and in the exported file Notes' own
   words for what a page holds: jt.pictures, jt.picture, jp.say, jt.aVideo.

   Imported for its side effect by the screens that say these lines: the journal page
   (NotePageNative, app/journal/[id]), the composer (NoteComposeNative, app/journal-entry), Notes
   (useNotesModel), Settings (useSettingsModel) and the export (lib/journal-export-file). */

strings(
  /* ── en · English ── */
  {
    // EDIT A PAGE
    // the journal page's ⋯ menu, above "Delete" (jd.delete) and under "Let This Drift Out": iOS's own pull-down menu, Title Case like its neighbours; one word
    "jd.edit": "Edit",
    // the composer's big key while a sealed page is being changed, where a new page says "Seal it here" (sc.seal); drawn in capitals, about 14 characters at most
    "nc.edit.save": "Save changes",
    // the same key while the change is being saved, where a new page says "Sealing…" (sc.sealing)
    "nc.edit.saving": "Saving…",
    // the leave sheet's body when ✕ or a swipe back would throw away changes to a sealed page (title: je.leaveTitle "Leave this page?"; its one button: DISCARD); two short sentences, like je.leaveBody
    "je.edit.leaveBody": "Your changes aren't saved yet. The page stays as it was.",

    // SEARCH NOTES
    // VoiceOver's name for the magnifier key in the Notes header (beside the view and calendar keys; icon only, never drawn)
    "jt.search.a11y": "Search your notes",
    // the search field's placeholder, in the header where the title was; lowercase like the app's other placeholders, about 22 characters at most (Cancel sits beside it)
    "jt.search.ph": "search your pages",
    // VoiceOver's name for the ⊗ inside the search field: it empties the field (not "reset")
    "jt.search.clear": "Clear search",
    // the one quiet line under the search field when no page holds what was typed; centred, may wrap to two lines
    "jt.search.none": "No page has those words.",

    // EXPORT THE JOURNAL
    // Settings, THE QUIET, the row directly under "Unsent letters" (set.drafts): its label, sentence case like the rows around it
    "set.export": "Export my journal",
    // the line under that label (two or three lines at most, like set.notify.sub): where the journal lives, and — it must stay honest —
    // that the file holds the words only; photos, voice notes and films are NOT in it
    "set.export.sub": "Your journal lives only on this phone. This saves its words as one file; photos, voice and films stay in the app.",
    // the same line when the journal has no page yet: the row then does nothing
    "set.export.none": "Your journal lives only on this phone. Nothing to export yet.",
    // INSIDE THE EXPORTED FILE (a Markdown text file the reader opens elsewhere), under the title "Journal" (sc.journalTitle):
    // {date} is the day it was saved, written out in full in the reader's language ("Tuesday, November 10, 2026").
    // It must say plainly that the file is the words only and that pictures and recordings are still in the app
    "jx.intro": "Saved from Kindredly on {date}. The words only: photos, voice notes and films stay in the app.",
    // in the file, before a page's line that drifted out (the line itself follows on the same line); ends with a colon or the language's own
    "jx.drifted": "A line that drifted out:",
  },
  /* ── es ── */
  {},
  /* ── pt ── */
  {},
  /* ── id ── */
  {},
);
