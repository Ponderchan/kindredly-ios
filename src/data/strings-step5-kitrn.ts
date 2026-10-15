import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE REACT NATIVE TWINS' NEW WORDS (ts-kit-rn).
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English in every language, and
   step 6 writes the eight others natively (lib/i18n's rule: written AS the
   language, not translated). The files in components/10a that read one of
   these import this file for its side effect, so the words are registered
   wherever they are read. Everything else the twins say comes from the
   caller or reuses keys already in nine languages (ld.send — also the
   plane key's VoiceOver name —, nb.turnOn, nb.close, wo.strip.*,
   wo.row.sub, wo.tag). */

strings(
  /* ── en ── */
  {
    // VoiceOver name of the chevron on every secondary page (SecondaryHeader, KBackBar)
    "a11y.back": "Back",
  },
  /* es, pt, id: step 6 */
  {},
  {},
  {},
);
