import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI
import os

/*
 THE SHARED BASE OF EVERY STEP-5 SCREEN VIEW (chat/room, Kindreds, Today, compose, Me, Settings,
 Edit profile, Notes). Each screen's props class subclasses KScreenProps:

     final class KTodayViewProps: KScreenProps {
       @Field var cards: [KTodayCardRecord] = []
       var onTodayCardPress = EventDispatcher()
     }

 and gets, with no further work:
 - theme: a key of src/theme/themes.json; read it resolved as `props.kTheme`.
 - letterFont: the owner's Letter font, "newsreader" | "system" | "garamond" | "sfmono"; read it as
   `props.letterFontKey`, which is "newsreader" for anything else, and also while EB Garamond
   isn't embedded in this binary (the font file needs the owner's approval and a native build).
 - insets: { top, bottom, tabBarRoom } in points. Screen Hosts ignore the container safe area
   (Host ignoreSafeArea "all" or "container"), so Swift lays out its own status-bar strip and
   bottom margin from these. tabBarRoom is useTabBarSpace() on a tab screen, 0 on a pushed one.
 - rev: a counter TS bumps whenever any heavy array prop changes (useRev in src/commands.ts).
   `props.cached("rows") { … }` converts records once per rev instead of on every body run,
   which every prop change triggers (see KCommandBus.swift for why). useRev starts at 1, so 0
   means the screen tracks no rev: cached() then converts on every body run (correct, only
   slower) and says so once per slot in a debug build, rather than hand back stale rows.
 - commands: the KCommandBus that the screen's "command" AsyncFunction feeds. Listen with
   `.onKCommand(props.commands) { name, args in … }`.
 - testID and the @expo/ui modifiers, from UIBaseViewProps, because every screen view is
   registered with ExpoUIView (KindredlyUIModule.swift).

 In the adapter's body, put `.kScreenEnvironment(props)` on the screen's root view: it installs
 the one shared image loader (KImageStore) for every KImage inside, and the letter face.

 Internal, not open: every subclass lives in this module (Adapters/), as the other adapters do.

 Records for shapes many screens send (all @Field records: the @Record macro is declared in
 expo-modules-core but its plugin doesn't ship, Record.swift:95-121):
 - KInsetsRecord        { top, bottom, tabBarRoom }
 - KImageRefRecord      { uri, key, kind }  -> `.ref` is the Portable KImageRef (or nil)
 - KMenuActionRecord    { key, title, icon, destructive }, the TS KMenuAction; map it onto
                         kit-portable's KMenuItem for .kMenu
 - KFrostRecord         a stranger's frosted window (identity Phase 1), the TS KFrost / the app's
                         src/lib/frost FrostSpec field for field -> `.spec` is the Portable
                         KFrostSpec, or nil for none: TS sends NO_FROST (v 0) where it has no
                         window, since a record field can't take null
 */

/// The screen's safe-area and tab-bar room, as TS measures them (useScreenInsets()).
struct KInsetsRecord: Record {
  /// the status-bar inset (useSafeAreaInsets().top)
  @Field var top: CGFloat = 0
  /// the home-indicator inset (useSafeAreaInsets().bottom)
  @Field var bottom: CGFloat = 0
  /// on a tab screen, the floating tab bar's room (useTabBarSpace()); 0 on a pushed screen
  @Field var tabBarRoom: CGFloat = 0
}

/// A picture as TS hands it over: a file:// or https URL and the key it is cached under (the
/// storage path, an asset path, or a snapshot key like "bird:content:sky:none:wren:0", never a
/// signed URL). The same key must always mean the same picture.
struct KImageRefRecord: Record {
  /// file:// or http(s):// (a bare absolute path is read as a file); empty for none
  @Field var uri: String = ""
  /// the cache key; empty uses the uri itself
  @Field var key: String = ""
  /// "image" (the default) or "videoPoster" (a still from a video file)
  @Field var kind: String = "image"

  /// The Portable ref KImage takes; nil when there is no usable uri.
  var ref: KImageRef? {
    KImageRef(uri: uri, key: key, kind: KImageRef.Kind(rawValue: kind) ?? .image)
  }
}

/// One context-menu item as TS builds it (the TS type KMenuAction): the label already
/// translated, an SF Symbol name, and whether it is drawn red. The key comes back in the
/// screen's action event.
struct KMenuActionRecord: Record {
  @Field var key: String = ""
  @Field var title: String = ""
  /// an SF Symbol name, e.g. "flag"
  @Field var icon: String = ""
  @Field var destructive: Bool = false
}

