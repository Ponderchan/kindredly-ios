import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";

/* Wren — the mascot, from the character set. One consistent bird (fixed
   colors, so she reads the same everywhere), expressed through mood + stage +
   wearable + pose. Body/tail/crest stay fixed; the eyes and accessories carry
   all the emotion. See the Wren character bible. */

export type WrenMood =
  | "content"
  | "happy"
  | "listen" // "I hear you"
  | "sleepy" // resting / "put your phone down"
  | "curious"
  | "delight"
  | "think"
  | "wink"
  | "worry"; // tender
export type WrenStage = "egg" | "hatch" | "fledge" | "wren";
export type WrenAccessory = "none" | "beanie" | "scarf" | "phones" | "flower" | "party" | "shades";
export type WrenPose = "perch" | "fly";

const K = {
  indigo: "#5757EC",
  deep: "#4646DB",
  light: "#7C7CF7",
  belly: "#F2EFFF",
  beak: "#EFB050",
  beakLine: "#D9992F",
  foot: "#E8A63C",
  amber: "#E8A63C",
  cheek: "#EF9CB4",
  eye: "#1E1B33",
  hi: "#FFFFFF",
};

export function WrenBird({
  size = 96,
  mood = "content",
  stage = "wren",
  accessory = "none",
  pose = "perch",
}: {
  size?: number;
  mood?: WrenMood;
  stage?: WrenStage;
  accessory?: WrenAccessory;
  pose?: WrenPose;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {stage === "egg" ? (
        <Egg />
      ) : stage === "hatch" ? (
        <Hatch mood={mood} accessory={accessory} />
      ) : stage === "fledge" ? (
        <Fledge />
      ) : pose === "fly" ? (
        <Fly />
      ) : (
        <G>
          <Body />
          <Eyes mood={mood} />
          {accessory !== "none" && <Acc a={accessory} />}
        </G>
      )}
    </Svg>
  );
}

/* ── base body (face-less) ── */
function Body() {
  return (
    <G>
      <Ellipse cx={102} cy={184} rx={48} ry={9} fill={K.indigo} opacity={0.12} />
      {/* upturned wren tail — the signature */}
      <Path d="M60 132 Q26 122 15 76 Q46 90 66 124 Z" fill={K.deep} />
      <Path d="M60 130 Q34 122 26 92 Q46 102 62 124 Z" fill={K.light} opacity={0.85} />
      {/* body */}
      <Ellipse cx={102} cy={110} rx={58} ry={60} fill={K.indigo} />
      {/* belly */}
      <Ellipse cx={106} cy={122} rx={33} ry={40} fill={K.belly} />
      {/* wing */}
      <Path d="M152 96 Q176 116 152 150 Q136 132 139 112 Z" fill={K.deep} />
      {/* crest */}
      <Path d="M94 52 Q89 31 100 30 Q102 43 98 55 Z" fill={K.light} />
      <Path d="M107 53 Q111 31 121 38 Q114 49 109 56 Z" fill={K.light} />
      {/* cheeks */}
      <Ellipse cx={72} cy={120} rx={8.5} ry={6} fill={K.cheek} opacity={0.55} />
      <Ellipse cx={132} cy={120} rx={8.5} ry={6} fill={K.cheek} opacity={0.55} />
      {/* beak */}
      <Path d="M93 106 L111 106 L102 119 Z" fill={K.beak} />
      <Path d="M102 106 L102 116" stroke={K.beakLine} strokeWidth={1.4} />
      {/* feet */}
      <Path
        d="M92 165 L92 178 M85 178 h14 M112 165 L112 178 M105 178 h14"
        stroke={K.foot}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
    </G>
  );
}

