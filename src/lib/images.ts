/* PICTURES, HANDED TO SWIFT AS A URL AND A KEY.
   ────────────────────────────────────────────────────────────────────────
   Swift never resolves a React Native asset. Every picture a SwiftUI
   screen shows reaches it as { uri, key } — a file:// or https URL to load,
   and a stable key for KImageStore's cache (foundation, image_bridge):

     bundled PNGs      assetImageRef(require(…))   key asset:<content hash>
     Supabase media    useSignedImageRefs(…)       key <bucket>:<path>
     RN-only drawings  faces.ts / bird-images.ts   key svg:/glyph:/bird:…
     mosaics           no picture at all            (lib/mosaic → a mask)

   The key is never the signed URL: links are re-signed every ~50 minutes
   and the cache must not refetch a photo it already holds. Nor is it a
   bundle path: an over-the-air update can redraw a picture behind the same
   module (the portraits were redrawn behind their ids on 2026-10-15), so a
   bundled picture is keyed by its content hash.

   WHY expo-asset AND NOT Image.resolveAssetSource: in dev the resolver
   hands out Metro http URLs, and in release its answer depends on whether
   expo-asset's transformer already downloaded the file. Asset.fromModule()
   .downloadAsync().localUri is a file:// path in release and after an OTA
   update, and a downloaded cache file in dev — always something
   FileManager can open. */

import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { cachedSignedUrl, signedMediaUrl } from "./db";

/** What a SwiftUI image takes (KImageRef in Swift; KImageRefProps in modules/kindredly-ui). */
export type ImageRefRecord = {
  /** file:// or https URL to load */
  uri: string;
  /** stable cache key: asset:<hash>, <bucket>:<path>, svg:<id>, glyph:<seed>, bird:… */
  key: string;
  /** 'videoPoster' asks KImageStore for the first frame of a video file */
  kind?: "image" | "videoPoster";
};

/** An image ref flattened for a Swift @Field record (a record field can't be optional
    or null): no picture is uri "" — the adapter treats an empty uri as none. */
export type ImageRecordFields = { uri: string; key: string; kind: "image" | "videoPoster" };
/** Flatten an image ref (or its absence) for a Swift record. */
export function imageRecord(ref: ImageRefRecord | null | undefined): ImageRecordFields {
  return ref ? { uri: ref.uri, key: ref.key, kind: ref.kind ?? "image" } : { uri: "", key: "", kind: "image" };
}

/** A storage bucket whose files are read through signed links (db.ts signedMediaUrl). */
export type MediaBucket = "moments" | "voice-letters";

/* ── existence ─────────────────────────────────────────────────────────── */

/** Does a local file still exist? iOS purges tmp and Caches files whenever
    it likes, so a cached snapshot path has to be checked before it is used
    again. http(s) URLs and unreadable paths count as present (nothing to
    re-make here); a file:// path that is gone counts as missing. */
export function fileExists(uri: string | null | undefined): boolean {
  if (!uri) return false;
  if (!uri.startsWith("file:") && !uri.startsWith("/")) return true;
  try {
    return new File(uri.startsWith("/") ? "file://" + uri : uri).exists;
  } catch (e) {
    if (__DEV__) console.warn("[images] couldn't check", uri, String((e as Error)?.message ?? e));
    return true;
  }
}

/* ── snapshot keys ─────────────────────────────────────────────────────── */

/* Snapshots (FaceSnapshots, BirdSnapshots) are captured afresh every
   launch: the map of captured files lives in memory. Their cache keys carry
   this launch's token, so KImageStore's disk cache can never hand a new
   bundle (an OTA can redraw a face or the bird) a picture captured by an
   older one; within a launch the key is stable, so a recapture of the same
   drawing reuses the cached pixels. */
const SNAPSHOT_SESSION = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** A snapshot's KImageStore key: its drawing ("svg:<id>", "glyph:<seed>", "bird:…") plus this launch's token. */
export const snapshotCacheKey = (drawing: string): string => drawing + "#" + SNAPSHOT_SESSION;

