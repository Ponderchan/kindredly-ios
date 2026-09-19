import type { HatchlingForm } from "../lib/hatchling-form";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { WREN_FAMILY, type WShape } from "./wren-family-data";
import { useWrenAccessory, useWrenSkin } from "../lib/wren-skin";
import { useWrenStage } from "../lib/wren-stage";

/* Wren — the mascot. As of the wren-family delivery she comes in THREE skins
   sharing one skeleton (same geometry, same mood semantics, same anchors):
     sticker — bold indigo, with a white die-cut outline it can wear (brand default)
     plush   — soft lavender squish
     ink     — cream postal bird, navy accents
   The art itself is data (wren-family-data.ts, generated from the design
   file); this component just resolves a symbol key and renders its shapes.
   Emotion still lives in the eyes; the body never deforms. */

export type WrenMood =
  | "content"
  | "happy"
  | "listen"
  | "sleepy"
  | "curious"
  | "delight"
  | "think"
  | "wink"
  | "worry";
export type WrenStage = "egg" | "hatch" | "fledge" | "wren";
export type WrenAccessory = "none" | "beanie" | "scarf" | "phones" | "flower" | "party" | "shades";
export type WrenPose = "perch" | "fly";
export type WrenSkin = "sticker" | "plush" | "ink" | "moss" | "peach";

const STAGE_KEY: Record<Exclude<WrenStage, "wren">, string> = {
  egg: "egg",
  hatch: "hatchling",
  fledge: "fledgling",
};

// chick body fill per skin — used to patch over the baked-in eyes when a
// hatch-stage mood needs a different eye shape
export const CHICK_FILL: Record<WrenSkin, string> = {
  sticker: "#5757EC",
  plush: "#A9C6F2",
  ink: "#2B2A4A",
  moss: "#6DAE78",
  peach: "#F2A08C",
};
const EYE = "#1E1B33";
const HI = "#FFFFFF";

