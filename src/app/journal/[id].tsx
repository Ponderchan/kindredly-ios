import { useCallback, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { deleteEntry, hideDemoEntry, loadJournal, setCover, setDrift, type JournalEntry } from "../../lib/journal";
import { SignUpSheet, openSignUpSheet } from "../../components/SignUpSheet";
import { useAuth } from "../../lib/auth";

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
  const isDemo = !!id?.startsWith("demo-");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (isDemo) {
        const d = DEMO_JOURNAL.find((x) => x.id === id) || null;
        setE(d);
      } else {
        loadJournal().then((all) => {
          if (!alive) return;
          const found = all.find((x) => x.id === id) || null;
          setE(found);
        });
      }
      return () => {
        alive = false;
      };
    }, [id, isDemo]),
  );

  const makeCover = async (i: number) => {
    if (!e || isDemo) return;
    await setCover(e.id, i);
    setE({ ...e, coverIndex: i, mediaUri: e.media?.[i] || e.mediaUri });
  };

  const { isGuest } = useAuth();
  const [needsAccount, setNeedsAccount] = useState(false);
  const [pendingLine, setPendingLine] = useState<string | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal"));

  const confirmDelete = () => {
    if (!e) return;
    if (isDemo) {
      // a sample tears out locally and never comes back
      Alert.alert("Tear this sample out?", "It's one of ours, not yours — it just stops appearing here.", [
        { text: "Keep it", style: "cancel" },
        {
          text: "Tear it out",
          style: "destructive",
          onPress: async () => {
            await hideDemoEntry(e.id);
            goBack();
          },
        },
      ]);
      return;
    }
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

  /* Drifting is the one thing in the sealed room that LEAVES it, so it is
     the one thing here that needs an account. Everything else on this page —
     writing, keeping, tearing out — stays on the phone and stays open to a
     ghost, which is the promise the room is built on. */
  const onPickLine = async (line: string) => {
    setDrifting(false);
    if (!e) return;
    const sent = await insertMorningFragment(line, e.mood, "en");
    if (!sent) {
      setPendingLine(line);
      if (isGuest) openSignUpSheet(() => setNeedsAccount(true));
      else Alert.alert("Couldn't send it out", "That line stayed put. Try again.");
      return;
    }
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
        {/* samples get the menu too — hiding it read as "delete is missing",
            not "this is a sample". Drift stays real-pages-only inside. */}
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 20, color: P.ink }}>···</Text>
        </Pressable>
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
            /* hangs under the ··· button. `top` is measured from inside the
               SafeAreaView, so it counts from below the notch — the old 48
               was tuned before this header changed height and had drifted up
               over the status bar. 56 clears the 42pt button plus its row. */
            style={{
              position: "absolute",
              top: 56,
              right: 14,
              backgroundColor: P.paper,
              borderWidth: 1,
              borderColor: P.ink,
              minWidth: 232,
            }}
          >
            {/* The whole page, not just a line. This is what makes choosing up
                front safe: a thought you sealed can still leave, once it's had
                time to sit — which is more this product than a switch flipped
                mid-sentence. It doesn't teleport: it carries your words to the
                letter desk, where you give it a stamp and send it yourself. */}
            {!isDemo && e.body.trim().length >= 3 && (
              <MenuRow
                label="LET THIS DRIFT OUT"
                onPress={() => {
                  setMenuOpen(false);
                  router.push({ pathname: "/compose", params: { seed: e.body } });
                }}
              />
            )}
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

      <SignUpSheet
        open={needsAccount}
        reason="This line is the one thing that leaves the sealed room, so it needs an account to travel under. The page itself stays here either way."
        onClose={() => setNeedsAccount(false)}
        onSignedIn={() => {
          setNeedsAccount(false);
          if (pendingLine) void onPickLine(pendingLine);
        }}
      />
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

