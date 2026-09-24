import { useEffect } from "react";
import { Redirect, useRouter } from "expo-router";
import { setDevStarving } from "../lib/hunger";

/* dev only — her starving spell, whatever the dates: reads her as sixteen
   days hungry for this session and goes to Me. kindredly:///wilt-preview */
export default function WiltPreview() {
  const router = useRouter();
  useEffect(() => {
    if (!__DEV__) return;
    setDevStarving(true);
    router.replace("/(tabs)/me");
  }, [router]);
  if (!__DEV__) return <Redirect href="/" />;
  return null;
}
