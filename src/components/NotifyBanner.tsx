import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import * as Notifications from "expo-notifications";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect } from "expo-router";
import { t, useLang } from "../lib/i18n";
import { scoped } from "../lib/scoped-store";
import { registerForReplies } from "../lib/notify";
import { replanLocal } from "../lib/local-push";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { ROW_METRICS, noticeColors, notifyBannerShows } from "./10a/kit";

/* TURN NOTIFICATIONS ON (owner, 2026-10-11, after another app's inbox).
   For someone whose phone won't let Kindredly knock, a thin bar under the
   title of Kindreds: tap it and you are taken to where it's switched on —
   iOS's own question if it has never been asked, the app's page in
   Settings if it was refused — or × it away. Dismissed, it stays away for
   two weeks on this phone, then asks once more; it never shows to a guest
   (a guest has no correspondence to be knocked about) or to anyone whose
   notifications already work. Coming back from Settings with them on, the
   device is registered at once and the bar goes.

   10a (step 5): THREE PARTS. useNotifyBanner() is the logic — where the
   phone stands, whether the bar shows, the two things it can do — for
   Kindreds (React Native or Swift, whose KNoticeBar only draws) and for
   Settings' notifications-off notice. NoticeBar is the themed view: the
   theme's lav ground with ind type (ink where ind can't be read on it;
   kit.ts noticeColors), no longer the fixed sky panel. NotifyBanner is the
   two together, as Kindreds has always placed it. */

const KEY = "kindredly_notify_banner_closed";

export type Perm = "granted" | "ask" | "settings";

