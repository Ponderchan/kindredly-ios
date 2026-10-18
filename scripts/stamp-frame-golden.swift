/* The Swift stamp frame's lock (modules/kindredly-ui/ios/Portable/Kit/KStampFrame.swift, the port
   of src/lib/stamp-frame.ts). The module has no test target, so this is a small program compiled
   on the Mac with the two Portable files it needs (both import SwiftUI only) and run by hand from
   the repo root:

     xcrun swiftc -parse-as-library -target arm64-apple-macos14 \
       modules/kindredly-ui/ios/Portable/Kit/KStampFrame.swift \
       modules/kindredly-ui/ios/Portable/Kit/KLineGlyph.swift \
       scripts/stamp-frame-golden.swift -o "$TMPDIR/stamp-frame-golden" \
       && "$TMPDIR/stamp-frame-golden" design/stamps-v2/golden.json

   It reads design/stamps-v2/golden.json, the goldens src/lib/stamp-frame.test.ts locks the
   TypeScript to (and rewrites with --write-golden), and checks, in order: every tier's rules and
   its perforated silhouette string against the golden path, character for character (stamp-spec
   §2.11: every renderer must produce the same strings); KStampShape's drawn path (the string read
   by KSVGPath) on the box, its bites and notches; the tier table; the tilt (FNV-1a 32 of the
   letter id); the colour mixing (half up). Then, from the TS test's own numbers, the keyline and
   rim, the stroke floor and the ladder entries the Swift placements use (no postmark: the owner
   took it off on 2026-10-18). Every line prints ok/FAIL and the exit status is non-zero if any
   fail.

   `--dump` after the golden file also prints, as JSON, the ladder this file computes, to compare
   with stamp-frame.ts's STAMP_LADDER. */

import Foundation
import SwiftUI

@main
enum StampFrameGolden {
  static var fails = 0

  static func ok(_ name: String, _ cond: Bool) {
    print((cond ? "ok  " : "FAIL") + " " + name)
    if !cond { fails += 1 }
  }

  static func main() {
    let args = CommandLine.arguments.dropFirst()
    guard let file = args.first(where: { !$0.hasPrefix("--") }) else {
      print("usage: stamp-frame-golden design/stamps-v2/golden.json [--dump]")
      exit(2)
    }
    guard let data = FileManager.default.contents(atPath: file),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      print("FAIL can't read \(file) as JSON")
      exit(1)
    }

    // ── the box ──
    if let box = json["box"] as? [Double] {
      ok("the box is 0 0 100 120", box == [0, 0, 100, 120] && KStampFrame.box == CGRect(x: 0, y: 0, width: 100, height: 120))
    } else {
      ok("golden.json has the box", false)
    }

