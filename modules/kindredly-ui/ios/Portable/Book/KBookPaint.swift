// Portable: this file imports SwiftUI (for the mood art's paths) and CoreText only, so the 1.1.0
// pure-Swift app can take it as is.

import SwiftUI
import CoreText

/*
 THE BOOK'S PAGES, PAINTED (journal book, 2026-11-10). One painter draws every template of the
 approved design (.claude/journal-book/gen2.py with zine.css and style.css, direction C "Zine")
 into a CoreGraphics context: the phone's preview (KBookPageView, a Canvas) and the PDF
 (KBookRenderer.pdf) both call it, so there is one drawing of each page and not two that could
 drift apart.

 The context it is given has its origin at the page's top-left and y growing downward, and is
 420 × 595 points (a smaller preview scales the context first). Every number below is the CSS's,
 in `u` = 1% of the page width (the mock's cqw): `8 * u` is the CSS's 8cqw.

 THE TEMPLATES:
 - cover: indigo ground, the title in acid green (System heavy, tight), "— pen name" under it
   when there is one, up to five mood faces scattered and tilted, a mono line on top and at the
   foot. With a pen name the faces move down by its height so nothing touches.
 - year: the big year, the lead line, a row of small day squares per month (written = the day's
   colour).
 - month: the huge month label and a seven-column calendar: a written day is filled with its
   mood's colour and carries its face; an empty day is pale; the cells before day 1 are not drawn.
 - monthEnd: ink ground, each stat a huge acid numeral over a white label, a face after the label
   when the stat names a mood.
 - entry, short / long / photos (1, 2–4, 5–9) / voice or film, and continuation pages: see
   KBookRenderer.swift for which is chosen and how the words are divided.
 - back: indigo, Wren's picture when the model has one, the two lines in acid green.

 A PAGE WITHOUT A MOOD is white with ink numerals (and an ink band on its continuation pages).

 INK SAVER: every ground is white. Colour stays in the numerals, the calendar squares, the bands,
 the faces and the drifted line's highlight. The cover's title turns indigo and its small lines
 ink; the month's stats turn indigo with ink labels; the back cover's lines turn indigo. A photo
 is the reader's content, not a ground: a full-bleed photo stays, with its white words.

 THE MOOD FACES are KMoodArt's drawings (Kit/KMoodArtData.swift, the owner's one-colour line
 faces), painted here straight from the same table because a Canvas inside a PDF is not vector.
 A face in the book is the app's mood tile: a rounded square in the mood's colour with the face
 in dark ink on it. On the calendar the day's square is the tile. An id with no drawing gets the
 tile alone.

 WREN is never drawn here: where the model carries her picture's uri it is placed as an image;
 where it doesn't, the label stands alone.

 RIGHT TO LEFT. What someone wrote is set by its own paragraphs' direction (KBookText.swift),
 whatever the book's. The page's furniture (numeral, face, band, labels) is mirrored when the
 book itself reads right to left, which the cover's title decides; none of the app's nine
 languages does today, so that path is there for the day one is added.
 */
struct KBookPainter {
  let context: CGContext
  let inkSaver: Bool
  /// The picture for a uri, covering the size (in points on the 420-point page) it is drawn at;
  /// nil when it isn't there (not loaded yet, or it can't be read): its place is drawn pale.
  let image: (String, CGSize) -> CGImage?

  private var rtl = false
  private var u: CGFloat { KBookMetrics.u }
  private var width: CGFloat { KBookMetrics.width }
  private var height: CGFloat { KBookMetrics.height }

  init(context: CGContext, inkSaver: Bool, image: @escaping (String, CGSize) -> CGImage?) {
    self.context = context
    self.inkSaver = inkSaver
    self.image = image
  }

  /// Draws one page into the context.
  func draw(_ page: KBookRenderedPage) {
    var painter = self
    painter.rtl = page.shared.rtl
    context.saveGState()
    context.clip(to: CGRect(x: 0, y: 0, width: width, height: height))
    painter.fill(CGRect(x: 0, y: 0, width: width, height: height), KBookColor.white)
    switch page.source {
    case let .cover(cover): painter.cover(cover, page.shared)
    case let .year(year): painter.year(year)
    case let .month(month): painter.month(month)
    case let .monthEnd(end): painter.monthEnd(end, page.shared)
    case let .back(back): painter.back(back)
    case let .entry(model):
      if let layout = page.entry {
        if layout.first {
          painter.entry(model, layout, page)
        } else {
          painter.continuation(model, layout, page)
        }
      }
    }
    context.restoreGState()
  }

