import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Share } from "react-native";
import { useIsFocused, useRouter } from "expo-router";
import type { KWrenLookData } from "../../../modules/kindredly-ui/src/Planet";
import type { KAfterReceiptPhase, KAfterStepName } from "../../../modules/kindredly-ui/src/AfterFifteen";
import { useAuth } from "../../lib/auth";
import { t, useLang } from "../../lib/i18n";
import { clockTime, postmark } from "../../lib/format";
import { getStamp, sname } from "../../data/stamps";
import { isCustomStampId, tagOf, useCustomStamps } from "../../lib/custom-stamps";
import { loadJournal } from "../../lib/journal";
import { fetchMyWriting } from "../../lib/aura";
import { removeLore, saveToLore } from "../../lib/lore";
import { useWrenSkinControl } from "../../lib/wren-skin";
import { useWrenStage } from "../../lib/wren-stage";
import { activeDays, dayKey as calendarDay } from "../../lib/fc-rollout-core";
import { devAfterOnDemoDesk, loadAfter, mutateAfter, subscribeAfter, useAfterFifteenOn } from "../../lib/after-fifteen";
import {
  dayTotals,
  markKept,
  markReceipt,
  markShut,
  markStep,
  noteLetter,
  pageFor,
  reopen,
  settle,
  turnDay,
  weekTotals,
  withDwell,
  withLog,
  withNote,
  type AfterState,
  type AfterToday,
} from "../../lib/after-fifteen-core";
import { AFTER_FACT_COUNT } from "../../data/after-facts";
import "../../data/strings-after";
import "../../data/strings-after-facts";
import { countdownLabel } from "./today-cards";
import { buildAfterView, type AfterFormat, type AfterVM } from "./after-view";
import type { TodayModel } from "./useTodayDesk";

/* TODAY, AFTER FIFTEEN — the Today tab's side (docs/today-after-fifteen.md; rules:
   lib/after-fifteen-core; what is said: after-view; what is kept: lib/after-fifteen).
   ────────────────────────────────────────────────────────────────────────
   Everything here is asleep unless the "afterfifteen" switch is on and this binary has the view
   (lib/after-fifteen useAfterFifteenOn): off, nothing is timed, nothing is kept, and Today ends
   the day exactly as it did.

   On, it does four things with the desk's model (useTodayDesk), which it only reads:
   - THE READING TIMER. While a stranger's letter is the one on screen (the card, or the unfolded
     reader), Today is in front and the app is active, the phone counts the time and adds it to
     that letter for the desk day (flushed every fifteen seconds and when the letter changes). The
     first time a letter is on screen the phone also notes what it would need to offer its line
     later: its opening, not the letter. On this phone only.
   - THE DAY'S LOG. What went past and what was written back to, as it stands, for the receipt.
   - THE PAGE. When the desk is done with at least one letter read, the day is settled once (the
     page, the small thing); the last letter brought back puts the page away again.
   - THE VIEW. The page's records for Swift, and what its taps do.

   The demo desk (the dev page's, and the store mode's) is never timed or settled. */

/** how long Undo stands over a page that came up from the day's last pass */
const UNDO_MS = 10_000;
/** the desk's own last-card exit, before the page takes its place */
const SWAP_MS = 320;

export type AfterFifteen = {
  /** the page takes Today's place now */
  show: boolean;
  /** a desk that opened already done, in the moment before its page is known (the record is being
      read): draw the page's colour and nothing else, so the old end of the day never flashes by.
      Gives way to the desk if the record doesn't answer */
  pending: boolean;
  vm: AfterVM | null;
  look: KWrenLookData;
  act: {
    slot: () => void;
    shut: (shut: boolean) => void;
    keep: (keep: boolean) => void;
    receipt: (phase: KAfterReceiptPhase) => void;
    share: (uri: string) => void;
    step: (step: KAfterStepName) => void;
    play: () => void;
    undo: () => void;
  };
};

