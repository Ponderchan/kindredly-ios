import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KImageRefProps, type KInsets, type KScreenBaseProps, type KScreenHandle, type KStandardCommands } from "./types";
import type { KKindredsFace } from "./Kindreds";

/* THE ME TAB (4a, 2026-10-19), drawn by SwiftUI (ios/Portable/Me/KMeScreen.swift, adapter
   ios/Adapters/KMeView.swift), for src/screens/me/MeNative.tsx. Every word, figure and destination
   comes in from TS (src/screens/me/me-model.ts builds them); Swift draws them and reports taps.
   Swift keeps only the gesture's state: the segment showing (reported through onSegment), the
   scroll and the header's collapse, which peek is open.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost in
   src/components/NativeSurface.tsx; ignoreSafeArea "all" — it has no text field), and only after
   isKindredlyUIViewAvailable("KMeView") and the "me" NativeSurface switch say so. Outside a Host
   it is a RedBox in dev and a CRASH in a release build. Its ref is a KScreenHandle: give it
   `commands.ref` from useKCommands<KMeCommands> (commands.ts).

   insets.top is the status bar (Swift draws the page colour under it, the sticky header at its
   foot); insets.tabBarRoom is the floating bar's room (the page's end clears it, plus 12, and
   never less than the bottom fade). Pass the records memoised, with a rev from useRev: Swift
   converts them once per rev, and every prop change re-sends the whole props map.

   CHILDREN: exactly three <KIsland>s, in this order, on every render (Slot.tsx): "avatar"
   (72 × 72 — the header scales it down to 36 as it collapses, so it is never re-laid out),
   "courier" (the frame's inside × 236: the window less 37) and "auraArt" (the Aura card's inside
   × 110: the window less 69). Fill the courier and aura islands only while their card shows
   (onSegment says which), so a hidden CourierCard isn't running its loops. */

export type KMeStat = {
  key: "letters" | "kindreds";
  /** the figure, or "–" while unknown */
  count: string;
  unit: string;
  /** "12 letters" */
  a11y: string;
  /** VoiceOver's hint ("Shows your latest letters") */
  hint: string;
};

export type KMeProfile = {
  name: string;
  /** "joined Jul 27", plus " · COFOUNDER No. 007" for a cofounder; "" for none */
  joined: string;
  editLabel: string;
  /** your stamp when you are a member (C2): "1ST" | "007" | "" (none; omitted = none) */
  stamp?: string;
  stats: KMeStat[];
};

export type KMePeekState = "loading" | "empty" | "ready";

export type KMePeekLetter = {
  id: string;
  /** 2026.09.23 */
  date: string;
  stampId: string;
  /** the stamp's colour, for an id this binary's table doesn't know; "" for none */
  stampHex: string;
  body: string;
  tone: "quiet" | "answered" | "replied";
  status: string;
  a11y: string;
};

export type KMePeekLetters = { state: KMePeekState; items: KMePeekLetter[]; seeAll: string; emptyText: string; emptyCta: string };

export type KMePeekKindred = { id: string; name: string; line: string; face: KKindredsFace; a11y: string };

export type KMePeekKindreds = { state: KMePeekState; items: KMePeekKindred[]; open: string; emptyText: string };

export type KMeLookTile = {
  id: "none" | "beanie" | "scarf" | "fc";
  /** the drawn label (mono, upper-cased) */
  label: string;
  /** VoiceOver's name */
  name: string;
  bird: KImageRefProps | null;
  selected: boolean;
  locked: boolean;
  /** the bird at 35% */
  dim: boolean;
  /** VoiceOver's hint; "" for none */
  hint: string;
};

export type KMeLooks = { header: string; all: string; allHint: string; tiles: KMeLookTile[] };

