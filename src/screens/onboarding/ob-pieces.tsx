import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, AppState, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Haptics from "expo-haptics";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui/src/available";
import type { KFirstFlightCurves } from "../../../modules/kindredly-ui";
import { WrenBird, type WrenMood } from "../../components/WrenBird";
import { HatchlingPart } from "../../components/HatchlingRig";
import { FLIGHT_CURVES, FLIGHT_TOTAL, FLY0, FLY1, TRAIL, stopTimesMs } from "../../components/first-flight-model";
import type { HatchlingForm } from "../../lib/hatchling-form";
import { snapshotCacheKey, type ImageRefRecord } from "../../lib/images";
import { armNative, clearNative, nativeOn } from "../../lib/surfaces";
import { CHICK_SHOT, RIG_LAYERS, RIG_SHOT, RUN_MOODS, runLookSig, type RigLayer, type RunMood } from "./ob-pieces-model";

/* THE SWIFT ONBOARDING'S LAST FOUR PIECES, FROM TS (2026-11-09, batch 3 slice 2).
   ────────────────────────────────────────────────────────────────────────
   OnboardingNative drew four React Native islands inside the Swift run. Each can now be drawn by
   Swift (modules/kindredly-ui KObPieces.swift, KObHatchStage.swift), behind its own switch:
     obroutebird  Wren flying on the doorstep's slide 2   (bird-images "obRoute")
     obchick      the named chick on 10, 11 and 13          (the run's pictures, whole)
     obflight     the first flight on 12, still behind 13   (the same pictures at 90)
     hatch        the hatch on 9                             (the rig's pictures, part by part)
   This file holds what TS keeps for them: which are Swift (decided once per run), the crash
   breadcrumb, the pictures, and the flight's clock. OnboardingNative builds the records.

   THE PICTURES ARE THE RUN'S. The chick, the flight's bird and the hatchling are the hatchling the
   read made of YOUR letter, with the birthmark of the shell YOU picked, in Sky and bare — never
   the look the phone's account has on (s10-chick: "the run never borrows the look"). lib/bird-
   images can't draw that (its looks are the account's), so the run captures its own here, the
   same way (react-native-view-shot, offscreen, a tmp PNG, a session-keyed cache key):
   RunBirdShots. They are taken from 8 on (the letter is written: her form is known), so they are
   there before she is. A piece whose pictures aren't all in when it would show stays React Native
   for that screen (the hatch and the flight decide as they open, so nothing swaps mid-motion).

   THE GATE: the switch (nativeOn: the table, NATIVE_DEFAULTS, the dev override, the crash strikes)
   and this binary's marker view (KObPiecesView: a KOnboardingView without the `pieces` record
   would leave an empty slot), read once when the run mounts, as VoiceSlot does. Each piece arms
   the breadcrumb when it first shows and clears it once it has stood. */

export type ObPieceGate = { route: boolean; chick: boolean; flight: boolean; hatch: boolean };

/** Which of the four Swift draws in this run: decided once, at mount. */
export function useObPieceGate(): ObPieceGate {
  const [gate] = useState<ObPieceGate>(() => {
    const there = isKindredlyUIViewAvailable("KObPiecesView");
    return {
      route: there && nativeOn("obroutebird"),
      chick: there && nativeOn("obchick"),
      flight: there && nativeOn("obflight"),
      hatch: there && nativeOn("hatch"),
    };
  });
  return gate;
}

/* The breadcrumb for a piece the run draws itself (VoiceSlot's useArmedPiece): armed while it
   shows, cleared once it has stood 3 s, when the app leaves the front, or 1 s after it goes. */
export function useArmedPiece(key: string, showing: boolean): void {
  useEffect(() => {
    if (!showing) return;
    const arm = armNative(key);
    let done = false;
    const clear = () => {
      if (done) return;
      done = true;
      void arm.then(() => clearNative(key));
    };
    const id = setTimeout(clear, 3000);
    const sub = AppState.addEventListener("change", (a) => {
      if (a === "background" || a === "inactive") clear();
    });
    return () => {
      clearTimeout(id);
      sub.remove();
      setTimeout(clear, 1000);
    };
  }, [key, showing]);
}

/* ── the run's pictures ──────────────────────────────────────────────── */

export type RunPictures = {
  /** the whole hatchling at 104, by mood (WrenBird stage hatch) */
  birds: Partial<Record<RunMood, ImageRefRecord>>;
  /** the rig at 148: the resting parts, and the face by mood (HatchlingPart) */
  layers: Partial<Record<RigLayer, ImageRefRecord>>;
  faces: Partial<Record<RunMood, ImageRefRecord>>;
  birdsReady: boolean;
  rigReady: boolean;
  /** the offscreen strip that draws what is being captured: render it somewhere in the run */
  strip: ReactNode;
};

type ShotSpec = { id: string; size: number; draw: () => ReactNode };

/** at most this many drawings mounted at once (FaceSnapshots' batch) */
const BATCH = 6;

/**
 * The run's own pictures for `plan` (ob-pieces-model shotPlan), in the run's look: the read's
 * `form`, the shell's `mark`, Sky, bare. A new look is captured again; a capture that fails is
 * retried (three times), and until every picture of a set is in, that set isn't ready.
 */
