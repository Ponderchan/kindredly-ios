// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE NOTES HEADER (10a, H:50 and H:337, the fused "shrink, then hide" variant) and the date chip
 that takes its place (H:111).

   NOTES                                  [▤ Card] [▦]      74 tall at rest, title 22
   NOTES                                     [▤] [▦]        48 tall by y≈43, title 15, the
                                                            view label gone by y≈25
   (gone)       ( [☺] OCT 14 )                              hidden past 120 while scrolling down

 Shrink: height clamp(48, 74 − 0.6·y, 74); the title's size clamp(15, 22 − 0.22·y, 22), drawn at 22
 (.pageTitle, system bold, the size all four tabs' titles share, owner 2026-10-20) and scaled so the font isn't re-set every frame; the view button's label collapses (its width from
 its own size to 0 by y = 30, opacity 1 − y/25, the gap 6 − 0.3·y), so a long translation shrinks
 away rather than being cut at the mock's fixed 60. No rule under it (owner). The title is a
 header for VoiceOver and fits a long name (NOTIZEN, CATATAN) by shrinking to .7.

 Hide: once past 120, a reader's scroll down of more than 3pt slides it up (−110%) over .3s
 cubic-bezier(.3,.8,.3,1); a scroll back up of more than 3pt, or anything above 120, brings it
 back. Only a reader's scroll moves it (KNotesScrollState follows the scroll phase): a jump to a
 calendar day lands its card under the header, not under a header that ran away. Under Reduce
 Motion it fades instead. While VoiceOver runs it never hides: its two buttons are the way to the
 views and the calendar.

 The date chip: ink with the page colour's words, the day's group and "OCT 14", centred 8 below
 the status bar, shown only while the header is hidden (fading in and dropping 16pt over .3s),
 never touchable and silent to VoiceOver. Its day is the topmost note on screen.

 The per-frame values are read only here (KScrollModel, KNotesScrollState), never by the screen,
 so a scroll frame redraws the header and the chip and nothing else. Dynamic Type is capped at
 .accessibility1 in both, so the 74pt header and the 34pt buttons hold their shape.
 */

/// Whether the header is hidden and which note the chip shows. Fed by the screen every scroll frame
/// (the offset, clamped to where the list can rest so a bounce at either end never counts), with
/// the scroll phase, VoiceOver and the visible notes; it publishes only when one of its two answers
/// changes, and only the header and the chip observe it.
///
/// The hide rule is the mock's (H:337), with a 3pt hysteresis measured from the furthest point the
/// list reached in its current direction, so a trembling finger never flashes the header. A scroll
/// TS asked for (a calendar day, the tab pressed again) moves nothing: the furthest point is simply
/// re-based there, so the next drag starts from where it landed.
public final class KNotesScrollState: ObservableObject {
  /// hidden past this offset, while scrolling down
  public static let hideAfter: CGFloat = 120
  /// how far the list must move against its direction before the header changes
  public static let hysteresis: CGFloat = 3

  @Published public private(set) var headerHidden = false
  /// the date chip is awake: the list moved in the last 1.2s (it fades when the reader stops, so it
  /// never sits over the words being read; owner, 2026-10-20)
  @Published public private(set) var chipAwake = false
  /// where the header starts hiding: Card's 120; Grid and List hide at 60 (they hold more on a
  /// screen, so a short diary never scrolled far enough; owner, 2026-10-20)
  var hideAt: CGFloat = KNotesScrollState.hideAfter
  private var sleep: DispatchWorkItem?
  /// the topmost note on screen (the date chip's day)
  @Published public private(set) var topNoteId: String?

  private var offset: CGFloat = 0
  /// the furthest point reached in the current direction
  private var anchor: CGFloat = 0
  private var phase: ScrollPhase = .idle
  private var voiceOver = false

  public init() {}

  private var readerScrolling: Bool {
    phase == .interacting || phase == .decelerating || phase == .tracking
  }

  /// A finger is on the list, or it is still coasting from one (a settle pass must not fight it).
  var isReaderScrolling: Bool { readerScrolling }

  /// One frame's offset (contentOffset.y + contentInsets.top, clamped to 0...the end).
  func scrolled(to y: CGFloat) {
    if abs(y - offset) > 0.5 { wake() }
    offset = y
    apply()
  }

