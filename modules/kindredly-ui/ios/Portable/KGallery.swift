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
 switch, the step-5 voice card, tiles and menu) keep their state here and do nothing else. The
 field in its reply strip is look-only for now (fieldIsLive, at its section).

 The step-5 kit follows the first eight sections: the line glyphs, the Letter faces and the
 mono sizes, the choice cards, the faces, the voice card, the field in its reply strip, the
 send keys and round tools, the back bar, the bottom fade, the scroll chrome, the First Class
 cards, the notices, the selectable tiles and the switch, and the long-press menu.

 STAMPS comes last: stamps v2 (the set the owner approved on 2026-10-18) as KStamp draws them,
 laid out as the dev page kindredly:///dev/step5-stamp-art lays out React Native's
 components/Stamp above it, so a screenshot of each half compares sheet for sheet: the LADDER
 (one stamp of each category, so all six series grounds show, at every tier from the dot to L,
 flat; then delivered at 40 to 120, tilted by the golden letter ids), on Classic
 and on Midnight whatever theme the gallery is in; every PLACEMENT of KStampLadder at its own
 size and rule in this theme (the compose corner empty and filled); the FALLBACK chain; and ALL
 36 at the tray's 30×36 on both surfaces.

 It is as tall as its content and as wide as it is offered, so it sits in a Host that matches
 its contents vertically. It doesn't scroll by itself; the page around it does.
 */
public struct KGallery: View {
  private let theme: KTheme
  @State private var plusOpen = false
  @State private var tab = 0
  @State private var translated = false
  @State private var meChip = 0
  @State private var knock = true
  // step 5
  @State private var traceOpen = false
  @State private var playback: KPlayback?
  @State private var replyText = ""
  @State private var sent = 0
  @State private var tile = "classic"
  @State private var noticeShown = true
  @State private var lastMenu = "—"
  @StateObject private var replyField = KFieldController()
  @StateObject private var chrome = KScrollModel(offsetCap: 300)

