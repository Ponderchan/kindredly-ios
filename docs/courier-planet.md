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
   **The header stays sticky and collapses as it does today** (owner, 2026-11-11: "别忘了我们 me tab
   也有吸顶的交互 以前定的"): it sits outside the scroll, and over the scroll's first 40 points the
   avatar goes 72→36, the name 22→17, the counts and "joined" fade out. Only the segmented control
   leaves it.
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
- **Render a SwiftUI view to a PNG on this Mac:** `design/courier-planet/checks/render.sh
  <harness.swift> <out.png>` (about two minutes: it compiles the whole portable layer). What it
  does: compile for Mac Catalyst and run it as a command-line tool — `xcrun swiftc -parse-as-library -target arm64-apple-ios18.0-macabi -sdk $SDK
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

## Progress

- 2026-11-11 — spec and prototype committed (580a26e).
- 2026-11-11 — **phase 1 done** (e7dc458): `Portable/Kit/KWrenBird.swift` + generated
  `KWrenFamilyData.swift`; check sheet in `design/courier-planet/checks/` (source + render).
  Not yet wired into any screen: the existing screens still show snapshots.
- 2026-11-11 — **phase 2 done** (3fdc232): `Portable/Planet/` — KPlanetMath (vectors, turns, the
  trackball, the land caps, the stamp sites), KPlanetEngine (attitude, the finger, the glide, the
  page's settle and pick, zoom, fixed 60 Hz steps), KPlanetPaint (one frame, back to front),
  KPlanetView (Canvas on a TimelineView, drag / pinch / double tap, taps reported).
  A letter's stamp sits at the site its *ordinal* picks (1 = the first letter she ever carried),
  so stamps never move when a new letter arrives; the planet shows the newest 47.
  Check: `design/courier-planet/checks/render.sh planet-sheet.swift out.png` (render kept beside it).
  Touch, glide feel and gesture conflicts with the Me scroll view are not checked yet (phase 7).
- 2026-11-11 — **phase 3 done**: `Portable/Planet/KPlanetWren.swift` — KPlanetWren (who is on the
  planet: her look, her state, napping), KWrenMotion (the five states, the sweep, the idle
  motions, the tap; one 60 Hz step at a time, fed the planet's swirl), and the painter's half
  (her on the rim or on her loop via KWrenBird.draw, the letter set down beside her, the
  day-off gates and trail). An egg sits on top and nothing flies. The flying pose is the same
  symbol at every stage, as in WrenBird.tsx. `KWrenMotion.x(layout)` is what a speech bubble's
  tail follows.
  Check: `render.sh wren-sheet.swift out.png` — 24 moments (asleep, a slow turn, a flick, a tap,
  the loop, swept, waiting, flying in, landed, day off, skins and stages).
- 2026-11-11 — **phase 4 done**: the Me tab, behind the new switch `meplanet` (default off; off,
  Me is the page of segments exactly as before).
  - Swift: `Portable/Me/KMePlanetCard.swift` (her card: scene 200 → bubble band 122, its tail
    following her through `KPlanetProbe` → shelf 84; the Aura / Stamps tiles and the report row
    on the app's own `KMood` fills), `KMeScreen.swift` (`KMeContent.planet`; `KMePlanetPage`,
    the one page under the header), `KMeHeader.swift` (no segmented control with the planet;
    still sticky, still collapsing), `KAuraArt` gains `cover:` and `ground:` for the tile's strip.
    On the card only the planet and the air her loop crosses take the finger
    (`KPlanetTouchShape`), so the scene's sides, the bubble and the shelf still scroll the page.
  - Adapter: `Adapters/KMePlanetView.swift` (the `planet` record's decoders — reused by the
    planet page in phase 5 — and the marker view `KMePlanetView`), `KMeView.swift` (the record,
    `onMeTrack`, `onMePlanetTap`). **The adapters are only syntax-checked** (they need Expo's
    modules to type-check): the dev build in phase 7 is their first real compile.
  - TS: `src/screens/me/planet-model.ts` (pure; `node src/screens/me/planet-model.test.ts`, 53
    checks): her state from whereabouts + day off, the letters behind the stamps (ordinals counted
    down from the total, so an old stamp never moves), the shelf's four and their weekly turnover
    (Monday, UTC; what she wears keeps its place; the worn one comes off), what a tap on a look
    does, the Stamps tile. `me-pieces.ts` `useMePlanetData` (the gate: switch + marker view +
    crash strikes), `useMeModel` (`model.planet`, `act.shelfLook`, `act.track`), `MeNative.tsx`,
    `modules/kindredly-ui/src/Planet.ts`, `src/data/strings-planet.ts` (English only until phase 6).
  - What a tap does: Open / Play as today (her page, or the game); a look wears it / takes it off /
    opens First Class (a paid look, not a member) / opens her wardrobe (Moss before a kindred);
    "All looks →" opens her wardrobe for everyone; the Aura tile opens `/aura`, the Stamps tile
    the album, the report row the report. **The round button opens her page until the planet
    page exists** (phase 5 gives it its own route).
  - Placement chosen (owner may move them): the **First Class card sits at the foot of the page,
    for non-members only**; the First Class forms by the day keep their places (boarding pass and
    sealed report over her card, the Post's letter on its top edge left of the round button, the
    pull-tab on the right edge); **keepsakes stay where they are today** (her page — the Swift Me
    has not shown them since 4a).
  - Check: `render.sh me-sheet.swift out.png` — five cards (home / on the way / waiting / back /
    day off; morning, day, evening, night; free reader, kindred, member), the tiles, and the whole
    page at rest, pushed up (header collapsed) and with the Post's letter. The page is composed
    by hand there: ImageRenderer draws nothing inside a ScrollView.
  - Try it on a dev client: `kindredly:///dev/step5-me` → PLANET (turns the switch on for the
    session), then WHERE / SKIN / LOOK / WEEK / LETTERS / KIN / FC / DAY OFF.
- Next: phase 5, the planet page.

## For the device pass (phase 7), noted along the way

- The adapters' first compile (`KMePlanetView.swift`, `KMeView.swift`).
- The finger: turning the small planet inside the scrolling Me page (the planet takes the drag,
  the rest of the card scrolls) — does it feel right, or should a mostly-vertical drag scroll?
- The planet's Canvas redraws at the display's rate while Me is in front (up to 47 stamps):
  measure on a ProMotion phone; cap the card at 60 if it costs.
- Dynamic Type: the bubble is a fixed 106 high (two lines of her words, one of her aside).
- Touch feel of the glide, the sweep, the tap on her.

## Not decided yet

- How often the shelf turns over (built weekly, Monday UTC).
- Where the First Class card sits on the new Me tab (built: the foot of the page, non-members
  only) — the owner has not looked at it yet.
- What the planet shows before the first letter, and for an egg (built: a bare planet with no
  stamps; an egg sits on top and nothing flies).
