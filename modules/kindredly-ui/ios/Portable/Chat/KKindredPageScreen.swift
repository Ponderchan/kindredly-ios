// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A KINDRED'S PAGE, IN SWIFTUI (2026-10-27, behind the "kindredpage" switch; the React Native page
 src/screens/chat/KindredPage.tsx stays its fallback). The room behind the name: what is true and
 already ours, and nothing else. Every word, number and rule is TS's
 (src/screens/chat/kindred-page-view.ts over kindred-page.ts); this draws them and reports taps.

   ‹               A kindred                    ⋯   the sticky secondary bar; the ⋯ only with
   ╭────────────────────────────────────────────╮   someone to report (TS opens the card)
   │ (face)  Mira                               │   the person on a soft card, corners 22: their
   │         ▦ THE FACE YOU WATCHED ARRIVE      │   face (round 64; a pen pal's window or flat
   ╰────────────────────────────────────────────╯   tile at 56, or their mosaic in cells of 9),
   ╭ THE NAME THEY SIGNED ──────────────────────╮   a member's in the gold stamp; the name 26/600
   │   their drawing on the pad's baseline      │   (before names: the archetype 24/600 and its
   │ FIRST MET AS SUNDAY KITE                   │   line). The signature (identity Phase 2) at
   ╰────────────────────────────────────────────╯   the pad's 1000 × 320 across the group, or
   ╭ WHAT THEIR LETTERS TOLD YOU    3 MOMENTS ──╮   the typed name in the Letter font's italic.
   │ EMOTION ━━━━━━━━━━──────                   │   Soft groups, corners 16: a line per
   │ the read, in warm words                    │   dimension that came through, the sealed ones
   ╰────────────────────────────────────────────╯   under KEEP WRITING; how alike you write, a
   ╭ HOW ALIKE YOU WRITE                    73% ╮   track per dimension (hollow you, solid them,
   │ RHYTHM    ───■───□──                       │   the span ink where you land together); the
   ╰────────────────────────────────────────────╯   facts as grouped rows, the stamp it began
   │ Corresponding since          OCT 1, 2026   │   under drawn delivered at 40; the opening
   │ Began under            Tiny win  [stamp]   │   letter in the reader's Letter font (its voice
   ╭ WHERE IT BEGAN ────────────────────────────╮   card above when it is a voice letter); TALK
   │ the opening, five lines                    │   TO as the ink key, corners 14.
   ╰────────────────────────────────────────────╯
   [            TALK TO MIRA                    ]

 Rule B: the controls are flat; the cards and groups are the theme's soft with no edge and no
 shadow, as on the React Native page (owner, 2026-10-21: the ink frame was too heavy here).
 Type: System for the interface, SF Mono for the labels, the Letter font for the opening and a
 typed signature.

 Large type: from xxxLarge a fact's value goes under its label and a track's label over its track.
 HOW ALIKE YOU WRITE's labels are never cut (owner's audit, 2026-11-10: "SENTENCE SH…",
 "EMOTIONAL R…" in a fixed 86): the label column is as wide as the widest of the nine, measured
 in the reader's language and text size, up to 46% of the card; a label longer than that wraps
 (PALABRAS / FUNCIONALES on a small phone) and the nine tracks still start on one line
 (KKindredTracks).
 VoiceOver: a stamped face says its stamp; each dimension, each track and each fact is one
 element; the signature says whose hand it is, with Report this signature and Block as actions
 when it can be held (its hint says so). A held signature (450ms) reports its slot in this
 page's own points (`space`), from its top left; TS drops the card under it.
 */

/// How the face is drawn.
public enum KKindredFace: Equatable {
  /// a kindred: their picture (or the soft disc while it loads), round at 64
  case round(KFaceSource)
  /// a pen pal with the identity switch on: their frosted window at 56
  case frost(KFrostSpec)
  /// a closed account with the identity switch on: the flat veil tile at 56
  case tile
  /// a pen pal with the switch off: their mosaic, cells of 9 and gaps of 2.4
  case mosaic(mask: Int)
  /// a closed account with the switch off: the veil mosaic, cells of 9
  case veil
}

