import SwiftUI

/* WREN, DRAWN IN SWIFT.
   ─────────────────────────────────────────────────────────────────────────────
   Until now every bird a SwiftUI screen showed was a picture: a snapshot of the
   React Native WrenBird, taken at runtime and handed over as an image ref
   (KWrenPicture). That keeps one drawing, but it also keeps React Native in the
   room, and a picture cannot lean into a turn or change colour on a tap.

   This draws her from the same data the React Native bird draws from — the
   generator's symbols (design/wren-family-gen.mjs → KWrenFamilyData) — and
   repeats what src/components/WrenBird.tsx adds on top of the data, rule for
   rule: which symbol a stage / mood / pose picks, the hatchling shaped to the
   reader, the birthmark, the hatch-stage eyes per mood, the tail feather, what
   she wears, wilting, the letter under the flying bird, and no white outline
   unless asked. If WrenBird.tsx changes, this file changes with it.

   Two ways in: KWrenBird, a view; and KWrenBird.draw, for a Canvas that places
   her itself (the planet). */

// MARK: - Who she is

public enum KWrenSkin: String, Sendable, CaseIterable {
  /// Sky (free), Mist, Night, Moss, Peach — the React Native names
  case sticker, plush, ink, moss, peach
}

public enum KWrenStage: String, Sendable, CaseIterable {
  case egg, hatch, fledge, wren

  /// the stage's name in the generator's symbol keys; the grown bird has moods instead
  var key: String {
    switch self {
    case .egg: return "egg"
    case .hatch: return "hatchling"
    case .fledge: return "fledgling"
    case .wren: return "adult"
    }
  }
}

public enum KWrenMood: String, Sendable, CaseIterable {
  case content, happy, listen, sleepy, curious, delight, think, wink, worry
}

public enum KWrenAccessory: String, Sendable, CaseIterable {
  case none, beanie, scarf, phones, flower, party, shades, witch, ghost
}

public enum KWrenPose: String, Sendable {
  case perch, fly
}

/// The hatchling's own proportions, read from the writing that hatched her (lib/hatchling-form).
public struct KHatchlingForm: Equatable, Hashable, Sendable {
  public var bodyStretch: CGFloat = 1
  public var crestLift: CGFloat = 0
  public var eyeScale: CGFloat = 1
  public var eyeSpread: CGFloat = 0
  public var cheek: CGFloat = 1
  public var beakScale: CGFloat = 1
  public var tail = false

  public init() {}
}

/// Everything that decides how she is drawn.
public struct KWrenLook: Equatable, Hashable, Sendable {
  public var skin: KWrenSkin = .sticker
  public var stage: KWrenStage = .wren
  public var mood: KWrenMood = .content
  public var pose: KWrenPose = .perch
  public var accessory: KWrenAccessory = .none
  /// the white die-cut outline; off unless a surface asks for the lift
  public var outlined = false
  /// the flying pose's letter under her feet
  public var letter = true
  /// starving: she loses colour and droops
  public var wilt = false
  /// hatch stage only
  public var form: KHatchlingForm?
  /// the shell's birthmark, "#RRGGBB"; hatch stage only
  public var mark: String?

  public init() {}

  public init(skin: KWrenSkin = .sticker, stage: KWrenStage = .wren, mood: KWrenMood = .content, pose: KWrenPose = .perch, accessory: KWrenAccessory = .none) {
    self.skin = skin
    self.stage = stage
    self.mood = mood
    self.pose = pose
    self.accessory = accessory
  }
}

// MARK: - The data

/// One shape as the generator writes it: every number a string, as in the TypeScript object.
struct KWShape: Decodable, Equatable {
  var t: String
  var d: String?
  var cx: String?
  var cy: String?
  var r: String?
  var rx: String?
  var ry: String?
  var x: String?
  var y: String?
  var w: String?
  var h: String?
  var f: String?
  var s: String?
  var sw: String?
  var lc: String?
  var lj: String?
  var o: String?
  var tf: String?

  static func num(_ v: String?) -> CGFloat? {
    guard let v, let n = Double(v) else { return nil }
    return CGFloat(n)
  }
}

enum KWrenFamily {
  /// symbol → shapes, read once
  static let symbols: [String: [KWShape]] = {
    guard let data = KWrenFamilyData.json.data(using: .utf8) else { return [:] }
    let read = try? JSONDecoder().decode([String: [KWShape]].self, from: data)
    return read ?? [:]
  }()

  static func shapes(_ key: String) -> [KWShape] {
    symbols[key] ?? []
  }
}

