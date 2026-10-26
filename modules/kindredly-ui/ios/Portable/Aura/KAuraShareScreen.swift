// Portable: this file imports SwiftUI only (and ImageIO and UIKit for the picture it saves), so
// the 1.1.0 pure-Swift app can take it as is.

import ImageIO
import SwiftUI
import UIKit

/*
 YOUR WRITING AURA — THE SHARE CARD (/aura-card, owner decision 2026-10-26: ships in 1.0.7). The
 React Native page (src/app/aura-card.tsx AuraShareCardRN) drawn in SwiftUI. TS hands in every
 word and the pictures (src/screens/aura/aura-model.ts buildAuraTicket); this view draws the card
 and makes its picture.

 - THE TOP: ‹ and "Share your aura" centred, on the page.
 - THE CARD (W14 · 03): a fixed object, the same in every theme and in the picture: the white
   ticket (KINDREDLY in the pen blue, the label, "me in words", the scene, the name at 40, the
   stickers that hold, the sentence, FORMED FROM n and the face). Never a quote, never a piece
   id. Rule B (owner, 2026-10-26): no ink edge any more; it stands on the shared hard purple
   shadow (kObjectDepth, in its light colour always, since the picture is the same in every
   theme), on its lavender mat. The mat and the card are the picture.
 - THE TWO ACTS: Share (the pen capsule, the share glyph after the words) and Save image (the
   soft capsule: white on the lavender page, sf in Midnight). Either makes the picture here
   (ImageRenderer, at the screen's scale, a PNG in tmp) and reports its file:// URL; TS shares
   or saves it and raises the alerts, and sends `busy` back while it works ("Working…" on that
   key, both keys dimmed). A picture that couldn't be made is reported as "".
 - THE FOOT: Wren (a snapshot) and "Reading from {name}", and the only-the-card line.

 The page: the lavender wash in the light themes, the theme's page in Midnight (the stack slides
 it in on the same colours, app/_layout). Dynamic Type scales the page's words; the card is held
 at the standard size, being a picture (VoiceOver reads it as one element: its words).
 */

// MARK: - Content

/// The scene at the top of the card: the title's scene in colour, its sketch, the faded desk
/// before anything, or the first lines of a page. TS decides which and hands the picture in.
public struct KAuraTicketArt: Equatable, Sendable {
  public enum Kind: String, Sendable {
    /// formed: the title's scene in colour, on the slot's lavender
    case scene
    /// a noun known: its sketch, in a dashed frame
    case sketch
    /// nothing yet: the quiet observer's sketch at .35, in a dashed frame
    case empty
    /// first signs: four pale lines and a star, in a dashed frame
    case lines
  }

  public var kind: Kind = .lines
  /// the picture for scene / sketch / empty; nil draws `mask` instead
  public var image: KImageRef?
  /// the face drawn when the picture is missing (FACE v1 mask, from TS mosaicMask: developed
  /// fully for a scene, half for a sketch)
  public var mask: Int = 0

  public init() {}
}

/// The card's words and pictures.
public struct KAuraTicket: Equatable, Sendable {
  /// "KINDREDLY"
  public var brand = ""
  /// "WRITING AURA"
  public var label = ""
  /// "@handle in words"
  public var meInWords = ""
  public var art = KAuraTicketArt()
  /// the name at 40 (the title once formed, else the noun's or the phase's headline)
  public var name = ""
  /// the stickers that may travel (writing ones and public counted ones), large
  public var stickers: [KAuraSticker] = []
  /// the sentence ("" for none)
  public var desc = ""
  /// "FORMED FROM 12 LETTERS"
  public var formedFrom = ""
  /// your face's mask (FACE v1, develop 1)
  public var faceMask: Int = 0
  /// what VoiceOver reads for the card
  public var a11y = ""

  public init() {}
}

public struct KAuraShareContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  /// false until the aura is read: the page without the card
  public var ready = false
  public var ticket = KAuraTicket()
  public var share = ""
  public var save = ""
  /// "Working…"
  public var working = ""
  /// "" | "share" | "save": TS is busy with that act
  public var busy = ""
  /// "Reading from Wren"
  public var readingFrom = ""
  /// "Only the card is shared — never a line from a letter."
  public var onlyCard = ""
  /// Wren, for the foot; nil draws none
  public var bird: KImageRef?

  public init() {}
}

