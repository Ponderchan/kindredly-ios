// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 MAKE YOUR OWN FACE (owner, 2026-10-26; the design is Downloads/export 2/make-your-own-face:
 CLAUDE-CODE-PROMPTS-MAKE-YOUR-OWN-FACE.md, variant V1 "the easel, in a floating card" with V4's
 word chips). A photo or a few words become a face drawn in the official faces' style. The route
 is src/app/make-face.tsx; every word and every decision is TS's (screens/make-face): this draws
 the screen TS names and reports taps.

 THE CONTAINER: a dim over the screen below (rgba(30,27,53,.35)) and one floating card, 8 from the
 sides and the bottom and 120 from the top (the keyboard's top while the words are being typed,
 when the card rises to just under the status bar), corners of 34, the theme's surface, a 40 × 5
 grabber; 12 22 22 inside. It rises 40 → 0 with a fade (.35s, cubic-bezier(.3,1,.3,1)). A tap on
 the dim, a swipe down or VoiceOver's escape close it; while Wren paints they LEAVE instead (the
 drawing goes on and she knocks when it's done). Done is the one full-screen page.

 THE SCREENS (KMakeFaceScreen; pt = the prototype's px at 402 × 874):
 - intro      Wren (curious, 72, bobbing 3s), her line in the Letter font italic 22, the sub
              15 on 1.5, two lav2 note rows (13, a 16 ind icon), Let's go (primary).
 - method     the title 22/700, three 64-tall lav2 rows (corners 18): a 40 surface box with a 20
              ind icon, the name 16/600, its hint 12 mute. Under 18 the two photo rows are .45
              and can't be pressed, and one line (12 mute) says why.
 - confirm    "Use this photo?", the photo 220 × 260 (corners 22) with a dashed oval guide and
              ONE PERSON · FACE CLEAR (mono 9), Retake (secondary) · Use this photo (primary, 1.4).
 - words      "Tell Wren about your face", the field (lav2, at least 120 tall, corners 18; system
              17; its placeholder faint; n/120 in mono 10 under it), the chips in three groups
              (mono 9 heads; 32-tall capsules, 13/600 ind, the surface colour, lav once their words
              are in the field: a tap adds the words, another takes them out), Draw me (primary,
              .45 while the field is empty).
 - generating THE EASEL: a 180 × 200 white canvas (corners 14, the object's hard shadow, no ink
              edge) over an 8pt ledge in the shadow's colour; on it, abstract colour washes, a
              brush sweep, blocks, a scribble and dots are laid one by one and start over —
              NEVER a face (owner's change to V1: nothing pretends to be the result). Wren (64)
              at its foot paints, a 26 × 4 ink brush swinging with her (1.4s). Her line (the
              Letter font italic 20) changes every 4s; "you can leave — wren will knock" (13 mute)
              is a button that leaves.
 - result     V1's reveal: the face in a 184 circle (8 white inside it, the object's shadow)
              popping in (.45s), "done. look.", the 13 mute line; This is me (primary); Make
              another (44, soft, mute, with the gold 1ST tag unless First Class) · Pick a face
              instead (44, lav).
 - done       full screen (onboarding's purple whatever the theme; Me's pale page): the stamp
              frame 170 × 200 (white, corners 6, a 2pt dashed #C9C4F2 inner frame, the object's
              shadow — #3F3BB8 on the purple), the face (124) flying in, KINDREDS ONLY (mono 8),
              Wren (delight, 56, bobbing), the line (Letter italic 21), Continue / Done.
 - rejected   Wren (curious, 72), her line (Letter italic 22), the sub, THIS ONE DIDN'T COUNT (mono
              10 on pale green), the two buttons TS names (secondary · primary 1.3).
 - failed     the same, "the line dropped. try again?", Retry (primary) and Not now.
 - quota      the face made (120, the object's shadow) with the gold FIRST CLASS tag tilted on it,
              the title 22/700, the sub, See First Class (ink, a 2pt gold edge inside), Not now.
 - signin     Wren (64), Keep this face, the sub, Continue with Apple (ink), Continue with Google
              (lav), Later.

 Rule B (owner, 2026-10-26): every control is flat (pen-blue filled capsule, lav capsule, no ink
 edge, no hard shadow); only objects — the canvas, the result's frame, the stamp frame, the quota's
 face — keep depth, through kObjectDepth. Type through .kText only: the system face for the
 interface, SF Mono capitals for labels, the Letter font italic for Wren's lines. Wren is React
 Native's own WrenBird (the "wren" island, sized by TS to the screen: KMakeFacePage.wrenSize).
 Reduce Motion: no bobbing, painting or flying; the canvas shows its layers still; fades only.
 */

/// Which screen the card shows (TS decides).
public enum KMakeFaceScreen: String, Sendable {
  case intro, method, confirm, words, generating, result, done, rejected, failed, quota, signin
}

/// Where the flow was opened from: the done page's ground.
public enum KMakeFaceEntry: String, Sendable {
  case onboarding, me
}

/// The three ways in.
public enum KMakeFaceMethod: String, Sendable {
  case camera, library, words
}

/// One chip: its id, and its label, which is also the words it puts in the field.
public struct KMakeFaceChip: Identifiable, Equatable, Sendable {
  public let id: String
  public let label: String

  public init(id: String, label: String) {
    self.id = id
    self.label = label
  }
}

/// A group of chips under a mono head (hair, face, accessories).
public struct KMakeFaceChipGroup: Identifiable, Equatable, Sendable {
  public let id: String
  public let title: String
  public let chips: [KMakeFaceChip]

  public init(id: String, title: String, chips: [KMakeFaceChip]) {
    self.id = id
    self.title = title
    self.chips = chips
  }
}

/// Every word of the flow, resolved by TS (the rejected screen's for its reason, the intro's
/// second row for free / used / First Class, the done page's button for its entry).
public struct KMakeFaceStrings: Equatable, Sendable {
  public var closeLabel = ""
  public var introLine = ""
  public var introSub = ""
  public var introPhoto = ""
  public var introQuota = ""
  public var go = ""
  public var methodTitle = ""
  public var camera = ""
  public var library = ""
  public var photoSub = ""
  public var wordsRow = ""
  public var wordsSub = ""
  public var at18 = ""
  public var minorLine = ""
  public var confirmTitle = ""
  public var confirmGuide = ""
  public var retake = ""
  public var usePhoto = ""
  public var wordsTitle = ""
  public var wordsPlaceholder = ""
  public var draw = ""
  public var wordsLabel = ""
  public var genLeave = ""
  public var knockTitle = ""
  public var knockBody = ""
  public var knockWatch = ""
  public var knockAllow = ""
  public var knockInstead = ""
  public var knockWatching = ""
  public var knockOn = ""
  public var knockOff = ""
  public var knockLeave = ""
  public var knockLeaveQuiet = ""
  public var genLabel = ""
  public var resultLine = ""
  public var resultSub = ""
  public var resultLabel = ""
  public var accept = ""
  public var another = ""
  public var lock = ""
  public var instead = ""
  public var doneTag = ""
  public var doneLine = ""
  public var doneButton = ""
  public var rejectBadge = ""
  public var rejectLine = ""
  public var rejectSub = ""
  public var rejectPrimary = ""
  /// "" for none
  public var rejectSecondary = ""
  public var failedLine = ""
  public var failedSub = ""
  public var retry = ""
  public var notNow = ""
  public var quotaTag = ""
  public var quotaTitle = ""
  public var quotaSub = ""
  public var quotaCta = ""
  public var signinTitle = ""
  public var signinSub = ""
  public var apple = ""
  public var google = ""
  public var later = ""

  public init() {}
}

/// Everything the page draws.
public struct KMakeFaceContent: Equatable, Sendable {
  public var screen: KMakeFaceScreen = .intro
  public var entry: KMakeFaceEntry = .me
  public var strings = KMakeFaceStrings()
  /// under 18: the photo rows are off
  public var minor = false
  /// the photo to confirm (a small JPEG in tmp, deleted once it is sent)
  public var photo: KImageRef?
  /// the face Wren made (result and done)
  public var result: KImageRef?
  /// the quota card's face (the one made); nil draws the + disc
  public var quotaFace: KImageRef?
  /// the drawings to choose from on the result (owner, 2026-10-31: three); empty or one: no choice
  public var choices: [KImageRef] = []
  /// the one chosen, an index into choices; the reveal shows it
  public var choice = 0
  /// while Wren paints: offer the knock, or Leave (see KMakeFaceKnock)
  public var knock: KMakeFaceKnock = .on
  public var chips: [KMakeFaceChipGroup] = []
  /// Wren's lines while she paints, in order (the last one stays)
  public var genLines: [String] = []
  /// First Class: Make another carries no lock
  public var firstClass = false
  /// Sign in with Apple is offered on this phone
  public var appleAvailable = true
  /// a step is on its way (the photo being prepared, a sign-in): the keys wait
  public var busy = false
  /// the most characters the words take
  public var wordsMax = 120

  public init() {}
}

/// The words field's controller, as long-lived as the page.
public final class KMakeFaceDriver: ObservableObject {
  public let words = KFieldController()

  public init() {}

  public func blurAll() {
    words.blur()
  }

  public var anyFocused: Bool { words.isFocused }
}

/// What the page tells its owner. One object for the life of the page; set the closures once.
/// While Wren paints: what the foot of the page offers (KMakeFacePage.knockFoot).
public enum KMakeFaceKnock: String, Equatable, Sendable {
  /// never asked: the card offering the knock
  case ask
  /// they chose to wait here
  case watch
  /// notifications allowed: Leave — I'll knock
  case on
  /// iOS won't ask again: Leave, and the face waits in Edit profile
  case off
}

/// The bell on the knock card: rings now and then (a still bell under Reduce Motion).
struct KKnockBell: View {
  let color: Color
  let ring: Bool

  var body: some View {
    ZStack {
      KFacePath(d: "M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10z")
        .stroke(color, style: StrokeStyle(lineWidth: 1.9, lineCap: .round, lineJoin: .round))
      KFacePath(d: "M10 19.5a2 2 0 0 0 4 0")
        .stroke(color, style: StrokeStyle(lineWidth: 1.9, lineCap: .round, lineJoin: .round))
    }
    .frame(width: 24, height: 24)
    .keyframeAnimator(initialValue: 0.0, repeating: ring) { content, angle in
      content.rotationEffect(.degrees(angle), anchor: UnitPoint(x: 0.5, y: 0.1))
    } keyframes: { _ in
      KeyframeTrack {
        LinearKeyframe(0, duration: 1.6)
        LinearKeyframe(-14, duration: 0.12)
        LinearKeyframe(10, duration: 0.12)
        LinearKeyframe(-6, duration: 0.12)
        LinearKeyframe(3, duration: 0.12)
        LinearKeyframe(0, duration: 0.12)
      }
    }
  }
}

public final class KMakeFaceActions {
  /// the dim, a swipe down, the escape (not while painting: that is onLeave)
  public var onClose: () -> Void = {}
  public var onStart: () -> Void = {}
  public var onMethod: (KMakeFaceMethod) -> Void = { _ in }
  public var onRetake: () -> Void = {}
  public var onUsePhoto: () -> Void = {}
  /// Draw me, with the words as they stand
  public var onDraw: (String) -> Void = { _ in }
  /// leaving while Wren paints (the drawing goes on)
  public var onLeave: () -> Void = {}
  public var onAccept: () -> Void = {}
  public var onAnother: () -> Void = {}
  public var onPickInstead: () -> Void = {}
  public var onDone: () -> Void = {}
  public var onRetry: () -> Void = {}
  public var onRejectPrimary: () -> Void = {}
  public var onRejectSecondary: () -> Void = {}
  public var onFirstClass: () -> Void = {}
  public var onNotNow: () -> Void = {}
  public var onApple: () -> Void = {}
  public var onGoogle: () -> Void = {}
  public var onLater: () -> Void = {}
  /// one of the drawings to choose from, by index
  public var onChoose: (Int) -> Void = { _ in }
  /// while Wren paints: allow the knock (iOS asks), wait here instead, back to the offer
  public var onKnockAllow: () -> Void = {}
  public var onKnockWatch: () -> Void = {}
  public var onKnockAsk: () -> Void = {}

  public init() {}
}

public struct KMakeFacePage<Wren: View>: View {
  /// Wren's size on each screen; TS gives the island the same (screens/make-face).
  public static func wrenSize(_ screen: KMakeFaceScreen) -> CGFloat {
    switch screen {
    case .intro, .rejected, .failed: return 72
    case .generating, .signin: return 64
    case .done: return 56
    default: return 0
    }
  }

  static var cardTop: CGFloat { 120 }
  static var cardInset: CGFloat { 8 }
  static var cardCorner: CGFloat { 34 }
  static var dim: Color { Color(red: 30 / 255, green: 27 / 255, blue: 53 / 255).opacity(0.35) }

  private let theme: KTheme
  private let content: KMakeFaceContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let driver: KMakeFaceDriver
  private let actions: KMakeFaceActions
  private let wren: Wren

  @State private var shown = false
  @State private var drag: CGFloat = 0
  @State private var keptHeight: CGFloat = 0
  @State private var fullHeight: CGFloat = 0
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  public init(
    theme: KTheme,
    content: KMakeFaceContent,
    topInset: CGFloat,
    bottomInset: CGFloat,
    driver: KMakeFaceDriver,
    actions: KMakeFaceActions,
    @ViewBuilder wren: () -> Wren
  ) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
    self.wren = wren()
  }

  private var keyboardUp: Bool { fullHeight - keptHeight > 1 }
  private var painting: Bool { content.screen == .generating }

  private func dismiss() {
    driver.blurAll()
    if painting { actions.onLeave() } else { actions.onClose() }
  }

  public var body: some View {
    ZStack {
      Self.dim
        .ignoresSafeArea()
        .opacity(shown ? 1 : 0)
        .contentShape(Rectangle())
        .onTapGesture { dismiss() }
        .accessibilityHidden(true)

      if content.screen != .done {
        card
          .padding(.top, keyboardUp ? topInset + 8 : Self.cardTop)
          .padding(.horizontal, Self.cardInset)
          .padding(.bottom, Self.cardInset)
          .offset(y: (shown ? 0 : 40) + drag)
          .opacity(shown ? 1 : 0)
          .animation(.timingCurve(0.3, 1, 0.3, 1, duration: 0.35), value: keyboardUp)
          .transition(.opacity)
      } else {
        KMakeFaceDone(theme: theme, content: content, topInset: topInset, bottomInset: bottomInset, onDone: actions.onDone) {
          wren.frame(width: 56, height: 56)
        }
        .transition(.opacity)
      }
    }
    .animation(.easeOut(duration: 0.3), value: content.screen == .done)
    .background {
      GeometryReader { geo in
        Color.clear.onChange(of: geo.size.height, initial: true) { _, h in keptHeight = h }
      }
    }
    .background {
      GeometryReader { geo in
        Color.clear.onChange(of: geo.size.height, initial: true) { _, h in fullHeight = h }
      }
      .ignoresSafeArea(.keyboard)
    }
    .onAppear {
      withAnimation(reduceMotion ? .easeOut(duration: 0.2) : .timingCurve(0.3, 1, 0.3, 1, duration: 0.35)) { shown = true }
    }
    .onChange(of: content.screen) { _, screen in
      if screen != .words { driver.blurAll() }
    }
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) { dismiss() }
  }

  // ── the card ──

  private var card: some View {
    let shape = RoundedRectangle(cornerRadius: Self.cardCorner, style: .continuous)
    return VStack(spacing: 0) {
      grabber
      screenBody
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .id(content.screen)
        .transition(.opacity)
    }
    .padding(.top, 12)
    .padding(.horizontal, 22)
    .padding(.bottom, 22)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(shape.fill(theme.sf))
    .clipShape(shape)
    .contentShape(shape)
    .animation(.easeOut(duration: 0.25), value: content.screen)
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }

  /// The grabber: a tap or a swipe down closes the card (leaves, while Wren paints). Only the
  /// grabber's strip drags, so the words screen's scrolling never moves the card.
  private var grabber: some View {
    Capsule()
      .fill(theme.isDark ? theme.line : Color(hex: "#DDDCEA"))
      .frame(width: 40, height: 5)
      .frame(maxWidth: .infinity, minHeight: 28, alignment: .top)
      .contentShape(Rectangle())
      .onTapGesture { dismiss() }
      .gesture(
        DragGesture(minimumDistance: 8)
          .onChanged { v in drag = max(0, v.translation.height) }
          .onEnded { v in
            if v.translation.height > 100 || v.predictedEndTranslation.height > 220 {
              dismiss()
            }
            withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) { drag = 0 }
          }
      )
      .accessibilityElement()
      .accessibilityLabel(painting ? content.strings.genLeave : content.strings.closeLabel)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction { dismiss() }
  }

  @ViewBuilder private var screenBody: some View {
    switch content.screen {
    case .intro: intro
    case .method: method
    case .confirm: confirm
    case .words: KMakeFaceWordsScreen(theme: theme, content: content, driver: driver, onDraw: actions.onDraw)
    case .generating: generating
    case .result: result
    case .rejected: rejected
    case .failed: failed
    case .quota: quota
    case .signin: signin
    case .done: EmptyView()
    }
  }

  // ── intro ──

  private var intro: some View {
    VStack(spacing: 0) {
      VStack(spacing: 18) {
        wren
          .frame(width: 72, height: 72)
          .modifier(KBob(on: !reduceMotion, period: 3))
          .accessibilityHidden(true)
        wrenLine(content.strings.introLine, size: 22)
        Text(content.strings.introSub)
          .kText(.system(15, lineHeight: 1.5))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .frame(maxWidth: 300)
          .fixedSize(horizontal: false, vertical: true)
        VStack(spacing: 8) {
          noteRow(icon: "M3 12l9-9 9 9M5 10v10h14V10", text: content.strings.introPhoto)
          noteRow(icon: "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z M12 8v5l3 2", text: content.strings.introQuota)
        }
        .frame(maxWidth: 300)
        .padding(.top, 6)
      }
      .frame(maxHeight: .infinity)
      primary(content.strings.go, action: actions.onStart)
    }
  }

  private func noteRow(icon: String, text: String) -> some View {
    HStack(spacing: 10) {
      KFacePath(d: icon)
        .stroke(theme.ind, style: StrokeStyle(lineWidth: 2 * 16 / 24, lineCap: .round, lineJoin: .round))
        .frame(width: 16, height: 16)
        .accessibilityHidden(true)
      Text(text)
        .kText(.system(13, lineHeight: 1.35))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.vertical, 10)
    .padding(.horizontal, 12)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(theme.lav2))
    .accessibilityElement(children: .combine)
  }

  // ── method ──

  private var method: some View {
    VStack(alignment: .leading, spacing: 0) {
      title(content.strings.methodTitle)
        .padding(.top, 18)
      VStack(spacing: 10) {
        methodRow(.camera, icon: "M4 8h3l2-3h6l2 3h3v11H4z M12 9.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z", title: content.strings.camera, sub: content.minor ? content.strings.at18 : content.strings.photoSub, enabled: !content.minor)
        methodRow(.library, icon: "M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6 M16 9h.01", title: content.strings.library, sub: content.minor ? content.strings.at18 : content.strings.photoSub, enabled: !content.minor)
        methodRow(.words, icon: "M4 20l4-1 11-11-3-3L5 16l-1 4z M13 8l3 3", title: content.strings.wordsRow, sub: content.strings.wordsSub, enabled: true)
      }
      .padding(.top, 14)
      if content.minor {
        Text(content.strings.minorLine)
          .kText(.system(12, lineHeight: 1.45))
          .foregroundStyle(theme.mute)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 12)
      }
      Spacer(minLength: 0)
    }
  }

  private func methodRow(_ kind: KMakeFaceMethod, icon: String, title: String, sub: String, enabled: Bool) -> some View {
    SwiftUI.Button {
      actions.onMethod(kind)
    } label: {
      HStack(spacing: 14) {
        KFacePath(d: icon)
          .stroke(theme.ind, style: StrokeStyle(lineWidth: 1.9 * 20 / 24, lineCap: .round, lineJoin: .round))
          .frame(width: 20, height: 20)
          .frame(width: 40, height: 40)
          .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(theme.sf))
          .accessibilityHidden(true)
        VStack(alignment: .leading, spacing: 2) {
          Text(title)
            .kText(.system(16, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
          Text(sub)
            .kText(.system(12))
            .foregroundStyle(theme.mute)
            .lineLimit(2)
            .minimumScaleFactor(0.85)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 16)
      .frame(maxWidth: .infinity, minHeight: 64)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(theme.lav2))
      .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
    .buttonStyle(KFadePressStyle())
    .disabled(!enabled || content.busy)
    .opacity(enabled ? 1 : 0.45)
    .accessibilityElement(children: .combine)
    .accessibilityHint(enabled ? "" : sub)
  }

  // ── confirm ──

  private var confirm: some View {
    VStack(alignment: .leading, spacing: 0) {
      title(content.strings.confirmTitle)
        .padding(.top, 18)
      ZStack(alignment: .bottom) {
        KImage(content.photo, size: CGSize(width: 220, height: 260), contentMode: .fill, placeholder: theme.soft2)
        // round the face the photo has (KFaceGuide.swift), not a fixed oval in the middle
        KFaceGuideOval(photo: content.photo?.url, size: CGSize(width: 220, height: 260))
        Text(content.strings.confirmGuide)
          .kText(.mono(9, .medium, tracking: 0.14))
          .foregroundStyle(Color.white.opacity(0.85))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .padding(.horizontal, 10)
          .padding(.bottom, 12)
      }
      .frame(width: 220, height: 260)
      .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(content.strings.confirmGuide)
      KFlexRow(weights: [1, 1.4], spacing: 10) {
        secondary(content.strings.retake, action: actions.onRetake)
        primary(content.strings.usePhoto, action: actions.onUsePhoto)
      }
    }
  }

  // ── generating ──

  private var generating: some View {
    VStack(spacing: 0) {
      VStack(spacing: 22) {
        KMakeFaceEasel(theme: theme, paint: !reduceMotion) {
          wren.frame(width: 64, height: 64)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(content.strings.genLabel)
        KMakeFaceLines(theme: theme, lines: content.genLines)
      }
      .frame(maxHeight: .infinity)
      knockFoot
        .animation(.easeOut(duration: 0.22), value: content.knock)
    }
  }

  /*
   THE KNOCK (owner's design, 2026-10-31: the painting is a good moment to ask for notifications,
   because there is something real to be told about). Never asked: a soft card offering the knock,
   Knock when done (iOS asks then) or I'll watch. Watching: a line, and Knock me instead. Allowed:
   Leave — I'll knock, a full-width ink key, the swipe down still works too. iOS won't ask again:
   Leave, plain, and the face waits in Edit profile.
   */
  @ViewBuilder
  private var knockFoot: some View {
    switch content.knock {
    case .ask:
      VStack(alignment: .leading, spacing: 14) {
        HStack(alignment: .top, spacing: 14) {
          ZStack {
            Circle().fill(theme.sf)
            KKnockBell(color: theme.ind, ring: !reduceMotion)
          }
          .frame(width: 44, height: 44)
          .accessibilityHidden(true)
          VStack(alignment: .leading, spacing: 3) {
            Text(content.strings.knockTitle)
              .kText(.system(16, .semibold))
              .foregroundStyle(theme.ink)
            Text(content.strings.knockBody)
              .kText(.system(14, lineHeight: 1.4))
              .foregroundStyle(theme.sub)
              .fixedSize(horizontal: false, vertical: true)
          }
          .accessibilityElement(children: .combine)
        }
        KFlexRow(weights: [1, 1.4], spacing: 10) {
          smallKey(content.strings.knockWatch, fill: theme.lav, ink: theme.ind, action: actions.onKnockWatch)
          smallKey(content.strings.knockAllow, fill: theme.ind, ink: theme.isDark ? theme.bg : Color.white, action: actions.onKnockAllow)
        }
      }
      .padding(18)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(theme.lav2))
      .transition(.opacity)
    case .watch:
      VStack(spacing: 4) {
        Text(content.strings.knockWatching)
          .kText(.system(13))
          .foregroundStyle(theme.mute)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
        SwiftUI.Button(action: actions.onKnockAsk) {
          Text(content.strings.knockInstead)
            .kText(.system(14, .semibold))
            .foregroundStyle(theme.ind)
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
      }
      .frame(maxWidth: .infinity)
      .transition(.opacity)
    case .on, .off:
      VStack(spacing: 12) {
        Text(content.knock == .on ? content.strings.knockOn : content.strings.knockOff)
          .kText(.system(13))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
        SwiftUI.Button(action: actions.onLeave) {
          Text(content.knock == .on ? content.strings.knockLeave : content.strings.knockLeaveQuiet)
            .kText(.system(16, .semibold))
            .foregroundStyle(theme.isDark ? theme.bg : Color.white)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: 52)
        }
        .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: theme.ink))
      }
      .transition(.opacity)
    }
  }

  private func smallKey(_ text: String, fill: Color, ink: Color, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      Text(text)
        .kText(.system(15, .semibold))
        .foregroundStyle(ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .padding(.horizontal, 10)
        .frame(maxWidth: .infinity, minHeight: 46)
    }
    .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: fill))
  }

  // ── result ──

  private var result: some View {
    VStack(spacing: 0) {
      VStack(spacing: 20) {
        KMakeFaceReveal(theme: theme, face: content.result, label: content.strings.resultLabel)
        if content.choices.count > 1 {
          KMakeFaceChoices(theme: theme, faces: content.choices, chosen: content.choice, label: content.strings.resultLabel, onChoose: actions.onChoose)
        }
        wrenLine(content.strings.resultLine, size: 22)
        Text(content.strings.resultSub)
          .kText(.system(13))
          .foregroundStyle(theme.mute)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxHeight: .infinity)
      VStack(spacing: 10) {
        primary(content.strings.accept, action: actions.onAccept)
        HStack(spacing: 10) {
          SwiftUI.Button(action: actions.onAnother) {
            HStack(spacing: 8) {
              Text(content.strings.another)
                .kText(.system(14, .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
              if !content.firstClass {
                Text(content.strings.lock)
                  .kText(.mono(8, .semibold, tracking: 0.12))
                  .foregroundStyle(KBrand.inkOnBrand)
                  .padding(.horizontal, 6)
                  .padding(.vertical, 2)
                  .background(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(KBrand.waxGold))
                  .fixedSize()
              }
            }
            .foregroundStyle(theme.mute)
            .padding(.horizontal, 10)
            .frame(maxWidth: .infinity, minHeight: 44)
          }
          .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: theme.soft))
          SwiftUI.Button(action: actions.onPickInstead) {
            Text(content.strings.instead)
              .kText(.system(14, .semibold))
              .foregroundStyle(theme.ind)
              .lineLimit(1)
              .minimumScaleFactor(0.75)
              .padding(.horizontal, 10)
              .frame(maxWidth: .infinity, minHeight: 44)
          }
          .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: theme.lav))
        }
      }
      .disabled(content.busy)
    }
    .sensoryFeedback(.success, trigger: content.result)
  }

  // ── rejected and failed ──

  private var rejected: some View {
    VStack(spacing: 0) {
      VStack(spacing: 18) {
        wren
          .frame(width: 72, height: 72)
          .accessibilityHidden(true)
        wrenLine(content.strings.rejectLine, size: 22)
        Text(content.strings.rejectSub)
          .kText(.system(15, lineHeight: 1.5))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .frame(maxWidth: 290)
          .fixedSize(horizontal: false, vertical: true)
        badge(content.strings.rejectBadge)
      }
      .frame(maxHeight: .infinity)
      if content.strings.rejectSecondary.isEmpty {
        primary(content.strings.rejectPrimary, action: actions.onRejectPrimary)
      } else {
        KFlexRow(weights: [1, 1.3], spacing: 10) {
          secondary(content.strings.rejectSecondary, action: actions.onRejectSecondary)
          primary(content.strings.rejectPrimary, action: actions.onRejectPrimary)
        }
      }
    }
    .sensoryFeedback(.warning, trigger: content.screen)
  }

  private var failed: some View {
    VStack(spacing: 0) {
      VStack(spacing: 18) {
        wren
          .frame(width: 72, height: 72)
          .accessibilityHidden(true)
        wrenLine(content.strings.failedLine, size: 22)
        Text(content.strings.failedSub)
          .kText(.system(15, lineHeight: 1.5))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .frame(maxWidth: 290)
          .fixedSize(horizontal: false, vertical: true)
        badge(content.strings.rejectBadge)
      }
      .frame(maxHeight: .infinity)
      VStack(spacing: 10) {
        primary(content.strings.retry, action: actions.onRetry)
        quiet(content.strings.notNow, action: actions.onNotNow)
      }
    }
  }

  private func badge(_ text: String) -> some View {
    Text(text)
      .kText(.mono(10, .medium, tracking: 0.14))
      .foregroundStyle(KBrand.greenText)
      .multilineTextAlignment(.center)
      .padding(.horizontal, 12)
      .padding(.vertical, 6)
      .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(KBrand.paleGreen))
  }

  // ── quota ──

  private var quota: some View {
    VStack(spacing: 0) {
      VStack(spacing: 18) {
        ZStack(alignment: .bottomTrailing) {
          Group {
            if let face = content.quotaFace {
              KImage(face, size: CGSize(width: 120, height: 120), contentMode: .fill, placeholder: theme.soft2)
                .clipShape(Circle())
            } else {
              Circle()
                .fill(theme.lav2)
                .overlay {
                  KFacePath(d: "M12 5v14M5 12h14")
                    .stroke(theme.ind, style: StrokeStyle(lineWidth: 2.2 * 32 / 24, lineCap: .round))
                    .frame(width: 32, height: 32)
                }
            }
          }
          .frame(width: 120, height: 120)
          .kObjectDepth(Circle(), theme: theme)
          Text(content.strings.quotaTag)
            .kText(.mono(8, .semibold, tracking: 0.14))
            .foregroundStyle(KBrand.inkOnBrand)
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(KBrand.waxGold))
            .rotationEffect(.degrees(-8))
            .offset(x: 8, y: 4)
        }
        .accessibilityHidden(true)
        title(content.strings.quotaTitle)
          .multilineTextAlignment(.center)
        Text(content.strings.quotaSub)
          .kText(.system(15, lineHeight: 1.5))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .frame(maxWidth: 290)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxHeight: .infinity)
      VStack(spacing: 10) {
        SwiftUI.Button(action: actions.onFirstClass) {
          Text(content.strings.quotaCta)
            .kText(.system(16, .semibold))
            .foregroundStyle(Color.white)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(maxWidth: .infinity, minHeight: 52)
            .overlay(Capsule().strokeBorder(KBrand.waxGold, lineWidth: 2))
        }
        .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: KBrand.inkOnBrand))
        quiet(content.strings.notNow, action: actions.onNotNow)
      }
    }
  }

  // ── sign in ──

  private var signin: some View {
    VStack(spacing: 0) {
      VStack(spacing: 16) {
        wren
          .frame(width: 64, height: 64)
          .accessibilityHidden(true)
        title(content.strings.signinTitle)
          .multilineTextAlignment(.center)
        Text(content.strings.signinSub)
          .kText(.system(15, lineHeight: 1.5))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .frame(maxWidth: 280)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxHeight: .infinity)
      VStack(spacing: 10) {
        if content.appleAvailable {
          SwiftUI.Button(action: actions.onApple) {
            HStack(spacing: 10) {
              Image(systemName: "apple.logo")
                .font(.system(size: 17, weight: .semibold))
                .accessibilityHidden(true)
              Text(content.strings.apple)
                .kText(.system(16, .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            }
            .foregroundStyle(Color.white)
            .frame(maxWidth: .infinity, minHeight: 52)
          }
          .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: KBrand.inkOnBrand))
        }
        SwiftUI.Button(action: actions.onGoogle) {
          Text(content.strings.google)
            .kText(.system(16, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(maxWidth: .infinity, minHeight: 52)
        }
        .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: theme.lav))
        quiet(content.strings.later, action: actions.onLater)
      }
      .disabled(content.busy)
      .opacity(content.busy ? 0.6 : 1)
    }
  }

  // ── the pieces ──

  private func title(_ text: String) -> some View {
    Text(text)
      .kText(.system(22, .bold, tracking: -0.01))
      .foregroundStyle(theme.ink)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityAddTraits(.isHeader)
  }

  private func wrenLine(_ text: String, size: CGFloat) -> some View {
    Text(text)
      .kText(.content(size, italic: true, lineHeight: 1.25))
      .foregroundStyle(theme.isDark ? theme.ink : Color(hex: "#3B3850"))
      .multilineTextAlignment(.center)
      .fixedSize(horizontal: false, vertical: true)
  }

  private func primary(_ text: String, enabled: Bool = true, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      Text(text)
        .kText(.system(16, .semibold))
        .foregroundStyle(Color.white)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity, minHeight: 52)
    }
    .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: theme.ind))
    .disabled(!enabled || content.busy)
    .opacity(enabled ? 1 : 0.45)
  }

  private func secondary(_ text: String, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      Text(text)
        .kText(.system(16, .semibold))
        .foregroundStyle(theme.ind)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity, minHeight: 52)
    }
    .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: theme.lav))
    .disabled(content.busy)
  }

  private func quiet(_ text: String, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      Text(text)
        .kText(.system(13))
        .foregroundStyle(theme.mute)
        .frame(maxWidth: .infinity, minHeight: 36)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
  }
}

