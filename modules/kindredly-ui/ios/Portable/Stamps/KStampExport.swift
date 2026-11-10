// Portable: this file imports SwiftUI (for the photo stamp's cut, a SwiftUI Path), CoreText and
// ImageIO only, so the 1.1.0 pure-Swift app can take it as is. It needs Kit/KStampFrame.swift
// (KPhotoStamp) and Kit/KImage.swift (KImageRef, KImageLoading) and nothing else of the module,
// so scripts/stamp-export-check.swift can compile it on the Mac and look at what it makes.

import SwiftUI
import CoreText
import ImageIO

/*
 EXPORTING THE STAMPS A READER MADE (stamp export, 2026-11-10; First Class). A reader presses
 their own stamps from a photo (Stamp Press); the owner wants them to leave the app two ways:

   · ONE STAMP AS A STICKER: a PNG with a see-through ground, the stamp as the app draws it (the
     photo, cut with the toothed edge; a Cofounder's gold line), no page behind it and no shadow,
     768 × 1024 pixels (the cut is 3:4, so the long side is the 1024 the owner asked for).
   · ALL OF THEM AS A PRINTABLE SHEET: an A4 PDF, the stamps in a grid at a real stamp's size
     (each one's 5:6 box is 30 × 36 mm), thin dashed cut lines between them, one line of mono type
     at the top ("KINDREDLY POST · 9 STAMPS · 2026") and one at the foot ("PRINT AT 100% · CUT
     ALONG THE LINES"), the #topic under each stamp; as many sheets as the stamps need. The look
     is the approved design page's "z-single" and "z-sheet" (.claude/journal-book/gen2.py,
     zine.css).

 WHAT DRAWS THE STAMP. Not a second drawing of the frame: the cut is KPhotoStamp.cut(in:)
 (Kit/KStampFrame.swift), the one geometry the viewfinder, the press, the album and KStamp use,
 and the edge is KPhotoStamp.edge(boxWidth:gold:) with its own colours and widths. paint(...)
 below does in Core Graphics exactly what KPhotoStampFace's body does in SwiftUI (the picture
 aspect-filled into the cut, the edge line twice as wide and clipped to the cut) and leaves out
 only the soft shadow, which a sticker and a printed stamp must not have. Core Graphics and not
 ImageRenderer because the same code then writes the PDF as vectors with each photo stored once
 as a JPEG (a sheet of 25 stays near two megabytes), and because it runs off the main thread.
 scripts/stamp-export-check.swift renders KPhotoStampFace with ImageRenderer beside it and
 compares the two pixel for pixel.

 THE SIZES.
   sticker  drawn as the album's sheet shows a stamp (.paper, 200 pt wide: no hairline at that
            size, the gold line 2 pt) at 3.84 pixels per point.
   sheet    A4, 595.28 × 841.89 pt. Five columns and five rows of 30 × 40 mm cells (the stamp's
            30 × 36 mm box, then the #topic), so 25 to a sheet; the grid is 150 mm wide and
            starts 44 mm down. Everything printed sits between 34 and 254 mm from the top and
            30 mm in from each side, so the same file printed at 100% on US Letter (216 × 279
            mm, 18 mm shorter) loses nothing whether the printer centres the page or starts at
            its top. A stamp at this size is over 60 pt wide, so by the app's own rule it has no
            hairline; a gold one keeps its 2 pt line.

 THE PICTURES come from the loader the app already shows them with (KImageLoading: in the React
 Native app KImageStore.shared, which reads a file:// straight from disk and fetches a signed
 link once, keeping it under the storage path). The server's picture is 600 × 800; it is asked
 for at that size and never held more than one at a time while a sheet is written.

 THE JOBS are TS's (src/lib/stamp-export-core.ts: which stamps qualify, the file names, the
 paging, every word already in the reader's language). Only a stamp that passed the check is
 ever in a job; Swift does not know states. A job that is not one, a picture that can't be had
 and a file that can't be written each throw KStampExportError with a sentence that says which:
 nothing is drawn as an empty cell and nothing is swallowed.

 THE FILES go to the Caches folder under readable names ("kindredly-stamp-tea.png",
 "kindredly-stamps-2026.pdf"), written beside the final name and moved into place, over an
 older export of the same name.
 */

