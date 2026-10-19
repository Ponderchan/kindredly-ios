// Portable: this file imports SwiftUI and Apple's camera and photo frameworks only (no Expo), so
// the 1.1.0 pure-Swift app can take it as is. The Stamp Press camera lives at the end of this file
// (MARK: STAMP PRESS) so the module needed no pod install; give it a file of its own at the next one.

import SwiftUI
import AVFoundation
import Photos
import PhotosUI

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
    // The dock sits UNDER the list, not in a safeAreaInset: with the inset, iOS 18 reports it
    // both as contentInsets.bottom and as a shorter containerSize, and scrollTo(edge: .bottom)
    // lands one dock-height past the end (measured: 117pt of blank). Stacked, the list has no
    // insets at all, its end is contentSize - containerSize, and the keyboard's safe area shrinks
    // the stack so the dock rides it.
    VStack(spacing: 0) {
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
      // .initialOffset lands short when the last rows' heights were only estimated at the first
      // layout (measured: 62pt short of the end with variable-height rows); once those rows have
      // been laid out, go to the real end, without animation, before anyone sees the difference
      settleAtEnd()
    }
  }

  /// Puts the list at its real end after the first layouts (see onAppear): twice, a runloop and
  /// a frame later, because the second pass can still change the last rows' heights.
  private func settleAtEnd() {
    DispatchQueue.main.async {
      position.scrollTo(edge: .bottom)
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
        position.scrollTo(edge: .bottom)
      }
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

// MARK: - STAMP PRESS · THE CAMERA (custom stamps, build agent A, 2026-10-19)

/*
 THE STAMP PRESS, V1 LIVE VIEWFINDER (the owner's final design: .claude/mock/stamp-press,
 CLAUDE-CODE-PROMPTS-STAMP-PRESS.md Prompt 3, with .claude/custom-stamps/PROMPTS.md Prompt 2 for
 the permission card and the crop page). React Native shows it through Adapters/KLabView.swift
 (KStampPressView, the /stamp-press route); the edit page that follows is not drawn here.

 One full-screen page, the tab bar hidden. The camera fills the screen (no darkroom colour on a
 phone with a camera: the ground is the picture). Over it, one big stamp: our v3 gear frame
 (a rounded rect with big half-circle bites, 3 across the top and bottom and 4 down each side),
 5:6, its white paper round a 4:5 window 10u from the paper's edge (on the 100 × 120 box: x 10–90,
 y 10–110). The window draws the mask: one even-odd path, the whole screen and more less the
 window, at rgba(20,18,42,.58), which moves with the stamp, so it can never sit out of line.
 Four lime corner marks inside the window say "what's in here is the stamp".

 Controls: × and the flash at the top; UPLOAD (the system photo picker, then the crop page),
 the lime shutter and ZOOM 1× / 2× at the bottom. No flip camera (owner).

 THE PRESS: t0 a white flash in the window (80ms) and a medium tap; t80 the picture freezes and
 the corner marks fold away; t500 the whole stamp slides down out of the slot under it, to .72 and
 -4° (.5s cubic-bezier(.3,1.2,.4,1)); t1000 the pressed photo goes to onPressed. Reduce Motion:
 the flash is a .1s fade, nothing slides, the page fades and hands over at t500.

 THE PHOTO (KPressedPhoto): the window's part of the picture, upright, 960 × 1200 (4:5, the long
 side 1200), drawn afresh into a new bitmap and encoded as JPEG, so no EXIF or location survives.
 The original never leaves this view. The camera's picture and the screen are both mapped by
 aspect-fill, the preview layer's own gravity (KStampPressGeometry.cropRect).

 ACCESS: not asked yet → our own card first (a blank stamp, "Your camera makes the stamp…",
 Allow camera, which brings up the system prompt, and Choose a photo instead); refused → the same
 card with Open Settings. No camera at all (the Simulator): a drawn stand-in scene fills the
 screen and the shutter presses that, so the whole flow can be walked without a lens.

 VoiceOver: the window is one element ("Camera view, the stamp's window"); the shutter is
 "Press the stamp"; UPLOAD is "Choose a photo"; the result is announced. The control row keeps
 its size at every Dynamic Type setting (icon buttons); the hint stops growing at xxLarge (≈1.35×).
 */

/// What the press made: the window's part of the picture, upright, 960 × 1200, no metadata.
public struct KPressedPhoto: Equatable {
  public enum Source: String, Sendable { case camera, library }
  /// the photo, 960 × 1200 at scale 1
  public let image: UIImage
  /// the same photo as JPEG (quality 0.9), with no EXIF
  public let jpeg: Data
  public let source: Source

  public init(image: UIImage, jpeg: Data, source: Source) {
    self.image = image
    self.jpeg = jpeg
    self.source = source
  }
}

/// Every word the press shows, already in the reader's language (src/data/strings-stamps2.ts,
/// the camera block). English here only so a preview has something to draw.
public struct KStampPressStrings: Equatable, Sendable {
  public var title = "STAMP PRESS"
  public var hint = "POINT AT THE MOMENT"
  public var upload = "UPLOAD"
  public var zoom = "ZOOM"
  public var close = "Close"
  public var flashOn = "Flash, on"
  public var flashOff = "Flash, off"
  public var shutter = "Press the stamp"
  public var viewfinder = "Camera view, the stamp's window"
  public var choosePhoto = "Choose a photo"
  /// "{n}" is 1 or 2
  public var zoomA11y = "Zoom, {n}×"
  public var permission = "Your camera makes the stamp. Nothing is saved until you choose to keep it."
  public var allow = "Allow camera"
  public var openSettings = "Open Settings"
  public var instead = "Choose a photo instead"
  /// a phone with no back camera
  public var noCamera = "No camera here. Choose a photo instead."
  public var cropHint = "DRAG TO MOVE · PINCH TO ZOOM"
  public var cropA11y = "The photo in the stamp's window. Drag to move it, pinch to zoom."
  public var useThis = "Use this"
  public var back = "Back"
  public var failed = "That didn't come through. Try again."
  public var pressed = "Pressed. Now name it."

  public init() {}
}

/// The numbers of the press: the stamp's frame and window, and how a picture maps onto them.
/// Pure, so the arithmetic can be checked away from a camera.
public enum KStampPressGeometry {
  /// 5:6
  public static func height(_ width: CGFloat) -> CGFloat { width * 1.2 }

  /// The 4:5 window in a stamp of this width: 10u in from the paper on the 100 × 120 box.
  public static func window(width w: CGFloat) -> CGRect {
    CGRect(x: w * 0.1, y: w * 0.1, width: w * 0.8, height: w)
  }

  /// The gear frame in `rect` (any 5:6 rect): a rounded rect, corner 7% of the width, with
  /// half-circle bites of 5% of the width centred on the edge, at 25 / 50 / 75% across the top and
  /// bottom and 20 / 40 / 60 / 80% down each side (the prototype's clip path, which is our v3
  /// frame's 3 + 4).
  public static func gear(in rect: CGRect) -> Path {
    let w = rect.width
    let h = rect.height
    guard w > 0, h > 0 else { return Path() }
    let body = Path(roundedRect: rect, cornerRadius: w * 0.07, style: .circular)
    let r = w * 0.05
    var bites = Path()
    for fx in [0.25, 0.5, 0.75] as [CGFloat] {
      for y in [rect.minY, rect.maxY] {
        bites.addEllipse(in: CGRect(x: rect.minX + w * fx - r, y: y - r, width: 2 * r, height: 2 * r))
      }
    }
    for fy in [0.2, 0.4, 0.6, 0.8] as [CGFloat] {
      for x in [rect.minX, rect.maxX] {
        bites.addEllipse(in: CGRect(x: x - r, y: rect.minY + h * fy - r, width: 2 * r, height: 2 * r))
      }
    }
    return body.subtracting(bites)
  }

  /// The stamp's width on a screen: the screen less 64, no taller than the room left for it, and
  /// never under 220 (an SE gives 311 × 373).
  public static func stampWidth(screen: CGSize, room: CGFloat) -> CGFloat {
    let byWidth = screen.width - 64
    let byHeight = room / 1.2
    return max(220, min(byWidth, byHeight))
  }

  /**
   The part of a picture of `imageSize` that shows in `window` (in the view's points) when the
   picture fills a view of `viewSize` by aspect-fill, centred (AVLayerVideoGravity
   .resizeAspectFill). In the picture's pixels, clamped to the picture.
   */
  public static func cropRect(imageSize: CGSize, viewSize: CGSize, window: CGRect) -> CGRect {
    guard imageSize.width > 0, imageSize.height > 0, viewSize.width > 0, viewSize.height > 0 else { return .zero }
    let s = max(viewSize.width / imageSize.width, viewSize.height / imageSize.height)
    let ox = (viewSize.width - imageSize.width * s) / 2
    let oy = (viewSize.height - imageSize.height * s) / 2
    let r = CGRect(x: (window.minX - ox) / s, y: (window.minY - oy) / s, width: window.width / s, height: window.height / s)
    return r.intersection(CGRect(origin: .zero, size: imageSize))
  }

  /// The output: 960 × 1200.
  public static let output = CGSize(width: 960, height: 1200)

  /// The part `crop` (pixels of an upright image) drawn into a new 960 × 1200 bitmap, JPEG 0.9.
  /// A fresh bitmap carries no EXIF and no location.
  public static func render(_ image: UIImage, crop: CGRect, source: KPressedPhoto.Source) -> KPressedPhoto? {
    guard crop.width > 1, crop.height > 1 else { return nil }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let out = output
    let k = out.width / crop.width
    let ky = out.height / crop.height
    let img = UIGraphicsImageRenderer(size: out, format: format).image { _ in
      UIColor.white.setFill()
      UIRectFill(CGRect(origin: .zero, size: out))
      image.draw(in: CGRect(x: -crop.minX * k, y: -crop.minY * ky, width: image.size.width * k, height: image.size.height * ky))
    }
    guard let data = img.jpegData(compressionQuality: 0.9) else { return nil }
    return KPressedPhoto(image: img, jpeg: data, source: source)
  }

  /// An upright copy at scale 1 (the camera's JPEG comes rotated by its EXIF orientation).
  public static func upright(_ image: UIImage) -> UIImage {
    if image.imageOrientation == .up, image.scale == 1 { return image }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let size = CGSize(width: image.size.width * image.scale, height: image.size.height * image.scale)
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: size))
    }
  }
}

