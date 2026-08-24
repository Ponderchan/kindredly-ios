import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, Text, View } from "react-native";
import Svg, { Line, Path, Polygon } from "react-native-svg";
import { P, PF } from "../theme/post";
import { hashStr } from "../lib/format";
import { ARCHETYPES } from "../lib/hatch-engine";
import { getAvatar } from "../data/avatar-lib";
import { pickAuraAvatar } from "../data/aura-avatar-lib";
import { MosaicId } from "./MosaicId";
import { WrenBird, type WrenMood } from "./WrenBird";
import { useWrenName } from "../lib/wren-name";
import type { Aura } from "../lib/aura";

/* A LETTER ABOUT YOU — the owner's final aura design (their 5+5 sheet).
   ────────────────────────────────────────────────────────────────────────
   You spend this whole app writing letters to strangers. Meanwhile Wren
   has been writing one to YOU — and this card is that letter, mid-draft.
   Every locked signal is a line she has committed to ink; unlocked ones
   are empty ruled lines. The name is the ADDRESSEE: "Dear ______," stays
   blank until she knows who she's been writing to. The stamp corner is
   your own mosaic, developing with the same develop mechanic your
   correspondents get — at FORMED it takes the red postmark.

   The back is the envelope: WREN'S MEMORY, her working notes — first
   guesses in pencil, patterns joining up, naming drafts crossed out, and
   finally the wax seal with her own profile. Tap her at the sign-off to
   flip; tap the envelope to come back.

   Her handwriting is PF.hand (Caveat) — reserved for ink she puts on
   paper. Her spoken voice elsewhere stays serif italic. */

type Stage = Aura["phase"];

/* the letter's own palette — cream paper, pencil, and the system's pen
   and postmark inks. Local to this object, like the sealed page's brass. */
const L = {
  paper: "#F8F4E7",
  env: "#F1ECDD", // envelope back — a shade deeper than the sheet
  flap: "#EDE7D6",
  flapLine: "#DCD4BF",
  ink: "#3B372E", // her ink — warm near-black
  pencil: "#A59D8A", // what she isn't sure of yet
  rule: "#CFC7B0", // empty writing lines
  stampFill: "#EAE7F9",
  amber: "#E8A33D",
} as const;

const dear = (name: string) => name.replace(/^The\s+/i, "");

/* deterministic decoy names for the crossed-out drafts — seeded by the
   real working name so they never reshuffle between renders */
function draftDecoys(real: string): string[] {
  const h = hashStr("aura-drafts:" + real);
  const pool = ARCHETYPES.filter((a) => a.name !== real);
  const first = pool[h % pool.length];
  const rest = pool.filter((a) => a !== first);
  return [first.name, rest[(h >>> 5) % rest.length].name];
}

function DottedRule({ style }: { style?: object }) {
  return (
    <Svg height={2} width="100%" style={style}>
      <Line x1="0" y1="1" x2="100%" y2="1" stroke={L.rule} strokeWidth={1.6} strokeDasharray="1.6,4.5" />
    </Svg>
  );
}

function DashedRule({ color = "#DCD4BF" }: { color?: string }) {
  return (
    <Svg height={2} width="100%">
      <Line x1="0" y1="1" x2="100%" y2="1" stroke={color} strokeWidth={1.2} strokeDasharray="6,4" />
    </Svg>
  );
}

