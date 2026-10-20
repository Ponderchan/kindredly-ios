import { strings } from "../lib/i18n";

/* FIRST CLASS ROLLOUT — THE FREE READER'S INVITATIONS ON THE ME PAGE (owner, 2026-10-20).
   ────────────────────────────────────────────────────────────────────────
   They arrive by day: on day 3 a gold-edged letter "from the Post" lands on Wren's Courier card;
   after 7 days of writing in a row, a boarding pass (48 hours to take it); from day 30, last
   month's writing report arrives sealed; after that, a small gold pull-tab waits on the screen's
   right edge. Postal, warm, never an ad.

   Wren's lines are lower case wherever the language has case (German keeps its capital nouns),
   casual and short, and never gender the reader. The Post is the same character as cod.closed
   (strings.ts): el Correo, o Correio, Kantor Pos, la Poste, die Post, la Posta, 郵便局, 우체국. The
   perks match fc.b2 / fc.b4 / m4.pw.b.stamps; the report is a writing report (fc.b3), never a
   fortune-style "reading". First Class is named as strings.ts names it in each language
   (me.firstClass / fc.paidHead): Primera Clase, Primeira Classe, Kelas Utama, Première classe,
   Erste Klasse, Prima classe, ファーストクラス, 퍼스트 클래스. {month} arrives already
   localized and upper-cased; {n} is the month's number of days (28–31). Mono-caps chips are kept as
   short as the English or shorter where the language allows.

   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same keys:
   src/data/strings-fc-rollout.test.ts checks they agree (node src/data/strings-fc-rollout.test.ts).
   Consumers import this file for its side effect. */

