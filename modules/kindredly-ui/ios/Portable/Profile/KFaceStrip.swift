// Portable: this file imports SwiftUI, UIKit and CoreImage only (system frameworks; no Expo), so
// the 1.1.0 pure-Swift app can take it as is. UIKit and CoreImage are for the Stamp Press edit
// page at the end of the file (filters, the JPEG it hands over, haptics).

import SwiftUI
import UIKit
import CoreImage

/*
 THE FACE STRIP (Edit profile, under the avatar): the portraits on offer as 54pt circles in one
 row that scrolls sideways, edge to edge, 10 apart; the header (PICK A FACE, mono 600 10 at .14em
 in mute) with a small Random key at its right (a sticker ~28 tall, with a 44pt target that
 moves nothing: KRoomyButtonStyle). The face worn wears the selected look
 (KSelectableTile: a 2pt ind ring and a 3pt lav halo outside it); none does while a photo is
 worn. Opening, the strip brings the face worn into view.

 The portraits are bundled PNGs handed over as files (TS: expo-asset), drawn by KImage at their
 size (downsampled once, cached by KImageStore), on soft2 while they load. A LazyHStack: fifty
 pictures, no React Native island among them. Each face is a button VoiceOver names "Face 3 of
 25" (the library's own names are English design notes, never shown) with the selected trait.
 */

/// One face on offer.
public struct KEditFace: Identifiable, Equatable, Sendable {
  /// the portrait's id (user_metadata.avatarId)
  public let id: String
  /// the portrait as a file; nil while it is on its way
  public let image: KImageRef?
  /// VoiceOver's name for it, from TS
  public let a11yLabel: String

  public init(id: String, image: KImageRef?, a11yLabel: String) {
    self.id = id
    self.image = image
    self.a11yLabel = a11yLabel
  }
}

public struct KFaceStrip: View {
  /// a face's side (H:91's strip, EditProfileSheet's 54)
  public static var faceSize: CGFloat { 54 }

  private let theme: KTheme
  private let header: String
  private let randomLabel: String
  private let faces: [KEditFace]
  private let selected: String
  private let onPick: (String) -> Void
  private let onRandom: () -> Void

