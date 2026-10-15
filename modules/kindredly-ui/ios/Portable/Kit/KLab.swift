// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STEP-5 SPIKE LAB (batch 0b, dev only). src/app/dev/step5-lab.tsx draws it through
 Adapters/KLabView.swift, one full-screen Host. Before any step-5 screen is built on the kit,
 this one surface puts together what the sources only make plausible, so it can be tried on a
 device and the answers written down:

 - THE CHAT LIST. A ScrollView whose LazyVStack holds a few hundred rows of different heights:
   - it opens at the newest row: .defaultScrollAnchor(.bottom, for: .initialOffset);
   - it keeps its place when older rows go in above: an id-based ScrollPosition over
     .scrollTargetLayout();
   - it follows new rows at the end only while it is at the bottom: the .sizeChanges anchor is
     .bottom then and nil otherwise, read from a KScrollModel (isAtBottom);
   - a deep pull past the top reports its depth when the finger lifts (the Kindreds band's
     -56), and coming near the top says so (paging older rows in).
 - THE DOCK in .safeAreaInset(edge: .bottom): a KReplyStrip with its KField (return-to-send)
   and a round +. The Host keeps the keyboard's safe area (ignoreSafeArea "container"), so the
   dock rides the keyboard, and .scrollDismissesKeyboard(.interactively) lets a drag take it
   down. The dock sits on the home-indicator inset while the keyboard is down and just above
   the keyboard while it is up; the keyboard's inset is read from a GeometryReader that ignores
   the keyboard's safe area, and reported.
 - THE MENUS: .kMenu on every row (some rows pass none), with a destructive item, and its
   VoiceOver actions.
 - THE PICTURES: KImage four ways (a bundled PNG through expo-asset, an https picture, a still
   from a video, a bird snapshot) through whatever loader is installed.
 - THE ISLAND: the caller's `island` (a named React Native view, CloseOfDay's cord in the lab)
   in the non-lazy top of the scroll content, never in a LazyVStack row, with a pan of its own
   inside this ScrollView.
 - THE VOICE: KVoiceCard showing a KPlayback the driver is told about.
 - THE SWITCH: KToggleStyle, for VoiceOver's reading of it.

 Every word comes from the caller (KLabStrings, the rows' bodies and menus): the lab is English,
 typed in TS, as ui-lab is. Commands come in through the KLabDriver (the field's controller,
 scroll requests, the voice, whether the send key may send), and what the lab learns goes back
 through KLabActions: KLabFacts whenever one of them changes (at the bottom or not, the top row
 once the scroll settles, the keyboard's inset, the field's focus), the sends, the drafts, the
 menu actions, the pull and the near-top.
 */

/// One row of the lab's list: a chat line of some length on either side, with its menu.
public struct KLabRow: Identifiable, Equatable, Sendable {
  public let id: String
  public let body: String
  /// drawn on the right, on lav2
  public let mine: Bool
  /// the small line under the bubble (its number, a state); "" for none
  public let meta: String
  /// the long-press menu; [] for none
  public let menu: [KMenuItem]

  public init(id: String, body: String, mine: Bool, meta: String, menu: [KMenuItem]) {
    self.id = id
    self.body = body
    self.mine = mine
    self.meta = meta
    self.menu = menu
  }
}

/// The lab's four pictures; nil draws the tile's placeholder alone.
public struct KLabMedia: Equatable, Sendable {
  /// a bundled PNG, as a file:// URL from expo-asset
  public var asset: KImageRef?
  /// an https picture
  public var remote: KImageRef?
  /// a video file, drawn as a still (kind .videoPoster)
  public var poster: KImageRef?
  /// a bird snapshot (transparent PNG)
  public var bird: KImageRef?

  public init(asset: KImageRef? = nil, remote: KImageRef? = nil, poster: KImageRef? = nil, bird: KImageRef? = nil) {
    self.asset = asset
    self.remote = remote
    self.poster = poster
    self.bird = bird
  }
}

/// Every word the lab shows, from the caller.
public struct KLabStrings: Equatable, Sendable {
  public var placeholder = ""
  public var sendLabel = ""
  /// VoiceOver's name for the round +
  public var plusLabel = ""
  /// the line under the strip (H:125)
  public var hint = ""
  /// what the + opens under the strip
  public var trayText = ""
  public var islandTitle = ""
  public var mediaTitle = ""
  public var assetCaption = ""
  public var remoteCaption = ""
  public var posterCaption = ""
  public var birdCaption = ""
  public var voiceTitle = ""
  /// the voice's whole length, e.g. "0:06"
  public var voiceDuration = ""
  public var playLabel = ""
  public var pauseLabel = ""
  public var toggleLabel = ""
  public var listTitle = ""

  public init() {}
}

/// What the lab reports about itself, each time one of these changes.
public struct KLabFacts: Equatable, Sendable {
  /// the end of the list is within reach of the bottom (KScrollModel.isAtBottom)
  public var atBottom = true
  /// the first row on screen, once the scroll has settled; "" before the first settle
  public var topRowId = ""
  /// the keyboard's safe-area inset at the bottom of the lab; 0 while it is down
  public var keyboardInset: CGFloat = 0
  /// the field has the keyboard
  public var focused = false

  public init() {}
}

/// Where a scroll request goes.
public enum KLabScrollTarget: Equatable, Sendable {
  case top
  case end
  case row(String)
}

/// The lab's live channel from whoever drives it (the Expo adapter, from TS commands). It holds
/// the field's controller, so the adapter can blur it before the view goes away. Not observed by
/// the list itself: only the small views that show its values (the dock, the voice card) are.
public final class KLabDriver: ObservableObject {
  /// One scroll request; the serial makes two requests for the same place two requests.
  struct ScrollRequest: Equatable {
    let target: KLabScrollTarget
    let animated: Bool
    let serial: Int
  }

  /// the dock's field
  public let reply = KFieldController()
  @Published private(set) var scrollRequest: ScrollRequest?
  /// the voice card's state; nil shows it at rest
  @Published public var playback: KPlayback?
  /// the voice can't be played (no URL, or it failed to load)
  @Published public var voiceUnavailable = false
  /// the caller's rule for the words as typed (the composer command)
  @Published public var canSend = false
  /// the keyboard's inset, as the lab measured it (the dock's bottom padding follows it)
  @Published var keyboardInset: CGFloat = 0
  private var serial = 0

  public init() {}

  /// Scrolls the list to the top (the header), the end, or a row.
  public func scroll(to target: KLabScrollTarget, animated: Bool) {
    serial += 1
    scrollRequest = ScrollRequest(target: target, animated: animated, serial: serial)
  }
}

/// What the lab tells its owner. One object for the whole surface, so a row's actions don't make
/// it unequal to itself between renders. Set the closures once.
public final class KLabActions {
  /// Return in the field, or the send key, with the text
  public var onSend: (String) -> Void = { _ in }
  /// the reader's edits (never a setText)
  public var onDraft: (String) -> Void = { _ in }
  /// a menu item chosen on a row: the row's id and the item's key
  public var onRowAction: (_ id: String, _ key: String) -> Void = { _, _ in }
  /// the voice card's disc
  public var onVoiceToggle: () -> Void = {}
  /// any of the facts changed
  public var onFacts: (KLabFacts) -> Void = { _ in }
  /// a pull past the top ended, with its deepest point in points
  public var onPullRelease: (CGFloat) -> Void = { _ in }
  /// the list came within reach of its top
  public var onNearTop: () -> Void = {}
  /// the switch changed
  public var onToggle: (Bool) -> Void = { _ in }

  public init() {}
}

public struct KLab<Island: View>: View {
  /// the bubbles' corners, and the shape the lifted copy is cut to
  static var bubbleRadius: CGFloat { 18 }
  /// the picture tiles
  static var tileSize: CGFloat { 72 }

  private let theme: KTheme
  private let rows: [KLabRow]
  private let media: KLabMedia
  private let strings: KLabStrings
  private let bottomInset: CGFloat
  private let driver: KLabDriver
  private let actions: KLabActions
  private let island: Island

  /// Only the ends, the near-top and the pulls matter here: offset is capped at 0 and quantized
  /// to 1000, so it never publishes while the list scrolls (the pull's release depth is exact).
  @StateObject private var chrome = KScrollModel(offsetCap: 0, quantum: 1000, atBottomWithin: 60, nearTopWithin: 600)
  @State private var position = ScrollPosition(idType: String.self)
  @State private var box = KLabBox()

  /// - Parameters:
  ///   - rows: oldest first; the list opens at the last
  ///   - media: the four pictures
  ///   - strings: every word on the surface
  ///   - bottomInset: the home-indicator inset (the Host ignores it, so the dock pads itself)
  ///   - driver: the field, scroll requests, the voice, canSend
  ///   - actions: where everything the lab learns goes
  ///   - island: the named React Native island, placed in the scroll content's top
  public init(
    theme: KTheme,
    rows: [KLabRow],
    media: KLabMedia,
    strings: KLabStrings,
    bottomInset: CGFloat,
    driver: KLabDriver,
    actions: KLabActions,
    @ViewBuilder island: () -> Island
  ) {
    self.theme = theme
    self.rows = rows
    self.media = media
    self.strings = strings
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
    self.island = island()
  }

  public var body: some View {
    ScrollView {
      VStack(spacing: 0) {
        header
        LazyVStack(spacing: 0) {
          ForEach(rows) { row in
            KLabRowView(theme: theme, row: row, actions: actions)
              .equatable()
          }
        }
        .scrollTargetLayout()
      }
    }
    .scrollPosition($position)
    .defaultScrollAnchor(.bottom, for: .initialOffset)
    // follow the end only while at it: a row arriving while the reader is up in the history
    // must not move what they are reading
    .defaultScrollAnchor(chrome.isAtBottom ? UnitPoint.bottom : nil, for: .sizeChanges)
    .scrollDismissesKeyboard(.interactively)
    .kScrollChrome(chrome)
    .onScrollTargetVisibilityChange(idType: String.self, threshold: 0.2) { ids in
      // kept, not published: read when the scroll settles
      box.visible = Set(ids)
    }
    .onScrollPhaseChange { _, phase in
      if phase == .idle { reportTopRow() }
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      KLabDock(
        theme: theme,
        driver: driver,
        strings: strings,
        actions: actions,
        bottomInset: bottomInset,
        onFocus: { focused in report { $0.focused = focused } }
      )
    }
    .background { theme.bg.ignoresSafeArea() }
    .background {
      // the keyboard's inset: this reader extends under the keyboard, so its bottom inset is the
      // keyboard's overlap (the Host ignores every other safe area)
      GeometryReader { geo in
        Color.clear
          .onChange(of: geo.safeAreaInsets.bottom, initial: true) { _, inset in
            if driver.keyboardInset != inset { driver.keyboardInset = inset }
            report { $0.keyboardInset = inset }
          }
      }
      .ignoresSafeArea(.keyboard)
    }
    .onReceive(driver.$scrollRequest) { request in
      guard let request, request.serial > box.scrollSerial else { return }
      box.scrollSerial = request.serial
      scroll(to: request.target, animated: request.animated)
    }
    .onChange(of: chrome.isAtBottom, initial: true) { _, atBottom in
      report { $0.atBottom = atBottom }
    }
    .onChange(of: chrome.isNearTop) { _, near in
      if near { actions.onNearTop() }
    }
    .onAppear {
      chrome.onPullRelease = { [actions] depth in actions.onPullRelease(depth) }
    }
  }

  // ── the top of the scroll content: never lazy, so the island stays put ──
  private var header: some View {
    VStack(alignment: .leading, spacing: 14) {
      caption(strings.islandTitle)
      island
        .frame(maxWidth: .infinity, alignment: .leading)

      caption(strings.mediaTitle)
      HStack(alignment: .top, spacing: 10) {
        tile(media.asset, strings.assetCaption, placeholder: theme.soft2, mode: .fill)
        tile(media.remote, strings.remoteCaption, placeholder: theme.soft2, mode: .fill)
        tile(media.poster, strings.posterCaption, placeholder: theme.soft2, mode: .fill)
        // a transparent bird: no ground behind it, the whole bird shown
        tile(media.bird, strings.birdCaption, placeholder: .clear, mode: .fit)
      }

      caption(strings.voiceTitle)
      KLabVoice(theme: theme, driver: driver, strings: strings, actions: actions)

      KLabSwitch(theme: theme, label: strings.toggleLabel, onToggle: actions.onToggle)

      caption(strings.listTitle)
    }
    .padding(.horizontal, 16)
    .padding(.top, 16)
    .padding(.bottom, 6)
  }

  private func caption(_ text: String) -> some View {
    Text(text)
      .kText(.monoEyebrow)
      .foregroundStyle(theme.mute)
      .accessibilityAddTraits(.isHeader)
  }

  private func tile(_ ref: KImageRef?, _ label: String, placeholder: Color, mode: ContentMode) -> some View {
    VStack(spacing: 6) {
      KImage(ref, size: CGSize(width: Self.tileSize, height: Self.tileSize), contentMode: mode, placeholder: placeholder)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .circular))
      Text(label)
        .kText(.monoMeta)
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity)
    .accessibilityElement(children: .combine)
  }

  private func scroll(to target: KLabScrollTarget, animated: Bool) {
    let move = {
      switch target {
      case .top: position.scrollTo(edge: .top)
      case .end: position.scrollTo(edge: .bottom)
      case let .row(id): position.scrollTo(id: id, anchor: .center)
      }
    }
    if animated {
      withAnimation(.easeOut(duration: 0.25)) { move() }
    } else {
      move()
    }
  }

  /// The first row on screen, in the list's order, once the scroll settles.
  private func reportTopRow() {
    guard !box.visible.isEmpty, let top = rows.first(where: { box.visible.contains($0.id) }) else { return }
    report { $0.topRowId = top.id }
  }

  /// Changes the facts and tells the owner, only when they really changed.
  private func report(_ change: (inout KLabFacts) -> Void) {
    var next = box.facts
    change(&next)
    guard next != box.facts else { return }
    box.facts = next
    actions.onFacts(next)
  }
}

