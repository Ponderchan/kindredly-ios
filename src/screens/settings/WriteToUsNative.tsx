import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KWriteToUsView, type KWriteToUsCommands, type KWriteToUsStrings } from "../../../modules/kindredly-ui/src/WriteToUs";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { speakAs, useWrenName } from "../../lib/wren-name";
import { sendSupportLetter } from "../../lib/db";
import { useBirdImageRef } from "../../lib/bird-images";
import { footerVersion } from "./settings-model";
import { versionFacts } from "./useSettingsModel";
import "../../data/strings-step5-kitrn"; // a11y.back

/* WRITE TO US IN SWIFTUI (owner, 2026-10-27: "make Me all Swift"): one
   Host (keeping the keyboard's safe area) holding KWriteToUsView, behind
   the "writetous" switch (app/(tabs)/me/write-to-us, NativeSurface in
   mount mode). The React Native page's rules: the letter field has the
   keyboard at once; it may go once there are two letters of it and nothing
   is on its way; it carries the version the foot of Settings shows; a
   failed send is said (and to VoiceOver), each try clearing the last
   failure first; once it went, the sent page (with or without an address
   it says what happens next) and Done goes back. The fields are Swift's
   (uncontrolled); their words come here with every edit. */

const VERSION = footerVersion(versionFacts());

export function WriteToUsNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KWriteToUsCommands>(ref, { blurOnUnmount: true });
  const wren = useWrenName();
  const bird = useBirdImageRef("listen24");
  const sentBird = useBirdImageRef("delight64");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const canSend = body.trim().length >= 2 && !sending;

  // autoFocus: the letter
  useEffect(() => {
    commands.send("focus", { target: "body" });
  }, [commands]);

  // VoiceOver hears a failed send; each try clears `failed` first, so a second failure is said again
  useEffect(() => {
    if (failed && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(t("wu.fail"));
  }, [failed]);

  const latest = useRef({ body, email, canSend });
  latest.current = { body, email, canSend };
  const send = useCallback(async () => {
    const { body: b, email: e, canSend: can } = latest.current;
    if (!can) return;
    setSending(true);
    setFailed(false);
    let ok = false;
    try {
      ok = !!(await sendSupportLetter(b, e, `${VERSION} · ${Platform.OS} ${Platform.Version}`));
    } catch (err) {
      console.warn("[write-to-us] send:", err);
    }
    setSending(false);
    if (ok) setSent(true);
    else setFailed(true);
  }, []);

  const strings = useMemo<KWriteToUsStrings>(
    () => ({
      title: t("wu.title"),
      backLabel: t("a11y.back"),
      intro: speakAs(t("wu.intro"), wren),
      placeholder: t("wu.ph"),
      addrLabel: t("wu.addrLabel"),
      addrPlaceholder: t("wu.addrPh"),
      addrHint: t("wu.addrHint"),
      fail: failed ? t("wu.fail") : "",
      send: t("wu.send", { wren }),
      travelsWith: t("wu.travelsWith", { v: VERSION }),
      sentTitle: t("wu.taken"),
      sentBody: speakAs(email.trim() ? t("wu.takenAddr") : t("wu.takenNoAddr"), wren),
      done: t("wu.done"),
    }),
    // lang: every word is t()'s; the sent line only reads whether an address was given
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wren, failed, email.trim().length > 0, lang],
  );
  const rev = useRev(strings, bird, sentBird, canSend, sending, sent);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me/settings")), [router]);

  return (
    <SurfaceHost field>
      <KWriteToUsView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        bird={bird}
        sentBird={sentBird}
        canSend={canSend}
        sending={sending}
        sent={sent}
        onBack={back}
        onBodyChange={setBody}
        onEmailChange={setEmail}
        onSend={send}
        onDone={back}
      />
    </SurfaceHost>
  );
}