  /// - Parameters:
  ///   - selected: the face worn; "" for none
  ///   - onPick: a face was tapped (its id)
  ///   - onRandom: the Random key
  public init(theme: KTheme, header: String, randomLabel: String, faces: [KEditFace], selected: String, onPick: @escaping (String) -> Void, onRandom: @escaping () -> Void) {
    self.theme = theme
    self.header = header
    self.randomLabel = randomLabel
    self.faces = faces
    self.selected = selected
    self.onPick = onPick
    self.onRandom = onRandom
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .center, spacing: 8) {
        SoftGroupHeader(theme: theme, title: header)
          .frame(maxWidth: .infinity, alignment: .leading)
        SwiftUI.Button(action: onRandom) {
          Text(randomLabel)
            .kText(.chip)
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .padding(.vertical, 6)
            .padding(.horizontal, 12)
        }
        .buttonStyle(KRoomyButtonStyle(inner: KStickerButtonStyle(
          shape: RoundedRectangle(cornerRadius: 14, style: .circular),
          fill: theme.sf,
          stroke: theme.ln,
          lineWidth: 2,
          shadow: theme.ln,
          shadowOffset: 2
        )))
        .padding(.trailing, 2) // the shadow's room
      }
      ScrollViewReader { proxy in
        ScrollView(.horizontal) {
          LazyHStack(spacing: 10) {
            ForEach(faces) { face in
              faceButton(face)
                .id(face.id)
            }
          }
          // the halo's room around every face, and the page's gutter at each end
          .padding(.vertical, 5)
          .padding(.horizontal, 16)
        }
        .scrollIndicators(.hidden)
        .onAppear {
          guard !selected.isEmpty else { return }
          // a turn later, once the lazy row has laid out the faces
          DispatchQueue.main.async { proxy.scrollTo(selected, anchor: .center) }
        }
      }
      .padding(.horizontal, -16)
    }
  }

  private func faceButton(_ face: KEditFace) -> some View {
    let on = face.id == selected
    let side = Self.faceSize
    return SwiftUI.Button {
      onPick(face.id)
    } label: {
      KImage(face.image, size: CGSize(width: side, height: side), placeholder: theme.soft2)
        .clipShape(Circle())
        .kSelectableTile(theme: theme, selected: on, cornerRadius: side / 2)
        .contentShape(Circle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(face.a11yLabel)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
  }
}

/// A small button's look with a 44pt target: the inner style draws as it does (the Random key's
/// sticker is ~28 tall at the default text size), and its tap area is grown by 8 on every side
/// without moving anything: padded, given a rectangle to hit, and the padding taken back.
struct KRoomyButtonStyle<Inner: ButtonStyle>: ButtonStyle {
  let inner: Inner
  var outset: CGFloat = 8

  func makeBody(configuration: Configuration) -> some View {
    inner.makeBody(configuration: configuration)
      .padding(outset)
      .contentShape(Rectangle())
      .padding(-outset)
  }
}


// MARK: - STAMP PRESS · THE EDIT PAGE (build agent B "edit", 2026-10-19)

/*
 THE EDIT PAGE OF THE STAMP PRESS (the owner's final design, .claude/mock/stamp-press, Prompt 5
 and 6; full-flow prompts .claude/custom-stamps/PROMPTS.md). It lives here, at the end of an
 existing Portable file, because a new .swift file needs a pod install before the next build.
 The camera (build agent A) hands it a 4:5 crop as a file; this page names the moment, picks the
 colour and the filter, shows WHAT STRANGERS SEE on a live letter card, makes the JPEG the server
 checks and plays the review's three endings. It never talks to the network: the submit hands the
 files back (KStampEditActions.onSubmit) and TS (src/lib/stamp-press checkStamp) answers by
 setting `phase`.

 Layout (pt = the prototype's px), top to bottom on the theme's soft page:
   top row 44: Retake (13/600) · NEW STAMP (mono 10 .16em, sub) · a 44 spacer
   the big stamp 200 wide, rotate −4°, a 4 4 0 hard shadow, pops in (.45s); touch and hold shows
     the photo before its filter; a Free reader on a First Class filter gets the gold ribbon
   WHAT STRANGERS SEE (mono 10) and the letter card (2.5 ln, radius 20, 4 4 0): a frosted 22
     square + the date and name line, this stamp at 40 × 48 rotate 2°; the first-line hint; the
     #topic tag (dashed and "#name this moment" while empty, solid in the colour once named, the
     n/24 count while typing) and the AURAS CLOSE capsule
   the colour row: the six REAL category colours (src/data/stamps.ts, rung 3), 28 circles, 2 ink
     edge, the chosen one ringed white 2 + ind 5 and checked; small things by default
   the filter row: live 64-wide stamps, the gold 1ST badge on what the plan can't keep
   the button 52 (ink, a 4 4 0 lime shadow): Put it in my stamps / Checking your stamp… with a
     3pt lime line / Keep it with First Class → (cream and gold) — and above it THIS IS n OF 3
     FREE, the reject card, or the card for unavailable / quota / cap / problem
 While the keyboard is up only the card and the button stay (the stamp, colours, filters fold).

 THE STAMP (KPressStamp): the v3 frame every official stamp has (KStampArtData.v3FramePath: the
 gear, 3 bites top and bottom, 4 a side) in paper white with the ink keyline — Cofounder: cream
 #FFF8E8 with a gold #D8A63F edge — and the photo in a 4:5 window inside it, KPressGeometry.window
 (box units 22…78 × 34…104). Nothing is printed on it. Placement `.box` lays it on the 100 × 120
 box exactly like KStamp (so 40 wide here matches a 40-wide official stamp on a card); `.frame`
 crops the box to the frame (the big stamp and the filter tiles, which have no air above).

 THE FILTERS (KPressFilter.apply), Core Image after the prototype's CSS, in its order:
   original  nothing
   paper     sepia .35 · contrast .92 · brightness 1.05
   riso      grayscale · contrast 1.4, then the colour multiplied over at 75%
   night     hue-rotate 190° · saturate .6 · brightness .78 · contrast 1.1
   sun       brightness 1.22 · saturate 1.3 · sepia .2
   sticker   saturate 1.1, the colour laid over at 60%, and the photo again in a circle with a
             white ring (a sticker on its own backing)
   gilt      sepia .6 · saturate 1.4 · contrast 1.05 · brightness 1.05 (Cofounder only)
 (CSS brightness() multiplies, so it is CIExposureAdjust log2(b); contrast and saturate are
 CIColorControls; hue-rotate is CIHueAdjust.)

 THE JPEG (KPressRender.export): the filtered window at exactly 576 × 720, sRGB, scale 1, JPEG
 stepped down in quality until it is ≤ 150 KB (153600 bytes, stamp-check.js LIMITS), drawn from
 pixels so it carries no EXIF or location. The unfiltered crop goes beside it at 1152 × 1440 (the
 phone keeps it so First Class can change the filter later; it never leaves the phone). Both are
 written to the temporary folder (tmp/stamp-press/) and their file:// URLs come back in onSubmit.

 Reduce Motion: no pop, nudge, shake or flight (a fade where something must leave). VoiceOver:
 every control is labelled; the review's ending is announced; holding the stamp has a hint.
 */

/// The custom stamp's geometry on the official 100 × 120 box (shared with every renderer that
/// draws a custom stamp: Swift KStamp for "c:" ids, RN Stamp, the web).
public enum KPressGeometry {
  /// the 4:5 photo window inside the v3 frame (x 10…90, y 25…113), box units
  public static let window = CGRect(x: 22, y: 34, width: 56, height: 70)
  /// the frame with its keyline and rim, the crop `.frame` placements show (88 × 96)
  public static let frameView = CGRect(x: 6, y: 21, width: 88, height: 96)
  /// the JPEG the server takes: the window only
  public static let exportSize = CGSize(width: 576, height: 720)
  /// the unfiltered crop kept on the phone
  public static let originalSize = CGSize(width: 1152, height: 1440)
  public static let maxBytes = 153_600
  /// the gold of a Cofounder's stamps
  public static let goldEdge: UInt32 = 0xD8A63F
  public static let goldPaper: UInt32 = 0xFFF8E8
}

/// The seven filters (src/lib/stamp-press-core PRESS_FILTERS; the server's custom_stamps_filter).
public enum KPressFilter: String, CaseIterable, Sendable {
  case original, paper, riso, night, sun, sticker, gilt

  /// whether the result depends on the chosen colour (re-rendered when it changes)
  var usesColour: Bool { self == .riso || self == .sticker }

  /// The filtered picture, the same size as `image`. `colour` is the category's 0xRRGGBB.
  func apply(to image: CGImage, colour: UInt32) -> CGImage? {
    let ci = CIImage(cgImage: image)
    let adjusted: CIImage
    switch self {
    case .original:
      return image
    case .paper:
      adjusted = ci.kSepia(0.35).kControls(contrast: 0.92).kBrightness(1.05)
    case .riso:
      adjusted = ci.kControls(saturation: 0).kControls(contrast: 1.4)
    case .night:
      adjusted = ci.kHue(degrees: 190).kControls(saturation: 0.6).kBrightness(0.78).kControls(contrast: 1.1)
    case .sun:
      adjusted = ci.kBrightness(1.22).kControls(saturation: 1.3).kSepia(0.2)
    case .sticker:
      adjusted = ci.kControls(saturation: 1.1)
    case .gilt:
      adjusted = ci.kSepia(0.6).kControls(saturation: 1.4).kControls(contrast: 1.05).kBrightness(1.05)
    }
    guard let base = KPressRender.context.createCGImage(adjusted, from: ci.extent, format: .RGBA8, colorSpace: KPressRender.srgb) else { return nil }
    switch self {
    case .riso: return KPressRender.composite(base, size: CGSize(width: image.width, height: image.height)) { ctx, rect in
        ctx.setBlendMode(.multiply)
        ctx.setFillColor(KPressRender.cg(colour, alpha: 0.75))
        ctx.fill(rect)
      }
    case .sticker: return KPressRender.composite(base, size: CGSize(width: image.width, height: image.height)) { ctx, rect in
        ctx.setFillColor(KPressRender.cg(colour, alpha: 0.6))
        ctx.fill(rect)
        let inset = rect.width * 0.14
        let circle = CGRect(x: rect.midX - (rect.width / 2 - inset), y: rect.midY - (rect.width / 2 - inset), width: rect.width - 2 * inset, height: rect.width - 2 * inset)
        ctx.saveGState()
        ctx.addEllipse(in: circle)
        ctx.clip()
        ctx.draw(base, in: rect)
        ctx.restoreGState()
        ctx.setStrokeColor(UIColor.white.cgColor)
        ctx.setLineWidth(rect.width * 0.045)
        ctx.strokeEllipse(in: circle)
      }
    default:
      return base
    }
  }
}

private extension CIImage {
  func kControls(saturation: Double? = nil, contrast: Double? = nil) -> CIImage {
    var p: [String: Any] = [:]
    if let saturation { p[kCIInputSaturationKey] = saturation }
    if let contrast { p[kCIInputContrastKey] = contrast }
    return applyingFilter("CIColorControls", parameters: p)
  }
  func kSepia(_ v: Double) -> CIImage {
    applyingFilter("CISepiaTone", parameters: [kCIInputIntensityKey: v])
  }
  /// CSS brightness(b): a multiply, so an exposure of log2(b)
  func kBrightness(_ b: Double) -> CIImage {
    applyingFilter("CIExposureAdjust", parameters: [kCIInputEVKey: log2(b)])
  }
  func kHue(degrees: Double) -> CIImage {
    applyingFilter("CIHueAdjust", parameters: [kCIInputAngleKey: degrees * .pi / 180])
  }
}

/// Picture work for the press: loading, the 4:5 crop, the filters' composites, the JPEG.
public enum KPressRender {
  static let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
  /// one context for the whole module (CIContext is thread-safe and costly to make)
  static let context = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.extendedLinearSRGB)!, .outputColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])

  static func cg(_ rgb: UInt32, alpha: CGFloat = 1) -> CGColor {
    CGColor(srgbRed: CGFloat((rgb >> 16) & 0xFF) / 255, green: CGFloat((rgb >> 8) & 0xFF) / 255, blue: CGFloat(rgb & 0xFF) / 255, alpha: alpha)
  }

  /// A bitmap of `size` (scale 1, sRGB) with `base` drawn in it, then `draw` over it.
  static func composite(_ base: CGImage, size: CGSize, _ draw: (CGContext, CGRect) -> Void) -> CGImage? {
    let w = Int(size.width), h = Int(size.height)
    guard w > 0, h > 0, let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: srgb, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
    let rect = CGRect(x: 0, y: 0, width: w, height: h)
    ctx.interpolationQuality = .high
    ctx.draw(base, in: rect)
    draw(ctx, rect)
    return ctx.makeImage()
  }

  /// A file:// or plain path (or http(s), read whole) → its picture, upright. nil when unreadable.
  static func load(_ uri: String) -> UIImage? {
    guard !uri.isEmpty else { return nil }
    if uri.hasPrefix("http://") || uri.hasPrefix("https://") {
      guard let url = URL(string: uri), let data = try? Data(contentsOf: url) else { return nil }
      return UIImage(data: data)
    }
    let path = uri.hasPrefix("file://") ? (URL(string: uri)?.path ?? String(uri.dropFirst(7))) : uri
    return UIImage(contentsOfFile: path)
  }

  /// The picture centre-cropped to 4:5, upright, at `size` (scale 1, sRGB, opaque).
  static func crop45(_ image: UIImage, size: CGSize) -> CGImage? {
    let src = image.size
    guard src.width > 0, src.height > 0 else { return nil }
    let target = size.width / size.height
    var crop = CGRect(origin: .zero, size: src)
    if src.width / src.height > target {
      crop.size.width = src.height * target
      crop.origin.x = (src.width - crop.width) / 2
    } else {
      crop.size.height = src.width / target
      crop.origin.y = (src.height - crop.height) / 2
    }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    format.preferredRange = .standard
    let scale = size.width / crop.width
    let out = UIGraphicsImageRenderer(size: size, format: format).image { _ in
      // draw(in:) honours imageOrientation, so the crop comes out upright
      image.draw(in: CGRect(x: -crop.minX * scale, y: -crop.minY * scale, width: src.width * scale, height: src.height * scale))
    }
    return out.cgImage
  }

  /// A dev stand-in when no photo came (the simulator has no camera): a sky, a sun, a hill.
  static func devScene(size: CGSize) -> CGImage? {
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    return UIGraphicsImageRenderer(size: size, format: format).image { r in
      let c = r.cgContext
      let colors = [cg(0x9EC9F5), cg(0xF6D9C6)] as CFArray
      if let g = CGGradient(colorsSpace: srgb, colors: colors, locations: [0, 1]) {
        c.drawLinearGradient(g, start: .zero, end: CGPoint(x: 0, y: size.height), options: [])
      }
      c.setFillColor(cg(0xFBBF3E))
      c.fillEllipse(in: CGRect(x: size.width * 0.58, y: size.height * 0.18, width: size.width * 0.26, height: size.width * 0.26))
      c.setFillColor(cg(0x4CA86E))
      c.move(to: CGPoint(x: 0, y: size.height * 0.78))
      c.addQuadCurve(to: CGPoint(x: size.width, y: size.height * 0.72), control: CGPoint(x: size.width * 0.45, y: size.height * 0.52))
      c.addLine(to: CGPoint(x: size.width, y: size.height))
      c.addLine(to: CGPoint(x: 0, y: size.height))
      c.fillPath()
    }.cgImage
  }

  /// JPEG at the highest quality of a few that fits `maxBytes`; nil when none does.
  static func jpeg(_ image: CGImage, maxBytes: Int) -> Data? {
    let ui = UIImage(cgImage: image, scale: 1, orientation: .up)
    for q in [0.86, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4, 0.32] as [CGFloat] {
      if let d = ui.jpegData(compressionQuality: q), d.count <= maxBytes { return d }
    }
    return nil
  }

  /// Writes the stamp's two files to tmp/stamp-press/. → (filtered, original) file:// URLs.
  static func export(source: CGImage, filter: KPressFilter, colour: UInt32) -> (image: String, original: String)? {
    guard let window = rescale(source, to: KPressGeometry.exportSize),
          let filtered = filter.apply(to: window, colour: colour),
          let data = jpeg(filtered, maxBytes: KPressGeometry.maxBytes)
    else { return nil }
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("stamp-press", isDirectory: true)
    do {
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
      let name = UUID().uuidString.lowercased()
      let imageURL = dir.appendingPathComponent("\(name).jpg")
      try data.write(to: imageURL, options: .atomic)
      var originalPath = ""
      if let big = rescale(source, to: KPressGeometry.originalSize),
         let od = UIImage(cgImage: big, scale: 1, orientation: .up).jpegData(compressionQuality: 0.85) {
        let originalURL = dir.appendingPathComponent("\(name)-o.jpg")
        if (try? od.write(to: originalURL, options: .atomic)) != nil { originalPath = originalURL.absoluteString }
      }
      return (imageURL.absoluteString, originalPath)
    } catch {
      return nil
    }
  }

  /// `image` (already 4:5) drawn at `size`, scale 1.
  static func rescale(_ image: CGImage, to size: CGSize) -> CGImage? {
    if image.width == Int(size.width), image.height == Int(size.height) { return image }
    return composite(image, size: size) { _, _ in }
  }
}