// MARK: - The jobs (JSON from TS)

/// One stamp to export, as TS resolved it (modules/kindredly-ui/src/StampExport.ts StampExportItem).
public struct KStampExportItem: Equatable, Sendable {
  /// "c:<uuid>"
  public let id: String
  /// the picture: a file:// on this phone or a signed https link
  public let url: String
  /// the picture's cache key (its storage path, never the signed link); "" uses the url
  public let key: String
  /// a Cofounder's stamp: the gold line
  public let gold: Bool
  /// what is printed under it on a sheet: "#tea" ("" prints nothing)
  public let caption: String

  public init(id: String, url: String, key: String, gold: Bool, caption: String) {
    self.id = id
    self.url = url
    self.key = key
    self.gold = gold
    self.caption = caption
  }

  init(row: [String: Any]) {
    self.init(
      id: row["id"] as? String ?? "",
      url: row["url"] as? String ?? "",
      key: row["key"] as? String ?? "",
      gold: row["gold"] as? Bool ?? false,
      caption: row["caption"] as? String ?? ""
    )
  }

  /// what an error calls it: its caption, else its id
  var spoken: String { caption.isEmpty ? id : caption }
}

/// One stamp as a sticker: { fileStem, stamp }.
public struct KStampStickerJob: Equatable, Sendable {
  public let fileStem: String
  public let stamp: KStampExportItem

  public init(fileStem: String, stamp: KStampExportItem) {
    self.fileStem = fileStem
    self.stamp = stamp
  }

  public static func decode(json: String) throws -> KStampStickerJob {
    let root = try KStampExportJSON.object(json)
    guard let row = root["stamp"] as? [String: Any] else {
      throw KStampExportError.notAJob("it has no stamp")
    }
    return KStampStickerJob(fileStem: root["fileStem"] as? String ?? "", stamp: KStampExportItem(row: row))
  }
}

/// Every stamp as printable sheets: { fileStem, top, foot, pages: [[stamp]] }.
public struct KStampSheetJob: Equatable, Sendable {
  public let fileStem: String
  /// "KINDREDLY POST · 9 STAMPS · 2026"
  public let top: String
  /// "PRINT AT 100% · CUT ALONG THE LINES"
  public let foot: String
  /// the stamps of each sheet, in print order (TS pages them 25 to a sheet; a longer list is
  /// split again here, so nothing is ever drawn off the paper)
  public let pages: [[KStampExportItem]]

  public init(fileStem: String, top: String, foot: String, pages: [[KStampExportItem]]) {
    self.fileStem = fileStem
    self.top = top
    self.foot = foot
    self.pages = pages
  }

  public static func decode(json: String) throws -> KStampSheetJob {
    let root = try KStampExportJSON.object(json)
    guard let raw = root["pages"] as? [Any] else {
      throw KStampExportError.notAJob("it has no pages")
    }
    let pages: [[KStampExportItem]] = raw.compactMap { page in
      guard let rows = page as? [Any] else { return nil }
      let items = rows.compactMap { ($0 as? [String: Any]).map(KStampExportItem.init(row:)) }
      return items.isEmpty ? nil : items
    }
    guard !pages.isEmpty else { throw KStampExportError.notAJob("it has no stamps") }
    return KStampSheetJob(
      fileStem: root["fileStem"] as? String ?? "",
      top: root["top"] as? String ?? "",
      foot: root["foot"] as? String ?? "",
      pages: pages
    )
  }

