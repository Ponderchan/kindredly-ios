import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  SlideInDown,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { StampTray } from "../../../components/ComposeTray";
import { Stamp } from "../../../components/Stamp";
import { getStamp, sname } from "../../../data/stamps";
import { starterStamp } from "../../../lib/hatch-engine";
import { t } from "../../../lib/i18n";
import { ScreenFrame, nestTop } from "../parts/frame";
import { NEST_EGG } from "../parts/nest-egg";
import * as haptics from "../parts/haptics";
import { AcidKey, GhostKey, TextKey } from "../parts/keys";
import { EDGE, FONT, GUTTER, OB, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { ENV_CORNER, ENV_H, ENV_W, EnvelopeFront } from "./s08-envelope";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* SCREEN 8 · YOUR FIRST STAMP (+ 8a, today's tray) — storyboard §6 · 8.
   ────────────────────────────────────────────────────────────────────────
   Back on the blue (the letter folded itself into the envelope on 7), the
   egg waiting in its nest ("waiting."). A big v2 stamp floats at the Me
   size (80 × 96): the one the letter suggests (lib/hatch-engine
   starterStamp — the same suggestion finish() falls back to), its name
   big and lower case as the tray writes it, and under it your envelope
   front from 6 (s08-envelope: your frost window, your courier name, ♀/♂
   and the sign, the date) with its stamp corner glowing, empty — the same
   corner the launch's mark filled on screen 1. A dotted line says where
   the stamp goes.

   "STICK IT ON": the stamp shrinks onto the corner on the same short arc
   the launch's mark took on 1 (440 ms, the mark's 120 → 560 window), and
   lands with THE SAME THUNK — the launch crack's light impact
   (parts/haptics thunk), the envelope dips 3pt and back in 120 ms, and the
   stamp settles at its small tilt (±2°). No postmark (the owner dropped
   the wavy cancellation on 2026-10-18). Screen 1's stamp was the app's;
   this one is yours. 600 ms after the thunk the run moves on by itself
   (advance({ stamp })): there is no "hand it over" tap — the stamped
   envelope shrinks and flies up into the nest egg (the old run's feed
   motion) and 9 opens on that egg. Reduce Motion: no flight and no feed —
   the big stamp fades, the corner fills, the thunk, then on.

   "PICK ANOTHER" opens 8a: today's tray, the compose page's own StampTray
   (the stamps this letter suggests, then all thirty-six in their six
   categories), in a sheet over the dimmed blue. A pick puts that stamp up
   big instead (draft.stamp) and closes the sheet; nothing is stuck on
   until "Stick it on". ‹ goes back to the letter with everything kept. */

const BIG = 80; // the Me size: 80 × 96
const BIG_TILT = -4;
const ENV_TILT = -2;

type Box = { cx: number; cy: number; w: number };

/** the envelope's smallest width, and the room that keeps (its slot never gets less) */
const ENV_MIN_W = 150;
const ENV_MIN_H = Math.ceil(ENV_MIN_W * (ENV_H / ENV_W)) + 6;

export default function S08Stamp(props: ObScreenProps) {
  const { draft } = props;
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const suggested = starterStamp(null, draft.letter);
  const shown = draft.stamp ?? suggested;
  const name = (sname(getStamp(shown)?.name) || shown).toLowerCase();

  const rootRef = useRef<View>(null);
  const bigRef = useRef<View>(null);
  const cornerRef = useRef<View>(null);
  const [envBox, setEnvBox] = useState({ w: 0, h: 0 });
  const [line, setLine] = useState<{ from: Box; to: Box } | null>(null);
  const [phase, setPhase] = useState<"idle" | "flying" | "landed">("idle");
  const [flight, setFlight] = useState<{ from: Box; to: Box } | null>(null);
  const busy = phase !== "idle";

  /* the envelope as big as its room allows, never past the design size by more than a little */
  const { width: winW } = useWindowDimensions();
  const envW = Math.max(ENV_MIN_W, Math.min(winW - 2 * GUTTER - 6, envBox.w || ENV_W, ((envBox.h || ENV_H) - 6) * (ENV_W / ENV_H)));

  /* where things are on the window (the run's screens fill it; the root is measured anyway) */
  const measure = (ref: React.RefObject<View | null>) =>
    new Promise<{ x: number; y: number; w: number; h: number } | null>((res) => {
      const n = ref.current;
      if (!n) return res(null);
      n.measureInWindow((x, y, w, h) => res(w > 0 ? { x, y, w, h } : null));
    });
  const boxes = async (): Promise<{ from: Box; to: Box } | null> => {
    const [root, big, corner] = await Promise.all([measure(rootRef), measure(bigRef), measure(cornerRef)]);
    if (!root || !big || !corner) return null;
    const s = envW / ENV_W;
    return {
      from: { cx: big.x - root.x + big.w / 2, cy: big.y - root.y + big.h / 2, w: BIG },
      to: { cx: corner.x - root.x + corner.w / 2, cy: corner.y - root.y + corner.h / 2, w: ENV_CORNER.w * s },
    };
  };

  /* the dotted line from the stamp to its corner, once both are laid out */
  useEffect(() => {
    if (!envBox.w) return;
    const id = setTimeout(() => void boxes().then((b) => b && setLine(b)), 260);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envBox.w, envBox.h, envW]);

  /* the big stamp floats a little while it waits */
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    float.value = withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })), -1, false);
  }, [reduce, float]);
  const bigFade = useSharedValue(1);
  const bigStyle = useAnimatedStyle(() => ({ opacity: bigFade.value, transform: [{ translateY: -3 + float.value * 6 }, { rotate: `${BIG_TILT}deg` }] }));

  /* the flight and the landing */
  const p = useSharedValue(0);
  const dip = useSharedValue(0);
  /* the way out: the stamped envelope shrinks and flies up into the nest egg (the old run's feed
     motion), and the egg takes it to 9 */
  const envRef = useRef<View>(null);
  const feed = useSharedValue(0);
  const [feedDy, setFeedDy] = useState(0);
  const envStyle = useAnimatedStyle(() => ({
    opacity: 1 - feed.value * 0.85,
    transform: [{ translateY: dip.value * 3 + feed.value * feedDy }, { scale: 1 - feed.value * 0.9 }],
  }), [feedDy]);
  const restStyle = useAnimatedStyle(() => ({ opacity: 1 - feed.value }));

  const handOver = async () => {
    const go = () => props.advance({ stamp: shown });
    if (reduce) return go();
    const [root, env] = await Promise.all([measure(rootRef), measure(envRef)]);
    if (!root || !env) return go();
    setFeedDy(nestTop(insets.top) + NEST_EGG / 2 - (env.y - root.y + env.h / 2));
    feed.value = withTiming(1, { duration: 380, easing: Easing.in(Easing.quad) }, (fin) => {
      if (fin) runOnJS(go)();
    });
  };

  const landed = () => {
    setPhase("landed");
    haptics.thunk();
    dip.value = withSequence(withTiming(1, { duration: 60, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 60, easing: Easing.in(Easing.quad) }));
    setTimeout(() => void handOver(), 600);
  };

  const stickItOn = async () => {
    if (busy || !props.canAdvance) return;
    if (reduce) {
      setPhase("flying");
      bigFade.value = withTiming(0, { duration: 160 });
      setTimeout(landed, 160);
      return;
    }
    const b = await boxes();
    if (!b) {
      // nothing measurable (a layout race): land it without the flight rather than not at all
      setPhase("flying");
      bigFade.value = 0;
      landed();
      return;
    }
    setFlight(b);
    setPhase("flying");
    bigFade.value = 0;
    p.value = 0;
    p.value = withTiming(1, { duration: 440, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(landed)();
    });
  };

  const fly = useAnimatedStyle(() => {
    if (!flight) return { opacity: 0 };
    const { from, to } = flight;
    const e = p.value;
    const x = from.cx + (to.cx - from.cx) * e;
    const y = from.cy + (to.cy - from.cy) * e - Math.sin(Math.PI * e) * 26; // the short arc
    const sc = 1 + (to.w / BIG - 1) * e;
    return {
      opacity: 1,
      transform: [{ translateX: x - BIG / 2 }, { translateY: y - (BIG * 1.2) / 2 }, { scale: sc }, { rotate: `${BIG_TILT * (1 - e)}deg` }],
    };
  }, [flight]);

  const onEnvLayout = (e: LayoutChangeEvent) => setEnvBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View ref={rootRef} collapsable={false} style={{ flex: 1 }}>
      <ScreenFrame
        ground="blue"
        back={busy ? null : props.back}
        nest
        scroll
        primary={<AcidKey label={t("ob2.stamp.key")} onPress={() => void stickItOn()} disabled={!props.canAdvance} />}
        secondary={<GhostKey label={t("ob2.stamp.another")} onPress={() => !busy && props.openSide("tray")} on="blue" style={{ height: 44, alignSelf: "stretch" }} />}
      >
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: OB.white, textAlign: "center" }]}>{t("ob2.stamp.eyebrow")}</Text>
          <Animated.View ref={bigRef} collapsable={false} style={[bigStyle, { marginTop: 12 }]} accessible accessibilityRole="image" accessibilityLabel={name}>
            <Stamp id={shown} width={BIG} dark={false} />
          </Animated.View>
          {/* never shorter than the smallest envelope (150 wide): where the room runs out (an SE at a
              large text size) the body scrolls rather than the envelope spilling over the big stamp
              above and under the white stamp name below */}
          <View style={{ flex: 1, minHeight: ENV_MIN_H, alignSelf: "stretch", alignItems: "center", justifyContent: "center", marginVertical: 8 }} onLayout={onEnvLayout}>
            {envBox.w > 0 && (
              <Animated.View ref={envRef} collapsable={false} style={envStyle}>
                <EnvelopeFront
                  uid={props.uid}
                  lang={props.lang}
                  pronoun={draft.pronoun}
                  showMark={draft.showMark}
                  showSign={draft.showSign}
                  dob={draft.dob}
                  now={props.now()}
                  stamp={shown}
                  corner={phase === "landed" ? "filled" : phase === "flying" ? "empty" : "glow"}
                  width={envW}
                  tilt={ENV_TILT}
                  cornerRef={cornerRef}
                />
              </Animated.View>
            )}
          </View>
          <Animated.View style={[restStyle, { alignItems: "center" }]}>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[TYPE.headline, { color: OB.white, textAlign: "center", fontSize: 31, lineHeight: 36 }]}>
              {name}
            </Text>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8} style={[TYPE.lineSmall, { color: OB.white, textAlign: "center", marginTop: 6, marginBottom: 4 }]}>
              {/* "picked from what you wrote" stops being true once they chose another from the tray */}
              {t(draft.stamp && draft.stamp !== suggested ? "ob2.stamp.linePicked" : "ob2.stamp.line")}
            </Text>
          </Animated.View>
        </View>
      </ScreenFrame>

      {/* the dotted way from the stamp to its corner */}
      {line && phase === "idle" && <DottedWay from={line.from} to={line.to} />}

      {/* the stamp in flight */}
      {flight && phase === "flying" && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, fly]}>
          <Stamp id={shown} width={BIG} dark={false} />
        </Animated.View>
      )}

      {props.side === "tray" && (
        <TraySheet
          selected={shown}
          suggested={suggested}
          bottom={insets.bottom}
          onPick={(id) => {
            props.set({ stamp: id });
            props.closeSide();
          }}
          onClose={props.closeSide}
        />
      )}
    </View>
  );
}

