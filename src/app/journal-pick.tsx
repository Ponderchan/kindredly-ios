import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Linking, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { leavePicked, takeKept } from "../lib/journal-handoff";

/* TO YOURSELF STARTS AT THE PICTURES (owner, 2026-09-20).
   ────────────────────────────────────────────────────────────────────────
   Tapping "to yourself" used to open a blank page with a photo key in the
   corner. Most sealed days are a picture with a line under it, so the
   page now opens on the camera roll itself: the phone asks for the
   library once, the newest frames are right there, up to nine get a
   number, and NEXT carries them to the page where the line and the mood
   go. Two slim keys above the roll are the other ways in — words only,
   or a voice. The title is a menu: RECENT ˅ opens the phone's own albums
   (Favourites, Videos, Screenshots, Selfies…), and a film picked from
   any of them goes to the page on its own, as a film page.

   The grid is the phone's own library, read in place (expo-media-library),
   so nothing is copied until NEXT; a `ph://` frame is resolved to a file
   only for the ones that were chosen. With ?more=1 the roll is adding to
   a page that already has pictures: the keys are hidden, and NEXT merges
   and goes back instead of opening a new page. */

/* the pick is a confirmation, so it wears the app's confirm green — the
   kindreds' landed tick — not the pen blue (owner, 2026-09-20) */
const TICK = "#2E7D4F";
const MAX = 9;
const PAGE = 60;
type Frame = { id: string; uri: string; w: number; h: number; video: boolean; duration: number };
type Album = { id: string | null; title: string; count: number; cover: string | null };

