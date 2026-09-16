/* DEV ONLY — watch her first crossing without hatching a new account:
   kindredly://first-flight-preview */
import { useRouter } from "expo-router";
import { View } from "react-native";
import { FirstFlight } from "../components/FirstFlight";
import { P } from "../theme/post";
import type { PoolLetter } from "../lib/db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ARRIVAL_AT_KEY, ARRIVAL_FRESH, setFlag } from "../lib/flags";

const DEMO = [
  { id: "a", author: "a", stamp: "cant-sleep", body: "The radiator knocks twice before it warms up and I have started counting on it.", lang: "en", created_at: "" },
  { id: "b", author: "b", stamp: "never-told", body: "Four times is not too many. I stop at the same part, so I will say it first.", lang: "en", created_at: "" },
  { id: "c", author: "c", stamp: "made-my-day", body: "Nobody buys pens for a life they have given up on.", lang: "en", created_at: "" },
] as unknown as PoolLetter[];

export default function FirstFlightPreview() {
  const router = useRouter();
  if (!__DEV__) return <View style={{ flex: 1, backgroundColor: P.penWash }} />;
  return (
    <View style={{ flex: 1, backgroundColor: P.penWash }}>
      <FirstFlight her="Sable" opener="I have started this letter four times. Each time I get as far as the part where I have to say what I actually want, and I stop." stops={DEMO} onDone={() => { void setFlag(ARRIVAL_FRESH).then(() => AsyncStorage.setItem(ARRIVAL_AT_KEY, String(Date.now()))).finally(() => router.replace("/(tabs)/letters")); }} />
    </View>
  );
}
