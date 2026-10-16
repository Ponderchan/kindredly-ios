import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE REACT NATIVE TWINS' NEW WORDS (ts-kit-rn).
   ────────────────────────────────────────────────────────────────────────
   All nine languages: step 6 wrote the eight beside English natively (lib/i18n's rule: written AS the
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
  /* ── es ── */
  {
    "a11y.back": "Atrás",
  },
  /* ── pt ── */
  {
    "a11y.back": "Voltar",
  },
  /* ── id ── */
  {
    "a11y.back": "Kembali",
  },
  /* ── fr ── */
  {
    "a11y.back": "Retour",
  },
  /* ── de ── */
  {
    "a11y.back": "Zurück",
  },
  /* ── it ── */
  {
    "a11y.back": "Indietro",
  },
  /* ── ja ── */
  {
    "a11y.back": "戻る",
  },
  /* ── ko ── */
  {
    "a11y.back": "뒤로",
  },
);
