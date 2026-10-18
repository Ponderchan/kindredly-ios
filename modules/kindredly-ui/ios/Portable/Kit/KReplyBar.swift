// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE REPLY BAR (chat composers, Prompt 1; the owner's final, 2026-10-18): one object in two
 places, the Today reply (Today/KReplyDock.swift) and the pen-pal chat before names are traded
 (Chat/KDock.swift, letters). What leaves it is a letter: words and emoji, nothing else. No Wren
 tool, no +, no voice.

      LETTER 4 OF 5                                       the hint: mono 500 10 at .14em in sub
   ┌──────────────────────────────────────────────┐       (the postmark red when it warns), 6 in
   │ ↩  write back…                      ☺   (✈)  │       and 6 above the bar; the screen says
   └──────────────────────────────────────────────┘       when it shows (the keyboard is up)

 - THE BAR: 54 tall at one line, corners of 16, sf, a 2 ln outline and a hard 2/2 ln shadow
   (hanging outside, right and below: whoever places it leaves that room); padding 0 8 0 14
   inside the outline (border-box), its four parts 6 apart.
 - THE REPLY ARROW (I1 replyArrow) 20 across in ink at 1.9: it only says "this is where you write
   back", and points the other way from the plane (one comes in, one goes out). Decorative.
 - THE FIELD: a KComposerField (Kit/KComposerField.swift): system 16 in ink, the placeholder in
   mute, the caret ind; one line growing to four (about 110 tall; three at the accessibility
   sizes), then it scrolls inside.
 - THE EMOJI KEY (KEmojiKey): 36 square, corners 10, the I1 face 22 in ink; it switches the
   field's keyboard to the system emoji keyboard and back, lav while that keyboard is up.
 - THE SEND KEY (KSendDisc): a 36 circle, ink with the I1 plane 16 in white when it can send;
   #C9C6D6 and not pressable when it can't; drawn off but still pressed while dimmed (Today's full
   pouch, where TS says why).
 - The arrow, the emoji key and the send key stay centred on the resting row, on the bottom line,
   as the field grows.
 - Its icons don't grow with Dynamic Type; the field does (the screens cap the bar where their
   room runs out).

     KReplyBar(theme: t, controller: reply, placeholder: ph, hint: hint, showsHint: focused,
               sendState: canSend ? .enabled : .disabled, sendLabel: send, emojiLabel: emoji,
               returnSends: true, onSubmit: { send($0) }, onSend: { send(reply.text) })

 onSend is the key: read the words from the controller. In a returnSends field Return goes to
 onSubmit with the words; wire both to the same send.
 */
public struct KReplyBar: View {
  /// the bar's numbers (Prompt 1)
  public static let minHeight: CGFloat = 54
  public static let borderWidth: CGFloat = 2
  public static let cornerRadius: CGFloat = 16
  public static let shadowOffset: CGFloat = 2

  private let theme: KTheme
  private let controller: KFieldController
  private let placeholder: String
  private let hint: String
  private let hintWarn: Bool
  private let showsHint: Bool
  private let sendState: KSendState
  private let sendLabel: String
  private let emojiLabel: String
  private let returnSends: Bool
  private let autocapitalize: Bool
  private let onChange: (String) -> Void
  private let onSubmit: (String) -> Void
  private let onFocus: (Bool) -> Void
  private let onEscape: () -> Bool
  private let onSend: () -> Void

  @Environment(\.dynamicTypeSize) private var typeSize

