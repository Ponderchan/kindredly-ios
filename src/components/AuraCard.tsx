import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, Text, View } from "react-native";
import { P, PF } from "../theme/post";
import { hashStr } from "../lib/format";
import { ARCHETYPES } from "../lib/hatch-engine";
import { getAvatar } from "../data/avatar-lib";
import { pickAuraAvatar } from "../data/aura-avatar-lib";
import { MosaicId } from "./MosaicId";
import { WrenBird, type WrenMood } from "./WrenBird";
import { useWrenName } from "../lib/wren-name";
import type { Aura } from "../lib/aura";

/* YOUR AURA, MID-TYPE — the owner's definitive sheet (turn 18):
   TYPEWRITER × AUTHOR PHOTO.
   ────────────────────────────────────────────────────────────────────────
   The aura card is a page being typed. Every locked signal is a set line
   of type; the next one is cut off mid-word under a blinking cursor. The
   page RISES out of the machine as the reading completes, and the
   author-photo slot develops alongside it — pixel blocks first (the
   product's own mosaic language), the drawing only at the end. At FORMED
   the name arrives as a typed title in postmark red, and the photo
   leaves the slot to be CLIPPED ON as a numbered polaroid.

   The back is WREN'S MEMORY (the owner's five-vignette sheet): the same
   roller, and Wren on it in a different act per stage — asleep, pecking,
   threading lines, threading the red ribbon, the title struck.

   No handwriting here: the machine speaks mono, lowercase. Wren perches
   on the platen (her stage idles from the letter era survive) and she is
   still the flip. */

type Stage = Aura["phase"];

/* the machine's own palette — greige body, warm page, carbon violet.
   Shared with /aura-card, which renders this same page pulled free. */
export const L = {
  machine: "#E5E1D6",
  machineEdge: "#D5D0C1",
  page: "#FDFCF6",
  pageEdge: "#E4E0D0",
  ink: "#3A362C", // typed ink
  grey: "#A19B8B", // header, footer, pending
  platen: "#3B3670",
  cursor: "#6E67DC",
  slotFill: "#EFEDFA",
  slotEdge: "#9E97E8",
  amber: "#E8A33D",
} as const;

export const dear = (name: string) => name.replace(/^The\s+/i, "");

/* THE P.S. IS COUNTED, NEVER GENERATED — behaviour, not style. Wren only
   says what she can count and print the evidence for (notice.ts's
   philosophy): no LLM ever paraphrases a person on this page. Evidence
   or silence. Lowercase — it goes through the machine. */
export function letterPS(aura: Aura): string | null {
  if (aura.phase === "formed" || aura.phase === "empty") return null;
  if (aura.nightOwl) return "p.s. most of this reached me after midnight.";
  if (aura.commonWords[0]) return `p.s. you keep coming back to "${aura.commonWords[0]}". i like it.`;
  if (aura.pieces >= 3) return `p.s. ${aura.pieces} pieces in. i keep them all.`;
  return null;
}

/* deterministic decoy names for the crossed-out titles — seeded by the
   real working name so they never reshuffle between renders */
function draftDecoys(real: string): string[] {
  const h = hashStr("aura-drafts:" + real);
  const pool = ARCHETYPES.filter((a) => a.name !== real);
  const first = pool[h % pool.length];
  const rest = pool.filter((a) => a !== first);
  return [first.name, rest[(h >>> 5) % rest.length].name];
}

/* the machine's heartbeat — one shared blink, JS-side, half a second */
function useBlink(): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((b) => !b), 530);
    return () => clearInterval(t);
  }, []);
  return on;
}

function Cursor({ on }: { on: boolean }) {
  return <Text style={{ backgroundColor: on ? L.cursor : "transparent", color: "transparent" }}>▌</Text>;
}

/* ── Wren, alive on the machine ──────────────────────────────────────────
   One tiny idle per stage, all transform-only: listening breathes, typing
   bobs, "so close" leans in, formed hops. Never louder than the keys. */

