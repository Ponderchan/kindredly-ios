import { useWrenName } from "../lib/wren-name";
import { useCallback, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF } from "../theme/post";
import { DashedRule, DottedRule, L, Stamp, dear, letterPS } from "../components/AuraCard";
import { WrenBird } from "../components/WrenBird";
import { getAvatar } from "../data/avatar-lib";
import { myAura, type Aura } from "../lib/aura";
import { useAuth } from "../lib/auth";

/* The share card IS the letter — the same sheet the Me tab carries,
   compacted to one screenshot, travelling through the night the way
   every letter in this world does. The old orb card ran on the retired
   voice engine and could disagree with the letter about your own name;
   one artifact, one engine, one name.

   Chrome stays at the very edges (✕ / Share / screenshot to keep / Done)
   so a screenshot crops clean. The wordmark rides UNDER the sheet — if
   it's cropped away, the letter still says who carried it. */

const INK = "#12101F";

export default function AuraShareCard() {
  const router = useRouter();
  const wren = useWrenName();
  const { user, profile } = useAuth();
  const [aura, setAura] = useState<Aura | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      myAura((profile?.firstLine as string) || null).then((a) => alive && setAura(a));
      return () => {
        alive = false;
      };
    }, [profile?.firstLine]),
  );

  const done = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"));
  const pct = aura ? Math.round(aura.formed * 100) : 0;
  const shareText = () =>
    aura &&
    Share.share({
      message:
        aura.phase === "formed"
          ? `Dear ${dear(aura.archetype?.name || "")} — the letter ${wren} wrote about me, on Kindredly.`
          : `${pct}% written — ${wren} is still writing my letter, on Kindredly.`,
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: INK }}>
      {/* the night, softly starred — the sky every letter crosses */}
      <Svg pointerEvents="none" style={{ position: "absolute", top: 0, left: 0 }} width={402} height={874} viewBox="0 0 402 874">
        {[
          [42, 120, 1.6, 0.5], [340, 90, 1.2, 0.4], [300, 210, 1.8, 0.55], [70, 320, 1.2, 0.35],
          [360, 400, 1.4, 0.45], [30, 540, 1.5, 0.4], [330, 640, 1.2, 0.35], [90, 730, 1.6, 0.5], [250, 800, 1.2, 0.4],
        ].map(([x, y, r, o], i) => (
          <Circle key={i} cx={x} cy={y} r={r} fill="#8F87C9" opacity={o} />
        ))}
      </Svg>

      <Pressable onPress={done} hitSlop={10} style={{ position: "absolute", right: 14, top: 58, width: 36, height: 36, alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}>✕</Text>
      </Pressable>

      {aura && (
        <Animated.View entering={FadeIn.duration(420)} style={{ flex: 1, justifyContent: "space-between", paddingTop: 64, paddingBottom: 10 }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ShareLetter aura={aura} wren={wren} seed={user?.id || "you"} avatarId={(profile?.avatarId as string) || null} />

            {/* under the sheet, in the night — crops away clean */}
            <View style={{ alignItems: "center", gap: 7, marginTop: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <WrenBird size={20} bare mood="content" />
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 12.5, color: "#8F87C9" }}>Carried by {wren}</Text>
              </View>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 3.5, color: "rgba(255,255,255,0.65)" }}>KINDREDLY</Text>
            </View>
          </View>

          {/* dim actions at the very edge — easy to crop out */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 26, paddingTop: 10 }}>
            <Pressable onPress={shareText} hitSlop={8}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Share</Text>
            </Pressable>
            <Text style={{ fontFamily: PF.mono, fontSize: 12, color: "rgba(255,255,255,0.28)" }}>screenshot to keep</Text>
            <Pressable onPress={done} hitSlop={8}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

/* the letter, compacted to fit one screenshot — same palette, same stamp,
   same engine lines as the Me-tab card, none of its interactivity */
function ShareLetter({ aura, wren, seed, avatarId }: { aura: Aura; wren: string; seed: string; avatarId: string | null }) {
  const stage = aura.phase;
  const formed = stage === "formed";
  const pct = Math.round(aura.formed * 100);
  const lines = [...aura.locked].sort((a, b) => b.score - a.score);
  const rereading = stage === "clearing" && lines.length === 9;
  const ps = letterPS(aura);
  // nine wrapped lines must still fit the frame — the hand shrinks a step
  const hand = lines.length >= 7 ? 15.5 : 17.5;

  const fromLine = stage === "empty" ? "UNWRITTEN" : formed ? "FINISHED" : `${pct}% WRITTEN`;
  const fromColor = stage === "empty" ? L.pencil : formed ? P.post : P.pen;

  return (
    <View
      style={{
        marginHorizontal: 30,
        backgroundColor: L.paper,
        borderWidth: 1,
        borderColor: P.ink,
        borderBottomWidth: formed ? 4 : 1,
        borderBottomColor: formed ? P.post : P.ink,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
      }}
    >
      <View style={{ paddingRight: 80 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.8, color: "#79715E" }}>
          A LETTER ABOUT YOU
        </Text>
        <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.6, color: fromColor, marginTop: 5 }}>
          FROM {wren.toUpperCase()} · {fromLine}
        </Text>
      </View>
      <View style={{ position: "absolute", top: 12, right: 12 }}>
        <Stamp seed={seed} stage={stage} pct={pct} formedOn={aura.formedOn} pool={getAvatar(avatarId)?.pool ?? null} topDimKey={lines[0]?.key ?? null} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 10 }}>
        <Text style={{ fontFamily: PF.handSemi, fontSize: 30, color: L.ink }}>Dear</Text>
        {formed ? (
          <Text style={{ fontFamily: PF.handSemi, fontSize: 29, color: P.pen, marginLeft: 9 }}>
            {dear(aura.archetype?.name || "")}
          </Text>
        ) : (
          <View style={{ width: 104, marginLeft: 9, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#B4AC98", alignItems: "center" }}>
            <Text style={{ fontFamily: PF.hand, fontSize: 15, color: stage === "clearing" ? "#8F82C8" : L.pencil }}>
              {stage === "shaping" ? "soon" : stage === "clearing" ? "almost..." : " "}
            </Text>
          </View>
        )}
        <Text style={{ fontFamily: PF.handSemi, fontSize: 30, color: L.ink, marginLeft: 7 }}>,</Text>
      </View>

      {stage === "empty" ? (
        <>
          <Text style={{ fontFamily: PF.hand, fontSize: 20, lineHeight: 27, color: L.ink, marginTop: 10 }}>
            We haven't met on paper yet.
          </Text>
          {[0, 1, 2].map((i) => (
            <DottedRule key={i} style={{ marginTop: 24 }} />
          ))}
          <Text style={{ fontFamily: PF.hand, fontSize: 18, color: "#7C7462", marginTop: 20 }}>
            — I'll start the moment you do.
          </Text>
        </>
      ) : (
        <>
          <View style={{ marginTop: 2 }}>
            {lines.map((d) => (
              <Text key={d.key} style={{ fontFamily: PF.hand, fontSize: hand, lineHeight: hand * 1.32, color: L.ink, marginTop: 7 }}>
                {d.line}
              </Text>
            ))}
            {formed ? (
              <Text style={{ fontFamily: PF.hand, fontSize: hand, lineHeight: hand * 1.32, color: L.ink, marginTop: 11 }}>
                That's who I've been writing to, all this time.
              </Text>
            ) : stage === "clearing" && !rereading ? (
              <Text style={{ fontFamily: PF.hand, fontSize: hand, color: P.pen, marginTop: 10 }}>
                one more thing and I can name you —
              </Text>
            ) : !rereading ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontFamily: PF.hand, fontSize: 13.5, color: L.pencil, textAlign: "right", marginBottom: 2 }}>
                  (next letter...)
                </Text>
                <DottedRule />
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 14 }}>
            <Text style={{ flex: 1, fontFamily: PF.hand, fontSize: formed ? 21 : 17, color: formed ? L.ink : "#7C7462" }}>
              {formed
                ? `yours, ${wren}`
                : rereading
                  ? `I have it. Let me read you once more to be sure. — ${wren[0]}.`
                  : stage === "clearing"
                    ? `— so close, ${wren}`
                    : `— still writing, ${wren}`}
            </Text>
            <WrenBird size={22} bare mood={formed ? "delight" : "content"} />
          </View>

          {ps && (
            <Text style={{ fontFamily: PF.hand, fontSize: 14.5, color: L.pencil, marginTop: 7 }}>
              {ps}
            </Text>
          )}
        </>
      )}

      <View style={{ marginTop: 11 }}>
        <DashedRule />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 8.5, letterSpacing: 1.7, color: "#8A8270" }}>
            {formed
              ? `FORMED FROM ${aura.pieces} PIECES`
              : stage === "empty"
                ? "NO DATA YET"
                : stage === "forming"
                  ? "STILL FORMING"
                  : stage === "shaping"
                    ? "TAKING SHAPE"
                    : "COMING CLEAR"}
          </Text>
          <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 1.3, color: "#8A8270" }}>
            {formed
              ? "SHE KEEPS WRITING"
              : stage === "empty"
                ? "WAITING ON YOU"
                : rereading
                  ? "RE-READING YOU"
                  : `${lines.length} OF 9 LINES`}
          </Text>
        </View>
      </View>
    </View>
  );
}