/** where the phone stands: allowed, never asked (iOS's own question still available), or refused (only Settings can change it) */
export async function readPerm(): Promise<Perm> {
  const p = await Notifications.getPermissionsAsync();
  if (p.status === "granted" || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return "granted";
  return p.canAskAgain ? "ask" : "settings";
}

/** the way to turn them on: iOS's own question if it can still be asked; otherwise
    straight to Kindredly's Notifications page in Settings (iOS 16+'s
    openNotificationSettingsURLString), the app's Settings page if not */
export async function turnNotificationsOn(perm: Perm): Promise<void> {
  if (perm === "ask") {
    const r = await Notifications.requestPermissionsAsync().catch((e) => {
      console.warn("[notify] permission ask:", e);
      return null;
    });
    if (r?.status === "granted") {
      void registerForReplies();
      void replanLocal({ force: true }); // her lines (a guest's too) go in now, not at the next return
    }
    return;
  }
  await Linking.openURL("app-settings:notifications").catch(() => Linking.openSettings());
}

export type NotifyBannerState = {
  /** where the phone stands; null until the first read, and when it can't be read (say nothing then) */
  perm: Perm | null;
  /** notifications are known to be off on this phone — Settings' notice shows on this alone (guests too, and whatever × said) */
  off: boolean;
  /** Kindreds' bar shows: off, not a guest, not ×'d in the last two weeks (or the dev preview) */
  show: boolean;
  /** read the permission again (done for you on focus and on coming back to the app) */
  check: () => Promise<void>;
  /** iOS's question, or Kindredly's page in Settings; then reads the permission again */
  turnOn: () => Promise<void>;
  /** the bar's ×: away for two weeks on this phone */
  close: () => void;
};

/** The notifications-off logic, for Kindreds' bar and Settings' notice.
    `preview` (dev only; Kindreds?nb=1) shows the bar whatever the phone
    says, and each visit starts with it back, so × can be tried again. */
export function useNotifyBanner({ preview = false }: { preview?: boolean } = {}): NotifyBannerState {
  const { isGuest } = useAuth();
  const [perm, setPerm] = useState<Perm | null>(null);
  const permRef = useRef<Perm | null>(null);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const dev = __DEV__ && preview;

  const check = useCallback(async () => {
    let p: Perm | null;
    try {
      p = await readPerm();
    } catch (e) {
      console.warn("[notify] permission read:", e);
      p = null; // can't tell: say nothing rather than nag
    }
    // back from Settings with them on: register this phone at once
    if (p === "granted" && permRef.current && permRef.current !== "granted") void registerForReplies();
    permRef.current = p;
    setPerm(p);
  }, []);

  useEffect(() => {
    let live = true;
    if (dev) {
      void scoped.removeItem(KEY).catch(() => {});
      setClosedAt(null);
      setReady(true);
    } else {
      scoped
        .getItem(KEY)
        .then((v) => {
          if (live) setClosedAt(v ? Number(v) : null);
        })
        .catch((e) => console.warn("[notify] the bar's closed-at wasn't read:", e))
        .finally(() => {
          if (live) setReady(true);
        });
    }
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void check();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [check, dev]);
  useFocusEffect(
    useCallback(() => {
      void check();
    }, [check]),
  );

  const turnOn = useCallback(async () => {
    await turnNotificationsOn(permRef.current ?? "ask");
    await check();
  }, [check]);

  const close = useCallback(() => {
    const now = Date.now();
    setClosedAt(now);
    void scoped.setItem(KEY, String(now)).catch((e) => console.warn("[notify] the bar's × wasn't saved:", e));
  }, []);

  const off = perm != null && perm !== "granted";
  const show = notifyBannerShows({ ready, closedAt, now: Date.now(), preview: dev, isGuest, perm });
  return { perm, off, show, check, turnOn, close };
}

/** The bell, 16 on a 24 grid. */
function Bell({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Svg>
  );
}

/** The themed notice (KNoticeBar's twin): a bell and a line of type on the
    theme's lav, the whole line one button; `actionLabel` adds a mono line
    under it (Settings' TURN THEM ON ›); `onClose` adds the × with
    `closeLabel` for VoiceOver. Full width with the rows' 22 inset by
    default; Settings passes its own inset and rounds it with `style`.
    Every word comes in translated. */
export function NoticeBar({
  text,
  actionLabel,
  closeLabel,
  onPress,
  onClose,
  inset = ROW_METRICS.pad,
  style,
}: {
  text: string;
  actionLabel?: string;
  /** VoiceOver's name for the × (nb.close) */
  closeLabel?: string;
  onPress: () => void;
  onClose?: () => void;
  /** the left (and, without ×, right) inset of the type */
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { t: tk } = useTheme();
  const c = noticeColors(tk);
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: c.ground }, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={actionLabel ? `${text} ${actionLabel}` : text}
        style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: actionLabel ? "flex-start" : "center", gap: 8, paddingLeft: inset, paddingRight: onClose ? 0 : inset, paddingVertical: 11, opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ marginTop: actionLabel ? 1.5 : 0 }}>
          <Bell color={c.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={actionLabel ? undefined : 2} style={{ fontSize: 14, lineHeight: 19, color: c.ink }}>
            {text}
          </Text>
          {!!actionLabel && (
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.ink, marginTop: 6 }}>{actionLabel}</Text>
          )}
        </View>
      </Pressable>
      {onClose && (
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={closeLabel} style={{ paddingHorizontal: inset, paddingVertical: 11 }}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={2.2} strokeLinecap="round">
            <Path d="M5 5l14 14M19 5L5 19" />
          </Svg>
        </Pressable>
      )}
    </View>
  );
}

/** Kindreds' bar: useNotifyBanner() drawn as a NoticeBar under the title
    (nb.turnOn, × nb.close), or nothing. */
export function NotifyBanner({ preview = false, style }: { preview?: boolean; style?: StyleProp<ViewStyle> } = {}) {
  useLang();
  const bar = useNotifyBanner({ preview });
  if (!bar.show) return null;
  return (
    <NoticeBar
      text={t("nb.turnOn")}
      closeLabel={t("nb.close")}
      onPress={() => void bar.turnOn()}
      onClose={bar.close}
      style={[{ marginTop: 12 }, style]}
    />
  );
}
