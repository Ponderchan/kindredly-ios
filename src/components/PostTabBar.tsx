import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { MosaicId } from "./MosaicId";
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

      {/* WHO it's for.

          Back to a sheet, but the thing that made the first one read as a menu
          is gone: it was a LIST — left-aligned rows, trailing chevrons, one
          under the other. This is two centred stacks with the object on top,
          so you're looking at two things side by side rather than scanning
          options down a column.

          The question does the rest of the work. "Where should this thought
          travel?" isn't asking for a setting; it's asking about the thought. */}
      <Modal visible={choosing} transparent animationType="fade" onRequestClose={() => setChoosing(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(17,17,19,0.4)", justifyContent: "flex-end" }} onPress={() => setChoosing(false)}>
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: P.paper, borderTopWidth: 1, borderTopColor: P.ink, paddingTop: 22, paddingBottom: Math.max(insets.bottom, 16) + 14 }}
          >
            <View style={{ alignItems: "center", paddingHorizontal: 22 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.8, color: P.ink }}>POST SOMETHING</Text>
              <Text style={{ fontFamily: PF.serifItalic, fontSize: 16, color: P.ink60, marginTop: 8, textAlign: "center" }}>
                where should this thought travel?
              </Text>
            </View>

            <View style={{ flexDirection: "row", marginTop: 28, paddingHorizontal: 14 }}>
              <Door
                label="TO A STRANGER"
                note="Wren finds who it's for"
                onPress={() => {
                  setChoosing(false);
                  router.push("/compose");
                }}
              >
                <EnvelopeObject />
              </Door>
              <Door
                label="TO YOURSELF"
                note="a letter for later"
                onPress={() => {
                  setChoosing(false);
                  router.push("/journal-entry");
                }}
              >
                <SealedObject />
              </Door>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* A door: the object on top, its name, what it promises. Centred, because a
   left-aligned row with a chevron is what a menu looks like. */
function Door({
  label,
  note,
  children,
  onPress,
}: {
  label: string;
  note: string;
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, alignItems: "center", paddingVertical: 6, opacity: pressed ? 0.55 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      {children}
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1.2, color: P.ink, marginTop: 14 }}>{label}</Text>
      <Text style={{ fontFamily: PF.serifItalic, fontSize: 13, color: P.ink40, marginTop: 5, textAlign: "center" }}>{note}</Text>
    </Pressable>
  );
}

/* the letter: airmail edge, a stamp in its corner */
function EnvelopeObject() {
  const bars = Array.from({ length: 20 });
  return (
    <View style={{ width: 92, height: 66, backgroundColor: P.paper, borderWidth: 1, borderColor: P.ink, overflow: "hidden" }}>
      <View style={{ height: 6, flexDirection: "row", overflow: "hidden" }}>
        {bars.map((_, i) => (
          <View key={i} style={{ width: 6, height: 20, marginTop: -7, backgroundColor: i % 4 === 0 ? P.post : i % 4 === 2 ? P.air : "transparent", transform: [{ rotate: "34deg" }] }} />
        ))}
      </View>
      <Svg width={92} height={60} viewBox="0 0 92 60">
        <Path d="M0 4l46 29L92 4" fill="none" stroke={P.ink} strokeWidth={1.4} />
      </Svg>
      <View style={{ position: "absolute", right: 7, top: 11, width: 17, height: 20, borderWidth: 1.3, borderColor: P.post }} />
    </View>
  );
}

/* the sealed page: folded shut, a disc holding it */
function SealedObject() {
  return (
    <View style={{ width: 92, height: 66, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 58, height: 66, backgroundColor: P.paper, borderWidth: 1, borderColor: P.ink }} />
      <View style={{ position: "absolute", left: 20, right: 20, top: 25, height: 15, backgroundColor: P.paperDeep }} />
      <View style={{ position: "absolute", width: 25, height: 25, borderRadius: 13, backgroundColor: P.brassSeal, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: P.paper }} />
      </View>
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
