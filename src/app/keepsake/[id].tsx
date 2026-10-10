import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { P, PF, ruleSoft } from "../../theme/post";
import { keepsake } from "../../data/keepsakes";
import { loadShelf, markSeen, type Minted } from "../../lib/keepsakes";
import { WrenBird } from "../../components/WrenBird";
import { readThreadsCache } from "../../lib/db";
import { speakAs, useWrenName } from "../../lib/wren-name";

/* ONE KEEPSAKE, AND THE PROOF UNDER IT.
   ────────────────────────────────────────────────────────────────────────
   The library's second law: every keepsake can answer "why did I get
   this?" So the page is the object, the day, one plain sentence about
   what SHE did, and then the evidence — the count, the word, the thread
   it came from. If a line was carried and privacy allows it, the line.

   It can be shared. Nothing here can delete what actually happened:
   taking a keepsake off a shelf never removes a letter. */
export default function KeepsakeDetail() {
  useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wren = useWrenName();
  const [mine, setMine] = useState<Minted | null>(null);
  const def = keepsake(String(id));

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadShelf().then((shelf) => {
        if (!alive) return;
        setMine(shelf.find((k) => k.id === id) ?? null);
        void markSeen([String(id)]);
      });
      return () => {
        alive = false;
      };
    }, [id]),
  );

  if (!def) return <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }} />;

  const when = mine
    ? new Date(mine.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.8, color: P.ink40 }}>{t(`ks.cat.${def.cat}`)}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 24, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center" }}>
          <Image source={def.icon} style={{ width: 108, height: 108 }} resizeMode="contain" />
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 17, letterSpacing: 2, color: P.ink, marginTop: 16, textAlign: "center" }}>
            {t(`ks.name.${def.id}`).toUpperCase()}
          </Text>
          {when && (
            <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.4, color: P.ink40, marginTop: 8 }}>{when}</Text>
          )}
        </View>

        {mine ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 30 }}>
              <WrenBird size={24} mood="content" />
              <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 15, lineHeight: 23, color: P.ink60 }}>
                {speakAs(HAS_WHY.has(def.id) ? t(`ks.why.${def.id}`) : t("ks.happened"), wren)}
              </Text>
            </View>

            <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.6, color: P.ink40, marginTop: 30, marginBottom: 10 }}>
              {t("ks.evidence")}
            </Text>
            <View style={[{ paddingBottom: 12 }, ruleSoft]}>
              <Text style={{ fontFamily: PF.mono, fontSize: 12, letterSpacing: 0.8, color: P.ink }}>{mine.evidence}</Text>
            </View>

            {!!mine.line && (
              <>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.6, color: P.ink40, marginTop: 22, marginBottom: 10 }}>
                  {t("ks.lineCarried")}
                </Text>
                <Text style={{ fontFamily: PF.letter, fontSize: 16.5, lineHeight: 25, color: P.ink }}>“{mine.line}”</Text>
              </>
            )}

            {!!mine.threadId && (
              <Pressable
                /* a correspondence that has traded names lives in a room now */
                onPress={async () => {
                  const th = (await readThreadsCache())?.find((x) => x.id === mine.threadId);
                  router.push(th?.revealed ? `/room/${mine.threadId}` : `/chat/${mine.threadId}`);
                }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 26, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.4, color: P.pen }}>{t("ks.goCorrespondence")}</Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: P.pen }}>→</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => Share.share({ message: t("ks.shareTail", { name: t(`ks.name.${def.id}`), evidence: mine.evidence }) })}
              style={({ pressed }) => ({ borderWidth: 1, borderColor: P.ink, paddingVertical: 14, alignItems: "center", marginTop: 34, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1.8, color: P.ink }}>{t("ks.share")}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, lineHeight: 23, color: P.ink40, textAlign: "center", marginTop: 30 }}>
            {speakAs(t("ks.notYet"), wren)}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* her sentence per keepsake — what SHE did, never what you achieved */
/* earn-lines live in the catalog as ks.why.<id>; this set marks which ids have their own */
const HAS_WHY = new Set<string>(["first-flight", "night-flight", "early-bird-flight", "same-hour-twice", "favorite-hour", "favorite-day", "late-return", "first-reply", "first-morning-reply", "first-midnight-reply", "word-came-back", "first-thread", "first-turn-back", "five-letters-deep", "you-signed-first", "they-signed-first", "name-seal", "first-kindred", "three-kindreds", "five-kindreds", "longest-thread", "word-spotted", "first-voice-letter", "first-sealed-page", "first-photo-kept", "first-drifted-line", "10-letters-carried", "50-letters-carried", "100-letters-carried", "first-anniversary"]);