/// Keeps the page's pictures: the crop, the big preview and the tiles, rendered off the main thread.
@MainActor
final class KPressPictures: ObservableObject {
  /// the 4:5 crop at 1152 × 1440 (what the export and the original are made from)
  @Published private(set) var source: CGImage?
  /// the crop at 576 × 720, unfiltered (the big stamp while held)
  @Published private(set) var plain: UIImage?
  /// "filter|rrggbb" → the big preview (576 × 720) and the tile (192 × 240)
  @Published private(set) var big: [String: UIImage] = [:]
  @Published private(set) var tiles: [String: UIImage] = [:]
  @Published private(set) var failed = false
  /// bumped when a picture has loaded (or failed to)
  @Published private(set) var version = 0

  private var loadedURI: String?
  private var small: CGImage?
  private var medium: CGImage?
  private var pending: Set<String> = []

  static func key(_ f: KPressFilter, _ colour: UInt32) -> String {
    f.usesColour ? "\(f.rawValue)|\(String(colour, radix: 16))" : f.rawValue
  }

  func load(_ uri: String) {
    guard uri != loadedURI else { return }
    loadedURI = uri
    source = nil; plain = nil; big = [:]; tiles = [:]; failed = false; pending = []
    Task.detached(priority: .userInitiated) {
      let crop: CGImage?
      if uri.isEmpty {
        crop = KPressRender.devScene(size: KPressGeometry.originalSize)
      } else if let ui = KPressRender.load(uri) {
        crop = KPressRender.crop45(ui, size: KPressGeometry.originalSize)
      } else {
        crop = nil
      }
      let medium = crop.flatMap { KPressRender.rescale($0, to: KPressGeometry.exportSize) }
      let small = crop.flatMap { KPressRender.rescale($0, to: CGSize(width: 192, height: 240)) }
      await MainActor.run {
        guard self.loadedURI == uri else { return }
        self.source = crop
        self.medium = medium
        self.small = small
        self.plain = medium.map { UIImage(cgImage: $0) }
        self.failed = crop == nil
        self.version += 1
      }
    }
  }

