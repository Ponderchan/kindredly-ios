// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN'S JOURNEY (the courier page, /courier; owner 2026-10-26, binary 1.2.6 = App Store 1.0.7),
 drawn by SwiftUI over the React Native page's content (components/WrenHome). Every word, fact
 and colour is TS's (src/screens/courier/courier-model.ts); she is her own WrenBird, handed over
 as snapshots (lib/bird-images heroPose / rackSkinPose / rackAccessoryPose), never a drawing of
 Swift's. This draws them and reports taps; its own state is only what opens on the page (her
 flight log, the tracking slip, the rack) and her perch's gestures.

   ┌ status strip (the hour's sky) ─────────────────────────────┐
   │ ‹            Wren's Journey                       DAY 12   │ the header rides the cover
   │                 (sky: discs, stars, sun or moon;            │ and scrolls away with it
   │                  her day off: two pairs of pillars)         │
   │                        (her, 186, on the perch)            │
   │ [her line ▾]                         DRAG HER · TAP…  [▶ Play]
   ├ band: ● On a delivery / Luna · Sep 20              (Track) ┤
   │ (flight log) (tracking slip)                                │ objects: rule B's depth
   │ Wren                                                        │
   │ YOUR COURIER · HATCH                                        │
   │ (◷ Hatched Sep 20) (→ 1 letter to fledge)                   │ soft capsules
   │ JOURNEY  ●───────○───────○  Hatch · Fledge · Grown          │
   │ RECENT KEEPSAKES                              All 4 →       │
   │ [LOOKS Sky 2/5] [DRESS Bare 3/7]  → the rack beneath        │
   │ (First Class card)                                          │
   └─────────────────────────────────────────────────────────────┘

 THE COVER keeps the hour's colours in every theme (her sky is not the theme's), so what is drawn
 on it keeps fixed colours; only the page under the band follows the theme (its ground is lav2,
 the React Native page's penWash).

 RULE B (owner, 2026-10-26). Controls are flat: the stage's two facts and Track are soft
 capsules, Play keeps its lime fill without an ink edge or a hard shadow, and the slip's primary
 ("Go to the Door") is a pen-filled capsule. The two slips (flight log, tracking slip) are
 objects: no ink edge, kObjectDepth's hard offset shadow in the deep page purple.

 HER PERCH (the React Native CourierStage, brought over with what a snapshot can do): she idles by
 her whereabouts and her stage (WrenHome GRACE: a hatchling's version is smaller, quicker and
 wobblier); a tap hops and shows the next face; a drag picks her up (happy), she follows the
 finger turned toward it and the sky drifts against her, and on release she glides back (delight);
 left alone 25 s she dozes. Under Reduce Motion: no idle, no hop, no drag, only the faces. Starving
 (wilt) she holds still. A drag that starts on her is hers, not the page's.

 FREE FLIGHT (batch 3, 2026-11-09; the "freeflight" switch). With `content.flight` the game is
 Swift's (KFreeFlight.swift) and is played right here, as WrenHome plays it on the React Native
 cover: TS opens it (Play, ?play=1 → flightOpen) and it opens once she can play; her log and the
 tracking slip shut, the page goes to the top and holds still (no scroll, nothing under the
 course takes a tap, the keyboard rises over it), the cover grows to the course's height and the
 header keeps riding it (the chevron still leaves; the game's × sits in the header's empty right
 end). The × and a finished run go to TS (onPlayEnd, onFlightRun); TS closes it. Without
 `content.flight` Play only reports, and TS hands the page to the React Native game as before.

 VoiceOver: the header is the page's header; she is one button (her name, "tap for a face");
 the bubble is a button that opens her flight log (expanded / collapsed); the cover's gesture
 hint is hidden; Play reads "Free Flight"; the journey's stops read their name and date; every
 tile is a button with its lock in its name and "selected" when she has it on.

 Dynamic Type: the page's words grow; what sits on the fixed 300pt cover and the small tags stop
 at xxLarge, so the cover's furniture can't run into her.
 */

// MARK: - What the page shows

/// One face on the perch: the WrenBird mood and her picture in it.
public struct KCourierFace: Equatable, Sendable {
  public let mood: String
  public let bird: KImageRef?

  public init(mood: String, bird: KImageRef?) {
    self.mood = mood
    self.bird = bird
  }
}

/// Her on the perch.
public struct KCourierHero: Equatable, Sendable {
  /// the face her whereabouts, hunger or sleep give her
  public var mood = "content"
  /// every face the perch may show (captured as they arrive)
  public var faces: [KCourierFace] = []
  /// home | delivery | bringing | exploring | unsent | dozing
  public var state = "home"
  /// egg | hatch | fledge | wren
  public var stage = "wren"
  public var wilt = false
  /// VoiceOver's name for her
  public var label = ""

  public init() {}
}

/// The cover: the hour's sky and what is drawn on it.
public struct KCourierCover: Equatable, Sendable {
  public var sky0 = Color(hex: "#BFE3F8")
  public var sky1 = Color(hex: "#E3F3FB")
  /// what draws on the sky (the header)
  public var ink = Color(hex: "#1F5C33")
  /// the status band and the DAY chip
  public var band = Color(hex: "#1F5C33")
  public var pillarInk = Color(hex: "#1F5C33")
  public var scrim = Color(hex: "#ADDBB5")
  public var sun: Color?
  public var moon = false
  public var stars = false
  public var night = false
  public var dayOff = false
  /// "DAY 12"; "" until the counts are in
  public var dayChip = ""
  /// "COFOUNDER No. 007"; "" for none
  public var cofounder = ""
  public var bubble = ""
  public var bubbleOpens = false
  public var canPlay = false

  public init() {}
}

/// The words the page needs beyond the records.
public struct KCourierStrings: Equatable, Sendable {
  public var title = ""
  public var back = ""
  public var hints: [String] = []
  public var tapHint = ""
  public var play = ""
  public var playA11y = ""
  public var playHint = ""
  public var logHint = ""
  public var expanded = ""
  public var collapsed = ""
  public var track = ""
  public var trackClose = ""
  public var slip = ""
  public var slipGo = ""
  public var log = ""
  public var journey = ""
  public var keepsakes = ""
  public var allKept = ""
  public var wrenUpper = ""

  public init() {}
}

/// One counted fact about her stage.
public struct KCourierFact: Equatable, Sendable, Identifiable {
  public enum Icon: String, Sendable {
    case letter, kindred, date, next
  }

  public let id: Int
  public let icon: Icon
  public let text: String

  public init(id: Int, icon: Icon, text: String) {
    self.id = id
    self.icon = icon
    self.text = text
  }
}

/// One stop of the journey.
public struct KCourierStop: Equatable, Sendable, Identifiable {
  public enum State: String, Sendable {
    case done, now, later
  }

  public let id: String
  public let name: String
  /// its day ("SEP 20 · NOW"), what gets her there, or ""
  public let sub: String
  public let state: State
  /// her form at this stage (the caller's snapshot: hatchling, fledgling, grown)
  public let bird: KImageRef?
  /// the next stop only: your letters toward it, of `of` (0 = no count), and that in words
  public let done: Int
  public let of: Int
  public let progress: String

  public init(id: String, name: String, sub: String, state: State, bird: KImageRef? = nil, done: Int = 0, of: Int = 0, progress: String = "") {
    self.id = id
    self.name = name
    self.sub = sub
    self.state = state
    self.bird = bird
    self.done = done
    self.of = of
    self.progress = progress
  }
}

public struct KCourierKeepsake: Equatable, Sendable, Identifiable {
  public let id: String
  public let name: String
  public let evidence: String
  public let fresh: Bool
  public let a11y: String
  public let icon: KImageRef?

  public init(id: String, name: String, evidence: String, fresh: Bool, a11y: String, icon: KImageRef?) {
    self.id = id
    self.name = name
    self.evidence = evidence
    self.fresh = fresh
    self.a11y = a11y
    self.icon = icon
  }
}

public struct KCourierCell: Equatable, Sendable, Identifiable {
  public enum Key: String, Sendable {
    case looks, dress
  }

  public let key: Key
  public let label: String
  public let value: String
  public let count: String
  public let swatch: Color

  public var id: String { key.rawValue }

  public init(key: Key, label: String, value: String, count: String, swatch: Color) {
    self.key = key
    self.label = label
    self.value = value
    self.count = count
    self.swatch = swatch
  }
}

/// A tile on the wardrobe rack: a coat (looks) or a piece (dress), her wearing it.
public struct KCourierTile: Equatable, Sendable, Identifiable {
  public let id: String
  public let label: String
  /// the brass tag; "" when it's hers
  public let lock: String
  public let hint: String
  public let on: Bool
  public let bird: KImageRef?

  public init(id: String, label: String, lock: String, hint: String, on: Bool, bird: KImageRef?) {
    self.id = id
    self.label = label
    self.lock = lock
    self.hint = hint
    self.on = on
    self.bird = bird
  }
}

/// Everything the page shows, from TS.
public struct KCourierContent: Equatable, Sendable {
  public var strings = KCourierStrings()
  public var cover = KCourierCover()
  public var hero = KCourierHero()
  public var bandShow = false
  public var bandLine = ""
  public var bandSub = ""
  public var bandBringing = false
  public var slipRows: [String] = []
  public var slipLit = false
  public var slipThread = ""
  public var logRows: [String] = []
  public var logLine = ""
  public var name = ""
  public var kindLine = ""
  public var facts: [KCourierFact] = []
  public var journey: [KCourierStop] = []
  public var keepsakes: [KCourierKeepsake] = []
  public var cells: [KCourierCell] = []
  public var looks: [KCourierTile] = []
  public var dress: [KCourierTile] = []
  public var firstClass = KMeFirstClass()
  /// Free Flight in Swift (the "freeflight" switch): the course, or nil when Play hands the page
  /// to the React Native game as before
  public var flight: KFreeFlightContent?
  /// TS says the game is open (Play, ?play=1); it opens once she can play
  public var flightOpen = false

  public init() {}
}

/// Where the page's taps go. One object for the life of the surface.
public final class KCourierActions {
  public var onBack: () -> Void = {}
  public var onPlay: () -> Void = {}
  public var onSlipGo: (String) -> Void = { _ in }
  public var onKeepsake: (String) -> Void = { _ in }
  public var onAllKeepsakes: () -> Void = {}
  public var onLook: (String) -> Void = { _ in }
  public var onDress: (String) -> Void = { _ in }
  public var onFirstClass: () -> Void = {}
  /// the rack opened on a row ("looks" | "dress") or shut ("")
  public var onRack: (String) -> Void = { _ in }
  /// the cover is under the status bar (true) or has scrolled out from under it
  public var onUnderSky: (Bool) -> Void = { _ in }
  /// Free Flight in Swift: the × (TS closes it: flightOpen false)
  public var onPlayEnd: () -> Void = {}
  /// Free Flight in Swift: a run ended (gates, letters a minute); TS keeps the best
  public var onFlightRun: (Int, Int) -> Void = { _, _ in }

  public init() {}
}

// MARK: - Fixed colours (the cover's, and the brass tag's)

enum KCourierInk {
  /// the 10a ink, fixed: type on the white bubble and on the lime sticker
  static let cover = Color(hex: "#1E1B35")
  /// the brass lock tag on a rack tile
  static let brass = Color(hex: "#B08037")
  /// her status dot while she's bringing something
  static let bringing = Color(hex: "#7CC58F")
  /// the kindred face's green (StateGlyph kindreds)
  static let kindred = Color(hex: "#2E7D4F")
  /// the cofounder mark's gold and its type on her sky
  static let gold = Color(hex: "#C9A227")
  static let goldInk = Color(hex: "#8A6E20")
  /// the pillars' green on the PLAY sticker
  static let pillar = Color(hex: "#9CD48C")
  static let pillarBird = Color(hex: "#5B55FF")
  static let pillarBeak = Color(hex: "#F2A33A")
  static let moon = Color(hex: "#FFF3D6")
}

// MARK: - The page

public struct KCourierScreen: View {
  /// the cover's height under the status strip (the React Native COVER_H)
  public static var coverHeight: CGFloat { 300 }
  /// the header that rides the cover
  public static var headerHeight: CGFloat { 52 }

  private let theme: KTheme
  private let content: KCourierContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KCourierActions

  @State private var logOpen = false
  @State private var tracking = false
  /// the rack's open row. The page opens with LOOKS unfolded (owner on TestFlight 1.2.8, 2026-11-10);
  /// the TS side starts on the same row so her coats are already pictured (CourierNative `rack`)
  @State private var rack: KCourierCell.Key? = .looks
  /// the page has scrolled past the cover: the status strip wears the page's colour
  @State private var pastCover = false
  /// Free Flight is on the cover (Swift's game; see KFreeFlight.swift)
  @State private var playing = false

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  public init(theme: KTheme, content: KCourierContent, topInset: CGFloat, bottomInset: CGFloat, actions: KCourierActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  private var flies: Bool { content.cover.bubbleOpens }

  public var body: some View {
    ScrollViewReader { proxy in
      scroller
        .onAppear { syncPlay(proxy) }
        .onChange(of: content.flightOpen) { _, _ in syncPlay(proxy) }
        .onChange(of: content.cover.canPlay) { _, _ in syncPlay(proxy) }
        .onChange(of: content.flight == nil) { _, _ in syncPlay(proxy) }
    }
  }

  private var scroller: some View {
    ScrollView(.vertical) {
      VStack(spacing: 0) {
        content.cover.sky0
          .frame(height: topInset)
          .accessibilityHidden(true)
          .id(Self.topID)
        KCourierCoverView(
          theme: theme,
          content: content,
          logOpen: logOpen,
          playing: playing,
          onBubble: { toggle { logOpen.toggle() } },
          actions: actions
        )
        // while she plays the page holds still under the course (the keyboard is up), as the
        // React Native page's band and cards do (pointerEvents none)
        Group {
          if content.bandShow {
            band
          }
          page
        }
        .allowsHitTesting(!playing)
      }
    }
    .scrollIndicators(.hidden)
    .scrollDisabled(playing)
    // the game's keyboard rises over the page; nothing under it moves
    .ignoresSafeArea(.keyboard)
    // the status strip: clear over the cover (the sky runs under the clock), the page's colour
    // once the page has scrolled past it, so the band and the cards never slide under the clock
    // (they did, 2026-10-26: "Waiting on your first letter" over 11:57)
    .overlay(alignment: .top) {
      theme.lav2
        .frame(height: topInset)
        .opacity(pastCover ? 1 : 0)
        .animation(.easeOut(duration: 0.15), value: pastCover)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
    .background(theme.lav2.ignoresSafeArea())
    .onScrollGeometryChange(for: Bool.self) { g in
      g.contentOffset.y + g.contentInsets.top < Self.coverHeight + topInset / 2
    } action: { _, under in
      pastCover = !under
      actions.onUnderSky(under)
    }
  }

  private static let topID = "kCourierTop"

  /// FREE FLIGHT IN SWIFT (WrenHome openPlay / closePlay): TS opens it (Play, ?play=1) and it
  /// opens once she can play (an autoPlay waits for the counts, as React Native's does); once
  /// open it stays until TS closes it. Opening shuts her log and the tracking slip and brings
  /// the cover to the top; the cover grows to the course's height.
  private func syncPlay(_ proxy: ScrollViewProxy) {
    let open = content.flight != nil && content.flightOpen
    if open && !playing && content.cover.canPlay {
      // to the top first, while the page can still scroll (it holds still once she plays)
      toggle {
        proxy.scrollTo(Self.topID, anchor: .top)
        logOpen = false
        tracking = false
        playing = true
      }
    } else if !open && playing {
      toggle { playing = false }
    }
  }

  private func toggle(_ change: () -> Void) {
    if reduceMotion {
      change()
    } else {
      withAnimation(.easeInOut(duration: 0.25), change)
    }
  }

  // MARK: The status band

  private var band: some View {
    HStack(spacing: 12) {
      Circle()
        .fill(content.bandBringing ? KCourierInk.bringing : Color.white.opacity(0.55))
        .frame(width: 8, height: 8)
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 2) {
        Text(content.bandLine)
          .kText(.system(15, .bold))
          .foregroundStyle(Color.white)
          .lineLimit(1)
        if !content.bandSub.isEmpty {
          Text(content.bandSub)
            .kText(.system(12))
            .foregroundStyle(Color.white.opacity(0.72))
            .lineLimit(1)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityElement(children: .combine)
      // rule B: a soft capsule, no white slab
      SwiftUI.Button {
        toggle { tracking.toggle() }
      } label: {
        Text(tracking ? content.strings.trackClose : content.strings.track)
          .kText(.system(13, .semibold))
          .foregroundStyle(Color.white)
          .lineLimit(1)
          .padding(.horizontal, 14)
          .padding(.vertical, 8)
          .background(Capsule().fill(Color.white.opacity(0.2)))
          .contentShape(Capsule())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityValue(tracking ? content.strings.expanded : content.strings.collapsed)
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity)
    .background(content.cover.band)
  }

  // MARK: The page under the band

  private var page: some View {
    VStack(alignment: .leading, spacing: 0) {
      if flies && logOpen {
        KCourierSlipCard(theme: theme, title: content.strings.log, owner: content.strings.wrenUpper) {
          ForEach(Array(content.logRows.enumerated()), id: \.offset) { _, row in
            KCourierSlipRow(theme: theme, text: row, lit: false)
          }
          Text(content.logLine)
            .kText(.content(12.5, lineHeight: 1.52))
            .foregroundStyle(theme.sub)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 12)
            .padding(.top, 4)
            .padding(.bottom, 11)
        }
        .padding(.bottom, 16 + 6)
        .transition(.opacity)
      }
      if flies && tracking {
        KCourierSlipCard(theme: theme, title: content.strings.slip, owner: content.strings.wrenUpper) {
          ForEach(Array(content.slipRows.enumerated()), id: \.offset) { i, row in
            KCourierSlipRow(theme: theme, text: row, lit: content.slipLit && i == content.slipRows.count - 1)
          }
          if content.slipLit {
            Rectangle().fill(theme.line).frame(height: 1)
            // rule B's primary: a pen-filled capsule
            SwiftUI.Button {
              actions.onSlipGo(content.slipThread)
            } label: {
              Text(content.strings.slipGo + " →")
                .kText(.system(13, .semibold))
                .foregroundStyle(theme.bg)
                .lineLimit(1)
                .padding(.horizontal, 18)
                .frame(minHeight: 36)
                .background(Capsule().fill(theme.ind))
                .contentShape(Capsule())
            }
            .buttonStyle(KFadePressStyle())
            .accessibilityLabel(content.strings.slipGo)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 11)
          }
        }
        .padding(.bottom, 16 + 6)
        .transition(.opacity)
      }

      // ── her name, what she is, and the stage in two counted facts ──
      Text(content.name)
        .kText(.system(32, .heavy, tracking: -0.031))
        .foregroundStyle(theme.ink)
        .lineLimit(2)
        .accessibilityAddTraits(.isHeader)
      Text(content.kindLine)
        .kText(.mono(9.5, tracking: 0.168))
        .foregroundStyle(theme.mute)
        .padding(.top, 4)
      if !content.facts.isEmpty {
        KMeFlowLayout(spacing: 8, lineSpacing: 8) {
          ForEach(content.facts) { fact in
            KCourierFactCapsule(theme: theme, fact: fact, tone: content.cover.band)
          }
        }
        .padding(.top, 12)
      }

      // ── the journey: one line, three stops, the days they really turned ──
      Text(content.strings.journey)
        .kText(.mono(9.5, tracking: 0.168))
        .foregroundStyle(theme.mute)
        .accessibilityAddTraits(.isHeader)
        .padding(.top, 24)
      KCourierJourney(theme: theme, stops: content.journey)
        .padding(.top, 12)

      // ── looks & dress: two cells, the rack unfolds beneath (above the keepsakes: owner,
      // 2026-10-26 — what she wears is changed often, what she kept is looked back on) ──
      HStack(alignment: .top, spacing: 10) {
        ForEach(content.cells) { cell in
          KCourierCellButton(theme: theme, cell: cell, on: rack == cell.key, expanded: content.strings.expanded, collapsed: content.strings.collapsed) {
            let next: KCourierCell.Key? = rack == cell.key ? nil : cell.key
            toggle { rack = next }
            actions.onRack(next?.rawValue ?? "")
          }
          .frame(maxWidth: .infinity)
        }
      }
      .padding(.top, 24)
      if let open = rack {
        KCourierRack(theme: theme, show: open, looks: content.looks, dress: content.dress, actions: actions)
          .padding(.top, 10)
          .transition(.opacity)
      }

      // ── keepsakes: what she kept from journeys that really happened ──
      if !content.keepsakes.isEmpty {
        keepsakes.padding(.top, 24)
      }

      // ── the door to First Class: the 4a card Me and Settings show ──
      KMeFirstClassCard(card: content.firstClass) { actions.onFirstClass() }
        .padding(.top, 24)
    }
    .padding(.horizontal, 22)
    .padding(.top, 18)
    .padding(.bottom, 40 + bottomInset)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var keepsakes: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        Text(content.strings.keepsakes)
          .kText(.mono(9.5, tracking: 0.168))
          .foregroundStyle(theme.mute)
          .accessibilityAddTraits(.isHeader)
        Spacer(minLength: 0)
        SwiftUI.Button {
          actions.onAllKeepsakes()
        } label: {
          Text(content.strings.allKept)
            .kText(.system(12.5, .semibold))
            .foregroundStyle(theme.ind)
            .lineLimit(1)
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.vertical, -8)
        .accessibilityLabel(content.strings.allKept.replacingOccurrences(of: "→", with: "").trimmingCharacters(in: .whitespaces))
      }
      HStack(alignment: .top, spacing: 10) {
        ForEach(content.keepsakes) { k in
          KCourierKeepsakeTile(theme: theme, keepsake: k) { actions.onKeepsake(k.id) }
            .frame(maxWidth: .infinity)
        }
      }
    }
  }
}

// MARK: - The cover

struct KCourierCoverView: View {
  let theme: KTheme
  let content: KCourierContent
  let logOpen: Bool
  /// Free Flight is on: the cover is the course (KFreeFlight), the header still rides it
  let playing: Bool
  let onBubble: () -> Void
  let actions: KCourierActions

  /// her perch's drag, shared with the far layer (it drifts against her)
  @State private var drag: CGSize = .zero

  private var cover: KCourierCover { content.cover }

  /// the cover's height: the course's while she plays (WrenHome playH), else the perch's 300
  private var height: CGFloat {
    if playing, let flight = content.flight { return flight.height }
    return KCourierScreen.coverHeight
  }

  var body: some View {
    GeometryReader { g in
      let w = g.size.width
      let h = KCourierScreen.coverHeight
      ZStack(alignment: .topLeading) {
        LinearGradient(colors: [cover.sky0, cover.sky1], startPoint: .top, endPoint: .bottom)
          .frame(height: h)
        if playing, let flight = content.flight {
          KFreeFlight(content: flight, width: w, onClose: actions.onPlayEnd, onRun: actions.onFlightRun)
            .transition(.opacity)
          header(width: w)
        } else {
          KCourierSky(cover: cover, width: w, height: h)
            .offset(x: -drag.width * 0.12, y: -drag.height * 0.08)
            .accessibilityHidden(true)
          KCourierPerch(hero: content.hero, tapHint: content.strings.tapHint, width: w, height: h, drag: $drag)
          furniture(width: w)
        }
      }
      // pinned to the top left: a layer bigger than the cover (the sky's parallax bleed) made the
      // stack larger than w × h, and a centred frame pushed its top and left edges out to be
      // clipped (the title cut under the status bar, the bubble off the left edge; 2026-10-26)
      .frame(width: w, height: height, alignment: .topLeading)
      .background(cover.sky1)
      .clipped()
    }
    .frame(height: height)
  }

  /// the room's header (the back chevron and the title), riding the cover; its empty stretch
  /// lets taps through to what is under it (while she plays, the game's × sits there)
  private func header(width w: CGFloat) -> some View {
    ZStack {
      Text(content.strings.title)
        .kText(.secondaryTitle)
        .foregroundStyle(cover.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
        .padding(.horizontal, 56)
        .allowsHitTesting(false)
        .accessibilityAddTraits(.isHeader)
      HStack(spacing: 0) {
        SwiftUI.Button(action: actions.onBack) {
          KLineIcon(.chevronLeft, size: 18, lineWidth: 2.2, color: cover.ink)
            .frame(width: 36, height: 36)
            .padding(4)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
        .accessibilityLabel(content.strings.back)
        .padding(.leading, KBackChevron.leading)
        Spacer(minLength: 0)
      }
    }
    .frame(height: 44)
    .frame(width: w, height: KCourierScreen.headerHeight, alignment: .top)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    .accessibilitySortPriority(3)
  }

  @ViewBuilder
  private func furniture(width w: CGFloat) -> some View {
    // the header: rides the cover and scrolls away with it
    header(width: w)

    // DAY 12: top right, 12 down and 14 in, as the React Native cover places it (in the header's
    // empty right end)
    if !cover.dayChip.isEmpty {
      HStack(spacing: 0) {
        Spacer(minLength: 0)
        Text(cover.dayChip)
          .kText(.mono(9.5, tracking: 0.168))
          .foregroundStyle(Color.white)
          .lineLimit(1)
          .padding(.horizontal, 10)
          .padding(.vertical, 5)
          .background(Capsule().fill(cover.band))
      }
      .padding(.top, 12)
      .padding(.trailing, 14)
      .frame(width: w, alignment: .topTrailing)
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    }

    // her ring: the one cofounder mark another person ever sees (under the header, so it never
    // sits under the back chevron)
    if !cover.cofounder.isEmpty {
      HStack(spacing: 6) {
        Rectangle().fill(KCourierInk.gold).frame(width: 5, height: 5)
        Text(cover.cofounder)
          .kText(.mono(9, tracking: 0.133))
          .foregroundStyle(KCourierInk.goldInk)
          .lineLimit(1)
      }
      .padding(.horizontal, 7)
      .padding(.vertical, 3)
      .overlay(Rectangle().strokeBorder(KCourierInk.gold, lineWidth: 1))
      .accessibilityElement(children: .combine)
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      .padding(.top, KCourierScreen.headerHeight + 4)
      .padding(.leading, 16)
    }

    // bottom left: what she'd yell over her shoulder — tapped, her flight log
    VStack {
      Spacer(minLength: 0)
      HStack(alignment: .bottom, spacing: 0) {
        bubble
          .frame(maxWidth: max(80, w - 32 - 152), alignment: .leading)
        Spacer(minLength: 8)
        VStack(alignment: .trailing, spacing: 8) {
          VStack(alignment: .trailing, spacing: 0) {
            ForEach(Array(content.strings.hints.enumerated()), id: \.offset) { _, line in
              Text(line)
                .kText(.mono(9, tracking: 0.155))
                .foregroundStyle(cover.night ? Color.white.opacity(0.5) : KCourierInk.cover.opacity(0.5))
                .lineLimit(1)
            }
          }
          .accessibilityHidden(true)
          if cover.canPlay {
            playButton
          }
        }
      }
      .padding(.horizontal, 16)
      .padding(.bottom, 12)
    }
    .frame(width: w, height: KCourierScreen.coverHeight)
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }

  private var bubble: some View {
    SwiftUI.Button(action: onBubble) {
      HStack(alignment: .center, spacing: 6) {
        Text(cover.bubble)
          .kText(.content(13))
          .foregroundStyle(KCourierInk.cover)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
        if cover.bubbleOpens {
          Text(logOpen ? "▴" : "▾")
            .font(.system(size: 11))
            .foregroundStyle(KCourierInk.cover.opacity(0.4))
            .accessibilityHidden(true)
        }
      }
      .padding(.horizontal, 11)
      .padding(.vertical, 6)
      .background(RoundedRectangle(cornerRadius: 4, style: .circular).fill(Color.white))
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .disabled(!cover.bubbleOpens)
    .accessibilityHint(cover.bubbleOpens ? content.strings.logHint : "")
    .accessibilityValue(cover.bubbleOpens ? (logOpen ? content.strings.expanded : content.strings.collapsed) : "")
  }

  /// the game's door: the signal lime, the pillars and her on it, PLAY. Rule B: no ink edge,
  /// no hard shadow.
  private var playButton: some View {
    SwiftUI.Button(action: actions.onPlay) {
      HStack(spacing: 6) {
        KPillarsGlyph()
          .frame(width: 24, height: 24)
        Text(content.strings.play)
          .kText(.system(14, .bold))
          .foregroundStyle(KCourierInk.cover)
          .lineLimit(1)
        Text("▶")
          .font(.system(size: 9))
          .foregroundStyle(KCourierInk.cover)
      }
      .padding(.leading, 6)
      .padding(.trailing, 12)
      .frame(minHeight: 34)
      .background(Capsule().fill(KBrand.acid))
      .contentShape(Capsule())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.strings.playA11y)
    .accessibilityHint(content.strings.playHint)
    .accessibilityAddTraits(.isButton)
  }
}

/// Her sky's far layer: two soft discs, the stars or the sun or the moon, and on her day off two
/// pairs of pillars. Drawn 16% larger than the cover and 8% out each way, so it can drift against
/// her without showing an edge.
struct KCourierSky: View {
  let cover: KCourierCover
  let width: CGFloat
  let height: CGFloat

  private static let stars: [(CGFloat, CGFloat)] = [(0.12, 40), (0.3, 24), (0.47, 58), (0.62, 30), (0.86, 48), (0.93, 90)]
  private static let pillars: [(CGFloat, CGFloat)] = [(0.62, 0.44), (0.99, 0.6)]

  var body: some View {
    let ox = width * 0.08
    let oy = height * 0.08
    Canvas { ctx, _ in
      ctx.translateBy(x: ox, y: oy)
      func disc(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ color: Color) {
        ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)), with: .color(color))
      }
      if cover.dayOff {
        for (f, g) in Self.pillars {
          let gc = height * g
          let x = f * width
          let rects = [
            CGRect(x: x - 15, y: -oy - 4, width: 30, height: gc - 52 + oy + 4),
            CGRect(x: x - 19, y: gc - 62, width: 38, height: 10),
            CGRect(x: x - 15, y: gc + 52, width: 30, height: height * 1.2),
            CGRect(x: x - 19, y: gc + 52, width: 38, height: 10),
          ]
          var layer = ctx
          layer.opacity = 0.9
          for r in rects {
            let p = Path(roundedRect: r, cornerRadius: 3)
            layer.fill(p, with: .color(cover.scrim))
            layer.stroke(p, with: .color(cover.pillarInk), lineWidth: 2)
          }
        }
      }
      disc(width * 0.78, height * 0.28, 120, Color.white.opacity(cover.night ? 0.06 : 0.28))
      disc(width * 0.18, height * 0.82, 150, Color.white.opacity(cover.night ? 0.05 : 0.22))
      if cover.stars {
        for (i, s) in Self.stars.enumerated() {
          disc(width * s.0, s.1, i % 2 == 1 ? 1 : 1.6, Color.white.opacity(0.8))
        }
      }
      if let sun = cover.sun {
        disc(width * 0.86, 54, 16, sun)
      }
      if cover.moon {
        disc(width * 0.86, 54, 14, KCourierInk.moon)
        disc(width * 0.885, 48, 12, cover.sky0)
      }
    }
    .frame(width: width * 1.16, height: height * 1.16)
    .offset(x: -ox, y: -oy)
    .allowsHitTesting(false)
  }
}

// MARK: - Her perch

/// How well she does what her status says (WrenHome GRACE): a hatchling's version of every move
/// is smaller, quicker and wobblier than a grown bird's.
struct KCourierGrace {
  let amp: CGFloat
  let speed: Double
  let wobble: Double

  static func of(_ stage: String) -> KCourierGrace {
    switch stage {
    case "egg": return KCourierGrace(amp: 0.35, speed: 1.15, wobble: 0)
    case "hatch": return KCourierGrace(amp: 0.55, speed: 1.5, wobble: 5)
    case "fledge": return KCourierGrace(amp: 0.8, speed: 1.15, wobble: 2.5)
    default: return KCourierGrace(amp: 1, speed: 1, wobble: 0)
    }
  }
}

struct KCourierPerch: View {
  let hero: KCourierHero
  let tapHint: String
  let width: CGFloat
  let height: CGFloat
  @Binding var drag: CGSize

  /// the bird's side and where her feet stand (WrenHome: 186, 10 up)
  static let size: CGFloat = 186
  static let feet: CGFloat = 10
  /// the faces a tap cycles through (CourierStage TAP_MOODS)
  static let tapMoods = ["happy", "wink", "delight", "think", "listen", "curious"]
  static let dozeAfter: Double = 25

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var said: String?
  @State private var sayToken = 0
  @State private var tapN = 0
  @State private var held = false
  @State private var hop = false
  @State private var dozing = false
  /// bumps on every touch: restarts the doze clock
  @State private var touches = 0
  @State private var pickups = 0

  private var shown: String {
    said ?? (dozing ? "sleepy" : hero.mood)
  }

  private var picture: KImageRef? {
    hero.faces.first { $0.mood == shown && $0.bird != nil }?.bird
      ?? hero.faces.first { $0.mood == hero.mood && $0.bird != nil }?.bird
      ?? hero.faces.first { $0.bird != nil }?.bird
  }

  /// how high she is lifted, 0…1 (the shadow fades and shrinks)
  private var up: CGFloat { min(1, max(0, -drag.height / 120)) }

  var body: some View {
    let side = Self.size
    ZStack(alignment: .bottom) {
      // the haze on the boards
      Ellipse()
        .fill(RadialGradient(colors: [Color.white.opacity(0.16), Color.white.opacity(0.16), Color.white.opacity(0)], center: .center, startRadius: 0, endRadius: width * 0.42))
        .frame(width: width * 0.84, height: 180)
        .offset(x: -drag.width * 0.28, y: 70 - drag.height * 0.16)
      // her shadow, following her along the boards
      Ellipse()
        .fill(RadialGradient(colors: [KCourierInk.cover.opacity(0.3), KCourierInk.cover.opacity(0)], center: .center, startRadius: 0, endRadius: 75))
        .frame(width: 150, height: 22)
        .scaleEffect(1 - up * 0.45)
        .opacity(0.9 - up * 0.6)
        .offset(x: drag.width * 0.9, y: -(Self.feet + 6))
      bird
        .frame(width: side, height: side)
        .offset(x: drag.width, y: drag.height - (hop ? 14 : 0))
        .rotationEffect(.degrees(Double(max(-14, min(14, drag.width / 12)))), anchor: UnitPoint(x: 0.5, y: 0.8))
        .scaleEffect(held ? 1.06 : 1, anchor: UnitPoint(x: 0.5, y: 0.8))
        .padding(.bottom, Self.feet)
        .contentShape(Rectangle())
        .onTapGesture(perform: tap)
        .highPriorityGesture(dragGesture)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(hero.label)
        .accessibilityHint(tapHint)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction(.default) { tap() }
        .sensoryFeedback(.impact(weight: .light), trigger: pickups)
    }
    .frame(width: width, height: height, alignment: .bottom)
    .accessibilitySortPriority(2)
    .task(id: touches) {
      // left alone for 25 s, she dozes; any touch wakes her
      try? await Task.sleep(for: .seconds(Self.dozeAfter))
      guard !Task.isCancelled, !held else { return }
      dozing = true
    }
    .onChange(of: hero.mood) { _, _ in
      said = nil
    }
  }

  /// Still under Reduce Motion and while she wilts; held in a hand, the idle is damped to nothing
  /// (the hand is the motion) without swapping the view, so her picture never blinks on a pick-up.
  @ViewBuilder
  private var bird: some View {
    let image = KImage(picture, size: CGSize(width: Self.size, height: Self.size), contentMode: .fit, placeholder: .clear)
    if reduceMotion || hero.wilt {
      image
    } else {
      KCourierIdle(state: hero.state, grace: KCourierGrace.of(hero.stage), damped: held) { image }
    }
  }

  private var dragGesture: some Gesture {
    DragGesture(minimumDistance: 6)
      .onChanged { v in
        wake()
        if !held {
          held = true
          pickups += 1
          say("happy", for: nil)
        }
        guard !reduceMotion else { return }
        // she follows within the stage
        let x = max(-width * 0.34, min(width * 0.34, v.translation.width))
        let y = max(-height * 0.5, min(Self.feet + 6, v.translation.height))
        drag = CGSize(width: x, height: y)
      }
      .onEnded { _ in
        held = false
        say("delight", for: 1.3)
        wake()
        if reduceMotion {
          drag = .zero
        } else {
          withAnimation(.spring(response: 0.5, dampingFraction: 0.5)) { drag = .zero }
        }
      }
  }

  private func tap() {
    wake()
    tapN = (tapN + 1) % Self.tapMoods.count
    say(Self.tapMoods[tapN], for: 1.4)
    guard !reduceMotion else { return }
    withAnimation(.spring(response: 0.18, dampingFraction: 0.5)) { hop = true }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) {
      withAnimation(.spring(response: 0.3, dampingFraction: 0.45)) { hop = false }
    }
  }

  private func wake() {
    dozing = false
    touches += 1
  }

  /// show a face for a while (nil = until the next one)
  private func say(_ mood: String, for seconds: Double?) {
    said = mood
    sayToken += 1
    let token = sayToken
    guard let seconds else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + seconds) {
      if sayToken == token { said = nil }
    }
  }
}

