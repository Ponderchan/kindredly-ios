import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scoped } from "./scoped-store";
import { supabase } from "./supabase";
import { getLang } from "./i18n";
import { getWrenName } from "./wren-name";
import { loadJournal } from "./journal";
import { POOL_CACHE_KEY } from "./db";
import { readBest, readWork } from "./free-flight";
import { LOCAL_PUSH, POOL_KEYS, type LocalPool } from "../data/local-push-copy";
import {
  ID_PREFIX,
  LOCAL_KEYS,
  PUSH_DEFAULTS,
  PUSH_KEYS,
  addable,
  dayOf,
  fillLine,
  observeLocks,
  plan,
  prefsFrom,
  settleAura,
  settleDayOff,
  stateFrom,
  withSwitch,
  type DayOffFacts,
  type LineKind,
  type PlanState,
  type PushKey,
  type PushPrefs,
} from "./wren-lines";

/* HER LINES, SCHEDULED (push step two, iOS 1.2.3).
   ────────────────────────────────────────────────────────────────────────
   The doing half of lib/wren-lines: reads the switches off the account
   (user_metadata.push — the same field the server reads for hungry, the
   closing room and the first reader), reads what was written, asks the
   planner, and hands the next fourteen days to iOS as one-shot calendar
   triggers. Re-planned on launch, on every return to the foreground, when
   a switch changes, after a Notes page or a letter, and when the language
   or her name changes (the words are copied into the OS schedule the
   moment they're set).

   What leaves the phone: nothing new. The switches ride on the account
   because the server needs three of them; the phone's own (the four
   recording ones and her day off) ride along so a new phone starts with
   the person's own choice. The day-off push is the phone's alone — the
   server never sends it. No journal
   word, no aura line, ever goes into a notification — the planner only
   picks a line from the written pools (data/local-push-copy).

   FAILURES ARE SAID, NOT SWALLOWED. A read that fails is never taken to
   mean "nothing to schedule": with no switches to read, the schedule that
   is already in iOS is left exactly as it was, and the reason is kept in
   lastPlan for the settings page and the console. */

const STATE_KEY = "kindredly_wren_lines";
const PREFS_CACHE = "kindredly_push_prefs";
/* the knock is the device's, as it always was (it lived in the OS schedule) */
const KNOCK_KEY = "kindredly_knock_on";
const LEGACY_KNOCK_ID = "morning-knock";
/* the morning question she asked today, once it was tapped — the Notes page offers it that evening */
const MORNING_ASKED_KEY = "kindredly_morning_asked";

export type { PushKey, PushPrefs };
export { PUSH_DEFAULTS, LOCAL_KEYS };

export interface PlanReport {
  at: number;
  scheduled: number;
  skipped?: "permission" | "no-prefs" | "signed-out";
  errors: string[];
}
let lastPlan: PlanReport | null = null;
/** what the last re-plan did — the settings page and a debugging session read this */
export const getLastPlan = (): PlanReport | null => lastPlan;

const say = (where: string, e: unknown): string => {
  const msg = `${where}: ${e instanceof Error ? e.message : String(e)}`;
  console.warn("[local-push]", msg);
  return msg;
};

/* ── the switches ─────────────────────────────────────────────────────── */

export interface PrefsRead {
  prefs: PushPrefs;
  source: "account" | "cache" | "default";
  error?: string;
}

const pushOf = (user: { user_metadata?: unknown } | null | undefined): Record<string, unknown> => {
  const push = (user?.user_metadata as Record<string, unknown> | undefined)?.push;
  return push && typeof push === "object" && !Array.isArray(push) ? (push as Record<string, unknown>) : {};
};
/** the switches a stored object actually sets (booleans under the known keys) */
const switchesIn = (o: Record<string, unknown> | null): Record<string, boolean> => {
  const out: Record<string, boolean> = {};
  for (const k of PUSH_KEYS) if (o && typeof o[k] === "boolean") out[k] = o[k] as boolean;
  return out;
};
/** switches this phone holds that the account doesn't set at all (never one whose one-or-the-other partner the account has on) */
const phoneOnly = (cached: Record<string, unknown> | null, account: Record<string, unknown>): Record<string, boolean> => {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(switchesIn(cached))) if (typeof account[k] !== "boolean") out[k] = v;
  return addable(out, account);
};
const hasPushObject = (user: { user_metadata?: unknown } | null | undefined): boolean => {
  const push = (user?.user_metadata as Record<string, unknown> | undefined)?.push;
  return !!push && typeof push === "object" && !Array.isArray(push);
};

