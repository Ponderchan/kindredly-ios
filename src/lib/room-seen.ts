import { scoped as AsyncStorage } from "./scoped-store";

/* WHAT YOU HAVE READ OF THEM — per correspondence, on this phone.
   ────────────────────────────────────────────────────────────────────────
   The server counts their letters (threads.a_count / b_count); it does
   not know which of them you have opened. So the last count you saw is
   kept here, written the moment a room is open in front of you, and the
   difference is what the Kindreds tab can honestly call unread. A room
   never opened reads as caught up (nothing is claimed for a number nobody
   has seen), and a count that shrank — a deleted letter — is not owed. */

const KEY = "kindredly_room_seen";
type Ledger = Record<string, number>;

export async function readRoomSeen(): Promise<Ledger> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || "{}") as Ledger;
  } catch {
    return {};
  }
}

export async function markRoomSeen(threadId: string, theirs: number): Promise<void> {
  try {
    const l = await readRoomSeen();
    if (l[threadId] === theirs) return;
    l[threadId] = theirs;
    await AsyncStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    /* a missed mark shows one badge too many, once */
  }
}

/** their letters you have not had in front of you — 0 for a room never opened */
export const unreadOf = (l: Ledger, threadId: string, theirs: number): number => (threadId in l ? Math.max(0, theirs - l[threadId]) : 0);
