/* CUSTOM STAMPS, THE PURE HALF (contract .claude/custom-stamps/CONTRACT.md §3, §4.1). Build agent
   B "collection". lib/custom-stamps is the React Native glue (Supabase, signing, the store, the
   push to Swift); everything here is pure and node-tested (custom-stamps-core.test.ts):

     · the "c:<uuid>" id test and its two conversions
     · reading the three 0038 lists (custom_stamps_for, my_custom_stamps, my_kept_stamps) into
       the shapes renderers use, refusing anything unreadable row by row (a bad row is dropped and
       counted, never guessed at)
     · what a renderer draws for a state (§3's table): a photo, a greyed photo, or the frame alone
     · the row Swift's registry takes (KCustomStamps.merge, Portable/Kit/KStampArt.swift)
     · when a signed link needs signing again, and the batches of 60 custom_stamps_for takes

   The category's colour is passed in (hexOf) so this file needs nothing from data/stamps. */

export type PressCategoryId = "confessions" | "almosts" | "latenights" | "small" | "becoming" | "missing";
const CATEGORIES: readonly PressCategoryId[] = ["confessions", "almosts", "latenights", "small", "becoming", "missing"];
/** every filter id a stored stamp may carry: today's looks and 2026-10-19's (stamp-press-core
    PRESS_FILTERS / LEGACY_FILTERS; a stamp made then must not drop out of the album) */
const FILTERS = ["original", "vivid", "warm", "golden", "film", "airy", "gilt", "paper", "riso", "night", "sun", "sticker"] as const;
export type FilterId = (typeof FILTERS)[number];

export type StampState = "ok" | "pending" | "rejected" | "removed" | "deleted" | "hidden" | "blank";
const STATES: readonly StampState[] = ["ok", "pending", "rejected", "removed", "deleted", "hidden", "blank"];

/** the fallback colour for nothing known at all (STAMP_FALLBACK_HEX) */
export const UNKNOWN_HEX = "#8B7FE8";
/** custom_stamps_for takes at most this many ids per call (0038 §6.3) */
export const FOR_BATCH = 60;
/** a signed link lives this long (createSignedUrls) */
export const SIGN_SECONDS = 3600;
/** and is signed again when less than this is left */
export const RESIGN_MS = 5 * 60 * 1000;
/** a resolved id is asked again after this long (a takedown or a delete shows up) */
export const RESOLVE_TTL_MS = 10 * 60 * 1000;

const CUSTOM_RE = /^c:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** is this letters.stamp value a custom photo stamp ("c:<uuid>", lower case)? */
export const isCustomStampId = (id: unknown): id is string => typeof id === "string" && CUSTOM_RE.test(id);
/** the uuid of "c:<uuid>", or null */
export const customStampUuid = (id: unknown): string | null => {
  const m = typeof id === "string" ? CUSTOM_RE.exec(id) : null;
  return m ? m[1] : null;
};
/** a stamp uuid → the value a letter carries */
export const customStampId = (uuid: string): string => `c:${uuid.toLowerCase()}`;

export const isCategoryId = (v: unknown): v is PressCategoryId => typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);

/** The renderer's view of one custom stamp (custom-stamps.ts CustomStampInfo has the same shape). */
export type Info = {
  id: string;
  uuid: string;
  category: PressCategoryId;
  hex: string;
  gold: boolean;
  state: StampState;
  topic: string;
  url: string | null;
  key: string;
  mine: boolean;
};

/** One row as read, before signing: `path` is the storage path (null = no picture). */
export type ReadRow = Info & { path: string | null; version: number };

export type MyRow = ReadRow & {
  filter: FilterId;
  status: "pending" | "approved" | "removed";
  letters: number;
  createdAt: string;
};

export type KeptRow = ReadRow & {
  owner: string;
  keptAt: string;
  fromLetter: string | null;
  fromThread: string | null;
};