async function readCache(): Promise<{ cached: Record<string, unknown> | null; error?: string }> {
  try {
    const raw = await scoped.getItem(PREFS_CACHE);
    return { cached: raw ? (JSON.parse(raw) as Record<string, unknown>) : null };
  } catch (e) {
    return { cached: null, error: say("prefs cache", e) };
  }
}

/* WRITES TO THE ACCOUNT GO ONE AT A TIME, FROM THE SERVER'S COPY. Each
   write sends the whole push object (user_metadata merges only at the top
   level, so `push` is replaced, not merged). The session's copy can be an
   hour old — another phone may have changed the switches since — so every
   queued write starts from a fresh read of the account (serverPush), and
   writes nothing when that read fails. Queued, two switches flipped within
   one round trip never start from the same old object. */
let prefWrites: Promise<unknown> = Promise.resolve();
function queuePrefs<T>(job: () => Promise<T>): Promise<T> {
  const run = prefWrites.then(job, job);
  prefWrites = run.catch(() => undefined);
  return run;
}

/** the account as the server holds it right now (one network read): null = signed out. Throws when it can't be read. */
async function serverUser(): Promise<{ user_metadata?: unknown } | null> {
  if (!supabase) return null;
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null; // signed out: no account to read or write
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

/** the account's switches; this phone's copy when the account can't be read; defaults only for someone who never had either */
export async function readPushPrefs(): Promise<PrefsRead> {
  const { cached, error: cacheErr } = await readCache();
  if (supabase) {
    const sb = supabase;
    try {
      const { data, error } = await sb.auth.getSession(); // the metadata rides on the local session
      if (error) throw error;
      const user = data.session?.user;
      if (user) {
        let truth = pushOf(user);
        /* the account is the truth both halves read. A switch only this phone
           holds (set while signed out, or carried from a guest life into a new
           account) is written up once, so the phone and the server never act
           on different switches. Until that write lands, the account's own. */
        if (Object.keys(phoneOnly(cached, truth)).length) {
          try {
            truth = await queuePrefs(async () => {
              const fresh = await serverUser();
              if (!fresh) throw new Error("signed out during the read");
              const current = pushOf(fresh);
              const add = phoneOnly(cached, current);
              if (!Object.keys(add).length) return current;
              const next = { ...add, ...current };
              const { error: wErr } = await sb.auth.updateUser({ data: { push: next } });
              if (wErr) throw wErr;
              return next;
            });
          } catch (e) {
            // the phone's copy stays as it is, so the next read tries again
            return { prefs: prefsFrom(truth), source: "account", error: say("prefs upload", e) };
          }
        }
        const kept = truth;
        void scoped.setItem(PREFS_CACHE, JSON.stringify(kept)).catch((e) => say("prefs cache write", e));
        return { prefs: prefsFrom(kept), source: "account" };
      }
    } catch (e) {
      const error = say("prefs read", e);
      if (cached) return { prefs: prefsFrom(cached), source: "cache", error };
      return { prefs: { ...PUSH_DEFAULTS }, source: "default", error };
    }
  }
  if (cached) return { prefs: prefsFrom(cached), source: "cache" };
  return { prefs: { ...PUSH_DEFAULTS }, source: "default", error: cacheErr };
}

/** one switch, written to the account (whole push object, merged) and this phone. Turning on the daily
    line or the morning question turns the other off in the same write. Throws when the account refused it. */
export function setPushPref(key: PushKey, value: boolean): Promise<PushPrefs> {
  return queuePrefs(async () => {
    const { cached } = await readCache();
    let next: Record<string, unknown> = withSwitch({ ...(cached || {}) }, key, value);
    if (supabase) {
      const user = await serverUser(); // throws when the account can't be read: the row rolls back
      if (user) {
        const current = pushOf(user);
        // switches only this phone held ride along, so none is dropped from either side
        next = withSwitch({ ...phoneOnly(cached, current), ...current }, key, value);
        const { error } = await supabase.auth.updateUser({ data: { push: next } });
        if (error) throw error;
      }
    }
    try {
      await scoped.setItem(PREFS_CACHE, JSON.stringify(next));
    } catch (e) {
      say("prefs cache write", e); // the account has it; this phone re-learns it on the next read
    }
    if (LOCAL_KEYS.includes(key)) void replanLocal({ force: true });
    return prefsFrom(next);
  });
}

/* EVERY ACCOUNT HAS A PUSH OBJECT FROM THIS BUILD ON (server contract,
   2026-10-11). The server reads a missing user_metadata.push as an account
   from before step two and an object — even an empty one — as one that has
   seen these switches, so its defaults (first_read on) apply. On launch, an
   account without one gets push: {} (with any switch only this phone holds).
   user_metadata merges at the top level, so wren, tz and everything else on
   it stay exactly as they are; only `push` is sent. Queued with the switch
   writes, and checked again inside the queue against the server's own copy
   (not this phone's session, which can predate another phone's write), so
   it never lands on top of a switch someone just flipped, here or there. */
export async function ensurePushObject(): Promise<void> {
  if (!supabase) return;
  const sb = supabase;
  try {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    if (!data.session?.user || hasPushObject(data.session.user)) return;
    await queuePrefs(async () => {
      // the server's copy, not the session's: another phone may have written the object since
      const user = await serverUser();
      if (!user || hasPushObject(user)) return;
      const { cached } = await readCache();
      const push = phoneOnly(cached, {});
      const { error: wErr } = await sb.auth.updateUser({ data: { push } });
      if (wErr) throw wErr;
    });
  } catch (e) {
    say("push object", e); // the next launch tries again
  }
}

/* ── the knock (device) ───────────────────────────────────────────────── */

/** is the 8 o'clock knock on? Carries the 1.2.2-and-earlier repeating knock over the first time it's asked. */
export async function getKnockOn(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KNOCK_KEY);
  if (v === "1" || v === "0") return v === "1";
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const on = all.some((n) => n.identifier === LEGACY_KNOCK_ID);
  await AsyncStorage.setItem(KNOCK_KEY, on ? "1" : "0");
  return on;
}

