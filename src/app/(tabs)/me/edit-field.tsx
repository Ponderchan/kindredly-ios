import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../lib/theme";
import { t, useLang } from "../../../lib/i18n";
import { useAuth } from "../../../lib/auth";
import { refreshMorningKnock } from "../../../lib/notify";
import { isReservedName, saveWrenName, useWrenName } from "../../../lib/wren-name";
import { SecondaryHeader } from "../../../components/10a";
import { P } from "../../../theme/post";
import { FIELD_SPECS, checkField, fieldKind } from "../../../screens/edit-profile/edit-profile-model";
import { dangerInk } from "../../../screens/settings/settings-model";
import "../../../data/strings-step5-settings";

/* ONE FIELD, ON ITS OWN PAGE (10a step 5, P:310): your pen name
   (/me/edit-field?f=pen) or your courier's (?f=courier), from Edit profile
   or Settings. A React Native page on purpose: the system text field is the
   keyboard path that always works (IME, autocorrect, the paste menu), and
   the page is one field.

   GOING BACK SAVES (beforeRemove: the chevron, the edge swipe, Done on the
   keyboard), and only what is worth saving: never an empty name (the old
   one stays), never an unchanged one, never "Wren" for the courier — her
   own official name, reserved, said under the field as it is typed. The
   pen name keeps onboarding's limits and traits (20, no capitals forced, no
   autocorrect); her name is 16, what lib/wren-name keeps (the old rename
   prompt took 18 and lost two). A renamed courier re-stamps the morning
   knock, which is signed with her name. A pen name the account didn't take
   is said (it stays on the phone, and the next save carries it up). */
export default function EditFieldScreen() {
  useLang();
  const { f } = useLocalSearchParams<{ f?: string }>();
  const kind = fieldKind(f);
  const spec = FIELD_SPECS[kind];
  const router = useRouter();
  const navigation = useNavigation();
  const safe = useSafeAreaInsets();
  const { t: tk, dark } = useTheme();
  const auth = useAuth();
  const wren = useWrenName();
  const current = kind === "pen" ? auth.handle : wren;

  const [text, setText] = useState(current);
  const touched = useRef(false);
  // the courier's name arrives a moment after the page (it is read from the phone): take it
  // while nothing has been typed
  useEffect(() => {
    if (!touched.current) setText(current);
  }, [current]);

  const check = checkField(kind, text, current, isReservedName);
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

  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me/edit-profile" as never));
  const title = kind === "pen" ? t("set.penPrompt.title") : t("set.renameWren", { wren });
  const hint = kind === "pen" ? t("set.penPrompt.body") : t("set.wrenPrompt.body");

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: safe.top }}>
      <SecondaryHeader title={title.toLocaleUpperCase()} onBack={back} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
        <View style={{ backgroundColor: tk.soft, borderRadius: 16, paddingHorizontal: 14 }}>
          <TextInput
            value={text}
            onChangeText={(v) => {
              touched.current = true;
              setText(v);
            }}
            autoFocus
            maxLength={spec.max}
            autoCapitalize={spec.autoCapitalize}
            autoCorrect={spec.autoCorrect}
            spellCheck={false}
            returnKeyType="done"
            onSubmitEditing={back}
            clearButtonMode="while-editing"
            placeholder={kind === "pen" ? t("ep.penPh") : t("ef.namePh")}
            placeholderTextColor={tk.faint}
            selectionColor={tk.ind}
            keyboardAppearance={dark ? "dark" : "light"}
            accessibilityLabel={title}
            accessibilityHint={hint}
            style={{ fontSize: 17, color: tk.ink, paddingVertical: 14 }}
          />
        </View>
        {check.error === "reserved" ? (
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, lineHeight: 18, color: dangerInk(tk.ink, P.post), paddingHorizontal: 4 }}>
            {t("ob.naming.reserved")}
          </Text>
        ) : (
          <Text style={{ fontSize: 13, lineHeight: 18, color: tk.mute, paddingHorizontal: 4 }}>{hint}</Text>
        )}
      </View>
    </View>
  );
}
