// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE UNFOLDED LETTER (both of Today's renderers open it: SwiftUI's UNFOLD ↓ and the React Native
 card's), drawn by SwiftUI behind the "letterreader" switch, inside the React Native page sheet
 that src/screens/today/LetterReader.tsx presents (the sheet, its slide and its swipe down stay
 React Native: the reader lives inside the page that opened it, no route). The React Native
 reader is the fallback, and this draws exactly what it draws:

   ✕ FOLD BACK                                  the close icon (20, stroke 2.2, ink: the one
                                                every closing page draws), the words 500 15 in sub,
                                                18 in, 14 from the top, 12 under
   ╭────────────────────────────────────╮       the letter sheet, as on the desk card (InkCard
   │ [face] Sunday Kite ♀ ♊      [stamp] │       .today, letter: sf, a 1pt edge in its ink at 11%,
   │        SEP.23                       │       corners 28, flat (no drop since 2026-11-12),
   │                                     │       no black frame since 2026-11-09), 16 from the
   │                                     │       sides
   │ Dear stranger, …                    │
   │                                     │       the letter in the reader's Letter font at 19/31
   │ WRITTEN 3D AGO                      │       in ink; the written line mono 500 10 at .06em in
   ╰────────────────────────────────────╯       mute, 26 under it
          ( WRITE BACK )                        the ink capsule, 600 16 in the page colour

 - THE DOCKET is the card's (KLetterCard): with the identity switch on (TS sends no postmark) the
   40 face slot (KCardFaceSlot), the courier name in system 600 17 with the ♀/♂ mark and the star
   sign after it (KWhoMarks), the date alone under it in mono 500 11 at .08em in sub; off, the
   writer's mosaic (cell 4.8, gap 1, ink; the veil for a deleted account) beside the postmark in
   mono 600 11 at .08em in ink. VoiceOver reads it as one element (TS's line).
 - THE STAMP is the reader head's (the ladder's readerHead, 60 wide), delivered, so it tilts by
   the letter's id as it did on the card; no box round it, no postmark. A stranger's photo stamp
   answers a long press with the desk card's menu (KLetterCardStamp: Keep this stamp / Report this
   stamp / Never mind, or "In your album ✓"), and VoiceOver gets the same two as actions; TS keeps
   or reports it and says so in a toast.
 - WRITE BACK opens the reply bar here (KReplyBar, the desk's before its reply box: the hint 6 above it in capitals,
   Return a new line, the paper plane sends), with the keyboard, under the letter. The field is
   TS's draft for this letter (seeded by setText as the view attaches; every edit goes back), and
   once it has appeared it stays mounted (the expo focus/unmount crash): a send, and only the
   reader closing, takes it away. A send lets go of the keyboard and reports the words; TS closes
   the reader with it, or (the pouch full) leaves it open under the sheet that says why.
 - A REPLY IN THE AIR while the reader is open (the desk's own send, still flying): the crossing
   (LetterInFlight, an RN island: Wren keeps her die-cut outline there, so she is never redrawn
   here) takes the foot instead of the key or the bar; behind the "inflight" switch it is drawn
   here instead (KLetterInFlight, Wren as her snapshot) and the island stays empty.
 - THE KEYBOARD: the Host keeps the keyboard's safe area, so the foot rides the keyboard natively
   (the React Native reader had to reckon the sheet's own top for it); the bar sits 12 over the
   keyboard, and 12 over the home indicator's room (at least 12) without it. A tap on the letter
   drops the keyboard, as a React Native scroll view does.
 */

/// What the reader's taps do (one object per view).
final class KLetterReaderActions {
  var onClose: () -> Void = {}
  var onChange: (String) -> Void = { _ in }
  /// the send key (enabled or dimmed): the words
  var onSend: (String) -> Void = { _ in }
  /// a stranger's photo stamp: "keep" | "report"
  var onStamp: (String) -> Void = { _ in }
}

/// The reader's letter and words, all TS's.
struct KLetterReaderContent: Equatable {
  /// the desk card (KTodayView's record): who wrote it, the docket, the stamp
  var card = KLetterCardModel()
  /// what the reader shows: the card's text (the translation if it is on), a voice letter's caption
  var text = ""
  /// "WRITTEN 3D AGO"
  var written = ""
  /// VoiceOver's docket line
  var docketA11y = ""
  var foldBack = ""
  var writeBack = ""
  var placeholder = ""
  var send = ""
  var emoji = ""
  /// the reply box's words (KReplyBox, as Today's): VoiceOver's names for expand and collapse, and
  /// a voice letter's name in the full page's quote
  var expandA11y = ""
  var collapseA11y = ""
  var voiceLetter = ""
  /// a reply is in the air: the crossing takes the foot
  var sending = false
  /// the "inflight" switch on: the crossing as Swift draws it (KLetterInFlight); nil keeps the
  /// "inflight" island
  var inflight: KLetterInFlightContent? = nil
}

/// The reply bar's field and TS's composer for this letter.
final class KLetterReaderDock: ObservableObject {
  let reply = KFieldController()
  @Published var sendState: KSendState = .disabled
  @Published var hint = ""
  @Published var hintWarn = false

  func apply(sendState: KSendState, hint: String, hintWarn: Bool) {
    if self.sendState != sendState { self.sendState = sendState }
    if self.hint != hint { self.hint = hint }
    if self.hintWarn != hintWarn { self.hintWarn = hintWarn }
  }
}

struct KLetterReaderScreen<InFlight: View>: View {
  /// the header's numbers (the React Native reader's)
  static var headerInsets: EdgeInsets { EdgeInsets(top: 14, leading: 18, bottom: 12, trailing: 18) }
  /// the reader head's stamp (STAMP_LADDER.readerHead)
  static var stampWidth: CGFloat { KStampLadder.readerHead.w }
  /// the letter's width on a page wider than any phone (KPhoneLength): about sixty characters a line
  static var readingWidth: CGFloat { 600 }
  static var docketStyle: KTextStyle { .mono(11, .semibold, tracking: 0.08) }
  static var whenStyle: KTextStyle { .mono(11, .medium, tracking: 0.08) }
  static var nameStyle: KTextStyle { .system(17, .semibold) }
  static var writtenStyle: KTextStyle { .mono(10, .medium, tracking: 0.06) }
  static var letterStyle: KTextStyle { .letterRead(19, lineHeight: 31.0 / 19.0, place: .reader) }

  let theme: KTheme
  let content: KLetterReaderContent
  /// the home indicator's room (the screen's bottom safe area)
  let bottomInset: CGFloat
  @ObservedObject var dock: KLetterReaderDock
  let actions: KLetterReaderActions
  /// the stamp's long press goes through the desk card's own stamp (its actions)
  let stampActions: KLetterCardActions
  let inFlight: () -> InFlight

  /* WRITE BACK opens TODAY'S REPLY BOX (owner, 2026-11-13: "长信 点了write back 还是老的这个reply"):
     the same KReplyBox the desk's REPLY raises (KReplyDock: "Replying to …", the field, emoji,
     send, expand to a full page with the letter's opening quoted), instead of the older mono hint
     over a pill. It stands over the page's foot, on the keyboard, and the foot keeps its height
     clear so the letter scrolls above it; expanded it is the whole page under the ✕. One field,
     kept in place both ways, so the words and the keyboard stay as they are. */
  /// WRITE BACK was pressed: the box is up (and stays mounted from then on)
  @State private var writing = false
  /// the box as the full page
  @State private var expanded = false
  /// the compact box's height, kept clear at the foot
  @State private var boxHeight: CGFloat = 0
  /// the keyboard's overlap of this page
  @State private var keyboard: CGFloat = 0

  init(
    theme: KTheme,
    content: KLetterReaderContent,
    bottomInset: CGFloat,
    dock: KLetterReaderDock,
    actions: KLetterReaderActions,
    stampActions: KLetterCardActions,
    @ViewBuilder inFlight: @escaping () -> InFlight
  ) {
    self.theme = theme
    self.content = content
    self.bottomInset = bottomInset
    self._dock = ObservedObject(wrappedValue: dock)
    self.actions = actions
    self.stampActions = stampActions
    self.inFlight = inFlight
  }

  var body: some View {
    ZStack(alignment: .bottom) {
      VStack(spacing: 0) {
        header
        ScrollView(.vertical, showsIndicators: false) {
          letter
            // (the sheet is flat since 2026-11-12: no 6 kept clear for a drop, so it sits centred)
            .padding(.horizontal, 16)
            // on a page wider than any phone (the iPhone Duo's inner screen) the letter keeps a
            // reading width in the middle instead of 110 characters to a line; a phone is unchanged
            .kPhoneLength(Self.readingWidth)
            .padding(.bottom, 28)
        }
        // a tap on the letter drops the keyboard (a React Native scroll view's own way)
        .simultaneousGesture(TapGesture().onEnded {
          if dock.reply.isFocused { dock.reply.blur() }
        })
        foot
      }
      if writing && !content.sending {
        replyBox
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background { theme.bg.ignoresSafeArea() }
    .onChange(of: content.sending) { _, now in
      // the crossing takes the foot: the field lets go first, and the box is compact next time
      guard now else { return }
      if dock.reply.isFocused { dock.reply.blur() }
      expanded = false
    }
    .background {
      // the keyboard's overlap: this reader extends under the keyboard, so its bottom inset is the
      // keyboard (the Host ignores every other safe area)
      GeometryReader { geo in
        Color.clear
          .onChange(of: geo.safeAreaInsets.bottom, initial: true) { _, inset in
            if abs(keyboard - inset) > 0.5 { keyboard = inset }
          }
      }
      .ignoresSafeArea(.keyboard)
    }
  }

  // ── ✕ FOLD BACK ──
  private var header: some View {
    HStack(spacing: 0) {
      SwiftUI.Button(action: actions.onClose) {
        HStack(spacing: 8) {
          // the app's close icon, as every page that closes draws it (owner, 2026-11-11: the ✕ was
          // a 15pt mono glyph, smaller than the rest)
          KLineIcon(.close, size: 20, lineWidth: 2.2, color: theme.ink)
          Text(content.foldBack)
            .kText(.system(15, .medium))
            .foregroundStyle(theme.sub)
            .lineLimit(2)
        }
        .padding(12)
        .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      // the target reaches 12 past the words, as the React Native hitSlop did, without moving them
      .padding(-12)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(content.foldBack)
      .accessibilityAddTraits(.isButton)
      Spacer(minLength: 0)
    }
    .padding(Self.headerInsets)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  // ── the letter in its panel ──
  private var letter: some View {
    InkCard(theme: theme, variant: .today, letter: true) {
      docket
        .padding(.bottom, 22)
      Text(content.text)
        .kText(Self.letterStyle)
        .foregroundStyle(theme.ink)
        .frame(maxWidth: .infinity, alignment: .leading)
        .fixedSize(horizontal: false, vertical: true)
      Text(content.written)
        .kText(Self.writtenStyle)
        .foregroundStyle(theme.mute)
        .padding(.top, 26)
    }
  }

  private var docket: some View {
    let card = content.card
    return HStack(alignment: .center, spacing: 10) {
      Group {
        if card.postmark.isEmpty {
          // the identity switch on (TS sends no postmark line): the card's new head
          HStack(alignment: .center, spacing: 10) {
            KCardFaceSlot(theme: theme, face: card.who.face)
            whoLines
              .frame(maxWidth: .infinity, alignment: .leading)
          }
        } else {
          // the switch off: the mosaic beside "SEP.23 · NO.7273"
          HStack(alignment: .center, spacing: 10) {
            Group {
              if case let .mosaic(mask) = card.who.face {
                KMosaic(mask: mask, cell: KLetterCard.mosaicCell, gap: 1, color: theme.ink)
              } else {
                KMosaic.veil(theme: theme, cell: KLetterCard.mosaicCell, gap: 1)
              }
            }
            .accessibilityHidden(true)
            Text(card.postmark)
              .kText(Self.docketStyle)
              .foregroundStyle(theme.ink)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
        }
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(content.docketA11y)
      KLetterReaderStamp(theme: theme, card: card, width: Self.stampWidth, stampActions: stampActions, onStamp: actions.onStamp)
    }
  }

  /// The name (with its mark and sign) over the date, as the card lays them out: all on the
  /// name's line; the glyphs on the date's line; the name on two lines. Never truncated.
  private var whoLines: some View {
    let who = content.card.who
    return ViewThatFits(in: .horizontal) {
      VStack(alignment: .leading, spacing: 2) {
        HStack(alignment: .firstTextBaseline, spacing: 0) {
          nameText.lineLimit(1).fixedSize()
          KWhoMarks(mark: who.mark, sign: who.sign, size: KLetterCard.markSize, color: theme.sub)
        }
        whenText
      }
      VStack(alignment: .leading, spacing: 2) {
        nameText.lineLimit(1).fixedSize()
        whenLine
      }
      VStack(alignment: .leading, spacing: 2) {
        nameText
          .lineLimit(2)
          .fixedSize(horizontal: false, vertical: true)
        whenLine
      }
    }
  }

  private var nameText: some View {
    Text(content.card.who.name)
      .kText(Self.nameStyle)
      .foregroundStyle(theme.ink)
  }

  private var whenText: some View {
    Text(content.card.when)
      .kText(Self.whenStyle)
      .foregroundStyle(theme.sub)
      .lineLimit(1)
  }

  private var whenLine: some View {
    HStack(alignment: .firstTextBaseline, spacing: 0) {
      whenText.fixedSize()
      KWhoMarks(mark: content.card.who.mark, sign: content.card.who.sign, size: KLetterCard.markSizeOnDate, color: theme.sub)
    }
  }

  // ── the reply box (see WRITE BACK OPENS TODAY'S REPLY BOX) ──
  private var replyLabels: KTodayLabels {
    var l = KTodayLabels()
    l.send = content.send
    l.emoji = content.emoji
    l.expandA11y = content.expandA11y
    l.collapseA11y = content.collapseA11y
    l.voiceLetter = content.voiceLetter
    return l
  }

  private var replyBox: some View {
    KReplyBox(
      theme: theme,
      labels: replyLabels,
      card: content.card,
      placeholder: content.placeholder,
      notice: dock.hint,
      noticeWarn: dock.hintWarn,
      sendState: dock.sendState,
      expanded: expanded,
      // on the keyboard it sits right on it; with the keyboard down, over the home indicator
      bottomPad: keyboard > 1 ? 0 : bottomInset,
      controller: dock.reply,
      onChange: { actions.onChange($0) },
      onFocus: { _ in },
      onEscape: {
        guard dock.reply.isFocused else { return false }
        dock.reply.blur()
        return true
      },
      onSend: {
        // nothing written yet: the key does nothing; a full pouch still goes to TS to say why
        guard dock.sendState != .disabled else { return }
        let words = dock.reply.text
        dock.reply.blur()
        expanded = false
        actions.onSend(words)
      },
      onExpand: { withAnimation(KReplyDock.grow) { expanded = true } },
      onCollapse: { withAnimation(KReplyDock.grow) { expanded = false } }
    )
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
      guard !expanded else { return }
      if abs(boxHeight - height) > 0.5 { boxHeight = height }
    }
    // the full page stops under the ✕
    .padding(.top, expanded ? 8 : 0)
    .kPhoneLength(Self.readingWidth)
    .accessibilityElement(children: .contain)
    .accessibilityAction(.escape) {
      if dock.reply.isFocused { dock.reply.blur() }
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility3)
  }

  // ── the foot: WRITE BACK, the reply box's room, or the crossing ──
  @ViewBuilder private var foot: some View {
    if writing && !content.sending {
      // the reply box stands here (the body's top layer): the room it takes, so the letter
      // scrolls above it
      Color.clear.frame(height: boxHeight)
    } else {
      footKeys
    }
  }

  private var footKeys: some View {
    let kbUp = keyboard > 1
    return ZStack(alignment: .bottom) {
      if !content.sending {
        SwiftUI.Button {
          writing = true
          dock.reply.focus()
        } label: {
          Text(content.writeBack)
            .kText(.system(16, .semibold))
            .foregroundStyle(theme.bg)
            .lineLimit(2)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Capsule(style: .circular).fill(theme.ink))
            .contentShape(Capsule(style: .circular))
        }
        .buttonStyle(KLetterReaderKeyStyle())
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)
      }
      if content.sending {
        Group {
          if let crossing = content.inflight {
            // the "inflight" switch on: the crossing drawn here (KLetterInFlight), the island left empty
            KLetterInFlight(theme: theme, content: crossing)
          } else {
            inFlight()
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .padding(.horizontal, 12)
    // under the letter, as wide as it (a phone: unchanged)
    .kPhoneLength(Self.readingWidth)
    .padding(.top, 14)
    .padding(.bottom, kbUp ? 12 : max(bottomInset, 12) + 12)
  }
}

/// WRITE BACK's press: .85 while held, as the React Native key.
private struct KLetterReaderKeyStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? 0.85 : 1)
      .animation(KMotion.press, value: configuration.isPressed)
  }
}

/// The reader head's stamp: the desk card's (KLetterCardStamp: the photo stamp's long-press menu),
/// with VoiceOver's name and the same two moves as actions for a stranger's photo stamp; any other
/// stamp is a picture VoiceOver passes over, as in React Native.
private struct KLetterReaderStamp: View {
  let theme: KTheme
  let card: KLetterCardModel
  let width: CGFloat
  let stampActions: KLetterCardActions
  let onStamp: (String) -> Void

  @ObservedObject private var registry = KCustomStamps.shared

  var body: some View {
    let stamp = KLetterCardStamp(theme: theme, card: card, width: width, actions: stampActions)
    if card.stampId.hasPrefix("c:"), let info = registry.info(card.stampId), info.canKeep {
      let words = registry.words
      stamp
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(words.spoken(info))
        .accessibilityAddTraits(.isImage)
        .accessibilityActions {
          if !info.kept {
            SwiftUI.Button(words.keep) { onStamp("keep") }
          }
          SwiftUI.Button(words.report) { onStamp("report") }
        }
    } else {
      stamp.accessibilityHidden(true)
    }
  }
}
