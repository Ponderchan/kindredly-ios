// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE AURA CARD (10a, H:78; owner: every number is a count, no progress bar). An InkCard .me,
 12 between its pieces:
 - the ink label YOUR WRITING AURA: mono 600 10 at .14em in the page colour on ink, padding
   5 9, corners 6, at the start;
 - the art slot, 110 tall, corners 14, on soft2: the app hands the picture in (a React Native
   island — the title's own scene fitted by height, never cover-cropped, or the desk drawn at
   the rung's fidelity on the slot's colour);
 - the title, system 600 20/1.2; FROM YOUR N LETTERS, mono 500 10 at .14em, mute;
 - the labels, wrapping 8 apart: system 600 12 in ind inside a 1.5 ind outline, corners 16,
   padding 5 12, no fill, no shadow; dashed while still trying on;
 - the well: the count glyphs in ind and faint (five ticks while letters lead to the first
   label; then three slots for the labels a name needs, and the strongest label's five slips)
   and the caption, mono 500 10 at .06em, mute;
 - the call to action (ink, the page colour's system 600 14, padding 12, corners 14, full
   width) and, once named, a 48-wide share key (sf, 2 ln, corners 14).
 The top of the card (everything above the buttons) is one button that opens the aura room,
 one VoiceOver element reading the label, the title, where it came from, the labels and the
 count.
 */

/// The Aura card's fixed sizes, for the app's island and the skeleton.
public enum KAuraCardMetrics {
  /// the art slot's height (H:78)
  public static let artHeight: CGFloat = 110
  /// the art slot's corners
  public static let artCorner: CGFloat = 14
}

public struct KAuraCard<Art: View>: View {
  static var labelStyle: KTextStyle { .monoSection }
  static var chipStyle: KTextStyle { .smallLabel }

  private let theme: KTheme
  private let aura: KMeAura
  private let actions: KMeActions
  private let art: Art

  public init(theme: KTheme, aura: KMeAura, actions: KMeActions, @ViewBuilder art: () -> Art) {
    self.theme = theme
    self.aura = aura
    self.actions = actions
    self.art = art()
  }

  private var a11ySummary: String {
    ([aura.label, aura.title, aura.from] + aura.chips.map(\.name) + [aura.caption])
      .filter { !$0.isEmpty }
      .joined(separator: ". ")
  }

  public var body: some View {
    InkCard(theme: theme, variant: .me, spacing: 12, soft: true) {
      SwiftUI.Button {
        actions.onAuraOpen()
      } label: {
        VStack(alignment: .leading, spacing: 12) {
          Text(aura.label)
            .kText(Self.labelStyle)
            .foregroundStyle(theme.bg)
            .lineLimit(1)
            .padding(.vertical, 5)
            .padding(.horizontal, 9)
            .background(RoundedRectangle(cornerRadius: 6, style: .circular).fill(theme.ink))
          art
            .frame(maxWidth: .infinity)
            .frame(height: KAuraCardMetrics.artHeight)
            .background(theme.soft2)
            // over the picture (an island in the app), so the tap is this button's
            .overlay { Color.clear.contentShape(Rectangle()) }
            .clipShape(RoundedRectangle(cornerRadius: KAuraCardMetrics.artCorner, style: .circular))
          Text(aura.title)
            .kText(.cardTitle)
            .foregroundStyle(theme.ink)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
          Text(aura.from)
            .kText(.monoMetaWide)
            .foregroundStyle(theme.mute)
            .multilineTextAlignment(.leading)
          if !aura.chips.isEmpty {
            KMeFlowLayout(spacing: 8, lineSpacing: 8) {
              ForEach(aura.chips) { chip in
                chipView(chip)
              }
            }
          }
          well
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(a11ySummary)
      .accessibilityAddTraits(.isButton)

      HStack(spacing: 8) {
        SwiftUI.Button {
          actions.onAuraCta()
        } label: {
          Text(aura.cta)
            .kText(.button)
            .foregroundStyle(theme.bg)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(12)
            .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.ink))
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        if aura.share {
          SwiftUI.Button {
            actions.onAuraShare()
          } label: {
            Image(systemName: "square.and.arrow.up")
              .font(.system(size: 17, weight: .semibold))
              .foregroundStyle(theme.ink)
              .frame(width: 48)
              .frame(maxHeight: .infinity)
              .background {
                RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.sf)
                RoundedRectangle(cornerRadius: 14, style: .circular).strokeBorder(theme.ln, lineWidth: 2)
              }
              .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityLabel(aura.shareLabel)
        }
      }
      .fixedSize(horizontal: false, vertical: true)
    }
  }

  private func chipView(_ chip: KMeAuraChip) -> some View {
    Text(chip.name)
      .kText(Self.chipStyle)
      .foregroundStyle(theme.ind)
      .lineLimit(1)
      .padding(.vertical, 5)
      .padding(.horizontal, 12)
      .overlay {
        RoundedRectangle(cornerRadius: 16, style: .circular)
          .strokeBorder(theme.ind, style: StrokeStyle(lineWidth: 1.5, dash: chip.emerging ? [4, 3] : []))
      }
  }

  // ── the well: counts, not a bar ───────────────────────────────────────
  private var well: some View {
    HStack(alignment: .center, spacing: 10) {
      KAuraMeterGlyphs(theme: theme, meter: aura.meter)
      Text(aura.caption)
        .kText(.monoCaption)
        .foregroundStyle(theme.mute)
        .frame(maxWidth: .infinity, alignment: .leading)
      if let slips = aura.meter.slips {
        KAuraSlips(theme: theme, n: slips.n, of: slips.of)
      }
    }
  }
}

/// The well's count glyphs: five ticks (10 × 12, corners 2, ind for each letter counted, faint
/// for the rest) or three slots (18 × 18, corners 5: ind with a tick in the page colour for a
/// label held, a dashed faint square for one not yet).
public struct KAuraMeterGlyphs: View {
  private let theme: KTheme
  private let meter: KMeAuraMeter

  public init(theme: KTheme, meter: KMeAuraMeter) {
    self.theme = theme
    self.meter = meter
  }

  public var body: some View {
    Group {
      switch meter.kind {
      case .ticks:
        HStack(spacing: 3) {
          ForEach(0..<max(0, meter.total), id: \.self) { i in
            RoundedRectangle(cornerRadius: 2, style: .circular)
              .fill(i < meter.filled ? theme.ind : theme.faint)
              .frame(width: 10, height: 12)
          }
        }
      case .slots:
        HStack(spacing: 5) {
          ForEach(0..<max(0, meter.total), id: \.self) { i in
            slot(done: i < meter.filled)
          }
        }
      }
    }
    .accessibilityHidden(true)
  }

  @ViewBuilder
  private func slot(done: Bool) -> some View {
    let shape = RoundedRectangle(cornerRadius: 5, style: .circular)
    if done {
      shape
        .fill(theme.ind)
        .frame(width: 18, height: 18)
        .overlay {
          KLineIcon(.check, size: 12, lineWidth: 3, color: theme.bg)
        }
    } else {
      shape
        .strokeBorder(theme.faint, style: StrokeStyle(lineWidth: 1.5, dash: [3, 2]))
        .frame(width: 18, height: 18)
    }
  }
}

/// The strongest held label's five slips: "n of your last m" (9 × 13, corners 2; ind for each
/// of the n, an outline for the rest of the m, the remainder faint at .35).
struct KAuraSlips: View {
  let theme: KTheme
  let n: Int
  let of: Int

  var body: some View {
    HStack(spacing: 3) {
      ForEach(0..<5, id: \.self) { i in
        let shape = RoundedRectangle(cornerRadius: 2, style: .circular)
        shape
          .fill(i < n ? theme.ind : Color.clear)
          .overlay {
            if i < of {
              shape.strokeBorder(i < n ? theme.ind : theme.faint, lineWidth: 1.5)
            }
          }
          .frame(width: 9, height: 13)
          .opacity(i < of ? 1 : 0.35)
      }
    }
    .accessibilityHidden(true)
  }
}

/// Lays its children out in rows, left to right, wrapping when the next one doesn't fit (CSS
/// flex-wrap with a gap). Each child keeps its own size.
public struct KMeFlowLayout: Layout {
  private let spacing: CGFloat
  private let lineSpacing: CGFloat

  public init(spacing: CGFloat = 8, lineSpacing: CGFloat = 8) {
    self.spacing = spacing
    self.lineSpacing = lineSpacing
  }

  public func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? .infinity
    var x: CGFloat = 0
    var y: CGFloat = 0
    var lineHeight: CGFloat = 0
    var widest: CGFloat = 0
    for view in subviews {
      let size = view.sizeThatFits(ProposedViewSize(width: width, height: nil))
      if x > 0 && x + size.width > width {
        y += lineHeight + lineSpacing
        x = 0
        lineHeight = 0
      }
      x += size.width + spacing
      widest = max(widest, x - spacing)
      lineHeight = max(lineHeight, size.height)
    }
    return CGSize(width: proposal.width ?? widest, height: y + lineHeight)
  }

  public func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var x = bounds.minX
    var y = bounds.minY
    var lineHeight: CGFloat = 0
    for view in subviews {
      let size = view.sizeThatFits(ProposedViewSize(width: bounds.width, height: nil))
      if x > bounds.minX && x + size.width > bounds.maxX {
        y += lineHeight + lineSpacing
        x = bounds.minX
        lineHeight = 0
      }
      view.place(at: CGPoint(x: x, y: y), anchor: .topLeading, proposal: ProposedViewSize(size))
      x += size.width + spacing
      lineHeight = max(lineHeight, size.height)
    }
  }
}

