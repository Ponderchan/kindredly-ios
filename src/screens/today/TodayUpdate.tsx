import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useIsFocused } from "expo-router";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlusSheetOpen } from "../../lib/screen-insets";
import { markSheetShown, openAppStore, useUpdatePrompt } from "../../lib/update-prompt";
import { bannerShows, localDay, sheetDue } from "../../lib/update-prompt-core";
import { UPDATE_BANNER_ROOM, UpdateBanner, UpdateSheet } from "../../components/UpdatePrompt";
import { useIdentityNoteUp } from "../edit-profile/IdentityNote";
import type { TodayModel } from "./useTodayDesk";

/* THE UPDATE PROMPT ON TODAY (OTA, 2026-10-25). Wraps Today's renderers and their overlays.

   THE SHEET (components/UpdatePrompt UpdateSheet) comes when lib/update-prompt-core says it is
   due, and only once Today has settled: the tab on screen, the desk loaded (reading or done,
   not offline: the App Store needs the network too) and quiet for SETTLE_MS, with nothing else
   up — not her first-arrival line (the end of the first flight), the reader, a send in flight,
   "Reply sent.", the pouch-full or guest sheet, the report card, the tab bar's + sheet, or the
   one-time identity note over the tabs (IdentityNote).
   Onboarding and the first flight are other routes, so Today isn't there yet. Raising it writes
   the record (lib/update-prompt markSheetShown). Soft mode: Later, or Update once the App Store
   has opened, puts it away. Hard mode: it stays.

   THE BANNER (UpdateBanner), after that in soft mode: pinned under the status bar, above
   whichever renderer draws Today. Nothing of Today goes under it: inside this wrapper the safe
   area's top is the banner's foot, so the Swift desk (its insets prop: the bg strip, the plate,
   the card's top), the React Native fallback and the overlays (the report card's drop) all start
   under it, and the control band, measured from the bottom, stays where it is; the card is
   UPDATE_BANNER_ROOM shorter. The provider is always there, so the banner coming or going never
   remounts the desk (NativeSurface decides its renderer once, at mount). */

/** how long Today must stay calm before the sheet rises */
const SETTLE_MS = 1500;

export function TodayUpdate({ model, children }: { model: TodayModel; children: ReactNode }) {
  const up = useUpdatePrompt();
  const real = useSafeAreaInsets();
  const focused = useIsFocused();
  const plusOpen = usePlusSheetOpen();
  const noteUp = useIdentityNoteUp();
  const [sheet, setSheet] = useState(false);

  const { view, sheets, report } = model;
  const calm =
    focused &&
    !plusOpen &&
    !noteUp &&
    view.loaded &&
    (view.phase === "reading" || view.phase === "done") &&
    !view.arrival.open &&
    view.readerId == null &&
    !view.sending &&
    !view.toast &&
    !sheets.flightFull &&
    !sheets.needsAccount &&
    report.stage == null;
  const due = up.ready && up.on && up.waiting && sheetDue(up.seen, up.version, localDay(new Date()), up.force);
  const version = up.version;

  useEffect(() => {
    if (sheet || !calm || !due) return;
    const id = setTimeout(() => {
      setSheet(true);
      markSheetShown(version);
    }, SETTLE_MS);
    return () => clearTimeout(id);
  }, [sheet, calm, due, version]);

  // the switch turned off takes it down for good: turned on again, it waits for a calm Today and the record like the first time
  useEffect(() => {
    if (!up.on) setSheet(false);
  }, [up.on]);
  const open = sheet && up.on && up.waiting;
  const banner = bannerShows(up, up.seen) && up.waiting && !open;
  const room = banner ? UPDATE_BANNER_ROOM : 0;
  const insets = useMemo(() => (room ? { ...real, top: real.top + room } : real), [real, room]);
  const force = up.force;

  return (
    <>
      <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>
      {banner ? <UpdateBanner top={real.top} onPress={openAppStore} /> : null}
      <UpdateSheet
        open={open}
        version={version}
        force={force}
        onLater={() => setSheet(false)}
        onUpdated={() => {
          if (!force) setSheet(false);
        }}
      />
    </>
  );
}
