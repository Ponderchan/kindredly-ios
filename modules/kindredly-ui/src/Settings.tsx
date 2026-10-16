import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* SETTINGS, drawn by SwiftUI (ios/Portable/Settings/KSettingsScreen.swift, adapter
   ios/Adapters/KSettingsView.swift), for src/screens/settings/SettingsNative.tsx. Every word,
   value, row and destination comes in from TS (src/screens/settings/settings-model.ts builds
   them); Swift draws them and reports taps. It keeps no state of its own: the switches show the
   props and ask for the other value through onToggle / onMatchSystem, and TS answers by
   changing the prop (a permission prompt may say no).

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost in
   src/components/NativeSurface.tsx; ignoreSafeArea "all" — it has no text field), and only
   after isKindredlyUIViewAvailable("KSettingsView") and the "settings" NativeSurface switch say
   so. Outside a Host it is a RedBox in dev and a CRASH in a release build. It takes no children
   and no commands; its ref is still a KScreenHandle (useKCommands) like every screen's.

   insets.top is the status bar (Swift draws the page colour under it and clips the page below
   it); insets.tabBarRoom is the floating bar's room (Settings is pushed inside the Me tab, so
   the bar stays): the last row clears it, plus 12, and never less than the bottom fade. Pass the
   records memoised, with a rev from useRev over ALL of them (the small ones too): Swift
   converts them once per rev, and every prop change re-sends the whole props map. */

export type KSettingsStrings = {
  title: string;
  backLabel: string;
  appearanceHeader: string;
  matchLabel: string;
  matchSub: string;
  fontLabel: string;
  fontSub: string;
  footer: string;
};

export type KSettingsBanner = {
  eyebrow: string;
  headline: string;
  sub: string;
  cta: string;
  stampLabel: string;
  /** the courier's snapshot for the stamp (lib/bird-images fcFree / fcMember); null for none */
  bird: KImageRefProps | null;
};

export type KSettingsSwatch = { key: string; label: string };
/** a Letter font tile: its key, its own name (untranslated) and the specimen drawn in its face */
export type KSettingsFont = { key: string; name: string; sample: string };

export type KSettingsRow = {
  key: string;
  /** an SF Symbol name */
  symbol: string;
  label: string;
  /** "" for none */
  value: string;
  /** "" for none */
  sub: string;
  chevron: boolean;
  kind: "link" | "toggle" | "display" | "danger";
  on: boolean;
  busy: boolean;
};

export type KSettingsGroup = {
  key: string;
  /** "" for none (the exits) */
  header: string;
  notice: { text: string; action: string } | null;
  rows: KSettingsRow[];
};

export type KSettingsViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KSettingsStrings;
    banner: KSettingsBanner;
    swatches: KSettingsSwatch[];
    /** the theme in effect */
    selectedTheme: string;
    /** Match system's row (only once the dark theme is ready) */
    showMatch: boolean;
    matchOn: boolean;
    fonts: KSettingsFont[];
    selectedFont: string;
    groups: KSettingsGroup[];
    onBack?: () => void;
    onBanner?: () => void;
    onTheme?: (key: string) => void;
    onMatchSystem?: (on: boolean) => void;
    onFont?: (key: string) => void;
    onRow?: (key: string) => void;
    onToggle?: (key: string, on: boolean) => void;
    onNotice?: () => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
type NativeGroup = Omit<KSettingsGroup, "notice"> & { notice: { present: boolean; text: string; action: string } };

type NativeKSettingsViewProps = Omit<
  KSettingsViewProps,
  "letterFont" | "insets" | "rev" | "banner" | "groups" | "onBack" | "onBanner" | "onTheme" | "onMatchSystem" | "onFont" | "onRow" | "onToggle" | "onNotice"
> &
  Required<Pick<KSettingsViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    banner: Omit<KSettingsBanner, "bird"> & { bird: NativeImage };
    groups: NativeGroup[];
    onSettingsBack?: None;
    onSettingsBanner?: None;
    onSettingsTheme?: Ev<{ key: string }>;
    onSettingsMatch?: Ev<{ on: boolean }>;
    onSettingsFont?: Ev<{ key: string }>;
    onSettingsRow?: Ev<{ key: string }>;
    onSettingsToggle?: Ev<{ key: string; on: boolean }>;
    onSettingsNotice?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const image = (r: KImageRefProps | null | undefined): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

/** The groups as the Swift records want them: every field present (a Swift @Field record can't
    take null), the notice as { present, … }. */
export function nativeSettingsGroups(groups: KSettingsGroup[]): NativeGroup[] {
  return groups.map((g) => ({
    key: g.key,
    header: g.header,
    notice: g.notice ? { present: true, text: g.notice.text, action: g.notice.action } : { present: false, text: "", action: "" },
    rows: g.rows,
  }));
}

// the view's JS name is the Swift struct's name (ios/Adapters/KSettingsView.swift)
const NativeKSettingsView = requireNativeView<NativeKSettingsViewProps>("KindredlyUI", "KSettingsView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>. Pass the records memoised with a rev
    from useRev over all of them. */
export const KSettingsView = forwardRef<KScreenHandle, KSettingsViewProps>(function KSettingsView(
  { modifiers, letterFont, insets, rev, banner, groups, onBack, onBanner, onTheme, onMatchSystem, onFont, onRow, onToggle, onNotice, ...rest },
  ref,
) {
  // the converted records follow their source's identity, so a render that changes nothing
  // else doesn't send them again
  const sentBanner = useMemo(() => ({ ...banner, bird: image(banner.bird) }), [banner]);
  const sentGroups = useMemo(() => nativeSettingsGroups(groups), [groups]);
  return (
    <NativeKSettingsView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      banner={sentBanner}
      groups={sentGroups}
      onSettingsBack={onBack ? () => onBack() : undefined}
      onSettingsBanner={onBanner ? () => onBanner() : undefined}
      onSettingsTheme={onTheme ? (e) => onTheme(e.nativeEvent.key) : undefined}
      onSettingsMatch={onMatchSystem ? (e) => onMatchSystem(e.nativeEvent.on) : undefined}
      onSettingsFont={onFont ? (e) => onFont(e.nativeEvent.key) : undefined}
      onSettingsRow={onRow ? (e) => onRow(e.nativeEvent.key) : undefined}
      onSettingsToggle={onToggle ? (e) => onToggle(e.nativeEvent.key, e.nativeEvent.on) : undefined}
      onSettingsNotice={onNotice ? () => onNotice() : undefined}
    />
  );
});
