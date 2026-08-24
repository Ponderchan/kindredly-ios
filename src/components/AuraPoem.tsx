import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { P, PF } from "../theme/post";

/* THE AURA IS WHAT SURVIVES REDACTION.
   ────────────────────────────────────────────────────────────────────────
   Every emblem we tried — constellation, glow, orb, stamp — was a badge
   ABOUT the writing. This is the writing. Take the writer's own
   sentences, ink out every ordinary word, and what stands is their
   voice: a poem made from them by subtraction. Which is what a voice IS —
   the words you keep reaching for after everything common is removed.

   The bars are honest: each redacted word is the real word, laid out at
   its real width, its ink turned into cover (transparent text on an ink
   ground). The poem is not written by anyone. It is found.

   The ladder reads through it:
     empty     a blank page — nothing to redact
     forming   almost everything barred; one or two words stand
     shaping+  more lines, more survivors
     formed    the poem gets its title — the archetype — and a signature

   Nothing here is generated. The sentences are the writer's; the
   surviving words are the ones they demonstrably lean on. */

export function AuraPoem({
  texts,
  keepWords,
  stage,
  dark,
  maxLines = 6,
}: {
  texts: string[];
  /** the writer's counted signature words — the survivors */
  keepWords: string[];
  stage: "empty" | "forming" | "shaping" | "clearing" | "formed";
  dark?: boolean;
  maxLines?: number;
}) {
  const keep = new Set(keepWords.map((w) => w.toLowerCase()));

  /* pick short real sentences that contain at least one survivor — each
     sentence once, however many times the writer repeated themselves */
  const seen = new Set<string>();
  const sents = texts
    .join(" ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12 && s.length <= 72)
    .filter((s) => s.split(/\s+/).some((w) => keep.has(w.toLowerCase().replace(/[^a-zà-ÿ']/g, ""))))
    .filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  const lines = sents.slice(0, stage === "forming" ? 3 : maxLines);
  const paper = dark ? "#2B2650" : P.sheet;
  const ink = dark ? "#8F87C9" : P.ink;
  const bar = dark ? "#403A6E" : P.ink;
  const kept = dark ? "#FFFFFF" : P.pen;

  if (stage === "empty" || !lines.length) {
    return (
      <View style={{ backgroundColor: paper, padding: 18, minHeight: 120, justifyContent: "center" }}>
        <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 24, color: dark ? "#8F87C9" : P.ink40 }}>
          A blank page. Nothing to redact yet.
        </Text>
      </View>
    );
  }

  let wordIndex = 0;
  return (
    <View style={{ backgroundColor: paper, paddingVertical: 16, paddingHorizontal: 18 }}>
      {lines.map((line, li) => (
        <View key={li} style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: li === lines.length - 1 ? 0 : 8 }}>
          {line.split(/\s+/).map((word, wi) => {
            const clean = word.toLowerCase().replace(/[^a-zà-ÿ']/g, "");
            const survives = keep.has(clean) && clean.length > 0;
            const i = wordIndex++;
            return (
              <Animated.View key={wi} entering={FadeIn.duration(260).delay(120 + i * 26)}>
                <Text
                  style={
                    survives
                      ? {
                          fontFamily: PF.letter,
                          fontSize: 17,
                          lineHeight: 26,
                          color: kept,
                          fontWeight: "600",
                          marginRight: 6,
                        }
                      : {
                          fontFamily: PF.letter,
                          fontSize: 17,
                          lineHeight: 26,
                          color: "transparent",
                          backgroundColor: bar,
                          marginRight: 6,
                          opacity: dark ? 0.85 : 0.9,
                        }
                  }
                >
                  {word}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
