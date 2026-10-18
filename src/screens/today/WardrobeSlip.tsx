import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { WardrobeRack } from "../../components/WardrobeRack";
import { WrenBird, type WrenAccessory, type WrenSkin } from "../../components/WrenBird";
import { PaywallBody } from "../../app/paywall";
import { useEntitlement } from "../../lib/entitlement";
import { WARDROBE_SLIP, getFlags, unsetFlag } from "../../lib/flags";
import { t, useLang } from "../../lib/i18n";
import { useScreenInsets } from "../../lib/screen-insets";
import { EMPTY_STATS } from "../../lib/stats";
import { useWrenName } from "../../lib/wren-name";
import { useWrenSkinControl } from "../../lib/wren-skin";
import { ACCESSORY_META, skinUnlocked } from "../../lib/wren-style";
import { AcidKey } from "../onboarding/parts/keys";
import { EDGE, FONT, OB, SHADOW, TYPE } from "../onboarding/parts/tokens";
import { deskGeometry } from "./today-cards";
import type { TodayModel } from "./useTodayDesk";
import "../../data/strings-onboarding2";

/* THE WARDROBE SLIP — the first arrival's "Otis wants a look →" (the new
   onboarding's storyboard §6 "→ Today: the wardrobe slip").
   ────────────────────────────────────────────────────────────────────────
   The new run took the dress step and First Class OUT of the way of the
   first letter (DECISION Q4): neither is ever between a person and their
   first letter. Instead, when the run ends (services.arrive sets the
   WARDROBE_SLIP flag, lib/flags), Today shows one slip from the bird: its
   name, "wants a look →", "try anything on, free", and a × to put it away.

   A tap opens the existing WardrobeRack (tone post) in a page sheet, where
   EVERYTHING tries on — the free pieces and the First Class ones, on the
   bird itself, big. "Keep this look" keeps it; if something First Class is
   on, it opens the existing fare (PaywallBody) first, and the fare's ×
   puts the bird back the way it was when the sheet opened (as it hatched),
   while boarding keeps the look. The flag is cleared the moment the slip is
   opened or put away, so it never comes back.

   WHERE IT SITS. Today is drawn by SwiftUI (TodayNative, one Host for the
   whole desk) with a React Native fallback (TodayRN), and the overlays sit
   over either (TodayOverlays) — so the slip is one of those overlays,
   floating just above the control band (NEXT · Wren · REPLY), over the
   foot of the card, rather than "under the letters" inside the Swift desk:
   a slot of its own in the desk is a KTodayView change (Swift), left for a
   later step. It stays out of the way of the unfolded letter (hidden while
   the reader is open).

   `demo` (the dev preview, app/dev/wardrobe-slip) never reads or clears
   the flag and never dresses the real bird: Keep only logs. */

/** The slip over Today, when the run's arrival asked for it. */
export function TodayWardrobeSlip({ model }: { model: TodayModel }) {
  const insets = useScreenInsets();
  const { height: hostH } = useWindowDimensions();
  const { controlTop } = deskGeometry({ hostH, safeTop: insets.top, tabBarRoom: insets.tabBarRoom });
  const [want, setWant] = useState(false);
  useEffect(() => {
    let alive = true;
    void getFlags().then((f) => alive && setWant(!!f[WARDROBE_SLIP]));
    return () => {
      alive = false;
    };
  }, []);
  if (!want || model.view.readerId != null) return null;
  const done = () => {
    setWant(false);
    void unsetFlag(WARDROBE_SLIP);
  };
  return <WardrobeSlip bottom={hostH - controlTop + 10} onSeen={done} />;
}

