import { useEffect, useMemo, useSyncExternalStore } from "react";
import { AppState, useWindowDimensions } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { foldFrame, type FoldFrame } from "./fold-frame";
import { useNativeSurface } from "./surfaces";

/* THE FOLD (iPhone Duo; owner, 2026-11-12: "需要做完在模拟器看"). What the system says about a
   folding phone, read once in native (modules/kindredly-ui KFoldMonitor) and kept here for every
   screen: the hinge (closed, partly open, open) and its angle, the window's size, the crease (the
   system's "division" regions: where content should split in two) and what the system covers
   (its "occlusion" regions: the camera, the status area down the side of the outer screen).

   On a phone that doesn't fold, on iOS before 27.1, and on a binary from before the monitor, the
   state is NO_FOLD and never changes: every screen is laid out as it always was. Nothing here
   decides a layout; lib/fold-frame turns this into the numbers a screen lays itself out by, and
   useFoldFrame (at the foot) is how a screen reads them.

   The state is asked for at start, again whenever the window changes size (opening the phone or
   turning it changes the window before the hinge says anything), once more when the app has
   settled and each time it comes to the front, and pushed by the hinge and by a change of the
   root view's safe area. */

/** A region the system reserves in the window, in points; the margins are already inside it. */
export type FoldRegion = { x: number; y: number; w: number; h: number; top: number; left: number; bottom: number; right: number; active: boolean };

export type FoldState = {
  /** none: this phone has no hinge (or the system doesn't say) */
  hinge: "none" | "unknown" | "closed" | "partly" | "open";
  /** the hinge's angle, in radians */
  angle: number;
  width?: number;
  height?: number;
  safe?: { top: number; left: number; bottom: number; right: number };
  /** the crease, when the window is split by one */
  divisions?: FoldRegion[];
  /** what the system covers: the camera, the side status area */
  occlusions?: FoldRegion[];
};

export const NO_FOLD: FoldState = Object.freeze({ hinge: "none", angle: 0 });

type Native = {
  /** the frame the app decided, for the Swift views (Portable KFold) */
  setFoldFrame?: (frame: Record<string, number | boolean | string>) => void;
  foldState?: () => Promise<FoldState>;
  addListener?: (event: "onFoldChange", f: (s: FoldState) => void) => { remove: () => void };
};

let state: FoldState = NO_FOLD;
let native: Native | null | undefined;
let listening = false;
const listeners = new Set<() => void>();

/* the same reading, key for key in one order: the bridge hands the dictionaries over in whatever
   order it likes, and a state that "changed" on every reading re-laid every screen out */
const region = (r: FoldRegion): FoldRegion => ({ x: r.x, y: r.y, w: r.w, h: r.h, top: r.top, left: r.left, bottom: r.bottom, right: r.right, active: !!r.active });
function tidy(s: FoldState): FoldState {
  return {
    hinge: s.hinge,
    angle: Math.round((s.angle ?? 0) * 100) / 100,
    width: s.width,
    height: s.height,
    safe: s.safe ? { top: s.safe.top, left: s.safe.left, bottom: s.safe.bottom, right: s.safe.right } : undefined,
    divisions: (s.divisions ?? []).map(region),
    occlusions: (s.occlusions ?? []).map(region),
  };
}

function take(raw: FoldState | null | undefined): void {
  if (!raw || typeof raw.hinge !== "string") return;
  const next = tidy(raw);
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  state = next;
  if (__DEV__) console.log("[fold]", JSON.stringify(next));
  listeners.forEach((f) => f());
}

/** Ask the system again (the window changed, or a screen wants to be sure). */
export function refreshFold(): void {
  if (native === undefined) native = requireOptionalNativeModule<Native>("KindredlyUI");
  if (!native?.foldState) return;
  if (!listening) {
    listening = true;
    try {
      native.addListener?.("onFoldChange", take);
    } catch (e) {
      console.log("[fold] could not listen for the hinge; the state is only read on demand:", e);
    }
    /* A FIRST READING CAN BE WRONG, and nothing used to ask again until the phone was folded
       (found walking the Duo simulator, 2026-11-12: read while another window was in front, the
       band came back as 0, so the tab bar dropped to the bottom and the page ran under the
       system's clock). Native now reads the app's own window and pushes when its safe area
       changes; these are the belt to those braces, and cost nothing, since an identical
       reading changes nothing: once the app has settled, and whenever it comes to the front. */
    setTimeout(refreshFold, 600);
    setTimeout(refreshFold, 2500);
    AppState.addEventListener("change", (s) => {
      if (s === "active") refreshFold();
    });
  }
  native
    .foldState()
    .then(take)
    .catch((e) => console.log("[fold] could not read the fold; laying out as a phone that doesn't fold:", e));
}

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/** The fold as the system reports it now; NO_FOLD on a phone that doesn't fold. */
export function useFold(): FoldState {
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    refreshFold();
  }, [width, height]);
  return useSyncExternalStore(subscribe, () => state);
}

/** How this window is laid out (lib/fold-frame): the band a page keeps out of, the air beside a
    single column on the inner screen, whether the tab bar is a rail, and where two pages meet.
    On a phone that doesn't fold, and with the "duo" switch off, it is the plain phone's frame. */
export function useFoldFrame(): FoldFrame {
  const window = useWindowDimensions();
  const fold = useFold();
  const on = useNativeSurface("duo");
  return useMemo(() => foldFrame(fold, { width: window.width, height: window.height }, on), [fold, window.width, window.height, on]);
}

/** This binary's Swift views read the frame themselves (Portable KFold): a screen that is the
    whole window on a folding phone, with its own Swift view keeping to the column, may only be
    left unpadded when this is true. */
export function swiftReadsFold(): boolean {
  if (native === undefined) native = requireOptionalNativeModule<Native>("KindredlyUI");
  return !!native?.setFoldFrame;
}

/** Hand the frame to the Swift views (modules/kindredly-ui Portable KFold), which read it
    without a prop of their own. Called from one place, the root layout's FoldWatch. A binary
    from before the function keeps `.phone` in Swift: its views draw as on a phone. */
export function shareFoldFrame(frame: FoldFrame): void {
  if (native === undefined) native = requireOptionalNativeModule<Native>("KindredlyUI");
  if (!native?.setFoldFrame) return;
  try {
    native.setFoldFrame({
      duo: frame.duo,
      posture: frame.posture,
      half: frame.half,
      left: frame.left,
      right: frame.right,
      band: frame.band,
      bandTop: frame.bandTop,
      crease: frame.pages?.crease ?? 0,
      rightEnd: frame.pages?.rightEnd ?? 0,
    });
  } catch (e) {
    console.log("[fold] could not hand the frame to the Swift views; they draw as on a phone:", e);
  }
}
