/* FROST v1 behaviour lock (lib/frost). Not wired to a runner; run by hand from the repo root
   with plain node (types are stripped by Node itself; the hook below adds ".ts" to the app's
   extensionless imports):
     node src/lib/frost.test.ts
   Three halves:
   1. THE SHARED VECTORS. design/identity/frost.v1.vectors.json (written once by
      scripts/gen-identity-vectors.mjs) holds the spec of 32 ids on both themes; the web's
      scripts/frost.test.mjs checks app/engine/frost.js against the same file. Its sha256 is
      locked here and there, so regenerating it is a deliberate act (FROST v2), never a fix.
   2. THE PALETTE RULES (§2): twelve tones per theme, all different, none a skin tone or brown,
      none baby pink or baby blue (measured in CIELAB), every pair told apart.
   3. THE SPEC'S SHAPE over 5,000 ids: the lights are two other tones in opposite corners at the
      insets and radii the bit fields allow, the silhouette is the same for everyone, and the
      small-window rule. */

import { registerHooks } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const F = await import("./frost.ts");
const { FROST_TONES, FROST_LIGHT, FROST_DARK, FROST_DETAIL_MIN_PT, frostSpec, frostLayers, frostToneIndex } = F;

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ── 1. the shared vectors ── */
const VECTORS_SHA256 = "711953fa37a9ac337cffd4d3c4a6141086f28e4f32e404c310b3bf1468be2526";
const vpath = new URL("../../design/identity/frost.v1.vectors.json", import.meta.url);
const vtext = readFileSync(vpath, "utf8");
ok("vectors file: sha256 locked (a regenerated file is FROST v2, not a fix)", createHash("sha256").update(vtext).digest("hex") === VECTORS_SHA256);
const V = JSON.parse(vtext) as { missing: unknown; cases: { uid: string; dark: boolean; spec: unknown }[] };
ok("vectors: 32 ids × light and dark", V.cases.length === 64 && new Set(V.cases.map((c) => c.uid)).size === 32);
{
  const bad = V.cases.filter((c) => !same(frostSpec(c.uid, c.dark), c.spec));
  ok("vectors: every spec reproduced exactly", bad.length === 0, bad.slice(0, 2).map((c) => `${c.uid}/${c.dark ? "dark" : "light"}`).join(", "));
}
ok("vectors: a missing id has no window (null → the veil)", V.missing === null && frostSpec(null) === null && frostSpec("") === null && frostSpec(undefined, true) === null);

