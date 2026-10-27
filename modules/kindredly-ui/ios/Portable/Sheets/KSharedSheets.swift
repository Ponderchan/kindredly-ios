// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SHEETS EVERY SCREEN SHARES, in SwiftUI (2026-10-27): the leave sheet, the sign-up sheet, the
 report / block card and the toast, each the twin of a React Native piece that stays its
 fallback behind its own switch (src/components LeaveSheet, SignUpSheet, ReportMenu's ReportSheet,
 ui's Toast). Swift draws and reports which key was pressed; every word (sentence-cased already),
 every colour that isn't the theme's and every consequence of a press is TypeScript's.

 Each sits in an @expo/ui Host of its own: the two sheets fill the screen they are raised in (or
 a window-level React Native Modal), the card and the toast are only as big as they are.
 */

// MARK: - The leave sheet

/// One key of the leave sheet (LeaveAction), as TS sends it.
public struct KLeaveSheetKey: Equatable, Identifiable, Sendable {
  /// its place in the list: what comes back when it is pressed
  public let id: Int
  /// sentence case already (sheetWords)
  public let label: String
  public let kind: KSheetChrome.KeyKind
  /// a mark before the label (a flag); "" for none
  public let lead: String
  /// VoiceOver: the current choice
  public let selected: Bool
  /// VoiceOver says this instead of the label ("" = the label)
  public let voiceLabel: String
  /// the language VoiceOver says it in (BCP 47; "" = the reader's)
  public let voiceLanguage: String
  /// working: the key shows "…" and VoiceOver still hears its label
  public let busy: Bool

  public init(id: Int, label: String, kind: KSheetChrome.KeyKind, lead: String = "", selected: Bool = false, voiceLabel: String = "", voiceLanguage: String = "", busy: Bool = false) {
    self.id = id
    self.label = label
    self.kind = kind
    self.lead = lead
    self.selected = selected
    self.voiceLabel = voiceLabel
    self.voiceLanguage = voiceLanguage
    self.busy = busy
  }
}

public struct KLeaveSheetContent: Equatable {
  public var title = ""
  public var body = ""
  public var keys: [KLeaveSheetKey] = []
  /// the full-width row that goes back; nil hides it (a sheet whose one key IS the way out)
  public var cancel: String? = nil
  /// VoiceOver for the ✕
  public var closeLabel = ""
  /// scrimColor(dark, .3) from TS
  public var dim: Color = .clear
  public var bottomMargin: CGFloat = 8
  public var maxHeight: CGFloat = .infinity

  public init() {}
}

/*
 LeaveSheet's face (src/components/LeaveSheet.tsx). NEVER TALLER THAN THE SCREEN: the title row
 stays on top and the cancel row at the bottom, and the body and the keys scroll between them
 once they don't fit (and only then: a sheet that fits has no scroll view at all). The fixed
 rows stop growing at accessibility size 1, as React Native caps them at 1.6.
 */
public struct KLeaveSheet: View {
  let theme: KTheme
  let content: KLeaveSheetContent
  let onKey: (Int) -> Void
  let onCancel: () -> Void

  @AccessibilityFocusState private var titleFocused: Bool

  public init(theme: KTheme, content: KLeaveSheetContent, onKey: @escaping (Int) -> Void, onCancel: @escaping () -> Void) {
    self.theme = theme
    self.content = content
    self.onKey = onKey
    self.onCancel = onCancel
  }

  public var body: some View {
    KSheetChrome.Stage(theme: theme, dim: content.dim, bottomMargin: content.bottomMargin, maxHeight: content.maxHeight, onCancel: onCancel) {
      VStack(spacing: 0) {
        KSheetChrome.Header(theme: theme, title: content.title, closeLabel: content.closeLabel, titleFocus: $titleFocused, onClose: onCancel)
        ViewThatFits(in: .vertical) {
          middle
          ScrollView { middle }
            .scrollBounceBehavior(.basedOnSize)
        }
        if let cancel = content.cancel {
          KSheetChrome.Key(theme: theme, kind: .plain, label: cancel, action: onCancel)
            .dynamicTypeSize(...DynamicTypeSize.accessibility1)
            .padding(.horizontal, KSheetChrome.keyInset)
            .padding(.top, 2)
        }
      }
      .padding(.top, KSheetChrome.topPad)
      .padding(.bottom, KSheetChrome.bottomPad)
    }
    .onAppear(perform: focusTitle)
  }

  /// the body and the keys: what scrolls when the sheet can't fit
  private var middle: some View {
    VStack(spacing: 0) {
      KSheetChrome.Body(theme: theme, text: content.body)
      VStack(spacing: KSheetChrome.keyGap) {
        ForEach(content.keys) { key in
          KSheetChrome.Key(theme: theme, kind: key.kind, label: key.busy ? "…" : key.label, lead: key.lead) {
            onKey(key.id)
          }
          .accessibilityLabel(Self.voice(key))
          .accessibilityAddTraits(key.selected ? .isSelected : [])
        }
      }
      .padding(.horizontal, KSheetChrome.keyInset)
    }
    .padding(.bottom, content.cancel == nil ? 6 : 4)
  }

  /// what VoiceOver says for a key: its own words (a language's own name, in that language's
  /// voice), or the label, never the "…" of a working key
  private static func voice(_ key: KLeaveSheetKey) -> Text {
    var words = AttributedString(key.voiceLabel.isEmpty ? key.label : key.voiceLabel)
    if !key.voiceLanguage.isEmpty { words.languageIdentifier = key.voiceLanguage }
    return Text(words)
  }

  /// VoiceOver to the title once the sheet is up, so the question is heard first
  private func focusTitle() {
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(300))
      titleFocused = true
    }
  }
}

