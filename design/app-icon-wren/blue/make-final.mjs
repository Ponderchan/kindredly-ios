/* THE APP ICON, FINAL (owner, 2026-11-13: "那就1了" — of every option that day, cobalt with a white
   Wren, her wing and a butter-yellow belly). One drawing, every file:
     node design/app-icon-wren/blue/make-final.mjs
   writes design/app-icon-wren/blue/final/ios/{icon,icon-dark,icon-tinted}.png (1024, full bleed,
   opaque, the format of assets/icon*.png), final/web/ (the home-screen and app-style icons, with
   the tile) and final/brand/ (rounded, for listings). The web's header mark and browser-tab icon
   are a different drawing on purpose (whole Wren, no tile) and are not made here.
   Light: cobalt, lighter at the top, her white shaded in the tile's hue, the wing a tint of it,
   the belly butter, the beak a soft coral wedge. Dark (iOS dark icons): the same Wren on a night
   navy. Tinted (iOS tints by brightness, on black): body light grey, belly and beak white, wing
   mid grey, so every part still separates in one colour. */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/Users/redbeardlord/Desktop/claude 项目/kindredly/package.json");
const sharp = require("sharp");
const here = dirname(fileURLToPath(import.meta.url));
const BODY = "M40.5,110C40.5,68 72,40 110.5,40C142,40 159.5,64.5 159.5,92.5C163,127.5 142,159 100,159C65,159 40.5,141.5 40.5,110Z";
const POSE = "translate(-64 -18) scale(1.45)";
const BEAK = "M127,83.5C139,84.5 150,88.5 158.5,93C160.6,94.1 160.6,96.4 158.5,97.5C150,102 139,105.5 127,106.5C123.5,99 123.5,91 127,83.5Z";

export const PALETTES = {
  light: { top: "#3866FF", low: "#2650EE", white: "#FFFFFF", shade: "#E7ECFF", wing: "#B8C6FF", belly: "#FFE08A", beakTop: "#FF96A8", beakLow: "#F26A86", eye: "#141A3D", glint: "#FFFFFF", lift: "#1A36B8", liftA: 0.18 },
  dark: { top: "#1B2140", low: "#10142A", white: "#FFFFFF", shade: "#DCE2FF", wing: "#8A9DF5", belly: "#FFD976", beakTop: "#FF96A8", beakLow: "#F26A86", eye: "#141A3D", glint: "#FFFFFF", lift: "#000000", liftA: 0.35 },
  tinted: { top: "#000000", low: "#000000", white: "#C9C9C9", shade: "#B4B4B4", wing: "#707070", belly: "#FFFFFF", beakTop: "#F2F2F2", beakLow: "#E6E6E6", eye: "#000000", glint: "#FFFFFF", lift: "#000000", liftA: 0 },
};

export const art = (p, id = "a") => `<defs>
 <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.low}"/></linearGradient>
 <linearGradient id="${id}w" x1="0.25" y1="0.05" x2="0.6" y2="1"><stop offset="0" stop-color="${p.white}"/><stop offset="0.62" stop-color="${p.white}"/><stop offset="1" stop-color="${p.shade}"/></linearGradient>
 <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.beakTop}"/><stop offset="1" stop-color="${p.beakLow}"/></linearGradient>
 <filter id="${id}l" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter>
</defs>
<rect width="200" height="200" fill="url(#${id}t)"/>
<g transform="${POSE}">
 ${p.liftA ? `<path d="${BODY}" fill="${p.lift}" opacity="${p.liftA}" transform="translate(1.5 4)" filter="url(#${id}l)"/>` : ""}
 <path d="${BODY}" fill="url(#${id}w)"/>
 <ellipse cx="96.5" cy="133" rx="36" ry="24" fill="${p.belly}"/>
 <ellipse cx="149" cy="121" rx="15" ry="28.5" fill="${p.wing}" transform="rotate(-22 149 121)"/>
 <circle cx="90" cy="76" r="9.6" fill="${p.eye}"/><circle cx="92.6" cy="73.2" r="2.5" fill="${p.glint}"/>
 <circle cx="125.5" cy="70" r="10.4" fill="${p.eye}"/><circle cx="128.3" cy="67" r="2.7" fill="${p.glint}"/>
 <path d="${BEAK}" fill="url(#${id}b)"/>
</g>`;
const svg = (p, px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${px}" height="${px}">${art(p)}</svg>`;

const out = (...p) => { const f = join(here, "final", ...p); mkdirSync(dirname(f), { recursive: true }); return f; };
const png = (p, px, file) => sharp(Buffer.from(svg(p, px))).flatten({ background: p.low }).png().toFile(out(...file));

await png(PALETTES.light, 1024, ["ios", "icon.png"]);
await png(PALETTES.dark, 1024, ["ios", "icon-dark.png"]);
await png(PALETTES.tinted, 1024, ["ios", "icon-tinted.png"]);
for (const [f, px] of [["icon-512.png", 512], ["icon-192.png", 192], ["apple-touch-icon.png", 180], ["maskable-512.png", 512]]) await png(PALETTES.light, px, ["web", f]);
const rounded = (px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${px}" height="${px}"><defs><clipPath id="r"><rect width="200" height="200" rx="45"/></clipPath></defs><g clip-path="url(#r)">${art(PALETTES.light, "r")}</g></svg>`;
for (const px of [1024, 512, 240]) await sharp(Buffer.from(rounded(px))).png().toFile(out("brand", `app-icon-rounded-${px}.png`));
console.log("wrote", join(here, "final"));
