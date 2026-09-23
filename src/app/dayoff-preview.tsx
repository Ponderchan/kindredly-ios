import { useEffect } from "react";
import { Redirect, useRouter } from "expo-router";
import { setDevDayOff } from "../lib/free-flight";

/* dev only — her day off, whatever the hour: turns it on for this session
   and goes to Me. kindredly:///dayoff-preview */
export default function DayOffPreview() {
  const router = useRouter();
  useEffect(() => {
    if (!__DEV__) return;
    setDevDayOff(true);
    router.replace("/(tabs)/me");
  }, [router]);
  if (!__DEV__) return <Redirect href="/" />;
  return null;
}
