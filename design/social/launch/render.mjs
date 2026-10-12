// Renders out/launch.html frame by frame (window.render(t) draws time t exactly)
// in headless Chrome over the DevTools protocol, no packages.
//   node design/social/launch/render.mjs [--frames a,b,c]
// then: python3 design/social/launch/sound.py, and the mux at the bottom of this file runs
// when every frame was rendered and out/sound.wav exists.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "out");
const FRAMES = path.join(OUT, "frames");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9335, FPS = 30, W = 1920, H = 1080;
const only = (() => { const i = process.argv.indexOf("--frames"); return i > 0 ? process.argv[i + 1].split(",").map(Number) : null; })();
fs.mkdirSync(FRAMES, { recursive: true });

const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--hide-scrollbars", "--allow-file-access-from-files",
  "--force-device-scale-factor=1", `--window-size=${W},${H}`, `--user-data-dir=${path.join(OUT, ".chrome")}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.length) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) waiters.filter((w) => w.m === d.method).forEach((w) => w.r(d)); };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (d) => (d.error ? rej(new Error(method + ": " + d.error.message)) : res(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const once = (m) => new Promise((r) => waiters.push({ m, r }));
const evaluate = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800)); return r.result.value; };

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const loaded = once("Page.loadEventFired");
await send("Page.navigate", { url: "file://" + path.join(OUT, "launch.html") });
await loaded;
const total = await evaluate("window.ready");
const N = Math.round(total * FPS);
const list = only || Array.from({ length: N }, (_, f) => f);
console.log(`${total}s, ${N} frames; rendering ${list.length}`);
for (const f of list) {
  await evaluate(`window.render(${(f / FPS).toFixed(5)})`);
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 94, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  fs.writeFileSync(path.join(FRAMES, String(f).padStart(5, "0") + ".jpg"), Buffer.from(shot.data, "base64"));
}
ws.close(); chrome.kill();
const wav = path.join(OUT, "sound.wav");
if (!only && fs.existsSync(wav)) {
  const mp4 = path.join(OUT, "kindredly-launch.mp4");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(FPS), "-i", path.join(FRAMES, "%05d.jpg"), "-i", wav,
    "-vf", "format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "17", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", mp4], { stdio: "inherit" });
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", mp4, "-frames:v", "1", path.join(OUT, "poster.png")]);
  console.log("wrote", mp4);
}