/// THE NAME THEY SIGNED: their drawing, or the typed pen name.
public struct KKindredSignature {
  public let label: String
  public let name: String
  /// a typed CJK name stands upright
  public let typedUpright: Bool
  public let a11y: String
  public let hint: String
  public let holdable: Bool
  /// the drawing in box units; nil for a typed name
  public let path: Path?
  /// the pad's box (PEN v1: 1000 × 320)
  public let box: CGSize
  /// the pad's baseline, in box units
  public let baselineY: CGFloat
  /// FIRST MET AS …; "" for none
  public let met: String

  public init(label: String, name: String, typedUpright: Bool, a11y: String, hint: String, holdable: Bool, path: Path?, box: CGSize, baselineY: CGFloat, met: String) {
    self.label = label
    self.name = name
    self.typedUpright = typedUpright
    self.a11y = a11y
    self.hint = hint
    self.holdable = holdable
    self.path = path
    self.box = box
    self.baselineY = baselineY
    self.met = met
  }
}

public struct KKindredDim: Identifiable, Equatable {
  public let id: String
  public let label: String
  /// 0...100
  public let score: Double
  public let line: String

  public init(id: String, label: String, score: Double, line: String) {
    self.id = id
    self.label = label
    self.score = score
    self.line = line
  }
}

public struct KKindredLearned: Equatable {
  public let label: String
  public let moments: String
  public let dims: [KKindredDim]
  /// KEEP WRITING; "" when nothing is sealed
  public let sealedLabel: String
  public let sealed: String

  public init(label: String, moments: String, dims: [KKindredDim], sealedLabel: String, sealed: String) {
    self.label = label
    self.moments = moments
    self.dims = dims
    self.sealedLabel = sealedLabel
    self.sealed = sealed
  }
}

public struct KKindredTrack: Identifiable, Equatable {
  public let id: String
  public let label: String
  /// where you land and where they land, 0...100
  public let mine: Double
  public let theirs: Double
  public let together: Bool
  public let a11y: String

  public init(id: String, label: String, mine: Double, theirs: Double, together: Bool, a11y: String) {
    self.id = id
    self.label = label
    self.mine = mine
    self.theirs = theirs
    self.together = together
    self.a11y = a11y
  }
}

public struct KKindredResonance: Equatable {
  public let label: String
  public let score: String
  public let rows: [KKindredTrack]
  public let close: String
  public let far: String

  public init(label: String, score: String, rows: [KKindredTrack], close: String, far: String) {
    self.label = label
    self.score = score
    self.rows = rows
    self.close = close
    self.far = far
  }
}

public struct KKindredFact: Identifiable, Equatable {
  public let id: String
  public let label: String
  public let value: String
  /// the stamp it began under; "" for none
  public let stamp: String
  public let letterId: String

  public init(id: String, label: String, value: String, stamp: String, letterId: String) {
    self.id = id
    self.label = label
    self.value = value
    self.stamp = stamp
    self.letterId = letterId
  }
}

public struct KKindredOpening: Equatable {
  public let label: String
  public let voice: Bool
  public let duration: String
  public let body: String
  public let lines: Int
  public let who: String

  public init(label: String, voice: Bool, duration: String, body: String, lines: Int, who: String) {
    self.label = label
    self.voice = voice
    self.duration = duration
    self.body = body
    self.lines = lines
    self.who = who
  }
}

public struct KKindredPageContent {
  public enum State: String, Sendable {
    /// nothing read yet: the bar alone
    case loading
    case ready
    /// nothing kept and no network
    case offline
    /// the server calls it gone (or hidden by a block) and nothing is kept
    case missing
  }

