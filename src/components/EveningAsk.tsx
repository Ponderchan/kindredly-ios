import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useLetterFamily, useTheme } from "../lib/theme";
import { WrenBird } from "./WrenBird";
import type { EveningShow } from "../screens/notes/notes-model";

/* ONE QUESTION, ONCE, AFTER THE FIRST PAGE (owner decision 4, 2026-10-10).
   ────────────────────────────────────────────────────────────────────────
   Everything about recording is off until the person turns it on, and
   Settings is a long way from the moment it would make sense. So after the
   first sealed page — the only moment the offer is about something they
   just did — a small card in Notes asks once whether she may leave a small
   question each evening. Either answer is the last time it's asked.
   Settings has no switch for it any more (owner, 2026-10-13: two switches,
   the knock and Notifications), so a yes leaves a slim row here, in Notes,
   to turn it off again; a no leaves nothing. Nothing about the page itself
   is read or sent.

   10a step 5: the decision and the answers moved into a hook both Notes
   renderers share (screens/notes/useEveningAsk); this draws its state for
   the React Native fallback, as the Swift card (KNotesExtras) does for the
   SwiftUI screen. The off row also shows on an empty Notes: it is the
   evening line's only off switch.

   The card is a flat panel (owner's rule B, 2026-10-26: a lav2 fill,
   corners 22, no outline, no shadow), the question — Wren speaking — in
   the reader's Letter font's italic, NO THANKS a System button, YES the ind
   capsule with its words in the page colour.
   Disabled at .6 while an answer saves. */

export type EveningAskStrings = { ask: string; yes: string; no: string; foot: string; onLine: string; turnOff: string };

export function EveningAsk({
  state,
  busy,
  strings,
  onYes,
  onNo,
  onOff,
}: {
  state: EveningShow;
  busy: boolean;
  strings: EveningAskStrings;
  onYes: () => void;
  onNo: () => void;
  onOff: () => void;
}) {
  const { t: tk } = useTheme();
  // her line: Wren speaking, so the reader's Letter font, italic where the face has one
  const italic = useLetterFamily(true);

  if (state === "on") {
    return (
      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingVertical: 8, marginBottom: 8 }}>
        <WrenBird size={18} mood="content" />
        <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: tk.sub }}>{strings.onLine}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onOff}
          disabled={busy}
          hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed || busy ? 0.5 : 1 })}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: tk.ind }}>{strings.turnOff}</Text>
        </Pressable>
      </Animated.View>
    );
  }
  if (state !== "ask") return null;

  return (
    <Animated.View
      entering={FadeIn.duration(420)}
      exiting={FadeOut.duration(200)}
      style={{ backgroundColor: tk.lav2, borderRadius: 22, padding: 16, marginTop: 4, marginBottom: 14, opacity: busy ? 0.6 : 1 }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <WrenBird size={26} mood="content" />
        <Text style={[{ flex: 1, fontSize: 15, lineHeight: 22, color: tk.ink }, italic]}>{strings.ask}</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
        <Pressable accessibilityRole="button" onPress={onNo} disabled={busy} hitSlop={6} style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: tk.sub }}>{strings.no}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onYes} disabled={busy} style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: tk.ind, opacity: pressed ? 0.75 : 1 })}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: tk.bg }}>{strings.yes}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, lineHeight: 16.8, color: tk.mute, marginTop: 10 }}>{strings.foot}</Text>
    </Animated.View>
  );
}
