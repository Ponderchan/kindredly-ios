/* CUSTOM STAMPS ON LETTERS, IN THE ALBUM AND IN THE TRAY — THE CLIENT (contract
   .claude/custom-stamps/CONTRACT.md §3, §4.1). Build agent B "collection".
   ────────────────────────────────────────────────────────────────────────
   The exported names and signatures were frozen by the contract step; this file fills them in.
   The pure rules (ids, reading the 0038 lists, what a state draws, the row Swift takes) are
   lib/custom-stamps-core, node-tested.

     · resolveCustomStamps(ids)  0038 custom_stamps_for(uuid[]) in batches of 60, signs each 'ok'
                                 image_path from the private "stamps" bucket (createSignedUrls,
                                 1 hour; again when under 5 minutes are left), caches by id, and
                                 pushes the rows to Swift (modules/kindredly-ui/src/customStamps.ts
                                 setCustomStamps) so KStamp draws "c:" ids at every tier. An id is
                                 asked again after 10 minutes (a takedown or a delete shows up).
     · customStampNow(id)        the cache, synchronously (today-cards fmt.stamp, the compose VM).
     · useCustomStamps(ids)      resolves on mount / change, re-renders when infos land.
     · useMyCustomStamps()       my_stamp_quota() (lib/stamp-press fetchStampQuota) + my_custom_stamps(),
                                 on focus and whenever usePressedStamp() changes (a stamp just
                                 approved: its picture is signed at once). quota null = 0038 not
                                 run / offline / signed out: every door hides (D10).
     · useKeptStamps()           my_kept_stamps().
     · keep / unkeep / report / delete: the 0038 client functions (delete then removes the file
                                 from storage with the path delete_custom_stamp returns).
   My own pending / rejected stamps draw the original this phone kept (lib/stamp-press
   originalFor), when it has one; otherwise the frame in their colour.
   Errors are logged with what failed, never swallowed into a silent empty answer. Signing out
   empties the cache and Swift's registry. */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { supabase, supabaseReady } from "./supabase";
import { getLang, t, useLang } from "./i18n";
import { STAMP_CATEGORIES } from "../data/stamps";
import "../data/strings-stamps2";
import { fetchStampQuota, forgetOriginal, forgetPicture, originalFor, pictureFor, usePressedStamp, type PressedStamp } from "./stamp-press";
import type { PressCategory, PressFilter, StampQuota } from "./stamp-press-core";
import {
  RESOLVE_TTL_MS,
  SIGN_SECONDS,
  UNKNOWN_HEX,
  batches,
  customIds,
  nativeRow,
  needsResign,
  parseForRows,
  parseKeptRows,
  parseMyRows,
  wantsPicture,
  type PressCategoryId,
  type ReadRow,
} from "./custom-stamps-core";
import { clearCustomStamps, setCustomStampWords, setCustomStamps } from "../../modules/kindredly-ui/src/customStamps";

export { isCustomStampId, customStampUuid, customStampId, lookOf, tagOf, canKeep } from "./custom-stamps-core";

/** 0038 custom_stamps_for / my_kept_stamps states, plus "blank" (known category, nothing else:
    a signed-out page, or not resolved yet but the category is known) */
export type CustomStampState = "ok" | "pending" | "rejected" | "removed" | "deleted" | "hidden" | "blank";

/** One custom stamp as a renderer needs it. */
export type CustomStampInfo = {
  /** "c:<uuid>" (lower case, 38 characters) */
  id: string;
  uuid: string;
  category: PressCategory;
  /** the category's colour (stamps.ts STAMP_CATEGORIES color: bright palette, rung 3) */
  hex: string;
  gold: boolean;
  state: CustomStampState;
  /** the #topic without "#", "" unless state is "ok" (or the caller's own) */
  topic: string;
  /** a signed https link (or a file:// of a just-made stamp), null when there is no picture */
  url: string | null;
  /** the image cache key: "<image_path>" (it carries the version), "" without a picture */
  key: string;
  /** the caller's own stamp (no Keep / Report on it) */
  mine: boolean;
};

/** One of my stamps (my_custom_stamps), newest first. */
export type MyCustomStamp = CustomStampInfo & {
  filter: PressFilter;
  status: "pending" | "approved" | "removed";
  version: number;
  /** how many of my letters carry it */
  letters: number;
  createdAt: string;
};

