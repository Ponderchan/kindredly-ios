// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMP STRIP, "PICK A STAMP" (Let it travel L6, Prompt 4; owner, 2026-10-26). Where the
 keyboard was, 168 above the home indicator, the paper strip's sibling (KPaperTray): soft, a 1.5
 line along its top, 14 above its head and 20 in from the sides. Its head: PICK A STAMP in SF Mono
 10 at .14em in sub (as TS sends it, already in capitals), and DONE at the right (the paper
 strip's: System 13 in mute, a 44 target), which closes it. Under it, 10 down, ONE horizontal row,
 12 apart: each stamp itself at 48 × 58 (KStamp, your own stamp so flat) with its #topic under
 it, 6 down, in SF Mono 8 in sub, one line at its own width. The chosen one stands 4 higher in a
 double ring (2 of sf, then 2 of ind) and its #topic turns ind. A tap picks it: TS closes the
 strip, the bar's slot becomes the #topic capsule, the stamp takes the header's corner, and the
 CTA is ready (③) once the words are enough.

 THE ORDER IS THE TRAY'S (TS compose-model stampSections, and stripGroups for React Native): the
 season's stamps first (Halloween 2026, only in their season and on a binary that draws them),
 under their small marker (the pumpkin tag, mono 8 caps, the stamp tray's), then FOR THIS LETTER
 (read off the letter), RECENTLY USED, then the categories. A stamp shows once, where it first
 comes; a group left with nothing is dropped.

 MY OWN PHOTO STAMPS (contract §7 C): only while the feature exists for this reader (TS sends
 `custom`), the two glyph tabs of the stamp tray sit in the head after PICK A STAMP (the 36 / my
 own), and the custom tab's row is the dashed + (the Stamp Press, or the 3/3 card for Free at 3/3)
 and my approved stamps, newest first. Empty: the + and the line beside it. The 3/3 card is flat
 (a 1.5 ink edge, no hard shadow: controls flat, owner 2026-10-26).
 */
struct KStampStrip: View {
  /// the stamp's width in the row (48 × 58: KStamp is 1.2 × its width)
  static let tile: CGFloat = 48

  let theme: KTheme
  let sections: [KComposeStampSection]
  let selectedId: String
  let bottomInset: CGFloat
  let strings: KComposeStrings
  let onPick: (String) -> Void
  let onDone: () -> Void
  /// the custom tab; nil = no tabs (D10), the official stamps alone
  var custom: KComposeCustomTray? = nil
  var tab: KComposeTrayTab = .official
  var onTab: (KComposeTrayTab) -> Void = { _ in }
  var onMake: () -> Void = {}
  var onFullCta: () -> Void = {}

  @State private var fullCard = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// the tab drawn: custom only while it exists
  private var shown: KComposeTrayTab { custom == nil ? .official : tab }

  /// One run of the row: a section's stamps not already shown, and its marker.
  private struct Run: Identifiable {
    let id: String
    let mark: String
    let items: [KComposeStampItem]
  }

  /// the sections as one row: a stamp once, where it first comes; an emptied group dropped
  private var groups: [Run] {
    var seen = Set<String>()
    var out: [Run] = []
    for section in sections {
      let items = section.items.filter { seen.insert($0.id).inserted }
      if !items.isEmpty { out.append(Run(id: section.id, mark: section.mark, items: items)) }
    }
    return out
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      headRow
      ScrollView(.horizontal) {
        SwiftUI.Group {
          if shown == .custom, let custom {
            customRow(custom)
          } else {
            officialRow
          }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 2)
      }
      .scrollIndicators(.hidden)
      // the chosen stamp's lift and ring reach past the row's 6
      .scrollClipDisabled()
      // the row runs to the strip's edges; its first stamp keeps the 20 margin
      .contentMargins(.horizontal, 20, for: .scrollContent)
      .padding(.horizontal, -20)
      // a tab switch starts at the left
      .id(shown)
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
    .overlay {
      if fullCard, let custom, custom.full {
        fullCardView
          .transition(.opacity.combined(with: .scale(scale: 0.96)))
      }
    }
    .animation(.easeOut(duration: 0.18), value: fullCard)
    .onChange(of: shown) { _, _ in fullCard = false }
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  // ── the head ──

  private var headRow: some View {
    HStack(spacing: 0) {
      Text(strings.stampStripHead)
        .kText(.mono(10, .medium, tracking: 0.14))
        .foregroundStyle(theme.sub)
        .lineLimit(1)
        .accessibilityAddTraits(.isHeader)
      if custom != nil {
        HStack(spacing: 2) {
          tabKey(.official, label: strings.trayTabOfficial) { on in
            KTrayStampGlyph(ink: theme.ink).opacity(on ? 1 : 0.55)
          }
          tabKey(.custom, label: strings.trayTabCustom) { on in
            KTrayCustomGlyph(ink: theme.ink, plus: theme.ind, cut: on ? theme.soft2 : theme.soft)
              .opacity(on ? 1 : 0.55)
          }
        }
        .padding(.leading, 10)
      }
      Spacer(minLength: 8)
      SwiftUI.Button(action: onDone) {
        // DONE is a button: System, the string as written (the paper strip's)
        Text(strings.stampStripDone)
          .kText(.system(13, .medium))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .frame(minWidth: 44, minHeight: 44, alignment: .trailing)
          .contentShape(Rectangle())
      }
      .buttonStyle(KAsIsButtonStyle())
    }
    .minimumScaleFactor(0.8)
    // the 44 targets without pushing the row down
    .frame(height: 20)
    .accessibilityElement(children: .contain)
  }

  private func tabKey<G: View>(_ which: KComposeTrayTab, label: String, @ViewBuilder glyph: (Bool) -> G) -> some View {
    let on = shown == which
    return SwiftUI.Button {
      if !on { onTab(which) }
    } label: {
      glyph(on)
        .frame(width: 18, height: 18)
        .frame(width: 34, height: 26)
        .background {
          RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(on ? theme.soft2 : Color.clear)
        }
        .frame(height: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(label)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
  }

  // ── the row: the official stamps ──

  private var officialRow: some View {
    let groups = self.groups
    let marked = groups.contains { !$0.mark.isEmpty }
    return HStack(alignment: .bottom, spacing: 12) {
      ForEach(groups) { group in
        VStack(alignment: .leading, spacing: 4) {
          // the season's small marker over its stamps; the same room over the rest, so the row stays level
          if marked {
            if group.mark.isEmpty {
              markTag(" ").hidden()
            } else {
              markTag(group.mark)
            }
          }
          HStack(alignment: .top, spacing: 12) {
            ForEach(group.items) { item in
              cell(id: item.id, name: "#" + item.name, accessibilityLabel: item.accessibilityLabel, fallbackHex: nil)
            }
          }
        }
      }
    }
  }

  /// the pumpkin tag (the stamp tray's seasonal marker): ink words on the pumpkin's tint, its hex
  /// as the edge, the same in every theme
  private func markTag(_ mark: String) -> some View {
    Text(mark)
      .kText(.mono(8, .semibold, tracking: 0.12))
      .foregroundStyle(KStampTray.seasonInk)
      .padding(.horizontal, 5)
      .padding(.vertical, 2)
      .background(Capsule().fill(KStampTray.seasonWash))
      .overlay(Capsule().strokeBorder(KStampTray.seasonEdge, lineWidth: 1))
      .lineLimit(1)
      .fixedSize()
  }

  /// One stamp: itself at 48, its #topic under it; the chosen one lifted 4 in its double ring.
  private func cell(id: String, name: String, accessibilityLabel: String, fallbackHex: String?) -> some View {
    let selected = id == selectedId
    return SwiftUI.Button {
      onPick(id)
    } label: {
      VStack(spacing: 6) {
        KStamp(id: id, width: Self.tile, dark: theme.isDark, fallbackHex: fallbackHex)
          .overlay {
            if selected {
              // the double ring: 2 of sf, then 2 of ind outside it
              RoundedRectangle(cornerRadius: 5, style: .circular)
                .strokeBorder(theme.sf, lineWidth: 2)
                .padding(-2)
              RoundedRectangle(cornerRadius: 7, style: .circular)
                .strokeBorder(theme.ind, lineWidth: 2)
                .padding(-4)
            }
          }
          .offset(y: selected ? -4 : 0)
        Text(name)
          .kText(.mono(8, .medium, tracking: 0.08))
          .foregroundStyle(selected ? theme.ind : theme.sub)
          .lineLimit(1)
          .fixedSize()
      }
      .frame(minWidth: Self.tile)
      .contentShape(Rectangle())
    }
    .buttonStyle(KAsIsButtonStyle())
    .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: selected)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(accessibilityLabel)
    .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
  }

  // ── the row: my own photo stamps ──

  private func customRow(_ custom: KComposeCustomTray) -> some View {
    HStack(alignment: .top, spacing: 12) {
      makeCell(custom)
      ForEach(custom.items) { item in
        cell(id: item.id, name: item.topic, accessibilityLabel: item.accessibilityLabel, fallbackHex: item.hex.isEmpty ? nil : item.hex)
      }
      if custom.items.isEmpty {
        Text(strings.trayCustomEmpty)
          .kText(.system(13, lineHeight: 18.0 / 13))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
          .frame(width: 200, alignment: .leading)
          .padding(.top, 8)
      }
    }
  }

  /// the dashed + (the empty slot's dashed cut with a + inside): the Stamp Press, or the 3/3 card
  private func makeCell(_ custom: KComposeCustomTray) -> some View {
    SwiftUI.Button {
      if custom.full { fullCard = true } else { onMake() }
    } label: {
      VStack(spacing: 6) {
        KStampSlot(width: Self.tile, stroke: KStampSlot.stroke(for: theme))
          .overlay {
            KTravelPlusMark(color: theme.ind)
              .frame(width: 18, height: 18)
              // the + sits on the cut's centre (the paper is 25…113 of the 120 box)
              .offset(y: (69 - 60) / 120 * KStampFrame.height(Self.tile))
          }
        // the name line's room, so the + lines up with its neighbours
        Text(" ").kText(.mono(8, .medium, tracking: 0.08)).hidden()
      }
      .frame(minWidth: Self.tile)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(strings.trayMake)
    .accessibilityAddTraits(.isButton)
  }

  // ── the 3/3 card ──

  private var fullCardView: some View {
    ZStack {
      // a tap beside the card puts it away
      theme.soft.opacity(0.72)
        .contentShape(Rectangle())
        .onTapGesture { fullCard = false }
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 4) {
        Text(strings.trayFullTitle)
          .kText(.mono(11, .semibold, tracking: 0.12))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)
        SwiftUI.Button {
          fullCard = false
          onFullCta()
        } label: {
          Text(strings.trayFullCta)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.ind)
            .fixedSize(horizontal: false, vertical: true)
            .frame(minHeight: 40, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
        SwiftUI.Button {
          fullCard = false
        } label: {
          Text(strings.trayNotNow)
            .kText(.system(14))
            .foregroundStyle(theme.mute)
            .frame(minHeight: 40, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
      }
      .padding(.horizontal, 18)
      .padding(.top, 12)
      .padding(.bottom, 2)
      .frame(maxWidth: 300, alignment: .leading)
      .background(theme.sf)
      .overlay(Rectangle().strokeBorder(theme.ln, lineWidth: 1.5))
      .padding(.horizontal, 24)
      .accessibilityElement(children: .contain)
      .accessibilityAddTraits(.isModal)
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}

/// The + on the dashed slot (M12 7v10M7 12h10 at 1.8).
private struct KTravelPlusMark: View {
  let color: Color

  var body: some View {
    GeometryReader { geo in
      let s = min(geo.size.width, geo.size.height) / 24
      Path { p in
        p.move(to: CGPoint(x: 12 * s, y: 7 * s))
        p.addLine(to: CGPoint(x: 12 * s, y: 17 * s))
        p.move(to: CGPoint(x: 7 * s, y: 12 * s))
        p.addLine(to: CGPoint(x: 17 * s, y: 12 * s))
      }
      .stroke(color, style: StrokeStyle(lineWidth: 1.8 * s, lineCap: .round))
    }
    .accessibilityHidden(true)
  }
}
