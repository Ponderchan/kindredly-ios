import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { PF } from "../../theme/post";
import { LettersNative, RoomNative } from "../../screens/chat/ConversationNative";
import { RoomRN } from "../../screens/chat/RoomRN";
import { LettersRN } from "../../screens/chat/LettersRN";

/* dev only — THE CONVERSATION KIT ON DEMO FIXTURES (10a step 5, slice chat-kit).
   kindredly:///dev/step5-chat

   The SwiftUI room and pen-pal chat (ConversationNative → KConversationView)
   on the demo threads in data/demo, with no network and no account (demo-*
   ids never reach the database; useThreadDetail reads the fixtures, every
   write lands in local state), so every state can be screenshotted:

     ROOM     demo-juno       every line kind: quotes, taken back (both
                              sides, and a quote of one), songs, a moment,
                              folds sealed / waiting / open
              demo-mira       the room's own folds and its song and photo
                              extras (store mode: its five lines translated)
              demo-long       300 lines: the render window, paging near the
                              top, the quote jump outside the window
              demo-voice      a voice opening with replies (known bug 2): the
                              disc plays and stays pressable after a failed
                              load; the caption's long press is copy / keep
              demo-closing    the closing line (?closing=1)
              demo-expired    the REKINDLE door (?expired=1)
              demo-juno       expired: every kind in a room nothing can be
                              left in — no Reply in any menu, a sealed fold
                              with no ANSWER TO OPEN, no reply quote
              demo-gone-kindred  a kindred whose account is gone
     LETTERS  demo-north      you went first (5 and 5)
              demo-blackberry they went first, in gold
              demo-band-*     the band's three states
              demo-voice      the voice opening as a letter block: the
                              caption opens the reader, its long press is
                              the letter's menu
              demo-gone-penpal  a gone pen pal: the veil, ACCOUNT CLOSED
              demo-quiet      a short correspondence

   In letters, a short letter's block hugs its words, and a long press
   lifts the block itself, never the 86% around it.

   THEME cycles the dev theme override through Classic, Midnight, Lavender
   and Paper (and off); RN shows the React Native fallback on the same
   fixture, for a side-by-side. The words are the app's own (t()); the only
   English typed here is this page's chips. A binary built before
   KConversationView says so and shows the fallback. */

type Fixture = { id: string; variant: "room" | "letters"; label: string; expired?: string; closing?: string };

const FIXTURES: Fixture[] = [
  { id: "demo-juno", variant: "room", label: "ROOM · EVERY KIND" },
  { id: "demo-mira", variant: "room", label: "ROOM · FOLDS" },
  { id: "demo-long", variant: "room", label: "ROOM · 300" },
  { id: "demo-voice", variant: "room", label: "ROOM · VOICE" },
  { id: "demo-closing", variant: "room", label: "ROOM · CLOSING", closing: "1" },
  { id: "demo-expired", variant: "room", label: "ROOM · EXPIRED", expired: "1" },
  { id: "demo-juno", variant: "room", label: "ROOM · CLOSED, EVERY KIND", expired: "1" },
  { id: "demo-gone-kindred", variant: "room", label: "ROOM · GONE" },
  { id: "demo-north", variant: "letters", label: "LETTERS · YOU FIRST" },
  { id: "demo-blackberry", variant: "letters", label: "LETTERS · THEY FIRST" },
  { id: "demo-band-youdone", variant: "letters", label: "BAND · YOU DONE" },
  { id: "demo-band-theydone", variant: "letters", label: "BAND · THEY DONE" },
  { id: "demo-band-names", variant: "letters", label: "BAND · NAMES" },
  { id: "demo-voice", variant: "letters", label: "LETTERS · VOICE" },
  { id: "demo-gone-penpal", variant: "letters", label: "LETTERS · GONE" },
  { id: "demo-quiet", variant: "letters", label: "LETTERS · QUIET" },
];

export default function Step5Chat() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ChatLab />;
}

function Chip({ label, on = false, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={4}
      style={({ pressed }) => ({
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: tk.ln,
        backgroundColor: on ? tk.ink : tk.sf,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: on ? tk.sf : tk.ink }}>{label}</Text>
    </Pressable>
  );
}

function ChatLab() {
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const available = isKindredlyUIViewAvailable("KConversationView");
  const [index, setIndex] = useState(0);
  const [rn, setRn] = useState(!available);
  const fx = FIXTURES[index];

  const keys = THEME_KEYS as ThemeKey[];
  const themeIndex = forced ? keys.indexOf(forced) : -1;
  const nextTheme = () => setDevThemeOverride(themeIndex + 1 < keys.length ? keys[themeIndex + 1] : null);
  // remount per fixture and renderer, so each opens fresh (and at its newest line)
  const screenKey = `${index}:${fx.variant}:${fx.id}:${rn ? "rn" : "swift"}`;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: tk.ind }}>STEP 5 · CHAT KIT</Text>
          <Chip label="BACK" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6 }}>
          <Chip label={`THEME ${forced ? THEMES[key].name.toUpperCase() : "OFF"}`} onPress={nextTheme} />
          <Chip label={rn ? "RN" : "SWIFT"} on={rn} onPress={() => available && setRn((v) => !v)} />
          {FIXTURES.map((f, i) => (
            <Chip key={`${i}:${f.variant}:${f.id}`} label={f.label} on={i === index} onPress={() => setIndex(i)} />
          ))}
        </ScrollView>
        {!available ? (
          <Text style={{ fontFamily: PF.monoMed, fontSize: 10, lineHeight: 14, color: tk.sub }}>
            THIS BUILD HAS NO KCONVERSATIONVIEW: POD INSTALL (OR PREBUILD WITHOUT --CLEAN), REBUILD THE DEV CLIENT. SHOWING REACT NATIVE.
          </Text>
        ) : null}
      </View>
      <View key={screenKey} style={{ flex: 1 }}>
        {fx.variant === "room" ? (
          rn ? (
            <RoomRN id={fx.id} expired={fx.expired} closing={fx.closing} topInset={0} />
          ) : (
            <RoomNative id={fx.id} expiredParam={fx.expired} closingParam={fx.closing} topInset={0} />
          )
        ) : rn ? (
          <LettersRN id={fx.id} topInset={0} />
        ) : (
          <LettersNative id={fx.id} topInset={0} />
        )}
      </View>
    </SafeAreaView>
  );
}
