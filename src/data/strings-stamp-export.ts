import { strings } from "../lib/i18n";

/* EXPORTING THE STAMPS YOU MADE — ITS WORDS (stamp export, 2026-11-10; First Class).
   ────────────────────────────────────────────────────────────────────────
   A reader's own photo stamps can leave the app two ways, from the album: one stamp as a sticker
   (a PNG with a see-through ground, handed to the share sheet) and all of them as a printable
   sheet (an A4 PDF: the stamps at a real stamp's size between dashed cut lines, with one line of
   small capitals at the top and one at the foot). Both are First Class.

   ENGLISH ONLY for now: t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires.

   The voice: short, warm, lowercase-leaning, no exclamation marks. Wren does not speak here.

   Reused, no new copy: mf.result.lock (the wax-gold "1ST" tag on both actions for a reader who
   is not First Class), pp.a11y.fc (what VoiceOver says for that tag: "First Class").

   Imported for its side effect by the album's export hook (screens/me/useStampExport) and the
   dev page (app/dev/stamp-export). */

strings(
  /* ── en · English ── */
  {
    // the album, the sheet that opens when you tap one of your own stamps: one more capsule among
    // "Write with it", "Rename", "Delete" (System 600 15, one line): about 18 characters
    "sx.sticker": "Save as sticker",
    // the album, at the right of the MADE BY YOU head (small, System 600 12, like Me's "See all →"): at most 16 characters.
    // It makes a printable page of every stamp you made
    "sx.sheet": "Print a sheet",

    // the small pill at the foot of the album while the sticker is being made (a second or two); one short line, ends with an ellipsis
    "sx.sticker.making": "Cutting out your sticker…",
    // the same pill while the printable page is being made (a few seconds with many stamps)
    "sx.sheet.making": "Laying out your sheet…",

    // PRINTED on the sheet, small mono capitals centred at the top of every page. {n} is how many stamps the file holds (2 or more),
    // {year} the year it was made. Keep "KINDREDLY POST" as it is; at most 44 characters with the numbers in
    "sx.sheet.top": "KINDREDLY POST · {n} STAMPS · {year}",
    // the same line when the file holds exactly one stamp
    "sx.sheet.topOne": "KINDREDLY POST · 1 STAMP · {year}",
    // PRINTED at the foot of every page, small mono capitals: how to print it (at its real size, not "fit to page") and what the
    // dashed lines are for; at most 44 characters
    "sx.sheet.foot": "PRINT AT 100% · CUT ALONG THE LINES",

    // an alert's body when the sticker could not be made (its title is sx.sticker); two short sentences. The stamp itself is fine
    "sx.sticker.fail": "The sticker couldn't be made this time. Your stamp is safe.",
    // an alert's body when the sheet could not be made (its title is sx.sheet), usually because a stamp's picture could not be
    // fetched (no connection); two short sentences
    "sx.sheet.fail": "The sheet couldn't be made this time. Your stamps are safe.",
  },
  /* ── es ── */ {},
  /* ── pt ── */ {},
  /* ── id ── */ {},
);