export default function JournalPick() {
  useLang();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { more } = useLocalSearchParams<{ more?: string }>();
  const adding = more === "1";
  const keptRef = useRef(takeKept());
  const room = Math.max(0, MAX - keptRef.current.length);

  const [perm, setPerm] = useState<"asking" | "granted" | "limited" | "denied">("asking");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [picked, setPicked] = useState<string[]>([]); // asset ids, in the order chosen
  const [busy, setBusy] = useState(false);
  const [album, setAlbum] = useState<Album>({ id: null, title: t("jp.recent"), count: 0, cover: null });
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [albumsOpen, setAlbumsOpen] = useState(false);
  const cursor = useRef<string | undefined>(undefined);
  const more_ = useRef(true);
  const loading = useRef(false);
  const albumRef = useRef<string | null>(null);

  const page = useCallback(async () => {
    if (loading.current || !more_.current) return;
    loading.current = true;
    const forAlbum = albumRef.current;
    try {
      const r = await MediaLibrary.getAssetsAsync({
        first: PAGE,
        after: cursor.current,
        album: forAlbum ?? undefined,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      if (albumRef.current !== forAlbum) return; // the album changed under us
      cursor.current = r.endCursor;
      more_.current = r.hasNextPage;
      setFrames((f) => [...f, ...r.assets.map((a) => ({ id: a.id, uri: a.uri, w: a.width, h: a.height, video: a.mediaType === "video", duration: a.duration || 0 }))]);
    } catch {
      more_.current = false;
    } finally {
      loading.current = false;
    }
  }, []);

  const openAlbum = (a: Album) => {
    setAlbumsOpen(false);
    setAlbum(a);
    albumRef.current = a.id;
    cursor.current = undefined;
    more_.current = true;
    loading.current = false;
    setFrames([]);
    setPicked([]);
    void page();
  };

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

  /* the phone's albums, with a cover each — read once, when the menu is
     first opened */
  const loadAlbums = async () => {
    setAlbumsOpen(true);
    if (albums) return;
    try {
      const all = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
      const live = all.filter((a) => a.assetCount > 0);
      // smart albums first (Favourites, Videos, Screenshots…), then yours
      live.sort((a, b) => Number(b.type === "smartAlbum") - Number(a.type === "smartAlbum") || b.assetCount - a.assetCount);
      const withCovers: Album[] = await Promise.all(
        live.slice(0, 30).map(async (a) => {
          let cover: string | null = null;
          try {
            const r = await MediaLibrary.getAssetsAsync({ album: a.id, first: 1, sortBy: [[MediaLibrary.SortBy.creationTime, false]], mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video] });
            cover = r.assets[0]?.uri ?? null;
          } catch {
            /* an album with no cover is still an album */
          }
          return { id: a.id, title: a.title, count: a.assetCount, cover };
        }),
      );
      setAlbums(withCovers);
    } catch {
      setAlbums([]);
    }
  };

  const toggle = (f: Frame) => {
    if (f.video) {
      // a film is a page of its own: it goes straight through, alone
      if (adding) {
        Alert.alert(t("jp.film.title"), t("jp.film.body"));
        return;
      }
      void goFilm(f);
      return;
    }
    setPicked((p) => {
      if (p.includes(f.id)) return p.filter((x) => x !== f.id);
      if (p.length >= room) {
        Alert.alert(t("jp.max.title"), t("jp.max.body"));
        return p;
      }
      return [...p, f.id];
    });
  };

  const fileOf = async (f: Frame): Promise<string> => {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(f.id);
      return info.localUri || f.uri;
    } catch {
      return f.uri;
    }
  };

  const goFilm = async (f: Frame) => {
    if (busy) return;
    setBusy(true);
    const uri = await fileOf(f);
    setBusy(false);
    leavePicked({ video: { uri, duration: f.duration } });
    router.replace("/journal-entry");
  };

  /* NEXT: the chosen frames become files the page can keep */
  const next = async () => {
    if (!picked.length || busy) return;
    setBusy(true);
    const out: { uri: string; ratio: number }[] = [];
    for (const id of picked) {
      const f = frames.find((x) => x.id === id);
      if (!f) continue;
      out.push({ uri: await fileOf(f), ratio: f.w && f.h ? f.w / f.h : 0.8 });
    }
    setBusy(false);
    leavePicked({ photos: [...keptRef.current, ...out] });
    if (adding) router.back();
    else router.replace("/journal-entry");
  };

  const cell = (width - 4) / 3;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const Tile = ({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: cell, height: cell, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: P.ink12, opacity: pressed ? 0.6 : 1 })}>
      {children}
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: P.ink }}>{label.toUpperCase()}</Text>
    </Pressable>
  );

  /* one frame of the roll — also the third tile up top, which is simply
     the newest picture (owner, 2026-09-20) */
  const frame = (item: Frame) => {
    const n = picked.indexOf(item.id);
    return (
      <Pressable key={item.id} onPress={() => toggle(item)} style={{ width: cell, height: cell }}>
        {/* expo-image reads ph:// straight from the library; RN's Image cannot */}
        <Image source={{ uri: item.uri }} style={{ width: cell, height: cell, backgroundColor: "#EFEDE6" }} contentFit="cover" recyclingKey={item.id} transition={0} />
        {item.video ? (
          <View style={{ position: "absolute", left: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(17,17,19,0.55)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
            <Svg width={8} height={8} viewBox="0 0 24 24" fill="#FFFFFF">
              <Path d="M6 4l14 8-14 8z" />
            </Svg>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, color: "#FFFFFF" }}>{mmss(item.duration)}</Text>
          </View>
        ) : (
          /* the number is the order it will sit in on the page */
          <View style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#FFFFFF", backgroundColor: n >= 0 ? TICK : "rgba(17,17,19,0.28)", alignItems: "center", justifyContent: "center" }}>
            {n >= 0 && <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, color: "#FFFFFF" }}>{n + 1}</Text>}
          </View>
        )}
        {n >= 0 && <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(46,125,79,0.14)" }} />}
      </Pressable>
    );
  };

  /* WRITE · SAY IT · the newest picture, in one row; the roll continues
     from the second picture underneath */
  const header = adding ? null : (
    <View style={{ flexDirection: "row", gap: 2, marginBottom: 2 }}>
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
      {frames[0] ? frame(frames[0]) : <View style={{ width: cell, height: cell, backgroundColor: "#EFEDE6" }} />}
    </View>
  );
  const rest = adding ? frames : frames.slice(1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 14, paddingTop: 6, paddingBottom: 10 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal"))} hitSlop={10} style={{ width: 34, height: 38, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 17, color: P.ink }}>✕</Text>
        </Pressable>
        {/* the title is the album menu */}
        <Pressable onPress={() => void loadAlbums()} hitSlop={8} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: P.ink, maxWidth: 200 }}>{album.title.toUpperCase()}</Text>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ rotate: albumsOpen ? "180deg" : "0deg" }] }}>
            <Path d="M6 9l6 6 6-6" />
          </Svg>
        </Pressable>
        <Pressable
          onPress={() => void next()}
          disabled={!picked.length || busy}
          style={{ minWidth: 34, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: picked.length && !busy ? TICK : "transparent", borderWidth: 1.5, borderColor: picked.length && !busy ? TICK : P.ink12 }}
        >
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: picked.length && !busy ? "#FFFFFF" : P.ink40 }}>
            {busy ? "…" : picked.length ? `${t(adding ? "jp.add" : "jp.next")} · ${picked.length}` : t(adding ? "jp.add" : "jp.next")}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={rest}
        keyExtractor={(f) => f.id}
        numColumns={3}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: 2 }}
        contentContainerStyle={{ gap: 2, paddingBottom: 40 }}
        onEndReached={() => void page()}
        onEndReachedThreshold={0.8}
        initialNumToRender={24}
        removeClippedSubviews
        renderItem={({ item }) => frame(item)}
        ListEmptyComponent={
          frames.length ? null : perm === "denied" ? (
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

      {/* the albums, dropped from the title */}
      <Modal visible={albumsOpen} transparent animationType="fade" onRequestClose={() => setAlbumsOpen(false)}>
        <Pressable onPress={() => setAlbumsOpen(false)} style={{ flex: 1, backgroundColor: "rgba(17,17,19,0.28)" }}>
          <View style={{ marginTop: insets.top + 54, backgroundColor: "#FFFFFF", maxHeight: "72%", borderBottomLeftRadius: 18, borderBottomRightRadius: 18, overflow: "hidden" }}>
            <FlatList
              data={albums || []}
              keyExtractor={(a) => a.id ?? "all"}
              renderItem={({ item }) => (
                <Pressable onPress={() => openAlbum(item)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: pressed ? "#F3F2FA" : "transparent" })}>
                  <View style={{ width: 52, height: 52, backgroundColor: "#EFEDE6", overflow: "hidden" }}>
                    {!!item.cover && <Image source={{ uri: item.cover }} style={{ width: 52, height: 52 }} contentFit="cover" transition={0} />}
                  </View>
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: PF.letter, fontSize: 15.5, color: album.id === item.id ? P.pen : P.ink }}>{item.title}</Text>
                  {item.count > 0 && <Text style={{ fontFamily: PF.mono, fontSize: 11, color: P.ink40 }}>{item.count}</Text>}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ fontFamily: PF.mono, fontSize: 11, color: P.ink40, padding: 20 }}>…</Text>}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
