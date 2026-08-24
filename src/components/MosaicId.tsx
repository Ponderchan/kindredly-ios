import { View } from "react-native";
import { hashStr } from "../lib/format";
import { P } from "../theme/post";

/* ═══════════════════════════════════════════════════════════════════════
   FACE v1 — the formation spec. THIS IS A CONTRACT, NOT A STYLE.
   ═══════════════════════════════════════════════════════════════════════
   People recognise their correspondents by these faces the way they'd
   recognise handwriting. Change the hash, the namespace strings, the bit
   mapping or the density rule and every remembered face in the product
   is a stranger again — so v1 is frozen as of 2026-08-24 (pre-launch,
   zero real users: the last cheap moment to freeze it).

   THE ROOT · everything derives from one 32-bit FNV-1a (lib/format
   hashStr), fanned out through NAMESPACED sub-seeds so channels never
   interfere. The registry of every derived channel in the product:

     "mosaic:"+uid          → which cells this face inks   (here)
     seed+"@"+r+","+c       → the order the face develops  (here)
     seed+"@drift"          → orbit drift speed/direction  (OrbitMap)
     "post:"+uid            → No. 1000–9999               (format.postNo)
     "av:"+seed             → legacy glyph avatar          (format.avatarFor)

   Claiming a new channel = add a new prefix, list it here. Never reuse.

   THE SHAPE · 5×5 cells, right half mirrors the left → 15 independent
   bits (h's low bits, row-major over the left half + centre column).
   Ink or nothing; the palette is the page's.

   THE DENSITY RULE · raw hash bits could deal a face 2 specks or a
   near-solid block — at develop 0.15 the sparse one would be a single
   floating dot with no presence at all. So the count of INKED CELLS is
   normalised to 8..16 (of 25): positions are ranked by the deterministic
   sub-seed "#w:"+i and flipped in rank order, faintest claims first,
   until the count is in range. Same seed, same flips, forever — the
   correction is part of the face, not a render-time accident.

   Same job as StrangerAvatar once had (stable, anonymous, recognisable
   across letters), built from the only two things this system owns:
   squares and ink. KNOWN DEBT: the web app still renders the legacy
   glyph avatars, so one stranger wears two faces across platforms —
   owner's call to migrate web to this spec.

   COMING INTO VIEW · `develop` (0..1) is how much of the face has
   arrived. A correspondent starts as a few floating specks and develops
   with every letter THEY send — you come to know someone by reading
   them, so it is received letters, never sent ones, that expose the
   plate. Mirror cells rank independently: a half-made face sits slightly
   asymmetric and only settles into symmetry when it completes. */

const COLS = 5;
const ROWS = 5;
const HALF = Math.ceil(COLS / 2); // 3 — the right half mirrors the left
const MIN_INK = 8; // every face substantial…
const MAX_INK = 16; // …none a solid block

/** FACE v1 bit field: which of the 25 cells are inked, density-normalised. */
function inkedCells(seed: string): Set<string> {
  const h = hashStr("mosaic:" + String(seed || "anon"));
  // 15 independent positions: [row 0..4] × [left-half col 0..2]
  const bit = (r: number, hc: number) => ((h >>> (r * HALF + hc)) & 1) === 1;
  const pos: { r: number; hc: number; on: boolean; w: number }[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let hc = 0; hc < HALF; hc++)
      pos.push({ r, hc, on: bit(r, hc), w: hashStr(seed + "#w:" + (r * HALF + hc)) });

  const cellsOf = (p: { hc: number }) => (p.hc === HALF - 1 ? 1 : 2); // centre column has no mirror
  let ink = pos.reduce((n, p) => n + (p.on ? cellsOf(p) : 0), 0);

  // flip in deterministic rank order until the count lands in range
  if (ink < MIN_INK) {
    for (const p of pos.filter((p) => !p.on).sort((a, b) => a.w - b.w)) {
      p.on = true;
      ink += cellsOf(p);
      if (ink >= MIN_INK) break;
    }
  } else if (ink > MAX_INK) {
    for (const p of pos.filter((p) => p.on).sort((a, b) => a.w - b.w)) {
      p.on = false;
      ink -= cellsOf(p);
      if (ink <= MAX_INK) break;
    }
  }

  const cells = new Set<string>();
  for (const p of pos)
    if (p.on) {
      cells.add(p.r + "," + p.hc);
      cells.add(p.r + "," + (COLS - 1 - p.hc));
    }
  return cells;
}

export function MosaicId({
  seed,
  cell = 5,
  gap = 1.5,
  develop = 1,
}: {
  seed: string;
  cell?: number;
  gap?: number;
  develop?: number;
}) {
  const cols = COLS;
  const rows = ROWS;
  const inked = inkedCells(seed);
  const on = (r: number, c: number) => inked.has(r + "," + c);

  // Which inked cells have come through: rank every ON cell by a per-seed
  // hash and show exactly ceil(share) of them — an exact count, so even the
  // faintest develop is never a blank plate.
  const d = Math.max(0, Math.min(1, develop));
  const visible = new Set<string>();
  if (d >= 1) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (on(r, c)) visible.add(r + "," + c);
  } else {
    const inked: { key: string; rank: number }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (on(r, c)) inked.push({ key: r + "," + c, rank: hashStr(seed + "@" + r + "," + c) });
    inked.sort((x, y) => x.rank - y.rank);
    for (const cellOn of inked.slice(0, Math.ceil(inked.length * d))) visible.add(cellOn.key);
  }

  return (
    <View style={{ gap }}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: "row", gap }}>
          {Array.from({ length: cols }).map((_, c) => (
            <View
              key={c}
              style={{
                width: cell,
                height: cell,
                backgroundColor: visible.has(r + "," + c) ? P.ink : "transparent",
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
