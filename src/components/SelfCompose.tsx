import { useEffect, useRef, useState } from "react";
import { GlyphInput } from "./GlyphInput";
import { useWrenName } from "../lib/wren-name";
import { Alert, Image, Keyboard, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import {C} from "../theme/tokens";
import { getLang, t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { Wren } from "./Wren";
import { WrenBird } from "./WrenBird";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { MoodModal } from "./MoodModal";
import { MoodIcon } from "./MoodIcon";
import { Recorder } from "./Recorder";
import { AudioCard } from "./AudioCard";
import { WREN_OPENERS, byLang } from "../data/content";
import type { Lang } from "../data/stamps";
import { MOODS, MOOD_IDS, type MoodId, moodName } from "../data/moods";
import { addEntry, loadJournal, persistMedia, persistMediaMany, type JournalType } from "../lib/journal";
import { journalSpark } from "../lib/journal-sparks";
import { CourierSendOff } from "./CourierSendOff";

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
  const [moodOpen, setMoodOpen] = useState(false);
  const sealOnPick = useRef(false); // the mood sheet was opened BY the seal

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
  const [tools, setTools] = useState(false);
  // the empty page's line, chosen from what's already on this device
  const [spark, setSpark] = useState("today felt like…");
  useEffect(() => {
    loadJournal().then((all) => setSpark(journalSpark(all)));
  }, []);
  const [att, setAtt] = useState<Exclude<JournalType, "text"> | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [coverIdx, setCoverIdx] = useState(0);
  const [wrenNote, setWrenNote] = useState<string | null>(null);
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
  const askMood = (thenSeal: boolean) => {
    Keyboard.dismiss();
    sealOnPick.current = thenSeal;
    setMoodOpen(true);
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
    setCoverIdx((c) => (i === c ? 0 : i < c ? c - 1 : c));
    setWrenNote(null);
  };

  const setCover = (i: number) => {
    setCoverIdx(i);
    setWrenNote(null);
  };

  // Wren picks the frame that reads best as a 4:5 cover (closest ratio).
  const wrenPickCover = () => {
    if (photos.length < 2) return;
    let best = 0;
    let bestD = Infinity;
    photos.forEach((p, i) => {
      const d = Math.abs(p.ratio - 0.8);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setCoverIdx(best);
    setWrenNote(t("sc.leadPhoto"));
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
    setCoverIdx(0);
    setWrenNote(null);
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

  // arrive straight in a mode when Sealed's empty state routes here (snap/say/film)
  const { start } = useLocalSearchParams<{ start?: string }>();
  const armed = useRef(false);
  useEffect(() => {
    if (armed.current) return;
    armed.current = true;
    if (start === "photo" || start === "voice" || start === "video") toggleMode(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

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
      const ci = Math.min(coverIdx, uris.length - 1);
      await addEntry({ type: "photo", body, mood, media: uris, coverIndex: ci, mediaUri: uris[ci] });
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
    await addEntry({
      type: persisted && att ? att : "text",
      body,
      mood,
      mediaUri: persisted,
      dur: dur || undefined,
    });
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


            {/* photo album — up to 9, tap a frame to make it the cover */}
            {att === "photo" && photos.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {photos.map((p, i) => {
                    const isCover = i === coverIdx;
                    return (
                      <Pressable
                        key={p.uri + i}
                        onPress={() => setCover(i)}
                        style={{ width: "31.2%", aspectRatio: 1, overflow: "hidden", position: "relative", borderWidth: isCover ? 2 : 0, borderColor: P.pen }}
                      >
                        <Image source={{ uri: p.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        {isCover && (
                          <View style={{ position: "absolute", left: 5, bottom: 5, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: P.pen, paddingHorizontal: 7, paddingVertical: 3 }}>
                            <Text style={{ color: "#fff", fontSize: 8.5, fontFamily: PF.mono }}>{t("sc.cover")}</Text>
                          </View>
                        )}
                        <Pressable onPress={() => removePhoto(i)} hitSlop={6} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#fff", fontSize: 10 }}>✕</Text>
                        </Pressable>
                      </Pressable>
                    );
                  })}
                  {photos.length < 9 && (
                    <Pressable onPress={addPhotos} style={{ width: "31.2%", aspectRatio: 1, borderWidth: 1, borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 22, color: C.faint }}>＋</Text>
                    </Pressable>
                  )}
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40 }}>
                    {t("sc.coverHint", { n: String(photos.length) })}
                  </Text>
                  {photos.length >= 2 && (
                    <Pressable onPress={wrenPickCover} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: P.pen }}>
                      <Wren size={13} mode="line" />
                      <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 0.8, color: P.pen }}>{t("sc.wrenPick", { wren: wren.toUpperCase() })}</Text>
                    </Pressable>
                  )}
                </View>
                {wrenNote && (
                  <Text style={{ fontFamily: PF.serifItalic, fontSize: 13, color: P.ink60, marginTop: 8 }}>“{wrenNote}”</Text>
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
                <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 13.5, color: P.ink60, lineHeight: 19 }}>
                  “{openers[pIdx]}”
                </Text>
              </Pressable>
            )}

            {/* Wren needs a floor. Without a line under her she just hovers
                over the page with nothing holding her, and it isn't clear
                whether she's part of what you're writing. One rule gives her
                somewhere to stand and marks where your own words begin. */}
            <View style={{ borderBottomWidth: 1, borderColor: P.ink12, marginTop: 6, marginBottom: 10 }} />

            {/* No ruled lines. They were doing the work of saying "notebook",
                but a page with rules printed on it is a page that expects a
                certain kind of writing on a certain size of line — and the
                writing here is whatever comes. */}
            <View>
              <GlyphInput
                value={text}
                onChangeText={setText}
                placeholder={att ? t("sc.ph") : spark}
                placeholderTextColor="#C4B48D"
                multiline
                style={{
                  minHeight: att ? 80 : 328,
                  color: Z.ink,
                  fontFamily: PF.writing,
                  fontSize: 19,
                  lineHeight: 30,
                  textAlignVertical: "top",
                  paddingTop: 8,
                }}
              />
            </View>

          </View>

        </ScrollView>

        {/* A mood is REQUIRED, and this is where you're asked for it — a pill
          above the bar, the way a tag sits above a composer's toolbar. The
          reason given is the true one: Sealed's calendar is built out of
          these faces, so the mood is literally how you find a day again. */}
      <Pressable
        onPress={() => askMood(false)}
        style={{ flexDirection: "row", alignItems: "center", gap: 9, alignSelf: "flex-start", marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: mood ? MOODS[mood].bg : P.paperDeep }}
      >
        {mood ? (
          <>
            <MoodIcon id={mood} size={22} />
            <Text style={{ fontFamily: PF.monoMed, fontSize: 12, letterSpacing: 0.4, color: MOODS[mood].col }}>{moodName(mood).toLowerCase()}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 11, color: P.ink40 }}>{t("cp.change")}</Text>
          </>
        ) : (
          <Text style={{ fontFamily: PF.letter, fontSize: 13.5, color: P.ink60 }}>
            {t("sc.moodHint")}
          </Text>
        )}
      </Pressable>

        {/* the tools, then the seal */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 }}>
          {(
            [
              ["photo", "photo"],
              ["voice", "voice"],
              ["video", "video"],
            ] as [Exclude<JournalType, "text"> | null, string][]
          )
            .slice(0, tools ? 3 : 1)
            .map(([k, icon]) => {
              const on = att === k;
              return (
                <Pressable
                  key={icon}
                  /* the tool key called the PICKER but never set `att` — so a
                     picked photo landed in state with nothing rendering it:
                     no strip, SEAL stayed grey, and the pick read as failed.
                     toggleMode is the one path that sets the mode first. */
                  onPress={() => k && toggleMode(k)}
                  style={{
                    width: 50,
                    height: 50,
                    backgroundColor: on ? P.ink : "transparent",
                    borderWidth: 1,
                    borderColor: P.ink,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ToolIcon kind={icon as "photo" | "voice" | "video"} on={on} />
                </Pressable>
              );
            })}

        {/* Three keys standing open is a toolbar; a page for one person
              doesn't need one. Photo stays out because it's what most days
              actually want, and the rest live behind the arrow. */}
          <Pressable
            onPress={() => setTools((v) => !v)}
            style={{ width: 34, height: 50, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontFamily: PF.mono, fontSize: 17, color: P.ink60 }}>{tools ? "‹" : "›"}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (busy || !hasSomething) return;
              if (!mood) return askMood(true);
              void pickMood(mood);
            }}
            disabled={!hasSomething || busy}
            style={{
              flex: 1,
              backgroundColor: hasSomething && !busy ? P.ink : "transparent",
              borderWidth: 1,
              borderColor: hasSomething && !busy ? P.ink : P.ink12,
              paddingVertical: 17,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1.4, color: hasSomething && !busy ? "#fff" : P.ink40 }}>
              {busy ? t("sc.sealing") : t("sc.seal")}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <MoodModal
        visible={moodOpen}
        onPick={(m) => {
          setMood(m);
          setMoodOpen(false);
          // asked for on the way to sealing — don't make them press it twice
          if (sealOnPick.current) {
            sealOnPick.current = false;
            void pickMood(m);
          }
        }}
        onCancel={() => {
          sealOnPick.current = false;
          setMoodOpen(false);
        }}
      />
    </View>
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

/* Drawn tools, not emoji. An emoji is somebody else's illustration in somebody
   else's style — 🖼 is a framed picture in a gallery, which is not what "add a
   photo" means — and it changes shape on every OS. These are the same weight
   and the same grid as the rest of the app's glyphs. */
function ToolIcon({ kind, on }: { kind: "photo" | "voice" | "video"; on: boolean }) {
  const c = on ? P.paper : P.ink;
  const st = { stroke: c, strokeWidth: 1.7, fill: "none" as const };
  if (kind === "photo")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Rect x={3} y={5} width={18} height={14} {...st} />
        <Path d="M3 16l5-5 4 4 3-3 6 6" {...st} strokeLinejoin="round" />
        <Circle cx={8.6} cy={9.4} r={1.5} fill={c} />
      </Svg>
    );
  if (kind === "voice")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Rect x={9} y={3} width={6} height={11} rx={3} {...st} />
        <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" {...st} strokeLinecap="round" />
        <Path d="M12 18v3" {...st} strokeLinecap="round" />
      </Svg>
    );
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={3} y={6} width={12} height={12} {...st} />
      <Path d="M15 11l6-3.4v8.8L15 13z" {...st} strokeLinejoin="round" />
    </Svg>
  );
}
