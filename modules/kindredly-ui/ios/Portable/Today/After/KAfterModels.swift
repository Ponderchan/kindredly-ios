// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 TODAY, AFTER FIFTEEN (docs/today-after-fifteen.md; the owner's design "Today After Fifteen v2"
 and his decisions of 2026-11-11). When the day's last letter has gone past, Today's content is
 one of three pages until the morning, each carrying one small daily thing the reader can Keep,
 and under each a strip that opens her game:

   box      the card is a mailbox: a slot that stays open, a window with her in it and a cord;
            the cord brings a shutter down with a Closed sign and a note taped under it
   receipt  a printer that feeds out the day's (or the week's) receipt, torn off, kept or shared
   bedtime  she sits in an opened envelope: snack, pat, lights out; then she sleeps

 TS decides everything (lib/after-fifteen-core: which page, which thing, every number) and says
 every word; these files draw. What the reader does comes back through KAfterActions, and TS
 keeps it, so a page reopened later the same day is as it was left.

 This file: what the pages are told (KAfterContent and its parts), the taps (KAfterActions), and
 the colours (KAfterPalette: one table for the four themes).
 */

public enum KAfterPage: String, Sendable {
  case box
  case receipt
  case bedtime
}

/// The small daily thing: a line of the day, or one of her facts.
public struct KAfterThing: Equatable, Sendable {
  /// a stranger's line (true) or her fact (false): she says nothing of her own over a line
  public var isLine = false
  /// "POND'S FACT · NO. 12" / "LINE OF THE DAY"
  public var tag = ""
  /// the fact, or the line in its quotation marks
  public var body = ""
  /// under it: where and when for a fact, who wrote it and its topic for a line
  public var foot = ""
  /// KEEP / KEPT ✦, the capsule
  public var keep = ""
  public var kept = ""
  /// "Keep the stub" / "Kept ✦", the receipt's button
  public var keepStub = ""
  public var keptStub = ""
  public var isKept = false
  /// VoiceOver: what Keep does ("Saves it to Moments you kept")
  public var keepHint = ""

  public init() {}
}

/// The strip under every page: her game.
public struct KAfterStrip: Equatable, Sendable {
  /// she can play (not an egg, not wilted); when she can't the strip says when she is back
  public var canPlay = true
  /// POND'S OFF THE CLOCK
  public var eyebrow = ""
  /// "Fly a lap with Pond"
  public var title = ""
  public var hint = ""

  public init() {}
}

/// The hour's sky her game is played under (Free Flight's PALETTE[daylight()]), for the window on
/// a folding phone's right page (KAfterWindow). The defaults are the day's.
public struct KAfterSky: Equatable, Sendable {
  public var sky0 = Color(hex: "#BFE3F8")
  public var sky1 = Color(hex: "#E3F3FB")
  public var land = Color(hex: "#9CD48C")
  public var forest = Color(hex: "#3F8F52")
  /// the pillars' fill and their edge
  public var scrim = Color(hex: "#ADDBB5")
  public var pillarInk = Color(hex: "#1F5C33")
  public var sun: Color? = Color(hex: "#FFD54A")
  public var moon = false
  public var stars = false
  public var night = false

  public init() {}
}

public struct KAfterBox: Equatable, Sendable {
  /// “that's 10. i counted twice.”
  public var line = ""
  /// "You wrote back to 2." ("" when she has nothing to count)
  public var sub = ""
  /// PULL THE CORD →
  public var hint = ""
  /// "I pinned something to the shutter."
  public var pinned = ""
  /// THE SLOT STAYS OPEN · DROP A LETTER
  public var slot = ""
  /// OPENING YOUR LETTER PAPER…
  public var slotOpening = ""
  /// VoiceOver: the slot ("Write a letter")
  public var slotA11y = ""
  /// THAT'S ALL FOR TODAY
  public var eyebrow = ""
  /// Closed
  public var closed = ""
  /// BACK AT 8:00 AM
  public var back = ""
  /// 16H 40M
  public var countdown = ""
  /// PULL / LIFT, under the cord's ring
  public var pull = ""
  public var lift = ""
  /// VoiceOver: the cord
  public var pullA11y = ""
  public var liftA11y = ""
  /// the shutter is down
  public var shut = false

  public init() {}
}

public struct KAfterRow: Equatable, Identifiable, Sendable {
  public var id: String
  public var label: String
  public var value: String
  /// the countdown: drawn in the accent
  public var strong: Bool
  /// left out of the shared picture (a photo stamp's own #tag is a writer's words)
  public var unshared: Bool