// MARK: - the words

/// The words screen: the field, the counter, the chips, Draw me. The words live in the field
/// (KField is uncontrolled); a chip edits them through the controller.
struct KMakeFaceWordsScreen: View {
  let theme: KTheme
  let content: KMakeFaceContent
  @ObservedObject var driver: KMakeFaceDriver
  let onDraw: (String) -> Void

  @State private var text = ""
  @State private var toggles = 0

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: 0) {
          Text(content.strings.wordsTitle)
            .kText(.system(22, .bold, tracking: -0.01))
            .foregroundStyle(theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
            .padding(.top, 18)
          KField(
            controller: driver.words,
            placeholder: content.strings.wordsPlaceholder,
            style: .input,
            lines: 3...6,
            returnSends: false,
            autocapitalize: false,
            maxLength: content.wordsMax,
            tint: theme.ind,
            textColor: theme.ink,
            placeholderColor: theme.faint,
            accessibilityLabel: content.strings.wordsLabel,
            onChange: { text = $0 }
          )
          .padding(.vertical, 14)
          .padding(.horizontal, 16)
          .frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)
          .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(theme.lav2))
          .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
          .onTapGesture { driver.words.focus() }
          .padding(.top, 14)
          Text(verbatim: "\(text.count)/\(content.wordsMax)")
            .kText(.mono(10, .medium))
            .foregroundStyle(theme.faint)
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.top, 6)
            .accessibilityHidden(true)
          VStack(alignment: .leading, spacing: 12) {
            ForEach(content.chips) { group in
              VStack(alignment: .leading, spacing: 8) {
                Text(group.title)
                  .kText(.mono(9, .semibold, tracking: 0.14))
                  .foregroundStyle(theme.mute)
                  .accessibilityAddTraits(.isHeader)
                KChipFlow(spacing: 8, lineSpacing: 8) {
                  ForEach(group.chips) { chip in
                    chipView(chip)
                  }
                }
              }
            }
          }
          .padding(.top, 12)
          .padding(.bottom, 12)
        }
      }
      .scrollIndicators(.hidden)
      .scrollDismissesKeyboard(.interactively)
      let ready = !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      SwiftUI.Button {
        driver.blurAll()
        onDraw(driver.words.text)
      } label: {
        Text(content.strings.draw)
          .kText(.system(16, .semibold))
          .foregroundStyle(Color.white)
          .lineLimit(1)
          .frame(maxWidth: .infinity, minHeight: 52)
      }
      .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: theme.ind))
      .disabled(!ready || content.busy)
      .opacity(ready ? 1 : 0.45)
      .padding(.top, 8)
    }
    .sensoryFeedback(.selection, trigger: toggles)
    .onAppear { text = driver.words.text }
  }

  private func chipView(_ chip: KMakeFaceChip) -> some View {
    let on = KMakeFaceWords.has(text, chip.label)
    return SwiftUI.Button {
      guard let next = KMakeFaceWords.toggled(text, chip.label, max: content.wordsMax) else { return }
      driver.words.setText(next)
      text = next
      toggles += 1
    } label: {
      Text(chip.label)
        .kText(.system(13, .semibold))
        .foregroundStyle(theme.ind)
        .lineLimit(1)
        .padding(.horizontal, 12)
        .frame(minHeight: 32)
    }
    .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: on ? theme.lav : theme.sf))
    .overlay {
      // on the surface the chip needs an edge to be seen: the line colour, flat (not an ink edge)
      if !on { Capsule().strokeBorder(theme.line, lineWidth: 1).allowsHitTesting(false) }
    }
    .animation(.easeOut(duration: 0.2), value: on)
    .accessibilityAddTraits(on ? .isSelected : [])
  }
}

