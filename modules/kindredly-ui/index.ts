/* Kindredly's own SwiftUI views for React Native (the 10a overhaul, iOS 1.3.0). iOS only; each
   view sits inside an @expo/ui <Host> (see src/InkCard.tsx). The app imports this folder by a
   relative path, e.g. "../../modules/kindredly-ui": tsconfig's @/ alias points at src/.

   Step 5 exports every one of its screen views here once (batch 0a), so no screen slice edits
   this file: each slice rewrites its own src/<Screen>.tsx and keeps the export names. */
export { isKindredlyUIAvailable, isKindredlyUIViewAvailable } from "./src/available";
export { InkCardHost, KInkCard, type InkCardHostProps, type KInkCardProps } from "./src/InkCard";
export { KGalleryHost, type KGalleryHostProps } from "./src/Gallery";
export { KTabBar, type KTabBarCard, type KTabBarProps, type KTabBarTab, type KTabGlyph } from "./src/TabBar";

// step 5: the shared plumbing
export {
  KSCREEN_VIEWS,
  type KCommandMap,
  type KImageRefProps,
  type KInsets,
  type KMenuAction,
  type KScreenBaseProps,
  type KScreenHandle,
  type KScreenViewName,
  type KScrollTarget,
  type KStandardCommands,
  type KThemeKey,
  type LetterFontKey,
} from "./src/types";
export {
  COMMAND_QUEUE_LIMIT,
  createCommandChannel,
  createCommandQueue,
  nextRev,
  useKCommands,
  useRev,
  type KCommandChannel,
  type KCommandChannelConfig,
  type KCommandQueue,
  type KCommandSender,
  type KHandleRef,
  type KQueuedCommand,
  type KRevState,
  type UseKCommandsOptions,
} from "./src/commands";
export { nativeDismissKeyboard } from "./src/keyboard";
export { nativeSetTextScript } from "./src/textScript";
export { KIsland, KSlot, type KIslandProps, type KSlotProps } from "./src/Slot";

// step 5: the eight screens (stubs until their slices land)
export { KConversationView, type KConversationViewProps } from "./src/Conversation";
export { KKindredsView, type KKindredsViewProps } from "./src/Kindreds";
export { KTodayView, type KTodayViewProps } from "./src/Today";
export { KComposeView, type KComposeViewProps } from "./src/Compose";
export { KMeView, type KMeViewProps } from "./src/Me";
export { KSettingsView, type KSettingsViewProps } from "./src/Settings";
export { KEditProfileView, type KEditProfileViewProps } from "./src/EditProfile";
export { KNotesView, type KNotesViewProps } from "./src/Notes";

// Me 4a (.claude/me4a/ME4A.md §2.3-2.5): the First Class page and My letters, in Swift
export {
  KPaywallView,
  type KPaywallBenefit,
  type KPaywallCofounder,
  type KPaywallFare,
  type KPaywallMember,
  type KPaywallStrings,
  type KPaywallViewProps,
} from "./src/Paywall";
export {
  KMyLettersView,
  type KMyLettersCard,
  type KMyLettersFace,
  type KMyLettersFilter,
  type KMyLettersStrings,
  type KMyLettersViewProps,
} from "./src/MyLetters";

// the one-letter reader (owner, 2026-10-20), in Swift
export {
  KReaderView,
  nativeReaderHero,
  type KReaderCommands,
  type KReaderFaceKind,
  type KReaderHero,
  type KReaderLetter,
  type KReaderStrings,
  type KReaderViewProps,
} from "./src/Reader";

