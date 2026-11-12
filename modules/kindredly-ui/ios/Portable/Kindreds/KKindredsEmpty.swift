// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 NOBODY YET, IN SWIFTUI (batch 3, 2026-11-09; behind the "kindredsempty" switch, off by default):
 the Kindreds tab before the first correspondence, and for a guest with no session. The twin of
 src/screens/kindreds/KindredsEmpty.tsx, which stays the fallback; the list itself is
 KKindredsScreen, so with both switches on the tab is a Swift page whether it is empty or not.

 A port, not a redesign: the React Native page's plate (TabHeader: the title system 700 22,
 shrinking to .7 rather than pushing the status off; the status SF Mono 500 11 at .12em in mute),
 then a scroll that centres its content while it fits and always clears the floating tab bar
 (tabBarRoom + 12): the empty orbit (OrbitMap empty: five dashed rings, YOU at the centre, as wide
 as the screen allows) with her at its edge, her desk as a card, the line, its body and rule, and
 the one way in, PUT SOMEONE IN ORBIT.

 What is deliberately its own and not the list's: the orbit here is OrbitMap's geometry (ellipses
 as wide as the window, rx from 56 up to min(162, W/2 − 30), ry .78 rx, dashed 3 5, ink from .16
 outermost to .36 innermost, a 13pt cell for you), not KOrbit's fixed 340-wide sky, because that is
 what the empty page draws today. There is nobody on it, so nothing moves and there is nothing to
 pause off the tab.

 Her desk card (WrenDeskRow, standalone): sf, corners 22, the soft card shadow at .05, and on a
 dark theme the 1pt line edge; her official bird (a snapshot, KPersonBirdFace's 62% on soft2 with
 the official mark cut in sf), her name, the WREN tag in ind, NEW (an ink pill) while a post is
 unopened or else how long ago, the last line, and the count. A tap is TS's (her room).

 Every word, and whether anything is unread, comes from TS; Wren herself is a snapshot (the
 curious 40 at the edge of the sky, lib/bird-images "curious40"; the desk's "official").

 CATCH A LINE (owner, 2026-11-12: "按2d的做"). When TS sends slips (the first lines of the letters
 on today's desk: screens/kindreds/catch-model), the page is a thing to do instead of a thing to
 read: the same empty orbit as the back of a 330pt sky, the lines drifting down across it on
 slips of their topic's colour, her desk card, and under it either two quiet lines or, once a slip
 is tapped, that letter (who wrote it as Today's card names them, the topic, the words) with LET
 IT GO and WRITE BACK. Write back is TS's: it hands the letter to Today, the one place a
 stranger's letter is answered, so this page has no composer and no rules of its own. Which slip
 is open is this page's own state. No slips (no desk for today yet, nothing but voice letters, an
 older JS): the page above, exactly as it was. The parts are at the foot of this file.
 */

/// Her desk card as TS reads it (useWrenDesk).
public struct KKindredsEmptyDesk: Equatable, Sendable {
  public var name = ""
  /// WREN, already upper-cased
  public var tag = ""
  /// NEW
  public var newLabel = ""
  /// a post of hers is unopened
  public var unread = false
  /// "3", "9+" ("" when nothing is unread)
  public var badge = ""
  /// how long ago she last posted; "" for none
  public var ago = ""
  /// her last post's first line, or the row's standing line
  public var line = ""
  public var a11y = ""
  public var bird: KImageRef?

  public init() {}
}

/// Everything the empty page shows, from TS.
public struct KKindredsEmptyContent: Equatable, Sendable {
  public var title = ""
  /// NONE YET (the plate's status)
  public var status = ""
  /// YOU, under the centre cell
  public var you = ""
  public var heading = ""
  public var body = ""
  public var rule = ""
  public var cta = ""
  /// WREN PICKS (the CTA's mono half)
  public var picks = ""
  /// her at the edge of the sky (curious, 40)
  public var bird: KImageRef?
  public var desk = KKindredsEmptyDesk()
  /// the status bar (Swift lays its own strip)
  public var top: CGFloat = 0
  /// the floating tab bar's room
  public var tabBarRoom: CGFloat = 0
  /// catch a line: today's first lines, at most six; empty for the page as it was
  public var slips: [KCatchSlip] = []
  /// "Letters are passing through." and the line under it
  public var catchTitle = ""
  public var catchSub = ""
  /// the opened letter's two buttons
  public var letGo = ""
  public var writeBack = ""
  /// the tab is on show (the slips drift only then)
  public var active = true

  public init() {}
}

/// One drifting line and the letter under it (catch-model CatchSlip), from TS.
public struct KCatchSlip: Equatable, Sendable, Identifiable {
  public var id = ""
  /// the letter's first line, already cut to a slip's length
  public var line = ""
  /// the slip's paper and the opened letter's (hex; the topic's colour, pale, for this theme)
  public var wash = ""
  public var cardWash = ""
  /// a hairline round both, in the topic's colour (hex): a dark theme's, where a pale paper would
  /// be mud and the colour is carried by the edge instead; "" for none (the light themes)
  public var edge = ""
  /// the topic tag's fill (hex): the stamp's own colour, as on Today's card
  public var tagFill = ""
  /// who wrote it, as Today's card names them; never a she/he mark
  public var who = KCardWho()
  /// "#made my day"; "" for none
  public var topic = ""
  /// the whole letter
  public var body = ""
  /// VoiceOver, for the slip: who, the topic, the line
  public var a11y = ""
  /// VoiceOver, for the opened letter's header: who and the topic (the letter is read after it)
  public var spoken = ""

  public init() {}
}

public struct KKindredsEmpty: View {
  private let theme: KTheme
  private let content: KKindredsEmptyContent
  private let onWrite: () -> Void
  private let onDesk: () -> Void
  private let onAnswer: (String) -> Void

  /// the slip whose letter is open (catch a line)
  @State private var picked: String?
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameter onAnswer: WRITE BACK on an opened letter, with its id (TS takes it to Today)
  public init(theme: KTheme, content: KKindredsEmptyContent, onWrite: @escaping () -> Void, onDesk: @escaping () -> Void, onAnswer: @escaping (String) -> Void = { _ in }) {
    self.theme = theme
    self.content = content
    self.onWrite = onWrite
    self.onDesk = onDesk
    self.onAnswer = onAnswer
  }

  /// where a scroll stops so the opened letter's buttons clear the floating tab bar
  private static let catchEnd = "catch-end"

  public var body: some View {
    VStack(spacing: 0) {
      KKindredsEmptyPlate(theme: theme, title: content.title, status: content.status)
      GeometryReader { geo in
        if content.slips.isEmpty {
          ScrollView(.vertical) {
            page(width: geo.size.width)
              .padding(.horizontal, 16)
              .padding(.top, 12)
              .padding(.bottom, content.tabBarRoom + 12)
              // centred while it fits (contentContainerStyle flexGrow 1, justifyContent center)
              .frame(maxWidth: .infinity, minHeight: geo.size.height)
          }
          .scrollIndicators(.hidden)
        } else {
          ScrollViewReader { proxy in
            ScrollView(.vertical) {
              catchPage(width: geo.size.width)
                .padding(.horizontal, 16)
                .padding(.top, 4)
                .frame(maxWidth: .infinity, minHeight: geo.size.height, alignment: .top)
            }
            .scrollIndicators(.hidden)
            .onChange(of: picked) { _, now in
              // the opened letter is taller than the two lines it replaces: bring its buttons up
              guard now != nil else { return }
              DispatchQueue.main.async {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.26)) { proxy.scrollTo(Self.catchEnd, anchor: .bottom) }
              }
            }
          }
        }
      }
    }
    .padding(.top, content.top)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background(theme.bg.ignoresSafeArea())
    // a new sky (another visit, the desk moved on) may no longer hold the open letter
    .onChange(of: content.slips.map(\.id)) { _, ids in
      if let id = picked, !ids.contains(id) { picked = nil }
    }
  }

  private func pick(_ id: String?) {
    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.22)) { picked = id }
  }

  /// Catch a line (see the top): the sky, her desk, then the two lines or the opened letter.
  private func catchPage(width: CGFloat) -> some View {
    let open = content.slips.first { $0.id == picked }
    return VStack(spacing: 10) {
      KCatchSky(theme: theme, width: max(0, width - 32), you: content.you, slips: content.slips, picked: picked, active: content.active) { pick($0) }
        // the slips are laid out at a fixed pitch in a sky of a fixed height (still with Reduce
        // Motion, drifting otherwise): their words stop growing at Large, so a four-line slip never
        // covers the one under it or runs out of the sky. A caught slip opens its whole letter,
        // which grows as the reader asks.
        .dynamicTypeSize(...DynamicTypeSize.large)
      KKindredsEmptyDeskCard(theme: theme, desk: content.desk, onTap: onDesk)
      if let open {
        KCatchLetter(theme: theme, slip: open, letGo: content.letGo, writeBack: content.writeBack, onLetGo: { pick(nil) }, onWriteBack: { onAnswer(open.id) })
          .padding(.top, 4)
          .transition(.opacity)
      } else {
        VStack(spacing: 8) {
          Text(content.catchTitle)
            .kText(.system(22, .semibold, lineHeight: 28.0 / 22))
            .foregroundStyle(theme.ink)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
          Text(content.catchSub)
            .kText(.system(15, lineHeight: 22.0 / 15))
            .foregroundStyle(theme.sub)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: 300)
        .padding(.top, 18)
        .transition(.opacity)
      }
      // the floating tab bar's room, as a thing a scroll can stop at
      Color.clear
        .frame(height: content.tabBarRoom + 2)
        .id(Self.catchEnd)
    }
  }

  private func page(width: CGFloat) -> some View {
    VStack(spacing: 0) {
      // the sky is as wide as the window allows, wider than the column it sits in: it hangs out
      // either side (as the React Native View does) without widening the column under it
      Color.clear
        .frame(maxWidth: .infinity)
        .frame(height: KEmptyOrbit.box(windowWidth: width).h)
        .overlay {
          KEmptyOrbit(theme: theme, windowWidth: width, you: content.you)
            .overlay(alignment: .bottomTrailing) {
              // Wren waits at the edge of the empty sky
              KImage(content.bird, size: CGSize(width: 40, height: 40), contentMode: .fit, placeholder: .clear)
                .padding(.trailing, 26)
                .padding(.bottom, 28)
                .accessibilityHidden(true)
            }
        }
      // and her desk is here before anyone else is — under the sky, where the kindreds will go
      KKindredsEmptyDeskCard(theme: theme, desk: content.desk, onTap: onDesk)
        .padding(.top, 4)
        .padding(.bottom, 10)
      Text(content.heading)
        .kText(.system(26, .semibold, lineHeight: 33.0 / 26))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 14)
      Text(content.body)
        .kText(.system(15, lineHeight: 23.0 / 15))
        .foregroundStyle(theme.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: 300)
        .padding(.top, 14)
      Text(content.rule)
        .kText(KTextStyle(face: .monoMedium, size: 10, weight: .medium, tracking: 0.06, lineHeight: 17.0 / 10))
        .foregroundStyle(theme.mute)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: 300)
        .padding(.top, 14)
      SwiftUI.Button(action: onWrite) {
        HStack(alignment: .center, spacing: 12) {
          Text(content.cta)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.bg)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
          Text(content.picks)
            .kText(.mono(10, .medium, tracking: 0.1))
            .foregroundStyle(theme.bg)
            .opacity(0.72)
            .lineLimit(1)
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 20)
        .frame(maxWidth: .infinity)
        .background(theme.ind)
        .contentShape(Rectangle())
      }
      .buttonStyle(KSheetChrome.Press(pressed: 0.85))
      .accessibilityElement(children: .combine)
      .accessibilityAddTraits(.isButton)
      .padding(.top, 34)
    }
    // the inner column's own 16 (alignItems center, paddingHorizontal 16)
    .padding(.horizontal, 16)
  }
}

