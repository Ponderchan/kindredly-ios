// Portable: this file imports SwiftUI (for KLetterFace's module), CoreText and ImageIO only, so the
// 1.1.0 pure-Swift app can take it as is.

import SwiftUI
import CoreText
import ImageIO

/*
 KBookRenderer: FROM THE MODEL TO PRINTED PAGES, AND TO THE PDF (journal book, 2026-11-10).

   let pages = KBookRenderer.pages(book: book)          // every printed page, in order
   KBookPageView(page: pages[0], inkSaver: false)       // one of them, at any width (KBookPageView.swift)
   let url = try await KBookRenderer.pdf(book: book, inkSaver: false)   // Caches/<fileStem>.pdf

 pages(book:) FLATTENS AND PAGINATES. The model has one page per journal entry; print has as many
 as the entry needs. Each KBookRenderedPage knows:
   - index (0-based) and number (index + 1, what a continuation page prints in its corner);
   - kind: cover, year, month, monthEnd, entry (an entry's first page), continuation, back;
   - source and sourceIndex: the model page it came from, and where that sits in book.pages;
   - text: the slice of the entry's body printed on this page ("" for the other kinds);
   - spoken: everything on the page as one string, for VoiceOver;
   - letterFace: the Letter font its lines were measured in.
 It is a value (Equatable, Sendable): keep the list in state, hand single pages to KBookPageView.
 The PDF is drawn from this same list, by the same painter, on the same 420 × 595 page, so the
 preview and the PDF cannot disagree about what is on which page.

 It is safe to call from any thread and it is synchronous. It is quick for a month; for a whole
 year it reads the header of every photo (to know which ones exist, see PHOTOS), so call
 pagesOffMain(book:) from a screen rather than block a frame.

 HOW AN ENTRY IS PAGINATED (CONTRACT.md "Layout rules Swift owns"). The body is cleaned first
 (line ends made "\n", three or more in a row made two, spaces and line ends trimmed at both
 ends), then:
   1. if all of it fits the template's big sans block, that is the page: a SHORT entry;
   2. else, if all of it fits one page in the reader's Letter font, that is the page: a LONG
      entry of one page (the smaller numeral, the text higher up);
   3. else the first page takes what fits above "CONTINUES →" and the rest flows onto
      continuation pages (white, the mood's band at the leading edge, contLabel on top, the page
      number in the corner) until it is all placed.
 Lines are broken by CoreText at the page's real fonts and widths (KBookText.swift), a page
 always takes at least one line, a paragraph gap never opens a page, and a last page is never
 left with a single line when the page before can spare one. A photo, voice or film page follows
 the same three steps with its own caption block, so a long caption flows the same way.
 THE DRIFTED LINE: where `drift` is still found in the body, that range is highlighted on
 whichever pages hold it. Its label ("THIS LINE DRIFTED OUT", with Wren's picture when the model
 has one) sits at the foot of the entry's LAST page, which keeps room for it: the mock's row (her
 picture 8u), or a lower one (5u) when the words fit beside that and would otherwise spill a line
 or two onto a page of their own (under two photos or more the row is always the low one). When
 `drift` is no longer in the body nothing is highlighted and the label still prints (a line did
 go out).

 PHOTOS. A page's layout depends on how many of its photos can be read, so pages(book:) looks at
 each uri once (ImageIO, the header only: does the file exist, is it an image, how wide and
 tall): a uri that can't be read is left out and the layout is chosen from the rest (1 full
 bleed; 2 side by side when both are upright, else stacked; 3–4 one large and a strip; 5–9 a
 grid), down to a plain text page when none is left. Only files are read: an http uri is not a
 photo on this phone and is left out. A uri "lab:<n>" is the lab's stand-in: no file, drawn as a
 tinted block.

 pdf(book:inkSaver:) WRITES Caches/<fileStem>.pdf (replacing an older one) AND RETURNS ITS URL.
   - A5, 420 × 595 points, vector: every word is drawn with CoreText into the PDF context, so
     text is text (selectable, searchable, sharp at any zoom). The route NOT taken is SwiftUI's
     ImageRenderer: the lines are already broken by CoreText (they must be, to paginate), drawing
     them with the same engine is what keeps a page's words on that page, and it needs no main
     actor.
   - Off the main thread from start to finish, one page at a time in its own autorelease pool: a
     page's photos are read, drawn and let go before the next page starts. Each photo is made
     no larger than it prints (ImageIO thumbnail at 2 pixels per point, about 150 dpi on A5) and
     stored as JPEG, so ten photo pages stay near a megabyte.
   - Cancellable: cancel the task that awaits it and it stops at the next page, deletes the
     half-written file and throws CancellationError. The file is written beside its final name
     and moved into place at the end, so a reader never shares half a book.
   - `progress` (optional) is called after each page with (pages done, pages in all), on the
     writing thread.
 */