  public init(id: String, label: String, value: String, strong: Bool = false, unshared: Bool = false) {
    self.id = id
    self.label = label
    self.value = value
    self.strong = strong
    self.unshared = unshared
  }
}

public enum KAfterReceiptPhase: String, Sendable {
  case idle
  case printed
  case torn
}

public struct KAfterReceipt: Equatable, Sendable {
  /// “that's 10. there's a little extra at the bottom.”
  public var line = ""
  /// KINDREDLY POST
  public var shop = ""
  /// "NOV 11 · 3:19 PM · COURIER POND"
  public var stampLine = ""
  /// the counts
  public var rows: [KAfterRow] = []
  /// when she is back
  public var delivery: [KAfterRow] = []
  /// "Print today's receipt" / "Print this week's receipt"
  public var print = ""
  /// PRINTING…
  public var printing = ""
  /// "Tear it off"
  public var tear = ""
  /// "Share my day" / "Share my week"
  public var share = ""
  public var phase = KAfterReceiptPhase.idle
  /// VoiceOver: the printed receipt, read as one
  public var a11y = ""

  public init() {}
}

public struct KAfterStep: Equatable, Sendable {
  /// Snack
  public var label = ""
  /// "a few seeds"
  public var sub = ""
  /// "fed"
  public var subDone = ""

  public init() {}

  public init(label: String, sub: String, subDone: String) {
    self.label = label
    self.sub = sub
    self.subDone = subDone
  }
}

public struct KAfterDot: Equatable, Identifiable, Sendable {
  public var id: String
  /// the weekday's letter
  public var letter: String
  /// the day counted
  public var on: Bool
  public var tonight: Bool

  public init(id: String, letter: String, on: Bool, tonight: Bool) {
    self.id = id
    self.letter = letter
    self.on = on
    self.tonight = tonight
  }
}

public struct KAfterBed: Equatable, Sendable {
  /// her lines, by what just happened
  public var sayIdle = ""
  public var sayFed = ""
  public var sayFull = ""
  public var sayPat = ""
  public var sayNeedSnack = ""
  public var sayNeedPat = ""
  public var snack = KAfterStep()
  public var pat = KAfterStep()
  public var lights = KAfterStep()
  /// "after 1 and 2"
  public var lockedSub = ""
  /// "POND, TALKING IN HER SLEEP" (her fact; a line is under the thing's own tag)
  public var sleepTag = ""
  /// before lights out: "5 days in a row" · "tonight makes 6"
  public var streak = ""
  public var streakSub = ""
  /// after: "6 days in a row" · "a full week"
  public var streakDone = ""
  public var streakSubDone = ""
  /// "next letters" · "8:00 AM"
  public var next = ""
  public var nextAt = ""
  /// the last seven days, tonight last
  public var dots: [KAfterDot] = []
  /// VoiceOver: the dots as one sentence, before and after lights out
  public var dotsA11y = ""
  public var dotsA11yDone = ""
  /// VoiceOver: her, as a button ("Pat Pond")
  public var birdA11y = ""
  public var fed = false
  public var patted = false
  public var asleep = false

  public init() {}
}

/// Everything a page shows.
public struct KAfterContent: Equatable, Sendable {
  public var page = KAfterPage.box
  /// "Today"
  public var title = ""
  /// who she is (her colour, her stage, what she wears); the pages set her mood and pose
  public var look = KWrenLook()
  public var thing = KAfterThing()
  public var strip = KAfterStrip()
  /// her game's sky at this hour (the folding phone's window)
  public var sky = KAfterSky()
  public var box = KAfterBox()
  public var receipt = KAfterReceipt()
  public var bed = KAfterBed()
  /// "Undo" while the day's last pass can still be taken back ("" = no capsule)
  public var undo = ""
  public var undoHint = ""

  public init() {}
}

/// What the reader did, back to TS.
public final class KAfterActions {
  /// the mailbox's slot: write a letter
  public var onSlot: () -> Void = {}
  /// the cord: the shutter is down (true) or lifted
  public var onShut: (Bool) -> Void = { _ in }
  /// Keep (true) or its undoing
  public var onKeep: (Bool) -> Void = { _ in }
  /// the receipt: printed, torn
  public var onReceipt: (KAfterReceiptPhase) -> Void = { _ in }
  /// the receipt's picture, a file URL in tmp ("" when it couldn't be made)
  public var onShare: (String) -> Void = { _ in }
  /// bedtime: "snack", "pat", "lights"
  public var onStep: (String) -> Void = { _ in }
  /// the strip: her game
  public var onPlay: () -> Void = {}
  /// Undo: bring the last letter back
  public var onUndo: () -> Void = {}

