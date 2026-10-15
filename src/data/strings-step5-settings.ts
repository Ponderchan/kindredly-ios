import { strings } from "../lib/i18n";

/* 10a STEP 5 — SETTINGS AND EDIT PROFILE'S NEW WORDS (slice "settings-profile").
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English in every language, and
   step 6 writes the eight others natively (written AS the language, not
   translated). Every route of the slice imports this file for its side
   effect ((tabs)/me/settings, edit-profile, edit-field, blocked), and so
   do the model hooks and the dev page.

   Everything else the pages say reuses keys already in nine languages:
   settings.*, set.* (the rows, the switches and their subs, the exits, the
   delete sheet, set.version for the footer), lore.head, me.firstClass,
   fc.stubHead / stubSub1 / stubSub2 / paidHead / paidSub / paidCta /
   member, me.fc.founding, fc.firstMark (strings-step5-me), ep.title,
   ep.penPh, ep.random, ep.choosePhoto, ep.privateNote (the YOU group's
   footer), ui.you (the YOU header), me.sec.courier (YOUR COURIER, set in
   capitals), pr.she / pr.he / pr.they, set.penPrompt.*, set.renameWren,
   set.wrenPrompt.body, ob.naming.reserved, set.cantSave, set.push.saveFail,
   a11y.back (strings-step5-kitrn), bl.*, hp.*, wu.*.

   The font names (Newsreader, New York, EB Garamond) are proper nouns and
   never translated, like the language endonyms (screens/settings
   settings-model LETTER_FONT_NAMES). */

strings(
  /* ── en ── */
  {
    // Settings: the appearance group (theme swatches, Match system, the Letter font)
    "set.sec.appearance": "APPEARANCE",
    "set.matchSystem": "Match system",
    "set.matchSystem.on": "Midnight after dark · {day} by day",
    "set.matchSystem.off": "Always {theme}",
    // the four themes' names on their swatches (themes.json's names are English literals)
    "theme.classic": "Classic",
    "theme.midnight": "Midnight",
    "theme.lavender": "Lavender",
    "theme.paper": "Paper",
    // the Letter font picker: Newsreader / New York / EB Garamond
    "set.letterFont": "Letter font",
    "set.letterFont.sub": "How letters are set when you read them.",
    // a restore that failed (offline, the App Store unreachable): never "Nothing to restore";
    // the body reuses set.push.saveFail
    "set.restoreFail": "Couldn't restore",
    // the Settings banner's call to action (the Me card keeps fc.stubCta)
    "fc.tryCta": "Try First Class",

    // Edit profile: VoiceOver's name for the camera button on the avatar
    "ep.cameraA11y": "Change your face",
    // under the avatar: what it is for, and who sees it (true for photos and for faces
    // changed after signing: a kindred keeps the face you had when you both signed)
    "ep.avatarNote": "Strangers never see your face. A kindred sees the one you had when you both signed, and a photo never leaves this phone.",
    // the face strip's header (ep.pickFace said "OR PICK A FACE" under a photo button)
    "ep.faces": "PICK A FACE",
    // VoiceOver: one face in the strip (the faces' own names are English design notes)
    "ep.faceA11y": "Face {n} of {total}",
    "ep.pronouns": "Pronouns",
    "ep.birthday": "Birthday",
    // the courier's one row under YOUR COURIER
    "ep.name": "Name",
    // the one-time note for the six legacy portraits (no longer offered), over the face strip
    "ep.newFaces.title": "New faces arrived.",
    "ep.newFaces.body": "Yours stays for as long as you want it. Care to see the new ones?",
    "ep.newFaces.see": "See new faces",
    "ep.newFaces.keep": "Keep mine",

    // the one-field page: the courier name's placeholder (the pen name's is ep.penPh)
    "ef.namePh": "A name…",

    // Blocked & reported: the list didn't load (it used to say "No one's shut out.")
    "bl.loadFail": "The list didn't load. Tap to try again.",
  },
  /* es, pt, id: step 6 */
  {},
  {},
  {},
);
