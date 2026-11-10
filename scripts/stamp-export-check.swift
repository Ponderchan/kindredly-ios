/* The stamp export's check (stamp export, 2026-11-10; modules/kindredly-ui/ios/Portable/Stamps/
   KStampExport.swift). The module has no test target, so this is a small program compiled on the
   Mac with the four Portable files it needs and run by hand from the repo root:

     xcrun swiftc -parse-as-library -target arm64-apple-macos14 \
       modules/kindredly-ui/ios/Portable/Kit/KStampFrame.swift \
       modules/kindredly-ui/ios/Portable/Kit/KLineGlyph.swift \
       modules/kindredly-ui/ios/Portable/Kit/KImage.swift \
       modules/kindredly-ui/ios/Portable/Stamps/KStampExport.swift \
       scripts/stamp-export-check.swift -o "$TMPDIR/stamp-export-check" \
       && "$TMPDIR/stamp-export-check" assets/aura-scenes/01-quiet-observer.png "$TMPDIR/stamp-export-out"

   Its first argument is any picture (the sample "photo"), its second a folder for what it makes
   (the stickers, the sheets, and each sheet's first page as a PNG to look at). It checks:

   · the jobs: the JSON TS sends is read, a job that is not one says why;
   · the file names: safeStem keeps letters and digits of any script and nothing that could leave
     the folder;
   · the sticker: 768 × 1024, see-through at the corners and in the bites, the photo in the
     middle, and THE SAME PICTURE AS THE APP'S OWN VIEW: KPhotoStampFace (the view the album
     draws a photo stamp with) rendered by ImageRenderer at the same size, compared pixel for
     pixel, plain and gold;
   · the sheet: the cut lines for 1, 5, 7 and 25 stamps (each shared edge once, nothing round an
     empty place), an A4 PDF of the right number of pages (3 stamps: 1; 27: 2), everything inside
     the part of the page that survives US Letter, a file of a sane size (the photos stored as
     JPEG), and a stamp whose picture is missing fails the whole export with its name.

   Every line prints ok/FAIL and the exit status is non-zero if any fail. */

import Foundation
import SwiftUI
import ImageIO
import CoreGraphics

/// Reads a picture file at about the size asked, as the app's KImageStore does for a file://.
struct FileLoader: KImageLoading {
  func load(_ ref: KImageRef, pixelSize: CGSize) async -> CGImage? {
    guard ref.url.isFileURL, let source = CGImageSourceCreateWithURL(ref.url as CFURL, nil) else { return nil }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: max(pixelSize.width, pixelSize.height) * 2,
    ]
    return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
  }
}

var failures = 0
func ok(_ name: String, _ pass: Bool, _ detail: String = "") {
  if !pass { failures += 1 }
  print("\(pass ? "ok  " : "FAIL") \(name)\(detail.isEmpty ? "" : "  (\(detail))")")
}

/// RGBA8 premultiplied pixels of an image, top row first.
func pixels(_ image: CGImage) -> [UInt8] {
  let w = image.width, h = image.height
  var data = [UInt8](repeating: 0, count: w * h * 4)
  data.withUnsafeMutableBytes { raw in
    guard let ctx = CGContext(
      data: raw.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
      space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return }
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
  }
  return data
}

func alpha(_ px: [UInt8], _ w: Int, _ x: Int, _ y: Int) -> Int { Int(px[(y * w + x) * 4 + 3]) }

func writePNG(_ image: CGImage, _ url: URL) {
  guard let d = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else { return }
  CGImageDestinationAddImage(d, image, nil)
  CGImageDestinationFinalize(d)
}

