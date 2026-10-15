// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE LETTER'S EDITOR: KField's rules on a TextEditor.

 KField is a TextField, which grows with its words; inside a ScrollView, a growing TextField
 does not reliably keep the caret above the toolbar for a letter of a thousand weighted
 characters (critic, compose). A TextEditor is a UITextView: it fills the room the page gives it
 and scrolls itself to keep the caret in view, so the caret stays above the toolbar however long
 the letter grows, and the keyboard's arrival only shortens the room.

 Everything else is KField's (Kit/KField.swift), on the same KFieldController:
 - uncontrolled: the words live here and are never written back from props, so a Japanese or
   Korean composition in progress is never written over; onChange reports the reader's edits
   (typing, pasting, dictation), never a setText;
 - setText (a draft resumed, a remount), focus and blur come through the controller, and a
   spent one is never replayed on a rebuilt editor; a rebuilt editor starts from controller.text;
 - Return is a newline: letters keep their paragraphs. Nothing here sends.
 The writing style is system 17 (KTextStyle.input, H:136) in ink, the caret ind, the placeholder
 (the spark) mute, drawn over the empty editor where UITextView puts its first line.

 Never take it off screen while it holds the keyboard (the expo focus/unmount crash): the page
 swaps it for the caption field only from the + tray, which blurs first.
 */
struct KComposeEditor: View {
  /// UITextView's own room: its text container sits 8 below its top, and lays each line 5 in
  /// from either side (textContainerInset.top, lineFragmentPadding); the placeholder sits there
  static var linePadding: CGFloat { 5 }
  static var topInset: CGFloat { 8 }

  @ObservedObject private var controller: KFieldController
  private let theme: KTheme
  private let placeholder: String
  private let accessibilityLabel: String
  private let onChange: (String) -> Void
  private let onFocus: (Bool) -> Void

  @State private var text: String
  @FocusState private var focused: Bool
  /// the text both sides already know (reported, or written by setText)
  @State private var known: String
  /// the last value a setText wrote, so its change isn't reported as typing
  @State private var programmatic: String?

  init(
    theme: KTheme,
    controller: KFieldController,
    placeholder: String,
    accessibilityLabel: String,
    onChange: @escaping (String) -> Void,
    onFocus: @escaping (Bool) -> Void
  ) {
    self._controller = ObservedObject(wrappedValue: controller)
    self.theme = theme
    self.placeholder = placeholder
    self.accessibilityLabel = accessibilityLabel
    self.onChange = onChange
    self.onFocus = onFocus
    self._text = State(initialValue: controller.text)
    self._known = State(initialValue: controller.text)
  }

  var body: some View {
    TextEditor(text: $text)
      .kText(.input)
      .foregroundStyle(theme.ink)
      .tint(theme.ind)
      .scrollContentBackground(.hidden)
      .scrollIndicators(.hidden)
      .scrollDismissesKeyboard(.interactively)
      .textInputAutocapitalization(.sentences)
      .focused($focused)
      .overlay(alignment: .topLeading) {
        if text.isEmpty {
          Text(placeholder)
            .kText(.input)
            .foregroundStyle(theme.mute)
            .padding(.top, Self.topInset)
            .padding(.horizontal, Self.linePadding)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
      }
      .accessibilityLabel(accessibilityLabel)
      .onChange(of: text) { _, new in
        edited(new)
      }
      .onChange(of: focused) { _, now in
        controller.isFocused = now
        onFocus(now)
      }
      .onChange(of: controller.textRequest) { _, request in
        apply(request)
      }
      .onChange(of: controller.focusRequest) { _, request in
        apply(request)
      }
      .onAppear {
        // a setText no field has applied yet: only while it is still what the controller holds
        // (the reader may have typed in another field on this controller since)
        if let request = controller.textRequest, request.serial > controller.appliedTextSerial {
          if request.value == controller.text {
            apply(request)
          } else {
            controller.appliedTextSerial = request.serial
          }
        }
        // a focus asked for before the editor was on screen: once it is in the window
        if let request = controller.focusRequest, request.focused, request.serial > controller.appliedFocusSerial {
          DispatchQueue.main.async {
            if controller.focusRequest == request { apply(request) }
          }
        }
      }
  }

  private func apply(_ request: KFieldController.TextRequest?) {
    guard let request, request.serial > controller.appliedTextSerial else { return }
    controller.appliedTextSerial = request.serial
    controller.fieldDidChange(request.value)
    if text != request.value {
      programmatic = request.value
      text = request.value
    }
    known = request.value
  }

  private func apply(_ request: KFieldController.FocusRequest?) {
    guard let request, request.serial > controller.appliedFocusSerial else { return }
    controller.appliedFocusSerial = request.serial
    focused = request.focused
  }

  /// Every change of the words: a setText landing is nobody's news; the reader's edit is reported.
  private func edited(_ new: String) {
    if let pending = programmatic, pending == new {
      programmatic = nil
      known = new
      return
    }
    programmatic = nil
    guard new != known else { return }
    known = new
    controller.fieldDidChange(new)
    onChange(new)
  }
}
