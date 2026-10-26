import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui/src/available";
import { nativeOn, useNativeSurface } from "./surfaces";

/* MAKE YOUR OWN FACE — A STUB of the contract file. The real src/lib/make-face.ts (merged into
   ios-1.2.3 at 250b484) replaces this one at the merge: take theirs. Only the exports onboarding's
   screen 5 uses are here, with the real file's signatures; the switch reads exactly as the real
   one does (the "makeface" key and a binary with the KMakeFaceView page), and with no made faces
   on this branch the cell can only read "free". */

export type MadeFaceState = "free" | "used" | "yours";
type MakeFaceFrom = "onboarding" | "me";

const MAKE_FACE_SURFACE = "makeface";
const MAKE_FACE_VIEW = "KMakeFaceView";

/** The door may show: the switch is on and the binary draws the flow. */
export function makeFaceOn(): boolean {
  return nativeOn(MAKE_FACE_SURFACE) && isKindredlyUIViewAvailable(MAKE_FACE_VIEW);
}

/** makeFaceOn, following the switch when a fresher answer lands. */
export function useMakeFaceOn(): boolean {
  const on = useNativeSurface(MAKE_FACE_SURFACE);
  return on && isKindredlyUIViewAvailable(MAKE_FACE_VIEW);
}

/** The flow's route. */
export function makeFaceHref(from: MakeFaceFrom, opts: { dob?: string | null } = {}): string {
  const q = [`from=${from}`];
  if (opts.dob && /^\d{4}-\d{2}-\d{2}$/.test(opts.dob)) q.push(`dob=${opts.dob}`);
  return `/make-face?${q.join("&")}`;
}

export function useMadeFace(): { state: MadeFaceState; image: string | null } {
  return { state: "free", image: null };
}

/** The made face to wear ("made-<uuid>"); null when nothing was made. */
export function useMadeFaceAvatarId(): string | null {
  return null;
}

/** Wear a made face, or none (a library face or Later was chosen). */
export function setMadeFaceWorn(_avatarId: string | null): Promise<unknown> {
  return Promise.resolve(null);
}
