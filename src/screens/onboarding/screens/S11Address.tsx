import { useRef, useState } from "react";
import { AccessibilityInfo, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthResult } from "../../../lib/auth";
import { t } from "../../../lib/i18n";
import { openPrivacy, openTerms } from "../../../lib/legal";
import { AppleLogo, AuthKey, EmailFold, GoogleG, type EmailSendAnswer, type EmailVerifyAnswer } from "../parts/auth-keys";
import { Headline, Line, TOPBAR_H } from "../parts/frame";
import * as haptics from "../parts/haptics";
import { AcidKey, TextKey } from "../parts/keys";
import { EDGE, FONT, GUTTER, OB, SHADOW, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { Chick } from "./s10-chick";
import { PlainEnvelope } from "./s08-envelope";
import { useHatchRead } from "./s09-read";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* SCREEN 11 · WHERE SHOULD REPLIES FIND YOU? (+ 11a, the email code; the
   "already an account" edge) — storyboard §6 · 11, §9.
   ────────────────────────────────────────────────────────────────────────
   Only for someone without a real account (the flow skips it otherwise).
   The chick, named now, holds your envelope and looks at you; the account
   is asked exactly once, here, at the moment it has an obvious reason.

   THE KEYS speak iOS (parts/auth-keys): Continue with Apple (black, first,
   where Apple is available — 4.8), Google, and email unfolding in place
   into the six-digit code (11a). Each LINKS onto the SAME user id the run
   has had since 3 (services.link / emailAttach: Apple's and Google's
   linkIdentity, the email attach), so the letter, the bird and the draft
   stay this person's. "Not now, keep it on this phone" is the guest
   (skip()), with the small line saying what that means. The UGC terms
   line sits above all four, because every one of them leads to the first
   post (Apple 1.2): Terms and Privacy Policy are live links (lib/legal,
   in an in-app sheet).

   THE EDGE: the Apple / Google / email address already owns a Kindredly
   account → "That's already an account. Switch to it? Your letter comes
   with you; the bird you have there will carry it." Switch → services.
   switchAccount (email answers with a sign-in code, entered here) →
   addressDone("switched"). Nothing was posted yet, so nothing is orphaned;
   this run's chick is dropped (finishPayload). "Use another way" goes back
   to the three keys.

   A cancelled sheet says nothing; a failure says so in one line under the
   keys and leaves every way open. Everything that leaves the phone goes
   through props.services (DEMO-stubbed on the simulator). No ‹. */

type Provider = "apple" | "google" | "email";

export default function S11Address(props: ObScreenProps) {
  const { draft, services } = props;
  const insets = useSafeAreaInsets();
  const { form, mood } = useHatchRead(draft.letter);
  const her = draft.wrenName.trim() || t("ob2.name.ph");
  const [busy, setBusy] = useState<null | "apple" | "google" | "switch">(null);
  const [failed, setFailed] = useState(false);
  const [exists, setExists] = useState<null | { provider: Provider; email?: string }>(null);
  const [switchEmail, setSwitchEmail] = useState<string | null>(null);
  const done = useRef(false);
  const scroll = useRef<ScrollView>(null);

  const finish = (choice: "apple" | "google" | "email" | "switched") => {
    if (done.current) return;
    done.current = true;
    haptics.success();
    props.addressDone(choice);
  };
  const answer = (p: Provider, r: AuthResult): void => {
    if ("ok" in r) finish(p);
    else if ("exists" in r) setExists({ provider: p });
    else if ("error" in r) {
      console.warn(`[onboarding] 11: ${p} didn't link:`, r.error);
      setFailed(true);
      AccessibilityInfo.announceForAccessibility(t("ob2.address.failed"));
    }
    // cancelled: nothing to say
  };
  const link = async (p: "apple" | "google") => {
    if (busy || done.current) return;
    setBusy(p);
    setFailed(false);
    try {
      answer(p, await services.link(p));
    } finally {
      setBusy(null);
    }
  };

  /* the email fold: attach onto the same user id; its code is 11a */
  const emailSend = async (email: string): Promise<EmailSendAnswer> => {
    setFailed(false);
    const r = await services.emailAttach(email);
    if ("sent" in r) {
      props.openSide("code");
      return "code";
    }
    if ("exists" in r) return "exists";
    if ("error" in r) console.warn("[onboarding] 11: the email wasn't attached:", r.error);
    return { error: t("ob2.address.failed") };
  };
  const emailVerify = async (email: string, code: string): Promise<EmailVerifyAnswer> => {
    const r = await services.emailVerify(email, code, "attach");
    if ("ok" in r) {
      finish("email");
      return true;
    }
    haptics.refuse();
    return { error: "error" in r ? r.error : t("ob.code.bad") };
  };

  const doSwitch = async () => {
    if (!exists || busy) return;
    setBusy("switch");
    setFailed(false);
    try {
      const r = await services.switchAccount(exists.provider, exists.email);
      if ("ok" in r) finish("switched");
      else if ("sent" in r && exists.email) {
        setSwitchEmail(exists.email);
        props.openSide("code");
      } else if ("error" in r) {
        console.warn("[onboarding] 11: the switch didn't go through:", r.error);
        setFailed(true);
        AccessibilityInfo.announceForAccessibility(t("ob2.address.failed"));
      }
    } finally {
      setBusy(null);
    }
  };
  const otherWay = () => {
    setExists(null);
    setSwitchEmail(null);
    setFailed(false);
    props.closeSide();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + TOPBAR_H - 8, paddingBottom: Math.max(insets.bottom, 16) + 12, paddingHorizontal: GUTTER, alignItems: "center" }}
      >
        <Chick shell={draft.shell} form={form} mood={mood} size={96} holding={<PlainEnvelope width={58} tilt={-14} />} />
        <Headline on="shell" style={{ marginTop: 12, maxWidth: 280 }}>
          {t("ob2.address.head")}
        </Headline>
        <Line on="shell" small style={{ color: OB.inkSoft, marginTop: 8 }}>
          {t("ob2.address.line", { name: her })}
        </Line>
        <Terms />

        <View style={{ alignSelf: "stretch", marginTop: 16 }}>
          {exists ? (
            <Animated.View entering={FadeIn.duration(200)} style={{ marginRight: SHADOW }}>
              <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: 18, backgroundColor: OB.ink }} />
              <View style={{ borderRadius: 18, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: OB.paper, padding: 18 }}>
                <Text maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" style={{ ...FONT.head, fontSize: 21, lineHeight: 26, letterSpacing: -0.5, color: OB.ink }}>
                  {t("ob2.address.exists")}
                </Text>
                <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.lineSmall, { color: OB.inkSoft, marginTop: 6 }]}>{t("ob2.address.existsLine")}</Text>
                {switchEmail ? (
                  <CodeField
                    email={switchEmail}
                    verify={async (code) => {
                      const r = await services.emailVerify(switchEmail, code, "otp");
                      if ("ok" in r) {
                        finish("switched");
                        return true;
                      }
                      haptics.refuse();
                      return false;
                    }}
                  />
                ) : (
                  <View style={{ marginTop: 16 }}>
                    <AcidKey label={t("ob2.address.switch")} busy={busy === "switch"} onPress={() => void doSwitch()} />
                  </View>
                )}
                <TextKey label={t("ob2.address.other")} on="paper" underline onPress={otherWay} style={{ marginTop: 4 }} />
              </View>
            </Animated.View>
          ) : (
            <>
              {services.appleAvailable && (
                <AuthKey first solid icon={<AppleLogo size={19} />} label={t("ob.continueApple")} busy={busy === "apple"} disabled={!!busy} onPress={() => void link("apple")} />
              )}
              <AuthKey first={!services.appleAvailable} icon={<GoogleG size={18} />} label={t("ob.continueGoogle")} busy={busy === "google"} disabled={!!busy} onPress={() => void link("google")} />
              <EmailFold
                send={emailSend}
                verify={emailVerify}
                on="shell"
                disabled={!!busy}
                onExists={(email) => setExists({ provider: "email", email })}
                onOpen={() => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 320)}
              />
            </>
          )}
          {failed && <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: "#B3261E", textAlign: "center", marginTop: 10, ...FONT.semi }]}>{t("ob2.address.failed")}</Text>}
        </View>

        {!exists && (
          <>
            <TextKey label={t("ob2.address.guest")} on="shell" underline onPress={props.skip} disabled={!!busy} style={{ marginTop: 14 }} />
            <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: OB.inkSoft, textAlign: "center", marginTop: 2, maxWidth: 300 }]}>{t("ob2.address.guestLine")}</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** The UGC terms line, with Terms and Privacy Policy as live links (in an in-app sheet). */
