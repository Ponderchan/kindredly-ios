// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMP ALBUM, IN SWIFT (2026-10-27): Kindredly's growth stamps (/stamps, a dev page: the
 route sends a release build home). The React Native page (src/app/stamps.tsx) stays as the
 "stampbook" switch's fallback. Every word, colour and count is TS's
 (src/screens/stamps/stampbook-model); this draws them, keeps which stamp's card is open, and
 reports the card's key.

   ‹               Your stamps              3/12    the sticky secondary bar, the count in mono mute
   Earned by the quiet things — …                   13.5/21 in sub
   [stamp] [stamp] [stamp]                          three to a row: the stamp at 92, its name under
    First   Echo    Three                           it (11.5; 600 ink earned, 400 faint not yet)
 A tap opens the stamp's card over a fixed dim (rgba 20,20,26 .5), fading in: STAMP NO. 01 ·
 第一封信 (mono 10 mute), the stamp at 140 on the card's face, its name (24/700), the bar and
 "2 / 3" while it is on its way, its story (14.5/23 sub), and the key: "Write a letter" on ind
 when it is earned, "Keep going" on ink, its words in the page colour. The key closes the card
 and tells TS; a tap on the dim, or VoiceOver's escape, just closes it. The card is flat (rule B).

 THE GROWTH STAMP (components/GrowthStamp's GrowthStampTile): a white postage frame with a light
 keyline and punched perforations (seven along the top and the bottom, eight down each side,
 filled with whatever the stamp sits on), the face inset by .085 of its width, a gradient from TS
 (its colour, or grey before it is earned) with the emoji at .34, faded to .3 and padlocked until
 it is earned. The stamp keeps its own colours in every theme.
 */

public struct KStampBookTile: Equatable, Sendable, Identifiable {
  public let id: String
  public let name: String
  public let emoji: String
  public let earned: Bool
  /// the face's gradient, top-left to bottom-right
  public let faceFrom: String
  public let faceTo: String
  /// STAMP NO. 01 · 第一封信
  public let label: String
  public let desc: String
  /// "2 / 3" while it is on its way; "" otherwise
  public let progress: String
  /// 0…1 for the bar
  public let fraction: Double
  /// the card's key
  public let action: String

  public init(id: String, name: String, emoji: String, earned: Bool, faceFrom: String, faceTo: String, label: String, desc: String, progress: String, fraction: Double, action: String) {
    self.id = id
    self.name = name
    self.emoji = emoji
    self.earned = earned
    self.faceFrom = faceFrom
    self.faceTo = faceTo
    self.label = label
    self.desc = desc
    self.progress = progress
    self.fraction = fraction
    self.action = action
  }
}

public struct KStampBookContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  /// "3/12"
  public var count = ""
  public var intro = ""
  public var tiles: [KStampBookTile] = []

  public init() {}
}

public final class KStampBookActions {
  public var onBack: () -> Void = {}
  /// the open card's key (it has closed the card already): the stamp's id
  public var onAction: (String) -> Void = { _ in }

  public init() {}
}

public struct KStampBookScreen: View {
  private let theme: KTheme
  private let content: KStampBookContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KStampBookActions

