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

   English only for now: the other eight fall back to it until their blocks are written (nine
   languages, as strings-papers is). Never gender the writer; a pen name is a name, not a word. */

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
  /* ── es ── */ {},
  /* ── pt ── */ {},
  /* ── id ── */ {},
);