/// Where the page's taps go. The URL is the card's picture (file://), "" if it couldn't be made.
public final class KAuraShareActions {
  public var onBack: () -> Void = {}
  public var onShare: (String) -> Void = { _ in }
  public var onSave: (String) -> Void = { _ in }

  public init() {}
}

// MARK: - The screen

public struct KAuraShareScreen: View {
  private let theme: KTheme
  private let content: KAuraShareContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KAuraShareActions

  @Environment(\.displayScale) private var displayScale
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the scene, decoded here so the picture made from the card has it too
  @State private var scene: CGImage?
  @State private var sceneFor: KImageRef?
  @State private var cardWidth: CGFloat = 0

  public init(theme: KTheme, content: KAuraShareContent, topInset: CGFloat, bottomInset: CGFloat, actions: KAuraShareActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  /// the page's colours: the sheet as drawn in the light themes, the theme's in Midnight
  private var page: Color { theme.isDark ? theme.bg : KAuraTicketInk.mat }
  private var saveFill: Color { theme.isDark ? theme.sf : KBrand.paperWhite }
  private var note: Color { theme.isDark ? theme.mute : KAuraTicketInk.grey }

  public var body: some View {
    VStack(spacing: 0) {
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, sticky: false, onBack: actions.onBack)
        .padding(.top, topInset)
      if content.ready {
        ScrollView(.vertical) {
          VStack(spacing: 0) {
            mat
              .background {
                GeometryReader { g in
                  Color.clear
                    .onAppear { cardWidth = g.size.width }
                    .onChange(of: g.size.width) { _, w in cardWidth = w }
                }
              }
            Spacer(minLength: 22)
            keys
          }
          .padding(.horizontal, 26)
          .padding(.top, 14)
          .padding(.bottom, bottomInset + 24)
          .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
        .scrollBounceBehavior(.basedOnSize)
        .transition(.opacity.animation(reduceMotion ? nil : .easeOut(duration: 0.42)))
      }
    }
    .background(page.ignoresSafeArea())
    .task(id: content.ticket.art.image) { await loadScene(content.ticket.art.image) }
  }

  /// the picture: the mat and the card on it
  private var mat: some View {
    KAuraTicketView(ticket: content.ticket, scene: sceneFor == content.ticket.art.image ? scene : nil)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(content.ticket.a11y)
      .accessibilityAddTraits(.isImage)
  }

  private var keys: some View {
    let busy = !content.busy.isEmpty
    return VStack(spacing: 10) {
      SwiftUI.Button {
        guard !busy else { return }
        actions.onShare(renderPicture() ?? "")
      } label: {
        HStack(spacing: 8) {
          Text(content.busy == "share" ? content.working : content.share)
            .kText(.button)
          if content.busy != "share" {
            Image(systemName: "square.and.arrow.up")
              .font(.system(size: 16, weight: .semibold))
              .accessibilityHidden(true)
          }
        }
        .foregroundStyle(theme.bg)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 17)
        .background(Capsule(style: .circular).fill(theme.ind))
        .contentShape(Capsule(style: .circular))
      }
      .buttonStyle(KFadePressStyle())
      .opacity(busy ? 0.85 : 1)
      SwiftUI.Button {
        guard !busy else { return }
        actions.onSave(renderPicture() ?? "")
      } label: {
        Text(content.busy == "save" ? content.working : content.save)
          .kText(.button)
          .foregroundStyle(theme.ink)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 15)
          .background(Capsule(style: .circular).fill(saveFill))
          .contentShape(Capsule(style: .circular))
      }
      .buttonStyle(KFadePressStyle())
      .opacity(busy ? 0.85 : 1)
      HStack(spacing: 8) {
        if let bird = content.bird {
          KImage(bird, size: CGSize(width: 22, height: 22), contentMode: .fit, placeholder: .clear)
        }
        Text(content.readingFrom)
          .kText(.system(12.5))
          .foregroundStyle(note)
      }
      .padding(.top, 10)
      .accessibilityElement(children: .combine)
      Text(content.onlyCard)
        .kText(.system(11.5))
        .foregroundStyle(note)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  /// The card as a PNG in tmp, at the screen's scale and the width it has on screen. nil when
  /// it couldn't be made.
  @MainActor
  private func renderPicture() -> String? {
    let width = cardWidth > 0 ? cardWidth : 320
    let view = KAuraTicketView(ticket: content.ticket, scene: sceneFor == content.ticket.art.image ? scene : nil)
      .frame(width: width)
      .environment(\.colorScheme, .light)
    let renderer = ImageRenderer(content: view)
    renderer.scale = displayScale
    renderer.isOpaque = true
    guard let image = renderer.uiImage, let data = image.pngData() else { return nil }
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("aura-card-\(UUID().uuidString).png")
    do {
      try data.write(to: url, options: .atomic)
      return url.absoluteString
    } catch {
      return nil
    }
  }

  /// The scene decoded off the main thread, from its file (or its URL in a dev build).
  private func loadScene(_ ref: KImageRef?) async {
    guard let ref else {
      scene = nil
      sceneFor = nil
      return
    }
    let url = ref.url
    let image: CGImage? = await Task.detached(priority: .userInitiated) {
      let source: CGImageSource?
      if url.isFileURL {
        source = CGImageSourceCreateWithURL(url as CFURL, nil)
      } else if let data = try? Data(contentsOf: url) {
        source = CGImageSourceCreateWithData(data as CFData, nil)
      } else {
        source = nil
      }
      guard let source else { return nil }
      return CGImageSourceCreateImageAtIndex(source, 0, [kCGImageSourceShouldCacheImmediately: true] as CFDictionary)
    }.value
    guard !Task.isCancelled else { return }
    scene = image
    sceneFor = ref
  }
}

// MARK: - The card

/// The card's fixed inks (React Native W14 and P), the same in every theme.
enum KAuraTicketInk {
  static let ink = Color(hex: "#1E1B35")
  static let pen = Color(hex: "#3A3AF5")
  static let mat = Color(hex: "#ECECFE")
  static let card = Color.white
  static let slot = Color(hex: "#E4E1FA")
  static let slotEmpty = Color(hex: "#F6F5FD")
  static let slotEdge = Color(hex: "#C9C5E6")
  static let grey = Color(hex: "#1E1B35").opacity(0.5)
  static let faint = Color(hex: "#1E1B35").opacity(0.4)
  static let hair = Color(hex: "#E4E1F2")
  static let lines = Color(hex: "#8F87D9")
}

/// The mat and the ticket on it: what is drawn, and what the picture is made of.
struct KAuraTicketView: View {
  let ticket: KAuraTicket
  let scene: CGImage?

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 18, style: .circular)
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .firstTextBaseline) {
        Text(ticket.brand)
          .kText(.mono(10.5, .semibold, tracking: 0.23))
          .foregroundStyle(KAuraTicketInk.pen)
        Spacer(minLength: 8)
        Text(ticket.label)
          .kText(.mono(10, .regular, tracking: 0.14))
          .foregroundStyle(KAuraTicketInk.faint)
          .lineLimit(1)
      }
      Text(ticket.meInWords)
        .kText(.system(12))
        .foregroundStyle(KAuraTicketInk.grey)
        .padding(.top, 4)
      KAuraTicketArtView(art: ticket.art, scene: scene)
        .frame(maxWidth: .infinity)
        .frame(height: 156)
        .padding(.top, 14)
      Text(ticket.name)
        .kText(.system(40, .bold, tracking: -0.04, lineHeight: 1.0))
        .foregroundStyle(KAuraTicketInk.ink)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 16)
      if !ticket.stickers.isEmpty {
        KAuraCenteredFlow(spacing: 8, lineSpacing: 8) {
          ForEach(ticket.stickers) { s in
            KAuraStickerChip(sticker: s, large: true)
          }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 16)
      }
      if !ticket.desc.isEmpty {
        Text(ticket.desc)
          .kText(.system(16, lineHeight: 23.0 / 16))
          .foregroundStyle(KAuraTicketInk.ink)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 16)
      }
      Rectangle().fill(KAuraTicketInk.hair).frame(height: 1).padding(.top, 14)
      HStack(alignment: .center) {
        Text(ticket.formedFrom)
          .kText(.mono(10, .regular, tracking: 0.12))
          .foregroundStyle(KAuraTicketInk.faint)
        Spacer(minLength: 8)
        KMosaic(mask: ticket.faceMask, cell: 4, gap: 1, color: KAuraTicketInk.ink)
      }
      .padding(.top, 12)
    }
    .padding(.horizontal, 20)
    .padding(.top, 20)
    .padding(.bottom, 18)
    .background(shape.fill(KAuraTicketInk.card))
    // rule B: no ink edge; the object's purple shadow, in its light colour in every theme (the
    // picture is the same in every theme)
    .kObjectDepth(.classic, in: shape)
    // the mat: room for the shadow on the right and below
    .padding(.leading, 8)
    .padding(.top, 8)
    .padding(.trailing, 8 + KObjectDepth.offset)
    .padding(.bottom, 8 + KObjectDepth.offset)
    .background(KAuraTicketInk.mat)
    // a picture: the standard size, whatever the reader's text size
    .dynamicTypeSize(.large)
  }
}