/// A photo that can be read: its uri and its shape.
struct KBookPhoto: Equatable, Sendable {
  let uri: String
  /// width over height as it is seen (rotation applied); 0 when unknown (the lab's stand-ins)
  let aspect: CGFloat
}

/// What the whole book knows that a single model page doesn't.
struct KBookShared: Equatable, Sendable {
  /// mood id → its colour, from every entry and calendar day (the cover's faces and the month's
  /// stats carry ids only)
  var palette: [String: String] = [:]
  /// Wren's picture, from the back cover: the drifted line's small mark uses it too
  var wren = ""
  /// the book reads right to left (its cover title does): page furniture is mirrored
  var rtl = false

  init() {}

  init(_ book: KBook) {
    for page in book.pages {
      switch page {
      case let .entry(entry):
        if let mood = entry.mood, !mood.id.isEmpty, palette[mood.id] == nil { palette[mood.id] = mood.color }
      case let .month(month):
        for day in month.days where !day.mood.isEmpty && !day.color.isEmpty && palette[day.mood] == nil {
          palette[day.mood] = day.color
        }
      case let .back(back):
        if wren.isEmpty { wren = back.wren }
      case let .cover(cover):
        rtl = KBookSetter.readsRightToLeft(cover.title)
      case .year, .monthEnd:
        break
      }
    }
  }
}

/// Which template an entry's first page uses.
enum KBookForm: String, Equatable, Sendable {
  case text, voice, photoOne, photoFew, photoGrid
}

/// What the foot of a text block must leave room for.
enum KBookFoot: Equatable, Sendable {
  /// nothing: the block runs to the page's bottom margin
  case plain
  /// the drifted line's label, with Wren's picture at the mock's 8u
  case drift
  /// the same label in a lower row (her picture at 5u): what a page falls back to when the words
  /// fit beside it this way and would otherwise spill a line or two onto a page of their own
  case driftTight
  /// "CONTINUES →"
  case continues

  /// How tall the drifted line's row is: Wren's picture is this wide and this tall at most.
  static func driftRow(tight: Bool) -> CGFloat {
    (tight ? 5 : 8) * KBookMetrics.u
  }
}

/// One printed page of an entry: which lines of the body it holds and what stands around them.
struct KBookEntryLayout: Equatable, Sendable {
  var form: KBookForm
  /// the entry's first page (its template) or a continuation page
  var first: Bool
  /// the cleaned body, whole: lines are ranges of it
  var body: String
  var lines: [KBookLine]
  /// the body is set in the Letter font (a long entry) rather than the big sans
  var letter: Bool
  /// more of this entry follows on the next page
  var continues: Bool
  /// where the drifted line sits in `body`; nil when there is none or it is no longer found
  var driftRange: KBookRange?
  /// this page prints the drifted line's label at its foot
  var driftLabel: Bool
  /// that label sits in the lower row (KBookFoot.driftTight)
  var tightFoot = false
  /// the photos that can be read, at most nine, cover first
  var photos: [KBookPhoto]

  /// The foot this page's lines were measured against; the painter asks for the same slot.
  var foot: KBookFoot {
    if continues { return first ? .continues : .plain }
    if driftLabel { return tightFoot ? .driftTight : .drift }
    return .plain
  }

  /// Whether the drifted line's row is the low one: by fallback, or because the page is one
  /// whose caption shares its foot with the photos' numeral.
  var driftRowIsTight: Bool {
    tightFoot || (first && (form == .photoFew || form == .photoGrid))
  }
}

/// A box of body text on the 420-point page.
struct KBookSlot {
  /// from the page's leading edge
  var lead: CGFloat
  var width: CGFloat
  var top: CGFloat
  var bottom: CGFloat
  /// the block hangs from `bottom` (a caption) instead of standing on `top`
  var fromBottom: Bool

  var height: CGFloat { max(0, bottom - top) }
}