/// What the lab keeps without redrawing for it: the facts last reported, the rows on screen, the
/// last scroll request applied.
private final class KLabBox {
  var facts = KLabFacts()
  var visible: Set<String> = []
  var scrollSerial = 0
}

/// One chat line. Equatable on its row and theme, so a parent redraw doesn't redraw it; the
/// actions object is the same for the life of the surface.
private struct KLabRowView: View, Equatable {
  let theme: KTheme
  let row: KLabRow
  let actions: KLabActions

  static func == (a: KLabRowView, b: KLabRowView) -> Bool {
    a.row == b.row && a.theme == b.theme
  }

  var body: some View {
    VStack(alignment: row.mine ? .trailing : .leading, spacing: 4) {
      Text(row.body)
        .kText(.system(16, lineHeight: 1.35))
        .foregroundStyle(theme.ink)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background {
          RoundedRectangle(cornerRadius: KLab<EmptyView>.bubbleRadius, style: .circular)
            .fill(row.mine ? theme.lav2 : theme.sf)
        }
        .overlay {
          RoundedRectangle(cornerRadius: KLab<EmptyView>.bubbleRadius, style: .circular)
            .strokeBorder(theme.line, lineWidth: row.mine ? 0 : 1)
        }
        .kMenu(row.menu, preview: .rounded(KLab<EmptyView>.bubbleRadius)) { key in
          actions.onRowAction(row.id, key)
        }
      if !row.meta.isEmpty {
        Text(row.meta)
          .kText(.monoTime)
          .foregroundStyle(theme.mute)
      }
    }
    .frame(maxWidth: .infinity, alignment: row.mine ? .trailing : .leading)
    .padding(row.mine ? .leading : .trailing, 56)
    .padding(.horizontal, 16)
    .padding(.vertical, 5)
  }
}