/* ── eyes = the mood ── */
function Eyes({ mood }: { mood: WrenMood }) {
  switch (mood) {
    case "happy":
      return (
        <G>
          <Path d="M76 104 Q84 94 92 104" stroke={K.eye} strokeWidth={3.4} fill="none" strokeLinecap="round" />
          <Path d="M112 104 Q120 94 128 104" stroke={K.eye} strokeWidth={3.4} fill="none" strokeLinecap="round" />
        </G>
      );
    case "listen":
      return (
        <G>
          <Circle cx={84} cy={103} r={7} fill={K.eye} />
          <Circle cx={120} cy={103} r={7} fill={K.eye} />
          <Circle cx={86.5} cy={100.5} r={2.2} fill={K.hi} />
          <Circle cx={122.5} cy={100.5} r={2.2} fill={K.hi} />
          <Path d="M75 94 Q84 90 93 94" stroke={K.deep} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <Path d="M111 94 Q120 90 129 94" stroke={K.deep} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </G>
      );
    case "sleepy":
      return (
        <G>
          <Path d="M76 102 Q84 108 92 102" stroke={K.eye} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <Path d="M112 102 Q120 108 128 102" stroke={K.eye} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <SvgText x={150} y={70} fontSize={18} fill="#8E8EFF" fontWeight="bold">z</SvgText>
          <SvgText x={164} y={57} fontSize={12} fill="#8E8EFF" fontWeight="bold">z</SvgText>
        </G>
      );
    case "curious":
      return (
        <G>
          <Circle cx={83} cy={103} r={9.5} fill={K.eye} />
          <Circle cx={121} cy={103} r={6.5} fill={K.eye} />
          <Circle cx={86.5} cy={99.5} r={3} fill={K.hi} />
          <Circle cx={123.5} cy={100.5} r={2} fill={K.hi} />
          <SvgText x={149} y={72} fontSize={22} fontWeight="bold" fill={K.amber}>?</SvgText>
        </G>
      );
    case "delight":
      return (
        <G>
          <Path d="M84 93 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill={K.amber} />
          <Path d="M120 93 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill={K.amber} />
        </G>
      );
    case "think":
      return (
        <G>
          <Circle cx={88} cy={100} r={7} fill={K.eye} />
          <Circle cx={124} cy={100} r={7} fill={K.eye} />
          <Circle cx={90.5} cy={97.5} r={2.2} fill={K.hi} />
          <Circle cx={126.5} cy={97.5} r={2.2} fill={K.hi} />
          <SvgText x={147} y={112} fontSize={20} fontWeight="bold" fill="#A6A1B6">…</SvgText>
        </G>
      );
    case "wink":
      return (
        <G>
          <Path d="M76 103 Q84 96 92 103" stroke={K.eye} strokeWidth={3.4} fill="none" strokeLinecap="round" />
          <Circle cx={120} cy={102} r={8} fill={K.eye} />
          <Circle cx={123} cy={99} r={2.6} fill={K.hi} />
        </G>
      );
    case "worry":
      return (
        <G>
          <Circle cx={85} cy={103} r={7} fill={K.eye} />
          <Circle cx={121} cy={103} r={7} fill={K.eye} />
          <Circle cx={87.5} cy={100.5} r={2.2} fill={K.hi} />
          <Circle cx={123.5} cy={100.5} r={2.2} fill={K.hi} />
          <Path d="M76 92 Q85 96 93 92" stroke={K.deep} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <Path d="M113 92 Q122 96 130 92" stroke={K.deep} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <Path d="M150 96 q5 8 0 14 q-5 -6 0 -14 z" fill="#8ECBE8" />
        </G>
      );
    case "content":
    default:
      return (
        <G>
          <Circle cx={84} cy={102} r={8} fill={K.eye} />
          <Circle cx={120} cy={102} r={8} fill={K.eye} />
          <Circle cx={87} cy={99} r={2.6} fill={K.hi} />
          <Circle cx={123} cy={99} r={2.6} fill={K.hi} />
        </G>
      );
  }
}

