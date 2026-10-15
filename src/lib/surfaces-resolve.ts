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
