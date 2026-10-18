/* EVERY PERSON'S FACE, AS SOMETHING SWIFT CAN DRAW.
   ────────────────────────────────────────────────────────────────────────
   React Native draws a face five ways (AvatarImage + MosaicId): a photo, a
   portrait PNG, one of the thirty hand-drawn SVG faces, the glyph
   fallback, or a pen pal's mosaic. Swift's KFace takes four sources, and
   this file turns a person into one of them:

     image        a photo; a portrait (expo-asset file, the six legacy
                  portraits drawn 5% larger so their ink rim falls outside
                  the clip); a legacy SVG face or the glyph, captured to a
                  tmp PNG by components/FaceSnapshots
     mosaic       a pen pal: the FACE v1 25-bit mask (lib/mosaic)
     frost        a pen pal once the identity switch is on: their frosted
                  window (lib/frost FROST v1; the spec rides in `frost`,
                  worked out here in TS, so Swift never hashes)
     veil         no one — a deleted account
     placeholder  a picture still on its way: draw the soft2 disc so the
                  row never changes height

   ROUND = KINDRED, SQUARE MOSAIC = PEN PAL (owner, 2026-10-15). A kindred
   who gave no face is drawn round with the glyph, as the Kindreds row
   always did — never as a mosaic. A deleted kindred keeps their portrait
   if their face survived on the thread (otherFace), and otherwise wears
   the veil: the one neutral face, the same for every ghost, because it
   claims nothing. Strangers never see a portrait or a photo: a pen pal is
   always a mosaic — or, with the identity switch on, a frosted window,
   which never develops (the caller passes the spec in FaceInput.frost,
   from lib/stranger-who; switch off, nothing here changes).

   The legacy SVG faces and glyphs have fixed colours, so a theme change
   needs no recapture; a purged tmp file does, and gets one. */

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { getFace } from "../data/aura-avatar-lib";
import { getAvatar } from "../data/avatar-lib";
import { assetImageRef, fileExists, resolvedAssetRef, snapshotCacheKey } from "./images";
import { developFor, mosaicMask } from "./mosaic";
import type { FrostSpec } from "./frost";

/** Whose face: a kindred (names traded; drawn round) or a pen pal (a mosaic; drawn square). */
export type FaceRole = "kindred" | "penpal";

/** A person, as the screens know them. */
export type FaceInput = {
  role: FaceRole;
  /** their user id; null once the account is deleted. The mosaic and glyph seed */
  seed: string | null | undefined;
  /** a portrait id (aura-avatar-lib) or a legacy SVG face id (avatar-lib); a kindred's otherFace */
  avatarId?: string | null;
  /** a photo file — only ever the user's own avatar; a photo never leaves its phone */
  photoUri?: string | null;
  /** pen pals: how far the face has come into view, 0..1 (lib/mosaic developFor). Default 1 */
  develop?: number;
  /** pen pals with the identity switch on: their frosted window (lib/stranger-who WhoBook.frost), drawn instead of the mosaic */
  frost?: FrostSpec | null;
  /** the account is closed (0009) */
  gone?: boolean;
};

/** What KFace draws. `overscan` is a fraction of the face's size added on every side (0.05 for a legacy portrait). */
export type FaceSource =
  | { kind: "image"; uri: string; key: string; overscan: number }
  | { kind: "mosaic"; mask: number }
  | { kind: "frost"; spec: FrostSpec; key: string }
  | { kind: "veil" }
  | { kind: "placeholder" };

/** A FaceSource flattened for a Swift @Field record (a record can't be a union):
    fields a kind doesn't use are "", 0 or null. KFace's adapter switches on `kind`;
    a frost's spec is `frost` (and `key` names it, "frost:<uid>[:dark]"). */
export type FaceRecord = { kind: FaceSource["kind"]; uri: string; key: string; overscan: number; mask: number; frost: FrostSpec | null };

/** Flatten a FaceSource for a Swift record. */
export function faceRecord(s: FaceSource): FaceRecord {
  switch (s.kind) {
    case "image":
      return { kind: "image", uri: s.uri, key: s.key, overscan: s.overscan, mask: 0, frost: null };
    case "mosaic":
      return { kind: "mosaic", uri: "", key: "", overscan: 0, mask: s.mask, frost: null };
    case "frost":
      return { kind: "frost", uri: "", key: s.key, overscan: 0, mask: 0, frost: s.spec };
    default:
      return { kind: s.kind, uri: "", key: "", overscan: 0, mask: 0, frost: null };
  }
}

/** A snapshot FaceSnapshots draws: a legacy SVG face by id, or the glyph for a seed. */
export type FaceSnapKey = `svg:${string}` | `glyph:${string}`;

