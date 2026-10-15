import { Introduction } from "../../components/Introduction";
import { archNameThird } from "../../lib/aura-copy";
import { useAuth } from "../../lib/auth";
import { t } from "../../lib/i18n";
import type { RoomModel } from "./useRoomModel";

/* THE ROOM'S INTRODUCTION, for both renderers (10a step 5). useRoomModel runs
   the first signer's ceremony for a recent reveal (useCeremony, recentOnly)
   and writes the thread into the once-per-phone ledger as it does, so
   whichever renderer draws the room — the SwiftUI conversation
   (ConversationNative) or the React Native fallback (RoomRN) — MUST draw
   this, or the ceremony is spent unseen and chat can't show it later
   either (the ledger is shared). One component, so the two can't drift.

   TALK TO only closes it: the reader is already in the room. */
export function RoomIntroduction({ m }: { m: Pick<RoomModel, "ceremony" | "setCeremony" | "wren" | "detail" | "read" | "road" | "kindredNotice"> }) {
  const auth = useAuth();
  const detail = m.detail;
  return (
    <Introduction
      open={m.ceremony}
      wren={m.wren}
      otherSeed={detail?.other || "anon"}
      otherFace={detail?.otherFace ?? null}
      otherName={detail?.otherName || t("cm.kindred")}
      otherArchetype={m.read?.archetype ? archNameThird(m.read.archetype.id) : null}
      myName={auth.handle || t("in.meFallback")}
      road={m.road}
      mySeed={auth.user?.id || "me"}
      myFace={(auth.profile?.avatarId as string) || null}
      notice={m.kindredNotice}
      // the day the names met (0020 revealed_at), not today
      since={detail?.revealedAt ?? new Date().toISOString()}
      stamp={detail?.stamp ?? null}
      onClose={() => m.setCeremony(false)}
      // already in the room
      onTalk={() => m.setCeremony(false)}
    />
  );
}