/// The React Native TabHeader as the empty page wears it: the title and a mute status, 52 tall,
/// 22 in from the screen's edges (16 + 6), no rule.
struct KKindredsEmptyPlate: View {
  let theme: KTheme
  let title: String
  let status: String

  var body: some View {
    HStack(alignment: .center, spacing: 12) {
      Text(title)
        .kText(.pageTitle)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .accessibilityAddTraits(.isHeader)
      Spacer(minLength: 0)
      if !status.isEmpty {
        Text(status)
          .kText(.mono(11, .medium, tracking: 1.3 / 11))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          .multilineTextAlignment(.trailing)
      }
    }
    .frame(minHeight: 52)
    .padding(.horizontal, 22)
  }
}

/// OrbitMap's empty sky (see the top): five dashed ellipses, you at the centre, YOU under you.
struct KEmptyOrbit: View {
  let theme: KTheme
  /// the window's width (OrbitMap measures useWindowDimensions; the page's own width here)
  let windowWidth: CGFloat
  let you: String

  static let reveal = 5
  static let squash: CGFloat = 0.78
  static let rxMin: CGFloat = 56
  static let cell: CGFloat = 13

  /// OrbitMap orbitBox
  static func box(windowWidth: CGFloat) -> (w: CGFloat, h: CGFloat, rxMax: CGFloat) {
    let w = min(398, windowWidth - 8)
    let rxMax = min(162, w / 2 - 30)
    let h = (rxMax * squash * 2 + 52).rounded()
    return (w, h, rxMax)
  }

