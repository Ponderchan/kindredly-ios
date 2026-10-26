// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 KEEPSAKES IN SWIFT (owner, 2026-10-27: "make Me all Swift"): the whole shelf (/keepsakes, from
 her page's "All N →" and Me) and one keepsake (/keepsake/[id]). The React Native pages
 (src/app/keepsakes.tsx, src/app/keepsake/[id].tsx) stay as the "keepsakes" / "keepsake"
 switches' fallback. Every word, picture and order is TS's (src/screens/keepsakes); this draws
 them and reports taps.

 THE SHELF
   ‹                Keepsakes                 12   the sticky secondary bar (KBackBar), the count
   What Wren kept from journeys that really        in mono mute at its right
   happened. Newest first.                         14/20 in sub
   ┌──────┐ ┌──────┐ ┌──────┐                      three to a row, 12 apart (two at the
   │ art  │ │ art  │ │ art ●│                      accessibility sizes). Each tile is an object
   │ name │ │ name │ │ name │                      (rule B, owner 2026-10-26): the theme's soft,
   │PROOF │ │PROOF │ │PROOF │                      corners 14, no edge, the deep-purple hard
   └──────┘ └──────┘ └──────┘                      shadow at 4 (KObjectDepth); the 40 art, the
                                                   name (12/600, two lines), the proof (mono 9)
 and the ind dot on one not opened yet, which VoiceOver hears in the tile's label ("…, new").

 ONE KEEPSAKE
   ‹              Relationship                     the bar's title is the keepsake's kind
                   [art 108]
                 First Kindred                     20/700, the page's header for VoiceOver
                 SEP 18, 2026                      mono 11 in mute
   (Wren) What she did, in the Letter font's italic (upright in Garamond and SF Mono)
   THE EVIDENCE                                    mono 10 in mute
   3 LETTERS EACH WAY                              mono 11 in ink, a 1pt line under it
   A LINE SHE CARRIED                              (only when there is one)
   “the line”                                      someone's words: the reader's Letter font
   Go to the Correspondence  →                     (only when it came from one), ind
   [      Share This Keepsake      ]               a flat soft key (rule B: no outline)
 Not on the shelf yet: her "Not yet." line, centred, instead of everything under the date. An id
 the catalog doesn't know draws the bar alone, as the React Native page draws an empty page.

 Wren is her own snapshot (lib/bird-images), never a new drawing.
 */

// MARK: - The shelf

/// One keepsake on the shelf.
public struct KKeepsakeTile: Equatable, Sendable, Identifiable {
  public let id: String
  public let name: String
  /// its proof ("3 EACH WAY", or the day it happened, in capitals)
  public let proof: String
  /// the keepsake's own art (a bundled PNG); nil while it resolves
  public let icon: KImageRef?
  /// not opened yet: the ind dot
  public let fresh: Bool
  /// what VoiceOver says ("First Kindred, new")
  public let a11y: String

  public init(id: String, name: String, proof: String, icon: KImageRef?, fresh: Bool, a11y: String) {
    self.id = id
    self.name = name
    self.proof = proof
    self.icon = icon
    self.fresh = fresh
    self.a11y = a11y
  }
}

public struct KKeepsakesContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  /// the shelf's count at the bar's right; "" before the shelf is read
  public var count = ""
  public var lede = ""
  /// the empty shelf's line; "" when there is something (or nothing read yet)
  public var none = ""
  public var tiles: [KKeepsakeTile] = []

  public init() {}
}

public final class KKeepsakesActions {
  public var onBack: () -> Void = {}
  /// a tile: the keepsake's id
  public var onOpen: (String) -> Void = { _ in }

  public init() {}
}

public struct KKeepsakesScreen: View {
  /// the tiles' shadow, a small object's (6 × its scale)
  static var depth: CGFloat { 4 }
  static var gap: CGFloat { 12 }

  private let theme: KTheme
  private let content: KKeepsakesContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KKeepsakesActions

  @Environment(\.dynamicTypeSize) private var typeSize

