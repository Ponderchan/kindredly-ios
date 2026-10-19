/* PEN v1 behaviour lock (lib/pen-signature). Not wired to a runner; run by hand from the repo root
   with plain node (types are stripped by Node itself):
     node src/lib/pen-signature.test.ts
   Three halves:
   1. THE SHARED VECTORS. design/identity/pen-signature.v1.vectors.json (written once by
      scripts/gen-pen-vectors.mjs): validation verdicts, normalised and simplified drawings, paths,
      viewBoxes, draw plans, the demo drawings, face ids and the upright rule. The web's
      scripts/pen-signature.test.mjs checks app/engine/pen-signature.js against the same file. Its
      sha256 is locked here and there, so regenerating it is a deliberate act (PEN v2), never a fix.
   2. THE RULES over thousands of made-up drawings: whatever a finger does, penFromPad answers valid
      PEN v1 or null; simplifying never adds a point; the caps hold; the draw plan stays in order.
   3. THE SERVER'S COPY. Web migration 0035 (read by its absolute path) must hold the same caps,
      the same box and the same face pattern; every library face id in the app passes the pattern. */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const P = await import("./pen-signature.ts");
type PenSig = import("./pen-signature.ts").PenSig;
type PadPoint = import("./pen-signature.ts").PadPoint;

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const toPad = (flat: number[]): PadPoint[] => {
  const pts: PadPoint[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) pts.push({ x: flat[i], y: flat[i + 1] });
  return pts;
};

/* ── 1. the shared vectors ── */
const VECTORS_SHA256 = "97047c8e3d7dd6aeabff153fd2c13dc6afbb572ce9f90b186cc0de5a5b15b4c8";
const vtext = readFileSync(new URL("../../design/identity/pen-signature.v1.vectors.json", import.meta.url), "utf8");
ok("vectors file: sha256 locked (a regenerated file is PEN v2, not a fix)", createHash("sha256").update(vtext).digest("hex") === VECTORS_SHA256);
const V = JSON.parse(vtext);

ok(
  "caps: the box, the strokes, the points, the bytes, the baseline, the tolerances",
  same(V.caps, { w: P.PEN_W, h: P.PEN_H, strokes: P.PEN_MAX_STROKES, points: P.PEN_MAX_POINTS, bytes: P.PEN_MAX_BYTES, baseline: P.PEN_BASELINE, tolerances: P.PEN_TOLERANCES }),
);
{
  const bad = V.validate.filter((c: any) => !same(P.validatePen(c.value), c.verdict));
  ok(`validate: ${V.validate.length} verdicts reproduced`, bad.length === 0, bad.map((c: any) => c.name).join(", "));
  ok("validate: the vectors cover ok and every problem the server can name but bytes", ["ok", "shape", "keys", "version", "strokes", "stroke", "points", "coord"].every((p) => V.validate.some((c: any) => (c.verdict.ok ? "ok" : c.verdict.problem) === p)));
}
{
  const bad = V.normalise.filter((c: any) => !same(P.normalisePen(c.strokes, c.pad), c.out));
  ok(`normalise: ${V.normalise.length} pads reproduced`, bad.length === 0, bad.map((c: any) => c.name).join(", "));
}
{
  const bad = V.simplify.filter((c: any) => !same(P.penFromPad(c.strokes.map(toPad), c.pad), c.out));
  ok(`simplify: ${V.simplify.length} oversized drawings reproduced`, bad.length === 0, bad.map((c: any) => c.name).join(", "));
  const bad2 = V.simplifyDirect.filter((c: any) => !same(P.simplifyPen(c.in), c.out));
  ok("simplify: box units rounded and clamped", bad2.length === 0);
  const jitter = V.simplify.find((c: any) => /jittery/.test(c.name));
  ok("simplify: the jittery case really needed more than tolerance 1", !!jitter && jitter.strokes[0].length / 2 > P.PEN_MAX_POINTS && P.penPointCount(jitter.out) <= P.PEN_MAX_POINTS);
  const forty = V.simplify.find((c: any) => /40 strokes/.test(c.name));
  ok("simplify: 40 strokes become 32", !!forty && forty.out.s.length === P.PEN_MAX_STROKES);
}
{
  const bad = V.paths.filter((c: any) => P.penPath(c.sig) !== c.d);
  ok(`paths: ${V.paths.length} reproduced`, bad.length === 0, bad.map((c: any) => c.name).join(", "));
  const bad2 = V.viewBox.filter((c: any) => !same(P.penViewBox(c.sig, c.fit, c.opts), c.out));
  ok(`viewBox: ${V.viewBox.length} reproduced`, bad2.length === 0, bad2.map((c: any) => c.name).join(", "));
  const bad3 = V.plan.filter((c: any) => !same(P.penDrawPlan(c.sig, c.totalMs, c.opts), c.steps));
  ok(`plan: ${V.plan.length} reproduced`, bad3.length === 0, bad3.map((c: any) => c.name).join(", "));
  const bad4 = V.demo.filter((c: any) => !same(P.penDemo(c.seed), c.sig));
  ok(`demo: ${V.demo.length} drawings reproduced`, bad4.length === 0, bad4.map((c: any) => c.seed).join(", "));
  const bad5 = V.faces.filter((c: any) => P.penFaceOrNull(c.id) !== c.out);
  ok(`faces: ${V.faces.length} ids reproduced`, bad5.length === 0, bad5.map((c: any) => String(c.id)).join(", "));
  const bad6 = V.upright.filter((c: any) => P.penTypedUpright(c.name) !== c.upright);
  ok(`upright: ${V.upright.length} names reproduced`, bad6.length === 0);
}

