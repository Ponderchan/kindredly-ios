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

/** the themes that can stand for the day: Classic, Lavender, Paper */
export const LIGHT_KEYS: readonly ThemeKey[] = THEME_KEYS.filter((k) => !THEMES[k].dark);

/* Brand and content colours stay the same in every theme (mock H:19): the
   courier's green, the wax gold, the lime of "auras close". */
export const BRAND: Readonly<typeof data.brand> = data.brand;

/* the 10a mood pairs, fill then ink (H:156). Named apart from the app's
   existing mood data so the two can't be confused while both exist. */
export type MoodKey = keyof typeof data.mood;
export const MOOD10A = data.mood as unknown as Readonly<Record<MoodKey, readonly [fill: string, ink: string]>>;

/* the ink a mood FACE is drawn in on its own tile (themes.json "moodFace";
   KMood.faceInk in Swift): the mood's ink, except where the brand colour is
   too faint for a face — Happy's #94681C, 4.0:1 on its fill, where the brand
   gold is 2.7:1 (owner, 2026-10-16). Faces only: the gold stays the Happy
   ink for everything else. */
const MOOD_FACE: Partial<Record<string, string>> = data.moodFace;
export const MOOD10A_FACE = Object.fromEntries(
  (Object.keys(MOOD10A) as MoodKey[]).map((k) => [k, MOOD_FACE[k] ?? MOOD10A[k][1]]),
) as Readonly<Record<MoodKey, string>>;

/* ── the choice and how it resolves ───────────────────────────────────────
   The reader chooses one APPEARANCE out of five (owner, 2026-10-19, FC2
   decision 5): System, Light, Dark, Lavender, Paper. The themes underneath
   keep their keys (classic / midnight / lavender / paper: themes.json,
   KTheme.named, the Swift generator and every t.dark check are unchanged);
   only the reader's choice is named apart from them.

     system   → the phone's appearance: Midnight in Dark mode, Classic in Light
     light    → Classic
     dark     → Midnight
     lavender → Lavender
     paper    → Paper

   "After dark" is the phone's appearance; there is no clock in this. */

export type Appearance = "system" | "light" | "dark" | "lavender" | "paper";
/** the five, in the order Settings shows them */
export const APPEARANCES: readonly Appearance[] = ["system", "light", "dark", "lavender", "paper"];
/** nothing stored: follow the phone */
export const DEFAULT_APPEARANCE: Appearance = "system";

export const isAppearance = (v: unknown): v is Appearance => typeof v === "string" && (APPEARANCES as readonly string[]).includes(v);

/** The theme a fixed appearance stands for; System has none of its own (it is resolved against
    the phone by resolveAppearance), so it answers null. Settings' swatches draw from this. */
export function appearanceTheme(a: Appearance): ThemeKey | null {
  switch (a) {
    case "light":
      return "classic";
    case "dark":
      return "midnight";
    case "lavender":
      return "lavender";
    case "paper":
      return "paper";
    default:
      return null;
  }
}

/** The theme in effect for an appearance and the phone's scheme ("dark", "light", null). */
export function resolveAppearance(a: Appearance, systemScheme?: string | null): ThemeKey {
  return appearanceTheme(a) ?? (systemScheme === "dark" ? "midnight" : "classic");
}

/** What is written under the key: {"appearance":"…"} */
export const serializeAppearance = (a: Appearance): string => JSON.stringify({ appearance: a });

/* What was saved, read back, migrating the shape the 10a builds wrote,
   { pick, matchSystem } (FC2 §10, decision D-1):
     pick midnight                      → dark
     pick lavender / paper              → lavender / paper (kept: Match system
                                          was never a visible switch, so it says
                                          nothing about what they wanted)
     pick classic, matchSystem false    → light
     pick classic, matchSystem anything else → system
     nothing usable                     → system
   A pick this build doesn't know reads as the old default, Classic. The new
   shape wins when it holds up. Nothing is written back here: the new shape is
   saved the first time the reader picks (lib/theme). Unreadable JSON throws;
   the caller says so. */
export function parseAppearance(raw: string): Appearance {
  const v = JSON.parse(raw) as Record<string, unknown> | null;
  if (v == null || typeof v !== "object") return DEFAULT_APPEARANCE;
  if (isAppearance(v.appearance)) return v.appearance;
  const pick = typeof v.pick === "string" && (THEME_KEYS as string[]).includes(v.pick) ? (v.pick as ThemeKey) : "classic";
  if (pick === "midnight") return "dark";
  if (pick === "lavender" || pick === "paper") return pick;
  if (THEMES[pick].dark) return "dark";
  return v.matchSystem === false ? "light" : "system";
}
