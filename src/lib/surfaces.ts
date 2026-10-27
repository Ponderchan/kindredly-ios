import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo";
import { supabase, supabaseReady } from "./supabase";
import {
  armSurface,
  clearSurface,
  disarmSurface,
  emptyArming,
  resolveSurfaces,
  settleArming,
  struckOut,
  surfaceOn,
  type ArmingRecord,
  type SurfaceMap,
} from "./surfaces-resolve";

/* THE REMOTE SWITCH FOR NATIVE SCREENS (10a, 1.2.4).
   ────────────────────────────────────────────────────────────────────────
   Some screens are drawn in SwiftUI from 1.2.4 on, each next to the React
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
   every ten minutes (a minute after a failure).

   The one wait: a screen that picks its renderer once (components/
   NativeSurface) waits for surfacesReady() — the PHONE's copy, a local
   read of a few milliseconds, never the network — so a cold start from a
   push can't pick Swift before a kill row already on the phone is known.

   THE CRASH BREADCRUMB. A Swift screen that crashes the app as it opens
   can't be reached by any row in time, so the phone keeps its own count:
   armNative() before the Host mounts, clearNative() once it has stood for
   a few seconds, and two launches in a row that found the mark still set
   send that screen back to React Native for the rest of this binary
   (lib/surfaces-resolve: settleArming). nativeOn() answers false for it
   from then on, whatever the table says. */

/* Each SwiftUI surface adds its key here when it ships: true = use Swift.
   The key is the `surface` string the table uses. Until a key is here (or
   a row turns it on) the screen stays React Native. An OTA update can
   change these, but the table is faster and needs no publish.

     tabbar       the 10a tab bar and its composer sheet (components/
                  NativeTabBar; off → PostTabBar + PostFan). The tabs layout
                  also checks the binary has the Swift view itself, so a dev
                  client built before it simply keeps the React Native bar.

   10a step 5. Turned on 2026-10-16 after each screen was checked on the
   simulator in Swift against the real account (Kindreds, the pen-pal chat,
   Today, compose, Me, Settings, Edit profile, Notes; the room against demo
   rows, the account having no kindred yet) and in all four themes. Every one of them
   keeps its React Native screen, chosen by <NativeSurface> (components/
   NativeSurface), which also checks that the binary has the Swift view:

     room         a named kindred's room (room/[id]) — KConversationView
     chat         a pen pal's chat before names (chat/[id]) — KConversationView
     kindreds     the Kindreds tab — KKindredsView
     today        the Today tab, the letter cards and the reply dock — KTodayView
     compose      writing to a stranger (compose) — KComposeView
     me           the Me tab — KMeView
     settings     Settings (in the Me stack) — KSettingsView
     editprofile  Edit profile (in the Me stack) — KEditProfileView
     notes        the Notes tab — KNotesView

   Me 4a (2026-10-19), each keeping its React Native page the same way:

     paywall      the First Class page (paywall) — KPaywallView; onboarding's
                  fare step keeps the React Native PaywallBody
     myletters    My letters (my-letters) — KMyLettersView

   The one-letter reader (owner-approved 2026-10-20), keeping its React
   Native page the same way:

     reader       the one-letter reader (thread/[id]) — KReaderView; the
                  React Native ReaderScreen draws the same model
                  (screens/chat/useReaderModel)

   The Notes composer (owner, 2026-10-26: ships in 1.0.7, drawn to the Note
   Composer Bar design), keeping its React Native page (components/
   SelfCompose) the same way:

     journalentry the Notes composer, "write a page" (journal-entry) —
                  KNoteComposeView; screens/journal-entry holds its state

   The name-trading ceremony (owner, 2026-10-26; ships in 1.0.7), keeping
   its React Native ritual the same way:

     ceremony     the signed ritual inside the introduction sheet, when both
                  sides have signed (components/IntroductionRitualNative,
                  KIntroRitualView): the windows, the two sealed envelopes,
                  the struck courier names, the signatures drawn in and
                  KINDREDS · date. The sheet around it, and the mosaic
                  ritual (no signatures), stay React Native.

   The Writing Aura room and its share card (owner decision 2026-10-26,
   1.0.7), keeping their React Native pages the same way:

     aura         the Writing Aura room (aura) — KAuraRoomView
     auracard     the share card (aura-card) — KAuraShareView; Swift draws
                  the card and makes its picture

   Wren's Journey (owner, 2026-10-26; binary 1.2.6, App Store 1.0.7), keeping
   its React Native page the same way:

     courier      her page (courier) — KCourierView; Free Flight stays React
                  Native: Play hands the page to the React Native one for the
                  game, and it comes back when she lands (screens/courier)

   Make your own face (owner, 2026-10-26; ships DARK in binary 1.2.6 = App
   Store 1.0.7): a new feature, not a port, so it has no React Native page —
   off, its doors simply don't show (lib/make-face makeFaceOn):

     makeface     the flow (make-face) — KMakeFaceView, and its doors: Edit
                  profile's ＋ cell and onboarding's. OFF until a row turns it
                  on (it needs web 0047 run and /api/face deployed first)
   The onboarding (owner, 2026-10-26; binary 1.2.6, App Store 1.0.7), keeping
   its React Native run the same way. It ships OFF: the owner turns it on
   with a row once it has been tried on a device.

     onboarding   the new run, screens 1–13 (onboarding) — KOnboardingView;
                  screens/onboarding holds the run, and the React Native
                  Onboarding2 stays what people see while this is off

   The last Me pages (owner, 2026-10-27: "make Me all Swift"), each keeping
   its React Native page the same way:

     keepsakes    the whole shelf (keepsakes) — KKeepsakesView
     keepsake     one keepsake (keepsake/[id]) — KKeepsakeView
     mykindreds   My kindreds (my-kindreds) — KMyKindredsView, redrawn: only
                  the kindreds, as signed cards (the React Native page still
                  lists the pen pals too)
     editfield    one field on its own page (me/edit-field) — KEditFieldView
     blocked      Blocked & reported (me/blocked) — KBlockedView
     help         How Kindredly works (me/help) — KHelpView
     writetous    Write to us (me/write-to-us) — KWriteToUsView

   A kindred's page and Wren's desk stay React Native and have no key.

   Since 2026-10-27 Wren's desk has a key after all: it can be drawn in
   Swift, keeping its React Native room the same way. OFF until it has
   been checked on the simulator:

     wrenroom     Wren's room (room/wren) — KWrenRoomView; the guide reels
                  and the news reel stay React Native inside it (islands),
                  screens/wren-room holds its state */
