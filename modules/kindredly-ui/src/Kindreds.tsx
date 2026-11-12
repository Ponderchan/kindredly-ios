import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KImageRefProps, type KInsets, type KMark, type KMenuAction, type KScreenBaseProps, type KScreenHandle, type KSign, type KStandardCommands } from "./types";

/* THE KINDREDS TAB, drawn by SwiftUI (ios/Portable/Kindreds/KKindredsScreen.swift, adapter
   ios/Adapters/KKindredsView.swift), for src/screens/kindreds/KindredsNative.tsx. Every word,
   date, count and menu comes in from TS (src/screens/kindreds/kindreds-model.ts builds them);
   Swift draws them and reports taps. Swift keeps only the gesture's state: the orbit band open
   or folded (reported through onBandChange), the scroll, the pull.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost in
   src/components/NativeSurface.tsx; ignoreSafeArea "all" — its one text field, the search's, is pinned at
   the top, so the keyboard's region is ignored on purpose and nothing moves when it rises), and only after
   isKindredlyUIViewAvailable("KKindredsView") and the "kindreds" NativeSurface switch say so.
   Outside a Host it is a RedBox in dev and a CRASH in a release build. Its ref is a
   KScreenHandle: give it `commands.ref` from useKCommands<KKindredsCommands> (commands.ts).

   insets.top is the status bar (Swift draws the page colour under it and pins the band below
   it); insets.tabBarRoom is the floating bar's room (the last row clears it, plus 72 for the
   bottom fade). Pass chips, orbit, items and legendFrost memoised, with a rev from useRev over
   all four: Swift converts them once per rev, and every prop change re-sends the whole props map
   (KCommandBus.swift).

   SEARCH (owner's audit, 2026-11-10). The strings carry the search's four words; with them Swift
   shows a magnifier chip after the orbit chip, and its field replaces the chip row. Swift owns
   the field: onSearch(query, active) reports every change (active false: Cancel, or the screen
   coming back without a search), and TS answers with the narrowed `items`. A binary from before
   the search ignores the words and shows no magnifier; JS from before it sends none, and a newer
   binary then shows no magnifier either.

   THE IDENTITY SWITCH (identity Phase 1) is data here, never a different screen: a pen pal's
   face "frost" with its window, a row's ♀/♂ mark, star sign and "was No. 4481", a folded or
   orbiting face's frost, and legendFrost (the PEN PALS mark's sample window). TS decides all of
   it (src/lib/stranger-who through kindreds-model); off, every one of them is empty and the tab
   is exactly what it was. A frost goes to Swift as NO_FROST when there is none (a record field
   can't take null): nativeFrost below. */

/** A face as Swift's KFace takes it (lib/faces faceRecord, plus the mosaic's ink). "bird" is
    Wren's official bird: a transparent snapshot (uri/key, "" while it is on its way) set at 62% on
    a soft2 disc, as OfficialBird draws it, rather than filling the circle like a portrait. */
