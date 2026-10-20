import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SCREEN_NO, SIDE_NO, SKIP_KIND, eggPlace, groundOf, labelOf } from "../flow";
import { ScreenFrame } from "../parts/frame";
import { AcidKey, TextKey } from "../parts/keys";
import { FONT, ON_GROUND, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { OB_MAX_FONT } from "../parts/tokens";

/* SCAFFOLD — the stand-in each screen file draws until its screen agent
   replaces it (CONTRACT.md: the 1–6 agent owns S01–S06, the 7–13 agent
   S07–S13). It is a working screen in every way the run cares about: the
   ground, the frame (back, the nest slot, the key area), the primary key
   wired to advance(), the text key to skip(), and buttons for the side
   states and for the answers the screen collects, so the whole run can be
   walked end to end in DEMO before any real screen exists. Delete this file
   once no screen imports it. */

export function Placeholder({
  props,
  name,
  note,
  keyLabel = "Next",
  skipLabel,
  children,
}: {
  props: ObScreenProps;
  name: string;
  note?: string;
  keyLabel?: string;
  skipLabel?: string;
  children?: ReactNode;
}) {
  const { draft, side } = props;
  const g = groundOf(draft.screen, draft);
  const ink = ON_GROUND[g];
  const hasSkip = !!SKIP_KIND[draft.screen] && SKIP_KIND[draft.screen] !== "tap";
  return (
    <ScreenFrame
      ground={g}
      back={props.back}
      nest={eggPlace(draft.screen) === "nest"}
      primary={side === "underage" ? null : <AcidKey label={keyLabel} disabled={!props.canAdvance} onPress={() => props.advance()} />}
      secondary={hasSkip && side !== "underage" ? <TextKey label={skipLabel ?? "Skip"} on={g} onPress={props.skip} /> : null}
    >
      <ScrollView contentContainerStyle={{ paddingVertical: 12 }} keyboardShouldPersistTaps="handled">
        <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: ink, textAlign: "center" }]}>
          PLACEHOLDER · {labelOf(draft.screen, side)} · {SCREEN_NO[draft.screen]}/13
        </Text>
        <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.headline, { color: ink, textAlign: "center", marginTop: 8 }]}>{side ? `${name} — ${SIDE_NO[side]}` : name}</Text>
        {!!note && <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.lineSmall, { color: ink, textAlign: "center", marginTop: 8 }]}>{note}</Text>}
        <View style={{ marginTop: 16, gap: 8 }}>{children}</View>
      </ScrollView>
    </ScreenFrame>
  );
}

/** A small outlined button for the scaffold's controls. */
export function PBtn({ label, onPress, on, active = false }: { label: string; onPress: () => void; on: ObScreenProps["draft"]["screen"] | "blue" | "shell" | "paper"; active?: boolean }) {
  const g = on === "blue" || on === "shell" || on === "paper" ? on : groundOf(on);
  const ink = ON_GROUND[g];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ borderWidth: 1.5, borderColor: ink, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: active ? ink : "transparent", opacity: pressed ? 0.6 : 1 })}
    >
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ ...FONT.semi, fontSize: 14, color: active ? (g === "blue" ? "#5B55FF" : "#FFFFFF") : ink, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}
