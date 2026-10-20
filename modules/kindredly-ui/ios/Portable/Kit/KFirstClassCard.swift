// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FIRST CLASS CARD, cream paper with a stamp, in its two sizes. Brand colours, the same in
 every theme (a brand object, like the courier's green): cream, the cream's border, wax gold and
 its darker text, and the dark ink and sub drawn on cream (KBrand.inkOnBrand, subOnCream).

 .card (H:84), the Me tab's FIRST CLASS segment: corners of 24, a 2pt cream border, padding
 18 18 16 (the border outside it), 14 between the words and the stamp. The words, 8 apart: the
 eyebrow (an 8pt wax-gold dot and FIRST CLASS in mono 600 10 at .16em in gold), the headline in
 system 600 24/1.15 in ink, the list of what it brings in system 13/1.5 in sub, and the
 call to action as an ink pill (system 600 13 in white, padding 10 14, corners of 14), 4 lower.
 The stamp: 78 × 96, white, corners of 8, a 2pt dotted wax-gold edge, turned 4°, the bird 43
 across over 1ST in mono 600 9 at .1em in gold.

 .banner (H:98), the top of Settings: corners of 18, a 1.5 cream border, padding 14 14 14 16,
 12 between, the words 5 apart: the eyebrow with a 7pt dot, the headline 19/1.2, the list in
 system 12/1.4, and the call to action as a gold link (system 600 13), 2 lower. The stamp 56 × 70,
 the bird 31 across.

 At the accessibility text sizes the eyebrow and the call to action wrap instead of being cut
 ("FIRST CLA…" at AX3), and the banner's stamp moves under its words, so they get the width.

 The whole card is one button (onPress) and one VoiceOver element. Every word is passed in,
 the owner's copy, already translated; the bird is a picture (the courier's live snapshot in
 the reader's own coat, KImageRef), and nil leaves the stamp's face white.
 */
public struct KFirstClassCard: View {
  /// the two sizes the card comes in
  public enum Variant: Sendable {
    /// the Me tab's FIRST CLASS segment (H:84)
    case card
    /// the top of Settings (H:98)
    case banner
  }

  private let variant: Variant
  private let eyebrow: String
  private let headline: String
  private let sub: String
  private let cta: String
  private let stampLabel: String
  private let bird: KImageRef?
  private let onPress: () -> Void

  /// - Parameters:
  ///   - variant: .card (Me) or .banner (Settings)
  ///   - eyebrow: FIRST CLASS
  ///   - headline: the owner's line, in system 600
  ///   - sub: what it brings (line breaks allowed)
  ///   - cta: the call to action, e.g. "See First Class →"
  ///   - stampLabel: the word on the stamp, 1ST
  ///   - bird: the courier's snapshot for the stamp, or nil
  ///   - onPress: the card was tapped
  public init(variant: Variant, eyebrow: String, headline: String, sub: String, cta: String, stampLabel: String, bird: KImageRef?, onPress: @escaping () -> Void) {
    self.variant = variant
    self.eyebrow = eyebrow
    self.headline = headline
    self.sub = sub
    self.cta = cta
    self.stampLabel = stampLabel
    self.bird = bird
    self.onPress = onPress
  }

  @Environment(\.dynamicTypeSize) private var typeSize

  private var isCard: Bool { variant == .card }
  /// an accessibility text size: the one-line words wrap
  private var large: Bool { typeSize.isAccessibilitySize }

  public var body: some View {
    let border: CGFloat = isCard ? 2 : 1.5
    let shape = RoundedRectangle(cornerRadius: isCard ? 24 : 18, style: .circular)
    SwiftUI.Button(action: onPress) {
      let layout = large && !isCard
        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
        : AnyLayout(HStackLayout(alignment: isCard ? .top : .center, spacing: isCard ? 14 : 12))
      layout {
        words
        stamp
      }
      // the padding, and the border outside it (content-box, as the mock's card has none set)
      .padding(.top, (isCard ? 18 : 14) + border)
      .padding(.bottom, (isCard ? 16 : 14) + border)
      .padding(.leading, (isCard ? 18 : 16) + border)
      .padding(.trailing, (isCard ? 18 : 14) + border)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background {
        KStickerBackground(shape: shape, fill: KBrand.cream, stroke: KBrand.creamBorder, lineWidth: border)
      }
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(.isButton)
  }

  private var words: some View {
    VStack(alignment: .leading, spacing: isCard ? 8 : 5) {
      HStack(spacing: 8) {
        Circle()
          .fill(KBrand.waxGold)
          .frame(width: isCard ? 8 : 7, height: isCard ? 8 : 7)
          .accessibilityHidden(true)
        Text(eyebrow)
          .textCase(.uppercase)
          .kText(.monoEyebrow)
          .foregroundStyle(KBrand.goldText)
          .lineLimit(large ? nil : 1)
          .fixedSize(horizontal: false, vertical: large)
      }
      Text(headline)
        .kText(isCard ? .system(24, .semibold, lineHeight: 1.15) : .system(19, .semibold, lineHeight: 1.2))
        .foregroundStyle(KBrand.inkOnBrand)
        .fixedSize(horizontal: false, vertical: true)
      Text(sub)
        .kText(isCard ? .smallBody : .subtext)
        .foregroundStyle(KBrand.subOnCream)
        .fixedSize(horizontal: false, vertical: true)
      if isCard {
        Text(cta)
          .kText(.chip)
          .foregroundStyle(KBrand.paperWhite)
          .lineLimit(large ? nil : 1)
          .minimumScaleFactor(large ? 1 : 0.8)
          .fixedSize(horizontal: false, vertical: large)
          .padding(.vertical, 10)
          .padding(.horizontal, 14)
          .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(KBrand.inkOnBrand))
          .padding(.top, 4)
      } else {
        Text(cta)
          .kText(.chip)
          .foregroundStyle(KBrand.goldText)
          .lineLimit(large ? nil : 1)
          .minimumScaleFactor(large ? 1 : 0.8)
          .fixedSize(horizontal: false, vertical: large)
          .padding(.top, 2)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var stamp: some View {
    let size = isCard ? CGSize(width: 78, height: 96) : CGSize(width: 56, height: 70)
    let birdSide: CGFloat = isCard ? 43 : 31
    let shape = RoundedRectangle(cornerRadius: 8, style: .circular)
    return VStack(spacing: 4) {
      KImage(bird, size: CGSize(width: birdSide, height: birdSide), contentMode: .fit, placeholder: .clear)
      Text(stampLabel)
        .kText(.monoTiny)
        .foregroundStyle(KBrand.goldText)
        .lineLimit(1)
        .fixedSize()
    }
    .frame(width: size.width, height: size.height)
    .background(shape.fill(KBrand.paperWhite))
    // CSS's 2px dotted: round dots 2 across, 4 apart
    .overlay(shape.strokeBorder(KBrand.waxGold, style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [0.001, 4])))
    .rotationEffect(.degrees(4))
    .accessibilityHidden(true)
  }
}

// MARK: - THE FIRST CLASS PAGE (Me 4a, Prompt 7)

/*
 THE FIRST CLASS PAGE (Me 4a, .claude/me4a/ME4A.md §1.6, §2.3), the route /paywall drawn in Swift.
 It lives in this file rather than one of its own so the module needs no pod install (ME4A D1);
 KFirstClassCard above is untouched.

 First Class's own palette in every theme (D5): a white page, the cream hero, ink type, wax gold.
 From the top:
 - THE HERO, outside the scroll view: the gradient #FFF3D6 → cream, the 420 dashed gold arc, the
   courier flying (120, her look, bobbing 8pt over 2.6s on a layer of its own), the 30 gold seal
   1ST, the title in system 700 34 and the line under it in 14 sub. It collapses (330 → 130 in 4a's
   phone, which counts its 54 status bar; here everything is measured from the close row, 4a's
   60) when the page has scrolled past 70 and would still have more than 90 to scroll once
   collapsed, and opens again under 16: every value moves together over .45s
   cubic-bezier(.3,1,.3,1), instantly under Reduce Motion, which also stops the bob.
 - THE FARES (not for a member): Yearly (its saving, worked out in TS) / Monthly / ■ Lifetime on a
   soft track, the chosen one white with a soft shadow; the price 40/600 with its unit; the mono
   note in gold.
 - WHAT IT OPENS: the benefit rows (white on a soft tray, a 40 cream box with the drawing, a gold
   check), or for the Lifetime seat the cofounder card (cream, the badge only once the reader
   holds a number).
 - Restore purchases, Terms · Privacy, and the renewal line (App Store 3.1.2).
 - THE BUTTON, pinned at the bottom over a white fade: 54 tall at least, ink with a 4/4 gold hard
   shadow, and the mono line under it. The content's bottom padding is the panel's measured
   height, so the last row always clears it.
 Which fare is chosen is this view's (reported with onSelect); buying is TS's (onBuy with the
 fare's id), and `busy` holds the button with a spinner meanwhile.
 */

/// One fare as the page shows it; every word resolved in TS.
public struct KPaywallFare: Equatable, Sendable, Identifiable {
  public enum Period: String, Sendable { case annual, monthly, lifetime }
  public let id: String
  public let period: Period
  public let label: String
  /// "−52%" or ""
  public let badge: String
  public let price: String
  public let per: String
  public let note: String
  public let cta: String
  public let ctaNote: String
  public let legal: String
  public let a11y: String

  public init(id: String, period: Period, label: String, badge: String, price: String, per: String, note: String, cta: String, ctaNote: String, legal: String, a11y: String) {
    self.id = id
    self.period = period
    self.label = label
    self.badge = badge
    self.price = price
    self.per = per
    self.note = note
    self.cta = cta
    self.ctaNote = ctaNote
    self.legal = legal
    self.a11y = a11y
  }
}

/// The six 4a drawings a benefit row can carry.
public enum KPaywallGlyph: String, Sendable {
  case rooms, voice, wardrobe, report, stamps, paper

  /// the 24-grid path data, as 4a draws them (template line 188)
  var path: String {
    switch self {
    case .rooms: return "M4 6h13v9H9l-5 4z M12 19h8l4 4V12h-3"
    case .voice: return "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3"
    case .wardrobe: return "M4 8c2-3 5-4 8-4s6 1 8 4v2H4z M6 10v9h12v-9"
    case .report: return "M6 4h12v16H6z M9 8h6 M9 12h6 M9 16h3"
    case .stamps: return "M5 4h14v16H5z M8 7h8v10H8z"
    // letter paper: a ruled sheet in the same hand
    case .paper: return "M6 3h12v18H6z M9 8h6 M9 11.5h6 M9 15h6"
    }
  }
}

public struct KPaywallBenefit: Equatable, Sendable, Identifiable {
  public let id: String
  public let glyph: KPaywallGlyph
  public let title: String
  public let sub: String
  public init(id: String, glyph: KPaywallGlyph, title: String, sub: String) {
    self.id = id
    self.glyph = glyph
    self.title = title
    self.sub = sub
  }
}

public struct KPaywallPerk: Equatable, Sendable {
  public let title: String
  public let sub: String
  public init(title: String, sub: String) {
    self.title = title
    self.sub = sub
  }
}

/// Everything the page shows.
public struct KPaywallContent: Equatable, Sendable {
  public var eyebrow = ""
  public var title = ""
  public var sub = ""
  public var close = ""
  public var restore = ""
  public var terms = ""
  public var privacy = ""
  public var active = ""
  public var activeSub = ""
  public var cfTitle = ""
  public var cfTagline = ""
  public var cfFoot = ""
  public var sealLabel = ""
  /// VoiceOver's value on a member's benefit row
  public var included = ""
  public var bird: KImageRef?
  public var fares: [KPaywallFare] = []
  public var initialFare = ""
  public var benefits: [KPaywallBenefit] = []
  /// "No. 047", or "" for no badge
  public var cofounderBadge = ""
  public var perks: [KPaywallPerk] = []
  public var premium = false
  public var cofounder = false
  public var memberCta = ""
  public var memberNote = ""
  public init() {}
}

/// Where the page's taps go. One object for the life of the surface.
public final class KPaywallActions {
  public var onClose: () -> Void = {}
  public var onSelect: (String) -> Void = { _ in }
  public var onBuy: (String) -> Void = { _ in }
  public var onRestore: () -> Void = {}
  public var onTerms: () -> Void = {}
  public var onPrivacy: () -> Void = {}
  public var onManage: () -> Void = {}
  public init() {}
}

/// First Class's fixed palette on this page (D5): the day themes' tokens, never the reader's theme.
enum KPW {
  static let ink = KBrand.inkOnBrand
  static let sub = KBrand.subOnCream
  static let mute = Color(hex: "#8A86A3")
  static let soft = Color(hex: "#F6F5F9")
  static let line = Color(hex: "#E6E4EC")
  static let white = KBrand.paperWhite
  static let heroTop = Color(hex: "#FFF3D6")
  static let sealRing = Color(hex: "#E8C068")
  /// 4a's hero motion: .45s cubic-bezier(.3,1,.3,1)
  static let heroMotion = Animation.timingCurve(0.3, 1, 0.3, 1, duration: 0.45)
}

/// A 4a line drawing from SVG path data on the 24 grid, stroked with round caps and joins, for the
/// few drawings that aren't shared KLineGlyphs (this page's benefit icons, My letters' pen and
/// manage lines). Decorative.
struct K4aPathIcon: View {
  let d: String
  let size: CGFloat
  var lineWidth: CGFloat = 1.9
  let color: Color

  var body: some View {
    K4aPathShape(d: d, lineWidth: lineWidth)
      .fill(color)
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }
}

struct K4aPathShape: Shape {
  let d: String
  var lineWidth: CGFloat

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width, rect.height) / 24
    guard s > 0 else { return Path() }
    let place = CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.midX - 12 * s, ty: rect.midY - 12 * s)
    return KSVGPath.path(d).applying(place)
      .strokedPath(StrokeStyle(lineWidth: lineWidth * s, lineCap: .round, lineJoin: .round))
  }
}

