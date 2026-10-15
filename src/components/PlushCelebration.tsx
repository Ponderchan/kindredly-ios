import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { t, useLang } from "../lib/i18n";
import { C, F } from "../theme/tokens";
import { WrenBird } from "./WrenBird";
import { useWrenSkinControl } from "../lib/wren-skin";
import { getFlags, setFlag } from "../lib/flags";

const FLAG = "plush_celebrated";

/* When you make your first kindred, the Plush look quietly unlocks (the
   milestone gate opens on its own). This surfaces it once, as a gift — the
   emotional payoff of that first reveal. Fires a single time, ever. */
export function PlushCelebration({ kindreds }: { kindreds: number }) {
  useLang();
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
      <View style={{ flex: 1, backgroundColor: "rgba(19,16,32,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
        <Animated.View
          entering={ZoomIn.springify().damping(9).mass(0.8)}
          style={{ backgroundColor: C.cream, borderRadius: 28, paddingTop: 26, paddingBottom: 22, paddingHorizontal: 24, alignItems: "center", width: "100%" }}
        >
          <Animated.Text entering={FadeIn.delay(200)} style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 2, color: C.purple }}>
            {t("pl.newLook")}
          </Animated.Text>
          <View style={{ marginTop: 10 }}>
            <WrenBird size={128} skin="plush" mood="happy" />
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 24, color: C.ink, marginTop: 8, textAlign: "center" }}>
            {t("pl.meetPre")}<Text style={{ color: C.purple }}>{t("skin.plush.name")}</Text>{t("pl.meetPost")}
          </Text>
          <Text style={{ fontFamily: F.serifItalic, fontStyle: "italic", fontSize: 14, color: C.muted, marginTop: 8, textAlign: "center", lineHeight: 21, maxWidth: 300 }}>
            {t("pl.body")}
          </Text>

          <Pressable onPress={wear} style={{ backgroundColor: C.purple, borderRadius: 24, paddingVertical: 15, alignItems: "center", alignSelf: "stretch", marginTop: 20 }}>
            <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 14, letterSpacing: 0.5 }}>{t("pl.wear", { name: t("skin.plush.name") })}</Text>
          </Pressable>
          <Pressable onPress={() => setShow(false)} style={{ alignItems: "center", paddingTop: 12, paddingBottom: 2 }} hitSlop={8}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.faint }}>{t("pl.keep", { name: t("skin.sticker.name") })}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
