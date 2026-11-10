// Portable: this file imports SwiftUI (for KLetterFace's module) and CoreText only, so the 1.1.0
// pure-Swift app can take it as is.

import SwiftUI
import CoreText

/*
 THE BOOK'S TYPE: fonts, line breaking and line drawing, all in CoreText (journal book,
 2026-11-10).

 WHY CORETEXT AND NOT SwiftUI Text. A printed page has to know exactly which words are on it: an
 entry that doesn't fit CONTINUES on the next page, and nothing may ever be cut or end in an
 ellipsis. That means the lines must be broken by the same engine that draws them. If SwiftUI's
 Text drew what CoreText measured, one word breaking differently would push a line off the page.
 So every word in the book is broken into lines here (CTTypesetter, at the page's exact fonts and
 widths) and those very lines are drawn (CTLineDraw). The preview on the phone and the PDF call
 the same code on the same 420-point page (the preview is that page scaled), so they cannot
 disagree, and CoreText text in a PDF context is real text: selectable, searchable, vector.

 THE PAGE IS 420 × 595 points, always (A5 at 72 dpi, CONTRACT.md). Sizes are in `u` = 4.2 points,
 which is the mock's `cqw` (1% of the page width), so the numbers in the templates are the CSS's.
 A smaller preview scales the drawing, never the layout: system fonts change their letter fit
 with size, and a page laid out at 300 points could break its lines differently from the PDF.
 Dynamic Type has no say in here: these fonts are made at fixed sizes.

 THE FACES are the app's three (owner's type rules): the system font (heavy for titles and
 numerals, semibold for a short entry), SF Mono for the small labels, and the reader's Letter
 font for a long entry (KLetterFace: Newsreader, System, EB Garamond, SF Mono). Glyphs a face
 lacks (CJK in Newsreader, emoji anywhere) fall to the system's own faces, as CoreText does by
 itself and as the rest of the app does.

 LINE BREAKING, the cases that matter:
 - an empty text has no lines;
 - "\n" ends a line; a line with nothing on it (the blank between two paragraphs) is kept as a
   gap, a little more than half a line tall, and is never the first thing on a page;
 - a word longer than the line is broken between letters (never inside a cluster, so an emoji or
   an accented letter stays whole), not pushed off the edge;
 - emoji-only text breaks between emoji;
 - right-to-left paragraphs (Arabic, Hebrew) are detected by their first strong letter, set
   right to left and flushed to the right edge of the text box; mixed lines are ordered by
   CoreText's bidi;
 - CJK breaks between characters, as CoreText's line breaker does.
 Every break is asked of CTTypesetter for the remaining text, so a page that starts in the middle
 of a paragraph gets the same lines it would have got on one endless page.

 THE DRIFTED LINE's highlight is a range of the body, not of a page: each line draws the part of
 the range it holds (the run's own rectangle, so it is right in bidi text too), so the highlight
 carries across a line break and across a page break.

 This file knows nothing about templates. KBookPaint.swift draws them with it.
 */

/// The fixed page: 420 × 595 points, and `u`, 1% of its width (the mock's cqw).
enum KBookMetrics {
  static let width: CGFloat = 420
  static let height: CGFloat = 595
  static let u: CGFloat = 4.2
}

/// A range of a string in UTF-16 units (what CoreText counts in). Sendable, unlike NSRange's
/// bridging in some toolchains, and Equatable for the rendered pages.
struct KBookRange: Equatable, Hashable, Sendable {
  var location: Int
  var length: Int

  var end: Int { location + length }
  var cf: CFRange { CFRange(location: location, length: length) }
  var ns: NSRange { NSRange(location: location, length: length) }

  init(_ location: Int, _ length: Int) {
    self.location = location
    self.length = length
  }

  /// The part both ranges hold; nil when they don't overlap.
  func clipped(to other: KBookRange) -> KBookRange? {
    let start = max(location, other.location)
    let stop = min(end, other.end)
    return stop > start ? KBookRange(start, stop - start) : nil
  }
}

