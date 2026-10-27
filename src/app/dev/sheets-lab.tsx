import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LeaveSheet, type LeaveAction } from "../../components/LeaveSheet";
import { ReportSheet } from "../../components/ReportMenu";
import { SignUpSheet } from "../../components/SignUpSheet";
import { Toast } from "../../components/ui";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { devSurfaceOverride, setDevSurfaceOverride, useNativeSurface } from "../../lib/surfaces";
import { LANGS, getLang, setLang, t } from "../../lib/i18n";
import type { ReportFlow, ReportStage } from "../../lib/report-flow";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { PFM } from "../../theme/post";

/* dev only — THE SHARED SHEETS, SWIFT AND REACT NATIVE SIDE BY SIDE (2026-10-27).
   kindredly:///dev/sheets-lab

   The four pieces every screen shares, each from plain facts, on any account (a guest too):

     LEAVE        the composer's leave sheet (save as draft, discard, keep writing), in its
                  screen; LEAVE · MODAL the same in its window-level Modal
     LANGUAGES    Settings' language list (flags in their column, the current one filled,
                  each name in its own voice); picking one changes the app's language, as there
     DELETE       Settings' delete confirm; the red key turns "…" while busy (BUSY chip)
     ONE KEY      Today's "five letters in flight": one key, no cancel row
     REPORT       the report / block card on a PRETEND flow: nothing is sent, nobody is
                  blocked. Report answers after a moment ("Reported" or, with FAIL on, "it
                  didn't go through"); Block asks the block question, then fails or closes
     SIGN UP      the guest's sign-up sheet. It is the real one: look, but don't sign in from
                  here (the keys run the real Apple / email sign-in)
     TOAST        "Reply sent." for 2.2s, where Today puts it

   SWITCHES: each piece's switch, forced Swift / React Native / back to the default for this run
   (lib/surfaces setDevSurfaceOverride, the same as ui-lab's chips). A sheet decides as it
   opens, so flip the switch, then open it. THEME forces a theme on the whole app. The words are
   the app's own (t()); only this page's chips are typed here in English. */

const KEYS = ["leavesheet", "reportsheet", "signupsheet", "toast"] as const;

export default function SheetsLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

function Lab() {
  const { t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const [sheet, setSheet] = useState<null | "leave" | "leaveModal" | "langs" | "delete" | "oneKey" | "signup">(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const [toast, setToast] = useState(false);
  const close = useCallback(() => setSheet(null), []);
  const flow = usePretendFlow(fail);

  const leave: LeaveAction[] = [
    { label: t("cp.leave.draft"), kind: "primary", onPress: close },
    { label: t("cp.leave.discard"), kind: "destructive", onPress: close },
  ];
  const langs: LeaveAction[] = LANGS.map((l) => ({
    label: l.label,
    lead: l.flag,
    kind: l.id === getLang() ? "primary" : "quiet",
    selected: l.id === getLang(),
    accessibilityLabel: l.label,
    accessibilityLanguage: l.id === "pt" ? "pt-BR" : l.id,
    onPress: () => {
      void setLang(l.id);
      close();
    },
  }));

  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 200 }}>
          <Label>SHEETS LAB</Label>

          <Label>SWITCHES</Label>
          {KEYS.map((k) => (
            <SwitchRow key={k} surface={k} />
          ))}

          <Label>THEME · {forced ?? "NORMAL"}</Label>
          <Row>
            {THEME_KEYS.map((k: ThemeKey) => (
              <Chip key={k} label={THEMES[k].name} on={forced === k} onPress={() => setDevThemeOverride(k)} />
            ))}
            <Chip label="Off" on={forced === null} onPress={() => setDevThemeOverride(null)} />
          </Row>

          <Label>OPEN</Label>
          <Row>
            <Chip label="LEAVE" onPress={() => setSheet("leave")} />
            <Chip label="LEAVE · MODAL" onPress={() => setSheet("leaveModal")} />
            <Chip label="LANGUAGES" onPress={() => setSheet("langs")} />
            <Chip label="DELETE" onPress={() => setSheet("delete")} />
            <Chip label="ONE KEY" onPress={() => setSheet("oneKey")} />
            <Chip label="REPORT" onPress={flow.openMenu} />
            <Chip label="SIGN UP" onPress={() => setSheet("signup")} />
            <Chip label="TOAST" onPress={showToast} />
          </Row>

          <Label>STATES</Label>
          <Row>
            <Chip label={`BUSY ${busy ? "ON" : "OFF"}`} on={busy} onPress={() => setBusy((b) => !b)} />
            <Chip label={`FAIL ${fail ? "ON" : "OFF"}`} on={fail} onPress={() => setFail((f) => !f)} />
          </Row>
        </ScrollView>
      </SafeAreaView>

      <LeaveSheet open={sheet === "leave"} title={t("cp.leave.title")} body={t("cp.leave.body")} actions={leave} onCancel={close} />
      <LeaveSheet modal open={sheet === "leaveModal"} title={t("cp.leave.title")} body={t("cp.leave.body")} actions={leave} onCancel={close} />
      <LeaveSheet
        modal
        open={sheet === "langs"}
        title={t("settings.language")}
        body={t("set.langBody", { n: LANGS.length })}
        actions={langs}
        cancelLabel={t("set.neverMind")}
        onCancel={close}
      />
      <LeaveSheet
        modal
        open={sheet === "delete"}
        title={t("set.delTitle")}
        body={t("set.delBody", { wren: "Wren" })}
        actions={[{ label: t("set.delConfirm"), busy, kind: "destructive", onPress: () => setBusy(true) }]}
        cancelLabel={t("set.delKeep")}
        onCancel={close}
      />
      <LeaveSheet
        modal
        open={sheet === "oneKey"}
        title={t("ld.flightFull.title")}
        body={t("ld.flightFull.body")}
        actions={[{ label: t("ld.flightFull.ok"), kind: "primary", onPress: close }]}
        cancelLabel={null}
        onCancel={close}
      />
      <SignUpSheet modal open={sheet === "signup"} reason={t("ld.signup.reason")} onClose={close} onSignedIn={close} />
      <ReportSheet flow={flow} />
      {toast ? <Toast msg={t("ld.toast.thread")} bottom={120} /> : null}
    </View>
  );
}

