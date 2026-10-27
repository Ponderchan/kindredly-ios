import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { t } from "../../lib/i18n";
import { leavePicked, takeKept } from "../../lib/journal-handoff";
import { newerVersion } from "../../lib/update-prompt-core";
import { ROLL_PAGE, roomFor, togglePick } from "./photo-roll-model";
import "../../data/strings-note-compose"; // jp.camera, jp.cameraDenied

/* THE PHOTO ROLL'S STATE, for the Swift roll (PhotoRollNative, KPhotoRollView).
   ────────────────────────────────────────────────────────────────────────
   The React Native roll (app/journal-pick, the "photoroll" switch's
   fallback) keeps its own copy, unchanged; this is the same code, step for
   step, with the picking rules from photo-roll-model:

   - the phone's library, read in place (expo-media-library), newest first,
     ROLL_PAGE frames a page; a ph:// frame becomes a file only for the ones
     chosen, at Next;
   - the permission asked once, and after a FIRST YES (2026-10-26, iOS 26
     simulator: the read made the moment the reader allows access never
     answered, and the page said "No photos yet." over a roll of six) the
     roll read once more 700ms later unless the first read brought
     something; a read that answers after the roll started over (the first
     yes, another album) is dropped (readRef), and a read that fails is said;
   - the albums: our own name (Recents, in the app's language) on the whole
     roll and the first row, the phone's names for the rest, smart albums
     first; the list shown as soon as the names are known, the covers
     filling in one by one;
   - a picture toggles in the order chosen, up to nine less what the page
     already holds (?more=1 adds to a page: takeKept), a film goes to a page
     of its own (or is refused while adding to a page);
   - Next turns the picks into files and hands them over (leavePicked), back
     to the page while adding, on to a new page otherwise;
   - the camera card (binaries from 1.2.6, whose camera question names a
     journal page): a picture taken goes to the page as one picked would. */

/** the camera card asks for the camera with words that name a journal page, which only binaries
    from 1.2.6 (App Store 1.0.7) carry; an older one never shows it, even after an update over the air */
const BINARY: string | null = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
export const CAMERA_CARD = !!BINARY && !newerVersion("1.2.6", BINARY);

export type RollFrame = { id: string; uri: string; w: number; h: number; video: boolean; duration: number };
export type RollAlbum = { id: string | null; title: string; count: number; cover: string | null };
export type RollAccess = "asking" | "granted" | "limited" | "denied";

