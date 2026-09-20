import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/* THE STALL PROBE (owner, 2026-09-20).
   ────────────────────────────────────────────────────────────────────────
   "Some tab freezes" could not be reproduced in the simulator, so the
   phone keeps its own evidence. A 100ms heartbeat runs on the JS thread;
   when a beat lands late by more than a quarter second, the thread was
   busy for that long — and it is written down with the route on screen
   and the last piece of work a screen announced (markWork). The last
   twenty stalls ride along with any bug sent from Wren's desk.

   Cost: one timer, a subtraction every 100ms. Backgrounding pauses JS
   timers, so the first two seconds after the app comes back are ignored —
   that gap is the phone's, not ours. */

const STEP = 100;
const LIMIT = 250;
const KEEP = 20;
const KEY = "kindredly_stalls";

export type Stall = { at: number; ms: number; route: string; mark: string };

let route = "?";
let mark = "";
let ring: Stall[] = [];
let started = false;
let loaded = false;

export const noteRoute = (r: string): void => {
  route = r;
  mark = ""; // a new screen starts with no work announced
};

/** a screen says what it is about to do, so a stall has a name. The name
    fades after five seconds so it cannot get blamed for a later stall. */
let markTimer: ReturnType<typeof setTimeout> | null = null;
export const markWork = (label: string): void => {
  mark = label;
  if (markTimer) clearTimeout(markTimer);
  markTimer = setTimeout(() => {
    if (mark === label) mark = "";
  }, 5000);
};

export function startStallProbe(): void {
  if (started) return;
  started = true;
  void AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw && !loaded) ring = [...(JSON.parse(raw) as Stall[]), ...ring].slice(-KEEP);
      loaded = true;
    })
    .catch(() => {
      loaded = true;
    });

  let last = Date.now();
  let quietUntil = 0;
  AppState.addEventListener("change", (s) => {
    if (s === "active") {
      last = Date.now();
      quietUntil = last + 2000;
    }
  });
  setInterval(() => {
    const now = Date.now();
    const late = now - last - STEP;
    last = now;
    if (late < LIMIT || now < quietUntil) return;
    ring = [...ring, { at: now, ms: late + STEP, route, mark }].slice(-KEEP);
    void AsyncStorage.setItem(KEY, JSON.stringify(ring)).catch(() => {});
  }, STEP);
}

const version = `${Constants.expoConfig?.version ?? "?"}${Constants.expoConfig?.ios?.buildNumber ? ` (${Constants.expoConfig.ios.buildNumber})` : ""}`;

/** the stalls as a few lines, for the makers */
export function stallReport(): string {
  const head = `Kindredly ${version} · ${Platform.OS} ${Platform.Version} · ${Constants.deviceName ?? ""}`.trim();
  if (!ring.length) return `${head}\nno stalls recorded`;
  const lines = ring
    .slice(-KEEP)
    .map((s) => {
      const d = new Date(s.at);
      const hh = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return `${hh} ${s.ms}ms ${s.route}${s.mark ? ` (${s.mark})` : ""}`;
    });
  return `${head}\n${lines.join("\n")}`;
}
