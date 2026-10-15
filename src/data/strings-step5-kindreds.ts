import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE KINDREDS TAB'S NEW WORDS (slice "kindreds").
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English in every language, and
   step 6 writes the eight others natively (written AS the language, not
   translated). The Kindreds route imports this file for its side effect
   (src/app/(tabs)/kindreds.tsx), and so does the dev page.

   Everything else the tab says reuses keys already in nine languages:
   kindreds.title / toAnswer / toAnswerOne / allAnswered / said, kd.tab.*,
   state.*, kd.closesIn / closesDay / expiredRow / accountClosed /
   groupExpired / aKindred, mm.you, kd.menu.*, rp.*, kd.showing / clear,
   kd.noKindredsYet / penPalsEmpty / toDesk, kd.legendCloser, state.yourTurn
   (the orbit legend's second item, as a sentence: "Your turn"), wo.tag,
   wo.row.sub, nb.turnOn / close, mk.ofFive, pw.stub.no, ld.unsigned, and
   auth.err.offline ("Not connected.") for the line shown when the list
   couldn't be read and nothing was kept.

   After this release kd.legendTurn ("Blue dot = your turn": nothing on
   the 10a page is a dot), kd.closest (CLOSEST TO YOU, dropped by default,
   owner question 4), kd.skyOpen, kd.skyFold and kd.filter.* go unused. */

strings(
  /* ── en ── */
  {
    // VoiceOver's name for the icon-only chip that opens and folds the orbit
    // (the system adds on / off); replaces the bare OPEN / FOLD as a label
    "kd.orbit": "Orbit",
  },
  /* es, pt, id: step 6 */
  {},
  {},
  {},
);
