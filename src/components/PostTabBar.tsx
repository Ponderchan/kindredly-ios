import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
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

          Full screen, on a DARK blur. The earlier attempts each failed for a
          nameable reason: left-aligned rows with chevrons read as a menu; a
          light blur over a white app gives milk with photo-blobs bleeding
          through; a sheet cuts the screen in half and makes a small question
          look like a form. A dark blur keeps the letter you were reading faintly
          present behind the question, and paper objects glow on it.

          The two objects are THE SAME OBJECT with different addresses, which is
          the whole choice said in one picture: a letter with an empty address
          block is looking for someone; a letter addressed with your own mosaic
          is coming back to you later. "To yourself" isn't a different feature,
          it's the same act with a different recipient. */}
      <Modal visible={choosing} transparent animationType="fade" onRequestClose={() => setChoosing(false)}>
        <BlurView intensity={44} tint="dark" style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, alignItems: "center", justifyContent: "center" }} onPress={() => setChoosing(false)}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.9)" }}>POST SOMETHING</Text>
            <Text style={{ fontFamily: PF.serifItalic, fontSize: 17, color: "rgba(255,255,255,0.66)", marginTop: 10 }}>
              where should this thought travel?
            </Text>

            <View style={{ flexDirection: "row", marginTop: 44, paddingHorizontal: 18 }}>
              <Door
                label="TO A STRANGER"
                note="Wren finds who it's for"
                onPress={() => {
                  setChoosing(false);
                  router.push("/compose");
                }}
              >
                <LetterObject />
              </Door>
              <Door
                label="TO YOURSELF"
                note="a letter for later"
                onPress={() => {
                  setChoosing(false);
                  router.push("/journal-entry");
                }}
              >
                <LetterObject addressee={user?.id || "you"} />
              </Door>
            </View>

            <Text style={{ position: "absolute", bottom: Math.max(insets.bottom, 16) + 18, fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.2, color: "rgba(255,255,255,0.34)" }}>
              TAP ANYWHERE TO GO BACK
            </Text>
          </Pressable>
        </BlurView>
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
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1.2, color: "rgba(255,255,255,0.92)", marginTop: 16 }}>{label}</Text>
      <Text style={{ fontFamily: PF.serifItalic, fontSize: 13.5, color: "rgba(255,255,255,0.55)", marginTop: 6, textAlign: "center" }}>{note}</Text>
    </Pressable>
  );
}

/* ONE object, two addresses.

   An envelope with an empty address block is a letter still looking for
   someone; the same envelope carrying your own mosaic is a letter coming back
   to you later. Drawing them as one form makes the choice readable in a glance
   and says the true thing: writing to yourself isn't a different feature, it's
   the same act with a different recipient. */
function LetterObject({ addressee }: { addressee?: string }) {
  const bars = Array.from({ length: 18 });
  return (
    <View style={{ width: 112, height: 78, backgroundColor: P.paper }}>
      {/* airmail edge */}
      <View style={{ height: 7, flexDirection: "row", overflow: "hidden" }}>
        {bars.map((_, i) => (
          <View
            key={i}
            style={{
              width: 7,
              height: 22,
              marginTop: -8,
              backgroundColor: i % 4 === 0 ? P.post : i % 4 === 2 ? P.air : "transparent",
              transform: [{ rotate: "34deg" }],
            }}
          />
        ))}
      </View>

      {/* the stamp, pasted in its corner */}
      <View style={{ position: "absolute", right: 8, top: 13, width: 19, height: 23, borderWidth: 1.3, borderColor: P.post }} />

      {/* the address block — the one thing that differs */}
      <View style={{ position: "absolute", left: 12, bottom: 12, gap: 5 }}>
        {addressee ? (
          <MosaicId seed={addressee} cell={3.4} gap={1.1} />
        ) : (
          <>
            <View style={{ width: 42, height: 1.5, backgroundColor: P.ink12 }} />
            <View style={{ width: 54, height: 1.5, backgroundColor: P.ink12 }} />
            <View style={{ width: 34, height: 1.5, backgroundColor: P.ink12 }} />
          </>
        )}
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