/// The templates' numbers that pagination and painting must agree on. `u` is 1% of the page
/// width (the mock's cqw); the values are zine.css's.
enum KBookGeometry {
  static let u = KBookMetrics.u
  static let width = KBookMetrics.width
  static let height = KBookMetrics.height
  /// photos take the top 71% of a page with two photos or more
  static let photoZone = KBookMetrics.height * 0.71

  /// the big sans of a template's own text block (.ztext and its sizes)
  static func sans(_ form: KBookForm) -> KBookTextStyle {
    let size: CGFloat
    switch form {
    case .text: size = 7.4
    case .voice, .photoOne: size = 6.2
    case .photoFew, .photoGrid: size = 5.4
    }
    return KBookTextStyle(face: .semibold, size: size * u, tracking: -0.01, lineHeight: 1.22)
  }

  /// a long entry's text (.zserif), in the reader's Letter font
  static func letter(_ face: KLetterFace) -> KBookTextStyle {
    KBookTextStyle(face: .letter(face), size: 5.3 * u, tracking: 0, lineHeight: 1.46)
  }

  static func style(form: KBookForm, letter isLetter: Bool, face: KLetterFace) -> KBookTextStyle {
    isLetter ? letter(face) : sans(form)
  }

  /// how far above the page's bottom edge a text block must stop
  static func footInset(_ foot: KBookFoot, form: KBookForm) -> CGFloat {
    switch foot {
    case .plain: return (form == .photoOne ? 9 : 8) * u
    // the label's row is 8u tall and stands 8u above the edge; 3u of air over it. Under two
    // photos or more the caption has little room, so the row there is always the low one
    case .drift: return (form == .photoFew || form == .photoGrid ? 15 : 19) * u
    // the low row is 5u tall and stands 8u above the edge; 2u of air over it
    case .driftTight: return 15 * u
    // the label's line box is 5u tall and stands 7u above the edge; 2.5u of air over it
    case .continues: return 14.5 * u
    }
  }

  /// the text block of an entry's first page
  static func firstSlot(form: KBookForm, letter isLetter: Bool, foot: KBookFoot, face: KLetterFace) -> KBookSlot {
    let bottom = height - footInset(foot, form: form)
    switch form {
    case .text:
      return KBookSlot(lead: 8 * u, width: 84 * u, top: (isLetter ? 47 : 61) * u, bottom: bottom, fromBottom: false)
    case .voice:
      return KBookSlot(lead: 8 * u, width: 84 * u, top: 88 * u, bottom: bottom, fromBottom: false)
    case .photoOne:
      // over the photo: at most five lines of the sans, four of the Letter font, hung from the foot
      let line = style(form: form, letter: isLetter, face: face).line
      return KBookSlot(lead: 8 * u, width: 84 * u, top: bottom - line * (isLetter ? 4 : 5) - 0.5, bottom: bottom, fromBottom: true)
    case .photoFew, .photoGrid:
      return KBookSlot(lead: 8 * u, width: 58 * u, top: photoZone + 3 * u, bottom: bottom, fromBottom: true)
    }
  }

  /// the text block of a continuation page (.z-cont: padding 19 8 0 12)
  static func continuationSlot(foot: KBookFoot) -> KBookSlot {
    // the page number's line box is 5u tall and stands 6u above the edge; 3u of air over it
    let inset: CGFloat
    switch foot {
    case .drift: inset = 19 * u
    case .driftTight: inset = 15 * u
    case .plain, .continues: inset = 14 * u
    }
    return KBookSlot(lead: 12 * u, width: 80 * u, top: 19 * u, bottom: height - inset, fromBottom: false)
  }

