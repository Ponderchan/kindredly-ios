// Renders out/film/film.html frame by frame on the page's own clock (headless
// Chrome over the DevTools protocol, no packages), writes the hit list for the
// sound (events.json), then muxes frames + soundtrack into the App Preview:
// 886×1920, 30 fps, H.264 High yuv420p (BT.709, tv range), AAC stereo.
//   node design/store/landing/film/render-film.mjs [--frames a,b,c]
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "out", "film");
const FRAMES = path.join(OUT, "frames");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9334, FPS = 30;
const only = (() => { const i = process.argv.indexOf("--frames"); return i > 0 ? process.argv[i + 1].split(",").map(Number) : null; })();
fs.mkdirSync(FRAMES, { recursive: true });

const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--hide-scrollbars", "--allow-file-access-from-files",
  "--force-device-scale-factor=1", "--window-size=1320,2860", `--user-data-dir=${path.join(OUT, ".chrome")}`, "about:blank"], { stdio: "ignore" });
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
await send("Emulation.setDeviceMetricsOverride", { width: 1320, height: 2860, deviceScaleFactor: 1, mobile: false });
const loaded = once("Page.loadEventFired");
await send("Page.navigate", { url: "file://" + path.join(OUT, "film.html") });
await loaded;
const total = (await evaluate("window.__ready")) / 1000;
const N = Math.round(total * FPS);
const list = only || Array.from({ length: N }, (_, f) => f);
console.log(`film ${total}s, ${N} frames; rendering ${list.length}`);
let at = 0; const t0 = Date.now();
for (const f of list) {
  const target = (f * 1000) / FPS;
  if (target > at) { await evaluate(`window.__advance(${(target - at).toFixed(4)})`); at = target; }
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 94, clip: { x: 0, y: 0, width: 1320, height: 2860, scale: 1 } });
  fs.writeFileSync(path.join(FRAMES, String(f).padStart(5, "0") + ".jpg"), Buffer.from(shot.data, "base64"));
  if (f % 90 === 0) console.log(`frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
if (!only) {
  await evaluate(`window.__advance(${(total * 1000 - at + 1).toFixed(3)})`);
  fs.writeFileSync(path.join(OUT, "events.json"), JSON.stringify(await evaluate("window.__events"), null, 0));
}
ws.close(); chrome.kill();
if (!only) console.log("frames done; events.json written");
