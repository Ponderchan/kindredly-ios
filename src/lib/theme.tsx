import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Appearance as RNAppearance, useColorScheme } from "react-native";
import Constants from "expo-constants";
import * as SystemUI from "expo-system-ui";
import { DEFAULT_LETTER_FONT, P, letterFamily, letterFontKey, type LetterFace, type LetterFontKey } from "../theme/post";
import {
  DEFAULT_APPEARANCE,
  THEMES,
  THEME_KEYS,
  isAppearance,
  parseAppearance,
  resolveAppearance,
  serializeAppearance,
  type Appearance,
  type ThemeKey,
  type ThemeTokens,
} from "../theme/themes";

/* THE APP'S THEME, AT RUNTIME (10a step 1; FC2 2026-10-19). Four themes —
   Classic, Midnight, Lavender, Paper — chosen through five APPEARANCES —
   System, Light, Dark, Lavender, Paper — resolved by the rule in
   theme/themes.ts and handed to every screen through useTheme(). System
   follows the phone live: useColorScheme re-renders the provider when iOS
   turns Dark mode on or off.

   Screens move onto it one file at a time: a screen that still imports the
   static P (and C, Y, ROW, PUNCH) paints exactly what it painted before; a
   screen moves over by taking its colours from useTheme() — or, for a P
   screen, from useP() below. The navigation chrome (the root stack's and
   the tabs' grounds) already follows it.

   It also carries the reader's letter font (letterFont / setLetterFont,
   useLetterFont, useLetterFamily), a device setting like the theme.

   The choice is the phone's, not the account's: raw AsyncStorage, not
   scoped-store, because the theme has to be known before anyone has signed
   in — the launch and onboarding come first — and stays put when the
   account on the phone changes. */

/* THE RELEASE GUARD, now open (owner, 2026-10-19: "open it"). It held the
   effective theme off Midnight while screens still painted fixed light
   colours; the binary that ships with it set app.json userInterfaceStyle
   "automatic" (Info.plist UIUserInterfaceStyle Automatic, by hand) and gave
   the splash its dark variant (SplashScreenBackground.colorset; app.json's
   expo-splash-screen "dark"), so a dark phone starts night all the way
   through (components/LaunchAnimation). Kept as an export, always true, for
   anything that still reads it. */
export const DARK_READY = true;

/** The dim behind a sheet, a popover or a modal card. The light themes keep the 10a navy at
    `a`; on a dark ground navy comes out lighter than the page (#141224 over Midnight's
    #0F0E1C), so Midnight dims with black, a little stronger — the same step the Swift kit takes
    (KDim.composer .3 → .45, the Notes calendar scrim .18 → .35). */
export const scrimColor = (dark: boolean, a = 0.3): string => (dark ? `rgba(0,0,0,${Math.min(0.6, +(a + 0.15).toFixed(2))})` : `rgba(30,27,53,${a})`);

const KEY = "kindredly_theme"; // {"appearance":"…"} as JSON (older builds: { pick, matchSystem }, migrated on read)

/* THE LETTER FONT (10a) is the phone's too, for the same reasons, and sits
   beside the theme: raw AsyncStorage, the bare key as a string. What it is
   and where it applies: theme/post (LETTER_FACES, letterFamily). Garamond
   can't be chosen until GARAMOND_READY, and a stored "garamond" reads as
   the default until then. */
const LETTER_KEY = "kindredly_letter_font"; // "newsreader" | "system" | "garamond" | "sfmono"

export { APPEARANCES, type Appearance } from "../theme/themes";

export {
  GARAMOND_READY,
  LETTER_FONT_CHOICES,
  LETTER_FONT_KEYS,
  letterFamily,
  type LetterFace,
  type LetterFontKey,
} from "../theme/post";

export type Theme = {
  /** the theme in effect right now */
  key: ThemeKey;
  /** its 13 colours */
  t: ThemeTokens;
  dark: boolean;
  /** what the reader chose: system / light / dark / lavender / paper (System at night is
      still "system" here, while key is Midnight) */
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  /** the face other people's letters are set in for this reader — always
      one this build can draw (never Garamond before GARAMOND_READY). Swift
      screens take it as their `letterFont` prop; React Native text takes
      letterFamily(letterFont) or useLetterFamily(). */
  letterFont: LetterFontKey;
  /** Settings' letter-font picker. Saved on the phone; a key this build
      can't draw (Garamond before GARAMOND_READY) is ignored. */
  setLetterFont: (k: LetterFontKey) => void;
};

/* outside the provider: the default theme, and setters that do nothing */
const fallbackKey = resolveAppearance(DEFAULT_APPEARANCE, "light");
const ThemeCtx = createContext<Theme>({
  key: fallbackKey,
  t: THEMES[fallbackKey],
  dark: THEMES[fallbackKey].dark,
  appearance: DEFAULT_APPEARANCE,
  setAppearance: () => {},
  letterFont: DEFAULT_LETTER_FONT,
  setLetterFont: () => {},
});

