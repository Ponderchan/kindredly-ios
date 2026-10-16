import { useCallback, useEffect, useRef, useState } from "react";
import { localeTag } from "../../lib/format";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import Svg, { Path } from "react-native-svg";
import { t, useLang } from "../../lib/i18n";
import { PF } from "../../theme/post";
import { useP, useTheme } from "../../lib/theme";
import { AudioCard } from "../../components/AudioCard";
import { moodArtKey, moodGroup, moodLabel } from "../../data/moods";
import { demoJournal } from "../../data/demo";
import { deleteEntry, hideDemoEntry, loadJournal, setCover, type JournalEntry } from "../../lib/journal";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { MoodChip, moodColors } from "../../screens/notes/notes-glyphs";
import "../../data/strings-step5-notes";
import "../../data/strings-step5-kitrn"; // a11y.back

/* the ink on the drift highlight: the highlight is pale in every theme, so
   the words on it keep Classic's ink rather than the page's (light in a
   dark theme) */
const ON_HIGHLIGHT = "#1E1B35";

/* A single journal page — the sealed room, one page at a time. Read it, let a
   line drift, or tear it out. Sample pages are read-only.

   Same surface and same plate as the tabs: white, rules doing the separation,
   mono for what the system files, the system font for what you wrote. The mood
   face and the photos keep their colour — they're content. */
export default function JournalDetail() {
  useLang();
  const P = useP();
  const tk = useTheme().t;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [e, setE] = useState<JournalEntry | null>(null);
  // the first read has answered: a page still loading and a page that isn't there look different now
  const [read, setRead] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isDemo = !!id?.startsWith("demo-");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (isDemo) {
        // every sample opens, store mode or not (data/demo demoJournal)
        const d = demoJournal({ store: false }).find((x) => x.id === id) || null;
        setE(d);
        setRead(true);
      } else {
        loadJournal().then((all) => {
          if (!alive) return;
          const found = all.find((x) => x.id === id) || null;
          setE(found);
          setRead(true);
        });
      }
      return () => {
        alive = false;
      };
    }, [id, isDemo]),
  );

  const makeCover = async (i: number) => {
    if (!e || isDemo) return;
    try {
      await setCover(e.id, i);
    } catch (err) {
      console.warn("[journal] the cover didn't change:", err);
      Alert.alert(t("sc.journalTitle"), t("cp.fail.generic"));
      return;
    }
    setE({ ...e, coverIndex: i, mediaUri: e.media?.[i] || e.mediaUri });
  };


  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal"));

  const confirmDelete = () => {
    if (!e) return;
    if (isDemo) {
      // a sample tears out locally and never comes back
      Alert.alert(t("jd.tearSample.title"), t("jd.tearSample.body"), [
        { text: t("jd.keep"), style: "cancel" },
        {
          text: t("jd.tear"),
          style: "destructive",
          onPress: async () => {
            await hideDemoEntry(e.id);
            goBack();
          },
        },
      ]);
      return;
    }
    Alert.alert(t("jd.tearPage.title"), t("jd.tearPage.body"), [
      { text: t("jd.keep"), style: "cancel" },
      {
        text: t("jd.tear"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEntry(e.id);
          } catch (err) {
            console.warn("[journal] the page wasn't torn out:", err);
            Alert.alert(t("sc.journalTitle"), t("cp.fail.generic"));
            return;
          }
          goBack();
        },
      },
    ]);
  };

  if (!e) {
    /* still reading: just the way back. Read and not there (torn out on
       another screen, or a journal that couldn't be read): say so, rather
       than the blank page both used to share. */
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.back")} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
          </Pressable>
        </View>
        {read && (
          <Text style={{ fontSize: 15, lineHeight: 22, color: P.ink60, textAlign: "center", paddingHorizontal: 40, marginTop: 120 }}>{t("jd.notFound")}</Text>
        )}
      </SafeAreaView>
    );
  }

  const group = moodGroup(e.mood);
  const moodName = moodLabel(e.mood);
  const tint = moodColors(group).ink;
  const pure = e.type === "text";

  // the page stays neutral — the mood lives in its face, not the background
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      {/* header — back + a ··· menu; the date leads the entry from the centre */}
      {/* no rule under it: 10a's sub-page headers have none (H:90, H:97) */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginHorizontal: 16, paddingBottom: 4 }}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.back")} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        {/* samples get the menu too — hiding it read as "delete is missing",
            not "this is a sample". Drift stays real-pages-only inside. */}
        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("jd.more")}
          accessibilityState={{ expanded: menuOpen }}
          style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: PF.mono, fontSize: 20, color: P.ink }}>···</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* the mood leads, the date sits under it — both centred (Apple-style): the
            page's own face on its group tile (the group's face for a group alone,
            Calm for no readable mood), 52 like the composer's key that chose it
            (face 32 at stroke 1.75) */}
        <View style={{ alignItems: "center", marginBottom: 24, marginTop: 4 }}>
          <MoodChip group={group} icon={moodArtKey(e.mood)} size={52} radius={16} face={32} stroke={1.75} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <CalGlyph />
            {/* the mood's name after the date, as the cards say it (the group's
                name for a group alone) — never for a page that stored no mood */}
            <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 0.8, color: P.ink60 }}>
              {new Date(e.date).toLocaleDateString(localeTag(), { weekday: "short", month: "short", day: "numeric" }).toLocaleUpperCase(localeTag())}
              {moodName ? ` · ${moodName}` : ""}
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
            <AudioCard url={e.mediaUri} durationS={e.dur} tint={tint} />
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
          <View style={{ marginTop: 28, borderTopWidth: 1, borderTopColor: tk.ln, paddingTop: 14 }}>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.pen, marginBottom: 10 }}>
              {t("jd.oneLineOut")}
            </Text>
            <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 24, color: ON_HIGHLIGHT, backgroundColor: "#F6E7A6" }}>{e.driftedLine}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 10 }}>
              {t("jd.tomorrowStranger")}
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
              borderColor: tk.ln,
              minWidth: 232,
            }}
          >
            {/* The whole page, not just a line. This is what makes choosing up
                front safe: a thought you sealed can still leave, once it's had
                time to sit — which is more this product than a switch flipped
                mid-sentence. It doesn't teleport: it carries your words to the
                letter desk, where you give it a stamp and send it yourself. */}
            {/* ONLY WORDS DRIFT (owner, 2026-09-20): a page with pictures,
                a voice or a film stays in the room; a line on its own never
                leaves either — the whole page goes, to the letter desk, or
                nothing does. */}
            {!isDemo && pure && e.body.trim().length >= 3 && (
              <MenuRow
                label={t("jd.driftThis")}
                icon={<DriftIcon />}
                onPress={() => {
                  setMenuOpen(false);
                  router.push({ pathname: "/compose", params: { seed: e.body } });
                }}
              />
            )}
            <MenuRow
              label={t("jd.delete")}
              icon={<BinIcon />}
              destructive
              onPress={() => {
                setMenuOpen(false);
                confirmDelete();
              }}
            />
          </View>
        </>
      )}

    </SafeAreaView>
  );
}

