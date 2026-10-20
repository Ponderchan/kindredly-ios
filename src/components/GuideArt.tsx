import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { WrenBird, type WrenAccessory } from "./WrenBird";
import { EnvelopeArt } from "./EnvelopeArt";
import { Stamp } from "./Stamp";
import { MosaicId } from "./MosaicId";
import { Seal } from "./Seal";
import { STAMPS, STARTER_STAMPS } from "../data/stamps";
import { P, PFM } from "../theme/post";
import { t as tr } from "../lib/i18n";
import { STAMP_LADDER } from "../lib/stamp-frame";
import type { GuideArtKey } from "../data/guides";

/* THE MOVING PICTURES IN A GUIDE — built from the product's own parts.
   ────────────────────────────────────────────────────────────────────────
   No video, no Lottie: every frame is her, an envelope, a mosaic, the nine
   bars, a stamp — the same components the tabs draw — with one small
   motion each. That keeps a guide the size of its strings, lets it follow
   the reader's language and the coat their courier wears, and means a
   guide can never look like a different product than the one it explains.
   Each loop is a few seconds long and repeats; nothing here is a step the
   reader has to wait for.

   The stamps are the real 5:6 ones (stamps v2, 2026-10-18), on the three
   widths a guide may use: 30×36, 40×48, 60×72 (the old 26, 38/44 and 58
   snap to them). These pictures are light in every theme, so the stamps
   are drawn as on a light surface (dark={false}), flat. */
const REEL_S = STAMP_LADDER.guideReelSmall.w;
const REEL_M = STAMP_LADDER.guideReelMedium.w;
const REEL_L = STAMP_LADDER.guideReelLarge.w;

export const ART_H = 150;

export function GuideArt({ art }: { art: GuideArtKey }) {
  switch (art) {
    case "envelope-stamp":
      return <EnvelopeStamp />;
    case "bird-carry":
      return <BirdCarry />;
    case "desk-count":
      return <DeskCount />;
    case "mosaic-faint":
      return <MosaicFaint />;
    case "mosaic-develop":
      return <MosaicDevelop />;
    case "two-names":
      return <TwoNames />;
    case "aura-bars":
      return <AuraBars />;
    case "aura-lock":
      return <AuraBars locking />;
    case "aura-private":
      return <AuraPrivate />;
    case "stamps-riffle":
      return <StampsRiffle />;
    case "stamps-grid":
      return <StampsGrid />;
    case "stamps-custom":
      return <StampsCustom />;
    case "journal-page":
      return <JournalPage />;
    case "seal":
      return <SealFrame />;
    case "no-flight":
      return <NoFlight />;
    case "bird-dress":
      return <BirdDress />;
    case "bird-knock":
      return <BirdKnock />;
    case "lock-screen":
      return <LockScreen />;
  }
}

const Frame = ({ children }: { children: React.ReactNode }) => (
  <View style={{ height: ART_H, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{children}</View>
);

/* a value that goes 0→1 and back, forever */
function useLoop(ms: number, delay = 0) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: ms, easing: Easing.inOut(Easing.quad) })), -1, false));
  }, [v, ms, delay]);
  return v;
}

/* a value that climbs 0→1, holds, and starts over */
function useClimb(ms: number, hold = 900) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withSequence(withTiming(1, { duration: ms, easing: Easing.out(Easing.cubic) }), withDelay(hold, withTiming(0, { duration: 250 }))), -1, false);
  }, [v, ms, hold]);
  return v;
}

/* ── letters ── */
function EnvelopeStamp() {
  const t = useClimb(700, 1600);
  const stamp = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.6 + 0.4 * t.value }, { rotate: `${-8 + 8 * t.value}deg` }] }));
  return (
    <Frame>
      <View>
        <EnvelopeArt w={170} sealed={false} />
        <Animated.View style={[{ position: "absolute", right: 8, top: 4 }, stamp]}>
          <Stamp id="made-my-day" width={REEL_M} dark={false} />
        </Animated.View>
      </View>
    </Frame>
  );
}

