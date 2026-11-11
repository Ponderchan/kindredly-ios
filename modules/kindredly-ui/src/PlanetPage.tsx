import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";
import type { KCourierPalette } from "./MePieces";
import { nativeWrenLook, type KPlanetLetterData, type KWrenLookData } from "./Planet";

/* THE PLANET PAGE (2026-11-11, docs/courier-planet.md), drawn by SwiftUI (ios/Portable/Planet/
   KPlanetPage.swift, adapter ios/Adapters/KPlanetPageView.swift) for the route src/app/planet.tsx
   (src/screens/planet/PlanetNative.tsx). About your letters: the planet she lives on, larger and
   zoomable, her words, three figures, and one slip at a time — swiping to a slip turns the planet
   to that letter's stamp, tapping a stamp or turning the planet by hand brings its slip.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KPlanetPageView") and the "meplanet" switch say so. Outside a Host
   it is a RedBox in dev and a CRASH in a release build. Every word is TS's
   (src/screens/me/planet-model.ts buildPlanetPage); Swift keeps the slip on show and the zoom.
   insets.top is the status bar (the sky runs under it), insets.bottom the home indicator. */

export const PLANET_PAGE_VIEW = "KPlanetPageView";

/** The planet and who is on it. */
export type KPlanetScene = {
  /** the planet's clock runs (the page is in front) */
  live: boolean;
  /** the hour's sky (courier-card-model PALETTE) */
  palette: KCourierPalette;
  /** newest first */
  letters: KPlanetLetterData[];
  state: "home" | "out" | "waiting" | "back" | "dayOff";
  napping: boolean;
  look: KWrenLookData;
};

export type KPlanetWords = {
  /** YOUR COURIER, or DAY OFF */
  chip: string;
  /** DRAG TO SPIN · PINCH TO ZOOM */
  hint: string;
  name: string;
  time: string;
  line: string;
  aside: string;
  /** TRACK */
  track: string;
  myLetters: string;
  myLettersCount: string;
  /** VoiceOver: the chevron, the two zoom keys, the scene's sentence */
  back: string;
  zoomIn: string;
  zoomOut: string;
  a11y: string;
};

export type KPlanetFigure = { id: "way" | "carried" | "desks"; value: string; label: string; lamp: boolean; a11y: string };

export type KPlanetSlip = {
  id: string;
  /** the planet's letter this slip belongs to; "" when there is no stamp for it */
  letter: string;
  stamp: string;
  hex: string;
  /** NOV 3 · CRUSH */
  head: string;
  body: string;
  rows: string[];
  /** the row a reader's lamp stands before; -1 for none */
  lamp: number;
  /** Go to the Door; "" for none */
  cta: string;
  a11y: string;
};

export type KPlanetPageViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    planet: KPlanetScene;
    words: KPlanetWords;
    figures: KPlanetFigure[];
    slips: KPlanetSlip[];
    /** shown when there is no slip */
    emptyRows: string[];
    /** the slip to be on ("" = the first): the page follows it until the reader picks a slip */
    open: string;
    onBack?: () => void;
    /** Go to the Door on a slip (its id) */
    onGo?: (id: string) => void;
    onMyLetters?: () => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeProps = Omit<KPlanetPageViewProps, "letterFont" | "insets" | "rev" | "planet" | "onBack" | "onGo" | "onMyLetters"> &
  Required<Pick<KPlanetPageViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    planet: Omit<KPlanetScene, "look"> & { look: ReturnType<typeof nativeWrenLook> };
    onPlBack?: None;
    onPlGo?: Ev<{ id: string }>;
    onPlMyLetters?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

// the view's JS name is the Swift struct's name (ios/Adapters/KPlanetPageView.swift)
const NativeKPlanetPageView = requireNativeView<NativeProps>("KindredlyUI", PLANET_PAGE_VIEW);

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KPlanetPageView = forwardRef<KScreenHandle, KPlanetPageViewProps>(function KPlanetPageView(
  { modifiers, letterFont, insets, rev, planet, onBack, onGo, onMyLetters, ...rest },
  ref,
) {
  const sentPlanet = useMemo(() => ({ ...planet, look: nativeWrenLook(planet.look) }), [planet]);
  return (
    <NativeKPlanetPageView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      planet={sentPlanet}
      onPlBack={onBack ? () => onBack() : undefined}
      onPlGo={onGo ? (e) => onGo(e.nativeEvent.id) : undefined}
      onPlMyLetters={onMyLetters ? () => onMyLetters() : undefined}
    />
  );
});
