import { useEffect, useRef, useState } from "react";
import { archName, archDesc, dimChip, dimLine } from "../lib/aura-copy";
import { Animated, Easing, Image, Pressable, Text, View } from "react-native";
import { t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { getAvatar } from "../data/avatar-lib";
import { pickAuraAvatar } from "../data/aura-avatar-lib";
import { MosaicId } from "./MosaicId";
import { WrenBird } from "./WrenBird";
import { useWrenName } from "../lib/wren-name";
import type { Aura, AuraPhase } from "../lib/aura";
import type { DimScore } from "../lib/hatch-engine";

/* YOUR AURA — the page she is typing about you (owner's A1/B2 sheet).
   ────────────────────────────────────────────────────────────────────────
   The nine-line version said everything and therefore read as a wall. This
   one says ONE sentence and shows the evidence as tags, and the sentence
   is not finished until you are: the name and the line are revealed a
   character at a time as the reading fills in, so 11% literally looks like
   a page 11% typed. At 100% the sentence lands whole and she clips your
   portrait to the corner.

   Nothing here is generated prose — the sentence is the archetype's own
   desc, the tags are the engine's per-dimension chips, and the portrait is
   the owner's aura art. The page only decides how much of it you can see
   yet. */

export const dear = (name: string) => name.replace(/^The\s+/i, "");

const L = {
  paper: "#F8F4E7",
  plate: "#E2DBC2", // the desk the page rests on
  ink: "#26241E",
  grey: "#9A9384",
  rule: "#26241E",
  hair: "#D8D0B8",
  red: "#E8483C", // the title, the postmark's own ink
  navy: "#2E2960",
  slot: "#EFEDFA",
  slotEdge: "#9E97E8",
} as const;

/* the machine's heartbeat */
function useBlink(): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((b) => !b), 530);
    return () => clearInterval(t);
  }, []);
  return on;
}
function Cursor({ on }: { on: boolean }) {
  return <Text style={{ color: on ? P.pen : "transparent" }}>▌</Text>;
}

/* HOW MUCH OF A STRING HAS BEEN TYPED. Cut on a word where possible so a
   half-written line still reads as language, and hang an em dash off the
   break the way a typewriter leaves you mid-word. */
function typed(full: string, pct: number): { text: string; done: boolean } {
  if (pct >= 1) return { text: full, done: true };
  const n = Math.max(1, Math.round(full.length * pct));
  return { text: full.slice(0, n).trimEnd() + "—", done: false };
}

/* TITLE + UNDER-LINE FOR ONE SIGNAL. The engine already writes both: the
   chip is the compressed read, and the last clause of the full line is the
   thing that clause was really about. */
export function splitRead(d: DimScore): { title: string; sub?: string } {
  const chip = dimChip(d);
  const title = chip.charAt(0).toUpperCase() + chip.slice(1);
  const parts = dimLine(d)
    .split(/[,.—]/)
    .map((x) => x.trim())
    .filter(Boolean);
  const tail = parts.length > 1 ? parts[parts.length - 1] : "";
  const sub = tail.split(/\s+/).slice(0, 5).join(" ").toLowerCase();
  return { title, sub: sub && sub !== chip.toLowerCase() ? sub : undefined };
}

const CHIPS_AT: Record<AuraPhase, number> = { empty: 0, forming: 1, shaping: 3, clearing: 4, formed: 6 };

/* HER FIVE IDLES, ONE PER STAGE OF THE PAGE.
   ────────────────────────────────────────────────────────────────────────
   She is at a machine, so the motion is what a typist's body does, not what
   a mascot does: an idle wait, a peck, a carriage nudge, a lean into the
   last line, and one clean look-up when the page is done. All
   transform-only on the native driver, all quiet enough to sit under
   running text. */
const IDLE: Record<AuraPhase, { mood: "listen" | "curious" | "content" | "think" | "delight"; note: string }> = {
  empty: { mood: "listen", note: "waiting at the keys" },
  forming: { mood: "curious", note: "pecking out the first line" },
  shaping: { mood: "content", note: "nudging the carriage along" },
  clearing: { mood: "think", note: "leaning into the last line" },
  formed: { mood: "delight", note: "looks up — it's done" },
};

