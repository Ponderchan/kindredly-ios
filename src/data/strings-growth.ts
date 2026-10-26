import { strings } from "../lib/i18n";

/* WREN GROWS UP — THE WORDS (owner, 2026-10-26, option 1: the full-screen moment).
   ────────────────────────────────────────────────────────────────────────
   - grow.line.fledge / grow.line.wren: what she says once she has fledged / grown up, in her own
     voice (as wr.ladder.*: casual ja and ko, tu / du / você); never gendering herself, since her
     pronoun is the reader's choice. "You two" is the reader and their kindred.
   - grow.ok: the one key that closes the moment, a glad word, not "OK".
   The stamp under her reuses the stage names (wren.name.fledge / wren.name.grown) and the day.
   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same
   keys: src/data/strings-growth.test.ts checks they agree (node src/data/strings-growth.test.ts). */
strings(
  /* ── en · English ── */
  { "grow.line.fledge": "Look — my wings hold now.", "grow.line.wren": "All grown up. You two did that.", "grow.ok": "Yay" },
  /* ── es · Español ── */
  { "grow.line.fledge": "Mira: mis alas ya aguantan mi peso.", "grow.line.wren": "Ya crecí del todo. Fue cosa de ustedes dos.", "grow.ok": "¡Bien!" },
  /* ── pt · Português (Brasil) ── */
  { "grow.line.fledge": "Olha só: minhas asas já aguentam meu peso.", "grow.line.wren": "Cresci de vez. Foi graças a vocês dois.", "grow.ok": "Eba!" },
  /* ── id · Bahasa Indonesia ── */
  { "grow.line.fledge": "Lihat, sayapku sudah kuat sekarang.", "grow.line.wren": "Aku sudah dewasa. Itu berkat kalian berdua.", "grow.ok": "Asyik!" },
  /* ── fr · Français ── */
  { "grow.line.fledge": "Regarde : mes ailes me portent, maintenant.", "grow.line.wren": "J'ai grandi pour de bon. C'est grâce à vous deux.", "grow.ok": "Youpi !" },
  /* ── de · Deutsch ── */
  { "grow.line.fledge": "Schau mal – meine Flügel tragen jetzt.", "grow.line.wren": "Jetzt bin ich groß. Das wart ihr zwei.", "grow.ok": "Juhu!" },
  /* ── it · Italiano ── */
  { "grow.line.fledge": "Guarda: ora le mie ali reggono.", "grow.line.wren": "Ormai sono grande. Merito di voi due.", "grow.ok": "Evviva!" },
  /* ── ja · 日本語 ── */
  { "grow.line.fledge": "見て、もう翼で飛べるよ。", "grow.line.wren": "すっかり大人になったよ。ふたりのおかげだね。", "grow.ok": "やったね" },
  /* ── ko · 한국어 ── */
  { "grow.line.fledge": "봐, 이제 날개로 날 수 있어.", "grow.line.wren": "이제 다 컸어. 너희 둘 덕분이야.", "grow.ok": "좋아!" },
);