  public init(theme: KTheme, content: KKeepsakesContent, topInset: CGFloat, bottomInset: CGFloat, actions: KKeepsakesActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  /// three to a row; two at the accessibility sizes, so a name still has room
  private var perRow: Int { typeSize.isAccessibilitySize ? 2 : 3 }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true) {
        Text(content.count)
          .kText(.mono(11, .medium, tracking: 0.1))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .fixedSize()
          .padding(.horizontal, 4)
      } onBack: {
        actions.onBack()
      }
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: 0) {
          if !content.lede.isEmpty {
            Text(content.lede)
              .kText(.system(14, lineHeight: 20.0 / 14.0))
              .foregroundStyle(theme.sub)
              .fixedSize(horizontal: false, vertical: true)
              .padding(.bottom, 14)
          }
          if !content.none.isEmpty {
            Text(content.none)
              .kText(.system(14))
              .foregroundStyle(theme.mute)
              .fixedSize(horizontal: false, vertical: true)
              .padding(.top, 20)
          }
          grid
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
      }
      .scrollIndicators(.hidden)
      .contentMargins(.bottom, bottomInset, for: .scrollContent)
    }
    .background { theme.bg.ignoresSafeArea() }
  }

  private var rows: [[KKeepsakeTile]] {
    let n = perRow
    return stride(from: 0, to: content.tiles.count, by: n).map { start in
      Array(content.tiles[start..<min(start + n, content.tiles.count)])
    }
  }

  private var grid: some View {
    let n = perRow
    return VStack(spacing: Self.gap) {
      ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
        HStack(alignment: .top, spacing: Self.gap) {
          ForEach(row) { tile in
            KKeepsakeTileView(theme: theme, tile: tile, depth: Self.depth) {
              actions.onOpen(tile.id)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
          }
          // a short last row keeps the tiles their width
          ForEach(0..<max(0, n - row.count), id: \.self) { _ in
            Color.clear.frame(maxWidth: .infinity, maxHeight: 1)
          }
        }
        // the tiles of a row stand as tall as the tallest
        .fixedSize(horizontal: false, vertical: true)
      }
    }
    // the last column's shadow stays inside the page's gutter
    .padding(.trailing, Self.depth)
    .padding(.bottom, Self.depth)
  }
}

/// A keepsake's tile on the shelf (rule B: an object, no edge, the hard purple shadow).
struct KKeepsakeTileView: View {
  let theme: KTheme
  let tile: KKeepsakeTile
  let depth: CGFloat
  let onTap: () -> Void

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 14, style: .circular)
    SwiftUI.Button(action: onTap) {
      VStack(spacing: 0) {
        KImage(tile.icon, size: CGSize(width: 40, height: 40), contentMode: .fit, placeholder: .clear)
        Text(tile.name)
          .kText(.system(12, .semibold))
          .foregroundStyle(theme.ink)
          .multilineTextAlignment(.center)
          .lineLimit(2)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 8)
          .dynamicTypeSize(...DynamicTypeSize.accessibility2)
        Text(tile.proof)
          .kText(.mono(9, .medium, tracking: 0.07))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
          .padding(.top, 4)
          .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      }
      .padding(.vertical, 14)
      .padding(.horizontal, 8)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
      .background(shape.fill(theme.soft))
      .kObjectDepth(shape, theme: theme, offset: depth)
      .overlay(alignment: .topTrailing) {
        if tile.fresh {
          Circle().fill(theme.ind).frame(width: 7, height: 7).padding(8)
        }
      }
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(tile.a11y)
    .accessibilityAddTraits(.isButton)
  }
}

// MARK: - One keepsake

public struct KKeepsakeContent: Equatable, Sendable {
  /// the bar's title: the keepsake's kind ("Relationship")
  public var title = ""
  public var backLabel = ""
  /// the catalog knows this id; false draws the bar alone
  public var known = false
  public var icon: KImageRef?
  public var name = ""
  /// the day it happened, in capitals; "" while it isn't on the shelf
  public var when = ""
  /// it is on the reader's shelf: her line, the evidence and the share key show
  public var kept = false
  /// her snapshot beside her line; nil while it is captured
  public var bird: KImageRef?
  public var wrenLine = ""
  public var evidenceLabel = ""
  public var evidence = ""
  public var lineLabel = ""
  /// the line she carried, quotes and all; "" for none
  public var line = ""
  /// the link to the correspondence it came from; "" for none
  public var go = ""
  public var share = ""
  /// her line when it isn't on the shelf yet
  public var notYet = ""

