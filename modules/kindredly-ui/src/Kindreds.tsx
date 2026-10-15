import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KMenuAction, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* THE KINDREDS TAB, drawn by SwiftUI (ios/Portable/Kindreds/KKindredsScreen.swift, adapter
   ios/Adapters/KKindredsView.swift), for src/screens/kindreds/KindredsNative.tsx. Every word,
   date, count and menu comes in from TS (src/screens/kindreds/kindreds-model.ts builds them);
   Swift draws them and reports taps. Swift keeps only the gesture's state: the orbit band open
   or folded (reported through onBandChange), the scroll, the pull.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost in
   src/components/NativeSurface.tsx; ignoreSafeArea "all" — it has no text field), and only after
   isKindredlyUIViewAvailable("KKindredsView") and the "kindreds" NativeSurface switch say so.
   Outside a Host it is a RedBox in dev and a CRASH in a release build. Its ref is a
   KScreenHandle: give it `commands.ref` from useKCommands<KKindredsCommands> (commands.ts).

   insets.top is the status bar (Swift draws the page colour under it and pins the band below
   it); insets.tabBarRoom is the floating bar's room (the last row clears it, plus 72 for the
   bottom fade). Pass chips, orbit and items memoised, with a rev from useRev: Swift converts
   them once per rev, and every prop change re-sends the whole props map (KCommandBus.swift). */

/** A face as Swift's KFace takes it (lib/faces faceRecord, plus the mosaic's ink). "bird" is
    Wren's official bird: a transparent snapshot (uri/key, "" while it is on its way) set at 62% on
    a soft2 disc, as OfficialBird draws it, rather than filling the circle like a portrait. */
export type KKindredsFace = {
  kind: "image" | "mosaic" | "veil" | "placeholder" | "bird";
  uri: string;
  key: string;
  overscan: number;
  mask: number;
  /** a mosaic's ink: the theme's ink, or ind */
  tint: "ink" | "ind";
};

/** A tag ahead of a row's preview, already cased. */
export type KKindredsTag = { text: string; tone: "ind" | "mute" | "post" | "brass" };

/** One person's row (KPersonRow). */
export type KKindredsRow = {
  id: string;
  face: KKindredsFace;
  /** the official mark (Wren) */
  faceBadge: boolean;
  name: string;
  /** the name in sub (a quiet room, a closed account) */
  nameDim: boolean;
  /** "2/5"; "" */
  progress: string;
  /** "" hides it */
  time: string;
  tags: KKindredsTag[];
  /** "You: "; "" */
  youPrefix: string;
  preview: string;
  /** "3", "9+"; "" */
  badge: string;
  /** "Rekindle ›"; "" (not a button: the row is) */
  trailingLink: string;
  /** the face at .45 */
  dim: boolean;
  a11yLabel: string;
  /** the long-press menu; [] for none */
  actions: KMenuAction[];
};

export type KKindredsFoldFace = { id: string; mask: number; a11yLabel: string };
export type KKindredsFold = { faces: KKindredsFoldFace[]; more: string; label: string; a11yLabel: string };

export type KKindredsItemType =
  | "wrenLine"
  | "notice"
  | "line"
  | "showing"
  | "wren"
  | "row"
  | "fold"
  | "emptyLine"
  | "hintKindreds"
  | "hintPenpals"
  | "groupHeader";

/** One entry of the list under the band. `text2` is the notice's close label, the Showing
    line's CLEAR, the pen-pal hint's link; `image` her once-line's bird. */
export type KKindredsItem = {
  id: string;
  type: KKindredsItemType;
  text?: string;
  text2?: string;
  image?: KImageRefProps | null;
  row?: KKindredsRow | null;
  fold?: KKindredsFold | null;
};

export type KKindredsChip = {
  key: string;
  label: string;
  /** "" for none */
  count: string;
  glyph: "none" | "kindred" | "penPal";
  selected: boolean;
  dot: boolean;
  a11yLabel: string;
};

export type KKindredsOrbitItem = { id: string; mask: number; ring: number; a0: number; dir: number; period: number; turn: boolean };

export type KKindredsStrings = {
  title: string;
  status: string;
  statusA11y: string;
  legendCloser: string;
  legendTurn: string;
  /** VoiceOver's name for the Orbit chip */
  orbitChipLabel: string;
};

/** What the band reports: opened or folded, and by what. */
export type KKindredsBandVia = "chip" | "pull" | "scroll" | "title";

/** The Kindreds view's commands: scrollTo top or list (where the band pins: the title's tap), and
    reset, which nothing needs to send: Swift folds the band itself once the screen has left the
    window (after a push's slide, or as the tab is detached). Sent while the screen is showing,
    reset waits for that; sent while it is off screen, it folds at once. */
export type KKindredsCommands = Omit<KStandardCommands, "scrollTo"> & {
  scrollTo: { key: "top" | "list"; animated?: boolean };
};

export type KKindredsViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KKindredsStrings;
    /** letters are waiting: the status is ind and a button */
    statusActive: boolean;
    /** the tab is focused (the orbit drifts only then) */
    active: boolean;
    chips: KKindredsChip[];
    orbit: KKindredsOrbitItem[];
    items: KKindredsItem[];
    onRowPress?: (id: string) => void;
    onRowAction?: (id: string, key: string) => void;
    onWrenPress?: () => void;
    onFoldPress?: () => void;
    onFoldFacePress?: (id: string) => void;
    onChipPress?: (key: string) => void;
    onTitlePress?: () => void;
    onClearPress?: () => void;
    onBandChange?: (open: boolean, via: KKindredsBandVia) => void;
    onHintPress?: (kind: "kindreds" | "penpals") => void;
    onNoticePress?: (action: "turnOn" | "close") => void;
    onWrenLinePress?: () => void;
    /** <KIsland> / <KSlot> children (none today), every one on every render (Slot.tsx) */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;