  // MARK: The small tools

  /// The left edge of a box that starts `lead` from the page's leading edge.
  private func x(_ lead: CGFloat, _ boxWidth: CGFloat) -> CGFloat {
    rtl ? width - lead - boxWidth : lead
  }

  private var leading: KBookAlign { rtl ? .right : .left }
  private var trailing: KBookAlign { rtl ? .left : .right }

  private func fill(_ rect: CGRect, _ color: CGColor, radius: CGFloat = 0) {
    context.setFillColor(color)
    if radius > 0 {
      context.addPath(CGPath(roundedRect: rect, cornerWidth: min(radius, rect.width / 2), cornerHeight: min(radius, rect.height / 2), transform: nil))
      context.fillPath()
    } else {
      context.fill(rect)
    }
  }

  /// The page's ground: the colour given, or white under the ink saver (and for nil).
  private func ground(_ color: CGColor?) {
    guard let color, !inkSaver else { return }
    fill(CGRect(x: 0, y: 0, width: width, height: height), color)
  }

  /// What `set` reports back about the block it drew.
  private struct Block {
    var rect: CGRect = .zero
    /// the widest line as drawn
    var ink: CGFloat = 0
    /// how far descenders reach under `rect`
    var overhang: CGFloat = 0
    var isEmpty: Bool { rect.height <= 0 }
  }

  /// Sets a piece of the page's furniture: `string` in `style`, in a box `boxWidth` wide that
  /// starts `lead` from the leading edge, standing on `top` or hanging from `bottom`. With
  /// `maxLines` or `maxHeight` it is made smaller until it fits (a long word in another
  /// language, a long month name); past the floor it wraps. Nothing is ever cut.
  @discardableResult
  private func set(
    _ string: String, _ style: KBookTextStyle, _ color: CGColor, lead: CGFloat, width boxWidth: CGFloat,
    top: CGFloat? = nil, bottom: CGFloat? = nil, align: KBookAlign? = nil,
    maxLines: Int = .max, maxHeight: CGFloat = .greatestFiniteMagnitude, floor: CGFloat = 0.4
  ) -> Block {
    let string = string.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !string.isEmpty else { return Block() }
    let (setter, lines) = KBookSetter.fitted(string, style: style, color: color, width: boxWidth, maxHeight: maxHeight, maxLines: maxLines, floor: floor)
    let tall = setter.height(of: lines)
    let y = top ?? ((bottom ?? tall) - tall)
    let boxX = x(lead, boxWidth)
    setter.draw(lines, in: context, x: boxX, top: y, width: boxWidth, align: align ?? leading)
    return Block(rect: CGRect(x: boxX, y: y, width: boxWidth, height: tall), ink: setter.width(of: lines), overhang: setter.overhang)
  }

  /// A small mono label (.mono: SF Mono 500, 3.1u, .1em). CSS gives it the page's line height, 1.6.
  @discardableResult
  private func label(
    _ string: String, lead: CGFloat? = nil, width boxWidth: CGFloat? = nil, top: CGFloat? = nil, bottom: CGFloat? = nil,
    color: CGColor = KBookColor.label, size: CGFloat = 3.1, align: KBookAlign? = nil, oneLine: Bool = false
  ) -> Block {
    let style = KBookTextStyle(face: .mono, size: size * u, tracking: 0.1, lineHeight: 1.6)
    return set(
      string, style, color, lead: lead ?? 8 * u, width: boxWidth ?? 84 * u, top: top, bottom: bottom, align: align,
      maxLines: oneLine ? 1 : .max, floor: 0.55
    )
  }

  /// A mood face: the tile (a rounded square in `tile`, when given) and the line face on it.
  private func face(_ id: String, in rect: CGRect, tile: CGColor?, degrees: CGFloat = 0) {
    context.saveGState()
    context.translateBy(x: rect.midX, y: rect.midY)
    if degrees != 0 { context.rotate(by: (rtl ? -degrees : degrees) * .pi / 180) }
    let side = min(rect.width, rect.height)
    let box = CGRect(x: -side / 2, y: -side / 2, width: side, height: side)
    if let tile {
      fill(box, tile, radius: side * 0.3)
      KBookFaces.draw(id, in: context, rect: box.insetBy(dx: side * 0.15, dy: side * 0.15), ink: KBookColor.faceInk)
    } else {
      KBookFaces.draw(id, in: context, rect: box, ink: KBookColor.faceInk)
    }
    context.restoreGState()
  }

