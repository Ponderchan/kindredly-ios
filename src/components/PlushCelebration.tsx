import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { t, useLang } from "../lib/i18n";
import { PFM } from "../theme/post";
import { scrimColor, useTheme } from "../lib/theme";
import { WrenBird } from "./WrenBird";
import { useWrenSkinControl } from "../lib/wren-skin";
import { getFlags, setFlag } from "../lib/flags";

const FLAG = "plush_celebrated";

/* When you make your first kindred, the Plush look quietly unlocks (the
   milestone gate opens on its own). This surfaces it once, as a gift — the
   emotional payoff of that first reveal. Fires a single time, ever.
   The card is the theme's, the old C palette read by role: the cream card
   is the card face (sf), purple is ind, the body line is sub, the quiet
   "keep" link is mute, and the button's label is the page colour. The dim
   behind it stays a fixed scrim; the Plush bird keeps her own colours.
   On Midnight the scrim is black (lib/theme scrimColor) — the fixed one
   barely moves the dark page — and the card takes a 1.5 ln frame, since
   sf against the dimmed page is 1.2:1 and the card would have no edge.
   Type: the eyebrow is a label (SF Mono), everything else system. */
export function PlushCelebration({ kindreds }: { kindreds: number }) {
  useLang();
  const { t: tk, dark } = useTheme();
  const { pick } = useWrenSkinControl();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    if (kindreds < 1) return;
    getFlags().then((f) => {
      if (!alive || f[FLAG]) return;
      void setFlag(FLAG);
      setShow(true);
    });
    return () => {
      alive = false;
    };
  }, [kindreds]);

  const wear = () => {
    pick("plush");
    setShow(false);
  };

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
      <View style={{ flex: 1, backgroundColor: dark ? scrimColor(true, 0.55) : "rgba(19,16,32,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
        <Animated.View
          entering={ZoomIn.springify().damping(9).mass(0.8)}
          style={{ backgroundColor: tk.sf, borderRadius: 28, borderWidth: dark ? 1.5 : 0, borderColor: tk.ln, paddingTop: 26, paddingBottom: 22, paddingHorizontal: 24, alignItems: "center", width: "100%" }}
        >
          <Animated.Text entering={FadeIn.delay(200)} style={{ ...PFM.monoSemi, fontSize: 11, letterSpacing: 2, color: tk.ind }}>
            {t("pl.newLook")}
          </Animated.Text>
          <View style={{ marginTop: 10 }}>
            <WrenBird size={128} skin="plush" mood="happy" />
          </View>
          <Text style={{ fontWeight: "700", fontSize: 24, color: tk.ink, marginTop: 8, textAlign: "center" }}>
            {t("pl.meetPre")}<Text style={{ color: tk.ind }}>{t("skin.plush.name")}</Text>{t("pl.meetPost")}
          </Text>
          <Text style={{ fontSize: 14, color: tk.sub, marginTop: 8, textAlign: "center", lineHeight: 21, maxWidth: 300 }}>
            {t("pl.body")}
          </Text>

          <Pressable onPress={wear} style={{ backgroundColor: tk.ind, borderRadius: 24, paddingVertical: 15, alignItems: "center", alignSelf: "stretch", marginTop: 20 }}>
            <Text style={{ color: tk.bg, fontWeight: "700", fontSize: 15 }}>{t("pl.wear", { name: t("skin.plush.name") })}</Text>
          </Pressable>
          <Pressable onPress={() => setShow(false)} style={{ alignItems: "center", paddingTop: 12, paddingBottom: 2 }} hitSlop={8}>
            <Text style={{ fontWeight: "600", fontSize: 13, color: tk.mute }}>{t("pl.keep", { name: t("skin.sticker.name") })}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
