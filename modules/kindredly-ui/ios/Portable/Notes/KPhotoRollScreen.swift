// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE NOTES PHOTO ROLL (/journal-pick: the ＋'s "to yourself"), in SwiftUI (2026-10-27). The React
 Native page (src/app/journal-pick.tsx) stays as the "photoroll" switch's fallback. TS keeps the
 library, the permission (and the read again after a first yes), the paging, the albums, the
 picking, the camera and the hand-off to the page (src/screens/photo-roll); this draws what it is
 handed and reports taps.

   ✕            Recents ˅                [Next · 3]   the head in the composers' sizes: their ✕
                                                      (KLineIcon .close 20 at 2.2 in a 42 box), the
                                                      album title in System 500 17 (the letter
                                                      page's title) with its chevron, the album
                                                      menu being the words and the chevron only;
                                                      Next in System 600 15, the confirm green
                                                      filled once something is picked
   ┌────────┬────────┬────────┐                      THE FIRST ROW (owner, 2026-10-26, "the
   │01   ◎  │02   ✎  │03   🎙 │                      stamps"): Camera, Text note, Voice note as
   │ Camera │Text n. │Voice n.│                      postage stamps, each exactly a picture's
   └────────┴────────┴────────┘                      cell: the colour edge to edge, perforated
   ┌────────┬────────┬────────┐                      all round (half holes of 2.8 on an 8 pitch,
   │      ① │        │ ▶ 0:12 │                      cut in the page's own colour), a frame 9 in
   └────────┴────────┴────────┘                      (1.5), the number in SF Mono 8 at the top
                                                      right, the line icon 30 over the name in
 System 12 bold. Colours fixed in every theme: the brand's acid, the pen blue (white on it), a
 pink. Keys, so flat: no shadow (rule B). Without the camera card (a binary before 1.2.6) the
 third cell is the newest picture. Adding to a page: no first row.

 THE ROLL: three to a row, 2 apart, square, each picture read in place from the phone's library
 (ph://, Adapters/KPhotoLibraryLoader). A picture carries its pick ring (22, a white 1.5 edge, the
 number in the green once picked, and the green at .14 over it); a film its length (▶ m:ss on a
 dark pill) and goes to the page on its own. Near the end the roll asks TS for the next page.
 Nothing on it: "No photos yet."; no access: the line and Open Settings ›; limited access: Choose
 more photos › under the roll.

 THE ALBUMS slide down from under the head over the roll (Reduce Motion: a fade): every album, its
 cover 44 (corners 4), its name in System 16 and its count in SF Mono 11, the current one on lav2.

 WHAT CHANGES ON A TAP comes through the driver, not the content: the picks and Next's words, and
 the album list (covers fill in one by one). A prop change re-sends every prop, the whole roll with
 it, so only the head, the cells and the album layer watch the driver, never the grid itself.

 Every word is TS's. VoiceOver: a picture is a button ("Photo", its number once picked, "selected"),
 a stamp a button with its name; escape closes the albums, then the roll.
 */

/// A way into a page from the first row.
public enum KPhotoRollKey: String, CaseIterable, Sendable {
  case camera
  case text
  case voice

  /// the stamp's colours and number, the same in every theme
  struct Look {
    let face: Color
    let ink: Color
    let frame: Color
    let value: String
    let icon: String
  }

  var look: Look {
    let dark = KBrand.inkOnBrand
    switch self {
    case .camera:
      return Look(face: KBrand.acid, ink: dark, frame: dark.opacity(0.25), value: "01",
                  icon: "M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z")
    case .text:
      return Look(face: Color(hex: "#3A34D6"), ink: KBrand.paperWhite, frame: KBrand.paperWhite.opacity(0.5), value: "02",
                  icon: "M4 20l4-1 11-11-3-3L5 16z M13 8l3 3")
    case .voice:
      return Look(face: Color(hex: "#FF8FC7"), ink: dark, frame: dark.opacity(0.25), value: "03",
                  icon: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3")
    }
  }
}

/// What the roll says when it has nothing to show.
public enum KPhotoRollEmpty: String, Sendable {
  /// something to show, or the phone still asking
  case none = ""
  /// nothing on the roll
  case nothing
  /// no access: the line and Open Settings
  case denied
}

/// One picture or film of the roll.
public struct KPhotoRollFrame: Identifiable, Equatable, Sendable {
  /// the library's asset id
  public let id: String
  public let image: KImageRef?
  public let video: Bool
  /// a film's length, "0:12"; "" for a picture
  public let duration: String
  /// "Photo", "Video"
  public let accessibilityLabel: String

  public init(id: String, image: KImageRef?, video: Bool, duration: String, accessibilityLabel: String) {
    self.id = id
    self.image = image
    self.video = video
    self.duration = duration
    self.accessibilityLabel = accessibilityLabel
  }
}

/// One album of the list.
public struct KPhotoRollAlbum: Identifiable, Equatable, Sendable {
  /// unique in the list
  public let id: String
  /// its place in the list: what a tap reports
  public let index: Int
  public let title: String
  /// the count as drawn
  public let count: String
  public let cover: KImageRef?
  /// what the roll shows now
  public let current: Bool

  public init(id: String, index: Int, title: String, count: String, cover: KImageRef?, current: Bool) {
    self.id = id
    self.index = index
    self.title = title
    self.count = count
    self.cover = cover
    self.current = current
  }
}

/// Every word of the roll that doesn't change with a tap.
public struct KPhotoRollStrings: Equatable, Sendable {
  public var closeLabel = ""
  /// the album on show ("Recents")
  public var title = ""
  public var camera = ""
  public var write = ""
  public var say = ""
  public var denied = ""
  /// "Open Settings ›"
  public var settings = ""
  /// "No photos yet."
  public var none = ""
  /// "Choose more photos ›"; "" unless access is limited
  public var limited = ""

  public init() {}

  func label(_ key: KPhotoRollKey) -> String {
    switch key {
    case .camera: return camera
    case .text: return write
    case .voice: return say
    }
  }
}

/// The roll itself (the caller's props): it changes when a page of the library is read.
public struct KPhotoRollContent: Equatable, Sendable {
  public var strings = KPhotoRollStrings()
  /// the first row's stamps, in order; [] while adding to a page
  public var keys: [KPhotoRollKey] = []
  /// the newest picture in the first row (no camera card); nil for none
  public var lead: KPhotoRollFrame?
  /// the first row's third cell is empty (no camera card, nothing on the roll yet)
  public var leadBlank = false
  /// the roll after the first row
  public var frames: [KPhotoRollFrame] = []
  public var empty: KPhotoRollEmpty = .none

  public init() {}
}

/// What changes with a tap: the picks and Next, and the album list. As long-lived as the roll.
public final class KPhotoRollDriver: ObservableObject {
  /// asset id → its place in the order (1 is the first picked)
  @Published public private(set) var order: [String: Int] = [:]
  /// Next as drawn ("Next", "Next · 3", "Add · 2", "…")
  @Published public private(set) var next = ""
  @Published public private(set) var nextLive = false
  @Published public private(set) var albumsOpen = false
  /// the album names are known (until then the sheet shows a spinner)
  @Published public private(set) var albumsLoaded = false
  @Published public private(set) var albums: [KPhotoRollAlbum] = []

  public init() {}

  /// the picked asset ids in the order chosen, and Next
  public func setSelection(picked: [String], next: String, nextLive: Bool) {
    var order: [String: Int] = [:]
    for (i, id) in picked.enumerated() where order[id] == nil { order[id] = i + 1 }
    if order != self.order { self.order = order }
    if next != self.next { self.next = next }
    if nextLive != self.nextLive { self.nextLive = nextLive }
  }

  public func setAlbums(open: Bool, loaded: Bool, albums: [KPhotoRollAlbum]) {
    if open != albumsOpen { albumsOpen = open }
    if loaded != albumsLoaded { albumsLoaded = loaded }
    if albums != self.albums { self.albums = albums }
  }
}

/// What the roll tells its owner. One object for the life of the roll; set the closures once.
public final class KPhotoRollActions {
  public var onClose: () -> Void = {}
  /// the album title: opens or closes the list
  public var onAlbums: () -> Void = {}
  public var onAlbum: (Int) -> Void = { _ in }
  public var onNext: () -> Void = {}
  public var onKey: (KPhotoRollKey) -> Void = { _ in }
  /// a picture or a film, by its asset id
  public var onFrame: (String) -> Void = { _ in }
  /// the roll nears the end of what it holds
  public var onReachEnd: () -> Void = {}
  public var onSettings: () -> Void = {}
  public var onLimited: () -> Void = {}

  public init() {}
}

public struct KPhotoRollScreen: View {
  static let gap: CGFloat = 2
  /// the pick is a confirmation: the app's confirm green (the kindreds' landed tick)
  static var tick: Color { KBrand.greenText }
  /// the dark under the marks on a picture
  static var markGround: Color { Color(red: 17 / 255, green: 17 / 255, blue: 19 / 255) }
  /// pictures this near the end ask for the next page
  static let tailCount = 24

  private let theme: KTheme
  private let content: KPhotoRollContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let driver: KPhotoRollDriver
  private let actions: KPhotoRollActions

  public init(theme: KTheme, content: KPhotoRollContent, topInset: CGFloat, bottomInset: CGFloat, driver: KPhotoRollDriver, actions: KPhotoRollActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KRollHead(theme: theme, title: content.strings.title, closeLabel: content.strings.closeLabel, driver: driver, actions: actions)
      ZStack(alignment: .top) {
        roll
        KRollAlbumLayer(theme: theme, none: content.strings.none, bottomInset: bottomInset, driver: driver, actions: actions)
      }
      .clipped()
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background { theme.bg.ignoresSafeArea() }
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) {
      if driver.albumsOpen { actions.onAlbums() } else { actions.onClose() }
    }
  }

  // ── the roll ──

  private var roll: some View {
    GeometryReader { geo in
      let side = max(0, (geo.size.width - 2 * Self.gap) / 3)
      let tail = Set(content.frames.suffix(Self.tailCount).map(\.id))
      ScrollView(.vertical) {
        LazyVGrid(columns: Array(repeating: GridItem(.fixed(side), spacing: Self.gap), count: 3), spacing: Self.gap) {
          ForEach(content.keys, id: \.self) { key in
            stamp(key, side: side)
          }
          if let lead = content.lead {
            KRollFrameCell(theme: theme, frame: lead, side: side, driver: driver, actions: actions)
          } else if content.leadBlank {
            theme.soft2
              .frame(width: side, height: side)
              .accessibilityHidden(true)
          }
          ForEach(content.frames) { frame in
            KRollFrameCell(theme: theme, frame: frame, side: side, driver: driver, actions: actions)
              .onAppear {
                if tail.contains(frame.id) { actions.onReachEnd() }
              }
          }
        }
        .frame(maxWidth: .infinity)

        emptyLine
        if !content.strings.limited.isEmpty {
          SwiftUI.Button(action: actions.onLimited) {
            Text(content.strings.limited)
              .kText(.mono(10, .semibold, tracking: 0.12))
              .foregroundStyle(theme.ind)
              .padding(.vertical, 18)
              .frame(maxWidth: .infinity)
              .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
        }
      }
      .scrollIndicators(.hidden)
      .contentMargins(.bottom, bottomInset + 40, for: .scrollContent)
    }
  }

  @ViewBuilder
  private var emptyLine: some View {
    switch content.empty {
    case .denied:
      VStack(spacing: 16) {
        Text(content.strings.denied)
          .kText(.system(15, lineHeight: 22.0 / 15.0))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
        SwiftUI.Button(action: actions.onSettings) {
          Text(content.strings.settings)
            .kText(.mono(11, .semibold, tracking: 0.14))
            .foregroundStyle(theme.ind)
            .padding(8)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
      }
      .padding(.horizontal, 40)
      .padding(.top, 48)
      .frame(maxWidth: .infinity)
    case .nothing:
      Text(content.strings.none)
        .kText(.system(15, lineHeight: 22.0 / 15.0))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 40)
        .padding(.top, 48)
        .frame(maxWidth: .infinity)
    case .none:
      EmptyView()
    }
  }

  private func stamp(_ key: KPhotoRollKey, side: CGFloat) -> some View {
    let label = content.strings.label(key)
    return SwiftUI.Button {
      actions.onKey(key)
    } label: {
      KRollStamp(look: key.look, label: label, side: side, paper: theme.bg)
    }
    .buttonStyle(KRollStampPressStyle())
    .accessibilityLabel(label)
  }
}

// MARK: - the head

/// ✕ · the album title and its chevron · Next.
private struct KRollHead: View {
  let theme: KTheme
  let title: String
  let closeLabel: String
  @ObservedObject var driver: KPhotoRollDriver
  let actions: KPhotoRollActions
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    HStack(spacing: 0) {
      SwiftUI.Button(action: actions.onClose) {
        KLineIcon(.close, size: 20, lineWidth: 2.2, color: theme.ink)
          .frame(width: 42, height: 42)
          .contentShape(Rectangle())
      }
      .buttonStyle(KAsIsButtonStyle())
      .accessibilityLabel(closeLabel)

      // the title is the album menu, the words and the chevron only (a thumb aimed at ✕ that
      // landed a little to the right used to open the albums)
      SwiftUI.Button(action: actions.onAlbums) {
        HStack(spacing: 6) {
          KRollWidthCap(cap: 200) {
            Text(title)
              .kText(.secondaryTitle)
              .foregroundStyle(theme.ink)
              .lineLimit(1)
          }
          KNotePath(d: "M6 9l6 6 6-6")
            .stroke(theme.ink, style: StrokeStyle(lineWidth: 2.4 * 14 / 24, lineCap: .round, lineJoin: .round))
            .frame(width: 14, height: 14)
            .rotationEffect(.degrees(driver.albumsOpen ? 180 : 0))
            .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: driver.albumsOpen)
            .accessibilityHidden(true)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
      }
      .buttonStyle(KAsIsButtonStyle())
      .accessibilityAddTraits(driver.albumsOpen ? .isSelected : [])
      .frame(maxWidth: .infinity)

      nextKey
    }
    .padding(.leading, 12)
    .padding(.trailing, 14)
    .padding(.top, 6)
    .padding(.bottom, 10)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private var nextKey: some View {
    let live = driver.nextLive
    return SwiftUI.Button(action: actions.onNext) {
      Text(driver.next)
        .kText(.system(15, .semibold))
        .foregroundStyle(live ? KBrand.paperWhite : theme.mute)
        .lineLimit(1)
        .fixedSize()
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .frame(minWidth: 34)
        .background { Capsule().fill(live ? KPhotoRollScreen.tick : Color.clear) }
        .overlay { Capsule().strokeBorder(live ? KPhotoRollScreen.tick : theme.line, lineWidth: 1.5) }
        .contentShape(Capsule())
    }
    .buttonStyle(KAsIsButtonStyle())
    .disabled(!live)
  }
}

// MARK: - a picture of the roll

/// One picture or film: its pick ring or its length, and the green over it once picked. It
/// watches the picks itself, so a tap redraws the cells on screen and nothing else.
private struct KRollFrameCell: View {
  let theme: KTheme
  let frame: KPhotoRollFrame
  let side: CGFloat
  @ObservedObject var driver: KPhotoRollDriver
  let actions: KPhotoRollActions

  var body: some View {
    let pick = driver.order[frame.id] ?? 0
    SwiftUI.Button {
      actions.onFrame(frame.id)
    } label: {
      KImage(frame.image, size: CGSize(width: side, height: side), contentMode: .fill, placeholder: theme.soft2)
        .overlay {
          if pick > 0 {
            KPhotoRollScreen.tick.opacity(0.14)
          }
        }
        .overlay(alignment: .bottomLeading) {
          if frame.video {
            HStack(spacing: 4) {
              KNotePath(d: "M6 4l14 8-14 8z")
                .fill(KBrand.paperWhite)
                .frame(width: 8, height: 8)
              Text(frame.duration)
                .kText(.mono(9, .semibold))
                .foregroundStyle(KBrand.paperWhite)
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background { RoundedRectangle(cornerRadius: 4, style: .circular).fill(KPhotoRollScreen.markGround.opacity(0.55)) }
            .padding(6)
          }
        }
        .overlay(alignment: .topTrailing) {
          if !frame.video {
            // the number is the order it will sit in on the page
            Circle()
              .fill(pick > 0 ? KPhotoRollScreen.tick : KPhotoRollScreen.markGround.opacity(0.28))
              .overlay { Circle().strokeBorder(KBrand.paperWhite, lineWidth: 1.5) }
              .overlay {
                if pick > 0 {
                  Text(verbatim: String(pick))
                    .kText(.mono(11, .semibold))
                    .foregroundStyle(KBrand.paperWhite)
                }
              }
              .frame(width: 22, height: 22)
              .padding(6)
          }
        }
        .dynamicTypeSize(...DynamicTypeSize.large)
        .contentShape(Rectangle())
    }
    .buttonStyle(KAsIsButtonStyle())
    .accessibilityLabel(frame.accessibilityLabel)
    .accessibilityValue(pick > 0 ? String(pick) : frame.duration)
    .accessibilityAddTraits(pick > 0 ? .isSelected : [])
  }
}

// MARK: - the albums

/// The album list over the roll while it is open.
private struct KRollAlbumLayer: View {
  let theme: KTheme
  let none: String
  let bottomInset: CGFloat
  @ObservedObject var driver: KPhotoRollDriver
  let actions: KPhotoRollActions
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  private var motion: Animation { reduceMotion ? .easeOut(duration: 0.15) : .easeOut(duration: 0.26) }

  var body: some View {
    ZStack(alignment: .top) {
      if driver.albumsOpen {
        sheet
          .transition(reduceMotion ? .opacity : .move(edge: .top))
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .allowsHitTesting(driver.albumsOpen)
    .animation(motion, value: driver.albumsOpen)
  }

  private var sheet: some View {
    Group {
      if !driver.albumsLoaded {
        ProgressView()
          .tint(theme.mute)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if driver.albums.isEmpty {
        Text(none)
          .kText(.mono(11, .medium))
          .foregroundStyle(theme.mute)
          .padding(20)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      } else {
        ScrollView(.vertical) {
          LazyVStack(spacing: 0) {
            ForEach(driver.albums) { album in
              row(album)
            }
          }
        }
        .scrollIndicators(.hidden)
        .contentMargins(.bottom, bottomInset + 40, for: .scrollContent)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background { theme.sf }
  }

  private func row(_ album: KPhotoRollAlbum) -> some View {
    SwiftUI.Button {
      actions.onAlbum(album.index)
    } label: {
      HStack(spacing: 14) {
        KImage(album.cover, size: CGSize(width: 44, height: 44), contentMode: .fill, placeholder: theme.soft2)
          .clipShape(RoundedRectangle(cornerRadius: 4, style: .circular))
        Text(album.title)
          .kText(.system(16))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
        Text(album.count)
          .kText(.mono(11, .medium))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .fixedSize()
        Spacer(minLength: 0)
      }
      .padding(.horizontal, 16)
      .frame(minHeight: 62)
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(Rectangle())
    }
    .buttonStyle(KRollRowStyle(fill: theme.lav2, current: album.current))
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(album.current ? .isSelected : [])
  }
}

// MARK: - the stamp

/// A postage stamp exactly a picture's cell: the colour edge to edge, perforated all round in the
/// page's colour, a frame 9 in, its number at the top right, the icon over the name.
struct KRollStamp: View {
  /// the perforation: the hole's radius and the pitch
  static let hole: CGFloat = 2.8
  static let pitch: CGFloat = 8

  let look: KPhotoRollKey.Look
  let label: String
  let side: CGFloat
  /// the page colour the holes are cut in
  let paper: Color

  var body: some View {
    ZStack {
      look.face
      Rectangle()
        .stroke(look.frame, lineWidth: 1.5)
        .padding(9)
      Canvas { context, size in
        context.fill(Self.holes(in: size), with: .color(paper))
      }
      VStack(spacing: 6) {
        KNotePath(d: look.icon)
          .stroke(look.ink, style: StrokeStyle(lineWidth: 1.9 * 30 / 24, lineCap: .round, lineJoin: .round))
          .frame(width: 30, height: 30)
        Text(label)
          .kText(.system(12, .bold))
          .foregroundStyle(look.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
      }
      .padding(.horizontal, 14)
    }
    .overlay(alignment: .topTrailing) {
      Text(look.value)
        .kText(.mono(8, .semibold, tracking: 0.6 / 8))
        .foregroundStyle(look.ink.opacity(0.8))
        .padding(.top, 13)
        .padding(.trailing, 14)
        .accessibilityHidden(true)
    }
    .frame(width: side, height: side)
    .clipped()
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }

  /// the holes along each side, centred on its edge so only their inner halves show, the row
  /// of them in the middle of the side
  static func holes(in size: CGSize) -> Path {
    var path = Path()
    let along = { (length: CGFloat) -> [CGFloat] in
      let n = max(0, Int((length / pitch).rounded(.down)))
      let lead = (length - CGFloat(n) * pitch) / 2
      return (0..<n).map { lead + pitch / 2 + CGFloat($0) * pitch }
    }
    let r = hole
    for x in along(size.width) {
      path.addEllipse(in: CGRect(x: x - r, y: -r, width: 2 * r, height: 2 * r))
      path.addEllipse(in: CGRect(x: x - r, y: size.height - r, width: 2 * r, height: 2 * r))
    }
    for y in along(size.height) {
      path.addEllipse(in: CGRect(x: -r, y: y - r, width: 2 * r, height: 2 * r))
      path.addEllipse(in: CGRect(x: size.width - r, y: y - r, width: 2 * r, height: 2 * r))
    }
    return path
  }
}

/// A key pressed: .8, as the React Native stamps do.
private struct KRollStampPressStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.opacity(configuration.isPressed ? 0.8 : 1)
  }
}

/// An album row: lav2 while it is the current one or pressed.
private struct KRollRowStyle: ButtonStyle {
  let fill: Color
  let current: Bool

  func makeBody(configuration: Configuration) -> some View {
    configuration.label.background(current || configuration.isPressed ? fill : Color.clear)
  }
}

/// Offers its one child at most `cap` across and takes the child's own size, so a short title
/// keeps its chevron beside it and a long one truncates at the cap.
struct KRollWidthCap: Layout {
  let cap: CGFloat

  init(cap: CGFloat) {
    self.cap = cap
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard let child = subviews.first else { return .zero }
    let width = proposal.width.map { min($0, cap) } ?? cap
    return child.sizeThatFits(ProposedViewSize(width: width, height: proposal.height))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: bounds.origin, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
  }
}
