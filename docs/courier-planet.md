# The courier's planet — spec (owner sign-off 2026-11-11)

Branch `courier-planet` (from `ios-1.2.3` at 7ee649f). Not for build 42 / 1.0.9: the next version.
Pure SwiftUI — no React Native islands, no snapshots of the React Native bird (owner: "纯原生的").
Behind a remote switch, default off, like every Swift surface (`src/lib/surfaces.ts`).

The approved prototype is in `design/courier-planet/prototype/` (open `index.html` from a static
server; it is one self-contained page). **It is the reference for every behaviour below** — the
sphere maths, Wren's motion constants and the layout numbers are all in its script. Where this
text and the prototype disagree, the prototype wins unless this text says "changed".

## What the owner decided

1. **Me tab, top to bottom**: profile header → *her card* → two tiles (Aura, Stamps) → the writing
   report row. The Courier / Aura / Stamps segments go away. (First Class entry, keepsakes and the
   FC rollout forms keep working — placement to settle in phase 4, nothing of theirs is removed.)
2. **Her card** = a sky scene with a *small whole planet* → her words in a white **speech bubble**
   whose tail follows her → a shelf of four looks.
3. **The planet never turns by itself.** It turns under the finger, glides to a stop when thrown,
   and — on the planet page only — turns to the letter that was just picked.
4. **Wren does not ride the planet.** She keeps her place on the screen and answers the hand
   ("swept" in the prototype). Five states:
   - home: asleep on top, breathing; a turn wakes her, she runs against the ground to stay put; a
     hard flick sends her up, she lands when it slows, star eyes on landing, sleeps again later;
   - on the way: flies her own loop round the planet with the letter, passes behind it; a turn
     sweeps her along (faster, leaning, speed lines), then she eases back to cruise;
   - waiting at their door: perched on the right shoulder facing out; glances back and taps a
     foot every few seconds;
   - back with a reply: flies in with it, lands on top, three hops, the letter set down beside
     her; a hop every few seconds until it is read;
   - day off (`lib/free-flight` isDayOff): two gates in the sky either side, laps through them
     with a dotted trail, chip "DAY OFF", the button reads Play and opens Free Flight.
   Tapping her: a hop and a face.
5. **No YOU / SOMEWHERE icons, no route line.** State is her behaviour plus her words.
6. **Marks on the planet**: a stamp for every letter carried (stuck where it landed, the letter's
   own stamp); a lamp for every stranger who has had that letter on their desk (`letters.reads`,
   pale dot by day, lit after dark, brighter for the letter on show); a **postmark** over the stamp
   of a letter someone answered. No windows for correspondents.
7. **Two pages, kept apart**: Open → the courier page as it is today (about her). The small
   button on the card, and the courier page's existing Track button → **the planet page** (about
   your letters).
8. **The planet page**: the planet (zoom: pinch, double tap; closer in, each stamp shows its day)
   → her words → three figures (ON THE WAY / CARRIED / ON DESKS = sum of reads) → TRACK: **one
   slip at a time**, a horizontal pager, "3 / 12"; swiping turns the planet to that letter's
   stamp, tapping a stamp jumps the pager, turning the planet by hand picks the stamp now facing
   you → a "My letters" row (the full list stays there). A letter with a reply opens on its own
   slip with "Go to the Door".
9. **The shelf of looks** — four, defaults (Sky, Bare) not counted, left to right by "can I use
   it now": one free piece (Beanie / Scarf / the season's) · the colour a first kindred unlocks
   (Moss) · one First Class colour (Peach / Night / Mist) · one First Class piece (Headphones /
   Flower crown / Party hat / Shades). Which one in each slot turns over (weekly, unless the owner
   says otherwise); what she wears keeps its place; tapping the one she wears takes it off.
   White chips, a name under each; worn = the card's green ring and a tick; First Class = gold
   dashes and a lock. Replaces `me-model` buildLooks' fixed four.
10. **Colour**: the default theme is Classic (white page). The three things under her card each
    take one of the app's own mood colours: Aura `#F6E7C6`, Stamps `#CFE3F5`, report `#DDEFD6`
    (`src/theme/themes.json` mood). The owner is tired of lavender everywhere — new surfaces
    take brand / mood colours, not `soft` / `lav`.
11. **Copy, shipping with this** (nine languages, written natively, not translated):
    "on the way" says it plainly — `your letter's out. no one has written back yet` /
    `i'll bring it the second someone does` (replaces fl.exploring, fl.exploring.notime,
    fl.exploring.sub and the night pair fl.night.flying / .sub). Her voice may be playful; a
    status must be understood at a glance — no window / sill metaphors for status.
    New strings: ON THE WAY, CARRIED, ON DESKS, TRACK, DRAG TO SPIN, PINCH TO ZOOM. Already in
    the app: the slip rows (wren.slip.*), Go to the Door, DAY OFF, Play, My letters,
    "On {n} strangers' desks." (la.out.readsN), All looks →.

