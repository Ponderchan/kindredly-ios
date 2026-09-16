# Writing aura · illustration brief (50 pieces)

## Size

| | spec | why |
|---|---|---|
| master canvas | **1600 × 1200 px, 4:3** | the Me card and the stickers header are 4:3 |
| safe band | keep the subject inside the **centre 1600 × 900** (16:9) | the share card crops to ~1.8:1; nothing important above y=150 or below y=1050 |
| pixel grid | drawn on a **160 × 120 grid, 10 px blocks** | crisp pixel art; the app ships a 5× nearest-neighbour upscale (800 × 600), plenty for 3× screens |
| palette | ≤ 16 colours per piece, no gradients, no anti-aliasing | keeps the PNGs at a few KB each; 50 pieces ≈ under 1 MB total |
| format | PNG, transparent background **off** — paint the ground | the card shows the ground |
| filename | `{##}-{id}.png`, e.g. `01-quiet-observer.png` | ids from aura-names.md |

Only the **formed** state needs drawing. The earlier states (sketch while
forming / shaping / clearing) are derived at build time from the finished
piece — ink-outline extraction for the sketch, coarse blocks for the
mosaic — so it is 50 images, not 100 or 150.

## Constants across all 50

- **Ground**: lavender `#ECECFE` (the app's paper-wash). Interior walls
  `#F4F3FF`, floor `#DEDBF7`.
- **Ink**: `#111113` for the few outlines that exist (furniture edges, the
  bird's eye). Most shapes are flat fills with no outline.
- **Pen blue** `#3A3AF5` and **sky** `#5757EC`: the character's top, the
  letter's stamp, the bird. **Paper** `#FFFFFF` for every sheet.
- Accents, used sparingly: coral `#F2887E`, moss `#6DAE78`, mist `#A9C6F2`,
  brass `#9A7433`.
- **One character**, the same in every piece: neutral, short dark hair
  `#1E1B33`, blue top, seen at eye level from a slight three-quarter angle.
  Never a face in detail — two pixel eyes at most.
- **The courier is in every scene**: a small flat blue bird (round body,
  cream belly, tiny orange beak), perched somewhere natural — the desk, the
  sill, the headboard.
- There is **always paper in the scene** — a letter, a notebook, a sheet.
- **No text, no letters, no numbers, no logos, no UI, no speech bubbles.**

## Prompt template

Fill the two slots from aura-names.md: `{SCENE}` from the noun row,
`{TREATMENT}` from the adjective column.

```
Flat pixel-art illustration, 160x120 pixel grid rendered at 1600x1200, 10px square blocks, no anti-aliasing, no gradients, no outlines except thin ink edges on furniture. Limited palette of at most 16 colours: lavender ground #ECECFE, paper white #FFFFFF, ink #111113, pen blue #3A3AF5, sky blue #5757EC, mist #A9C6F2, coral #F2887E, moss green #6DAE78, brass #9A7433.

Scene: {SCENE}. One person, gender-neutral, short dark hair, plain blue top, seen at eye level from a slight three-quarter angle, face reduced to two pixel eyes. A sheet of paper or a notebook is always present. A small flat blue bird with a cream belly and a tiny orange beak perches somewhere natural in the scene.

Mood and light: {TREATMENT}.

Composition: subject centred, all important elements inside the middle 16:9 band of the 4:3 canvas, generous quiet space around the subject, nothing touching the edges. Calm, warm, slightly lonely, like a good indie game's resting frame.

No text, no letters, no numbers, no logos, no UI, no speech bubbles, no photorealism, no 3D, no outlines around the character, no black background.
```

Aspect flag where the tool needs one: `--ar 4:3`.

### `{SCENE}` by noun

| noun | SCENE |
|---|---|
| Observer | a person at a window with a small notebook, something tiny on the sill — a cup, a leaf, a snail — being looked at closely |
| Dreamer | a person lying on the floor looking up at the ceiling, headphones on, a notebook open on their chest, a plant in the corner |
| Storyteller | a person on a train seat by the window, one hand mid-gesture as if telling something, a notebook on the knee, scenery passing |
| Minimalist | a bare room: one desk, one lamp, one chair, one sheet of paper, the person sitting very straight |
| Reporter | a person on a rooftop or a street corner looking outward at the city, holding a small pad, the world bigger than them |
| Diarist | a person in bed under a blanket writing in a journal, the door closed, a bedside lamp |
| Overthinker | a person at a desk surrounded by crumpled and crossed-out drafts, pen held in the mouth, one clean sheet still empty |
| Truth-teller | two chairs at a kitchen table, the person has just pushed a letter across to the empty chair, hands flat on the table |
| Original | a person at a desk in front of a wall covered in stickers, cut-outs and pinned scraps, a collage in progress |
| Classic | a proper wooden desk with a fountain pen or a typewriter, a neat stack of envelopes, the person writing with good posture |

### `{TREATMENT}` by adjective

| adjective | TREATMENT |
|---|---|
| Quiet | muted lavender and mist tones, soft even daylight, nothing in motion, very few objects, stillness |
| Unfiltered | saturated pen blue with coral accents, energetic, a spill of marks on the paper, an exclamation of colour, things slightly knocked over |
| Quick | bright morning light, a few pixel speed lines, half-finished objects, a cup still steaming, the sense of hurry |
| Slow | long late-afternoon shadows in warm brass and lavender, a cup gone cold, dust in the light, unhurried |
| Late-night | deep night blue ground #2B2A4A instead of lavender, one warm lamp as the only light, a moon in the window, everything else dim |

## Two filled examples

**01 · Quiet Observer**

```
Flat pixel-art illustration, 160x120 pixel grid rendered at 1600x1200, 10px square blocks, no anti-aliasing, no gradients, no outlines except thin ink edges on furniture. Limited palette of at most 16 colours: lavender ground #ECECFE, paper white #FFFFFF, ink #111113, pen blue #3A3AF5, sky blue #5757EC, mist #A9C6F2, coral #F2887E, moss green #6DAE78, brass #9A7433.

Scene: a person at a window with a small notebook, something tiny on the sill — a cup, a leaf, a snail — being looked at closely. One person, gender-neutral, short dark hair, plain blue top, seen at eye level from a slight three-quarter angle, face reduced to two pixel eyes. A sheet of paper or a notebook is always present. A small flat blue bird with a cream belly and a tiny orange beak perches somewhere natural in the scene.

Mood and light: muted lavender and mist tones, soft even daylight, nothing in motion, very few objects, stillness.

Composition: subject centred, all important elements inside the middle 16:9 band of the 4:3 canvas, generous quiet space around the subject, nothing touching the edges. Calm, warm, slightly lonely, like a good indie game's resting frame.

No text, no letters, no numbers, no logos, no UI, no speech bubbles, no photorealism, no 3D, no outlines around the character, no black background.
```

**35 · Late-night Overthinker**

```
Flat pixel-art illustration, 160x120 pixel grid rendered at 1600x1200, 10px square blocks, no anti-aliasing, no gradients, no outlines except thin ink edges on furniture. Limited palette of at most 16 colours: night blue ground #2B2A4A, paper white #FFFFFF, ink #111113, pen blue #3A3AF5, sky blue #5757EC, mist #A9C6F2, coral #F2887E, moss green #6DAE78, brass #9A7433.

Scene: a person at a desk surrounded by crumpled and crossed-out drafts, pen held in the mouth, one clean sheet still empty. One person, gender-neutral, short dark hair, plain blue top, seen at eye level from a slight three-quarter angle, face reduced to two pixel eyes. A sheet of paper or a notebook is always present. A small flat blue bird with a cream belly and a tiny orange beak perches somewhere natural in the scene.

Mood and light: deep night blue ground instead of lavender, one warm lamp as the only light, a moon in the window, everything else dim.

Composition: subject centred, all important elements inside the middle 16:9 band of the 4:3 canvas, generous quiet space around the subject, nothing touching the edges. Calm, warm, slightly lonely, like a good indie game's resting frame.

No text, no letters, no numbers, no logos, no UI, no speech bubbles, no photorealism, no 3D, no outlines around the character, no black background.
```

## Checking a piece before you keep it

1. Does it survive a centre 16:9 crop with nothing important lost?
2. Downscale to 160 × 120 with nearest-neighbour, then back up 10×: does it
   still read? If it turns to mush, the generator cheated on the grid —
   regenerate rather than keep.
3. Is the bird there? Is there paper? Is the character's top blue?
4. No text anywhere, including on the paper.
