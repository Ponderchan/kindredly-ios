// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMPS CARD AND THE ALBUM (custom stamps, the owner's final Prompt 1 / Prompt 2 and the
 decisions of 2026-10-19 evening; contract .claude/custom-stamps/CONTRACT.md §7 B). Every word,
 count and colour comes from TS (src/screens/me/stamp-collection.ts); photo stamps ("c:<uuid>")
 are drawn by KStamp from the registry TS fills (KCustomStamps, Kit/KStampArt.swift), so nothing
 here loads a picture.

 ME › STAMPS: one InkCard .me, 18 between its areas, top to bottom:
   ① MADE BY YOU (only when the press and 0038 are both there): the head (mono 10 .16em sub) with
      the quota at the right ("2 OF 3 FREE" in mute, "UNLIMITED" in the gold ink #B8842A) and
      "See all →" (12/600 ind) past two stamps. None made: the blank stamp, 84 wide, −3°, breathing
      (scale 1 → 1.02 every 4 s, none under Reduce Motion), beside "Photograph a moment." and its
      sub; the row is one button. Some made: a grid of three, the blank stamp always first (MAKE
      ONE under it), then the two newest (lower-case #topic under each, the lime "new" sticker for
      24 h). Free at 3/3: the blank stamp opens the small card (3 OF 3 FREE STAMPS MADE / Three
      moments, perforated. / Make more with First Class → / Not now) in place. Once after an
      approval, the lime bar "Your stamp is ready. · Write with it →".
   ② FROM STRANGERS: up to three, "FROM SUNDAY KITE" under each; none: the owner's light line with
      a 24pt line glyph.
   ③ YOUR STAMPS: the official stamps used, up to three, the name under each; none: three dashed
      slots stroked in three category colours, the owner's line and "Write a letter →".
   ④ "Open the album →", full width, 46 tall, a soft lav pill in ind (no ink frame); hidden while all
      three areas are empty.

 THE ALBUM (/album, KStampAlbumScreen below): the standard back bar with ALBUM; the page ruled
 like an album leaf (1px lines every 28 in ink at .05); three sections with sticky heads (MADE BY
 YOU · n / FROM STRANGERS · n / YOUR STAMPS · n, counts only); grids of three, 12 apart, each stamp
 at a fixed tilt by its index [−2, 1, 2, −1, 1.5, −1.5]°; empty sections are not drawn (with all
 three empty: the blank stamp and the three dashed slots with "Write a letter →"). A tap opens the
 sheet: the stamp 200 wide at −3° (a photo stamp in .paper with its soft shadow), its #topic tag in
 its colour, one info line, and the actions as 38-tall capsules (ink, plain, or the gold-ink
 Delete); the sheet closes before an action is reported, so TS's confirmations show above it.

 EXPORTING (stamp export, 2026-11-10; First Class): two additions that change none of the rules
 above. A stamp's sheet may carry one more capsule, "Save as sticker" (an action like the others:
 TS adds it, key "sticker"), and MADE BY YOU's sticky head may carry one small text action at its
 right, "Print a sheet" (Me's "See all →" style: 12/600 in ind; TS sends its words only when a
 stamp qualifies and the binary can export). For a reader who is not First Class both carry the
 small wax-gold tag the app puts on locked things ("1ST", as on the journal book's key); the tap
 is TS's either way (a member exports, anyone else meets the paywall). While an export is being
 made the head's action is a small spinner and can't be tapped again.
 */

// MARK: - pieces both pages use

/// The area head: mono 10 .16em in sub, a count or quota at the right, and an optional link.
struct KStampsHead: View {
  let theme: KTheme
  let label: String
  var trailing = ""
  var gold = false
  var link = ""
  var onLink: () -> Void = {}

  static let goldInk = Color(red: 0xB8 / 255, green: 0x84 / 255, blue: 0x2A / 255)

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 10) {
      Text(label)
        .kText(.mono(10, .semibold, tracking: 0.16))
        .foregroundStyle(theme.sub)
        .lineLimit(1)
        .accessibilityAddTraits(.isHeader)
      Spacer(minLength: 0)
      if !trailing.isEmpty {
        Text(trailing)
          .kText(.mono(10, .medium, tracking: 0.12))
          .foregroundStyle(gold ? Self.goldInk : theme.mute)
          .lineLimit(1)
      }
      if !link.isEmpty {
        SwiftUI.Button(action: onLink) {
          Text(link)
            .kText(.system(12, .semibold))
            .foregroundStyle(theme.ind)
            .lineLimit(1)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.vertical, -14)
      }
    }
  }
}

