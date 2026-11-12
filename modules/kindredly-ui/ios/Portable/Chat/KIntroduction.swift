// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN'S INTRODUCTION, THE WHOLE SHEET (2026-10-27, behind the "introritual" switch, OFF by
 default): what a kindred's room or a pen pal's chat shows once, when names have been traded,
 redrawn from React Native's (src/components/Introduction.tsx IntroductionRN, kept as the
 fallback). It fills the page sheet React Native presents (the same Modal, so it rises, drags
 down and closes as before); every word, date, face and beat is TS's.

   the header      "Carried by {wren}", System 500 17, centred, the ✕ at the right (its width
                   mirrored on the left keeps the title on the middle); no rule under it
   her letter      her snapshot (content, grown, 44) and her words in the Letter font's italic,
                   16.5 / 26, in sub
   the ritual      the mosaic one (KIntroMosaicRitual) or, both sides signed, the ceremony's
                   KIntroRitual, centred; one VoiceOver element saying the whole ritual, with
                   Report this signature / Block as its actions once their signature may be held
   what she noticed  "{WREN} NOTICED" in mono 10 ind and the line in the Letter font, 14 / 20,
                   fading in (500) when the ritual is done (`noticedAt`); at once under Reduce
                   Motion, as React Native's reanimated does
   the line under it  the Letter font's italic again
   TALK TO {name}  the 10a main action, pinned under the scroll: ind fill, the page colour, 14
                   corners, System 600 16

 A held signature (KIntroRitual, 450ms, once `holdable`) comes back as its slot in THIS view's
 points (from its top left, so with the scroll taken into account); TS measures the Host and
 drops SignatureHold's card under it, in React Native, over this view.
 */

public struct KIntroductionContent {
  /// when the sheet opened: the ritual and the noticed line count from here
  public var startAt = Date()
  /// Reduce Motion
  public var still = false
  /// the signed ritual is done and their signature may be held (VoiceOver's actions too)
  public var holdable = false
  /// the home indicator's room under TALK TO
  public var bottomInset: CGFloat = 0
  public var title = ""
  public var closeLabel = ""
  /// her snapshot (content, grown, 44)
  public var wren: KImageRef?
  public var body = ""
  public var ritual: Ritual
  /// the ritual as one VoiceOver sentence (each ritual also carries it)
  public var a11y = ""
  /// VoiceOver's two actions on the ritual once it is holdable; "" for none (no one to report)
  public var reportLabel = ""
  public var blockLabel = ""
  public var noticedHead = ""
  /// "" shows nothing
  public var noticedLine = ""
  /// ms from startAt: when the ritual is done and the line fades in
  public var noticedAt: Double = 0
  public var knowYou = ""
  public var talkTo = ""

  public enum Ritual {
    case signed(KIntroRitualContent)
    case mosaic(KIntroMosaicContent)
  }

  public init(ritual: Ritual) {
    self.ritual = ritual
  }
}

public struct KIntroduction: View {
  private let theme: KTheme
  private let content: KIntroductionContent
  private let onClose: () -> Void
  private let onTalk: () -> Void
  private let onHold: (CGRect) -> Void
  private let onAction: (String) -> Void

  @State private var ritualOrigin: CGPoint = .zero

  static let space = "kIntroduction"

  /// - Parameters:
  ///   - onHold: their signature was held: its slot, in this view's points from its top left
  ///   - onAction: VoiceOver's "report" or "block" on the ritual
  public init(theme: KTheme, content: KIntroductionContent, onClose: @escaping () -> Void, onTalk: @escaping () -> Void, onHold: @escaping (CGRect) -> Void, onAction: @escaping (String) -> Void) {
    self.theme = theme
    self.content = content
    self.onClose = onClose
    self.onTalk = onTalk
    self.onHold = onHold
    self.onAction = onAction
  }