const noonOf = (key: string): number => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12).getTime();
};

export function useAfterFifteen(model: TodayModel): AfterFifteen {
  const on = useAfterFifteenOn();
  const lang = useLang();
  const router = useRouter();
  const focused = useIsFocused();
  const { user } = useAuth();
  const { view, act: desk } = model;
  const live = on && (!view.demo || devAfterOnDemoDesk());
  const day = view.day;

  /* ── the record ── */
  const [state, setState] = useState<AfterState | null>(null);
  useEffect(() => {
    if (!live) {
      setState(null);
      return;
    }
    let alive = true;
    const read = () => void loadAfter().then((s) => alive && setState(s));
    read();
    const off = subscribeAfter((s) => (s ? alive && setState(s) : read()));
    return () => {
      alive = false;
      off();
    };
  }, [live]);

  /* ── the app in front ── */
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
    return () => sub.remove();
  }, []);

  /* ── the reading timer ── */
  const feedRef = useRef(view.feed);
  feedRef.current = view.feed;
  const cardsRef = useRef(view.cards);
  cardsRef.current = view.cards;
  const timedId = live && view.phase === "reading" && focused && active ? (view.readerId ?? view.current?.id ?? null) : null;
  const deskDayKey = day.key;
  useEffect(() => {
    if (!timedId) return;
    const letter = feedRef.current.find((l) => l.id === timedId);
    if (letter) {
      const who = cardsRef.current.find((c) => c.id === timedId)?.who.name ?? "";
      const note = noteLetter(letter, who);
      void mutateAfter((s) => withNote(turnDay(s, deskDayKey), timedId, note));
    }
    let from = Date.now();
    const flush = () => {
      const now = Date.now();
      const add = now - from;
      from = now;
      if (add > 0) void mutateAfter((s) => withDwell(turnDay(s, deskDayKey), timedId, add));
    };
    const tick = setInterval(flush, 15_000);
    return () => {
      clearInterval(tick);
      flush();
    };
  }, [timedId, deskDayKey]);

  /* ── the day's log, the settling, the reopening ── */
  const createdAt = user?.created_at ? Date.parse(user.created_at) : null;
  const hatched = view.wren.stage !== "egg";
  const answeredKey = day.answered.join(",");
  useEffect(() => {
    if (!live || !view.loaded) return;
    if (day.done && day.read > 0 && day.doneAt != null) {
      const facts = { day: day.key, doneAt: day.doneAt, createdAt: createdAt != null && Number.isFinite(createdAt) ? createdAt : null, hatched, answered: day.answered, read: day.read, factCount: AFTER_FACT_COUNT };
      void mutateAfter((s) => settle(s, facts));
    } else if (!day.done) {
      const counts = { read: day.read, replied: day.answered.length };
      void mutateAfter((s) => withLog(reopen(turnDay(s, day.key), day.key), day.key, counts));
    }
    // answeredKey stands for day.answered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, view.loaded, day.done, day.read, day.doneAt, day.key, answeredKey, createdAt, hatched]);

  const today: AfterToday | null = state ? pageFor(state, day.key) : null;

  /* ── the page takes the desk's place: at once on a desk that opens done, after the last card
        has left when the reader has just passed it ── */
  const wants = live && view.phase === "done" && day.done && today != null;
  const sawReading = useRef(false);
  if (view.phase === "reading") sawReading.current = true;
  const [show, setShow] = useState(false);
  const [fromPass, setFromPass] = useState(false);
  const [undoUntil, setUndoUntil] = useState(0);
  useEffect(() => {
    if (!wants) {
      setShow(false);
      setFromPass(false);
      setUndoUntil(0);
      return;
    }
    if (!sawReading.current) {
      setShow(true);
      return;
    }
    // it came from a pass in this sitting: let the card leave, and offer the way back for a while
    sawReading.current = false;
    setFromPass(true);
    setUndoUntil(Date.now() + SWAP_MS + UNDO_MS);
    const id = setTimeout(() => setShow(true), SWAP_MS);
    return () => clearTimeout(id);
  }, [wants]);

  /* a desk that opens done: nothing of the old end of the day is drawn while the record is read
     (a moment); if it never answers, the desk is drawn after all */
  const doneNow = live && view.phase === "done" && day.done && day.read > 0;
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (!doneNow) {
      setGaveUp(false);
      return;
    }
    const id = setTimeout(() => setGaveUp(true), 1500);
    return () => clearTimeout(id);
  }, [doneNow]);

  /* ── the clock: her countdown by the minute, and Undo's end ── */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!show) return;
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(tick);
  }, [show]);
  useEffect(() => {
    if (!undoUntil) return;
    const left = undoUntil - Date.now();
    if (left <= 0) {
      setUndoUntil(0);
      return;
    }
    const id = setTimeout(() => setUndoUntil(0), left);
    return () => clearTimeout(id);
  }, [undoUntil]);

  /* ── the days that count (bedtime's dots): the finished ones, and the written ones as First
        Class reads them (the notes on the phone, the letters on the account) ── */
  const [written, setWritten] = useState<string[]>([]);
  const wantsStreak = today?.page === "bedtime";
  useEffect(() => {
    if (!wantsStreak) return;
    let alive = true;
    const add = (days: string[]) => alive && days.length && setWritten((cur) => Array.from(new Set([...cur, ...days])));
    loadJournal()
      .then((entries) => add(entries.filter((e) => !e.id.startsWith("demo-")).map((e) => calendarDay(Date.parse(e.date)))))
      .catch((e) => console.warn("[after-fifteen] notes weren't read", e));
    fetchMyWriting()
      .then(
        (m) =>
          m &&
          add(
            m.letters
              .map((w) => w.created_at)
              .filter((d): d is string => !!d)
              .map((d) => calendarDay(Date.parse(d))),
          ),
      )
      .catch((e) => console.warn("[after-fifteen] your letters weren't read", e));
    return () => {
      alive = false;
    };
  }, [wantsStreak]);

  /* ── the words ── */
  const week = today?.page === "receipt";
  const totals = useMemo(() => {
    if (!state) return dayTotals(undefined, day.key);
    return week ? weekTotals(state.days, day.key) : dayTotals(state.days[day.key], day.key);
  }, [state, week, day.key]);
  const lineStamp = today?.thing.kind === "line" ? today.thing.stamp : "";
  const customStamp = useCustomStamps(useMemo(() => [lineStamp, totals.stay ?? ""].filter((id) => isCustomStampId(id)), [lineStamp, totals.stay]));
  const fmt = useMemo<AfterFormat>(
    () => ({
      t,
      upper: (s) => s.toLocaleUpperCase(),
      clockHour: (h) => {
        const d = new Date();
        d.setHours(h, 0, 0, 0);
        return clockTime(d);
      },
      stampTime: (ms) => `${postmark(ms)} · ${clockTime(ms)}`,
      dayMark: (key) => postmark(noonOf(key)),
      countdown: (u) => countdownLabel(u, t),
      stampName: (id) => {
        if (isCustomStampId(id)) {
          const info = customStamp(id);
          return info ? tagOf(info) : "";
        }
        const st = getStamp(id);
        return st ? sname(st.name) : "";
      },
      isOwnWords: (id) => isCustomStampId(id),
      // 2023-01-01 was a Sunday
      weekdayLetter: (weekday) => new Date(2023, 0, 1 + weekday, 12).toLocaleDateString(lang, { weekday: "narrow" }),
      fact: (no) => ({ text: t(`af.fact.${no}`), foot: t(`af.fact.${no}.foot`) }),
    }),
    // lang: the words follow the reader's language
    [customStamp, lang],
  );

  const name = view.wren.name;
  const canBringBack = view.wrenLetter.bringBack !== "";
  const undoUp = undoUntil > now.getTime() && canBringBack;
  const vm = useMemo<AfterVM | null>(() => {
    if (!today || !state) return null;
    return buildAfterView(
      {
        today,
        name,
        read: day.read,
        replied: day.answered.length,
        canPlay: day.canPlay,
        now,
        days: activeDays(written, state.finished),
        totals,
        week,
        title: view.strings.title,
        undo: undoUp ? view.strings.undo : "",
        undoHint: view.strings.undoHint,
      },
      fmt,
    );
  }, [today, state, name, day.read, day.answered.length, day.canPlay, now, written, totals, week, view.strings, undoUp, fmt]);

  /* ── her, as Swift draws her ── */
  const { skin, accessory } = useWrenSkinControl();
  const own = useWrenStage();
  const stage = view.wren.stage ?? own.stage ?? "wren";
  const look = useMemo<KWrenLookData>(
    () => ({ skin, stage, accessory, wilt: view.wren.wilt, form: stage === "hatch" ? own.form : null, mark: stage === "hatch" ? own.mark : null }),
    [skin, stage, accessory, view.wren.wilt, own.form, own.mark],
  );

  /* ── what the taps do ── */
  const todayRef = useRef(today);
  todayRef.current = today;
  const fmtRef = useRef(fmt);
  fmtRef.current = fmt;
  const nameRef = useRef(name);
  nameRef.current = name;
  const act = useMemo<AfterFifteen["act"]>(
    () => ({
      slot: () => router.push("/compose"),
      shut: (shut) => void mutateAfter((s) => markShut(s, shut)),
      keep: (keep) => {
        const cur = todayRef.current;
        if (!cur) return;
        if (!keep) {
          const id = cur.kept;
          if (id) void removeLore(id).catch((e) => console.warn("[after-fifteen] the kept thing wasn't taken out", e));
          void mutateAfter((s) => markKept(s, null));
          return;
        }
        if (cur.kept) return;
        const thing = cur.thing;
        const entry =
          thing.kind === "line"
            ? { threadId: "", who: thing.who || t("ld.stranger"), body: thing.text, prompt: null, said: thing.at }
            : { threadId: "", who: nameRef.current, body: fmtRef.current.fact(thing.no).text, prompt: t("af.lore.fact", { name: nameRef.current, n: thing.no }), said: "" };
        void saveToLore(entry).then((id) => {
          if (id) void mutateAfter((s) => markKept(s, id));
          else console.warn("[after-fifteen] it couldn't be kept");
        });
      },
      receipt: (phase) => void mutateAfter((s) => markReceipt(s, phase)),
      share: (uri) => {
        if (!uri) {
          console.warn("[after-fifteen] the receipt's picture couldn't be made");
          return;
        }
        void Share.share({ url: uri }).catch((e) => console.warn("[after-fifteen] the share sheet didn't open", e));
      },
      step: (step) => void mutateAfter((s) => markStep(s, step)),
      play: () => desk.window(),
      undo: () => {
        setUndoUntil(0);
        desk.bringBack();
      },
    }),
    [router, desk],
  );

  const shown = show && wants && vm != null;
  return { show: shown, pending: doneNow && !shown && !fromPass && !sawReading.current && !gaveUp, vm, look, act };
}

/** the callbacks' names, for a host that only draws (the dev page) */
export type AfterFifteenActions = AfterFifteen["act"];

/** the look for a host that has no desk (the dev page): her own, as the app knows her */
export function useAfterLook(o: { wilt?: boolean } = {}): KWrenLookData {
  const { skin, accessory } = useWrenSkinControl();
  const own = useWrenStage();
  const stage = own.stage ?? "wren";
  return useMemo<KWrenLookData>(() => ({ skin, stage, accessory, wilt: !!o.wilt, form: stage === "hatch" ? own.form : null, mark: stage === "hatch" ? own.mark : null }), [skin, stage, accessory, o.wilt, own.form, own.mark]);
}
