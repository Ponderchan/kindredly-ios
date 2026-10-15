// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE KEEPSAKES BLOCK (H:75), under the courier's scene inside her frame: what she has kept from
 journeys that really happened. 12 in from the frame on three sides, padding 12 14, corners 16,
 10 between its pieces:
 - the header: KEEPSAKES (mono 600 10 at .14em) and, at the right, "3 SO FAR" (mono 500 10 at
   .12em); a button to the whole shelf;
 - two tiles 72 tall (at least: they grow together with large text), 10 apart, corners 12: the
   latest keepsakes (the icon and its name, system 600 11; a small ind dot on one not opened
   yet, which VoiceOver hears in the tile's label, "{name}, new"), each a button to that
   keepsake; an empty one is a 2pt dashed outline (and takes you to the shelf);
 - the note, the serif italic 12/1.4, centred.
 The mock lays it on the courier's green; here it is the theme's (soft2 under ink and mute,
 sf tiles), which reads in all four themes and under every hour's band.
 */
public struct KKeepsakesBlock: View {
  static var headerStyle: KTextStyle { .monoSection }
  static var nameStyle: KTextStyle { .system(11, .semibold) }
  /// the mock's tile height; a tile grows past it with large text rather than letting its icon
  /// and name spill over the header and the note
  static var tileMinHeight: CGFloat { 72 }

  private let theme: KTheme
  private let keepsakes: KMeKeepsakes
  private let actions: KMeActions

  public init(theme: KTheme, keepsakes: KMeKeepsakes, actions: KMeActions) {
    self.theme = theme
    self.keepsakes = keepsakes
    self.actions = actions
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      SwiftUI.Button {
        actions.onKeepsakes()
      } label: {
        HStack(alignment: .center, spacing: 8) {
          Text(keepsakes.header)
            .kText(Self.headerStyle)
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          Spacer(minLength: 0)
          Text(keepsakes.count)
            .kText(.monoMeta)
            .foregroundStyle(theme.mute)
            .lineLimit(1)
        }
        .padding(.vertical, 6)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .padding(.vertical, -6)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(keepsakes.a11yLabel)
      .accessibilityAddTraits(.isButton)

      HStack(spacing: 10) {
        ForEach(0..<max(2, keepsakes.tiles.count), id: \.self) { i in
          tile(i < keepsakes.tiles.count ? keepsakes.tiles[i] : nil)
        }
      }
      // both tiles take the taller one's height (each fills it: maxHeight .infinity)
      .fixedSize(horizontal: false, vertical: true)

      if !keepsakes.note.isEmpty {
        Text(keepsakes.note)
          .kText(.letterNote)
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .padding(.vertical, 12)
    .padding(.horizontal, 14)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft2))
    .padding(12)
  }

  @ViewBuilder
  private func tile(_ k: KMeKeepsakeTile?) -> some View {
    let shape = RoundedRectangle(cornerRadius: 12, style: .circular)
    if let k {
      SwiftUI.Button {
        actions.onKeepsake(k.id)
      } label: {
        VStack(spacing: 4) {
          KImage(k.image, size: CGSize(width: 32, height: 32), contentMode: .fit, placeholder: .clear)
          Text(k.name)
            .kText(Self.nameStyle)
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, minHeight: Self.tileMinHeight, maxHeight: .infinity)
        .background(shape.fill(theme.sf))
        .overlay(alignment: .topTrailing) {
          if k.fresh {
            Circle()
              .fill(theme.ind)
              .frame(width: 7, height: 7)
              .padding(7)
              .accessibilityHidden(true)
          }
        }
        .contentShape(shape)
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityLabel(k.a11yLabel)
    } else {
      SwiftUI.Button {
        actions.onKeepsakes()
      } label: {
        shape
          .strokeBorder(theme.faint, style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
          .frame(maxWidth: .infinity, minHeight: Self.tileMinHeight, maxHeight: .infinity)
          .contentShape(shape)
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityHidden(true)
    }
  }
}