/// The paper of the stamp, with the window cut out of it (so the picture shows through).
struct KPressPaper: Shape {
  /// drawn in the rect inset by this much (the white paper sits 2.5 inside the ink edge)
  var inset: CGFloat = 0
  var hole = true

  func path(in rect: CGRect) -> Path {
    let gear = KStampPressGeometry.gear(in: rect.insetBy(dx: inset, dy: inset * 1.2))
    guard hole else { return gear }
    let win = KStampPressGeometry.window(width: rect.width).offsetBy(dx: rect.minX, dy: rect.minY)
    return gear.subtracting(Path(win))
  }
}

/// The mask: everything but the window, `reach` points past the stamp on every side.
struct KPressMask: Shape {
  var reach: CGFloat = 2400

  func path(in rect: CGRect) -> Path {
    var p = Path(rect.insetBy(dx: -reach, dy: -reach))
    let win = KStampPressGeometry.window(width: rect.width).offsetBy(dx: rect.minX, dy: rect.minY)
    p.addRoundedRect(in: win, cornerSize: CGSize(width: 2, height: 2))
    return p
  }
}

/// The camera: one back wide camera, one photo output, run on a queue of its own.
final class KPressCamera: NSObject, ObservableObject, AVCapturePhotoCaptureDelegate {
  /// standIn: the Simulator (a drawn scene to press); noLens: a real phone with no back camera
  enum Access: Equatable { case unknown, ask, denied, live, standIn, noLens }