  /// Where each photo is drawn, cover first, for a page read left to right.
  static func photoCells(_ photos: [KBookPhoto]) -> [CGRect] {
    let gap = 0.6 * u
    switch photos.count {
    case 0:
      return []
    case 1:
      return [CGRect(x: 0, y: 0, width: width, height: height)]
    case 2:
      // two upright photos stand side by side; anything else is stacked, so neither becomes a sliver
      let upright = photos.allSatisfy { $0.aspect > 0 && $0.aspect < 0.95 }
      if upright {
        let w = (width - gap) / 2
        return [CGRect(x: 0, y: 0, width: w, height: photoZone), CGRect(x: w + gap, y: 0, width: w, height: photoZone)]
      }
      let h = (photoZone - gap) / 2
      return [CGRect(x: 0, y: 0, width: width, height: h), CGRect(x: 0, y: h + gap, width: width, height: h)]
    case 3, 4:
      // .bleed 58% and .strip 13%
      let large = height * 0.58
      let strip = photoZone - large
      let n = CGFloat(photos.count - 1)
      var cells = [CGRect(x: 0, y: 0, width: width, height: large)]
      for i in 0..<(photos.count - 1) {
        cells.append(CGRect(x: width / n * CGFloat(i), y: large, width: width / n, height: strip))
      }
      return cells
    default:
      // .nine: rows of two or three, the grid's 0.6u gaps
      let rows: [Int]
      switch min(photos.count, 9) {
      case 5: rows = [2, 3]
      case 6: rows = [3, 3]
      case 7: rows = [2, 2, 3]
      case 8: rows = [3, 2, 3]
      default: rows = [3, 3, 3]
      }
      let rowHeight = (photoZone - gap * CGFloat(rows.count - 1)) / CGFloat(rows.count)
      var cells: [CGRect] = []
      for (r, count) in rows.enumerated() {
        let w = (width - gap * CGFloat(count - 1)) / CGFloat(count)
        for i in 0..<count {
          cells.append(CGRect(x: (w + gap) * CGFloat(i), y: (rowHeight + gap) * CGFloat(r), width: w, height: rowHeight))
        }
      }
      return cells
    }
  }

  /// A voice or film page's 24 bars, each a part of the wave's height (0.22…0.92). Drawn from the
  /// entry's id, so a page's wave is the same every time it is drawn and in every export; an
  /// entry without an id gets the mock's own.
  static func wave(for id: String) -> [CGFloat] {
    let mock: [CGFloat] = [22, 40, 58, 34, 70, 86, 52, 30, 64, 92, 74, 46, 28, 60, 80, 44, 36, 68, 50, 26, 42, 72, 56, 32]
    guard !id.isEmpty else { return mock.map { $0 / 100 } }
    // FNV-1a over the id, then xorshift: plain arithmetic, the same on every device
    var state: UInt64 = 0xCBF2_9CE4_8422_2325
    for byte in id.utf8 {
      state ^= UInt64(byte)
      state = state &* 0x0000_0100_0000_01B3
    }
    if state == 0 { state = 0x9E37_79B9_7F4A_7C15 }
    func next() -> CGFloat {
      state ^= state << 13
      state ^= state >> 7
      state ^= state << 17
      return CGFloat(state % 10_000) / 10_000
    }
    var bars: [CGFloat] = []
    var level = 0.3 + next() * 0.4
    for _ in 0..<24 {
      // a voice rises and falls: each bar leans on the one before it
      level = min(1, max(0, level * 0.3 + next() * 0.8))
      bars.append(0.22 + 0.70 * level)
    }
    return bars
  }
}

/// One printed page. See the top of this file.
public struct KBookRenderedPage: Identifiable, Equatable, Sendable {
  public enum Kind: String, Equatable, Sendable {
    case cover, year, month, monthEnd
    /// an entry's first page
    case entry
    /// an entry's second and later pages
    case continuation
    case back
  }

  /// 0-based position in the printed book
  public let index: Int
  public let kind: Kind
  /// the model page this was made from
  public let source: KBookPage
  /// that page's position in `book.pages`
  public let sourceIndex: Int
  /// the slice of the entry's body printed on this page; "" for a page that isn't an entry's
  public let text: String
  /// the Letter font the page's lines were measured in, and are drawn in
  public let letterFace: KLetterFace

  /// an entry's page: its lines and what stands around them; nil for the other kinds
  let entry: KBookEntryLayout?
  let shared: KBookShared

  public var id: Int { index }
  /// the printed page number: 1 for the cover
  public var number: Int { index + 1 }
  /// more of the same entry follows on the next page
  public var continues: Bool { entry?.continues ?? false }

