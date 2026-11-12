// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 F1, THE MAILBOX, NOW ONLY ITS INSIDE (owner, 2026-11-12, at night: "这个红色邮筒的这个感觉晚上太吓人
 了 要么把邮筒去掉留下这里面的?"). The red box is gone (its roof, body, base and slot, and the
 envelope that fell into the slot): the page is what was in its window, on the app's own card
 (the theme's surface, a hairline, the corners of Today's letter), with no red on it anywhere.
 Flat: the Closed sign, the note and the cord's ring cast no shadow ("没有厚立体阴影了哦").
 Writing after the day is the + in the tab bar, as everywhere else. The record's slot words
 still come from TS and are simply not drawn. What it was (2026-11-11):

   ╭──────────────╮   the domed roof, full width, 72
    │   ▬▬▬▬▬▬▬▬   │   the body, 14 in from each side: the slot (150 × 16) and the small line
    │ ┌──────────┐ │   under it, in ink on the red; then the window, all the room that is left
    │ │  her  ┆  │ │     open: her, her count of the day, PULL THE CORD →, and the cord at its
    │ │       ◯  │ │           right edge
    │ └──────────┘ │     shut: the shutter rides down from the top (0.8 s) with what hangs on
   ╰──────────────╯           it: the Closed sign, and under it the note with the small thing
                       the base, full width, 16

 The slot stays open whatever the shutter does: a tap drops an envelope into it (1 s) and then
 the composer opens (TS). The cord toggles: a tap, or a pull down (a push up to lift). TS keeps
 whether it is shut for the day, so the page comes back as it was left.

 Reduce Motion: nothing bobs or swings, the shutter fades instead of riding, the envelope is not
 shown and the composer opens at once.
 */
struct KAfterBoxView: View {
  static let corner: CGFloat = 24

  let theme: KTheme
  let palette: KAfterPalette
  let box: KAfterBox
  let thing: KAfterThing
  let look: KWrenLook
  let actions: KAfterActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var shut: Bool

  init(theme: KTheme, palette: KAfterPalette, box: KAfterBox, thing: KAfterThing, look: KWrenLook, actions: KAfterActions) {
    self.theme = theme
    self.palette = palette
    self.box = box
    self.thing = thing
    self.look = look
    self.actions = actions
    _shut = State(initialValue: box.shut)
  }

  var body: some View {
    window
      .onChange(of: box.shut) { _, now in
        if now != shut { shut = now }
      }
      .sensoryFeedback(.impact(weight: .medium), trigger: shut)
  }

  // MARK: the window

  private var window: some View {
    GeometryReader { geo in
      let w = geo.size.width
      let h = geo.size.height
      let shape = RoundedRectangle(cornerRadius: Self.corner, style: .continuous)
      ZStack(alignment: .topLeading) {
        palette.card
        open
          .padding(.leading, 20)
          .padding(.trailing, 60)
          .padding(.vertical, 16)
          .frame(width: w, height: h)
          .opacity(shut && reduceMotion ? 0 : 1)
          .accessibilityHidden(shut)
        shutter(w: w, h: h)
          .offset(y: shut || reduceMotion ? 0 : -h)
          .opacity(reduceMotion ? (shut ? 1 : 0) : 1)
          .accessibilityHidden(!shut)
        cord(h: h)
          .frame(width: w, alignment: .trailing)
      }
      .frame(width: w, height: h)
      .clipShape(shape)
      .overlay { shape.strokeBorder(palette.cardLine, lineWidth: 1) }
      .animation(reduceMotion ? .easeInOut(duration: 0.2) : .timingCurve(0.5, 0, 0.2, 1, duration: 0.8), value: shut)
    }
  }

  private var bird: KWrenLook {
    var l = look
    l.pose = .perch
    l.mood = .content
    return l
  }

  private var open: some View {
    VStack(spacing: 10) {
      KWrenBird(bird, size: 112)
        .kAfterBob(6, period: 3, active: !shut)
      Text(box.line)
        .kText(.content(20, italic: true, lineHeight: 1.2))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
      if !box.sub.isEmpty {
        Text(box.sub)
          .kText(.system(14))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
      }
      Text(box.hint)
        .kText(.mono(9, .semibold, tracking: 0.14))
        .foregroundStyle(palette.hint)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .padding(.top, 6)
      Text(box.pinned)
        .kText(.system(12))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
    }
    .accessibilityElement(children: .combine)
  }