  /// Renders what isn't there yet for these filters in this colour (the chosen one big).
  func prepare(filters: [KPressFilter], chosen: KPressFilter, colour: UInt32) {
    guard let small, let medium else { return }
    let bigKey = Self.key(chosen, colour)
    if big[bigKey] == nil, !pending.contains("b" + bigKey) {
      pending.insert("b" + bigKey)
      Task.detached(priority: .userInitiated) {
        let out = chosen.apply(to: medium, colour: colour).map { UIImage(cgImage: $0) }
        await MainActor.run {
          self.pending.remove("b" + bigKey)
          if let out { self.big[bigKey] = out }
        }
      }
    }
    for f in filters {
      let k = Self.key(f, colour)
      guard tiles[k] == nil, !pending.contains("t" + k) else { continue }
      pending.insert("t" + k)
      Task.detached(priority: .utility) {
        let out = f.apply(to: small, colour: colour).map { UIImage(cgImage: $0) }
        await MainActor.run {
          self.pending.remove("t" + k)
          if let out { self.tiles[k] = out }
        }
      }
    }
  }
}

/// The custom stamp: the v3 frame in paper with its keyline (gold for a Cofounder) and the photo
/// in its 4:5 window. `photo` nil draws the blank paper in the frame.
public struct KPressStamp: View {
  public enum Placement: Sendable { case box, frame }

  let photo: UIImage?
  let width: CGFloat
  let gold: Bool
  let placement: Placement
  /// a hard shadow this far down and right, in pt (0 for none), in `shadow`
  let shadowPt: CGFloat
  let shadow: Color

  static let framePath: Path = KSVGPath.path(KStampArtData.v3FramePath)

  public init(photo: UIImage?, width: CGFloat, gold: Bool, placement: Placement = .box, shadowPt: CGFloat = 0, shadow: Color = .clear) {
    self.photo = photo
    self.width = width
    self.gold = gold
    self.placement = placement
    self.shadowPt = shadowPt
    self.shadow = shadow
  }

  /// the view's rect in box units
  var viewBox: CGRect { placement == .box ? CGRect(x: 0, y: 0, width: 100, height: 120) : KPressGeometry.frameView }
  public var height: CGFloat { width * viewBox.height / viewBox.width }

  public var body: some View {
    let box = viewBox
    let s = width / box.width
    let paper = KStampFrame.color(gold ? KPressGeometry.goldPaper : 0xFFFFFF)
    let edge = KStampFrame.color(gold ? KPressGeometry.goldEdge : KStampFrame.v3Ink)
    let win = KPressGeometry.window
    let winRect = CGRect(x: (win.minX - box.minX) * s, y: (win.minY - box.minY) * s, width: win.width * s, height: win.height * s)
    // the die-cut rim (7u outside the path) and the hard shadow reach past `frame`'s view box;
    // the Canvas is drawn with this much room on every side so neither is clipped square
    let room = 8 * s + shadowPt
    ZStack(alignment: .topLeading) {
      Canvas { context, _ in
        var c = context
        c.translateBy(x: room - box.minX * s, y: room - box.minY * s)
        c.scaleBy(x: s, y: s)
        if shadowPt > 0 {
          var sh = c
          sh.translateBy(x: shadowPt / s, y: shadowPt / s)
          sh.fill(Self.framePath, with: .color(shadow))
          // round joins like the rim: mitred joins poke dark specks out at every bite
          sh.stroke(Self.framePath, with: .color(shadow), style: StrokeStyle(lineWidth: 14, lineJoin: .round))
        }
        // the die-cut rim, the paper, the keyline (KStampArtData.v3Frame's three passes)
        c.stroke(Self.framePath, with: .color(paper), style: StrokeStyle(lineWidth: 14, lineJoin: .round))
        c.fill(Self.framePath, with: .color(paper))
        c.stroke(Self.framePath, with: .color(edge), style: StrokeStyle(lineWidth: max(6, 1.5 / s), lineJoin: .round))
      }
      .frame(width: width + 2 * room, height: height + 2 * room)
      .padding(-room)
      .allowsHitTesting(false)
      Group {
        if let photo {
          Image(uiImage: photo).resizable().interpolation(.high).aspectRatio(contentMode: .fill)
        } else {
          Rectangle().fill(paper)
        }
      }
      .frame(width: winRect.width, height: winRect.height)
      .clipped()
      .overlay(Rectangle().strokeBorder(edge.opacity(0.18), lineWidth: max(0.5, 0.6 * s)))
      .offset(x: winRect.minX, y: winRect.minY)
    }
    .frame(width: width, height: height, alignment: .topLeading)
  }
}