function StageWren({ stage, size = 26, mood }: { stage: Stage; size?: number; mood: WrenMood }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    t.setValue(0);
    const seq =
      stage === "formed"
        ? Animated.sequence([
            Animated.timing(t, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(t, { toValue: 0, duration: 320, easing: Easing.bounce, useNativeDriver: true }),
            Animated.delay(1900),
          ])
        : stage === "forming"
          ? // two quick pecks at the keys, then a beat to read what landed
            Animated.sequence([
              Animated.timing(t, { toValue: 1, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              Animated.timing(t, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(t, { toValue: 1, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              Animated.timing(t, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.delay(850),
            ])
          : Animated.sequence([
            Animated.timing(t, {
              toValue: 1,
              duration: stage === "empty" ? 1400 : stage === "clearing" ? 700 : 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(t, {
              toValue: 0,
              duration: stage === "empty" ? 1400 : stage === "clearing" ? 700 : 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]);
    const loop = Animated.loop(seq);
    loop.start();
    return () => loop.stop();
  }, [stage, t]);

  const transform =
    stage === "empty"
      ? [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }]
      : stage === "formed"
        ? [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }]
        : stage === "clearing"
          ? [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-9deg"] }) }]
          : stage === "forming"
            ? [
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, 3.5] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "14deg"] }) },
              ]
            : [
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] }) },
              ];

  return (
    <Animated.View style={{ transform }}>
      <WrenBird size={size} bare mood={mood} />
    </Animated.View>
  );
}

/* ── the author-photo slot: your portrait, resolving out of the mosaic ──
   Build-time pixel rungs (9/16/30 blocks): a colour ghost first, a person
   next, YOU only at the end. A writer who never chose a library face has
   no pool to draw from, so their slot develops the honest system mosaic. */

