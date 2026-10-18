import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { LineIcon } from "../../../components/10a/LineIcon";
import { t } from "../../../lib/i18n";
import type { PronounId } from "../../../lib/pronouns";
import { Headline, Line, ScreenFrame } from "../parts/frame";
import * as haptics from "../parts/haptics";
import { TextKey } from "../parts/keys";
import { EDGE, FONT, OB, SHADOW, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { useGlyphFlight } from "./s03-glyph-flight";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* 4 · SHE, HE, OR THEY (storyboard §6 · 4).
   ────────────────────────────────────────────────────────────────────────
   Three big chips — she / her ♀, he / him ♂, they / them — and ONE TAP picks
   and moves on (after the 300 ms the storyboard gives it, which is the ♀ or
   ♂ flying into the egg's glow: s03-glyph-flight). "Skip, say they" is the
   text key (the flow's skip: they, no mark). Everyone is asked now, guests
   too (identity plan §1a updated), so a guest who picks she/he can show the
   mark.

   What the line promises is exactly what happens: your bird gets you right
   (the app's pronoun for you), and she or he puts a small ♀ or ♂ by your
   name; they shows nothing. It never says the answer is "only" used for
   anything (it also reaches the matcher quietly, as the privacy policy
   discloses). The mark's switch is on screen 6, beside its preview.

   The chips are the run's: white outlined on the blue; the picked one turns
   acid with an ink edge and a hard shadow, like every primary thing. Coming
   back to this screen shows your earlier answer picked; tapping it again
   goes on again. Reduce Motion: no flight, the same 300 ms pause. */

const CHIPS: { id: PronounId; key: string; glyph: "she" | "he" | null }[] = [
  { id: "she", key: "ob2.pronoun.she", glyph: "she" },
  { id: "he", key: "ob2.pronoun.he", glyph: "he" },
  { id: "they", key: "ob2.pronoun.they", glyph: null },
];

export default function S04Pronoun(props: ObScreenProps) {
  const reduce = useReducedMotion();
  const { overlay, fly } = useGlyphFlight();
  const glyphs = useRef<Record<string, View | null>>({});
  const leaving = useRef(false);
  const picked = props.draft.pronounSkipped ? null : props.draft.pronoun;

  const pick = (c: (typeof CHIPS)[number]) => {
    if (leaving.current) return;
    leaving.current = true;
    haptics.tick();
    props.set({ pronoun: c.id, pronounSkipped: false });
    const go = () => props.advance({ pronoun: c.id, pronounSkipped: false });
    if (c.glyph && !reduce) fly(glyphs.current[c.id] ?? null, c.glyph, OB.ink, go, 22);
    else setTimeout(go, 300);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenFrame
        ground="blue"
        back={props.back}
        nest
        primary={
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: OB.white, textAlign: "center" }]} accessibilityElementsHidden importantForAccessibility="no">
            {t("ob2.pronoun.hint")}
          </Text>
        }
        secondary={<TextKey label={t("ob2.pronoun.skip")} underline on="blue" onPress={() => !leaving.current && props.skip()} />}
      >
        <Headline style={{ marginTop: 8 }}>{t("ob2.pronoun.head")}</Headline>
        <Line small>{t("ob2.pronoun.line")}</Line>
        <View style={{ gap: 14, marginTop: 24, marginRight: SHADOW }}>
          {CHIPS.map((c, i) => {
            const on = picked === c.id;
            const ink = on ? OB.ink : OB.white;
            return (
              <Animated.View key={c.id} entering={FadeInDown.delay(60 + i * 50).duration(320)}>
                <Pressable
                  onPress={() => pick(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t(c.key)}
                  style={({ pressed }) => ({ height: 56, transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }] })}
                >
                  {on && <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: 14, backgroundColor: OB.ink }} />}
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 18,
                      borderRadius: 14,
                      borderWidth: on ? EDGE : 2,
                      borderColor: on ? OB.ink : OB.white,
                      backgroundColor: on ? OB.acid : "transparent",
                    }}
                  >
                    <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ flex: 1, fontFamily: FONT.semi, fontSize: 17, color: ink }}>{t(c.key)}</Text>
                    {c.glyph && (
                      <View ref={(r) => void (glyphs.current[c.id] = r)} collapsable={false}>
                        <LineIcon name={c.glyph} size={22} stroke={2} color={ink} />
                      </View>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScreenFrame>
      {overlay}
    </View>
  );
}
