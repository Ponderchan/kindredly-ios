import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { P, PF } from "../theme/post";
import { MosaicId } from "./MosaicId";
import { WrenBird } from "./WrenBird";
import { useAuth } from "../lib/auth";

/* The counter. Not a floating blurred pill — a ruled strip of windows, the way
   a post office puts its services in a row behind one long desk. No labels:
   each window is a postal object, so the icon IS the noun.

   letters  — an envelope, flap open: what came for you today
   sealed   — a filed page with its own stamp: what never leaves
   post     — the slot itself, inked; you don't "compose", you post
   kindreds — an orbit: the people circling in
   me       — YOUR mosaic; in this system your identity is a redacted grid,
              so the tab is literally you, and no two users' bars match

   The active window is marked by a solid bar on the rule above it — the only
   colour in the strip besides the slot. */

const CELL = 54;

export function PostTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [choosing, setChoosing] = useState(false);
  const current: string = state.routes[state.index]?.name ?? "letters";

  const go = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const Window = ({ name, children }: { name: string; children: React.ReactNode }) => {
    const active = current === name;
    return (
      <Pressable onPress={() => go(name)} style={{ flex: 1, alignItems: "center", justifyContent: "center", height: CELL }}>
        {/* the marker hangs under the rule, which stays unbroken across the
            whole counter — the rule is the system, the marker is the state */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: active ? P.pen : "transparent",
          }}
        />
        {children}
      </Pressable>
    );
  };

  const tint = (name: string) => (current === name ? P.pen : P.ink40);

  return (
    <>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: P.paper }}>
        <View style={{ height: 1, backgroundColor: P.ink }} />
        <View style={{ flexDirection: "row", alignItems: "center", paddingBottom: Math.max(insets.bottom, 6) }}>
          <Window name="letters">
            <EnvelopeGlyph color={tint("letters")} />
          </Window>
          <Window name="journal">
            <SealedGlyph color={tint("journal")} />
          </Window>

          {/* THE SLOT, posting. A bar alone is just a minus sign — so the
              letter is shown going in: tilted, its lower half already swallowed
              by the lip. Deliberately the mirror of the Today glyph, where the
              same letter sits at rest above the same lip. One object, two
              directions. It's also the one element allowed to break the rule
              it stands on. */}
          <Pressable onPress={() => setChoosing(true)} style={{ width: 62, alignItems: "center" }}>
            <View style={{ width: 44, height: 44, backgroundColor: P.pen, alignItems: "center", justifyContent: "center", marginTop: -10 }}>
              <Svg width={26} height={26} viewBox="0 0 24 24">
                {/* the letter, going down and in */}
                <G transform="rotate(-13 12 10)">
                  <Rect x={6} y={2.5} width={12} height={9.5} fill="#fff" />
                  <Path d="M6 2.5l6 4.4 6-4.4" stroke={P.pen} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
                </G>
                {/* the lip — solid, and it crosses the letter */}
                <Rect x={1.5} y={13} width={21} height={3} fill="#fff" />
              </Svg>
            </View>
          </Pressable>

          <Window name="kindreds">
            <OrbitGlyph color={tint("kindreds")} />
          </Window>
          <Window name="me">
            <View style={{ width: S, height: S, alignItems: "center", justifyContent: "center", opacity: current === "me" ? 1 : 0.42 }}>
              <MosaicId seed={user?.id || "you"} cell={2.6} gap={0.95} />
            </View>
          </Window>
        </View>
      </View>

      {/* WHO it's for — Wren asks it (design P1e).

          She is the one who carries letters, so she is the one who should ask
          where this one is going, and she asks in the FIRST PERSON: "I'll find
          who it's for", not "Wren finds who it's for". A character who gets
          described in the third person on her own screen isn't a character,
          she's a feature. She stands holding one letter under each wing — the
          two answers are already in her hands before you choose. */}
      <Modal visible={choosing} transparent animationType="fade" onRequestClose={() => setChoosing(false)}>
        <View style={{ flex: 1, backgroundColor: "#17162B" }}>
          {/* the light she stands in */}
          <Svg style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} width="100%" height="100%">
            <Defs>
              <RadialGradient id="wrenglow" cx="50%" cy="26%" r="52%">
                <Stop offset="0%" stopColor="#6D6DF6" stopOpacity={0.38} />
                <Stop offset="100%" stopColor="#17162B" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#wrenglow)" />
          </Svg>

          <Pressable style={{ flex: 1 }} onPress={() => setChoosing(false)}>
            <View style={{ flex: 1, alignItems: "center", paddingTop: insets.top + 64 }}>
              <Animated.View entering={FadeIn.duration(240)} style={{ alignItems: "center" }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 2.2, color: "rgba(255,255,255,0.62)" }}>
                  POST SOMETHING
                </Text>

                {/* One letter under each wing. They tuck UNDER her and sit low
                    — overlapping her face would hide the character doing the
                    asking, which is the entire point of this screen. */}
                <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 26 }}>
                  <View style={{ transform: [{ rotate: "-15deg" }], marginRight: -14, marginBottom: -6, zIndex: 0 }}>
                    <EnvelopeIcon k={0.62} />
                  </View>
                  <View style={{ zIndex: 2 }}>
                    <WrenBird size={104} mood="curious" />
                  </View>
                  <View style={{ transform: [{ rotate: "14deg" }], marginLeft: -14, marginBottom: -6, zIndex: 0 }}>
                    <NotebookIcon k={0.62} />
                  </View>
                </View>

                <Text style={{ fontFamily: PF.serifItalic, fontSize: 21, color: "#fff", marginTop: 26, textAlign: "center" }}>
                  where should this thought travel?
                </Text>
              </Animated.View>

              <View style={{ flex: 1 }} />

              <View style={{ alignSelf: "stretch", paddingHorizontal: 18, gap: 12, paddingBottom: 4 }}>
                <WrenChoice
                  title="To a stranger"
                  said="I'll find who it's for"
                  delay={140}
                  onPress={() => {
                    setChoosing(false);
                    router.push("/compose");
                  }}
                >
                  <EnvelopeIcon k={0.42} />
                </WrenChoice>
                <WrenChoice
                  title="To yourself"
                  said="I'll keep it for later"
                  delay={220}
                  onPress={() => {
                    setChoosing(false);
                    router.push("/journal-entry");
                  }}
                >
                  <NotebookIcon k={0.42} />
                </WrenChoice>
              </View>

              <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.2, color: "rgba(255,255,255,0.3)", marginTop: 22, marginBottom: Math.max(insets.bottom, 16) + 8 }}>
                TAP ANYWHERE TO GO BACK
              </Text>
            </View>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

