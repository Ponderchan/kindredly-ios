import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo";
import { supabase, supabaseReady } from "./supabase";
import { resolveSurfaces, surfaceOn, type SurfaceMap } from "./surfaces-resolve";

/* THE REMOTE SWITCH FOR NATIVE SCREENS (10a, 1.3.0).
   ────────────────────────────────────────────────────────────────────────
   Some screens are drawn in SwiftUI from 1.3.0 on, each next to the React
   Native screen it replaces. A bug in the Swift one is native code: only a
   new binary fixes it, and review takes days. So every Swift screen asks
   here first, and the makers can send any one of them back to React
   Native with one row in app_surfaces (web 0033) — no build, no deploy,
   no review. The SQL to flip one is in that migration's header.

   Per screen: this binary's own version row, else the '*' row, else
   NATIVE_DEFAULTS below, else React Native (lib/surfaces-resolve). And
   never Swift on a binary that doesn't carry the Swift module, whatever
   the table says — a '*' row turning a screen on must not reach builds
   from before it existed.

   NOTHING WAITS ON THIS. A screen reads the answer already in memory —
   the last one fetched on this phone (raw AsyncStorage, device-level like
   the language: it is about the binary, not the account, and scoped-store
   reads wait for auth) or the defaults — and re-renders if a fresher one
   lands. A missing table, an offline phone or a build without Supabase
   keys simply means the defaults; nothing here throws. Failures are
   logged rather than swallowed (a silent catch has cost whole afternoons
   before), with console.log so a dev build doesn't raise a toast over the
   screen every launch before 0033 has been run.

   Asked at launch and when the app comes back to the front, at most once
   every ten minutes (a minute after a failure). */

/* Each SwiftUI surface adds its key here when it ships: true = use Swift.
   The key is the `surface` string the table uses. Until a key is here (or
   a row turns it on) the screen stays React Native. An OTA update can
   change these, but the table is faster and needs no publish.

     tabbar   the 10a tab bar and its composer sheet (components/NativeTabBar;
              off → PostTabBar + PostFan). The tabs layout also checks the
              binary has the Swift view itself, so a dev client built before
              it simply keeps the React Native bar. */
export const NATIVE_DEFAULTS: Record<string, boolean> = {
  tabbar: true,
};

/* the Expo module that draws the Swift screens (modules/kindredly-ui).
   Absent on every binary built before it existed. */
const NATIVE_MODULE = "KindredlyUI";

const KEY = "kindredly_surfaces";
const FRESH_MS = 10 * 60_000;
const RETRY_MS = 60_000;

/* the binary's own version (app.json "version", 1.3.0) — not the App
   Store label (1.0.5). Rows target this. */
const VERSION: string | null = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;

/* The cache carries the version it was resolved for: the map already has
   this binary's exact-version rows folded in, so it is no good to the next
   binary (whose first offline launch uses the defaults until it can ask). */
type Cached = { version: string | null; at: number; map: SurfaceMap };

let remote: SurfaceMap | null = null; // null = nothing known yet → defaults
let cacheRead: Promise<void> | null = null;
let inflight: Promise<SurfaceMap> | null = null;
let nextAskAt = 0;
let moduleThere: boolean | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());

function loadCache(): Promise<void> {
  if (!cacheRead)
    cacheRead = AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw || remote) return; // a fetch that already landed is newer
        const c = JSON.parse(raw) as Partial<Cached> | null;
        if (!c || c.version !== VERSION || !c.map || typeof c.map !== "object") return;
        remote = c.map;
        changed();
      })
      .catch((e) => console.log("[surfaces] cache read failed, using the defaults:", e));
  return cacheRead;
}

/** Ask app_surfaces for this binary's rows (its version and '*') and keep
    the answer. Resolves to the table's map in force afterwards — fresh,
    cached, or {} — and never rejects. Throttled and de-duplicated, so any
    screen may call it. */
export function readSurfaces(): Promise<SurfaceMap> {
  if (inflight) return inflight;
  inflight = (async () => {
    await loadCache();
    if (!supabaseReady || Date.now() < nextAskAt) return remote ?? {};
    try {
      const { data, error } = await supabase!
        .from("app_surfaces")
        .select("surface,app_version,native")
        .in("app_version", VERSION ? ["*", VERSION] : ["*"]);
      if (error) throw error;
      // no rows is an answer too: nothing switched, every screen on its default
      remote = resolveSurfaces(data ?? [], VERSION);
      nextAskAt = Date.now() + FRESH_MS;
      const c: Cached = { version: VERSION, at: Date.now(), map: remote };
      void AsyncStorage.setItem(KEY, JSON.stringify(c)).catch((e) => console.log("[surfaces] cache write failed:", e));
      changed();
    } catch (e) {
      nextAskAt = Date.now() + RETRY_MS;
      console.log(`[surfaces] could not read app_surfaces, keeping ${remote ? "the last answer" : "the defaults"}:`, (e as { message?: string })?.message ?? e);
    }
    return remote ?? {};
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/* once per process, from the root layout: the first ask, then one on every
   return to the front (throttled inside readSurfaces) */
let started = false;
export function startSurfaces(): void {
  if (started) return;
  started = true;
  void readSurfaces();
  AppState.addEventListener("change", (s) => {
    if (s === "active") void readSurfaces();
  });
}

/** The answer right now, without waiting: true = draw `key` in SwiftUI.
    A route that must not change under the reader's thumb can fix it at
    mount with useState(() => nativeOn(key)). */
export function nativeOn(key: string): boolean {
  if (!surfaceOn(remote, NATIVE_DEFAULTS, key)) return false;
  if (moduleThere === null) moduleThere = !!requireOptionalNativeModule(NATIVE_MODULE);
  return moduleThere;
}

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/** true = draw `key` in SwiftUI. Starts from the answer in memory and
    follows it when a fresher one lands; never waits on the network. */
export function useNativeSurface(key: string): boolean {
  /* a screen can mount before the root layout's effect has run (children's
     effects go first), so the first one to ask makes sure the cache is read */
  useEffect(() => {
    void readSurfaces();
  }, []);
  return useSyncExternalStore(subscribe, () => nativeOn(key));
}