export const NATIVE_DEFAULTS: Record<string, boolean> = {
  tabbar: true,
  room: true,
  chat: true,
  kindreds: true,
  today: true,
  compose: true,
  me: true,
  settings: true,
  editprofile: true,
  notes: true,
  paywall: true,
  myletters: true,
  reader: true,
  journalentry: true,
  ceremony: true,
  aura: true,
  auracard: true,
  courier: true,
  makeface: false,
  // deliberately off: shipped dark in 1.2.6, switched on by a row after device testing
  onboarding: false,
  // the last Me pages (owner, 2026-10-27: "make Me all Swift")
  keepsakes: true,
  keepsake: true,
  mykindreds: true,
  editfield: true,
  blocked: true,
  help: true,
  writetous: true,
  // Wren's room (2026-10-27): off until it has been checked on the simulator
  wrenroom: false,
};

/** the nine step-5 surface keys, Me 4a's two, the reader, the Notes composer, the ceremony, the aura pages, the courier page, the onboarding and the last Me pages (the `surface` prop of NativeSurface) */
export type NativeSurfaceKey = "room" | "chat" | "kindreds" | "today" | "compose" | "me" | "settings" | "editprofile" | "notes" | "paywall" | "myletters" | "reader" | "journalentry" | "ceremony" | "aura" | "auracard" | "courier" | "onboarding" | "keepsakes" | "keepsake" | "mykindreds" | "editfield" | "blocked" | "help" | "writetous" | "wrenroom";

/* the Expo module that draws the Swift screens (modules/kindredly-ui).
   Absent on every binary built before it existed. */
const NATIVE_MODULE = "KindredlyUI";

const KEY = "kindredly_surfaces";
const FRESH_MS = 10 * 60_000;
const RETRY_MS = 60_000;

/* the binary's own version (app.json "version", 1.2.4) — not the App
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

/* ── the crash breadcrumb ──────────────────────────────────────────────── */

const ARMING_KEY = "kindredly_native_arming";

/* Strikes belong to one binary: the version AND the build, so a rebuilt
   1.2.4 that fixes a crash starts with a clean slate. */
const BINARY: string | null = VERSION ? `${VERSION} (${Application.nativeBuildVersion ?? "?"})` : null;

let arming: ArmingRecord = emptyArming(BINARY);
let armingRead: Promise<void> | null = null;
let armingWrite: Promise<void> = Promise.resolve();
let settled = false;

/* Read once per process, and settled at once: last launch's marks become
   strikes and are written back spent, so a crash later in THIS process is
   counted against this process's own marks only. */
function loadArming(): Promise<void> {
  if (!armingRead)
    armingRead = AsyncStorage.getItem(ARMING_KEY)
      .then((raw) => {
        arming = settleArming(raw, BINARY);
        const struck = Object.keys(arming.strikes);
        if (struck.length) console.log(`[surfaces] native screens that didn't survive opening last time${__DEV__ ? " (dev: logged, not applied)" : ""}:`, arming.strikes);
        if (raw != null) persistArming();
        if (struck.length) changed();
      })
      .catch((e) => console.log("[surfaces] crash breadcrumb read failed, counting none:", e));
  return armingRead;
}

/* every write is the whole record, one after another, so two screens
   arming at once can't interleave */
function persistArming(): Promise<void> {
  const snapshot = JSON.stringify(arming);
  armingWrite = armingWrite
    .then(() => AsyncStorage.setItem(ARMING_KEY, snapshot))
    .catch((e) => console.log("[surfaces] crash breadcrumb write failed:", e));
  return armingWrite;
}