/// The words a chip puts in the field and takes out again. The field is read as comma-separated
/// phrases (the Japanese 、 and full-width ， too); a chip is in when one of them is its label,
/// ignoring case and accents.
enum KMakeFaceWords {
  static func parts(_ text: String) -> [String] {
    text.split(whereSeparator: { $0 == "," || $0 == "、" || $0 == "，" })
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
  }

  static func same(_ a: String, _ b: String) -> Bool {
    a.compare(b, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
  }

  static func has(_ text: String, _ phrase: String) -> Bool {
    parts(text).contains { same($0, phrase) }
  }

  /// Japanese (kana or kanji in the phrase) joins with 、, everything else with ", ".
  static func separator(for phrase: String) -> String {
    phrase.unicodeScalars.contains { (0x3040...0x30FF).contains($0.value) || (0x4E00...0x9FFF).contains($0.value) } ? "、" : ", "
  }

  /// The field's words with the phrase taken out (when it is in) or added at the end; nil when
  /// adding it would go past max.
  static func toggled(_ text: String, _ phrase: String, max: Int) -> String? {
    var p = parts(text)
    if let i = p.firstIndex(where: { same($0, phrase) }) {
      p.remove(at: i)
    } else {
      p.append(phrase)
    }
    let joined = p.joined(separator: separator(for: phrase))
    return joined.count <= max ? joined : nil
  }
}

/// A row whose children share the width by weight (CSS flex 1 / 1.4), all as tall as the tallest.
struct KFlexRow: Layout {
  let weights: [CGFloat]
  var spacing: CGFloat = 10