// the Notes composer (1.0.7, owner 2026-10-26: the Note Composer Bar), in Swift
export {
  KNoteComposeView,
  nativeNoteGroups,
  type KNoteComposeCommands,
  type KNoteComposeStrings,
  type KNoteComposeViewProps,
  type KNoteMediaCard,
  type KNoteMediaKind,
  type KNoteMood,
  type KNoteMoodFace,
  type KNoteMoodGroup,
  type KNoteMoodGroupKey,
  type KNotePanel,
  type KNoteThumb,
} from "./src/NoteCompose";
// the Writing Aura room and its share card (owner decision 2026-10-26, 1.0.7), in Swift
export {
  KAuraRoomView,
  KAuraShareView,
  nativeDim,
  type KAuraArtKind,
  type KAuraDim,
  type KAuraLens,
  type KAuraPause,
  type KAuraReading,
  type KAuraRoomData,
  type KAuraRoomStrings,
  type KAuraRoomViewProps,
  type KAuraShareStrings,
  type KAuraShareViewProps,
  type KAuraSticker,
  type KAuraTicket,
  type KAuraUsageGroup,
  type KAuraUsageItem,
  type KAuraWord,
} from "./src/Aura";
// Wren's Journey, the courier page (owner, 2026-10-26), in Swift
export {
  KCourierView,
  type KCourierBand,
  type KCourierCell,
  type KCourierCover,
  type KCourierFace,
  type KCourierFact,
  type KCourierFirstClass,
  type KCourierHero,
  type KCourierKeepsake,
  type KCourierLog,
  type KCourierSlip,
  type KCourierStop,
  type KCourierStrings,
  type KCourierTile,
  type KCourierViewProps,
} from "./src/Courier";
// the onboarding (binary 1.2.6; app_surfaces "onboarding", off by default), in Swift
export {
  KOnboardingView,
  type KObAuth,
  type KObDob,
  type KObDoor,
  type KObEnvelope,
  type KObEvent,
  type KObFace,
  type KObFold,
  type KObGround,
  type KObHatch,
  type KObLetter,
  type KObMake,
  type KObName,
  type KObScreenId,
  type KObShell,
  type KObSideId,
  type KObWord,
  type KOnboardingCommands,
  type KOnboardingViewProps,
} from "./src/Onboarding";

// Make your own face (owner, 2026-10-26; binary 1.2.6, behind the "makeface" switch), in Swift
export {
  KMakeFaceView,
  makeFaceWrenSize,
  nativeFaceChips,
  prepareFacePhoto,
  type KMakeFaceChip,
  type KMakeFaceChipGroup,
  type KMakeFaceCommands,
  type KMakeFaceEntry,
  type KMakeFaceMethod,
  type KMakeFaceScreen,
  type KMakeFaceStrings,
  type KMakeFaceViewProps,
} from "./src/MakeFace";

// the last Me pages (owner, 2026-10-27: "make Me all Swift"), each behind its own switch
export {
  KKeepsakeView,
  KKeepsakesView,
  type KKeepsakeStrings,
  type KKeepsakeTile,
  type KKeepsakeViewProps,
  type KKeepsakesStrings,
  type KKeepsakesViewProps,
} from "./src/Keepsakes";
export {
  KMyKindredsView,
  type KMyKindredCard,
  type KMyKindredsState,
  type KMyKindredsStrings,
  type KMyKindredsViewProps,
} from "./src/MyKindreds";
export { KEditFieldView, type KEditFieldCommands, type KEditFieldStrings, type KEditFieldViewProps } from "./src/EditField";
export {
  KBlockedView,
  nativeBlockedRow,
  type KBlockedFace,
  type KBlockedRow,
  type KBlockedState,
  type KBlockedStrings,
  type KBlockedViewProps,
} from "./src/Blocked";
export { KHelpView, type KHelpItem, type KHelpStrings, type KHelpViewProps } from "./src/Help";
export { KWriteToUsView, type KWriteToUsCommands, type KWriteToUsStrings, type KWriteToUsViewProps } from "./src/WriteToUs";

// step 5, batch 0b: the spike lab (dev only: src/app/dev/step5-lab.tsx)
export {
  KLabView,
  type KLabCommands,
  type KLabFacts,
  type KLabMeasure,
  type KLabRow,
  type KLabStrings,
  type KLabViewProps,
} from "./src/Lab";

// the name-trading ceremony's signed ritual (owner, 2026-10-26; 1.0.7), in Swift, behind the
// "ceremony" switch (src/components/IntroductionRitualNative.tsx)
export {
  KIntroRitualView,
  KINTRO_RITUAL_HEIGHT,
  kIntroRitualHeight,
  type KIntroRitualBeats,
  type KIntroRitualCrossing,
  type KIntroRitualFace,
  type KIntroRitualNotice,
  type KIntroRitualSide,
  type KIntroRitualStroke,
  type KIntroRitualViewProps,
} from "./src/IntroRitual";
