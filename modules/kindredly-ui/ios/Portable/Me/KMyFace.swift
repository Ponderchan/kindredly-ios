// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 YOUR OWN FACE, where a React Native island used to draw it (batch 3, slice 4, 2026-11-09; behind
 the "myavatar" switch): the Me header's 72 (src/screens/me/MeNative.tsx) and Edit profile's 112
 (src/screens/edit-profile/EditProfileNative.tsx). Both islands were <AvatarImage id photoUri
 seed size radius>: a photo you chose, one of the fifty portraits (the six legacy ones drawn 5%
 larger so their ink rim falls outside the clip), a face Wren drew for you ("made-<uuid>"), one of
 the thirty old hand-drawn faces, or the glyph. TS turns that into a KFaceSource (src/lib/faces.ts
 facePlan / faceSource, the same rules, kindred role: never a mosaic), so this is KFace drawing
 your face at the island's own size, in the island's own shape, and the page around it is
 untouched:

 - round (Edit profile; Me without a stamp): KFace's circle. The page still lays its own disc
   behind (Me soft2, Edit profile lav) and clips to a circle, as it did round the island.
 - square (Me with your C2 stamp): React Native drew the island square with a 3.3 corner and the
   header scaled it into the stamp's inner side; here the face is drawn square (KFace's stamped
   content: the picture clipped to 3) and the header does the same scaling and the gold frame.

 Deliberately different, and only while a picture loads: React Native's loading disc was #EDEDEA
 (a photo) or #EFEDFA (a portrait or a made face) in a light theme and soft2 in a dark one, and a
 made face showed the glyph until its file was found; KFace shows soft2 in every theme until the
 picture is there. A loaded face is the same pixels.
 */
public struct KMyFace: View {
  private let theme: KTheme
  private let source: KFaceSource
  private let size: CGFloat
  private let square: Bool

  /// - Parameters:
  ///   - source: your face, as TS resolved it (faces.ts faceSource, role kindred)
  ///   - size: the island's side (Me 72, Edit profile 112)
  ///   - square: drawn square with a 3pt corner, for the inside of your stamp (Me, a member)
  public init(theme: KTheme, source: KFaceSource, size: CGFloat, square: Bool = false) {
    self.theme = theme
    self.source = source
    self.size = size
    self.square = square
  }

  public var body: some View {
    Group {
      if square {
        KFace.stampedContent(theme: theme, source: source, inner: size)
          .frame(width: size, height: size)
      } else {
        KFace(theme: theme, source: source, size: size)
      }
    }
    .accessibilityHidden(true)
  }
}
