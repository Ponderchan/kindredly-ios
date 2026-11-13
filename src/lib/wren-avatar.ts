import { assetImageRef } from "./images";

/* WREN'S AVATAR (assets/wren-avatar.png, design/app-icon-wren/blue/make-avatar-front.mjs): her
   front-on face, the one Kindreds' list, her room's header and the empty Kindreds page's desk card
   draw. It is a bundled picture that has to be resolved to a file before Swift can draw it, so the
   first visit after a launch used to start on her old bird and swap (found in the pre-1.0.9 sweep,
   2026-11-13). The root resolves it once at launch (prefetchWrenAvatar); by the time a page asks,
   useAssetImageRef has it on its first frame. */

/** her avatar's module, for useAssetImageRef */
export const WREN_AVATAR: number = require("../../assets/wren-avatar.png");

/** resolve her avatar once, at launch: the pages that draw it then have it on their first frame */
export function prefetchWrenAvatar(): void {
  assetImageRef(WREN_AVATAR).catch((e) => {
    if (__DEV__) console.warn("[wren-avatar] not resolved at launch (the pages resolve it themselves):", e);
  });
}
