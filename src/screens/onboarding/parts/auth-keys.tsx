import { useState, type ReactNode } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { t } from "../../../lib/i18n";
import type { Ground } from "../flow";
import { ON_GROUND, TYPE } from "./tokens";
import { OB_MAX_FONT } from "./tokens";

/* THE SIGN-IN KEYS, FOR 1a AND 11 (storyboard §6 · 1a, 11, 11a).
   ────────────────────────────────────────────────────────────────────────
   The three keys that ask for a person's account speak iOS, not the run's
   paper-and-acid: they are drawn to Apple's and Google's own rules — 52pt,
   radius 10, the real Apple logo and four-colour G, the system face in
   sentence case, the logo pinned in one column at 18pt and the label
   centred — and Apple is first wherever Google is (4.8). They keep these
   colours on every ground. Ported from the old onboarding's sign-in row
   (screens/onboarding/legacy), which the owner already approved.

   EmailFold is "Continue with email" unfolding IN PLACE, as now: the key
   becomes a field, Send under it; then the six-digit code (11a), which
   verifies itself on the sixth digit. It only draws and holds what is typed;
   the screen hands it `send` and `verify` (the run's services: real auth, or
   the DEMO stubs), so the same fold serves 1a's sign-in and 11's attach. */

const SIGNIN_INK = "#111113";

export function AppleLogo({ size = 20, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M16.37 12.68c-.02-2.42 1.98-3.58 2.07-3.64-1.13-1.65-2.88-1.88-3.5-1.9-1.49-.15-2.91.88-3.67.88-.76 0-1.92-.86-3.16-.84-1.62.02-3.12.95-3.96 2.4-1.69 2.93-.43 7.27 1.21 9.65.8 1.16 1.76 2.47 3.01 2.42 1.21-.05 1.67-.78 3.13-.78 1.46 0 1.87.78 3.15.76 1.3-.02 2.13-1.18 2.92-2.35.92-1.35 1.3-2.65 1.32-2.72-.03-.01-2.53-.97-2.55-3.88zM13.97 5.57c.67-.81 1.12-1.94 1-3.07-.96.04-2.13.64-2.82 1.45-.62.72-1.16 1.87-1.02 2.97 1.07.08 2.17-.55 2.84-1.35z"
      />
    </Svg>
  );
}

export function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46c-.28 1.5-1.12 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11C3.25 21.3 7.31 24 12 24z" />
      <Path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28V6.61H1.28A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.11z" />
      <Path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z" />
    </Svg>
  );
}