/// The blank stamp: the dashed cut (KStampSlot) in ind, a camera in its window and, when given,
/// MAKE ONE under the camera. The same box as a KStamp of that width.
struct KBlankStamp: View {
  let theme: KTheme
  let width: CGFloat
  var label = ""

  var body: some View {
    let paper = KPhotoStamp.paperRect(boxWidth: width)
    ZStack(alignment: .topLeading) {
      KStampSlot(width: width, stroke: theme.ind)
      VStack(spacing: max(2, width * 0.04)) {
        KLineIcon(.camera, size: max(14, width * 0.3), lineWidth: 1.9, color: theme.ind)
        if !label.isEmpty {
          Text(label)
            .kText(.mono(8, .semibold, tracking: 0.1))
            .foregroundStyle(theme.ind)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .dynamicTypeSize(...DynamicTypeSize.large)
        }
      }
      .frame(width: paper.width, height: paper.height)
      .offset(x: paper.minX, y: paper.minY)
    }
    .frame(width: width, height: KStampFrame.height(width), alignment: .topLeading)
    .accessibilityHidden(true)
  }
}

/// Breathes every 4 s (scale 1 → 1.02 → 1 over .8 s); still under Reduce Motion.
struct KBreathing: ViewModifier {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var big = false

  func body(content: Content) -> some View {
    content
      .scaleEffect(big ? 1.02 : 1)
      .task(id: reduceMotion) {
        guard !reduceMotion else {
          big = false
          return
        }
        while !Task.isCancelled {
          try? await Task.sleep(nanoseconds: 4_000_000_000)
          if Task.isCancelled { break }
          withAnimation(.easeInOut(duration: 0.4)) { big = true }
          try? await Task.sleep(nanoseconds: 400_000_000)
          withAnimation(.easeInOut(duration: 0.4)) { big = false }
        }
      }
  }
}

/// The lime "new" sticker (rotate 8°), flat: no outline (owner's rule B, 2026-10-26).
struct KNewSticker: View {
  let theme: KTheme
  let text: String

  var body: some View {
    Text(text)
      .kText(.mono(9, .semibold, tracking: 0.08))
      .foregroundStyle(KStampFrame.color(0x1E1B35))
      .padding(.horizontal, 6 + 1.5)
      .padding(.vertical, 2 + 1.5)
      .background(RoundedRectangle(cornerRadius: 6, style: .circular).fill(KStampFrame.color(0xD8F04A)))
      .rotationEffect(.degrees(8))
      .dynamicTypeSize(...DynamicTypeSize.large)
      .accessibilityHidden(true)
  }
}

/// The full-width secondary button: 46 tall, 2 ln outline, sf, hard 3/3 shadow in ln.
struct KStampsWideButton: View {
  let theme: KTheme
  let title: String
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      Text(title)
        .kText(.system(15, .semibold))
        .foregroundStyle(theme.ind)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity, minHeight: 46)
        // soft, no ink frame (owner, 2026-10-21: the black-framed button read as ugly)
        .background(theme.lav, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
  }
}

