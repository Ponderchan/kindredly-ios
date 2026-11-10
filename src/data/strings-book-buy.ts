import { strings } from "../lib/i18n";

/* THE JOURNAL BOOK, BOUGHT ONCE — ITS WORDS (new feature, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The export page (/journal-book) makes the book for a First Class member. Someone who is not
   one can now also buy just the book, once, and keep it for good (lib/iap-book-core says what it
   is). Their tap on "Make my book" raises a small sheet with two keys: the book alone at the
   store's price, or First Class. These are that sheet's words, and the one line Restore
   purchases says when the book is what came back.

   ENGLISH ONLY for now: t() falls back to English, and the other eight languages are written
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
  /* ── es ── */ {},
  /* ── pt ── */ {},
  /* ── id ── */ {},
);
