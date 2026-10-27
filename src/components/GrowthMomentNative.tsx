import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { KGrowthMomentView, type KGrowthBeats } from "../../modules/kindredly-ui";
import { SurfaceHost } from "./NativeSurface";
import { growFromPose, growToPose, useBirdImageRef, type GrowPose } from "../lib/bird-images";
import { GROWTH_BEATS, GROWTH_BURST, GROWTH_CURVES, GROWTH_SHAKE, GROWTH_SIZE, growthWords, type GrowthMoment } from "../lib/growth-moment-core";
import { noteDay } from "../lib/format";
import { t } from "../lib/i18n";
import { useLetterFont, useTheme } from "../lib/theme";
import "../data/strings-growth";

/* WREN GROWS UP, IN SWIFTUI (2026-10-27; "growthmoment" in app_surfaces, off by default).
   ────────────────────────────────────────────────────────────────────────
   components/GrowthMoment decides when the moment shows and puts this inside its Modal, behind
   NativeSurface, with its React Native scene as the fallback. SwiftUI draws the scene
   (modules/kindredly-ui KGrowthMomentView); TypeScript keeps everything else: the words
   (growthWords), the clock (GROWTH_BEATS, from `startAt`), Reduce Motion (`still`, Reanimated's
   own reading, as the React Native scene reads it), the line VoiceOver hears as it starts, and the
   one tap of haptics as her new form pops in.

   HER TWO FORMS are snapshots of the real WrenBird (lib/bird-images "grow-hatch" … "grown-wren": the
   React Native scene's sizes, moods and stages, wearing nothing). The scene starts only once both
   pictures are in, so the shake never plays on an empty frame; if they aren't within
   PICTURES_CAP_MS (a capture that fails, a slow phone), this showing is the React Native scene's. */

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}

/** how long her two pictures may take before this showing goes to the React Native scene */
const PICTURES_CAP_MS = 1500;

/** the clock as Swift takes it (the haptic's beat stays here) */
const { hapticAt: _hapticAt, ...CLOCK } = GROWTH_BEATS;
const BEATS: KGrowthBeats = {
  ...CLOCK,
  shake: [...GROWTH_SHAKE],
  burst: GROWTH_BURST,
  burstCurve: [...GROWTH_CURVES.burst],
  popCurve: [...GROWTH_CURVES.pop],
  stampCurve: [...GROWTH_CURVES.stamp],
};

type Props = {
  moment: GrowthMoment;
  onClose: () => void;
  /** the React Native scene, for a moment Swift can't draw */
  fallback: () => ReactNode;
};

/** The grow-up moment drawn by SwiftUI, or the React Native scene when her pictures can't be had. */
export function GrowthMomentSwift({ moment, onClose, fallback }: Props) {
  const from = growFromPose(moment.from);
  // the moment only ever starts from a hatchling or a fledgling; anything else is React Native's
  if (!from) return <>{fallback()}</>;
  return <SwiftScene moment={moment} from={from} onClose={onClose} fallback={fallback} />;
}

function SwiftScene({ moment, from, onClose, fallback }: Props & { from: GrowPose }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const reduce = useReducedMotion();
  const oldBird = useBirdImageRef(from);
  const newBird = useBirdImageRef(growToPose(moment.to));
  const ready = !!oldBird && !!newBird;
  // the words, fixed as it opens (the day can't turn under it)
  const [words] = useState(() => growthWords(moment, t, noteDay(new Date())));
  const [startAt, setStartAt] = useState<number | null>(null);
  const [late, setLate] = useState(false);

  // the scene starts once both pictures are in…
  useEffect(() => {
    if (ready && startAt === null && !late) setStartAt(Date.now());
  }, [ready, startAt, late]);
  // …or this showing is React Native's
  useEffect(() => {
    if (startAt !== null) return;
    const id = setTimeout(() => {
      console.log(`[growth] her pictures weren't ready within ${PICTURES_CAP_MS}ms; the React Native scene this time`);
      setLate(true);
    }, PICTURES_CAP_MS);
    return () => clearTimeout(id);
  }, [startAt]);

  // as it starts: her line for VoiceOver, and the tap of haptics as the new form pops in
  useEffect(() => {
    if (startAt === null) return;
    AccessibilityInfo.announceForAccessibility(words.line);
    if (reduce) return;
    const tap = setTimeout(
      () => {
        try {
          void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
      },
      Math.max(0, startAt + GROWTH_BEATS.hapticAt - Date.now()),
    );
    return () => clearTimeout(tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAt]);

  if (startAt === null) return late ? <>{fallback()}</> : null;
  return (
    <SurfaceHost>
      <KGrowthMomentView
        theme={theme}
        letterFont={letterFont}
        startAt={startAt}
        still={reduce}
        beats={BEATS}
        oldBird={oldBird}
        newBird={newBird}
        oldSize={GROWTH_SIZE[moment.from]}
        newSize={GROWTH_SIZE[moment.to]}
        mark={words.mark}
        line={words.line}
        ok={t("grow.ok")}
        onClose={onClose}
      />
    </SurfaceHost>
  );
}
