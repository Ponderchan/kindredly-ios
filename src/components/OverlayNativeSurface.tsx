import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui";
import { NativeSurface, type SurfaceHostLink } from "./NativeSurface";
import { useNativeSurface, type NativeSurfaceKey } from "../lib/surfaces";

/* A SWIFT PIECE INSIDE A REACT NATIVE MODAL (2026-10-27: the lightbox, the song shelf, the signing
   sheet). Each of these was a React Native Modal over a Swift screen. Its Swift version keeps the
   Modal — the window, its fade or slide, onRequestClose — and draws the inside in SwiftUI, so the
   piece opens and closes exactly as before. Two parts:

   useOverlayRenderer(surface, view, open) picks the renderer, as NativeSurface would: Swift when
   the switch is on (lib/surfaces nativeOn: the table, NATIVE_DEFAULTS, the crash breadcrumb, the
   dev override) and the binary has the view, and it hasn't fallen back in this process. While the
   piece is open the answer is held, so a switch flipped by a fresher table never swaps it under
   the reader's thumb; closed, it follows the switch.

   <OverlaySurface> goes INSIDE the Swift version's Modal, so it mounts each time the piece opens:
   a NativeSurface in mount mode, which arms the crash breadcrumb before the Host mounts and clears
   it once the Host has stood (a crash while opening counts against the piece, two in a row send it
   back to React Native on that binary). Wherever NativeSurface would draw React Native instead (a
   JS error in the Swift path, the phone's storage too slow to arm), the piece goes back to its
   React Native version for the rest of this process: `onFallback` (useOverlayRenderer's toRN)
   swaps the whole piece, Modal and all, and it opens again in React Native. */

/* pieces that fell back in this process: React Native until the next launch */
const fellBack = new Set<string>();

/** Which renderer an overlay uses; `toRN` sends it to React Native for the rest of this process. */
export function useOverlayRenderer(surface: NativeSurfaceKey, view: string, open: boolean): { native: boolean; toRN: () => void } {
  const on = useNativeSurface(surface);
  const [, setFell] = useState(0);
  const want = on && !fellBack.has(surface) && isKindredlyUIViewAvailable(view);
  // held from the moment it opened until it closes
  const held = useRef<boolean | null>(null);
  if (!open) held.current = null;
  else if (held.current === null) held.current = want;
  const native = (open ? (held.current ?? want) : want) && !fellBack.has(surface);
  const toRN = useCallback(() => {
    if (fellBack.has(surface)) return;
    fellBack.add(surface);
    console.log(`[surfaces] the SwiftUI ${surface} piece fell back; React Native for the rest of this session`);
    setFell((n) => n + 1);
  }, [surface]);
  return { native, toRN };
}

/** The Swift inside of an overlay's Modal (see the note above). */
export function OverlaySurface({
  surface,
  view,
  native,
  pending,
  onFallback,
}: {
  surface: NativeSurfaceKey;
  view: string;
  /** one SurfaceHost holding the view */
  native: (host: SurfaceHostLink) => ReactNode;
  /** drawn while the breadcrumb is armed (a frame or two); nothing by default */
  pending?: () => ReactNode;
  /** useOverlayRenderer's toRN */
  onFallback: () => void;
}) {
  return (
    <NativeSurface
      surface={surface}
      view={view}
      mode="mount"
      native={native}
      fallback={() => <FallBack run={onFallback} />}
      pending={pending ?? (() => null)}
    />
  );
}

/* swaps the piece to React Native once mounted (never during a render) */
function FallBack({ run }: { run: () => void }) {
  useEffect(() => {
    run();
  }, [run]);
  return null;
}
