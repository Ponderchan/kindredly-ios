import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { Finger, Rise, useLoop, useOnce, type Reel } from "../guide-reel/kit";
import { WrenBird } from "../WrenBird";
import { MosaicId } from "../MosaicId";
import { P, PF } from "../../theme/post";
import { t } from "../../lib/i18n";
import { localeTag } from "../../lib/format";
import { lineText } from "../../lib/local-push";
import { useWrenName } from "../../lib/wren-name";

/* WHAT'S NEW IN 1.0.4, AS A REEL (owner, 2026-10-13: the what's-new plays
   in Wren's room itself from this version on). Three scenes, drawn at the
   square's own size from the product's parts, in the reader's language:
     1. Their turn, folded: the pen pals waiting on the other side shrink
        into one narrow row of faces under the one that's on you.
     2. Two switches: a column of nine fades and two are left — the knock,
        and Notifications.
     3. Her day off: noon on the lock screen, her invite (the real line),
        a tap, and she's off between the pillars.
   Curves are module constants: a hook listing a fresh Easing in its deps
   would restart on every re-render. */

const E_OUT = Easing.out(Easing.cubic);
const E_IN = Easing.in(Easing.quad);
const CLAMP = Extrapolation.CLAMP;
const LINE = "rgba(17,17,19,0.14)";
const BAR = "rgba(17,17,19,0.16)";

const sentence = (x: string) => {
  const low = x.toLocaleLowerCase(localeTag());
  return low.charAt(0).toLocaleUpperCase(localeTag()) + low.slice(1);
};

function Face({ d, seed, ring }: { d: number; seed: string; ring?: boolean }) {
  const cell = d * 0.086;
  return (
    <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: "#F1F0F8", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: ring ? 2 : 0, borderColor: "#FFFFFF" }}>
      <MosaicId seed={seed} cell={cell} gap={cell * 0.27} develop={0.6} />
    </View>
  );
}

/* ── 1 · their turn, folded ─────────────────────────────────────────── */
function Fold({ s }: { s: number }) {
  const rowH = s * 0.155;
  const face = rowH * 0.62;
  const shrink = useOnce(520, 1500, E_IN);
  const grow = useOnce(460, 1950, E_OUT);
  const going = useAnimatedStyle(() => ({ height: rowH * (1 - shrink.value), opacity: 1 - shrink.value }));
  const coming = useAnimatedStyle(() => ({ opacity: grow.value, transform: [{ translateY: (1 - grow.value) * 10 }] }));
  const label = `${sentence(t("state.waitingThem"))} · 2`;
  const Row = ({ seed, last, children }: { seed: string; last?: boolean; children: ReactNode }) => (
    <View style={{ height: rowH, flexDirection: "row", alignItems: "center", gap: s * 0.035, paddingHorizontal: s * 0.04, borderBottomWidth: last ? 0 : 1, borderBottomColor: LINE }}>
      <Face d={face} seed={seed} />
      <View style={{ flex: 1, gap: 6 }}>{children}</View>
    </View>
  );
  return (
    <View style={{ width: s, height: s, justifyContent: "center", paddingHorizontal: s * 0.07 }}>
      <Rise>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden" }}>
          <Row seed="news-104-a">
            <Text style={{ fontSize: s * 0.045, fontWeight: "600", color: P.ink }}>No. 4417</Text>
            {/* a pen pal on you says so in words, as the list does (owner, 2026-10-15) */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: s * 0.03, fontWeight: "600", letterSpacing: 0.3, color: "#3A34D6" }}>{t("state.yourTurn").toUpperCase()}</Text>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: BAR }} />
            </View>
          </Row>
          {(["news-104-b", "news-104-c"] as const).map((seed) => (
            <Animated.View key={seed} style={[{ overflow: "hidden" }, going]}>
              <Row seed={seed}>
                <Text style={{ fontSize: s * 0.045, fontWeight: "600", color: P.ink }}>No. {seed.endsWith("b") ? "2093" : "6158"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: s * 0.032, color: P.ink }}>{t("mm.you")}:</Text>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: BAR }} />
                </View>
              </Row>
            </Animated.View>
          ))}
          <Animated.View style={[{ height: rowH * 0.78, flexDirection: "row", alignItems: "center", gap: s * 0.03, paddingHorizontal: s * 0.04, borderTopWidth: 1, borderTopColor: LINE }, coming]}>
            <View style={{ flexDirection: "row" }}>
              <Face d={face * 0.72} seed="news-104-b" ring />
              <View style={{ marginLeft: -face * 0.2 }}>
                <Face d={face * 0.72} seed="news-104-c" ring />
              </View>
            </View>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: s * 0.036, fontWeight: "600", color: "#8A86A3" }}>{label}</Text>
            <Text style={{ fontSize: s * 0.042, fontWeight: "600", color: "#8A86A3" }}>›</Text>
          </Animated.View>
        </View>
      </Rise>
    </View>
  );
}

