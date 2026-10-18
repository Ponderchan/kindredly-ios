// Portable: this file imports SwiftUI and UIKit only (nothing from Expo), so the 1.1.0 pure-Swift
// app can take it as is.

import SwiftUI
import UIKit

/*
 THE CHAT COMPOSERS' FIELD (2026-10-18): where the reply bar (Kit/KReplyBar.swift: the Today
 reply and the pen-pal chat) and the Kindreds bar write.

 WHY IT IS UIKIT. The owner's emoji key (chat composers, Prompt 5) turns the field's keyboard
 into the system emoji keyboard and back. iOS has no keyboard type for that (there is no emoji
 UIKeyboardType); the one way is a text view whose textInputMode answers the emoji input mode,
 followed by reloadInputViews. A SwiftUI TextField can't be asked that, so this field is a
 UITextView of its own (KEmojiTextView, below) in a UIViewRepresentable: the one UIKit view in
 Portable, and nothing Expo, so the pure-Swift app takes it as it is. The prototype drew its own
 emoji panel as a stand-in; the spec itself prefers the system keyboard (recents, search and
 skin tones come with it), and so did the owner's lead. Everything else keeps writing in KField.

 THE SAME CONTRACT AS KField (Kit/KField.swift), on the same KFieldController, so the adapters'
 setText / focus / blur commands and the screens' send code don't change:
 - UNCONTROLLED: the words live in the text view and are never written from props, so nothing
   lands on a Japanese or Korean composition in progress. A setText replaces them (a draft, the
   words put back after a refused send, the field cleared after a send); setting a UITextView's
   text from code doesn't call its delegate, so a setText is never reported back.
 - onChange: the reader's edits only (typing, a paste, dictation, a correction, a composition as
   it goes).
 - RETURN: with returnSends, a typed Return (the replacement is exactly "\n", and nothing is
   marked) goes to onSubmit with the words, and the newline never goes in. A correction pending
   at the Return is applied by UIKit first, as an edit of its own, so the corrected words are
   the ones sent. An IME's Return only commits its composition; a paste with newlines in it is
   kept as pasted. The return key says "send", dim while the field is empty. Without returnSends Return is a new line (Today:
   a reply is a letter, and letters keep their paragraphs). onSubmit decides whether the words
   go, as with KField.
 - FOCUS by controller, after mount: a focus asked for before the text view is in a window is
   applied when it gets there; the serials of what was applied live in the controller, so a
   field rebuilt never replays a spent setText or focus. A rebuilt field starts from
   controller.text.
 - It GROWS from one line to maxLines (four in the bars: about 110 with the bar's padding; the
   bars pass three at the accessibility sizes), then scrolls inside, keeping the caret in view.
 - THE FONT is the system face at `size`, scaled with Dynamic Type exactly as .kText scales the
   system face (UIFontMetrics on the text style KType picks for that size), and capped by any
   .dynamicTypeSize(...) the field sits under: the size is read from the environment, not from
   the device.
 - THE PLACEHOLDER is SwiftUI's, drawn over the empty text view in mute and hidden from
   VoiceOver; the text view carries the accessibility label (the placeholder unless one is
   given), and its value is the words.
 - VOICEOVER'S ESCAPE (two-finger Z) from inside the field goes to onEscape: true when it was
   handled (Today drops the keyboard), false to let it go on up (to the stack's back).

 THE EMOJI KEYBOARD (controller.setEmojiKeyboard / toggleEmojiKeyboard; the emoji key draws
 controller.emojiKeyboard). Measured on iOS 26.5 (2026-10-18):
 - on: the text view answers the first active input mode whose primaryLanguage is "emoji" and
   reloads its keyboard, or, without the keyboard yet, takes it emoji first. A reader who took the
   emoji keyboard out of Settings has no such mode: the field only takes the keyboard, and the
   key stays off.
 - off: it answers the keyboard the reader was on before (else the first active one that isn't
   emoji or dictation). A reload alone doesn't bring it back: iOS keeps reporting the language
   keyboard under the emoji one as the text view's own (super.textInputMode never says "emoji"),
   so asking for it changes nothing. The text view gives up the keyboard and takes it straight
   back, in one go, which makes iOS ask afresh; the keyboard doesn't move, and the delegate (so
   the screen) hears neither half.
 - the key's state is the switch's, and the keyboard's own changes put it right
   (UITextInputMode.currentInputModeDidChangeNotification, our own switches set aside for half a
   second): ABC or the globe on the emoji keyboard turns the key off. Once a switch has landed
   the text view stops answering for the keyboard, so the globe works as it always does. (The
   globe landing on emoji can't be told from the outside, since iOS reports the language
   keyboard: the key stays off then, which only means it offers the emoji keyboard again.)
 - losing the keyboard turns it off.

 THE FOCUS/UNMOUNT CRASH applies here as to KField: keep the field mounted for the life of the
 screen and hide or disable it after blur(). The adapters' forceResignFirstResponder resigns the
 first responder app-wide, which reaches this text view like any other.
 */
