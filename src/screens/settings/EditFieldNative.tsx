import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Platform } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KEditFieldView, type KEditFieldCommands, type KEditFieldStrings } from "../../../modules/kindredly-ui/src/EditField";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { refreshMorningKnock } from "../../lib/notify";
import { isReservedName, saveWrenName, useWrenName } from "../../lib/wren-name";
import { FIELD_SPECS, checkField, fieldKind } from "../edit-profile/edit-profile-model";
import "../../data/strings-step5-settings";
import "../../data/strings-step5-kitrn"; // a11y.back
import "../../data/strings-identity2"; // id2.sheet.clear: the clear key's VoiceOver name

/* ONE FIELD, ON ITS OWN PAGE, IN SWIFTUI (owner, 2026-10-27: "make Me all
   Swift"): one Host (keeping the keyboard's safe area) holding
   KEditFieldView, behind the "editfield" switch (app/(tabs)/me/edit-field,
   NativeSurface in mount mode). The rules are the React Native page's,
   word for word:

   - the field opens on the name they have, the keyboard up; the courier's
     name arrives a moment after the page (it is read from the phone) and is
     taken while nothing has been typed (a setText, never a prop: the Swift
     field is uncontrolled);
   - GOING BACK SAVES (beforeRemove: the chevron, the edge swipe, Done), and
     only what is worth saving (checkField): never an empty name, never an
     unchanged one, never "Wren" for the courier — said under the field as
     it is typed, and to VoiceOver when it appears;
   - a renamed courier re-stamps the morning knock; a save that didn't take
     is said. */

export function EditFieldNative() {
  const lang = useLang();
  const { f } = useLocalSearchParams<{ f?: string }>();
  const kind = fieldKind(f);
  const spec = FIELD_SPECS[kind];
  const router = useRouter();
  const navigation = useNavigation();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KEditFieldCommands>(ref, { blurOnUnmount: true });
  const auth = useAuth();
  const wren = useWrenName();
  const current = kind === "pen" ? auth.handle : wren;

  const [text, setText] = useState(current);
  const touched = useRef(false);
  // the name they have, into the field — again when the courier's arrives, while nothing is typed
  useEffect(() => {
    if (touched.current) return;
    setText(current);
    commands.send("setText", { target: "field", value: current });
  }, [current, commands]);
  // autoFocus
  useEffect(() => {
    commands.send("focus", { target: "field" });
  }, [commands]);

  // unchanged is never an error (checkField), so the name she has never shows the reserved line
  const check = checkField(kind, text, current, isReservedName);
  const reserved = check.error === "reserved";
  useEffect(() => {
    if (reserved && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(t("ob.naming.reserved"));
  }, [reserved]);
  const latest = useRef({ text, current });
  latest.current = { text, current };
  const saveProfile = auth.saveProfile;

  const save = useCallback(async () => {
    const r = checkField(kind, latest.current.text, latest.current.current, isReservedName);
    if (!r.save) return;
    if (kind === "pen") {
      const res = await saveProfile({ handle: r.value });
      if ("error" in res) Alert.alert(t("set.cantSave"), t("set.push.saveFail"));
      return;
    }
    try {
      await saveWrenName(r.value);
      void refreshMorningKnock(); // her lines are signed with her name: re-stamp them
    } catch (e) {
      console.warn("[edit-field] the courier's name wasn't saved:", e);
      Alert.alert(t("set.cantSave"), t("set.push.saveFail"));
    }
  }, [kind, saveProfile]);

  // going back saves, however the page is left (the chevron, the swipe, Done)
  useEffect(() => navigation.addListener("beforeRemove", () => void save()), [navigation, save]);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me/edit-profile" as never)), [router]);
  const onChange = useCallback((v: string) => {
    touched.current = true;
    setText(v);
  }, []);

  const title = kind === "pen" ? t("set.penPrompt.title") : t("set.renameWren", { wren });
  const hint = kind === "pen" ? t("set.penPrompt.body") : t("set.wrenPrompt.body");
  const strings = useMemo<KEditFieldStrings>(
    () => ({
      title,
      backLabel: t("a11y.back"),
      placeholder: kind === "pen" ? t("ep.penPh") : t("ef.namePh"),
      hint,
      reserved: reserved ? t("ob.naming.reserved") : "",
      clearLabel: t("id2.sheet.clear"),
    }),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, hint, kind, reserved, lang],
  );
  const rev = useRev(strings, spec.max, spec.autoCapitalize);

  return (
    <SurfaceHost field>
      <KEditFieldView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        maxLength={spec.max}
        capitalizeWords={spec.autoCapitalize === "words"}
        onBack={back}
        onChange={onChange}
        onSubmit={back}
      />
    </SurfaceHost>
  );
}
