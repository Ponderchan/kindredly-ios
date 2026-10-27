import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import { t, useLang } from "../lib/i18n";
import { SheetBody, SheetHeader, sheetWords, sheetCard, sheetKey, sheetKeyLabel } from "./sheet-chrome";
import { NativeSurface, SurfaceHost } from "./NativeSurface";
import { rgbaParts, signUpBottomMargin } from "./shared-sheets-model";
import { KSignUpSheetView } from "../../modules/kindredly-ui";
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
export type SignUpSheetProps = {
  open: boolean;
  reason: string;
  /** draw it in a transparent window-level Modal, above the floating tab bar */
  modal?: boolean;
  onClose: () => void;
  onSignedIn: () => void;
};

/* SWIFT OR REACT NATIVE (2026-10-27). The sheet is drawn by SwiftUI
   (modules/kindredly-ui KSignUpSheetView, Portable/Sheets) when the
   "signupsheet" switch is on and the binary has the view; otherwise — the
   switch off (the default until its simulator pass), an older binary, a JS
   error on the Swift path, a crash there on the last two launches — it is
   SignUpSheetRN below, exactly as before. Each showing decides once, as it
   opens (NativeSurface in mount mode). Both faces run the same sign-ins
   (useSignUpActions, kept here so a sheet closed while one is on its way
   finds it still on its way when it opens again, as it always did): Sign in
   with Apple and the email link stay lib/auth's, and the Swift face only
   reports which key was pressed. Same props, so no call site changes. */
export function SignUpSheet(props: SignUpSheetProps) {
  const actions = useSignUpActions(props.onSignedIn);
  if (!props.open) return null;
  return (
    <NativeSurface
      surface="signupsheet"
      view="KSignUpSheetView"
      mode="mount"
      native={() => <SignUpSheetSwift {...props} actions={actions} />}
      fallback={() => <SignUpSheetRN {...props} actions={actions} />}
      // a frame or two while the breadcrumb is written: nothing yet, as before the sheet rises
      pending={() => null}
    />
  );
}

/** a sign-in on its way, and the two ways to start one */
type SignUpActions = {
  busy: null | "apple" | "email";
  appleAvailable: boolean;
  doApple: () => Promise<void>;
  doEmail: () => void;
};

/* the React Native sheet's sign-ins, moved out of it unchanged */
function useSignUpActions(onSignedIn: () => void): SignUpActions {
  const auth = useAuth();
  const [busy, setBusy] = useState<null | "apple" | "email">(null);

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

  return { busy, appleAvailable: auth.appleAvailable, doApple, doEmail };
}

/* The Swift sheet: a Host over the whole of what the React Native sheet
   would cover, the dim and the card inside it; the Apple key is the
   system's own (ASAuthorizationAppleIDButton, as expo-apple-authentication
   draws it). VoiceOver stays in it and the escape closes, as the React
   Native sheet's container does. */
function SignUpSheetSwift({ reason, modal = false, onClose, actions }: SignUpSheetProps & { actions: SignUpActions }) {
  useLang();
  const { key: theme, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { busy, doApple, doEmail } = actions;

  const sheet = (
    <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={StyleSheet.absoluteFill}>
      <SurfaceHost>
        <KSignUpSheetView
          theme={theme}
          title={sheetWords(t("su.title"))}
          reason={reason}
          email={sheetWords(t("ob.continueEmail"))}
          notYet={sheetWords(t("su.notYet"))}
          closeLabel={t("wren.trackClose")}
          apple={actions.appleAvailable}
          appleWhite={dark}
          busy={busy ?? ""}
          dim={rgbaParts(DIM)}
          bottomMargin={signUpBottomMargin(insets.bottom)}
          onApple={() => void doApple()}
          // the email key is off while anything is signing in, as the React Native key is disabled
          onEmail={() => {
            if (!busy) doEmail();
          }}
          onClose={onClose}
        />
      </SurfaceHost>
    </View>
  );

  if (!modal) return sheet;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {sheet}
    </Modal>
  );
}

/* the React Native sheet, unchanged but for its sign-ins, which it now gets from SignUpSheet */
function SignUpSheetRN({ reason, modal = false, onClose, actions }: SignUpSheetProps & { actions: SignUpActions }) {
  useLang();
  const P = useP();
  const { t: tk, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { busy, doApple, doEmail } = actions;

  const sheet = (
    <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Pressable onPress={onClose} accessible={false} style={{ flex: 1, backgroundColor: DIM }} />
      </Animated.View>

      <Animated.View entering={SlideInDown.duration(260)} style={[sheetCard(tk, 0), { marginBottom: Math.max(insets.bottom - 26, 8) }]}>
        <SheetHeader title={sheetWords(t("su.title"))} onClose={onClose} tk={tk} P={P} />
        <SheetBody P={P}>{reason}</SheetBody>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {actions.appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={25}
              style={{ height: 50, width: "100%", opacity: busy ? 0.5 : 1 }}
              onPress={doApple}
            />
          ) : null}
          <Pressable onPress={doEmail} disabled={!!busy} accessibilityRole="button" style={({ pressed }) => [sheetKey("quiet", tk, P, dark, pressed), { opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}>
            <Text style={sheetKeyLabel("quiet", tk, P, dark)}>{busy === "email" ? "…" : sheetWords(t("ob.continueEmail"))}</Text>
          </Pressable>

          {/* Leaving is always allowed and always cheap. A sheet you can't
              refuse is a wall, and a wall this early costs more than the
              account is worth. */}
          <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => sheetKey("plain", tk, P, dark, pressed)}>
            <Text style={sheetKeyLabel("plain", tk, P, dark)}>{sheetWords(t("su.notYet"))}</Text>
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
