import { strings } from "../lib/i18n";

/* SEASONS — THE WORDS (Halloween 2026; owner, 2026-10-26; lib/season-core).
   ────────────────────────────────────────────────────────────────────────
   Wren's two Halloween looks, named the way each language already names her other pieces
   (ws.acc.beanie, ws.acc.party in strings.ts: the thing she wears, short), and the small marker
   beside the seasonal set's head in the stamp tray (mono caps, as short as the language allows:
   it sits next to HALLOWEEN on one line). The three stamps' names, their prompts and the
   category's name live in data/stamps.ts with the other stamps.

   The look names are shown in capitals on the Me row (four tiles across, one line, shrinking to
   60% at most) and as they are in the wardrobe. The ghost is a bedsheet costume, not a spirit:
   where the plain word for a ghost leans scary or folkloric, the language's costume word is
   used (id: kostum hantu, never pocong; it: fantasmino).

   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same
   keys: src/data/strings-season.test.ts checks they agree (node src/data/strings-season.test.ts).
   Consumers import this file for its side effect. */

strings(
  /* ── en · English ── */
  {
    // Wren's Halloween looks (the wardrobe, the Me row upper-cases them)
    "ws.acc.witch": "Witch hat",
    "ws.acc.ghost": "Ghost",
    // beside the seasonal set's head in the stamp tray, mono caps (very short)
    "season.tray.mark": "SEASONAL",
  },
  /* ── es · Español ── */
  {
    "ws.acc.witch": "Sombrero de bruja",
    "ws.acc.ghost": "Fantasma",
    "season.tray.mark": "DE TEMPORADA",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "ws.acc.witch": "Chapéu de bruxa",
    "ws.acc.ghost": "Fantasma",
    "season.tray.mark": "SAZONAL",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "ws.acc.witch": "Topi penyihir",
    "ws.acc.ghost": "Kostum hantu",
    "season.tray.mark": "MUSIMAN",
  },
  /* ── fr · Français ── */
  {
    "ws.acc.witch": "Chapeau de sorcière",
    "ws.acc.ghost": "Fantôme",
    "season.tray.mark": "DE SAISON",
  },
  /* ── de · Deutsch ── */
  {
    "ws.acc.witch": "Hexenhut",
    "ws.acc.ghost": "Gespenst",
    "season.tray.mark": "SAISONAL",
  },
  /* ── it · Italiano ── */
  {
    "ws.acc.witch": "Cappello da strega",
    "ws.acc.ghost": "Fantasmino",
    "season.tray.mark": "DI STAGIONE",
  },
  /* ── ja · 日本語 ── */
  {
    "ws.acc.witch": "魔女の帽子",
    "ws.acc.ghost": "おばけ",
    "season.tray.mark": "期間限定",
  },
  /* ── ko · 한국어 ── */
  {
    "ws.acc.witch": "마녀 모자",
    "ws.acc.ghost": "유령",
    "season.tray.mark": "시즌 한정",
  },
);