export function PhotoSlot({ seed, stage, pct, pool, topDimKey }: { seed: string; stage: Stage; pct: number; pool: "m" | "f" | null; topDimKey: string | null }) {
  if (stage === "empty")
    return (
      <View style={{ width: 56, height: 68, borderWidth: 1, borderStyle: "dashed", borderColor: "#B3AD9D", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 7, letterSpacing: 1.3, color: L.grey, textAlign: "center", lineHeight: 11 }}>
          PORTRAIT{"\n"}PENDING
        </Text>
      </View>
    );

  const portrait = pool ? pickAuraAvatar(pool, seed, topDimKey) : null;
  const rung = portrait
    ? stage === "forming"
      ? portrait.px1
      : stage === "shaping"
        ? portrait.px2
        : portrait.px3
    : null;

  return (
    <View style={{ width: 56, height: 68, borderWidth: 1.2, borderStyle: "dashed", borderColor: L.slotEdge, backgroundColor: L.slotFill, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {rung ? (
        <Image source={rung} style={{ width: 50, height: 62 }} resizeMode="cover" />
      ) : (
        <MosaicId seed={seed} cell={6.5} gap={1.5} develop={pct / 100} />
      )}
      <Text style={{ position: "absolute", bottom: 2, right: 4, fontFamily: PF.mono, fontSize: 7, color: L.cursor }}>
        {pct}%
      </Text>
    </View>
  );
}

/* the finished photo leaves the slot and gets CLIPPED ON — a numbered
   polaroid, slightly askew, the way she'd pin it to the page */
export function Polaroid({ seed, avatarId, topDimKey }: { seed: string; avatarId: string | null; topDimKey: string | null }) {
  const pool = getAvatar(avatarId)?.pool ?? null;
  const portrait = pool ? pickAuraAvatar(pool, seed, topDimKey) : null;
  return (
    <View style={{ transform: [{ rotate: "5deg" }], alignItems: "center" }}>
      <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3DFD3", padding: 5, paddingBottom: 4 }}>
        {portrait ? (
          <Image source={portrait.src} style={{ width: 62, height: 56 }} resizeMode="cover" />
        ) : (
          <View style={{ width: 62, height: 56, backgroundColor: L.slotFill, alignItems: "center", justifyContent: "center" }}>
            <MosaicId seed={seed} cell={7} gap={1.5} develop={1} />
          </View>
        )}
        <Text style={{ fontFamily: PF.mono, fontSize: 6.5, letterSpacing: 1.2, color: "#8A8477", textAlign: "center", marginTop: 3 }}>
          NO. {portrait ? String(portrait.n).padStart(2, "0") : "—"}
        </Text>
      </View>
      <Text style={{ position: "absolute", top: -7, right: -5, fontSize: 11, color: L.amber }}>✦</Text>
      {/* the wire clip that holds it to the page */}
      <Text style={{ position: "absolute", top: -13, left: 6, fontSize: 15, transform: [{ rotate: "-24deg" }] }}>🖇</Text>
    </View>
  );
}

/* ── THE TYPED PAGE — pure presentation, shared with /aura-card ────────── */

export function TypedPage({
  aura,
  wren,
  seed,
  avatarId,
}: {
  aura: Aura;
  wren: string;
  seed: string;
  avatarId: string | null;
}) {
  const blink = useBlink();
  const stage = aura.phase;
  const formed = stage === "formed";
  const pct = Math.round(aura.formed * 100);
  const lines = [...aura.locked].sort((a, b) => b.score - a.score);
  const rereading = stage === "clearing" && lines.length === 9;
  const ps = letterPS(aura);

  /* the line under the cursor never asserts — it is a GUESS about the
     strongest still-sealed signal, cut mid-word. The set lines above it
     are the only claims, and each one is evidence-locked. */
  const guess = [...aura.sealed].sort((a, b) => b.score - a.score)[0];
  const teaser = guess ? `something about ${guess.label.toLowerCase()}`.slice(0, -3) : null;

  const type = { fontFamily: PF.mono, fontSize: 12.5, lineHeight: 19.5, color: L.ink } as const;

  return (
    <View style={{ backgroundColor: L.page, borderWidth: 1, borderColor: L.pageEdge, paddingHorizontal: 15, paddingTop: 13, paddingBottom: 11 }}>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 2.2, color: L.grey }}>— YOUR AURA —</Text>

      {formed && (
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 16, letterSpacing: 1.4, color: P.post, marginTop: 12, paddingRight: 84, lineHeight: 23 }}>
          {(aura.archetype?.name || "").toUpperCase()} ⚡
        </Text>
      )}

      {stage === "empty" ? (
        <>
          <Text style={{ ...type, marginTop: 14 }}>
            <Cursor on={blink} />
          </Text>
          <View style={{ height: 56 }} />
        </>
      ) : (
        <View style={{ marginTop: formed ? 4 : 6 }}>
          {lines.map((d, i) => (
            <Text key={d.key} style={{ ...type, marginTop: 8, paddingRight: !formed && i < 3 ? 66 : 0 }}>
              {d.line.toLowerCase()}
            </Text>
          ))}
          {!formed && !rereading && teaser && (
            <Text style={{ ...type, marginTop: 8, paddingRight: lines.length < 3 ? 66 : 0 }}>
              {teaser}
              <Cursor on={blink} />
            </Text>
          )}
          {rereading && (
            <Text style={{ ...type, marginTop: 8 }}>
              re-reading you, to be sure.<Cursor on={blink} />
            </Text>
          )}
          {ps && (
            <Text style={{ fontFamily: PF.mono, fontSize: 11, lineHeight: 17, color: "#8D8776", marginTop: 10 }}>
              {ps}
            </Text>
          )}
        </View>
      )}

      {/* the page's own status line */}
      <View style={{ borderTopWidth: 1, borderTopColor: "#EDEADD", marginTop: 12, paddingTop: 8 }}>
        <Text style={{ fontFamily: PF.monoMed, fontSize: 8.5, letterSpacing: 1.6, color: L.grey }}>
          {stage === "empty"
            ? "0% TYPED · RIBBON FRESH"
            : formed
              ? `100% TYPED · FORMED FROM ${aura.pieces} PIECES`
              : rereading
                ? `${pct}% TYPED · 9/9 LINES SET`
                : `${pct}% TYPED · ${lines.length}/9 LINES SET`}
        </Text>
      </View>

      {/* the author photo: developing in its slot, or clipped on, done.
          The clip bites the page edge, not the chrome above it — the owner
          caught it pinned to the YOU/PIP switch once. Keep it low. */}
      {formed ? (
        <View style={{ position: "absolute", top: -6, right: 4 }}>
          <Polaroid seed={seed} avatarId={avatarId} topDimKey={lines[0]?.key ?? null} />
        </View>
      ) : (
        <View style={{ position: "absolute", top: 10, right: 10 }}>
          <PhotoSlot seed={seed} stage={stage} pct={pct} pool={getAvatar(avatarId)?.pool ?? null} topDimKey={lines[0]?.key ?? null} />
        </View>
      )}
    </View>
  );
}

