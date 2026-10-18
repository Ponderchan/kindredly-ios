import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { KChatHeader } from "../../../modules/kindredly-ui/src/Conversation";
import { LineIcon } from "../../components/10a/LineIcon";
import { Frost, VeilTile } from "../../components/Frost";
import { useIdentityOn } from "../../lib/identity";
import { WhoName } from "../../components/WhoName";
import type { FrostSpec } from "../../lib/frost";
import { useTheme } from "../../lib/theme";
import { COLS, ROWS, VEIL_MASK, maskHas } from "../../lib/mosaic";
import { BRAND } from "../../theme/themes";
import { PF } from "../../theme/post";

/* THE CONVERSATION'S HEADER, IN REACT NATIVE (chat composers, the owner's
   final, 2026-10-18; KChatHeader's twin): the pen-pal chat's while names
   aren't traded (Prompt 2 A2, LettersRN), and the kindreds chat's (B,
   RoomRN). A pen-pal chat that is already revealed keeps the older
   ChatHeader. It draws the very record the Swift header draws (build-items
   lettersHeader / roomHeader: every word, the tone, the face's mask, the
   frame, the dots, the VoiceOver label), so the two can't drift.

     ‹  ▦  No. 5422                         ●●●○○  ···    72 tall, on the page, a 1.5
           LETTER 3 OF 5 · THEIRS                         line rule under it; padding
                                                          0 18 0 14, 12 apart
     ‹  ◯  Luna                                    ···    the kindreds chat (model.room):
           KINDRED SINCE OCTOBER 8                        the kindred's face, round, 44

   · ‹ the back chevron, 22 at 2.2 in ink, in a 40 × 44 target (VoiceOver:
     Back).
   · THE FACE. A pen pal: FACE v1 from the record's mask (lib/mosaic, 5 × 5
     square cells, 31 across) in a 44 × 36 slot, the veil in faint for a
     deleted account, and the frame a face that has come through wears (a
     quiet line; brass once they went first — Midnight's brass is the wax
     gold) closing it to 36. A kindred: the screen draws their round face,
     44 across (`roomFace`: AvatarImage, or the veil once gone).
     With the identity switch on (identity Phase 1) the record carries the
     pen pal's frosted window instead (`frost`, lib/frost through
     lib/stranger-who): drawn at 34 in the same slot (components/Frost), 32
     inside the same frame once it is framed, so the slot never changes
     size. It never develops; the frame and the dots still tell the story.
     A deleted account is then the flat veil tile (components/Frost).
   · THE NAME in system 600 18 on one line (the courier name once the switch
     is on, with the record's ♀/♂ mark 6pt after it and the star sign 4pt
     after that, ink glyphs in sub: components/WhoName); under it mono 500
     10 at .12em on one line, in mute (or the state's tone past the
     letters).
   · THE DOTS (the pen pal only): five, 8 across with a 1.5 ln outline, 4
     apart; one filled for each exchange that went both ways. VoiceOver
     hears them in the name's element.
   · ··· Report or block (the screen opens ReportSheet: it drops from here),
     22 in ink, in a 40 × 44 target; none when there is nobody to report.
   Face and name are one button that opens their page when the record says
   so (canOpenPage), and otherwise one header element. Every tap leaves the
   screen or covers it, so the screen lets go of the keyboard first. */

