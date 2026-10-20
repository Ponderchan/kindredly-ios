import { strings } from "../lib/i18n";

/* LETTER PAPERS — THE WORDS (owner, 2026-10-20; contract .claude/papers/CONTRACT.md §8).
   ────────────────────────────────────────────────────────────────────────
   The paper key and the paper strip in the compose screen, the compose key while a paper can't go
   yet (gold for First Class, locked until a first kindred), the Today band's two labels (B8), and
   what VoiceOver says about a card's paper. The paper names are the prototype's (papers.ts).

   Mono-caps lines (the strip's head, DONE, the key's labels, 1ST) are written in capitals where the
   language has case; the app upper-cases nothing in them except {name} in pp.strip.head. The names
   under the swatches are shown lower-cased by the app. First Class is named as strings.ts names it
   in each language (me.firstClass / fc.paidHead); a kindred is the word the app already uses for
   one (kd.tab.kindreds). Never gender the writer.

   First Class: Primera Clase, Primeira Classe, Kelas Utama, Première classe, Erste Klasse, Prima
   classe, ファーストクラス, 퍼스트 클래스. A first kindred as wren.lock.kindred / me.fc.closes say it:
   primer afín, primeira alma afim, kerabat pertama, premier semblable, erste Seelenverwandtschaft,
   prima anima affine, はじめての心友, 첫 인연. The names read the way a stationer of each language
   would label the paper: Kraft and Riso stay as the trade words (kraft paper, risograph) where the
   language uses them; Airmail is the language's own airmail word (papel avión, via aérea, Pos Udara,
   par avion, Luftpost, via aerea, エアメール, 항공우편). "{name} paper" is built around the name the way
   each language joins them (papel {name}, {name}の便箋, {name} 편지지 …).

   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same keys:
   src/data/strings-papers.test.ts checks they agree (node src/data/strings-papers.test.ts).
   Consumers import this file for its side effect and reference only the keys below. */