/* ── bundled assets ────────────────────────────────────────────────────── */

const assetRefs = new Map<number, Promise<ImageRefRecord>>();
const assetDone = new Map<number, ImageRefRecord>();

/** A bundled asset (a `require(...)` module number) as a local file and a
    content key. Memoised per module; a failure is not memoised, so the next
    call tries again. Rejects when the module isn't an asset or can't be
    downloaded (dev server down). */
export function assetImageRef(mod: number): Promise<ImageRefRecord> {
  const hit = assetRefs.get(mod);
  if (hit) return hit;
  const p = (async () => {
    const asset = await Asset.fromModule(mod).downloadAsync();
    const uri = asset.localUri;
    if (!uri) throw new Error(`asset ${mod} has no local file after downloadAsync`);
    const ref: ImageRefRecord = { uri, key: "asset:" + (asset.hash || uri) };
    assetDone.set(mod, ref);
    return ref;
  })();
  assetRefs.set(mod, p);
  p.catch(() => assetRefs.delete(mod));
  return p;
}

/** A bundled asset's local file:// URI (Asset.fromModule(mod).downloadAsync().localUri), memoised. */
export async function assetFileUri(mod: number): Promise<string> {
  return (await assetImageRef(mod)).uri;
}

/** The ref if this module was already resolved this session — for a first frame without a flash. */
export function resolvedAssetRef(mod: number | null | undefined): ImageRefRecord | null {
  return mod == null ? null : assetDone.get(mod) ?? null;
}

const warnOnce = new Set<string>();
function warnAsset(mod: number, e: unknown) {
  if (!__DEV__ || warnOnce.has(String(mod))) return;
  warnOnce.add(String(mod));
  console.warn("[images] asset", mod, "didn't resolve:", String((e as Error)?.message ?? e));
}

/** useAssetFileUri(require("…png")) → its file:// URI, or null until resolved (or if it can't be). */
export function useAssetFileUri(mod: number | null | undefined): string | null {
  return useAssetImageRef(mod)?.uri ?? null;
}

/** useAssetImageRef(require("…png")) → { uri, key } for a SwiftUI image, or null until resolved. */
export function useAssetImageRef(mod: number | null | undefined): ImageRefRecord | null {
  const [ref, setRef] = useState<ImageRefRecord | null>(() => resolvedAssetRef(mod));
  useEffect(() => {
    if (mod == null) {
      setRef(null);
      return;
    }
    let live = true;
    const done = resolvedAssetRef(mod);
    if (done) {
      setRef(done);
      return;
    }
    assetImageRef(mod).then(
      (r) => live && setRef(r),
      (e) => warnAsset(mod, e),
    );
    return () => {
      live = false;
    };
  }, [mod]);
  return ref;
}

/**
 * Many bundled assets at once, keyed by the caller's ids (a face strip, keepsake icons):
 * useAssetImageRefs({ "f-02": require(…), … }) → { "f-02": { uri, key }, … }.
 * Entries appear as they resolve; the returned object keeps its identity until one does,
 * so it can go into memoised Swift props.
 */