/// The scroll facts the hero's collapse rule reads.
private struct KPaywallScroll: Equatable {
  var y: CGFloat
  var content: CGFloat
  var container: CGFloat
}

public struct KPaywallScreen: View {
  private let content: KPaywallContent
  private let busy: Bool
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KPaywallActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var chosen: String?
  @State private var collapsed = false
  /// the bottom panel's height, measured: the content's bottom padding
  @State private var panelHeight: CGFloat = 130
  /// the title and its line, measured: the expanded hero grows to hold them at large type
  @State private var titleBlock: CGFloat = 90
  /// the page's own height (padding included) and the scroll view's height with the hero open
  @State private var pageHeight: CGFloat = 0
  @State private var openViewport: CGFloat = 0

  /// - Parameters:
  ///   - topInset: the status bar inset (0 in a page sheet: the close row then sits 12 down)
  ///   - bottomInset: the home indicator's
  public init(content: KPaywallContent, busy: Bool, topInset: CGFloat, bottomInset: CGFloat, actions: KPaywallActions) {
    self.content = content
    self.busy = busy
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  private var selected: KPaywallFare? {
    content.fares.first { $0.id == chosen } ?? content.fares.first { $0.id == content.initialFare } ?? content.fares.first
  }

  /// 4a's y on this page: 4a measures from the top of a phone whose status bar is 54 (the close row at 60, Wren at 54), so 0 here is the status bar's foot (6 into a page sheet, which has none)
  private func y(_ v: CGFloat) -> CGFloat {
    v - 54 + (topInset < 20 ? 6 : topInset)
  }

  private var expandedHeight: CGFloat { max(y(330), y(200) + titleBlock + 22) }
  private var collapsedHeight: CGFloat { y(130) }

  public var body: some View {
    GeometryReader { geo in
      VStack(spacing: 0) {
        hero(width: geo.size.width)
        ScrollView(.vertical) {
          page
            .padding(.horizontal, 16)
            .padding(.bottom, panelHeight + 12)
            .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { h in
              if abs(h - pageHeight) > 0.5 { pageHeight = h }
            }
            .frame(minHeight: pageFloor, alignment: .top)
        }
        .scrollIndicators(.hidden)
        .onScrollGeometryChange(for: KPaywallScroll.self) { g in
          KPaywallScroll(y: g.contentOffset.y + g.contentInsets.top, content: g.contentSize.height, container: g.containerSize.height)
        } action: { _, s in
          scrolled(s)
        }
      }
      .overlay(alignment: .bottom) { panel }
    }
    .background(KPW.white.ignoresSafeArea())
    .environment(\.colorScheme, .light)
  }

  /// 4a's rule: collapse past 70 when there would still be more than 90 to scroll once collapsed;
  /// open again under 16
  /// A page that scrolls at all is given room to scroll on with the hero closed: 4a's own pages
  /// always had it (six rows), but with four rows a phone would otherwise never close the hero,
  /// and a page just past the line would open and close it as the viewport changed. A page that
  /// fits doesn't scroll and keeps the hero open.
  private var pageFloor: CGFloat {
    guard openViewport > 0, pageHeight > openViewport + 1 else { return 0 }
    return openViewport + (expandedHeight - collapsedHeight) + 91
  }

  private func scrolled(_ s: KPaywallScroll) {
    if !collapsed, abs(s.container - openViewport) > 0.5 { openViewport = s.container }
    let delta = expandedHeight - collapsedHeight
    if !collapsed, s.y > 70, s.content - (s.container + delta) > 90 {
      setCollapsed(true)
    } else if collapsed, s.y < 16 {
      setCollapsed(false)
    }
  }

  private func setCollapsed(_ on: Bool) {
    if reduceMotion {
      var t = Transaction()
      t.disablesAnimations = true
      withTransaction(t) { collapsed = on }
    } else {
      withAnimation(KPW.heroMotion) { collapsed = on }
    }
  }

  // MARK: hero

  private func hero(width: CGFloat) -> some View {
    let k: CGFloat = collapsed ? 1 : 0
    let cx = width / 2
    let wrenSide = 120 - 76 * k
    let sealSide = 30 - 10 * k
    return ZStack(alignment: .topLeading) {
      LinearGradient(colors: [KPW.heroTop, KBrand.cream], startPoint: .top, endPoint: .bottom)
        .frame(width: width, height: collapsed ? collapsedHeight : expandedHeight)
      Circle()
        .strokeBorder(KBrand.waxGold, style: StrokeStyle(lineWidth: 2, dash: [6, 5]))
        .frame(width: 420, height: 420)
        .offset(x: cx - 210, y: y(120 - 60 * k))
        .opacity(1 - min(1, 1.6 * k))
        .accessibilityHidden(true)
      KPaywallBird(bird: content.bird, side: wrenSide, bob: !reduceMotion)
        .offset(x: cx - 60 + 148 * k, y: y(54 + 6 * k))
      seal(side: sealSide)
        .offset(x: cx + 26 + 116 * k, y: y(136 - 62 * k))
      titleBlockView(width: width)
        .offset(y: y(200 - 128 * k))
      HStack(spacing: 10 - 11) {
        SwiftUI.Button(action: actions.onClose) {
          KLineIcon(.close, size: 20, lineWidth: 2.2, color: KPW.ink)
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
        .accessibilityLabel(content.close)
        Text(content.eyebrow)
          .textCase(.uppercase)
          .kText(.monoWide)
          .foregroundStyle(KBrand.goldText)
          .lineLimit(1)
          .opacity(1 - k)
          .accessibilityHidden(true)
          // it shares its line with the courier's wings: it stops growing at the default size
          .dynamicTypeSize(...DynamicTypeSize.large)
      }
      .offset(x: 14 - 11, y: y(60) - 11)
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    }
    .frame(width: width, height: collapsed ? collapsedHeight : expandedHeight, alignment: .topLeading)
    .clipped()
  }

  private func titleBlockView(width: CGFloat) -> some View {
    VStack(spacing: 16) {
      Text(content.title)
        .kText(.system(34, .bold, lineHeight: 1.05))
        .foregroundStyle(KPW.ink)
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .minimumScaleFactor(0.7)
        .padding(.horizontal, 24)
        .scaleEffect(collapsed ? 20.0 / 34.0 : 1, anchor: .top)
        .accessibilityAddTraits(.isHeader)
      Text(content.sub)
        .kText(.system(14, lineHeight: 1.45))
        .foregroundStyle(KPW.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 40)
        .opacity(collapsed ? 0 : 1)
        .accessibilityHidden(collapsed)
    }
    .frame(width: width)
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { h in
      if abs(h - titleBlock) > 0.5 { titleBlock = h }
    }
  }

  private func seal(side: CGFloat) -> some View {
    Circle()
      .fill(KBrand.waxGold)
      .overlay(Circle().strokeBorder(KPW.sealRing, lineWidth: 3))
      .overlay(
        Text(content.sealLabel)
          .font(KType.mono(9, .semibold))
          .foregroundStyle(KPW.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          .padding(2)
          // a mark drawn on the seal, not words to read (hidden): it never grows
          .dynamicTypeSize(.large)
      )
      .frame(width: side, height: side)
      .accessibilityHidden(true)
  }

  // MARK: page

  private var page: some View {
    VStack(spacing: 0) {
      if content.premium {
        activeBlock
          .padding(.top, 10)
        benefitsTray
          .padding(.top, 8)
        if content.cofounder {
          cofounderCard
            .padding(.top, 8)
        }
      } else if let fare = selected {
        segments(selected: fare)
          .padding(.top, 6)
        priceRow(fare)
        if !fare.note.isEmpty {
          Text(fare.note)
            .kText(.mono(10, .semibold, tracking: 0.12))
            .foregroundStyle(KBrand.goldText)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
        }
        if fare.period == .lifetime {
          cofounderCard
            .padding(.top, 8)
        } else {
          benefitsTray
            .padding(.top, 8)
        }
      }
      footer(legal: content.premium ? "" : (selected?.legal ?? ""))
    }
  }

  private var activeBlock: some View {
    VStack(spacing: 4) {
      Text(content.active)
        .textCase(.uppercase)
        .kText(.monoSection)
        .foregroundStyle(KBrand.goldText)
      Text(content.activeSub)
        .kText(.system(14, lineHeight: 1.4))
        .foregroundStyle(KPW.sub)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.vertical, 14)
    .padding(.horizontal, 16)
    .frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(KBrand.cream))
    .accessibilityElement(children: .combine)
  }

  private func segments(selected fare: KPaywallFare) -> some View {
    HStack(spacing: 0) {
      ForEach(content.fares) { f in
        let on = f.id == fare.id
        SwiftUI.Button {
          guard f.id != fare.id else { return }
          if reduceMotion { chosen = f.id } else { withAnimation(.easeOut(duration: 0.2)) { chosen = f.id } }
          actions.onSelect(f.id)
        } label: {
          HStack(spacing: 6) {
            if f.period == .lifetime {
              RoundedRectangle(cornerRadius: 2, style: .circular)
                .fill(KBrand.waxGold)
                .frame(width: 8, height: 8)
            }
            Text(f.label)
              .kText(.system(13, .semibold))
              .foregroundStyle(on ? KPW.ink : KPW.sub)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
            if !f.badge.isEmpty {
              Text(f.badge)
                .kText(.mono(9, .semibold, tracking: 0.08))
                .foregroundStyle(KPW.ink)
                .lineLimit(1)
                .fixedSize()
                .padding(.vertical, 2)
                .padding(.horizontal, 5)
                .background(RoundedRectangle(cornerRadius: 6, style: .circular).fill(KBrand.waxGold))
            }
          }
          .padding(.horizontal, 4)
          .frame(maxWidth: .infinity, minHeight: 40)
          .background {
            if on {
              RoundedRectangle(cornerRadius: 12, style: .circular)
                .fill(KPW.white)
                .shadow(color: KPW.ink.opacity(0.18), radius: 3, x: 0, y: 2)
            }
          }
          .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(f.a11y)
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
      }
    }
    .padding(4)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(KPW.soft))
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private func priceRow(_ f: KPaywallFare) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 6) {
      Text(f.price)
        .kText(.system(40, .semibold, tracking: -0.02))
        .foregroundStyle(KPW.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.5)
      Text(f.per)
        .kText(.system(15))
        .foregroundStyle(KPW.sub)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity)
    .padding(.top, 6)
    .padding(.bottom, 2)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    // the segment already says it; the price is read once there
    .accessibilityHidden(true)
  }

  private var benefitsTray: some View {
    VStack(spacing: 6) {
      ForEach(content.benefits) { b in
        HStack(spacing: 14) {
          K4aPathIcon(d: b.glyph.path, size: 20, lineWidth: 1.9, color: KPW.ink)
            .frame(width: 40, height: 40)
            .background(RoundedRectangle(cornerRadius: 12, style: .circular).fill(KBrand.cream))
          VStack(alignment: .leading, spacing: 2) {
            Text(b.title)
              .kText(.system(15, .semibold))
              .foregroundStyle(KPW.ink)
              .fixedSize(horizontal: false, vertical: true)
            Text(b.sub)
              .kText(.system(13))
              .foregroundStyle(KPW.sub)
              .fixedSize(horizontal: false, vertical: true)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          K4aPathIcon(d: "M5 12l5 5L20 7", size: 16, lineWidth: 2.6, color: KBrand.goldText)
        }
        .padding(.vertical, 13)
        .padding(.horizontal, 14)
        .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(KPW.white))
        .accessibilityElement(children: .combine)
        .accessibilityValue(content.premium ? content.included : "")
      }
    }
    .padding(6)
    .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(KPW.soft))
  }

