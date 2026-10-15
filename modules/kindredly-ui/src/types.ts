/* THE SHARED SHAPES OF THE STEP-5 SWIFT SCREENS, as the JS side sees them. Types only, plus one
   constant list, so the pure builders and their node tests can import it without React Native.

   The Swift side of each lives in ios/Adapters: KScreenProps.swift (the base props and the
   records), KCommandBus.swift (the commands), KSlotView.swift (the slots). */

import type { KThemeKey } from "./InkCard";

export type { KThemeKey };

/** The owner's Letter font, a device preference (ThemeProvider's letterFont). Swift draws
    "garamond" as "newsreader" while EB Garamond isn't embedded in the binary. */
export type LetterFontKey = "newsreader" | "newyork" | "garamond";

/** What a screen's Host doesn't lay out for it (useScreenInsets() in src/lib/screen-insets.ts),
    in points. Screen Hosts ignore the container safe area, so Swift places its own status-bar
    strip and bottom margin from these. */
export type KInsets = {
  /** the status-bar inset */
  top: number;
  /** the home-indicator inset */
  bottom: number;
  /** on a tab screen, the floating tab bar's room (useTabBarSpace()); 0 on a pushed screen */
  tabBarRoom: number;
};

/** One context-menu item, built in TS with today's rules and handed to Swift's .kMenu. The key
    comes back in the screen's action event. */
export type KMenuAction = {
  key: string;
  /** already translated */
  title: string;
  /** an SF Symbol name, e.g. "flag" */
  icon: string;
  /** drawn red, with the destructive role */
  destructive?: boolean;
};

/** A picture for Swift's KImage (the shared KImageStore loads it). */
export type KImageRefProps = {
  /** file:// or https:// (a bare absolute path is read as a file) */
  uri: string;
  /** The cache key: the storage path, asset path or snapshot key, NEVER a signed URL (re-signing
      would refetch). The same key must always mean the same picture. Empty uses the uri. */
  key: string;
  /** "image" (the default) or "videoPoster" (a still from near the start of a video file) */
  kind?: "image" | "videoPoster";
};

/** The props every step-5 screen view takes (Swift: KScreenProps). */
export type KScreenBaseProps = {
  /** a key of src/theme/themes.json (useTheme().key) */
  theme: KThemeKey;
  /** the Letter font (useLetterFont()); "newsreader" when absent */
  letterFont?: LetterFontKey;
  /** zeros when absent */
  insets?: KInsets;
  /** Bump whenever any heavy array prop changes (useRev in commands.ts): Swift converts its rows
      once per rev, not on every prop change. 0 when absent. */
  rev?: number;
};

/** What a step-5 screen view's ref exposes: the one imperative entry, which lands on the
    view's KCommandBus. Use it through useKCommands (commands.ts), which queues until the view
    exists. */
export type KScreenHandle = {
  command(name: string, args: Record<string, unknown>): Promise<void>;
};

/** A scroll target: the first item, the last, or an item's key. */
export type KScrollTarget = "top" | "end" | (string & {});

/** Name -> args of a set of commands. A screen extends the standard set with its own:
    useKCommands<KStandardCommands & { composer: ComposerArgs }>(ref). */
export type KCommandMap = { [name: string]: Record<string, unknown> };

/** The commands every screen may receive, and their args (Swift reads them in
    KCommandBus.swift; KCommandName lists the names). */
export type KStandardCommands = {
  /** seed or restore a field's text: draft resume, restore after a failure, the prompt seed */
  setText: { target: string; value: string };
  /** focus a field by its target name */
  focus: { target: string };
  /** drop focus from every field of the screen */
  blur: Record<string, never>;
  /** scroll to the top, the end or an item's key */
  scrollTo: { key: KScrollTarget; animated?: boolean };
  /** a voice card's playback, sent on play, pause, seek and end only (Swift animates between).
      at is Date.now() when positionS was read. */
  playback: { key: string; playing: boolean; positionS: number; durationS: number; at: number };
  /** screen-specific composer state (canSend, over-limit, …); each screen types its own */
  composer: Record<string, unknown>;
  /** back to the screen's resting state */
  reset: Record<string, never>;
};

/** Every step-5 screen view this module registers, by its JS name (NativeSurface's `view`). */
export const KSCREEN_VIEWS = [
  "KConversationView",
  "KKindredsView",
  "KTodayView",
  "KComposeView",
  "KMeView",
  "KSettingsView",
  "KEditProfileView",
  "KNotesView",
] as const;

export type KScreenViewName = (typeof KSCREEN_VIEWS)[number];
