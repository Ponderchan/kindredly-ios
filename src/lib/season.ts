import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { readSurfaces, remoteSurfaces, subscribeSurfaces, surfacesReady } from "./surfaces";
import { seasonOffer, type SeasonOffer } from "./season-core";

/* SEASONS, FOR THE SCREENS (owner, 2026-10-26).
   ────────────────────────────────────────────────────────────────────────
   The React Native glue over lib/season-core (which decides, and is node-tested): today's
   local date, the app_surfaces table as lib/surfaces last read it (the same request, throttle
   and phone cache as the native screens; nothing known = on), and this binary's own version.
   JavaScript only, so the looks travel over the air; the stamps wait for the binary whose
   Swift draws them (season-core stampsFrom).

   Screens follow it with useSeason(): a fresher table, or the app coming back to the front
   (a new day may have started), re-reads it. The answer is the same object while nothing in it
   changed, so it is safe in a dependency list. */

/** the binary's own version; the build's when the native one can't be read */
const BINARY: string | null = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;

let last: { key: string; offer: SeasonOffer } | null = null;

/** What the seasons offer right now (looks always, stamps on a binary that draws them). */
export function seasonNow(): SeasonOffer {
  const offer = seasonOffer(new Date(), remoteSurfaces(), BINARY);
  const key = `${offer.id}|${offer.looks.join()}|${offer.stamps.join()}`;
  if (!last || last.key !== key) last = { key, offer };
  return last.offer;
}

const subscribeSeason = (f: () => void) => {
  const off = subscribeSurfaces(f);
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active") f();
  });
  return () => {
    off();
    sub.remove();
  };
};

/** The season's offer for a screen; follows the table and the day. */
export function useSeason(): SeasonOffer {
  /* a screen can mount before the root layout has started lib/surfaces;
     the first to ask makes sure the phone's copy is read and a fresh one asked for */
  useEffect(() => {
    void surfacesReady();
    void readSurfaces();
  }, []);
  return useSyncExternalStore(subscribeSeason, seasonNow, seasonNow);
}
