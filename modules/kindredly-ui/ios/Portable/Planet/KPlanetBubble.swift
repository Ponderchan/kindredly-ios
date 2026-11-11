import SwiftUI

/* HER WORDS, IN A BUBBLE (docs/courier-planet.md): white, under the planet's scene, with a tail
   that follows her across it. Who and when (mono caps), her line and her aside in italic (the
   reader's content font from Settings, System for most, exactly as her old card sets them:
   KTextStyle.content, not .letter, which never follows the setting), and one button when there
   is something to open (Open, or Play on her day off; the planet page has none).

   The words are laid out once; only the bubble's shape is redrawn each frame, from the probe the
   planet reports her place to. VoiceOver hears the words in the scene's sentence, so here it
   gets the button only.

   ITS HEIGHT IS ITS WORDS'. At the default type size with one or two lines of hers it is the
   prototype's 106 (the band 122); larger type, or Japanese and Korean in a serif content font
   (their lines stand taller, KType.tallScript), make it taller rather than clip her. The shape is the
   words' background, so it is always exactly as tall as they are. */

public struct KPlanetBubble: View {
  /// the band's least height: the bubble (106), 10 over it for the tail and 6 under
  public static let height: CGFloat = 122
  static let inset: CGFloat = 10
  static let foot: CGFloat = 6
  /// the bubble's least height
  static let bubbleHeight: CGFloat = 106
  static let tailWidth: CGFloat = 16
  static let tailRise: CGFloat = 7
  static let captionInk = Color(hex: "#6B6785")
  static let asideInk = Color(hex: "#5B5873")
  /// a lit lamp, a reader: the same gold wherever a lamp is drawn beside words
  public static let lampGold = Color(hex: "#FFD98A")

  private let palette: KCourierPalette
  private let name: String
  private let time: String
  private let line: String
  private let aside: String
  private let cta: String
  private let probe: KPlanetProbe
  private let live: Bool
  private let onCta: () -> Void

  /// her words are content: set in the reader's own font (Settings), as her old card sets them
  @Environment(\.kLetterFace) private var face

  /// - Parameters:
  ///   - time: "2H AGO"; "" for none
  ///   - cta: the button's word; "" for no button
  ///   - probe: the planet above reports her place to it; the tail follows
  ///   - live: the planet's clock runs
  public init(palette: KCourierPalette, name: String, time: String, line: String, aside: String, cta: String = "", probe: KPlanetProbe, live: Bool, onCta: @escaping () -> Void = {}) {
    self.palette = palette
    self.name = name
    self.time = time
    self.line = line
    self.aside = aside
    self.cta = cta
    self.probe = probe
    self.live = live
    self.onCta = onCta
  }

  public var body: some View {
    let night = palette.moon
    VStack(alignment: .leading, spacing: 1) {
      HStack(alignment: .firstTextBaseline, spacing: 0) {
        Text(name.uppercased())
        if !time.isEmpty {
          Text(verbatim: " · ")
          Text(time)
        }
      }
      .kText(.mono(9.5, .semibold, tracking: 0.14))
      .foregroundStyle(Self.captionInk)
      .lineLimit(1)
      .accessibilityHidden(true)
      Text(line)
        .kText(.content(face.fitSize(14), lineHeight: 18.0 / 14.0))
        .foregroundStyle(KBrand.inkOnBrand)
        .lineLimit(3)
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, minHeight: 36, alignment: .topLeading)
        .accessibilityHidden(true)
      HStack(alignment: .center, spacing: 10) {
        Text(aside)
          .kText(.content(face.fitSize(12.5), italic: true))
          .foregroundStyle(Self.asideInk)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .leading)
          .accessibilityHidden(true)
        if !cta.isEmpty {
          SwiftUI.Button(action: onCta) {
            Text(cta)
              .kText(.system(13.5, .semibold))
              .foregroundStyle(night ? Color.white : palette.buttonText)
              .lineLimit(1)
              .padding(.horizontal, 15)
              .frame(minHeight: 30)
              .background(Capsule().fill(night ? KBrand.inkOnBrand : palette.button))
          }
          .buttonStyle(KFadePressStyle())
          .fixedSize()
        }
      }
      .frame(minHeight: 30)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 10)
    .frame(maxWidth: .infinity, minHeight: Self.bubbleHeight, alignment: .topLeading)
    .padding(.horizontal, Self.inset)
    .padding(.top, Self.inset)
    .padding(.bottom, Self.foot)
    .background {
      KPlanetBubbleShape(probe: probe, live: live)
    }
  }
}

/// The bubble and its tail, which follows her: redrawn each frame from the probe; the words over
/// it are not.
private struct KPlanetBubbleShape: View {
  let probe: KPlanetProbe
  let live: Bool

  var body: some View {
    TimelineView(.animation(minimumInterval: nil, paused: !live)) { _ in
      Canvas { context, size in
        // the band less its margins: 10 at the sides and over it (the tail's room), 6 under
        let inset = KPlanetBubble.inset
        let top = inset
        let box = CGRect(x: inset, y: top, width: size.width - inset * 2, height: max(0, size.height - top - KPlanetBubble.foot))
        let half = KPlanetBubble.tailWidth / 2
        let x = min(max(probe.wrenX, box.minX + 24 + half), box.maxX - 24 - half)
        var shape = Path(roundedRect: box, cornerRadius: 20, style: .continuous)
        var tail = Path()
        tail.move(to: CGPoint(x: x - half, y: top + 0.5))
        tail.addLine(to: CGPoint(x: x, y: top - KPlanetBubble.tailRise))
        tail.addLine(to: CGPoint(x: x + half, y: top + 0.5))
        tail.closeSubpath()
        shape.addPath(tail)
        var shadowed = context
        shadowed.addFilter(.shadow(color: Color(hex: "#1E1B35").opacity(0.18), radius: 9, x: 0, y: 6))
        shadowed.fill(shape, with: .color(.white))
      }
    }
    .accessibilityHidden(true)
  }
}
