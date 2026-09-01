import { View, Text, Pressable } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { P, PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { t } from "../lib/i18n";

/* THE DOORWAY TO THE FARE, AND WHY IT IS A STUB.
 *
 * This was a one-pixel rectangle holding two words — the plainest object on
 * the Me page, and the only one that leads to the money. Worse, it had no
 * visual relationship to what it opens: the paywall is a TICKET, with
 * airmail chevrons and a torn stub per fare, and its front door looked like
 * a settings row.
 *
 * So the door is the stub. Same chevrons, same perforation, torn down the
 * left. Unpaid it is blank and says what is closed; paid it carries the
 * postmark, because a franked stub is the whole difference between a ticket
 * you are holding and a journey you have taken.
 */

/* the red-and-blue chevrons down an airmail edge, running vertically */
function AirmailSpine({ h }: { h: number }) {
  const bars = Math.ceil(h / 13) + 1;
  return (
    <Svg width={9} height={h}>
      {Array.from({ length: bars }, (_, i) => (
        <Path
          key={i}
          d={`M0 ${i * 13} L9 ${i * 13 + 7} L9 ${i * 13 + 12} L0 ${i * 13 + 5} Z`}
          fill={i % 2 ? P.post : P.pen}
        />
      ))}
    </Svg>
  );
}

/* a franked mark — the same object the courier strikes on a sent letter */
function Franked() {
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={11.2} fill="none" stroke={P.post} strokeWidth={1.6} />
      <Circle cx={13} cy={13} r={7.4} fill="none" stroke={P.post} strokeWidth={0.9} opacity={0.55} />
      {[9.6, 13, 16.4].map((y) => (
        <Path key={y} d={`M5.8 ${y} L20.2 ${y}`} stroke={P.post} strokeWidth={0.9} opacity={0.5} />
      ))}
    </Svg>
  );
}

export function FirstClassStub({
  premium,
  cofounderNo,
  onPress,
}: {
  premium: boolean;
  cofounderNo?: number | null;
  onPress: () => void;
}) {
  const H = 74;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginTop: 16,
        flexDirection: "row",
        borderWidth: 1,
        borderColor: P.ink,
        backgroundColor: P.paper,
        opacity: pressed ? 0.9 : 1,
        overflow: "hidden",
      })}
    >
      <View style={{ height: H, justifyContent: "center" }}>
        <AirmailSpine h={H} />
      </View>

      {/* the tear — a stub is separated from something */}
      <View style={{ width: 1, height: H, borderLeftWidth: 1, borderLeftColor: P.ink12, borderStyle: "dashed", marginLeft: 8 }} />

      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 14 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>
          {t("me.firstClass")}
        </Text>
        <Text style={{ fontFamily: PF.serifItalic, fontSize: 13, lineHeight: 19, color: P.ink60, marginTop: 4 }}>
          {premium
            ? cofounderNo
              ? t("me.fc.founding", { n: String(cofounderNo) })
              : t("me.fc.travelling")
            : t("me.fc.closes")}
        </Text>
      </View>

      <View style={{ width: 74, height: H, alignItems: "center", justifyContent: "center" }}>
        {premium ? (
          <Franked />
        ) : (
          <>
            <WrenBird size={34} mood="curious" />
            <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.pen, marginTop: 2 }}>
              {t("me.fc.see")} ›
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}