export type KKindredsFace = {
  /** "tile": a closed account's face while the identity switch is on (a flat veil square) */
  kind: "image" | "mosaic" | "frost" | "veil" | "tile" | "placeholder" | "bird";
  uri: string;
  key: string;
  overscan: number;
  mask: number;
  /** kind "frost" (a pen pal, identity on): the frosted window's spec (src/lib/faces faceRecord) */
  frost?: KFrost | null;
  /** a mosaic's ink: the theme's ink, or ind */
  tint: "ink" | "ind";
  /** a First Class member's stamp round the face (C2): "1ST" | "007" | "" (omitted = none; never Wren) */
  stamp?: string;
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
  /** a pen pal's ♀/♂ mark after the name (identity switch on; an ink glyph in sub); null for none */
  mark: KMark;
  /** their star sign after the mark; null for none */
  sign: KSign;
  /** "was No. 4481" on the second line, for fourteen days after the switch; "" for none */
  was: string;
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

/** One folded face: the mosaic (`mask`), or with the identity switch on the window (`frost`). */
export type KKindredsFoldFace = { id: string; mask: number; frost: KFrost | null; a11yLabel: string; /** C2: "1ST" | "007" | "" */ stamp?: string };
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

/** One stranger on the orbit: the mosaic (`mask`), or with the identity switch on their window (`frost`, never developing). */
export type KKindredsOrbitItem = {
  id: string;
  mask: number;
  frost: KFrost | null;
  ring: number;
  a0: number;
  dir: number;
  period: number;
  turn: boolean;
  /** a First Class member (C2): a 1pt dotted gold edge at orbit size */
  stamp?: boolean;
};

/** One kindred on the orbit's home ring, beside you: their face as their row has it, where they
    start (TS spaces them evenly, in a stable order), and whether letters of theirs are unread. */
export type KKindredsOrbitKin = {
  id: string;
  face: KKindredsFace;
  a0: number;
  turn: boolean;
};

export type KKindredsStrings = {
  title: string;
  status: string;
  statusA11y: string;
  legendCloser: string;
  legendTurn: string;
  /** VoiceOver's name for the Orbit chip */
  orbitChipLabel: string;
  /** VoiceOver's name for the magnifier chip and the search field; "" (or absent) and there is no search */
  searchLabel?: string;
  /** the search field's placeholder */
  searchPlaceholder?: string;
  /** the word beside the field that ends the search */
  searchCancel?: string;
  /** VoiceOver's name for the field's × key */
  searchClear?: string;
};

/** What the band reports: opened or folded, and by what. */
export type KKindredsBandVia = "chip" | "pull" | "scroll" | "title" | "search";

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
    /** you, in the orbit's middle: your own face (round). null or absent keeps the ink cell */
    orbitMe?: KKindredsFace | null;
    /** your kindreds on the orbit's home ring, at most eight (kindreds-model orbitKindreds) */
    orbitKin?: KKindredsOrbitKin[];
    items: KKindredsItem[];
    /** identity switch on: the PEN PALS chip mark's and the your-turn legend's sample window (kindreds-model legendFrost); null off */
    legendFrost?: KFrost | null;
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
    /** the search field changed: its words, and whether the reader is searching (false: Cancel) */
    onSearch?: (query: string, active: boolean) => void;
    /** <KIsland> / <KSlot> children (none today), every one on every render (Slot.tsx) */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;

type NativeFace = Omit<KKindredsFace, "frost"> & { frost: KFrost };
type NativeRow = Omit<KKindredsRow, "face" | "mark" | "sign" | "actions"> & {
  face: NativeFace;
  mark: string;
  sign: string;
  actions: { key: string; title: string; icon: string; destructive: boolean }[];
};
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
type NativeFold = Omit<KKindredsFold, "faces"> & { faces: (Omit<KKindredsFoldFace, "frost"> & { frost: KFrost })[] };
type NativeItem = { id: string; type: string; text: string; text2: string; image: NativeImage; row: NativeRow; fold: NativeFold };
type NativeOrbit = Omit<KKindredsOrbitItem, "frost"> & { frost: KFrost };

type NativeKKindredsViewProps = Omit<
  KKindredsViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "items"
  | "orbit"
  | "orbitMe"
  | "orbitKin"
  | "legendFrost"
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
  | "onSearch"
> &
  Required<Pick<KKindredsViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    items: NativeItem[];
    orbit: NativeOrbit[];
    orbitMe: { show: boolean; face: NativeFace };
    orbitKin: { id: string; face: NativeFace; a0: number; turn: boolean }[];
    legendFrost: KFrost;
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
    onKindredsSearch?: Ev<{ query: string; active: boolean }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const NO_FACE: NativeFace = { kind: "placeholder", uri: "", key: "", overscan: 0, mask: 0, frost: nativeFrost(null), tint: "ink", stamp: "" };
const NO_ROW: NativeRow = {
  id: "",
  face: NO_FACE,
  faceBadge: false,
  name: "",
  mark: "",
  sign: "",
  was: "",
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
const NO_FOLD: NativeFold = { faces: [], more: "", label: "", a11yLabel: "" };

/* Items as the Swift records want them: every field present (a Swift @Field record can't take
   null or undefined): every menu item's destructive flag spelled out, a face's and a folded
   face's frost NO_FROST when there is none, no mark or sign as "". */
export function nativeKindredsItems(items: KKindredsItem[]): NativeItem[] {
  return items.map((it) => ({
    id: it.id,
    type: it.type,
    text: it.text ?? "",
    text2: it.text2 ?? "",
    image: it.image ? { uri: it.image.uri, key: it.image.key, kind: it.image.kind ?? "image" } : NO_IMAGE,
    row: it.row
      ? {
          ...it.row,
          face: { ...it.row.face, frost: nativeFrost(it.row.face.kind === "frost" ? it.row.face.frost : null), stamp: it.row.face.stamp ?? "" },
          mark: it.row.mark ?? "",
          sign: it.row.sign ?? "",
          was: it.row.was ?? "",
          actions: it.row.actions.map((a) => ({ key: a.key, title: a.title, icon: a.icon, destructive: a.destructive ?? false })),
        }
      : NO_ROW,
    fold: it.fold ? { ...it.fold, faces: it.fold.faces.map((f) => ({ id: f.id, mask: f.mask, frost: nativeFrost(f.frost), a11yLabel: f.a11yLabel, stamp: f.stamp ?? "" })) } : NO_FOLD,
  }));
}

/** A face as the Swift record wants it: frost NO_FROST unless it is a window, the stamp "" for none. */
const nativeFace = (f: KKindredsFace): NativeFace => ({ ...f, frost: nativeFrost(f.kind === "frost" ? f.frost : null), stamp: f.stamp ?? "" });

/** You in the orbit's middle, as the Swift record wants it: `show` false keeps the ink cell. */
export const nativeKindredsOrbitMe = (me: KKindredsFace | null | undefined): { show: boolean; face: NativeFace } => ({ show: !!me, face: me ? nativeFace(me) : NO_FACE });
/** Your kindreds on the home ring, as the Swift records want them. */
export const nativeKindredsOrbitKin = (kin: readonly KKindredsOrbitKin[] | undefined): { id: string; face: NativeFace; a0: number; turn: boolean }[] =>
  (kin ?? []).map((k) => ({ id: k.id, face: nativeFace(k.face), a0: k.a0, turn: k.turn }));

/** The orbit as the Swift records want it: each frost NO_FROST when there is none. */
export function nativeKindredsOrbit(orbit: KKindredsOrbitItem[]): NativeOrbit[] {
  return orbit.map((o) => ({ ...o, frost: nativeFrost(o.frost), stamp: o.stamp ?? false }));
}

// the view's JS name is the Swift struct's name (ios/Adapters/KKindredsView.swift)
const NativeKKindredsView = requireNativeView<NativeKKindredsViewProps>("KindredlyUI", "KKindredsView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. Pass
    `items`, `chips`, `orbit` and `legendFrost` memoised with a rev from useRev: the converted copy
    follows the source's identity, so a render that changes nothing else doesn't resend them. */
export const KKindredsView = forwardRef<KScreenHandle, KKindredsViewProps>(function KKindredsView(
  {
    modifiers,
    letterFont,
    insets,
    rev,
    items,
    orbit,
    orbitMe,
    orbitKin,
    legendFrost,
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
    onSearch,
    ...rest
  },
  ref,
) {
  const sent = useMemo(() => nativeKindredsItems(items), [items]);
  const sentOrbit = useMemo(() => nativeKindredsOrbit(orbit), [orbit]);
  const sentMe = useMemo(() => nativeKindredsOrbitMe(orbitMe), [orbitMe]);
  const sentKin = useMemo(() => nativeKindredsOrbitKin(orbitKin), [orbitKin]);
  const sentLegend = useMemo(() => nativeFrost(legendFrost), [legendFrost]);
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
      orbit={sentOrbit}
      orbitMe={sentMe}
      orbitKin={sentKin}
      legendFrost={sentLegend}
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
      onKindredsSearch={onSearch ? (e) => onSearch(e.nativeEvent.query ?? "", !!e.nativeEvent.active) : undefined}
    />
  );
});