/* ── 2. the rules ── */
/* deterministic noise (xorshift32), so a failure reproduces */
let seed = 0x9e3779b9;
const rnd = () => {
  seed ^= seed << 13;
  seed >>>= 0;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 0x100000000;
};
{
  let invalid = 0;
  let grew = 0;
  let nulls = 0;
  for (let k = 0; k < 2000; k++) {
    const pad = { width: 200 + rnd() * 300, height: 60 + rnd() * 140 };
    const nStrokes = 1 + Math.floor(rnd() * 45);
    const strokes: PadPoint[][] = [];
    for (let s = 0; s < nStrokes; s++) {
      const n = Math.floor(rnd() * (k % 10 === 0 ? 600 : 60));
      let x = rnd() * pad.width;
      let y = rnd() * pad.height;
      const st: PadPoint[] = [];
      for (let i = 0; i < n; i++) {
        // fingers wander outside the pad and the odd point is garbage
        x += (rnd() - 0.5) * 12;
        y += (rnd() - 0.5) * 8;
        st.push(rnd() < 0.002 ? { x: NaN, y } : { x, y });
      }
      strokes.push(st);
    }
    const norm = P.normalisePen(strokes, pad);
    const out = P.penFromPad(strokes, pad);
    if (out === null) nulls++;
    else if (!P.validatePen(out).ok) invalid++;
    if (norm && out && P.penPointCount(out) > P.penPointCount(norm)) grew++;
  }
  ok("random drawings: penFromPad is always valid PEN v1 or null", invalid === 0, `${invalid} invalid`);
  ok("random drawings: simplifying never adds a point", grew === 0, `${grew} grew`);
  ok("random drawings: some are empty (null), most are not", nulls > 0 && nulls < 1000, `${nulls} null`);
}
{
  const d = P.penDemo("Mira");
  ok("demo: valid, three strokes, sits on the baseline", P.isPenSig(d) && d.s.length === 3 && P.penInkBox(d)!.y + P.penInkBox(d)!.h > P.PEN_BASELINE * P.PEN_H);
  let allValid = true;
  for (let i = 0; i < 300; i++) if (!P.isPenSig(P.penDemo("seed-" + i))) allValid = false;
  ok("demo: 300 seeds, all valid", allValid);
  const plan = P.penDrawPlan(d, 1400)!;
  const last = plan[plan.length - 1];
  ok("plan: strokes in order, never overlapping, ending near the total", plan.every((s, i) => i === 0 || s.delay >= plan[i - 1].delay + plan[i - 1].duration) && Math.abs(last.delay + last.duration - 1400) <= plan.length);
  ok("plan: a dot gets the floor", plan[2].duration === 80);
  ok("plan: null for anything that isn't PEN v1", P.penDrawPlan({ v: 1 }, 1000) === null && P.penOrNull([]) === null);
}
{
  const box = P.normalisePen([[{ x: 0, y: 0 }, { x: 100, y: 32 }]], { width: 100, height: 32 })!;
  ok("normalise: a pad at the box's aspect maps corner to corner", same(box.s, [[0, 0, 1000, 320]]));
  const dot = P.penFromPad([[{ x: 50, y: 16 }, { x: 50.01, y: 16.01 }]], { width: 100, height: 32 })!;
  ok("a tap is a dot: one point", same(dot.s, [[500, 160]]) && P.penPath(dot).endsWith("l0.1 0"));
  ok("typed: upright for CJK, italic otherwise", P.penTypedUpright("ミラ") && P.penTypedUpright("민지") && P.penTypedUpright("陈") && !P.penTypedUpright("Zoë"));
  // the biggest drawing the caps allow is still under the byte cap: bytes is a backstop for the server
  const biggest: PenSig = { v: 1, w: 1000, h: 320, s: Array.from({ length: 32 }, (_, i) => Array.from({ length: i < 16 ? 76 : 74 }, (_, j) => (j % 2 ? 320 : 1000))) };
  ok("caps: 1200 points of the widest numbers stay under 12288 bytes", P.penPointCount(biggest) === 1200 && P.penBytes(biggest) <= P.PEN_MAX_BYTES && P.isPenSig(biggest));
}

