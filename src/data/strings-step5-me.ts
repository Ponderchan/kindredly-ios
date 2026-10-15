import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE ME TAB'S NEW WORDS (slice "me").
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English in every language, and
   step 6 writes the eight others natively (written AS the language, not
   translated). The Me route imports this file for its side effect
   (src/app/(tabs)/me/index.tsx), and so do the model hook and the dev page.

   Everything else the tab says reuses keys already in nine languages:
   me.header, me.joined, cf.no, me.lettersLabel, me.kindredLabel(One),
   me.edit, set.you, set.member.first (the First Class chip), ka.title
   (KEEPSAKES, set in capitals), ml.write (the empty stamps' button),
   ac.yourAuraTitle, ap.what / ap.from.* / ap.prog.* / ap.cta.*, ac.shareSm,
   me.firstClass, fc.stubHead / stubSub1 / stubSub2 / stubCta, fc.paidHead /
   paidSub / paidCta, fc.member, me.fc.founding, me.sec.courier, me.open,
   ff.dayoff.*, ff.play, ks.name.*. */

strings(
  /* ── en ── */
  {
    // the four chips over Me's one card (the fourth reuses set.member.first)
    "me.seg.courier": "Courier",
    "me.seg.aura": "Aura",
    "me.seg.stamps": "Stamps",
    // VoiceOver's name for the sliders button in Me's bar (settings.title is in capitals)
    "me.settingsA11y": "Settings",
    // VoiceOver reads the two figures on the profile card as counts
    "me.a11y.letters": "{n} letters",
    "me.a11y.lettersOne": "1 letter",
    "me.a11y.kindreds": "{n} kindreds",
    "me.a11y.kindredsOne": "1 kindred",
    // the keepsakes block under the courier's scene: KEEPSAKES · {n} SO FAR
    "me.keepsakes.count": "{n} SO FAR",
    "me.keepsakes.note": "things {wren} brings back from letters land here",
    // the Stamps card (owner's placeholder: the stamps you have used)
    "me.stamps.title": "YOUR STAMPS",
    "me.stamps.count": "{n} USED",
    "me.stamps.empty": "The stamps you put on your letters will gather here.",
    // the word on the First Class stamp (was a hardcoded literal)
    "fc.firstMark": "1ST",
  },
  /* es, pt, id: step 6 */
  {},
  {},
  {},
);
