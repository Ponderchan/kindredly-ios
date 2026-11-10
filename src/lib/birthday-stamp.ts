import { useCallback, useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { hasKindredlyStampArt } from "../../modules/kindredly-ui/src/available";
import { useAuth } from "./auth";
import { readSurfaces, remoteSurfaces, subscribeSurfaces, surfacesReady } from "./surfaces";
import { BIRTHDAY_STAMP, birthdayStampOffered } from "./birthday-stamp-core";
import "../data/strings-audit-birthday"; // bd.stamp.* (the tray's marker and heading)

/* THE BIRTHDAY STAMP, FOR THE SCREENS (owner's audit, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The React Native glue over lib/birthday-stamp-core (which decides, and is
   node-tested), built as lib/season is over season-core: the reader's own
   birthday as the account holds it (useAuth's profile: user_metadata.dob,
   or the phone's copy when it was set a moment ago), today's local date,
   the app_surfaces table as lib/surfaces last read it (nothing known = on),
   and whether THIS binary's Swift has the stamp's drawing (asked of the
   native module, once). Nothing is sent anywhere: the phone decides.

   useBirthdayStamp() is true only on the reader's birthday; a fresher
   table, or the app coming back to the front (a new day may have started),
   re-reads it. The composers' trays put the stamp first that day under its
   small marker, and drop it from recents and suggestions on every other.

   DEV ONLY: setDevBirthdayStamp(true) makes today the reader's birthday for
   this run of the app (never saved, ignored in release), so the dev compose
   page (kindredly:///dev/step5-compose, BDAY) can show the stamp in the
   tray on any day. The binary must still have the drawing. */

let devBirthday = false;
const devListeners = new Set<() => void>();

/** DEV ONLY: pretend today is the reader's birthday (true) or follow the account again (false). Never saved. */
export function setDevBirthdayStamp(on: boolean): void {
  if (!__DEV__) return;
  devBirthday = on;
  devListeners.forEach((f) => f());
}

/** Is the birthday stamp on offer right now, for this reader? */
export function useBirthdayStamp(): boolean {
  const { profile } = useAuth();
  const dob = typeof profile?.dob === "string" ? (profile.dob as string) : null;
  /* a screen can mount before the root layout has started lib/surfaces;
     the first to ask makes sure the phone's copy is read and a fresh one asked for */
  useEffect(() => {
    void surfacesReady();
    void readSurfaces();
  }, []);
  const now = useCallback(() => {
    const drawn = hasKindredlyStampArt(BIRTHDAY_STAMP);
    if (__DEV__ && devBirthday) return drawn;
    return birthdayStampOffered({ birthday: dob, now: new Date(), remote: remoteSurfaces(), drawn });
  }, [dob]);
  return useSyncExternalStore(subscribeDay, now, now);
}

/** told when the table changes, or the app comes back to the front (the day may have turned) */
const subscribeDay = (f: () => void) => {
  const off = subscribeSurfaces(f);
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active") f();
  });
  devListeners.add(f);
  return () => {
    off();
    sub.remove();
    devListeners.delete(f);
  };
};