type HexOf = (category: PressCategoryId) => string;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const uuidOf = (v: unknown): string | null => {
  const s = str(v).toLowerCase();
  return UUID_RE.test(s) ? s : null;
};
const intOf = (v: unknown, dflt: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : dflt;
};
const pathOf = (v: unknown): string | null => {
  const s = str(v).trim();
  return s ? s : null;
};
const rows = (data: unknown): Record<string, unknown>[] =>
  Array.isArray(data) ? data.filter((r): r is Record<string, unknown> => !!r && typeof r === "object") : [];

/** The topic as it is shown: no leading "#", trimmed ("" for none). */
export const cleanTopic = (v: unknown): string => str(v).replace(/^[#＃\s]+/u, "").trim();

function base(id: string, category: PressCategoryId, state: StampState, r: Record<string, unknown>, hexOf: HexOf, mine: boolean): ReadRow {
  const path = pathOf(r.image_path);
  const version = intOf(r.version, 1);
  return {
    id: customStampId(id),
    uuid: id,
    category,
    hex: hexOf(category),
    gold: r.gold === true,
    state,
    topic: cleanTopic(r.topic),
    url: null,
    // the picture's identity: the path carries the version (<owner>/<id>/<version>.jpg)
    key: path ?? "",
    mine,
    path,
    version,
  };
}

/** custom_stamps_for rows → read rows. `bad` counts the rows that couldn't be read. */
export function parseForRows(data: unknown, hexOf: HexOf): { rows: ReadRow[]; bad: number } {
  const out: ReadRow[] = [];
  let bad = 0;
  for (const r of rows(data)) {
    const id = uuidOf(r.id);
    const state = STATES.includes(r.state as StampState) ? (r.state as StampState) : null;
    if (!id || !isCategoryId(r.category) || !state || state === "blank") {
      bad++;
      continue;
    }
    out.push(base(id, r.category, state, r, hexOf, r.mine === true));
  }
  return { rows: out, bad };
}

/** my_custom_stamps rows → my stamps (newest first, as the server orders them). */
export function parseMyRows(data: unknown, hexOf: HexOf): { rows: MyRow[]; bad: number } {
  const out: MyRow[] = [];
  let bad = 0;
  for (const r of rows(data)) {
    const id = uuidOf(r.id);
    const status = r.status === "pending" || r.status === "approved" || r.status === "removed" ? r.status : null;
    const filter = (FILTERS as readonly string[]).includes(str(r.filter)) ? (str(r.filter) as FilterId) : null;
    if (!id || !isCategoryId(r.category) || !status || !filter) {
      bad++;
      continue;
    }
    const state: StampState = status === "approved" ? "ok" : status;
    out.push({ ...base(id, r.category, state, r, hexOf, true), filter, status, letters: Math.max(0, intOf(r.letters, 0)), createdAt: str(r.created_at) });
  }
  return { rows: out, bad };
}

/** my_kept_stamps rows → kept stamps (newest kept first). */
export function parseKeptRows(data: unknown, hexOf: HexOf): { rows: KeptRow[]; bad: number } {
  const out: KeptRow[] = [];
  let bad = 0;
  for (const r of rows(data)) {
    const id = uuidOf(r.stamp_id);
    const state = STATES.includes(r.state as StampState) ? (r.state as StampState) : null;
    if (!id || !isCategoryId(r.category) || !state || state === "blank") {
      bad++;
      continue;
    }
    out.push({
      ...base(id, r.category, state, r, hexOf, false),
      owner: str(r.owner),
      keptAt: str(r.kept_at),
      fromLetter: uuidOf(r.from_letter),
      fromThread: uuidOf(r.from_thread),
    });
  }
  return { rows: out, bad };
}

/** Whether a row's picture should be signed: an approved stamp, or my own taken-down one (drawn greyed). */
export const wantsPicture = (r: Pick<ReadRow, "state" | "mine" | "path">): boolean => !!r.path && (r.state === "ok" || (r.mine && r.state === "removed"));

/** What a renderer draws (§3's table). */
export type Look = "photo" | "greyed" | "frame" | "unknown";
export function lookOf(info: Pick<Info, "state" | "mine" | "url"> | null): Look {
  if (!info) return "unknown";
  if (!info.url) return "frame";
  if (info.state === "ok") return "photo";
  if (info.mine && (info.state === "pending" || info.state === "rejected")) return "photo";
  if (info.mine && info.state === "removed") return "greyed";
  return "frame";
}

/** The #topic (without "#") a letter's tag shows for a custom stamp: ok, or my own pending /
    rejected one (§3); nothing for removed, deleted, hidden, blank. */
export const tagOf = (info: Pick<Info, "state" | "topic"> | null): string =>
  info && (info.state === "ok" || info.state === "pending" || info.state === "rejected") ? info.topic : "";

/** May the reader keep or report it (a stranger's approved stamp)? */
/** Keeping strangers' stamps waits for the next version (owner, 2026-10-20: Today has no way in
    yet), so nothing offers it; flip this when it ships. */
export const KEEP_STAMPS_ON = false;
export const canKeep = (info: Pick<Info, "state" | "mine"> | null): boolean => KEEP_STAMPS_ON && !!info && !info.mine && info.state === "ok";

/** The row Swift's registry takes (KCustomStamps.merge). Strings only where Swift wants strings. */
export type NativeRow = { id: string; state: StampState; hex: string; gold: boolean; topic: string; url: string; key: string; mine: boolean; kept: boolean };
export function nativeRow(info: Info, kept: boolean): NativeRow {
  return { id: info.id, state: info.state, hex: info.hex, gold: info.gold, topic: info.topic, url: info.url ?? "", key: info.key, mine: info.mine, kept };
}

/** Split into batches of `size` (custom_stamps_for's 60). */
export function batches<T>(list: readonly T[], size = FOR_BATCH): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** The custom ids among `ids`, each once, in order. */
export function customIds(ids: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) if (isCustomStampId(id) && !seen.has(id)) (seen.add(id), out.push(id));
  return out;
}

/** Does a link that expires at `expiresAt` (epoch ms) need signing again at `now`? */
export const needsResign = (expiresAt: number | undefined, now: number): boolean => expiresAt == null || expiresAt - now < RESIGN_MS;

/* ── stamps in review on this phone (owner, 2026-10-20: the check is slow, show it first) ──────
   A stamp pressed here is in the album at once, "in review", while stamp-check runs (and while
   it waits as a draft). stamp_check_begin reserves the server's own 'pending' row the moment the
   check starts, so a my_custom_stamps read during the check has that row too: it is the same
   stamp, and is hidden behind the local one (the closest in time, one each). */

export type LocalPress = { at: number; state: "pending" | "rejected" };

/** how far apart the phone's press and the server's pending row may be (clocks drift; a draft is
    sent again later, and the row it reserves then is newer) */
export const TWIN_BEFORE_MS = 5 * 60 * 1000;
export const TWIN_AFTER_MS = 15 * 60 * 1000;

/** The server's rows without the pending twin of each local press still in review. */
export function withoutTwins<T extends { status: string; createdAt: string }>(server: readonly T[], local: readonly LocalPress[]): T[] {
  const hidden = new Set<number>();
  const times = server.map((r) => (r.status === "pending" ? Date.parse(r.createdAt) : NaN));
  for (const l of [...local].filter((x) => x.state === "pending").sort((a, b) => a.at - b.at)) {
    let best = -1;
    let gap = Infinity;
    times.forEach((t, i) => {
      if (!Number.isFinite(t) || hidden.has(i) || t < l.at - TWIN_BEFORE_MS || t > l.at + TWIN_AFTER_MS) return;
      const g = Math.abs(t - l.at);
      if (g < gap) (gap = g), (best = i);
    });
    if (best >= 0) hidden.add(best);
  }
  return server.filter((_, i) => !hidden.has(i));
}

/** A random v4 uuid (a local press's id until the server gives the stamp its own). */
export function localUuid(rand: () => number = Math.random): string {
  const h = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join("");
  return `${h(8)}-${h(4)}-4${h(3)}-${"89ab"[Math.floor(rand() * 4)]}${h(3)}-${h(12)}`;
}