  public init() {}
}

// MARK: - Colour

/// The pages' colours for one theme. The mailbox is red in every theme (owner, 2026-11-11); the
/// rest follows the theme: Classic and Paper keep away from lavender (bedtime's room is lamp-lit
/// cream, then night blue), the Lavender theme keeps the prototype's own colours, Midnight has
/// its own. Fixed-colour things (the note's cream, the lime of Keep) carry their own ink.
public struct KAfterPalette: Equatable, Sendable {
  // the mailbox
  public var roof = Color(hex: "#D2574A")
  public var body = Color(hex: "#E46A5A")
  public var slot = Color(hex: "#1E1B35")
  /// the small line under the slot: ink on the red (5.15:1; white was 3.23:1)
  public var slotText = Color(hex: "#1E1B35")
  public var slatA = Color(hex: "#FBE6E1")
  public var slatB = Color(hex: "#F4D3CC")
  public var lip = Color(hex: "#D2574A")
  public var windowTop = Color(hex: "#FFFFFF")
  public var windowBottom = Color(hex: "#FFF5F1")
  public var tape = Color(hex: "#F4D3CC").opacity(0.95)
  /// PULL THE CORD →, on the window (the prototype's #C94F40 was 4.2:1; this is 5.6:1)
  public var hint = Color(hex: "#B23F31")
  public var ring = Color(hex: "#FFFFFF")
  /// the Closed sign
  public var sign = Color(hex: "#FFFFFF")
  public var signInk = Color(hex: "#1E1B35")
  public var signMute = Color(hex: "#77738F")
  // the note taped to the shutter (cream paper in every theme)
  public var note = Color(hex: "#FFF8E8")
  public var noteInk = Color(hex: "#1E1B35")
  public var noteTag = Color(hex: "#94681C")
  public var noteFoot = Color(hex: "#6B6785")
  public var noteKeep = Color(hex: "#FFFFFF")
  // the card of the receipt and of bedtime
  public var card = Color(hex: "#FFFFFF")
  public var cardLine = Color(hex: "#E6E4EC")
  public var cardShadow = Color(hex: "#D5D0F5")
  // the printer and its paper
  public var printer = Color(hex: "#C4BEF0")
  public var printerSlot = Color(hex: "#8E87D6")
  public var paper = Color(hex: "#FFFFFF")
  public var paperInk = Color(hex: "#1E1B35")
  public var paperMute = Color(hex: "#77738F")
  public var paperLeader = Color(hex: "#B6B2D0")
  /// the countdown on the paper (the paper is light in every theme, so this is not the theme's accent)
  public var paperAccent = Color(hex: "#3A34D6")
  public var paperShadow = Color(hex: "#1E1B35").opacity(0.18)
  // bedtime
  public var roomTop = Color(hex: "#FFF1D6")
  public var roomBottom = Color(hex: "#FFFAF0")
  public var nightTop = Color(hex: "#2B3A67")
  public var nightBottom = Color(hex: "#55659C")
  public var moon = Color(hex: "#FFF8E8")
  public var zed = Color(hex: "#FFF8E8")
  public var flap = Color(hex: "#F4F3FA")
  public var envelope = Color(hex: "#FFFFFF")
  public var envelopeLine = Color(hex: "#E1DFF0")
  public var fold = Color(hex: "#E6E4EC")
  public var seal = Color(hex: "#D8A63F")
  /// the card over her once she sleeps
  public var sleepCard = Color(hex: "#FFFFFF").opacity(0.93)
  public var sleepKeep = Color(hex: "#F1F0EE")
  public var snackFill = Color(hex: "#F6E7C6")
  public var snackInk = Color(hex: "#94681C")
  public var patFill = Color(hex: "#F3C6D4")
  public var patInk = Color(hex: "#A83C5E")
  public var lightsFill = Color(hex: "#CFE3F5")
  public var lightsInk = Color(hex: "#2B557F")
  public var lockedFill = Color(hex: "#F1F0EE")
  public var lockedIcon = Color(hex: "#B6B2D0")
  public var lockedInk = Color(hex: "#6B6785")
  public var stepInk = Color(hex: "#1E1B35")
  public var stepSub = Color(hex: "#55506E")
  public var stepDisc = Color(hex: "#FFFFFF")
  public var streakBar = Color(hex: "#F1F0EE")
  public var dotOn = Color(hex: "#3A34D6")
  public var dotOnInk = Color(hex: "#FFFFFF")
  public var dotRing = Color(hex: "#B6B2D0")
  public var dotOff = Color(hex: "#FFFFFF")
  public var heart = Color(hex: "#E8607A")
  // the strip
  public var stripTop = Color(hex: "#CFE3F5")
  public var stripBottom = Color(hex: "#E6F1F8")
  /// the strip's small label (the prototype's #3B6E9B was 3.9:1 on this sky; this is 6:1)
  public var stripLabel = Color(hex: "#2B557F")
  public var stripInk = Color(hex: "#1E1B35")
  // shared
  public var lime = Color(hex: "#D8F04A")
  public var limeInk = Color(hex: "#1E1B35")
  public var accent = Color(hex: "#3A34D6")
  public var softShadow = Color(hex: "#1E1B35").opacity(0.35)

