import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from "react-native-svg";
import { PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { speakAs, useWrenName } from "../lib/wren-name";
import type { Aura } from "../lib/aura";
import type { AuraTrait } from "../lib/voice";

/* AURA CARD — the owner's visual, built to their spec sheet.
   ────────────────────────────────────────────────────────────────────────
   Five stages, and the CARD ITSELF ages with the aura: paper at birth,
   lavender while forming, cream as it takes shape, night once it's
   coming clear, night-and-gold when formed. The hero is a constellation
   whose geometry is the writer's own nine dimensions — locked signals
   are lit stars (warming to orange as the card darkens), unlocked ones
   faint dots, so the sky literally completes as the reading does.

   The number is the owner's blend: 70% dimensions, 30% sample volume.
   The back is WREN'S MEMORY — tap her corner portrait to flip; her
   message grows with the stage. SHARE appears only on the formed card. */

type Stage = Aura["phase"];

const SKIN: Record<Stage, { bg: string; border: string; ink: string; sub: string; chip: string; chipInk: string; bar: string; barBg: string; star: string; lit: string }> = {
  empty:    { bg: "#FAF6ED", border: "#D8D0BC", ink: "#4A443A", sub: "#8A8272", chip: "#F0EAD8", chipInk: "#6A6252", bar: "#B9A8F0", barBg: "#E8E2D2", star: "#C9C0AC", lit: "#B9A8F0" },
  forming:  { bg: "#EFECFA", border: "#D8D2F0", ink: "#3A3450", sub: "#8A84A8", chip: "#E2DCF6", chipInk: "#5A5288", bar: "#7B6FE0", barBg: "#DDD8F0", star: "#C0B8E8", lit: "#7B6FE0" },
  shaping:  { bg: "#F7F3EA", border: "#E2DACA", ink: "#443E32", sub: "#918A78", chip: "#EDE6D6", chipInk: "#66604E", bar: "#7B6FE0", barBg: "#E5DECC", star: "#C8BFA9", lit: "#F0A050" },
  clearing: { bg: "#221E3D", border: "#332E56", ink: "#F2EFFF", sub: "#8F87C9", chip: "#2E2950", chipInk: "#C6BFF0", bar: "#8F82E8", barBg: "#332E56", star: "#554E86", lit: "#F0A050" },
  formed:   { bg: "#1A1730", border: "#E8B84B", ink: "#FFF8E8", sub: "#9A92CC", chip: "#28234A", chipInk: "#D8D2F4", bar: "#F5C542", barBg: "#332E56", star: "#6A62A0", lit: "#F5C542" },
};

const MEMORY: Record<Stage, string> = {
  empty: "Every word you write teaches me a little more about you.\n\nKeep writing. I'm listening.",
  forming: "I'm picking up your patterns…\n\nThank you for trusting me.",
  shaping: "Patterns connect. Your voice gets clearer.\n\nYou're showing me who you are.",
  clearing: "I see it now. Just one more piece to name it.\n\nAlmost there.",
  formed: "This is you. This is how your words leave the world.\n\nI'll keep learning with you.",
};

export function AuraCard({
  aura,
  traits,
  quote,
  onOpen,
  onShare,
}: {
  aura: Aura;
  traits: AuraTrait[];
  quote: string;
  onOpen: () => void;
  onShare: () => void;
}) {
  const wren = useWrenName();
  const [back, setBack] = useState(false);
  const s = SKIN[aura.phase];
  const pct = Math.round(aura.formed * 100);
  const lockedN = aura.locked.length;
  const dark = aura.phase === "clearing" || aura.phase === "formed";

  const frame = {
    backgroundColor: s.bg,
    borderRadius: 18,
    borderWidth: aura.phase === "formed" ? 2 : 1,
    borderColor: s.border,
    padding: 18,
    overflow: "hidden" as const,
  };

  /* ── the back: Wren's memory ── */
  if (back) {
    return (
      <Pressable onPress={() => setBack(false)} style={[frame, { minHeight: 300, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 2, color: s.sub, position: "absolute", top: 16 }}>
          {wren.toUpperCase()}'S MEMORY
        </Text>
        <WrenBird size={64} mood={aura.phase === "formed" ? "delight" : "content"} />
        <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 23, color: s.ink, textAlign: "center", marginTop: 16, paddingHorizontal: 16 }}>
          {speakAs(MEMORY[aura.phase], wren)}
        </Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: s.sub, position: "absolute", bottom: 14 }}>
          TAP TO TURN BACK
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onOpen} style={frame}>
      {/* head — title left, Wren's portrait right (tap to flip) */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.8, color: s.sub }}>
          YOUR WRITING AURA
        </Text>
        <Pressable onPress={() => setBack(true)} hitSlop={10}>
          <WrenBird size={26} mood="content" />
        </Pressable>
      </View>

      {aura.phase === "empty" ? (
        <View style={{ paddingVertical: 18 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 18, lineHeight: 27, color: s.ink }}>
            No aura yet.{"\n"}Every story leaves a spark.
          </Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 14, lineHeight: 21, color: s.sub, marginTop: 10 }}>
            Your aura starts with your first letter.
          </Text>
          <View style={{ alignItems: "center", marginVertical: 14 }}>
            <WrenBird size={56} mood="listen" stage="hatch" />
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: s.border, paddingTop: 12, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 11, letterSpacing: 1, color: s.chipInk }}>
              WRITE YOUR FIRST PIECE
            </Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 13, color: s.chipInk }}>→</Text>
          </View>
        </View>
      ) : (
        <>
          {/* the number, big — the owner's blend */}
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 30, letterSpacing: 1, color: aura.phase === "formed" ? s.bar : s.ink }}>
              {pct}%
            </Text>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 2.4, color: s.sub, marginTop: 1 }}>FORMED</Text>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: s.barBg, marginTop: 8, overflow: "hidden" }}>
              <View style={{ width: `${Math.max(pct, 3)}%`, height: 5, borderRadius: 3, backgroundColor: s.bar }} />
            </View>
          </View>

          {aura.phase === "formed" && (
            <Text style={{ fontFamily: PF.letter, fontSize: 24, fontWeight: "700", color: s.ink, marginTop: 12 }}>
              {aura.archetype?.name}
            </Text>
          )}

          {/* the constellation — the writer's own geometry, lighting up */}
          <View style={{ alignItems: "center", marginTop: aura.phase === "formed" ? 4 : 10 }}>
            <Constellation dims={aura.dims.map((d) => ({ score: d.score, locked: d.locked }))} skin={s} dark={dark} size={210} />
          </View>

          {/* Wren noticed — chips with their icons */}
          {(aura.phase === "forming" ? traits.slice(0, 1) : traits).length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: s.sub }}>
                {wren.toUpperCase()} NOTICED:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                {(aura.phase === "forming" ? traits.slice(0, 2) : traits).map((t) => (
                  <View key={t.label} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: s.chip, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 }}>
                    <Text style={{ fontSize: 11 }}>{t.icon}</Text>
                    <Text style={{ fontFamily: PF.monoMed, fontSize: 11, color: s.chipInk }}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* the voice of the stage */}
          {(aura.phase === "clearing" || aura.phase === "formed") && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, backgroundColor: s.chip, borderRadius: 12, padding: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 13.5, lineHeight: 20, color: s.ink }}>
                  “{aura.phase === "clearing" ? "I nearly have a name for this." : speakAs(quote, wren)}”
                </Text>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 11, color: s.sub, marginTop: 4 }}>— {wren}</Text>
              </View>
              <WrenBird size={30} mood={aura.phase === "formed" ? "delight" : "think"} />
            </View>
          )}

          {/* the foot: stage line, or the golden door */}
          {aura.phase === "formed" ? (
            <View style={{ marginTop: 14 }}>
              <Pressable onPress={onShare} style={({ pressed }) => ({ backgroundColor: s.bar, borderRadius: 12, paddingVertical: 13, alignItems: "center", opacity: pressed ? 0.88 : 1 })}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: "#1A1730" }}>SHARE MY AURA</Text>
              </Pressable>
              <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.2, color: s.sub, textAlign: "center", marginTop: 8 }}>
                FORMED FROM {aura.pieces} PIECES
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: s.sub, marginTop: 14 }}>
              {aura.phase === "forming"
                ? `STILL FORMING · ${9 - lockedN} SIGNALS LEFT`
                : aura.phase === "shaping"
                  ? `TAKING SHAPE · ${lockedN} OF 9 SIGNALS CLEAR`
                  : `COMING CLEAR · ${aura.pieces} OF 10 PIECES`}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

