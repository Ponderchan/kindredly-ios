import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE CONVERSATION'S NEW WORDS (slice chat-kit).
   ────────────────────────────────────────────────────────────────────────
   All nine languages: step 6 wrote the eight beside English natively (lib/i18n's rule: written AS the
   language, not translated). The chat model hooks import this file for its
   side effect, so the words are registered wherever they are read.

   Everything else the room and the pen-pal chat say reuses keys already in
   nine languages: send = ld.send, close = wren.trackClose, the + =
   lat.title, back = a11y.back (strings-step5-kitrn), report or block =
   rp.menu.a11y and play / pause = vo.play / vo.pause (strings-step5-
   platform), slow = net.slow, gone = ch.gone / ld.unsigned /
   kd.accountClosed, the lore button = lore.title, a quote's speaker =
   mm.you or their name. */

strings(
  /* ── en ── */
  {
    // VoiceOver name of the round Wren button left of the room's composer
    "rm.seed.a11y": "Ask {wren} for a question",
    // VoiceOver action on a reply: jump to the line it quotes (the quote is inside the bubble,
    // which VoiceOver reads as one element)
    "mm.goToQuote": "Go to the line it answers",
    // the reader's own label under their face in the introduction when they have no pen name
    // yet — standalone, lower case (the sentence under it is in.knowYouUnsigned, not in.knowYou)
    "in.meFallback": "you",
    // the introduction's closing line when the reader has no pen name: in.knowYou without a
    // {name} (a "you" put into in.knowYou takes the wrong case in some languages); the second
    // paragraph is in.knowYou's own
    "in.knowYouUnsigned": "They know you now as you.\n\nNothing else changes. Same letters, same pace. Only now they're signed.",
  },
  /* ── es ── */
  {
    "rm.seed.a11y": "Una pregunta de {wren}",
    "mm.goToQuote": "Ir a la línea citada",
    "in.meFallback": "tú",
    "in.knowYouUnsigned": "Ahora te conocen tal como eres.\n\nNada más cambia. Las mismas cartas, el mismo ritmo. Solo que ahora van firmadas.",
  },
  /* ── pt ── */
  {
    "rm.seed.a11y": "Pedir uma pergunta a {wren}",
    "mm.goToQuote": "Ir para a linha citada",
    "in.meFallback": "você",
    "in.knowYouUnsigned": "Agora conhecem você do jeito que você é.\n\nNada mais muda. As mesmas cartas, o mesmo ritmo. Só que agora vão assinadas.",
  },
  /* ── id ── */
  {
    "rm.seed.a11y": "Minta pertanyaan dari {wren}",
    "mm.goToQuote": "Lompat ke baris yang dibalas",
    "in.meFallback": "kamu",
    "in.knowYouUnsigned": "Kini dia mengenalmu apa adanya.\n\nTak ada yang lain berubah. Surat yang sama, ritme yang sama. Hanya kini bertanda tangan.",
  },
  /* ── fr ── */
  {
    "rm.seed.a11y": "Demander à {wren} de te souffler une question",
    "mm.goToQuote": "Remonter à la ligne citée",
    "in.meFallback": "toi",
    "in.knowYouUnsigned": "Ils te connaissent maintenant comme tu es.\n\nRien d'autre ne change. Mêmes lettres, même rythme. Seulement, maintenant, elles sont signées.",
  },
  /* ── de ── */
  {
    "rm.seed.a11y": "{wren} um eine Frage bitten",
    "mm.goToQuote": "Zur zitierten Zeile springen",
    "in.meFallback": "du",
    "in.knowYouUnsigned": "Sie kennen dich jetzt, so wie du bist.\n\nSonst ändert sich nichts. Dieselben Briefe, dasselbe Tempo. Nur sind sie jetzt unterschrieben.",
  },
  /* ── it ── */
  {
    "rm.seed.a11y": "Fatti suggerire una domanda da {wren}",
    "mm.goToQuote": "Vai alla riga a cui risponde",
    "in.meFallback": "tu",
    "in.knowYouUnsigned": "Adesso ti conoscono così come sei.\n\nNient'altro cambia. Stesse lettere, stesso passo. Solo che ora sono firmate.",
  },
  /* ── ja ── */
  {
    "rm.seed.a11y": "{wren}に問いをもらう",
    "mm.goToQuote": "引用元の一行へ移動",
    "in.meFallback": "あなた",
    "in.knowYouUnsigned": "相手はいま、ありのままのあなたを知っています。\n\n他には何も変わりません。同じ手紙、同じペース。ただ、これからは署名つき。",
  },
  /* ── ko ── */
  {
    "rm.seed.a11y": "{wren}에게 질문 하나 부탁하기",
    "mm.goToQuote": "인용된 줄로 이동",
    "in.meFallback": "나",
    "in.knowYouUnsigned": "상대는 이제 당신을 있는 그대로 알아요.\n\n다른 건 아무것도 바뀌지 않아요. 같은 편지, 같은 속도. 다만 이제는 서명이 있을 뿐.",
  },
);
