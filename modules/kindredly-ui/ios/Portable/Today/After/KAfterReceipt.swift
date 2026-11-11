// Portable: this file imports SwiftUI and UIKit only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI
import UIKit

/*
 F3, THE RECEIPT (the owner's prompt 2; on Sundays, with the week's totals). A white card:

   her, small, and one line                    “that's 15. there's a little extra at the bottom.”
   the printer (300 × 26, its slot 266 × 4)    the paper comes out from under it
   ┌ KINDREDLY POST ─────────────┐             264 wide, fed out in sixteen steps over 1.8 s
   │ NOV 11 · 3:19 PM · COURIER… │
   │ LETTERS READ ........... 15 │             every number is TS's, and real
   │ WRITTEN BACK ............ 2 │
   │ NEXT DELIVERY ..... 8:00 AM │
   │ POND IS BACK IN ... 16H 40M │
   │        POND'S FACT · NO. 12 │             the small thing, at the foot
   │ ▌▌ ▌ ▌▌ ▌ ▌▌ ▌ ▌▌ ▌ ▌▌ ▌ ▌▌ │
   └vvvvvvvvvvvvvvvvvvvvvvvvvvvvv┘
   [ Print today's receipt ]  →  PRINTING…  →  [ Tear it off ]  →  [ Keep the stub ][ Share my day ]

 The paper may be longer than the room under the printer (a small phone, a long fact, large
 type): it scrolls there, under the printer.

 Share makes a picture of the receipt (a file in tmp, handed to TS, which opens the system's
 share sheet). The picture leaves out any row marked `unshared`, and would leave out the small
 thing if it were a stranger's line: nothing from another person's letter is ever in it. A long
 press on the printed paper shares too.

 Reduce Motion: the paper is simply there after Print, and a torn one doesn't tilt.
 */
struct KAfterReceiptView: View {
  let theme: KTheme
  let palette: KAfterPalette
  let receipt: KAfterReceipt
  let thing: KAfterThing
  let look: KWrenLook
  let actions: KAfterActions
  /// false only for the check sheets: ImageRenderer draws nothing inside a ScrollView
  var scrolls = true

  private enum Stage {
    case idle
    case printing
    case printed
    case torn
  }

