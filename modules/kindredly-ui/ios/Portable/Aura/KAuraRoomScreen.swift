// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE WRITING AURA ROOM (/aura, owner decision 2026-10-26: ships in 1.0.7). The React Native page
 (src/app/aura.tsx AuraRN) drawn in SwiftUI, word for word: every string, count and sentence
 comes in from TS (src/screens/aura/aura-model.ts buildAuraRoom); this view keeps only the
 gesture's state (the lens showing, the page of the nine, the word picked, which sheet is open)
 and reports taps.

 - THE TOP: the secondary page's bar (KBackBar: ‹, "Writing Aura" centred), the share key at its
   right in the pen colour; under it the three lenses (PORTRAIT / DIMENSIONS / HABITS) on a lav
   track, the one showing on sf, one line each at every text size.
 - PORTRAIT: the same Aura card Me shows (KAuraCard, rule B), its art a React Native island. Its
   top opens DIMENSIONS; its call to action writes a letter on the first rungs and opens
   DIMENSIONS after; its share key, like the bar's, opens the share card.
 - DIMENSIONS: "DIMENSION n OF 9" and "All dimensions ▦"; the nine cards, one page each, paged
   sideways down to the controls; ‹ "swipe" › and the dots. A card: the number in a lav2 tab and
   the dimension's name in ind, what she found (or "no lean yet" / "still reading"), its line and
   count, the state in mono (green once established), your sentence in the Letter font on soft2
   with where it came from, and "See the read ↗", which opens the read sheet: the whole piece
   with the words the rule fired on marked, and what the sticker says it means. The grid sheet
   jumps to any of the nine.
 - HABITS: FROM n PIECES and the scope door; the words you lean on (tap one for the sentence it
   came from), how you pause, the stickers without a seat, the counted ones by group (a lock on
   the private ones), and the scope row, which opens the scope sheet (letters always in, sealed
   pages if you tick them; Done reports the choice, TS saves it and reads the aura again).

 NO PURPLE GROUNDS (owner, 2026-11-11, on the simulator: "切换那里怎么还是紫色的" then "换掉"). The
 lens switch is Me's control, and every block that sat on lav or lav2 — the sentence a word came
 from, the pauses' tracks, the note under the nine, a dimension's number, your sentence — sits on
 soft2, the theme's neutral. The grid's tile for the dimension on show is ringed in the pen
 colour (as the look she wears is on Me) instead of being filled with lav.

 VISUAL RULE B (owner, 2026-10-26): the controls are flat, no ink outline and no hard shadow:
 a primary is a pen capsule (the scope sheet's Done), a secondary a soft-filled one (‹ › and the
 grid's tiles). The Aura card is the object (KAuraCard: no edge, kObjectDepth). The dimension
 and habit cards keep the React Native page's soft shadow, and in Midnight its 1pt line edge
 (the soft shadow can't be seen on a near-black page).

 Dynamic Type: everything scales; a dimension card that outgrows its page scrolls inside it; the
 lenses and the bar stop at their own caps. VoiceOver: the lenses are buttons with the selected
 trait; a card reads top to bottom; the dots are hidden; the sheets are native sheets (a scrub
 closes them). Reduce Motion: the pager jumps instead of sliding.
 */

// MARK: - Content

/// One sticker, drawn as the React Native StickerChip: its dimension's ink, a white cut edge, a
/// tilt, its name. TS works out every colour (sticker-copy stickerLook).
public struct KAuraSticker: Identifiable, Equatable, Sendable {
  public let id: String
  public let name: String
  /// the face, the name's colour and the edge, "#RRGGBB"
  public let bg: String
  public let fg: String
  public let border: String
  /// a pill (true) or a tag with corners of 8
  public let pill: Bool
  /// degrees, clockwise
  public let tilt: Double
  /// still trying on: a dashed ink outline on white, no fill
  public let trying: Bool

  public init(id: String, name: String, bg: String, fg: String, border: String, pill: Bool, tilt: Double, trying: Bool) {
    self.id = id
    self.name = name
    self.bg = bg
    self.fg = fg
    self.border = border
    self.pill = pill
    self.tilt = tilt
    self.trying = trying
  }
}

/// The read sheet: the whole piece split round the marked words, and the sticker's words.
public struct KAuraReading: Equatable, Sendable {
  public var before = ""
  public var marked = ""
  public var after = ""
  /// "From a letter, Oct 12"
  public var from = ""
  public var name = ""
  public var line = ""

  public init() {}
}

/// One of the nine.
public struct KAuraDim: Identifiable, Equatable, Sendable {
  public let id: String
  /// "01"
  public let number: String
  /// the dimension's name ("Sentences")
  public let label: String
  /// "DIMENSION 1 OF 9"
  public let counter: String
  /// what she found, or "No lean yet" / "Still reading"
  public let name: String
  /// the sticker's line and count, or the state's sentence
  public let line: String
  /// ESTABLISHED / EMERGING; "" for none
  public let state: String
  public let established: Bool
  /// your sentence, "" for none
  public let quote: String
  /// "From a letter, Oct 12"
  public let quoteFrom: String
  /// the most lines the quote takes in the reader's Letter font (letterFitLines)
  public let quoteLines: Int
  /// the read sheet behind "See the read ↗"; nil = no door
  public let reading: KAuraReading?

  public init(id: String, number: String, label: String, counter: String, name: String, line: String, state: String, established: Bool, quote: String, quoteFrom: String, quoteLines: Int, reading: KAuraReading?) {
    self.id = id
    self.number = number
    self.label = label
    self.counter = counter
    self.name = name
    self.line = line
    self.state = state
    self.established = established
    self.quote = quote
    self.quoteFrom = quoteFrom
    self.quoteLines = quoteLines
    self.reading = reading
  }
}

/// A word you lean on.
public struct KAuraWord: Identifiable, Equatable, Sendable {
  public var id: String { word }
  public let word: String
  public let count: Int
  /// 0: the first two (24), 1: the next two (20), 2: the rest (17)
  public let tier: Int
  /// every other word is the aura green, the rest ind
  public let green: Bool
  /// the first sentence of yours it appears in; "" for none
  public let hit: String

  public init(word: String, count: Int, tier: Int, green: Bool, hit: String) {
    self.word = word
    self.count = count
    self.tier = tier
    self.green = green
    self.hit = hit
  }
}

/// One way you pause.
public struct KAuraPause: Identifiable, Equatable, Sendable {
  public var id: String { label }
  /// the mark itself (",", "—", "…")
  public let label: String
  public let count: Int
  /// count over the most counted, 0…1
  public let fraction: Double

  public init(label: String, count: Int, fraction: Double) {
    self.label = label
    self.count = count
    self.fraction = fraction
  }
}

/// A sticker and what it counted.
public struct KAuraUsageItem: Identifiable, Equatable, Sendable {
  public var id: String { sticker.id }
  public let sticker: KAuraSticker
  public let line: String
  /// "PRIVATE" for one that never leaves the phone; "" otherwise
  public let privateLabel: String

  public init(sticker: KAuraSticker, line: String, privateLabel: String) {
    self.sticker = sticker
    self.line = line
    self.privateLabel = privateLabel
  }
}

/// The counted stickers of one group.
public struct KAuraUsageGroup: Identifiable, Equatable, Sendable {
  public let id: String
  public let label: String
  public let items: [KAuraUsageItem]

  public init(id: String, label: String, items: [KAuraUsageItem]) {
    self.id = id
    self.label = label
    self.items = items
  }
}

/// The three lenses.
public enum KAuraLens: String, CaseIterable, Sendable {
  case portrait
  case dims
  case habits
}

/// Everything the room shows, already in the reader's language.
public struct KAuraRoomContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  public var shareLabel = ""
  /// portrait, dims, habits: the lenses' names
  public var tabs: [String] = []
  /// false until the first read lands: the lenses and nothing under them (the card's skeleton
  /// on PORTRAIT)
  public var ready = false

  // PORTRAIT
  public var card: KMeAura?
  /// the card's call to action opens DIMENSIONS (true) or writes a letter (false)
  public var ctaOpensRoom = false

  // DIMENSIONS
  public var dims: [KAuraDim] = []
  public var allDims = ""
  public var swipe = ""
  public var prevLabel = ""
  public var nextLabel = ""
  public var seeRead = ""
  public var readTitle = ""
  public var nine = ""
  public var nineSub = ""
  public var closeLabel = ""

  // HABITS
  public var fromPieces = ""
  public var scope = ""
  public var wordsTitle = ""
  public var words: [KAuraWord] = []
  public var wordsNone = ""
  public var wordsHint = ""
  public var pausesTitle = ""
  public var pauses: [KAuraPause] = []
  public var pausesHint = ""
  public var extrasLabel = ""
  public var extras: [KAuraUsageItem] = []
  public var groups: [KAuraUsageGroup] = []
  /// shown when nothing was counted: the habit group's label and the line
  public var usageNoneLabel = ""
  public var usageNone = ""
  public var scopeRow = ""

  // the scope sheet
  public var scopeTitle = ""
  public var scopeLetters = ""
  public var scopeLettersSub = ""
  public var included = ""
  public var scopeSealed = ""
  public var scopeSealedSub = ""
  public var scopeNote = ""
  public var done = ""
  /// sealed pages are in scope now
  public var sealedOn = false

  public init() {}
}

/// Where the room's taps go. One object for the life of the surface.
public final class KAuraRoomActions {
  public var onBack: () -> Void = {}
  /// the bar's share key or the card's: the share card
  public var onShare: () -> Void = {}
  /// the card's call to action on the first rungs
  public var onWrite: () -> Void = {}
  /// the scope sheet's Done: sealed pages in (true) or out
  public var onScope: (Bool) -> Void = { _ in }

  public init() {}
}

// MARK: - The screen

public struct KAuraRoomScreen<Art: View>: View {
  private let theme: KTheme
  private let content: KAuraRoomContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KAuraRoomActions
  private let art: Art

  @State private var lens: KAuraLens
  @State private var page: Int? = 0
  @State private var word: String?
  @State private var reading: KAuraReadingItem?
  @State private var gridOpen = false
  @State private var scopeOpen = false
  @State private var sealedDraft = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  public init(theme: KTheme, content: KAuraRoomContent, initialLens: KAuraLens = .portrait, topInset: CGFloat, bottomInset: CGFloat, actions: KAuraRoomActions, @ViewBuilder art: () -> Art) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
    self.art = art()
    _lens = State(initialValue: initialLens)
  }

  private var greenOn: Color { theme.isDark ? Color(hex: "#7CC58F") : KBrand.greenText }

  public var body: some View {
    VStack(spacing: 0) {
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, trailing: {
        SwiftUI.Button(action: actions.onShare) {
          Image(systemName: "square.and.arrow.up")
            .font(.system(size: 19, weight: .medium))
            .foregroundStyle(theme.ind)
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityLabel(content.shareLabel)
        .padding(.trailing, -5)
      }, onBack: actions.onBack)
      .padding(.top, topInset)
      lenses
        .padding(.horizontal, 22)
        .padding(.top, 8)
      Group {
        switch lens {
        case .portrait: portrait
        case .dims: dimensions
        case .habits: habits
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
    .background(theme.bg.ignoresSafeArea())
    .sheet(item: $reading) { item in
      roomSheet(title: content.readTitle, close: { reading = nil }) { readBody(item.reading) }
    }
    .sheet(isPresented: $gridOpen) {
      roomSheet(title: content.nine, close: { gridOpen = false }) { gridBody }
    }
    .sheet(isPresented: $scopeOpen) {
      roomSheet(title: content.scopeTitle, close: { scopeOpen = false }) { scopeBody }
    }
  }

  /// The card's taps, routed to the room (KAuraCard takes Me's actions). Made with the body, so
  /// the call to action reads this render's content.
  private var cardActions: KMeActions {
    let a = KMeActions()
    let opensRoom = content.ctaOpensRoom
    let room = actions
    a.onAuraOpen = { show(.dims) }
    a.onAuraShare = { room.onShare() }
    a.onAuraCta = {
      if opensRoom { show(.dims) } else { room.onWrite() }
    }
    return a
  }

  private func show(_ l: KAuraLens) {
    withAnimation(reduceMotion ? nil : KMotion.press) { lens = l }
  }

  // MARK: lenses

  /// Portrait / Dimensions / Habits: Me's own segmented control (KMeSegmented: a soft grey track,
  /// the chosen part a raised white pill that slides), not a track of its own. It had one, filled
  /// with lav, from before Me's control was settled (owner, 2026-11-11: "切换那里怎么还是紫色的").
  private var lenses: some View {
    let all = KAuraLens.allCases
    let labels = all.enumerated().map { i, l in i < content.tabs.count ? content.tabs[i] : l.rawValue }
    let selection = Binding<Int>(
      get: { all.firstIndex(of: lens) ?? 0 },
      set: { i in
        if all.indices.contains(i) { show(all[i]) }
      }
    )
    return KMeSegmented(theme: theme, labels: labels, selection: selection)
      // one line per lens at every size (the React Native page's a11y pass: AX sizes broke words)
      .dynamicTypeSize(...DynamicTypeSize.accessibility2)
      .accessibilityElement(children: .contain)
      .accessibilityAddTraits(.isTabBar)
  }

  // MARK: PORTRAIT

  @ViewBuilder
  private var portrait: some View {
    ScrollView(.vertical) {
      Group {
        if content.ready, let card = content.card {
          KAuraCard(theme: theme, aura: card, actions: cardActions) { art }
        } else {
          KAuraSkeleton(theme: theme)
        }
      }
      .padding(.horizontal, 16)
      .padding(.top, 16)
      .padding(.bottom, bottomInset + 40)
    }
    .scrollIndicators(.hidden)
  }

  // MARK: DIMENSIONS

  private var index: Int { min(max(page ?? 0, 0), max(content.dims.count - 1, 0)) }

  private func go(_ i: Int) {
    let to = min(max(i, 0), max(content.dims.count - 1, 0))
    withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.3)) { page = to }
  }

  @ViewBuilder
  private var dimensions: some View {
    if content.ready && !content.dims.isEmpty {
      VStack(spacing: 0) {
        HStack(alignment: .center) {
          Text(content.dims[index].counter)
            .kText(.mono(10.5, .medium, tracking: 0.14))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Spacer(minLength: 8)
          SwiftUI.Button {
            gridOpen = true
          } label: {
            HStack(spacing: 7) {
              Text(content.allDims)
                .kText(.system(13, .semibold))
                .foregroundStyle(theme.ind)
              KLineIcon(.grid, size: 18, lineWidth: 1.9, color: theme.ind)
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
        }
        .padding(.horizontal, 22)
        .padding(.top, 4)
        pager
        controls
          .padding(.horizontal, 22)
          .padding(.top, 8)
        dots
          .padding(.top, 14)
          .padding(.bottom, max(bottomInset, 18))
      }
    }
  }

  private var pager: some View {
    GeometryReader { geo in
      let pageW = max(0, geo.size.width - 44)
      ScrollView(.horizontal) {
        LazyHStack(spacing: 0) {
          // identified by position: the pager's scroll position is the page's index
          ForEach(content.dims.indices, id: \.self) { i in
            let d = content.dims[i]
            KAuraDimCard(theme: theme, dim: d, greenOn: greenOn, seeRead: content.seeRead) {
              if let r = d.reading { reading = KAuraReadingItem(id: d.id, reading: r) }
            }
            .frame(width: pageW)
            // room for the soft shadow inside the pager's clip
            .padding(.vertical, 12)
            .frame(height: geo.size.height)
          }
        }
        .scrollTargetLayout()
      }
      .scrollTargetBehavior(.viewAligned)
      .safeAreaPadding(.horizontal, 22)
      .scrollPosition(id: $page)
      .scrollIndicators(.hidden)
    }
  }

  private var controls: some View {
    HStack(alignment: .center) {
      roundKey(.chevronLeft, label: content.prevLabel, enabled: index > 0) { go(index - 1) }
      Spacer(minLength: 8)
      Text(content.swipe)
        .kText(.system(12))
        .foregroundStyle(theme.mute)
        .multilineTextAlignment(.center)
      Spacer(minLength: 8)
      roundKey(.chevronRight, label: content.nextLabel, enabled: index < content.dims.count - 1) { go(index + 1) }
    }
  }

  /// ‹ and ›: soft-filled discs (rule B), dimmed at either end
  private func roundKey(_ glyph: KLineGlyph, label: String, enabled: Bool, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      KLineIcon(glyph, size: 16, lineWidth: 2.4, color: theme.ink)
        .frame(width: 40, height: 40)
        .background(Circle().fill(theme.soft2))
        .padding(2)
        .contentShape(Circle())
    }
    .buttonStyle(KFadePressStyle())
    .disabled(!enabled)
    .opacity(enabled ? 1 : 0.35)
    .accessibilityLabel(label)
  }

  private var dots: some View {
    HStack(spacing: 6) {
      ForEach(Array(content.dims.indices), id: \.self) { i in
        Capsule(style: .circular)
          .fill(i == index ? theme.ind : theme.faint)
          .frame(width: i == index ? 14 : 5, height: 5)
      }
    }
    .animation(reduceMotion ? nil : KMotion.press, value: index)
    .accessibilityHidden(true)
  }

  // MARK: HABITS

  @ViewBuilder
  private var habits: some View {
    if content.ready {
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: 12) {
          HStack(alignment: .center) {
            Text(content.fromPieces)
              .kText(.mono(10.5, .medium, tracking: 0.14))
              .foregroundStyle(theme.mute)
            Spacer(minLength: 8)
            SwiftUI.Button(action: openScope) {
              HStack(spacing: 6) {
                Text(content.scope)
                  .kText(.system(12.5))
                  .foregroundStyle(theme.ind)
                Text("≡")
                  .kText(.mono(13, .medium))
                  .foregroundStyle(theme.ind)
                  .accessibilityHidden(true)
              }
              .frame(minHeight: 44)
              .contentShape(Rectangle())
            }
            .buttonStyle(KFadePressStyle())
          }
          wordsCard
          pausesCard
          if !content.extras.isEmpty {
            habitCard {
              Text(content.extrasLabel)
                .kText(.mono(10.5, .medium, tracking: 0.14))
                .foregroundStyle(theme.mute)
                .accessibilityAddTraits(.isHeader)
              VStack(alignment: .leading, spacing: 14) {
                ForEach(Array(content.extras.enumerated()), id: \.element.id) { _, u in
                  usageRow(u)
                }
              }
              .padding(.top, 2)
            }
          }
          if content.groups.isEmpty {
            habitCard {
              Text(content.usageNoneLabel)
                .kText(.mono(10.5, .medium, tracking: 0.14))
                .foregroundStyle(theme.mute)
                .accessibilityAddTraits(.isHeader)
              Text(content.usageNone)
                .kText(.system(13.5))
                .foregroundStyle(theme.sub)
                .fixedSize(horizontal: false, vertical: true)
            }
          } else {
            ForEach(content.groups) { g in
              habitCard {
                Text(g.label)
                  .kText(.mono(10.5, .medium, tracking: 0.14))
                  .foregroundStyle(theme.mute)
                  .accessibilityAddTraits(.isHeader)
                VStack(alignment: .leading, spacing: 14) {
                  ForEach(g.items) { u in usageRow(u) }
                }
                .padding(.top, 2)
              }
            }
          }
          scopeDoor
        }
        .padding(.horizontal, 22)
        .padding(.top, 8)
        .padding(.bottom, bottomInset + 40)
      }
      .scrollIndicators(.hidden)
    }
  }

  private func openScope() {
    sealedDraft = content.sealedOn
    scopeOpen = true
  }

  private var wordsCard: some View {
    habitCard {
      Text(content.wordsTitle)
        .kText(.system(21, .bold))
        .foregroundStyle(theme.ink)
        .accessibilityAddTraits(.isHeader)
      if content.words.isEmpty {
        Text(content.wordsNone)
          .kText(.system(13.5))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
      } else {
        KAuraCenteredFlow(spacing: 16, lineSpacing: 8) {
          ForEach(Array(content.words.enumerated()), id: \.element.id) { _, w in
            wordKey(w)
          }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 4)
        if let picked = word, let hit = content.words.first(where: { $0.word == picked })?.hit, !hit.isEmpty {
          Text("“\(hit)”")
            .kText(.content(15.5, lineHeight: 23.0 / 15.5))
            .foregroundStyle(theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: 10, style: .circular).fill(theme.soft2))
            .transition(.opacity)
        }
      }
      Text(content.wordsHint)
        .kText(.system(12))
        .foregroundStyle(theme.mute)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  private func wordKey(_ w: KAuraWord) -> some View {
    let on = word == w.word
    let size: CGFloat = w.tier == 0 ? 24 : w.tier == 1 ? 20 : 17
    return SwiftUI.Button {
      withAnimation(reduceMotion ? nil : KMotion.press) { word = on ? nil : w.word }
    } label: {
      HStack(alignment: .top, spacing: 2) {
        Text(w.word)
          .kText(.content(size))
          .foregroundStyle(on ? theme.ind : w.green ? greenOn : theme.ind)
          .underline(on, color: theme.ind)
        Text("\(w.count)")
          .kText(.mono(9.5, .medium))
          .foregroundStyle(theme.mute)
      }
      .frame(minHeight: 30)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(w.word), \(w.count)")
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : [.isButton])
  }

  private var pausesCard: some View {
    let maxCount = max(1, content.pauses.map(\.count).max() ?? 1)
    return habitCard {
      Text(content.pausesTitle)
        .kText(.system(21, .bold))
        .foregroundStyle(theme.ink)
        .accessibilityAddTraits(.isHeader)
      VStack(spacing: 12) {
        ForEach(Array(content.pauses.enumerated()), id: \.element.id) { i, p in
          HStack(spacing: 12) {
            Text(p.label)
              .kText(.mono(12, .regular))
              .foregroundStyle(theme.sub)
              .frame(width: 44, alignment: .leading)
            GeometryReader { g in
              ZStack(alignment: .leading) {
                Capsule(style: .circular).fill(theme.soft2)
                Capsule(style: .circular)
                  .fill(i == 0 ? theme.ind : theme.mute)
                  .frame(width: g.size.width * CGFloat(min(1, max(0, Double(p.count) / Double(maxCount)))))
              }
            }
            .frame(height: 6)
            Text("\(p.count)")
              .kText(.mono(12, .regular))
              .foregroundStyle(theme.sub)
              .frame(minWidth: 28, alignment: .trailing)
          }
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("\(p.label), \(p.count)")
        }
      }
      .padding(.top, 2)
      Text(content.pausesHint)
        .kText(.system(12))
        .foregroundStyle(theme.mute)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  private func usageRow(_ u: KAuraUsageItem) -> some View {
    HStack(alignment: .center, spacing: 12) {
      KAuraStickerChip(sticker: u.sticker)
      VStack(alignment: .leading, spacing: 3) {
        Text(u.line)
          .kText(.system(13, lineHeight: 18.0 / 13))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
        if !u.privateLabel.isEmpty {
          // the app's line padlock, not the colour emoji (2026-10-26: every lock in the app is drawn)
          HStack(spacing: 4) {
            KNotePadlock(filled: false, color: theme.mute)
              .frame(width: 10, height: 10)
            Text(u.privateLabel)
              .kText(.mono(9, .regular, tracking: 0.13))
              .foregroundStyle(theme.mute)
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([u.sticker.name, u.line, u.privateLabel].filter { !$0.isEmpty }.joined(separator: ", "))
  }

  private var scopeDoor: some View {
    SwiftUI.Button(action: openScope) {
      HStack(spacing: 10) {
        KNotePadlock(filled: false, color: theme.sub)
          .frame(width: 16, height: 16)
          .accessibilityHidden(true)
        Text(content.scopeRow)
          .kText(.system(14))
          .foregroundStyle(theme.ink)
          .frame(maxWidth: .infinity, alignment: .leading)
          .fixedSize(horizontal: false, vertical: true)
        KLineIcon(.chevronRight, size: 14, lineWidth: 2.4, color: theme.faint)
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
      .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.sf))
      .overlay {
        if theme.isDark { RoundedRectangle(cornerRadius: 14, style: .circular).strokeBorder(theme.line, lineWidth: 1) }
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(content.scopeRow)
  }

  private func habitCard<C: View>(@ViewBuilder _ inner: () -> C) -> some View {
    VStack(alignment: .leading, spacing: 12) { inner() }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(18)
      .kAuraSoftCard(theme, corner: 16, opacity: 0.05)
  }

  // MARK: sheets

  private func roomSheet<C: View>(title: String, close: @escaping () -> Void, @ViewBuilder _ inner: () -> C) -> some View {
    VStack(spacing: 0) {
      ZStack {
        Text(title)
          .kText(.secondaryTitle)
          .foregroundStyle(theme.ink)
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .padding(.horizontal, 48)
          .accessibilityAddTraits(.isHeader)
        HStack {
          Spacer(minLength: 0)
          SwiftUI.Button(action: close) {
            KLineIcon(.close, size: 20, lineWidth: 2.2, color: theme.mute)
              .frame(width: 44, height: 44)
              .contentShape(Rectangle())
          }
          .buttonStyle(KFloatPressStyle())
          .accessibilityLabel(content.closeLabel)
        }
      }
      .padding(.top, 14)
      .padding(.horizontal, 12)
      ScrollView(.vertical) {
        inner()
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 22)
          .padding(.bottom, 34)
      }
      .scrollBounceBehavior(.basedOnSize)
    }
    .background(theme.sf.ignoresSafeArea())
    .presentationDetents([.medium, .large])
    .presentationDragIndicator(.visible)
    .presentationCornerRadius(22)
  }

  private func readBody(_ r: KAuraReading) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      (Text(r.before) + Text(r.marked).foregroundColor(theme.ind) + Text(r.after))
        .kText(.content(17, lineHeight: 27.0 / 17))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 14)
      Text(r.from)
        .kText(.system(11.5))
        .foregroundStyle(theme.mute)
        .padding(.top, 10)
      VStack(alignment: .leading, spacing: 4) {
        Text(r.name)
          .kText(.system(14, .bold))
          .foregroundStyle(theme.ink)
        Text(r.line)
          .kText(.system(14, lineHeight: 1.5))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
      .background(RoundedRectangle(cornerRadius: 12, style: .circular).fill(theme.soft2))
      .accessibilityElement(children: .combine)
      .padding(.top, 16)
    }
  }

  private var gridBody: some View {
    VStack(alignment: .leading, spacing: 16) {
      Text(content.nineSub)
        .kText(.system(12.5))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 4)
      LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 10) {
        ForEach(Array(content.dims.enumerated()), id: \.element.id) { i, d in
          let on = i == index
          SwiftUI.Button {
            gridOpen = false
            go(i)
          } label: {
            VStack(spacing: 4) {
              Text(d.number)
                .kText(.mono(18, .regular))
                .foregroundStyle(on ? theme.ind : theme.ink)
              Text(d.label)
                .kText(.system(11.5))
                .foregroundStyle(on ? theme.ind : theme.sub)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 4)
            .frame(maxWidth: .infinity)
            .background(RoundedRectangle(cornerRadius: 12, style: .circular).fill(theme.soft2))
            .overlay {
              if on {
                RoundedRectangle(cornerRadius: 12, style: .circular).strokeBorder(theme.ind, lineWidth: 2)
              }
            }
            .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("\(i + 1). \(d.label)")
          .accessibilityAddTraits(on ? [.isButton, .isSelected] : [.isButton])
        }
      }
    }
  }

  private var scopeBody: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center, spacing: 12) {
        VStack(alignment: .leading, spacing: 3) {
          Text(content.scopeLetters)
            .kText(.system(14.5, .semibold))
            .foregroundStyle(theme.ink)
          Text(content.scopeLettersSub)
            .kText(.system(12))
            .foregroundStyle(theme.sub)
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        Text(content.included)
          .kText(.system(12.5))
          .foregroundStyle(theme.mute)
      }
      .padding(.vertical, 16)
      .accessibilityElement(children: .combine)
      Rectangle().fill(theme.line).frame(height: 1)
      SwiftUI.Button {
        sealedDraft.toggle()
      } label: {
        HStack(alignment: .center, spacing: 12) {
          VStack(alignment: .leading, spacing: 3) {
            Text(content.scopeSealed)
              .kText(.system(14.5, .semibold))
              .foregroundStyle(theme.ink)
            Text(content.scopeSealedSub)
              .kText(.system(12))
              .foregroundStyle(theme.sub)
              .fixedSize(horizontal: false, vertical: true)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          ZStack {
            RoundedRectangle(cornerRadius: 5, style: .circular)
              .fill(sealedDraft ? theme.ind : Color.clear)
            if sealedDraft {
              KLineIcon(.check, size: 14, lineWidth: 3, color: theme.bg)
            } else {
              RoundedRectangle(cornerRadius: 5, style: .circular).strokeBorder(theme.faint, lineWidth: 1.5)
            }
          }
          .frame(width: 22, height: 22)
          .accessibilityHidden(true)
        }
        .padding(.vertical, 16)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityElement(children: .combine)
      .accessibilityAddTraits(sealedDraft ? [.isToggle, .isSelected] : [.isToggle])
      Rectangle().fill(theme.line).frame(height: 1)
      Text(content.scopeNote)
        .kText(.system(12, lineHeight: 1.5))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 14)
      SwiftUI.Button {
        let sealed = sealedDraft
        scopeOpen = false
        actions.onScope(sealed)
      } label: {
        Text(content.done)
          .kText(.button)
          .foregroundStyle(theme.bg)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 15)
          .background(Capsule(style: .circular).fill(theme.ind))
          .contentShape(Capsule(style: .circular))
      }
      .buttonStyle(KFadePressStyle())
      .padding(.top, 18)
    }
  }
}

/// The read sheet's item (sheet(item:) wants an Identifiable).
struct KAuraReadingItem: Identifiable {
  let id: String
  let reading: KAuraReading
}

// MARK: - A dimension card

struct KAuraDimCard: View {
  let theme: KTheme
  let dim: KAuraDim
  let greenOn: Color
  let seeRead: String
  let onRead: () -> Void

  var body: some View {
    ViewThatFits(in: .vertical) {
      inside(fill: true)
      ScrollView(.vertical) { inside(fill: false) }
        .scrollIndicators(.hidden)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .kAuraSoftCard(theme, corner: 18, opacity: 0.07)
  }

  private func inside(fill: Bool) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 8) {
        Text(dim.number)
          .kText(.mono(11, .regular))
          .foregroundStyle(theme.ind)
          .padding(.horizontal, 7)
          .padding(.vertical, 3)
          .background(RoundedRectangle(cornerRadius: 6, style: .circular).fill(theme.soft2))
        Text(dim.label)
          .kText(.system(12.5))
          .foregroundStyle(theme.ind)
      }
      .accessibilityElement(children: .combine)
      Text(dim.name)
        .kText(.system(26, .bold, lineHeight: 32.0 / 26))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 14)
        .accessibilityAddTraits(.isHeader)
      Text(dim.line)
        .kText(.system(14, lineHeight: 1.5))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 10)
      if !dim.state.isEmpty {
        Text(dim.state)
          .kText(.mono(9.5, .regular, tracking: 0.13))
          .foregroundStyle(dim.established ? greenOn : theme.mute)
          .padding(.top, 8)
      }
      if !dim.quote.isEmpty {
        VStack(alignment: .leading, spacing: 8) {
          Text("“\(dim.quote)”")
            .kText(.content(17, lineHeight: 25.0 / 17))
            .foregroundStyle(theme.ink)
            .lineLimit(fill ? max(1, dim.quoteLines) : nil)
            .fixedSize(horizontal: false, vertical: true)
          Text(dim.quoteFrom)
            .kText(.system(11.5))
            .foregroundStyle(theme.mute)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: 12, style: .circular).fill(theme.soft2))
        .accessibilityElement(children: .combine)
        .padding(.top, 16)
      }
      if fill { Spacer(minLength: 0) }
      if dim.reading != nil {
        SwiftUI.Button(action: onRead) {
          HStack {
            Text(seeRead)
              .kText(.system(13))
              .foregroundStyle(theme.ind)
            Spacer(minLength: 8)
            Text("↗")
              .kText(.system(15))
              .foregroundStyle(theme.ind)
              .accessibilityHidden(true)
          }
          .frame(minHeight: 44)
          .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityLabel(seeRead)
        .padding(.top, 8)
      }
    }
    .padding(.horizontal, 20)
    .padding(.top, 18)
    .padding(.bottom, dim.reading != nil ? 6 : 18)
    .frame(maxWidth: .infinity, maxHeight: fill ? .infinity : nil, alignment: .topLeading)
  }
}