  public init() {}
}

public final class KKeepsakeActions {
  public var onBack: () -> Void = {}
  /// the link to the correspondence
  public var onGo: () -> Void = {}
  public var onShare: () -> Void = {}

  public init() {}
}

public struct KKeepsakeScreen: View {
  private let theme: KTheme
  private let content: KKeepsakeContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KKeepsakeActions

  public init(theme: KTheme, content: KKeepsakeContent, topInset: CGFloat, bottomInset: CGFloat, actions: KKeepsakeActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true, onBack: { actions.onBack() })
      if content.known {
        ScrollView(.vertical) {
          page
            .padding(.horizontal, 26)
            .padding(.top, 24)
        }
        .scrollIndicators(.hidden)
        .contentMargins(.bottom, bottomInset, for: .scrollContent)
      } else {
        Spacer(minLength: 0)
      }
    }
    .background { theme.bg.ignoresSafeArea() }
  }

  private var page: some View {
    VStack(alignment: .leading, spacing: 0) {
      VStack(spacing: 0) {
        KImage(content.icon, size: CGSize(width: 108, height: 108), contentMode: .fit, placeholder: .clear)
          .accessibilityHidden(true)
        Text(content.name)
          .kText(.system(20, .bold))
          .foregroundStyle(theme.ink)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 16)
          .accessibilityAddTraits(.isHeader)
        if !content.when.isEmpty {
          Text(content.when)
            .kText(.mono(11, .medium, tracking: 1.4 / 11))
            .foregroundStyle(theme.mute)
            .multilineTextAlignment(.center)
            .padding(.top, 8)
        }
      }
      .frame(maxWidth: .infinity)

      if content.kept {
        kept
      } else {
        Text(content.notYet)
          .kText(.content(15, italic: true, lineHeight: 23.0 / 15.0))
          .foregroundStyle(theme.mute)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity)
          .padding(.top, 30)
      }
    }
  }

  @ViewBuilder
  private var kept: some View {
    // her sentence: what SHE did, in the Letter font's italic
    HStack(alignment: .top, spacing: 10) {
      KImage(content.bird, size: CGSize(width: 24, height: 24), contentMode: .fit, placeholder: .clear)
        .accessibilityHidden(true)
      Text(content.wrenLine)
        .kText(.content(15, italic: true, lineHeight: 23.0 / 15.0))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.top, 30)

    Text(content.evidenceLabel)
      .kText(.mono(10, .medium, tracking: 0.16))
      .foregroundStyle(theme.mute)
      .padding(.top, 30)
      .padding(.bottom, 10)
      .accessibilityAddTraits(.isHeader)
    Text(content.evidence)
      .kText(.mono(11, .medium, tracking: 0.8 / 11))
      .foregroundStyle(theme.ink)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.bottom, 12)
      .overlay(alignment: .bottom) { theme.line.frame(height: 1) }

    if !content.line.isEmpty {
      Text(content.lineLabel)
        .kText(.mono(10, .medium, tracking: 0.16))
        .foregroundStyle(theme.mute)
        .padding(.top, 22)
        .padding(.bottom, 10)
        .accessibilityAddTraits(.isHeader)
      // someone's letter being read: the reader's Letter font
      Text(content.line)
        .kText(.content(16.5, lineHeight: 25.0 / 16.5))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    if !content.go.isEmpty {
      SwiftUI.Button {
        actions.onGo()
      } label: {
        HStack(spacing: 8) {
          Text(content.go).kText(.system(14, .semibold))
          Text(verbatim: "→").kText(.system(14))
        }
        .foregroundStyle(theme.ind)
        .frame(minHeight: 44)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(content.go)
      .accessibilityAddTraits(.isButton)
      .padding(.top, 26 - 12)
    }

    // the one key: flat, the theme's soft (rule B: controls carry no outline)
    SwiftUI.Button {
      actions.onShare()
    } label: {
      Text(content.share)
        .kText(.system(15, .semibold))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, minHeight: 50)
        .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.soft))
        .contentShape(RoundedRectangle(cornerRadius: 14, style: .circular))
    }
    .buttonStyle(KFadePressStyle())
    .padding(.top, content.go.isEmpty ? 34 : 34 - 12)
  }
}
