// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE LINE ICONS every 10a surface shares, as drawings rather than SF Symbols: the mock draws its
 icons as a few strokes in a 24-unit box (stroke-linecap and -linejoin round), and the strokes
 belong to the look as much as the colours do.

 Every glyph lives on one 24 grid. The drawings are copied from their sources as SVG path data
 (the mock's own icons, the Notes mock's type and view icons, the trace icons of
 LeaveATrace.tsx, the tab bar's four drawings) and read once by KSVGPath below; a drawing made
 on another grid (the tab drawings' 28, the trace icons' 18, the lock's 14) is scaled onto 24 as
 it is read, so a caller never has to know where a glyph came from.

     KLineIcon(.chevronLeft, size: 18, lineWidth: 2.2, color: theme.ink)   // the back chevron, H:90
     KLineGlyphShape(.calendar, lineWidth: 1.9).fill(theme.ink).frame(width: 20, height: 20)

 lineWidth is in grid units, as SVG's stroke-width is in viewBox units: 2.2 drawn 18 across is
 2.2 × 18/24 points on screen. 0 fills the drawing instead of stroking it. A few glyphs carry a
 solid part as well (the orbit's centre cell, the play triangle, the paper plane); it is filled
 whatever the lineWidth. The width animates, so a stroke can thicken along with a colour change
 (the tab bar does).

 Glyphs are decorative: KLineIcon hides itself from VoiceOver. Label the button that holds one.
 */

/// A line drawing on the shared 24 grid. The raw value is the name the JS side may send.
public enum KLineGlyph: String, CaseIterable, Sendable {
  // ── navigation ──
  /// ‹ the back chevron, M15 6l-7 6 7 6 (H:90)
  case chevronLeft
  /// › M9 6l7 6-7 6 (H:113)
  case chevronRight
  /// ⌄ M6 9l6 6 6-6 (H:139)
  case chevronDown
  /// ↑ the write-back arrow (ChatField's SendArrow)
  case arrowUp
  /// × M5 5l14 14 M19 5L5 19 (NotifyBanner)
  case close
  /// + M12 5v14 M5 12h14 (H:119, H:136)
  case plus
  /// ⋯ three dots, for a "more" button
  case more
  /// ✓ M5 13l4 4L19 7 (H:65)
  case check
  /// the official mark's tick, M5 12l5 5 9-10 (WrenDesk.tsx OfficialMark)
  case tick

  // ── playback ──
  /// a solid play triangle (filled at any lineWidth)
  case play
  /// two solid bars (filled at any lineWidth)
  case pause

  // ── what a note or a letter is made of (the Notes mock's ICONS, H:55) ──
  /// three lines of text
  case text
  /// a microphone on its stand (the voice type)
  case mic
  /// a square frame with a hill (the photo type)
  case photo
  /// a film camera (the video type)
  case video

  // ── the Notes header (H:50, 346) ──
  /// a calendar page with its two rings
  case calendar
  /// two stacked cards: the Card view
  case card
  /// four squares: the Grid view
  case grid
  /// three bulleted lines: the List view
  case list

  // ── Me, Settings and Edit profile (H:71, 72, 81, 91) ──
  /// the pencil (Edit profile, write back)
  case pen
  /// three sliders (Settings)
  case sliders
  /// a stills camera (STAMP CAM, the avatar's camera button)
  case camera
  /// a rounded photo with a sun (UPLOAD, Choose a photo)
  case picture
  /// a padlock (a locked choice)
  case lock
  /// a bell (the notifications notice)
  case bell
  /// a clock face
  case clock
  /// a globe (language)
  case globe

  // ── the tab bar's drawings (P:70-75), here on the 24 grid ──
  /// Today's envelope; also the letters stat on Me (H:72)
  case envelope
  /// the dot inside the envelope when Today is selected (solid)
  case envelopeDot
  /// Notes' ruled card
  case ruledCard
  /// the bar over the ruled card's middle line when Notes is selected (solid)
  case ruledCardBar
  /// Kindreds' two speech bubbles; also the kindreds stat on Me (H:72)
  case bubbles
  /// the two dots in the first bubble when Kindreds is selected (solid)
  case bubblesDots
  /// Me's head and shoulders
  case person
  /// the dot under the head when Me is selected (solid)
  case personDot
  /// a notebook with a spine: the composer sheet's note card (H:133)
  case notebook

  // ── what you can leave in a room or on Wren's desk (LeaveATrace.tsx TraceIcon) ──
  /// a folded note
  case note
  /// a speech bubble with a question mark
  case ask
  /// a camera for a moment
  case moment
  /// two beamed notes, a song
  case song
  /// a beetle, for a bug report
  case bug
  /// a light bulb, for an idea
  case idea

  // ── Kindreds (H:62) ──
  /// the orbit: two rings and the centre cell (solid)
  case orbit
  /// a single note, music
  case music
  /// the kindred face: two eyes and a smile (H:62's legend chip)
  case smile

  // ── the four mood faces (the Notes mock's FACE) ──
  case moodCalm
  case moodHappy
  case moodTired
  case moodLow

  // ── sending ──
  /// the paper plane on the send key (ChatField's SendPlane), solid
  case plane

  /// The drawing in grid units: the part that is stroked and the part that is always filled.
  var parts: KLineParts {
    KLineGlyphTable.parts[self] ?? KLineParts(stroke: Path(), fill: Path())
  }
}

/// A glyph's two paths on the 24 grid.
struct KLineParts {
  /// stroked with the caller's lineWidth, round caps and joins (filled when lineWidth is 0)
  let stroke: Path
  /// always filled: the solid accents
  let fill: Path
}

/// A glyph placed in its frame (square, centred) and stroked as SVG strokes it: round caps and
/// joins, the width in grid units. A lineWidth of 0 fills the drawing instead.
public struct KLineGlyphShape: Shape {
  public let glyph: KLineGlyph
  public var lineWidth: CGFloat

  /// - Parameters:
  ///   - glyph: the drawing
  ///   - lineWidth: the stroke in grid units (24 across), like SVG's stroke-width; 0 fills it
  public init(_ glyph: KLineGlyph, lineWidth: CGFloat = 1.9) {
    self.glyph = glyph
    self.lineWidth = lineWidth
  }

  public var animatableData: CGFloat {
    get { lineWidth }
    set { lineWidth = newValue }
  }

  public func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / KLineGlyphTable.grid
    guard s > 0 else { return Path() }
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    let parts = glyph.parts
    guard lineWidth > 0 else {
      var all = parts.stroke
      all.addPath(parts.fill)
      return all.applying(place)
    }
    let stroked = parts.stroke.applying(place)
      .strokedPath(StrokeStyle(lineWidth: lineWidth * s, lineCap: .round, lineJoin: .round))
    guard !parts.fill.isEmpty else { return stroked }
    // a clean union, so a solid part overlapping a stroke can't punch a hole in it
    return stroked.union(parts.fill.applying(place))
  }
}

/// A glyph as a view: drawn `size` across in one colour, hidden from VoiceOver.
public struct KLineIcon: View {
  private let glyph: KLineGlyph
  private let size: CGFloat
  private let lineWidth: CGFloat
  private let color: Color

  /// - Parameters:
  ///   - size: the square frame, in points
  ///   - lineWidth: in grid units (see KLineGlyphShape); 1.9 is the mock's default stroke
  public init(_ glyph: KLineGlyph, size: CGFloat, lineWidth: CGFloat = 1.9, color: Color) {
    self.glyph = glyph
    self.size = size
    self.lineWidth = lineWidth
    self.color = color
  }

  public var body: some View {
    KLineGlyphShape(glyph, lineWidth: lineWidth)
      .fill(color)
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }
}

/*
 THE DRAWINGS. Each is written as its source wrote it, on its source's grid, and scaled onto 24
 when the table is built (once, the first time any glyph is drawn).
 */
enum KLineGlyphTable {
  /// the shared grid every glyph is placed on
  static let grid: CGFloat = 24

  /// One SVG element of a drawing, in its source's units.
  enum Part {
    /// path data, the `d` attribute
    case d(String)
    case circle(CGFloat, CGFloat, r: CGFloat)
    case ellipse(CGFloat, CGFloat, rx: CGFloat, ry: CGFloat)
    case rect(CGFloat, CGFloat, CGFloat, CGFloat, r: CGFloat = 0)
  }

  /// A drawing on a source grid of `box` units: what is stroked and what is filled.
  struct Drawing {
    var box: CGFloat = 24
    var stroke: [Part] = []
    var fill: [Part] = []
  }

  static func drawing(_ g: KLineGlyph) -> Drawing {
    switch g {
    case .chevronLeft: return Drawing(stroke: [.d("M15 6l-7 6 7 6")])
    case .chevronRight: return Drawing(stroke: [.d("M9 6l7 6-7 6")])
    case .chevronDown: return Drawing(stroke: [.d("M6 9l6 6 6-6")])
    case .arrowUp: return Drawing(stroke: [.d("M12 19V5 M5 12l7-7 7 7")])
    case .close: return Drawing(stroke: [.d("M5 5l14 14 M19 5L5 19")])
    case .plus: return Drawing(stroke: [.d("M12 5v14 M5 12h14")])
    case .more: return Drawing(stroke: [.d("M6 12h.01 M12 12h.01 M18 12h.01")])
    case .check: return Drawing(stroke: [.d("M5 13l4 4L19 7")])
    case .tick: return Drawing(stroke: [.d("M5 12l5 5 9-10")])

    case .play:
      // a triangle with softened corners, nudged right of centre as a play mark is drawn
      return Drawing(fill: [.d("M8 5.9v12.2a1 1 0 0 0 1.5.86l10-6.1a1 1 0 0 0 0-1.72l-10-6.1A1 1 0 0 0 8 5.9z")])
    case .pause:
      return Drawing(fill: [.rect(6.5, 5, 3.8, 14, r: 1), .rect(13.7, 5, 3.8, 14, r: 1)])

    case .text: return Drawing(stroke: [.d("M4 7h16 M4 12h16 M4 17h10")])
    case .mic: return Drawing(stroke: [.d("M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3")])
    case .photo: return Drawing(stroke: [.d("M4 5h16v14H4z M4 15l5-5 4 4 3-3 4 4")])
    case .video:
      return Drawing(stroke: [.rect(3, 6, 12, 12, r: 2), .d("M15 10l6-3.5v11L15 14")])

    case .calendar: return Drawing(stroke: [.rect(3, 5, 18, 16, r: 3), .d("M3 9.5h18 M8 3v3.5 M16 3v3.5")])
    case .card: return Drawing(stroke: [.d("M4 5h16v6H4z M4 13h16v6H4z")])
    case .grid: return Drawing(stroke: [.d("M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z")])
    case .list: return Drawing(stroke: [.d("M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01")])

    case .pen: return Drawing(stroke: [.d("M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z")])
    case .sliders:
      return Drawing(stroke: [
        .d("M4 6h9 M17 6h3 M4 12h3 M11 12h9 M4 18h11 M19 18h1"),
        .circle(15, 6, r: 2), .circle(9, 12, r: 2), .circle(17, 18, r: 2),
      ])
    case .camera: return Drawing(stroke: [.d("M4 8h3l2-3h6l2 3h3v11H4z"), .circle(12, 13, r: 3.5)])
    case .picture: return Drawing(stroke: [.rect(3, 5, 18, 14, r: 3), .circle(9, 10, r: 2), .d("M21 15l-5-4-9 8")])
    case .lock:
      // LeaveATrace's LockIcon, on its 14 grid
      return Drawing(box: 14, stroke: [.rect(2.5, 6, 9, 6.5), .d("M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6")])
    case .bell: return Drawing(stroke: [.d("M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0")])
    case .clock: return Drawing(stroke: [.circle(12, 12, r: 7), .d("M12 8v4l3 2")])
    case .globe: return Drawing(stroke: [.circle(12, 12, r: 9), .d("M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18")])

    // the tab bar's drawings, on the mock's 28 grid (P:70-75, H:417-423; the accents are das())
    case .envelope: return Drawing(box: 28, stroke: [.d("M3 8h22v13H3z M3 9l11 8 11-8")])
    case .envelopeDot: return Drawing(box: 28, fill: [.circle(14, 15.5, r: 2.4)])
    case .ruledCard: return Drawing(box: 28, stroke: [.d("M6 4h16v20H6z M10 10h8 M10 14h8 M10 18h5")])
    case .ruledCardBar: return Drawing(box: 28, fill: [.rect(8.5, 14.2, 11, 2, r: 1)])
    case .bubbles: return Drawing(box: 28, stroke: [.d("M4 6h13v9H9l-4 4z M12 19h8l4 4V12h-3")])
    case .bubblesDots: return Drawing(box: 28, fill: [.circle(8.5, 10.5, r: 1.5), .circle(12.5, 10.5, r: 1.5)])
    case .person: return Drawing(box: 28, stroke: [.d("M18 10a4 4 0 1 1-8 0a4 4 0 1 1 8 0z M5 24c1-5 5-7 9-7s8 2 9 7")])
    case .personDot: return Drawing(box: 28, fill: [.circle(14, 19.5, r: 2)])
    case .notebook: return Drawing(box: 28, stroke: [.d("M6 3h13a1 1 0 0 1 1 1v20a1 1 0 0 1-1 1H6z M10 3v22 M14 9h3 M14 13h3")])

    // the trace icons, on LeaveATrace's 18 grid
    case .note: return Drawing(box: 18, stroke: [.d("M4 2.5h7l3 3v10H4z M11 2.5v3h3 M6.5 9h5 M6.5 12h3.5")])
    case .ask:
      return Drawing(box: 18, stroke: [.d("M3 3.5h12v8H8.5L5.5 14v-2.5H3z M7.6 6.6a1.5 1.5 0 1 1 2.1 1.4c-.5.3-.7.6-.7 1.1")], fill: [.circle(9, 10.6, r: 0.6)])
    case .moment: return Drawing(box: 18, stroke: [.rect(2.5, 5, 13, 9.5), .d("M6.5 5l1-2h3l1 2"), .circle(9, 9.7, r: 2.4)])
    case .song: return Drawing(box: 18, stroke: [.d("M7 13.5V4.5l7-1.5v9"), .circle(5, 13.5, r: 2), .circle(12, 12, r: 2)])
    case .bug:
      return Drawing(box: 18, stroke: [.d("M6 8a3 3 0 0 1 6 0v3.5a3 3 0 0 1-6 0z M7 5.5l-1.5-2 M11 5.5l1.5-2 M9 8v6.5 M6 9H3.5 M12 9h2.5 M6 12l-2 1.5 M12 12l2 1.5")])
    case .idea:
      return Drawing(box: 18, stroke: [.d("M5.5 7.5a3.5 3.5 0 1 1 5.6 2.8c-.6.5-.9 1-.9 1.7H7.8c0-.7-.3-1.2-.9-1.7A3.5 3.5 0 0 1 5.5 7.5z M7.8 14h2.4 M8.3 15.5h1.4")])

    case .orbit: return Drawing(stroke: [.ellipse(12, 12, rx: 9, ry: 6.5), .ellipse(12, 12, rx: 5, ry: 3.6)], fill: [.rect(10.8, 10.8, 2.4, 2.4)])
    case .music: return Drawing(stroke: [.d("M14 16.5V4c1 2.6 4.2 3.1 5 5.6"), .circle(11.5, 16.5, r: 2.5)])
    case .smile: return Drawing(stroke: [.d("M8 10h.01 M16 10h.01 M8 15c1.3 1.3 2.6 2 4 2s2.7-.7 4-2")])

    case .moodCalm: return Drawing(stroke: [.d("M8.5 10.5h.01 M15.5 10.5h.01 M8 14.5c1.2 1.4 2.6 2 4 2s2.8-.6 4-2")])
    case .moodHappy: return Drawing(stroke: [.d("M6.5 10.5c.8-1.2 2.2-1.2 3 0 M14.5 10.5c.8-1.2 2.2-1.2 3 0 M7.5 14c1.5 2.3 3 3.2 4.5 3.2s3-.9 4.5-3.2")])
    case .moodTired: return Drawing(stroke: [.d("M6.5 10.5h3 M14.5 10.5h3 M10.5 15.5h3")])
    case .moodLow: return Drawing(stroke: [.d("M8.5 10.5h.01 M15.5 10.5h.01 M8 16.5c1.2-1.4 2.6-2 4-2s2.8.6 4 2")])

    case .plane:
      return Drawing(fill: [.d("M3.4 2.6a1 1 0 0 0-1.3 1.2l2.3 7.2a1 1 0 0 0 .8.7l8.3 1.3-8.3 1.3a1 1 0 0 0-.8.7l-2.3 7.2a1 1 0 0 0 1.3 1.2l18-8.4a1 1 0 0 0 0-1.8z")])
    }
  }

  /// Every glyph, read and scaled onto the grid once.
  static let parts: [KLineGlyph: KLineParts] = {
    var out: [KLineGlyph: KLineParts] = [:]
    for g in KLineGlyph.allCases {
      let d = drawing(g)
      let s = grid / d.box
      let scale = CGAffineTransform(scaleX: s, y: s)
      out[g] = KLineParts(stroke: path(d.stroke).applying(scale), fill: path(d.fill).applying(scale))
    }
    return out
  }()

  static func path(_ parts: [Part]) -> Path {
    var p = Path()
    for part in parts {
      switch part {
      case let .d(data):
        p.addPath(KSVGPath.path(data))
      case let .circle(cx, cy, r):
        p.addEllipse(in: CGRect(x: cx - r, y: cy - r, width: 2 * r, height: 2 * r))
      case let .ellipse(cx, cy, rx, ry):
        p.addEllipse(in: CGRect(x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry))
      case let .rect(x, y, w, h, r):
        let box = CGRect(x: x, y: y, width: w, height: h)
        if r > 0 {
          p.addRoundedRect(in: box, cornerSize: CGSize(width: r, height: r), style: .circular)
        } else {
          p.addRect(box)
        }
      }
    }
    return p
  }
}

/*
 A SMALL SVG PATH-DATA READER, for the drawings above: the `d` attribute's commands
 M L H V C S Q T A Z, absolute (capitals) and relative (lower case), with SVG's number grammar
 (a sign or a second decimal point starts a new number: "1-8", "2.6.5"; exponents allowed) and
 its implicit repeats (more pairs after M are line-tos). Arcs become cubic Béziers, as SVG's
 implementation notes convert them (F.6.5-F.6.6), at most a quarter turn per curve. Anything it
 can't read ends the path where the error is, so a typo draws less, never garbage.

 Internal to the module: stamp art (Kit/KArtPath.swift) may lean on it too.
 */
enum KSVGPath {
  static func path(_ d: String) -> Path {
    var reader = Reader(Array(d.utf8))
    var p = Path()
    var current = CGPoint.zero
    var subpathStart = CGPoint.zero
    // the last curve's second control point, for S (cubic) and T (quadratic) reflections
    var lastCubic: CGPoint?
    var lastQuad: CGPoint?
    var command: UInt8 = 0

    parse: while true {
      reader.skipSeparators()
      if reader.atEnd { break }
      if let letter = reader.letter() {
        command = letter
      } else if command == 0 || command == UInt8(ascii: "Z") || command == UInt8(ascii: "z") {
        // numbers with no command to repeat
        break
      }
      let relative = command >= UInt8(ascii: "a")
      let origin = relative ? current : .zero
      var cubic: CGPoint?
      var quad: CGPoint?

      switch command | 0x20 { // lower-cased
      case UInt8(ascii: "m"):
        guard let x = reader.number(), let y = reader.number() else { break parse }
        current = CGPoint(x: origin.x + x, y: origin.y + y)
        subpathStart = current
        p.move(to: current)
        // further pairs are line-tos of the same case
        command = relative ? UInt8(ascii: "l") : UInt8(ascii: "L")
      case UInt8(ascii: "l"):
        guard let x = reader.number(), let y = reader.number() else { break parse }
        current = CGPoint(x: origin.x + x, y: origin.y + y)
        p.addLine(to: current)
      case UInt8(ascii: "h"):
        guard let x = reader.number() else { break parse }
        current = CGPoint(x: origin.x + x, y: current.y)
        p.addLine(to: current)
      case UInt8(ascii: "v"):
        guard let y = reader.number() else { break parse }
        current = CGPoint(x: current.x, y: (relative ? current.y : 0) + y)
        p.addLine(to: current)
      case UInt8(ascii: "c"):
        guard let x1 = reader.number(), let y1 = reader.number(),
              let x2 = reader.number(), let y2 = reader.number(),
              let x = reader.number(), let y = reader.number() else { break parse }
        let c1 = CGPoint(x: origin.x + x1, y: origin.y + y1)
        let c2 = CGPoint(x: origin.x + x2, y: origin.y + y2)
        current = CGPoint(x: origin.x + x, y: origin.y + y)
        p.addCurve(to: current, control1: c1, control2: c2)
        cubic = c2
      case UInt8(ascii: "s"):
        guard let x2 = reader.number(), let y2 = reader.number(),
              let x = reader.number(), let y = reader.number() else { break parse }
        let c1 = lastCubic.map { CGPoint(x: 2 * current.x - $0.x, y: 2 * current.y - $0.y) } ?? current
        let c2 = CGPoint(x: origin.x + x2, y: origin.y + y2)
        current = CGPoint(x: origin.x + x, y: origin.y + y)
        p.addCurve(to: current, control1: c1, control2: c2)
        cubic = c2
      case UInt8(ascii: "q"):
        guard let x1 = reader.number(), let y1 = reader.number(),
              let x = reader.number(), let y = reader.number() else { break parse }
        let c = CGPoint(x: origin.x + x1, y: origin.y + y1)
        current = CGPoint(x: origin.x + x, y: origin.y + y)
        p.addQuadCurve(to: current, control: c)
        quad = c
      case UInt8(ascii: "t"):
        guard let x = reader.number(), let y = reader.number() else { break parse }
        let c = lastQuad.map { CGPoint(x: 2 * current.x - $0.x, y: 2 * current.y - $0.y) } ?? current
        current = CGPoint(x: origin.x + x, y: origin.y + y)
        p.addQuadCurve(to: current, control: c)
        quad = c
      case UInt8(ascii: "a"):
        guard let rx = reader.number(), let ry = reader.number(), let rotation = reader.number(),
              let large = reader.flag(), let sweep = reader.flag(),
              let x = reader.number(), let y = reader.number() else { break parse }
        let end = CGPoint(x: origin.x + x, y: origin.y + y)
        addArc(to: &p, from: current, rx: rx, ry: ry, degrees: rotation, large: large, sweep: sweep, end: end)
        current = end
      case UInt8(ascii: "z"):
        p.closeSubpath()
        current = subpathStart
      default:
        break parse
      }
      lastCubic = cubic
      lastQuad = quad
    }
    return p
  }

  /// An elliptical arc from `start` to `end` as SVG states it, added as cubic curves.
  static func addArc(to p: inout Path, from start: CGPoint, rx rx0: CGFloat, ry ry0: CGFloat, degrees: CGFloat, large: Bool, sweep: Bool, end: CGPoint) {
    if start == end { return }
    var rx = abs(rx0)
    var ry = abs(ry0)
    guard rx > 0, ry > 0 else {
      p.addLine(to: end)
      return
    }
    let phi = degrees * .pi / 180
    let cosPhi = cos(phi)
    let sinPhi = sin(phi)
    // F.6.5.1: the start point in the ellipse's own frame, centred between the two ends
    let dx = (start.x - end.x) / 2
    let dy = (start.y - end.y) / 2
    let x1 = cosPhi * dx + sinPhi * dy
    let y1 = -sinPhi * dx + cosPhi * dy
    // F.6.6: radii too small to reach are scaled up just enough
    let lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
    if lambda > 1 {
      let k = lambda.squareRoot()
      rx *= k
      ry *= k
    }
    // F.6.5.2: the centre in that frame
    let num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    let den = rx * rx * y1 * y1 + ry * ry * x1 * x1
    let sign: CGFloat = large == sweep ? -1 : 1
    let coef = den > 0 ? sign * max(0, num / den).squareRoot() : 0
    let cx1 = coef * (rx * y1 / ry)
    let cy1 = coef * (-ry * x1 / rx)
    // F.6.5.3: back to the drawing's frame
    let cx = cosPhi * cx1 - sinPhi * cy1 + (start.x + end.x) / 2
    let cy = sinPhi * cx1 + cosPhi * cy1 + (start.y + end.y) / 2
    // F.6.5.5-6: the start angle and the sweep
    func angle(_ ux: CGFloat, _ uy: CGFloat, _ vx: CGFloat, _ vy: CGFloat) -> CGFloat {
      atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    }
    let ux = (x1 - cx1) / rx
    let uy = (y1 - cy1) / ry
    let vx = (-x1 - cx1) / rx
    let vy = (-y1 - cy1) / ry
    let theta = angle(1, 0, ux, uy)
    var delta = angle(ux, uy, vx, vy)
    if !sweep && delta > 0 { delta -= 2 * .pi }
    if sweep && delta < 0 { delta += 2 * .pi }

    // at most a quarter turn per cubic
    let count = max(1, Int((abs(delta) / (.pi / 2)).rounded(.up)))
    let step = delta / CGFloat(count)
    let k = 4 / 3 * tan(step / 4)
    func onEllipse(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
      CGPoint(x: cx + rx * cosPhi * x - ry * sinPhi * y, y: cy + rx * sinPhi * x + ry * cosPhi * y)
    }
    var a = theta
    for i in 0..<count {
      let b = a + step
      let c1 = onEllipse(cos(a) - k * sin(a), sin(a) + k * cos(a))
      let c2 = onEllipse(cos(b) + k * sin(b), sin(b) - k * cos(b))
      // the last curve lands exactly on the end point the path data names
      let to = i == count - 1 ? end : onEllipse(cos(b), sin(b))
      p.addCurve(to: to, control1: c1, control2: c2)
      a = b
    }
  }

  /// Walks the bytes of path data.
  struct Reader {
    private let bytes: [UInt8]
    private var i = 0

    init(_ bytes: [UInt8]) {
      self.bytes = bytes
    }

    var atEnd: Bool { i >= bytes.count }

    mutating func skipSeparators() {
      while i < bytes.count {
        switch bytes[i] {
        case 0x20, 0x09, 0x0A, 0x0D, 0x0C, UInt8(ascii: ","): i += 1
        default: return
        }
      }
    }

    /// a command letter, if one is next
    mutating func letter() -> UInt8? {
      skipSeparators()
      guard i < bytes.count else { return nil }
      let c = bytes[i]
      let isLetter = (c >= UInt8(ascii: "A") && c <= UInt8(ascii: "Z")) || (c >= UInt8(ascii: "a") && c <= UInt8(ascii: "z"))
      // e and E only ever appear inside numbers (exponents)
      guard isLetter, c != UInt8(ascii: "e"), c != UInt8(ascii: "E") else { return nil }
      i += 1
      return c
    }

    /// an arc flag: a single 0 or 1, which may run straight into the next number ("a1 1 0 0 1 3 3", "a1 1 0 011 1")
    mutating func flag() -> Bool? {
      skipSeparators()
      guard i < bytes.count else { return nil }
      switch bytes[i] {
      case UInt8(ascii: "0"): i += 1; return false
      case UInt8(ascii: "1"): i += 1; return true
      default: return nil
      }
    }

    mutating func number() -> CGFloat? {
      skipSeparators()
      let start = i
      if i < bytes.count, bytes[i] == UInt8(ascii: "-") || bytes[i] == UInt8(ascii: "+") { i += 1 }
      var digits = false
      var dot = false
      while i < bytes.count {
        let c = bytes[i]
        if c >= UInt8(ascii: "0") && c <= UInt8(ascii: "9") {
          digits = true
          i += 1
        } else if c == UInt8(ascii: ".") && !dot {
          dot = true
          i += 1
        } else {
          break
        }
      }
      guard digits else {
        i = start
        return nil
      }
      // an exponent, only when digits follow it
      if i < bytes.count, bytes[i] == UInt8(ascii: "e") || bytes[i] == UInt8(ascii: "E") {
        var j = i + 1
        if j < bytes.count, bytes[j] == UInt8(ascii: "-") || bytes[j] == UInt8(ascii: "+") { j += 1 }
        if j < bytes.count, bytes[j] >= UInt8(ascii: "0") && bytes[j] <= UInt8(ascii: "9") {
          i = j
          while i < bytes.count, bytes[i] >= UInt8(ascii: "0") && bytes[i] <= UInt8(ascii: "9") { i += 1 }
        }
      }
      let text = String(decoding: bytes[start..<i], as: UTF8.self)
      guard let value = Double(text) else { return nil }
      return CGFloat(value)
    }
  }
}