/* a tiny monochrome calendar (the 📅 emoji bakes in a wrong date) */
function CalGlyph() {
  const P = useP();
  return (
    <View style={{ width: 13, height: 13, borderWidth: 1.4, borderColor: P.ink60, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", top: -2.5, left: 2.5, width: 1.5, height: 3, borderRadius: 1, backgroundColor: P.ink60 }} />
      <View style={{ position: "absolute", top: -2.5, right: 2.5, width: 1.5, height: 3, borderRadius: 1, backgroundColor: P.ink60 }} />
      <View style={{ width: 6, height: 1.4, borderRadius: 1, backgroundColor: P.ink60 }} />
    </View>
  );
}

function MenuRow({ label, onPress, destructive, icon }: { label: string; onPress: () => void; destructive?: boolean; icon?: React.ReactNode }) {
  const P = useP();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: pressed ? P.paperDeep : "transparent",
        // the destructive row is separated, not merely recoloured
        borderTopWidth: destructive ? 1 : 0,
        borderTopColor: P.ink12,
      })}
    >
      {icon}
      <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 1, color: destructive ? P.post : P.ink }}>{label}</Text>
    </Pressable>
  );
}

/* A DRAWN BIN. Delete is the one action here that can't be undone, so it gets
   the one mark every reader recognises without reading. "TEAR THIS PAGE OUT"
   was our voice being precious about a destructive control — the worst place
   in an app to make someone parse a metaphor. The row says DELETE; the paper
   language keeps its home in the confirm, where there's room for it. */
