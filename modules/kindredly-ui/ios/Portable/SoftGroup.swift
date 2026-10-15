// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SOFTGROUP, the 10a material for lists and settings (tokens-10a.md §7.2): a block in the
 theme's soft, corners of 16, clipped, with no outline and no shadow (H:92, 93, 99, 101; P:49).
 Its rows sit straight on it, one under the other, with nothing between them but each row's own
 1pt divider. In Midnight soft is the same colour as sf.

 A group with its header, as Settings lays it out (H:101):

   SoftGroupSection(theme: t, header: "Notifications") {
     SoftRow(theme: t, systemImage: "bell", label: "Knock at 8", value: "ON")
     SoftRow(theme: t, systemImage: "moon", label: "Quiet hours", value: "22–8", divider: false)
   }

 The last row passes divider: false. The mock draws a divider under every row, the last one
 included, along the group's bottom edge; here the last one is left out, as iOS's own lists
 do, and a row can't tell by itself that it is the last.
 */
public struct SoftGroup<Content: View>: View {
  private let theme: KTheme
  private let content: Content

  public init(theme: KTheme, @ViewBuilder content: () -> Content) {
    self.theme = theme
    self.content = content()
  }

  public var body: some View {
    let shape = RoundedRectangle(cornerRadius: 16, style: .circular)
    VStack(alignment: .leading, spacing: 0) {
      content
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(shape.fill(theme.soft))
    .clipShape(shape)
  }
}

/// A group header: mono 600 10 at .14em in mute, set in from the group's edge by 10 (H:101).
/// The mock writes them in capitals; this sets any title that way.
public struct SoftGroupHeader: View {
  private let theme: KTheme
  private let title: String

  public init(theme: KTheme, title: String) {
    self.theme = theme
    self.title = title
  }

  public var body: some View {
    Text(title)
      .textCase(.uppercase)
      .kText(.monoSection)
      .foregroundStyle(theme.mute)
      .padding(.horizontal, 10)
      .accessibilityAddTraits(.isHeader)
  }
}

/// A header and its group, 6 apart (H:101: a flex column with gap 6).
public struct SoftGroupSection<Content: View>: View {
  private let theme: KTheme
  private let header: String
  private let content: Content

  public init(theme: KTheme, header: String, @ViewBuilder content: () -> Content) {
    self.theme = theme
    self.header = header
    self.content = content()
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      SoftGroupHeader(theme: theme, title: header)
      SoftGroup(theme: theme) { content }
    }
  }
}

/*
 A SETTINGS ROW (H:101), left to right:
 - the row is set in 14 from each side, with 12 between the icon box and the text column;
 - the icon box is 28 × 28, corners of 8, in sf, with the icon centred in it;
 - the text column is 12 above and below, and its bottom edge is the row's 1pt divider in line.
   So the divider starts under the text, not under the icon, as in iOS's own lists. The CSS
   border adds its 1pt to the row's height, and so does this one;
 - on the column's first line: the label (system 400 15, ink) taking the room, then the value
   (mono 500 12, mute, never wrapping), then the chevron (system 400 18, faint, the › glyph at
   line-height 1), 8 apart; then whatever accessory the row has, a switch for instance;
 - an optional subline under it, 4 below (system 400 12/1.4, mute).

 The row is a plain view. A row that opens something goes inside a Button (or NavigationLink)
 with .buttonStyle(.plain); VoiceOver reads the row as one element either way.
 */
public struct SoftRow<Icon: View, Accessory: View>: View {
  private let theme: KTheme
  private let label: String
  private let value: String?
  private let subtitle: String?
  private let chevron: Bool
  private let divider: Bool
  private let icon: Icon
  private let accessory: Accessory

  /// the chevron's CSS box is line-height:1, 18 tall, which is less than the glyph's natural
  /// line; framed to 18 so it doesn't make the row taller than the mock's
  @ScaledMetric(relativeTo: .title3) private var chevronBox: CGFloat = 18

