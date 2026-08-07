import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, F, cardStyle, shadow } from "../theme/tokens";
import { EnvelopeArt } from "./EnvelopeArt";
import { MoodIcon } from "./MoodIcon";
import { Wren } from "./Wren";
import { Dots, PrimaryButton, Skip } from "./ui";
import { useBreathe } from "./anim";
import { HOOK_LETTERS, OPENERS, VOICES } from "../data/content";
import { dLong } from "../lib/format";

/* The onboarding story acts (kindredly-v20.jsx). Content faithful; motion is
   tasteful Reanimated (entrances + breathe + timed auto-advance) rather than
   the prototype's pixel-exact SVG choreography. Each is a top-level component
   so React keeps it mounted (TextInput focus safe). */

/* ── C · knock ── */
export function ActKnock({ name, onNext }: { name: string; onNext: () => void }) {
  const [lit, setLit] = useState(false);
  const breathe = useBreathe(6, 3200);
  useEffect(() => {
    const t = setTimeout(() => setLit(true), 1300);
    return () => clearTimeout(t);
  }, []);
  return (
    <Pressable
      onPress={() => lit && onNext()}
      style={{ flex: 1, backgroundColor: C.cream, alignItems: "center", justifyContent: "center", padding: 30 }}
    >
      <Animated.View style={breathe}>
        <EnvelopeArt w={228} />
      </Animated.View>
      {lit && (
        <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: "center", marginTop: 30 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink, textAlign: "center", lineHeight: 39 }}>
            {name ? `${name} — something\ncame for you.` : "Something came\nfor you."}
          </Text>
          <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 2, color: C.faint, marginTop: 24 }}>
            TAP TO PICK IT UP
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

/* ── C · read three ── */
export function ActRead({ idx, onNext, onSkip }: { idx: number; onNext: () => void; onSkip: () => void }) {
  const L = HOOK_LETTERS[idx];
  const last = idx === HOOK_LETTERS.length - 1;
  const captions = [
    "A real letter, written to nobody in particular.",
    "They will never know who opened it.",
    "Four thousand of these went out this morning.",
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <Skip onPress={onSkip} />
      <View style={{ paddingTop: 30 }}>
        <Dots i={idx} n={3} />
      </View>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <Animated.View
          key={idx}
          entering={FadeInDown.duration(560)}
          style={[cardStyle, shadow.lift, { borderRadius: 22, padding: 30, overflow: "hidden" }]}
        >
          <View style={{ position: "absolute", right: -22, bottom: -18 }}>
            <MoodIcon id={L.mood} size={124} watermark />
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 23, lineHeight: 36, color: C.ink }}>“{L.body}”</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.faint, marginTop: 22 }}>
            — {L.who}, {L.when}
          </Text>
        </Animated.View>
        <Animated.Text
          entering={FadeIn.delay(400)}
          style={{ textAlign: "center", fontFamily: F.serifItalic, fontSize: 13.5, color: C.muted, marginTop: 30, lineHeight: 22 }}
        >
          {captions[idx]}
        </Animated.Text>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <PrimaryButton label={last ? "SO — WHICH ONE IS YOU?" : "ANOTHER"} onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}

