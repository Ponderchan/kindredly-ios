import { strings } from "../lib/i18n";

/* WHAT'S NEW IN 1.0.5 — THE REEL'S OWN WORDS (owner, 2026-10-25: every new part of 1.0.5 in the
   what's-new card: Stamp Press, letter papers, the new identity, This or That, sky postcards, the
   font). components/news-reel/v1-0-5 imports this file for its side effect.
   ────────────────────────────────────────────────────────────────────────
   Each scene's caption (nw105.<scene>), set over the scene in big type, two lines at most: a
   sentence, sentence case, no full stop unless it is two sentences. The rest is what the scenes
   show written in: the #topic typed on the pressed stamp, the letter on the papers, the pen name
   you sign with, the line the font scene sets in each face. Everything else in the reel is words
   the app already has (cs2.*, pp.*, id2.*, sp.*, set.*), so it reads as the screens do.

   Nine languages (2026-10-25), each written by a native writer from the English brief and read
   blind by a native editor, not translated: the topics, the letter and the pen names are each
   language's own. Never gender the writer; a pen name is a name, not a word. */

strings(
  /* ── en · English ── */
  {
    // the captions, one per scene
    "nw105.press": "Press a moment into your own stamp",
    "nw105.papers": "Seven papers to write on",
    "nw105.names": "Your courier names every stranger",
    "nw105.trade": "Trade names. You both open at once.",
    "nw105.pick": "This or That: pick blind, see both",
    "nw105.sky": "Wave with the sky you're under",
    "nw105.font": "Choose the font you write in",
    // the pressed stamp's #topic, as someone would type it (≤ 24, lower case, with its #)
    "nw105.press.topic": "#last swim",
    // the letter on the papers: three short lines at most
    "nw105.papers.line": "Dear stranger, it rained all day here, so I wrote to you.",
    // the pen name you sign with (theirs is ga.mira)
    "nw105.trade.pen": "Theo",
    // the line the font scene sets in each face: two lines at most
    "nw105.font.line": "Some days a letter is the best part.",
    // the card under Wren's post, as a guide card reads: a title, one paragraph, the button
    "nw105.card.title": "What's new",
    "nw105.card.body": "Press your own stamps from a photo and write on seven papers. Strangers now go by the names your courier gives them, and trading names means signing: both open at once. In a kindred room, This or That and sky postcards. And pick the font you write in.",
    "nw105.card.cta": "Press your first stamp",
  },
  /* ── es · Español ── */
  {
    "nw105.press": "Haz de un momento tu propio sello",
    "nw105.papers": "Siete papeles de carta",
    "nw105.names": "Tu mensajero bautiza a cada desconocido",
    "nw105.trade": "Intercambia nombres: se abren a la vez",
    "nw105.pick": "Esto o aquello, a ciegas y a la vez",
    "nw105.sky": "Saluda con el cielo que tienes encima",
    "nw105.font": "Elige la letra con la que escribes",
    "nw105.press.topic": "#último chapuzón",
    "nw105.papers.line": "Hola, tú. Aquí llovió todo el día, así que me puse a escribirte.",
    "nw105.trade.pen": "Alex",
    "nw105.font.line": "Hay días en que lo mejor es una carta.",
    "nw105.card.title": "Novedades",
    "nw105.card.body": "Crea tus propios sellos a partir de una foto y escribe en siete papeles de carta. Ahora los desconocidos llevan el nombre que les pone tu mensajero, e intercambiar nombres es firmar: las dos firmas se abren a la vez. En la sala de un afín, Esto o aquello y postales del cielo. Y elige la letra con la que escribes.",
    "nw105.card.cta": "Crea tu primer sello",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "nw105.press": "Faça de um momento o seu selo",
    "nw105.papers": "Sete papéis de carta",
    "nw105.names": "Seu mensageiro batiza os desconhecidos",
    "nw105.trade": "Troque nomes. Tudo se abre junto.",
    "nw105.pick": "Isso ou aquilo: às cegas, lado a lado",
    "nw105.sky": "Acene com o céu de onde você está",
    "nw105.font": "Escreva na fonte que é a sua cara",
    "nw105.press.topic": "#último mergulho",
    "nw105.papers.line": "Oi, você aí. Choveu o dia todo aqui, então resolvi te escrever.",
    "nw105.trade.pen": "Dani",
    "nw105.font.line": "Tem dias que o melhor é uma carta.",
    "nw105.card.title": "Novidades",
    "nw105.card.body": "Crie seus próprios selos a partir de uma foto e escreva em sete papéis de carta. Agora os desconhecidos atendem pelo nome que seu mensageiro escolhe, e trocar nomes é assinar: as duas assinaturas se abrem juntas. Na sala de uma alma afim, Isso ou aquilo e cartões-postais do céu. E escolha a fonte em que você escreve.",
    "nw105.card.cta": "Crie seu primeiro selo",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "nw105.press": "Cetak momen jadi perangkomu sendiri",
    "nw105.papers": "Tujuh pilihan kertas untuk suratmu",
    "nw105.names": "Kurirmu menamai setiap orang asing",
    "nw105.trade": "Tukar nama. Terungkap bersamaan.",
    "nw105.pick": "Ini atau Itu: tanpa ngintip, buka bareng",
    "nw105.sky": "Sapa dengan langit di atasmu",
    "nw105.font": "Pilih font untuk tulisanmu",
    "nw105.press.topic": "#sebelum pulang",
    "nw105.papers.line": "Hai, orang asing. Di sini hujan seharian, jadi aku nulis buat kamu.",
    "nw105.trade.pen": "Ari",
    "nw105.font.line": "Kadang, sepucuk surat jadi bagian terbaik hariku.",
    "nw105.card.title": "Yang baru",
    "nw105.card.body": "Sekarang kamu bisa mencetak perangko sendiri dari foto dan menulis di tujuh pilihan kertas. Orang asing kini dipanggil dengan nama pemberian kurirmu, dan bertukar nama berarti saling tanda tangan: keduanya terbuka bersamaan. Di ruang kerabat ada Ini atau Itu dan Sapa dengan foto langitmu. Font tulisanmu pun bisa kamu pilih.",
    "nw105.card.cta": "Cetak perangko pertamamu",
  },
  /* ── fr · Français ── */
  {
    "nw105.press": "Fais d'un instant ton propre timbre",
    "nw105.papers": "Sept papiers pour tes lettres",
    "nw105.names": "Ta messagère baptise les inconnus",
    "nw105.trade": "Nom contre nom, dévoilés d'un coup",
    "nw105.pick": "L'un ou l'autre : en secret, puis ensemble",
    "nw105.sky": "Fais coucou avec ton bout de ciel",
    "nw105.font": "Choisis ta police d'écriture",
    "nw105.press.topic": "#dernière baignade",
    "nw105.papers.line": "Toi qui me lis, il a plu toute la journée ici, alors je t'écris.",
    "nw105.trade.pen": "Sacha",
    "nw105.font.line": "Il y a des jours où le meilleur, c'est une lettre.",
    "nw105.card.title": "Nouveautés",
    "nw105.card.body": "Presse tes propres timbres à partir d'une photo et écris sur sept papiers à lettres. Les inconnus portent désormais le nom que leur donne ta messagère, et échanger vos noms, c'est signer : les deux s'ouvrent en même temps. Entre semblables, place à L'un ou l'autre et aux coucous avec ton ciel. Et choisis ta police d'écriture.",
    "nw105.card.cta": "Presse ton premier timbre",
  },
  /* ── de · Deutsch ── */
  {
    "nw105.press": "Mach aus einem Moment deine Marke",
    "nw105.papers": "Sieben Briefpapiere zur Wahl",
    "nw105.names": "Deine Botin tauft alle Fremden",
    "nw105.trade": "Tauscht Namen. Ihr seht euch zugleich.",
    "nw105.pick": "Dies oder das: blind wählen, aufdecken",
    "nw105.sky": "Wink mit dem Himmel über dir",
    "nw105.font": "Wähl die Schrift, in der du schreibst",
    "nw105.press.topic": "#letzter badetag",
    "nw105.papers.line": "Hallo du, hier regnet's seit heute früh, also schreib ich dir.",
    "nw105.trade.pen": "Toni",
    "nw105.font.line": "Manchmal ist ein Brief das Schönste am Tag.",
    "nw105.card.title": "Das ist neu",
    "nw105.card.body": "Mach aus deinen Fotos eigene Marken und schreib auf sieben Briefpapieren. Fremde heißen jetzt so, wie deine Botin sie tauft, und Namen tauscht ihr per Unterschrift: Beide öffnen sich zugleich. Bei Seelenverwandten warten „Dies oder das“ und Himmelspostkarten. Und du suchst dir die Schrift aus, in der du schreibst.",
    "nw105.card.cta": "Deine erste Marke pressen",
  },
  /* ── it · Italiano ── */
  {
    "nw105.press": "Fai di un momento il tuo francobollo",
    "nw105.papers": "Sette carte su cui scrivere",
    "nw105.names": "La messaggera battezza gli sconosciuti",
    "nw105.trade": "Scambio di nomi: vi svelate insieme",
    "nw105.pick": "Questo o quello: al buio, poi insieme",
    "nw105.sky": "Saluta con il cielo sopra di te",
    "nw105.font": "Scegli il carattere con cui scrivi",
    "nw105.press.topic": "#ultimo bagno",
    "nw105.papers.line": "Ciao, chiunque tu sia. Qui piove da stamattina, così ti scrivo.",
    "nw105.trade.pen": "Dani",
    "nw105.font.line": "Certi giorni, la parte più bella è una lettera.",
    "nw105.card.title": "Novità",
    "nw105.card.body": "Crea francobolli tuoi da una foto e scrivi su sette carte da lettere. Ora gli sconosciuti hanno il nome che gli dà la tua messaggera, e i nomi si scambiano con una firma: si svelano insieme. Nella stanza di un'anima affine arrivano Questo o quello e le cartoline del cielo. E puoi scegliere il carattere con cui scrivi.",
    "nw105.card.cta": "Crea il primo francobollo",
  },
  /* ── ja · 日本語 ── */
  {
    "nw105.press": "この瞬間を、自分だけの切手に",
    "nw105.papers": "書きたくなる便箋、7種類",
    "nw105.names": "見知らぬ人の名づけ親は伝書鳥",
    "nw105.trade": "名前を交換。ひらくのは同時。",
    "nw105.pick": "どっち？ 内緒で選んで、せーの",
    "nw105.sky": "いま見上げてる空で手を振ろう",
    "nw105.font": "好きな書体で、手紙を書こう",
    "nw105.press.topic": "#今年さいごの海",
    "nw105.papers.line": "見知らぬあなたへ。今日はずっと雨だったから、手紙を書いてみました。",
    "nw105.trade.pen": "ソラ",
    "nw105.font.line": "手紙がいちばんうれしい日も、ある。",
    "nw105.card.title": "新機能",
    "nw105.card.body": "切手プレスで写真から自分だけの切手を作り、7種類の便箋に書けるようになりました。見知らぬ人は伝書鳥がつけた名前で呼ばれ、サインで名前を交換すると、ふたつの名前が同時にひらきます。心友の部屋では「どっち？」で遊んだり、いまの空で手を振ったり。手紙の書体も選べます。",
    "nw105.card.cta": "はじめての切手をつくる",
  },
  /* ── ko · 한국어 ── */
  {
    "nw105.press": "이 순간을 나만의 우표로",
    "nw105.papers": "골라 쓰는 편지지, 일곱 가지",
    "nw105.names": "낯선 이의 이름은 전령새가 지어요",
    "nw105.trade": "이름 교환. 열리는 건 동시에.",
    "nw105.pick": "밸런스 게임: 몰래 골라 동시에 공개",
    "nw105.sky": "지금 머리 위 하늘로 손 인사",
    "nw105.font": "좋아하는 글꼴로 써요",
    "nw105.press.topic": "#올여름 마지막 바다",
    "nw105.papers.line": "낯선 당신에게. 여긴 하루 종일 비가 와서, 편지를 써 봐요.",
    "nw105.trade.pen": "다온",
    "nw105.font.line": "편지 한 통이 하루의 낙인 날도 있어요.",
    "nw105.card.title": "새로운 기능",
    "nw105.card.body": "우표 프레스로 사진 속 순간을 나만의 우표로 만들고, 일곱 가지 편지지에 써 보세요. 낯선 사람은 이제 전령새가 지어 준 이름으로 불리고, 서로 서명하면 두 이름이 동시에 열려요. 인연의 방에는 밸런스 게임과 내 하늘을 보내는 손 인사가 생겼어요. 편지 글꼴도 고를 수 있어요.",
    "nw105.card.cta": "첫 우표 만들기",
  },
);
