import { View } from "react-native";
import type { Reel } from "../guide-reel/kit";
import { ReelSquare } from "../ReelSquare";
import { useTheme } from "../../lib/theme";
import { reel as v104 } from "./v1-0-4";

/* WHAT'S NEW, PLAYED WHERE IT'S SAID (owner, 2026-10-13: "1.0.4的时候一起发").
   A desk post can point at a release's reel with the link
   kindredly:///news/<App Store version>; this build plays the reels it
   ships with, right under the post. A post for a reel this build doesn't
   have shows only its words — and builds before 1.0.4 drop the link
   altogether (they keep http links only), so the words must stand alone. */
const NEWS: Record<string, Reel> = {
  "1.0.4": v104,
};

export const newsReelOf = (id: string): Reel | null => NEWS[id] ?? null;

/** the id in a kindredly:///news/<id> link, or null */
export const newsIdOf = (link: string | null | undefined): string | null => {
  const m = (link || "").match(/^kindredly:\/\/\/?news\/([0-9][0-9.]*)$/);
  return m ? m[1] : null;
};

export function NewsCard({ id, label }: { id: string; label: string }) {
  const T = useTheme().t;
  const reel = newsReelOf(id);
  if (!reel) return null;
  return (
    <View style={{ marginTop: 6, marginBottom: 8, maxWidth: 360, borderRadius: 18, backgroundColor: T.sf, borderWidth: 1, borderColor: T.line, overflow: "hidden" }}>
      <ReelSquare reel={reel} label={label} />
    </View>
  );
}
