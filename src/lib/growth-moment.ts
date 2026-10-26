import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WrenStage } from "../components/WrenBird";
import { collectGrowthStats } from "./stats";
import { bumpStageFloor, getStageFloor, stageIndex, wrenStage } from "./wren-style";
import { recordStageDate } from "./whereabouts";
import { asStage, growthToShow, type GrowthMoment } from "./growth-moment-core";

/* THE GROWING-UP MOMENT'S MEMORY (see growth-moment-core). `kindredly_growth_seen` holds the last
   stage a moment was shown for (scoped per account in lib/scoped-store). Her stage is read as Me
   reads it — the counts, never below the floor — and a stage reached here is recorded the same
   way (the floor and the day it turned), so the journey's dates hold whichever screen saw it first. */

const SEEN_KEY = "kindredly_growth_seen";

export async function checkGrowth(createdAt?: string | null): Promise<GrowthMoment | null> {
  try {
    const [stats, floor, raw] = await Promise.all([collectGrowthStats(createdAt), getStageFloor(), AsyncStorage.getItem(SEEN_KEY)]);
    const live = wrenStage(stats);
    const now: WrenStage = stageIndex(live) >= stageIndex(floor) ? live : floor;
    if (stageIndex(live) > stageIndex(floor)) {
      await bumpStageFloor(live);
      await recordStageDate(live);
    }
    const { moment, seen } = growthToShow(now, asStage(raw));
    if (seen !== asStage(raw)) await AsyncStorage.setItem(SEEN_KEY, seen);
    return moment;
  } catch (e) {
    console.warn("[growth] her stage wasn't read; no moment this time:", e);
    return null;
  }
}
