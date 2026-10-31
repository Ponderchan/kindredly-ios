// Portable: this file imports SwiftUI only (and ImageIO and UIKit for the picture it makes), so
// the 1.1.0 pure-Swift app can take it as is.

import ImageIO
import SwiftUI
import UIKit

/*
 THE MONTHLY REPORT, WRAPPED (owner, 2026-10-31; design/report-v2, VERDICT.md). Wren's monthly
 night letter as eight cards, in two templates:
   A "Wrapped"    loud poster cards, giant condensed type      (KWrappedCardsA)
   B "Mail pile"  every card a piece of post on a candy ground (KWrappedCardsB)
 TS picks the template (she → B, he → A, they/unset → a stable coin; "switch style" on the share
 card swaps it and TS keeps the choice), works out every fact and every word
 (src/screens/report/wrapped-core) and hands the pictures in (the type's stamp in the reader's
 coat, the pair's, Wren's five official poses). This draws them, keeps which card is up, makes
 the 1080×1920 share picture on the device, and reports the taps.

   ━━━━ ━━━━ ━━━━ ━━━━ ━━━━ ━━━━ ━━━━ ━━━━     the progress, one bar per card
                                        ×      the close key (flat, rule B)
   [ the card, fitted to the space (KWrappedFit) ]
   [ its keys, at natural size, at the bottom ]

 A tap on the left 30% goes back, on the right goes on (from under the progress down); keys
 take their taps first. The share card and the last card hold their own exits. VoiceOver: the
 progress is one adjustable element (the card's eyebrow, "3/8"); each card is one container.
 Reduce Motion: no drops, slaps or bobbing — every card simply appears.

 THE SAME SCENE IN EVERY THEME, as the old report's night: the grounds are the report's own
 candy colours, not the reader's theme (Midnight included); the status bar follows the card's
 tone (onCard tells TS).

 CARD 3's LINE never leaves the phone: the share picture is built from KWrappedShareCard, which
 has no field for it.
 */

public enum KWrappedTemplate: String, Sendable {
  case a = "A", b = "B"
}

public enum KWrappedCard: String, Sendable, CaseIterable {
  case cover, far, line, vibe, hour, click, share, next
}

public struct KWrappedTagItem: Equatable, Sendable, Identifiable {
  public let id: String
  public let tag: String
  public let sub: String
  public let rank: String

  public init(id: String, tag: String, sub: String, rank: String) {
    self.id = id
    self.tag = tag
    self.sub = sub
    self.rank = rank
  }
}

public struct KWrappedContent: Equatable, Sendable {
  public var loaded = false
  /// a read that failed: this line and a retry key instead of the cards ("" = none)
  public var failed = ""
  public var retry = ""
  public var template: KWrappedTemplate = .b
  public var cards: [KWrappedCard] = []
  /// every word, by wrapped-core WrappedView's field names, and "eyebrow.<card>"
  public var s: [String: String] = [:]
  public var tags: [KWrappedTagItem] = []
  public var changes: [String] = []
  /// letters per local hour, 24
  public var buckets: [Int] = []
  public var hourStart = 0
  public var hourNight = false
  /// "how you changed" drawn blurred, under the First Class seal
  public var locked = false
  /// stamp, pairStamp, standing, curious, delight, fly, sleepy
  public var images: [String: KImageRef] = [:]
  /// working on the share picture
  public var busy = false
  /// the card to open at (a dev build's /report?demo=1&card=N; 0 otherwise)
  public var startCard = 0

  public init() {}

  subscript(_ key: String) -> String { s[key] ?? "" }
}

public final class KWrappedActions {
  public var onClose: () -> Void = {}
  /// the share picture's file:// URL, or "" when it couldn't be made
  public var onShare: (String) -> Void = { _ in }
  public var onCompare: () -> Void = {}
  public var onSwitchStyle: () -> Void = {}
  public var onReadTheirs: () -> Void = {}
  public var onWrite: () -> Void = {}
  public var onUnlock: () -> Void = {}
  public var onRetry: () -> Void = {}
  /// the card now up, and whether its ground is dark (the status bar's tone)
  public var onCard: (Int, Bool) -> Void = { _, _ in }

  public init() {}
}

/// The pictures, decoded once, drawn as Images (on the cards and in the share picture alike, so
/// ImageRenderer has them at once).
struct KWPics {
  var cg: [String: CGImage] = [:]

  func image(_ key: String) -> Image? {
    cg[key].map { Image(decorative: $0, scale: 1) }
  }
}

/// What a card's view is given.
struct KWCtx {
  let c: KWrappedContent
  let pics: KWPics
  /// false for the first beat after the card comes up: the objects start off-pile
  let on: Bool
  let reduceMotion: Bool
  let actions: KWrappedActions
  let share: () -> Void

  subscript(_ key: String) -> String { c[key] }

  /// an object dropping onto the pile, `delay` seconds in
  func drop(_ delay: Double, from: CGFloat = -60, turn: Double = -9) -> KWDrop {
    KWDrop(on: on || reduceMotion, delay: delay, from: from, turn: turn, animate: !reduceMotion)
  }