/* ── THE CARD: the machine, with the page rising out of it ─────────────── */

/* the page climbs as the reading completes — more margin means more
   machine still holding it; formed pokes clear of the housing */
const RISE: Record<Stage, number> = { empty: 30, forming: 24, shaping: 14, clearing: 6, formed: -14 };

const CAPTION: Record<Stage, string> = {
  empty: "A blank page is loaded. Your first letter presses the first key.",
  forming: "First line set. The portrait paper just went into the developer.",
  shaping: "The page rises. A face is surfacing in the little frame.",
  clearing: "Nearly out of the machine. She can read the whole of you now.",
  formed: "The page is done. She clipped your photo to it.",
};

export function AuraCard({
  aura,
  seed,
  avatarId,
  onOpen,
  onShare,
}: {
  aura: Aura;
  /** your own uid — seeds the portrait when no pool is known */
  seed: string;
  /** your chosen library face — its pool (m/f) decides which half of the
      owner's 50 aura portraits the photo slot develops */
  avatarId?: string | null;
  onOpen: () => void;
  onShare: () => void;
}) {
  const wren = useWrenName();
  const [back, setBack] = useState(false);
  const stage = aura.phase;
  const formed = stage === "formed";
  const flip = () => setBack((b) => !b);

  if (back) return <WrensMemory aura={aura} wren={wren} onFlip={flip} />;

  return (
    <Pressable onPress={onOpen} style={{ paddingTop: formed ? 26 : 0 }}>
      <View style={{ backgroundColor: L.machine, borderRadius: 18, borderWidth: 1, borderColor: L.machineEdge, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ marginTop: RISE[stage] }}>
          <TypedPage aura={aura} wren={wren} seed={seed} avatarId={avatarId ?? null} />
        </View>

        {/* the platen — and Wren, perched on the roller, who is the flip */}
        <View style={{ marginTop: 12 }}>
          <Pressable onPress={flip} hitSlop={12} style={{ position: "absolute", right: 2, top: -23, zIndex: 2, padding: 6, margin: -6 }}>
            <StageWren
              stage={stage}
              mood={formed ? "delight" : stage === "empty" ? "listen" : stage === "clearing" ? "think" : "content"}
            />
          </Pressable>
          <View style={{ height: 14, borderRadius: 7, backgroundColor: L.platen, marginHorizontal: -8 }} />
        </View>

        <Text style={{ fontFamily: PF.serifItalic, fontSize: 12.5, lineHeight: 18, color: "#8A8477", textAlign: "center", marginTop: 12, paddingHorizontal: 8 }}>
          {CAPTION[stage]}
        </Text>

        {stage === "empty" && (
          <View style={{ marginTop: 12, borderWidth: 1, borderColor: L.ink, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 2, color: L.ink }}>
              WRITE YOUR FIRST PIECE
            </Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 11.5, color: L.ink }}>→</Text>
          </View>
        )}

        {formed && (
          <Pressable
            onPress={onShare}
            style={({ pressed }) => ({ backgroundColor: P.ink, paddingVertical: 14, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 2.2, color: "#FFFFFF" }}>
              PULL THE PAGE
            </Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 11, color: "#FFFFFF" }}>↗</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}


/* ── the back: WREN'S MEMORY — her side of the machine ───────────────────
   The owner's five-vignette sheet: the same roller, and Wren on it in a
   different act per stage — asleep before there's anything to type,
   pecking at the keys, threading the lines, threading the red ribbon for
   the title, and finally the title struck under a little applause of
   sparks. The mini page over the roller shows what she's actually
   working from: real chips, real struck titles — never invented. */

const MEM: Record<Stage, { bg: string; edge: string; head: string; text: string; foot: string; cap: string; pageEdge: string }> = {
  empty:    { bg: "#FAF6EA", edge: "#E2DDCB", head: "#A9A395", text: "#4A4436", foot: "#8D8776", cap: "#A9A395", pageEdge: "#E2DDCB" },
  forming:  { bg: "#FAF7EE", edge: "#E2DDCB", head: "#948DDB", text: "#4E47B8", foot: "#6C65CC", cap: "#A9A395", pageEdge: "#D9D4EE" },
  shaping:  { bg: "#F1EEFA", edge: "#DAD5F0", head: "#948DDB", text: "#4E47B8", foot: "#6C65CC", cap: "#948DDB", pageEdge: "#CFC9EC" },
  clearing: { bg: "#E8E4F6", edge: "#CFC9EC", head: "#8781CE", text: "#403A96", foot: "#5F58C4", cap: "#D9482B", pageEdge: "#C4BEE6" },
  formed:   { bg: "#FBF7E9", edge: "#D9482B", head: "#D9482B", text: "#8A6A1E", foot: "#A8861E", cap: "#D9482B", pageEdge: "#E8B84B" },
};

