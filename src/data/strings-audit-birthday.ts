import { strings } from "../lib/i18n";

/* THE BIRTHDAY PIECES' WORDS (owner's audit, 2026-11-10; slice "birthday").
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English, and the other eight
   languages are written natively afterwards (as each language, never
   translated). Each key's comment says what it is, where it sits and how
   long it may be.

   Three pieces, none of them on the Today tab:
   - Edit profile: setting a birthday ONCE, for an account that has none
     (screens/edit-profile). An under-18 answer gets onboarding's own block
     and onboarding's own words (ob2.underage.*, strings-onboarding2): none
     are written here.
   - The 8 o'clock knock on the reader's birthday (lib/local-push): her
     birthday line instead of the day's knock line.
   - The birthday stamp in the composer's tray (lib/birthday-stamp-core,
     lib/birthday-stamp): its small marker and its set's heading. The
     stamp's own name and prompt live in data/stamps.ts with every other
     stamp ("Birthday" / "It's my birthday today."), also English only for
     now (their other languages are "" there, which reads as English).

   Reused, no new copy: ep.birthday (the row, the wheel sheet's title),
   ob2.birthday.before (the line under that title), wren.trackClose (the
   sheet's ✕), set.cantSave / set.push.saveFail (a save the account refused),
   ob2.underage.head / .line / .change (the under-18 block, on onboarding's
   own screen).

   Imported for its side effect by useEditProfileModel, lib/local-push and
   lib/birthday-stamp. */

strings(
  /* ── en · English ── */
  {
    // ── Edit profile: the Birthday row while no birthday is set ──
    // VoiceOver's hint on the row (it is a button only then)
    "bd.row.hint": "Opens the date wheel. A birthday can be set once.",
    // the wheel sheet's filled key, under the wheel (dim until a year is turned); two or three words
    "bd.sheet.key": "Set birthday",
    // the small line under that key: said BEFORE the confirmation too, so nobody is surprised by it; one line
    "bd.sheet.once": "You can set it once. It can't be changed afterwards.",
    // the system alert before it is saved: {date} is the date in the reader's language, long form ("4 March 1991")
    "bd.confirm.title": "Set {date} as your birthday?",
    // the alert's message; one sentence
    "bd.confirm.body": "It can't be changed afterwards.",
    // the alert's two buttons (system alert buttons: one or two words)
    "bd.confirm.yes": "Set it",
    "bd.confirm.no": "Go back",

    // ── the 8 o'clock knock on the reader's birthday ──
    // a notification body under the courier's name (the title), in her voice: first person, lower case,
    // no closing full stop, no exclamation mark, as short as the knock lines ("morning. letters are on your desk")
    "bd.knock": "happy birthday. i flew in early to say it first",

    // ── the birthday stamp in the composer's tray ──
    // the small marker over the stamp, where the seasonal set says SEASONAL: mono 8 caps in a capsule, very short
    // (it sits over ONE stamp in the strip: 12 characters at most)
    "bd.stamp.mark": "TODAY ONLY",
    // the set's heading in the full tray (the React Native tray; in capitals like HALLOWEEN, beside the marker on one
    // line) and what VoiceOver calls the set: one or two words
    "bd.stamp.set": "YOUR BIRTHDAY",
  },
  /* es, pt, id: to be written natively (t() falls back to English until then) */
  {},
  {},
  {},
);
