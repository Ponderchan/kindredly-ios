import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { P } from "../theme/post";

/* Wren, as the post office would print her: a single-colour line drawing inside
   a stamp's frame. The illustrated mascot carries her own palette, which reads
   as a stray blob on a page made only of black rules and mono type — so in this
   system she isn't drawn on the page, she's STAMPED onto it. Same bird (round
   body, round head, tuft, small beak), reduced to ink.

   She stays the one living thing in a page of machinery — which is the point. */

export function WrenStamp({ size = 44, tint = P.ink, framed = true }: { size?: number; tint?: string; framed?: boolean }) {
  const s = size;
  const bird = (
    <Svg width={s * 0.72} height={s * 0.72} viewBox="0 0 40 40">
      {/* body */}
      <Circle cx={20} cy={24} r={10.5} fill="none" stroke={tint} strokeWidth={1.8} />
      {/* head */}
      <Circle cx={20} cy={13.5} r={6.5} fill="none" stroke={tint} strokeWidth={1.8} />
      {/* beak */}
      <Path d="M26.2 13.2 L31 15 L26.2 16.6" fill="none" stroke={tint} strokeWidth={1.6} strokeLinejoin="round" />
      {/* eye */}
      <Circle cx={17.6} cy={12.4} r={1.35} fill={tint} />
      {/* tuft */}
      <Path d="M14.6 7.6 Q16.4 3 18.6 7.2" fill="none" stroke={tint} strokeWidth={1.5} strokeLinecap="round" />
      {/* wing */}
      <Path d="M14 24 Q20 30 26 24" fill="none" stroke={tint} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );

  if (!framed) return bird;
  return (
    <View
      style={{
        width: s,
        height: s,
        borderWidth: 1,
        borderColor: tint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {bird}
    </View>
  );
}