  /// a sticker slapped on
  func slap(_ delay: Double) -> KWSlap {
    KWSlap(on: on || reduceMotion, delay: delay, animate: !reduceMotion)
  }

  /// words rising in
  func rise(_ delay: Double) -> KWRise {
    KWRise(on: on || reduceMotion, delay: delay, animate: !reduceMotion)
  }
}

struct KWDrop: ViewModifier {
  let on: Bool
  let delay: Double
  let from: CGFloat
  let turn: Double
  let animate: Bool

  func body(content: Content) -> some View {
    content
      .opacity(on ? 1 : 0)
      .offset(y: on ? 0 : from)
      .rotationEffect(.degrees(on ? 0 : turn))
      .animation(animate ? .spring(response: 0.5, dampingFraction: 0.62).delay(delay) : nil, value: on)
  }
}

struct KWSlap: ViewModifier {
  let on: Bool
  let delay: Double
  let animate: Bool

  func body(content: Content) -> some View {
    content
      .opacity(on ? 1 : 0)
      .scaleEffect(on ? 1 : 1.7)
      .animation(animate ? .spring(response: 0.36, dampingFraction: 0.55).delay(delay) : nil, value: on)
  }
}

struct KWRise: ViewModifier {
  let on: Bool
  let delay: Double
  let animate: Bool

  func body(content: Content) -> some View {
    content
      .opacity(on ? 1 : 0)
      .offset(y: on ? 0 : 18)
      .animation(animate ? .easeOut(duration: 0.45).delay(delay) : nil, value: on)
  }
}

/// The ground of each card, per template (design/report-v2 A and B, with the verdict's lilac on
/// B's last card).
func kwGround(_ t: KWrappedTemplate, _ card: KWrappedCard) -> KWGround {
  switch (t, card) {
  case (.a, .cover): return KWGround(color: KW.blue, dark: true)
  case (.a, .far): return KWGround(color: KW.butter, dark: false)
  case (.a, .line): return KWGround(color: KW.pink, dark: false)
  case (.a, .vibe): return KWGround(color: KW.mint, dark: false)
  case (.a, .hour): return KWGround(color: KW.night, dark: true)
  case (.a, .click): return KWGround(color: KW.orange, dark: false)
  case (.a, .share): return KWGround(color: KW.acid, dark: false)
  case (.a, .next): return KWGround(color: KW.lilac, dark: false)
  case (.b, .cover): return KWGround(color: KW.blue, dark: true)
  case (.b, .far): return KWGround(color: KW.acid, dark: false)
  case (.b, .line): return KWGround(color: KW.pink, dark: false)
  case (.b, .vibe): return KWGround(color: KW.butter, dark: false)
  case (.b, .hour): return KWGround(color: KW.night, dark: true)
  case (.b, .click): return KWGround(color: KW.mint, dark: false)
  case (.b, .share): return KWGround(color: KW.orange, dark: false)
  case (.b, .next): return KWGround(color: KW.lilac, dark: false)
  }
}

public struct KWrappedReportScreen: View {
  private let content: KWrappedContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KWrappedActions

