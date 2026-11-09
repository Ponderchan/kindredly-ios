import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { WrenBird } from "./WrenBird";
import { sheetCard, sheetKey, sheetKeyLabel } from "./sheet-chrome";
import { scrimColor, useLetterFamily, useP, useTheme } from "../lib/theme";
import { t, useLang } from "../lib/i18n";
import { useWrenName } from "../lib/wren-name";
import { fetchThreads } from "../lib/db";
import { BRAND } from "../theme/themes";
import type { RatingVariant } from "../lib/rating-ask-core";
import { useNativeSurface } from "../lib/surfaces";
import { useBirdImageRefs } from "../lib/bird-images";
import type { ImageRefRecord } from "../lib/images";
import { isKindredlyUIViewAvailable, KRatingAskView } from "../../modules/kindredly-ui";
import { SurfaceHost } from "./NativeSurface";
import { OverlaySurface, useOverlayRenderer } from "./OverlayNativeSurface";
import "../data/strings-rating-ask";

/* THE RATING ASK'S SHEET (owner, 2026-11-01; the design canvas UmibsHqWgMSwDeJ5QRcFeS).
   One of two, by lib/rating-ask-core's variant:
     letter  a letter from Mark on paper, a stamp of Wren in flight in its corner
     review  Wren, nervous (fidgeting, a bead of sweat), over her performance review with the
             reader's real numbers: letters she carried (their letters, all threads), replies
             brought home (theirs), none lost, and Apple's count of ratings when known
   The key opens the App Store's write-a-review page; Not now, the scrim or a swipe-away puts it
   away for lib/rating-ask's snooze. Under Reduce Motion nothing moves. Depth rule B: the paper and
   the card are physical things, a hard lavender shadow and no black edge. */

const MONO = "Menlo";

function useStill(): boolean {
  const [still, setStill] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setStill);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setStill);
    return () => sub.remove();
  }, []);
  return still;
}

type SheetProps = {
  open: boolean;
  variant: RatingVariant;
  ratings: number | null;
  onShown?: () => void;
  onTap: () => void;
  onLater: () => void;
};

/* SWIFT OR REACT NATIVE (2026-11-09, the "ratingsheet" switch, off by default): with the switch on
   and the binary carrying KRatingAskView, the same Modal holds the inside drawn by SwiftUI
   (RatingAskSwift below; modules/kindredly-ui Portable/Today/KRatingAsk.swift), else the React
   Native sheet as it was. components/OverlayNativeSurface picks, holds the answer while the sheet
   is up and arms the crash breadcrumb as it opens. The rules, the events and the numbers stay
   here and in lib/rating-ask*: Swift draws the words it is given and says which key was pressed.
   NB the key is also the ask's own remote switch (lib/rating-ask-core RATING_SURFACE, on unless a
   row says false): a row turning the Swift sheet off would turn the ask off with it. */
export function RatingAskSheet(props: SheetProps) {
  const { native, toRN } = useOverlayRenderer("ratingsheet", "KRatingAskView", props.open);
  // her picture is captured while Swift may draw the sheet, so she is there when it rises
  const warm = useNativeSurface("ratingsheet") && isKindredlyUIViewAvailable("KRatingAskView");
  const birds = useBirdImageRefs<"rateStamp50" | "rateWorry118">(warm ? [props.variant === "letter" ? "rateStamp50" : "rateWorry118"] : []);
  if (!props.open) return null;
  return native ? <RatingAskSwift {...props} birds={birds} onFallback={toRN} /> : <RatingAskRN {...props} />;
}

/** The two sheets' words, numbers and rows, as React Native draws them (pure but for t). */
function reviewRows(nums: { carried: number; replies: number } | null, ratings: number | null): { label: string; value: string; warn: boolean }[] {
  const rows: { label: string; value: string; warn: boolean }[] = [];
  if (nums) {
    rows.push({ label: t("ra.review.carried"), value: String(nums.carried), warn: false });
    rows.push({ label: t("ra.review.replies"), value: String(nums.replies), warn: false });
  }
  rows.push({ label: t("ra.review.lost"), value: "0", warn: false });
  if (ratings != null) rows.push({ label: t("ra.review.ratings"), value: String(ratings), warn: ratings < 10 });
  return rows;
}