  var body: some View {
    let b = Self.box(windowWidth: windowWidth)
    ZStack(alignment: .topLeading) {
      Canvas { gc, size in
        let cx = size.width / 2
        let cy = size.height / 2
        // ring p (1 the outermost) at rxMin + (rxMax − rxMin)(5 − p)/4; ink .16 outermost, + .05 inward
        for i in 0..<Self.reveal {
          let p = CGFloat(i + 1)
          let rx = Self.rxMin + (b.rxMax - Self.rxMin) * ((CGFloat(Self.reveal) - p) / CGFloat(Self.reveal - 1))
          let ry = rx * Self.squash
          gc.stroke(
            Path(ellipseIn: CGRect(x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2)),
            with: .color(theme.ink.opacity(0.16 + Double(i) * 0.05)),
            style: StrokeStyle(lineWidth: 1, dash: [3, 5])
          )
        }
        let c = Self.cell
        gc.fill(Path(CGRect(x: cx - c / 2, y: cy - c / 2, width: c, height: c)), with: .color(theme.ink))
      }
      .frame(width: b.w, height: b.h)
      Text(you)
        .kText(.mono(10, .medium, tracking: 0.2))
        .foregroundStyle(theme.mute)
        .lineLimit(1)
        .frame(width: 120)
        .position(x: b.w / 2, y: b.h / 2 + 13 + 7)
    }
    .frame(width: b.w, height: b.h)
    .accessibilityHidden(true)
  }
}

