import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { EGG_SHELLS } from "../../../components/EggShell";
import { FirstFlight, type FlightColors } from "../../../components/FirstFlight";
import type { PoolLetter } from "../../../lib/db";
import { starterStamp } from "../../../lib/hatch-engine";
import { t } from "../../../lib/i18n";
import { useFocusOnMount } from "../parts/frame";
import { OB, TYPE } from "../parts/tokens";
import { useLetterFamily, useLetterFont } from "../../../lib/theme";
import { letterFitLines } from "../../../theme/post";
import type { ObScreenProps } from "../types";
import { ENV_H, ENV_W, EnvelopeFront, yourCourierName } from "./s08-envelope";
import { keptLine, useHatchRead } from "./s09-read";
import { takeFlightPool } from "./s10-pool";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* SCREEN 12 · THE FIRST FLIGHT (storyboard §6 · 12).
   ────────────────────────────────────────────────────────────────────────
   THE LETTER IS ALREADY IN THE POST. The flow posts it in the same move
   that arrives here (`posted` set before any network; the runner runs
   finish(): the letter at its floor with the stamp and the language, the
   fingerprint, the profile with both identity switches, the bird) — this
   is the "first letter sent" moment, and this screen posts nothing itself
   (in DEMO nothing leaves the phone at all).

   It plays the existing FirstFlight (3.05 s) on the run's own Shell grid
   paper (FlightColors): the great-circle loop, the three stops — the real
   letters it will bring back, fetched on 10 (s10-pool) — and the return
   with three envelopes. What the bird carries out is YOUR envelope front
   (s08-envelope: your frost window, your courier name, ♀/♂ and the sign,
   the stamp you stuck on 8). Over it, "Otis's first flight." in the run's
   type with YOUR LETTER, IN THE POST; under the chart one personal line,
   "Starlit Prism's first letter is in the air." (your courier name); TAP
   TO SKIP. A tap skips; Reduce Motion lands at once (FirstFlight's own).

   When it lands: wait for finish() (props.finished — the post and the
   saves), then on: 13, or Today when iOS already lets it knock. */

const COLORS: FlightColors = { ground: OB.shell, ink: OB.ink, sub: OB.inkSoft, faint: OB.inkSoft, card: OB.paper, accent: OB.blue };
/** your envelope under the bird, on the 390-wide chart */
const CARRY_W = 152;

export default function S12Flight(props: ObScreenProps) {
  const { draft } = props;
  // the line under the chart is content: the letter font's italic, a line more in a roomy face
  const letterKey = useLetterFont();
  const said = useLetterFamily(true);
  const { form } = useHatchRead(draft.letter);
  const [stops, setStops] = useState<PoolLetter[]>([]);
  const left = useRef(false);
  const headRef = useRef<Text>(null);
  useFocusOnMount(headRef); // VoiceOver: start the flight from its title

  useEffect(() => {
    let alive = true;
    void takeFlightPool(props.services).then((l) => alive && setStops(l));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const her = draft.wrenName.trim() || t("ob2.name.ph");
  const courier = yourCourierName(props.uid, props.lang);
  const stamp = draft.stamp ?? starterStamp(null, draft.letter);
  const s = CARRY_W / ENV_W;
  const carry = { w: Math.ceil(CARRY_W + 4 * s), h: Math.ceil(ENV_H * s + 4 * s) };

  const landed = async () => {
    if (left.current) return;
    left.current = true;
    try {
      await props.finished();
    } catch (e) {
      console.warn("[onboarding] 12: finish() failed; going on anyway:", e);
    }
    props.advance();
  };

  return (
    <View style={{ flex: 1 }}>
      <FirstFlight
        her={her}
        opener={draft.letter.trim()}
        stops={stops}
        form={form}
        mark={(EGG_SHELLS[draft.shell] ?? EGG_SHELLS[0]).mark}
        skin="sticker"
        accessory="none"
        colors={COLORS}
        head={
          <View style={{ alignItems: "center", paddingHorizontal: 24 }}>
            <Text ref={headRef} maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={[TYPE.headline, { color: OB.ink, textAlign: "center" }]}>
              {keptLine("ob.flight.plain", "ob.flight.em", { name: her })}
            </Text>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: OB.inkSoft, marginTop: 10 }]}>{t("ob2.flight.sub")}</Text>
          </View>
        }
        envelope={
          <EnvelopeFront
            uid={props.uid}
            lang={props.lang}
            pronoun={draft.pronoun}
            showMark={draft.showMark}
            showSign={draft.showSign}
            dob={draft.dob}
            now={props.now()}
            stamp={stamp}
            corner="filled"
            width={CARRY_W}
          />
        }
        envelopeSize={carry}
        line={
          !!courier && (
            <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={letterFitLines(letterKey, 2)} style={{ ...said, fontSize: 17, lineHeight: 23, color: OB.ink, textAlign: "center" }}>
              {t("ob2.flight.line", { name: courier })}
            </Text>
          )
        }
        onDone={() => void landed()}
      />
    </View>
  );
}
