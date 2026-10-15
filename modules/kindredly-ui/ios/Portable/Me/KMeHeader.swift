// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ME'S BAR (H:71): 52 tall on the page colour, no rule under it (owner). On the left the page
 title, system 600 22 at .04em, 22 from the screen's edge (the 16 gutter and the bar's own 6);
 in the middle the pen name, system 600 16; on the right the sliders, 22 across at stroke 1.9
 in a 34 box, no container.

 As the page scrolls (sc, the offset in points) the title fades and rises and the pen name
 comes in from below, by the mock's own formulas:
   title     opacity clamp(0, 1 - sc/60, 1)          translateY(-sc × .15)
   pen name  opacity clamp(0, (sc - 40)/60, 1)        translateY(clamp(0, 12 - sc × .15, 12))
 Only this view reads the scroll (a KScrollModel capped past the crossfade), so the page never
 redraws as it moves. Under Reduce Motion the two still crossfade but don't travel.

 It never hides, so VoiceOver always finds it: the title is the page's header (an element of
 its own that doesn't fade), the moving copy and the pen name are hidden from VoiceOver (the
 profile card says the name), and the sliders button carries its label. Text stops growing at
 xxxLarge so the 52pt bar holds. Reusable as any tab's collapsing title.
 */
public struct KMeHeader: View {
  /// the bar's height (H:71)
  public static let height: CGFloat = 52

  private let theme: KTheme
  private let title: String
  private let centerTitle: String
  private let trailingLabel: String
  @ObservedObject private var chrome: KScrollModel
  private let onTrailing: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - title: the page title at rest (ME)
  ///   - centerTitle: what comes in once scrolled (the pen name)
  ///   - trailingLabel: VoiceOver's name for the sliders button
  ///   - chrome: the page's scroll (offset), capped past 100
  public init(theme: KTheme, title: String, centerTitle: String, trailingLabel: String, chrome: KScrollModel, onTrailing: @escaping () -> Void) {
    self.theme = theme
    self.title = title
    self.centerTitle = centerTitle
    self.trailingLabel = trailingLabel
    self.chrome = chrome
    self.onTrailing = onTrailing
  }

  /// The mock's two curves, for an offset `sc`: (title opacity, title rise, name opacity, name drop).
  static func curves(_ sc: CGFloat) -> (titleOpacity: CGFloat, titleY: CGFloat, nameOpacity: CGFloat, nameY: CGFloat) {
    let s = max(0, sc)
    return (
      min(1, max(0, 1 - s / 60)),
      -s * 0.15,
      min(1, max(0, (s - 40) / 60)),
      min(12, max(0, 12 - s * 0.15))
    )
  }

  public var body: some View {
    let c = Self.curves(chrome.offset)
    let travel: CGFloat = reduceMotion ? 0 : 1
    ZStack {
      Text(centerTitle)
        .kText(.navTitle)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .padding(.horizontal, 60)
        .opacity(c.nameOpacity)
        .offset(y: c.nameY * travel)
        .accessibilityHidden(true)
      HStack(alignment: .center, spacing: 0) {
        Text(title)
          .kText(.pageTitle)
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .opacity(c.titleOpacity)
          .offset(y: c.titleY * travel)
          .accessibilityHidden(true)
          // the header VoiceOver reads: always there, whatever the scroll has faded
          .background {
            Color.clear
              .accessibilityElement()
              .accessibilityLabel(title)
              .accessibilityAddTraits(.isHeader)
          }
        Spacer(minLength: 12)
        SwiftUI.Button(action: onTrailing) {
          // a 44pt target round the 34 box, taken back outside so nothing moves
          KLineIcon(.sliders, size: 22, lineWidth: 1.9, color: theme.ink)
            .frame(width: 34, height: 34)
            .padding(5)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(-5)
        .accessibilityLabel(trailingLabel)
      }
      .padding(.horizontal, 16 + 6)
    }
    .frame(height: Self.height)
    .frame(maxWidth: .infinity)
    .background(theme.bg)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }
}
