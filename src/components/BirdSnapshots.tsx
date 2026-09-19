import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { WrenBird, type WrenMood } from "./WrenBird";

/* HER, RENDERED FOR THE LOCK SCREEN.
   ────────────────────────────────────────────────────────────────────────
   A Live Activity can't run our SVG, so it's handed a picture. The picture
   is captured from the real WrenBird — her stage, the read that shaped
   her, the shell's mark, the look and the piece she has on — so the bird
   on the lock screen is the one on the desk, never a stock one. The poses
   sit mounted off-screen the whole time (a few small SVGs), and
   `snapshotBird` writes one to a temp file on demand.

   Sizes are in points; the file comes out at the screen's scale, which is
   why lib/activities names it @3x — the island refuses anything larger
   than the point size it asked for. */

export type BirdPose = "content" | "sleepy" | "fly" | "delight" | "mini";

const POSES: { pose: BirdPose; size: number; mood: WrenMood; fly?: boolean }[] = [
  { pose: "content", size: 56, mood: "content" },
  { pose: "sleepy", size: 56, mood: "sleepy" },
  { pose: "delight", size: 56, mood: "delight" },
  { pose: "fly", size: 56, mood: "content", fly: true },
  { pose: "mini", size: 20, mood: "content" },
];

let refs: Partial<Record<BirdPose, View | null>> = {};
let ready = false;
const waiting: (() => void)[] = [];

export async function snapshotBird(pose: BirdPose): Promise<string | null> {
  /* mounted in the root layout; if it somehow isn't, give up rather than
     hold a letter's send on a picture */
  if (!ready) await Promise.race([new Promise<void>((r) => waiting.push(r)), new Promise<void>((r) => setTimeout(r, 4000))]);
  const v = refs[pose];
  if (!v) return null;
  try {
    return await captureRef(v, { format: "png", quality: 1, result: "tmpfile" });
  } catch {
    return null;
  }
}

export function BirdSnapshots() {
  const [laid, setLaid] = useState(0);
  const seen = useRef(new Set<BirdPose>());
  useEffect(() => {
    if (laid >= POSES.length && !ready) {
      ready = true;
      while (waiting.length) waiting.shift()?.();
    }
  }, [laid]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: -4000, top: 0 }}>
      {POSES.map((p) => (
        <View
          key={p.pose}
          collapsable={false}
          ref={(v) => {
            refs[p.pose] = v;
          }}
          onLayout={() => {
            if (!seen.current.has(p.pose)) {
              seen.current.add(p.pose);
              setLaid((n) => n + 1);
            }
          }}
          style={{ width: p.size, height: p.size }}
        >
          <WrenBird size={p.size} mood={p.mood} pose={p.fly ? "fly" : "perch"} />
        </View>
      ))}
    </View>
  );
}
