import SwiftUI

/* ME'S COVER (the owner's idea, 2026-11-11: "me tab 的结构就改成和我老产品一模一样的"; the prototype
   is design/courier-planet/cover-prototype). With the courier's planet on, Me is laid out as his
   older product is:

     ┌ the cover ───────────────────────────────┐   the hour's sky and the planet (KPlanetView,
     │ DRAG TO SPIN            (the planet)      │   kind .cover): it turns under a finger, and it
     │ [stamps 7] [letters 14]            (face) │   follows the hour. Two small ways in on its
     └──────────────────────────────────────────┘   lower left; your face on its lower right,
     Sunday Kite                                     half over its edge.
     (♂ ♏ Scorpio)
     ──
      2         9                 [✎ Edit] (⚙)
     kindreds  notes
     … her card, the two tiles, First Class (KMePlanetCard.swift, KMeScreen KMePlanetPage)

   PULLED DOWN at the top, the cover stretches and the planet grows with it; let go past
   KMeCoverMetrics.open and the planet page opens (TS: app/planet, which fades in over it).
   Only the planet itself takes a finger for turning (KPlanetTouchShape, .cover): the sky round
   it pulls the page.

   SCROLLED UP, the cover leaves with the page and a bar in the sky's own colours takes the top:
   your name, the pen and the gear (KMeCoverBar).

   The gender mark sits in the older product's blue, pink for her, and the sign is its emoji
   (owner, 2026-11-11); elsewhere in the app the marks stay as they were. */

enum KMeCoverMetrics {
  /// the cover under the status bar
  static let body: CGFloat = 142
  /// the planet's scene at rest (a 50pt planet, low enough in the cover that she can stand on
  /// top of it clear of the clock and the island), and how much of a pull goes into it
  static let scene: CGFloat = 152
  static let sceneGain: CGFloat = 1
  /// plain sky under the scene
  static let foot: CGFloat = 6
  /// how far the cover is pulled before letting go opens the planet page
  static let open: CGFloat = 96
  static let face: CGFloat = 88
  /// how much of your face is over the cover
  static let faceOver: CGFloat = 58
  /// the bar the cover folds into, under the status bar
  static let bar: CGFloat = 44
  static let he = Color(hex: "#56B8F5")
  static let she = Color(hex: "#F58FB4")
}

/// The cover: the sky, the planet, the hint, the two ways in.
struct KMeCover: View {
  let planet: KMePlanet
  let topInset: CGFloat
  /// how far the page is pulled down at its top
  let pull: CGFloat
  let actions: KMePlanetActions
  /* A PAGE OF ITS OWN (iPhone Duo's inner screen; KMeScreen, THE SPREAD): "封面上的小星球长成整页".
     There the planet is not a low cover but the whole left page: the page's big planet (the one
     the planet page shows), turning under a finger, with the two ways in at its foot. `foot` is
     what they keep clear at the bottom. Nothing to pull: the planet page is already open. */
  var page = false
  var foot: CGFloat = 0

  @State private var probe = KPlanetProbe()
  @State private var turned = false
  /// a folding phone: the sky runs the window's whole width; the two ways in keep to the column
  @ObservedObject private var fold = KFold.shared

  @ViewBuilder var body: some View {
    if page {
      pageBody
    } else {
      coverBody
    }
  }

  private var pageBody: some View {
    let night = planet.planet.palette.moon
    return ZStack(alignment: .bottomLeading) {
      KPlanetView(kind: .page, content: planet.planet, probe: probe, onTap: { what in actions.onTap(what) }, onTurned: { turned = true })
      HStack(spacing: 8) {
        entry(planet.stampsEntry, night: night, action: actions.onStamps) {
          KMeStampsMark(fan: planet.stamps.fan)
        }
        entry(planet.lettersEntry, night: night, action: actions.onLetters) {
          KMePostboxMark()
        }
      }
      .padding(.leading, 16)
      .padding(.bottom, 12 + foot)
    }
    .clipped()
    .accessibilityElement(children: .contain)
  }

