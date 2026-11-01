import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Keyboard, useWindowDimensions } from "react-native";
import { useIsFocused } from "expo-router";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlusSheetOpen } from "../../lib/screen-insets";
import { blurThen } from "../../lib/keyboard";
import { markSheetShown, openAppStore, setUpdateSheetUp, useUpdatePrompt } from "../../lib/update-prompt";
import { bannerShows, localDay, sheetDue } from "../../lib/update-prompt-core";
import { UPDATE_BANNER_ROOM, UpdateBanner, UpdateSheet, useParcelBirds } from "../../components/UpdatePrompt";
import { useNativeSurface } from "../../lib/surfaces";
import { useIdentityNoteUp } from "../edit-profile/IdentityNote";
import { ratingLater, ratingShown, ratingTapped, useRatingAsk } from "../../lib/rating-ask";
import { RatingAskSheet } from "../../components/RatingAsk";
import type { TodayModel } from "./useTodayDesk";

/* THE UPDATE PROMPT ON TODAY (OTA, 2026-10-25). Wraps Today's renderers and their overlays.

   THE SHEET (components/UpdatePrompt UpdateSheet) comes when lib/update-prompt-core says it is
   due, and only once Today has settled: the tab on screen, the desk loaded (reading or done,
   not offline: the App Store needs the network too) and quiet for SETTLE_MS, with nothing else
   up — not her first-arrival line (the end of the first flight), the reader, a send in flight,
   "Reply sent.", the pouch-full or guest sheet, the report card, the tab bar's + sheet, the
   one-time identity note over the tabs (IdentityNote), or a keyboard (a reply being written: a
   Modal over a focused Swift field rises under the keyboard, lib/keyboard). It is raised through
   blurThen all the same, so whoever holds the keyboard lets go first. The record (lib/update-prompt
   markSheetShown) is written once the sheet is really on screen (the Modal's onShow): UIKit refuses
   a second Modal, and a refused sheet goes back down to try again at the next calm. Soft mode:
   Later, or Update once the App Store has opened, puts it away. Hard mode: it stays.
   Onboarding and the first flight are other routes, so Today isn't there yet.

   THE BANNER (UpdateBanner), after that in soft mode: pinned under the status bar, above
   whichever renderer draws Today. Nothing of Today goes under it: inside this wrapper the safe
   area's top is the banner's foot, so the Swift desk (its insets prop: the bg strip, the plate,
   the card's top), the React Native fallback and the overlays (the report card's drop) all start
   under it, and the control band, measured from the bottom, stays where it is; the card is
   UPDATE_BANNER_ROOM shorter. The provider is always there, so the banner coming or going never
   remounts the desk (NativeSurface decides its renderer once, at mount). The room is taken as
   the sheet rises, under its dim, so the desk has already moved when Later uncovers it. Short
   screens (under TALL_ENOUGH) get no banner: its 52 would push the control band under the tab
   bar (568) or the card under the reply bar (667); the sheet has said it once. */

/** how long Today must stay calm before the sheet rises */
const SETTLE_MS = 1500;
/** a sheet that hasn't reached the screen by then was refused (another Modal up): down, and again later */
const SHOWN_WITHIN_MS = 1500;
/** and the next try waits at least this long, so a sheet that stays up isn't asked every few seconds */
const REFUSED_BACKOFF_MS = 20_000;
/** the shortest window the banner's room leaves the desk enough of (an iPhone SE is 667) */
const TALL_ENOUGH = 700;

