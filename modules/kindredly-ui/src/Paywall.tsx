import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* THE FIRST CLASS PAGE, drawn by SwiftUI (Me 4a, Prompt 7; ios/Portable/Kit/KFirstClassCard.swift
   KPaywallScreen, adapter ios/Adapters/KSettingsView.swift KPaywallView), for
   src/screens/paywall/PaywallNative.tsx. Every word, price and row comes in from TS
   (src/screens/paywall/paywall-model.ts); Swift draws them, keeps which fare is chosen and reports
   taps. It never buys anything itself: onBuy hands the fare's id back to TS, which runs the
   existing RevenueCat purchase (lib/iap), and `busy` holds the button while it runs.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KPaywallView") and the "paywall" NativeSurface switch say so.
   Outside a Host it is a RedBox in dev and a CRASH in a release build. The page keeps First
   Class's own fixed light palette in every theme (white page, cream hero, ink type), as the
   First Class card does; `theme` only picks nothing here but is sent like every screen's. */

export type KPaywallStrings = {
  eyebrow: string;
  title: string;
  sub: string;
  close: string;
  restore: string;
  terms: string;
  privacy: string;
  legal: string;
  active: string;
  activeSub: string;
  cfTitle: string;
  cfTagline: string;
  cfFoot: string;
  sealLabel: string;
  included: string;
};

export type KPaywallFare = {
  id: string;
  period: "annual" | "monthly" | "lifetime";
  label: string;
  /** "−52%" or "" */
  badge: string;
  price: string;
  per: string;
  note: string;
  cta: string;
  ctaNote: string;
  /** the auto-renew or one-payment line under Restore */
  legal: string;
  a11y: string;
};

export type KPaywallBenefit = { id: string; glyph: "rooms" | "voice" | "wardrobe" | "report" | "stamps" | "paper"; title: string; sub: string };
export type KPaywallCofounder = { badge: string; perks: { title: string; sub: string }[] };
export type KPaywallMember = { premium: boolean; cofounder: boolean; cta: string; note: string };

export type KPaywallViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KPaywallStrings;
    /** the courier flying, her look (lib/bird-images fcHero); null for none */
    bird: KImageRefProps | null;
    fares: KPaywallFare[];
    /** the fare chosen when the page opens (the annual's id, else the first) */
    initialFare: string;
    benefits: KPaywallBenefit[];
    cofounder: KPaywallCofounder;
    member: KPaywallMember;
    /** a purchase or restore is running: the button holds and shows a spinner */
    busy: boolean;
    onClose?: () => void;
    onSelect?: (id: string) => void;
    onBuy?: (id: string) => void;
    onRestore?: () => void;
    onTerms?: () => void;
    onPrivacy?: () => void;
    onManage?: () => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };

type NativeKPaywallViewProps = Omit<
  KPaywallViewProps,
  "letterFont" | "insets" | "rev" | "bird" | "onClose" | "onSelect" | "onBuy" | "onRestore" | "onTerms" | "onPrivacy" | "onManage"
> &
  Required<Pick<KPaywallViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    bird: NativeImage;
    onPwClose?: None;
    onPwSelect?: Ev<{ id: string }>;
    onPwBuy?: Ev<{ id: string }>;
    onPwRestore?: None;
    onPwTerms?: None;
    onPwPrivacy?: None;
    onPwManage?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const image = (r: KImageRefProps | null | undefined): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

// the view's JS name is the Swift struct's name (ios/Adapters/KSettingsView.swift)
const NativeKPaywallView = requireNativeView<NativeKPaywallViewProps>("KindredlyUI", "KPaywallView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev from
    useRev over all of them. */
export const KPaywallView = forwardRef<KScreenHandle, KPaywallViewProps>(function KPaywallView(
  { modifiers, letterFont, insets, rev, bird, onClose, onSelect, onBuy, onRestore, onTerms, onPrivacy, onManage, ...rest },
  ref,
) {
  const sentBird = useMemo(() => image(bird), [bird]);
  return (
    <NativeKPaywallView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      bird={sentBird}
      onPwClose={onClose ? () => onClose() : undefined}
      onPwSelect={onSelect ? (e) => onSelect(e.nativeEvent.id) : undefined}
      onPwBuy={onBuy ? (e) => onBuy(e.nativeEvent.id) : undefined}
      onPwRestore={onRestore ? () => onRestore() : undefined}
      onPwTerms={onTerms ? () => onTerms() : undefined}
      onPwPrivacy={onPrivacy ? () => onPrivacy() : undefined}
      onPwManage={onManage ? () => onManage() : undefined}
    />
  );
});
