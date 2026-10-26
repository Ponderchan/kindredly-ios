// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ACCOUNT KEYS, FOR 1a AND 11 (parts/auth-keys, screens/s01-signin).

 The three keys that ask for a person's account speak iOS, not the run's paper-and-acid: drawn to
 Apple's and Google's own rules (52pt, radius 10, the real Apple logo and four-colour G, the
 system face, the logo pinned in one column at 18pt and the label centred), Apple first wherever
 Google is (4.8). "Continue with email" unfolds in place: the address and Send, then the six
 digits (11a), verified by TS on the sixth. Everything that leaves the phone is TS's: these keys
 only report (signIn, link, foldOpen, emailSend, code, codeAgain), and TS says how it went
 (KObAuth: busy, the error, the fold's stage).
 */

enum KObAuthArt {
  static let apple = KSVGPath.path("M16.37 12.68c-.02-2.42 1.98-3.58 2.07-3.64-1.13-1.65-2.88-1.88-3.5-1.9-1.49-.15-2.91.88-3.67.88-.76 0-1.92-.86-3.16-.84-1.62.02-3.12.95-3.96 2.4-1.69 2.93-.43 7.27 1.21 9.65.8 1.16 1.76 2.47 3.01 2.42 1.21-.05 1.67-.78 3.13-.78 1.46 0 1.87.78 3.15.76 1.3-.02 2.13-1.18 2.92-2.35.92-1.35 1.3-2.65 1.32-2.72-.03-.01-2.53-.97-2.55-3.88zM13.97 5.57c.67-.81 1.12-1.94 1-3.07-.96.04-2.13.64-2.82 1.45-.62.72-1.16 1.87-1.02 2.97 1.07.08 2.17-.55 2.84-1.35z")
  static let google: [(Path, Color)] = [
    (KSVGPath.path("M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46c-.28 1.5-1.12 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82z"), Color(hex: "#4285F4")),
    (KSVGPath.path("M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11C3.25 21.3 7.31 24 12 24z"), Color(hex: "#34A853")),
    (KSVGPath.path("M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28V6.61H1.28A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.11z"), Color(hex: "#FBBC05")),
    (KSVGPath.path("M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z"), Color(hex: "#EA4335")),
  ]
  static let mailFlap = KSVGPath.path("M3.4 6.6 12 13.2 20.6 6.6")
  static let signInInk = Color(hex: "#111113")
  static let keyEdge = Color(.sRGB, red: 0, green: 0, blue: 0, opacity: 0.18)
  static let refusal = Color(hex: "#D0342C")
}

enum KObAuthIcon {
  case apple, google, mail(Color)
}

struct KObAuthGlyph: View {
  let icon: KObAuthIcon
  var size: CGFloat = 20
  var appleColor: Color = .white

  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      g.scaleBy(x: canvas.width / 24, y: canvas.width / 24)
      switch icon {
      case .apple:
        g.fill(KObAuthArt.apple, with: .color(appleColor))
      case .google:
        for (p, c) in KObAuthArt.google { g.fill(p, with: .color(c)) }
      case .mail(let c):
        g.stroke(Path(roundedRect: CGRect(x: 2.2, y: 4.8, width: 19.6, height: 14.4), cornerRadius: 2.6), with: .color(c), lineWidth: 1.8)
        g.stroke(KObAuthArt.mailFlap, with: .color(c), style: StrokeStyle(lineWidth: 1.8, lineCap: .round, lineJoin: .round))
      }
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// One sign-in key: Apple's solid black, or the white outlined one; the icon pinned at 18.
struct KObAuthKey: View {
  let icon: KObAuthIcon
  var iconSize: CGFloat = 20
  let label: String
  var solid = false
  var first = false
  var busy = false
  var disabled = false
  var dim = false
  let action: () -> Void

  var body: some View {
    Button {
      if !busy && !disabled { action() }
    } label: {
      ZStack {
        HStack {
          KObAuthGlyph(icon: icon, size: iconSize)
            .frame(width: 24)
            .padding(.leading, 18)
          Spacer()
        }
        if busy {
          ProgressView().tint(solid ? .white : KObAuthArt.signInInk)
        } else {
          Text(label)
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(solid ? Color.white : Color(hex: "#1F1F1F"))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .padding(.horizontal, 48)
            .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        }
      }
      .frame(maxWidth: .infinity)
      .frame(height: 52)
      .contentShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
    .buttonStyle(KObAuthPress(solid: solid))
    .disabled(disabled || busy)
    .opacity(dim ? 0.5 : 1)
    .padding(.top, first ? 0 : 12)
    .accessibilityLabel(label)
  }
}

private struct KObAuthPress: ButtonStyle {
  let solid: Bool
  func makeBody(configuration: Configuration) -> some View {
    let fill: Color = solid ? (configuration.isPressed ? Color(hex: "#222222") : .black) : (configuration.isPressed ? Color(hex: "#F2F2F2") : .white)
    configuration.label
      .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(fill))
      .overlay {
        if !solid {
          RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(KObAuthArt.keyEdge, lineWidth: 1)
        }
      }
  }
}

/// "Continue with email", unfolding in place. `caption` is the colour of the lines under it.
struct KObEmailFold: View {
  let ctx: KObCtx
  let fold: KObFold
  var caption: Color = KOb.ink
  var disabled = false
  var first = false

  var body: some View {
    switch fold.stage {
    case .key:
      KObAuthKey(icon: .mail(KObAuthArt.signInInk), label: ctx.w("fold.continue"), first: first, disabled: disabled) {
        ctx.send("foldOpen")
      }
    case .email:
      VStack(spacing: 0) {
        ZStack(alignment: .leading) {
          KField(
            controller: ctx.driver.email,
            placeholder: ctx.w("fold.ph"),
            style: .system(17, .regular),
            axis: .horizontal,
            lines: nil,
            returnSends: false,
            autocapitalize: false,
            autocorrect: false,
            tint: KOb.blue,
            textColor: Color(hex: "#1F1F1F"),
            placeholderColor: Color(.sRGB, red: 31 / 255, green: 31 / 255, blue: 31 / 255, opacity: 0.35),
            accessibilityLabel: ctx.w("fold.ph"),
            onSubmit: { text in ctx.send("emailSend", text) }
          )
          .keyboardType(.emailAddress)
          .textContentType(.emailAddress)
          .submitLabel(.send)
          .padding(.leading, 54)
          .padding(.trailing, 18)
          KObAuthGlyph(icon: .mail(KObAuthArt.signInInk))
            .frame(width: 24)
            .padding(.leading, 18)
        }
        .frame(height: 52)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(fold.bad.isEmpty ? KObAuthArt.keyEdge : KObAuthArt.refusal, lineWidth: 1))
        .padding(.top, first ? 0 : 12)
        .onAppear { ctx.driver.email.focus() }

        KObAuthKey(icon: .mail(.white), iconSize: 18, label: ctx.w("fold.send"), solid: true, busy: fold.busy) {
          ctx.send("emailSend", ctx.driver.email.text)
        }
        Text(fold.bad.isEmpty ? ctx.w("fold.body") : fold.bad)
          .kText(.obSmall)
          .foregroundStyle(caption)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity)
          .padding(.top, 10)
      }
    case .code:
      VStack(spacing: 0) {
        KObCodeField(ctx: ctx, controller: ctx.driver.code, label: ctx.w("fold.codeCap"), bad: !fold.bad.isEmpty, event: "code")
          .padding(.top, first ? 0 : 12)
        Text(fold.busy ? "…" : (fold.bad.isEmpty ? ctx.w("fold.codeCap") : fold.bad))
          .kText(.obSmall)
          .foregroundStyle(caption)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity)
          .padding(.top, 10)
        Button { ctx.send("codeAgain") } label: {
          Text(ctx.w("fold.again"))
            .kText(.obSmall)
            .underline()
            .foregroundStyle(caption)
            .padding(6)
        }
        .buttonStyle(KObPressStyle(pressedOpacity: 0.6))
        .padding(.top, 6)
      }
    }
  }
}

