import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { MosaicId } from "./MosaicId";
import { WrenStamp } from "./WrenStamp";
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

          {/* the slot — inked, square, and deliberately taller than the strip:
              the one element allowed to break the rule it sits on */}
          <Pressable onPress={() => setChoosing(true)} style={{ width: 62, alignItems: "center" }}>
            <View style={{ width: 42, height: 42, backgroundColor: P.pen, alignItems: "center", justifyContent: "center", marginTop: -9 }}>
              <View style={{ width: 20, height: 3, backgroundColor: "#fff" }} />
            </View>
          </Pressable>

          <Window name="kindreds">
            <OrbitGlyph color={tint("kindreds")} />
          </Window>
          <Window name="me">
            <View style={{ opacity: current === "me" ? 1 : 0.42 }}>
              <MosaicId seed={user?.id || "you"} cell={3.5} gap={1.2} />
            </View>
          </Window>
        </View>
      </View>

      {/* who's it for? — the slot asks before it takes anything */}
      <Modal visible={choosing} transparent animationType="fade" onRequestClose={() => setChoosing(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(27,27,24,0.5)", justifyContent: "flex-end" }} onPress={() => setChoosing(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: P.paper, paddingHorizontal: 22, paddingTop: 18, paddingBottom: Math.max(insets.bottom, 14) + 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: P.ink }}>
              <WrenStamp size={38} tint={P.ink} />
              <View>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.6, color: P.ink }}>POST SOMETHING</Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40, marginTop: 3 }}>WHO'S IT FOR?</Text>
              </View>
            </View>

            <Choice
              label="TO A STRANGER"
              note="Wren finds who it's for"
              onPress={() => {
                setChoosing(false);
                router.push("/compose");
              }}
            />
            <Choice
              label="TO YOURSELF"
              note="sealed — it never leaves this phone"
              onPress={() => {
                setChoosing(false);
                router.push("/journal-entry");
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Choice({ label, note, onPress }: { label: string; note: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: P.ink12,
        paddingVertical: 18,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <View>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1.2, color: P.ink }}>{label}</Text>
        <Text style={{ fontFamily: PF.serifItalic, fontSize: 13.5, color: P.ink60, marginTop: 4 }}>{note}</Text>
      </View>
      <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.pen }}>→</Text>
    </Pressable>
  );
}

/* ── the glyphs ──────────────────────────────────────────────────────────
   Each one has to be a fact about this system, not a symbol borrowed from
   the icon-set shelf. The test: could it belong to any other app? If yes,
   it's wrong.

   The slot is the system's one piece of hardware, and it's used twice with
   opposite polarity — mail coming IN through it is Today, mail going OUT
   through it is the post button in the middle of the bar. One object, two
   directions, and the whole metaphor closes. */

const S = 24;
const stroke = (color: string, w = 1.7) => ({ stroke: color, strokeWidth: w, fill: "none" as const });

/* TODAY — a letter halfway through the slot, arriving. The lip is drawn solid
   and crosses the envelope, so the envelope reads as behind it: mid-delivery,
   an event rather than an object. */
function EnvelopeGlyph({ color }: { color: string }) {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24">
      <Rect x={6} y={3.5} width={12} height={11} {...stroke(color)} />
      <Path d="M6 3.5l6 4.6 6-4.6" {...stroke(color, 1.5)} />
      <Rect x={2.5} y={13} width={19} height={2.6} fill={color} />
      <Line x1={5} y1={19.5} x2={19} y2={19.5} {...stroke(color, 1.5)} />
    </Svg>
  );
}

/* SEALED — the little brass door of a PO box, shut. Mail addressed to
   yourself never leaves the building; it goes in a box only you open. A number
   plate across the top, the lock solid on the right. Postal furniture nobody
   uses as an app icon, and it says "private and closed" without a padlock. */
function SealedGlyph({ color }: { color: string }) {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24">
      <Rect x={4} y={3} width={16} height={18} {...stroke(color)} />
      <Line x1={4} y1={8.5} x2={20} y2={8.5} {...stroke(color, 1.4)} />
      <Rect x={7} y={5.2} width={6} height={1.6} fill={color} opacity={0.8} />
      <Circle cx={16} cy={15} r={2.4} {...stroke(color, 1.5)} />
      <Line x1={16} y1={15} x2={16} y2={17.6} {...stroke(color, 1.5)} />
    </Svg>
  );
}

/* KINDREDS — the orbit map itself, miniaturised: you solid at the centre, one
   correspondent pulled into the inner ring, another still out on the far one.
   It's the same diagram the tab opens to, which is the point. */
function OrbitGlyph({ color }: { color: string }) {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9.5} {...stroke(color, 1.1)} opacity={0.45} />
      <Circle cx={12} cy={12} r={5} {...stroke(color, 1.5)} />
      <Rect x={10.3} y={10.3} width={3.4} height={3.4} fill={color} />
      <Rect x={13.8} y={5.9} width={4.2} height={4.2} fill={color} />
    </Svg>
  );
}