/** The Modal as React Native's, its inside drawn by SwiftUI (KRatingAskView). */
function RatingAskSwift({
  variant,
  ratings,
  onShown,
  onTap,
  onLater,
  birds,
  onFallback,
}: SheetProps & { birds: Partial<Record<"rateStamp50" | "rateWorry118", ImageRefRecord>>; onFallback: () => void }) {
  useLang();
  const { key: theme, letterFont, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const wren = useWrenName();
  const review = variant === "review";
  const nums = useNumbers(review);
  const WREN = wren.toUpperCase();
  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onShow={onShown} onRequestClose={onLater}>
      <OverlaySurface
        surface="ratingsheet"
        view="KRatingAskView"
        onFallback={onFallback}
        pending={() => <View style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3) }} />}
        native={() => (
          <SurfaceHost>
            <KRatingAskView
              theme={theme}
              letterFont={letterFont}
              review={review}
              bottom={Math.max(insets.bottom - 26, 8)}
              strings={{
                cta: review ? t("ra.review.cta", { wren }) : t("ra.letter.cta"),
                later: review ? t("ra.review.later", { wren }) : t("ra.later"),
                stamp: t("ra.letter.stamp"),
                label: t("ra.letter.label", { WREN }),
                ps: t("ra.letter.ps", { wren }),
                say: t("ra.review.say"),
                reviewLabel: t("ra.review.label"),
                who: t("ra.review.who", { WREN }),
              }}
              paragraphs={review ? [] : [t("ra.letter.hi"), t("ra.letter.p1"), t("ra.letter.p2"), t("ra.letter.p3"), t("ra.letter.sign")]}
              rows={review ? reviewRows(nums, ratings) : []}
              stampBird={birds.rateStamp50 ?? null}
              worryBird={birds.rateWorry118 ?? null}
              onTap={onTap}
              onLater={onLater}
            />
          </SurfaceHost>
        )}
      />
    </Modal>
  );
}

/** The React Native sheet (the "ratingsheet" switch's fallback), as it was. */
function RatingAskRN({ open, variant, ratings, onShown, onTap, onLater }: SheetProps) {
  useLang();
  const { t: tk, dark } = useTheme();
  const insets = useSafeAreaInsets();
  if (!open) return null;
  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onShow={onShown} onRequestClose={onLater}>
      <View accessibilityViewIsModal onAccessibilityEscape={onLater} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable onPress={onLater} accessible={false} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: scrimColor(dark, 0.3) }} />
        <View style={{ marginBottom: Math.max(insets.bottom - 26, 8) }}>
          {variant === "letter" ? <LetterAsk onTap={onTap} onLater={onLater} /> : <ReviewAsk ratings={ratings} onTap={onTap} onLater={onLater} />}
        </View>
      </View>
    </Modal>
  );
}

function Keys({ cta, later, onTap, onLater }: { cta: string; later: string; onTap: () => void; onLater: () => void }) {
  const P = useP();
  const { t: tk, dark } = useTheme();
  return (
    <View style={{ gap: 6, paddingTop: 6 }}>
      <Pressable onPress={onTap} accessibilityRole="button" style={({ pressed }) => sheetKey("primary", tk, P, dark, pressed)}>
        <Text maxFontSizeMultiplier={1.4} style={sheetKeyLabel("primary", tk, P, dark)}>
          ★  {cta}
        </Text>
      </Pressable>
      <Pressable onPress={onLater} accessibilityRole="button" style={({ pressed }) => sheetKey("quiet", tk, P, dark, pressed)}>
        <Text maxFontSizeMultiplier={1.4} style={sheetKeyLabel("quiet", tk, P, dark)}>
          {later}
        </Text>
      </Pressable>
    </View>
  );
}

