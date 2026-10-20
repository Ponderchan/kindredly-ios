import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scoped as AsyncStorage } from "./scoped-store";
import { loadJournal } from "./journal";
import { localeTag } from "./format";
import { t, useLang } from "./i18n";
import { dayKey, decideFc, markOpened, markShown, type FcForm, type FcRolloutState } from "./fc-rollout-core";
import "../data/strings-fc-rollout";

/* FIRST CLASS, BY THE DAY — the Me page's side (rules: lib/fc-rollout-core).
   What was offered and what was opened is kept per account on this phone (the scoped store);
   the days written come from the letters the page already read and the notes on the phone.
   A form is marked shown the first time it is on screen (its 48 hours start then) and spent the
   moment it is tapped (the paywall opens; closing it doesn't bring the form back). Every read or
   write that fails is logged and leaves the page with nothing extra, never a wrong offer. */

const KEY = "kindredly_fc_rollout";

/* dev only: force a form to look at it (the dev route /dev/fc-form?form=seat sets it; null = real) */
let devForm: FcForm | null = null;
const devListeners = new Set<() => void>();
export function setFcDevForm(form: FcForm | null, reset = false): void {
  if (!__DEV__) return;
  if (reset) void AsyncStorage.removeItem(KEY).catch((e) => console.warn("[fc-rollout] reset failed", e));
  devForm = form;
  devListeners.forEach((l) => l());
}

async function readState(): Promise<FcRolloutState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === "object" ? (o as FcRolloutState) : {};
  } catch (e) {
    console.warn("[fc-rollout] couldn't read what was offered", e);
    return {};
  }
}

async function writeState(s: FcRolloutState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.warn("[fc-rollout] couldn't keep what was offered", e);
  }
}

/** A gate was touched (a First Class filter in the Stamp Press, the free stamps used up): the Post's
    letter may come before day 3. Kept with the rest; the Me page reads it next time it looks. */
export async function markFcThreshold(): Promise<void> {
  const s = await readState();
  if (s.threshold) return;
  await writeState({ ...s, threshold: true });
}

export type FcRolloutFacts = {
  premium: boolean;
  /** the account's created_at (ISO), null while unknown */
  createdAt: string | null;
  /** my letters' created_at (ISO), null while unread */
  letterDates: readonly (string | null)[] | null;
  /** pen pals (threads) I have */
  penPals: number;
  /** photo stamps I've made */
  stampsMade: number;
};

export type FcRolloutView = {
  form: FcForm;
  tab: boolean;
  firstClass: string;
  post: string;
  envelopeA11y: string;
  seatTimer: string;
  seatHead: string;
  seatPerks: string;
  open: string;
  reportEyebrow: string;
  reportSealed: string;
  reportHead: string;
  reportCta: string;
  tabA11y: string;
  /** Wren's line on the Courier card while the Post's letter waits; "" otherwise */
  courierLine: string;
  courierSub: string;
};

/** The form for the Me page now, its words, and what a tap does (`go` opens the paywall). */
export function useFcRollout(f: FcRolloutFacts, go: (src: string) => void): { view: FcRolloutView; open: (form: FcForm) => void } {
  const lang = useLang();
  const [state, setState] = useState<FcRolloutState | null>(null);
  const [noteDays, setNoteDays] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [forced, setForced] = useState<FcForm | null>(devForm);
  useEffect(() => {
    const l = () => setForced(devForm);
    devListeners.add(l);
    return () => {
      devListeners.delete(l);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    readState().then((s) => alive && setState(s));
    loadJournal()
      .then((entries) => alive && setNoteDays(entries.filter((e) => !e.id.startsWith("demo-")).map((e) => dayKey(Date.parse(e.date)))))
      .catch((e) => console.warn("[fc-rollout] notes weren't read", e));
    // the 48 hours run out while the page is open: look again every ten minutes
    const timer = setInterval(() => setNow(Date.now()), 10 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const decision = useMemo(() => {
    if (!state) return null;
    const written = new Set(noteDays);
    for (const d of f.letterDates ?? []) if (d) written.add(dayKey(Date.parse(d)));
    return decideFc({
      premium: f.premium,
      createdAt: f.createdAt ? Date.parse(f.createdAt) : null,
      now,
      writtenDays: written,
      threshold: f.penPals >= 7 || f.stampsMade >= 3,
      state,
    });
  }, [state, noteDays, f.premium, f.createdAt, f.letterDates, f.penPals, f.stampsMade, now]);

  // shown: its 48 hours start the first time it's on screen
  useEffect(() => {
    if (!state || !decision) return;
    const next = markShown(state, decision.form, Date.now());
    if (next !== state) {
      setState(next);
      void writeState(next);
    }
  }, [state, decision]);

  const decisionRef = useRef(decision);
  decisionRef.current = decision;
  const open = useCallback(
    (form: FcForm) => {
      // dev: every open is logged, to catch one that didn't come from a tap
      if (__DEV__) console.log("[fc-rollout] open", form);
      const d = decisionRef.current;
      go(`fc_${form}`);
      setState((s) => {
        if (!s || !d) return s;
        const next = markOpened(s, form, d.reportMonth);
        void writeState(next);
        return next;
      });
    },
    [go],
  );

  const view = useMemo<FcRolloutView>(() => {
    const d = forced && decision ? { ...decision, form: forced, tab: forced === "tab" || forced === "report" } : decision;
    const form = d?.form ?? "none";
    const month = d ? new Date(`${d.reportMonth}-15T12:00:00`).toLocaleDateString(localeTag(), { month: "long" }) : "";
    return {
      form,
      tab: d?.tab ?? false,
      firstClass: t("me.firstClass"),
      post: t("fcr.post"),
      envelopeA11y: t("fcr.env.a11y"),
      seatTimer: t("fcr.seat.timer"),
      seatHead: t("fcr.seat.head"),
      seatPerks: t("fcr.seat.perks"),
      open: t("fcr.open"),
      reportEyebrow: t("fcr.report.eyebrow", { month: month.toLocaleUpperCase(localeTag()) }),
      reportSealed: t("fcr.report.sealed"),
      reportHead: t("fcr.report.head", { n: d?.reportDays ?? 30 }),
      reportCta: t("fcr.report.cta"),
      tabA11y: t("fcr.tab.a11y"),
      courierLine: form === "invite" ? t("fcr.courier.line") : "",
      courierSub: form === "invite" ? t("fcr.courier.sub") : "",
    };
    // lang: the words follow the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision, forced, lang]);

  return { view, open };
}

/** a model with nothing to show (dev pages) */
export const FC_NONE: { view: FcRolloutView; open: (form: FcForm) => void } = {
  view: { form: "none", tab: false, firstClass: "", post: "", envelopeA11y: "", seatTimer: "", seatHead: "", seatPerks: "", open: "", reportEyebrow: "", reportSealed: "", reportHead: "", reportCta: "", tabA11y: "", courierLine: "", courierSub: "" },
  open: () => {},
};
