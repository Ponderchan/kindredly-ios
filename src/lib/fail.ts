import { Alert } from "react-native";
import "../data/strings-step5-data";
import { t } from "./i18n";
import { lastWriteFail, type WriteFail } from "./db";
import { isRefusal } from "./thread-detail-core";

/* "TRY AGAIN" IS ADVICE, AND IT WAS OFTEN WRONG. Every failed write in the
   app raised the same dialog, whether the row had been refused, the request
   had timed out, or the phone had simply been in a tunnel. The first two are
   worth a retry; the third is worth putting the phone down, and telling
   someone to keep tapping SEND in a lift is the interface wasting their
   time. The words a screen already wrote for its own failure stay — this
   only steps in front of them when we know the retry can't help.

   Step 5 (10a): the same goes for refusals. A letter taken back, a writer
   who left, a block, a suspended account, an expired session — each used
   to read "try again" forever (critic, Today). They now get their own
   words; gone and blocked share theirs, so nobody learns they were
   blocked. */

/** where the write happened, which picks the words for gone/blocked:
    `reply` = answering a pool letter (Today, the reader's first reply);
    `thread` / `write` = anything else (a room, a chat, a fold, a sign). */
export type FailContext = "reply" | "thread" | "write";

/** gone / blocked / suspended: no retry can change it (remove the letter, close the composer) */
export { isRefusal };
export type { WriteFail };

/**
 * The words for a write failure that knows better than "try again", or
 * null when the screen's own words should stand (timeout, denied, server,
 * or no failure recorded).
 * - offline   → net.offline.*
 * - session   → cp.signin.* (sign in again)
 * - suspended → fail.suspended.*
 * - gone / blocked → ld.unreachable.* for `reply`, fail.closed.* otherwise
 */
export function failCopy(kind: WriteFail | null | undefined, context: FailContext = "write"): { title: string; body: string } | null {
  switch (kind) {
    case "offline":
      return { title: t("net.offline.title"), body: t("net.offline.body") };
    case "session":
      return { title: t("cp.signin.title"), body: t("cp.signin.body") };
    case "suspended":
      return { title: t("fail.suspended.title"), body: t("fail.suspended.body") };
    case "gone":
    case "blocked":
      return context === "reply"
        ? { title: t("ld.unreachable.title"), body: t("ld.unreachable.body") }
        : { title: t("fail.closed.title"), body: t("fail.closed.body") };
    default:
      return null;
  }
}

export interface AlertFailOptions {
  /** picks the gone/blocked words (see FailContext); default 'write' */
  context?: FailContext;
  /** when given, an expired session's alert carries a "Sign in" button that calls it */
  onSignIn?: () => void;
}

/**
 * Alert a failed write. Reads lastWriteFail() (so call it right after the
 * write that failed): when the reason has better words (failCopy) they
 * replace `title`/`body`; otherwise the screen's own words show. Screens
 * that must also act on a refusal (Today removes the letter) check
 * isRefusal(lastWriteFail()) themselves.
 */
export function alertFail(title: string, body: string, opts: AlertFailOptions = {}): void {
  const kind = lastWriteFail();
  const copy = failCopy(kind, opts.context);
  if (!copy) {
    Alert.alert(title, body);
    return;
  }
  if (kind === "session" && opts.onSignIn) {
    Alert.alert(copy.title, copy.body, [
      { text: t("fail.notNow"), style: "cancel" },
      { text: t("cp.signin.title"), onPress: opts.onSignIn },
    ]);
    return;
  }
  Alert.alert(copy.title, copy.body);
}
