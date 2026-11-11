# Today, after fifteen — spec (owner's decisions of 2026-11-11)

Branch `today-after-fifteen` (from `courier-planet` at 40aa424, which has the native bird
`KWrenBird` and the Swift check scripts; `courier-planet` itself sits on `ios-1.2.3`).
**Not for build 42 / 1.0.9.** Proposed: the release after it (App Store 1.0.10, binary 1.2.9),
with the courier's planet — the owner has not said yet.
Pure SwiftUI, no React Native islands, the bird drawn by `KWrenBird`.
Behind the remote switch `afterfifteen`, **off by default** (`src/lib/surfaces.ts`). Off, Today
ends the day exactly as it does now (her counted letter and the window to her game), and First
Class's seven-day rule is the one that is live.

The design: `.claude/mock/today-after-fifteen/` in the main checkout (the owner's prompts and
the clickable prototype, not in the repo; original in `~/Downloads/export 3/today-after-fifteen/`).
Where this text and the prototype disagree, this text wins: it carries what the owner changed.

## What it is

When the day's last letter has gone past, Today's content is replaced by one of three end-of-day
pages until the desk's day turns (8:00 local, `lib/day`):

- **F1, the mailbox** — the card is a mailbox. Its slot stays open (a tap drops an envelope in
  and opens the composer). In its window: her, her count of the day, a cord. Pull the cord and a
  shutter comes down with a Closed sign, when she is back, and a note taped under it.
- **F3, the receipt** — a printer; Print feeds a receipt out of it line by line: the counts, when
  she is back, and a small thing at the foot. Tear it off: keep the stub, or share the receipt.
- **F6, bedtime** — she sits in an opened envelope. Snack, Pat, then Lights out (locked until
  the first two are done). The room goes dark, she sleeps, and a card appears over her.

Each carries **one small daily thing** the reader can Keep. Under the card, on all three, a strip
that opens Free Flight.

## The rules (pure, tested: `src/screens/today/after-fifteen.ts`)

### 1. When it shows

The desk is done (`today-cards` deskPhase) **and at least one letter went past today** (passed or
answered). A quiet day with nothing dealt keeps today's page: nothing was read, so nothing is
counted. Every number on the page is the day's real one — on a thin day she says "that's 9".
Her birthday letter still comes first, as today.

### 2. Which page (owner, 2026-11-11)

Worked out on the phone at the moment the desk is done, and kept for that desk day (bringing the
last letter back and finishing again decides again). In this order:

1. the account's day 1 or 2 (or the account's age unknown): **F1**;
2. the desk's day is a Sunday: **F3**, with the week's totals;
3. finished at 20:00 or later (or after midnight, before the 8:00 turn): **F6** — unless the last
   three evenings F6 was offered all ended without Lights out, then **F1**;
4. otherwise **F1**.

Never by gender. An egg has no bedtime (F1).
After three skipped bedtimes F6 is offered again once seven days have passed since it was last
shown; doing it clears the run, skipping it again waits another seven days. *(Open point 2.)*

### 3. The small daily thing

Two kinds taking turns: **line of the day** and **{Name}'s fact**. "A word from far away" is dropped.

Schedule (*proposed 2026-11-11, the owner to confirm — open point 1*):
- they alternate: a line day follows a day that gave a fact, a fact day follows a line. The first
  one ever is fact NO. 1;
- a line day needs a real line (below). With none, it is a fact day;
- the Sunday receipt always prints a fact;
- facts come in order from NO. 1 for each reader (a counter on this phone), 60 to start, each
  checked against a source (`src/data/after-facts.ts` lists the source beside the fact), in nine
  languages. After NO. 60 they start again.

