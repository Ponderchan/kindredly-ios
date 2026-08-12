import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { WrenSkin } from "../components/WrenBird";
import { getWrenSkin, setWrenSkin } from "./wren-style";

/* App-wide Wren skin. WrenBird reads this when no explicit skin prop is
   passed, so switching the look updates every Wren at once. */

const SkinCtx = createContext<{ skin: WrenSkin; pick: (s: WrenSkin) => void }>({
  skin: "sticker",
  pick: () => {},
});

export function WrenSkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkin] = useState<WrenSkin>("sticker");

  useEffect(() => {
    let alive = true;
    getWrenSkin().then((s) => alive && setSkin(s));
    return () => {
      alive = false;
    };
  }, []);

  const pick = useCallback((s: WrenSkin) => {
    setSkin(s);
    void setWrenSkin(s);
  }, []);

  return <SkinCtx.Provider value={{ skin, pick }}>{children}</SkinCtx.Provider>;
}

/** Just the current skin — for WrenBird's default. */
export const useWrenSkin = (): WrenSkin => useContext(SkinCtx).skin;

/** Skin + setter — for the picker in Me. */
export const useWrenSkinControl = () => useContext(SkinCtx);