  /// - Parameters:
  ///   - controller: the field's handle
  ///   - placeholder: the field's placeholder, already translated ("write back…")
  ///   - hint: the line over the bar, as it is drawn (already in capitals); "" for none
  ///   - hintWarn: the hint in the postmark red (over the limit)
  ///   - showsHint: the hint shows now (the screen's rule: while the keyboard is up)
  ///   - sendState: disabled, enabled or dimmed (see KSendDisc)
  ///   - sendLabel: SEND, what VoiceOver calls the send key
  ///   - emojiLabel: what VoiceOver calls the emoji key
  ///   - returnSends: Return sends (onSubmit) instead of making a new line
  ///   - onChange, onSubmit, onFocus, onEscape: the field's (KComposerField)
  ///   - onSend: the send key was pressed (enabled or dimmed); read the words from the controller
  public init(
    theme: KTheme,
    controller: KFieldController,
    placeholder: String,
    hint: String,
    hintWarn: Bool = false,
    showsHint: Bool,
    sendState: KSendState,
    sendLabel: String,
    emojiLabel: String,
    returnSends: Bool,
    autocapitalize: Bool = true,
    onChange: @escaping (String) -> Void = { _ in },
    onSubmit: @escaping (String) -> Void = { _ in },
    onFocus: @escaping (Bool) -> Void = { _ in },
    onEscape: @escaping () -> Bool = { false },
    onSend: @escaping () -> Void
  ) {
    self.theme = theme
    self.controller = controller
    self.placeholder = placeholder
    self.hint = hint
    self.hintWarn = hintWarn
    self.showsHint = showsHint
    self.sendState = sendState
    self.sendLabel = sendLabel
    self.emojiLabel = emojiLabel
    self.returnSends = returnSends
    self.autocapitalize = autocapitalize
    self.onChange = onChange
    self.onSubmit = onSubmit
    self.onFocus = onFocus
    self.onEscape = onEscape
    self.onSend = onSend
  }

  /// the room inside the outline at rest
  private var innerHeight: CGFloat { Self.minHeight - 2 * Self.borderWidth }

  public var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      if showsHint && !hint.isEmpty {
        Text(hint)
          .kText(.monoMetaWide)
          .foregroundStyle(hintWarn ? KBrand.postRed : theme.sub)
          .lineLimit(2)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.leading, 6)
      }
      bar
    }
  }

  private var bar: some View {
    HStack(alignment: .bottom, spacing: 6) {
      KLineIcon(.replyArrow, size: 20, lineWidth: 1.9, color: theme.ink)
        .alignmentGuide(.bottom) { $0[VerticalAlignment.center] + innerHeight / 2 }
      KComposerField(
        theme: theme,
        controller: controller,
        placeholder: placeholder,
        size: 16,
        // at the accessibility sizes a line is ~40pt: three, then it scrolls inside
        maxLines: typeSize.isAccessibilitySize ? 3 : 4,
        returnSends: returnSends,
        autocapitalize: autocapitalize,
        onChange: onChange,
        onSubmit: onSubmit,
        onFocus: onFocus,
        onEscape: onEscape
      )
      .padding(.vertical, 12)
      .frame(minHeight: innerHeight)
      .frame(maxWidth: .infinity, alignment: .leading)
      KEmojiKey(theme: theme, controller: controller, label: emojiLabel)
        .alignmentGuide(.bottom) { $0[VerticalAlignment.center] + innerHeight / 2 }
      KSendDisc(theme: theme, state: sendState, label: sendLabel, action: onSend)
        .alignmentGuide(.bottom) { $0[VerticalAlignment.center] + innerHeight / 2 }
    }
    // padding 0 8 0 14 inside the 2 outline (border-box)
    .padding(.leading, 14 + Self.borderWidth)
    .padding(.trailing, 8 + Self.borderWidth)
    .padding(.vertical, Self.borderWidth)
    .frame(minHeight: Self.minHeight)
    .background {
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: Self.cornerRadius, style: .circular),
        fill: theme.sf,
        stroke: theme.ln,
        lineWidth: Self.borderWidth,
        shadow: theme.ln,
        shadowOffset: Self.shadowOffset
      )
    }
    .accessibilityElement(children: .contain)
  }
}

/*
 THE EMOJI KEY of both chat bars (Prompt 5, decision 4): it switches its field's keyboard to the
 system emoji keyboard, and back on a second press (controller.toggleEmojiKeyboard; only a
 KComposerField honours it). The I1 face in ink (22; the Kindreds bar's 26) on a target of `side`:
 a square with corners of `cornerRadius` (the reply bar: 36 and 10), or a circle (circle: true).
 Its ground is lav while the emoji keyboard is up, and clear otherwise; it fills the target unless
 `ground` draws it smaller (the Kindreds bar: a 38 disc on a 44 target). VoiceOver reads it as a
 button, selected while the emoji keyboard is up.
 */
public struct KEmojiKey: View {
  private let theme: KTheme
  @ObservedObject private var controller: KFieldController
  private let label: String
  private let side: CGFloat
  private let cornerRadius: CGFloat
  private let circle: Bool
  private let iconSize: CGFloat
  private let ground: CGFloat?

