import { Pressable, Text, View } from "react-native";
import { P, PF, panel } from "../theme/post";
import { AuraGlow, AuraSpecks } from "./AuraGlow";
import { useWrenName } from "../lib/wren-name";
import { dLong } from "../lib/format";
import type { Aura } from "../lib/aura";

/* YOUR WRITING AURA — five stages, one growing glow.
   ────────────────────────────────────────────────────────────────────────
   The ladder as frozen on the design canvas. The visual is the aura
   itself: a soft glow that swells and deepens as signals lock, with one
   ink speck landing on it per locked signal — nine stars when the whole
   voice has come through. The name arrives only at FORMED (nine locked
   AND ten pieces): everything earlier says honestly how far along the
   reading is, in the words the owner set — still forming, taking shape,
   coming clear. */

export function AuraBlock({ aura, onOpen, onShare }: { aura: Aura; onOpen: () => void; onShare: () => void }) {
  const wren = useWrenName();
  const nOf9 = `${aura.locked.length} OF 9`;

  const Glow = (
    <View style={{ width: 104, height: 104 }}>
      <AuraGlow formed={aura.formed} uid="me" />
      <AuraSpecks locked={aura.locked.length} />
    </View>
  );

  /* stage 0 — nothing claimed, and the card says so */
  if (aura.phase === "empty") {
    return (
      <View style={[panel, { padding: 18, marginTop: 14 }]}>
        <Header />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 }}>
          {Glow}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: PF.letter, fontSize: 20, color: P.ink }}>No data yet.</Text>
            <Text style={{ fontFamily: PF.letter, fontSize: 12.5, lineHeight: 18, color: P.ink60, marginTop: 5 }}>
              Nine things your writing will tell. None have spoken.
            </Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: P.ink12, marginVertical: 12 }} />
        <Text style={{ fontFamily: PF.serifItalic, fontSize: 14, lineHeight: 20, color: P.ink60 }}>
          Write anything — a letter, a sealed page. {wren} is listening.
        </Text>
      </View>
    );
  }

  const title =
    aura.phase === "forming" ? "Still forming." : aura.phase === "shaping" ? "Taking shape." : "Coming clear.";

  if (aura.phase !== "formed") {
    return (
      <Pressable onPress={onOpen} style={({ pressed }) => [panel, { padding: 18, marginTop: 14, opacity: pressed ? 0.7 : 1 }]}>
        <Header chevron />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 }}>
          {Glow}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: PF.letter, fontSize: 20, color: P.ink }}>{title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1, height: 3, backgroundColor: P.ink12 }}>
                <View style={{ width: `${Math.max(aura.formed * 100, 4)}%`, height: 3, backgroundColor: P.pen }} />
              </View>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, color: P.pen }}>{nOf9}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: P.ink12, marginTop: 12, marginBottom: 10 }} />

        {aura.phase === "clearing" ? (
          <>
            {/* everything read but the last line — name the holdout, and let
                Wren say how close she is */}
            {aura.sealed.length > 0 && (
              <>
                <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.2, color: P.ink40 }}>
                  STILL QUIET — {aura.sealed[0].sealed.toUpperCase()}
                </Text>
                <Text style={{ fontFamily: PF.letter, fontSize: 14, lineHeight: 20, color: P.ink, marginTop: 4 }}>
                  The little habits nobody else has take the longest to show.
                </Text>
              </>
            )}
            <Text style={{ fontFamily: PF.serifItalic, fontSize: 13.5, lineHeight: 19, color: P.ink60, marginTop: 10 }}>
              {aura.sealed.length > 0 ? `${wren} nearly has a name for this.` : `${wren} nearly has a name for this — a few more letters and it holds.`}
            </Text>
          </>
        ) : (
          <>
            {aura.locked.slice(0, aura.phase === "forming" ? 1 : 2).map((d, i) => (
              <Text
                key={d.key}
                style={{ fontFamily: PF.letter, fontSize: 14, lineHeight: 20, color: i === 0 ? P.ink : P.ink60, marginTop: i ? 4 : 0 }}
              >
                {d.line}
              </Text>
            ))}
            {aura.phase === "forming" && (
              <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1, color: P.ink40, marginTop: 10 }}>
                PATTERNS TAKE A FEW LETTERS — KEEP WRITING
              </Text>
            )}
          </>
        )}
      </Pressable>
    );
  }

  /* FORMED — the ninth star landed, and the name is earned */
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [panel, { padding: 18, marginTop: 14, opacity: pressed ? 0.7 : 1 }]}>
      <Header chevron />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 }}>
        {Glow}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.4, color: P.brassSeal }}>
            FORMED{aura.formedOn ? ` · ${dLong(aura.formedOn).toUpperCase()}` : ""}
          </Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 21, fontWeight: "600", color: P.ink, marginTop: 2 }}>
            {aura.archetype?.name}
          </Text>
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 12.5, lineHeight: 18, color: P.ink60, marginTop: 3 }}>
            {aura.archetype?.desc ?? ""}
          </Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: P.ink12, marginTop: 12 }} />
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
        <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1, color: P.ink40 }}>
          9 OF 9 · {aura.pieces} PIECES
        </Text>
        <Pressable onPress={onShare} hitSlop={8} style={{ backgroundColor: P.pen, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1, color: "#fff" }}>SHARE</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function Header({ chevron }: { chevron?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={{ flex: 1, fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>
        YOUR WRITING AURA
      </Text>
      {chevron && <Text style={{ fontFamily: PF.mono, fontSize: 11, color: P.ink40 }}>›</Text>}
    </View>
  );
}
