// Portable: this file imports UIKit and ImageIO only (system frameworks; no Expo), so the 1.1.0
// pure-Swift app can take it as is.

import UIKit
import ImageIO

/*
 MAKE YOUR OWN FACE · THE PHOTO, MADE SMALL AND BARE before it goes anywhere (owner, 2026-10-26:
 "photos are only used to paint"). The picker's file is read once and turned into a square JPEG
 of at most 768 pixels a side:
 - read with ImageIO as a thumbnail at 768 (kCGImageSourceCreateThumbnailFromImageAlways) with
   the camera's orientation applied (…WithTransform), so the picture is upright and the original's
   full size is never decoded;
 - the centre square cropped (the picker's crop is already square; a library photo may not be);
 - written with UIImage.jpegData, which keeps no EXIF, GPS or maker notes, at quality .82
   (about 80–150 KB: under KImageStore's 256 KB disk-cache floor, so the preview of it on the
   confirm screen is never copied into the image cache either);
 - to tmp/make-face/<uuid>.jpg, which TS deletes once it is sent or the flow ends, with the
   picker's own file. The base64 that goes to the server is read from it by TS.
 Registered as the module function prepareFacePhoto (KindredlyUIModule.swift).
 */
public enum KFacePhoto {
  /// the longest side sent to the server
  public static let side: CGFloat = 768
  public static let quality: CGFloat = 0.82

  public enum Failure: Error {
    case unreadable
    case encode
    case write
  }

  /// The prepared file's URL (file://, in tmp/make-face).
  public static func prepare(sourceURL: URL) throws -> URL {
    guard let src = CGImageSourceCreateWithURL(sourceURL as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary) else {
      throw Failure.unreadable
    }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceShouldCacheImmediately: true,
      // the shorter side must still cover `side` after the square crop
      kCGImageSourceThumbnailMaxPixelSize: Int(side * longOverShort(src)),
    ]
    guard let thumb = CGImageSourceCreateThumbnailAtIndex(src, 0, options as CFDictionary) else {
      throw Failure.unreadable
    }
    let w = CGFloat(thumb.width), h = CGFloat(thumb.height)
    let edge = min(w, h)
    let crop = CGRect(x: ((w - edge) / 2).rounded(.down), y: ((h - edge) / 2).rounded(.down), width: edge, height: edge)
    guard let square = thumb.cropping(to: crop) else { throw Failure.encode }
    let out = min(side, edge)
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let image = UIGraphicsImageRenderer(size: CGSize(width: out, height: out), format: format).image { _ in
      UIImage(cgImage: square).draw(in: CGRect(x: 0, y: 0, width: out, height: out))
    }
    guard let data = image.jpegData(compressionQuality: quality) else { throw Failure.encode }
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("make-face", isDirectory: true)
    do {
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
      let file = dir.appendingPathComponent(UUID().uuidString.lowercased() + ".jpg")
      try data.write(to: file, options: [.atomic, .completeFileProtection])
      return file
    } catch {
      throw Failure.write
    }
  }

  /// the source's long side over its short side (1 for a square or an unreadable size)
  private static func longOverShort(_ src: CGImageSource) -> CGFloat {
    guard let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
          let pw = props[kCGImagePropertyPixelWidth] as? CGFloat,
          let ph = props[kCGImagePropertyPixelHeight] as? CGFloat,
          pw > 0, ph > 0 else { return 1 }
    return max(pw, ph) / min(pw, ph)
  }
}
