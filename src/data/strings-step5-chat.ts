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
   mm.you or their name.

   THE CHAT COMPOSERS (2026-10-18): the pen-pal chat's header, its letter
   cards and its reply bar, in all nine (the eight written natively the same
   day, after the English). They are sentence case here and drawn in
   capitals: build-items upper-cases them in the reader's locale. Reused:
   kd.whereBegan (the opening card), ui.you, ld.writeBackPh (the reply bar's
   placeholder), the band's lines (ch.band.*, once a writer's five are in),
   state.* (past the letters), mk.ofFive (the dots, for VoiceOver),
   a11y.back, rp.menu.a11y.

   How the eight carry them. The header's line sits on one line between the
   face and the dots (about 24 mono capitals on a 402-wide phone, then it
   cuts off), so where "{n} of 5 · their turn" ran long it became {n}/5 (id,
   de), and "theirs / yours" is each language's own turn words from the
   Kindreds rows (te toca / le toca, sua vez / vez deles, giliranmu /
   giliran dia, à toi / à eux, あなたの番 / 相手の番, 당신 차례 / 상대 차례) or,
   where those don't fit, the band's "from you / from them" (von dir / von
   ihnen, da te / da loro). The fifth letter's hint says "then names" rather
   than "one more": on the fifth, "one more" read in ja and ko as a sixth.
   The card's head is the language's own ordinal where it has one (Surat
   ke-3, 3通目, 3번째 편지).

   The kindreds chat's bar (B, the same day): the ideas key and its bubble
   and the + tray's title, in all nine too. The bubble's three are sentence
   case here and drawn in capitals (build-items upper-cases them; Swift adds
   the ↻ and the →); the tray's title is drawn as written, in the same form
   as the four cards under it (infinitives in fr and de, imperatives in es,
   pt, it, the dictionary form in ja, -기 in ko). Reused: rm.ph (the field),
   rm.note/ask/moment/song .t and .s (the four cards), lat.title (the +),
   wren.trackClose (closing either), cmp.emoji, rm.kindredSince (the
   header's line). */

strings(
  /* ── en ── */
  {
    // the head line inside a pen-pal letter card (mono, drawn in capitals): {n} is that writer's own count of letters
    // after the opening (1..5, and on past 5 before names are traded); {who} is "YOU" (ui.you) or their pen-pal name
    // ("No. 5422")
    "ch.card.head": "Letter {n} · {who}",
    // the pen-pal reply bar's hint over the bar while the keyboard is up (mono, drawn in capitals): the letter the reader
    // is writing, {n} = their own count + 1 (1..4)
    "ch.hint.letter": "Letter {n} of 5",
    // the same hint on the reader's fifth letter ({n} is 5): the one after which names can be traded (once theirs are in too)
    "ch.hint.names": "Letter {n} of 5 · one more and names",
    // the pen-pal header's line under the name (mono, drawn in capitals): whose letter is owed and which of the five it
    // is; theirs: {n} = their count + 1, the letter we are waiting for
    "ch.head.theirs": "Letter {n} of 5 · theirs",
    // the same line when the reader's letter is owed: {n} = the reader's count + 1, the letter they are to write
    "ch.head.yours": "Letter {n} of 5 · yours",
    // VoiceOver name of the round sparkle key left of the kindreds chat's field: it opens a bubble with one sentence
    // to start from (a stamp's prompt), only the reader sees it
    "rm.ideas.a11y": "An idea to start from",
    // the small label at the top of that bubble (mono, drawn in capitals: AN IDEA)
    "rm.idea.label": "An idea",
    // the bubble's text key that shows the next sentence (mono, drawn in capitals after a ↻: ↻ ANOTHER)
    "rm.idea.another": "Another",
    // the bubble's text key that puts the sentence in the field and opens the keyboard (mono, drawn in capitals before
    // a →: USE IT →)
    "rm.idea.use": "Use it",
    // the title over the four cards the kindreds chat's + opens (Fold a note, Ask something, Tiny moment, Leave a song):
    // sentence case, drawn as written, small and quiet
    "rm.tray.title": "Leave something small",
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
    "ch.card.head": "Carta {n} · {who}",
    "ch.hint.letter": "Carta {n} de 5",
    "ch.hint.names": "Carta {n} de 5 · luego, los nombres",
    "ch.head.theirs": "Carta {n} de 5 · le toca",
    "ch.head.yours": "Carta {n} de 5 · te toca",
    "rm.ideas.a11y": "Una idea para empezar",
    "rm.idea.label": "Una idea",
    "rm.idea.another": "Otra",
    "rm.idea.use": "Úsala",
    "rm.tray.title": "Deja algo pequeñito",
    "rm.seed.a11y": "Una pregunta de {wren}",
    "mm.goToQuote": "Ir a la línea citada",
    "in.meFallback": "tú",
    "in.knowYouUnsigned": "Ahora te conocen tal como eres.\n\nNada más cambia. Las mismas cartas, el mismo ritmo. Solo que ahora van firmadas.",
  },
  /* ── pt ── */
  {
    "ch.card.head": "Carta {n} · {who}",
    "ch.hint.letter": "Carta {n} de 5",
    "ch.hint.names": "Carta {n} de 5 · depois, os nomes",
    "ch.head.theirs": "Carta {n} de 5 · vez deles",
    "ch.head.yours": "Carta {n} de 5 · sua vez",
    "rm.ideas.a11y": "Uma ideia para começar",
    "rm.idea.label": "Uma ideia",
    "rm.idea.another": "Outra",
    "rm.idea.use": "Usar esta",
    "rm.tray.title": "Deixe uma coisinha",
    "rm.seed.a11y": "Pedir uma pergunta a {wren}",
    "mm.goToQuote": "Ir para a linha citada",
    "in.meFallback": "você",
    "in.knowYouUnsigned": "Agora conhecem você do jeito que você é.\n\nNada mais muda. As mesmas cartas, o mesmo ritmo. Só que agora vão assinadas.",
  },
  /* ── id ── */
  {
    "ch.card.head": "Surat ke-{n} · {who}",
    "ch.hint.letter": "Surat {n} dari 5",
    "ch.hint.names": "Surat {n} dari 5 · lalu tukar nama",
    "ch.head.theirs": "Surat {n}/5 · giliran dia",
    "ch.head.yours": "Surat {n}/5 · giliranmu",
    "rm.ideas.a11y": "Ide untuk memulai",
    "rm.idea.label": "Satu ide",
    "rm.idea.another": "Yang lain",
    "rm.idea.use": "Pakai ini",
    "rm.tray.title": "Tinggalkan jejak kecil",
    "rm.seed.a11y": "Minta pertanyaan dari {wren}",
    "mm.goToQuote": "Lompat ke baris yang dibalas",
    "in.meFallback": "kamu",
    "in.knowYouUnsigned": "Kini dia mengenalmu apa adanya.\n\nTak ada yang lain berubah. Surat yang sama, ritme yang sama. Hanya kini bertanda tangan.",
  },
  /* ── fr ── */
  {
    "ch.card.head": "Lettre {n} · {who}",
    "ch.hint.letter": "Lettre {n} sur 5",
    "ch.hint.names": "Lettre {n} sur 5 · puis les noms",
    "ch.head.theirs": "Lettre {n} sur 5 · à eux",
    "ch.head.yours": "Lettre {n} sur 5 · à toi",
    "rm.ideas.a11y": "Une idée pour te lancer",
    "rm.idea.label": "Une idée",
    "rm.idea.another": "Une autre",
    "rm.idea.use": "Utiliser",
    "rm.tray.title": "Laisser un petit quelque chose",
    "rm.seed.a11y": "Demander à {wren} de te souffler une question",
    "mm.goToQuote": "Remonter à la ligne citée",
    "in.meFallback": "toi",
    "in.knowYouUnsigned": "Ils te connaissent maintenant comme tu es.\n\nRien d'autre ne change. Mêmes lettres, même rythme. Seulement, maintenant, elles sont signées.",
  },
  /* ── de ── */
  {
    "ch.card.head": "Brief {n} · {who}",
    "ch.hint.letter": "Brief {n} von 5",
    "ch.hint.names": "Brief {n} von 5 · dann die Namen",
    "ch.head.theirs": "Brief {n}/5 · von ihnen",
    "ch.head.yours": "Brief {n}/5 · von dir",
    "rm.ideas.a11y": "Eine Idee für den Anfang",
    "rm.idea.label": "Eine Idee",
    "rm.idea.another": "Eine andere",
    "rm.idea.use": "Übernehmen",
    "rm.tray.title": "Eine Kleinigkeit dalassen",
    "rm.seed.a11y": "{wren} um eine Frage bitten",
    "mm.goToQuote": "Zur zitierten Zeile springen",
    "in.meFallback": "du",
    "in.knowYouUnsigned": "Sie kennen dich jetzt, so wie du bist.\n\nSonst ändert sich nichts. Dieselben Briefe, dasselbe Tempo. Nur sind sie jetzt unterschrieben.",
  },
  /* ── it ── */
  {
    "ch.card.head": "Lettera {n} · {who}",
    "ch.hint.letter": "Lettera {n} di 5",
    "ch.hint.names": "Lettera {n} di 5 · poi i nomi",
    "ch.head.theirs": "Lettera {n} di 5 · da loro",
    "ch.head.yours": "Lettera {n} di 5 · da te",
    "rm.ideas.a11y": "Un'idea da cui partire",
    "rm.idea.label": "Un'idea",
    "rm.idea.another": "Un'altra",
    "rm.idea.use": "Usala",
    "rm.tray.title": "Lascia qualcosa di piccolo",
    "rm.seed.a11y": "Fatti suggerire una domanda da {wren}",
    "mm.goToQuote": "Vai alla riga a cui risponde",
    "in.meFallback": "tu",
    "in.knowYouUnsigned": "Adesso ti conoscono così come sei.\n\nNient'altro cambia. Stesse lettere, stesso passo. Solo che ora sono firmate.",
  },
  /* ── ja ── */
  {
    "ch.card.head": "{n}通目 · {who}",
    "ch.hint.letter": "5通中{n}通目",
    "ch.hint.names": "5通中{n}通目 · 次は名前",
    "ch.head.theirs": "5通中{n}通目 · 相手の番",
    "ch.head.yours": "5通中{n}通目 · あなたの番",
    "rm.ideas.a11y": "書き出しのアイデア",
    "rm.idea.label": "アイデアをひとつ",
    "rm.idea.another": "別のアイデア",
    "rm.idea.use": "これにする",
    "rm.tray.title": "ちょっとした何かを残す",
    "rm.seed.a11y": "{wren}に問いをもらう",
    "mm.goToQuote": "引用元の一行へ移動",
    "in.meFallback": "あなた",
    "in.knowYouUnsigned": "相手はいま、ありのままのあなたを知っています。\n\n他には何も変わりません。同じ手紙、同じペース。ただ、これからは署名つき。",
  },
  /* ── ko ── */
  {
    "ch.card.head": "{n}번째 편지 · {who}",
    "ch.hint.letter": "5통 중 {n}번째",
    "ch.hint.names": "5통 중 {n}번째 · 다음은 이름",
    "ch.head.theirs": "5통 중 {n}번째 · 상대 차례",
    "ch.head.yours": "5통 중 {n}번째 · 당신 차례",
    "rm.ideas.a11y": "시작해 볼 아이디어",
    "rm.idea.label": "아이디어 하나",
    "rm.idea.another": "다른 아이디어",
    "rm.idea.use": "이걸로 쓰기",
    "rm.tray.title": "작은 흔적 남기기",
    "rm.seed.a11y": "{wren}에게 질문 하나 부탁하기",
    "mm.goToQuote": "인용된 줄로 이동",
    "in.meFallback": "나",
    "in.knowYouUnsigned": "상대는 이제 당신을 있는 그대로 알아요.\n\n다른 건 아무것도 바뀌지 않아요. 같은 편지, 같은 속도. 다만 이제는 서명이 있을 뿐.",
  },
);