/// One colour of the row (src/data/stamps.ts STAMP_CATEGORIES).
public struct KStampEditCategory: Identifiable, Equatable, Sendable {
  public let id: String
  public let rgb: UInt32
  public let name: String
  public init(id: String, rgb: UInt32, name: String) { self.id = id; self.rgb = rgb; self.name = name }
}

/// One filter of the row, as the plan sees it (lib/stamp-press-core filtersFor).
public struct KStampEditFilterItem: Identifiable, Equatable, Sendable {
  public let id: String
  public let name: String
  /// the plan can't keep it: the 1ST badge; choosing it turns the button gold
  public let locked: Bool
  public init(id: String, name: String, locked: Bool) { self.id = id; self.name = name; self.locked = locked }
  var filter: KPressFilter { KPressFilter(rawValue: id) ?? .original }
}

/// What the review says (TS sets it from stamp-check's answer).
public enum KStampEditPhase: String, Sendable {
  case editing, checking, rejected, approved, unavailable, quota, cap, problem
}

/// Every word and value the page shows, resolved by TS.
public struct KStampEditContent: Equatable {
  public var title = ""
  public var retake = ""
  public var eyebrow = ""
  public var cardMeta = ""
  public var firstLine = ""
  public var topicPlaceholder = ""
  public var topicLabel = ""
  public var aurasClose = ""
  public var colourLabel = ""
  public var filterLabel = ""
  public var submit = ""
  public var checking = ""
  public var keepFC = ""
  public var fcRibbon = ""
  public var fcBadge = ""
  /// VoiceOver for a filter the plan can't keep, with "{name}" where its name goes ("" = the name alone)
  public var lockedHint = ""
  public var freeLine = ""
  public var yours = ""
  public var stampLabel = ""
  public var holdHint = ""
  public var selected = ""
  /// the reject card: its words and its two doors (either may be "")
  public var rejectBody = ""
  public var rejectRetry = ""
  public var rejectRename = ""
  /// unavailable / quota / cap / problem: a card with a title, words and up to two buttons
  public var cardTitle = ""
  public var cardBody = ""
  public var cardPrimary = ""
  public var cardSecondary = ""
  /// the review's ending, said to VoiceOver as it arrives
  public var announce = ""

  public var categories: [KStampEditCategory] = []
  public var filters: [KStampEditFilterItem] = []
  /// false: no filter row (an edit of a stamp whose original isn't on this phone)
  public var filterEditable = true
  public var gold = false
  public var editing = false
  public var phase: KStampEditPhase = .editing
  /// rejected: which part to fix ("image" | "topic")
  public var rejectField = "image"
  public init() {}
}

/// The values the page starts from; a new `seed` puts them back (TS bumps it to reset).
public struct KStampEditSeed: Equatable {
  public var seed = 0
  public var photo = ""
  public var topic = ""
  public var category = "small"
  public var filter = "original"
  public init() {}
}

/// What the page asks of TS.
public final class KStampEditActions {
  public var onRetake: () -> Void = {}
  /// the stamp is ready: (filtered JPEG file://, unfiltered original file:// or "", topic, category, filter)
  public var onSubmit: (_ image: String, _ original: String, _ topic: String, _ category: String, _ filter: String) -> Void = { _, _, _, _, _ in }
  /// a locked filter's gold button
  public var onUpgrade: () -> Void = {}
  /// back to editing after a rejection (the reader started fixing it)
  public var onReset: () -> Void = {}
  /// the approved stamp has flown off: leave the page
  public var onFlown: () -> Void = {}
  public var onCardPrimary: () -> Void = {}
  public var onCardSecondary: () -> Void = {}
  /// the export failed (no picture, disk full): TS says so
  public var onExportFailed: () -> Void = {}
  public init() {}
}

public struct KStampEditScreen: View {
  let theme: KTheme
  let content: KStampEditContent
  let seed: KStampEditSeed
  let topInset: CGFloat
  let bottomInset: CGFloat
  let actions: KStampEditActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @StateObject private var pictures = KPressPictures()
  @State private var topic = ""
  @State private var category = "small"
  @State private var filter = "original"
  @State private var seen = -1
  @State private var holding = false
  @State private var appeared = false
  @State private var nudging = false
  @State private var shake: CGFloat = 0
  @State private var stickerOn = false
  @State private var flying = false
  @State private var progress = false
  @State private var exporting = false
  @FocusState private var typing: Bool

