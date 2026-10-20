// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE HEADER'S TWO BUTTONS AND THEIR PEEKS (4a, Prompts 1 and 2). The file keeps its old name
 (it held the profile card, which 4a's header replaced) because a new Swift file needs a pod
 install; the header itself is KMeHeader.swift.

 THE BUTTONS (KMeStatButton): 46 tall (scaled with the text), corners 14, padding 0 14, 8
 apart inside: the glyph 18 across (the letters' indigo outline envelope at stroke 2.2; the
 kindreds' filled green rounded square with two white eyes and a mouth), the figure (system 600
 15), the unit (15, sub), and at the far end a 14 chevron (stroke 2.4, mute) that turns over
 while its tray is open. Closed: soft. Open: lav for letters, pale green for kindreds (on a dark
 theme the green at .28, so the ink still reads). VoiceOver reads the count ("12 letters"), the
 expanded / collapsed state, a hint, and a custom action straight to the whole list (set by the
 header).

 THE TRAYS (KMePeekTray): soft, corners 16, padding 12, 10 between the cards and the link.
 - letters: three mini cards 8 apart, each sf, corners 12, padding 10, 6 apart inside: the date
   (mono 9 at .1em, mute) and the 22 stamp; two lines of the letter (the reader's Letter font 13/1.3); the status
   (mono 9 at .12em: QUIET in mute, ANSWERED · 2 in green, "Luna wrote back" in ink). "See all
   10 →" (13/600, ind) at the bottom right.
 - kindreds: three cards 10 apart, padding 10 6, centred: the 40 face, the name (12/600), their
   last line in the reader's Letter font 11 (italic where it has one), mute, quoted, on one
   line. "Open kindreds →" in green.
 Fewer than three cards keep a third of the width each and line up on the left. Before the
 first read: three blank cards (hidden from VoiceOver). None: one line and its link.
 */

// MARK: - The two buttons

struct KMeStatButton: View {
  let theme: KTheme
  let stat: KMeStat
  let kind: KMePeek
  let open: Bool
  let height: CGFloat
  let onTap: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  private var openFill: Color {
    switch kind {
    case .letters: return theme.lav
    case .kindreds: return theme.isDark ? KBrand.greenText.opacity(0.28) : KBrand.paleGreen
    }
  }

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 14, style: .circular)
    SwiftUI.Button(action: onTap) {
      HStack(alignment: .center, spacing: 8) {
        Group {
          switch kind {
          case .letters: KMeLettersGlyph(color: theme.ind)
          case .kindreds: KMeKindredsGlyph()
          }
        }
        .frame(width: 18, height: 18)
        // (owner, 2026-10-20) the glyph on its own small white tile
        .frame(width: 30, height: 30)
        .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(theme.isDark ? theme.bg.opacity(0.5) : KBrand.paperWhite))
        .padding(.trailing, 2)
        Text(stat.count)
          .kText(.system(15, .semibold))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .fixedSize()
        Text(stat.unit)
          .kText(.system(15))
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        Spacer(minLength: 0)
        KLineIcon(.chevronDown, size: 14, lineWidth: 2.4, color: theme.mute)
          .rotationEffect(.degrees(open ? 180 : 0))
          .animation(reduceMotion ? nil : .easeOut(duration: 0.25), value: open)
      }
      .padding(.leading, 8)
      .padding(.trailing, 14)
      .frame(maxWidth: .infinity, minHeight: height, maxHeight: height)
      // (owner, 2026-10-20) each button wears its own colour all the time, letters lav and kindreds
      // pale green; open, it gains an edge in the same family
      .background(shape.fill(openFill))
      .overlay(shape.strokeBorder(open ? (kind == .letters ? theme.ind.opacity(0.45) : KBrand.greenText.opacity(0.45)) : .clear, lineWidth: 1.5))
      .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: open)
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(stat.a11yLabel)
    .accessibilityAddTraits(.isButton)
  }
}

/// 4a's letters glyph on the 24 grid: an outline envelope (rect 2.5,5,19,14 r2.5 and its flap).
struct KMeLettersGlyph: View {
  let color: Color

  var body: some View {
    Canvas { ctx, size in
      ctx.scaleBy(x: size.width / 24, y: size.height / 24)
      var p = Path(roundedRect: CGRect(x: 2.5, y: 5, width: 19, height: 14), cornerRadius: 2.5)
      p.move(to: CGPoint(x: 3, y: 7))
      p.addLine(to: CGPoint(x: 12, y: 14))
      p.addLine(to: CGPoint(x: 21, y: 7))
      ctx.stroke(p, with: .color(color), style: StrokeStyle(lineWidth: 2.2, lineCap: .round, lineJoin: .round))
    }
    .accessibilityHidden(true)
  }
}