function PageWren({ stage, size = 26 }: { stage: AuraPhase; size?: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    t.setValue(0);
    const ease = (to: number, duration: number, easing = Easing.inOut(Easing.sin)) =>
      Animated.timing(t, { toValue: to, duration, easing, useNativeDriver: true });
    const seq =
      stage === "empty"
        ? // breathing, hands resting
          Animated.sequence([ease(1, 1500), ease(0, 1500)])
        : stage === "forming"
          ? // two pecks at the keys, then a beat to read what landed
            Animated.sequence([
              ease(1, 130, Easing.in(Easing.quad)),
              ease(0, 190, Easing.out(Easing.quad)),
              ease(1, 130, Easing.in(Easing.quad)),
              ease(0, 190, Easing.out(Easing.quad)),
              Animated.delay(900),
            ])
          : stage === "shaping"
            ? // the carriage goes back: a shove left, a slow drift home
              Animated.sequence([ease(1, 260, Easing.out(Easing.cubic)), ease(0, 900), Animated.delay(500)])
            : stage === "clearing"
              ? // leaning in, faster — she can nearly name it
                Animated.sequence([ease(1, 620), ease(0, 620)])
              : // the page is done: one hop, then she just sits with it
                Animated.sequence([
                  ease(1, 240, Easing.out(Easing.quad)),
                  ease(0, 300, Easing.bounce),
                  Animated.delay(2200),
                ]);
    const loop = Animated.loop(seq);
    loop.start();
    return () => loop.stop();
  }, [stage, t]);

  const range = (out: [number, number]) => t.interpolate({ inputRange: [0, 1], outputRange: out });
  const spin = (out: [string, string]) => t.interpolate({ inputRange: [0, 1], outputRange: out });
  const transform =
    stage === "empty"
      ? [{ scale: range([1, 1.045]) }]
      : stage === "forming"
        ? [{ translateY: range([0, 3.5]) }, { rotate: spin(["0deg", "13deg"]) }]
        : stage === "shaping"
          ? [{ translateX: range([0, -7]) }]
          : stage === "clearing"
            ? [{ rotate: spin(["0deg", "-10deg"]) }, { translateX: range([0, -2]) }]
            : [{ translateY: range([0, -7]) }];

  return (
    <Animated.View style={{ transform }}>
      <WrenBird size={size} bare mood={IDLE[stage].mood} />
    </Animated.View>
  );
}

const CAPTION: Record<AuraPhase, string> = {
  empty: "ac.cap.empty",
  forming: "ac.cap.forming",
  shaping: "ac.cap.shaping",
  clearing: "ac.cap.shaping",
  formed: "ac.cap.formed",
};