  private func widths(_ total: CGFloat, _ n: Int) -> [CGFloat] {
    let w = (0..<n).map { $0 < weights.count ? max(weights[$0], 0.01) : 1 }
    let sum = w.reduce(0, +)
    let room = max(0, total - spacing * CGFloat(max(0, n - 1)))
    return w.map { room * $0 / sum }
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let total = proposal.width ?? 320
    let ws = widths(total, subviews.count)
    let h = zip(subviews, ws).map { $0.sizeThatFits(ProposedViewSize(width: $1, height: nil)).height }.max() ?? 0
    return CGSize(width: total, height: h)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let ws = widths(bounds.width, subviews.count)
    var x = bounds.minX
    for (s, w) in zip(subviews, ws) {
      s.place(at: CGPoint(x: x, y: bounds.minY), proposal: ProposedViewSize(width: w, height: bounds.height))
      x += w + spacing
    }
  }
}

/// Chips in rows that wrap.
struct KChipFlow: Layout {
  var spacing: CGFloat = 8
  var lineSpacing: CGFloat = 8

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? .infinity
    var x: CGFloat = 0, y: CGFloat = 0, line: CGFloat = 0, widest: CGFloat = 0
    for s in subviews {
      let size = s.sizeThatFits(.unspecified)
      let w = min(size.width, width)
      if x > 0 && x + w > width {
        y += line + lineSpacing
        x = 0
        line = 0
      }
      x += w + spacing
      widest = max(widest, x - spacing)
      line = max(line, size.height)
    }
    return CGSize(width: width.isFinite ? width : widest, height: y + line)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var x = bounds.minX, y = bounds.minY, line: CGFloat = 0
    for s in subviews {
      let size = s.sizeThatFits(.unspecified)
      let w = min(size.width, bounds.width)
      if x > bounds.minX && x + w > bounds.maxX {
        y += line + lineSpacing
        x = bounds.minX
        line = 0
      }
      s.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(width: w, height: size.height))
      x += w + spacing
      line = max(line, size.height)
    }
  }
}