export function useRunPictures(form: HatchlingForm | undefined, mark: string, plan: { birds: boolean; rig: boolean }): RunPictures {
  const sig = runLookSig(form ?? null, mark);
  const [shots, setShots] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Record<string, number>>({});
  const k = (id: string) => `${id}@${sig}`;

  const specs: ShotSpec[] = [];
  if (plan.birds) {
    for (const m of RUN_MOODS) {
      specs.push({ id: `bird-${m}`, size: CHICK_SHOT, draw: () => <WrenBird size={CHICK_SHOT} mood={m} stage="hatch" form={form} mark={mark} skin="sticker" accessory="none" /> });
    }
  }
  if (plan.rig) {
    for (const l of RIG_LAYERS) specs.push({ id: `rig-${l}`, size: RIG_SHOT, draw: () => <HatchlingPart part={l} size={RIG_SHOT} form={form} mark={mark} skin="sticker" /> });
    for (const m of RUN_MOODS) specs.push({ id: `face-${m}`, size: RIG_SHOT, draw: () => <HatchlingPart part="face" mood={m} size={RIG_SHOT} form={form} mark={mark} skin="sticker" /> });
  }
  const todo = specs.filter((s) => !shots[k(s.id)] && (failed[k(s.id)] ?? 0) < 3).slice(0, BATCH);

  const ref = (id: string): ImageRefRecord | undefined => {
    const uri = shots[k(id)];
    return uri ? { uri, key: snapshotCacheKey(`runbird:${id}:${sig}`) } : undefined;
  };
  const birds: Partial<Record<RunMood, ImageRefRecord>> = {};
  const faces: Partial<Record<RunMood, ImageRefRecord>> = {};
  const layers: Partial<Record<RigLayer, ImageRefRecord>> = {};
  for (const m of RUN_MOODS) {
    const b = ref(`bird-${m}`);
    if (b) birds[m] = b;
    const f = ref(`face-${m}`);
    if (f) faces[m] = f;
  }
  for (const l of RIG_LAYERS) {
    const r = ref(`rig-${l}`);
    if (r) layers[l] = r;
  }

  const strip = (
    <View pointerEvents="none" style={{ position: "absolute", left: -4000, top: 0 }}>
      {todo.map((s) => {
        const key = k(s.id);
        return (
          <RunShot
            key={`${key}#${failed[key] ?? 0}`}
            size={s.size}
            onShot={(uri) => {
              if (uri) setShots((x) => ({ ...x, [key]: uri }));
              else setFailed((x) => ({ ...x, [key]: (x[key] ?? 0) + 1 }));
            }}
          >
            {s.draw()}
          </RunShot>
        );
      })}
    </View>
  );

  return {
    birds,
    layers,
    faces,
    birdsReady: RUN_MOODS.every((m) => !!birds[m]),
    rigReady: RIG_LAYERS.every((l) => !!layers[l]) && RUN_MOODS.every((m) => !!faces[m]),
    strip,
  };
}

/* the SVG is laid out on the first frame and drawn on a later one: two frames and a beat first
   (BirdSnapshots, FaceSnapshots) */
const settle = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))));

/** One drawing, captured once it has been drawn; a failure says null after a short wait (the parent retries by key). */
function RunShot({ size, onShot, children }: { size: number; onShot: (uri: string | null) => void; children: ReactNode }) {
  const view = useRef<View>(null);
  const started = useRef(false);
  const live = useRef(true);
  const said = useRef(onShot);
  said.current = onShot;
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const capture = async () => {
    if (started.current) return;
    started.current = true;
    await settle();
    if (!live.current || !view.current) return;
    let uri: string | null = null;
    try {
      uri = await captureRef(view.current, { format: "png", quality: 1, result: "tmpfile" });
    } catch (e) {
      console.warn("[ob-pieces] a picture of the run's bird didn't capture:", String((e as Error)?.message ?? e));
    }
    if (!live.current) return;
    if (!uri) await new Promise<void>((r) => setTimeout(r, 400));
    if (live.current) said.current(uri);
  };
  return (
    <View ref={view} collapsable={false} onLayout={() => void capture()} style={{ width: size, height: size }}>
      {children}
    </View>
  );
}

/* ── the flight's clock ──────────────────────────────────────────────── */

/** the curves as Swift takes them: FLIGHT_CURVES, and TRAIL spelt out (FirstFlightNative's CURVES) */
export const FLIGHT_SWIFT_CURVES: KFirstFlightCurves = { ...FLIGHT_CURVES, trailLead: TRAIL.lead, trailPeak: TRAIL.peak, trailHold: TRAIL.hold, trailEnd: TRAIL.end };

/**
 * What TS keeps of the Swift flight on 12 (FirstFlightSwift's, unchanged): the clock's start, her
 * face and the haptics on the same beats, Reduce Motion landing it at once, the end at
 * FLIGHT_TOTAL, a tap's skip — `onDone` once, whichever comes first. Runs while `active`.
 */
export function useObFlightClock(active: boolean, onDone: () => void): { startAt: number; mood: WrenMood; skip: () => void } {
  // the start is fixed on the render that opens it, so the first frame Swift draws is already on the clock
  const start = useRef(0);
  if (active && !start.current) start.current = Date.now();
  if (!active) start.current = 0;
  const [mood, setMood] = useState<WrenMood>("curious");
  const done = useRef(false);
  const said = useRef(onDone);
  said.current = onDone;
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    said.current();
  }, []);

  useEffect(() => {
    if (!active) return;
    done.current = false;
    setMood("curious");
    const startAt = start.current || Date.now();
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (alive && r) finish();
    });
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
      tick(FLIGHT_TOTAL * 1000, finish),
    ];
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [active, finish]);

  return { startAt: start.current, mood, skip: finish };
}

/** HatchStage's knock: light, or heavy as the shell goes (it plays expo-haptics itself). */
export function hatchKnock(heavy: boolean): void {
  try {
    void Haptics.impactAsync(heavy ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

/** Keep a value latched while `open`: the first value seen when it opened, until it closes. */
export function useLatch(open: boolean, value: boolean): boolean {
  const kept = useRef<boolean | null>(null);
  if (!open) kept.current = null;
  else if (kept.current === null) kept.current = value;
  return open ? !!kept.current : false;
}
