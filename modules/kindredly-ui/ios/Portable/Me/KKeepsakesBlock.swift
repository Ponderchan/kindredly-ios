// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN'S LOOKS (4a, Prompt 4, O1; owner 2026-10-19: the accessories exactly as live, no redraw),
 under the courier card on Me. The file keeps its old
 name (it held the keepsakes block, which moved to the courier's own page, /courier) because a
 new Swift file needs a pod install.

 A soft tray, corners 20, padding 14 14 12, 12 between the header and the tiles:
 - the header: WREN'S LOOKS (mono 10 at .16em, sub) and "All looks →" (12/600, ind) at the right;
 - four square tiles, 10 apart, corners 18, a 2pt border, each with the courier at 62% of it (a
   snapshot of her own WrenBird in that look, grown) and its label under it, 6 lower (mono 9 at
   .1em; ink when on, gold on the locked tile, sub otherwise):
     BARE      sf, a light line border (ink once chosen; 4a's PLAIN, the app's own word ws.acc.none)
     BEANIE    lav, its own colour as border (ws.acc.beanie: the live beanie, drawn as live)
     SCARF     pale green (on a dark theme the green at .28), the same
     WITCH     in Halloween (owner 2026-10-26; the season's two looks take BEANIE's and SCARF's
               places): a pale plum (the hat's lip #9466C9 at .30 on a dark theme), the same
     GHOST     the same, a pale lilac (the boo stamp's #D6D3F7 at .22 on a dark theme); a binary
               without these two draws them on sf, as BARE
     1ST CLASS cream, a 2pt dashed wax-gold border; for a free reader the bird at 35% and an 18
               gold lock at the top right; for a member her current First Class look, no lock.
 - the one she wears: an ink border, an 18 green check at the top left and the tile at 1.04 (a
   .25s spring; no scale under Reduce Motion, the border and the check say it).
 Every tile is a button (VoiceOver: its name, selected when on; the locked one "Locked" and
 "Opens First Class"). The labels stop growing at xxLarge so four still fit across.
 */
struct KLooksTray: View {
  let theme: KTheme
  let looks: KMeLooks
  let a11y: KMeA11yWords
  let actions: KMeActions

  static var headerStyle: KTextStyle { .mono(10, .semibold, tracking: 0.16) }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .center, spacing: 8) {
        Text(looks.header)
          .kText(Self.headerStyle)
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .accessibilityAddTraits(.isHeader)
        Spacer(minLength: 0)
        SwiftUI.Button {
          actions.onAllLooks()
        } label: {
          Text(looks.all)
            .kText(.system(12, .semibold))
            .foregroundStyle(theme.ind)
            .lineLimit(1)
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .padding(.vertical, -8)
        .accessibilityLabel(looks.all.replacingOccurrences(of: "→", with: "").trimmingCharacters(in: .whitespaces))
        .accessibilityHint(looks.allHint)
      }
      // the header row stops growing where the peek's do, so the name and the link both stay legible
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      HStack(alignment: .top, spacing: 10) {
        ForEach(looks.tiles) { tile in
          KLookTile(theme: theme, tile: tile, lockedWord: a11y.locked) {
            actions.onLook(tile.id)
          }
          .frame(maxWidth: .infinity)
        }
      }
    }
    .padding(.top, 14)
    .padding(.horizontal, 14)
    .padding(.bottom, 12)
    .background(RoundedRectangle(cornerRadius: 20, style: .circular).fill(theme.soft))
    .accessibilityElement(children: .contain)
  }
}

struct KLookTile: View {
  let theme: KTheme
  let tile: KMeLookTile
  let lockedWord: String
  let onTap: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  static var labelStyle: KTextStyle { .mono(9, .semibold, tracking: 0.1) }

  private var fill: Color {
    switch tile.id {
    case "beanie": return theme.lav
    case "scarf": return scarfFill
    case "witch": return witchFill
    case "ghost": return ghostFill
    case "fc": return KBrand.cream
    default: return theme.sf
    }
  }

  /// Halloween's witch hat: a pale plum; on a dark theme the hat's lighter lip at .30
  private var witchFill: Color {
    theme.isDark ? Color(hex: "#9466C9").opacity(0.30) : Color(hex: "#ECE3F7")
  }

  /// Halloween's bedsheet ghost: a pale lilac; on a dark theme the boo stamp's lilac at .22
  private var ghostFill: Color {
    theme.isDark ? Color(hex: "#D6D3F7").opacity(0.22) : Color(hex: "#EFEEFC")
  }

  /// 4a's pale green; on a dark theme the green at .28, as the kindreds button's open fill
  private var scarfFill: Color {
    theme.isDark ? KBrand.greenText.opacity(0.28) : KBrand.paleGreen
  }

  private var border: Color {
    if tile.selected { return theme.ln }
    switch tile.id {
    case "beanie": return theme.lav
    case "scarf": return scarfFill
    case "witch": return witchFill
    case "ghost": return ghostFill
    case "fc": return KBrand.waxGold
    // 4a draws PLAIN's ink border even when another look is on, which made two tiles read as
    // chosen; unselected, the white tile keeps a light line so it still shows on the soft tray
    default: return theme.line
    }
  }

  private var labelColor: Color {
    if tile.locked { return KBrand.goldText }
    return tile.selected ? theme.ink : theme.sub
  }

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 18, style: .circular)
    let dashed = tile.id == "fc" && !tile.selected
    SwiftUI.Button(action: onTap) {
      VStack(spacing: 6) {
        shape
          .fill(fill)
          .aspectRatio(1, contentMode: .fit)
          .overlay {
            GeometryReader { g in
              let side = (min(g.size.width, g.size.height) * 0.62).rounded()
              KImage(tile.bird, size: CGSize(width: side, height: side), contentMode: .fit, placeholder: .clear)
                .opacity(tile.dim ? 0.35 : 1)
                .frame(width: g.size.width, height: g.size.height)
            }
          }
          .overlay {
            shape.strokeBorder(border, style: StrokeStyle(lineWidth: 2, dash: dashed ? [5, 4] : []))
          }
          .overlay(alignment: .topTrailing) {
            if tile.locked {
              ZStack {
                Circle().fill(KBrand.waxGold)
                KLineIcon(.lock, size: 10, lineWidth: 2.6, color: KBrand.inkOnBrand)
              }
              .frame(width: 18, height: 18)
              .padding(6)
            }
          }
          .overlay(alignment: .topLeading) {
            if tile.selected {
              ZStack {
                Circle().fill(KBrand.greenText)
                KLineIcon(.check, size: 10, lineWidth: 3, color: .white)
              }
              .frame(width: 18, height: 18)
              .padding(6)
            }
          }
          .scaleEffect(tile.selected && !reduceMotion ? 1.04 : 1)
          .animation(reduceMotion ? nil : .spring(response: 0.25, dampingFraction: 0.55), value: tile.selected)
        Text(tile.label)
          .kText(Self.labelStyle)
          .foregroundStyle(labelColor)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(tile.name)
    .accessibilityValue(tile.locked ? lockedWord : "")
    .accessibilityHint(tile.hint)
    .accessibilityAddTraits(tile.selected ? [.isButton, .isSelected] : .isButton)
  }
}
