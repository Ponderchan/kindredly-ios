/* DEV ONLY — the hatch screen on its own, replayable, with the four shells
   to hand: kindredly:///hatch-preview. Nothing links here. */
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EGG_SHELLS } from "../components/EggShell";
import { HatchStage } from "../components/HatchStage";
import { hatch } from "../lib/hatch-engine";
import { hatchlingForm } from "../lib/hatchling-form";
import { readMood } from "../lib/wren-read";
import { F2, Y, bevel, key as keyBtn, mono } from "../theme/y2k";

const FED = ["i keep rehearsing conversations i will never have", "the kettle clicks off and for a second the flat is completely silent", "i said fine. i was not fine."];

export default function HatchPreview() {
  const [run, setRun] = useState(0);
  const [shell, setShell] = useState(1);
  const [born, setBorn] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const hatched = hatch(FED);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Y.ground }}>
      <HatchStage
        key={run}
        shell={shell}
        fed={FED}
        mood={readMood(FED.join("\n\n"))}
        form={hatchlingForm(hatched.dims)}
        dims={hatched.dims}
        skin="sticker"
        celebrate={celebrate}
        onBorn={() => setBorn(true)}
        header={
          <View style={{ paddingHorizontal: 26, paddingTop: 22, minHeight: 128 }}>
            {!born && <Text style={[mono(10, "b"), { color: Y.dim, letterSpacing: 2 }]}>READING YOU</Text>}
            <Text style={{ fontFamily: F2.serif, fontSize: born ? 34 : 30, lineHeight: born ? 39 : 35, color: Y.ink, marginTop: born ? 0 : 8 }}>
              {born ? "Something " : "It heard enough."}
              {born && <Text style={{ fontFamily: F2.serifItalic }}>hatched.</Text>}
            </Text>
            {born && <Text style={[mono(11, "r"), { color: Y.dim, marginTop: 10, lineHeight: 17 }]}>Its first word was one of yours. It caught your hidden rhythm first — the rest, it's still learning.</Text>}
          </View>
        }
      />
      <View style={{ flexDirection: "row", justifyContent: "center", paddingBottom: 8 }}>
        {EGG_SHELLS.map((s, i) => (
          <Pressable
            key={s.id}
            onPress={() => {
              setShell(i);
              setBorn(false);
              setRun((r) => r + 1);
            }}
            style={{ width: 26, height: 32, borderRadius: 13, borderWidth: 2, borderColor: shell === i ? Y.blue : Y.ink, backgroundColor: s.base, marginHorizontal: 5 }}
          />
        ))}
      </View>
      <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
        <Pressable
          onPress={() => {
            if (born) setCelebrate((c) => c + 1);
            setTimeout(() => {
              setBorn(false);
              setRun((r) => r + 1);
            }, born ? 700 : 0);
          }}
          style={[keyBtn, bevel(4, 4), { backgroundColor: Y.brass, opacity: born ? 1 : 0.4 }]}
        >
          <Text style={mono(12.5, "b")}>{born ? "GIVE IT A NAME › (REPLAY)" : "HATCHING…"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
