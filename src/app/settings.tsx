import { useWrenName } from "../lib/wren-name";
import { openPrivacy, openTerms } from "../lib/legal";
import { useCallback, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF, panel } from "../theme/post";
import { useAuth } from "../lib/auth";
import { LeaveSheet } from "../components/LeaveSheet";
import { disableMorningKnock, enableMorningKnock, morningKnockEnabled } from "../lib/notify";
import Constants from "expo-constants";
import { useEntitlement } from "../lib/entitlement";
import { iapRestore } from "../lib/iap";
import { saveWrenName } from "../lib/wren-name";
import { LANGS, getLang, setLang, t, useLang } from "../lib/i18n";

/* WHERE A READER CAN REACH A PERSON. App Review 1.2 wants public contact
   for a UGC app, and a support address is the one thing in this file the
   product cannot infer — set it to a mailbox that is actually watched. */
const SUPPORT = "hello@kindredly.io";
const APP_VERSION = `${Constants.expoConfig?.version ?? "1.0.0"}${Constants.expoConfig?.ios?.buildNumber ? ` (${Constants.expoConfig.ios.buildNumber})` : ""}`;

/* Settings — everything that isn't the profile itself, behind Me's gear. */

export default function Settings() {
  const auth = useAuth();
  const { handle, profile } = auth;
  const router = useRouter();
  const wren = useWrenName();
  const [knock, setKnock] = useState(false);
  const { premium, cofounderNo } = useEntitlement();
  const [restoring, setRestoring] = useState(false);
  const lang = useLang();
  const [picking, setPicking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      morningKnockEnabled().then((on) => alive && setKnock(on));
      return () => {
        alive = false;
      };
    }, []),
  );

  const age = (() => {
    const dob = (profile?.dob as string) || "";
    const y = parseInt(dob.slice(0, 4), 10);
    if (!y) return null;
    const a = new Date().getFullYear() - y;
    /* the lowest band used to be the FALLBACK, so a bad date of birth —
       or any age under the gate — printed "18–24" and looked checked.
       Under 18 shows the real number instead of being laundered. */
    if (a < 18) return `${a}`;
    return a >= 45 ? "45+" : a >= 35 ? "35–44" : a >= 25 ? "25–34" : "18–24";
  })();

  const editName = () => {
    Alert.prompt?.(
      t("set.penPrompt.title"),
      t("set.penPrompt.body"),
      async (next?: string) => {
        const n = (next || "").trim();
        if (!n || n === handle) return;
        const r = await auth.saveProfile({ handle: n });
        if ("error" in r) Alert.alert(t("set.cantSave"), r.error);
      },
      "plain-text",
      handle,
    );
  };

  /* HER NAME COULD BE SET ONCE AND NEVER AGAIN. saveWrenName had exactly
     one caller — the naming step in onboarding — so a reader who typed
     something they regretted in their first five minutes was stuck with it
     for the life of the account. */
  const renameWren = () => {
    Alert.prompt?.(
      t("set.renameWren", { wren }),
      t("set.wrenPrompt.body"),
      async (next?: string) => {
        const n = (next || "").trim().slice(0, 18);
        if (!n || n === wren) return;
        await saveWrenName(n);
      },
      "plain-text",
      wren,
    );
  };

  /* the mail a support address actually needs: what they run, on what */
  const contact = () => {
    const body = `\n\n—\nKindredly ${APP_VERSION} · ${Platform.OS} ${Platform.Version}`;
    void Linking.openURL(`mailto:${SUPPORT}?subject=${encodeURIComponent("Kindredly")}&body=${encodeURIComponent(body)}`);
  };

  /* RATE GOES TO THE STORE'S OWN REVIEW PAGE. The in-app prompt
     (expo-store-review) answered "has action" and then did nothing: iOS
     rations that sheet on its own schedule and never shows it in
     TestFlight or a dev client, so the row read as broken. The app is on
     the App Store now — open its page with the review box already up. */
  const rate = () => {
    void Linking.openURL("https://apps.apple.com/app/id6805318131?action=write-review");
  };

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    const ok = await iapRestore();
    setRestoring(false);
    Alert.alert(ok ? t("set.restored") : t("set.nothingRestore"), ok ? t("set.restoredBody") : t("set.nothingRestoreBody"));
  };

  const onToggleKnock = async (want: boolean) => {
    if (want) {
      const ok = await enableMorningKnock();
      setKnock(ok);
      if (!ok) Alert.alert(t("set.knock.deniedTitle"), t("set.knock.deniedBody", { wren }));
    } else {
      await disableMorningKnock();
      setKnock(false);
    }
  };

  const onSignOut = async () => {
    await auth.signOut();
    router.replace("/onboarding");
  };

  /* Account deletion (5.1.1(v)) — a real, in-app, no-email-required exit.
     The confirm is a LeaveSheet, not an Alert: this is the one moment we
     have someone's full attention, and the body is where the product
     decision lives in reader-facing words — letters stay unsigned, kindreds
     keep what you wrote, the sealed journal stays on the phone. */
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    const r = await auth.deleteAccount();
    setDeleting(false);
    setAskDelete(false);
    if ("error" in r) {
      Alert.alert("Still here", r.error);
      return;
    }
    router.replace("/onboarding");
  };

  const Row = ({ label, value, onPress, last }: { label: string; value?: string; onPress?: () => void; last?: boolean }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 15,
        // no divider on the last row — the panel's own border is already there
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: P.ink12,
      }}
    >
      <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink }}>{label}</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 14, color: P.ink40 }}>{value ?? "›"}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>{t("settings.title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* account */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40, marginBottom: 10 }}>{t("settings.account")}</Text>
        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <Row label={t("set.penName")} value={handle || t("set.you")} onPress={editName} />
          {age && <Row label={t("set.age")} value={age} />}
          {/* the Language row sat here showing "English" and doing nothing —
              a dead row on a settings page reads as a broken app */}
          <Row
            label={t("settings.language")}
            value={LANGS.find((l) => l.id === lang)?.label ?? "English"} /* language names are endonyms — never translated */
            onPress={() => setPicking(true)}
          />
          <Row label={t("set.wrenName", { wren })} value={wren} onPress={renameWren} last />
        </View>

        {/* quiet */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40, marginBottom: 10 }}>{t("set.sec.quiet")}</Text>
        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink }}>{t("set.knock.title")}</Text>
              <Text style={{ fontFamily: PF.serifItalic, fontSize: 11.5, color: P.ink40, marginTop: 2 }}>
                {t("set.knock.sub")}
              </Text>
            </View>
            <Switch value={knock} onValueChange={onToggleKnock} trackColor={{ true: P.pen, false: "#D8D8D6" }} />
          </View>
          <Row label={t("lore.head")} onPress={() => router.push("/lore")} />
          {/* the way back to a saved draft. Without this the composer's
              "save as draft" wrote somewhere nobody could reach. */}
          <Row label={t("set.drafts")} onPress={() => router.push("/drafts")} />
        </View>

        {/* First Class — Apple wants restore and a way to manage a running
            subscription reachable outside the paywall */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40, marginBottom: 10 }}>{t("set.sec.firstClass")}</Text>
        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <Row label={t("set.membership")} value={cofounderNo != null ? t("set.member.cofounder", { n: String(cofounderNo).padStart(3, "0") }) : premium ? t("set.member.first") : t("set.member.not")} onPress={() => router.push("/paywall?src=settings_row")} />
          <Row label={t("set.restore")} value={restoring ? "…" : "›"} onPress={onRestore} />
          <Row label={t("set.manage")} onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")} last />
        </View>

        {/* help — the questions a new reader actually has, and a person */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40, marginBottom: 10 }}>{t("settings.help")}</Text>
        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <Row label={t("settings.howItWorks")} onPress={() => router.push("/help")} />
          <Row label={t("settings.writeToUs")} onPress={() => router.push("/write-to-us")} />
          <Row label={t("settings.rate")} onPress={rate} last />
        </View>

        {/* safety — every row here must actually go somewhere; a dead row on
            THIS panel is the one a reviewer is most likely to press */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40, marginBottom: 10 }}>{t("set.sec.safety")}</Text>
        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <Row label={t("set.blocked")} onPress={() => router.push("/blocked")} />
          <Row label={t("set.terms")} onPress={() => openTerms()} />
          <Row label={t("set.privacy")} onPress={() => openPrivacy()} last />
        </View>

        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2 }]}>
          <Pressable onPress={onSignOut} style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 15, color: "#B23838" }}>{t("set.signOut")}</Text>
          </Pressable>
          <Pressable onPress={() => setAskDelete(true)} style={{ paddingVertical: 13 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 15, color: "#B23838" }}>{t("set.deleteAcct")}</Text>
            <Text style={{ fontFamily: PF.serifItalic, fontSize: 11.5, color: P.ink40, marginTop: 2 }}>
              {t("set.deleteSub")}
            </Text>
          </Pressable>
        </View>
        <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.4, color: P.ink40, textAlign: "center", marginTop: 22 }}>
          {t("set.version", { v: APP_VERSION })}
        </Text>
      </ScrollView>

      <LeaveSheet
        open={picking}
        title={t("settings.language")}
        body={t("set.langBody", { n: LANGS.length })}
        actions={LANGS.map((l) => ({
          label: l.label.toUpperCase(),
          kind: l.id === lang ? ("primary" as const) : ("quiet" as const),
          onPress: () => {
            setLang(l.id);
            setPicking(false);
          },
        }))}
        cancelLabel={t("set.neverMind")}
        onCancel={() => setPicking(false)}
      />

      <LeaveSheet
        open={askDelete}
        title={t("set.delTitle")}
        body={t("set.delBody", { wren })}
        actions={[{ label: deleting ? "…" : t("set.delConfirm"), kind: "destructive", onPress: onDeleteAccount }]}
        cancelLabel={t("set.delKeep")}
        onCancel={() => !deleting && setAskDelete(false)}
      />
    </SafeAreaView>
  );
}