/** How a face will be drawn, before anything is loaded (pure apart from the face tables). */
export type FacePlan =
  | { kind: "photo"; uri: string }
  | { kind: "portrait"; id: string; mod: number; overscan: number }
  | { kind: "snapshot"; snap: FaceSnapKey }
  | { kind: "mosaic"; mask: number }
  | { kind: "frost"; spec: FrostSpec; key: string }
  | { kind: "veil" };

/** The six legacy portraits carry an ink rim at the file's edge; drawn this much larger per side, it falls outside the clip (AvatarImage). */
export const LEGACY_OVERSCAN = 0.05;

/** The side, in points, that FaceSnapshots captures at (×screen scale in pixels). Large enough for a 52pt row and a 54pt strip. */
export const FACE_SNAPSHOT_PT = 80;

/* a pen pal list rebuilds every render; the mask is the only real work */
const maskMemo = new Map<string, number>();
function memoMask(seed: string, develop: number): number {
  const k = seed + "|" + develop;
  let m = maskMemo.get(k);
  if (m === undefined) {
    if (maskMemo.size > 4000) maskMemo.clear();
    m = mosaicMask(seed, develop);
    maskMemo.set(k, m);
  }
  return m;
}

/** How this person's face is drawn (see the header for the rules). */
export function facePlan(f: FaceInput): FacePlan {
  if (f.role === "penpal") {
    if (f.gone || !f.seed) return { kind: "veil" };
    if (f.frost) return { kind: "frost", spec: f.frost, key: `frost:${f.seed}${f.frost.dark ? ":dark" : ""}` };
    return { kind: "mosaic", mask: memoMask(f.seed, f.develop ?? 1) };
  }
  if (f.photoUri) return { kind: "photo", uri: f.photoUri };
  const portrait = getFace(f.avatarId);
  if (portrait) return { kind: "portrait", id: portrait.id, mod: portrait.src, overscan: portrait.legacy ? LEGACY_OVERSCAN : 0 };
  if (f.avatarId && getAvatar(f.avatarId)) return { kind: "snapshot", snap: `svg:${f.avatarId}` };
  if (f.gone || !f.seed) return { kind: "veil" };
  return { kind: "snapshot", snap: `glyph:${f.seed}` };
}

/** A thread's correspondent as a face: a kindred once names are traded (their otherFace,
    round), else a pen pal whose mosaic develops with THEIR letters — or, with the identity
    switch on, their frosted window (`frost`: WhoBook.frost(th.other); null or absent keeps
    the mosaic). Takes a ThreadSummary or anything shaped like one. */
export function threadFaceInput(
  th: { other: string | null | undefined; otherFace?: string | null; revealed: boolean; theirs: number; gone?: boolean },
  frost: FrostSpec | null = null,
): FaceInput {
  if (th.revealed) return { role: "kindred", seed: th.other, avatarId: th.otherFace ?? null, gone: !!th.gone };
  const pal: FaceInput = { role: "penpal", seed: th.other, develop: developFor(th.theirs, false), gone: !!th.gone };
  return frost ? { ...pal, frost } : pal;
}

/* ── the snapshot store (FaceSnapshots draws what is pending here) ─────── */

const snaps = new Map<FaceSnapKey, string>(); // captured tmp files
const pending = new Set<FaceSnapKey>(); // asked for, not captured yet
const failures = new Map<FaceSnapKey, number>();
const MAX_FAILURES = 3;
let version = 0;
const listeners = new Set<() => void>();
function bump() {
  version++;
  listeners.forEach((l) => l());
}