export function TodayUpdate({ model, children }: { model: TodayModel; children: ReactNode }) {
  const up = useUpdatePrompt();
  const real = useSafeAreaInsets();
  const focused = useIsFocused();
  const plusOpen = usePlusSheetOpen();
  const noteUp = useIdentityNoteUp();
  const win = useWindowDimensions();
  const [sheet, setSheet] = useState(false);
  /* the Swift parcel scene ("parcel" switch) draws her from BirdSnapshots captures: taken as soon
     as an update is waiting, so they are there long before the sheet rises */
  const swiftParcel = useNativeSurface("parcel");
  useParcelBirds(swiftParcel && up.ready && up.on && up.waiting);

  // a keyboard up anywhere (React Native's events come from UIKit's, so a SwiftUI field's counts)
  const [kbUp, setKbUp] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKbUp(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const { view, sheets, report } = model;
  const calm =
    focused &&
    !plusOpen &&
    !noteUp &&
    !kbUp &&
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

  const viewRef = model.viewRef;
  const notBefore = useRef(0);
  useEffect(() => {
    if (sheet || !calm || !due) return;
    const id = setTimeout(() => blurThen(() => setSheet(true), viewRef), Math.max(SETTLE_MS, notBefore.current - Date.now()));
    return () => clearTimeout(id);
  }, [sheet, calm, due, viewRef]);

  // on screen: the record; never on screen (refused): down again, for the next calm to retry
  const shown = useRef(false);
  const onShown = () => {
    if (shown.current) return;
    shown.current = true;
    markSheetShown(version);
  };
  useEffect(() => {
    if (!sheet) {
      shown.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (!shown.current) {
        console.log("[update] the sheet never reached the screen (another sheet up?); trying again later");
        notBefore.current = Date.now() + REFUSED_BACKOFF_MS;
        setSheet(false);
      }
    }, SHOWN_WITHIN_MS);
    return () => clearTimeout(id);
  }, [sheet]);

  // the switch turned off takes it down for good: turned on again, it waits for a calm Today and the record like the first time
  useEffect(() => {
    if (!up.on) setSheet(false);
  }, [up.on]);
  const open = sheet && up.on && up.waiting;
  useEffect(() => {
    setUpdateSheetUp(open);
    return () => setUpdateSheetUp(false);
  }, [open]);
  const roomed = bannerShows(up, up.seen) && up.waiting && win.height >= TALL_ENOUGH;
  const banner = roomed && !open;
  const room = roomed ? UPDATE_BANNER_ROOM : 0;
  const insets = useMemo(() => (room ? { ...real, top: real.top + room } : real), [real, room]);
  const force = up.force;

  /* THE RATING ASK (lib/rating-ask, 2026-11-01): after a good moment armed it, at the same calm
     the update sheet waits for, and never while an update is due or its sheet is up. Shown once
     per arming: the record is written when it reaches the screen. */
  const rate = useRatingAsk();
  const [rating, setRating] = useState(false);
  useEffect(() => {
    if (rating || !calm || !rate.due || due || sheet) return;
    const id = setTimeout(() => blurThen(() => setRating(true), viewRef), SETTLE_MS);
    return () => clearTimeout(id);
  }, [rating, calm, rate.due, due, sheet, viewRef]);
  const rateVariant = useRef(rate.variant);
  if (!rating) rateVariant.current = rate.variant;
  // a sheet UIKit refused (another Modal up) never reaches the screen: down, and the next calm tries again
  const rateShown = useRef(false);
  useEffect(() => {
    if (!rating) {
      rateShown.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (!rateShown.current) setRating(false);
    }, SHOWN_WITHIN_MS);
    return () => clearTimeout(id);
  }, [rating]);

  return (
    <>
      <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>
      <RatingAskSheet
        open={rating}
        variant={rateVariant.current}
        ratings={rate.ratings}
        onShown={() => {
          if (rateShown.current) return;
          rateShown.current = true;
          ratingShown();
        }}
        onTap={() => {
          setRating(false);
          ratingTapped(rateVariant.current);
        }}
        onLater={() => {
          setRating(false);
          ratingLater(rateVariant.current);
        }}
      />
      {banner ? <UpdateBanner top={real.top} onPress={openAppStore} /> : null}
      <UpdateSheet
        open={open}
        version={version}
        force={force}
        onShown={onShown}
        onLater={() => setSheet(false)}
        onUpdated={() => {
          if (!force) setSheet(false);
        }}
      />
    </>
  );
}
