import { strings } from "../lib/i18n";

/* THE + OFFERS YOUR DRAFT — ITS WORDS (owner's audit, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   WHY. A reader with a half-written letter pressed the + and was offered a
   blank page: an unsent letter could only be found again from My letters
   or Settings. When at least one draft exists the + tray (NativeTabBar,
   the owner's P2) now has one more row above "Write a letter", and this is
   its title. Under it sits the draft's own first words, which are the
   reader's and need no string.

   English only for now: t() falls back to English, and the other eight
   languages are written natively afterwards (es pt id fr de it ja ko — the
   three empty blocks below are where strings() wants es, pt and id; fill
   them and add the rest in LANGS order, as data/strings-today3d.ts does).

   Imported for its side effect by NativeTabBar.

   Reused, no new copy: ml.draftEmpty ("An empty page, saved.", My letters'
   own line for a draft with no words), under the title when the draft has
   neither letter text nor a question. */

strings(
  /* ── en · English ── */
  {
    // THE + TRAY, the row above "Write a letter" (pub.letter) when the reader has an unsent letter: its title,
    // System semibold 16, in the same row as pub.letter / pub.note and about their length (it wraps, but one
    // line is the design); the draft's own first words sit under it. Also what VoiceOver says first for the
    // row ("Continue your draft, <first words>"). Sentence case, no full stop, like pub.letter
    "pub.draft": "Continue your draft",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "pub.draft": "Seguir con tu borrador",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "pub.draft": "Continuar seu rascunho",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "pub.draft": "Lanjutkan drafmu",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "pub.draft": "Reprendre ton brouillon",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "pub.draft": "Entwurf weiterschreiben",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "pub.draft": "Riprendi la bozza",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "pub.draft": "下書きの続きを書く",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "pub.draft": "초안 이어 쓰기",
  },
);