export async function setKnockOn(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KNOCK_KEY, on ? "1" : "0");
  await replanLocal({ force: true });
}

/* ── permission ───────────────────────────────────────────────────────── */

export async function notificationsAllowed(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  return p.status === "granted" || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** turning a phone-side switch on: ask once if iOS still lets us; false = not allowed */
export async function askForNotifications(): Promise<boolean> {
  if (await notificationsAllowed()) return true;
  const p = await Notifications.getPermissionsAsync();
  if (!p.canAskAgain) return false;
  const r = await Notifications.requestPermissionsAsync();
  return r.status === "granted" || r.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/* ── state ────────────────────────────────────────────────────────────── */

async function loadState(errors: string[]): Promise<PlanState> {
  try {
    const raw = await scoped.getItem(STATE_KEY);
    return stateFrom(raw ? JSON.parse(raw) : null);
  } catch (e) {
    errors.push(say("state read", e)); // only the rotation is lost; the rules still hold
    return stateFrom(null);
  }
}

async function saveState(s: PlanState, errors: string[]): Promise<void> {
  try {
    await scoped.setItem(STATE_KEY, JSON.stringify(s));
  } catch (e) {
    errors.push(say("state write", e));
  }
}

/** the desk day (the date of the 8 o'clock that began it) whose put-away desk is KNOWN to be empty — Today
    wrote it with its day. The desk refills every morning, so this only ever speaks for the desk it was
    written on; anything else (no desk yet, onboarding's raw list, a read that failed) is "not known".
    That desk's eight o'clock has always passed by the time it is put away, so this never matches a
    morning plan() schedules — it keeps the owner's "only known empty skips it" honest, and skips nothing. */
async function knownEmptyDesk(errors: string[]): Promise<string | null> {
  try {
    // Today and onboarding put the desk away under the bare key (raw AsyncStorage), not the scoped one
    const raw = await AsyncStorage.getItem(POOL_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as unknown;
    if (!c || typeof c !== "object" || Array.isArray(c)) return null;
    const { day, desk } = c as { day?: unknown; desk?: unknown };
    return typeof day === "string" && Array.isArray(desk) && desk.length === 0 ? day : null;
  } catch (e) {
    errors.push(say("desk read", e)); // not known → the knock goes as usual
    return null;
  }
}

/** her day off, as far as this phone knows it: the best run, the last game, the last look at her work */
async function dayOffFacts(errors: string[]): Promise<DayOffFacts> {
  const [best, work] = await Promise.all([
    readBest().catch((e) => {
      errors.push(say("best read", e));
      return null;
    }),
    readWork(),
  ]);
  return { best: best?.gates ?? 0, lastPlayed: best?.lastPlayed ? dayOf(best.lastPlayed) : null, work };
}

/* ── the re-plan ──────────────────────────────────────────────────────── */

let chain: Promise<void> = Promise.resolve();
let lastRun = 0;
const MIN_GAP_MS = 60_000;

/** schedule the next fourteen days. Serialised; a plain foreground re-plan within a minute of the last is skipped. */
export function replanLocal({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (!force && Date.now() - lastRun < MIN_GAP_MS) return chain;
  lastRun = Date.now();
  chain = chain.then(runPlan, runPlan);
  return chain;
}

async function cancelOurs(errors: string[]): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier.startsWith(ID_PREFIX) || n.identifier === LEGACY_KNOCK_ID) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) {
    errors.push(say("cancel", e));
  }
}

async function runPlan(): Promise<void> {
  const errors: string[] = [];
  const report = (r: Omit<PlanReport, "at" | "errors">) => {
    lastPlan = { at: Date.now(), errors, ...r };
    if (errors.length) console.warn("[local-push] re-plan finished with errors:", errors.join(" | "));
  };
  try {
    /* first, before anything is cancelled: carry over a knock that 1.2.2
       left as a repeating trigger */
    let knockOn = false;
    try {
      knockOn = await getKnockOn();
    } catch (e) {
      errors.push(say("knock read", e));
      report({ scheduled: 0, skipped: "no-prefs" });
      return;
    }
    if (!(await notificationsAllowed())) {
      await cancelOurs(errors); // nothing could show anyway; the switches keep their place
      /* a race left pending is no longer in iOS — it must not be counted as
         sent when its noon passes (settleDayOff). Directly, not through
         mutateState: this already runs on `chain`. */
      const s0 = await loadState(errors);
      if (s0.offPending) await saveState({ ...s0, offPending: null }, errors);
      lastRun = 0; // the next return to the app (say, from iOS's question or Settings) plans at once
      report({ scheduled: 0, skipped: "permission" });
      return;
    }
    /* signed out (not a guest — a guest has an anonymous session): the phone
       belongs to nobody now, so nothing of the last account keeps knocking */
    if (supabase) {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        errors.push(say("session read", error)); // can't tell: leave what iOS holds
        report({ scheduled: 0, skipped: "no-prefs" });
        return;
      }
      if (!data.session) {
        await cancelOurs(errors);
        report({ scheduled: 0, skipped: "signed-out" });
        return;
      }
    }
    const read = await readPushPrefs();
    if (read.error) errors.push(read.error);
    if (read.source === "default" && read.error) {
      // no switches to go by: leave what iOS already holds rather than guess
      report({ scheduled: 0, skipped: "no-prefs" });
      return;
    }
    const prefs = read.prefs;

    const now = new Date();
    let state = await loadState(errors);
    // a Notes page counts from the journal itself too — pages written before this existed, or by a path that forgot to say so
    try {
      const pages = (await loadJournal()).filter((e) => !e.id.startsWith("demo-"));
      const newest = pages.map((e) => dayOf(e.date)).sort().pop() ?? null;
      if (newest && (!state.notesDay || newest > state.notesDay)) state = { ...state, notesDay: newest };
    } catch (e) {
      errors.push(say("journal read", e));
    }
    state = settleAura(state, { on: prefs.aura_settled, now });
    state = settleDayOff(state, now);
    const emptyDesk = await knownEmptyDesk(errors);
    const dayOff = await dayOffFacts(errors);

    const out = plan({ now, prefs, knockOn, emptyDesk, dayOff, state });
    await cancelOurs(errors);
    const lang = getLang();
    const name = (await getWrenName()).slice(0, 16);
    let scheduled = 0;
    let offScheduled = false; // the race counts as sent at its noon only if iOS really holds it
    for (const n of out.notes) {
      const line = lineText(n.pool, n.index, lang);
      const body = line == null ? null : fillLine(line, n.vars);
      if (!body || /\{\w+\}/.test(body)) {
        errors.push(say(`schedule ${n.id}`, `no line ${n.pool}[${n.index}]${line != null ? " (a placeholder left unfilled)" : ""}`)); // never a notification with no words, or with a bare {n}
        continue;
      }
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: n.id,
          content: { title: name, body, sound: false, data: { line: n.kind satisfies LineKind, pool: n.pool, index: n.index } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, repeats: false, ...n.at, second: 0 },
        });
        scheduled++;
        if (n.kind === "dayoff") offScheduled = true;
      } catch (e) {
        errors.push(say(`schedule ${n.id}`, e));
      }
    }
    await saveState(offScheduled ? out.state : { ...out.state, offPending: null }, errors);
    report({ scheduled });
  } catch (e) {
    errors.push(say("re-plan", e));
    report({ scheduled: 0 });
  }
}

