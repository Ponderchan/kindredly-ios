import type { RefObject } from "react";
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { KChatDock, KChatDockAction } from "../../../modules/kindredly-ui/src/Conversation";
import { InkPanel } from "../../components/10a/InkPanel";
import { StickerBox } from "../../components/10a/StickerBox";
import { GlyphInput } from "../../components/GlyphInput";
import { WrenBird } from "../../components/WrenBird";
import { useTheme } from "../../lib/theme";
import { BRAND } from "../../theme/themes";
import { MONO, PF } from "../../theme/post";

/* THE DOCK, IN REACT NATIVE (10a step 5, slice chat-rn): everything above
   and in place of the composer in the room and chat fallbacks, drawn from
   the same KChatDock record the SwiftUI KDock draws (build-items
   buildRoomDock / buildLettersDock — every word and every rule there), in
   KDock's order and look, on the theme:

     1. the closing line and its one link
     2. Wren's notice (soft, corners 16; her bird, WREN NOTICED and the
        evidence in mono 9, the ×, the line in system 15, the #word as an
        aura label)
     3. the sign door (pen-pal chat), above the status line as it always
        stood: a capsule, gold on cream with a wax shadow when they went
        first, plain mono when I did
     4. the status line: over the limit in postmark red, a slow send or no
        connection in mute (the slow note was a toast under the keyboard:
        spec bug 8)
     5. the reply quote, only while no mode is set
     6. the mode box, with the question's prompt field (uncontrolled, as
        the reply strip is: its words are seeded only by the model)

   then the composer row (the screens draw it: the chat composers' bars,
   owner 2026-10-18 — a room's Kindreds bar with its ideas bubble, the
   pen-pal chat's reply bar; components/10a), or in its place the gone line
   or the expired card. 1-6 scroll inside at most 40% of the screen
   (KChatCappedHeight), so at the largest type the composer can't be pushed
   under the keyboard. VoiceOver's escape (two-finger Z) closes only what is
   open, as in KDock: the reply quote from inside it, the mode box from its
   field or ×, the tray from the + or a card, the ideas bubble from its key
   or itself; otherwise it goes back. */

/** a × in mute with a 44pt target that doesn't push its row taller */
export function DockClose({ label, onPress }: { label: string; onPress: () => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 28, height: 28, marginVertical: -6, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={tk.mute} strokeWidth={2.4} strokeLinecap="round">
        <Path d="M6 6l12 12M18 6L6 18" />
      </Svg>
    </Pressable>
  );
}

export type DockAboveProps = {
  dock: KChatDock;
  /** the composer's status line (ComposerFacts) */
  status: string;
  statusAlarm: boolean;
  onDock: (action: KChatDockAction) => void;
  /** the question's prompt field: its seed (text and a key bumped to put text in), ref and edits */
  prompt?: { seed: { text: string; n: number }; ref: RefObject<TextInput | null>; onChange: (v: string) => void; onFocus?: () => void };
  /** what a double tap on the sign door does, said by VoiceOver (identity on: it opens the signing sheet); none by default */
  signHint?: string;
};

