import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE COMPOSE PAGE'S NEW WORDS (slice "compose").
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English in every language, and
   step 6 writes the eight others natively (written AS the language, not
   translated). The compose route imports this file for its side effect
   (src/app/compose.tsx), and so does the dev page.

   Everything else the page says reuses keys already in nine languages:
   cp.header / travel / needStamp / sending / cap / repliesFree / discover /
   askLabel / askPh / voiceNote / voiceLine.ph / voiceLine.prompt /
   forThisLetter / recent / tray.ask / tray.voice / leave.* / gate.* /
   signin.* / fail.* / signup.reason / morningTitle / morningNote,
   ld.send (the key where LET IT TRAVEL doesn't fit), ui.overLimit (the
   count past the ceiling), lang.send, wr.ladder.* / wr.mood.*, sp.*, and
   wren.trackClose ("Close": the ×, and the + while its tray is open). */

strings(
  /* ── en ── */
  {
    // the free writer's letters left today, right-aligned on the small line
    // above the toolbar (owner question 6's default); First Class sees none
    "cp.left.n": "{n} LEFT TODAY",
    "cp.left.one": "1 LEFT TODAY",
    "cp.left.none": "NONE LEFT TODAY",
    // the count near the 1000 ceiling (past it, ui.overLimit); it used to be
    // `${n} left` in English for every language
    "cp.charsLeft": "{n} LEFT",
    // Wren's line in the language's own quotation marks (they were “ ” for
    // every language); step 6 writes «…», 「…」 and „…“ where they belong
    "cp.quote": "“{s}”",
    // VoiceOver: the + key, the stamp slot and key, the editor, the locked cell
    "cp.plus.a11y": "Add a question or a voice letter",
    "cp.stamp.a11y": "Choose a mood stamp",
    "cp.stampChosen.a11y": "Mood stamp: {name}. Change it",
    "cp.editor.a11y": "Your letter",
    "cp.voiceLocked.a11y": "First Class only",
    // VoiceOver: why ASK A QUESTION is off while speaking (a recording carries no question)
    "cp.askVoice.a11y": "Only with a written letter",
  },
  /* es, pt, id: step 6 */
  {},
  {},
  {},
);