/// Six digits, centred and spaced wide; each edit goes to TS (`event`), which keeps the digits
/// only, verifies on the sixth and empties the field (setText) when the code didn't match.
struct KObCodeField: View {
  let ctx: KObCtx
  let controller: KFieldController
  let label: String
  let bad: Bool
  let event: String

  var body: some View {
    KField(
      controller: controller,
      placeholder: "••••••",
      style: .system(24, .regular, tracking: 0.5),
      axis: .horizontal,
      lines: nil,
      returnSends: false,
      autocapitalize: false,
      autocorrect: false,
      maxLength: 6,
      tint: KOb.blue,
      textColor: Color(hex: "#1F1F1F"),
      placeholderColor: Color(.sRGB, red: 31 / 255, green: 31 / 255, blue: 31 / 255, opacity: 0.3),
      accessibilityLabel: label,
      onChange: { text in ctx.send(event, text) }
    )
    .keyboardType(.numberPad)
    .textContentType(.oneTimeCode)
    .multilineTextAlignment(.center)
    .frame(height: 52)
    .padding(.horizontal, 12)
    .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.white))
    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(bad ? KObAuthArt.refusal : KObAuthArt.keyEdge, lineWidth: 1))
    .onAppear { controller.focus() }
  }
}

/*
 1a · THE SIGN-IN SHEET (s01-signin SignInSheet): a white sheet over the dimmed blue for someone
 who already has an account. It rises on a spring as the dim fades in; closing reverses both and
 then tells TS (closeSide). Reduce Motion: it appears and goes in place. "New here? Start without
 an account →" closes it and starts screen 2. Rule B: the sheet is a surface, no ink edge.
 */
