import { useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FirstFlight, type FlightColors } from "../../../components/FirstFlight";
import { t } from "../../../lib/i18n";
import { AcidKey, TextKey } from "../parts/keys";
import { EDGE, FONT, GUTTER, OB, SHADOW, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { PlainEnvelope } from "./s08-envelope";
import { Chick } from "./s10-chick";
import { useHatchRead } from "./s09-read";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* SCREEN 13 · THE KNOCK — the soft pre-ask, from the bird you named
   (storyboard §6 · 13, §8).
   ────────────────────────────────────────────────────────────────────────
   The flight has landed: the chart behind it dims (FirstFlight `still`,
   the landed frame, plus a light ink veil), the chick stands over the
   three envelopes it brought back, and it asks, in a speech card, ONCE:
   "Want me to knock when someone writes back?" / "A knock when someone
   replies, and one at 8 if post is waiting. Quiet at night." — every claim
   true of the shipped push (replies knock; the 8 o'clock knock when post
   waits; replies hold through the night's quiet hours), and the two-switch
   rule (no list of kinds). Signed "— Otis".

   ONLY "YES, KNOCK" SPENDS iOS's ONE-TIME PROMPT: it is advance(), and the
   runner asks iOS (turnNotificationsOn("ask"), which also registers the
   token and plans the local lines) — in DEMO it is only logged. "Not now"
   is skip(): nothing is asked of iOS (the next offer is the first real
   reply's card, and Kindreds' banner). Already allowed: the flow skips
   this screen. Refused before (a reinstall): the line reads "Turn them on
   in Settings and I'll knock." and Yes opens Kindredly's settings. Either
   way the run ends here and Today's first arrival dissolves in. */

const COLORS: FlightColors = { ground: OB.shell, ink: OB.ink, sub: OB.inkSoft, faint: OB.inkSoft, card: OB.paper, accent: OB.blue };

export default function S13Knock(props: ObScreenProps) {
  const { draft } = props;
  const insets = useSafeAreaInsets();
  const { form, mood } = useHatchRead(draft.letter);
  const her = draft.wrenName.trim() || t("ob2.name.ph");
  const refused = props.ctx.notif === "settings";
  const left = useRef(false);
  const once = (f: () => void) => () => {
    if (left.current) return;
    left.current = true;
    f();
  };

  return (
    <View style={{ flex: 1 }}>
      {/* the landed chart, dimmed */}
      <FirstFlight still her={her} opener="" stops={[]} colors={COLORS} onDone={() => {}} />
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(30,27,53,0.10)" }} />

      {/* a scroll view, though it never scrolls at the usual text sizes: at the accessibility
          sizes the card outgrows the screen, and "Not now" must stay reachable (a real "Not now"
          is the whole point of the soft pre-ask — without it the only key left is the one that
          spends iOS's prompt) */}
      <ScrollView
        style={{ flex: 1 }}
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingHorizontal: GUTTER, justifyContent: "center" }}
      >
        {/* the chick over what it brought back */}
        <Animated.View entering={FadeIn.duration(260)} style={{ flexDirection: "row", alignItems: "flex-end", marginLeft: 4 }}>
          <Chick shell={draft.shell} form={form} mood="delight" size={96} />
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginLeft: -18, marginBottom: 8 }}>
            <PlainEnvelope width={58} tilt={-8} />
            <View style={{ marginLeft: -6, marginBottom: -4 }}>
              <PlainEnvelope width={58} tilt={4} />
            </View>
            <View style={{ marginLeft: -6, marginBottom: 6 }}>
              <PlainEnvelope width={58} tilt={-3} />
            </View>
          </View>
        </Animated.View>

        {/* its speech card */}
        <Animated.View entering={FadeInDown.delay(120).duration(360).easing(Easing.out(Easing.cubic))} style={{ marginTop: 22, marginRight: SHADOW }}>
          {/* the tail, pointing up at the chick */}
          <View style={{ position: "absolute", left: 52, top: -12, width: 22, height: 22, backgroundColor: OB.paper, borderLeftWidth: EDGE, borderTopWidth: EDGE, borderColor: OB.ink, transform: [{ rotate: "45deg" }], zIndex: 2 }} />
          <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: 22, backgroundColor: OB.ink }} />
          <View style={{ borderRadius: 22, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: OB.paper, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14 }}>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" style={{ fontFamily: FONT.head, fontSize: 25, lineHeight: 30, letterSpacing: -0.6, color: OB.ink }}>
              {t("ob2.knock.head")}
            </Text>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.lineSmall, { color: OB.inkSoft, marginTop: 8 }]}>{refused ? t("ob2.knock.settings") : t("ob2.knock.line")}</Text>
            <View style={{ marginTop: 22 }}>
              <AcidKey label={t("ob2.knock.yes")} onPress={once(() => props.advance())} />
            </View>
            <TextKey label={t("ob2.knock.no")} on="paper" underline onPress={once(props.skip)} style={{ marginTop: 6 }} />
            <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ alignSelf: "flex-end", fontFamily: FONT.letterItalic, fontSize: 16, color: OB.inkSoft, marginTop: 2 }}>{t("ob2.knock.sign", { name: her })}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