function BirdCarry() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [t]);
  const fly = useAnimatedStyle(() => ({ transform: [{ translateX: -120 + 240 * t.value }, { translateY: -12 * Math.sin(t.value * Math.PI * 2) }] }));
  return (
    <Frame>
      <View style={{ position: "absolute", left: 24, bottom: 26 }}>
        <MosaicId seed="guide-you" cell={3.2} gap={0.9} develop={1} />
      </View>
      <View style={{ position: "absolute", right: 24, bottom: 26 }}>
        <MosaicId seed="guide-them" cell={3.2} gap={0.9} develop={0.35} />
      </View>
      <Svg width={260} height={40} viewBox="0 0 260 40" style={{ position: "absolute", bottom: 46 }}>
        <Path d="M10 30 C 80 -10, 180 -10, 250 30" fill="none" stroke={P.ink12} strokeWidth={1.4} strokeDasharray="3 4" />
      </Svg>
      <Animated.View style={[{ alignItems: "center" }, fly]}>
        <WrenBird size={54} pose="fly" mood="happy" />
        <View style={{ marginTop: -10 }}>
          <EnvelopeArt w={34} sealed />
        </View>
      </Animated.View>
    </Frame>
  );
}

function DeskCount() {
  const down = useSharedValue(0);
  const [count, setCount] = useState(15);
  useEffect(() => {
    // the count runs down, the shutter drops, and after a beat it is morning
    const id = setInterval(() => setCount((c) => (c < 0 ? 15 : c - 1)), 260);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    down.value = withTiming(count <= 0 ? 1 : 0, { duration: count <= 0 ? 420 : 200, easing: Easing.out(Easing.cubic) });
  }, [count, down]);
  const shutter = useAnimatedStyle(() => ({ height: 6 + 74 * down.value }));
  return (
    <Frame>
      <View style={{ width: 200, height: 96, borderWidth: 1.5, borderColor: P.ink, backgroundColor: "#FFFFFF", overflow: "hidden" }}>
        <View style={{ flexDirection: "row", gap: 6, padding: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ opacity: Math.max(0, count) > 15 - (i + 1) * 3 ? 1 : 0.25 }}>
              <EnvelopeArt w={30} sealed />
            </View>
          ))}
        </View>
        <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.2, color: count ? P.ink : P.ink40, marginLeft: 10 }}>
          {count <= 0 ? tr("ga.closed") : tr("ga.left", { n: Math.max(0, count) })}
        </Text>
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, backgroundColor: P.ink, opacity: 0.9 }, shutter]} />
      </View>
    </Frame>
  );
}

/* ── kindreds ── */
function MosaicFaint() {
  const t = useLoop(1400);
  const pulse = useAnimatedStyle(() => ({ opacity: 0.5 + 0.5 * t.value }));
  return (
    <Frame>
      <View style={{ alignItems: "center", gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#F6F5FD", alignItems: "center", justifyContent: "center" }}>
          <MosaicId seed="guide-stranger" cell={5} gap={1.4} develop={0.15} />
        </View>
        <Animated.Text style={[{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.2, color: P.ink40 }, pulse]}>{tr("ga.stranger")}</Animated.Text>
      </View>
    </Frame>
  );
}

function MosaicDevelop() {
  const [dev, setDev] = useState(0.15);
  useEffect(() => {
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % 8;
      setDev(step < 6 ? 0.15 + 0.85 * (step / 5) : step === 6 ? 1 : 0.15);
    }, 520);
    return () => clearInterval(id);
  }, []);
  const each = Math.min(5, Math.round(((dev - 0.15) / 0.85) * 5));
  return (
    <Frame>
      <View style={{ alignItems: "center", gap: 12 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#F6F5FD", alignItems: "center", justifyContent: "center" }}>
          <MosaicId seed="guide-stranger" cell={5} gap={1.4} develop={dev} />
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <View key={i} style={{ width: 16, height: 4, borderRadius: 2, backgroundColor: i < each ? P.pen : "#E4E1FA" }} />
          ))}
        </View>
      </View>
    </Frame>
  );
}

function TwoNames() {
  const t = useClimb(900, 1800);
  const name = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: 6 - 6 * t.value }] }));
  return (
    <Frame>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 26 }}>
        {[
          { seed: "guide-you", label: tr("ui.you") },
          { seed: "guide-stranger", label: tr("ga.mira") },
        ].map((p) => (
          <View key={p.seed} style={{ alignItems: "center", gap: 8 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F6F5FD", alignItems: "center", justifyContent: "center" }}>
              <MosaicId seed={p.seed} cell={4.4} gap={1.2} develop={1} />
            </View>
            <Animated.View style={[{ borderWidth: 1.5, borderColor: P.pen, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, backgroundColor: P.penWash }, name]}>
              <Text style={{ ...PFM.monoSemi, fontSize: 9.5, letterSpacing: 1, color: P.pen }}>{p.label}</Text>
            </Animated.View>
          </View>
        ))}
      </View>
    </Frame>
  );
}