// MARK: - One thing to paint

/// A shape ready for a GraphicsContext, on the 200 × 200 grid.
struct KWrenStroke: Equatable {
  var path: Path
  var fill: Color?
  var stroke: Color?
  var style = StrokeStyle(lineWidth: 1)
  var opacity: CGFloat = 1
}

// MARK: - The rules of WrenBird.tsx

enum KWrenRules {
  static let eye = "#1E1B33"
  static let highlight = "#FFFFFF"
  /// the letter under the flying bird, by the two colours nothing on her body uses
  static let letterEdge = "#D8D2C2"
  static let letterWax = "#E8A63C"
  /// the chick's body per skin: what patches over her baked-in eyes
  static let chickFill: [KWrenSkin: String] = [.sticker: "#5757EC", .plush: "#A9C6F2", .ink: "#2B2A4A", .moss: "#6DAE78", .peach: "#F2A08C"]
  static let beakFills: Set<String> = ["#EFB050", "#F2A0B5", "#F2887E", "#E8B04A", "#5B55FF"]
  /// the chick's far and near eye on the three-quarter head
  static let eyeFar = CGPoint(x: 89.5, y: 103)
  static let eyeNear = CGPoint(x: 117.5, y: 99.5)

  static func isWhite(_ c: String?) -> Bool {
    guard let c else { return false }
    let v = c.trimmingCharacters(in: .whitespaces).lowercased()
    return v == "#fff" || v == "#ffffff"
  }

  /// WILTING: every colour through saturate(.45) brightness(.96)
  static func wilted(_ c: String?) -> String? {
    guard let c, c.hasPrefix("#") else { return c }
    var h = String(c.dropFirst())
    if h.count == 3 { h = h.map { "\($0)\($0)" }.joined() }
    guard h.count == 6, let v = UInt32(h, radix: 16) else { return c }
    let r = Double((v >> 16) & 0xFF)
    let g = Double((v >> 8) & 0xFF)
    let b = Double(v & 0xFF)
    let s = 0.45
    let bright = 0.96
    let r2 = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b
    let g2 = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b
    let b2 = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b
    func ch(_ x: Double) -> String {
      let n = Int(max(0, min(255, (x * bright).rounded())))
      return String(format: "%02X", n)
    }
    return "#" + ch(r2) + ch(g2) + ch(b2)
  }

  /// The symbol for her body, and whether a hatch-stage mood has to redraw the eyes.
  static func bodyKey(_ look: KWrenLook, micro: Bool) -> (key: String, hatchMood: KWrenMood?) {
    let skin = look.skin.rawValue
    if look.pose == .fly { return ("wren-\(skin)-fly", nil) }
    if micro { return ("wren-\(skin)-mini", nil) }
    if look.stage != .wren {
      let mood: KWrenMood? = (look.stage == .hatch && look.mood != .content) ? look.mood : nil
      return ("wren-\(skin)-\(look.stage.key)", mood)
    }
    return ("wren-\(skin)-adult-\(look.mood.rawValue)", nil)
  }

  /// What she wears: the generator's overlay for her stage, or the flying set. The egg and the micro mark wear nothing.
  static func accessoryKey(_ look: KWrenLook, micro: Bool) -> String? {
    if look.accessory == .none || micro || look.stage == .egg { return nil }
    if look.pose == .fly { return "acc-shared-fly-\(look.accessory.rawValue)" }
    return "acc-shared-\(look.stage.key)-\(look.accessory.rawValue)"
  }

  static func withoutLetter(_ list: [KWShape]) -> [KWShape] {
    list.filter { $0.s != letterEdge && $0.f != letterWax }
  }