  private func wake() {
    if !chipAwake { chipAwake = true }
    sleep?.cancel()
    let item = DispatchWorkItem { [weak self] in
      guard let self, !self.readerScrolling else { return }
      self.chipAwake = false
    }
    sleep = item
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2, execute: item)
  }

  func phaseChanged(_ next: ScrollPhase) {
    phase = next
    // the finger let go and the list came to rest: start the chip's 1.2s from now
    if next == .idle { wake() }
    apply()
  }

  func setVoiceOver(_ on: Bool) {
    voiceOver = on
    apply()
  }

  /// The topmost note on screen, worked out by the screen; nil (none counted as visible, as in the
  /// moment a layout changes) keeps the one before, so the chip never blinks out over a long page.
  func visible(top: String?) {
    guard let top, top != topNoteId else { return }
    topNoteId = top
  }

  /// Back to shown (the empty state, a new layout).
  func show() {
    if headerHidden { headerHidden = false }
  }

  private func apply() {
    var hide = headerHidden
    let y = offset
    if voiceOver || y < hideAt {
      hide = false
      anchor = y
    } else if !readerScrolling {
      // a scroll nobody's finger made: re-base, change nothing
      anchor = y
    } else if hide {
      // hidden: follow the list down; back up by more than 3 brings it back
      if y > anchor { anchor = y } else if anchor - y > Self.hysteresis { hide = false; anchor = y }
    } else {
      // shown: follow the list up; down by more than 3 hides it
      if y < anchor { anchor = y } else if y - anchor > Self.hysteresis { hide = true; anchor = y }
    }
    if hide != headerHidden { headerHidden = hide }
  }
}

extension KMotion {
  /// the Notes header hiding and coming back: transform .3s cubic-bezier(.3,.8,.3,1) (H:50)
  public static let notesHeader = Animation.timingCurve(0.3, 0.8, 0.3, 1, duration: 0.3)
  /// the date chip: opacity and transform .3s (H:111)
  public static let notesChip = Animation.easeInOut(duration: 0.3)
  /// the calendar button's fill: background .2s (H:347)
  public static let notesCalendarFill = Animation.easeInOut(duration: 0.2)
  /// the calendar overlay coming and going (ours: the mock has none): .2s
  public static let notesCalendar = Animation.easeOut(duration: 0.2)
}

/// The header, scroll-driven. Its height and title follow the offset; it hides by KNotesScrollState.
struct KNotesHeaderBar: View {
  static let fullHeight: CGFloat = 74
  static let title = KTextStyle.pageTitle
  static let justYou = KTextStyle.mono(11, .medium, tracking: 0.12)

  let theme: KTheme
  let strings: KNotesStrings
  let layout: KNoteLayout
  let calendarOpen: Bool
  let recentGroups: [KMoodGroup]
  /// the empty state's header: the title and JUST YOU, never moving
  let empty: Bool
  @ObservedObject var chrome: KScrollModel
  @ObservedObject var state: KNotesScrollState
  let actions: KNotesActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let y = empty ? 0 : max(0, chrome.offset)
    let height = min(Self.fullHeight, max(48, Self.fullHeight - 0.6 * y))
    let scale = min(22, max(15, 22 - 0.22 * y)) / 22
    let hidden = !empty && state.headerHidden
    HStack(alignment: .center, spacing: 12) {
      Text(strings.title)
        .kText(Self.title)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .scaleEffect(scale, anchor: .leading)
        .accessibilityAddTraits(.isHeader)
      Spacer(minLength: 0)
      if empty {
        Text(strings.justYou)
          .kText(Self.justYou)
          .foregroundStyle(theme.sub)
          .lineLimit(1)
      } else {
        HStack(spacing: 8) {
          KNotesViewButton(theme: theme, layout: layout, label: strings.viewLabel(layout), a11yName: strings.viewA11y, y: y) {
            actions.onCycleView()
          }
          KNotesCalendarButton(theme: theme, open: calendarOpen, groups: recentGroups, a11yName: strings.calendarA11y) {
            actions.onCalendarToggle(!calendarOpen)
          }
        }
      }
    }
    .padding(.horizontal, 22)
    .frame(height: height)
    .frame(maxWidth: .infinity)
    .background(theme.bg)
    .offset(y: hidden && !reduceMotion ? -height * 1.1 : 0)
    .opacity(hidden && reduceMotion ? 0 : 1)
    .animation(reduceMotion ? .easeInOut(duration: 0.3) : KMotion.notesHeader, value: hidden)
    .allowsHitTesting(!hidden)
    .accessibilityHidden(hidden)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}

