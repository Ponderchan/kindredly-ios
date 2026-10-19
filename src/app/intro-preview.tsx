import { useMemo, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Introduction } from "../components/Introduction";
import { useWrenName } from "../lib/wren-name";
import { useAuth } from "../lib/auth";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../lib/theme";
import { THEME_KEYS, type ThemeKey } from "../theme/themes";
import { PF } from "../theme/post";
import { getLang, t, useLang } from "../lib/i18n";
import { frostSpec } from "../lib/frost";
import { strangerName } from "../lib/stranger-name";
import type { SignedPair, SignedSide } from "../lib/signed-sides";
import { DEMO_PEN_ME, DEMO_PEN_MIRA } from "../data/demo";
import type { ThreadMessage } from "../lib/db";

/* dev only — the introduction ritual, with a made-up road, so it can be
   watched without waiting for two real signatures.
     kindredly:///intro-preview                     the signed ritual, both drawn
     kindredly:///intro-preview?case=typed&rm=1     one case, Reduce Motion forced on

   CASES (identity Phase 2, the switch's ritual; nothing here reads the
   switch, so it shows whatever the switch would): DRAWN both signatures
   drawn (DEMO_PEN_MIRA / DEMO_PEN_ME, the demo kindred's), TYPED theirs
   drawn and yours typed in the italic, NO FACE theirs sent no face (the
   glyph) and signed in type, CJK a pen name typed in Japanese (upright,
   not slanted), and MOSAIC today's ritual (the switch off). MOTION
   follows the system, or forces Reduce Motion on (the cross-fade, done by
   1600) or off. THEME cycles the dev theme override (Midnight included).
   The thread is "demo-preview": touch and hold their signature at the end
   and Report / Block answer as they would, with nothing sent
   (SignatureHold's demo flow). PLAY runs it again. */

type Case = "drawn" | "typed" | "noface" | "cjk" | "mosaic";
const CASES: { key: Case; label: string }[] = [
  { key: "drawn", label: "DRAWN" },
  { key: "typed", label: "TYPED" },
  { key: "noface", label: "NO FACE" },
  { key: "cjk", label: "CJK" },
  { key: "mosaic", label: "MOSAIC" },
];
type Motion = "system" | "still" | "moving";
const OTHER = "preview-other-3360";
/* the made-up road: five each way, one array for the page's life (the ritual counts its letters) */
const day = (d: number, mine: boolean): ThreadMessage => ({ body: "…", mine, date: `2026-08-${String(d).padStart(2, "0")}T10:00:00Z`, kind: "text" }) as ThreadMessage;
const ROAD = [day(2, true), day(4, false), day(6, true), day(9, false), day(11, true), day(12, false), day(15, true), day(18, false), day(20, true), day(24, false)];

export default function IntroPreview() {
  const router = useRouter();
  const wren = useWrenName();
  const auth = useAuth();
  useLang();
  const { t: tk, dark } = useTheme();
  const forced = useDevThemeOverride();
  const params = useLocalSearchParams<{ case?: string; rm?: string }>();
  const [which, setWhich] = useState<Case>(() => (CASES.some((c) => c.key === params.case) ? (params.case as Case) : "drawn"));
  const [motion, setMotion] = useState<Motion>(params.rm === "1" ? "still" : params.rm === "0" ? "moving" : "system");
  const [open, setOpen] = useState(true);
  const [run, setRun] = useState(0);

  const myUid = auth.user?.id || "preview-me-0417";
  const signed = useMemo<SignedPair | null>(() => {
    if (which === "mosaic") return null;
    const lang = getLang();
    const side = (uid: string, s: Partial<SignedSide>): SignedSide => ({
      courier: strangerName(uid, { lang, unsigned: t("ld.unsigned") }),
      name: "",
      sig: null,
      face: null,
      frost: frostSpec(uid, dark),
      seed: uid,
      ...s,
    });
    const theirs =
      which === "noface"
        ? side(OTHER, { name: "Marlow", sig: null, face: null })
        : which === "cjk"
          ? side(OTHER, { name: "雨宮しずく", sig: null, face: "f-02-tender-thinker" })
          : side(OTHER, { name: "Mira", sig: DEMO_PEN_MIRA, face: "f-14-hidden-poet" });
    const mine = side(myUid, { name: auth.handle || "Rowan", sig: which === "typed" ? null : DEMO_PEN_ME, face: "m-05-midnight-thinker" });
    return { theirs, mine };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [which, dark, myUid, auth.handle, getLang()]);

  if (!__DEV__) return <Redirect href="/" />;
  const keys = THEME_KEYS as ThemeKey[];
  const themeIndex = forced ? keys.indexOf(forced) : -1;
  const play = () => {
    setRun((n) => n + 1);
    setOpen(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: tk.ind }}>INTRO PREVIEW</Text>
          <Chip label="BACK" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
        </View>
        <Row label="CASE">
          {CASES.map((c) => (
            <Chip key={c.key} label={c.label} on={which === c.key} onPress={() => setWhich(c.key)} />
          ))}
        </Row>
        <Row label="MOTION">
          <Chip label="SYSTEM" on={motion === "system"} onPress={() => setMotion("system")} />
          <Chip label="REDUCED" on={motion === "still"} onPress={() => setMotion("still")} />
          <Chip label="MOVING" on={motion === "moving"} onPress={() => setMotion("moving")} />
        </Row>
        <Row label="THEME">
          <Chip label={forced ? forced.toUpperCase() : "APP"} on={!!forced} onPress={() => setDevThemeOverride(themeIndex + 1 < keys.length ? keys[themeIndex + 1] : null)} />
        </Row>
        <Pressable onPress={play} accessibilityRole="button" style={({ pressed }) => ({ backgroundColor: tk.ind, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.85 : 1 })}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: tk.bg }}>PLAY</Text>
        </Pressable>
      </ScrollView>

      <Introduction
        key={`${run}:${which}:${motion}`}
        open={open}
        wren={wren}
        otherSeed={OTHER}
        otherFace={signed ? signed.theirs.face : "f-02-tender-thinker"}
        otherName={signed ? signed.theirs.name : "Marlow"}
        otherArchetype="The Quiet Observer"
        myName={auth.handle || "fern"}
        road={ROAD}
        mySeed={myUid}
        myFace={(auth.profile?.avatarId as string) || null}
        notice={{ stickerId: "straight_shooter", shared: true, supporting: 4, eligible: 5 }}
        since="2026-09-18T10:00:00Z"
        stamp="cant-sleep"
        signed={signed}
        report={{ threadId: "demo-preview", targetUser: OTHER, onBlocked: () => setOpen(false) }}
        reducedMotion={motion === "system" ? undefined : motion === "still"}
        onClose={() => setOpen(false)}
        onTalk={() => setOpen(false)}
      />
    </SafeAreaView>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const { t: tk } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.2, color: tk.mute }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{children}</View>
    </View>
  );
}

function Chip({ label, on = false, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={4}
      style={({ pressed }) => ({ paddingVertical: 7, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: tk.ln, backgroundColor: on ? tk.ink : tk.sf, opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: on ? tk.sf : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
