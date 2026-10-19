import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking } from "react-native";
import { t, useLang } from "../../lib/i18n";
import { speakAs, useWrenName } from "../../lib/wren-name";
import { useEntitlement } from "../../lib/entitlement";
import { useFares } from "../../lib/fares";
import { IAP_READY, iapPurchase, iapRestore, type IapPackage } from "../../lib/iap";
import { clearCofounderCache, fetchSeatsLeft } from "../../lib/cofounder-seats";
import { openPrivacy, openTerms } from "../../lib/legal";
import { track, type PaywallSource } from "../../lib/track";
import { visibleBenefits, type FcBenefitId } from "../../data/fc-benefits";
import { buildPaywallView, type Fare, type PaywallView } from "./paywall-model";
import "../../data/strings-me4a";

/* THE FIRST CLASS PAGE'S HOOK (Me 4a, ME4A §2.3). Gathers the facts —
   RevenueCat's fares (lib/fares, one fetch per launch), the seats left
   (cofounder_seats_left, web 0036; null until the owner runs it), the
   entitlement, the courier's name, the benefit rows the build can reach —
   and hands paywall-model's pure view to the Swift page (PaywallNative).

   Buying stays here, in the existing React Native RevenueCat code: buy(id)
   is PaywallBody's subscribe() moved over line for line (the IAP_READY /
   raw check with the "almost" Alert, track, iapPurchase, refresh, then the
   welcome, or the failure Alert); restore() is its restore(). Swift only
   says which fare and shows `busy`.

   `dev` (src/app/dev/me4a-fc.tsx only) overrides the facts the account
   can't show: the seats answer, member and cofounder states, the flags. */

export type PaywallDev = {
  /** undefined: ask the server; a number or null: pretend it answered that */
  seatsLeft?: number | null;
  premium?: boolean;
  cofounderNo?: number | null;
  flags?: Partial<Record<FcBenefitId, boolean>>;
};

export type PaywallModel = {
  view: PaywallView;
  busy: boolean;
  /** "plus" or "lifetime" once a purchase went through: the route shows the welcome */
  welcome: "plus" | "lifetime" | null;
  act: {
    close: () => void;
    select: (id: string) => void;
    buy: (id: string) => void;
    restore: () => void;
    manage: () => void;
    terms: () => void;
    privacy: () => void;
  };
};

const asPackage = (f: Fare): IapPackage => ({ id: f.id, priceString: f.priceString, title: f.period, period: f.period, raw: f.raw });

export function usePaywall({ source, lead, onClose, dev }: { source: PaywallSource; lead?: string; onClose: () => void; dev?: PaywallDev }): PaywallModel {
  const lang = useLang();
  const wren = useWrenName();
  const ent = useEntitlement();
  const fares = useFares();
  const [seats, setSeats] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState<"plus" | "lifetime" | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    track("paywall_shown", { source });
  }, [source]);
  useEffect(() => {
    let alive = true;
    fetchSeatsLeft().then((n) => alive && setSeats(n));
    return () => {
      alive = false;
    };
  }, []);

  const premium = dev?.premium ?? ent.premium;
  const cofounderNo = dev && "cofounderNo" in dev ? (dev.cofounderNo ?? null) : ent.cofounderNo;
  const seatsLeft = dev && "seatsLeft" in dev ? (dev.seatsLeft ?? null) : seats;
  const flags = dev?.flags;

  const view = useMemo(
    () =>
      buildPaywallView(
        { fares, seatsLeft, premium, cofounderNo, wren, benefits: visibleBenefits(flags), lead },
        { t, upper: (s) => s.toLocaleUpperCase(), speak: (s) => speakAs(s, wren) },
      ),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fares, seatsLeft, premium, cofounderNo, wren, flags, lead, lang],
  );

  const fareOf = useCallback((id: string | null) => fares.fares.find((f) => f.id === id) ?? null, [fares]);
  const current = fareOf(chosen ?? view.initialFare);

  const close = useCallback(() => {
    track("paywall_dismissed", { source, fare: current?.period ?? "none" });
    onClose();
  }, [source, current, onClose]);

  const select = useCallback(
    (id: string) => {
      setChosen(id);
      const f = fareOf(id);
      if (f) track("fare_selected", { source, fare: f.period });
    },
    [fareOf, source],
  );

  const buy = useCallback(
    async (id: string) => {
      const f = fareOf(id);
      if (!f || busy) return;
      if (!IAP_READY || !f.raw) {
        Alert.alert(t("pw.almost.title"), t("pw.almost.body"));
        return;
      }
      setBusy(true);
      track("purchase_started", { source, fare: f.period, price: f.priceString });
      const res = await iapPurchase(asPackage(f));
      setBusy(false);
      if (res.ok) {
        track("purchase_done", { source, fare: f.period, price: f.priceString });
        clearCofounderCache();
        await ent.refresh();
        setWelcome(f.period === "lifetime" ? "lifetime" : "plus");
      } else if (!res.cancelled) {
        track("purchase_failed", { source, fare: f.period });
        Alert.alert(t("pw.purchase.title"), t("pw.purchase.fail"));
      }
    },
    [fareOf, busy, source, ent],
  );

  const restore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const ok = await iapRestore();
    setBusy(false);
    await ent.refresh();
    Alert.alert(ok ? t("pw.restored") : t("pw.nothingRestore"), ok ? t("pw.restoredBody") : t("pw.nothingRestoreBody"));
  }, [busy, ent]);

  const manage = useCallback(() => {
    Linking.openURL("https://apps.apple.com/account/subscriptions").catch((e) => console.warn("[paywall] manage:", e));
  }, []);

  return {
    view,
    busy,
    welcome,
    act: { close, select, buy: (id) => void buy(id), restore: () => void restore(), manage, terms: openTerms, privacy: openPrivacy },
  };
}
