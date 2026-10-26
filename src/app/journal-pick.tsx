import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import Svg, { Path } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { PF, PFM } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { leavePicked, takeKept } from "../lib/journal-handoff";
import { CloseGlyph } from "../components/10a/BackChevron";

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
   and goes back instead of opening a new page.

   10a step 5: painted from the theme (useP / useTheme) — the page, the
   album sheet (it was a fixed white slab, glaring in Midnight), the empty
   frames and the selected album row. The two note keys keep their own pale
   colours with a fixed dark ink on them (KEYS), the marks on a picture stay
   white on dark, and the pick stays the confirm green. */

/* the pick is a confirmation, so it wears the app's confirm green — the
   kindreds' landed tick — not the pen blue (owner, 2026-09-20) */
const TICK = "#2E7D4F";
/* THE TWO NOTE KEYS (owner, 2026-10-26: the flat tiles with mono capitals were "too ugly") are
   the Notes composer's ＋ cards (KNotePlusPanel, the owner's Note Composer Bar): a card the size
   of a picture beside it (owner: "as big as the photos"), continuous corners of 16, the line
   icon 26 and the name in system 15 semibold, in a mood pair that keeps its colours in every
   theme. Voice is the composer's Audio card (tired:
   lav and pen); text takes happy's yellow with its face ink, which reads on it. */
const KEYS = {
  text: { fill: "#F6E7C6", ink: "#94681C" },
  voice: { fill: "#E4E2F4", ink: "#3A34D6" },
} as const;
const MAX = 9;
const PAGE = 60;
type Frame = { id: string; uri: string; w: number; h: number; video: boolean; duration: number };
type Album = { id: string | null; title: string; count: number; cover: string | null };