  public init() {}

  /// The table. Classic is the record's own defaults.
  public static func of(_ theme: KTheme) -> KAfterPalette {
    var p = KAfterPalette()
    p.accent = theme.ind
    p.dotOn = theme.ind
    p.card = theme.sf
    p.cardLine = theme.line
    switch theme.key {
    case "lavender":
      // the prototype's own lavender room and dusk
      p.cardLine = Color(hex: "#E6E4EC")
      p.roomTop = Color(hex: "#EEEDFB")
      p.roomBottom = Color(hex: "#F8F7FD")
      p.nightTop = Color(hex: "#B9B2EC")
      p.nightBottom = Color(hex: "#DAD6F6")
      p.zed = Color(hex: "#3A34D6")
      p.sleepKeep = Color(hex: "#EEEDFB")
      p.lightsFill = Color(hex: "#E4E2F4")
      p.lightsInk = Color(hex: "#3A34D6")
      p.lockedFill = Color(hex: "#F6F5FB")
      p.streakBar = Color(hex: "#F6F5FB")
      p.dotRing = Color(hex: "#C9C4F2")
      p.noteKeep = Color(hex: "#EEEDFB")
    case "paper":
      p.windowBottom = Color(hex: "#FFF3EC")
      p.cardShadow = Color(hex: "#E2D8BF")
      p.printer = Color(hex: "#D9CDAE")
      p.printerSlot = Color(hex: "#8E8878")
      p.lockedFill = theme.soft2
      p.streakBar = theme.soft2
      p.sleepKeep = theme.soft2
      p.envelopeLine = Color(hex: "#E6DFCF")
      p.fold = Color(hex: "#E6DFCF")
      p.flap = Color(hex: "#F6EEDB")
      p.envelope = Color(hex: "#FFFDF8")
    case "midnight":
      p.roof = Color(hex: "#C4554A")
      p.body = Color(hex: "#D9655A")
      p.lip = Color(hex: "#C4554A")
      p.slot = Color(hex: "#0F0E1C")
      p.slotText = Color(hex: "#0F0E1C")
      p.slatA = Color(hex: "#3B2A33")
      p.slatB = Color(hex: "#32232B")
      p.windowTop = Color(hex: "#242150")
      p.windowBottom = Color(hex: "#1A1830")
      p.tape = Color(hex: "#F4D3CC").opacity(0.85)
      p.hint = Color(hex: "#FFB4A8")
      p.sign = theme.soft2
      p.signInk = theme.ink
      p.signMute = theme.mute
      p.cardShadow = theme.line
      p.printer = Color(hex: "#4A4580")
      p.printerSlot = Color(hex: "#1A1830")
      p.paper = Color(hex: "#F4F2EA")
      p.paperShadow = Color.black.opacity(0.4)
      p.roomTop = Color(hex: "#3A3050")
      p.roomBottom = Color(hex: "#2B2740")
      p.nightTop = Color(hex: "#0F0E1C")
      p.nightBottom = Color(hex: "#1F2440")
      p.flap = Color(hex: "#DAD6F2")
      p.envelope = Color(hex: "#F4F2EA")
      p.sleepCard = theme.soft2.opacity(0.95)
      p.sleepKeep = Color(hex: "#30343A")
      p.lockedFill = theme.soft2
      p.lockedIcon = theme.faint
      p.lockedInk = theme.sub
      p.streakBar = theme.soft2
      p.dotOff = theme.sf
      p.dotRing = theme.faint
      p.dotOnInk = Color(hex: "#0F0E1C")
      p.stripTop = Color(hex: "#1F2D45")
      p.stripBottom = Color(hex: "#26375A")
      p.stripLabel = Color(hex: "#A9C8EC")
      p.stripInk = theme.ink
      p.softShadow = Color.black.opacity(0.5)
    default:
      break
    }
    /* the mailbox without its box (owner, 2026-11-12: "红色邮筒…晚上太吓人"): what was in its window
       is drawn on the theme's own card, so nothing on it is red in any theme. The cord and the
       shutter's foot are a quiet ink, the cord's ring is the card with that ink round it (no white
       ring on a dark card), PULL THE CORD is the colour of everything that can be tapped, the
       slats are the theme's own greys, and the note's tape is plain paper tape. */
    p.lip = theme.mute
    p.ring = theme.sf
    p.hint = theme.ind
    p.slatA = theme.soft2
    p.slatB = theme.line
    p.tape = Color(hex: "#E9DFC4").opacity(0.9)
    return p
  }
}

