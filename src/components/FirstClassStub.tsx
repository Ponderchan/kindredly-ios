import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { PFM } from "../theme/post";
import { BRAND } from "../theme/themes";
import type { FirstClass4aVM } from "../screens/me/me-model";
import { WrenBird } from "./WrenBird";

/* FIRST CLASS — the 4a card (the React Native twin of Swift
   KMeFirstClassCard, KMeScreen.swift; FC2 §4.9: every old First Class card
   or stub becomes this one, members see the member state).
   ────────────────────────────────────────────────────────────────────────
   Cream paper (brand colours, the same in every theme): a 1.5 cream-border
   outline, corners of 24, padding 18 18 16, 14 between its parts:
   - the eyebrow: a 7pt wax-gold dot and FIRST CLASS in mono 10 at .18em, gold;
   - the headline in System semibold 26/1.1, 100 clear on the right for the stamp;
   - the rows in system 14 (7 apart), each after a 16 gold check at stroke
     2.6, also 100 clear;
   - the foot: an ink button 40 tall (padding 0 16, corners 14, system 600
     14 in white) and, at the far right, the trial (7 DAYS FREE) in mono 10
     at .1em, gold, only when a real free trial is on offer;
   - the stamp, 16 from the right and 18 from the top, turned 5°: 82 × 100,
     white, corners 4, a 2pt dotted wax-gold edge, 5 of padding round a cream
     face with the bird at 70% and 1ST / MEMBER in mono 600 8, gold, at its
     bottom right.
   The whole card is one button and one VoiceOver element. Every word comes
   from me-model buildFirstClass4a. */
export function FirstClassCard({
  card,
  onPress,
  style,
}: {
  card: FirstClass4aVM;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const label = [card.eyebrow, card.headline, card.rows.join(", "), card.trial].filter((s) => !!s).join(". ");
  const hint = card.cta.replace(/→/g, "").trim();
  const stampW = 82;
  const stampH = 100;
  // RN's width holds the 2 border + 5 padding each side: the face is 68 × 86
  const innerW = stampW - 14;
  const innerH = stampH - 14;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [
        {
          backgroundColor: BRAND.cream,
          borderWidth: 1.5,
          borderColor: BRAND.creamBorder,
          borderRadius: 24,
          paddingTop: 18,
          paddingHorizontal: 18,
          paddingBottom: 16,
          gap: 14,
          overflow: "hidden",
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: BRAND.waxGold }} />
        <Text numberOfLines={1} style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.8, color: BRAND.goldText }}>
          {card.eyebrow.toLocaleUpperCase()}
        </Text>
      </View>
      <Text style={{ fontSize: 26, lineHeight: 28.6, fontWeight: "600", color: BRAND.inkOnBrand, paddingRight: 100 }}>
        {card.headline}
      </Text>
      <View style={{ gap: 7, paddingRight: 100 }}>
        {card.rows.map((row, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Svg width={16} height={16} viewBox="0 0 24 24" style={{ marginTop: 2 }}>
              <Path d="M5 13l4 4L19 7" stroke={BRAND.goldText} strokeWidth={2.6 * 1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
            <Text style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, color: BRAND.inkOnBrand }}>{row}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
        <View style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 14, backgroundColor: BRAND.inkOnBrand, justifyContent: "center", flexShrink: 1 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 14, fontWeight: "600", color: BRAND.paperWhite }}>
            {card.cta}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        {card.trial ? (
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1, color: BRAND.goldText, flexShrink: 1 }}>
            {card.trial}
          </Text>
        ) : null}
      </View>

      {/* the stamp */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: "absolute",
          top: 18,
          right: 16,
          width: stampW,
          height: stampH,
          padding: 5,
          borderRadius: 4,
          borderWidth: 2,
          borderStyle: "dotted",
          borderColor: BRAND.waxGold,
          backgroundColor: BRAND.paperWhite,
          transform: [{ rotate: "5deg" }],
        }}
      >
        <View
          style={{
            width: innerW,
            height: innerH,
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor: BRAND.cream,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WrenBird size={Math.round(innerW * 0.7)} mood={card.member ? "delight" : "curious"} stage="wren" />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1}
            style={{ position: "absolute", right: 5, bottom: 4, ...PFM.monoSemi, fontSize: 8, color: BRAND.goldText }}
          >
            {card.stampLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