/* ── A · the founder's letter ─────────────────────────────────────────────── */

function LetterAsk({ onTap, onLater }: { onTap: () => void; onLater: () => void }) {
  const { t: tk, dark } = useTheme();
  const letter = useLetterFamily();
  const italic = useLetterFamily(true);
  const wren = useWrenName();
  const paper = dark ? tk.sf : "#FFFDF8";
  const shadow = dark ? tk.line : "#C9C3EE";
  const body = [{ fontSize: 16, lineHeight: 24, color: tk.ink }, letter];
  return (
    <View style={{ marginHorizontal: 12, marginTop: 24, backgroundColor: paper, borderRadius: 6, padding: 22, paddingTop: 24, gap: 10, shadowColor: shadow, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 5, height: 6 } }}>
      {/* the stamp: Wren in flight, FROM THE FOUNDER */}
      <View
        accessible={false}
        style={{ position: "absolute", top: -20, right: 16, width: 74, height: 88, backgroundColor: "#5B55FF", transform: [{ rotate: "4deg" }], alignItems: "center", justifyContent: "space-between", paddingVertical: 6, shadowColor: "#3A34D6", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 } }}
      >
        <View style={{ position: "absolute", top: 4, left: 4, right: 4, bottom: 4, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#FFFDF8" }} />
        <WrenBird size={50} pose="fly" mood="happy" />
        <Text style={{ fontFamily: MONO, fontSize: 7, fontWeight: "700", letterSpacing: 0.5, color: "#FFFFFF", textAlign: "center", lineHeight: 9 }}>{t("ra.letter.stamp")}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: "600", letterSpacing: 0.8, color: tk.mute, paddingRight: 84 }}>
        {t("ra.letter.label", { WREN: wren.toUpperCase() })}
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={body}>{t("ra.letter.hi")}</Text>
      <Text maxFontSizeMultiplier={1.4} style={body}>{t("ra.letter.p1")}</Text>
      <Text maxFontSizeMultiplier={1.4} style={body}>{t("ra.letter.p2")}</Text>
      <Text maxFontSizeMultiplier={1.4} style={body}>{t("ra.letter.p3")}</Text>
      <Text maxFontSizeMultiplier={1.4} style={body}>{t("ra.letter.sign")}</Text>
      <Keys cta={t("ra.letter.cta")} later={t("ra.later")} onTap={onTap} onLater={onLater} />
      <Text maxFontSizeMultiplier={1.3} style={[{ fontSize: 13.5, lineHeight: 19, color: tk.mute }, italic]}>
        {t("ra.letter.ps", { wren })}
      </Text>
    </View>
  );
}

/* ── B · Wren's performance review ────────────────────────────────────────── */

function useNumbers(on = true): { carried: number; replies: number } | null {
  const [n, setN] = useState<{ carried: number; replies: number } | null>(null);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    void fetchThreads().then((th) => {
      if (!alive || !th) return;
      setN({ carried: th.reduce((s, x) => s + x.mine, 0), replies: th.reduce((s, x) => s + x.theirs, 0) });
    });
    return () => {
      alive = false;
    };
  }, [on]);
  return n;
}

