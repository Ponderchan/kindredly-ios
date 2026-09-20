import { fetchThreads } from "./db";
import { isExpired } from "./kindred-expiry";

/* THE ONE GATE IN THE PRODUCT.
   ────────────────────────────────────────────────────────────────────────
   Your first kindreds are free and always will be. Each costs at least
   ten letters and several days to reach, and a person who has been
   through that has met the product properly — which is exactly why the
   wall goes AFTER them and nowhere earlier. Nothing before this point is ever gated:
   writing, being matched, reading, replying, the aura, the keepsakes, her
   whole room.

   The check runs BEFORE you enclose your name, not after. Blocking at the
   moment of reveal would mean signing something that silently doesn't
   arrive, and leaving the other person waiting on a signature that was
   taken from them by a paywall.

   KNOWN HOLE, ACCEPTED FOR NOW: if you sign first while you have no
   kindreds, gain one elsewhere, and only then have this one sign back,
   the reveal lands server-side and you keep both. Closing it properly
   means moving the rule into signThread's RPC (a migration). Erring
   generous is the right side to err on. */

/* three, not one — the owner's call on 2026-09-19: five letters each way
   should be able to become a kindred a few times over before the fare
   stands in the road */
export const FREE_KINDREDS = 3;

export async function kindredGate(
  premium: boolean,
  threadId: string,
): Promise<{ allowed: boolean; have: number }> {
  if (premium) return { allowed: true, have: 0 };
  const t = await fetchThreads();
  /* this thread doesn't count itself — it isn't revealed yet. A kindred
     who closed their account doesn't count either, and nor does one
     whose room has expired (lib/kindred-expiry) — the seat is free again: the free one is a
     person you can still write to, and the Kindreds page already stops
     listing them. Found by the owner on 2026-09-19 — his one kindred had
     deleted their account, and the next name exchange hit the fare. */
  const have = (t || []).filter((x) => x.revealed && !x.gone && x.id !== threadId && !isExpired(x.lastAt, false)).length;
  return { allowed: have < FREE_KINDREDS, have };
}