// MARK: - Pieces

extension View {
  /// The React Native room's cards: sf, round corners, its soft navy shadow; in Midnight a 1pt
  /// line edge too (the shadow can't be seen on the near-black page).
  func kAuraSoftCard(_ theme: KTheme, corner: CGFloat, opacity: Double) -> some View {
    let shape = RoundedRectangle(cornerRadius: corner, style: .circular)
    return background {
      shape
        .fill(theme.sf)
        .shadow(color: Color(hex: "#1E1B35").opacity(opacity), radius: 12, x: 0, y: 8)
    }
    .overlay {
      if theme.isDark { shape.strokeBorder(theme.line, lineWidth: 1) }
    }
  }
}

/// A sticker (React Native StickerChip): the white cut edge 3 round its face, its dimension's
/// colour, a little tilt and a soft shadow; dashed while still trying on. An object: the same
/// colours in every theme.
public struct KAuraStickerChip: View {
  private let sticker: KAuraSticker
  private let large: Bool

  public init(sticker: KAuraSticker, large: Bool = false) {
    self.sticker = sticker
    self.large = large
  }

  public var body: some View {
    let inner: CGFloat = sticker.pill ? 999 : 8
    let outer: CGFloat = sticker.pill ? 999 : 11
    let ink = Color(hex: "#1E1B35")
    Text(sticker.name)
      .kText(.system(large ? 13.5 : 12.5, .bold))
      .foregroundStyle(sticker.trying ? ink : Color(hex: sticker.fg))
      .lineLimit(1)
      .padding(.horizontal, large ? 13 : 10)
      .padding(.vertical, large ? 6 : 4)
      .background {
        RoundedRectangle(cornerRadius: inner, style: .circular)
          .fill(sticker.trying ? Color.white : Color(hex: sticker.bg))
      }
      .overlay {
        RoundedRectangle(cornerRadius: inner, style: .circular)
          .strokeBorder(sticker.trying ? ink : Color(hex: sticker.border), style: StrokeStyle(lineWidth: 2, dash: sticker.trying ? [4, 3] : []))
      }
      .padding(3)
      .background {
        RoundedRectangle(cornerRadius: outer, style: .circular)
          .fill(Color.white)
          .shadow(color: ink.opacity(0.18), radius: 5, x: 0, y: 4)
      }
      .rotationEffect(.degrees(sticker.tilt))
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(sticker.name)
  }
}

