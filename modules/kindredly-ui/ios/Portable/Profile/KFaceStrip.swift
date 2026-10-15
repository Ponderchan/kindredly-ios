// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FACE STRIP (Edit profile, under the avatar): the portraits on offer as 54pt circles in one
 row that scrolls sideways, edge to edge, 10 apart; the header (PICK A FACE, mono 600 10 at .14em
 in mute) with a small Random key at its right. The face worn wears the selected look
 (KSelectableTile: a 2pt ind ring and a 3pt lav halo outside it); none does while a photo is
 worn. Opening, the strip brings the face worn into view.

 The portraits are bundled PNGs handed over as files (TS: expo-asset), drawn by KImage at their
 size (downsampled once, cached by KImageStore), on soft2 while they load. A LazyHStack: fifty
 pictures, no React Native island among them. Each face is a button VoiceOver names "Face 3 of
 25" (the library's own names are English design notes, never shown) with the selected trait.
 */

/// One face on offer.
public struct KEditFace: Identifiable, Equatable, Sendable {
  /// the portrait's id (user_metadata.avatarId)
  public let id: String
  /// the portrait as a file; nil while it is on its way
  public let image: KImageRef?
  /// VoiceOver's name for it, from TS
  public let a11yLabel: String

  public init(id: String, image: KImageRef?, a11yLabel: String) {
    self.id = id
    self.image = image
    self.a11yLabel = a11yLabel
  }
}

public struct KFaceStrip: View {
  /// a face's side (H:91's strip, EditProfileSheet's 54)
  public static var faceSize: CGFloat { 54 }

  private let theme: KTheme
  private let header: String
  private let randomLabel: String
  private let faces: [KEditFace]
  private let selected: String
  private let onPick: (String) -> Void
  private let onRandom: () -> Void

  /// - Parameters:
  ///   - selected: the face worn; "" for none
  ///   - onPick: a face was tapped (its id)
  ///   - onRandom: the Random key
  public init(theme: KTheme, header: String, randomLabel: String, faces: [KEditFace], selected: String, onPick: @escaping (String) -> Void, onRandom: @escaping () -> Void) {
    self.theme = theme
    self.header = header
    self.randomLabel = randomLabel
    self.faces = faces
    self.selected = selected
    self.onPick = onPick
    self.onRandom = onRandom
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .center, spacing: 8) {
        SoftGroupHeader(theme: theme, title: header)
          .frame(maxWidth: .infinity, alignment: .leading)
        SwiftUI.Button(action: onRandom) {
          Text(randomLabel)
            .kText(.chip)
            .foregroundStyle(theme.ink)
            .lineLimit(1)
            .padding(.vertical, 6)
            .padding(.horizontal, 12)
        }
        .buttonStyle(KStickerButtonStyle(
          shape: RoundedRectangle(cornerRadius: 14, style: .circular),
          fill: theme.sf,
          stroke: theme.ln,
          lineWidth: 2,
          shadow: theme.ln,
          shadowOffset: 2
        ))
        .padding(.trailing, 2) // the shadow's room
      }
      ScrollViewReader { proxy in
        ScrollView(.horizontal) {
          LazyHStack(spacing: 10) {
            ForEach(faces) { face in
              faceButton(face)
                .id(face.id)
            }
          }
          // the halo's room around every face, and the page's gutter at each end
          .padding(.vertical, 5)
          .padding(.horizontal, 16)
        }
        .scrollIndicators(.hidden)
        .onAppear {
          guard !selected.isEmpty else { return }
          // a turn later, once the lazy row has laid out the faces
          DispatchQueue.main.async { proxy.scrollTo(selected, anchor: .center) }
        }
      }
      .padding(.horizontal, -16)
    }
  }

  private func faceButton(_ face: KEditFace) -> some View {
    let on = face.id == selected
    let side = Self.faceSize
    return SwiftUI.Button {
      onPick(face.id)
    } label: {
      KImage(face.image, size: CGSize(width: side, height: side), placeholder: theme.soft2)
        .clipShape(Circle())
        .kSelectableTile(theme: theme, selected: on, cornerRadius: side / 2)
        .contentShape(Circle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(face.a11yLabel)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
  }
}