/** A stranger's stamp I kept (my_kept_stamps), newest kept first. */
export type KeptStamp = CustomStampInfo & {
  owner: string;
  keptAt: string;
  fromLetter: string | null;
  fromThread: string | null;
};

/* ── the store ─────────────────────────────────────────────────────────────────────────────── */

const infos = new Map<string, CustomStampInfo>();
/** when each id was last asked of the server (epoch ms) */
const askedAt = new Map<string, number>();
/** ids being asked right now */
const asking = new Set<string>();
/** signed links by storage path */
const signedByPath = new Map<string, { url: string; exp: number }>();
const keptIds = new Set<string>();

let mine: MyCustomStamp[] = [];
let quota: StampQuota | null = null;
let mineLoading = false;
let kept: KeptStamp[] = [];
let keptLoading = false;

let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  ensureAuthWatch();
  return () => {
    listeners.delete(f);
  };
};
const getVersion = () => version;

const hexOf = (c: PressCategoryId): string => STAMP_CATEGORIES.find((x) => x.id === c)?.color ?? UNKNOWN_HEX;

/* ── signing out empties everything ── */

let authWatched = false;
function ensureAuthWatch(): void {
  if (authWatched || !supabase) return;
  authWatched = true;
  try {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") resetCustomStamps();
    });
  } catch (e) {
    console.warn("[custom-stamps] couldn't watch the session", e);
  }
}

/** Forgets every custom stamp here and in Swift (sign-out, account switch). */
export function resetCustomStamps(): void {
  infos.clear();
  askedAt.clear();
  asking.clear();
  signedByPath.clear();
  keptIds.clear();
  mine = [];
  quota = null;
  kept = [];
  clearCustomStamps();
  emit();
}

/* ── Swift ── */

let wordsLang = "";
function sendWords(): void {
  const lang = getLang();
  if (wordsLang === lang) return;
  const sent = setCustomStampWords({
    keep: t("cs2.use.keep"),
    report: t("cs2.use.report"),
    neverMind: t("cs2.use.neverMind"),
    inAlbum: t("cs2.use.inAlbum"),
    a11yStamp: t("cs2.use.a11yStamp", { topic: "{topic}" }),
    a11yBlank: t("cs2.use.a11yBlank"),
  });
  if (sent) wordsLang = lang;
}

function push(list: readonly CustomStampInfo[]): void {
  if (!list.length) return;
  sendWords();
  setCustomStamps(list.map((i) => nativeRow(i, keptIds.has(i.id))));
}

/* ── signing ── */

async function sign(paths: readonly string[]): Promise<void> {
  const now = Date.now();
  const todo = [...new Set(paths)].filter((p) => needsResign(signedByPath.get(p)?.exp, now));
  if (!todo.length || !supabase) return;
  for (const chunk of batches(todo, 100)) {
    try {
      const { data, error } = await supabase.storage.from("stamps").createSignedUrls(chunk, SIGN_SECONDS);
      if (error) throw error;
      const exp = Date.now() + SIGN_SECONDS * 1000;
      for (const d of data ?? []) {
        if (d.signedUrl && d.path) signedByPath.set(d.path, { url: d.signedUrl, exp });
        else if (d.error) console.log("[custom-stamps] couldn't sign", d.path, d.error);
      }
    } catch (e) {
      console.warn("[custom-stamps] signing stamp pictures failed", e);
    }
  }
}

/** A read row with its picture: the signed link, or my own original for a pending one. */
function withPicture(r: ReadRow): CustomStampInfo {
  const { path, version: _v, ...info } = r;
  void _v;
  let url: string | null = null;
  /* MY OWN STAMP IS ALREADY ON THIS PHONE (owner, 2026-10-20: the album was slow to show what I had
     just made). The approved picture this phone sent is the same picture the bucket holds, so it is
     drawn from here first — no signed link, no download; the server's copy is for stamps made on
     another phone and for everyone else's. */
  if (r.mine && r.state === "ok") url = pictureFor(r.uuid);
  if (!url && path && wantsPicture(r)) url = signedByPath.get(path)?.url ?? null;
  if (!url && r.mine && (r.state === "pending" || r.state === "rejected")) url = originalFor(r.uuid);
  return { ...info, category: info.category as PressCategory, url, key: url ? info.key || `local:${r.uuid}` : "" };
}

function remember(list: readonly CustomStampInfo[]): void {
  for (const i of list) infos.set(i.id, i);
}

/* ── resolving ── */

let forWarned = false;