/* ── wearables ── */
function Acc({ a }: { a: WrenAccessory }) {
  switch (a) {
    case "beanie":
      return (
        <G>
          <Path d="M64 60 Q102 26 140 60 Q140 66 132 66 L72 66 Q64 66 64 60 Z" fill="#EF6D8C" />
          <Rect x={62} y={62} width={80} height={12} rx={6} fill={K.belly} />
          <Circle cx={102} cy={30} r={8} fill={K.belly} />
        </G>
      );
    case "scarf":
      return (
        <G>
          <Path d="M64 150 Q102 168 140 150 L140 162 Q102 178 64 162 Z" fill="#6FBF9B" />
          <Path d="M128 158 l14 30 l10 -6 l-10 -26 z" fill="#6FBF9B" />
        </G>
      );
    case "phones":
      return (
        <G>
          <Path d="M56 100 Q56 40 102 40 Q148 40 148 100" fill="none" stroke="#2A2740" strokeWidth={6} strokeLinecap="round" />
          <Rect x={46} y={96} width={18} height={30} rx={7} fill="#2A2740" />
          <Rect x={140} y={96} width={18} height={30} rx={7} fill="#2A2740" />
        </G>
      );
    case "flower":
      return (
        <G>
          <Circle cx={70} cy={52} r={7} fill={K.cheek} />
          <Circle cx={102} cy={44} r={7} fill={K.cheek} />
          <Circle cx={134} cy={52} r={7} fill={K.cheek} />
          <Circle cx={70} cy={52} r={3} fill="#F6D77A" />
          <Circle cx={102} cy={44} r={3} fill="#F6D77A" />
          <Circle cx={134} cy={52} r={3} fill="#F6D77A" />
        </G>
      );
    case "party":
      return (
        <G>
          <Path d="M102 20 L86 58 L118 58 Z" fill={K.amber} />
          <Circle cx={102} cy={20} r={5} fill="#EF6D8C" />
          <Circle cx={96} cy={46} r={3} fill={K.belly} />
          <Circle cx={108} cy={40} r={3} fill="#6FBF9B" />
        </G>
      );
    case "shades":
      return (
        <G>
          <Rect x={70} y={92} width={24} height={18} rx={6} fill="#1E1B2E" />
          <Rect x={110} y={92} width={24} height={18} rx={6} fill="#1E1B2E" />
          <Path d="M94 98 h16" stroke="#1E1B2E" strokeWidth={4} />
        </G>
      );
    default:
      return null;
  }
}

/* ── growth stages ── */
function Egg() {
  return (
    <G>
      <Ellipse cx={100} cy={188} rx={34} ry={6} fill={K.indigo} opacity={0.12} />
      <Path d="M62 118 Q62 58 100 58 Q138 58 138 118 Q138 172 100 172 Q62 172 62 118 Z" fill="#EDE7FB" />
      <Path d="M74 100 l10 8 l-8 10 l12 6 l-9 12" fill="none" stroke="#C9C1E6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M90 96 L106 96 L98 106 Z" fill={K.beak} />
      <Circle cx={90} cy={90} r={3} fill={K.eye} />
      <Circle cx={108} cy={90} r={3} fill={K.eye} />
    </G>
  );
}
function Hatch({ mood = "content", accessory = "none" }: { mood?: WrenMood; accessory?: WrenAccessory }) {
  return (
    <G>
      <Ellipse cx={100} cy={184} rx={34} ry={7} fill={K.indigo} opacity={0.12} />
      <Ellipse cx={100} cy={120} rx={42} ry={44} fill="#6D6DF6" />
      <Ellipse cx={102} cy={128} rx={24} ry={28} fill={K.belly} />
      <Path d="M92 78 Q88 62 98 62 Q100 72 96 80 Z" fill="#8E8EFF" />
      <Ellipse cx={118} cy={150} rx={20} ry={8} fill={K.deep} />
      <Path d="M94 116 L106 116 L100 125 Z" fill={K.beak} />
      <HatchEyes mood={mood} />
      <Ellipse cx={72} cy={126} rx={6} ry={4} fill={K.cheek} opacity={0.5} />
      <Ellipse cx={128} cy={126} rx={6} ry={4} fill={K.cheek} opacity={0.5} />
      {accessory !== "none" && <HatchAcc a={accessory} />}
    </G>
  );
}

