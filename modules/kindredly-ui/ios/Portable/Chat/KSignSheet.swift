// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SIGNING SHEET, IN SWIFT (2026-10-27, behind the "signsheet" switch): what the sign door
 opens in the pen-pal chat when the identity switch is on, as the React Native sheet draws it
 (src/screens/chat/SignSheet.tsx SignSheetViewRN). Everything it decides stays TS's
 (src/screens/chat/SignSheetNative.tsx, the rules in sign-sheet.ts): the pen name's check and its
 red line, the faces offered and the one chosen, the strokes (TS keeps them, through a failed
 send, and turns them into the published drawing), Type it instead, the guest line, the send and
 every server call. The window it rises in (a transparent Modal, the dim, the slide, the sheet's
 sf with its top corners and ln rule) is TS's too, and the sign-in sheet a guest opens. This
 draws the sheet's inside and reports each tap:

     ✕                 the title, System 500 17 centred; the ✕ (SF Mono 16, mute), off while
                       the send is out
     the lead line     System 16/23 in sub
     THE FACE YOU SEND SF Mono 600 10 labels (.14em, mute); a row of faces, 52 in a 60 ring
                       (2pt ind on the chosen), NO FACE under the glyph; the row starts with the
                       chosen face in sight; the note under it 13/18 in mute
     YOUR PEN NAME     a one-line field in the well (soft; soft2 on Midnight), System 17, no
                       capitals, no corrections, Done and the clear key; the red line
                       (dangerInk) or the note under it
     YOUR SIGNATURE    the pad, or the typed preview; Type it instead / Draw it instead (14/600
                       ind); the legal line with Undo and Clear
     the guest line    in the well, with its link
     SIGN AND SEND     ind capsule (14 corners), the page colour's words, .35 while it can't go
     the foot          12.5/18 in sub, centred

 THE PAD (identity Phase 2 §6.2 item 4, components/SignaturePad in React Native): the box's
 aspect (TS sends its size), the line you sign on (1pt ln at PEN_BASELINE, from 6% to 94% of the
 width, a small × at its left end in sub), the pen name being traced under the ink at 10% (the
 Letter font's italic, upright for CJK, never wider than 70% of the pad, on the line; "sign here"
 with no name yet; never scaled by Dynamic Type), the caption in the corner until the first
 stroke. One finger draws from its first touch: the live stroke is smoothed here exactly as TS
 smooths the published one (penStrokePath, ported below), each finished stroke goes to TS as its
 points, and TS sends back every stroke as one path (`ink`) with their count; a stroke just
 finished stays drawn here until TS has it, so nothing blinks. A finger on the pad owns it: the
 sheet doesn't scroll while it is down, and touching the pad puts the keyboard away. No strokes
 are taken once the pad is full (TS's 32).

 VoiceOver: escape closes it; Type it instead takes the focus once the sheet has risen (450 ms);
 the faces are buttons with a selected state; the pad is one element (its label, the stroke
 count as its value); the typed preview is one element (the name, or "sign here"). TS announces
 the red line when it appears. Dynamic Type: every word scales (labels to about 1.6×, keys to
 about 1.8×), rows wrap, and the pad and the faces keep their size.
 */

public struct KSignSheetFace: Equatable, Sendable, Identifiable {
  /// its place in the row
  public let id: Int
  public let source: KFaceSource
  /// VoiceOver ("Face 2 of 9", "No face")
  public let label: String
  /// No face (the glyph): NO FACE is written under it
  public let none: Bool

  public init(id: Int, source: KFaceSource, label: String, none: Bool) {
    self.id = id
    self.source = source
    self.label = label
    self.none = none
  }
}

public struct KSignSheetContent: Equatable, Sendable {
  public var title = ""
  public var closeLabel = ""
  public var lead = ""
  public var faceLabel = ""
  public var faceNote = ""
  /// NO FACE, already upper-cased
  public var faceNone = ""
  public var nameLabel = ""
  /// the field's placeholder (the first trade only; "" later)
  public var namePlaceholder = ""
  /// the note under the field
  public var nameNote = ""
  /// the red line in the note's place; "" for none
  public var nameError = ""
  /// the red line's ink (dangerInk: the postal red toward the ink)
  public var errorInk: Color = .red
  /// VoiceOver for the field's clear key
  public var clearLabel = ""
  public var signLabel = ""
  /// Type it instead, or Draw it instead while typed
  public var typeToggle = ""
  /// VoiceOver's hint on Type it instead; "" while typed
  public var typeHint = ""
  public var legal = ""
  public var undo = ""
  public var clear = ""
  /// the guest line and its link; "" for an account
  public var guestText = ""
  public var guestLink = ""
  /// SIGN AND SEND, or "…" while the send is out
  public var send = ""
  public var foot = ""

  public var faces: [KSignSheetFace] = []
  /// the chosen face's place in the row
  public var chosen = 0

  /// Type it instead is on: the typed preview in the pad's place
  public var typed = false
  /// the pen name as it would go ("" for none yet)
  public var typedName = ""
  public var typedUpright = false
  /// the typed preview's faint words with no name ("sign here")
  public var typedEmpty = ""
  public var typedEmptyUpright = false

  /// the pad's size, in points (TS's padSizeOf)
  public var padSize = CGSize(width: 343, height: 110)
  /// the words traced under the ink (the pen name, or "sign here")
  public var guide = ""
  public var guideUpright = false
  /// the corner caption ("trace your pen name")
  public var caption = ""
  public var padLabel = ""
  /// the pad's VoiceOver value (how many strokes); "" for none
  public var padValue = ""
  /// every finished stroke as one SVG path, in pad points (TS's padInkPath)
  public var ink = ""
  public var strokeCount = 0
  /// the pad takes no more strokes
  public var full = false

  /// SIGN AND SEND may go
  public var canSend = false
  /// the send is out: nothing closes the sheet
  public var busy = false

  public init() {}
}

public final class KSignSheetActions {
  public var onClose: () -> Void = {}
  /// a face picked: its place in the row
  public var onFace: (Int) -> Void = { _ in }
  /// Type it instead / Draw it instead
  public var onTypeToggle: () -> Void = {}
  /// a stroke finished: its points, x0, y0, x1, y1 …, in pad points
  public var onStroke: ([Double]) -> Void = { _ in }
  public var onUndo: () -> Void = {}
  public var onClear: () -> Void = {}
  /// the guest line's link
  public var onGuest: () -> Void = {}
  public var onSend: () -> Void = {}
  /// the pen name typed (never a setText)
  public var onName: (String) -> Void = { _ in }

  public init() {}
}

public struct KSignSheet: View {
  /// the sheet has risen: VoiceOver goes to Type it instead (FOCUS_AFTER_MS)
  static let focusAfter: TimeInterval = 0.45

  private let theme: KTheme
  private let content: KSignSheetContent
  private let field: KFieldController
  private let bottomInset: CGFloat
  private let actions: KSignSheetActions

  /// a finger is on the pad: the sheet doesn't scroll
  @State private var drawing = false
  @AccessibilityFocusState private var typeFocused: Bool
  @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver

  public init(theme: KTheme, content: KSignSheetContent, field: KFieldController, bottomInset: CGFloat, actions: KSignSheetActions) {
    self.theme = theme
    self.content = content
    self.field = field
    self.bottomInset = bottomInset
    self.actions = actions
  }

  /// the wells (the field, the pad, the guest line): soft, except on Midnight, where soft is the
  /// sheet's own sf and a well would vanish into it
  private var well: Color { theme.isDark ? theme.soft2 : theme.soft }

  public var body: some View {
    VStack(spacing: 0) {
      header
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: 22) {
          Text(content.lead)
            .kText(.system(16, lineHeight: 23.0 / 16.0))
            .foregroundStyle(theme.sub)
            .fixedSize(horizontal: false, vertical: true)
          faceSection
          nameSection
          signSection
          if !content.guestText.isEmpty {
            guestLine
          }
          VStack(spacing: 12) {
            sendKey
            Text(content.foot)
              .kText(.system(12.5, lineHeight: 18.0 / 12.5))
              .foregroundStyle(theme.sub)
              .multilineTextAlignment(.center)
              .fixedSize(horizontal: false, vertical: true)
              .frame(maxWidth: .infinity)
              .padding(.horizontal, 8)
          }
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
        .padding(.bottom, max(bottomInset, 12) + 20)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .scrollIndicators(.automatic)
      .scrollDisabled(drawing)
      .scrollDismissesKeyboard(.immediately)
    }
    .background(theme.sf)
    .accessibilityAction(.escape) { actions.onClose() }
    .onAppear {
      guard voiceOver else { return }
      DispatchQueue.main.asyncAfter(deadline: .now() + Self.focusAfter) { typeFocused = true }
    }
  }

  // MARK: - The title and the ✕

  private var header: some View {
    HStack(spacing: 0) {
      // the ✕'s room mirrored on the left, so the title is centred
      Color.clear.frame(width: 36, height: 1)
      Text(content.title)
        .kText(.system(17, .medium))
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity)
        .accessibilityAddTraits(.isHeader)
      SwiftUI.Button(action: { actions.onClose() }) {
        Text(verbatim: "✕")
          .font(.system(size: 16, design: .monospaced))
          .foregroundStyle(theme.mute)
          .frame(width: 44, height: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .disabled(content.busy)
      .accessibilityLabel(content.closeLabel)
    }
    .padding(.leading, 16)
    .padding(.trailing, 8)
    .padding(.top, 12)
    .padding(.bottom, 4)
  }

  private func label(_ text: String) -> some View {
    Text(text)
      .kText(.mono(10, .semibold, tracking: 0.14))
      .dynamicTypeSize(...DynamicTypeSize.accessibility1)
      .foregroundStyle(theme.mute)
      .accessibilityAddTraits(.isHeader)
  }

  private func smallKey(_ text: String, disabled: Bool, action: @escaping () -> Void) -> some View {
    SwiftUI.Button(action: action) {
      Text(text)
        .kText(.system(14, .semibold))
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .foregroundStyle(theme.ind)
        .padding(.vertical, 4)
        .padding(.horizontal, 2)
        // the React Native keys' hitSlop of 8
        .padding(8)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(-8)
    .disabled(disabled)
    .opacity(disabled ? 0.35 : 1)
  }

  // MARK: - THE FACE YOU SEND

  private var faceSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      label(content.faceLabel)
      ScrollViewReader { proxy in
        ScrollView(.horizontal) {
          HStack(alignment: .top, spacing: 4) {
            Color.clear.frame(width: 12, height: 1)
            ForEach(content.faces) { face in
              faceKey(face)
                .id(face.id)
            }
            Color.clear.frame(width: 12, height: 1).id(Self.rowEnd)
          }
        }
        .scrollIndicators(.hidden)
        .padding(.horizontal, -16)
        .onAppear {
          // the chosen face in sight as the sheet opens (No face, last, at the row's end); only
          // as it opens, never after a choice
          let at = content.chosen
          guard at > 0, at < content.faces.count else { return }
          let none = content.faces[at].none
          DispatchQueue.main.async {
            if none {
              proxy.scrollTo(Self.rowEnd, anchor: .trailing)
            } else {
              proxy.scrollTo(at, anchor: .center)
            }
          }
        }
      }
      Text(content.faceNote)
        .kText(.system(13, lineHeight: 18.0 / 13.0))
        .foregroundStyle(theme.mute)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  /// the trailing spacer's id, for "the end of the row"
  private static let rowEnd = -1

  private func faceKey(_ face: KSignSheetFace) -> some View {
    let on = face.id == content.chosen
    return SwiftUI.Button(action: { actions.onFace(face.id) }) {
      VStack(spacing: 4) {
        KFace(theme: theme, source: face.source, size: 52, ground: theme.sf)
          .frame(width: 60, height: 60)
          .overlay(Circle().strokeBorder(on ? theme.ind : Color.clear, lineWidth: 2))
        if face.none {
          Text(content.faceNone)
            .kText(.mono(9, .medium, tracking: 0.1))
            .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
            .foregroundStyle(on ? theme.ind : theme.sub)
        }
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(KSignFacePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(face.label)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
  }

  // MARK: - YOUR PEN NAME

  private var nameSection: some View {
    VStack(alignment: .leading, spacing: 8) {
      label(content.nameLabel)
      KOneLineField(
        theme: theme,
        controller: field,
        placeholder: content.namePlaceholder,
        accessibilityLabel: content.nameLabel,
        accessibilityHint: content.nameError.isEmpty ? content.nameNote : content.nameError,
        clearLabel: content.clearLabel,
        // no limit while typing: iOS would cut a Japanese or Chinese composition mid-word; the
        // red line says when it is too long, and TS keeps SIGN AND SEND off
        maxLength: Int.max,
        capitalizeWords: false,
        onChange: { actions.onName($0) },
        onSubmit: { field.blur() }
      )
      .padding(.horizontal, 14)
      .background(well, in: RoundedRectangle(cornerRadius: 16, style: .circular))
      Text(content.nameError.isEmpty ? content.nameNote : content.nameError)
        .kText(.system(13, lineHeight: 18.0 / 13.0))
        .foregroundStyle(content.nameError.isEmpty ? theme.mute : content.errorInk)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 4)
    }
  }

  // MARK: - YOUR SIGNATURE

  private var signSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      ViewThatFits(in: .horizontal) {
        HStack(spacing: 12) {
          label(content.signLabel)
          Spacer(minLength: 0)
          typeKey
        }
        VStack(alignment: .leading, spacing: 4) {
          label(content.signLabel)
          typeKey
        }
      }
      if content.typed {
        typedPreview
      } else {
        KSignPad(theme: theme, content: content, well: well, drawing: $drawing, onBegin: { field.blur() }, onStroke: actions.onStroke)
      }
      // the legal line beside Undo and Clear while it keeps 180 (React Native's flexBasis), else
      // the keys wrap under it; its ideal width is that 180, so the row is measured by it and not
      // by the whole line unwrapped
      ViewThatFits(in: .horizontal) {
        HStack(alignment: .center, spacing: 14) {
          legal.frame(minWidth: 180, idealWidth: 180, maxWidth: .infinity, alignment: .leading)
          if !content.typed { padKeys }
        }
        VStack(alignment: .trailing, spacing: 6) {
          legal.frame(maxWidth: .infinity, alignment: .leading)
          if !content.typed { padKeys }
        }
      }
    }
  }

  private var typeKey: some View {
    SwiftUI.Button(action: { actions.onTypeToggle() }) {
      Text(content.typeToggle)
        .kText(.system(14, .semibold))
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .foregroundStyle(theme.ind)
        .padding(.vertical, 4)
        .padding(8)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .padding(-8)
    .accessibilityHint(content.typeHint)
    .accessibilityFocused($typeFocused)
  }

  private var legal: some View {
    Text(content.legal)
      .kText(.system(13, lineHeight: 18.0 / 13.0))
      .foregroundStyle(theme.sub)
      .fixedSize(horizontal: false, vertical: true)
  }

  private var padKeys: some View {
    HStack(spacing: 16) {
      smallKey(content.undo, disabled: content.strokeCount == 0) { actions.onUndo() }
      smallKey(content.clear, disabled: content.strokeCount == 0) { actions.onClear() }
    }
    .fixedSize()
  }

  /// "Type it instead": the pen name set as a typed signature (components/PenSignature's typed
  /// branch, fit "box" at 86% of the pad), or the faint "sign here" with no name yet
  private var typedPreview: some View {
    let pad = content.padSize
    let box = CGSize(width: pad.width * 0.86, height: pad.width * 0.86 * 0.32)
    return ZStack {
      well
      if !content.typedName.isEmpty {
        Text(content.typedName)
          .kText(content.typedUpright ? .system(max(13, box.height * 0.42)) : .content(max(13, box.height * 0.42), italic: true))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
          .frame(maxWidth: box.width)
          .frame(width: box.width, height: box.height)
      } else {
        Text(content.typedEmpty)
          .font(content.typedEmptyUpright ? .system(size: pad.height * 0.36) : .system(size: pad.height * 0.36).italic())
          .foregroundStyle(theme.ink.opacity(0.1))
          .lineLimit(1)
      }
    }
    .frame(width: pad.width, height: pad.height)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .circular))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.typedName.isEmpty ? content.typedEmpty : content.typedName)
  }

  // MARK: - The guest line, SIGN AND SEND

  private var guestLine: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(content.guestText)
        .kText(.system(14, lineHeight: 20.0 / 14.0))
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
      SwiftUI.Button(action: {
        field.blur()
        actions.onGuest()
      }) {
        Text(content.guestLink)
          .kText(.system(14, .semibold))
          .dynamicTypeSize(...DynamicTypeSize.accessibility1)
          .foregroundStyle(theme.ind)
          .padding(.vertical, 2)
          .padding(8)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .padding(-8)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(well, in: RoundedRectangle(cornerRadius: 14, style: .circular))
  }

  private var sendKey: some View {
    let can = content.canSend
    return SwiftUI.Button(action: {
      field.blur()
      actions.onSend()
    }) {
      Text(content.send)
        .kText(.system(16, .semibold, tracking: 0.4 / 16))
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .foregroundStyle(theme.bg)
        .multilineTextAlignment(.center)
        .padding(.vertical, 15)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity)
        .background(theme.ind, in: RoundedRectangle(cornerRadius: 14, style: .circular))
        .opacity(!can && !content.busy ? 0.35 : 1)
        .contentShape(Rectangle())
    }
    .buttonStyle(KSignSendPressStyle())
    .disabled(!can)
  }
}