/** Resolve the custom ids among `ids` (others are ignored): cached, signed, pushed to Swift. */
export async function resolveCustomStamps(ids: readonly string[]): Promise<Map<string, CustomStampInfo>> {
  const custom = customIds(ids);
  const out = () => new Map(custom.filter((id) => infos.has(id)).map((id) => [id, infos.get(id)!] as const));
  if (!custom.length) return out();
  ensureAuthWatch();
  if (!supabaseReady || !supabase) return out();

  const now = Date.now();
  // links that are about to lapse are signed again, whatever else happens
  const lapsing = custom.map((id) => infos.get(id)).filter((i): i is CustomStampInfo => !!i && !!i.key && !i.key.startsWith("local:") && needsResign(signedByPath.get(i.key)?.exp, now));
  const todo = custom.filter((id) => !asking.has(id) && now - (askedAt.get(id) ?? 0) > RESOLVE_TTL_MS);

  const changed: CustomStampInfo[] = [];
  if (lapsing.length && !todo.length) {
    await sign(lapsing.map((i) => i.key));
    for (const i of lapsing) {
      const url = signedByPath.get(i.key)?.url ?? null;
      if (url && url !== i.url) changed.push({ ...i, url });
    }
  }

  if (todo.length) {
    todo.forEach((id) => asking.add(id));
    try {
      for (const batch of batches(todo)) {
        const uuids = batch.map((id) => id.slice(2));
        const { data, error } = await supabase.rpc("custom_stamps_for", { p_ids: uuids });
        if (error) throw error;
        const { rows, bad } = parseForRows(data, hexOf);
        if (bad) console.log(`[custom-stamps] custom_stamps_for: ${bad} unreadable row(s)`, data);
        await sign(rows.filter(wantsPicture).map((r) => r.path!));
        const at = Date.now();
        batch.forEach((id) => askedAt.set(id, at));
        for (const r of rows) changed.push(withPicture(r));
        // no row: unknown to this reader (KStamp keeps the unknown frame)
      }
    } catch (e) {
      if (!forWarned) {
        forWarned = true;
        console.log("[custom-stamps] custom_stamps_for unavailable (has 0038 run? signed in?)", e);
      }
    } finally {
      todo.forEach((id) => asking.delete(id));
    }
  }

  if (changed.length) {
    remember(changed);
    push(changed);
    emit();
  }
  return out();
}

/** The cached info for one id, synchronously (null when unknown or not a custom id). */
export function customStampNow(id: string): CustomStampInfo | null {
  return infos.get(id) ?? null;
}

/** Was this stranger's stamp kept into my album (as far as this phone knows)? */
export const isKeptStamp = (id: string): boolean => keptIds.has(id);

/** A stamp just approved by the press: known at once (signed), before my_custom_stamps answers. */
async function adoptPressed(stamp: PressedStamp): Promise<void> {
  const uuid = stamp.id.toLowerCase();
  const id = `c:${uuid}`;
  const row: ReadRow = {
    id,
    uuid,
    category: stamp.category,
    hex: hexOf(stamp.category),
    gold: stamp.gold,
    state: "ok",
    topic: stamp.topic,
    url: null,
    key: stamp.imagePath ?? "",
    mine: true,
    path: stamp.imagePath,
    version: stamp.version,
  };
  if (row.path) await sign([row.path]);
  const info = withPicture(row);
  remember([info]);
  askedAt.set(id, Date.now());
  push([info]);
  emit();
}