/// 4a's kindreds glyph on the 24 grid: a green rounded square, two white eyes and a mouth bar.
struct KMeKindredsGlyph: View {
  var body: some View {
    Canvas { ctx, size in
      ctx.scaleBy(x: size.width / 24, y: size.height / 24)
      ctx.fill(Path(roundedRect: CGRect(x: 2.5, y: 2.5, width: 19, height: 19), cornerRadius: 5), with: .color(KBrand.greenText))
      ctx.fill(Path(ellipseIn: CGRect(x: 9 - 1.6, y: 10 - 1.6, width: 3.2, height: 3.2)), with: .color(.white))
      ctx.fill(Path(ellipseIn: CGRect(x: 15 - 1.6, y: 10 - 1.6, width: 3.2, height: 3.2)), with: .color(.white))
      ctx.fill(Path(roundedRect: CGRect(x: 8.5, y: 14, width: 7, height: 2.2), cornerRadius: 1.1), with: .color(.white))
    }
    .accessibilityHidden(true)
  }
}

// MARK: - The trays

/// The soft tray both peeks sit in, with the link at its bottom right.
struct KMePeekTray<Cards: View>: View {
  let theme: KTheme
  let link: String
  let linkColor: Color
  let linkHint: String
  let onLink: () -> Void
  let cards: Cards

  init(theme: KTheme, link: String, linkColor: Color, linkHint: String = "", onLink: @escaping () -> Void, @ViewBuilder cards: () -> Cards) {
    self.theme = theme
    self.link = link
    self.linkColor = linkColor
    self.linkHint = linkHint
    self.onLink = onLink
    self.cards = cards()
  }

  var body: some View {
    VStack(alignment: .trailing, spacing: 10) {
      cards
      if !link.isEmpty {
        SwiftUI.Button(action: onLink) {
          Text(link)
            .kText(.system(13, .semibold))
            .foregroundStyle(linkColor)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.vertical, -6)
        .accessibilityLabel(link.replacingOccurrences(of: "→", with: "").trimmingCharacters(in: .whitespaces))
      }
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .trailing)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))
  }
}

/// Three cards in a row, each a third of the width; the missing ones are left empty.
struct KMeThirds<Item: Identifiable, Card: View>: View {
  let items: [Item]
  let spacing: CGFloat
  let card: (Item) -> Card

  var body: some View {
    HStack(alignment: .top, spacing: spacing) {
      ForEach(items.prefix(3)) { item in
        card(item)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
      }
      ForEach(0..<max(0, 3 - min(3, items.count)), id: \.self) { _ in
        Color.clear
          .frame(maxWidth: .infinity, maxHeight: 1)
          .accessibilityHidden(true)
      }
    }
    // the cards in a row take the tallest one's height
    .fixedSize(horizontal: false, vertical: true)
  }
}

/// Three blank cards, before the first read.
struct KMePeekSkeleton: View {
  let theme: KTheme
  let height: CGFloat

  var body: some View {
    HStack(spacing: 8) {
      ForEach(0..<3, id: \.self) { _ in
        RoundedRectangle(cornerRadius: 12, style: .circular)
          .fill(theme.sf)
          .overlay(alignment: .topLeading) {
            VStack(alignment: .leading, spacing: 6) {
              RoundedRectangle(cornerRadius: 3).fill(theme.soft2).frame(width: 46, height: 8)
              RoundedRectangle(cornerRadius: 3).fill(theme.soft2).frame(height: 10)
              RoundedRectangle(cornerRadius: 3).fill(theme.soft2).frame(width: 40, height: 10)
            }
            .padding(10)
          }
          .frame(maxWidth: .infinity)
          .frame(height: height)
      }
    }
    .accessibilityHidden(true)
  }
}

/// The empty tray's line.
struct KMePeekEmpty: View {
  let theme: KTheme
  let text: String

  var body: some View {
    Text(text)
      .kText(.system(13, lineHeight: 1.4))
      .foregroundStyle(theme.sub)
      .frame(maxWidth: .infinity, alignment: .leading)
      .fixedSize(horizontal: false, vertical: true)
  }
}

struct KMeLettersPeek: View {
  let theme: KTheme
  let peek: KMePeekLetters
  let actions: KMeActions
  @Environment(\.kLetterFace) private var letterFace

  static var dateStyle: KTextStyle { .mono(9, .medium, tracking: 0.1) }
  /// my letter's first lines, in the reader's Letter font: a step down in a roomy face so the
  /// two lines still fit the card
  static func bodyStyle(_ face: KLetterFace) -> KTextStyle { .content(face.fitSize(13), lineHeight: 1.3) }
  static var statusStyle: KTextStyle { .mono(9, .semibold, tracking: 0.12) }

