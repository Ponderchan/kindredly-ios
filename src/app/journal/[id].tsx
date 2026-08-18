import { useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { P, PF, rule } from "../../theme/post";
import { AudioCard } from "../../components/AudioCard";
import { LinePicker } from "../../components/LinePicker";
import { MoodIcon } from "../../components/MoodIcon";
import { getMood } from "../../data/moods";
import { DEMO_JOURNAL } from "../../data/demo";
import { insertMorningFragment } from "../../lib/db";
import { deleteEntry, loadJournal, setCover, setDrift, type JournalEntry } from "../../lib/journal";

/* A single journal page — the sealed room, one page at a time. Read it, let a
   line drift, or tear it out. Sample pages are read-only.

   Same surface and same plate as the tabs: white, rules doing the separation,
   mono for what the system files, the system font for what you wrote. The mood
   face and the photos keep their colour — they're content. */
export default function JournalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [e, setE] = useState<JournalEntry | null>(null);
  const [drifting, setDrifting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const isDemo = !!id?.startsWith("demo-");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (isDemo) {
        const d = DEMO_JOURNAL.find((x) => x.id === id) || null;
        setE(d);
        setSel(d?.coverIndex ?? 0);
      } else {
        loadJournal().then((all) => {
          if (!alive) return;
          const found = all.find((x) => x.id === id) || null;
          setE(found);
          setSel(found?.coverIndex ?? 0);
        });
      }
      return () => {
        alive = false;
      };
    }, [id, isDemo]),
  );

  const makeCover = async () => {
    if (!e || isDemo) return;
    await setCover(e.id, sel);
    setE({ ...e, coverIndex: sel, mediaUri: e.media?.[sel] || e.mediaUri });
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal"));

  const confirmDelete = () => {
    if (!e) return;
    Alert.alert("Tear this page out?", "It disappears from the sealed room. A line that already drifted stays out in the world.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Tear it out",
        style: "destructive",
        onPress: async () => {
          await deleteEntry(e.id);
          goBack();
        },
      },
    ]);
  };

  const onPickLine = async (line: string) => {
    setDrifting(false);
    if (!e) return;
    await insertMorningFragment(line, e.mood, "en");
    await setDrift(e.id, line);
    setE({ ...e, driftedLine: line });
  };

  if (!e) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <Pressable onPress={goBack} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const m = getMood(e.mood);
  const pure = e.type === "text";
  const canDrift = !isDemo && e.body.trim().length >= 3 && !e.driftedLine;

  // the page stays neutral — the mood lives in its face, not the background
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      {/* header — back + a ··· menu; the date leads the entry from the centre */}
      <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginHorizontal: 16, paddingBottom: 4 }, rule]}>
        <Pressable onPress={goBack} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        {isDemo ? (
          <View style={{ width: 42 }} />
        ) : (
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 20, color: P.ink }}>···</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* the mood face leads, the date sits under it — both centred (Apple-style) */}
        <View style={{ alignItems: "center", marginBottom: 24, marginTop: 4 }}>
          <MoodIcon id={m.id} size={48} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <CalGlyph />
            <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 0.8, color: P.ink60 }}>
              {new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
              {isDemo ? " · SAMPLE" : ""}
            </Text>
          </View>
        </View>

        {/* photo gallery */}
        {e.type === "photo" && (
          <PhotoGallery
            photos={e.media?.length ? e.media : e.mediaUri ? [e.mediaUri] : []}
            sel={sel}
            onSelect={setSel}
            coverIndex={e.coverIndex ?? 0}
            onSetCover={makeCover}
            canSetCover={!isDemo}
          />
        )}
        {e.type === "voice" && !!e.mediaUri && (
          <View style={{ marginBottom: 18 }}>
            <AudioCard url={e.mediaUri} durationS={e.dur} tint={m.col} />
          </View>
        )}
        {e.type === "video" && !!e.mediaUri && <DetailVideo uri={e.mediaUri} />}

        {/* the page */}
        {!!e.body && (
          <Text style={{ fontFamily: PF.letter, fontSize: pure ? 20 : 16.5, lineHeight: pure ? 34 : 27, color: P.ink }}>
            {e.body}
          </Text>
        )}

        {/* drifted state — the action itself now lives in the ··· menu */}
        {e.driftedLine && (
          <View style={{ marginTop: 28, borderTopWidth: 1, borderTopColor: P.ink, paddingTop: 14 }}>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.pen, marginBottom: 10 }}>
              ONE LINE IS OUT IN THE WORLD
            </Text>
            <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 24, color: P.ink, backgroundColor: "#F6E7A6" }}>{e.driftedLine}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 10 }}>
              TOMORROW IT MIGHT BE THE FIRST THING A STRANGER READS
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ··· dropdown — anchored under the button, tap outside to close */}
      {menuOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View
            style={{
              position: "absolute",
              top: 48,
              right: 14,
              backgroundColor: P.paper,
              borderWidth: 1,
              borderColor: P.ink,
              minWidth: 232,
            }}
          >
            {canDrift && (
              <MenuRow
                label="LET ONE LINE DRIFT OUT"
                onPress={() => {
                  setMenuOpen(false);
                  setDrifting(true);
                }}
              />
            )}
            <MenuRow
              label="TEAR THIS PAGE OUT"
              destructive
              onPress={() => {
                setMenuOpen(false);
                confirmDelete();
              }}
            />
          </View>
        </>
      )}

      <LinePicker visible={drifting} body={e.body} onPick={onPickLine} onClose={() => setDrifting(false)} />
    </SafeAreaView>
  );
}