The line (owner's four conditions):
- **a real reading timer.** The app did not record how long a letter is read. From now on the
  phone times the letter on screen (Today in front, the app active, at most five minutes a letter)
  and keeps it for the desk day only, on this phone, never sent. Nothing says "lingered" without it;
- which letter: one the reader **wrote back to** today (with several, the one they stayed on
  longest); else the letter they **stayed on longest, if long enough** — at least 20 seconds and
  at least twice the time its length takes to read;
- **its opening, not a "best" line**: the first sentence (the first two when the first is under
  16 characters); over 140 characters the letter gives no line. Voice letters give none;
- **heavy letters are skipped** (a heavy topic stamp, or words on the care list), and **she adds
  no comment** to someone's line: on F6 the card over her reads LINE OF THE DAY with the line
  alone, not her sleep-talk;
- **nothing from another person's letter goes into the shareable receipt** (the receipt only ever
  prints a fact; its "lingered on" row leaves the picture when the topic is a photo stamp's own
  #tag, which is a writer's words).

Under a line: who wrote it as the card showed them, and its topic. No claim about lingering there.

**Keep** saves into the Lore shelf ("Moments you kept", `src/lib/lore`, this phone only): a line
under its writer's name and day, a fact under the courier's name. Tapping KEPT takes it out again.

### 4. One streak (owner, 2026-11-11)

A day counts when the reader **finished the day's letters or wrote something** (a letter or a
note). F6's seven dots and First Class's boarding pass read the same number
(`fc-rollout-core`: `writtenDays` becomes `activeDays`; its tests change with it).
Finished days are kept on this phone, by the desk's day; written days come from the account and
the notes, as before. A new phone starts the finished days again.
While the switch is off, finished days are not counted (First Class is exactly as live).

On F6 the seven dots are the last seven days, tonight last. Today already counts (the desk is
finished), so before Lights out the bar says how many days ran up to yesterday and "tonight
makes n"; Lights out lights tonight's dot and shows n.

### 5. The receipt's numbers

Sunday's receipt adds up the desk days this phone has logged in the last seven (letters read,
written back, the topic stayed on longest) and prints the days it really covers. The log starts
when the switch turns on; nothing is back-filled or guessed.

## Colour