export function AuraCard({
  aura,
  seed,
  avatarId,
  onOpen,
  onShare,
  onWrite,
}: {
  aura: Aura;
  seed: string;
  avatarId?: string | null;
  onOpen: () => void;
  onShare: () => void;
  onWrite?: () => void;
}) {
  useLang();
  const wren = useWrenName();
  const blink = useBlink();
  const stage = aura.phase;
  const formed = stage === "formed";
  const pct = Math.round(aura.formed * 100);
  const locked = [...aura.locked].sort((a, b) => b.score - a.score);
  const shown = locked.slice(0, CHIPS_AT[stage]);
  const more = Math.max(0, 9 - shown.length);
  const pool = getAvatar(avatarId)?.pool ?? null;
  const portrait = pool ? pickAuraAvatar(pool, seed, locked[0]?.key ?? null) : null;

  /* the name, revealed as it is earned — ??? until she has enough to guess */
  const workingName = archName(formed ? aura.archetype?.id : aura.draft?.id);
  const title =
    stage === "empty"
      ? t("ac.unset")
      : aura.formed < 0.25 || !workingName
        ? t("ac.unknown")
        : typed(workingName.toUpperCase(), Math.min(1, aura.formed)).text;

  /* her one sentence about you — the archetype's own line, typed in */
  const full = archDesc(formed ? aura.archetype?.id : aura.draft?.id);
  const line = stage === "empty" ? { text: t("ac.nothing"), done: false } : typed(full, Math.min(1, aura.formed));

  const cta = formed ? t("ac.share") : stage === "empty" ? t("ac.first") : stage === "forming" ? t("ac.another") : t("ac.draft");
  const ctaFilled = formed || stage === "forming";
  const onCta = formed ? onShare : stage === "empty" || stage === "forming" ? onWrite ?? onOpen : onShare;

  return (
    <View style={{ backgroundColor: L.plate }}>
      {/* ── the page ── */}
      <Pressable onPress={onOpen} style={{ backgroundColor: L.paper, borderWidth: 1, borderColor: L.ink, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 2, color: L.grey }}>
              {t("ac.yourAura")}{formed && portrait ? ` · NO. ${String(portrait.n).padStart(2, "0")}` : ""}
            </Text>
            <Text
              style={{
                fontFamily: PF.monoSemi,
                fontSize: stage === "empty" ? 20 : 23,
                lineHeight: stage === "empty" ? 28 : 30,
                letterSpacing: 1.2,
                color: stage === "empty" ? L.grey : L.red,
                marginTop: 9,
              }}
            >
              {title}
            </Text>
          </View>
          {formed ? <Polaroid seed={seed} avatarId={avatarId ?? null} topDimKey={locked[0]?.key ?? null} /> : <PhotoSlot seed={seed} stage={stage} pct={pct} pool={pool} topDimKey={locked[0]?.key ?? null} />}
        </View>

        <View style={{ height: 2.5, backgroundColor: L.rule, marginTop: 12 }} />

        {/* her sentence — the whole point of the page */}
        <Text style={{ fontFamily: PF.serif, fontSize: 21, lineHeight: 30, color: stage === "empty" ? L.grey : L.ink, marginTop: 14 }}>
          {line.text}
          {!line.done && <Cursor on={blink} />}
        </Text>

        {/* the evidence, as tags */}
        {shown.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {shown.map((d) => (
              <View key={d.key} style={{ borderWidth: 1, borderColor: L.hair, paddingHorizontal: 11, paddingVertical: 8 }}>
                <Text style={{ fontFamily: PF.mono, fontSize: 12, color: L.ink }}>{d.chip.toLowerCase()}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 1, backgroundColor: L.hair, marginTop: 16 }} />
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
          <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.2, color: L.grey }}>
            {stage === "empty"
              ? t("ac.ribbonEmpty")
              : formed
                ? t("ac.ribbonFrom", { n: aura.pieces })
                : t("ac.ribbonTyped", { pct, n: locked.length })}
          </Text>
          {formed && more > 0 && (
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: P.pen, marginRight: 10 }}>{more} MORE →</Text>
          )}
          <PageWren stage={stage} />
        </View>
      </Pressable>

      {/* ── the desk: one act, and her note about the page ── */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14 }}>
        <Pressable
          onPress={onCta}
          style={({ pressed }) => ({
            backgroundColor: ctaFilled ? L.navy : "transparent",
            borderWidth: ctaFilled ? 0 : 1,
            borderColor: L.grey,
            paddingVertical: 15,
            alignItems: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: ctaFilled ? "#FFFFFF" : L.ink }}>{cta}</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.serifItalic, fontSize: 13, lineHeight: 19, color: "#7C7462", textAlign: "center", marginTop: 12, paddingHorizontal: 8 }}>
          {t(CAPTION[stage], { wren: wren === "Wren" ? t("ac.shePronoun") : wren })}
        </Text>
      </View>
    </View>
  );
}

/* ── the portrait, developing in its slot ─────────────────────────────── */