// MARK: - the easel

/// The canvas on its ledge, with Wren painting at its foot. The canvas lays abstract shapes one
/// at a time and starts over: never a face, never a guess at the result.
struct KMakeFaceEasel<Wren: View>: View {
  let theme: KTheme
  let paint: Bool
  let wren: Wren

  init(theme: KTheme, paint: Bool, @ViewBuilder wren: () -> Wren) {
    self.theme = theme
    self.paint = paint
    self.wren = wren()
  }

  @State private var swing = false

  var body: some View {
    ZStack(alignment: .topLeading) {
      KMakeFaceCanvasLayers(animate: paint)
        .frame(width: 180, height: 200)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.white))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .kObjectDepth(RoundedRectangle(cornerRadius: 14, style: .continuous), theme: theme)
        .offset(x: 30, y: 10)
      // the ledge
      RoundedRectangle(cornerRadius: 4, style: .continuous)
        .fill(KObjectDepth.color(for: theme))
        .frame(width: 240, height: 8)
        .offset(y: 252)
      // her brush, swinging with her
      Capsule()
        .fill(KBrand.inkOnBrand)
        .frame(width: 26, height: 4)
        .rotationEffect(.degrees(-40), anchor: .leading)
        .modifier(KPaintSwing(on: swing))
        .offset(x: 240 - 46 - 26, y: 260 - 62 - 4)
      wren
        .modifier(KPaintSwing(on: swing))
        .offset(x: 240 - 64 + 6, y: 260 - 14 - 64)
    }
    .frame(width: 240, height: 260, alignment: .topLeading)
    .onAppear {
      guard paint else { return }
      withAnimation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true)) { swing = true }
    }
  }
}