  /// Every word on the page, top to bottom, for VoiceOver.
  public var spoken: String {
    var parts: [String] = []
    switch source {
    case let .cover(cover):
      parts = [cover.top, cover.title, cover.by, cover.foot]
    case let .year(year):
      parts = [year.year, year.lead, year.foot]
    case let .month(month):
      parts = [month.label, month.foot]
    case let .monthEnd(end):
      parts = [end.top] + end.stats.map { "\($0.value) \($0.label)" } + [end.foot]
    case let .entry(model):
      if kind == .continuation {
        parts = [model.contLabel, text, String(number)]
      } else {
        parts = [model.day, model.dateLine, model.mood?.name ?? ""]
        switch model.media {
        case let .voice(label), let .video(label): parts.append(label)
        case .none, .photos: break
        }
        parts.append(text)
      }
      if entry?.driftLabel == true { parts.append(model.driftLabel) }
      if continues { parts.append(model.continues) }
    case let .back(back):
      parts = back.lines + [back.foot]
    }
    return parts.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.joined(separator: ". ")
  }

  /// The pictures this page draws and the size each is drawn at on the 420-point page: what a
  /// loader has to bring (KBookPageView for the preview, the PDF writer for the file).
  var imageRequests: [(uri: String, size: CGSize)] {
    var out: [(uri: String, size: CGSize)] = []
    let u = KBookMetrics.u
    if let entry {
      if entry.first {
        for (photo, cell) in zip(entry.photos, KBookGeometry.photoCells(entry.photos)) where !KBookImages.isLab(photo.uri) {
          out.append((photo.uri, cell.size))
        }
      }
      if entry.driftLabel, !shared.wren.isEmpty {
        out.append((shared.wren, CGSize(width: 8 * u, height: 8 * u)))
      }
    }
    if case let .back(back) = source, !back.wren.isEmpty {
      out.append((back.wren, CGSize(width: 28 * u, height: 34 * u)))
    }
    return out
  }
}

public enum KBookRenderer {
  // MARK: Pages

  /// Every printed page of the book, in order, paginated. See the top of this file.
  public static func pages(book: KBook) -> [KBookRenderedPage] {
    let face = KLetterFace(key: book.letterFont)
    let shared = KBookShared(book)
    var out: [KBookRenderedPage] = []
    for (sourceIndex, page) in book.pages.enumerated() {
      guard case let .entry(model) = page else {
        let kind: KBookRenderedPage.Kind
        switch page {
        case .cover: kind = .cover
        case .year: kind = .year
        case .month: kind = .month
        case .monthEnd: kind = .monthEnd
        case .back: kind = .back
        case .entry: kind = .entry
        }
        out.append(KBookRenderedPage(
          index: out.count, kind: kind, source: page, sourceIndex: sourceIndex, text: "", letterFace: face, entry: nil, shared: shared
        ))
        continue
      }
      var photos: [KBookPhoto] = []
      if case let .photos(uris) = model.media {
        for uri in uris {
          if photos.count == 9 { break }
          if let photo = KBookImages.probe(uri) { photos.append(photo) }
        }
      }
      for layout in layouts(for: model, photos: photos, face: face) {
        out.append(KBookRenderedPage(
          index: out.count, kind: layout.first ? .entry : .continuation, source: page, sourceIndex: sourceIndex,
          text: slice(of: layout), letterFace: face, entry: layout, shared: shared
        ))
      }
    }
    return out
  }

  /// pages(book:) on a background thread, for a screen: a year of pages reads every photo's
  /// header, which is too much for one frame.
  public static func pagesOffMain(book: KBook) async -> [KBookRenderedPage] {
    await Task.detached(priority: .userInitiated) { pages(book: book) }.value
  }

