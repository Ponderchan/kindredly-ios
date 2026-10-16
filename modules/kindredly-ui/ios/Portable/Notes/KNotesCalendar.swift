// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE NOTES CALENDAR (10a, H:113, H:179-181), an overlay over the notes:

   ░░░░░░░░░░░░░░ dim (ink at .18): a tap closes ░░░░░░░░░░░░░░░░░░░░░░░   Midnight: black at .35
     ┌───────────────────────────────────────────────┐   58 under the status bar,
     │  ‹            OCTOBER 2026               ›    │   16 from each side
     │  S    M    T    W    T    F    S              │   the language's letters, from its first day
     │            1    2    3    4    5              │
     │  6    7   [8]   9 ...                         │   a day with pages on its group's fill
     │ ───────────────────────────────────────────── │
     │  [☺]3 [☺]1 [☺]0 [☺]2               6 NOTES    │
     └───────────────────────────────────────────────┘   2 ln outline, corners 22, hard 5/5 ln

 One month at a time, and TS's: it pages through the 'month' command (KNotesDriver.month), one
 month record at a time, so no year of day records rides on props. The chevrons ask TS for the
 month before or after (actions.onCalendarMonth ±1); TS keeps them in bounds — never past this
 month, never before the first month with a page — and says so with canPrev / canNext, drawn faint
 and dimmed for VoiceOver when off. The title, the letters, every count and every VoiceOver line
 are TS's words; the day numbers too.

 A day with pages is its newest page's group fill with the number in the group's ink at 600, and a
 tap on it goes to that page (actions.onDayPick: the screen closes the overlay and the list goes
 to that note). A day without pages is the number in ink (faint in the future), not tappable;
 today has a 2pt ring inside its cell (ln, or the fixed dark ink on a filled day, where Midnight's
 pale ln would vanish). The footer: a legend of the four groups with this month's counts, and
 "N NOTES".

 VoiceOver: the overlay is one modal container (the notes under the dim can't be reached), the dim
 is a Close button, the escape gesture (two-finger Z) closes it, and focus moves to the month's
 title when it opens. It fades in over .2s from .97 (a fade alone under Reduce Motion: the screen
 picks the transition).
 */

/// One day of a calendar month, as TS built it.
public struct KNotesDay: Identifiable, Equatable, Sendable {
  public let n: Int
  /// the day's number as drawn
  public let label: String
  /// the group of the day's newest page; nil for a day without pages
  public let group: KMoodGroup?
  /// where a tap goes: the day's newest page
  public let targetId: String?
  public let future: Bool
  public let today: Bool
  public let a11yLabel: String

  public var id: Int { n }

  public init(n: Int, label: String, group: KMoodGroup?, targetId: String?, future: Bool, today: Bool, a11yLabel: String) {
    self.n = n
    self.label = label
    self.group = group
    self.targetId = targetId
    self.future = future
    self.today = today
    self.a11yLabel = a11yLabel
  }
}

/// One month of the calendar, as TS built it (notes-model buildMonth).
public struct KNotesMonth: Equatable, Sendable {
  public let key: String
  /// "OCTOBER 2026", "2026年10月"
  public let title: String
  /// blank cells before the 1st (from the language's first weekday)
  public let lead: Int
  public let days: [KNotesDay]
  /// this month's count per group, in KMoodGroup.allCases order, as drawn
  public let counts: [String]
  /// "6 NOTES"
  public let footer: String
  public let footerA11y: String
  /// "Calm, 3 notes", in KMoodGroup.allCases order
  public let legendA11y: [String]
  public let canPrev: Bool
  public let canNext: Bool

  public init(key: String, title: String, lead: Int, days: [KNotesDay], counts: [String], footer: String, footerA11y: String, legendA11y: [String], canPrev: Bool, canNext: Bool) {
    self.key = key
    self.title = title
    self.lead = max(0, min(6, lead))
    self.days = days
    self.counts = counts
    self.footer = footer
    self.footerA11y = footerA11y
    self.legendA11y = legendA11y
    self.canPrev = canPrev
    self.canNext = canNext
  }

  /// The grid's cells, rows of seven: blanks before the 1st, the days, blanks to fill the last row.
  var rows: [[KNotesDay?]] {
    var cells: [KNotesDay?] = Array(repeating: nil, count: lead) + days.map { Optional($0) }
    while cells.count % 7 != 0 { cells.append(nil) }
    return stride(from: 0, to: cells.count, by: 7).map { Array(cells[$0..<min($0 + 7, cells.count)]) }
  }
}

struct KNotesCalendar: View {
  static let title = KTextStyle.mono(11, .semibold, tracking: 0.14)
  static let weekday = KTextStyle.mono(10, .semibold)
  static let count = KTextStyle.mono(11, .semibold)
  static let dayOn = KTextStyle.system(13, .semibold)
  static let dayOff = KTextStyle.system(13)
  static let dim = KBrand.inkOnBrand.opacity(0.18)
  /// Midnight's dim. The fixed dark ink at .18 comes out lighter than Midnight's page (#121020 on
  /// #0F0E1C), so nothing dimmed. Black at .35 fades the notes under the panel a little harder
  /// than Classic's dim does, by the same margin as KDim's black under the composer (a near-black
  /// page can't itself step down): ink against the page falls from 15.4:1 to 6.7:1 (Classic: 16.6
  /// to 11.5).
  static let dimDark = Color.black.opacity(0.35)

  let theme: KTheme
  let strings: KNotesStrings
  let topInset: CGFloat
  @ObservedObject var driver: KNotesDriver
  let actions: KNotesActions

  @AccessibilityFocusState private var titleFocused: Bool

  var body: some View {
    ZStack(alignment: .top) {
      (theme.isDark ? Self.dimDark : Self.dim)
        .ignoresSafeArea()
        .contentShape(Rectangle())
        .onTapGesture { actions.onCalendarToggle(false) }
        .accessibilityElement()
        .accessibilityLabel(strings.close)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { actions.onCalendarToggle(false) }

      if let month = driver.month {
        panel(month)
          .padding(.horizontal, 16)
          .padding(.top, topInset + 58)
          .onAppear(perform: focusTitle)
      }
    }
    // one container, so the modal trait and the escape belong to the overlay as a whole (on a bare
    // ZStack SwiftUI hands them to each child, and the notes under the dim stay reachable)
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(.isModal)
    .accessibilityAction(.escape) { actions.onCalendarToggle(false) }
  }

  /// VoiceOver starts on the month's title when the panel opens, not on the header's calendar
  /// button the modal now hides. A beat after it appears, once it is in the accessibility tree.
  private func focusTitle() {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { titleFocused = true }
  }

  private func panel(_ month: KNotesMonth) -> some View {
    VStack(spacing: 12) {
      HStack(alignment: .center, spacing: 0) {
        chevron(.chevronLeft, enabled: month.canPrev, label: strings.prevMonth) { actions.onCalendarMonth(-1) }
        Spacer(minLength: 8)
        Text(month.title)
          .kText(Self.title)
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .accessibilityAddTraits(.isHeader)
          .accessibilityFocused($titleFocused)
        Spacer(minLength: 8)
        chevron(.chevronRight, enabled: month.canNext, label: strings.nextMonth) { actions.onCalendarMonth(1) }
      }
      .padding(.horizontal, 4)

      HStack(spacing: 4) {
        ForEach(Array(strings.weekdays.prefix(7).enumerated()), id: \.offset) { _, letter in
          Text(letter)
            .kText(Self.weekday)
            .foregroundStyle(theme.faint)
            .lineLimit(1)
            .frame(maxWidth: .infinity)
        }
      }
      .accessibilityHidden(true)

      VStack(spacing: 4) {
        ForEach(Array(month.rows.enumerated()), id: \.offset) { _, row in
          HStack(spacing: 4) {
            ForEach(0..<7, id: \.self) { i in
              cell(i < row.count ? row[i] : nil)
            }
          }
        }
      }

      footer(month)
    }
    .padding(.top, 16)
    .padding(.horizontal, 14)
    .padding(.bottom, 14)
    .background {
      KStickerBackground(shape: RoundedRectangle(cornerRadius: 22, style: .circular), fill: theme.sf, stroke: theme.ln, lineWidth: 2, shadow: theme.ln, shadowOffset: 5)
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  @ViewBuilder
  private func cell(_ day: KNotesDay?) -> some View {
    let shape = RoundedRectangle(cornerRadius: 11, style: .circular)
    if let day {
      let ink: Color = day.group?.mood.ink ?? (day.future ? theme.faint : theme.ink)
      let face = Text(day.label)
        .kText(day.group != nil ? Self.dayOn : Self.dayOff)
        .foregroundStyle(ink)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .frame(maxWidth: .infinity)
        .frame(height: 38)
        .background { shape.fill(day.group?.mood.fill ?? .clear) }
        .overlay {
          // on a filled day the ring is the pale keys' fixed dark ink: Midnight's ln is pale and
          // vanished on the group fills (~1.1:1); the light themes' ln is that same ink
          if day.today { shape.strokeBorder(day.group == nil ? theme.ln : KBrand.inkOnBrand, lineWidth: 2) }
        }
      if let target = day.targetId {
        SwiftUI.Button {
          actions.onDayPick(target)
        } label: {
          face.contentShape(shape)
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityLabel(day.a11yLabel)
      } else {
        face
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(day.a11yLabel)
      }
    } else {
      Color.clear
        .frame(maxWidth: .infinity)
        .frame(height: 38)
        .accessibilityHidden(true)
    }
  }

  private func footer(_ month: KNotesMonth) -> some View {
    let legend = HStack(spacing: 10) {
      ForEach(Array(KMoodGroup.allCases.enumerated()), id: \.offset) { i, group in
        HStack(spacing: 5) {
          // the legend names the four groups: always their group icons, never a page's face
          KMoodChip(group: group, icon: group.iconKey, metrics: .legend)
          Text(i < month.counts.count ? month.counts[i] : "")
            .kText(Self.count)
            .foregroundStyle(theme.sub)
            .lineLimit(1)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(i < month.legendA11y.count ? month.legendA11y[i] : "")
      }
    }
    let total = Text(month.footer)
      .kText(.monoMeta)
      .foregroundStyle(theme.mute)
      .lineLimit(1)
      .accessibilityLabel(month.footerA11y)
    return ViewThatFits(in: .horizontal) {
      HStack(alignment: .center, spacing: 8) {
        legend
        Spacer(minLength: 0)
        total
      }
      VStack(alignment: .leading, spacing: 8) {
        legend
        total
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.top, 10)
    .padding(.horizontal, 4)
    .overlay(alignment: .top) {
      Rectangle().fill(theme.line).frame(height: 1)
    }
  }

  /// A month chevron: 18 at 2.2, ink, or faint and disabled; a 44pt target that takes no room.
  private func chevron(_ glyph: KLineGlyph, enabled: Bool, label: String, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      KLineIcon(glyph, size: 18, lineWidth: 2.2, color: enabled ? theme.ink : theme.faint)
        .padding(13)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(-13)
    .disabled(!enabled)
    .accessibilityLabel(label)
  }
}
