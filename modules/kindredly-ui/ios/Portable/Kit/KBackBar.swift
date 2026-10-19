// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SECONDARY-PAGE HEADER (H:90), for every pushed page: Edit profile, Settings, and the pages
 under them. No rule under it.
 - the back chevron (‹, M15 6l-7 6 7 6) 18 across at stroke 2.2 in ink, in a 36 box 12 from the
   left edge, with a 44 target; VoiceOver calls it backLabel;
 - the title centred, in mono 600 at .16em in capitals (the mock's 12; KMonoSizes, owner
   question 2: 11), one line, shrinking to .7 before it would run into the chevron; it is the
   page's header for VoiceOver;
 - an optional trailing view 12 from the right edge (a Done, a count). The title keeps the
   same room at both ends, so it stays centred on the screen; keep the trailing view within
   the chevron's 44 or it reaches into the title's room;
 - 52 tall where it is sticky (Edit profile: it stays at the top as the page scrolls under it,
   on the page colour so nothing shows through), 44 where it scrolls away with the page
   (Settings). Pinning it is the screen's business (a pinned section header, or an overlay);
   sticky only paints its ground.

 It takes the full width it is offered, as the mock's bar runs edge to edge (margin 0 -16).
 */
public struct KBackBar<Trailing: View>: View {
  /// the heights the mock draws: the sticky bar (H:90) and the one that scrolls away (H:97)
  public static var stickyHeight: CGFloat { 52 }
  public static var scrollingHeight: CGFloat { 44 }

  private let theme: KTheme
  private let title: String
  private let backLabel: String
  private let height: CGFloat
  private let sticky: Bool
  private let trailing: Trailing
  private let onBack: () -> Void

  /// - Parameters:
  ///   - title: the page's name, set in capitals
  ///   - backLabel: what VoiceOver calls the chevron, already translated
  ///   - height: 52 (stickyHeight) or 44 (scrollingHeight)
  ///   - sticky: paint the page colour behind it, for a bar the page scrolls under
  ///   - trailing: a view at the right end, or nothing
  ///   - onBack: the chevron was tapped
  public init(
    theme: KTheme,
    title: String,
    backLabel: String,
    height: CGFloat = 52,
    sticky: Bool = true,
    @ViewBuilder trailing: () -> Trailing,
    onBack: @escaping () -> Void
  ) {
    self.theme = theme
    self.title = title
    self.backLabel = backLabel
    self.height = height
    self.sticky = sticky
    self.trailing = trailing()
    self.onBack = onBack
  }

  /// the room each end keeps: 12 from the edge and the chevron's 36 box, and a little air
  private var sideRoom: CGFloat { 12 + 36 + 8 }

  public var body: some View {
    ZStack {
      Text(title)
        .textCase(.uppercase)
        .kText(.monoHeader)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .padding(.horizontal, sideRoom)
        .accessibilityAddTraits(.isHeader)
      HStack(spacing: 0) {
        KBackChevron(theme: theme, label: backLabel, action: onBack)
          .padding(.leading, KBackChevron.leading)
        Spacer(minLength: 0)
        trailing
          .padding(.trailing, 12)
      }
    }
    // every bar puts its row where Settings' 44 bar does (owner, 2026-10-19): a 52 bar keeps its
    // height but centres the chevron and the title in its first 44
    .frame(height: 44)
    .frame(height: height, alignment: .top)
    .frame(maxWidth: .infinity)
    .background(sticky ? theme.bg : Color.clear)
    // the bar is fixed height: its words stop growing at the largest standard size
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }
}

/*
 THE BACK CHEVRON (owner 2026-10-19: every detail page's back icon the size and place of
 Settings'). The one ‹ every pushed Swift page draws, so its metrics live here only:
 KLineIcon(.chevronLeft) (M15 6l-7 6 7 6) 18 across at stroke 2.2 in ink, in a 36 box, inside a
 44 target (padding 4). Put it `KBackChevron.leading` (8) from the screen's left edge, so the
 36 box sits 12 from it, and centre it in the first 52 (sticky) or 44 (scrolling) below the safe
 area. VoiceOver calls it `label`, already translated.
 */
public struct KBackChevron: View {
  /// the 44 target's left edge from the screen's: the 36 box then sits 12 in
  public static var leading: CGFloat { 12 - 4 }
  /// the target's side
  public static var target: CGFloat { 44 }

  private let theme: KTheme
  private let label: String
  private let action: () -> Void

  public init(theme: KTheme, label: String, action: @escaping () -> Void) {
    self.theme = theme
    self.label = label
    self.action = action
  }