/// The 1.4s back-and-forth of the brush (CSS keyframes paint: −6,−4 at −8° ↔ 6,4 at 6°).
private struct KPaintSwing: ViewModifier {
  let on: Bool
  func body(content: Content) -> some View {
    content
      .rotationEffect(.degrees(on ? 6 : -8))
      .offset(x: on ? 6 : -6, y: on ? 4 : -4)
  }
}

/// A gentle bob (CSS bob: 0 ↔ −4).
struct KBob: ViewModifier {
  let on: Bool
  let period: Double
  @State private var up = false

  func body(content: Content) -> some View {
    content
      .offset(y: up ? -4 : 0)
      .onAppear {
        guard on else { return }
        withAnimation(.easeInOut(duration: period / 2).repeatForever(autoreverses: true)) { up = true }
      }
  }
}

/// The canvas's layers: a wash, a brush sweep, two blocks, a scribble, dots — each scaling in
/// (.6s), one every 1.1s; then they fade and the next round starts in other colours.
struct KMakeFaceCanvasLayers: View {
  let animate: Bool
  @State private var step = 0
  @State private var round = 0

  private static let palettes: [[String]] = [
    ["#E4E2F4", "#F3C6D4", "#C9E265", "#8DBCF2", "#E8B931"],
    ["#DDEFD6", "#F6E7C6", "#B9A6E8", "#E4573D", "#4FC3D9"],
    ["#CFE3F5", "#F2A2C8", "#8FD6B4", "#3A34D6", "#F4D03F"],
  ]

