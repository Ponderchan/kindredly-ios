import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { PF } from "../../theme/post";
import { RoomRN } from "../../screens/chat/RoomRN";
import { LettersRN } from "../../screens/chat/LettersRN";
import { ReaderScreen } from "../../screens/chat/ReaderScreen";
import { KindredPage } from "../../screens/chat/KindredPage";
import { setDevIdentityPreview, useIdentityOn } from "../../lib/identity";

/* dev only — THE CHAT GROUP IN REACT NATIVE ON DEMO FIXTURES (10a step 5, slice chat-rn).
   kindredly:///dev/step5-chat-rn

   Everything this slice draws, on the demo threads in data/demo, with no
   network and no account (demo-* ids never reach the database:
   useThreadDetail reads the fixtures, every write lands in local state),
   so each state can be screenshotted in all four themes:

     ROOM     the React Native room (the remote switch's fallback): every
              line kind (demo-juno), folds and songs (demo-mira), 300 lines
              and the render window (demo-long), the voice opening on the
              one player (demo-voice), closing / expired (?closing / ?expired),
              a gone kindred (readable, not actionable)
     LETTERS  the React Native pen-pal chat: the sign door (you first, they
              first in gold), the band's states, a voice opening, a gone pen
              pal (the veil, ACCOUNT CLOSED, no band, no composer)
     READER   the one-letter reader: a voice opening as the hero and as an
              earlier letter (known bug 2), a reply as the hero, an opening
              with no date (known bug 3: no AUG 11), a gone pen pal (known
              bug 4: UNSIGNED, the veil, ch.gone), a kindred, a telegram
     KINDRED  a kindred's page: revealed (round face, resonance), a voice you
              know (mosaic, archetype), a gone kindred (the veil, no TALK
              TO), a voice opening

   THEME cycles the dev theme override through Classic, Midnight, Lavender
   and Paper (and off). NAMES previews the identity switch on for this run
   of the app, never saved (lib/identity setDevIdentityPreview): a pen
   pal's courier name, frosted window and made-up ♀/♂ and star sign in the
   chat header, the reader's head and the reply strip, the frost on a
   voice-you-know page, and the arrival mosaic gone from a kindred's. DESK → opens Wren's desk itself (kindredly:///room/
   wren) under the same override: it reads her live posts as the app does
   (demo posts when the read fails), so it isn't embedded here. The words
   are the app's own (t()); the only English typed here is this page's
   chips. */

type Fixture =
  | { kind: "room"; id: string; label: string; expired?: string; closing?: string }
  | { kind: "letters"; id: string; label: string }
  | { kind: "reader"; id: string; label: string; m?: string }
  | { kind: "kindred"; id: string; label: string };

const FIXTURES: Fixture[] = [
  { kind: "room", id: "demo-juno", label: "ROOM · EVERY KIND" },
  { kind: "room", id: "demo-mira", label: "ROOM · FOLDS" },
  { kind: "room", id: "demo-long", label: "ROOM · 300" },
  { kind: "room", id: "demo-voice", label: "ROOM · VOICE" },
  { kind: "room", id: "demo-closing", label: "ROOM · CLOSING", closing: "1" },
  { kind: "room", id: "demo-expired", label: "ROOM · EXPIRED", expired: "1" },
  { kind: "room", id: "demo-gone-kindred", label: "ROOM · GONE" },
  { kind: "letters", id: "demo-north", label: "LETTERS · YOU FIRST" },
  { kind: "letters", id: "demo-blackberry", label: "LETTERS · THEY FIRST" },
  { kind: "letters", id: "demo-band-youdone", label: "BAND · YOU DONE" },
  { kind: "letters", id: "demo-band-theydone", label: "BAND · THEY DONE" },
  { kind: "letters", id: "demo-voice", label: "LETTERS · VOICE" },
  { kind: "letters", id: "demo-gone-penpal", label: "LETTERS · GONE" },
  { kind: "reader", id: "demo-voice", label: "READER · VOICE HERO", m: "opening" },
  { kind: "reader", id: "demo-voice", label: "READER · VOICE EARLIER", m: "demo-voice-2" },
  { kind: "reader", id: "demo-gone-penpal", label: "READER · GONE", m: "opening" },
  { kind: "reader", id: "demo-mira", label: "READER · KINDRED" },
  { kind: "reader", id: "demo-quiet", label: "READER · TELEGRAM" },
  { kind: "reader", id: "demo-long", label: "READER · LONG THREAD" },
  { kind: "kindred", id: "demo-mira", label: "KINDRED · REVEALED" },
  { kind: "kindred", id: "demo-north", label: "KINDRED · A VOICE" },
  { kind: "kindred", id: "demo-gone-kindred", label: "KINDRED · GONE" },
  { kind: "kindred", id: "demo-voice", label: "KINDRED · VOICE OPENING" },
];

export default function Step5ChatRN() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ChatRNLab />;
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

function ChatRNLab() {
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const [index, setIndex] = useState(0);
  const fx = FIXTURES[index];
  // NAMES: the identity switch previewed on for this run (never saved)
  const names = useIdentityOn();

  const keys = THEME_KEYS as ThemeKey[];
  const themeIndex = forced ? keys.indexOf(forced) : -1;
  const nextTheme = () => setDevThemeOverride(themeIndex + 1 < keys.length ? keys[themeIndex + 1] : null);
  // remount per fixture, so each opens fresh (and at its newest line)
  const screenKey = `${index}:${fx.kind}:${fx.id}`;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: tk.ind }}>STEP 5 · CHAT RN</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Chip label="DESK →" onPress={() => router.push("/room/wren")} />
            <Chip label="BACK" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6 }}>
          <Chip label={`THEME ${forced ? THEMES[key].name.toUpperCase() : "OFF"}`} onPress={nextTheme} />
          <Chip label="NAMES" on={names} onPress={() => setDevIdentityPreview(!names)} />
          {FIXTURES.map((f, i) => (
            <Chip key={`${i}:${f.kind}:${f.id}`} label={f.label} on={i === index} onPress={() => setIndex(i)} />
          ))}
        </ScrollView>
      </View>
      <View key={screenKey} style={{ flex: 1 }}>
        {fx.kind === "room" ? (
          <RoomRN id={fx.id} expired={fx.expired} closing={fx.closing} topInset={0} />
        ) : fx.kind === "letters" ? (
          <LettersRN id={fx.id} topInset={0} />
        ) : fx.kind === "reader" ? (
          <ReaderScreen id={fx.id} m={fx.m} topInset={0} />
        ) : (
          <KindredPage id={fx.id} topInset={0} />
        )}
      </View>
    </SafeAreaView>
  );
}