    // ── the silhouettes ──
    let silhouettes = json["silhouette"] as? [String: [String: Any]] ?? [:]
    ok("golden.json has six silhouettes", silhouettes.count == 6)
    for tier in KStampTier.allCases where tier != .dot {
      guard let g = silhouettes[tier.rawValue], let path = g["path"] as? String,
            let nx = g["nx"] as? Int, let ny = g["ny"] as? Int,
            let r = (g["r"] as? NSNumber)?.doubleValue, let minWidth = (g["minWidth"] as? NSNumber)?.doubleValue
      else {
        ok("\(tier.rawValue): in golden.json", false)
        continue
      }
      let spec = KStampFrame.spec(tier)
      ok("\(tier.rawValue): nx \(nx) ny \(ny) r \(r) from \(minWidth)pt",
         spec.nx == nx && spec.ny == ny && Double(spec.r) == r && Double(spec.minWidth) == minWidth)
      let swift = KStampFrame.silhouetteData(tier)
      ok("\(tier.rawValue): silhouetteData = the golden path (\(path.count) characters)", swift == path)
      if swift != path {
        let a = Array(swift), b = Array(path)
        let at = (0..<min(a.count, b.count)).first { a[$0] != b[$0] } ?? min(a.count, b.count)
        print("     first difference at \(at): swift …\(String(a[max(0, at - 20)..<min(a.count, at + 20)]))…")
        print("                          golden …\(String(b[max(0, at - 20)..<min(b.count, at + 20)]))…")
      }
      ok("\(tier.rawValue): silhouetteData(width: \(minWidth)) = the golden path", KStampFrame.silhouetteData(width: CGFloat(minWidth)) == path)

      // the drawn path: KSVGPath reading that string, as KStampShape draws it
      let drawn = KStampShape(tier: tier).path(in: KStampFrame.box)
      let bounds = drawn.boundingRect
      ok("\(tier.rawValue): KStampShape spans the box (0 0 100 120)",
         abs(bounds.minX) < 1e-6 && abs(bounds.minY) < 1e-6 && abs(bounds.maxX - 100) < 1e-6 && abs(bounds.maxY - 120) < 1e-6)
      var moves = 0, lines = 0, curves = 0, closes = 0, quads = 0
      drawn.forEach { el in
        switch el {
        case .move: moves += 1
        case .line: lines += 1
        case .curve: curves += 1
        case .quadCurve: quads += 1
        case .closeSubpath: closes += 1
        }
      }
      let bites = 2 * (nx - 1) + 2 * (ny - 1)
      ok("\(tier.rawValue): one closed outline, \(bites) bites in two curves each and four corner notches in one",
         moves == 1 && closes == 1 && quads == 0 && lines == 2 * (nx + ny) && curves == 2 * bites + 4)
      let pitch = 100.0 / Double(nx)
      ok("\(tier.rawValue): the paper is inside, the bites and corners are cut out",
         drawn.contains(CGPoint(x: 50, y: 60)) && !drawn.contains(CGPoint(x: 0.2, y: 0.2))
           && !drawn.contains(CGPoint(x: pitch, y: r * 0.5)) && !drawn.contains(CGPoint(x: 100 - r * 0.5, y: 120 - pitch))
           && drawn.contains(CGPoint(x: pitch / 2, y: r * 0.5)))
      // the drawn shape scales into any rect
      let at50 = KStampShape(width: 50).path(in: CGRect(x: 0, y: 0, width: 50, height: 60)).boundingRect
      if tier == .m { ok("m: KStampShape(width: 50) fills 50 × 60", abs(at50.width - 50) < 1e-6 && abs(at50.height - 60) < 1e-6) }
    }
    ok("below 15pt there is no silhouette (the dot)", KStampFrame.silhouetteData(width: 14) == "" && KStampFrame.silhouetteData(.dot) == "" && KStampShape(tier: .dot).path(in: KStampFrame.box).isEmpty)

    // ── tiers ──
    let tierFor = json["tierFor"] as? [[Any]] ?? []
    ok("golden.json has the tier table", !tierFor.isEmpty)
    for pair in tierFor {
      guard pair.count == 2, let w = (pair[0] as? NSNumber)?.doubleValue, let t = pair[1] as? String else { ok("a tierFor pair reads", false); continue }
      ok("tier(for: \(w)) = \(t)", KStampFrame.tier(for: CGFloat(w)).rawValue == t)
    }
    ok("tier(for: .nan) = dot", KStampFrame.tier(for: .nan) == .dot)
    ok("the tier table is in width order and starts every tier where tier(for:) does",
       KStampFrame.tiers.enumerated().allSatisfy { i, s in i == 0 || (s.minWidth > KStampFrame.tiers[i - 1].minWidth && KStampFrame.tier(for: s.minWidth) == s.tier) })

    // ── tilt ──
    let tilts = json["tilt"] as? [[Any]] ?? []
    ok("golden.json has the tilts", tilts.count >= 4)
    for pair in tilts {
      guard pair.count == 2, let id = pair[0] as? String, let deg = (pair[1] as? NSNumber)?.doubleValue else { ok("a tilt pair reads", false); continue }
      ok("tilt(\(id)) = \(deg)", KStampFrame.tilt(letterId: id) == deg)
    }
    ok("FNV-1a 32: the published vectors ('a', 'foobar'), and 0 for an empty id",
       KStampFrame.fnv1a("a") == 0xE40C_292C && KStampFrame.fnv1a("foobar") == 0xBF9C_F968 && KStampFrame.fnv1a("") == 0)

