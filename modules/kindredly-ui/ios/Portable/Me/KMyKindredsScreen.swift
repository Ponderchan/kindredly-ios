// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 MY KINDREDS, REDRAWN (owner, 2026-10-27: the old sheet was badly designed and mixed in pen pals).
 The people you traded names and faces with after five letters each, and nobody else: a small
 address book of people you now know. Pen pals still on their way live on the Kindreds tab. The
 React Native page (src/app/my-kindreds.tsx, the numbered sheet with the strangers) stays as the
 "mykindreds" switch's fallback. Every word, date and number is TS's (src/screens/my-kindreds,
 my-kindreds-model.ts); this draws them and reports taps.

   ‹                 Kindreds                    3   the sticky secondary bar, the count at its right
   Five letters each way, names exchanged. You       the lede, 14/20 in sub
   can see them, and talk.
   ╭──────────────────────────────────────────╮
   │ (face)  Juniper Hale               OCT 25│     the face they gave at signing (56, round; a
   │         ╭KINDREDS · SEP 18╮            ③ │     member's in the gold stamp); the pen name 19/600;
   │                                          │     the last letter's day (mono 11, mute); the
   │ ┌──────────────────────────────────────┐ │     ceremony's KINDREDS · date chip, slapped at 2°
   │ │ You: the last line, two lines at most│ │     as it lands at the end of the ritual; their
   │ └──────────────────────────────────────┘ │     unread letters as the Kindreds tab's ind badge;
   ╰──────────────────────────────────────────╯     the last line (You: first when it was yours)
                                                     on the theme's soft, system 14 like the tab's
 Each card is the ceremony's signed card (rule B, owner 2026-10-26): the theme's surface, corners
 20, no ink edge, the hard deep-purple shadow (KObjectDepth). Only what the data really has: no
 chip when the day names were traded isn't known, no badge when nothing is unread, no time when
 nothing has been written. A tap anywhere on a card opens that kindred's room.

 Order: as they became kindreds, the oldest first (TS sorts).

 Empty (no kindreds yet): her snapshot and one warm line, centred: what a kindred is and how you
 get one. A list that couldn't be read and has nothing kept says so instead (never "none").
 Loading: the bar alone.

 Accessibility: each card is one button with the label TS words (name, since, unread, time, the
 line). The words grow with Dynamic Type; at the accessibility sizes the name may take three
 lines and the day goes under it.
 */

public struct KMyKindredCard: Equatable, Sendable, Identifiable {
  public let id: String
  /// their pen name
  public let name: String
  /// the face they gave at signing
  public let face: KFaceSource
  /// a First Class member's stamp around the face (C2); nil for none
  public let stamp: KMemberStamp?
  /// "KINDREDS · SEP 18", the ceremony's chip; "" when the day isn't known
  public let since: String
  /// the last letter's day or time ("OCT 25", "14:02"); "" for none
  public let when: String
  /// "You: " when the last line is yours; ""
  public let youPrefix: String
  /// the last line; "" for none
  public let preview: String
  /// their letters not yet opened on this phone ("3", "9+"); "" for none
  public let badge: String
  public let a11y: String

  public init(id: String, name: String, face: KFaceSource, stamp: KMemberStamp?, since: String, when: String, youPrefix: String, preview: String, badge: String, a11y: String) {
    self.id = id
    self.name = name
    self.face = face
    self.stamp = stamp
    self.since = since
    self.when = when
    self.youPrefix = youPrefix
    self.preview = preview
    self.badge = badge
    self.a11y = a11y
  }
}

public struct KMyKindredsContent: Equatable, Sendable {
  public enum State: String, Sendable {
    /// nothing read yet: the bar alone
    case loading
    /// the cards
    case ready
    /// a real answer with no kindred in it
    case empty
    /// nothing could be read and nothing was kept
    case failed
  }

  public var title = ""
  public var backLabel = ""
  /// the kindreds' count at the bar's right; "" until a list is read
  public var count = ""
  public var lede = ""
  /// the empty state's line
  public var empty = ""
  /// the failed state's line
  public var failed = ""
  /// her snapshot over the empty and failed lines; nil while it is captured
  public var bird: KImageRef?
  public var state: State = .loading
  public var cards: [KMyKindredCard] = []

  public init() {}
}

public final class KMyKindredsActions {
  public var onBack: () -> Void = {}
  /// a card: the thread's id
  public var onOpen: (String) -> Void = { _ in }

  public init() {}
}

public struct KMyKindredsScreen: View {
  private let theme: KTheme
  private let content: KMyKindredsContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KMyKindredsActions

  public init(theme: KTheme, content: KMyKindredsContent, topInset: CGFloat, bottomInset: CGFloat, actions: KMyKindredsActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

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
      switch content.state {
      case .loading:
        Spacer(minLength: 0)
      case .empty:
        note(content.empty)
      case .failed:
        note(content.failed)
      case .ready:
        list
      }
    }
    .background { theme.bg.ignoresSafeArea() }
  }

  private var list: some View {
    ScrollView(.vertical) {
      LazyVStack(alignment: .leading, spacing: 18) {
        if !content.lede.isEmpty {
          Text(content.lede)
            .kText(.system(14, lineHeight: 20.0 / 14.0))
            .foregroundStyle(theme.sub)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.bottom, 2)
        }
        ForEach(content.cards) { card in
          KMyKindredCardView(theme: theme, card: card) {
            actions.onOpen(card.id)
          }
        }
      }
      .padding(.leading, 16)
      // the cards' shadow stays inside the gutter
      .padding(.trailing, 16 + KObjectDepth.offset)
      .padding(.top, 6)
    }
    .scrollIndicators(.hidden)
    .contentMargins(.bottom, bottomInset, for: .scrollContent)
  }

  /// the empty and failed states: her, and one line, in the middle of the page
  private func note(_ line: String) -> some View {
    VStack(spacing: 18) {
      KImage(content.bird, size: CGSize(width: 64, height: 64), contentMode: .fit, placeholder: .clear)
        .accessibilityHidden(true)
      Text(line)
        .kText(.system(16, lineHeight: 23.0 / 16.0))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: 320)
    .padding(.horizontal, 32)
    .padding(.bottom, bottomInset)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

/// One kindred: the ceremony's signed card, as an address-book entry.
struct KMyKindredCardView: View {
  static var face: CGFloat { 56 }
  static var radius: CGFloat { 20 }

  let theme: KTheme
  let card: KMyKindredCard
  let onTap: () -> Void

  @Environment(\.dynamicTypeSize) private var typeSize
  @ScaledMetric(relativeTo: .caption) private var badgeText: CGFloat = 12

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: Self.radius, style: .circular)
    SwiftUI.Button(action: onTap) {
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .center, spacing: 14) {
          KFace(theme: theme, source: card.face, size: Self.face, ground: theme.sf, stamp: card.stamp)
          VStack(alignment: .leading, spacing: 9) {
            nameLine
            HStack(alignment: .center, spacing: 8) {
              if !card.since.isEmpty {
                KKindredSinceChip(text: card.since)
              }
              Spacer(minLength: 0)
              if !card.badge.isEmpty {
                badge
              }
            }
          }
        }
        if !card.preview.isEmpty {
          (Text(verbatim: card.youPrefix).foregroundColor(theme.ink) + Text(verbatim: card.preview).foregroundColor(theme.sub))
            .kText(.system(14, lineHeight: 19.0 / 14.0))
            .lineLimit(typeSize.isAccessibilitySize ? 4 : 2)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(RoundedRectangle(cornerRadius: 12, style: .circular).fill(theme.soft))
            .padding(.top, 14)
        }
      }
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(shape.fill(theme.sf))
      .kObjectDepth(shape, theme: theme)
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(card.a11y)
    .accessibilityAddTraits(.isButton)
  }

  @ViewBuilder
  private var nameLine: some View {
    let name = Text(card.name)
      .kText(.system(19, .semibold, tracking: -0.3 / 19))
      .foregroundStyle(theme.ink)
    let when = Text(card.when)
      .kText(.mono(11, .medium))
      .foregroundStyle(theme.mute)
      .lineLimit(1)
      .fixedSize()
    if typeSize.isAccessibilitySize {
      VStack(alignment: .leading, spacing: 4) {
        name.lineLimit(3)
        if !card.when.isEmpty { when }
      }
    } else {
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        name.lineLimit(1).truncationMode(.tail)
        Spacer(minLength: 0)
        if !card.when.isEmpty { when }
      }
    }
  }

  /// the Kindreds tab's number: ind, the page colour on it, 20 high
  private var badge: some View {
    Text(verbatim: card.badge)
      .font(.system(size: badgeText, weight: .semibold, design: .monospaced))
      .foregroundStyle(theme.bg)
      .lineLimit(1)
      .padding(.horizontal, 6)
      .frame(minWidth: 20, minHeight: 20)
      .background(Capsule().fill(theme.ind))
      .fixedSize()
  }
}

/// KINDREDS · SEP 18: the chip the ceremony slaps under the two of you (KIntroRitual's chip, at
/// the tilt it settles at): green on the paper white with its green edge, in every theme, as the
/// ceremony's stickers keep their print colours.
struct KKindredSinceChip: View {
  let text: String

  var body: some View {
    Text(text)
      .kText(.mono(9, .semibold, tracking: 1.4 / 9))
      .foregroundStyle(KBrand.greenText)
      .lineLimit(1)
      .fixedSize()
      .padding(.horizontal, 10.5)
      .padding(.vertical, 4.5)
      .background(Capsule().fill(KBrand.paperWhite))
      .overlay(Capsule().strokeBorder(KBrand.greenText, lineWidth: 1.5))
      .rotationEffect(.degrees(2))
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      .accessibilityHidden(true)
  }
}
