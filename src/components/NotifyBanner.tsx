import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Pressable, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect } from "expo-router";
import { t, useLang } from "../lib/i18n";
import { scoped } from "../lib/scoped-store";
import { registerForReplies } from "../lib/notify";
import { useAuth } from "../lib/auth";
import { ROW } from "./ChatRowStyle";

/* TURN NOTIFICATIONS ON (owner, 2026-10-11, after another app's inbox).
   For someone whose phone won't let Kindredly knock, a thin bar under the
   title of Kindreds: tap it and you are taken to where it's switched on —
   iOS's own question if it has never been asked, the app's page in
   Settings if it was refused — or × it away. Dismissed, it stays away for
   two weeks on this phone, then asks once more; it never shows to a guest
   (a guest has no correspondence to be knocked about) or to anyone whose
   notifications already work. Coming back from Settings with them on, the
   device is registered at once and the bar goes. */

const KEY = "kindredly_notify_banner_closed";
const QUIET_MS = 14 * 24 * 3600 * 1000;

type Perm = "granted" | "ask" | "settings";

async function readPerm(): Promise<Perm> {
  const p = await Notifications.getPermissionsAsync();
  if (p.status === "granted" || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return "granted";
  return p.canAskAgain ? "ask" : "settings";
}

export function NotifyBanner({ preview = false }: { preview?: boolean } = {}) {
  useLang();
  const { isGuest } = useAuth();
  const [perm, setPerm] = useState<Perm | null>(null);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const check = useCallback(async () => {
    try {
      const p = await readPerm();
      setPerm((prev) => {
        if (p === "granted" && prev && prev !== "granted") void registerForReplies();
        return p;
      });
    } catch {
      setPerm("granted"); // can't tell: say nothing rather than nag
    }
  }, []);

  useEffect(() => {
    let live = true;
    // dev preview: each visit starts with the bar back, so × can be tried again
    if (__DEV__ && preview) {
      void scoped.removeItem(KEY).catch(() => {});
      setClosedAt(null);
      setReady(true);
    } else {
      scoped.getItem(KEY)
        .then((v) => { if (live) setClosedAt(v ? Number(v) : null); })
        .catch(() => {})
        .finally(() => { if (live) setReady(true); });
    }
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") void check(); });
    return () => {
      live = false;
      sub.remove();
    };
  }, [check, preview]);
  useFocusEffect(useCallback(() => { void check(); }, [check]));

  /* × always closes it — even in the dev preview (Kindreds?nb=1 only stands
     in for "notifications are off") */
  const closed = !!closedAt && Date.now() - closedAt < QUIET_MS;
  const off = (__DEV__ && preview) || (!isGuest && !!perm && perm !== "granted");
  const show = ready && !closed && off;
  if (!show) return null;

  const turnOn = async () => {
    if (perm === "ask") {
      const r = await Notifications.requestPermissionsAsync().catch(() => null);
      if (r?.status === "granted") void registerForReplies();
      void check();
      return;
    }
    /* straight to Kindredly's own Notifications page in Settings (iOS 16+'s
       openNotificationSettingsURLString); the app's Settings page if not */
    Linking.openURL("app-settings:notifications").catch(() => Linking.openSettings());
  };
  const close = () => {
    const now = Date.now();
    setClosedAt(now);
    void scoped.setItem(KEY, String(now)).catch(() => {});
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#EEF5FD", marginTop: 12 }}>
      <Pressable onPress={() => void turnOn()} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: ROW.pad, paddingVertical: 11, opacity: pressed ? 0.6 : 1 })}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={ROW.blue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </Svg>
        <Text numberOfLines={2} style={{ flex: 1, fontSize: 14, lineHeight: 19, color: ROW.blue }}>{t("nb.turnOn")}</Text>
      </Pressable>
      <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("nb.close")} style={{ paddingHorizontal: ROW.pad, paddingVertical: 11 }}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={ROW.blue} strokeWidth={2.2} strokeLinecap="round">
          <Path d="M5 5l14 14M19 5L5 19" />
        </Svg>
      </Pressable>
    </View>
  );
}
