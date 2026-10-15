import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE CONVERSATION'S NEW WORDS (slice chat-kit).
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English in every language, and
   step 6 writes the eight others natively (lib/i18n's rule: written AS the
   language, not translated). The chat model hooks import this file for its
   side effect, so the words are registered wherever they are read.

   Everything else the room and the pen-pal chat say reuses keys already in
   nine languages: send = ld.send, close = wren.trackClose, the + =
   lat.title, back = a11y.back (strings-step5-kitrn), report or block =
   rp.menu.a11y and play / pause = vo.play / vo.pause (strings-step5-
   platform), slow = net.slow, gone = ch.gone / ld.unsigned /
   kd.accountClosed, the lore button = lore.title, a quote's speaker =
   mm.you or their name. */

strings(
  /* ── en ── */
  {
    // VoiceOver name of the round Wren button left of the room's composer
    "rm.seed.a11y": "Ask {wren} for a question",
    // VoiceOver action on a reply: jump to the line it quotes (the quote is inside the bubble,
    // which VoiceOver reads as one element)
    "mm.goToQuote": "Go to the line it answers",
    // the reader's own name in the introduction when they have no pen name yet, inside the
    // sentence "They know you now as {name}." (in.knowYou) — lower case, in-sentence
    "in.meFallback": "you",
  },
  /* es, pt, id: step 6 */
  {},
  {},
  {},
);