/* ── what happened on the phone ───────────────────────────────────────── */

/* EVERY CHANGE TO THE STATE GOES THROUGH THE SAME LINE AS THE RE-PLAN. A
   re-plan reads the state, takes a second or two with iOS, then saves; a
   letter day or a settled aura line saved in between would be overwritten
   by it. Queued on `chain`, each read-change-save sees the last one. */
function mutateState(change: (s: PlanState) => PlanState): Promise<void> {
  const job = async () => {
    const errors: string[] = [];
    const before = await loadState(errors);
    const after = change(before);
    if (JSON.stringify(after) !== JSON.stringify(before)) await saveState(after, errors);
  };
  chain = chain.then(job, job);
  return chain;
}

/** a Notes page was sealed, or a letter / reply went out: today's line stays quiet */
export async function noteWrote(kind: "notes" | "letter"): Promise<void> {
  const day = dayOf(new Date());
  await mutateState((s) => (kind === "notes" ? { ...s, notesDay: day } : { ...s, letterDay: day }));
  await replanLocal({ force: true });
  if (kind === "notes") void checkAuraAfterWriting();
}

/** the aura's settled lines as of now. `viewing` = the person is on the aura page itself. */
export async function observeAuraLocks(locked: string[], viewing: boolean): Promise<void> {
  const read = await readPushPrefs();
  if (read.source === "default" && read.error) return; // can't tell whether to announce — next look decides
  let replan = false;
  await mutateState((before) => {
    const after = observeLocks(before, locked, { viewing, on: read.prefs.aura_settled, now: new Date() });
    replan = before.auraPending?.day !== after.auraPending?.day || (!!before.auraPending && !after.auraPending);
    return after;
  });
  if (replan) await replanLocal({ force: true });
}