/* the writer's sky: nine stars at fixed compass points, radius by score —
   spiky where they are strong, hollow where they are quiet. Locked stars
   are lit four-point sparks joined by lines; unlocked ones wait as dots. */
function Constellation({ dims, skin, dark, size }: { dims: { score: number; locked: boolean }[]; skin: { star: string; lit: string }; dark: boolean; size: number }) {
  const S = size;
  const H = S * 0.62;
  const cx = S / 2;
  const cy = H / 2;
  const pts = dims.map((d, i) => {
    const a = -Math.PI / 2 + (i / dims.length) * Math.PI * 2;
    const r = (0.28 + (d.score / 100) * 0.62) * (H / 2 - 8);
    return { x: cx + r * Math.cos(a) * 1.45, y: cy + r * Math.sin(a), locked: d.locked, score: d.score };
  });
  const lit = pts.filter((p) => p.locked);
  const spark = (x: number, y: number, r: number) =>
    `M ${x} ${y - r} Q ${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y} Q ${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r} Q ${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y} Q ${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z`;

  return (
    <Svg width={S} height={H}>
      {dark && lit.length > 2 && (
        <>
          <Defs>
            <RadialGradient id="skyglow" cx="50%" cy="50%" r="55%">
              <Stop offset="0%" stopColor={skin.lit} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={skin.lit} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={cx} cy={cy} r={H * 0.52} fill="url(#skyglow)" />
        </>
      )}
      {lit.slice(1).map((p, i) => (
        <Line key={i} x1={lit[i].x} y1={lit[i].y} x2={p.x} y2={p.y} stroke={dark ? skin.lit : skin.star} strokeWidth={1.1} opacity={dark ? 0.55 : 0.5} />
      ))}
      {lit.length >= 9 && <Line x1={lit[lit.length - 1].x} y1={lit[lit.length - 1].y} x2={lit[0].x} y2={lit[0].y} stroke={skin.lit} strokeWidth={1.1} opacity={0.55} />}
      {pts.map((p, i) =>
        p.locked ? (
          <Path key={i} d={spark(p.x, p.y, 5 + (p.score / 100) * 4)} fill={i % 3 === 0 ? skin.lit : dark ? "#C6BFF0" : "#8F82E8"} opacity={0.95} />
        ) : (
          <Circle key={i} cx={p.x} cy={p.y} r={2.2} fill={skin.star} opacity={0.8} />
        ),
      )}
    </Svg>
  );
}
