import { strings } from "../lib/i18n";

/* OWNER'S AUDIT, 2026-11-10 — THE KINDREDS TAB'S SEARCH (slice "kindreds").
   ────────────────────────────────────────────────────────────────────────
   The owner walked the tab and found no way to find one correspondent in a
   long list. A magnifier chip now sits after the orbit chip; tapped, the
   chip row becomes a search field and the list narrows as the reader types
   (the rule is kindreds-model's searchKey / searchFields).

   ENGLISH ONLY for now: t() falls back to English, and native writers add
   the other eight blocks after this lands (write them AS the language, as
   every other strings file here was; the comments say where each line sits).

   Imported for its side effect by kindreds-model (the only place these
   keys are read), so both renderers and the dev page get them.

   Reused, no new copy: ml.cancel ("Cancel", the word beside the field) and
   id2.sheet.clear ("Clear", VoiceOver's name for the field's × key). */

strings(
  /* ── en · English ── */
  {
    // VoiceOver's name for the icon-only magnifier chip in the chip row, and for the search field itself; one word
    "kd.search": "Search",
    // the search field's placeholder, system 17 in a field about 230pt wide beside "Cancel": it must fit on one
    // line (at most ~22 characters), sentence case, no full stop. It says what the search reads: a correspondent's
    // name (the courier-given name or the name they signed) or the last line of the correspondence
    "kd.search.ph": "Name or last line",
    // the one quiet line under the field when nothing matches (system 13, mute, where "Not connected." sits);
    // short, plain, no exclamation mark
    "kd.search.none": "Nobody here by that name or line.",
  },
  /* ── es ── */
  {},
  /* ── pt ── */
  {},
  /* ── id ── */
  {},
);
