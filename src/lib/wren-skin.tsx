import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { WrenAccessory, WrenSkin } from "../components/WrenBird";
import { getWrenAccessory, getWrenSkin, setWrenAccessory, setWrenSkin } from "./wren-style";
import { bumpLookHeat } from "./look-heat";

/* App-wide Wren skin AND dress. WrenBird reads both when no explicit prop
   is passed, so a look or a piece chosen anywhere — her room, onboarding —
   is on her everywhere at once. The dress used to be read only by her
   room: a beanie picked at the hatch never reached the Today card. */

const SkinCtx = createContext<{ skin: WrenSkin; pick: (s: WrenSkin) => void; accessory: WrenAccessory; dress: (a: WrenAccessory) => void }>({
  skin: "sticker",
  pick: () => {},
  accessory: "none",
  dress: () => {},
});

export function WrenSkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkin] = useState<WrenSkin>("sticker");
  const [accessory, setAccessory] = useState<WrenAccessory>("none");

  useEffect(() => {
    let alive = true;
    getWrenSkin().then((s) => alive && setSkin(s));
    getWrenAccessory().then((a) => alive && setAccessory(a));
    return () => {
      alive = false;
    };
  }, []);

  // a look put on, anywhere, is one more reach for it (lib/look-heat: her card's shelf on Me
  // follows what this phone reaches for; the defaults are not counted there)
  const pick = useCallback((s: WrenSkin) => {
    setSkin(s);
    void setWrenSkin(s);
    bumpLookHeat(s);
  }, []);
  const dress = useCallback((a: WrenAccessory) => {
    setAccessory(a);
    void setWrenAccessory(a);
    bumpLookHeat(a);
  }, []);

  return <SkinCtx.Provider value={{ skin, pick, accessory, dress }}>{children}</SkinCtx.Provider>;
}

/** Just the current skin — for WrenBird's default. */
export const useWrenSkin = (): WrenSkin => useContext(SkinCtx).skin;
/** Just what she's wearing — for WrenBird's default. */
export const useWrenAccessory = (): WrenAccessory => useContext(SkinCtx).accessory;

/** Skin + dress + setters — for the pickers. */
export const useWrenSkinControl = () => useContext(SkinCtx);
