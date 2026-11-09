/* last-islands: Make your own face's Wren per screen, and your own face as Swift's record. Run by hand: node src/lib/last-islands.test.ts */
import { FACE_WREN_POSES, faceWrenPose, myFaceData, type FaceScreen } from "./last-islands.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };

/* React Native's sizes (modules/kindredly-ui/src/MakeFace.tsx makeFaceWrenSize) and moods
   (screens/make-face/MakeFaceNative WREN_MOOD), written out: each pose must be that drawing */
const RN: Record<FaceScreen, { size: number; mood: string }> = {
  intro: { size: 72, mood: "curious" },
  rejected: { size: 72, mood: "curious" },
  failed: { size: 72, mood: "curious" },
  generating: { size: 64, mood: "content" },
  signin: { size: 64, mood: "content" },
  done: { size: 56, mood: "delight" },
  method: { size: 0, mood: "content" },
  confirm: { size: 0, mood: "content" },
  words: { size: 0, mood: "content" },
  result: { size: 0, mood: "content" },
  quota: { size: 0, mood: "content" },
};
/* lib/bird-images BIRD_POSES for the three, written out */
const POSE: Record<string, { size: number; mood: string }> = {
  faceCurious72: { size: 72, mood: "curious" },
  faceContent64: { size: 64, mood: "content" },
  delight: { size: 56, mood: "delight" },
};
for (const screen of Object.keys(RN) as FaceScreen[]) {
  const pose = faceWrenPose(screen);
  const rn = RN[screen];
  if (rn.size === 0) ok(`${screen}: no Wren`, pose === null);
  else ok(`${screen}: ${rn.mood} at ${rn.size}`, !!pose && POSE[pose].size === rn.size && POSE[pose].mood === rn.mood);
}
ok("every pose a screen shows is asked for up front", (Object.keys(RN) as FaceScreen[]).every((s) => faceWrenPose(s) === null || FACE_WREN_POSES.includes(faceWrenPose(s)!)));

ok("a picture is passed through", JSON.stringify(myFaceData({ kind: "image", uri: "file:///a.png", key: "k", overscan: 0.05 })) === '{"kind":"image","uri":"file:///a.png","key":"k","overscan":0.05}');
ok("a picture on its way is the placeholder", myFaceData({ kind: "placeholder" }).kind === "placeholder");
ok("no one is the veil", myFaceData({ kind: "veil" }).kind === "veil");
ok("a mosaic (never yours) draws the placeholder", myFaceData({ kind: "mosaic", mask: 5 }).kind === "placeholder");

if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
console.log("all ok");