export function ConversationHeaderRN({
  model,
  roomFace,
  topInset,
  onBack,
  onPage,
  onMore,
}: {
  model: KChatHeader;
  /** the kindreds chat: their round face, 44 across */
  roomFace?: ReactNode;
  /** the status bar's room; the safe-area inset by default (a dev page above it passes 0) */
  topInset?: number;
  onBack: () => void;
  onPage: () => void;
  onMore: () => void;
}) {
  const { t: tk, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const brass = dark ? BRAND.waxGold : BRAND.brassSeal;
  const subColor = model.tone === "ind" ? tk.ind : model.tone === "brass" ? brass : tk.mute;

  const identity = (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
      {model.room ? (
        <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>{roomFace}</View>
      ) : (
        <PenPalFace mask={model.mask} veil={model.veil} frost={model.room ? null : (model.frost as FrostSpec | null)} frame={model.frame === "none" ? null : model.frame === "brass" ? brass : tk.line} />
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <WhoName
          name={model.name}
          marks={{ mark: model.room ? null : model.mark, sign: model.room ? null : model.sign }}
          style={{ fontSize: 18, fontWeight: "600", color: tk.ink }}
          glyph={14}
          // one line as ever; a courier name with its glyphs may take a second rather than be cut
          numberOfLines={model.frost && !model.room ? 2 : 1}
          maxFontSizeMultiplier={2.2}
        />
        {!!model.sub && (
          <Text numberOfLines={1} maxFontSizeMultiplier={2.2} style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.2, color: subColor }}>
            {model.sub}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ paddingTop: topInset ?? insets.top, backgroundColor: tk.bg, borderBottomWidth: 1.5, borderBottomColor: tk.line }}>
      {/* padding 0 18 0 14 to the icons' own edges: the 40 targets reach 9 past each 22 icon */}
      <View style={{ minHeight: 72, flexDirection: "row", alignItems: "center", paddingLeft: 14 - 9, paddingRight: model.moreLabel ? 18 - 9 : 18 }}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={model.backLabel}
          style={({ pressed }) => ({ width: 40, height: 44, alignItems: "center", justifyContent: "center", marginRight: 3, transform: [{ scale: pressed ? 0.94 : 1 }] })}
        >
          <LineIcon name="chevronLeft" size={22} stroke={2.2} color={tk.ink} />
        </Pressable>

        {model.canOpenPage ? (
          <Pressable
            onPress={onPage}
            accessible
            accessibilityRole="button"
            accessibilityLabel={model.a11yLabel}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.6 : 1 })}
          >
            {identity}
          </Pressable>
        ) : (
          <View accessible accessibilityRole="header" accessibilityLabel={model.a11yLabel} style={{ flex: 1 }}>
            {identity}
          </View>
        )}

        {!model.room && (
          <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ flexDirection: "row", gap: 4, marginLeft: 12 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: tk.ln, backgroundColor: i < model.dots ? tk.ln : "transparent" }} />
            ))}
          </View>
        )}

        {!!model.moreLabel && (
          <Pressable
            onPress={onMore}
            accessibilityRole="button"
            accessibilityLabel={model.moreLabel}
            style={({ pressed }) => ({ width: 40, height: 44, alignItems: "center", justifyContent: "center", marginLeft: 3, transform: [{ scale: pressed ? 0.94 : 1 }] })}
          >
            <LineIcon name="more" size={22} color={tk.ink} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* the pen pal's face in its 44 × 36 slot: 5.2 cells 1.3 apart (31 across), framed to 36 — or,
   switch on, their frosted window at 34 (32 inside the frame, 1 clear of it, so the frame still
   closes at 36) */
const CELL = 5.2;
const GAP = 1.3;

function PenPalFace({ mask, veil, frame, frost }: { mask: number; veil: boolean; frame: string | null; frost: FrostSpec | null }) {
  const { t: tk } = useTheme();
  // a deleted account with the switch on: the flat veil tile, the same for every ghost (plan §1 1b)
  const identity = useIdentityOn();
  if (veil && identity) {
    return (
      <View style={{ width: 44, height: 36, alignItems: "center", justifyContent: "center" }}>
        <VeilTile size={34} />
      </View>
    );
  }
  if (frost && !veil) {
    const side = frame ? 32 : 34;
    return (
      <View style={{ width: 44, height: 36, alignItems: "center", justifyContent: "center" }}>
        <View style={{ padding: frame ? 1 : 0, borderWidth: frame ? 1 : 0, borderColor: frame ?? "transparent", borderRadius: frame ? 36 * frost.corner : 0 }}>
          <Frost spec={frost} size={side} />
        </View>
      </View>
    );
  }
  const m = veil ? VEIL_MASK : mask;
  const ink = veil ? tk.faint : tk.ink;
  return (
    <View style={{ width: 44, height: 36, alignItems: "center", justifyContent: "center" }}>
      <View style={{ padding: 2.4 - (frame ? 1 : 0), borderWidth: frame ? 1 : 0, borderColor: frame ?? "transparent", gap: GAP }}>
        {Array.from({ length: ROWS }).map((_, r) => (
          <View key={r} style={{ flexDirection: "row", gap: GAP }}>
            {Array.from({ length: COLS }).map((_, c) => (
              <View key={c} style={{ width: CELL, height: CELL, backgroundColor: maskHas(m, r, c) ? ink : "transparent" }} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
