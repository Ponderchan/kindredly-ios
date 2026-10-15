// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ONE TEXT FIELD of the Swift surfaces: the reply strip in rooms and chats, the Today reply
 dock, the compose editor and its caption and question, the room's question prompt. It is
 UNCONTROLLED: the words live in the field's own @State and are never written back from props,
 so nothing from outside can land on a Japanese or Korean composition in progress (marked
 text). Whoever holds the field talks to it through a KFieldController instead:

     @StateObject private var reply = KFieldController()
     …
     KField(theme: t, controller: reply, placeholder: ph, returnSends: true,
            onChange: { draft = $0 }, onSubmit: { send($0) })
     …
     reply.setText(savedDraft)   // seed or restore: a draft, the words after a failed send
     reply.focus()               // raise the keyboard
     reply.blur()                // drop it (before a push, a sheet, an alert)

 In the React Native app the screen adapter owns the controllers and turns the setText, focus
 and blur commands (KCommandBus) into these calls.

 RULES
 - onChange reports what the reader typed (and pasted), after the rules below; never the text a
   setText put there, so a seed doesn't echo back to whoever sent it.
 - Return-to-send (returnSends: true, the reply strips): when the last edit inserted one
   newline and nothing else, wherever the caret was, the newline is taken out again and
   onSubmit gets the text. An IME's Return commits its composition without a newline, so it
   never sends; a pasted block with newlines in it is kept as pasted. The keyboard's return key
   says "send". The field doesn't decide whether the text may go: onSubmit does (and clears the
   field with setText("") when it went). A one-line field (axis .horizontal) sends on the
   return key the ordinary way.
 - Without returnSends (the compose and journal editors) Return is a newline.
 - maxLength cuts the text at that many characters (grapheme clusters, as people count them).
   It cuts as the text arrives, so a composition in progress at the limit can be cut too; it is
   for short fields (a name), not for letters.
 - The font goes through .kText, so the field grows with Dynamic Type; the writing style is
   system 17 (KTextStyle.input, H:124). The caret is the tint (ind in the 10a fields).
 - Focus and blur are by controller after mount. A focus asked for before the field is on
   screen is kept and applied when it appears.

 THE FOCUS/UNMOUNT CRASH (expo issues 40354, 47682, 49348): never take a focused field off
 screen. Keep the composer mounted for the life of the screen and hide or disable it under the
 gone line or the expired card, after blur(). Every Expo adapter that holds a KField conforms to
 ExpoSwiftUI.FocusableView, and its forceResignFirstResponder() calls blur() on each of its
 controllers and then resigns the first responder app-wide (UIKit is the adapter's business; this
 file stays SwiftUI).
 */

/// The handle on one KField: seed its text, focus it, blur it, and read what it holds.
public final class KFieldController: ObservableObject {
  /// A setText waiting to be applied; the serial makes two identical texts two requests.
  struct TextRequest: Equatable {
    let value: String
    let serial: Int
  }

  /// A focus change waiting to be applied.
  struct FocusRequest: Equatable {
    let focused: Bool
    let serial: Int
  }

  /// What the field holds right now, kept up to date by the field as the reader types (and set
  /// at once by setText). Not published: reading it never redraws anything.
  public private(set) var text: String
  /// Whether the field has the keyboard right now, kept up to date by the field.
  public internal(set) var isFocused = false

  @Published private(set) var textRequest: TextRequest?
  @Published private(set) var focusRequest: FocusRequest?
  private var serial = 0

  /// - Parameter text: the words the field starts with
  public init(text: String = "") {
    self.text = text
  }

  /// Replaces the field's words: a draft resumed, the words put back after a failed send, the
  /// field cleared after a send went. The field's onChange does not report it.
  public func setText(_ value: String) {
    text = value
    serial += 1
    textRequest = TextRequest(value: value, serial: serial)
  }

  /// Empties the field (setText("")).
  public func clear() {
    setText("")
  }

  /// Gives the field the keyboard; kept until the field is on screen if it isn't yet.
  public func focus() {
    serial += 1
    focusRequest = FocusRequest(focused: true, serial: serial)
  }

  /// Takes the keyboard away from the field.
  public func blur() {
    serial += 1
    focusRequest = FocusRequest(focused: false, serial: serial)
  }

