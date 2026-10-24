import { strings } from "../lib/i18n";

/* THE KINDREDS GUIDE REEL — ITS ONE NEW WORD (owner, 2026-10-25).
   ────────────────────────────────────────────────────────────────────────
   "How a kindred forms" (components/guide-reel/kindreds) redrawn for the
   1.0.5 identity: a pen pal is a frosted window and a courier name, names
   are traded by signing, and both sides open together. Every other word it
   shows is the product's own, already in nine languages: the courier names
   come from lib/default-name in the reader's language, the signing sheet's
   labels from strings-identity2 (id2.sheet.*, id2.door.waiting), the door
   from ch.sendYours, the chip from in.sinceChip, the This or That card from
   strings-sparkle (sp.pick.*) and data/sparkle-deck, their pen name from
   ga.mira. What the reel lacked was a pen name for the reader themselves —
   typed into the sheet, signed on the pad, written in under their face.

   Nine languages (2026-10-25), each one's own word written natively, not
   translated. Imported for its side effect by the reel. */

strings(
  /* ── en ── */
  {
    // the reader's own pen name in the kindreds guide reel: typed into the signing sheet, signed on the pad and
    // written in under their face when both sides open. In capitals like its pair ga.mira ("MIRA"); the reel sets
    // both in sentence case. A short pen name a young reader of the language might choose, any gender; ja and ko
    // in their own script, as ga.mira is (ミラ, 미라)
    "ga.rowan": "ROWAN",
  },
  /* ── es · Español ── */
  {
    "ga.rowan": "DANI",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "ga.rowan": "CRIS",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "ga.rowan": "SENJA",
  },
  /* ── fr · Français ── */
  {
    "ga.rowan": "CAMILLE",
  },
  /* ── de · Deutsch ── */
  {
    "ga.rowan": "ROBIN",
  },
  /* ── it · Italiano ── */
  {
    "ga.rowan": "ALEX",
  },
  /* ── ja · 日本語 ── */
  {
    "ga.rowan": "ハル",
  },
  /* ── ko · 한국어 ── */
  {
    "ga.rowan": "서우",
  },
);
