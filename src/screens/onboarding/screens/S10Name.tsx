import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { t } from "../../../lib/i18n";
import type { PronounId } from "../../../lib/pronouns";
import { NAME_IDEAS, WREN_NAME_MAX, isReservedName } from "../../../lib/wren-name";
import { Headline, Line, ScreenFrame } from "../parts/frame";
import * as haptics from "../parts/haptics";
import { AcidKey } from "../parts/keys";
import { EDGE, FONT, OB, SHADOW, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { Chick, type Nudge } from "./s10-chick";
import { prefetchFlightPool } from "./s10-pool";
import { useHatchRead } from "./s09-read";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* SCREEN 10 · NAME IT (storyboard §6 · 10).
   ────────────────────────────────────────────────────────────────────────
   Post-birth, on Shell: no ‹, no pips — the form is over and this is the
   first thing you do FOR someone. The chick stands where it hatched, with
   a little name tag that fills in as you type (a chirp per letter), over
   "It needs a name." / "It'll sign every note it writes you."; the field
   (the system font, "Otis" as its placeholder) with the dice in it; six
   idea chips (PIP · JUNO · OTIS · MOTH · BEA · FEN, all from lib/wren-name
   NAME_IDEAS); and AND OTIS GOES BY with she · he · they. It is "it" until
   here; every line after this screen uses the pronoun picked.

   "Wren" is the courier's own name — the official desk at the top of
   Kindreds — so it is refused (the kept ob.naming.reserved line shows, and
   the flow keeps the key dim). The pool is prefetched as this screen opens
   (s10-pool), so the three letters the first flight brings back are real.

   "That's Otis" (with the name typed): the chick hops and the run goes on —
   to 11 for someone without an account, straight to 12 for an account.
   The keyboard is not raised on arrival (the chips name it in one tap);
   while it is up the chick steps back small so the field stays in view. */

/** the storyboard's six, in its order (every one is in NAME_IDEAS) */
const IDEAS = ["Pip", "Juno", "Otis", "Moth", "Bea", "Fen"].filter((n) => NAME_IDEAS.includes(n));
const PRONOUN_IDS: PronounId[] = ["she", "he", "they"];

export default function S10Name(props: ObScreenProps) {
  const { draft } = props;
  const { form, mood } = useHatchRead(draft.letter);
  const [nudge, setNudge] = useState<Nudge>({ n: 0, re: "chirp" });
  const [kb, setKb] = useState(false);
  const leaving = useRef(false);
  const name = draft.wrenName;
  const trimmed = name.trim();
  const reserved = isReservedName(trimmed);
  const poke = (re: Nudge["re"]) => setNudge((x) => ({ n: x.n + 1, re }));

  useEffect(() => {
    prefetchFlightPool(props.services);
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKb(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKb(false));
    return () => {
      show.remove();
      hide.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const type = (v: string) => {
    if (v.length > name.length) {
      haptics.chirp();
      poke("chirp");
    }
    props.set({ wrenName: v });
  };
  const pick = (n: string) => {
    haptics.tick();
    poke("happy");
    props.set({ wrenName: n });
  };
  const roll = () => {
    const pool = NAME_IDEAS.filter((n) => n !== trimmed);
    pick(pool[Math.floor(Math.random() * pool.length)]);
  };
  const go = () => {
    if (!props.canAdvance || leaving.current) return;
    leaving.current = true;
    Keyboard.dismiss();
    poke("happy");
    setTimeout(() => props.advance(), 280);
  };

  const shown = trimmed || t("ob2.name.ph");
  return (
    <ScreenFrame ground="shell" keyboard primary={<AcidKey label={t("ob2.name.key", { name: shown })} disabled={!props.canAdvance} onPress={go} />}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", paddingBottom: 16 }}>
        <Chick shell={draft.shell} form={form} mood={mood} size={kb ? 64 : 104} nudge={nudge} tag={trimmed ? trimmed.toLocaleUpperCase() : null} name={trimmed || null} />
        <Headline on="shell" style={{ marginTop: 10 }}>
          {t("ob2.name.head")}
        </Headline>
        <Line on="shell" small style={{ color: OB.inkSoft, marginTop: 6 }}>
          {t("ob2.name.line")}
        </Line>

        {/* the field, with the dice in it */}
        <View style={{ alignSelf: "stretch", marginTop: 18, height: 60 + SHADOW }}>
          <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: 0, height: 60, borderRadius: 14, backgroundColor: OB.ink }} />
          <View style={{ height: 60, marginRight: SHADOW, borderRadius: 14, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: OB.paper, flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 10 }}>
            <TextInput maxFontSizeMultiplier={OB_MAX_FONT}
              value={name}
              onChangeText={type}
              autoCorrect={false}
              autoCapitalize="words"
              maxLength={WREN_NAME_MAX}
              placeholder={t("ob2.name.ph")}
              placeholderTextColor="rgba(74,70,100,0.55)"
              selectionColor={OB.blue}
              keyboardAppearance="light"
              returnKeyType="done"
              onSubmitEditing={go}
              accessibilityLabel={t("ob2.name.head")}
              style={{ flex: 1, height: 54, ...FONT.medium, fontSize: 23, color: OB.ink }}
            />
            <Pressable
              onPress={roll}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("ob2.name.dice")}
              style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 10, borderWidth: 2, borderColor: OB.ink, backgroundColor: pressed ? OB.acidDown : OB.paper, alignItems: "center", justifyContent: "center" })}
            >
              <Dice />
            </Pressable>
          </View>
        </View>

        {/* six ideas */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 5, marginTop: 14 }}>
          {IDEAS.map((n) => (
            <Chip key={n} label={n.toLocaleUpperCase()} on={trimmed === n} onPress={() => pick(n)} small />
          ))}
        </View>

        {/* and what to call it */}
        <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: OB.inkSoft, marginTop: 22 }]}>
          {trimmed ? t("ob.naming.goesBy", { name: trimmed.toLocaleUpperCase() }) : t("ob.naming.goesByThey")}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          {PRONOUN_IDS.map((p) => (
            <Chip
              key={p}
              label={t(`ob2.name.${p}`)}
              on={draft.wrenPronoun === p}
              onPress={() => {
                haptics.tick();
                poke("tilt");
                props.set({ wrenPronoun: p });
              }}
            />
          ))}
        </View>
        {reserved && <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: OB.inkSoft, textAlign: "center", marginTop: 14 }]}>{t("ob.naming.reserved")}</Text>}
      </ScrollView>
    </ScreenFrame>
  );
}