/* ── 2 · two switches ───────────────────────────────────────────────── */
function Switch({ s, on }: { s: number; on: boolean }) {
  const w = s * 0.12;
  const h = w * 0.6;
  return (
    <View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: on ? P.pen : "#D8D8D6", justifyContent: "center", paddingHorizontal: 2 }}>
      <View style={{ width: h - 4, height: h - 4, borderRadius: (h - 4) / 2, backgroundColor: "#FFFFFF", alignSelf: on ? "flex-end" : "flex-start" }} />
    </View>
  );
}

function Switches({ s }: { s: number }) {
  const fold = useOnce(480, 1500, E_IN);
  const two = useOnce(460, 1950, E_OUT);
  const nine = useAnimatedStyle(() => ({ opacity: 1 - fold.value, transform: [{ scaleY: interpolate(fold.value, [0, 1], [1, 0.2], CLAMP) }] }));
  const left = useAnimatedStyle(() => ({ opacity: two.value, transform: [{ translateY: (1 - two.value) * 12 }] }));
  const cardH = s * 0.62;
  const Line = ({ title, on, last }: { title: string; on: boolean; last?: boolean }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: s * 0.03, paddingVertical: s * 0.045, borderBottomWidth: last ? 0 : 1, borderBottomColor: LINE }}>
      <Text numberOfLines={1} style={{ flex: 1, fontSize: s * 0.05, color: P.ink }}>{title}</Text>
      <Switch s={s} on={on} />
    </View>
  );
  return (
    <View style={{ width: s, height: s, justifyContent: "center", paddingHorizontal: s * 0.07 }}>
      <View style={{ height: cardH, backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: s * 0.05, overflow: "hidden" }}>
        <Animated.View style={[{ position: "absolute", left: s * 0.05, right: s * 0.05, top: cardH * 0.06, gap: cardH * 0.025 }, nine]}>
          {Array.from({ length: 9 }, (_, n) => (
            <Rise key={n} delay={n * 70} dy={6}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: s * 0.03, height: cardH * 0.07 }}>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: BAR, marginRight: (n % 3) * s * 0.05 }} />
                <View style={{ transform: [{ scale: 0.6 }] }}>
                  <Switch s={s} on={n % 4 === 1} />
                </View>
              </View>
            </Rise>
          ))}
        </Animated.View>
        <Animated.View style={[{ flex: 1, justifyContent: "center" }, left]}>
          <Line title={t("set.notify.title")} on />
          <Line title={t("set.knock.title")} on={false} last />
        </Animated.View>
      </View>
    </View>
  );
}

