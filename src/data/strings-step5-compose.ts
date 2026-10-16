import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE COMPOSE PAGE'S NEW WORDS (slice "compose").
   ────────────────────────────────────────────────────────────────────────
   All nine languages: step 6 wrote the eight beside English natively (written AS the language, not
   translated). The compose route imports this file for its side effect
   (src/app/compose.tsx), and so does the dev page.

   Everything else the page says reuses keys already in nine languages:
   cp.header / travel / needStamp / sending / cap / repliesFree / discover /
   askLabel / askPh / voiceNote / voiceLine.ph / voiceLine.prompt /
   forThisLetter / recent / tray.ask / tray.voice / leave.* / gate.* /
   signin.* / fail.* / signup.reason / morningTitle / morningNote,
   ld.send (the key where LET IT TRAVEL doesn't fit), ui.overLimit (the
   count past the ceiling), lang.send, wr.ladder.* / wr.mood.*, sp.*, and
   wren.trackClose ("Close": the ×, and the + while its tray is open). */

strings(
  /* ── en ── */
  {
    // the free writer's letters left today, right-aligned on the small line
    // above the toolbar (owner question 6's default); First Class sees none
    "cp.left.n": "{n} LEFT TODAY",
    "cp.left.one": "1 LEFT TODAY",
    "cp.left.none": "NONE LEFT TODAY",
    // the count near the 1000 ceiling (past it, ui.overLimit); it used to be
    // `${n} left` in English for every language
    "cp.charsLeft": "{n} LEFT",
    // the same at exactly one
    "cp.charsLeftOne": "1 LEFT",
    // Wren's line in the language's own quotation marks (they were “ ” for
    // every language); step 6 writes «…», 「…」 and „…“ where they belong
    "cp.quote": "“{s}”",
    // VoiceOver: the + key, the stamp slot and key, the editor, the locked cell
    "cp.plus.a11y": "Add a question or a voice letter",
    "cp.stamp.a11y": "Choose a mood stamp",
    "cp.stampChosen.a11y": "Mood stamp: {name}. Change it",
    "cp.editor.a11y": "Your letter",
    "cp.voiceLocked.a11y": "First Class only",
    // VoiceOver: why ASK A QUESTION is off while speaking (a recording carries no question)
    "cp.askVoice.a11y": "Only with a written letter",
  },
  /* ── es ── */
  {
    "cp.left.n": "QUEDAN {n} HOY",
    "cp.left.one": "QUEDA 1 HOY",
    "cp.left.none": "NO QUEDAN MÁS HOY",
    "cp.charsLeft": "QUEDAN {n}",
    "cp.charsLeftOne": "QUEDA 1",
    "cp.quote": "«{s}»",
    "cp.plus.a11y": "Añadir una pregunta o una carta de voz",
    "cp.stamp.a11y": "Elegir un sello de ánimo",
    "cp.stampChosen.a11y": "Sello de ánimo: {name}. Cambiar",
    "cp.editor.a11y": "Tu carta",
    "cp.voiceLocked.a11y": "Solo con Primera Clase",
    "cp.askVoice.a11y": "Solo con una carta escrita",
  },
  /* ── pt ── */
  {
    "cp.left.n": "RESTAM {n} HOJE",
    "cp.left.one": "RESTA 1 HOJE",
    "cp.left.none": "ACABARAM POR HOJE",
    "cp.charsLeft": "RESTAM {n}",
    "cp.charsLeftOne": "RESTA 1",
    "cp.quote": "“{s}”",
    "cp.plus.a11y": "Adicionar uma pergunta ou uma carta de voz",
    "cp.stamp.a11y": "Escolher um selo de humor",
    "cp.stampChosen.a11y": "Selo de humor: {name}. Trocar",
    "cp.editor.a11y": "Sua carta",
    "cp.voiceLocked.a11y": "Só na Primeira Classe",
    "cp.askVoice.a11y": "Só em cartas escritas",
  },
  /* ── id ── */
  {
    "cp.left.n": "HARI INI SISA {n}",
    "cp.left.one": "HARI INI SISA 1",
    "cp.left.none": "HARI INI HABIS",
    "cp.charsLeft": "SISA {n}",
    "cp.charsLeftOne": "SISA 1",
    "cp.quote": "“{s}”",
    "cp.plus.a11y": "Tambahkan pertanyaan atau surat suara",
    "cp.stamp.a11y": "Pilih perangko suasana hati",
    "cp.stampChosen.a11y": "Perangko suasana hati: {name}. Ganti",
    "cp.editor.a11y": "Suratmu",
    "cp.voiceLocked.a11y": "Khusus Kelas Utama",
    "cp.askVoice.a11y": "Hanya untuk surat tertulis",
  },
  /* ── fr ── */
  {
    "cp.left.n": "{n} POUR AUJOURD'HUI",
    "cp.left.one": "1 POUR AUJOURD'HUI",
    "cp.left.none": "RIEN AVANT DEMAIN",
    "cp.charsLeft": "RESTE {n}",
    "cp.charsLeftOne": "RESTE 1",
    "cp.quote": "« {s} »",
    "cp.plus.a11y": "Ajouter une question ou une lettre vocale",
    "cp.stamp.a11y": "Choisir un timbre d'humeur",
    "cp.stampChosen.a11y": "Timbre d'humeur : {name}. Le changer",
    "cp.editor.a11y": "Ta lettre",
    "cp.voiceLocked.a11y": "Réservé à la Première classe",
    "cp.askVoice.a11y": "Seulement avec une lettre écrite",
  },
  /* ── de ── */
  {
    "cp.left.n": "HEUTE NOCH {n}",
    "cp.left.one": "HEUTE NOCH 1",
    "cp.left.none": "HEUTE KEINE MEHR",
    "cp.charsLeft": "NOCH {n}",
    "cp.charsLeftOne": "NOCH 1",
    "cp.quote": "„{s}“",
    "cp.plus.a11y": "Frage oder Sprachbrief hinzufügen",
    "cp.stamp.a11y": "Stimmungsmarke wählen",
    "cp.stampChosen.a11y": "Stimmungsmarke: {name}. Ändern",
    "cp.editor.a11y": "Dein Brief",
    "cp.voiceLocked.a11y": "Nur in der Ersten Klasse",
    "cp.askVoice.a11y": "Nur bei geschriebenen Briefen",
  },
  /* ── it ── */
  {
    "cp.left.n": "OGGI NE RESTANO {n}",
    "cp.left.one": "OGGI NE RESTA UNA",
    "cp.left.none": "FINITE PER OGGI",
    "cp.charsLeft": "ANCORA {n}",
    "cp.charsLeftOne": "ANCORA 1",
    "cp.quote": "«{s}»",
    "cp.plus.a11y": "Aggiungi una domanda o una lettera vocale",
    "cp.stamp.a11y": "Scegli un francobollo dell'umore",
    "cp.stampChosen.a11y": "Francobollo dell'umore: {name}. Cambialo",
    "cp.editor.a11y": "La tua lettera",
    "cp.voiceLocked.a11y": "Solo in Prima classe",
    "cp.askVoice.a11y": "Solo con una lettera scritta",
  },
  /* ── ja ── */
  {
    "cp.left.n": "今日はあと{n}通",
    "cp.left.one": "今日はあと1通",
    "cp.left.none": "今日の分はおしまい",
    "cp.charsLeft": "あと{n}字",
    "cp.charsLeftOne": "あと1字",
    "cp.quote": "「{s}」",
    "cp.plus.a11y": "質問か声の手紙を添える",
    "cp.stamp.a11y": "気分の切手を選ぶ",
    "cp.stampChosen.a11y": "気分の切手：{name}。変更できます",
    "cp.editor.a11y": "あなたの手紙",
    "cp.voiceLocked.a11y": "ファーストクラス限定",
    "cp.askVoice.a11y": "文字の手紙にだけ添えられます",
  },
  /* ── ko ── */
  {
    "cp.left.n": "오늘 {n}통 남음",
    "cp.left.one": "오늘 한 통 남음",
    "cp.left.none": "오늘 남은 편지 없음",
    "cp.charsLeft": "{n}자 남음",
    "cp.charsLeftOne": "1자 남음",
    "cp.quote": "“{s}”",
    "cp.plus.a11y": "질문이나 음성 편지 추가",
    "cp.stamp.a11y": "기분 우표 고르기",
    "cp.stampChosen.a11y": "기분 우표: {name}. 바꾸기",
    "cp.editor.a11y": "당신의 편지",
    "cp.voiceLocked.a11y": "퍼스트 클래스 전용",
    "cp.askVoice.a11y": "글로 쓴 편지에만 남길 수 있어요",
  },
);
