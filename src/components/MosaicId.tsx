import { View } from "react-native";
import { hashStr } from "../lib/format";
import { P } from "../theme/post";

/* A stranger's face, redacted. The generative "seal" avatar carries its own
   palette, which lands as a stray colour blob in a page made only of black
   rules and mono type — so in the postal system the identity is a literal
   mosaic instead: a small grid of inked cells, deterministic from the author's
   id, mirrored down the middle so it reads as a face you can't resolve.

   Same job as StrangerAvatar (stable, anonymous, recognisable across letters),
   but built from the only two things this system owns: squares and ink. */

export function MosaicId({ seed, cell = 5, gap = 1.5 }: { seed: string; cell?: number; gap?: number }) {
  const h = hashStr("mosaic:" + String(seed || "anon"));
  const cols = 5;
  const rows = 5;
  const half = Math.ceil(cols / 2); // 3 — the right half mirrors the left

  // one bit per cell of the left half + centre column
  const on = (r: number, c: number) => {
    const i = r * half + Math.min(c, cols - 1 - c);
    return ((h >>> i % 31) & 1) === 1;
  };

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
                backgroundColor: on(r, c) ? P.ink : "transparent",
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