/// One of the book's text styles: a face at a size, with CSS's letter-spacing and line-height.
struct KBookTextStyle: Equatable {
  enum Face: Equatable {
    /// System 800: titles and numerals
    case heavy
    /// System 700: the calendar's day numbers
    case bold
    /// System 600: a short entry, captions, stat labels
    case semibold
    /// SF Mono 500: the small labels
    case mono
    /// SF Mono 600: the year page's month names
    case monoSemibold
    /// the reader's Letter font at 400: a long entry
    case letter(KLetterFace)
  }

  var face: Face
  /// in points on the 420-point page
  var size: CGFloat
  /// letter-spacing in em
  var tracking: CGFloat = 0
  /// line-height as a multiple of the size
  var lineHeight: CGFloat = 1.2

  /// One line's box, in points.
  var line: CGFloat { size * lineHeight }

  func sized(_ newSize: CGFloat) -> KBookTextStyle {
    var copy = self
    copy.size = newSize
    return copy
  }

  var font: CTFont {
    switch face {
    case .heavy: return KBookFonts.system(size, .heavy)
    case .bold: return KBookFonts.system(size, .bold)
    case .semibold: return KBookFonts.system(size, .semibold)
    case .mono: return KBookFonts.mono(size, .medium)
    case .monoSemibold: return KBookFonts.mono(size, .semibold)
    case let .letter(letterFace): return KBookFonts.letter(letterFace, size)
    }
  }
}

#if canImport(UIKit)
typealias KBookPlatformFont = UIFont
#else
// the engine also builds for macOS, where it is run as a check (no UIKit there)
typealias KBookPlatformFont = NSFont
#endif

enum KBookFonts {
  static func system(_ size: CGFloat, _ weight: KBookPlatformFont.Weight) -> CTFont {
    KBookPlatformFont.systemFont(ofSize: size, weight: weight) as CTFont
  }

  static func mono(_ size: CGFloat, _ weight: KBookPlatformFont.Weight) -> CTFont {
    KBookPlatformFont.monospacedSystemFont(ofSize: size, weight: weight) as CTFont
  }

  /// An embedded face by its PostScript name; nil when this binary doesn't carry it (CoreText
  /// would hand back some other font without saying so).
  static func named(_ postScript: String, _ size: CGFloat) -> CTFont? {
    let font = CTFontCreateWithName(postScript as CFString, size, nil)
    return (CTFontCopyPostScriptName(font) as String) == postScript ? font : nil
  }

  /// The reader's Letter font, as KType draws content: Newsreader and Garamond from the embedded
  /// files (Garamond falls to Newsreader, Newsreader to the system face), System and SF Mono from
  /// the system.
  static func letter(_ face: KLetterFace, _ size: CGFloat) -> CTFont {
    switch face.drawn {
    case .newsreader:
      return named(KType.serifRegular, size) ?? system(size, .regular)
    case .garamond:
      return named(KType.garamondRegular, size) ?? named(KType.serifRegular, size) ?? system(size, .regular)
    case .system:
      return system(size, .regular)
    case .sfMono:
      return mono(size, .regular)
    }
  }
}

/// A colour in sRGB, as the book's CSS writes it.
enum KBookColor {
  private static let space = CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB()

  static func rgb(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    let parts: [CGFloat] = [
      CGFloat((hex >> 16) & 0xFF) / 255,
      CGFloat((hex >> 8) & 0xFF) / 255,
      CGFloat(hex & 0xFF) / 255,
      alpha,
    ]
    return CGColor(colorSpace: space, components: parts) ?? CGColor(gray: 0, alpha: alpha)
  }

