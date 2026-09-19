import { useState } from "react";
import { Alert, Keyboard, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import { t, useLang } from "../lib/i18n";
import { P, PF, rule } from "../theme/post";
import { useAuth } from "../lib/auth";

/* THE ONE MOMENT A GHOST IS ASKED TO SIGN IN.
   ────────────────────────────────────────────────────────────────────────
   Someone who chose "Just looking" has no session, so every write in the
   product returns null. Before this, all of them failed SILENTLY: the reply
   bar cleared itself, popped a toast and moved to the next letter as if the
   letter had gone — which is not a missing feature, it's the app telling a
   lie about something the reader cares about.

   THREE RULES THIS SHEET FOLLOWS.

   It only ever appears at the moment an action genuinely needs an account —
   never on entry, never on a tab, never on a timer. Reading and the sealed
   room stay open to a ghost, because nothing about them leaves the phone.

   It says what the account is FOR in that specific moment ("somewhere for
   the reply to land"), not what we want ("create an account to continue").
   The reason is the reader's, not ours.

   YOU SIGN IN WITHOUT LEAVING THE SCREEN, and the thing you were doing is
   retried for you. Routing back to onboarding would throw away the letter
   that caused the prompt — asking someone to sign in and charging them their
   words for it is worse than not asking. */
export function SignUpSheet({
  open,
  reason,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  reason: string;
  onClose: () => void;
  onSignedIn: () => void;
}) {
  useLang();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [busy, setBusy] = useState<null | "apple" | "email">(null);
  if (!open) return null;

  const done = () => {
    setBusy(null);
    onSignedIn();
  };

  const doApple = async () => {
    setBusy("apple");
    const r = await auth.signInWithApple();
    if ("error" in r) {
      setBusy(null);
      Alert.alert(t("ob.apple.title"), r.error);
      return;
    }
    done();
  };

  const doEmail = () => {
    Alert.prompt?.(
      t("ob.email.title"),
      t("su.emailBody"),
      async (email?: string) => {
        if (!email?.trim()) return;
        setBusy("email");
        const r = await auth.signInWithEmail(email.trim());
        setBusy(null);
        if ("error" in r) Alert.alert(t("su.emailFail"), r.error);
        else Alert.alert(t("su.linkSent"), t("su.linkSentBody"));
      },
      "plain-text",
      "",
      "email-address",
    );
  };

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,19,0.32)" }} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(260)}
        style={{ backgroundColor: P.paper, borderTopWidth: 1, borderTopColor: P.ink, paddingBottom: Math.max(insets.bottom, 12) + 6 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12, ...rule }}>
          <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.8, color: P.ink }}>{t("su.title")}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ fontFamily: PF.mono, fontSize: 16, color: P.ink40 }}>✕</Text>
          </Pressable>
        </View>

        <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink60, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 20 }}>
          {reason}
        </Text>

        <View style={{ paddingHorizontal: 22, gap: 10 }}>
          {auth.appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={0}
              style={{ height: 50, width: "100%", opacity: busy ? 0.5 : 1 }}
              onPress={doApple}
            />
          ) : null}
          <Pressable
            onPress={doEmail}
            disabled={!!busy}
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: P.ink,
              paddingVertical: 15,
              alignItems: "center",
              backgroundColor: pressed ? P.penWash : "transparent",
              opacity: busy ? 0.5 : 1,
            })}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: P.pen }}>
              {busy === "email" ? "…" : t("ob.continueEmail")}
            </Text>
          </Pressable>

          {/* Leaving is always allowed and always cheap. A sheet you can't
              refuse is a wall, and a wall this early costs more than the
              account is worth. */}
          <Pressable onPress={onClose} style={{ paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.8, color: P.ink }}>{t("su.notYet")}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/** open it the way LeaveSheet opens: keyboard out of the way first */
export function openSignUpSheet(show: () => void) {
  Keyboard.dismiss();
  setTimeout(show, 120);
}
