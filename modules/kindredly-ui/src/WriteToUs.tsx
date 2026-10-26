import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* WRITE TO US, drawn by SwiftUI (owner, 2026-10-27: "make Me all Swift";
   ios/Portable/Settings/KWriteToUsScreen.swift, adapter ios/Adapters/KSettingsPagesView.swift), for
   src/screens/settings/WriteToUsNative.tsx.

   Two uncontrolled fields (KField's contract), targets "body" (the letter) and "email": TS raises
   the keyboard with focus and hears every edit through onBodyChange / onEmailChange. Whether it
   may go (canSend), the sending, the failure and the sent page are TS's props; sending is TS's
   (lib/db sendSupportLetter). Send drops the keyboard in Swift before it reports.

   A whole screen with text fields: alone in one @expo/ui <Host> that keeps the keyboard's safe
   area (SurfaceHost field), only after isKindredlyUIViewAvailable("KWriteToUsView") and the
   "writetous" NativeSurface switch say so. */

export type KWriteToUsStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** her opener, her name in it */
  intro: string;
  placeholder: string;
  addrLabel: string;
  addrPlaceholder: string;
  addrHint: string;
  /** the failed send's line; "" for none */
  fail: string;
  send: string;
  /** the version line under the key */
  travelsWith: string;
  sentTitle: string;
  /** her line on the sent page (with or without an address) */
  sentBody: string;
  done: string;
};

/** The commands this page takes: the standard setText / focus / blur, on "body" or "email". */
export type KWriteToUsCommands = Pick<KStandardCommands, "setText" | "focus" | "blur">;

export type KWriteToUsViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KWriteToUsStrings;
    /** her listening snapshot beside the opener */
    bird: KImageRefProps | null;
    /** her delighted snapshot on the sent page */
    sentBird: KImageRefProps | null;
    canSend: boolean;
    sending: boolean;
    sent: boolean;
    onBack?: () => void;
    onBodyChange?: (text: string) => void;
    onEmailChange?: (text: string) => void;
    onSend?: () => void;
    onDone?: () => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeKWriteToUsViewProps = Omit<KWriteToUsViewProps, "letterFont" | "insets" | "rev" | "bird" | "sentBird" | "onBack" | "onBodyChange" | "onEmailChange" | "onSend" | "onDone"> &
  Required<Pick<KWriteToUsViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    bird: KImageRefProps;
    sentBird: KImageRefProps;
    onWuBack?: None;
    onWuBody?: Ev<{ text: string }>;
    onWuEmail?: Ev<{ text: string }>;
    onWuSend?: None;
    onWuDone?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const imageOf = (r: KImageRefProps | null): KImageRefProps => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

const NativeKWriteToUsView = requireNativeView<NativeKWriteToUsViewProps>("KindredlyUI", "KWriteToUsView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Give it useKCommands(...).ref. */
export const KWriteToUsView = forwardRef<KScreenHandle, KWriteToUsViewProps>(function KWriteToUsView(
  { modifiers, letterFont, insets, rev, bird, sentBird, onBack, onBodyChange, onEmailChange, onSend, onDone, ...rest },
  ref,
) {
  const b = useMemo(() => imageOf(bird), [bird]);
  const sb = useMemo(() => imageOf(sentBird), [sentBird]);
  return (
    <NativeKWriteToUsView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      bird={b}
      sentBird={sb}
      onWuBack={onBack ? () => onBack() : undefined}
      onWuBody={onBodyChange ? (e) => onBodyChange(e.nativeEvent.text) : undefined}
      onWuEmail={onEmailChange ? (e) => onEmailChange(e.nativeEvent.text) : undefined}
      onWuSend={onSend ? () => onSend() : undefined}
      onWuDone={onDone ? () => onDone() : undefined}
    />
  );
});
