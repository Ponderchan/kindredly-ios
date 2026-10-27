import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { RNHostView } from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import { KFirstFlightView, KIsland, KSlot, type KFirstFlightCurves } from "../../modules/kindredly-ui";
import { SurfaceHost } from "./NativeSurface";
import { WrenBird, type WrenMood } from "./WrenBird";
import type { FirstFlightProps } from "./FirstFlight";
import {
  FLIGHT_CURVES,
  FLIGHT_H,
  FLIGHT_TOTAL,
  FLIGHT_W,
  FLY0,
  FLY1,
  HOME,
  LOOP_D,
  STOPS,
  TRAIL,
  birdTrack,
  envelopeTrack,
  flightPoints,
  stopStamp,
  stopTimesMs,
  stopWords,
} from "./first-flight-model";
import { letterFitLines, letterFitSize } from "../theme/post";
import { useLetterFont, useP, useTheme } from "../lib/theme";
import { t } from "../lib/i18n";

/* THE FIRST FLIGHT, IN SWIFTUI (2026-10-27; "firstflight" in app_surfaces, off by default).
   ────────────────────────────────────────────────────────────────────────
   components/FirstFlight puts this behind NativeSurface, with the React Native flight as the
   fallback, for every caller (the new onboarding's screens 12 and 13, the legacy run, the dev
   preview) — except inside the Swift onboarding's own island, where it stays React Native.

   SwiftUI (modules/kindredly-ui KFirstFlightView) draws the board on one clock from `startAt`:
   the chart, the trail, the letter folding, the plain envelope, the three it brings back, the
   default title and TAP TO SKIP. Every place and time is components/first-flight-model's, the
   React Native flight's own. What stays React Native, as islands Swift moves:
     bird      her: WrenBird at the hatchling's stage in the caller's form, mark, coat and piece
               (the run's own look, not the account's, so never a snapshot), her mood TS's
     head      a caller's title block, in place of the default one
     envelope  a caller's envelope front, in place of the plain one
     line      a caller's line under the chart
   The head and the line speak for themselves to VoiceOver but take no touches: a tap anywhere
   skips, as on the React Native flight.

   TypeScript keeps the rest, as the React Native flight does: Reduce Motion lands it at once
   (onDone; Swift holds the first frame), the haptics and her moods on the same beats, the end at
   FLIGHT_TOTAL, a tap's skip — onDone once, whichever comes first. `still` draws the landed chart
   alone: no clock, no tap, nothing called. */

/** the curves as Swift takes them: FLIGHT_CURVES, and TRAIL spelt out */
const CURVES: KFirstFlightCurves = { ...FLIGHT_CURVES, trailLead: TRAIL.lead, trailPeak: TRAIL.peak, trailHold: TRAIL.hold, trailEnd: TRAIL.end };
const HOME_POINT = { x: HOME[0], y: HOME[1], at: 0 };
const STOP_POINTS = STOPS.map(([x, y]) => ({ x, y, at: 0 }));

