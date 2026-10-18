import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AvatarImage } from "../../../components/AvatarImage";
import { FACES } from "../../../data/aura-avatar-lib";
import { t } from "../../../lib/i18n";
import { Headline, Line, ScreenFrame } from "../parts/frame";
import * as haptics from "../parts/haptics";
import { AcidKey, TextKey } from "../parts/keys";
import { EDGE, OB, SHADOW } from "../parts/tokens";
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
   6 opens with this face in its window and frosts it over (S06Envelope). */

export default function S05Face(props: ObScreenProps) {
  const { draft } = props;
  const list = useMemo(() => (draft.pronoun === "she" ? FACES.filter((a) => a.pool === "f") : draft.pronoun === "he" ? FACES.filter((a) => a.pool === "m") : FACES), [draft.pronoun]);
  const [cardW, setCardW] = useState(0);
  const cols = 4;
  const pad = 10;
  const cell = cardW > 0 ? (cardW - 2 * EDGE - 2 * pad) / cols : 0;
  const face = Math.max(40, Math.min(60, cell - 18));

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
            <ScrollView contentContainerStyle={{ padding: pad, flexDirection: "row", flexWrap: "wrap" }} showsVerticalScrollIndicator={false}>
              {list.map((a) => {
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
                    accessibilityLabel={a.name}
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
      </Animated.View>
    </ScreenFrame>
  );
}
