import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { P, PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { useWrenName } from "../lib/wren-name";
import { getFlags, setFlag } from "../lib/flags";
import { askForNotifications, readPushPrefs, setPushPref } from "../lib/local-push";
import { t } from "../lib/i18n";
import { cardShadow } from "./AuraCard";

/* ONE QUESTION, ONCE, AFTER THE FIRST PAGE (owner decision 4, 2026-10-10).
   ────────────────────────────────────────────────────────────────────────
   Everything about recording is off until the person turns it on, and
   Settings is a long way from the moment it would make sense. So after the
   first sealed page — the only moment the offer is about something they
   just did — a small card in Notes asks once whether she may leave a small
   question each evening. Either answer is the last time it's asked; the
   switch lives in Settings after that. Nothing about the page itself is
   read or sent. */

const FLAG = "ev_ask_answered";

export function EveningAsk({ pages }: { pages: number }) {
  const wren = useWrenName();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pages < 1) return;
    let alive = true;
    void (async () => {
      const f = await getFlags();
      if (f[FLAG]) return;
      const r = await readPushPrefs();
      if (r.source === "default" && r.error) return; // can't tell whether it's already on — ask another day
      if (r.prefs.daily_line) {
        void setFlag(FLAG); // already on (Settings, or another phone): nothing to ask
        return;
      }
      /* the evening line and the morning question are one or the other (owner,
         2026-10-11): a yes here would quietly turn their morning question off,
         so someone who chose the morning is not asked — Settings has both */
      if (r.prefs.morning_question) {
        void setFlag(FLAG);
        return;
      }
      if (alive) setShow(true);
    })();
    return () => {
      alive = false;
    };
  }, [pages]);

  if (!show) return null;

  const no = () => {
    setShow(false);
    void setFlag(FLAG);
  };
  const yes = async () => {
    if (busy) return;
    setBusy(true);
    let allowed = false;
    try {
      allowed = await askForNotifications();
    } catch (e) {
      console.warn("[evening-ask] permission:", e);
    }
    if (!allowed) {
      setBusy(false);
      setShow(false);
      void setFlag(FLAG); // they said yes; iOS said no — Settings has both switches now
      Alert.alert(t("set.knock.deniedTitle"), t("set.push.deniedBody", { wren }));
      return;
    }
    try {
      await setPushPref("daily_line", true);
      setShow(false);
      void setFlag(FLAG);
    } catch (e) {
      console.warn("[evening-ask] save:", e);
      Alert.alert(t("set.cantSave"), t("set.push.saveFail")); // the card stays: nothing was answered yet
    }
    setBusy(false);
  };

  return (
    <Animated.View entering={FadeIn.duration(420)} exiting={FadeOut.duration(200)} style={[{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginTop: 4, marginBottom: 14 }, cardShadow, { shadowOpacity: 0.06 }]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <WrenBird size={26} mood="content" />
        <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 15, lineHeight: 22, color: P.ink }}>{t("ev.ask", { wren })}</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
        <Pressable accessibilityRole="button" onPress={no} hitSlop={6} style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1.2, color: P.ink60 }}>{t("ev.no")}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void yes()} disabled={busy} style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: P.pen, opacity: pressed || busy ? 0.6 : 1 })}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1.2, color: "#FFFFFF" }}>{t("ev.yes")}</Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: PF.letter, fontSize: 11.5, lineHeight: 16, color: P.ink40, marginTop: 10 }}>{t("ev.foot")}</Text>
    </Animated.View>
  );
}