export function AuraCard({
  aura,
  seed,
  avatarId,
  onOpen,
  onShare,
}: {
  aura: Aura;
  /** your own uid — seeds the stamp when no portrait pool is known */
  seed: string;
  /** your chosen library face — its pool (m/f) decides which half of the
      owner's 50 aura portraits the stamp draws from */
  avatarId?: string | null;
  onOpen: () => void;
  onShare: () => void;
}) {
  const wren = useWrenName();
  const [back, setBack] = useState(false);
  const stage = aura.phase;
  const pct = Math.round(aura.formed * 100);
  const lockedN = aura.locked.length;
  /* all nine committed but she wants more material — the honest edge the
     blend formula creates (9/9 off six pieces). Never claim "1 line to go". */
  const rereading = stage === "clearing" && lockedN === 9;
  const lines = [...aura.locked].sort((a, b) => b.score - a.score);
  const formed = stage === "formed";

  const flip = () => setBack((b) => !b);

  if (back)
    return (
      <EnvelopeBack aura={aura} wren={wren} onFlip={flip} />
    );

  const frame = {
    backgroundColor: L.paper,
    borderWidth: 1,
    borderColor: P.ink,
    borderBottomWidth: formed ? 4 : 1,
    borderBottomColor: formed ? P.post : P.ink,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: stage === "empty" ? 18 : 14,
  };

  const fromLine =
    stage === "empty" ? "UNWRITTEN" : formed ? "FINISHED" : `${pct}% WRITTEN`;
  const fromColor = stage === "empty" ? L.pencil : formed ? P.post : P.pen;

  const signoff = rereading
    ? `I have it. Let me read you once more to be sure. — ${wren[0]}.`
    : stage === "clearing"
      ? `— so close, ${wren}`
      : `— still writing, ${wren}`;

  /* THE P.S. IS COUNTED, NEVER GENERATED. The letter's nine lines are
     already alive (the engine picks each one for this writer's scores);
     the P.S. is the other kind of alive — behaviour, not style. Wren only
     says what she can count and print the evidence for, in notice.ts's
     philosophy: no LLM ever paraphrases a person on this card. */
  const ps = formed
    ? null
    : aura.nightOwl
      ? "P.S. most of this reached me after midnight."
      : aura.commonWords[0]
        ? `P.S. you keep coming back to "${aura.commonWords[0]}". I like it.`
        : aura.pieces >= 3
          ? `P.S. ${aura.pieces} pieces in. I keep them all.`
          : null;

  return (
    <Pressable onPress={onOpen} style={frame}>
      {/* head — the letter's own docket; the stamp floats in the corner so
          the salutation can sit right under the FROM line, like the sheet */}
      <View style={{ paddingRight: 84 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.8, color: "#79715E" }}>
          A LETTER ABOUT YOU
        </Text>
        <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.6, color: fromColor, marginTop: 5 }}>
          FROM {wren.toUpperCase()} · {fromLine}
        </Text>
      </View>
      <View style={{ position: "absolute", top: 14, right: 14 }}>
        <Stamp
          seed={seed}
          stage={stage}
          pct={pct}
          formedOn={aura.formedOn}
          pool={getAvatar(avatarId)?.pool ?? null}
          topDimKey={lines[0]?.key ?? null}
        />
      </View>

      {/* Dear ______ , — the name is the addressee */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 12 }}>
        <Text style={{ fontFamily: PF.handSemi, fontSize: 34, color: L.ink }}>Dear</Text>
        {formed ? (
          <Text style={{ fontFamily: PF.handSemi, fontSize: 33, color: P.pen, marginLeft: 10 }}>
            {dear(aura.archetype?.name || "")}
          </Text>
        ) : (
          <View style={{ width: 116, marginLeft: 10, marginBottom: 7, borderBottomWidth: 1, borderBottomColor: "#B4AC98", alignItems: "center" }}>
            <Text style={{ fontFamily: PF.hand, fontSize: 17, color: stage === "clearing" ? "#8F82C8" : L.pencil }}>
              {stage === "shaping" ? "soon" : stage === "clearing" ? "almost..." : " "}
            </Text>
          </View>
        )}
        <Text style={{ fontFamily: PF.handSemi, fontSize: 34, color: L.ink, marginLeft: 8 }}>,</Text>
      </View>

      {stage === "empty" ? (
        <>
          <Text style={{ fontFamily: PF.hand, fontSize: 23, lineHeight: 30, color: L.ink, marginTop: 14 }}>
            We haven't met on paper yet.
          </Text>
          {[0, 1, 2, 3].map((i) => (
            <DottedRule key={i} style={{ marginTop: 26 }} />
          ))}
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 24 }}>
            <Text style={{ flex: 1, fontFamily: PF.hand, fontSize: 21, color: "#7C7462" }}>
              — I'll start the moment you do.
            </Text>
            <Pressable onPress={flip} hitSlop={14} style={{ padding: 8, margin: -8 }}>
              <StageWren stage={stage} mood="listen" />
            </Pressable>
          </View>
          <View style={{ marginTop: 18, borderWidth: 1, borderColor: L.ink, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: L.ink }}>
              WRITE YOUR FIRST PIECE
            </Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 12, color: L.ink }}>→</Text>
          </View>
        </>
      ) : (
        <>
          {/* the body: every locked signal is a line she has inked */}
          <View style={{ marginTop: 4 }}>
            {lines.map((d) => (
              <Text key={d.key} style={{ fontFamily: PF.hand, fontSize: 21, lineHeight: 27, color: L.ink, marginTop: 10 }}>
                {d.line}
              </Text>
            ))}
            {lines.length === 0 && (
              <Text style={{ fontFamily: PF.hand, fontSize: 20, color: L.pencil, marginTop: 10 }}>
                (reading your first piece...)
              </Text>
            )}

            {formed ? (
              <Text style={{ fontFamily: PF.hand, fontSize: 21, lineHeight: 27, color: L.ink, marginTop: 16 }}>
                That's who I've been writing to, all this time.
              </Text>
            ) : stage === "clearing" && !rereading ? (
              <>
                <Text style={{ fontFamily: PF.hand, fontSize: 19, color: P.pen, marginTop: 14 }}>
                  one more thing and I can name you —
                </Text>
                <DottedRule style={{ marginTop: 4 }} />
              </>
            ) : !rereading ? (
              <>
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontFamily: PF.hand, fontSize: 15, color: L.pencil, textAlign: "right", marginBottom: 2 }}>
                    (next letter...)
                  </Text>
                  <DottedRule />
                </View>
                {(stage === "forming" ? [0, 1] : [0]).map((i) => (
                  <DottedRule key={i} style={{ marginTop: 26 }} />
                ))}
              </>
            ) : null}
          </View>

          {/* sign-off — Wren herself is the flip */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 20 }}>
            <Text
              style={{
                flex: 1,
                fontFamily: PF.hand,
                fontSize: formed ? 25 : 20,
                color: formed ? L.ink : "#7C7462",
              }}
            >
              {formed ? `yours, ${wren}` : signoff}
            </Text>
            {/* she is the flip — padded out, or the card's own press wins */}
            <Pressable onPress={flip} hitSlop={14} style={{ padding: 8, margin: -8 }}>
              <StageWren stage={stage} mood={formed ? "delight" : stage === "clearing" ? "think" : "content"} />
            </Pressable>
          </View>

          {ps && (
            <Text style={{ fontFamily: PF.hand, fontSize: 16.5, color: L.pencil, marginTop: 10 }}>
              {ps}
            </Text>
          )}

          {formed && (
            <Pressable
              onPress={onShare}
              style={({ pressed }) => ({ backgroundColor: L.ink, paddingVertical: 15, marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: pressed ? 0.85 : 1 })}
            >
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2.2, color: L.paper }}>
                LET THIS LETTER TRAVEL
              </Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 11, color: L.paper }}>↗</Text>
            </Pressable>
          )}

          {/* foot — the machine's one ruled line under her letter */}
          <View style={{ marginTop: 14 }}>
            <DashedRule />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.8, color: "#8A8270" }}>
                {formed
                  ? `FORMED FROM ${aura.pieces} PIECES`
                  : stage === "forming"
                    ? "STILL FORMING"
                    : stage === "shaping"
                      ? "TAKING SHAPE"
                      : "COMING CLEAR"}
              </Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.4, color: "#8A8270" }}>
                {formed
                  ? "SHE KEEPS WRITING"
                  : rereading
                    ? "9 LINES DOWN · RE-READING YOU"
                    : stage === "shaping"
                      ? `${lockedN} OF 9 LINES WRITTEN`
                      : `${9 - lockedN} ${9 - lockedN === 1 ? "LINE" : "LINES"} TO GO`}
              </Text>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