struct KObSignInSheet: View {
  let ctx: KObCtx

  @State private var up = false

  private var auth: KObAuth { ctx.content.auth }

  var body: some View {
    ZStack(alignment: .bottom) {
      Rectangle().fill(KOb.scrim)
        .opacity(up ? 1 : 0)
        .ignoresSafeArea()
        .onTapGesture(perform: close)
        .accessibilityElement()
        .accessibilityLabel(ctx.w("signin.close"))
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { close() }

      sheet
        .offset(y: up ? 0 : 640)
        .padding(.bottom, ctx.keyboard)
    }
    .accessibilityAddTraits(.isModal)
    .accessibilityAction(.escape, close)
    .onAppear {
      if ctx.reduceMotion {
        up = true
      } else {
        withAnimation(.spring(response: 0.42, dampingFraction: 0.78)) { up = true }
      }
    }
  }

  private var sheet: some View {
    ScrollViewReader { reader in
      ScrollView {
        VStack(spacing: 0) {
          Capsule().fill(Color(hex: "#D9D7E6")).frame(width: 40, height: 5).padding(.bottom, 18)
          Text(ctx.w("signin.title"))
            .kText(.system(26, .heavy, tracking: -0.7 / 26, lineHeight: 31 / 26))
            .foregroundStyle(KOb.ink)
            .multilineTextAlignment(.center)
            .accessibilityAddTraits(.isHeader)
            .obFocusOnAppear(delay: 0.4)
          Text(ctx.w("signin.line"))
            .kText(.obLineSmall)
            .foregroundStyle(KOb.inkSoft)
            .multilineTextAlignment(.center)
            .padding(.top, 6)
            .padding(.bottom, 20)

          if auth.apple {
            KObAuthKey(icon: .apple, label: ctx.w("signin.apple"), solid: true, first: true, busy: auth.busy == "apple", dim: !auth.busy.isEmpty && auth.busy != "apple") {
              ctx.send("signIn", "apple")
            }
          }
          KObAuthKey(icon: .google, label: ctx.w("signin.google"), first: !auth.apple, busy: auth.busy == "google", dim: !auth.busy.isEmpty && auth.busy != "google") {
            ctx.send("signIn", "google")
          }
          KObEmailFold(ctx: ctx, fold: auth.fold, caption: KOb.ink, disabled: !auth.busy.isEmpty)
            .id("fold")

          if !auth.err.isEmpty {
            Text(auth.err)
              .kText(.obSmall)
              .foregroundStyle(Color(hex: "#B42318"))
              .multilineTextAlignment(.center)
              .padding(.top, 12)
          }

          Text(KObLinked.attributed(ctx.w("signin.terms")))
            .kText(.obSmall)
            .foregroundStyle(KOb.inkSoft)
            .tint(KOb.inkSoft)
            .multilineTextAlignment(.center)
            .padding(.top, 18)
            .environment(\.openURL, OpenURLAction { url in
              ctx.send("terms", "", Double(KObLinked.index(url) ?? 0))
              return .handled
            })

          Button {
            guard auth.busy.isEmpty else { return }
            ctx.send("startNew")
          } label: {
            Text(KObLinked.attributed(ctx.w("signin.new"), linkColor: KOb.blue, bold: true))
              .kText(.obTextKey)
              .foregroundStyle(KOb.ink)
              .multilineTextAlignment(.center)
              .padding(.vertical, 8)
              .frame(maxWidth: .infinity)
          }
          .buttonStyle(KObPressStyle(pressedOpacity: 0.6))
          .environment(\.openURL, OpenURLAction { _ in
            if auth.busy.isEmpty { ctx.send("startNew") }
            return .handled
          })
          .padding(.top, 14)
        }
        .padding(.horizontal, 24)
        .padding(.top, 10)
        .padding(.bottom, max(ctx.bottom, 16) + 6)
      }
      .scrollBounceBehavior(.basedOnSize)
      .frame(maxHeight: 640)
      .fixedSize(horizontal: false, vertical: true)
      .onChange(of: auth.fold.stage) { _, stage in
        guard stage != .key else { return }
        Task {
          try? await Task.sleep(nanoseconds: 320_000_000)
          withAnimation { reader.scrollTo("fold", anchor: .bottom) }
        }
      }
    }
    .background(
      UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28, style: .continuous)
        .fill(KOb.paper)
        .ignoresSafeArea(edges: .bottom)
    )
  }

  private func close() {
    guard auth.busy.isEmpty else { return }
    if ctx.reduceMotion {
      ctx.send("closeSide")
      return
    }
    withAnimation(.easeIn(duration: 0.22)) { up = false } completion: {
      ctx.send("closeSide")
    }
  }
}