/* ── C · pick a voice ── */
export function ActPick({
  picked,
  setPicked,
  onNext,
  onSkip,
}: {
  picked: string | null;
  setPicked: (id: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (picked) {
      const t = setTimeout(() => setSettled(true), 640);
      return () => clearTimeout(t);
    }
  }, [picked]);

  if (settled) {
    const v = VOICES.find((x) => x.id === picked)!;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, alignItems: "center", justifyContent: "center", padding: 30 }}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: F.serif, fontSize: 27, color: C.ink, textAlign: "center", lineHeight: 36 }}>
            That's how I sort{"\n"}the post.
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: 14.5, color: C.muted, lineHeight: 24, marginTop: 20, textAlign: "center", maxWidth: 300 }}>
            Not by where you live. By how you write.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 22, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: C.purpleLt }}>
            <Wren size={19} mode="line" />
            <Text style={{ fontFamily: F.sansBold, fontSize: 12, color: C.purple }}>{v.read}</Text>
          </View>
        </Animated.View>
        <View style={{ position: "absolute", left: 24, right: 24, bottom: 40 }}>
          <PrimaryButton label="NOW SHOW ME YOURS" onPress={onNext} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <Skip onPress={onSkip} />
      <View style={{ paddingTop: 30 }}>
        <Dots i={3} n={5} />
      </View>
      <View style={{ paddingHorizontal: 24, paddingTop: 26 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 28, color: C.ink, letterSpacing: -0.4 }}>Which of these</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 28, color: C.purple, letterSpacing: -0.4 }}>sounds most like you?</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.muted, marginTop: 12 }}>
          Don't overthink it. Go on the sound, not the subject.
        </Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 22 }}>
        {VOICES.map((v, i) => {
          const on = picked === v.id;
          const dim = !!picked && !on;
          return (
            <Animated.View key={v.id} entering={FadeInDown.delay(120 * i).duration(500)}>
              <Pressable
                onPress={() => !picked && setPicked(v.id)}
                style={[
                  cardStyle,
                  {
                    borderRadius: 18,
                    padding: 22,
                    marginBottom: 12,
                    borderWidth: on ? 2 : 1,
                    borderColor: on ? C.purple : C.line,
                    opacity: dim ? 0.35 : 1,
                  },
                  on && shadow.glow,
                ]}
              >
                <Text style={{ fontFamily: F.serif, fontSize: 16.5, lineHeight: 26, color: C.ink }}>{v.body}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

/* ── C · write one line ── */
export function ActWrite({
  text,
  setText,
  onNext,
  onSkip,
}: {
  text: string;
  setText: (t: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const enough = text.trim().length >= 8;
  const pct = Math.min(1, text.trim().length / 40);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <Skip onPress={onSkip} />
      <View style={{ paddingTop: 30 }}>
        <Dots i={4} n={5} />
      </View>
      <View style={{ paddingHorizontal: 24, paddingTop: 26 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 28, color: C.ink, letterSpacing: -0.4 }}>Now one line</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 28, color: C.purple, letterSpacing: -0.4 }}>from you.</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.muted, marginTop: 12, lineHeight: 21 }}>
          Not a good one. A true one. That's all I need to hear how you write.
        </Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 22 }}>
        <View style={[cardStyle, { borderRadius: 20, padding: 22 }]}>
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder="Today…"
            placeholderTextColor={C.faint}
            multiline
            style={{ minHeight: 120, color: C.ink, fontFamily: F.serif, fontSize: 18, lineHeight: 32, textAlignVertical: "top" }}
          />
          <View style={{ height: 2, borderRadius: 1, backgroundColor: C.lineSoft, marginTop: 6, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: C.purple }} />
          </View>
        </View>
        {!text.trim() && (
          <Animated.View entering={FadeIn.delay(300)} style={{ marginTop: 16 }}>
            {OPENERS.map((o) => (
              <Pressable
                key={o}
                onPress={() => setText(o + " ")}
                style={{ paddingHorizontal: 16, paddingVertical: 13, marginBottom: 8, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: C.line }}
              >
                <Text style={{ fontFamily: F.serifItalic, fontSize: 15.5, color: C.muted }}>{o}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 34, paddingTop: 12 }}>
        <PrimaryButton label="SEAL AND SEND" disabled={!enough} onPress={onNext} />
        <Pressable
          onPress={() => {
            setText("Hello. I'm not sure what to say yet.");
            setTimeout(onNext, 140);
          }}
          style={{ alignItems: "center", marginTop: 15 }}
        >
          <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, letterSpacing: 1.4, color: C.faint }}>
            I'D RATHER JUST SAY HELLO
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ── C · sort (post office) ── */
export function ActSort({ text, onNext }: { text: string; onNext: () => void }) {
  const [st, setSt] = useState(0);
  const breathe = useBreathe(5, 2600);
  useEffect(() => {
    const ts = [
      setTimeout(() => setSt(1), 1500),
      setTimeout(() => setSt(2), 3200),
      setTimeout(() => setSt(3), 5000),
      setTimeout(onNext, 7400),
    ];
    return () => ts.forEach(clearTimeout);
  }, [onNext]);
  const checks = ["rhythm", "pace", "the shape of your sentences"];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.creamHi, alignItems: "center", justifyContent: "center", padding: 30 }}>
      <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 3, color: C.faint, position: "absolute", top: "14%" }}>
        KINDREDLY POST OFFICE
      </Text>
      {st === 0 && (
        <Animated.View entering={FadeIn} style={[cardStyle, { borderRadius: 18, padding: 24, maxWidth: 320 }]}>
          <Text style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 27, color: C.ink }}>
            {text.slice(0, 110)}
            {text.length > 110 ? "…" : ""}
          </Text>
        </Animated.View>
      )}
      {st >= 1 && (
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: "center" }}>
          <Animated.View style={breathe}>
            <Wren size={54} mode="line" />
          </Animated.View>
          <Text style={{ fontFamily: F.serif, fontSize: 25, color: C.ink, marginVertical: 24 }}>
            {st >= 3 ? "Sent down three streets." : "Reading how you write…"}
          </Text>
          {st < 3 &&
            checks.map((label, i) => (
              <Animated.View key={label} entering={FadeIn.delay(300 * i)} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 11 }}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 9 }}>✓</Text>
                </View>
                <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted }}>{label}</Text>
              </Animated.View>
            ))}
          {st >= 3 && (
            <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.8, color: C.faint, textAlign: "center" }}>
              THE FIRST PERSON TO ANSWER IS YOURS
            </Text>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