export function MailGlyph({ size = 20, color = SIGNIN_INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2.2} y={4.8} width={19.6} height={14.4} rx={2.6} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M3.4 6.6 12 13.2 20.6 6.6" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** One sign-in key: Apple's solid black, or the white outlined one; the icon pinned at 18pt, the label centred. */
export function AuthKey({
  icon,
  label,
  solid = false,
  first = false,
  busy = false,
  onPress,
  disabled,
  dim,
}: {
  icon: ReactNode;
  label: string;
  /** Apple's solid black key */
  solid?: boolean;
  first?: boolean;
  busy?: boolean;
  onPress: () => void;
  disabled?: boolean;
  dim?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 10,
        marginTop: first ? 0 : 12,
        backgroundColor: solid ? (pressed ? "#222222" : "#000000") : pressed ? "#F2F2F2" : "#FFFFFF",
        borderWidth: solid ? 0 : 1,
        borderColor: "rgba(0,0,0,0.18)",
        alignItems: "center",
        justifyContent: "center",
        opacity: dim ? 0.5 : 1,
      })}
    >
      <View style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 24, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      {/* the key is a fixed 52 tall with the logo at the left: the label keeps clear of the logo
          (48 each side), stays on one line, and follows the phone's text size only so far (1.6×),
          or at the accessibility sizes it ran over the logo and out of the key */}
      {busy ? (
        <ActivityIndicator color={solid ? "#FFFFFF" : SIGNIN_INK} />
      ) : (
        <Text maxFontSizeMultiplier={1.6} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ marginHorizontal: 48, fontSize: 17, fontWeight: "600", color: solid ? "#FFFFFF" : "#1F1F1F" }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** What `send` answers: the code is on its way, the address is already an account (11's "Switch to it?"), or an error to show. */
export type EmailSendAnswer = "code" | "exists" | { error: string };
/** What `verify` answers: in, or an error (the field clears and says so). */
export type EmailVerifyAnswer = true | { error: string };

/**
 * "Continue with email", unfolding in place: the key → the address field and
 * Send → the six-digit code (11a), verified on the sixth digit. `on` is the
 * ground under the captions (the fields themselves stay white).
 */
export function EmailFold({
  send,
  verify,
  onExists,
  on = "shell",
  disabled,
  first = false,
  onOpen,
}: {
  send: (email: string) => Promise<EmailSendAnswer>;
  verify: (email: string, code: string) => Promise<EmailVerifyAnswer>;
  /** the address already owns an account: the screen asks "Switch to it?" */
  onExists?: (email: string) => void;
  on?: Ground;
  disabled?: boolean;
  first?: boolean;
  /** told when the fold opens (a sheet may scroll to keep the field above the keyboard) */
  onOpen?: () => void;
}) {
  const [stage, setStage] = useState<"key" | "email" | "code">("key");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [bad, setBad] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const caption = ON_GROUND[on];
  const field = { height: 52, borderRadius: 10, marginTop: first ? 0 : 12, backgroundColor: "#FFFFFF", borderWidth: 1, justifyContent: "center" as const };

  /* a refusal is said aloud as well as shown: the field clears or dims and VoiceOver's cursor stays
     put, so without this nothing was read (accessibilityLiveRegion is Android's only) */
  const fail = (msg: string) => {
    setBad(msg);
    AccessibilityInfo.announceForAccessibility(msg);
  };

  const doSend = async () => {
    const e = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      fail(t("ob.email.bad"));
      return;
    }
    setBad(null);
    setBusy(true);
    const r = await send(e);
    setBusy(false);
    if (r === "code") setStage("code");
    else if (r === "exists") onExists?.(e);
    else fail(r.error);
  };
  const doVerify = async (c: string) => {
    if (c.length !== 6) return;
    setBusy(true);
    const r = await verify(email.trim(), c);
    setBusy(false);
    if (r !== true) {
      fail(t("ob.code.bad"));
      setCode("");
    }
  };

  if (stage === "key")
    return (
      <AuthKey
        first={first}
        icon={<MailGlyph />}
        label={t("ob.continueEmail")}
        disabled={disabled}
        onPress={() => {
          setStage("email");
          onOpen?.();
        }}
      />
    );

  if (stage === "code")
    return (
      <View>
        <View style={[field, { borderColor: bad ? "#D0342C" : "rgba(0,0,0,0.18)" }]}>
          <TextInput maxFontSizeMultiplier={OB_MAX_FONT}
            value={code}
            onChangeText={(v) => {
              const d = v.replace(/\D/g, "").slice(0, 6);
              setCode(d);
              if (bad) setBad(null);
              if (d.length === 6) void doVerify(d);
            }}
            autoFocus
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            placeholder="••••••"
            placeholderTextColor="rgba(31,31,31,0.3)"
            accessibilityLabel={t("ob.code.cap", { email: email.trim() })}
            style={{ fontSize: 24, letterSpacing: 12, color: "#1F1F1F", textAlign: "center", height: 52 }}
          />
        </View>
        <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: caption, textAlign: "center", marginTop: 10 }]}>{busy ? "…" : bad ?? t("ob.code.cap", { email: email.trim() })}</Text>
        <Pressable
          onPress={() => {
            setStage("email");
            setCode("");
            setBad(null);
          }}
          hitSlop={8}
          accessibilityRole="button"
          style={{ alignSelf: "center", marginTop: 6, padding: 6 }}
        >
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: caption, textDecorationLine: "underline" }]}>{t("ob.code.again")}</Text>
        </Pressable>
      </View>
    );

  return (
    <View>
      <View style={[field, { borderColor: bad ? "#D0342C" : "rgba(0,0,0,0.18)" }]}>
        <View style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 24, alignItems: "center", justifyContent: "center" }}>
          <MailGlyph />
        </View>
        <TextInput maxFontSizeMultiplier={OB_MAX_FONT}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (bad) setBad(null);
          }}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder={t("ob.email.ph")}
          placeholderTextColor="rgba(31,31,31,0.35)"
          onSubmitEditing={doSend}
          returnKeyType="send"
          style={{ fontSize: 17, color: "#1F1F1F", paddingLeft: 54, paddingRight: 18, height: 52 }}
        />
      </View>
      <AuthKey solid icon={<MailGlyph size={18} color="#FFFFFF" />} label={t("ob.email.send")} busy={busy} onPress={doSend} />
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: caption, textAlign: "center", marginTop: 10 }]}>{bad ?? t("ob.email.body")}</Text>
    </View>
  );
}
