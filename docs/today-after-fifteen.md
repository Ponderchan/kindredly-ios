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

- Rules: `src/screens/today/after-fifteen.ts` (+ `.test.ts`): the page, the streak's days, the
  timer's sums, the line, the turn-taking, the receipt's totals. `src/lib/fc-rollout-core.ts`.
- Kept on the phone: `src/lib/after-fifteen-store.ts` (scoped store, one record).
- Facts: `src/data/after-facts.ts`. Words: `src/data/strings-after.ts` (nine blocks).
- The hook: `src/screens/today/useAfterFifteen.ts`; the host: `AfterFifteenNative.tsx`; the
  choice between it and the desk: `src/app/(tabs)/letters.tsx`.
- Swift: `modules/kindredly-ui/ios/Portable/Today/After/` (the three pages, the shared slot, the
  strip, the palette), adapter `Adapters/KAfterFifteenView.swift`, wrapper
  `modules/kindredly-ui/src/AfterFifteen.tsx`.
- Dev page: `kindredly:///dev/after-fifteen` (each page, each state, each kind of thing, themes).
- Checks: `design/today-after-fifteen/checks/` (render harnesses and their sheets), using
  `design/courier-planet/checks/render-fast.sh` and `typecheck-module.sh`.

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

## Progress

- 2026-11-11 — spec written; nothing built yet.
