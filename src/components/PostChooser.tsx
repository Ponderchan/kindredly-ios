import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { WrenBird } from "./WrenBird";

/* WHO it's for — Wren asks it (design P1e).

   She is the one who carries letters, so she is the one who should ask where
   this one is going, and she asks in the FIRST PERSON: "I'll find who it's
   for", not "Wren finds who it's for". A character described in the third
   person on her own screen isn't a character, she's a feature.

   It lives in the tabs tree rather than in a Modal, and that's not incidental.
   A Modal is its own window: dismissing it drops you back to the app for a
   beat before the next screen arrives, which read as two separate animations
   with a flash of nothing between them. As a plain overlay it simply stays
   where it is, and the composer slides in from the right ON TOP of it — one
   continuous move forward. It clears itself once the slide is done.

   THE GROUND IS PAPER, not night. It used to be a deep navy with a spotlight
   on her, which made this the only dark surface between the pale onboarding
   console and the white app — a hole you fell through on the way to writing.
   It now stands on `P.penWash`, the app's own palest token and the same wash
   the EGG OS console uses, so the toy, this door and the paper app are one
   continuous world. Note that the colour is taken from theme/post directly:
   importing the EGG OS tokens here would blur two systems that are meant to
   stay separable, and the hue is an app token either way. */
export function PostChooser({ onClose }: { onClose: () => void }) {
  useLang();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // push first, clear after the slide — so the chooser is what the composer
  // slides over, and the app never reappears in between
  const go = (to: string) => {
    router.push(to);
    setTimeout(onClose, 420);
  };

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: P.penWash }}>
          {/* the light she stands in */}
          <Svg style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} width="100%" height="100%">
            <Defs>
              <RadialGradient id="wrenglow" cx="50%" cy="26%" r="52%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.85} />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#wrenglow)" />
          </Svg>

          <Pressable style={{ flex: 1 }} onPress={onClose}>
            <View style={{ flex: 1, alignItems: "center", paddingTop: insets.top + 64 }}>
              <Animated.View entering={FadeIn.duration(240)} style={{ alignItems: "center" }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 2.2, color: P.ink60 }}>
                  POST SOMETHING
                </Text>

                {/* One letter under each wing. They tuck UNDER her and sit low
                    — overlapping her face would hide the character doing the
                    asking, which is the entire point of this screen. */}
                <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 26 }}>
                  <View style={{ transform: [{ rotate: "-15deg" }], marginRight: -22, marginBottom: -4, zIndex: 0 }}>
                    <EnvelopeIcon k={0.8} />
                  </View>
                  {/* a flat disc with a hard ring, the way the reference has
                      her — the bare bird alone had no edge of her own once the
                      sticker keyline came off, so she dissolved into the wash
                      between two hard-edged objects */}
                  <View
                    style={{
                      zIndex: 2,
                      width: 94,
                      height: 94,
                      borderRadius: 47,
                      backgroundColor: P.paper,
                      borderWidth: 4,
                      borderColor: "#4A3FD9",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <WrenBird size={84} mood="curious" bare />
                  </View>
                  <View style={{ transform: [{ rotate: "14deg" }], marginLeft: -22, marginBottom: -4, zIndex: 0 }}>
                    <NotebookIcon k={0.8} />
                  </View>
                </View>

                <Text style={{ fontFamily: PF.serifItalic, fontSize: 21, color: P.ink, marginTop: 26, textAlign: "center" }}>
                  {t("pc.prompt")}
                </Text>
              </Animated.View>

              <View style={{ flex: 1 }} />

              <View style={{ alignSelf: "stretch", paddingHorizontal: 18, gap: 14, paddingBottom: 4 }}>
                <WrenChoice
                  title={t("pc.stranger")}
                  said={t("pc.strangerSaid")}
                  delay={140}
                  onPress={() => {
                    go("/compose");
                  }}
                >
                  <Tile><EnvelopeGlyph /></Tile>
                </WrenChoice>
                <WrenChoice
                  title={t("pc.yourself")}
                  said={t("pc.yourselfSaid")}
                  delay={220}
                  onPress={() => {
                    go("/journal-entry");
                  }}
                >
                  <Tile><NotebookGlyph /></Tile>
                </WrenChoice>
              </View>

              <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.2, color: P.ink40, marginTop: 22, marginBottom: Math.max(insets.bottom, 16) + 8 }}>
                TAP ANYWHERE TO GO BACK
              </Text>
            </View>
          </Pressable>
    </View>
  );
}

/* THE ROW GLYPHS. The wing illustrations below were drawn to work at 40pt as
   well as 100pt, so for a while the same pair did both jobs. At row size the
   detail stopped helping — two tiny full-colour objects competing with the
   text beside them — so the rows now carry line glyphs on a soft tile, which
   is what a list item wants: one weight, one colour, read in a glance. The
   illustrations keep the hero slot under her wings, where the detail is the
   point. */
function Tile({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#E7E4F8", alignItems: "center", justifyContent: "center" }}>
      {children}
    </View>
  );
}

/* ONE SET, TWO SHAPES. The pair used to be drawn to the same square, which
   made the envelope look starved and the notebook look fat: a letter is wide
   and a book is tall, so forcing both into 22x22 spent the width on nothing
   for one and cropped the other. They now get their own boxes at matched
   OPTICAL area — envelope 30x22, notebook 24x30 — on a common 48pt tile, and
   every stroke is 1.8. The viewBox equals the rendered size on both, so the
   numbers below are literal pixels rather than something to divide through.

   Both turn on OVERSHOOTS, traced from the owner's reference: the flap is two
   strokes that begin outside the top corners and stop short of meeting, so
   the V is drawn by the gap; the spine and the elastic run past the cover top
   and bottom the way a real bookmark and band do. Kept inside the outline
   they read as stripes printed on a card. */
