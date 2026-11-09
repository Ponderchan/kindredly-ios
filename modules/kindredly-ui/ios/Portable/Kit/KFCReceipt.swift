// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FIRST CLASS RECEIPT, IN SWIFT (behind the "fcreceipt" switch, 2026-11-09): the A3 "three
 stickers" card over the paywall once a purchase has gone through (owner 2026-10-19; FC2 §4),
 drawn as the React Native FirstClassReceipt draws it (src/components/FirstClassWelcome.tsx). The
 facts stay TS's — the trial the App Store confirms, the Cofounder number the server learns,
 the store's own price strings (useConfirmedTrial, useCofounderNo, receiptWords) — and so do the
 haptic and what the keys do: this draws the words it is given and says which was pressed. A
 fresh word (the Cofounder number landing) simply redraws.

   ░░░░░░░░░ the dim (tap: done) ░░░░░░░░░     rgba(30,27,53,.55); Midnight black at .6
   ╭──────────────────────────────────╮         sf, corners 28, padding 26 · 22 · 22, 18 between;
   │  (FIRST CLASS)                    │         Midnight adds a 1pt line edge. 20 in from the
   │                    [COFOUNDER 007] │        sides, 36 over the home indicator, never taller
   │      (One of 300)                 │         than the box less 90 and the status bar (then
   │ Welcome aboard.                   │         the words scroll above the key).
   │ What you bought, in plain words.  │
   │ (        Start writing        )   │
   ╰──────────────────────────────────╯
 - THE STICKERS (150 tall, VoiceOver passes them by): printed things, the same ink (#1E1B35) in
   every theme, no edge, rule B's object depth at 3. Lime capsule turned −7°, 8 in, 14 down,
   system 800 18 at −.01em; gold, corners 14, turned 5°, 6 from the right, 62 down, mono 600 13
   at .12em; lavender capsule turned −3°, 40 in, on the bottom, system 600 13. Each one line,
   padded 2.5 past React Native's padding (the old sticker edge's room). They stop growing at
   xxLarge (React Native's 1.3).
 - The title system 700 22 at −.01em in ink (VoiceOver lands on it first, 120ms in); the body
   system 14/21 in sub; Start writing the flat ind capsule (52 tall at least, 600 16 in the page
   colour), always last and on screen, .9 while pressed.
 - It pops in: .45s cubic-bezier(.3,1.2,.4,1) from 30 down and 96%, opacity at 1.6× the progress;
   simply there under Reduce Motion.
 */
public struct KFCReceiptContent: Equatable, Sendable {
  /// the lime sticker (fc2.rc.stFirst)
  public var first = ""
  /// the gold sticker: FIRST CLASS, or COFOUNDER 007
  public var gold = ""
  /// the lavender sticker: the plan, the free trial, or "One of 300"
  public var lav = ""
  public var title = ""
  public var body = ""
  /// Start writing
  public var go = ""
  /// VoiceOver for the dim (fc2.rc.close)
  public var closeLabel = ""
  /// the status bar's room and the home indicator's (the Host ignores the safe area)
  public var topInset: CGFloat = 0
  public var bottomInset: CGFloat = 0

  public init() {}
}

public final class KFCReceiptActions {
  /// the dim: the receipt and the fare close
  public var onDone: () -> Void = {}
  /// Start writing: they close, then the composer opens (TS)
  public var onWrite: () -> Void = {}

  public init() {}
}

public struct KFCReceipt: View {
  static let ink = Color(hex: "#1E1B35")
  static let lime = Color(hex: "#D8F04A")
  static let gold = Color(hex: "#D8A63F")
  static let lav = Color(hex: "#E4E2F4")

  let theme: KTheme
  let content: KFCReceiptContent
  let actions: KFCReceiptActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @AccessibilityFocusState private var titleFocus: Bool
  @State private var p: CGFloat = 0

  public init(theme: KTheme, content: KFCReceiptContent, actions: KFCReceiptActions) {
    self.theme = theme
    self.content = content
    self.actions = actions
  }

  public var body: some View {
    GeometryReader { geo in
      ZStack(alignment: .bottom) {
        SwiftUI.Button(action: actions.onDone) {
          (theme.isDark ? Color.black.opacity(0.6) : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.55))
            .contentShape(Rectangle())
        }
        .buttonStyle(KChatPlainPress())
        .accessibilityLabel(content.closeLabel)

        card
          .frame(maxHeight: max(0, geo.size.height - 90 - content.topInset), alignment: .bottom)
          .modifier(KFCReceiptPop(p: reduceMotion ? 1 : p))
          .padding(.horizontal, 20)
          .padding(.bottom, 36 + content.bottomInset)
      }
      .frame(width: geo.size.width, height: geo.size.height)
    }
    .ignoresSafeArea()
    .accessibilityAddTraits(.isModal)
    .onAppear {
      if !reduceMotion {
        withAnimation(.timingCurve(0.3, 1.2, 0.4, 1, duration: 0.45)) { p = 1 }
      }
    }
    .task {
      try? await Task.sleep(nanoseconds: 120_000_000)
      titleFocus = true
    }
  }

  private var card: some View {
    VStack(spacing: 18) {
      ViewThatFits(in: .vertical) {
        words
        ScrollView(.vertical, showsIndicators: false) { words }
          .scrollBounceBehavior(.basedOnSize)
      }
      SwiftUI.Button(action: actions.onWrite) {
        Text(content.go)
          .kText(.system(16, .semibold))
          .foregroundStyle(theme.bg)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity, minHeight: 52 - 28)
          .padding(.vertical, 14)
          .padding(.horizontal, 18)
          .background(Capsule(style: .continuous).fill(theme.ind))
          .contentShape(Capsule(style: .continuous))
      }
      .buttonStyle(KSheetChrome.Press(pressed: 0.9))
    }
    .padding(.top, 26)
    .padding(.horizontal, 22)
    .padding(.bottom, 22)
    .background(theme.sf, in: RoundedRectangle(cornerRadius: 28, style: .circular))
    .overlay {
      if theme.isDark {
        RoundedRectangle(cornerRadius: 28, style: .circular).strokeBorder(theme.line, lineWidth: 1)
      }
    }
  }

  private var words: some View {
    VStack(alignment: .leading, spacing: 18) {
      stickers
      Text(content.title)
        .kText(.system(22, .bold, tracking: -0.01))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
        .accessibilityFocused($titleFocus)
      Text(content.body)
        .kText(.system(14, lineHeight: 21.0 / 14.0))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  // ① the sticker field
  private var stickers: some View {
    ZStack {
      sticker(content.first, style: .system(18, .heavy, tracking: -0.01), fill: Self.lime, shape: Capsule(style: .circular), padV: 12, padH: 18, turn: -7)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.leading, 8)
        .padding(.top, 14)
      sticker(content.gold, style: .mono(13, .semibold, tracking: 0.12), fill: Self.gold, shape: RoundedRectangle(cornerRadius: 14, style: .circular), padV: 10, padH: 14, turn: 5)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        .padding(.trailing, 6)
        .padding(.top, 62)
      sticker(content.lav, style: .system(13, .semibold), fill: Self.lav, shape: Capsule(style: .circular), padV: 8, padH: 14, turn: -3)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        .padding(.leading, 40)
    }
    .frame(height: 150)
    .frame(maxWidth: .infinity)
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    .accessibilityHidden(true)
  }

  private func sticker<S: Shape>(_ words: String, style: KTextStyle, fill: Color, shape: S, padV: CGFloat, padH: CGFloat, turn: Double) -> some View {
    Text(words)
      .kText(style)
      .foregroundStyle(Self.ink)
      .lineLimit(1)
      .fixedSize()
      .padding(.vertical, padV + 2.5)
      .padding(.horizontal, padH + 2.5)
      .background(fill, in: shape)
      .kObjectDepth(shape, theme: theme, offset: 3)
      .rotationEffect(.degrees(turn))
  }
}

/// The pop-in at progress `p`: opacity at 1.6 × p (capped), 30 × (1 − p) down, 96% → 100%. One
/// number drives all three, as the Reanimated style reads one shared value (the curve overshoots,
/// so p passes 1 for a moment and the card rises a hair past its place).
private struct KFCReceiptPop: ViewModifier, Animatable {
  var p: CGFloat

  var animatableData: CGFloat {
    get { p }
    set { p = newValue }
  }

  func body(content: Content) -> some View {
    content
      .opacity(Double(min(1, p * 1.6)))
      .scaleEffect(0.96 + p * 0.04)
      .offset(y: (1 - p) * 30)
  }
}