/* A row Wren speaks through. The title is the destination; the line under it
   is HER, in her own voice, promising what she'll do with it. */
function WrenChoice({
  title,
  said,
  children,
  onPress,
  delay,
}: {
  title: string;
  said: string;
  children: React.ReactNode;
  onPress: () => void;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(380).delay(delay).springify().damping(17).mass(0.7)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          backgroundColor: pressed ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.07)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          paddingHorizontal: 14,
          paddingVertical: 14,
        })}
      >
        {children}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 17, fontWeight: "600", color: "#fff" }}>{title}</Text>
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 14, color: "rgba(255,255,255,0.58)", marginTop: 3 }}>{said}</Text>
        </View>
        <Text style={{ fontFamily: PF.mono, fontSize: 15, color: "rgba(255,255,255,0.4)" }}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

/* The two things you can make.

   These were both envelopes for a while — one addressed, one not — which was a
   tidy idea and a wrong one: a diary is not an envelope. A letter leaves and a
   notebook stays, and they should look as different as those two facts.

   Drawn to read at 40pt as well as 100pt, so the same pair works in her wings
   and in the rows underneath. */

/* A letter that leaves: airmail edging all the way round, the flap's V, a
   stamp in its corner, and a shadow so it's lying on something. */
function EnvelopeIcon({ k = 1 }: { k?: number }) {
  const W = 112 * k;
  const H = 76 * k;
  const dash = Math.max(4, 7 * k);
  const edge = (horizontal: boolean, extra: any) => (
    <View style={[{ position: "absolute", flexDirection: horizontal ? "row" : "column", overflow: "hidden" }, extra]}>
      {Array.from({ length: horizontal ? Math.ceil(W / dash) : Math.ceil(H / dash) }).map((_, i) => (
        <View
          key={i}
          style={{
            width: horizontal ? dash : 4 * k,
            height: horizontal ? 4 * k : dash,
            backgroundColor: i % 3 === 0 ? P.post : i % 3 === 1 ? P.air : "transparent",
          }}
        />
      ))}
    </View>
  );

  return (
    <View
      style={{
        width: W,
        height: H,
        backgroundColor: "#FBF8F0",
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 14 * k,
        shadowOffset: { width: 0, height: 8 * k },
      }}
    >
      {edge(true, { left: 0, right: 0, top: 0 })}
      {edge(true, { left: 0, right: 0, bottom: 0 })}
      {edge(false, { top: 0, bottom: 0, left: 0 })}
      {edge(false, { top: 0, bottom: 0, right: 0 })}

      {/* the flap, and the seam where it closes */}
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={`M${5 * k} ${5 * k}L${W / 2} ${H * 0.56}L${W - 5 * k} ${5 * k}`} fill="none" stroke="#CFC7B4" strokeWidth={1.4 * k} />
        <Path d={`M${5 * k} ${H - 5 * k}L${W * 0.36} ${H * 0.52}`} fill="none" stroke="#EFE9DA" strokeWidth={1.2 * k} />
        <Path d={`M${W - 5 * k} ${H - 5 * k}L${W * 0.64} ${H * 0.52}`} fill="none" stroke="#EFE9DA" strokeWidth={1.2 * k} />
      </Svg>

      {/* the stamp, pasted a hair crooked */}
      <View
        style={{
          position: "absolute",
          right: 9 * k,
          top: 9 * k,
          width: 20 * k,
          height: 24 * k,
          borderWidth: Math.max(1, 1.4 * k),
          borderColor: P.post,
          backgroundColor: "#FDF3EF",
          transform: [{ rotate: "-5deg" }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 7 * k, height: 7 * k, borderRadius: 4 * k, backgroundColor: P.post, opacity: 0.55 }} />
      </View>
    </View>
  );
}

/* A book that stays: a bound cover, a spine, the elastic band you snap round
   it, and a ribbon still marking your place. Closed, and heavier than paper —
   which is the difference being drawn. */
function NotebookIcon({ k = 1 }: { k?: number }) {
  const W = 84 * k;
  const H = 100 * k;
  return (
    <View
      style={{
        width: W,
        height: H,
        backgroundColor: "#4A4478",
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 14 * k,
        shadowOffset: { width: 0, height: 8 * k },
      }}
    >
      {/* the spine, and the pages showing along its edge */}
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 9 * k, backgroundColor: "#3A3560" }} />
      <View style={{ position: "absolute", right: 0, top: 5 * k, bottom: 5 * k, width: 3 * k, backgroundColor: "#EFEAF6" }} />

      {/* an embossed frame on the cover */}
      <View
        style={{
          position: "absolute",
          left: 18 * k,
          right: 12 * k,
          top: 12 * k,
          bottom: 12 * k,
          borderWidth: Math.max(0.8, 1.2 * k),
          borderColor: "rgba(255,255,255,0.22)",
        }}
      />

      {/* the elastic, snapped round the whole thing */}
      <View style={{ position: "absolute", right: 17 * k, top: -2 * k, bottom: -2 * k, width: 7 * k, backgroundColor: "#D08A3E" }} />

      {/* the ribbon, still holding a page */}
      <View style={{ position: "absolute", left: 26 * k, bottom: -9 * k, width: 8 * k, height: 16 * k, backgroundColor: "#C9C3EE" }} />
    </View>
  );
}

