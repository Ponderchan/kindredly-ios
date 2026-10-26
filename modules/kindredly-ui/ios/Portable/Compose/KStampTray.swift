// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMP TRAY (ComposeTray.tsx StampTray, drawn the 10a way): where the keyboard was, 296
 above the home indicator, on soft with a 1pt line along its top. It scrolls: FOR THIS LETTER
 (stamps read off the letter itself), RECENTLY USED, then the six categories of six — and, in a
 season (Halloween 2026), its stamps first of all, their head with a small pumpkin marker — each under
 its head in mono 600 10 at .14em in mute, six to a row. A tile is the stamp itself at the
 ladder's trayTile, 30×36 (the owner, 2026-10-18: the App Store tray's size, after 40×48 read too
 big for a picker of 36; KStamp, your own stamp so flat, and nothing
 framed round it, since a stamp is never put inside another tile's border; stamps v3 look the same
 in every theme), and the one on the envelope keeps the
 selection it always had, the 2pt ind ring with corners of 7, 2 out from the stamp's edge; its
 name under it in mono in its tray name colour (stamps v3 §9: nameLight on the light themes,
 nameDark on Midnight, each ≥4.7:1 on this tray's soft; TS's inkHex only for an id this build
 doesn't know), on ONE line wherever it fits (the
 owner's call: most names one line): at 9, else at 8, and only a name that fits neither wraps to
 centred lines at 9, up to three, stepping down to 8 rather than cut a word (in English 31 of 36
 stay on one line; never told anyone, situationship, hat meinen tag gerettet wrap; a row of the
 grid grows to its tallest name). Never truncated.
 The names are drawn exactly as TS sends them: lower
 case since the owner's call of 2026-10-18 (useComposeState traySections), so nothing here
 upper-cases them or sets a textCase; the section heads stay in capitals, also as sent. The tiles
 stop growing at accessibility1, as the + tray's cells do.
 A tap picks it (TS closes the tray and notes it as recently used).

 THE TAB ROW (owner 2026-10-19, the WeChat sticker panel; contract §7 C): only while custom
 stamps exist for this reader (TS sends `custom` non-nil: the 0038 quota answered and this binary
 has the Stamp Press, D10); otherwise the tray is exactly as above. 44 tall, glyph tabs from the
 left, the chosen one on a soft2 rounded square, a 1pt line under the row. Tab 1 = StampGlyph (a
 face in the perforated square), tab 2 = CustomGlyph (a photo in the square, a pen-blue + in its
 corner): ComposeTray.tsx's Perf Line set. The stamp cam tab is gone (the press is the + cell).
 The official tab is the sections above. The custom tab: CUSTOM STAMPS, then a dashed + (the
 empty slot's dashed cut, 30 wide, a + in ind) that opens the Stamp Press, then my approved stamps
 newest first (KStamp "c:" at 30, flat), each with its #topic under it in mono 9, one line, cut
 with an ellipsis. Empty: the + alone and the line "Photograph a moment. It becomes a stamp."
 Free at 3/3 (`full`): the + opens the small card instead (3 OF 3 FREE STAMPS MADE · Make more
 with First Class → · Not now). A stranger's kept stamp never shows here.

 The sections come from TS (compose-model stampSections), already in the reader's language,
 with ids no stamp has already dropped.
 */
struct KStampTray: View {
  static let columns = 6
  /// the tile's stamp width (the ladder's trayTile: 30 × 36)
  static let tile: CGFloat = KStampLadder.trayTile.w
  /// the tab row's height
  static let tabRowHeight: CGFloat = 44

  let theme: KTheme
  let sections: [KComposeStampSection]
  let selectedId: String
  let bottomInset: CGFloat
  let onPick: (String) -> Void
  /// the custom tab; nil = no tab row (D10), the official stamps alone
  var custom: KComposeCustomTray? = nil
  var tab: KComposeTrayTab = .official
  var strings = KComposeStrings()
  var onTab: (KComposeTrayTab) -> Void = { _ in }
  var onMake: () -> Void = {}
  var onFullCta: () -> Void = {}

  /// the 3/3 card is up (the + was tapped while Free has made its three)
  @State private var fullCard = false

  private var grid: [GridItem] {
    Array(repeating: GridItem(.flexible(), spacing: 0, alignment: .top), count: Self.columns)
  }

  /// the tab drawn: custom only while it exists
  private var shown: KComposeTrayTab { custom == nil ? .official : tab }

  var body: some View {
    VStack(spacing: 0) {
      if custom != nil {
        tabRow
      }
      ScrollView {
        Group {
          if shown == .custom, let custom {
            customTab(custom)
          } else {
            officialTab
          }
        }
        .padding(.horizontal, 10)
        .padding(.top, 4)
        .padding(.bottom, 18 + bottomInset)
      }
      .scrollIndicators(.hidden)
      // a tab switch starts at the top
      .id(shown)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(theme.soft)
    .overlay(alignment: .top) {
      Rectangle().fill(theme.line).frame(height: 1)
    }
    .overlay {
      if fullCard, let custom, custom.full {
        fullCardView
          .transition(.opacity.combined(with: .scale(scale: 0.96)))
      }
    }
    .animation(.easeOut(duration: 0.18), value: fullCard)
    .onChange(of: shown) { _, _ in fullCard = false }
  }

  // ── the tab row ──

  private var tabRow: some View {
    HStack(spacing: 6) {
      tabKey(.official, label: strings.trayTabOfficial) { on in
        KTrayStampGlyph(ink: theme.ink)
          .opacity(on ? 1 : 0.55)
      }
      tabKey(.custom, label: strings.trayTabCustom) { on in
        KTrayCustomGlyph(ink: theme.ink, plus: theme.ind, cut: theme.soft)
          .opacity(on ? 1 : 0.55)
      }
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 12)
    .frame(height: Self.tabRowHeight)
    .overlay(alignment: .bottom) {
      Rectangle().fill(theme.line).frame(height: 1)
    }
    .accessibilityElement(children: .contain)
  }

  private func tabKey<G: View>(_ which: KComposeTrayTab, label: String, @ViewBuilder glyph: (Bool) -> G) -> some View {
    let on = shown == which
    return SwiftUI.Button {
      if !on { onTab(which) }
    } label: {
      glyph(on)
        .frame(width: 22, height: 22)
        .frame(width: 44, height: 36)
        .background {
          RoundedRectangle(cornerRadius: 9, style: .continuous)
            .fill(on ? theme.soft2 : Color.clear)
        }
        .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(label)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
  }

  // ── the official tab (today's tray) ──

  private var officialTab: some View {
    VStack(alignment: .leading, spacing: 6) {
      ForEach(sections) { section in
        VStack(alignment: .leading, spacing: 4) {
          head(section.title, mark: section.mark)
          LazyVGrid(columns: grid, spacing: 0) {
            ForEach(section.items) { item in
              tile(item)
            }
          }
        }
      }
    }
  }

  private func head(_ title: String, mark: String = "") -> some View {
    HStack(alignment: .center, spacing: 6) {
      Text(title)
        .kText(.monoSection)
        .foregroundStyle(theme.mute)
      if !mark.isEmpty {
        // a seasonal set (Halloween 2026): a small pumpkin tag beside its head, ink words on the
        // pumpkin's tint (the boo/spooky-season stamps' own tint and ink, ≥ 12:1)
        Text(mark)
          .kText(.mono(8, .semibold, tracking: 0.12))
          .foregroundStyle(Self.seasonInk)
          .padding(.horizontal, 5)
          .padding(.vertical, 2)
          .background(Capsule().fill(Self.seasonWash))
          .overlay(Capsule().strokeBorder(Self.seasonEdge, lineWidth: 1))
          .lineLimit(1)
          .fixedSize()
      }
    }
    .padding(.horizontal, 6)
    .padding(.top, 10)
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(.isHeader)
  }

  /// the seasonal marker's colours, the same in every theme (like the stamps): the pumpkin's tint
  /// and hex as its edge, the stamps' ink as its words
  static let seasonWash = Color(hex: "#FEF2E4")
  static let seasonEdge = Color(hex: "#F39420")
  static let seasonInk = Color(hex: "#1E1B35")

  // ── the custom tab ──

  private func customTab(_ custom: KComposeCustomTray) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      head(strings.trayCustomHead)
      LazyVGrid(columns: grid, spacing: 0) {
        makeCell(custom)
        ForEach(custom.items) { item in
          customTile(item)
        }
      }
      if custom.items.isEmpty {
        Text(strings.trayCustomEmpty)
          .kText(.system(14, lineHeight: 20.0 / 14))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.horizontal, 6)
          .padding(.top, 6)
      }
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  /// the dashed + (the empty slot's dashed cut with a + inside): the Stamp Press, or the 3/3 card
  private func makeCell(_ custom: KComposeCustomTray) -> some View {
    SwiftUI.Button {
      if custom.full { fullCard = true } else { onMake() }
    } label: {
      VStack(spacing: 2) {
        KStampSlot(width: Self.tile, stroke: KStampSlot.stroke(for: theme))
          .overlay {
            KTrayPiece(d: "M12 7v10M7 12h10")
              .stroke(theme.ind, style: StrokeStyle(lineWidth: 1.8, lineCap: .round))
              .frame(width: 16, height: 16)
              // the + sits on the cut's centre (the paper is 25…113 of the 120 box)
              .offset(y: (69 - 60) / 120 * KStampFrame.height(Self.tile))
          }
          .padding(4)
        // the name line's room, so the + lines up with its neighbours
        Text(" ").kText(.mono(9, .medium, tracking: 0)).hidden()
      }
      .padding(.top, 6)
      .padding(.bottom, 4)
      .frame(maxWidth: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(strings.trayMake)
    .accessibilityAddTraits(.isButton)
  }

  private func customTile(_ item: KComposeCustomItem) -> some View {
    let on = item.id == selectedId
    return SwiftUI.Button {
      onPick(item.id)
    } label: {
      VStack(spacing: 2) {
        KStamp(id: item.id, width: Self.tile, dark: theme.isDark, fallbackHex: item.hex.isEmpty ? nil : item.hex)
          .padding(4)
          .overlay {
            RoundedRectangle(cornerRadius: 7, style: .circular)
              .strokeBorder(on ? theme.ind : Color.clear, lineWidth: 2)
          }
        Text(item.topic)
          .kText(.mono(9, .medium, tracking: 0))
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .truncationMode(.tail)
          .padding(.horizontal, 3)
      }
      .padding(.top, 6)
      .padding(.bottom, 4)
      .frame(maxWidth: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(item.accessibilityLabel)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  // ── the 3/3 card ──

  private var fullCardView: some View {
    ZStack {
      // a tap beside the card puts it away
      theme.soft.opacity(0.72)
        .contentShape(Rectangle())
        .onTapGesture { fullCard = false }
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 12) {
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
            .frame(minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
        SwiftUI.Button {
          fullCard = false
        } label: {
          Text(strings.trayNotNow)
            .kText(.system(14))
            .foregroundStyle(theme.mute)
            .frame(minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
      }
      .padding(.horizontal, 18)
      .padding(.top, 16)
      .padding(.bottom, 6)
      .frame(maxWidth: 300, alignment: .leading)
      .background(theme.sf)
      .overlay(Rectangle().strokeBorder(theme.ink, lineWidth: 2))
      // the kit's hard shadow (ln on Midnight)
      .background(Rectangle().fill(theme.isDark ? theme.ln : theme.ink).offset(x: 3, y: 3))
      .padding(.horizontal, 24)
      .accessibilityElement(children: .contain)
      .accessibilityAddTraits(.isModal)
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  private func tile(_ item: KComposeStampItem) -> some View {
    let on = item.id == selectedId
    return SwiftUI.Button {
      onPick(item.id)
    } label: {
      VStack(spacing: 2) {
        KStamp(id: item.id, width: Self.tile, dark: theme.isDark)
          // the ring: 2 of room and its own 2pt, as ComposeTray's padding 2 + borderWidth 2
          .padding(4)
          .overlay {
            RoundedRectangle(cornerRadius: 7, style: .circular)
              .strokeBorder(on ? theme.ind : Color.clear, lineWidth: 2)
          }
        // one line at 9, else one line at 8, else wrapped (see the header): the first that fits.
        // The wrapped one takes up to three lines and steps down to 8 before it would cut a word:
        // on a 375 phone a column leaves a name 53pt and "never told" alone needs 54 at 9, so the
        // old two lines at 9 cut "never told anyone" (and German's three-word names) with an ellipsis
        // A wrapped option is only taken while its longest word fits the column whole (at large
        // type "ordinary" alone outgrows it and SwiftUI would break it ordina/ry); past that each
        // word gets its own line and shrinks to fit.
        ViewThatFits(in: .horizontal) {
          name(item, size: 9).lineLimit(1).fixedSize()
          name(item, size: 8).lineLimit(1).fixedSize()
          wrapped(item, size: 9)
          wrapped(item, size: 8)
          VStack(spacing: 0) {
            ForEach(Array(Self.words(item.name).enumerated()), id: \.offset) { _, word in
              nameText(word, item: item, size: 9).lineLimit(1).minimumScaleFactor(0.4)
            }
          }
        }
        // 3 either side, so two neighbours' names never read as one (can't sleep made my day)
        .padding(.horizontal, 3)
      }
      .padding(.top, 6)
      .padding(.bottom, 4)
      .frame(maxWidth: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(item.accessibilityLabel)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }

  /// Up to three centred lines; its ideal width is its longest word's, so ViewThatFits takes it
  /// only while every word fits the column on its own (the words themselves never break).
  private func wrapped(_ item: KComposeStampItem, size: CGFloat) -> some View {
    let longest = Self.words(item.name).max { $0.count < $1.count } ?? item.name
    return VStack(spacing: 0) {
      name(item, size: size)
        .lineLimit(3)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(idealWidth: 0, maxWidth: .infinity)
      nameText(longest, item: item, size: size).lineLimit(1).fixedSize().hidden().frame(height: 0)
    }
  }

  private static func words(_ s: String) -> [String] {
    s.split(separator: " ").map(String.init)
  }

  private func name(_ item: KComposeStampItem, size: CGFloat) -> some View {
    nameText(item.name, item: item, size: size)
  }

  private func nameText(_ text: String, item: KComposeStampItem, size: CGFloat) -> some View {
    Text(text)
      .kText(.mono(size, .medium, tracking: 0))
      // stamps v3 §9: nameLight on the light themes, nameDark on Midnight (measured on soft, this
      // tray's ground); TS's colour for an id this build doesn't know
      .foregroundStyle(KStampArt.trayName(id: item.id, dark: theme.isDark) ?? item.ink)
  }
}

/*
 THE TAB GLYPHS (ComposeTray.tsx's Perf Line set, design sheet 2026-09-20): one perforated square
 (17 across at 3.5, corners of 1, a 1.6 edge in dashes of 1.4 and gaps of 1.6) on the 24 grid,
 only what sits inside it changing. STAMP: a face (a MOOD stamp). CUSTOM: a photo (a frame, the
 amber sun, a hill) with a pen-blue + in its top-right corner on a disc of the tray's ground.
 */
private struct KTrayPiece: Shape {
  let d: String

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    return KSVGPath.path(d).applying(place)
  }
}

private struct KTrayPerf: View {
  let ink: Color

  var body: some View {
    GeometryReader { geo in
      let u = min(geo.size.width, geo.size.height) / 24
      RoundedRectangle(cornerRadius: 1 * u, style: .circular)
        .stroke(ink, style: StrokeStyle(lineWidth: 1.6 * u, dash: [1.4 * u, 1.6 * u]))
        .frame(width: 17 * u, height: 17 * u)
        .frame(width: geo.size.width, height: geo.size.height)
    }
  }
}

/// tab 1: a face in the perforated square
struct KTrayStampGlyph: View {
  let ink: Color

  var body: some View {
    GeometryReader { geo in
      let u = min(geo.size.width, geo.size.height) / 24
      ZStack {
        KTrayPerf(ink: ink)
        KTrayPiece(d: "M8.3 10.4a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0").fill(ink)
        KTrayPiece(d: "M13.5 10.4a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0").fill(ink)
        KTrayPiece(d: "M8.9 14.1c1.1 1.6 5.1 1.6 6.2 0")
          .stroke(ink, style: StrokeStyle(lineWidth: 1.6 * u, lineCap: .round))
      }
    }
    .accessibilityHidden(true)
  }
}

/// tab 2: a photo in the perforated square, a pen-blue + in its corner
struct KTrayCustomGlyph: View {
  let ink: Color
  /// the + (pen blue: the theme's ind)
  let plus: Color
  /// the disc under the + (the tray's ground), so it reads cut out of the square
  let cut: Color

  var body: some View {
    GeometryReader { geo in
      let u = min(geo.size.width, geo.size.height) / 24
      ZStack {
        KTrayPerf(ink: ink)
        KTrayPiece(d: "M6.5 6.5h11v11h-11z")
          .stroke(ink, lineWidth: 1.3 * u)
        KTrayPiece(d: "M8.6 10a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0")
          .fill(Color(hex: "#F2A33A"))
        KTrayPiece(d: "M6.5 17.5l3.4-3.8 2.2 2.2 1.8-1.8 3.6 3.4z")
          .fill(ink)
        KTrayPiece(d: "M15 5.5a4 4 0 1 0 8 0a4 4 0 1 0 -8 0")
          .fill(cut)
        KTrayPiece(d: "M19 3v5M16.5 5.5h5")
          .stroke(plus, style: StrokeStyle(lineWidth: 1.8 * u, lineCap: .round))
      }
    }
    .accessibilityHidden(true)
  }
}

extension KStampSlot {
  /// The empty slot's stroke on a theme's page (Kit/KStampArt.swift KStampSlot): its mute, except
  /// on Lavender (mute 2.94:1 on #ECEAF8), which takes the pale slot colour (3.65:1), so the slot
  /// keeps 3:1 everywhere. The twin of TS lib/stamp-frame stampSlotStroke.
  public static func stroke(for theme: KTheme) -> Color {
    theme.key == "lavender" ? KStampFrame.color(KStampArtData.v3SlotPale) : theme.mute
  }
}
