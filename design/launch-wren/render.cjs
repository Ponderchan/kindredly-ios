/* Writes the launch to video and a still, from launch-frame.js:
     node design/launch-wren/render.cjs <outdir>
   → <outdir>/launch-full.mp4, launch-short.mp4 (60 fps, 786 × 1704, the play and a rest),
     <outdir>/last.png (the last frame). */
const { createRequire } = require("node:module");
const { mkdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { execFileSync } = require("node:child_process");
const sharp = createRequire("/Users/redbeardlord/Desktop/claude 项目/kindredly/package.json")("sharp");
const { frame, PAPERS } = require("./launch-frame.js");

const out = process.argv[2];
if (!out) throw new Error("usage: node render.cjs <outdir>");
mkdirSync(out, { recursive: true });
const FPS = 60, PX = 2;
const png = (svg) => sharp(Buffer.from(svg), { density: 72 * PX }).png().toBuffer();

(async () => {
  for (const [name, from] of [["full", 0], ["short", 0.56]]) {
    const paper = PAPERS.white;
    const dir = join(out, "f-" + name);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir);
    const n = Math.round((2.8 - from) * FPS);
    for (let i = 0; i < n; i++) {
      const t = Math.min(from + i / FPS, 1.85);
      await sharp(await png(frame(t, paper, from))).toFile(join(dir, `f_${String(i).padStart(4, "0")}.png`));
    }
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(dir, "f_%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", join(out, `launch-${name}.mp4`)]);
    rmSync(dir, { recursive: true, force: true });
  }
  await sharp(await png(frame(1.85, PAPERS.white))).toFile(join(out, "last.png"));
  console.log("wrote", out);
})();
