// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ONBOARDING IN SWIFTUI (the runner's drawing: src/screens/onboarding/Onboarding2.tsx's render,
 and each screen of screens/onboarding/screens). Behind app_surfaces "onboarding", off by default
 (binary 1.2.6); the React Native run stays what people see while it is off.

 What it draws, besides the screen TS names:
 - the GROUND (Post Blue, the letter's paper, Shell), edge to edge;
 - on 3–6 and 8 ONE nest egg in the frame's nest slot, outside the screen's own view, so it never
   remounts as the screens change under it and a pip lights where the eye already is;
 - a new screen fades in over 220ms (none into 1 straight from the launch, none into 2 from 1:
   the egg is one thing across that change);
 - in demo, a small DEMO tag at the top right.

 THE ISLANDS (React Native inside, KIsland): `routeBird` (Wren flying on the doorstep's slide 2),
 `hatch` (HatchStage on 9), `chick` (the named chick on 10, 11 and 13: placed over a slot the
 screen leaves, so it is one view across 10 → 11) and `flight` (FirstFlight on 12, landed and
 still behind 13). Wren is never drawn here.

 THE KEYBOARD. The page sits in a Host that keeps the keyboard's safe area. The run lays itself
 out on the whole window (the doorstep and the nest never move), and the screens with a field
 (1a, 7, 10, 11) are told the keyboard's height and make their own room.
 */
public struct KOnboardingScreen<RouteBird: View, Hatch: View, Chick: View, Flight: View>: View {
  private let content: KObContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  @ObservedObject private var driver: KObDriver
  private let actions: KObActions
  private let routeBird: RouteBird
  private let hatch: Hatch
  private let chick: Chick
  private let flight: Flight

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var fullHeight: CGFloat = 0
  @State private var keptHeight: CGFloat = 0
  /// screen 1 rolled its egg to 2's hero spot (2 settles it rather than growing it in)
  @State private var eggFromDoor = false

  public init(
    content: KObContent,
    topInset: CGFloat,
    bottomInset: CGFloat,
    driver: KObDriver,
    actions: KObActions,
    @ViewBuilder routeBird: () -> RouteBird,
    @ViewBuilder hatch: () -> Hatch,
    @ViewBuilder chick: () -> Chick,
    @ViewBuilder flight: () -> Flight
  ) {
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self._driver = ObservedObject(wrappedValue: driver)
    self.actions = actions
    self.routeBird = routeBird()
    self.hatch = hatch()
    self.chick = chick()
    self.flight = flight()
  }

  private var keyboard: CGFloat { max(0, fullHeight - keptHeight) }

  public var body: some View {
    ZStack {
      GeometryReader { geo in
        Color.clear.onChange(of: geo.size.height, initial: true) { _, h in keptHeight = h }
      }
      GeometryReader { geo in
        Color.clear.onChange(of: geo.size.height, initial: true) { _, h in fullHeight = h }
      }
      .ignoresSafeArea(.keyboard)

      GeometryReader { geo in
        run(size: geo.size)
      }
      .ignoresSafeArea(.keyboard)
    }
    .background { content.ground.color.ignoresSafeArea() }
    .coordinateSpace(.named(KObSpace.root))
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    .onChange(of: content.screen) { old, new in
      if new != .egg { eggFromDoor = false }
      if old == .letter || old == .name || old == .address || old == .doorstep { driver.blurAll() }
    }
  }

  private func run(size: CGSize) -> some View {
    let ctx = KObCtx(
      content: content,
      size: size,
      top: topInset,
      bottom: bottomInset,
      keyboard: keyboard,
      reduceMotion: reduceMotion,
      actions: actions,
      driver: driver
    )
    return ZStack(alignment: .topLeading) {
      // FirstFlight: the flight itself on 12 (it takes the taps: 12's own layer lets them through),
      // landed and still behind 13
      if content.screen == .flight || content.screen == .knock {
        flight
          .frame(width: size.width, height: size.height)
          .accessibilityHidden(content.screen == .knock)
      }

      ZStack(alignment: .topLeading) {
        screen(ctx)
          .id(content.screen)
          .transition(.asymmetric(insertion: content.noFade ? .identity : .opacity, removal: .identity))
      }
      .frame(width: size.width, height: size.height, alignment: .topLeading)
      // a fade, not a move, so Reduce Motion keeps it
      .animation(content.noFade ? nil : .easeOut(duration: 0.22), value: content.screen)

      if content.screen.nest {
        KObNestEgg(shell: content.shell, lit: content.pips, voice: content.voice, still: content.still, label: content.w("nest.a11y"), value: content.w("nest.value"), actions: actions)
          .frame(width: size.width)
          .offset(y: topInset + KOb.topBarH)
      }

      // the sheets go over the nest egg too (React Native's 8a is a Modal)
      if content.screen == .doorstep && content.side == .signin {
        KObSignInSheet(ctx: ctx)
          .frame(width: size.width, height: size.height)
          .transition(.identity)
      }
      if content.screen == .stamp && content.side == .tray {
        KObTraySheet(ctx: ctx)
          .frame(width: size.width, height: size.height)
      }

      if content.demo {
        Text(verbatim: "DEMO")
          .kText(.mono(9, .semibold, tracking: 0.155))
          .foregroundStyle(KOb.acid)
          .padding(.horizontal, 7)
          .padding(.vertical, 3)
          .background(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(KOb.ink))
          .frame(width: size.width - 12, alignment: .trailing)
          .offset(y: topInset + 12)
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
    }
    .frame(width: size.width, height: size.height, alignment: .topLeading)
    .overlayPreferenceValue(KObChickAnchor.self) { anchor in
      GeometryReader { proxy in
        if let anchor, content.screen == .name || content.screen == .address || content.screen == .knock {
          let r = proxy[anchor]
          ZStack(alignment: .bottomTrailing) {
            chick.frame(width: r.width, height: r.height)
            if content.screen == .address {
              // what it holds on 11: your envelope (drawn here, rule B, where the React Native
              // chick's `holding` went: at its right, 8% of its size up)
              KObPlainEnvelope(width: 58, tilt: -14)
                .padding(.bottom, r.height / 1.12 * 0.08)
                .allowsHitTesting(false)
            }
          }
          .frame(width: r.width, height: r.height)
          .position(x: r.midX, y: r.midY)
        }
      }
    }
  }

  @ViewBuilder
  private func screen(_ ctx: KObCtx) -> some View {
    switch content.screen {
    case .doorstep:
      KObDoorstep(ctx: ctx, routeBird: routeBird, onEggHandoff: { eggFromDoor = true })
    case .egg:
      KObEggScreen(ctx: ctx, fromDoor: eggFromDoor)
    case .birthday:
      if content.side == .underage {
        KObUnderage(ctx: ctx)
      } else {
        KObBirthday(ctx: ctx)
      }
    case .pronoun:
      KObPronoun(ctx: ctx)
    case .face:
      KObFaceScreen(ctx: ctx)
    case .envelope:
      KObEnvelopeScreen(ctx: ctx)
    case .letter:
      KObLetterScreen(ctx: ctx)
    case .stamp:
      KObStampScreen(ctx: ctx)
    case .hatch:
      KObHatchScreen(ctx: ctx, stage: hatch)
    case .name:
      KObNameScreen(ctx: ctx)
    case .address:
      KObAddressScreen(ctx: ctx)
    case .flight:
      // FirstFlight is the whole screen (an island behind this layer); nothing here takes a tap
      Color.clear.allowsHitTesting(false)
    case .knock:
      KObKnockScreen(ctx: ctx)
    }
  }
}

/// What every screen gets: the content, the window, the insets, the keyboard and the channel.
struct KObCtx {
  let content: KObContent
  let size: CGSize
  let top: CGFloat
  let bottom: CGFloat
  /// the keyboard's height over the window (0 while it is down)
  let keyboard: CGFloat
  let reduceMotion: Bool
  let actions: KObActions
  let driver: KObDriver

  var keyboardUp: Bool { keyboard > 1 }
  func w(_ key: String) -> String { content.w(key) }
  func send(_ type: String, _ s: String = "", _ n: Double = 0) { actions.send(type, s, n) }
  /// a haptic, played by TS through the run's own haptics (parts/haptics: one name per meaning)
  func haptic(_ kind: String) { actions.send("haptic", kind) }
}

enum KObSpace {
  /// the run's window: every flight and every measured frame is in it
  static let root = "obRoot"
}

/// Where the chick island goes on 10, 11 and 13 (the screen leaves a slot of its size).
struct KObChickAnchor: PreferenceKey {
  static let defaultValue: Anchor<CGRect>? = nil
  static func reduce(value: inout Anchor<CGRect>?, nextValue: () -> Anchor<CGRect>?) {
    value = value ?? nextValue()
  }
}

/// The slot the chick island fills: `size` is the chick's (React Native's Chick box is 1.6 × 1.12
/// of it). The island takes its own taps and says its own name to VoiceOver (the chick's reaction
/// to a finger is React Native's), so the slot is nothing to either.
struct KObChickSlot: View {
  let size: CGFloat

  var body: some View {
    Color.clear
      .frame(width: size * 1.6, height: size * 1.12)
      .anchorPreference(key: KObChickAnchor.self, value: .bounds) { $0 }
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// VoiceOver: the whole run is one view whose screens swap in place, so the cursor is put on a
/// screen's headline once its fade is over (parts/frame useFocusOnMount).
struct KObFocusOnAppear: ViewModifier {
  var delay: Double = 0.26
  var again: AnyHashable? = nil
  @AccessibilityFocusState private var focused: Bool

  func body(content: Content) -> some View {
    content
      .accessibilityFocused($focused)
      .task(id: again) {
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        focused = true
      }
  }
}

extension View {
  func obFocusOnAppear(delay: Double = 0.26, again: AnyHashable? = nil) -> some View {
    modifier(KObFocusOnAppear(delay: delay, again: again))
  }
}