/* A report flow that sends nothing: the stages and the busy flag, as lib/report-flow moves them. */
function usePretendFlow(fail: boolean): ReportFlow {
  const [stage, setStage] = useState<ReportStage>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const failRef = useRef(fail);
  failRef.current = fail;
  const work = useCallback(async (then: () => void) => {
    busyRef.current = true;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    busyRef.current = false;
    setBusy(false);
    then();
  }, []);
  return useMemo<ReportFlow>(
    () => ({
      stage,
      busy,
      nobody: false,
      openMenu: () => setStage("menu"),
      report: async () => {
        if (busyRef.current) return false;
        let ok = false;
        await work(() => {
          ok = !failRef.current;
          setStage(ok ? "sent" : "failed");
        });
        return ok;
      },
      askBlock: () => {
        if (!busyRef.current) setStage("block");
      },
      block: async () => {
        if (busyRef.current) return false;
        let ok = false;
        await work(() => {
          ok = !failRef.current;
          setStage(ok ? null : "blockFailed");
        });
        return ok;
      },
      close: () => {
        if (!busyRef.current) setStage(null);
      },
    }),
    [stage, busy, work],
  );
}

function SwitchRow({ surface }: { surface: string }) {
  const on = useNativeSurface(surface);
  const forced = devSurfaceOverride(surface);
  return (
    <Row>
      <Text style={{ ...PFM.monoSemi, fontSize: 11, width: 96, color: on ? "#2E7D4F" : "#8A86A3" }}>
        {surface}
        {on ? " ✓" : ""}
      </Text>
      <Chip label="SWIFT" on={forced === true} onPress={() => setDevSurfaceOverride(surface, true)} />
      <Chip label="RN" on={forced === false} onPress={() => setDevSurfaceOverride(surface, false)} />
      <Chip label="DEFAULT" on={forced === null} onPress={() => setDevSurfaceOverride(surface, null)} />
    </Row>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  const { t: tk } = useTheme();
  return <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.4, color: tk.mute }}>{children}</Text>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>{children}</View>;
}

function Chip({ label, on = false, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: on ? tk.ind : tk.soft, opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={{ ...PFM.monoSemi, fontSize: 11, color: on ? tk.bg : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
