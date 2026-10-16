import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE SHARED PIECES' NEW WORDS (ts-platform).
   ────────────────────────────────────────────────────────────────────────
   All nine languages: step 6 wrote the eight beside English natively (lib/i18n's rule: written AS the
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
  /* ── es ── */
  {
    "rp.menu.a11y": "Reportar o bloquear",
    "vo.play": "Reproducir la carta de voz",
    "vo.pause": "Pausa",
  },
  /* ── pt ── */
  {
    "rp.menu.a11y": "Denunciar ou bloquear",
    "vo.play": "Reproduzir a carta de voz",
    "vo.pause": "Pausar",
  },
  /* ── id ── */
  {
    "rp.menu.a11y": "Laporkan atau blokir",
    "vo.play": "Putar surat suara",
    "vo.pause": "Jeda",
  },
  /* ── fr ── */
  {
    "rp.menu.a11y": "Signaler ou bloquer",
    "vo.play": "Écouter la lettre vocale",
    "vo.pause": "Pause",
  },
  /* ── de ── */
  {
    "rp.menu.a11y": "Melden oder blockieren",
    "vo.play": "Sprachbrief abspielen",
    "vo.pause": "Pause",
  },
  /* ── it ── */
  {
    "rp.menu.a11y": "Segnala o blocca",
    "vo.play": "Riproduci la lettera vocale",
    "vo.pause": "Pausa",
  },
  /* ── ja ── */
  {
    "rp.menu.a11y": "通報またはブロック",
    "vo.play": "声の手紙を再生",
    "vo.pause": "一時停止",
  },
  /* ── ko ── */
  {
    "rp.menu.a11y": "신고 또는 차단",
    "vo.play": "음성 편지 재생",
    "vo.pause": "일시 정지",
  },
);
