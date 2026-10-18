// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE + TRAY (chat composers, Prompt 6; the owner's final, 2026-10-18): the Kindreds bar's + opens
 it at the bottom of the room, under the bar, which rides 12 above it. Four small things to leave.

   ╭──────────────────────────────────────────╮   a sheet on sf, corners 28 28 0 0, a soft
   │                  ▬▬▬▬                    │   shadow 0 -10 30 -12 rgba(30,27,53,.35) up over
   │  Leave something small                   │   the gap (Midnight: black, and a 1pt line edge,
   │ ┌─────────────────┐ ┌─────────────────┐  │   as KFloat's: no shadow shows on its page);
   │ │ ▤  Fold a note  │ │ ?  Ask something│  │   padding 12 16 0; the handle 40 × 6 in line,
   │ │    opens when … │ │    your own …   │  │   10 above the title (system 13 in mute, 4 in,
   │ └─────────────────┘ └─────────────────┘  │   as written: "Leave something small"), 10
   │ ┌─────────────────┐ ┌─────────────────┐  │   above the grid
   │ │ ◘  Tiny moment  │ │ ♫  Leave a song │  │
   │ └─────────────────┘ └─────────────────┘  │
   ╰──────────────────────────────────────────╯

 - 270 tall over the iPhone's 34 home inset (236 above the inset, the inset or 14 below the
   grid), so the bar sits where the prototype draws it; larger Dynamic Type scrolls inside.
 - THE CARDS, two by two, 10 apart: at least 84 tall (both in a row one height), a 2 ln outline,
   corners 18, padding 0 14, 12 between the I1 icon (26 at 1.9, in ink) and the words: the
   trace's own title in system 600 15 (rm.note.t…: sentence case, Prompt 7) and its subtitle in
   system 11 on 1.3 in sub (rm.note.s…). Each on its mood's fill (TS: calm #DDEFD6 Fold a note,
   tired #E4E2F4 Ask something, low #CFE3F5 Tiny moment, happy #F6E7C6 Leave a song). Those
   fills are pale in every theme and Midnight's ink is pale too, so there each card is the
   mood's own ink mixed 30% into the theme's sf instead: four dark tints, one per play, under
   the theme's ink and sub.
 - It rises on KChatMotion.tray (.45s cubic-bezier(.3,1,.3,1): the height 0 → 270 as the bar
   and the list make room in the same transaction), and the four cards pop in together
   (KChatPopIn, .35s); under Reduce Motion it fades and the cards are simply there.
 - A card runs its flow as the tray always did (the owner hears the key: a fold, a question, one
   photo, a song) and closes the tray. The + again closes it, and so does a tap on the dim over
   the list (KConversation's KChatTrayScrim), or the field taking the keyboard (KChatDockView).
   VoiceOver's escape (two-finger Z) on a card closes it, rather than going back out of the room.
 */
struct KChatTray: View {
  let theme: KTheme
  let traces: [KChatTrace]
  let title: String
  let bottomInset: CGFloat
  @ObservedObject var driver: KConversationDriver
  let actions: KConversationActions
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the cards have popped in (they start low, small and clear each time the tray opens)
  @State private var cardsIn = false

  /// between the cards and the rows
  private static let gap: CGFloat = 10
  /// a card's least height, outline included (Prompt 6)
  static let cardHeight: CGFloat = 84
  /// the tray above the home inset: 12 + the handle 6 + 10 + the title + 10 + two rows of cards
  static let restHeight: CGFloat = 236

  /// The tray's height: 270 over a 34 home inset; the inset or 14 below the grid.
  static func height(bottomInset: CGFloat) -> CGFloat {
    restHeight + max(14, bottomInset)
  }

  private var shape: UnevenRoundedRectangle {
    UnevenRoundedRectangle(topLeadingRadius: 28, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 28, style: .circular)
  }

  /// the soft shadow over the gap above (Prompt 6), black in Midnight (KSoftShadow's rule)
  private var shadow: [KSoftShadow] {
    let color = theme.isDark ? Color.black.opacity(0.6) : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.35)
    return [KSoftShadow(y: -10, blur: 30, spread: -12, color: color)]
  }

  var body: some View {
    if driver.trayOpen && !traces.isEmpty {
      VStack(spacing: 0) {
        Capsule()
          .fill(theme.line)
          .frame(width: 40, height: 6)
          .frame(maxWidth: .infinity)
          .padding(.bottom, 10)
          .accessibilityHidden(true)
        ScrollView {
          VStack(alignment: .leading, spacing: 10) {
            if !title.isEmpty {
              Text(title)
                .kText(.system(13))
                .foregroundStyle(theme.mute)
                .padding(.leading, 4)
                .accessibilityAddTraits(.isHeader)
            }
            grid
          }
          .padding(.bottom, max(14, bottomInset))
        }
        .scrollBounceBehavior(.basedOnSize)
      }
      .padding(.top, 12)
      .padding(.horizontal, 16)
      .frame(maxWidth: .infinity)
      .frame(height: Self.height(bottomInset: bottomInset), alignment: .top)
      .background(shape.fill(theme.sf))
      .overlay {
        // Midnight's edge, as KFloat's: sf is barely off the page there
        if theme.isDark {
          shape.strokeBorder(theme.line, lineWidth: 1).allowsHitTesting(false)
        }
      }
      .kSoftShadows(shadow, in: shape)
      .dynamicTypeSize(...DynamicTypeSize.accessibility3)
      .transition(reduceMotion ? .opacity : .move(edge: .bottom))
      .accessibilityElement(children: .contain)
      .accessibilityAction(.escape) { close() }
      .onAppear {
        guard !reduceMotion else {
          cardsIn = true
          return
        }
        cardsIn = false
        withAnimation(KChatMotion.popIn(0.35)) { cardsIn = true }
      }
      .onDisappear { cardsIn = false }
    }
  }

  /// The cards two by two, both in a row one height.
  private var grid: some View {
    let rows = stride(from: 0, to: traces.count, by: 2).map { Array(traces[$0..<min($0 + 2, traces.count)]) }
    return VStack(spacing: Self.gap) {
      ForEach(rows, id: \.first?.key) { row in
        HStack(spacing: Self.gap) {
          ForEach(row) { trace in
            card(trace)
          }
          if row.count == 1 {
            Color.clear.frame(maxWidth: .infinity)
          }
        }
        .fixedSize(horizontal: false, vertical: true)
      }
    }
  }

  private func card(_ trace: KChatTrace) -> some View {
    let mood = trace.tint.mood
    let fill: Color = {
      guard let mood else { return theme.sf }
      return theme.isDark ? theme.sf.mix(with: mood.ink, by: 0.3, in: .device) : mood.fill
    }()
    let shape = RoundedRectangle(cornerRadius: 18, style: .circular)
    return SwiftUI.Button {
      select(trace.key)
    } label: {
      HStack(spacing: 12) {
        KLineIcon(trace.glyph, size: 26, lineWidth: 1.9, color: theme.ink)
        VStack(alignment: .leading, spacing: 3) {
          Text(trace.title)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(2)
            .fixedSize(horizontal: false, vertical: true)
          if !trace.subtitle.isEmpty {
            Text(trace.subtitle)
              .kText(.system(11, lineHeight: 1.3))
              .foregroundStyle(theme.sub)
              .lineLimit(3)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      // padding 0 14 inside the 2 outline; a little top and bottom keeps a long translation off it
      .padding(.horizontal, 14 + 2)
      .padding(.vertical, 10)
      .frame(maxWidth: .infinity, minHeight: Self.cardHeight, maxHeight: .infinity, alignment: .leading)
      .background(shape.fill(fill))
      .overlay(shape.strokeBorder(theme.ln, lineWidth: 2))
      .contentShape(shape)
    }
    .buttonStyle(KChatCardPress())
    .modifier(KChatPopIn(shown: cardsIn))
  }

  private func select(_ key: String) {
    close()
    actions.onTrace(key)
  }

  private func close() {
    withAnimation(KChatMotion.tray(reduceMotion: reduceMotion)) { driver.trayOpen = false }
  }
}

/// A big card going down under a finger: a little smaller, quickly (KFloatPressStyle's .94 is
/// for small keys).
struct KChatCardPress: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.97 : 1)
      .animation(KMotion.press, value: configuration.isPressed)
  }
}

/// The dim over the list while the + tray is open (Prompt 6: "tap + again or the dim to close"),
/// in the Today reply's scrim colours (KReplyDock): rgba(30,27,53,.18), Midnight black at .35. It
/// fades with the tray's own transaction; a tap closes the tray. Only this small view watches the
/// driver, so the list never redraws for it.
struct KChatTrayScrim: View {
  let theme: KTheme
  @ObservedObject var driver: KConversationDriver
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  private var color: Color {
    theme.isDark
      ? Color.black.opacity(0.35)
      : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.18)
  }

  var body: some View {
    color
      .opacity(driver.trayOpen ? 1 : 0)
      .contentShape(Rectangle())
      .onTapGesture {
        withAnimation(KChatMotion.tray(reduceMotion: reduceMotion)) { driver.trayOpen = false }
      }
      .allowsHitTesting(driver.trayOpen)
      .accessibilityHidden(true)
  }
}