/** The slip itself, and the sheet it opens. `onSeen`: it was opened or put away (clear the flag). */
export function WardrobeSlip({ bottom, onSeen, demo = false }: { bottom: number; onSeen?: () => void; demo?: boolean }) {
  useLang();
  const name = useWrenName();
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone && !open) return null;
  return (
    <>
      {!gone && (
        <Animated.View entering={FadeInDown.delay(500).duration(360)} exiting={FadeOut.duration(160)} style={{ position: "absolute", left: 16, right: 16, bottom }}>
          <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: 18, backgroundColor: OB.ink }} />
          <View style={{ borderRadius: 18, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: "#FFF3D6", flexDirection: "row", alignItems: "center", paddingLeft: 10, paddingRight: 4, minHeight: 64 }}>
            <Pressable
              onPress={() => {
                setGone(true);
                setOpen(true);
                onSeen?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={`${t("ob2.slip.title", { name })} ${t("ob2.slip.sub")}`}
              style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}>
                <WrenBird size={46} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text numberOfLines={1} style={{ fontFamily: FONT.bold, fontSize: 16.5, color: OB.ink }}>
                  {t("ob2.slip.title", { name })}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 13, color: OB.inkSoft, marginTop: 1 }}>
                  {t("ob2.slip.sub")}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                setGone(true);
                onSeen?.();
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("ob2.slip.close")}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M5 5l14 14M19 5L5 19" stroke={OB.inkSoft} strokeWidth={2.6} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
        </Animated.View>
      )}
      <WardrobeSheet open={open} name={name} demo={demo} onClose={() => setOpen(false)} />
    </>
  );
}

/** The rack in a page sheet: everything tries on; Keep (through the fare when First Class is on). */
function WardrobeSheet({ open, name, demo, onClose }: { open: boolean; name: string; demo: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const ctl = useWrenSkinControl();
  const { premium } = useEntitlement();
  const [look, setLook] = useState<WrenSkin>(ctl.skin);
  const [dress, setDress] = useState<WrenAccessory>(ctl.accessory);
  const [fare, setFare] = useState(false);
  // each opening starts from the bird as it is now
  useEffect(() => {
    if (!open) return;
    setLook(ctl.skin);
    setDress(ctl.accessory);
    setFare(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const lookOpen = skinUnlocked(look, EMPTY_STATS, premium);
  const dressOpen = !!ACCESSORY_META.find((a) => a.id === dress)?.free || premium;
  const firstClass = !lookOpen || !dressOpen;

  const keep = (l: WrenSkin, d: WrenAccessory) => {
    if (demo) console.log("[wardrobe slip demo] would keep", l, d, "— the real bird is not dressed");
    else {
      ctl.pick(l);
      ctl.dress(d);
    }
    onClose();
  };
  const what = !lookOpen && !dressOpen ? t("ob.fare.both") : !lookOpen ? t("ob.fare.look") : t("ob.fare.dress");

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {fare ? (
        <PaywallBody
          sheet
          source="onboarding_dress"
          courier={name}
          head={t("ob.fare.head", { what })}
          lead={t("ob2.slip.fareLead", { name })}
          // × : the bird goes back the way it was when the sheet opened (as it hatched)
          onClose={onClose}
          onDone={() => keep(look, dress)}
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: OB.shell }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 22, paddingRight: 8, paddingTop: 14 }}>
            <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontFamily: FONT.head, fontSize: 22, letterSpacing: -0.5, color: OB.ink }}>
              {t("ob2.slip.head", { name })}
            </Text>
            <Pressable onPress={onClose} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("ob2.slip.close")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M5 5l14 14M19 5L5 19" stroke={OB.ink} strokeWidth={2.6} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
          <Text style={[TYPE.lineSmall, { color: OB.inkSoft, paddingHorizontal: 22, marginTop: 2 }]}>{t("ob2.slip.line")}</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: "center", marginVertical: 14 }}>
              <WrenBird size={150} skin={look} accessory={dress} mood="happy" />
            </View>
            <WardrobeRack tone="post" skin={look} accessory={dress} stats={EMPTY_STATS} premium={premium} onLook={(id) => setLook(id)} onDress={(id) => setDress(id)} />
          </ScrollView>
          <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
            <AcidKey label={t("ob2.slip.keep")} onPress={() => (firstClass ? setFare(true) : keep(look, dress))} />
          </View>
        </View>
      )}
    </Modal>
  );
}