  /// the stamp whose card is open
  @State private var openId: String?
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  public init(theme: KTheme, content: KStampBookContent, topInset: CGFloat, bottomInset: CGFloat, actions: KStampBookActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  private var open: KStampBookTile? {
    guard let openId else { return nil }
    return content.tiles.first { $0.id == openId }
  }

  private var rows: [[KStampBookTile]] {
    stride(from: 0, to: content.tiles.count, by: 3).map { Array(content.tiles[$0..<min($0 + 3, content.tiles.count)]) }
  }

  public var body: some View {
    ZStack {
      VStack(spacing: 0) {
        Color.clear.frame(height: topInset)
        KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true) {
          Text(content.count)
            .kText(.mono(KMonoSizes.label(12), .semibold))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .fixedSize()
            .frame(minWidth: 36)
        } onBack: {
          actions.onBack()
        }
        ScrollView(.vertical) {
          VStack(alignment: .leading, spacing: 0) {
            Text(content.intro)
              .kText(.system(13.5, lineHeight: 21.0 / 13.5))
              .foregroundStyle(theme.sub)
              .fixedSize(horizontal: false, vertical: true)
              .padding(.bottom, 20)
            VStack(spacing: 22) {
              ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(alignment: .top, spacing: 0) {
                  ForEach(0..<3, id: \.self) { i in
                    if i < row.count {
                      tileButton(row[i])
                    } else {
                      Color.clear.frame(maxWidth: .infinity, maxHeight: 1)
                    }
                  }
                }
              }
            }
            // every row keeps 22 under it, the last one too
            .padding(.bottom, 22)
          }
          .padding(.horizontal, 22)
          .padding(.top, 10)
        }
        .scrollIndicators(.hidden)
        .contentMargins(.bottom, bottomInset, for: .scrollContent)
      }
      .accessibilityHidden(open != nil)
      if let tile = open {
        card(tile)
          .transition(.opacity)
          .zIndex(1)
      }
    }
    .background { theme.bg.ignoresSafeArea() }
  }

  private func show(_ id: String?) {
    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) { openId = id }
  }

  private func tileButton(_ tile: KStampBookTile) -> some View {
    SwiftUI.Button {
      show(tile.id)
    } label: {
      VStack(spacing: 8) {
        KGrowthStampTile(tile: tile, size: 92, ground: theme.bg)
        Text(tile.name)
          .kText(.system(11.5, tile.earned ? .semibold : .regular))
          .foregroundStyle(tile.earned ? theme.ink : theme.faint)
          .lineLimit(1)
          .multilineTextAlignment(.center)
      }
      .frame(maxWidth: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(tile.name)
    .accessibilityValue(tile.progress)
    .accessibilityAddTraits(.isButton)
  }

  private func card(_ tile: KStampBookTile) -> some View {
    ZStack {
      Color(red: 20 / 255, green: 20 / 255, blue: 26 / 255).opacity(0.5)
        .ignoresSafeArea()
        .contentShape(Rectangle())
        .onTapGesture { show(nil) }
        .accessibilityHidden(true)
      // the card as it is; scrolling only when large type makes it taller than the screen
      ViewThatFits(in: .vertical) {
        cardFace(tile)
        ScrollView(.vertical) { cardFace(tile) }
          .scrollIndicators(.hidden)
      }
      .padding(.top, topInset)
      .padding(.bottom, bottomInset)
      .accessibilityElement(children: .contain)
      .accessibilityAddTraits(.isModal)
      .accessibilityAction(.escape) { show(nil) }
    }
  }

  private func cardFace(_ tile: KStampBookTile) -> some View {
    VStack(spacing: 0) {
      Text(tile.label)
        .kText(.mono(10, .semibold, tracking: 0.16))
        .foregroundStyle(theme.mute)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.bottom, 18)
      KGrowthStampTile(tile: tile, size: 140, ground: theme.sf)
      Text(tile.name)
        .kText(.system(24, .bold))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 18)
        .accessibilityAddTraits(.isHeader)
      if !tile.progress.isEmpty {
        KFractionWidth(fraction: 0.7) {
          VStack(spacing: 6) {
            GeometryReader { g in
              ZStack(alignment: .leading) {
                Capsule().fill(theme.soft2)
                Rectangle()
                  .fill(theme.ind)
                  .frame(width: g.size.width * CGFloat(min(1, max(0, tile.fraction))))
              }
              .clipShape(RoundedRectangle(cornerRadius: 3, style: .circular))
            }
            .frame(height: 5)
            .accessibilityHidden(true)
            Text(tile.progress)
              .kText(.mono(11, .semibold))
              .foregroundStyle(theme.mute)
          }
          .frame(maxWidth: .infinity)
        }
        .padding(.top, 14)
      }
      Text(tile.desc)
        .kText(.system(14.5, lineHeight: 23.0 / 14.5))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 14)
      SwiftUI.Button {
        show(nil)
        actions.onAction(tile.id)
      } label: {
        Text(tile.action)
          .kText(.system(14.5, .bold))
          .foregroundStyle(theme.bg)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .frame(maxWidth: .infinity, minHeight: 48)
          .background(Capsule().fill(tile.earned ? theme.ind : theme.ink))
          .contentShape(Capsule())
      }
      .buttonStyle(KFloatPressStyle())
      .padding(.top, 22)
    }
    .padding(26)
    .frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(theme.sf))
    // a tap on the card itself is not a tap on the dim
    .contentShape(RoundedRectangle(cornerRadius: 22, style: .circular))
    .onTapGesture {}
    .padding(28)
  }
}