/* ── 2. the palette ── */
ok("12 tones in the frozen order", FROST_TONES.length === 12 && FROST_TONES.join() === "lavender,periwinkle,seaglass,mint,sage,butter,lilac,teal,slate,ice,plum,fog");
for (const [name, pal] of [["light", FROST_LIGHT], ["dark", FROST_DARK]] as const) {
  const hexes = FROST_TONES.map((t) => pal[t]);
  ok(`${name}: a #RRGGBB hex per tone, all different`, hexes.every((h) => /^#[0-9A-F]{6}$/.test(h)) && new Set(hexes).size === 12);
  const labs = hexes.map(lab);
  let minD = Infinity;
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) minD = Math.min(minD, dist(labs[i], labs[j]));
  ok(`${name}: every two tones at least ΔE 6 apart`, minD >= 6, `min ${minD.toFixed(1)}`);
  /* skin tones and browns live at a hue angle of about 40–80° with real chroma (a* clearly
     positive); baby pink near 0–30° (and 345°+), baby blue near 225–265° with chroma ≥ 15 */
  const bad = FROST_TONES.filter((t, i) => {
    const [, a, b] = labs[i];
    const C = Math.hypot(a, b);
    const h = (Math.atan2(b, a) * 180) / Math.PI;
    const hue = (h + 360) % 360;
    const skin = C > 12 && hue >= 35 && hue <= 85;
    const babyPink = C > 10 && (hue >= 340 || hue <= 30);
    const babyBlue = C > 15 && hue >= 225 && hue <= 265;
    return skin || babyPink || babyBlue;
  });
  ok(`${name}: no skin tone, brown, baby pink or baby blue`, bad.length === 0, bad.join(", "));
}
ok("dark tones are darker than their light ones (L*)", FROST_TONES.every((t) => lab(FROST_DARK[t])[0] < lab(FROST_LIGHT[t])[0] - 25));

/* ── 3. the spec's shape ── */
{
  const ids = Array.from({ length: 5000 }, uidGen(77));
  const counts = new Array(12).fill(0);
  let shapeOk = true;
  let why = "";
  const inset = (v: number) => v >= 0.18 - 1e-9 && v <= 0.32 + 1e-9;
  const far = (v: number) => v >= 0.68 - 1e-9 && v <= 0.82 + 1e-9;
  for (const uid of ids) {
    for (const dark of [false, true]) {
      const s = frostSpec(uid, dark)!;
      const pal = dark ? FROST_DARK : FROST_LIGHT;
      const [b1, b2] = s.blobs;
      const fail = (w: string) => {
        if (shapeOk) why = `${uid}: ${w}`;
        shapeOk = false;
      };
      if (s.v !== 1 || s.dark !== dark) fail("v / dark");
      if (s.base !== pal[s.tone] || FROST_TONES[frostToneIndex(uid)] !== s.tone) fail("base tone");
      if (b1.tone === s.tone || b2.tone === s.tone || b1.tone === b2.tone) fail("lights repeat a tone");
      if (b1.color !== pal[b1.tone] || b2.color !== pal[b2.tone]) fail("light colours");
      if (b1.alpha !== 0.9 || b2.alpha !== 0.9) fail("light alpha");
      if (!(b1.r >= 0.55 && b1.r <= 0.75 && b2.r >= 0.55 && b2.r <= 0.75)) fail("radius out of 55–75%");
      // opposite corners: on each axis one light is near 0 and the other near 1
      const xs = [b1.x, b2.x].sort((p, q) => p - q);
      const ys = [b1.y, b2.y].sort((p, q) => p - q);
      if (!(inset(xs[0]) && far(xs[1]) && inset(ys[0]) && far(ys[1]))) fail("lights not in opposite corners");
      if (s.silhouette.alpha !== (dark ? 0.13 : 0.22)) fail("silhouette alpha");
      if (!same(s.silhouette.head, { x: 0.5, y: 0.4, r: 0.235, solid: 0.62 }) || !same(s.silhouette.shoulders, { x: 0.5, y: 1.04, rx: 0.52, ry: 0.36, solid: 0.55 })) fail("silhouette is not the shared one");
      if (!same(s.sheen, { alpha: 0.18, to: 0.55 }) || !same(s.hairline, { alpha: 0.35, width: 1 }) || s.corner !== 0.25 || s.edge !== 1.5) fail("finish");
      for (const v of [b1.x, b1.y, b1.r, b2.x, b2.y, b2.r]) if (Math.round(v * 10000) / 10000 !== v) fail("not rounded to 4 places");
    }
    counts[frostToneIndex(uid)]++;
  }
  ok("5,000 ids × 2 themes: every spec has the v1 shape", shapeOk, why);
  ok("the twelve base tones are dealt evenly (each 6–11% of 5,000 ids)", counts.every((n) => n >= 300 && n <= 550), counts.join(","));
  ok("the same id on both themes: same tones and positions, only the hexes and the silhouette step differ", ids.slice(0, 200).every((u) => {
    const l = frostSpec(u)!;
    const d = frostSpec(u, true)!;
    return l.tone === d.tone && l.blobs.every((b, i) => b.tone === d.blobs[i].tone && b.x === d.blobs[i].x && b.y === d.blobs[i].y && b.r === d.blobs[i].r);
  }));
  ok("deterministic: the same id gives the same spec", ids.slice(0, 200).every((u) => same(frostSpec(u, true), frostSpec(u, true))));
  ok("the spec doesn't share objects between calls (a renderer may not mutate another's)", frostSpec(ids[0])!.silhouette.head !== frostSpec(ids[1])!.silhouette.head);
}
ok("small windows: base + blobs + hairline only below 20pt", FROST_DETAIL_MIN_PT === 20 && same(frostLayers(12), { silhouette: false, sheen: false }) && same(frostLayers(19.5), { silhouette: false, sheen: false }) && same(frostLayers(20), { silhouette: true, sheen: true }) && same(frostLayers(40), { silhouette: true, sheen: true }));
ok("default theme is light", same(frostSpec("x"), frostSpec("x", false)));

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);

/* ── helpers ── */
function lab(hex: string): [number, number, number] {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = c;
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function dist(p: number[], q: number[]): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
function uidGen(seed: number) {
  let x = seed >>> 0 || 1;
  const next = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  };
  const hex = (n: number) => next().toString(16).padStart(8, "0").slice(0, n);
  return () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(8)}${hex(4)}`;
}
