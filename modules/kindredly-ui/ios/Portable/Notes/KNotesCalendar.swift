// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE NOTES CALENDAR (10a, H:113, H:179-181), an overlay over the notes:

   ░░░░░░░░░░░░░░ dim (ink at .18): a tap closes ░░░░░░░░░░░░░░░░░░░░░░░   Midnight: black at .35
     ┌───────────────────────────────────────────────┐   58 under the status bar,
     │  October 2026                    ‹   ›   (✕)  │   16 from each side
     │  S    M    T    W    T    F    S              │   the language's letters, from its first day
     │            1    2    3    4    5              │
     │  6    7    8    9 ...                         │   the number small on top; under it,
     │  ○    ○   (☺)   ○                             │   a round slot: a day's face, or empty
     └───────────────────────────────────────────────┘   corners 28, a hairline, a light shadow

 One month at a time, and TS's: it pages through the 'month' command (KNotesDriver.month), one
 month record at a time, so no year of day records rides on props. The chevrons ask TS for the
 month before or after (actions.onCalendarMonth ±1); TS keeps them in bounds — never past this
 month, never before the first month with a page — and says so with canPrev / canNext, drawn faint
 and dimmed for VoiceOver when off. The title, the letters, every count and every VoiceOver line
 are TS's words; the day numbers too.

 Every cell is the day's number (system 13) over a 32pt round slot, so the numbers sit on one line
 like Apple's calendars. A day with pages fills the slot with its NEWEST page's mood icon (the same
 face the cards draw, on its group's tint, round; owner 10-20: "直接心情 icon 放在日历里"), and a tap
 on it goes to that page (actions.onDayPick: the screen closes the overlay and the list goes to that
 note). A past day without pages is a quiet empty circle, a future day the number alone (faint),
 neither tappable; today's number is white on a small accent capsule (APPLE'S OWN MONTH below). No
 footer (owner 10-20: the per-mood counts and "N NOTES" are gone; the month record still carries
 them).

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
  /// that page's mood icon (an art key: "mood-sleepy", "mood-group-low"); "" draws the group's icon
  public let icon: String
  /// where a tap goes: the day's newest page
  public let targetId: String?
  public let future: Bool
  public let today: Bool
  public let a11yLabel: String

  public var id: Int { n }

  public init(n: Int, label: String, group: KMoodGroup?, icon: String = "", targetId: String?, future: Bool, today: Bool, a11yLabel: String) {
    self.n = n
    self.label = label
    self.group = group
    self.icon = icon
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

/* APPLE'S OWN MONTH (owner, 2026-11-13, of the panel above: "这个日历点开感觉又有点山寨了 不想苹果设计师
   的水准"). What read as a knock-off: a typewriter title in spaced capitals, chevrons and a ✕ in three
   weights, square tinted tiles in a field of bare numbers, today boxed in a heavy indigo frame.
   Now it is set as iOS sets a month (Calendar, Fitness's history):
   - the title in sentence case, system 20 semibold, on the left ("November 2026"; TS sends it in
     capitals, so only its first letter stays up: "Noviembre de 2026", "2026年11月" as it is);
   - the month chevrons the system's, in the accent, faint when there is nowhere to go; the ✕ the
     system's close button (a soft round key);
   - the weekday letters system 12 semibold in the theme's mute;
   - every day the same column: its number (system 13), and under it a round slot. A day with
     pages wears its newest page's face in the slot, round now (the cards' face on its group's
     tint, clipped to a circle); a past day without one is a quiet empty circle, so the month
     reads as a rhythm, as Fitness's empty rings do; the future has no slot. Today's number is white
     on a small accent capsule (Calendar's own mark for today), no frame round the cell;
   - the card: corners 28, a hairline and a light soft shadow over the dim. */
struct KNotesCalendar: View {
  static let title = KTextStyle.system(20, .semibold)
  static let weekday = KTextStyle.system(12, .semibold)
  static let dayOn = KTextStyle.system(13, .semibold)
  static let dayOff = KTextStyle.system(13, .medium)
  /// a cell: the number's 20 line over the 32 round slot
  static let cellHeight: CGFloat = 56
  /// a week wholly ahead: the numbers' line and a little air
  static let aheadRow: CGFloat = 34
  /// the round slot under a day's number, and its face
  static let slot: CGFloat = 32
  static let slotFace: CGFloat = 20
  /// a tall day (the month as the Duo's page): the cards' own size
  static let slotRoomy: CGFloat = 40
  static let slotRoomyFace: CGFloat = 24
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
  /* A PAGE OF ITS OWN (iPhone Duo's inner screen; KNotesScreen, THE SPREAD): the month stands on
     the left page for good, in its middle, with no dim under it and no way to close it; a day
     with pages still takes the list on the right to that page. */
  var page = false

  @AccessibilityFocusState private var titleFocused: Bool

  @ViewBuilder var body: some View {
    if page {
      if let month = driver.month {
        /* THE MONTH AS THE PAGE (2026-11-12, walking the Duo: a phone-sized card in the middle of
           the left page, a third of it empty above and below). It grows to the page: as wide as the
           page allows (520 at most), its days taller to fill the height, never taller than a day is
           wide by a quarter, with the cards' own mood face once there is room for it. Flat, on a
           hairline: it is the page, not a sheet over one. Nothing new is said (the owner took the
           counts and the footer off the month, 10-20). */
        GeometryReader { geo in
          let width = min(Self.pageMaxWidth, geo.size.width - 2 * Self.pageMargin)
          let dayWidth = (width - 2 * 14 - 6 * 4) / 7
          let rows = CGFloat(max(1, month.rows.count))
          let room = geo.size.height - topInset - 2 * Self.pageMargin
          let fill = ((room - Self.panelChrome) / rows - 4).rounded(.down)
          let cell = min((dayWidth * 1.25).rounded(.down), max(Self.cellHeight, fill))
          panel(month, cellHeight: cell)
            .frame(width: max(0, width))
            .frame(width: geo.size.width, height: geo.size.height)
            .padding(.top, topInset / 2)
        }
      } else {
        Color.clear
      }
    } else {
      overlayBody
    }
  }

  /// the month as the left page: its widest, its margin from the page's edges, and what the panel
  /// takes besides its rows (the title row, the weekdays, the paddings and spacings between them)
  static let pageMaxWidth: CGFloat = 520
  static let pageMargin: CGFloat = 28
  static let panelChrome: CGFloat = 16 + 44 + 12 + 16 + 12 + 14

  private var overlayBody: some View {
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

  private func panel(_ month: KNotesMonth, cellHeight: CGFloat = KNotesCalendar.cellHeight) -> some View {
    VStack(spacing: 12) {
      HStack(alignment: .center, spacing: 2) {
        Text(Self.sentence(month.title))
          .kText(Self.title)
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .accessibilityAddTraits(.isHeader)
          .accessibilityFocused($titleFocused)
        Spacer(minLength: 8)
        chevron(left: true, enabled: month.canPrev, label: strings.prevMonth) { actions.onCalendarMonth(-1) }
        chevron(left: false, enabled: month.canNext, label: strings.nextMonth) { actions.onCalendarMonth(1) }
        // (owner, 10-20) a way out you can see: the system's close button, a soft round key
        if !page {
          SwiftUI.Button {
            actions.onCalendarToggle(false)
          } label: {
            Image(systemName: "xmark")
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(theme.mute)
              .frame(width: 30, height: 30)
              .background(Circle().fill(theme.soft2))
              .frame(width: 44, height: 44)
              .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .padding(.trailing, -7)
          .accessibilityLabel(strings.close)
        }
      }
      .padding(.leading, 6)

      HStack(spacing: 4) {
        ForEach(Array(strings.weekdays.prefix(7).enumerated()), id: \.offset) { _, letter in
          Text(letter)
            .kText(Self.weekday)
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .frame(maxWidth: .infinity)
        }
      }
      .accessibilityHidden(true)

      VStack(spacing: 4) {
        ForEach(Array(month.rows.enumerated()), id: \.offset) { _, row in
          // a week wholly ahead has no slots: its row is the numbers' line alone, so the card
          // doesn't end in rows of empty space (the Duo's page keeps every row alike, to fill it)
          let ahead = !page && row.allSatisfy { $0 == nil || ($0?.future == true && $0?.group == nil) }
          HStack(spacing: 4) {
            ForEach(0..<7, id: \.self) { i in
              cell(i < row.count ? row[i] : nil, height: ahead ? Self.aheadRow : cellHeight)
            }
          }
        }
      }
    }
    .padding(.top, 16)
    .padding(.horizontal, 14)
    .padding(.bottom, 14)
    .background {
      // (owner, 10-20: no black edges) a card on a hairline over the dim, its shadow light; as the
      // left page, flat on the hairline (owner, 11-12: no thick shadows on cards)
      let shape = RoundedRectangle(cornerRadius: page ? 24 : 28, style: .continuous)
      if page {
        shape.fill(theme.sf).overlay(shape.strokeBorder(theme.line, lineWidth: 1))
      } else {
        shape
          .fill(theme.sf)
          .overlay(shape.strokeBorder(theme.line, lineWidth: 0.5))
          .shadow(color: .black.opacity(theme.isDark ? 0.4 : 0.08), radius: 20, y: 8)
      }
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  @ViewBuilder
  private func cell(_ day: KNotesDay?, height: CGFloat) -> some View {
    let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)
    // a tall day (the month as a page) has room for the cards' own face
    let roomy = height >= 66
    let slot = roomy ? Self.slotRoomy : Self.slot
    if let day {
      // today: white (the dark themes' page colour, on their light accent) on the accent capsule
      let ink: Color = day.today ? (theme.isDark ? theme.bg : Color.white) : (day.future ? theme.faint : theme.ink)
      let face = VStack(spacing: 4) {
        Text(day.label)
          .kText(day.group != nil || day.today ? Self.dayOn : Self.dayOff)
          .foregroundStyle(ink)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          .padding(.horizontal, day.today ? 6 : 0)
          .frame(minWidth: day.today ? 26 : nil)
          .frame(height: 20)
          .background { if day.today { Capsule().fill(theme.ind) } }
        // the future has no slot (the number alone, at the top of its cell)
        if day.group != nil || !day.future {
          ZStack {
            if let group = day.group {
              // the cards' own face on its tint, round; a page dated ahead (a wrong clock) stays faded
              KMoodChip(group: group, icon: day.icon, metrics: .init(size: slot, cornerRadius: slot / 2, faceSize: roomy ? Self.slotRoomyFace : Self.slotFace))
                .opacity(day.future ? 0.4 : 1)
            } else {
              // a past day without a page: a quiet empty circle (the light themes' coolest grey; on
              // a dark card soft is the card itself, so the step up)
              Circle().fill(theme.isDark ? theme.soft2 : theme.soft)
            }
          }
          .frame(width: slot, height: slot)
        }
      }
      .frame(maxWidth: .infinity)
      .frame(height: height, alignment: .top)
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
        .frame(height: height)
        .accessibilityHidden(true)
    }
  }

  /// A month chevron: the system's, 18 semibold in the accent, or faint and disabled; 40 × 44.
  private func chevron(left: Bool, enabled: Bool, label: String, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      Image(systemName: left ? "chevron.left" : "chevron.right")
        .font(.system(size: 18, weight: .semibold))
        .foregroundStyle(enabled ? theme.ind : theme.faint)
        .frame(width: 40, height: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .disabled(!enabled)
    .accessibilityLabel(label)
  }

  /// The month's title in sentence case: TS sends it in capitals ("NOVEMBER 2026", "NOVIEMBRE DE
  /// 2026"); only its first letter stays up. Scripts without case are as they were.
  static func sentence(_ title: String) -> String {
    let low = title.lowercased()
    guard let first = low.first else { return title }
    return first.uppercased() + low.dropFirst()
  }
}
