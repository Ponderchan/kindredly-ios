import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { t, useLang } from "../lib/i18n";
import { PFM } from "../theme/post";
import { scrimColor, useTheme } from "../lib/theme";
import { WrenBird } from "./WrenBird";
import { useWrenSkinControl } from "../lib/wren-skin";
import { claimFlag } from "../lib/flags";
import { useBirdImageRef } from "../lib/bird-images";
import { NativeSurface, SurfaceHost } from "./NativeSurface";
import { rgbaParts } from "./shared-sheets-model";
import { KPlushView } from "../../modules/kindredly-ui";

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
   Type: the eyebrow is a label (SF Mono), everything else system.

   SWIFT OR REACT NATIVE (batch 3, 2026-11-09). With the "plush" switch on
   and KPlushView in the binary, SwiftUI draws the dim and the card
   (PlushNative: modules/kindredly-ui Portable/Moments/KPlushCelebration.swift,
   the Plush bird a snapshot, lib/bird-images "plush128") inside the same
   window-level Modal, so the fade in and out is still the Modal's; otherwise
   React Native (PlushRN), exactly as it was. Either way this decides when it
   shows (the flag) and what the two keys do. NativeSurface in mount mode,
   mounted from the first time it shows (before that nothing is on screen
   either way), so the crash breadcrumb is armed then, not on every visit to
   Kindreds or Me. Kindreds and Me both mount this; the props are unchanged. */
export function PlushCelebration({ kindreds }: { kindreds: number }) {
  useLang();
  const { pick } = useWrenSkinControl();
  const [show, setShow] = useState(false);
  // it has shown in this mount: from then on the switch has chosen, and the Modal can fade out
  const [shown, setShown] = useState(false);
  if (show && !shown) setShown(true);

  useEffect(() => {
    let alive = true;
    if (kindreds < 1) return;
    /* claimed, not read-then-set: Kindreds and Me both mount this, and right after a sign-in both
       asked at once, both found no flag and both showed it; and the flag, written in the same
       moment as another one, could be lost, so it showed again on the next visit (owner,
       2026-11-13: "点到me tab 那个meet mist 又跳出拉了"). One claim wins (lib/flags claimFlag). */
    void claimFlag(FLAG).then((won) => {
      if (alive && won) setShow(true);
    });
    return () => {
      alive = false;
    };
  }, [kindreds]);

  const wear = () => {
    pick("plush");
    setShow(false);
  };
  const keep = () => setShow(false);

  if (!shown) return null;
  return (
    <NativeSurface
      surface="plush"
      view="KPlushView"
      mode="mount"
      native={() => <PlushNative show={show} onWear={wear} onKeep={keep} />}
      fallback={() => <PlushRN show={show} onWear={wear} onKeep={keep} />}
      // a frame or two while the breadcrumb is written: nothing yet, as before the Modal fades in
      pending={() => null}
    />
  );
}

/** The dim and the card in SwiftUI, filling a Host in the same Modal. */
function PlushNative({ show, onWear, onKeep }: { show: boolean; onWear: () => void; onKeep: () => void }) {
  useLang();
  const { key: theme, dark } = useTheme();
  const bird = useBirdImageRef("plush128");
  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onKeep}>
      <SurfaceHost>
        <KPlushView
          theme={theme}
          dim={rgbaParts(dark ? scrimColor(true, 0.55) : "rgba(19,16,32,0.55)")}
          strings={{
            eyebrow: t("pl.newLook"),
            meetPre: t("pl.meetPre"),
            meetName: t("skin.plush.name"),
            meetPost: t("pl.meetPost"),
            body: t("pl.body"),
            wear: t("pl.wear", { name: t("skin.plush.name") }),
            keep: t("pl.keep", { name: t("skin.sticker.name") }),
          }}
          bird={bird}
          onWear={onWear}
          onKeep={onKeep}
        />
      </SurfaceHost>
    </Modal>
  );
}

/** The React Native card (the "plush" switch's fallback), exactly as it was. */
function PlushRN({ show, onWear, onKeep }: { show: boolean; onWear: () => void; onKeep: () => void }) {
  useLang();
  const { t: tk, dark } = useTheme();
  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onKeep}>
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

          <Pressable onPress={onWear} style={{ backgroundColor: tk.ind, borderRadius: 24, paddingVertical: 15, alignItems: "center", alignSelf: "stretch", marginTop: 20 }}>
            <Text style={{ color: tk.bg, fontWeight: "700", fontSize: 15 }}>{t("pl.wear", { name: t("skin.plush.name") })}</Text>
          </Pressable>
          <Pressable onPress={onKeep} style={{ alignItems: "center", paddingTop: 12, paddingBottom: 2 }} hitSlop={8}>
            <Text style={{ fontWeight: "600", fontSize: 13, color: tk.mute }}>{t("pl.keep", { name: t("skin.sticker.name") })}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