  @Published var access: Access = .unknown
  @Published var hasFlash = false

  let session = AVCaptureSession()
  private let queue = DispatchQueue(label: "app.kindredly.stamp-press")
  private let output = AVCapturePhotoOutput()
  private var device: AVCaptureDevice?
  private var configured = false
  private var pending: ((UIImage?) -> Void)?
  /// the preview's layer, to freeze the picture at the press (set by KPressPreview)
  weak var previewLayer: AVCaptureVideoPreviewLayer?

  static var lens: AVCaptureDevice? {
    AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
  }

  /// Reads the permission and starts the camera when it may.
  func refresh() {
    let lens = Self.lens
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      if lens == nil {
        #if targetEnvironment(simulator)
        access = .standIn
        #else
        access = .noLens
        #endif
      } else {
        access = .live
        start()
      }
    case .notDetermined:
      access = .ask
    default:
      access = .denied
    }
  }

  /// The system prompt (from the card's Allow camera).
  func ask() {
    AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
      DispatchQueue.main.async {
        guard let self else { return }
        if granted { self.refresh() } else { self.access = .denied }
      }
    }
  }

  func start() {
    queue.async { [weak self] in
      guard let self else { return }
      if !self.configured { self.configure() }
      if self.configured, !self.session.isRunning { self.session.startRunning() }
    }
  }

  func stop() {
    queue.async { [weak self] in
      guard let self, self.session.isRunning else { return }
      self.session.stopRunning()
    }
  }

  private func configure() {
    guard let lens = Self.lens, let input = try? AVCaptureDeviceInput(device: lens) else { return }
    session.beginConfiguration()
    session.sessionPreset = .photo
    if session.canAddInput(input) { session.addInput(input) }
    if session.canAddOutput(output) { session.addOutput(output) }
    output.maxPhotoQualityPrioritization = .balanced
    session.commitConfiguration()
    device = lens
    configured = true
    let flash = lens.hasFlash
    DispatchQueue.main.async { [weak self] in self?.hasFlash = flash }
  }

  /// 1× or 2× (2× or the lens's most, whichever is less), eased.
  func zoom(two: Bool) {
    queue.async { [weak self] in
      guard let d = self?.device, (try? d.lockForConfiguration()) != nil else { return }
      let f = two ? min(2, d.maxAvailableVideoZoomFactor) : 1
      d.ramp(toVideoZoomFactor: f, withRate: 8)
      d.unlockForConfiguration()
    }
  }

  /// Holds the picture still on screen (the preview stops taking frames).
  func freeze() {
    previewLayer?.connection?.isEnabled = false
  }

  func thaw() {
    previewLayer?.connection?.isEnabled = true
  }

  /// Takes the photo; `done` gets it upright on the main queue, or nil.
  func capture(flash: Bool, done: @escaping (UIImage?) -> Void) {
    queue.async { [weak self] in
      guard let self, self.configured, self.session.isRunning else {
        DispatchQueue.main.async { done(nil) }
        return
      }
      let settings = AVCapturePhotoSettings()
      if flash, self.output.supportedFlashModes.contains(.on) { settings.flashMode = .on }
      self.pending = done
      self.output.capturePhoto(with: settings, delegate: self)
    }
  }

  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    var image: UIImage?
    if error == nil, let data = photo.fileDataRepresentation(), let raw = UIImage(data: data) {
      image = KStampPressGeometry.upright(raw)
    }
    let done = pending
    pending = nil
    DispatchQueue.main.async { done?(image) }
  }
}

/// The live picture, filling its frame by aspect-fill.
final class KPressPreviewView: UIView {
  override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
  var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
}

struct KPressPreview: UIViewRepresentable {
  let camera: KPressCamera

  func makeUIView(context: Context) -> KPressPreviewView {
    let v = KPressPreviewView()
    v.backgroundColor = .black
    v.previewLayer.session = camera.session
    v.previewLayer.videoGravity = .resizeAspectFill
    camera.previewLayer = v.previewLayer
    return v
  }

  func updateUIView(_ uiView: KPressPreviewView, context: Context) {}
}

/// What the screen shows where there is no camera (the Simulator): a drawn morning, so the
/// viewfinder, the press and the crop can all be tried. It fills its frame, as the camera does.
struct KPressStandIn: View {
  /// the Simulator only, never a reader: not translated
  let label = "SIMULATOR · NO CAMERA"