  var body: some View {
    switch peek.state {
    case .loading:
      KMePeekTray(theme: theme, link: "", linkColor: theme.ind, onLink: {}) {
        KMePeekSkeleton(theme: theme, height: 96)
      }
    case .empty:
      KMePeekTray(theme: theme, link: peek.emptyCta, linkColor: theme.ind, onLink: { actions.onWrite() }) {
        KMePeekEmpty(theme: theme, text: peek.emptyText)
      }
    case .ready:
      KMePeekTray(theme: theme, link: peek.seeAll, linkColor: theme.ind, onLink: { actions.onSeeAll() }) {
        KMeThirds(items: peek.items, spacing: 8) { item in
          card(item)
        }
      }
    }
  }

  private func statusColor(_ tone: KMePeekLetter.Tone) -> Color {
    switch tone {
    case .quiet: return theme.mute
    case .answered: return theme.isDark ? Color(hex: "#7CC58F") : KBrand.greenText
    case .replied: return theme.ink
    }
  }

  private func card(_ l: KMePeekLetter) -> some View {
    let shape = RoundedRectangle(cornerRadius: 12, style: .circular)
    return SwiftUI.Button {
      actions.onPeekLetter(l.id)
    } label: {
      VStack(alignment: .leading, spacing: 6) {
        HStack(alignment: .center, spacing: 4) {
          Text(l.date)
            .kText(Self.dateStyle)
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .minimumScaleFactor(0.5)
          Spacer(minLength: 0)
          if !l.stampId.isEmpty {
            KStamp(id: l.stampId, width: 22, dark: theme.isDark, fallbackHex: l.stampHex.isEmpty ? nil : l.stampHex)
              .dynamicTypeSize(.large)
          }
        }
        Text(l.body)
          .kText(Self.bodyStyle(letterFace))
          .foregroundStyle(theme.ink)
          .lineLimit(2)
          .frame(maxWidth: .infinity, alignment: .leading)
        Spacer(minLength: 0)
        Text(l.status)
          .kText(Self.statusStyle)
          .foregroundStyle(statusColor(l.tone))
          .lineLimit(1)
          .truncationMode(.tail)
      }
      .padding(10)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .background(shape.fill(theme.sf))
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(l.a11y)
    .accessibilityAddTraits(.isButton)
  }
}

struct KMeKindredsPeek: View {
  let theme: KTheme
  let peek: KMePeekKindreds
  let actions: KMeActions
  @Environment(\.kLetterFace) private var letterFace

  /// the quoted line, in the reader's Letter font (upright in a face without an italic), a step
  /// down in a roomy face for its one line
  static func lineStyle(_ face: KLetterFace) -> KTextStyle { .content(face.fitSize(11), italic: true) }

  private var green: Color { theme.isDark ? Color(hex: "#7CC58F") : KBrand.greenText }

  var body: some View {
    switch peek.state {
    case .loading:
      KMePeekTray(theme: theme, link: "", linkColor: green, onLink: {}) {
        KMePeekSkeleton(theme: theme, height: 96)
      }
    case .empty:
      KMePeekTray(theme: theme, link: peek.open, linkColor: green, onLink: { actions.onOpenKindreds() }) {
        KMePeekEmpty(theme: theme, text: peek.emptyText)
      }
    case .ready:
      KMePeekTray(theme: theme, link: peek.open, linkColor: green, onLink: { actions.onOpenKindreds() }) {
        KMeThirds(items: peek.items, spacing: 10) { item in
          card(item)
        }
      }
    }
  }

  @ViewBuilder
  private func face(_ f: KPersonFace, stamp: KMemberStamp?) -> some View {
    if case let .bird(ref) = f {
      KPersonBirdFace(theme: theme, bird: ref, size: 40, dim: false, badge: false)
    } else {
      KFace(theme: theme, source: f.source(theme), size: 40, round: true, stamp: stamp)
    }
  }

  private func card(_ k: KMePeekKindred) -> some View {
    let shape = RoundedRectangle(cornerRadius: 12, style: .circular)
    return SwiftUI.Button {
      actions.onPeekKindred(k.id)
    } label: {
      VStack(alignment: .center, spacing: 6) {
        face(k.face, stamp: k.stamp)
          .accessibilityHidden(true)
        Text(k.name)
          .kText(.system(12, .semibold))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        if !k.line.isEmpty {
          Text("“\(k.line)”")
            .kText(Self.lineStyle(letterFace))
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .truncationMode(.tail)
        }
      }
      .padding(.vertical, 10)
      .padding(.horizontal, 6)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
      .background(shape.fill(theme.sf))
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(k.a11y)
    .accessibilityAddTraits(.isButton)
  }
}
