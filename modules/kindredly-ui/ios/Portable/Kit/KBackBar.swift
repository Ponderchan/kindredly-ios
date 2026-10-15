// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SECONDARY-PAGE HEADER (H:90), for every pushed page: Edit profile, Settings, and the pages
 under them. No rule under it.
 - the back chevron (‹, M15 6l-7 6 7 6) 18 across at stroke 2.2 in ink, in a 36 box 12 from the
   left edge, with a 44 target; VoiceOver calls it backLabel;
 - the title centred, in mono 600 at .16em in capitals (the mock's 12; KMonoSizes, owner
   question 2: 11), one line, shrinking to .7 before it would run into the chevron; it is the
   page's header for VoiceOver;
 - an optional trailing view 12 from the right edge (a Done, a count). The title keeps the
   same room at both ends, so it stays centred on the screen; keep the trailing view within
   the chevron's 44 or it reaches into the title's room;
 - 52 tall where it is sticky (Edit profile: it stays at the top as the page scrolls under it,
   on the page colour so nothing shows through), 44 where it scrolls away with the page
   (Settings). Pinning it is the screen's business (a pinned section header, or an overlay);
   sticky only paints its ground.

 It takes the full width it is offered, as the mock's bar runs edge to edge (margin 0 -16).
 */
public struct KBackBar<Trailing: View>: View {
  /// the heights the mock draws: the sticky bar (H:90) and the one that scrolls away (H:97)
  public static var stickyHeight: CGFloat { 52 }
  public static var scrollingHeight: CGFloat { 44 }

  private let theme: KTheme
  private let title: String
  private let backLabel: String
  private let height: CGFloat
  private let sticky: Bool
  private let trailing: Trailing
  private let onBack: () -> Void

  /// - Parameters:
  ///   - title: the page's name, set in capitals
  ///   - backLabel: what VoiceOver calls the chevron, already translated
  ///   - height: 52 (stickyHeight) or 44 (scrollingHeight)
  ///   - sticky: paint the page colour behind it, for a bar the page scrolls under
  ///   - trailing: a view at the right end, or nothing
  ///   - onBack: the chevron was tapped
  public init(
    theme: KTheme,
    title: String,
    backLabel: String,
    height: CGFloat = 52,
    sticky: Bool = true,
    @ViewBuilder trailing: () -> Trailing,
    onBack: @escaping () -> Void
  ) {
    self.theme = theme
    self.title = title
    self.backLabel = backLabel
    self.height = height
    self.sticky = sticky
    self.trailing = trailing()
    self.onBack = onBack
  }

  /// the room each end keeps: 12 from the edge and the chevron's 36 box, and a little air
  private var sideRoom: CGFloat { 12 + 36 + 8 }

  public var body: some View {
    ZStack {
      Text(title)
        .textCase(.uppercase)
        .kText(.monoHeader)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .padding(.horizontal, sideRoom)
        .accessibilityAddTraits(.isHeader)
      HStack(spacing: 0) {
        SwiftUI.Button(action: onBack) {
          KLineIcon(.chevronLeft, size: 18, lineWidth: 2.2, color: theme.ink)
            .frame(width: 36, height: 36)
            // a 44 target around the 36 box
            .padding(4)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
        .accessibilityLabel(backLabel)
        .padding(.leading, 12 - 4)
        Spacer(minLength: 0)
        trailing
          .padding(.trailing, 12)
      }
    }
    .frame(height: height)
    .frame(maxWidth: .infinity)
    .background(sticky ? theme.bg : Color.clear)
    // the bar is fixed height: its words stop growing at the largest standard size
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }
}

public extension KBackBar where Trailing == EmptyView {
  /// A bar with nothing at its right end.
  init(theme: KTheme, title: String, backLabel: String, height: CGFloat = 52, sticky: Bool = true, onBack: @escaping () -> Void) {
    self.init(theme: theme, title: title, backLabel: backLabel, height: height, sticky: sticky, trailing: { EmptyView() }, onBack: onBack)
  }
}