/// Her idle by her whereabouts (WrenHome HeroWren): what she is doing, done as well as her stage
/// allows. Only drawn when motion is allowed and she isn't wilting.
struct KCourierIdle<Content: View>: View {
  let state: String
  let grace: KCourierGrace
  /// held: no idle (the amplitude is zero, the loop keeps its place)
  let damped: Bool
  @ViewBuilder let content: () -> Content

  var body: some View {
    content()
      .phaseAnimator([false, true]) { view, p in
        let t: CGFloat = p && !damped ? 1 : 0
        let a = grace.amp
        let w = grace.wobble
        switch state {
        case "dozing":
          view.offset(y: 4 * a * t).scaleEffect(1 - 0.015 * t)
        case "home", "unsent":
          view.scaleEffect(1 + 0.05 * a * t)
        case "delivery":
          view.offset(x: 4 * a * t, y: -9 * a * t).rotationEffect(.degrees(Double(-4 * a) * Double(t) - w * Double(t)))
        case "bringing":
          view.offset(y: -12 * a * t).rotationEffect(.degrees(Double(6 * a) * Double(t) + w * Double(t)))
        default:
          view.offset(x: -3 * a + 6 * a * t).rotationEffect(.degrees(Double(5 * a) * Double(t) + w * Double(t)))
        }
      } animation: { p in
        let s = grace.speed
        switch state {
        case "dozing": return .easeInOut(duration: 2.0 * s)
        case "home", "unsent": return .easeInOut(duration: 1.4 * s)
        case "delivery": return p ? .easeInOut(duration: 0.52 * s) : .easeInOut(duration: 0.62 * s).delay(0.16 * s)
        case "bringing": return p ? .easeOut(duration: 0.22 * s) : .interpolatingSpring(stiffness: 260, damping: 9).delay(0.32 * s)
        default: return .easeInOut(duration: 0.9 * s).delay(0.26 * s)
        }
      }
  }
}

