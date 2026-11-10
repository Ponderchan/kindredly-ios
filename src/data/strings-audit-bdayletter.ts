import { strings } from "../lib/i18n";

/* WREN'S BIRTHDAY LETTER — its words (owner's audit, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   On the reader's birthday the first card on Today is a letter from their
   courier (lib/birthday-core decides the day; today-cards buildWrenCard
   sets these lines; the Swift desk draws them on the letter card, in the
   reader's Letter font). The old onboarding promised "whoever hatches keeps
   it, and writes to you on the day"; this is that letter.

   English only for now: t() falls back to English, and the other eight
   languages are written natively after this (AS the language, never
   translated). Registered like strings-today3d.ts; imported for its side
   effect by useTodayDesk.

   HER VOICE: first person, lower case (where the language has case; German
   keeps its capital nouns), warm, a little funny, never corporate, no
   exclamation marks and no emoji. She remembers the day because she was
   told it once and kept it. She never says how old the reader is: the year
   is not hers to mention.

   Her name is never written into a line: {name} is the reader's own name
   for her (useWrenName), and a two-word name must read right in it.

   THE ONE NUMBER ({n}) is a count the phone holds at that moment: the
   strangers' letters on today's desk not yet passed, which are, literally,
   under her letter. One has its own line, none has its own line, and when
   the phone doesn't know (an offline cold start with nothing kept) the line
   is left out, so the letter must read whole without it.

   The letter is three or four lines, each a short sentence on its own line,
   in this order: hello, kept, cake, then the count line (or none).

   Reused, no new copy: wl.a11y ("A letter from {name}": VoiceOver's opening
   for the card). */

strings(
  /* ── en · English ── */
  {
    // line 1: the whole greeting, on its own line (letter font, about 21pt; keep it this short)
    "bd.hello": "happy birthday.",
    // line 2: how she knows. She was told the date once (onboarding, or Edit profile) and kept it; no year, no age
    "bd.kept": "you told me the date once, and i kept it.",
    // line 3: the small joke, and why there is a letter. One sentence
    "bd.cake": "i can't carry a cake, so i brought this.",
    // line 4, when strangers' letters are waiting under hers: {n} is how many (2 to 15), exact
    "bd.under.N": "the {n} letters under this one can wait a minute.",
    // line 4, when exactly one is waiting (no number written)
    "bd.under.1": "the letter under this one can wait a minute.",
    // line 4, when nothing is waiting under hers (the day's letters are done, or none came today)
    "bd.under.0": "nothing is waiting under this one, so there's no rush.",
    // the sign-off under the lines: her whole name as the reader named her (not the initial her
    // evening note signs with); a dash first where the language signs letters that way
    "bd.sign": "— {name}",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.hello": "feliz cumpleaños.",
    "bd.kept": "me dijiste la fecha una vez, y me la guardé.",
    "bd.cake": "no puedo volar con un pastel, así que te traje esto.",
    "bd.under.N": "las {n} cartas que hay debajo de esta pueden esperar un minuto.",
    "bd.under.1": "la carta que hay debajo de esta puede esperar un minuto.",
    "bd.under.0": "debajo de esta no espera nada, así que no hay apuro.",
    "bd.sign": "— {name}",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.hello": "feliz aniversário.",
    "bd.kept": "você me contou a data uma vez, e eu guardei.",
    "bd.cake": "não dá pra voar com um bolo, então te trouxe isso.",
    "bd.under.N": "as {n} cartas embaixo desta podem esperar um minutinho.",
    "bd.under.1": "a carta embaixo desta pode esperar um minutinho.",
    "bd.under.0": "não tem nada esperando embaixo desta, então sem pressa.",
    "bd.sign": "— {name}",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.hello": "selamat ulang tahun.",
    "bd.kept": "kamu pernah bilang tanggalnya sekali, dan itu kusimpan.",
    "bd.cake": "aku nggak kuat bawa kue, jadi kubawa ini aja.",
    "bd.under.N": "{n} surat di bawah ini bisa nunggu sebentar.",
    "bd.under.1": "surat di bawah ini bisa nunggu sebentar.",
    "bd.under.0": "nggak ada yang nunggu di bawah ini, jadi santai aja.",
    "bd.sign": "— {name}",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.hello": "joyeux anniversaire.",
    "bd.kept": "tu m'as dit la date une fois, et je l'ai gardée.",
    "bd.cake": "un gâteau, c'est trop lourd pour moi, alors je t'ai apporté ça.",
    "bd.under.N": "les {n} lettres sous celle-ci peuvent attendre une minute.",
    "bd.under.1": "la lettre sous celle-ci peut attendre une minute.",
    "bd.under.0": "rien n'attend sous celle-ci, alors rien ne presse.",
    "bd.sign": "— {name}",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.hello": "alles Gute zum Geburtstag.",
    "bd.kept": "du hast mir das Datum einmal verraten, und ich hab es mir gemerkt.",
    "bd.cake": "eine Torte kann ich nicht tragen, also hab ich das hier mitgebracht.",
    "bd.under.N": "die {n} Briefe unter diesem hier können kurz warten.",
    "bd.under.1": "der Brief unter diesem hier kann kurz warten.",
    "bd.under.0": "unter diesem hier wartet nichts, also keine Eile.",
    "bd.sign": "— {name}",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.hello": "buon compleanno.",
    "bd.kept": "una volta mi hai detto la data, e io l'ho tenuta a mente.",
    "bd.cake": "una torta non riesco a portarla, così ti ho portato questa.",
    "bd.under.N": "le {n} lettere qui sotto possono aspettare un minuto.",
    "bd.under.1": "la lettera qui sotto può aspettare un minuto.",
    "bd.under.0": "qui sotto non aspetta niente, quindi nessuna fretta.",
    "bd.sign": "— {name}",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.hello": "誕生日おめでとう。",
    "bd.kept": "一度だけ教えてくれた日付、ずっととっておいたよ。",
    "bd.cake": "ケーキはくわえて飛べないから、かわりにこれを持ってきたよ。",
    "bd.under.N": "この下の{n}通には、少し待っててもらおう。",
    "bd.under.1": "この下の手紙には、少し待っててもらおう。",
    "bd.under.0": "この下で待ってる手紙はないから、急がなくていいよ。",
    "bd.sign": "— {name}",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.hello": "생일 축하해.",
    "bd.kept": "언젠가 한 번 알려 준 날짜, 잘 간직하고 있었어.",
    "bd.cake": "케이크는 물고 올 수가 없어서, 대신 이걸 가져왔어.",
    "bd.under.N": "이 아래 {n}통은 잠깐 기다리게 둬도 돼.",
    "bd.under.1": "이 아래 편지는 잠깐 기다리게 둬도 돼.",
    "bd.under.0": "이 아래엔 기다리는 편지가 없으니까, 천천히 해도 돼.",
    "bd.sign": "— {name}",
  },
);
