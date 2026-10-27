import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KScreenBaseProps } from "./types";

/* LET IT TRAVEL, the send-off, drawn by SwiftUI (2026-10-27; behind the "lettertravel" switch,
   off by default): ios/Adapters/KLetterTravelView.swift → ios/Portable/Compose/KLetterTravel.swift,
   for src/components/LetterTravel.tsx, which keeps its exported component and props and draws
   this when the switch is on and the binary has the view; the React Native piece stays the
   fallback.

   Swift runs the piece's clock (a port of src/components/letter-travel-model.ts: every beat, the
   rest on the arrival card until `ready`, the seal's light tap, Reduce Motion's still tableau and
   fade) and says once when it is over. TS keeps the send, the words and her snapshot. A whole
   screen: put it alone in one full-screen @expo/ui <Host> (SurfaceHost). */

export type KLetterTravelViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    /** the page's colour ("#RRGGBB"): the room it opens on and the frame it fades to */
    ground: string;
    /** the send has landed */
    ready: boolean;
    title: string;
    /** the card's second line: as usual, past the wait, once the send has landed (upper-cased) */
    sub: string;
    wait: string;
    done: string;
    /** her flying snapshot, empty-handed (bird-images "travelFly"); null until captured */
    bird: KImageRefProps | null;
    /** the piece is over (once) */
    onDone?: () => void;
  };

type NativeProps = Omit<KLetterTravelViewProps, "bird" | "onDone"> & {
  letterFont: string;
  bird: KImageRefProps;
  onTravelDone?: () => void;
};

// the view's JS name is the Swift struct's name (ios/Adapters/KLetterTravelView.swift)
const NativeKLetterTravelView = requireNativeView<NativeProps>("KindredlyUI", "KLetterTravelView");

const NO_BIRD: KImageRefProps = { uri: "", key: "" };

/** The bare SwiftUI send-off. Only inside an @expo/ui <Host>. */
export function KLetterTravelView({ modifiers, bird, onDone, ...rest }: KLetterTravelViewProps) {
  return (
    <NativeKLetterTravelView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont="newsreader"
      bird={bird ?? NO_BIRD}
      onTravelDone={onDone ? () => onDone() : undefined}
    />
  );
}