// MARK: - The report door (O6)

/*
 THE REPORT DOOR, 12 under the Aura card: the monthly writing report's way in (lib/report and
 /report existed with no door). A soft tray, corners 16, padding 14, 12 between: a 36 lav box
 with the ruled card in ind (or a gold lock on wax gold when it is First Class only), the title
 (system 600 15) over the sub (13, sub), and a chevron when it opens something. TS decides the
 four states (not enough writing yet, ready, locked, read this month) and every word; a door
 that opens nothing is plain text to VoiceOver.
 */
struct KReportDoorRow: View {
  let theme: KTheme
  let report: KMeReport
  let onTap: () -> Void

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 16, style: .circular)
    SwiftUI.Button(action: onTap) {
      HStack(alignment: .center, spacing: 12) {
        ZStack {
          RoundedRectangle(cornerRadius: 10, style: .circular)
            .fill(report.locked ? KBrand.cream : theme.lav)
          if report.locked {
            ZStack {
              Circle().fill(KBrand.waxGold)
              KLineIcon(.lock, size: 12, lineWidth: 2.4, color: KBrand.inkOnBrand)
            }
            .frame(width: 22, height: 22)
          } else {
            KLineIcon(.ruledCard, size: 20, lineWidth: 1.9, color: theme.ind)
          }
        }
        .frame(width: 36, height: 36)
        VStack(alignment: .leading, spacing: 2) {
          Text(report.title)
            .kText(.system(15, .semibold))
            .foregroundStyle(theme.ink)
            .fixedSize(horizontal: false, vertical: true)
          if !report.sub.isEmpty {
            Text(report.sub)
              .kText(.system(13))
              .foregroundStyle(theme.sub)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        if report.enabled {
          KLineIcon(.chevronRight, size: 14, lineWidth: 2.4, color: theme.mute)
        }
      }
      .padding(14)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(shape.fill(theme.soft))
      .contentShape(shape)
    }
    .buttonStyle(KFadePressStyle())
    .disabled(!report.enabled)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel([report.title, report.sub].filter { !$0.isEmpty }.joined(separator: ", "))
    .accessibilityHint(report.enabled ? report.hint : "")
    .accessibilityAddTraits(report.enabled ? .isButton : .isStaticText)
    .accessibilityRemoveTraits(report.enabled ? [] : .isButton)
  }
}
