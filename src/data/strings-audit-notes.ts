import { strings } from "../lib/i18n";

/* THE JOURNAL'S NEW WORDS FROM THE OWNER'S AUDIT (2026-11-10): editing a sealed page, searching
   Notes, and taking the journal out of the phone as a text file.
   ────────────────────────────────────────────────────────────────────────
   ENGLISH ONLY for now: t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires; fr de it ja ko are optional and left out until they are written.

   Reused, no new copy: jd.delete, jd.more, je.leaveTitle, cp.leave.discard, so.kept (the edit's
   send-off: "KEPT · OCT 14"), sc.ph, sc.journalTitle, cp.fail.generic, ml.cancel (the search
   field's Cancel).

   Imported for its side effect by the screens that say these lines: the journal page
   (NotePageNative, app/journal/[id]), the composer (NoteComposeNative, app/journal-entry), Notes
   (useNotesModel) and Settings (useSettingsModel). */

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
  },
  /* ── es ── */
  {},
  /* ── pt ── */
  {},
  /* ── id ── */
  {},
);
