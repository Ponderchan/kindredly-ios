import { useEffect, useRef, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { C, F } from "../theme/tokens";
import { Wren } from "../components/Wren";
import { WrenBird } from "../components/WrenBird";
import { MoodModal } from "../components/MoodModal";
import { MoodIcon } from "../components/MoodIcon";
import { Recorder } from "../components/Recorder";
import { AudioCard } from "../components/AudioCard";
import { WREN_OPENERS } from "../data/content";
import { MOODS, MOOD_IDS, type MoodId } from "../data/moods";
import { addEntry, persistMedia, persistMediaMany, type JournalType } from "../lib/journal";
import { upsertFingerprint } from "../lib/db";
import { signatureVector, voiceSignature } from "../lib/signature";

const LANG = "en";

// the cream zine — warm paper, washi tape, brown ink
const Z = {
  bg: "#F1E9D6",
  paper: "#FDF8EC",
  ink: "#4A3B20",
  soft: "#9C8A64",
  rule: "#E7DAB9",
  gold: "#8F7434",
  tapeA: "rgba(197,174,128,0.55)",
  tapeB: "rgba(189,178,232,0.6)",
};

type Photo = { uri: string; ratio: number };

export default function JournalEntry() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pIdx, setPIdx] = useState(0);
  const [moodOpen, setMoodOpen] = useState(false);
  const [att, setAtt] = useState<Exclude<JournalType, "text"> | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [coverIdx, setCoverIdx] = useState(0);
  const [wrenNote, setWrenNote] = useState<string | null>(null);
  const [dur, setDur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<MoodId | null>(null); // inline pick; modal is the fallback

  const openers = WREN_OPENERS.journal[LANG];
  const hasMedia = att === "photo" ? photos.length > 0 : !!mediaUri;
  const canSave = text.trim().length > 0 || (hasMedia && att !== null);

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
    setWrenNote("I'd lead with this one — it holds the eye.");
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
        Alert.alert("Journal", "Couldn't save the photos. Try again.");
        return;
      }
      const ci = Math.min(coverIdx, uris.length - 1);
      await addEntry({ type: "photo", body, mood, media: uris, coverIndex: ci, mediaUri: uris[ci] });
      setBusy(false);
      router.back();
      return;
    }

    // single media (voice / video)
    let persisted: string | undefined;
    if ((att === "voice" || att === "video") && mediaUri) {
      const ext = att === "video" ? "mp4" : "m4a";
      persisted = (await persistMedia(mediaUri, ext)) || undefined;
      if (!persisted) {
        setBusy(false);
        Alert.alert("Journal", "Couldn't save the media file. Try again.");
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
    if (voiceSignature(body).words >= 4) {
      try {
        await upsertFingerprint(signatureVector(body), voiceSignature(body).words);
      } catch {
        /* best-effort */
      }
    }
    setBusy(false);
    router.back();
  };

  const dateStr = new Date().toLocaleString("en-US", { month: "short", day: "numeric" }).toLowerCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Z.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#4A3B20", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
        >
          <Text style={{ fontSize: 15, color: Z.ink }}>✕</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={{ backgroundColor: Z.gold, borderRadius: 17, paddingHorizontal: 16, paddingVertical: 9, transform: [{ rotate: "0.8deg" }] }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 11, letterSpacing: 2, color: "#FBF4E4" }}>JUST FOR ME 🔒</Text>
          </View>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14, paddingTop: 22 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* the page — taped down at the corners */}
          <View
            style={{
              backgroundColor: Z.paper,
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 16,
              minHeight: 430,
              shadowColor: "#4A3B20",
              shadowOpacity: 0.1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 5 },
            }}
          >
            <View style={{ position: "absolute", top: -11, left: 34, width: 92, height: 24, backgroundColor: Z.tapeA, transform: [{ rotate: "-3deg" }] }} />
            <View style={{ position: "absolute", top: -9, right: 40, width: 110, height: 24, backgroundColor: Z.tapeB, transform: [{ rotate: "2deg" }] }} />

            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 32, color: Z.ink }}>{dateStr}</Text>
              <Text style={{ fontFamily: F.sansBold, fontSize: 9.5, letterSpacing: 1.8, color: Z.soft, paddingBottom: 8 }}>NO ONE'S WATCHING</Text>
            </View>

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
                        style={{ width: "31.2%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", position: "relative", borderWidth: isCover ? 2 : 0, borderColor: C.purple }}
                      >
                        <Image source={{ uri: p.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        {isCover && (
                          <View style={{ position: "absolute", left: 5, bottom: 5, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.purple, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9 }}>
                            <Text style={{ color: "#fff", fontSize: 8.5, fontFamily: F.sansBold }}>✦ COVER</Text>
                          </View>
                        )}
                        <Pressable onPress={() => removePhoto(i)} hitSlop={6} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#fff", fontSize: 10 }}>✕</Text>
                        </Pressable>
                      </Pressable>
                    );
                  })}
                  {photos.length < 9 && (
                    <Pressable onPress={addPhotos} style={{ width: "31.2%", aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: C.cream }}>
                      <Text style={{ fontSize: 22, color: C.faint }}>＋</Text>
                    </Pressable>
                  )}
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.faint }}>
                    {photos.length}/9 · tap a photo to make it the cover
                  </Text>
                  {photos.length >= 2 && (
                    <Pressable onPress={wrenPickCover} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, backgroundColor: C.purpleLt }}>
                      <Wren size={13} mode="line" />
                      <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.purple }}>Let Wren pick</Text>
                    </Pressable>
                  )}
                </View>
                {wrenNote && (
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.purple, marginTop: 8 }}>“{wrenNote}”</Text>
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
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3EAD2", alignItems: "center", justifyContent: "center" }}>
                  <WrenBird size={27} mood="content" />
                </View>
                <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13, color: Z.soft, lineHeight: 18 }}>
                  “{openers[pIdx]}”
                </Text>
              </Pressable>
            )}

            {/* ruled paper under the handwriting */}
            <View style={{ position: "relative" }}>
              {!att &&
                Array.from({ length: 8 }, (_, i) => (
                  <View key={i} style={{ position: "absolute", left: 0, right: 0, top: 47 + i * 40, height: 1, backgroundColor: Z.rule }} />
                ))}
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={att ? "a line to go with it… (optional)" : "today felt like…"}
                placeholderTextColor="#C4B48D"
                multiline
                style={{
                  minHeight: att ? 80 : 328,
                  color: Z.ink,
                  fontFamily: F.letter,
                  fontSize: 19,
                  lineHeight: 40,
                  textAlignVertical: "top",
                  paddingTop: 8,
                }}
              />
            </View>

            {/* how today felt — the page keeps it */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }} keyboardShouldPersistTaps="handled">
              {MOOD_IDS.map((id) => {
                const on = mood === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setMood(on ? null : id)}
                    hitSlop={4}
                    style={{ borderRadius: 20, borderWidth: 1.5, borderColor: on ? MOODS[id].col : "transparent", padding: 2, opacity: mood && !on ? 0.45 : 1 }}
                  >
                    <MoodIcon id={id} size={32} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: Z.soft, textAlign: "center", marginTop: 14 }}>
            🔒 sealed on this device. only a line you choose can ever drift out.
          </Text>
        </ScrollView>

        {/* Aa / mic / photo / video — then tuck it away */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 }}>
          {(
            [
              [null, "Aa"],
              ["voice", "🎙"],
              ["photo", "🖼"],
              ["video", "🎬"],
            ] as [Exclude<JournalType, "text"> | null, string][]
          ).map(([k, icon]) => {
            const on = att === k;
            return (
              <Pressable
                key={icon}
                onPress={() => (k ? toggleMode(k) : att && toggleMode(att))}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: on ? Z.gold : "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#4A3B20",
                  shadowOpacity: 0.12,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <Text style={{ fontFamily: F.sansBold, fontSize: 15, color: on ? "#FBF4E4" : Z.ink }}>{icon}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => canSave && (mood ? pickMood(mood) : setMoodOpen(true))}
            disabled={!canSave || busy}
            style={{ flex: 1, backgroundColor: Z.gold, borderRadius: 26, paddingVertical: 16, alignItems: "center", opacity: canSave && !busy ? 1 : 0.35 }}
          >
            <Text style={{ color: "#FBF4E4", fontFamily: F.sansExtra, fontSize: 14.5 }}>
              {busy ? "tucking…" : "tuck it away 🍂"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <MoodModal visible={moodOpen} onPick={pickMood} onCancel={() => setMoodOpen(false)} />
    </SafeAreaView>
  );
}

function VideoPreview({ uri, onClear }: { uri: string; onClear: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });
  return (
    <View style={{ borderRadius: 14, overflow: "hidden", marginBottom: 16, position: "relative", maxHeight: 300 }}>
      <VideoView player={player} style={{ width: "100%", aspectRatio: 9 / 16, maxHeight: 300 }} contentFit="cover" nativeControls={false} />
      <Pressable onPress={onClear} style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 11 }}>✕</Text>
      </Pressable>
    </View>
  );
}