public struct KComposerField: View {
  @ObservedObject private var controller: KFieldController
  private let theme: KTheme
  private let placeholder: String
  private let size: CGFloat
  private let maxLines: Int
  private let returnSends: Bool
  private let autocapitalize: Bool
  private let accessibilityLabel: String?
  private let onChange: (String) -> Void
  private let onSubmit: (String) -> Void
  private let onFocus: (Bool) -> Void
  private let onEscape: () -> Bool

  /// the text view, for the controller's requests
  @State private var box = KComposerBox()
  /// nothing is written: the placeholder shows
  @State private var empty: Bool
  /// the text view's height as measured (0 until its first layout: one line)
  @State private var height: CGFloat = 0
  @Environment(\.dynamicTypeSize) private var typeSize

  /// - Parameters:
  ///   - controller: the field's handle (setText, focus, blur, the emoji keyboard, text)
  ///   - placeholder: shown in mute while empty, already translated
  ///   - size: the system face's size before Dynamic Type (16 in the bars)
  ///   - maxLines: the lines it grows to before it scrolls
  ///   - returnSends: Return sends (onSubmit) instead of making a new line
  ///   - autocapitalize: sentences when true, nothing when false
  ///   - accessibilityLabel: what VoiceOver calls the field; nil uses the placeholder
  ///   - onChange: the reader's edits (never a setText)
  ///   - onSubmit: a typed Return in a returnSends field, with the words
  ///   - onFocus: the field took (true) or lost (false) the keyboard
  ///   - onEscape: VoiceOver's escape from inside the field; return true when handled
  public init(
    theme: KTheme,
    controller: KFieldController,
    placeholder: String,
    size: CGFloat = 16,
    maxLines: Int = 4,
    returnSends: Bool,
    autocapitalize: Bool = true,
    accessibilityLabel: String? = nil,
    onChange: @escaping (String) -> Void = { _ in },
    onSubmit: @escaping (String) -> Void = { _ in },
    onFocus: @escaping (Bool) -> Void = { _ in },
    onEscape: @escaping () -> Bool = { false }
  ) {
    self._controller = ObservedObject(wrappedValue: controller)
    self.theme = theme
    self.placeholder = placeholder
    self.size = size
    self.maxLines = max(1, maxLines)
    self.returnSends = returnSends
    self.autocapitalize = autocapitalize
    self.accessibilityLabel = accessibilityLabel
    self.onChange = onChange
    self.onSubmit = onSubmit
    self.onFocus = onFocus
    self.onEscape = onEscape
    self._empty = State(initialValue: controller.text.isEmpty)
  }

  public var body: some View {
    let font = Self.font(size: size, typeSize: typeSize)
    let line = ceil(font.lineHeight)
    KComposerTextView(
      font: font,
      theme: theme,
      returnSends: returnSends,
      autocapitalize: autocapitalize,
      label: accessibilityLabel ?? placeholder,
      maxLines: maxLines,
      box: box,
      controller: controller,
      onEdit: { text in
        if empty != text.isEmpty { empty = text.isEmpty }
        onChange(text)
      },
      onSubmit: onSubmit,
      onFocus: onFocus,
      onEscape: onEscape,
      onHeight: { measured in
        if abs(height - measured) > 0.5 { height = measured }
      }
    )
    .frame(height: max(line, height))
    .frame(maxWidth: .infinity)
    .overlay(alignment: .topLeading) {
      if empty {
        Text(placeholder)
          .kText(.system(size))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
    }
    .onChange(of: controller.textRequest) { _, request in
      box.apply(request, controller: controller)
      if empty != controller.text.isEmpty { empty = controller.text.isEmpty }
    }
    .onChange(of: controller.focusRequest) { _, request in
      box.apply(request, controller: controller)
    }
    .onChange(of: controller.emojiRequest) { _, request in
      box.apply(request, controller: controller)
    }
    .onAppear {
      // the text view started from controller.text, so a setText no field applied yet is in
      // it already, or spent (the reader typed since): either way it is done
      if let request = controller.textRequest, request.serial > controller.appliedTextSerial {
        controller.appliedTextSerial = request.serial
      }
      // a switch of keyboard asked for before there was a field has nothing to switch
      if let request = controller.emojiRequest, request.serial > controller.appliedEmojiSerial {
        controller.appliedEmojiSerial = request.serial
      }
      // a focus asked for before any field took it, once the text view is in the window; a focus
      // or blur asked for meanwhile wins
      if let request = controller.focusRequest, request.focused, request.serial > controller.appliedFocusSerial {
        DispatchQueue.main.async {
          if controller.focusRequest == request { box.apply(request, controller: controller) }
        }
      }
    }
  }

  /// The system face at `size`, scaled as .kText scales it (@ScaledMetric relative to the text
  /// style KType picks for that size), at the Dynamic Type size the environment carries.
  static func font(size: CGFloat, typeSize: DynamicTypeSize) -> UIFont {
    let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(typeSize))
    let metrics = UIFontMetrics(forTextStyle: uiTextStyle(KType.textStyle(near: size)))
    return metrics.scaledFont(for: .systemFont(ofSize: size), compatibleWith: traits)
  }

