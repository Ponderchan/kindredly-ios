import { View } from "react-native";
import { hashStr } from "../lib/format";
import { P } from "../theme/post";

/* A stranger's face, redacted. The generative "seal" avatar carries its own
   palette, which lands as a stray colour blob in a page made only of black
   rules and mono type — so in the postal system the identity is a literal
   mosaic instead: a small grid of inked cells, deterministic from the author's
   id, mirrored down the middle so it reads as a face you can't resolve.

   Same job as StrangerAvatar (stable, anonymous, recognisable across letters),
   but built from the only two things this system owns: squares and ink.

   COMING INTO VIEW · `develop` (0..1) is how much of the face has arrived.
   A correspondent starts as a few floating specks and develops with every
   letter THEY send — you come to know someone by reading them, so it is
   received letters, never sent ones, that expose the plate. The develop
   order is deterministic per seed (a face always develops the same way),
   and mirror cells rank independently: a half-made face sits slightly
   asymmetric and only settles into symmetry when it completes. */

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
  const h = hashStr("mosaic:" + String(seed || "anon"));
  const cols = 5;
  const rows = 5;
  const half = Math.ceil(cols / 2); // 3 — the right half mirrors the left

  // one bit per cell of the left half + centre column
  const on = (r: number, c: number) => {
    const i = r * half + Math.min(c, cols - 1 - c);
    return ((h >>> i % 31) & 1) === 1;
  };

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
