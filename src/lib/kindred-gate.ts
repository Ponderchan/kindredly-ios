import { fetchThreads } from "./db";

/* THE ONE GATE IN THE PRODUCT.
   ────────────────────────────────────────────────────────────────────────
   Your first kindred is free and always will be. It costs at least ten
   letters and several days to reach, and a person who has been through
   that has met the product properly — which is exactly why the wall goes
   AFTER it and nowhere earlier. Nothing before this point is ever gated:
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

export const FREE_KINDREDS = 1;

export async function kindredGate(
  premium: boolean,
  threadId: string,
): Promise<{ allowed: boolean; have: number }> {
  if (premium) return { allowed: true, have: 0 };
  const t = await fetchThreads();
  // this thread doesn't count itself — it isn't revealed yet
  const have = (t || []).filter((x) => x.revealed && x.id !== threadId).length;
  return { allowed: have < FREE_KINDREDS, have };
}