  /// the field reporting the reader's edit
  func fieldDidChange(_ value: String) {
    text = value
  }
}

public struct KField: View {
  @ObservedObject private var controller: KFieldController
  private let placeholder: String
  private let style: KTextStyle
  private let axis: Axis
  private let lines: ClosedRange<Int>?
  private let returnSends: Bool
  private let autocapitalize: Bool
  private let autocorrect: Bool
  private let maxLength: Int?
  private let tint: Color
  private let textColor: Color?
  private let placeholderColor: Color?
  private let accessibilityLabel: String?
  private let onChange: (String) -> Void
  private let onSubmit: (String) -> Void
  private let onFocus: (Bool) -> Void

  @State private var text: String
  @FocusState private var focused: Bool
  /// the text both sides already know (reported, or written by setText); a change to anything
  /// else is the reader's
  @State private var known: String
  /// the last value a setText wrote, so its onChange isn't reported as typing
  @State private var programmatic: String?
  /// the last request applied, so a field rebuilt with a live controller doesn't apply it twice
  @State private var appliedText: Int = -1
  @State private var appliedFocus: Int = -1

  /// - Parameters:
  ///   - controller: the field's handle (setText, focus, blur, text)
  ///   - placeholder: shown while empty, already translated
  ///   - style: the writing style; system 17 (KTextStyle.input) by default
  ///   - axis: .vertical grows over `lines` (the default); .horizontal is one line
  ///   - lines: how many lines a vertical field shows before it scrolls; nil for no limit
  ///   - returnSends: Return sends instead of making a new line (the reply strips)
  ///   - autocapitalize: sentences when true (the default), nothing when false
  ///   - autocorrect: the keyboard's corrections
  ///   - maxLength: the most characters it takes, or nil for no limit
  ///   - tint: the caret (ind in the 10a fields)
  ///   - textColor: the words' colour; nil inherits the foreground style
  ///   - placeholderColor: the placeholder's colour; nil for the system's
  ///   - accessibilityLabel: what VoiceOver calls the field; nil uses the placeholder
  ///   - onChange: the reader's edits, after the rules (not setText)
  ///   - onSubmit: Return in a returnSends field (or the return key in a one-line field), with the text
  ///   - onFocus: the field gained (true) or lost (false) the keyboard
  public init(
    controller: KFieldController,
    placeholder: String,
    style: KTextStyle = .input,
    axis: Axis = .vertical,
    lines: ClosedRange<Int>? = 1...5,
    returnSends: Bool,
    autocapitalize: Bool = true,
    autocorrect: Bool = true,
    maxLength: Int? = nil,
    tint: Color,
    textColor: Color? = nil,
    placeholderColor: Color? = nil,
    accessibilityLabel: String? = nil,
    onChange: @escaping (String) -> Void = { _ in },
    onSubmit: @escaping (String) -> Void = { _ in },
    onFocus: @escaping (Bool) -> Void = { _ in }
  ) {
    self._controller = ObservedObject(wrappedValue: controller)
    self.placeholder = placeholder
    self.style = style
    self.axis = axis
    self.lines = lines
    self.returnSends = returnSends
    self.autocapitalize = autocapitalize
    self.autocorrect = autocorrect
    self.maxLength = maxLength
    self.tint = tint
    self.textColor = textColor
    self.placeholderColor = placeholderColor
    self.accessibilityLabel = accessibilityLabel
    self.onChange = onChange
    self.onSubmit = onSubmit
    self.onFocus = onFocus
    // a field rebuilt (a row reused, a screen remounted) starts from what its controller holds
    self._text = State(initialValue: controller.text)
    self._known = State(initialValue: controller.text)
  }

  /// The 10a field in a theme's colours: ink words, a mute placeholder, an ind caret.
  public init(
    theme: KTheme,
    controller: KFieldController,
    placeholder: String,
    style: KTextStyle = .input,
    axis: Axis = .vertical,
    lines: ClosedRange<Int>? = 1...5,
    returnSends: Bool,
    autocapitalize: Bool = true,
    autocorrect: Bool = true,
    maxLength: Int? = nil,
    accessibilityLabel: String? = nil,
    onChange: @escaping (String) -> Void = { _ in },
    onSubmit: @escaping (String) -> Void = { _ in },
    onFocus: @escaping (Bool) -> Void = { _ in }
  ) {
    self.init(
      controller: controller,
      placeholder: placeholder,
      style: style,
      axis: axis,
      lines: lines,
      returnSends: returnSends,
      autocapitalize: autocapitalize,
      autocorrect: autocorrect,
      maxLength: maxLength,
      tint: theme.ind,
      textColor: theme.ink,
      placeholderColor: theme.mute,
      accessibilityLabel: accessibilityLabel,
      onChange: onChange,
      onSubmit: onSubmit,
      onFocus: onFocus
    )
  }

