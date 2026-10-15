import { useCallback, useEffect, useRef, useState } from "react";
import { GlyphInput } from "./GlyphInput";
import { useWrenName } from "../lib/wren-name";
import { Alert, Image, Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import {C} from "../theme/tokens";
import { getLang, t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { MoodKeyGlyph, MoodTray } from "./MoodTray";
import { MoodIcon } from "./MoodIcon";
import { Recorder } from "./Recorder";
import { AudioCard } from "./AudioCard";
import { WREN_OPENERS, byLang } from "../data/content";
import type { Lang } from "../data/stamps";
import { MOODS, MOOD_IDS, type MoodId, moodName } from "../data/moods";
import { addEntry, loadJournal, persistMedia, persistMediaMany, type JournalType } from "../lib/journal";
import { journalSpark } from "../lib/journal-sparks";
import { takePicked, takeSpark } from "../lib/journal-handoff";
import { todaysMorningLine } from "../lib/local-push";
import { storeMode, storePhotos } from "../lib/dev-store";
import { CourierSendOff } from "./CourierSendOff";
import { Nudge } from "./ComposeTray";

const LANG = "en";

// the cream zine — warm paper, washi tape, brown ink
/* This page had its own warm palette. It now maps onto the app's one system,
   so the sealed room is written on the same surface it's read on. The ruled
   lines stay — they're what makes it a notebook page, not a text box — and the
   tape stays, because that's a hand, and a hand is allowed. */
const Z = {
  bg: P.paper,
  paper: P.paper,
  ink: P.ink,
  soft: P.ink40,
  rule: P.ink12,
  gold: P.pen, // the actionable colour, same as everywhere
  tapeA: "rgba(197,174,128,0.5)",
  tapeB: "rgba(150,148,232,0.45)",
};

type Photo = { uri: string; ratio: number };

export function SelfCompose({
  text,
  setText,
  onDone,
}: {
  text: string;
  setText: (t: string) => void;
  onDone: () => void;
}) {
  useLang();
  const wren = useWrenName();
  const [pIdx, setPIdx] = useState(0);
  const [moodOpen, setMoodOpen] = useState(false); // the tray under the bar

  /* THE BOTTOM CLUSTER RIDES THE KEYBOARD. KeyboardAvoidingView was doing
     this and getting it wrong here: it lifted the page by ~200pt against a
     337pt keyboard, so the mood, the tools and SEAL — every control this
     page has — sat underneath it, and the mood the seal was waiting for was
     the first thing to go under. The letter desk gets away with the same
     component only because its page is short enough to fit either way.

     So the keyboard's real height drives the padding, on the UI thread, and
     the arithmetic is ours: the safe-area inset is already paid by the
     SafeAreaView above us, and the keyboard covers it. */
  const keyboard = useAnimatedKeyboard();
  const insets = useSafeAreaInsets();
  const lift = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, keyboard.height.value - insets.bottom),
  }));
  // the empty page's line, chosen from what's already on this device
  const [spark, setSpark] = useState("today felt like…");
  /* her question first, when she asked one: the line tapped on the lock
     screen tonight, else this morning's question if it was tapped today.
     A placeholder only — the page's body stays the writer's. */
  useEffect(() => {
    const handed = takeSpark();
    if (handed) {
      setSpark(handed);
      return;
    }
    let alive = true;
    void Promise.all([loadJournal(), todaysMorningLine()]).then(([all, morning]) => alive && setSpark(morning ?? journalSpark(all)));
    return () => {
      alive = false;
    };
  }, []);
  const [att, setAtt] = useState<Exclude<JournalType, "text"> | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  /* THE COVER IS THE FIRST FRAME (owner, 2026-09-20). No tag on it, no ×
     in its corner: a tap opens the frame full-screen, where it can be
     made the cover (it moves to the front) or taken off the page. */
  const [viewer, setViewer] = useState<number | null>(null);
  const [dur, setDur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [mood, setMood] = useState<MoodId | null>(null);

  const openers = byLang(WREN_OPENERS.journal, getLang() as Lang);
  const hasMedia = att === "photo" ? photos.length > 0 : !!mediaUri;
  const hasSomething = text.trim().length > 0 || (hasMedia && att !== null);
  // a sealed page without a mood can't be found again — the calendar is made
  // of these faces, so it isn't optional
  /* SEAL USED TO BE A DEAD BUTTON. It greyed out until a mood was picked and
     said nothing about why, so a page you had just written refused to close
     and gave no reason — with the keyboard over the pill that was asking. So
     the button is live the moment there are words, and pressing it with no
     mood yet ASKS for one and then seals. The requirement didn't move; the
     explanation did — from a disabled state nobody can read into the next
     step of the ritual. Dismiss the keyboard first, or the sheet opens
     underneath it. */
  const askMood = () => {
    Keyboard.dismiss();
    setMoodOpen((v) => !v);
  };

  const addPhotos = async () => {
    const remaining = 9 - photos.length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return;
    const picked: Photo[] = res.assets.map((a) => ({
      uri: a.uri,
      ratio: a.width && a.height ? a.width / a.height : 0.8,
    }));
    setPhotos((prev) => [...prev, ...picked].slice(0, 9));
  };

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const setCover = (i: number) => {
    setPhotos((prev) => (i <= 0 || i >= prev.length ? prev : [prev[i], ...prev.filter((_, idx) => idx !== i)]));
  };

  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.8,
      videoMaxDuration: 180,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setAtt("video");
    setMediaUri(a.uri);
    setDur(a.duration ? Math.round(a.duration / 1000) : 0);
  };

  const clearMedia = () => {
    setMediaUri(null);
    setPhotos([]);
    setDur(0);
  };

  const toggleMode = (kind: Exclude<JournalType, "text">) => {
    if (att === kind) {
      setAtt(null);
      clearMedia();
      return;
    }
    setAtt(kind);
    clearMedia();
    if (kind === "photo") addPhotos();
    else if (kind === "video") pickVideo();
  };

  /* arrive straight in a mode (voice/video from Sealed's empty state) — or,
     the usual way in since 2026-09-20, with the pictures already chosen on
     the roll (journal-pick): they land on the page, no picker opens */
  const { start, demo } = useLocalSearchParams<{ start?: string; demo?: string }>();
  const armed = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // store mode (dev): two pictures off the roll and the mood tray open
      if (__DEV__ && storeMode && demo && !armed.current) {
        armed.current = true;
        if (storePhotos.length) {
          setAtt("photo");
          setPhotos(storePhotos.slice(0, 9));
        }
        setTimeout(() => setMoodOpen(true), 500);
        return;
      }
      /* whatever the roll left: pictures (first time, or more of them
         after + ADD), or one film */
      const p = takePicked();
      if (p) {
        if ("photos" in p) {
          setAtt("photo");
          setMediaUri(null);
          setPhotos(p.photos.slice(0, 9));
        } else {
          setAtt("video");
          setPhotos([]);
          setMediaUri(p.video.uri);
          setDur(p.video.duration);
        }
        armed.current = true;
        return;
      }
      if (armed.current) return;
      armed.current = true;
      if (start === "voice" || start === "video") toggleMode(start);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start, demo]),
  );



  /* the page stays open, words and all, when the journal couldn't take it;
     its id is made once, so sealing again replaces a save that half-landed */
  const pageId = useRef<string | null>(null);
  const sealPage = async (page: Parameters<typeof addEntry>[0]): Promise<boolean> => {
    pageId.current ??= `j-${Date.now()}`;
    try {
      await addEntry({ ...page, id: pageId.current });
      return true;
    } catch (e) {
      console.warn("[compose] the journal didn't save the page:", e);
      setBusy(false);
      Alert.alert(t("sc.journalTitle"), t("cp.fail.generic"));
      return false;
    }
  };

  const pickMood = async (mood: MoodId) => {
    setMoodOpen(false);
    if (busy) return;
    setBusy(true);
    const body = text.trim();

    // photo album — persist every frame, remember the cover
    if (att === "photo" && photos.length) {
      const uris = await persistMediaMany(
        photos.map((p) => p.uri),
        "jpg",
      );
      if (!uris.length) {
        setBusy(false);
        Alert.alert(t("sc.journalTitle"), t("sc.failPhotos"));
        return;
      }
      if (!(await sealPage({ type: "photo", body, mood, media: uris, coverIndex: 0, mediaUri: uris[0] }))) return;
      setBusy(false);
      onDone();
      return;
    }

    // single media (voice / video)
    let persisted: string | undefined;
    if ((att === "voice" || att === "video") && mediaUri) {
      const ext = att === "video" ? "mp4" : "m4a";
      persisted = (await persistMedia(mediaUri, ext)) || undefined;
      if (!persisted) {
        setBusy(false);
        Alert.alert(t("sc.journalTitle"), t("sc.failMedia"));
        return;
      }
    }
    if (
      !(await sealPage({
        type: persisted && att ? att : "text",
        body,
        mood,
        mediaUri: persisted,
        dur: dur || undefined,
      }))
    )
      return;
    /* A sealed page feeds NOTHING. It used to send signatureVector(body) — a
       vector of numbers derived from the text — to the fingerprint, and while
       that isn't the text and can't be read back as it, "no one sees this, not
       even me" is one of this product's most expensive promises and it isn't
       worth a few more samples. The signature learns from letters only, which
       were always meant to leave. */
    setBusy(false);
    // the sealed page is put away and KEPT — the opposite ending to a letter,
    // because this one is written never to leave
    setSealed(true);
  };


  if (sealed) {
    return (
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <CourierSendOff keep onDone={onDone} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[{ flex: 1 }, lift]}>
        {/* `flex: 1` is what keeps the mood, the tools and SEAL above the
            keyboard. Without it the scroller takes its CONTENT height — the
            page is 430pt of writing room before anything else — so when the
            keyboard took its 336pt the whole bottom cluster was pushed off
            the screen, and the mood the seal was waiting for was the first
            thing to go under. The page is free to be long; it scrolls. */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, paddingTop: 10 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* The page IS the screen. It used to be a bordered sheet taped down
              inside the view — but tape holds paper ONTO something, and once
              the paper fills the screen there's nothing left to hold it to.
              Full bleed the same way the letter desk is. */}
          <View style={{ minHeight: 430 }}>

            {/* THE LINE COMES FIRST (owner, 2026-09-20). With photos on the
                page the caption used to sit under the album; it sits above
                the pictures now, on the page itself — no frame around it
                (a box was tried and rejected the same day). Being at the
                top, it stays in view when the keyboard comes up. */}
            {att && (
              <View style={{ marginBottom: 12 }}>
                <GlyphInput
                  value={text}
                  onChangeText={setText}
                  placeholder={t("sc.ph")}
                  placeholderTextColor="#C4B48D"
                  multiline
                  style={{ minHeight: 60, maxHeight: 180, color: Z.ink, fontFamily: PF.writing, fontSize: 19, lineHeight: 30, paddingTop: 6, paddingBottom: 8, textAlignVertical: "top" }}
                />
              </View>
            )}

            {/* photo album — up to 9, two to a row so they read as pictures
                rather than thumbnails; the first is the cover; a tap opens
                the frame */}
            {att === "photo" && photos.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {photos.map((p, i) => (
                    <Pressable key={p.uri + i} onPress={() => setViewer(i)} style={({ pressed }) => ({ width: "48.6%", aspectRatio: 1, overflow: "hidden", opacity: pressed ? 0.85 : 1 })}>
                      <Image source={{ uri: p.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    </Pressable>
                  ))}
                </View>

                {/* one line, no count and no + ADD (owner, 2026-09-20): the
                    roll already stops at nine, and it is the place to add.
                    With a single picture there is no cover to choose, so
                    the line waits for a second one. */}
                {photos.length >= 2 && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 12 }}>{t("sc.coverHint")}</Text>
                )}
              </View>
            )}
            {att === "video" && mediaUri && <VideoPreview uri={mediaUri} onClear={() => toggleMode("video")} />}
            {att === "voice" && (
              <View style={{ marginBottom: 16 }}>
                <Recorder
                  doneUri={mediaUri}
                  doneDur={dur}
                  onDone={(uri, s) => {
                    setMediaUri(uri);
                    setDur(s);
                  }}
                  onClear={() => {
                    setMediaUri(null);
                    setDur(0);
                  }}
                />
                {mediaUri && (
                  <View style={{ marginTop: 10 }}>
                    <AudioCard url={mediaUri} durationS={dur} compact />
                  </View>
                )}
              </View>
            )}

            {!att && (
              <Pressable onPress={() => setPIdx((p) => (p + 1) % openers.length)} style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                  <WrenBird size={27} mood="content" />
                </View>
                <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13.5, color: P.ink60, lineHeight: 19 }}>
                  “{openers[pIdx]}”
                </Text>
              </Pressable>
            )}

            {/* Wren needs a floor. Without a line under her she just hovers
                over the page with nothing holding her, and it isn't clear
                whether she's part of what you're writing. One rule gives her
                somewhere to stand and marks where your own words begin. */}
            {!att && <View style={{ borderBottomWidth: 1, borderColor: P.ink12, marginTop: 6, marginBottom: 10 }} />}

            {/* No ruled lines. They were doing the work of saying "notebook",
                but a page with rules printed on it is a page that expects a
                certain kind of writing on a certain size of line — and the
                writing here is whatever comes. */}
            {!att && (
            <View>
              <GlyphInput
                value={text}
                onChangeText={setText}
                placeholder={spark}
                placeholderTextColor="#C4B48D"
                multiline
                style={{
                  minHeight: 328,
                  color: Z.ink,
                  fontFamily: PF.writing,
                  fontSize: 19,
                  lineHeight: 30,
                  textAlignVertical: "top",
                  paddingTop: 8,
                }}
              />
            </View>
            )}

          </View>

        </ScrollView>

        {/* THE BAR (owner, 2026-09-20): a round mood key and the seal key —
            the same two keys as the letter desk, in the same places. The
            photo / voice / video keys are gone: the way in (journal-pick)
            already decided what kind of page this is, and the album has
            its own + cell. The mood key shows a blank face until a mood is
            picked, then that face; the seal key turns pen blue and asks
            HOW DID THIS FEEL? until it is. Sealed's calendar is made of
            these faces, which is why one is required. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: moodOpen ? 12 : 24 }}>
          <Pressable
            onPress={askMood}
            style={({ pressed }) => ({
              width: 52,
              height: 52,
              borderRadius: 26,
              borderWidth: 1.5,
              borderColor: mood ? MOODS[mood].col : moodOpen ? P.pen : P.ink,
              backgroundColor: mood ? MOODS[mood].bg : "transparent",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {mood ? <MoodIcon id={mood} size={36} /> : <MoodKeyGlyph size={27} color={moodOpen ? P.pen : P.ink} />}
          </Pressable>

          <Pressable
            onPress={() => {
              if (busy || !hasSomething) return;
              // no mood yet: the key opens the tray, the way the letter's
              // send key opens the stamps
              if (!mood) return askMood();
              void pickMood(mood);
            }}
            disabled={!hasSomething || busy}
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
              backgroundColor: !hasSomething || busy ? "transparent" : mood ? P.ink : P.pen,
              borderWidth: 1,
              borderColor: !hasSomething || busy ? P.ink12 : mood ? P.ink : P.pen,
              paddingVertical: 17,
              alignItems: "center",
            }}
          >
            {hasSomething && !mood && !busy && !moodOpen && <Nudge color="#FFFFFF" />}
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1.4, color: hasSomething && !busy ? "#fff" : P.ink40 }}>
              {busy ? t("sc.sealing") : !mood && hasSomething ? t("sc.askMood") : t("sc.seal")}
            </Text>
          </Pressable>
        </View>
        {moodOpen && (
          <MoodTray
            selected={mood}
            onPick={(m) => {
              setMood(m);
              setMoodOpen(false);
            }}
          />
        )}
      </Animated.View>

      <FrameViewer
        photos={photos}
        index={viewer}
        onClose={() => setViewer(null)}
        onCover={(i) => {
          setCover(i);
          setViewer(null);
        }}
        onRemove={(i) => {
          removePhoto(i);
          setViewer((v) => (photos.length <= 1 ? null : Math.min(v ?? 0, photos.length - 2)));
        }}
      />
    </View>
  );
}

/* ONE FRAME, FULL SCREEN — back, a count, a bin, and the one thing you
   can do to it from here: make it the cover. Touching the picture goes
   back to the page. */
function FrameViewer({ photos, index, onClose, onCover, onRemove }: { photos: Photo[]; index: number | null; onClose: () => void; onCover: (i: number) => void; onRemove: (i: number) => void }) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(index ?? 0);
  useEffect(() => {
    if (index !== null) setPage(index);
  }, [index]);
  const { width } = useWindowDimensions();
  if (index === null) return null;
  const i = Math.min(page, photos.length - 1);
  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#0A0A0C" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: insets.top + 4, paddingHorizontal: 8, height: insets.top + 52 }}>
          <Pressable onPress={onClose} hitSlop={10} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 24, color: "#FFFFFF" }}>‹</Text>
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.4, color: "#FFFFFF" }}>
            {i + 1}/{photos.length}
          </Text>
          <Pressable onPress={() => onRemove(i)} hitSlop={10} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </Svg>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: i * width, y: 0 }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          {photos.map((p, k) => (
            <Pressable key={p.uri + k} onPress={onClose} style={{ width, justifyContent: "center" }}>
              <Image source={{ uri: p.uri }} style={{ width, height: "100%" }} resizeMode="contain" />
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ alignItems: "center", paddingBottom: insets.bottom + 18, paddingTop: 12 }}>
          {i === 0 ? (
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.4, color: "rgba(255,255,255,0.55)" }}>{t("sc.isCover")}</Text>
          ) : (
            <Pressable onPress={() => onCover(i)} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.4, color: "#FFFFFF" }}>{t("sc.makeCover")}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function VideoPreview({ uri, onClear }: { uri: string; onClear: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });
  return (
    <View style={{ overflow: "hidden", marginBottom: 16, position: "relative", maxHeight: 300 }}>
      <VideoView player={player} style={{ width: "100%", aspectRatio: 9 / 16, maxHeight: 300 }} contentFit="cover" nativeControls={false} />
      <Pressable onPress={onClear} style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 11 }}>✕</Text>
      </Pressable>
    </View>
  );
}