/// Free with all three made: the small card in place of the area (Prompt 1).
struct KStampsFullCard: View {
  let theme: KTheme
  let title: String
  let sub: String
  let cta: String
  let notNow: String
  let onCta: () -> Void
  let onClose: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(title)
        .kText(.mono(10, .semibold, tracking: 0.16))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
      Text(sub)
        .kText(.system(18, .semibold))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
      SwiftUI.Button(action: onCta) {
        Text(cta)
          .kText(.system(15, .semibold))
          .foregroundStyle(KStampFrame.color(0x1E1B35))
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity, minHeight: 46)
          // the gold stays; flat, a capsule with no ink edge and no hard shadow (rule B, 10-26)
          .background(Capsule().fill(KStampFrame.color(0xD8A63F)))
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      SwiftUI.Button(action: onClose) {
        Text(notNow)
          .kText(.system(14, .medium))
          .foregroundStyle(theme.sub)
          .frame(maxWidth: .infinity, minHeight: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
    }
    .padding(14)
    .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(theme.soft))
  }
}

/// A grid of three, 12 apart, measuring its cell width (MeRN / the album: floor((w − 24) / 3)).
struct KStampGrid<Content: View>: View {
  let content: (_ cell: CGFloat) -> Content
  @State private var width: CGFloat = 0

  init(@ViewBuilder content: @escaping (_ cell: CGFloat) -> Content) {
    self.content = content
  }

  private var cell: CGFloat { width > 0 ? ((width - 24) / 3).rounded(.down) : 0 }

  var body: some View {
    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12, alignment: .top), count: 3), alignment: .leading, spacing: 14) {
      if cell > 0 { content(cell) }
    }
    .frame(minHeight: cell > 0 ? 0 : 60)
    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { w in
      if abs(w - width) > 0.5 { width = w }
    }
  }
}

/// A stamp with one line under it (mono 9, lower case as TS sent it).
struct KStampUnder<Stamp: View>: View {
  let theme: KTheme
  let under: String
  var underColor: Color? = nil
  let cell: CGFloat
  @ViewBuilder let stamp: () -> Stamp