  /// A picture in a rectangle: covering it and cropped (a photo), or whole inside it against its
  /// leading top corner (Wren). Returns the rectangle the picture took.
  @discardableResult
  private func picture(_ cgImage: CGImage, in rect: CGRect, cover: Bool) -> CGRect {
    let w = CGFloat(cgImage.width)
    let h = CGFloat(cgImage.height)
    guard w > 0, h > 0, rect.width > 0, rect.height > 0 else { return .zero }
    let scale = cover ? max(rect.width / w, rect.height / h) : min(rect.width / w, rect.height / h)
    let size = CGSize(width: w * scale, height: h * scale)
    let drawn: CGRect
    if cover {
      drawn = CGRect(x: rect.midX - size.width / 2, y: rect.midY - size.height / 2, width: size.width, height: size.height)
    } else {
      drawn = CGRect(x: rtl ? rect.maxX - size.width : rect.minX, y: rect.minY, width: size.width, height: size.height)
    }
    context.saveGState()
    context.clip(to: rect)
    // CoreGraphics draws a picture y-up; the page is y-down
    context.translateBy(x: drawn.minX, y: drawn.maxY)
    context.scaleBy(x: 1, y: -1)
    context.interpolationQuality = .high
    context.draw(cgImage, in: CGRect(origin: .zero, size: size))
    context.restoreGState()
    return drawn
  }

  // MARK: Cover

  private func cover(_ model: KBookCover, _ shared: KBookShared) {
    ground(KBookColor.indigo)
    let quiet = inkSaver ? KBookColor.ink : KBookColor.alpha(KBookColor.white, 0.8)
    let bright = inkSaver ? KBookColor.ink : KBookColor.white
    label(model.top, top: 8 * u, color: quiet)

    // .c1 h3: 800 20cqw/.92, -.03em, two lines at most before it is made smaller
    let titleStyle = KBookTextStyle(face: .heavy, size: 20 * u, tracking: -0.03, lineHeight: 0.92)
    let title = set(
      model.title, titleStyle, inkSaver ? KBookColor.indigo : KBookColor.acid, lead: 8 * u, width: 84 * u, top: 20 * u,
      maxHeight: 37.5 * u
    )
    let titleBottom = title.isEmpty ? 20 * u : title.rect.maxY + title.overhang

    // the pen name sits right under the title
    let byStyle = KBookTextStyle(face: .semibold, size: 5 * u, tracking: -0.01, lineHeight: 1.2)
    let by = set(model.by, byStyle, bright, lead: 8 * u, width: 84 * u, top: titleBottom + 0.8 * u, maxLines: 1, floor: 0.6)
    let foot = label(model.foot, bottom: height - 7 * u, color: bright)

    // .f1 … .f5: left, top, rotation; 24cqw each, the first row from 60cqw
    let slots: [(CGFloat, CGFloat, CGFloat)] = [(8, 66, -8), (38, 60, 6), (66, 70, -4), (20, 92, 10), (52, 96, -12)]
    let faces = Array(model.faces.prefix(5))
    let order: [Int]
    switch faces.count {
    case 1: order = [1]
    case 2: order = [0, 2]
    default: order = Array(0..<faces.count)
    }
    guard !faces.isEmpty else { return }
    // The faces live between the title (or the pen name) and the foot. With a pen name they move
    // down by its height; when another language's long title or a foot of several lines leaves
    // less room than they need, the whole scatter is made smaller, never laid over the words.
    let bandTop = max(60 * u, by.isEmpty ? titleBottom : by.rect.maxY + 1.4 * u)
    let bandBottom = foot.isEmpty ? height - 9 * u : foot.rect.minY
    // a tilted square reaches about 2.2cqw past its own box
    let natural = (order.map { slots[$0].1 }.max() ?? 60) * u + 24 * u + 2.2 * u - 60 * u
    let scale = min(1, max(0.45, (bandBottom - bandTop) / natural))
    context.saveGState()
    context.translateBy(x: width / 2, y: bandTop)
    context.scaleBy(x: scale, y: scale)
    context.translateBy(x: -width / 2, y: -60 * u)
    for (i, id) in faces.enumerated() {
      let slot = slots[order[i]]
      let rect = CGRect(x: x(slot.0 * u, 24 * u), y: slot.1 * u, width: 24 * u, height: 24 * u)
      face(id, in: rect, tile: KBookColor.hex(shared.palette[id] ?? "") ?? KBookColor.acid, degrees: slot.2)
    }
    context.restoreGState()
  }

