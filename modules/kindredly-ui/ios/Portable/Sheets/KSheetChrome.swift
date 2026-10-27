// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SHEETS' FACE, AS iOS DRAWS ONE, in SwiftUI: the twin of src/components/sheet-chrome.tsx
 (owner, 2026-10-20: the ruled paper sheets "feel dated … make them Apple-native"). The leave
 sheet and the sign-up sheet (KSharedSheets.swift) both wear it, as their React Native twins wear
 sheet-chrome, so a change to one face is a change to both files.

 A card floating 8pt in from the screen's sides with large continuous corners (34), no rules; the
 title in the system face, centred, with the body under it; a round grey ✕ in the corner; capsule
 keys 50 tall in the system face. Colours are the theme's: the card is sf, the filled key ind (the
 pen) with the page colour on it, the quiet key the soft wash with ink, the plain key bare with
 ind; the destructive key is iOS's own red on a pale red wash. Flat, as every control is under
 rule B; only the card itself has a soft shadow, the iOS sheet's.

 Stage: the dim over everything the Host is given (a tap on it cancels; VoiceOver skips it, as
 the React Native dim is accessible={false}) and the card hanging off its bottom edge. They come
 in as Reanimated's FadeIn.duration(160) and SlideInDown.duration(260) bring the React Native
 sheet in: both on withTiming's default curve (in-out quad), the card from a whole Host's height
 below. With Reduce Motion both are simply there, as Reanimated's layout animations skip
 themselves then. Closing is instant on both sides: TS unmounts the Host as React Native unmounts
 its sheet.
 */
public enum KSheetChrome {
  /// the card's corners (sheet-chrome SHEET_RADIUS)
  public static let radius: CGFloat = 34
  /// in from the screen's sides
  public static let side: CGFloat = 8
  /// above the title, under the last key
  public static let topPad: CGFloat = 22
  public static let bottomPad: CGFloat = 14
  /// the keys' column: in from the card's sides, between keys
  public static let keyInset: CGFloat = 16
  public static let keyGap: CGFloat = 10

  /// Reanimated's FadeIn.duration(160): withTiming's default ease, in-out quad
  static let dimIn = Animation.timingCurve(0.455, 0.03, 0.515, 0.955, duration: 0.16)
  /// Reanimated's SlideInDown.duration(260), on the same curve
  static let rise = Animation.timingCurve(0.455, 0.03, 0.515, 0.955, duration: 0.26)

  /// iOS's system red, light and dark (sheet-chrome systemRed)
  static func systemRed(_ theme: KTheme) -> Color {
    theme.isDark ? Color(hex: "#FF453A") : Color(hex: "#FF3B30")
  }

  /// What a key is: the filled pen key, the red one, the soft one, or bare words.
  public enum KeyKind: String, Sendable {
    case primary, destructive, quiet, plain

    /// sheet-chrome sheetKey's ground
    func ground(_ theme: KTheme) -> Color {
      switch self {
      case .primary: return theme.ind
      case .destructive:
        return theme.isDark
          ? Color(.sRGB, red: 255 / 255, green: 69 / 255, blue: 58 / 255, opacity: 0.18)
          : Color(.sRGB, red: 255 / 255, green: 59 / 255, blue: 48 / 255, opacity: 0.10)
      case .quiet: return theme.soft
      case .plain: return .clear
      }
    }

    /// sheet-chrome sheetKeyLabel's colour
    func ink(_ theme: KTheme) -> Color {
      switch self {
      case .primary: return theme.bg
      case .destructive: return KSheetChrome.systemRed(theme)
      case .quiet: return theme.ink
      case .plain: return theme.ind
      }
    }
  }

  /// A Pressable's press: the whole key goes to `pressed` while the finger is down (no animation,
  /// as React Native's style function), and to `dimmed` while it is turned off.
  struct Press: ButtonStyle {
    var pressed: Double = 0.7
    var dimmed: Double? = nil

    func makeBody(configuration: Configuration) -> some View {
      configuration.label
        .opacity(dimmed ?? (configuration.isPressed ? pressed : 1))
    }
  }

  /// The dim and the card rising over it, filling whatever the Host is given (see the top).
  struct Stage<Card: View>: View {
    let theme: KTheme
    let dim: Color
    /// room under the card: max(safe bottom − 26, 8) and any tab-bar room, from TS
    let bottomMargin: CGFloat
    /// the card's tallest (TS: the window less the status bar, 12 and any tab-bar room)
    let maxHeight: CGFloat
    let onCancel: () -> Void
    @ViewBuilder let card: () -> Card