/// WrenDeskRow on its own (not in the list): a card. See the top.
struct KKindredsEmptyDeskCard: View {
  let theme: KTheme
  let desk: KKindredsEmptyDesk
  let onTap: () -> Void

  /// OfficialBird size 44
  static let face: CGFloat = 44

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 22, style: .circular)
    SwiftUI.Button(action: onTap) {
      HStack(alignment: .center, spacing: 12) {
        KPersonBirdFace(theme: theme, bird: desk.bird, size: Self.face, dim: false, badge: false)
          .overlay(alignment: .bottomTrailing) {
            // the mark's edge cut in the card's sf (OfficialBird ground)
            KOfficialBadge(theme: theme, size: max(16, (Self.face * 0.34).rounded()), ground: theme.sf)
              .offset(x: 1, y: 1)
          }
        VStack(alignment: .leading, spacing: 0) {
          HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(desk.name)
              .kText(.system(15, .semibold))
              .foregroundStyle(theme.ink)
              .lineLimit(1)
            Text(desk.tag)
              .kText(.mono(9, .semibold, tracking: 1.2 / 9))
              .foregroundStyle(theme.ind)
              .lineLimit(1)
            Spacer(minLength: 0)
            // the time since her last post — or, while one is unopened, NEW
            if desk.unread {
              Text(desk.newLabel)
                .kText(.mono(9, .semibold, tracking: 1.2 / 9))
                .foregroundStyle(theme.bg)
                .lineLimit(1)
                .padding(.horizontal, 7)
                .padding(.vertical, 2)
                .background(Capsule().fill(theme.ink))
            } else if !desk.ago.isEmpty {
              Text(desk.ago)
                .kText(.mono(10, .medium, tracking: 0.06))
                .foregroundStyle(theme.mute)
                .lineLimit(1)
            }
          }
          Text(desk.line)
            .kText(.system(14))
            .foregroundStyle(desk.unread ? theme.ink : theme.sub)
            .lineLimit(1)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        if desk.unread && !desk.badge.isEmpty {
          Text(desk.badge)
            .kText(.mono(10, .semibold))
            .foregroundStyle(theme.bg)
            .lineLimit(1)
            .padding(.horizontal, 6)
            .frame(minWidth: 20, minHeight: 20)
            .background(Capsule().fill(theme.ink))
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 13)
      .background {
        shape
          .fill(theme.sf)
          .shadow(color: Color(hex: "#1E1B35").opacity(0.05), radius: 24, x: 0, y: 8)
      }
      .overlay {
        if theme.isDark { shape.strokeBorder(theme.line, lineWidth: 1) }
      }
      .contentShape(shape)
    }
    .buttonStyle(KSheetChrome.Press(pressed: 0.85))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(desk.a11y)
    .accessibilityAddTraits(.isButton)
    .padding(.bottom, 2)
  }
}

