// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THEIR TURN, FOLDED (owner, 2026-10-12, kept in 10a): in ALL with no filter, the pen pals whose
 last letter is yours fold into one row.

   [face][face][face][face][face][face] +3   Their turn · 9 .............. ›

 - Up to six faces at 34, overlapping by 8, each with a 2pt ring in the page colour and the
   earlier ones on top; each face is its own button (it opens that correspondence) with
   VoiceOver's "No. 4481". With the identity switch on each face is that pen pal's frosted window
   (KFrost: a 34 square with corners of 8.5, its ring following the corners), the same window as
   on their row and in the orbit, never developing; VoiceOver hears "Sunday Kite, she, Gemini".
 - "+n" (13/600 mute) for the rest, the label (13/600 mute) and a chevron in mute: one button
   that shows PEN PALS, labelled by TS.
 - 22 in from the edges, a 1pt line under it like every row (H:65), no rule above (the row
   above already draws one: critic-kindreds, hairline joins).
 */

/// One folded face.
public struct KFoldFace: Identifiable, Equatable, Sendable {
  public let id: String
  /// FACE v1 cells, developed (switch off)
  public let mask: Int
  /// the frosted window instead (identity switch on); nil draws the mosaic
  public let frost: KFrostSpec?
  /// what VoiceOver calls it ("No. 4481"; switch on, "Sunday Kite, she, Gemini")
  public let a11yLabel: String

  public init(id: String, mask: Int, frost: KFrostSpec? = nil, a11yLabel: String) {
    self.id = id
    self.mask = mask
    self.frost = frost
    self.a11yLabel = a11yLabel
  }
}

/// The folded row's content, from TS.
public struct KFoldModel: Identifiable, Equatable, Sendable {
  public let id: String
  /// six at most
  public let faces: [KFoldFace]
  /// "+3"; "" for none
  public let more: String
  /// "Their turn · 9"
  public let label: String
  /// "Their turn · 9, Pen pals"
  public let a11yLabel: String

  public init(id: String, faces: [KFoldFace], more: String, label: String, a11yLabel: String) {
    self.id = id
    self.faces = faces
    self.more = more
    self.label = label
    self.a11yLabel = a11yLabel
  }
}

public struct KFoldRow: View, Equatable {
  static let face: CGFloat = 34
  static let overlap: CGFloat = 8
  static let ring: CGFloat = 2
  static let label = KTextStyle.system(13, .semibold)

  private let theme: KTheme
  private let fold: KFoldModel
  private let onFace: (String) -> Void
  private let onRow: () -> Void

  /// - Parameters:
  ///   - onFace: a face was tapped, with its id
  ///   - onRow: the rest of the row was tapped
  public init(theme: KTheme, fold: KFoldModel, onFace: @escaping (String) -> Void, onRow: @escaping () -> Void) {
    self.theme = theme
    self.fold = fold
    self.onFace = onFace
    self.onRow = onRow
  }

  public static func == (a: KFoldRow, b: KFoldRow) -> Bool {
    a.theme == b.theme && a.fold == b.fold
  }

  @Environment(\.dynamicTypeSize) private var typeSize

  public var body: some View {
    // at the accessibility sizes the faces leave the label no room ("Their…", the count cut off):
    // the faces on their own line, the label under them on up to two
    Group {
      if typeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: 8) {
          faces
          rowButton(lines: 2)
        }
      } else {
        HStack(alignment: .center, spacing: 12) {
          faces
          rowButton(lines: 1)
        }
      }
    }
    .padding(.horizontal, KPersonRow.inset)
    .padding(.vertical, 12)
    .fixedSize(horizontal: false, vertical: true)
    .background(theme.bg)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(theme.line)
        .frame(height: 1)
        .padding(.leading, KPersonRow.inset)
    }
  }

  private var faces: some View {
    HStack(spacing: -Self.overlap) {
      ForEach(Array(fold.faces.enumerated()), id: \.element.id) { index, face in
        SwiftUI.Button {
          onFace(face.id)
        } label: {
          if let frost = face.frost {
            let square = RoundedRectangle(cornerRadius: Self.face * 0.25, style: .circular)
            KFace(theme: theme, source: .frost(frost), size: Self.face)
              .overlay(square.strokeBorder(theme.bg, lineWidth: Self.ring))
              .contentShape(square)
          } else {
            KFace(theme: theme, source: .mosaic(mask: face.mask, tint: theme.ink), size: Self.face)
              .overlay(Circle().strokeBorder(theme.bg, lineWidth: Self.ring))
              .contentShape(Circle())
          }
        }
        .buttonStyle(KFadePressStyle())
        .zIndex(Double(fold.faces.count - index))
        .accessibilityLabel(face.a11yLabel)
      }
    }
  }

  private func rowButton(lines: Int) -> some View {
    SwiftUI.Button(action: onRow) {
      HStack(alignment: .center, spacing: 12) {
        if !fold.more.isEmpty {
          Text(fold.more)
            .kText(Self.label)
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .fixedSize()
        }
        Text(fold.label)
          .kText(Self.label)
          .foregroundStyle(theme.mute)
          .lineLimit(lines)
          .fixedSize(horizontal: false, vertical: lines > 1)
          .frame(maxWidth: .infinity, alignment: .leading)
        KLineIcon(.chevronRight, size: 15, lineWidth: 2.4, color: theme.mute)
      }
      .frame(maxHeight: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(fold.a11yLabel)
  }
}