  /// "#RRGGBB" (or "RRGGBB"); nil for anything else, so the caller chooses what to draw instead.
  static func hex(_ text: String, _ alpha: CGFloat = 1) -> CGColor? {
    let digits = text.hasPrefix("#") ? String(text.dropFirst()) : text
    guard digits.count == 6, digits.allSatisfy(\.isHexDigit), let value = UInt32(digits, radix: 16) else { return nil }
    return rgb(value, alpha)
  }

  static func alpha(_ color: CGColor, _ alpha: CGFloat) -> CGColor {
    color.copy(alpha: alpha) ?? color
  }

  static let white = rgb(0xFFFFFF)
  /// the book's ink
  static let ink = rgb(0x1E1B35)
  /// the small labels
  static let label = rgb(0x6E6A8A)
  /// the cover's ground
  static let indigo = rgb(0x5B55FF)
  /// the cover's title
  static let acid = rgb(0xC3E84F)
  /// a day with no page, on the year page
  static let paleDay = rgb(0xEEEDF5)
  /// a day with no page, on the month page
  static let paleCell = rgb(0xF1F0F7)
  /// an empty day's number
  static let paleNumber = rgb(0xB9B6CF)
  /// the marks of a mood face (the design's own)
  static let faceInk = rgb(0x241F33)
}

/// One broken line: which characters it holds, and how it sits.
struct KBookLine: Equatable, Sendable {
  var range: KBookRange
  /// its paragraph reads right to left: it is flushed to the right edge of the text box
  var rtl: Bool
  /// nothing but a line end: a paragraph gap
  var blank: Bool
}

/// How a block of lines is set against its box.
enum KBookAlign {
  /// each line to its own paragraph's leading edge (left, or right for a right-to-left one): what
  /// someone wrote
  case natural
  /// every line to the left edge
  case left
  /// every line to the right edge (the small numeral, CONTINUES, the page number)
  case right
}

/// A text with its line breaker. Made, used and dropped on one thread; never stored.
final class KBookSetter {
  let text: NSString
  let style: KBookTextStyle
  private let attributed: NSAttributedString
  private let typesetter: CTTypesetter
  private let ascent: CGFloat
  private let descent: CGFloat
  /// where each paragraph starts, and whether it reads right to left
  private let paragraphs: [(start: Int, rtl: Bool)]

  /// a paragraph gap's height, as a part of a line
  static let blankFactor: CGFloat = 0.58

  /// - Parameters:
  ///   - string: the whole text (for a body: the whole body, whichever page is being set)
  ///   - color: the text's colour
  ///   - marks: ranges drawn in another colour (the drifted line on a photo)
  init(_ string: String, style: KBookTextStyle, color: CGColor, marks: [(KBookRange, CGColor)] = []) {
    let ns = string as NSString
    let font = style.font
    var attributes: [NSAttributedString.Key: Any] = [
      NSAttributedString.Key(kCTFontAttributeName as String): font,
      NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
    ]
    // letter-spacing pulls joined scripts apart (Arabic letters stop touching): none for those
    if style.tracking != 0, !Self.hasJoinedScript(string) {
      attributes[NSAttributedString.Key(kCTTrackingAttributeName as String)] = style.tracking * style.size
    }
    let out = NSMutableAttributedString(string: string, attributes: attributes)
    let whole = KBookRange(0, ns.length)
    for (range, markColor) in marks {
      guard let clipped = range.clipped(to: whole) else { continue }
      out.addAttribute(NSAttributedString.Key(kCTForegroundColorAttributeName as String), value: markColor, range: clipped.ns)
    }

    // each paragraph's direction, said out loud so CoreText and the flush below agree
    var found: [(start: Int, rtl: Bool)] = []
    var at = 0
    while at < ns.length {
      let paragraph = ns.paragraphRange(for: NSRange(location: at, length: 0))
      let rtl = Self.readsRightToLeft(ns.substring(with: paragraph))
      found.append((paragraph.location, rtl))
      var direction: CTWritingDirection = rtl ? .rightToLeft : .leftToRight
      // the setting points at `direction` only until the style is made, which copies the value
      let paragraphStyle: CTParagraphStyle = withUnsafePointer(to: &direction) { pointer in
        var setting = CTParagraphStyleSetting(spec: .baseWritingDirection, valueSize: MemoryLayout<CTWritingDirection>.size, value: pointer)
        return CTParagraphStyleCreate(&setting, 1)
      }
      out.addAttribute(NSAttributedString.Key(kCTParagraphStyleAttributeName as String), value: paragraphStyle, range: paragraph)
      at = paragraph.location + max(paragraph.length, 1)
    }

    self.text = ns
    self.style = style
    self.attributed = out
    self.typesetter = CTTypesetterCreateWithAttributedString(out)
    self.ascent = CTFontGetAscent(font)
    self.descent = CTFontGetDescent(font)
    self.paragraphs = found
  }