  var body: some View {
    GeometryReader { g in
      let w = g.size.width
      let h = g.size.height
      ZStack {
        LinearGradient(colors: [Color(hex: "#9EC5E8"), Color(hex: "#F6D9C6")], startPoint: .top, endPoint: .bottom)
        Circle().fill(Color(hex: "#FFD66B")).frame(width: w * 0.32, height: w * 0.32).position(x: w * 0.66, y: h * 0.4)
        Path { p in
          p.move(to: CGPoint(x: 0, y: h * 0.62))
          p.addQuadCurve(to: CGPoint(x: w, y: h * 0.58), control: CGPoint(x: w * 0.45, y: h * 0.46))
          p.addLine(to: CGPoint(x: w, y: h))
          p.addLine(to: CGPoint(x: 0, y: h))
          p.closeSubpath()
        }
        .fill(Color(hex: "#7DB387"))
        Path { p in
          p.move(to: CGPoint(x: 0, y: h * 0.74))
          p.addQuadCurve(to: CGPoint(x: w, y: h * 0.7), control: CGPoint(x: w * 0.6, y: h * 0.62))
          p.addLine(to: CGPoint(x: w, y: h))
          p.addLine(to: CGPoint(x: 0, y: h))
          p.closeSubpath()
        }
        .fill(Color(hex: "#4E8A5C"))
        Text(label)
          .font(.system(size: 10, weight: .semibold, design: .monospaced))
          .tracking(1.4)
          .foregroundStyle(Color.white.opacity(0.85))
          .position(x: w / 2, y: h * 0.88)
      }
    }
    .accessibilityHidden(true)
  }
}

/// The system photo picker, shown over whatever is on top (the press sits in a React Native
/// modal, so a SwiftUI sheet would have no controller of its own to present from).
final class KPressPickerPresenter: NSObject, PHPickerViewControllerDelegate {
  private var done: ((UIImage?) -> Void)?
  private static var current: KPressPickerPresenter?

  static func present(_ done: @escaping (UIImage?) -> Void) {
    var config = PHPickerConfiguration()
    config.filter = .images
    config.selectionLimit = 1
    config.preferredAssetRepresentationMode = .current
    let picker = PHPickerViewController(configuration: config)
    let me = KPressPickerPresenter()
    me.done = done
    current = me
    picker.delegate = me
    guard let top = topController() else {
      current = nil
      done(nil)
      return
    }
    top.present(picker, animated: true)
  }

  static func topController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let window = scenes.flatMap(\.windows).first { $0.isKeyWindow } ?? scenes.first?.windows.first
    var top = window?.rootViewController
    while let next = top?.presentedViewController { top = next }
    return top
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    let finish: (UIImage?) -> Void = { [weak self] image in
      DispatchQueue.main.async {
        self?.done?(image.map(KStampPressGeometry.upright))
        self?.done = nil
        KPressPickerPresenter.current = nil
      }
    }
    guard let provider = results.first?.itemProvider, provider.canLoadObject(ofClass: UIImage.self) else {
      finish(nil)
      return
    }
    provider.loadObject(ofClass: UIImage.self) { object, _ in
      finish(object as? UIImage)
    }
  }
}

/// The newest photo in the library as a small square, only when the library is already open to
/// the app (it never asks for that just to draw a thumbnail).
enum KPressThumb {
  static func load(_ done: @escaping (UIImage?) -> Void) {
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    guard status == .authorized || status == .limited else { return done(nil) }
    let options = PHFetchOptions()
    options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    options.fetchLimit = 1
    guard let asset = PHAsset.fetchAssets(with: .image, options: options).firstObject else { return done(nil) }
    let req = PHImageRequestOptions()
    req.deliveryMode = .opportunistic
    req.isNetworkAccessAllowed = false
    PHImageManager.default().requestImage(for: asset, targetSize: CGSize(width: 132, height: 132), contentMode: .aspectFill, options: req) { image, _ in
      DispatchQueue.main.async { done(image) }
    }
  }
}

/// THE STAMP PRESS PAGE (see the comment at the top of this section).
public struct KStampPressCamera: View {
  private let strings: KStampPressStrings
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let onClose: () -> Void
  private let onPressed: (KPressedPhoto) -> Void

  @StateObject private var camera = KPressCamera()
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var scenePhase

  @State private var flashOn = false
  @State private var twoX = false
  @State private var hintShown = true
  @State private var cornersShown = true
  @State private var flashOpacity: Double = 0
  @State private var frozen: UIImage?
  @State private var slid = false
  @State private var handing = false
  @State private var busy = false
  @State private var tap = 0
  @State private var thumb: UIImage?
  @State private var failedShown = false
  // the crop page (a photo from the library)
  @State private var cropping: UIImage?
  @State private var cropScale: CGFloat = 1
  @State private var cropScaleBase: CGFloat = 1
  @State private var cropOffset: CGSize = .zero
  @State private var cropOffsetBase: CGSize = .zero
  // where the window is on screen, and the screen (for the camera's crop)
  @State private var windowOnScreen: CGRect = .zero
  @State private var screen: CGSize = .zero

  private static let ink = Color(hex: "#1E1B35")
  private static let room = Color(hex: "#14122A")
  private static let maskColor = Color(red: 20 / 255, green: 18 / 255, blue: 42 / 255)

  public init(
    strings: KStampPressStrings,
    topInset: CGFloat,
    bottomInset: CGFloat,
    onClose: @escaping () -> Void,
    onPressed: @escaping (KPressedPhoto) -> Void
  ) {
    self.strings = strings
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.onClose = onClose
    self.onPressed = onPressed
  }

  private var canPress: Bool {
    !busy && (cropping != nil || camera.access == .live || camera.access == .standIn)
  }

  private var showsCard: Bool {
    cropping == nil && frozen == nil && (camera.access == .ask || camera.access == .denied)
  }

