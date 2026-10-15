/* WHICH ROW WINS — pure, so it can run under plain node
   (node src/lib/surfaces.test.ts). lib/surfaces does the fetching and the
   caching; this only decides.

   A row is (surface, app_version, native) from app_surfaces (web 0033).
   For one binary the rows that count are its own version's and the '*'
   ones; its own version beats '*', whatever order the rows arrive in.
   Rows for other versions are ignored even if the server sent them, and
   a row that is not the right shape is skipped rather than guessed at. */

export type SurfaceRow = { surface: string; app_version: string; native: boolean };
/** surface key → true (SwiftUI) / false (React Native) */
export type SurfaceMap = Record<string, boolean>;

export function resolveSurfaces(rows: readonly unknown[], version: string | null): SurfaceMap {
  const star: SurfaceMap = {};
  const exact: SurfaceMap = {};
  const mine = version?.trim() || null;
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const { surface, app_version, native } = r as Partial<SurfaceRow>;
    if (typeof surface !== "string" || !surface.trim() || typeof native !== "boolean") continue;
    const v = typeof app_version === "string" ? app_version.trim() : "";
    if (v === "*") star[surface.trim()] = native;
    else if (mine && v === mine) exact[surface.trim()] = native;
  }
  return { ...star, ...exact };
}

/* The table's answer, else the build's default, else React Native. Only a
   real boolean counts, so a key like "constructor" can never read a
   function off the object as "on". */
export function surfaceOn(remote: SurfaceMap | null, defaults: SurfaceMap, key: string): boolean {
  const r = remote ? remote[key] : undefined;
  if (typeof r === "boolean") return r;
  return defaults[key] === true;
}

/* ── THE CRASH BREADCRUMB (pure, like the rest of this file) ──────────────
   The remote switch can only route around a broken Swift screen once the
   makers know it is broken. A screen that crashes the app as it opens
   needs no one to notice: before its Host mounts, lib/surfaces writes an
   arming mark for it, and the mark is cleared a few seconds after the Host
   has laid out. A mark still there at the next launch means that process
   died while the screen was opening: a strike. Two strikes in a row on the
   same binary and the screen stays React Native on this phone until a new
   binary arrives; any mount that clears forgives the count.

   The record is one small JSON object (raw AsyncStorage
   kindredly_native_arming), so several Swift screens can be armed at once:
   the tabs keep theirs mounted side by side. */

/** strikes in a row that send a surface back to React Native for this binary */
export const MAX_STRIKES = 2;

export type ArmingRecord = {
  /** the binary the marks and strikes belong to ("1.3.0 (29)"); another binary's are dropped */
  binary: string | null;
  /** surfaces mounted and not yet cleared: surface → when it was armed (epoch ms) */
  armed: Record<string, number>;
  /** consecutive mounts that never cleared, per surface */
  strikes: Record<string, number>;
};

export const emptyArming = (binary: string | null): ArmingRecord => ({ binary, armed: {}, strikes: {} });

/* positive finite numbers under real keys; anything else is dropped */
function counts(o: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!o || typeof o !== "object" || Array.isArray(o)) return out;
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (k.trim() && typeof v === "number" && Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}

/** At launch: what the last process left, settled. Every mark still armed
    never cleared (that process died while the screen was opening) and
    becomes a strike; the marks themselves are spent. A record from another
    binary, or one that isn't the right shape, starts clean. `raw` is the
    stored string, or null when nothing is stored. */
export function settleArming(raw: string | null, binary: string | null): ArmingRecord {
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null; // a torn write is a clean start, not a strike
    }
  }
  if (!parsed || typeof parsed !== "object" || (parsed as { binary?: unknown }).binary !== binary) return emptyArming(binary);
  const p = parsed as { armed?: unknown; strikes?: unknown };
  const strikes = counts(p.strikes);
  for (const s of Object.keys(counts(p.armed))) strikes[s] = (strikes[s] ?? 0) + 1;
  return { binary, armed: {}, strikes };
}

/** the record with `surface` armed (a new object; the old one is untouched) */
export function armSurface(rec: ArmingRecord, surface: string, now: number): ArmingRecord {
  return { ...rec, armed: { ...rec.armed, [surface]: now } };
}

/** the record with `surface` cleared: its mark gone and its strikes forgiven */
export function clearSurface(rec: ArmingRecord, surface: string): ArmingRecord {
  const armed = { ...rec.armed };
  const strikes = { ...rec.strikes };
  delete armed[surface];
  delete strikes[surface];
  return { ...rec, armed, strikes };
}

/** true = this surface has struck out on this binary: React Native only */
export function struckOut(rec: ArmingRecord | null, surface: string): boolean {
  if (!rec || !Object.prototype.hasOwnProperty.call(rec.strikes, surface)) return false;
  const n = rec.strikes[surface];
  return typeof n === "number" && n >= MAX_STRIKES;
}
