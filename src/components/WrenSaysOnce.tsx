import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { P, PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { speakAs, useWrenName } from "../lib/wren-name";
import { getFlags, setFlag } from "../lib/flags";

/* SHE SAYS IT ONCE, IN THE PAGE, AND NEVER AGAIN.
   ────────────────────────────────────────────────────────────────────────
   The alternative was a coach-mark tour: a bubble with an arrow on every
   tab. Three things wrong with that here. It narrates what this product
   insists you earn by acting. It speaks in the language of an efficiency
   tool, in a world that is otherwise quiet and slow. And it teaches the
   easy thing ("this tab is X") while the actually confusing thing — "I
   wrote something, now what?" — takes days and can't fit in a tooltip.

   So instead the bird says one sentence, INLINE, the first time you stand
   somewhere new. Not an overlay: nothing is covered, nothing must be
   dismissed to continue, and the row is gone forever once seen. It reads
   as the narrator who has been talking to you since the egg, because
   that is exactly who it is. */

/* React runs mount effects twice in development, and the naive version of
   this ate itself: the first pass wrote the flag, the second read it and
   fell silent. One decision per id per session, cached here, so both
   passes reach the same answer. */
const decided = new Map<string, boolean>();

export function WrenSaysOnce({ id, line }: { id: string; line: string }) {
  const wren = useWrenName();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    const cached = decided.get(id);
    if (cached !== undefined) {
      setShow(cached);
      return;
    }
    getFlags().then((f) => {
      const should = !f[`said2:${id}`];
      decided.set(id, should);
      if (!alive) return;
      setShow(should);
      if (should) void setFlag(`said2:${id}`);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!show) return null;

  return (
    <Animated.View entering={FadeIn.duration(420)} exiting={FadeOut.duration(200)}>
      <Pressable
        onPress={() => setShow(false)}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 }}
      >
        <WrenBird size={22} bare mood="content" />
        <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 13.5, lineHeight: 20, color: P.ink60 }}>
          {speakAs(line, wren)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