  public init(theme: KTheme) {
    self.theme = theme
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 28) {
      Group {
        section("TYPE") { typeSamples }
        section("INKCARD · TODAY") { todayCard }
        section("INKCARD · ME") { meCard }
        section("SOFTGROUP") { softGroup }
        section("FLOAT") { floats }
        section("BUTTONS") { buttons }
        section("CAPSULES") { capsules }
        section("ME CHIPS") { chips }
      }
      Group {
        section("LINE GLYPHS · 24 GRID") { glyphs }
        section("LETTER FACES") { letterFaces }
        section("MONO · 9 / 10 / 11") { monoSizes }
        section("CHOICE CARDS") { choiceCards }
        section("FACES · MOSAIC · BADGE") { faces }
        section("VOICE CARD") { voiceCards }
        section("FIELD · REPLY STRIP") { replyStrip }
        section("SEND KEYS · ROUND TOOLS") { sendKeys }
      }
      Group {
        section("BACK BAR") { backBar }
        section("BOTTOM FADE") { bottomFade }
        section("SCROLL CHROME") { scrollChrome }
        section("FIRST CLASS") { firstClass }
        section("NOTICE") { notices }
        section("SELECTABLE TILES · SWITCH") { tiles }
        section("LONG-PRESS MENU") { menu }
      }
      Group {
        section("STAMPS V3 · KSTAMP · ALL \(KStampArt.ids.count)") { stamps }
      }
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
      Text("FROM YOUR 121 LETTERS").kText(.monoMetaWide).foregroundStyle(theme.mute)
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
        .frame(height: 110)
      Text("What your writing says about you")
        .kText(.cardTitle)
        .foregroundStyle(theme.ink)
      Text("FROM YOUR 121 LETTERS")
        .kText(.monoMetaWide)
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
      // the real bar (KTabBar.swift): tap a tab for the lens and the pop; Kindreds carries a 3
      KTabBar(
        theme: theme,
        items: [
          KTabItem(glyph: .today, label: "Today"),
          KTabItem(glyph: .notes, label: "Notes"),
          KTabItem(glyph: .kindreds, label: "Kindreds", badge: 3),
          KTabItem(glyph: .me, label: "Me"),
        ],
        selectedIndex: tab,
        isPanelOpen: plusOpen,
        plusLabel: "Write",
        closeLabel: "Close",
        onSelect: { tab = $0 },
        onPlus: { plusOpen.toggle() }
      )
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
      // step 5: a stamp's channel colours (a dark stamp's wash and ink), the busy capsule,
      // and the signal capsule's other two marks
      HStack {
        KTopicTag(theme: theme, text: "#night walk", tone: .channel(wash: KBrand.paleGreen, ink: KBrand.courierGreen))
        Spacer(minLength: 8)
        KTranslateCapsule(theme: theme, code: "ES→EN", label: "translating…", enabled: false) {}
      }
      HStack(spacing: 10) {
        KAurasClose(theme: theme, label: "Night owl, like you", glyph: .clock)
        KAurasClose(theme: theme, label: "Rain, like you", glyph: .stickers)
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

  // ══ step 5 ══

  /// a small mono caption under a sample
  private func caption(_ text: String) -> some View {
    Text(text)
      .kText(.monoCaption)
      .foregroundStyle(theme.mute)
      .lineLimit(1)
      .minimumScaleFactor(0.6)
  }

  // ── KLineGlyph: every drawing, 24 across at the mock's 1.9 ──
  private var glyphs: some View {
    LazyVGrid(columns: [GridItem(.adaptive(minimum: 64), spacing: 8)], alignment: .leading, spacing: 12) {
      ForEach(KLineGlyph.allCases, id: \.self) { g in
        VStack(spacing: 4) {
          KLineIcon(g, size: 24, lineWidth: 1.9, color: theme.ink)
          caption(g.rawValue)
        }
        .frame(maxWidth: .infinity)
      }
    }
  }

  // ── KLetterFace: a letter being read in each face a picker offers, and the hidden one; Wren's
  // line under it doesn't follow the Letter font, so it stays Newsreader in every row ──
  private var letterFaces: some View {
    VStack(alignment: .leading, spacing: 10) {
      ForEach(KLetterFace.allCases, id: \.self) { face in
        VStack(alignment: .leading, spacing: 2) {
          Text("The rain came in sideways and I thought of you.")
            .kText(.letterRead(22, lineHeight: 1.3, place: .reader))
            .foregroundStyle(theme.ink)
          Text("Wren is waiting by the window.")
            .kText(.letterAside)
            .foregroundStyle(theme.sub)
          caption(face.rawValue + (KLetterFace.choices.contains(face) ? "" : " · hidden, drawn as \(face.drawn.rawValue)"))
        }
        .kLetterFace(face)
      }
    }
  }

  // ── KMonoSizes: the roles the mock sets over 11, at the size the rule gives them ──
  private var monoSizes: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("EDIT PROFILE · monoHeader").kText(.monoHeader).foregroundStyle(theme.ink)
      Text("SEP.23 · NO.7273 · monoPostmark").kText(.monoPostmark).foregroundStyle(theme.ink)
      Text("↑ PASS · REPLY ↓ · monoReply").kText(.monoReply).foregroundStyle(theme.ink)
      Text("OCTOBER 2026 · monoMonth").kText(.monoMonth).foregroundStyle(theme.ink)
      Text("#made my day · monoTag").kText(.monoTag).foregroundStyle(theme.ink)
      Text("121 · monoFigure").kText(.monoFigure).foregroundStyle(theme.ink)
      Text("YOUR COURIER · monoCourier").kText(.monoCourier).foregroundStyle(KBrand.courierGreen)
      Text("SEP 23 · monoStamp").kText(.monoStamp).foregroundStyle(theme.mute)
    }
  }