/* ── Wren, alive on the card ─────────────────────────────────────────────
   One tiny idle per stage, all transform-only on the native driver:
   listening breathes, writing bobs like a nib at work, "so close" leans
   in quicker, formed does a little hop. Never louder than handwriting. */

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

/* ── the stamp corner: your portrait, resolving out of the mosaic ────────
   The develop treatment is the product's own pixel language: the owner's
   aura portrait starts as 9×9 colour blocks, sharpens to 16 then 30, and
   only at FORMED becomes the drawing itself — the mosaic doesn't clear,
   it BECOMES you. A writer who never chose a library face has no pool to
   draw from, so their stamp stays the honest system face (their mosaic). */

function Stamp({ seed, stage, pct, formedOn, pool, topDimKey }: { seed: string; stage: Stage; pct: number; formedOn?: string | null; pool: "m" | "f" | null; topDimKey: string | null }) {
  if (stage === "empty")
    return (
      <View style={{ width: 62, height: 76, borderWidth: 1, borderStyle: "dashed", borderColor: "#B9B19C", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 7.5, letterSpacing: 1.4, color: L.pencil, textAlign: "center", lineHeight: 12 }}>
          STAMP{"\n"}PENDING
        </Text>
      </View>
    );

  const formed = stage === "formed";
  const portrait = pool ? pickAuraAvatar(pool, seed, topDimKey) : null;
  const rung = portrait
    ? stage === "forming"
      ? portrait.px1
      : stage === "shaping"
        ? portrait.px2
        : formed
          ? portrait.src
          : portrait.px3
    : null;
  const date = (() => {
    if (!formedOn) return "";
    const d = new Date(formedOn + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  })();

  return (
    <View>
      <View style={{ width: 62, height: 76, borderWidth: 1.5, borderStyle: "dotted", borderColor: P.pen, backgroundColor: L.stampFill, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {rung ? (
          <Image source={rung} style={{ width: 54, height: 68 }} resizeMode="cover" />
        ) : (
          <MosaicId seed={seed} cell={7} gap={1.5} develop={formed ? 1 : pct / 100} />
        )}
        {formed ? (
          <Text style={{ position: "absolute", top: 2, right: 4, fontSize: 10, color: L.amber }}>✦</Text>
        ) : (
          <Text style={{ position: "absolute", bottom: 3, right: 5, fontFamily: PF.mono, fontSize: 7.5, color: P.pen }}>
            {pct}%
          </Text>
        )}
      </View>
      {/* the postmark lands ON the stamp — everything real gets cancelled */}
      {formed && (
        <View
          style={{ position: "absolute", top: 4, right: 40, width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: P.post, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-12deg" }] }}
        >
          <Text style={{ fontFamily: PF.mono, fontSize: 6.5, letterSpacing: 1.2, color: P.post }}>KINDREDLY</Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 8.5, letterSpacing: 1.4, color: P.post, marginVertical: 1 }}>FORMED</Text>
          {!!date && <Text style={{ fontFamily: PF.mono, fontSize: 6.5, letterSpacing: 1, color: P.post }}>{date}</Text>}
        </View>
      )}
    </View>
  );
}

/* ── the envelope back: WREN'S MEMORY ──────────────────────────────────── */

function EnvelopeBack({ aura, wren, onFlip }: { aura: Aura; wren: string; onFlip: () => void }) {
  const stage = aura.phase;
  const formed = stage === "formed";
  const [w, setW] = useState(0);
  const FLAP = 118;

  const headline =
    stage === "empty"
      ? "Every word you write\nwill teach me a little\nmore about you."
      : stage === "forming"
        ? "I'm picking up\nyour patterns —"
        : stage === "shaping"
          ? "Patterns connect.\nYour voice gets clearer."
          : stage === "clearing"
            ? "I see it now.\nJust one more piece to name it."
            : "This is you.\nThis is how your words\nleave the world.";

  const foot =
    stage === "empty"
      ? "Keep writing. I'm listening."
      : stage === "forming"
        ? "Thank you for trusting me."
        : stage === "shaping"
          ? "You're showing me who you are."
          : stage === "clearing"
            ? "Almost there."
            : "I'll keep learning with you.";

  return (
    <Pressable
      onPress={onFlip}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{
        backgroundColor: L.env,
        borderWidth: 1,
        borderColor: P.ink,
        borderBottomWidth: formed ? 4 : 1,
        borderBottomColor: formed ? P.post : P.ink,
        minHeight: 400,
        overflow: "hidden",
        paddingBottom: 20,
      }}
    >
      {/* the flap — two folds meeting at the seal */}
      {w > 0 && (
        <Svg width={w} height={FLAP} style={{ position: "absolute", top: 0 }}>
          <Polygon points={`0,0 ${w},0 ${w / 2},${FLAP - 8}`} fill={formed ? "#EFE6D2" : L.flap} />
          <Line x1={0} y1={0} x2={w / 2} y2={FLAP - 8} stroke={formed ? P.post : L.flapLine} strokeWidth={formed ? 1.4 : 1.2} />
          <Line x1={w} y1={0} x2={w / 2} y2={FLAP - 8} stroke={formed ? P.post : L.flapLine} strokeWidth={formed ? 1.4 : 1.2} />
        </Svg>
      )}

      {/* the seal, where the folds meet */}
      <View style={{ alignItems: "center", marginTop: FLAP - 32 }}>
        {formed ? (
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: P.post, alignItems: "center", justifyContent: "center" }}>
            <StageWren stage="formed" mood="delight" />
          </View>
        ) : (
          <View
            style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1.3, borderStyle: "dashed", borderColor: stage === "clearing" ? "#8F82C8" : "#B9B19C", backgroundColor: L.env, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 0.5, color: stage === "clearing" ? "#8F82C8" : L.pencil }}>
              {stage === "clearing" ? "soon" : "seal"}
            </Text>
          </View>
        )}
      </View>

      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 2.6, color: formed ? P.post : "#8A8270", textAlign: "center", marginTop: 22 }}>
        {wren.toUpperCase()}'S MEMORY{formed ? " · SEALED" : ""}
      </Text>

      <Text style={{ fontFamily: PF.handSemi, fontSize: 26, lineHeight: 33, color: L.ink, textAlign: "center", marginTop: 22, paddingHorizontal: 20 }}>
        {headline}
      </Text>

      <View style={{ flex: 1, paddingHorizontal: 26, marginTop: 18 }}>
        {stage === "empty" && (
          <View style={{ alignItems: "center", marginTop: 8, opacity: 0.3 }}>
            <StageWren stage="empty" size={44} mood="listen" />
          </View>
        )}

        {stage === "forming" && <FormingNotes aura={aura} />}
        {stage === "shaping" && <PatternWeb aura={aura} />}
        {stage === "clearing" && <NamingDrafts aura={aura} />}
        {formed && <SealedName aura={aura} />}
      </View>

      <Text style={{ fontFamily: PF.hand, fontSize: 21, color: "#7C7462", textAlign: "center", marginTop: 18 }}>
        {foot} — {wren[0]}.
      </Text>
    </Pressable>
  );
}

