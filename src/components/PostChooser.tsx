import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
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

                <Text style={{ fontFamily: PF.serifItalic, fontSize: 21, color: P.ink, marginTop: 26, textAlign: "center" }}>
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
                    go("/compose");
                  }}
                >
                  <EnvelopeIcon k={0.42} />
                </WrenChoice>
                <WrenChoice
                  title="To yourself"
                  said="I'll keep it for later"
                  delay={220}
                  onPress={() => {
                    go("/journal-entry");
                  }}
                >
                  <NotebookIcon k={0.42} />
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
          backgroundColor: pressed ? P.penWash : P.paper,
          borderWidth: 1,
          borderColor: P.ink,
          paddingHorizontal: 14,
          paddingVertical: 14,
        })}
      >
        {children}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 17, fontWeight: "600", color: P.ink }}>{title}</Text>
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 14, color: P.ink60, marginTop: 3 }}>{said}</Text>
        </View>
        <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink40 }}>›</Text>
      </Pressable>
    </Animated.View>
  );
}
