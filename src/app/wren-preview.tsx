import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, F } from "../theme/tokens";
import { WrenBird, type WrenAccessory, type WrenMood, type WrenStage } from "../components/WrenBird";

/* Dev-only gallery — the whole Wren set on one screen, to eyeball the
   character bible in the actual runtime. Reachable at /wren-preview. */

const MOODS: WrenMood[] = ["content", "happy", "listen", "worry", "sleepy", "curious", "delight", "think", "wink"];
const STAGES: { s: WrenStage; label: string }[] = [
  { s: "egg", label: "Egg · sign up" },
  { s: "hatch", label: "Hatchling · 1st" },
  { s: "fledge", label: "Fledgling · ~5" },
  { s: "wren", label: "Wren · kindred" },
];
const ACCS: WrenAccessory[] = ["beanie", "scarf", "phones", "flower", "party", "shades"];

function Section({ title }: { title: string }) {
  return (
    <Text style={{ fontFamily: F.sansExtra, fontSize: 11, letterSpacing: 1.4, color: C.purple, marginTop: 26, marginBottom: 10 }}>
      {title}
    </Text>
  );
}
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ alignItems: "center", width: 104, marginBottom: 14 }}>
      {children}
      <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

export default function WrenPreview() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 26, color: C.ink, marginTop: 12 }}>Wren</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.muted }}>one bird · mood · growth · dress-up</Text>

        <Section title="GROWTH — EGG TO WREN" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {STAGES.map(({ s, label }) => (
            <Cell key={s} label={label}>
              <WrenBird size={92} stage={s} />
            </Cell>
          ))}
        </View>

        <Section title="MOODS — THE EYES CARRY IT" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {MOODS.map((m) => (
            <Cell key={m} label={m}>
              <WrenBird size={92} mood={m} />
            </Cell>
          ))}
        </View>

        <Section title="POSE — CARRYING YOUR LETTER" />
        <View style={{ alignItems: "center" }}>
          <WrenBird size={128} pose="fly" />
        </View>

        <Section title="DRESS-UP (KINDREDLY+ / DROPS)" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {ACCS.map((a) => (
            <Cell key={a} label={a}>
              <WrenBird size={92} mood="happy" accessory={a} />
            </Cell>
          ))}
        </View>

        <Section title="READS SMALL (16 · 24 · 40)" />
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 18 }}>
          <WrenBird size={16} />
          <WrenBird size={24} />
          <WrenBird size={40} />
          <WrenBird size={16} mood="listen" />
          <WrenBird size={24} stage="egg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