/* ALL THE PHOTOS AT ONCE — the reference is Apple Journal's detail page.
   This was a 4:5 pager with a thumbnail strip and a 1/3 counter: one photo
   at a time, chrome everywhere, and no sense of the day as a set. Now the
   first band anchors it (the cover big on the left, the next four in a 2x2)
   — the same grammar as the entry card in the list, so opening an entry
   enlarges what you were already looking at — and everything after flows in
   rows of three. Square corners and 2px gaps, per the system; the reference
   rounds its corners, we don't.

   Tap a photo to see it full-screen on ink; long-press to make it the cover
   (the old MAKE THIS THE COVER button and the ✦ badges went with the strip —
   one gesture on the thing itself instead of chrome beside it). */
function PhotoGallery({
  photos,
  coverIndex,
  onSetCover,
  canSetCover,
}: {
  photos: string[];
  coverIndex: number;
  onSetCover: (i: number) => void;
  canSetCover: boolean;
}) {
  const [full, setFull] = useState<string | null>(null);
  const [rowW, setRowW] = useState(0);
  if (!photos.length) return null;
  const G = 2;
  const H = 250;

  const cell = (i: number, style: object) => (
    <Pressable
      key={photos[i] + i}
      style={[style, { overflow: "hidden" }]}
      onPress={() => setFull(photos[i])}
      onLongPress={() => {
        if (!canSetCover || i === coverIndex) return;
        onSetCover(i);
      }}
      delayLongPress={350}
    >
      <Image source={{ uri: photos[i] }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
    </Pressable>
  );

  const rest = photos.slice(5);
  return (
    <View style={{ marginBottom: 18 }}>
      {/* the anchor band — cover left, next four in a 2x2 */}
      {photos.length === 1 ? (
        <Pressable onPress={() => setFull(photos[0])} style={{ overflow: "hidden" }}>
          <Image source={{ uri: photos[0] }} style={{ width: "100%", aspectRatio: 4 / 5 }} resizeMode="cover" />
        </Pressable>
      ) : (
        <View style={{ flexDirection: "row", height: H, gap: G }}>
          {cell(0, { flex: 1 })}
          <View style={{ flex: 1, gap: G }}>
            <View style={{ flex: 1, flexDirection: "row", gap: G }}>
              {photos[1] ? cell(1, { flex: 1 }) : <View style={{ flex: 1 }} />}
              {photos[2] ? cell(2, { flex: 1 }) : <View style={{ flex: 1 }} />}
            </View>
            <View style={{ flex: 1, flexDirection: "row", gap: G }}>
              {photos[3] ? cell(3, { flex: 1 }) : <View style={{ flex: 1 }} />}
              {photos[4] ? cell(4, { flex: 1 }) : <View style={{ flex: 1 }} />}
            </View>
          </View>
        </View>
      )}

      {/* Everything after flows in rows of three. The width is computed from
          the measured row rather than a 33.33% that the 2px gaps then push
          onto the next line — that arithmetic is why the eighth photo fell to
          a row of its own with two empty slots beside it. flexGrow is left
          off for the same reason: a growing cell can't hold a square. */}
      {rest.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: G, marginTop: G }} onLayout={(ev) => setRowW(ev.nativeEvent.layout.width)}>
          {rowW > 0 &&
            rest.map((p, k) => {
              const side = (rowW - G * 2) / 3;
              return (
                <View key={p + k} style={{ width: side, height: side }}>
                  {cell(k + 5, { flex: 1 })}
                </View>
              );
            })}
        </View>
      )}

      {canSetCover && photos.length > 1 && (
        <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.8, color: P.ink40, marginTop: 8 }}>
          TAP TO VIEW · HOLD TO MAKE IT THE COVER
        </Text>
      )}

      {/* the lightbox — the photo alone on ink, tap anywhere to put it back */}
      <Modal visible={!!full} transparent animationType="fade" onRequestClose={() => setFull(null)}>
        <Pressable onPress={() => setFull(null)} style={{ flex: 1, backgroundColor: "rgba(10,10,12,0.96)", justifyContent: "center" }}>
          {full && <Image source={{ uri: full }} style={{ width: "100%", height: "80%" }} resizeMode="contain" />}
        </Pressable>
      </Modal>
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
