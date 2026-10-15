import { requireNativeView } from "expo";
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { RNHostView } from "@expo/ui/swift-ui";

/* NAMED REACT NATIVE ISLANDS INSIDE ONE SWIFT SCREEN. A step-5 screen view finds its islands by
   name among its children (ios/Adapters/KSlotView.swift: props.children?.kSlot("bird")) and
   places each where its layout wants it. The islands are what stays React Native inside a Swift
   screen: the animated Wren, CloseOfDay, the CourierCard, the user's avatar, the Recorder.

     <KTodayView …>
       <KIsland name="deskBird">{showBird ? <WrenBird … /> : null}</KIsland>
       <KIsland name="endPage" interactive>{quiet ? <CloseOfDay … /> : null}</KIsland>
     </KTodayView>

   Rules (the Swift side depends on them):
   - Render every slot on every render, in a fixed order, with nothing inside when absent
     (KIsland keeps its View either way). A slot that comes and goes is torn down and rebuilt
     natively each time (an animated Wren restarts) and shifts its siblings' native indices; one
     that stays keeps its native view.
   - Islands go only in non-lazy parts of the Swift layout, never inside a LazyVStack row: SwiftUI
     re-parents the native view whenever it rebuilds a row (SwiftUIViewHost.swift:24-35).
   - One RNHostView per slot and one child per RNHostView (it sizes from its first child only).
   - A display-only island takes no touches and is hidden from VoiceOver; the tap and the
     accessibility element belong to Swift. KIsland does that unless `interactive`.
   Only inside a step-5 screen view, which is itself inside an @expo/ui <Host>. */

type NativeSlotProps = { name: string; children?: ReactNode };

// the view's JS name is the Swift struct's name; registered with plain View() (KindredlyUIModule.swift)
const NativeSlot = requireNativeView<NativeSlotProps>("KindredlyUI", "KSlotView");

export type KSlotProps = {
  /** what the Swift screen looks the slot up by, e.g. "bird", "avatar", "endPage" */
  name: string;
  /** one <RNHostView> holding one View; see KIsland for the usual shape */
  children?: ReactNode;
};

/** A bare named slot. Usually KIsland, which brings the RNHostView and the View. */
export function KSlot({ name, children }: KSlotProps) {
  return <NativeSlot name={name}>{children}</NativeSlot>;
}

export type KIslandProps = {
  name: string;
  /** what the island shows; null or absent leaves an empty, zero-sized island in place */
  children?: ReactNode;
  /** true for an island that takes touches and is read by VoiceOver (the Recorder, CloseOfDay's
      cord); false (the default) for a picture whose tap belongs to Swift */
  interactive?: boolean;
  /** the View's style: give it the island's size (RNHostView matchContents sizes from it) */
  style?: StyleProp<ViewStyle>;
};

/** A named island that sizes itself to its content: KSlot, then RNHostView matchContents, then
    exactly one View, as the rules above ask. */
export function KIsland({ name, children, interactive = false, style }: KIslandProps) {
  return (
    <KSlot name={name}>
      <RNHostView matchContents>
        <View
          pointerEvents={interactive ? "auto" : "none"}
          accessibilityElementsHidden={!interactive}
          importantForAccessibility={interactive ? "auto" : "no-hide-descendants"}
          style={style}
        >
          {children ?? null}
        </View>
      </RNHostView>
    </KSlot>
  );
}
