import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KScreenBaseProps } from "./types";

/* THE SHEETS EVERY SCREEN SHARES, drawn by SwiftUI (2026-10-27): ios/Adapters/
   KSharedSheetsView.swift → ios/Portable/Sheets. Each is the twin of a React Native piece that
   stays its fallback behind its own switch:

     KLeaveSheetView    src/components/LeaveSheet.tsx      "leavesheet"
     KReportMenuView    src/components/ReportMenu.tsx      "reportsheet" (the card; the dim and
                                                           the block sheet stay ReportSheet's)
     KSignUpSheetView   src/components/SignUpSheet.tsx     "signupsheet"
     KToastView         src/components/ui.tsx Toast        "toast"

   TS sends every word (sentence case already), every colour that isn't the theme's and every
   number; Swift draws them and reports which key was pressed. Each sits in an @expo/ui <Host> of
   its own, only after isKindredlyUIViewAvailable(view) and its switch say so (NativeSurface). */

/** A colour with its alpha: a scrim as TS writes it ("rgba(30,27,53,0.3)"), split. */
export type KSheetDim = { hex: string; alpha: number };

/** One key of the leave sheet (LeaveAction, as Swift takes it). */
export type KLeaveSheetKey = {
  /** sentence case already (sheetWords) */
  label: string;
  kind: "primary" | "destructive" | "quiet";
  /** a mark before the label; "" for none */
  lead: string;
  selected: boolean;
  /** VoiceOver says this instead of the label; "" = the label */
  voiceLabel: string;
  /** BCP 47; "" = the reader's language */
  voiceLanguage: string;
  /** the key shows "…" (VoiceOver still hears the label) */
  busy: boolean;
};

export type KLeaveSheetViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    title: string;
    body: string;
    keys: KLeaveSheetKey[];
    /** the cancel row's words; null hides the row */
    cancel: string | null;
    /** VoiceOver for the ✕ */
    closeLabel: string;
    dim: KSheetDim;
    /** under the card: max(safe bottom − 26, 8) and the tab bar's room when not in a Modal */
    bottomMargin: number;
    /** the card's tallest */
    maxHeight: number;
    onKey?: (index: number) => void;
    onCancel?: () => void;
  };

type NativeLeaveProps = Omit<KLeaveSheetViewProps, "body" | "cancel" | "onKey" | "onCancel"> & {
  bodyText: string;
  cancel: string;
  showCancel: boolean;
  onLsKey?: (e: { nativeEvent: { index: number } }) => void;
  onLsCancel?: () => void;
};

// each view's JS name is its Swift struct's name (ios/Adapters/KSharedSheetsView.swift)
const NativeKLeaveSheetView = requireNativeView<NativeLeaveProps>("KindredlyUI", "KLeaveSheetView");

/** The bare SwiftUI leave sheet (dim and card). Only inside an @expo/ui <Host> that fills the screen. */
export function KLeaveSheetView({ modifiers, body, cancel, onKey, onCancel, ...rest }: KLeaveSheetViewProps) {
  return (
    <NativeKLeaveSheetView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      bodyText={body}
      cancel={cancel ?? ""}
      showCancel={cancel !== null}
      onLsKey={onKey ? (e) => onKey(e.nativeEvent.index) : undefined}
      onLsCancel={onCancel ? () => onCancel() : undefined}
    />
  );
}

/** What a press on the report card asks for. */
export type KReportMenuAction = "report" | "block" | "close";

export type KReportMenuViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    /** true: the three choices; false: the answer line and Done */
    menu: boolean;
    report: string;
    block: string;
    never: string;
    answer: string;
    done: string;
    /** a report or a block on its way */
    busy: boolean;
    /** "#RRGGBB": block's word */
    blockInk: string;
    /** "#RRGGBB": the ban glyph */
    banInk: string;
    /** the room around the card inside its Host (for its shadow), in points */
    room: number;
    onAction?: (action: KReportMenuAction) => void;
  };

type NativeReportProps = Omit<KReportMenuViewProps, "onAction"> & {
  onRmAction?: (e: { nativeEvent: { key: string } }) => void;
};

const NativeKReportMenuView = requireNativeView<NativeReportProps>("KindredlyUI", "KReportMenuView");

/** The bare SwiftUI report card. Only inside an @expo/ui <Host> (matchContents vertical). */
export function KReportMenuView({ modifiers, onAction, ...rest }: KReportMenuViewProps) {
  return (
    <NativeKReportMenuView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      onRmAction={onAction ? (e) => onAction(e.nativeEvent.key as KReportMenuAction) : undefined}
    />
  );
}

export type KSignUpSheetViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    title: string;
    /** what the account is for, now */
    reason: string;
    email: string;
    notYet: string;
    closeLabel: string;
    /** the phone can sign in with Apple */
    apple: boolean;
    /** the white Apple key (a dark ground) */
    appleWhite: boolean;
    /** a sign-in on its way */
    busy: "" | "apple" | "email";
    dim: KSheetDim;
    bottomMargin: number;
    onApple?: () => void;
    onEmail?: () => void;
    onClose?: () => void;
  };

type NativeSignUpProps = Omit<KSignUpSheetViewProps, "onApple" | "onEmail" | "onClose"> & {
  onSuApple?: () => void;
  onSuEmail?: () => void;
  onSuClose?: () => void;
};

const NativeKSignUpSheetView = requireNativeView<NativeSignUpProps>("KindredlyUI", "KSignUpSheetView");

/** The bare SwiftUI sign-up sheet (dim and card). Only inside an @expo/ui <Host> that fills the screen. */
export function KSignUpSheetView({ modifiers, onApple, onEmail, onClose, ...rest }: KSignUpSheetViewProps) {
  return (
    <NativeKSignUpSheetView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      onSuApple={onApple ? () => onApple() : undefined}
      onSuEmail={onEmail ? () => onEmail() : undefined}
      onSuClose={onClose ? () => onClose() : undefined}
    />
  );
}

export type KToastViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    message: string;
    /** "#RRGGBB": the pill (toastColors fill) */
    fill: string;
    /** "#RRGGBB": the words (toastColors text) */
    ink: string;
  };

const NativeKToastView = requireNativeView<KToastViewProps>("KindredlyUI", "KToastView");

/** The bare SwiftUI toast. Only inside an @expo/ui <Host> (matchContents vertical, no touches). */
export function KToastView({ modifiers, ...rest }: KToastViewProps) {
  return <NativeKToastView modifiers={modifiers} {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)} {...rest} />;
}