  /// The sheets as they are printed: no sheet longer than the grid holds, none empty.
  var printed: [[KStampExportItem]] {
    var out: [[KStampExportItem]] = []
    for page in pages {
      var rest = page[...]
      while !rest.isEmpty {
        out.append(Array(rest.prefix(KStampSheetMetrics.perSheet)))
        rest = rest.dropFirst(KStampSheetMetrics.perSheet)
      }
    }
    return out
  }
}

enum KStampExportJSON {
  static func object(_ json: String) throws -> [String: Any] {
    guard let data = json.data(using: .utf8), !data.isEmpty else {
      throw KStampExportError.notAJob("the text is empty")
    }
    let parsed: Any
    do {
      parsed = try JSONSerialization.jsonObject(with: data)
    } catch {
      throw KStampExportError.notAJob("it is not JSON (\(error.localizedDescription))")
    }
    guard let root = parsed as? [String: Any] else {
      throw KStampExportError.notAJob("it is not an object")
    }
    return root
  }
}

public enum KStampExportError: Error, LocalizedError, CustomStringConvertible, Equatable {
  /// the JSON string is not an export job
  case notAJob(String)
  /// a stamp's picture could not be had (no link, a failed fetch, not a picture)
  case noPicture(String)
  /// the file could not be written
  case cannotWrite(String)

  public var description: String {
    switch self {
    case let .notAJob(why): return "This is not a stamp export: \(why)."
    case let .noPicture(which): return "The picture of the stamp \(which) could not be loaded."
    case let .cannotWrite(why): return "The stamp export could not be written: \(why)."
    }
  }

  public var errorDescription: String? { description }
}

// MARK: - The sheet's measures

/// The printable sheet, in PDF points (1 mm = 72 / 25.4 pt). See THE SIZES at the top.
enum KStampSheetMetrics {
  static func mm(_ v: CGFloat) -> CGFloat { v * 72 / 25.4 }

  /// A4
  static let page = CGSize(width: mm(210), height: mm(297))
  static let columns = 5
  static let rows = 5
  static let perSheet = columns * rows
  /// one cell between cut lines: the stamp's box and the #topic under it
  static let cell = CGSize(width: mm(30), height: mm(40))
  /// the stamp's 5:6 box is as wide as the cell: 30 × 36 mm
  static let stampWidth = mm(30)
  /// the box starts this far under the cell's top line, so the air above the cut (1 + 2.4 mm)
  /// matches the air at its sides (3.3 mm)
  static let stampTop = mm(1)
  /// the #topic's baseline, from the cell's top
  static let captionBaseline = mm(38)
  static let gridTop = mm(44)
  static var gridLeft: CGFloat { (page.width - CGFloat(columns) * cell.width) / 2 }
  /// the two lines of type: their baselines from the top of the page
  static let topBaseline = mm(36)
  static let footBaseline = mm(253)
  static let topSize: CGFloat = 9
  static let footSize: CGFloat = 8
  static let captionSize: CGFloat = 5.5
  /// the type's tracking, in em (the design's .1em)
  static let tracking: CGFloat = 0.1
  /// the design's colours: the top line in ink, the foot and the #topics in the quiet grey, the
  /// cut lines in the pale lavender grey
  static let ink: UInt32 = 0x1E1B35
  static let quiet: UInt32 = 0x6E6A8A
  static let cutLine: UInt32 = 0xC9C6DD
  static let cutLineWidth: CGFloat = 0.75
  static let cutDash: [CGFloat] = [4, 3]

  /// The cell of the i-th stamp on a sheet (0 … perSheet − 1), in page points, y down.
  static func cellRect(_ i: Int) -> CGRect {
    let col = i % columns
    let row = i / columns
    return CGRect(x: gridLeft + CGFloat(col) * cell.width, y: gridTop + CGFloat(row) * cell.height, width: cell.width, height: cell.height)
  }

