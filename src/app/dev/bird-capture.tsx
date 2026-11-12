import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { WrenBird } from "../../components/WrenBird";
import { BIRD_POSES, type BirdPose } from "../../lib/bird-images";
import { useTheme } from "../../lib/theme";

/* dev only — HER PICTURE, TAKEN TWO WAYS.
   kindredly:///dev/bird-capture

   BirdSnapshots took her pictures with drawViewHierarchyInRect(afterScreenUpdates: YES), which
   makes the whole window redraw in the middle of whatever is moving (the letter composer shook on
   its way up). renderInContext draws the layer tree straight into the picture without touching
   the screen. Before switching, every pose is drawn offscreen (as BirdSnapshots draws it) and
   taken both ways and the two PNGs compared; a pair that differs is logged to Metro as
   `[bird-capture] {...}` (its files, for a pixel comparison on the Mac), then a count. Nothing in a release. */

const POSES = Object.keys(BIRD_POSES) as BirdPose[];
/** every eighth pose, mounted fresh after the first pass */
const FRESH = POSES.filter((_, i) => i % 8 === 0);

export default function DevBirdCapture() {
  const { t: tk } = useTheme();
  const refs = useRef<Partial<Record<string, View | null>>>({});
  const [status, setStatus] = useState("drawing…");
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (!__DEV__) return;
    let live = true;
    const run = async () => {
      await new Promise((r) => setTimeout(r, 1500));
      let n = 0;
      let same = 0;
      for (const pose of POSES) {
        if (!live) return;
        const v = refs.current[pose];
        if (!v) continue;
        try {
          const a = await captureRef(v, { format: "png", quality: 1, result: "base64" });
          const b = await captureRef(v, { format: "png", quality: 1, result: "base64", useRenderInContext: true });
          if (a === b) same++;
          else {
            const fa = await captureRef(v, { format: "png", quality: 1, result: "tmpfile" });
            const fb = await captureRef(v, { format: "png", quality: 1, result: "tmpfile", useRenderInContext: true });
            console.log(`[bird-capture] ${JSON.stringify({ pose, a: fa, b: fb })}`);
          }
        } catch (e) {
          console.log(`[bird-capture] ${JSON.stringify({ pose, error: String((e as Error)?.message ?? e) })}`);
        }
        n++;
        if (n % 20 === 0) setStatus(`${n}/${POSES.length}`);
      }
      console.log(`[bird-capture] done: ${n} poses, ${same} identical as base64`);
      setStatus(`done ${n}, same ${same}`);
      // then as BirdSnapshots meets them: freshly mounted, taken two frames and 30 ms later
      setFresh(true);
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))));
      for (const pose of FRESH) {
        if (!live) return;
        const v = refs.current[`fresh-${pose}`];
        if (!v) {
          console.log(`[bird-capture] fresh ${JSON.stringify({ pose, error: "not mounted" })}`);
          continue;
        }
        const b = await captureRef(v, { format: "png", quality: 1, result: "tmpfile", useRenderInContext: true });
        const a = await captureRef(v, { format: "png", quality: 1, result: "tmpfile" });
        console.log(`[bird-capture] fresh ${JSON.stringify({ pose, a, b })}`);
      }
      console.log("[bird-capture] fresh done");
    };
    void run();
    return () => {
      live = false;
    };
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: tk.ink }}>{status}</Text>
      <View pointerEvents="none" style={{ position: "absolute", left: -4000, top: 0 }}>
        {POSES.map((pose) => {
          const p = BIRD_POSES[pose];
          return (
            <View
              key={pose}
              collapsable={false}
              ref={(el) => {
                refs.current[pose] = el;
              }}
              style={{ width: p.size, height: p.size }}
            >
              <WrenBird size={p.size} mood={p.mood} pose={p.fly ? "fly" : "perch"} letter={p.letter} stage={p.stage} skin={p.skin} accessory={p.accessory} mark={p.mark} wilt={pose === "content"} />
            </View>
          );
        })}
        {fresh &&
          FRESH.map((pose) => {
            const p = BIRD_POSES[pose];
            return (
              <View
                key={`fresh-${pose}`}
                collapsable={false}
                ref={(el) => {
                  refs.current[`fresh-${pose}`] = el;
                }}
                style={{ width: p.size, height: p.size }}
              >
                <WrenBird size={p.size} mood={p.mood} pose={p.fly ? "fly" : "perch"} letter={p.letter} stage={p.stage} skin={p.skin} accessory={p.accessory} mark={p.mark} />
              </View>
            );
          })}
      </View>
    </View>
  );
}
