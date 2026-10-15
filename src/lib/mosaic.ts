/* ═══════════════════════════════════════════════════════════════════════
   FACE v1 — the formation spec. THIS IS A CONTRACT, NOT A STYLE.
   ═══════════════════════════════════════════════════════════════════════
   People recognise their correspondents by these faces the way they'd
   recognise handwriting. Change the hash, the namespace strings, the bit
   mapping or the density rule and every remembered face in the product
   is a stranger again — so v1 is frozen as of 2026-08-24 (pre-launch,
   zero real users: the last cheap moment to freeze it).

   ONE IMPLEMENTATION, TWO RENDERERS (step 5, 2026-10-16). The maths used
   to live inside the MosaicId component, so a SwiftUI face would have had
   to copy it — and a copy is how the same person drifts into two faces.
   It lives here now, pure and import-free so plain node can lock it
   (node src/lib/mosaic.test.ts). React Native's MosaicId draws from
   these functions; Swift's KMosaic receives the 25-bit mask from
   mosaicMask() and draws exactly those cells. Nothing else may decide
   which squares a face inks.

   THE ROOT · everything derives from one 32-bit FNV-1a (hashStr, below;
   lib/format re-exports it for its older callers), fanned out through
   NAMESPACED sub-seeds so channels never interfere. The registry of every
   derived channel in the product:

     "mosaic:"+uid          → which cells this face inks   (inkedCells)
     seed+"#w:"+i           → the density rule's flip order (inkedCells)
     seed+"@"+r+","+c       → the order the face develops  (visibleCells)
     seed+"@drift"          → orbit drift speed/direction  (OrbitMap)
     "post:"+uid            → No. 1000–9999               (format.postNo)
     "av:"+seed             → legacy glyph avatar          (format.avatarFor)
     "aura-av:"+uid+":"+dim → the portrait first offered  (aura-avatar-lib)

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
   asymmetric and only settles into symmetry when it completes.

   THE MASK · bit (r * 5 + c) is set when row r, column c is inked and
   has come through; r and c run 0..4 from the top left. 25 bits, so it
   is always a small positive integer. No real face can ink more than 16
   cells, so the all-25 VEIL_MASK can never be mistaken for a person. */

export const COLS = 5;
export const ROWS = 5;
const HALF = Math.ceil(COLS / 2); // 3 — the right half mirrors the left
const MIN_INK = 8; // every face substantial…
const MAX_INK = 16; // …none a solid block

/** Letters each way before names may be traded; a face is complete at this many of THEIR letters. */
export const EACH_WAY = 5;

/** Every one of the 25 cells — the veil's mask (a deleted account). Never a real face: those ink 8..16. */
export const VEIL_MASK = (1 << (ROWS * COLS)) - 1;

/* A HASH THAT CANNOT CRASH A SCREEN. Every caller feeds this an id, and
   since 0009 an id can be null: a correspondent who deletes their account
   leaves their side of the thread empty rather than taking the letters with
   them. OrbitMap read `t.other` straight into here and the whole Kindreds
   tab died on `null.length` — a red box in dev, an abort in Release. The
   seed for a deterministic placement is not worth a crash. */
/** 32-bit FNV-1a of a string, unsigned; 0 for an empty or missing string. FACE v1's root — never change it. */
export function hashStr(s: string | null | undefined): number {
  if (!s) return 0;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** "r,c" for a cell — the key inkedCells() and visibleCells() use. */
const cellKey = (r: number, c: number) => r + "," + c;

/** FACE v1 bit field: which of the 25 cells are inked, density-normalised,
    as a set of "r,c" keys. Exported so a ceremony can take a face apart cell
    by cell — the ritual has to move the SAME squares the reader has been
    watching arrive, not a lookalike drawn beside them. */
export function inkedCells(seed: string): Set<string> {
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
      cells.add(cellKey(p.r, p.hc));
      cells.add(cellKey(p.r, COLS - 1 - p.hc));
    }
  return cells;
}

/** The inked cells that have come through at `develop` (0..1), as "r,c" keys.
    Every inked cell is ranked by its own per-seed hash and exactly
    ceil(count × develop) of them show — an exact count, so even the faintest
    develop is never a blank plate. develop ≥ 1 shows the whole face. */
export function visibleCells(seed: string, develop = 1): Set<string> {
  const inked = inkedCells(seed);
  const d = Math.max(0, Math.min(1, develop));
  if (d >= 1) return inked;
  const ranked: { key: string; rank: number }[] = [];
  // row-major, as the face was always read, so equal ranks tie the same way
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const key = cellKey(r, c);
      if (inked.has(key)) ranked.push({ key, rank: hashStr(seed + "@" + key) });
    }
  ranked.sort((x, y) => x.rank - y.rank);
  return new Set(ranked.slice(0, Math.ceil(ranked.length * d)).map((x) => x.key));
}

/** A set of "r,c" keys as the 25-bit mask (bit r * 5 + c). */
export function cellsToMask(cells: Iterable<string>): number {
  let m = 0;
  for (const k of cells) {
    const [r, c] = k.split(",").map(Number);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) m |= 1 << (r * COLS + c);
  }
  return m;
}

/** Is cell (r, c) set in a 25-bit mask? */
export const maskHas = (mask: number, r: number, c: number): boolean => ((mask >>> (r * COLS + c)) & 1) === 1;

/** The whole face, every inked cell, as a 25-bit mask. */
export function inkedMask(seed: string): number {
  return cellsToMask(inkedCells(seed));
}

/** THE ONE MASK SWIFT DRAWS: bit (r * 5 + c) for every cell of `seed`'s face
    that has come through at `develop`. A null or empty seed is NO ONE (a
    deleted account) and gets VEIL_MASK — draw it as the veil, never as ink. */
export function mosaicMask(seed: string | null | undefined, develop = 1): number {
  if (!seed) return VEIL_MASK;
  return cellsToMask(visibleCells(seed, develop));
}

/** How far a correspondent's face has come into view: complete once names
    are traded, otherwise 0.15 plus the rest spread over THEIR first five
    letters (how much you wrote changes nothing about how well you see them). */
export function developFor(theirs: number, revealed = false): number {
  if (revealed) return 1;
  return 0.15 + 0.85 * (Math.min(Math.max(0, theirs || 0), EACH_WAY) / EACH_WAY);
}