/* ── aura ── */
const BAR_W = [0.55, 0.8, 0.35, 0.7, 0.5, 0.9, 0.45, 0.65, 0.3];
function AuraBar({ i, w, locking }: { i: number; w: number; locking?: boolean }) {
  const t = useClimb(1100 + i * 90, 1400);
  const fill = useAnimatedStyle(() => ({ width: 120 * w * t.value }));
  const lock = useAnimatedStyle(() => ({ opacity: locking && w > 0.5 ? Math.max(0, (t.value - 0.8) / 0.2) : 0 }));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 120, height: 5, backgroundColor: "#E4E1FA", borderRadius: 2.5, overflow: "hidden" }}>
        <Animated.View style={[{ height: 5, backgroundColor: P.pen, borderRadius: 2.5 }, fill]} />
      </View>
      <Animated.View style={[{ width: 7, height: 7, backgroundColor: P.pen }, lock]} />
    </View>
  );
}
function AuraBars({ locking }: { locking?: boolean }) {
  return (
    <Frame>
      <View style={{ gap: 7 }}>
        {BAR_W.map((w, i) => (
          <AuraBar key={i} i={i} w={w} locking={locking} />
        ))}
      </View>
    </Frame>
  );
}

function AuraPrivate() {
  const t = useLoop(1500);
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * t.value }));
  return (
    <Frame>
      <View style={{ width: 84, height: 150, borderRadius: 18, borderWidth: 2, borderColor: P.ink, alignItems: "center", justifyContent: "center", gap: 8, transform: [{ scale: 0.86 }] }}>
        <View style={{ width: 26, height: 5, borderRadius: 3, backgroundColor: P.ink, position: "absolute", top: 8 }} />
        <View style={{ gap: 4, marginTop: 6 }}>
          {[0.6, 0.85, 0.4, 0.7].map((w, i) => (
            <View key={i} style={{ width: 52 * w, height: 4, backgroundColor: P.pen, borderRadius: 2 }} />
          ))}
        </View>
        <Animated.View style={[{ marginTop: 6 }, glow]}>
          <Svg width={20} height={22} viewBox="0 0 20 22" fill="none" stroke={P.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={3} y={9} width={14} height={11} rx={2} />
            <Path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3" />
          </Svg>
        </Animated.View>
      </View>
    </Frame>
  );
}

/* ── stamps ── */
function StampsRiffle() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => x + 1), 650);
    return () => clearInterval(id);
  }, []);
  const ids = STARTER_STAMPS.length ? STARTER_STAMPS : STAMPS.map((s) => s.id);
  const pick = (k: number) => ids[(i + k) % ids.length];
  return (
    <Frame>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ opacity: 0.45, transform: [{ scale: 0.8 }] }}>
          <Stamp id={pick(0)} width={REEL_M} dark={false} />
        </View>
        <Stamp id={pick(1)} width={REEL_L} dark={false} />
        <View style={{ opacity: 0.45, transform: [{ scale: 0.8 }] }}>
          <Stamp id={pick(2)} width={REEL_M} dark={false} />
        </View>
      </View>
    </Frame>
  );
}

function StampsGrid() {
  const ids = STAMPS.slice(0, 18).map((s) => s.id);
  return (
    <Frame>
      {/* six to a row: six stamps and the five gaps between them */}
      <View style={{ width: 6 * REEL_S + 5 * 4, flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
        {ids.map((id, i) => (
          <View key={id} style={{ opacity: (i * 7) % 5 === 0 ? 1 : 0.7 }}>
            <Stamp id={id} width={REEL_S} dark={false} />
          </View>
        ))}
      </View>
    </Frame>
  );
}

function StampsCustom() {
  const t = useLoop(1300);
  const dash = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * t.value }));
  return (
    <Frame>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
        <View style={{ width: 54, height: 54, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}>
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={3} y={4} width={18} height={16} rx={2} />
            <Path d="M3 16l5-5 4 4 3-3 6 6" />
            <Path d="M15.5 8.5h.01" strokeWidth={2.4} />
          </Svg>
        </View>
        <Text style={{ ...PFM.mono, fontSize: 14, color: P.ink40 }}>→</Text>
        <Animated.View style={[{ width: 58, height: 58, borderRadius: 9, borderWidth: 1.6, borderStyle: "dashed", borderColor: P.pen, alignItems: "center", justifyContent: "center", backgroundColor: P.penWash }, dash]}>
          <Text style={{ ...PFM.monoSemi, fontSize: 9, letterSpacing: 1, color: P.pen }}>{tr("ga.soon")}</Text>
        </Animated.View>
      </View>
    </Frame>
  );
}

