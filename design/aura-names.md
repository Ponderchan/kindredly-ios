# Writing aura · the 50 names

Fifty result names for the writing aura, replacing both the twelve poetic
archetypes and the fifty portrait-library names. Every name is
**adjective + noun**, and both halves are *earned* from the nine dimensions:

- the **noun** comes from what you write about and how you build a letter
  (vocabulary, structure, perspective, function words, quirks) — 5 dimensions
  × 2 poles = 10 nouns
- the **adjective** comes from how it sounds (sentence, rhythm, emotion,
  punctuation) collapsed to 4 tones, plus one counted fact (night writing)
  = 5 adjectives

10 × 5 = 50. Fifteen words to translate, not fifty phrases. Ten scenes to
draw, each in five treatments — or fifty unique pieces; the grid works
either way.

## The grid

|                 | Quiet | Unfiltered | Quick | Slow | Late-night |
|-----------------|-------|------------|-------|------|------------|
| **Observer**    | Quiet Observer    | Unfiltered Observer    | Quick Observer    | Slow Observer    | Late-night Observer    |
| **Dreamer**     | Quiet Dreamer     | Unfiltered Dreamer     | Quick Dreamer     | Slow Dreamer     | Late-night Dreamer     |
| **Storyteller** | Quiet Storyteller | Unfiltered Storyteller | Quick Storyteller | Slow Storyteller | Late-night Storyteller |
| **Minimalist**  | Quiet Minimalist  | Unfiltered Minimalist  | Quick Minimalist  | Slow Minimalist  | Late-night Minimalist  |
| **Reporter**    | Quiet Reporter    | Unfiltered Reporter    | Quick Reporter    | Slow Reporter    | Late-night Reporter    |
| **Diarist**     | Quiet Diarist     | Unfiltered Diarist     | Quick Diarist     | Slow Diarist     | Late-night Diarist     |
| **Overthinker** | Quiet Overthinker | Unfiltered Overthinker | Quick Overthinker | Slow Overthinker | Late-night Overthinker |
| **Truth-teller**| Quiet Truth-teller| Unfiltered Truth-teller| Quick Truth-teller| Slow Truth-teller| Late-night Truth-teller|
| **Original**    | Quiet Original    | Unfiltered Original    | Quick Original    | Slow Original    | Late-night Original    |
| **Classic**     | Quiet Classic     | Unfiltered Classic     | Quick Classic     | Slow Classic     | Late-night Classic     |

## What earns each word

### Nouns — what you write about, how you build

| noun | dimension · pole | the behaviour | scene cue for illustration |
|---|---|---|---|
| Observer | vocabulary · concrete | everyday, specific words; you name things you can see | at a window with a notebook, something small on the sill |
| Dreamer | vocabulary · abstract | big words, ideas over objects | on the floor looking at the ceiling, headphones on |
| Storyteller | structure · detail→feeling | you start with a scene and arrive at a feeling | on a train, one hand mid-gesture, telling it |
| Minimalist | structure · one-track | one thought per letter, no detours | one desk, one lamp, one sheet |
| Reporter | perspective · outward | you write about the world outside you (they / there / it) | rooftop or street, looking out, phone or pad up |
| Diarist | perspective · inward | you write from the inside; "I" leads | in bed with a journal, door closed |
| Overthinker | function words · hedged | maybe, but, I think — you qualify before you commit | surrounded by crossed-out drafts, pen in mouth |
| Truth-teller | function words · firm | no hedging; you commit to the sentence | at a table, the letter pushed across to someone |
| Original | quirks · distinctive | recurring tics of your own: repeated phrasings, made-up words | a wall of stickers and cut-outs, collage |
| Classic | quirks · conventional | clean, conventional prose; no tics (yet) | fountain pen or typewriter, a proper desk |

### Adjectives — how it sounds

| adjective | from | the behaviour | treatment cue |
|---|---|---|---|
| Quiet | emotion low **or** punctuation sparse | feeling kept under the words | muted lavender, soft daylight, nothing moves |
| Unfiltered | emotion high **or** punctuation dense | feelings said outright; exclamation marks, emoji | saturated pen blue + coral, motion, a spill of marks |
| Quick | sentence short **or** rhythm bursty | short lines, bursty pace | morning light, speed lines, things half-finished |
| Slow | sentence long **or** rhythm steady | long lines, one steady pace | long afternoon shadows, a cup gone cold |
| Late-night | counted: over half your letters left after 22:00 | you write at night | dark blue, one lamp, a moon in the window |

