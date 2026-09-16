/* THE ONE STAGE, EVERYWHERE.
   She used to be drawn grown on every screen except the Me tab, which alone
   asked where she actually was — so the chick you hatched on onboarding
   turned into an adult the moment Today opened. This context computes her
   stage once (growth stats + the never-regressing floor + the hatchling's
   own form) and WrenBird falls back to it wherever no stage is passed.
   Screens that mean the grown bird on purpose (introductions, the fare)
   say so explicitly. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { WrenStage } from "../components/WrenBird";
import { useAuth } from "./auth";
import { collectGrowthStats } from "./stats";
import { getStageFloor, stageIndex, wrenStage } from "./wren-style";
import { getHatchlingForm, type HatchlingForm } from "./hatchling-form";

interface StageValue {
  stage: WrenStage | null; // null until the first read lands — WrenBird then draws her grown, as before
  form: HatchlingForm | null;
  refresh: () => void;
}
const Ctx = createContext<StageValue>({ stage: null, form: null, refresh: () => {} });

/* anything that changes her stage (a letter sent, onboarding done) pokes this */
const listeners = new Set<() => void>();
export function wrenStageDirty(): void {
  listeners.forEach((l) => l());
}

export function WrenStageProvider({ children }: { children: ReactNode }) {
  const { user, ready, isGuest } = useAuth();
  const [stage, setStage] = useState<WrenStage | null>(null);
  const [form, setForm] = useState<HatchlingForm | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(() => {
    if (!ready || busy.current) return;
    busy.current = true;
    Promise.all([collectGrowthStats(user?.created_at), getStageFloor(), getHatchlingForm()])
      .then(([s, floor, f]) => {
        const live = wrenStage(s);
        // a guest has no threads yet; the floor (hatch, set by onboarding) carries her
        const st = stageIndex(live) >= stageIndex(floor) ? live : floor;
        setStage(isGuest && st === "egg" ? "hatch" : st);
        setForm(f);
      })
      .catch(() => {})
      .finally(() => {
        busy.current = false;
      });
  }, [ready, user?.created_at, isGuest]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    listeners.add(refresh);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      listeners.delete(refresh);
      sub.remove();
    };
  }, [refresh]);

  return <Ctx.Provider value={{ stage, form, refresh }}>{children}</Ctx.Provider>;
}

export const useWrenStage = (): StageValue => useContext(Ctx);
