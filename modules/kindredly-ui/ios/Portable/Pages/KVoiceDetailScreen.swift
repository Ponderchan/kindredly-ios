// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 YOUR VOICE, IN DETAIL, IN SWIFT (2026-10-27): the nine signals Wren reads (/voice, a dev page:
 the route sends a release build home). The React Native page (src/app/voice.tsx) stays as the
 "voice" switch's fallback. Every word is TS's (src/screens/voice/voice-detail-model); this draws
 them and reports the back key and a tap on the night letter's door.

   ‹  YOUR VOICE                              the title (13, .19em) and the line under it (11, sub)
      Based on 4 pieces · a little spark      beside the chevron, from 56
   ┌──────────────────────────────────────┐
   │ “Wren's summary, when there is one.” │   on lav2, in the Letter font's italic; her name in mute
   │ — Wren                               │
   └──────────────────────────────────────┘
   ┌──────────────────────────────────────┐
   │ [~]  Rhythm                    ●●●●○ │   the nine on sf, a line between; a glyph on a lav2
   │      What it found.                  │   tile in ind, the dots ind on lav; a row without
   ├──────────────────────────────────────┤   enough writing faded to .45, its dots all lav
   └──────────────────────────────────────┘
   ┌──────────────────────────────────────┐
   │ 🌙 YOUR AURA · WRAPPED               │   the night letter's door keeps its night in every
   │ Wren wrote you a letter.             │   theme (it is the cover of /report); only ready and
   │ How you write, wrapped…              │   locked can be tapped; progress has its bar
   └──────────────────────────────────────┘
            Wren keeps learning as you write. (Wren)   the Letter font's italic in mute, her 22

 The cards are flat (rule B: controls and panels carry no edge and no shadow). VoiceOver reads a
 row as one element (its title and its line); the door is a button only while it opens something.
 */

public struct KVoiceDetailRow: Equatable, Sendable, Identifiable {
  public let id: String
  public let glyph: String
  public let title: String
  public let line: String
  /// 1…5
  public let strength: Int
  public let read: Bool

  public init(id: String, glyph: String, title: String, line: String, strength: Int, read: Bool) {
    self.id = id
    self.glyph = glyph
    self.title = title
    self.line = line
    self.strength = strength
    self.read = read
  }
}

/// The night letter's door.
public struct KVoiceDetailGate: Equatable, Sendable {
  public var eyebrow = ""
  public var title = ""
  public var sub = ""
  /// 0…100 while she is saving up; nil otherwise
  public var pct: Int?
  public var tappable = false

  public init(eyebrow: String = "", title: String = "", sub: String = "", pct: Int? = nil, tappable: Bool = false) {
    self.eyebrow = eyebrow
    self.title = title
    self.sub = sub
    self.pct = pct
    self.tappable = tappable
  }
}

public struct KVoiceDetailContent: Equatable, Sendable {
  public var title = ""
  public var backLabel = ""
  /// the line under the title ("…" until the writing is read)
  public var basedOn = ""
  /// “her summary”, or "" until the deeper engine has spoken
  public var summary = ""
  /// — Wren
  public var signature = ""
  public var rows: [KVoiceDetailRow] = []
  /// nil until the gate is known
  public var gate: KVoiceDetailGate?
  public var learning = ""
  /// her snapshot beside the last line, 22; nil while it is captured
  public var bird: KImageRef?

  public init() {}
}

public final class KVoiceDetailActions {
  public var onBack: () -> Void = {}
  /// the night letter's door, when it opens something
  public var onGate: () -> Void = {}

  public init() {}
}

public struct KVoiceDetailScreen: View {
  private let theme: KTheme
  private let content: KVoiceDetailContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KVoiceDetailActions

  public init(theme: KTheme, content: KVoiceDetailContent, topInset: CGFloat, bottomInset: CGFloat, actions: KVoiceDetailActions) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  public var body: some View {
    VStack(spacing: 0) {
      Color.clear.frame(height: topInset)
      header
      ScrollView(.vertical) {
        VStack(spacing: 0) {
          if !content.summary.isEmpty {
            summary
              .padding(.bottom, 12)
          }
          rows
          if let gate = content.gate {
            door(gate)
              .padding(.top, 14)
          }
          HStack(spacing: 8) {
            Text(content.learning)
              .kText(.content(12.5, italic: true))
              .foregroundStyle(theme.mute)
              .multilineTextAlignment(.center)
              .fixedSize(horizontal: false, vertical: true)
            KImage(content.bird, size: CGSize(width: 22, height: 22), contentMode: .fit, placeholder: .clear)
              .accessibilityHidden(true)
          }
          .frame(maxWidth: .infinity)
          .padding(.top, 18)
        }
        .padding(.horizontal, 20)
        .padding(.top, 14)
      }
      .scrollIndicators(.hidden)
      .contentMargins(.bottom, bottomInset, for: .scrollContent)
    }
    .background { theme.bg.ignoresSafeArea() }
  }

