import { Redirect, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NewsCard, newsReelOf } from "../components/news-reel";
import { ReelSquare } from "../components/ReelSquare";
import { P, PF, PFM } from "../theme/post";

/* dev only — a release's reel as Wren's room will play it, without a post
   in the database. kindredly:///news-preview?v=1.0.5 — add &scene=<key> to loop one scene */
export default function NewsPreview() {
  const { v, scene } = useLocalSearchParams<{ v?: string; scene?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const id = v || "1.0.5";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ ...PFM.monoSemi, fontSize: 10.5, letterSpacing: 1.3, color: P.pen, marginBottom: 6 }}>WREN</Text>
        <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink }}>news-preview · {id}</Text>
        <View style={{ marginTop: 4 }}>
          {scene ? (() => {
            const r = newsReelOf(id);
            const one = r && r.scenes.find((x) => x.key === scene);
            return one ? <ReelSquare reel={{ bg: r!.bg, scenes: [one] }} label={scene} /> : null;
          })() : <NewsCard id={id} label={`news ${id}`} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
