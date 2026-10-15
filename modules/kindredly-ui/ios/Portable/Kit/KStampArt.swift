// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A STAMP (src/components/StampTile.tsx): the designed postage sticker, a perforated frame on
 tinted paper around the stamp's motif, drawn from the same design-set art React Native draws,
 at any size and crisp at every one. A stamp keeps its own colours in every theme: it is
 something the writer picked and stuck on, not chrome, so Midnight changes the ground around it
 and never the stamp.

     KStampArt(id: card.stampId, size: 30, fallbackHex: card.stampHex)    // in the Today card's box
     KStampArt(id: "made-my-day", size: 40, accessibilityLabel: name)       // on its own, labelled

 `id` is the stamp id as letters.stamp stores it and src/data/stamps.ts lists it ("never-told",
 not stamp-art.ts's "stamp-never-told"). TS passes the id, and the stamp's colour for the
 fallback; the drawings are Kit/KStampArtData.swift, generated from src/data/stamp-art.ts by
 scripts/gen-stamp-art-swift.mjs and read once, the first time any stamp is drawn (168 short
 paths, well under a millisecond).

 THE TILE. An id with no art, or a stamp whose art the generator couldn't read exactly
 (KStampArt.unread; the generator names each and says why; today there are none), draws
 StampTile's own fallback instead: a square of the stamp's colour at 0x22 alpha with a 1.5pt
 border of it, corners of `fallbackCorner` (default an eighth of the side, the tray's 5 on 40).
 The colour is fallbackHex when TS passes one ("#RRGGBB" or "#RRGGBBAA"), else the stamp's own
 colour from stamps.ts, else StampTile's #8B7FE8 for an id nobody knows.

 What it leaves to the caller: StampTile's faint shadow.card (0.05 at radius 3), any rotation,
 frame or selection ring. The 10a screens frame the art themselves (the Today card's 34 box, the
 compose slot's 28, the tray's ring); the gallery's STAMPS section shows each at its size.

 It is decorative unless it gets an accessibilityLabel (the stamp's name, from TS, in the
 reader's language): without one VoiceOver skips it, with one it reads as an image of that name.
 A button holding a stamp should label the button instead.
 */
public struct KStampArt: View {
  private let id: String
  private let size: CGFloat
  private let fallbackHex: String?
  private let fallbackCorner: CGFloat?
  private let accessibilityLabel: String?

  /// - Parameters:
  ///   - id: the stamp id (stamps.ts, letters.stamp)
  ///   - size: the side of the square, in points
  ///   - fallbackHex: the stamp's colour from TS, for the tinted tile ("#RRGGBB" or "#RRGGBBAA")
  ///   - fallbackCorner: the tile's corner radius; nil for an eighth of the side
  ///   - accessibilityLabel: the stamp's name, to make it an image VoiceOver reads; nil hides it
  public init(
    id: String,
    size: CGFloat,
    fallbackHex: String? = nil,
    fallbackCorner: CGFloat? = nil,
    accessibilityLabel: String? = nil
  ) {
    self.id = id
    self.size = size
    self.fallbackHex = fallbackHex
    self.fallbackCorner = fallbackCorner
    self.accessibilityLabel = accessibilityLabel
  }

  public var body: some View {
    drawing
      .frame(width: size, height: size)
      .modifier(KStampArtLabel(label: accessibilityLabel))
  }

  @ViewBuilder private var drawing: some View {
    if let art = Self.art[id] {
      Canvas { context, box in
        art.draw(in: context, size: box)
      }
    } else {
      let corner = fallbackCorner ?? size / 8
      let tint = KArtPath.color(Self.tint(id: id, fallbackHex: fallbackHex))
      RoundedRectangle(cornerRadius: corner, style: .circular)
        .fill(tint.opacity(Double(0x22) / 255))
        .overlay(RoundedRectangle(cornerRadius: corner, style: .circular).strokeBorder(tint, lineWidth: 1.5))
    }
  }

  // ── the table ──

  /// Every stamp's art, read once.
  private static let art: [String: KArt] = {
    var out: [String: KArt] = [:]
    for entry in KStampArtData.stamps {
      if let paths = entry.paths {
        out[entry.id] = KArt(grid: KStampArtData.grid, paths: paths)
      }
    }
    return out
  }()

  private static let tints: [String: UInt32] = {
    var out: [String: UInt32] = [:]
    for entry in KStampArtData.stamps where out[entry.id] == nil {
      out[entry.id] = entry.tint
    }
    return out
  }()

  /// Every stamp id the table knows, in src/data/stamps.ts order: six categories of six.
  public static let ids: [String] = KStampArtData.stamps.map(\.id)

  /// The ids drawn as their tinted tile because the generator couldn't read their art; empty
  /// while every stamp draws from its art.
  public static let unread: [String] = KStampArtData.stamps.filter { $0.paths == nil }.map(\.id)

  /// Whether this id draws its art; false means the tinted tile.
  public static func hasArt(_ id: String) -> Bool {
    art[id] != nil
  }

  /// The tile's colour: TS's hex, else the stamp's own, else StampTile's colour for an unknown id.
  static func tint(id: String, fallbackHex: String?) -> UInt32 {
    if let hex = fallbackHex, let rgba = rgba(hex: hex) { return rgba }
    return tints[id] ?? KStampArtData.unknownTint
  }

  /// "#RRGGBB" or "#RRGGBBAA" (the # optional) as 0xRRGGBBAA; nil for anything else.
  static func rgba(hex: String) -> UInt32? {
    let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard digits.count == 6 || digits.count == 8, digits.allSatisfy(\.isHexDigit), let value = UInt32(digits, radix: 16) else {
      return nil
    }
    return digits.count == 6 ? (value << 8) | 0xFF : value
  }
}

/// One stamp in the generated table (Kit/KStampArtData.swift): its id, its own colour as
/// 0xRRGGBBAA, and its art, or nil when the generator couldn't read it (drawn as the tile).
struct KStampArtEntry: Sendable {
  let id: String
  let tint: UInt32
  let paths: [KArtPath]?

  init(_ id: String, tint: UInt32, paths: [KArtPath]?) {
    self.id = id
    self.tint = tint
    self.paths = paths
  }
}

/// No label: hidden from VoiceOver. A label: one image element of that name.
private struct KStampArtLabel: ViewModifier {
  let label: String?

  @ViewBuilder
  func body(content: Content) -> some View {
    if let label {
      content
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityAddTraits(.isImage)
    } else {
      content.accessibilityHidden(true)
    }
  }
}