// MARK: - The page's pieces

/// A slip from the post (the flight log, the tracking slip): an object, so rule B's depth and no
/// ink edge. Its header names it and her.
struct KCourierSlipCard<Rows: View>: View {
  let theme: KTheme
  let title: String
  let owner: String
  @ViewBuilder let rows: () -> Rows

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 12, style: .circular)
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 8) {
        Text(title)
          .kText(.mono(9, tracking: 0.178))
          .foregroundStyle(theme.mute)
          .accessibilityAddTraits(.isHeader)
        Spacer(minLength: 0)
        Text(owner)
          .kText(.mono(9, .medium))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 8)
      Rectangle().fill(theme.line).frame(height: 1)
      rows()
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(shape.fill(theme.sf))
    .clipShape(shape)
    .kObjectDepth(theme, offset: 6, radius: 12)
    .accessibilityElement(children: .contain)
  }
}

struct KCourierSlipRow: View {
  let theme: KTheme
  let text: String
  let lit: Bool

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 9) {
      Rectangle()
        .fill(lit ? theme.ind : theme.mute)
        .frame(width: 5, height: 5)
        .alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 3 }
        .accessibilityHidden(true)
      Text(text)
        .kText(.mono(9.5, .medium, tracking: 0.084))
        .foregroundStyle(lit ? theme.ink : theme.sub)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 7)
  }
}

