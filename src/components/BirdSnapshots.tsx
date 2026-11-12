import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { WrenBird } from "./WrenBird";
import { FaceSnapshots } from "./FaceSnapshots";
import { useWrenAccessory, useWrenSkin } from "../lib/wren-skin";
import { useWrenStage } from "../lib/wren-stage";
import {
  BIRD_POSES,
  birdImagesVersion,
  birdLookStamp,
  birdNeedsCapture,
  birdVariant,
  parseBirdVariant,
  poseLook,
  setBirdLook,
  settleBirdCapture,
  subscribeBirdImages,
  wantedBirdVariants,
  type BirdPose,
} from "../lib/bird-images";

/* HER, RENDERED FOR THE LOCK SCREEN — AND FOR SWIFT.
   ────────────────────────────────────────────────────────────────────────
   A Live Activity can't run our SVG, and neither can SwiftUI, so both are
   handed a picture. The picture is captured from the real WrenBird — her
   stage, the read that shaped her, the shell's mark, the look and the
   piece she has on, greying when she's starving — so the bird outside
   React Native is the one on the desk, never a stock one.

   Two kinds of capture, one offscreen strip:
   - `snapshotBird(pose)` (Live Activities): the five base poses sit
     mounted the whole time and are written to a temp file on demand.
   - lib/bird-images (Swift screens): useBirdImage(pose, {wilt}) asks for
     a variant; it is mounted here while asked for, captured, and
     recaptured one frame after her look changes or when iOS has purged
     the file. Pose sizes, moods and pins live in lib/bird-images.

   FaceSnapshots (legacy SVG faces and glyphs for Swift) lives in the same
   offscreen strip, so the root layout mounts one component for both.

   Sizes are in points; the file comes out at the screen's scale, which is
   why lib/activities names it @3x — the island refuses anything larger
   than the point size it asked for — and why Swift always frames it. */

export type { BirdPose } from "../lib/bird-images";

const BASE = (Object.keys(BIRD_POSES) as BirdPose[]).filter((p) => BIRD_POSES[p].base);

const refs: Partial<Record<string, View | null>> = {};
let ready = false;
const waiting: (() => void)[] = [];

/* HOW A PICTURE IS TAKEN (2026-11-13). renderInContext draws the bird's layers straight into the
   file. view-shot's default (drawViewHierarchyInRect, afterScreenUpdates: YES) makes the whole
   window redraw first, in the middle of whatever is moving: the letter composer, opened in the
   first seconds after a launch, shook on its way up while its Wren's faces were taken. Checked on
   every pose (dev/bird-capture), drawn long before and freshly mounted: the same pixels both ways,
   and the file is now tagged sRGB, which is what the numbers in it are (the old way tagged the same
   numbers Display P3, so Swift drew her a shade too vivid). */
const SHOT = { format: "png", quality: 1, result: "tmpfile", useRenderInContext: true } as const;

/* the view has re-rendered with the new look; give it two frames to draw */
const settle = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))));
/** after a failed capture, wait this long before the next round (as FaceShot does) */
const RETRY_MS = 400;

/** Capture a pose to a fresh temp PNG (Live Activities). Base poses are always mounted; any other pose only while a screen shows it. null if the strip isn't mounted after 4s or the capture fails. */
export async function snapshotBird(pose: BirdPose): Promise<string | null> {
  /* mounted in the root layout; if it somehow isn't, give up rather than
     hold a letter's send on a picture */
  if (!ready) await Promise.race([new Promise<void>((r) => waiting.push(r)), new Promise<void>((r) => setTimeout(r, 4000))]);
  const v = refs[birdVariant(pose)];
  if (!v) return null;
  try {
    return await captureRef(v, SHOT);
  } catch {
    return null;
  }
}

export function BirdSnapshots() {
  const skin = useWrenSkin();
  const accessory = useWrenAccessory();
  const { stage, form, mark } = useWrenStage();
  useSyncExternalStore(subscribeBirdImages, birdImagesVersion, birdImagesVersion);

  // publish her look after it has been committed to the views below
  useEffect(() => {
    setBirdLook({ skin, accessory, stage, mark, form });
  }, [skin, accessory, stage, mark, form]);

  const variants = Array.from(new Set([...BASE.map((p) => birdVariant(p)), ...wantedBirdVariants()]));

  // base poses laid out → snapshotBird may capture
  const [laid, setLaid] = useState(0);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (laid >= BASE.length && !ready) {
      ready = true;
      while (waiting.length) waiting.shift()?.();
    }
  }, [laid]);

  /* capture whatever a Swift screen is showing that is missing or out of date.
     The effect is keyed on `todo`, which doesn't change when a capture fails
     (the variant still needs one) or when her look moves while the last
     capture is in flight (it records the old look; the variant was already
     in todo) — so the loop itself checks after each round and goes again.
     Bounded by `rounds`, and birdNeedsCapture turns false after
     MAX_FAILURES on one look, so a broken view can't spin it. */
  const capturing = useRef(false);
  const again = useRef(false);
  const todo = wantedBirdVariants().filter(birdNeedsCapture).join(",");
  useEffect(() => {
    if (!todo) return;
    const run = async () => {
      if (capturing.current) {
        again.current = true;
        return;
      }
      capturing.current = true;
      let rounds = 0;
      let failed = false;
      try {
        do {
          if (failed) await new Promise<void>((r) => setTimeout(r, RETRY_MS));
          failed = false;
          again.current = false; // after the wait: a request that came in during it is served by this round
          const stamp = birdLookStamp();
          await settle();
          for (const v of wantedBirdVariants()) {
            // her look moved while we waited: its views may not have drawn it yet
            if (birdLookStamp() !== stamp) {
              again.current = true;
              break;
            }
            if (!birdNeedsCapture(v)) continue;
            const view = refs[v];
            if (!view) {
              again.current = true; // mounted on the next render
              continue;
            }
            const look = poseLook(parseBirdVariant(v).pose);
            let uri: string | null = null;
            try {
              uri = await captureRef(view, SHOT);
            } catch {
              uri = null;
            }
            settleBirdCapture(v, look, uri);
            if (!uri) failed = true;
          }
          // a failure (retried until MAX_FAILURES), or her look moved during the last capture: go again
          if (birdLookStamp() !== stamp || wantedBirdVariants().some(birdNeedsCapture)) again.current = true;
          // bounded: a view that never mounts must not keep this loop spinning (the next look or request restarts it)
        } while (again.current && ++rounds < 8);
      } finally {
        capturing.current = false;
      }
    };
    void run();
  }, [todo]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: -4000, top: 0 }}>
      {variants.map((v) => {
        const { pose, wilt } = parseBirdVariant(v);
        const p = BIRD_POSES[pose];
        return (
          <View
            key={v}
            collapsable={false}
            ref={(el) => {
              refs[v] = el;
            }}
            onLayout={() => {
              if (p.base && !wilt && !seen.current.has(v)) {
                seen.current.add(v);
                setLaid((n) => n + 1);
              }
            }}
            style={{ width: p.size, height: p.size }}
          >
            <WrenBird
              size={p.size}
              mood={p.mood}
              pose={p.fly ? "fly" : "perch"}
              letter={p.letter}
              stage={p.stage}
              skin={p.skin}
              accessory={p.accessory}
              mark={p.mark}
              wilt={wilt}
            />
          </View>
        );
      })}
      <FaceSnapshots />
    </View>
  );
}
