import { useEffect, useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { devLaunchHandoff, type LaunchMode } from "../../components/LaunchAnimation";
import { devIdentityPreview, setDevIdentityPreview } from "../../lib/identity";
import { isScreen, SCREENS, SCREEN_NO, SIDE_HOME, SIDE_NO, SIDES, type NotifState, type ScreenId, type SideId } from "../../screens/onboarding/flow";
import { clearDevNotes, devConfig, devNotes, devPayload, setDevConfig, setDevStart, type DevConfig, type DevVariant } from "../../screens/onboarding/dev";
import { clearBlock } from "../../screens/onboarding/device-block";
import { clearDraft } from "../../screens/onboarding/draft-store";

/* dev only — THE NEW ONBOARDING'S DEV ENTRY. kindredly:///dev/onboarding2

   Opens the new run (screens/onboarding) on demand, anywhere in it:
   · JUMP: any of the thirteen screens or the four side states (1a, 3x, 8a,
     11a), with the answers the earlier screens would have given filled in
     (a birthday, a pronoun, the sample letter, a hatch, "Otis"), so a screen
     can be looked at without walking in from the door;
   · FROM THE LAUNCH: screen 1 as the launch's next frame (full, short or
     still), so the hand-off can be replayed without a cold start;
   · RESUME: the run as it was left (the demo's own saved draft);
   · WHO IS HERE: the signed-in variants (a newcomer, a guest mid-run, a
     member who never finished — from 2, its known answers skipped and 11
     skipped — an onboarded member or guest → Today), what a 1a sign-in
     finds, whether 11's address is "already an account", what iOS says
     about notifications, and the under-18 block;
   · DEMO, ON BY DEFAULT: posting, every session, link and switch, and the
     notification prompt are stubbed (screens/onboarding/dev). Turning it
     off asks first: an off run on the simulator is a real run — a real
     anonymous user, a real letter in the pool. Never complete one.
   · THE OLD RUN: the identity switch's dev preview off, then the route, to
     check the old onboarding still opens exactly as it was.
   Every jump turns the identity preview ON for this run of the app (the
   route picks the new run by it). Nothing here is saved. After a demo run
   ends it comes back here (?done=1) with what finish() would have sent and
   the log of what was stubbed. */

const VARIANTS: { id: DevVariant; label: string }[] = [
  { id: "fresh", label: "newcomer (no session)" },
  { id: "guest-mid", label: "guest, mid-run" },
  { id: "member-new", label: "member, never finished (dob+she known)" },
  { id: "member-onboarded", label: "member, onboarded → Today" },
  { id: "guest-onboarded", label: "guest who finished here → Today" },
];
const NOTIFS: NotifState[] = ["ask", "granted", "settings"];

export default function DevOnboarding2() {
  const router = useRouter();
  const { done, jump } = useLocalSearchParams<{ done?: string; jump?: string }>();
  const [cfg, setCfg] = useState<DevConfig>(devConfig());
  const [preview, setPreview] = useState(devIdentityPreview());
  const [, bump] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;

  const patch = (p: Partial<DevConfig>) => setCfg(setDevConfig(p));
  /* a fresh onboarding route every time: with an onboarding already in the stack (the app opened
     on it, and this page was deep-linked over it) a plain push of "/onboarding" went BACK to that
     old run instead — its DEMO state, its draft, no hand-off — and left the jump unread for the
     next run. A throwaway `run` param makes it a new screen; the route reads only `step`. */
  const openRun = (step?: string) => router.push(`/onboarding?run=${Date.now()}${step ? `&step=${step}` : ""}` as Href);
  const go = (screen: ScreenId, side: SideId | null = null, seed = true) => {
    setDevIdentityPreview(true);
    setPreview(true);
    setDevStart({ screen, side, seed });
    openRun();
  };
  const fromLaunch = (mode: LaunchMode) => {
    devLaunchHandoff(mode);
    go("doorstep", null, false);
  };
  const resume = () => {
    setDevIdentityPreview(true);
    setPreview(true);
    setDevStart(null);
    openRun();
  };
  const toggleDemo = () => {
    if (cfg.demo) {
      Alert.alert(
        "Turn DEMO off?",
        "An off run is a REAL run: a real anonymous user on 3, real linking on 11, a real letter in the pool on 12, iOS's one-time prompt on 13. Never complete one on the simulator.",
        [
          { text: "Keep DEMO on", style: "cancel" },
          { text: "Turn off", style: "destructive", onPress: () => patch({ demo: false }) },
        ],
      );
    } else patch({ demo: true });
  };
  const oldRun = (step?: string) => {
    setDevIdentityPreview(false);
    setPreview(false);
    openRun(step);
  };

  /* ?jump=<screen> or ?jump=<side> (signin, underage, tray, code): the same as tapping its chip,
     for scripted screenshots at the large text sizes, where the chips are hard to find */
  useEffect(() => {
    if (!jump) return;
    if (isScreen(jump)) go(jump);
    else if ((SIDES as readonly string[]).includes(jump)) go(SIDE_HOME[jump as SideId], jump as SideId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump]);

  const payload = devPayload();
  const notes = devNotes();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F3FF" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#1E1B35" }}>New onboarding · dev</Text>
        <Text style={{ fontSize: 13, color: "#4A4664", marginTop: 4 }}>
          identity preview: {preview === null ? "following the table" : preview ? "ON" : "OFF"} · variant: {cfg.variant} · iOS: {cfg.notif}
        </Text>

        <Pressable onPress={toggleDemo} style={{ marginTop: 14, padding: 14, borderRadius: 12, backgroundColor: cfg.demo ? "#C3E84F" : "#D0342C", borderWidth: 2, borderColor: "#1E1B35" }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: cfg.demo ? "#1E1B35" : "#FFFFFF" }}>{cfg.demo ? "DEMO ON — nothing leaves the phone" : "DEMO OFF — REAL RUN: posts, accounts, prompts"}</Text>
          <Text style={{ fontSize: 12, color: cfg.demo ? "#1E1B35" : "#FFFFFF", marginTop: 2 }}>tap to {cfg.demo ? "turn off (asks first)" : "turn back on"}</Text>
        </Pressable>

        {done === "1" && (
          <Section title="LAST DEMO RUN">
            <Text selectable style={{ fontFamily: "IBMPlexMono-Regular", fontSize: 11, color: "#1E1B35" }}>
              {payload ? JSON.stringify(payload, null, 2) : "finish() was not reached"}
            </Text>
            {notes.map((n, i) => (
              <Text key={i} style={{ fontFamily: "IBMPlexMono-Regular", fontSize: 10.5, color: "#4A4664", marginTop: 2 }}>
                {n}
              </Text>
            ))}
            <Chip label="clear the log" onPress={() => { clearDevNotes(); bump((n) => n + 1); }} />
          </Section>
        )}

        <Section title="JUMP (answers before it filled in)">
          <Row>
            {SCREENS.map((s) => (
              <Chip key={s} label={`${SCREEN_NO[s]} ${s}`} onPress={() => go(s)} />
            ))}
          </Row>
          <Row>
            {SIDES.map((sd) => (
              <Chip key={sd} label={`${SIDE_NO[sd]} ${sd}`} onPress={() => go(SIDE_HOME[sd], sd)} />
            ))}
          </Row>
        </Section>

        <Section title="FROM THE LAUNCH (screen 1 with the hand-off)">
          <Row>
            {(["full", "short", "still"] as LaunchMode[]).map((m) => (
              <Chip key={m} label={m} onPress={() => fromLaunch(m)} />
            ))}
          </Row>
        </Section>

        <Section title="RESUME / START">
          <Row>
            <Chip label="resume the saved draft" onPress={resume} />
            <Chip label="clear the saved draft" onPress={() => void clearDraft(cfg.demo).then(() => Alert.alert("Cleared", cfg.demo ? "The demo draft is gone." : "The REAL draft is gone."))} />
          </Row>
        </Section>

        <Section title="WHO IS HERE (demo)">
          <Row>
            {VARIANTS.map((v) => (
              <Chip key={v.id} label={v.label} on={cfg.variant === v.id} onPress={() => patch({ variant: v.id })} />
            ))}
          </Row>
          <Text style={label}>1a signs in as</Text>
          <Row>
            <Chip label="an account that never finished" on={cfg.signInAs === "new"} onPress={() => patch({ signInAs: "new" })} />
            <Chip label="an onboarded account" on={cfg.signInAs === "onboarded"} onPress={() => patch({ signInAs: "onboarded" })} />
          </Row>
          <Text style={label}>11: the address</Text>
          <Row>
            <Chip label="is new (links)" on={!cfg.addressExists} onPress={() => patch({ addressExists: false })} />
            <Chip label="is already an account" on={cfg.addressExists} onPress={() => patch({ addressExists: true })} />
          </Row>
          <Text style={label}>iOS notifications</Text>
          <Row>
            {NOTIFS.map((n) => (
              <Chip key={n} label={n} on={cfg.notif === n} onPress={() => patch({ notif: n })} />
            ))}
          </Row>
          <Text style={label}>under 18</Text>
          <Row>
            <Chip label="blocked device (lands on 3x)" on={cfg.blocked} onPress={() => patch({ blocked: !cfg.blocked })} />
            <Chip label="clear the demo block" onPress={() => void clearBlock(true).then(() => patch({ blocked: false }))} />
            <Chip label="jump to 3 (set an under-18 date there)" onPress={() => go("birthday")} />
          </Row>
        </Section>

        <Section title="THE OLD RUN (identity preview off)">
          <Row>
            <Chip label="old onboarding" onPress={() => oldRun()} />
            <Chip label="old, at the egg (?step=egg)" onPress={() => oldRun("egg")} />
            <Chip label="follow the table again" onPress={() => { setDevIdentityPreview(null); setPreview(null); }} />
          </Row>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const label = { fontSize: 12, fontWeight: "700" as const, color: "#4A4664", marginTop: 10 };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontFamily: "IBMPlexMono-SemiBold", fontSize: 11, letterSpacing: 1.4, color: "#5B55FF" }}>{title}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}
function Row({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}
function Chip({ label: text, onPress, on = false }: { label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: "#1E1B35", backgroundColor: on ? "#1E1B35" : "#FFFFFF", opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: on ? "#C3E84F" : "#1E1B35" }}>{text}</Text>
    </Pressable>
  );
}
