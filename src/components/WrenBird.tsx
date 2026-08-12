import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { WREN_FAMILY, type WShape } from "./wren-family-data";

/* Wren — the mascot. As of the wren-family delivery she comes in THREE skins
   sharing one skeleton (same geometry, same mood semantics, same anchors):
     sticker — thick white outline, bold indigo (brand default)
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
export type WrenSkin = "sticker" | "plush" | "ink";

const STAGE_KEY: Record<Exclude<WrenStage, "wren">, string> = {
  egg: "egg",
  hatch: "hatchling",
  fledge: "fledgling",
};

// chick body fill per skin — used to patch over the baked-in eyes when a
// hatch-stage mood needs a different eye shape
const CHICK_FILL: Record<WrenSkin, string> = {
  sticker: "#6D6DF6",
  plush: "#A5A1F2",
  ink: "#F3ECDA",
};
const EYE = "#1E1B33";
const HI = "#FFFFFF";

export function WrenBird({
  size = 96,
  mood = "content",
  stage = "wren",
  accessory = "none",
  pose = "perch",
  skin = "sticker",
}: {
  size?: number;
  mood?: WrenMood;
  stage?: WrenStage;
  accessory?: WrenAccessory;
  pose?: WrenPose;
  skin?: WrenSkin;
}) {
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
    if (accessory !== "none") keys.push(`acc-shared-adult-${accessory}`);
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {keys.map((k) => (
        <Shapes key={k} list={WREN_FAMILY[k] || []} />
      ))}
      {hatchMood && <HatchEyes mood={hatchMood} skin={skin} />}
      {stage === "hatch" && pose !== "fly" && accessory !== "none" && size > 20 && <HatchAcc a={accessory} />}
    </Svg>
  );
}

/* render one symbol's shape list */
function Shapes({ list }: { list: WShape[] }) {
  return (
    <G>
      {list.map((s, i) => {
        const common = {
          fill: s.f,
          stroke: s.s,
          strokeWidth: s.sw,
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

/* hatchling mood overlay — the chick's baked-in eyes sit at (80,122)/(120,122)
   r8 on the shared skeleton; moods that need other eye shapes patch them with
   the skin's body fill first. Same semantics as the adult set. */
function HatchEyes({ mood, skin }: { mood: WrenMood; skin: WrenSkin }) {
  const patch = CHICK_FILL[skin];
  const Patch = () => (
    <G>
      <Circle cx={80} cy={122} r={10} fill={patch} />
      <Circle cx={120} cy={122} r={10} fill={patch} />
    </G>
  );
  switch (mood) {
    case "happy":
      return (
        <G>
          <Patch />
          <Path d="M71 124 Q80 114 89 124" stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />
          <Path d="M111 124 Q120 114 129 124" stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />
        </G>
      );
    case "sleepy":
      return (
        <G>
          <Patch />
          <Path d="M71 120 Q80 128 89 120" stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />
          <Path d="M111 120 Q120 128 129 120" stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />
        </G>
      );
    case "delight":
      return (
        <G>
          <Patch />
          <Path d="M80 111 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#E8A63C" />
          <Path d="M120 111 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#E8A63C" />
        </G>
      );
    case "worry":
      return (
        <G>
          <Path d="M70 109 Q80 113 90 109" stroke={EYE} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <Path d="M110 109 Q120 113 130 109" stroke={EYE} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <Path d="M138 118 q5 8 0 14 q-5 -6 0 -14 z" fill="#8ECBE8" />
        </G>
      );
    case "listen":
      return (
        <G>
          <Path d="M70 111 Q80 106 90 111" stroke={EYE} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <Path d="M110 111 Q120 106 130 111" stroke={EYE} strokeWidth={4.5} fill="none" strokeLinecap="round" />
        </G>
      );
    case "curious":
      return (
        <G>
          <Patch />
          <Circle cx={80} cy={122} r={9} fill={EYE} />
          <Circle cx={77} cy={119} r={3} fill={HI} />
          <Circle cx={120} cy={122} r={6} fill={EYE} />
          <Circle cx={118} cy={120} r={2} fill={HI} />
        </G>
      );
    case "think":
      return (
        <G>
          <Circle cx={142} cy={104} r={2.6} fill="#A6A1B6" />
          <Circle cx={150} cy={98} r={2.2} fill="#A6A1B6" />
          <Circle cx={156} cy={91} r={1.8} fill="#A6A1B6" />
        </G>
      );
    case "wink":
      return (
        <G>
          <Circle cx={80} cy={122} r={10} fill={CHICK_FILL[skin]} />
          <Path d="M71 122 Q80 116 89 122" stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />
        </G>
      );
    default:
      return null;
  }
}

/* chick-sized wearables — carried over from the previous set so the born
   trait still shows at the hatch. Round-2 of the design delivery replaces
   these with skin-matched versions (and adds party/shades + fledgling). */
function HatchAcc({ a }: { a: WrenAccessory }) {
  switch (a) {
    case "beanie":
      return (
        <G>
          <Path d="M60 92 Q100 48 140 92 Q140 99 131 99 L69 99 Q60 99 60 92 Z" fill="#EF6D8C" />
          <Rect x={58} y={94} width={84} height={12} rx={6} fill="#F2EFFF" />
          <Circle cx={100} cy={50} r={8} fill="#F2EFFF" />
        </G>
      );
    case "scarf":
      return (
        <G>
          <Path d="M62 162 Q100 180 138 162 L138 175 Q100 194 62 175 Z" fill="#6FBF9B" />
          <Path d="M126 170 l12 24 l10 -6 l-10 -22 z" fill="#6FBF9B" />
        </G>
      );
    case "phones":
      return (
        <G>
          <Path d="M52 128 Q52 70 100 70 Q148 70 148 128" fill="none" stroke="#2A2740" strokeWidth={6} strokeLinecap="round" />
          <Rect x={42} y={120} width={17} height={28} rx={7} fill="#2A2740" />
          <Rect x={141} y={120} width={17} height={28} rx={7} fill="#2A2740" />
        </G>
      );
    case "flower":
      return (
        <G>
          <Circle cx={76} cy={82} r={7} fill="#EF9CB4" />
          <Circle cx={100} cy={72} r={7} fill="#EF9CB4" />
          <Circle cx={124} cy={82} r={7} fill="#EF9CB4" />
          <Circle cx={76} cy={82} r={3} fill="#F6D77A" />
          <Circle cx={100} cy={72} r={3} fill="#F6D77A" />
          <Circle cx={124} cy={82} r={3} fill="#F6D77A" />
        </G>
      );
    default:
      return null; // party / shades arrive with the round-2 delivery
  }
}