/// Rows of children, each row centred, wrapping when the next one doesn't fit (the words you
/// lean on: CSS flex-wrap with justify-content centre and a gap). Children sit on their rows'
/// bottoms, near enough to the React Native page's baseline for words of three sizes.
public struct KAuraCenteredFlow: Layout {
  private let spacing: CGFloat
  private let lineSpacing: CGFloat

  public init(spacing: CGFloat = 16, lineSpacing: CGFloat = 8) {
    self.spacing = spacing
    self.lineSpacing = lineSpacing
  }

  private func rows(_ width: CGFloat, _ subviews: Subviews) -> [[(Int, CGSize)]] {
    var out: [[(Int, CGSize)]] = [[]]
    var x: CGFloat = 0
    for (i, v) in subviews.enumerated() {
      let s = v.sizeThatFits(ProposedViewSize(width: width, height: nil))
      if x > 0 && x + s.width > width {
        out.append([])
        x = 0
      }
      out[out.count - 1].append((i, s))
      x += s.width + spacing
    }
    return out
  }

  public func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? .infinity
    let rs = rows(width, subviews)
    var h: CGFloat = 0
    var widest: CGFloat = 0
    for (n, r) in rs.enumerated() {
      let rowH = r.map(\.1.height).max() ?? 0
      let rowW = r.map(\.1.width).reduce(0, +) + spacing * CGFloat(max(0, r.count - 1))
      widest = max(widest, rowW)
      h += rowH + (n > 0 ? lineSpacing : 0)
    }
    return CGSize(width: proposal.width ?? widest, height: h)
  }

  public func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for r in rows(bounds.width, subviews) {
      let rowH = r.map(\.1.height).max() ?? 0
      let rowW = r.map(\.1.width).reduce(0, +) + spacing * CGFloat(max(0, r.count - 1))
      var x = bounds.minX + max(0, (bounds.width - rowW) / 2)
      for (i, s) in r {
        subviews[i].place(at: CGPoint(x: x, y: y + rowH - s.height), anchor: .topLeading, proposal: ProposedViewSize(s))
        x += s.width + spacing
      }
      y += rowH + lineSpacing
    }
  }
}
