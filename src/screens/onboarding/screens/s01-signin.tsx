import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "../../../lib/i18n";
import { openPrivacy, openTerms } from "../../../lib/legal";
import { AppleLogo, AuthKey, EmailFold, GoogleG, type EmailSendAnswer, type EmailVerifyAnswer } from "../parts/auth-keys";
import { FONT, OB, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { OB_MAX_FONT } from "../parts/tokens";

/* 1a · THE SIGN-IN SHEET (storyboard §6 · 1, "1a"; §9 signed-in variants).
   ────────────────────────────────────────────────────────────────────────
   One link on the doorstep ("Been here before? Sign in") opens this: a white
   sheet over the dimmed blue, for someone who already has an account and
   wants to be home in one tap. It is NOT a wall: everyone else never sees
   it, and its last line, "New here? Start without an account →", closes it
   and starts screen 2 for anyone who opened it by mistake (the owner's
   "guest" option lives here, not as a third key on the doorstep).

     Welcome back.
     Sign in the way you did last time.
     [ Continue with Apple ]      black, first wherever Google is (4.8)
     [ Continue with Google ]
     [ Continue with email ]      unfolds in place: the address, then the code
     By continuing you agree to our Terms and Privacy Policy.
     New here? Start without an account →

   It only draws and reports. The sign-in itself is props.services (real
   auth, or the DEMO stubs: no real Apple or Google account is ever touched
   on the simulator); on ok it calls props.signedIn(), and the runner waits
   for the account to land and decides: an onboarded account goes to Today,
   one that never finished starts on 2 with its known answers skipped. The
   key that was pressed keeps spinning until then, so a second press can't
   start a second sign-in. A cancel (the Apple sheet dismissed) is silence;
   an error says what it said, once, under the keys.

   The sheet rises on a spring and the dim fades in; closing reverses both
   and then calls closeSide(). Reduce Motion: it appears and goes in place. */

/** A line with [bracketed] spans that are links (underlined, pressable); `onLink(i)` gets which span. */
export function LinkedLine({
  text,
  style,
  linkStyle,
  onLink,
}: {
  text: string;
  style: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  onLink: (i: number) => void;
}) {
  const parts = text.split(/(\[[^\]]+\])/);
  let n = -1;
  return (
    <Text maxFontSizeMultiplier={OB_MAX_FONT} style={style}>
      {parts.map((p, i) => {
        if (!p.startsWith("[") || !p.endsWith("]")) return p;
        n += 1;
        const which = n;
        return (
          <Text maxFontSizeMultiplier={OB_MAX_FONT} key={i} accessibilityRole="link" onPress={() => onLink(which)} style={[{ textDecorationLine: "underline" }, linkStyle]}>
            {p.slice(1, -1)}
          </Text>
        );
      })}
    </Text>
  );
}

export function SignInSheet({ props }: { props: ObScreenProps }) {
  const { services } = props;
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const rise = useSharedValue(reduce ? 0 : 1);
  const dim = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    rise.value = withSpring(0, { damping: 20, stiffness: 190, mass: 0.9 });
    dim.value = withTiming(1, { duration: 220 });
  }, [reduce, rise, dim]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value * 640 }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));

  const close = () => {
    if (busy) return;
    if (reduce) {
      props.closeSide();
      return;
    }
    dim.value = withTiming(0, { duration: 180 });
    rise.value = withTiming(1, { duration: 220, easing: Easing.in(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(props.closeSide)();
    });
  };

  const signIn = async (p: "apple" | "google") => {
    if (busy) return;
    setBusy(p);
    setErr(null);
    const r = await services.signIn(p);
    if (!alive.current) return;
    if ("ok" in r) {
      props.signedIn(); // the key keeps spinning until the runner moves on
      return;
    }
    setBusy(null);
    if ("error" in r) setErr(r.error);
  };

  /* the email: the code is sent with the mode the verify must use (a plain sign-in is "otp") */
  const mode = useRef<"otp" | "attach">("otp");
  const send = async (email: string): Promise<EmailSendAnswer> => {
    setErr(null);
    const r = await services.emailSignIn(email);
    if ("sent" in r) {
      mode.current = r.mode ?? "otp";
      return "code";
    }
    if ("ok" in r) {
      props.signedIn();
      return "code";
    }
    if ("error" in r) return { error: r.error };
    return { error: t("ob.code.bad") };
  };
  const verify = async (email: string, code: string): Promise<EmailVerifyAnswer> => {
    const r = await services.emailVerify(email, code, mode.current);
    if ("ok" in r) {
      props.signedIn();
      return true;
    }
    return { error: "error" in r ? r.error : t("ob.code.bad") };
  };

  const startNew = () => {
    if (busy) return;
    props.closeSide();
    props.advance();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: OB.scrim }, dimStyle]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel={t("ob2.signin.close")} />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[
            sheetStyle,
            {
              backgroundColor: OB.paper,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 3,
              borderBottomWidth: 0,
              borderColor: OB.ink,
              maxHeight: 640,
            },
          ]}
        >
          <ScrollView
            ref={scroll}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16) + 6 }}
          >
            <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "#D9D7E6", marginBottom: 18 }} />
            <Text maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" style={{ fontFamily: FONT.head, fontSize: 26, lineHeight: 31, letterSpacing: -0.7, color: OB.ink }}>
              {t("ob2.signin.title")}
            </Text>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.lineSmall, { color: OB.inkSoft, marginTop: 6, marginBottom: 20 }]}>{t("ob2.signin.line")}</Text>

            {services.appleAvailable && (
              <AuthKey first solid icon={<AppleLogo />} label={t("ob.continueApple")} busy={busy === "apple"} dim={!!busy && busy !== "apple"} onPress={() => void signIn("apple")} />
            )}
            <AuthKey
              first={!services.appleAvailable}
              icon={<GoogleG />}
              label={t("ob.continueGoogle")}
              busy={busy === "google"}
              dim={!!busy && busy !== "google"}
              onPress={() => void signIn("google")}
            />
            <EmailFold on="shell" send={send} verify={verify} disabled={!!busy} onOpen={() => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 320)} />

            {!!err && <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: "#B42318", textAlign: "center", marginTop: 12 }]}>{err}</Text>}

            <LinkedLine
              text={t("ob2.signin.terms")}
              style={[TYPE.small, { color: OB.inkSoft, textAlign: "center", marginTop: 18 }]}
              onLink={(i) => void (i === 0 ? openTerms() : openPrivacy())}
            />
            <LinkedLine
              text={t("ob2.signin.new")}
              style={[TYPE.textKey, { color: OB.ink, textAlign: "center", marginTop: 14, paddingVertical: 8 }]}
              linkStyle={{ color: OB.blue, fontFamily: FONT.bold, textDecorationLine: "none" }}
              onLink={startNew}
            />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