/// Proposes `fraction` of the width it is offered to its one child and centres it (CSS width: 70%).
private struct KFractionWidth: Layout {
  let fraction: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? 0
    let child = subviews.first?.sizeThatFits(ProposedViewSize(width: width * fraction, height: nil)) ?? .zero
    return CGSize(width: proposal.width ?? child.width, height: child.height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: CGPoint(x: bounds.midX, y: bounds.minY), anchor: .top, proposal: ProposedViewSize(width: bounds.width * fraction, height: nil))
  }
}

/// A growth stamp: the white postage frame, its perforations in the ground's colour, the face's
/// gradient and emoji, and the padlock until it is earned.
public struct KGrowthStampTile: View {
  private let tile: KStampBookTile
  private let size: CGFloat
  private let ground: Color

  /// GrowthStampTile's keyline (C.line)
  private static let keyline = Color(hex: "#E4E4E0")

  public init(tile: KStampBookTile, size: CGFloat, ground: Color) {
    self.tile = tile
    self.size = size
    self.ground = ground
  }

  public var body: some View {
    let w = size
    let h = size * 1.18
    let inset = size * 0.085
    ZStack(alignment: .topLeading) {
      Canvas { ctx, _ in
        let frame = Path(roundedRect: CGRect(x: 0, y: 0, width: w, height: h), cornerRadius: 2)
        ctx.fill(frame, with: .color(.white))
        ctx.stroke(frame, with: .color(Self.keyline), lineWidth: 0.8)
        let r = size * 0.033
        let across = 7
        let down = Int((Double(across) * 1.18).rounded())
        func hole(_ x: CGFloat, _ y: CGFloat) {
          ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)), with: .color(ground))
        }
        for i in 0..<across {
          let t = (CGFloat(i) + 0.5) / CGFloat(across) * w
          hole(t, 0)
          hole(t, h)
        }
        for i in 0..<down {
          let t = (CGFloat(i) + 0.5) / CGFloat(down) * h
          hole(0, t)
          hole(w, t)
        }
      }
      .frame(width: w, height: h)
      RoundedRectangle(cornerRadius: 3, style: .circular)
        .fill(LinearGradient(colors: [Color(hex: tile.faceFrom), Color(hex: tile.faceTo)], startPoint: UnitPoint(x: 0.15, y: 0), endPoint: UnitPoint(x: 0.85, y: 1)))
        .overlay {
          Text(verbatim: tile.emoji)
            .font(.system(size: size * 0.34))
            .opacity(tile.earned ? 1 : 0.3)
        }
        .frame(width: w - inset * 2, height: h - inset * 2)
        .offset(x: inset, y: inset)
      if !tile.earned {
        Circle()
          .fill(Color.white.opacity(0.85))
          .overlay {
            Text(verbatim: "🔒")
              .font(.system(size: size * 0.11))
          }
          .frame(width: size * 0.2, height: size * 0.2)
          .offset(x: w - inset - 3 - size * 0.2, y: h - inset - 3 - size * 0.2)
      }
    }
    .frame(width: w, height: h, alignment: .topLeading)
    .accessibilityHidden(true)
  }
}