  public var state: State = .loading
  public var title = ""
  public var backLabel = ""
  /// VoiceOver for the ⋯; "" draws no ⋯
  public var moreLabel = ""
  public var offlineTitle = ""
  public var offlineBody = ""
  public var missingBody = ""
  public var playLabel = ""
  public var pauseLabel = ""
  public var reportLabel = ""
  public var blockLabel = ""

  public var face: KKindredFace = .veil
  public var stamp: KMemberStamp?
  /// VoiceOver for a stamped face; "" leaves the face unread
  public var faceA11y = ""
  public var revealed = false
  public var heading = ""
  /// a kindred's she/he mark and star sign after the name (TS decides; nil for none, and always
  /// nil before names are traded: the mark is a kindred's to see, owner 2026-11-12)
  public var mark: KLineGlyph?
  public var sign: KLineGlyph?
  /// VoiceOver for the name with its marks ("Mira, she, Gemini"); "" reads the heading alone
  public var headingA11y = ""
  public var sub = ""
  /// THE FACE YOU WATCHED ARRIVE; "" for none
  public var arrival = ""
  public var arrivalMask = 0

  public var signed: KKindredSignature?
  public var learned: KKindredLearned?
  public var resonance: KKindredResonance?
  public var facts: [KKindredFact] = []
  public var opening: KKindredOpening?
  /// the voice opening can't play yet (no signed link)
  public var voiceUnavailable = false
  /// TALK TO {NAME}; "" for no door
  public var talk = ""

  public init() {}
}

/// The voice opening's player, as TS reports it (only the opening plays on this page).
public final class KKindredPageDriver: ObservableObject {
  @Published public var playback: KPlayback?

  public init() {}
}

public final class KKindredPageActions {
  public var onBack: () -> Void = {}
  public var onMore: () -> Void = {}
  public var onTalk: () -> Void = {}
  public var onVoice: () -> Void = {}
  /// the signature was held: its slot in the page's points (KKindredPageScreen.space)
  public var onHold: (CGRect) -> Void = { _ in }
  /// VoiceOver's action on the signature: "report" or "block"
  public var onSignatureAction: (String) -> Void = { _ in }

  public init() {}
}

public struct KKindredPageScreen: View {
  /// the coordinate space a held signature's slot is measured in
  public static let space = "kKindredPage"

  private let theme: KTheme
  private let content: KKindredPageContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  @ObservedObject private var driver: KKindredPageDriver
  private let actions: KKindredPageActions