/// The view button: 34 round like the calendar beside it, the current view's icon only (owner,
/// 2026-10-20: no word next to it). A tap cycles Card, Grid, List; the icon swaps with a quick
/// blur-and-scale so the change reads. VoiceOver still hears the view's name as the value. `y` (the
/// scroll) is kept for the header's call; the old label used it to collapse.
struct KNotesViewButton: View {
  let theme: KTheme
  let layout: KNoteLayout
  let label: String
  let a11yName: String
  let y: CGFloat
  let action: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    SwiftUI.Button(action: action) {
      // the card drawing sits smaller in its square than grid's and list's: drawn at 21 it reads the
      // same size beside them (owner, 2026-10-20)
      KLineIcon(layout.glyph, size: layout == .card ? 21 : 18, lineWidth: 2, color: theme.ink)
        .frame(width: 21, height: 21)
        .id(layout)
        .transition(reduceMotion ? .opacity : .scale(scale: 0.6).combined(with: .opacity))
        .frame(width: 34, height: 34)
        // (owner, 10-20: no black rings) a soft round key, as iOS draws one
        .background(Circle().fill(theme.soft))
        .contentShape(Circle())
        .animation(.spring(duration: 0.28, bounce: 0.25), value: layout)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(a11yName)
    .accessibilityValue(label)
  }
}

/// The calendar button: 34 round, the calendar drawing with the month's three latest days in their
/// groups' ink (empty slots in line) in one row inside the page, measured on the drawing's 24 grid
/// so they scale with it (six in two rows, placed in points, spilled over the outline; the owner's
/// card layouts draw three, 2026-10-18), lav while the overlay is open (H:50, H:181, H:347). On a dark
/// theme the squares take their groups' pale fill instead: the button's face is dark there (sf, or
/// lav while open), and Tired's and Low's inks (#3A34D6, #3B6E9B) sank into it like empty slots.
struct KNotesCalendarButton: View {
  let theme: KTheme
  let open: Bool
  let groups: [KMoodGroup]
  let a11yName: String
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      ZStack(alignment: .topLeading) {
        KLineIcon(.noteCalendar, size: 20, lineWidth: 1.8, color: theme.ink)
        // the drawing's own three slots on its 24 grid (x 5 / 10.2 / 15.4, y 13), filled with the moods
        HStack(spacing: Self.gap * Self.unit) { square(0); square(1); square(2) }
          .offset(x: 5 * Self.unit, y: 13 * Self.unit)
      }
      .frame(width: 20, height: 20)
      .frame(width: 34, height: 34)
      // (owner, 10-20: no black rings) soft, lav while the calendar is open
      .background(Circle().fill(open ? theme.lav : theme.soft))
      .contentShape(Circle())
      .animation(KMotion.notesCalendarFill, value: open)
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(a11yName)
    .accessibilityAddTraits(open ? .isSelected : [])
  }

  /// points per unit of the drawing's 24 grid at 20pt, and the squares' size and gap in units
  private static let unit: CGFloat = 20 / 24
  private static let square: CGFloat = 3.6
  private static let gap: CGFloat = 1.6

  private func square(_ i: Int) -> some View {
    RoundedRectangle(cornerRadius: 1 * Self.unit, style: .circular)
      .fill(i < groups.count ? (theme.isDark ? groups[i].mood.fill : groups[i].mood.ink) : theme.line)
      .frame(width: Self.square * Self.unit, height: Self.square * Self.unit)
  }
}

/// The floating date chip: the topmost note's day, while the header is hidden, with its mood icon
/// (any of the 34, at 13pt: the smallest a face is drawn).
struct KNotesDateChip: View {
  static let label = KTextStyle.mono(11, .semibold, tracking: 0.12)

  let theme: KTheme
  /// the chip's day, colour and mood icon (an art key) for a note id (nil for an id it doesn't know)
  let lookup: (String) -> (label: String, group: KMoodGroup, icon: String)?
  @ObservedObject var state: KNotesScrollState

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let info = state.topNoteId.flatMap(lookup)
    let shown = state.headerHidden && state.chipAwake && info != nil
    HStack(spacing: 8) {
      KMoodChip(group: info?.group ?? .calm, icon: info?.icon, metrics: .chip)
      Text(info?.label ?? "")
        .kText(Self.label)
        .foregroundStyle(theme.bg)
        .lineLimit(1)
    }
    .padding(.vertical, 6)
    .padding(.leading, 7)
    .padding(.trailing, 12)
    .background(Capsule().fill(theme.ink))
    .opacity(shown ? 1 : 0)
    .offset(y: shown || reduceMotion ? 0 : -16)
    .animation(KMotion.notesChip, value: shown)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}
