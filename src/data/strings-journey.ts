import { strings } from "../lib/i18n";

/* WREN'S JOURNEY — THE WORDS (owner, 2026-10-26: the journey shows her growing, option A).
   ────────────────────────────────────────────────────────────────────────
   One new line; the stops' names, days and milestones were already there (wren.name.*,
   wren.milestone.*, wren.now):
   - wren.journey.yours: under the next stop's five envelopes, how many of them YOU have written
     (the letters in your deepest thread). Said as yours on purpose (owner, 2026-10-26): growing up
     needs the other person's five as well, and the count must never promise what only they can
     give. Shown in mono capitals, so short; {n} and {m} are numbers.
   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same
   keys: src/data/strings-journey.test.ts checks they agree (node src/data/strings-journey.test.ts).
   Consumers import this file for its side effect. */
strings(
  /* ── en · English ── */
  { "wren.journey.yours": "{n} of {m} from you" },
  /* ── es · Español ── */
  { "wren.journey.yours": "{n} de {m} tuyas" },
  /* ── pt · Português (Brasil) ── */
  { "wren.journey.yours": "você: {n} de {m}" },
  /* ── id · Bahasa Indonesia ── */
  { "wren.journey.yours": "suratmu {n} dari {m}" },
  /* ── fr · Français ── */
  { "wren.journey.yours": "{n} sur {m} de toi" },
  /* ── de · Deutsch ── */
  { "wren.journey.yours": "{n}/{m} von dir" },
  /* ── it · Italiano ── */
  { "wren.journey.yours": "{n} su {m} tue" },
  /* ── ja · 日本語 ── */
  { "wren.journey.yours": "自分の手紙 {n}/{m}" },
  /* ── ko · 한국어 ── */
  { "wren.journey.yours": "내 편지 {n}/{m}" },
);
