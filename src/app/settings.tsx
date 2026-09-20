import { useWrenName } from "../lib/wren-name";
import { openPrivacy, openTerms } from "../lib/legal";
import React, { useCallback, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF } from "../theme/post";
import { W14, cardShadow } from "../components/AuraCard";
import { SettingsIcon, type SettingsGlyph } from "../components/SettingsIcons";
import { useAuth } from "../lib/auth";
import { LeaveSheet } from "../components/LeaveSheet";
import { disableMorningKnock, enableMorningKnock, morningKnockEnabled } from "../lib/notify";
import Constants from "expo-constants";
import { useEntitlement } from "../lib/entitlement";
import { iapRestore } from "../lib/iap";
import { isReservedName, saveWrenName } from "../lib/wren-name";
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
        if (isReservedName(n)) {
          Alert.alert(t("ob.naming.reserved"));
          return;
        }
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
      Alert.alert(t("set.stillHere"), r.error);
      return;
    }
    router.replace("/onboarding");
  };

  /* a row: its mark on a tile, the label, then the value or a chevron. The
     boxes are gone — each section is a white card like the rest of the app,
     and the hairline between rows starts past the tile */
  const Row = ({ glyph, label, value, onPress, last, danger }: { glyph: SettingsGlyph; label: string; value?: string; onPress?: () => void; last?: boolean; danger?: boolean }) => (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 14, paddingRight: 16, opacity: pressed ? 0.6 : 1 })}>
      <SettingsIcon glyph={glyph} color={danger ? "#B23838" : "#3A34D6"} tile={danger ? "#FBEAEA" : "#EEEDFB"} />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: W14.hair }}>
        <Text style={{ fontFamily: PF.letter, fontSize: 15, color: danger ? "#B23838" : W14.ink }}>{label}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 13, color: "rgba(30,27,53,0.5)", marginLeft: 12 }}>{value ?? "›"}</Text>
      </View>
    </Pressable>
  );
  const Card = ({ children, style }: { children: React.ReactNode; style?: object }) => (
    <View style={[{ backgroundColor: "#FFFFFF", borderRadius: 18, marginBottom: 22, overflow: "hidden" }, cardShadow, { shadowOpacity: 0.06 }, style]}>{children}</View>
  );
  const Head = ({ children }: { children: string }) => <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.6, color: "rgba(30,27,53,0.5)", marginBottom: 8, marginLeft: 4 }}>{children}</Text>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 24, color: W14.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: W14.ink }}>{t("settings.title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* account */}
        <Head>{t("settings.account")}</Head>
        <Card>
          <Row glyph="pen" label={t("set.penName")} value={handle || t("set.you")} onPress={editName} />
          {age && <Row glyph="cake" label={t("set.age")} value={age} />}
          {/* the Language row sat here showing "English" and doing nothing —
              a dead row on a settings page reads as a broken app */}
          <Row
            glyph="globe"
            label={t("settings.language")}
            value={`${LANGS.find((l) => l.id === lang)?.flag ?? ""} ${LANGS.find((l) => l.id === lang)?.label ?? "English"}`} /* endonym + its flag, never translated */
            onPress={() => setPicking(true)}
          />
          <Row glyph="bird" label={t("set.wrenName", { wren })} value={wren} onPress={renameWren} last />
        </Card>

        {/* quiet */}
        <Head>{t("set.sec.quiet")}</Head>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 14, paddingRight: 16 }}>
            <SettingsIcon glyph="bell" />
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: W14.hair }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontFamily: PF.letter, fontSize: 15, color: W14.ink }}>{t("set.knock.title")}</Text>
                <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: "rgba(30,27,53,0.5)", marginTop: 2 }}>{t("set.knock.sub")}</Text>
              </View>
              <Switch value={knock} onValueChange={onToggleKnock} trackColor={{ true: P.pen, false: "#D8D8D6" }} />
            </View>
          </View>
          <Row glyph="heart" label={t("lore.head")} onPress={() => router.push("/lore")} />
          {/* the way back to a saved draft. Without this the composer's
              "save as draft" wrote somewhere nobody could reach. */}
          <Row glyph="draft" label={t("set.drafts")} onPress={() => router.push("/drafts")} last />
        </Card>

        {/* First Class — Apple wants restore and a way to manage a running
            subscription reachable outside the paywall */}
        <Head>{t("set.sec.firstClass")}</Head>
        <Card>
          <Row glyph="ticket" label={t("set.membership")} value={cofounderNo != null ? t("set.member.cofounder", { n: String(cofounderNo).padStart(3, "0") }) : premium ? t("set.member.first") : t("set.member.not")} onPress={() => router.push("/paywall?src=settings_row")} />
          <Row glyph="restore" label={t("set.restore")} value={restoring ? "…" : "›"} onPress={onRestore} />
          <Row glyph="card" label={t("set.manage")} onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")} last />
        </Card>

        {/* help — the questions a new reader actually has, and a person */}
        <Head>{t("settings.help")}</Head>
        <Card>
          <Row glyph="help" label={t("settings.howItWorks")} onPress={() => router.push("/help")} />
          <Row glyph="mail" label={t("settings.writeToUs")} onPress={() => router.push("/write-to-us")} />
          <Row glyph="star" label={t("settings.rate")} onPress={rate} last />
        </Card>

        {/* safety — every row here must actually go somewhere; a dead row on
            THIS panel is the one a reviewer is most likely to press */}
        <Head>{t("set.sec.safety")}</Head>
        <Card>
          <Row glyph="shield" label={t("set.blocked")} onPress={() => router.push("/blocked")} />
          <Row glyph="doc" label={t("set.terms")} onPress={() => openTerms()} />
          <Row glyph="lock" label={t("set.privacy")} onPress={() => openPrivacy()} last />
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <Row glyph="door" label={t("set.signOut")} onPress={onSignOut} danger />
          <Pressable onPress={() => setAskDelete(true)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 14, paddingRight: 16, opacity: pressed ? 0.6 : 1 })}>
            <SettingsIcon glyph="trash" color="#B23838" tile="#FBEAEA" />
            <View style={{ flex: 1, paddingVertical: 12 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 15, color: "#B23838" }}>{t("set.deleteAcct")}</Text>
              <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: "rgba(30,27,53,0.5)", marginTop: 2 }}>{t("set.deleteSub")}</Text>
            </View>
          </Pressable>
        </Card>
        <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.45)", textAlign: "center", marginTop: 22 }}>
          {t("set.version", { v: APP_VERSION })}
        </Text>
      </ScrollView>

      <LeaveSheet
        open={picking}
        title={t("settings.language")}
        body={t("set.langBody", { n: LANGS.length })}
        actions={LANGS.map((l) => ({
          label: l.label.toUpperCase(),
          lead: l.flag,
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
