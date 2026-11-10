import { strings } from "../lib/i18n";

/* THE JOURNAL BOOK'S WORDS (journal book, 2026-11-10; contract .claude/journal-book/CONTRACT.md).
   ────────────────────────────────────────────────────────────────────────
   Notes can already leave the phone as a plain text file, free (strings-audit-notes: set.export,
   jx.*). The BOOK is the First Class version: the reader's own pages typeset as an A5 PDF, made on
   the phone. This file holds the book's own words (the export page around it keeps its words in
   strings-book-screen.ts, bk.*):

   - jb.*    THE BOOK ITSELF: what is PRINTED on its pages (the cover, the year at a glance, each
             month's calendar and count, the small labels on a page, the back cover). Resolved by
             lib/journal-book and handed to Swift inside the model: Swift has no words of its own.

   ENGLISH ONLY FOR NOW: t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires; fr de it ja ko are optional and left out until they are written.

   THE BOOK IS PRINT. Its small mono labels are set in capitals: write them in capitals where the
   language has them (the model also upper-cases them in the reader's locale, so a month or a mood
   name dropped into one comes out in capitals too). Every {n} is a count taken from the reader's
   own pages (owner's hard rule): a line never implies a number it doesn't carry. A count of one
   has its own line (".1"), as ld.left.a11y.1 does.

   Wren is never named in the book: she says of the journal "No one sees this. Not even me."

   No key is reused from elsewhere: the book's failure has its own two lines (they say the pages
   are safe, which cp.fail.generic doesn't), and nothing printed borrows a screen's wording.

   Imported for its side effect by lib/journal-book (the book's words) and by the export page. */