  public init(theme: KTheme, content: KKindredPageContent, topInset: CGFloat, bottomInset: CGFloat, driver: KKindredPageDriver, actions: KKindredPageActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.driver = driver
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true) {
        if !content.moreLabel.isEmpty {
          more
        }
      } onBack: {
        actions.onBack()
      }
      switch content.state {
      case .loading:
        Spacer(minLength: 0)
      case .offline:
        note {
          Text(content.offlineTitle)
            .kText(.system(16, .semibold))
            .foregroundStyle(theme.ink)
          Text(content.offlineBody)
            .kText(.system(14, lineHeight: 20.0 / 14.0))
            .foregroundStyle(theme.sub)
        }
      case .missing:
        note {
          Text(content.missingBody)
            .kText(.system(14, lineHeight: 20.0 / 14.0))
            .foregroundStyle(theme.sub)
        }
      case .ready:
        page
      }
    }
    .coordinateSpace(.named(Self.space))
    .background { theme.bg.ignoresSafeArea() }
  }

  /// the ⋯, as the room's Swift header draws it
  private var more: some View {
    SwiftUI.Button {
      actions.onMore()
    } label: {
      KLineIcon(.more, size: 22, lineWidth: 4, color: theme.ink)
        .frame(width: 40, height: 44)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(content.moreLabel)
  }

  /// the offline and missing lines: under the bar, centred, 48 down
  private func note<Words: View>(@ViewBuilder _ words: () -> Words) -> some View {
    VStack(spacing: 0) {
      VStack(spacing: 8) {
        words()
      }
      .multilineTextAlignment(.center)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity)
      .padding(.horizontal, 32)
      .padding(.top, 48)
      Spacer(minLength: 0)
    }
  }

  private var page: some View {
    ScrollView(.vertical) {
      VStack(alignment: .leading, spacing: 14) {
        person
        if let signed = content.signed {
          KKindredSignedGroup(theme: theme, sig: signed, reportLabel: content.reportLabel, blockLabel: content.blockLabel, actions: actions)
        }
        if let learned = content.learned {
          learnedGroup(learned)
        }
        if let resonance = content.resonance {
          resonanceGroup(resonance)
        }
        facts
        if let opening = content.opening {
          openingCard(opening)
        }
        if !content.talk.isEmpty {
          talk
        }
      }
      .padding(.horizontal, 16)
      .padding(.top, 16)
      .padding(.bottom, 40 + bottomInset)
    }
    .scrollIndicators(.hidden)
  }

  // MARK: the person

  private var person: some View {
    HStack(alignment: .center, spacing: 16) {
      face
      VStack(alignment: .leading, spacing: 0) {
        if content.revealed {
          // the name, then a kindred's she/he mark and star sign (0.8 × the 26pt name)
          HStack(alignment: .firstTextBaseline, spacing: 0) {
            Text(content.heading)
              .kText(.system(26, .semibold, lineHeight: 32.0 / 26.0))
              .foregroundStyle(theme.ink)
              .fixedSize(horizontal: false, vertical: true)
            KWhoMarks(mark: content.mark, sign: content.sign, size: 21, color: theme.sub)
          }
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(content.headingA11y.isEmpty ? content.heading : content.headingA11y)
          .accessibilityAddTraits(.isHeader)
          if !content.arrival.isEmpty {
            HStack(alignment: .center, spacing: 8) {
              KMosaic(mask: content.arrivalMask, cell: 3, gap: 1, color: theme.ink)
              Text(content.arrival)
                .modifier(KKindredLabel(theme: theme))
                .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, 7)
          }
        } else {
          // no name yet, and that is the point: the archetype is what their writing has told you
          Text(content.heading)
            .kText(.system(24, .semibold, lineHeight: 30.0 / 24.0))
            .foregroundStyle(theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
          Text(content.sub)
            .kText(.system(14, lineHeight: 20.0 / 14.0))
            .foregroundStyle(theme.sub)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, 5)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .modifier(KKindredSoft(theme: theme, radius: 22))
  }

  @ViewBuilder
  private var face: some View {
    if content.faceA11y.isEmpty {
      faceDrawn
    } else {
      faceDrawn
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(content.faceA11y)
    }
  }

  @ViewBuilder
  private var faceDrawn: some View {
    switch content.face {
    case let .round(source):
      KFace(theme: theme, source: source, size: 64, ground: theme.soft, stamp: content.stamp)
    case let .frost(spec):
      KFace(theme: theme, source: .frost(spec), size: 56, stamp: content.stamp)
    case .tile:
      KFace(theme: theme, source: .frostVeil, size: 56)
    case let .mosaic(mask):
      if let stamp = content.stamp {
        // React Native's StampMosaic: the mosaic at the page's proportions on a soft2 tile
        KStampAvatar(theme: theme, size: 56, stamp: stamp) { inner in
          ZStack {
            RoundedRectangle(cornerRadius: KMemberStamp.innerRadius, style: .circular).fill(theme.soft2)
            KMosaic(mask: mask, cell: 9 * inner / 56, gap: 2.4 * inner / 56, color: theme.ink)
          }
        }
      } else {
        KMosaic(mask: mask, cell: 9, gap: 2.4, color: theme.ink)
      }
    case .veil:
      KMosaic.veil(theme: theme, cell: 9, gap: 2.4)
    }
  }

  // MARK: what their letters have told you

  private func learnedGroup(_ l: KKindredLearned) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center, spacing: 8) {
        Text(l.label)
          .modifier(KKindredLabel(theme: theme))
        Spacer(minLength: 0)
        Text(l.moments)
          .kText(.mono(10, .semibold, tracking: 0.14))
          .foregroundStyle(theme.ind)
          .lineLimit(1)
          .fixedSize()
      }
      .accessibilityElement(children: .combine)
      .accessibilityAddTraits(.isHeader)
      ForEach(l.dims) { d in
        KKindredMoment(theme: theme, dim: d)
          .padding(.top, 14)
      }
      if !l.sealedLabel.isEmpty {
        theme.line
          .frame(height: 1)
          .padding(.top, 14)
          .padding(.bottom, 12)
          .accessibilityHidden(true)
        Text(l.sealedLabel)
          .modifier(KKindredLabel(theme: theme))
          .accessibilityAddTraits(.isHeader)
        Text(l.sealed)
          .kText(KTextStyle(face: .monoMedium, size: 11, weight: .medium, lineHeight: 19.0 / 11.0))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 6)
      }
    }
    .modifier(KKindredSoft(theme: theme, radius: 16))
  }

  // MARK: how alike you write

  private func resonanceGroup(_ r: KKindredResonance) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center, spacing: 8) {
        Text(r.label)
          .modifier(KKindredLabel(theme: theme))
        Spacer(minLength: 0)
        Text(r.score)
          .kText(.mono(KMonoSizes.figure(13), .semibold, tracking: 0.5 / 13))
          .foregroundStyle(theme.ind)
          .lineLimit(1)
          .fixedSize()
      }
      .accessibilityElement(children: .combine)
      .accessibilityAddTraits(.isHeader)
      KKindredTracks(theme: theme, rows: r.rows)
        .padding(.top, 14)
      theme.line
        .frame(height: 1)
        .padding(.top, 4)
        .padding(.bottom, 12)
        .accessibilityHidden(true)
      if !r.close.isEmpty {
        Text(r.close)
          .kText(.system(15, lineHeight: 22.0 / 15.0))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
      }
      if !r.far.isEmpty {
        Text(r.far)
          .kText(.system(15, lineHeight: 22.0 / 15.0))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 4)
      }
    }
    .modifier(KKindredSoft(theme: theme, radius: 16))
  }

  // MARK: the correspondence, as facts

  private var facts: some View {
    VStack(spacing: 0) {
      ForEach(Array(content.facts.enumerated()), id: \.element.id) { i, f in
        KKindredFactRow(theme: theme, fact: f, last: i == content.facts.count - 1)
      }
    }
    .padding(.horizontal, 16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))
  }

  // MARK: the letter that started it

  private func openingCard(_ o: KKindredOpening) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(o.label)
        .modifier(KKindredLabel(theme: theme))
        .accessibilityAddTraits(.isHeader)
      if o.voice {
        KKindredVoiceCard(theme: theme, duration: o.duration, playLabel: content.playLabel, pauseLabel: content.pauseLabel, unavailable: content.voiceUnavailable, driver: driver) {
          actions.onVoice()
        }
      }
      if !o.body.isEmpty {
        // a letter being read: the reader's Letter font
        Text(o.body)
          .kText(.content(16, lineHeight: 24.0 / 16.0))
          .foregroundStyle(o.voice ? theme.sub : theme.ink)
          .lineLimit(max(1, o.lines))
          .fixedSize(horizontal: false, vertical: true)
      }
      Text(o.who)
        .modifier(KKindredLabel(theme: theme))
    }
    .modifier(KKindredSoft(theme: theme, radius: 22))
  }

  // MARK: TALK TO

  /// the 10a secondary key: ink, the page colour on it, corners 14, flat
  private var talk: some View {
    SwiftUI.Button {
      actions.onTalk()
    } label: {
      Text(content.talk)
        .kText(.system(14, .semibold, tracking: 0.4 / 14))
        .foregroundStyle(theme.bg)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.ink))
        .contentShape(RoundedRectangle(cornerRadius: 14, style: .circular))
    }
    .buttonStyle(KFadePressStyle())
  }
}