/* still forming: what she has in ink, and one guess in pencil */
function FormingNotes({ aura }: { aura: Aura }) {
  const guess = [...aura.sealed].sort((a, b) => b.score - a.score)[0];
  return (
    <View>
      {aura.locked.map((d) => (
        <Text key={d.key} style={{ fontFamily: PF.hand, fontSize: 20, lineHeight: 27, color: L.ink }}>
          · {d.chip.toLowerCase()}. sure of it.
        </Text>
      ))}
      {guess && (
        <Text style={{ fontFamily: PF.hand, fontSize: 20, lineHeight: 27, color: L.pencil, marginTop: 6 }}>
          · something about {guess.label.toLowerCase()}? too early to say
        </Text>
      )}
      <View style={{ alignItems: "center", marginTop: 22 }}>
        <Svg width={70} height={16}>
          <Path d="M4 9 Q 20 -1, 36 9 T 66 9" stroke="#8F82E8" strokeWidth={2} fill="none" />
        </Svg>
      </View>
    </View>
  );
}

/* taking shape: the notes start joining up */
function PatternWeb({ aura }: { aura: Aura }) {
  const [w, setW] = useState(0);
  const H = 150;
  const spots = [
    { x: 0.06, y: 0.16 },
    { x: 0.55, y: 0.02 },
    { x: 0.24, y: 0.58 },
    { x: 0.58, y: 0.78 },
    { x: 0.1, y: 0.88 },
  ];
  const nodes = [...aura.locked]
    .sort((a, b) => b.score - a.score)
    .slice(0, spots.length)
    .map((d, i) => ({ label: d.chip.split(/[,—]/)[0].trim().toLowerCase(), ...spots[i] }));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H, marginTop: 6 }}>
      {w > 0 && (
        <Svg width={w} height={H} style={{ position: "absolute" }}>
          {nodes.slice(1).map((n, i) => (
            <Line
              key={i}
              x1={nodes[i].x * w + 30}
              y1={nodes[i].y * H + 12}
              x2={n.x * w + 30}
              y2={n.y * H + 12}
              stroke="#8F82E8"
              strokeWidth={1.2}
              strokeDasharray="4,4"
              opacity={0.55}
            />
          ))}
        </Svg>
      )}
      {nodes.map((n) => (
        <Text
          key={n.label}
          style={{ position: "absolute", left: n.x * w, top: n.y * H, fontFamily: PF.hand, fontSize: 19, color: L.ink }}
        >
          {n.label} <Text style={{ color: "#6BA06B" }}>✓</Text>
        </Text>
      ))}
    </View>
  );
}

