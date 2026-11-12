import SwiftUI
import UIKit
#if canImport(KPortable)
@testable import KPortable
#endif

/* (spread copy) Today after fifteen on the iPhone Duo's inner screen, 951 x 669, two pages.
   Today after fifteen: the three pages, state by state (docs/today-after-fifteen.md).
   One sheet per argument, four or five phones each, 393 × 852 at 2x:
     design/courier-planet/checks/render-fast.sh design/today-after-fifteen/checks/after-sheet.swift <out dir>
   writes box.png (the mailbox: open, shut with a fact, shut with a line kept, a thin day),
   receipt.png (idle, printed for the day, torn for the week, the shared picture),
   bed.png (awake, fed and patted, asleep with a fact, asleep with a line),
   themes.png (Lavender, Paper and Midnight for each page) and small.png (an iPhone SE's height,
   the sheets kept beside this file are those, as lighter .jpg (sips -s format jpeg -Z 2400):
   the longest words, and a courier who can't play). Dynamic Type is not drawn here (a still
   takes the default size whatever it is told): it is checked on a device.
   The copy here is the English of src/data/strings-after.ts as it stood when the sheet was made;
   the numbers are samples. Nothing moves in a still: bobbing, the z's, the hearts and the feed
   are checked on a device. */

func fact() -> KAfterThing {
  var t = KAfterThing()
  t.tag = "POND’S FACT · NO. 12"
  t.body = "The first postage stamp, the Penny Black, went on sale in 1840. Before it, whoever got the letter usually paid."
  t.foot = "BRITAIN · 1840"
  t.keep = "KEEP"
  t.kept = "KEPT ✦"
  t.keepStub = "Keep the stub"
  t.keptStub = "Kept ✦"
  return t
}

func line() -> KAfterThing {
  var t = fact()
  t.isLine = true
  t.tag = "LINE OF THE DAY"
  t.body = "“I still set two cups out.”"
  t.foot = "NO.6059 · #MISSING"
  return t
}

func base(_ page: KAfterPage) -> KAfterContent {
  var c = KAfterContent()
  c.page = page
  c.title = "Today"
  c.thing = fact()
  c.strip.eyebrow = "POND’S OFF THE CLOCK"
  c.strip.title = "Fly a lap with Pond"
  c.box.line = "“that’s 10. i counted twice.”"
  c.box.sub = "You wrote back to 2."
  c.box.hint = "PULL THE CORD →"
  c.box.pinned = "I pinned something to the shutter."
  c.box.slot = "THE SLOT STAYS OPEN · DROP A LETTER"
  c.box.slotOpening = "OPENING YOUR LETTER PAPER…"
  c.box.eyebrow = "THAT’S ALL FOR TODAY"
  c.box.closed = "Closed"
  c.box.back = "BACK AT 8:00 AM"
  c.box.countdown = "16H 40M"
  c.box.pull = "PULL"
  c.box.lift = "LIFT"
  c.receipt.line = "“that’s 10. there’s a little extra at the bottom.”"
  c.receipt.shop = "KINDREDLY POST"
  c.receipt.stampLine = "NOV 11 · 3:19 PM · COURIER POND"
  c.receipt.rows = [
    KAfterRow(id: "read", label: "LETTERS READ", value: "10"),
    KAfterRow(id: "replied", label: "WRITTEN BACK", value: "2"),
    KAfterRow(id: "stay", label: "YOU STAYED ON", value: "#ALMOSTS"),
  ]
  c.receipt.delivery = [
    KAfterRow(id: "next", label: "NEXT DELIVERY", value: "8:00 AM"),
    KAfterRow(id: "back", label: "POND IS BACK IN", value: "16H 40M", strong: true),
  ]
  c.receipt.print = "Print today’s receipt"
  c.receipt.printing = "PRINTING…"
  c.receipt.tear = "Tear it off"
  c.receipt.share = "Share my day"
  c.bed.sayIdle = "“that’s 10. i’m wrecked.”"
  c.bed.sayFed = "“10 letters is hungry work. thanks.”"
  c.bed.snack = KAfterStep(label: "Snack", sub: "a few seeds", subDone: "fed")
  c.bed.pat = KAfterStep(label: "Pat", sub: "one, gently", subDone: "patted")
  c.bed.lights = KAfterStep(label: "Lights out", sub: "then she sleeps", subDone: "asleep")
  c.bed.lockedSub = "after 1 and 2"
  c.bed.sleepTag = "POND, TALKING IN HER SLEEP"
  c.bed.streak = "5 days in a row"
  c.bed.streakSub = "tonight makes 6"
  c.bed.streakDone = "6 days in a row"
  c.bed.streakSubDone = "see you at 8"
  c.bed.next = "next letters"
  c.bed.nextAt = "8:00 AM"
  let letters = ["F", "S", "S", "M", "T", "W", "T"]
  c.bed.dots = letters.enumerated().map { i, l in KAfterDot(id: "\(i)", letter: l, on: i != 0, tonight: i == 6) }
  return c
}