/// A section's label: SF Mono 500 10 at .14em, in mute.
struct KKindredLabel: ViewModifier {
  let theme: KTheme

  func body(content: Content) -> some View {
    content
      .kText(.mono(10, .medium, tracking: 0.14))
      .foregroundStyle(theme.mute)
  }
}

/// The page's soft card (corners 22) and soft group (corners 16): the theme's soft, padding 16,
/// no edge and no shadow.
struct KKindredSoft: ViewModifier {
  let theme: KTheme
  let radius: CGFloat

  func body(content: Content) -> some View {
    content
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: radius, style: radius > 16 ? .continuous : .circular).fill(theme.soft))
  }
}

/// A held signature's slot, kept where a scroll doesn't redraw anything.
final class KKindredSlot {
  var rect: CGRect = .zero
}

/// THE NAME THEY SIGNED: the drawing across the group at the pad's aspect, its baseline faint
/// under it, or the typed name; then FIRST MET AS.
struct KKindredSignedGroup: View {
  let theme: KTheme
  let sig: KKindredSignature
  let reportLabel: String
  let blockLabel: String
  let actions: KKindredPageActions

  @State private var slot = KKindredSlot()

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(sig.label)
        .modifier(KKindredLabel(theme: theme))
        .accessibilityAddTraits(.isHeader)
      signature
        .padding(.top, 10)
      if !sig.met.isEmpty {
        Text(sig.met)
          .modifier(KKindredLabel(theme: theme))
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 8)
      }
    }
    .modifier(KKindredSoft(theme: theme, radius: 16))
  }

  private var signature: some View {
    Color.clear
      .aspectRatio(sig.box.width / max(1, sig.box.height), contentMode: .fit)
      .frame(maxWidth: .infinity)
      .overlay {
        GeometryReader { geo in
          mark(in: geo.size)
        }
      }
      .contentShape(Rectangle())
      .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(KKindredPageScreen.space)) } action: { slot.rect = $0 }
      .onLongPressGesture(minimumDuration: 0.45) {
        if sig.holdable { actions.onHold(slot.rect) }
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(sig.a11y)
      .accessibilityHint(sig.hint)
      .modifier(KKindredSignatureActions(holdable: sig.holdable, reportLabel: reportLabel, blockLabel: blockLabel, onAction: actions.onSignatureAction))
  }

  @ViewBuilder
  private func mark(in size: CGSize) -> some View {
    if let path = sig.path {
      let box = sig.box
      let baselineY = sig.baselineY
      let ink = theme.ink
      let ln = theme.ln
      Canvas { gc, canvas in
        guard box.width > 0 else { return }
        let s = canvas.width / box.width
        let fit = CGAffineTransform(scaleX: s, y: s)
        var base = Path()
        base.move(to: CGPoint(x: box.width * 0.06, y: baselineY))
        base.addLine(to: CGPoint(x: box.width * 0.94, y: baselineY))
        gc.stroke(base.applying(fit), with: .color(ln), lineWidth: 1)
        // the stroke is given in points, so a signature reads the same weight at every size
        gc.stroke(path.applying(fit), with: .color(ink), style: StrokeStyle(lineWidth: 2.4, lineCap: .round, lineJoin: .round))
      }
      .frame(width: size.width, height: size.height)
    } else {
      // a typed signature is something someone wrote: the Letter font, italic where it has one
      Text(sig.name)
        .kText(.content(max(13, size.height * 0.42), italic: !sig.typedUpright))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.5)
        .frame(width: size.width, height: size.height)
    }
  }
}

