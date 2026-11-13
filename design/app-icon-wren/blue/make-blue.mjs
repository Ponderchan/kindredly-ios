/* Blue tiles for the Wren "peek" icon (owner, 2026-11-13, after the COO: the top US social apps sit
   on blue or light blue, so no yellow). The same drawing as make-icons.mjs, only the tile changes.
     node design/app-icon-wren/blue/make-blue.mjs
   Writes design/app-icon-wren/blue/out/<name>.png (1024, full bleed) and <name>-180.png, plus
   contrast.json (WCAG contrast of her body against the tile, centre and corner). Nothing else. */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/Users/redbeardlord/Desktop/claude 项目/kindredly/package.json");
const sharp = require("sharp");
const here = dirname(fileURLToPath(import.meta.url));
const BODY = "M40.5,110C40.5,68 72,40 110.5,40C142,40 159.5,64.5 159.5,92.5C163,127.5 142,159 100,159C65,159 40.5,141.5 40.5,110Z";
const POSE = "translate(-72 -32) scale(1.5)";
const BIRD = { body: "#5757EC", belly: "#F6E7C9", beak: "#F2A0B5", eye: "#1E1B33", glint: "#FFFFFF" };

/* each tile: a flat colour, or a top → bottom gradient */
export const TILES = {
  yellow: { name: "now · yellow", stops: ["#FFD453"] },
  mist: { name: "A · mist", stops: ["#DCEEFF"] },
  sky: { name: "B · her day sky", stops: ["#BFE3F8", "#E3F3FB"] },
  clear: { name: "C · clear blue", stops: ["#A9D6FF"] },
  /* what "a blue like the big ones" means (Facebook's #1877F2): her own body is almost the same
     brightness, so she melts into it; shown to say why, then with her body lightened */
  royal: { name: "D · big-app blue", stops: ["#1877F2"] },
  royalLight: { name: "D2 · same, paler Wren", stops: ["#1877F2"], bird: { body: "#C4C4FF" } },
  night: { name: "E · night blue", stops: ["#1A2250"] },
};

const tile = (stops) =>
  stops.length === 1
    ? `<rect width="200" height="200" fill="${stops[0]}"/>`
    : `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset="1" stop-color="${stops[1]}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/>`;
const art = (stops, b = BIRD) => `${tile(stops)}
<g transform="${POSE}">
 <path d="${BODY}" fill="${b.body}"/>
 <ellipse cx="96.5" cy="132" rx="37" ry="25" fill="${b.belly}"/>
 <circle cx="89" cy="75" r="10.4" fill="${b.eye}"/><circle cx="92.2" cy="71.6" r="3" fill="${b.glint}"/>
 <circle cx="126" cy="69" r="11.4" fill="${b.eye}"/><circle cx="129.4" cy="65.4" r="3.3" fill="${b.glint}"/>
 <path d="M128,85L161,94.5L128,104Z" fill="${b.beak}" stroke="${b.beak}" stroke-width="10" stroke-linejoin="round"/>
</g>`;
const svg = (t, px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${px}" height="${px}">${art(t.stops, { ...BIRD, ...(t.bird ?? {}) })}</svg>`;

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};

const out = join(here, "out");
mkdirSync(out, { recursive: true });
const report = {};
for (const [k, t] of Object.entries(TILES)) {
  await sharp(Buffer.from(svg(t, 1024))).flatten({ background: t.stops[0] }).png().toFile(join(out, `${k}.png`));
  await sharp(Buffer.from(svg(t, 180))).flatten({ background: t.stops[0] }).png().toFile(join(out, `${k}-180.png`));
  report[k] = { name: t.name, stops: t.stops, bodyVsTile: t.stops.map((s) => contrast(t.bird?.body ?? BIRD.body, s)) };
}
writeFileSync(join(out, "contrast.json"), JSON.stringify(report, null, 1));
console.log(report);
