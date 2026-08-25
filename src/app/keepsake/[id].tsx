import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { P, PF, ruleSoft } from "../../theme/post";
import { keepsake } from "../../data/keepsakes";
import { loadShelf, markSeen, type Minted } from "../../lib/keepsakes";
import { WrenBird } from "../../components/WrenBird";
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
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.8, color: P.ink40 }}>{def.cat.toUpperCase()}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 24, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center" }}>
          <Image source={def.icon} style={{ width: 108, height: 108 }} resizeMode="contain" />
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 17, letterSpacing: 2, color: P.ink, marginTop: 16, textAlign: "center" }}>
            {def.name.toUpperCase()}
          </Text>
          {when && (
            <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.4, color: P.ink40, marginTop: 8 }}>{when}</Text>
          )}
        </View>

        {mine ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 30 }}>
              <WrenBird size={24} bare mood="content" />
              <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 15, lineHeight: 23, color: P.ink60 }}>
                {speakAs(WHY[def.id] ?? "This happened, and I kept it.", wren)}
              </Text>
            </View>

            <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.6, color: P.ink40, marginTop: 30, marginBottom: 10 }}>
              THE EVIDENCE
            </Text>
            <View style={[{ paddingBottom: 12 }, ruleSoft]}>
              <Text style={{ fontFamily: PF.mono, fontSize: 12, letterSpacing: 0.8, color: P.ink }}>{mine.evidence}</Text>
            </View>

            {!!mine.line && (
              <>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.6, color: P.ink40, marginTop: 22, marginBottom: 10 }}>
                  A LINE SHE CARRIED
                </Text>
                <Text style={{ fontFamily: PF.letter, fontSize: 16.5, lineHeight: 25, color: P.ink }}>“{mine.line}”</Text>
              </>
            )}

            {!!mine.threadId && (
              <Pressable
                onPress={() => router.push(`/chat/${mine.threadId}`)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 26, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.4, color: P.pen }}>GO TO THE CORRESPONDENCE</Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: P.pen }}>→</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => Share.share({ message: `${def.name} — ${mine.evidence} · a keepsake from Kindredly.` })}
              style={({ pressed }) => ({ borderWidth: 1, borderColor: P.ink, paddingVertical: 14, alignItems: "center", marginTop: 34, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1.8, color: P.ink }}>SHARE THIS KEEPSAKE</Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, lineHeight: 23, color: P.ink40, textAlign: "center", marginTop: 30 }}>
            {speakAs("Not yet. This one only exists once it really happens.", wren)}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* her sentence per keepsake — what SHE did, never what you achieved */
const WHY: Record<string, string> = {
  "first-flight": "My first real errand. You wrote something, and I took it out into the world.",
  "night-flight": "You gave me a letter while everyone else was asleep. I like those best.",
  "early-bird-flight": "Out before the light. You'd been awake a while, I think.",
  "same-hour-twice": "Twice now, at the same hour. I'm starting to know when to wait by the door.",
  "favorite-hour": "This is our hour. I've stopped being surprised by it.",
  "favorite-day": "This day, more than any other. I keep the whole day free now.",
  "late-return": "I came back long after dark. Someone was still awake, thinking about you.",
  "first-reply": "The first time I brought something home instead of just taking it away.",
  "first-morning-reply": "It was waiting when the day started. I flew it straight over.",
  "first-midnight-reply": "They wrote back at midnight. I didn't wait until morning.",
  "word-came-back": "One of your words came home in someone else's handwriting.",
  "first-thread": "A letter turned into a correspondence. That doesn't happen every time.",
  "first-turn-back": "You wrote again after they answered. That's when it stops being a reply and starts being a conversation.",
  "five-letters-deep": "Five each way. From here, either of you can enclose a name.",
  "you-signed-first": "You went first. That took something.",
  "they-signed-first": "They went first — they chose to be known by you.",
  "name-seal": "The first time you sealed your name into a letter.",
  "first-kindred": "Two names crossed in my beak. I've been carrying letters for this.",
  "three-kindreds": "Three people know your name now. I introduced all of them.",
  "five-kindreds": "Five. There's a small crowd in your sky.",
  "longest-thread": "The longest road I've flown between two people. Still going.",
  "word-spotted": "You keep reaching for this one. I've started noticing it before you do.",
  "first-voice-letter": "The first time what I carried had your voice in it, not just your hand.",
  "first-sealed-page": "You gave me something to keep instead of deliver. It never left the house.",
  "first-photo-kept": "A picture, sealed. Words aren't the only thing worth keeping.",
  "first-drifted-line": "One line from your sealed pages asked to go out. I let it.",
  "10-letters-carried": "Ten letters. My wings know the way now.",
  "50-letters-carried": "Fifty. Some of these you don't even remember writing.",
  "100-letters-carried": "A hundred letters carried. That's a lot of someone's life.",
  "first-anniversary": "One year of this. I was an egg when we started.",
};