  static let steps = 16
  static let paperWidth: CGFloat = 264

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.displayScale) private var displayScale
  @State private var stage: Stage
  /// how much of the paper is out, in steps
  @State private var fed: Int
  @State private var paperHeight: CGFloat = 0
  @State private var printSerial = 0

  init(theme: KTheme, palette: KAfterPalette, receipt: KAfterReceipt, thing: KAfterThing, look: KWrenLook, actions: KAfterActions, scrolls: Bool = true) {
    self.theme = theme
    self.palette = palette
    self.receipt = receipt
    self.thing = thing
    self.look = look
    self.actions = actions
    self.scrolls = scrolls
    let start: Stage = receipt.phase == .torn ? .torn : receipt.phase == .printed ? .printed : .idle
    _stage = State(initialValue: start)
    _fed = State(initialValue: start == .idle ? 0 : Self.steps)
  }

  var body: some View {
    KAfterCard(palette: palette) {
      VStack(spacing: 12) {
        top
        middle
          .frame(maxWidth: .infinity, maxHeight: .infinity)
        keys
      }
    }
    .onChange(of: receipt.phase) { _, now in follow(now) }
    .sensoryFeedback(.impact(weight: .light, intensity: 0.6), trigger: fed)
  }

  /// TS says another phase than the page is in (the day's record, read after the page came up)
  private func follow(_ now: KAfterReceiptPhase) {
    guard stage != .printing else { return }
    if now == .torn, stage != .torn {
      fed = Self.steps
      stage = .torn
    } else if now == .printed, stage == .idle {
      fed = Self.steps
      stage = .printed
    }
  }

  // MARK: her line

  private var bird: KWrenLook {
    var l = look
    l.pose = .perch
    l.mood = .curious
    return l
  }

  private var top: some View {
    HStack(spacing: 10) {
      KWrenBird(bird, size: 42)
      Text(receipt.line)
        .kText(.content(17, italic: true, lineHeight: 1.2))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(minHeight: 44)
    .accessibilityElement(children: .combine)
  }

  // MARK: the printer and its paper

  private var middle: some View {
    GeometryReader { geo in
      let w = geo.size.width
      let printerW: CGFloat = min(300, w)
      ZStack(alignment: .top) {
        feed
          .frame(width: w)
        ZStack {
          Capsule().fill(palette.printer)
          Capsule()
            .fill(palette.printerSlot)
            .frame(width: printerW - 34, height: 4)
        }
        .frame(width: printerW, height: 26)
        .accessibilityHidden(true)
      }
      .frame(width: w, height: geo.size.height, alignment: .top)
    }
  }

  /// the paper under the printer: in a scroll when it may be longer than the room
  @ViewBuilder
  private var feed: some View {
    if scrolls {
      ScrollView(.vertical) {
        sheet
          .padding(.top, 14)
          .padding(.bottom, 24)
          .frame(maxWidth: .infinity)
      }
      .scrollBounceBehavior(.basedOnSize)
      .scrollIndicators(.hidden)
    } else {
      sheet
        .padding(.top, 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .clipped()
    }
  }

  private var out: CGFloat {
    paperHeight * CGFloat(fed) / CGFloat(Self.steps)
  }

  private var sheet: some View {
    let torn = stage == .torn
    let tilt: Double = torn && !reduceMotion ? -2.5 : 0
    return KAfterPaper(palette: palette, receipt: receipt, thing: thing)
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { h in
        if abs(h - paperHeight) > 0.5 { paperHeight = h }
      }
      // only what the printer has fed so far (the whole sheet once its height is known and it is out)
      .frame(height: fed >= Self.steps ? nil : out, alignment: .top)
      .clipped()
      .shadow(color: palette.paperShadow, radius: 5, y: 8)
      .rotationEffect(.degrees(tilt), anchor: .top)
      .offset(y: torn ? 18 : 0)
      .animation(reduceMotion ? nil : .spring(response: 0.45, dampingFraction: 0.55), value: torn)
      .opacity(fed == 0 ? 0 : 1)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(receipt.a11y)
      .accessibilityHidden(stage == .idle || stage == .printing)
      .onLongPressGesture(minimumDuration: 0.5) {
        if stage == .printed || stage == .torn { share() }
      }
  }

  // MARK: the keys

  @ViewBuilder
  private var keys: some View {
    switch stage {
    case .idle:
      key(receipt.print, fill: palette.lime, ink: palette.limeInk, action: startPrint)
    case .printing:
      Text(receipt.printing)
        .kText(.mono(11, .medium, tracking: 0.16))
        .foregroundStyle(theme.mute)
        .frame(maxWidth: .infinity)
        .frame(height: 50)
        .background(theme.soft2, in: Capsule())
    case .printed:
      key(receipt.tear, fill: theme.ink, ink: theme.bg, action: tear)
    case .torn:
      GeometryReader { geo in
        let keepW: CGFloat = (geo.size.width - 10) / 2.3
        HStack(spacing: 10) {
          key(thing.isKept ? thing.keptStub : thing.keepStub, fill: thing.isKept ? palette.lime : theme.soft2, ink: thing.isKept ? palette.limeInk : theme.ink) {
            actions.onKeep(!thing.isKept)
          }
          .frame(width: keepW)
          .accessibilityHint(thing.isKept ? "" : thing.keepHint)
          .accessibilityAddTraits(thing.isKept ? .isSelected : [])
          key(receipt.share, fill: palette.accent, ink: theme.isDark ? Color(hex: "#0F0E1C") : .white, action: share)
        }
      }
      .frame(height: 50)
    }
  }

  private func key(_ title: String, fill: Color, ink: Color, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Text(title)
        .kText(.system(15, .semibold))
        .foregroundStyle(ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity)
        .frame(height: 50)
        .background(fill, in: Capsule())
        .contentShape(Capsule())
    }
    .buttonStyle(.plain)
  }

  private func startPrint() {
    guard stage == .idle else { return }
    if reduceMotion {
      withAnimation(.easeInOut(duration: 0.2)) {
        fed = Self.steps
        stage = .printed
      }
      actions.onReceipt(.printed)
      return
    }
    stage = .printing
    printSerial &+= 1
    step(printSerial)
  }

  /// one step of the feed, then the next: sixteen over 1.8 s
  private func step(_ serial: Int) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.8 / Double(Self.steps)) {
      guard serial == printSerial, stage == .printing else { return }
      fed += 1
      if fed >= Self.steps {
        fed = Self.steps
        stage = .printed
        actions.onReceipt(.printed)
      } else {
        step(serial)
      }
    }
  }

  private func tear() {
    guard stage == .printed else { return }
    stage = .torn
    actions.onReceipt(.torn)
  }

  /// The receipt as a picture in tmp, handed to TS for the share sheet ("" when it couldn't be made).
  private func share() {
    let view = KAfterPaper(palette: KAfterPalette(), receipt: receipt, thing: thing, forShare: true)
      .padding(28)
      .background(Color(hex: "#F1F0EE"))
      .environment(\.colorScheme, .light)
    let renderer = ImageRenderer(content: view)
    renderer.scale = max(2, displayScale)
    renderer.isOpaque = true
    guard let image = renderer.uiImage, let data = image.pngData() else {
      actions.onShare("")
      return
    }
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("receipt-\(UUID().uuidString).png")
    do {
      try data.write(to: url, options: .atomic)
      actions.onShare(url.absoluteString)
    } catch {
      actions.onShare("")
    }
  }
}

