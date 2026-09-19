/* THE CHICK, IN PARTS.
   WrenBird draws her as one symbol. This draws the same symbol in layers —
   tail, wings, body, belly, face, each leg — so she can move a part of
   herself: lift a foot, dip for a seed, flap, shake her head. What she does
   and when comes from lib/chick-motions (the nine dimensions); this only
   draws a moment of it. Her breath, hops and tilts stay on the wrapper
   outside, as before — the two don't fight because those move all of her
   and this moves pieces.

   useChickIdle runs the clock: a rest, a motion, a rest. It only ticks
   while a motion plays, so an idle chick costs nothing. */
import { useEffect, useRef, useState } from "react";
import Svg, { Ellipse, G } from "react-native-svg";
import { WREN_FAMILY, type WShape } from "./wren-family-data";
import { Birthmark, HatchEyes, Shapes, TailFeather, shapeHatchling, type WrenAccessory, type WrenMood, type WrenSkin } from "./WrenBird";
import type { HatchlingForm } from "../lib/hatchling-form";
import type { DimScore } from "../lib/hatch-engine";
import { FACE_OF_MOTION, MOTION_S, layerOf, pickMotion, poseAt, restBetween, splitSides, type Layer, type Motion } from "../lib/chick-motions";

export interface Idle {
  motion: Motion | null;
  p: number; // 0..1 through the motion
}
export const STILL: Idle = { motion: null, p: 0 };

/** what she does on her own, while `active` — driven by the read */
export function useChickIdle(dims: DimScore[] | null | undefined, active = true): Idle {
  const [idle, setIdle] = useState<Idle>(STILL);
  const last = useRef<Motion | null>(null);
  useEffect(() => {
    if (!active) {
      setIdle(STILL);
      return;
    }
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dead = false;
    const rest = () => {
      timer = setTimeout(play, restBetween() * 1000);
    };
    const play = () => {
      if (dead) return;
      const m = pickMotion(dims || [], last.current);
      last.current = m;
      const t0 = Date.now();
      const len = MOTION_S[m] * 1000;
      const tick = () => {
        if (dead) return;
        const p = (Date.now() - t0) / len;
        if (p >= 1) {
          setIdle(STILL);
          rest();
          return;
        }
        setIdle({ motion: m, p });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    rest();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dims]);
  return idle;
}

/** the face she wears right now: the motion's, if it has one */
export const faceFor = (idle: Idle, mood: WrenMood): WrenMood => (idle.motion && FACE_OF_MOTION[idle.motion]) || mood;

export function HatchlingRig({
  size = 104,
  skin = "sticker",
  mood = "content",
  form,
  mark,
  accessory = "none",
  idle = STILL,
}: {
  size?: number;
  skin?: WrenSkin;
  mood?: WrenMood;
  form?: HatchlingForm;
  mark?: string | null;
  accessory?: WrenAccessory;
  idle?: Idle;
}) {
  const base = WREN_FAMILY[`wren-${skin}-hatchling`] || [];
  const list = (form ? shapeHatchling(base, form) : base).flatMap(splitSides);
  const by: Record<Layer, WShape[]> = { tail: [], farWing: [], feather: [], body: [], belly: [], nearWing: [], face: [], legL: [], legR: [] };
  for (const sh of list) by[layerOf(sh)].push(sh);
  const pose = poseAt(idle.motion, idle.p);
  const face = faceFor(idle, mood);
  const hatchMood = face !== "content" ? face : null;
  /* an empty transform is the identity — RN-SVG wants a string, never undefined */
  const g = (tf: string) => ({ transform: tf || "translate(0 0)" });

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G {...g(pose.all)}>
        {/* the seed she's after, on the ground in front of her */}
        {pose.seed ? <Ellipse cx={150} cy={170} rx={4} ry={2.6} fill="#E8A63C" /> : null}
        <G {...g(pose.tail)}>
          <Shapes list={by.tail} bare />
          {form?.tail ? <TailFeather /> : null}
        </G>
        <G {...g(pose.farWing)}>
          <Shapes list={by.farWing} bare />
        </G>
        <G {...g(pose.legL)}>
          <Shapes list={by.legL} bare />
        </G>
        <Shapes list={by.legR} bare />
        <Shapes list={by.body} bare />
        <Shapes list={by.belly} bare />
        <G {...g(pose.nearWing)}>
          <Shapes list={by.nearWing} bare />
        </G>
        {/* her face slides on the ball: eyes, cheeks, beak, the feather, the mark, the mood */}
        <G {...g(pose.face)}>
          <Shapes list={by.feather} bare />
          <Shapes list={by.face} bare />
          {mark ? <Birthmark color={mark} /> : null}
          {hatchMood ? <HatchEyes mood={hatchMood} skin={skin} form={form} /> : null}
          {accessory !== "none" ? <Shapes list={WREN_FAMILY[`acc-shared-hatchling-${accessory}`] || []} bare /> : null}
        </G>
      </G>
    </Svg>
  );
}