/// A face in the row: .7 while pressed, as the React Native face key.
private struct KSignFacePressStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? 0.7 : 1)
      .animation(KMotion.press, value: configuration.isPressed)
  }
}

/// SIGN AND SEND: .85 while pressed, as the React Native key.
private struct KSignSendPressStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? 0.85 : 1)
      .animation(KMotion.press, value: configuration.isPressed)
  }
}

// MARK: - The pad

/// Where a pen name is signed by hand (see the note at the top of the file).
struct KSignPad: View {
  static let strokeWidth: CGFloat = 2.4
  /// the guide's share of the ink
  static let guideAlpha: Double = 0.1
  /// the guide never spans more than this share of the pad
  static let guideSpan: CGFloat = 0.7
  /// PEN_BASELINE (lib/pen-signature): 230 of the box's 320
  static let baseline: CGFloat = 230.0 / 320.0

  let theme: KTheme
  let content: KSignSheetContent
  let well: Color
  @Binding var drawing: Bool
  /// a finger went down: the keyboard goes
  let onBegin: () -> Void
  let onStroke: ([Double]) -> Void

  /// the stroke under the finger
  @State private var live: [CGPoint]?
  /// strokes finished here that TS hasn't counted yet: each with the count that will include it
  @State private var awaiting: [(count: Int, points: [CGPoint])] = []

