import { scoped as AsyncStorage } from "./scoped-store";
import { parseOr } from "./scoped-update-core";

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

/* Every mark is a queued read-decide-write on the account's key (scoped.update): a room, her desk
   and a thread's detail marking in the same moment used to read the same ledger, and the later
   write threw the others' marks away (owner, 2026-11-13: Wren's posts all unread again after a
   sign-in). */
const ledgerOf = (raw: string | null): Ledger => {
  const o = parseOr<unknown>(raw, {});
  return o && typeof o === "object" && !Array.isArray(o) ? { ...(o as Ledger) } : {};
};

export async function markRoomSeen(threadId: string, theirs: number): Promise<void> {
  try {
    const changed = await AsyncStorage.update(KEY, (raw) => {
      const l = ledgerOf(raw);
      if (l[threadId] === theirs) return { result: false };
      l[threadId] = theirs;
      return { next: JSON.stringify(l), result: true };
    });
    if (changed) void import("./app-badge").then((m) => m.syncAppBadge());
  } catch (e) {
    /* a missed mark shows one badge too many, once */
    console.warn("[room-seen] a room wasn't marked seen:", e);
  }
}

/* MARK AS UNREAD (owner, 2026-10-10): the person's own choice, from the
   row's long-press. Their newest letter counts as unopened again; nothing
   leaves this phone and nobody is told. Opening the room clears it, as
   ever. */
export async function markRoomUnread(threadId: string, theirs: number): Promise<void> {
  if (theirs < 1) return;
  try {
    await AsyncStorage.update(KEY, (raw) => {
      const l = ledgerOf(raw);
      l[threadId] = theirs - 1;
      return { next: JSON.stringify(l), result: undefined };
    });
    void import("./app-badge").then((m) => m.syncAppBadge());
  } catch (e) {
    /* the row simply stays read */
    console.warn("[room-seen] a room wasn't marked unread:", e);
  }
}

/** their letters you have not had in front of you — 0 for a room never opened */
export const unreadOf = (l: Ledger, threadId: string, theirs: number): number => (threadId in l ? Math.max(0, theirs - l[threadId]) : 0);
