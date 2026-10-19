// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMP TRAY (ComposeTray.tsx StampTray, drawn the 10a way): where the keyboard was, 296
 above the home indicator, on soft with a 1pt line along its top. It scrolls: FOR THIS LETTER
 (stamps read off the letter itself), RECENTLY USED, then the six categories of six — each under
 its head in mono 600 10 at .14em in mute, six to a row. A tile is the stamp itself at the
 ladder's trayTile, 30×36 (the owner, 2026-10-18: the App Store tray's size, after 40×48 read too
 big for a picker of 36; KStamp, your own stamp so flat, and nothing
 framed round it, since a stamp is never put inside another tile's border; stamps v3 look the same
 in every theme), and the one on the envelope keeps the
 selection it always had, the 2pt ind ring with corners of 7, 2 out from the stamp's edge; its
 name under it in mono in its tray name colour (stamps v3 §9: nameLight on the light themes,
 nameDark on Midnight, each ≥4.7:1 on this tray's soft; TS's inkHex only for an id this build
 doesn't know), on ONE line wherever it fits (the
 owner's call: most names one line): at 9, else at 8, and only a name that fits neither wraps to
 centred lines at 9, up to three, stepping down to 8 rather than cut a word (in English 31 of 36
 stay on one line; never told anyone, situationship, hat meinen tag gerettet wrap; a row of the
 grid grows to its tallest name). Never truncated.
 The names are drawn exactly as TS sends them: lower
 case since the owner's call of 2026-10-18 (useComposeState traySections), so nothing here
 upper-cases them or sets a textCase; the section heads stay in capitals, also as sent. The tiles
 stop growing at accessibility1, as the + tray's cells do.
 A tap picks it (TS closes the tray and notes it as recently used).

 The custom stamp and the stamp cam are doors not built yet (ComposeTray DOORS_OPEN = false):
 there is no tab row until they are.

 The sections come from TS (compose-model stampSections), already in the reader's language,
 with ids no stamp has already dropped.
 */
struct KStampTray: View {
  static let columns = 6
  /// the tile's stamp width (the ladder's trayTile: 30 × 36)
  static let tile: CGFloat = KStampLadder.trayTile.w

  let theme: KTheme
  let sections: [KComposeStampSection]
  let selectedId: String
  let bottomInset: CGFloat
  let onPick: (String) -> Void

  private var grid: [GridItem] {
    Array(repeating: GridItem(.flexible(), spacing: 0, alignment: .top), count: Self.columns)
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 6) {
        ForEach(sections) { section in
          VStack(alignment: .leading, spacing: 4) {
            Text(section.title)
              .kText(.monoSection)
              .foregroundStyle(theme.mute)
              .padding(.horizontal, 6)
              .padding(.top, 10)
              .accessibilityAddTraits(.isHeader)
            LazyVGrid(columns: grid, spacing: 0) {
              ForEach(section.items) { item in
                tile(item)
              }
            }
          }
        }
      }
      .padding(.horizontal, 10)
      .padding(.top, 4)
      .padding(.bottom, 18 + bottomInset)
    }
    .scrollIndicators(.hidden)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(theme.soft)
    .overlay(alignment: .top) {
      Rectangle().fill(theme.line).frame(height: 1)
    }
  }

  private func tile(_ item: KComposeStampItem) -> some View {
    let on = item.id == selectedId
    return SwiftUI.Button {
      onPick(item.id)
    } label: {
      VStack(spacing: 2) {
        KStamp(id: item.id, width: Self.tile, dark: theme.isDark)
          // the ring: 2 of room and its own 2pt, as ComposeTray's padding 2 + borderWidth 2
          .padding(4)
          .overlay {
            RoundedRectangle(cornerRadius: 7, style: .circular)
              .strokeBorder(on ? theme.ind : Color.clear, lineWidth: 2)
          }
        // one line at 9, else one line at 8, else wrapped (see the header): the first that fits.
        // The wrapped one takes up to three lines and steps down to 8 before it would cut a word:
        // on a 375 phone a column leaves a name 53pt and "never told" alone needs 54 at 9, so the
        // old two lines at 9 cut "never told anyone" (and German's three-word names) with an ellipsis
        // A wrapped option is only taken while its longest word fits the column whole (at large
        // type "ordinary" alone outgrows it and SwiftUI would break it ordina/ry); past that each
        // word gets its own line and shrinks to fit.
        ViewThatFits(in: .horizontal) {
          name(item, size: 9).lineLimit(1).fixedSize()
          name(item, size: 8).lineLimit(1).fixedSize()
          wrapped(item, size: 9)
          wrapped(item, size: 8)
          VStack(spacing: 0) {
            ForEach(Array(Self.words(item.name).enumerated()), id: \.offset) { _, word in
              nameText(word, item: item, size: 9).lineLimit(1).minimumScaleFactor(0.4)
            }
          }
        }
        // 3 either side, so two neighbours' names never read as one (can't sleep made my day)
        .padding(.horizontal, 3)
      }
      .padding(.top, 6)
      .padding(.bottom, 4)
      .frame(maxWidth: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(item.accessibilityLabel)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  /// Up to three centred lines; its ideal width is its longest word's, so ViewThatFits takes it
  /// only while every word fits the column on its own (the words themselves never break).
  private func wrapped(_ item: KComposeStampItem, size: CGFloat) -> some View {
    let longest = Self.words(item.name).max { $0.count < $1.count } ?? item.name
    return VStack(spacing: 0) {
      name(item, size: size)
        .lineLimit(3)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(idealWidth: 0, maxWidth: .infinity)
      nameText(longest, item: item, size: size).lineLimit(1).fixedSize().hidden().frame(height: 0)
    }
  }

  private static func words(_ s: String) -> [String] {
    s.split(separator: " ").map(String.init)
  }

  private func name(_ item: KComposeStampItem, size: CGFloat) -> some View {
    nameText(item.name, item: item, size: size)
  }

  private func nameText(_ text: String, item: KComposeStampItem, size: CGFloat) -> some View {
    Text(text)
      .kText(.mono(size, .medium, tracking: 0))
      // stamps v3 §9: nameLight on the light themes, nameDark on Midnight (measured on soft, this
      // tray's ground); TS's colour for an id this build doesn't know
      .foregroundStyle(KStampArt.trayName(id: item.id, dark: theme.isDark) ?? item.ink)
  }
}

extension KStampSlot {
  /// The empty slot's stroke on a theme's page (Kit/KStampArt.swift KStampSlot): its mute, except
  /// on Lavender (mute 2.94:1 on #ECEAF8), which takes the pale slot colour (3.65:1), so the slot
  /// keeps 3:1 everywhere. The twin of TS lib/stamp-frame stampSlotStroke.
  public static func stroke(for theme: KTheme) -> Color {
    theme.key == "lavender" ? KStampFrame.color(KStampArtData.v3SlotPale) : theme.mute
  }
}