const MEM_HEAD: Record<Stage, string> = {
  empty: "every word you write\nteaches me a little\nmore about you.",
  forming: "i'm picking up\nyour patterns…",
  shaping: "patterns connect.\nyour voice gets clearer.",
  clearing: "i see it now.\njust one more piece\nto name it.",
  formed: "this is you.\nthis is how your words\nleave the world.",
};

const MEM_FOOT: Record<Stage, string> = {
  empty: "keep writing.\ni'm listening.",
  forming: "thank you for\ntrusting me.",
  shaping: "you're showing\nme who you are.",
  clearing: "almost there.",
  formed: "i'll keep learning\nwith you.",
};

const MEM_CAP: Record<Stage, string> = {
  empty: "ASLEEP ON THE ROLLER",
  forming: "PECKING AT THE KEYS",
  shaping: "THREADING THE LINES",
  clearing: "THREADING THE RED RIBBON",
  formed: "THE TITLE IS STRUCK",
};

const MEM_MOOD: Record<Stage, WrenMood> = {
  empty: "sleepy",
  forming: "curious",
  shaping: "happy",
  clearing: "think",
  formed: "delight",
};

function WrensMemory({ aura, wren, onFlip }: { aura: Aura; wren: string; onFlip: () => void }) {
  const stage = aura.phase;
  const B = MEM[stage];
  const chips = [...aura.locked].sort((a, b) => b.score - a.score);
  const guess = [...aura.sealed].sort((a, b) => b.score - a.score)[0];

  return (
    <Pressable
      onPress={onFlip}
      style={{ backgroundColor: B.bg, borderRadius: 18, borderWidth: stage === "formed" ? 1.5 : 1, borderColor: B.edge, minHeight: 430, paddingVertical: 24, paddingHorizontal: 20, justifyContent: "space-between", overflow: "hidden" }}
    >
      {/* the notebook's margin line */}
      <View style={{ position: "absolute", left: 27, top: 0, bottom: 0, width: 1, backgroundColor: "#E9B8B2" }} />

      <View style={{ alignItems: "center" }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 2.6, color: B.head }}>
          {wren.toUpperCase()}'S MEMORY
        </Text>
        <Text style={{ fontFamily: PF.monoMed, fontSize: 14.5, lineHeight: 24, color: B.text, textAlign: "center", marginTop: 16 }}>
          {MEM_HEAD[stage]}
        </Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 13, color: B.head, marginTop: 12 }}>↓</Text>
      </View>

      <RollerScene aura={aura} stage={stage} chips={chips} guessLabel={guess?.label ?? null} wren={wren} />

      <Text style={{ fontFamily: PF.monoMed, fontSize: 13.5, lineHeight: 21, color: B.foot, textAlign: "center" }}>
        {MEM_FOOT[stage]}
      </Text>
    </Pressable>
  );
}

