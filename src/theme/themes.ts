import data from "./themes.json";

/* THE 10a THEMES, TYPED. themes.json is the one table — four themes ×
   thirteen colours, the brand colours and the mood pairs — and the Swift
   module reads the same file (scripts/gen-theme-swift.mjs), so a colour is
   changed there and nowhere else. This file only gives that table types and
   writes down the two rules the mock states about it
   (.claude/mock/k10/Kindredly 10 Final.dc.html:429-430 and :440).

   Nothing here touches React or React Native, so the rules can be checked
   under plain node (themes.test.ts). The provider that applies them lives in
   lib/theme.tsx. */

export type ThemeKey = keyof typeof data.themes;

/* what each token is for (CLAUDE-CODE-PROMPTS.md:18-31; where the mock uses
   them is in .claude/ui10a-research/tokens-10a.md §1):
     bg     page background — and the text colour on anything filled with ink or ind
     sf     card face, tab bar, sheets
     ink    main text, solid secondary buttons
     ln     outlines and hard shadows (in Midnight a step softer than ink)
     sub    secondary text
     mute   small mono labels, times, placeholders in the bars
     faint  chevrons, disabled, future dates
     soft   grouped-list background (in Midnight the same as sf)
     soft2  stat cells, insets, progress tracks
     line   1px dividers
     lav    pale selected fill (tab lens, chip on)
     lav2   the palest wash of the accent
     ind    indigo: the selected state and the main action */
export type TokenName = "bg" | "sf" | "ink" | "ln" | "sub" | "mute" | "faint" | "soft" | "soft2" | "line" | "lav" | "lav2" | "ind";

export type ThemeTokens = { readonly name: string; readonly dark: boolean } & { readonly [K in TokenName]: string };

/* typed against the JSON, so a theme that loses a token fails tsc */
export const THEMES: Readonly<Record<ThemeKey, ThemeTokens>> = data.themes;
export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

/* the one dark theme. The mock's rule names it outright: Match system turns
   to it after dark, whatever the light pick is. */
const NIGHT: ThemeKey = "midnight";

/** the themes that can stand for the day: Classic, Lavender, Paper */
export const LIGHT_KEYS: readonly ThemeKey[] = THEME_KEYS.filter((k) => !THEMES[k].dark);

/* Brand and content colours stay the same in every theme (mock H:19): the
   courier's green, the wax gold, the lime of "auras close". */
export const BRAND: Readonly<typeof data.brand> = data.brand;

/* the 10a mood pairs, fill then ink (H:156). Named apart from the app's
   existing mood data so the two can't be confused while both exist. */
export type MoodKey = keyof typeof data.mood;
export const MOOD10A = data.mood as unknown as Readonly<Record<MoodKey, readonly [fill: string, ink: string]>>;

/* ── the choice and how it resolves ───────────────────────────────────────
   The reader chooses two things: a theme (pick) and whether to follow the
   phone (matchSystem). Owner, 2026-10-15: everyone follows the system after
   the update, on Classic. */

export type ThemePrefs = { pick: ThemeKey; matchSystem: boolean };
export const DEFAULT_PREFS: ThemePrefs = { pick: "classic", matchSystem: true };

/** the theme a pick stands for by day. Midnight has no day of its own, so
    its day is Classic (H:429). */
export const dayKey = (pick: ThemeKey): ThemeKey => (THEMES[pick].dark ? "classic" : pick);

/* The effective theme (H:430):
     matchSystem on  → system dark ? Midnight : the pick's day theme
     matchSystem off → the pick, as it is
   So Lavender with Match system is Lavender by day and Midnight at night,
   and a stored Midnight with Match system on falls back to Classic by day.
   "After dark" is the phone's appearance; there is no clock in this.

   darkReady is the release guard (DARK_READY in lib/theme.tsx). While it is
   false nothing resolves to Midnight: the screens not yet moved onto the
   theme still paint fixed light colours, and a dark ground behind them would
   show them as white slabs. So system dark, and a stored Midnight pick, both
   give the day theme until the screens have moved. */
export function resolveTheme({
  pick,
  matchSystem,
  systemScheme,
  darkReady = true,
}: ThemePrefs & { systemScheme?: string | null; darkReady?: boolean }): ThemeKey {
  if (!darkReady) return dayKey(pick);
  if (matchSystem) return systemScheme === "dark" ? NIGHT : dayKey(pick);
  return pick;
}

/* Picking a swatch (H:440): Midnight turns Match system off — someone who
   taps Midnight wants it now, not only after dark. Any other pick leaves the
   switch where it was. */
export function applyPick(prefs: ThemePrefs, pick: ThemeKey): ThemePrefs {
  return { pick, matchSystem: THEMES[pick].dark ? false : prefs.matchSystem };
}

/* what was saved, read back. Each field that doesn't hold up falls back to
   its default on its own, so a theme name from a later version doesn't also
   throw away the switch. Unreadable JSON throws; the caller says so. */
export function parsePrefs(raw: string): ThemePrefs {
  const v = JSON.parse(raw) as Partial<Record<keyof ThemePrefs, unknown>> | null;
  const pick = v?.pick;
  const matchSystem = v?.matchSystem;
  return {
    pick: typeof pick === "string" && (THEME_KEYS as string[]).includes(pick) ? (pick as ThemeKey) : DEFAULT_PREFS.pick,
    matchSystem: typeof matchSystem === "boolean" ? matchSystem : DEFAULT_PREFS.matchSystem,
  };
}
