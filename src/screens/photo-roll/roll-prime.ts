import { AppState, PixelRatio } from "react-native";
import * as MediaLibrary from "expo-media-library/legacy";
import { primeLibraryPictures } from "../../../modules/kindredly-ui";
import { ROLL_PAGE } from "./photo-roll-model";

/* THE ROLL, READ AHEAD (owner, 2026-11-12: "点写日记什么的…还是抖", on his 17 Pro: + → Diary note
   rose with "No photos yet." in it, then empty squares with their rings, then the pictures one by
   one, all while the page was still moving up).
   ────────────────────────────────────────────────────────────────────────
   When the + opens, the roll's first page is read from the phone's library and its first
   pictures are drawn into the Swift loader's memory at the size the roll's cells ask for, so
   when Diary note is chosen the roll rises already whole. Only where the phone has already said
   yes to the whole library (never asks: the roll asks, once, when it opens; and not with access to
   selected photos only, where the launch's first read of the library can bring up iOS's own
   "Select more photos" alert, which belongs over the roll, not over the +); nothing leaves the
   phone, and nothing is copied (the roll reads in place). Each opening of the + reads again (a
   photo taken a moment ago is in it), the read is fresh for a minute and handed over once
   (takePrimed), and leaving the app drops it; a roll that opens before the read has answered
   reads for itself as before, and that late read is dropped. */

export type RollFrame = { id: string; uri: string; w: number; h: number; video: boolean; duration: number };

/** one library asset as the roll keeps it */
export function frameOf(a: MediaLibrary.Asset): RollFrame {
  return { id: a.id, uri: a.uri, w: a.width, h: a.height, video: a.mediaType === "video", duration: a.duration || 0 };
}

export type PrimedRoll = { at: number; perm: "granted" | "limited"; frames: RollFrame[]; cursor: string | undefined; more: boolean };

const FRESH_MS = 60_000;
/** the pictures warmed: the first rows a roll shows (five rows of three, and the next row or two) */
const WARM = 21;
/** the roll's gap between cells (KPhotoRollScreen.gap) */
const GAP = 2;

let primed: PrimedRoll | null = null;
let priming = false;
/* bumped each time a roll takes (or finds nothing to take), so a read still on its way is dropped
   rather than handed to the next roll as if it were new */
let epoch = 0;

/* gone to the background: whatever happens to the library out there (the camera, a deletion) is
   read when the + opens again */
AppState.addEventListener("change", (st) => {
  if (st === "background") {
    primed = null;
    epoch += 1;
  }
});

/** A cell's side in pixels for a roll this wide: what KImage will ask the loader for. */
function cellPixels(rollWidth: number): number {
  const side = (rollWidth - 2 * GAP) / 3;
  return side > 0 ? Math.ceil(side * PixelRatio.get()) : 0;
}

function warm(frames: RollFrame[], rollWidth: number): void {
  const px = cellPixels(rollWidth);
  if (px > 0) primeLibraryPictures(frames.slice(0, WARM).map((f) => f.uri), px);
}

/**
 * Read the roll's first page and warm its first pictures, if the phone has already allowed the
 * whole library. `rollWidth` is the width the roll will have: the window less what a page keeps
 * clear (a folding phone's band and column), so the warmed pictures are the size its cells ask for.
 */
export function primeRoll(rollWidth: number): void {
  if (priming) return;
  priming = true;
  const mine = epoch;
  void (async () => {
    try {
      const p = await MediaLibrary.getPermissionsAsync(false);
      if (!p.granted || p.accessPrivileges === "limited") return;
      const r = await MediaLibrary.getAssetsAsync({
        first: ROLL_PAGE,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      if (mine !== epoch) return; // a roll opened meanwhile and read for itself
      const frames = r.assets.map(frameOf);
      primed = { at: Date.now(), perm: "granted", frames, cursor: r.endCursor, more: r.hasNextPage };
      warm(frames, rollWidth);
    } catch (e) {
      // said, not swallowed: the roll then simply reads for itself
      console.warn("[journal-pick] the roll wasn't read ahead:", e);
    } finally {
      priming = false;
    }
  })();
}

/** The roll read ahead, if there is a fresh one: handed over once. */
export function takePrimed(): PrimedRoll | null {
  epoch += 1;
  const p = primed;
  primed = null;
  return p && Date.now() - p.at < FRESH_MS ? p : null;
}
