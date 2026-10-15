// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE 10a REPLY STRIP (H:124): the writing bar of rooms, pen-pal chats and the Today reply dock.
 sf, a 2.5 ln outline, corners of 26 and a hard 4/4 ln shadow; at least 54 tall and growing with
 the field up to its line limit (the corners stay 26); padding 0 8 0 20 inside the outline
 (border-box). In it, the KField (system 17, ink, mute placeholder, ind caret) and at its right
 end the send key (KSendKey: the faint SEND pill while it can't send, the ink plane pill when it
 can, per owner question 3).

     KReplyStrip(theme: t,
                 field: KField(theme: t, controller: reply, placeholder: ph, returnSends: true,
                               onChange: …, onSubmit: { send($0) }),
                 sendState: canSend ? .enabled : .disabled,
                 sendLabel: sendWord,
                 onSend: { send(reply.text) }) {
       KRoundTool(theme: t, glyph: .plus(open: trayOpen), accessibilityLabel: plusLabel) { … }
     }

 - leading and trailing are views beside the strip, outside it, 8 apart: the round tools (Wren,
   the +). Whatever their height, they are centred on the strip's resting 54, and stay there,
   at the bottom, as the field grows (bottom-aligned, as the chat spec has it).
 - The send key keeps to the bottom line too, centred on the resting height.
 - onSend is the key: read the text from the field's controller. Return in a returnSends field
   goes to the field's own onSubmit, with the text; wire both to the same send.
 - The strip sizes to its content and takes the width it is offered. Its shadow hangs 4 outside
   to the right and below (whoever places it leaves that room, as the mock's 12 inset does).
 - The hint under it (H:125, mono 500 10 .14em in sub, 14 from the left) is the screen's.
 */
public struct KReplyStrip<Leading: View, Trailing: View>: View {
  /// the strip's numbers (H:124)
  public static var minHeight: CGFloat { 54 }
  public static var borderWidth: CGFloat { 2.5 }
  public static var cornerRadius: CGFloat { 26 }
  public static var shadowOffset: CGFloat { 4 }

  private let theme: KTheme
  private let field: KField
  private let sendState: KSendState
  private let sendStyle: KSendStyle
  private let sendLabel: String
  private let leading: Leading
  private let trailing: Trailing
  private let onSend: () -> Void

  /// - Parameters:
  ///   - field: the KField to write in
  ///   - sendState: disabled, enabled or dimmed (KSendKey)
  ///   - sendStyle: the enabled key's look; owner question 3's answer by default
  ///   - sendLabel: SEND, already translated
  ///   - leading: tools beside the strip on the left (round tools), or nothing
  ///   - trailing: tools beside the strip on the right, or nothing
  ///   - onSend: the send key was pressed (enabled or dimmed); read the text from the controller
  public init(
    theme: KTheme,
    field: KField,
    sendState: KSendState,
    sendStyle: KSendStyle = .standard,
    sendLabel: String,
    @ViewBuilder leading: () -> Leading,
    @ViewBuilder trailing: () -> Trailing,
    onSend: @escaping () -> Void
  ) {
    self.theme = theme
    self.field = field
    self.sendState = sendState
    self.sendStyle = sendStyle
    self.sendLabel = sendLabel
    self.leading = leading()
    self.trailing = trailing()
    self.onSend = onSend
  }

  /// the room inside the outline at rest
  private var innerHeight: CGFloat { Self.minHeight - 2 * Self.borderWidth }

  public var body: some View {
    HStack(alignment: .bottom, spacing: 8) {
      leading
        .alignmentGuide(.bottom) { $0[VerticalAlignment.center] + Self.minHeight / 2 }
      strip
      trailing
        .alignmentGuide(.bottom) { $0[VerticalAlignment.center] + Self.minHeight / 2 }
    }
    .accessibilityElement(children: .contain)
  }

  private var strip: some View {
    HStack(alignment: .bottom, spacing: 8) {
      field
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 12)
        .frame(minHeight: innerHeight)
      KSendKey(theme: theme, state: sendState, style: sendStyle, label: sendLabel, action: onSend)
        // centred on the resting row, and kept on the bottom line as the field grows
        .alignmentGuide(.bottom) { $0[VerticalAlignment.center] + innerHeight / 2 }
    }
    // padding 0 8 0 20 inside the 2.5 outline (border-box)
    .padding(.leading, 20 + Self.borderWidth)
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
  }
}

public extension KReplyStrip where Leading == EmptyView, Trailing == EmptyView {
  /// A strip with nothing beside it.
  init(theme: KTheme, field: KField, sendState: KSendState, sendStyle: KSendStyle = .standard, sendLabel: String, onSend: @escaping () -> Void) {
    self.init(theme: theme, field: field, sendState: sendState, sendStyle: sendStyle, sendLabel: sendLabel, leading: { EmptyView() }, trailing: { EmptyView() }, onSend: onSend)
  }
}

public extension KReplyStrip where Trailing == EmptyView {
  /// A strip with tools on its left (the room's Wren and +).
  init(theme: KTheme, field: KField, sendState: KSendState, sendStyle: KSendStyle = .standard, sendLabel: String, onSend: @escaping () -> Void, @ViewBuilder leading: () -> Leading) {
    self.init(theme: theme, field: field, sendState: sendState, sendStyle: sendStyle, sendLabel: sendLabel, leading: leading, trailing: { EmptyView() }, onSend: onSend)
  }
}