  private var size: CGSize { content.padSize }
  private var inked: Bool { content.strokeCount > 0 || live != nil || !awaiting.isEmpty }

  var body: some View {
    let w = size.width
    let h = size.height
    let baseY = (h * Self.baseline).rounded()
    let ink = content.ink.isEmpty ? Path() : KSVGPath.path(content.ink)
    ZStack(alignment: .topLeading) {
      well
      guide(baseY: baseY)
      Canvas { ctx, _ in
        // the line you sign on, and the × at its left end
        var line = Path()
        line.move(to: CGPoint(x: w * 0.06, y: baseY))
        line.addLine(to: CGPoint(x: w * 0.94, y: baseY))
        ctx.stroke(line, with: .color(theme.ln), lineWidth: 1)
        var cross = Path()
        cross.move(to: CGPoint(x: w * 0.06, y: baseY - 13))
        cross.addLine(to: CGPoint(x: w * 0.06 + 7, y: baseY - 6))
        cross.move(to: CGPoint(x: w * 0.06 + 7, y: baseY - 13))
        cross.addLine(to: CGPoint(x: w * 0.06, y: baseY - 6))
        ctx.stroke(cross, with: .color(theme.sub), style: StrokeStyle(lineWidth: 1.4, lineCap: .round))
        let style = StrokeStyle(lineWidth: Self.strokeWidth, lineCap: .round, lineJoin: .round)
        ctx.stroke(ink, with: .color(theme.ink), style: style)
        for stroke in awaiting {
          ctx.stroke(Self.strokePath(stroke.points), with: .color(theme.ink), style: style)
        }
        if let live {
          ctx.stroke(Self.strokePath(live), with: .color(theme.ink), style: style)
        }
      }
      .frame(width: w, height: h)
      if !inked {
        Text(content.caption)
          .kText(.mono(10, .medium, tracking: 0.06))
          .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
          .foregroundStyle(theme.sub)
          .padding(.leading, 12)
          .padding(.top, 9)
          .transition(.opacity)
      }
    }
    .frame(width: w, height: h)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .circular))
    .animation(.easeOut(duration: inked ? 0.18 : 0.16), value: inked)
    .contentShape(Rectangle())
    .gesture(draw)
    .onChange(of: content.strokeCount) { old, new in
      // TS has counted them: drop what it has (all of it after an undo or a clear, and once the
      // pad is full, when TS takes no more)
      if new < old || content.full {
        awaiting = []
      } else {
        awaiting.removeAll { $0.count <= new }
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.padLabel)
    .accessibilityValue(content.padValue)
  }

  /// the pen name being traced, under the ink, sitting on the line
  private func guide(baseY: CGFloat) -> some View {
    let h = size.height
    let guideSize = (h * 0.42).rounded()
    return ZStack(alignment: .top) {
      Color.clear.frame(width: size.width, height: h)
      Text(content.guide)
        .kText(content.guideUpright ? .system(guideSize) : .content(guideSize, italic: true))
        .foregroundStyle(theme.ink.opacity(Self.guideAlpha))
        .lineLimit(1)
        .minimumScaleFactor(0.01)
        .frame(maxWidth: size.width * Self.guideSpan)
        // its baseline on the pad's
        .alignmentGuide(.top) { d in d[.firstTextBaseline] - baseY }
    }
    // the pad's size is fixed: the guide never grows with Dynamic Type
    .dynamicTypeSize(.large)
    .frame(width: size.width, height: h, alignment: .top)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  private var draw: some Gesture {
    DragGesture(minimumDistance: 0, coordinateSpace: .local)
      .onChanged { v in
        let p = clamp(v.location)
        if live == nil {
          guard !content.full, !drawing else { return }
          drawing = true
          onBegin()
          // the touch-down point, as React Native's pad begins (a tap is a one-point dot)
          let start = clamp(v.startLocation)
          live = p == start ? [start] : [start, p]
          return
        }
        live?.append(p)
      }
      .onEnded { _ in
        let stroke = live
        live = nil
        drawing = false
        guard let stroke, !stroke.isEmpty else { return }
        awaiting.append((count: content.strokeCount + awaiting.count + 1, points: stroke))
        onStroke(stroke.flatMap { [Double($0.x), Double($0.y)] })
      }
  }

  private func clamp(_ p: CGPoint) -> CGPoint {
    CGPoint(x: min(size.width, max(0, p.x)), y: min(size.height, max(0, p.y)))
  }

  /// One stroke, smoothed as lib/pen-signature penStrokePath smooths it (keep the two the same):
  /// from the first point, a quadratic through each point to the midpoint of the next pair, then
  /// a line to the last point; one point is a dot (a hair-length line a round cap draws as one).
  static func strokePath(_ pts: [CGPoint]) -> Path {
    var p = Path()
    guard let first = pts.first else { return p }
    p.move(to: first)
    if pts.count == 1 {
      p.addLine(to: CGPoint(x: first.x + 0.1, y: first.y))
      return p
    }
    if pts.count > 2 {
      for i in 1..<(pts.count - 1) {
        let a = pts[i]
        let b = pts[i + 1]
        p.addQuadCurve(to: CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2), control: a)
      }
    }
    p.addLine(to: pts[pts.count - 1])
    return p
  }
}