  /// The body as it is printed: line ends made "\n", runs of blank lines made one, both ends
  /// trimmed. The drifted line is cleaned the same way before it is looked for.
  static func clean(_ text: String) -> String {
    var out = text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
    while out.contains("\n\n\n") { out = out.replacingOccurrences(of: "\n\n\n", with: "\n\n") }
    return out.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  /// The words a page holds: from its first line's first character to its last line's last.
  private static func slice(of layout: KBookEntryLayout) -> String {
    guard let first = layout.lines.first, let last = layout.lines.last else { return "" }
    let range = NSRange(location: first.range.location, length: last.range.end - first.range.location)
    return (layout.body as NSString).substring(with: range).trimmingCharacters(in: .whitespacesAndNewlines)
  }

  /// An entry's printed pages: one, or as many as its words need. See the top of this file.
  static func layouts(for model: KBookEntry, photos: [KBookPhoto], face: KLetterFace) -> [KBookEntryLayout] {
    let body = clean(model.body)
    let drift = clean(model.drift)
    var driftRange: KBookRange?
    if !drift.isEmpty {
      let found = (body as NSString).range(of: drift)
      if found.location != NSNotFound { driftRange = KBookRange(found.location, found.length) }
    }
    let labelled = !drift.isEmpty && !model.driftLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

    let form: KBookForm
    switch model.media {
    case .voice, .video: form = .voice
    case .photos:
      switch photos.count {
      case 0: form = .text
      case 1: form = .photoOne
      case 2...4: form = .photoFew
      default: form = .photoGrid
      }
    case .none: form = .text
    }

    var page = KBookEntryLayout(
      form: form, first: true, body: body, lines: [], letter: false, continues: false,
      driftRange: driftRange, driftLabel: labelled, photos: form == .text || form == .voice ? [] : photos
    )
    guard !body.isEmpty else { return [page] }
    // the feet an entry's last page may have: the label's own row first, then the low one
    let lastFeet: [KBookFoot] = labelled ? [.drift, .driftTight] : [.plain]

    // 1. short: all of it in the template's big sans
    let sans = KBookSetter(body, style: KBookGeometry.sans(form), color: KBookColor.ink)
    for foot in lastFeet {
      let slot = KBookGeometry.firstSlot(form: form, letter: false, foot: foot, face: face)
      let filled = sans.fill(from: 0, width: slot.width, maxHeight: slot.height)
      if filled.next >= sans.length {
        page.lines = filled.lines
        page.tightFoot = foot == .driftTight
        return [page]
      }
    }

    // 2. long, one page: all of it in the Letter font
    let setter = KBookSetter(body, style: KBookGeometry.letter(face), color: KBookColor.ink)
    page.letter = true
    var single: (lines: [KBookLine], next: Int) = ([], 0)
    for foot in lastFeet {
      let slot = KBookGeometry.firstSlot(form: form, letter: true, foot: foot, face: face)
      single = setter.fill(from: 0, width: slot.width, maxHeight: slot.height)
      if single.next >= setter.length {
        page.lines = single.lines
        page.tightFoot = foot == .driftTight
        return [page]
      }
    }

    // 3. it flows: the first page above "CONTINUES →", then continuation pages
    let firstSlot = KBookGeometry.firstSlot(form: form, letter: true, foot: .continues, face: face)
    var first = setter.fill(from: 0, width: firstSlot.width, maxHeight: firstSlot.height)
    if first.next >= setter.length {
      // it fits above CONTINUES but not above the drifted line's label: keep what fits above the
      // label here, so there is something left to carry the label onto a last page
      first = single
    }
    page.lines = first.lines
    page.continues = true
    page.driftLabel = false
    var pages = [page]
    var next = first.next
    let middleSlot = KBookGeometry.continuationSlot(foot: .plain)
    var turns = 0
    pagesLoop: while next < setter.length, turns < 5000 {
      turns += 1
      var more = page
      more.first = false
      more.photos = []
      var shortest: (lines: [KBookLine], next: Int) = ([], next)
      for foot in lastFeet {
        let slot = KBookGeometry.continuationSlot(foot: foot)
        let last = setter.fill(from: next, width: slot.width, maxHeight: slot.height)
        if last.next >= setter.length {
          // nothing but line ends was left (fill steps over them, so this shouldn't happen): no
          // empty page for them
          if last.lines.isEmpty {
            next = setter.length
            break pagesLoop
          }
          more.lines = last.lines
          more.continues = false
          more.driftLabel = labelled
          more.tightFoot = foot == .driftTight
          pages.append(more)
          next = setter.length
          break pagesLoop
        }
        if foot == lastFeet.first { shortest = last }
      }
      var middle = setter.fill(from: next, width: middleSlot.width, maxHeight: middleSlot.height)
      // the rest fits a plain page but not one with the label: same answer as on the first page
      if middle.next >= setter.length { middle = shortest }
      more.lines = middle.lines
      more.continues = true
      more.driftLabel = false
      pages.append(more)
      next = middle.next
    }
    // whatever ended the loop, the last page printed is the last: it must not say "continues"
    if pages[pages.count - 1].continues {
      pages[pages.count - 1].continues = false
    }

    // never a last page of one line when the page before can spare one
    if pages.count >= 2, pages[pages.count - 1].lines.count == 1 {
      var before = pages[pages.count - 2]
      if before.lines.filter({ !$0.blank }).count >= 4, let moved = before.lines.last, !moved.blank {
        before.lines.removeLast()
        while let tail = before.lines.last, tail.blank { before.lines.removeLast() }
        let slot = KBookGeometry.continuationSlot(foot: pages[pages.count - 1].foot)
        let refilled = setter.fill(from: moved.range.location, width: slot.width, maxHeight: slot.height)
        if refilled.next >= setter.length {
          pages[pages.count - 2] = before
          pages[pages.count - 1].lines = refilled.lines
        }
      }
    }
    return pages
  }

  // MARK: PDF

  /// Writes the book as Caches/<fileStem>.pdf and returns its URL. See the top of this file.
  /// - Parameters:
  ///   - inkSaver: every ground white; colour stays in the numerals, the calendar squares, the
  ///     bands and the faces
  ///   - progress: called after each page with (pages done, pages in all), on the writing thread
  public static func pdf(
    book: KBook, inkSaver: Bool, progress: (@Sendable (_ done: Int, _ total: Int) -> Void)? = nil
  ) async throws -> URL {
    let work = Task.detached(priority: .userInitiated) { () throws -> URL in
      try write(book: book, inkSaver: inkSaver, directory: nil, progress: progress)
    }
    return try await withTaskCancellationHandler {
      try await work.value
    } onCancel: {
      work.cancel()
    }
  }

  /// The writing itself, on the calling thread. `directory` nil is the Caches folder.
  static func write(
    book: KBook, inkSaver: Bool, directory: URL?, progress: (@Sendable (_ done: Int, _ total: Int) -> Void)? = nil
  ) throws -> URL {
    let printed = pages(book: book)
    guard !printed.isEmpty else { throw KBookError.notABook("it has no pages") }
    let files = FileManager.default
    let folder = directory ?? files.urls(for: .cachesDirectory, in: .userDomainMask).first ?? files.temporaryDirectory
    do {
      try files.createDirectory(at: folder, withIntermediateDirectories: true)
    } catch {
      throw KBookError.cannotWrite("the folder can't be made (\(error.localizedDescription))")
    }
    let stem = book.safeFileStem
    let final = folder.appendingPathComponent(stem + ".pdf")
    let part = folder.appendingPathComponent(".\(stem)-\(UUID().uuidString.prefix(8)).pdf.part")

    var box = CGRect(x: 0, y: 0, width: KBookMetrics.width, height: KBookMetrics.height)
    let info: [CFString: Any] = [kCGPDFContextTitle: stem, kCGPDFContextCreator: "Kindredly"]
    guard let context = CGContext(part as CFURL, mediaBox: &box, info as CFDictionary) else {
      throw KBookError.cannotWrite("the file can't be opened")
    }
    let images = KBookFileImages()
    for (done, page) in printed.enumerated() {
      if Task.isCancelled {
        context.closePDF()
        try? files.removeItem(at: part)
        throw CancellationError()
      }
      autoreleasepool {
        context.beginPDFPage(nil)
        // a PDF page's y grows upward; the painter's grows downward, like the screen's
        context.translateBy(x: 0, y: KBookMetrics.height)
        context.scaleBy(x: 1, y: -1)
        KBookPainter(context: context, inkSaver: inkSaver, image: images.image).draw(page)
        context.endPDFPage()
      }
      progress?(done + 1, printed.count)
    }
    context.closePDF()

    do {
      if files.fileExists(atPath: final.path) {
        _ = try files.replaceItemAt(final, withItemAt: part)
      } else {
        try files.moveItem(at: part, to: final)
      }
    } catch {
      try? files.removeItem(at: part)
      throw KBookError.cannotWrite("the file can't be put in place (\(error.localizedDescription))")
    }
    return final
  }
}

// MARK: - Pictures

/// Reading the book's pictures from files, never larger than they are drawn.
enum KBookImages {
  /// The lab's stand-in for a photo: no file, a tinted block ("lab:1", "lab:2"…).
  static func isLab(_ uri: String) -> Bool {
    uri.hasPrefix("lab:")
  }