  /// SHAPING THE HATCHLING TO THE READ — parts found by their geometry, as in shapeHatchling.
  static func shapeHatchling(_ list: [KWShape], _ f: KHatchlingForm) -> [KWShape] {
    let axis: CGFloat = 100
    return list.map { sh in
      var out = sh
      let cx = KWShape.num(sh.cx) ?? .nan
      let r = KWShape.num(sh.r) ?? .nan
      let fill = (sh.f ?? "").uppercased()

      // the body: the one big circle becomes an ellipse
      if sh.t == "c", r >= 40 {
        out.t = "e"
        out.r = nil
        out.rx = "\(r / f.bodyStretch.squareRoot())"
        out.ry = "\(r * f.bodyStretch)"
        return out
      }
      // the eyes, and the highlights that ride with them
      let darkEye = sh.t == "c" && r > 4 && r < 14 && fill == eye
      let glint = sh.t == "c" && r <= 4 && isWhite(sh.f)
      if darkEye || glint {
        let move = cx < axis ? -f.eyeSpread : f.eyeSpread
        out.cx = "\(cx + move)"
        out.r = "\(r * f.eyeScale)"
        return out
      }
      // the cheeks: punctuation can remove them
      if sh.t == "c", fill == "#EF9CB4" {
        out.r = f.cheek <= 0.02 ? "0" : "\(r * min(1.5, f.cheek))"
        return out
      }
      // the crest: her only stroke-only path
      if sh.t == "p", sh.f == "none", f.crestLift != 0 {
        out.tf = "translate(0 \(-f.crestLift))"
        return out
      }
      // the beak, scaled about its own centre
      if sh.t == "p", beakFills.contains(fill), f.beakScale != 1 {
        let k = f.beakScale
        out.tf = "translate(\(128 * (1 - k)) \(117 * (1 - k))) scale(\(k))"
        return out
      }
      return out
    }
  }

  /// "rotate(a cx cy) translate(x y) scale(k)" as SVG applies a list: the first is outermost.
  static func transform(_ tf: String?) -> CGAffineTransform {
    guard let tf, !tf.isEmpty else { return .identity }
    var total = CGAffineTransform.identity
    var rest = Substring(tf)
    while let open = rest.firstIndex(of: "("), let close = rest.firstIndex(of: ")") {
      let name = rest[rest.startIndex..<open].trimmingCharacters(in: .whitespaces)
      let inside = rest[rest.index(after: open)..<close]
      let nums: [CGFloat] = inside.split(whereSeparator: { $0 == " " || $0 == "," }).compactMap { Double($0) }.map { CGFloat($0) }
      var one = CGAffineTransform.identity
      if name == "rotate", let a = nums.first {
        let rad = a * .pi / 180
        if nums.count >= 3 {
          let pivot = CGAffineTransform(translationX: -nums[1], y: -nums[2])
          one = pivot.concatenating(CGAffineTransform(rotationAngle: rad)).concatenating(CGAffineTransform(translationX: nums[1], y: nums[2]))
        } else {
          one = CGAffineTransform(rotationAngle: rad)
        }
      } else if name == "translate", let x = nums.first {
        one = CGAffineTransform(translationX: x, y: nums.count > 1 ? nums[1] : 0)
      } else if name == "scale", let k = nums.first {
        one = CGAffineTransform(scaleX: k, y: nums.count > 1 ? nums[1] : k)
      }
      total = one.concatenating(total)
      rest = rest[rest.index(after: close)...]
    }
    return total
  }

  static func color(_ hex: String?, wilt: Bool) -> Color? {
    guard let hex, hex != "none", !hex.isEmpty else { return nil }
    let c = wilt ? (wilted(hex) ?? hex) : hex
    return Color(hex: c)
  }

  /// One symbol's shapes, painted as Shapes() paints them.
  static func strokes(_ list: [KWShape], bare: Bool, wilt: Bool) -> [KWrenStroke] {
    list.map { s in
      var path: Path
      switch s.t {
      case "p":
        path = KSVGPath.path(s.d ?? "")
      case "c":
        let cx = KWShape.num(s.cx) ?? 0
        let cy = KWShape.num(s.cy) ?? 0
        let r = max(0, KWShape.num(s.r) ?? 0)
        path = Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
      case "e":
        let cx = KWShape.num(s.cx) ?? 0
        let cy = KWShape.num(s.cy) ?? 0
        let rx = max(0, KWShape.num(s.rx) ?? 0)
        let ry = max(0, KWShape.num(s.ry) ?? 0)
        path = Path(ellipseIn: CGRect(x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2))
      default:
        let rect = CGRect(x: KWShape.num(s.x) ?? 0, y: KWShape.num(s.y) ?? 0, width: KWShape.num(s.w) ?? 0, height: KWShape.num(s.h) ?? 0)
        let corner = KWShape.num(s.rx) ?? 0
        path = Path(roundedRect: rect, cornerRadius: corner)
      }
      let tf = transform(s.tf)
      if tf != .identity { path = path.applying(tf) }
      let strip = bare && isWhite(s.s)
      var out = KWrenStroke(path: path)
      // SVG's default fill is black; the generator always writes one, "none" included
      out.fill = s.f == nil ? Color.black : color(s.f, wilt: wilt)
      out.stroke = strip ? nil : color(s.s, wilt: wilt)
      let cap: CGLineCap = s.lc == "round" ? .round : .butt
      let join: CGLineJoin = s.lj == "round" ? .round : .miter
      out.style = StrokeStyle(lineWidth: KWShape.num(s.sw) ?? 1, lineCap: cap, lineJoin: join, miterLimit: 4)
      out.opacity = KWShape.num(s.o) ?? 1
      return out
    }
  }