export function FirstFlightSwift({
  her,
  opener,
  stops,
  form,
  mark,
  skin,
  accessory,
  onDone,
  colors,
  head,
  envelope,
  envelopeSize,
  line,
  skipLabel,
  still = false,
}: FirstFlightProps) {
  const themeP = useP();
  const { t: themeT, key: theme } = useTheme();
  const letterKey = useLetterFont();
  /* the run's colours, where it passes them, laid over the theme's names, as the React Native flight does */
  const P = colors ? { ...themeP, penWash: colors.ground, ink: colors.ink, ink60: colors.sub, ink40: colors.faint, pen: colors.accent, post: colors.accent } : themeP;
  const tk = colors ? { ...themeT, ln: colors.ink, sf: colors.card } : themeT;
  const { width, height } = useWindowDimensions();
  const k = Math.min(width / FLIGHT_W, height / FLIGHT_H);
  const envW = envelopeSize?.w ?? 120;
  const envH = envelopeSize?.h ?? 80;
  const [startAt] = useState(() => Date.now());
  const done = useRef(false);
  const [mood, setMood] = useState<WrenMood>("curious");

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  const pts = useMemo(() => flightPoints(), []);
  const bird = useMemo(() => birdTrack(pts), [pts]);
  const envTrack = useMemo(() => envelopeTrack(pts, { w: envW, h: envH }), [pts, envW, envH]);

  useEffect(() => {
    if (still) return; // the landed chart: nothing plays, nothing is called
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (alive && r) finish();
    });
    // each beat at its time on the flight's clock, which started at `startAt`
    const tick = (ms: number, f: () => void) => setTimeout(() => alive && f(), Math.max(0, startAt + ms - Date.now()));
    const timers = [
      tick(0, () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      tick(300, () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      tick(FLY0 * 1000, () => {
        setMood("content");
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }),
      ...stopTimesMs().map((ms) => tick(ms, () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))),
      tick(FLY1 * 1000, () => {
        setMood("delight");
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      }),
      // she has landed: the end of the clock, as the React Native flight's withTiming ends
      tick(FLIGHT_TOTAL * 1000, finish),
    ];
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRows = STOPS.map((_, i) => ({ label: stopStamp(stops[i]) || t("ff.stop", { n: i + 1 }), words: stopWords(stops[i]) }));
  const hasHead = head != null;
  const hasEnvelope = !!envelope;
  const hasLine = !!line;

  return (
    <SurfaceHost style={StyleSheet.absoluteFill}>
      <KFirstFlightView
        theme={theme}
        letterFont={letterKey}
        startAt={startAt}
        still={still}
        scale={k}
        total={FLIGHT_TOTAL}
        colors={{ ground: P.penWash, ink: P.ink, sub: P.ink60, faint: P.ink40, line: tk.ln, card: tk.sf, pen: P.pen, post: P.post }}
        hasHead={hasHead}
        title={t("ob.flight.plain", { name: her })}
        titleEm={t("ob.flight.em", { name: her })}
        sub={t("ob.flight.sub")}
        opener={opener}
        openerLines={letterFitLines(letterKey, 3)}
        carried={t("ob.carriedBy", { name: her.toUpperCase() })}
        yourCity={t("ff.yourCity")}
        chart={t("ff.chart")}
        skip={skipLabel ?? t("ff.skip")}
        stops={stopRows}
        stopWordsSize={letterFitSize(letterKey, 11)}
        loop={LOOP_D}
        home={HOME_POINT}
        stopPoints={STOP_POINTS}
        trail={pts}
        curves={CURVES}
        bird={bird}
        envelope={envTrack}
        envelopeW={envW}
        envelopeH={envH}
        hasEnvelope={hasEnvelope}
        hasLine={hasLine}
        onSkip={finish}
      >
        {/* every island on every render, in this order (Slot.tsx) */}
        <KIsland name="bird" style={{ width: 90, height: 90 }}>
          {still ? null : <WrenBird size={90} mood={mood} pose="perch" stage="hatch" form={form} mark={mark} skin={skin} accessory={accessory} />}
        </KIsland>
        <ReadIsland name="head" style={{ width: FLIGHT_W, alignItems: "center" }}>
          {still || !hasHead ? null : head}
        </ReadIsland>
        <KIsland name="envelope" style={{ width: envW, height: envH }}>
          {still || !hasEnvelope ? null : envelope}
        </KIsland>
        <ReadIsland name="line" style={{ width: FLIGHT_W - 48, alignItems: "center" }}>
          {still || !hasLine ? null : line}
        </ReadIsland>
      </KFirstFlightView>
    </SurfaceHost>
  );
}

/** An island that speaks for itself to VoiceOver (a caller's title, its line) but takes no touches:
    a tap there skips, as anywhere on the flight. KSlot, one RNHostView, one View, as Slot.tsx asks. */
function ReadIsland({ name, style, children }: { name: string; style: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <KSlot name={name}>
      <RNHostView matchContents>
        <View pointerEvents="none" style={style}>
          {children ?? null}
        </View>
      </RNHostView>
    </KSlot>
  );
}
