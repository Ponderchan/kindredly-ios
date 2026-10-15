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