  public var body: some View {
    GeometryReader { g in
      let size = g.size
      // the room the stamp may take: below the top row, above the controls
      let top = topInset + 8 + 44 + 44
      let below: CGFloat = 12 + 2 + 14 + 16 + 20
      // the permission card (words + Allow + Choose a photo, Dynamic Type capped at AX1) is
      // taller than the control row: reserve its room or "Choose a photo instead" falls off an SE
      let controls = bottomInset + 24 + (showsCard ? 196 : 96)
      let sw = KStampPressGeometry.stampWidth(screen: size, room: size.height - top - below - controls)
      ZStack(alignment: .top) {
        Self.room
        picture(size: size)
        VStack(spacing: 0) {
          topRow
            .padding(.top, topInset + 8)
            .padding(.horizontal, 20)
            .opacity(handing ? 0 : 1)
            // above the stamp's mask, which reaches over the whole screen
            .zIndex(1)
          Spacer().frame(height: 44)
          stamp(width: sw)
          slotAndHint(width: sw)
            .opacity(handing ? 0 : 1)
          Spacer(minLength: 0)
          if showsCard {
            card
              .padding(.horizontal, 32)
              .padding(.bottom, bottomInset + 24)
          } else {
            controlRow
              .padding(.horizontal, 40)
              .padding(.bottom, bottomInset + 24)
              .opacity(handing ? 0 : 1)
          }
        }
      }
      .coordinateSpace(name: "stampPress")
      .onAppear { screen = size }
      .onChange(of: size) { _, now in screen = now }
    }
    .ignoresSafeArea()
    .environment(\.colorScheme, .dark)
    .sensoryFeedback(.impact(weight: .medium), trigger: tap)
    .onAppear {
      camera.refresh()
      KPressThumb.load { thumb = $0 }
      DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
        withAnimation(.easeOut(duration: 0.6)) { hintShown = false }
      }
    }
    .onDisappear { camera.stop() }
    .onChange(of: scenePhase) { _, phase in
      // back from Settings, or the app coming forward: read the permission again
      if phase == .active, frozen == nil, cropping == nil { camera.refresh() }
    }
  }

  // MARK: the picture behind everything

  @ViewBuilder
  private func picture(size: CGSize) -> some View {
    if cropping == nil {
      switch camera.access {
      case .live:
        KPressPreview(camera: camera)
          .frame(width: size.width, height: size.height)
          .accessibilityHidden(true)
      case .standIn:
        KPressStandIn()
          .frame(width: size.width, height: size.height)
          .scaleEffect(twoX ? 2 : 1)
          .clipped()
      default:
        EmptyView()
      }
    }
  }

  // MARK: the top row

  private var topRow: some View {
    HStack {
      Button(action: close) {
        Circle()
          .strokeBorder(Color.white, lineWidth: 1.5)
          .frame(width: 44, height: 44)
          .overlay(KLineIcon(.close, size: 18, lineWidth: 2, color: .white))
          .contentShape(Circle())
      }
      .buttonStyle(KPressScaleStyle())
      .accessibilityLabel(cropping != nil ? strings.back : strings.close)
      Spacer()
      Text(strings.title)
        .kText(.mono(10, tracking: 0.16))
        .foregroundStyle(Color.white.opacity(0.7))
        .lineLimit(1)
        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
        .accessibilityAddTraits(.isHeader)
      Spacer()
      Button { flashOn.toggle() } label: {
        Circle()
          .strokeBorder(Color.white, lineWidth: 1.5)
          .frame(width: 44, height: 44)
          .overlay(Self.bolt.stroke(flashOn ? KBrand.lime : Color.white, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)).frame(width: 18, height: 18))
          .contentShape(Circle())
      }
      .buttonStyle(KPressScaleStyle())
      .opacity(flashButtonShown ? 1 : 0)
      .disabled(!flashButtonShown)
      .accessibilityHidden(!flashButtonShown)
      .accessibilityLabel(flashOn ? strings.flashOn : strings.flashOff)
    }
    .frame(height: 44)
  }

  private var flashButtonShown: Bool {
    cropping == nil && camera.access == .live && camera.hasFlash
  }

  /// the prototype's bolt, M13 2L5 14h6l-1 8 8-12h-6z on the 24 grid
  private static let bolt = KPressBolt()

  // MARK: the stamp

  private func stamp(width sw: CGFloat) -> some View {
    let sh = KStampPressGeometry.height(sw)
    let win = KStampPressGeometry.window(width: sw)
    return ZStack(alignment: .topLeading) {
      // what is in the window: the frozen press, the photo being cropped, or nothing (the live
      // picture behind shows through)
      Group {
        if let frozen {
          Image(uiImage: frozen).resizable().interpolation(.high)
            .accessibilityHidden(true)
        } else if let cropping {
          cropContent(cropping, window: win.size)
        } else if showsCard {
          Self.room.overlay(KLineIcon(.camera, size: 28, lineWidth: 1.9, color: Color.white.opacity(0.8)))
            .accessibilityHidden(true)
        } else {
          // the live picture shows through here: one element for VoiceOver
          Color.clear
            .contentShape(Rectangle())
            .accessibilityElement()
            .accessibilityLabel(strings.viewfinder)
            .accessibilityAddTraits(.isImage)
        }
      }
      .frame(width: win.width, height: win.height)
      .clipShape(RoundedRectangle(cornerRadius: 2))
      .offset(x: win.minX, y: win.minY)

      // the paper: the ink edge, then the white 2.5 inside it, both with the window cut out
      KPressPaper(inset: 0).fill(Self.ink, style: FillStyle(eoFill: false))
        .frame(width: sw, height: sh)
        .allowsHitTesting(false)
      KPressPaper(inset: 2.5).fill(Color.white)
        .frame(width: sw, height: sh)
        .allowsHitTesting(false)
      if showsCard {
        // the card's blank stamp: a dashed keyline inside the paper
        RoundedRectangle(cornerRadius: 2)
          .stroke(Color.white.opacity(0.6), style: StrokeStyle(lineWidth: 2, dash: [8, 6]))
          .frame(width: win.width - 12, height: win.height - 12)
          .offset(x: win.minX + 6, y: win.minY + 6)
          .allowsHitTesting(false)
      }

      // the mask grows from the window: everything else under .58 (.6 on the crop page)
      KPressMask()
        .fill(Self.maskColor.opacity(cropping != nil ? 0.6 : 0.58), style: FillStyle(eoFill: true))
        .frame(width: sw, height: sh)
        .allowsHitTesting(false)
        .accessibilityHidden(true)

      corners(window: win)
        .allowsHitTesting(false)

      Color.white
        .opacity(flashOpacity)
        .frame(width: win.width, height: win.height)
        .offset(x: win.minX, y: win.minY)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
    .frame(width: sw, height: sh, alignment: .topLeading)
    .scaleEffect(slid ? 0.72 : 1)
    .rotationEffect(.degrees(slid ? -4 : 0))
    .offset(y: slid ? sh * 0.42 : 0)
    .onGeometryChange(for: CGRect.self) { proxy in
      proxy.frame(in: .named("stampPress"))
    } action: { frame in
      // the window on screen, for mapping the camera's photo (only while the stamp stands still)
      if !slid { windowOnScreen = win.offsetBy(dx: frame.minX, dy: frame.minY) }
    }
  }

  private func corners(window win: CGRect) -> some View {
    let l: CGFloat = 12
    let i: CGFloat = 10
    return ZStack(alignment: .topLeading) {
      ForEach(0..<4, id: \.self) { k in
        let right = k % 2 == 1
        let bottom = k >= 2
        KPressCorner(right: right, bottom: bottom)
          .stroke(KBrand.lime, style: StrokeStyle(lineWidth: 2, lineCap: .square))
          .frame(width: l, height: l)
          .offset(
            x: right ? win.maxX - i - l : win.minX + i,
            y: bottom ? win.maxY - i - l : win.minY + i
          )
      }
    }
    .scaleEffect(cornersShown ? 1 : 0.001, anchor: .center)
    .opacity(cornersShown && !showsCard ? 1 : 0)
    .accessibilityHidden(true)
  }

  private func slotAndHint(width sw: CGFloat) -> some View {
    VStack(spacing: 14) {
      // the slot the pressed stamp slides out of
      Rectangle().fill(Color.white.opacity(0.25)).frame(width: sw, height: 2)
      Text(cropping != nil ? strings.cropHint : (camera.access == .noLens ? strings.noCamera : strings.hint))
        .kText(.mono(10, tracking: 0.14))
        .foregroundStyle(Color.white.opacity(0.8))
        .multilineTextAlignment(.center)
        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
        .opacity(failedShown ? 0 : ((hintShown || cropping != nil || camera.access == .noLens) && !showsCard ? 1 : 0))
        .overlay {
          if failedShown {
            Text(strings.failed)
              .kText(.mono(10, tracking: 0.14))
              .foregroundStyle(Color.white)
              .multilineTextAlignment(.center)
              .dynamicTypeSize(...DynamicTypeSize.xxLarge)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .accessibilityHidden(!hintShown && cropping == nil && !failedShown && camera.access != .noLens)
    }
    .padding(.top, 12)
  }

  // MARK: the controls

  private var controlRow: some View {
    Group {
      if cropping != nil {
        HStack(spacing: 14) {
          Button(action: leaveCrop) {
            Text(strings.back)
              .font(.system(size: 16, weight: .semibold))
              .foregroundStyle(Color.white)
              .frame(maxWidth: .infinity, minHeight: 52)
              .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.white.opacity(0.85), lineWidth: 1.5))
              .contentShape(RoundedRectangle(cornerRadius: 16))
          }
          .buttonStyle(KPressScaleStyle(scale: 0.97))
          Button(action: useCrop) {
            Text(strings.useThis)
              .font(.system(size: 16, weight: .semibold))
              .foregroundStyle(KBrand.inkOnBrand)
              .frame(maxWidth: .infinity, minHeight: 52)
              .background(RoundedRectangle(cornerRadius: 16).fill(KBrand.lime))
              // the hard shadow sits BEHIND the lime (a later .background is further back)
              .background(
                RoundedRectangle(cornerRadius: 16).fill(Color.black.opacity(0.5)).offset(x: 4, y: 4)
              )
              .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Self.ink, lineWidth: 2.5))
              .contentShape(RoundedRectangle(cornerRadius: 16))
          }
          .buttonStyle(KPressScaleStyle(scale: 0.97))
          .disabled(busy)
        }
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      } else {
        HStack(alignment: .center, spacing: 0) {
          uploadButton.frame(maxWidth: .infinity)
          shutter.frame(maxWidth: .infinity)
          zoomButton.frame(maxWidth: .infinity)
        }
        // icon buttons: they keep their size at every Dynamic Type setting
        .dynamicTypeSize(.large)
      }
    }
    .frame(minHeight: 96)
  }

  private var uploadButton: some View {
    Button(action: pick) {
      VStack(spacing: 5) {
        RoundedRectangle(cornerRadius: 10)
          .fill(Color.white.opacity(0.08))
          .frame(width: 44, height: 44)
          .overlay {
            if let thumb {
              Image(uiImage: thumb).resizable().scaledToFill().frame(width: 44, height: 44).clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
              KLineIcon(.picture, size: 22, lineWidth: 1.9, color: .white)
            }
          }
          .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Color.white.opacity(0.85), lineWidth: 1.5))
        Text(strings.upload)
          .kText(.mono(8, tracking: 0.14))
          .foregroundStyle(Color.white.opacity(0.75))
          .lineLimit(1)
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(KPressScaleStyle())
    .disabled(busy)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(strings.choosePhoto)
    .accessibilityAddTraits(.isButton)
  }

  private var shutter: some View {
    Button(action: press) {
      ZStack {
        Circle().fill(Color.black.opacity(0.5)).offset(x: 4, y: 4)
        Circle().fill(KBrand.lime)
        Circle().strokeBorder(Self.ink, lineWidth: 2.5)
        Circle().strokeBorder(Self.ink, lineWidth: 1.5).frame(width: 60, height: 60)
      }
      .frame(width: 76, height: 76)
      .contentShape(Circle())
    }
    .buttonStyle(KPressScaleStyle())
    .disabled(!canPress)
    .opacity(canPress || busy ? 1 : 0.5)
    .accessibilityLabel(strings.shutter)
  }

  private var zoomButton: some View {
    Button(action: toggleZoom) {
      VStack(spacing: 5) {
        Circle()
          .fill(twoX ? KBrand.lime.opacity(0.9) : Color.clear)
          .frame(width: 44, height: 44)
          .overlay(Circle().strokeBorder(Color.white.opacity(0.85), lineWidth: 1.5))
          .overlay(
            Text(twoX ? "2×" : "1×")
              .kText(.mono(11))
              .foregroundStyle(twoX ? KBrand.inkOnBrand : Color.white)
          )
        Text(strings.zoom)
          .kText(.mono(8, tracking: 0.14))
          .foregroundStyle(Color.white.opacity(0.75))
          .lineLimit(1)
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(KPressScaleStyle())
    .disabled(busy || !(camera.access == .live || camera.access == .standIn))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(strings.zoomA11y.replacingOccurrences(of: "{n}", with: twoX ? "2" : "1"))
    .accessibilityAddTraits(.isButton)
  }

  // MARK: the permission card

  private var card: some View {
    VStack(spacing: 14) {
      Text(strings.permission)
        .font(.system(size: 15, weight: .regular))
        .foregroundStyle(Color.white)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
      Button(action: camera.access == .denied ? openSettings : camera.ask) {
        Text(camera.access == .denied ? strings.openSettings : strings.allow)
          .font(.system(size: 16, weight: .semibold))
          .foregroundStyle(KBrand.inkOnBrand)
          .frame(maxWidth: .infinity, minHeight: 52)
          .background(RoundedRectangle(cornerRadius: 16).fill(KBrand.lime))
          .background(RoundedRectangle(cornerRadius: 16).fill(Color.black.opacity(0.5)).offset(x: 4, y: 4))
          .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Self.ink, lineWidth: 2.5))
          .contentShape(RoundedRectangle(cornerRadius: 16))
      }
      .buttonStyle(KPressScaleStyle(scale: 0.97))
      Button(action: pick) {
        Text(strings.instead)
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(Color.white)
          .frame(maxWidth: .infinity, minHeight: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KPressScaleStyle(scale: 0.97))
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  // MARK: the crop page's photo

  private func cropContent(_ image: UIImage, window: CGSize) -> some View {
    let base = Self.fillScale(image.size, window)
    let k = base * cropScale
    return Image(uiImage: image)
      .resizable()
      .interpolation(.high)
      .frame(width: image.size.width * k, height: image.size.height * k)
      .offset(cropOffset)
      .frame(width: window.width, height: window.height)
      .contentShape(Rectangle())
      .gesture(
        DragGesture()
          .onChanged { v in
            cropOffset = Self.clampOffset(
              CGSize(width: cropOffsetBase.width + v.translation.width, height: cropOffsetBase.height + v.translation.height),
              image: image.size, window: window, scale: cropScale)
          }
          .onEnded { _ in cropOffsetBase = cropOffset }
          .simultaneously(with:
            MagnifyGesture()
              .onChanged { v in
                cropScale = min(6, max(1, cropScaleBase * v.magnification))
                cropOffset = Self.clampOffset(cropOffset, image: image.size, window: window, scale: cropScale)
              }
              .onEnded { _ in
                cropScaleBase = cropScale
                cropOffsetBase = cropOffset
              }
          )
      )
      .accessibilityElement()
      .accessibilityLabel(strings.cropA11y)
      .accessibilityAddTraits(.isImage)
      .accessibilityAdjustableAction { dir in
        // VoiceOver: swipe up / down zooms
        cropScale = min(6, max(1, cropScale * (dir == .increment ? 1.2 : 1 / 1.2)))
        cropScaleBase = cropScale
        cropOffset = Self.clampOffset(cropOffset, image: image.size, window: window, scale: cropScale)
        cropOffsetBase = cropOffset
      }
  }

  /// the scale at which the picture just covers the window
  static func fillScale(_ image: CGSize, _ window: CGSize) -> CGFloat {
    guard image.width > 0, image.height > 0 else { return 1 }
    return max(window.width / image.width, window.height / image.height)
  }

  /// keeps the window covered: the picture's edges never come inside it
  static func clampOffset(_ o: CGSize, image: CGSize, window: CGSize, scale: CGFloat) -> CGSize {
    let k = fillScale(image, window) * scale
    let mx = max(0, (image.width * k - window.width) / 2)
    let my = max(0, (image.height * k - window.height) / 2)
    return CGSize(width: min(mx, max(-mx, o.width)), height: min(my, max(-my, o.height)))
  }

  /// the crop page's window in the picture's pixels
  static func cropRect(image: CGSize, window: CGSize, scale: CGFloat, offset: CGSize) -> CGRect {
    let k = fillScale(image, window) * scale
    guard k > 0 else { return .zero }
    // the picture's top-left in the window's points
    let ox = window.width / 2 + offset.width - image.width * k / 2
    let oy = window.height / 2 + offset.height - image.height * k / 2
    let r = CGRect(x: -ox / k, y: -oy / k, width: window.width / k, height: window.height / k)
    return r.intersection(CGRect(origin: .zero, size: image))
  }

  // MARK: actions

  private func close() {
    if cropping != nil { return leaveCrop() }
    camera.stop()
    onClose()
  }

  private func toggleZoom() {
    twoX.toggle()
    if camera.access == .live { camera.zoom(two: twoX) }
  }

  private func openSettings() {
    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
  }

  private func pick() {
    guard !busy else { return }
    KPressPickerPresenter.present { image in
      guard let image else { return }
      camera.stop()
      cropScale = 1
      cropScaleBase = 1
      cropOffset = .zero
      cropOffsetBase = .zero
      failedShown = false
      cropping = image
    }
  }

  private func leaveCrop() {
    guard !busy else { return }
    cropping = nil
    camera.refresh()
  }

  private func useCrop() {
    guard let image = cropping, !busy else { return }
    let win = windowOnScreen.size
    let crop = Self.cropRect(image: image.size, window: win, scale: cropScale, offset: cropOffset)
    busy = true
    strike()
    guard let pressed = KStampPressGeometry.render(image, crop: crop, source: .library) else {
      busy = false
      return showFailed()
    }
    frozen = pressed.image
    run(pressed)
  }

  /// the shutter
  private func press() {
    guard canPress, cropping == nil else { return }
    busy = true
    failedShown = false
    strike()
    let window = windowOnScreen
    let view = screen
    if camera.access == .standIn {
      let renderer = ImageRenderer(content:
        KPressStandIn()
          .frame(width: view.width, height: view.height)
          .scaleEffect(twoX ? 2 : 1)
          .clipped()
      )
      renderer.scale = 2
      guard let shot = renderer.uiImage.map(KStampPressGeometry.upright),
            let pressed = KStampPressGeometry.render(shot, crop: KStampPressGeometry.cropRect(imageSize: shot.size, viewSize: view, window: window), source: .camera)
      else {
        busy = false
        return showFailed()
      }
      frozen = pressed.image
      return run(pressed)
    }
    // t80: the picture holds still
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) { camera.freeze() }
    let started = Date()
    camera.capture(flash: flashOn) { shot in
      guard let shot,
            let pressed = KStampPressGeometry.render(shot, crop: KStampPressGeometry.cropRect(imageSize: shot.size, viewSize: view, window: window), source: .camera)
      else {
        camera.thaw()
        withAnimation(.easeOut(duration: 0.2)) { cornersShown = true }
        busy = false
        return showFailed()
      }
      frozen = pressed.image
      camera.stop()
      run(pressed, elapsed: Date().timeIntervalSince(started))
    }
  }

  /// t0: the white flash in the window and the tap (the ka-chunk)
  private func strike() {
    tap += 1
    flashOpacity = 0.9
    withAnimation(.linear(duration: reduceMotion ? 0.1 : 0.08)) { flashOpacity = 0 }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
      withAnimation(.easeIn(duration: 0.2)) { cornersShown = false }
    }
  }

  /// t500 the slide, t1000 the hand-over (Reduce Motion: a fade, the hand-over at t500)
  private func run(_ pressed: KPressedPhoto, elapsed: TimeInterval = 0) {
    AccessibilityNotification.Announcement(strings.pressed).post()
    if reduceMotion {
      let wait = max(0.15, 0.3 - elapsed)
      DispatchQueue.main.asyncAfter(deadline: .now() + wait) {
        withAnimation(.easeInOut(duration: 0.2)) { handing = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { onPressed(pressed) }
      }
      return
    }
    let wait = max(0.05, 0.5 - elapsed)
    DispatchQueue.main.asyncAfter(deadline: .now() + wait) {
      withAnimation(.timingCurve(0.3, 1.2, 0.4, 1, duration: 0.5)) { slid = true }
      withAnimation(.easeOut(duration: 0.3)) { handing = true }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { onPressed(pressed) }
    }
  }

  private func showFailed() {
    withAnimation(.easeOut(duration: 0.2)) { failedShown = true }
    AccessibilityNotification.Announcement(strings.failed).post()
    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
      withAnimation(.easeOut(duration: 0.4)) { failedShown = false }
    }
  }
}

/// one corner mark: an L, 12 × 12
struct KPressCorner: Shape {
  let right: Bool
  let bottom: Bool

  func path(in rect: CGRect) -> Path {
    var p = Path()
    let x0 = right ? rect.maxX : rect.minX
    let y0 = bottom ? rect.maxY : rect.minY
    p.move(to: CGPoint(x: right ? rect.minX : rect.maxX, y: y0))
    p.addLine(to: CGPoint(x: x0, y: y0))
    p.addLine(to: CGPoint(x: x0, y: bottom ? rect.minY : rect.maxY))
    return p
  }
}

/// the flash key's bolt: M13 2L5 14h6l-1 8 8-12h-6z on the 24 grid
struct KPressBolt: Shape {
  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * s, y: rect.minY + y * s) }
    var p = Path()
    p.move(to: pt(13, 2))
    p.addLine(to: pt(5, 14))
    p.addLine(to: pt(11, 14))
    p.addLine(to: pt(10, 22))
    p.addLine(to: pt(18, 10))
    p.addLine(to: pt(12, 10))
    p.closeSubpath()
    return p
  }
}
