import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { PF } from "../theme/post";
import { BRAND } from "../theme/themes";
import { WrenBird } from "./WrenBird";

/* FIRST CLASS — the cream card with the gold stamp (10a, H:84; the React
   Native twin of KFirstClassCard's .card, for the Me fallback).
   ────────────────────────────────────────────────────────────────────────
   Cream paper with a 2pt cream border, corners of 24, padding 18 18 16, 14
   between the words and the stamp. The words, 8 apart: a wax-gold dot and
   FIRST CLASS (mono 600 10 at .16em, gold), the headline in Newsreader
   24/1.15 (the owner's default serif, never the Letter font: it isn't a
   letter), what it brings in system 13/1.5, and the call to action as an
   ink pill. The stamp: 78 × 96, white, a 2pt dotted wax-gold edge, turned
   4°, the courier grown (stage "wren", whatever hers is: the stamp is the
   fare, not her) over 1ST or MEMBER.

   Brand colours, the same in every theme (owner: 10a cream). Every word
   comes in from the Me model (screens/me/me-model buildFirstClass): the
   owner's copy, "Rooms that never close · voice letters / {wren}'s full
   wardrobe", never "More Kindreds" or "a monthly reading" (Apple 2.3.2). */
export function FirstClassStub({
  eyebrow,
  headline,
  sub,
  cta,
  stampLabel,
  member,
  onPress,
  style,
}: {
  eyebrow: string;
  headline: string;
  /** may hold a line break */
  sub: string;
  cta: string;
  /** 1ST, or MEMBER */
  stampLabel: string;
  /** a member: the delighted bird (else the curious one) */
  member: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[eyebrow, headline, sub.replace(/\n/g, ". "), cta].join(". ")}
      style={({ pressed }) => [
        {
          backgroundColor: BRAND.cream,
          borderWidth: 2,
          borderColor: BRAND.creamBorder,
          borderRadius: 24,
          paddingTop: 18,
          paddingHorizontal: 18,
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 14,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND.waxGold }} />
          <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.6, color: BRAND.goldText }}>
            {eyebrow.toLocaleUpperCase()}
          </Text>
        </View>
        <Text style={{ fontFamily: PF.letterSerif, fontSize: 24, lineHeight: 27.6, color: BRAND.inkOnBrand }}>{headline}</Text>
        <Text style={{ fontSize: 13, lineHeight: 19.5, color: BRAND.subOnCream }}>{sub}</Text>
        <View style={{ alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: BRAND.inkOnBrand }}>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: BRAND.paperWhite }}>
            {cta}
          </Text>
        </View>
      </View>

      {/* the stamp */}
      <View
        style={{
          width: 78,
          height: 96,
          borderRadius: 8,
          borderWidth: 2,
          borderStyle: "dotted",
          borderColor: BRAND.waxGold,
          backgroundColor: BRAND.paperWhite,
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          transform: [{ rotate: "4deg" }],
        }}
      >
        <WrenBird size={43} mood={member ? "delight" : "curious"} stage="wren" />
        <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 0.9, color: BRAND.goldText }}>
          {stampLabel}
        </Text>
      </View>
    </Pressable>
  );
}
