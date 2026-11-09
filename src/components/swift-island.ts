import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui/src/available";
import { armNative, clearNative, disarmNative, nativeOn, type NativeSurfaceKey } from "../lib/surfaces";

/* AN ISLAND A SWIFT PAGE DRAWS ITSELF (batch 3, 2026-11-09): the gate for a piece that was a
   React Native <KIsland> inside a Swift page and that the page can now draw from plain props — a
   journal page's voice card and film ("notevoice", "notefilm"), a Wren post's picture or film
   ("postmedia"). It is screens/me/me-pieces' useSwiftPiece for any key (that one is typed to
   Me's two pieces, and its file is Me's), with one difference: the switch is read ONCE, when the
   page mounts, as VoiceSlot's useVoicePieces reads its own — a voice playing or a film running
   must not be swapped under the reader's thumb by a fresher table. The page itself was mounted
   after surfacesReady() (NativeSurface, mount mode), so the table is in memory by then.

   - "rn": the island, exactly as before (the switch off, or the binary without `view`, the
     piece's marker: an older binary would ignore the props and leave an empty slot).
   - "pending": on, and its crash breadcrumb on its way to the disk (milliseconds, the first time
     in a process): draw neither, so a player isn't started twice.
   - "swift": the page draws it. The mark is written (armNative) BEFORE Swift is told to draw, so
     a crash in its first frames counts against the piece (two in a row send it back to React
     Native on that binary); it is cleared once the piece has stood 3 s on show, when the app
     leaves the front, or 1 s after it goes. A mark for a piece that then never showed is taken
     back (disarmNative). Once a piece has armed in this process, later pages skip "pending". */

export type IslandRenderer = "rn" | "pending" | "swift";

/* the breadcrumb's clocks, NativeSurface's */
const STAND_MS = 3000;
const GONE_MS = 1000;

/* per piece, in this process: its mark on the way to the disk, on it, or cleared (it stood) */
type Arming = "arming" | "armed" | "stood";
const arming = new Map<string, Arming>();
let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const read = () => version;

function stand(key: string): void {
  if (arming.get(key) !== "armed") return;
  arming.set(key, "stood");
  clearNative(key);
  changed();
}

/** Who draws the piece `key` on this page (see the note above). `showing`: it has something to show. */
export function useSwiftIsland(key: NativeSurfaceKey, view: string, showing: boolean): IslandRenderer {
  // once, at mount
  const [on] = useState(() => nativeOn(key) && isKindredlyUIViewAvailable(view));
  useSyncExternalStore(subscribe, read, read);
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
          changed();
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

  if (!on) return "rn";
  return state === "armed" || state === "stood" ? "swift" : "pending";
}
