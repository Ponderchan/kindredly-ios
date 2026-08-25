import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./auth";
import { fetchEntitlement } from "./api";
import { IAP_READY, iapCheckPremium, iapConfigure } from "./iap";

/* Unified Kindredly+ state. Premium is true if EITHER the server entitlement
   (subscriptions table, fed by the Creem *or* RevenueCat webhook) OR the live
   RevenueCat customer info says so. Server is the durable source of truth; RC
   gives an instant post-purchase signal before the webhook round-trips. */

interface EntValue {
  premium: boolean;
  loading: boolean;
  plan: string | null;
  status: string | null;
  /* A COFOUNDER IS A PERSON, NOT A RECEIPT. The lifetime fare buys a
     standing in the product — a number, in the order they arrived — so it
     has to exist as identity here, not as a boolean on a purchase. Every
     surface that marks a cofounder reads these two fields. */
  cofounder: boolean;
  cofounderNo: number | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<EntValue | null>(null);
export function useEntitlement(): EntValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEntitlement must be used within EntitlementProvider");
  return v;
}

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [premium, setPremium] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [cofounderNo, setCofounderNo] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setPremium(false);
      setPlan(null);
      setStatus(null);
      setCofounderNo(null);
      return;
    }
    setLoading(true);
    try {
      if (IAP_READY) await iapConfigure(user.id);
      const [server, rc] = await Promise.all([
        fetchEntitlement(),
        IAP_READY ? iapCheckPremium() : Promise.resolve(null),
      ]);
      setPremium(!!server?.premium || rc === true);
      setPlan(server?.plan ?? null);
      setStatus(server?.status ?? null);
      setCofounderNo(typeof server?.cofounder_no === "number" ? server.cofounder_no : null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Ctx.Provider
      value={{ premium, loading, plan, status, cofounder: cofounderNo != null, cofounderNo, refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}
