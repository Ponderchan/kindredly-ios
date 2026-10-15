import SwiftUI
import ExpoModulesCore

/*
 NAMED REACT NATIVE ISLANDS INSIDE ONE SWIFT SURFACE: <KSlot name="bird">…</KSlot> on the JS side
 (modules/kindredly-ui/src/Slot.tsx). A screen view finds its islands by name among its React
 children and places each where its layout wants it:

     if let bird = props.children?.kSlot("bird") { bird.frame(width: 64, height: 64) }

 The islands are the things that stay React Native inside a Swift screen: the animated Wren,
 CloseOfDay, the CourierCard, the user's avatar, the Recorder.

 A copy of @expo/ui's own SlotView, which is internal to ExpoUI (SlotView.swift:6-47), so this
 module needs its own. It MUST be registered with plain View(KSlotView.self), never ExpoUIView:
 ExpoUIView wraps a view in UIBaseView, a child's childView is then the wrapper, and
 `childView as? KSlotView` never matches, so every slot would silently render nothing
 (UIBaseView.swift:59-68, SwiftUIVirtualView.swift:75-77; @expo/ui registers its SlotView with
 View() for the same reason, ExpoUIModule.swift:138). Its props are therefore plain
 ExpoSwiftUI.ViewProps: no testID, no modifiers.

 Rules for the JS side (Slot.tsx states them too):
 - Render every slot on every render, in a fixed order, with an empty View inside when absent.
   A slot that comes and goes reorders the children and remounts its neighbours.
 - Put islands only in non-lazy regions, never inside a LazyVStack row: UIViewHost re-parents
   the React Native view into a new container whenever SwiftUI rebuilds the row
   (SwiftUIViewHost.swift:24-35).
 - Each slot holds exactly one RNHostView, and each RNHostView exactly one child (it sizes from
   its first child only, RNHostView.swift:53-63).
 - A display-only island uses pointerEvents "none" and accessibilityElementsHidden; the tap and
   the VoiceOver element belong to Swift.
 */

final class KSlotViewProps: ExpoSwiftUI.ViewProps {
  /// what the parent looks the slot up by, e.g. "bird", "avatar", "endPage"
  @Field var name: String = ""
}

/// One named island. Its body is its React children, laid out by whoever places it.
struct KSlotView: ExpoSwiftUI.View {
  @ObservedObject var props: KSlotViewProps

  var body: some View {
    Children()
  }
}

extension Array where Element == any ExpoSwiftUI.AnyChild {
  /// The first slot child with this name, or nil when the JS side rendered none.
  func kSlot(_ name: String) -> KSlotView? {
    lazy.compactMap { $0.childView as? KSlotView }.first { $0.props.name == name }
  }

  /// Every slot child with this name, in the order React rendered them.
  func kSlots(_ name: String) -> [KSlotView] {
    compactMap { $0.childView as? KSlotView }.filter { $0.props.name == name }
  }

  /// The children that are not slots: a screen that also takes plain children draws these.
  func withoutKSlots() -> [any ExpoSwiftUI.AnyChild] {
    filter { !($0.childView is KSlotView) }
  }
}
