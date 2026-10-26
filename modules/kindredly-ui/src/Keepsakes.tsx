import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* KEEPSAKES, drawn by SwiftUI (owner, 2026-10-27: "make Me all Swift"): the shelf and one
   keepsake (ios/Portable/Me/KKeepsakesScreen.swift, adapters ios/Adapters/KMePagesView.swift), for
   src/screens/keepsakes/KeepsakesNative.tsx and KeepsakeNative.tsx. TS reads the shelf, marks
   what was seen and words everything; Swift draws and reports taps.

   Each is a whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable(...) and its NativeSurface switch ("keepsakes", "keepsake") say so. */

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const imageOf = (r: KImageRefProps | null | undefined): KImageRefProps => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

/* ── the shelf ─────────────────────────────────────────────────────────── */

export type KKeepsakesStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** the shelf's count at the bar's right; "" before the shelf is read */
  count: string;
  lede: string;
  /** the empty shelf's line; "" when there is something (or nothing read yet) */
  none: string;
};

export type KKeepsakeTile = {
  id: string;
  name: string;
  /** its proof, or the day it happened, in capitals */
  proof: string;
  /** the keepsake's art (a bundled PNG, lib/images useAssetImageRefs); null while it resolves */
  icon: KImageRefProps | null;
  /** not opened yet: the dot */
  fresh: boolean;
  /** VoiceOver ("First Kindred, new") */
  a11y: string;
};

export type KKeepsakesViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KKeepsakesStrings;
    /** newest first */
    tiles: KKeepsakeTile[];
    onBack?: () => void;
    onOpen?: (id: string) => void;
  };

type NativeKKeepsakesViewProps = Omit<KKeepsakesViewProps, "letterFont" | "insets" | "rev" | "tiles" | "onBack" | "onOpen"> &
  Required<Pick<KKeepsakesViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    tiles: (Omit<KKeepsakeTile, "icon"> & { icon: KImageRefProps })[];
    onKsBack?: None;
    onKsOpen?: Ev<{ id: string }>;
  };

const NativeKKeepsakesView = requireNativeView<NativeKKeepsakesViewProps>("KindredlyUI", "KKeepsakesView");

/** The bare SwiftUI shelf. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KKeepsakesView = forwardRef<KScreenHandle, KKeepsakesViewProps>(function KKeepsakesView(
  { modifiers, letterFont, insets, rev, tiles, onBack, onOpen, ...rest },
  ref,
) {
  // a Swift record can't take null: no picture is an empty ref
  const sent = useMemo(() => tiles.map((k) => ({ ...k, icon: imageOf(k.icon) })), [tiles]);
  return (
    <NativeKKeepsakesView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      tiles={sent}
      onKsBack={onBack ? () => onBack() : undefined}
      onKsOpen={onOpen ? (e) => onOpen(e.nativeEvent.id) : undefined}
    />
  );
});

/* ── one keepsake ──────────────────────────────────────────────────────── */

export type KKeepsakeStrings = {
  /** the bar's title: the keepsake's kind */
  title: string;
  backLabel: string;
  name: string;
  /** the day it happened, in capitals; "" while it isn't on the shelf */
  when: string;
  /** her sentence about it, her name in it */
  wrenLine: string;
  evidenceLabel: string;
  evidence: string;
  lineLabel: string;
  /** the line she carried, in quotes; "" for none */
  line: string;
  /** the link to the correspondence; "" for none */
  go: string;
  share: string;
  /** her line while it isn't on the shelf */
  notYet: string;
};

export type KKeepsakeViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KKeepsakeStrings;
    /** the catalog knows the id (false: the bar alone) */
    known: boolean;
    /** it is on the reader's shelf */
    kept: boolean;
    icon: KImageRefProps | null;
    /** her snapshot beside her line */
    bird: KImageRefProps | null;
    onBack?: () => void;
    onGo?: () => void;
    onShare?: () => void;
  };

type NativeKKeepsakeViewProps = Omit<KKeepsakeViewProps, "letterFont" | "insets" | "rev" | "icon" | "bird" | "onBack" | "onGo" | "onShare"> &
  Required<Pick<KKeepsakeViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    icon: KImageRefProps;
    bird: KImageRefProps;
    onKsdBack?: None;
    onKsdGo?: None;
    onKsdShare?: None;
  };

const NativeKKeepsakeView = requireNativeView<NativeKKeepsakeViewProps>("KindredlyUI", "KKeepsakeView");

/** The bare SwiftUI keepsake. Only inside an @expo/ui <Host>. */
export const KKeepsakeView = forwardRef<KScreenHandle, KKeepsakeViewProps>(function KKeepsakeView(
  { modifiers, letterFont, insets, rev, icon, bird, onBack, onGo, onShare, ...rest },
  ref,
) {
  const sentIcon = useMemo(() => imageOf(icon), [icon]);
  const sentBird = useMemo(() => imageOf(bird), [bird]);
  return (
    <NativeKKeepsakeView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      icon={sentIcon}
      bird={sentBird}
      onKsdBack={onBack ? () => onBack() : undefined}
      onKsdGo={onGo ? () => onGo() : undefined}
      onKsdShare={onShare ? () => onShare() : undefined}
    />
  );
});
