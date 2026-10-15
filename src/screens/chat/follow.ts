/* WHEN A REACT NATIVE CONVERSATION GOES TO ITS END (10a step 5, slice chat-rn).
   ────────────────────────────────────────────────────────────────────────
   The SwiftUI conversation follows its newest line with the .sizeChanges
   anchor, only while the reader is at the end (the 0b spike). The screens
   that stay React Native — the room and chat fallbacks (RoomRN, LettersRN)
   and Wren's desk — had their own rule, and it was wrong two ways:

   · any growth jumped to the end (onContentSizeChange always scrolled), so
     a guide reel or a picture finishing its layout, MORE chips opening, a
     translation landing, yanked someone reading further up back down
     (spec bug 10);
   · the keyboard, the trace tray and a growing composer shrank the list
     without changing its content, so onContentSizeChange never fired and
     the newest line went under them (spec bug 9).

   One rule now, for all three, pure so `node src/screens/chat/follow.test.ts`
   holds it still:

     first content                → to the end at once (opening at the newest)
     older rows went in above     → stay (the window grew at the top)
     an own send / a local answer
       / a linked guide asked     → to the end, gliding
     anything else, at the end    → follow: content glides, a smaller
                                    viewport (keyboard, tray, composer) jumps
     anything else, reading above → stay where you are

   "At the end" is what the reader was before the change (the screens keep
   it from the last scroll event), within 60pt — room/[id].tsx's old
   threshold, and the SwiftUI kit's. */

/** within this many points of the end counts as at the end */
export const AT_BOTTOM_PT = 60;

/** Whether a scroll position is at the end of its content. */
export function atBottomOf(m: { contentHeight: number; offsetY: number; viewportHeight: number }): boolean {
  return m.contentHeight - (m.offsetY + m.viewportHeight) < AT_BOTTOM_PT;
}

export type FollowFacts = {
  /** what changed: the content's size (rows, pictures, reels, a translation) or the visible
      height (the keyboard, the tray, the composer growing) */
  event: "content" | "viewport";
  /** the list has been brought to its end once already (its first paint) */
  painted: boolean;
  /** there is something to show */
  hasContent: boolean;
  /** the reader was at the end before this change */
  atBottom: boolean;
  /** an own send, a local answer or a linked guide asked to be shown */
  ownPending: boolean;
  /** older rows went in above (a render window grew at the top) */
  prepended?: boolean;
};

/** none: stay · jump: to the end at once · glide: to the end, animated */
export type Follow = "none" | "jump" | "glide";

/** What a change does to the scroll position (see the table above). */
export function follow(f: FollowFacts): Follow {
  if (!f.hasContent) return "none";
  if (!f.painted) return "jump";
  if (f.ownPending) return "glide";
  if (f.prepended) return "none";
  if (f.atBottom) return f.event === "viewport" ? "jump" : "glide";
  return "none";
}

/** Whether an own-send request is spent by this change: once the list went to its end for it
    (a viewport change alone doesn't spend it — the line it waits for hasn't arrived). */
export function spendsOwn(f: FollowFacts, result: Follow): boolean {
  return f.ownPending && result !== "none" && f.event === "content";
}