  /// - Parameters:
  ///   - controller: the field whose keyboard it switches
  ///   - label: what VoiceOver calls it, already translated
  ///   - side: the key's square (or circle) in points
  ///   - cornerRadius: the square's corners (ignored for a circle)
  ///   - circle: a round key instead of a rounded square
  ///   - iconSize: the face, in points
  ///   - ground: the lav ground's side when it is drawn smaller than the target; nil fills it
  public init(theme: KTheme, controller: KFieldController, label: String, side: CGFloat = 36, cornerRadius: CGFloat = 10, circle: Bool = false, iconSize: CGFloat = 22, ground: CGFloat? = nil) {
    self.theme = theme
    self._controller = ObservedObject(wrappedValue: controller)
    self.label = label
    self.side = side
    self.cornerRadius = cornerRadius
    self.circle = circle
    self.iconSize = iconSize
    self.ground = ground
  }

  private var groundSide: CGFloat { ground ?? side }

  private var shape: RoundedRectangle {
    RoundedRectangle(cornerRadius: circle ? groundSide / 2 : cornerRadius, style: .circular)
  }

  public var body: some View {
    let on = controller.emojiKeyboard
    SwiftUI.Button {
      controller.toggleEmojiKeyboard()
    } label: {
      KLineIcon(.emoji, size: iconSize, lineWidth: 1.9, color: theme.ink)
        .frame(width: groundSide, height: groundSide)
        .background(shape.fill(on ? theme.lav : Color.clear))
        .frame(width: side, height: side)
        .contentShape(circle ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: cornerRadius, style: .circular)))
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityLabel(label)
    .accessibilityAddTraits(on ? .isSelected : [])
  }
}

/*
 THE SEND DISC of both chat bars (Prompt 1; the Kindreds bar's is the same disc in ind): a
 circle of `diameter` (36 in the reply bar) with the I1 line plane 16 across at 1.9.
 - enabled: `fill` (ink unless the bar gives another, the Kindreds bar ind) with the plane in
   white (in Midnight the page's dark, which is what reads on its pale ink and ind);
 - disabled: #C9C6D6 with the plane in white, not pressable (Midnight: its faint, with the plane
   in the page's dark, so it doesn't glow on the dark bar);
 - dimmed: the enabled disc at .35, still pressable, so the screen can say why (Today's full
   pouch: "a full pouch dims the plane before the tap, not after").
 VoiceOver reads the label (SEND) as a button, dimmed while disabled.
 */
public struct KSendDisc: View {
  /// the reply bar's disabled ground, on the light themes (Prompt 1)
  public static let disabledLight = Color(hex: "#C9C6D6")

  private let theme: KTheme
  private let state: KSendState
  private let label: String
  private let diameter: CGFloat
  private let fill: Color?
  private let action: () -> Void

  /// - Parameters:
  ///   - state: disabled, enabled or dimmed
  ///   - label: SEND, already translated
  ///   - diameter: the circle, in points
  ///   - fill: the enabled ground; nil for the theme's ink
  ///   - action: the disc was pressed (enabled or dimmed)
  public init(theme: KTheme, state: KSendState, label: String, diameter: CGFloat = 36, fill: Color? = nil, action: @escaping () -> Void) {
    self.theme = theme
    self.state = state
    self.label = label
    self.diameter = diameter
    self.fill = fill
    self.action = action
  }

  private var ground: Color {
    if state == .disabled { return theme.isDark ? theme.faint : Self.disabledLight }
    return fill ?? theme.ink
  }

  private var plane: Color {
    theme.isDark ? theme.bg : KBrand.paperWhite
  }

  public var body: some View {
    SwiftUI.Button(action: action) {
      KLineIcon(.planeLine, size: 16, lineWidth: 1.9, color: plane)
        .frame(width: diameter, height: diameter)
        .background(Circle().fill(ground))
        .contentShape(Circle())
    }
    .buttonStyle(KFloatPressStyle())
    .compositingGroup()
    .opacity(state == .dimmed ? 0.35 : 1)
    .disabled(state == .disabled)
    .animation(.easeOut(duration: 0.2), value: state)
    .accessibilityLabel(label)
  }
}