  // MARK: Year

  private func year(_ model: KBookYear) {
    var y = 8 * u
    // .z-year h3: 26cqw
    let numeral = set(
      model.year, KBookTextStyle(face: .heavy, size: 26 * u, tracking: -0.03, lineHeight: 0.92), KBookColor.ink,
      lead: 8 * u, width: 84 * u, top: y, maxLines: 1
    )
    if !numeral.isEmpty { y = numeral.rect.maxY }
    let lead = label(model.lead, top: y + 2 * u, color: KBookColor.ink)
    y = (lead.isEmpty ? y + 2 * u : lead.rect.maxY) + 5 * u

    // .yr: an 8cqw label, a 1.6cqw gap, 31 squares with .4cqw between them
    let gap = 0.4 * u
    let cell = (84 * u - 8 * u - 1.6 * u - gap * 30) / 31
    let nameStyle = KBookTextStyle(face: .monoSemibold, size: 2.4 * u, tracking: 0.08, lineHeight: 1)
    for month in model.months {
      y += 2.6 * u
      if y + cell > height - 14 * u { break }
      set(month.label, nameStyle, KBookColor.label, lead: 8 * u, width: 8 * u, top: y + (cell - nameStyle.line) / 2, maxLines: 1, floor: 0.5)
      for (d, day) in month.days.prefix(31).enumerated() {
        let rect = CGRect(x: x(17.6 * u + (cell + gap) * CGFloat(d), cell), y: y, width: cell, height: cell)
        fill(rect, KBookColor.hex(day) ?? KBookColor.paleDay, radius: gap)
      }
      y += cell
    }
    label(model.foot, bottom: height - 7 * u)
  }

  // MARK: Month

  private func month(_ model: KBookMonth) {
    // .c2 h3: 26cqw at 8, 8
    set(
      model.label, KBookTextStyle(face: .heavy, size: 26 * u, tracking: -0.03, lineHeight: 0.92), KBookColor.ink,
      lead: 8 * u, width: 84 * u, top: 8 * u, maxLines: 1
    )
    // .calC: seven columns from 38cqw, 1cqw between cells, 1.4cqw corners
    let cell = (84 * u - 6 * u) / 7
    let step = cell + u
    let blanks = model.blanks % 7
    let numberStyle = KBookTextStyle(face: .bold, size: 2.1 * u, tracking: 0, lineHeight: 1)
    for (i, day) in model.days.prefix(42 - blanks).enumerated() {
      let k = blanks + i
      let lead = 8 * u + step * CGFloat(k % 7)
      let rect = CGRect(x: x(lead, cell), y: 38 * u + step * CGFloat(k / 7), width: cell, height: cell)
      let color = KBookColor.hex(day.color)
      let written = !day.mood.isEmpty || color != nil
      fill(rect, color ?? KBookColor.paleCell, radius: 1.4 * u)
      if written, !day.mood.isEmpty {
        let side = 8 * u
        face(day.mood, in: CGRect(x: rect.midX - side / 2, y: rect.midY - side / 2, width: side, height: side), tile: nil)
      }
      set(
        String(day.n > 0 ? day.n : i + 1), numberStyle, written ? KBookColor.ink : KBookColor.paleNumber,
        lead: lead + u, width: cell - 2 * u, top: rect.minY + 0.6 * u, maxLines: 1
      )
    }
    label(model.foot, bottom: height - 7 * u)
  }

  // MARK: Month's end