  static func line(_ d: String, _ stroke: String, _ width: CGFloat, wilt: Bool) -> KWrenStroke {
    var out = KWrenStroke(path: KSVGPath.path(d))
    out.stroke = color(stroke, wilt: wilt)
    out.style = StrokeStyle(lineWidth: width, lineCap: .round, lineJoin: .miter, miterLimit: 4)
    return out
  }

  static func dot(_ c: CGPoint, _ r: CGFloat, _ fill: String, wilt: Bool) -> KWrenStroke {
    var out = KWrenStroke(path: Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)))
    out.fill = color(fill, wilt: wilt)
    return out
  }

  static func filled(_ d: String, _ fill: String, wilt: Bool) -> KWrenStroke {
    var out = KWrenStroke(path: KSVGPath.path(d))
    out.fill = color(fill, wilt: wilt)
    return out
  }

  /// The hatchling's eyes for a mood, each mark placed from the eye it belongs to (HatchEyes).
  static func hatchEyes(_ mood: KWrenMood, skin: KWrenSkin, form: KHatchlingForm?, wilt: Bool) -> [KWrenStroke] {
    let patchFill = chickFill[skin] ?? "#5757EC"
    let spread = form?.eyeSpread ?? 0
    let k = form?.eyeScale ?? 1
    let el = CGPoint(x: eyeFar.x - spread, y: eyeFar.y)
    let er = CGPoint(x: eyeNear.x + spread, y: eyeNear.y)
    let patch = [dot(el, 11 * k, patchFill, wilt: wilt), dot(er, 11 * k, patchFill, wilt: wilt)]
    func both(_ d: (CGPoint) -> String, _ width: CGFloat) -> [KWrenStroke] {
      [line(d(el), eye, width, wilt: wilt), line(d(er), eye, width, wilt: wilt)]
    }
    func star(_ e: CGPoint) -> KWrenStroke {
      filled("M\(e.x) \(e.y - 11) l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z", "#E8A63C", wilt: wilt)
    }
    switch mood {
    case .happy:
      return patch + both({ e in "M\(e.x - 9) \(e.y + 2) Q\(e.x) \(e.y - 8) \(e.x + 9) \(e.y + 2)" }, 6)
    case .sleepy:
      return patch + both({ e in "M\(e.x - 9) \(e.y - 2) Q\(e.x) \(e.y + 6) \(e.x + 9) \(e.y - 2)" }, 6)
    case .delight:
      return patch + [star(el), star(er)]
    case .worry:
      let brows = both({ e in "M\(e.x - 10) \(e.y - 13) Q\(e.x) \(e.y - 9) \(e.x + 10) \(e.y - 13)" }, 4.5)
      let tear = filled("M\(er.x + 18) \(er.y - 4) q5 8 0 14 q-5 -6 0 -14 z", "#8ECBE8", wilt: wilt)
      return brows + [tear]
    case .listen:
      return both({ e in "M\(e.x - 10) \(e.y - 11) Q\(e.x) \(e.y - 16) \(e.x + 10) \(e.y - 11)" }, 4.5)
    case .curious:
      let far = [dot(el, 9 * k, eye, wilt: wilt), dot(CGPoint(x: el.x - 3 * k, y: el.y - 3 * k), 3 * k, highlight, wilt: wilt)]
      let near = [dot(er, 6 * k, eye, wilt: wilt), dot(CGPoint(x: er.x - 2 * k, y: er.y - 2 * k), 2 * k, highlight, wilt: wilt)]
      return patch + far + near
    case .think:
      let grey = "#A6A1B6"
      return [
        dot(CGPoint(x: er.x + 24, y: er.y - 18), 2.6, grey, wilt: wilt),
        dot(CGPoint(x: er.x + 32, y: er.y - 24), 2.2, grey, wilt: wilt),
        dot(CGPoint(x: er.x + 38, y: er.y - 31), 1.8, grey, wilt: wilt),
      ]
    case .wink:
      return [dot(el, 11 * k, patchFill, wilt: wilt), line("M\(el.x - 9) \(el.y) Q\(el.x) \(el.y - 6) \(el.x + 9) \(el.y)", eye, 6, wilt: wilt)]
    case .content:
      return []
    }
  }

  /// Everything to paint for a look, bottom first, on the 200 grid (before the droop).
  static func strokes(for look: KWrenLook, micro: Bool) -> [KWrenStroke] {
    let body = bodyKey(look, micro: micro)
    var list = KWrenFamily.shapes(body.key)
    let hatch = look.stage == .hatch
    if hatch, let form = look.form {
      list = shapeHatchling(list, form)
    }
    // the letter comes off whatever her shape (a hatchling flying off the clock carried one, 2026-11-13)
    if look.pose == .fly, !look.letter {
      list = withoutLetter(list)
    }
    let bare = !look.outlined
    var out = strokes(list, bare: bare, wilt: look.wilt)

    // the extra feather a distinctive hand earns (its white edge is drawn, as in TailFeather)
    if hatch, look.form?.tail == true {
      var feather = filled("M50 117 q-22 -12 -27 2 q14 10 28 4 Z", "#4646DB", wilt: look.wilt)
      feather.stroke = Color.white
      feather.style = StrokeStyle(lineWidth: 5, lineCap: .butt, lineJoin: .round, miterLimit: 4)
      out.append(feather)
    }
    // the shell's birthmark, on the chick's forehead
    if hatch, look.pose != .fly, !micro, let mark = look.mark, !mark.isEmpty {
      var spot = filled("M98 79 q8 -7 16 0 q-3 9 -8 9 q-5 0 -8 -9z", mark, wilt: look.wilt)
      spot.opacity = 0.8
      out.append(spot)
    }
    if let mood = body.hatchMood {
      out += hatchEyes(mood, skin: look.skin, form: look.form, wilt: look.wilt)
    }
    if let key = accessoryKey(look, micro: micro) {
      out += strokes(KWrenFamily.shapes(key), bare: bare, wilt: look.wilt)
    }
    return out
  }
}