- **F1 is red** (the prototype's `red`): roof `#D2574A`, body `#E46A5A`, slot `#1E1B35`. The
  9pt line under the slot was white on that red (3.23:1): it is **ink `#1E1B35` (5.15:1)**.
- The default theme is Classic (white), and the owner is tired of lavender. F3's card is white
  (the prompts' text; the prototype file had tinted it). F6's room in the prototype is a lavender
  wash, then lavender dusk: in Classic and Paper it is **lamp-lit cream, then night blue**; the
  Lavender theme keeps the prototype's own colours; Dark has its own. One table
  (`KAfterPalette`), so any of it is a one-line change. *(Open point 3.)*
- The strip's small label is `#2B557F` on its sky (the prototype's `#3B6E9B` was 3.9:1).

## Her voice

The live copy calls the courier **her**; the prototype says he / his. All new copy says her, and
uses the name the reader gave her wherever the prototype says Pond.

## Where things are

- Rules: `src/lib/after-fifteen-core.ts` (+ `.test.ts`, 128 checks): the page, the streak's days,
  the timer's sums, the opening and the heavy letters, the turn-taking, the receipt's totals, the
  record and its moves. `src/lib/fc-rollout-core.ts` (`activeDays`, `activeStreak`).
- Kept on the phone: `src/lib/after-fifteen.ts` (scoped store, one record, `kindredly_after15`;
  also `useAfterFifteenOn`, the gate: the switch and the binary having the view).
- What each page says: `src/screens/today/after-view.ts` (+ `.test.ts`, 45 checks).
- The hook: `src/screens/today/useAfterFifteen.ts` (the timer, the log, settling, the view, the
  taps); the host: `AfterFifteenNative.tsx`; the choice between it and the desk:
  `src/app/(tabs)/letters.tsx`. `useTodayDesk` only gained `view.day` (the day's facts).
- Words: `src/data/strings-after.ts`. Facts: `src/data/strings-after-facts.ts` (the words) and
  `src/data/after-facts.ts` (the count, a source for each). Test: `src/data/strings-after.test.ts`.
- Swift: `modules/kindredly-ui/ios/Portable/Today/After/` — `KAfterModels` (what the pages are
  told, the taps, `KAfterPalette`), `KAfterScreen` (title, card, strip, Undo), `KAfterBox`,
  `KAfterReceipt`, `KAfterBed`; adapter `Adapters/KAfterFifteenView.swift`; wrapper
  `modules/kindredly-ui/src/AfterFifteen.tsx`.
- Dev page: `kindredly:///dev/after-fifteen` (PAGE, THING, FACT, READ, REPLIED, WEEK, RUN, PLAY,
  UNDO, AGAIN, WIPE). It needs a dev client built with the new view.
- Checks: `design/today-after-fifteen/checks/after-sheet.swift` and its five sheets
  (`box`, `receipt`, `bed`, `themes`, `small`), rendered with
  `design/courier-planet/checks/render-fast.sh`; the whole module with
  `design/courier-planet/checks/typecheck-module.sh`.

## What was built differently from the prototype, and why

- **Her lines are lower case, in quotation marks** (her spoken voice on her card), and say her
  real count: `“that’s {n}. i counted twice.”`. One letter and no replies have their own words.
- **The type follows the app** (the owner's 2026-10-20 rule): labels in SF Mono, her words and a
  stranger's line in the reader's Letter font, everything else in the system font.
- **Small labels are 9 points** (the app's smallest), not 8.
- **Colour fixes for contrast** (every small text is at least 4.5:1; computed, not judged by
  eye): the line under the slot in ink (5.15:1); PULL THE CORD → in `#B23F31` (5.4:1; the
  prototype's `#C94F40` was 4.2:1 on the window); the strip's label `#2B557F` (5.9:1); the gold
  tag on the cream note `#94681C` (4.7:1); the note's foot and the locked step `#6B6785`; the
  streak bar's small words in the theme's secondary text (the label tone was 3.1:1 on the bar).
- **The receipt's rows** are the prototype file's (letters read, written back, stayed on, next
  delivery, back in), not the prompt's older list. "Stayed on" replaces "lingered on" and is only
  printed when the timer saw it.
- **A short phone** (iPhone SE): the shutter hangs a smaller sign and note; bedtime folds its
  three steps away once she sleeps, so she and her card have the room; a receipt longer than the
  room scrolls under the printer.
- **Undo**: for ten seconds after the day's last Next, a capsule over the strip brings that letter
  back. (The old end of the day kept "Bring back the last letter" in her letter's ⋯ all day.)
- **A desk that opens already done** shows the page at once; one finished in front of the reader
  lets the last card leave first (0.3 s).
- **Bedtime's bar** counts the one streak, so it reads "{n} days in a row", not "goodnights".
  Today already counts, so before Lights out it shows the days up to yesterday and "tonight
  makes n".

## Open points

1. **The schedule of the small thing** (section 3) is the proposal of 2026-11-11, built as
   proposed; the owner has not confirmed it. It is one function (`chooseThing`).
2. **After three skipped bedtimes**, how F6 comes back (built: offered again after seven days).
3. **F6's colours in Classic** (built: cream, then night blue; the prototype's lavender only in
   the Lavender theme).
4. **A thin day** (fewer than fifteen dealt) still ends on these pages with its real count
   (built so); a day with nothing dealt does not.
5. **Her sleep-talk for a fact** is the fact itself between ellipses. The prototype has a second,
   murmured wording per fact; that would be sixty more lines in nine languages.
6. **Which release** (proposed: with the planet, after 1.0.9).
7. The finished days and the reading times live on this phone only. A second phone, or a
   reinstall, starts them again.
8. **Undo lasts ten seconds** on these pages (see above). Say if the day-long way back is wanted.
9. **The facts' scope** (the post and stamps, letters and writers, paper and ink, birds): the
   owner asked about it on 2026-11-11 and has not answered yet. They are text in the bundle, so
   more can go out over the air; a number, once given, never changes its fact.
10. **Nine languages**: only English is written. The other eight (the pages' words and the sixty
    facts) wait for the owner's go-ahead: it is the costly step.

## Verified, and not

- Verified without a build: the rules and the words (four test files, all passing), TypeScript
  (`tsc --noEmit`), the portable Swift layer and the whole module with its adapters
  (type-checked), and stills of every page and state in four themes, on a 6.1-inch and an
  iPhone SE height, with the longest words and for a courier who can't play.
- Not verified (needs a dev build on a simulator, then a phone): every motion (the shutter, the
  envelope into the slot, the paper's feed and tear, the seed, the hearts, the z's, the pop of
  the card), touch (the cord's pull, the long press to share, the scroll under the printer),
  the share sheet and the picture it shares, VoiceOver's reading order, Dynamic Type (a still
  takes the default size), the swap from the desk to the page and back with Undo, the record
  surviving a relaunch, and the tab bar's room under the strip.

## Progress

- 2026-11-11 — spec written.
- 2026-11-11 — rules, the one streak, the switch (b6d2b2a); the three pages in SwiftUI
  (0933327); Today's side: the timer, the hook, the host, the route, the English words, the dev
  page (da7f335); sixty facts in English, each checked; the check sheets; this file brought up
  to date. **English only; nothing on a device yet.**
- Next: the owner's answers (the schedule, the facts' scope), then nine languages (two
  workflows of eight: a native writer a language, then a native editor who reads only the
  result), then a dev build — **ask the owner before building**.
