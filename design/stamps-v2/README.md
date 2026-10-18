# Stamps v2: the drawings

The 36 stamps the owner approved on 2026-10-18, one SVG per stamp: `<id>.svg`, with ids exactly as in `src/data/stamps.ts`. `motifs.json` says what each one shows and why. `_template-100x120.svg` is the master to draw on. `golden.json` holds the frame's goldens for the Swift side (see the end of this file).

A file holds only the motif. Code draws everything else (`src/lib/stamp-frame.ts`): the paper and its perforation, the window, the field colour (each stamp's fixed hex), the series ground, the keyline, the tilt and the postmark.

## The rules in plain words

- **The box.** Draw on 100 × 120 units (`viewBox="0 0 100 120"`). The printed window is x 10–90, y 10–110 (80 × 100, exactly 4:5); anything outside it is cut off.
- **Safe area.** Every mark stays inside x 18–82, y 18–102, stroke width included.
- **Key shape.** The biggest shape sits in the motif box: the 62u square centred at (50, 58), x 19–81, y 27–89.
- **Colour.** Only white, `#FFFFFF`. No other colour, gradient, shadow, opacity (except the soft layer's 0.55), mask, filter, transform, dash or text.
- **One weight.** Every line is 4.31 wide with round caps and round joins. A mark is either a fill or a stroke, never both. An open line needs `fill="none"`.
- **Main shapes are solid white.** A heart, moon, leaf or flag is a white fill.
- **Space.** In `art`, use 1 to 9 separate marks with at least 3u between them. No fill may be narrower than 5u across.
- **Numbers.** At most 2 decimals. The importer rewrites longer numbers, with a warning.

## The layer contract

Inside the root `<svg>`, only these groups are allowed:

| Layer | Required | Holds | Drawn |
|---|---|---|---|
| `<g id="art">` | yes | The drawing, in white. | From S (25pt wide) up, clipped to the window, on top. |
| `<g id="soft" opacity="0.55">` | no | The second plate. Code tints it `mix(hex, #FFFFFF, 0.55)`. | From S up, under the art. At S, soft marks under 10u are left out. |
| `<g id="xs">` | yes | The 20×24 cut: 1 or 2 bold white marks. Each line is at least 8u long, each fill at least 8u wide and tall, with at least 6u between the two marks. | XS only, alone, over the whole stamp (XS has no paper). |
| `<g id="guides">` | no | The template's reference layer. | Never. It is removed on import. |

Inside a layer, use plain shapes only: `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`.

The importer accepts what drawing tools commonly write, and warns:
- paint set on a group;
- a nested `<g>`;
- `style=""`;
- Figma's frame wrapper;
- `art_1`-style names;
- Illustrator's `data-name`;
- Inkscape's `inkscape:label`.

## Import

```
node scripts/import-stamp-art.mjs           # check every file, write src/data/stamp-art-v2.ts
node scripts/import-stamp-art.mjs --check   # exit 1 if stamp-art-v2.ts is out of date
```

The importer runs the stamp checker's rules (`.claude/stamp-design/tools/check.mjs`), with the same names and the same numbers. It prints a report per file.

- **Rejected file.** An error rejects the file. It is written with no marks, and the app draws the template in that stamp's colour.
- **Missing file.** A missing file is reported and never stops the run.
- **Warnings.** Warnings never reject a file. The final set has 72 warnings, accepted by the lead: the riso halo on the soft layer touches the white and is key-shape sized.

The output is `STAMP_ART_V2` in `src/data/stamp-art-v2.ts`:
- each stamp gets `{ art, soft, xs }`;
- each is a list of `{ d, kind: "fill" | "stroke" }` in box units;
- soft paths that are left out at S carry `dropAtS: true`.

`src/data/stamp-art.ts` (the old 64-grid set) is not touched.

## golden.json

`golden.json` holds the perforated silhouette of every tier as a path string, plus the tier boundaries, sample tilts and sample colours. These are exactly what `src/lib/stamp-frame.ts` produces. `src/lib/stamp-frame.test.ts` checks them:

```
node --experimental-strip-types src/lib/stamp-frame.test.ts
```

Swift's `KStampShape` must produce the same strings.
