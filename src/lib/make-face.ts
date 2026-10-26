import { useEffect, useSyncExternalStore } from "react";
import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui/src/available";
import { useAuth } from "./auth";
import { nativeOn, useNativeSurface } from "./surfaces";
import {
  ensureMadeFaceFile,
  loadMadeFaces,
  madeFaceFileUri,
  madeFaceRefNow,
  madeFacesNow,
  madeFacesVersion,
  setMadeFaceWorn,
  subscribeMadeFaces,
  syncMadeFaces,
} from "./made-faces";
import { madeFaceState, shownFace, wornId, type MakeFaceFrom } from "./make-face-core";

/* MAKE YOUR OWN FACE — THE CONTRACT (owner, 2026-10-26). Onboarding (screen 5, the ＋ cell of
   the face grid) and Me → Edit profile code against this file; the flow itself is the route
   /make-face (src/app/make-face.tsx, a SwiftUI page behind the app_surfaces key "makeface").

   THE TWO NAMES THE CONTRACT FIXES (keep them exactly):
     export type MadeFaceState = "free" | "used" | "yours";
     export function useMadeFace(): { state: MadeFaceState; image: string | null }
   state, for the ＋ cell's tag (strings-make-face.ts):
     free   nothing made yet            → mf.tag.makeFree "MAKE YOURS · FREE" (Edit: mf.tag.once)
     used   the free face is spent and no made face is worn
                                        → mf.tag.first "1ST CLASS"
     yours  a made face is worn: the account's avatarId is one, or (a guest mid-onboarding,
            before the account holds a face) it was chosen in the flow with "This is me"
                                        → mf.tag.yours "YOURS", the face in the circle
   image: a file:// (or, briefly, signed https) URI of the face shown: the worn one, else the
   newest; null when nothing was made.

   THE HANDOFF, for whoever owns a door:
   - Open the flow: router.push(makeFaceHref("onboarding" | "me", { dob })). dob ("YYYY-MM-DD")
     is the birthday when the account doesn't hold it yet (onboarding asks it before screen 5):
     under 18, the photo rows are off. The flow decides its own first screen (the intro, the
     First Class card, or for a guest whose free face is spent the sign-in card).
   - Show the door only when makeFaceOn() / useMakeFaceOn() (the switch, and a binary with the
     SwiftUI page).
   - Wear it: useMadeFaceAvatarId() is the made face's avatar id ("made-<uuid>") to save as
     user_metadata.avatarId exactly as a library id is saved (onboarding's "This is me" with the
     ＋ cell chosen; Edit profile saves it itself). The flow, opened from Me, saves it on "This is
     me"; opened from onboarding it only marks it worn and leaves the saving to onboarding.
   - Choosing a library face (or Later) after making one: call setMadeFaceWorn(null), so the cell
     says "1ST CLASS" again (the free face stays spent — owner: "Pick a face instead" counts).
   - Rendering: AvatarImage and lib/faces draw "made-<uuid>" like any face (yours from the phone,
     a kindred's through faces_for), so nothing else changes where faces are shown. */

export type MadeFaceState = "free" | "used" | "yours";

/** the switch's key in app_surfaces (lib/surfaces NATIVE_DEFAULTS: off by default) */
export const MAKE_FACE_SURFACE = "makeface";
/** the SwiftUI page this binary must have (modules/kindredly-ui) */
export const MAKE_FACE_VIEW = "KMakeFaceView";

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

/** The phone's store of made faces, kept current (and read once per account). */
export function useMadeFaceStore() {
  useSyncExternalStore(subscribeMadeFaces, madeFacesVersion, madeFacesVersion);
  useEffect(() => {
    void loadMadeFaces();
  }, []);
  return madeFacesNow();
}

/** The account's avatar id as the account holds it (a guest's may be none yet). */
function useAccountAvatar(): string | null {
  const { profile } = useAuth();
  const v = profile?.avatarId;
  return typeof v === "string" && v ? v : null;
}

export function useMadeFace(): { state: MadeFaceState; image: string | null } {
  const s = useMadeFaceStore();
  const { session } = useAuth();
  const avatar = useAccountAvatar();
  // once per account per launch: the server's list (a new phone), a guest's claim, a drawing left running
  useEffect(() => {
    if (session) void syncMadeFaces();
  }, [session]);
  const state = madeFaceState(s, avatar);
  const shown = state === "free" ? null : shownFace(s, avatar);
  const image = shown ? (madeFaceFileUri(shown) ?? madeFaceRefNow(shown.avatarId)?.uri ?? null) : null;
  const missing = !!shown && !madeFaceFileUri(shown);
  useEffect(() => {
    if (shown && missing) void ensureMadeFaceFile(shown);
  }, [shown?.id, missing]); // eslint-disable-line react-hooks/exhaustive-deps
  return { state, image };
}

/** The made face to wear: the worn one, else the newest; null when nothing was made. */
export function useMadeFaceAvatarId(): string | null {
  const s = useMadeFaceStore();
  const avatar = useAccountAvatar();
  return wornId(s, avatar) ?? s.faces[0]?.avatarId ?? null;
}

export { isMadeFaceId } from "./make-face-core";
export { setMadeFaceWorn };