  @State private var idx = 0
  /// the card's objects have landed (flips a beat after a card comes up)
  @State private var on = false
  @State private var pics = KWPics()
  @State private var picsFor: [String: KImageRef] = [:]
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  public init(content: KWrappedContent, topInset: CGFloat, bottomInset: CGFloat, actions: KWrappedActions) {
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  private var cards: [KWrappedCard] { content.loaded ? content.cards : [] }
  private var shown: Int { min(idx, max(0, cards.count - 1)) }
  private var card: KWrappedCard? { cards.indices.contains(shown) ? cards[shown] : nil }
  private var ground: KWGround { card.map { kwGround(content.template, $0) } ?? KWGround(color: KW.blue, dark: true) }
  private var chrome: Color { ground.dark ? .white : KW.ink }

  public var body: some View {
    GeometryReader { geo in
      ZStack(alignment: .top) {
        ground.color.ignoresSafeArea()
          .animation(reduceMotion ? nil : .easeOut(duration: 0.25), value: shown)

        if !content.failed.isEmpty {
          failure
        } else if let card {
          let ctx = KWCtx(c: content, pics: pics, on: on, reduceMotion: reduceMotion, actions: actions, share: share)
          Group {
            switch content.template {
            case .a: KWrappedCardsA(card: card, ctx: ctx)
            case .b: KWrappedCardsB(card: card, ctx: ctx)
            }
          }
          .padding(.top, topInset + 52)
          .padding(.bottom, bottomInset + 18)
          .padding(.horizontal, 24)
          .frame(width: geo.size.width, height: geo.size.height)
          .id("\(content.template.rawValue)-\(card.rawValue)")
          .transition(.opacity)
          .accessibilityElement(children: .contain)
        }

        VStack(spacing: 0) {
          Color.clear.frame(height: topInset)
          progress.padding(.horizontal, 14).padding(.top, 8)
          HStack {
            Spacer()
            closeKey
          }
          .padding(.trailing, 10)
          .padding(.top, 6)
        }
      }
      .frame(width: geo.size.width, height: geo.size.height)
      .clipped()
      .contentShape(Rectangle())
      .onTapGesture(coordinateSpace: .local) { at in
        guard at.y >= topInset + 56 else { return }
        if at.x < geo.size.width * 0.30 { advance(-1) } else { advance(1) }
      }
    }
    .ignoresSafeArea()
    .task(id: content.images) { await loadPics(content.images) }
    .onAppear {
      idx = content.startCard
      land()
    }
    .onChange(of: content.loaded) { _, _ in
      idx = content.startCard
      land()
    }
    .onChange(of: cards.count) { _, n in
      if idx >= n { idx = max(0, n - 1) }
    }
    .onChange(of: content.template) { _, _ in land() }
  }

  private func advance(_ dir: Int) {
    let next = shown + dir
    guard next >= 0, next < cards.count else { return }
    if reduceMotion { idx = next } else { withAnimation(.easeOut(duration: 0.22)) { idx = next } }
    land()
  }

  /// the new card's objects start off-pile and land a beat later; its tone goes to TS
  private func land() {
    on = false
    if let card { actions.onCard(shown, kwGround(content.template, card).dark) }
    DispatchQueue.main.asyncAfter(deadline: .now() + (reduceMotion ? 0 : 0.05)) { on = true }
  }

  private func share() {
    guard !content.busy else { return }
    actions.onShare(renderShare() ?? "")
  }

  /// The share picture: KWrappedShareCard at 360×640 points, drawn at 3× (1080×1920), opaque,
  /// at the standard type size and in the light scheme whatever the phone's.
  private func renderShare() -> String? {
    let view = KWrappedShareCard(c: content, pics: pics)
      .frame(width: 360, height: 640)
      .environment(\.dynamicTypeSize, .large)
      .environment(\.colorScheme, .light)
    let renderer = ImageRenderer(content: view)
    renderer.scale = 3
    renderer.isOpaque = true
    guard let image = renderer.uiImage, let data = image.pngData() else { return nil }
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("kindredly-aura-\(UUID().uuidString).png")
    do {
      try data.write(to: url, options: .atomic)
      return url.absoluteString
    } catch {
      return nil
    }
  }

  /// Decode every picture off the main thread, downsampled to 900px (the share picture's largest).
  private func loadPics(_ refs: [String: KImageRef]) async {
    guard refs != picsFor else { return }
    var out: [String: CGImage] = [:]
    await withTaskGroup(of: (String, CGImage?).self) { group in
      for (key, ref) in refs {
        let url = ref.url
        group.addTask {
          let source: CGImageSource?
          if url.isFileURL {
            source = CGImageSourceCreateWithURL(url as CFURL, nil)
          } else if let data = try? Data(contentsOf: url) {
            source = CGImageSourceCreateWithData(data as CFData, nil)
          } else {
            source = nil
          }
          guard let source else { return (key, nil) }
          let opts: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: 900,
            kCGImageSourceShouldCacheImmediately: true,
          ]
          return (key, CGImageSourceCreateThumbnailAtIndex(source, 0, opts as CFDictionary))
        }
      }
      for await (key, img) in group {
        if let img { out[key] = img }
      }
    }
    guard !Task.isCancelled else { return }
    pics = KWPics(cg: out)
    picsFor = refs
  }

  // MARK: chrome

  private var progress: some View {
    HStack(spacing: 4) {
      ForEach(Array(cards.enumerated()), id: \.element) { i, _ in
        Capsule().fill(chrome.opacity(i <= shown ? 1 : 0.25)).frame(height: 4)
      }
    }
    .frame(height: 4)
    .accessibilityElement()
    .accessibilityLabel(card.map { content["eyebrow.\($0.rawValue)"] } ?? "")
    .accessibilityValue(cards.isEmpty ? "" : "\(shown + 1)/\(cards.count)")
    .accessibilityAdjustableAction { dir in
      switch dir {
      case .increment: advance(1)
      case .decrement: advance(-1)
      @unknown default: break
      }
    }
    .accessibilityHidden(cards.isEmpty)
  }

  private var closeKey: some View {
    SwiftUI.Button {
      actions.onClose()
    } label: {
      KLineIcon(.close, size: 20, lineWidth: 2.4, color: chrome)
        .frame(width: 40, height: 40)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(content["close"])
  }

  private var failure: some View {
    VStack(spacing: 18) {
      Spacer()
      if let wren = pics.image("curious") {
        wren.resizable().scaledToFit().frame(width: 120)
      }
      Text(content.failed)
        .kw(.body, 18)
        .foregroundStyle(Color.white)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
      KWKey(title: content.retry, kind: .acid, small: true) { actions.onRetry() }
      Spacer()
    }
    .padding(.horizontal, 32)
    .padding(.top, topInset)
  }
}
