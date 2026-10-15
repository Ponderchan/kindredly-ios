import { useEffect, useRef, useSyncExternalStore } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { getAvatar } from "../data/avatar-lib";
import { FACE_SNAPSHOT_PT, facesVersion, pendingFaceSnapshots, settleFaceSnapshot, subscribeFaces, type FaceSnapKey } from "../lib/faces";
import { avatarFor } from "../lib/format";

/* FACES THAT EXIST ONLY AS REACT NATIVE DRAWINGS, RENDERED FOR SWIFT.
   ────────────────────────────────────────────────────────────────────────
   The thirty hand-drawn faces (avatar-lib) and the glyph fallback
   (StrangerAvatar) are SVG strings; SwiftUI can't draw them. When a Swift
   screen asks lib/faces for one, it lands in the pending set; this
   component draws it offscreen, square and full-bleed (KFace does the
   clipping, round or not), captures it to a tmp PNG with view-shot, and
   hands the file back. A few at a time, so a list of forty faceless
   kindreds doesn't mount forty SVGs at once.

   Mounted inside BirdSnapshots (itself in the root layout), so it is
   always there and the root layout needs no edit of its own. */

const BATCH = 8;
/* the SVG is laid out on the first frame and drawn on a later one: wait
   two frames and a beat before capturing, or the file can come out blank */
const settle = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))));

export function FaceSnapshots() {
  useSyncExternalStore(subscribeFaces, facesVersion, facesVersion);
  const shown = pendingFaceSnapshots().slice(0, BATCH);
  return (
    <>
      {shown.map((k) => (
        <FaceShot key={k} snap={k} />
      ))}
    </>
  );
}

function FaceShot({ snap }: { snap: FaceSnapKey }) {
  const ref = useRef<View>(null);
  const laid = useRef(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const capture = async () => {
    if (laid.current) return;
    laid.current = true;
    await settle();
    if (!live.current || !ref.current) return;
    let uri: string | null = null;
    try {
      uri = await captureRef(ref.current, { format: "png", quality: 1, result: "tmpfile" });
    } catch (e) {
      if (__DEV__) console.warn("[FaceSnapshots] capture failed:", snap, String((e as Error)?.message ?? e));
    }
    settleFaceSnapshot(snap, uri);
    // a failure under the limit stays pending — and this view stays mounted, so try again from here
    if (!uri && live.current && pendingFaceSnapshots().includes(snap)) {
      setTimeout(() => {
        laid.current = false;
        if (live.current) void capture();
      }, 400);
    }
  };

  const s = FACE_SNAPSHOT_PT;
  return (
    <View ref={ref} collapsable={false} onLayout={() => void capture()} style={{ width: s, height: s, overflow: "hidden" }}>
      <FaceArt snap={snap} size={s} />
    </View>
  );
}

/* the same drawings AvatarImage and StrangerAvatar make, without their
   rounding: a square the full size of the file */
function FaceArt({ snap, size }: { snap: FaceSnapKey; size: number }) {
  if (snap.startsWith("svg:")) {
    const a = getAvatar(snap.slice(4));
    // AvatarImage lays these on white; the file's own ground is a rounded rect inside it
    return <View style={{ width: size, height: size, backgroundColor: "#FFFFFF" }}>{a ? <SvgXml xml={a.xml} width={size} height={size} /> : null}</View>;
  }
  const { glyph, fg, bg } = avatarFor(snap.slice(6) || "anon");
  const g = size * 0.64;
  const xml = `<svg width="${g}" height="${g}" viewBox="0 0 24 24"><g fill="${fg}" stroke="${fg}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
  return (
    <View style={{ width: size, height: size, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <SvgXml xml={xml} width={g} height={g} />
    </View>
  );
}
