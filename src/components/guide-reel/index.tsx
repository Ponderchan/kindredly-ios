import { View } from "react-native";
import { GUIDE_BY_ID, type GuideId } from "../../data/guides";
import { GuideArt } from "../GuideArt";
import { P } from "../../theme/post";
import type { Reel } from "./kit";
import { reel as letters } from "./letters";
import { reel as kindreds } from "./kindreds";
import { reel as aura } from "./aura";
import { reel as stamps } from "./stamps";
import { reel as sealed } from "./sealed";
import { reel as courier } from "./courier";

/* each guide's reel, one file a guide; until a guide has its own, its old
   three frames play in the big square */
const fallback = (id: GuideId): Reel => ({
  bg: P.penWash,
  scenes: GUIDE_BY_ID[id].frames.map((art) => ({
    key: art,
    ms: 3200,
    render: (s: number) => (
      <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
        <GuideArt art={art} />
      </View>
    ),
  })),
});

const REELS: Partial<Record<GuideId, Reel>> = { letters, kindreds, aura, stamps, sealed, courier };

export const reelOf = (id: GuideId): Reel => REELS[id] ?? fallback(id);

/* where each guide's button goes: the place it just explained */
export const GUIDE_HREF: Record<GuideId, string> = {
  letters: "/compose",
  kindreds: "/(tabs)/kindreds",
  aura: "/aura",
  stamps: "/stamps",
  sealed: "/(tabs)/journal",
  courier: "/courier",
};
