import { strings } from "../lib/i18n";

/* A11Y PASS, BATCH 2 (2026-10-19) — the few new words VoiceOver needs on the
   shared sheets' pages. Nine languages, written in each (short: they are
   button names). Imported for its side effect by app/aura.tsx,
   app/aura-card.tsx and app/(tabs)/me/blocked.tsx.

   Everything else the batch says reuses keys already in nine languages:
   wren.trackClose (a sheet's ✕), wa.* / wa.seeRead / wa.scopeRow, bl.*. */

strings(
  /* ── en ── */
  {
    // aura-card's ‹
    "sh.a11y.back": "Back",
    // the aura room's ← and → under one dimension
    "sh.a11y.prevDim": "Previous dimension",
    "sh.a11y.nextDim": "Next dimension",
    // Blocked & reported: the UNBLOCK key, with who it lets back
    "sh.a11y.unblockWho": "Unblock {name}",
  },
  /* ── es ── */
  {
    "sh.a11y.back": "Atrás",
    "sh.a11y.prevDim": "Dimensión anterior",
    "sh.a11y.nextDim": "Dimensión siguiente",
    "sh.a11y.unblockWho": "Desbloquear a {name}",
  },
  /* ── pt ── */
  {
    "sh.a11y.back": "Voltar",
    "sh.a11y.prevDim": "Dimensão anterior",
    "sh.a11y.nextDim": "Próxima dimensão",
    "sh.a11y.unblockWho": "Desbloquear {name}",
  },
  /* ── id ── */
  {
    "sh.a11y.back": "Kembali",
    "sh.a11y.prevDim": "Dimensi sebelumnya",
    "sh.a11y.nextDim": "Dimensi berikutnya",
    "sh.a11y.unblockWho": "Buka blokir {name}",
  },
  /* ── fr ── */
  {
    "sh.a11y.back": "Retour",
    "sh.a11y.prevDim": "Dimension précédente",
    "sh.a11y.nextDim": "Dimension suivante",
    "sh.a11y.unblockWho": "Débloquer {name}",
  },
  /* ── de ── */
  {
    "sh.a11y.back": "Zurück",
    "sh.a11y.prevDim": "Vorherige Dimension",
    "sh.a11y.nextDim": "Nächste Dimension",
    "sh.a11y.unblockWho": "{name} freigeben",
  },
  /* ── it ── */
  {
    "sh.a11y.back": "Indietro",
    "sh.a11y.prevDim": "Dimensione precedente",
    "sh.a11y.nextDim": "Dimensione successiva",
    "sh.a11y.unblockWho": "Sblocca {name}",
  },
  /* ── ja ── */
  {
    "sh.a11y.back": "戻る",
    "sh.a11y.prevDim": "前の軸",
    "sh.a11y.nextDim": "次の軸",
    "sh.a11y.unblockWho": "{name}のブロックを解除",
  },
  /* ── ko ── */
  {
    "sh.a11y.back": "뒤로",
    "sh.a11y.prevDim": "이전 축",
    "sh.a11y.nextDim": "다음 축",
    "sh.a11y.unblockWho": "{name} 차단 해제",
  },
);