/* ── sealed ── */
function JournalPage() {
  const t = useClimb(2200, 1000);
  const write = useAnimatedStyle(() => ({ width: 110 * t.value }));
  return (
    <Frame>
      <View style={{ width: 150, height: 110, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: P.ink12, padding: 12, gap: 8 }}>
        <Text style={{ ...PFM.monoSemi, fontSize: 8.5, letterSpacing: 1.2, color: P.ink40 }}>{tr("ga.sealedToday")}</Text>
        <Animated.View style={[{ height: 3, backgroundColor: P.ink, borderRadius: 1.5 }, write]} />
        <View style={{ width: 90, height: 3, backgroundColor: P.ink12, borderRadius: 1.5 }} />
        <View style={{ width: 120, height: 3, backgroundColor: P.ink12, borderRadius: 1.5 }} />
        <View style={{ width: 60, height: 3, backgroundColor: P.ink12, borderRadius: 1.5 }} />
      </View>
    </Frame>
  );
}

function SealFrame() {
  const t = useClimb(600, 1800);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: 1.25 - 0.25 * t.value }], opacity: 0.3 + 0.7 * t.value }));
  return (
    <Frame>
      <View style={{ alignItems: "center", gap: 10 }}>
        <Animated.View style={press}>
          <Seal size={70} />
        </Animated.View>
        <Text style={{ ...PFM.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: P.ink40 }}>{tr("ga.phoneOnly")}</Text>
      </View>
    </Frame>
  );
}

function NoFlight() {
  return (
    <Frame>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
        <View style={{ alignItems: "center", gap: 6 }}>
          <View style={{ width: 56, height: 42, alignItems: "center", justifyContent: "center" }}>
            <EnvelopeArt w={54} sealed />
            <Svg width={56} height={42} viewBox="0 0 56 42" style={{ position: "absolute" }}>
              <Line x1={6} y1={36} x2={50} y2={6} stroke="#C8412E" strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </View>
          <Text style={{ ...PFM.monoSemi, fontSize: 8.5, letterSpacing: 1.2, color: P.ink40 }}>{tr("ga.neverPosted")}</Text>
        </View>
        <WrenBird size={64} mood="sleepy" />
      </View>
    </Frame>
  );
}

/* ── courier ── */
const DRESS: WrenAccessory[] = ["none", "beanie", "scarf", "flower", "shades"];
function BirdDress() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % DRESS.length), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <Frame>
      <WrenBird size={104} mood="delight" accessory={DRESS[i]} />
    </Frame>
  );
}

function BirdKnock() {
  const t = useLoop(700);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.9 * t.value }], opacity: 1 - t.value }));
  return (
    <Frame>
      <View>
        <WrenBird size={96} mood="curious" />
        <View style={{ position: "absolute", right: -2, top: 6, width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={[{ position: "absolute", width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: P.pen }, ring]} />
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: P.pen, borderWidth: 2, borderColor: "#FFFFFF" }} />
        </View>
      </View>
    </Frame>
  );
}

function LockScreen() {
  const t = useLoop(1800);
  const dot = useAnimatedStyle(() => ({ transform: [{ translateX: 70 * t.value }] }));
  return (
    <Frame>
      <View style={{ width: 230, height: 56, borderRadius: 28, backgroundColor: "#0A0A0C", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#1B1B22", alignItems: "center", justifyContent: "center" }}>
          <WrenBird size={26} mood="content" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 8.5, letterSpacing: 1.2, color: "rgba(255,255,255,0.6)" }}>{tr("ga.letterOut")}</Text>
          <View style={{ height: 3, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 1.5, marginTop: 6, overflow: "visible" }}>
            <Animated.View style={[{ width: 10, height: 3, backgroundColor: "#FFFFFF", borderRadius: 1.5 }, dot]} />
          </View>
        </View>
        <Text style={{ ...PFM.monoSemi, fontSize: 11, color: "#FFFFFF" }}>3</Text>
      </View>
    </Frame>
  );
}
