import { useWrenName } from "../lib/wren-name";
import { stickerName, titleName } from "../lib/sticker-copy";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library/legacy";
import { P, PF } from "../theme/post";
import { useTheme } from "../lib/theme";
import { BackChevron } from "../components/10a/BackChevron";
import { AuraTicket, W14, dear } from "../components/AuraCard";
import { ShareIcon } from "../components/Icons";
import { WrenBird } from "../components/WrenBird";
import { myAura, type Aura } from "../lib/aura";
import { useAuth } from "../lib/auth";
import { t, useLang } from "../lib/i18n";
import "../data/strings-a11y-sheets";
import { NativeSurface } from "../components/NativeSurface";
import { AuraShareNative } from "../screens/aura/AuraShareNative";

/* YOUR WRITING AURA — the share screen (owner's sheet).
   The card on the light ground, then two acts: share it, or save it to
   your photos. Both leave with the card as an IMAGE — the title, the
   scene, the sticker names — never a line from a letter. The text that
   rides along with a share is the card's own words.

   The card is a fixed object: the white ticket and the 6pt of lavender
   captured around it are the picture, so they are the same in every theme
   and so is the PNG. The page around it is chrome. The light themes keep
   the sheet as drawn (the lavender page, the Share key, the white
   Save key); in Midnight a lavender page would be a daylight slab in a
   dark app — with the status bar's light text over it — so there the
   chrome takes the theme: the page, a lav Save key, mute captions
   (5.86:1 on bg). The header and the Save label are tk.ink in every
   theme: in the light ones that is W14.ink. The keys are flat (owner's
   rule B, 2026-10-26): Share is the ind capsule, Save a soft capsule
   with no edge (white on the lavender page, lav in Midnight).
   (The stack slides it in on the same ground: app/_layout, P.penWash in
   the light themes and tk.bg in Midnight.) */

/* 2026-10-26 (owner: ships in 1.0.7): the share card is drawn in Swift (screens/aura/
   AuraShareNative, KAuraShareView: Swift draws the card and makes its picture), with the React
   Native page below as the remote switch's fallback ("auracard" in app_surfaces, NativeSurface
   in mount mode), its behaviour untouched. While it chooses, the page's own ground. */
export default function AuraShareCard() {
  const { t: tk, dark } = useTheme();
  const ground = dark ? tk.bg : P.penWash;
  return (
    <View style={{ flex: 1, backgroundColor: ground }}>
      <NativeSurface
        surface="auracard"
        view="KAuraShareView"
        mode="mount"
        native={() => <AuraShareNative />}
        fallback={() => <AuraShareCardRN />}
        pending={() => <View style={{ flex: 1, backgroundColor: ground }} />}
      />
    </View>
  );
}

/* the React Native page, unchanged */
export function AuraShareCardRN() {
  useLang();
  const { t: tk, dark } = useTheme();
  const ui = dark
    ? { page: tk.bg, saveKey: tk.lav, note: tk.mute }
    : { page: P.penWash, saveKey: "#FFFFFF", note: W14.grey };
  const router = useRouter();
  const wren = useWrenName();
  const { user, profile, handle } = useAuth();
  const [aura, setAura] = useState<Aura | null>(null);
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const card = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      myAura((profile?.firstLine as string) || null).then((a) => alive && setAura(a));
      return () => {
        alive = false;
      };
    }, [profile?.firstLine]),
  );

  const done = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"));

  /* the card, rendered to a PNG at the screen's scale */
  const snapshot = async (): Promise<string | null> => {
    if (!card.current) return null;
    return await captureRef(card.current, { format: "png", quality: 1, result: "tmpfile" });
  };
  const cardWords = () => {
    if (!aura) return "";
    const held = (aura.stickers?.home ?? []).slice(0, 3).map((s) => stickerName(s.stickerId).toLowerCase());
    return aura.phase === "formed"
      ? t("ac.shareTitle", { title: dear(titleName(aura.stickers?.title)), name: wren })
      : t("ac.shareStickers", { list: held.length ? held.join(", ") : "—", name: wren });
  };
  const share = async () => {
    if (!aura || busy) return;
    setBusy("share");
    const uri = await snapshot().catch(() => null);
    setBusy(null);
    void Share.share(uri ? { url: uri, message: cardWords() } : { message: cardWords() });
  };
  const save = async () => {
    if (!aura || busy) return;
    setBusy("save");
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        Alert.alert(t("ac.saveDenied"), t("ac.saveDeniedBody"));
        return;
      }
      const uri = await snapshot();
      if (!uri) throw new Error("no snapshot");
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t("ac.saved"), t("ac.savedBody"));
    } catch {
      Alert.alert(t("ac.saveFailed"), t("ac.saveFailedBody"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ui.page }} edges={["top"]}>
      <View style={{ height: 52, paddingBottom: 8, flexDirection: "row", alignItems: "center", paddingHorizontal: 56 }}>
        <BackChevron onPress={done} color={tk.ink} label={t("sh.a11y.back")} />
        <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "500", color: tk.ink }}>{t("ac.shareYourAura")}</Text>
      </View>

      {aura && (
        <Animated.View entering={FadeIn.duration(420)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 14, paddingBottom: 34, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            {/* the card is captured from this view alone: the buttons and the
                note below are not in the picture. Its lavender stays in every
                theme (see above) — in Midnight it is the picture's own mat */}
            <View ref={card} collapsable={false} style={{ backgroundColor: P.penWash, padding: 6 }}>
              <AuraTicket aura={aura} seed={user?.id || "you"} avatarId={(profile?.avatarId as string) || null} who={handle || "me"} />
            </View>

            <View style={{ marginTop: "auto", paddingTop: 22, gap: 10 }}>
              <Pressable onPress={share} disabled={!!busy} style={({ pressed }) => ({ backgroundColor: tk.ind, borderRadius: 999, paddingVertical: 17, alignItems: "center", opacity: pressed || busy ? 0.85 : 1 })}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14, color: tk.bg }}>{busy === "share" ? t("ac.working") : t("ac.shareCard")}</Text>
                  {busy !== "share" && <ShareIcon size={18} color={tk.bg} />}
                </View>
              </Pressable>
              <Pressable onPress={save} disabled={!!busy} style={({ pressed }) => ({ borderRadius: 999, paddingVertical: 15, alignItems: "center", backgroundColor: ui.saveKey, opacity: pressed || busy ? 0.85 : 1 })}>
                <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14, color: tk.ink }}>{busy === "save" ? t("ac.working") : t("ac.saveImage")}</Text>
              </Pressable>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }}>
                <WrenBird size={22} mood="content" />
                <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: ui.note }}>{t("ac.readingFrom", { name: wren })}</Text>
              </View>
              <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: ui.note, textAlign: "center" }}>{t("ac.onlyCard")}</Text>
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