/* the vignette: mini page, the roller, and Wren mid-act on top of it */
function RollerScene({ aura, stage, chips, guessLabel, wren }: { aura: Aura; stage: Stage; chips: Aura["locked"]; guessLabel: string | null; wren: string }) {
  const B = MEM[stage];
  const short = (c: string) => c.split(/[,—]/)[0].trim().toLowerCase();
  const keys = (guessLabel || "eee").toLowerCase().replace(/[^a-z]/g, "").slice(0, 3).padEnd(3, "e").split("");

  return (
    <View style={{ alignItems: "center", marginVertical: 18 }}>
      <View style={{ alignItems: "center" }}>
        {/* the mini page behind her */}
        <View style={{ width: 182, minHeight: 74, backgroundColor: "#FFFDF6", borderWidth: 1, borderColor: B.pageEdge, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 20, alignItems: stage === "formed" ? "center" : "flex-start" }}>
          {stage === "forming" && chips[0] && (
            <>
              <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: L.ink }}>{short(chips[0].chip)}.</Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: "#B9B3A2", marginTop: 3 }}>sure of it</Text>
            </>
          )}
          {stage === "shaping" && (
            <Text style={{ fontFamily: PF.mono, fontSize: 10.5, lineHeight: 17, color: L.ink }}>
              {chips.slice(0, 4).map((d) => `${short(d.chip)} ✓`).join("  ")}
            </Text>
          )}
          {stage === "clearing" && <StruckTitles aura={aura} />}
          {stage === "formed" && (
            <>
              <View style={{ borderWidth: 1.2, borderColor: "#D9482B", paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 0.8, color: "#D9482B" }}>
                  THE {dear(aura.archetype?.name || "").toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontFamily: PF.mono, fontSize: 8.5, color: "#B9B3A2", marginTop: 5 }}>
                typed from {aura.pieces} pieces — {wren[0].toLowerCase()}.
              </Text>
            </>
          )}
        </View>

        {/* the roller, end caps and all */}
        <View style={{ marginTop: -13, width: 214, height: 19, borderRadius: 9.5, backgroundColor: L.platen, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 3 }}>
          <View style={{ width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#2B2752" }} />
          <View style={{ width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#2B2752" }} />
        </View>

        {/* Wren, mid-act, feet on the roller */}
        <View style={{ position: "absolute", bottom: 8, alignSelf: "center" }}>
          <StageWren stage={stage} size={46} mood={MEM_MOOD[stage]} />
        </View>

        {/* stage props: her snores, her spool, her sparks */}
        {stage === "empty" && (
          <Text style={{ position: "absolute", top: -4, right: 34, fontFamily: PF.mono, fontSize: 10, color: "#B9B3A2", letterSpacing: 2 }}>
            z{"\n"} z
          </Text>
        )}
        {stage === "clearing" && (
          <View style={{ position: "absolute", bottom: 12, left: "50%", marginLeft: 32, width: 14, height: 14, borderRadius: 7, backgroundColor: "#D9482B", borderWidth: 2.5, borderColor: "#A83420" }} />
        )}
        {stage === "formed" && (
          <>
            <Text style={{ position: "absolute", top: 18, left: 42, fontSize: 11, color: L.amber }}>✦</Text>
            <Text style={{ position: "absolute", top: 34, right: 40, fontSize: 9, color: L.amber }}>✦</Text>
          </>
        )}
      </View>

      {/* under the roller: the keys she's on, or the thread she pulled */}
      {stage === "forming" && (
        <View style={{ flexDirection: "row", gap: 7, marginTop: 9 }}>
          {keys.map((k, i) => (
            <View key={i} style={{ width: 21, height: 21, borderRadius: 4, borderWidth: 1.2, borderColor: i === 1 ? L.cursor : "#B9B3A2", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 10, color: i === 1 ? L.cursor : "#8D8776" }}>{k}</Text>
            </View>
          ))}
        </View>
      )}
      {stage === "shaping" && (
        <Text style={{ marginTop: 9, fontFamily: PF.mono, fontSize: 10, letterSpacing: 5, color: "#948DDB" }}>
          ╲ ╲ ╲ ╲
        </Text>
      )}

      <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 2.2, color: MEM[stage].cap, marginTop: 13 }}>
        {MEM_CAP[stage]}
      </Text>
    </View>
  );
}

/* her struck-out title drafts, on the little page — real decoys, and the
   real working name caught mid-word in red */
function StruckTitles({ aura }: { aura: Aura }) {
  const real = aura.draft?.name || "The Quiet One";
  const [d1, d2] = draftDecoys(real);
  return (
    <>
      <Text style={{ fontFamily: PF.mono, fontSize: 10, color: "#A29B8A", textDecorationLine: "line-through" }}>
        {d1.toLowerCase()}
      </Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 10, color: "#A29B8A", textDecorationLine: "line-through", marginTop: 3 }}>
        {d2.toLowerCase()}
      </Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 10, color: "#D9482B", marginTop: 3 }}>
        {real.toLowerCase().slice(0, Math.ceil(real.length * 0.4))}—
      </Text>
    </>
  );
}