export type KMeAura = {
  /** false: no aura read yet (the card's skeleton); the rest is then ignored */
  present: boolean;
  label: string;
  title: string;
  from: string;
  chips: { id: string; name: string; emerging: boolean }[];
  meterKind: "ticks" | "slots";
  filled: number;
  total: number;
  /** -1 for no slips */
  slipsN: number;
  slipsOf: number;
  caption: string;
  cta: string;
  share: boolean;
  shareLabel: string;
};

export type KMeReport = { show: boolean; title: string; sub: string; enabled: boolean; locked: boolean; hint: string };

/** The Stamps card (custom stamps, the owner's final Prompt 1; ios/Portable/Me/KStampsCard.swift).
    Built by src/screens/me/stamp-collection.ts. Photo stamps ("c:<uuid>") are drawn by Swift from
    the registry lib/custom-stamps fills; only their ids travel here. */
export type KMeStamps = {
  /** YOUR STAMPS: the official stamps used, at most three, newest first */
  label: string;
  count: string;
  cells: { id: string; date: string; a11y: string; hex: string }[];
  /** none used: the owner's line and "Write a letter →" (onStampsEmpty) */
  emptyText: string;
  emptyCta: string;
  /** the empty state's three dashed slots, each a category's "#RRGGBB" */
  yoursSlots: string[];
  /** MADE BY YOU at all (the press and 0038 both there, D10) */
  madeShow: boolean;
  madeLabel: string;
  /** "2 OF 3 FREE" | "UNLIMITED" */
  madeQuota: string;
  madeQuotaGold: boolean;
  /** "See all →" past two; "" for none */
  seeAll: string;
  makeOne: string;
  emptyTitle: string;
  emptySub: string;
  makeA11y: string;
  /** the two newest of mine */
  made: { id: string; topic: string; fresh: boolean; note: string; a11y: string }[];
  newLabel: string;
  /** Free with three made: the blank stamp opens the small card */
  full: boolean;
  fullTitle: string;
  fullSub: string;
  fullCta: string;
  notNow: string;
  /** "Your stamp is ready." once after an approval ("" none), its action, the stamp */
  ready: string;
  readyCta: string;
  readyId: string;
  strangersLabel: string;
  strangersCount: string;
  strangers: { id: string; from: string; a11y: string }[];
  strangersEmpty: string;
  /** "Open the album →"; "" hides it */
  album: string;
};

/** What the Stamps card reports: the blank stamp, First Class from the 3/3 card, See all, the
    album, a stamp tapped, the ready bar's "Write with it". */
export type KMeStampsAction = "make" | "fullCta" | "seeAll" | "album" | "stamp" | "ready";

export type KMeFirstClass = {
  eyebrow: string;
  headline: string;
  /** the three rows with gold checks */
  rows: string[];
  cta: string;
  /** "7 DAYS FREE"; "" for none */
  trial: string;
  stampLabel: string;
  /** the courier's snapshot for the stamp (lib/bird-images fcFree / fcMember); null for none */
  bird: KImageRefProps | null;
  member: boolean;
};

/** First Class by the day (src/lib/fc-rollout): the form on the page and its words. */
export type KMeFcRollout = {
  form: "none" | "invite" | "seat" | "report" | "tab";
  /** the pull-tab on the right edge (with tab and report) */
  tab: boolean;
  firstClass: string;
  post: string;
  envelopeA11y: string;
  seatTimer: string;
  seatHead: string;
  seatPerks: string;
  open: string;
  reportEyebrow: string;
  reportSealed: string;
  reportHead: string;
  reportCta: string;
  tabA11y: string;
};

export type KMeStrings = {
  settingsLabel: string;
  courierA11y: string;
  /** Courier, Aura, Stamps, First Class */
  segments: string[];
  /** VoiceOver: a peek button's value, its custom actions, a locked tile's value */
  expanded: string;
  collapsed: string;
  seeAllAction: string;
  openKindredsAction: string;
  locked: string;
};

/** The Me view's commands: scrollTo top (Me pressed again), and segment, which shows a card as
    its chip would and reports it through onSegment as a chip does (fill that card's island). */
