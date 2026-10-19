// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ONE LETTER ON THE DESK (Today 3d × 25b, design Prompts 1–2), at the height the deck's slot gives
 it (KTodayGeometry.cardHeight: 548 on a 393 × 852 phone, never under 360; shorter while the
 reader writes back, the chat composers' A1, owner 2026-10-18: replyCardHeight, room for the
 keyboard and the reply bar, 272 in the prototype). Inside the InkCard
 (.me: sf, a 2.5 ln outline, corners of 24, a hard 5/5 shadow, padding 16; .today, which the
 composer sheet shares, is not retuned):

 - the docket row, 10 apart:
   · WHO, with the identity switch OFF (TS sends the old postmark line, card.postmark): exactly
     the header as it was before identity Phase 1 — the writer's FACE v1 (KMosaic 28, cell 4.8,
     gap 1, ink; a deleted account is the veil in faint) and the postmark "SEP.23 · NO.7273" in
     mono 500 12 at .08em in sub. Off means every surface as it was (the build plan's gate), so
     the §9 layout below waits for the switch rather than arriving early with the old data in it;
   · WHO, with the switch ON (identity-plan §9; TS sends no postmark line): a 40 square face slot
     (corners of 10) holding their frosted window (KFrost), or the flat veil tile for a deleted
     account (KFrostVeil). Beside it, two lines: the courier name in system 600 17 on ONE line,
     never truncated and never shrunk (TS's names pass a 165pt gate at this size), with the ♀/♂
     mark 6pt after it and the star sign 4pt after that (KWhoMarks, ink glyphs in sub); under it
     the date alone ("SEP.23") in mono 500 11 at .08em in sub. When the name and its glyphs
     don't fit beside the stamp (a long Spanish or Portuguese name on a 375 or 393 phone: 165 +
     38 against 179 or 197), the glyphs move to the date's line instead, so the name still never
     loses a letter; at the largest text sizes the name may take two lines;
   · THE STAMP THEY PASTED (below);
   · the ⋯ that opens TS's menu (three dots in sub, no ring: the owner, 2026-10-18, found the 34
     circle beside the stamp heavy for what it is; still always there, on a 44 target, since
     Report and Block must be one tap away) (Report / Block / Bring back the last letter; only
     Bring back on an unsigned letter: a SwiftUI Menu, inside the one Host).
   The stamp (stamps v3 since 2026-10-19; TodayRN's CardFace draws the same): where the 34 box
   with the art inside used to be, KStamp at the ladder's todayCard, 40×48, with no box round it
   (a stamp is never framed twice). It is delivered mail, so it tilts by the letter's id (the
   same tilt the sender's phone and the web give it; each card is its own view: the deck gives it
   the letter's id). No postmark: the owner took it off on 2026-10-18. The row is as tall as the
   stamp, 48 (it was 50×60 until the owner found it outweighed the letter), so the letter below
   has 14pt less than it had beside the 34 box, as in React Native;
 - the letter, filling what is left, in the reader's Letter font at its tier (telegram 30/40
   centred, 21/33, 18/29), padded 0 10, centred in its space. While the reader writes back
   (`compact`) it is set at no more than 20 (the prototype's 29 → 20), its tier's leading scaled
   with it (30/40 → 20/26.7, 21/33 → 20/31.4; the long letter's 18/29 stays), so the shrunk card
   still shows the letter's head and a few lines, folded as below. A letter that doesn't fit is
   FOLDED, never scrolled in place (one swipe means one thing on this page): its height is
   measured from a twin with no height limit, the page shows what fits from the top, a 64pt
   gradient (half the room when that is less, as in the shrunk card) from sf at nothing to sf
   dissolves the last lines (the old one was hardcoded white: a band on Midnight and Paper), and
   UNFOLD ↓ opens the reader. A translation swaps the text in place, a .25s crossfade;
 - a voice letter instead: VOICE LETTER, the voice card (the 44 disc, sixteen bars, the time)
   drawn from TS's one player, and the writer's caption in the italic serif under it. Until its
   link is signed it shows itself unavailable; the caption is never drawn as the letter;
 - the foot: the topic tag (the App Store tag: the stamp's colour solid with white words, from TS) and
   the one capsule (translation wins over the lime signal), side by side, stacked when they
   don't fit (a long language, large text). The translation is the LANGUAGE PAIR (KLangPair,
   the owner's B1 brought back 2026-10-16): the ink segment with the code they wrote in, the
   arrow, the light segment with yours, the lit side the one you are reading; TS's code
   ("ES→EN", "EN←ES" once turned round) is read into the pair by KLangPair.pair. It is the
   card's last row: the old rule and the ↑ PASS / REPLY ↓ row are gone, because NEXT and
   REPLY are the control band's buttons now. While the reader writes back (`compact`) the foot
   is not drawn and the docket stops at xxxLarge, so the shrunk card keeps the letter (a11y pass).

 VoiceOver reads the card as one element (TS's a11yLabel: who wrote it and when — "SEP.23 ·
 NO.7273" with the switch off, "Sunday Kite, she, Gemini. SEP.23" with it on — the topic, why the
 matcher chose it, the letter or what the voice letter is) with its moves as actions, in this order:
 write back, translate or show the original, unfold or play/pause (as the press would do now),
 every menu item (report, block, bring back), and next letter. Every move names the card it came
 from, so the desk can refuse a reply to a card that is no longer the one shown.
 */

/// What a card's taps do (one object per surface, so a card is always equal to itself). Each
/// carries the card's id: a reply is always bound to its own letter.
final class KLetterCardActions {
  var onReply: (_ letterId: String) -> Void = { _ in }
  var onAction: (_ letterId: String, _ action: String) -> Void = { _, _ in }
  var onNext: (_ letterId: String) -> Void = { _ in }
}

struct KLetterCard: View, Equatable {
  static let mosaicCell: CGFloat = 4.8
  /// the face slot: 40 square, corners of 10 (a quarter of it, as the frosted window's)
  static let faceSlot: CGFloat = 40
  static let faceCorner: CGFloat = 10
  /// the slot's edge round a mosaic in it
  static let faceEdge: CGFloat = 2
  /// the ⋯: the dots' drawing, and the target round it (44 square, laid out as the dots alone)
  static let moreGlyph: CGFloat = 22
  static let moreTarget: CGFloat = 44
  /// the stamp they pasted: the ladder's todayCard, 40 × 48
  static let stampWidth: CGFloat = KStampLadder.todayCard.w
  static let monoLabel = KTextStyle.monoReply
  /// the switch-off postmark, SEP.23 · NO.7273 (design Prompt 2: mono 12 at .08em in the sub colour)
  static let postmarkStyle = KTextStyle.mono(12, .medium, tracking: 0.08)
  /// the writer's name: system 600 17, one line
  static let nameStyle = KTextStyle.system(17, .semibold)
  /// the date under it, SEP.23 (mono 500 11 at .08em in the sub colour)
  static let whenStyle = KTextStyle.mono(11, .medium, tracking: 0.08)
  /// the mark and the sign: 0.8 × the name (KWhoMarks); a little smaller beside the date
  static let markSize: CGFloat = 14
  static let markSizeOnDate: CGFloat = 12
  /// between the name's line and the date's
  static let whoGap: CGFloat = 1

  let theme: KTheme
  let card: KLetterCardModel
  let labels: KTodayLabels
  /// the reader is writing back and the card has shrunk for the keyboard: the letter at the
  /// compact size (KCardText)
  let compact: Bool
  let voice: KTodayVoice
  let actions: KLetterCardActions

  static func == (a: KLetterCard, b: KLetterCard) -> Bool {
    a.card == b.card && a.theme == b.theme && a.labels == b.labels && a.compact == b.compact
  }

  var body: some View {
    InkCard(theme: theme, variant: .me) {
      docket
      Group {
        if card.isVoice {
          KCardVoiceBlock(theme: theme, card: card, labels: labels, voice: voice) {
            actions.onAction(card.id, "voice")
          }
        } else {
          KCardText(theme: theme, card: card, compact: compact, unfold: labels.unfold) {
            actions.onAction(card.id, "unfold")
          }
        }
      }
      // minHeight 0: the body takes what the card leaves it and no more, so a long letter is
      // measured against that room and folds (KCardText), instead of growing the card past its frame
      .frame(maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
      // not while the reader writes back: on an SE from AX1 the docket and the foot alone were
      // taller than the 200pt card, leaving the letter 0 high and no UNFOLD (a11y pass,
      // today-reply-card-ax-se). The topic and the translation stay in the card's label and actions.
      if !compact {
        foot
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(card.a11yLabel)
    .modifier(KLetterCardAccessibilityActions(card: card, labels: labels, voice: voice, actions: actions))
  }

  // ── the docket row ──
  private var docket: some View {
    HStack(alignment: .center, spacing: 10) {
      if card.postmark.isEmpty {
        // the identity switch on: the §9 header (TS sends no postmark line)
        KCardFaceSlot(theme: theme, face: card.who.face)
        whoLines
          .frame(maxWidth: .infinity, alignment: .leading)
      } else {
        // the switch off: the docket exactly as it was before identity Phase 1 — the writer's
        // FACE v1 (the veil in faint for a deleted account) and the postmark, SEP.23 · NO.7273
        Group {
          if case let .mosaic(mask) = card.who.face {
            KMosaic(mask: mask, cell: Self.mosaicCell, gap: 1, color: theme.ink)
          } else {
            KMosaic.veil(theme: theme, cell: Self.mosaicCell, gap: 1)
          }
        }
        Text(card.postmark)
          .kText(Self.postmarkStyle)
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      KLetterCardStamp(theme: theme, card: card, width: Self.stampWidth, actions: actions)
      if !card.menu.isEmpty {
        Menu {
          ForEach(card.menu) { item in
            SwiftUI.Button(role: item.destructive ? .destructive : nil) {
              actions.onAction(card.id, item.key)
            } label: {
              if item.systemImage.isEmpty {
                Text(item.title)
              } else {
                Label(item.title, systemImage: item.systemImage)
              }
            }
          }
        } label: {
          KLineIcon(.more, size: Self.moreGlyph, lineWidth: 3.2, color: theme.sub)
            .frame(width: Self.moreTarget, height: Self.moreTarget)
            .contentShape(Rectangle())
        }
        .menuIndicator(.hidden)
        // the row lays out the dots alone; the rest of the target reaches into the gap and the margin
        .padding(.horizontal, -(Self.moreTarget - Self.moreGlyph) / 2)
        .accessibilityLabel(labels.more)
      }
    }
    // shrunk for the keyboard, the docket stops at xxxLarge so the letter keeps some lines
    .dynamicTypeSize(...(compact ? DynamicTypeSize.xxxLarge : DynamicTypeSize.accessibility2))
  }

  /// The name (with its mark and sign) over the date. The first layout that fits wins: all on the
  /// name's line; the glyphs on the date's line (a long name in a narrow card); the name on two
  /// lines (the largest text sizes). The name itself is never truncated or shrunk.
  private var whoLines: some View {
    let who = card.who
    return ViewThatFits(in: .horizontal) {
      VStack(alignment: .leading, spacing: Self.whoGap) {
        HStack(alignment: .firstTextBaseline, spacing: 0) {
          nameText.lineLimit(1).fixedSize()
          KWhoMarks(mark: who.mark, sign: who.sign, size: Self.markSize, color: theme.sub)
        }
        whenText
      }
      VStack(alignment: .leading, spacing: Self.whoGap) {
        nameText.lineLimit(1).fixedSize()
        whenLine
      }
      VStack(alignment: .leading, spacing: Self.whoGap) {
        nameText
          .lineLimit(2)
          .fixedSize(horizontal: false, vertical: true)
        whenLine
      }
    }
  }

  /// the name; each layout sets its own line limit (a limit set here would win over theirs)
  private var nameText: some View {
    Text(card.who.name)
      .kText(Self.nameStyle)
      .foregroundStyle(theme.ink)
  }

  private var whenText: some View {
    Text(card.when)
      .kText(Self.whenStyle)
      .foregroundStyle(theme.sub)
      .lineLimit(1)
  }

  /// the date with the mark and the sign after it (the fallback layouts)
  private var whenLine: some View {
    HStack(alignment: .firstTextBaseline, spacing: 0) {
      whenText.fixedSize()
      KWhoMarks(mark: card.who.mark, sign: card.who.sign, size: Self.markSizeOnDate, color: theme.sub)
    }
  }

  // ── the foot: the topic tag and the one capsule ──
  @ViewBuilder
  private var foot: some View {
    let hasCapsule = card.capsule != .none
    if !card.topic.isEmpty || hasCapsule {
      ViewThatFits(in: .horizontal) {
        HStack(alignment: .center, spacing: 9) {
          topicTag
          Spacer(minLength: 0)
          capsule
        }
        VStack(alignment: .leading, spacing: 8) {
          topicTag
          capsule
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      // the tag's 3/3 shadow hangs outside it
      .padding(.trailing, 3)
      .padding(.bottom, 3)
      .padding(.top, 8)
      .dynamicTypeSize(...DynamicTypeSize.accessibility2)
    }
  }

  @ViewBuilder
  private var topicTag: some View {
    if !card.topic.isEmpty {
      KTopicTag(
        theme: theme,
        text: card.topic,
        // the App Store tag: the stamp's own colour (topicWash, from today-cards) and, stamps v3
        // §8, the words in ink #1E1B35 in every theme whatever TS sends (white passes on none of
        // the 36 bright hexes); no colour: the quiet grey #B9B5D0
        tone: .custom(
          fill: KStampFrame.rgb(hex: card.topicWash).map { KStampFrame.color($0) } ?? KStampFrame.color(KStampFrame.v3TagNeutral),
          text: KStampFrame.color(KStampFrame.v3Ink)
        )
      )
    }
  }

  @ViewBuilder
  private var capsule: some View {
    switch card.capsule {
    case .none:
      EmptyView()
    case let .translate(code, label, enabled, value):
      // the pair as TS wrote it: "ES→EN" with the original showing, "EN←ES" once it is in yours
      let pair = KLangPair.pair(code)
      KLangPair(theme: theme, from: pair.from, to: pair.to, on: pair.on, busy: !enabled, label: label, value: value) {
        actions.onAction(card.id, "translate")
      }
    case let .signal(label, glyph):
      KAurasClose(theme: theme, label: label, glyph: glyph)
    }
  }
}

/// The card's VoiceOver actions. A modifier of its own so the voice action can follow the one
/// player (Pause while this letter plays, Play otherwise) while the card itself stays equal to
/// itself: only this observes the player, which reports transitions, never ticks.
struct KLetterCardAccessibilityActions: ViewModifier {
  let card: KLetterCardModel
  let labels: KTodayLabels
  @ObservedObject var voice: KTodayVoice
  let actions: KLetterCardActions
  /// a stranger's photo stamp on the card: Keep / Report it (custom stamps)
  @ObservedObject private var registry = KCustomStamps.shared

  func body(content: Content) -> some View {
    let playing = voice.key == card.id && voice.playback?.playing == true
    let photo = card.stampId.hasPrefix("c:") ? registry.info(card.stampId) : nil
    content.accessibilityActions {
      SwiftUI.Button(labels.replyA11y) { actions.onReply(card.id) }
      if case let .translate(_, label, enabled, _) = card.capsule, enabled {
        SwiftUI.Button(label) { actions.onAction(card.id, "translate") }
      }
      if card.isVoice {
        if card.voiceReady {
          SwiftUI.Button(playing ? labels.pause : labels.play) { actions.onAction(card.id, "voice") }
        }
      } else {
        SwiftUI.Button(labels.unfoldA11y) { actions.onAction(card.id, "unfold") }
      }
      // Report, Block and Bring back the last letter, as TS orders them
      ForEach(card.menu) { item in
        SwiftUI.Button(item.title) { actions.onAction(card.id, item.key) }
      }
      if let photo, photo.canKeep {
        if !photo.kept {
          SwiftUI.Button(registry.words.keep) { actions.onAction(card.id, "stamp.keep") }
        }
        SwiftUI.Button(registry.words.report) { actions.onAction(card.id, "stamp.report") }
      }
      // "Next letter": the same pass as NEXT (the deck serves deck.requestNext())
      SwiftUI.Button(labels.nextA11y) { actions.onNext(card.id) }
    }
  }
}

/// The docket's 40 square face slot (identity-plan §9), drawn while the identity switch is on:
/// the frosted window filling it, or the flat veil tile for a deleted account. It can also hold
/// the mosaic at 28 in a 2pt ln edge (or the mosaic veil), §9's switch-off slot, though the
/// switch-off docket draws the old header instead. Decorative: the card's one VoiceOver label
/// names the writer.
struct KCardFaceSlot: View {
  let theme: KTheme
  let face: KCardWho.Face

  var body: some View {
    let side = KLetterCard.faceSlot
    let edge = RoundedRectangle(cornerRadius: KLetterCard.faceCorner, style: .circular)
    Group {
      switch face {
      case let .mosaic(mask):
        KMosaic(mask: mask, cell: KLetterCard.mosaicCell, gap: 1, color: theme.ink)
          .frame(width: side, height: side)
          .overlay(edge.strokeBorder(theme.ln, lineWidth: KLetterCard.faceEdge))
      case .veil:
        KMosaic.veil(theme: theme, cell: KLetterCard.mosaicCell, gap: 1)
          .frame(width: side, height: side)
          .overlay(edge.strokeBorder(theme.ln, lineWidth: KLetterCard.faceEdge))
      case let .frost(spec):
        KFrost(theme: theme, spec: spec, size: side)
      case .frostVeil:
        KFrostVeil(theme: theme, size: side)
      }
    }
    .frame(width: side, height: side)
    .accessibilityHidden(true)
  }
}

/*
 The letter itself, folded when it doesn't fit. The visible copy is set at its full height
 (fixedSize) and clipped from the top, so a folded letter shows its beginning, never an ellipsis;
 a hidden twin with no height limit says how tall it really is. Folded, the letter starts 10 under
 the docket (round 3: top-aligned, it sat right against it); a letter that fits is centred in its
 space and needs no gap. The gap is taken outside the clipped frame, so the frame it is measured
 against shrinks with it and a folded letter can only stay folded (no back and forth).
 */
struct KCardText: View {
  /// a folded letter's air under the docket
  static let foldGap: CGFloat = 10
  /// the compact size while writing back: the prototype's 29 → 20 (the telegram's 30 here)
  static let compactSize: CGFloat = 20

  let theme: KTheme
  let card: KLetterCardModel
  /// writing back: the letter at no more than compactSize
  let compact: Bool
  let unfold: String
  let onUnfold: () -> Void

  /// the letter's size now: its tier's, or the compact one while writing back (a tier already at
  /// or under it, the long letter's 18, keeps its own)
  private var size: CGFloat {
    compact && card.bodySize > Self.compactSize ? Self.compactSize : card.bodySize
  }

  /// its line height, scaled with it so the tier keeps its own leading (30/40 → 20/26.7, the
  /// prototype's 1.3; 21/33 → 20/31.4)
  private var line: CGFloat {
    card.bodySize > 0 ? card.bodyLine * size / card.bodySize : card.bodyLine
  }

  @State private var frameHeight: CGFloat = 0
  @State private var textHeight: CGFloat = 0
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  private var folded: Bool { frameHeight > 1 && textHeight > frameHeight + 1 }

  var body: some View {
    VStack(spacing: 0) {
      ZStack {
        letter
          .fixedSize(horizontal: false, vertical: true)
          // the compact size comes and goes at once, as the prototype's font-size does (only the
          // card's height moves): carried by the card's animation, SwiftUI crossfades two
          // layouts of the letter at different sizes and places, a double image for .35s
          .animation(nil, value: compact)
          .id(card.body)
          .transition(.opacity)
      }
      // minHeight 0 lets this frame be shorter than the full-height letter inside it (a flexible
      // frame with no minimum grows to its child), so frameHeight < textHeight and the fold shows
      .frame(maxWidth: .infinity, minHeight: 0, maxHeight: .infinity, alignment: folded ? .top : .center)
      .clipped()
      .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
        if abs(height - frameHeight) > 0.5 { frameHeight = height }
      }
      .background(alignment: .top) {
        letter
          .fixedSize(horizontal: false, vertical: true)
          .hidden()
          .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
            if abs(height - textHeight) > 0.5 { textHeight = height }
          }
          .accessibilityHidden(true)
      }
      .overlay(alignment: .bottom) {
        if folded {
          // 64, or half the letter's room when that is less (the card shrunk for the keyboard on
          // an iPhone SE leaves ~55): the fade takes the last lines, never the first one
          LinearGradient(colors: [theme.sf.opacity(0), theme.sf], startPoint: .top, endPoint: .bottom)
            .frame(height: min(64, frameHeight / 2))
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
      }
      .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: card.body)
      .padding(.top, folded ? Self.foldGap : 0)
      if folded {
        SwiftUI.Button(action: onUnfold) {
          Text(unfold)
            .kText(KLetterCard.monoLabel)
            .foregroundStyle(theme.ind)
            .padding(.vertical, 6)
            .padding(.horizontal, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.top, 2)
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)
      }
    }
  }

  private var letter: some View {
    Text(card.body)
      .kText(.letterRead(size, lineHeight: size > 0 ? line / size : nil, place: .todayCard))
      .foregroundStyle(theme.ink)
      .multilineTextAlignment(card.bodyCenter ? .center : .leading)
      .frame(maxWidth: .infinity, alignment: card.bodyCenter ? .center : .leading)
      .padding(.horizontal, 10)
  }
}

/// A voice letter's block: the label, the voice card on TS's one player, the caption.
struct KCardVoiceBlock: View {
  let theme: KTheme
  let card: KLetterCardModel
  let labels: KTodayLabels
  @ObservedObject var voice: KTodayVoice
  let onToggle: () -> Void

  var body: some View {
    let mine = voice.key == card.id
    let playback = mine ? voice.playback : nil
    let pausedAt: String = {
      guard let playback, !playback.playing, playback.positionS > 0 else { return "" }
      return KVoiceCard.clock(playback.positionS)
    }()
    VStack(alignment: .leading, spacing: 0) {
      Text(labels.voiceLetter)
        .kText(KLetterCard.monoLabel)
        .foregroundStyle(theme.ind)
        .padding(.bottom, 14)
        .accessibilityHidden(true)
      KVoiceCard(
        theme: theme,
        playback: playback,
        durationLabel: card.durationLabel,
        positionLabel: pausedAt,
        playLabel: labels.play,
        pauseLabel: labels.pause,
        unavailable: !card.voiceReady || (mine && voice.failed),
        compact: false,
        panel: false,
        onToggle: onToggle
      )
      if !card.caption.isEmpty {
        Text(card.caption)
          .kText(.letterRead(15, italic: true, lineHeight: 24.0 / 15.0, place: .todayCard))
          .foregroundStyle(theme.sub)
          .padding(.top, 16)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .clipped()
  }
}

/*
 THE STAMP ON A DESK CARD, and its long press (custom stamps, contract §7 B4; Prompt 7). A
 stranger's approved photo stamp ("c:<uuid>", KCustomStamps says ok and not mine) answers a long
 press with Keep this stamp / Report this stamp / Never mind, or, once kept, "In your album ✓"
 (disabled) and Report. The choice goes to TS as the card action "stamp.keep" / "stamp.report"
 (KTodayView turns it into onTodayStampMenu); TS keeps or reports it (with the reason), and the
 registry it pushes back redraws the stamp (a reported one becomes the frame in its colour). Every
 other stamp is exactly the KStamp it was, with no gesture. VoiceOver gets the same two moves as
 the card's actions (KLetterCardAccessibilityActions).
 */
struct KLetterCardStamp: View {
  let theme: KTheme
  let card: KLetterCardModel
  let width: CGFloat
  let actions: KLetterCardActions

  @ObservedObject private var registry = KCustomStamps.shared

  var body: some View {
    let stamp = KStamp(
      id: card.stampId,
      width: width,
      dark: theme.isDark,
      delivered: true,
      letterId: card.id,
      fallbackHex: card.stampHex.isEmpty ? nil : card.stampHex
    )
    if card.stampId.hasPrefix("c:"), let info = registry.info(card.stampId), info.canKeep {
      let words = registry.words
      Color.clear
        .frame(width: width, height: KStampFrame.height(width))
        .overlay(stamp)
        .contentShape(Rectangle())
        .contextMenu {
          if info.kept {
            SwiftUI.Button(words.inAlbum) {}.disabled(true)
          } else {
            SwiftUI.Button(words.keep) { actions.onAction(card.id, "stamp.keep") }
          }
          SwiftUI.Button(words.report, role: .destructive) { actions.onAction(card.id, "stamp.report") }
          SwiftUI.Button(words.neverMind) {}
        }
    } else {
      stamp
    }
  }
}
