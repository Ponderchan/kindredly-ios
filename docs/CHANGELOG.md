# Kindredly iOS: what changed, release by release

This file lists what a person using the app would notice in each App Store release, newest first.
Write the App Store What's New (`design/store/whats-new-*.json`, `design/store/asc-*.json`), the
in-app what's-new reel (`src/components/news-reel/`) and the guide reels
(`src/components/guide-reel/`) from it, so none of them leaves anything out.

## How to keep it current

- When a commit changes something a user would notice, add one line to **Unreleased** in that same
  commit, under New, Changed or Fixed. Write it in plain English, one line, about what the person
  sees, not how it was built.
- Leave out internal refactors, dev pages, tests, store assets and build plumbing.
- Tag a line `[switch: key]` when a remote switch can turn it on or off without a build (the web
  table `app_surfaces`, migration 0033). Tag it `[server: 00xx]` when it needs a web migration or
  endpoint before it works.
- If a later commit changes the same thing before the release, edit the line; don't add a second
  one. The list says what ships, not the history.
- When a build is cut, give Unreleased its App Store version, binary version, build numbers and
  date, and start a new empty Unreleased above it. Then check that every New line is in the store
  What's New, the news reel and the guide reel it belongs to, or is left out on purpose. List the
  gaps under **Not yet told** for that release.
- App Store versions and binary versions are different numbers. The binary version always stays
  above every published one, so an over-the-air update can never land on the wrong build.

| App Store | Binary | Builds | Code | Dates |
|---|---|---|---|---|
| 1.0.6 | 1.2.5 | 35 | `ios-1.2.3` at b355ff6 | uploaded 10-25, expedited review, **live 10-25 03:03 Beijing** (Apple lookup) |
| 1.0.5 | 1.2.4 | 29–34 | `ios-1.2.3` up to b710f2f | b34 rejected for a launch crash, then approved and **released automatically 10-25** — it crashes at launch on every iOS 27 phone (built with Xcode 27 without the scene life cycle); 1.0.6 fixes it. Web launch-day deploy and 0035 the same day |
| 1.0.4 | 1.2.3 | 28 | `hotfix-1.0.4` (worktree `../kindredly-ios-hotfix`) | submitted 10-15, approved about 10-16 |
| 1.0.3 | 1.2.2 | 27 | `plan-c-sealed` at 0906ab5 | approved 10-13 |
| 1.0.2 | 1.2.1 | 25 | `plan-c-sealed` at 511a229 | built 09-26 (before this file) |

---

## Unreleased

