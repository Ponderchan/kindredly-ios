import SwiftUI
import UIKit

struct Sheet: View {
  let skins: [KWrenSkin] = [.sticker, .moss, .plush, .peach, .ink]
  let moods: [KWrenMood] = [.content, .happy, .listen, .sleepy, .curious, .delight, .think, .wink, .worry]
  let pieces: [KWrenAccessory] = [.none, .beanie, .scarf, .phones, .flower, .party, .shades, .witch, .ghost]
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) { ForEach(skins, id: \.self) { s in KWrenBird(KWrenLook(skin: s), size: 92) } ; ForEach(skins, id: \.self) { s in KWrenBird(KWrenLook(skin: s, pose: .fly), size: 92) } }
      HStack(spacing: 6) { ForEach(moods, id: \.self) { m in KWrenBird(KWrenLook(mood: m), size: 92) } }
      HStack(spacing: 6) { ForEach(pieces, id: \.self) { a in KWrenBird(KWrenLook(accessory: a), size: 92) } }
      HStack(spacing: 6) { ForEach(moods, id: \.self) { m in KWrenBird(KWrenLook(stage: .hatch, mood: m), size: 92) } }
      HStack(spacing: 6) {
        KWrenBird(KWrenLook(stage: .egg), size: 92); KWrenBird(KWrenLook(stage: .hatch, accessory: .beanie), size: 92); KWrenBird(KWrenLook(stage: .fledge), size: 92); KWrenBird(KWrenLook(stage: .fledge, accessory: .scarf), size: 92)
        KWrenBird(KWrenLook(pose: .fly, accessory: .phones), size: 92); KWrenBird(nolet, size: 92); KWrenBird(wilt, size: 92); KWrenBird(shaped, size: 92); KWrenBird(KWrenLook(), size: 18); KWrenBird(outlined, size: 92)
      }
    }.padding(10).background(Color(red: 0.89, green: 0.95, blue: 0.98))
  }
  var nolet: KWrenLook { var l = KWrenLook(pose: .fly); l.letter = false; return l }
  var wilt: KWrenLook { var l = KWrenLook(); l.wilt = true; return l }
  var outlined: KWrenLook { var l = KWrenLook(); l.outlined = true; return l }
  var shaped: KWrenLook { var l = KWrenLook(stage: .hatch, mood: .curious); var f = KHatchlingForm(); f.bodyStretch = 1.12; f.eyeScale = 1.2; f.eyeSpread = 3; f.crestLift = 6; f.tail = true; f.beakScale = 1.2; l.form = f; l.mark = "#E8A63C"; return l }
}

@main
struct Main {
  @MainActor static func main() {
    let r = ImageRenderer(content: Sheet())
    r.scale = 2
    guard let img = r.uiImage, let data = img.pngData() else { print("render failed"); exit(1) }
    try! data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
    print("wrote", img.size)
  }
}