/// The dock: the strip with its field and the round +, the + tray, the hint. It watches the
/// driver (canSend, the keyboard's inset); the list doesn't.
private struct KLabDock: View {
  let theme: KTheme
  @ObservedObject var driver: KLabDriver
  let strings: KLabStrings
  let actions: KLabActions
  let bottomInset: CGFloat
  let onFocus: (Bool) -> Void
  @State private var trayOpen = false

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      KReplyStrip(
        theme: theme,
        field: KField(
          theme: theme,
          controller: driver.reply,
          placeholder: strings.placeholder,
          returnSends: true,
          onChange: { actions.onDraft($0) },
          onSubmit: { actions.onSend($0) },
          onFocus: onFocus
        ),
        sendState: driver.canSend ? .enabled : .disabled,
        sendLabel: strings.sendLabel,
        onSend: { actions.onSend(driver.reply.text) }
      ) {
        KRoundTool(theme: theme, glyph: .plus(open: trayOpen), accessibilityLabel: strings.plusLabel) {
          withAnimation(.easeOut(duration: 0.2)) { trayOpen.toggle() }
        }
      }
      .padding(.trailing, KReplyStrip<EmptyView, EmptyView>.shadowOffset)

      if trayOpen {
        Text(strings.trayText)
          .kText(.smallBody)
          .foregroundStyle(theme.sub)
          .padding(12)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.soft))
          .transition(.opacity)
      }

      Text(strings.hint)
        .kText(.monoMeta)
        .foregroundStyle(theme.sub)
        .padding(.leading, 14)
    }
    .padding(.horizontal, 12)
    .padding(.top, 8)
    // on the home indicator while the keyboard is down, just above the keyboard while it is up
    .padding(.bottom, driver.keyboardInset > 0 ? 8 : max(8, bottomInset))
    .background(theme.bg)
  }
}

/// The voice card, watching the driver's playback.
private struct KLabVoice: View {
  let theme: KTheme
  @ObservedObject var driver: KLabDriver
  let strings: KLabStrings
  let actions: KLabActions

  var body: some View {
    KVoiceCard(
      theme: theme,
      playback: driver.playback,
      durationLabel: strings.voiceDuration,
      playLabel: strings.playLabel,
      pauseLabel: strings.pauseLabel,
      unavailable: driver.voiceUnavailable,
      onToggle: { actions.onVoiceToggle() }
    )
  }
}

/// The 10a switch with its label, for VoiceOver's reading of it.
private struct KLabSwitch: View {
  let theme: KTheme
  let label: String
  let onToggle: (Bool) -> Void
  @State private var on = false

  var body: some View {
    Toggle(isOn: $on) {
      Text(label)
        .kText(.rowLabel)
        .foregroundStyle(theme.ink)
    }
    .toggleStyle(KToggleStyle(theme: theme))
    .onChange(of: on) { _, now in onToggle(now) }
  }
}
