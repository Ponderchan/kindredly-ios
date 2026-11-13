// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 NOTES WITH NOTHING IN IT YET — E1, "ask first" (owner, 2026-10-19; design
 .claude/mock/notes-empty/CLAUDE-CODE-PROMPTS-NOTES-EMPTY.md Prompts 1 and 3, with our own icons
 and our own composer instead of the prototype's faces and editor).

   ┌ radius 28, clear until a mood is chosen ─────────┐
   │        how was today, honestly?                  │   system 28 semibold, 1.15, centred
   │   [calm] [happy] [tired] [low]                   │   64×64 r20 tiles: our group icons
   │   ┌ draft card (after a tap) ──────────────┐     │
   │   │ [■] OCT 19 · 21:37                      │     │   the group square 36 + the time
   │   │ what made it so?|                       │     │   grey follow-up (system 17) + caret
   │   └─────────────────────────────────────────┘     │
   └──────────────────────────────────────────────────┘

 EVERY WORD OF THE EMPTY BLOCK IS IN THE SYSTEM FONT (contract D12; the owner: "字体就不加别的 统一我们 default 字体
 大一些"): the title, the mood line, the card's time and follow-up — no letter face, no italic, no
 mono on this screen. The words are TS's (strings-notes-empty.ts via KNotesStrings ne*).

 A TAP on a tile: it grows to 1.18 and lifts 6 (.35s, the mock's cubic-bezier(.3,1.6,.5,1)), the
 others fade to .35; the block's ground fades to the group's fill at 40% (.5s); the title becomes
 the mood's line; the draft card pops (.4s). Another tile switches. Reduce Motion: no growth, no
 lift, no pop — crossfades only. The tiles are the Notes mood chips' own colours (KMoodGroup.mood)
 and icons (mood-group-<g>, KMoodChip), drawn bigger.

 THE CARD is the Notes card's dress (KNoteCard: the surface, a 1.5 line outline, corners 22,
 padding 14 16 16). Tapping it reports the group (actions.onEmptyWrite); TS hands the mood and the
 follow-up (as the composer's placeholder, never saved) to the composer and opens it. Which mood is
 chosen is only this view's state: coming back without saving finds it still chosen.

 KNotesFirstLine is Notes E1's other half: after the first page, Wren's one-time "first one down.
 same time tomorrow?" in the Wren line's slot, in the Letter font (her words are content, owner
 2026-10-20) on a soft bubble (KNotesScreen
 draws it instead of KNotesWrenLine when content.wrenFirst).
 */

/// The old empty note's fixed colours (from TS: the note keys' P.keyText / P.keyVoice, the tape, the
/// sticker). E1 draws none of them; still carried so the bridge's record keeps its shape.
public struct KNotesEmptyPalette: Equatable, Sendable {
  public let keyText: Color
  public let keyVoice: Color
  public let tape: Color
  public let sticker: Color

  public init(keyText: Color, keyVoice: Color, tape: Color, sticker: Color) {
    self.keyText = keyText
    self.keyVoice = keyVoice
    self.tape = tape
    self.sticker = sticker
  }
}

struct KNotesEmpty: View {
  static let title = KTextStyle.system(28, .semibold, lineHeight: 1.15)
  static let time = KTextStyle.system(13, .medium)
  static let ask = KTextStyle.system(17, lineHeight: 24.5 / 17.0)
  static let tile = KMoodChip.Metrics(size: 64, cornerRadius: 20, faceSize: 38)
  /// the tile's growth: .35s, the mock's cubic-bezier(.3,1.6,.5,1)
  static let grow = Animation.timingCurve(0.3, 1.6, 0.5, 1, duration: 0.35)
  /// the draft card's pop: .4s with a small overshoot
  static let pop = Animation.timingCurve(0.3, 1.2, 0.4, 1, duration: 0.4)
  static let ground = Animation.easeOut(duration: 0.5)
  static let fade = Animation.easeInOut(duration: 0.25)

  let theme: KTheme
  let strings: KNotesStrings
  let actions: KNotesActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var chosen: KMoodGroup?

  private func index(_ g: KMoodGroup) -> Int {
    KMoodGroup.allCases.firstIndex(of: g) ?? 0
  }

  private func word(_ list: [String], _ g: KMoodGroup) -> String {
    let i = index(g)
    return i < list.count ? list[i] : ""
  }

  private var titleText: String {
    guard let g = chosen else { return strings.neTitle }
    let line = word(strings.neLines, g)
    return line.isEmpty ? strings.neTitle : line
  }

  var body: some View {
    VStack(spacing: 28) {
      Text(titleText)
        .kText(Self.title)
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .contentTransition(.opacity)
        .accessibilityAddTraits(.isHeader)

      HStack(spacing: 14) {
        ForEach(KMoodGroup.allCases, id: \.self) { g in
          tile(g)
        }
      }

      if let g = chosen {
        draftCard(g)
          .transition(reduceMotion ? .opacity : .scale(scale: 0.9, anchor: .top).combined(with: .opacity))
      }
    }
    .padding(.horizontal, 18)
    .padding(.top, 28)
    .padding(.bottom, 40)
    .frame(maxWidth: .infinity)
    .background {
      RoundedRectangle(cornerRadius: 28, style: .continuous)
        // the pastel fill at 40% greys out on Midnight's navy; there the mood's own ink, thin, keeps
        // the colour clean (owner saw it muddy, 10-19)
        .fill(chosen.map { theme.isDark ? $0.mood.ink.opacity(0.2) : $0.mood.fill.opacity(0.4) } ?? .clear)
        .animation(Self.ground, value: chosen)
    }
    .padding(.horizontal, 16)
    .sensoryFeedback(.selection, trigger: chosen)
  }

  private func choose(_ g: KMoodGroup) {
    guard chosen != g else { return }
    withAnimation(reduceMotion ? Self.fade : Self.pop) { chosen = g }
  }

  private func tile(_ g: KMoodGroup) -> some View {
    let on = chosen == g
    let grows = on && !reduceMotion
    return SwiftUI.Button { choose(g) } label: {
      KMoodChip(group: g, icon: g.iconKey, metrics: Self.tile)
        .scaleEffect(grows ? 1.18 : 1)
        .offset(y: grows ? -6 : 0)
        // the others step back; on Midnight a pastel at .35 mixes into grey, so they go further back
        .opacity(chosen == nil || on ? 1 : (theme.isDark ? 0.2 : 0.35))
        .animation(reduceMotion ? Self.fade : Self.grow, value: chosen)
        .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel(word(strings.neGroupNames, g))
    .accessibilityAddTraits(on ? .isSelected : [])
  }

  private func draftCard(_ g: KMoodGroup) -> some View {
    let ask = word(strings.neAsks, g)
    let shape = RoundedRectangle(cornerRadius: 22, style: .circular)
    return SwiftUI.Button { actions.onEmptyWrite(g.rawValue) } label: {
      VStack(alignment: .leading, spacing: 12) {
        HStack(spacing: 10) {
          KMoodChip(group: g, icon: g.iconKey, metrics: .card)
          Text(strings.neTime)
            .kText(Self.time)
            .foregroundStyle(theme.mute)
            .lineLimit(2)
            .fixedSize(horizontal: false, vertical: true)
          Spacer(minLength: 0)
        }
        // the caret where typing would start, BEFORE the grey ask, as a text field's placeholder sits
        // after its caret (owner, TestFlight b43, 2026-11-13: "光标要在 no need explain 前面"); centred
        // on the first line (24.5 tall), the ask running on under it
        HStack(alignment: .top, spacing: 2) {
          KNotesCaret(color: theme.ind)
            .padding(.top, (24.5 - 20) / 2)
          Text(ask)
            .kText(Self.ask)
            .foregroundStyle(theme.faint)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
      .padding(EdgeInsets(top: 14, leading: 16, bottom: 16, trailing: 16))
      .padding(1.5)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background { shape.fill(theme.sf) }
      .overlay { shape.strokeBorder(theme.line, lineWidth: 1.5) }
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(strings.neA11yCard)
    .accessibilityHint(ask)
    .accessibilityAddTraits(.isButton)
  }
}

/// The draft card's caret: 2×20, blinking as a text field's does (on .5s, off .5s).
private struct KNotesCaret: View {
  let color: Color

  var body: some View {
    TimelineView(.periodic(from: .now, by: 0.5)) { context in
      let on = Int(context.date.timeIntervalSinceReferenceDate * 2) % 2 == 0
      RoundedRectangle(cornerRadius: 1, style: .circular)
        .fill(color)
        .frame(width: 2, height: 20)
        .opacity(on ? 1 : 0)
    }
    .accessibilityHidden(true)
  }
}

/// Wren's one-time line after the first page (Notes E1, Prompt 3): her bird and the words in the
/// Letter font on a soft bubble, in the Wren line's slot. A tap closes it (TS spends the flag when it
/// first shows, so it never comes back).
struct KNotesFirstLine: View {
  static let bird: CGFloat = 26
  static let line = KTextStyle.content(16, lineHeight: 22.0 / 16)

  let theme: KTheme
  let bird: KImageRef?
  let text: String
  let onTap: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var shown = false
  @State private var leaving = false

  var body: some View {
    SwiftUI.Button(action: close) {
      HStack(alignment: .center, spacing: 10) {
        KImage(bird, size: CGSize(width: Self.bird, height: Self.bird), contentMode: .fit, placeholder: .clear)
        Text(text)
          .kText(Self.line)
          .foregroundStyle(theme.ink)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.horizontal, 14)
          .padding(.vertical, 10)
          .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(theme.soft))
        Spacer(minLength: 0)
      }
      .padding(.vertical, 6)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .opacity(leaving ? 0 : (shown ? 1 : 0))
    .offset(y: shown || reduceMotion ? 0 : 6)
    .onAppear {
      guard !shown else { return }
      if reduceMotion {
        shown = true
      } else {
        withAnimation(.easeOut(duration: 0.42)) { shown = true }
      }
    }
  }

  private func close() {
    guard !leaving else { return }
    if reduceMotion {
      onTap()
      return
    }
    withAnimation(.easeIn(duration: 0.2)) { leaving = true }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { onTap() }
  }
}