  public var body: some View {
    SwiftUI.Button(action: action) {
      KLineIcon(.chevronLeft, size: 18, lineWidth: 2.2, color: theme.ink)
        .frame(width: 36, height: 36)
        // a 44 target around the 36 box
        .padding(4)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(label)
  }
}

public extension KBackBar where Trailing == EmptyView {
  /// A bar with nothing at its right end.
  init(theme: KTheme, title: String, backLabel: String, height: CGFloat = 52, sticky: Bool = true, onBack: @escaping () -> Void) {
    self.init(theme: theme, title: title, backLabel: backLabel, height: height, sticky: sticky, trailing: { EmptyView() }, onBack: onBack)
  }
}

// MARK: - MY LETTERS (Me 4a, Prompt 8)

/*
 MY LETTERS (Me 4a, .claude/me4a/ME4A.md §1.7, §2.4), the route /my-letters drawn in Swift. It
 lives in this file rather than one of its own so the module needs no pod install (ME4A D1);
 KBackBar above is untouched. On the reader's theme, like the React Native page it replaces.
 - THE TOP ROW: ‹ (KBackChevron, Settings' size and place), "My letters" 22/600 and the count 18 in mute, the three-line manage key at
   the right. While managing: Cancel, and "Manage" with every letter and draft counted.
 - THE FILTERS: All / Answered / Quiet / Drafts with their counts, 34 tall, radius 17, 13/600;
   the chosen one ink with the page colour on it, the others the surface with a 1.5 line edge.
   Filtering happens here, on each card's tag.
 - THE GRID: two columns 10 apart. The Write tile (196, radius 18, ind, a 48 ring with +) leads
   the left column (not on Drafts, not while managing); the cards are dealt left and right in
   turn after it, newest first. A letter card is 196 tall (taller only when large type needs
   it): the date and the reads / replies counts with the stamp at the right, the letter in the
   reader's Letter font 16/1.35 over three lines, and the 36 status band pinned to the foot
   (QUIET in mute, ● ANSWERED · n in green, or the replier's 22 face and who replied, in ink). A
   draft is the dashed card.
 - EMPTY: Drafts empty is the 40 pen and the italic line; another empty filter says `none`.
 - MANAGING: the cards rock ±1.4° on a 520ms loop (still under Reduce Motion) and wear a red ×.
   The × only reports the id; TS asks before anything is removed.
 */

public struct KMyLettersFilter: Equatable, Sendable, Identifiable {
  public enum Key: String, Sendable { case all, answered, quiet, drafts }
  public let key: Key
  public let label: String
  public let count: Int
  public var id: String { key.rawValue }
  public init(key: Key, label: String, count: Int) {
    self.key = key
    self.label = label
    self.count = count
  }
}

public struct KMyLettersCard: Equatable, Sendable, Identifiable {
  public enum Kind: String, Sendable { case letter, draft }
  public enum Tag: String, Sendable { case answered, quiet, draft }
  public enum Tone: String, Sendable { case quiet, answered, replied, draft }
  public let id: String
  public let kind: Kind
  public let tag: Tag
  public let date: String
  public let reads: Int
  public let answers: Int
  public let stampId: String
  public let stampHex: String
  public let body: String
  public let tone: Tone
  public let status: String
  public let face: KFaceSource?
  /// the replied face's stamp when they are a member (C2; the small rule at 22); nil for none
  public let stamp: KMemberStamp?
  public let opens: Bool
  public let a11y: String

  public init(id: String, kind: Kind, tag: Tag, date: String, reads: Int, answers: Int, stampId: String, stampHex: String, body: String, tone: Tone, status: String, face: KFaceSource?, stamp: KMemberStamp? = nil, opens: Bool, a11y: String) {
    self.id = id
    self.kind = kind
    self.tag = tag
    self.date = date
    self.reads = reads
    self.answers = answers
    self.stampId = stampId
    self.stampHex = stampHex
    self.body = body
    self.tone = tone
    self.status = status
    self.face = face
    self.stamp = stamp
    self.opens = opens
    self.a11y = a11y
  }
}

public struct KMyLettersContent: Equatable, Sendable {
  public var title = ""
  public var write = ""
  public var manage = ""
  public var cancel = ""
  public var remove = ""
  public var back = ""
  public var none = ""
  public var noDrafts = ""
  public var filters: [KMyLettersFilter] = []
  public var cards: [KMyLettersCard] = []
  public var loaded = false
  public init() {}
}

public final class KMyLettersActions {
  public var onBack: () -> Void = {}
  public var onWrite: () -> Void = {}
  public var onOpen: (String) -> Void = { _ in }
  public var onRemove: (String) -> Void = { _ in }
  public init() {}
}

public struct KMyLettersScreen: View {
  private let theme: KTheme
  private let content: KMyLettersContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KMyLettersActions