export type KMeCommands = Omit<KStandardCommands, "scrollTo"> & {
  scrollTo: { key: "top"; animated?: boolean };
  segment: { index: number };
};

export type KMeViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KMeStrings;
    profile: KMeProfile;
    peekLetters: KMePeekLetters;
    peekKindreds: KMePeekKindreds;
    looks: KMeLooks;
    aura: KMeAura;
    report: KMeReport;
    stamps: KMeStamps;
    firstClass: KMeFirstClass;
    /** First Class by the day; leave it out for none */
    fc?: KMeFcRollout;
    /** the segment to open on (read when the view first draws) */
    initialSegment: number;
    onSettings?: () => void;
    onEdit?: () => void;
    onPeek?: (key: "letters" | "kindreds", open: boolean) => void;
    onPeekLetter?: (id: string) => void;
    onPeekKindred?: (id: string) => void;
    onSeeAll?: () => void;
    onOpenKindreds?: () => void;
    onWrite?: () => void;
    onSegment?: (index: number) => void;
    onCourier?: () => void;
    onLook?: (id: KMeLookTile["id"]) => void;
    onAllLooks?: () => void;
    onAuraOpen?: () => void;
    onAuraCta?: () => void;
    onAuraShare?: () => void;
    onReport?: () => void;
    onStampsEmpty?: () => void;
    /** the Stamps card (custom stamps): `id` for stamp / ready, "" otherwise */
    onStamps?: (action: KMeStampsAction, id: string) => void;
    onFirstClass?: () => void;
    /** a First Class rollout form was tapped */
    onFcOpen?: (form: KMeFcRollout["form"]) => void;
    /** the three <KIsland>s: avatar, courier, auraArt (see the top) */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
type NativeFace = Omit<KKindredsFace, "frost"> & { frost: KFrost };

type EventProps =
  | "onSettings"
  | "onEdit"
  | "onPeek"
  | "onPeekLetter"
  | "onPeekKindred"
  | "onSeeAll"
  | "onOpenKindreds"
  | "onWrite"
  | "onSegment"
  | "onCourier"
  | "onLook"
  | "onAllLooks"
  | "onAuraOpen"
  | "onAuraCta"
  | "onAuraShare"
  | "onReport"
  | "onStampsEmpty"
  | "onStamps"
  | "onFirstClass"
  | "onFcOpen";

type NativeKMeViewProps = Omit<KMeViewProps, "letterFont" | "insets" | "rev" | "peekKindreds" | "looks" | "firstClass" | EventProps> &
  Required<Pick<KMeViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    peekKindreds: Omit<KMePeekKindreds, "items"> & { items: (Omit<KMePeekKindred, "face"> & { face: NativeFace })[] };
    looks: Omit<KMeLooks, "tiles"> & { tiles: (Omit<KMeLookTile, "bird"> & { bird: NativeImage })[] };
    firstClass: Omit<KMeFirstClass, "bird"> & { bird: NativeImage };
    onMeSettings?: None;
    onMeEdit?: None;
    onMePeek?: Ev<{ key: "letters" | "kindreds"; open: boolean }>;
    onMePeekLetter?: Ev<{ id: string }>;
    onMePeekKindred?: Ev<{ id: string }>;
    onMeSeeAll?: None;
    onMeOpenKindreds?: None;
    onMeWrite?: None;
    onMeSegment?: Ev<{ index: number }>;
    onMeCourier?: None;
    onMeLook?: Ev<{ id: KMeLookTile["id"] }>;
    onMeAllLooks?: None;
    onMeAuraOpen?: None;
    onMeAuraCta?: None;
    onMeAuraShare?: None;
    onMeReport?: None;
    onMeStampsEmpty?: None;
    onMeStamps?: Ev<{ action: KMeStampsAction; id: string }>;
    onMeFirstClass?: None;
    onMeFcOpen?: Ev<{ form: KMeFcRollout["form"] }>;
  };