  private static func uiTextStyle(_ style: Font.TextStyle) -> UIFont.TextStyle {
    switch style {
    case .largeTitle: return .largeTitle
    case .title: return .title1
    case .title2: return .title2
    case .title3: return .title3
    case .headline: return .headline
    case .subheadline: return .subheadline
    case .body: return .body
    case .callout: return .callout
    case .footnote: return .footnote
    case .caption: return .caption1
    case .caption2: return .caption2
    @unknown default: return .body
    }
  }
}

/// The text view a field drives, for the controller's requests (it outlives no field).
final class KComposerBox {
  weak var view: KEmojiTextView?

  func apply(_ request: KFieldController.TextRequest?, controller: KFieldController) {
    guard let request, request.serial > controller.appliedTextSerial else { return }
    controller.appliedTextSerial = request.serial
    // an explicit setText wins over typing that landed after it was asked for
    controller.fieldDidChange(request.value)
    view?.setTextFromCode(request.value)
  }

  func apply(_ request: KFieldController.FocusRequest?, controller: KFieldController) {
    guard let request, request.serial > controller.appliedFocusSerial else { return }
    controller.appliedFocusSerial = request.serial
    view?.setFocus(request.focused)
  }

  func apply(_ request: KFieldController.EmojiRequest?, controller: KFieldController) {
    guard let request, request.serial > controller.appliedEmojiSerial else { return }
    controller.appliedEmojiSerial = request.serial
    view?.setEmoji(request.on)
  }
}

/// The UITextView in SwiftUI. It takes exactly the size it is offered (KComposerField gives it
/// its measured height), so a long line never asks SwiftUI for more width.
private struct KComposerTextView: UIViewRepresentable {
  let font: UIFont
  let theme: KTheme
  let returnSends: Bool
  let autocapitalize: Bool
  let label: String
  let maxLines: Int
  let box: KComposerBox
  let controller: KFieldController
  let onEdit: (String) -> Void
  let onSubmit: (String) -> Void
  let onFocus: (Bool) -> Void
  let onEscape: () -> Bool
  let onHeight: (CGFloat) -> Void

  func makeCoordinator() -> Coordinator {
    Coordinator(parent: self)
  }

  func makeUIView(context: Context) -> KEmojiTextView {
    let view = KEmojiTextView(frame: .zero, textContainer: nil)
    view.delegate = context.coordinator
    view.backgroundColor = .clear
    // the words start at the field's own edge, as a TextField's do
    view.textContainerInset = .zero
    view.textContainer.lineFragmentPadding = 0
    view.isScrollEnabled = false
    view.adjustsFontForContentSizeCategory = false
    view.font = font
    // a field rebuilt starts from what its controller holds
    view.text = controller.text
    view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    view.setContentCompressionResistancePriority(.defaultLow, for: .vertical)
    let coordinator = context.coordinator
    view.onLayout = { [weak coordinator, weak view] in
      guard let coordinator, let view else { return }
      coordinator.measure(view)
    }
    view.onEmojiState = { [weak controller] on in
      guard let controller, controller.emojiKeyboard != on else { return }
      controller.emojiKeyboard = on
    }
    box.view = view
    configure(view)
    return view
  }

  func updateUIView(_ view: KEmojiTextView, context: Context) {
    context.coordinator.parent = self
    box.view = view
    let fontChanged = view.font != font
    let linesChanged = view.maxLines != maxLines
    configure(view)
    if fontChanged || linesChanged { context.coordinator.measure(view) }
  }

  func sizeThatFits(_ proposal: ProposedViewSize, uiView: KEmojiTextView, context: Context) -> CGSize? {
    CGSize(width: proposal.width ?? 10, height: proposal.height ?? ceil(font.lineHeight))
  }