  @State private var filter: KMyLettersFilter.Key = .all
  @State private var managing = false
  /// 4a's 196, grown with Dynamic Type so three lines and the band still fit
  @ScaledMetric(relativeTo: .body) private var cardHeight: CGFloat = 196
  @Environment(\.dynamicTypeSize) private var typeSize
  /// the accessibility sizes: one column, each card as tall as its words
  private var oneColumn: Bool { typeSize.isAccessibilitySize }

  public init(theme: KTheme, content: KMyLettersContent, topInset: CGFloat, bottomInset: CGFloat, actions: KMyLettersActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  private func count(_ k: KMyLettersFilter.Key) -> Int {
    content.filters.first { $0.key == k }?.count ?? 0
  }

  private var shown: [KMyLettersCard] {
    content.cards.filter { c in
      switch filter {
      case .all: return c.tag != .draft
      case .drafts: return c.tag == .draft
      case .answered: return c.tag == .answered
      case .quiet: return c.tag == .quiet
      }
    }
  }

  private var writeTile: Bool { !(filter == .drafts || managing) }

  /// the write tile first (left), then the cards dealt left and right in turn
  private var columns: ([KMyLettersCard], [KMyLettersCard]) {
    var l: [KMyLettersCard] = []
    var r: [KMyLettersCard] = []
    let lead = writeTile ? 1 : 0
    for (i, c) in shown.enumerated() {
      if (i + lead) % 2 == 0 { l.append(c) } else { r.append(c) }
    }
    return (l, r)
  }

  public var body: some View {
    VStack(spacing: 0) {
      theme.bg.frame(height: topInset)
      topRow
      chips
      ScrollView(.vertical) {
        grid
          .padding(.horizontal, 16)
          .padding(.top, 14)
          .padding(.bottom, bottomInset + 24)
      }
      .scrollIndicators(.hidden)
    }
    .background(theme.bg.ignoresSafeArea())
  }

  // MARK: top row

  private var topRow: some View {
    HStack(spacing: 12) {
      if managing {
        SwiftUI.Button {
          managing = false
        } label: {
          Text(content.cancel)
            .kText(.system(16))
            .foregroundStyle(theme.ink)
            .padding(.horizontal, 8)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        Spacer(minLength: 0)
        (Text(content.manage).foregroundStyle(theme.ink) + Text("  \(count(.all) + count(.drafts))").foregroundStyle(theme.mute))
          .kText(.system(17, .semibold))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .accessibilityAddTraits(.isHeader)
        Spacer(minLength: 0)
        Color.clear.frame(width: 64, height: 1)
      } else {
        // the app's one back chevron (KBackChevron), 12 from the edge like Settings': the row's
        // 16 gutter less 8 puts its 44 target at KBackChevron.leading
        KBackChevron(theme: theme, label: content.back, action: actions.onBack)
          .padding(.leading, KBackChevron.leading - 16)
        HStack(alignment: .firstTextBaseline, spacing: 8) {
          Text(content.title)
            .kText(.system(22, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text("\(count(.all))")
            .kText(.system(18))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
        Spacer(minLength: 0)
        SwiftUI.Button {
          managing = true
        } label: {
          K4aPathIcon(d: "M4 7h16M4 12h16M4 17h16", size: 22, lineWidth: 2.2, color: theme.ink)
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
        .accessibilityLabel(content.manage)
        .padding(.trailing, -6)
      }
    }
    .padding(.horizontal, 16)
    // the chevron where Settings has it: the row centred in the first 44, 8 below (owner, 2026-10-19)
    .frame(minHeight: 44)
    .padding(.bottom, 8)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  // MARK: filters

  private var chips: some View {
    ScrollView(.horizontal) {
      HStack(spacing: 8) {
        ForEach(content.filters) { f in
          let on = f.key == filter
          SwiftUI.Button {
            filter = f.key
          } label: {
            HStack(spacing: 5) {
              Text(f.label).kText(.system(13, .semibold))
              Text("\(f.count)").kText(.system(13, .medium)).opacity(0.7)
            }
            .foregroundStyle(on ? theme.bg : theme.ink)
            .lineLimit(1)
            .padding(.horizontal, 12)
            .frame(minHeight: 34)
            .background(Capsule().fill(on ? theme.ink : theme.sf))
            .overlay(Capsule().strokeBorder(on ? theme.ink : theme.line, lineWidth: 1.5))
            .contentShape(Capsule())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("\(f.label), \(f.count)")
          .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 2)
    }
    .scrollIndicators(.hidden)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  // MARK: grid

  @ViewBuilder
  private var grid: some View {
    let cards = shown
    if content.loaded, cards.isEmpty, filter == .drafts {
      VStack(spacing: 10) {
        K4aPathIcon(d: "M4 20l4-1 11-11-3-3L5 16l-1 4z M13 8l3 3", size: 40, lineWidth: 1.6, color: theme.faint)
        Text(content.noDrafts)
          .kText(.letter(17, italic: true))
          .foregroundStyle(theme.mute)
          .multilineTextAlignment(.center)
      }
      .frame(maxWidth: .infinity)
      .padding(.top, 26)
      .accessibilityElement(children: .combine)
    } else {
      VStack(spacing: 0) {
        if content.loaded, cards.isEmpty, filter != .all {
          Text(content.none)
            .kText(.system(14))
            .foregroundStyle(theme.mute)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.top, 26)
            .padding(.bottom, 16)
        }
        let cols = columns
        if oneColumn {
          // at the accessibility sizes two columns leave a date no room: one column, in order
          VStack(spacing: 10) {
            if writeTile { write }
            ForEach(Array(cards.enumerated()), id: \.element.id) { i, c in cell(c, seed: i) }
          }
        } else {
        HStack(alignment: .top, spacing: 10) {
          VStack(spacing: 10) {
            if writeTile { write }
            ForEach(Array(cols.0.enumerated()), id: \.element.id) { i, c in cell(c, seed: i * 2) }
          }
          .frame(maxWidth: .infinity, alignment: .top)
          VStack(spacing: 10) {
            ForEach(Array(cols.1.enumerated()), id: \.element.id) { i, c in cell(c, seed: i * 2 + 1) }
          }
          .frame(maxWidth: .infinity, alignment: .top)
        }
        }
      }
    }
  }

  private var write: some View {
    SwiftUI.Button(action: actions.onWrite) {
      VStack(spacing: 12) {
        Circle()
          .strokeBorder(theme.bg.opacity(0.7), lineWidth: 2)
          .frame(width: 48, height: 48)
          .overlay(KLineIcon(.plus, size: 20, lineWidth: 2.2, color: theme.bg))
        Text(content.write)
          .kText(.system(16, .semibold))
          .foregroundStyle(theme.bg)
          .multilineTextAlignment(.center)
      }
      .padding(12)
      .frame(maxWidth: .infinity, minHeight: oneColumn ? 120 : cardHeight)
      .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(theme.ind))
      .contentShape(RoundedRectangle(cornerRadius: 18, style: .circular))
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.write)
    .accessibilityAddTraits(.isButton)
  }

  private func cell(_ c: KMyLettersCard, seed: Int) -> some View {
    KMyLettersJiggle(on: managing, seed: seed) {
      SwiftUI.Button {
        if !managing, c.opens { actions.onOpen(c.id) }
      } label: {
        Group {
          if c.kind == .draft { draftCard(c) } else { letterCard(c) }
        }
        .contentShape(RoundedRectangle(cornerRadius: 18, style: .circular))
      }
      .buttonStyle(KFadePressStyle())
      .disabled(managing || !c.opens)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(c.a11y)
      .accessibilityAddTraits(!managing && c.opens ? .isButton : [])
    } remove: {
      SwiftUI.Button {
        actions.onRemove(c.id)
      } label: {
        Circle()
          .fill(KBrand.postRed)
          .overlay(Circle().strokeBorder(theme.sf, lineWidth: 2))
          .overlay(KLineIcon(.close, size: 11, lineWidth: 3, color: KBrand.paperWhite))
          .frame(width: 26, height: 26)
          .frame(width: 44, height: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFloatPressStyle())
      .accessibilityLabel(content.remove)
      .offset(x: 8 + 9, y: -8 - 9)
    }
  }

  private var answeredGreen: Color { theme.isDark ? Color(hex: "#7CC58F") : KBrand.greenText }

  private func letterCard(_ c: KMyLettersCard) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 8) {
        HStack(alignment: .top, spacing: 6) {
          VStack(alignment: .leading, spacing: 4) {
            Text(c.date)
              .kText(.mono(11, .medium, tracking: 0.1))
              .foregroundStyle(theme.mute)
              .lineLimit(1)
              .minimumScaleFactor(0.8)
            HStack(spacing: 10) {
              HStack(spacing: 4) {
                K4aPathIcon(d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0z", size: 14, lineWidth: 1.8, color: theme.mute)
                Text("\(c.reads)").kText(.mono(11, .medium))
              }
              HStack(spacing: 4) {
                K4aPathIcon(d: "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M3 7l9 6 9-6", size: 14, lineWidth: 1.8, color: theme.mute)
                Text("\(c.answers)").kText(.mono(11, .medium))
              }
            }
            .foregroundStyle(theme.mute)
            .lineLimit(1)
          }
          .dynamicTypeSize(...DynamicTypeSize.accessibility1)
          Spacer(minLength: 0)
          if !c.stampId.isEmpty {
            KStamp(id: c.stampId, width: 28, dark: theme.isDark, fallbackHex: c.stampHex.isEmpty ? nil : c.stampHex)
          }
        }
        Text(c.body)
          .kText(.letterRead(16, lineHeight: 1.35, place: .myLetters))
          .foregroundStyle(theme.ink)
          .lineLimit(3)
          .multilineTextAlignment(.leading)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.top, 12)
      .padding(.horizontal, 14)
      .padding(.bottom, 10)
      Spacer(minLength: 0)
      statusBand(c)
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .frame(height: oneColumn ? nil : cardHeight, alignment: .topLeading)
    .frame(minHeight: oneColumn ? 196 : nil, alignment: .topLeading)
    .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(theme.sf))
    .overlay(RoundedRectangle(cornerRadius: 18, style: .circular).strokeBorder(theme.line, lineWidth: 1.5))
    .clipShape(RoundedRectangle(cornerRadius: 18, style: .circular))
  }

  private func statusBand(_ c: KMyLettersCard) -> some View {
    HStack(spacing: 6) {
      switch c.tone {
      case .answered:
        Circle().fill(answeredGreen).frame(width: 6, height: 6)
        Text(c.status)
          .kText(.mono(10, .semibold, tracking: 0.14))
          .foregroundStyle(answeredGreen)
      case .replied:
        if let face = c.face {
          KFace(theme: theme, source: face, size: 22, round: true, stamp: c.stamp)
        }
        Text(c.status)
          .kText(.mono(10, .semibold, tracking: 0.04))
          .foregroundStyle(theme.ink)
          // one line, like the live page (owner, 2026-10-19): it shrinks a little, then a long
          // name is cut at its end
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .truncationMode(.tail)
      default:
        Text(c.status)
          .kText(.mono(10, .semibold, tracking: 0.14))
          .foregroundStyle(theme.mute)
      }
    }
    .lineLimit(1)
    .minimumScaleFactor(0.75)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    .padding(.horizontal, 14)
    .frame(maxWidth: .infinity, minHeight: 36, alignment: .leading)
    .overlay(alignment: .top) { theme.line.frame(height: 1.5) }
  }

  private func draftCard(_ c: KMyLettersCard) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(c.date)
        .kText(.mono(11, .semibold, tracking: 0.1))
        .foregroundStyle(theme.mute)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
      Text(c.body)
        .kText(.letterRead(16, lineHeight: 1.35, place: .myLetters))
        .foregroundStyle(theme.sub)
        .lineLimit(5)
        .multilineTextAlignment(.leading)
        .frame(maxWidth: .infinity, alignment: .leading)
      Spacer(minLength: 0)
    }
    .padding(.top, 12)
    .padding(.horizontal, 14)
    .padding(.bottom, 12)
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .frame(height: oneColumn ? nil : cardHeight, alignment: .topLeading)
    .frame(minHeight: oneColumn ? 196 : nil, alignment: .topLeading)
    .overlay(RoundedRectangle(cornerRadius: 18, style: .circular).strokeBorder(theme.faint, style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])))
  }
}

/// Manage mode's rock: ±1.4° there and back over 520ms, each card on its own phase, and the ×
/// at its corner. Still under Reduce Motion (the × alone).
private struct KMyLettersJiggle<Content: View, Remove: View>: View {
  let on: Bool
  let seed: Int
  @ViewBuilder let content: () -> Content
  @ViewBuilder let remove: () -> Remove

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var tilt = false

  private var rocking: Bool { on && !reduceMotion }

  var body: some View {
    content()
      .overlay(alignment: .topTrailing) {
        if on { remove() }
      }
      .rotationEffect(.degrees(rocking ? (tilt ? 1.4 : -1.4) * (seed % 2 == 0 ? 1 : -1) : 0))
      .onAppear { setRock(rocking) }
      .onChange(of: rocking) { _, r in setRock(r) }
  }

  private func setRock(_ r: Bool) {
    if r {
      let start = Double(seed % 2) * 0.09
      withAnimation(.easeInOut(duration: 0.26).repeatForever(autoreverses: true).delay(start)) { tilt = true }
    } else {
      var t = Transaction()
      t.disablesAnimations = true
      withTransaction(t) { tilt = false }
    }
  }
}
