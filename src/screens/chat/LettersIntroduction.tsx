import { useRouter } from "expo-router";
import { Introduction } from "../../components/Introduction";
import { archNameThird } from "../../lib/aura-copy";
import { t } from "../../lib/i18n";
import type { LettersModel } from "./useLettersModel";
import { useSignedSides } from "./useSignedSides";

/* THE PEN-PAL CHAT'S INTRODUCTION, for both renderers (identity Phase 2 split it out of
   ConversationNative and LettersRN, where the same block stood twice). useLettersModel runs the
   ceremony for whoever signs second, on the spot, and for the first signer when the reveal
   reaches the chat (useCeremony); this draws it. One component, so the SwiftUI conversation and
   the React Native fallback can't drift — the room's twin is RoomIntroduction.

   Owned by the ceremony work (PHASE2.md): the signatures, the frost wipe and the snapshot that
   was actually sent go in here and in components/Introduction(+Ritual); the two screens only
   place it. TALK TO opens the room in place of the chat.

   Identity on: what each side signed (useSignedSides — the published row's
   snapshot, else what the sheet just sent, `signedNow`) goes in as
   `signed`, and a held signature is reported about the other side of this
   thread; a block closes the ceremony for Kindreds. Off: today's ritual. */
export function LettersIntroduction({
  m,
}: {
  m: Pick<LettersModel, "id" | "ceremony" | "setCeremony" | "wren" | "detail" | "read" | "road" | "kindredNotice" | "myName" | "since" | "auth" | "identity" | "signedNow">;
}) {
  const router = useRouter();
  const detail = m.detail;
  const signed = useSignedSides(detail, { identity: m.identity, id: m.id, signedNow: m.signedNow });
  return (
    <Introduction
      open={m.ceremony}
      wren={m.wren}
      otherSeed={detail?.other || "anon"}
      otherFace={detail?.otherFace ?? null}
      otherName={detail?.otherName || t("cm.kindred")}
      otherArchetype={m.read?.archetype ? archNameThird(m.read.archetype.id) : null}
      myName={m.myName}
      road={m.road}
      mySeed={m.auth.user?.id || "me"}
      myFace={(m.auth.profile?.avatarId as string) || null}
      notice={m.kindredNotice}
      since={m.since}
      stamp={detail?.stamp ?? null}
      signed={signed}
      report={{
        threadId: m.id,
        targetUser: detail && !detail.gone ? detail.other : null,
        onBlocked: () => {
          m.setCeremony(false);
          router.replace("/(tabs)/kindreds");
        },
      }}
      onClose={() => m.setCeremony(false)}
      onTalk={() => {
        m.setCeremony(false);
        router.replace(`/room/${m.id}`);
      }}
    />
  );
}
