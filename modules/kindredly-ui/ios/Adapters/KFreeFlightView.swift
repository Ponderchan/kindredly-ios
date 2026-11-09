import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 FREE FLIGHT as React Native sees it (batch 3, 2026-11-09; the "freeflight" switch, off by
 default). The game itself is Portable/Courier/KFreeFlight.swift, a port of src/components/
 FreeFlightGame.tsx; the courier page draws it on its cover (KCourierView's `flight` record, built
 by src/screens/courier/CourierNative.tsx) instead of handing the page to React Native.

 KFreeFlightRecord is that record, shared by both views. <KFreeFlightView flight … /> (modules/
 kindredly-ui/src/FreeFlight.tsx) is the game on its own: TS asks isKindredlyUIViewAvailable for
 this name before it turns the switch's Swift path on (a binary without it would ignore the record
 and report Play as before), and a dev page can show the course alone. It needs an @expo/ui
 <Host>; KScreenProps for the theme and the image loader (her snapshots are KImages). No commands.

 The record (KFreeFlightData in TS), colours "#RRGGBB" (anything else takes the day sky's):
 - on      KCourierView only: the game is Swift's (false keeps Play reporting onCrPlay as before)
 - open    KCourierView only: TS says the game is open (Play, ?play=1)
 - hour    morning | day | evening | night (which pangram she starts on); unknown reads as day
 - height  the course's height (WrenHome playH); top the header's room above the sentence (44)
 - sky0 sky1 scrim pillarInk land forest sun ("" none) moon stars night
 - curious happy worry   her three snapshots at 46 (bird-images ff-<stage>-<mood>)
 - best    the best run kept on this phone (gates)
 - strings the ff.* words, "{letter}" and "{n}" left for Swift to fill

 Events (this view; the courier page has its own onCrPlayEnd and onCrFlightRun):
 - onFfClose {}               the ×
 - onFfRun { gates, pace }    a run ended: TS saves it (lib/free-flight saveRun)
 */

/// "#RRGGBB" as a Color, or `fallback` for anything else (Color(hex:) shows magenta for junk).
func kFlightColor(_ hex: String, _ fallback: String) -> Color {
  let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
  guard digits.count == 6, digits.allSatisfy(\.isHexDigit) else { return Color(hex: fallback) }
  return Color(hex: digits)
}

struct KFreeFlightStringsRecord: Record {
  @Field var done: String = ""
  @Field var faster: String = ""
  @Field var title: String = ""
  @Field var takeoff: String = ""
  @Field var hint: String = ""
  @Field var best: String = ""
  @Field var newBest: String = ""
  @Field var crashTitle: String = ""
  @Field var statGates: String = ""
  @Field var statLetters: String = ""
  @Field var statAccuracy: String = ""
  @Field var statPace: String = ""
  @Field var again: String = ""
  @Field var anyKey: String = ""

  var strings: KFreeFlightStrings {
    var s = KFreeFlightStrings()
    s.done = done
    s.faster = faster
    s.title = title
    s.takeoff = takeoff
    s.hint = hint
    s.best = best
    s.newBest = newBest
    s.crashTitle = crashTitle
    s.statGates = statGates
    s.statLetters = statLetters
    s.statAccuracy = statAccuracy
    s.statPace = statPace
    s.again = again
    s.anyKey = anyKey
    return s
  }
}

struct KFreeFlightRecord: Record {
  @Field var on: Bool = false
  @Field var open: Bool = false
  @Field var hour: String = "day"
  @Field var height: Double = 320
  @Field var top: Double = 44
  @Field var sky0: String = "#BFE3F8"
  @Field var sky1: String = "#E3F3FB"
  @Field var scrim: String = "#ADDBB5"
  @Field var pillarInk: String = "#1F5C33"
  @Field var land: String = "#9CD48C"
  @Field var forest: String = "#3F8F52"
  /// "" for no sun
  @Field var sun: String = ""
  @Field var moon: Bool = false
  @Field var stars: Bool = false
  @Field var night: Bool = false
  @Field var curious: KImageRefRecord = KImageRefRecord()
  @Field var happy: KImageRefRecord = KImageRefRecord()
  @Field var worry: KImageRefRecord = KImageRefRecord()
  @Field var best: Int = 0
  @Field var strings: KFreeFlightStringsRecord = KFreeFlightStringsRecord()

  var content: KFreeFlightContent {
    var c = KFreeFlightContent()
    c.hour = KFreeFlightHour(rawValue: hour) ?? .day
    c.height = CGFloat(max(120, height))
    c.top = CGFloat(max(0, top))
    c.sky0 = kFlightColor(sky0, "#BFE3F8")
    c.sky1 = kFlightColor(sky1, "#E3F3FB")
    c.scrim = kFlightColor(scrim, "#ADDBB5")
    c.pillarInk = kFlightColor(pillarInk, "#1F5C33")
    c.land = kFlightColor(land, "#9CD48C")
    c.forest = kFlightColor(forest, "#3F8F52")
    c.sun = sun.isEmpty ? nil : kFlightColor(sun, "#FFD54A")
    c.moon = moon
    c.stars = stars
    c.night = night
    c.curious = curious.ref
    c.happy = happy.ref
    c.worry = worry.ref
    c.best = max(0, best)
    c.strings = strings.strings
    return c
  }
}

final class KFreeFlightViewProps: KScreenProps {
  @Field var flight: KFreeFlightRecord = KFreeFlightRecord()

  var onFfClose = EventDispatcher()
  var onFfRun = EventDispatcher()
}

/// The game on its own (a dev page; the binary's marker for Free Flight in Swift).
struct KFreeFlightView: ExpoSwiftUI.View {
  @ObservedObject var props: KFreeFlightViewProps

  var body: some View {
    GeometryReader { g in
      KFreeFlight(
        content: props.flight.content,
        width: g.size.width,
        onClose: { props.onFfClose() },
        onRun: { gates, pace in props.onFfRun(["gates": gates, "pace": pace]) }
      )
    }
    .kScreenEnvironment(props)
  }
}
