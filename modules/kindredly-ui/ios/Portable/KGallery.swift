// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KGalleryView.swift; ui-lab shows it (kindredly:///ui-lab).

import SwiftUI

/*
 THE GALLERY: every 10a piece in this folder, laid out once in one theme, on that theme's page
 colour, each under its name in a mono label. It is how the library is checked on a device
 before a screen is built from it: switch the theme and every colour should change while
 nothing moves.

 The samples mirror the mock's own (H:33-35, 42, 73, 78, 81, 101, 117-119, 124), in English:
 this is a dev page. The few things that respond (the +, the translate capsule, the chips, the
 switch) keep their state here and do nothing else.

 It is as tall as its content and as wide as it is offered, so it sits in a Host that matches
 its contents vertically. It doesn't scroll by itself; the page around it does.
 */
public struct KGallery: View {
  private let theme: KTheme
  @State private var plusOpen = false
  @State private var translated = false
  @State private var meChip = 0
  @State private var knock = true

  public init(theme: KTheme) {
    self.theme = theme
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 28) {
      section("TYPE") { typeSamples }
      section("INKCARD · TODAY") { todayCard }
      section("INKCARD · ME") { meCard }
      section("SOFTGROUP") { softGroup }
      section("FLOAT") { floats }
      section("BUTTONS") { buttons }
      section("CAPSULES") { capsules }
      section("ME CHIPS") { chips }
    }
    .padding(.horizontal, 16)
    .padding(.top, 16)
    .padding(.bottom, 28)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(theme.bg)
  }

  private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(title)
        .kText(.monoSection)
        .foregroundStyle(theme.mute)
        .accessibilityAddTraits(.isHeader)
      content()
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  // ── KType ──
  private var typeSamples: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(theme.name).kText(.pageTitle).foregroundStyle(theme.ink)
      Text("A row label, system 400 15").kText(.rowLabel).foregroundStyle(theme.ink)
      Text("The Kindreds preview line, 400 14 in sub").kText(.preview).foregroundStyle(theme.sub)
      Text("SEP.23 · NO.7273").kText(.monoPostmark).foregroundStyle(theme.ink)
      Text("FROM YOUR 121 LETTERS").kText(.monoMeta).foregroundStyle(theme.mute)
      Text("The rain came in sideways and I thought of you.")
        .kText(.letterBody)
        .foregroundStyle(theme.ink)
      Text("Wren is waiting by the window.").kText(.letterAside).foregroundStyle(theme.sub)
    }
  }

  // ── InkCard, the Today letter card (H:32-35) ──
  private var todayCard: some View {
    InkCard(theme: theme) {
      Text("SEP.23 · NO.7273")
        .kText(.monoPostmark)
        .foregroundStyle(theme.ink)
      Text("Dear stranger, the bakery on my street left the door open and the whole block smelled of bread.")
        .kText(.letterBody)
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.vertical, 14)
      HStack {
        KTopicTag(theme: theme, text: "#made my day", tone: .green)
        Spacer(minLength: 8)
        KAurasClose(theme: theme, label: "auras close")
      }
    }
  }

  // ── InkCard, a Me card (H:78) ──
  private var meCard: some View {
    InkCard(theme: theme, variant: .me, spacing: 12) {
      // an ink section label: mono 600 10 .14em, bg on ink, padding 5 9, corners of 6
      Text("YOUR WRITING AURA")
        .kText(.monoSection)
        .foregroundStyle(theme.bg)
        .padding(.vertical, 5)
        .padding(.horizontal, 9)
        .background(RoundedRectangle(cornerRadius: 6, style: .circular).fill(theme.ink))
      RoundedRectangle(cornerRadius: 14, style: .circular)
        .fill(theme.soft2)
        .frame(height: 72)
      Text("What your writing says about you")
        .kText(.cardTitle)
        .foregroundStyle(theme.ink)
      Text("FROM YOUR 121 LETTERS")
        .kText(.monoMeta)
        .foregroundStyle(theme.mute)
      KSecondaryButton(theme: theme, title: "See your labels") {}
    }
  }

  // ── SoftGroup and its rows (H:101) ──
  private var softGroup: some View {
    SoftGroupSection(theme: theme, header: "Notifications") {
      SoftRow(theme: theme, systemImage: "bell", label: "Knock at 8") {
        Toggle("Knock at 8", isOn: $knock)
          .labelsHidden()
          .tint(theme.ind)
      }
      SoftRow(theme: theme, systemImage: "globe", label: "Language", value: "EN")
      SoftRow(theme: theme, label: "Quiet hours", value: "22–8")
      SoftRow(
        theme: theme,
        systemImage: "envelope",
        label: "Letters",
        subtitle: "A subline, 12/1.4 in mute, for a row that needs a word more.",
        divider: false
      )
    }
  }

  // ── Float: the tab bar (H:117-119) and a popover ──
  private var floats: some View {
    VStack(alignment: .leading, spacing: 22) {
      KFloat(theme: theme, corner: .bar) {
        HStack(spacing: 0) {
          tabIcon("envelope", on: true)
          tabIcon("person.2", on: false)
          KPrimaryRound(theme: theme, isOpen: plusOpen, accessibilityLabel: plusOpen ? "Close" : "Write") {
            plusOpen.toggle()
          }
          .frame(maxWidth: .infinity)
          tabIcon("note.text", on: false)
          tabIcon("person.crop.circle", on: false)
        }
        .frame(height: 62)
      }
      KFloat(theme: theme, corner: .popover) {
        VStack(alignment: .leading, spacing: 4) {
          Text("A popover").kText(.name).foregroundStyle(theme.ink)
          Text("Solid sf, corners of 20, the soft shadow, no glass.")
            .kText(.subtext)
            .foregroundStyle(theme.mute)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .padding(.bottom, 8)
  }

  private func tabIcon(_ name: String, on: Bool) -> some View {
    Image(systemName: name)
      .font(.system(size: 21, weight: on ? .semibold : .regular))
      .foregroundStyle(on ? theme.ind : theme.ink)
      .frame(maxWidth: .infinity)
      .accessibilityHidden(true)
  }

  // ── the button levels (H:78, 81, 119, 124) ──
  private var buttons: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 14) {
        KPrimaryRound(theme: theme, isOpen: plusOpen, accessibilityLabel: plusOpen ? "Close" : "Write") {
          plusOpen.toggle()
        }
        Text("PRIMARY · TAP TO TURN")
          .kText(.monoCaption)
          .foregroundStyle(theme.mute)
      }
      KSecondaryButton(theme: theme, title: "See your labels") {}
      HStack(spacing: 10) {
        KSecondaryButton(theme: theme, title: "Upload", systemImage: "photo", mono: true) {}
        KTertiaryButton(theme: theme, title: "Stamp cam", systemImage: "camera", mono: true) {}
      }
      .kEqualHeightButtons()
      KTertiaryButton(theme: theme, title: "Write a letter", shadow: true) {}
      HStack {
        Text("DISABLED")
          .kText(.monoCaption)
          .foregroundStyle(theme.mute)
        Spacer()
        KDisabledPill(theme: theme, title: "Send")
      }
    }
  }

  // ── the capsules (H:35, 42) ──
  private var capsules: some View {
    VStack(alignment: .leading, spacing: 16) {
      HStack {
        KTopicTag(theme: theme, text: "#made my day", tone: .green)
        Spacer(minLength: 8)
        KAurasClose(theme: theme, label: "auras close")
      }
      HStack {
        KTopicTag(theme: theme, text: "#slow days", tone: .indigo)
        Spacer(minLength: 8)
        KTranslateCapsule(
          theme: theme,
          code: translated ? "EN→ES" : "ES→EN",
          label: translated ? "see the original" : "read in yours"
        ) {
          translated.toggle()
        }
      }
    }
    .padding(.bottom, 3)
  }

  // ── the Me chips (H:73) ──
  private var chips: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      KSegmentChips(
        theme: theme,
        labels: ["Courier", "Aura", "Stamps", "First Class"],
        selection: $meChip,
        firstClassIndex: 3
      )
      // the mock's row padding (4 18 10), less the page's own 16 at the start, so the first
      // chip is 18 from the edge as in the mock. It also leaves the lifted chip and the
      // shadows their room inside the scroll view's clip.
      .padding(EdgeInsets(top: 4, leading: 2, bottom: 10, trailing: 18))
    }
  }
}
