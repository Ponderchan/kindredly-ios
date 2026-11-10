// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE JOURNAL BOOK LAB (journal book, 2026-11-10; dev only). Every template of the book on one
 page, drawn from the built-in sample book (KBookSample.swift), so the pages can be judged on a
 simulator before the export screen exists and without a journal:

   kindredly:///dev/journal-book-lab     (src/app/dev/journal-book-lab.tsx)

 It is shown through the gallery's Host (Adapters/KGalleryView.swift, `page: "book"`), so it
 needed no view registration of its own. Like the gallery it is as tall as its content and
 scrolls with the page around it; each row scrolls sideways, as the approved mock's rows do.

 - INK SAVER: every page with white grounds.
 - LARGE: pages 340 points wide instead of 230 (a PDF page is 420).
 - LETTER FONT: the four faces a reader can choose; the book is paginated again for each, so the
   long entries show their real page counts in that face.
 - MAKE THE PDF writes the same sample book with KBookRenderer.pdf (Caches/kindredly-book-lab.pdf)
   and says how many pages and bytes it came to; SHARE THE PDF then hands the file to the share
   sheet (Save to Files, AirDrop), which is how to check that its text selects.
 Under each page: its printed number, its kind, and for an entry how many lines of the body it
 holds.

 The sample's photos are "lab:<n>" stand-ins (tinted blocks) and it has no picture of Wren: the
 drifted line's label stands alone and the back cover has no bird. The words are English, typed
 in Swift: a dev page, as the gallery is.
 */
public struct KBookLab: View {
  private let theme: KTheme

  @State private var inkSaver = false
  @State private var large = false
  @State private var fontIndex = 0
  @State private var pages: [KBookRenderedPage] = []
  @State private var pdfNote = ""
  @State private var pdfURL: URL?
  @State private var making = false

  private static let fonts: [(key: String, label: String)] = [
    ("newsreader", "Newsreader"), ("system", "System"), ("garamond", "Garamond"), ("sfmono", "SF Mono"),
  ]

  public init(theme: KTheme) {
    self.theme = theme
  }

  private var book: KBook {
    KBookSample.book(letterFont: Self.fonts[fontIndex].key)
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 24) {
      controls
      ForEach(KBookSample.sections, id: \.title) { section in
        row(section)
      }
    }
    .padding(.vertical, 16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(theme.bg)
    .task(id: fontIndex) {
      pages = await KBookRenderer.pagesOffMain(book: book)
    }
  }

  private func title(_ text: String) -> some View {
    Text(text)
      .kText(.monoSection)
      .foregroundStyle(theme.mute)
      .accessibilityAddTraits(.isHeader)
  }

  private var controls: some View {
    VStack(alignment: .leading, spacing: 14) {
      title("JOURNAL BOOK · \(pages.count) PRINTED PAGES")
      Toggle("Ink saver", isOn: $inkSaver)
        .kText(.rowLabel)
        .foregroundStyle(theme.ink)
        .toggleStyle(KToggleStyle(theme: theme))
      Toggle("Large pages", isOn: $large)
        .kText(.rowLabel)
        .foregroundStyle(theme.ink)
        .toggleStyle(KToggleStyle(theme: theme))
      title("LETTER FONT")
      ScrollView(.horizontal, showsIndicators: false) {
        KSegmentChips(theme: theme, labels: Self.fonts.map(\.label), selection: $fontIndex)
          .padding(EdgeInsets(top: 4, leading: 2, bottom: 10, trailing: 18))
      }
      title("PDF")
      HStack(spacing: 16) {
        Button {
          makePDF()
        } label: {
          Text(making ? "MAKING…" : "MAKE THE PDF")
            .kText(.monoSection)
            .foregroundStyle(theme.ind)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(making)
        if let pdfURL {
          ShareLink(item: pdfURL) {
            Text("SHARE THE PDF")
              .kText(.monoSection)
              .foregroundStyle(theme.ind)
              .frame(minHeight: 44)
              .contentShape(Rectangle())
          }
          .buttonStyle(.plain)
        }
      }
      if !pdfNote.isEmpty {
        Text(pdfNote)
          .kText(.monoCaption)
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .padding(.horizontal, 16)
  }

  private func row(_ section: KBookSample.Section) -> some View {
    let mine = pages.filter { section.sources.contains($0.sourceIndex) }
    let width: CGFloat = large ? 340 : 230
    return VStack(alignment: .leading, spacing: 10) {
      title(section.title).padding(.horizontal, 16)
      ScrollView(.horizontal, showsIndicators: false) {
        LazyHStack(alignment: .top, spacing: 12) {
          ForEach(mine) { page in
            VStack(alignment: .leading, spacing: 6) {
              KBookPageView(page: page, inkSaver: inkSaver)
                .frame(width: width, height: width / KBookPageView.aspectRatio)
                // paper on the page: a 1pt soft edge, no shadow
                .overlay(Rectangle().strokeBorder(theme.line, lineWidth: 1))
              Text(caption(page))
                .kText(.monoCaption)
                .foregroundStyle(theme.mute)
                .lineLimit(1)
            }
            .frame(width: width, alignment: .leading)
          }
        }
        .padding(.horizontal, 16)
      }
    }
  }

  private func caption(_ page: KBookRenderedPage) -> String {
    var parts = ["P.\(page.number)", page.kind.rawValue.uppercased()]
    if let entry = page.entry {
      if page.kind == .entry { parts.append(entry.form.rawValue.uppercased()) }
      parts.append("\(entry.lines.filter { !$0.blank }.count) LINES")
    }
    return parts.joined(separator: " · ")
  }

  private func makePDF() {
    making = true
    pdfNote = ""
    let book = self.book
    let inkSaver = self.inkSaver
    Task {
      let started = Date()
      do {
        let url = try await KBookRenderer.pdf(book: book, inkSaver: inkSaver)
        let bytes = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue ?? 0
        let ms = Int(Date().timeIntervalSince(started) * 1000)
        pdfURL = url
        pdfNote = "\(url.lastPathComponent) · \(pages.count) PAGES · \(bytes / 1024) KB · \(ms) MS\(inkSaver ? " · INK SAVER" : "")"
      } catch {
        pdfURL = nil
        pdfNote = (error as? LocalizedError)?.errorDescription ?? String(describing: error)
      }
      making = false
    }
  }
}
