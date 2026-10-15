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

 The rows (10a step 5, Settings and Edit profile):
 - SoftRow: the Settings row, an SF Symbol in its 28pt box (H:101); a tint (the exits' red,
   KTheme.danger) colours its label and symbol;
 - SoftToggleRow: the same with the 10a switch at its end (KToggleStyle), read by VoiceOver as
   one switch with its label, its subline as the hint;
 - SoftPlainRow: Edit profile's row, no icon box, its value in system 500 14 (H:92).
 At the accessibility text sizes a row's value moves under its label instead of squeezing it to
 nothing. Every word is passed in, already translated.
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

/// A header and its group, 6 apart (H:101: a flex column with gap 6). An empty header draws the
/// group alone (Settings' two exits).
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
      if !header.isEmpty {
        SoftGroupHeader(theme: theme, title: header)
      }
      SoftGroup(theme: theme) { content }
    }
  }
}

/// The 1pt divider under a row's words, in line.
struct SoftDivider: View {
  let theme: KTheme

  var body: some View {
    Rectangle()
      .fill(theme.line)
      .frame(height: 1)
      .accessibilityHidden(true)
  }
}

/// The › at a row's end: system 400 18 in faint, framed to its CSS box (line-height 1, 18 tall)
/// so it doesn't make the row taller than the mock's.
struct SoftChevron: View {
  let theme: KTheme
  @ScaledMetric(relativeTo: .body) private var box: CGFloat = 18 // KTextStyle.chevron scales with .body

  var body: some View {
    Text("›")
      .kText(.chevron)
      .foregroundStyle(theme.faint)
      .frame(height: box)
      .accessibilityHidden(true)
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
   (mono 500, mute, never wrapping: the mock's 12, 11 under the owner's 9/10/11 rule), then the
   chevron (system 400 18, faint, the › glyph at line-height 1), 8 apart; then whatever
   accessory the row has, a switch for instance;
 - an optional subline under it, 4 below (system 400 12/1.4, mute).
 At the accessibility sizes the value goes under the label (the label keeps the width).

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
  private let tint: Color?
  private let icon: Icon
  private let accessory: Accessory

  @Environment(\.dynamicTypeSize) private var typeSize

  /// - Parameters:
  ///   - tint: the label's colour (and the convenience inits' symbol's), for the exits' red; nil
  ///     for ink
  public init(
    theme: KTheme,
    label: String,
    value: String? = nil,
    subtitle: String? = nil,
    chevron: Bool = true,
    divider: Bool = true,
    tint: Color? = nil,
    @ViewBuilder icon: () -> Icon,
    @ViewBuilder accessory: () -> Accessory
  ) {
    self.theme = theme
    self.label = label
    self.value = value
    self.subtitle = subtitle
    self.chevron = chevron
    self.divider = divider
    self.tint = tint
    self.icon = icon()
    self.accessory = accessory()
  }

  public var body: some View {
    let stacked = typeSize.isAccessibilitySize
    HStack(alignment: stacked ? .top : .center, spacing: 12) {
      icon
        .frame(width: 28, height: 28)
        .background(RoundedRectangle(cornerRadius: 8, style: .circular).fill(theme.sf))
        .padding(.top, stacked ? 10 : 0)
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 0) {
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 8) {
            Text(label)
              .kText(.rowLabel)
              .foregroundStyle(tint ?? theme.ink)
              .frame(maxWidth: .infinity, alignment: .leading)
              .fixedSize(horizontal: false, vertical: true)
            if let value, !stacked, !value.isEmpty {
              valueText(value)
            }
            if chevron {
              SoftChevron(theme: theme)
            }
            accessory
          }
          if let value, stacked, !value.isEmpty {
            valueText(value)
          }
          if let subtitle, !subtitle.isEmpty {
            Text(subtitle)
              .kText(.subtext)
              .foregroundStyle(theme.mute)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
        .padding(.vertical, 12)
        if divider {
          SoftDivider(theme: theme)
        }
      }
    }
    .padding(.horizontal, 14)
    .contentShape(Rectangle())
    .accessibilityElement(children: .combine)
  }

