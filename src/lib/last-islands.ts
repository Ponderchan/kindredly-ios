import type { FaceSource } from "./faces";

/* THE PURE PART OF BATCH 3, SLICE 4 (2026-11-09): which of Wren's pictures Make your own face
   shows on each screen, and your own face as the record Swift draws. No React Native here, so
   last-islands.test.ts runs it with plain node.

   MAKE YOUR OWN FACE'S WREN. React Native drew <WrenBird size={makeFaceWrenSize(screen)}
   mood={WREN_MOOD[screen]}> (screens/make-face/MakeFaceNative, modules/kindredly-ui/src/
   MakeFace.tsx): curious at 72 asking (intro, rejected, failed), content at 64 painting and
   keeping (generating, signin), delighted at 56 at the end (done), nothing elsewhere. Each is a
   snapshot of her (lib/bird-images): faceCurious72, faceContent64, and the base "delight" (56,
   delight, her look: the same drawing). */

/** The screens of Make your own face (KMakeFaceScreen). */
export type FaceScreen = "intro" | "method" | "confirm" | "words" | "generating" | "result" | "done" | "rejected" | "failed" | "quota" | "signin";
/** Her pictures on Make your own face. */
export type FaceWrenPose = "faceCurious72" | "faceContent64" | "delight";
/** Every one of them, so a screen change never waits on a capture. */
export const FACE_WREN_POSES: readonly FaceWrenPose[] = ["faceCurious72", "faceContent64", "delight"];

/** Her picture on this screen; null where she isn't drawn. */
export function faceWrenPose(screen: FaceScreen): FaceWrenPose | null {
  switch (screen) {
    case "intro":
    case "rejected":
    case "failed":
      return "faceCurious72";
    case "generating":
    case "signin":
      return "faceContent64";
    case "done":
      return "delight";
    default:
      return null;
  }
}

/* YOUR OWN FACE. The Me header's and Edit profile's islands drew <AvatarImage>; with "myavatar"
   on, Swift draws faces.ts's answer for you (role kindred: a photo, a portrait, a made face, a
   snapshot of an old drawn face or the glyph — never a mosaic or a window) as KMyFace. */

/** Your face as KMeView / KEditProfileView `myFace` takes it (modules/kindredly-ui KMyFaceData). */
export type MyFaceData = { kind: "image" | "veil" | "placeholder"; uri: string; key: string; overscan: number };

/** A FaceSource for your own face as the record (a mosaic or a window, which your own face never
    is, draws the placeholder). */
export function myFaceData(s: FaceSource): MyFaceData {
  switch (s.kind) {
    case "image":
      return { kind: "image", uri: s.uri, key: s.key, overscan: s.overscan };
    case "veil":
      return { kind: "veil", uri: "", key: "", overscan: 0 };
    default:
      return { kind: "placeholder", uri: "", key: "", overscan: 0 };
  }
}