/* chick-sized wearables — the born-with trait shows from the hatch */
function HatchAcc({ a }: { a: WrenAccessory }) {
  switch (a) {
    case "beanie":
      return (
        <G>
          <Path d="M66 92 Q100 52 134 92 Q134 98 126 98 L74 98 Q66 98 66 92 Z" fill="#EF6D8C" />
          <Rect x={64} y={94} width={72} height={10} rx={5} fill={K.belly} />
          <Circle cx={100} cy={54} r={7} fill={K.belly} />
        </G>
      );
    case "scarf":
      return (
        <G>
          <Path d="M70 148 Q100 163 130 148 L130 159 Q100 175 70 159 Z" fill="#6FBF9B" />
          <Path d="M119 156 l11 23 l9 -5 l-9 -21 z" fill="#6FBF9B" />
        </G>
      );
    case "phones":
      return (
        <G>
          <Path d="M62 118 Q62 68 100 68 Q138 68 138 118" fill="none" stroke="#2A2740" strokeWidth={5} strokeLinecap="round" />
          <Rect x={54} y={112} width={15} height={25} rx={6} fill="#2A2740" />
          <Rect x={131} y={112} width={15} height={25} rx={6} fill="#2A2740" />
        </G>
      );
    case "flower":
      return (
        <G>
          <Circle cx={80} cy={82} r={6} fill={K.cheek} />
          <Circle cx={100} cy={73} r={6} fill={K.cheek} />
          <Circle cx={120} cy={82} r={6} fill={K.cheek} />
          <Circle cx={80} cy={82} r={2.5} fill="#F6D77A" />
          <Circle cx={100} cy={73} r={2.5} fill="#F6D77A" />
          <Circle cx={120} cy={82} r={2.5} fill="#F6D77A" />
        </G>
      );
    default:
      return null;
  }
}

/* hatchling face — same moods, sized for the chick's geometry */
function HatchEyes({ mood }: { mood: WrenMood }) {
  switch (mood) {
    case "happy":
      return (
        <G>
          <Path d="M82 112 Q88 105 94 112" stroke={K.eye} strokeWidth={2.8} fill="none" strokeLinecap="round" />
          <Path d="M106 112 Q112 105 118 112" stroke={K.eye} strokeWidth={2.8} fill="none" strokeLinecap="round" />
        </G>
      );
    case "delight":
      return (
        <G>
          <Path d="M88 104 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill={K.amber} />
          <Path d="M112 104 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill={K.amber} />
        </G>
      );
    case "worry":
      return (
        <G>
          <Circle cx={88} cy={112} r={5.5} fill={K.eye} />
          <Circle cx={112} cy={112} r={5.5} fill={K.eye} />
          <Circle cx={90} cy={110} r={1.8} fill={K.hi} />
          <Circle cx={114} cy={110} r={1.8} fill={K.hi} />
          <Path d="M81 103 Q88 106 95 103" stroke={K.deep} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M105 103 Q112 106 119 103" stroke={K.deep} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M133 106 q4 6 0 11 q-4 -5 0 -11 z" fill="#8ECBE8" />
        </G>
      );
    case "listen":
      return (
        <G>
          <Circle cx={88} cy={112} r={5.5} fill={K.eye} />
          <Circle cx={112} cy={112} r={5.5} fill={K.eye} />
          <Circle cx={90} cy={110} r={1.8} fill={K.hi} />
          <Circle cx={114} cy={110} r={1.8} fill={K.hi} />
          <Path d="M81 104 Q88 101 95 104" stroke={K.deep} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M105 104 Q112 101 119 104" stroke={K.deep} strokeWidth={2} fill="none" strokeLinecap="round" />
        </G>
      );
    case "curious":
      return (
        <G>
          <Circle cx={87} cy={112} r={7} fill={K.eye} />
          <Circle cx={113} cy={112} r={5} fill={K.eye} />
          <Circle cx={89.5} cy={109.5} r={2.2} fill={K.hi} />
          <Circle cx={115} cy={110} r={1.6} fill={K.hi} />
          <SvgText x={128} y={98} fontSize={16} fontWeight="bold" fill={K.amber}>?</SvgText>
        </G>
      );
    case "think":
      return (
        <G>
          <Circle cx={90} cy={110} r={5.5} fill={K.eye} />
          <Circle cx={114} cy={110} r={5.5} fill={K.eye} />
          <Circle cx={92} cy={108} r={1.8} fill={K.hi} />
          <Circle cx={116} cy={108} r={1.8} fill={K.hi} />
          <SvgText x={128} y={124} fontSize={15} fontWeight="bold" fill="#A6A1B6">…</SvgText>
        </G>
      );
    case "sleepy":
      return (
        <G>
          <Path d="M82 111 Q88 116 94 111" stroke={K.eye} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Path d="M106 111 Q112 116 118 111" stroke={K.eye} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </G>
      );
    case "content":
    case "wink":
    default:
      return (
        <G>
          <Circle cx={88} cy={112} r={6} fill={K.eye} />
          <Circle cx={112} cy={112} r={6} fill={K.eye} />
          <Circle cx={90} cy={109} r={2} fill={K.hi} />
          <Circle cx={114} cy={109} r={2} fill={K.hi} />
        </G>
      );
  }
}
function Fledge() {
  return (
    <G>
      <Ellipse cx={100} cy={184} rx={40} ry={8} fill={K.indigo} opacity={0.12} />
      <Path d="M62 128 Q40 122 33 92 Q54 100 66 122 Z" fill={K.deep} />
      <Ellipse cx={100} cy={112} rx={50} ry={52} fill="#5F5FEF" />
      <Ellipse cx={104} cy={122} rx={28} ry={34} fill={K.belly} />
      <Path d="M144 100 Q164 118 144 146 Q132 130 135 114 Z" fill={K.deep} />
      <Path d="M94 56 Q89 36 99 34 Q101 47 97 58 Z" fill={K.light} />
      <Path d="M93 108 L109 108 L101 119 Z" fill={K.beak} />
      <Circle cx={85} cy={104} r={7.5} fill={K.eye} />
      <Circle cx={119} cy={104} r={7.5} fill={K.eye} />
      <Circle cx={88} cy={101} r={2.5} fill={K.hi} />
      <Circle cx={122} cy={101} r={2.5} fill={K.hi} />
      <Ellipse cx={72} cy={122} rx={8} ry={5.5} fill={K.cheek} opacity={0.5} />
      <Ellipse cx={130} cy={122} rx={8} ry={5.5} fill={K.cheek} opacity={0.5} />
      <Path d="M92 166 L92 176 M112 166 L112 176" stroke={K.foot} strokeWidth={3} strokeLinecap="round" />
    </G>
  );
}