/** A chip: white with an ink edge; picked, acid on a hard ink shadow. */
function Chip({ label, on, onPress, small = false }: { label: string; on: boolean; onPress: () => void; small?: boolean }) {
  const h = small ? 34 : 44;
  const sh = small ? 2 : 3;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} hitSlop={4} style={{ height: h + sh }}>
      {on && <View style={{ position: "absolute", left: sh, top: sh, right: -sh, height: h, borderRadius: h / 2, backgroundColor: OB.ink }} />}
      <View
        style={{
          height: h,
          minWidth: small ? 0 : 92,
          paddingHorizontal: small ? 9 : 18,
          borderRadius: h / 2,
          borderWidth: small ? 2 : 2.5,
          borderColor: OB.ink,
          backgroundColor: on ? OB.acid : OB.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text maxFontSizeMultiplier={OB_MAX_FONT} style={small ? { ...FONT.bold, fontSize: 12, letterSpacing: 0.3, color: OB.ink } : { ...FONT.bold, fontSize: 17, color: OB.ink }}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** the dice, in ink */
function Dice({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={18} height={18} rx={4} fill="none" stroke={OB.ink} strokeWidth={2.2} />
      <Circle cx={8.5} cy={8.5} r={1.9} fill={OB.ink} />
      <Circle cx={15.5} cy={8.5} r={1.9} fill={OB.ink} />
      <Circle cx={8.5} cy={15.5} r={1.9} fill={OB.ink} />
      <Circle cx={15.5} cy={15.5} r={1.9} fill={OB.ink} />
      <Circle cx={12} cy={12} r={1.9} fill={OB.ink} />
    </Svg>
  );
}