export function usePhotoRoll() {
  const router = useRouter();
  const { more } = useLocalSearchParams<{ more?: string }>();
  const adding = more === "1";
  // what the page already holds, handed over once (journal-handoff)
  const [kept] = useState(() => takeKept());
  const room = roomFor(kept.length);

  const [perm, setPerm] = useState<RollAccess>("asking");
  const [frames, setFrames] = useState<RollFrame[]>([]);
  const [picked, setPicked] = useState<string[]>([]); // asset ids, in the order chosen
  const [busy, setBusy] = useState(false);
  const [album, setAlbum] = useState<RollAlbum>({ id: null, title: t("jp.recentRow"), count: 0, cover: null });
  const [albums, setAlbums] = useState<RollAlbum[] | null>(null);
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
        first: ROLL_PAGE,
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
      // THE FIRST YES: read the roll once more when it has settled, unless the first read brought something
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

  const openAlbum = useCallback(
    (a: RollAlbum, first: boolean) => {
      setAlbumsOpen(false);
      // the first row is the phone's Recents — the same set as "all", read without an album filter
      const id = first ? null : a.id;
      setAlbum({ ...a, id, title: first ? t("jp.recentRow") : a.title });
      albumRef.current = id;
      setPicked([]);
      restart();
    },
    [restart],
  );

  /* the phone's albums: the list as soon as the names are known, the covers as they come */
  const albumsRef = useRef(albums);
  albumsRef.current = albums;
  const loadAlbums = useCallback(async () => {
    setAlbumsOpen(true);
    if (albumsRef.current) return;
    try {
      const all = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
      const live = all.filter((a) => a.assetCount > 0);
      // smart albums first (Recents, Favourites, Videos, Screenshots…), then yours
      live.sort((a, b) => Number(b.type === "smartAlbum") - Number(a.type === "smartAlbum") || b.assetCount - a.assetCount);
      // the whole roll keeps OUR name; every other album is the phone's, under the name Photos gives it
      const list: RollAlbum[] = live.map((a, i) => ({ id: a.id, title: i === 0 ? t("jp.recentRow") : a.title, count: a.assetCount, cover: null }));
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
  }, []);

  const toggleAlbums = useCallback(() => {
    if (albumsOpen) setAlbumsOpen(false);
    else void loadAlbums();
  }, [albumsOpen, loadAlbums]);

  const fileOf = async (f: RollFrame): Promise<string> => {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(f.id);
      return info.localUri || f.uri;
    } catch {
      return f.uri;
    }
  };

  const busyRef = useRef(busy);
  busyRef.current = busy;
  const goFilm = async (f: RollFrame) => {
    if (busyRef.current) return;
    setBusy(true);
    const uri = await fileOf(f);
    setBusy(false);
    leavePicked({ video: { uri, duration: f.duration } });
    router.replace("/journal-entry");
  };

  const framesRef = useRef(frames);
  framesRef.current = frames;
  const pickedRef = useRef(picked);
  pickedRef.current = picked;

  const toggle = (id: string) => {
    const f = framesRef.current.find((x) => x.id === id);
    if (!f) return;
    if (f.video) {
      // a film is a page of its own: it goes straight through, alone
      if (adding) {
        Alert.alert(t("jp.film.title"), t("jp.film.body"));
        return;
      }
      void goFilm(f);
      return;
    }
    const r = togglePick(pickedRef.current, f.id, room);
    if (r.full) {
      Alert.alert(t("jp.max.title"), t("jp.max.body"));
      return;
    }
    pickedRef.current = r.picked;
    setPicked(r.picked);
  };

  /* NEXT: the chosen frames become files the page can keep */
  const next = async () => {
    if (!pickedRef.current.length || busyRef.current) return;
    setBusy(true);
    const out: { uri: string; ratio: number }[] = [];
    for (const id of pickedRef.current) {
      const f = framesRef.current.find((x) => x.id === id);
      if (!f) continue;
      out.push({ uri: await fileOf(f), ratio: f.w && f.h ? f.w / f.h : 0.8 });
    }
    setBusy(false);
    leavePicked({ photos: [...kept, ...out] });
    if (adding) router.back();
    else router.replace("/journal-entry");
  };

  /* the camera: a picture taken here goes to the page as one picked from the roll would */
  const shoot = async () => {
    const granted = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted.granted) {
      Alert.alert(t("jp.camera"), t("jp.cameraDenied"), [
        { text: t("ml.cancel"), style: "cancel" },
        { text: t("jp.settings"), onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    try {
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
      const shot = r.canceled ? null : r.assets?.[0];
      if (!shot) return;
      leavePicked({ photos: [...kept, { uri: shot.uri, ratio: shot.width && shot.height ? shot.width / shot.height : 0.75 }] });
      if (adding) router.back();
      else router.replace("/journal-entry");
    } catch (e) {
      console.warn("[journal-pick] the camera didn't give a picture:", e);
    }
  };

  const key = (k: "camera" | "text" | "voice") => {
    if (k === "camera") void shoot();
    else if (k === "text") router.replace("/journal-entry");
    else router.replace("/journal-entry?start=voice");
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal"));

  const pickAlbum = (index: number) => {
    const a = albumsRef.current?.[index];
    if (a) openAlbum(a, index === 0);
  };

  return {
    adding,
    perm,
    frames,
    picked,
    busy,
    album,
    albums,
    albumsOpen,
    act: {
      close,
      toggleAlbums,
      pickAlbum,
      toggle,
      next: () => void next(),
      key,
      reachEnd: () => void page(),
      settings: () => void Linking.openSettings(),
      limited: () => void MediaLibrary.presentPermissionsPickerAsync(),
    },
  };
}

export type PhotoRoll = ReturnType<typeof usePhotoRoll>;
