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

    // the Notes composer (1.0.7, owner 2026-10-26: the Note Composer Bar design): adapter
    // Adapters/KNoteComposeView.swift, the page Portable/Notes/KNoteComposePage.swift;
    // src/app/journal-entry.tsx behind the "journalentry" switch
    ExpoUIView(KNoteComposeView.self) {
      AsyncFunction("command") { (view: KNoteComposeView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // Me 4a: the First Class page and My letters (adapters appended to Adapters/KSettingsView.swift)
    ExpoUIView(KPaywallView.self) {
      AsyncFunction("command") { (view: KPaywallView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KMyLettersView.self) {
      AsyncFunction("command") { (view: KMyLettersView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // the one-letter reader (owner, 2026-10-20): adapter appended to Adapters/KConversationView.swift,
    // the screen to Portable/Chat/KChatRows.swift; src/app/thread/[id].tsx behind the "reader" switch
    ExpoUIView(KReaderView.self) {
      AsyncFunction("command") { (view: KReaderView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // custom stamps: the Stamp Press camera (adapter appended to Adapters/KLabView.swift, the page
    // at the end of Portable/Kit/KLab.swift), the /stamp-press route
    ExpoUIView(KStampPressView.self) {
      AsyncFunction("command") { (view: KStampPressView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // Stamp Press: the edit page (adapter appended to Adapters/KEditProfileView.swift, the screen
    // to Portable/Profile/KFaceStrip.swift; src/app/stamp-edit.tsx)
    ExpoUIView(KStampEditView.self) {
      AsyncFunction("command") { (view: KStampEditView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // Wren's Journey, the courier page (owner, 2026-10-26; binary 1.2.6): adapter in
    // Adapters/KCourierView.swift, the page in Portable/Courier/KCourierScreen.swift;
    // src/app/courier.tsx behind the "courier" switch. New files: a pod install before the build.
    ExpoUIView(KCourierView.self) {
      AsyncFunction("command") { (view: KCourierView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // Make your own face (owner, 2026-10-26; binary 1.2.6, behind the "makeface" switch): adapter in
    // Adapters/KMakeFaceView.swift, the page in Portable/MakeFace/KMakeFacePage.swift; the route is
    // src/app/make-face.tsx. New files: a pod install before the build.
    ExpoUIView(KMakeFaceView.self) {
      AsyncFunction("command") { (view: KMakeFaceView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    // the photo made small and bare before it is sent (Portable/MakeFace/KFacePhoto.swift): the
    // picker's file in, a square ≤768 JPEG with no metadata in tmp/make-face out (file://), or ""
    // when it can't be read. JS: modules/kindredly-ui/src/MakeFace.tsx prepareFacePhoto.
    AsyncFunction("prepareFacePhoto") { (uri: String) -> String in
      let url: URL? = uri.hasPrefix("file://") ? URL(string: uri) : URL(fileURLWithPath: uri)
      guard let url, let out = try? KFacePhoto.prepare(sourceURL: url) else { return "" }
      return out.absoluteString
    }
    // the onboarding (binary 1.2.6, App Store 1.0.7; behind app_surfaces "onboarding", off by
    // default): adapter in Adapters/KOnboardingView.swift, the run in Portable/Onboarding;
    // src/app/onboarding.tsx. New files: a pod install before the build.
    ExpoUIView(KOnboardingView.self) {
      AsyncFunction("command") { (view: KOnboardingView, name: String, args: [String: Any]) in
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

    // custom stamps (contract .claude/custom-stamps/CONTRACT.md §4.2): src/lib/custom-stamps
    // resolves "c:<uuid>" ids and pushes them here; KStamp draws them from KCustomStamps at every
    // width (Portable/Kit/KStampArt.swift). JS: modules/kindredly-ui/src/customStamps.ts.
    Function("setCustomStamps") { (rows: [[String: Any]]) in
      let infos = rows.compactMap { KCustomStampInfo(row: $0) }
      Task { @MainActor in
        KCustomStamps.shared.merge(infos)
      }
    }
    Function("clearCustomStamps") {
      Task { @MainActor in
        KCustomStamps.shared.clear()
      }
    }
    Function("setCustomStampWords") { (row: [String: Any]) in
      let words = KCustomStampWords(row: row)
      Task { @MainActor in
        KCustomStamps.shared.setWords(words)
      }
    }

    // The album (custom stamps, B): adapter appended to Adapters/KMeView.swift, the page to
    // Portable/Me/KStampsCard.swift; src/app/album.tsx
    ExpoUIView(KStampAlbumView.self) {
      AsyncFunction("command") { (view: KStampAlbumView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // The name-trading ceremony's signed ritual (owner, 2026-10-26; 1.0.7): one piece of the React
    // Native introduction sheet, behind the "ceremony" switch (src/components/
    // IntroductionRitualNative.tsx). Adapters/KIntroRitualView.swift, Portable/Chat/KIntroRitual.swift.
    // No commands: it only draws, and reports a held signature as an event.
    ExpoUIView(KIntroRitualView.self)
    // The Writing Aura room and its share card (owner decision 2026-10-26, 1.0.7): adapters in
    // Adapters/KAuraView.swift, the screens in Portable/Aura/; src/app/aura.tsx and
    // src/app/aura-card.tsx behind the "aura" and "auracard" switches. New .swift files: a pod
    // install (or prebuild) before the next native build.
    ExpoUIView(KAuraRoomView.self) {
      AsyncFunction("command") { (view: KAuraRoomView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KAuraShareView.self) {
      AsyncFunction("command") { (view: KAuraShareView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // The last Me pages (owner, 2026-10-27: "make Me all Swift"), each behind its own switch with
    // its React Native page as the fallback. Keepsakes, one keepsake and My kindreds: adapters in
    // Adapters/KMePagesView.swift, screens in Portable/Me/KKeepsakesScreen.swift and
    // KMyKindredsScreen.swift. One field, Blocked, Help and Write to us: Adapters/
    // KSettingsPagesView.swift, screens in Portable/Settings. New files: a pod install before the build.
    ExpoUIView(KKeepsakesView.self) {
      AsyncFunction("command") { (view: KKeepsakesView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KKeepsakeView.self) {
      AsyncFunction("command") { (view: KKeepsakeView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KMyKindredsView.self) {
      AsyncFunction("command") { (view: KMyKindredsView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KEditFieldView.self) {
      AsyncFunction("command") { (view: KEditFieldView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KBlockedView.self) {
      AsyncFunction("command") { (view: KBlockedView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KHelpView.self) {
      AsyncFunction("command") { (view: KHelpView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KWriteToUsView.self) {
      AsyncFunction("command") { (view: KWriteToUsView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // The app's language, for typography only (KType.tallScript): Japanese and Korean set the
    // letter serifs with CJK leading. src/textScript.ts; the root layout calls it on every change.
    Function("setTextScript") { (lang: String) in
      KType.tallScript = lang == "ja" || lang == "ko"
    }

    // A kindred's page (2026-10-27; behind the "kindredpage" switch, off by default): adapter in
    // Adapters/KKindredPageView.swift, the page in Portable/Chat/KKindredPageScreen.swift;
    // src/app/kindred/[id].tsx. New files: a pod install before the build.
    ExpoUIView(KKindredPageView.self) {
      AsyncFunction("command") { (view: KKindredPageView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // Wren's room, the chat with the courier (2026-10-27; behind the "wrenroom" switch, off by
    // default): adapter in Adapters/KWrenRoomView.swift, the page in Portable/WrenRoom/
    // KWrenRoomScreen.swift; src/app/room/wren.tsx. New files: a pod install before the build.
    ExpoUIView(KWrenRoomView.self) {
      AsyncFunction("command") { (view: KWrenRoomView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
  }
}
