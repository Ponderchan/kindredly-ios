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

    // Which Midnight this binary's KTheme.swift carries: 2 = the neutral black (2026-11-12). JS
    // reads it (src/theme/themes.ts binaryThemeRev) so its React Native screens use the same
    // dark colours as the Swift ones; a binary from before this constant answers nothing, which
    // JS reads as 1, the old blue-violet. Raise it whenever the dark tokens change again.
    Constant("themeRev") { 2 }

    // THE FOLD (iPhone Duo, 2026-11-12; KFoldMonitor at the foot of this file). JS asks for what
    // the system says about a folding phone (foldState) and hears when it changes (onFoldChange):
    // the hinge (closed, partly open, open; its angle), the window's size, the crease and the
    // regions the system has taken (camera, side status bar). On a phone that doesn't fold, and
    // on a system from before iOS 27.1, the answer is "none" and nothing ever changes.
    /* the layout the app decided for a folding phone (lib/fold-frame), for the views to read
       (Portable KFold). Numbers in points; anything missing is 0. */
    Function("setFoldFrame") { (f: [String: Any]) in
      func n(_ k: String) -> CGFloat { CGFloat((f[k] as? NSNumber)?.doubleValue ?? 0) }
      var next = KFoldFrame()
      next.duo = (f["duo"] as? Bool) ?? false
      next.posture = (f["posture"] as? String) ?? "phone"
      next.half = (f["half"] as? Bool) ?? false
      next.left = n("left")
      next.right = n("right")
      next.band = n("band")
      next.bandTop = n("bandTop")
      next.crease = n("crease")
      next.rightEnd = n("rightEnd")
      DispatchQueue.main.async { KFold.shared.set(next) }
    }

    Events("onFoldChange")
    AsyncFunction("foldState") { () -> [String: Any] in
      KFoldMonitor.shared.attachIfNeeded()
      return KFoldMonitor.shared.snapshot()
    }.runOnQueue(.main)
    OnStartObserving {
      DispatchQueue.main.async {
        KFoldMonitor.shared.onChange = { [weak self] state in self?.sendEvent("onFoldChange", state) }
        KFoldMonitor.shared.attachIfNeeded()
      }
    }
    OnStopObserving {
      DispatchQueue.main.async { KFoldMonitor.shared.onChange = nil }
    }

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

    // Does this binary's table have the drawing of an official stamp id? (owner's audit, 2026-11-10:
    // the birthday stamp.) JS asks before it OFFERS a stamp newer than a binary, so the tray never
    // shows a bare frame (modules/kindredly-ui/src/available.ts hasKindredlyStampArt). The table is
    // compiled in (Portable/Kit/KStampArtData.swift); the answer never changes while the app runs.
    Function("hasStampArt") { (id: String) -> Bool in
      KStampArt.hasArt(id)
    }

    // The journal book (journal book, 2026-11-10; contract .claude/journal-book/CONTRACT.md): the
    // First Class export of Notes as a typeset A5 PDF, made on this phone. JS builds the whole book
    // as JSON (src/lib/journal-book-core.ts) and calls renderJournalBook; Portable/Book paginates it
    // and draws it with CoreText off the main thread (KBookRenderer.pdf), writes
    // Caches/<fileStem>.pdf over an older one and answers its file:// uri. JSON that is not a book
    // rejects the promise with a sentence that says why (KBookError). hasJournalBook is how JS
    // knows this binary can (modules/kindredly-ui/src/JournalBook.ts). New files in Portable/Book:
    // a pod install before the build.
    AsyncFunction("renderJournalBook") { (json: String, inkSaver: Bool) async throws -> String in
      let book = try KBook.decode(json: json)
      let url = try await KBookRenderer.pdf(book: book, inkSaver: inkSaver)
      return url.absoluteString
    }
    Function("hasJournalBook") { () -> Bool in
      true
    }
    // Its export page (/journal-book, opened from Settings' "Export my journal"): the preview of
    // the reader's own book, this month or this year, the ink saver, the key. Adapter in
    // Adapters/KJournalBookView.swift, the page Portable/Book/KJournalBookScreen.swift;
    // src/app/journal-book.tsx asks isKindredlyUIViewAvailable("KJournalBookView") first, so a
    // binary with the functions above and not this view keeps Settings' plain text export.
    // New files: a pod install before the build.
    ExpoUIView(KJournalBookView.self) {
      AsyncFunction("command") { (view: KJournalBookView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // The album (custom stamps, B): adapter appended to Adapters/KMeView.swift, the page to
    // Portable/Me/KStampsCard.swift; src/app/album.tsx
    ExpoUIView(KStampAlbumView.self) {
      AsyncFunction("command") { (view: KStampAlbumView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // Exporting the stamps a reader made (stamp export, 2026-11-10; First Class): one stamp as a
    // see-through PNG sticker, all of them as printable A4 sheets. JS decides which stamps
    // qualify, the file names, the paging and the words (src/lib/stamp-export-core.ts) and sends
    // a job as JSON; Portable/Stamps/KStampExport.swift draws it off the main thread with the
    // photo stamp's own cut (KPhotoStamp), loads each picture through the store every view uses
    // (KImageStore: a file:// from disk, a signed link fetched once), writes Caches/<fileStem>.png
    // or .pdf over an older one and answers its file:// uri. A job that is not one, a picture that
    // can't be had and a file that can't be written reject the promise with a sentence that says
    // which (KStampExportError). hasStampExport is how JS knows this binary can
    // (modules/kindredly-ui/src/StampExport.ts). A new file in Portable/Stamps: a pod install
    // before the build.
    AsyncFunction("renderStampSticker") { (json: String) async throws -> String in
      let job = try KStampStickerJob.decode(json: json)
      let url = try await KStampExport.sticker(job, loader: KImageStore.shared)
      return url.absoluteString
    }
    AsyncFunction("renderStampSheet") { (json: String) async throws -> String in
      let job = try KStampSheetJob.decode(json: json)
      let url = try await KStampExport.sheet(job, loader: KImageStore.shared)
      return url.absoluteString
    }
    Function("hasStampExport") { () -> Bool in
      true
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

    // Five small pages (2026-10-27), each behind its own switch (off by default) with its React
    // Native page as the fallback: the Voice report, Your Voice in detail, Unsent, the stamp album
    // and Lore. Adapters in Adapters/KMorePagesView.swift, screens in Portable/Pages. New files: a
    // pod install before the build.
    ExpoUIView(KVoiceReportView.self) {
      AsyncFunction("command") { (view: KVoiceReportView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    // The wrapped monthly report (owner, 2026-10-31), behind "reportwrapped" (off by default) with
    // the Voice report above as its fallback. Adapter in Adapters/KWrappedReportView.swift, screen in
    // Portable/Pages/KWrappedReportScreen.swift (and KWrapped*.swift). New files: a pod install first.
    ExpoUIView(KWrappedReportView.self) {
      AsyncFunction("command") { (view: KWrappedReportView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KVoiceDetailView.self) {
      AsyncFunction("command") { (view: KVoiceDetailView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KDraftsView.self) {
      AsyncFunction("command") { (view: KDraftsView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KStampBookView.self) {
      AsyncFunction("command") { (view: KStampBookView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KLoreView.self) {
      AsyncFunction("command") { (view: KLoreView, name: String, args: [String: Any]) in
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

    // Three Notes pages (2026-10-27), each behind its own switch (off by default) with its React
    // Native page as the fallback: one journal page ("noteentry"), one day of them ("noteday") and
    // the photo roll ("photoroll"). Adapters/KNotePagesView.swift and KPhotoLibraryLoader.swift
    // (the roll's ph:// pictures), screens in Portable/Notes. New files: a pod install before the build.
    ExpoUIView(KNotePageView.self) {
      AsyncFunction("command") { (view: KNotePageView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KNoteDayView.self) {
      AsyncFunction("command") { (view: KNoteDayView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KPhotoRollView.self) {
      AsyncFunction("command") { (view: KPhotoRollView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // Wren's introduction, the whole sheet (2026-10-27; behind the "introritual" switch, off by
    // default): adapter in Adapters/KIntroductionView.swift, the sheet in Portable/Chat/
    // KIntroduction.swift, its mosaic ritual in Portable/Chat/KIntroMosaicRitual.swift (the signed
    // one is KIntroRitual); src/components/IntroductionNative.tsx. No commands: it draws, and
    // reports the ✕, TALK TO, a held signature and VoiceOver's two actions as events. New files:
    // a pod install before the build.
    ExpoUIView(KIntroductionView.self)

    // The pieces over the chat (2026-10-27), each inside its own React Native Modal and behind its
    // own switch (off by default) with the React Native piece as the fallback: a photo opened full
    // screen ("lightbox"), a kindred room's song shelf ("songshelf") and the pen-pal chat's signing
    // sheet ("signsheet"). Adapters/KChatOverlaysView.swift, the pieces in Portable/Chat
    // (KPhotoLightbox, KSongShelf, KSignSheet). Only the sheet takes commands (its pen-name field).
    // New files: a pod install before the build.
    ExpoUIView(KPhotoLightboxView.self)
    ExpoUIView(KSongShelfView.self)
    ExpoUIView(KSignSheetView.self) {
      AsyncFunction("command") { (view: KSignSheetView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }

    // The sheets every screen shares (2026-10-27), each behind its own switch (off by default)
    // with its React Native piece as the fallback: the leave sheet ("leavesheet"), the report /
    // block card ("reportsheet"), the sign-up sheet ("signupsheet") and the toast ("toast").
    // Adapters/KSharedSheetsView.swift, the faces in Portable/Sheets. No commands: they draw and
    // report presses as events. New files: a pod install before the build.
    ExpoUIView(KLeaveSheetView.self)
    ExpoUIView(KReportMenuView.self)
    ExpoUIView(KSignUpSheetView.self)
    ExpoUIView(KToastView.self)

    // Today's overlays (2026-10-27, the second Swift batch), each behind its own switch (off by
    // default) with its React Native piece as the fallback: the unfolded letter ("letterreader"),
    // the first arrival's wardrobe slip ("wardrobeslip") and the update prompt's parcel sheet and
    // banner ("parcel"). Adapters/KTodayOverlaysView.swift, Portable/Today (KLetterReaderScreen,
    // KWardrobeSlip, KParcelSheet). New files: a pod install before the build.
    ExpoUIView(KLetterReaderView.self) {
      AsyncFunction("command") { (view: KLetterReaderView, name: String, args: [String: Any]) in
        view.props.commands.send(name, args)
      }
    }
    ExpoUIView(KWardrobeSlipView.self)
    ExpoUIView(KParcelSheetView.self)
    ExpoUIView(KParcelBannerView.self)

    // Three full-screen moments (2026-10-27), each behind its own switch (off by default) with its
    // React Native piece as the fallback: Wren's grow-up moment ("growthmoment"), the one-time
    // identity note ("identitynote") and the first flight ("firstflight"). Adapters in
    // Adapters/KMomentsView.swift, the moments in Portable/Moments. No commands: they draw from
    // props and report taps as events. New files: a pod install before the build.
    ExpoUIView(KGrowthMomentView.self)
    ExpoUIView(KIdentityNoteView.self)
    ExpoUIView(KFirstFlightView.self)

    // The composers' pieces (2026-10-27), each behind its own switch (off by default) with its
    // React Native piece as the fallback: the recording bar ("recorder"), the voice card
    // ("audiocard"), each in a small Host of its own on a React Native screen (Adapters/
    // KVoicePiecesView.swift, Portable/Voice; inside the Swift composers the page draws them,
    // KVoiceSlot), and the send-off, Let it travel ("lettertravel": Adapters/KLetterTravelView.swift,
    // Portable/Compose/KLetterTravel.swift). No commands: they only draw and report taps. New
    // files: a pod install before the build.
    ExpoUIView(KRecorderView.self)
    ExpoUIView(KAudioCardView.self)
    ExpoUIView(KLetterTravelView.self)

    // Two pieces of Me in Swift (2026-10-27), each behind its own switch (off by default): the
    // courier's card ("couriercard") and the Aura card's picture ("auraart"), drawn by KMeView
    // and KAuraRoomView in place of their React Native islands. These two views are the binary's
    // marker for each piece (TS asks for them before it turns an island off) and draw the piece
    // on its own for a dev page. Adapters/KMePiecesView.swift, Portable/Me/KCourierCard.swift and
    // KAuraArt.swift. New files: a pod install before the build.
    ExpoUIView(KCourierCardView.self)
    ExpoUIView(KAuraArtView.self)

    // batch 3: launch + authcallback (2026-11-09), each behind its own switch (off by default)
    // with its React Native page as the fallback: the launch on every cold start and its held
    // last frame ("launch": src/components/LaunchAnimation.tsx) and where the magic link lands
    // ("authcallback": src/app/auth-callback.tsx). Adapters/KLaunchView.swift, Portable/Launch
    // (KLaunch, KAuthCallback). No commands: they draw, and the launch reports a tap. New files:
    // a pod install before the build.
    ExpoUIView(KLaunchView.self)
    ExpoUIView(KAuthCallbackView.self)

    // batch 3: the onboarding's last four islands (hatch, obchick, obroutebird, obflight), drawn by
    // KOnboardingView from its `pieces` record; this view is only the binary's marker that it can
    // (Adapters/KObPiecesView.swift). New files: a pod install before the build.
    ExpoUIView(KObPiecesView.self)

    // the courier's planet on Me (2026-11-11, docs/courier-planet.md), behind "meplanet" (off by
    // default): KMeView draws it from its `planet` record; this view is only the binary's marker
    // that it can (Adapters/KMePlanetView.swift; Portable/Planet, Portable/Me/KMePlanetCard.swift,
    // Portable/Kit/KWrenBird.swift). New files: a pod install before the build.
    ExpoUIView(KMePlanetView.self)
    // the planet page (the same switch; Adapters/KPlanetPageView.swift, Portable/Planet/
    // KPlanetPage.swift): the route src/app/planet.tsx, opened by her card's round button and by
    // Track on her page. No commands: it draws and reports taps.
    ExpoUIView(KPlanetPageView.self)

    // Today, after fifteen (2026-11-11, docs/today-after-fifteen.md), behind "afterfifteen" (off
    // by default): the mailbox, the receipt and bedtime, the page Today becomes once the day's
    // last letter has gone past (Adapters/KAfterFifteenView.swift, Portable/Today/After). No
    // commands: it draws and reports taps. New files: a pod install before the build.
    ExpoUIView(KAfterFifteenView.self)

    // batch 3: slice 3 (2026-11-09), each behind its own switch (off by default) with its React
    // Native piece as the fallback: the empty Kindreds tab ("kindredsempty": Adapters/
    // KKindredsEmptyView.swift, Portable/Kindreds/KKindredsEmpty.swift), the wardrobe slip's sheet
    // ("wardrobesheet": Adapters/KWardrobeSheetView.swift, Portable/Today/KWardrobeSheet.swift) and
    // the Plush moment ("plush": Adapters/KPlushView.swift, Portable/Moments/KPlushCelebration.swift).
    // No commands: they draw and report taps as events. New files: a pod install before the build.
    ExpoUIView(KKindredsEmptyView.self)
    ExpoUIView(KWardrobeSheetView.self)
    ExpoUIView(KPlushView.self)

    // batch 3: slice 4 (2026-11-09), each behind its own switch (off by default) with React Native
    // kept for when it is off. KWrenPictureView is the binary's marker for Wren drawn by Swift in
    // the compose toolbar ("composewren"), the Notes composer ("notewren") and Make your own face
    // ("facewren"); KMyFaceView for your own face on Me and Edit profile ("myavatar"); both also
    // draw one piece on their own for a dev page. KFaceReadyView is the face-ready banner
    // ("faceready"), in a Host of its own. Adapters/KLastIslandsView.swift; Portable/Kit/
    // KWrenPicture.swift, Portable/Me/KMyFace.swift, Portable/MakeFace/KFaceReadyBanner.swift. No
    // commands. New files: a pod install before the build.
    ExpoUIView(KWrenPictureView.self)
    ExpoUIView(KMyFaceView.self)
    ExpoUIView(KFaceReadyView.self)

    // batch 3: slice 5 — four pieces (2026-11-09), each behind its own switch (off by default) with
    // its React Native piece as the fallback: the rating ask's sheet ("ratingsheet"), the First Class
    // receipt ("fcreceipt"), and the markers for the revealed pen-pal header ("chatheader", drawn by
    // KConversationView) and the crossing in the reader ("inflight", drawn by KLetterReaderView),
    // which also draw their piece alone. Adapters/KFourPiecesView.swift; Portable/Today/
    // KRatingAsk.swift, KLetterInFlight.swift, Portable/Kit/KFCReceipt.swift. No commands. New
    // files: a pod install before the build.
    ExpoUIView(KRatingAskView.self)
    ExpoUIView(KFCReceiptView.self)
    ExpoUIView(KChatHeaderView.self)
    ExpoUIView(KLetterInFlightView.self)

    // batch 3: slice 6 (2026-11-09) — pictures and films, each behind its own switch (off by
    // default): the frame viewer over the Notes composer ("frameviewer", inside its React Native
    // Modal), and the markers for a journal page's film and voice card ("notefilm", "notevoice":
    // KNotePageView draws them) and a Wren post's picture or film ("postmedia": KWrenRoomView
    // draws it). Adapters/KMediaPiecesView.swift; Portable/Notes/KFrameViewer.swift, KNoteFilm.swift,
    // Portable/WrenRoom/KPostMediaSquare.swift, Portable/Kit/KVideoLayer.swift. No commands. New
    // files: a pod install before the build.
    ExpoUIView(KFrameViewerView.self)
    ExpoUIView(KNoteFilmView.self)
    ExpoUIView(KPostMediaView.self)

    // batch 3: reels — the guide reels and the release reel in Wren's room, in SwiftUI behind the
    // "reels" switch (off by default). KReelView is one square on its own (ReelSquare's Host) and
    // the binary's marker; the Swift room draws the same square from its card record.
    // Adapters/KReelView.swift, Portable/Reels. New files: a pod install before the build.
    ExpoUIView(KReelView.self)

    // batch 3: Free Flight — the game on its own (Adapters/KFreeFlightView.swift, Portable/Courier/
    // KFreeFlight.swift), the binary's marker for the "freeflight" switch; KCourierView draws it on
    // its cover. New files: a pod install before the build.
    ExpoUIView(KFreeFlightView.self)

  }
}


/*
 THE FOLD, AS THE SYSTEM REPORTS IT (iPhone Duo; owner 2026-11-12: "需要做完在模拟器看").

 iOS 27.1 tells an app three things about a folding phone, and this reads all three:
 - the hinge: closed, partly open or fully open, and its angle (UIHingeInteraction, added to the
   window's root view; its handler runs on every change);
 - the division regions of a view: where content should split in two, which is the crease
   (UIView reservedRegions(kind: .division));
 - the occlusion regions: what something else covers, the camera and the status area at the side
   of the outer screen (kind: .occlusion).

 It is written against the Objective-C runtime, by name, and not against the typed Swift API, on
 purpose: the store build is compiled in the cloud with whatever Xcode that image carries, and a
 typed call to an API the SDK there doesn't have is a build that fails. By name, the same source
 compiles with any SDK, and on a system without these classes every lookup is nil: the answer
 is hinge "none", no regions. Main thread only.
 */
final class KFoldMonitor: NSObject {
  static let shared = KFoldMonitor()

  /// called with a fresh snapshot when the hinge reports a change
  var onChange: (([String: Any]) -> Void)?

  private weak var host: UIView?
  private var interaction: NSObject?
  /// the hinge's last word: 0 unknown, 1 closed, 2 partly open, 3 fully open; nil with no hinge
  private var status: Int?
  private var angle: Double = 0

  private static func rootView() -> UIView? {
    let windows = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows)
    return (windows.first { $0.isKeyWindow } ?? windows.first)?.rootViewController?.view
  }

  /// Hang the hinge's interaction on the window's root view, once per root view.
  func attachIfNeeded() {
    guard let view = Self.rootView(), view !== host else { return }
    host = view
    guard let cls = NSClassFromString("UIHingeInteraction") as? NSObject.Type else { return }
    let handler: @convention(block) (AnyObject, AnyObject) -> Void = { [weak self] _, update in
      guard let self else { return }
      if let hinge = (update as? NSObject)?.value(forKey: "hinge") as? NSObject {
        self.status = (hinge.value(forKey: "status") as? NSNumber)?.intValue ?? 0
        self.angle = (hinge.value(forKey: "angle") as? NSNumber)?.doubleValue ?? 0
      } else {
        self.status = nil
      }
      self.onChange?(self.snapshot())
    }
    // alloc is ours (+1, held by `fresh`); init hands the same object back, which `made` retains;
    // `fresh` lets its one go when it leaves scope
    guard let fresh = cls.perform(NSSelectorFromString("alloc"))?.takeRetainedValue() as? NSObject,
          let made = fresh.perform(NSSelectorFromString("initWithUpdateHandler:"), with: unsafeBitCast(handler, to: AnyObject.self))?.takeUnretainedValue() as? NSObject,
          let asInteraction = made as? UIInteraction
    else { return }
    view.addInteraction(asInteraction)
    interaction = made
  }

  private func regions(of view: UIView, kind: String) -> [[String: Any]] {
    guard let kinds = NSClassFromString("UIViewReservedRegionKind") as? NSObject.Type,
          let wanted = kinds.perform(NSSelectorFromString(kind))?.takeUnretainedValue()
    else { return [] }
    let ask = NSSelectorFromString("reservedRegionsOfKind:")
    guard view.responds(to: ask), let found = view.perform(ask, with: wanted)?.takeUnretainedValue() as? [NSObject] else { return [] }
    return found.map { region in
      let frame = (region.value(forKey: "frame") as? NSValue)?.cgRectValue ?? .zero
      let margins = (region.value(forKey: "margins") as? NSValue)?.uiEdgeInsetsValue ?? .zero
      return [
        "x": Double(frame.minX), "y": Double(frame.minY), "w": Double(frame.width), "h": Double(frame.height),
        "top": Double(margins.top), "left": Double(margins.left), "bottom": Double(margins.bottom), "right": Double(margins.right),
        "active": (region.value(forKey: "active") as? NSNumber)?.boolValue ?? true,
      ]
    }
  }

  /// Everything the system says now, as JS takes it.
  func snapshot() -> [String: Any] {
    let names = ["unknown", "closed", "partly", "open"]
    var out: [String: Any] = [
      "hinge": status.map { names.indices.contains($0) ? names[$0] : "unknown" } ?? "none",
      "angle": angle,
    ]
    guard let view = Self.rootView() else { return out }
    let safe = view.safeAreaInsets
    out["width"] = Double(view.bounds.width)
    out["height"] = Double(view.bounds.height)
    out["safe"] = ["top": Double(safe.top), "left": Double(safe.left), "bottom": Double(safe.bottom), "right": Double(safe.right)]
    out["divisions"] = regions(of: view, kind: "divisionRegionKind")
    out["occlusions"] = regions(of: view, kind: "occlusionRegionKind")
    return out
  }
}