type NativeRow = Omit<KKindredsRow, "actions"> & { actions: { key: string; title: string; icon: string; destructive: boolean }[] };
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
type NativeItem = { id: string; type: string; text: string; text2: string; image: NativeImage; row: NativeRow; fold: KKindredsFold };

type NativeKKindredsViewProps = Omit<
  KKindredsViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "items"
  | "onRowPress"
  | "onRowAction"
  | "onWrenPress"
  | "onFoldPress"
  | "onFoldFacePress"
  | "onChipPress"
  | "onTitlePress"
  | "onClearPress"
  | "onBandChange"
  | "onHintPress"
  | "onNoticePress"
  | "onWrenLinePress"
> &
  Required<Pick<KKindredsViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    items: NativeItem[];
    onKindredsRowPress?: Ev<{ id: string }>;
    onKindredsRowAction?: Ev<{ id: string; key: string }>;
    onKindredsWrenPress?: Ev<Record<string, never>>;
    onKindredsFoldPress?: Ev<Record<string, never>>;
    onKindredsFoldFacePress?: Ev<{ id: string }>;
    onKindredsChipPress?: Ev<{ key: string }>;
    onKindredsTitlePress?: Ev<Record<string, never>>;
    onKindredsClearPress?: Ev<Record<string, never>>;
    onKindredsBandChange?: Ev<{ open: boolean; via: KKindredsBandVia }>;
    onKindredsHintPress?: Ev<{ kind: "kindreds" | "penpals" }>;
    onKindredsNoticePress?: Ev<{ action: "turnOn" | "close" }>;
    onKindredsWrenLinePress?: Ev<Record<string, never>>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const NO_FACE: KKindredsFace = { kind: "placeholder", uri: "", key: "", overscan: 0, mask: 0, tint: "ink" };
const NO_ROW: NativeRow = {
  id: "",
  face: NO_FACE,
  faceBadge: false,
  name: "",
  nameDim: false,
  progress: "",
  time: "",
  tags: [],
  youPrefix: "",
  preview: "",
  badge: "",
  trailingLink: "",
  dim: false,
  a11yLabel: "",
  actions: [],
};
const NO_FOLD: KKindredsFold = { faces: [], more: "", label: "", a11yLabel: "" };

/* Items as the Swift records want them: every field present (a Swift @Field record can't take
   null or undefined), every menu item's destructive flag spelled out. */
export function nativeKindredsItems(items: KKindredsItem[]): NativeItem[] {
  return items.map((it) => ({
    id: it.id,
    type: it.type,
    text: it.text ?? "",
    text2: it.text2 ?? "",
    image: it.image ? { uri: it.image.uri, key: it.image.key, kind: it.image.kind ?? "image" } : NO_IMAGE,
    row: it.row ? { ...it.row, actions: it.row.actions.map((a) => ({ key: a.key, title: a.title, icon: a.icon, destructive: a.destructive ?? false })) } : NO_ROW,
    fold: it.fold ?? NO_FOLD,
  }));
}

// the view's JS name is the Swift struct's name (ios/Adapters/KKindredsView.swift)
const NativeKKindredsView = requireNativeView<NativeKKindredsViewProps>("KindredlyUI", "KKindredsView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. Pass
    `items`, `chips` and `orbit` memoised with a rev from useRev: the converted copy follows the
    array's identity, so a render that changes nothing else doesn't resend them. */
export const KKindredsView = forwardRef<KScreenHandle, KKindredsViewProps>(function KKindredsView(
  {
    modifiers,
    letterFont,
    insets,
    rev,
    items,
    onRowPress,
    onRowAction,
    onWrenPress,
    onFoldPress,
    onFoldFacePress,
    onChipPress,
    onTitlePress,
    onClearPress,
    onBandChange,
    onHintPress,
    onNoticePress,
    onWrenLinePress,
    ...rest
  },
  ref,
) {
  const sent = useMemo(() => nativeKindredsItems(items), [items]);
  return (
    <NativeKKindredsView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      items={sent}
      onKindredsRowPress={onRowPress ? (e) => onRowPress(e.nativeEvent.id) : undefined}
      onKindredsRowAction={onRowAction ? (e) => onRowAction(e.nativeEvent.id, e.nativeEvent.key) : undefined}
      onKindredsWrenPress={onWrenPress ? () => onWrenPress() : undefined}
      onKindredsFoldPress={onFoldPress ? () => onFoldPress() : undefined}
      onKindredsFoldFacePress={onFoldFacePress ? (e) => onFoldFacePress(e.nativeEvent.id) : undefined}
      onKindredsChipPress={onChipPress ? (e) => onChipPress(e.nativeEvent.key) : undefined}
      onKindredsTitlePress={onTitlePress ? () => onTitlePress() : undefined}
      onKindredsClearPress={onClearPress ? () => onClearPress() : undefined}
      onKindredsBandChange={onBandChange ? (e) => onBandChange(e.nativeEvent.open, e.nativeEvent.via) : undefined}
      onKindredsHintPress={onHintPress ? (e) => onHintPress(e.nativeEvent.kind) : undefined}
      onKindredsNoticePress={onNoticePress ? (e) => onNoticePress(e.nativeEvent.action) : undefined}
      onKindredsWrenLinePress={onWrenLinePress ? () => onWrenLinePress() : undefined}
    />
  );
});