  public init(
    theme: KTheme,
    label: String,
    value: String? = nil,
    subtitle: String? = nil,
    chevron: Bool = true,
    divider: Bool = true,
    @ViewBuilder icon: () -> Icon,
    @ViewBuilder accessory: () -> Accessory
  ) {
    self.theme = theme
    self.label = label
    self.value = value
    self.subtitle = subtitle
    self.chevron = chevron
    self.divider = divider
    self.icon = icon()
    self.accessory = accessory()
  }

  public var body: some View {
    HStack(spacing: 12) {
      icon
        .frame(width: 28, height: 28)
        .background(RoundedRectangle(cornerRadius: 8, style: .circular).fill(theme.sf))
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 0) {
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 8) {
            Text(label)
              .kText(.rowLabel)
              .foregroundStyle(theme.ink)
              .frame(maxWidth: .infinity, alignment: .leading)
            if let value {
              Text(value)
                .kText(.monoValue)
                .foregroundStyle(theme.mute)
                .lineLimit(1)
                .fixedSize()
            }
            if chevron {
              Text("›")
                .kText(.chevron)
                .foregroundStyle(theme.faint)
                .frame(height: chevronBox)
                .accessibilityHidden(true)
            }
            accessory
          }
          if let subtitle {
            Text(subtitle)
              .kText(.subtext)
              .foregroundStyle(theme.mute)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .padding(.vertical, 12)
        if divider {
          Rectangle()
            .fill(theme.line)
            .frame(height: 1)
            .accessibilityHidden(true)
        }
      }
    }
    .padding(.horizontal, 14)
    .accessibilityElement(children: .combine)
  }
}

public extension SoftRow where Icon == SoftRowIcon, Accessory == EmptyView {
  /// A row with an SF Symbol in its icon box (or, with none, the mock's placeholder square)
  /// and no accessory.
  init(
    theme: KTheme,
    systemImage: String? = nil,
    label: String,
    value: String? = nil,
    subtitle: String? = nil,
    chevron: Bool = true,
    divider: Bool = true
  ) {
    self.init(
      theme: theme,
      label: label,
      value: value,
      subtitle: subtitle,
      chevron: chevron,
      divider: divider,
      icon: { SoftRowIcon(theme: theme, systemImage: systemImage) },
      accessory: { EmptyView() }
    )
  }
}

public extension SoftRow where Icon == SoftRowIcon {
  /// A row with an SF Symbol in its icon box (or the placeholder square) and an accessory,
  /// a switch for instance.
  init(
    theme: KTheme,
    systemImage: String? = nil,
    label: String,
    value: String? = nil,
    subtitle: String? = nil,
    chevron: Bool = false,
    divider: Bool = true,
    @ViewBuilder accessory: () -> Accessory
  ) {
    self.init(
      theme: theme,
      label: label,
      value: value,
      subtitle: subtitle,
      chevron: chevron,
      divider: divider,
      icon: { SoftRowIcon(theme: theme, systemImage: systemImage) },
      accessory: accessory
    )
  }
}

/// What sits in a row's icon box: an SF Symbol in sub, or with no symbol the mock's own
/// placeholder, a 10 × 10 square with corners of 3 outlined 1.5 in sub (H:101).
public struct SoftRowIcon: View {
  private let theme: KTheme
  private let systemImage: String?

  public init(theme: KTheme, systemImage: String? = nil) {
    self.theme = theme
    self.systemImage = systemImage
  }

  public var body: some View {
    if let systemImage {
      Image(systemName: systemImage)
        .font(.system(size: 14, weight: .medium))
        .foregroundStyle(theme.sub)
    } else {
      RoundedRectangle(cornerRadius: 3, style: .circular)
        .strokeBorder(theme.sub, lineWidth: 1.5)
        .frame(width: 10, height: 10)
    }
  }
}
