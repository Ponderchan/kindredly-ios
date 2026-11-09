import { strings } from "../lib/i18n";

/* TODAY 3d × 25b — THE TODAY TAB'S AND THE PUBLISH ENTRY'S NEW WORDS (2026-10-16).
   ────────────────────────────────────────────────────────────────────────
   Nine blocks (en es pt id fr de it ja ko — es is Latin American, pt is
   pt-BR). The other eight were written natively on 2026-10-20 (AS the
   language, never translated — see the comments on each English key for what
   it is and where it sits). src/data/strings-today3d.test.ts checks they agree
   (node src/data/strings-today3d.test.ts).

   Imported for its side effect by useTodayDesk (both renderers and the dev
   page go through it), NativeTabBar (the + panel) and TodayRN.

   Wren's name is never written into a line: {name} is the reader's own
   courier name (useWrenName), and a two-word name must read right in it.
   Every number in these lines is a count the phone holds (owner W33); a
   zero has its own sentence.

   Reused, no new copy: ld.today, ld.reply.a11y, ld.next.a11y,
   ld.unfold(.a11y), ld.voiceLetter, ld.writeBackPh, ld.send, ld.arrived,
   ld.arrivedKept, ld.toast.thread, the reply hint keys, rp.menu.*,
   vo.play / vo.pause, net.offline.title, cod.wholePost, cod.nextPost,
   ff.title, ff.hint, pc.post, wren.trackClose. */

