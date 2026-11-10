import { strings } from "../lib/i18n";

/* THE JOURNAL BOOK'S EXPORT PAGE — ITS WORDS (journal book, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The page Settings' "Export my journal" opens (/journal-book): a preview of the reader's own
   book, this month or this year, an ink saver, the key that makes the PDF (First Class) and the
   quiet link to the free text file. The book's OWN words (its cover, its counts, its back cover)
   are the model's, in src/data/strings-book.ts; these are only the page around it.

   ENGLISH FIRST (the eight blocks below were written natively on 2026-11-10; this note is how the file began): t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires.

   The voice: short, warm, lowercase-leaning, no exclamation marks. Wren does not speak on this
   page and is not named on it: of the journal she says "No one sees this. Not even me."

   Reused, no new copy: set.export (the page's title: the row that opened it), a11y.back,
   mf.result.lock (the wax-gold "1ST" tag on the key for a reader who is not First Class),
   pp.a11y.fc (what VoiceOver says for that tag: "First Class"), cp.fail.generic (the text
   export's failure, as in Settings).

   Imported for its side effect by the page (screens/journal-book/JournalBookNative) and by
   Settings (useSettingsModel: bk.set.sub). */

strings(
  /* ── en · English ── */
  {
    // Settings, THE QUIET, under "Export my journal" (set.export) on a build that can make the book: replaces set.export.sub there.
    // One line, two at most: the journal can leave as a book or as just its words
    "bk.set.sub": "Your journal lives only on this phone. Take it out as a book, or just the words.",

    // the segmented control under the preview, two parts side by side (System 15, like Me's Courier / Aura / Stamps); about 12 characters each
    "bk.range.month": "This month",
    "bk.range.year": "This year",
    // one quiet centred line under that control when this month has no page (its part is dimmed and can't be chosen)
    "bk.range.noMonth": "No pages this month yet.",

    // under the preview, small mono capitals: which printed page is in the middle, of how many the whole book has. {n} and {total} are numbers
    "bk.pageOf": "PAGE {n} OF {total}",
    // VoiceOver's name for the preview (one element; its value is the line above, and a swipe up or down turns the page)
    "bk.preview.a11y": "Your book, a preview",

    // the switch row under the control: its label (like a Settings switch) and the line under it. On: every page is printed on white.
    // The line must stay true: the colour stays in the big numbers, the calendar squares and the mood faces
    "bk.ink": "Save ink",
    "bk.ink.sub": "White pages. The colour stays in the numbers, the calendar and the faces.",

    // the main key at the foot (a wide capsule, System 600 16): about 18 characters
    "bk.make": "Make my book",
    // the same key while the PDF is being written (a spinner stands before it); one word if the language has one
    "bk.making": "Binding…",
    // the quiet text link under the key: the free export, a text file with the words only (no photos); about 20 characters
    "bk.words": "Just the words",

    // no page this year: the page shows only this line (centred, two lines at most) and the key under it
    "bk.empty": "No pages this year yet. A book starts with one.",
    // that key: opens a new journal page (Notes' +); about 16 characters
    "bk.empty.key": "Write a note",

    // the journal could not be read (storage failed): the page shows only this, centred. It must not sound like the journal is gone
    "bk.unread": "Your journal couldn't be read just now. Nothing was changed. Come back in a moment.",
    // an alert's body when the PDF could not be made (its title is set.export "Export my journal"); two short sentences
    "bk.fail": "The book couldn't be made this time. Your pages are safe.",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bk.set.sub": "Tu diario solo existe en este teléfono. Conviértelo en libro, o guarda solo las palabras.",
    "bk.range.month": "Este mes",
    "bk.range.year": "Este año",
    "bk.range.noMonth": "Todavía no hay páginas este mes.",
    "bk.pageOf": "PÁGINA {n} DE {total}",
    "bk.preview.a11y": "Vista previa de tu libro",
    "bk.ink": "Ahorrar tinta",
    "bk.ink.sub": "Páginas blancas. El color se queda en los números, el calendario y las caritas.",
    "bk.make": "Hacer mi libro",
    "bk.making": "Encuadernando…",
    "bk.words": "Solo las palabras",
    "bk.empty": "Todavía no hay páginas este año. Un libro empieza con una.",
    "bk.empty.key": "Escribir una nota",
    "bk.unread": "Ahora mismo no se puede leer tu diario. Todo sigue como estaba. Vuelve en un momento.",
    "bk.fail": "Esta vez no se pudo hacer el libro. Tus páginas están a salvo.",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bk.set.sub": "Seu diário só existe neste celular. Faça dele um livro, ou salve só as palavras.",
    "bk.range.month": "Este mês",
    "bk.range.year": "Este ano",
    "bk.range.noMonth": "Ainda não tem página este mês.",
    "bk.pageOf": "PÁGINA {n} DE {total}",
    "bk.preview.a11y": "Prévia do seu livro",
    "bk.ink": "Economizar tinta",
    "bk.ink.sub": "Páginas brancas. A cor fica nos números, no calendário e nas carinhas.",
    "bk.make": "Fazer meu livro",
    "bk.making": "Encadernando…",
    "bk.words": "Só as palavras",
    "bk.empty": "Ainda não tem página este ano. Um livro começa com uma.",
    "bk.empty.key": "Escrever uma nota",
    "bk.unread": "Não deu para ler seu diário agora. Está tudo como estava. Volte daqui a pouco.",
    "bk.fail": "Desta vez não deu para fazer o livro. Suas páginas estão a salvo.",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bk.set.sub": "Jurnalmu hanya ada di ponsel ini. Jadikan buku, atau ekspor tulisannya saja.",
    "bk.range.month": "Bulan ini",
    "bk.range.year": "Tahun ini",
    "bk.range.noMonth": "Belum ada halaman bulan ini.",
    "bk.pageOf": "HALAMAN {n} DARI {total}",
    "bk.preview.a11y": "Pratinjau bukumu",
    "bk.ink": "Hemat tinta",
    "bk.ink.sub": "Halaman putih. Warnanya tetap ada di angka, kalender, dan wajah.",
    "bk.make": "Buat bukuku",
    "bk.making": "Menjilid…",
    "bk.words": "Hanya tulisannya",
    "bk.empty": "Belum ada halaman tahun ini. Buku dimulai dari satu halaman.",
    "bk.empty.key": "Tulis catatan",
    "bk.unread": "Jurnalmu belum bisa dibaca saat ini. Tak ada yang diubah. Coba lagi sebentar lagi.",
    "bk.fail": "Bukunya belum berhasil dibuat kali ini. Halamanmu aman.",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bk.set.sub": "Ton journal n'existe que sur ce téléphone. Fais-en un livre, ou exporte le texte seulement.",
    "bk.range.month": "Ce mois-ci",
    "bk.range.year": "Cette année",
    "bk.range.noMonth": "Pas encore de page ce mois-ci.",
    "bk.pageOf": "PAGE {n} SUR {total}",
    "bk.preview.a11y": "Aperçu de ton livre",
    "bk.ink": "Économiser l'encre",
    "bk.ink.sub": "Pages sur fond blanc. La couleur reste dans les chiffres, le calendrier et les visages.",
    "bk.make": "Créer mon livre",
    "bk.making": "Reliure…",
    "bk.words": "Le texte seulement",
    "bk.empty": "Pas encore de page cette année. Un livre commence par une seule.",
    "bk.empty.key": "Écrire une note",
    "bk.unread": "Impossible de lire ton journal pour le moment. Rien n'a été modifié. Reviens dans un instant.",
    "bk.fail": "Le livre n'a pas pu être créé cette fois. Tes pages sont intactes.",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bk.set.sub": "Dein Tagebuch liegt nur auf diesem Telefon. Nimm es als Buch mit oder nur als Text.",
    "bk.range.month": "Dieser Monat",
    "bk.range.year": "Dieses Jahr",
    "bk.range.noMonth": "Noch keine Seite in diesem Monat.",
    "bk.pageOf": "SEITE {n} VON {total}",
    "bk.preview.a11y": "Vorschau auf dein Buch",
    "bk.ink": "Tinte sparen",
    "bk.ink.sub": "Weiße Seiten. Die Farbe bleibt in den Zahlen, im Kalender und in den Gesichtern.",
    "bk.make": "Mein Buch machen",
    "bk.making": "Bindet…",
    "bk.words": "Nur der Text",
    "bk.empty": "Noch keine Seite in diesem Jahr. Ein Buch fängt mit einer an.",
    "bk.empty.key": "Notiz schreiben",
    "bk.unread": "Dein Tagebuch ließ sich gerade nicht lesen. Verändert wurde nichts. Schau gleich noch einmal rein.",
    "bk.fail": "Das Buch ist diesmal nicht fertig geworden. Deine Seiten sind sicher.",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bk.set.sub": "Il tuo diario sta solo su questo telefono. Fanne un libro, oppure esporta solo le parole.",
    "bk.range.month": "Questo mese",
    "bk.range.year": "Quest'anno",
    "bk.range.noMonth": "Ancora nessuna pagina questo mese.",
    "bk.pageOf": "PAGINA {n} DI {total}",
    "bk.preview.a11y": "Anteprima del tuo libro",
    "bk.ink": "Risparmio inchiostro",
    "bk.ink.sub": "Pagine bianche. Il colore resta nei numeri, nel calendario e nelle faccine.",
    "bk.make": "Crea il mio libro",
    "bk.making": "Rilego…",
    "bk.words": "Solo le parole",
    "bk.empty": "Ancora nessuna pagina quest'anno. Un libro comincia da una.",
    "bk.empty.key": "Scrivi una nota",
    "bk.unread": "Per ora il tuo diario non si riesce a leggere. Non è cambiato niente. Torna tra un momento.",
    "bk.fail": "Stavolta il libro non è venuto. Le tue pagine sono al sicuro.",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bk.set.sub": "日記があるのは、このスマホの中だけです。本としても、ことばだけでも書き出せます。",
    "bk.range.month": "今月",
    "bk.range.year": "今年",
    "bk.range.noMonth": "今月のページは、まだありません。",
    "bk.pageOf": "{total}ページ中 {n}ページ目",
    "bk.preview.a11y": "あなたの本のプレビュー",
    "bk.ink": "インクを節約",
    "bk.ink.sub": "どのページも白地になります。数字とカレンダー、気分の顔には色が残ります。",
    "bk.make": "本をつくる",
    "bk.making": "製本中…",
    "bk.words": "ことばだけ書き出す",
    "bk.empty": "今年のページは、まだありません。本は、1ページから始まります。",
    "bk.empty.key": "ノートを書く",
    "bk.unread": "いまは日記を読み込めませんでした。何も変わっていません。少ししてから、また開いてください。",
    "bk.fail": "今回は本をつくれませんでした。ページはそのまま残っています。",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bk.set.sub": "일기는 이 휴대폰에만 있어요. 책으로 만들거나 글만 내보낼 수 있어요.",
    "bk.range.month": "이번 달",
    "bk.range.year": "올해",
    "bk.range.noMonth": "이번 달엔 아직 페이지가 없어요.",
    "bk.pageOf": "{total}페이지 중 {n}페이지",
    "bk.preview.a11y": "내 책 미리보기",
    "bk.ink": "잉크 절약",
    "bk.ink.sub": "모든 페이지가 흰 바탕이 돼요. 숫자와 캘린더, 표정에는 색이 남아요.",
    "bk.make": "내 책 만들기",
    "bk.making": "제본 중…",
    "bk.words": "글만 내보내기",
    "bk.empty": "올해는 아직 페이지가 없어요. 책은 한 페이지에서 시작돼요.",
    "bk.empty.key": "노트 쓰기",
    "bk.unread": "지금은 일기를 불러오지 못했어요. 바뀐 건 없어요. 잠시 후 다시 와 주세요.",
    "bk.fail": "이번에는 책을 만들지 못했어요. 페이지는 그대로 있어요.",
  },
);