  /// The cut lines of a sheet holding `count` stamps, as segments in page points: the outline of
  /// every cell that holds a stamp, each shared edge once (so a dash never doubles), and nothing
  /// round the empty places of a last, shorter row.
  static func cutLines(count: Int) -> [(CGPoint, CGPoint)] {
    let n = max(0, min(count, perSheet))
    guard n > 0 else { return [] }
    let full = n / columns
    let last = n % columns
    let usedRows = full + (last > 0 ? 1 : 0)
    /// how many cells row r holds
    func held(_ r: Int) -> Int {
      guard r >= 0, r < usedRows else { return 0 }
      return r < full ? columns : last
    }
    var out: [(CGPoint, CGPoint)] = []
    // the horizontals: line r lies above row r and under row r − 1, as long as the longer of them
    for r in 0...usedRows {
      let span = max(held(r - 1), held(r))
      guard span > 0 else { continue }
      let y = gridTop + CGFloat(r) * cell.height
      out.append((CGPoint(x: gridLeft, y: y), CGPoint(x: gridLeft + CGFloat(span) * cell.width, y: y)))
    }
    // the verticals: line c runs down every row that reaches it
    for c in 0...columns {
      let reach = (0..<usedRows).filter { held($0) >= c }.count
      guard reach > 0 else { continue }
      let x = gridLeft + CGFloat(c) * cell.width
      out.append((CGPoint(x: x, y: gridTop), CGPoint(x: x, y: gridTop + CGFloat(reach) * cell.height)))
    }
    return out
  }
}

// MARK: - The export

public enum KStampExport {
  /// the sticker is drawn as the album's sheet shows a stamp: this wide, in points
  static let stickerPoints: CGFloat = 200
  /// the sticker's pixels: the cut's 3:4, the long side 1024
  static let stickerPixels = (width: 768, height: 1024)

  // MARK: the one painter

  /**
   A photo stamp into `context`, whose y grows downward (as the screen's does): `image`
   aspect-filled into `paper` (a 3:4 rect), cut by KPhotoStamp.cut, with the edge the app gives a
   stamp whose box is `boxWidth` points wide. No shadow, nothing behind it.
   */
  static func paint(_ image: CGImage, gold: Bool, paper: CGRect, boxWidth: CGFloat, in context: CGContext) {
    guard paper.width > 0, paper.height > 0, image.width > 0, image.height > 0 else { return }
    let cut = KPhotoStamp.cut(in: paper).cgPath
    context.saveGState()
    context.addPath(cut)
    context.clip()

    let iw = CGFloat(image.width)
    let ih = CGFloat(image.height)
    let s = max(paper.width / iw, paper.height / ih)
    let fill = CGRect(x: paper.midX - iw * s / 2, y: paper.midY - ih * s / 2, width: iw * s, height: ih * s)
    // a picture is drawn y up: turn this one rect back over
    context.saveGState()
    context.translateBy(x: fill.minX, y: fill.maxY)
    context.scaleBy(x: 1, y: -1)
    context.interpolationQuality = .high
    context.draw(image, in: CGRect(origin: .zero, size: fill.size))
    context.restoreGState()

    // the edge, inside the cut only: a stroke twice as wide, clipped to the cut (KPhotoStampFace)
    let edge = KPhotoStamp.edge(boxWidth: boxWidth, gold: gold)
    if edge != .none {
      let line = edge == .gold ? KPhotoStamp.goldLinePt : KPhotoStamp.hairlinePt
      let color = edge == .gold ? rgb(KPhotoStamp.goldEdge) : rgb(KStampFrame.v3Ink, alpha: KPhotoStamp.hairlineOpacity)
      context.addPath(cut)
      context.setStrokeColor(color)
      context.setLineWidth(line * 2)
      context.setLineJoin(.round)
      context.strokePath()
    }
    context.restoreGState()
  }

  static func rgb(_ value: UInt32, alpha: CGFloat = 1) -> CGColor {
    CGColor(
      srgbRed: CGFloat((value >> 16) & 0xFF) / 255,
      green: CGFloat((value >> 8) & 0xFF) / 255,
      blue: CGFloat(value & 0xFF) / 255,
      alpha: alpha
    )
  }

