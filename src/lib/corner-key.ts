import { useCallback, useRef, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";

/* THE CORNER KEY (iPhone Duo; owner, 2026-11-12, on the walk's list: "逐个做吧"). On a folding
   phone the system keeps a band down the right edge. On the tabs the tab bar stands in it with
   the + in its foot corner, where the thumb of the hand holding the phone rests. On a page
   pushed over the tabs that corner was empty and the way out was at the top left, the far
   corner from that thumb. So there the corner holds the page's way out (components/
   FoldCornerKey): a back arrow, which goes back as the page's own arrow does.

   A page whose way out is its own (the letter composer's guarded ✕, which asks before words are
   lost) says so here while it is on screen; the key then draws a ✕ and does exactly that.
   Nothing here draws anything, and on a phone that doesn't fold nothing reads it. */

export type CornerKey = {
  /** back: an arrow. close: a ✕ (a page that rose from the bottom) */
  kind: "back" | "close";
  /** what VoiceOver calls it; none: "Back" */
  label?: string;
  onPress: () => void;
};

let own: CornerKey | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((f) => f());

/** This page's own way out, for the corner key, while the page is the one on screen. null:
    none just now (a tab names one only while it has taken the tab bar's place: Today's reply). */
export function useCornerKey(key: CornerKey | null): void {
  // the latest handler, so a page that re-renders doesn't re-register
  const latest = useRef(key);
  latest.current = key;
  const on = !!key;
  const kind = key?.kind ?? "back";
  const label = key?.label;
  useFocusEffect(
    useCallback(() => {
      if (!on) return;
      const mine: CornerKey = { kind, label, onPress: () => latest.current?.onPress() };
      own = mine;
      tell();
      return () => {
        if (own === mine) {
          own = null;
          tell();
        }
      };
    }, [on, kind, label]),
  );
}

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/** The way out the page on screen named, or null: the key goes back. */
export function useCornerKeyOwn(): CornerKey | null {
  return useSyncExternalStore(subscribe, () => own);
}