/* THE NATIVE PARTS FOLLOW THE THEME. The keyboard, alerts, context menus
   and the SwiftUI menus take their light or dark from the window, not from
   our colours, so the window is told:
     System         → "unspecified", so the window — and useColorScheme —
                      follow the phone
     anything else  → the chosen theme's own light or dark
   Setting "light" or "dark" also changes what useColorScheme reports (the
   override is on the window it reads), which is fine: only System reads the
   system scheme. Choosing System again can take one frame on the old answer
   before the window reports the phone's.

   Nothing is forced at module load any more: the binary follows the phone
   (UIUserInterfaceStyle Automatic), and so does the default, System. */

/* app.json's backgroundColor: the native root view's colour in the light
   themes (see the provider) */
const ROOT_DAY = Constants.expoConfig?.backgroundColor ?? P.penWash;

/* ── the dev theme switch ───────────────────────────────────────────────────
   DEV ONLY. Forces one theme on the whole app, so a screen that has moved onto the theme can be seen
   in each of the four before release (ui-lab has the buttons). It is not the
   reader's choice: it lives in memory only, is never saved, leaves the
   reader's appearance alone, and is gone at the next launch.

   In a release build it can't be set: the setter returns without doing
   anything when __DEV__ is false, and the hook the provider reads it through
   answers null, so the theme resolves exactly as it would without this code. */
let devOverride: ThemeKey | null = null;
const devListeners = new Set<() => void>();

/** dev only: force this theme everywhere, or null to go back to the normal one */
export function setDevThemeOverride(k: ThemeKey | null): void {
  if (!__DEV__) return;
  devOverride = k;
  devListeners.forEach((l) => l());
}

const subscribeDev = (l: () => void) => {
  devListeners.add(l);
  return () => {
    devListeners.delete(l);
  };
};
const readDev = () => devOverride;