func week(_ c: KAfterContent) -> KAfterContent {
  var c = c
  c.receipt.line = "“that’s the week. there’s a little extra at the bottom.”"
  c.receipt.stampLine = "NOV 9 – NOV 15 · COURIER POND"
  c.receipt.rows = [
    KAfterRow(id: "read", label: "LETTERS READ", value: "92"),
    KAfterRow(id: "replied", label: "WRITTEN BACK", value: "11"),
    KAfterRow(id: "stay", label: "YOU STAYED ON", value: "#ALMOSTS"),
  ]
  c.receipt.print = "Print this week’s receipt"
  c.receipt.share = "Share my week"
  return c
}

func sleepTalk(_ c: KAfterContent) -> KAfterContent {
  var c = c
  c.thing.body = "“…The first postage stamp, the Penny Black, went on sale in 1840… Before it, whoever got the letter usually paid…”"
  return c
}

struct Phone: View {
  let content: KAfterContent
  var theme = KTheme.classic
  var height: CGFloat = 852
  var label = ""

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(label).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color(red: 0.12, green: 0.11, blue: 0.21))
      screen
        .frame(width: 393, height: height)
        .clipShape(RoundedRectangle(cornerRadius: 44, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 44, style: .continuous).stroke(Color(red: 0.84, green: 0.82, blue: 0.9), lineWidth: 2))
    }
  }

  var screen: some View {
    var s = KAfterScreen(theme: theme, content: content, topInset: height < 700 ? 20 : 54, bottomInset: 90)
    s.scrolls = false
    return s
      .environment(\.colorScheme, theme.isDark ? .dark : .light)
  }
}

@MainActor func write<V: View>(_ view: V, _ path: String) {
  let r = ImageRenderer(content: view.padding(24).background(Color(red: 0.93, green: 0.93, blue: 0.95)))
  r.scale = 2
  guard let img = r.uiImage, let data = img.pngData() else { print("render failed", path); exit(1) }
  try! data.write(to: URL(fileURLWithPath: path))
  print("wrote", path, img.size)
}


struct Inner: View {
  let content: KAfterContent
  var theme = KTheme.classic
  var label = ""
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(label).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color(red: 0.12, green: 0.11, blue: 0.21))
      ZStack(alignment: .trailing) {
        screen.frame(width: 951 - 84, height: 669).frame(width: 951, alignment: .leading)
        // the system's band, as the rail stands in it
        Rectangle().fill(Color.black.opacity(0.06)).frame(width: 84)
      }
      .frame(width: 951, height: 669)
      .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
      .overlay(RoundedRectangle(cornerRadius: 30, style: .continuous).stroke(Color(red: 0.84, green: 0.82, blue: 0.9), lineWidth: 2))
    }
  }
  var screen: some View {
    var s = KAfterScreen(theme: theme, content: content, topInset: 14, bottomInset: 20)
    s.scrolls = false
    return s.environment(\.colorScheme, theme.isDark ? .dark : .light)
  }
}

@main
struct Main {
  @MainActor static func main() {
    let dir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."
    var f = KFoldFrame()
    f.duo = true; f.posture = "open"; f.band = 84; f.bandTop = 124; f.right = 84
    f.crease = 475.5; f.rightEnd = 951 - 84
    KFold.shared.set(f)
    var shut = base(.box); shut.box.shut = true
    var printed = base(.receipt); printed.receipt.phase = .printed
    var ready = base(.bedtime); ready.bed.fed = true; ready.bed.patted = true
    write(VStack(alignment: .leading, spacing: 24) {
      HStack(alignment: .top, spacing: 24) {
        Inner(content: base(.box), label: "inner · mailbox open")
        Inner(content: shut, label: "inner · mailbox shut")
      }
      HStack(alignment: .top, spacing: 24) {
        Inner(content: printed, label: "inner · receipt printed")
        Inner(content: ready, label: "inner · bedtime")
      }
      HStack(alignment: .top, spacing: 24) {
        Inner(content: printed, theme: .midnight, label: "inner · receipt · Midnight")
        Inner(content: base(.bedtime), theme: .midnight, label: "inner · bedtime · Midnight")
      }
    }, "\(dir)/spread.png")
  }
}