/// A counted fact as a soft capsule (rule B): the band's tint as its fill, its mark in the band's
/// colour, the words in bold ink. On a dark theme the band colours are too close to the ground,
/// so the fill is the theme's lav and the mark its sub.
struct KCourierFactCapsule: View {
  let theme: KTheme
  let fact: KCourierFact
  let tone: Color

  var body: some View {
    HStack(spacing: 7) {
      KCourierFactGlyph(icon: fact.icon, color: theme.isDark ? theme.sub : tone)
        .frame(width: fact.icon == .kindred ? 16 : 14, height: fact.icon == .kindred ? 16 : 14)
        .accessibilityHidden(true)
      Text(fact.text)
        .kText(.system(12.5, .bold))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.leading, 10)
    .padding(.trailing, 13)
    .padding(.vertical, 6)
    .background(Capsule().fill(theme.isDark ? theme.lav : tone.opacity(0.12)))
  }
}

/// The facts' marks (WrenHome FactPill's line icons, and StateGlyph's kindred face).
struct KCourierFactGlyph: View {
  let icon: KCourierFact.Icon
  let color: Color

  var body: some View {
    Canvas { ctx, size in
      let s = size.width / 24
      func r(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect { CGRect(x: x * s, y: y * s, width: w * s, height: h * s) }
      let stroke = StrokeStyle(lineWidth: 2 * s, lineCap: .round, lineJoin: .round)
      switch icon {
      case .kindred:
        ctx.fill(Path(roundedRect: r(3, 3, 18, 18), cornerRadius: 5 * s), with: .color(KCourierInk.kindred))
        ctx.fill(Path(r(7.5, 8.5, 2.6, 2.6)), with: .color(.white))
        ctx.fill(Path(r(13.9, 8.5, 2.6, 2.6)), with: .color(.white))
        ctx.fill(Path(r(8.5, 14, 7, 2)), with: .color(.white))
      case .letter:
        ctx.stroke(Path(roundedRect: r(3, 5.5, 18, 13), cornerRadius: 2 * s), with: .color(color), style: stroke)
        var v = Path()
        v.move(to: CGPoint(x: 3.5 * s, y: 7 * s))
        v.addLine(to: CGPoint(x: 12 * s, y: 13 * s))
        v.addLine(to: CGPoint(x: 20.5 * s, y: 7 * s))
        ctx.stroke(v, with: .color(color), style: stroke)
      case .date:
        ctx.stroke(Path(roundedRect: r(3.5, 5, 17, 15), cornerRadius: 2 * s), with: .color(color), style: stroke)
        var p = Path()
        p.move(to: CGPoint(x: 3.5 * s, y: 10 * s))
        p.addLine(to: CGPoint(x: 20.5 * s, y: 10 * s))
        p.move(to: CGPoint(x: 8 * s, y: 3 * s))
        p.addLine(to: CGPoint(x: 8 * s, y: 7 * s))
        p.move(to: CGPoint(x: 16 * s, y: 3 * s))
        p.addLine(to: CGPoint(x: 16 * s, y: 7 * s))
        ctx.stroke(p, with: .color(color), style: stroke)
      case .next:
        var p = Path()
        p.move(to: CGPoint(x: 5 * s, y: 12 * s))
        p.addLine(to: CGPoint(x: 18 * s, y: 12 * s))
        p.move(to: CGPoint(x: 13 * s, y: 7 * s))
        p.addLine(to: CGPoint(x: 18 * s, y: 12 * s))
        p.addLine(to: CGPoint(x: 13 * s, y: 17 * s))
        ctx.stroke(p, with: .color(color), style: stroke)
      }
    }
  }
}

/// The game's sticker glyph (FreeFlightGame PillarsGlyph): two pillars, her on the dashed line.
struct KPillarsGlyph: View {
  var body: some View {
    Canvas { ctx, size in
      let s = size.width / 24
      let ink = KCourierInk.cover
      func block(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ corner: CGFloat, _ line: CGFloat) {
        let p = Path(roundedRect: CGRect(x: x * s, y: y * s, width: w * s, height: h * s), cornerRadius: corner * s)
        ctx.fill(p, with: .color(KCourierInk.pillar))
        ctx.stroke(p, with: .color(ink), lineWidth: line * s)
      }
      block(14.5, -1, 6, 8.5, 1, 1.6)
      block(13.5, 6, 8, 2.6, 0.8, 1.4)
      block(14.5, 16.5, 6, 8.5, 1, 1.6)
      block(13.5, 15.4, 8, 2.6, 0.8, 1.4)
      var trail = Path()
      trail.move(to: CGPoint(x: 2 * s, y: 15 * s))
      trail.addQuadCurve(to: CGPoint(x: 9 * s, y: 11 * s), control: CGPoint(x: 5 * s, y: 9 * s))
      ctx.stroke(trail, with: .color(ink), style: StrokeStyle(lineWidth: 1.3 * s, lineCap: .round, dash: [1.6 * s, 1.8 * s]))
      let body = Path(ellipseIn: CGRect(x: (10 - 3.4) * s, y: (11.6 - 3.4) * s, width: 6.8 * s, height: 6.8 * s))
      ctx.fill(body, with: .color(KCourierInk.pillarBird))
      ctx.stroke(body, with: .color(ink), lineWidth: 1.3 * s)
      var beak = Path()
      beak.move(to: CGPoint(x: 13.2 * s, y: 11.4 * s))
      beak.addLine(to: CGPoint(x: 15.4 * s, y: 12 * s))
      beak.addLine(to: CGPoint(x: 13.2 * s, y: 12.8 * s))
      beak.closeSubpath()
      ctx.fill(beak, with: .color(KCourierInk.pillarBeak))
      ctx.fill(Path(ellipseIn: CGRect(x: (11.2 - 0.8) * s, y: (10.8 - 0.8) * s, width: 1.6 * s, height: 1.6 * s)), with: .color(.white))
    }
    .accessibilityHidden(true)
  }
}

/// The journey: one line, three stops (done: an ink dot; now: the pen dot ringed in lav; ahead: a
/// mute ring), and under them each stop's name and its day or what gets her there.
/// THE JOURNEY: SHE GROWS (owner, 2026-10-26, option A of three; it was three dots on a line).
/// Her three forms side by side, each at its own size on one ground line, so the row shows her
/// growing: the stages she has reached in colour (the one she is at bobbing gently), the ones
/// ahead as soft silhouettes, like a collection not yet filled. Under each, its name and day (or
/// what gets her there); under the next one, five envelopes for your letters toward it, lit as
/// you write, and that count in words — yours only, since growing up also needs the other side.
/// Reduce Motion: no bob. VoiceOver reads each stop as one element.
struct KCourierJourney: View {
  let theme: KTheme
  let stops: [KCourierStop]

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// the art row's height: the grown bird's size, so every form stands on the same line
  static let slot: CGFloat = 92
  /// each stage's size, as the snapshots are taken (lib/bird-images STAGE_SIZE)
  static func size(_ id: String) -> CGFloat {
    switch id {
    case "hatch": return 60
    case "fledge": return 72
    default: return 92
    }
  }