  static func dismantleUIView(_ view: KEmojiTextView, coordinator: Coordinator) {
    view.onLayout = nil
    view.onEmojiState = nil
    view.onEscape = nil
  }

  private func configure(_ view: KEmojiTextView) {
    if view.font != font { view.font = font }
    let ink = UIColor(theme.ink)
    if view.textColor != ink { view.textColor = ink }
    view.tintColor = UIColor(theme.ind)
    // the keyboard in the theme's light (applied the next time it rises)
    view.keyboardAppearance = theme.isDark ? .dark : .light
    view.autocapitalizationType = autocapitalize ? .sentences : .none
    view.returnKeyType = returnSends ? .send : .default
    // a send key with nothing to send stays dim (the Kindreds bar has no send key of its own)
    view.enablesReturnKeyAutomatically = returnSends
    view.accessibilityLabel = label
    view.maxLines = maxLines
    view.onEscape = onEscape
  }

  final class Coordinator: NSObject, UITextViewDelegate {
    var parent: KComposerTextView
    /// the last height reported, so a layout pass that changes nothing reports nothing
    private var reported: CGFloat = 0

    init(parent: KComposerTextView) {
      self.parent = parent
    }

    func textViewDidChange(_ textView: UITextView) {
      let text = textView.text ?? ""
      parent.controller.fieldDidChange(text)
      parent.onEdit(text)
      if let view = textView as? KEmojiTextView { measure(view) }
    }

    func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
      // a typed Return (exactly one newline, nothing marked): hand the words over instead
      guard parent.returnSends, text == "\n", textView.markedTextRange == nil else { return true }
      parent.onSubmit(textView.text ?? "")
      return false
    }

    func textViewDidBeginEditing(_ textView: UITextView) {
      // taking the keyboard straight back after giving it up (the switch off the emoji keyboard)
      if (textView as? KEmojiTextView)?.retaking == true { return }
      parent.controller.isFocused = true
      parent.onFocus(true)
      (textView as? KEmojiTextView)?.readKeyboard()
    }

    func textViewDidEndEditing(_ textView: UITextView) {
      if (textView as? KEmojiTextView)?.retaking == true { return }
      parent.controller.isFocused = false
      (textView as? KEmojiTextView)?.keyboardGone()
      parent.onFocus(false)
    }

    /// The height for the words at the text view's width: one line at least, maxLines at most,
    /// scrolling inside beyond that (the caret kept in view).
    func measure(_ view: KEmojiTextView) {
      let width = view.bounds.width
      guard width > 0, let font = view.font else { return }
      let fit = ceil(view.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude)).height)
      let cap = ceil(font.lineHeight * CGFloat(view.maxLines))
      let height = max(ceil(font.lineHeight), min(fit, cap))
      let scrolls = fit > cap + 0.5
      if view.isScrollEnabled != scrolls {
        view.isScrollEnabled = scrolls
        if scrolls {
          DispatchQueue.main.async { [weak view] in
            guard let view else { return }
            view.scrollRangeToVisible(view.selectedRange)
          }
        }
      }
      guard abs(height - reported) > 0.5 else { return }
      reported = height
      let report = parent.onHeight
      // never in the middle of a SwiftUI update
      DispatchQueue.main.async { report(height) }
    }
  }
}

/// A UITextView that can show the system emoji keyboard (see THE EMOJI KEYBOARD above), takes a
/// focus asked for before it was in a window, and passes VoiceOver's escape on.
final class KEmojiTextView: UITextView {
  /// which keyboard the text view answers for while a switch is on its way
  private enum Forced {
    case emoji
    case text
  }

  /// the lines it grows to before it scrolls
  var maxLines = 4
  /// its width changed, or its words were set from code: measure again
  var onLayout: (() -> Void)?
  /// the emoji keyboard came up (true) or went (false)
  var onEmojiState: ((Bool) -> Void)?
  /// VoiceOver's escape: true when handled
  var onEscape: (() -> Bool)?

  private var forced: Forced?
  /// our own switch is running (its serial), 0 when none: the keyboard notifications it causes
  /// aren't the reader's
  private var switching = 0
  /// the text view is giving up the keyboard and taking it straight back (the switch off the emoji
  /// keyboard): the delegate ignores both halves
  private(set) var retaking = false
  /// the keyboard the reader was on before the emoji keyboard
  private var modeBeforeEmoji: UITextInputMode?
  private var pendingFocus = false
  private var lastWidth: CGFloat = 0
  private var observer: NSObjectProtocol?

