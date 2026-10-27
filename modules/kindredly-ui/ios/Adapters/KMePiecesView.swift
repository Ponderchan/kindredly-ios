import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 TWO PIECES OF ME IN SWIFTUI (2026-10-27), each behind its own switch (off by default), with the
 React Native island kept for when it is off:
 - the courier's card (Portable/Me/KCourierCard.swift; "couriercard"), drawn by KMeView inside
   the courier frame instead of the "courier" island;
 - the Aura card's picture (Portable/Me/KAuraArt.swift; "auraart"), drawn by KMeView and
   KAuraRoomView in the card's art slot instead of the "auraArt" island.
 TS sends each as a record on the host view (courierCard on KMeView; auraArt on KMeView and
 KAuraRoomView): `on` false (the default, and what an older JS bundle sends by omission) keeps
 the island. The records are built by src/screens/me/me-pieces.ts from the pure models
 (src/components/courier-card-model.ts, aura-art-model.ts).

 Each piece is also its own view, <KCourierCardView card … /> and <KAuraArtView art … />
 (modules/kindredly-ui/src/MePieces.tsx), for two reasons: TS asks isKindredlyUIViewAvailable for
 these names to know this binary can draw the piece before it turns an island off (a binary
 without them would show an empty frame), and a dev page can show a piece on its own. Each needs
 an @expo/ui <Host>; both are built on KScreenProps for the theme and the Letter font (no
 commands, no insets). This file imports ExpoUI, whose public Button, Text and Image would make
 bare names ambiguous, so nothing of that kind is written here.

 Colours arrive as "#RRGGBB", "#RRGGBBAA" (a stroke with its alpha) or "" for none.
 */

/// "" → nil; "#RRGGBB" and "#RRGGBBAA" → the colour in sRGB.
func kPieceColour(_ s: String) -> Color? {
  let digits = s.hasPrefix("#") ? String(s.dropFirst()) : s
  if digits.isEmpty { return nil }
  if digits.count == 8, digits.allSatisfy(\.isHexDigit), let v = UInt32(digits, radix: 16) {
    return KArtPath.color(v)
  }
  return Color(hex: s)
}

// MARK: - The courier's card

struct KCourierPaletteRecord: Record {
  @Field var text: String = "#FFFFFF"
  @Field var scrim: String = "#2B2660"
  @Field var button: String = "#FFFFFF"
  @Field var buttonText: String = "#1E1B35"
  @Field var sky0: String = "#1E1B35"
  @Field var sky1: String = "#2E2A6B"
  @Field var sea: String = "#1F2E5E"
  @Field var land: String = "#2F5148"
  @Field var forest: String = "#1B3530"
  @Field var rock: String = "#3A3F5C"
  @Field var ink: String = "#DAD6F2"
  @Field var chip: String = "#FFFFFF"
  @Field var chipText: String = "#1E1B35"
  /// "" for none
  @Field var sun: String = ""
  @Field var sunX: Double = 0.84
  @Field var sunY: Double = 0.18
  @Field var moon: Bool = true
  @Field var stars: Bool = true
  @Field var lit: Bool = true
  /// "" for none
  @Field var cloud: String = ""

  var palette: KCourierPalette {
    var p = KCourierPalette()
    p.text = Color(hex: text)
    p.scrim = Color(hex: scrim)
    p.button = Color(hex: button)
    p.buttonText = Color(hex: buttonText)
    p.sky0 = Color(hex: sky0)
    p.sky1 = Color(hex: sky1)
    p.sea = Color(hex: sea)
    p.land = Color(hex: land)
    p.forest = Color(hex: forest)
    p.rock = Color(hex: rock)
    p.ink = Color(hex: ink)
    p.chip = Color(hex: chip)
    p.chipText = Color(hex: chipText)
    p.sun = kPieceColour(sun)
    p.sunAt = CGPoint(x: sunX, y: sunY)
    p.moon = moon
    p.stars = stars
    p.lit = lit
    p.cloud = kPieceColour(cloud)
    return p
  }
}