  private var colours: [Color] { Self.palettes[round % Self.palettes.count].map { Color(hex: $0) } }
  private var shown: Int { animate ? step : 5 }

  var body: some View {
    let c = colours
    ZStack {
      if shown >= 1 {
        // a wash, off-centre
        Ellipse().fill(c[0])
          .frame(width: 150, height: 120)
          .rotationEffect(.degrees(round.isMultiple(of: 2) ? -14 : 18))
          .offset(x: -14, y: 22)
          .transition(.kLayer)
      }
      if shown >= 2 {
        // a brush sweep
        Capsule().fill(c[1])
          .frame(width: 130, height: 30)
          .rotationEffect(.degrees(round.isMultiple(of: 2) ? -24 : 22))
          .offset(x: 18, y: -42)
          .transition(.kLayer)
      }
      if shown >= 3 {
        // two blocks
        ZStack {
          RoundedRectangle(cornerRadius: 10, style: .continuous).fill(c[2])
            .frame(width: 48, height: 40)
            .rotationEffect(.degrees(8))
            .offset(x: -44, y: -50)
          RoundedRectangle(cornerRadius: 6, style: .continuous).fill(c[3].opacity(0.85))
            .frame(width: 34, height: 58)
            .rotationEffect(.degrees(-10))
            .offset(x: 50, y: 52)
        }
        .transition(.kLayer)
      }
      if shown >= 4 {
        // a scribble across
        KScribble()
          .trim(from: 0, to: 1)
          .stroke(Color(hex: "#1E1B35").opacity(0.55), style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
          .frame(width: 140, height: 60)
          .offset(y: 6)
          .transition(.kLayer)
      }
      if shown >= 5 {
        // dots
        ZStack {
          ForEach(0..<6, id: \.self) { i in
            Circle().fill(c[(i + 1) % c.count])
              .frame(width: CGFloat(8 + (i * 5) % 9), height: CGFloat(8 + (i * 5) % 9))
              .offset(x: CGFloat([-62, 58, -20, 40, 66, -48][i]), y: CGFloat([-78, -70, 74, 84, -6, 40][i]))
          }
        }
        .transition(.kLayer)
      }
    }
    .frame(width: 180, height: 200)
    .accessibilityHidden(true)
    .task(id: animate) {
      guard animate else { return }
      while !Task.isCancelled {
        for s in 1...5 {
          try? await Task.sleep(for: .milliseconds(1100))
          if Task.isCancelled { return }
          withAnimation(.timingCurve(0.3, 1.2, 0.4, 1, duration: 0.6)) { step = s }
        }
        try? await Task.sleep(for: .milliseconds(900))
        if Task.isCancelled { return }
        withAnimation(.easeOut(duration: 0.35)) { step = 0 }
        try? await Task.sleep(for: .milliseconds(400))
        round += 1
      }
    }
  }
}

private extension AnyTransition {
  /// CSS layer: scale 0 → 1 with a fade
  static var kLayer: AnyTransition { .scale(scale: 0.01).combined(with: .opacity) }
}

/// A loose scribble on the 140 × 60 frame.
private struct KScribble: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    let w = r.width, h = r.height
    p.move(to: CGPoint(x: r.minX, y: r.minY + h * 0.7))
    p.addCurve(to: CGPoint(x: r.minX + w * 0.35, y: r.minY + h * 0.3), control1: CGPoint(x: r.minX + w * 0.1, y: r.minY), control2: CGPoint(x: r.minX + w * 0.25, y: r.minY + h))
    p.addCurve(to: CGPoint(x: r.minX + w * 0.7, y: r.minY + h * 0.6), control1: CGPoint(x: r.minX + w * 0.45, y: r.minY - h * 0.2), control2: CGPoint(x: r.minX + w * 0.55, y: r.minY + h * 1.1))
    p.addCurve(to: CGPoint(x: r.maxX, y: r.minY + h * 0.2), control1: CGPoint(x: r.minX + w * 0.85, y: r.minY + h * 0.1), control2: CGPoint(x: r.minX + w * 0.95, y: r.minY + h * 0.5))
    return p
  }
}

