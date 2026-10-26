import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KInsets, type KMark, type KScreenBaseProps, type KScreenHandle, type KSign } from "./types";

/* BLOCKED & REPORTED, drawn by SwiftUI (owner, 2026-10-27: "make Me all Swift";
   ios/Portable/Settings/KBlockedScreen.swift, adapter ios/Adapters/KSettingsPagesView.swift), for
   src/screens/settings/BlockedNative.tsx. TS reads the blocks and builds every row with who each
   person was (screens/settings/blocked-model over lib/who); Swift draws them and reports taps. TS
   asks before anyone is let back (the React Native page's Alert).

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KBlockedView") and the "blocked" NativeSurface switch say so. */

export type KBlockedStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** "03", or "··" while it loads */
  count: string;
  /** what VoiceOver says for the count ("3"); "" hides it */
  countA11y: string;
  loadFail: string;
  emptyTitle: string;
  emptyBody: string;
  /** what a report does */
  footer: string;
  noReach: string;
  unblock: string;
};

export type KBlockedState = "loading" | "ok" | "empty" | "failed";

/** The face they wore (lib/stranger-who WhoFace): the mosaic's mask, the frosted window, or the veil. */
export type KBlockedFace = { kind: "mosaic"; mask: number } | { kind: "frost"; spec: KFrost } | { kind: "veil" };

export type KBlockedRow = {
  /** the blocked person's id */
  id: string;
  name: string;
  mark: KMark;
  sign: KSign;
  face: KBlockedFace;
  /** "BLOCKED OCT 14, 2026" */
  since: string;
  /** what VoiceOver says for them */
  spoken: string;
  /** VoiceOver for their UNBLOCK */
  unblockA11y: string;
};

export type KBlockedViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KBlockedStrings;
    state: KBlockedState;
    /** the identity switch: windows (on) or mosaics (off) */
    identity: boolean;
    rows: KBlockedRow[];
    onBack?: () => void;
    onUnblock?: (id: string) => void;
    onRetry?: () => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeRow = Omit<KBlockedRow, "face" | "mark" | "sign"> & {
  face: { kind: "mosaic" | "frost" | "veil"; mask: number; frost: KFrost };
  mark: string;
  sign: string;
};

type NativeKBlockedViewProps = Omit<KBlockedViewProps, "letterFont" | "insets" | "rev" | "rows" | "onBack" | "onUnblock" | "onRetry"> &
  Required<Pick<KBlockedViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    rows: NativeRow[];
    onBlBack?: None;
    onBlUnblock?: Ev<{ id: string }>;
    onBlRetry?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

/** A row as the Swift record takes it: the face flattened (a record can't be a union), no nulls. */
export function nativeBlockedRow(r: KBlockedRow): NativeRow {
  const f = r.face;
  const face =
    f.kind === "frost"
      ? { kind: "frost" as const, mask: 0, frost: nativeFrost(f.spec) }
      : f.kind === "mosaic"
        ? { kind: "mosaic" as const, mask: f.mask, frost: nativeFrost(null) }
        : { kind: "veil" as const, mask: 0, frost: nativeFrost(null) };
  return { ...r, face, mark: r.mark ?? "", sign: r.sign ?? "" };
}

const NativeKBlockedView = requireNativeView<NativeKBlockedViewProps>("KindredlyUI", "KBlockedView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KBlockedView = forwardRef<KScreenHandle, KBlockedViewProps>(function KBlockedView(
  { modifiers, letterFont, insets, rev, rows, onBack, onUnblock, onRetry, ...rest },
  ref,
) {
  const sent = useMemo(() => rows.map(nativeBlockedRow), [rows]);
  return (
    <NativeKBlockedView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      rows={sent}
      onBlBack={onBack ? () => onBack() : undefined}
      onBlUnblock={onUnblock ? (e) => onUnblock(e.nativeEvent.id) : undefined}
      onBlRetry={onRetry ? () => onRetry() : undefined}
    />
  );
});
