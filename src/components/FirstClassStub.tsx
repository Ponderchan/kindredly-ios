import { View, Text, Pressable } from "react-native";
import { PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { t } from "../lib/i18n";
import { useWrenName } from "../lib/wren-name";
import { W14, cardShadow } from "./AuraCard";

/* FIRST CLASS — the cream card with the gold stamp (owner's Me sheet).
   Under the aura: a gold dot, FIRST CLASS, the line about what it opens,
   two short lines of what is inside, a dark pill to the boarding pass,
   and the stamp itself on the right — dashed gold, tilted, the courier on
   it. Paid, the same card says you are travelling. */

export function FirstClassStub({
  premium,
  cofounderNo,
  onPress,
}: {
  premium: boolean;
  cofounderNo?: number | null;
  onPress: () => void;
}) {
  const wren = useWrenName();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ marginTop: 12, backgroundColor: "#FFFCF3", borderRadius: 18, paddingVertical: 16, paddingLeft: 18, paddingRight: 16, flexDirection: "row", alignItems: "center", gap: 14, overflow: "hidden", opacity: pressed ? 0.92 : 1 }, cardShadow]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: W14.gold }} />
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 2.2, color: W14.goldInk }}>{t("me.firstClass")}</Text>
        </View>
        <Text style={{ fontFamily: PF.serif, fontSize: 18.5, lineHeight: 23, color: W14.ink, marginTop: 8 }} numberOfLines={2}>
          {premium ? (cofounderNo ? t("me.fc.founding", { n: String(cofounderNo) }) : t("fc.paidHead")) : t("fc.stubHead")}
        </Text>
        <Text style={{ fontFamily: PF.letter, fontSize: 12.5, lineHeight: 18, color: "rgba(30,27,53,0.6)", marginTop: 6 }}>
          {premium ? t("fc.paidSub") : `${t("fc.stubSub1")}\n${t("fc.stubSub2", { wren })}`}
        </Text>
        <View style={{ alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: W14.ink }}>
          <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 12, color: "#FFFFFF" }}>{premium ? t("fc.paidCta") : t("fc.stubCta")} →</Text>
        </View>
      </View>

      {/* the stamp */}
      <View style={[{ width: 68, height: 78, backgroundColor: "#FBF9FF", borderWidth: 2, borderStyle: "dashed", borderColor: W14.gold, borderRadius: 4, alignItems: "center", justifyContent: "center", gap: 4, transform: [{ rotate: "6deg" }] }, cardShadow, { shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }]}>
        <WrenBird size={36} mood={premium ? "delight" : "curious"} stage="wren" />
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: W14.goldInk }}>{premium ? t("fc.member") : "1ST"}</Text>
      </View>
    </Pressable>
  );
}