/* ── catch a line ─────────────────────────────────────────────────────── */

/// The sky of catch a line: the empty orbit behind, and today's first lines drifting down across
/// it on slips of their topic's colour, turning a few degrees as they go, round and round. They
/// run in two columns, the left a little quicker than the right (13 and 16 seconds a crossing),
/// the slips of a column evenly apart: nothing overtakes, so no line is ever under another and
/// every slip can be read and tapped (the prototype's six paces, each its own, laid slips over
/// each other's words). A tap picks a slip: every slip stops where it is and fades to a quarter,
/// and none takes a tap until the letter is let go. They stop off the tab as well. With Reduce
/// Motion or VoiceOver nothing drifts: the same two columns stand still, staggered, all the slips
/// at once, so nothing moves under a finger or the VoiceOver cursor.
struct KCatchSky: View {
  let theme: KTheme
  /// the sky's width (the page's column)
  let width: CGFloat
  let you: String
  let slips: [KCatchSlip]
  let picked: String?
  let active: Bool
  let onPick: (String) -> Void

  static let height: CGFloat = 330
  static let corner: CGFloat = 28
  /// a slip's travel: from above the sky to below it (a four-line slip is about 104 tall)
  static let from: CGFloat = -112
  static let to: CGFloat = 344
  /// at most six slips: three to a column
  static let most = 6
  /// a crossing, in seconds: the left column, the right
  static let crossing: [Double] = [13, 16]
  /// where in its crossing each column's first slip starts
  static let lead: [Double] = [0.06, 0.2]
  /// how far each slip turns either way, and how far it sits off its column's line
  static let tilts: [Double] = [-3, 4, 3, -4, 3.5, -3]
  static let nudges: [CGFloat] = [0, 0, 3, -3, -2, 2]
  /// the column's inset from the sky's edge
  static let inset: CGFloat = 5

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
  /// the reader's Letter font: a slip's line is someone's words, so it is set in it
  @Environment(\.kLetterFace) private var letterFace
  /// the drift's clock: when it began, when it last stopped, and how long it has stood still in all
  @State private var began = Date()
  @State private var stoppedAt: Date?
  @State private var stood: TimeInterval = 0

  private var slipWidth: CGFloat { min(170, max(110, (width - 16) / 2)) }
  private var running: Bool { picked == nil && active }
  private var shown: [KCatchSlip] { Array(slips.prefix(Self.most)) }

