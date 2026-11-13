import { strings } from "../lib/i18n";

/* WHAT'S NEW IN 1.0.9 — THE REEL'S OWN WORDS (owner, 2026-11-13: "做的有创意一点 类似创意广告
   的思维做 别总是流水线似的"). components/news-reel/v1-0-9 imports this file for its side effect.
   ────────────────────────────────────────────────────────────────────────
   The reel is one night, not a list: at 11:47 pm your thumb goes for "just one more", the desk
   gives you exactly that (the tenth letter) and then nothing, she is tucked into bed, sleeps on
   her planet lit by everyone your letters reached, and at dawn the night folds into the new icon,
   where she has been peeking all along. Its lines:
     nw109.oneMore   the caption over the home screen, the guilty thumb (an idiom, re-invented)
     nw109.card9     the ninth letter's opening line, small, in the letter font
     nw109.card10    the tenth: someone saying no, just before the desk does (a wink)
     nw109.seeYou    Wren falling asleep (her casual register; ko 반말)
     nw109.lights    the caption under the night: a lamp is someone your letter REACHED (sat on
                     their desk), never "read", never "right now", never a gendered "everyone"
     nw109.icon1/2   Wren, from the icon: flat, then re-reading the static picture (she peeks
                     over the edge: she must be checking the time), calling back nw109.seeYou
   Everything else in the reel is words the app already has: her bedtime lines
   (af.bed.say.idle.N with n = 10, af.bed.say.pat.0), the three bedtime keys (af.bed.snack / pat /
   lights), Next and Reply (ld.next, ld.replyBtn), the stamps' names, and the strangers' names
   (lib/stranger-name, each language's own).

   The card under the reel: a title, one paragraph that stands without the reel (a post read on a
   build without this reel shows only the words), and a button to her planet.

   Lower case where the script has case (it's her and the night talking), no exclamation marks,
   never marketing voice, nothing about gender marks or prices.

   Eight languages (2026-11-13), each written by a native writer from the brief (what each line is
   for, the reel's beats, the app's own words in that language) and read blind by a native editor
   (workflow wf_c65c109e-87d): the idioms are each language's own ("einer geht noch.", "あと1通だけ。"),
   so are the lamps' word (farolillo, luzinha, veilleuse, Lämpchen, lucina, lampu, 灯り, 불빛). */

