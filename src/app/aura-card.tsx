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
import { AuraTicket, W14, dear } from "../components/AuraCard";
import { ShareIcon } from "../components/Icons";
import { WrenBird } from "../components/WrenBird";
import { myAura, type Aura } from "../lib/aura";
import { useAuth } from "../lib/auth";
import { t, useLang } from "../lib/i18n";

/* YOUR WRITING AURA — the share screen (owner's sheet).
   The card on the light ground, then two acts: share it, or save it to
   your photos. Both leave with the card as an IMAGE — the title, the
   scene, the sticker names — never a line from a letter. The text that
   rides along with a share is the card's own words. */

export default function AuraShareCard() {
  useLang();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 4 }}>
        <Pressable onPress={done} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 24, color: W14.ink }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2.4, color: W14.ink }}>{t("ac.shareYourAura")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {aura && (
        <Animated.View entering={FadeIn.duration(420)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 14, paddingBottom: 34, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            {/* the card is captured from this view alone: the buttons and the
                note below are not in the picture */}
            <View ref={card} collapsable={false} style={{ backgroundColor: P.penWash, padding: 6 }}>
              <AuraTicket aura={aura} seed={user?.id || "you"} avatarId={(profile?.avatarId as string) || null} who={handle || "me"} />
            </View>

            <View style={{ marginTop: "auto", paddingTop: 22, gap: 10 }}>
              <Pressable onPress={share} disabled={!!busy} style={({ pressed }) => ({ backgroundColor: W14.navy, borderRadius: 12, paddingVertical: 17, alignItems: "center", opacity: pressed || busy ? 0.85 : 1 })}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14, color: "#FFFFFF" }}>{busy === "share" ? t("ac.working") : t("ac.shareCard")}</Text>
                  {busy !== "share" && <ShareIcon size={18} color="#FFFFFF" />}
                </View>
              </Pressable>
              <Pressable onPress={save} disabled={!!busy} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: "#DCD9F0", borderRadius: 12, paddingVertical: 15, alignItems: "center", backgroundColor: "#FFFFFF", opacity: pressed || busy ? 0.85 : 1 })}>
                <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14, color: W14.ink }}>{busy === "save" ? t("ac.working") : t("ac.saveImage")}</Text>
              </Pressable>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }}>
                <WrenBird size={22} mood="content" />
                <Text style={{ fontFamily: PF.letter, fontSize: 12.5, color: W14.grey }}>{t("ac.readingFrom", { name: wren })}</Text>
              </View>
              <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: W14.grey, textAlign: "center" }}>{t("ac.onlyCard")}</Text>
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