export function WrenBird({
  size = 96,
  mood = "content",
  stage: stageProp,
  accessory: accessoryProp,
  pose = "perch",
  skin: skinProp,
  mark: markProp,
  outlined = false,
  form: formProp,
}: {
  size?: number;
  mood?: WrenMood;
  stage?: WrenStage;
  accessory?: WrenAccessory;
  pose?: WrenPose;
  skin?: WrenSkin;
  /** the shell's birthmark, on the hatchling's forehead; falls back to the saved egg */
  mark?: string | null;
  /* THE WHITE DIE-CUT OUTLINE, AND WHY IT IS NOW OPT-IN.
     It shipped as opt-OUT, the theory being that a keyline lifts her off a
     busy page. In practice twenty-five of forty-two call sites had already
     turned it off by hand, nine more sat on white paper where it changes
     nothing, and every remaining place it was actually visible was a place
     it looked wrong: a halo on the lavender desk, a pasted-on sticker on a
     dark card. A default that nearly every caller overrides is not a
     default. She is drawn without it now; a surface that genuinely needs
     the lift — over a photograph, say — asks. The skin data is untouched
     (and must stay that way: `ink` is paid and is never chosen in code). */
  outlined?: boolean;
  /* the hatchling's own proportions, read from the writing that hatched her.
     Only meaningful at the hatch stage; every other stage ignores it. */
  form?: HatchlingForm;
}) {
  const ctxSkin = useWrenSkin();
  const ctxAccessory = useWrenAccessory();
  const accessory = accessoryProp ?? ctxAccessory; // explicit wins (the rack's tiles); else what she's wearing
  const skin = skinProp ?? ctxSkin; // explicit prop wins (gallery); else the app-wide pick
  /* the stage the same way: a screen that means a specific stage says so; every
     other surface draws her where she actually is (see lib/wren-stage) */
  const ctxStage = useWrenStage();
  const stage: WrenStage = stageProp ?? ctxStage.stage ?? "wren";
  const form = formProp ?? (stage === "hatch" ? ctxStage.form ?? undefined : undefined);
  const mark = markProp === undefined ? ctxStage.mark : markProp;
  const keys: string[] = [];
  let hatchMood: WrenMood | null = null;

  if (pose === "fly") {
    keys.push(`wren-${skin}-fly`);
  } else if (size <= 20) {
    // corner-UI micro mark — the smallest thing that still reads as her
    keys.push(`wren-${skin}-mini`);
  } else if (stage !== "wren") {
    keys.push(`wren-${skin}-${STAGE_KEY[stage]}`);
    if (stage === "hatch" && mood !== "content") hatchMood = mood;
  } else {
    keys.push(`wren-${skin}-adult-${mood}`);
  }
  /* WHAT SHE WEARS is drawn last, from the generator's per-stage overlays
     (beanie on the brow of the chick, the fledgling and the grown bird
     alike; the flying set is the perched set lifted with her). It used to be
     a hand-made chick set with no party hat and no shades, and the grown
     set was placed at the wrong height. The egg and the micro mark wear
     nothing. */
  const accKey =
    accessory === "none" || size <= 20 || stage === "egg"
      ? null
      : pose === "fly"
        ? `acc-shared-fly-${accessory}`
        : `acc-shared-${stage === "wren" ? "adult" : STAGE_KEY[stage]}-${accessory}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {keys.map((k) => (
        <Shapes
          key={k}
          list={stage === "hatch" && form ? shapeHatchling(WREN_FAMILY[k] || [], form) : WREN_FAMILY[k] || []}
          bare={!outlined}
        />
      ))}
      {stage === "hatch" && form?.tail && <TailFeather />}
      {stage === "hatch" && pose !== "fly" && !!mark && size > 20 && <Birthmark color={mark} />}
      {hatchMood && <HatchEyes mood={hatchMood} skin={skin} form={form} />}
      {accKey && <Shapes list={WREN_FAMILY[accKey] || []} bare={!outlined} />}
    </Svg>
  );
}

/* SHAPING THE HATCHLING TO THE READ.
   The parts are identified by geometry rather than by position in the list:
   all three skins ship the same eleven shapes, but relying on index would
   make a reordered export silently deform the wrong thing. Each rule below
   states what it is looking at. */
export function shapeHatchling(list: WShape[], f: HatchlingForm): WShape[] {
  const num = (v: unknown) => (typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN);
  const CX = 100; // her axis of symmetry in the 200x200 viewBox

  return list.map((sh) => {
    const cx = num((sh as any).cx);
    const cy = num((sh as any).cy);
    const r = num((sh as any).r);

    // BODY — the one big circle. Stretching it vertically is the whole of
    // "long sentences read longer", so it becomes an ellipse.
    if (sh.t === "c" && r >= 40) {
      const { r: _drop, ...rest } = sh as any;
      return { ...rest, t: "e", rx: String(r / Math.sqrt(f.bodyStretch)), ry: String(r * f.bodyStretch) };
    }

    // EYES — the dark pair. Radius carries emotion, x carries perspective.
    if (sh.t === "c" && r > 4 && r < 14 && /^#1E1B33$/i.test(String(sh.f))) {
      const out = cx < CX ? -f.eyeSpread : f.eyeSpread;
      return { ...sh, cx: String(cx + out), r: String(r * f.eyeScale) } as WShape;
    }
    // the highlights ride with the eye they belong to
    if (sh.t === "c" && r <= 4 && isWhite(sh.f)) {
      const out = cx < CX ? -f.eyeSpread : f.eyeSpread;
      return { ...sh, cx: String(cx + out), r: String(r * f.eyeScale) } as WShape;
    }

    // CHEEKS — the pink pair. Punctuation can remove them entirely.
    if (sh.t === "c" && /^#EF9CB4$/i.test(String(sh.f))) {
      if (f.cheek <= 0.02) return { ...sh, r: "0" } as WShape;
      return { ...sh, r: String(r * Math.min(1.5, f.cheek)) } as WShape;
    }

    // CREST — the only stroke-only path she has.
    if (sh.t === "p" && String(sh.f) === "none" && f.crestLift !== 0) {
      return { ...sh, tf: `translate(0 ${-f.crestLift})` } as WShape;
    }

    // BEAK — the small amber path, scaled about its own centre.
    if (sh.t === "p" && /^#(EFB050|F2A0B5|F2887E|E8B04A|5B55FF)$/i.test(String(sh.f)) && f.beakScale !== 1) {
      const k = f.beakScale;
      return { ...sh, tf: `translate(${128 * (1 - k)} ${117 * (1 - k)}) scale(${k})` } as WShape;
    }

    return sh;
  });
}

/* the extra feather a distinctive hand earns — drawn, not selected */
/* THE BIRTHMARK. The shell you picked before you wrote is the one thing
   about her you chose, and it used to vanish the moment she was named. It
   stays, as a small mark on her forehead in the shell's own colour — the
   sheet's line is "the shell only leaves a birthmark; the bird inside is
   written, not chosen". */
export function Birthmark({ color }: { color: string }) {
  return <Path d="M98 79 q8 -7 16 0 q-3 9 -8 9 q-5 0 -8 -9z" fill={color} opacity={0.8} />;
}

export function TailFeather() {
  return <Path d="M50 117 q-22 -12 -27 2 q14 10 28 4 Z" fill="#4646DB" stroke="#FFFFFF" strokeWidth={5} strokeLinejoin="round" />;
}

const isWhite = (c?: string) => !!c && /^#(fff|ffffff)$/i.test(c.trim());

/* render one symbol's shape list */
export function Shapes({ list, bare }: { list: WShape[]; bare?: boolean }) {
  return (
    <G>
      {list.map((s, i) => {
        const strip = bare && isWhite(s.s);
        const common = {
          fill: s.f,
          stroke: strip ? undefined : s.s,
          strokeWidth: strip ? undefined : s.sw,
          strokeLinecap: s.lc as any,
          strokeLinejoin: s.lj as any,
          opacity: s.o,
          transform: s.tf,
          strokeDasharray: s.da,
        };
        if (s.t === "p") return <Path key={i} d={s.d} {...common} />;
        if (s.t === "c") return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...common} />;
        if (s.t === "e") return <Ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />;
        return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...common} />;
      })}
    </G>
  );
}

/* hatchling mood overlay — the chick's baked-in eyes sit at EL (far) and
   ER (near) on the three-quarter head; moods that need other eye shapes
   patch them with the skin's body fill first. Same semantics as the adult
   set. Every mark is drawn relative to the eye it belongs to, so the eyes
   can move in the generator without this file following by hand. */
const EL0 = { x: 89.5, y: 103 };
const ER0 = { x: 117.5, y: 99.5 };
export function HatchEyes({ mood, skin, form }: { mood: WrenMood; skin: WrenSkin; form?: HatchlingForm }) {
  const patch = CHICK_FILL[skin];
  /* the read moves her eyes apart and scales them (shapeHatchling); the
     mood's marks follow, or a wide-set chick would smile beside her eyes */
  const spread = form?.eyeSpread ?? 0;
  const k = form?.eyeScale ?? 1;
  const EL = { x: EL0.x - spread, y: EL0.y };
  const ER = { x: ER0.x + spread, y: ER0.y };
  const Patch = () => (
    <G>
      <Circle cx={EL.x} cy={EL.y} r={11 * k} fill={patch} />
      <Circle cx={ER.x} cy={ER.y} r={11 * k} fill={patch} />
    </G>
  );
  const both = (d: (e: { x: number; y: number }) => string, sw: number) => (
    <G>
      <Path d={d(EL)} stroke={EYE} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <Path d={d(ER)} stroke={EYE} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </G>
  );
  switch (mood) {
    case "happy":
      return (
        <G>
          <Patch />
          {both((e) => `M${e.x - 9} ${e.y + 2} Q${e.x} ${e.y - 8} ${e.x + 9} ${e.y + 2}`, 6)}
        </G>
      );
    case "sleepy":
      return (
        <G>
          <Patch />
          {both((e) => `M${e.x - 9} ${e.y - 2} Q${e.x} ${e.y + 6} ${e.x + 9} ${e.y - 2}`, 6)}
        </G>
      );
    case "delight":
      return (
        <G>
          <Patch />
          <Path d={`M${EL.x} ${EL.y - 11} l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z`} fill="#E8A63C" />
          <Path d={`M${ER.x} ${ER.y - 11} l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z`} fill="#E8A63C" />
        </G>
      );
    case "worry":
      return (
        <G>
          {both((e) => `M${e.x - 10} ${e.y - 13} Q${e.x} ${e.y - 9} ${e.x + 10} ${e.y - 13}`, 4.5)}
          <Path d={`M${ER.x + 18} ${ER.y - 4} q5 8 0 14 q-5 -6 0 -14 z`} fill="#8ECBE8" />
        </G>
      );
    case "listen":
      return both((e) => `M${e.x - 10} ${e.y - 11} Q${e.x} ${e.y - 16} ${e.x + 10} ${e.y - 11}`, 4.5);
    case "curious":
      return (
        <G>
          <Patch />
          <Circle cx={EL.x} cy={EL.y} r={9} fill={EYE} />
          <Circle cx={EL.x - 3} cy={EL.y - 3} r={3} fill={HI} />
          <Circle cx={ER.x} cy={ER.y} r={6} fill={EYE} />
          <Circle cx={ER.x - 2} cy={ER.y - 2} r={2} fill={HI} />
        </G>
      );
    case "think":
      return (
        <G>
          <Circle cx={ER.x + 24} cy={ER.y - 18} r={2.6} fill="#A6A1B6" />
          <Circle cx={ER.x + 32} cy={ER.y - 24} r={2.2} fill="#A6A1B6" />
          <Circle cx={ER.x + 38} cy={ER.y - 31} r={1.8} fill="#A6A1B6" />
        </G>
      );
    case "wink":
      return (
        <G>
          <Circle cx={EL.x} cy={EL.y} r={11 * k} fill={patch} />
          <Path d={`M${EL.x - 9} ${EL.y} Q${EL.x} ${EL.y - 6} ${EL.x + 9} ${EL.y}`} stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />
        </G>
      );
    default:
      return null;
  }
}
