import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { MONO, PFM } from "../../theme/post";
import { useLetterFamily, useP, useTheme } from "../../lib/theme";
import { localeTag } from "../../lib/format";
import { SecondaryHeader } from "../../components/10a/SecondaryHeader";
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
   taking a keepsake off a shelf never removes a letter.

   10a: on the theme, under the secondary page's header (the keepsake's
   kind, centred in mono); the day in the reader's own language (it was
   always American English); a line she carried is someone's letter being
   read, so it is set in the reader's Letter font; mono labels at 10 and 11. */
export default function KeepsakeDetail() {
  const P = useP();
  const { t: tk } = useTheme();
  useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wren = useWrenName();
  const letterFace = useLetterFamily();
  // what Wren says about it is Wren speaking: the letter font's italic (upright in Garamond / SF Mono)
  const wrenFace = useLetterFamily(true);
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
    ? new Date(mine.at).toLocaleDateString(localeTag(), { month: "short", day: "numeric", year: "numeric" }).toLocaleUpperCase()
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <SecondaryHeader title={t(`ks.cat.${def.cat}`)} fallbackHref="/(tabs)/me" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 24, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center" }}>
          <Image source={def.icon} style={{ width: 108, height: 108 }} resizeMode="contain" />
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700", color: P.ink, marginTop: 16, textAlign: "center" }}>
            {t(`ks.name.${def.id}`)}
          </Text>
          {when && (
            <Text style={{ ...PFM.monoMed, fontSize: MONO.title, letterSpacing: 1.4, color: P.ink40, marginTop: 8 }}>{when}</Text>
          )}
        </View>

        {mine ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 30 }}>
              <WrenBird size={24} mood="content" />
              <Text style={[{ flex: 1, fontSize: 15, lineHeight: 23, color: P.ink60 }, wrenFace]}>
                {speakAs(HAS_WHY.has(def.id) ? t(`ks.why.${def.id}`) : t("ks.happened"), wren)}
              </Text>
            </View>

            <Text style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 1.6, color: P.ink40, marginTop: 30, marginBottom: 10 }}>
              {t("ks.evidence")}
            </Text>
            <View style={{ paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
              <Text style={{ ...PFM.monoMed, fontSize: MONO.title, letterSpacing: 0.8, color: P.ink }}>{mine.evidence}</Text>
            </View>

            {!!mine.line && (
              <>
                <Text style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 1.6, color: P.ink40, marginTop: 22, marginBottom: 10 }}>
                  {t("ks.lineCarried")}
                </Text>
                <Text style={[{ fontSize: 16.5, lineHeight: 25, color: P.ink }, letterFace]}>“{mine.line}”</Text>
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
                <Text style={{ fontSize: 14, fontWeight: "600", color: P.pen }}>{t("ks.goCorrespondence")}</Text>
                <Text style={{ fontSize: 14, color: P.pen }}>→</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => Share.share({ message: t("ks.shareTail", { name: t(`ks.name.${def.id}`), evidence: mine.evidence }) })}
              style={({ pressed }) => ({ borderWidth: 1, borderColor: tk.ln, paddingVertical: 14, alignItems: "center", marginTop: 34, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: P.ink }}>{t("ks.share")}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={[{ fontSize: 15, lineHeight: 23, color: P.ink40, textAlign: "center", marginTop: 30 }, wrenFace]}>
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