/** dev only: the forced theme, or null when nothing is forced (always null in a release build) */
export function useDevThemeOverride(): ThemeKey | null {
  const k = useSyncExternalStore(subscribeDev, readDev);
  return __DEV__ ? k : null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(DEFAULT_APPEARANCE);
  // set once the reader has changed something, so the saved copy can't
  // land on top of a choice made before it was read, and the defaults are
  // never written back on launch
  const touched = useRef(false);
  const system = useColorScheme();

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        // older builds' { pick, matchSystem } is migrated here, in memory only: nothing is
        // written back until the reader picks
        if (alive && !touched.current && raw != null) setAppearanceState(parseAppearance(raw));
      })
      .catch((e) => console.warn("[theme] the saved theme wasn't read, using the default:", e));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!touched.current) return;
    AsyncStorage.setItem(KEY, serializeAppearance(appearance)).catch((e) => console.warn("[theme] the theme wasn't saved:", e));
  }, [appearance]);

  const setAppearance = useCallback((a: Appearance) => {
    if (!isAppearance(a)) {
      console.warn(`[theme] "${String(a)}" isn't an appearance; keeping the current one`);
      return;
    }
    touched.current = true;
    setAppearanceState(a);
  }, []);

  // the letter font: read once, written only when the reader picks (the
  // same rule as the theme's — a pick made before the read wins)
  const [letterFont, setLetterFontState] = useState<LetterFontKey>(DEFAULT_LETTER_FONT);
  const letterTouched = useRef(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(LETTER_KEY)
      .then((raw) => {
        if (alive && !letterTouched.current && raw != null) setLetterFontState(letterFontKey(raw));
      })
      .catch((e) => console.warn("[theme] the saved letter font wasn't read, using the default:", e));
    return () => {
      alive = false;
    };
  }, []);
  const setLetterFont = useCallback((k: LetterFontKey) => {
    if (letterFontKey(k) !== k) {
      console.warn(`[theme] letter font "${k}" can't be drawn by this build; keeping the current one`);
      return;
    }
    letterTouched.current = true;
    setLetterFontState(k);
    AsyncStorage.setItem(LETTER_KEY, k).catch((e) => console.warn("[theme] the letter font wasn't saved:", e));
  }, []);

  const devKey = useDevThemeOverride();
  const key = devKey ?? resolveAppearance(appearance, system);
  const t = THEMES[key];

  // a forced theme also sets the window's light or dark, so the keyboard and
  // the native menus match the screens while it is on
  const scheme: "light" | "dark" | "unspecified" = devKey
    ? (t.dark ? "dark" : "light")
    : appearance === "system" ? "unspecified" : t.dark ? "dark" : "light";
  useEffect(() => {
    RNAppearance.setColorScheme(scheme);
  }, [scheme]);

  /* AND THE WINDOW UNDER EVERYTHING (step 7.1). Below React sits the native
     root view and the window, painted app.json's backgroundColor (the
     launch lavender) by expo-system-ui. They show wherever React doesn't
     cover the screen — behind a page-sheet modal as it rises, in a reload's
     frames — and app.json can't give that colour a dark variant, so
     Midnight paints them its ground here. The light themes set app.json's
     own colour back, the one they always had: expo-system-ui keeps the last
     colour set on the phone and starts the next launch on it, so a light
     launch has to undo a Midnight one. */
  const rootGround = t.dark ? t.bg : ROOT_DAY;
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(rootGround).catch((e) => console.warn("[theme] the root view's colour wasn't set:", e));
  }, [rootGround]);

  const value = useMemo<Theme>(
    () => ({ key, t, dark: t.dark, appearance, setAppearance, letterFont, setLetterFont }),
    [key, t, appearance, setAppearance, letterFont, setLetterFont],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/** the theme in effect, its colours, and the reader's choice with setters */
export const useTheme = (): Theme => useContext(ThemeCtx);

/** The reader's letter font (always one this build can draw). Pass it to a
    Swift screen as `letterFont`; put it in the deps of anything memoised
    on letter text. */
export const useLetterFont = (): LetterFontKey => useContext(ThemeCtx).letterFont;

/** The React Native type for someone's letter in the reader's chosen face —
    spread it into the Text style: `style={[{ fontSize: 17 }, useLetterFamily()]}`.
    For all CONTENT (theme/post: where the letter font applies): letters,
    notes, chat bubbles, Wren's lines, and every field where someone writes
    content. Pass true for an italic line; a face without one draws upright. */
export function useLetterFamily(italic = false): LetterFace {
  const k = useLetterFont();
  return useMemo(() => letterFamily(k, italic), [k, italic]);
}

/* ── useP(): the migration adapter ─────────────────────────────────────────
   A P-shaped palette drawn from the active theme. A screen that paints from
   the static P moves over by dropping P from its import and writing
   `const P = useP();` at the top of each component; its P.ink call sites
   stay as they are. Static P stays exported and unchanged, so a screen that
   hasn't moved renders exactly as it does today.

   Each P key goes to the 10a token that does the same job:

     P key                 10a      why
     paper, ground         bg       the page itself
     sheet                 sf       a card or panel face on the page
     paperDeep             soft2    a shade down, for insets and pressed rows.
                                    Not soft: in Midnight soft is the same as
                                    sf, so a pressed card wouldn't change
     ink, groundInk        ink      type. P.ink also draws rules and outlines;
                                    when a screen moves, borders belong on
                                    t.ln (in Midnight a step softer than ink)
     ink60, groundInk60    sub      secondary text
     ink40, groundInk40    mute     small labels, times, quiet captions
     ink12                 line     soft hairlines and dividers
     pen                   ind      the one actionable colour
     penWash               lav2     the accent's palest wash; in Classic
                                    #EEEDFB sits next to the old #ECECFE. Most
                                    uses are the ground of a wash route —
                                    10a has one ground per theme, so a screen
                                    that moves should paint its page t.bg
                                    (Lavender is now the theme that tints
                                    every page)
     post, air, brassSeal  static   the postmark, the airmail stripe, the wax
                                    disc: objects with their own colour
     keyText, keyVoice     static   the note keys' identity colours, chosen by
                                    the owner (text = lavender, voice = sky).
                                    They stay pale in every theme, so the
                                    label drawn on them must keep a fixed dark
                                    ink (static P.ink), not this palette's —
                                    in Midnight that is a light ink

   Built once per theme, so a screen gets the same object back until the
   theme changes. */
export type PostPalette = { readonly [K in keyof typeof P]: string };

function postFor(t: ThemeTokens): PostPalette {
  return {
    paper: t.bg,
    ground: t.bg,
    sheet: t.sf,
    paperDeep: t.soft2,
    ink: t.ink,
    ink60: t.sub,
    ink40: t.mute,
    ink12: t.line,
    groundInk: t.ink,
    groundInk60: t.sub,
    groundInk40: t.mute,
    pen: t.ind,
    penWash: t.lav2,
    post: P.post,
    air: P.air,
    brassSeal: P.brassSeal,
    keyText: P.keyText,
    keyVoice: P.keyVoice,
  };
}

const POST_BY_THEME = Object.fromEntries(THEME_KEYS.map((k) => [k, postFor(THEMES[k])])) as Record<ThemeKey, PostPalette>;

/** the static P's keys, coloured by the active theme — see above */
export function useP(): PostPalette {
  return POST_BY_THEME[useTheme().key];
}