/// One light of a frosted window (src/lib/frost FrostBlob): a radial gradient at (x, y), radius
/// r, in units of the window's side; `color` is "#RRGGBB".
struct KFrostBlobRecord: Record {
  @Field var tone: String = ""
  @Field var color: String = ""
  @Field var x: Double = 0.5
  @Field var y: Double = 0.5
  @Field var r: Double = 0.6
  @Field var alpha: Double = 0.9
}

struct KFrostHeadRecord: Record {
  @Field var x: Double = 0.5
  @Field var y: Double = 0.4
  @Field var r: Double = 0.235
  @Field var solid: Double = 0.62
}

struct KFrostShouldersRecord: Record {
  @Field var x: Double = 0.5
  @Field var y: Double = 1.04
  @Field var rx: Double = 0.52
  @Field var ry: Double = 0.36
  @Field var solid: Double = 0.55
}

struct KFrostSilhouetteRecord: Record {
  @Field var alpha: Double = 0.22
  @Field var head: KFrostHeadRecord = KFrostHeadRecord()
  @Field var shoulders: KFrostShouldersRecord = KFrostShouldersRecord()
}

struct KFrostSheenRecord: Record {
  @Field var alpha: Double = 0.18
  @Field var to: Double = 0.55
}

struct KFrostHairlineRecord: Record {
  @Field var alpha: Double = 0.35
  @Field var width: Double = 1
}

/// A stranger's frosted window as TS worked it out (src/lib/frost FrostSpec, FROST v1). v 0 is
/// TS's NO_FROST: no window (the switch is off, or there is nobody), so `spec` is nil. Swift
/// never hashes: every colour and position is TS's, read here as they came.
struct KFrostRecord: Record {
  /// FROST version; 0 = none
  @Field var v: Int = 0
  @Field var dark: Bool = false
  @Field var tone: String = ""
  /// "#RRGGBB"
  @Field var base: String = ""
  @Field var blobs: [KFrostBlobRecord] = []
  @Field var silhouette: KFrostSilhouetteRecord = KFrostSilhouetteRecord()
  @Field var sheen: KFrostSheenRecord = KFrostSheenRecord()
  @Field var hairline: KFrostHairlineRecord = KFrostHairlineRecord()
  @Field var corner: Double = 0.25
  @Field var edge: Double = 1.5

  /// The Portable window; nil for none (v 0, or no base colour to draw it in).
  var spec: KFrostSpec? {
    guard v > 0, base.hasPrefix("#") else { return nil }
    let s = silhouette
    return KFrostSpec(
      dark: dark,
      base: Color(hex: base),
      lights: blobs.filter { $0.color.hasPrefix("#") }.map {
        KFrostSpec.Light(color: Color(hex: $0.color), x: CGFloat($0.x), y: CGFloat($0.y), r: CGFloat($0.r), alpha: $0.alpha)
      },
      silhouetteAlpha: s.alpha,
      head: KFrostSpec.Head(x: CGFloat(s.head.x), y: CGFloat(s.head.y), r: CGFloat(s.head.r), solid: CGFloat(s.head.solid)),
      shoulders: KFrostSpec.Shoulders(x: CGFloat(s.shoulders.x), y: CGFloat(s.shoulders.y), rx: CGFloat(s.shoulders.rx), ry: CGFloat(s.shoulders.ry), solid: CGFloat(s.shoulders.solid)),
      sheenAlpha: sheen.alpha,
      sheenTo: CGFloat(sheen.to),
      hairlineAlpha: hairline.alpha,
      hairlineWidth: CGFloat(hairline.width),
      corner: CGFloat(corner),
      edge: CGFloat(edge)
    )
  }
}

/// The base of every step-5 screen view's props (see the note at the top of the file).
class KScreenProps: UIBaseViewProps {
  /// a key of src/theme/themes.json: classic, midnight, lavender or paper
  @Field var theme: String = "classic"
  /// the owner's Letter font: newsreader, system, garamond or sfmono (read letterFontKey)
  @Field var letterFont: String = "system"
  @Field var insets: KInsetsRecord = KInsetsRecord()
  /// bumped by TS whenever a heavy array prop changes; keys `cached(_:_:)`. 0 (what the TS
  /// wrappers send when a screen passes none) means untracked: nothing is cached.
  @Field var rev: Int = 0

  /// The imperative channel the screen's "command" AsyncFunction feeds (KCommandBus.swift).
  let commands = KCommandBus()

  /// slot -> (the rev it was built at, the value); main thread only, like body
  private var revCache: [String: (rev: Int, value: Any)] = [:]