  private func valueText(_ value: String) -> some View {
    Text(value)
      .kText(.monoValue)
      .foregroundStyle(theme.mute)
      .lineLimit(typeSize.isAccessibilitySize ? 2 : 1)
      .fixedSize(horizontal: !typeSize.isAccessibilitySize, vertical: true)
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
    divider: Bool = true,
    tint: Color? = nil
  ) {
    self.init(
      theme: theme,
      label: label,
      value: value,
      subtitle: subtitle,
      chevron: chevron,
      divider: divider,
      tint: tint,
      icon: { SoftRowIcon(theme: theme, systemImage: systemImage, tint: tint) },
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
    tint: Color? = nil,
    @ViewBuilder accessory: () -> Accessory
  ) {
    self.init(
      theme: theme,
      label: label,
      value: value,
      subtitle: subtitle,
      chevron: chevron,
      divider: divider,
      tint: tint,
      icon: { SoftRowIcon(theme: theme, systemImage: systemImage, tint: tint) },
      accessory: accessory
    )
  }
}

/// What sits in a row's icon box: an SF Symbol in sub (or the row's tint), or with no symbol the
/// mock's own placeholder, a 10 × 10 square with corners of 3 outlined 1.5 in sub (H:101).
public struct SoftRowIcon: View {
  private let theme: KTheme
  private let systemImage: String?
  private let tint: Color?

  public init(theme: KTheme, systemImage: String? = nil, tint: Color? = nil) {
    self.theme = theme
    self.systemImage = systemImage
    self.tint = tint
  }

  public var body: some View {
    if let systemImage, !systemImage.isEmpty {
      SwiftUI.Image(systemName: systemImage)
        .font(.system(size: 14, weight: .medium))
        .foregroundStyle(tint ?? theme.sub)
        // a symbol the system lacks draws nothing rather than failing; the box stays
        .frame(width: 28, height: 28)
    } else {
      RoundedRectangle(cornerRadius: 3, style: .circular)
        .strokeBorder(tint ?? theme.sub, lineWidth: 1.5)
        .frame(width: 10, height: 10)
    }
  }
}

/*
 A ROW WITH A SWITCH (H:99, H:101: Match system, Notifications, the 8 o'clock knock): the
 Settings row's icon box and words, and the 10a switch at the end (KToggleStyle, 44 × 26). The
 switch is CONTROLLED: it shows `isOn` and asks for the other value through `onChange`; the
 caller decides (a permission prompt can say no) and passes the answer back in. So the switch
 never shows a state the app doesn't hold. VoiceOver hears one switch: the label, its on/off
 value, the subline as the hint.
 */
public struct SoftToggleRow: View {
  private let theme: KTheme
  private let systemImage: String?
  private let label: String
  private let subtitle: String?
  private let isOn: Bool
  private let divider: Bool
  private let onChange: (Bool) -> Void

  /// - Parameters:
  ///   - systemImage: the SF Symbol in the box; nil for a row without one (Match system)
  ///   - isOn: the state the app holds
  ///   - onChange: the switch was flipped to this value
  public init(theme: KTheme, systemImage: String?, label: String, subtitle: String? = nil, isOn: Bool, divider: Bool = true, onChange: @escaping (Bool) -> Void) {
    self.theme = theme
    self.systemImage = systemImage
    self.label = label
    self.subtitle = subtitle
    self.isOn = isOn
    self.divider = divider
    self.onChange = onChange
  }