const NO_FC: KMeFcRollout = { form: "none", tab: false, firstClass: "", post: "", envelopeA11y: "", seatTimer: "", seatHead: "", seatPerks: "", open: "", reportEyebrow: "", reportSealed: "", reportHead: "", reportCta: "", tabA11y: "" };
const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const image = (r: KImageRefProps | null | undefined): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);
/* a Swift @Field record can't take null: the window is NO_FROST when there is none */
const face = (f: KKindredsFace): NativeFace => ({ ...f, frost: nativeFrost(f.kind === "frost" ? f.frost : null), stamp: f.stamp ?? "" });

// the view's JS name is the Swift struct's name (ios/Adapters/KMeView.swift)
const NativeKMeView = requireNativeView<NativeKMeViewProps>("KindredlyUI", "KMeView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. Pass the
    records memoised with a rev from useRev, and the three islands as children. */
export const KMeView = forwardRef<KScreenHandle, KMeViewProps>(function KMeView(
  {
    modifiers,
    letterFont,
    insets,
    rev,
    peekKindreds,
    looks,
    firstClass,
    onSettings,
    onEdit,
    onPeek,
    onPeekLetter,
    onPeekKindred,
    onSeeAll,
    onOpenKindreds,
    onWrite,
    onSegment,
    onCourier,
    onLook,
    onAllLooks,
    onAuraOpen,
    onAuraCta,
    onAuraShare,
    onReport,
    onStampsEmpty,
    onStamps,
    onFirstClass,
    onFcOpen,
    fc,
    ...rest
  },
  ref,
) {
  // the converted records follow their source's identity, so a render that changes nothing
  // else doesn't send them again
  const sentKindreds = useMemo(() => ({ ...peekKindreds, items: peekKindreds.items.map((k) => ({ ...k, face: face(k.face) })) }), [peekKindreds]);
  const sentLooks = useMemo(() => ({ ...looks, tiles: looks.tiles.map((t) => ({ ...t, bird: image(t.bird) })) }), [looks]);
  const sentFirstClass = useMemo(() => ({ ...firstClass, bird: image(firstClass.bird) }), [firstClass]);
  return (
    <NativeKMeView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      peekKindreds={sentKindreds}
      looks={sentLooks}
      firstClass={sentFirstClass}
      fc={fc ?? NO_FC}
      onMeSettings={onSettings ? () => onSettings() : undefined}
      onMeEdit={onEdit ? () => onEdit() : undefined}
      onMePeek={onPeek ? (e) => onPeek(e.nativeEvent.key, e.nativeEvent.open) : undefined}
      onMePeekLetter={onPeekLetter ? (e) => onPeekLetter(e.nativeEvent.id) : undefined}
      onMePeekKindred={onPeekKindred ? (e) => onPeekKindred(e.nativeEvent.id) : undefined}
      onMeSeeAll={onSeeAll ? () => onSeeAll() : undefined}
      onMeOpenKindreds={onOpenKindreds ? () => onOpenKindreds() : undefined}
      onMeWrite={onWrite ? () => onWrite() : undefined}
      onMeSegment={onSegment ? (e) => onSegment(e.nativeEvent.index) : undefined}
      onMeCourier={onCourier ? () => onCourier() : undefined}
      onMeLook={onLook ? (e) => onLook(e.nativeEvent.id) : undefined}
      onMeAllLooks={onAllLooks ? () => onAllLooks() : undefined}
      onMeAuraOpen={onAuraOpen ? () => onAuraOpen() : undefined}
      onMeAuraCta={onAuraCta ? () => onAuraCta() : undefined}
      onMeAuraShare={onAuraShare ? () => onAuraShare() : undefined}
      onMeReport={onReport ? () => onReport() : undefined}
      onMeStampsEmpty={onStampsEmpty ? () => onStampsEmpty() : undefined}
      onMeStamps={onStamps ? (e) => onStamps(e.nativeEvent.action, e.nativeEvent.id) : undefined}
      onMeFirstClass={onFirstClass ? () => onFirstClass() : undefined}
      onMeFcOpen={onFcOpen ? (e) => onFcOpen(e.nativeEvent.form) : undefined}
    />
  );
});

/* ── THE ALBUM (custom stamps, the owner's final Prompt 2), drawn by SwiftUI
   (ios/Portable/Me/KStampsCard.swift KStampAlbumScreen, adapter ios/Adapters/KMeView.swift
   KStampAlbumView), for src/app/album.tsx. TS builds every section (src/screens/me/
   stamp-collection.ts buildAlbum); Swift draws the leaf, the sticky heads, the grids and the
   sheet, and reports taps. The sheet closes itself before an action is reported, so an Alert TS
   raises (delete, a report's reason) shows over the page.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KStampAlbumView") says so. Outside a Host it is a RedBox in dev and
   a CRASH in a release build. ── */

export type KAlbumActionKey = "write" | "rename" | "recolour" | "filter" | "delete" | "remove" | "report" | "retry";

export type KAlbumCell = {
  /** "c:<uuid>" or an official id */
  id: string;
  /** under the stamp: "#tea", "FROM SUNDAY KITE", the official name */
  under: string;
  /** the sheet's #topic tag ("" none) and its colour */
  tag: string;
  tagHex: string;
  /** "Made Oct 19 · on 4 letters" */
  info: string;
  a11y: string;
  actions: { key: KAlbumActionKey; title: string; style: "ink" | "plain" | "danger" }[];
};

export type KAlbumSection = { key: "made" | "strangers" | "yours"; title: string; make: boolean; cells: KAlbumCell[] };

export type KAlbumStrings = {
  title: string;
  back: string;
  makeOne: string;
  makeA11y: string;
  fullTitle: string;
  fullSub: string;
  fullCta: string;
  notNow: string;
  /** no official stamp used: the owner's line ("" = not drawn) and "Write a letter →" */
  yoursEmpty: string;
  yoursCta: string;
};

export type KStampAlbumProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KAlbumStrings;
    sections: KAlbumSection[];
    full: boolean;
    yoursSlots: string[];
    /** the section to open at ("" for the top) */
    focus: string;
    onBack?: () => void;
    onMake?: () => void;
    onFullCta?: () => void;
    onWrite?: () => void;
    onAction?: (id: string, action: KAlbumActionKey) => void;
  };