/** 1-6, in a scroll view at most 40% of the screen tall */
export function DockAbove({ dock, status, statusAlarm, onDock, prompt, signHint }: DockAboveProps) {
  const { t: tk } = useTheme();
  const { height } = useWindowDimensions();
  const hasAny = !!dock.closingText || !!dock.notice || dock.signDoor !== "none" || !!status || (!!dock.replyLabel && !dock.mode) || !!dock.mode;
  if (!hasAny) return null;
  return (
    <ScrollView style={{ maxHeight: Math.max(120, Math.round(height * 0.4)), flexGrow: 0 }} bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 8 }}>
      {!!dock.closingText && (
        <Pressable onPress={() => onDock("closingLink")} accessibilityRole="link" style={{ paddingHorizontal: 10, marginBottom: 8, gap: 4 }}>
          <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, lineHeight: 16, letterSpacing: 0.2, color: tk.sub }}>{dock.closingText}</Text>
          {!!dock.closingLink && (
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.12, color: tk.ind }}>{dock.closingLink} ›</Text>
          )}
        </Pressable>
      )}

      {!!dock.notice && (
        <View style={{ marginBottom: 10, borderRadius: 16, backgroundColor: tk.soft, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <WrenBird size={20} mood="curious" />
            <Text numberOfLines={1} style={{ fontFamily: PF.monoMed, fontSize: MONO.small, letterSpacing: MONO.small * 0.12, color: tk.mute }}>
              {dock.notice.label}
            </Text>
            <View style={{ flex: 1 }} />
            <Text numberOfLines={1} ellipsizeMode="head" style={{ flexShrink: 1, fontFamily: PF.monoMed, fontSize: MONO.small, letterSpacing: MONO.small * 0.1, color: tk.mute }}>
              {dock.notice.evidence}
            </Text>
            <DockClose label={dock.notice.closeLabel} onPress={() => onDock("noticeClose")} />
          </View>
          <Text style={{ fontSize: 15, lineHeight: 22.5, color: tk.ink }}>{dock.notice.line}</Text>
          {!!dock.notice.word && (
            // the aura label: no fill, no shadow
            <View style={{ alignSelf: "flex-start", borderWidth: 1.5, borderColor: tk.ind, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: tk.ind }}>#{dock.notice.word}</Text>
            </View>
          )}
        </View>
      )}

      {dock.signDoor !== "none" && <SignDoor dock={dock} onDock={onDock} hint={signHint} />}

      {!!status && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.12, color: statusAlarm ? BRAND.postRed : tk.mute, textAlign: "center", marginBottom: 6 }}
        >
          {status}
        </Text>
      )}

      {!!dock.replyLabel && !dock.mode && (
        // VoiceOver's escape from the quote or its × lets go of the reply (KDock), not the room
        <View onAccessibilityEscape={() => onDock("replyClose")} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, marginBottom: 8 }}>
          <View style={{ width: 2, alignSelf: "stretch", backgroundColor: tk.ind }} />
          <View accessible style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.12, color: tk.ind }}>
              {dock.replyLabel}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 14, color: tk.sub }}>
              {dock.replyExcerpt}
            </Text>
          </View>
          <DockClose label={dock.replyCloseLabel} onPress={() => onDock("replyClose")} />
        </View>
      )}

      {!!dock.mode && (
        // from the prompt field or the ×: escape closes the mode (KDock)
        <View
          onAccessibilityEscape={() => onDock("modeClose")}
          style={{ marginBottom: 8, padding: 12, borderRadius: 16, backgroundColor: tk.lav2, borderWidth: 1.5, borderColor: tk.ind, gap: 7 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.12, color: tk.ind }}>{dock.mode.title}</Text>
            <DockClose label={dock.mode.closeLabel} onPress={() => onDock("modeClose")} />
          </View>
          {dock.mode.showsPrompt && prompt && (
            <GlyphInput
              key={prompt.seed.n}
              ref={prompt.ref}
              defaultValue={prompt.seed.text}
              onChangeText={prompt.onChange}
              onFocus={prompt.onFocus}
              placeholder={dock.mode.promptPlaceholder}
              placeholderTextColor={tk.mute}
              style={{ fontSize: 15.5, color: tk.ink, paddingVertical: 2 }}
            />
          )}
          {!!dock.mode.promptText && <Text style={{ fontSize: 15.5, lineHeight: 22, color: tk.ink }}>{dock.mode.promptText}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

/** the sign door: from the fifth letter until names are traded (identity on: five each way) */
function SignDoor({ dock, onDock, hint }: { dock: KChatDock; onDock: (action: KChatDockAction) => void; hint?: string }) {
  const { t: tk } = useTheme();
  if (dock.signDoor === "waiting") {
    return (
      <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.12, color: tk.mute, textAlign: "center", marginBottom: 10 }}>{dock.signLabel}</Text>
    );
  }
  // the one warm signal in the product: theirs is in, yours is asked for — the First Class chip's gold
  const gold = dock.signDoor === "theirsFirst";
  return (
    <View style={{ alignItems: "center", marginBottom: 10 }}>
      <Pressable onPress={() => onDock("sign")} accessibilityRole="button" accessibilityHint={hint} hitSlop={8}>
        {({ pressed }) => (
          <StickerBox
            fill={gold ? BRAND.cream : tk.sf}
            stroke={gold ? BRAND.waxGold : tk.ln}
            lineWidth={2}
            radius={20}
            shadow={gold ? BRAND.waxGold : null}
            offset={gold ? 2 : 0}
            pressed={pressed}
            faceStyle={{ paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.12, color: gold ? BRAND.goldText : tk.ink, textAlign: "center" }}>{dock.signLabel}</Text>
          </StickerBox>
        )}
      </Pressable>
    </View>
  );
}

/** the gone line, where the composer was: readable, not actionable (owner) */
export function GoneLine({ text }: { text: string }) {
  const { t: tk } = useTheme();
  return (
    <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, lineHeight: 17, letterSpacing: 0.3, color: tk.mute, textAlign: "center", paddingHorizontal: 14, paddingTop: 6, paddingBottom: 12 }}>{text}</Text>
  );
}

/** the expired door: InkCard .me, her bird thinking, the label, the body, REKINDLE (owner: it stays) */
export function ExpiredCard({ dock, onDock }: { dock: KChatDock; onDock: (action: KChatDockAction) => void }) {
  const { t: tk } = useTheme();
  return (
    <InkPanel variant="me" style={{ marginRight: 5, marginBottom: 11, marginTop: 4 }} contentStyle={{ gap: 8 }}>
      <View accessible style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <WrenBird size={20} mood="think" />
        <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.small, letterSpacing: MONO.small * 0.12, color: tk.mute }}>{dock.expiredLabel}</Text>
      </View>
      <Text style={{ fontSize: 15, lineHeight: 22, color: tk.ink }}>{dock.expiredBody}</Text>
      <Pressable
        onPress={() => onDock("rekindle")}
        accessibilityRole="button"
        style={({ pressed }) => ({ marginTop: 4, backgroundColor: tk.ink, borderRadius: 14, paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: tk.bg }}>{dock.expiredButton}</Text>
      </Pressable>
    </InkPanel>
  );
}