  /// A file on this phone: a file:// uri or a bare absolute path. Anything else (http above all:
  /// the journal never leaves the phone, and neither does the book reach out) is nil.
  static func fileURL(_ uri: String) -> URL? {
    let trimmed = uri.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.hasPrefix("/") { return URL(fileURLWithPath: trimmed) }
    guard let url = URL(string: trimmed), url.isFileURL else { return nil }
    return url
  }

  /// The picture's size as it is seen (rotation applied), from the file's header; nil when the
  /// file is missing or is not a picture.
  private static func pixelSize(_ source: CGImageSource) -> CGSize? {
    guard CGImageSourceGetCount(source) > 0,
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let width = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.doubleValue,
          let height = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.doubleValue,
          width > 0, height > 0
    else { return nil }
    let orientation = (properties[kCGImagePropertyOrientation] as? NSNumber)?.intValue ?? 1
    // 5…8 are the sideways ones
    return orientation >= 5 ? CGSize(width: height, height: width) : CGSize(width: width, height: height)
  }

  private static func source(_ uri: String) -> CGImageSource? {
    guard let url = fileURL(uri) else { return nil }
    return CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary)
  }

  /// Whether a photo can be read, and its shape. The header only: nothing is decoded.
  static func probe(_ uri: String) -> KBookPhoto? {
    if isLab(uri) {
      // the stand-ins take turns at being upright and lying down, so both layouts of two show
      let n = Int(uri.dropFirst(4)) ?? 0
      return KBookPhoto(uri: uri, aspect: n % 2 == 1 ? 0.75 : 1.33)
    }
    guard let source = source(uri), let size = pixelSize(source) else { return nil }
    return KBookPhoto(uri: uri, aspect: size.width / size.height)
  }