strings(
  /* ── en · English ── */
  {
    // Wren's line on the Courier card while the Post's letter waits (lower case, her voice)
    "fcr.courier.line": "the Post asked me to bring you a letter. it's on your sill",
    // under it, italic, a wry aside
    "fcr.courier.sub": "gold edges. fancy",
    // printed tiny on the envelope's corner, mono caps
    "fcr.post": "THE POST",
    // VoiceOver on the envelope
    "fcr.env.a11y": "A gold-edged letter from the Post. Opens First Class.",
    // the boarding pass: mono caps timer at its top right (48 hours to take it)
    "fcr.seat.timer": "YOUR WEEK · 48H",
    // the boarding pass's headline (serif, lower case)
    "fcr.seat.head": "7 days in a row. you've earned a seat.",
    // its small line of what First Class carries
    "fcr.seat.perks": "Voice letters · wardrobe · all stamps",
    // its button
    "fcr.open": "Open",
    // the sealed report card's eyebrow, mono caps; {month} is a month name the app fills in already localized (e.g. "SEPTEMBER")
    "fcr.report.eyebrow": "YOUR {month} REPORT",
    // its right-hand tag, mono caps
    "fcr.report.sealed": "SEALED",
    // its headline (serif); {n} is the month's number of days (28–31)
    "fcr.report.head": "What {n} days of your letters add up to.",
    // its gold button
    "fcr.report.cta": "Break the seal",
    // VoiceOver on the gold pull-tab at the screen's right edge
    "fcr.tab.a11y": "First Class. Opens what it carries.",
  },
  /* ── es · Español ── */
  {
    "fcr.courier.line": "el Correo me pidió que te trajera una carta. te la dejé en la ventana",
    "fcr.courier.sub": "bordes dorados. qué elegancia",
    "fcr.post": "EL CORREO",
    "fcr.env.a11y": "Una carta con bordes dorados, del Correo. Abre la Primera Clase.",
    "fcr.seat.timer": "TU SEMANA · 48H",
    "fcr.seat.head": "7 días seguidos. te ganaste un asiento.",
    "fcr.seat.perks": "Cartas de voz · armario · todos los sellos",
    "fcr.open": "Abrir",
    "fcr.report.eyebrow": "TU INFORME · {month}",
    "fcr.report.sealed": "SELLADO",
    "fcr.report.head": "Lo que suman {n} días de tus cartas.",
    "fcr.report.cta": "Romper el sello",
    "fcr.tab.a11y": "Primera Clase. Abre lo que trae.",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "fcr.courier.line": "o Correio pediu pra eu te trazer uma carta. deixei na sua janela",
    "fcr.courier.sub": "bordas douradas. chique, hein",
    "fcr.post": "O CORREIO",
    "fcr.env.a11y": "Uma carta com bordas douradas, do Correio. Abre a Primeira Classe.",
    "fcr.seat.timer": "SUA SEMANA · 48H",
    "fcr.seat.head": "7 dias seguidos. o assento é seu.",
    "fcr.seat.perks": "Cartas de voz · guarda-roupa · todos os selos",
    "fcr.open": "Abrir",
    "fcr.report.eyebrow": "SEU RELATÓRIO · {month}",
    "fcr.report.sealed": "SELADO",
    "fcr.report.head": "Tudo o que {n} dias de cartas suas renderam.",
    "fcr.report.cta": "Romper o lacre",
    "fcr.tab.a11y": "Primeira Classe. Abre o que ela traz.",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "fcr.courier.line": "Kantor Pos nitip surat buat kamu. udah kutaruh di jendela",
    "fcr.courier.sub": "pinggirannya emas. gaya banget",
    "fcr.post": "KANTOR POS",
    "fcr.env.a11y": "Surat berpinggiran emas dari Kantor Pos. Membuka Kelas Utama.",
    "fcr.seat.timer": "MINGGUMU · 48 JAM",
    "fcr.seat.head": "7 hari berturut-turut. satu kursi buat kamu.",
    "fcr.seat.perks": "Surat suara · lemari baju · semua prangko",
    "fcr.open": "Buka",
    "fcr.report.eyebrow": "LAPORANMU · {month}",
    "fcr.report.sealed": "TERSEGEL",
    "fcr.report.head": "{n} hari surat-suratmu, dalam satu rangkuman.",
    "fcr.report.cta": "Buka segelnya",
    "fcr.tab.a11y": "Kelas Utama. Lihat isinya.",
  },
  /* ── fr · Français ── */
  {
    "fcr.courier.line": "la Poste m’a confié une lettre pour toi. elle t’attend à ta fenêtre",
    "fcr.courier.sub": "bords dorés. la classe",
    "fcr.post": "LA POSTE",
    "fcr.env.a11y": "Une lettre à bords dorés, de la part de la Poste. Ouvre la Première classe.",
    "fcr.seat.timer": "TA SEMAINE · 48 H",
    "fcr.seat.head": "7 jours d’affilée. ta place, tu l’as méritée.",
    "fcr.seat.perks": "Lettres vocales · garde-robe · tous les timbres",
    "fcr.open": "Ouvrir",
    "fcr.report.eyebrow": "TON BILAN · {month}",
    "fcr.report.sealed": "SCELLÉ",
    "fcr.report.head": "Ce que donnent {n} jours de lettres, mis bout à bout.",
    "fcr.report.cta": "Briser le sceau",
    "fcr.tab.a11y": "Première classe. Ouvre ce qu’elle transporte.",
  },
  /* ── de · Deutsch ── */
  {
    "fcr.courier.line": "die Post hat mir einen Brief für dich mitgegeben. er liegt auf deinem Fensterbrett",
    "fcr.courier.sub": "mit Goldrand. schick",
    "fcr.post": "DIE POST",
    "fcr.env.a11y": "Ein Brief mit Goldrand, von der Post. Öffnet die Erste Klasse.",
    "fcr.seat.timer": "DEINE WOCHE · 48 H",
    "fcr.seat.head": "7 Tage am Stück. den Platz hast du dir verdient.",
    "fcr.seat.perks": "Sprachbriefe · Garderobe · alle Briefmarken",
    "fcr.open": "Öffnen",
    "fcr.report.eyebrow": "DEIN BERICHT · {month}",
    "fcr.report.sealed": "VERSIEGELT",
    "fcr.report.head": "Was {n} Tage deiner Briefe zusammen ergeben.",
    "fcr.report.cta": "Siegel brechen",
    "fcr.tab.a11y": "Erste Klasse. Öffnet, was sie mitbringt.",
  },
  /* ── it · Italiano ── */
  {
    "fcr.courier.line": "la Posta mi ha affidato una lettera per te. è sul davanzale",
    "fcr.courier.sub": "bordi dorati. che classe",
    "fcr.post": "LA POSTA",
    "fcr.env.a11y": "Una lettera dai bordi dorati, dalla Posta. Apre la Prima classe.",
    "fcr.seat.timer": "LA TUA SETTIMANA · 48H",
    "fcr.seat.head": "7 giorni di fila. il posto te lo sei guadagnato.",
    "fcr.seat.perks": "Lettere vocali · guardaroba · tutti i francobolli",
    "fcr.open": "Apri",
    "fcr.report.eyebrow": "RESOCONTO DI {month}",
    "fcr.report.sealed": "SIGILLATO",
    "fcr.report.head": "Il bilancio di {n} giorni di lettere.",
    "fcr.report.cta": "Rompi il sigillo",
    "fcr.tab.a11y": "Prima classe. Apre quello che porta con sé.",
  },
  /* ── ja · 日本語 ── */
  {
    "fcr.courier.line": "郵便局から手紙を預かってきたよ。窓辺に置いといたね",
    "fcr.courier.sub": "ふちが金色。おしゃれ",
    "fcr.post": "郵便局",
    "fcr.env.a11y": "郵便局から届いた金縁の手紙。ファーストクラスを開きます。",
    "fcr.seat.timer": "今週 · 残り48時間",
    "fcr.seat.head": "7日連続。あなたの席、用意できました。",
    "fcr.seat.perks": "声の手紙 · ワードローブ · すべての切手",
    "fcr.open": "開く",
    "fcr.report.eyebrow": "{month}のレポート",
    "fcr.report.sealed": "未開封",
    "fcr.report.head": "{n}日分の手紙を、ひとつにまとめると。",
    "fcr.report.cta": "封を切る",
    "fcr.tab.a11y": "ファーストクラス。中身を見る。",
  },
  /* ── ko · 한국어 ── */
  {
    "fcr.courier.line": "우체국에서 편지 좀 전해 달래. 창가에 놔뒀어",
    "fcr.courier.sub": "금테까지 둘렀네. 멋 좀 냈다",
    "fcr.post": "우체국",
    "fcr.env.a11y": "우체국에서 온 금테 두른 편지. 퍼스트 클래스를 열어요.",
    "fcr.seat.timer": "이번 주 · 48시간",
    "fcr.seat.head": "7일 연속. 좌석 하나, 맡아 뒀어요.",
    "fcr.seat.perks": "음성 편지 · 옷장 · 모든 우표",
    "fcr.open": "열기",
    "fcr.report.eyebrow": "{month} 리포트",
    "fcr.report.sealed": "봉인",
    "fcr.report.head": "{n}일 동안 쓴 편지를 모아 보면.",
    "fcr.report.cta": "뜯어 보기",
    "fcr.tab.a11y": "퍼스트 클래스. 무엇이 담겼는지 열어 봐요.",
  },
);
