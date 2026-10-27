import SwiftUI
import UIKit
import AuthenticationServices
import ExpoModulesCore
import ExpoUI

/*
 THE SHEETS EVERY SCREEN SHARES, as React Native sees them (2026-10-27): the leave sheet, the
 report / block card, the sign-up sheet and the toast, each behind its own switch with its React
 Native piece as the fallback (src/components/LeaveSheet.tsx "leavesheet", ReportMenu.tsx
 "reportsheet", SignUpSheet.tsx "signupsheet", ui.tsx "toast"). JS bindings: modules/kindredly-ui/
 src/SharedSheets.tsx. This file turns props into Portable values (Portable/Sheets) and presses
 into events; nothing here decides anything.

 The props subclass KScreenProps for theme (none of them draws content, so the Letter font isn't
 read); they take no insets, rev or commands.

 KLeaveSheetView (fills its Host: the screen, or a window-level React Native Modal)
 - title, bodyText, cancel, showCancel, closeLabel   (sentence case already)
 - keys [{ label, kind, lead, selected, voiceLabel, voiceLanguage, busy }]
 - dim { hex, alpha }, bottomMargin, maxHeight
 Events: onLsKey { index }, onLsCancel {}

 KReportMenuView (a Host as wide as the card plus `room` each side, matchContents vertical)
 - menu, report, block, never, answer, done, busy, blockInk, banInk (#RRGGBB), room
 Events: onRmAction { key: "report" | "block" | "close" }

 KSignUpSheetView (fills its Host, as the leave sheet)
 - title, reason, email, notYet, closeLabel, apple, appleWhite, busy ("" | "apple" | "email"),
   dim { hex, alpha }, bottomMargin
 Events: onSuApple {}, onSuEmail {}, onSuClose {}

 KToastView (a Host the toast's width, matchContents vertical, no touches)
 - message, fill, ink (#RRGGBB)
 */

/// A colour with its alpha, as TS sends a scrim ("rgba(30,27,53,0.3)" → { hex: "#1E1B35", alpha: 0.3 }).
struct KSheetDimRecord: Record {
  @Field var hex: String = "#1E1B35"
  @Field var alpha: Double = 0.3

  var color: Color { Color(hex: hex).opacity(alpha) }
}

// MARK: - The leave sheet

struct KLeaveSheetKeyRecord: Record {
  @Field var label: String = ""
  @Field var kind: String = "quiet"
  @Field var lead: String = ""
  @Field var selected: Bool = false
  @Field var voiceLabel: String = ""
  @Field var voiceLanguage: String = ""
  @Field var busy: Bool = false
}

final class KLeaveSheetViewProps: KScreenProps {
  @Field var title: String = ""
  @Field var bodyText: String = ""
  @Field var keys: [KLeaveSheetKeyRecord] = []
  @Field var cancel: String = ""
  @Field var showCancel: Bool = true
  @Field var closeLabel: String = ""
  @Field var dim: KSheetDimRecord = KSheetDimRecord()
  @Field var bottomMargin: Double = 8
  @Field var maxHeight: Double = 0

  var onLsKey = EventDispatcher()
  var onLsCancel = EventDispatcher()

  var content: KLeaveSheetContent {
    var c = KLeaveSheetContent()
    c.title = title
    c.body = bodyText
    c.keys = keys.enumerated().map { i, k in
      KLeaveSheetKey(
        id: i,
        label: k.label,
        kind: KSheetChrome.KeyKind(rawValue: k.kind) ?? .quiet,
        lead: k.lead,
        selected: k.selected,
        voiceLabel: k.voiceLabel,
        voiceLanguage: k.voiceLanguage,
        busy: k.busy
      )
    }
    c.cancel = showCancel ? cancel : nil
    c.closeLabel = closeLabel
    c.dim = dim.color
    c.bottomMargin = CGFloat(bottomMargin)
    c.maxHeight = maxHeight > 0 ? CGFloat(maxHeight) : .infinity
    return c
  }
}

struct KLeaveSheetView: ExpoSwiftUI.View {
  @ObservedObject var props: KLeaveSheetViewProps

