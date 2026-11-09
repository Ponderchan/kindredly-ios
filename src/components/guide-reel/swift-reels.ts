import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui/src/available";
import type { KReelSpec } from "../../../modules/kindredly-ui/src/Reel";
import { armNative, clearNative, disarmNative, useNativeSurface } from "../../lib/surfaces";
import { useBirdImageRefs, type BirdPose } from "../../lib/bird-images";
import { useAssetImageRefs, type ImageRefRecord } from "../../lib/images";
import { useLang } from "../../lib/i18n";
import type { Reel } from "./kit";
import { reel as letters } from "./letters";
import { reel as kindreds } from "./kindreds";
import { reel as aura } from "./aura";
import { reel as stamps } from "./stamps";
import { reel as sealed } from "./sealed";
import { reel as courier } from "./courier";
import { reel as v105 } from "../news-reel/v1-0-5";
import { REEL_BUILDS } from "./swift-reel-data";

/* THE REELS IN SWIFT, FROM TS (2026-11-09, behind the "reels" switch, off by default).
   ────────────────────────────────────────────────────────────────────────
   A reel in Wren's room (a guide's, a release's "what's new") is a React Native square
   (ReelSquare) of scenes drawn from the product's React Native parts. With the switch on, and
   the binary carrying the Swift player (KReelView), a reel Swift has been taught is drawn by
   SwiftUI instead (modules/kindredly-ui Portable/Reels: KReelSquare and one file a reel):
   - inside the Swift room (screens/wren-room/WrenRoomNative) the card draws it itself from the
     spec on its record, and that card's island is left out;
   - anywhere else ReelSquare is used (GuideCard in the React Native room, NewsCard, the dev
     news-preview) ReelSquare puts the Swift square in a small Host of its own.
   A reel Swift doesn't draw stays the React Native square (see SWIFT_REEL_IDS).

   THE SPEC. Swift has no string tables and no React Native parts, so TS hands each reel over
   whole: its id, its label, whether it plays (the screen is focused), every word it shows in
   the reader's language and the facts it draws from (frosted windows, signatures, sticker
   looks…) as one JSON string (swift-reel-data: one builder a reel), and its pictures by name:
   Wren as snapshots of the real WrenBird (lib/bird-images reel* poses), bundled pictures as
   asset refs.

   THE GATE is useSwiftPiece's (screens/me/me-pieces), for the one key: the switch
   (useNativeSurface: the table, the dev override, the crash strikes), the binary's marker view
   (KReelView), and the crash breadcrumb: the first time a Swift reel shows in a process its
   mark is written (armNative) before Swift is told to draw it, and cleared once it has stood
   3 s (or 1 s after it goes, or when the app leaves the front). Until the mark lands the React
   Native square draws. */

/** each reel object by the id Swift knows it by (news-preview's one-scene reels are none of them) */
const REEL_IDS = new Map<Reel, string>([
  [letters, "letters"],
  [kindreds, "kindreds"],
  [aura, "aura"],
  [stamps, "stamps"],
  [sealed, "sealed"],
  [courier, "courier"],
  [v105, "news-1.0.5"],
]);

/** The reels this build's Swift player draws (Portable/Reels KReels.def). Only ever grows with a
    binary: a JS bundle may never list a reel the binary it runs on lacks. */
export const SWIFT_REEL_IDS: ReadonlySet<string> = new Set(Object.keys(REEL_BUILDS));

/** The Swift id of a reel, or null when Swift doesn't draw it. */
export const swiftReelId = (reel: Reel): string | null => {
  const id = REEL_IDS.get(reel);
  return id && SWIFT_REEL_IDS.has(id) ? id : null;
};

/* ── the gate ──────────────────────────────────────────────────────────── */

const KEY = "reels";
const VIEW = "KReelView";
const STAND_MS = 3000;
const GONE_MS = 1000;

type Arming = "arming" | "armed" | "stood";
let arming: Arming | undefined;
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

function stand(): void {
  if (arming !== "armed") return;
  arming = "stood";
  clearNative(KEY);
  armingChanged();
}