/* ── her lines, tapped ────────────────────────────────────────────────── */

/** a line of hers by pool and position, in the reader's language (English only if that language lacks it); null when it doesn't exist */
export function lineText(pool: unknown, index: unknown, lang = getLang()): string | null {
  if (typeof pool !== "string" || !(pool in POOL_KEYS) || !Number.isInteger(index)) return null;
  const p = pool as LocalPool;
  const i = index as number;
  if (i < 0 || i >= POOL_KEYS[p].length) return null;
  return LOCAL_PUSH[lang]?.[p]?.[i] ?? LOCAL_PUSH.en[p][i] ?? null;
}

/** the source key of a line ("daily_prompt.21"), for the few lines that open a page of their own */
export function lineKey(pool: unknown, index: unknown): string | null {
  if (lineText(pool, index, "en") == null) return null;
  return POOL_KEYS[pool as LocalPool][index as number];
}

/** the morning question was tapped: it is today's errand, and tonight's Notes page offers it */
export async function rememberMorningQuestion(index: unknown): Promise<void> {
  if (lineText("morning_question", index, "en") == null) return;
  try {
    await scoped.setItem(MORNING_ASKED_KEY, JSON.stringify({ day: dayOf(new Date()), index }));
  } catch (e) {
    say("morning question write", e);
  }
}

/** today's morning question, if one was tapped today — in the current language */
export async function todaysMorningLine(): Promise<string | null> {
  try {
    const raw = await scoped.getItem(MORNING_ASKED_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { day?: unknown; index?: unknown };
    if (v.day !== dayOf(new Date())) return null;
    return lineText("morning_question", v.index);
  } catch (e) {
    say("morning question read", e);
    return null; // the page falls back to its own spark
  }
}

/** after a page: read the aura again (on the phone, off the critical path) to see whether a line settled */
async function checkAuraAfterWriting(): Promise<void> {
  try {
    const read = await readPushPrefs();
    if (!read.prefs.aura_settled) return; // the Me tab and the aura page keep the baseline when it's off
    const { InteractionManager } = require("react-native") as typeof import("react-native");
    await new Promise<void>((r) => InteractionManager.runAfterInteractions(() => setTimeout(r, 1500)));
    let firstLine: string | null = null;
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const fl = (data.session?.user?.user_metadata as Record<string, unknown> | undefined)?.firstLine;
      firstLine = typeof fl === "string" ? fl : null;
    }
    const { myAura } = require("./aura") as typeof import("./aura");
    const a = await myAura(firstLine);
    await observeAuraLocks(a.locked.map((d) => d.key), false);
  } catch (e) {
    say("aura check", e);
  }
}
