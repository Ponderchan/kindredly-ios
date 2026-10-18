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
 - Return-to-send (returnSends: true, the reply strips): when the last edit put one newline in,
   wherever the caret was, the newline is taken out again and onSubmit gets the text. The edit
   is read as the range that changed (what went out of the old text, what came into the new),
   not as "one character more", because Return with an autocorrection pending applies the
   correction and the newline in the same edit ("I saw teh" becomes "I saw the\n"): a changed
   range that ends in its only newline, with no newline taken out and a word's worth (under
   correctionLimit characters) on either side of it, sends the corrected text. A correction
   that only added to a word or only cut its end must touch a word, so a pasted "line\n" after
   a space or into an empty field stays as pasted, newline and all. An IME's Return commits its
   composition without a newline, so it never sends; a pasted block with newlines in it is
   kept as pasted. The keyboard's return key says "send". The field doesn't decide whether the
   text may go: onSubmit does (and clears the field with setText("") when it went). A one-line
   field (axis .horizontal) sends on the return key the ordinary way.
 - Without returnSends (the compose and journal editors) Return is a newline.
 - maxLength cuts the text at that many characters (grapheme clusters, as people count them).
   It cuts as the text arrives, so a composition in progress at the limit can be cut too; it is
   for short fields (a name), not for letters.
 - The font goes through .kText, so the field grows with Dynamic Type; the writing style is
   system 17 (KTextStyle.input, H:124). The caret is the tint (ind in the 10a fields).
 - Focus and blur are by controller after mount. A focus asked for before any field took it is
   kept and applied when the field appears. The controller, which lives as long as the screen,
   remembers which setText and focus it already applied, so a field rebuilt (a tray closed and
   opened, a subtree remounted) never replays a spent one: no old seed lands on newer typing,
   and no keyboard rises that nobody asked for. A rebuilt field starts from controller.text,
   which is always the newer of the last setText and the reader's typing.

 THE FOCUS/UNMOUNT CRASH (expo issues 40354, 47682, 49348): never take a focused field off
 screen. Keep the composer mounted for the life of the screen and hide or disable it under the
 gone line or the expired card, after blur(). Every Expo adapter that holds a KField conforms to
 ExpoSwiftUI.FocusableView, and its forceResignFirstResponder() calls blur() on each of its
 controllers and then resigns the first responder app-wide (UIKit is the adapter's business; this
 file stays SwiftUI).

 THE CHAT COMPOSERS' FIELD (2026-10-18) is not this one: the reply bar and the Kindreds bar write
 in a KComposerField (Kit/KComposerField.swift), a UITextView that can switch to the system emoji
 keyboard, which a SwiftUI TextField can't. It takes the same KFieldController and keeps every
 rule above; the controller's emoji members (setEmojiKeyboard, emojiKeyboard) are for it alone,
 and a KField ignores them.
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

  /// A switch of the keyboard to the system emoji keyboard (on) or back (off), waiting to be
  /// applied by a KComposerField.
  struct EmojiRequest: Equatable {
    let on: Bool
    let serial: Int
  }

  @Published private(set) var textRequest: TextRequest?
  @Published private(set) var focusRequest: FocusRequest?
  @Published private(set) var emojiRequest: EmojiRequest?
  /// Whether the field's keyboard is the system emoji keyboard right now, kept up to date by a
  /// KComposerField (from the keyboard itself, so ABC on the emoji keyboard turns it off too).
  /// The emoji key draws its "on" fill from it. Always false for a KField.
  @Published public internal(set) var emojiKeyboard = false
  private var serial = 0
  /// The serial of the last setText a field applied (or found spent when it appeared). Kept
  /// here, not in the field, so a field rebuilt with this controller doesn't apply it again.
  var appliedTextSerial = 0
  /// The serial of the last focus or blur a field applied, kept here for the same reason.
  var appliedFocusSerial = 0
  /// The serial of the last emoji switch a field applied, kept here for the same reason.
  var appliedEmojiSerial = 0

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

  /// Switches a KComposerField's keyboard to the system emoji keyboard (on) or back to the
  /// reader's own keyboard (off). A field without the keyboard takes it, already on the emoji
  /// keyboard. A KField ignores it.
  public func setEmojiKeyboard(_ on: Bool) {
    serial += 1
    emojiRequest = EmojiRequest(on: on, serial: serial)
  }

  /// The emoji key: the emoji keyboard if it isn't showing, the reader's own if it is.
  public func toggleEmojiKeyboard() {
    setEmojiKeyboard(!emojiKeyboard)
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
      // A setText no field has applied yet. The field started from controller.text, so it only
      // matters while that is still the setText's value; once the reader has typed since, the
      // request is spent and must not land on the newer words.
      if let request = controller.textRequest, request.serial > controller.appliedTextSerial {
        if request.value == controller.text {
          apply(request)
        } else {
          controller.appliedTextSerial = request.serial
        }
      }
      // a focus asked for before any field took it
      if let request = controller.focusRequest, request.focused, request.serial > controller.appliedFocusSerial {
        // the field must be in the window before it can take the keyboard; a focus or blur
        // asked for meanwhile wins
        DispatchQueue.main.async {
          if controller.focusRequest == request { apply(request) }
        }
      }
    }
  }

  private func apply(_ request: KFieldController.TextRequest?) {
    guard let request, request.serial > controller.appliedTextSerial else { return }
    controller.appliedTextSerial = request.serial
    // an explicit setText wins over typing that landed after it was asked for
    controller.fieldDidChange(request.value)
    if text != request.value {
      programmatic = request.value
      text = request.value
    }
  }

  private func apply(_ request: KFieldController.FocusRequest?) {
    guard let request, request.serial > controller.appliedFocusSerial else { return }
    controller.appliedFocusSerial = request.serial
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
      // onSubmit clears the field (setText("")), that lands after, as a setText. A correction
      // that came with the Return is the reader's edit too: it is reported first, so a send
      // that doesn't go (onSubmit leaving the field as it is) leaves the draft as shown.
      let corrected = without != known
      known = without
      text = without
      controller.fieldDidChange(without)
      if corrected { onChange(without) }
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

  /// The most characters an autocorrection applied with a Return may take out or put in: a
  /// word's worth. A bigger change ending in a newline is a paste, and is kept as pasted.
  static let correctionLimit = 32

  /// `new` without the newline a Return just typed, or nil when the edit from `old` to `new`
  /// was not a typed Return (a paste, a composition, typing).
  ///
  /// The edit is the range that changed: the common start and the common end of the two texts
  /// are set aside, leaving what went out of `old` (removed) and what came into `new`
  /// (inserted). It is a typed Return when inserted ends in its only newline and removed has
  /// none, and either nothing else changed (Return alone, wherever the caret was) or the rest
  /// is an autocorrection of the word before the caret, which iOS applies in the same edit as
  /// the newline ("I saw teh" to "I saw the\n"): under correctionLimit characters each way and,
  /// when it only added to a word or only cut its end, glued to the character before it, so a
  /// pasted "line\n" after a space or into an empty field doesn't send. The correction is kept.
  static func removingTypedNewline(old: String, new: String) -> String? {
    // the common start
    var oldStart = old.startIndex
    var newStart = new.startIndex
    while oldStart < old.endIndex, newStart < new.endIndex, old[oldStart] == new[newStart] {
      oldStart = old.index(after: oldStart)
      newStart = new.index(after: newStart)
    }
    // the common end, never reaching back into the common start
    var oldEnd = old.endIndex
    var newEnd = new.endIndex
    while oldEnd > oldStart, newEnd > newStart {
      let o = old.index(before: oldEnd)
      let n = new.index(before: newEnd)
      guard old[o] == new[n] else { break }
      oldEnd = o
      newEnd = n
    }
    let removed = old[oldStart..<oldEnd]
    let inserted = new[newStart..<newEnd]

    // one newline, the last thing that went in, and none taken out
    guard let last = inserted.last, last.isNewline else { return nil }
    let word = inserted.dropLast()
    guard !word.contains(where: \.isNewline), !removed.contains(where: \.isNewline) else { return nil }

    if !word.isEmpty || !removed.isEmpty {
      // a correction applied with the Return: a word's worth each way
      guard word.count < correctionLimit, removed.count < correctionLimit else { return nil }
      if word.isEmpty || removed.isEmpty {
        // only added to a word ("goin" to "going") or only cut its end: it must touch one
        guard let before = new[..<newStart].last, !before.isWhitespace else { return nil }
      }
    }
    return String(new[..<newStart]) + word + String(new[newEnd...])
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