  private func monthEnd(_ model: KBookMonthEnd, _ shared: KBookShared) {
    ground(KBookColor.ink)
    let dark = !inkSaver
    label(model.top, top: 8 * u, color: KBookColor.alpha(dark ? KBookColor.white : KBookColor.ink, 0.7))

    let stats = Array(model.stats.prefix(3))
    let numeralColor = dark ? KBookColor.acid : KBookColor.indigo
    let labelColor = dark ? KBookColor.white : KBookColor.ink
    // .stat span: 600 5cqw/1.2; .face.inl: 7cqw, 1.6cqw after the words
    let labelStyle = KBookTextStyle(face: .semibold, size: 5 * u, tracking: 0, lineHeight: 1.2)
    let faceSide = 7 * u
    var rows: [(setter: KBookSetter, lines: [KBookLine], tall: CGFloat, face: Bool)] = []
    for stat in stats {
      let hasFace = !stat.mood.isEmpty
      let setter = KBookSetter(stat.label.trimmingCharacters(in: .whitespacesAndNewlines), style: labelStyle, color: labelColor)
      let lines = setter.allLines(width: 84 * u - (hasFace ? faceSide + 1.6 * u : 0))
      rows.append((setter, lines, max(setter.height(of: lines), hasFace ? faceSide : 0), hasFace))
    }
    // .stat b: 800 25cqw/.95; made smaller when three stats with long labels would reach the foot
    var size = 25 * u
    func total(_ size: CGFloat) -> CGFloat {
      rows.reduce(20 * u) { $0 + u + size * 0.95 + $1.tall + 3 * u }
    }
    while total(size) > height - 15 * u, size > 12 * u { size -= 1.5 * u }

    var y = 20 * u
    for (stat, row) in zip(stats, rows) {
      y += u
      let numeralStyle = KBookTextStyle(face: .heavy, size: size, tracking: -0.04, lineHeight: 0.95)
      set(stat.value, numeralStyle, numeralColor, lead: 8 * u, width: 84 * u, top: y, maxLines: 1)
      y += numeralStyle.line
      let wordsWidth = 84 * u - (row.face ? faceSide + 1.6 * u : 0)
      let wordsTall = row.setter.height(of: row.lines)
      row.setter.draw(row.lines, in: context, x: x(8 * u, wordsWidth), top: y + (row.tall - wordsTall) / 2, width: wordsWidth, align: leading)
      if row.face {
        let lead = 8 * u + row.setter.width(of: row.lines) + 1.6 * u
        let rect = CGRect(x: x(lead, faceSide), y: y + (row.tall - faceSide) / 2, width: faceSide, height: faceSide)
        face(stat.mood, in: rect, tile: KBookColor.hex(shared.palette[stat.mood] ?? "") ?? KBookColor.acid)
      }
      y += row.tall + 3 * u
    }
    label(model.foot, bottom: height - 7 * u, color: KBookColor.alpha(dark ? KBookColor.white : KBookColor.ink, 0.6), size: 2.4)
  }

  // MARK: An entry's first page

  private func entry(_ model: KBookEntry, _ layout: KBookEntryLayout, _ page: KBookRenderedPage) {
    let moodColor = model.mood.flatMap { KBookColor.hex($0.color) }
    let numeralColor = moodColor ?? KBookColor.ink
    let markColor = moodColor ?? KBookColor.acid
    let moodGround = model.mood.flatMap { KBookColor.hex($0.bg) }

    switch layout.form {
    case .text, .voice:
      ground(moodGround)
      // a long entry: .num.mid 34cqw, the date at 40cqw; otherwise .num 46cqw, the date at 53cqw
      let long = layout.form == .text && layout.letter
      numeral(model.day, size: (long ? 34 : 46) * u, color: numeralColor, lead: 6 * u, width: (model.mood == nil ? 88 : 66) * u, top: 2 * u)
      if let mood = model.mood {
        // .corner: 18cqw at right 8, top 9
        face(mood.id, in: CGRect(x: x(74 * u, 18 * u), y: 9 * u, width: 18 * u, height: 18 * u), tile: numeralColor)
      }
      label(model.dateLine, top: (long ? 40 : 53) * u, color: KBookColor.ink, size: 2.7, oneLine: true)
      if layout.form == .voice {
        wave(for: model.id, color: KBookColor.alpha(numeralColor, 0.9))
        switch model.media {
        case let .voice(text), let .video(text): label(text, top: 81 * u, color: KBookColor.ink, oneLine: true)
        case .none, .photos: break
        }
      }
      body(layout, face: page.letterFace, color: KBookColor.ink, mark: markColor)
      foot(model, layout, page, color: KBookColor.ink, lead: 8 * u)

    case .photoOne:
      photos(layout)
      // .z-one::after: from 38% down, rgba(16,14,28,0) to rgba(16,14,28,.82)
      shade(from: height * 0.38)
      let words = body(layout, face: page.letterFace, color: KBookColor.white, mark: markColor)
      // .num.onphoto: 30cqw, its box 34cqw above the foot; it rides up with a taller caption
      var bottom = height - 34 * u
      if let words {
        bottom = min(bottom, words.minY - 2.3 * u)
      } else {
        bottom = height - (layout.driftLabel ? 19 : 6) * u
      }
      numeral(model.day, size: 30 * u, color: KBookColor.white, lead: 6 * u, width: 88 * u, top: bottom - 30 * u)
      foot(model, layout, page, color: KBookColor.white, lead: 8 * u)

    case .photoFew, .photoGrid:
      ground(moodGround)
      photos(layout)
      // .num.small: 22cqw, right 6, bottom 4, .9 opacity
      let style = KBookTextStyle(face: .heavy, size: 22 * u, tracking: -0.05, lineHeight: 1)
      set(model.day, style, KBookColor.alpha(numeralColor, 0.9), lead: 64 * u, width: 30 * u, bottom: height - 4 * u, align: trailing, maxLines: 1)
      body(layout, face: page.letterFace, color: KBookColor.ink, mark: markColor)
      foot(model, layout, page, color: KBookColor.ink, lead: 8 * u)
    }
  }