  var body: some View {
    HStack(alignment: .top, spacing: 6) {
      ForEach(stops) { stop in
        column(stop)
          .frame(maxWidth: .infinity)
      }
    }
    .background(alignment: .top) {
      // the ground they stand on
      Capsule()
        .fill(theme.lav)
        .frame(height: 2)
        .padding(.top, Self.slot)
        .padding(.horizontal, 2)
        .accessibilityHidden(true)
    }
  }

  private func column(_ stop: KCourierStop) -> some View {
    VStack(spacing: 6) {
      art(stop)
        .frame(height: Self.slot, alignment: .bottom)
        .padding(.bottom, 1)
      Text(stop.name)
        .kText(.system(15, .bold))
        .foregroundStyle(stop.state == .later ? theme.mute : theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
      if stop.of > 1 {
        KCourierPips(theme: theme, done: stop.done, of: stop.of)
      }
      if !stop.sub.isEmpty {
        Text(stop.sub)
          .kText(.mono(9, .medium, tracking: 0.1))
          .foregroundStyle(stop.state == .now ? theme.ind : theme.mute)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
      }
      if !stop.progress.isEmpty {
        Text(stop.progress)
          .kText(.mono(9, .medium, tracking: 0.1))
          .foregroundStyle(theme.mute)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([stop.name, stop.sub, stop.progress].filter { !$0.isEmpty }.joined(separator: ", "))
    .accessibilityAddTraits(stop.state == .now ? .isSelected : [])
  }

  @ViewBuilder
  private func art(_ stop: KCourierStop) -> some View {
    let s = Self.size(stop.id)
    let bird = KImage(stop.bird, size: CGSize(width: s, height: s), contentMode: .fit, placeholder: .clear)
      .frame(width: s, height: s)
    switch stop.state {
    case .later:
      // not yet: her shape only, in the page's soft purple
      KObjectDepth.color(for: theme)
        .opacity(0.55)
        .frame(width: s, height: s)
        .mask(bird)
    case .now:
      if reduceMotion {
        bird
      } else {
        bird.phaseAnimator([0.0, -5.0]) { view, lift in
          view.offset(y: lift)
        } animation: { _ in
          .easeInOut(duration: 1.2)
        }
      }
    case .done:
      bird
    }
  }
}

/// Your letters toward the next stage: an envelope each, lit (pen blue, the flap in white) for
/// the ones written, an outline for the rest.
struct KCourierPips: View {
  let theme: KTheme
  let done: Int
  let of: Int

  var body: some View {
    HStack(spacing: 3) {
      ForEach(0..<min(of, 8), id: \.self) { i in
        let on = i < done
        let shape = RoundedRectangle(cornerRadius: 2, style: .circular)
        ZStack {
          if on {
            shape.fill(theme.ind)
          } else {
            shape.strokeBorder(KObjectDepth.color(for: theme), lineWidth: 1.4)
          }
          Path { p in
            p.move(to: CGPoint(x: 2, y: 2))
            p.addLine(to: CGPoint(x: 6, y: 5.2))
            p.addLine(to: CGPoint(x: 10, y: 2))
          }
          .stroke(on ? theme.bg : KObjectDepth.color(for: theme), style: StrokeStyle(lineWidth: 1.2, lineCap: .round, lineJoin: .round))
        }
        .frame(width: 12, height: 9)
      }
    }
    .accessibilityHidden(true)
  }
}

struct KCourierKeepsakeTile: View {
  let theme: KTheme
  let keepsake: KCourierKeepsake
  let onTap: () -> Void

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 14, style: .circular)
    SwiftUI.Button(action: onTap) {
      VStack(spacing: 0) {
        KImage(keepsake.icon, size: CGSize(width: 40, height: 40), contentMode: .fit, placeholder: .clear)
        Text(keepsake.name)
          .kText(.system(12, .semibold))
          .foregroundStyle(theme.ink)
          .multilineTextAlignment(.center)
          .lineLimit(2)
          .padding(.top, 8)
        Text(keepsake.evidence)
          .kText(.mono(8, .medium, tracking: 0.075))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .padding(.top, 4)
          .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      }
      .padding(.vertical, 14)
      .padding(.horizontal, 8)
      .frame(maxWidth: .infinity)
      .background(shape.fill(theme.sf))
      // Midnight: the face is 1.2:1 on the ground, so a hairline (mute, never ink) says where it ends
      .overlay(shape.strokeBorder(theme.isDark ? theme.mute : Color.clear, lineWidth: 1))
      .overlay(alignment: .topTrailing) {
        if keepsake.fresh {
          Circle().fill(theme.ind).frame(width: 7, height: 7).padding(8)
        }
      }
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(keepsake.a11y)
    .accessibilityAddTraits(.isButton)
  }
}

/// LOOKS / DRESS: what she has on, how many she has, and the rack's door (open: the pen ring).
struct KCourierCellButton: View {
  let theme: KTheme
  let cell: KCourierCell
  let on: Bool
  let expanded: String
  let collapsed: String
  let onTap: () -> Void

  var body: some View {
    // Midnight: the open cell on the lav fill, its small labels in sub there
    let lit = on && theme.isDark
    let small = lit ? theme.sub : theme.mute
    let shape = RoundedRectangle(cornerRadius: 14, style: .circular)
    SwiftUI.Button(action: onTap) {
      VStack(alignment: .leading, spacing: 6) {
        HStack(spacing: 6) {
          RoundedRectangle(cornerRadius: 2, style: .circular).fill(cell.swatch).frame(width: 8, height: 8)
          Text(cell.label)
            .kText(.mono(8.5, tracking: 0.165))
            .foregroundStyle(small)
            .lineLimit(1)
        }
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          Text(cell.value)
            .kText(.system(15, .bold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
          Text(cell.count)
            .kText(.mono(10, .medium))
            .foregroundStyle(small)
            .lineLimit(1)
        }
      }
      .padding(.horizontal, 14)
      .padding(.vertical, 13)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(shape.fill(lit ? theme.lav : theme.sf))
      .overlay(shape.strokeBorder(on ? theme.ind : theme.isDark ? theme.mute : Color.clear, lineWidth: 2))
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .combine)
    .accessibilityValue(on ? expanded : collapsed)
    .accessibilityAddTraits(.isButton)
  }
}

/// The wardrobe rack: the looks row (five coats across, each wearing her piece) or the dress row
/// (the pieces in a sideways scroll, each on her coat). Locked tiles are drawn at full colour
/// with a brass tag, never dimmed.
struct KCourierRack: View {
  let theme: KTheme
  let show: KCourierCell.Key
  let looks: [KCourierTile]
  let dress: [KCourierTile]
  let actions: KCourierActions

  var body: some View {
    switch show {
    case .looks:
      HStack(alignment: .top, spacing: 6) {
        ForEach(looks) { tile in
          KCourierRackTile(theme: theme, tile: tile) { actions.onLook(tile.id) }
            .frame(maxWidth: .infinity)
        }
      }
    case .dress:
      ScrollView(.horizontal) {
        HStack(alignment: .top, spacing: 8) {
          ForEach(dress) { tile in
            KCourierRackTile(theme: theme, tile: tile) { actions.onDress(tile.id) }
              .frame(width: 76)
          }
        }
        .padding(.trailing, 24)
        .padding(.bottom, 4)
      }
      .scrollIndicators(.hidden)
      .padding(.trailing, -22)
    }
  }
}

struct KCourierRackTile: View {
  let theme: KTheme
  let tile: KCourierTile
  let onTap: () -> Void

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 14, style: .circular)
    SwiftUI.Button(action: onTap) {
      VStack(spacing: 0) {
        KImage(tile.bird, size: CGSize(width: 46, height: 46), contentMode: .fit, placeholder: .clear)
        Text(tile.label.uppercased())
          .kText(.mono(8, tracking: 0.075))
          .foregroundStyle(tile.on ? theme.ind : theme.sub)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .padding(.top, 4)
        // the tag keeps its line even when empty, so the tiles stay one height
        Text(tile.lock)
          .kText(.mono(6.5, tracking: 0.077))
          .foregroundStyle(KCourierInk.brass)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .frame(minHeight: 10)
          .padding(.top, 2)
      }
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      .padding(.vertical, 8)
      .padding(.horizontal, 2)
      .frame(maxWidth: .infinity)
      .background(shape.fill(theme.sf))
      .overlay(shape.strokeBorder(tile.on ? theme.ind : Color.clear, lineWidth: 2))
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(tile.lock.isEmpty ? tile.label : "\(tile.label), \(tile.lock)")
    .accessibilityHint(tile.hint)
    .accessibilityAddTraits(tile.on ? [.isButton, .isSelected] : .isButton)
  }
}
