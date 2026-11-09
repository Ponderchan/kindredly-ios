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

  public init() {}
}

public struct KKindredsEmpty: View {
  private let theme: KTheme
  private let content: KKindredsEmptyContent
  private let onWrite: () -> Void
  private let onDesk: () -> Void

  public init(theme: KTheme, content: KKindredsEmptyContent, onWrite: @escaping () -> Void, onDesk: @escaping () -> Void) {
    self.theme = theme
    self.content = content
    self.onWrite = onWrite
    self.onDesk = onDesk
  }

  public var body: some View {
    VStack(spacing: 0) {
      KKindredsEmptyPlate(theme: theme, title: content.title, status: content.status)
      GeometryReader { geo in
        ScrollView(.vertical) {
          page(width: geo.size.width)
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, content.tabBarRoom + 12)
            // centred while it fits (contentContainerStyle flexGrow 1, justifyContent center)
            .frame(maxWidth: .infinity, minHeight: geo.size.height)
        }
        .scrollIndicators(.hidden)
      }
    }
    .padding(.top, content.top)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background(theme.bg.ignoresSafeArea())
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
