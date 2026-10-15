import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE SHARED PIECES' NEW WORDS (ts-platform).
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English in every language, and
   step 6 writes the eight others natively (lib/i18n's rule: written AS the
   language, not translated). Each file that uses one of these imports this
   one for its side effect, so the words are registered wherever they are
   read. Everything else these pieces say reuses keys already in nine
   languages (rp.*, set.neverMind, wren.trackClose, cp.leave.keep, su.*). */

strings(
  /* ── en ── */
  {
    // VoiceOver name of the ⋯ that opens Report / Block (components/ReportMenu)
    "rp.menu.a11y": "Report or block",
    // VoiceOver names of the voice letter's play button (AudioCard, KVoiceCard)
    "vo.play": "Play the voice letter",
    "vo.pause": "Pause",
  },
  /* es, pt, id: step 6 */
  {},
  {},
  {},
);
