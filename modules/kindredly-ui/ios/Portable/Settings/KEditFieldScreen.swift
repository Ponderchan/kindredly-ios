// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ONE FIELD, ON ITS OWN PAGE, IN SWIFT (owner, 2026-10-27: "make Me all Swift"): your pen name
 (/me/edit-field?f=pen) or your courier's (?f=courier), from Edit profile or Settings. The React
 Native page (src/app/(tabs)/me/edit-field.tsx) stays as the "editfield" switch's fallback.

   ‹            Rename Wren                        the sticky secondary bar
   ┌─────────────────────────────────────────┐
   │ Pip                                   ⊗ │    the theme's soft, corners 16, flat (rule B); the
   └─────────────────────────────────────────┘    system 17 field, the clear key while it is edited
   16 letters at most. She'll sign with it.       the hint, 13/18 in mute; the reserved line in the
                                                  theme's red in its place while it applies

 TS owns everything that matters: what the field is seeded with (setText, only while nothing has
 been typed), what going back saves (beforeRemove: the chevron, the edge swipe, Done), whether the
 reserved line shows (and VoiceOver hearing it). This draws the field and reports each edit, Done
 and the chevron.

 THE FIELD is KOneLineField below, not KField: a name ends on "Done", and KField's return key is
 "send" or "return". It keeps KField's contract with its KFieldController (KField.swift): the words
 live in the field, a setText is applied once and never echoes back as an edit, a focus asked for
 before the field appeared is applied when it does. maxLength cuts what arrives (grapheme
 clusters); the keyboard never corrects a name; capitals are words (the courier) or none (the pen
 name), as the React Native field's.
 */

public struct KEditFieldContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  public var placeholder = ""
  /// the line under the field
  public var hint = ""
  /// the reserved line in the hint's place; "" when it doesn't apply
  public var reserved = ""
  /// VoiceOver for the clear key
  public var clearLabel = ""
  public var maxLength = 20
  /// capitals at the start of each word (the courier's name); none for the pen name
  public var capitalizeWords = false

  public init() {}
}

public final class KEditFieldActions {
  public var onBack: () -> Void = {}
  /// every edit the reader makes (never a setText)
  public var onChange: (String) -> Void = { _ in }
  /// Done on the keyboard
  public var onSubmit: () -> Void = {}

  public init() {}
}

public struct KEditFieldScreen: View {
  private let theme: KTheme
  private let content: KEditFieldContent
  private let controller: KFieldController
  private let topInset: CGFloat
  private let actions: KEditFieldActions

  public init(theme: KTheme, content: KEditFieldContent, controller: KFieldController, topInset: CGFloat, actions: KEditFieldActions) {
    self.theme = theme
    self.content = content
    self.controller = controller
    self.topInset = topInset
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      KBackBar(theme: theme, title: content.title, backLabel: content.backLabel, height: KBackBar<EmptyView>.stickyHeight, sticky: true, onBack: { actions.onBack() })
      ScrollView(.vertical) {
        VStack(alignment: .leading, spacing: 10) {
          KOneLineField(
            theme: theme,
            controller: controller,
            placeholder: content.placeholder,
            accessibilityLabel: content.title,
            accessibilityHint: content.hint,
            clearLabel: content.clearLabel,
            maxLength: content.maxLength,
            capitalizeWords: content.capitalizeWords,
            onChange: { actions.onChange($0) },
            onSubmit: { actions.onSubmit() }
          )
          .padding(.horizontal, 14)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))

          Group {
            if content.reserved.isEmpty {
              Text(content.hint).foregroundStyle(theme.mute)
            } else {
              Text(content.reserved).foregroundStyle(theme.danger)
            }
          }
          .kText(.system(13, lineHeight: 18.0 / 13.0))
          .fixedSize(horizontal: false, vertical: true)
          .padding(.horizontal, 4)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
      }
      .scrollIndicators(.hidden)
      .scrollDismissesKeyboard(.never)
    }
    .background { theme.bg.ignoresSafeArea() }
  }
}

/// A one-line name field on a KFieldController, ending on Done (see the note at the top).
struct KOneLineField: View {
  @ObservedObject private var controller: KFieldController
  private let theme: KTheme
  private let placeholder: String
  private let accessibilityLabel: String
  private let accessibilityHint: String
  private let clearLabel: String
  private let maxLength: Int
  private let capitalizeWords: Bool
  private let onChange: (String) -> Void
  private let onSubmit: () -> Void

  @State private var text: String
  @FocusState private var focused: Bool
  /// the last value a setText wrote, so its change isn't reported as typing
  @State private var programmatic: String?

  init(
    theme: KTheme,
    controller: KFieldController,
    placeholder: String,
    accessibilityLabel: String,
    accessibilityHint: String,
    clearLabel: String,
    maxLength: Int,
    capitalizeWords: Bool,
    onChange: @escaping (String) -> Void,
    onSubmit: @escaping () -> Void
  ) {
    self._controller = ObservedObject(wrappedValue: controller)
    self.theme = theme
    self.placeholder = placeholder
    self.accessibilityLabel = accessibilityLabel
    self.accessibilityHint = accessibilityHint
    self.clearLabel = clearLabel
    self.maxLength = maxLength
    self.capitalizeWords = capitalizeWords
    self.onChange = onChange
    self.onSubmit = onSubmit
    self._text = State(initialValue: controller.text)
  }

  var body: some View {
    HStack(spacing: 8) {
      TextField(text: $text, prompt: Text(placeholder).foregroundStyle(theme.faint)) {
        Text(accessibilityLabel)
      }
      .kText(.input)
      .foregroundStyle(theme.ink)
      .tint(theme.ind)
      .textInputAutocapitalization(capitalizeWords ? .words : .never)
      .autocorrectionDisabled(true)
      .submitLabel(.done)
      .focused($focused)
      .onSubmit { onSubmit() }
      .accessibilityHint(accessibilityHint)
      .padding(.vertical, 14)
      .frame(minHeight: 50)

      // the system field's clear key, while it is being edited
      if focused && !text.isEmpty {
        SwiftUI.Button {
          text = ""
        } label: {
          Image(systemName: "xmark.circle.fill")
            .font(.system(size: 17))
            .foregroundStyle(theme.faint)
            .frame(width: 32, height: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityLabel(clearLabel)
      }
    }
    .onChange(of: text) { _, new in
      edited(new)
    }
    .onChange(of: focused) { _, now in
      controller.isFocused = now
    }
    .onChange(of: controller.textRequest) { _, request in
      apply(request)
    }
    .onChange(of: controller.focusRequest) { _, request in
      apply(request)
    }
    .onAppear {
      // a setText no field has applied yet, while it is still what the field holds
      if let request = controller.textRequest, request.serial > controller.appliedTextSerial {
        if request.value == controller.text {
          apply(request)
        } else {
          controller.appliedTextSerial = request.serial
        }
      }
      // a focus asked for before the field was on screen
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
  }

  private func apply(_ request: KFieldController.FocusRequest?) {
    guard let request, request.serial > controller.appliedFocusSerial else { return }
    controller.appliedFocusSerial = request.serial
    focused = request.focused
  }

  private func edited(_ new: String) {
    // a setText landing: the controller already holds it, and nobody hears it
    if let pending = programmatic, pending == new {
      programmatic = nil
      return
    }
    programmatic = nil
    if new.count > maxLength {
      // the cut text comes back through here and is reported then
      text = String(new.prefix(maxLength))
      return
    }
    guard new != controller.text else { return }
    controller.fieldDidChange(new)
    onChange(new)
  }
}
