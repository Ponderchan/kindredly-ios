import SwiftUI

/*
 A REEL, PLAYING — the square every moving card in Wren's room is built on (a guide's, and a
 release's own "what's new"), in SwiftUI (2026-11-09, behind the "reels" switch, off by default).
 Mirrors src/components/ReelSquare.tsx:
 - the scenes play one after another, each held its own ms (a JS setTimeout there, a task here,
   restarted with the full ms whenever play resumes, as the React Native effect re-runs);
 - each scene mounts fresh: its clock (KReelClock) starts at zero when its turn comes, so its
   motion starts from the beginning every time it plays;
 - a scene cross-fades in over 260 ms while the one before fades out over 200 (Reanimated's
   FadeIn / FadeOut, their default inOut(quad) curve); Reduce Motion cuts instead;
 - a thin bar per scene across the top, like a story's: the done ones full, the playing one
   filling linearly over its ms (full at once under Reduce Motion, as withTiming finishes there),
   the rest empty; while paused the playing bar sits at 0, as the React Native Seg resets;
 - a tap starts it over from the first scene;
 - it plays only while `live` (React Native: useIsFocused on the room): TS says so in the spec.
   Paused, the timer stops and the frame holds (the TimelineView stops ticking). Scrolled out of
   sight in the room's transcript it stops drawing frames too (nothing to see; React Native's
   Reanimated keeps animating there), while its scenes keep their time.
 - on Midnight's dark card it gets a hairline edge in the reel's own rule colour just inside the
   square, its corners following the holder's clip (`cornerTop` / `cornerBottom`: GuideCard's
   17 / 0 by default); the light themes draw none.
 The square is the picture at `side` (React Native: the measured width, at most 360). The whole
 square is one button for VoiceOver, named by TS (the guide's title, or the post's first line).

 WHAT A REEL IS: KReels.def(id) — its ground and its scenes, each a key, its ms and a drawing
 that takes the scene's context (the side, the clock, the words and pictures TS sent).
 What a reel shows comes from TS as KReelSpec: its id, its label, whether it plays, every word
 already in the reader's language and the reel's own facts as JSON (`data`, KReelData), and the
 pictures it needs by name (Wren's snapshots, the aura's scenes, faces).
 */

/// A reel as TS hands it over (src/components/guide-reel/swift-reels.ts reelSpec).
public struct KReelSpec: Equatable, Sendable {
  /// which reel: a guide's id (letters, kindreds, aura, stamps, sealed, courier) or a release's (news-1.0.5)
  public var id: String
  /// VoiceOver: what the square is (a tap starts it over)
  public var label: String
  /// the screen is on show: the reel plays
  public var live: Bool
  /// the reel's words and facts, as JSON (KReelData)
  public var data: String
  /// its pictures, by name
  public var images: [String: KImageRef]

  public init(id: String, label: String, live: Bool, data: String, images: [String: KImageRef]) {
    self.id = id
    self.label = label
    self.live = live
    self.data = data
    self.images = images
  }

  /// this binary draws this reel
  public static func drawable(_ id: String) -> Bool { KReels.def(id) != nil }
}

/// The JSON TS sends with a reel: every word by its key, and what a reel needs beyond words.
struct KReelData: Decodable {
  var words: [String: String] = [:]
  var nums: [String: Double] = [:]
  var lists: [String: [String]] = [:]
  var colors: [String: String] = [:]
  var frosts: [String: KReelFrostJSON] = [:]
  var sigs: [String: KReelSigJSON] = [:]
  var stickers: [String: KReelStickerJSON] = [:]
  var papers: [KReelPaperJSON] = []

  init() {}

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: Keys.self)
    words = (try? c.decodeIfPresent([String: String].self, forKey: .words)) ?? [:]
    nums = (try? c.decodeIfPresent([String: Double].self, forKey: .nums)) ?? [:]
    lists = (try? c.decodeIfPresent([String: [String]].self, forKey: .lists)) ?? [:]
    colors = (try? c.decodeIfPresent([String: String].self, forKey: .colors)) ?? [:]
    frosts = (try? c.decodeIfPresent([String: KReelFrostJSON].self, forKey: .frosts)) ?? [:]
    sigs = (try? c.decodeIfPresent([String: KReelSigJSON].self, forKey: .sigs)) ?? [:]
    stickers = (try? c.decodeIfPresent([String: KReelStickerJSON].self, forKey: .stickers)) ?? [:]
    papers = (try? c.decodeIfPresent([KReelPaperJSON].self, forKey: .papers)) ?? []
  }

  private enum Keys: String, CodingKey { case words, nums, lists, colors, frosts, sigs, stickers, papers }

  private static var cache: [String: KReelData] = [:]

  /// parsed once a string (main thread, as every body)
  static func parse(_ json: String) -> KReelData {
    if let d = cache[json] { return d }
    let d = (try? JSONDecoder().decode(KReelData.self, from: Data(json.utf8))) ?? KReelData()
    if cache.count > 24 { cache.removeAll() }
    cache[json] = d
    return d
  }
}