/* ── 3. the server's copy ── */
const SQL = "/Users/redbeardlord/Desktop/claude 项目/kindredly/supabase/migrations/0035_sign_thread.sql";
if (!existsSync(SQL)) {
  console.log("skip the server's copy: " + SQL + " isn't on this machine");
} else {
  const sql = readFileSync(SQL, "utf8");
  ok("0035: the box (v 1, w 1000, h 320)", sql.includes("p->'v' is distinct from '1'::jsonb") && sql.includes("'1000'::jsonb") && sql.includes("'320'::jsonb"));
  ok("0035: at most 32 strokes", sql.includes("jsonb_array_length(p->'s') > 32"));
  ok("0035: at most 1200 points", sql.includes("points > 1200"));
  ok("0035: at most 12288 bytes", sql.includes("> 12288"));
  ok("0035: x ≤ 1000, y ≤ 320, integers", sql.includes("case when i % 2 = 0 then 1000 else 320 end") && sql.includes("v <> trunc(v)"));
  ok("0035: the same face pattern and length", sql.includes("'^[fm]-[a-z0-9]+(-[a-z0-9]+)*$'") && P.PEN_FACE.source === "^[fm]-[a-z0-9]+(-[a-z0-9]+)*$" && sql.includes("char_length(p) <= 48"));
  ok("0035: names 1–24", sql.includes("char_length(nm) > 24"));
}
{
  const ids = new Set<string>();
  for (const f of ["../data/aura-avatar-lib.ts", "../data/avatar-lib.ts"]) {
    const text = readFileSync(new URL(f, import.meta.url), "utf8");
    for (const m of text.matchAll(/\bid: "([^"]+)"/g)) ids.add(m[1]);
  }
  const refused = [...ids].filter((id) => P.penFaceOrNull(id) !== id);
  ok(`every library face (${ids.size}) passes the pattern sign_thread holds them to`, ids.size > 50 && refused.length === 0, refused.join(", "));
}

{
  // the dev pages' demo kindred carries penDemo's drawings as literals (data/demo keeps type-only imports)
  const D = await import("../data/demo.ts");
  ok("demo kindred: the literals are still penDemo('Mira') and penDemo('Rowan')", same(D.DEMO_PEN_MIRA, P.penDemo("Mira")) && same(D.DEMO_PEN_ME, P.penDemo("Rowan")));
  const mira = D.demoDetail("demo-mira");
  ok("demo kindred: demo-mira carries both drawings, valid", !!mira && P.isPenSig(mira.otherSig) && P.isPenSig(mira.mySig) && mira.mySignedName === "Rowan");
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
if (fails) process.exit(1);