  public init(theme: KTheme, content: KStampEditContent, seed: KStampEditSeed, topInset: CGFloat, bottomInset: CGFloat, actions: KStampEditActions) {
    self.theme = theme
    self.content = content
    self.seed = seed
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  private var ink: Color { KBrand.inkOnBrand }
  private var colourRGB: UInt32 {
    content.categories.first { $0.id == category }?.rgb ?? KStampArtData.v3Categories[category].map { $0 >> 8 } ?? KStampFrame.fallbackRGB
  }
  private var chosenFilter: KStampEditFilterItem? { content.filters.first { $0.id == filter } }
  private var locked: Bool { chosenFilter?.locked ?? false }
  private var topicOK: Bool { !topic.trimmingCharacters(in: .whitespaces).isEmpty }
  private var busy: Bool { content.phase == .checking || content.phase == .approved || exporting }
  private var bigPhoto: UIImage? {
    if holding { return pictures.plain }
    let f = chosenFilter?.filter ?? .original
    return pictures.big[KPressPictures.key(f, colourRGB)] ?? pictures.plain
  }

  public var body: some View {
    VStack(spacing: 0) {
      topRow
      ScrollView(.vertical, showsIndicators: false) {
        VStack(alignment: .leading, spacing: 0) {
          if !typing {
            bigStamp
              .frame(maxWidth: .infinity)
              .padding(.top, 34)
          }
          Text(content.eyebrow)
            .kText(.mono(10, .semibold, tracking: 0.16))
            .foregroundStyle(theme.sub)
            .padding(.top, typing ? 8 : 18)
            .accessibilityAddTraits(.isHeader)
          letterCard.padding(.top, 8)
          if !typing {
            colourRow.padding(.top, 16)
            if content.filterEditable { filterRow.padding(.top, 16) }
          }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 16)
      }
      .scrollDismissesKeyboard(.interactively)
      footer
        .padding(.horizontal, 20)
        .padding(.bottom, bottomInset)
    }
    .padding(.top, topInset)
    .background(theme.soft.ignoresSafeArea())
    .onAppear { reseed() }
    .onChange(of: seed) { _, _ in reseed() }
    .onChange(of: category) { _, _ in refresh() }
    .onChange(of: filter) { _, _ in refresh() }
    .onChange(of: content.filters) { _, _ in refresh() }
    .onChange(of: pictures.version) { _, _ in refresh() }
    .onChange(of: content.phase) { old, new in phaseChanged(from: old, to: new) }
    .onChange(of: typing) { _, now in
      if now, content.phase == .rejected { actions.onReset() }
    }
  }

  // MARK: parts

  private var topRow: some View {
    // the title stays centred on the screen whatever Retake's width (AX sizes, long languages)
    ZStack {
      Text(content.title)
        .kText(.mono(10, .semibold, tracking: 0.16))
        .foregroundStyle(theme.sub)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .padding(.horizontal, 96)
        .accessibilityAddTraits(.isHeader)
      HStack {
        Button(action: actions.onRetake) {
          Text(content.retake)
            .kText(.system(13, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(minWidth: 44, maxWidth: 88, minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(KPressScaleStyle(scale: 0.97))
        .disabled(busy)
        Spacer(minLength: 0)
      }
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    .padding(.horizontal, 20)
    .frame(height: 44)
  }

  private var bigStamp: some View {
    KPressStamp(photo: bigPhoto, width: 200, gold: content.gold, placement: .frame, shadowPt: 4, shadow: theme.ln)
      .overlay(alignment: .bottomTrailing) {
        if locked && content.phase == .editing {
          Text(content.fcRibbon)
            .kText(.mono(8, .semibold, tracking: 0.14))
            .foregroundStyle(ink)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(KBrand.waxGold)
            .overlay(Rectangle().strokeBorder(ink, lineWidth: 1.5))
            .rotationEffect(.degrees(-12))
            .offset(x: 4, y: -16)
            .accessibilityHidden(true)
        }
      }
      .overlay(alignment: .top) {
        if stickerOn {
          Text(content.yours)
            .kText(.system(12, .bold))
            .foregroundStyle(ink)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Capsule().fill(KBrand.lime))
            .overlay(Capsule().strokeBorder(ink, lineWidth: 1.5))
            .rotationEffect(.degrees(-6))
            .offset(y: -22)
            .transition(reduceMotion ? .opacity : .scale(scale: 0.94).combined(with: .opacity).combined(with: .offset(y: 16)))
            .accessibilityHidden(true)
        }
      }
      .rotationEffect(.degrees(flying ? 0 : -4 + Double(shake)))
      .offset(x: flying && !reduceMotion ? -90 : 0, y: flying && !reduceMotion ? -320 : (appeared || reduceMotion ? 0 : 16))
      .scaleEffect(flying && !reduceMotion ? 0.42 : (appeared || reduceMotion ? 1 : 0.94))
      .opacity(flying ? 0 : (appeared ? 1 : 0))
      .onLongPressGesture(minimumDuration: 0.12, maximumDistance: 40, pressing: { holding = $0 }, perform: {})
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(content.stampLabel)
      .accessibilityHint(content.holdHint)
      .accessibilityAddTraits(.isImage)
      .accessibilityAction(named: Text(content.holdHint)) {
        holding = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { holding = false }
      }
  }

  private var letterCard: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 8) {
        RoundedRectangle(cornerRadius: 6, style: .circular)
          .fill(theme.line)
          .frame(width: 22, height: 22)
          .accessibilityHidden(true)
        Text(content.cardMeta)
          .kText(.mono(10, .medium, tracking: 0.08))
          .foregroundStyle(theme.sub)
          .lineLimit(1)
        Spacer(minLength: 6)
        KPressStamp(photo: bigPhoto, width: 40, gold: content.gold, placement: .box)
          .rotationEffect(.degrees(2))
          .accessibilityHidden(true)
      }
      Text(content.firstLine)
        .kText(.letter(15))
        .foregroundStyle(theme.faint)
        .accessibilityHidden(true)
      HStack(alignment: .bottom, spacing: 10) {
        topicTag
        Spacer(minLength: 6)
        Text(content.aurasClose)
          .kText(.mono(9, .semibold, tracking: 0.1))
          .foregroundStyle(ink)
          .padding(.horizontal, 10)
          .frame(height: 26)
          .background(Capsule().fill(KBrand.lime))
          .overlay(Capsule().strokeBorder(ink, lineWidth: 1.5))
          .accessibilityHidden(true)
      }
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(theme.sf))
    // the hard shadow BEHIND the card (a later .background is further back)
    .background(
      RoundedRectangle(cornerRadius: 20, style: .circular)
        .fill(theme.ln)
        .offset(x: 4, y: 4)
    )
    .overlay(RoundedRectangle(cornerRadius: 20, style: .circular).strokeBorder(theme.ln, lineWidth: 2.5))
    .offset(x: shake * 1.2)
  }

  private var topicTag: some View {
    let named = topicOK
    let shape = RoundedRectangle(cornerRadius: 12, style: .circular)
    return HStack(alignment: .lastTextBaseline, spacing: 4) {
      HStack(spacing: 0) {
        if named || typing {
          Text(verbatim: "#").kText(.mono(12, .semibold)).foregroundStyle(named ? ink : theme.mute)
        }
        ZStack(alignment: .leading) {
          if !named && !typing {
            Text(content.topicPlaceholder)
              .kText(.mono(12, .semibold))
              .foregroundStyle(theme.mute)
              .accessibilityHidden(true)
          }
          TextField("", text: $topic)
            .font(KType.mono(12))
            .foregroundStyle(named ? ink : theme.ink)
            .tint(theme.ind)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(false)
            .submitLabel(.done)
            .focused($typing)
            .fixedSize()
            .frame(minWidth: named || typing ? 24 : 0)
            .opacity(named || typing ? 1 : 0.02)
            .accessibilityLabel(content.topicLabel)
            .onSubmit { typing = false }
            .onChange(of: topic) { _, v in
              let cleaned = Self.shape(v)
              if cleaned != v { topic = cleaned }
            }
            .disabled(busy)
        }
      }
      .padding(.horizontal, 12)
      .frame(minHeight: 32)
      .background(shape.fill(named ? KStampFrame.color(colourRGB) : Color.clear))
      .background(named ? AnyView(shape.fill(ink).offset(x: 3, y: 3)) : AnyView(EmptyView()))
      .overlay(
        Group {
          if named {
            shape.strokeBorder(ink, lineWidth: 2)
          } else {
            shape.strokeBorder(theme.faint, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
          }
        }
      )
      .overlay(
        shape.inset(by: -4)
          .stroke(theme.ind, style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
          .opacity(nudging ? 1 : 0)
          .accessibilityHidden(true)
      )
      .contentShape(shape)
      .onTapGesture { if !busy { typing = true } }
      if typing {
        Text(verbatim: "\(topic.count)/24")
          .kText(.mono(9, .medium))
          .foregroundStyle(theme.mute)
          .accessibilityHidden(true)
      }
    }
  }

  /// No leading "#", no line breaks, at most 24 graphemes (Character is a grapheme cluster).
  static func shape(_ v: String) -> String {
    var s = v.replacingOccurrences(of: "\n", with: " ")
    while let f = s.first, f == "#" || f == "＃" { s.removeFirst() }
    if s.count > 24 { s = String(s.prefix(24)) }
    return s
  }

  private var colourRow: some View {
    HStack(alignment: .top, spacing: 0) {
      ForEach(content.categories) { c in
        let on = c.id == category
        Button {
          category = c.id
        } label: {
          VStack(spacing: 6) {
            ZStack {
              if on {
                Circle().fill(theme.ind).frame(width: 38, height: 38)
                Circle().fill(Color.white).frame(width: 32, height: 32)
              }
              Circle().fill(KStampFrame.color(c.rgb)).frame(width: 28, height: 28)
              Circle().strokeBorder(ink, lineWidth: 2).frame(width: 28, height: 28)
              if on {
                Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(ink)
              }
            }
            .frame(width: 40, height: 40)
            Text(c.name)
              .kText(.mono(8, .medium))
              .foregroundStyle(theme.sub)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
          }
          .frame(maxWidth: .infinity)
          .contentShape(Rectangle())
        }
        .buttonStyle(KPressScaleStyle())
        .disabled(busy)
        .accessibilityLabel(c.name)
        .accessibilityAddTraits(on ? [.isSelected] : [])
      }
    }
    .accessibilityElement(children: .contain)
    .accessibilityLabel(content.colourLabel)
  }

  private var filterRow: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(alignment: .top, spacing: 10) {
        ForEach(content.filters) { f in
          let on = f.id == filter
          Button {
            filter = f.id
          } label: {
            VStack(spacing: 5) {
              KPressStamp(photo: pictures.tiles[KPressPictures.key(f.filter, colourRGB)] ?? pictures.plain, width: 64, gold: content.gold, placement: .frame, shadowPt: 2, shadow: theme.ln)
                .padding(3)
                .overlay(RoundedRectangle(cornerRadius: 8, style: .circular).strokeBorder(on ? theme.ind : Color.clear, lineWidth: 2))
                .overlay(alignment: .topTrailing) {
                  if f.locked {
                    Text(content.fcBadge)
                      .kText(.mono(7, .semibold))
                      .foregroundStyle(ink)
                      .lineLimit(1)
                      .minimumScaleFactor(0.6)
                      // a fixed 22 × 16 sticker: its word keeps its size at every Dynamic Type setting
                      .dynamicTypeSize(.large)
                      .frame(width: 22, height: 16)
                      .background(RoundedRectangle(cornerRadius: 3, style: .circular).fill(KBrand.waxGold))
                      .overlay(RoundedRectangle(cornerRadius: 3, style: .circular).strokeBorder(ink, lineWidth: 1.5))
                      .rotationEffect(.degrees(6))
                      .offset(x: 6, y: -6)
                  }
                }
              Text(f.name)
                .kText(.mono(9, .medium))
                .foregroundStyle(on ? theme.ind : theme.sub)
            }
            .contentShape(Rectangle())
          }
          .buttonStyle(KPressScaleStyle())
          .disabled(busy)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(f.locked && !content.lockedHint.isEmpty ? content.lockedHint.replacingOccurrences(of: "{name}", with: f.name) : f.name)
          .accessibilityAddTraits(on ? [.isButton, .isSelected] : [.isButton])
        }
      }
      .padding(.top, 10)
      .padding(.bottom, 4)
      .padding(.leading, 2)
      .padding(.trailing, 14)
    }
    .padding(.trailing, -20)
    .accessibilityLabel(content.filterLabel)
  }

  @ViewBuilder
  private var footer: some View {
    VStack(spacing: 8) {
      switch content.phase {
      case .rejected:
        rejectCard
      case .unavailable, .quota, .cap, .problem:
        statusCard
      default:
        if !content.freeLine.isEmpty && !locked && !typing {
          Text(content.freeLine)
            .kText(.mono(10, .semibold, tracking: 0.12))
            .foregroundStyle(theme.mute)
            .frame(maxWidth: .infinity)
        }
      }
      if content.phase != .unavailable && content.phase != .quota && content.phase != .cap && content.phase != .problem {
        mainButton
      }
    }
    .padding(.top, 8)
  }

  private var rejectCard: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(content.rejectBody)
        .kText(.system(13, .regular, lineHeight: 1.45))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
      HStack(spacing: 14) {
        if !content.rejectRetry.isEmpty {
          Button(content.rejectRetry, action: actions.onRetake)
            .buttonStyle(KPressScaleStyle(scale: 0.97))
        }
        if !content.rejectRename.isEmpty {
          Button(content.rejectRename) {
            actions.onReset()
            typing = true
          }
          .buttonStyle(KPressScaleStyle(scale: 0.97))
        }
      }
      .font(.system(size: 13, weight: .semibold))
      .foregroundStyle(theme.ind)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.soft2))
    .transition(reduceMotion ? .opacity : .scale(scale: 0.94).combined(with: .opacity))
  }

  private var statusCard: some View {
    let gold = content.phase == .quota
    return VStack(alignment: .leading, spacing: 12) {
      if !content.cardTitle.isEmpty {
        Text(content.cardTitle)
          .kText(.mono(10, .semibold, tracking: 0.16))
          .foregroundStyle(theme.mute)
          .accessibilityAddTraits(.isHeader)
      }
      Text(content.cardBody)
        .kText(gold ? .letter(20, lineHeight: 1.2) : .system(14, .regular, lineHeight: 1.45))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
      if !content.cardPrimary.isEmpty {
        Button(action: actions.onCardPrimary) {
          Text(content.cardPrimary)
            .kText(.system(15, .semibold))
            .foregroundStyle(gold ? KBrand.goldText : theme.bg)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(gold ? KBrand.cream : theme.ink))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .circular).strokeBorder(gold ? KBrand.waxGold : Color.clear, lineWidth: 2))
        }
        .buttonStyle(KPressScaleStyle(scale: 0.97))
      }
      if !content.cardSecondary.isEmpty {
        Button(action: actions.onCardSecondary) {
          Text(content.cardSecondary)
            .kText(.system(14, .semibold))
            .foregroundStyle(theme.sub)
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(KPressScaleStyle(scale: 0.97))
      }
    }
    .padding(18)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 24, style: .circular).fill(theme.sf))
    .overlay(RoundedRectangle(cornerRadius: 24, style: .circular).strokeBorder(theme.line, lineWidth: 1))
    .transition(reduceMotion ? .opacity : .scale(scale: 0.94).combined(with: .opacity))
  }

  private var mainButton: some View {
    let checking = content.phase == .checking || exporting
    let enabled = locked ? true : (topicOK && !busy && pictures.source != nil)
    let shape = RoundedRectangle(cornerRadius: 16, style: .circular)
    return Button(action: press) {
      Text(locked ? content.keepFC : (checking ? content.checking : content.submit))
        .kText(.system(16, .semibold))
        .foregroundStyle(locked ? KBrand.goldText : theme.bg)
        .frame(maxWidth: .infinity, minHeight: 52)
        .background(shape.fill(locked ? KBrand.cream : theme.ink))
        .background(shape.fill(locked ? KBrand.waxGold : KBrand.lime).offset(x: 4, y: 4))
        .overlay(locked ? AnyView(shape.strokeBorder(KBrand.waxGold, lineWidth: 2)) : AnyView(EmptyView()))
        .overlay(alignment: .bottomLeading) {
          if checking {
            GeometryReader { g in
              Rectangle()
                .fill(KBrand.lime)
                .frame(width: progress ? g.size.width : 0, height: 3)
                .frame(maxHeight: .infinity, alignment: .bottom)
            }
            .clipShape(shape)
            .accessibilityHidden(true)
          }
        }
    }
    .buttonStyle(KPressScaleStyle(scale: 0.98))
    .disabled(!enabled)
    .opacity(locked || topicOK || checking ? 1 : 0.4)
  }

  // MARK: behaviour

  private func reseed() {
    guard seen != seed.seed else { return }
    seen = seed.seed
    topic = Self.shape(seed.topic)
    category = content.categories.contains { $0.id == seed.category } ? seed.category : (content.categories.first { $0.id == "small" }?.id ?? content.categories.first?.id ?? "small")
    filter = content.filters.contains { $0.id == seed.filter } ? seed.filter : "original"
    holding = false
    flying = false
    stickerOn = false
    pictures.load(seed.photo)
    appeared = false
    withAnimation(reduceMotion ? .easeOut(duration: 0.2) : .timingCurve(0.3, 1.2, 0.4, 1, duration: 0.45)) { appeared = true }
    if !reduceMotion && !topicOK {
      nudging = false
      DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
        guard !topicOK, !typing else { return }
        withAnimation(.easeInOut(duration: 1.2).repeatCount(4, autoreverses: true)) { nudging = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4.8) { nudging = false }
      }
    }
    refresh()
  }

  private func refresh() {
    let f = chosenFilter?.filter ?? .original
    pictures.prepare(filters: content.filters.map(\.filter), chosen: f, colour: colourRGB)
  }

  private func press() {
    if locked {
      actions.onUpgrade()
      return
    }
    guard topicOK, !busy, let source = pictures.source else { return }
    typing = false
    exporting = true
    let f = chosenFilter?.filter ?? .original
    let colour = colourRGB
    let t = topic.trimmingCharacters(in: .whitespaces)
    let cat = category
    withAnimation(.linear(duration: 1.6)) { progress = true }
    Task.detached(priority: .userInitiated) {
      let files = KPressRender.export(source: source, filter: f, colour: colour)
      await MainActor.run {
        exporting = false
        if let files {
          actions.onSubmit(files.image, files.original, t, cat, f.rawValue)
        } else {
          progress = false
          actions.onExportFailed()
        }
      }
    }
  }

  private func phaseChanged(from old: KStampEditPhase, to new: KStampEditPhase) {
    if !content.announce.isEmpty && new != .editing && new != .checking {
      AccessibilityNotification.Announcement(content.announce).post()
    }
    switch new {
    case .checking:
      if !progress {
        progress = false
        withAnimation(.linear(duration: 1.6)) { progress = true }
      }
    case .rejected:
      progress = false
      UINotificationFeedbackGenerator().notificationOccurred(.error)
      if !reduceMotion {
        withAnimation(.easeInOut(duration: 0.11)) { shake = -3 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.11) { withAnimation(.easeInOut(duration: 0.12)) { shake = 3 } }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.23) { withAnimation(.easeInOut(duration: 0.12)) { shake = -1.5 } }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { withAnimation(.easeInOut(duration: 0.1)) { shake = 0 } }
      }
      if content.rejectField == "topic" { typing = false }
    case .approved:
      progress = false
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      withAnimation(reduceMotion ? .easeOut(duration: 0.2) : .timingCurve(0.3, 1.2, 0.4, 1, duration: 0.3)) { stickerOn = true }
      DispatchQueue.main.asyncAfter(deadline: .now() + (reduceMotion ? 0.8 : 0.4)) {
        withAnimation(reduceMotion ? .easeOut(duration: 0.3) : .timingCurve(0.4, 0, 0.6, 1, duration: 0.6)) { flying = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { actions.onFlown() }
      }
    default:
      progress = false
    }
    _ = old
  }
}