// MARK: - The sign-up sheet

public struct KSignUpSheetContent: Equatable {
  public var title = ""
  /// what the account is for, at this moment (the caller's reason)
  public var reason = ""
  /// "Continue with email"
  public var email = ""
  /// "Not yet"
  public var notYet = ""
  public var closeLabel = ""
  /// the phone can sign in with Apple: the system's key is drawn first
  public var apple = false
  /// "" | "apple" | "email": a sign-in on its way
  public var busy = ""
  public var dim: Color = .clear
  public var bottomMargin: CGFloat = 8

  public init() {}
}

/*
 SignUpSheet's face (src/components/SignUpSheet.tsx): the title, the reason, then Sign in with
 Apple (the system's own button, which the adapter draws and passes in as `appleKey`: this file
 imports SwiftUI only), Continue with email (the quiet key, off and at half while anything is
 signing in), and Not yet (the plain key: leaving is always allowed and always cheap). The sign-in
 itself is TypeScript's, as it was.
 */
public struct KSignUpSheet<AppleKey: View>: View {
  let theme: KTheme
  let content: KSignUpSheetContent
  let appleKey: AppleKey
  let onEmail: () -> Void
  let onClose: () -> Void

  @AccessibilityFocusState private var titleFocused: Bool

  public init(theme: KTheme, content: KSignUpSheetContent, @ViewBuilder appleKey: () -> AppleKey, onEmail: @escaping () -> Void, onClose: @escaping () -> Void) {
    self.theme = theme
    self.content = content
    self.appleKey = appleKey()
    self.onEmail = onEmail
    self.onClose = onClose
  }

  public var body: some View {
    let busy = !content.busy.isEmpty
    KSheetChrome.Stage(theme: theme, dim: content.dim, bottomMargin: content.bottomMargin, maxHeight: .infinity, onCancel: onClose) {
      VStack(spacing: 0) {
        KSheetChrome.Header(theme: theme, title: content.title, closeLabel: content.closeLabel, titleFocus: $titleFocused, onClose: onClose)
        KSheetChrome.Body(theme: theme, text: content.reason)
        VStack(spacing: KSheetChrome.keyGap) {
          if content.apple {
            appleKey
              .frame(maxWidth: .infinity)
              .frame(height: 50)
              .opacity(busy ? 0.5 : 1)
          }
          KSheetChrome.Key(theme: theme, kind: .quiet, label: content.busy == "email" ? "…" : content.email, dimmed: busy ? 0.5 : nil, action: onEmail)
            .disabled(busy)
          KSheetChrome.Key(theme: theme, kind: .plain, label: content.notYet, action: onClose)
        }
        .padding(.horizontal, KSheetChrome.keyInset)
      }
      .padding(.top, KSheetChrome.topPad)
      .padding(.bottom, KSheetChrome.bottomPad)
    }
    .onAppear {
      Task { @MainActor in
        try? await Task.sleep(for: .milliseconds(300))
        titleFocused = true
      }
    }
  }
}

// MARK: - The report / block card

public struct KReportMenuContent: Equatable {
  /// true: the three choices; false: the one-line answer and Done
  public var menu = true
  /// "Report" (or "Report this signature")
  public var report = ""
  public var block = ""
  public var never = ""
  /// the answer line (sent, failed, block failed)
  public var answer = ""
  public var done = ""
  /// a report or a block on its way: the rows are off, the report row says "…"
  public var busy = false
  /// block's word: the postal red, or Settings' red on a dark ground (TS)
  public var blockInk: Color = .red
  /// the ban glyph: the postal red in every theme
  public var banInk: Color = .red
  /// the room around the card inside its Host, for its shadow
  public var room: CGFloat = 0

  public init() {}
}

/*
 ReportSheet's card (src/components/ReportMenu.tsx): a plain card (sf, corners 22, a soft shadow,
 no black frame: owner 2026-10-20), its rows in the system face at 15.5 — Report with the flag,
 Block in red with the ban, a rule, Never mind — or, once something has happened, the answer
 line, a rule and Done. Each row grows with its words (48 at least) and stops growing at
 accessibility size 1 (React Native: 1.6); a pressed row takes soft2. A tap anywhere else on the
 card, or in the room around it, is the dim's (it closes), as the React Native card lies inside
 its dim. The answer line takes VoiceOver's focus 350ms after it appears, so "it didn't go
 through" is heard and Done is the next swipe.

 Actions: "report", "block", "close".
 */
public struct KReportMenuCard: View {
  let theme: KTheme
  let content: KReportMenuContent
  let onAction: (String) -> Void