  var body: some View {
    KLeaveSheet(
      theme: props.kTheme,
      content: props.content,
      onKey: { props.onLsKey(["index": $0]) },
      onCancel: { props.onLsCancel([:]) }
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - The report / block card

final class KReportMenuViewProps: KScreenProps {
  @Field var menu: Bool = true
  @Field var report: String = ""
  @Field var block: String = ""
  @Field var never: String = ""
  @Field var answer: String = ""
  @Field var done: String = ""
  @Field var busy: Bool = false
  @Field var blockInk: String = "#E0483C"
  @Field var banInk: String = "#E0483C"
  @Field var room: Double = 0

  var onRmAction = EventDispatcher()

  var content: KReportMenuContent {
    var c = KReportMenuContent()
    c.menu = menu
    c.report = report
    c.block = block
    c.never = never
    c.answer = answer
    c.done = done
    c.busy = busy
    c.blockInk = Color(hex: blockInk)
    c.banInk = Color(hex: banInk)
    c.room = CGFloat(room)
    return c
  }
}

struct KReportMenuView: ExpoSwiftUI.View {
  @ObservedObject var props: KReportMenuViewProps

  var body: some View {
    KReportMenuCard(theme: props.kTheme, content: props.content) { key in
      props.onRmAction(["key": key])
    }
    .kScreenEnvironment(props)
  }
}

// MARK: - The sign-up sheet

final class KSignUpSheetViewProps: KScreenProps {
  @Field var title: String = ""
  @Field var reason: String = ""
  @Field var email: String = ""
  @Field var notYet: String = ""
  @Field var closeLabel: String = ""
  @Field var apple: Bool = false
  /// the white Apple key, for a dark ground (expo-apple-authentication's WHITE)
  @Field var appleWhite: Bool = false
  @Field var busy: String = ""
  @Field var dim: KSheetDimRecord = KSheetDimRecord()
  @Field var bottomMargin: Double = 8

  var onSuApple = EventDispatcher()
  var onSuEmail = EventDispatcher()
  var onSuClose = EventDispatcher()

  var content: KSignUpSheetContent {
    var c = KSignUpSheetContent()
    c.title = title
    c.reason = reason
    c.email = email
    c.notYet = notYet
    c.closeLabel = closeLabel
    c.apple = apple
    c.busy = busy
    c.dim = dim.color
    c.bottomMargin = CGFloat(bottomMargin)
    return c
  }
}

struct KSignUpSheetView: ExpoSwiftUI.View {
  @ObservedObject var props: KSignUpSheetViewProps

  var body: some View {
    KSignUpSheet(
      theme: props.kTheme,
      content: props.content,
      appleKey: {
        // the style is fixed when the system's button is made: a new one for the other ground
        KAppleContinueKey(white: props.appleWhite) { props.onSuApple([:]) }
          .id(props.appleWhite)
      },
      onEmail: { props.onSuEmail([:]) },
      onClose: { props.onSuClose([:]) }
    )
    .kScreenEnvironment(props)
  }
}

/*
 The system's Sign in with Apple key, "Continue with Apple" in the phone's language, corners 25:
 the same ASAuthorizationAppleIDButton expo-apple-authentication draws (type CONTINUE, style BLACK
 or, on a dark ground, WHITE). A press only reports itself: TS runs the sign-in (lib/auth
 signInWithApple), exactly as the React Native sheet's key does.
 */
struct KAppleContinueKey: UIViewRepresentable {
  let white: Bool
  let onPress: () -> Void

  final class Coordinator: NSObject {
    var onPress: () -> Void

    init(onPress: @escaping () -> Void) {
      self.onPress = onPress
    }

    @objc func pressed() {
      onPress()
    }
  }

  func makeCoordinator() -> Coordinator {
    Coordinator(onPress: onPress)
  }

  func makeUIView(context: Context) -> ASAuthorizationAppleIDButton {
    let key = ASAuthorizationAppleIDButton(authorizationButtonType: .continue, authorizationButtonStyle: white ? .white : .black)
    key.cornerRadius = 25
    key.addTarget(context.coordinator, action: #selector(Coordinator.pressed), for: .touchUpInside)
    return key
  }

  func updateUIView(_ uiView: ASAuthorizationAppleIDButton, context: Context) {
    context.coordinator.onPress = onPress
  }
}

// MARK: - The toast

final class KToastViewProps: KScreenProps {
  @Field var message: String = ""
  @Field var fill: String = "#1E1B35"
  @Field var ink: String = "#FFFFFF"
}

struct KToastView: ExpoSwiftUI.View {
  @ObservedObject var props: KToastViewProps

  var body: some View {
    KToastPill(message: props.message, fill: Color(hex: props.fill), ink: Color(hex: props.ink))
      .kScreenEnvironment(props)
  }
}