## What exists today (read before changing)

- Me tab: `src/screens/me/` (me-model.ts builds the view; MeNative.tsx hosts `KMeView`),
  `modules/kindredly-ui/ios/Portable/Me/KMeScreen.swift` (+ KCourierCard.swift, the current
  Swift scene), `Adapters/KMeView.swift`. Up to three React Native islands today: avatar, the
  courier scene, the Aura picture.
- **Wren in Swift is a picture today**: `KWrenPicture` shows snapshots captured from the React
  Native `WrenBird` (`src/components/WrenBird.tsx`, `BirdSnapshots.tsx`). The drawing itself is
  data: `design/wren-family-gen.mjs` → `src/components/wren-family-data.ts` (108 symbols, 1278
  shapes: stages egg / hatchling / fledgling / adult, moods, the flying pose, five skins, the
  accessory overlays). WrenBird.tsx adds: the hatchling shaped to the reader (`shapeHatchling`),
  the birthmark, hatch-stage eyes per mood, the tail feather, wilting colours, the optional
  die-cut outline, the letter under the flying bird.
- Courier states and words: `src/lib/whereabouts.ts`, `src/components/courier-card-model.ts`
  (PALETTE by daylight, the four skies), `src/screens/courier/courier-model.ts` (slipRows,
  drivingThread), `src/lib/free-flight.ts` (isDayOff), strings `fl.*`, `wren.slip.*`, `ff.dayoff.*`.
- Letters: `src/screens/letters/letters-model.ts` (LetterCardFacts: date, stamp, body, reads,
  answers, status); the server keeps `letters.reads` (web migration 0020: people, not opens).
- Looks: `src/lib/wren-style.ts` (SKINS: sticker=Sky free, moss=milestone, plush/peach/ink=plus;
  ACCESSORY_META: beanie, scarf free; phones, flower, party, shades First Class; witch, ghost
  seasonal).
- Native art already drawn from data: `Portable/Kit/KArtPath.swift`, `KStampArt*.swift`,
  `KMoodArt*.swift`.

## How to check Swift without building the app

- **Type-check the whole portable layer (about a minute):**
  `cd modules/kindredly-ui/ios && xcrun -sdk iphonesimulator swiftc -typecheck -target arm64-apple-ios18.0-simulator $(find Portable -name '*.swift')`
  (the target must be iOS 18.0, the podspec's). Local Xcode is 27.0, the cloud image 26.5: keep
  expressions in small typed steps (see commit 85b7266).
- **Render a SwiftUI view to a PNG on this Mac:** compile for Mac Catalyst and run it as a
  command-line tool — `xcrun swiftc -parse-as-library -target arm64-apple-ios18.0-macabi -sdk $SDK
  -Fsystem $SDK/System/iOSSupport/System/Library/Frameworks -L $SDK/System/iOSSupport/usr/lib/swift
  -I $SDK/System/iOSSupport/usr/lib/swift <sources> -o shot` with `SDK=$(xcrun --sdk macosx --show-sdk-path)`,
  and a `@main` that writes `ImageRenderer(content:).uiImage.pngData()`. Canvas, gradients and
  text all render. Motion is checked by rendering frames at chosen times, not by eye in the app.
- The dev client is rebuilt only to check touch and feel on a simulator / device — ask the
  owner before building.

## Phases

1. **A native bird.** Generator gains a Swift output (`Portable/Kit/KWrenFamilyData.swift`);
   `KWrenBird` draws any skin / stage / mood / pose / accessory from it, with what WrenBird.tsx
   adds (hatchling form, birthmark, hatch eyes, tail feather, wilt, no outline by default,
   letter on/off). Checked against the React Native bird by rendering both sets.
2. **The planet.** Pure maths in a value type (rotation, virtual trackball, glide, orthographic
   projection, caps, tangent-plane stickers) + a Canvas view: sky by daylight, planet, land,
   stamps (KStampArt), lamps, postmarks, trees, the day-off gates; drag and pinch.
3. **Her motion.** The five states, the sweep, the idle motions, tap; fixed 60 Hz steps so it
   feels the same at 120 Hz.
4. **The Me tab.** Her card (scene, bubble, shelf), the two tiles and the report row in mood
   colours; me-model: the shelf's four with their turnover, the letters behind the stamps; the
   switch; the old card stays for when the switch is off.
5. **The planet page.** Figures, the slip pager tied to the planet, My letters row, zoom; the
   entries (card button, courier page Track).
6. **Words and care.** Nine languages, VoiceOver, Reduce Motion, Dynamic Type, the model's
   tests, the changelog.
7. **On a device.** Dev build, simulator and phone, fixes.

## Not decided yet

- How often the shelf turns over (assumed weekly).
- Where the First Class card / keepsakes sit on the new Me tab.
- What the planet shows before the first letter, and for an egg (no bird yet).