  /// The day's numeral (.num: 800, -.05em, line height 1), made smaller for a day string that is
  /// wider than its box.
  private func numeral(_ day: String, size: CGFloat, color: CGColor, lead: CGFloat, width boxWidth: CGFloat, top: CGFloat) {
    let style = KBookTextStyle(face: .heavy, size: size, tracking: -0.05, lineHeight: 1)
    set(day, style, color, lead: lead, width: boxWidth, top: top, maxLines: 1)
  }

  /// The part of the body this page holds, in its template's block. Returns the block it took.
  @discardableResult
  private func body(_ layout: KBookEntryLayout, face: KLetterFace, color: CGColor, mark: CGColor) -> CGRect? {
    guard !layout.lines.isEmpty else { return nil }
    // the same slot the lines were measured for (KBookRenderer.layouts)
    let slot = layout.first
      ? KBookGeometry.firstSlot(form: layout.form, letter: layout.letter, foot: layout.foot, face: face)
      : KBookGeometry.continuationSlot(foot: layout.foot)
    let style = layout.first ? KBookGeometry.style(form: layout.form, letter: layout.letter, face: face) : KBookGeometry.letter(face)
    // on a photo the words are white; the highlighted ones are ink on the mood's colour
    var marks: [(KBookRange, CGColor)] = []
    if let drift = layout.driftRange, layout.first, layout.form == .photoOne { marks = [(drift, KBookColor.ink)] }
    let setter = KBookSetter(layout.body, style: style, color: color, marks: marks)
    let tall = setter.height(of: layout.lines)
    let top = slot.fromBottom ? slot.bottom - tall : slot.top
    let boxX = x(slot.lead, slot.width)
    setter.draw(layout.lines, in: context, x: boxX, top: top, width: slot.width, align: .natural, mark: layout.driftRange.map { ($0, mark) })
    return CGRect(x: boxX, y: top, width: slot.width, height: tall)
  }

  /// What stands at a page's foot: "CONTINUES →" on a first page that goes on, the drifted
  /// line's label on an entry's last page.
  private func foot(_ model: KBookEntry, _ layout: KBookEntryLayout, _ page: KBookRenderedPage, color: CGColor, lead: CGFloat) {
    if layout.continues, layout.first {
      if layout.form == .photoFew || layout.form == .photoGrid {
        // the numeral has the trailing corner there: the label goes under the caption
        label(model.continues, lead: 8 * u, width: 58 * u, bottom: height - 7 * u, color: color, oneLine: true)
      } else {
        // .cont: right 8, bottom 7
        label(model.continues, bottom: height - 7 * u, color: color, align: trailing, oneLine: true)
      }
    }
    if layout.driftLabel {
      let narrow = layout.first && (layout.form == .photoFew || layout.form == .photoGrid)
      driftLabel(model.driftLabel, wren: page.shared.wren, color: color, lead: lead, end: narrow ? 66 * u : 92 * u, tight: layout.driftRowIsTight)
    }
  }