/* ── the glyphs ──────────────────────────────────────────────────────────
   THE GRID, which must not be broken: every glyph is drawn on a 24×24 canvas
   and fills an 18×18 live area centred on (12,12). The three exceptions are
   optical, not sloppy:

     stroked rectangles  17×18  — a square reads larger than a circle of the
                                  same box, so it comes in a hair
     stroked circles     r=9    — the full 18; circles read smaller
     solid dense marks   ~16.8  — filled mass reads heaviest of all, so the
                                  mosaic is inset most

   Stroke weight is 1.7 for the primary form, 1.4–1.5 for secondary detail,
   everywhere. Anything that ignores this makes the row look drunk. */

const S = 24;
const stroke = (color: string, w = 1.7) => ({ stroke: color, strokeWidth: w, fill: "none" as const });

/* TODAY — a letter resting in the in-tray, the tray's lip drawn solid and
   crossing it. The slot is the system's one piece of hardware, used twice with
   opposite polarity: arriving here, departing on the post button. */
function EnvelopeGlyph({ color }: { color: string }) {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24">
      <Rect x={6.5} y={3} width={11} height={9.5} {...stroke(color)} />
      <Path d="M6.5 3l5.5 4.2L17.5 3" {...stroke(color, 1.4)} />
      <Rect x={3} y={12.4} width={18} height={2.6} fill={color} />
      <Path d="M3.9 15.6V20.4H20.1V15.6" {...stroke(color, 1.5)} />
    </Svg>
  );
}

/* SEALED — the little brass door of a PO box, shut: number plate across the
   top, lock solid on the right. Mail addressed to yourself never leaves the
   building; it goes in a box only you open. */
function SealedGlyph({ color }: { color: string }) {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24">
      <Rect x={3.5} y={3} width={17} height={18} {...stroke(color)} />
      <Line x1={3.5} y1={8.6} x2={20.5} y2={8.6} {...stroke(color, 1.4)} />
      <Rect x={6.6} y={5.1} width={6} height={1.7} fill={color} opacity={0.8} />
      <Circle cx={15.4} cy={14.8} r={2.4} {...stroke(color, 1.5)} />
      <Line x1={15.4} y1={14.8} x2={15.4} y2={17.6} {...stroke(color, 1.5)} />
    </Svg>
  );
}

/* KINDREDS — the orbit map miniaturised: you solid at the centre, one
   correspondent already pulled into the inner ring. */
function OrbitGlyph({ color }: { color: string }) {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} {...stroke(color, 1.1)} opacity={0.45} />
      <Circle cx={12} cy={12} r={4.8} {...stroke(color, 1.5)} />
      <Rect x={10.4} y={10.4} width={3.2} height={3.2} fill={color} />
      <Rect x={13.6} y={6.2} width={4} height={4} fill={color} />
    </Svg>
  );
}