/// src/lib/frost FrostSpec, field for field (as KFrostRecord in the adapters)
struct KReelFrostJSON: Decodable {
  struct Blob: Decodable { var color: String; var x: Double; var y: Double; var r: Double; var alpha: Double }
  struct Head: Decodable { var x: Double; var y: Double; var r: Double; var solid: Double }
  struct Shoulders: Decodable { var x: Double; var y: Double; var rx: Double; var ry: Double; var solid: Double }
  struct Silhouette: Decodable { var alpha: Double; var head: Head; var shoulders: Shoulders }
  struct Sheen: Decodable { var alpha: Double; var to: Double }
  struct Hairline: Decodable { var alpha: Double; var width: Double }
  var dark: Bool
  var base: String
  var blobs: [Blob]
  var silhouette: Silhouette
  var sheen: Sheen
  var hairline: Hairline
  var corner: Double?
  var edge: Double?

  var spec: KFrostSpec {
    let s = silhouette
    return KFrostSpec(
      dark: dark,
      base: kReelColor(base),
      lights: blobs.map { KFrostSpec.Light(color: kReelColor($0.color), x: CGFloat($0.x), y: CGFloat($0.y), r: CGFloat($0.r), alpha: $0.alpha) },
      silhouetteAlpha: s.alpha,
      head: KFrostSpec.Head(x: CGFloat(s.head.x), y: CGFloat(s.head.y), r: CGFloat(s.head.r), solid: CGFloat(s.head.solid)),
      shoulders: KFrostSpec.Shoulders(x: CGFloat(s.shoulders.x), y: CGFloat(s.shoulders.y), rx: CGFloat(s.shoulders.rx), ry: CGFloat(s.shoulders.ry), solid: CGFloat(s.shoulders.solid)),
      sheenAlpha: sheen.alpha,
      sheenTo: CGFloat(sheen.to),
      hairlineAlpha: hairline.alpha,
      hairlineWidth: CGFloat(hairline.width),
      corner: CGFloat(corner ?? 0.25),
      edge: CGFloat(edge ?? 1.5)
    )
  }
}

/// a signature drawn stroke by stroke: lib/pen-signature penDrawPlan's steps and the viewBox TS fitted
struct KReelSigJSON: Decodable {
  struct Step: Decodable { var d: String; var delay: Double; var duration: Double; var length: Double }
  /// x, y, w, h
  var box: [Double]
  var steps: [Step]
}

/// a sticker's look (lib/sticker-copy stickerLook) and its name
struct KReelStickerJSON: Decodable {
  var name: String
  var bg: String
  var fg: String
  var border: String
  /// degrees
  var tilt: Double
  var pill: Bool
}

/// What a scene draws from.
struct KReelCtx {
  let s: CGFloat
  let c: KReelClock
  let data: KReelData
  let images: [String: KImageRef]
  let face: KLetterFace

  var u: CGFloat { s / 100 }
  /// a word by its key ("" when TS sent none)
  func w(_ key: String) -> String { data.words[key] ?? "" }
  func img(_ name: String) -> KImageRef? { images[name] }
  func num(_ key: String, _ fallback: Double = 0) -> Double { data.nums[key] ?? fallback }
}

struct KReelScene {
  let key: String
  let ms: Double
  let draw: (KReelCtx) -> AnyView
}

struct KReelDef {
  let bg: Color
  let scenes: [KReelScene]
}

/// Every reel this binary draws, by id.
enum KReels {
  static func def(_ id: String) -> KReelDef? {
    switch id {
    case "sealed": return KReelSealed.def
    case "letters": return KReelLetters.def
    case "aura": return KReelAura.def
    case "stamps": return KReelStamps.def
    case "kindreds": return KReelKindreds.def
    case "courier": return KReelCourier.def
    case "news-1.0.5": return KReelNews105.def
    default: return nil
    }
  }
}

/// The square, playing (see the top of the file).
public struct KReelSquare: View {
  private let theme: KTheme
  private let spec: KReelSpec
  private let side: CGFloat
  private let cornerTop: CGFloat
  private let cornerBottom: CGFloat

  @Environment(\.accessibilityReduceMotion) private var still
  @Environment(\.kLetterFace) private var face

  private struct Mount: Equatable {
    var index: Int
    var run: Int
    var start: Date
  }

  @State private var cur = Mount(index: 0, run: 0, start: Date())
  @State private var prev: Mount?
  /// when the playing scene's timer began (its bar fills from here)
  @State private var segStart = Date()
  /// on screen in a scroll view (the room's transcript): off it, frames stop being drawn, though
  /// the scenes keep their time as React Native's do (outside a scroll view it stays true)
  @State private var visible = true

  /// the React Native reel's hairline on a dark card, as its scene bars' track
  static let edge = kReelColor("rgba(17,17,19,0.14)")