  /// .drift: Wren's picture 8cqw wide and the label, 2cqw apart, 8cqw above the foot (her picture
  /// 5cqw in the low row, KBookFoot.driftTight). Without her picture (none in the model, or it
  /// can't be read) the label stands alone.
  private func driftLabel(_ string: String, wren: String, color: CGColor, lead: CGFloat, end: CGFloat, tight: Bool) {
    let row = KBookFoot.driftRow(tight: tight)
    var wordsLead = lead
    var centred = false
    if !wren.isEmpty, let bird = image(wren, CGSize(width: row, height: row)) {
      let w = CGFloat(bird.width)
      let h = CGFloat(bird.height)
      if w > 0, h > 0 {
        let scale = min(row / w, row / h)
        let size = CGSize(width: w * scale, height: h * scale)
        picture(bird, in: CGRect(x: x(lead, size.width), y: height - 8 * u - size.height, width: size.width, height: size.height), cover: false)
        wordsLead = lead + size.width + 2 * u
        centred = true
      }
    }
    let style = KBookTextStyle(face: .mono, size: 3.1 * u, tracking: 0.1, lineHeight: 1.6)
    let boxWidth = max(20 * u, end - wordsLead)
    let (setter, lines) = KBookSetter.fitted(string.trimmingCharacters(in: .whitespacesAndNewlines), style: style, color: color, width: boxWidth, maxLines: 1, floor: 0.6)
    let tall = setter.height(of: lines)
    // beside her picture the words are centred on its row; alone they stand on the 8cqw line
    let top = centred ? max(height - 8 * u - row / 2 - tall / 2, height - 8 * u - row) : height - 8 * u - tall
    setter.draw(lines, in: context, x: x(wordsLead, boxWidth), top: top, width: boxWidth, align: leading)
  }

  /// The page's photos in their cells; a stand-in or a picture that isn't there is a flat block.
  private func photos(_ layout: KBookEntryLayout) {
    let tints: [UInt32] = [0x8FBBD9, 0xF3B07A, 0xF2708F, 0x9C9BD6, 0x5CC08E, 0xF6C445, 0xB85670, 0x5FC3D9, 0xA8B4A0]
    for (i, (photo, cell)) in zip(layout.photos, KBookGeometry.photoCells(layout.photos)).enumerated() {
      let rect = CGRect(x: rtl ? width - cell.maxX : cell.minX, y: cell.minY, width: cell.width, height: cell.height)
      if KBookImages.isLab(photo.uri) {
        fill(rect, KBookColor.rgb(tints[i % tints.count]))
      } else if let cgImage = image(photo.uri, cell.size) {
        picture(cgImage, in: rect, cover: true)
      } else {
        fill(rect, KBookColor.paleDay)
      }
    }
  }

  /// The dark fade under the words on a full-bleed photo.
  private func shade(from top: CGFloat) {
    let colors = [KBookColor.rgb(0x100E1C, 0), KBookColor.rgb(0x100E1C, 0.82)] as CFArray
    guard let space = CGColorSpace(name: CGColorSpace.sRGB), let gradient = CGGradient(colorsSpace: space, colors: colors, locations: [0, 1]) else { return }
    context.saveGState()
    context.clip(to: CGRect(x: 0, y: top, width: width, height: height - top))
    context.drawLinearGradient(gradient, start: CGPoint(x: 0, y: top), end: CGPoint(x: 0, y: height), options: [])
    context.restoreGState()
  }

  /// .wave: 24 bars in a row 17cqw tall from 61cqw, 1cqw apart, each centred on the row.
  private func wave(for id: String, color: CGColor) {
    let bars = KBookGeometry.wave(for: id)
    let gap = u
    let rowHeight = 17 * u
    let barWidth = (84 * u - gap * CGFloat(bars.count - 1)) / CGFloat(bars.count)
    for (i, level) in bars.enumerated() {
      let tall = rowHeight * level
      let lead = 8 * u + (barWidth + gap) * CGFloat(i)
      fill(CGRect(x: x(lead, barWidth), y: 61 * u + (rowHeight - tall) / 2, width: barWidth, height: tall), color, radius: u)
    }
  }

  // MARK: A continuation page

  private func continuation(_ model: KBookEntry, _ layout: KBookEntryLayout, _ page: KBookRenderedPage) {
    let moodColor = model.mood.flatMap { KBookColor.hex($0.color) }
    // .band: 3.2cqw down the leading edge
    fill(CGRect(x: x(0, 3.2 * u), y: 0, width: 3.2 * u, height: height), moodColor ?? KBookColor.ink)
    label(model.contLabel, lead: 12 * u, width: 80 * u, top: 8 * u, oneLine: true)
    body(layout, face: page.letterFace, color: KBookColor.ink, mark: moodColor ?? KBookColor.acid)
    // .pgn: right 8, bottom 6
    label(String(page.number), lead: 12 * u, width: 80 * u, bottom: height - 6 * u, align: trailing, oneLine: true)
    if layout.driftLabel {
      driftLabel(model.driftLabel, wren: page.shared.wren, color: KBookColor.ink, lead: 12 * u, end: 80 * u, tight: layout.driftRowIsTight)
    }
  }