## Assignment rule (engine)

- The name is given only at **formed** (nine locked, ten pieces), as today.
  Before that the stickers carry the progress.
- **Noun**: among the five content dimensions, the one with the largest
  distance from the centre (|score − 50|); the pole is which side of 50.
- **Adjective**: if night share > 0.5 → *Late-night* (overrides tone).
  Otherwise, among sentence / rhythm / emotion / punctuation, the largest
  distance from centre, mapped: emotion low or punctuation low → *Quiet*;
  emotion high or punctuation high → *Unfiltered*; sentence low or rhythm
  high → *Quick*; sentence high or rhythm low → *Slow*.
- **Stability**: recompute only when a dimension newly locks or at the
  monthly reading, so the name never flickers between letters. A change
  is announced with the existing line ("… started calling you something new").
- ids are `{adjective}-{noun}`: `quiet-observer`, `late-night-diarist`, …

## The fifty, numbered (for asset filenames)

| # | id | name |
|---|---|---|
| 01 | quiet-observer | Quiet Observer |
| 02 | unfiltered-observer | Unfiltered Observer |
| 03 | quick-observer | Quick Observer |
| 04 | slow-observer | Slow Observer |
| 05 | late-night-observer | Late-night Observer |
| 06 | quiet-dreamer | Quiet Dreamer |
| 07 | unfiltered-dreamer | Unfiltered Dreamer |
| 08 | quick-dreamer | Quick Dreamer |
| 09 | slow-dreamer | Slow Dreamer |
| 10 | late-night-dreamer | Late-night Dreamer |
| 11 | quiet-storyteller | Quiet Storyteller |
| 12 | unfiltered-storyteller | Unfiltered Storyteller |
| 13 | quick-storyteller | Quick Storyteller |
| 14 | slow-storyteller | Slow Storyteller |
| 15 | late-night-storyteller | Late-night Storyteller |
| 16 | quiet-minimalist | Quiet Minimalist |
| 17 | unfiltered-minimalist | Unfiltered Minimalist |
| 18 | quick-minimalist | Quick Minimalist |
| 19 | slow-minimalist | Slow Minimalist |
| 20 | late-night-minimalist | Late-night Minimalist |
| 21 | quiet-reporter | Quiet Reporter |
| 22 | unfiltered-reporter | Unfiltered Reporter |
| 23 | quick-reporter | Quick Reporter |
| 24 | slow-reporter | Slow Reporter |
| 25 | late-night-reporter | Late-night Reporter |
| 26 | quiet-diarist | Quiet Diarist |
| 27 | unfiltered-diarist | Unfiltered Diarist |
| 28 | quick-diarist | Quick Diarist |
| 29 | slow-diarist | Slow Diarist |
| 30 | late-night-diarist | Late-night Diarist |
| 31 | quiet-overthinker | Quiet Overthinker |
| 32 | unfiltered-overthinker | Unfiltered Overthinker |
| 33 | quick-overthinker | Quick Overthinker |
| 34 | slow-overthinker | Slow Overthinker |
| 35 | late-night-overthinker | Late-night Overthinker |
| 36 | quiet-truth-teller | Quiet Truth-teller |
| 37 | unfiltered-truth-teller | Unfiltered Truth-teller |
| 38 | quick-truth-teller | Quick Truth-teller |
| 39 | slow-truth-teller | Slow Truth-teller |
| 40 | late-night-truth-teller | Late-night Truth-teller |
| 41 | quiet-original | Quiet Original |
| 42 | unfiltered-original | Unfiltered Original |
| 43 | quick-original | Quick Original |
| 44 | slow-original | Slow Original |
| 45 | late-night-original | Late-night Original |
| 46 | quiet-classic | Quiet Classic |
| 47 | unfiltered-classic | Unfiltered Classic |
| 48 | quick-classic | Quick Classic |
| 49 | slow-classic | Slow Classic |
| 50 | late-night-classic | Late-night Classic |

## What this retires

- the twelve poetic archetypes (`ARCHETYPES` in hatch-engine, `arch.*` strings)
- the fifty portrait-library names (`aura-avatar-lib.ts` `name` field); the
  portraits themselves move to onboarding as the user's chosen face
- the hash-based portrait pick — a name is now derived, never rolled