/// Report this signature and Block, for VoiceOver, while someone is behind it.
struct KKindredSignatureActions: ViewModifier {
  let holdable: Bool
  let reportLabel: String
  let blockLabel: String
  let onAction: (String) -> Void

  func body(content: Content) -> some View {
    if holdable {
      content
        .accessibilityAction(named: Text(reportLabel)) { onAction("report") }
        .accessibilityAction(named: Text(blockLabel)) { onAction("block") }
    } else {
      content
    }
  }
}

/// One dimension that has come through: its name and strength, then the read in warm words.
struct KKindredMoment: View {
  let theme: KTheme
  let dim: KKindredDim

  var body: some View {
    VStack(alignment: .leading, spacing: 5) {
      HStack(alignment: .center, spacing: 10) {
        Text(dim.label)
          .kText(.mono(10, .semibold, tracking: 0.12))
          .foregroundStyle(theme.ink)
        GeometryReader { g in
          ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2, style: .circular).fill(theme.line)
            RoundedRectangle(cornerRadius: 2, style: .circular)
              .fill(theme.ind)
              .frame(width: g.size.width * min(1, max(0, dim.score / 100)))
          }
        }
        .frame(height: 3)
        .accessibilityHidden(true)
      }
      Text(dim.line)
        .kText(.system(15.5, lineHeight: 23.0 / 15.5))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
    }
    .accessibilityElement(children: .combine)
  }
}