type NativeAlbumProps = Omit<KStampAlbumProps, "letterFont" | "insets" | "rev" | "onBack" | "onMake" | "onFullCta" | "onWrite" | "onAction"> &
  Required<Pick<KStampAlbumProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onAlbumBack?: None;
    onAlbumMake?: None;
    onAlbumFullCta?: None;
    onAlbumWrite?: None;
    onAlbumAction?: Ev<{ id: string; action: KAlbumActionKey }>;
  };

const NativeKStampAlbumView = requireNativeView<NativeAlbumProps>("KindredlyUI", "KStampAlbumView");

/** The bare SwiftUI album. Only inside an @expo/ui <Host>. */
export const StampAlbum = forwardRef<KScreenHandle, KStampAlbumProps>(function StampAlbum(
  { modifiers, letterFont, insets, rev, onBack, onMake, onFullCta, onWrite, onAction, ...rest },
  ref,
) {
  return (
    <NativeKStampAlbumView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onAlbumBack={onBack ? () => onBack() : undefined}
      onAlbumMake={onMake ? () => onMake() : undefined}
      onAlbumFullCta={onFullCta ? () => onFullCta() : undefined}
      onAlbumWrite={onWrite ? () => onWrite() : undefined}
      onAlbumAction={onAction ? (e) => onAction(e.nativeEvent.id, e.nativeEvent.action) : undefined}
    />
  );
});