  private struct GalleryChoice: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let glyph: KLineGlyph
    let locked: Bool
  }

  // ── KChoiceCard in a KChoiceGrid: the room's trace tray ──
  private var choiceCards: some View {
    KChoiceGrid([
      GalleryChoice(id: "note", title: "A note", subtitle: "for them to find", glyph: .note, locked: false),
      GalleryChoice(id: "ask", title: "A question", subtitle: "they answer first", glyph: .ask, locked: false),
      GalleryChoice(id: "moment", title: "A moment", subtitle: "today's photo", glyph: .moment, locked: false),
      GalleryChoice(id: "song", title: "A song", subtitle: "not yet", glyph: .song, locked: true),
    ]) { c in
      KChoiceCard(theme: theme, title: c.title, subtitle: c.subtitle, glyph: c.glyph, locked: c.locked) {}
    }
    .padding(.bottom, 3)
  }

  // ── KFace, KMosaic, KOfficialBadge ──
  private var faces: some View {
    // a FACE v1 mask, as TS's mosaicMask would send it
    let mask = 0b10101_01110_11011_01110_10001
    return VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 14) {
        KFace(theme: theme, source: .mosaic(mask: mask, tint: theme.ink), size: 52)
        KFace(theme: theme, source: .mosaic(mask: mask, tint: theme.ind), size: 52)
        KFace(theme: theme, source: .veil, size: 52)
        KFace(theme: theme, source: .placeholder, size: 52, badge: true)
        KFace(theme: theme, source: .image(nil), size: 52, dim: true)
      }
      HStack(spacing: 14) {
        KFace(theme: theme, source: .mosaic(mask: mask, tint: theme.ink), size: 34)
        KFace(theme: theme, source: .mosaic(mask: mask, tint: theme.ink), size: 28, round: false)
        KMosaic.veil(theme: theme, cell: 4, gap: 1)
        KOfficialBadge(theme: theme, size: 18, ground: theme.bg)
      }
      caption("52 · 52 your turn · veil · badge · dim | 34 · docket 28 · veil · badge 18")
      // identity Phase 1: a frosted window at the sizes the app draws, its veil, the marks
      let frost = Self.sampleFrost(dark: theme.isDark)
      HStack(alignment: .center, spacing: 14) {
        KFace(theme: theme, source: .frost(frost), size: 52)
        KFrost(theme: theme, spec: frost, size: 40)
        KFrost(theme: theme, spec: frost, size: 31.2)
        KFrost(theme: theme, spec: frost, size: 18)
        KFrost(theme: theme, spec: frost, size: 12)
        KFace(theme: theme, source: .frostVeil, size: 40)
      }
      HStack(alignment: .firstTextBaseline, spacing: 0) {
        Text(verbatim: "Sunday Kite").kText(.system(17, .semibold)).foregroundStyle(theme.ink)
        KWhoMarks(mark: .she, sign: .gemini, size: 14, color: theme.sub)
        Text(verbatim: "   Hafenlaterne").kText(.system(17, .semibold)).foregroundStyle(theme.ink)
        KWhoMarks(mark: nil, sign: .capricorn, size: 14, color: theme.sub)
      }
      caption("frost 52 · 40 card · 31.2 chat · 18 chip · 12 orbit (no silhouette under 20) · veil tile | name ♀ sign · sign alone")
      stampedFaces(mask: mask, frost: frost)
    }
  }

  // ── KStampAvatar / KFace(stamp:): a member's face as a gold perforated stamp (C2) ──
  private func stampedFaces(mask: Int, frost: KFrostSpec) -> some View {
    let first = KMemberStamp("1ST")
    let no7 = KMemberStamp("007")
    let night = KTheme.midnight
    let nightFrost = Self.sampleFrost(dark: true)
    return VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .center, spacing: 18) {
        KStampAvatar(theme: theme, size: 72, stamp: no7!) { inner in
          theme.soft2.overlay(KLineIcon(.pen, size: inner * 0.3, lineWidth: 2, color: theme.mute))
        }
        KFace(theme: theme, source: .image(nil), size: 52, stamp: first)
        KFace(theme: theme, source: .mosaic(mask: mask, tint: theme.ink), size: 52, stamp: no7)
        KFace(theme: theme, source: .frost(frost), size: 40, stamp: first)
      }
      HStack(alignment: .center, spacing: 18) {
        KFace(theme: theme, source: .mosaic(mask: mask, tint: theme.ind), size: 44, stamp: first)
        KFace(theme: theme, source: .mosaic(mask: mask, tint: theme.ink), size: 34, stamp: no7)
        KFace(theme: theme, source: .frost(frost), size: 34, stamp: first)
        KFace(theme: theme, source: .placeholder, size: 22, stamp: first)
        KFace(theme: theme, source: .veil, size: 40, stamp: first)   // a veil is never stamped
      }
      caption("stamp 72 (Me) · 52 image 1ST · 52 mosaic 007 · 40 frost | 44 room · 34 fold small · 34 frost · 22 small · veil: never")
      HStack(alignment: .center, spacing: 18) {
        KFace(theme: night, source: .mosaic(mask: mask, tint: night.ink), size: 52, stamp: no7)
        KFace(theme: night, source: .frost(nightFrost), size: 40, stamp: first)
        KFace(theme: night, source: .mosaic(mask: mask, tint: night.ink), size: 34, stamp: first)
        KFace(theme: night, source: .image(nil), size: 22, stamp: no7)
      }
      .padding(12)
      .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(night.bg))
      caption("Midnight: the ground is wax gold at 15%, the edge the same gold")
    }
    .padding(.top, 6)
  }

  /// A fixed sample window for the gallery (TS works out every real one; this is nobody's): FROST
  /// v1's lavender with periwinkle and sage lights, in both themes' tones.
  static func sampleFrost(dark: Bool) -> KFrostSpec {
    KFrostSpec(
      dark: dark,
      base: Color(hex: dark ? "#4A4478" : "#C9C2EC"),
      lights: [
        .init(color: Color(hex: dark ? "#3F4A7A" : "#B4BCEA"), x: 0.26, y: 0.32, r: 0.6643, alpha: 0.9),
        .init(color: Color(hex: dark ? "#4A5A3E" : "#C4D3B8"), x: 0.7, y: 0.78, r: 0.7214, alpha: 0.9),
      ],
      silhouetteAlpha: dark ? 0.13 : 0.22,
      head: .init(x: 0.5, y: 0.4, r: 0.235, solid: 0.62),
      shoulders: .init(x: 0.5, y: 1.04, rx: 0.52, ry: 0.36, solid: 0.55),
      sheenAlpha: 0.18,
      sheenTo: 0.55,
      hairlineAlpha: 0.35,
      hairlineWidth: 1
    )
  }

  // ── KVoiceCard: tap to play; it runs on by itself from where it was told ──
  private var voiceCards: some View {
    VStack(alignment: .leading, spacing: 10) {
      KVoiceCard(
        theme: theme,
        playback: playback,
        durationLabel: "0:35",
        positionLabel: playback.map { KVoiceCard.clock($0.positionS) } ?? "",
        playLabel: "Play",
        pauseLabel: "Pause"
      ) {
        let now = Date()
        if let p = playback, p.playing {
          playback = KPlayback(playing: false, positionS: p.position(at: now), durationS: 35, at: now)
        } else {
          let from = playback.map { $0.positionS >= 35 ? 0 : $0.positionS } ?? 0
          playback = KPlayback(playing: true, positionS: from, durationS: 35, at: now)
        }
      }
      KVoiceCard(theme: theme, playback: nil, durationLabel: "1:12", playLabel: "Play", pauseLabel: "Pause", unavailable: true, compact: false) {}
    }
  }

  /// Whether the gallery's field can take the keyboard. False while Adapters/KGalleryView.swift
  /// is not an ExpoSwiftUI.FocusableView: leaving ui-lab would then take a focused field off
  /// screen, the expo focus/unmount crash KField's header warns about (40354, 47682). Until it
  /// conforms (a forceResignFirstResponder() that resigns the first responder app-wide), the
  /// strip here is for its look (Seed fills it and wakes the send key); return-to-send, focus
  /// and blur are tried in the step-5 lab, whose adapter resigns. Flip it when the adapter can.
  private static let fieldIsLive = false

  // ── KField in a KReplyStrip, with the round tools ──
  private var replyStrip: some View {
    VStack(alignment: .leading, spacing: 10) {
      KReplyStrip(
        theme: theme,
        field: KField(theme: theme, controller: replyField, placeholder: "write back…", returnSends: true, onChange: { replyText = $0 }, onSubmit: { text in
          guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
          sent += 1
          replyField.clear()
          replyText = ""
        }),
        sendState: replyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .disabled : .enabled,
        sendLabel: "Send",
        onSend: {
          sent += 1
          replyField.clear()
          replyText = ""
        },
        leading: {
          KRoundTool(theme: theme, glyph: .plus(open: traceOpen), accessibilityLabel: traceOpen ? "Close" : "Leave a trace") {
            traceOpen.toggle()
          }
        }
      )
      .padding(.trailing, KReplyStrip<EmptyView, EmptyView>.shadowOffset)
      // a disabled field can't become first responder, by tap, VoiceOver or focus()
      .disabled(!Self.fieldIsLive)
      HStack(spacing: 10) {
        KTertiaryButton(theme: theme, title: "Seed", mono: true) {
          replyField.setText("A draft, restored.")
          // setText isn't reported back, so the gallery's own copy follows it here
          replyText = "A draft, restored."
        }
        if Self.fieldIsLive {
          KTertiaryButton(theme: theme, title: "Focus", mono: true) { replyField.focus() }
          KTertiaryButton(theme: theme, title: "Blur", mono: true) { replyField.blur() }
        } else {
          KTertiaryButton(theme: theme, title: "Clear", mono: true) {
            replyField.clear()
            replyText = ""
          }
        }
      }
      .kEqualHeightButtons()
      caption(Self.fieldIsLive ? "RETURN SENDS · SENT \(sent)" : "LOOK ONLY · TRY IT IN THE STEP-5 LAB")
    }
  }

  // ── KSendKey in its three states and two looks, KRoundTool ──
  private var sendKeys: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        KSendKey(theme: theme, state: .disabled, label: "Send") {}
        KSendKey(theme: theme, state: .enabled, label: "Send") {}
        KSendKey(theme: theme, state: .dimmed, label: "Send") {}
        KSendKey(theme: theme, state: .enabled, style: .word, label: "Send") {}
      }
      HStack(spacing: 8) {
        KRoundTool(theme: theme, glyph: .plus(open: false), accessibilityLabel: "Add") {}
        KRoundTool(theme: theme, glyph: .plus(open: true), accessibilityLabel: "Close") {}
        KRoundTool(theme: theme, glyph: .line(.mic), accessibilityLabel: "Record", dot: true) {}
        KRoundTool(theme: theme, glyph: .image(nil), accessibilityLabel: "Wren") {}
      }
      caption("DISABLED · ENABLED · DIMMED · WORD | + · OPEN · LINE + DOT · IMAGE")
    }
  }

  // ── KBackBar: sticky 52 with a trailing word, scrolling 44 ──
  private var backBar: some View {
    VStack(spacing: 8) {
      KBackBar(theme: theme, title: "Edit profile", backLabel: "Back", trailing: {
        Text("DONE").kText(.monoSend).foregroundStyle(theme.ind)
      }, onBack: {})
      .background(theme.soft)
      KBackBar(theme: theme, title: "Settings", backLabel: "Back", height: KBackBar<EmptyView>.scrollingHeight, sticky: false) {}
        .overlay(Rectangle().strokeBorder(theme.line, lineWidth: 1))
    }
  }

  // ── KBottomFade over stripes ──
  private var bottomFade: some View {
    VStack(spacing: 6) {
      ForEach(0..<8, id: \.self) { i in
        RoundedRectangle(cornerRadius: 6, style: .circular)
          .fill(i % 2 == 0 ? theme.ink : theme.ind)
          .frame(height: 16)
      }
    }
    .overlay(alignment: .bottom) { KBottomFade(theme: theme, height: 120) }
    .clipped()
  }

  // ── KScrollChrome: scroll the box, read the model ──
  private var scrollChrome: some View {
    VStack(alignment: .leading, spacing: 8) {
      ScrollView {
        LazyVStack(alignment: .leading, spacing: 0) {
          ForEach(0..<40, id: \.self) { i in
            Text("Row \(i)")
              .kText(.rowLabel)
              .foregroundStyle(theme.ink)
              .padding(.vertical, 10)
              .frame(maxWidth: .infinity, alignment: .leading)
              .overlay(alignment: .bottom) { Rectangle().fill(theme.line).frame(height: 1) }
          }
        }
        .padding(.horizontal, 14)
      }
      .kScrollChrome(chrome)
      .frame(height: 180)
      .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(theme.soft))
      .clipShape(RoundedRectangle(cornerRadius: 16, style: .circular))
      GalleryChromeReadout(theme: theme, chrome: chrome)
    }
  }

  // ── KFirstClassCard: the Me card and the Settings banner ──
  private var firstClass: some View {
    VStack(spacing: 12) {
      KFirstClassCard(
        variant: .card,
        eyebrow: "First Class",
        headline: "More room for your people.",
        sub: "More Kindreds · voice letters\nWren’s wardrobe · a monthly reading",
        cta: "See First Class →",
        stampLabel: "1ST",
        bird: nil
      ) {}
      KFirstClassCard(
        variant: .banner,
        eyebrow: "First Class",
        headline: "More room for your people.",
        sub: "More Kindreds · voice letters · Wren’s wardrobe · a monthly reading",
        cta: "Try First Class ›",
        stampLabel: "1ST",
        bird: nil
      ) {}
    }
  }

  // ── KNoticeBar: the Kindreds bar (× brings it back after a moment) and the Settings panel ──
  private var notices: some View {
    VStack(spacing: 12) {
      if noticeShown {
        KNoticeBar(theme: theme, text: "Turn on notifications so a reply can knock.", closeLabel: "Close") {} onClose: {
          noticeShown = false
          DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { noticeShown = true }
        }
      } else {
        caption("CLOSED · BACK IN A MOMENT")
          .frame(height: 41)
      }
      KNoticeBar(
        theme: theme,
        text: "Notifications are off, so nobody can knock.",
        actionLabel: "Turn on in Settings ›",
        glyph: nil,
        style: .panel
      ) {}
    }
  }

  // ── KSelectableTile and KToggleStyle ──
  private var tiles: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 10) {
        ForEach(KTheme.all, id: \.key) { t in
          KSelectableTile(theme: theme, selected: tile == t.key, cornerRadius: 12, accessibilityLabel: t.name) {
            tile = t.key
          } content: {
            VStack(spacing: 5) {
              RoundedRectangle(cornerRadius: 2, style: .circular).fill(t.ln).frame(width: 20, height: 3)
              RoundedRectangle(cornerRadius: 7, style: .circular).fill(t.sf)
                .overlay(RoundedRectangle(cornerRadius: 7, style: .circular).strokeBorder(t.ln, lineWidth: 1.5))
              Circle().fill(t.ind).frame(width: 5, height: 5)
            }
            .padding(EdgeInsets(top: 9, leading: 7, bottom: 7, trailing: 7))
            .aspectRatio(3 / 4, contentMode: .fit)
            .frame(maxWidth: .infinity)
            .background(t.bg)
          }
        }
      }
      Toggle("Match system", isOn: $knock)
        .kText(.rowLabel)
        .foregroundStyle(theme.ink)
        .toggleStyle(KToggleStyle(theme: theme))
    }
    .padding(.top, 3)
  }

  // ── .kMenu: long-press the row ──
  private var menu: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 12) {
        KFace(theme: theme, source: .mosaic(mask: 0b01110_10101_11111_10101_01110, tint: theme.ink), size: 44)
        VStack(alignment: .leading, spacing: 2) {
          Text("No. 4821").kText(.name).foregroundStyle(theme.ink)
          Text("Long-press for the menu").kText(.preview).foregroundStyle(theme.sub)
        }
        Spacer(minLength: 0)
      }
      .padding(.vertical, 10)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(theme.bg)
      .kMenu([
        KMenuItem(key: "read", title: "Mark as read", systemImage: "envelope.open"),
        KMenuItem(key: "page", title: "Their page", systemImage: "person.crop.circle"),
        KMenuItem(key: "report", title: "Report", systemImage: "flag", destructive: true),
      ]) { lastMenu = $0 }
      caption("LAST CHOSEN · \(lastMenu)")
    }
  }

  // ══ step 5, batch 1 ══

  // ── KStamp (stamps v2): the dev page's sheets, drawn in Swift. The page that wraps this,
  // dev/step5-stamp-art, draws React Native's components/Stamp in the same sheets above it ──

  /// one stamp from each category, in category order: confessions, almosts, late nights, small
  /// things, becoming, missing
  private static let stampSample = ["never-told", "crush", "cant-sleep", "made-my-day", "growing", "seasons"]
  /// every tier, flat: the dot (9), chip 15, XS 20, S 25 and 30, M 40, 50 and 60, L 80 and 120
  private static let stampFlatWidths: [CGFloat] = [9, 15, 20, 25, 30, 40, 50, 60, 80, 120]
  /// delivered mail: M and L
  private static let stampMailWidths: [CGFloat] = [40, 50, 60, 80, 120]
  /// lib/stamp-frame.test's golden letter ids: −3, −1.5, +1.5, +3
  private static let stampLetterIds = [
    "00000000-0000-4000-8000-000090000000",
    "00000000-0000-0000-0000-000000000000",
    "3f2b8c1e-6a4d-4e2f-9b7a-1c5d8e0f2a61",
    "e8b1f6c3-2d47-4a95-b06e-3c9a5d1f7b24",
  ]

  private var stamps: some View {
    VStack(alignment: .leading, spacing: 12) {
      stampHead("LADDER · FLAT, THEN DELIVERED · CLASSIC AND MIDNIGHT")
      stampLadderSheet(.classic)
      stampLadderSheet(.midnight)
      stampHead("PLACEMENTS · KSTAMPLADDER · THIS THEME")
        .padding(.top, 12)
      stampPlacements
      stampHead("FALLBACK · UNKNOWN ID AT 20, 40, 80 · THE DOT AT 9")
      HStack(alignment: .bottom, spacing: 14) {
        KStamp(id: "no-such-stamp", width: 20, dark: theme.isDark)
        KStamp(id: "no-such-stamp", width: 40, dark: theme.isDark)
        KStamp(id: "no-such-stamp", width: 80, dark: theme.isDark)
        KStamp(id: "no-such-stamp", width: 9, dark: theme.isDark)
        KStamp(id: "growing", width: 9, dark: theme.isDark)
      }
      stampHead("ALL \(KStampArt.ids.count) · TRAY 30×36 · A ROW PER CATEGORY")
        .padding(.top, 12)
      stampSheet(.classic)
      stampSheet(.midnight)
      caption(
        KStampArt.unread.isEmpty
          ? "ALL \(KStampArt.ids.count) DRAWN FROM THEIR LAYERS"
          : "FRAME ALONE, NO DRAWING · " + KStampArt.unread.joined(separator: " · ").uppercased()
      )
    }
  }

  /// One surface: the sample stamps at every flat width, then delivered, each row scrolling
  /// sideways (the dev page's LadderSheet).
  private func stampLadderSheet(_ sheet: KTheme) -> some View {
    let flat = Self.stampFlatWidths.map { "\(Int($0)) \(KStampFrame.v3Tier(for: $0).rawValue.uppercased())" }.joined(separator: " · ")
    let mail = Self.stampMailWidths.map { "\(Int($0))×\(Int(KStampFrame.height($0)))" }.joined(separator: " · ")
    return VStack(alignment: .leading, spacing: 10) {
      Text("\(sheet.name.uppercased()) · FLAT").kText(.monoSection).foregroundStyle(sheet.mute)
      ForEach(Self.stampSample, id: \.self) { id in
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(alignment: .bottom, spacing: 10) {
            ForEach(Self.stampFlatWidths, id: \.self) { w in
              KStamp(id: id, width: w, dark: sheet.isDark)
            }
          }
          .padding(.vertical, 4)
        }
      }
      stampCaption(flat, sheet)
      Text("\(sheet.name.uppercased()) · DELIVERED").kText(.monoSection).foregroundStyle(sheet.mute)
        .padding(.top, 6)
      ForEach(Array(Self.stampSample.enumerated()), id: \.offset) { r, id in
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(alignment: .bottom, spacing: 0) {
            ForEach(Array(Self.stampMailWidths.enumerated()), id: \.offset) { c, w in
              KStamp(id: id, width: w, dark: sheet.isDark, delivered: true, letterId: Self.stampLetterIds[(r + c) % Self.stampLetterIds.count])
                .padding(.leading, 18)
            }
          }
          .padding(.vertical, 6)
        }
      }
      stampCaption("\(mail) · TILT BY LETTER ID", sheet)
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(sheet.bg))
    .overlay(RoundedRectangle(cornerRadius: 18, style: .circular).strokeBorder(sheet.line, lineWidth: 1))
  }

  /// Every named placement at its own size and rule, in this theme (the dev page's Placements).
  private var stampPlacements: some View {
    let ids = KStampArt.ids
    return VStack(alignment: .leading, spacing: 14) {
      ForEach(Array(KStampLadder.all.enumerated()), id: \.offset) { i, p in
        let id = ids.isEmpty ? "" : ids[(i * 7) % ids.count]
        let letter = Self.stampLetterIds[i % Self.stampLetterIds.count]
        VStack(alignment: .leading, spacing: 6) {
          stampCaption("\(p.name.uppercased()) · \(Int(p.w))×\(Int(p.h)) · \(KStampFrame.v3Tier(for: p.w).rawValue.uppercased()) · \(Self.rule(p, letter: letter))", theme)
          HStack(alignment: .center, spacing: 18) {
            if p.name == KStampLadder.composeCorner.name {
              KStampSlot(width: p.w, stroke: theme.mute)
                .rotationEffect(.degrees(p.degrees))
            }
            KStamp(id: id, width: p.w, dark: theme.isDark, delivered: p.tilt == .letter, letterId: letter)
              .rotationEffect(.degrees(p.degrees))
          }
        }
      }
    }
  }

  private static func rule(_ p: KStampPlacement, letter: String) -> String {
    switch p.tilt {
    case .letter: return "TILT \(KStampFrame.js(KStampFrame.tilt(letterId: letter)))° (LETTER)"
    case .scatter: return "SCATTER (WEB), FLAT HERE"
    case let .fixed(d): return d == 0 ? "FLAT" : "\(KStampFrame.js(d))°"
    }
  }

  /// a sub-head of the STAMPS section, as the dev page's Head (mono 600 10 at .14em, mute), on
  /// as many lines as it takes rather than shrunk
  private func stampHead(_ text: String) -> some View {
    Text(text)
      .kText(.monoSection)
      .foregroundStyle(theme.mute)
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityAddTraits(.isHeader)
  }

  private func stampCaption(_ text: String, _ sheet: KTheme) -> some View {
    Text(text)
      .kText(.monoCaption)
      .foregroundStyle(sheet.mute)
      .lineLimit(2)
      .fixedSize(horizontal: false, vertical: true)
  }

  /// Every stamp on one surface at the tray's 30×36: six to a row (a row is a category, in
  /// stamps.ts order), spread edge to edge on the theme's tray colour (soft), in a panel of its
  /// page colour (the dev page's AllSheet).
  private func stampSheet(_ sheet: KTheme) -> some View {
    let ids = KStampArt.ids
    let rows = stride(from: 0, to: ids.count, by: 6).map { Array(ids[$0..<min($0 + 6, ids.count)]) }
    return VStack(alignment: .leading, spacing: 8) {
      Text(sheet.name.uppercased())
        .kText(.monoSection)
        .foregroundStyle(sheet.mute)
      VStack(spacing: 12) {
        ForEach(rows.indices, id: \.self) { r in
          HStack(spacing: 0) {
            ForEach(rows[r].indices, id: \.self) { c in
              if c > 0 { Spacer(minLength: 0) }
              KStamp(id: rows[r][c], width: KStampLadder.trayTile.w, dark: sheet.isDark)
            }
          }
        }
      }
      .padding(12)
      .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(sheet.soft))
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(sheet.bg))
    .overlay(RoundedRectangle(cornerRadius: 18, style: .circular).strokeBorder(sheet.line, lineWidth: 1))
  }
}

/// The scroll chrome's numbers, read in a child view so only it redraws as the box scrolls.
private struct GalleryChromeReadout: View {
  let theme: KTheme
  @ObservedObject var chrome: KScrollModel

  var body: some View {
    let direction: String
    switch chrome.direction {
    case .none: direction = "—"
    case .towardEnd: direction = "↓"
    case .towardTop: direction = "↑"
    }
    return Text("OFFSET \(Int(chrome.offset)) · \(direction) · BOTTOM \(chrome.isAtBottom ? "YES" : "NO") · PULL \(Int(chrome.pullDepth))")
      .kText(.monoCaption)
      .foregroundStyle(theme.mute)
  }
}