  // MARK: the sticker

  /// The sticker's pixels: 768 × 1024, see-through outside the cut.
  static func stickerImage(_ image: CGImage, gold: Bool) -> CGImage? {
    let (w, h) = stickerPixels
    guard let space = CGColorSpace(name: CGColorSpace.sRGB),
          let context = CGContext(
            data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: space,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
          )
    else { return nil }
    let scale = CGFloat(w) / stickerPoints
    // y down, in the album sheet's points
    context.translateBy(x: 0, y: CGFloat(h))
    context.scaleBy(x: scale, y: -scale)
    let paper = CGRect(x: 0, y: 0, width: stickerPoints, height: KPhotoStamp.height(paperWidth: stickerPoints))
    paint(image, gold: gold, paper: paper, boxWidth: stickerPoints * KStampFrame.box.width / KPhotoStamp.paperInBox.width, in: context)
    return context.makeImage()
  }

  /// Writes one stamp as Caches/<fileStem>.png and returns its URL. `directory` nil is Caches.
  public static func sticker(_ job: KStampStickerJob, loader: any KImageLoading, directory: URL? = nil) async throws -> URL {
    let work = Task.detached(priority: .userInitiated) { () throws -> URL in
      let image = try await picture(job.stamp, loader: loader)
      guard let made = stickerImage(image, gold: job.stamp.gold) else {
        throw KStampExportError.cannotWrite("the sticker could not be drawn")
      }
      let (final, part) = try place(stem: safeStem(job.fileStem, fallback: "kindredly-stamp"), ext: "png", directory: directory)
      guard let destination = CGImageDestinationCreateWithURL(part as CFURL, "public.png" as CFString, 1, nil) else {
        throw KStampExportError.cannotWrite("the file can't be opened")
      }
      CGImageDestinationAddImage(destination, made, nil)
      guard CGImageDestinationFinalize(destination) else {
        try? FileManager.default.removeItem(at: part)
        throw KStampExportError.cannotWrite("the picture can't be saved")
      }
      try settle(part: part, final: final)
      return final
    }
    return try await withTaskCancellationHandler {
      try await work.value
    } onCancel: {
      work.cancel()
    }
  }

  // MARK: the sheet

  /// Writes every stamp as Caches/<fileStem>.pdf (A4, as many sheets as needed) and returns its
  /// URL. `directory` nil is Caches.
  public static func sheet(_ job: KStampSheetJob, loader: any KImageLoading, directory: URL? = nil) async throws -> URL {
    let work = Task.detached(priority: .userInitiated) { () throws -> URL in
      let sheets = job.printed
      guard !sheets.isEmpty else { throw KStampExportError.notAJob("it has no stamps") }
      let stem = safeStem(job.fileStem, fallback: "kindredly-stamps")
      let (final, part) = try place(stem: stem, ext: "pdf", directory: directory)
      var box = CGRect(origin: .zero, size: KStampSheetMetrics.page)
      let info: [CFString: Any] = [kCGPDFContextTitle: stem, kCGPDFContextCreator: "Kindredly"]
      guard let context = CGContext(part as CFURL, mediaBox: &box, info as CFDictionary) else {
        throw KStampExportError.cannotWrite("the file can't be opened")
      }
      do {
        for stamps in sheets {
          try Task.checkCancellation()
          context.beginPDFPage(nil)
          // a PDF page's y grows upward; everything here is laid out downward, like the screen
          context.translateBy(x: 0, y: KStampSheetMetrics.page.height)
          context.scaleBy(x: 1, y: -1)
          drawSheetChrome(job: job, count: stamps.count, in: context)
          for (i, stamp) in stamps.enumerated() {
            try Task.checkCancellation()
            // one picture at a time: a sheet never holds 25 decoded photos
            let image = jpegBacked(try await picture(stamp, loader: loader))
            drawCell(stamp, image: image, at: i, in: context)
          }
          context.endPDFPage()
        }
      } catch {
        context.closePDF()
        try? FileManager.default.removeItem(at: part)
        throw error
      }
      context.closePDF()
      try settle(part: part, final: final)
      return final
    }
    return try await withTaskCancellationHandler {
      try await work.value
    } onCancel: {
      work.cancel()
    }
  }

