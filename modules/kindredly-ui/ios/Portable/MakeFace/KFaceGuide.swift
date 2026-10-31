// Portable: this file imports SwiftUI, UIKit and Vision only (system frameworks; no Expo), so the
// 1.1.0 pure-Swift app can take it as is.

import SwiftUI
import UIKit
import Vision

/*
 MAKE YOUR OWN FACE · THE OVAL ON "USE THIS PHOTO?" (owner, 2026-10-31: "is the circle on the face
 set automatically? it's so small"). It used to be a fixed 120 x 140 in the middle of the frame,
 whatever the photo; now it is drawn round the face the photo actually has: Vision finds the face
 (on the phone, nothing leaves it), and the oval is that box made a little taller and wider, so it
 takes in the hair and the chin as the drawing will. No face found (or more than one): no oval,
 only the ONE PERSON · FACE CLEAR line, which is then the hint it needs.
 */

/// Where the face is in a photo, as a fraction of the picture (origin top left), or nil.
enum KFaceFinder {
  static func face(in url: URL) async -> CGRect? {
    await Task.detached(priority: .userInitiated) { () -> CGRect? in
      guard let image = UIImage(contentsOfFile: url.path), let cg = image.cgImage else { return nil }
      let request = VNDetectFaceRectanglesRequest()
      let handler = VNImageRequestHandler(cgImage: cg, orientation: cgOrientation(image.imageOrientation))
      do {
        try handler.perform([request])
      } catch {
        return nil
      }
      let faces = request.results ?? []
      guard faces.count == 1, let box = faces.first?.boundingBox else { return nil }
      // Vision's origin is bottom left
      return CGRect(x: box.minX, y: 1 - box.maxY, width: box.width, height: box.height)
    }.value
  }

  private static func cgOrientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch o {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }

  /// The photo's pixel aspect (width / height), for placing the box in an aspect-fill frame.
  static func aspect(of url: URL) -> CGFloat? {
    guard let image = UIImage(contentsOfFile: url.path), image.size.height > 0 else { return nil }
    return image.size.width / image.size.height
  }
}

/// The dashed oval round the face, for a photo shown aspect-fill in a frame of `size`.
struct KFaceGuideOval: View {
  let photo: URL?
  let size: CGSize
  @State private var oval: CGRect?

  var body: some View {
    ZStack(alignment: .topLeading) {
      if let oval {
        Ellipse()
          .fill(Color.white.opacity(0.12))
          .overlay(Ellipse().strokeBorder(Color.white.opacity(0.75), style: StrokeStyle(lineWidth: 2, dash: [6, 5])))
          .frame(width: oval.width, height: oval.height)
          .offset(x: oval.minX, y: oval.minY)
          .transition(.opacity)
      }
    }
    .frame(width: size.width, height: size.height, alignment: .topLeading)
    .allowsHitTesting(false)
    .task(id: photo) {
      oval = nil
      guard let photo, photo.isFileURL, let box = await KFaceFinder.face(in: photo), let aspect = KFaceFinder.aspect(of: photo) else { return }
      withAnimation(.easeOut(duration: 0.25)) { oval = Self.place(box, aspect: aspect, in: size) }
    }
  }

  /// The face's box (fractions of the photo) in the frame's points, aspect-fill and centred, made
  /// 1.25 wide and 1.45 tall round its centre (the hair and the chin), and kept inside the frame.
  static func place(_ box: CGRect, aspect: CGFloat, in size: CGSize) -> CGRect {
    let frameAspect = size.width / size.height
    let drawn = aspect > frameAspect
      ? CGSize(width: size.height * aspect, height: size.height)
      : CGSize(width: size.width, height: size.width / aspect)
    let origin = CGPoint(x: (size.width - drawn.width) / 2, y: (size.height - drawn.height) / 2)
    let r = CGRect(x: origin.x + box.minX * drawn.width, y: origin.y + box.minY * drawn.height, width: box.width * drawn.width, height: box.height * drawn.height)
    let w = r.width * 1.25
    let h = r.height * 1.45
    var out = CGRect(x: r.midX - w / 2, y: r.midY - h / 2 - r.height * 0.08, width: w, height: h)
    out = out.intersection(CGRect(origin: .zero, size: size).insetBy(dx: 6, dy: 6))
    return out.isNull ? .zero : out
  }
}
