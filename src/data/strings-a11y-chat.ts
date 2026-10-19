import { strings } from "../lib/i18n";

/* A11Y PASS, BATCH 3 — THE CONVERSATION, THE ROOM AND KINDREDS.
   ────────────────────────────────────────────────────────────────────────
   Mostly what VoiceOver says; rm.askNeedsPrompt and ch.a11y.nameLong are
   also drawn (the room's status line in mono capitals, the signing sheet's
   red line under the pen name). Written in each language, not translated.
   Imported for its side effect by SignSheet (every chat and room loads it,
   Swift or React Native), ChatDockRN, KindredPage, Introduction and the
   Kindreds model. Everything else the pass says reuses keys already in nine
   languages (id2.door.hint, in.sinceChip, state.yourTurn). */

strings(
  /* ── en ── */
  {
    // a room's question mode: words typed, no question yet (the status line, red; Return does nothing)
    "rm.askNeedsPrompt": "WRITE YOUR QUESTION FIRST",
    // the signing ritual without signatures, as one VoiceOver sentence (then in.sinceChip)
    "in.a11yOff": "{n} letters, then names. They're {name}.",
    // a kindred's page: one resonance line ({label} is the dimension), and when you land close
    "kd.resA11y": "{label}: you {mine}, them {theirs}, out of 100",
    "kd.resTogether": "close together",
    // a Kindreds row's unread count
    "kd.unreadA11y": "{n} unread",
    // the signing sheet: the pen name is longer than it can be
    "ch.a11y.nameLong": "A pen name can be {n} characters at most.",
  },
  /* ── es ── */
  {
    "rm.askNeedsPrompt": "PRIMERO ESCRIBE TU PREGUNTA",
    "in.a11yOff": "{n} cartas y luego, los nombres. Es {name}.",
    "kd.resA11y": "{label}: tú {mine}, la otra persona {theirs}, de 100",
    "kd.resTogether": "muy cerca",
    "kd.unreadA11y": "{n} sin leer",
    "ch.a11y.nameLong": "El seudónimo admite {n} caracteres como máximo.",
  },
  /* ── pt ── */
  {
    "rm.askNeedsPrompt": "ESCREVA SUA PERGUNTA PRIMEIRO",
    "in.a11yOff": "{n} cartas e, depois, os nomes. É {name}.",
    "kd.resA11y": "{label}: você {mine}, a outra pessoa {theirs}, de 100",
    "kd.resTogether": "bem perto",
    "kd.unreadA11y": "{n} não lidas",
    "ch.a11y.nameLong": "O pseudônimo pode ter no máximo {n} caracteres.",
  },
  /* ── id ── */
  {
    "rm.askNeedsPrompt": "TULIS PERTANYAANMU DULU",
    "in.a11yOff": "{n} surat, lalu nama. Namanya {name}.",
    "kd.resA11y": "{label}: kamu {mine}, dia {theirs}, dari 100",
    "kd.resTogether": "berdekatan",
    "kd.unreadA11y": "{n} belum dibaca",
    "ch.a11y.nameLong": "Nama pena paling banyak {n} karakter.",
  },
  /* ── fr ── */
  {
    "rm.askNeedsPrompt": "ÉCRIS D'ABORD TA QUESTION",
    "in.a11yOff": "{n} lettres, puis les noms. C'est {name}.",
    "kd.resA11y": "{label} : toi {mine}, l'autre {theirs}, sur 100",
    "kd.resTogether": "tout proches",
    "kd.unreadA11y": "Non lus : {n}",
    "ch.a11y.nameLong": "Un nom de plume fait {n} caractères au maximum.",
  },
  /* ── de ── */
  {
    "rm.askNeedsPrompt": "SCHREIB ZUERST DEINE FRAGE",
    "in.a11yOff": "{n} Briefe, dann die Namen. Das ist {name}.",
    "kd.resA11y": "{label}: du {mine}, die andere Person {theirs}, von 100",
    "kd.resTogether": "dicht beieinander",
    "kd.unreadA11y": "{n} ungelesen",
    "ch.a11y.nameLong": "Ein Schreibname hat höchstens {n} Zeichen.",
  },
  /* ── it ── */
  {
    "rm.askNeedsPrompt": "PRIMA SCRIVI LA TUA DOMANDA",
    "in.a11yOff": "{n} lettere, poi i nomi. È {name}.",
    "kd.resA11y": "{label}: tu {mine}, l'altra persona {theirs}, su 100",
    "kd.resTogether": "vicinissimi",
    "kd.unreadA11y": "Non letti: {n}",
    "ch.a11y.nameLong": "Il nome di penna può avere al massimo {n} caratteri.",
  },
  /* ── ja ── */
  {
    "rm.askNeedsPrompt": "先に質問を書いてください",
    "in.a11yOff": "{n}通の手紙のあと、名前を交わしました。相手は{name}さん。",
    "kd.resA11y": "{label}：あなたは{mine}、相手は{theirs}（100中）",
    "kd.resTogether": "ほぼ同じ",
    "kd.unreadA11y": "未読{n}件",
    "ch.a11y.nameLong": "ペンネームは{n}文字までです。",
  },
  /* ── ko ── */
  {
    "rm.askNeedsPrompt": "질문을 먼저 써 주세요",
    "in.a11yOff": "편지 {n}통 끝에 이름을 나눴어요. 상대는 {name}.",
    "kd.resA11y": "{label}: 나 {mine}, 상대 {theirs} (100 기준)",
    "kd.resTogether": "거의 같아요",
    "kd.unreadA11y": "안 읽음 {n}",
    "ch.a11y.nameLong": "필명은 최대 {n}자까지예요.",
  },
);
