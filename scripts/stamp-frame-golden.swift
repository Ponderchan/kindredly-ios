/* The Swift stamp frame's lock (modules/kindredly-ui/ios/Portable/Kit/KStampFrame.swift, the port
   of src/lib/stamp-frame.ts). The module has no test target, so this is a small program compiled
   on the Mac with the four Portable files it needs (all import SwiftUI only) and run by hand from
   the repo root:

     xcrun swiftc -parse-as-library -target arm64-apple-macos14 \
       modules/kindredly-ui/ios/Portable/Kit/KStampFrame.swift \
       modules/kindredly-ui/ios/Portable/Kit/KLineGlyph.swift \
       modules/kindredly-ui/ios/Portable/Kit/KStampArtData.swift \
       modules/kindredly-ui/ios/Portable/Kit/KStampArt.swift \
       scripts/stamp-frame-golden.swift -o "$TMPDIR/stamp-frame-golden" \
       && "$TMPDIR/stamp-frame-golden" design/stamps-v3/golden.json \
       && "$TMPDIR/stamp-frame-golden" design/stamps-v2/golden.json

   STAMPS v3 (2026-10-19): given design/stamps-v3/golden.json (it has "draw") it checks
   KStampArtData.v3 and KStamp's draw list (KStampPlan.drawList) per id × tier at several widths
   against the kit's own lists, element for element with literal colours; the tiers, layers and
   tilt rule; the colours and tray names; the fallback chain; the slot; that every path reads and
   that paint stays in x 3–97, y 8–120. Given the v2 golden it runs the v2 checks below (the v2
   frame is still in KStampFrame.swift until the reviewer deletes it). The ladder checks run for
   both.

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
      print("usage: stamp-frame-golden design/stamps-v3/golden.json | design/stamps-v2/golden.json [--dump]")
      exit(2)
    }
    guard let data = FileManager.default.contents(atPath: file),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      print("FAIL can't read \(file) as JSON")
      exit(1)
    }

    if json["draw"] != nil {
      v3(json)
    } else {
      v2(json)
    }

    // ── from the TS test's own numbers (src/lib/stamp-frame.test.ts) ──
    ok("the ladder: 25 placements, every one 5:6", KStampLadder.all.count == 25 && KStampLadder.all.allSatisfy { $0.h == KStampFrame.height($0.w) })
    ok("Today card 40×48 by the letter; compose corner 40×48 at 8°; tray 30; Me 80",
       KStampLadder.todayCard.w == 40 && KStampLadder.todayCard.tilt == .letter
         && KStampLadder.composeCorner.w == 40 && KStampLadder.composeCorner.degrees == 8
         && KStampLadder.trayTile.w == 30 && KStampLadder.meYourStamps.w == 80 && KStampLadder.readerHead.w == 60)
    ok("only delivered mail at M and up (v3: 40 and up) tilts by the letter",
       KStampLadder.all.allSatisfy { $0.tilt != .letter || (KStampFrame.spec(for: $0.w).delivered && KStampFrame.v3TiltsAt($0.w)) })

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

  // ── stamps v2: design/stamps-v2/golden.json (kept until the reviewer deletes v2) ──
  static func v2(_ json: [String: Any]) {
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

    ok("keyline light: S 0.75, M 1, L 1.25, XL 1.5pt at 40%",
       [KStampTier.s, .m, .l, .xl].map { KStampFrame.edge(dark: false, tier: $0)?.widthPt ?? 0 } == [0.75, 1, 1.25, 1.5]
         && KStampFrame.edge(dark: false, tier: .m)?.opacity == 0.4 && KStampFrame.edge(dark: false, tier: .m)?.rgb == 0x1E1B35)
    ok("no keyline at chip, XS or the dot on light", [KStampTier.chip, .xs, .dot].allSatisfy { KStampFrame.edge(dark: false, tier: $0) == nil })
    ok("dark: the 1pt paper rim at chip and XS, nothing else",
       [KStampTier.chip, .xs].allSatisfy { KStampFrame.edge(dark: true, tier: $0) == .init(kind: .rim, rgb: 0xECE9F4, opacity: 1, widthPt: 1) }
         && [KStampTier.s, .m, .l, .xl, .dot].allSatisfy { KStampFrame.edge(dark: true, tier: $0) == nil })
    ok("strokeU: 4.31 at 50, 7.5 at XS 20, 5 at S 25",
       KStampFrame.strokeU(for: 50) == 4.31 && abs(KStampFrame.strokeU(for: 20) - 7.5) < 1e-9 && abs(KStampFrame.strokeU(for: 25) - 5) < 1e-9)
  }

  // ── stamps v3: design/stamps-v3/golden.json (INTEGRATION.md §12) ──

  static func hex(_ v: UInt32?) -> Any {
    guard let v else { return NSNull() }
    return KStampFrame.hexString(v)
  }

  /// one golden element against one drawn element: layer, shape, colours, stroke width
  static func same(_ g: [String: Any], _ e: KStampDrawEl) -> Bool {
    guard (g["layer"] as? String) == layerName(e.layer) else { return false }
    let num = { (k: String) -> Double? in (g[k] as? NSNumber)?.doubleValue }
    switch e.shape {
    case let .path(d):
      guard g["el"] as? String == "path", g["d"] as? String == d else { return false }
    case let .circle(cx, cy, r):
      guard g["el"] as? String == "circle", num("cx") == Double(cx), num("cy") == Double(cy), num("r") == Double(r) else { return false }
    case let .ellipse(cx, cy, rx, ry):
      guard g["el"] as? String == "ellipse", num("cx") == Double(cx), num("cy") == Double(cy), num("rx") == Double(rx), num("ry") == Double(ry) else { return false }
    }
    let gf = g["fill"] as? String
    let gs = g["stroke"] as? String
    let fill = e.fill.map(KStampFrame.hexString)
    let stroke = e.stroke.map(KStampFrame.hexString)
    return gf == fill && gs == stroke && num("width") == Double(e.width)
  }

  static func layerName(_ l: KStampLayer) -> String {
    switch l {
    case .frame: return "frame"
    case .rims: return "rims"
    case .body: return "body"
    case .marks: return "marks"
    case .face: return "face"
    }
  }

  static func sameList(_ g: [[String: Any]], _ list: [KStampDrawEl]) -> (Bool, Int) {
    if g.count != list.count { return (false, min(g.count, list.count)) }
    for (i, e) in list.enumerated() where !same(g[i], e) { return (false, i) }
    return (true, -1)
  }

  static func v3(_ json: [String: Any]) {
    ok("the box is 0 0 100 120", (json["box"] as? [Double]) == [0, 0, 100, 120])
    ok("ink #1E1B35 (KStampArtData.v3Ink, KStampFrame.v3Ink)",
       json["ink"] as? String == "#1E1B35" && KStampArtData.v3Ink == 0x1E1B35FF && KStampFrame.v3Ink == 0x1E1B35)
    ok("tint mix 0.88", (json["tintMix"] as? NSNumber)?.doubleValue == 0.88 && KStampFrame.v3TintMix == 0.88 && KStampArtData.v3TintMix == 0.88)

    // ── tiers, layers, tilt, dot ──
    let layers = json["layers"] as? [String: [String]] ?? [:]
    let tilts = json["tiltsByLetter"] as? [String: Bool] ?? [:]
    let tierFor = json["tierFor"] as? [[Any]] ?? []
    ok("golden.json has the tier table", !tierFor.isEmpty && layers.count == 4)
    for pair in tierFor {
      guard pair.count == 2, let w = (pair[0] as? NSNumber)?.doubleValue, let t = pair[1] as? String else { ok("a tierFor pair reads", false); continue }
      let width = CGFloat(w)
      ok("v3Tier(for: \(w)) = \(t); layers \(layers[t] ?? []); tilts \(tilts[t] ?? false)",
         KStampFrame.v3Tier(for: width).rawValue == t
           && KStampLayer.kept(width: width).map(layerName) == (layers[t] ?? ["?"])
           && KStampFrame.v3TiltsAt(width) == (tilts[t] ?? !KStampFrame.v3TiltsAt(width)))
    }
    ok("v3Tier(for: .nan) = dot, no layers", KStampFrame.v3Tier(for: .nan) == .dot && KStampLayer.kept(width: .nan).isEmpty)
    ok("the dot is 6pt", (json["dotPt"] as? NSNumber)?.doubleValue == Double(KStampFrame.dotPt))
    ok("below 15pt nothing is drawn (the dot), its colour the hex",
       KStampPlan.drawList(id: "tiny-win", width: 14.99).isEmpty
         && KStampPlan.plan(id: "tiny-win", width: 9, fallbackHex: nil).tier == .dot
         && KStampPlan.plan(id: "tiny-win", width: 9, fallbackHex: nil).hex == (KStampArt.entries["tiny-win"].map { $0.hex >> 8 } ?? 0))

    // ── colours and the table ──
    let colours = json["colours"] as? [String: [String: String]] ?? [:]
    ok("36 stamps in the golden and in KStampArtData.v3, the same ids",
       colours.count == 36 && KStampArtData.v3.count == 36 && Set(colours.keys) == Set(KStampArt.ids))
    ok("every id once in the table", Set(KStampArt.ids).count == KStampArt.ids.count && KStampArt.entries.count == 36)
    ok("every stamp has a drawing (none drawn as the frame alone)", KStampArt.unread.isEmpty)
    for entry in KStampArtData.v3 {
      guard let c = colours[entry.id] else { ok("\(entry.id): in golden colours", false); continue }
      let h = entry.hex >> 8
      ok("\(entry.id): hex \(c["hex"] ?? "?") tint \(c["tint"] ?? "?") names \(c["nameLight"] ?? "?")/\(c["nameDark"] ?? "?")",
         KStampFrame.hexString(h) == c["hex"] && KStampFrame.hexString(entry.tint >> 8) == c["tint"]
           && KStampFrame.hexString(KStampFrame.v3Tint(h)) == c["tint"]
           && KStampFrame.hexString(entry.nameLight >> 8) == c["nameLight"] && KStampFrame.hexString(entry.nameDark >> 8) == c["nameDark"]
           && c["ink"] == "#1E1B35"
           && entry.hex & 0xFF == 0xFF && entry.tint & 0xFF == 0xFF)
    }
    let cats = json["categories"] as? [String: String] ?? [:]
    ok("the six category colours", cats.count == 6 && cats.allSatisfy { k, v in KStampArtData.v3Categories[k].map { KStampFrame.hexString($0 >> 8) } == v })

    // ── the drawings: every id × tier, and every width of the tier ──
    let draw = json["draw"] as? [String: [String: [[String: Any]]]] ?? [:]
    let widths: [String: [CGFloat]] = ["xs": [15, 20, 24.99], "s": [25, 30, 39.99], "l": [40, 60, 80, 200]]
    var drawn = 0
    for id in KStampArt.ids {
      for tier in ["xs", "s", "l"] {
        guard let g = draw[id]?[tier] else { ok("\(id) \(tier): in golden draw", false); continue }
        var all = true
        var at = ""
        for w in widths[tier] ?? [] {
          let (match, i) = sameList(g, KStampPlan.drawList(id: id, width: w))
          if !match { all = false; at = "at \(w)pt, element \(i)"; break }
        }
        ok("\(id) \(tier): \(g.count) elements = the golden list" + (all ? "" : " (differs \(at))"), all)
        drawn += g.count
      }
    }
    ok("read every element of every tier (\(drawn))", drawn > 36 * 3 * 2)

    // ── every path reads, and paint stays in x 3–97, y 8–120 ──
    let b = json["bounds"] as? [String: Double] ?? [:]
    let limit = CGRect(x: b["x0"] ?? 0, y: b["y0"] ?? 0, width: (b["x1"] ?? 0) - (b["x0"] ?? 0), height: (b["y1"] ?? 0) - (b["y0"] ?? 0))
    var empty: [String] = []
    var outside: [String] = []
    var union = CGRect.null
    for id in KStampArt.ids {
      for e in KStampPlan.drawList(id: id, width: 40) {
        let p = KStampPlan.path(e.shape)
        if p.isEmpty { empty.append(id) }
        let r = p.boundingRect.insetBy(dx: -e.width / 2, dy: -e.width / 2)
        union = union.union(r)
        if !limit.insetBy(dx: -0.05, dy: -0.05).contains(r) { outside.append(id) }
      }
    }
    ok("KSVGPath reads every path of all 36" + (empty.isEmpty ? "" : ": empty in \(Set(empty).sorted())"), empty.isEmpty)
    ok("paint stays in x 3–97, y 8–120 (drawn: \(union.integral))" + (outside.isEmpty ? "" : ": out in \(Set(outside).sorted())"), outside.isEmpty && !limit.isEmpty)

    // ── the fallback chain ──
    let unknown = json["unknown"] as? [[String: Any]] ?? []
    ok("unknown id: the frame alone in #8B7FE8 / #F1F0FC at 20, 30, 40",
       [20, 30, 40].allSatisfy { sameList(unknown, KStampPlan.drawList(id: "no-such-stamp", width: $0)).0 }
         && json["fallbackHex"] as? String == "#8B7FE8")
    let fb = KStampPlan.drawList(id: "no-such-stamp", width: 40, fallbackHex: "#0099CC")
    ok("unknown id with TS's colour: the frame in that hex's tint, ink keyline",
       fb.count == 2 && fb.allSatisfy { $0.layer == .frame } && fb[0].fill == KStampFrame.v3Tint(0x0099CC) && fb[1].stroke == 0x1E1B35)
    ok("a known id ignores TS's colour", KStampPlan.drawList(id: "tiny-win", width: 40, fallbackHex: "#000000").count == KStampPlan.drawList(id: "tiny-win", width: 40).count
         && KStampPlan.colours(id: "tiny-win", fallbackHex: "#000000").hex == KStampArt.entries["tiny-win"].map { $0.hex >> 8 })
    ok("the unknown dot is #8B7FE8", KStampPlan.plan(id: "no-such-stamp", width: 9, fallbackHex: nil).hex == 0x8B7FE8)

    // ── the empty slot ──
    let slot = json["slot"] as? [String: Any] ?? [:]
    ok("slot: the frame path, no fill, 6u dashed 4/10, round",
       slot["d"] as? String == KStampArtData.v3FramePath && slot["fill"] is NSNull
         && (slot["width"] as? NSNumber)?.doubleValue == Double(KStampArtData.v3SlotWidth)
         && (slot["dash"] as? [Double]) == KStampArtData.v3SlotDash.map(Double.init)
         && !KStampSlot.framePath.isEmpty)

    // ── the tag and the tray names ──
    ok("the #tag's words are ink in every theme; the quiet grey #B9B5D0",
       (json["tag"] as? [String: Any])?["text"] as? String == "#1E1B35" && KStampFrame.v3TagNeutral == 0xB9B5D0)
    ok("tray names: nameLight on light, nameDark on Midnight, nil for an unknown id",
       KStampArt.trayName(id: "tiny-win", dark: false) == KStampFrame.color(KStampArt.entries["tiny-win"]!.nameLight >> 8)
         && KStampArt.trayName(id: "tiny-win", dark: true) == KStampFrame.color(KStampArt.entries["tiny-win"]!.nameDark >> 8)
         && KStampArt.trayName(id: "no-such-stamp", dark: false) == nil)

    // ── tilt (unchanged, shared) ──
    ok("tilt: FNV-1a 32 published vectors, ±1/±2", KStampFrame.fnv1a("a") == 0xE40C_292C && KStampFrame.fnv1a("foobar") == 0xBF9C_F968 && KStampFrame.tilts == [-2, -1, 1, 2])
  }
}