  /// slip i's column (even the left, odd the right) and where it sits across the sky
  private func column(_ i: Int) -> (col: Int, x: CGFloat) {
    let col = i % 2
    let nudge = Self.nudges[i % Self.nudges.count]
    return (col, col == 0 ? Self.inset + nudge : width - slipWidth - Self.inset - nudge)
  }

  /// how far through its crossing slip i is at drift time t (0 above the sky, 1 below it)
  private func progress(_ i: Int, of count: Int, at t: Double) -> Double {
    let col = i % 2
    let inColumn = max(1, col == 0 ? (count + 1) / 2 : count / 2)
    let p = t / Self.crossing[col] + Self.lead[col] + Double(i / 2) / Double(inColumn)
    return p - p.rounded(.down)
  }

  var body: some View {
    let still = reduceMotion || voiceOver
    ZStack(alignment: .topLeading) {
      KEmptyOrbit(theme: theme, windowWidth: width + 8, you: you)
        .frame(width: width, height: Self.height)
      if still {
        ForEach(Array(shown.enumerated()), id: \.element.id) { i, slip in
          let at = column(i)
          slipView(slip)
            .rotationEffect(.degrees(Self.tilts[i] * 0.5))
            .offset(x: at.x, y: 6 + CGFloat(i / 2) * 106 + (at.col == 1 ? 12 : 0))
        }
      } else {
        TimelineView(.animation(minimumInterval: 1.0 / 60, paused: !running)) { frame in
          let t = (stoppedAt ?? frame.date).timeIntervalSince(began) - stood
          ZStack(alignment: .topLeading) {
            ForEach(Array(shown.enumerated()), id: \.element.id) { i, slip in
              let p = progress(i, of: shown.count, at: t)
              slipView(slip)
                .rotationEffect(.degrees(Self.tilts[i] * (2 * p - 1)))
                .offset(x: column(i).x, y: Self.from + (Self.to - Self.from) * CGFloat(p))
            }
          }
          .frame(width: width, height: Self.height, alignment: .topLeading)
        }
      }
    }
    .frame(width: width, height: Self.height, alignment: .topLeading)
    .clipShape(RoundedRectangle(cornerRadius: Self.corner, style: .continuous))
    .contentShape(RoundedRectangle(cornerRadius: Self.corner, style: .continuous))
    .accessibilityElement(children: .contain)
    .onChange(of: running) { _, on in
      // stop the clock where it is and start it from there: a let-go slip carries on, it doesn't jump
      if on {
        if let at = stoppedAt { stood += Date().timeIntervalSince(at) }
        stoppedAt = nil
      } else if stoppedAt == nil {
        stoppedAt = Date()
      }
    }
    .onAppear {
      if !running && stoppedAt == nil { stoppedAt = Date() }
    }
  }

  private func slipView(_ slip: KCatchSlip) -> some View {
    let paper = RoundedRectangle(cornerRadius: 16, style: .continuous)
    return SwiftUI.Button { onPick(slip.id) } label: {
      KHugUpTo(widest: slipWidth - 26) {
        // content, so the reader's Letter font (type system, 2026-10-20), at the short line's tier
        Text(slip.line)
          .kText(.content(letterFace.fitSize(16), lineHeight: 21.0 / 16))
          .foregroundStyle(theme.ink)
          .multilineTextAlignment(.leading)
          .lineLimit(4)
      }
        .padding(.horizontal, 13)
        .padding(.vertical, 10)
        .frame(minHeight: 44)
        .background {
          // a light theme's slip is a pale paper lifted by a soft shadow; a dark theme's is the
          // surface, barely tinted, with its colour in a hairline (no shadow shows on black)
          if slip.edge.isEmpty {
            paper
              .fill(Color(hex: slip.wash))
              .shadow(color: Color(hex: "#1E1B35").opacity(0.1), radius: 10, x: 0, y: 4)
          } else {
            paper.fill(Color(hex: slip.wash))
          }
        }
        .overlay {
          if !slip.edge.isEmpty { paper.strokeBorder(Color(hex: slip.edge), lineWidth: 1) }
        }
        .contentShape(paper)
    }
    .buttonStyle(KSheetChrome.Press(pressed: 0.85))
    .opacity(picked == nil ? 1 : 0.25)
    .allowsHitTesting(picked == nil)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(slip.a11y)
    .accessibilityAddTraits(.isButton)
    .accessibilityHidden(picked != nil)
  }
}