  /// The two lines of type and the cut lines of one sheet.
  static func drawSheetChrome(job: KStampSheetJob, count: Int, in context: CGContext) {
    let m = KStampSheetMetrics.self
    let width = CGFloat(m.columns) * m.cell.width
    let centre = m.page.width / 2
    drawLine(job.top, size: m.topSize, color: rgb(m.ink), centreX: centre, baseline: m.topBaseline, maxWidth: width, in: context)
    drawLine(job.foot, size: m.footSize, color: rgb(m.quiet), centreX: centre, baseline: m.footBaseline, maxWidth: width, in: context)

    context.saveGState()
    context.setStrokeColor(rgb(m.cutLine))
    context.setLineWidth(m.cutLineWidth)
    context.setLineDash(phase: 0, lengths: m.cutDash)
    for (a, b) in m.cutLines(count: count) {
      context.move(to: a)
      context.addLine(to: b)
    }
    context.strokePath()
    context.restoreGState()
  }

  /// One stamp in its cell: the box 30 × 36 mm with the cut where KStamp puts it, the #topic under.
  static func drawCell(_ stamp: KStampExportItem, image: CGImage, at index: Int, in context: CGContext) {
    let m = KStampSheetMetrics.self
    let cell = m.cellRect(index)
    let inBox = KPhotoStamp.paperRect(boxWidth: m.stampWidth)
    let paper = inBox.offsetBy(dx: cell.minX, dy: cell.minY + m.stampTop)
    paint(image, gold: stamp.gold, paper: paper, boxWidth: m.stampWidth, in: context)
    if !stamp.caption.isEmpty {
      drawLine(
        stamp.caption, size: m.captionSize, color: rgb(m.quiet), centreX: cell.midX, baseline: cell.minY + m.captionBaseline,
        maxWidth: cell.width - m.mm(4), tracking: 0, shrink: false, in: context
      )
    }
  }

  // MARK: type

  #if canImport(UIKit)
  private typealias PlatformFont = UIFont
  #else
  private typealias PlatformFont = NSFont
  #endif

  /// SF Mono 500, the app's face for small labels (KType .mono).
  static func mono(_ size: CGFloat) -> CTFont {
    PlatformFont.monospacedSystemFont(ofSize: size, weight: .medium) as CTFont
  }