export function PhotoSlot({ seed, stage, pct, pool, topDimKey }: { seed: string; stage: AuraPhase; pct: number; pool: "m" | "f" | null; topDimKey: string | null }) {
  const portrait = pool && stage !== "empty" ? pickAuraAvatar(pool, seed, topDimKey) : null;
  const rung = portrait ? (stage === "forming" ? portrait.px1 : stage === "shaping" ? portrait.px2 : portrait.px3) : null;
  return (
    <View style={{ width: 74, height: 88, borderWidth: 1.2, borderStyle: "dashed", borderColor: stage === "empty" ? "#B9B19C" : L.slotEdge, backgroundColor: stage === "empty" ? "transparent" : L.slot, alignItems: "center", justifyContent: "center", overflow: "hidden", transform: [{ rotate: "2deg" }] }}>
      {stage === "empty" ? (
        <Text style={{ fontFamily: PF.mono, fontSize: 7.5, letterSpacing: 1.2, color: L.slotEdge, textAlign: "center", lineHeight: 12 }}>
          {t("ac.portraitPending")}
        </Text>
      ) : rung ? (
        <Image source={rung} style={{ width: 70, height: 84 }} resizeMode="cover" />
      ) : (
        <MosaicId seed={seed} cell={8} gap={1.5} develop={pct / 100} />
      )}
      {stage !== "empty" && (
        <Text style={{ position: "absolute", bottom: 2, right: 5, fontFamily: PF.monoSemi, fontSize: 9, color: P.pen }}>{pct}%</Text>
      )}
    </View>
  );
}

/* clipped on, done — the page's last act */
export function Polaroid({ seed, avatarId, topDimKey }: { seed: string; avatarId: string | null; topDimKey: string | null }) {
  const pool = getAvatar(avatarId)?.pool ?? null;
  const portrait = pool ? pickAuraAvatar(pool, seed, topDimKey) : null;
  return (
    <View style={{ transform: [{ rotate: "4deg" }], alignItems: "center" }}>
      <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3DFD3", padding: 5, paddingBottom: 4 }}>
        {portrait ? (
          <Image source={portrait.src} style={{ width: 68, height: 62 }} resizeMode="cover" />
        ) : (
          <View style={{ width: 68, height: 62, backgroundColor: L.slot, alignItems: "center", justifyContent: "center" }}>
            <MosaicId seed={seed} cell={8} gap={1.5} develop={1} />
          </View>
        )}
        <Text style={{ fontFamily: PF.mono, fontSize: 7, letterSpacing: 1.2, color: "#8A8477", textAlign: "center", marginTop: 3 }}>
          NO. {portrait ? String(portrait.n).padStart(2, "0") : "—"}
        </Text>
      </View>
      <Text style={{ position: "absolute", top: -6, right: -4, fontSize: 12, color: "#E8A33D" }}>✦</Text>
      <Text style={{ position: "absolute", top: -14, left: 8, fontSize: 15, transform: [{ rotate: "-24deg" }] }}>🖇</Text>
    </View>
  );
}

/* ── THE TICKET — the shareable specimen (owner's B2) ─────────────────── */

export function AuraTicket({ aura, wren }: { aura: Aura; wren: string }) {
  const locked = [...aura.locked].sort((a, b) => b.score - a.score).slice(0, 4);
  const n = archName(aura.archetype?.id || aura.draft?.id);
  return (
    <View style={{ backgroundColor: L.paper, borderWidth: 2, borderColor: L.ink }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: L.ink }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 2, color: L.grey }}>{t("ac.specimen")}</Text>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 22, lineHeight: 29, letterSpacing: 1.2, color: L.red, marginTop: 8 }}>
          {n.toUpperCase()}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {locked.map((d, i) => {
          const { title } = splitRead(d);
          return (
            <View
              key={d.key}
              style={{
                width: "50%",
                padding: 14,
                backgroundColor: i % 3 === 0 ? L.paper : "#F1EDDF",
                borderRightWidth: i % 2 === 0 ? 1 : 0,
                borderRightColor: L.hair,
                borderBottomWidth: i < 2 ? 1 : 0,
                borderBottomColor: L.hair,
              }}
            >
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 19, color: i === 0 ? L.red : i === 3 ? P.pen : "#B9B3A2" }}>
                {String(i + 1).padStart(2, "0")}
              </Text>
              <Text style={{ fontFamily: PF.letter, fontSize: 15, fontWeight: "700", color: L.ink, marginTop: 6 }}>{title}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: L.hair, borderStyle: "dashed", flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14, paddingVertical: 11 }}>
        <WrenBird size={22} bare mood="content" />
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.6, color: L.grey }}>
          {t("ac.typedByMark", { name: wren.toUpperCase() })}
        </Text>
      </View>
    </View>
  );
}