  override init(frame: CGRect, textContainer: NSTextContainer?) {
    super.init(frame: frame, textContainer: textContainer)
    observer = NotificationCenter.default.addObserver(
      forName: UITextInputMode.currentInputModeDidChangeNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.keyboardSwitched()
    }
  }

  required init?(coder: NSCoder) {
    return nil
  }

  deinit {
    if let observer { NotificationCenter.default.removeObserver(observer) }
  }

  // MARK: the emoji keyboard

  /// the emoji keyboard, if the reader has it
  private static var emojiMode: UITextInputMode? {
    UITextInputMode.activeInputModes.first { $0.primaryLanguage == "emoji" }
  }

  /// the first keyboard that writes words (not emoji, not dictation)
  private static var wordsMode: UITextInputMode? {
    UITextInputMode.activeInputModes.first {
      guard let language = $0.primaryLanguage else { return false }
      return language != "emoji" && language != "dictation"
    }
  }

  /// the keyboard iOS reports for this text view: the language keyboard, never emoji (even while
  /// the emoji keyboard is up, measured on iOS 26.5)
  private var systemMode: UITextInputMode? {
    super.textInputMode
  }

  override var textInputMode: UITextInputMode? {
    switch forced {
    case .emoji: return Self.emojiMode ?? super.textInputMode
    case .text: return modeBeforeEmoji ?? Self.wordsMode ?? super.textInputMode
    case nil: return super.textInputMode
    }
  }

  /// The emoji key: the emoji keyboard (on) or the reader's own (off); takes the keyboard if it
  /// hadn't it.
  func setEmoji(_ on: Bool) {
    if on {
      guard Self.emojiMode != nil else {
        // no emoji keyboard in Settings: the field only takes the keyboard
        setFocus(true)
        onEmojiState?(false)
        return
      }
      if let current = systemMode, current.primaryLanguage != "emoji" { modeBeforeEmoji = current }
      forced = .emoji
    } else {
      forced = .text
    }
    guard isFirstResponder else {
      setFocus(true)
      onEmojiState?(on)
      return
    }
    // the keyboard-changed notifications this switch sets off are ours, not the reader's
    switching += 1
    let serial = switching
    if on {
      reloadInputViews()
    } else {
      // Asked to reload, iOS keeps the emoji keyboard up: the text view still reports the language
      // keyboard under it as its own (super.textInputMode never says emoji), so a request for that
      // one changes nothing. The text view takes the keyboard again instead, in one go, which asks
      // for its keyboard afresh; the delegate hears neither half (retaking).
      retaking = true
      _ = resignFirstResponder()
      _ = becomeFirstResponder()
      retaking = false
    }
    onEmojiState?(on)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      guard let self, self.switching == serial else { return }
      self.switching = 0
      self.forced = nil
    }
  }

  /// The keyboard changed under the text view: ABC or the globe on the emoji keyboard, a language
  /// change (our own switches are set aside). iOS reports the language keyboard even while the
  /// emoji one is up, so anything but a report of emoji means the emoji keyboard went.
  private func keyboardSwitched() {
    guard isFirstResponder, switching == 0 else { return }
    forced = nil
    onEmojiState?(systemMode?.primaryLanguage == "emoji")
  }

  /// The text view took the keyboard: once it is up, the key shows which one it is (off, unless
  /// iOS ever reports the emoji keyboard it brought back).
  func readKeyboard() {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.isFirstResponder, self.forced == nil else { return }
      self.onEmojiState?(self.systemMode?.primaryLanguage == "emoji")
    }
  }

  /// The keyboard went away: nothing is switched any more.
  func keyboardGone() {
    forced = nil
    modeBeforeEmoji = nil
    onEmojiState?(false)
  }

  // MARK: focus and words from code

  func setFocus(_ on: Bool) {
    if on {
      guard window != nil else {
        pendingFocus = true
        return
      }
      if !isFirstResponder { _ = becomeFirstResponder() }
    } else {
      pendingFocus = false
      if isFirstResponder { _ = resignFirstResponder() }
    }
  }

  /// A setText: the words replaced (a composition in progress with them), not reported.
  func setTextFromCode(_ value: String) {
    if text != value { text = value }
    onLayout?()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil, pendingFocus else { return }
    pendingFocus = false
    DispatchQueue.main.async { [weak self] in
      guard let self, self.window != nil, !self.isFirstResponder else { return }
      _ = self.becomeFirstResponder()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if abs(bounds.width - lastWidth) > 0.5 {
      lastWidth = bounds.width
      onLayout?()
    }
  }

  override func accessibilityPerformEscape() -> Bool {
    if let onEscape, onEscape() { return true }
    return super.accessibilityPerformEscape()
  }
}