/** true = Swift draws the reels now. `showing`: a Swift-drawable reel is on screen. */
export function useSwiftReels(showing: boolean): boolean {
  const on = useNativeSurface(KEY) && isKindredlyUIViewAvailable(VIEW);
  useSyncExternalStore(subscribeArming, readArming, readArming);
  const wanted = useRef(false);
  wanted.current = on && showing;
  useEffect(
    () => () => {
      wanted.current = false;
    },
    [],
  );
  const state = arming;
  useEffect(() => {
    if (!on || !showing) return;
    if (arming === undefined) {
      // first show in this process: the mark first, then Swift
      arming = "arming";
      armNative(KEY)
        .catch((e) => console.log(`[reels] arming failed, drawing them anyway:`, e))
        .then(() => {
          if (arming !== "arming") return;
          if (wanted.current) {
            arming = "armed";
          } else {
            // gone before it could show: no strike, no forgiveness
            arming = undefined;
            disarmNative(KEY);
          }
          armingChanged();
        });
      return;
    }
    if (arming === "armed") {
      const timer = setTimeout(stand, STAND_MS);
      const sub = AppState.addEventListener("change", (a) => {
        if (a !== "active") stand();
      });
      return () => {
        clearTimeout(timer);
        sub.remove();
        setTimeout(stand, GONE_MS);
      };
    }
  }, [on, showing, state]);
  return on && (state === "armed" || state === "stood");
}

/* ── the specs ─────────────────────────────────────────────────────────── */

export type ReelAsk = { slot: string; reel: Reel; label: string };

/**
 * The Swift spec of each reel asked for, by slot (missing: the React Native square draws it).
 * @param asks the reels on show, each with its slot and its label
 * @param live the screen is focused: the reels play
 */
export function useReelSpecs(asks: readonly ReelAsk[], live: boolean): Map<string, KReelSpec> {
  const lang = useLang();
  const ids = asks.map((a) => swiftReelId(a.reel));
  const on = useSwiftReels(ids.some(Boolean));
  const wantIds = on ? Array.from(new Set(ids.filter((x): x is string => !!x))) : [];
  const idsKey = wantIds.join(",");
  // every snapshot and every bundled picture the reels on show draw, asked for once
  const poses = useMemo(() => {
    const out = new Set<BirdPose>();
    for (const id of idsKey ? idsKey.split(",") : []) Object.values(REEL_BUILDS[id].birds ?? {}).forEach((p) => out.add(p));
    return Array.from(out);
  }, [idsKey]);
  const birds = useBirdImageRefs(poses);
  const assetMods = useMemo(() => {
    const out: Record<string, number> = {};
    for (const id of idsKey ? idsKey.split(",") : []) Object.assign(out, REEL_BUILDS[id].assets ?? {});
    return out;
  }, [idsKey]);
  const assets = useAssetImageRefs(assetMods);
  // the words, once a language and a set of reels
  const datas = useMemo(() => {
    const out = new Map<string, string>();
    for (const id of idsKey ? idsKey.split(",") : []) out.set(id, JSON.stringify(REEL_BUILDS[id].data()));
    return out;
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, lang]);
  const birdSig = JSON.stringify(birds);
  const assetSig = JSON.stringify(assets);
  const askSig = asks.map((a, i) => `${a.slot}|${ids[i] ?? ""}|${a.label}`).join("\n");
  return useMemo(() => {
    const out = new Map<string, KReelSpec>();
    if (!on) return out;
    asks.forEach((a, i) => {
      const id = ids[i];
      if (!id) return;
      const b = REEL_BUILDS[id];
      const images: Record<string, ImageRefRecord> = {};
      for (const [name, pose] of Object.entries(b.birds ?? {})) {
        const r = birds[pose];
        if (r) images[name] = r;
      }
      for (const name of Object.keys(b.assets ?? {})) {
        const r = assets[name];
        if (r) images[name] = r;
      }
      out.set(a.slot, { id, label: a.label, live, data: datas.get(id) ?? "{}", images });
    });
    return out;
    // the signatures say everything the inputs hold
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, askSig, birdSig, assetSig, datas, live]);
}
