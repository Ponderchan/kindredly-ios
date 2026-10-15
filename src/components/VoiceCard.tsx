import { speakAs, useWrenName } from "../lib/wren-name";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";
import { t as tr, useLang } from "../lib/i18n";
import { C, F, cardStyle } from "../theme/tokens";
import { AuraPoem } from "./AuraPoem";
import { WrenBird } from "./WrenBird";
import type { VoiceRead } from "../lib/voice";

/* YOUR WRITING AURA — the hero of Me's "You" room. The card itself grows up:
   empty is Wren waiting inside a pale ring; evolving gets the glowing orb, a
   young constellation and a name; fully formed the whole card goes night and
   the aura gets its true name. Tap opens the nine-signal read; once there's
   something to show, the aura is shareable. */

export function VoiceCard({
  read,
  quote,
  units,
  auraName,
  lettersSent,
  onOpen,
  onShare,
  shareReady = true,
  warmth = 0.5,
  marks = [],
  signals,
  sky = "day",
  dimScores,
  words = [],
  stage,
  texts = [],
  pieces = 0,
  formedOn,
}: {
  read: VoiceRead;
  quote: string; // Wren's line (AI when available, local otherwise)
  units: number[]; // rhythm beats from the real text — they place the stars
  auraName: string;
  lettersSent: number;
  onOpen: () => void;
  onShare: () => void;
  /** the ladder's rule: sharing waits until the aura is truly formed */
  shareReady?: boolean;
  /** the writer's cast and tics — see AuraOrb */
  warmth?: number;
  marks?: string[];
  /** locked signals; when given, stars grow with evidence not volume */
  signals?: number;
  sky?: OrbSky;
  dimScores?: number[];
  /** the words this writer reaches for — nobody else's card has them */
  words?: string[];
  /** the ladder stage + corpus — the stamp is printed from these */
  stage?: "empty" | "forming" | "shaping" | "clearing" | "formed";
  texts?: string[];
  pieces?: number;
  formedOn?: string | null;
}) {
  useLang();
  const tier = read.tier;
  const wren = useWrenName();
  const count = Math.max(lettersSent, read.pieces);
  const share = onShare;

  /* ── fully formed: the card goes night ── */
  if (tier === "formed") {
    return (
      <View>
        <Pressable onPress={onOpen} style={({ pressed }) => [{ backgroundColor: "#221E3D", borderRadius: 22, padding: 20, overflow: "hidden", opacity: pressed ? 0.95 : 1 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.6, color: "#CFC9F2", flex: 1 }}>{tr("vc.title")}</Text>
            <Text style={{ fontFamily: F.sansBold, fontSize: 9, letterSpacing: 1.4, color: "#8F87C9" }}>{tr("vk.fullyFormed")}</Text>
          </View>

          <View style={{ alignItems: "center", marginTop: 6 }}>
            <View style={{ alignSelf: "stretch", borderRadius: 14, overflow: "hidden" }}>
              <AuraPoem stage={stage ?? "formed"} texts={texts} keepWords={words} dark />
            </View>
            <Text style={{ fontFamily: F.sansBold, fontSize: 9, letterSpacing: 2, color: "#8F87C9", marginTop: 2 }}>{tr("vk.auraName")}</Text>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 25, color: "#fff", marginTop: 6, textAlign: "center" }}>{auraName}</Text>
            {words.length > 0 && (
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: "#A9A2CE", marginTop: 5, textAlign: "center" }}>
                {words.slice(0, 3).join(" · ")}
              </Text>
            )}
          </View>

          <View style={{ gap: 13, marginTop: 18 }}>
            {read.traits.map((t) => (
              <View key={t.label} style={{ flexDirection: "row", gap: 11 }}>
                <Text style={{ fontSize: 15, marginTop: 1 }}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: "#fff" }}>{t.label}</Text>
                  <Text style={{ fontFamily: F.sans, fontSize: 12, color: "#A9A2CE", marginTop: 2 }}>{t.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.14)", marginTop: 16, marginBottom: 12 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <WrenBird size={24} mood="content" />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13.5, color: "#D9D4F0" }}>“I know the shape of your voice now.”</Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted }}>{speakAs(read.taking, wren)}</Text>
          <Pressable onPress={share} style={({ pressed }) => ({ backgroundColor: C.purple, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 11, opacity: pressed ? 0.9 : 1 })}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 13, color: "#fff" }}>{tr("vk.shareYours")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable onPress={tier === "empty" ? undefined : onOpen} style={({ pressed }) => [cardStyle, { padding: 20, opacity: pressed && tier !== "empty" ? 0.96 : 1 }]}>
      {/* eyebrow */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <View style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: C.purpleMid }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.6, color: C.label }}>{tr("vc.title")}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 10.5, color: C.faint, marginTop: 2 }}>the feeling your words leave behind.</Text>
        </View>
        {tier !== "empty" && <Text style={{ fontSize: 15, color: C.faint }}>›</Text>}
      </View>

      {tier === "empty" ? (
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 2 }}>
          <AuraOrb size={170} empty>
            <WrenBird size={84} stage="hatch" mood="listen" />
          </AuraOrb>
          <Text style={{ fontFamily: F.serifSemi, fontSize: 19, color: C.ink, textAlign: "center", marginTop: 10 }}>
            {wren} is still listening.
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            Write a few letters, and I'll start discovering{"\n"}what makes your voice yours.
          </Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.faint, alignSelf: "flex-start", marginTop: 10 }}>— {wren}</Text>
          <View style={{ alignSelf: "stretch", borderTopWidth: 1, borderTopColor: C.lineSoft, marginTop: 12, paddingTop: 10 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 10, letterSpacing: 1.2, color: C.faint }}>
              0 LETTERS · {speakAs(read.taking, wren).toUpperCase()}
            </Text>
          </View>
        </View>
      ) : (
        <View>
          <View style={{ alignItems: "center", marginTop: 6 }}>
            <View style={{ alignSelf: "stretch", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.lineSoft }}>
              <AuraPoem stage={stage ?? "shaping"} texts={texts} keepWords={words} />
            </View>
          </View>
          <Text style={{ fontFamily: F.sansBold, fontSize: 9, letterSpacing: 2, color: C.faint }}>AURA</Text>
          <Text style={{ fontFamily: F.serifSemi, fontSize: 24, color: C.ink, marginTop: 4 }}>{auraName}</Text>
          {words.length > 0 && (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint, marginTop: 4 }}>
              {words.slice(0, 3).join(" · ")}
            </Text>
          )}

          <View style={{ gap: 8, marginTop: 14 }}>
            {read.traits.map((t) => (
              <View key={t.label} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F3F2F9", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10 }}>
                <Text style={{ fontSize: 13 }}>{t.icon}</Text>
                <Text style={{ fontFamily: F.sansBold, fontSize: 13.5, color: "#3A3644" }}>{t.label}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 22, color: "#3A3644", marginTop: 14 }}>“{speakAs(quote, wren)}”</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <WrenBird size={18} mood="content" />
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint }}>— {wren}</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.lineSoft, marginTop: 14, paddingTop: 11 }}>
            <Text style={{ flex: 1, fontFamily: F.sansBold, fontSize: 9.5, letterSpacing: 1, color: C.faint, marginRight: 10 }}>
              {count} LETTERS · {speakAs(read.taking, wren).toUpperCase()}
            </Text>
            {shareReady && (
              <Pressable onPress={share} hitSlop={6} style={({ pressed }) => ({ backgroundColor: C.purpleLt, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, opacity: pressed ? 0.85 : 1 })}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.purple }}>{tr("vk.shareMine")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

/* one colour slid toward another — for the orb's personal cast */
function lerpHex(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const c = (sh: number) => [(sh >> 16) & 255, (sh >> 8) & 255, sh & 255];
  const [ar, ag, ab] = c(ah);
  const [br, bg, bb] = c(bh);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${((m(ar, br) << 16) | (m(ag, bg) << 8) | m(ab, bb)).toString(16).padStart(6, "0")}`;
}

/* the aura orb — a soft glowing sphere; the constellation lives on it once
   there's writing. `empty` renders the waiting ring instead.

   PERSONAL CAST · `warmth` (0..1) slides the sphere's hue between a cool
   indigo and a warm rose-violet, computed from the writer's own dims —
   feeling-led writing warms the orb, structure-led cools it. Two people
   holding their cards side by side see different weather. `marks` are the
   writer's real typographic tics — a lowercase i, an ellipsis, a question
   mark — set in tiny mono at the orb's edge like initials engraved on a
   ring. Both deterministic; nobody chooses them, they are simply true. */
export type OrbSky = "dawn" | "day" | "dusk" | "night";

/* the sky each writing hour lives under — four structurally different orbs */
const SKIES: Record<OrbSky, { top: [string, string]; mid: [string, string]; glow: string }> = {
  dawn: { top: ["#F2C4AE", "#F2AEC8"], mid: ["#FAE6DF", "#F6DFEE"], glow: "#F0BC6E" },
  day: { top: ["#AEB6F2", "#DCAAE8"], mid: ["#DFE4FA", "#F0DEF6"], glow: "#F0BC6E" },
  dusk: { top: ["#C89AE0", "#E09AB8"], mid: ["#EBD8F2", "#F4DCE8"], glow: "#E88A5A" },
  night: { top: ["#5A64C8", "#8A64C8"], mid: ["#8C93DE", "#AC8FDE"], glow: "#C9C4F2" },
};

export function AuraOrb({
  size,
  units = [],
  stars = 0,
  dark,
  empty,
  warmth = 0.5,
  marks = [],
  sky = "day",
  dimScores,
  children,
}: {
  size: number;
  units?: number[];
  stars?: number;
  dark?: boolean;
  empty?: boolean;
  /** 0 cool (structure-led) .. 1 warm (feeling-led) — the writer's cast */
  warmth?: number;
  /** the writer's real typographic tics, worn at the orb's edge */
  marks?: string[];
  /** the hour your writing lives in — a night writer's orb is a night orb */
  sky?: OrbSky;
  /** nine scores 0–100 — the constellation takes the writer's own shape */
  dimScores?: number[];
  children?: React.ReactNode;
}) {
  const S = size;
  const w = Math.max(0, Math.min(1, warmth));
  const pal = SKIES[sky];
  const top = dark ? lerpHex("#7F8AE8", "#B58AE8", w) : lerpHex(pal.top[0], pal.top[1], w);
  const mid = dark ? lerpHex("#4E52B8", "#7A50B8", w) : lerpHex(pal.mid[0], pal.mid[1], w);
  return (
    <View style={{ width: S, height: S, alignItems: "center", justifyContent: "center" }}>
      <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: "absolute" }}>
        <Defs>
          <RadialGradient id="orb" cx="50%" cy="42%" r="60%">
            <Stop offset="0%" stopColor={top} stopOpacity={dark ? 0.95 : 0.9} />
            <Stop offset="55%" stopColor={mid} stopOpacity={dark ? 0.8 : 0.8} />
            <Stop offset="100%" stopColor={dark ? "#2A2450" : "#FFFFFF"} stopOpacity={dark ? 0.1 : 0} />
          </RadialGradient>
          <RadialGradient id="glow" cx="62%" cy="34%" r="45%">
            <Stop offset="0%" stopColor={pal.glow} stopOpacity={0.3 + 0.4 * w} />
            <Stop offset="100%" stopColor={pal.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={S / 2} cy={S / 2} r={S * 0.36} fill="url(#orb)" />
        {!empty && <Circle cx={S * 0.6} cy={S * 0.38} r={S * 0.3} fill="url(#glow)" />}
        {empty && (
          <Circle cx={S / 2} cy={S / 2} r={S * 0.42} stroke={dark ? "#575093" : "#C9C4E8"} strokeWidth={1.4} strokeDasharray="3 7" fill="none" />
        )}
      </Svg>
      {empty ? children : <ConstellationOverlay S={S} units={units} stars={stars} dark={dark} dimScores={dimScores} />}
      {/* the engraving: your own tics, worn small at the edge */}
      {!empty &&
        marks.slice(0, 3).map((m, i) => {
          const a = -0.6 + i * 1.15;
          const r = S * 0.44;
          return (
            <Text
              key={m + i}
              style={{
                position: "absolute",
                left: S / 2 + r * Math.cos(a) - 7,
                top: S / 2 + r * Math.sin(a) * 0.86 - 9,
                fontFamily: "IBMPlexMono-Medium",
                fontSize: 13,
                color: dark ? "#B9B2FF" : "#9A93E8",
                opacity: 0.85,
              }}
            >
              {m}
            </Text>
          );
        })}
    </View>
  );
}

/* stars over the orb — same star-tree as ever, one of them gilded */
function ConstellationOverlay({ S, units, stars, dark, dimScores }: { S: number; units: number[]; stars: number; dark?: boolean; dimScores?: number[] }) {
  const cx = S / 2;
  const cy = S / 2;
  const k = S / 190;
  const u = (i: number) => units[i % Math.max(1, units.length)] ?? 0.5;
  /* WITH DIMS, THE SHAPE IS THE WRITER. Nine stars, one per dimension,
     each at its own compass point, radius by score — a rhythm-led writer's
     sky is spiked where a balanced writer's is round. The generic spiral
     below remains only as the fallback for callers without a reading. */
  const pts = dimScores?.length
    ? dimScores.map((sc, i) => {
        const a = -Math.PI / 2 + (i / dimScores.length) * Math.PI * 2 + (u(i) - 0.5) * 0.3;
        const r = (14 + (sc / 100) * 58 + u(i + 3) * 6) * k;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * 0.8, big: sc >= 70, w: 0.45 + (sc / 100) * 0.55 };
      })
    : Array.from({ length: stars }, (_, i) => {
        const a = i * 2.399 + u(i) * 1.4;
        const r = (16 + (i / Math.max(1, stars - 1)) * 58 + u(i + 3) * 10) * k;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * 0.8, big: i % 3 === 0, w: 0.45 + u(i + 1) * 0.55 };
      });
  const links = pts.slice(1).map((p, kk) => {
    const i = kk + 1;
    let best = 0;
    let bd = Infinity;
    for (let j = 0; j < i; j++) {
      const d = (p.x - pts[j].x) ** 2 + (p.y - pts[j].y) ** 2;
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    return [i, best] as const;
  });
  const bigFill = dark ? "#FFFFFF" : C.purpleMid;
  const smallA = dark ? "#CFC9F2" : "#9A93E8";
  const gold = "#F0B95A";
  return (
    <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <G>
        {links.map(([a, b], i) => (
          <Line key={`l${i}`} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} stroke={dark ? "#B9B2FF" : C.purpleMid} strokeWidth={1} opacity={dark ? 0.3 : 0.15} />
        ))}
        {pts.map((p, i) => {
          const gilded = i === 1;
          if (p.big)
            return (
              <Path
                key={i}
                d={`M ${p.x} ${p.y - 6} Q ${p.x + 1.6} ${p.y - 1.6} ${p.x + 6} ${p.y} Q ${p.x + 1.6} ${p.y + 1.6} ${p.x} ${p.y + 6} Q ${p.x - 1.6} ${p.y + 1.6} ${p.x - 6} ${p.y} Q ${p.x - 1.6} ${p.y - 1.6} ${p.x} ${p.y - 6} Z`}
                fill={gilded ? gold : bigFill}
                opacity={0.55 + p.w * 0.45}
              />
            );
          return <Circle key={i} cx={p.x} cy={p.y} r={1.6 + p.w * 1.6} fill={gilded ? gold : i % 2 ? smallA : bigFill} opacity={0.4 + p.w * 0.55} />;
        })}
      </G>
    </Svg>
  );
}

/* the star-tree on its own (the Wrapped report still uses this) */
export function Constellation({ units, stars, size = 150 }: { units: number[]; stars: number; size?: number }) {
  return <ConstellationOverlay S={size} units={units} stars={stars} />;
}
