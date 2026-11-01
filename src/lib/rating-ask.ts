import { useEffect, useSyncExternalStore } from "react";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchWithin } from "./net";
import { track } from "./track";
import { readSurfaces, remoteSurfaces, subscribeSurfaces, surfacesReady } from "./surfaces";
import { arm, markLater, markShown, markTapped, parseRating, ratingAskOn, ratingDue, withVariant, type RatingMoment, type RatingState, type RatingVariant } from "./rating-ask-core";

/* THE RATING ASK, FOR THE SCREENS (owner, 2026-11-01). The React Native glue over
   lib/rating-ask-core (which decides, and is node-tested). The record lives on this phone (raw
   AsyncStorage kindredly_rating_ask: a phone asked once is asked no more, whoever signs in).
   A good moment calls armRatingAsk (lib/waiting: a reply came; chat: a kindred made; report: a
   real month read); screens/today/TodayRatingAsk shows it at Today's next calm. Every step is an
   event with { variant, moment }, so which ask works is read from the events table.
   The remote switch: app_surfaces 'ratingask', ON unless a row says false. */

const KEY = "kindredly_rating_ask";
/* the write-a-review page, the one settings-model's SETTINGS_LINKS.rate opens */
export const WRITE_REVIEW_URL = "https://apps.apple.com/app/id6805318131?action=write-review";
const LOOKUP_URL = "https://itunes.apple.com/lookup?id=6805318131&country=us";

let state: RatingState = parseRating(null);
let loaded: Promise<void> | null = null;
let ratings: number | null = null;
const listeners = new Set<() => void>();
const changed = () => {
  snap = null;
  listeners.forEach((f) => f());
};

function load(): Promise<void> {
  if (!loaded)
    loaded = AsyncStorage.getItem(KEY)
      .then((raw) => {
        state = withVariant(parseRating(raw), Math.random());
      })
      .catch((e) => {
        console.log("[rating] the record couldn't be read; starting fresh:", e);
        state = withVariant(state, Math.random());
      })
      .finally(changed);
  return loaded;
}

function save(next: RatingState) {
  state = next;
  changed();
  void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((e) => console.log("[rating] the record couldn't be kept:", e));
}

/** A good moment happened (a reply, a kindred, a real report). Never throws, never waits on a screen. */
export function armRatingAsk(moment: RatingMoment): void {
  void load().then(() => {
    const next = arm(state, moment, Date.now());
    if (next !== state) save(next);
  });
}

export type RatingAsk = { due: boolean; variant: RatingVariant; moment: RatingMoment | null; ratings: number | null };
let snap: RatingAsk | null = null;
let snapRemote: ReturnType<typeof remoteSurfaces> = null;
function snapshot(): RatingAsk {
  const remote = remoteSurfaces();
  if (snap && snapRemote === remote) return snap;
  snapRemote = remote;
  snap = {
    due: ratingAskOn(remote) && ratingDue(state, Date.now()),
    variant: state.variant ?? "letter",
    moment: state.armed?.moment ?? null,
    ratings,
  };
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

/* the App Store's count of ratings (the review's last row): asked once per launch, only when the
   review is about to be shown; unknown = the row isn't drawn */
let counting: Promise<void> | null = null;
function countRatings(): Promise<void> {
  if (!counting)
    counting = (async () => {
      try {
        const res = await fetchWithin(LOOKUP_URL, undefined, 8000);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = (await res.json()) as { results?: { userRatingCount?: unknown }[] };
        const n = j.results?.[0]?.userRatingCount;
        ratings = typeof n === "number" ? n : 0;
        changed();
      } catch (e) {
        console.log("[rating] Apple's count couldn't be read; the row stays hidden:", (e as Error)?.message ?? e);
      }
    })();
  return counting;
}

/** Whether Today should show the ask now, which one, and Apple's count. Never waits. */
export function useRatingAsk(): RatingAsk {
  useEffect(() => {
    void surfacesReady();
    void readSurfaces();
    void load();
  }, []);
  const s = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    if (s.due && s.variant === "review") void countRatings();
  }, [s.due, s.variant]);
  return s;
}

/* the moment of the ask on screen, for its tapped / later events (markShown lets the moment go) */
let shownFor: string = "none";

/** it reached the screen */
export function ratingShown(): void {
  shownFor = state.armed?.moment ?? "none";
  track("rating_ask_shown", { variant: state.variant ?? "letter", moment: shownFor });
  save(markShown(state, Date.now()));
}
/** the key: the App Store's write-a-review page */
export function ratingTapped(variant: RatingVariant): void {
  track("rating_ask_tapped", { variant, moment: shownFor });
  save(markTapped(state));
  Linking.openURL(WRITE_REVIEW_URL).catch((e) => console.warn("[rating] the App Store couldn't be opened:", e));
}
/** Not now */
export function ratingLater(variant: RatingVariant): void {
  track("rating_ask_later", { variant, moment: shownFor });
  save(markLater(state, Date.now()));
}