export function useAssetImageRefs<K extends string>(mods: Readonly<Record<K, number | null | undefined>>): Partial<Record<K, ImageRefRecord>> {
  const sig = Object.entries(mods as Record<string, number | null | undefined>)
    .map(([k, m]) => k + "=" + (m ?? ""))
    .join("|");
  const [tick, setTick] = useState(0);
  const modsRef = useRef(mods);
  modsRef.current = mods;
  useEffect(() => {
    let live = true;
    for (const m of Object.values(modsRef.current as Record<string, number | null | undefined>)) {
      if (m == null || resolvedAssetRef(m)) continue;
      assetImageRef(m).then(
        () => live && setTick((n) => n + 1),
        (e) => warnAsset(m, e),
      );
    }
    return () => {
      live = false;
    };
  }, [sig]);
  return useMemo(() => {
    const out: Partial<Record<K, ImageRefRecord>> = {};
    for (const [k, m] of Object.entries(modsRef.current as Record<string, number | null | undefined>)) {
      const r = resolvedAssetRef(m);
      if (r) out[k as K] = r;
    }
    return out;
    // sig and tick stand for the asked-for modules and the resolved set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, tick]);
}

/* ── signed Supabase media ─────────────────────────────────────────────── */

/* A screen can outlive the hour a link lasts (lib/media.tsx): a lapsed link
   is signed again on coming back to the app and every ten minutes while the
   screen stays up. Same rule here, for a whole list of paths at once. */
const RECHECK_MS = 10 * 60_000;
/** at most this many signing requests in flight per hook */
const SIGN_CONCURRENCY = 6;

/** KImageStore's cache key for a stored file: "<bucket>:<path>" — never the signed URL. */
export const mediaCacheKey = (bucket: MediaBucket, path: string): string => bucket + ":" + path;

/**
 * Signed URLs for storage paths: { [path]: url }. A path appears once its link is
 * signed (a cached link is there on the first frame) and keeps its last link until a
 * new one lands, so a playing voice letter or a shown photo is never pulled. Lapsed
 * links are re-signed on app-active and every 10 minutes. The returned object keeps
 * its identity until a URL changes. Empty/duplicate paths are ignored.
 */
export function useSignedUrls(bucket: MediaBucket, paths: readonly (string | null | undefined)[]): Record<string, string> {
  const pathsSig = paths.join("\u0000");
  const list = useMemo(
    () => Array.from(new Set(paths.filter((p): p is string => !!p))),
    // the joined paths stand for the array, which callers rebuild every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathsSig],
  );
  const [urls, setUrls] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const p of list) {
      const u = cachedSignedUrl(bucket, p);
      if (u) out[p] = u;
    }
    return out;
  });

  useEffect(() => {
    let live = true;
    // keep only the paths still asked for, with any link already cached
    setUrls((cur) => {
      const next: Record<string, string> = {};
      for (const p of list) {
        const u = cur[p] ?? cachedSignedUrl(bucket, p);
        if (u) next[p] = u;
      }
      return sameRecord(cur, next) ? cur : next;
    });
    const signAll = async (onlyLapsed: boolean) => {
      const todo = list.filter((p) => !onlyLapsed || !cachedSignedUrl(bucket, p));
      let i = 0;
      const worker = async () => {
        while (live && i < todo.length) {
          const p = todo[i++];
          const u = await signedMediaUrl(bucket, p);
          if (live && u) setUrls((cur) => (cur[p] === u ? cur : { ...cur, [p]: u }));
        }
      };
      await Promise.all(Array.from({ length: Math.min(SIGN_CONCURRENCY, todo.length) }, worker));
    };
    void signAll(false);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void signAll(true);
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void signAll(true);
    }, RECHECK_MS);
    return () => {
      live = false;
      sub.remove();
      clearInterval(timer);
    };
  }, [bucket, list]);

  return urls;
}

/**
 * useSignedUrls as SwiftUI image refs: { [path]: { uri: signedUrl, key: "<bucket>:<path>" } }.
 * Pass kind 'videoPoster' for video files (KImageStore draws the first frame).
 */
export function useSignedImageRefs(bucket: MediaBucket, paths: readonly (string | null | undefined)[], kind?: ImageRefRecord["kind"]): Record<string, ImageRefRecord> {
  const urls = useSignedUrls(bucket, paths);
  return useMemo(() => {
    const out: Record<string, ImageRefRecord> = {};
    for (const [p, u] of Object.entries(urls)) out[p] = kind ? { uri: u, key: mediaCacheKey(bucket, p), kind } : { uri: u, key: mediaCacheKey(bucket, p) };
    return out;
  }, [urls, bucket, kind]);
}

/** A local or plain-URL picture (a journal photo in Documents, a dev sample https URL,
    an optimistic camera-roll file) as a ref keyed by its own URI. */
export function localImageRef(uri: string | null | undefined, kind?: ImageRefRecord["kind"]): ImageRefRecord | null {
  if (!uri) return null;
  return kind ? { uri, key: uri, kind } : { uri, key: uri };
}

function sameRecord(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}