  #if DEBUG
  /// the slots already reported as asked for at rev 0, so the log says it once each
  private var untrackedSlots: Set<String> = []
  private static let log = Logger(subsystem: "kindredly-ui", category: "screens")
  #endif

  /// The theme to draw with. Classic for a key this binary doesn't know (one added to
  /// themes.json without regenerating KTheme.swift), as KTabBarView does.
  var kTheme: KTheme {
    KTheme.named(theme) ?? .classic
  }

  /// The Letter font to draw letters in: "newsreader", "system", "garamond" or "sfmono". Anything else is
  /// "system", the default since 2026-10-26; "garamond" while EB Garamond isn't in this binary is
  /// "newsreader", the serif closest to what that phone chose.
  var letterFontKey: String {
    switch letterFont {
    // (it had no case of its own and fell to "system", so Newsreader chosen in Settings drew
    // every Swift letter in the system face: found on the Appearance page's preview, 2026-11-13)
    case "newsreader": return "newsreader"
    // a stored New York (retired 2026-10-20) reads as Newsreader, the serif it was closest to
    case "newyork": return "newsreader"
    case "system": return "system"
    case "sfmono": return "sfmono"
    case "garamond": return Self.garamondEmbedded ? "garamond" : "newsreader"
    default: return "system"
    }
  }

  /// Whether EB Garamond (PostScript name EBGaramond-Regular) is registered in this binary.
  /// Asked once: fonts in app.json ios.fonts are registered at launch.
  static let garamondEmbedded: Bool = UIFont(name: "EBGaramond-Regular", size: 12) != nil

  /// Builds `make()` once per `rev` for the given slot, and hands back the same value until TS
  /// bumps rev. Use it for anything converted from heavy record arrays:
  ///
  ///     let rows = props.cached("rows") { props.rows.map(KRow.init) }
  ///
  /// The conversion must depend only on rev-tracked props; a value that also depends on, say,
  /// the theme belongs in a slot named for it ("rows:\(props.theme)"). Main thread only.
  ///
  /// At rev 0 (the screen passes no rev) it converts every time and caches nothing: a cache
  /// keyed on a rev that never moves would hand back the first rows forever, silently.
  func cached<T>(_ slot: String, _ make: () -> T) -> T {
    guard rev != 0 else {
      #if DEBUG
      if untrackedSlots.insert(slot).inserted {
        Self.log.warning("cached(\"\(slot, privacy: .public)\") at rev 0: this screen sends no rev, so it converts on every body run. Pass useRev(...) as rev.")
      }
      #endif
      revCache[slot] = nil
      return make()
    }
    if let entry = revCache[slot], entry.rev == rev, let value = entry.value as? T {
      return value
    }
    let value = make()
    revCache[slot] = (rev, value)
    return value
  }
}

extension View {
  /// What every step-5 screen puts on its root view: the one shared image loader for every
  /// KImage inside (KImageStore.shared) and the owner's Letter font for every letter serif.
  func kScreenEnvironment(_ props: KScreenProps) -> some View {
    environment(\.kImageLoader, KImageStore.shared)
      // KLetterFace's raw values are the keys TS sends, so init(key:) maps all four (a retired
      // "newyork" is none of them and reads as Newsreader); letterFontKey has already turned an unembedded "garamond" into
      // "newsreader". Only styles that follow the Letter font move (KTextStyle.followsLetterFont:
      // letters being read), every other serif stays Newsreader.
      .kLetterFace(KLetterFace(key: props.letterFontKey))
  }
}

/// What a screen view draws until its screen slice replaces the stub: the theme's page colour
/// edge to edge, with a few soft skeleton blocks below the top inset. No words (every string
/// comes from TS) and nothing for VoiceOver to read.
struct KScreenPlaceholder: View {
  let theme: KTheme
  let insets: KInsetsRecord

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      RoundedRectangle(cornerRadius: 6, style: .circular)
        .fill(theme.soft2)
        .frame(width: 132, height: 22)
      ForEach(0..<3, id: \.self) { _ in
        RoundedRectangle(cornerRadius: 24, style: .circular)
          .fill(theme.sf)
          .overlay(RoundedRectangle(cornerRadius: 24, style: .circular).strokeBorder(theme.line, lineWidth: 1))
          .frame(height: 120)
      }
    }
    .padding(.top, insets.top + 16)
    .padding(.horizontal, 16)
    .padding(.bottom, max(insets.bottom, insets.tabBarRoom))
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background(theme.bg.ignoresSafeArea())
    .accessibilityHidden(true)
  }
}