  public var body: some View {
    VStack(spacing: 0) {
      header
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: 0) {
          KImage(content.wren, size: CGSize(width: 44, height: 44), contentMode: .fit, placeholder: .clear)
            .frame(width: 44, height: 44)
            .accessibilityHidden(true)
          Text(content.body)
            .kText(.content(16.5, italic: true, lineHeight: 26 / 16.5))
            .foregroundStyle(theme.sub)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 18)
          ritual
            .frame(maxWidth: .infinity)
            .padding(.top, 22)
            .padding(.bottom, 4)
          if !content.noticedLine.isEmpty {
            KIntroNoticed(theme: theme, head: content.noticedHead, line: content.noticedLine, startAt: content.startAt, at: content.noticedAt, still: content.still)
              .padding(.top, 10)
          }
          Text(content.knowYou)
            .kText(.content(16.5, italic: true, lineHeight: 26 / 16.5))
            .foregroundStyle(theme.sub)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 26)
        }
        .padding(.horizontal, 26)
        .padding(.top, 30)
        .padding(.bottom, 30)
      }
      .scrollIndicators(.hidden)
      talk
    }
    .background(theme.bg.ignoresSafeArea())
    .coordinateSpace(.named(Self.space))
  }

  // MARK: the header

  private var header: some View {
    HStack(spacing: 0) {
      Color.clear.frame(width: 24, height: 1)
      Text(content.title)
        .kText(.system(17, .medium))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .accessibilityAddTraits(.isHeader)
      Button(action: onClose) {
        Text(verbatim: "✕")
          .font(.system(size: 16, design: .monospaced))
          .foregroundStyle(theme.mute)
          .frame(width: 24, alignment: .trailing)
          // React Native's hitSlop 12
          .padding(12)
          .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .padding(-12)
      .accessibilityLabel(content.closeLabel)
    }
    .padding(.horizontal, 22)
    .padding(.top, 18)
    .padding(.bottom, 12)
  }

  // MARK: the ritual

  @ViewBuilder
  private var ritual: some View {
    let holdable = content.holdable && !content.reportLabel.isEmpty
    Group {
      switch content.ritual {
      case let .signed(c):
        KIntroRitual(theme: theme, content: c) { r in
          onHold(r.offsetBy(dx: ritualOrigin.x, dy: ritualOrigin.y))
        }
      case let .mosaic(m):
        KIntroMosaicRitual(theme: theme, content: m)
      }
    }
    .onGeometryChange(for: CGPoint.self) { $0.frame(in: .named(Self.space)).origin } action: { ritualOrigin = $0 }
    // VoiceOver: the same two choices as the hold, once it can be held (the ritual stays one element)
    .accessibilityActions {
      if holdable {
        Button(content.reportLabel) { onAction("report") }
        Button(content.blockLabel) { onAction("block") }
      }
    }
  }

  // MARK: TALK TO

  private var talk: some View {
    Button(action: onTalk) {
      Text(content.talkTo)
        .kText(.system(16, .semibold, tracking: 0.4 / 16))
        .foregroundStyle(theme.bg)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.ind))
        .contentShape(RoundedRectangle(cornerRadius: 14, style: .circular))
    }
    .buttonStyle(KIntroPressStyle())
    .padding(.horizontal, 22)
    // on a sheet wider than a phone (the iPhone Duo's inner screen: it stood 610 long there)
    // the key keeps a phone's length; on a phone nothing changes
    .kPhoneLength()
    .padding(.bottom, max(content.bottomInset, 12) + 8)
  }
}

/// What she noticed: the mono head in ind and her line, fading in when the ritual is done.
private struct KIntroNoticed: View {
  let theme: KTheme
  let head: String
  let line: String
  let startAt: Date
  /// ms from startAt
  let at: Double
  let still: Bool

  @State private var shown = false

  var body: some View {
    VStack(spacing: 0) {
      Text(head)
        .kText(.mono(10, .semibold, tracking: 0.16))
        .foregroundStyle(theme.ind)
        .multilineTextAlignment(.center)
      Text(line)
        .kText(.content(14, lineHeight: 20 / 14))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .padding(.top, 6)
    }
    .padding(.horizontal, 8)
    .frame(maxWidth: .infinity)
    .opacity(still || shown ? 1 : 0)
    .task(id: startAt) {
      if still { return }
      let left = at / 1000 - Date().timeIntervalSince(startAt)
      if left > 0 { try? await Task.sleep(for: .seconds(left)) }
      if Task.isCancelled { return }
      // FadeIn(500): reanimated's timing default, an ease in and out
      withAnimation(.easeInOut(duration: 0.5)) { shown = true }
    }
  }
}

/// React Native's Pressable: .85 while the finger is down.
private struct KIntroPressStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.opacity(configuration.isPressed ? 0.85 : 1)
  }
}
