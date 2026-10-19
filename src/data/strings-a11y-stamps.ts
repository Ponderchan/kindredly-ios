import { strings } from "../lib/i18n";

/* A11Y PASS, BATCH 6 — WHAT VOICEOVER HEARS ON THE COMPOSE PAGE'S WIDE KEY (2026-10-19).
   ────────────────────────────────────────────────────────────────────────
   Nine languages, each written as the language. compose-model keyFor gives them to both
   renderers (countA11y as the key's value, hintA11y as its hint), because the wash and "7/20" the
   eye reads are hidden from VoiceOver. Imported for its side effect by
   screens/compose/useComposeState (the one state both compose pages run on).

   The count is in the letter's own weighted units (a CJK glyph weighs more), so the words name no
   unit: "13 more to go". Over the ceiling the value reuses ui.overLimit. */

strings(
  /* ── en ── */
  {
    // the wide key's value while the letter is under the floor
    "cp.a11y.keyLeft": "{n} more to go",
    "cp.a11y.keyLeftOne": "1 more to go",
    // the hint on PICK A MOOD STAMP
    "cp.a11y.needStampHint": "Opens the stamps. A letter needs one to travel.",
  },
  /* ── es ── */
  {
    "cp.a11y.keyLeft": "Faltan {n}",
    "cp.a11y.keyLeftOne": "Falta 1",
    "cp.a11y.needStampHint": "Abre los sellos. Sin sello, la carta no viaja.",
  },
  /* ── pt ── */
  {
    "cp.a11y.keyLeft": "Faltam {n}",
    "cp.a11y.keyLeftOne": "Falta 1",
    "cp.a11y.needStampHint": "Abre os selos. Sem selo, a carta não viaja.",
  },
  /* ── id ── */
  {
    "cp.a11y.keyLeft": "Kurang {n} lagi",
    "cp.a11y.keyLeftOne": "Kurang 1 lagi",
    "cp.a11y.needStampHint": "Membuka perangko. Surat baru bisa berangkat kalau sudah berperangko.",
  },
  /* ── fr ── */
  {
    "cp.a11y.keyLeft": "Encore {n}",
    "cp.a11y.keyLeftOne": "Encore 1",
    "cp.a11y.needStampHint": "Ouvre les timbres. Sans timbre, la lettre ne part pas.",
  },
  /* ── de ── */
  {
    "cp.a11y.keyLeft": "Noch {n}",
    "cp.a11y.keyLeftOne": "Noch 1",
    "cp.a11y.needStampHint": "Öffnet die Marken. Ohne Marke geht der Brief nicht los.",
  },
  /* ── it ── */
  {
    "cp.a11y.keyLeft": "Ne mancano {n}",
    "cp.a11y.keyLeftOne": "Ne manca 1",
    "cp.a11y.needStampHint": "Apre i francobolli. Senza francobollo la lettera non parte.",
  },
  /* ── ja ── */
  {
    "cp.a11y.keyLeft": "あと{n}",
    "cp.a11y.keyLeftOne": "あと1",
    "cp.a11y.needStampHint": "切手を開きます。切手を貼ると手紙が旅立てます。",
  },
  /* ── ko ── */
  {
    "cp.a11y.keyLeft": "{n} 더 필요해요",
    "cp.a11y.keyLeftOne": "1 더 필요해요",
    "cp.a11y.needStampHint": "우표를 엽니다. 우표를 붙여야 편지가 떠나요.",
  },
);
