import { useEffect, useRef, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui/src/available";
import { armNative, clearNative, disarmNative, useNativeSurface, type NativeSurfaceKey } from "./surfaces";

/* AN ISLAND SWIFT DRAWS ITSELF (batch 3, slice 4, 2026-11-09).
   ────────────────────────────────────────────────────────────────────────
   Some of the last React Native a reader sees is a small island inside a Swift page: Wren in the
   compose toolbar, in the Notes composer and on Make your own face, and your own face on Me and
   Edit profile. With the piece's switch on, the host page hands Swift the piece's record and
   leaves the island empty; Swift draws it from the record. Off, the record says `on: false` and
   the island is drawn exactly as before.

   This is the same gate as screens/me/me-pieces useSwiftPiece (the courier card and the Aura
   art), for any switch and marker view rather than Me's two, kept in its own file so the batch's
   branches don't all edit me-pieces:
   - the switch (useNativeSurface: NATIVE_DEFAULTS, the table, the dev override, the crash
     strikes);
   - the binary's marker view for the piece (a binary without it would ignore the record and
     leave an empty frame where the island used to be);
   - the crash breadcrumb: the first time a piece shows in a process its mark is written
     (armNative) BEFORE Swift is told to draw it, so a crash in its first frames is counted
     against the piece (two in a row send it back to React Native), and it is cleared once the
     piece has stood 3 s on show (or 1 s after it goes, or when the app leaves the front). Until
     the mark lands (milliseconds) the island draws. A mark written for a piece that then never
     showed is taken back (disarmNative), as NativeSurface does. */

/* the breadcrumb's clocks, NativeSurface's */
const STAND_MS = 3000;
const GONE_MS = 1000;

/* per piece, in this process: its mark on the way to the disk, on it, or cleared (it stood) */
type Arming = "arming" | "armed" | "stood";
const arming = new Map<string, Arming>();
let armingVersion = 0;
const armingListeners = new Set<() => void>();
const armingChanged = () => {
  armingVersion++;
  armingListeners.forEach((l) => l());
};
const subscribeArming = (l: () => void) => {
  armingListeners.add(l);
  return () => {
    armingListeners.delete(l);
  };
};
const readArming = () => armingVersion;

function stand(key: string): void {
  if (arming.get(key) !== "armed") return;
  arming.set(key, "stood");
  clearNative(key);
  armingChanged();
}

/**
 * true = Swift draws this island's piece now (see the note above).
 * @param key the piece's switch (lib/surfaces NATIVE_DEFAULTS)
 * @param view the binary's marker view for the piece ("KWrenPictureView", "KMyFaceView")
 * @param showing the piece is on screen
 */
export function useSwiftIsland(key: NativeSurfaceKey, view: string, showing: boolean): boolean {
  const on = useNativeSurface(key) && isKindredlyUIViewAvailable(view);
  useSyncExternalStore(subscribeArming, readArming, readArming);
  const state = arming.get(key);
  // still wanted when the mark lands: mounted, on and on show (read then, not when it was asked)
  const wanted = useRef(false);
  wanted.current = on && showing;
  useEffect(
    () => () => {
      wanted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!on || !showing) return;
    const s = arming.get(key);
    if (s === undefined) {
      // first show in this process: the mark first, then Swift
      arming.set(key, "arming");
      armNative(key)
        .catch((e) => console.log(`[swift-island] arming ${key} failed, drawing it anyway:`, e))
        .then(() => {
          if (arming.get(key) !== "arming") return;
          if (wanted.current) {
            arming.set(key, "armed");
          } else {
            // gone before it could show: no strike, no forgiveness
            arming.delete(key);
            disarmNative(key);
          }
          armingChanged();
        });
      return;
    }
    if (s === "armed") {
      const timer = setTimeout(() => stand(key), STAND_MS);
      const sub = AppState.addEventListener("change", (a) => {
        if (a !== "active") stand(key);
      });
      return () => {
        clearTimeout(timer);
        sub.remove();
        setTimeout(() => stand(key), GONE_MS);
      };
    }
  }, [on, showing, key, state]);

  return on && (state === "armed" || state === "stood");
}
