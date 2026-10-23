import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, FadeIn, ZoomIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineIcon, type LineIconName } from "../../../components/10a/LineIcon";
import { monthsShort } from "../../../lib/format";
import { t } from "../../../lib/i18n";
import { ZODIAC_TEXT, zodiacKey } from "../../../lib/zodiac";
import { ageOn, clampDob, dayOf, gate, signOf, wheelYears, type Dob } from "../flow";
import { Headline, Line, ScreenFrame, TOPBAR_H } from "../parts/frame";
import * as haptics from "../parts/haptics";
import { AcidKey } from "../parts/keys";
import { NEST_SLOT_H } from "../parts/nest-egg";
import { EDGE, FONT, OB, SHADOW, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { keyAreaTop } from "./s01-geometry";
import { useGlyphFlight } from "./s03-glyph-flight";
import { PaperWheel, ROW } from "./s03-wheel";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* 3 · THE BIRTHDAY — the 18+ gate, asked neutrally (storyboard §6 · 3, §9).
   ────────────────────────────────────────────────────────────────────────
   Right after the egg, before anything of anyone else's is shown and before
   any account exists: someone under 18 is stopped after ten seconds, not
   after two minutes and a bird.

   THE WHEEL STARTS ON TODAY. Month, day and year on a paper card, the year
   column beginning at the current year (flow wheelYears), so the key stays
   dim until the wheel is actually turned — the old screen started twenty
   years back and passed untouched. A year this year or later is no one's
   answer (flow gate: "unanswered"), so turning the month first never blocks
   anybody. The wheel lives in local state; the draft gets the clamped real
   day (31 April → 30 April, the column following) once any column turns.

   NOTHING COACHES THE ANSWER. No "18+" anywhere before a date: the line
   says what the date is for ("For your star sign. The date itself stays
   private."). Once a full date is set, the sign's line glyph pops in on the
   card's corner (one of the 12 LineIcon glyphs, 24pt) and in the line
   ("♊ Gemini. That shows on your letters. Your birthday never does."), and
   the age shows small under the card for checking ("You're 25.", the kept
   ob.ageIs). The gate is checked on Next, by the flow, never automatically.

   NEXT: an adult → the ♊ shrinks into the egg's glow (kept for screen 6;
   s03-glyph-flight) and the runner makes the anonymous session; a minor →
   the runner opens 3x and remembers the block on this device.

   3x · NOT YET: "Not yet." / "Kindredly is strangers writing to strangers,
   so it's for grown-ups. Come back when you're 18." No key, no back, the egg
   gone still (the runner's), the refusal haptic once. Nothing was made: the
   session only exists once this screen passes.

   A short phone (an SE) shows three rows of the wheel instead of five. */

export default function S03Birthday(props: ObScreenProps) {
  const { height: sh } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const today = useMemo(() => dayOf(new Date(props.now())), [props]);
  const years = useMemo(() => wheelYears(today), [today]);
  const months = useMemo(() => monthsShort(), [props.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const [w, setW] = useState<Dob>(() => props.draft.dob ?? { y: today.y, m: today.m, d: today.d });
  const { overlay, fly } = useGlyphFlight();
  const badge = useRef<View>(null);
  const leaving = useRef(false);

  /* the 3x refusal, felt once */
  useEffect(() => {
    if (props.side === "underage") haptics.refuse();
  }, [props.side]);

  if (props.side === "underage") {
    return (
      <ScreenFrame ground="blue" back={null} nest>
        <Animated.View entering={FadeIn.duration(320)} style={{ marginTop: 18 }}>
          <Headline>{t("ob2.underage.head")}</Headline>
          <Line>{t("ob2.underage.line")}</Line>
          {props.changeAge ? (
            <Pressable onPress={props.changeAge} accessibilityRole="button" hitSlop={12} style={{ alignSelf: "center", marginTop: 28, paddingVertical: 8 }}>
              <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ ...FONT.semi, fontSize: 15, color: OB.white, textDecorationLine: "underline" }}>{t("ob2.underage.change")}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </ScreenFrame>
    );
  }

  const dob = props.draft.dob;
  const g = gate(dob, today);
  const answered = g !== "unanswered" && !!dob;
  const sign = answered ? signOf(dob) : null;
  const age = answered && dob ? ageOn(dob, today) : null;

  const turn = (patch: Partial<Dob>) => {
    const next = { ...w, ...patch };
    const real = clampDob(next);
    setW(real);
    props.set({ dob: real });
  };

  const onNext = () => {
    if (!props.canAdvance || leaving.current) return;
    if (g !== "adult" || reduce || !sign) {
      props.advance();
      return;
    }
    leaving.current = true;
    fly(badge.current, sign as LineIconName, OB.ink, () => props.advance());
  };

  /* five rows, or three where the phone is short */
  const bodyH = keyAreaTop(sh, { top: insets.top, bottom: insets.bottom }) - (insets.top + TOPBAR_H + NEST_SLOT_H);
  const rows = bodyH >= 400 ? 5 : 3;
  const yi = Math.max(0, years.indexOf(w.y));

  return (
    <View style={{ flex: 1 }}>
      <ScreenFrame ground="blue" back={props.back} nest primary={<AcidKey label={t("ob2.birthday.key")} disabled={!props.canAdvance} onPress={onNext} />}>
        <Headline style={{ marginTop: 8 }}>{t("ob2.birthday.head")}</Headline>
        <View style={{ minHeight: 44, justifyContent: "center", marginTop: 8 }}>
          {sign ? (
            <Animated.Text maxFontSizeMultiplier={OB_MAX_FONT} key={sign} entering={FadeIn.duration(220)} style={[TYPE.lineSmall, { color: OB.white, textAlign: "center" }]}>
              {/* the sign as a text glyph here (plain text: the line glyph is the badge on the card) */}
              {`${ZODIAC_TEXT[sign]} ${t("ob2.birthday.after", { sign: t(zodiacKey(sign)) })}`}
            </Animated.Text>
          ) : (
            <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.lineSmall, { color: OB.white, textAlign: "center" }]}>{t("ob2.birthday.before")}</Text>
          )}
        </View>

        {/* the wheel on its paper card, the sign's badge on its corner */}
        <View style={{ marginTop: 18, marginRight: SHADOW }}>
          <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: 18, backgroundColor: OB.ink }} />
          <View
            accessibilityLabel={t("ob2.birthday.wheelA11y", { month: months[w.m] ?? "", day: w.d, year: w.y })}
            style={{ borderRadius: 18, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: OB.paper, overflow: "hidden", flexDirection: "row", paddingHorizontal: 6 }}
          >
            {/* the selection band, once across the three columns */}
            <View pointerEvents="none" style={{ position: "absolute", left: 10, right: 10, top: ((rows - 1) / 2) * ROW, height: ROW, borderRadius: 10, backgroundColor: "#EFEEF8" }} />
            <PaperWheel items={months} value={w.m} rows={rows} label={t("ob2.birthday.month")} onChange={(i) => turn({ m: i })} />
            <PaperWheel items={days} value={w.d - 1} rows={rows} label={t("ob2.birthday.day")} onChange={(i) => turn({ d: i + 1 })} />
            <PaperWheel items={years} value={yi} rows={rows} label={t("ob2.birthday.year")} descending onChange={(i) => turn({ y: years[i] })} />
          </View>
          {sign && (
            <Animated.View
              key={sign}
              entering={ZoomIn.duration(300).easing(Easing.out(Easing.back(2.2)))}
              ref={badge}
              collapsable={false}
              style={{ position: "absolute", right: -14, top: -20, width: 46, height: 46, borderRadius: 23, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: OB.paper, alignItems: "center", justifyContent: "center" }}
            >
              <LineIcon name={sign as LineIconName} size={24} stroke={2} color={OB.ink} />
            </Animated.View>
          )}
        </View>

        <View style={{ height: 30, justifyContent: "center", marginTop: 10 }}>
          {age !== null && <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: OB.white, textAlign: "center", fontSize: 13.5 }]}>{t("ob.ageIs", { n: age })}</Text>}
        </View>
      </ScreenFrame>
      {overlay}
    </View>
  );
}