/* ── 3 · her day off ─────────────────────────────────────────────────── */
const TAP = 2200;
function DayOff({ s }: { s: number }) {
  const wren = useWrenName();
  const line = lineText("day_off_invite", 0) ?? "";
  const pop = useOnce(420, 450, E_OUT);
  const away = useOnce(380, TAP + 260, E_IN);
  const fly = useOnce(1900, TAP + 500, Easing.linear);
  const bob = useLoop(420, TAP + 500);
  const note = useAnimatedStyle(() => ({ opacity: pop.value * (1 - away.value), transform: [{ translateY: (1 - pop.value) * -14 }, { scale: 1 - 0.06 * away.value }] }));
  const game = useAnimatedStyle(() => ({ opacity: interpolate(fly.value, [0, 0.08], [0, 1], CLAMP) }));
  const hand = useAnimatedStyle(() => ({ opacity: 1 - away.value }));
  const pillarA = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(fly.value, [0, 1], [s * 0.45, -s * 0.45]) }] }));
  const pillarB = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(fly.value, [0, 1], [s * 0.85, -s * 0.05]) }] }));
  const bird = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(bob.value, [0, 1], [-s * 0.025, s * 0.025]) }] }));
  const pw = s * 0.12;
  /* a phone's lock screen inside the square, so the reel's bars stay on a light ground */
  const sw = s * 0.8, sh = s * 0.82, sx = (s - sw) / 2, sy = s * 0.12;
  return (
    <View style={{ width: s, height: s }}>
      <View style={{ position: "absolute", left: sx, top: sy, width: sw, height: sh, borderRadius: sw * 0.09, backgroundColor: "#1E1B35", overflow: "hidden" }}>
        <Text style={{ position: "absolute", top: sh * 0.1, left: 0, right: 0, textAlign: "center", fontSize: s * 0.14, fontWeight: "300", color: "#FFFFFF", letterSpacing: -1 }}>12:00</Text>
        <Animated.View style={[{ position: "absolute", left: sw * 0.05, right: sw * 0.05, top: sh * 0.4, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.92)", padding: s * 0.03, flexDirection: "row", gap: s * 0.025, alignItems: "center" }, note]}>
          <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.022, backgroundColor: P.penWash, alignItems: "center", justifyContent: "center" }}>
            <WrenBird size={s * 0.08} mood="happy" />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: s * 0.038, fontWeight: "600", color: P.ink }}>{wren}</Text>
            <Text numberOfLines={2} style={{ fontSize: s * 0.038, color: P.ink }}>{line}</Text>
          </View>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: sw, height: sh, backgroundColor: "#8FCBFF", overflow: "hidden" }, game]}>
          <Animated.View style={[{ position: "absolute", top: 0, width: pw, height: sh * 0.32, backgroundColor: "#7CC47F", borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }, pillarA]} />
          <Animated.View style={[{ position: "absolute", bottom: 0, width: pw, height: sh * 0.36, backgroundColor: "#7CC47F", borderTopLeftRadius: 6, borderTopRightRadius: 6 }, pillarA]} />
          <Animated.View style={[{ position: "absolute", top: 0, width: pw, height: sh * 0.22, backgroundColor: "#7CC47F", borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }, pillarB]} />
          <Animated.View style={[{ position: "absolute", bottom: 0, width: pw, height: sh * 0.46, backgroundColor: "#7CC47F", borderTopLeftRadius: 6, borderTopRightRadius: 6 }, pillarB]} />
          <Animated.View style={[{ position: "absolute", left: sw * 0.18, top: sh * 0.4 }, bird]}>
            <WrenBird size={s * 0.18} pose="fly" mood="happy" letter={false} />
          </Animated.View>
        </Animated.View>
      </View>
      {/* the finger taps the invite, then goes with it */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, hand]}>
        <Finger x={s * 0.5} y={sy + sh * 0.5} at={TAP} />
      </Animated.View>
    </View>
  );
}

export const reel: Reel = {
  bg: P.penWash,
  scenes: [
    { key: "fold", ms: 4200, render: (s) => <Fold s={s} /> },
    { key: "switches", ms: 4000, render: (s) => <Switches s={s} /> },
    { key: "dayoff", ms: 4800, render: (s) => <DayOff s={s} /> },
  ],
};
