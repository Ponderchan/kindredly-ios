import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 THE KINDREDS TAB as React Native sees it: <KKindredsView … /> on the JS side
 (modules/kindredly-ui/src/Kindreds.tsx), drawn by src/screens/kindreds/KindredsNative.tsx in one
 full-screen Host. This file turns records into Portable values and taps into events; the screen
 itself is Portable/Kindreds/KKindredsScreen.swift and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host>: one Host for the
 whole screen, never one per row. It has no text field.

 SEARCH (owner's audit, 2026-11-10): the screen has one KField, the search's, so this view is
 an ExpoSwiftUI.FocusableView like every adapter that holds one: before the view is taken off
 screen the keyboard is let go (the expo focus/unmount crash's guard, KField.swift). The
 driver owns the field and tells onKindredsSearch what the reader typed.

 Props, beyond KScreenProps (insets: top = the status bar the screen draws its strip for,
 tabBarRoom = the floating bar the last row clears, with 72 more, and never less than the fade's
 height - 6, KBottomFade.contentMargin(), since the fade is always drawn):
 - strings: { title, status, statusA11y, legendCloser, legendTurn, orbitChipLabel, searchLabel,
   searchPlaceholder, searchCancel, searchClear }; the four search words are "" from JS written
   before the search, and the screen then draws no magnifier chip
 - statusActive: letters are waiting, so the status is ind and a button
 - active: the tab is focused (the orbit drifts only then)
 - chips: [{ key, label, count, glyph: none | kindred | penPal, selected, dot, a11yLabel }]
 - orbit: [{ id, mask, frost, ring, a0, dir, period, turn, stamp }]
 - orbitMe: { show, face }, orbitKin: [{ id, face, a0, turn }]: you in the middle and your
   kindreds on the home ring (2026-11-12); faces are the rows' own record
 - a face record's `stamp`, a fold face's `stamp`: a First Class member's denomination ("1ST" |
   "007" | ""), drawn as their stamp (C2, KStampAvatar); an orbit face's `stamp` is a Bool
 - items: [{ id, type, text, text2, image, row, fold }], type one of wrenLine | notice | line |
   showing | wren | row | fold | emptyLine | hintKindreds | hintPenpals | groupHeader; `row` and
   `fold` are always sent (empty when unused, a record field can't be null).
 - legendFrost: the sample window the PEN PALS chip mark and the your-turn legend are drawn as.
 THE IDENTITY SWITCH (identity Phase 1) reaches this file as data only: a pen pal's face kind
 "frost" with its window (KFrostRecord; "tile" is a closed account's flat veil tile), a row's
 mark / sign ("" for none) and "was No. 4481", a folded face's and an orbit face's frost, and
 legendFrost. Every frost is TS's NO_FROST (v 0, `spec` nil) while the switch is off, and then
 every surface draws exactly what it drew before.
 chips, orbit and items are converted once per rev (useRev in TS).

 Commands (KCommandBus): scrollTo { key: "top" | "list", animated }, and reset {}, which TS no
 longer sends: the screen folds the band itself on disappear, once it has left the window (after
 a push's slide, or as the tab is detached). A reset that does come while the screen is showing
 waits for that disappear (folding then would jump every row up mid-slide); off screen, it folds
 at once.

 Events, with what nativeEvent carries:
 - onKindredsRowPress { id }          a row
 - onKindredsRowAction { id, key }    a row's menu item (rekindle, read, unread, page, report, block)
 - onKindredsWrenPress {}             Wren's row
 - onKindredsFoldPress {}             the folded row
 - onKindredsFoldFacePress { id }     a folded face
 - onKindredsChipPress { key }        a group chip (all, kindreds, penpals)
 - onKindredsTitlePress {}            the status by the title
 - onKindredsClearPress {}            CLEAR × on the Showing line
 - onKindredsBandChange { open, via } the band opened or folded (chip, pull, scroll, title, search)
 - onKindredsSearch { query, active } the search field changed: its words, and whether the reader
                                      is searching (false: Cancel, or the screen came back
                                      without a search); TS answers with the narrowed items
 - onKindredsHintPress { kind }       an empty hint: kindreds | penpals
 - onKindredsNoticePress { action }   the notifications bar: turnOn | close
 - onKindredsWrenLinePress {}         her once-line was tapped away

 Unknown enum strings fall back rather than fail (a type this binary doesn't know is skipped, a
 glyph draws none, a tone draws mute), as KTabBarView does. This file imports ExpoUI, whose
 public Button would make a bare "Button" ambiguous, so nothing of that kind is written here.
 */

/// A face as TS sends it (faces.ts faceRecord, plus the mosaic's ink).
struct KKindredsFaceRecord: Record {
  /// image | mosaic | frost | veil | tile | placeholder | bird (Wren's official bird, set on a
  /// soft2 disc). frost: a pen pal's window (identity switch on); tile: a closed account's flat
  /// veil tile while the switch is on
  @Field var kind: String = "placeholder"
  @Field var uri: String = ""
  @Field var key: String = ""
  @Field var overscan: Double = 0
  @Field var mask: Int = 0
  /// kind frost: the window (NO_FROST otherwise)
  @Field var frost: KFrostRecord = KFrostRecord()
  /// ink | ind (a mosaic for someone whose turn it is to be written to)
  @Field var tint: String = "ink"
  /// a First Class member's stamp (C2): "1ST" or "007"; "" for none (never Wren, never a veil)
  @Field var stamp: String = ""

  var memberStamp: KMemberStamp? {
    kind == "bird" ? nil : KMemberStamp(stamp)
  }

  var face: KPersonFace {
    switch kind {
    case "image": return .image(KImageRef(uri: uri, key: key), overscan: CGFloat(overscan))
    case "mosaic": return .mosaic(mask: mask, turn: tint == "ind")
    case "frost": return frost.spec.map { .frost($0) } ?? .frostVeil
    case "tile": return .frostVeil
    case "veil": return .veil
    case "bird": return .bird(KImageRef(uri: uri, key: key))
    default: return .placeholder
    }
  }
}

struct KKindredsTagRecord: Record {
  @Field var text: String = ""
  /// ind | mute | post | brass
  @Field var tone: String = "mute"

  var tag: KRowTag {
    KRowTag(text: text, tone: KRowTag.Tone(rawValue: tone) ?? .mute)
  }
}

struct KKindredsRowRecord: Record {
  @Field var id: String = ""
  @Field var face: KKindredsFaceRecord = KKindredsFaceRecord()
  @Field var faceBadge: Bool = false
  @Field var name: String = ""
  /// she | he | "" (identity switch on, a pen pal who shows it)
  @Field var mark: String = ""
  /// aries … pisces | ""
  @Field var sign: String = ""
  /// "was No. 4481" | ""
  @Field var was: String = ""
  @Field var nameDim: Bool = false
  @Field var progress: String = ""
  @Field var time: String = ""
  @Field var tags: [KKindredsTagRecord] = []
  @Field var youPrefix: String = ""
  @Field var preview: String = ""
  @Field var badge: String = ""
  @Field var trailingLink: String = ""
  @Field var dim: Bool = false
  @Field var a11yLabel: String = ""
  @Field var actions: [KMenuActionRecord] = []

  func row(id fallback: String) -> KPersonRowModel {
    KPersonRowModel(
      id: id.isEmpty ? fallback : id,
      face: face.face,
      faceBadge: faceBadge,
      name: name,
      mark: KLineGlyph.mark(mark),
      sign: KLineGlyph.sign(sign),
      was: was,
      nameDim: nameDim,
      progress: progress,
      time: time,
      tags: tags.map(\.tag),
      youPrefix: youPrefix,
      preview: preview,
      badge: badge,
      trailingLink: trailingLink,
      dim: dim,
      stamp: face.memberStamp,
      a11yLabel: a11yLabel,
      actions: actions.map { KMenuItem(key: $0.key, title: $0.title, systemImage: $0.icon, destructive: $0.destructive) }
    )
  }
}

struct KKindredsFoldFaceRecord: Record {
  @Field var id: String = ""
  @Field var mask: Int = 0
  /// identity switch on: the pen pal's window (NO_FROST off)
  @Field var frost: KFrostRecord = KFrostRecord()
  @Field var a11yLabel: String = ""
  /// a member's stamp (C2): "1ST" | "007" | ""
  @Field var stamp: String = ""
}

struct KKindredsFoldRecord: Record {
  @Field var faces: [KKindredsFoldFaceRecord] = []
  @Field var more: String = ""
  @Field var label: String = ""
  @Field var a11yLabel: String = ""

  func fold(id: String) -> KFoldModel {
    KFoldModel(
      id: id,
      faces: faces.map { KFoldFace(id: $0.id, mask: $0.mask, frost: $0.frost.spec, a11yLabel: $0.a11yLabel, stamp: KMemberStamp($0.stamp)) },
      more: more,
      label: label,
      a11yLabel: a11yLabel
    )
  }
}

struct KKindredsItemRecord: Record {
  @Field var id: String = ""
  @Field var type: String = ""
  @Field var text: String = ""
  @Field var text2: String = ""
  /// wrenLine: the reader's own Wren
  @Field var image: KImageRefRecord = KImageRefRecord()
  @Field var row: KKindredsRowRecord = KKindredsRowRecord()
  @Field var fold: KKindredsFoldRecord = KKindredsFoldRecord()

  /// nil for a type this binary doesn't know (skipped, not drawn wrong)
  var item: KKindredsItem? {
    switch type {
    case "wrenLine": return .wrenLine(id: id, bird: image.ref, text: text)
    case "notice": return .notice(id: id, text: text, closeLabel: text2)
    case "line": return .line(id: id, text: text)
    case "showing": return .showing(id: id, text: text, clear: text2)
    case "wren": return .wren(row.row(id: id))
    case "row": return .row(row.row(id: id))
    case "fold": return .fold(fold.fold(id: id))
    case "emptyLine": return .emptyLine(id: id, text: text)
    case "hintKindreds": return .hintKindreds(id: id, text: text)
    case "hintPenpals": return .hintPenpals(id: id, text: text, link: text2)
    case "groupHeader": return .groupHeader(id: id, text: text)
    default: return nil
    }
  }
}

struct KKindredsChipRecord: Record {
  @Field var key: String = ""
  @Field var label: String = ""
  @Field var count: String = ""
  /// none | kindred | penPal
  @Field var glyph: String = "none"
  @Field var selected: Bool = false
  @Field var dot: Bool = false
  @Field var a11yLabel: String = ""

  var chip: KKindredsChip {
    KKindredsChip(key: key, label: label, count: count, glyph: KFilterChip.Glyph(rawValue: glyph) ?? .none, selected: selected, dot: dot, a11yLabel: a11yLabel)
  }
}

struct KKindredsOrbitRecord: Record {
  @Field var id: String = ""
  @Field var mask: Int = 0
  /// identity switch on: the stranger's window, the same on every ring (NO_FROST off)
  @Field var frost: KFrostRecord = KFrostRecord()
  @Field var ring: Int = 0
  @Field var a0: Double = 0
  @Field var dir: Double = 1
  @Field var period: Double = 200
  @Field var turn: Bool = false
  /// a First Class member (C2): the orbit's 1pt dotted gold edge
  @Field var stamp: Bool = false

  var item: KOrbitItem {
    KOrbitItem(id: id, mask: mask, frost: frost.spec, ring: ring, a0: a0, dir: dir, period: period, turn: turn, stamp: stamp)
  }
}

/// One kindred on the orbit's home ring (KOrbitKin): their face as their row has it.
struct KKindredsOrbitKinRecord: Record {
  @Field var id: String = ""
  @Field var face: KKindredsFaceRecord = KKindredsFaceRecord()
  @Field var a0: Double = 0
  @Field var turn: Bool = false

  var kin: KOrbitKin {
    KOrbitKin(id: id, face: face.face, a0: a0, turn: turn)
  }
}

/// You, in the orbit's middle. `show` false (the default: an older JS that sends none) keeps
/// the ink cell.
struct KKindredsOrbitMeRecord: Record {
  @Field var show: Bool = false
  @Field var face: KKindredsFaceRecord = KKindredsFaceRecord()
}

/// Every word of the screen that isn't in a list (KKindredsStrings in TS).
struct KKindredsStringsRecord: Record {
  @Field var title: String = ""
  @Field var status: String = ""
  @Field var statusA11y: String = ""
  @Field var legendCloser: String = ""
  @Field var legendTurn: String = ""
  @Field var orbitChipLabel: String = ""
  /// the search's four words (owner's audit, 2026-11-10); "" from JS written before it
  @Field var searchLabel: String = ""
  @Field var searchPlaceholder: String = ""
  @Field var searchCancel: String = ""
  @Field var searchClear: String = ""
}

final class KKindredsViewProps: KScreenProps {
  @Field var strings: KKindredsStringsRecord = KKindredsStringsRecord()
  @Field var statusActive: Bool = false
  @Field var active: Bool = true
  @Field var chips: [KKindredsChipRecord] = []
  @Field var orbit: [KKindredsOrbitRecord] = []
  /// you and your kindreds on the orbit (2026-11-12); absent from an older JS: the orbit as it was
  @Field var orbitMe: KKindredsOrbitMeRecord = KKindredsOrbitMeRecord()
  @Field var orbitKin: [KKindredsOrbitKinRecord] = []
  @Field var items: [KKindredsItemRecord] = []
  /// identity switch on: the PEN PALS mark's and the your-turn legend's sample window (NO_FROST off)
  @Field var legendFrost: KFrostRecord = KFrostRecord()

  var onKindredsRowPress = EventDispatcher()
  var onKindredsRowAction = EventDispatcher()
  var onKindredsWrenPress = EventDispatcher()
  var onKindredsFoldPress = EventDispatcher()
  var onKindredsFoldFacePress = EventDispatcher()
  var onKindredsChipPress = EventDispatcher()
  var onKindredsTitlePress = EventDispatcher()
  var onKindredsClearPress = EventDispatcher()
  var onKindredsBandChange = EventDispatcher()
  var onKindredsHintPress = EventDispatcher()
  var onKindredsNoticePress = EventDispatcher()
  var onKindredsWrenLinePress = EventDispatcher()
  var onKindredsSearch = EventDispatcher()

  /// The band and the scroll requests: as long-lived as the view, like `commands`.
  private(set) lazy var driver: KKindredsDriver = {
    let d = KKindredsDriver()
    d.onBandChange = { [weak self] open, via in
      self?.onKindredsBandChange(["open": open, "via": via.rawValue])
    }
    d.onSearchChange = { [weak self] query, active in
      self?.onKindredsSearch(["query": query, "active": active])
    }
    return d
  }()

  /// The screen's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KKindredsActions = {
    let a = KKindredsActions()
    a.onRow = { [weak self] id in self?.onKindredsRowPress(["id": id]) }
    a.onRowAction = { [weak self] id, key in self?.onKindredsRowAction(["id": id, "key": key]) }
    a.onWren = { [weak self] in self?.onKindredsWrenPress() }
    a.onFold = { [weak self] in self?.onKindredsFoldPress() }
    a.onFoldFace = { [weak self] id in self?.onKindredsFoldFacePress(["id": id]) }
    a.onChip = { [weak self] key in self?.onKindredsChipPress(["key": key]) }
    a.onTitle = { [weak self] in self?.onKindredsTitlePress() }
    a.onClear = { [weak self] in self?.onKindredsClearPress() }
    a.onHint = { [weak self] kind in self?.onKindredsHintPress(["kind": kind]) }
    a.onNotice = { [weak self] action in self?.onKindredsNoticePress(["action": action]) }
    a.onWrenLine = { [weak self] in self?.onKindredsWrenLinePress() }
    return a
  }()

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.reset:
      // deferred while the screen is showing (applied on disappear), at once off screen
      driver.requestReset()
    case KCommandName.scrollTo:
      let animated = args.kBool("animated") ?? true
      switch args.kString("key") {
      case "top": driver.scroll(to: .top, animated: animated)
      case "list": driver.scroll(to: .list, animated: animated)
      default: break
      }
    default:
      break
    }
  }
}

struct KKindredsView: ExpoSwiftUI.View {
  @ObservedObject var props: KKindredsViewProps

  var body: some View {
    var content = KKindredsContent()
    content.title = props.strings.title
    content.status = props.strings.status
    content.statusActive = props.statusActive
    content.statusA11y = props.strings.statusA11y
    content.legendCloser = props.strings.legendCloser
    content.legendTurn = props.strings.legendTurn
    content.orbitChipLabel = props.strings.orbitChipLabel
    content.searchLabel = props.strings.searchLabel
    content.searchPlaceholder = props.strings.searchPlaceholder
    content.searchCancel = props.strings.searchCancel
    content.searchClear = props.strings.searchClear
    content.legendFrost = props.cached("legendFrost") { props.legendFrost.spec }
    content.active = props.active
    content.chips = props.cached("chips") { props.chips.map(\.chip) }
    content.orbit = props.cached("orbit") { props.orbit.map(\.item) }
    content.orbitMe = props.cached("orbitMe") { props.orbitMe.show ? props.orbitMe.face.face : nil }
    content.orbitKin = props.cached("orbitKin") { props.orbitKin.map(\.kin) }
    content.items = props.cached("items") { props.items.compactMap(\.item) }
    let insets = props.insets
    return KKindredsScreen(
      theme: props.kTheme,
      content: content,
      topInset: insets.top,
      // the floating bar's room plus 72 (spec: useTabBarSpace() + 72), never less than the fade
      // that is always drawn over the bottom asks (KBottomFade.contentMargin(): 176 - 6, H:28's
      // 170), so the last row (a closed account at the foot) always scrolls clear of its solid
      // part: on a home-button phone in the tab, and on the dev page, which has no tab bar. The
      // React Native fallback ends its list at the same place (max(tabRoom + 72, 176 - 6)).
      bottomInset: max(insets.tabBarRoom + 72, KBottomFade.contentMargin()),
      driver: props.driver,
      actions: props.actions
    )
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KKindredsView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if the search field has it, then the field told it
  /// has lost focus (as KEditFieldView does).
  func forceResignFirstResponder() {
    let field = props.driver.searchField
    if field.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    field.blur()
  }
}
