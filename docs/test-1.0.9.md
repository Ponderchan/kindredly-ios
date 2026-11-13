# 1.0.9 (binary 1.2.8) — before the build, and what to test

Everything after build 42 (5e3d125b, 11-11 23:53): 60 commits. Tick as you go.
Sim = can be checked on a simulator; Phone = only a real iPhone shows it.

## Before the build (Claude, 2026-11-13)

- [x] All 134 node test files pass; the JS type check and the whole Swift module type check pass.
- [x] Version 1.2.8 in app.json; the build number comes from EAS (remote, auto-increment): 43 or later.
- [x] STORE_OF_BINARY has 1.2.8 → 1.0.9 (Settings' footer and the update prompt read it).
- [x] The iOS 27 scene plugin is in app.json (`plugins/with-scene-lifecycle`).
- [x] The cloud build uses Xcode 27.2 (`eas.json` production `image: macos-tahoe-26.6-xcode-27.2`). Build 42 was the
      iOS 26.5 SDK: on the Duo it would show in compatibility mode. The Duo's two screens edge to edge need 27.1+.
- [x] `meplanet` and `afterfifteen` stay ON by default for the release (owner, 2026-11-13: "默认开着吧"; a false row
      in app_surfaces turns either off without a build).
- [x] Ten letters a day (owner: "读信数字10确定了"): DAY_LETTERS = 10 builds the desk, and Next's ring draws one tick per
      letter on it, so a full day is ten ticks (design/next-ring-ten.png); the lock screen's row is ten long.
- [ ] After the build (Claude): unzip the ipa — version 1.2.8 / build, widget the same number, DTSDKName iphoneos27.2,
      UIApplicationSceneManifest, supabase project id ≥1, `appl_` ≥1, review account ≥1, aps production, codesign.
- [ ] The App Store description says ten letters a day, not fifteen.

## After TestFlight build 43 (owner's feedback, 2026-11-13): test on the next build

- [ ] New account, first day: Today opens on the courier's first flight, never "Happy birthday" (a birthday left on
      today's month and day is not one; no birthday knock, no birthday stamp either).
- [ ] On a real birthday (dev page BIRTHDAY on the simulator): Reply opens the box "Replying to Wren"; sending it takes
      her letter off the desk; a guest is asked to sign up first.
- [ ] Kindreds, empty page: catch a long line, Write back: Today shows that letter with the reply box, even on a
      birthday; a long caught letter shows four lines and both buttons above the tab bar.
- [ ] Me: the Writing Aura tile has its picture as the page opens (after a cold launch too); a new account shows the
      drawing, never a grey panel.
- [ ] Notes, first page: the caret is before "what made it so?".
- [ ] The tab bar and Next/Reply are the system glass: on a white Today in daylight the bar shows as a pale pane; in
      Dark, Lavender and Paper too; Next and Reply are 58 and their labels clear of the bar.

## Phone only

- [ ] Sign in with Apple, Google and email; sign out and back in: "Meet Mist." does not come back, Wren's room isn't all
      unread again, a kindred's ceremony doesn't replay.
- [ ] First Class page shows real prices; buy in the sandbox; Restore.
- [ ] Notifications: the two switches; the 8 o'clock knock; the question iOS asks.
- [ ] The launch: first open after installing (the full letter, a light tap as Wren comes out); the splash before it is
      cobalt (iOS keeps an old splash until the app is reinstalled or updated).
- [ ] The app icon on the home screen: light, dark and tinted.
- [ ] Voice letters record and play; photos and the camera in a diary note; Diary note's photo roll with "selected
      photos only" access.
- [ ] Haptics: the launch, the keys at the top of pages, Me's card poke.
- [ ] Live Activity on the lock screen.

## The new things (Sim or Phone)

Today
- [ ] Ten letters a day; a letter you've read doesn't come back on a later day.
- [ ] Read the last letter: the card leaves, Next and Reply fade, the closed page comes. Nothing of the old evening
      (Wren flying into her window, her letter) shows between.
- [ ] Undo for ten seconds after the last Next brings the letter back.
- [ ] Next and Reply are pearl glass.
- [ ] A long letter, unfolded: Write back opens the same reply box as Reply ("Replying to …").

Kindreds
- [ ] Wren's face is the round front-on bird with the ✦ feather, in the list and at the top of her room.
- [ ] The orbit view; the empty state "catch a line"; the chips swell under the finger.

Notes
- [ ] The three keys at the top (search, view, calendar): white, a lens under the finger.
- [ ] The calendar: iOS-style month, mood faces in round slots, today in a capsule.

Me and Settings
- [ ] Me's card: a tap on Wren pokes her (face changes, a hop); her name, journey and flight log open her page.
- [ ] Settings: the First Class card at the top goes away after one tap (not for members).
- [ ] Settings › Appearance: its own page; the sample letter changes with each appearance and each font.
- [ ] Choose Newsreader: letters on Today, Wren's room and the reader are in Newsreader (they weren't since 10-26).
- [ ] "Things you kept" (was "Moments you kept") in Settings and on its page.

Everywhere
- [ ] The tab bar: the + is lower; opening it turns it into × where it is; the selected tab is indigo.
- [ ] Dark theme is neutral black; Lavender and Paper look right.
- [ ] Sign-up from scratch (guest): the first screen opens out of the launch — the letter with Wren flies onto the first
      card's stamp; every screen is cobalt.
- [ ] What's New 1.0.9 (after the post's SQL is run once 1.0.9 is live).
- [ ] Nine languages: Settings › Appearance, Things you kept, the closed-day pages.
- [ ] iPhone SE size and the largest text size.

iPhone Duo (Duo simulator; no device)
- [ ] Outer screen and inner screen open: Today, Notes (the month fills the left page), Kindreds, Me, Settings ›
      Appearance, the reader with a long letter, the + on the band, the launch and sign-up.