  private var coverBody: some View {
    let palette = planet.planet.palette
    let night = palette.moon
    // the sun (or the moon) sits high on its own side, under the clock: clear of the two ways in
    // on the left and of your face on the right (the hour's own place for it is laid out for a
    // taller scene)
    var scene = planet.planet
    scene.palette.sunAt = CGPoint(x: scene.palette.sunAt.x < 0.5 ? 0.12 : 0.8, y: 0.17)
    let fade = max(0, 1 - pull / 60)
    return ZStack(alignment: .bottom) {
      palette.sky0
      VStack(spacing: 0) {
        /* THE SCENE KEEPS OUT OF THE SYSTEM'S BAND (iPhone Duo's outer screen; owner, 2026-11-12:
           "me 在这个屏幕是这样子的吗"). Laid out across the whole glass, the planet stood in the
           middle of the window, which is 42 to the right of the page's middle: against your face
           and under the clock, with the moon touching the camera. So the planet, the moon and
           the stars are the page's, and behind them the same wash (sky0 to sky1, as
           KPlanetPaint.sky lays it) runs on under the clock to the edge. The band is 0 on a
           phone and on the inner screen upright, where nothing changes. */
        ZStack {
          LinearGradient(colors: [palette.sky0, palette.sky1], startPoint: .top, endPoint: .bottom)
          KPlanetView(kind: .cover, content: scene, probe: probe, onTap: { what in actions.onTap(what) }, onTurned: { turned = true })
            .padding(.trailing, fold.frame.band)
        }
        .frame(height: KMeCoverMetrics.scene + pull * KMeCoverMetrics.sceneGain)
        palette.sky1.frame(height: KMeCoverMetrics.foot)
      }
      HStack(spacing: 8) {
        entry(planet.stampsEntry, night: night, action: actions.onStamps) {
          KMeStampsMark(fan: planet.stamps.fan)
        }
        entry(planet.lettersEntry, night: night, action: actions.onLetters) {
          KMePostboxMark()
        }
        Spacer(minLength: 0)
      }
      .padding(.leading, 14 + fold.frame.left)
      .padding(.bottom, 10)
      .opacity(fade)
    }
    .overlay(alignment: .top) {
      /* No words on the cover (owner, 2026-11-12: "不要 drag to spin 文案，就让用户去探索 … 最多就是
         苹果的那种上下箭头"). The only hint is an arrow, and only while the page is being pulled:
         it comes in with the pull and pops when letting go would open the planet page.
         WHERE: over her head with a gap, never on it. She stands on top of the planet, about 11pt
         under the status bar at rest, and goes down by about 0.29 of the pull as the scene grows
         (measured on a recording, 2026-11-12: the first build drew the arrow on her head like a
         pair of feelers). So the arrow rides about 12pt above her, and stays unseen for the first 40pt of
         the pull, while that place is still behind the clock or the island. */
      let p = min(1, max(0, (pull - 40) / (KMeCoverMetrics.open - 40)))
      KLineIcon(.chevronDown, size: 20, lineWidth: 2.6, color: palette.ink)
        .opacity(Double(p) * 0.85)
        .scaleEffect(p >= 1 ? 1.3 : 0.8 + 0.2 * p, anchor: .top)
        .animation(.spring(response: 0.25, dampingFraction: 0.6), value: p >= 1)
        .padding(.top, topInset - 19 + pull * 0.29)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
    .clipped()
    .accessibilityElement(children: .contain)
  }

  private func entry<Mark: View>(_ e: KMeCoverEntry, night: Bool, action: @escaping () -> Void, @ViewBuilder mark: () -> Mark) -> some View {
    SwiftUI.Button(action: action) {
      HStack(spacing: 6) {
        mark()
        Text(e.count)
          .kText(.mono(13, .bold, tracking: 0.04))
          .monospacedDigit()
          .foregroundStyle(night ? Color.white : KBrand.inkOnBrand)
          .lineLimit(1)
      }
      .padding(.leading, 7)
      .padding(.trailing, 11)
      .frame(height: 34)
      .background(RoundedRectangle(cornerRadius: 11, style: .continuous).fill(Color.white.opacity(night ? 0.16 : 0.72)))
      // 44 to the finger
      .padding(.vertical, 5)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(e.a11y)
    .accessibilityHint(e.hint)
  }
}

/// Two of your stamps, fanned.
struct KMeStampsMark: View {
  let fan: [KMeStampCell]

  var body: some View {
    let two = Array(fan.prefix(2))
    ZStack(alignment: .leading) {
      if two.count > 1 {
        KStamp(id: two[1].id, width: 15, dark: false, fallbackHex: two[1].hex.isEmpty ? nil : two[1].hex)
          .rotationEffect(.degrees(9))
          .offset(x: 10, y: 1)
      }
      if let first = two.first {
        KStamp(id: first.id, width: 15, dark: false, fallbackHex: first.hex.isEmpty ? nil : first.hex)
          .rotationEffect(.degrees(-9))
          .offset(x: 1)
      }
    }
    .frame(width: two.count > 1 ? 28 : 18, height: 24, alignment: .leading)
    .accessibilityHidden(true)
  }
}

/// A small red postbox: its dome, its slot, its plate, its foot.
struct KMePostboxMark: View {
  var body: some View {
    Canvas { ctx, _ in
      let roof = Color(hex: "#D2574A")
      let body = Color(hex: "#E46A5A")
      ctx.fill(Path(roundedRect: CGRect(x: 3, y: 6, width: 16, height: 14), cornerRadius: 1.5), with: .color(body))
      var dome = Path()
      dome.move(to: CGPoint(x: 1.5, y: 8.5))
      dome.addQuadCurve(to: CGPoint(x: 20.5, y: 8.5), control: CGPoint(x: 11, y: -4.5))
      dome.closeSubpath()
      ctx.fill(dome, with: .color(roof))
      ctx.fill(Path(roundedRect: CGRect(x: 6, y: 10.5, width: 10, height: 2.6), cornerRadius: 1.3), with: .color(KBrand.inkOnBrand))
      ctx.fill(Path(roundedRect: CGRect(x: 7, y: 14.6, width: 8, height: 3.2), cornerRadius: 1), with: .color(.white.opacity(0.92)))
      ctx.fill(Path(roundedRect: CGRect(x: 1.5, y: 19.5, width: 19, height: 3), cornerRadius: 1.5), with: .color(roof))
    }
    .frame(width: 22, height: 24)
    .accessibilityHidden(true)
  }
}

/// Edit's and the gear's names as the band's tools (KRailTools), in the order it takes them.
enum KMeTool {
  static let edit = "me.edit"
  static let settings = "me.settings"
}

/// You, under the cover: your name, the mark-and-sign pill, two numbers, Edit and the gear; your
/// face half over the cover's edge.
struct KMeIdentity<Avatar: View>: View {
  let theme: KTheme
  let profile: KMeProfile
  let me: KMeSelf
  let settingsLabel: String
  let actions: KMeActions
  /// Edit and the gear stand in the band on a folding phone (KRailTools): left out of this row
  var taken: Set<String> = []
  let avatar: Avatar

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(profile.name)
        .kText(.system(24, .bold))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .padding(.trailing, KMeCoverMetrics.face + 24)
        .accessibilityAddTraits(.isHeader)
      if !me.mark.isEmpty || !me.sign.isEmpty {
        pill.padding(.top, 9)
      }
      Capsule().fill(theme.line).frame(width: 28, height: 2)
        .padding(.top, 14)
        .accessibilityHidden(true)
      HStack(alignment: .center, spacing: 30) {
        ForEach(me.stats) { stat in
          SwiftUI.Button(action: { tap(stat.key) }) {
            VStack(spacing: 6) {
              Text(stat.count)
                .kText(.system(20, .semibold))
                .monospacedDigit()
                .foregroundStyle(theme.ink)
              Text(stat.unit)
                .kText(.system(13))
                .foregroundStyle(theme.mute)
            }
            .lineLimit(1)
            .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(stat.a11yLabel)
          .accessibilityHint(stat.hint)
          .accessibilityAddTraits(.isButton)
        }
        Spacer(minLength: 0)
        HStack(spacing: 8) {
          if !taken.contains(KMeTool.edit) {
          SwiftUI.Button(action: { actions.onEdit() }) {
            HStack(spacing: 6) {
              KLineIcon(.pen, size: 15, lineWidth: 1.9, color: theme.ink)
              Text(me.edit)
                .kText(.system(14, .semibold))
                .foregroundStyle(theme.ink)
                .lineLimit(1)
            }
            .padding(.leading, 14)
            .padding(.trailing, 18)
            .frame(height: 36)
            .background(Capsule().strokeBorder(theme.line, lineWidth: 1))
            .padding(.vertical, 4)
            .contentShape(Rectangle())
            .fixedSize()
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityLabel(profile.editLabel)
          }
          if !taken.contains(KMeTool.settings) {
          SwiftUI.Button(action: { actions.onSettings() }) {
            KLineIcon(.gear, size: 19, lineWidth: 1.9, color: theme.ink)
              .frame(width: 36, height: 36)
              .background(Circle().strokeBorder(theme.line, lineWidth: 1))
              .padding(4)
              .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityLabel(settingsLabel)
          }
        }
        // the row is as tall with them gone as with them there
        .frame(minHeight: 44)
      }
      .padding(.top, 12)
    }
    .padding(.horizontal, 16)
    .padding(.top, 12)
    // room between Edit / the gear and her card (owner on build 42: "太近了", 14 → 26; then, with
    // 26 on his simulator, "还是和设置什么的贴的太近": 40, so the card sits a clear step below them)
    .padding(.bottom, 40)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(theme.bg)
    .overlay(alignment: .topTrailing) {
      // your face: drawn at the island's 72 and scaled (KMeScreen.avatarIsland), with no ring
      SwiftUI.Button(action: { actions.onEdit() }) {
        avatar
          .frame(width: 72, height: 72)
          .scaleEffect(KMeCoverMetrics.face / 72)
          .frame(width: KMeCoverMetrics.face, height: KMeCoverMetrics.face)
          .contentShape(Circle())
      }
      .buttonStyle(KFadePressStyle())
      .accessibilityLabel(profile.editLabel)
      .padding(.trailing, 16)
      .offset(y: -KMeCoverMetrics.faceOver)
    }
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }

  private var pill: some View {
    HStack(spacing: 5) {
      if me.mark == "he" || me.mark == "she" {
        ZStack {
          Circle().fill(me.mark == "she" ? KMarkTint.she : KMarkTint.he)
          KLineIcon(me.mark == "she" ? .she : .he, size: 12, lineWidth: 2.6, color: .white)
        }
        .frame(width: 17, height: 17)
      }
      if !me.sign.isEmpty {
        Text(me.sign)
          .font(.system(size: 15))
        Text(me.signName)
          .kText(.system(13, .medium))
          .foregroundStyle(theme.sub)
          .lineLimit(1)
      }
    }
    .padding(.leading, 6)
    .padding(.trailing, 11)
    .frame(height: 28)
    .background(Capsule().fill(theme.soft2))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(me.signA11y)
  }

  private func tap(_ key: String) {
    switch key {
    case "notes": actions.onNotes()
    case "kindreds": actions.onOpenKindreds()
    default: actions.onSeeAll()
    }
  }
}

/// What the cover folds into once it has scrolled away: the sky's own colours, your name, the
/// pen and the gear.
struct KMeCoverBar: View {
  let palette: KCourierPalette
  let name: String
  let editLabel: String
  let settingsLabel: String
  let topInset: CGFloat
  /// 0 while the cover shows, 1 once it has gone
  let shown: CGFloat
  let actions: KMeActions
  /// the pen and the gear stand in the band on a folding phone (KRailTools): left out of the bar
  var taken: Set<String> = []

  var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      HStack(spacing: 6) {
        Text(name)
          .kText(.system(17, .semibold))
          .foregroundStyle(palette.text)
          .lineLimit(1)
        Spacer(minLength: 8)
        if !taken.contains(KMeTool.edit) {
          SwiftUI.Button(action: { actions.onEdit() }) {
            KLineIcon(.pen, size: 20, lineWidth: 1.9, color: palette.text)
              .frame(width: 40, height: 44)
              .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityLabel(editLabel)
        }
        if !taken.contains(KMeTool.settings) {
          SwiftUI.Button(action: { actions.onSettings() }) {
            KLineIcon(.gear, size: 20, lineWidth: 1.9, color: palette.text)
              .frame(width: 40, height: 44)
              .contentShape(Rectangle())
          }
          .buttonStyle(KFadePressStyle())
          .accessibilityLabel(settingsLabel)
        }
      }
      // the bar is as tall with them gone as with them there
      .frame(minHeight: 44)
      .padding(.leading, 16)
      .padding(.trailing, 6)
      .frame(height: KMeCoverMetrics.bar)
    }
    .background(LinearGradient(colors: [palette.sky0, palette.sky1], startPoint: .top, endPoint: .bottom))
    .opacity(shown)
    .allowsHitTesting(shown > 0.5)
    .accessibilityHidden(shown <= 0.5)
  }
}