/// A slip is as wide as its line, up to a widest: a short line makes a short slip, a long one
/// wraps there. (A flexible frame under fixedSize takes the line's one-line height for the wrapped
/// text, so the paper came out a line short: this measures the text at the width it is given.)
struct KHugUpTo: Layout {
  let widest: CGFloat

  private func size(_ view: LayoutSubview) -> CGSize {
    let oneLine = view.sizeThatFits(.unspecified)
    let width = min(widest, oneLine.width.rounded(.up))
    let wrapped = view.sizeThatFits(ProposedViewSize(width: width, height: nil))
    return CGSize(width: width, height: wrapped.height.rounded(.up))
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    subviews.first.map(size) ?? .zero
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard let view = subviews.first else { return }
    view.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
  }
}

/// A caught letter, opened under the sky: who wrote it as Today's card names them (the face slot
/// at 28, the name in the interface's face, the star sign), its topic as Today's own tag (the
/// stamp's colour, mono), the letter in the reader's Letter font, and the two buttons, 46 tall:
/// LET IT GO (the slips drift on) and WRITE BACK (Today takes it from there). On the topic's
/// colour, a little stronger than its slip; in a dark theme on the surface with the colour in a
/// hairline, as its slip. A long letter shows its first eight lines here; the whole of it is the
/// card Today opens.
struct KCatchLetter: View {
  let theme: KTheme
  let slip: KCatchSlip
  let letGo: String
  let writeBack: String
  let onLetGo: () -> Void
  let onWriteBack: () -> Void

  var body: some View {
    let paper = RoundedRectangle(cornerRadius: 22, style: .continuous)
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center, spacing: 8) {
        KCardFaceSlot(theme: theme, face: slip.who.face, side: 28)
          .accessibilityHidden(true)
        HStack(alignment: .firstTextBaseline, spacing: 0) {
          Text(slip.who.name)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
          KWhoMarks(mark: nil, sign: slip.who.sign, size: 13, color: theme.sub)
        }
        Spacer(minLength: 8)
        if !slip.topic.isEmpty {
          // Today's own tag: the stamp's colour, the words in ink #1E1B35 in every theme, flat
          KTopicTag(
            theme: theme,
            text: slip.topic,
            tone: .custom(
              fill: KStampFrame.rgb(hex: slip.tagFill).map { KStampFrame.color($0) } ?? KStampFrame.color(KStampFrame.v3TagNeutral),
              text: KStampFrame.color(KStampFrame.v3Ink)
            ),
            flat: true
          )
          .layoutPriority(-1)
        }
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(slip.spoken)
      Text(slip.body)
        .kText(.content(19, lineHeight: 27.0 / 19))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.leading)
        .lineLimit(8)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 10)
      HStack(spacing: 10) {
        SwiftUI.Button(action: onLetGo) {
          Text(letGo)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .padding(.horizontal, 18)
            .frame(minHeight: 46)
            .background(Capsule().fill(slip.edge.isEmpty ? theme.sf.opacity(0.75) : theme.soft2))
            .contentShape(Capsule())
        }
        .buttonStyle(KSheetChrome.Press(pressed: 0.85))
        SwiftUI.Button(action: onWriteBack) {
          Text(writeBack)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.bg)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .padding(.horizontal, 18)
            .frame(maxWidth: .infinity, minHeight: 46)
            .background(Capsule().fill(theme.ind))
            .contentShape(Capsule())
        }
        .buttonStyle(KSheetChrome.Press(pressed: 0.85))
      }
      .padding(.top, 14)
    }
    .padding(.vertical, 14)
    .padding(.horizontal, 16)
    .background(paper.fill(Color(hex: slip.cardWash)))
    .overlay {
      if !slip.edge.isEmpty { paper.strokeBorder(Color(hex: slip.edge), lineWidth: 1) }
    }
  }
}