/// The tracks under HOW ALIKE YOU WRITE, their labels in one column (owner's audit, 2026-11-10).
/// The column was a fixed 86 with one line each, which cut every label longer than twelve
/// letters. Now it is as wide as the widest label, measured unseen on one line in the reader's
/// language and text size, up to `share` of the card; a label longer than that wraps inside it.
/// Every row gets the same column, so the tracks stay aligned to one another.
struct KKindredTracks: View {
  let theme: KTheme
  let rows: [KKindredTrack]

  /// the most of the card the label column may take
  static let share: CGFloat = 0.46
  /// between a label and its track
  static let gap: CGFloat = 10
  /// the column until the labels are measured (the first layout pass): the old fixed one
  static let unmeasured: CGFloat = 86

  /// the widest label on one line, and the rows' own width
  @State private var widest: CGFloat = 0
  @State private var width: CGFloat = 0

  private var column: CGFloat {
    guard widest > 0, width > 0 else { return Self.unmeasured }
    return min(widest.rounded(.up) + Self.gap, (width * Self.share).rounded(.down))
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      ForEach(rows) { row in
        KKindredTrackRow(theme: theme, row: row, column: column)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
    .background(alignment: .topLeading) {
      // every label on one line, never drawn: as wide as the widest of them
      ZStack(alignment: .leading) {
        ForEach(rows) { row in
          KKindredTrackRow.label(row.label, theme: theme)
            .lineLimit(1)
            .fixedSize()
        }
      }
      .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { widest = $0 }
      .hidden()
      .accessibilityHidden(true)
      .allowsHitTesting(false)
    }
  }
}

/// One dimension, both of you on the same track: hollow is you, solid is them; the span between
/// you goes ink when you land together.
struct KKindredTrackRow: View {
  let theme: KTheme
  let row: KKindredTrack
  /// the label column all nine rows share (KKindredTracks)
  let column: CGFloat

  @Environment(\.dynamicTypeSize) private var typeSize

