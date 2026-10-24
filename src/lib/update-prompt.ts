import { useEffect, useSyncExternalStore } from "react";
import { AppState, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { fetchWithin } from "./net";
import { readSurfaces, remoteSurfaces, subscribeSurfaces, surfacesReady } from "./surfaces";
import type { SurfaceMap } from "./surfaces-resolve";
import { localDay, parcelWaiting, parseSeen, storeVersionOf, updateAsk, type SheetSeen, type UpdateAsk } from "./update-prompt-core";

/* THE UPDATE PROMPT, FOR THE SCREENS (OTA, 2026-10-25).
   ────────────────────────────────────────────────────────────────────────
   JavaScript only, so an over-the-air update carries it to binaries 1.2.4 and 1.2.5 as they
   are. The React Native glue over lib/update-prompt-core (which decides, and is node-tested).
   Three things, all answered from memory so Today never waits on them:

   1. IS THIS PHONE ASKED TO UPDATE? The rows update_prompt / update_force in app_surfaces, read
      by lib/surfaces with the same request, throttle and phone cache as the native screens
      (remoteSurfaces). No row = off.

   2. WHICH VERSION IS WAITING? Apple's public lookup for the app (country us), asked only on a
      phone the table asks to update, at launch and on each return to the front, at most every
      six hours (ten minutes after a failure), with an 8 s deadline, and kept on the phone (raw
      AsyncStorage: it is about the binary, not the account). Failures are logged, never thrown.
      Nothing shows until that version is newer than this binary's own release (core
      parcelWaiting), so a row switched on early never asks a phone to update to itself.

   3. HAS THE SHEET BEEN SHOWN? One record per binary (raw AsyncStorage kindredly_update_seen):
      the App Store version it was shown for and the local day. The core says when it is due.

   DEV ONLY: setDevUpdatePreview("soft" | "force") turns the prompt on for this run of the app
   (never saved, ignored in release) and forgets the record in memory, so the sheet comes again
   on Today (app/update-preview has the buttons). */

/* the app's App Store id, the one in settings-model's SETTINGS_LINKS.rate */
const APP_STORE_ID = "6805318131";
/* the app's page in the App Store app */
const APP_STORE_URL = `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`;
/* the same page on the web, if the App Store app can't be opened */
const APP_STORE_WEB = `https://apps.apple.com/app/id${APP_STORE_ID}`;
const LOOKUP_URL = `https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=us`;

/* the version is a label, never worth a long wait */
const LOOKUP_MS = 8000;
const LOOKUP_FRESH_MS = 6 * 3600_000;
const LOOKUP_RETRY_MS = 10 * 60_000;

const STORE_KEY = "kindredly_store_version"; // {"version":"1.0.6","at":<epoch ms>}
const SEEN_KEY = "kindredly_update_seen"; // SheetSeen as JSON

/* the binary's own version (app.json "version", 1.2.4), as lib/surfaces reads it */
const BINARY: string | null = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;

export type UpdatePrompt = UpdateAsk & {
  /** the App Store's version ("1.0.6"), or null while unknown */
  version: string | null;
  /** that version is a newer release than this binary's own (core parcelWaiting): nothing shows until it is */
  waiting: boolean;
  /** when the sheet was last shown on this binary, or null */
  seen: SheetSeen | null;
  /** the phone's own copies have been read (the record above can be trusted) */
  ready: boolean;
};

let storeVersion: string | null = null;
let storeAt = 0;
let nextLookupAt = 0;
let lookup: Promise<void> | null = null;
let seen: SheetSeen | null = null;
let ready = false;
let localRead: Promise<void> | null = null;
let devMode: "soft" | "force" | null = null;

/* the snapshot useSyncExternalStore reads: the same object until something it holds changes */
let snap: UpdatePrompt | null = null;
let snapRemote: SurfaceMap | null = null;
const listeners = new Set<() => void>();
const changed = () => {
  snap = null;
  listeners.forEach((f) => f());
};

function snapshot(): UpdatePrompt {
  const remote = remoteSurfaces();
  if (snap && snapRemote === remote) return snap;
  const ask: UpdateAsk = __DEV__ && devMode ? { on: true, force: devMode === "force" } : updateAsk(remote);
  snapRemote = remote;
  const waiting = (__DEV__ && devMode !== null) || parcelWaiting(BINARY, storeVersion);
  snap = { ...ask, version: storeVersion, waiting, seen, ready };
  return snap;
}

const subscribe = (f: () => void) => {
  const off = subscribeSurfaces(f);
  listeners.add(f);
  return () => {
    off();
    listeners.delete(f);
  };
};

function parseStore(raw: string | null | undefined): { version: string; at: number } | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as { version?: unknown; at?: unknown } | null;
    if (c && typeof c.version === "string" && typeof c.at === "number") return { version: c.version, at: c.at };
  } catch (e) {
    console.log("[update] the stored App Store version is torn; asking Apple again:", e);
  }
  return null;
}

