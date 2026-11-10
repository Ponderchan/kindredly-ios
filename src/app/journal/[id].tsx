import { useCallback, useState } from "react";
import { localeTag } from "../../lib/format";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Host, Image as SImage, Menu } from "@expo/ui/swift-ui";
import { accessibilityLabel, contentShape, frame, menuIndicator, shapes } from "@expo/ui/swift-ui/modifiers";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { t, useLang } from "../../lib/i18n";
import { PFM } from "../../theme/post";
import { useLetterFamily, useP, useTheme } from "../../lib/theme";
import { BackChevron } from "../../components/10a/BackChevron";
import { AudioCard } from "../../components/AudioCard";
import { moodArtKey, moodGroup, moodLabel } from "../../data/moods";
import { demoJournal } from "../../data/demo";
import { deleteEntry, hideDemoEntry, loadJournal, setCover, type JournalEntry } from "../../lib/journal";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { MoodChip, moodColors } from "../../screens/notes/notes-glyphs";
import { DetailVideo } from "../../screens/note-page/DetailVideo";
import { NativeSurface } from "../../components/NativeSurface";
import { NotePageNative, composerCanEdit } from "../../screens/note-page/NotePageNative";
import { canEditPage } from "../../screens/note-page/note-page-model";
import "../../data/strings-step5-notes";
import "../../data/strings-audit-notes"; // jd.edit
import "../../data/strings-step5-kitrn"; // a11y.back

/* the ink on the drift highlight: the highlight is pale in every theme, so
   the words on it keep Classic's ink rather than the page's (light in a
   dark theme) */
const ON_HIGHLIGHT = "#1E1B35";

/* A single journal page — the sealed room, one page at a time. Read it, let a
   line drift, change it (Edit in the ⋯: owner's audit, 2026-11-10 — the
   composer opens holding the page and its save replaces it; real pages only,
   where the SwiftUI composer will be drawn) or tear it out. Sample pages are
   read-only.

   Same surface and same plate as the tabs: white, rules doing the separation,
   mono for what the system files, the system font for what you wrote. The mood
   face and the photos keep their colour — they're content. */
/* 2026-10-27: the page is drawn in Swift (screens/note-page/NotePageNative,
   KNotePageView), with the React Native page below as the remote switch's
   fallback ("noteentry" in app_surfaces, NativeSurface in mount mode; off by
   default until the simulator pass). */
export default function JournalDetail() {
  const { t: tk } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface surface="noteentry" view="KNotePageView" mode="mount" native={() => <NotePageNative id={String(id ?? "")} />} fallback={() => <JournalDetailRN />} />
    </View>
  );
}

/* the React Native page, unchanged */
function JournalDetailRN() {
  useLang();
  const P = useP();
  const { t: tk, dark } = useTheme();
  // the page and its drifted line are content: the reader's Letter font
  const face = useLetterFamily();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [e, setE] = useState<JournalEntry | null>(null);
  // the first read has answered: a page still loading and a page that isn't there look different now
  const [read, setRead] = useState(false);
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
        <View style={{ height: 52 }}>
          <BackChevron onPress={goBack} color={P.ink} />
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
  /* The whole page, not just a line. This is what makes choosing up front safe: a thought you
     sealed can still leave, once it's had time to sit — which is more this product than a switch
     flipped mid-sentence. It doesn't teleport: it carries your words to the letter desk, where you
     give it a stamp and send it yourself. ONLY WORDS DRIFT (owner, 2026-09-20): a page with
     pictures, a voice or a film stays in the room; a line on its own never leaves either — the
     whole page goes, to the letter desk, or nothing does. */
  const canDrift = !isDemo && pure && e.body.trim().length >= 3;
  const drift = () => router.push({ pathname: "/compose", params: { seed: e.body } });
  const canEdit = canEditPage(isDemo, composerCanEdit());

  // the page stays neutral — the mood lives in its face, not the background
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      {/* header — back + a ··· menu; the date leads the entry from the centre */}
      {/* no rule under it: 10a's sub-page headers have none (H:90, H:97) */}
      <View style={{ height: 52, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingRight: 20 }}>
        <BackChevron onPress={goBack} color={P.ink} />
        {/* samples get the menu too — hiding it read as "delete is missing",
            not "this is a sample". Drift stays real-pages-only inside. */}
        {/* iOS's own pull-down menu (owner, 2026-10-20: "做出苹果原生的那样 就像举报那里一样"):
            the SwiftUI Menu the Today card's ⋯ uses for Report, dropping from the ⋯ itself, with
            Delete as its destructive item; tapping anywhere else closes it. The confirmation
            behind Delete is unchanged. */}
        <Host matchContents colorScheme={dark ? "dark" : "light"}>
          <Menu
            label={<SImage systemName="ellipsis" size={19} color={P.ink} modifiers={[frame({ width: 42, height: 42 }), contentShape(shapes.rectangle())]} />}
            modifiers={[menuIndicator("hidden"), accessibilityLabel(t("jd.more"))]}
          >
            {canDrift ? <Button label={t("jd.driftThis")} systemImage="paperplane" onPress={drift} /> : null}
            {/* Edit (owner's audit, 2026-11-10): a real page, where the SwiftUI composer will open it */}
            {canEdit ? <Button label={t("jd.edit")} systemImage="pencil" onPress={() => router.push({ pathname: "/journal-entry", params: { edit: e.id } })} /> : null}
            <Button label={t("jd.delete")} systemImage="trash" role="destructive" onPress={() => setTimeout(confirmDelete, 0)} />
          </Menu>
        </Host>
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
            <Text style={{ ...PFM.monoMed, fontSize: 11, letterSpacing: 0.8, color: P.ink60 }}>
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
          <Text style={{ ...face, fontSize: pure ? 20 : 16.5, lineHeight: pure ? 34 : 27, color: P.ink }}>
            {e.body}
          </Text>
        )}

        {/* drifted state — the action itself now lives in the ··· menu */}
        {e.driftedLine && (
          <View style={{ marginTop: 28, borderTopWidth: 1, borderTopColor: tk.ln, paddingTop: 14 }}>
            <Text style={{ ...PFM.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.pen, marginBottom: 10 }}>
              {t("jd.oneLineOut")}
            </Text>
            <Text style={{ ...face, fontSize: 15.5, lineHeight: 24, color: ON_HIGHLIGHT, backgroundColor: "#F6E7A6" }}>{e.driftedLine}</Text>
            <Text style={{ fontSize: 12, fontWeight: "400", lineHeight: 17, color: P.ink40, marginTop: 10 }}>
              {t("jd.tomorrowStranger")}
            </Text>
          </View>
        )}

      </ScrollView>

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
        <Text style={{ fontSize: 12, fontWeight: "400", color: P.ink40, marginTop: 8 }}>
          {t("jd.coverHint")}
        </Text>
      )}

      {/* the lightbox — the photo alone on ink, pinch to look closer, tap to put it back */}
      <PhotoLightbox photo={full ? { uri: full } : null} onClose={() => setFull(null)} />
    </View>
  );
}

/* the film (a tap plays or pauses, the end puts ▶ back): DetailVideo, now shared with the Swift
   page (screens/note-page/DetailVideo) */