/// Wren's lines while she paints: the next one every 4s, the last one stays.
struct KMakeFaceLines: View {
  let theme: KTheme
  let lines: [String]
  @State private var index = 0

  var body: some View {
    let line = lines.isEmpty ? "" : lines[min(index, lines.count - 1)]
    Text(line)
      .kText(.content(20, italic: true, lineHeight: 1.3))
      .foregroundStyle(theme.isDark ? theme.ink : Color(hex: "#3B3850"))
      .multilineTextAlignment(.center)
      .fixedSize(horizontal: false, vertical: true)
      .frame(minHeight: 28)
      .id(line)
      .transition(.opacity)
      .animation(.easeOut(duration: 0.4), value: line)
      .task {
        index = 0
        while !Task.isCancelled && index < lines.count - 1 {
          try? await Task.sleep(for: .seconds(4))
          if Task.isCancelled { return }
          index += 1
        }
      }
  }
}

// MARK: - the result

/// V1's reveal: the face in its white round frame, popping in.
struct KMakeFaceReveal: View {
  let theme: KTheme
  let face: KImageRef?
  let label: String
  @State private var shown = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    KImage(face, size: CGSize(width: 168, height: 168), contentMode: .fill, placeholder: theme.soft2)
      .clipShape(Circle())
      .padding(8)
      .background(Circle().fill(Color.white))
      // no hard shadow under the face (owner, 2026-10-31): a hairline keeps the white ring off a white page
      .overlay(Circle().strokeBorder(theme.line, lineWidth: 1))
      .scaleEffect(shown || reduceMotion ? 1 : 0.92)
      .opacity(shown ? 1 : 0)
      .onAppear {
        withAnimation(reduceMotion ? .easeOut(duration: 0.2) : .timingCurve(0.3, 1.2, 0.4, 1, duration: 0.45)) { shown = true }
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(label)
      .accessibilityAddTraits(.isImage)
  }
}

/// The drawings to choose from, under the reveal (owner, 2026-10-31): three small faces, the chosen
/// one ringed in ind; a tap shows it above. The face is the first until "This is me" takes another.
struct KMakeFaceChoices: View {
  let theme: KTheme
  let faces: [KImageRef]
  let chosen: Int
  let label: String
  let onChoose: (Int) -> Void

  var body: some View {
    HStack(spacing: 14) {
      ForEach(Array(faces.enumerated()), id: \.offset) { i, face in
        let on = i == chosen
        SwiftUI.Button {
          onChoose(i)
        } label: {
          KImage(face, size: CGSize(width: 60, height: 60), contentMode: .fill, placeholder: theme.soft2)
            .clipShape(Circle())
            .padding(3)
            .overlay(Circle().strokeBorder(on ? theme.ind : theme.line, lineWidth: on ? 3 : 1))
            .scaleEffect(on ? 1 : 0.92)
            .animation(.easeOut(duration: 0.18), value: on)
            .frame(width: 72, height: 72)
            .contentShape(Circle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityLabel("\(label), \(i + 1)/\(faces.count)")
        .accessibilityAddTraits(on ? [.isSelected] : [])
      }
    }
    .padding(.top, -6)
  }
}

// MARK: - done

/// The full-screen done page: the face flying into its stamp frame.
struct KMakeFaceDone<Wren: View>: View {
  let theme: KTheme
  let content: KMakeFaceContent
  let topInset: CGFloat
  let bottomInset: CGFloat
  let onDone: () -> Void
  let wren: Wren

  init(theme: KTheme, content: KMakeFaceContent, topInset: CGFloat, bottomInset: CGFloat, onDone: @escaping () -> Void, @ViewBuilder wren: () -> Wren) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.onDone = onDone
    self.wren = wren()
  }

  @State private var landed = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  private var onPurple: Bool { content.entry == .onboarding }
  private var ground: Color { onPurple ? Color(hex: "#5A55F5") : (theme.isDark ? theme.bg : theme.soft) }
  private var depth: Color { onPurple ? Color(hex: "#3F3BB8") : KObjectDepth.color(for: theme) }
  private var lineColour: Color { onPurple ? Color.white : (theme.isDark ? theme.ink : Color(hex: "#3B3850")) }

  var body: some View {
    VStack(spacing: 22) {
      ZStack {
        RoundedRectangle(cornerRadius: 3, style: .continuous)
          .strokeBorder(Color(hex: "#C9C4F2"), style: StrokeStyle(lineWidth: 2, dash: [6, 4]))
          .padding(6)
        KImage(content.result, size: CGSize(width: 124, height: 124), contentMode: .fill, placeholder: Color(hex: "#EFEDFA"))
          .clipShape(Circle())
          .scaleEffect(landed || reduceMotion ? 1 : 1.3)
          .offset(y: landed || reduceMotion ? 0 : -120)
          .opacity(landed ? 1 : 0)
          .offset(y: -10)
        Text(content.strings.doneTag)
          .kText(.mono(8, .medium, tracking: 0.16))
          .foregroundStyle(Color(hex: "#8A86A3"))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .padding(.horizontal, 12)
          .frame(maxHeight: .infinity, alignment: .bottom)
          .padding(.bottom, 14)
      }
      .frame(width: 170, height: 200)
      .background(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(Color.white))
      .background {
        RoundedRectangle(cornerRadius: 6, style: .continuous).fill(depth).offset(x: 6, y: 6)
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(content.strings.resultLabel)
      wren
        .modifier(KBob(on: !reduceMotion, period: 1.4))
        .accessibilityHidden(true)
      Text(content.strings.doneLine)
        .kText(.content(21, italic: true, lineHeight: 1.3))
        .foregroundStyle(lineColour)
        .multilineTextAlignment(.center)
        .frame(maxWidth: 300)
        .fixedSize(horizontal: false, vertical: true)
      SwiftUI.Button(action: onDone) {
        Text(content.strings.doneButton)
          .kText(.system(15, .semibold))
          .foregroundStyle(onPurple ? Color(hex: "#3A34D6") : Color.white)
          .lineLimit(1)
          .padding(.horizontal, 28)
          .frame(minHeight: 48)
      }
      .buttonStyle(KStickerButtonStyle(shape: Capsule(), fill: onPurple ? Color.white : theme.ind))
      .padding(.top, 10)
    }
    .padding(.top, topInset)
    .padding(.bottom, bottomInset)
    .padding(.horizontal, 24)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(ground.ignoresSafeArea())
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    .sensoryFeedback(.impact(weight: .light), trigger: landed)
    .onAppear {
      withAnimation(reduceMotion ? .easeOut(duration: 0.25) : .timingCurve(0.3, 1.2, 0.4, 1, duration: 0.7)) { landed = true }
    }
    .accessibilityElement(children: .contain)
  }
}

// MARK: - pieces

/// Path data on the 24 grid, scaled into its frame.
struct KFacePath: Shape {
  let d: String

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    return KSVGPath.path(d).applying(place)
  }
}