// MARK: - Drawing her

/// What a look paints, kept once per look: a card redraws her sixty times a second.
final class KWrenCache: @unchecked Sendable {
  static let shared = KWrenCache()
  private struct Key: Hashable {
    let look: KWrenLook
    let micro: Bool
  }
  private var kept: [Key: [KWrenStroke]] = [:]
  private let lock = NSLock()

  func strokes(_ look: KWrenLook, micro: Bool) -> [KWrenStroke] {
    let key = Key(look: look, micro: micro)
    lock.lock()
    defer { lock.unlock() }
    if let hit = kept[key] { return hit }
    let made = KWrenRules.strokes(for: look, micro: micro)
    if kept.count > 240 { kept.removeAll() }
    kept[key] = made
    return made
  }
}

public struct KWrenBird: View {
  private let look: KWrenLook
  private let size: CGFloat

  /// - Parameters:
  ///   - look: who she is right now
  ///   - size: her side, in points (WrenBird's `size`: 20 and under draws the micro mark)
  public init(_ look: KWrenLook = KWrenLook(), size: CGFloat = 96) {
    self.look = look
    self.size = size
  }

  public var body: some View {
    Canvas { context, canvas in
      var ctx = context
      let box = CGRect(origin: .zero, size: canvas)
      KWrenBird.draw(look, in: &ctx, rect: box)
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }

  /// Draws her into `rect` (a square: the 200 grid scaled to its side) in a context the caller has
  /// already placed — the planet moves, leans and flips the context, then calls this.
  public static func draw(_ look: KWrenLook, in context: inout GraphicsContext, rect: CGRect) {
    let side = min(rect.width, rect.height)
    guard side > 0 else { return }
    let micro = side <= 20
    let list = KWrenCache.shared.strokes(look, micro: micro)
    var ctx = context
    ctx.translateBy(x: rect.minX, y: rect.minY)
    ctx.scaleBy(x: side / 200, y: side / 200)
    if look.wilt {
      // she droops seven degrees on her feet and sinks a little: translate(0 9) rotate(-7 100 180)
      ctx.translateBy(x: 0, y: 9)
      ctx.translateBy(x: 100, y: 180)
      ctx.rotate(by: .degrees(-7))
      ctx.translateBy(x: -100, y: -180)
    }
    for item in list {
      var layer = ctx
      if item.opacity < 1 { layer.opacity = ctx.opacity * item.opacity }
      if let fill = item.fill {
        layer.fill(item.path, with: .color(fill))
      }
      if let stroke = item.stroke {
        layer.stroke(item.path, with: .color(stroke), style: item.style)
      }
    }
  }
}