strings(
  /* ── en · English ── */
  {
    // the papers' names: the strip's head (upper-cased into {name}), the swatch's label (lower-cased), VoiceOver
    "pp.name.plain": "Plain",
    "pp.name.grid": "Grid",
    "pp.name.kraft": "Kraft",
    "pp.name.airmail": "Airmail",
    "pp.name.receipt": "Receipt",
    "pp.name.sticky": "Sticky",
    "pp.name.riso": "Riso",
    // the strip's head, mono caps; {name} is the chosen paper's name, upper-cased by the app
    "pp.strip.head": "PAPER · {name}",
    // after the head, in gold, when the chosen paper is a First Class one
    "pp.strip.fc": "· FIRST CLASS",
    // after the head, in indigo, when the chosen paper is Airmail and there is no kindred yet
    "pp.strip.kindred": "· FIRST KINDRED",
    // the strip's right-hand key: closes it, mono caps
    "pp.strip.done": "DONE",
    // the gold badge on a First Class swatch, mono caps (very short)
    "pp.badge.fc": "1ST",
    // the compose key, gold, when a non-member has picked a First Class paper (opens the paywall)
    "pp.key.fc": "SEND ON FIRST CLASS PAPER →",
    // the same where that doesn't fit
    "pp.key.fc.narrow": "FIRST CLASS →",
    // the compose key, locked, when Airmail is picked before a first kindred (does nothing)
    "pp.key.locked": "OPENS WITH YOUR FIRST KINDRED",
    // the same where that doesn't fit
    "pp.key.locked.narrow": "LOCKED",
    // VoiceOver: the paper key in the compose toolbar
    "pp.a11y.key": "Letter paper",
    // VoiceOver: a swatch in the strip; {name} is the paper's name
    "pp.a11y.paper": "{name} paper",
    // VoiceOver: a First Class swatch's value
    "pp.a11y.fc": "First Class",
    // VoiceOver: Airmail's value before a first kindred
    "pp.a11y.locked": "Opens with your first kindred",
    // VoiceOver: the gold key's hint
    "pp.a11y.upgrade": "Opens First Class",
    // VoiceOver: added to a Today card's label when its letter is on a paper other than Plain; {name} is the paper's name
    "pp.a11y.onPaper": "Written on {name} paper.",
    // the Today band's two labels under the grey circles (B8), sentence case
    "pp.next": "Next",
    "pp.reply": "Reply",
  },
  /* ── es · Español ── */
  {
    "pp.name.plain": "Liso",
    "pp.name.grid": "Cuadriculado",
    "pp.name.kraft": "Kraft",
    "pp.name.airmail": "Avión",
    "pp.name.receipt": "Ticket",
    "pp.name.sticky": "Nota adhesiva",
    "pp.name.riso": "Riso",
    "pp.strip.head": "PAPEL · {name}",
    "pp.strip.fc": "· PRIMERA CLASE",
    "pp.strip.kindred": "· PRIMER AFÍN",
    "pp.strip.done": "LISTO",
    "pp.badge.fc": "1.ª",
    "pp.key.fc": "ENVIAR EN PAPEL DE PRIMERA CLASE →",
    "pp.key.fc.narrow": "PRIMERA CLASE →",
    "pp.key.locked": "SE ABRE CON TU PRIMER AFÍN",
    "pp.key.locked.narrow": "BLOQUEADO",
    "pp.a11y.key": "Papel de carta",
    "pp.a11y.paper": "Papel {name}",
    "pp.a11y.fc": "Primera Clase",
    "pp.a11y.locked": "Se abre con tu primer afín",
    "pp.a11y.upgrade": "Abre Primera Clase",
    "pp.a11y.onPaper": "Escrita en papel {name}.",
    "pp.next": "Siguiente",
    "pp.reply": "Responder",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "pp.name.plain": "Liso",
    "pp.name.grid": "Quadriculado",
    "pp.name.kraft": "Kraft",
    "pp.name.airmail": "Via aérea",
    "pp.name.receipt": "Cupom",
    "pp.name.sticky": "Nota adesiva",
    "pp.name.riso": "Riso",
    "pp.strip.head": "PAPEL · {name}",
    "pp.strip.fc": "· PRIMEIRA CLASSE",
    "pp.strip.kindred": "· 1ª ALMA AFIM",
    "pp.strip.done": "PRONTO",
    "pp.badge.fc": "1ª",
    "pp.key.fc": "ENVIAR EM PAPEL PRIMEIRA CLASSE →",
    "pp.key.fc.narrow": "PRIMEIRA CLASSE →",
    "pp.key.locked": "ABRE COM SUA PRIMEIRA ALMA AFIM",
    "pp.key.locked.narrow": "BLOQUEADO",
    "pp.a11y.key": "Papel de carta",
    "pp.a11y.paper": "Papel {name}",
    "pp.a11y.fc": "Primeira Classe",
    "pp.a11y.locked": "Abre com sua primeira alma afim",
    "pp.a11y.upgrade": "Abre a Primeira Classe",
    "pp.a11y.onPaper": "Escrita em papel {name}.",
    "pp.next": "Próxima",
    "pp.reply": "Responder",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "pp.name.plain": "Polos",
    "pp.name.grid": "Kotak-kotak",
    "pp.name.kraft": "Kraft",
    "pp.name.airmail": "Pos Udara",
    "pp.name.receipt": "Struk",
    "pp.name.sticky": "Tempel",
    "pp.name.riso": "Riso",
    "pp.strip.head": "KERTAS · {name}",
    "pp.strip.fc": "· KELAS UTAMA",
    "pp.strip.kindred": "· KERABAT PERTAMA",
    "pp.strip.done": "SELESAI",
    "pp.badge.fc": "UTAMA",
    "pp.key.fc": "KIRIM PAKAI KERTAS KELAS UTAMA →",
    "pp.key.fc.narrow": "KELAS UTAMA →",
    "pp.key.locked": "TERBUKA SAAT ADA KERABAT PERTAMA",
    "pp.key.locked.narrow": "TERKUNCI",
    "pp.a11y.key": "Kertas surat",
    "pp.a11y.paper": "Kertas {name}",
    "pp.a11y.fc": "Kelas Utama",
    "pp.a11y.locked": "Terbuka begitu kamu punya kerabat pertama",
    "pp.a11y.upgrade": "Membuka Kelas Utama",
    "pp.a11y.onPaper": "Ditulis di kertas {name}.",
    "pp.next": "Lanjut",
    "pp.reply": "Balas",
  },
  /* ── fr · Français ── */
  {
    "pp.name.plain": "Uni",
    "pp.name.grid": "Quadrillé",
    "pp.name.kraft": "Kraft",
    "pp.name.airmail": "Par avion",
    "pp.name.receipt": "Ticket",
    "pp.name.sticky": "Pense-bête",
    "pp.name.riso": "Riso",
    "pp.strip.head": "PAPIER · {name}",
    "pp.strip.fc": "· PREMIÈRE CLASSE",
    "pp.strip.kindred": "· PREMIER SEMBLABLE",
    "pp.strip.done": "OK",
    "pp.badge.fc": "1RE",
    "pp.key.fc": "ENVOYER SUR PAPIER PREMIÈRE CLASSE →",
    "pp.key.fc.narrow": "PREMIÈRE CLASSE →",
    "pp.key.locked": "S'OUVRE AVEC TON PREMIER SEMBLABLE",
    "pp.key.locked.narrow": "VERROUILLÉ",
    "pp.a11y.key": "Papier à lettres",
    "pp.a11y.paper": "Papier {name}",
    "pp.a11y.fc": "Première classe",
    "pp.a11y.locked": "S'ouvre avec ton premier semblable",
    "pp.a11y.upgrade": "Ouvre Première classe",
    "pp.a11y.onPaper": "Écrite sur papier {name}.",
    "pp.next": "Suivante",
    "pp.reply": "Répondre",
  },
  /* ── de · Deutsch ── */
  {
    "pp.name.plain": "Blanko",
    "pp.name.grid": "Kariert",
    "pp.name.kraft": "Kraft",
    "pp.name.airmail": "Luftpost",
    "pp.name.receipt": "Kassenbon",
    "pp.name.sticky": "Haftnotiz",
    "pp.name.riso": "Riso",
    "pp.strip.head": "PAPIER · {name}",
    "pp.strip.fc": "· ERSTE KLASSE",
    "pp.strip.kindred": "· ERSTE SEELENVERWANDTSCHAFT",
    "pp.strip.done": "FERTIG",
    "pp.badge.fc": "1. KL.",
    "pp.key.fc": "AUF ERSTE-KLASSE-PAPIER SENDEN →",
    "pp.key.fc.narrow": "ERSTE KLASSE →",
    "pp.key.locked": "AB DEINER ERSTEN SEELENVERWANDTSCHAFT",
    "pp.key.locked.narrow": "GESPERRT",
    "pp.a11y.key": "Briefpapier",
    "pp.a11y.paper": "Papier: {name}",
    "pp.a11y.fc": "Erste Klasse",
    "pp.a11y.locked": "Frei ab deiner ersten Seelenverwandtschaft",
    "pp.a11y.upgrade": "Öffnet Erste Klasse",
    "pp.a11y.onPaper": "Auf Papier „{name}“ geschrieben.",
    "pp.next": "Weiter",
    "pp.reply": "Antworten",
  },
  /* ── it · Italiano ── */
  {
    "pp.name.plain": "Liscia",
    "pp.name.grid": "Quadretti",
    "pp.name.kraft": "Kraft",
    "pp.name.airmail": "Via aerea",
    "pp.name.receipt": "Scontrino",
    "pp.name.sticky": "Adesiva",
    "pp.name.riso": "Riso",
    "pp.strip.head": "CARTA · {name}",
    "pp.strip.fc": "· PRIMA CLASSE",
    "pp.strip.kindred": "· PRIMA ANIMA AFFINE",
    "pp.strip.done": "FATTO",
    "pp.badge.fc": "1ª",
    "pp.key.fc": "INVIA SU CARTA DI PRIMA CLASSE →",
    "pp.key.fc.narrow": "PRIMA CLASSE →",
    "pp.key.locked": "SI APRE CON LA TUA PRIMA ANIMA AFFINE",
    "pp.key.locked.narrow": "BLOCCATA",
    "pp.a11y.key": "Carta da lettere",
    "pp.a11y.paper": "Carta: {name}",
    "pp.a11y.fc": "Prima classe",
    "pp.a11y.locked": "Si apre con la tua prima anima affine",
    "pp.a11y.upgrade": "Apre Prima classe",
    "pp.a11y.onPaper": "Scritta su carta «{name}».",
    "pp.next": "Prossima",
    "pp.reply": "Rispondi",
  },
  /* ── ja · 日本語 ── */
  {
    "pp.name.plain": "無地",
    "pp.name.grid": "方眼",
    "pp.name.kraft": "クラフト",
    "pp.name.airmail": "エアメール",
    "pp.name.receipt": "レシート",
    "pp.name.sticky": "付箋",
    "pp.name.riso": "リソ",
    "pp.strip.head": "便箋 · {name}",
    "pp.strip.fc": "· ファーストクラス",
    "pp.strip.kindred": "· はじめての心友",
    "pp.strip.done": "完了",
    "pp.badge.fc": "一等",
    "pp.key.fc": "ファーストクラスの便箋で送る →",
    "pp.key.fc.narrow": "ファーストクラス →",
    "pp.key.locked": "はじめての心友ができたら使えます",
    "pp.key.locked.narrow": "ロック中",
    "pp.a11y.key": "便箋",
    "pp.a11y.paper": "{name}の便箋",
    "pp.a11y.fc": "ファーストクラス",
    "pp.a11y.locked": "はじめての心友ができると使えます",
    "pp.a11y.upgrade": "ファーストクラスを開きます",
    "pp.a11y.onPaper": "{name}の便箋で書かれた手紙です。",
    "pp.next": "次へ",
    "pp.reply": "返信",
  },
  /* ── ko · 한국어 ── */
  {
    "pp.name.plain": "무지",
    "pp.name.grid": "모눈",
    "pp.name.kraft": "크라프트",
    "pp.name.airmail": "항공우편",
    "pp.name.receipt": "영수증",
    "pp.name.sticky": "메모지",
    "pp.name.riso": "리소",
    "pp.strip.head": "편지지 · {name}",
    "pp.strip.fc": "· 퍼스트 클래스",
    "pp.strip.kindred": "· 첫 인연",
    "pp.strip.done": "완료",
    "pp.badge.fc": "1등석",
    "pp.key.fc": "퍼스트 클래스 편지지로 보내기 →",
    "pp.key.fc.narrow": "퍼스트 클래스 →",
    "pp.key.locked": "첫 인연이 생기면 열려요",
    "pp.key.locked.narrow": "잠김",
    "pp.a11y.key": "편지지",
    "pp.a11y.paper": "{name} 편지지",
    "pp.a11y.fc": "퍼스트 클래스",
    "pp.a11y.locked": "첫 인연이 생기면 열려요",
    "pp.a11y.upgrade": "퍼스트 클래스를 열어요",
    "pp.a11y.onPaper": "{name} 편지지에 쓴 편지예요.",
    "pp.next": "다음",
    "pp.reply": "답장",
  },
);
