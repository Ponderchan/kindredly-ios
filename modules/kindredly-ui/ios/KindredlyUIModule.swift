import ExpoModulesCore
import ExpoUI
import UIKit

/*
 Kindredly's own SwiftUI views for the 10a overhaul (iOS 1.3.0), registered for React Native.
 Registration only: each view's Expo adapter is in Adapters/, and the views themselves are in
 Portable/, which imports SwiftUI alone so the 1.1.0 pure-Swift app can reuse them.

 Step 5 registers every one of its views here, once (batch 0a), so no screen slice edits this
 file: each screen slice replaces its own stub adapter in Adapters/ and keeps the type names.

 Adding a .swift file to this module needs a pod install (or prebuild) before the next native
 build, or the build fails with "cannot find '…' in scope" (extending.md).
 */
public class KindredlyUIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KindredlyUI")

    ExpoUIView(KInkCardView.self)
    // the 10a tab bar and its composer sheet, one Host for both (src/components/NativeTabBar.tsx)
    ExpoUIView(KTabBarView.self)
    // dev only on the JS side (ui-lab): every Portable piece in one theme
    ExpoUIView(KGalleryView.self)

    // MARK: Step 5

    // Named React Native islands inside a Swift screen (<KSlot name> in src/Slot.tsx). A PLAIN
    // View(), not ExpoUIView: wrapped in UIBaseView, `childView as? KSlotView` would never match
    // and every slot would render nothing (Adapters/KSlotView.swift).
    View(KSlotView.self)

    // The eight step-5 screens. Each takes props from KScreenProps and has one imperative entry,
    // command(name, args), which lands on the view's KCommandBus (Adapters/KCommandBus.swift).
    // Expo runs view functions on the main queue and hands them the inner view struct
    // (SwiftUIViewDefinitionBuilder.swift:32-46, DynamicSwiftUIViewType.swift:33-56).
    ExpoUIView(KConversationView.self) {
      AsyncFunction("command") { (view: KConversationView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KKindredsView.self) {
      AsyncFunction("command") { (view: KKindredsView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KTodayView.self) {
      AsyncFunction("command") { (view: KTodayView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KComposeView.self) {
      AsyncFunction("command") { (view: KComposeView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KMeView.self) {
      AsyncFunction("command") { (view: KMeView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KSettingsView.self) {
      AsyncFunction("command") { (view: KSettingsView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KEditProfileView.self) {
      AsyncFunction("command") { (view: KEditProfileView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KNotesView.self) {
      AsyncFunction("command") { (view: KNotesView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // dev only on the JS side (src/app/dev/step5-lab.tsx): the batch 0b spike lab, a screen view
    // like the eight above (KScreenProps, the command bus, a KField)
    ExpoUIView(KLabView.self) {
      AsyncFunction("command") { (view: KLabView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // Resigns whatever holds the keyboard, app-wide. React Native's Keyboard.dismiss() only
    // blurs inputs registered with TextInputState (dismissKeyboard.js:18-20), and our SwiftUI
    // fields never are; src/lib/keyboard.ts's dismissKeyboard() calls both.
    AsyncFunction("dismissKeyboard") {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    .runOnQueue(.main)

    // The app's language, for typography only (KType.tallScript): Japanese and Korean set the
    // letter serifs with CJK leading. src/textScript.ts; the root layout calls it on every change.
    Function("setTextScript") { (lang: String) in
      KType.tallScript = lang == "ja" || lang == "ko"
    }
  }
}
