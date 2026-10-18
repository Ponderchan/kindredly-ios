import { Pressable, Text, View } from "react-native";
import { MONO, PF } from "../theme/post";
import { useTheme } from "../lib/theme";

/* THE LANGUAGE PAIR — the owner's B1.
   ────────────────────────────────────────────────────────────────────────
   "Translate" said as two languages and an arrow: ES is what they wrote,
   EN is yours, the filled side is the one you are reading now. One tap
   turns it round. Smallest possible control, and the least like a machine
   translation button — it names the two people's languages, not a
   service.

   10a (step 5) briefly swapped it for the mock's outline capsule (H:42);
   the owner wanted this one back (2026-10-16), so the Today card's foot
   draws it again — here in the RN fallback, and as its SwiftUI twin
   Portable/Kit/KLangPair.swift. Painted from the theme (an ink outline,
   the lit side ink with the page colour on it), its mono at 11. */

export function LangPair({ from, to, on, busy, onPress }: { from: string; to: string; on: boolean; busy: boolean; onPress: () => void }) {
  const { t: tk } = useTheme();
  const Side = ({ tag, lit }: { tag: string; lit: boolean }) => (
    <View style={{ paddingHorizontal: 11, paddingVertical: 6, backgroundColor: lit ? tk.ink : "transparent" }}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 0.9, color: lit ? tk.bg : tk.ink }}>{tag}</Text>
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 2,
        borderColor: tk.ln,
        borderRadius: 999,
        overflow: "hidden",
        opacity: pressed || busy ? 0.6 : 1,
      })}
    >
      <Side tag={from} lit={!on} />
      <Text style={{ paddingHorizontal: 7, fontSize: 13, fontWeight: "700", color: tk.ink }}>{busy ? "…" : "→"}</Text>
      <Side tag={to} lit={on} />
    </Pressable>
  );
}
