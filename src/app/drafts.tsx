import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF, rule } from "../theme/post";
import { StampTile } from "../components/StampTile";
import { getStamp } from "../data/stamps";
import { dLong } from "../lib/format";
import { deleteDraft, loadDrafts, type Draft } from "../lib/drafts";

/* Unsent — the letters you started and didn't send.
   ────────────────────────────────────────────────────────────────────────
   lib/drafts has existed since the port and NOTHING EVER LISTED IT. The
   letter desk could save a draft and could resume one by id, but no screen
   ever showed you the ids, so "save as draft" wrote into a place you could
   not reach. A save with no way back is worse than no save at all: it tells
   you the words are kept and then keeps them from you.

   It's a desk with pages on it, like Sealed — same rule, and these are the
   most literally unfinished pages in the product. Opening one hands it back
   to the letter desk with its stamp and its spark intact; the draft is only
   deleted once that letter actually goes. */
export default function DraftsScreen() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadDrafts().then((d) => {
        if (!alive) return;
        setDrafts(d);
        setLoaded(true);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const remove = (d: Draft) =>
    Alert.alert("Throw this one away?", "It was never sent, and it won't be.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Throw it away",
        style: "destructive",
        onPress: async () => setDrafts(await deleteDraft(d.id)),
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: P.ink }}>UNSENT</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.2, color: P.ink40 }}>
          {loaded ? String(drafts.length).padStart(2, "0") : "··"}
        </Text>
      </View>
      <View style={{ ...rule }} />

      {loaded && drafts.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 22, lineHeight: 30, color: P.ink, textAlign: "center" }}>
            Nothing half-written.
          </Text>
          <Text style={{ fontFamily: PF.mono, fontSize: 11, lineHeight: 18, color: P.ink60, textAlign: "center", marginTop: 12 }}>
            LEAVE A LETTER MID-SENTENCE AND IT WAITS HERE
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {drafts.map((d) => {
            const st = getStamp(d.stamp);
            return (
              <Pressable
                key={d.id}
                onPress={() => router.push({ pathname: "/compose", params: { draft: d.id } })}
                onLongPress={() => remove(d)}
                style={({ pressed }) => ({
                  backgroundColor: P.sheet,
                  padding: 16,
                  marginBottom: 12,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.8, color: P.ink40 }}>
                    {dLong(d.date).toUpperCase()}
                  </Text>
                  {st ? (
                    <View style={{ transform: [{ rotate: "-4deg" }] }}>
                      <StampTile id={d.stamp} w={34} r={4} />
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={4} style={{ fontFamily: PF.letter, fontSize: 17, lineHeight: 25, color: P.ink, marginTop: 12 }}>
                  {d.body.trim()}
                </Text>
              </Pressable>
            );
          })}
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.ink40, textAlign: "center", marginTop: 10 }}>
            TAP TO PICK ONE UP · HOLD TO THROW IT AWAY
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
