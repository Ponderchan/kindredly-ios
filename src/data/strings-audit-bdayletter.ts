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
  /* es · pt · id (and fr de it ja ko): written natively after this; English until then */
  {},
  {},
  {},
);
