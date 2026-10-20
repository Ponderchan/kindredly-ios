// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ME'S HEADER (4a, Prompt 1): sticky over the page, on the page colour, no rule and no shadow. It
 sits OUTSIDE the scroll view (KMeScreen), and only it observes the scroll.

 EXPANDED (k = 0), 6 below the status bar, 20 in from the edges:
   row 1, 76 tall, 12 apart: the 72 avatar on soft2 (the React Native island, drawn 72 and
     scaled, never re-laid out) with a 24 white pencil badge at its bottom right (a 1.5 line
     outline, the pen at 15); the name, system 700 22/1.1 (the tab titles' .pageTitle), 8 over
     "joined Jul 27" (13, sub); the gear, 22 at stroke 1.9 in a 36 circle (O3: a gear, never sliders).
   (2026-10-20, owner) no row 2: "12 letters · 4 kindreds" is a line between the name and joined,
     each half opening its peek tray.
   the peek tray, 10 lower, when one is open (KMePeekTray).
   the segmented control (Courier, Aura, Stamps), 20 lower and 2 above the page (KMeSegmented).

 COLLAPSING, k = clamp(scroll / 40, 0, 1), every value linear in k as 4a's build() has it: row 1
 76→52, the avatar 72→36, the name 22→17, the gap under it 8→0, the joined line's height 22→0
 and its opacity 1−k, the pencil's opacity 1−k, row 2's room max(46(1−k), 18−10k) with the
 buttons at 1 − min(1, 1.6k) and its top margin 10→0, the chips' top padding 8→4. Collapsed, the
 header is the avatar, the name, the gear and the chips.

 THE PEEK: a button opens its tray (the button turns lav, or pale green for kindreds, and its
 chevron turns over); the other button switches trays; the same button closes it; and it closes
 by itself once the page has scrolled past 24. It grows in over .25s, or at once with Reduce
 Motion.

 Its expanded height and how much it collapses (`delta`) are reported (onMetrics) whenever they
 change — a peek opening or closing, the type size, the chips' height — never per frame, so the
 screen can apply the fit rule. Under Dynamic Type the header stops at xxxLarge and its 4a
 heights scale with the text (ScaledMetric), so the rows grow and the collapse still lands.
 */
struct KMeHeader<Avatar: View>: View {
  let theme: KTheme
  let content: KMeContent
  let chrome: KScrollModel
  @Binding var selection: Int
  let actions: KMeActions
  let onMetrics: (KMeHeaderMetrics) -> Void
  let avatar: Avatar

  init(theme: KTheme, content: KMeContent, chrome: KScrollModel, selection: Binding<Int>, actions: KMeActions, onMetrics: @escaping (KMeHeaderMetrics) -> Void, @ViewBuilder avatar: () -> Avatar) {
    self.theme = theme
    self.content = content
    self.chrome = chrome
    self._selection = selection
    self.actions = actions
    self.onMetrics = onMetrics
    self.avatar = avatar()
  }

  var body: some View {
    KMeHeaderBody(theme: theme, content: content, chrome: chrome, selection: $selection, actions: actions, onMetrics: onMetrics, avatar: avatar)
      // the header's words stop growing here (its rows scale with them up to this size)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }
}

/// Which tray is open.
enum KMePeek: String, Equatable {
  case letters, kindreds
}

struct KMeHeaderBody<Avatar: View>: View {
  let theme: KTheme
  let content: KMeContent
  @ObservedObject var chrome: KScrollModel
  @Binding var selection: Int
  let actions: KMeActions
  let onMetrics: (KMeHeaderMetrics) -> Void
  let avatar: Avatar

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var peek: KMePeek?
  @State private var peekHeight: CGFloat = 0
  @State private var chipsHeight: CGFloat = 40

  // 4a's heights, scaled with the text (capped at xxxLarge by KMeHeader)
  @ScaledMetric(relativeTo: .body) private var row1Open: CGFloat = 80
  @ScaledMetric(relativeTo: .body) private var row1Shut: CGFloat = 52
  @ScaledMetric(relativeTo: .body) private var row2: CGFloat = 46
  @ScaledMetric(relativeTo: .title2) private var nameBase: CGFloat = 22
  @ScaledMetric(relativeTo: .footnote) private var joinedLine: CGFloat = 18
  @ScaledMetric(relativeTo: .subheadline) private var statsLineHeight: CGFloat = 22

  static var topPad: CGFloat { 6 }
  static var side: CGFloat { 20 }
  static var row2Margin: CGFloat { 10 }
  /// row 2's padding-bottom at k = 0 and 1 (its room never goes under it: max(46(1−k), 18−10k))
  static var row2Floor: (open: CGFloat, shut: CGFloat) { (18, 8) }
  static var chipsTop: (open: CGFloat, shut: CGFloat) { (18, 8) }
  // the segmented control has no shadow to make room for; with the page's 12 this puts it 14 over the card,
  // nearer the card it switches than the stat buttons (20 above) — owner, 10-20
  static var chipsBottom: CGFloat { 2 }
  static var peekMargin: CGFloat { 10 }
  /// the scroll past which an open peek closes by itself
  static var peekCloseAt: CGFloat { 24 }

  /// The collapse, 0 (expanded) to 1, from the scroll offset.
  static func progress(_ offset: CGFloat) -> CGFloat {
    min(1, max(0, offset / 40))
  }

  static func lerp(_ a: CGFloat, _ b: CGFloat, _ k: CGFloat) -> CGFloat {
    a + (b - a) * k
  }

  private var metrics: KMeHeaderMetrics {
    let peekRoom = peek != nil && peekHeight > 0 ? Self.peekMargin + peekHeight : 0
    // (owner, 2026-10-20) no row 2: the counts are a line under the name, so the tabs are the one
    // control row under the profile
    let expanded = Self.topPad + row1Open + peekRoom + Self.chipsTop.open + chipsHeight + Self.chipsBottom
    let shut = Self.topPad + row1Shut + peekRoom + Self.chipsTop.shut + chipsHeight + Self.chipsBottom
    return KMeHeaderMetrics(expanded: expanded, delta: max(0, expanded - shut))
  }

  var body: some View {
    let k = Self.progress(chrome.offset)
    VStack(alignment: .leading, spacing: 0) {
      row1(k)
        .frame(height: Self.lerp(row1Open, row1Shut, k))
      if let peek {
        tray(peek)
          .padding(.top, Self.peekMargin)
          .onGeometryChange(for: CGFloat.self) { $0.size.height - Self.peekMargin } action: { h in
            if abs(h - peekHeight) > 0.5 { peekHeight = h }
          }
          .transition(reduceMotion ? .identity : .opacity.combined(with: .move(edge: .top)))
      }
      chips
        .padding(.top, Self.lerp(Self.chipsTop.open, Self.chipsTop.shut, k))
        .padding(.bottom, Self.chipsBottom)
    }
    .padding(.top, Self.topPad)
    .padding(.horizontal, Self.side)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(theme.bg)
    .clipped()
    .onChange(of: metrics, initial: true) { _, m in onMetrics(m) }
    .onChange(of: chrome.offset > Self.peekCloseAt) { _, past in
      if past, peek != nil { setPeek(nil) }
    }
  }

  // ── row 1: the avatar and pencil, the name and joined, the gear ──────
  private func row1(_ k: CGFloat) -> some View {
    let avatarSide = Self.lerp(72, 36, k)
    let nameSize = nameBase * Self.lerp(22, 17, k) / 22
    return HStack(alignment: .center, spacing: 12) {
      SwiftUI.Button {
        actions.onEdit()
      } label: {
        avatarFace(side: avatarSide, k: k)
          .overlay(alignment: stamp == nil ? .bottomTrailing : .bottomLeading) {
            // stamped, the pencil moves to the bottom left so the denomination stays seen (D-7)
            ZStack {
              Circle().fill(theme.sf)
              Circle().strokeBorder(theme.line, lineWidth: 1.5)
              KLineIcon(.pen, size: 15, lineWidth: 2.2, color: theme.ink)
            }
            .frame(width: 24, height: 24)
            .offset(x: stamp == nil ? 2 : -2, y: 2)
            .opacity(1 - k)
          }
          .contentShape(stamp == nil ? AnyShape(Circle()) : AnyShape(Rectangle()))
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(content.profile.editLabel)
      .accessibilityAddTraits(.isButton)

      VStack(alignment: .leading, spacing: Self.lerp(4, 0, k)) {
        Text(content.profile.name)
          .font(.system(size: nameSize, weight: .bold))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .accessibilityAddTraits(.isHeader)
        statsLine
          .frame(height: statsLineHeight * (1 - k), alignment: .top)
          .clipped()
          .opacity(1 - min(1, 1.6 * k))
          .allowsHitTesting(k < 0.3)
          .accessibilityHidden(k > 0.5)
        if !content.profile.joined.isEmpty {
          Text(content.profile.joined)
            .kText(.system(13))
            .foregroundStyle(theme.sub)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .frame(height: joinedLine * (1 - k), alignment: .top)
            .clipped()
            .opacity(1 - k)
            .accessibilityHidden(k > 0.5)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      SwiftUI.Button {
        actions.onSettings()
      } label: {
        KLineIcon(.gear, size: 22, lineWidth: 1.9, color: theme.ink)
          .frame(width: 36, height: 36)
          .padding(4)
          .contentShape(Circle())
      }
      .buttonStyle(KFadePressStyle())
      .padding(-4)
      .accessibilityLabel(content.settingsLabel)
    }
  }

  private var stamp: KMemberStamp? { KMemberStamp(content.profile.stamp) }

  /// The avatar island, drawn 72 and scaled: on a soft2 circle, or, for a member, inside their
  /// stamp (C2), the island then drawn square (MeNative passes AvatarImage a radius) and scaled to
  /// the stamp's inner side; the stamp's rule follows the collapse (72 full → 36 small). The
  /// frame bleeds 4 outside the box, inside the header's top and side padding, so .clipped()
  /// never cuts it.
  @ViewBuilder
  private func avatarFace(side: CGFloat, k: CGFloat) -> some View {
    if let stamp {
      KStampAvatar(theme: theme, size: side, stamp: stamp, compact: k) { inner in
        avatar
          .frame(width: 72, height: 72)
          .scaleEffect(inner / 72)
          .frame(width: inner, height: inner)
      }
    } else {
      ZStack {
        Circle().fill(theme.soft2)
        avatar
          .frame(width: 72, height: 72)
          .scaleEffect(side / 72)
          .frame(width: side, height: side)
      }
      .frame(width: side, height: side)
      .clipShape(Circle())
    }
  }

  // ── the counts, a line under the name (owner, 2026-10-20) ────────────
  // "12 letters · 4 kindreds": the figure in ink, semibold, the word in sub, 15. Each half opens its
  // peek tray as the stat buttons did; open, its figure and word take the tray's colour (letters
  // ind, kindreds green) and a small chevron turns over after it.
  private var statsLine: some View {
    HStack(spacing: 6) {
      ForEach(Array(content.profile.stats.enumerated()), id: \.element.id) { i, stat in
        if i > 0 {
          Text("·").kText(.system(15)).foregroundStyle(theme.faint).accessibilityHidden(true)
        }
        let key = KMePeek(rawValue: stat.key) ?? .letters
        let open = peek == key
        let tint: Color = key == .letters ? theme.ind : KBrand.greenText
        SwiftUI.Button {
          setPeek(open ? nil : key)
        } label: {
          HStack(spacing: 4) {
            Text(stat.count)
              .kText(.system(15, .semibold))
              .foregroundStyle(open ? tint : theme.ink)
            Text(stat.unit)
              .kText(.system(15))
              .foregroundStyle(open ? tint : theme.sub)
            KLineIcon(.chevronDown, size: 10, lineWidth: 2.4, color: open ? tint : theme.faint)
              .rotationEffect(.degrees(open ? 180 : 0))
              .animation(reduceMotion ? nil : .easeOut(duration: 0.25), value: open)
          }
          .lineLimit(1)
          .fixedSize()
          .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(stat.a11yLabel)
        .accessibilityAddTraits(.isButton)
        .accessibilityValue(open ? content.a11y.expanded : content.a11y.collapsed)
        .accessibilityHint(stat.hint)
        .accessibilityAction(named: Text(key == .letters ? content.a11y.seeAllAction : content.a11y.openKindredsAction)) {
          if key == .letters { actions.onSeeAll() } else { actions.onOpenKindreds() }
        }
      }
    }
    .minimumScaleFactor(0.75)
  }

  // ── row 2: the two buttons (unused since 2026-10-20; kept for 4a's record) ──
  private func row2View(_ k: CGFloat) -> some View {
    let room = max(row2 * (1 - k), Self.lerp(Self.row2Floor.open, Self.row2Floor.shut, k))
    let shown = 1 - min(1, 1.6 * k)
    return HStack(spacing: 8) {
      ForEach(content.profile.stats) { stat in
        let key = KMePeek(rawValue: stat.key) ?? .letters
        let open = peek == key
        KMeStatButton(theme: theme, stat: stat, kind: key, open: open, height: row2) {
          setPeek(open ? nil : key)
        }
        .accessibilityValue(open ? content.a11y.expanded : content.a11y.collapsed)
        .accessibilityHint(stat.hint)
        .accessibilityAction(named: Text(key == .letters ? content.a11y.seeAllAction : content.a11y.openKindredsAction)) {
          if key == .letters { actions.onSeeAll() } else { actions.onOpenKindreds() }
        }
      }
    }
    .frame(height: row2)
    .opacity(shown)
    .frame(height: room, alignment: .top)
    .clipped()
    .padding(.top, Self.lerp(Self.row2Margin, 0, k))
    .allowsHitTesting(shown > 0.3)
    .accessibilityHidden(shown < 0.3)
  }

  @ViewBuilder
  private func tray(_ which: KMePeek) -> some View {
    switch which {
    case .letters:
      KMeLettersPeek(theme: theme, peek: content.peekLetters, actions: actions)
    case .kindreds:
      KMeKindredsPeek(theme: theme, peek: content.peekKindreds, actions: actions)
    }
  }

  // ── row 3: the segmented control ──
  // (owner, 2026-10-20) iOS's segmented control in place of the four sticker chips: the page's
  // three parts only, Courier, Aura, Stamps; First Class left the row for a banner at the foot of
  // the Courier page (KMeScreen). It sits on the stat buttons' edges, full width.
  private var chips: some View {
    KMeSegmented(theme: theme, labels: Array(content.segments.prefix(3)), selection: $selection)
      .dynamicTypeSize(...DynamicTypeSize.accessibility2)
      .accessibilityElement(children: .contain)
      .accessibilityAddTraits(.isTabBar)
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { h in
        if abs(h - chipsHeight) > 0.5 { chipsHeight = h }
      }
  }

  private func setPeek(_ next: KMePeek?) {
    let before = peek
    if reduceMotion {
      var t = Transaction()
      t.disablesAnimations = true
      withTransaction(t) { peek = next }
    } else {
      withAnimation(.easeOut(duration: 0.25)) { peek = next }
    }
    if let before, before != next { actions.onPeek(before.rawValue, false) }
    if let next, next != before { actions.onPeek(next.rawValue, true) }
  }
}

/// Me's segmented control (owner, 2026-10-20): a soft track, corners 12, 38 tall at the default
/// size; the chosen part is a raised sf pill (corners 9, a faint shadow) that slides to the tap,
/// at once under Reduce Motion. System 15, semibold on the chosen part. Each part is a tab.
struct KMeSegmented: View {
  let theme: KTheme
  let labels: [String]
  @Binding var selection: Int

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Namespace private var pill

  var body: some View {
    HStack(spacing: 0) {
      ForEach(labels.indices, id: \.self) { i in
        let on = i == selection
        SwiftUI.Button {
          guard !on else { return }
          if reduceMotion {
            selection = i
          } else {
            withAnimation(.spring(duration: 0.3, bounce: 0.15)) { selection = i }
          }
        } label: {
          Text(labels[i])
            .kText(.system(15, on ? .semibold : .regular))
            .foregroundStyle(on ? theme.ink : theme.sub)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .padding(.horizontal, 8)
            .frame(maxWidth: .infinity, minHeight: 32)
            .background {
              if on {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                  .fill(theme.isDark ? theme.lav : theme.sf)
                  .shadow(color: .black.opacity(theme.isDark ? 0 : 0.10), radius: 3, y: 1)
                  .matchedGeometryEffect(id: "pill", in: pill)
              }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? [.isSelected, .isButton] : .isButton)
      }
    }
    .padding(3)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(theme.soft))
  }
}