/** Subscribe to face changes (a capture or a portrait landing). */
export function subscribeFaces(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const facesVersion = (): number => version;

/** For FaceSnapshots: the snapshots waiting to be drawn and captured, oldest request first. */
export function pendingFaceSnapshots(): FaceSnapKey[] {
  return Array.from(pending);
}

/** For FaceSnapshots: a capture finished (uri) or failed (null). A failure is retried until MAX_FAILURES. */
export function settleFaceSnapshot(k: FaceSnapKey, uri: string | null): void {
  pending.delete(k);
  if (uri) {
    failures.delete(k);
    snaps.set(k, uri);
  } else {
    const n = (failures.get(k) ?? 0) + 1;
    failures.set(k, n);
    if (n < MAX_FAILURES) pending.add(k);
    else if (__DEV__) console.warn("[faces] giving up on", k);
  }
  bump();
}

function requestSnapshot(k: FaceSnapKey) {
  if (pending.has(k) || (failures.get(k) ?? 0) >= MAX_FAILURES) return;
  const have = snaps.get(k);
  if (have && fileExists(have)) return;
  /* never captured, or purged by iOS: capture it (again). A purged face
     keeps its old ref meanwhile — KImageStore likely still holds the pixels */
  pending.add(k);
  bump();
}

/** Start whatever this face still needs: resolve a portrait file, or (re)capture a snapshot. */
export function prepareFace(f: FaceInput): void {
  const p = facePlan(f);
  if (p.kind === "portrait") {
    if (resolvedAssetRef(p.mod)) return;
    assetImageRef(p.mod).then(bump, (e) => {
      if (__DEV__) console.warn("[faces] portrait", p.id, "didn't resolve:", String((e as Error)?.message ?? e));
    });
  } else if (p.kind === "snapshot") {
    requestSnapshot(p.snap);
  }
}

/** The face as it can be drawn right now — a placeholder while its picture is on its way. Starts nothing (see prepareFace / the hooks). */
export function faceSource(f: FaceInput): FaceSource {
  const p = facePlan(f);
  switch (p.kind) {
    case "photo":
      return { kind: "image", uri: p.uri, key: p.uri, overscan: 0 };
    case "portrait": {
      const r = resolvedAssetRef(p.mod);
      return r ? { kind: "image", uri: r.uri, key: r.key, overscan: p.overscan } : { kind: "placeholder" };
    }
    case "snapshot": {
      const uri = snaps.get(p.snap);
      return uri ? { kind: "image", uri, key: snapshotCacheKey(p.snap), overscan: 0 } : { kind: "placeholder" };
    }
    case "mosaic":
      return { kind: "mosaic", mask: p.mask };
    case "frost":
      return { kind: "frost", spec: p.spec, key: p.key };
    case "veil":
      return { kind: "veil" };
  }
}

const planSig = (p: FacePlan): string =>
  p.kind === "photo"
    ? "p:" + p.uri
    : p.kind === "portrait"
      ? "a:" + p.id
      : p.kind === "snapshot"
        ? "s:" + p.snap
        : p.kind === "mosaic"
          ? "m:" + p.mask
          : p.kind === "frost"
            ? "f:" + p.key
            : "v";

const sameSource = (a: FaceSource | undefined, b: FaceSource): boolean => {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === "image" && b.kind === "image") return a.uri === b.uri && a.key === b.key && a.overscan === b.overscan;
  if (a.kind === "mosaic" && b.kind === "mosaic") return a.mask === b.mask;
  // a frost is FROST v1 of one uid in one theme: the key says both
  if (a.kind === "frost" && b.kind === "frost") return a.key === b.key;
  return true;
};

/**
 * Faces for a whole list, keyed by the caller's ids (thread id, face id…):
 *   const faces = useFaceSources(Object.fromEntries(rows.map(r => [r.id, { role, seed, avatarId, develop, gone }])))
 * Pictures load and capture in the background; entries move from placeholder to image as
 * they land. The returned object, and each entry, keep their identity while unchanged, so
 * memoised Swift props aren't re-sent. Purged snapshot files are recaptured on app-active.
 */
export function useFaceSources<K extends string>(inputs: Readonly<Record<K, FaceInput>>): Record<K, FaceSource> {
  const ver = useSyncExternalStore(subscribeFaces, facesVersion, facesVersion);
  const entries = Object.entries(inputs) as [K, FaceInput][];
  const sig = entries.map(([k, f]) => k + "=" + planSig(facePlan(f))).join("|");
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  useEffect(() => {
    const prepareAll = () => {
      for (const f of Object.values(inputsRef.current) as FaceInput[]) prepareFace(f);
    };
    prepareAll();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") prepareAll();
    });
    return () => sub.remove();
  }, [sig]);

  const prev = useRef<Record<K, FaceSource> | null>(null);
  return useMemo(() => {
    const out = {} as Record<K, FaceSource>;
    let same = !!prev.current && Object.keys(prev.current).length === entries.length;
    for (const [k, f] of entries) {
      const next = faceSource(f);
      const old = prev.current?.[k];
      if (old && sameSource(old, next)) out[k] = old;
      else {
        out[k] = next;
        same = false;
      }
    }
    if (same && prev.current) return prev.current;
    prev.current = out;
    return out;
    // sig stands for the inputs' plans, ver for what has loaded since
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ver]);
}

/** One face (a header, a card). See useFaceSources. */
export function useFaceSource(input: FaceInput): FaceSource {
  const { role, seed, avatarId, photoUri, develop, gone, frost } = input;
  const inputs = useMemo(() => ({ face: { role, seed, avatarId, photoUri, develop, gone, frost } }), [role, seed, avatarId, photoUri, develop, gone, frost]);
  return useFaceSources(inputs).face;
}
