import { useMemo } from "react";
import type { KMyFaceData } from "../../modules/kindredly-ui/src/LastIslands";
import { useFaceSources, type FaceInput } from "./faces";
import { myFaceData } from "./last-islands";
import { useSwiftIsland } from "./swift-island";

/* YOUR OWN FACE IN SWIFT (batch 3, slice 4, 2026-11-09; the "myavatar" switch, off by default).
   The Me header (screens/me/MeNative) and Edit profile (screens/edit-profile/EditProfileNative)
   drew your face as a React Native island, <AvatarImage id photoUri seed>. With the switch on and
   the binary carrying KMyFaceView, this hands their Swift views a record instead (KMeView /
   KEditProfileView `myFace`) and they leave the island empty: lib/faces resolves you the way it
   resolves a kindred on the Me page's peek — your photo, your portrait (a legacy one 5% larger),
   the face Wren made you, a snapshot of an old drawn face, or the glyph for your seed — and Swift
   draws it (KMyFace: KFace, round, or square inside your C2 stamp, which the Me header still draws
   round it). null = keep the island. */

/** Your face for a Swift page's `myFace`, or null to keep its AvatarImage island. */
export function useMyFace(avatar: { id: string | null; photo: string | null; seed: string }, showing = true): KMyFaceData | null {
  const on = useSwiftIsland("myavatar", "KMyFaceView", showing);
  const { id, photo, seed } = avatar;
  // nothing to load while it is off
  const inputs = useMemo(() => {
    const o: Record<string, FaceInput> = {};
    if (on) o.me = { role: "kindred", seed, avatarId: id, photoUri: photo };
    return o;
  }, [on, seed, id, photo]);
  const source = useFaceSources(inputs).me;
  return useMemo(() => (on && source ? myFaceData(source) : null), [on, source]);
}