/* ── flight (carrying a letter) ── */
function Fly() {
  return (
    <G>
      <Path d="M70 150 L58 168 L74 162 Z" fill={K.amber} opacity={0.9} />
      <Ellipse cx={100} cy={102} rx={52} ry={52} fill={K.indigo} />
      <Ellipse cx={104} cy={112} rx={30} ry={36} fill={K.belly} />
      <Path d="M52 92 Q10 84 4 108 Q34 112 56 104 Z" fill={K.deep} />
      <Path d="M148 92 Q190 84 196 108 Q166 112 144 104 Z" fill={K.deep} />
      <Path d="M92 46 Q88 28 98 27 Q100 39 96 50 Z" fill={K.light} />
      <Ellipse cx={72} cy={112} rx={7.5} ry={5.5} fill={K.cheek} opacity={0.55} />
      <Ellipse cx={128} cy={112} rx={7.5} ry={5.5} fill={K.cheek} opacity={0.55} />
      <Path d="M92 100 L108 100 L100 111 Z" fill={K.beak} />
      {/* the letter she's carrying — big enough to read as yours */}
      <G transform="translate(100 152) rotate(-7)">
        <Rect x={-25} y={-17} width={50} height={34} rx={4} fill="#FBF7EE" stroke="#E5E0F0" strokeWidth={1.5} />
        <Path d="M-25 -17 L0 4 L25 -17" fill="none" stroke="#C9B79A" strokeWidth={1.8} />
        <Circle cx={15} cy={8} r={4.5} fill={K.amber} opacity={0.9} />
      </G>
      <Circle cx={86} cy={96} r={7} fill={K.eye} />
      <Circle cx={114} cy={96} r={7} fill={K.eye} />
      <Circle cx={88.5} cy={93} r={2.4} fill={K.hi} />
      <Circle cx={116.5} cy={93} r={2.4} fill={K.hi} />
    </G>
  );
}