/// The scene slot on the card (React Native AuraArt), corners 12.
struct KAuraTicketArtView: View {
  let art: KAuraTicketArt
  let scene: CGImage?

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 12, style: .circular)
    GeometryReader { g in
      ZStack {
        switch art.kind {
        case .scene:
          KAuraTicketInk.slot
          picture(g.size, opacity: 1, develop: 1)
        case .sketch:
          KAuraTicketInk.slotEmpty
          picture(g.size, opacity: 1, develop: 0.5)
        case .empty:
          KAuraTicketInk.slotEmpty
          picture(g.size, opacity: 0.35, develop: nil)
        case .lines:
          KAuraTicketInk.slotEmpty
          firstLines(g.size)
        }
      }
      .frame(width: g.size.width, height: g.size.height)
      .clipShape(shape)
      .overlay {
        if art.kind != .scene {
          shape.strokeBorder(KAuraTicketInk.slotEdge, style: StrokeStyle(lineWidth: 2, dash: [6, 4]))
        }
      }
    }
    .accessibilityHidden(true)
  }

  /// the picture covering the slot's width at 16:9, centred (React Native's resizeMode cover);
  /// the face when there is none
  @ViewBuilder
  private func picture(_ size: CGSize, opacity: Double, develop: Double?) -> some View {
    if let scene {
      Image(decorative: scene, scale: 1)
        .resizable()
        .aspectRatio(contentMode: .fill)
        .frame(width: size.width, height: (size.width * 9 / 16).rounded())
        .opacity(opacity)
    } else if develop != nil {
      KMosaic(mask: art.mask, cell: 8, gap: 1.5, color: KAuraTicketInk.ink)
    }
  }

  private func firstLines(_ size: CGSize) -> some View {
    let w = (size.width * 0.5).rounded()
    return ZStack(alignment: .bottomTrailing) {
      VStack(alignment: .leading, spacing: 7) {
        Capsule().fill(KAuraTicketInk.lines).frame(width: w, height: 4)
        Capsule().fill(KAuraTicketInk.lines).frame(width: (w * 0.72).rounded(), height: 4)
        Color.clear.frame(height: 6)
        Capsule().fill(KAuraTicketInk.lines).frame(width: (w * 0.9).rounded(), height: 4)
        Capsule().fill(KAuraTicketInk.lines).frame(width: (w * 0.5).rounded(), height: 4)
      }
      .frame(width: size.width, height: size.height)
      Text("✦")
        .font(.system(size: 16))
        .foregroundStyle(KAuraTicketInk.slotEdge)
        .padding(.trailing, (size.width * 0.18).rounded())
        .padding(.bottom, (size.height * 0.16).rounded())
    }
  }
}
