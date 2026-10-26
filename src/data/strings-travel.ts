import { strings } from "../lib/i18n";

/* LET IT TRAVEL L6 — THE WORDS (the letter composer's bottom bar; owner, 2026-10-26).
   ────────────────────────────────────────────────────────────────────────
   Two new lines; everything else the bar and the strip say already existed:
   - cp.l6.pickStamp: the CTA capsule once the words are enough and no stamp is chosen (it
     opens the stamp strip). Short, because the capsule never cuts its words and shares the row
     with the + and the paper; a button's voice in each language (the same register as
     cp.travel beside it: es/pt/fr/de/it imperatives as Wren addresses the writer, ja plain form,
     ko a noun form like 떠나보내기). Upper-cased (toLocaleUpperCase) it is also the strip's
     head, PICK A STAMP, in mono capitals.
   - cp.l6.wrenPick: Wren's line at the same moment, in her voice (tu / du / você, casual ja
     and ko, as her wr.ladder.* lines), shown in the language's quotation marks (cp.quote).
   Reused: cp.travel (Let it travel), cp.sending, the strip's DONE (pp.strip.done, the paper
   strip's), wr.ladder.* (her other lines), cp.stamp.a11y / cp.stampChosen.a11y (VoiceOver).

   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same
   keys: src/data/strings-travel.test.ts checks they agree (node src/data/strings-travel.test.ts).
   Consumers import this file for its side effect. */

strings(
  /* ── en · English ── */
  {
    "cp.l6.pickStamp": "Pick a stamp",
    "cp.l6.wrenPick": "Now pick a stamp for it.",
  },
  /* ── es · Español ── */
  {
    "cp.l6.pickStamp": "Elige un sello",
    "cp.l6.wrenPick": "Ahora ponle un sello.",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "cp.l6.pickStamp": "Escolha um selo",
    "cp.l6.wrenPick": "Agora escolha um selo pra ela.",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "cp.l6.pickStamp": "Pilih perangko",
    "cp.l6.wrenPick": "Sekarang pilihkan perangko untuknya.",
  },
  /* ── fr · Français ── */
  {
    "cp.l6.pickStamp": "Choisis un timbre",
    "cp.l6.wrenPick": "Maintenant, choisis-lui un timbre.",
  },
  /* ── de · Deutsch ── */
  {
    "cp.l6.pickStamp": "Wähl eine Marke",
    "cp.l6.wrenPick": "Jetzt such ihm noch eine Marke aus.",
  },
  /* ── it · Italiano ── */
  {
    "cp.l6.pickStamp": "Scegli un francobollo",
    "cp.l6.wrenPick": "Ora sceglile un francobollo.",
  },
  /* ── ja · 日本語 ── */
  {
    "cp.l6.pickStamp": "切手を選ぶ",
    "cp.l6.wrenPick": "じゃあ、切手を選んであげて。",
  },
  /* ── ko · 한국어 ── */
  {
    "cp.l6.pickStamp": "우표 고르기",
    "cp.l6.wrenPick": "이제 우표를 골라 줘.",
  },
);
