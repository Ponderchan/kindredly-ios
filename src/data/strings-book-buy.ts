import { strings } from "../lib/i18n";

/* THE JOURNAL BOOK, BOUGHT ONCE — ITS WORDS (new feature, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The export page (/journal-book) makes the book for a First Class member. Someone who is not
   one can now also buy just the book, once, and keep it for good (lib/iap-book-core says what it
   is). Their tap on "Make my book" raises a small sheet with two keys: the book alone at the
   store's price, or First Class. These are that sheet's words, and the one line Restore
   purchases says when the book is what came back.

   ENGLISH FIRST (the eight blocks below were written natively on 2026-11-10; this note is how the file began): t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires.

   The voice: short, warm, lowercase-leaning, no exclamation marks. Wren does not speak here and
   is not named: of the journal she says "No one sees this. Not even me."

   NEVER A PRICE IN THESE LINES: {price} is the App Store's own localized price string for the
   reader's storefront ("$4.99", "5,99 €", "¥800"), put in as it came. Don't add a currency
   sign, don't reorder its digits.

   Reused, no new copy: bk.make (the sheet's title: the key that raised it, "Make my book"),
   mf.notNow (the sheet's way out, "Not now"), pw.purchase.title + pw.purchase.fail (the alert
   when the purchase didn't go through), set.restored / pw.restored (the restore alert's title).

   Imported for its side effect by the page (screens/journal-book/JournalBookNative), by
   Settings (useSettingsModel: the restore alert) and by the paywall's two renderers (their
   Restore purchases). */

strings(
  /* ── en · English ── */
  {
    // the sheet's one line under its title "Make my book" (centred, System 15, two or three lines at most). What the one-time
    // purchase is: paid once, kept for good; the book can then be made for any month or year, as many times as the reader likes
    "bkb.sheet.body": "Pay once and it's yours: make your book any month, any year, as often as you like.",
    // the sheet's first key (a filled capsule, System 600 17; it may wrap to two lines): buy the book alone. {price} is the
    // store's price string; "once" must stay beside the price (it is a one-time payment, not a subscription). About 30 characters with a price
    "bkb.sheet.book": "Just the book · {price} once",
    // the sheet's second key (a soft capsule under the first): opens the First Class page instead. "First Class" is the membership's
    // name as the app writes it in this language; the rest says the book is part of it, with everything else. About 32 characters
    "bkb.sheet.fc": "First Class · the book and more",

    // Restore purchases (Settings, and the First Class page): the alert's body when the App Store gave back the journal book
    // and no First Class. Its title is "Restored". One short sentence, like set.restoredBody ("Your First Class is back.")
    "bkb.restored": "Your journal book is back.",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bkb.sheet.body": "Pagas una vez y es tuyo: haz tu libro de cualquier mes o año, las veces que quieras.",
    "bkb.sheet.book": "Solo el libro · {price} una vez",
    "bkb.sheet.fc": "Primera Clase · el libro y más",
    "bkb.restored": "El libro de tu diario ha vuelto.",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bkb.sheet.body": "Pague uma vez e é seu: faça seu livro de qualquer mês ou ano, quantas vezes quiser.",
    "bkb.sheet.book": "Só o livro · {price} uma vez",
    "bkb.sheet.fc": "Primeira Classe · o livro e mais",
    "bkb.restored": "O livro do seu diário voltou.",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bkb.sheet.body": "Sekali bayar, jadi milikmu: buat bukumu untuk bulan atau tahun mana pun, sesering yang kamu mau.",
    "bkb.sheet.book": "Bukunya saja · {price} sekali bayar",
    "bkb.sheet.fc": "Kelas Utama · buku dan lainnya",
    "bkb.restored": "Buku jurnalmu kembali.",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bkb.sheet.body": "Un seul paiement et il est à toi : crée ton livre pour le mois ou l'année de ton choix, aussi souvent que tu veux.",
    "bkb.sheet.book": "Le livre seul · {price} en une fois",
    "bkb.sheet.fc": "Première classe · le livre inclus",
    "bkb.restored": "Ton livre est de retour.",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bkb.sheet.body": "Einmal zahlen, für immer deins: Mach dein Buch für jeden Monat, jedes Jahr, so oft du willst.",
    "bkb.sheet.book": "Nur das Buch · einmalig {price}",
    "bkb.sheet.fc": "Erste Klasse · das Buch und mehr",
    "bkb.restored": "Dein Buch zum Tagebuch ist zurück.",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bkb.sheet.body": "Un solo pagamento, tuo per sempre: crea il tuo libro per qualsiasi mese o anno, tutte le volte che vuoi.",
    "bkb.sheet.book": "Solo il libro · {price} una tantum",
    "bkb.sheet.fc": "Prima classe · il libro e non solo",
    "bkb.restored": "Il libro del tuo diario è tornato.",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bkb.sheet.body": "一度のお支払いで、ずっとあなたのもの。どの月も、どの年も、何度でも本にできます。",
    "bkb.sheet.book": "本だけ · {price}を一度だけ",
    "bkb.sheet.fc": "ファーストクラス · 本もふくめて、ぜんぶ",
    "bkb.restored": "日記の本が戻りました。",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bkb.sheet.body": "한 번 결제로 영원히 당신 것. 어느 달이든, 어느 해든, 몇 번이든 책으로 만들 수 있어요.",
    "bkb.sheet.book": "책만 · {price} 한 번 결제",
    "bkb.sheet.fc": "퍼스트 클래스 · 책까지 전부",
    "bkb.restored": "일기 책이 돌아왔어요.",
  },
);
