import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { PF } from "../../theme/post";
import { t } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { penPointCount } from "../../lib/pen-signature";
import type { PenSignature as Signed } from "../../lib/db";
import { PenSignature } from "../../components/PenSignature";
import { AvatarImage } from "../../components/AvatarImage";
import { SignSheetView } from "../../screens/chat/SignSheet";
import "../../data/strings-identity2";

/* dev only — THE SIGNING SHEET ON ITS OWN (identity Phase 2, PHASE2.md §6.5).
   kindredly:///dev/sign-sheet

   The sheet (screens/chat/SignSheet's SignSheetView) from plain facts, with
   no thread, no network and no account write: SIGN AND SEND hands what
   would be sent to this page, which draws it underneath — the face, the
   name and the drawing exactly as sign_thread would get them (PEN v1, after
   penFromPad), or the typed name — so the pad's output can be checked.

     PEN        FIRST (no pen name yet: an empty field, the first trade's
                note) or LATER (pre-filled "Rowan", editable)
     THEIRS     they signed first (the lead line that says yours opens theirs)
     GUEST      the guest line and Link an account (opens the real sign-in
                sheet: only look, never sign in from here)
     FAIL       the send fails: the sheet must stay exactly as drawn
     THEME      Classic, Midnight, Lavender, Paper (and off)

   The words are the app's own (t()); the only English typed here is this
   page's chips. The real flow, on demo threads, is /dev/step5-chat and
   /dev/step5-chat-rn with NAMES on. */

export default function SignSheetDev() {
  if (!__DEV__) return <Redirect href="/" />;
  return <SignSheetLab />;
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

function SignSheetLab() {
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [later, setLater] = useState(false);
  const [theirs, setTheirs] = useState(false);
  const [guest, setGuest] = useState(false);
  const [fail, setFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Signed | null>(null);
  const [handle, setHandle] = useState("Rowan");

  const keys = THEME_KEYS as ThemeKey[];
  const themeIndex = forced ? keys.indexOf(forced) : -1;
  const nextTheme = () => setDevThemeOverride(themeIndex + 1 < keys.length ? keys[themeIndex + 1] : null);

  const onSubmit = async (s: Signed) => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    setBusy(false);
    if (fail) {
      Alert.alert(t("ch.name.fail.title"), t("ch.name.fail.body"));
      return "kept" as const;
    }
    setSent(s);
    setHandle(s.name);
    setOpen(false);
    return "signed" as const;
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: tk.ind }}>IDENTITY 2 · SIGN SHEET</Text>
          <Chip label="BACK" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6 }}>
          <Chip label={`THEME ${forced ? THEMES[key].name.toUpperCase() : "OFF"}`} onPress={nextTheme} />
          <Chip label={later ? "PEN LATER" : "PEN FIRST"} on={later} onPress={() => setLater((v) => !v)} />
          <Chip label="THEIRS" on={theirs} onPress={() => setTheirs((v) => !v)} />
          <Chip label="GUEST" on={guest} onPress={() => setGuest((v) => !v)} />
          <Chip label="FAIL" on={fail} onPress={() => setFail((v) => !v)} />
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => ({ backgroundColor: tk.ind, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: tk.bg }}>OPEN THE SHEET</Text>
        </Pressable>
        {sent ? (
          <View style={{ gap: 10, backgroundColor: tk.soft, borderRadius: 16, padding: 14 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: tk.mute }}>
              SENT · {sent.sig ? `DRAWN · ${sent.sig.s.length} STROKES · ${penPointCount(sent.sig)} POINTS` : "TYPED"} · FACE {sent.face ?? "NONE"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <AvatarImage id={sent.face} seed={auth.user?.id || "me"} size={44} />
              <Text style={{ fontSize: 17, fontWeight: "600", color: tk.ink }}>{sent.name}</Text>
            </View>
            <View style={{ backgroundColor: tk.sf, borderRadius: 12 }}>
              <PenSignature sig={sent.sig} name={sent.name} width={300} fit="box" baseline />
            </View>
          </View>
        ) : null}
      </ScrollView>
      <SignSheetView
        open={open}
        busy={busy}
        courier="Sunday Kite"
        theirSigned={theirs}
        handle={later ? handle : ""}
        isGuest={guest}
        myUid={auth.user?.id ?? "dev-me"}
        profileFace={auth.profile?.avatarId ?? null}
        profilePronoun={auth.profile?.pronoun}
        onClose={() => !busy && setOpen(false)}
        onSubmit={onSubmit}
      />
    </SafeAreaView>
  );
}