  var body: some View {
    VStack(spacing: 6) {
      stamp()
      if !under.isEmpty {
        Text(under)
          .kText(.mono(9, .semibold, tracking: 0.06))
          .foregroundStyle(underColor ?? theme.sub)
          .lineLimit(1)
          .truncationMode(.tail)
          .frame(maxWidth: cell)
      }
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Me › Stamps

public struct KStampsCard: View {
  static var dateStyle: KTextStyle { .monoStamp }
  /// the blank stamp before anything is made
  static let blankWidth: CGFloat = 84

  private let theme: KTheme
  private let stamps: KMeStamps
  private let actions: KMeActions

  @State private var showFull = false

  public init(theme: KTheme, stamps: KMeStamps, actions: KMeActions) {
    self.theme = theme
    self.stamps = stamps
    self.actions = actions
  }

  public var body: some View {
    InkCard(theme: theme, variant: .me, spacing: 18, soft: true) {
      if stamps.madeShow { madeArea }
      if !stamps.strangersLabel.isEmpty { strangersArea }
      // the official stamps used: shown only while TS sends a label (none since 2026-10-20)
      if !stamps.label.isEmpty { yoursArea }
      if !stamps.album.isEmpty {
        KStampsWideButton(theme: theme, title: stamps.album) { actions.onStamps("album", "") }
      }
    }
  }

  private func make() {
    if stamps.full {
      withAnimation(KMotion.press) { showFull = true }
    } else {
      actions.onStamps("make", "")
    }
  }

  // ① MADE BY YOU
  @ViewBuilder
  private var madeArea: some View {
    VStack(alignment: .leading, spacing: 12) {
      KStampsHead(theme: theme, label: stamps.madeLabel, trailing: stamps.madeQuota, gold: stamps.madeQuotaGold, link: stamps.seeAll) {
        actions.onStamps("seeAll", "")
      }
      if !stamps.ready.isEmpty {
        SwiftUI.Button {
          actions.onStamps("ready", stamps.readyId)
        } label: {
          HStack(spacing: 6) {
            Text(stamps.ready).kText(.system(13, .semibold))
            Text(stamps.readyCta).kText(.system(13, .semibold)).foregroundStyle(theme.ind)
          }
          .foregroundStyle(KStampFrame.color(0x1E1B35))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .padding(.horizontal, 12)
          .frame(maxWidth: .infinity, minHeight: 40, alignment: .leading)
          // flat lime, no ink edge (rule B, 2026-10-26)
          .background(RoundedRectangle(cornerRadius: 12, style: .circular).fill(KStampFrame.color(0xD8F04A)))
          .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
      }
      if showFull {
        KStampsFullCard(theme: theme, title: stamps.fullTitle, sub: stamps.fullSub, cta: stamps.fullCta, notNow: stamps.notNow) {
          actions.onStamps("fullCta", "")
        } onClose: {
          withAnimation(KMotion.press) { showFull = false }
        }
      } else if stamps.made.isEmpty {
        SwiftUI.Button(action: make) {
          HStack(alignment: .center, spacing: 16) {
            KBlankStamp(theme: theme, width: Self.blankWidth, label: stamps.makeOne)
              .rotationEffect(.degrees(-3))
              .modifier(KBreathing())
            VStack(alignment: .leading, spacing: 4) {
              Text(stamps.emptyTitle)
                .kText(.system(18, .semibold))
                .foregroundStyle(theme.ink)
                .fixedSize(horizontal: false, vertical: true)
              Text(stamps.emptySub)
                .kText(.system(13))
                .foregroundStyle(theme.sub)
                .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
          .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(stamps.makeA11y)
        .accessibilityHint(stamps.emptyTitle)
        .accessibilityAddTraits(.isButton)
      } else {
        KStampGrid { cell in
          SwiftUI.Button(action: make) {
            KStampUnder(theme: theme, under: stamps.makeOne, underColor: theme.ind, cell: cell) {
              KBlankStamp(theme: theme, width: cell).modifier(KBreathing())
            }
            .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(stamps.makeA11y)
          .accessibilityAddTraits(.isButton)
          ForEach(stamps.made) { m in
            SwiftUI.Button {
              actions.onStamps("stamp", m.id)
            } label: {
              KStampUnder(theme: theme, under: m.note.isEmpty ? m.topic : m.note, underColor: m.note.isEmpty ? nil : theme.mute, cell: cell) {
                KStamp(id: m.id, width: cell, dark: theme.isDark)
                  .overlay(alignment: .topTrailing) {
                    if m.fresh { KNewSticker(theme: theme, text: stamps.newLabel).offset(x: 6, y: cell * 0.12) }
                  }
              }
              .contentShape(Rectangle())
            }
            .buttonStyle(KFadePressStyle())
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(m.a11yLabel)
            .accessibilityAddTraits(.isButton)
          }
        }
      }
    }
  }

  // ② FROM STRANGERS
  private var strangersArea: some View {
    VStack(alignment: .leading, spacing: 12) {
      KStampsHead(theme: theme, label: stamps.strangersLabel, trailing: stamps.strangers.isEmpty ? "" : stamps.strangersCount)
      if stamps.strangers.isEmpty {
        HStack(alignment: .center, spacing: 10) {
          KLineIcon(.picture, size: 24, lineWidth: 1.6, color: theme.mute)
          Text(stamps.strangersEmpty)
            .kText(.system(13))
            .foregroundStyle(theme.sub)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
      } else {
        KStampGrid { cell in
          ForEach(stamps.strangers) { s in
            SwiftUI.Button {
              actions.onStamps("stamp", s.id)
            } label: {
              KStampUnder(theme: theme, under: s.from, underColor: theme.mute, cell: cell) {
                KStamp(id: s.id, width: cell, dark: theme.isDark)
              }
              .contentShape(Rectangle())
            }
            .buttonStyle(KFadePressStyle())
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(s.a11yLabel)
            .accessibilityAddTraits(.isButton)
          }
        }
      }
    }
  }

  // ③ YOUR STAMPS
  private var yoursArea: some View {
    VStack(alignment: .leading, spacing: 12) {
      KStampsHead(theme: theme, label: stamps.label, trailing: stamps.cells.isEmpty ? "" : stamps.count)
      if stamps.cells.isEmpty {
        KYoursEmpty(theme: theme, slots: stamps.yoursSlots, text: stamps.emptyText, cta: stamps.emptyCta) {
          actions.onStampsEmpty()
        }
      } else {
        KStampGrid { cell in
          ForEach(stamps.cells) { c in
            SwiftUI.Button {
              actions.onStamps("stamp", c.id)
            } label: {
              KStampUnder(theme: theme, under: c.date, cell: cell) {
                KStamp(id: c.id, width: cell, dark: theme.isDark, fallbackHex: c.hex.isEmpty ? nil : c.hex)
              }
              .contentShape(Rectangle())
            }
            .buttonStyle(KFadePressStyle())
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(c.a11yLabel)
            .accessibilityAddTraits(.isButton)
          }
        }
      }
    }
  }
}

/// No official stamp used yet: three dashed slots in three category colours, the line, the button.
struct KYoursEmpty: View {
  let theme: KTheme
  let slots: [String]
  let text: String
  let cta: String
  let onCta: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        ForEach(Array(slots.prefix(3).enumerated()), id: \.offset) { _, hex in
          KStampSlot(width: 40, stroke: KStampFrame.rgb(hex: hex).map { KStampFrame.color($0) } ?? theme.mute)
        }
      }
      .accessibilityHidden(true)
      Text(text)
        .kText(.system(13))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
      SwiftUI.Button(action: onCta) {
        Text(cta)
          .kText(.chip)
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .padding(.vertical, 10)
          .padding(.horizontal, 14)
          // a flat lav capsule, no ink edge (rule B, 2026-10-26)
          .background(Capsule().fill(theme.lav))
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
    }
  }
}

/// One stamp you have used (the official grid), the day or name under it.
struct KStampCellView: View {
  let theme: KTheme
  let cell: KMeStampCell
  let cellWidth: CGFloat
  let stampWidth: CGFloat

  var body: some View {
    KStampUnder(theme: theme, under: cell.date, cell: cellWidth) {
      KStamp(id: cell.id, width: stampWidth, dark: theme.isDark, fallbackHex: cell.hex.isEmpty ? nil : cell.hex)
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(cell.a11yLabel)
    .accessibilityAddTraits(.isImage)
    .accessibilityHidden(cell.a11yLabel.trimmingCharacters(in: .whitespaces).isEmpty)
  }
}

// MARK: - the album

/// One action in the album's sheet.
public struct KAlbumAction: Identifiable, Equatable, Sendable {
  public enum Style: String, Sendable { case ink, plain, danger }
  /// write | rename | recolour | filter | delete | remove | report | retry (a refused one: press again)
  public let key: String
  public let title: String
  public let style: Style
  /// the wax-gold tag after the title when the action is First Class only and the reader isn't
  /// ("1ST"); "" draws none
  public let lock: String
  /// what VoiceOver adds for that tag ("First Class")
  public let lockA11y: String
  public var id: String { key }

  public init(key: String, title: String, style: Style, lock: String = "", lockA11y: String = "") {
    self.key = key
    self.title = title
    self.style = style
    self.lock = lock
    self.lockA11y = lockA11y
  }
}

/// The small wax-gold tag the app puts on a First Class thing a reader hasn't got ("1ST"): the
/// journal book's key and Make-your-face's Another key wear the same one.
struct KLockTag: View {
  let text: String

  var body: some View {
    Text(text)
      .kText(.mono(8, .semibold, tracking: 0.12))
      .foregroundStyle(KBrand.inkOnBrand)
      .padding(.horizontal, 6)
      .padding(.vertical, 2)
      .background(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(KBrand.waxGold))
      .fixedSize()
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      .accessibilityHidden(true)
  }
}

/// One stamp in the album, with what its sheet shows.
public struct KAlbumCell: Identifiable, Equatable, Sendable {
  /// "c:<uuid>" or an official id
  public let id: String
  /// under it: "#tea", "FROM SUNDAY KITE", the official stamp's name
  public let under: String
  /// the sheet: the tag ("" none) on its colour, the info line, the actions
  public let tag: String
  public let tagHex: String
  public let info: String
  public let actions: [KAlbumAction]
  public let a11yLabel: String

  public init(id: String, under: String, tag: String, tagHex: String, info: String, actions: [KAlbumAction], a11yLabel: String) {
    self.id = id
    self.under = under
    self.tag = tag
    self.tagHex = tagHex
    self.info = info
    self.actions = actions
    self.a11yLabel = a11yLabel
  }
}

/// One section: made | strangers | yours.
public struct KAlbumSection: Identifiable, Equatable, Sendable {
  public let key: String
  /// "MADE BY YOU · 7"
  public let title: String
  public let cells: [KAlbumCell]
  /// the blank stamp first (made, when the press is there)
  public let make: Bool
  public var id: String { key }

  public init(key: String, title: String, cells: [KAlbumCell], make: Bool) {
    self.key = key
    self.title = title
    self.cells = cells
    self.make = make
  }
}

public struct KStampAlbumContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  public var sections: [KAlbumSection] = []
  public var makeOne = ""
  public var makeA11y = ""
  /// Free at 3/3: the blank stamp opens the small card
  public var full = false
  public var fullTitle = ""
  public var fullSub = ""
  public var fullCta = ""
  public var notNow = ""
  /// no official stamp used: the dashed slots, the line and the button ("" = not drawn)
  public var yoursEmpty = ""
  public var yoursCta = ""
  public var yoursSlots: [String] = []
  /// the section to scroll to on open ("" for the top)
  public var focus = ""
  /// MADE BY YOU's head action, "Print a sheet" ("" = not drawn: no stamp qualifies, or TS has no
  /// export for this binary); its locked tag ("1ST", "" for a member) and VoiceOver's words for it
  public var sheetAction = ""
  public var sheetLock = ""
  public var sheetLockA11y = ""
  /// a sticker or a sheet is being made: the head action is a spinner
  public var exportBusy = false

  public init() {}
}

public final class KStampAlbumActions {
  public var onBack: () -> Void = {}
  public var onMake: () -> Void = {}
  public var onFullCta: () -> Void = {}
  public var onWrite: () -> Void = {}
  /// a sheet action on a stamp
  public var onAction: (_ id: String, _ action: String) -> Void = { _, _ in }
  /// MADE BY YOU's "Print a sheet"
  public var onSheet: () -> Void = {}

  public init() {}
}

public struct KStampAlbumScreen: View {
  static let tilts: [Double] = [-2, 1, 2, -1, 1.5, -1.5]
  static let sheetStamp: CGFloat = 200

  private let theme: KTheme
  private let content: KStampAlbumContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KStampAlbumActions

  @State private var open: KAlbumCell?
  @State private var showFull = false
  @State private var focused = false

  public init(theme: KTheme, content: KStampAlbumContent, topInset: CGFloat, bottomInset: CGFloat, actions: KStampAlbumActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, trailing: { EmptyView() }, onBack: actions.onBack)
        .padding(.top, topInset)
      ScrollViewReader { proxy in
        ScrollView {
          LazyVStack(alignment: .leading, spacing: 18, pinnedViews: [.sectionHeaders]) {
            ForEach(content.sections) { section in
              Section {
                grid(section)
              } header: {
                HStack(alignment: .center, spacing: 10) {
                  Text(section.title)
                    .kText(.mono(10, .semibold, tracking: 0.16))
                    .foregroundStyle(theme.sub)
                    .lineLimit(1)
                    // beside the head's action at the largest type sizes: smaller before it is cut
                    .minimumScaleFactor(0.75)
                    .accessibilityAddTraits(.isHeader)
                  Spacer(minLength: 0)
                  if section.key == "made", !content.sheetAction.isEmpty {
                    sheetKey
                  }
                }
                .frame(maxWidth: .infinity, minHeight: 36, alignment: .leading)
                .background(theme.bg)
                .id(section.key)
              }
            }
            if !content.yoursEmpty.isEmpty {
              KYoursEmpty(theme: theme, slots: content.yoursSlots, text: content.yoursEmpty, cta: content.yoursCta, onCta: actions.onWrite)
            }
            if showFull {
              KStampsFullCard(theme: theme, title: content.fullTitle, sub: content.fullSub, cta: content.fullCta, notNow: content.notNow, onCta: actions.onFullCta) {
                withAnimation(KMotion.press) { showFull = false }
              }
            }
          }
          .padding(.horizontal, 16)
          .padding(.bottom, bottomInset + 24)
        }
        .background(KAlbumLeaf(theme: theme))
        .onAppear {
          guard !focused, !content.focus.isEmpty else { return }
          focused = true
          proxy.scrollTo(content.focus, anchor: .top)
        }
      }
    }
    .background(theme.bg.ignoresSafeArea())
    .sheet(item: $open) { cell in
      KAlbumSheet(theme: theme, cell: cell) { key in
        open = nil
        // after the sheet has gone, so TS's Alert shows over the page
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { actions.onAction(cell.id, key) }
      }
      .presentationDetents([.medium, .large])
      .presentationDragIndicator(.visible)
      .presentationCornerRadius(28)
    }
  }

  /// MADE BY YOU's one head action: "Print a sheet" (Me's "See all →" style), the 1ST tag for a
  /// reader who is not First Class, a spinner while an export is being made. 44 tall to the
  /// finger, inside the 36-tall head.
  private var sheetKey: some View {
    let locked = !content.sheetLock.isEmpty
    return SwiftUI.Button {
      actions.onSheet()
    } label: {
      HStack(spacing: 6) {
        if content.exportBusy {
          ProgressView().controlSize(.small).tint(theme.ind)
        } else {
          Text(content.sheetAction)
            .kText(.system(12, .semibold))
            .foregroundStyle(theme.ind)
            .lineLimit(1)
          if locked {
            KLockTag(text: content.sheetLock)
          }
        }
      }
      .frame(minWidth: 44, minHeight: 44, alignment: .trailing)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(.vertical, -4)
    .disabled(content.exportBusy)
    .fixedSize()
    // the action's own words, then "First Class" where it is locked (never the tag's "1ST")
    .accessibilityLabel(content.sheetAction)
    .accessibilityValue(locked && !content.exportBusy ? content.sheetLockA11y : "")
  }

  private func grid(_ section: KAlbumSection) -> some View {
    KStampGrid { cell in
      if section.make {
        SwiftUI.Button {
          if content.full {
            withAnimation(KMotion.press) { showFull = true }
          } else {
            actions.onMake()
          }
        } label: {
          KStampUnder(theme: theme, under: content.makeOne, underColor: theme.ind, cell: cell) {
            KBlankStamp(theme: theme, width: cell).rotationEffect(.degrees(Self.tilts[0]))
          }
          .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(content.makeA11y)
        .accessibilityAddTraits(.isButton)
      }
      ForEach(Array(section.cells.enumerated()), id: \.element.id) { i, c in
        SwiftUI.Button {
          open = c
        } label: {
          KStampUnder(theme: theme, under: c.under, underColor: section.key == "strangers" ? theme.mute : nil, cell: cell) {
            KStamp(id: c.id, width: cell, dark: theme.isDark, fallbackHex: c.tagHex.isEmpty ? nil : c.tagHex)
              .rotationEffect(.degrees(Self.tilts[(i + (section.make ? 1 : 0)) % Self.tilts.count]))
          }
          .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(c.a11yLabel)
        .accessibilityAddTraits(.isButton)
      }
    }
  }
}

/// The album leaf: the page colour ruled every 28 in ink at .05.
struct KAlbumLeaf: View {
  let theme: KTheme

  var body: some View {
    Canvas { ctx, size in
      var y: CGFloat = 28
      var p = Path()
      while y < size.height {
        p.addRect(CGRect(x: 0, y: y, width: size.width, height: 1))
        y += 28
      }
      ctx.fill(p, with: .color(theme.ink.opacity(0.05)))
    }
    .background(theme.bg)
    .accessibilityHidden(true)
  }
}

/// The sheet for one stamp.
struct KAlbumSheet: View {
  let theme: KTheme
  let cell: KAlbumCell
  let onAction: (String) -> Void

  @ObservedObject private var registry = KCustomStamps.shared

  var body: some View {
    ScrollView {
      VStack(spacing: 16) {
        stamp
          .rotationEffect(.degrees(-3))
          .padding(.top, 28)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(cell.a11yLabel)
          .accessibilityAddTraits(.isImage)
        if !cell.tag.isEmpty {
          KTopicTag(
            theme: theme,
            text: cell.tag,
            fill: KStampFrame.rgb(hex: cell.tagHex).map { KStampFrame.color($0) } ?? KStampFrame.color(KStampFrame.v3TagNeutral),
            textColor: KStampFrame.color(KStampFrame.v3Ink)
          )
        }
        if !cell.info.isEmpty {
          Text(cell.info)
            .kText(.system(13))
            .foregroundStyle(theme.sub)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
        }
        KFlowCapsules(theme: theme, actions: cell.actions, onAction: onAction)
          .padding(.top, 4)
      }
      .padding(.horizontal, 20)
      .padding(.bottom, 24)
      .frame(maxWidth: .infinity)
    }
    .background(theme.bg.ignoresSafeArea())
  }

  @ViewBuilder
  private var stamp: some View {
    let w = KStampAlbumScreen.sheetStamp
    if cell.id.hasPrefix("c:"), let info = registry.info(cell.id), info.look != .frame, let ref = info.ref {
      let tint = KStampFrame.rgb(hex: info.hex).map { KStampFrame.color(KStampFrame.v3Tint($0)) } ?? theme.soft2
      KPhotoStampFace(width: w, placement: .paper, gold: info.gold, dark: theme.isDark) {
        KImage(ref, size: CGSize(width: w, height: KPhotoStamp.height(paperWidth: w)), contentMode: .fill, placeholder: tint)
          .saturation(info.look == .greyed ? 0 : 1)
          .opacity(info.look == .greyed ? 0.6 : 1)
      }
    } else {
      KStamp(id: cell.id, width: w, dark: theme.isDark, fallbackHex: cell.tagHex.isEmpty ? nil : cell.tagHex)
    }
  }
}

/// The sheet's actions: 38-tall capsules, wrapped onto as many rows as they need.
struct KFlowCapsules: View {
  let theme: KTheme
  let actions: [KAlbumAction]
  let onAction: (String) -> Void

  var body: some View {
    VStack(spacing: 10) {
      ForEach(actions) { a in
        SwiftUI.Button {
          onAction(a.key)
        } label: {
          HStack(spacing: 8) {
            Text(a.title)
              .kText(.system(15, .semibold))
              .foregroundStyle(fg(a.style))
              .lineLimit(1)
              .minimumScaleFactor(0.8)
            // First Class only, and the reader isn't: the app's small wax-gold tag
            if !a.lock.isEmpty {
              KLockTag(text: a.lock)
            }
          }
          .frame(maxWidth: .infinity, minHeight: 44)
          .background {
            Capsule().fill(bgFill(a.style))
            if let edge = stroke(a.style) {
              Capsule().strokeBorder(edge, lineWidth: 2)
            }
          }
          .contentShape(Capsule())
        }
        .buttonStyle(KFadePressStyle())
        // the action's own words, then "First Class" where it is locked (never the tag's "1ST")
        .accessibilityLabel(a.title)
        .accessibilityValue(a.lock.isEmpty ? "" : a.lockA11y)
      }
    }
  }

  /* owner's rule B (2026-10-26): flat. The main action is the ind capsule, a plain one a lav
     capsule; neither has an edge. The danger one keeps its cream edge (not ink) on sf. */
  private func fg(_ s: KAlbumAction.Style) -> Color {
    switch s {
    case .ink: return theme.bg
    case .plain: return theme.ink
    case .danger: return KStampsHead.goldInk
    }
  }

  private func bgFill(_ s: KAlbumAction.Style) -> Color {
    switch s {
    case .ink: return theme.ind
    case .plain: return theme.lav
    case .danger: return theme.sf
    }
  }

  private func stroke(_ s: KAlbumAction.Style) -> Color? {
    s == .danger ? Color(red: 0xEA / 255, green: 0xD9 / 255, blue: 0xA8 / 255) : nil
  }
}