/* coming clear: her naming drafts, crossed out — the last one half-written */
function NamingDrafts({ aura }: { aura: Aura }) {
  const real = aura.draft?.name || "The Quiet One";
  const [d1, d2] = draftDecoys(real);
  const half = real.slice(0, Math.ceil(real.length * 0.55)) + "—";
  const wantsPieces = aura.locked.length === 9;
  return (
    <View style={{ marginTop: 4 }}>
      <Text style={{ fontFamily: PF.hand, fontSize: 21, color: L.pencil, textDecorationLine: "line-through" }}>
        {d1}? no.
      </Text>
      <Text style={{ fontFamily: PF.hand, fontSize: 21, color: L.pencil, textDecorationLine: "line-through", marginTop: 6 }}>
        {d2} — closer...
      </Text>
      <Text style={{ fontFamily: PF.hand, fontSize: 22, marginTop: 8 }}>
        <Text style={{ color: P.pen }}>{half} </Text>
        <Text style={{ color: L.pencil }}>{wantsPieces ? "(not yet. a few more pieces.)" : "(not yet. one more letter.)"}</Text>
      </Text>
    </View>
  );
}

/* formed: the name in full, and the drafts kept */
function SealedName({ aura }: { aura: Aura }) {
  const name = aura.archetype?.name || "";
  const top = [...aura.locked].sort((a, b) => b.score - a.score)[0];
  return (
    <View style={{ marginTop: 2 }}>
      <Text style={{ fontFamily: PF.handSemi, fontSize: 25 }}>
        <Text style={{ color: P.pen }}>the {dear(name)}</Text>
        {top ? <Text> {top.icon}</Text> : null}
        <Text style={{ fontFamily: PF.hand, fontSize: 19, color: L.pencil }}>  (it was always this)</Text>
      </Text>
      <Text style={{ fontFamily: PF.hand, fontSize: 19, color: L.ink, marginTop: 12, textAlign: "center" }}>
        P.S. I kept every draft.
      </Text>
    </View>
  );
}