  public var body: some View {
    let binding = Binding<Bool>(get: { isOn }, set: { onChange($0) })
    HStack(alignment: .center, spacing: 12) {
      if let systemImage {
        SoftRowIcon(theme: theme, systemImage: systemImage)
          .frame(width: 28, height: 28)
          .background(RoundedRectangle(cornerRadius: 8, style: .circular).fill(theme.sf))
          .accessibilityHidden(true)
      }
      VStack(alignment: .leading, spacing: 0) {
        Toggle(isOn: binding) {
          VStack(alignment: .leading, spacing: 4) {
            Text(label)
              .kText(.rowLabel)
              .foregroundStyle(theme.ink)
              .fixedSize(horizontal: false, vertical: true)
            if let subtitle, !subtitle.isEmpty {
              Text(subtitle)
                .kText(.subtext)
                .foregroundStyle(theme.mute)
                .fixedSize(horizontal: false, vertical: true)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
        .toggleStyle(KToggleStyle(theme: theme))
        .padding(.vertical, 12)
        .accessibilityHint(subtitle ?? "")
        if divider {
          SoftDivider(theme: theme)
        }
      }
    }
    .padding(.horizontal, 14)
  }
}

/*
 AN EDIT-PROFILE ROW (H:92-93): no icon box. Set in 14 from each side; the words 14 above and
 below, over the row's 1pt divider (none on the last row), 10 between the parts. The label
 (system 400 15, ink) takes the room, then the value (system 500 14, mute, one line, shrinking a
 little before it truncates), then the chevron when the row opens something. A display-only row
 (the birthday) has no chevron and is no button: the caller doesn't wrap it in one, and VoiceOver
 reads it as plain text. At the accessibility sizes the value goes under the label.
 */
public struct SoftPlainRow: View {
  private let theme: KTheme
  private let label: String
  private let value: String
  private let chevron: Bool
  private let divider: Bool

  @Environment(\.dynamicTypeSize) private var typeSize

  public init(theme: KTheme, label: String, value: String, chevron: Bool = true, divider: Bool = true) {
    self.theme = theme
    self.label = label
    self.value = value
    self.chevron = chevron
    self.divider = divider
  }

  public var body: some View {
    let stacked = typeSize.isAccessibilitySize
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: stacked ? .top : .center, spacing: 10) {
        if stacked {
          VStack(alignment: .leading, spacing: 4) {
            labelText
            valueText.multilineTextAlignment(.leading)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        } else {
          labelText
            .layoutPriority(1)
          Spacer(minLength: 0)
          valueText
        }
        if chevron {
          SoftChevron(theme: theme)
        }
      }
      .padding(.vertical, 14)
      if divider {
        SoftDivider(theme: theme)
      }
    }
    .padding(.horizontal, 14)
    .contentShape(Rectangle())
    .accessibilityElement(children: .combine)
  }

  private var labelText: some View {
    Text(label)
      .kText(.rowLabel)
      .foregroundStyle(theme.ink)
      .fixedSize(horizontal: false, vertical: true)
  }

  private var valueText: some View {
    Text(value)
      .kText(.rowValue)
      .foregroundStyle(theme.mute)
      .lineLimit(typeSize.isAccessibilitySize ? 3 : 1)
      .minimumScaleFactor(0.85)
      .multilineTextAlignment(.trailing)
  }
}

/*
 THE EXITS' RED. 10a has no danger colour, and the postmark red alone (KBrand.postRed) is only
 3.8:1 on the light groups. So the red is the postmark walked a quarter of the way toward the
 theme's own ink: #B03D3A on the light themes, #E26F6A on Midnight, past 4.5:1 on soft, sf and bg
 in all four (src/screens/settings/settings-model.ts dangerInk mixes the same tokens the same way
 for the React Native page, and its test checks the contrast against themes.json). Should
 themes.json gain a danger token, this one line takes it.
 */
public extension KTheme {
  /// The red of Settings' two exits (sign out, delete account), legible in this theme.
  var danger: Color {
    KBrand.postRed.mix(with: ink, by: 0.25, in: .device)
  }
}
