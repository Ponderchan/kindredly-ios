import { Pressable, Text, View } from "react-native";
import { P, PF, panel } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { useWrenName } from "../lib/wren-name";
import type { Aura } from "../lib/aura";

/* YOUR WRITING AURA — four phases, each showing only what is earned.
   ────────────────────────────────────────────────────────────────────────
   The old card rendered a complete nine-row portrait, an aura name and a
   Share button off a single line of writing — a conclusion dressed over a
   guess, and the "don't know yet" state could never appear because
   onboarding guarantees one line. The owner's redesign makes the phases
   the design:

     empty     no writing at all — say so, plainly
     early     1–3 pieces — N% FORMED and which dims have come through;
               no name, no share. Naming someone off one line is a
               horoscope.
     building  4–10 — the archetype arrives with its trait lines
     rich      10+ — the full portrait, and the share is honest now

   The percentage is lockedCount/9 — a real fraction of evidence, not a
   vibe. This is the same locked/sealed structure the hatch screen and the
   correspondent read already use; the product now reads you and the
   person you write to with one instrument. */

export function AuraBlock({ aura, onOpen, onShare }: { aura: Aura; onOpen: () => void; onShare: () => void }) {
  const wren = useWrenName();

  if (aura.phase === "empty") {
    return (
      <View style={[panel, { padding: 18, marginTop: 14 }]}>
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>YOUR WRITING AURA</Text>
        <Text style={{ fontFamily: PF.letter, fontSize: 20, color: P.ink, marginTop: 12 }}>Nothing to read yet.</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
          <WrenBird size={22} mood="listen" />
          <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 13.5, lineHeight: 20, color: P.ink60 }}>
            {wren} is listening. Every word you write helps.
          </Text>
        </View>
      </View>
    );
  }

  const pct = Math.round(aura.formed * 100);

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [panel, { padding: 18, marginTop: 14, opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ flex: 1, fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>
          YOUR WRITING AURA
        </Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, color: P.ink40 }}>›</Text>
      </View>

      {aura.phase === "early" ? (
        <>
          <Text style={{ fontFamily: PF.letter, fontSize: 20, color: P.ink, marginTop: 12 }}>Taking shape.</Text>
          {/* the honest fraction: locked dims over nine, never a vibe */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1, height: 3, backgroundColor: P.ink12 }}>
              <View style={{ width: `${Math.max(pct, 3)}%`, height: 3, backgroundColor: P.pen }} />
            </View>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, color: P.pen }}>{pct}% FORMED</Text>
          </View>
          {aura.locked.length > 0 && (
            <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: P.ink60, marginTop: 10 }}>
              {aura.locked[0].line}
            </Text>
          )}
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1, color: P.ink40, marginTop: 12 }}>
            KEEP WRITING — {wren.toUpperCase()} IS PICKING UP PATTERNS
          </Text>
        </>
      ) : (
        <>
          <Text style={{ fontFamily: PF.letter, fontSize: 24, fontWeight: "600", color: P.ink, marginTop: 10 }}>
            {aura.archetype?.name}
          </Text>
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 13.5, lineHeight: 20, color: P.ink60, marginTop: 3 }}>
            {/* hatch writes in the second person because it was built to
                describe you to yourself — here that is exactly right */}
            {aura.archetype?.desc ?? ""}
          </Text>

          {/* the strongest three, as chips — evidence, not decoration */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
            {aura.locked.slice(0, 3).map((d) => (
              <View key={d.key} style={{ borderWidth: 1, borderColor: P.ink12, paddingHorizontal: 9, paddingVertical: 5 }}>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: P.ink }}>{d.label.toLowerCase()}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
            <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1, color: P.ink40 }}>
              {pct}% FORMED · {aura.pieces} PIECES
            </Text>
            {aura.phase === "rich" && (
              <Pressable onPress={onShare} hitSlop={8} style={{ backgroundColor: P.pen, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1, color: "#fff" }}>SHARE</Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}
