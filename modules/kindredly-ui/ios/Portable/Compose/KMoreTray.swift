// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE + TRAY (ComposeTray.tsx MoreTray, drawn the 10a way): where the keyboard was, 296 above the
 home indicator, on soft with a 1pt line along its top. Two cells, 10 apart from 18 in and 22
 down: ASK A QUESTION (a question under the letter, where a reply begins) and VOICE LETTER.
 A cell is a 62 square with corners of 16 — sf with a 1pt line edge, or ink when it is on, the
 drawing in the page colour then — over its label in mono 600 9 at .1em in sub. The voice cell
 is First Class: for anyone else its microphone is drawn at .45 with a small ind padlock badge
 (18, bg lock) at its corner, and a tap goes to the paywall (TS decides). The ASK cell is off
 while speaking (a recording carries no question, and the question field is drawn only under a
 written letter): its drawing and label at .45, not pressable, and VoiceOver says why (dimmed,
 "Only with a written letter"), so a tap never lights a cell for a field that isn't there.

 The two drawings are ComposeTray's own: a question mark drawn in one stroke with its dot, and a
 microphone on a stand, 1.7-1.8 strokes with round caps on the 24 grid, 26 across.
 */
struct KMoreTray: View {
  let theme: KTheme
  let askLabel: String
  let voiceLabel: String
  /// VoiceOver's value on the locked voice cell ("First Class only")
  let voiceLockedLabel: String
  /// VoiceOver's value on the ASK cell while it is off ("Only with a written letter")
  let askDisabledLabel: String
  let askOn: Bool
  /// the ASK cell is off (speaking)
  let askDisabled: Bool
  let voiceOn: Bool
  let voiceLocked: Bool
  let onAsk: () -> Void
  let onVoice: () -> Void

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      cell(label: askLabel, on: askOn, locked: false, disabled: askDisabled, value: askDisabled ? askDisabledLabel : "", glyph: .question, action: onAsk)
      cell(label: voiceLabel, on: voiceOn, locked: voiceLocked, disabled: false, value: voiceLocked ? voiceLockedLabel : "", glyph: .mic, action: onVoice)
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 18)
    .padding(.top, 22)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(theme.soft)
    .overlay(alignment: .top) {
      Rectangle().fill(theme.line).frame(height: 1)
    }
  }

  private func cell(label: String, on: Bool, locked: Bool, disabled: Bool, value: String, glyph: KMoreGlyph.Kind, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      VStack(spacing: 8) {
        ZStack {
          RoundedRectangle(cornerRadius: 16, style: .circular)
            .fill(on ? theme.ink : theme.sf)
          RoundedRectangle(cornerRadius: 16, style: .circular)
            .strokeBorder(on ? theme.ink : theme.line, lineWidth: 1)
          KMoreGlyph(kind: glyph)
            .stroke(on ? theme.bg : theme.ink, style: StrokeStyle(lineWidth: glyph == .question ? 1.8 * 26 / 24 : 1.7 * 26 / 24, lineCap: .round, lineJoin: .round))
            .overlay {
              if glyph == .question {
                // the question mark's dot, filled
                KMoreGlyph(kind: .questionDot).fill(on ? theme.bg : theme.ink)
              }
            }
            .frame(width: 26, height: 26)
            .opacity(locked || disabled ? 0.45 : 1)
        }
        .frame(width: 62, height: 62)
        .overlay(alignment: .bottomTrailing) {
          if locked {
            ZStack {
              Circle().fill(theme.ind)
              KLineIcon(.lock, size: 10, lineWidth: 2.2, color: theme.bg)
            }
            .frame(width: 18, height: 18)
            .offset(x: 5, y: 5)
          }
        }
        Text(label)
          .kText(.mono(9, .semibold, tracking: 0.1))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .opacity(disabled ? 0.45 : 1)
      }
      .frame(width: 82)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .disabled(disabled)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(label)
    .accessibilityValue(value)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}

/// The + tray's two drawings, on the 24 grid (ComposeTray QuestionGlyph, MicGlyph).
struct KMoreGlyph: Shape {
  enum Kind {
    case question
    case questionDot
    case mic
  }

  let kind: Kind

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    switch kind {
    case .question:
      return KSVGPath.path("M8.6 9.2a3.4 3.4 0 1 1 5.2 2.9c-1.2.8-1.8 1.5-1.8 2.9").applying(place)
    case .questionDot:
      return Path(ellipseIn: CGRect(x: 12 - 1.25, y: 18.6 - 1.25, width: 2.5, height: 2.5)).applying(place)
    case .mic:
      var p = Path(roundedRect: CGRect(x: 9, y: 3.5, width: 6, height: 10.5), cornerRadius: 3)
      p.addPath(KSVGPath.path("M6 11.5a6 6 0 0 0 12 0M12 17.5v3M9 20.5h6"))
      return p.applying(place)
    }
  }
}

