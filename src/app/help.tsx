import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { P, PF, ruleSoft } from "../theme/post";
import { WrenBird } from "../components/WrenBird";
import { speakAs, useWrenName } from "../lib/wren-name";

/* HOW KINDREDLY WORKS — the answers, in the product's own voice.
   ────────────────────────────────────────────────────────────────────────
   Not a support portal: a page that says the true rules plainly, because
   almost every question a new reader has is a rule they haven't been told
   ("why can't I see who wrote this", "why is it so slow", "does anyone
   read my journal"). Written as answers, kept to what the code actually
   does — if a line here stops being true, the line is the bug. */

const QA = (wren: string): { q: string; a: string }[] => [
  {
    q: "How does a letter find someone?",
    a: `Nothing you write is broadcast. ${wren} reads how you write — rhythm, sentence shape, the words you reach for — and carries your letter to the stranger whose writing sits closest to yours. You are matched by voice, never by age, location, or a photo.`,
  },
  {
    q: "Why can't I see who wrote this?",
    a: "Because you haven't earned each other's names yet, and neither has anyone else. Everyone here is anonymous until two people decide otherwise.",
  },
  {
    q: "How do names get traded?",
    a: `From five letters each, either of you may enclose your name. Nothing happens until the other does the same — then ${wren} carries both across at once. If one of you never signs, you stay lovely strangers, and that's allowed.`,
  },
  {
    q: "What is my aura?",
    a: "Nine signals in your writing — how you open, how long your lines run, where you put feeling. Each one locks only when there's enough evidence to trust it, which is why it fills slowly and why nothing is claimed early.",
  },
  {
    q: "Does anyone read my sealed pages?",
    a: `No, and not in the way most apps mean it. Your sealed journal never leaves this phone. It isn't uploaded, isn't backed up to us, and is deliberately left out of the matching entirely — so it cannot reach a stranger even by accident. ${wren} doesn't read them either.`,
  },
  {
    q: "Why is everything so slow?",
    a: `Nothing here is throttled. ${wren} leaves the second you press send. What takes days is the person at the other end, living their life — and that is the product, not a delay we could sell you out of.`,
  },
  {
    q: "Someone was cruel. What do I do?",
    a: "Open the ⋯ on their letter. Report sends it to us; block closes the road both ways and can be undone in Settings, under Blocked & reported. Repeated reports remove a writer from Kindredly.",
  },
  {
    q: "What happens if I delete my account?",
    a: "Your letters stay out in the world, unsigned — a kindred keeps what you wrote them, and nothing traces back to you. Your sealed pages never left this phone, so they stay. Everything else goes, for good.",
  },
];

export default function Help() {
  const router = useRouter();
  const wren = useWrenName();
  const [open, setOpen] = useState<number | null>(0);
  const qa = QA(wren);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>HOW IT WORKS</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 18 }}>
          <WrenBird size={26} bare mood="content" />
          <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 13.5, lineHeight: 20, color: P.ink60 }}>
            {speakAs("Most questions here are really a rule nobody told you yet. So — the rules.", wren)}
          </Text>
        </View>

        {qa.map((row, i) => {
          const on = open === i;
          return (
            <Pressable key={row.q} onPress={() => setOpen(on ? null : i)} style={[{ paddingVertical: 15 }, ruleSoft]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 16, fontWeight: "600", color: P.ink, lineHeight: 23 }}>
                  {row.q}
                </Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink40, marginTop: 3 }}>{on ? "–" : "+"}</Text>
              </View>
              {on && (
                <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 23, color: P.ink60, marginTop: 9 }}>
                  {row.a}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