New
- What's new: Wren's post for this release carries a big card (the reel, a paragraph and a "Press your first stamp" button), like the guide cards, in all nine languages. [OTA]
- An update prompt for builds the server flags: Wren flies in with a parcel and sits on it ("special delivery. it's me, but newer."), Update opens the App Store, Later leaves a slim "a parcel's waiting for you" banner on Today. Once per release, at most once a day, and never for the release the phone already has; a hard mode with no Later exists but stays off. Nine languages. [switch: update_prompt, update_force] [OTA]
- Halloween stamps: three free seasonal stamps (Spooky season, a jack-o'-lantern; Boo, a bedsheet ghost; Trick or treat, a wrapped sweet) sit first in the stamp tray with a small SEASONAL marker from Oct 24 to Nov 2 (local date). Outside those days they aren't offered, but letters stamped with them always show them. Nine languages. [binary] [switch: halloween]
- Halloween looks for Wren: a witch hat and a bedsheet ghost, free for everyone, from Oct 24 to Nov 2. In those days the looks row on Me shows Bare · Witch hat · Ghost · First Class and the wardrobe offers them first; after the season they aren't offered, but a Wren already wearing one keeps it on. Nine languages. [OTA] [switch: halloween]
- Seasons have one remote switch each: the app_surfaces key `halloween` is on with no row (so it works offline); a false row turns the Halloween stamps and looks off. [switch: halloween]
- Make your own face: a ＋ at the start of Edit profile's PICK A FACE row (FREE · ONCE, then 1ST CLASS) lets Wren paint you a face in the same style as the others from a photo or a few words (with tap-to-add word chips), in a floating card with an easel she paints on; you can leave while she works and she knocks when it's done. The first face is free (a refused photo or a dropped line doesn't count), more are First Class, under-18s use words only, the photo is never kept, and only a kindred ever sees the face. While it's on, the note under your face in Edit profile says which photo stays on the phone (one set as your face) and which is only used to paint (one given to Wren). The camera's permission text now names it, in nine languages. Nine languages. [binary] [switch: makeface, off by default] [server: 0047 + /api/face]
- The first-run onboarding can be drawn natively in SwiftUI: the same thirteen screens, words and steps, with flat keys and soft purple shadows under the cards instead of black edges; while it is off, people see the onboarding exactly as before. [binary] [switch: onboarding, off by default]

Changed
- The Letter font now starts on System for everyone who never picked one, and System is the first tile in Settings → Font, before Newsreader. A font you chose stays.
- Writing a Notes page has a new bar: ＋ opens Photo, Video and Audio cards, a round mood capsule opens the four moods and their faces, and Seal it here turns ink as soon as there is something on the page (no counter). The page opens with the keyboard down and a blinking caret; sealing folds the page into a little note and presses the mood's face onto it as a seal (with a tap of haptics, "KEPT · OCT 26" under it), then goes back to Notes, where the new page pops in at the top. Nine languages. [binary] [switch: journalentry]
- The letter composer's bottom bar is new ("Let it travel"): + · paper · a dashed stamp slot · one capsule on the right that fills with lav as you write toward 20 (with "n/20" beside it), then says "Pick a stamp" (the slot hops; Wren says "Now pick a stamp for it."), then turns ink with a paper plane to send. A chosen stamp shows as its #topic capsule in the bar and as the stamp itself in the top-right corner; with a long topic the send capsule becomes just the plane. Stamps are picked from the full stamp tray where the keyboard was, as before (your own stamps in their tab): Halloween stamps first in their season under a SEASONAL tag, then FOR THIS LETTER, RECENTLY USED and each category, labelled, in rows of six. Nine languages. [binary]
- The Writing Aura room (Portrait, Dimensions, Habits) and its share card are drawn natively: the same words and counts, smoother paging through the nine dimensions, native sheets, and the share card's picture made on the phone. The Aura card (on Me and in the room) loses its outline and stands on a soft purple shadow; its "Write your first letter" button is a filled pen-blue capsule and its share key a soft one. [binary] [switch: aura, auracard]
- Wren's Journey (her page, from the courier card on Me) is drawn in SwiftUI: the same sky, perch, status band, tracking slip, journey, keepsakes, wardrobe and First Class card, with flatter controls (soft capsules for her stage facts and Track, Play without the black edge) and the two slips lifted on a soft purple shadow. Play still opens Free Flight as before. Nine languages. [binary] [switch: courier]
- The guides in Wren's room show today's product: courier names and frosted windows instead of mosaics and numbers, signing to trade names, Stamp Press, tomorrow's bag, the two notification switches. Their words are rewritten in all nine languages, and Wren understands questions about pen names, signing and pressing your own stamps in each. [OTA]
- The kindred ceremony (when both of you have signed) is drawn natively: the two signed cards, both sealed envelopes lifting at once, the frosted windows clearing onto the faces, the courier names struck through, the signatures drawing in with the pen names, and KINDREDS · date. Reduce Motion fades to the end state; VoiceOver says the outcome when it's done. [binary] [switch: ceremony]
- On every tab but Today, the + opens an ordinary iOS sheet ("Who's this one for?"): it rises from the bottom, drags down to close, and goes down before the letter or the note page slides in (it used to wander as it opened and slide down over the new page). [binary]
- On Wren's page, Looks and Dress sit above Recent keepsakes: what she wears comes before what she kept.
- When Wren fledges or grows up, the next time you open the app she has a moment: her old form shakes, feathers burst, her new form pops in, a stamp with the stage and the day lands under her, she says one line, and "Yay" closes it. Once per stage; nobody who grew up before this update is shown it. Nine languages for her two lines and the key.
- On Wren's page, the Journey shows her growing: her hatchling, fledgling and grown forms side by side, the stages she has reached in colour and the ones ahead as soft silhouettes; the next one has five envelopes that light up with your letters toward it (counted as yours, since growing up needs the other side too). The hatchling's fixed "1 letter to fledge" pill is gone. Nine languages for the one new line. [binary for the Swift page]
- The Notes photo roll's head matches the composers: the same ×, the album title in the system font ("Recents", not RECENT), and Next in the system font.
- The Notes photo roll's first row is three postage stamps exactly the size of a photo — Camera (acid green), Text note (pen blue), Voice note (pink) — perforated all round, framed, numbered 01–03, with the icon and the name. Camera takes a picture straight onto a new page. They replace the flat tiles with mono capitals. The camera's permission text now names journal pages as well as stamps, in nine languages. [binary: the Camera card and its permission text]
- Every page under Me is now native: Keepsakes and each keepsake (tiles on a soft purple shadow, a flat Share key), the pen-name and courier-name page, Blocked & reported, How Kindredly works and Write to us keep their words and steps and look like Settings around them. My kindreds is new: only the people you've traded names with, each on a signed card with their face, the ceremony's KINDREDS · date chip, unread letters and the last line, a tap opening the room; with none yet, Wren and one line on what a kindred is and how you get one (nine languages). [binary] [switch: keepsakes, keepsake, mykindreds, editfield, blocked, help, writetous]
- A kindred's page (tap their name in the room) can be drawn natively: the same face, name, signature, what their letters told you, how alike you write, the facts with the stamp it began under, the opening letter and TALK TO, on the same soft cards, with the ⋯ and touch-and-hold on the signature for Report or Block; while it is off, people see the page exactly as before. [binary] [switch: kindredpage]
- Wren's room (the chat with Wren, her news, the guide cards and the what's-new card) can be drawn natively: the same words, guides, chips and ⊕ tray (a picture, a bug, an idea), with the guide and what's-new animations playing as before; the ⊕ and the send arrow now have VoiceOver names. While it is off, the room is exactly as before. [binary] [switch: wrenroom]
- Wren's monthly night letter about how you write, Unsent (your drafts) and Lore (the lines you kept) can be drawn natively, with the same words, cards and steps: the night letter's keepsake card stands on a soft night-purple shadow and its close key is a drawn ×. Holding a draft or a kept line still asks before it goes, and VoiceOver offers the same as an action. [binary] [switch: report, voice, drafts, stampbook, lore]
- Three Notes pages can be drawn natively: one journal page (the mood, the date, the pictures with tap to view and hold to make it the cover, the words, the line that drifted out, the ⋯ menu), one day of pages (now on the same cards as the Notes tab, a voice page playing in place), and the photo roll the + opens (the three stamps, the pictures with their pick numbers, the albums sliding down). Same words and steps; while they are off, people see the pages exactly as before. [binary] [switch: noteentry, noteday, photoroll]
- Wren's introduction (the sheet a room or a pen-pal chat shows once, when names are traded) can be drawn natively: the same letter from her, the road of envelopes, the mosaic bursting under the green name sticker, the name typed on, the two faces bumping, KINDREDS · date and what she noticed, on the same timing and with the same Reduce Motion behaviour; with signatures it shows the ceremony's native ritual. The big name sticker stands on the soft purple shadow instead of a blur. While it is off, the sheet is exactly as before. [binary] [switch: introritual, off by default]
- A photo opened full screen, a kindred room's song shelf and the sheet where you sign your pen name to trade names can be drawn natively: the same dark stage with pinch, drag and tap to close; the same songs and Wren's line; the same faces, pen name, signature pad, Type it instead and SIGN AND SEND, opening and closing as before. While they are off, people see them exactly as before. [binary] [switch: lightbox, songshelf, signsheet, off by default]
- The sheets every screen shares can be drawn natively: the "leave this letter?" and other confirm sheets (the language list and the delete confirm too), the report / block card, the sign-up sheet a guest sees (with the system's own Sign in with Apple key) and the small toast line. Same words, keys, steps and timing; reporting and blocking send exactly what they sent before. While they are off, people see them exactly as before. [binary] [switch: leavesheet, reportsheet, signupsheet, toast, off by default]
- Three things over Today can be drawn natively: the unfolded letter (the same docket, letter, stamp with its keep/report menu, WRITE BACK and reply bar, which now rides the keyboard on its own), the first-arrival wardrobe slip (on a soft purple shadow instead of a black edge), and the update prompt's parcel (Wren flying in with it, the shake, the bow and flaps popping, the banner). Same words, steps and timing; while they are off, everything is exactly as before. [binary] [switch: letterreader, wardrobeslip, parcel, off by default]
- Three full-screen moments can be drawn natively, with the same words, beats, haptics and Reduce Motion: Wren growing up (the shake, the burst, her new form, the stamp, "Yay"), the one-time note about what strangers see (its two switches and Done, on a sheet without the dark rule along its top), and the first flight at the end of onboarding (the letter folding, the loop round the chart, the three envelopes back). While they are off, people see them exactly as before. [binary] [switch: growthmoment, identitynote, firstflight, off by default]
- Three pieces of the letter and Notes composers can be drawn natively: the voice recording bar, the voice card (play/pause, its bars and the time, wherever it shows: the composers, Notes pages, the chat, Today) and the send-off animation as a letter leaves (fold, seal, pickup, the flight across the globe, the arrival card), with the same words, colours in all four themes, timing, haptic tap and Reduce Motion; recording and playback stay as they are. While they are off, people see them exactly as before. [binary] [switch: recorder, audiocard, lettertravel, off by default]

Fixed
- Allowing photos for the first time on the Notes photo roll shows the roll at once; it used to say "No photos yet." until the app was opened again.
- The Writing Aura card counts toward its first reading with three boxes, matching "0 of 3 letters"; it used to draw five under that line.
- In the Writing Aura room, a dimension still being read says "Still reading." once, with "A few more letters and this one fills in." under it; the line under it used to start with "Still reading." again.
- On a small iPhone, onboarding's "This is you, to a stranger." shows your whole courier name on the envelope (it used to end "Summery M…"), keeps the envelope's type its drawn size under Larger Text, and fades at the bottom while the card about signing is still below. [OTA for the React Native run; binary for the native one]

---

## 1.0.6 (binary 1.2.5, build 35), 2026-10-25

This is the iOS 27 launch fix, plus small fixes from the crash hunt. Everything in 1.0.5 comes
with it.

### Fixed
- The app opens on iOS 27. Build 34 of 1.0.5 quit at launch there, because iOS 27 requires the
  scene life cycle.
- If you opened the app by tapping a notification, it no longer opens the same letter a second
  time when iOS brings the app back.
- Swiping the app away just after launch no longer switches a screen (Me, in the crash log) back
  to its older look for the rest of the build.
- Onboarding's under-18 stop shows "Wrong year? Change it" on the first slip too.
- Stamp Press: Retake, or Retry after a refusal, while typing the #topic closes the keyboard first
  instead of risking a crash.

---

## 1.0.5 (binary 1.2.4, builds 29–34), 2026-10-20 → 10-23

This is the 10a overhaul: new identity, Stamp Press, letter papers, the Sparkle deck, one type
system, dark mode and most screens redrawn in SwiftUI. It includes all of 1.0.4.

**Remote switches in this build:**
- `identity`: on by default from 1.2.4. A `false` row turns it off from the next read.
- One `app_surfaces` key for each SwiftUI screen: `tabbar`, `today`, `kindreds`, `room`, `chat`,
  `reader`, `compose`, `me`, `settings`, `editprofile`, `notes`, `paywall` and `myletters`.
  - Every screen is Swift by default, and the server can send any one back to React Native.
  - If a screen crashes on two launches in a row, the phone sends it back by itself.
- Nothing else is remote.
  - The First Class offers are worked out on the phone.
  - Keeping strangers' stamps is a code flag, `KEEP_STAMPS_ON = false`.

**Server pieces it relies on:**
- Web migrations:
  - 0033: the remote switches
  - 0034: she/he mark and star sign
  - 0035: `sign_thread`, for drawn signatures (until it runs, names are traded the old typed way)
  - 0036: Cofounder seats and number
  - 0037: other people's member stamps
  - 0038: stamp quota
  - 0039: stamps for accounts only
  - 0041: letter paper
  - 0044: This or That picks
  - 0046: the icon badge
- The `stamp-check` moderation endpoint.

### New

**Make your own**
- **Stamp Press:** take a photo (camera at 0.5×, 1× or 2×) or choose one from your library, crop
  it, and press it into a perforated 3:4 stamp. Add a #topic, colours and a filter:
  - original, vivid and warm are free
  - golden, film and airy need First Class
  - gilt is for Cofounders
  - `[server: 0038, 0039, stamp-check]`
- Every pressed stamp is checked automatically before anyone else can see it. It shows in your
  album at once and goes on letters once it passes. Anyone can report a stamp from a letter.
- Only signed-in accounts can press stamps; a guest gets the sign-up sheet. A few are free, and
  more come with First Class (the server sets the number).
- The compose stamp tray has two tabs, official and yours. Me › Stamps shows Your stamps (the ones
  you made) and the Album.
- **Letter papers:** seven papers in the compose bar. `[server: 0041]`
  - plain and grid are free
  - airmail unlocks with your first kindred
  - kraft, receipt, sticky and riso need First Class
  - The reader sees the paper on the Today card and in the letter reader.

**Who you are to strangers** `[switch: identity]`
- A stranger shows as a frosted window, made from their id and never a blurred face. Each has a
  courier name in your language, the same on every screen and on the web.
- Two optional marks, she/he and star sign, each with its own switch in Edit profile. Existing
  users get a one-time note, where the she/he switch starts on for she or he. `[server: 0034]`
- **Trading names with signatures:** the door opens at five letters each way. You send your face,
  your pen name and a drawn signature (or type it instead). `[server: 0035]`
  - It never sends a legal name.
  - If you have no pen name yet, it asks for one first.
- **The new kindred ceremony:** the frosted windows clear to the faces each of you sent, the
  courier names are struck through, the signatures draw in, and it ends on KINDREDS · date.
  Long-press a signature to report it or block the person.
- The kindred page shows the name they signed and "first met as" their courier name. A kindred's
  row says "was {courier}" for 7 days.
- **New onboarding,** thirteen screens:
  1. the showcase
  2. one question per screen, with the egg
  3. the 18+ gate, before any account exists
  4. how strangers will see you
  5. a first letter of at least 20 characters, and its first stamp
  6. the hatch
  7. the account, or Not now
  8. the flight
  9. the knock
  - Pick a face has a Random dice.

**In kindred rooms**
- **Sky postcard:** the ✦ key opens a deck. Its Wave card sends a postcard of your sky: dawn, day,
  dusk or night, taken from your local hour only. Wave Back sets the two postcards side by side.
- **This or That:** 60 pairs in each language, with Another and Shuffle. You both pick blind, and
  the picks open together with Same! or Opposites. Discuss. `[server: 0044]`

**Look and type**
- **Fonts:** choose the Letter font in Settings: Newsreader, System (SF Pro), EB Garamond or SF Mono.
  - It applies to letters, replies, notes, Wren's lines and every field you write in.
  - Chat bubbles in kindred rooms stay System.
- **Appearance:** System, Light, Dark, Lavender or Paper, with full dark mode (Midnight) and a dark
  launch screen.
- These screens are redrawn in SwiftUI: the tab bar, Today, Kindreds, kindred rooms, pen-pal chat,
  the letter reader, compose, Me, Settings, Edit profile, Notes, First Class and My letters.
  `[switch: app_surfaces, one key per screen]`

**Today**
- One card at a time:
  - Drag up, or tap NEXT, to pass a letter. A passed letter can be brought back from the menu.
  - Tap REPLY to write back.
- Wren stands on the band and reacts. She leans in when you tap Unfold, hops when you tap her,
  sleeps from 21:00 to 08:00, wilts when she's hungry, and carries your reply off in her beak.
- Long letters fold. Unfold opens the reader, with Fold it back and Write back.
- **The day's end:** Wren's letter with the day's real counts, the window with Free Flight, and
  tomorrow's bag of three sealed envelopes with its opening time.
- Wren's arrival line goes away when you tap it, or by itself after 10 seconds.

**Everywhere else**
- **The + in the tab bar:**
  - On Today it opens two round buttons, Letter and Note. Free writers see how many letters they
    have left.
  - On every other tab it opens a sheet: "Who's this one for?"
- **Me:**
  - Counts under your name, which open peek trays.
  - Courier, Aura and Stamps as an iOS segmented control.
  - Wren's looks: Bare, Beanie, Scarf and a First Class tile.
  - A door to the monthly writing report.
- **New First Class page:** `[server: 0036]`
  - Yearly, Monthly and Lifetime, with the real saving.
  - A trial line only when the store confirms you're eligible.
  - The Cofounder card, with seats left and your number.
- After a purchase you get a receipt of three stickers. Start writing opens the composer.
- A member's avatar becomes a gold perforated stamp everywhere it is drawn, printed with 1ST or
  the Cofounder number. `[server: 0037 for other people's]`
- **First Class appears day by day:**
  - nothing on days 1–2
  - the Post's gold-edged letter from day 3
  - the boarding pass after seven days in a row
  - a sealed monthly writing report from day 30
- **Edit profile** is its own page:
  - your photo, or a Random face
  - faces offered by your pronoun
  - pronouns and birthday
  - your courier's name
- **50 redrawn faces:** 44 old faces become the closest new one, and six keep theirs.
- **Moods:** 34 new line faces in four groups. You can pick only a colour group.
- **Notes:**
  - New card layouts: words in three sizes by length, pictures in five tiers, and a voice bar
    that plays in place.
  - Grid is a waterfall.
  - A date chip follows the top note.
  - The calendar shows each day's mood face.
- **Notes' empty page:** you pick how today was. A draft card asks that mood's question, and the
  composer opens with it.
- **Two notification switches in Settings:** the 8 o'clock knock, and Notifications. Turning
  Notifications off takes this phone off every push.
- **Wren's reminders:**
  - The phone plans them at your local time: one a day, never a word from the journal.
  - The evening line is offered once, after your first journal page.
- **Her day off:** at noon, at most once a week, she invites you to Free Flight.
- **App icon badge:** it shows how many letters and messages you haven't read. `[server: 0046]`
- What's new plays as a reel in Wren's room, and her posts can open a guide.
- The pen-pal chat's band is back: YOU and their five cells under the header.

### Changed
- **A softer look:**
  - The black ink frames and hard shadows are gone from cards, sheets, menus, pen-pal letters,
    reply bars, Notes, Me and First Class.
  - Sheets are iOS-style floating cards with a round close.
- Buttons and titles use Apple's title case; labels stay in small capitals. There is now one back
  chevron everywhere.
- **Type:**
  - The interface is in System, and labels are in SF Mono.
  - Fraunces, Inter and IBM Plex Mono are gone, so the app is about 2.4 MB lighter.
  - The fonts are embedded, so launch no longer waits for them.
- **Reply bars:**
  - Today and pen-pal chat share one reply bar: a round field, an emoji key and a send circle.
  - In pen-pal chat, Return starts a new line and the send key sends.
- The kindred-room bar is ✦, the field, emoji and +. The keyboard's send key sends.
- Pen-pal letters are soft slips as wide as their words, with yours on the right.
- **Compose:**
  - It opens with the keyboard down, so you see the page and its paper first.
  - A chosen stamp shows as its #name pill.
  - The page looks as it does on the App Store again.
- **Stamps v3:**
  - The 36 stamps are redrawn as characters in a brighter palette.
  - The #topic tag is the solid pill again.
  - The postmark code is gone.
- The letter reader draws the opening letter on its paper.
- **Kindreds:**
  - Closest to you is gone.
  - Wren's pinned row shows her bird.
  - A failed load says you're offline instead of "all answered".
- Settings shows the App Store version and build, for example "1.0.5 (34)".
- First Class copy names only what it does: rooms that never close, voice letters and Wren's full
  wardrobe.
- Dates on the Courier page and on the kindreds band follow your language's format.
- Keeping strangers' stamps waits for a later version. Keep and From strangers are hidden.
- **Delete account:**
  - It also removes your stamp pictures.
  - It keeps your journal on the phone (1.0.4's build 28 deleted it).

### Fixed
- **Sending:**
  - When a send times out, the app checks whether the letter arrived before calling it a failure:
    no false "Couldn't send", and no second copy.
  - It shows "Still flying…", then "Sent. It's on its way."
- **Face and pen name:**
  - They no longer go missing after you sign out or switch accounts.
  - Accounts that lost them get them back from the phone's guest copy.
- Google sign-in's "PKCE code verifier not found" is fixed, by three changes.
- A fresh install no longer gets the old onboarding: identity is on unless the server says off.
- **Onboarding's age check:**
  - You have to turn the birthday wheel before Next.
  - An under-18 answer can be corrected once per phone.
- **Today:**
  - It no longer crashes when it shows Wren's letter (iOS 26.5).
  - Letters no longer drop off a kept desk just because they got older.
  - Her arrival only shows when there are letters.
- **Voice letters:**
  - A voice letter pauses when you swipe on or switch tabs.
  - Leaving a screen after a voice letter played no longer throws an error.
- **Drafts:**
  - Discard really discards, and Save as draft saves once.
  - A question you turned off is not sent.
- A send at zero letters left asks the server before refusing. This covers First Class writers
  whose membership check failed, and the start of a new day.
- Kindreds no longer flashes "Expired" for First Class members while it loads.
- Restore purchases says what happened, and updates your membership without a relaunch.
- Picking a language changes the language of notifications at once.
- When the Blocked list fails to load, it says so and tries again.
- Pip's notice no longer counts links as words.
- After onboarding, Wren never shows as an egg.
- "Yes, at 9" turns the evening line on at once and always releases its button.
- A stamp you just made shows at once, in the album and offline.
- A pen pal's row no longer says "was No. 8866".

### Not yet told
- **Store What's New** (`design/store/asc-1.0.5.json`):
  - It has Stamp Press, papers, This or That, the sky postcard and fonts.
  - It is missing the new identity (frosted windows, courier names, signed names), the new
    onboarding, the new Today, and Appearance and dark mode.
- **In-app reel** (`news-reel`, id `1.0.5`): it is still the three scenes made for 1.0.4, and none
  of 1.0.5's new features are in it.
  - the their-turn fold, which already shipped in 1.0.4
  - two switches
  - her day off
- **Guide reels:**
  - `stamps`: it says photo stamps aren't built.
  - `kindreds`: it shows No. 4481 and mosaic faces where it should show frosted windows, courier
    names and the signing.
  - `letters`: it shows the old + fan, no paper, and the shutter where Wren's letter now is.

---

## 1.0.4 (binary 1.2.3, build 28), approved about 2026-10-16

This is a hotfix built from 1.0.3's code, on branch `hotfix-1.0.4`. The store text is "Bug fixes
and improvements.", and there is no reel. It is the first build that can take over-the-air
updates.

### Changed
- Kindreds › All: pen pals waiting on the other side (the last letter is yours) fold into one row.
- A kindred's row shows how many letters you haven't read. A pen pal's row says YOUR TURN or THEIR
  TURN.

### Fixed
- In-app purchases work again. Local builds had been missing the store key since 1.0.2.
- The journal is never overwritten after a failed read, and it stays with its own account when you
  switch.
- Google sign-in uses each code only once, so "PKCE code verifier not found" comes up less often.
- Delete account's cleanup on the phone actually runs.
- Small fixes can now arrive as over-the-air updates (expo-updates), without App Review.

### On the branch after build 28
These are not in the binary. They can only go out as an over-the-air update from the hotfix
worktree; whether that update was published isn't recorded here. All of them are in 1.0.5.
- Delete account keeps the journal on the phone (84c2f33).
- Three Google sign-in PKCE fixes (b53d44a, e18287e, 3e2818d).

---

## 1.0.3 (binary 1.2.2, build 27), approved 2026-10-13

These are the changes since 1.0.2 (binary 1.2.1, build 25). The store text is in
`design/store/whats-new-1.0.3.json`: photos, long-press, the Kindreds list and Wren's guides.

### New
- Tap a photo to see it full screen, and pinch to zoom. This works in rooms, on Wren's desk and on
  sealed pages.
- **Long-press a line in a kindred's room:**
  - On their lines: Reply (which quotes it), Copy, Translate, Keep in lore and Report.
  - Your own line can be taken back within two minutes, and a note stays where it was.
  - Before names are traded: Copy, Translate and Report.
- **Long-press a Kindreds row:** Mark read or unread, Their page, Rekindle, Report and Block.
  Photos, songs and opened folds have menus too.
- **Wren's guides play as big animated cards:** letters, kindreds, aura, stamps, the sealed journal
  and the courier. Each has one button to the place it explains.
- A bar on Kindreds to turn notifications on. It asks iOS or opens Settings, and × hides it for
  two weeks.

### Changed
- **Kindreds is redone:**
  - It is one white list with All, Kindreds and Pen pals chips, and Wren pinned on top.
  - Each row has a round face and two lines of the last words, with a blue badge when it's your
    turn.
  - The count beside the title opens the letters waiting on you.
- **The horizon:**
  - It unfolds with a tap or a pull.
  - Folded, its ticks show how close each pen pal is to trading names.
  - Closest to you lists the three nearest.
- **Row states:**
  - Rows show a brass "trade names" at five letters each, CLOSES IN n DAYS, and Rekindle.
  - In its last week, a quiet room says what keeps it open.
  - The footnotes under the list are gone.
- "Strangers" are called "pen pals" everywhere.
- **Report and block say what really happens:**
  - Nobody reviews reports by hand, and three different reporters stop a writer.
  - A failed report says so.
  - Blocking hides the conversation for both of you and deletes nothing.
- Settings and the courier guide describe the knocks the server really sends. Your time zone is
  saved on your account.
- Names that read as translated are renamed in ja, ko, it, fr, es, id and pt, and de and id follow
  the web's terms.
- The one-tap "a reply is on its way" is gone.
- The Kindreds chips are a size larger, and long-pressable rows no longer fade under your finger.
- The privacy and terms copy describes what the product does.

### Fixed
- A voice letter left open for more than an hour plays again.
- Asking Wren waits at most 1.5 s for your session.
- A withdrawn letter ends its Live Activity on the lock screen.
- The Kindreds count stays on one line in long languages.
- The first-kindred popup calls the coats by their real names.
- Photos and voice letters load through links that expire after an hour, and Wren's AI requests
  say who is asking.
