import { strings } from "../lib/i18n";

/* NOTES E1 — THE EMPTY NOTES PAGE ASKS FIRST (owner, 2026-10-19).
   ────────────────────────────────────────────────────────────────────────
   Design: .claude/mock/notes-empty/CLAUDE-CODE-PROMPTS-NOTES-EMPTY.md, Prompts 1 and 3 (its editor
   and its faces are not ours). With no notes yet, the page asks "how was today, honestly?" over our
   four group icons; a tap turns the title into that mood's line and pops a draft card whose grey
   placeholder is the mood's follow-up question (handed to the composer as the spark, never saved);
   after the first save, Wren says ne.wren once.

   Every word is drawn in the system font (contract D12). Lower case is the voice wherever it reads
   naturally (German keeps its capital nouns). Each language is written as that language, never word
   for word; the reader is never gendered (the lines describe the day or the feeling, not the
   person). The mood names themselves are mood.group.* (strings.ts), reused, not repeated here.

   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same keys:
   src/data/strings-notes-empty.test.ts checks they agree (node src/data/strings-notes-empty.test.ts).
   Consumers import this file for its side effect. */

strings(
  /* ── en · English ── */
  {
    // the empty page's question (system 28 semibold, not italic)
    "ne.title": "how was today, honestly?",
    // the title once a mood is tapped
    "ne.line.calm": "calm.",
    "ne.line.happy": "good day.",
    "ne.line.tired": "tired.",
    "ne.line.low": "low.",
    // the draft card's grey placeholder, then the composer's (the spark; never saved)
    "ne.ask.calm": "what made it so?",
    "ne.ask.happy": "what was the best bit?",
    "ne.ask.tired": "from what, though?",
    "ne.ask.low": "no need to explain. just a line.",
    // Wren, once, after the very first note
    "ne.wren": "first one down. same time tomorrow?",
    // VoiceOver on the draft card
    "ne.a11yCard": "Start writing",
  },
  /* ── es · Español ── */
  {
    "ne.title": "¿qué tal hoy, de verdad?",
    "ne.line.calm": "en calma.",
    "ne.line.happy": "buen día.",
    "ne.line.tired": "cansancio.",
    "ne.line.low": "bajón.",
    "ne.ask.calm": "¿de dónde salió esa calma?",
    "ne.ask.happy": "¿qué fue lo mejor?",
    "ne.ask.tired": "¿cansancio de qué?",
    "ne.ask.low": "no hace falta explicar nada. solo una línea.",
    "ne.wren": "la primera, hecha. ¿mañana a la misma hora?",
    "ne.a11yCard": "Empezar a escribir",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "ne.title": "como foi hoje, sinceramente?",
    "ne.line.calm": "dia tranquilo.",
    "ne.line.happy": "dia bom.",
    "ne.line.tired": "cansaço.",
    "ne.line.low": "pra baixo.",
    "ne.ask.calm": "o que trouxe essa calma?",
    "ne.ask.happy": "qual foi a melhor parte?",
    "ne.ask.tired": "cansaço de quê?",
    "ne.ask.low": "não precisa explicar. só uma linha.",
    "ne.wren": "a primeira já foi. amanhã, mesmo horário?",
    "ne.a11yCard": "Começar a escrever",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "ne.title": "hari ini gimana, jujur?",
    "ne.line.calm": "tenang.",
    "ne.line.happy": "hari yang baik.",
    "ne.line.tired": "capek.",
    "ne.line.low": "lagi down.",
    "ne.ask.calm": "apa yang bikin tenang?",
    "ne.ask.happy": "bagian terbaiknya apa?",
    "ne.ask.tired": "capek karena apa?",
    "ne.ask.low": "nggak perlu dijelasin. satu baris aja.",
    "ne.wren": "yang pertama beres. besok jam segini lagi?",
    "ne.a11yCard": "Mulai menulis",
  },
  /* ── fr · Français ── */
  {
    "ne.title": "c’était comment, aujourd’hui, honnêtement ?",
    "ne.line.calm": "calme.",
    "ne.line.happy": "une bonne journée.",
    "ne.line.tired": "fatigue.",
    "ne.line.low": "pas terrible.",
    "ne.ask.calm": "d’où vient ce calme ?",
    "ne.ask.happy": "c’était quoi, le meilleur moment ?",
    "ne.ask.tired": "à cause de quoi, au juste ?",
    "ne.ask.low": "pas besoin d’expliquer. juste une ligne.",
    "ne.wren": "et de un. demain, même heure ?",
    "ne.a11yCard": "Commencer à écrire",
  },
  /* ── de · Deutsch ── */
  {
    "ne.title": "wie war heute, ehrlich?",
    "ne.line.calm": "ruhig.",
    "ne.line.happy": "ein guter Tag.",
    "ne.line.tired": "müde.",
    "ne.line.low": "eher mies.",
    "ne.ask.calm": "woher kam die Ruhe?",
    "ne.ask.happy": "was war das Beste daran?",
    "ne.ask.tired": "wovon eigentlich?",
    "ne.ask.low": "musst nichts erklären. nur eine Zeile.",
    "ne.wren": "die erste ist drin. morgen, gleiche Zeit?",
    "ne.a11yCard": "Losschreiben",
  },
  /* ── it · Italiano ── */
  {
    "ne.title": "com’è andata oggi, sinceramente?",
    "ne.line.calm": "giornata tranquilla.",
    "ne.line.happy": "bella giornata.",
    "ne.line.tired": "stanchezza.",
    "ne.line.low": "giù di corda.",
    "ne.ask.calm": "da dove viene questa calma?",
    "ne.ask.happy": "qual è stata la parte migliore?",
    "ne.ask.tired": "e per cosa, di preciso?",
    "ne.ask.low": "non serve spiegare. basta una riga.",
    "ne.wren": "la prima è fatta. domani, stessa ora?",
    "ne.a11yCard": "Inizia a scrivere",
  },
  /* ── ja · 日本語 ── */
  {
    "ne.title": "今日、ほんとはどうだった？",
    "ne.line.calm": "おだやか。",
    "ne.line.happy": "いい日。",
    "ne.line.tired": "つかれた。",
    "ne.line.low": "どんより。",
    "ne.ask.calm": "なにが、そうさせてくれた？",
    "ne.ask.happy": "いちばんよかったのは？",
    "ne.ask.tired": "なにに、つかれた？",
    "ne.ask.low": "説明はいらない。一行だけでいい。",
    "ne.wren": "一枚目、書けたね。あしたも同じ時間に？",
    "ne.a11yCard": "書きはじめる",
  },
  /* ── ko · 한국어 ── */
  {
    "ne.title": "오늘, 솔직히 어땠어?",
    "ne.line.calm": "잔잔했어.",
    "ne.line.happy": "좋은 날.",
    "ne.line.tired": "지쳤어.",
    "ne.line.low": "가라앉았어.",
    "ne.ask.calm": "뭐가 마음을 잔잔하게 했어?",
    "ne.ask.happy": "제일 좋았던 건 뭐야?",
    "ne.ask.tired": "뭐 때문에 지쳤어?",
    "ne.ask.low": "설명 안 해도 돼. 한 줄이면 충분해.",
    "ne.wren": "첫 장 완료. 내일도 이 시간에?",
    "ne.a11yCard": "쓰기 시작",
  },
);
