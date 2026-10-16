/* The theme generator's lock (scripts/gen-theme-swift.mjs), for the mood face ink it gained in step 5.
   Not wired to a runner; run by hand from the repo root with plain node:
     node scripts/gen-theme-swift.test.mjs

   It checks: the committed KTheme.swift is what the generator writes from themes.json (its own
   --check); every KMood carries a faceInk, the mood's ink unless themes.json "moodFace" names a
   darker one; Happy's face ink is #94681C and clears 4:1 on the Happy fill where the brand gold
   doesn't reach 3:1 (why it exists), while the gold stays the Happy ink for everything else; and a
   moodFace that names no mood, or isn't #RRGGBB, stops the generator. */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

let fails = 0;
const ok = (name, cond) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const SCRIPT = fileURLToPath(new URL("./gen-theme-swift.mjs", import.meta.url));
const JSON_SRC = new URL("../src/theme/themes.json", import.meta.url);
const SWIFT = new URL("../modules/kindredly-ui/ios/Portable/KTheme.swift", import.meta.url);

/** runs the generator; { code, out } with stdout and stderr together */
const run = (...args) => {
  try {
    return { code: 0, out: execFileSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((s) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* ── the committed file ── */

const check = run("--check");
ok("KTheme.swift is what the generator writes (node scripts/gen-theme-swift.mjs --check)", check.code === 0 && /up to date/.test(check.out));

const data = JSON.parse(readFileSync(JSON_SRC, "utf8"));
const swift = readFileSync(SWIFT, "utf8");
const line = (k) => new RegExp(`public static let ${k}\\s+= KMood\\(key: "${k}", fill: Color\\(hex: "(#[0-9A-F]{6})"\\), ink: Color\\(hex: "(#[0-9A-F]{6})"\\), faceInk: Color\\(hex: "(#[0-9A-F]{6})"\\)\\)`).exec(swift);
ok("KMood declares faceInk", /public let faceInk: Color/.test(swift));
for (const [k, [fill, ink]] of Object.entries(data.mood)) {
  const m = line(k);
  const face = (data.moodFace?.[k] ?? ink).toUpperCase();
  ok(`${k}: fill, ink and face ink as themes.json has them (face ${face})`, !!m && m[1] === fill.toUpperCase() && m[2] === ink.toUpperCase() && m[3] === face);
}
ok("moodFace names only the Happy face ink, #94681C", JSON.stringify(data.moodFace) === JSON.stringify({ happy: "#94681C" }));
ok("the Happy ink stays the brand gold #B8842A for everything but faces", data.mood.happy[1] === "#B8842A");
ok("Happy's face ink clears 4:1 on its fill; the gold doesn't reach 3:1", contrast("#94681C", data.mood.happy[0]) >= 4 && contrast("#B8842A", data.mood.happy[0]) < 3);
ok("the other three face inks (their own inks) clear 4:1 on their fills", ["calm", "tired", "low"].every((k) => contrast(data.mood[k][1], data.mood[k][0]) >= 4));

/* ── a broken moodFace stops it ── */

const dir = mkdtempSync(join(tmpdir(), "gen-theme-"));
try {
  const write = (name, patch) => {
    const p = join(dir, name);
    writeFileSync(p, JSON.stringify({ ...data, ...patch }));
    return p;
  };
  const nobody = run("--check", "--src", write("nobody.json", { moodFace: { joyful: "#94681C" } }));
  ok("a moodFace for a mood that doesn't exist is an error", nobody.code === 1 && /moodFace joyful names no mood/.test(nobody.out));
  const notHex = run("--check", "--src", write("nothex.json", { moodFace: { happy: "goldenrod" } }));
  ok("a moodFace that isn't #RRGGBB is an error", notHex.code === 1 && /moodFace happy is "goldenrod", not #RRGGBB/.test(notHex.out));
  const none = run("--check", "--src", write("none.json", { moodFace: undefined }));
  ok("no moodFace at all reads (every face ink is its ink); only the content differs", none.code === 1 && /out of date/.test(none.out));
  ok("--src without --check is refused (it would overwrite KTheme.swift)", run("--src", join(dir, "none.json")).code === 1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