/* once per process: the version and the record kept on this phone */
function readLocal(): Promise<void> {
  if (!localRead)
    localRead = AsyncStorage.multiGet([STORE_KEY, SEEN_KEY])
      .then((pairs) => {
        const raw = Object.fromEntries(pairs) as Record<string, string | null>;
        const c = parseStore(raw[STORE_KEY]);
        if (c && !storeVersion) {
          storeVersion = c.version;
          storeAt = c.at;
        }
        if (!devMode) seen = parseSeen(raw[SEEN_KEY] ?? null, BINARY);
      })
      .catch((e) => console.log("[update] the phone's copies couldn't be read; the sheet counts as not shown:", e))
      .finally(() => {
        ready = true;
        changed();
      });
  return localRead;
}

/* Apple's lookup, throttled and de-duplicated; never rejects */
function refreshStoreVersion(): Promise<void> {
  const now = Date.now();
  if (lookup) return lookup;
  if (now < nextLookupAt || (storeVersion && now - storeAt < LOOKUP_FRESH_MS)) return Promise.resolve();
  lookup = (async () => {
    try {
      const res = await fetchWithin(LOOKUP_URL, undefined, LOOKUP_MS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const v = storeVersionOf(await res.json());
      if (!v) throw new Error("no version in Apple's answer");
      storeAt = Date.now();
      nextLookupAt = storeAt + LOOKUP_FRESH_MS;
      if (v !== storeVersion) {
        storeVersion = v;
        changed();
      }
      void AsyncStorage.setItem(STORE_KEY, JSON.stringify({ version: v, at: storeAt })).catch((e) => console.log("[update] the App Store version couldn't be kept:", e));
    } catch (e) {
      nextLookupAt = Date.now() + LOOKUP_RETRY_MS;
      console.log(`[update] Apple's lookup failed; ${storeVersion ? `keeping ${storeVersion}` : "the parcel shows no number"}:`, (e as { message?: string })?.message ?? e);
    }
  })().finally(() => {
    lookup = null;
  });
  return lookup;
}

/** The prompt right now: whether the table asks this phone to update (and how hard), the App
    Store's version, and the sheet's record. Follows the table as it changes; never waits. */
export function useUpdatePrompt(): UpdatePrompt {
  /* a screen can mount before the root layout has started lib/surfaces; the first to ask makes
     sure the phone's copies are read and a fresh answer asked for */
  useEffect(() => {
    void surfacesReady();
    void readSurfaces();
    void readLocal();
  }, []);
  const s = useSyncExternalStore(subscribe, snapshot);
  // Apple is asked only on a phone the table asks to update, and again whenever the app comes
  // back to the front (refreshStoreVersion keeps to its own six-hour rhythm), so a phone left
  // open for days still learns of a newer release
  useEffect(() => {
    if (!s.on) return;
    void readLocal().then(refreshStoreVersion);
    const sub = AppState.addEventListener("change", (a) => {
      if (a === "active") void refreshStoreVersion();
    });
    return () => sub.remove();
  }, [s.on]);
  return s;
}

/** The sheet has been raised: write it down (for this binary, this parcel, today). */
export function markSheetShown(version: string | null): void {
  seen = { binary: BINARY, version, day: localDay(new Date()) };
  changed();
  if (__DEV__ && devMode) return; // a dev preview never writes the record
  void AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen)).catch((e) => console.log("[update] the sheet's record couldn't be written:", e));
}

/** The app's page in the App Store app (its web page if that fails). */
export function openAppStore(): void {
  Linking.openURL(APP_STORE_URL).catch((e) => {
    console.log("[update] the App Store app didn't open; trying its web page:", e);
    Linking.openURL(APP_STORE_WEB).catch((e2) => console.warn("[update] the App Store page didn't open either:", e2));
  });
}

/**
 * DEV ONLY: preview the prompt on Today in soft or hard mode for this run of the app, or follow
 * the table again (null). Turning it on forgets the sheet's record in memory, so the sheet comes
 * again; the stored record is never touched. Does nothing in a release build.
 */
export function setDevUpdatePreview(mode: "soft" | "force" | null): void {
  if (!__DEV__) return;
  devMode = mode;
  if (mode) {
    seen = null;
    void readLocal().then(refreshStoreVersion);
    changed();
    return;
  }
  // back to the table: read the stored record again
  localRead = null;
  void readLocal();
}