/** Resolves once this phone's own answers are in memory: the cached table
    (lib/surfaces' cache, a local read) and the crash breadcrumb. Never the
    network, never rejects. NativeSurface waits for it before choosing, so
    a cold start can't pick Swift past a kill row or a struck-out screen
    that the phone already knows about. */
export function surfacesReady(): Promise<void> {
  return Promise.all([loadCache(), loadArming()]).then(() => {
    settled = true;
  });
}

/** true once surfacesReady() has resolved in this process: a screen that
    mounts after that can choose at once, with no waiting frame */
export function surfacesSettled(): boolean {
  return settled;
}

/** Mark `surface` as opening, before its Host mounts. Resolves once the
    mark is on disk (or the write failed, which is logged), so a crash in
    the Host's first frames still finds it at the next launch. Waits for
    the launch's own read first, so this process's mark is never mistaken
    for the last one's. */
export async function armNative(surface: string): Promise<void> {
  await loadArming();
  arming = armSurface(arming, surface, Date.now());
  await persistArming();
}

/** `surface` opened and stood (or closed without taking the app down):
    its mark goes and its strikes are forgiven. Fire and forget. */
export function clearNative(surface: string): void {
  const own = (o: object) => Object.prototype.hasOwnProperty.call(o, surface);
  if (!own(arming.armed) && !own(arming.strikes)) return;
  arming = clearSurface(arming, surface);
  void persistArming();
}

/** `surface` was armed but never opened where anyone could see it (gone
    before its Host mounted, or mounted behind another tab): its mark goes,
    its strikes stay — it neither died opening nor stood. Fire and forget. */
export function disarmNative(surface: string): void {
  if (!Object.prototype.hasOwnProperty.call(arming.armed, surface)) return;
  arming = disarmSurface(arming, surface);
  void persistArming();
}

/** true = `surface` crashed the app while opening on the last two launches
    that tried it, on this binary: it stays React Native here. nativeOn()
    already answers false for it; this is for logs and the dev lab. */
export function nativeStruckOut(surface: string): boolean {
  return struckOut(arming, surface);
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
  void surfacesReady(); // the breadcrumb is settled at launch, before any screen arms
  void readSurfaces();
  AppState.addEventListener("change", (s) => {
    if (s === "active") void readSurfaces();
  });
}

/** The answer right now, without waiting: true = draw `key` in SwiftUI.
    False for a surface that has struck out on this binary (the crash
    breadcrumb), whatever the table says. A route that must not change
    under the reader's thumb fixes it at mount — NativeSurface mode "mount"
    does exactly that, after surfacesReady(). */
/* DEV ONLY: force a surface native (true) or React Native (false) for this
   run of the app, from ui-lab, so a Swift screen can be tried on real data
   before its NATIVE_DEFAULTS key flips. Never saved; ignored in release. */
const devForced = new Map<string, boolean>();
export function setDevSurfaceOverride(key: string, on: boolean | null): void {
  if (!__DEV__) return;
  if (on === null) devForced.delete(key);
  else devForced.set(key, on);
  changed();
}
export function devSurfaceOverride(key: string): boolean | null {
  return __DEV__ && devForced.has(key) ? (devForced.get(key) as boolean) : null;
}

export function nativeOn(key: string): boolean {
  const forced = devSurfaceOverride(key);
  if (forced === false) return false;
  if (forced === null && !surfaceOn(remote, NATIVE_DEFAULTS, key)) return false;
  // A dev client's process dies while screens open for reasons that aren't crashes (Xcode
  // reinstalling the app, a Metro reload mid-open), and its binary string never changes between
  // rebuilds, so two of those once sent Today back to React Native for good on the simulator
  // (2026-10-18). In dev the strikes only log (loadArming); the gate is the release build's.
  if (!__DEV__ && struckOut(arming, key)) return false;
  if (moduleThere === null) moduleThere = !!requireOptionalNativeModule(NATIVE_MODULE);
  return moduleThere;
}

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/* A SWITCH THAT ISN'T A SCREEN. The same table carries feature switches
   too — the first is 'identity' (lib/identity: courier names, frosted
   windows, the ♀/♂ mark and the star sign). They ride the same request,
   the same throttle and the same cache on this phone; only the reading
   differs: the table's answer or OFF (lib/identity-core identitySwitch),
   with no NATIVE_DEFAULTS, no module check and no crash breadcrumb, since
   nothing native is being chosen. */
/** The table's answers as last fetched (or cached on this phone); null = nothing known yet. */
export function remoteSurfaces(): SurfaceMap | null {
  return remote;
}
/** Called when a fresher answer lands (or a dev override changes); returns the unsubscribe. */
export const subscribeSurfaces = subscribe;

/** true = draw `key` in SwiftUI. Starts from the answer in memory and
    follows it when a fresher one lands; never waits on the network. */
export function useNativeSurface(key: string): boolean {
  /* a screen can mount before the root layout's effect has run (children's
     effects go first), so the first one to ask makes sure the cache is read */
  useEffect(() => {
    void surfacesReady();
    void readSurfaces();
  }, []);
  return useSyncExternalStore(subscribe, () => nativeOn(key));
}
