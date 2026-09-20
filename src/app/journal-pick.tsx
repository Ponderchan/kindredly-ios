import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Linking, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";

/* TO YOURSELF STARTS AT THE PICTURES (owner, 2026-09-20).
   ────────────────────────────────────────────────────────────────────────
   Tapping "to yourself" used to open a blank page with a photo key in the
   corner. Most sealed days are a picture with a line under it, so the
   page now opens on the camera roll itself: the phone asks for the
   library once, the recent frames are right there, up to nine get a
   number, and NEXT carries them to the page where the line and the mood
   go. The three tiles at the top are the other ways in — a shot taken
   now, words only, a voice.

   The grid is the phone's own library, read in place (expo-media-library),
   so nothing is copied until NEXT; a `ph://` frame is resolved to a file
   only for the ones that were chosen. */

const MAX = 9;
const PAGE = 60;
type Frame = { id: string; uri: string; w: number; h: number };

export default function JournalPick() {
  useLang();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [perm, setPerm] = useState<"asking" | "granted" | "limited" | "denied">("asking");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [picked, setPicked] = useState<string[]>([]); // asset ids, in the order chosen
  const [busy, setBusy] = useState(false);
  const cursor = useRef<string | undefined>(undefined);
  const more = useRef(true);
  const loading = useRef(false);

  const page = useCallback(async () => {
    if (loading.current || !more.current) return;
    loading.current = true;
    try {
      const r = await MediaLibrary.getAssetsAsync({
        first: PAGE,
        after: cursor.current,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      cursor.current = r.endCursor;
      more.current = r.hasNextPage;
      setFrames((f) => [...f, ...r.assets.map((a) => ({ id: a.id, uri: a.uri, w: a.width, h: a.height }))]);
    } catch {
      more.current = false;
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await MediaLibrary.requestPermissionsAsync(false);
      if (!alive) return;
      if (!r.granted) {
        setPerm("denied");
        return;
      }
      setPerm(r.accessPrivileges === "limited" ? "limited" : "granted");
      void page();
    })();
    return () => {
      alive = false;
    };
  }, [page]);

  const toggle = (id: string) => {
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= MAX) {
        Alert.alert(t("jp.max.title"), t("jp.max.body"));
        return p;
      }
      return [...p, id];
    });
  };

  /* NEXT: the chosen frames become files the page can keep */
  const next = async () => {
    if (!picked.length || busy) return;
    setBusy(true);
    const out: { uri: string; ratio: number }[] = [];
    for (const id of picked) {
      const f = frames.find((x) => x.id === id);
      if (!f) continue;
      try {
        const info = await MediaLibrary.getAssetInfoAsync(id);
        out.push({ uri: info.localUri || f.uri, ratio: f.w && f.h ? f.w / f.h : 0.8 });
      } catch {
        out.push({ uri: f.uri, ratio: f.w && f.h ? f.w / f.h : 0.8 });
      }
    }
    setBusy(false);
    router.replace(`/journal-entry?photos=${encodeURIComponent(JSON.stringify(out))}`);
  };

  /* a shot taken now goes straight to the page as its one picture */
  const shoot = async () => {
    let granted = false;
    try {
      granted = (await ImagePicker.requestCameraPermissionsAsync()).granted;
    } catch {
      granted = false; // a build without the camera string (before 1.2.0 b18) lands here
    }
    if (!granted) {
      Alert.alert(t("jp.camera.title"), t("jp.camera.body"), [
        { text: t("set.neverMind"), style: "cancel" },
        { text: t("jp.settings"), onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    const a = res.assets[0];
    router.replace(`/journal-entry?photos=${encodeURIComponent(JSON.stringify([{ uri: a.uri, ratio: a.width && a.height ? a.width / a.height : 0.8 }]))}`);
  };

  const cell = (width - 4) / 3;
  const Tile = ({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: cell, height: cell, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: P.ink12, opacity: pressed ? 0.6 : 1 })}>
      {children}
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: P.ink }}>{label.toUpperCase()}</Text>
    </Pressable>
  );

  const header = (
    <View style={{ flexDirection: "row", gap: 2, marginBottom: 2 }}>
      <Tile label={t("jp.shoot")} onPress={() => void shoot()}>
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <Circle cx={12} cy={13} r={3.2} />
        </Svg>
      </Tile>
      <Tile label={t("jp.write")} onPress={() => router.replace("/journal-entry")}>
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 20l4-1 11-11-3-3L5 16z" />
          <Line x1={13} y1={8} x2={16} y2={11} />
        </Svg>
      </Tile>
      <Tile label={t("jp.say")} onPress={() => router.replace("/journal-entry?start=voice")}>
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={9} y={3} width={6} height={11} rx={3} />
          <Path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
        </Svg>
      </Tile>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 14, paddingTop: 6, paddingBottom: 10 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal"))} hitSlop={10} style={{ width: 34, height: 38, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 17, color: P.ink }}>✕</Text>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: P.ink, textAlign: "center" }}>{t("jp.recent")}</Text>
        <Pressable
          onPress={() => void next()}
          disabled={!picked.length || busy}
          style={{ minWidth: 34, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: picked.length && !busy ? P.pen : "transparent", borderWidth: 1.5, borderColor: picked.length && !busy ? P.pen : P.ink12 }}
        >
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: picked.length && !busy ? "#FFFFFF" : P.ink40 }}>
            {busy ? "…" : picked.length ? `${t("jp.next")} · ${picked.length}` : t("jp.next")}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={frames}
        keyExtractor={(f) => f.id}
        numColumns={3}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: 2 }}
        contentContainerStyle={{ gap: 2, paddingBottom: 40 }}
        onEndReached={() => void page()}
        onEndReachedThreshold={0.8}
        initialNumToRender={24}
        removeClippedSubviews
        renderItem={({ item }) => {
          const n = picked.indexOf(item.id);
          return (
            <Pressable onPress={() => toggle(item.id)} style={{ width: cell, height: cell }}>
              {/* expo-image reads ph:// straight from the library; RN's Image cannot */}
              <Image source={{ uri: item.uri }} style={{ width: cell, height: cell, backgroundColor: "#EFEDE6" }} contentFit="cover" recyclingKey={item.id} transition={0} />
              {/* the number is the order it will sit in on the page */}
              <View style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#FFFFFF", backgroundColor: n >= 0 ? P.pen : "rgba(17,17,19,0.28)", alignItems: "center", justifyContent: "center" }}>
                {n >= 0 && <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, color: "#FFFFFF" }}>{n + 1}</Text>}
              </View>
              {n >= 0 && <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(59,53,224,0.12)" }} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          perm === "denied" ? (
            <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 40 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: P.ink60, textAlign: "center" }}>{t("jp.denied")}</Text>
              <Pressable onPress={() => void Linking.openSettings()} hitSlop={8} style={{ marginTop: 16 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.4, color: P.pen }}>{t("jp.settings")} ›</Text>
              </Pressable>
            </View>
          ) : perm === "asking" ? null : (
            <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 40 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: P.ink60, textAlign: "center" }}>{t("jp.none")}</Text>
            </View>
          )
        }
        ListFooterComponent={
          perm === "limited" ? (
            <Pressable onPress={() => void MediaLibrary.presentPermissionsPickerAsync()} hitSlop={8} style={{ alignItems: "center", paddingVertical: 18 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.2, color: P.pen }}>{t("jp.limited")} ›</Text>
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