strings(
  /* ── en · English ── */
  {

    // ── THE BOOK: THE COVER ──
    // the cover's small line at the top: the app's name, never translated, capitals
    "jb.cover.top": "KINDREDLY",
    // the cover's title for a whole year, set very large, lowercase, in two lines: the line break (\n) is part of it,
    // so put it where the phrase breaks naturally; each line about 8 characters
    "jb.cover.year": "my year\nin pages",
    // the same for one month: {month} is that month's name in the reader's language, lowercase where the language allows ("november");
    // the month sits on the first line and may be up to 9 or 10 letters, so keep the words around it as few as possible
    "jb.cover.month": "my {month}\nin pages",
    // under the title, small: the reader's pen name; shown only when they have one. {name} is theirs, exactly as they wrote it
    "jb.cover.by": "— {name}",
    // the cover's small line at the bottom: the year and how many pages the book holds ({pages} is jb.pages / jb.pages.1 below)
    "jb.cover.foot": "{year} · {pages}",
    // counts, in capitals, used on the cover's foot and the year page's lead; one is its own line
    "jb.pages.1": "1 PAGE",
    "jb.pages": "{n} PAGES",
    "jb.days.1": "1 DAY",
    "jb.days": "{n} DAYS",
    "jb.months.1": "1 MONTH",
    "jb.months": "{n} MONTHS",

    // ── THE BOOK: THE YEAR AT A GLANCE ──
    // (its lead is the three counts above joined by " · ": "112 PAGES · 97 DAYS · 11 MONTHS")
    // the small line at the bottom of the page of squares, one row per month: what a coloured square is; capitals, one line
    "jb.year.foot": "EACH SQUARE IS A DAY YOU WROTE",

    // ── THE BOOK: A MONTH'S CALENDAR ──
    // the small line under the calendar: {n} days with a page, of the {total} days that month has; capitals
    "jb.month.foot": "{n} OF {total}",
    // added after it (" · ") only when one mood really was ahead of every other that month: {mood} is the mood's name; capitals
    "jb.month.mostly": "MOSTLY {mood}",

    // ── THE BOOK: A MONTH, COUNTED (a dark page of up to three big numbers, each with one line under it) ──
    // the small line at the top: {month} is the month's full name; capitals
    "jb.end.top": "{month}, COUNTED",
    // under the first number (how many days of the month have a page); lowercase, no number in the line; one day has its own line
    "jb.stat.days.1": "day you wrote",
    "jb.stat.days": "days you wrote",
    // under the second number (how many of those days were in the month's commonest mood; always two or more): {mood} is its name, lowercase;
    // the mood's face is drawn right after the line
    "jb.stat.mood": "of them {mood}",
    // under the third number: the length of the month's longest page, in words …
    "jb.stat.words": "words on your longest page",
    // … or, when that page is mostly Chinese, Japanese or Korean, in characters
    "jb.stat.chars": "characters on your longest page",
    // the small line at the bottom of that page: the promise that nothing on it is estimated; capitals, one line
    "jb.end.foot": "EVERY NUMBER IS COUNTED FROM YOUR PAGES",

    // ── THE BOOK: ON A PAGE ──
    // bottom corner of a long page whose words run on to the next sheet; capitals, the arrow stays
    "jb.continues": "CONTINUES →",
    // top of each following sheet: {date} is the page's day and month, short, in the reader's own order ("NOV 19", "19 NOV"); capitals
    "jb.cont": "{date} · CONTINUED",
    // beside the one line of a page that the reader let drift out (it is marked in the page's colour); capitals, one line
    "jb.drift": "THIS LINE DRIFTED OUT",
    // a page that is a voice note: paper can't hold the recording, and the page says so. {dur} is its length ("1:14"); capitals.
    // "STAYS IN THE APP" must stay literally true: the recording is not in the book
    "jb.voice": "VOICE · {dur} · STAYS IN THE APP",
    // the same when the length isn't known
    "jb.voice.plain": "VOICE · STAYS IN THE APP",
    // a page that is a film (a video), the same way
    "jb.film": "FILM · {dur} · STAYS IN THE APP",
    "jb.film.plain": "FILM · STAYS IN THE APP",

    // ── THE BOOK: THE BACK COVER ──
    // two short lowercase lines, set large, each ending in a full stop: the journal lives only on this phone, and no courier ever carried it
    // (in this app letters are carried; the journal never is). About 20 characters each
    "jb.back.1": "kept on this phone.",
    "jb.back.2": "carried by nobody.",
    // the back cover's small line at the bottom: the app's name and the book's year; capitals
    "jb.back.foot": "KINDREDLY · {year}",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jb.cover.top": "KINDREDLY",
    "jb.cover.year": "mi año\nen páginas",
    "jb.cover.month": "mi {month}\nen páginas",
    "jb.cover.by": "— {name}",
    "jb.cover.foot": "{year} · {pages}",
    "jb.pages.1": "1 PÁGINA",
    "jb.pages": "{n} PÁGINAS",
    "jb.days.1": "1 DÍA",
    "jb.days": "{n} DÍAS",
    "jb.months.1": "1 MES",
    "jb.months": "{n} MESES",
    "jb.year.foot": "EN COLOR, LOS DÍAS QUE ESCRIBISTE",
    "jb.month.foot": "{n} DE {total}",
    "jb.month.mostly": "SOBRE TODO {mood}",
    "jb.end.top": "{month} EN NÚMEROS",
    "jb.stat.days.1": "día que escribiste",
    "jb.stat.days": "días que escribiste",
    "jb.stat.mood": "de esos días, {mood}",
    "jb.stat.words": "palabras en tu página más larga",
    "jb.stat.chars": "caracteres en tu página más larga",
    "jb.end.foot": "CADA NÚMERO SALE DE CONTAR TUS PÁGINAS",
    "jb.continues": "CONTINÚA →",
    "jb.cont": "{date} · CONTINUACIÓN",
    "jb.drift": "ESTA LÍNEA PARTIÓ",
    "jb.voice": "VOZ · {dur} · SE QUEDA EN LA APP",
    "jb.voice.plain": "VOZ · SE QUEDA EN LA APP",
    "jb.film": "VIDEO · {dur} · SE QUEDA EN LA APP",
    "jb.film.plain": "VIDEO · SE QUEDA EN LA APP",
    "jb.back.1": "vive en tu teléfono.",
    "jb.back.2": "no lo llevó nadie.",
    "jb.back.foot": "KINDREDLY · {year}",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jb.cover.top": "KINDREDLY",
    "jb.cover.year": "meu ano\nem páginas",
    "jb.cover.month": "meu {month}\nem páginas",
    "jb.cover.by": "— {name}",
    "jb.cover.foot": "{year} · {pages}",
    "jb.pages.1": "1 PÁGINA",
    "jb.pages": "{n} PÁGINAS",
    "jb.days.1": "1 DIA",
    "jb.days": "{n} DIAS",
    "jb.months.1": "1 MÊS",
    "jb.months": "{n} MESES",
    "jb.year.foot": "DIA COLORIDO É DIA DE ESCRITA",
    "jb.month.foot": "{n} DE {total}",
    "jb.month.mostly": "SOBRETUDO {mood}",
    "jb.end.top": "{month} EM NÚMEROS",
    "jb.stat.days.1": "dia em que você escreveu",
    "jb.stat.days": "dias em que você escreveu",
    "jb.stat.mood": "desses dias, {mood}",
    "jb.stat.words": "palavras na sua página mais longa",
    "jb.stat.chars": "caracteres na sua página mais longa",
    "jb.end.foot": "CADA NÚMERO FOI CONTADO NAS SUAS PÁGINAS",
    "jb.continues": "CONTINUA →",
    "jb.cont": "{date} · CONTINUAÇÃO",
    "jb.drift": "ESTA LINHA PARTIU",
    "jb.voice": "VOZ · {dur} · FICA NO APP",
    "jb.voice.plain": "VOZ · FICA NO APP",
    "jb.film": "VÍDEO · {dur} · FICA NO APP",
    "jb.film.plain": "VÍDEO · FICA NO APP",
    "jb.back.1": "vive neste celular.",
    "jb.back.2": "ninguém levou.",
    "jb.back.foot": "KINDREDLY · {year}",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jb.cover.top": "KINDREDLY",
    "jb.cover.year": "halaman\ntahunku",
    "jb.cover.month": "halaman\n{month}ku",
    "jb.cover.by": "— {name}",
    "jb.cover.foot": "{year} · {pages}",
    "jb.pages.1": "1 HALAMAN",
    "jb.pages": "{n} HALAMAN",
    "jb.days.1": "1 HARI",
    "jb.days": "{n} HARI",
    "jb.months.1": "1 BULAN",
    "jb.months": "{n} BULAN",
    "jb.year.foot": "TIAP KOTAK = SATU HARI KAMU MENULIS",
    "jb.month.foot": "{n} DARI {total}",
    "jb.month.mostly": "PALING SERING {mood}",
    "jb.end.top": "{month} DALAM ANGKA",
    "jb.stat.days.1": "hari kamu menulis",
    "jb.stat.days": "hari kamu menulis",
    "jb.stat.mood": "di antaranya {mood}",
    "jb.stat.words": "kata di halaman terpanjangmu",
    "jb.stat.chars": "karakter di halaman terpanjangmu",
    "jb.end.foot": "SETIAP ANGKA DIHITUNG DARI HALAMANMU",
    "jb.continues": "BERSAMBUNG →",
    "jb.cont": "{date} · SAMBUNGAN",
    "jb.drift": "BARIS INI DIBIARKAN PERGI",
    "jb.voice": "SUARA · {dur} · TETAP DI APLIKASI",
    "jb.voice.plain": "SUARA · TETAP DI APLIKASI",
    "jb.film": "VIDEO · {dur} · TETAP DI APLIKASI",
    "jb.film.plain": "VIDEO · TETAP DI APLIKASI",
    "jb.back.1": "tersimpan di ponsel ini.",
    "jb.back.2": "tak dibawa siapa pun.",
    "jb.back.foot": "KINDREDLY · {year}",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jb.cover.top": "KINDREDLY",
    "jb.cover.year": "mon année\nen pages",
    "jb.cover.month": "mon {month}\nen pages",
    "jb.cover.by": "— {name}",
    "jb.cover.foot": "{year} · {pages}",
    "jb.pages.1": "1 PAGE",
    "jb.pages": "{n} PAGES",
    "jb.days.1": "1 JOUR",
    "jb.days": "{n} JOURS",
    "jb.months.1": "1 MOIS",
    "jb.months": "{n} MOIS",
    "jb.year.foot": "CHAQUE CARRÉ, UN JOUR OÙ TU AS ÉCRIT",
    "jb.month.foot": "{n} SUR {total}",
    "jb.month.mostly": "SURTOUT {mood}",
    "jb.end.top": "{month} EN CHIFFRES",
    "jb.stat.days.1": "jour où tu as écrit",
    "jb.stat.days": "jours où tu as écrit",
    "jb.stat.mood": "jours « {mood} »",
    "jb.stat.words": "mots sur ta plus longue page",
    "jb.stat.chars": "caractères sur ta plus longue page",
    "jb.end.foot": "CHAQUE CHIFFRE EST COMPTÉ DANS TES PAGES",
    "jb.continues": "LA SUITE →",
    "jb.cont": "{date} · SUITE",
    "jb.drift": "CETTE LIGNE S'EST ENVOLÉE",
    "jb.voice": "VOCAL · {dur} · RESTE DANS L'APP",
    "jb.voice.plain": "VOCAL · RESTE DANS L'APP",
    "jb.film": "VIDÉO · {dur} · RESTE DANS L'APP",
    "jb.film.plain": "VIDÉO · RESTE DANS L'APP",
    "jb.back.1": "gardé sur ce téléphone.",
    "jb.back.2": "porté par personne.",
    "jb.back.foot": "KINDREDLY · {year}",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jb.cover.top": "KINDREDLY",
    "jb.cover.year": "mein Jahr\nin Seiten",
    "jb.cover.month": "mein {month}\nin Seiten",
    "jb.cover.by": "— {name}",
    "jb.cover.foot": "{year} · {pages}",
    "jb.pages.1": "1 SEITE",
    "jb.pages": "{n} SEITEN",
    "jb.days.1": "1 TAG",
    "jb.days": "{n} TAGE",
    "jb.months.1": "1 MONAT",
    "jb.months": "{n} MONATE",
    "jb.year.foot": "JEDES FARBIGE KÄSTCHEN IST EIN SCHREIBTAG",
    "jb.month.foot": "{n} VON {total}",
    "jb.month.mostly": "VOR ALLEM {mood}",
    "jb.end.top": "{month} IN ZAHLEN",
    "jb.stat.days.1": "Schreibtag",
    "jb.stat.days": "Schreibtage",
    "jb.stat.mood": "davon {mood}",
    "jb.stat.words": "Wörter auf deiner längsten Seite",
    "jb.stat.chars": "Zeichen auf deiner längsten Seite",
    "jb.end.foot": "JEDE ZAHL IST AN DEINEN SEITEN ABGEZÄHLT",
    "jb.continues": "GEHT WEITER →",
    "jb.cont": "{date} · FORTSETZUNG",
    "jb.drift": "DIESE ZEILE IST DAVONGETRIEBEN",
    "jb.voice": "SPRACHNOTIZ · {dur} · BLEIBT IN DER APP",
    "jb.voice.plain": "SPRACHNOTIZ · BLEIBT IN DER APP",
    "jb.film": "VIDEO · {dur} · BLEIBT IN DER APP",
    "jb.film.plain": "VIDEO · BLEIBT IN DER APP",
    "jb.back.1": "auf diesem Telefon verwahrt.",
    "jb.back.2": "von niemandem fortgetragen.",
    "jb.back.foot": "KINDREDLY · {year}",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jb.cover.top": "KINDREDLY",
    "jb.cover.year": "il mio anno\nin pagine",
    "jb.cover.month": "il mio {month}\nin pagine",
    "jb.cover.by": "— {name}",
    "jb.cover.foot": "{year} · {pages}",
    "jb.pages.1": "1 PAGINA",
    "jb.pages": "{n} PAGINE",
    "jb.days.1": "1 GIORNO",
    "jb.days": "{n} GIORNI",
    "jb.months.1": "1 MESE",
    "jb.months": "{n} MESI",
    "jb.year.foot": "OGNI QUADRATINO COLORATO È UN GIORNO SCRITTO",
    "jb.month.foot": "{n} SU {total}",
    "jb.month.mostly": "SOPRATTUTTO {mood}",
    "jb.end.top": "{month} IN NUMERI",
    "jb.stat.days.1": "giorno in cui hai scritto",
    "jb.stat.days": "giorni in cui hai scritto",
    "jb.stat.mood": "di questi, {mood}",
    "jb.stat.words": "parole nella tua pagina più lunga",
    "jb.stat.chars": "caratteri nella tua pagina più lunga",
    "jb.end.foot": "OGNI NUMERO È CONTATO SULLE TUE PAGINE",
    "jb.continues": "CONTINUA →",
    "jb.cont": "{date} · SEGUITO",
    "jb.drift": "QUESTA RIGA È VOLATA VIA",
    "jb.voice": "NOTA VOCALE · {dur} · RESTA NELL'APP",
    "jb.voice.plain": "NOTA VOCALE · RESTA NELL'APP",
    "jb.film": "VIDEO · {dur} · RESTA NELL'APP",
    "jb.film.plain": "VIDEO · RESTA NELL'APP",
    "jb.back.1": "custodito su questo telefono.",
    "jb.back.2": "portato da nessuno.",
    "jb.back.foot": "KINDREDLY · {year}",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jb.cover.top": "KINDREDLY",
    "jb.cover.year": "わたしの\n一年",
    "jb.cover.month": "わたしの\n{month}",
    "jb.cover.by": "— {name}",
    "jb.cover.foot": "{year} · {pages}",
    "jb.pages.1": "1ページ",
    "jb.pages": "{n}ページ",
    "jb.days.1": "1日",
    "jb.days": "{n}日",
    "jb.months.1": "1か月",
    "jb.months": "{n}か月",
    "jb.year.foot": "色のついたマスは、書いた日",
    "jb.month.foot": "{total}日のうち{n}日",
    "jb.month.mostly": "多かったのは「{mood}」",
    "jb.end.top": "{month}を数えてみた",
    "jb.stat.days.1": "書いた日",
    "jb.stat.days": "書いた日",
    "jb.stat.mood": "そのうち「{mood}」の日",
    "jb.stat.words": "いちばん長いページの単語数",
    "jb.stat.chars": "いちばん長いページの文字数",
    "jb.end.foot": "どの数字も、あなたのページから数えました",
    "jb.continues": "つづく →",
    "jb.cont": "{date} · つづき",
    "jb.drift": "流れた一行",
    "jb.voice": "音声 · {dur} · アプリに残っています",
    "jb.voice.plain": "音声 · アプリに残っています",
    "jb.film": "動画 · {dur} · アプリに残っています",
    "jb.film.plain": "動画 · アプリに残っています",
    "jb.back.1": "このスマホの中にある。",
    "jb.back.2": "誰も運ばない。",
    "jb.back.foot": "KINDREDLY · {year}",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jb.cover.top": "KINDREDLY",
    "jb.cover.year": "나의 한 해\n한 장 한 장",
    "jb.cover.month": "나의 {month}\n한 장 한 장",
    "jb.cover.by": "— {name}",
    "jb.cover.foot": "{year} · {pages}",
    "jb.pages.1": "1페이지",
    "jb.pages": "{n}페이지",
    "jb.days.1": "1일",
    "jb.days": "{n}일",
    "jb.months.1": "1개월",
    "jb.months": "{n}개월",
    "jb.year.foot": "색칠된 칸은 글을 쓴 날",
    "jb.month.foot": "{total}일 중 {n}일",
    "jb.month.mostly": "주로 {mood}",
    "jb.end.top": "세어 본 {month}",
    "jb.stat.days.1": "글을 쓴 날",
    "jb.stat.days": "글을 쓴 날",
    "jb.stat.mood": "그중 {mood}",
    "jb.stat.words": "가장 긴 페이지의 단어 수",
    "jb.stat.chars": "가장 긴 페이지의 글자 수",
    "jb.end.foot": "모든 숫자는 당신의 페이지에서 세었어요",
    "jb.continues": "다음 장에 계속 →",
    "jb.cont": "{date} · 이어서",
    "jb.drift": "띄운 한 줄",
    "jb.voice": "음성 · {dur} · 앱에 남아 있어요",
    "jb.voice.plain": "음성 · 앱에 남아 있어요",
    "jb.film": "영상 · {dur} · 앱에 남아 있어요",
    "jb.film.plain": "영상 · 앱에 남아 있어요",
    "jb.back.1": "이 휴대폰에 있어요.",
    "jb.back.2": "아무도 나르지 않아요.",
    "jb.back.foot": "KINDREDLY · {year}",
  },
);