let adoptedAt = 0;
/** Adopts the press's last approval once (any screen that shows stamps calls it). */
function usePressedAdoption(onAdopt?: () => void): void {
  const pressed = usePressedStamp();
  useEffect(() => {
    if (!pressed || pressed.at <= adoptedAt) return;
    adoptedAt = pressed.at;
    void adoptPressed(pressed.stamp).then(() => onAdopt?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressed?.at]);
}

/** Resolves `ids` on mount/change and re-renders when their infos arrive; returns a lookup. */
export function useCustomStamps(ids: readonly string[]): (id: string) => CustomStampInfo | null {
  const lang = useLang();
  const sig = customIds(ids).join(",");
  const v = useSyncExternalStore(subscribe, getVersion, getVersion);
  useEffect(() => {
    if (sig) void resolveCustomStamps(sig.split(","));
  }, [sig]);
  useEffect(() => {
    wordsLang = "";
    if (infos.size) sendWords();
  }, [lang]);
  usePressedAdoption();
  // a new function whenever an info lands, so memos that read it recompute
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((id: string) => customStampNow(id), [v]);
}

/* ── my stamps ── */

let mineWarned = false;
async function refreshMine(): Promise<void> {
  if (mineLoading) return;
  mineLoading = true;
  emit();
  try {
    const q = await fetchStampQuota();
    quota = q;
    if (!q || !supabase) {
      mine = [];
      return;
    }
    const { data, error } = await supabase.rpc("my_custom_stamps");
    if (error) throw error;
    const { rows, bad } = parseMyRows(data, hexOf);
    if (bad) console.log(`[custom-stamps] my_custom_stamps: ${bad} unreadable row(s)`);
    await sign(rows.filter(wantsPicture).map((r) => r.path!));
    const at = Date.now();
    mine = rows.map((r) => {
      const info = withPicture(r);
      askedAt.set(info.id, at);
      return { ...info, filter: r.filter as PressFilter, status: r.status, version: r.version, letters: r.letters, createdAt: r.createdAt };
    });
    remember(mine);
    push(mine);
  } catch (e) {
    if (!mineWarned) {
      mineWarned = true;
      console.log("[custom-stamps] my_custom_stamps unavailable", e);
    }
  } finally {
    mineLoading = false;
    emit();
  }
}

/** My own stamps and my quota (quota null = 0038 not run / offline: hide the feature). */
export function useMyCustomStamps(): { stamps: MyCustomStamp[]; quota: StampQuota | null; loading: boolean; refresh: () => Promise<void> } {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  useFocusEffect(
    useCallback(() => {
      void refreshMine();
    }, []),
  );
  usePressedAdoption(() => void refreshMine());
  return useMemo(() => ({ stamps: mine, quota, loading: mineLoading, refresh: refreshMine }), [version]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ── kept stamps ── */

let keptWarned = false;
async function refreshKept(): Promise<void> {
  if (keptLoading || !supabaseReady || !supabase) return;
  keptLoading = true;
  emit();
  try {
    const { data, error } = await supabase.rpc("my_kept_stamps");
    if (error) throw error;
    const { rows, bad } = parseKeptRows(data, hexOf);
    if (bad) console.log(`[custom-stamps] my_kept_stamps: ${bad} unreadable row(s)`);
    await sign(rows.filter(wantsPicture).map((r) => r.path!));
    keptIds.clear();
    const at = Date.now();
    kept = rows.map((r) => {
      keptIds.add(r.id);
      const info = withPicture(r);
      askedAt.set(info.id, at);
      return { ...info, owner: r.owner, keptAt: r.keptAt, fromLetter: r.fromLetter, fromThread: r.fromThread };
    });
    remember(kept);
    push(kept);
  } catch (e) {
    if (!keptWarned) {
      keptWarned = true;
      console.log("[custom-stamps] my_kept_stamps unavailable", e);
    }
  } finally {
    keptLoading = false;
    emit();
  }
}

/** The strangers' stamps I kept. */
export function useKeptStamps(): { stamps: KeptStamp[]; loading: boolean; refresh: () => Promise<void> } {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  useFocusEffect(
    useCallback(() => {
      void refreshKept();
    }, []),
  );
  return useMemo(() => ({ stamps: kept, loading: keptLoading, refresh: refreshKept }), [version]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ── the 0038 client functions ── */

function update(id: string, patch: Partial<CustomStampInfo>): void {
  const cur = infos.get(id);
  if (!cur) return;
  const next = { ...cur, ...patch };
  infos.set(id, next);
  push([next]);
  emit();
}

/** keep_custom_stamp → "kept" | "already" | "no", null when it couldn't be asked */
export async function keepCustomStamp(id: string, from: { letter?: string | null; thread?: string | null }): Promise<"kept" | "already" | "no" | null> {
  const uuid = id.startsWith("c:") ? id.slice(2) : null;
  if (!uuid || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc("keep_custom_stamp", { p_stamp: uuid, p_letter: from.letter ?? null, p_thread: from.thread ?? null });
    if (error) throw error;
    const out = data === "kept" || data === "already" || data === "no" ? data : null;
    if (!out) console.log("[custom-stamps] keep_custom_stamp answered", data);
    if (out === "kept" || out === "already") {
      keptIds.add(id);
      const cur = infos.get(id);
      if (cur) push([cur]);
      void refreshKept();
      emit();
    }
    return out;
  } catch (e) {
    console.warn("[custom-stamps] keep_custom_stamp failed", e);
    return null;
  }
}

/** unkeep_custom_stamp → true when it left the album */
export async function unkeepCustomStamp(id: string): Promise<boolean> {
  const uuid = id.startsWith("c:") ? id.slice(2) : null;
  if (!uuid || !supabase) return false;
  try {
    const { data, error } = await supabase.rpc("unkeep_custom_stamp", { p_stamp: uuid });
    if (error) throw error;
    if (data !== "removed") {
      console.log("[custom-stamps] unkeep_custom_stamp answered", data);
      return false;
    }
    keptIds.delete(id);
    kept = kept.filter((k) => k.id !== id);
    const cur = infos.get(id);
    if (cur) push([cur]);
    emit();
    return true;
  } catch (e) {
    console.warn("[custom-stamps] unkeep_custom_stamp failed", e);
    return false;
  }
}

/** report_custom_stamp → "reported" | "already" | "no", null when it couldn't be asked */
export async function reportCustomStamp(id: string, reason: "harassment" | "inappropriate" | "spam" | "other", letter?: string | null): Promise<"reported" | "already" | "no" | null> {
  const uuid = id.startsWith("c:") ? id.slice(2) : null;
  if (!uuid || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc("report_custom_stamp", { p_stamp: uuid, p_reason: reason, p_letter: letter ?? null });
    if (error) throw error;
    const out = data === "reported" || data === "already" || data === "no" ? data : null;
    if (!out) console.log("[custom-stamps] report_custom_stamp answered", data);
    if (out === "reported" || out === "already") {
      // hidden from me at once, and out of my album (the server did the same)
      keptIds.delete(id);
      kept = kept.filter((k) => k.id !== id);
      update(id, { state: "hidden", url: null, key: "", topic: "" });
      emit();
    }
    return out;
  } catch (e) {
    console.warn("[custom-stamps] report_custom_stamp failed", e);
    return null;
  }
}

/** delete_custom_stamp, then storage.remove of the returned path → true when deleted */
export async function deleteCustomStamp(id: string): Promise<boolean> {
  const uuid = id.startsWith("c:") ? id.slice(2) : null;
  if (!uuid || !supabase) return false;
  try {
    const { data, error } = await supabase.rpc("delete_custom_stamp", { p_stamp: uuid });
    if (error) throw error;
    if (typeof data === "string" && data) {
      const { error: rmError } = await supabase.storage.from("stamps").remove([data]);
      // the row is already deleted (its picture is no longer served); a file left behind is logged
      if (rmError) console.warn("[custom-stamps] the deleted stamp's file stayed in storage", data, rmError);
    }
    forgetOriginal(uuid);
    forgetPicture(uuid);
    mine = mine.filter((m) => m.id !== id);
    update(id, { state: "deleted", url: null, key: "", topic: "" });
    emit();
    return true;
  } catch (e) {
    console.warn("[custom-stamps] delete_custom_stamp failed", e);
    return false;
  }
}

/* ── the flows the screens share (Today's card, the reader, the album) ──────────────────────
   Keep: one tap, a light haptic, and the line "Kept in your album." for the caller's toast.
   Report: the reason first (an Alert with the four 0038 reasons and Never mind), then the report;
   the stamp is hidden from the reader at once (the registry redraws it as the frame). Each
   resolves to the line the caller shows (null for none: cancelled); a failure says so. */

type Reason = "harassment" | "inappropriate" | "spam" | "other";
const REASONS: readonly Reason[] = ["harassment", "inappropriate", "spam", "other"];

/** Keep a stranger's stamp from a letter (or a correspondence). → the toast's line. */
export async function keepStampFlow(id: string, from: { letter?: string | null; thread?: string | null }): Promise<string> {
  const out = await keepCustomStamp(id, from);
  if (out === "kept" || out === "already") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    return out === "kept" ? t("cs2.use.kept") : t("cs2.use.inAlbum");
  }
  return t("cs2.col.failed");
}

/** Ask why, then report. → the toast's line, or null when the reader changed their mind. */
export function reportStampFlow(id: string, letter?: string | null): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(t("cs2.col.reasonTitle"), undefined, [
      ...REASONS.map((r) => ({
        text: t(`cs2.col.reason.${r}`),
        onPress: () => {
          void reportCustomStamp(id, r, letter ?? null).then((out) => resolve(out === "reported" || out === "already" ? t("cs2.col.reported") : t("cs2.col.failed")));
        },
      })),
      { text: t("cs2.use.neverMind"), style: "cancel" as const, onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}