function Terms() {
  const raw = t("ob2.address.terms");
  // split round the two placeholders, so each language puts its links where its grammar wants them
  const parts = raw.split(/(\{terms\}|\{privacy\})/);
  return (
    <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: OB.inkSoft, textAlign: "center", marginTop: 16 }]}>
      {parts.map((p, i) =>
        p === "{terms}" ? (
          <Text maxFontSizeMultiplier={OB_MAX_FONT} key={i} onPress={() => void openTerms()} accessibilityRole="link" style={{ textDecorationLine: "underline", color: OB.ink, ...FONT.semi }}>
            {t("ob2.address.termsLink")}
          </Text>
        ) : p === "{privacy}" ? (
          <Text maxFontSizeMultiplier={OB_MAX_FONT} key={i} onPress={() => void openPrivacy()} accessibilityRole="link" style={{ textDecorationLine: "underline", color: OB.ink, ...FONT.semi }}>
            {t("ob2.address.privacyLink")}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

/** The six digits after a switch by email (a sign-in code), verified on the sixth. */
function CodeField({ email, verify }: { email: string; verify: (code: string) => Promise<boolean> }) {
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ height: 52, borderRadius: 10, borderWidth: 1, borderColor: bad ? "#D0342C" : "rgba(0,0,0,0.18)", backgroundColor: "#FFFFFF", justifyContent: "center" }}>
        <TextInput maxFontSizeMultiplier={OB_MAX_FONT}
          value={code}
          onChangeText={(v) => {
            const d = v.replace(/\D/g, "").slice(0, 6);
            setCode(d);
            if (bad) setBad(false);
            if (d.length === 6 && !busy) {
              setBusy(true);
              void verify(d).then((ok) => {
                setBusy(false);
                if (!ok) {
                  setBad(true);
                  setCode("");
                  AccessibilityInfo.announceForAccessibility(t("ob.code.bad")); // the field just cleared; say why
                }
              });
            }
          }}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          placeholder="••••••"
          placeholderTextColor="rgba(31,31,31,0.3)"
          accessibilityLabel={t("ob.code.cap", { email })}
          style={{ fontSize: 24, letterSpacing: 12, color: "#1F1F1F", textAlign: "center", height: 52 }}
        />
      </View>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: bad ? "#B3261E" : OB.inkSoft, textAlign: "center", marginTop: 8 }]}>{busy ? "…" : bad ? t("ob.code.bad") : t("ob.code.cap", { email })}</Text>
    </View>
  );
}
