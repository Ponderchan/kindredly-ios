// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 KBookPageView: ONE PRINTED PAGE OF THE JOURNAL BOOK, ON SCREEN (journal book, 2026-11-10).

   let pages = KBookRenderer.pages(book: book)       // KBookRenderer.swift
   KBookPageView(page: pages[i], inkSaver: inkSaver)
     .frame(width: 280)                              // any width; the height follows (A5)

 - It takes the width it is offered and is 595/420 as tall (A5: 148 × 210 mm). Everything on the
   page is sized from that width: the page is laid out once at 420 points, the PDF's own size,
   and drawn scaled, so a page in the preview shows exactly the words, lines and breaks the PDF
   will have (KBookText.swift says why the layout itself is never redone at another width).
 - `page` is one of KBookRenderer.pages(book:). It is a value: the view redraws when it, or
   `inkSaver`, changes.
 - `inkSaver`: every ground white (KBookPaint.swift lists what keeps its colour).
 - `letterFace` is there for the contract's signature. A page's lines were measured in the book's
   own Letter font (`book.letterFont`, kept as `page.letterFace`) and are always drawn in that
   face: the same lines in another face would run off the page. To change the face, change
   `book.letterFont` and ask KBookRenderer.pages(book:) again.
 - A page is paper: its colours are its own in all four themes, and Dynamic Type does not reach
   into it (a printed page has fixed sizes; the page itself can be made larger).
 - Photos (and Wren's picture) are read off the main thread, straight from the model's file
   uris, each no larger than it is drawn here (ImageIO thumbnail at the drawn size × the screen's
   scale, never the full picture). Until one arrives, or when it can't be read, its place is a
   pale block. The view holds only its own page's pictures and lets them go with the page.
 - VoiceOver reads the page as one element: every word on it, top to bottom (`page.spoken`).
 - It draws with CoreText through a Canvas, so it is not a tree of Text views: don't expect
   text selection on screen. The words in the PDF are real text.
 */
public struct KBookPageView: View {
  /// width over height of a page (A5 at 72 dpi: 420 × 595 points)
  public static let aspectRatio: CGFloat = KBookMetrics.width / KBookMetrics.height

  private let page: KBookRenderedPage
  private let inkSaver: Bool

  @Environment(\.displayScale) private var displayScale
  @State private var width: CGFloat = 0
  @State private var pictures: [String: CGImage] = [:]

  public init(page: KBookRenderedPage, inkSaver: Bool = false, letterFace: KLetterFace? = nil) {
    self.page = page
    self.inkSaver = inkSaver
    // see the note on `letterFace` at the top of the file
    _ = letterFace
  }

  public var body: some View {
    let page = self.page
    let inkSaver = self.inkSaver
    let pictures = self.pictures
    Canvas(opaque: true, rendersAsynchronously: false) { context, size in
      let scale = size.width / KBookMetrics.width
      guard scale > 0 else { return }
      context.withCGContext { cg in
        cg.saveGState()
        cg.scaleBy(x: scale, y: scale)
        KBookPainter(context: cg, inkSaver: inkSaver, image: { uri, _ in pictures[uri] }).draw(page)
        cg.restoreGState()
      }
    }
    .aspectRatio(Self.aspectRatio, contentMode: .fit)
    .onGeometryChange(for: CGFloat.self) { proxy in
      proxy.size.width
    } action: { newWidth in
      width = newWidth
    }
    .task(id: loadKey) {
      await load()
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(page.spoken)
    .accessibilityAddTraits(.isImage)
  }

  /// What the loaded pictures depend on: which files, and how many pixels wide the page is (in
  /// steps, so a page being resized doesn't reload at every point).
  private struct LoadKey: Equatable {
    let uris: [String]
    let pixels: Int
  }

  private var loadKey: LoadKey {
    let pixels = (width * displayScale / 96).rounded(.up) * 96
    return LoadKey(uris: page.imageRequests.map(\.uri), pixels: Int(pixels))
  }

  private func load() async {
    let requests = page.imageRequests
    guard !requests.isEmpty, width > 0 else {
      if !pictures.isEmpty { pictures = [:] }
      return
    }
    // pixels per point of the 420-point page, as it is drawn here
    let scale = CGFloat(loadKey.pixels) / KBookMetrics.width
    let work = Task.detached(priority: .userInitiated) { () -> [String: CGImage] in
      var out: [String: CGImage] = [:]
      for request in requests where out[request.uri] == nil {
        if Task.isCancelled { break }
        // the largest size a uri is asked at wins (Wren's mark and her back-cover picture)
        let sizes: [CGSize] = requests.filter { $0.uri == request.uri }.map { $0.size }
        let largest: CGSize? = sizes.max { (a: CGSize, b: CGSize) -> Bool in a.width * a.height < b.width * b.height }
        let size: CGSize = largest ?? request.size
        if let made = KBookImages.thumbnail(request.uri, covering: size, scale: scale) {
          out[request.uri] = made
        }
      }
      return out
    }
    // the page went away, or its width changed: stop reading
    let loaded = await withTaskCancellationHandler {
      await work.value
    } onCancel: {
      work.cancel()
    }
    if !Task.isCancelled { pictures = loaded }
  }
}