    @State private var up = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
      let shown = up || reduceMotion
      GeometryReader { geo in
        dim
          .animation(KSheetChrome.dimIn) { $0.opacity(shown ? 1 : 0) }
          .contentShape(Rectangle())
          .onTapGesture(perform: onCancel)
          .accessibilityHidden(true)
          .overlay(alignment: .bottom) {
            card()
              .frame(maxWidth: .infinity)
              .background {
                RoundedRectangle(cornerRadius: KSheetChrome.radius, style: .continuous)
                  .fill(theme.sf)
                  .shadow(color: .black.opacity(0.12), radius: 24, x: 0, y: 8)
              }
              // offers the card no more than maxHeight; the card keeps its own height inside
              // (the frame itself is that tall and empty above it, so a tap there is the dim's)
              .frame(maxHeight: maxHeight, alignment: .bottom)
              .padding(.horizontal, KSheetChrome.side)
              .padding(.bottom, bottomMargin)
              .animation(KSheetChrome.rise) { $0.offset(y: shown ? 0 : geo.size.height) }
              // the card is the modal part: VoiceOver stays in it, and the escape (two-finger
              // scrub) cancels instead of travelling up to the screen behind and popping it
              .accessibilityElement(children: .contain)
              .accessibilityAddTraits(.isModal)
              .accessibilityAction(.escape, onCancel)
          }
      }
      .ignoresSafeArea()
      .onAppear { up = true }
    }
  }

  /// The title, centred, and the round ✕ in the corner (sheet-chrome SheetHeader). The title
  /// stops growing at accessibility size 1 (React Native: maxFontSizeMultiplier 1.6), the ✕ at
  /// xxLarge (1.3).
  struct Header: View {
    let theme: KTheme
    let title: String
    /// VoiceOver for the ✕ (wren.trackClose)
    let closeLabel: String
    let titleFocus: AccessibilityFocusState<Bool>.Binding
    let onClose: () -> Void

    var body: some View {
      Text(title)
        .kText(.system(17, .medium, lineHeight: 22 / 17))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .frame(maxWidth: .infinity, minHeight: 30)
        .padding(.horizontal, 56)
        .accessibilityAddTraits(.isHeader)
        .accessibilityFocused(titleFocus)
        .overlay(alignment: .topTrailing) {
          Button(action: onClose) {
            Text(verbatim: "✕")
              .kText(.system(13, .bold))
              .foregroundStyle(theme.mute)
              .dynamicTypeSize(...DynamicTypeSize.xxLarge)
              .frame(width: 30, height: 30)
              .background(Circle().fill(theme.soft))
              // hitSlop 10
              .padding(10)
              .contentShape(Rectangle())
          }
          .buttonStyle(Press(pressed: 0.6))
          .accessibilityLabel(closeLabel)
          // right 16, top −6, less the 10 of slop around it
          .padding(.trailing, 16 - 10)
          .offset(y: -6 - 10)
        }
    }
  }

  /// The body under the title (sheet-chrome SheetBody): system 15/21 in sub, centred.
  struct Body: View {
    let theme: KTheme
    let text: String

    var body: some View {
      Text(text)
        .kText(.system(15, lineHeight: 21 / 15))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 24)
        .padding(.top, 6)
        .padding(.bottom, 20)
    }
  }

  /// A capsule key (sheet-chrome sheetKey + sheetKeyLabel): at least 50 tall, corners 25 (they
  /// stay 25 when a long label makes the key taller), system 17/22, 600 but for the plain key.
  /// With a `lead` (a flag), the mark sits in a 34-wide column and the label ranges left, so a
  /// list of them lines up; VoiceOver doesn't read the mark.
  struct Key: View {
    let theme: KTheme
    let kind: KeyKind
    let label: String
    var lead: String = ""
    /// the opacity while it is turned off (the sign-up sheet's email key while signing in)
    var dimmed: Double? = nil
    let action: () -> Void

    var body: some View {
      Button(action: action) {
        HStack(spacing: 0) {
          if !lead.isEmpty {
            Text(verbatim: lead)
              .kText(.system(17, lineHeight: 20 / 17))
              .frame(width: 34, alignment: .leading)
              .accessibilityHidden(true)
          }
          Text(label)
            .kText(.system(17, kind == .plain ? .regular : .semibold, lineHeight: 22 / 17))
            .foregroundStyle(kind.ink(theme))
            .multilineTextAlignment(lead.isEmpty ? .center : .leading)
            .frame(maxWidth: .infinity, alignment: lead.isEmpty ? .center : .leading)
        }
        .padding(.horizontal, lead.isEmpty ? 20 : 18)
        .padding(.vertical, 13)
        .frame(maxWidth: .infinity, minHeight: 50)
        .background(RoundedRectangle(cornerRadius: 25, style: .continuous).fill(kind.ground(theme)))
        .contentShape(RoundedRectangle(cornerRadius: 25, style: .continuous))
      }
      .buttonStyle(Press(dimmed: dimmed))
    }
  }
}