    // ── colour ──
    let colours = json["colour"] as? [[String]] ?? []
    ok("golden.json has the colours", !colours.isEmpty)
    for c in colours where c.count == 3 {
      ok("softHex(\(c[0])) = \(c[1])", KStampFrame.softHex(c[0]) == c[1])
      ok("groundHex(\(c[0])) = \(c[2])", KStampFrame.groundHex(c[0]) == c[2])
      if let rgb = KStampFrame.rgb(hex: c[0]) {
        ok("softRGB / groundRGB agree with the strings for \(c[0])",
           KStampFrame.hexString(KStampFrame.softRGB(rgb)) == c[1] && KStampFrame.hexString(KStampFrame.groundRGB(rgb)) == c[2])
      }
    }
    ok("mixHex reads lower case and a missing #", KStampFrame.mixHex("5b3b8c", "#ffffff", 0.55) == "#B5A7CB")
    ok("a colour that isn't #RRGGBB reads as the fallback tint", KStampFrame.softHex("purple") == KStampFrame.softHex("#8B7FE8"))
    ok("paper: white, Midnight #ECE9F4", KStampFrame.paperRGB(dark: false) == 0xFFFFFF && KStampFrame.paperRGB(dark: true) == 0xECE9F4)

    // ── from the TS test's own numbers (src/lib/stamp-frame.test.ts) ──
    ok("keyline light: S 0.75, M 1, L 1.25, XL 1.5pt at 40%",
       [KStampTier.s, .m, .l, .xl].map { KStampFrame.edge(dark: false, tier: $0)?.widthPt ?? 0 } == [0.75, 1, 1.25, 1.5]
         && KStampFrame.edge(dark: false, tier: .m)?.opacity == 0.4 && KStampFrame.edge(dark: false, tier: .m)?.rgb == 0x1E1B35)
    ok("no keyline at chip, XS or the dot on light", [KStampTier.chip, .xs, .dot].allSatisfy { KStampFrame.edge(dark: false, tier: $0) == nil })
    ok("dark: the 1pt paper rim at chip and XS, nothing else",
       [KStampTier.chip, .xs].allSatisfy { KStampFrame.edge(dark: true, tier: $0) == .init(kind: .rim, rgb: 0xECE9F4, opacity: 1, widthPt: 1) }
         && [KStampTier.s, .m, .l, .xl, .dot].allSatisfy { KStampFrame.edge(dark: true, tier: $0) == nil })
    ok("strokeU: 4.31 at 50, 7.5 at XS 20, 5 at S 25",
       KStampFrame.strokeU(for: 50) == 4.31 && abs(KStampFrame.strokeU(for: 20) - 7.5) < 1e-9 && abs(KStampFrame.strokeU(for: 25) - 5) < 1e-9)
    ok("the ladder: 25 placements, every one 5:6", KStampLadder.all.count == 25 && KStampLadder.all.allSatisfy { $0.h == KStampFrame.height($0.w) })
    ok("Today card 40×48 by the letter; compose corner 40×48 at 8°; tray 30; Me 80",
       KStampLadder.todayCard.w == 40 && KStampLadder.todayCard.tilt == .letter
         && KStampLadder.composeCorner.w == 40 && KStampLadder.composeCorner.degrees == 8
         && KStampLadder.trayTile.w == 30 && KStampLadder.meYourStamps.w == 80 && KStampLadder.readerHead.w == 60)
    ok("only delivered mail at M and up tilts by the letter",
       KStampLadder.all.allSatisfy { $0.tilt != .letter || KStampFrame.spec(for: $0.w).delivered })

    if args.contains("--dump") {
      var dump: [String: Any] = [:]
      dump["ladder"] = KStampLadder.all.map { p -> [String: Any] in
        let tilt: Any
        switch p.tilt {
        case let .fixed(d): tilt = d
        case .letter: tilt = "letter"
        case .scatter: tilt = "scatter"
        }
        return ["name": p.name, "w": p.w, "h": p.h, "tilt": tilt]
      }
      if let out = try? JSONSerialization.data(withJSONObject: dump, options: [.sortedKeys]), let text = String(data: out, encoding: .utf8) {
        print("DUMP " + text)
      }
    }

    print(fails > 0 ? "\n\(fails) FAILED" : "\nall ok")
    exit(fails > 0 ? 1 : 0)
  }
}