  /// The shutter and what hangs on it. It is as tall as the window and rides in from above.
  private func shutter(w: CGFloat, h: CGFloat) -> some View {
    // the cord keeps the right 52; the sign and the note share the rest
    let room: CGFloat = max(120, w - 52)
    let noteW: CGFloat = min(224, room - 18)
    let signW: CGFloat = min(204, noteW - 20)
    return ZStack(alignment: .topLeading) {
      KAfterSlats(a: palette.slatA, b: palette.slatB)
      // a short window (a small phone, a long fact, large type) takes the smaller pair
      ViewThatFits(in: .vertical) {
        hangings(signW: signW, noteW: noteW, compact: false)
        hangings(signW: signW, noteW: noteW, compact: true)
      }
      .frame(width: room, height: max(0, h - 8))
      Rectangle()
        .fill(palette.lip)
        .frame(width: w, height: 8)
        .offset(y: h - 8)
    }
    .frame(width: w, height: h, alignment: .topLeading)
  }

  /// the Closed sign and, under it, the note
  private func hangings(signW: CGFloat, noteW: CGFloat, compact: Bool) -> some View {
    VStack(spacing: compact ? 12 : 16) {
      sign(compact: compact)
        .frame(width: signW)
        .kAfterSwing(from: -3, to: 2, period: 3, active: shut)
      note(compact: compact)
        .frame(width: noteW)
        .rotationEffect(.degrees(2))
    }
    .padding(.vertical, compact ? 10 : 14)
  }

  private func sign(compact: Bool) -> some View {
    VStack(spacing: compact ? 3 : 5) {
      if !compact {
        Text(box.eyebrow)
          .kText(.mono(9, .medium, tracking: 0.18))
          .foregroundStyle(palette.signMute)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
      }
      Text(box.closed)
        .kText(.system(compact ? 22 : 32, .bold, lineHeight: 1))
        .foregroundStyle(palette.signInk)
        .lineLimit(1)
        .minimumScaleFactor(0.5)
      Text(box.back)
        .kText(.mono(10, .medium, tracking: 0.14))
        .foregroundStyle(palette.signInk)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
      Text(box.countdown)
        .kText(.system(14, .semibold))
        .foregroundStyle(palette.accent)
        .lineLimit(1)
        .monospacedDigit()
    }
    .padding(.vertical, compact ? 9 : 14)
    .padding(.horizontal, 10)
    .frame(maxWidth: .infinity)
    .background(palette.sign, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    .accessibilityElement(children: .combine)
  }

  private func note(compact: Bool) -> some View {
    KAfterThingNote(
      thing: thing,
      palette: palette,
      tag: thing.tag,
      tagInk: palette.noteTag,
      ink: palette.noteInk,
      footInk: palette.noteFoot,
      keepOff: palette.noteKeep,
      keepInk: palette.noteInk,
      size: compact ? 13 : 15,
      italic: false,
      onKeep: actions.onKeep
    )
    .padding(.top, compact ? 13 : 16)
    .padding(.horizontal, compact ? 12 : 14)
    .padding(.bottom, compact ? 9 : 12)
    .background(palette.note, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    .overlay(alignment: .top) {
      Rectangle()
        .fill(palette.tape)
        .frame(width: 54, height: 18)
        .rotationEffect(.degrees(-4))
        .offset(y: -9)
        .accessibilityHidden(true)
    }
  }

  /// The cord at the window's right edge: a line, a ring, PULL or LIFT under it.
  private func cord(h: CGFloat) -> some View {
    let long: CGFloat = min(250, max(150, h - 44))
    let length: CGFloat = shut ? long : 120
    return Button(action: toggle) {
      VStack(spacing: 0) {
        Rectangle()
          .fill(palette.lip)
          .frame(width: 2)
          .frame(maxHeight: .infinity)
        Circle()
          .fill(palette.ring)
          .frame(width: 30, height: 30)
          .overlay(Circle().stroke(palette.lip, lineWidth: 3).padding(-1.5))
          .kAfterBob(4, period: 1.6, active: !shut)
        Text(shut ? box.lift : box.pull)
          .kText(.mono(9, .semibold, tracking: 0.14))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .fixedSize()
          .padding(.top, 6)
      }
      .frame(width: 44, height: length)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .simultaneousGesture(
      DragGesture(minimumDistance: 12).onEnded { g in
        // a pull down shuts it, a push up lifts it
        if !shut && g.translation.height > 24 { toggle() } else if shut && g.translation.height < -24 { toggle() }
      }
    )
    .padding(.trailing, 10)
    .accessibilityLabel(shut ? box.liftA11y : box.pullA11y)
  }

  private func toggle() {
    shut.toggle()
    actions.onShut(shut)
  }
}

/// The shutter's slats: 12 of one tone, 2 of the next, down the whole height.
struct KAfterSlats: View {
  let a: Color
  let b: Color

  var body: some View {
    Canvas { context, size in
      context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(a))
      var y: CGFloat = 12
      while y < size.height {
        context.fill(Path(CGRect(x: 0, y: y, width: size.width, height: 2)), with: .color(b))
        y += 14
      }
    }
    .accessibilityHidden(true)
  }
}