const INK_BOOK = "#3B3178";
const INK_MAIL = "#4A3FD9";
const BAND = "#EDA53F";
const SW = 1.8;

function EnvelopeGlyph() {
  return (
    <Svg width={30} height={22} viewBox="0 0 30 22">
      <Rect x={3.6} y={6.2} width={22.8} height={14} rx={2.4} fill="none" stroke={INK_MAIL} strokeWidth={SW} />
      {/* THE GAP HAS TO CLEAR THE CAPS. Endpoints 1.8 apart looked joined,
          because a round cap adds half a stroke at each end — 0.9 + 0.9 is
          exactly 1.8, so the two caps met in the middle and closed the V that
          the gap is supposed to draw. 3.6 apart leaves a real 1.8 of air.
          They also start further outside the top corners, as the reference
          has them. */}
      <Path d="M1.0 2.6 L13.2 13.8" fill="none" stroke={INK_MAIL} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M29.0 2.6 L16.8 13.8" fill="none" stroke={INK_MAIL} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function NotebookGlyph() {
  return (
    <Svg width={24} height={30} viewBox="0 0 24 30">
      {/* The cover was 15.2 wide in a 24 box — a paperback stood on its end.
          The reference is close to square: its board runs about 80% of the
          glyph's width, so it does here too. */}
      <Rect x={2.6} y={3.4} width={18.8} height={23.2} rx={3} fill="none" stroke={INK_BOOK} strokeWidth={SW} />
      <Path d="M7.7 1.2 V28.8" stroke={INK_BOOK} strokeWidth={SW} strokeLinecap="butt" />
      <Path d="M15.8 1.6 V28.4" stroke={BAND} strokeWidth={SW} strokeLinecap="butt" />
    </Svg>
  );
}

/* FLAT MARKS. These were illustrations with depth — drop shadows at 0.45 and
   0.5, a page block down the notebook's fore-edge, fold seams in the flap, a
   postmark dot on a crooked stamp — and against the owner's reference that is
   exactly the gap: the reference is flat. No shadow, no layering, no rendering
   of thickness. Hard outline, one fill, one accent, and the tilt does all the
   depth there is.

   The rule for both: nothing here may imply a light source. */

/* a letter that leaves — cream, black outline, the dashed airmail border
   INSIDE it rather than striping all four edges, and one square stamp */
function EnvelopeIcon({ k = 1 }: { k?: number }) {
  const W = 112 * k;
  const H = 76 * k;
  const b = Math.max(1.6, 2.6 * k);
  return (
    <View style={{ width: W, height: H, backgroundColor: "#F4EEE0", borderWidth: b, borderColor: P.ink }}>
      {/* the airmail dashes, run as one inset frame */}
      <View
        style={{
          position: "absolute",
          left: 7 * k,
          right: 7 * k,
          top: 7 * k,
          bottom: 7 * k,
          borderWidth: Math.max(1.2, 2 * k),
          borderColor: P.post,
          borderStyle: "dashed",
        }}
      />
      {/* the flap, two straight strokes meeting at the fold */}
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute" }}>
        <Path
          d={`M${16 * k} ${16 * k} L${W / 2} ${H * 0.58} L${W - 16 * k} ${16 * k}`}
          fill="none"
          stroke={P.ink}
          strokeWidth={b}
          strokeLinejoin="miter"
        />
      </Svg>
      {/* the stamp: an outline, no postmark — a mark, not a picture */}
      <View
        style={{
          position: "absolute",
          right: 13 * k,
          top: 11 * k,
          width: 20 * k,
          height: 20 * k,
          borderWidth: Math.max(1.2, 2 * k),
          borderColor: P.post,
        }}
      />
    </View>
  );
}

/* a notebook that stays — one navy block, one gold band, one inset frame */
function NotebookIcon({ k = 1 }: { k?: number }) {
  const W = 84 * k;
  const H = 100 * k;
  const b = Math.max(1.6, 2.6 * k);
  return (
    <View style={{ width: W, height: H, backgroundColor: "#3B3178", borderWidth: b, borderColor: P.ink }}>
      <View
        style={{
          position: "absolute",
          left: 9 * k,
          right: 9 * k,
          top: 9 * k,
          bottom: 9 * k,
          borderWidth: Math.max(1, 1.6 * k),
          borderColor: "rgba(255,255,255,0.28)",
        }}
      />
      {/* the elastic, snapped round the whole cover */}
      <View style={{ position: "absolute", right: 17 * k, top: -b, bottom: -b, width: 11 * k, backgroundColor: BAND }} />
    </View>
  );
}

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
          backgroundColor: pressed ? P.penWash : P.paper,
          borderWidth: 1,
          borderColor: P.ink,
          paddingHorizontal: 20,
          paddingVertical: 13,
        })}
      >
        {children}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 17, fontWeight: "600", color: P.ink }}>{title}</Text>
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 13, color: P.ink60, marginTop: 2 }}>{said}</Text>
        </View>
        <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink40 }}>›</Text>
      </Pressable>
    </Animated.View>
  );
}