  private var cofounderCard: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .center, spacing: 8) {
        Text(content.cfTitle)
          .textCase(.uppercase)
          .kText(.mono(10, .semibold, tracking: 0.18))
          .foregroundStyle(KBrand.goldText)
          .frame(maxWidth: .infinity, alignment: .leading)
        if !content.cofounderBadge.isEmpty {
          HStack(spacing: 6) {
            Rectangle().fill(KBrand.waxGold).frame(width: 7, height: 7)
            Text(content.cofounderBadge)
              .kText(.mono(10, .semibold, tracking: 0.12))
              .foregroundStyle(KPW.ink)
              .lineLimit(1)
              .fixedSize()
          }
          .padding(.vertical, 4)
          .padding(.horizontal, 8)
          .overlay(RoundedRectangle(cornerRadius: 6, style: .circular).strokeBorder(KBrand.waxGold, lineWidth: 1.5))
        }
      }
      Text(content.cfTagline)
        .kText(.system(14, lineHeight: 1.4))
        .foregroundStyle(KPW.sub)
        .fixedSize(horizontal: false, vertical: true)
      VStack(alignment: .leading, spacing: 12) {
        ForEach(Array(content.perks.enumerated()), id: \.offset) { _, p in
          HStack(alignment: .top, spacing: 14) {
            Rectangle().fill(KBrand.waxGold).frame(width: 10, height: 10).padding(.top, 6)
            VStack(alignment: .leading, spacing: 2) {
              Text(p.title)
                .kText(.system(15, .semibold))
                .foregroundStyle(KPW.ink)
                .fixedSize(horizontal: false, vertical: true)
              Text(p.sub)
                .kText(.system(13))
                .foregroundStyle(KPW.sub)
                .fixedSize(horizontal: false, vertical: true)
            }
          }
          .accessibilityElement(children: .combine)
        }
      }
      Rectangle().fill(KBrand.creamBorder).frame(height: 1.5)
      Text(content.cfFoot)
        .kText(.system(14, lineHeight: 1.4))
        .foregroundStyle(KBrand.goldText)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(KBrand.cream))
    .overlay(RoundedRectangle(cornerRadius: 20, style: .circular).strokeBorder(KBrand.creamBorder, lineWidth: 1.5))
  }

  private func footer(legal: String) -> some View {
    VStack(spacing: 10) {
      SwiftUI.Button(action: actions.onRestore) {
        Text(content.restore)
          .kText(.system(13))
          .underline()
          .foregroundStyle(KPW.sub)
          .padding(.vertical, 4)
      }
      .buttonStyle(KFadePressStyle())
      .disabled(busy)
      HStack(spacing: 8) {
        SwiftUI.Button(action: actions.onTerms) {
          Text(content.terms).kText(.system(12)).foregroundStyle(KPW.mute)
        }
        .buttonStyle(KFadePressStyle())
        Text("·").kText(.system(12)).foregroundStyle(KPW.mute).accessibilityHidden(true)
        SwiftUI.Button(action: actions.onPrivacy) {
          Text(content.privacy).kText(.system(12)).foregroundStyle(KPW.mute)
        }
        .buttonStyle(KFadePressStyle())
      }
      if !legal.isEmpty {
        Text(legal)
          .kText(.system(11.5, lineHeight: 1.4))
          .foregroundStyle(KPW.mute)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.horizontal, 12)
      }
    }
    .frame(maxWidth: .infinity)
    .padding(.top, 14)
  }

  // MARK: the button

  private var panel: some View {
    let cta = content.premium ? content.memberCta : (selected?.cta ?? "")
    let note = content.premium ? content.memberNote : (selected?.ctaNote ?? "")
    return VStack(spacing: 8) {
      SwiftUI.Button {
        guard !busy else { return }
        if content.premium { actions.onManage() } else if let f = selected { actions.onBuy(f.id) }
      } label: {
        ZStack {
          if busy {
            ProgressView().tint(KPW.white)
          } else {
            Text(cta)
              .kText(.system(16, .semibold))
              .foregroundStyle(KPW.white)
              .multilineTextAlignment(.center)
              .lineLimit(2)
              .minimumScaleFactor(0.8)
          }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, minHeight: 54)
        .background {
          KStickerBackground(shape: RoundedRectangle(cornerRadius: 16, style: .circular), fill: KPW.ink, stroke: nil, lineWidth: 0, shadow: KBrand.waxGold, shadowOffset: 4)
        }
        .contentShape(RoundedRectangle(cornerRadius: 16, style: .circular))
      }
      .buttonStyle(KFadePressStyle())
      .disabled(busy || (!content.premium && selected == nil))
      .accessibilityLabel(note.isEmpty ? cta : "\(cta), \(note)")
      if !note.isEmpty {
        Text(note)
          .kText(.mono(10, .semibold, tracking: 0.1))
          .foregroundStyle(KPW.mute)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityHidden(true)
      }
    }
    .padding(.top, 12)
    .padding(.horizontal, 16)
    .padding(.bottom, max(bottomInset - 4, 16))
    .padding(.trailing, 4) // the hard shadow's 4 stays inside the panel
    .background(
      LinearGradient(stops: [.init(color: KPW.white.opacity(0), location: 0), .init(color: KPW.white, location: 0.3)], startPoint: .top, endPoint: .bottom)
        .ignoresSafeArea(edges: .bottom)
    )
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { h in
      if abs(h - panelHeight) > 0.5 { panelHeight = h }
    }
  }
}

/// The hero's courier: drawn at 120 and scaled to `side`, so the size animates as a transform, with
/// 4a's bob (translateY 0 → −8, rotate −4° → 2°, 2.6s there and back) on a layer of its own.
private struct KPaywallBird: View {
  let bird: KImageRef?
  let side: CGFloat
  let bob: Bool
  @State private var up = false

  var body: some View {
    KImage(bird, size: CGSize(width: 120, height: 120), contentMode: .fit, placeholder: .clear)
      .offset(y: up ? -8 : 0)
      .rotationEffect(.degrees(up ? 2 : -4))
      .scaleEffect(side / 120, anchor: .topLeading)
      .frame(width: side, height: side, alignment: .topLeading)
      .accessibilityHidden(true)
      .onAppear { setBob(bob) }
      .onChange(of: bob) { _, on in setBob(on) }
  }

  private func setBob(_ on: Bool) {
    if on {
      withAnimation(.easeInOut(duration: 1.3).repeatForever(autoreverses: true)) { up = true }
    } else {
      var t = Transaction()
      t.disablesAnimations = true
      withTransaction(t) { up = false }
    }
  }
}