// MARK: - Small shared pieces

/// A value that eases up and down for ever (a bob, a swing, a breath). Still under Reduce Motion.
struct KAfterSway: ViewModifier {
  let period: Double
  let active: Bool
  let apply: (AnyView, CGFloat) -> AnyView

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var phase: CGFloat = 0

  func body(content: Content) -> some View {
    let moving = active && !reduceMotion
    return apply(AnyView(content), moving ? phase : 0)
      .onAppear { start(moving) }
      .onChange(of: moving) { _, now in start(now) }
  }

  private func start(_ moving: Bool) {
    guard moving else {
      phase = 0
      return
    }
    phase = 0
    withAnimation(.easeInOut(duration: period / 2).repeatForever(autoreverses: true)) { phase = 1 }
  }
}

extension View {
  /// up and down by `amount` points, once every `period` seconds
  func kAfterBob(_ amount: CGFloat, period: Double, active: Bool = true) -> some View {
    modifier(KAfterSway(period: period, active: active) { view, t in AnyView(view.offset(y: -amount * t)) })
  }

  /// between two angles, once every `period` seconds
  func kAfterSwing(from: Double, to: Double, period: Double, active: Bool = true) -> some View {
    modifier(KAfterSway(period: period, active: active) { view, t in
      AnyView(view.rotationEffect(.degrees(from + (to - from) * Double(t))))
    })
  }

  /// a breath: up to `scale`, once every `period` seconds
  func kAfterBreathe(_ scale: CGFloat, period: Double, active: Bool = true) -> some View {
    modifier(KAfterSway(period: period, active: active) { view, t in
      AnyView(view.scaleEffect(1 + (scale - 1) * t, anchor: .bottom))
    })
  }
}

/// KEEP / KEPT ✦: the small capsule on the note and on the card over her.
struct KAfterKeepCapsule: View {
  let thing: KAfterThing
  let palette: KAfterPalette
  /// the capsule's fill while not kept (it sits on cream, or on white)
  let off: Color
  let offInk: Color
  let onKeep: (Bool) -> Void

  var body: some View {
    let kept = thing.isKept
    Button {
      onKeep(!kept)
    } label: {
      Text(kept ? thing.kept : thing.keep)
        .kText(.mono(9, .semibold, tracking: 0.1))
        .foregroundStyle(kept ? palette.limeInk : offInk)
        .lineLimit(1)
        .padding(.horizontal, 10)
        .frame(height: 24)
        .background(kept ? palette.lime : off, in: Capsule())
        // the capsule is 24 high; the tap takes 44
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .padding(.vertical, -10)
    .accessibilityHint(kept ? "" : thing.keepHint)
    .accessibilityAddTraits(kept ? .isSelected : [])
    .sensoryFeedback(.selection, trigger: kept)
  }
}

/// The card of the receipt and of bedtime: the surface and a hairline, flat, with the corners of
/// the mailbox's card and Today's letter. (It had a block of colour 5 behind it for a shadow; the
/// owner, 2026-11-12: "信卡 或者 拉下来帘子 没有厚立体阴影了哦".)
struct KAfterCard<Inner: View>: View {
  let palette: KAfterPalette
  @ViewBuilder var inner: () -> Inner

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: KAfterBoxView.corner, style: .continuous)
    inner()
      .padding(18)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(palette.card, in: shape)
      .clipShape(shape)
      .overlay(shape.strokeBorder(palette.cardLine, lineWidth: 1))
  }
}
