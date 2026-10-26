import { requireNativeView } from "expo";
import { forwardRef, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* ONE FIELD ON ITS OWN PAGE, drawn by SwiftUI (owner, 2026-10-27: "make Me all Swift";
   ios/Portable/Settings/KEditFieldScreen.swift, adapter ios/Adapters/KSettingsPagesView.swift),
   for src/screens/settings/EditFieldNative.tsx: your pen name or your courier's.

   The field is uncontrolled (KField's contract): TS seeds it with the setText command (target
   "field"), raises the keyboard with focus, and hears every edit through onChange; it never writes
   the text back as a prop, so a composition in progress is never overwritten. Going back saves,
   and that is TS's (beforeRemove), as on the React Native page.

   A whole screen with a text field: alone in one @expo/ui <Host> that keeps the keyboard's safe
   area (SurfaceHost field), only after isKindredlyUIViewAvailable("KEditFieldView") and the
   "editfield" NativeSurface switch say so. */

export type KEditFieldStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  placeholder: string;
  /** the line under the field */
  hint: string;
  /** the reserved line in the hint's place; "" when it doesn't apply */
  reserved: string;
  /** VoiceOver for the clear key */
  clearLabel: string;
};

/** The commands this page takes: the standard setText / focus / blur, on the one field. */
export type KEditFieldCommands = Pick<KStandardCommands, "setText" | "focus" | "blur">;

export type KEditFieldViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KEditFieldStrings;
    /** the most characters it takes */
    maxLength: number;
    /** capitals at each word (the courier's name); none (the pen name) */
    capitalizeWords: boolean;
    onBack?: () => void;
    /** every edit the reader makes (never a setText) */
    onChange?: (text: string) => void;
    /** Done on the keyboard */
    onSubmit?: () => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeKEditFieldViewProps = Omit<KEditFieldViewProps, "letterFont" | "insets" | "rev" | "onBack" | "onChange" | "onSubmit"> &
  Required<Pick<KEditFieldViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onEfBack?: None;
    onEfChange?: Ev<{ text: string }>;
    onEfSubmit?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

const NativeKEditFieldView = requireNativeView<NativeKEditFieldViewProps>("KindredlyUI", "KEditFieldView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Give it useKCommands(...).ref. */
export const KEditFieldView = forwardRef<KScreenHandle, KEditFieldViewProps>(function KEditFieldView(
  { modifiers, letterFont, insets, rev, onBack, onChange, onSubmit, ...rest },
  ref,
) {
  return (
    <NativeKEditFieldView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onEfBack={onBack ? () => onBack() : undefined}
      onEfChange={onChange ? (e) => onChange(e.nativeEvent.text) : undefined}
      onEfSubmit={onSubmit ? () => onSubmit() : undefined}
    />
  );
});
