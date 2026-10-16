import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE TODAY TAB'S NEW WORDS (slice "today").
   ────────────────────────────────────────────────────────────────────────
   All nine languages: step 6 wrote the eight beside English natively (written AS the language, not
   translated). useTodayDesk imports this file for its side effect (both
   renderers and the dev page go through it), and so does CloseOfDay.

   All of them are for VoiceOver: the card is one element whose moves are
   actions (↑ PASS is only a label for sighted readers) and which says what
   the eye sees on it (a voice letter that can't play yet), the envelopes
   of the first arrival had no names at all, and the blind's cord could not
   be pulled without a finger.

   Everything else the tab says reuses keys already in nine languages:
   ld.today / closed / allRead / pass / replyArrow / send / unfold /
   voiceLetter / writeBackPh / threadOpensTwo / replyThreadOpens /
   flightFull(.title/.body/.ok) / toast.thread / unsigned / arrived /
   arrivedKept / gone.* / replyFail / signup.reason / xlFail.* / close /
   both.label / foldBack / writeBack / written / onItsWay, ld.unreachable.*
   and fail.* (the data slice), read.invite, mm.original, mm.translating,
   wo.strip.*, rp.menu.* (Report / Block, and rp.menu.a11y for the ⋯),
   vo.play / vo.pause, ui.overLimit, cp.gate.*, cp.fail.title, cp.signin.*,
   net.offline.*, net.slow, cod.*. */

strings(
  /* ── en ── */
  {
    // VoiceOver: the card's "write back" action, and the hint on the resting pill
    "ld.reply.a11y": "Write back",
    // VoiceOver: the card's unfold action (UNFOLD ↓ shows only on a folded letter)
    "ld.unfold.a11y": "Unfold the whole letter",
    // VoiceOver actions on a card: the swipe, without a swipe
    "ld.next.a11y": "Next letter",
    "ld.prev.a11y": "Previous letter",
    // VoiceOver: the three envelopes of the first arrival, and where each stands
    "ld.env.a11y": "Letter {n} of {total}",
    "ld.env.read": "Read",
    "ld.env.open": "Open now",
    "ld.env.sealed": "Not opened yet",
    // VoiceOver: pulling the blind's cord, as an action on the cord
    "cod.close.a11y": "Close the day",
    // VoiceOver, in a voice letter's card: its link isn't signed yet (offline, or still asking), so it can't be played
    "ld.voice.unavailable": "Can't play right now",
  },
  /* ── es ── */
  {
    "ld.reply.a11y": "Responder",
    "ld.unfold.a11y": "Desplegar la carta completa",
    "ld.next.a11y": "Carta siguiente",
    "ld.prev.a11y": "Carta anterior",
    "ld.env.a11y": "Carta {n} de {total}",
    "ld.env.read": "Leída",
    "ld.env.open": "Abierta ahora",
    "ld.env.sealed": "Aún sin abrir",
    "cod.close.a11y": "Cerrar por hoy",
    "ld.voice.unavailable": "No se puede reproducir ahora",
  },
  /* ── pt ── */
  {
    "ld.reply.a11y": "Responder",
    "ld.unfold.a11y": "Abrir a carta inteira",
    "ld.next.a11y": "Próxima carta",
    "ld.prev.a11y": "Carta anterior",
    "ld.env.a11y": "Carta {n} de {total}",
    "ld.env.read": "Lida",
    "ld.env.open": "Aberta agora",
    "ld.env.sealed": "Ainda não aberta",
    "cod.close.a11y": "Fechar o dia",
    "ld.voice.unavailable": "Não dá para ouvir agora",
  },
  /* ── id ── */
  {
    "ld.reply.a11y": "Balas",
    "ld.unfold.a11y": "Buka seluruh surat",
    "ld.next.a11y": "Surat berikutnya",
    "ld.prev.a11y": "Surat sebelumnya",
    "ld.env.a11y": "Surat {n} dari {total}",
    "ld.env.read": "Sudah dibaca",
    "ld.env.open": "Sedang dibuka",
    "ld.env.sealed": "Belum dibuka",
    "cod.close.a11y": "Tutup untuk hari ini",
    "ld.voice.unavailable": "Belum bisa diputar",
  },
  /* ── fr ── */
  {
    "ld.reply.a11y": "Répondre",
    "ld.unfold.a11y": "Déplier toute la lettre",
    "ld.next.a11y": "Lettre suivante",
    "ld.prev.a11y": "Lettre précédente",
    "ld.env.a11y": "Lettre {n} sur {total}",
    "ld.env.read": "Lue",
    "ld.env.open": "Ouverte en ce moment",
    "ld.env.sealed": "Pas encore ouverte",
    "cod.close.a11y": "Clore la journée",
    "ld.voice.unavailable": "Lecture impossible pour le moment",
  },
  /* ── de ── */
  {
    "ld.reply.a11y": "Zurückschreiben",
    "ld.unfold.a11y": "Den ganzen Brief auffalten",
    "ld.next.a11y": "Nächster Brief",
    "ld.prev.a11y": "Vorheriger Brief",
    "ld.env.a11y": "Brief {n} von {total}",
    "ld.env.read": "Gelesen",
    "ld.env.open": "Gerade offen",
    "ld.env.sealed": "Noch ungeöffnet",
    "cod.close.a11y": "Den Tag abschließen",
    "ld.voice.unavailable": "Gerade nicht abspielbar",
  },
  /* ── it ── */
  {
    "ld.reply.a11y": "Rispondi",
    "ld.unfold.a11y": "Apri tutta la lettera",
    "ld.next.a11y": "Lettera successiva",
    "ld.prev.a11y": "Lettera precedente",
    "ld.env.a11y": "Lettera {n} di {total}",
    "ld.env.read": "Letta",
    "ld.env.open": "In lettura",
    "ld.env.sealed": "Non ancora aperta",
    "cod.close.a11y": "Chiudi la giornata",
    "ld.voice.unavailable": "Per ora non si può ascoltare",
  },
  /* ── ja ── */
  {
    "ld.reply.a11y": "返事を書く",
    "ld.unfold.a11y": "手紙を最後まで開く",
    "ld.next.a11y": "次の手紙",
    "ld.prev.a11y": "前の手紙",
    "ld.env.a11y": "{total}通中{n}通目の手紙",
    "ld.env.read": "読了",
    "ld.env.open": "いま開いている",
    "ld.env.sealed": "未開封",
    "cod.close.a11y": "今日の窓口を閉める",
    "ld.voice.unavailable": "いまは再生できません",
  },
  /* ── ko ── */
  {
    "ld.reply.a11y": "답장 쓰기",
    "ld.unfold.a11y": "편지 전체 펼치기",
    "ld.next.a11y": "다음 편지",
    "ld.prev.a11y": "이전 편지",
    "ld.env.a11y": "{total}통 중 {n}번째 편지",
    "ld.env.read": "읽음",
    "ld.env.open": "지금 열려 있음",
    "ld.env.sealed": "아직 열지 않음",
    "cod.close.a11y": "하루 마감하기",
    "ld.voice.unavailable": "지금은 재생할 수 없어요",
  },
);
