import { useEffect, useMemo, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { t, useLang } from "./i18n";
import { localeTag, penPalName } from "./format";
import { useTheme } from "./theme";
import { keptThreads, readThreadsCache, subscribeKeptThreads, type ThreadSummary } from "./db";
import { useIdentityOn, useMarks } from "./identity";
import { identitySwitch } from "./identity-core";
import { remoteSurfaces } from "./surfaces";
import { strangerNamer, type ThreadOrderKey } from "./stranger-name";
import { whoBook, type WhoBook } from "./stranger-who";
import "../data/strings-identity";

/* THE BOOK OF WHO STRANGERS ARE, FOR A SCREEN (identity Phase 1).
   ────────────────────────────────────────────────────────────────────────
   The React Native glue over lib/stranger-who (which decides everything
   and is node-tested through every model's tests). useWhoBook() gathers
   the five facts a book needs and rebuilds it only when one of them moves:

   1. THE SWITCH: lib/identity useIdentityOn (the app_surfaces row, or the
      dev preview). Off, the book is today's penPalName and mosaic, and it
      asks nobody anything.
   2. THE READER'S LIST, for the courier names: the threads the screen
      already holds (Kindreds passes its own, demo rows included), else the
      kept list lib/db holds for every screen (a chat, the reader, the desk,
      the blocked list), followed as it changes. Oldest thread first, salt
      1…15 only on an exact repeat (lib/stranger-name).
   3. THE MARKS: lib/identity useMarks for the strangers the screen shows —
      asked once per set, cached for the session, NO_MARKS until they land
      (and for good before the owner runs 0034).
   4. THE THEME: Midnight's frost tones on a dark theme.
   5. THIS DEVICE'S FIRST LAUNCH WITH THE SWITCH ON, for the fourteen days
      of "was No. 4481" (plan §1 2a). Kept on the device, not the account
      (the plan counts from the device's first launch after the switch),
      written once the TABLE's switch is seen on. The dev preview never
      writes it: previewing on starts its own fourteen days in memory, for
      this run of the app only, so the dev pages show the "was" lines. */

const FIRST_ON_KEY = "kindredly_identity_first_on";
/* undefined = not read from the device yet; null = read, and never on here */
let firstOnAt: number | null | undefined = undefined;
let reading: Promise<void> | null = null;
/* the dev preview's own first moment on, in memory only */
let previewFirstOn: number | null = null;
const firstOnListeners = new Set<() => void>();
const firstOnChanged = () => firstOnListeners.forEach((f) => f());
const subscribeFirstOn = (f: () => void) => {
  firstOnListeners.add(f);
  return () => {
    firstOnListeners.delete(f);
  };
};

function readFirstOn(): Promise<void> {
  if (firstOnAt !== undefined) return Promise.resolve();
  reading ??= (async () => {
    let v: number | null = null;
    try {
      const raw = await AsyncStorage.getItem(FIRST_ON_KEY);
      const n = raw ? Number(raw) : NaN;
      v = Number.isFinite(n) && n > 0 ? n : null;
    } catch (e) {
      console.log("[who] the first day with names couldn't be read; no 'was' lines for now:", e);
    }
    if (firstOnAt === undefined) firstOnAt = v;
    firstOnChanged();
  })();
  return reading;
}

/* the table's switch is on: the first time ever on this device, note the moment */
function noteTableOn(): void {
  if (firstOnAt !== null) return; // not read yet (the read lands first), or already kept
  const now = Date.now();
  firstOnAt = now;
  firstOnChanged();
  AsyncStorage.setItem(FIRST_ON_KEY, String(now)).catch((e) => console.log("[who] the first day with names couldn't be kept:", e));
}

/** This device's first launch with the switch on (ms), or null: not known yet, or never on. The dev preview has its own, in memory. */
export function useIdentityFirstOn(on: boolean): number | null {
  const kept = useSyncExternalStore(subscribeFirstOn, () => firstOnAt);
  const table = on && identitySwitch(remoteSurfaces(), null);
  useEffect(() => {
    void readFirstOn();
  }, []);
  useEffect(() => {
    if (table && kept === null) noteTableOn();
  }, [table, kept]);
  if (!on) return null;
  if (table) return kept ?? null;
  previewFirstOn ??= Date.now(); // the dev preview (never saved)
  return previewFirstOn;
}

const NONE: readonly string[] = [];

/** The reader's list as stranger-name orders it: a closed account's side takes no name. */
export const orderKeys = (threads: readonly ThreadSummary[]): ThreadOrderKey[] =>
  threads.map((th) => ({ id: th.id, createdAt: th.createdAt ?? null, other: th.gone ? null : th.other }));

/**
 * A screen's book of who strangers are (lib/stranger-who): hand it to the
 * pure models. `threads` is the reader's list when the screen holds one
 * (else the kept list); `uids` are the strangers whose ♀/♂ and sign to ask
 * for (none asked when the switch is off). Re-renders when the switch, the
 * language, the theme, the list or an answer moves.
 */
export function useWhoBook(o: { threads?: readonly ThreadSummary[] | null; uids?: readonly (string | null | undefined)[] } = {}): WhoBook {
  const on = useIdentityOn();
  const lang = useLang();
  const { dark } = useTheme();
  const kept = useSyncExternalStore(subscribeKeptThreads, keptThreads);
  useEffect(() => {
    if (on && !o.threads) void readThreadsCache();
  }, [on, o.threads]);
  const list = o.threads ?? kept;
  const namer = useMemo(() => (on ? strangerNamer(orderKeys(list ?? []), lang) : null), [on, list, lang]);
  const marks = useMarks(o.uids ?? NONE);
  const firstOnAt = useIdentityFirstOn(on);
  return useMemo(
    () => whoBook({ identity: on, t, penPal: (uid, opts) => penPalName(uid, opts), lang, namer, locale: localeTag(), marks, dark, firstOnAt }),
    [on, lang, namer, marks, dark, firstOnAt],
  );
}