  /// The picture decoded just large enough to cover `points` at `scale` pixels per point, turned
  /// upright. Never the full-size picture: ImageIO makes the small one straight from the file.
  static func thumbnail(_ uri: String, covering points: CGSize, scale: CGFloat) -> CGImage? {
    guard let source = source(uri) else { return nil }
    let needWidth = max(1, points.width * scale)
    let needHeight = max(1, points.height * scale)
    var longest = max(needWidth, needHeight) * 1.5
    if let size = pixelSize(source) {
      let cover = max(needWidth / size.width, needHeight / size.height)
      longest = max(size.width, size.height) * min(cover, 1)
    }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: max(16, Int(longest.rounded(.up))),
      kCGImageSourceShouldCacheImmediately: true,
    ]
    return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
  }

  /// The same picture held as JPEG data, so a PDF stores the JPEG (tens of kilobytes) instead of
  /// raw pixels. A picture with see-through parts (Wren) is returned as it is.
  ///
  /// The quality is 0.68; a picture so busy that it still takes more than about a quarter of a
  /// byte per pixel (grass, gravel, confetti) is stored once more at 0.45, so one page can't make
  /// the file several times the size the others do.
  static func jpegBacked(_ image: CGImage) -> CGImage {
    switch image.alphaInfo {
    case .none, .noneSkipFirst, .noneSkipLast: break
    default: return image
    }
    func encoded(_ quality: CGFloat) -> NSMutableData? {
      let data = NSMutableData()
      guard let destination = CGImageDestinationCreateWithData(data, "public.jpeg" as CFString, 1, nil) else { return nil }
      CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
      return CGImageDestinationFinalize(destination) ? data : nil
    }
    guard var data = encoded(0.68) else { return image }
    if Double(data.length) > Double(image.width * image.height) * 0.24, let smaller = encoded(0.45) { data = smaller }
    guard let provider = CGDataProvider(data: data),
          let jpeg = CGImage(jpegDataProviderSource: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)
    else { return image }
    return jpeg
  }
}

/// The PDF writer's pictures: read from the file when a page asks, at print size. Photos are not
/// kept (a year of them must never be in memory at once); the small ones (Wren's mark, drawn on
/// many pages) are, so the file stores each once.
final class KBookFileImages {
  /// pixels per point in the PDF: about 150 dpi on A5 paper
  static let scale: CGFloat = 2
  private var small: [String: CGImage] = [:]

  func image(_ uri: String, _ size: CGSize) -> CGImage? {
    let most = 40 * KBookMetrics.u
    let isSmall = size.width <= most && size.height <= most
    if isSmall, let kept = small[uri] { return kept }
    // a kept picture is made once at the largest small size, so the copy made for a drifted
    // line's 8u mark is still sharp on the back cover
    let cover = isSmall ? CGSize(width: most, height: most) : size
    guard let made = KBookImages.thumbnail(uri, covering: cover, scale: Self.scale) else { return nil }
    let stored = KBookImages.jpegBacked(made)
    if isSmall { small[uri] = stored }
    return stored
  }
}