  // MARK: Back cover

  private func back(_ model: KBookBack) {
    ground(KBookColor.indigo)
    // .wrenb: 28cqw wide from 8, 50; kept above the lines whatever her picture's shape
    if !model.wren.isEmpty {
      let box = CGSize(width: 28 * u, height: 34 * u)
      if let bird = image(model.wren, box) {
        picture(bird, in: CGRect(x: x(8 * u, box.width), y: 50 * u, width: box.width, height: box.height), cover: false)
      }
    }
    // .zback: 800 9.4cqw/1.05, -.02em, from 86cqw
    let lines = model.lines.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.joined(separator: "\n")
    set(
      lines, KBookTextStyle(face: .heavy, size: 9.4 * u, tracking: -0.02, lineHeight: 1.05),
      inkSaver ? KBookColor.indigo : KBookColor.acid, lead: 8 * u, width: 84 * u, top: 86 * u, maxHeight: 41 * u, floor: 0.5
    )
    label(model.foot, bottom: height - 7 * u, color: inkSaver ? KBookColor.ink : KBookColor.alpha(KBookColor.white, 0.8))
  }
}

// MARK: - The mood faces, for CoreGraphics

/// KMoodArt's table as CoreGraphics paths, read once: the same drawings KMoodArt paints in a
/// Canvas, for a context where a Canvas would not stay vector.
enum KBookFaces {
  private struct Mark {
    let path: CGPath
    let fills: Bool
    let strokes: Bool
    let width: CGFloat
    let cap: CGLineCap
    let join: CGLineJoin
    let dash: [CGFloat]
  }

  private static let table: [String: [Mark]] = {
    var out: [String: [Mark]] = [:]
    for entry in KMoodArtData.moods {
      guard let paths = entry.paths, !paths.isEmpty else { continue }
      out[entry.key] = paths.map {
        Mark(path: $0.path.cgPath, fills: $0.fill != nil, strokes: $0.stroke != nil && $0.width > 0, width: $0.width, cap: $0.cap, join: $0.join, dash: $0.dash)
      }
    }
    return out
  }()

  /// The art key for a mood id as the model carries it: "cheerful" → "mood-cheerful",
  /// "group-low" → "mood-group-low"; a key that already starts "mood-" is kept.
  static func key(_ id: String) -> String {
    id.hasPrefix("mood-") ? id : "mood-" + id
  }

  static func hasArt(_ id: String) -> Bool {
    table[key(id)] != nil
  }

  /// Paints the face for `id` in `ink`, its 24 grid fitted in `rect` and centred; false (and
  /// nothing drawn) when there is no drawing for it.
  @discardableResult
  static func draw(_ id: String, in context: CGContext, rect: CGRect, ink: CGColor) -> Bool {
    guard let marks = table[key(id)], rect.width > 0, rect.height > 0 else { return false }
    let grid = KMoodArtData.grid
    let side = min(rect.width, rect.height)
    let scale = side / grid
    // the owner's optical steps: a thicker line on a small face (KMoodArt.strokeStep)
    let strokeScale = KMoodArt.strokeStep(forFaceSize: side) / KMoodArt.masterStroke
    context.saveGState()
    context.translateBy(x: rect.midX - side / 2, y: rect.midY - side / 2)
    context.scaleBy(x: scale, y: scale)
    context.clip(to: CGRect(x: 0, y: 0, width: grid, height: grid))
    context.setFillColor(ink)
    context.setStrokeColor(ink)
    for mark in marks {
      if mark.fills {
        context.addPath(mark.path)
        context.fillPath()
      }
      if mark.strokes {
        context.addPath(mark.path)
        context.setLineWidth(mark.width * strokeScale)
        context.setLineCap(mark.cap)
        context.setLineJoin(mark.join)
        context.setMiterLimit(4)
        context.setLineDash(phase: 0, lengths: mark.dash)
        context.strokePath()
      }
    }
    context.restoreGState()
    return true
  }
}