/// The first page of a PDF as a picture on white, `scale` pixels per point.
func firstPage(_ url: URL, scale: CGFloat = 2) -> CGImage? {
  guard let doc = CGPDFDocument(url as CFURL), let page = doc.page(at: 1) else { return nil }
  let box = page.getBoxRect(.mediaBox)
  guard let ctx = CGContext(
    data: nil, width: Int(box.width * scale), height: Int(box.height * scale), bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else { return nil }
  ctx.setFillColor(CGColor(gray: 1, alpha: 1))
  ctx.fill(CGRect(x: 0, y: 0, width: box.width * scale, height: box.height * scale))
  ctx.scaleBy(x: scale, y: scale)
  ctx.drawPDFPage(page)
  return ctx.makeImage()
}

/// The app's own view of a photo stamp, as the album's sheet draws it, without its shadow.
@MainActor
func appView(_ image: CGImage, gold: Bool) -> CGImage? {
  let w = KStampExport.stickerPoints
  let view = KPhotoStampFace(width: w, placement: .paper, gold: gold, dark: false, shadow: false) {
    Image(decorative: image, scale: 1)
      .resizable()
      .aspectRatio(contentMode: .fill)
      .frame(width: w, height: KPhotoStamp.height(paperWidth: w))
  }
  let renderer = ImageRenderer(content: view)
  renderer.scale = CGFloat(KStampExport.stickerPixels.width) / w
  renderer.isOpaque = false
  return renderer.cgImage
}

/// How far two pictures of the same size are apart: the mean and the share of pixels whose
/// alpha differs by more than a quarter (an edge in another place).
func distance(_ a: CGImage, _ b: CGImage) -> (mean: Double, edge: Double)? {
  guard a.width == b.width, a.height == b.height else { return nil }
  let pa = pixels(a), pb = pixels(b)
  var sum = 0.0
  var edge = 0
  for i in stride(from: 0, to: pa.count, by: 4) {
    for c in 0..<4 { sum += abs(Double(pa[i + c]) - Double(pb[i + c])) }
    if abs(Int(pa[i + 3]) - Int(pb[i + 3])) > 64 { edge += 1 }
  }
  return (sum / Double(pa.count), Double(edge) / Double(pa.count / 4))
}

@main
struct Check {
  static func main() async {
    let args = CommandLine.arguments
    guard args.count >= 3 else {
      print("usage: stamp-export-check <a picture> <an output folder>")
      exit(2)
    }
    let photo = URL(fileURLWithPath: args[1])
    let out = URL(fileURLWithPath: args[2], isDirectory: true)
    try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
    let loader = FileLoader()
    let item = { (caption: String, gold: Bool) in
      KStampExportItem(id: "c:11111111-2222-4333-8444-555555555555", url: photo.absoluteString, key: "check:" + photo.path, gold: gold, caption: caption)
    }

    // ── the jobs ──
    let stickerJSON = ##"{"fileStem":"kindredly-stamp-tea","stamp":{"id":"c:a","url":"file:///x.jpg","key":"k","gold":true,"caption":"#tea"}}"##
    let sj = try? KStampStickerJob.decode(json: stickerJSON)
    ok("a sticker job is read", sj == KStampStickerJob(fileStem: "kindredly-stamp-tea", stamp: KStampExportItem(id: "c:a", url: "file:///x.jpg", key: "k", gold: true, caption: "#tea")))
    let sheetJSON = ##"{"fileStem":"kindredly-stamps-2026","top":"T","foot":"F","pages":[[{"id":"c:a","url":"u"},{"id":"c:b","url":"v","gold":true,"caption":"#b"}],[],[{"id":"c:c","url":"w"}]]}"##
    let hj = try? KStampSheetJob.decode(json: sheetJSON)
    ok("a sheet job is read, an empty sheet dropped", hj?.pages.map(\.count) == [2, 1] && hj?.top == "T" && hj?.foot == "F" && hj?.pages[0][1].gold == true)
    func refuses(_ json: String, sheet: Bool) -> Bool {
      do {
        if sheet { _ = try KStampSheetJob.decode(json: json) } else { _ = try KStampStickerJob.decode(json: json) }
        return false
      } catch let e as KStampExportError {
        if case .notAJob = e { return true }
        return false
      } catch { return false }
    }
    ok("not JSON, not an object, no stamp, no stamps: each says so",
       refuses("", sheet: false) && refuses("[1]", sheet: false) && refuses("{}", sheet: false) && refuses("{\"pages\":[[]]}", sheet: true) && refuses("{\"pages\":3}", sheet: true))
    let long = KStampSheetJob(fileStem: "x", top: "", foot: "", pages: [Array(repeating: item("#a", false), count: 27)])
    ok("a sheet longer than the grid is split, never drawn off the paper", long.printed.map(\.count) == [25, 2])

    // ── the file names ──
    ok("a plain stem is kept", KStampExport.safeStem("kindredly-stamp-tiny-win", fallback: "f") == "kindredly-stamp-tiny-win")
    ok("nothing that leaves the folder", KStampExport.safeStem("../../etc/pass wd", fallback: "f") == "etc-pass-wd")
    ok("other scripts are kept", KStampExport.safeStem("kindredly-stamp-お茶", fallback: "f") == "kindredly-stamp-お茶")
    ok("nothing usable: the fallback", KStampExport.safeStem("…/ 🙂", fallback: "kindredly-stamp") == "kindredly-stamp")
    ok("at most 60 characters", KStampExport.safeStem(String(repeating: "a", count: 200), fallback: "f").count == 60)

    // ── the cut lines ──
    let m = KStampSheetMetrics.self
    func total(_ n: Int) -> CGFloat {
      m.cutLines(count: n).reduce(0) { $0 + abs($1.1.x - $1.0.x) + abs($1.1.y - $1.0.y) }
    }
    let cw = m.cell.width, ch = m.cell.height
    func near(_ a: CGFloat, _ b: CGFloat) -> Bool { abs(a - b) < 0.01 }
    ok("no stamp, no line", m.cutLines(count: 0).isEmpty)
    ok("one stamp: its four sides", near(total(1), 2 * cw + 2 * ch) && m.cutLines(count: 1).count == 4)
    ok("a full row of five: two long lines and six short", near(total(5), 2 * 5 * cw + 6 * ch) && m.cutLines(count: 5).count == 8)
    // 7: the row line between is 5 wide, the last 2 wide; verticals 0…2 run two rows, 3…5 one
    ok("seven: nothing round the empty places", near(total(7), (5 + 5 + 2) * cw + (3 * 2 + 3 * 1) * ch))
    ok("a full sheet: six lines each way", near(total(25), 6 * 5 * cw + 6 * 5 * ch) && m.cutLines(count: 25).count == 12)
    let lastCell = m.cellRect(m.perSheet - 1)
    let letter = CGSize(width: 612, height: 792)
    let lost = m.page.height - letter.height
    // on Letter the page loses `lost` at the foot (printed from the top) or half of it at each end
    // (centred); a quarter inch more is what a printer can't reach
    let reach: CGFloat = 18
    ok("the grid is on the page, centred", near(m.cellRect(0).minX, m.page.width - lastCell.maxX) && lastCell.maxY < m.footBaseline - m.footSize)
    ok("everything survives US Letter at 100%",
       m.topBaseline - m.topSize > lost / 2 + reach && m.footBaseline < m.page.height - lost - reach
         && m.cellRect(0).minX > (m.page.width - letter.width) / 2 + reach && m.cellRect(0).minX > m.mm(25),
       "top \(Int(m.topBaseline)) foot \(Int(m.footBaseline)) of \(Int(m.page.height)), side \(Int(m.cellRect(0).minX))")
    ok("a stamp's box is 30 × 36 mm", near(m.stampWidth, m.mm(30)) && near(KStampFrame.height(m.stampWidth), m.mm(36)))

    // ── the sticker ──
    for gold in [false, true] {
      let name = gold ? "kindredly-stamp-gold" : "kindredly-stamp-tiny-win"
      do {
        let url = try await KStampExport.sticker(KStampStickerJob(fileStem: name, stamp: item("#tiny win", gold)), loader: loader, directory: out)
        ok("\(name).png is written", url.lastPathComponent == name + ".png" && FileManager.default.fileExists(atPath: url.path))
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), let made = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
          ok("\(name).png reads back", false)
          continue
        }
        let w = made.width, h = made.height
        ok("768 × 1024", w == 768 && h == 1024, "\(w) × \(h)")
        let px = pixels(made)
        let s = Double(w) / 78
        ok("see-through at the four corners", [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)].allSatisfy { alpha(px, w, $0.0, $0.1) == 0 })
        let bites = KPhotoStamp.bites.map { (min(w - 1, max(0, Int(Double($0.x) * s))), min(h - 1, max(0, Int(Double($0.y) * s)))) }
        ok("see-through in all sixteen bites", bites.allSatisfy { alpha(px, w, $0.0, $0.1) == 0 })
        ok("the photo in the middle, and between two bites", alpha(px, w, w / 2, h / 2) == 255 && alpha(px, w, Int(28.5 * s), 6) == 255)
        if gold {
          // the gold line: 2 pt inside the straight left edge, between two bites (y 25 of 104)
          let i = (Int(25 * s) * w + 3) * 4
          ok("the gold line is gold", abs(Int(px[i]) - 0xD8) < 6 && abs(Int(px[i + 1]) - 0xA6) < 6 && abs(Int(px[i + 2]) - 0x3F) < 6, "\(px[i]) \(px[i + 1]) \(px[i + 2])")
        }
        // the app's own view, by ImageRenderer
        if let image = await loader.load(KImageRef(uri: photo.absoluteString)!, pixelSize: KPhotoStamp.exportSize),
           let app = await appView(image, gold: gold) {
          writePNG(app, out.appendingPathComponent(name + "-app-view.png"))
          if let d = distance(made, app) {
            ok("the same picture as KPhotoStampFace (\(gold ? "gold" : "plain"))", d.mean < 1.5 && d.edge < 0.002, String(format: "mean %.3f of 255, edge pixels %.4f%%", d.mean, d.edge * 100))
          } else {
            ok("the same size as KPhotoStampFace", false, "\(app.width) × \(app.height)")
          }
        } else {
          ok("the app's view renders", false)
        }
      } catch {
        ok("\(name).png is written", false, "\(error)")
      }
    }

    // ── the sheets ──
    let tags = ["#tiny win", "#can’t sleep", "#almost texted", "#a song", "#big feeling", "#changed", "#お茶", "#a topic far too long to fit under one stamp"]
    for n in [1, 3, 7, 27] {
      let stamps = (0..<n).map { item(tags[$0 % tags.count], $0 % 6 == 4) }
      var pages: [[KStampExportItem]] = []
      var rest = stamps[...]
      while !rest.isEmpty {
        pages.append(Array(rest.prefix(25)))
        rest = rest.dropFirst(25)
      }
      let job = KStampSheetJob(fileStem: "kindredly-stamps-\(n)", top: "KINDREDLY POST · \(n) STAMP\(n == 1 ? "" : "S") · 2026", foot: "PRINT AT 100% · CUT ALONG THE LINES", pages: pages)
      do {
        let url = try await KStampExport.sheet(job, loader: loader, directory: out)
        let doc = CGPDFDocument(url as CFURL)
        let box = doc?.page(at: 1)?.getBoxRect(.mediaBox) ?? .zero
        let bytes = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int) ?? 0
        ok("\(n) stamp(s): \(pages.count) A4 sheet(s)", doc?.numberOfPages == pages.count && near(box.width, m.page.width) && near(box.height, m.page.height), "\(doc?.numberOfPages ?? 0) pages, \(bytes / 1024) KB")
        ok("\(n) stamp(s): the photos are stored as JPEG", bytes > 2000 && bytes < 40_000 + n * 220_000, "\(bytes / 1024) KB")
        if let page = firstPage(url) { writePNG(page, out.appendingPathComponent("kindredly-stamps-\(n)-page1.png")) }
      } catch {
        ok("\(n) stamp(s): a sheet is written", false, "\(error)")
      }
    }
    // a picture that can't be had fails the export by name, and leaves no half file
    do {
      let gone = KStampExportItem(id: "c:gone", url: "file:///nowhere/at-all.jpg", key: "", gold: false, caption: "#gone")
      _ = try await KStampExport.sheet(KStampSheetJob(fileStem: "kindredly-stamps-gone", top: "", foot: "", pages: [[item("#a", false), gone]]), loader: loader, directory: out)
      ok("a missing picture fails the sheet", false)
    } catch let e as KStampExportError {
      let left = (try? FileManager.default.contentsOfDirectory(atPath: out.path))?.filter { $0.contains("gone") } ?? []
      ok("a missing picture fails the sheet by name, no half file left", e == .noPicture("#gone") && left.isEmpty, "\(e)")
    } catch {
      ok("a missing picture fails the sheet", false, "\(error)")
    }
    do {
      _ = try await KStampExport.sticker(KStampStickerJob(fileStem: "x", stamp: KStampExportItem(id: "c:none", url: "", key: "", gold: false, caption: "")), loader: loader, directory: out)
      ok("a stamp with no picture fails the sticker", false)
    } catch let e as KStampExportError {
      ok("a stamp with no picture fails the sticker", e == .noPicture("c:none"))
    } catch {
      ok("a stamp with no picture fails the sticker", false, "\(error)")
    }

    print(failures == 0 ? "all ok" : "\(failures) FAILED")
    exit(failures == 0 ? 0 : 1)
  }
}
