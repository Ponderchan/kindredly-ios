import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth";
import { fetchEntitlement } from "./api";
import { IAP_READY, iapCheckBook, iapCheckPremium, iapConfigure } from "./iap";
import { fetchMyCofounderNo } from "./cofounder-seats";

/* Unified Kindredly+ state. Premium is true if EITHER the server entitlement
   (subscriptions table, fed by the Creem *or* RevenueCat webhook) OR the live
   RevenueCat customer info says so. Server is the durable source of truth; RC
   gives an instant post-purchase signal before the webhook round-trips.

   THE JOURNAL BOOK, BOUGHT ONCE (new feature, 2026-11-10; lib/iap-book-core). `bookOwned` is
   true for a First Class member (the book is part of First Class) OR when RevenueCat says the
   one-time "journal_book" purchase is this Apple ID's. It is asked in the same refresh as
   premium, so everything that refreshes membership (launch, a purchase, a restore, the export
   page regaining focus) refreshes it too. It lives in the App Store and RevenueCat only: the
   server knows nothing of it, and it makes nobody First Class. */

interface EntValue {
  premium: boolean;
  loading: boolean;
  /** the first answer is in — before this, `premium: false` means "not asked
   *  yet", not "no". Anything that TAKES something away on a false must wait
   *  for this, or it strips a paying reader mid-load. */
  settled: boolean;
  plan: string | null;
  status: string | null;
  /* A COFOUNDER IS A PERSON, NOT A RECEIPT. The lifetime fare buys a
     standing in the product — a number, in the order they arrived — so it
     has to exist as identity here, not as a boolean on a purchase. Every
     surface that marks a cofounder reads these two fields. */
  cofounder: boolean;
  cofounderNo: number | null;
  /** may make the journal book: First Class, or the book bought once. Like `premium`, false
   *  before `settled` means "not asked yet". */
  bookOwned: boolean;
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
  /** the one-time journal book, as RevenueCat says it (First Class is added where it is read) */
  const [book, setBook] = useState(false);
  /** whose book that is: another account starts from "no" */
  const bookOf = useRef<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [cofounderNo, setCofounderNo] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [settled, setSettled] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setPremium(false);
      setBook(false);
      bookOf.current = null;
      setPlan(null);
      setStatus(null);
      setCofounderNo(null);
      setSettled(true); // signed out is an answer, not a gap
      return;
    }
    setLoading(true);
    try {
      if (IAP_READY) await iapConfigure(user.id);
      const [server, rc, rcBook] = await Promise.all([
        fetchEntitlement(),
        IAP_READY ? iapCheckPremium() : Promise.resolve(null),
        IAP_READY ? iapCheckBook() : Promise.resolve(null),
      ]);
      setPremium(!!server?.premium || rc === true);
      // null (RevenueCat didn't answer this time) keeps what was known for THIS account: a
      // bought book is not taken away by one failed read. Another account starts from no.
      if (rcBook !== null) setBook(rcBook);
      else if (bookOf.current !== user.id) setBook(false);
      bookOf.current = user.id;
      setPlan(server?.plan ?? null);
      setStatus(server?.status ?? null);
      /* /api/entitlement doesn't send cofounder_no today (Me 4a, ME4A D9):
         a lifetime plan asks the server for the reader's own number
         (my_cofounder_no, web 0036). Null until 0036 has run, logged once. */
      const sentNo = typeof server?.cofounder_no === "number" ? server.cofounder_no : null;
      setCofounderNo(sentNo ?? (server?.plan === "lifetime" ? await fetchMyCofounderNo() : null));
    } finally {
      setLoading(false);
      setSettled(true);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Ctx.Provider
      value={{ premium, loading, settled, plan, status, cofounder: cofounderNo != null, cofounderNo, bookOwned: premium || book, refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}