  @AccessibilityFocusState private var answerFocused: Bool

  public init(theme: KTheme, content: KReportMenuContent, onAction: @escaping (String) -> Void) {
    self.theme = theme
    self.content = content
    self.onAction = onAction
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      if content.menu {
        row(content.report, icon: .flag, working: true, key: "report")
        row(content.block, icon: .ban, ink: content.blockInk, key: "block")
        rule.padding(.vertical, 4)
        row(content.never, icon: nil, key: "close")
      } else {
        Text(content.answer)
          .kText(.system(14.5, lineHeight: 21 / 14.5))
          .foregroundStyle(theme.ink)
          .dynamicTypeSize(...DynamicTypeSize.accessibility1)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 16)
          .padding(.top, 12)
          .padding(.bottom, 10)
          .accessibilityFocused($answerFocused)
        rule.padding(.vertical, 2)
        row(content.done, icon: nil, key: "close")
      }
    }
    .padding(.vertical, 4)
    .background {
      RoundedRectangle(cornerRadius: 22, style: .continuous)
        .fill(theme.sf)
        .shadow(color: .black.opacity(theme.isDark ? 0.45 : 0.14), radius: 22, x: 0, y: 8)
    }
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) { onAction("close") }
    .padding(content.room)
    // the dim's part: the card's own ground and the room around it close it
    .contentShape(Rectangle())
    .onTapGesture { onAction("close") }
    .task(id: content.menu) {
      guard !content.menu else { return }
      try? await Task.sleep(for: .milliseconds(350))
      answerFocused = true
    }
  }

  private var rule: some View {
    Rectangle().fill(theme.line).frame(height: 1)
  }

  private enum Icon { case flag, ban }

  private func row(_ label: String, icon: Icon?, ink: Color? = nil, working: Bool = false, key: String) -> some View {
    Button {
      onAction(key)
    } label: {
      HStack(spacing: 12) {
        Group {
          switch icon {
          case .some(.flag): KReportFlag().stroke(theme.ink, style: Self.iconStroke)
          case .some(.ban): KReportBan().stroke(content.banInk, style: Self.iconStroke)
          case .none: Color.clear
          }
        }
        .frame(width: 17, height: 17)
        .frame(width: 20)
        .accessibilityHidden(true)
        Text(content.busy && working ? "…" : label)
          .kText(.system(15.5))
          .foregroundStyle(ink ?? theme.ink)
          .dynamicTypeSize(...DynamicTypeSize.accessibility1)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 12)
      .frame(maxWidth: .infinity, minHeight: 48)
      .contentShape(Rectangle())
    }
    .buttonStyle(KReportRowPress(theme: theme))
    .disabled(content.busy)
    .accessibilityLabel(label)
  }

  /// the React Native glyphs' 1.8 on a 24 grid, drawn at 17
  private static let iconStroke = StrokeStyle(lineWidth: 1.8 * 17 / 24, lineCap: .round, lineJoin: .round)
}

/// A pressed row's ground: soft2, as the React Native Pressable's.
private struct KReportRowPress: ButtonStyle {
  let theme: KTheme

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .background(configuration.isPressed ? theme.soft2 : Color.clear)
  }
}

/// The report row's flag: "M4 22V4", "M4 4h12l-2 4 2 4H4" on a 24 grid.
private struct KReportFlag: Shape {
  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * s, y: rect.minY + y * s) }
    var path = Path()
    path.move(to: p(4, 22))
    path.addLine(to: p(4, 4))
    path.move(to: p(4, 4))
    path.addLine(to: p(16, 4))
    path.addLine(to: p(14, 8))
    path.addLine(to: p(16, 12))
    path.addLine(to: p(4, 12))
    return path
  }
}

/// The block row's ban: a circle r 9 at (12, 12) and the stroke from (5.6, 5.6) to (18.4, 18.4).
private struct KReportBan: Shape {
  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * s, y: rect.minY + y * s) }
    var path = Path()
    path.addEllipse(in: CGRect(x: rect.minX + 3 * s, y: rect.minY + 3 * s, width: 18 * s, height: 18 * s))
    path.move(to: p(5.6, 5.6))
    path.addLine(to: p(18.4, 18.4))
    return path
  }
}

// MARK: - The toast

/*
 The Toast (src/components/ui.tsx, 10a spec-today "Send overlays"): one short line in a pill, ink
 with the page colour on it (TS sends both), system 600 13, corners 22, padding 12 18, centred in
 the Host's width. It takes no touch; TS says the line to VoiceOver once when it appears.
 */
public struct KToastPill: View {
  let message: String
  let fill: Color
  let ink: Color

  public init(message: String, fill: Color, ink: Color) {
    self.message = message
    self.fill = fill
    self.ink = ink
  }

  public var body: some View {
    Text(message)
      .kText(.system(13, .semibold))
      .foregroundStyle(ink)
      .multilineTextAlignment(.center)
      .padding(.horizontal, 18)
      .padding(.vertical, 12)
      .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(fill))
      .frame(maxWidth: .infinity)
      .allowsHitTesting(false)
  }
}
