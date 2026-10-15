import { useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import { t, useLang } from "../lib/i18n";
import { MONO, PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { KEYBOARD_OUT_MS, blurThen, type CommandTarget } from "../lib/keyboard";

/* the 10a dim (H:128), as LeaveSheet's */
const DIM = "rgba(30,27,53,0.3)";

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
   words for it is worse than not asking.

   It wears the theme like LeaveSheet (sf sheet, ln rules, ind for the
   email key, the 10a dim), and like LeaveSheet it can sit in a
   window-level Modal (`modal`) so the floating tab bar can't cover its
   bottom row when it is raised inside a tab. */
export function SignUpSheet({
  open,
  reason,
  modal = false,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  reason: string;
  /** draw it in a transparent window-level Modal, above the floating tab bar */
  modal?: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}) {
  useLang();
  const P = useP();
  const { t: tk, dark } = useTheme();
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

  const sheet = (
    <View accessibilityViewIsModal style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Pressable onPress={onClose} accessible={false} style={{ flex: 1, backgroundColor: DIM }} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(260)}
        style={{ backgroundColor: tk.sf, borderTopWidth: 1, borderTopColor: tk.ln, paddingBottom: Math.max(insets.bottom, 12) + 6 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tk.ln }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.6, color: P.ink }}>{t("su.title")}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")}>
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
              buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={0}
              style={{ height: 50, width: "100%", opacity: busy ? 0.5 : 1 }}
              onPress={doApple}
            />
          ) : null}
          <Pressable
            onPress={doEmail}
            disabled={!!busy}
            accessibilityRole="button"
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: tk.ln,
              paddingVertical: 15,
              alignItems: "center",
              backgroundColor: pressed ? tk.lav2 : "transparent",
              opacity: busy ? 0.5 : 1,
            })}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.6, color: tk.ind }}>
              {busy === "email" ? "…" : t("ob.continueEmail")}
            </Text>
          </Pressable>

          {/* Leaving is always allowed and always cheap. A sheet you can't
              refuse is a wall, and a wall this early costs more than the
              account is worth. */}
          <Pressable onPress={onClose} accessibilityRole="button" style={{ paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.6, color: P.ink }}>{t("su.notYet")}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );

  if (!modal) return sheet;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {sheet}
    </Modal>
  );
}

/** Open it the way LeaveSheet opens: keyboard out of the way first,
    SwiftUI fields included (lib/keyboard). Pass the Swift screen's view
    ref as `target` so its field lets go too. */
export function openSignUpSheet(show: () => void, target?: CommandTarget) {
  blurThen(show, target, { delayMs: KEYBOARD_OUT_MS });
}