function BinIcon() {
  const P = useP();
  return (
    <Svg width={15} height={15} viewBox="0 0 16 16">
      <Path d="M2.6 4.2h10.8" stroke={P.post} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M6.2 4.2V2.9h3.6v1.3" fill="none" stroke={P.post} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M4 4.2l.6 8.3a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.3" fill="none" stroke={P.post} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M6.6 6.6v4.2M9.4 6.6v4.2" stroke={P.post} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

/* the drift rows share one mark: a dotted line leaving, with an arrow */
function DriftIcon() {
  const P = useP();
  return (
    <Svg width={15} height={15} viewBox="0 0 16 16">
      <Path d="M2.6 9.6c3.4-4.4 6.8-4.4 10.2 0" fill="none" stroke={P.ink} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="1.6 2" />
      <Path d="M9.6 2.9l3.4 1.5-1.4 3.4" fill="none" stroke={P.ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
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
   one gesture on the thing itself instead of chrome beside it). The cover
   is the one coverIndex names, as the Notes card shows it: it takes the big
   cell, the others follow in their stored order, so a long-press moves the
   picture into the anchor and the card agrees with the page. */
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
  const P = useP();
  const [full, setFull] = useState<string | null>(null);
  const [rowW, setRowW] = useState(0);
  if (!photos.length) return null;
  const G = 2;
  const H = 250;
  // the drawing order: the cover first (an index past the album, or none, is the first picture),
  // then the rest as stored; `k` is a place in it, `order[k]` the picture's index in the album
  const cover = Number.isInteger(coverIndex) && coverIndex >= 0 && coverIndex < photos.length ? coverIndex : 0;
  const order = [cover, ...photos.map((_, i) => i).filter((i) => i !== cover)];

  const cell = (k: number, style: object) => {
    const i = order[k];
    return (
      <Pressable
        key={photos[i] + i}
        style={[style, { overflow: "hidden" }]}
        onPress={() => setFull(photos[i])}
        onLongPress={() => {
          if (!canSetCover || i === cover) return;
          onSetCover(i);
        }}
        delayLongPress={350}
      >
        <Image source={{ uri: photos[i] }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </Pressable>
    );
  };

  const rest = order.slice(5);
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
              {order.length > 1 ? cell(1, { flex: 1 }) : <View style={{ flex: 1 }} />}
              {order.length > 2 ? cell(2, { flex: 1 }) : <View style={{ flex: 1 }} />}
            </View>
            <View style={{ flex: 1, flexDirection: "row", gap: G }}>
              {order.length > 3 ? cell(3, { flex: 1 }) : <View style={{ flex: 1 }} />}
              {order.length > 4 ? cell(4, { flex: 1 }) : <View style={{ flex: 1 }} />}
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
            rest.map((i, k) => {
              const side = (rowW - G * 2) / 3;
              return (
                <View key={photos[i] + i} style={{ width: side, height: side }}>
                  {cell(k + 5, { flex: 1 })}
                </View>
              );
            })}
        </View>
      )}

      {canSetCover && photos.length > 1 && (
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 0.8, color: P.ink40, marginTop: 8 }}>
          {t("jd.coverHint")}
        </Text>
      )}

      {/* the lightbox — the photo alone on ink, pinch to look closer, tap to put it back */}
      <PhotoLightbox photo={full ? { uri: full } : null} onClose={() => setFull(null)} />
    </View>
  );
}

/* A tap plays or pauses. The ▶ follows the player itself, not the last tap:
   it used to stay hidden once the film had played to its end (nothing set it
   back), and the next tap paused a film that had already stopped, so a
   replay took two taps. Now the end puts ▶ back, and a tap there starts the
   film again from the beginning. */
function DetailVideo({ uri }: { uri: string }) {
  const [playing, setPlaying] = useState(false);
  const ended = useRef(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  useEffect(() => {
    const a = player.addListener("playingChange", (e) => setPlaying(e.isPlaying));
    const b = player.addListener("playToEnd", () => {
      ended.current = true;
      setPlaying(false);
    });
    return () => {
      a.remove();
      b.remove();
    };
  }, [player]);
  const toggle = () => {
    if (playing) {
      player.pause();
      return;
    }
    if (ended.current) {
      ended.current = false;
      player.replay();
      return;
    }
    player.play();
  };
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={playing ? t("jt.pause") : t("jt.play")} style={{ overflow: "hidden", marginBottom: 18 }}>
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