  private var prompt: Text {
    if let placeholderColor {
      return Text(placeholder).foregroundStyle(placeholderColor)
    }
    return Text(placeholder)
  }

  public var body: some View {
    TextField(text: $text, prompt: prompt, axis: axis) {
      Text(accessibilityLabel ?? placeholder)
    }
    .modifier(KFieldLines(lines: axis == .vertical ? lines : nil))
    .kText(style)
    .foregroundStyle(textColor.map { AnyShapeStyle($0) } ?? AnyShapeStyle(.foreground))
    .tint(tint)
    .textInputAutocapitalization(autocapitalize ? .sentences : .never)
    .autocorrectionDisabled(!autocorrect)
    .submitLabel(returnSends ? .send : .return)
    .focused($focused)
    .onSubmit {
      // only a one-line field gets here on Return; a vertical one inserts a newline instead
      if returnSends && axis == .horizontal { onSubmit(text) }
    }
    .onChange(of: text) { old, new in
      edited(from: old, to: new)
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
      // a request made before the field was on screen
      if let request = controller.textRequest, request.serial != appliedText, request.value != text {
        apply(request)
      }
      if let request = controller.focusRequest, request.focused, request.serial != appliedFocus {
        // the field must be in the window before it can take the keyboard
        DispatchQueue.main.async { apply(request) }
      }
    }
  }

  private func apply(_ request: KFieldController.TextRequest?) {
    guard let request, request.serial != appliedText else { return }
    appliedText = request.serial
    if text != request.value {
      programmatic = request.value
      text = request.value
    }
  }

  private func apply(_ request: KFieldController.FocusRequest?) {
    guard let request, request.serial != appliedFocus else { return }
    appliedFocus = request.serial
    focused = request.focused
  }

  /// The rules on every change of the text (see the note at the top of the file).
  private func edited(from old: String, to new: String) {
    // a setText landing: the controller already holds it, and nobody hears it
    if let pending = programmatic, pending == new {
      programmatic = nil
      known = new
      return
    }
    programmatic = nil

    if returnSends, axis == .vertical, let without = Self.removingTypedNewline(old: old, new: new) {
      // Return pressed: take the newline back out and hand the text over. Setting the text
      // brings this back with `without`, which is known by then and so not reported; and if
      // onSubmit clears the field (setText("")), that lands after, as a setText.
      known = without
      text = without
      controller.fieldDidChange(without)
      onSubmit(without)
      return
    }

    if let maxLength, new.count > maxLength {
      // the change to the cut text comes back through here and is reported then
      text = String(new.prefix(maxLength))
      return
    }

    guard new != known else { return }
    known = new
    controller.fieldDidChange(new)
    onChange(new)
  }

  /// When `new` is `old` with one newline inserted (anywhere) and nothing else, `old`; nil
  /// otherwise: a typed Return, not a paste or a composition.
  static func removingTypedNewline(old: String, new: String) -> String? {
    guard new.count == old.count + 1 else { return nil }
    var oldIndex = old.startIndex
    var newIndex = new.startIndex
    // walk the common start
    while oldIndex < old.endIndex, old[oldIndex] == new[newIndex] {
      oldIndex = old.index(after: oldIndex)
      newIndex = new.index(after: newIndex)
    }
    // the one extra character must be a newline, and everything after it the same
    guard new[newIndex].isNewline else { return nil }
    let rest = new.index(after: newIndex)
    guard new[rest...] == old[oldIndex...] else { return nil }
    return old
  }
}

/// lineLimit for a vertical field: a range, or no limit.
private struct KFieldLines: ViewModifier {
  let lines: ClosedRange<Int>?

  func body(content: Content) -> some View {
    if let lines {
      content.lineLimit(lines)
    } else {
      content
    }
  }
}