/* ── C · crossing ── */
export function ActCrossing({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    const t = setTimeout(onNext, 4200);
    return () => clearTimeout(t);
  }, [onNext]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.creamHi, alignItems: "center", justifyContent: "center", padding: 30 }}>
      <Animated.View entering={FadeIn.duration(700)} style={{ alignItems: "center" }}>
        <EnvelopeArt w={150} sealed={false} />
        <Text style={{ fontFamily: F.serif, fontSize: 24, color: C.ink, textAlign: "center", marginTop: 30, lineHeight: 33 }}>
          And while yours went out,{"\n"}one came the other way.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

/* ── C · the first real letter ── */
export function ActFirstLetter({
  letter,
  onSend,
  onSkip,
}: {
  letter: { body: string; ask: string; alias: string; date: string };
  onSend: (text: string) => void;
  onSkip: () => void;
}) {
  const [text, setText] = useState("");
  const [h, setH] = useState(44);
  const can = text.trim().length > 0;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ paddingTop: 24, alignItems: "center" }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 2, color: C.purple }}>✦ AT YOUR DOOR</Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 22 }}>
        <Animated.View entering={FadeInDown.duration(650)} style={[cardStyle, shadow.lift, { borderRadius: 22, padding: 28 }]}>
          <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.faint, marginBottom: 18 }}>{dLong(letter.date)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 19, lineHeight: 33, color: C.ink }}>{letter.body}</Text>
          <View style={{ marginTop: 22 }}>
            <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.faint, marginBottom: 5 }}>Write me back:</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 15.5, color: C.ink }}>{letter.ask}</Text>
          </View>
          <Text style={{ fontFamily: F.sans, fontSize: 14, color: C.muted, marginTop: 22 }}>{letter.alias}</Text>
        </Animated.View>
        <Text style={{ textAlign: "center", fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint, marginTop: 22, lineHeight: 20 }}>
          Two other doors got this one too. Nobody has answered it yet.
        </Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 26 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, backgroundColor: C.card, borderRadius: 26, padding: 8, borderWidth: 1, borderColor: C.line }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Answer them…"
            placeholderTextColor={C.faint}
            multiline
            onContentSizeChange={(e) => setH(Math.min(120, Math.max(44, e.nativeEvent.contentSize.height + 22)))}
            style={{ flex: 1, height: h, paddingHorizontal: 12, color: C.ink, fontFamily: F.sans, fontSize: 15.5, lineHeight: 22 }}
          />
          <Pressable
            onPress={() => can && onSend(text.trim())}
            disabled={!can}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: can ? C.navy : C.lineSoft, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: can ? "#fff" : C.faint, fontSize: 18 }}>→</Text>
          </Pressable>
        </View>
        <Pressable onPress={onSkip} style={{ alignItems: "center", marginTop: 15 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, letterSpacing: 1.4, color: C.faint }}>NOT NOW — KEEP IT FOR ME</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ── the desk reveals ── */
export function DeskReveal({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(251,249,243,0.96)", alignItems: "center", justifyContent: "center" }}
      pointerEvents="none"
    >
      <Wren size={44} mode="line" />
      <Text style={{ fontFamily: F.serif, fontSize: 26, color: C.ink, marginTop: 22, textAlign: "center" }}>This is your desk.</Text>
      <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, marginTop: 12 }}>The post comes at eight.</Text>
    </Animated.View>
  );
}