strings(
  /* ── en · English ── */
  {
    "nw109.oneMore": "just one more.",
    "nw109.card9": "can't sleep either?",
    "nw109.card10": "today i finally said no.",
    "nw109.seeYou": "see you at 8.",
    "nw109.lights": "each light is someone your letter reached.",
    "nw109.icon1": "new icon.",
    "nw109.icon2": "it's me. checking if it's 8 yet.",
    "nw109.card.title": "Today has an ending now.",
    "nw109.card.body": "Ten letters a day, then Today closes till 8:00: her mailbox, a receipt on Sundays, or bedtime if you finish after 8 pm. Me opens on her planet, a stamp for every letter she's carried. In Kindreds, round faces have names; squares are still strangers.",
    "nw109.card.cta": "See her planet",
  },
  /* ── es · Español ── */
  {
    "nw109.oneMore": "la última y a dormir.",
    "nw109.card9": "¿tú tampoco pegas ojo?",
    "nw109.card10": "hoy por fin he dicho que no.",
    "nw109.seeYou": "nos vemos a las 8.",
    "nw109.lights": "cada farolillo es alguien a quien le llegó tu carta.",
    "nw109.icon1": "icono nuevo.",
    "nw109.icon2": "soy yo, asomada a ver si ya son las 8.",
    "nw109.card.title": "Hoy ya tiene final.",
    "nw109.card.body": "Diez cartas al día; luego, Hoy cierra hasta las 8:00 y se convierte en el buzón de tu mensajera, un recibo los domingos o, si acabas pasadas las 20:00, la hora de dormir. En Yo te espera su planeta: un sello por cada carta que ha llevado. En Afines, las caras redondas tienen nombre; las cuadradas aún son desconocidas.",
    "nw109.card.cta": "Ver su planeta",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "nw109.oneMore": "só mais umazinha.",
    "nw109.card9": "também perdeu o sono?",
    "nw109.card10": "hoje finalmente consegui dizer não.",
    "nw109.seeYou": "a gente se vê às 8.",
    "nw109.lights": "cada luzinha é alguém que recebeu sua carta.",
    "nw109.icon1": "ícone novo.",
    "nw109.icon2": "sou eu. espiando pra ver se já deu 8.",
    "nw109.card.title": "Agora o Hoje tem um final.",
    "nw109.card.body": "Dez cartas por dia. Depois, o Hoje fecha até as 8h e vira a caixa de correio da sua mensageira, um recibo aos domingos ou, se terminar depois das 20h, a hora de dormir. A aba Eu abre no planeta dela: um selo para cada carta que ela levou. Em Afins, rostos redondos têm nome; os quadrados seguem desconhecidos.",
    "nw109.card.cta": "Ver o planeta dela",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "nw109.oneMore": "satu lagi deh.",
    "nw109.card9": "aku nggak bisa tidur. kamu juga?",
    "nw109.card10": "hari ini akhirnya aku berani nolak.",
    "nw109.seeYou": "hoaam. ketemu jam 8 ya.",
    "nw109.lights": "tiap lampu itu seseorang yang kedatangan suratmu.",
    "nw109.icon1": "ikon baru.",
    "nw109.icon2": "ini aku lagi ngintip. udah jam 8 belum? belum.",
    "nw109.card.title": "Hari ini sekarang ada tamatnya.",
    "nw109.card.body": "Sepuluh surat sehari, lalu Hari ini tutup sampai 08.00 dan berganti jadi kotak surat kurirmu, struk di hari Minggu, atau jam tidurnya kalau kamu selesai lewat 20.00. Di tab Saya, kamu disambut planetnya yang ditempeli satu perangko untuk tiap surat yang dia bawa. Di Kerabat, wajah bulat punya nama; yang kotak masih orang asing.",
    "nw109.card.cta": "Lihat planetnya",
  },
  /* ── fr · Français ── */
  {
    "nw109.oneMore": "une dernière, promis.",
    "nw109.card9": "toi non plus, tu dors pas ?",
    "nw109.card10": "aujourd’hui, j’ai enfin dit non.",
    "nw109.seeYou": "bonne nuit. à 8 h.",
    "nw109.lights": "chaque veilleuse, c’est quelqu’un qui a reçu ta lettre.",
    "nw109.icon1": "nouvelle icône.",
    "nw109.icon2": "c’est moi qui pointe le bout du bec. il\u00a0est\u00a08\u00a0h\u00a0?",
    "nw109.card.title": "Aujourd'hui a désormais une fin.",
    "nw109.card.body": "Dix lettres par jour, puis Aujourd'hui ferme jusqu'à 8 h. À la place : la boîte aux lettres de ta messagère, un reçu le dimanche, ou l'heure de la coucher si tu finis après 20 h. L'onglet Moi s'ouvre sur sa planète : un timbre par lettre qu'elle a portée. Côté Semblables, les visages ronds ont un nom, les carrés pas encore.",
    "nw109.card.cta": "Voir sa planète",
  },
  /* ── de · Deutsch ── */
  {
    "nw109.oneMore": "einer geht noch.",
    "nw109.card9": "du auch noch wach?",
    "nw109.card10": "hab heute endlich mal nein gesagt.",
    "nw109.seeYou": "bis um 8. nacht.",
    "nw109.lights": "jedes lämpchen ist jemand, bei dem dein brief ankam.",
    "nw109.icon1": "neues icon.",
    "nw109.icon2": "ich bin's. guck nur, ob's schon 8 ist. noch nicht.",
    "nw109.card.title": "Alles hat ein Ende. Jetzt auch „Heute“.",
    "nw109.card.body": "Zehn Briefe am Tag, dann macht „Heute“ bis 8 Uhr zu. Dort wartet der Briefkasten deiner Botin, sonntags ein Kassenbon. Bist du nach 20 Uhr fertig, bringst du sie ins Bett. „Ich“ zeigt ihren Planeten: eine Marke für jeden Brief, den sie getragen hat. Bei den Seelenverwandten haben runde Gesichter Namen, eckige sind noch Fremde.",
    "nw109.card.cta": "Ihren Planeten ansehen",
  },
  /* ── it · Italiano ── */
  {
    "nw109.oneMore": "l’ultima e poi dormo.",
    "nw109.card9": "neanche tu riesci a dormire?",
    "nw109.card10": "oggi finalmente ho detto di no.",
    "nw109.seeYou": "ci becchiamo alle 8.",
    "nw109.lights": "ogni lucina è qualcuno a cui è arrivata la tua lettera.",
    "nw109.icon1": "icona nuova.",
    "nw109.icon2": "qui sto sbirciando se sono già le 8.",
    "nw109.card.title": "D'ora in poi, Oggi ha un finale.",
    "nw109.card.body": "Dieci lettere al giorno, poi Oggi chiude fino alle 8:00 e trovi la cassetta postale della tua messaggera, uno scontrino la domenica o, se finisci dopo le 20, la sua buonanotte. La scheda Io si apre sul suo pianeta: un francobollo per ogni lettera che ha portato. In Affini i volti tondi hanno un nome, i quadrati non ancora.",
    "nw109.card.cta": "Guarda il suo pianeta",
  },
  /* ── ja · 日本語 ── */
  {
    "nw109.oneMore": "あと1通だけ。",
    "nw109.card9": "もしかして、そっちも眠れない？",
    "nw109.card10": "今日やっと、ちゃんと断れた。",
    "nw109.seeYou": "8時にね…おやすみ",
    "nw109.lights": "灯りの数だけ、あなたの手紙が届いた誰かがいる。",
    "nw109.icon1": "アイコン変わった。",
    "nw109.icon2": "ちなみにこれ、わたし。8時まだかなって覗いてる。",
    "nw109.card.title": "今日に「おしまい」ができました",
    "nw109.card.body": "手紙は1日10通。読み終えると「今日」は朝8時まで閉店して、伝書鳥のポストになります。日曜はレシートに、夜8時を過ぎて読み終えた日はおやすみの時間に。「わたし」を開くと、まず伝書鳥の小さな星。運んだ手紙1通ごとに切手が貼られています。「心友」では、丸い顔は名前のある相手、四角はまだ見知らぬ人です。",
    "nw109.card.cta": "伝書鳥の星を見る",
  },
  /* ── ko · 한국어 ── */
  {
    "nw109.oneMore": "딱 한 통만 더.",
    "nw109.card9": "혹시 너도 잠 안 와?",
    "nw109.card10": "오늘 드디어 싫다고 말했어.",
    "nw109.seeYou": "8시에 봐… 잘 자.",
    "nw109.lights": "불빛 하나하나, 내 편지가 닿은 누군가.",
    "nw109.icon1": "아이콘 바뀜.",
    "nw109.icon2": "참고로 그거 나야. 8시 됐나 빼꼼 내다보는 중.",
    "nw109.card.title": "오늘에도 엔딩이 생겼어요",
    "nw109.card.body": "편지는 하루 10통. 다 읽으면 ‘오늘’은 오전 8시까지 문을 닫아요. 평소엔 전령새의 우체통이, 일요일엔 영수증이, 밤 8시 넘어 다 읽은 날엔 잘 시간이 기다려요. ‘나’를 열면 먼저 전령새의 작은 행성이 보여요. 배달한 편지마다 우표가 한 장씩 붙어 있죠. ‘인연’에서 동그란 얼굴은 이름이 있는 사람, 네모는 아직 낯선 사람이에요.",
    "nw109.card.cta": "전령새의 행성 보기",
  },
);