/// The receipt itself, 264 wide. `forShare` leaves out what must not leave the phone.
struct KAfterPaper: View {
  let palette: KAfterPalette
  let receipt: KAfterReceipt
  let thing: KAfterThing
  var forShare = false

  var body: some View {
    let rows: [KAfterRow] = forShare ? receipt.rows.filter { !$0.unshared } : receipt.rows
    // a stranger's line never goes into the picture (the receipt only prints facts; this is the guard)
    let showsThing = !(forShare && thing.isLine)
    VStack(spacing: 0) {
      VStack(spacing: 7) {
        Text(receipt.shop)
          .kText(.system(13, .semibold, tracking: 0.2))
          .foregroundStyle(palette.paperInk)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(receipt.stampLine)
          .kText(.mono(9, .medium, tracking: 0.04))
          .foregroundStyle(palette.paperMute)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        rule
        ForEach(rows) { row in line(row) }
        rule
        ForEach(receipt.delivery) { row in line(row) }
        if showsThing {
          rule
          Text(thing.tag)
            .kText(.mono(9, .semibold, tracking: 0.14))
            .foregroundStyle(palette.noteTag)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text(thing.body)
            .kText(.content(13, lineHeight: 1.3))
            .foregroundStyle(palette.paperInk)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
          Text(thing.foot)
            .kText(.mono(9, .medium, tracking: 0.06))
            .foregroundStyle(palette.paperMute)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
        }
        KAfterBarcode(ink: palette.paperInk)
          .frame(height: 20)
          .padding(.top, 2)
      }
      .padding(.top, 24)
      .padding(.horizontal, 16)
      .padding(.bottom, 10)
      .frame(maxWidth: .infinity)
      .background(palette.paper)
      KAfterZigzag()
        .fill(palette.paper)
        .frame(height: 8)
    }
    .frame(width: KAfterReceiptView.paperWidth)
  }

  private var rule: some View {
    KAfterHLine()
      .stroke(palette.paperInk.opacity(0.5), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
      .frame(height: 1.5)
  }

  private func line(_ row: KAfterRow) -> some View {
    HStack(alignment: .bottom, spacing: 6) {
      Text(row.label)
        .kText(.mono(10, .medium, tracking: 0.04))
        .foregroundStyle(palette.paperInk)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      KAfterHLine()
        .stroke(palette.paperLeader, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, dash: [0.1, 4]))
        .frame(height: 1.5)
        .frame(minWidth: 12)
        .padding(.bottom, 3)
      Text(row.value)
        .kText(.mono(10, .semibold, tracking: 0.04))
        .foregroundStyle(row.strong ? palette.paperAccent : palette.paperInk)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .layoutPriority(1)
    }
  }
}

/// a horizontal line through the middle of its box (for dashes and dots)
struct KAfterHLine: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.minX, y: r.midY))
    p.addLine(to: CGPoint(x: r.maxX, y: r.midY))
    return p
  }
}

/// The receipt's bars: 2 on, 3 off, 1 on, 4 off, across.
struct KAfterBarcode: View {
  let ink: Color

  var body: some View {
    Canvas { context, size in
      var x: CGFloat = 0
      while x < size.width {
        context.fill(Path(CGRect(x: x, y: 0, width: min(2, size.width - x), height: size.height)), with: .color(ink))
        if x + 5 < size.width {
          context.fill(Path(CGRect(x: x + 5, y: 0, width: 1, height: size.height)), with: .color(ink))
        }
        x += 10
      }
    }
    .accessibilityHidden(true)
  }
}

/// The torn edge: teeth 8 wide, 8 deep, pointing down.
struct KAfterZigzag: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.minX, y: r.minY))
    var x = r.minX
    while x < r.maxX {
      p.addLine(to: CGPoint(x: min(x + 4, r.maxX), y: r.maxY))
      p.addLine(to: CGPoint(x: min(x + 8, r.maxX), y: r.minY))
      x += 8
    }
    p.closeSubpath()
    return p
  }
}
