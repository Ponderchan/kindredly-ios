/* Wren icon, round 2 (owner, 2026-11-13, pointing at the App Store's "Popular Social Apps":
   Mastodon, Discord, Reddit): a saturated tile with a WHITE mascot on it, lit softly (white to a
   pale tint, a quiet highlight, a soft lift), and one small accent colour (Reddit's red eyes; here
   her pink beak). Not "her colours on a new tile" (round 1, rejected).
     node design/app-icon-wren/blue/make-glass.mjs   ->  blue/glass/<tile>-<pose>.png (1024, 180) */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/Users/redbeardlord/Desktop/claude 项目/kindredly/package.json");
const sharp = require("sharp");
const here = dirname(fileURLToPath(import.meta.url));
const BODY = "M40.5,110C40.5,68 72,40 110.5,40C142,40 159.5,64.5 159.5,92.5C163,127.5 142,159 100,159C65,159 40.5,141.5 40.5,110Z";

/* tiles: top → bottom; `tint` is the pale of the tile's hue her white fades to, `feather` her tail
   and wings (a step deeper, so the silhouette reads as a bird: white alone read as a snowman) */
export const TILES = {
  /* kept only to show why not: Roost (a pen-pal app) is a white bird on a deep indigo tile */
  violet: { name: "violet — too close to Roost", top: "#7A7CFF", low: "#4F3FE0", tint: "#E4E2FF", feather: "#BDB8FF", shade: "#2A1F8F" },
  /* Bluesky / Facebook / AirChat's family: a clear blue, lighter at the top */
  blue: { name: "blue", top: "#4C9DFF", low: "#0F5FF0", tint: "#DCE9FF", feather: "#AFCBFF", shade: "#0B3A9A" },
  /* Talkatone / Text Me / Novagram's family: sky at the top running into blue */
  sky: { name: "sky", top: "#55D3FF", low: "#2A7FF2", tint: "#D9EFFF", feather: "#A6D6FF", shade: "#0B4FA8" },
};
/* poses: the chosen peek (rising from the lower left, cropped), and the whole of her in the
   middle, as Discord's and Reddit's faces sit */
const POSES = {
  peek: "translate(-72 -32) scale(1.5)",
  whole: "translate(28 8) scale(0.88)",
};

/* the official Wren (wren-official/no-outline/wren.svg), every shape, in white */
const bird = (t) => `
 <path d="M47.5,92.5L5.5,68L19.5,97.8L2,124L47.5,113.5Z" fill="${t.feather}" stroke="${t.feather}" stroke-width="3" stroke-linejoin="round"/>
 <ellipse cx="49.3" cy="117" rx="14" ry="26.25" fill="${t.feather}" transform="rotate(24 49.3 117)"/>
 <path d="${BODY}" fill="url(#white)"/>
 <path d="${BODY}" fill="url(#sheen)"/>
 <ellipse cx="96.5" cy="132" rx="37" ry="25" fill="#FFF3DF"/>
 <ellipse cx="149" cy="120.5" rx="15.75" ry="29.75" fill="${t.feather}" transform="rotate(-22 149 120.5)"/>
 <circle cx="89" cy="75" r="10.4" fill="#1E1B33"/><circle cx="92.2" cy="71.6" r="3" fill="#FFFFFF"/>
 <circle cx="126" cy="69" r="11.4" fill="#1E1B33"/><circle cx="129.4" cy="65.4" r="3.3" fill="#FFFFFF"/>
 <path d="M128,85L161,94.5L128,104Z" fill="#FF8FAE" stroke="#FF8FAE" stroke-width="10" stroke-linejoin="round"/>
 <path d="M82.5,157.3L82.5,173M114,157.3L114,173" fill="none" stroke="#FF8FAE" stroke-width="5.25" stroke-linecap="round"/>
 <path d="M72,173L94.8,173M103.5,173L126.3,173" fill="none" stroke="#FF8FAE" stroke-width="5.6" stroke-linecap="round"/>`;
const silhouette = `<path d="M47.5,92.5L5.5,68L19.5,97.8L2,124L47.5,113.5Z"/><path d="${BODY}"/><ellipse cx="149" cy="120.5" rx="15.75" ry="29.75" transform="rotate(-22 149 120.5)"/>`;

const svg = (t, pose, px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${px}" height="${px}">
<defs>
 <linearGradient id="tile" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.low}"/></linearGradient>
 <linearGradient id="white" x1="0.2" y1="0.1" x2="0.55" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FCFCFF"/><stop offset="1" stop-color="${t.tint}"/></linearGradient>
 <radialGradient id="sheen" cx="0.36" cy="0.24" r="0.4"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
 <radialGradient id="glow" cx="0.22" cy="0.08" r="0.75"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.32"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
 <filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
</defs>
<rect width="200" height="200" fill="url(#tile)"/>
<rect width="200" height="200" fill="url(#glow)"/>
<g transform="${POSES[pose]}">
 <g fill="${t.shade}" opacity="0.26" transform="translate(0 6)" filter="url(#lift)">${silhouette}</g>
 ${bird(t)}
</g>
</svg>`;

const out = join(here, "glass");
mkdirSync(out, { recursive: true });
for (const [k, t] of Object.entries(TILES))
  for (const p of Object.keys(POSES)) {
    await sharp(Buffer.from(svg(t, p, 1024))).png().toFile(join(out, `${k}-${p}.png`));
    await sharp(Buffer.from(svg(t, p, 180))).png().toFile(join(out, `${k}-${p}-180.png`));
  }
console.log("wrote", out);