/* a tiny monochrome calendar (the 📅 emoji bakes in a wrong date) */
function CalGlyph() {
  return (
    <View style={{ width: 13, height: 13, borderWidth: 1.4, borderColor: P.ink60, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", top: -2.5, left: 2.5, width: 1.5, height: 3, borderRadius: 1, backgroundColor: P.ink60 }} />
      <View style={{ position: "absolute", top: -2.5, right: 2.5, width: 1.5, height: 3, borderRadius: 1, backgroundColor: P.ink60 }} />
      <View style={{ width: 6, height: 1.4, borderRadius: 1, backgroundColor: P.ink60 }} />
    </View>
  );
}

function MenuRow({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? P.paperDeep : "transparent" })}>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 12, letterSpacing: 1, color: destructive ? P.post : P.ink }}>{label}</Text>
    </Pressable>
  );
}

function PhotoGallery({
  photos,
  sel,
  onSelect,
  coverIndex,
  onSetCover,
  canSetCover,
}: {
  photos: string[];
  sel: number;
  onSelect: (i: number) => void;
  coverIndex: number;
  onSetCover: () => void;
  canSetCover: boolean;
}) {
  if (!photos.length) return null;
  const cur = Math.min(sel, photos.length - 1);
  const many = photos.length > 1;
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ overflow: "hidden", position: "relative" }}>
        <Image source={{ uri: photos[cur] }} style={{ width: "100%", aspectRatio: 4 / 5 }} resizeMode="cover" />
        {many && (
          <View style={{ position: "absolute", right: 10, top: 10, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 9, paddingVertical: 4 }}>
            <Text style={{ color: "#fff", fontSize: 11, fontFamily: PF.mono }}>
              {cur + 1} / {photos.length}
            </Text>
          </View>
        )}
      </View>

      {many && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
          {photos.map((p, i) => {
            const on = i === cur;
            const isCover = i === coverIndex;
            return (
              <Pressable key={p + i} onPress={() => onSelect(i)} style={{ position: "relative" }}>
                <Image
                  source={{ uri: p }}
                  style={{ width: 60, height: 60, borderWidth: on ? 2 : 0, borderColor: P.pen, opacity: on ? 1 : 0.7 }}
                  resizeMode="cover"
                />
                {isCover && (
                  <View style={{ position: "absolute", left: 3, bottom: 3, backgroundColor: P.pen, paddingHorizontal: 5, paddingVertical: 2 }}>
                    <Text style={{ color: "#fff", fontSize: 7.5, fontFamily: PF.mono }}>✦</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {many && canSetCover && cur !== coverIndex && (
        <Pressable
          onPress={onSetCover}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6, paddingVertical: 11, borderWidth: 1, borderColor: P.pen }}
        >
          <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>MAKE THIS THE COVER</Text>
        </Pressable>
      )}
    </View>
  );
}

function DetailVideo({ uri }: { uri: string }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  const toggle = () => {
    if (playing) player.pause();
    else player.play();
    setPlaying(!playing);
  };
  return (
    <Pressable onPress={toggle} style={{ overflow: "hidden", marginBottom: 18 }}>
      <VideoView player={player} style={{ width: "100%", aspectRatio: 9 / 16, maxHeight: 420 }} contentFit="cover" nativeControls={false} />
      {!playing && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 56, height: 56, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 22, marginLeft: 3 }}>▶</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
