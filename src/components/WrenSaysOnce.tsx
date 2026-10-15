import { useEffect, useSyncExternalStore } from "react";
import { Pressable, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { WrenBird } from "./WrenBird";
import { speakAs, useWrenName } from "../lib/wren-name";
import { getFlags, setFlag } from "../lib/flags";
import { useLetterFamily, useTheme } from "../lib/theme";
import { createOnceStore } from "./10a/once-store";

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

/* One decision per id per session, kept in a store — not in a component —
   for three reasons (components/10a/once-store has the rules, tested under
   node):
   - React runs mount effects twice in development, and the naive version
     of this ate itself: the first pass wrote the flag, the second read it
     and fell silent. Now only a screen still mounted when the flags answer
     decides, and both passes reach the same answer.
   - Once decided, the line stays for the rest of the session on every
     remount (a tab revisited, the Swift and React Native renderers swapped
     by the remote switch), until it is tapped away —
   - and the tap is kept there too (dismissWrenOnce), so a remount or a
     renderer flip can't bring back a line the reader already closed. */
const once = createOnceStore({
  read: getFlags,
  spend: setFlag,
  warn: (message, e) => console.warn(`[wren-once] ${message}:`, e),
});

/** Closes her line for the rest of the session, wherever it is drawn (the
    flag was spent when it first showed, so it won't come back on the next
    launch either). The tap on the line calls this; a Swift line's tap
    event should too. */
export function dismissWrenOnce(id: string): void {
  once.dismiss(id);
}

/** The once-logic alone — for a screen that already has a speech slot (or
    a Swift view) and wants her first-visit line IN it rather than stacked
    above it: two birds talking at the same time is a crowd, not a
    companion. True while her line for `id` should show.

    `enabled`: whether the line can actually be seen right now (Notes: only
    once it has pages; a screen that hides the line behind an empty state
    passes false). Nothing is read and the flag isn't spent until it is
    true, so a visit that couldn't show the line keeps it for the next.
    The flag is spent the moment the line is decided for a mounted screen;
    after that it shows for the rest of the session until tapped away. */
export function useWrenOnce(id: string, enabled: boolean = true): boolean {
  // re-render when any line is decided or closed
  useSyncExternalStore(once.subscribe, once.version);
  // decide only while the line can be seen; unmounting cancels the answer
  useEffect(() => (enabled ? once.decide(id) : undefined), [id, enabled]);
  return once.visible(id, enabled);
}

/** Her line, drawn in the page: the reader's own Wren at 22, and the line
    (her name swapped in by speakAs) in the letter face's italic at
    13.5/20 in sub — the serif Swift's KWrenLine sets through the reader's
    letter font. A tap closes it for the session. `wilt` greys her when she
    is starving (lib/hunger), which the caller knows. */
export function WrenSaysOnce({ id, line, enabled = true, wilt = false }: { id: string; line: string; enabled?: boolean; wilt?: boolean }) {
  const wren = useWrenName();
  const showing = useWrenOnce(id, enabled);
  const { t: tk } = useTheme();
  const italic = useLetterFamily(true);

  if (!showing) return null;

  return (
    <Animated.View entering={FadeIn.duration(420)} exiting={FadeOut.duration(200)}>
      <Pressable
        onPress={() => dismissWrenOnce(id)}
        accessibilityRole="button"
        style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 }}
      >
        <WrenBird size={22} mood="content" wilt={wilt} />
        <Text style={[{ flex: 1, fontSize: 13.5, lineHeight: 20, color: tk.sub }, italic]}>{speakAs(line, wren)}</Text>
      </Pressable>
    </Animated.View>
  );
}
