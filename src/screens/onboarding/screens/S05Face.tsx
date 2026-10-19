import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AvatarImage } from "../../../components/AvatarImage";
import { FACES } from "../../../data/aura-avatar-lib";
import { t } from "../../../lib/i18n";
import { Headline, Line, ScreenFrame } from "../parts/frame";
import * as haptics from "../parts/haptics";
import { AcidKey, TextKey } from "../parts/keys";
import { EDGE, FONT, OB, OB_MAX_FONT, SHADOW } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import "../../../data/strings-onboarding2";

/* 5 · A FACE (storyboard §6 · 5): "Strangers see frosted glass. A kindred sees this."
   ────────────────────────────────────────────────────────────────────────
   The library's portraits (FACES, the owner's fifty) in a paper grid; a tap
   rings one in acid. The face is for kindreds only: strangers only ever get
   the frosted window generated from your user id, and the face travels at
   the kindred moment. "Later" is the flow's skip (a glyph for now; the
   signing sheet asks again when it matters).

   THE POOL FOLLOWS THE PRONOUN, as the old screen did (the owner approved
   it there): she → the f pool, he → the m pool, they or a skip → both,
   interleaved. What you said one screen ago already answered the question,
   so there are no tabs.

   The grid scrolls inside its card, so the key never moves on any phone;
   the chosen face is ringed in acid with a thin ink ring outside it (acid
   alone on white paper is too faint to read as "picked"). Going on, screen
   6 opens with this face in its window and frosts it over (S06Envelope).

   RANDOM (the owner, 2026-10-19: "还缺个随机"): a dice chip on the card's
   top-right edge, a sticker on the sticker, picks a face from the same pool
   (never the one already picked), rings it and scrolls it into view — for
   whoever would rather not choose. Its word is Edit profile's own Random
   (ep.random), already in all nine languages. */

/** the dice, in the run's ink (it sits on the white chip in every theme the run has) */
function Dice({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={18} height={18} rx={4} fill="none" stroke={OB.ink} strokeWidth={2.2} />
      <Circle cx={8.5} cy={8.5} r={1.9} fill={OB.ink} />
      <Circle cx={15.5} cy={8.5} r={1.9} fill={OB.ink} />
      <Circle cx={12} cy={12} r={1.9} fill={OB.ink} />
      <Circle cx={8.5} cy={15.5} r={1.9} fill={OB.ink} />
      <Circle cx={15.5} cy={15.5} r={1.9} fill={OB.ink} />
    </Svg>
  );
}

export default function S05Face(props: ObScreenProps) {
  const { draft } = props;
  const list = useMemo(() => (draft.pronoun === "she" ? FACES.filter((a) => a.pool === "f") : draft.pronoun === "he" ? FACES.filter((a) => a.pool === "m") : FACES), [draft.pronoun]);
  const [cardW, setCardW] = useState(0);
  const cols = 4;
  const pad = 10;
  const cell = cardW > 0 ? (cardW - 2 * EDGE - 2 * pad) / cols : 0;
  const face = Math.max(40, Math.min(60, cell - 18));
  const scroller = useRef<ScrollView>(null);

  /* a face from this pool, not the one already picked; the grid scrolls so it shows a row above */
  const roll = () => {
    const pool = list.filter((a) => a.id !== draft.avatarId);
    if (!pool.length) return;
    const a = pool[Math.floor(Math.random() * pool.length)];
    haptics.tick();
    props.set({ avatarId: a.id, faceLater: false });
    const row = Math.floor(list.indexOf(a) / cols);
    if (cell > 0) scroller.current?.scrollTo({ y: Math.max(0, (row - 1) * cell), animated: true });
  };

  return (
    <ScreenFrame
      ground="blue"
      back={props.back}
      nest
      primary={<AcidKey label={t("ob2.face.key")} disabled={!props.canAdvance} onPress={() => props.advance()} />}
      secondary={<TextKey label={t("ob2.face.later")} underline on="blue" onPress={props.skip} />}
    >
      <Headline style={{ marginTop: 8 }}>{t("ob2.face.head")}</Headline>
      <Line small>{t("ob2.face.line")}</Line>
      <Animated.View entering={FadeInDown.delay(80).duration(340)} style={{ flex: 1, marginTop: 18, marginBottom: 6, marginRight: SHADOW }} onLayout={(e) => setCardW(e.nativeEvent.layout.width)}>
        <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: 18, backgroundColor: OB.ink }} />
        <View style={{ flex: 1, borderRadius: 18, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: OB.paper, overflow: "hidden" }}>
          {cell > 0 && (
            <ScrollView ref={scroller} contentContainerStyle={{ padding: pad, paddingTop: pad + 14, flexDirection: "row", flexWrap: "wrap" }} showsVerticalScrollIndicator={false}>
              {list.map((a, i) => {
                const on = draft.avatarId === a.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      if (on) return;
                      haptics.tick();
                      props.set({ avatarId: a.id, faceLater: false });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t("a11yob.face", { n: i + 1, total: list.length })}
                    style={{ width: cell, height: cell, alignItems: "center", justifyContent: "center" }}
                  >
                    <View
                      style={{
                        width: face + 12,
                        height: face + 12,
                        borderRadius: (face + 12) / 2,
                        borderWidth: on ? 2 : 0,
                        borderColor: OB.ink,
                        alignItems: "center",
                        justifyContent: "center",
                        transform: [{ scale: on ? 1.04 : 1 }],
                      }}
                    >
                      <View style={{ width: face + 8, height: face + 8, borderRadius: (face + 8) / 2, borderWidth: on ? 4 : 0, borderColor: OB.acid, alignItems: "center", justifyContent: "center" }}>
                        <AvatarImage id={a.id} seed={a.id} size={face} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
        {/* the dice chip, on the card's top-right edge */}
        <Pressable
          onPress={roll}
          accessibilityRole="button"
          accessibilityLabel={t("ep.random")}
          hitSlop={8}
          style={({ pressed }) => ({ position: "absolute", top: -16, right: 14, transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }] })}
        >
          {({ pressed }) => (
            <View>
              {!pressed && <View style={{ position: "absolute", left: 2, top: 2, right: -2, bottom: -2, borderRadius: 999, backgroundColor: OB.ink }} />}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2.5, borderColor: OB.ink, backgroundColor: OB.paper }}>
                <Dice size={16} />
                <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ fontFamily: FONT.bold, fontSize: 13, color: OB.ink }}>
                  {t("ep.random")}
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </ScreenFrame>
  );
}