  var length: Int { text.length }

  /// How far the last line's descenders reach below its line box (a tight line height, as a
  /// title's 0.92, is shorter than the font).
  var overhang: CGFloat { max(0, (ascent + descent - style.line) / 2) }

  /// Whether a paragraph reads right to left: its first strong letter is Hebrew, Arabic or
  /// another right-to-left script (Unicode's rules P2 and P3, in short).
  static func readsRightToLeft(_ paragraph: String) -> Bool {
    for scalar in paragraph.unicodeScalars {
      let value = scalar.value
      let inRightToLeftBlock = (0x0590...0x08FF).contains(value) || (0xFB1D...0xFDFF).contains(value)
        || (0xFE70...0xFEFF).contains(value) || (0x10800...0x10FFF).contains(value) || (0x1E800...0x1EFFF).contains(value)
      switch scalar.properties.generalCategory {
      case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter:
        return inRightToLeftBlock
      default:
        continue
      }
    }
    return false
  }

  /// Whether the text has letters of a script written joined up (Arabic and its relatives,
  /// Syriac, N'Ko, Mongolian), where letter-spacing would break the words.
  static func hasJoinedScript(_ string: String) -> Bool {
    string.unicodeScalars.contains { scalar in
      let value = scalar.value
      return (0x0600...0x086F).contains(value) || (0x08A0...0x08FF).contains(value) || (0x1800...0x18AF).contains(value)
        || (0xFB50...0xFDFF).contains(value) || (0xFE70...0xFEFF).contains(value)
    }
  }

  private func isRightToLeft(at index: Int) -> Bool {
    var answer = false
    for paragraph in paragraphs {
      if paragraph.start > index { break }
      answer = paragraph.rtl
    }
    return answer
  }