  /// One centred line of mono type in a y-down context. Too long for `maxWidth`: set smaller,
  /// down to 6 pt (`shrink`), then cut with an ellipsis; never drawn past the width.
  static func drawLine(
    _ text: String, size: CGFloat, color: CGColor, centreX: CGFloat, baseline: CGFloat, maxWidth: CGFloat,
    tracking: CGFloat = KStampSheetMetrics.tracking, shrink: Bool = true, in context: CGContext
  ) {
    let words = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !words.isEmpty, maxWidth > 0 else { return }
    func set(_ string: String, _ size: CGFloat) -> (CTLine, CGFloat) {
      let kern = tracking * size
      let attributes: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): mono(size),
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
        NSAttributedString.Key(kCTKernAttributeName as String): kern,
      ]
      let line = CTLineCreateWithAttributedString(NSAttributedString(string: string, attributes: attributes))
      // the tracking after the last letter is air, not width
      return (line, max(0, CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil)) - kern))
    }
    var (line, width) = set(words, size)
    var used = size
    if width > maxWidth, shrink {
      used = max(6, (size * maxWidth / width * 10).rounded(.down) / 10)
      (line, width) = set(words, used)
    }
    if width > maxWidth {
      let (dots, _) = set("…", used)
      if let cut = CTLineCreateTruncatedLine(line, Double(maxWidth), .end, dots) {
        line = cut
        width = min(maxWidth, CGFloat(CTLineGetTypographicBounds(cut, nil, nil, nil)))
      }
    }
    context.saveGState()
    // the context is turned over, so the letters are turned back
    context.textMatrix = CGAffineTransform(scaleX: 1, y: -1)
    context.textPosition = CGPoint(x: centreX - width / 2, y: baseline)
    CTLineDraw(line, context)
    context.restoreGState()
  }

  // MARK: pictures

  /// The stamp's picture from the app's loader, at the size the server stores (600 × 800).
  static func picture(_ stamp: KStampExportItem, loader: any KImageLoading) async throws -> CGImage {
    guard let ref = KImageRef(uri: stamp.url, key: stamp.key) else {
      throw KStampExportError.noPicture(stamp.spoken)
    }
    guard let image = await loader.load(ref, pixelSize: KPhotoStamp.exportSize) else {
      try Task.checkCancellation()
      throw KStampExportError.noPicture(stamp.spoken)
    }
    return image
  }

  /// The same picture held as JPEG data, so the PDF stores the JPEG (about a hundred kilobytes)
  /// and not raw pixels (near two megabytes each). Quality 0.86: the server's picture is already
  /// a JPEG of at most 150 KB, and this must not visibly cost it anything in print.
  static func jpegBacked(_ image: CGImage) -> CGImage {
    switch image.alphaInfo {
    case .none, .noneSkipFirst, .noneSkipLast: break
    default: return image
    }
    let data = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(data, "public.jpeg" as CFString, 1, nil) else { return image }
    CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.86] as CFDictionary)
    guard CGImageDestinationFinalize(destination),
          let provider = CGDataProvider(data: data),
          let jpeg = CGImage(jpegDataProviderSource: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)
    else { return image }
    return jpeg
  }

  // MARK: files

  /// A file name's stem that is safe anywhere: letters and digits of any script, "-" and "_";
  /// anything else becomes "-", runs of them one, none at either end; at most 60 characters.
  static func safeStem(_ stem: String, fallback: String) -> String {
    var out = ""
    var dash = false
    for scalar in stem.precomposedStringWithCompatibilityMapping.unicodeScalars {
      if CharacterSet.alphanumerics.contains(scalar) || scalar == "_" {
        if dash, !out.isEmpty { out.append("-") }
        dash = false
        out.unicodeScalars.append(scalar)
      } else {
        dash = true
      }
      if out.count >= 60 { break }
    }
    return out.isEmpty ? fallback : out
  }

  /// Where the file goes and the name it is written under first.
  static func place(stem: String, ext: String, directory: URL?) throws -> (final: URL, part: URL) {
    let files = FileManager.default
    let folder = directory ?? files.urls(for: .cachesDirectory, in: .userDomainMask).first ?? files.temporaryDirectory
    do {
      try files.createDirectory(at: folder, withIntermediateDirectories: true)
    } catch {
      throw KStampExportError.cannotWrite("the folder can't be made (\(error.localizedDescription))")
    }
    return (
      folder.appendingPathComponent("\(stem).\(ext)"),
      folder.appendingPathComponent(".\(stem)-\(UUID().uuidString.prefix(8)).\(ext).part")
    )
  }

  /// Moves the finished file into place, over an older one of the same name.
  static func settle(part: URL, final: URL) throws {
    let files = FileManager.default
    do {
      if files.fileExists(atPath: final.path) {
        _ = try files.replaceItemAt(final, withItemAt: part)
      } else {
        try files.moveItem(at: part, to: final)
      }
    } catch {
      try? files.removeItem(at: part)
      throw KStampExportError.cannotWrite("the file can't be put in place (\(error.localizedDescription))")
    }
  }
}
