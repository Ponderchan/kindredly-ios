// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE NOTES HEADER (10a, H:50 and H:337, the fused "shrink, then hide" variant) and the date chip
 that takes its place (H:111).

   NOTES                                  ( ⌕  ▤  ▦ )      74 tall at rest, title 22
   NOTES                                  ( ⌕  ▤  ▦ )      48 tall by y≈43, title 15
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
 .accessibility1 in both, so the 74pt header and the 40pt buttons hold their shape.

 The keys (owner 2026-11-13, "想象你是苹果的设计水准"): one capsule of the tab bar's glass, 44 tall,
 each key 44 square with an SF Symbol, a lens under the finger (KGlassKeys; THE THREE KEYS below).

 SEARCH (owner's audit, 2026-11-10: no way to find an old page). A third key in the capsule, a
 magnifier, sits before the two; a tap swaps the row for the system's search row and raises the
 keyboard:

   NOTES                                 ( ⌕  ▤  ▦ )
   ( ⌕ search your pages            ⊗ )   Cancel     a rounded field on the theme's soft (corners
                                                     10, 36 tall), the magnifier and the ⊗ in mute
                                                     and faint, Cancel in ind at the system's 17

 TS filters the pages as the reader types (notes-model searchPages) and sends them as the list's
 notes; this row only holds the field and says what was typed. While it is up the header never
 hides (the field is the way out), the view and calendar keys are away, and Cancel — or escape —
 closes it. THE FIELD STAYS MOUNTED, clear and untouchable, while the title row shows: a focused
 SwiftUI field taken off screen is the crash KField.swift describes, so closing only blurs and
 empties it. Its handle (KFieldController) lives in the driver, as long as the view does. A bundle
 from before the audit sends no search words: no key, no row, the header as it was.
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
  /// the header is the search row: it never hides, as under VoiceOver
  private var searching = false

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

  /// The search row is up (or gone again): while it is, the header stays.
  func setSearching(_ on: Bool) {
    searching = on
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
    if voiceOver || searching || y < hideAt {
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
  /// false on a folding phone's inner screen, where the calendar has the left page to itself
  /// (KNotesScreen, THE SPREAD) and there is nothing for the button to open
  var showsCalendar = true
  /// the keys the rail drew instead (KRailTools: a folding phone's band); left out of this row
  var taken: Set<String> = []
  /// the latest day's mood this month: the calendar key's header colour
  var latestMood: KMoodGroup? = nil
  /// the empty state's header: the title and JUST YOU, never moving
  let empty: Bool
  /// the search row's words and whether it is up (KNotesSearch; no words: no search)
  let search: KNotesSearch
  /// the search field's handle (the driver's)
  let searchField: KFieldController
  @ObservedObject var chrome: KScrollModel
  @ObservedObject var state: KNotesScrollState
  let actions: KNotesActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  private var hasSearchKey: Bool { search.available && !taken.contains(KNotesTool.search) }
  private var hasViewKey: Bool { !taken.contains(KNotesTool.view) }
  private var hasCalendarKey: Bool { showsCalendar && !taken.contains(KNotesTool.calendar) }

  var body: some View {
    let y = empty ? 0 : max(0, chrome.offset)
    let height = min(Self.fullHeight, max(48, Self.fullHeight - 0.6 * y))
    let scale = min(22, max(15, 22 - 0.22 * y)) / 22
    // the search row takes the title row's place (never on the empty page: nothing to search)
    let searching = search.available && search.on && !empty
    let hidden = !empty && !searching && state.headerHidden
    ZStack {
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
        } else if hasSearchKey || hasViewKey || hasCalendarKey {
          // the keys share one glass capsule (KGlassKeys), as the tab bar's glass
          KGlassGroup(theme: theme) {
            if hasSearchKey {
              KNotesSearchButton(theme: theme, a11yName: search.button, solo: false) {
                actions.onSearch(true)
              }
            }
            if hasViewKey {
              KNotesViewButton(theme: theme, layout: layout, label: strings.viewLabel(layout), a11yName: strings.viewA11y, solo: false) {
                actions.onCycleView()
              }
            }
            if hasCalendarKey {
              KNotesCalendarButton(theme: theme, open: calendarOpen, latest: latestMood, a11yName: strings.calendarA11y, solo: false) {
                actions.onCalendarToggle(!calendarOpen)
              }
            }
          }
        }
      }
      .opacity(searching ? 0 : 1)
      .allowsHitTesting(!searching)
      .accessibilityHidden(searching)

      // always in the tree where there is search: a focused field is never taken off screen
      if search.available {
        KNotesSearchRow(theme: theme, search: search, active: searching, field: searchField, actions: actions)
          .opacity(searching ? 1 : 0)
          .allowsHitTesting(searching)
          .accessibilityHidden(!searching)
      }
    }
    .animation(.easeInOut(duration: 0.18), value: searching)
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

/// The header keys' names as the band's tools (KRailTools), in the order the band takes them: the
/// view and the calendar first (the two the owner named), the search last.
enum KNotesTool {
  static let view = "notes.view"
  static let calendar = "notes.calendar"
  static let search = "notes.search"
}

/* THE THREE KEYS (owner, 2026-11-13: "感觉有点山寨 … 想象你是苹果的设计水准 做这两个按钮 … 点的时候
   不能做出毛玻璃么 类似底导航那样的效果么"). They were three grey 40pt discs, each with a line
   drawing of our own (stacked cards with a hard shadow, a calendar with three tiny mood squares in
   it): three separate objects, three different hands. Now they are glass keys (KGlassKeys): in the
   header one capsule of the tab bar's glass holds all three, SF Symbols at a toolbar's size and
   weight, a lens swelling under the finger as the bar's does. The calendar key no longer carries
   three tiny mood squares (at 3.6pt they read as noise): its header takes the latest day's mood
   colour instead, as Calendar's icon wears its red. `solo`
   (the default) is each key on its own glass disc: the copies the Duo's band draws (KNotesScreen
   publishTools). */

/// The search key (owner's audit, 2026-11-10): a magnifier. A tap asks TS to open the search row.
struct KNotesSearchButton: View {
  let theme: KTheme
  let a11yName: String
  var solo = true
  let action: () -> Void

  var body: some View {
    KGlassKey(theme: theme, solo: solo, a11yLabel: a11yName, action: action) {
      KGlassSymbol("magnifyingglass")
    }
  }
}

/// The search row (see SEARCH at the top of the file): the rounded field with its magnifier and
/// its ⊗, and Cancel. `active` is whether it is the row on show; the field itself is always here.
/// It reports what the reader types (never what a setText put there); TS does the finding.
struct KNotesSearchRow: View {
  let theme: KTheme
  let search: KNotesSearch
  let active: Bool
  let field: KFieldController
  let actions: KNotesActions

  /// the field holds something: the ⊗ shows (the field's own words aren't published)
  @State private var hasText = false

  var body: some View {
    HStack(spacing: 12) {
      HStack(spacing: 6) {
        Image(systemName: "magnifyingglass")
          .font(.system(size: 15, weight: .medium))
          .foregroundStyle(theme.mute)
          .accessibilityHidden(true)
        KField(
          theme: theme,
          controller: field,
          placeholder: search.placeholder,
          axis: .horizontal,
          lines: nil,
          returnSends: false,
          autocapitalize: false,
          autocorrect: false,
          accessibilityLabel: search.placeholder,
          onChange: { text in
            hasText = !text.isEmpty
            actions.onSearchQuery(text)
          },
          // the keyboard's return key: the words are already found, the keyboard just goes
          onSubmit: { _ in field.blur() }
        )
        .frame(maxWidth: .infinity, alignment: .leading)
        if hasText {
          SwiftUI.Button {
            clear()
            field.focus()
          } label: {
            Image(systemName: "xmark.circle.fill")
              .font(.system(size: 16))
              .foregroundStyle(theme.faint)
              .frame(width: 36, height: 44)
              .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityLabel(search.clear)
          // a 44pt target in a 36pt field: its room is given back so the field keeps its height
          .padding(.vertical, -4)
          .padding(.trailing, -8)
        }
      }
      .padding(.leading, 10)
      .padding(.trailing, 8)
      .frame(minHeight: 36)
      .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(theme.soft))

      SwiftUI.Button {
        close()
      } label: {
        Text(search.cancel)
          .kText(.system(17))
          .foregroundStyle(theme.ind)
          .lineLimit(1)
          .fixedSize()
          .frame(minHeight: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
    }
    .accessibilityAction(.escape) { close() }
    .onChange(of: active) { _, on in
      if on {
        // the row has just come up: the keyboard with it
        field.focus()
      } else {
        // closed (Cancel, or TS closed it): the field lets go and starts empty next time
        field.blur()
        if !field.text.isEmpty { field.clear() }
        hasText = false
      }
    }
    .onAppear {
      // a view rebuilt while a search is on: the field shows what TS is filtering by, keyboard down
      if active, field.text.isEmpty, !search.query.isEmpty { field.setText(search.query) }
      hasText = !field.text.isEmpty
    }
  }

  /// the ⊗: an empty field (a setText isn't reported, so TS is told here)
  private func clear() {
    field.clear()
    hasText = false
    actions.onSearchQuery("")
  }

  /// Cancel: the keyboard down first, then TS takes the row away (and the list comes back)
  private func close() {
    field.blur()
    actions.onSearch(false)
  }
}

extension KNoteLayout {
  /// The view key's symbol: one family for the three (a column of cards, tiles, rows).
  var symbol: String {
    switch self {
    case .card: return "rectangle.grid.1x2"
    case .grid: return "square.grid.2x2"
    case .list: return "list.bullet"
    }
  }
}

/// The view key: the current view's symbol only (owner, 2026-10-20: no word next to it). A tap
/// cycles Card, Grid, List; the symbol changes with the system's own replace (the old one leaves
/// downward as the new one drops in), and a selection tick is felt. VoiceOver hears the view's
/// name as the value.
struct KNotesViewButton: View {
  let theme: KTheme
  let layout: KNoteLayout
  let label: String
  let a11yName: String
  var solo = true
  let action: () -> Void

  var body: some View {
    KGlassKey(theme: theme, solo: solo, a11yLabel: a11yName, a11yValue: label, action: action) {
      KGlassSymbol(layout.symbol)
        .contentTransition(.symbolEffect(.replace.downUp))
        .animation(.smooth(duration: 0.3), value: layout)
    }
    .sensoryFeedback(.selection, trigger: layout)
  }
}

/// The calendar key: the calendar symbol, its header in the colour of your latest day's mood this
/// month (owner, 2026-11-13: "日历那个没带点色彩?"), as Calendar's own icon wears its red; ink with
/// no page yet this month. While the calendar is open the key is on: a lens tinted with the theme's
/// indigo, the whole symbol in indigo.
struct KNotesCalendarButton: View {
  let theme: KTheme
  let open: Bool
  /// the latest day's mood group this month (TS recentGroups, its newest); nil for none
  var latest: KMoodGroup? = nil
  let a11yName: String
  var solo = true
  let action: () -> Void

  var body: some View {
    KGlassKey(theme: theme, solo: solo, on: open, a11yLabel: a11yName, action: action) {
      KCalendarSymbol(header: open ? nil : latest.map { headerInk($0) })
    }
    .sensoryFeedback(.selection, trigger: open)
  }

  /// the mood's ink on a light theme; on a dark one, halfway to its pale fill (the ink alone sinks
  /// into the dark glass, the fill alone is as pale as the symbol's own light ink)
  private func headerInk(_ g: KMoodGroup) -> Color {
    theme.isDark ? g.mood.ink.mix(with: g.mood.fill, by: 0.5) : g.mood.ink
  }
}

/// The calendar symbol with its header (the top 29% of the drawing, the solid bar) in a colour of
/// its own: the symbol is one layer, so the colour is a band masked by the symbol itself.
struct KCalendarSymbol: View {
  let header: Color?

  var body: some View {
    KGlassSymbol("calendar")
      .overlay {
        if let header {
          GeometryReader { g in
            Rectangle().fill(header).frame(height: g.size.height * 0.29)
          }
          .mask(KGlassSymbol("calendar"))
          .allowsHitTesting(false)
        }
      }
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
