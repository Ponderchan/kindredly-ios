import { surfaceOn, type SurfaceMap } from "./surfaces-resolve";

/* THE UPDATE PROMPT, DECIDED (OTA, 2026-10-25). Pure, so it runs under plain node
   (node src/lib/update-prompt-core.test.ts); lib/update-prompt does the reading and the storing,
   screens/today/TodayUpdate the showing.

   THE SWITCH is two feature keys in app_surfaces (web 0033), read like 'identity' is: the table's
   answer for this binary's own version (else its '*' row), else OFF. There is no build default.
     update_prompt  true = ask this phone to update: the sheet once, then the banner on Today
     update_force   true = hard mode: the sheet has no Later and cannot be put away. Only read
                    while update_prompt is on, so a stray force row alone turns nothing on.
   Target binaries by their own version, never '*'. The App Store numbers releases apart from the
   binary (1.0.6 is binary 1.2.5), so only binaries listed in STORE_OF_BINARY below know their own
   release and refuse to be asked to update to it; a '*' row would reach every later binary too.

   THE SHEET comes once per parcel and at most once a day: never shown on this binary, or shown
   for an older App Store version on an earlier day. In hard mode it is always due. A record left
   by another binary counts as never shown. */

const UPDATE_SURFACE = "update_prompt";
const UPDATE_FORCE_SURFACE = "update_force";

/* no build default for either key: the table's answer or off */
const OFF: SurfaceMap = {};

export type UpdateAsk = { on: boolean; force: boolean };

/** What the table asks of this binary right now. */
export function updateAsk(remote: SurfaceMap | null): UpdateAsk {
  const on = surfaceOn(remote, OFF, UPDATE_SURFACE);
  return { on, force: on && surfaceOn(remote, OFF, UPDATE_FORCE_SURFACE) };
}

/* EACH BINARY'S OWN RELEASE: the App Store version it went out as (app.json "version" → App Store
   Connect). Whatever the table says, a phone is never asked to update to the release it already
   is: a binary's row can be switched on before its successor is live (1.0.6 still in review), and
   Apple would then answer with this binary's own release. Add a line with every release. */
export const STORE_OF_BINARY: Readonly<Record<string, string>> = {
  "1.2.3": "1.0.4",
  "1.2.4": "1.0.5",
  "1.2.5": "1.0.6",
  "1.2.6": "1.0.7",
  "1.2.7": "1.0.8",
};

/** a > b, compared as dotted numbers ("1.0.10" > "1.0.9"); a missing part counts as 0. */
export function newerVersion(a: string, b: string): boolean {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d > 0;
  }
  return false;
}

/** Whether a newer release than this binary's own is waiting in the App Store. A binary in
    STORE_OF_BINARY waits for Apple's answer (unknown = no); one that isn't follows the table. */
export function parcelWaiting(binary: string | null, store: string | null): boolean {
  const own = binary ? STORE_OF_BINARY[binary] : undefined;
  if (!own) return true;
  return !!store && newerVersion(store, own);
}

/** Apple's answer against the release already seen: a CDN's stale copy never takes a phone back
    (on 2026-10-25 the lookup kept answering 1.0.5 for over twenty minutes after 1.0.6 went live). */
export function keepNewer(seen: string | null, answer: string): string {
  return !seen || newerVersion(answer, seen) ? answer : seen;
}

/** Apple's lookup answer → the store's version ("1.0.6"), or null for anything else. */
export function storeVersionOf(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const results = (json as { results?: unknown }).results;
  if (!Array.isArray(results) || !results.length) return null;
  const first = results[0] as { version?: unknown } | null;
  const v = first && typeof first.version === "string" ? first.version.trim() : "";
  return /^\d+(\.\d+){1,3}$/.test(v) ? v : null;
}

/** The sheet was shown: on which binary, for which App Store version (null = unknown then), on which local day. */
export type SheetSeen = { binary: string | null; version: string | null; day: string };

/** The stored record, or null when there is none, it is torn, or it belongs to another binary. */
export function parseSeen(raw: string | null, binary: string | null): SheetSeen | null {
  if (!raw) return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null; // a torn write reads as never shown: one extra sheet at worst
  }
  if (!o || typeof o !== "object") return null;
  const r = o as Partial<SheetSeen>;
  if (r.binary !== binary || typeof r.day !== "string") return null;
  return { binary, version: typeof r.version === "string" ? r.version : null, day: r.day };
}

/** true = raise the sheet now (the caller has already checked that Today is calm). */
export function sheetDue(seen: SheetSeen | null, version: string | null, today: string, force: boolean): boolean {
  if (force) return true;
  if (!seen) return true;
  if (seen.day === today) return false;
  // a newer parcel than the one shown; an unknown version on either side is the same parcel
  return !!version && !!seen.version && version !== seen.version;
}

/** The banner on Today: soft mode, after the sheet has been shown on this binary. */
export function bannerShows(ask: UpdateAsk, seen: SheetSeen | null): boolean {
  return ask.on && !ask.force && !!seen;
}

/** The phone's local calendar day, "2026-10-25". */
export function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