  /// - Parameters:
  ///   - side: the square's side (React Native: the island's width, at most 360)
  ///   - cornerTop, cornerBottom: the holder's clip, which the dark edge follows (GuideCard: 17 / 0)
  public init(theme: KTheme, spec: KReelSpec, side: CGFloat, cornerTop: CGFloat = 17, cornerBottom: CGFloat = 0) {
    self.theme = theme
    self.spec = spec
    self.side = side
    self.cornerTop = cornerTop
    self.cornerBottom = cornerBottom
  }

  private struct Timer: Hashable {
    let index: Int
    let run: Int
    let live: Bool
  }

  public var body: some View {
    let s = min(side, 360)
    let shape = UnevenRoundedRectangle(topLeadingRadius: cornerTop, bottomLeadingRadius: cornerBottom, bottomTrailingRadius: cornerBottom, topTrailingRadius: cornerTop, style: .circular)
    return Group {
      if let def = KReels.def(spec.id), !def.scenes.isEmpty, s > 0 {
        let data = KReelData.parse(spec.data)
        SwiftUI.Button {
          restart()
        } label: {
          TimelineView(.animation(paused: !spec.live || !visible)) { tl in
            frame(def: def, data: data, s: s, now: tl.date)
          }
          .frame(width: s, height: s)
          .background(def.bg)
          .overlay {
            if theme.isDark {
              shape.strokeBorder(Self.edge, lineWidth: 1).allowsHitTesting(false)
            }
          }
          .clipShape(shape)
          .contentShape(Rectangle())
        }
        .buttonStyle(KReelPlain())
        .onScrollVisibilityChange(threshold: 0.01) { visible = $0 }
        .accessibilityLabel(spec.label)
        .accessibilityAddTraits(.isButton)
        .task(id: Timer(index: cur.index, run: cur.run, live: spec.live)) {
          guard spec.live else { return }
          segStart = Date()
          let ms = def.scenes[cur.index % def.scenes.count].ms
          try? await Task.sleep(nanoseconds: UInt64(ms * 1_000_000))
          if Task.isCancelled { return }
          prev = cur
          cur = Mount(index: (cur.index + 1) % def.scenes.count, run: cur.run, start: Date())
        }
      } else {
        Color.clear
      }
    }
    .frame(width: max(0, s), height: max(0, s))
  }

  private func restart() {
    prev = cur
    cur = Mount(index: 0, run: cur.run + 1, start: Date())
  }

  private func ms(_ a: Date, _ b: Date) -> Double { b.timeIntervalSince(a) * 1000 }

  @ViewBuilder
  private func frame(def: KReelDef, data: KReelData, s: CGFloat, now: Date) -> some View {
    let n = def.scenes.count
    let since = ms(cur.start, now)
    let fadeIn = still ? 1 : KReelEase.inOutQuad(KReelClock.clamp01(since / 260))
    ZStack(alignment: .topLeading) {
      if let p = prev, !still, since < 200 {
        scene(def.scenes[p.index % n], data: data, s: s, t: ms(p.start, now))
          .opacity(1 - KReelEase.inOutQuad(KReelClock.clamp01(since / 200)))
      }
      scene(def.scenes[cur.index % n], data: data, s: s, t: since)
        .opacity(fadeIn)
      bars(def: def, s: s, now: now)
    }
    .frame(width: s, height: s, alignment: .topLeading)
  }

  private func scene(_ sc: KReelScene, data: KReelData, s: CGFloat, t: Double) -> some View {
    let ctx = KReelCtx(s: s, c: KReelClock(t: max(0, t), still: still), data: data, images: spec.images, face: face)
    return sc.draw(ctx)
      .frame(width: s, height: s, alignment: .topLeading)
      .clipped()
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }

  /// the story bars: 3 tall, 4 apart, 10 in from the sides and the top
  private func bars(def: KReelDef, s: CGFloat, now: Date) -> some View {
    let i = cur.index % def.scenes.count
    let playing = spec.live
    return HStack(spacing: 4) {
      ForEach(Array(def.scenes.enumerated()), id: \.offset) { n, sc in
        let fill: Double = n < i ? 1 : n > i ? 0 : (!playing ? 0 : still ? 1 : KReelClock.clamp01(ms(segStart, now) / sc.ms))
        Capsule()
          .fill(kReelColor("rgba(17,17,19,0.14)"))
          .overlay(alignment: .leading) {
            GeometryReader { g in
              Rectangle().fill(kReelColor("rgba(17,17,19,0.55)")).frame(width: g.size.width * fill, height: 3)
            }
          }
          .clipShape(RoundedRectangle(cornerRadius: 2, style: .circular))
          .frame(height: 3)
      }
    }
    .frame(width: max(0, s - 20), height: 3)
    .offset(x: 10, y: 10)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// The square's button: no dimming, no scaling (a Pressable with no pressed style)
struct KReelPlain: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View { configuration.label }
}
