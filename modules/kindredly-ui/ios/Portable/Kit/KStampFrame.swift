// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 STAMP v2 · THE FRAME AS CODE, in Swift (stamp-spec §2 and §3; the owner approved the 36-stamp
 set on 2026-10-18). A line-for-line port of src/lib/stamp-frame.ts, which React Native's
 components/Stamp and the web's stampSVG read too: everything about a stamp that is not its
 drawing. The tier a rendered width falls in, the perforated 5:6 paper, the 4:5 window, the
 series ground, the colours, the keyline and the rim, the tilt, the postmark and the ladder of
 sizes. The drawing itself is Kit/KStampArtData.swift (generated from src/data/stamp-art-v2.ts by
 scripts/gen-stamp-art-swift.mjs), and Kit/KStampArt.swift (KStamp) lays the two on top of each
 other. Nothing here draws a view; KStampShape, at the end, is the paper as a SwiftUI Shape.

 One implementation for every renderer (spec §2.11), so the numbers are the TypeScript's,
 computed in the same order, and the strings come out the same: silhouetteData(_:) writes the
 perforation exactly as stamp-frame.ts silhouettePath(width) does (3 decimals, the straight
 edges' 100 and 120 bare), and KStampShape draws that very string through the module's SVG
 reader (KSVGPath). design/stamps-v2/golden.json holds the strings src/lib/stamp-frame.test.ts
 locks the TypeScript to; scripts/stamp-frame-golden.swift locks this file to the same file,
 with the tiers, the tilts and the colour mixing beside them. It compiles this file and
 KLineGlyph.swift on the Mac (both import SwiftUI only and need nothing else from the module):
     xcrun swiftc -parse-as-library -target arm64-apple-macos14 \
       modules/kindredly-ui/ios/Portable/Kit/KStampFrame.swift \
       modules/kindredly-ui/ios/Portable/Kit/KLineGlyph.swift \
       scripts/stamp-frame-golden.swift -o "$TMPDIR/stamp-frame-golden" \
       && "$TMPDIR/stamp-frame-golden" design/stamps-v2/golden.json
 Keep this file free of the rest of the module (KTheme, KArtPath, …) so that stays true.

 Units. The stamp is authored on a 100 × 120 box (1u = W/100 pt, H = 1.2 W). Paths and rects
 below are in box units; sizes that say Pt are points on screen. Colours are 0xRRGGBB (no alpha:
 every colour of the frame is opaque, and its opacities are separate numbers, as in the TS).
 */

// MARK: - Tiers (spec §2.2, §2.3): the level of detail by rendered width

/// The level of detail a stamp is drawn at, by its rendered width (stamp-frame StampTier).
public enum KStampTier: String, CaseIterable, Sendable {
  case dot, chip, xs, s, m, l, xl
}

/// One tier's rules (stamp-frame StampTierSpec), number for number.
public struct KStampTierSpec: Equatable, Sendable {
  /// what is drawn: nothing, the xs cut (over the whole silhouette), or the art in the window
  public enum Motif: Sendable { case none, xs, art }
  /// the soft plate: none; .s = every soft mark except those flagged dropAtS; .all
  public enum Soft: Sendable { case none, s, all }

  public let tier: KStampTier
  /// the narrowest rendered width (pt, inclusive) in this tier
  public let minWidth: CGFloat
  /// bites across the top and bottom, and down each side (always 5:6, so the pitch is equal)
  public let nx: Int
  public let ny: Int
  /// bite radius in box units: 0.3 × the pitch
  public let r: CGFloat
  /// true: a 10u paper margin round the window; false: the field is the stamp (chip, XS)
  public let paper: Bool
  public let motif: Motif
  /// the category's series ground behind the art
  public let ground: Bool
  public let soft: Soft
  /// strokes are never drawn thinner than this on screen (0: nothing drawn)
  public let minStrokePt: CGFloat
  /// the light-theme keyline width (0: none), ln at keylineOpacity, centred on the edge
  public let keylinePt: CGFloat
  /// delivered mail at this size may tilt and carry the postmark (M and up)
  public let delivered: Bool
}

public enum KStampFrame {
  // MARK: the box (spec §2.1, §2.4)

  /// the authoring box: 100 × 120 units, 5:6
  public static let box = CGRect(x: 0, y: 0, width: 100, height: 120)
  /// the printed window: 80 × 100u, exactly 4:5, square corners; everything drawn is clipped to it
  public static let window = CGRect(x: 10, y: 10, width: 80, height: 100)
  /// the one stroke weight of the drawings, in box units (2.16pt at the 50-wide card)
  public static let strokeU: CGFloat = 4.31
  /// below the chip there is no stamp: a dot of the field colour this wide (pt)
  public static let dotPt: CGFloat = 6

  /// a stamp's height for a width: every stamp is 5:6
  public static func height(_ width: CGFloat) -> CGFloat {
    width * 6 / 5
  }

  // MARK: tiers

  public static let tiers: [KStampTierSpec] = [
    KStampTierSpec(tier: .dot, minWidth: 0, nx: 0, ny: 0, r: 0, paper: false, motif: .none, ground: false, soft: .none, minStrokePt: 0, keylinePt: 0, delivered: false),
    KStampTierSpec(tier: .chip, minWidth: 15, nx: 5, ny: 6, r: 6, paper: false, motif: .none, ground: false, soft: .none, minStrokePt: 0, keylinePt: 0, delivered: false),
    KStampTierSpec(tier: .xs, minWidth: 20, nx: 5, ny: 6, r: 6, paper: false, motif: .xs, ground: false, soft: .none, minStrokePt: 1.5, keylinePt: 0, delivered: false),
    KStampTierSpec(tier: .s, minWidth: 25, nx: 5, ny: 6, r: 6, paper: true, motif: .art, ground: false, soft: .s, minStrokePt: 1.25, keylinePt: 0.75, delivered: false),
    KStampTierSpec(tier: .m, minWidth: 40, nx: 10, ny: 12, r: 3, paper: true, motif: .art, ground: true, soft: .all, minStrokePt: 1.25, keylinePt: 1, delivered: true),
    KStampTierSpec(tier: .l, minWidth: 80, nx: 15, ny: 18, r: 2, paper: true, motif: .art, ground: true, soft: .all, minStrokePt: 1.25, keylinePt: 1.25, delivered: true),
    KStampTierSpec(tier: .xl, minWidth: 160, nx: 20, ny: 24, r: 1.5, paper: true, motif: .art, ground: true, soft: .all, minStrokePt: 1.25, keylinePt: 1.5, delivered: true),
  ]

  private static let specByTier: [KStampTier: KStampTierSpec] = Dictionary(uniqueKeysWithValues: tiers.map { ($0.tier, $0) })

  /// The tier a rendered width (pt) falls in. Below 15 (or not a number): .dot, no stamp.
  public static func tier(for width: CGFloat) -> KStampTier {
    guard width >= 15 else { return .dot } // NaN fails the comparison too, as `!(width >= 15)` does
    if width < 20 { return .chip }
    if width < 25 { return .xs }
    if width < 40 { return .s }
    if width < 80 { return .m }
    if width < 160 { return .l }
    return .xl
  }

  public static func spec(_ tier: KStampTier) -> KStampTierSpec {
    specByTier[tier] ?? tiers[0]
  }

  public static func spec(for width: CGFloat) -> KStampTierSpec {
    spec(tier(for: width))
  }

  /// The stroke width to draw the art with at a rendered width, in box units: 4.31u, or more when
  /// that would fall under the tier's minimum on screen (XS 1.5pt, S and up 1.25pt).
  public static func strokeU(for width: CGFloat) -> CGFloat {
    let s = spec(for: width)
    guard s.minStrokePt > 0, width > 0 else { return strokeU }
    return max(strokeU, s.minStrokePt * 100 / width)
  }

  // MARK: the silhouette (spec §2.1): build.py's silhouette(), exactly

  /// toFixed(3). None of the silhouette's numbers sits on a tie at the fourth decimal, where
  /// JavaScript (ties up) and printf (ties to even) could part; the golden check would say so.
  private static func f3(_ v: Double) -> String {
    String(format: "%.3f", v)
  }

  /**
   The perforated paper on 0 0 100 120: semicircular bites centred on the edge line at k·pitch
   (pitch = 100 / nx = 120 / ny) for k = 0…n, so every corner is a quarter-circle notch; bite
   radius 0.3 × pitch. stamp-frame.ts silhouetteFor(nx, ny), string for string.
   */
  public static func silhouetteData(nx: Int, ny: Int) -> String {
    guard nx > 0, ny > 0 else { return "" }
    let w = 100.0
    let h = 120.0
    let p = w / Double(nx)
    let r = 0.3 * p
    let rr = "\(f3(r)),\(f3(r))"
    var d = "M\(f3(r)),0"
    for k in stride(from: 1, to: nx, by: 1) {
      let x = Double(k) * p
      d += "L\(f3(x - r)),0 A\(rr) 0 0 0 \(f3(x + r)),0"
    }
    d += "L\(f3(w - r)),0 A\(rr) 0 0 0 \(f3(w)),\(f3(r))"
    for k in stride(from: 1, to: ny, by: 1) {
      let y = Double(k) * p
      d += "L100,\(f3(y - r)) A\(rr) 0 0 0 100,\(f3(y + r))"
    }
    d += "L100,\(f3(h - r)) A\(rr) 0 0 0 \(f3(w - r)),120"
    for k in stride(from: nx - 1, to: 0, by: -1) {
      let x = Double(k) * p
      d += "L\(f3(x + r)),120 A\(rr) 0 0 0 \(f3(x - r)),120"
    }
    d += "L\(f3(r)),120 A\(rr) 0 0 0 0,\(f3(h - r))"
    for k in stride(from: ny - 1, to: 0, by: -1) {
      let y = Double(k) * p
      d += "L0,\(f3(y + r)) A\(rr) 0 0 0 0,\(f3(y - r))"
    }
    d += "L0,\(f3(r)) A\(rr) 0 0 0 \(f3(r)),0Z"
    return d
  }

  private static let silhouettes: [KStampTier: String] = Dictionary(uniqueKeysWithValues: tiers.map { ($0.tier, silhouetteData(nx: $0.nx, ny: $0.ny)) })

  /// The silhouette of a tier as SVG path data ("" for the dot: there is no stamp).
  public static func silhouetteData(_ tier: KStampTier) -> String {
    silhouettes[tier] ?? ""
  }

  /// The 5:6 paper with its perforation for a rendered width ("" below 15pt: draw the dot).
  public static func silhouetteData(width: CGFloat) -> String {
    silhouetteData(tier(for: width))
  }

  /// The field's rect for a rendered width: the window from S up; the whole box at chip and XS,
  /// where the field is the stamp (clip it to the silhouette).
  public static func windowRect(width: CGFloat) -> CGRect {
    spec(for: width).paper ? window : box
  }

  // MARK: series grounds (spec §2.5): one flat shape per category, M and up

  /// Each category's ground as path data on 0 0 100 120, already inside the window. Fill with
  /// groundRGB(hex), behind the motif, from M up.
  public static let grounds: [String: String] = [
    "confessions": "M20,58A30,30 0 1 0 80,58A30,30 0 1 0 20,58Z", // spotlight disc, r 30 at 50,58
    "almosts": "M14,110A36,36 0 0 1 86,110Z", // low sun, a half disc r 36 on the window floor
    "latenights": "M10,10H90V44H10Z", // sky band, the top 34u
    "small": "M10,110L10,92Q50,66 90,92L90,110Z", // hill
    "becoming": "M10,110L90,110L90,58Z", // rising slope, bottom-left to the right edge at y 58
    "missing": "M90,10V48A38,38 0 0 1 52,10Z", // far lamp, a quarter disc r 38 in the top-right corner
  ]

  /// A category's series ground ("" for a category that has none).
  public static func groundData(_ category: String) -> String {
    grounds[category] ?? ""
  }

  // MARK: colour (spec §2.5, §2.6, §2.11)

  public static let white: UInt32 = 0xFFFFFF
  /// the last fallback (spec §2.11): the template in this tint with no motif
  public static let fallbackRGB: UInt32 = 0x8B7FE8
  /// ln in Classic, Lavender and Paper: the keyline and the postmark on light themes
  public static let inkLight: UInt32 = 0x1E1B35
  /// ln in Midnight: the postmark on dark
  public static let inkDark: UInt32 = 0xD4D0EA
  public static let paperLight: UInt32 = 0xFFFFFF
  /// Midnight's paper: cool, from its own ink family, deliberately not cream
  public static let paperDark: UInt32 = 0xECE9F4
  public static let softMix = 0.55
  public static let groundMix = 0.2
  /// the light keyline's opacity: one constant (spec §2.3: step it to 0.55 if device review asks)
  public static let keylineOpacity = 0.4

  /// "#RRGGBB" (the # optional, either case) as 0xRRGGBB; nil for anything else.
  public static func rgb(hex: String) -> UInt32? {
    let trimmed = hex.trimmingCharacters(in: .whitespaces)
    let digits = trimmed.hasPrefix("#") ? String(trimmed.dropFirst()) : trimmed
    guard digits.count == 6, digits.allSatisfy(\.isHexDigit) else { return nil }
    return UInt32(digits, radix: 16)
  }

  /// a + (b − a)·t per channel, rounded half up (JavaScript's Math.round, the stamp checker's
  /// rule), as 0xRRGGBB.
  public static func mix(_ a: UInt32, _ b: UInt32, _ t: Double) -> UInt32 {
    var out: UInt32 = 0
    for shift in [16, 8, 0] as [UInt32] {
      let x = Double((a >> shift) & 0xFF)
      let y = Double((b >> shift) & 0xFF)
      let v = (x + (y - x) * t + 0.5).rounded(.down)
      out |= UInt32(min(255, max(0, v))) << shift
    }
    return out
  }

  /// stamp-frame mixHex: "#RRGGBB" in capitals; a colour that isn't #RRGGBB reads as the fallback tint.
  public static func mixHex(_ a: String, _ b: String, _ t: Double) -> String {
    hexString(mix(rgb(hex: a) ?? fallbackRGB, rgb(hex: b) ?? fallbackRGB, t))
  }

  public static func hexString(_ rgb: UInt32) -> String {
    "#" + String(format: "%06X", rgb & 0xFFFFFF)
  }

  /// the soft plate (secondary marks): mix(hex, white, 0.55)
  public static func softRGB(_ hex: UInt32) -> UInt32 { mix(hex, white, softMix) }
  /// the series ground: mix(hex, white, 0.20)
  public static func groundRGB(_ hex: UInt32) -> UInt32 { mix(hex, white, groundMix) }
  public static func softHex(_ hex: String) -> String { mixHex(hex, "#FFFFFF", softMix) }
  public static func groundHex(_ hex: String) -> String { mixHex(hex, "#FFFFFF", groundMix) }
  /// the paper: white on the light themes, #ECE9F4 on Midnight
  public static func paperRGB(dark: Bool) -> UInt32 { dark ? paperDark : paperLight }

  /// A frame colour as SwiftUI paints it, in sRGB.
  public static func color(_ rgb: UInt32, opacity: Double = 1) -> Color {
    Color(
      .sRGB,
      red: Double((rgb >> 16) & 0xFF) / 255,
      green: Double((rgb >> 8) & 0xFF) / 255,
      blue: Double(rgb & 0xFF) / 255,
      opacity: opacity
    )
  }

  /// The stamp's edge stroke (stamp-frame StampEdge).
  public struct Edge: Equatable, Sendable {
    public enum Kind: Sendable { case keyline, rim }
    /// .keyline: ln at 40% (light); .rim: the 1pt paper rim of chip and XS on a dark surface
    public let kind: Kind
    public let rgb: UInt32
    public let opacity: Double
    /// stroke width in pt, centred on the silhouette (× 100 / W for box units)
    public let widthPt: CGFloat
  }

  /// The stamp's edge (spec §2.3, §2.6). Light: ln at 40%, S 0.75 / M 1 / L 1.25 / XL 1.5pt, none
  /// at chip and XS. Dark (Midnight, or any dark surface): no keyline; chip and XS get a 1pt paper
  /// rim. nil when nothing is stroked. No stamp ever has a shadow.
  public static func edge(dark: Bool, tier: KStampTier) -> Edge? {
    if dark {
      return tier == .chip || tier == .xs ? Edge(kind: .rim, rgb: paperDark, opacity: 1, widthPt: 1) : nil
    }
    let w = spec(tier).keylinePt
    return w > 0 ? Edge(kind: .keyline, rgb: inkLight, opacity: keylineOpacity, widthPt: w) : nil
  }

  // MARK: tilt (spec §2.7): delivered mail at M and up only

  public static let tilts: [Double] = [-2, -1, 1, 2]   // owner, 2026-10-18 (was ±3 / ±1.5)

  /// FNV-1a 32 over the string's UTF-16 code units, as lib/mosaic hashStr (0 for ""). Letter ids
  /// are ASCII uuids, where that equals the FNV-1a of the UTF-8 bytes.
  public static func fnv1a(_ s: String) -> UInt32 {
    if s.isEmpty { return 0 }
    var h: UInt32 = 2_166_136_261
    for unit in s.utf16 {
      h ^= UInt32(unit)
      h = h &* 16_777_619
    }
    return h
  }

  /// A delivered letter's stamp tilt in degrees: [−3, −1.5, +1.5, +3][FNV-1a-32(letterId) mod 4],
  /// the same on iOS, RN and the web, so sender and reader see one tilt.
  public static func tilt(letterId: String) -> Double {
    tilts[Int(fnv1a(letterId) % 4)]
  }

  // MARK: postmark (spec §2.7): delivered mail at M and up

  public enum Postmark {
    public static let lines = 4
    public static let strokePt: CGFloat = 1
    public static let amplitudePt = 1.2
    public static let wavelengthPt = 10.0
    /// between the lines' axes
    public static let gapPt = 3.6
    /// the band's length, × W
    public static let lengthRatio = 1.3
    /// its right end overprints the stamp's left 20%
    public static let overprintRatio = 0.2
    /// the band's lowest trough (centre-line) sits at 0.95 H
    public static let bottomRatio = 0.95
    /// it is drawn only while the name-and-meta block is no taller than 0.72 H
    public static let textMaxRatio = 0.72
    /// draw-in, left to right, on a card's first view (static with Reduce Motion)
    public static let drawInMs = 180.0
    public static let opacityLight = 0.28
    public static let opacityDark = 0.3
    /// the lines sample the sine every this many pt
    public static let stepPt = 0.5
  }

  /// stamp-frame PostmarkGeometry: in the card's points, relative to the stamp's UNROTATED
  /// top-left (the postmark does not tilt with the stamp); every number to 2 decimals.
  public struct PostmarkGeometry: Equatable, Sendable {
    /// the lines' ends (x0 < 0: the band starts left of the stamp)
    public let x0: Double
    public let x1: Double
    /// the band's centre-line extent, crest of the first line to trough of the last
    public let top: Double
    public let bottom: Double
    /// each line's axis (rest) y
    public let axes: [Double]
    /// each line's points (a polyline every Postmark.stepPt), already rounded as the paths write them
    public let points: [[CGPoint]]
    /// each line as SVG path data, exactly as stamp-frame.ts postmark().paths writes it
    public let paths: [String]
    public let strokePt: CGFloat
    /// the tallest name-and-meta block (pt, from the stamp's top) that leaves the band clear of
    /// text: 0.72 H, or the band's ink top when that is higher. Taller: no postmark at all.
    public let maxTextBlockPt: Double
  }

  /// to 2 decimals as Math.round(n * 100) / 100 rounds (half up), -0 as 0
  static func r2(_ n: Double) -> Double {
    let r = (n * 100 + 0.5).rounded(.down) / 100
    return r == 0 ? 0 : r
  }

  /// a number as JavaScript's String() writes it, for the 2-decimal values here
  static func js(_ n: Double) -> String {
    if n == n.rounded(), abs(n) < 1e15 { return String(Int64(n)) }
    return "\(n)"
  }

  /// The postmark for a stamp drawn `width` pt wide (stamp-frame postmark(width)): four 1pt sine
  /// lines (amplitude 1.2pt, wavelength 10pt, axes 3.6pt apart), 1.3 W long, the right end at
  /// 0.2 W so it overprints the stamp's left 20%, the band's bottom at 0.95 H.
  public static func postmark(width: CGFloat) -> PostmarkGeometry {
    let w = Double(width)
    let hgt = w * 6 / 5
    let x1 = Postmark.overprintRatio * w
    let x0 = x1 - Postmark.lengthRatio * w
    let bottom = Postmark.bottomRatio * hgt
    let top = bottom - Double(Postmark.lines - 1) * Postmark.gapPt - 2 * Postmark.amplitudePt
    let axes = (0..<Postmark.lines).map { top + Postmark.amplitudePt + Double($0) * Postmark.gapPt }
    let n = max(1, Int(((x1 - x0) / Postmark.stepPt - 1e-9).rounded(.up)))
    var points: [[CGPoint]] = []
    var paths: [String] = []
    for axis in axes {
      var line: [CGPoint] = []
      var d = ""
      for i in 0...n {
        let x = i == n ? x1 : x0 + Double(i) * Postmark.stepPt
        let y = axis + Postmark.amplitudePt * sin((2 * Double.pi * (x - x0)) / Postmark.wavelengthPt)
        let rx = r2(x)
        let ry = r2(y)
        line.append(CGPoint(x: rx, y: ry))
        d += "\(i > 0 ? "L" : "M")\(js(rx)),\(js(ry))"
      }
      points.append(line)
      paths.append(d)
    }
    let inkTop = top - Double(Postmark.strokePt) / 2
    return PostmarkGeometry(
      x0: r2(x0),
      x1: r2(x1),
      top: r2(top),
      bottom: r2(bottom),
      axes: axes.map(r2),
      points: points,
      paths: paths,
      strokePt: Postmark.strokePt,
      maxTextBlockPt: r2(min(Postmark.textMaxRatio * hgt, inkTop))
    )
  }

  /// the postmark's colour: ln at 28% on light themes, Midnight's ln at 30%
  public static func postmarkInk(dark: Bool) -> (rgb: UInt32, opacity: Double) {
    dark ? (inkDark, Postmark.opacityDark) : (inkLight, Postmark.opacityLight)
  }

  /**
   Whether a delivered stamp's postmark may be drawn beside a text block when the two are centred
   in one row (components/Stamp postmarkFitsCentred): the block's bottom, measured from the
   stamp's top, must stay within postmark(width).maxTextBlockPt (0.72 H, 43.2pt at the 50×60
   card). `textHeight` is the block's measured height; 0 (not laid out yet) answers false, so the
   band never flashes over text that turns out to be tall.
   */
  public static func postmarkFitsCentred(width: CGFloat, textHeight: CGFloat) -> Bool {
    guard textHeight > 0 else { return false }
    let h = height(width)
    let row = max(h, textHeight)
    let stampTop = (row - h) / 2
    let textBottom = (row + textHeight) / 2
    return Double(textBottom - stampTop) <= postmark(width: width).maxTextBlockPt
  }
}

// MARK: - The ladder (spec §2.8): placements pass a width from here only

/// stamp-frame StampTiltRule: 0 or a fixed angle (degrees); .letter: tilt(letterId) of the
/// delivered letter; .scatter: the landing wall's own scatter within ±3°.
public enum KStampTiltRule: Equatable, Sendable {
  case fixed(Double)
  case letter
  case scatter
}

/// One named size (stamp-frame StampPlacement), in pt.
public struct KStampPlacement: Equatable, Sendable {
  public let name: String
  public let w: CGFloat
  public let h: CGFloat
  public let tilt: KStampTiltRule
  public let postmark: Bool

  init(_ name: String, _ w: CGFloat, _ tilt: KStampTiltRule = .fixed(0), postmark: Bool = false) {
    self.name = name
    self.w = w
    self.h = KStampFrame.height(w)
    self.tilt = tilt
    self.postmark = postmark
  }

  /// the fixed angle, 0 for a letter's tilt or the scatter (those are worked out where drawn)
  public var degrees: Double {
    if case let .fixed(d) = tilt { return d }
    return 0
  }
}

/// STAMP_LADDER, in its order (the dev gallery lists it as the TS does).
public enum KStampLadder {
  /// the Introduction envelope corner (the 10-letter road): chip
  public static let introEnvelope = KStampPlacement("introEnvelope", 15)
  /// Live Activity, Dynamic Island compact / minimal: XS
  public static let liveActivityIsland = KStampPlacement("liveActivityIsland", 20)
  /// Live Activity, lock screen: S
  public static let liveActivityLock = KStampPlacement("liveActivityLock", 25)
  /// first-flight route stops: XS + the localized name
  public static let routeStop = KStampPlacement("routeStop", 20)
  /// the chosen-stamp pill (40 capsule): XS leading
  public static let chosenPill = KStampPlacement("chosenPill", 20)
  /// the compose toolbar key (40): XS
  public static let composeKey = KStampPlacement("composeKey", 20)
  /// the compose page's stamp corner: 40×48 at the App Store page's 8° (owner, 2026-10-18)
  public static let composeCorner = KStampPlacement("composeCorner", 40, .fixed(8))
  /// the stamp tray tile (KStampTray, web Write): M, 6 columns
  public static let trayTile = KStampPlacement("trayTile", 40)
  /// My letters rows: S, 0°
  public static let myLettersRow = KStampPlacement("myLettersRow", 25)
  /// Drafts: S, 0°
  public static let draftsRow = KStampPlacement("draftsRow", 30)
  /// the kindred page's "began under": tilt from the thread's opening letter id, postmark
  public static let kindredBeganUnder = KStampPlacement("kindredBeganUnder", 40, .letter, postmark: true)
  /// the Today card, top-right of the header (owner confirmed 2026-10-18): tilt + wavy postmark
  public static let todayCard = KStampPlacement("todayCard", 50, .letter, postmark: true)
  /// the reader head: tilt, postmark
  public static let readerHead = KStampPlacement("readerHead", 60, .letter, postmark: true)
  /// the Settings First Class banner: Gold frame, Wren in the window, +3°
  public static let firstClassBanner = KStampPlacement("firstClassBanner", 60, .fixed(3))
  /// the First Class card "1ST": the Gold frame, +3°
  public static let firstClassCard = KStampPlacement("firstClassCard", 80, .fixed(3))
  /// Me › Your stamps (3 columns): the stamp is the cell; 0°, no postmark
  public static let meYourStamps = KStampPlacement("meYourStamps", 80)
  /// long-press preview / stamp detail
  public static let preview = KStampPlacement("preview", 120)
  /// share card, Copy sticker, DIY preview
  public static let shareCard = KStampPlacement("shareCard", 200)
  /// the DIY editor canvas: a workspace, not a display size
  public static let diyCanvas = KStampPlacement("diyCanvas", 250)
  /// the landing stamp wall (web), scattered within ±3°
  public static let landingWall = KStampPlacement("landingWall", 100, .scatter)
  /// spoke pages (web): inline and feature
  public static let spokeInline = KStampPlacement("spokeInline", 40)
  public static let spokeFeature = KStampPlacement("spokeFeature", 80)
  /// Wren-desk guide reels: the three sizes they snap to (26→30, 40→40, 58→60)
  public static let guideReelSmall = KStampPlacement("guideReelSmall", 30)
  public static let guideReelMedium = KStampPlacement("guideReelMedium", 40)
  public static let guideReelLarge = KStampPlacement("guideReelLarge", 60)

  public static let all: [KStampPlacement] = [
    introEnvelope, liveActivityIsland, liveActivityLock, routeStop, chosenPill, composeKey,
    composeCorner, trayTile, myLettersRow, draftsRow, kindredBeganUnder, todayCard, readerHead,
    firstClassBanner, firstClassCard, meYourStamps, preview, shareCard, diyCanvas, landingWall,
    spokeInline, spokeFeature, guideReelSmall, guideReelMedium, guideReelLarge,
  ]

  /// Every width the ladder names, narrowest first (15 … 250).
  public static let widths: [CGFloat] = Array(Set(all.map(\.w))).sorted()

  /// The ladder width nearest to `w` (a tie goes to the narrower), no wider than `maxW` when given
  /// (the narrowest if none fits); under 15pt `w` comes back as it is (components/Stamp
  /// snapStampWidth).
  public static func snap(_ w: CGFloat, maxW: CGFloat = .infinity) -> CGFloat {
    guard w >= 15 else { return w }
    let fits = widths.filter { $0 <= maxW }
    let pool = fits.isEmpty ? [widths[0]] : fits
    var best = pool[0]
    for x in pool where abs(x - w) < abs(best - w) { best = x }
    return best
  }
}

// MARK: - The paper as a Shape

/// The perforated paper of a tier, scaled from the 100 × 120 box into the rect it is given (a
/// rect of any other aspect stretches it; give it width × 1.2 width). Drawn from
/// KStampFrame.silhouetteData, the string the golden check compares, through KSVGPath, each
/// tier's path read once. The dot tier has no paper: an empty path.
public struct KStampShape: Shape {
  public let tier: KStampTier

  public init(tier: KStampTier) {
    self.tier = tier
  }

  /// the paper for a rendered width (its tier's bites)
  public init(width: CGFloat) {
    self.tier = KStampFrame.tier(for: width)
  }

  /// each tier's silhouette on the box, read once
  static let boxPaths: [KStampTier: Path] = Dictionary(uniqueKeysWithValues: KStampTier.allCases.map { tier in
    let d = KStampFrame.silhouetteData(tier)
    return (tier, d.isEmpty ? Path() : KSVGPath.path(d))
  })

  /// the silhouette on the 100 × 120 box (box units)
  public static func boxPath(_ tier: KStampTier) -> Path {
    boxPaths[tier] ?? Path()
  }

  public func path(in rect: CGRect) -> Path {
    let p = Self.boxPath(tier)
    guard !p.isEmpty, rect.width > 0, rect.height > 0 else { return Path() }
    let t = CGAffineTransform(translationX: rect.minX, y: rect.minY)
      .scaledBy(x: rect.width / KStampFrame.box.width, y: rect.height / KStampFrame.box.height)
    return p.applying(t)
  }
}