export default function JournalPick() {
  useLang();
  const P = useP();
  const { t: tk } = useTheme();
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
  const [album, setAlbum] = useState<Album>({ id: null, title: t("jp.recentRow"), count: 0, cover: null });
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [albumsOpen, setAlbumsOpen] = useState(false);
  const cursor = useRef<string | undefined>(undefined);
  const more_ = useRef(true);
  const loading = useRef(false);
  const albumRef = useRef<string | null>(null);
  /* which read of the roll is current: a fresh start (the first yes, another album) bumps it, and
     an older read that answers late is dropped instead of adding its frames twice */
  const readRef = useRef(0);
  const seenAny = useRef(false);

  const page = useCallback(async () => {
    if (loading.current || !more_.current) return;
    loading.current = true;
    const forAlbum = albumRef.current;
    const read = readRef.current;
    try {
      const r = await MediaLibrary.getAssetsAsync({
        first: PAGE,
        after: cursor.current,
        album: forAlbum ?? undefined,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      if (albumRef.current !== forAlbum || readRef.current !== read) return; // the album changed under us, or the roll started over
      if (r.assets.length) seenAny.current = true;
      cursor.current = r.endCursor;
      more_.current = r.hasNextPage;
      setFrames((f) => [...f, ...r.assets.map((a) => ({ id: a.id, uri: a.uri, w: a.width, h: a.height, video: a.mediaType === "video", duration: a.duration || 0 }))]);
    } catch (e) {
      // said, not swallowed: an empty roll that should have photos is otherwise a mystery
      console.warn("[journal-pick] the roll didn't load:", e);
      more_.current = false;
    } finally {
      if (readRef.current === read) loading.current = false;
    }
  }, []);

  /** the roll from its first page again */
  const restart = useCallback(() => {
    readRef.current += 1;
    cursor.current = undefined;
    more_.current = true;
    loading.current = false;
    setFrames([]);
    void page();
  }, [page]);

  const openAlbum = (a: Album, first: boolean) => {
    setAlbumsOpen(false);
    // the first row is the phone's Recents — the same set as "all", read without an album filter
    const id = first ? null : a.id;
    setAlbum({ ...a, id, title: first ? t("jp.recentRow") : a.title });
    albumRef.current = id;
    setPicked([]);
    restart();
  };

  useEffect(() => {
    let alive = true;
    let again: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      // whether this is the first time the phone is asked (iOS shows its question only then)
      const before = await MediaLibrary.getPermissionsAsync(false).catch(() => null);
      const r = await MediaLibrary.requestPermissionsAsync(false);
      if (!alive) return;
      if (!r.granted) {
        setPerm("denied");
        return;
      }
      setPerm(r.accessPrivileges === "limited" ? "limited" : "granted");
      void page();
      /* THE FIRST YES (2026-10-26, iOS 26 simulator): the read made the moment the reader allows
         access never answered, and the page said "No photos yet." over a roll of six until the
         app was opened again. So after a first yes the roll is read once more when it has
         settled, unless the first read already brought something. */
      if (before?.status === "undetermined") {
        again = setTimeout(() => {
          if (alive && !seenAny.current) restart();
        }, 700);
      }
    })();
    return () => {
      alive = false;
      if (again) clearTimeout(again);
    };
  }, [page, restart]);

  /* THE PHONE'S ALBUMS (owner, 2026-09-20, after the reference video): a
     full-width list slides down from the title over the roll — every
     album, name and count on one line, a small square cover, the current
     one on grey. The list is shown the moment the names are known; the
     covers fill in as they come, so a roll of forty albums is not forty
     round trips before anything appears. */
  const loadAlbums = async () => {
    setAlbumsOpen(true);
    if (albums) return;
    try {
      const all = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
      const live = all.filter((a) => a.assetCount > 0);
      // smart albums first (Recents, Favourites, Videos, Screenshots…), then yours
      live.sort((a, b) => Number(b.type === "smartAlbum") - Number(a.type === "smartAlbum") || b.assetCount - a.assetCount);
      /* the whole roll keeps OUR name (RECENT, in the app's language) in the
         title and at the top of the list; the title used to take the phone's
         own word for it, which on a Chinese phone put 最近项目 over an English
         screen. Every other album is the phone's, under the name Photos gives
         it — that is the name its owner knows it by. */
      const list: Album[] = live.map((a, i) => ({ id: a.id, title: i === 0 ? t("jp.recentRow") : a.title, count: a.assetCount, cover: null }));
      setAlbums(list);
      if (albumRef.current === null && list[0]) setAlbum((cur) => (cur.id === null ? { ...cur, count: list[0].count } : cur));
      for (const a of list) {
        try {
          const r = await MediaLibrary.getAssetsAsync({ album: a.id ?? undefined, first: 1, sortBy: [[MediaLibrary.SortBy.creationTime, false]], mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video] });
          const cover = r.assets[0]?.uri ?? null;
          if (cover) setAlbums((cur) => cur && cur.map((x) => (x.id === a.id ? { ...x, cover } : x)));
        } catch {
          /* an album with no cover is still an album */
        }
      }
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

  const Tile = ({ label, pair, onPress, icon }: { label: string; pair: { fill: string; ink: string }; onPress: () => void; icon: string }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: cell, height: cell }}>
      {({ pressed }) => (
        <View style={{ flex: 1, borderRadius: 16, borderCurve: "continuous", backgroundColor: pair.fill, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 6, opacity: pressed ? 0.7 : 1 }}>
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={pair.ink} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <Path d={icon} />
          </Svg>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 15, fontWeight: "600", color: pair.ink }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );

  /* one frame of the roll — also the third tile up top, which is simply
     the newest picture (owner, 2026-09-20) */
  const frame = (item: Frame) => {
    const n = picked.indexOf(item.id);
    return (
      <Pressable key={item.id} onPress={() => toggle(item)} style={{ width: cell, height: cell }}>
        {/* expo-image reads ph:// straight from the library; RN's Image cannot */}
        <Image source={{ uri: item.uri }} style={{ width: cell, height: cell, backgroundColor: tk.soft2 }} contentFit="cover" recyclingKey={item.id} transition={0} />
        {item.video ? (
          <View style={{ position: "absolute", left: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(17,17,19,0.55)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
            <Svg width={8} height={8} viewBox="0 0 24 24" fill="#FFFFFF">
              <Path d="M6 4l14 8-14 8z" />
            </Svg>
            <Text style={{ ...PFM.monoSemi, fontSize: 9, color: "#FFFFFF" }}>{mmss(item.duration)}</Text>
          </View>
        ) : (
          /* the number is the order it will sit in on the page */
          <View style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#FFFFFF", backgroundColor: n >= 0 ? TICK : "rgba(17,17,19,0.28)", alignItems: "center", justifyContent: "center" }}>
            {n >= 0 && <Text style={{ ...PFM.monoSemi, fontSize: 11, color: "#FFFFFF" }}>{n + 1}</Text>}
          </View>
        )}
        {n >= 0 && <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(46,125,79,0.14)" }} />}
      </Pressable>
    );
  };

  /* TEXT NOTE · VOICE NOTE · the newest picture, in one row; the roll
     continues from the second picture underneath */
  const header = adding ? null : (
    <View style={{ flexDirection: "row", gap: 2, marginBottom: 2 }}>
      <Tile label={t("jp.write")} pair={KEYS.text} onPress={() => router.replace("/journal-entry")} icon="M4 20l4-1 11-11-3-3L5 16z M13 8l3 3" />
      {/* the composer's own microphone (KNotePlusPanel's Audio) */}
      <Tile label={t("jp.say")} pair={KEYS.voice} onPress={() => router.replace("/journal-entry?start=voice")} icon="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3" />
      {frames[0] ? frame(frames[0]) : <View style={{ width: cell, height: cell, backgroundColor: tk.soft2 }} />}
    </View>
  );
  const rest = adding ? frames : frames.slice(1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 14, paddingTop: 6, paddingBottom: 10 }}>
        {/* the head in the composers' sizes (owner, 2026-10-26: "the ✕, the title and Next the same
            as the letter page"): their × (CloseGlyph, 20 at 2.2) in a 42 box, the title in the
            system 17 medium of the letter page's title (KTextStyle.secondaryTitle), Next in the
            system face of a key */}
        <Pressable accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal"))} hitSlop={6} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <CloseGlyph color={P.ink} />
        </Pressable>
        {/* the title is the album menu — the words and the chevron only. It
            used to fill the whole bar between ✕ and NEXT, so a thumb aimed
            at ✕ that landed a little to the right opened the albums instead
            (the owner's recording, 2026-09-20). */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Pressable onPress={() => (albumsOpen ? setAlbumsOpen(false) : void loadAlbums())} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 6, paddingVertical: 8 }}>
            <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "500", color: P.ink, maxWidth: 200 }}>{album.title}</Text>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ rotate: albumsOpen ? "180deg" : "0deg" }] }}>
              <Path d="M6 9l6 6 6-6" />
            </Svg>
          </Pressable>
        </View>
        <Pressable
          onPress={() => void next()}
          disabled={!picked.length || busy}
          style={{ minWidth: 34, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: picked.length && !busy ? TICK : "transparent", borderWidth: 1.5, borderColor: picked.length && !busy ? TICK : P.ink12 }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: picked.length && !busy ? "#FFFFFF" : P.ink40 }}>
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
                <Text style={{ ...PFM.monoSemi, fontSize: 11, letterSpacing: 1.4, color: P.pen }}>{t("jp.settings")} ›</Text>
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
              <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.2, color: P.pen }}>{t("jp.limited")} ›</Text>
            </Pressable>
          ) : null
        }
      />

      {/* the albums, dropped from the title: a full sheet of them over the roll */}
      {albumsOpen && (
        <Animated.View entering={SlideInUp.duration(260)} exiting={SlideOutUp.duration(220)} style={{ position: "absolute", left: 0, right: 0, top: insets.top + 54, bottom: 0, backgroundColor: tk.sf }}>
          {albums === null ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={P.ink40} />
            </View>
          ) : (
            <FlatList
              data={albums}
              keyExtractor={(a) => a.id ?? "all"}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item, index }) => {
                const current = index === 0 ? album.id === null : album.id === item.id;
                return (
                  <Pressable onPress={() => openAlbum(item, index === 0)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, height: 62, backgroundColor: current || pressed ? tk.lav2 : "transparent" })}>
                    <View style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: tk.soft2, overflow: "hidden" }}>
                      {!!item.cover && <Image source={{ uri: item.cover }} style={{ width: 44, height: 44 }} contentFit="cover" transition={0} />}
                    </View>
                    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: PF.letter, fontSize: 16, color: P.ink }}>{item.title}</Text>
                    <Text style={{ ...PFM.monoMed, fontSize: 11, color: P.ink40 }}>{item.count}</Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={{ ...PFM.mono, fontSize: 11, color: P.ink40, padding: 20 }}>{t("jp.none")}</Text>}
            />
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
