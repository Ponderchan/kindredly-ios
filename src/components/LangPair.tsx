import { Pressable, Text, View } from "react-native";
import { PF } from "../theme/post";
import { PUNCH } from "../theme/punch";

/* THE LANGUAGE PAIR — the owner's B1.
   ────────────────────────────────────────────────────────────────────────
   "Translate" said as two languages and an arrow: ES is what they wrote,
   EN is yours, the filled side is the one you are reading now. One tap
   turns it round. Smallest possible control, and the least like a machine
   translation button — it names the two people's languages, not a
   service. */

export function LangPair({ from, to, on, busy, onPress }: { from: string; to: string; on: boolean; busy: boolean; onPress: () => void }) {
  const Side = ({ tag, lit }: { tag: string; lit: boolean }) => (
    <View style={{ paddingHorizontal: 11, paddingVertical: 6, backgroundColor: lit ? PUNCH.ink : "transparent" }}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 0.9, color: lit ? "#FFFFFF" : PUNCH.ink }}>{tag}</Text>
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={10}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 2,
        borderColor: PUNCH.ink,
        borderRadius: 999,
        overflow: "hidden",
        opacity: pressed || busy ? 0.6 : 1,
      })}
    >
      <Side tag={from} lit={!on} />
      <Text style={{ paddingHorizontal: 7, fontSize: 13, fontWeight: "700", color: PUNCH.ink }}>{busy ? "…" : "→"}</Text>
      <Side tag={to} lit={on} />
    </Pressable>
  );
}
