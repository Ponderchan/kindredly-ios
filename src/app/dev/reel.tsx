import { Redirect, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReelSquare } from "../../components/ReelSquare";
import { reelOf } from "../../components/guide-reel";
import { GUIDE_BY_ID, type GuideId } from "../../data/guides";
import { P } from "../../theme/post";

/* dev only — one guide reel alone at the top of the screen, from its first scene, so a
   simulator pass can photograph the same moment in both renderers (batch 3, "reels"):
   kindredly:///dev/reel?id=letters|kindreds|aura|stamps|sealed|courier&n=<anything new>
   The renderer follows the "reels" switch (force it in /ui-lab?set=reels:swift|rn). Wren's room
   pins its chat to the bottom, so a reel there is half under the header. `n` remounts it. */
export default function DevReel() {
  const { id, n } = useLocalSearchParams<{ id?: string; n?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const gid = (id && id in GUIDE_BY_ID ? id : "letters") as GuideId;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ padding: 16 }}>
        <ReelSquare key={`${gid}-${n ?? ""}`} reel={reelOf(gid)} label={gid} />
      </View>
    </SafeAreaView>
  );
}