/// The courier card as TS sends it (src/screens/me/me-pieces.ts; KCourierCardData in TS).
struct KCourierCardRecord: Record {
  /// draw the Swift card (the host leaves its island out); false keeps the island
  @Field var on: Bool = false
  /// the loops run
  @Field var live: Bool = true
  /// morning | day | evening | night
  @Field var daylight: String = "night"
  @Field var palette: KCourierPaletteRecord = KCourierPaletteRecord()
  /// unsent | home | exploring | delivery | bringing
  @Field var state: String = "home"
  @Field var at: Double = 0.06
  @Field var playing: Bool = false
  @Field var flying: Bool = false
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var chip: String = ""
  @Field var you: String = ""
  @Field var somewhere: String = ""
  @Field var dayOffTag: String = ""
  @Field var name: String = ""
  @Field var time: String = ""
  @Field var line: String = ""
  @Field var aside: String = ""
  @Field var cta: String = ""

  var model: KCourierCardModel {
    var c = KCourierCardModel()
    c.daylight = daylight
    c.palette = palette.palette
    c.state = KCourierState(rawValue: state) ?? .home
    c.at = CGFloat(min(max(at, 0), 1))
    c.playing = playing
    c.flying = flying
    c.bird = bird.ref
    c.chip = chip
    c.you = you
    c.somewhere = somewhere
    c.dayOffTag = dayOffTag
    c.name = name
    c.time = time
    c.line = line
    c.aside = aside
    c.cta = cta
    c.live = live
    return c
  }
}

final class KCourierCardViewProps: KScreenProps {
  @Field var card: KCourierCardRecord = KCourierCardRecord()
}

/// One courier card on its own (a dev page; the binary's marker for the piece).
struct KCourierCardView: ExpoSwiftUI.View {
  @ObservedObject var props: KCourierCardViewProps

  var body: some View {
    KCourierCard(card: props.card.model)
      .kScreenEnvironment(props)
  }
}

// MARK: - The Aura card's picture

struct KDeskPaintRecord: Record {
  /// lines | pencil | sketch | colour
  @Field var fidelity: String = "lines"
  @Field var sky0: String = ""
  @Field var sky1: String = ""
  @Field var ground: String = "#FFFFFF"
  @Field var lines: String = "#1E1B35"
  @Field var brass: String = "#D8A63F"
  @Field var stroke: String = ""
  @Field var window: String = ""
  @Field var head: String = ""
  @Field var hair: String = ""
  @Field var body: String = ""
  @Field var page: String = ""
  @Field var sun: Bool = false
  @Field var sunFill: String = ""
  @Field var sunStroke: String = ""
  @Field var dots: String = ""
  @Field var dotsOpacity: Double = 1

  var paint: KDeskPaint {
    var d = KDeskPaint()
    d.fidelity = KDeskPaint.Fidelity(rawValue: fidelity) ?? .lines
    d.sky0 = kPieceColour(sky0)
    d.sky1 = kPieceColour(sky1)
    d.ground = kPieceColour(ground) ?? .white
    d.lines = kPieceColour(lines) ?? Color(hex: "#1E1B35")
    d.brass = kPieceColour(brass) ?? Color(hex: "#D8A63F")
    d.stroke = kPieceColour(stroke)
    d.window = kPieceColour(window)
    d.head = kPieceColour(head)
    d.hair = kPieceColour(hair)
    d.body = kPieceColour(body)
    d.page = kPieceColour(page)
    d.sun = sun
    d.sunFill = kPieceColour(sunFill)
    d.sunStroke = kPieceColour(sunStroke)
    d.dots = kPieceColour(dots)
    d.dotsOpacity = min(max(dotsOpacity, 0), 1)
    return d
  }
}

/// The Aura card's picture as TS sends it (src/screens/me/me-pieces.ts; KAuraArtData in TS).
struct KAuraArtRecord: Record {
  /// draw the Swift picture (the host leaves its island out); false keeps the island
  @Field var on: Bool = false
  /// picture | desk
  @Field var kind: String = "desk"
  @Field var image: KImageRefRecord = KImageRefRecord()
  @Field var inset: Double = 0
  @Field var desk: KDeskPaintRecord = KDeskPaintRecord()

  var model: KAuraArtModel {
    var a = KAuraArtModel()
    a.picture = kind == "picture"
    a.image = image.ref
    a.inset = CGFloat(max(0, inset))
    a.desk = desk.paint
    return a
  }
}

final class KAuraArtViewProps: KScreenProps {
  @Field var art: KAuraArtRecord = KAuraArtRecord()
}

/// The Aura card's picture on its own (a dev page; the binary's marker for the piece).
struct KAuraArtView: ExpoSwiftUI.View {
  @ObservedObject var props: KAuraArtViewProps

  var body: some View {
    KAuraArt(theme: props.kTheme, art: props.art.model)
      .kScreenEnvironment(props)
  }
}
