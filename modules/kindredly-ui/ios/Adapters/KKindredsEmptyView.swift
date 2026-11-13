import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE EMPTY KINDREDS TAB, as React Native sees it (batch 3, 2026-11-09; behind the "kindredsempty"
 switch, off by default, with src/screens/kindreds/KindredsEmpty.tsx's React Native page as the
 fallback). JS binding: modules/kindredly-ui/src/KindredsEmpty.tsx; the page is Portable/Kindreds/
 KKindredsEmpty.swift. A whole screen in one Host (SurfaceHost: flex 1, every safe area ignored);
 insets.top is the status bar, insets.tabBarRoom the floating bar's room.

 KKindredsEmptyView
 - theme, letterFont, insets (KScreenProps)
 - strings { title, status, you, heading, body, rule, cta, picks }
 - desk { name, tag, newLabel, unread, badge, ago, line, a11y, bird { uri, key, kind } }
 - bird { uri, key, kind }  (her at the edge of the sky)
 - slips [{ id, line, wash, cardWash, edge, tagFill, who, topic, body, a11y, spoken }]  catch a line: today's
   first lines (screens/kindreds/catch-model), at most six; [] is the page as it was. `who` is
   Today's own record (KTodayWhoRecord: name, sign, face, mask, frost); its mark is never read
 - strings also { catchTitle, catchSub, letGo, writeBack }
 - active: the tab is on show (the slips drift only then)
 Events: onKeWrite {} · onKeDesk {} · onKeAnswer { letterId } (WRITE BACK on an opened letter)

 This file imports ExpoUI, whose public Button, Text and Image would make bare names ambiguous, so
 nothing of that kind is written here.
 */

struct KKindredsEmptyStringsRecord: Record {
  @Field var title: String = ""
  @Field var status: String = ""
  @Field var you: String = ""
  @Field var heading: String = ""
  @Field var body: String = ""
  @Field var rule: String = ""
  @Field var cta: String = ""
  @Field var picks: String = ""
  @Field var catchTitle: String = ""
  @Field var catchSub: String = ""
  @Field var letGo: String = ""
  @Field var writeBack: String = ""
}

struct KCatchSlipRecord: Record {
  @Field var id: String = ""
  @Field var line: String = ""
  @Field var wash: String = ""
  @Field var cardWash: String = ""
  @Field var edge: String = ""
  @Field var tagFill: String = ""
  @Field var who: KTodayWhoRecord = KTodayWhoRecord()
  @Field var topic: String = ""
  @Field var body: String = ""
  @Field var a11y: String = ""
  @Field var spoken: String = ""

  var slip: KCatchSlip {
    var s = KCatchSlip()
    s.id = id
    s.line = line
    s.wash = wash
    s.cardWash = cardWash
    s.edge = edge
    s.tagFill = tagFill
    // a stranger's she/he mark stays with kindreds: whatever arrives, it is not drawn here
    var w = who.who
    w.mark = nil
    s.who = w
    s.topic = topic
    s.body = body
    s.a11y = a11y
    s.spoken = spoken
    return s
  }
}

struct KKindredsEmptyDeskRecord: Record {
  @Field var name: String = ""
  @Field var tag: String = ""
  @Field var newLabel: String = ""
  @Field var unread: Bool = false
  @Field var badge: String = ""
  @Field var ago: String = ""
  @Field var line: String = ""
  @Field var a11y: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()
  /// her avatar (Kindreds' list's picture); an empty uri: none
  @Field var avatar: KImageRefRecord = KImageRefRecord()
}

final class KKindredsEmptyViewProps: KScreenProps {
  @Field var strings: KKindredsEmptyStringsRecord = KKindredsEmptyStringsRecord()
  @Field var desk: KKindredsEmptyDeskRecord = KKindredsEmptyDeskRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var slips: [KCatchSlipRecord] = []
  @Field var active: Bool = true

  var onKeWrite = EventDispatcher()
  var onKeDesk = EventDispatcher()
  var onKeAnswer = EventDispatcher()

  var content: KKindredsEmptyContent {
    var c = KKindredsEmptyContent()
    c.title = strings.title
    c.status = strings.status
    c.you = strings.you
    c.heading = strings.heading
    c.body = strings.body
    c.rule = strings.rule
    c.cta = strings.cta
    c.picks = strings.picks
    c.bird = bird.uri.isEmpty ? nil : bird.ref
    var d = KKindredsEmptyDesk()
    d.name = desk.name
    d.tag = desk.tag
    d.newLabel = desk.newLabel
    d.unread = desk.unread
    d.badge = desk.badge
    d.ago = desk.ago
    d.line = desk.line
    d.a11y = desk.a11y
    d.bird = desk.bird.uri.isEmpty ? nil : desk.bird.ref
    d.avatar = desk.avatar.uri.isEmpty ? nil : desk.avatar.ref
    c.desk = d
    c.top = insets.top
    c.tabBarRoom = insets.tabBarRoom
    c.slips = slips.filter { !$0.id.isEmpty && !$0.line.isEmpty }.map(\.slip)
    c.catchTitle = strings.catchTitle
    c.catchSub = strings.catchSub
    c.letGo = strings.letGo
    c.writeBack = strings.writeBack
    c.active = active
    return c
  }
}

struct KKindredsEmptyView: ExpoSwiftUI.View {
  @ObservedObject var props: KKindredsEmptyViewProps

  var body: some View {
    KKindredsEmpty(
      theme: props.kTheme,
      content: props.content,
      onWrite: { props.onKeWrite([:]) },
      onDesk: { props.onKeDesk([:]) },
      onAnswer: { props.onKeAnswer(["letterId": $0]) }
    )
    .kScreenEnvironment(props)
  }
}