strings(
  /* ── en · English ── */
  {
    // the control band under the card: the label under the glass disc (its number is the letters left today), and under the ink disc;
    // mono 10 caps, tracking .16em, at most 7 characters each (REPLY has no arrow: ld.replyArrow keeps one)
    "ld.next": "NEXT",
    "ld.replyBtn": "REPLY",
    // VoiceOver: the NEXT button, with how many letters are left on today's desk (plural forms; ja/ko counters)
    "ld.left.a11y.1": "Next letter. One left today.",
    "ld.left.a11y": "Next letter. {n} left today.",
    // the reply field's placeholder for a signed letter; {name} is the pen pal's number in the reader's language
    // (penPalName: "No. 7273", "N.º 7273", "Nr. 7273") — or, once the identity switch is on, the courier name your
    // courier gave them ("Sunday Kite", "Dedal de lluvia", "雨のランタン": no article or agreement with it; ko: no
    // particle after it, or one chosen from its last syllable); lowercase, like ld.writeBackPh, which stays for
    // unsigned letters. Also the pen-pal chat's and the reader's reply bar with the switch on
    "ld.writeBackTo": "write back to {name}…",
    // the reply box over the keyboard (2026-11-09): who you are answering, and its two buttons' VoiceOver labels
    "rd.replyingTo": "Replying to {name}",
    "rd.expandA11y": "Expand to full screen",
    "rd.collapseA11y": "Back to the small box",
    // the card's ⋯ menu and its VoiceOver action: restore the letter just passed (one step only; offered while it is still on the desk)
    "ld.bringBack": "Bring back the last letter",
    // the card shown when the first load found no connection and nothing was kept (under net.offline.title)
    "ld.offlineDesk": "Your letters will be here when you're back online.",
    // VoiceOver: the empty card while today's letters load
    "ld.loading.a11y": "Today's letters are on their way.",
    // the countdown to her return, hours and minutes, mono caps ("8H 06M"; 8時間06分, 8시간 06분); {m} is always two digits
    "ld.countdown": "{h}H {m}M",
    // the chip that pops up when the closed bag is tapped, before the countdown ("NOT YET · 8H 06M")
    "ld.notYet": "NOT YET",

    // HER LETTER, when the desk is done: the mono eyebrow at its top (mono 10, .16em); use the catalogue's word for courier
    "wl.from": "FROM YOUR COURIER",
    // her letter, first line: how many letters went past the desk today (passed + answered, exact; at most 15)
    "wl.count.0": "Nothing came past your desk today.",
    "wl.count.1": "That's one. I counted twice.",
    "wl.count.N": "That's {n}. I counted twice.",
    // her letter: how many of them the reader answered (left out when none)
    "wl.replied.1": "You wrote back to one.",
    "wl.replied.N": "You wrote back to {n}.",
    // her letter: correspondences waiting on a reply from the reader (left out when none)
    "wl.waiting.1": "One is still waiting on you. It'll keep.",
    "wl.waiting.N": "{n} are still waiting on you. They'll keep.",
    // her letter: when she's back; {t} is 8 in the morning in the reader's clock ("8:00 AM", "8:00"). Never "tomorrow":
    // between midnight and eight it is the same morning. First person, in her voice
    "wl.next": "I'm back with the next ones at {t}.",
    // her letter, last line: when she can play her game (the window below offers a lap)
    "wl.invite": "Go find one small thing worth putting in a letter — or come fly a lap with me.",
    // her letter, last line: when she can't play (still an egg, or wilted)
    "wl.invitePlain": "Go find one small thing worth putting in a letter.",
    // her signature: an em dash and the first letter of her name ("— W."); {initial} and {name} are both given,
    // so a language without initials (ja/ko) may sign with the whole name
    "wl.sign": "— {initial}.",
    // VoiceOver: her letter as one element
    "wl.a11y": "A letter from {name}",
    // the label on tomorrow's bag, mono caps, at most 14 characters; {t} is the opening hour in the reader's clock.
    // No number: the bag is a picture of the next desk, and nothing in it is counted yet
    "bag.opens": "OPENS AT {t}",
    // the window to her game, under THAT'S ALL FOR TODAY: 15/600 on one line, about 170 pt (around 20 Latin
    // characters with a long name); VoiceOver reads ff.title + ff.hint instead
    "win.fly": "Fly a lap with {name}",

    // THE + PANEL on every tab but Today: her question above the two rows, in italics — who the
    // writing is for (a stranger, carried by her; or yourself), true at any hour
    "pub.ask": "“Who's this one for?”",
    // the letter row: title, then what happens to it
    "pub.letter": "Write a letter",
    "pub.letterSub": "{name} carries it to a stranger",
    // the letter row, right: the free plan's letters left today (hidden for First Class)
    "pub.left": "{n} LEFT",
    // the diary row: title, then what it holds
    "pub.note": "Diary note",
    "pub.noteSub": "Stays with you · text, voice, photo",
    // THE + ON TODAY: the labels under the two round buttons that pop up from the +
    "pub.popLetter": "Letter",
    "pub.popNote": "Note",
  },
  /* ── es · Español ── */
  {
    "ld.next": "SIGUE",
    "ld.replyBtn": "ESCRIBE",
    "ld.left.a11y.1": "Carta siguiente. Queda una hoy.",
    "ld.left.a11y": "Carta siguiente. Quedan {n} hoy.",
    "ld.writeBackTo": "responde a {name}…",
    // the reply box over the keyboard (2026-11-09): who you are answering, and its two buttons' VoiceOver labels
    "rd.replyingTo": "Respondiendo a {name}",
    "rd.expandA11y": "Abrir en pantalla completa",
    "rd.collapseA11y": "Volver al cuadro pequeño",
    "ld.bringBack": "Recuperar la última carta",
    "ld.offlineDesk": "Tus cartas van a estar aquí cuando vuelvas a tener conexión.",
    "ld.loading.a11y": "Las cartas de hoy vienen en camino.",
    "ld.countdown": "{h} H {m} MIN",
    "ld.notYet": "AÚN NO",
    "wl.from": "DE TU MENSAJERA",
    "wl.count.0": "Hoy no pasó nada por tu escritorio.",
    "wl.count.1": "Fue una. La conté dos veces.",
    "wl.count.N": "Fueron {n}. Las conté dos veces.",
    "wl.replied.1": "Respondiste a una.",
    "wl.replied.N": "Respondiste a {n}.",
    "wl.waiting.1": "Hay una que todavía espera tu respuesta. No hay apuro.",
    "wl.waiting.N": "Hay {n} que todavía esperan tu respuesta. No hay apuro.",
    "wl.next": "Vuelvo con las próximas a las {t}.",
    "wl.invite": "Ve a buscar una cosita que valga la pena contar en una carta — o ven a dar una vuelta conmigo.",
    "wl.invitePlain": "Ve a buscar una cosita que valga la pena contar en una carta.",
    "wl.sign": "— {initial}.",
    "wl.a11y": "Una carta de {name}",
    "bag.opens": "ABRE A LAS {t}",
    "win.fly": "Una vuelta con {name}",
    "pub.ask": "“¿Para quién es esta?”",
    "pub.letter": "Escribir una carta",
    "pub.letterSub": "{name} la lleva a alguien que no conoces",
    "pub.left": "QUEDAN {n}",
    "pub.note": "Nota de diario",
    "pub.noteSub": "Se queda contigo · texto, voz, foto",
    "pub.popLetter": "Carta",
    "pub.popNote": "Nota",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "ld.next": "PRÓXIMA",
    "ld.replyBtn": "ESCREVA",
    "ld.left.a11y.1": "Próxima carta. Resta uma hoje.",
    "ld.left.a11y": "Próxima carta. Restam {n} hoje.",
    "ld.writeBackTo": "responda a {name}…",
    // the reply box over the keyboard (2026-11-09): who you are answering, and its two buttons' VoiceOver labels
    "rd.replyingTo": "Respondendo a {name}",
    "rd.expandA11y": "Abrir em tela cheia",
    "rd.collapseA11y": "Voltar para a caixa pequena",
    "ld.bringBack": "Trazer de volta a última carta",
    "ld.offlineDesk": "Suas cartas vão estar aqui quando você voltar a ficar online.",
    "ld.loading.a11y": "As cartas de hoje estão a caminho.",
    "ld.countdown": "{h}H {m}MIN",
    "ld.notYet": "AINDA NÃO",
    "wl.from": "DA SUA MENSAGEIRA",
    "wl.count.0": "Nada passou pela sua mesa hoje.",
    "wl.count.1": "Foi uma. Contei duas vezes.",
    "wl.count.N": "Foram {n}. Contei duas vezes.",
    "wl.replied.1": "Você respondeu a uma.",
    "wl.replied.N": "Você respondeu a {n}.",
    "wl.waiting.1": "Uma ainda está esperando sua resposta. Sem pressa.",
    "wl.waiting.N": "{n} ainda estão esperando sua resposta. Sem pressa.",
    "wl.next": "Volto com as próximas às {t}.",
    "wl.invite": "Vai atrás de uma coisinha que valha a pena contar numa carta — ou vem dar uma volta comigo.",
    "wl.invitePlain": "Vai atrás de uma coisinha que valha a pena contar numa carta.",
    "wl.sign": "— {initial}.",
    "wl.a11y": "Uma carta de {name}",
    "bag.opens": "ABRE ÀS {t}",
    "win.fly": "Uma volta com {name}",
    "pub.ask": "“Pra quem é essa?”",
    "pub.letter": "Escrever uma carta",
    "pub.letterSub": "{name} leva pra alguém que você não conhece",
    "pub.left": "RESTAM {n}",
    "pub.note": "Nota de diário",
    "pub.noteSub": "Fica com você · texto, voz, foto",
    "pub.popLetter": "Carta",
    "pub.popNote": "Nota",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "ld.next": "LANJUT",
    "ld.replyBtn": "BALAS",
    "ld.left.a11y.1": "Surat berikutnya. Tinggal satu hari ini.",
    "ld.left.a11y": "Surat berikutnya. Tinggal {n} hari ini.",
    "ld.writeBackTo": "balas {name}…",
    // the reply box over the keyboard (2026-11-09): who you are answering, and its two buttons' VoiceOver labels
    "rd.replyingTo": "Membalas {name}",
    "rd.expandA11y": "Buka layar penuh",
    "rd.collapseA11y": "Kembali ke kotak kecil",
    "ld.bringBack": "Kembalikan surat terakhir",
    "ld.offlineDesk": "Surat-suratmu bakal ada di sini begitu kamu online lagi.",
    "ld.loading.a11y": "Surat hari ini sedang dalam perjalanan.",
    "ld.countdown": "{h} JAM {m} MNT",
    "ld.notYet": "BELUM",
    "wl.from": "DARI KURIRMU",
    "wl.count.0": "Hari ini nggak ada yang lewat di mejamu.",
    "wl.count.1": "Ada satu. Udah kuhitung dua kali.",
    "wl.count.N": "Ada {n}. Udah kuhitung dua kali.",
    "wl.replied.1": "Kamu balas satu.",
    "wl.replied.N": "Kamu balas {n}.",
    "wl.waiting.1": "Satu masih nunggu balasanmu. Santai aja, nggak bakal basi.",
    "wl.waiting.N": "{n} masih nunggu balasanmu. Santai aja, nggak bakal basi.",
    "wl.next": "Aku balik bawa yang berikutnya jam {t}.",
    "wl.invite": "Coba cari satu hal kecil yang layak masuk surat — atau sini, terbang satu putaran bareng aku.",
    "wl.invitePlain": "Coba cari satu hal kecil yang layak masuk surat.",
    "wl.sign": "— {initial}.",
    "wl.a11y": "Surat dari {name}",
    "bag.opens": "BUKA JAM {t}",
    "win.fly": "Terbang bareng {name}",
    "pub.ask": "“Ini buat siapa?”",
    "pub.letter": "Tulis surat",
    "pub.letterSub": "{name} mengantarnya ke orang asing",
    "pub.left": "SISA {n}",
    "pub.note": "Catatan harian",
    "pub.noteSub": "Cuma buat kamu · teks, suara, foto",
    "pub.popLetter": "Surat",
    "pub.popNote": "Catatan",
  },
  /* ── fr · Français ── */
  {
    "ld.next": "SUIVANT",
    "ld.replyBtn": "ÉCRIRE",
    "ld.left.a11y.1": "Lettre suivante. Plus qu'une aujourd'hui.",
    "ld.left.a11y": "Lettre suivante. Encore {n} aujourd'hui.",
    "ld.writeBackTo": "réponds à {name}…",
    // the reply box over the keyboard (2026-11-09): who you are answering, and its two buttons' VoiceOver labels
    "rd.replyingTo": "Tu réponds à {name}",
    "rd.expandA11y": "Passer en plein écran",
    "rd.collapseA11y": "Revenir au petit format",
    "ld.bringBack": "Ramener la dernière lettre",
    "ld.offlineDesk": "Tes lettres seront là dès que tu seras de nouveau en ligne.",
    "ld.loading.a11y": "Les lettres du jour sont en route.",
    "ld.countdown": "{h} H {m}",
    "ld.notYet": "PAS ENCORE",
    "wl.from": "DE TA MESSAGÈRE",
    "wl.count.0": "Rien n'est passé sur ton bureau aujourd'hui.",
    "wl.count.1": "Une seule. J'ai compté deux fois.",
    "wl.count.N": "{n} en tout. J'ai compté deux fois.",
    "wl.replied.1": "Tu as répondu à une.",
    "wl.replied.N": "Tu as répondu à {n}.",
    "wl.waiting.1": "Une attend encore ta réponse. Elle ne va pas s'envoler.",
    "wl.waiting.N": "{n} attendent encore ta réponse. Elles ne vont pas s'envoler.",
    "wl.next": "Je reviens avec les suivantes à {t}.",
    "wl.invite": "Va trouver une petite chose qui mérite une lettre — ou viens faire un tour avec moi.",
    "wl.invitePlain": "Va trouver une petite chose qui mérite une lettre.",
    "wl.sign": "— {initial}.",
    "wl.a11y": "Une lettre de {name}",
    "bag.opens": "OUVRE À {t}",
    "win.fly": "Un tour avec {name}",
    "pub.ask": "« Celle-ci, c'est pour qui ? »",
    "pub.letter": "Écrire une lettre",
    "pub.letterSub": "{name} la porte à quelqu'un que tu ne connais pas",
    "pub.left": "ENCORE {n}",
    "pub.note": "Note de journal",
    "pub.noteSub": "Reste avec toi · texte, voix, photo",
    "pub.popLetter": "Lettre",
    "pub.popNote": "Note",
  },
  /* ── de · Deutsch ── */
  {
    "ld.next": "WEITER",
    "ld.replyBtn": "ANTWORT",
    "ld.left.a11y.1": "Nächster Brief. Heute noch einer.",
    "ld.left.a11y": "Nächster Brief. Heute noch {n}.",
    "ld.writeBackTo": "schreib {name} zurück…",
    // the reply box over the keyboard (2026-11-09): who you are answering, and its two buttons' VoiceOver labels
    "rd.replyingTo": "Antwort an {name}",
    "rd.expandA11y": "Auf Vollbild vergrößern",
    "rd.collapseA11y": "Zurück zum kleinen Feld",
    "ld.bringBack": "Letzten Brief zurückholen",
    "ld.offlineDesk": "Deine Briefe sind da, sobald du wieder online bist.",
    "ld.loading.a11y": "Die Briefe von heute sind unterwegs.",
    "ld.countdown": "{h} STD {m} MIN",
    "ld.notYet": "NOCH NICHT",
    "wl.from": "VON DEINER BOTIN",
    "wl.count.0": "Heute kam nichts an deinem Tisch vorbei.",
    "wl.count.1": "Es war einer. Ich hab zweimal gezählt.",
    "wl.count.N": "Es waren {n}. Ich hab zweimal gezählt.",
    "wl.replied.1": "Auf einen hast du geantwortet.",
    "wl.replied.N": "Auf {n} hast du geantwortet.",
    "wl.waiting.1": "Einer wartet noch auf deine Antwort. Der fliegt nicht weg.",
    "wl.waiting.N": "{n} warten noch auf deine Antwort. Die fliegen nicht weg.",
    "wl.next": "Um {t} bin ich mit den nächsten zurück.",
    "wl.invite": "Such dir eine Kleinigkeit, die einen Brief wert ist — oder flieg eine Runde mit mir.",
    "wl.invitePlain": "Such dir eine Kleinigkeit, die einen Brief wert ist.",
    "wl.sign": "— {initial}.",
    "wl.a11y": "Ein Brief von {name}",
    "bag.opens": "ÖFFNET UM {t}",
    "win.fly": "Eine Runde mit {name}",
    "pub.ask": "„Für wen ist das hier?“",
    "pub.letter": "Einen Brief schreiben",
    "pub.letterSub": "{name} bringt ihn zu einem fremden Menschen",
    "pub.left": "NOCH {n}",
    "pub.note": "Tagebuchnotiz",
    "pub.noteSub": "Bleibt bei dir · Text, Sprache, Foto",
    "pub.popLetter": "Brief",
    "pub.popNote": "Notiz",
  },
  /* ── it · Italiano ── */
  {
    "ld.next": "AVANTI",
    "ld.replyBtn": "SCRIVI",
    "ld.left.a11y.1": "Lettera successiva. Ne resta una oggi.",
    "ld.left.a11y": "Lettera successiva. Ne restano {n} oggi.",
    "ld.writeBackTo": "rispondi a {name}…",
    // the reply box over the keyboard (2026-11-09): who you are answering, and its two buttons' VoiceOver labels
    "rd.replyingTo": "Stai rispondendo a {name}",
    "rd.expandA11y": "Espandi a schermo intero",
    "rd.collapseA11y": "Torna al riquadro piccolo",
    "ld.bringBack": "Riprendi l'ultima lettera",
    "ld.offlineDesk": "Le tue lettere saranno qui appena torni online.",
    "ld.loading.a11y": "Le lettere di oggi stanno arrivando.",
    "ld.countdown": "{h} H {m} MIN",
    "ld.notYet": "NON ANCORA",
    "wl.from": "DALLA TUA MESSAGGERA",
    "wl.count.0": "Oggi dalla tua scrivania non è passato niente.",
    "wl.count.1": "Una sola. L'ho contata due volte.",
    "wl.count.N": "Erano {n}. Le ho contate due volte.",
    "wl.replied.1": "Hai risposto a una.",
    "wl.replied.N": "Hai risposto a {n}.",
    "wl.waiting.1": "Una aspetta ancora la tua risposta. Non scappa mica.",
    "wl.waiting.N": "{n} aspettano ancora la tua risposta. Non scappano mica.",
    "wl.next": "Torno con le prossime alle {t}.",
    "wl.invite": "Vai a cercare una piccola cosa che valga una lettera — oppure vieni a fare un giro con me.",
    "wl.invitePlain": "Vai a cercare una piccola cosa che valga una lettera.",
    "wl.sign": "— {initial}.",
    "wl.a11y": "Una lettera da {name}",
    "bag.opens": "APRE ALLE {t}",
    "win.fly": "Un giro con {name}",
    "pub.ask": "«Questa per chi è?»",
    "pub.letter": "Scrivi una lettera",
    "pub.letterSub": "{name} la porta a qualcuno che non conosci",
    "pub.left": "ANCORA {n}",
    "pub.note": "Nota di diario",
    "pub.noteSub": "Resta con te · testo, voce, foto",
    "pub.popLetter": "Lettera",
    "pub.popNote": "Nota",
  },
  /* ── ja · 日本語 ── */
  {
    "ld.next": "次へ",
    "ld.replyBtn": "返事",
    "ld.left.a11y.1": "次の手紙。今日はあと1通です。",
    "ld.left.a11y": "次の手紙。今日はあと{n}通です。",
    "ld.writeBackTo": "{name}に返事を書く…",
    // the reply box over the keyboard (2026-11-09): who you are answering, and its two buttons' VoiceOver labels
    "rd.replyingTo": "{name}への返事",
    "rd.expandA11y": "全画面にする",
    "rd.collapseA11y": "小さい入力欄に戻す",
    "ld.bringBack": "さっきの手紙を戻す",
    "ld.offlineDesk": "オンラインに戻ったら、ここに手紙が届きます。",
    "ld.loading.a11y": "今日の手紙が向かっています。",
    "ld.countdown": "{h}時間{m}分",
    "ld.notYet": "まだ",
    "wl.from": "あなたの伝書鳥より",
    "wl.count.0": "今日は机の前を通った手紙、なかったね。",
    "wl.count.1": "1通。2回数えたよ。",
    "wl.count.N": "{n}通。2回数えたよ。",
    "wl.replied.1": "そのうち1通に返事を書いたね。",
    "wl.replied.N": "そのうち{n}通に返事を書いたね。",
    "wl.waiting.1": "まだ返事を待ってるのが1通。急がなくていいよ。",
    "wl.waiting.N": "まだ返事を待ってるのが{n}通。急がなくていいよ。",
    "wl.next": "次の手紙は{t}に持ってくるね。",
    "wl.invite": "手紙に書きたくなる小さなものを、ひとつ探しに行っておいで。それか、いっしょにひと飛びしよう。",
    "wl.invitePlain": "手紙に書きたくなる小さなものを、ひとつ探しに行っておいで。",
    "wl.sign": "— {name}",
    "wl.a11y": "{name}からの手紙",
    "bag.opens": "{t}にひらく",
    "win.fly": "{name}とひと飛び",
    "pub.ask": "「これは、誰に書く？」",
    "pub.letter": "手紙を書く",
    "pub.letterSub": "{name}が知らない誰かに届けます",
    "pub.left": "あと{n}通",
    "pub.note": "日記",
    "pub.noteSub": "手元に残る · テキスト・声・写真",
    "pub.popLetter": "手紙",
    "pub.popNote": "ノート",
  },
  /* ── ko · 한국어 ── */
  {
    "ld.next": "다음",
    "ld.replyBtn": "답장",
    "ld.left.a11y.1": "다음 편지. 오늘 1통 남았어요.",
    "ld.left.a11y": "다음 편지. 오늘 {n}통 남았어요.",
    "ld.writeBackTo": "{name}에게 답장 쓰기…",
    // the reply box over the keyboard (2026-11-09): who you are answering, and its two buttons' VoiceOver labels
    "rd.replyingTo": "{name}에게 답장 중",
    "rd.expandA11y": "전체 화면으로 펼치기",
    "rd.collapseA11y": "작은 입력창으로 돌아가기",
    "ld.bringBack": "방금 넘긴 편지 되돌리기",
    "ld.offlineDesk": "다시 연결되면 편지가 여기 도착해요.",
    "ld.loading.a11y": "오늘의 편지가 오고 있어요.",
    "ld.countdown": "{h}시간 {m}분",
    "ld.notYet": "아직",
    "wl.from": "전령새의 편지",
    "wl.count.0": "오늘은 책상 앞을 지나간 편지가 없었어.",
    "wl.count.1": "1통. 두 번 세어 봤어.",
    "wl.count.N": "{n}통. 두 번 세어 봤어.",
    "wl.replied.1": "그중 1통에 답장했네.",
    "wl.replied.N": "그중 {n}통에 답장했네.",
    "wl.waiting.1": "아직 답장을 기다리는 게 1통 있어. 천천히 해도 돼.",
    "wl.waiting.N": "아직 답장을 기다리는 게 {n}통 있어. 천천히 해도 돼.",
    "wl.next": "{t}에 다음 편지들 가지고 올게.",
    "wl.invite": "편지에 담을 만한 작은 걸 하나 찾아봐 — 아니면 나랑 한 바퀴 날자.",
    "wl.invitePlain": "편지에 담을 만한 작은 걸 하나 찾아봐.",
    "wl.sign": "— {name}",
    "wl.a11y": "{name}의 편지",
    "bag.opens": "{t}에 열려요",
    "win.fly": "{name}하고 한 바퀴",
    "pub.ask": "“이번 건 누구에게 쓸까?”",
    "pub.letter": "편지 쓰기",
    "pub.letterSub": "{name}의 날개로 모르는 누군가에게",
    "pub.left": "{n}통 남음",
    "pub.note": "일기",
    "pub.noteSub": "나에게만 남아요 · 글, 음성, 사진",
    "pub.popLetter": "편지",
    "pub.popNote": "노트",
  },
);