  private func isBlank(_ range: KBookRange) -> Bool {
    text.substring(with: range.ns).trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  /// The height one line takes in a block.
  func height(of line: KBookLine) -> CGFloat {
    style.line * (line.blank ? Self.blankFactor : 1)
  }

  func height(of lines: [KBookLine]) -> CGFloat {
    lines.reduce(0) { $0 + height(of: $1) }
  }

  /// Breaks lines from `start` at `width`, for as many as fit in `maxHeight`. Paragraph gaps at the top are skipped, and gaps at the bottom of a box that
  /// filled up are dropped (the characters they hold are only line ends). When there is text left,
  /// at least one line is always taken, so a caller's loop can't stand still. `next` is where the
  /// following box starts; it equals `length` when everything from `start` was placed.
  func fill(from start: Int, width: CGFloat, maxHeight: CGFloat) -> (lines: [KBookLine], next: Int) {
    var lines: [KBookLine] = []
    var used: CGFloat = 0
    var at = max(0, start)
    let end = length
    var full = false
    while at < end {
      var count = CTTypesetterSuggestLineBreak(typesetter, at, Double(max(width, 1)))
      if count <= 0 { count = CTTypesetterSuggestClusterBreak(typesetter, at, Double(max(width, 1))) }
      if count <= 0 { count = text.rangeOfComposedCharacterSequence(at: at).length }
      count = min(max(count, 1), end - at)
      let range = KBookRange(at, count)
      let blank = isBlank(range)
      if blank, lines.isEmpty {
        at += count
        continue
      }
      let line = KBookLine(range: range, rtl: isRightToLeft(at: at), blank: blank)
      let tall = height(of: line)
      if !lines.isEmpty, used + tall > maxHeight + 0.01 {
        full = true
        break
      }
      lines.append(line)
      used += tall
      at += count
    }
    if full || at >= end {
      while let last = lines.last, last.blank { lines.removeLast() }
    }
    if full {
      // the gaps that would open the next box belong to nobody: step over them here, so `next`
      // points at a word and a box is never begun for line ends alone
      var probe = at
      while probe < end {
        let paragraph = text.paragraphRange(for: NSRange(location: probe, length: 0))
        let rest = KBookRange(probe, paragraph.location + paragraph.length - probe)
        if isBlank(rest) { probe = rest.end } else { break }
        if rest.length == 0 { break }
      }
      at = probe
    }
    return (lines, at)
  }

  /// Every line of the text at `width`.
  func allLines(width: CGFloat) -> [KBookLine] {
    fill(from: 0, width: width, maxHeight: .greatestFiniteMagnitude).lines
  }

  /// The widest of `lines` as drawn, without the spaces a line ends in.
  func width(of lines: [KBookLine]) -> CGFloat {
    lines.reduce(0) { max($0, inkWidth(CTTypesetterCreateLine(typesetter, $1.range.cf))) }
  }

  /// The widest single word (CJK: character run a word breaker calls a word), for fitting a title.
  func widestWord() -> CGFloat {
    var widest: CGFloat = 0
    text.enumerateSubstrings(in: NSRange(location: 0, length: length), options: [.byWords, .substringNotRequired]) { _, range, _, _ in
      let line = CTTypesetterCreateLine(self.typesetter, CFRange(location: range.location, length: range.length))
      widest = max(widest, self.inkWidth(line))
    }
    return widest
  }

  private func inkWidth(_ line: CTLine) -> CGFloat {
    CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil) - CTLineGetTrailingWhitespaceWidth(line))
  }

  /// Draws `lines` into a box whose top-left is (`x`, `top`) and whose width is `width`, in a
  /// context whose y grows downward. `mark` paints a rounded bar behind the part of each line
  /// that lies in the range (the drifted line).
  func draw(
    _ lines: [KBookLine], in context: CGContext, x: CGFloat, top: CGFloat, width: CGFloat,
    align: KBookAlign = .natural, mark: (range: KBookRange, color: CGColor)? = nil
  ) {
    var boxTop = top
    for spec in lines {
      let tall = height(of: spec)
      defer { boxTop += tall }
      if spec.blank { continue }
      let line = CTTypesetterCreateLine(typesetter, spec.range.cf)
      let drawn = inkWidth(line)
      let lineX: CGFloat
      switch align {
      case .natural: lineX = spec.rtl ? x + width - drawn : x
      case .left: lineX = x
      case .right: lineX = x + width - drawn
      }
      // CSS's line box: the font's own height centred in the line height
      let baseline = boxTop + (tall - (ascent + descent)) / 2 + ascent
      if let mark, let held = trimmed(spec.range.clipped(to: mark.range)) {
        let pad = KBookMetrics.u * 0.8
        context.setFillColor(mark.color)
        for bar in bars(of: line, lineRange: spec.range, holding: held) {
          let rect = CGRect(x: lineX + bar.lowerBound - pad, y: baseline - ascent, width: bar.upperBound - bar.lowerBound + pad * 2, height: ascent + descent)
          context.addPath(CGPath(roundedRect: rect, cornerWidth: pad, cornerHeight: pad, transform: nil))
          context.fillPath()
        }
      }
      context.saveGState()
      // glyphs are drawn y-up; the page is y-down
      context.textMatrix = CGAffineTransform(scaleX: 1, y: -1)
      context.textPosition = CGPoint(x: lineX, y: baseline)
      CTLineDraw(line, context)
      context.restoreGState()
    }
  }

  /// A range without the spaces and line ends at its two ends; nil when nothing is left.
  private func trimmed(_ range: KBookRange?) -> KBookRange? {
    guard var range else { return nil }
    let space = CharacterSet.whitespacesAndNewlines
    while range.length > 0, let scalar = UnicodeScalar(text.character(at: range.end - 1)), space.contains(scalar) {
      range.length -= 1
    }
    while range.length > 0, let scalar = UnicodeScalar(text.character(at: range.location)), space.contains(scalar) {
      range.location += 1
      range.length -= 1
    }
    return range.length > 0 ? range : nil
  }

  /// The x spans (from the line's origin) of the part of `line` inside `held`, one per stretch of
  /// neighbouring glyph runs, so a highlight in mixed-direction text covers exactly its letters.
  private func bars(of line: CTLine, lineRange: KBookRange, holding held: KBookRange) -> [ClosedRange<CGFloat>] {
    guard let runs = CTLineGetGlyphRuns(line) as? [CTRun] else { return [] }
    var spans: [ClosedRange<CGFloat>] = []
    for run in runs {
      let glyphs = CTRunGetGlyphCount(run)
      guard glyphs > 0 else { continue }
      let runCF = CTRunGetStringRange(run)
      let runRange = KBookRange(runCF.location, runCF.length)
      guard let part = runRange.clipped(to: held) else { continue }
      var origin = CGPoint.zero
      CTRunGetPositions(run, CFRange(location: 0, length: 1), &origin)
      let runWidth = CGFloat(CTRunGetTypographicBounds(run, CFRange(location: 0, length: 0), nil, nil, nil))
      let runLeft = origin.x
      let runRight = origin.x + runWidth
      let backwards = CTRunGetStatus(run).contains(.rightToLeft)
      // the edge of the run where its text starts, and where it ends
      let startEdge = backwards ? runRight : runLeft
      let endEdge = backwards ? runLeft : runRight
      let from = part.location == runRange.location ? startEdge : CGFloat(CTLineGetOffsetForStringIndex(line, part.location, nil))
      let to = part.end == runRange.end ? endEdge : CGFloat(CTLineGetOffsetForStringIndex(line, part.end, nil))
      let low = min(from, to)
      let high = max(from, to)
      if high > low { spans.append(low...high) }
    }
    spans.sort { $0.lowerBound < $1.lowerBound }
    var merged: [ClosedRange<CGFloat>] = []
    for span in spans {
      if let last = merged.last, span.lowerBound <= last.upperBound + 0.5 {
        merged[merged.count - 1] = last.lowerBound...max(last.upperBound, span.upperBound)
      } else {
        merged.append(span)
      }
    }
    return merged
  }
}

extension KBookSetter {
  /// A title, a numeral or a one-line label made to fit: the style is stepped down (never below
  /// `floor` of its size) until no word is wider than `width`, there are at most `maxLines`
  /// lines and they fit in `maxHeight`. Returns the setter at the size that fits (or at the
  /// floor, where the text wraps as any other does: nothing is cut) and its lines.
  static func fitted(
    _ string: String, style: KBookTextStyle, color: CGColor, width: CGFloat,
    maxHeight: CGFloat = .greatestFiniteMagnitude, maxLines: Int = .max, floor: CGFloat = 0.4
  ) -> (setter: KBookSetter, lines: [KBookLine]) {
    var size = style.size
    let least = style.size * floor
    while true {
      let setter = KBookSetter(string, style: style.sized(size), color: color)
      let lines = setter.allLines(width: width)
      let fits = setter.widestWord() <= width + 0.5 && lines.count <= maxLines && setter.height(of: lines) <= maxHeight + 0.5
      if fits || size <= least { return (setter, lines) }
      size = max(least, size * 0.94)
    }
  }
}
