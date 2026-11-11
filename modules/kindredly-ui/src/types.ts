/* THE SHARED SHAPES OF THE STEP-5 SWIFT SCREENS, as the JS side sees them. Types only, plus one
   constant list and the frosted window's two small helpers (NO_FROST, nativeFrost), so the pure
   builders and their node tests can import it without React Native.

   The Swift side of each lives in ios/Adapters: KScreenProps.swift (the base props and the
   records), KCommandBus.swift (the commands), KSlotView.swift (the slots). */

import type { KThemeKey } from "./InkCard";

export type { KThemeKey };

/** The owner's Letter font, a device preference (ThemeProvider's letterFont). Swift draws
    "garamond" as "newsreader" while EB Garamond isn't embedded in the binary. */
export type LetterFontKey = "newsreader" | "system" | "garamond" | "sfmono";

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

/* A STRANGER'S FROSTED WINDOW AND MARKS (identity Phase 1), as Swift receives them. TS works out
   every colour and position (src/lib/frost FROST v1, through src/lib/stranger-who); Swift only
   draws the gradients (KFrost) and the glyphs (KLineGlyph "she" / "he" / the twelve signs). The
   same shape as src/lib/frost's FrostSpec, written out here so the module needs nothing from the
   app: positions and radii are in units of the window's side. */
export type KFrostBlob = { tone: string; color: string; x: number; y: number; r: number; alpha: number };
export type KFrost = {
  v: number;
  dark: boolean;
  tone: string;
  base: string;
  blobs: readonly KFrostBlob[];
  silhouette: {
    alpha: number;
    head: { x: number; y: number; r: number; solid: number };
    shoulders: { x: number; y: number; rx: number; ry: number; solid: number };
  };
  sheen: { alpha: number; to: number };
  hairline: { alpha: number; width: number };
  corner: number;
  edge: number;
};
/** No window: what a Swift record gets where TS has none (the switch off, nobody there). A
    @Field record can't take null, so the frost is always sent and v 0 means none
    (KFrostRecord.spec is nil for it). */
export const NO_FROST: KFrost = Object.freeze({
  v: 0,
  dark: false,
  tone: "",
  base: "",
  blobs: [],
  silhouette: { alpha: 0, head: { x: 0.5, y: 0.4, r: 0.235, solid: 0.62 }, shoulders: { x: 0.5, y: 1.04, rx: 0.52, ry: 0.36, solid: 0.55 } },
  sheen: { alpha: 0, to: 0.55 },
  hairline: { alpha: 0, width: 1 },
  corner: 0.25,
  edge: 1.5,
}) as KFrost;

/** A window as the Swift record takes it: the spec itself, or NO_FROST for none. Only the
    fields the record reads go (a FrostSpec's blobs are copied to plain objects). */
export function nativeFrost(f: KFrost | null | undefined): KFrost {
  if (!f || !f.v || !f.base) return NO_FROST;
  return {
    v: f.v,
    dark: f.dark,
    tone: f.tone,
    base: f.base,
    blobs: f.blobs.map((b) => ({ tone: b.tone, color: b.color, x: b.x, y: b.y, r: b.r, alpha: b.alpha })),
    silhouette: { alpha: f.silhouette.alpha, head: { ...f.silhouette.head }, shoulders: { ...f.silhouette.shoulders } },
    sheen: { alpha: f.sheen.alpha, to: f.sheen.to },
    hairline: { alpha: f.hairline.alpha, width: f.hairline.width },
    corner: f.corner,
    edge: f.edge,
  };
}

/** The she/he mark beside a stranger's courier name (an ink glyph in sub), or none. */
export type KMark = "she" | "he" | null;
/** The star sign's glyph name beside the mark (src/lib/zodiac Zodiac), or none. */
export type KSign = "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo" | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces" | null;

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
      once per rev, not on every prop change. 0 when absent, which Swift reads as "no rev": it
      then caches nothing and converts on every body run (KScreenProps.cached). */
  rev?: number;
};

/** What a step-5 screen view's ref exposes: the one imperative entry, which lands on the
    view's KCommandBus. Use it through useKCommands (commands.ts) and give the view
    `commands.ref`, which sends the queue the moment the view attaches.

    Call it as ref.current.command(...), never detached (`const c = ref.current.command; c(...)`
    or passing it as a callback): it is a view function expo puts on the component's prototype,
    and expo finds the native view from `this` (expo-modules-core SyncFunctionDefinition.swift
    toNativeClosureArguments skips the owner when `this` is undefined). A detached call casts the
    command name to the view type and rejects, so nothing reaches Swift. */
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
  // Me 4a: the First Class page and My letters
  "KPaywallView",
  "KMyLettersView",
  // the one-letter reader (2026-10-20)
  "KReaderView",
  // the Notes composer (1.0.7, 2026-10-26)
  "KNoteComposeView",
  // the Writing Aura room and its share card (2026-10-26)
  "KAuraRoomView",
  "KAuraShareView",
  // Wren's Journey, the courier page (2026-10-26)
  "KCourierView",
  // Make your own face (2026-10-26; behind the "makeface" switch)
  "KMakeFaceView",
  // the onboarding (binary 1.2.6, off by default)
  "KOnboardingView",
  // the last Me pages (owner, 2026-10-27: "make Me all Swift")
  "KKeepsakesView",
  "KKeepsakeView",
  "KMyKindredsView",
  "KEditFieldView",
  "KBlockedView",
  "KHelpView",
  "KWriteToUsView",
  // a kindred's page (2026-10-27; behind the "kindredpage" switch, off by default)
  "KKindredPageView",
  // Wren's room, the chat with the courier (2026-10-27; behind the "wrenroom" switch)
  "KWrenRoomView",
  // five small pages (2026-10-27), off by default: the Voice report, Your Voice, Unsent, the stamp album, Lore
  "KVoiceReportView",
  // the wrapped monthly report (2026-10-31; behind the "reportwrapped" switch, off by default)
  "KWrappedReportView",
  "KVoiceDetailView",
  "KDraftsView",
  "KStampBookView",
  "KLoreView",
  // three Notes pages (2026-10-27): one journal page, one day of them, the photo roll
  "KNotePageView",
  "KNoteDayView",
  "KPhotoRollView",
  // Wren's introduction, the whole sheet (2026-10-27; behind the "introritual" switch, off by default)
  "KIntroductionView",
  // the pieces over the chat (2026-10-27), each in its own Modal: the lightbox, the song shelf, the signing sheet
  "KPhotoLightboxView",
  "KSongShelfView",
  "KSignSheetView",
  // Today's overlays (2026-10-27), off by default: the unfolded letter, the wardrobe slip, the update prompt's parcel
  "KLetterReaderView",
  "KWardrobeSlipView",
  "KParcelSheetView",
  "KParcelBannerView",
  // the composers' pieces (2026-10-27), off by default: the recording bar, the voice card, Let it travel
  "KRecorderView",
  "KAudioCardView",
  "KLetterTravelView",
  // two pieces of Me (2026-10-27): not screens but the binary's markers for the courier's card
  // ("couriercard") and the Aura card's picture ("auraart"), drawn inside KMeView and KAuraRoomView
  "KCourierCardView",
  "KAuraArtView",
  // the courier's planet on Me (2026-11-11): the binary's marker that KMeView draws its `planet` record
  "KMePlanetView",
  // the planet page (the same switch): src/app/planet.tsx
  "KPlanetPageView",
] as const;

export type KScreenViewName = (typeof KSCREEN_VIEWS)[number];
