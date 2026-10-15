import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE NOTES TAB'S NEW WORDS (slice "notes").
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English in every language, and
   step 6 writes the eight others natively (written AS the language, not
   translated). Every file that says one of these imports this one for its
   side effect: the Notes route, the composer, the sparks, the detail page
   and the dev page.

   Sentence case on purpose. Labels that are drawn in capitals ("9 NOTES",
   the month) are upper-cased for display in the locale
   (toLocaleUpperCase), so VoiceOver can read the same key in its own case:
   lower-casing an all-caps key would turn German nouns ("3 Notizen") into
   "3 notizen".

   Everything else Notes says reuses keys already in nine languages:
   jt.notes, jt.viewCard, jt.viewMenu, jt.moments, jt.said, jt.justYou,
   jt.emptyTitle, jt.emptyBody, jt.new, jp.write, jp.say ("Voice note" in
   "Voice note · 0:35"), jt.picture, jt.pictures, jt.aVideo, ev.*,
   sc.askMood, sc.moodHint (the picker's hint), wren.trackClose (closing
   the calendar), js.1, and moodName() for the thirty faces.

   After this release jt.viewCompact, jt.tape, jt.month1 / monthN /
   monthNone (the old calendar footer), jt.typeIt / snapIt / sayIt /
   filmIt, and the dead JournalCard's jc.* and MoodModal's mm.title /
   mm.sub go unused. */

strings(
  /* ── en ── */
  {
    // the view button's three values (jt.viewCard "Card" already exists)
    "jt.viewGrid": "Grid",
    "jt.viewList": "List",
    // VoiceOver's name for the view button; its value is the view in use ("Card")
    "jt.viewA11y": "View",
    // VoiceOver's name for the calendar button (it read only a number before)
    "jt.calendar": "Calendar",
    "jt.prevMonth": "Previous month",
    "jt.nextMonth": "Next month",
    // the calendar footer and its VoiceOver forms; drawn upper-cased ("9 NOTES")
    "jt.notesN": "{n} notes",
    "jt.notes1": "1 note",
    "jt.notesNone": "No notes",
    // a calendar day for VoiceOver: "Wednesday, October 14, 2 notes"
    "jt.dayA11y": "{date}, {count}",
    // a legend item for VoiceOver: "Calm, 3 notes"
    "jt.legendA11y": "{group}, {count}",
    // a voice note's VoiceOver actions (ff.play is a game's "Play" and translates differently)
    "jt.play": "Play",
    "jt.pause": "Pause",
    // the four mood groups: the picker's colour blocks, the calendar legend for VoiceOver
    "mood.group.calm": "Calm",
    "mood.group.happy": "Happy",
    "mood.group.tired": "Tired",
    "mood.group.low": "Low",
    // two empty-page sparks that were passed to t() as raw English and never keyed
    "js.42": "I hope you still remember…",
    "js.43": "behind the \"I'm fine\"…",
    // the detail page when the page isn't there (torn out, or unreadable), instead of a blank page
    "jd.notFound": "This page isn't here any more.",
    // the leave question when the page has a picture, a film or a recording but no words
    // (je.leaveBody says "You've written something", which isn't true then)
    "je.leaveBodyMedia": "What's on this page isn't kept until you seal it.",
  },
  /* es, pt, id: step 6 */
  {},
  {},
  {},
);
