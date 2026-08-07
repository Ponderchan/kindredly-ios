import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { C, F, cardStyle, navyBtn } from "../theme/tokens";
import { Wren } from "../components/Wren";
import { MoodModal } from "../components/MoodModal";
import { Recorder } from "../components/Recorder";
import { AudioCard } from "../components/AudioCard";
import { WREN_OPENERS } from "../data/content";
import type { MoodId } from "../data/moods";
import { dLong } from "../lib/format";
import { addEntry, persistMedia, persistMediaMany, type JournalType } from "../lib/journal";
import { upsertFingerprint } from "../lib/db";
import { signatureVector, voiceSignature } from "../lib/signature";

const LANG = "en";

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18, color: C.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 2, color: C.faint }}>YOUR JOURNAL</Text>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[cardStyle, { borderRadius: 20, padding: 24, minHeight: 340, marginTop: 8 }]}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1.6, color: C.label, marginBottom: 16 }}>
              {dLong(new Date()).toUpperCase()}
            </Text>

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
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <Wren size={18} mode="line" />
                  <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.6, color: C.purple }}>WREN SUGGESTS</Text>
                </View>
                <Pressable onPress={() => setPIdx((p) => (p + 1) % openers.length)} style={{ marginBottom: 18 }}>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 16, color: C.muted, lineHeight: 25 }}>“{openers[pIdx]}”</Text>
                </Pressable>
              </>
            )}

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={att ? "A line to go with it… (optional)" : "Today…"}
              placeholderTextColor={C.faint}
              multiline
              style={{ minHeight: att ? 80 : 180, color: "#22222A", fontFamily: F.letter, fontSize: 19, lineHeight: 31, textAlignVertical: "top" }}
            />
          </View>

          {/* mode toggles — Photo / Voice / Video */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            {(
              [
                ["photo", "🖼", "Photo"],
                ["voice", "🎙", "Voice"],
                ["video", "🎬", "Video"],
              ] as [Exclude<JournalType, "text">, string, string][]
            ).map(([k, ic, lb]) => {
              const on = att === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => toggleMode(k)}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: "center", backgroundColor: on ? C.purpleLt : C.card, borderWidth: 1, borderColor: on ? C.purple : C.line }}
                >
                  <Text style={{ fontFamily: F.sansBold, fontSize: 12, color: on ? C.purple : C.muted }}>
                    {ic}  {lb}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 16 }}>
            🔒 Sealed on this device. Only a line you choose can ever drift out.
          </Text>
        </ScrollView>

        <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 26 }}>
          <Pressable onPress={() => canSave && setMoodOpen(true)} disabled={!canSave || busy} style={[navyBtn, { paddingVertical: 19, width: "100%", opacity: canSave && !busy ? 1 : 0.3 }]}>
            <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 14, letterSpacing: 1.6 }}>
              {busy ? "SAVING…" : "SAVE TO JOURNAL"}
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
