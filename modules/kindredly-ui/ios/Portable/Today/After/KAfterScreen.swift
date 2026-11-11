// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE PAGE TODAY BECOMES AFTER THE LAST LETTER (docs/today-after-fifteen.md), top to bottom:

   the status bar's room (topInset)
   Today                         the title where the desk leaves it once a letter has gone past:
                                 small, centred in its band (KTodayHeader's locked look)
   ┌───────────────────────┐
   │ the mailbox, the       │    the page's card takes all the room there is
   │ receipt, or bedtime    │
   └───────────────────────┘
   [ ✈ POND'S OFF THE CLOCK · Fly a lap with Pond  ▶ ]     the strip, 52
   the tab bar's room (bottomInset)

 For five seconds after the day's last pass an Undo capsule stands over the strip (the desk's own
 undo: TS counts the seconds and sends the word while it is offered).

 The layout is a fixed page, not a scroll: the type stops growing at xxLarge, and the pages give
 their words room to wrap inside the card.
 */
public struct KAfterScreen: View {
  let theme: KTheme
  let content: KAfterContent
  let topInset: CGFloat
  let bottomInset: CGFloat
  let actions: KAfterActions
  /// false only for the check sheets: ImageRenderer draws nothing inside a ScrollView
  var scrolls = true

  public init(theme: KTheme, content: KAfterContent, topInset: CGFloat = 0, bottomInset: CGFloat = 0, actions: KAfterActions = KAfterActions()) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  /// the title's band (the desk's: KTodayGeometry.band)
  static let band: CGFloat = 52
  static let gutter: CGFloat = 16
  static let gap: CGFloat = 10

  public var body: some View {
    let palette = KAfterPalette.of(theme)
    VStack(spacing: 0) {
      title
      VStack(spacing: Self.gap) {
        card(palette)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
        KAfterStripView(theme: theme, palette: palette, strip: content.strip, look: content.look, onPlay: actions.onPlay)
      }
      .overlay(alignment: .bottom) { undo }
      .padding(.horizontal, Self.gutter)
    }
    .padding(.top, topInset)
    .padding(.bottom, bottomInset + 12)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(theme.bg.ignoresSafeArea())
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }

  /// "Today", as the desk's header draws it once locked: its 22 semibold at 17/22, raised 9
  private var title: some View {
    Text(content.title)
      .kText(.system(22, .semibold))
      .foregroundStyle(theme.ink)
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .scaleEffect(17.0 / 22.0)
      .offset(y: -9)
      .frame(maxWidth: .infinity)
      .frame(height: Self.band)
      .dynamicTypeSize(...DynamicTypeSize.accessibility1)
      .accessibilityAddTraits(.isHeader)
  }

  @ViewBuilder
  private func card(_ palette: KAfterPalette) -> some View {
    switch content.page {
    case .box:
      KAfterBoxView(theme: theme, palette: palette, box: content.box, thing: content.thing, look: content.look, actions: actions)
    case .receipt:
      KAfterReceiptView(theme: theme, palette: palette, receipt: content.receipt, thing: content.thing, look: content.look, actions: actions, scrolls: scrolls)
    case .bedtime:
      KAfterBedView(theme: theme, palette: palette, bed: content.bed, thing: content.thing, look: content.look, actions: actions)
    }
  }

  /// Undo, over the strip, while TS offers it
  @ViewBuilder
  private var undo: some View {
    if !content.undo.isEmpty {
      Button(action: actions.onUndo) {
        Text(content.undo)
          .kText(.system(15, .semibold))
          .foregroundStyle(theme.bg)
          .padding(.horizontal, 18)
          .frame(height: 44)
          .background(theme.ink, in: Capsule())
      }
      .buttonStyle(.plain)
      .accessibilityHint(content.undoHint)
      .padding(.bottom, 62)
      .transition(.opacity)
    }
  }
}

/// The strip under every page: her game. One button, 52 high.
struct KAfterStripView: View {
  let theme: KTheme
  let palette: KAfterPalette
  let strip: KAfterStrip
  let look: KWrenLook
  let onPlay: () -> Void

  var body: some View {
    if strip.canPlay {
      Button(action: onPlay) { row }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityHint(strip.hint)
    } else {
      row.accessibilityElement(children: .combine)
    }
  }

  private var flying: KWrenLook {
    var l = look
    l.pose = strip.canPlay ? .fly : .perch
    l.mood = strip.canPlay ? .happy : .sleepy
    // off the clock: nothing in her feet
    l.letter = false
    return l
  }

  private var row: some View {
    let shape = RoundedRectangle(cornerRadius: 18, style: .continuous)
    return HStack(spacing: 10) {
      KWrenBird(flying, size: 36)
      VStack(alignment: .leading, spacing: 1) {
        if !strip.eyebrow.isEmpty {
          Text(strip.eyebrow)
            .kText(.mono(9, .medium, tracking: 0.14))
            .foregroundStyle(palette.stripLabel)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        Text(strip.title)
          .kText(.system(15, .semibold))
          .foregroundStyle(palette.stripInk)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      if strip.canPlay {
        ZStack {
          Circle().fill(palette.lime)
          KAfterPlayGlyph()
            .fill(palette.limeInk)
            .frame(width: 12, height: 14)
            .offset(x: 1)
        }
        .frame(width: 36, height: 36)
        .accessibilityHidden(true)
      }
    }
    .padding(.leading, 10)
    .padding(.trailing, 8)
    .frame(minHeight: 52)
    .background(LinearGradient(colors: [palette.stripTop, palette.stripBottom], startPoint: .top, endPoint: .bottom), in: shape)
    .contentShape(shape)
  }
}

/// the play triangle (the prototype's M1 1l10 6-10 6z on 12 × 14)
struct KAfterPlayGlyph: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    let sx = rect.width / 12
    let sy = rect.height / 14
    p.move(to: CGPoint(x: rect.minX + 1 * sx, y: rect.minY + 1 * sy))
    p.addLine(to: CGPoint(x: rect.minX + 11 * sx, y: rect.minY + 7 * sy))
    p.addLine(to: CGPoint(x: rect.minX + 1 * sx, y: rect.minY + 13 * sy))
    p.closeSubpath()
    return p
  }
}

/// The small thing as a note's contents: its tag, its words, what stands under them and Keep.
/// The mailbox tapes it to the shutter; bedtime sets it on the card over her.
struct KAfterThingNote: View {
  let thing: KAfterThing
  let palette: KAfterPalette
  /// the tag over the words (bedtime says "…, TALKING IN HER SLEEP" over her fact)
  let tag: String
  let tagInk: Color
  let ink: Color
  let footInk: Color
  let keepOff: Color
  let keepInk: Color
  /// the words' size (15 on the note, 16 over her)
  let size: CGFloat
  let italic: Bool
  let onKeep: (Bool) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(tag)
        .kText(.mono(9, .semibold, tracking: 0.14))
        .foregroundStyle(tagInk)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      Text(thing.body)
        .kText(.content(size, italic: italic, lineHeight: 1.3))
        .foregroundStyle(ink)
        .fixedSize(horizontal: false, vertical: true)
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity, alignment: .leading)
      HStack(spacing: 8) {
        Text(thing.foot)
          .kText(.mono(9, .medium, tracking: 0.06))
          .foregroundStyle(footInk)
          .lineLimit(1)
          .truncationMode(.tail)
          .frame(maxWidth: .infinity, alignment: .leading)
        KAfterKeepCapsule(thing: thing, palette: palette, off: keepOff, offInk: keepInk, onKeep: onKeep)
      }
      .padding(.top, 2)
    }
  }
}