  private var header: some View {
    ZStack(alignment: .leading) {
      VStack(alignment: .leading, spacing: 2) {
        Text(content.title)
          .kText(.system(13, tracking: 2.5 / 13))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .accessibilityAddTraits(.isHeader)
        Text(content.basedOn)
          .kText(.system(11))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
      }
      .padding(.leading, 56)
      .padding(.trailing, 12)
      .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
      KBackChevron(theme: theme, label: content.backLabel, action: actions.onBack)
        .padding(.leading, KBackChevron.leading)
        .frame(maxHeight: .infinity, alignment: .top)
    }
    .fixedSize(horizontal: false, vertical: true)
    .padding(.bottom, 8)
    // the header is the page's top: its words stop growing at the largest standard size
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private var summary: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(content.summary)
        .kText(.content(14.5, italic: true, lineHeight: 22.0 / 14.5))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
      Text(content.signature)
        .kText(.system(11))
        .foregroundStyle(theme.mute)
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(theme.lav2))
    .accessibilityElement(children: .combine)
  }

  private var rows: some View {
    VStack(spacing: 0) {
      ForEach(Array(content.rows.enumerated()), id: \.element.id) { i, r in
        row(r)
          .overlay(alignment: .top) {
            if i > 0 { theme.line.frame(height: 1) }
          }
      }
    }
    .padding(.vertical, 6)
    .frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(theme.sf))
  }

  private func row(_ r: KVoiceDetailRow) -> some View {
    HStack(alignment: .center, spacing: 14) {
      Text(r.glyph)
        .kText(.content(15))
        .foregroundStyle(theme.ind)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .frame(width: 36, height: 36)
        .background(RoundedRectangle(cornerRadius: 11, style: .circular).fill(theme.lav2))
        .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 3) {
        Text(r.title)
          .kText(.system(13.5, .bold))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
        Text(r.line)
          .kText(.system(12, lineHeight: 17.0 / 12.0))
          .foregroundStyle(theme.sub)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      HStack(spacing: 3.5) {
        ForEach(1...5, id: \.self) { d in
          Circle()
            .fill(r.read && d <= r.strength ? theme.ind : theme.lav)
            .frame(width: 5.5, height: 5.5)
        }
      }
      .accessibilityHidden(true)
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 14)
    .opacity(r.read ? 1 : 0.45)
    .accessibilityElement(children: .combine)
  }

  @ViewBuilder
  private func door(_ gate: KVoiceDetailGate) -> some View {
    if gate.tappable {
      SwiftUI.Button(action: actions.onGate) {
        doorFace(gate)
      }
      .buttonStyle(KVoiceDoorStyle())
    } else {
      doorFace(gate)
        .accessibilityElement(children: .combine)
    }
  }

  private func doorFace(_ gate: KVoiceDetailGate) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(gate.eyebrow)
        .kText(.mono(10, .semibold, tracking: 1.8 / 9.5))
        .foregroundStyle(KReportNight.brand)
      Text(gate.title)
        .kText(.system(17, .semibold))
        .foregroundStyle(Color.white)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 8)
      Text(gate.sub)
        .kText(.system(12.5, lineHeight: 19.0 / 12.5))
        .foregroundStyle(KReportNight.dim)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 6)
      if let pct = gate.pct {
        GeometryReader { g in
          ZStack(alignment: .leading) {
            Capsule().fill(KReportNight.card)
            Rectangle()
              .fill(KReportNight.bar)
              .frame(width: g.size.width * CGFloat(min(100, max(0, pct))) / 100)
          }
          .clipShape(RoundedRectangle(cornerRadius: 3, style: .circular))
        }
        .frame(height: 5)
        .padding(.top, 12)
        .accessibilityHidden(true)
      }
    }
    .padding(18)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 22, style: .circular).fill(KReportNight.ground))
    .contentShape(RoundedRectangle(cornerRadius: 22, style: .circular))
  }
}

/// The door's press: a breath of fade (.92), as the React Native card's.
private struct KVoiceDoorStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? 0.92 : 1)
      .animation(KMotion.press, value: configuration.isPressed)
  }
}
