import { Pressable, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useCornerKeyOwn } from "../lib/corner-key";
import { useFoldFrame } from "../lib/fold";
import { t, useLang } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import "../data/strings-step5-kitrn";

/* THE CORNER KEY, DRAWN (lib/corner-key; iPhone Duo). Over every page pushed on top of the tabs,
   in the foot corner of the system's band: where the + stands on the tabs, so the thumb finds
   the way out where it found the way in. A round soft key, the size of the +'s disc and on its
   centre line; an arrow that goes back, or the page's own ✕ when it has named one.

   Not on the tabs (the + is there; except Today while it is replying on the inner screen, where
   the tab bar has stepped out and this ✕ is the way back), not on the launch piece or onboarding (they are the whole
   window and have no way back), and not on the pages iOS presents as its own sheets (the
   paywall, the Stamp Press, the face maker): those cover this layer and close themselves.
   On a phone that doesn't fold there is no band, and this draws nothing. */

const SIZE = 50;
/** the +'s place in the rail (KTabBarMetrics: the 62 square, railFoot over the safe area) */
const POD = 62;
const FOOT = 6;
const WHOLE = new Set(["(tabs)", "onboarding", "index", "+not-found", "paywall", "stamp-press", "make-face", "auth-callback"]);

export function FoldCornerKey() {
  useLang();
  const frame = useFoldFrame();
  const segments = useSegments() as string[];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tk } = useTheme();
  const own = useCornerKeyOwn();

  const root = segments[0];
  if (!frame.rail || !root) return null;
  // a tab names a key only while it has sent the tab bar away (Today's reply on the inner
  // screen): then this stands where the + stood, and is the way back out of the reply
  const tabOwn = root === "(tabs)" && !!own;
  if (WHOLE.has(root) && !tabOwn) return null;
  if (!own && !router.canGoBack()) return null;

  const kind = own?.kind ?? "back";
  const press = () => (own ? own.onPress() : router.back());
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: (frame.band - SIZE) / 2,
        bottom: Math.max(insets.bottom, 16) + FOOT + (POD - SIZE) / 2,
      }}
    >
      <Pressable
        onPress={press}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={own?.label ?? t("a11y.back")}
        style={({ pressed }) => ({
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tk.soft,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24">
          {kind === "close" ? (
            <Path d="M6 6l12 12M18 6L6 18" stroke={tk.ink} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          ) : (
            <Path d="M14.5 5.5L8 12l6.5 6.5" stroke={tk.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </Svg>
      </Pressable>
    </View>
  );
}