/** A dashed white curve from under the big stamp to the corner's top. */
function DottedWay({ from, to }: { from: Box; to: Box }) {
  const x0 = from.cx + from.w * 0.42;
  const y0 = from.cy + from.w * 0.5;
  const x1 = to.cx;
  const y1 = to.cy - to.w * 0.7;
  if (y1 - y0 < 12) return null;
  const cx = Math.max(x0, x1) + 18;
  const cy = (y0 + y1) / 2;
  return (
    <Svg pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      <Path d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`} fill="none" stroke={OB.white} strokeWidth={2.5} strokeDasharray="1 7" strokeLinecap="round" />
    </Svg>
  );
}

/** 8a: today's tray in a sheet over the dimmed blue. */
function TraySheet({ selected, suggested, bottom, onPick, onClose }: { selected: string; suggested: string; bottom: number; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: OB.scrim, justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("ob2.stamp.trayDone")} />
        <Animated.View
          entering={SlideInDown.duration(280).easing(Easing.out(Easing.cubic))}
          style={{ backgroundColor: OB.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: EDGE, borderBottomWidth: 0, borderColor: OB.ink, paddingBottom: bottom, overflow: "hidden" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: GUTTER, paddingRight: 8, paddingTop: 10, paddingBottom: 4 }}>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" style={{ ...FONT.head, fontSize: 19, letterSpacing: -0.4, color: OB.ink }}>
              {t("ob2.stamp.trayHead")}
            </Text>
            <TextKey label={t("ob2.stamp.trayDone")} on="paper" onPress={onClose} />
          </View>
          <StampTray selected={selected} suggested={[suggested]} onPick={onPick} />
        </Animated.View>
      </View>
    </Modal>
  );
}