/*
 THE PAPER STRIP (letter papers, owner 2026-10-20; Prompt 4, contract §5.2): a tray like the
 others, where the keyboard was, 168 above the home indicator, on soft with a 1.5 line along its
 top; 14 down and 20 in, 10 apart. The head row: PAPER · KRAFT in mono 500 10 at .14em in sub,
 then 8 later its tag (· FIRST CLASS in gold text, · FIRST KINDRED in ind); DONE on the right in
 mono 500 10 at .12em in mute, a 44 target that closes the strip. Under it the seven papers in a
 row that scrolls sideways (no indicators; SwiftUI's own drag tells a scroll from a tap, as the
 prototype's 6pt rule did): each the paper itself at 48 × 60 (KPaperSurface mini) and 6 under
 it its name, lower case, in mono 600 8 in sub (ind when chosen). A First Class paper wears the
 gold 1ST at its top right (#D8A63F, a 1.5 ink edge, corners of 3, mono 600 7 in ink), Airmail
 before a first kindred a padlock on a 14 white circle edged 1.5 in ink. The chosen one stands
 4 higher inside a double ring (2 sf, then 2 ind outside it), over .2s. A tap picks it and the
 strip stays open; a paper that can't go yet is picked all the same (the page previews it and
 the key says why). One VoiceOver button per paper: its name, its value (First Class / Opens with
 your first kindred), selected on the chosen one. The swatches keep their own colours in every
 theme.
 */
struct KPaperTray: View {
  let theme: KTheme
  let papers: [KComposePaperItem]
  let selectedId: String
  let head: KComposePaperHead
  let doneLabel: String
  let badgeFirst: String
  let bottomInset: CGFloat
  let onPick: (String) -> Void
  let onDone: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      headRow
      ScrollView(.horizontal) {
        HStack(alignment: .top, spacing: 12) {
          ForEach(papers) { item in
            cell(item)
          }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 2)
      }
      .scrollIndicators(.hidden)
      // the chosen swatch's lift and ring, and the badges, reach past the row's 6
      .scrollClipDisabled()
      // the ScrollView runs to the tray's edges; its first swatch keeps the 20 margin
      .contentMargins(.horizontal, 20, for: .scrollContent)
      .padding(.horizontal, -20)
      Spacer(minLength: 0)
    }
    .padding(.top, 14)
    .padding(.horizontal, 20)
    .padding(.bottom, bottomInset)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(theme.soft)
    .overlay(alignment: .top) {
      Rectangle().fill(theme.line).frame(height: 1.5)
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  private var headRow: some View {
    HStack(spacing: 0) {
      Text(head.title)
        .kText(.mono(10, .medium, tracking: 0.14))
        .foregroundStyle(theme.sub)
        .lineLimit(1)
      if !head.tag.isEmpty {
        Text(head.tag)
          .kText(.mono(10, .medium, tracking: 0.14))
          .foregroundStyle(head.tone == .gold ? KBrand.goldText : theme.ind)
          .lineLimit(1)
          .padding(.leading, 8)
      }
      Spacer(minLength: 8)
      SwiftUI.Button(action: onDone) {
        Text(doneLabel)
          .kText(.mono(10, .medium, tracking: 0.12))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .frame(minWidth: 44, minHeight: 44, alignment: .trailing)
          .contentShape(Rectangle())
      }
      .buttonStyle(KAsIsButtonStyle())
    }
    .minimumScaleFactor(0.8)
    // the 44 target of DONE without pushing the row down
    .frame(height: 20)
    .accessibilityElement(children: .contain)
  }

  private func cell(_ item: KComposePaperItem) -> some View {
    let selected = item.id == selectedId
    let size = KPaper.swatch
    return SwiftUI.Button {
      onPick(item.id)
    } label: {
      VStack(spacing: 6) {
        KPaperSurface(paper: item.paper, theme: theme, mini: true)
          .frame(width: size.width, height: size.height)
          .overlay {
            if selected {
              // the double ring: 2 sf, then 2 ind outside it
              let r = item.paper.miniRadius
              RoundedRectangle(cornerRadius: r + 2, style: .circular)
                .strokeBorder(theme.sf, lineWidth: 2)
                .padding(-2)
              RoundedRectangle(cornerRadius: r + 4, style: .circular)
                .strokeBorder(theme.ind, lineWidth: 2)
                .padding(-4)
            }
          }
          .overlay(alignment: .topTrailing) {
            badge(item.badge)
              .offset(x: 4, y: -6)
          }
          .offset(y: selected ? -4 : 0)
        Text(item.name)
          .kText(.mono(8, .semibold))
          .foregroundStyle(selected ? theme.ind : theme.sub)
          .lineLimit(1)
          .fixedSize()
      }
      .frame(minWidth: size.width)
      .contentShape(Rectangle())
    }
    .buttonStyle(KAsIsButtonStyle())
    .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: selected)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(item.accessibilityLabel)
    .accessibilityValue(item.accessibilityValue)
    .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
  }

  @ViewBuilder private func badge(_ badge: KComposePaperItem.Badge) -> some View {
    switch badge {
    case .first:
      Text(badgeFirst)
        .kText(.mono(7, .semibold))
        .foregroundStyle(KBrand.inkOnBrand)
        .lineLimit(1)
        .fixedSize()
        .padding(.vertical, 1)
        .padding(.horizontal, 4)
        .background {
          RoundedRectangle(cornerRadius: 3, style: .circular).fill(KBrand.waxGold)
        }
        .overlay {
          RoundedRectangle(cornerRadius: 3, style: .circular).strokeBorder(KBrand.inkOnBrand, lineWidth: 1.5)
        }
    case .lock:
      ZStack {
        Circle().fill(Color.white)
        Circle().strokeBorder(KBrand.inkOnBrand, lineWidth: 1.5)
        Image(systemName: "lock.fill")
          .font(.system(size: 7, weight: .bold))
          .foregroundStyle(KBrand.inkOnBrand)
      }
      .frame(width: 14, height: 14)
    case .none:
      EmptyView()
    }
  }
}