function ReviewAsk({ ratings, onTap, onLater }: { ratings: number | null; onTap: () => void; onLater: () => void }) {
  const { t: tk, dark } = useTheme();
  const wren = useWrenName();
  const said = useLetterFamily();
  const nums = useNumbers();
  const still = useStill();
  const shadow = dark ? tk.line : "#C9C3EE";

  // her fidget (a sway, a hop now and then), the sweat bead, the speech bubble rising in
  const fidget = useRef(new Animated.Value(0)).current;
  const sweat = useRef(new Animated.Value(0)).current;
  const bubble = useRef(new Animated.Value(still ? 1 : 0)).current;
  useEffect(() => {
    if (still) {
      bubble.setValue(1);
      return;
    }
    Animated.spring(bubble, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.timing(fidget, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true }));
    const drip = Animated.loop(Animated.timing(sweat, { toValue: 1, duration: 3200, easing: Easing.in(Easing.quad), useNativeDriver: true }));
    loop.start();
    drip.start();
    return () => {
      loop.stop();
      drip.stop();
    };
  }, [still, fidget, sweat, bubble]);
  const rotate = fidget.interpolate({ inputRange: [0, 0.08, 0.16, 0.24, 0.32, 0.6, 0.66, 0.72, 1], outputRange: ["0deg", "-4deg", "3deg", "-2deg", "0deg", "0deg", "6deg", "0deg", "0deg"] });
  const hop = fidget.interpolate({ inputRange: [0, 0.08, 0.16, 0.24, 0.32, 0.6, 0.66, 0.72, 1], outputRange: [0, -3, 0, -2, 0, 0, -8, 0, 0] });
  const dropY = sweat.interpolate({ inputRange: [0, 0.4, 0.48, 0.8, 1], outputRange: [0, 0, 0, 22, 30] });
  const dropO = sweat.interpolate({ inputRange: [0, 0.4, 0.48, 0.8, 0.9, 1], outputRange: [0, 0, 1, 1, 0, 0] });

  const rows = reviewRows(nums, ratings);

  return (
    <View>
      <Animated.View
        style={{
          alignSelf: "flex-start",
          marginLeft: 24,
          maxWidth: 250,
          backgroundColor: tk.sf,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          paddingVertical: 12,
          paddingHorizontal: 15,
          shadowColor: shadow,
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 3, height: 3 },
          opacity: bubble,
          transform: [{ translateY: bubble.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }}
      >
        <Text maxFontSizeMultiplier={1.4} style={[{ fontSize: 16, lineHeight: 22, color: tk.ink }, said]}>
          {t("ra.review.say")}
        </Text>
      </Animated.View>
      <Animated.View accessible={false} style={{ alignSelf: "flex-end", marginRight: 34, marginTop: -4, marginBottom: -24, zIndex: 2, transform: [{ translateY: hop }, { rotate }] }}>
        <WrenBird size={118} mood="worry" />
        <Animated.View style={{ position: "absolute", top: 18, left: 16, opacity: dropO, transform: [{ translateY: dropY }] }}>
          <Svg width={11} height={15} viewBox="0 0 12 16">
            <Path d="M6 1C6 1 1 8 1 11a5 5 0 0 0 10 0C11 8 6 1 6 1z" fill="#8FC8F2" />
          </Svg>
        </Animated.View>
      </Animated.View>
      <View style={[sheetCard(tk, 0), { marginHorizontal: 12, paddingHorizontal: 20, paddingTop: 20, gap: 8, shadowColor: shadow, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 5, height: 6 } }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: "700", letterSpacing: 1, color: tk.ind, flexShrink: 1 }}>
            {t("ra.review.label")}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: MONO, fontSize: 11.5, color: tk.mute, flexShrink: 1 }}>
            {t("ra.review.who", { WREN: wren.toUpperCase() })}
          </Text>
        </View>
        <View>
          {rows.map((r, i) => (
            <View key={r.label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderStyle: "dashed", borderColor: tk.line }}>
              <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, color: tk.ink, flexShrink: 1 }}>
                {r.label}
              </Text>
              <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: MONO, fontSize: 15, fontWeight: "600", color: r.warn ? BRAND.postRed : tk.ink, fontVariant: ["tabular-nums"] }}>
                {r.value}
              </Text>
            </View>
          ))}
        </View>
        <Keys cta={t("ra.review.cta", { wren })} later={t("ra.review.later", { wren })} onTap={onTap} onLater={onLater} />
      </View>
    </View>
  );
}
