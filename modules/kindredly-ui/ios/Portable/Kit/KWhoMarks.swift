// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE MARKS AFTER A STRANGER'S NAME (identity Phase 1: identity-plan §4, §9 and its zodiac
 addendum, with the owner's 2026-10-18 decisions): the she/he mark, then the star sign.

   Sunday Kite ♀ ♊        the mark 6pt after the name, the sign 4pt after the mark (or 6pt after
                          the name, where the mark would be, when there is no mark)

 - HOW THEY LOOK (owner, 2026-11-12: "信上也统一"): the mark sits white on a small disc — light
   blue for he, pink for she — and the sign is its emoji, as on Me's pill and in onboarding
   (KOwnMark below). Until that day they were grey line drawings and never tinted (the decision
   of 2026-10-18); the owner chose one look for a person's marks wherever they show.
 - About 0.8 × the name's size, plus two points for the disc (16 beside a 17pt name).
 - They sit on the name's baseline like a capital: the glyph's ink ends at about 0.84 of its frame,
   so that point is given to the first-text-baseline guide, and an HStack aligned on
   .firstTextBaseline lines them up with the name in any font size.
 - They grow with Dynamic Type as the name beside them does (`size` is the default text size's,
   scaled like body text), so at the large sizes they never shrink to specks beside the name.
 - Decorative: VoiceOver hears the mark and the sign in the row's or the card's own label, which
   TS words ("Sunday Kite, she, Gemini").

 WHO MAY BE MARKED is TS's business, never Swift's: the identity switch, the person's own
 showMark / showSign, they and unset (no mark), blocks (no answer). A mark or a sign that arrives
 is drawn; one that doesn't (nil) leaves no gap. Nothing may sort or filter by either.

 KLineGlyph.mark / .sign read TS's strings ("she", "gemini") strictly: anything else is no glyph,
 so a junk value can never draw some other icon in a mark's place.
 */

public extension KLineGlyph {
  /// The she/he mark for TS's string ("she" | "he"); nil for anything else, including "".
  static func mark(_ raw: String) -> KLineGlyph? {
    switch raw {
    case "she": return .she
    case "he": return .he
    default: return nil
    }
  }

  /// The star sign's glyph for TS's Zodiac string ("aries" … "pisces"); nil for anything else.
  static func sign(_ raw: String) -> KLineGlyph? {
    switch raw {
    case "aries": return .aries
    case "taurus": return .taurus
    case "gemini": return .gemini
    case "cancer": return .cancer
    case "leo": return .leo
    case "virgo": return .virgo
    case "libra": return .libra
    case "scorpio": return .scorpio
    case "sagittarius": return .sagittarius
    case "capricorn": return .capricorn
    case "aquarius": return .aquarius
    case "pisces": return .pisces
    default: return nil
    }
  }
}

/// The mark and the sign after a name: put it in an HStack(alignment: .firstTextBaseline, spacing: 0)
/// right after the name's Text. Draws nothing (and takes no room) when both are nil.
public struct KWhoMarks: View {
  /// the gap after the name, and between the two (identity-plan §4, the addendum)
  public static let afterName: CGFloat = 6
  public static let between: CGFloat = 4
  /// where the glyph's ink sits on its frame: its bottom on the name's baseline
  static let baseline: CGFloat = 0.84

  private let mark: KLineGlyph?
  private let sign: KLineGlyph?
  private let size: CGFloat
  private let color: Color

  /// Dynamic Type's factor for body text (1 at the default size), so the glyphs grow with the name
  @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 1

  /// - Parameters:
  ///   - size: each glyph's frame at the default text size (14 beside a 17pt name: 0.8 × the name,
  ///     rounded); it scales with Dynamic Type
  ///   - color: the theme's sub
  public init(mark: KLineGlyph?, sign: KLineGlyph?, size: CGFloat, color: Color) {
    self.mark = mark
    self.sign = sign
    self.size = size
    self.color = color
  }

  /// True when there is something to draw.
  public var isEmpty: Bool { mark == nil && sign == nil }

  public var body: some View {
    if !isEmpty {
      HStack(spacing: 0) {
        if let mark {
          glyph(mark).padding(.leading, Self.afterName)
        }
        if let sign {
          glyph(sign).padding(.leading, mark == nil ? Self.afterName : Self.between)
        }
      }
      .fixedSize()
      .alignmentGuide(.firstTextBaseline) { $0.height * Self.baseline }
      .alignmentGuide(.lastTextBaseline) { $0.height * Self.baseline }
      .accessibilityHidden(true)
    }
  }

  private func glyph(_ g: KLineGlyph) -> some View {
    // the mark on its disc, the sign as its emoji; `color` is only for a glyph that is neither
    KOwnMark(g, size: ((size + 2) * scale).rounded(), ink: color)
  }
}

/*
 A PERSON'S OWN MARK AND SIGN, THE NEWER WAY (owner: 2026-11-11 for Me's pill, 2026-11-12 for
 onboarding — "选完生日那个星座符号用 emoji 对应的星座表情，选完性别应该淡蓝男、粉色女图标").
 Where someone is choosing or being shown THEIR OWN: the she/he mark sits white on a disc — the
 older product's light blue for he, pink for she — and the star sign is its emoji.

 KWhoMarks above (the marks after a stranger's name on a letter, in a list) draws through this
 too, from 2026-11-12: one look everywhere.
 */

public enum KMarkTint {
  public static let he = Color(hex: "#56B8F5")
  public static let she = Color(hex: "#F58FB4")
}

public extension KLineGlyph {
  /// The star sign as its emoji (with the emoji presentation); nil for a glyph that is no sign.
  var signEmoji: String? {
    switch self {
    case .aries: return "\u{2648}\u{FE0F}"
    case .taurus: return "\u{2649}\u{FE0F}"
    case .gemini: return "\u{264A}\u{FE0F}"
    case .cancer: return "\u{264B}\u{FE0F}"
    case .leo: return "\u{264C}\u{FE0F}"
    case .virgo: return "\u{264D}\u{FE0F}"
    case .libra: return "\u{264E}\u{FE0F}"
    case .scorpio: return "\u{264F}\u{FE0F}"
    case .sagittarius: return "\u{2650}\u{FE0F}"
    case .capricorn: return "\u{2651}\u{FE0F}"
    case .aquarius: return "\u{2652}\u{FE0F}"
    case .pisces: return "\u{2653}\u{FE0F}"
    default: return nil
    }
  }
}

/// A person's own mark or sign in a frame of `size`: the mark on its disc, the sign as its emoji;
/// any other glyph as the line drawing it is, in `ink`.
public struct KOwnMark: View {
  private let glyph: KLineGlyph
  private let size: CGFloat
  private let ink: Color

  public init(_ glyph: KLineGlyph, size: CGFloat, ink: Color = .white) {
    self.glyph = glyph
    self.size = size
    self.ink = ink
  }

  public var body: some View {
    if glyph == .she || glyph == .he {
      ZStack {
        Circle().fill(glyph == .she ? KMarkTint.she : KMarkTint.he)
        KLineIcon(glyph, size: (size * 0.7).rounded(), lineWidth: 2.6, color: .white)
      }
      .frame(width: size, height: size)
    } else if let emoji = glyph.signEmoji {
      // the emoji keeps its own width (its advance is wider than the square it draws: held to
      // the frame's width the square lost its right edge) and sits centred in the frame
      Text(emoji)
        .font(.system(size: size * 0.86))
        .lineLimit(1)
        .fixedSize()
        .frame(width: size, height: size)
    } else {
      KLineIcon(glyph, size: size, lineWidth: 2, color: ink)
    }
  }
}

