import { scoped as AsyncStorage } from "./scoped-store";

/* WHAT SHE HAS ALREADY LEFT ON THE TABLE — per room, on this phone.
   ────────────────────────────────────────────────────────────────────────
   The rule (owner, 2026-09-20): a notice is shown for ONE visit. You open
   the room, it is there at the foot; you leave, it is gone, and it does
   not come back unless she has something new to say (a different word,
   a different pattern — a different id). An × takes it away on the spot.
   Before this a notice stayed forever, and a thing that never leaves the
   table stops being noticed. */

const KEY = "kindredly_notice_seen";
type Ledger = Record<string, string[]>; // thread id → notice ids seen

export async function readNoticesSeen(threadId: string): Promise<string[]> {
  try {
    const l = JSON.parse((await AsyncStorage.getItem(KEY)) || "{}") as Ledger;
    return l[threadId] || [];
  } catch {
    return [];
  }
}

export async function markNoticeSeen(threadId: string, noticeId: string): Promise<void> {
  try {
    // a queued read-decide-write (scoped.update): marks made together no longer drop each other
    await AsyncStorage.update(KEY, (raw) => {
      let l: Ledger = {};
      try {
        l = raw ? (JSON.parse(raw) as Ledger) : {};
      } catch {
        l = {};
      }
      const cur = l[threadId] || [];
      if (cur.includes(noticeId)) return { result: undefined };
      return { next: JSON.stringify({ ...l, [threadId]: [...cur, noticeId].slice(-40) }), result: undefined };
    });
  } catch {
    /* it will be shown once more; the smaller failure */
  }
}