  var body: some View {
    Group {
      // from xxxLarge the label goes over its track, at its full width
      if typeSize >= .xxxLarge {
        VStack(alignment: .leading, spacing: 6) {
          label
            .fixedSize(horizontal: false, vertical: true)
          track
        }
        .padding(.bottom, 14)
      } else {
        HStack(alignment: .center, spacing: 0) {
          // in full, on as many lines as it needs: never cut
          label
            .fixedSize(horizontal: false, vertical: true)
            .padding(.trailing, KKindredTracks.gap)
            .frame(width: column, alignment: .leading)
          track
        }
        .padding(.bottom, 11)
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(row.a11y)
  }

  private var label: some View {
    Self.label(row.label, theme: theme)
  }

  /// a track's label: SF Mono 500 10 at .06em, in sub (KKindredTracks measures the same)
  static func label(_ text: String, theme: KTheme) -> some View {
    Text(text)
      .kText(.mono(10, .medium, tracking: 0.06))
      .foregroundStyle(theme.sub)
  }

  private var track: some View {
    GeometryReader { g in
      let w = g.size.width
      let mid = g.size.height / 2
      let lo = min(row.mine, row.theirs) / 100
      let hi = max(row.mine, row.theirs) / 100
      ZStack(alignment: .topLeading) {
        Rectangle()
          .fill(theme.line)
          .frame(width: w, height: 1)
          .offset(y: mid - 0.5)
        // the span between you
        Rectangle()
          .fill(row.together ? theme.ink : theme.line)
          .frame(width: max(hi - lo, 0.005) * w, height: 1)
          .offset(x: lo * w, y: mid - 0.5)
        Rectangle()
          .fill(theme.ink)
          .frame(width: 7, height: 7)
          .offset(x: row.theirs / 100 * w - 3.5, y: mid - 3.5)
        Rectangle()
          .fill(theme.soft)
          .overlay(Rectangle().strokeBorder(theme.ind, lineWidth: 1.5))
          .frame(width: 7, height: 7)
          .offset(x: row.mine / 100 * w - 3.5, y: mid - 3.5)
      }
    }
    .frame(height: 12)
    .accessibilityHidden(true)
  }
}

/// A fact as a grouped row: the label in the system face, the value quiet on the right; from
/// xxxLarge it stacks under the label, as the system's grouped rows do.
struct KKindredFactRow: View {
  let theme: KTheme
  let fact: KKindredFact
  let last: Bool

  @Environment(\.dynamicTypeSize) private var typeSize

  var body: some View {
    let stack = typeSize >= .xxxLarge
    let layout = stack ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4)) : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
    layout {
      Text(fact.label)
        .kText(.system(15))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
      if !stack {
        Spacer(minLength: 0)
      }
      HStack(alignment: .center, spacing: 8) {
        Text(fact.value)
          .kText(.mono(11, .medium))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(stack ? .leading : .trailing)
          .fixedSize(horizontal: false, vertical: true)
        if !fact.stamp.isEmpty {
          // it came on the letter that opened the correspondence: delivered, tilted by that letter
          KStamp(id: fact.stamp, width: KStampLadder.kindredBeganUnder.w, dark: theme.isDark, delivered: true, letterId: fact.letterId.isEmpty ? nil : fact.letterId)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.vertical, 10)
    .frame(minHeight: 48)
    .overlay(alignment: .bottom) {
      if !last {
        theme.line.frame(height: 1)
      }
    }
    .accessibilityElement(children: .combine)
  }
}

/// The voice opening's card on the one player TS owns (only this view redraws as it plays).
struct KKindredVoiceCard: View {
  let theme: KTheme
  let duration: String
  let playLabel: String
  let pauseLabel: String
  let unavailable: Bool
  @ObservedObject var driver: KKindredPageDriver
  let onToggle: () -> Void

  var body: some View {
    let playback = driver.playback
    // paused part-way it shows where it stopped, as React Native's card does
    let stopped = playback.map { !$0.playing && $0.positionS > 0 ? KVoiceCard.clock($0.positionS) : "" } ?? ""
    KVoiceCard(
      theme: theme,
      playback: playback,
      durationLabel: duration,
      positionLabel: stopped,
      playLabel: playLabel,
      pauseLabel: pauseLabel,
      unavailable: unavailable,
      onToggle: onToggle
    )
  }
}
