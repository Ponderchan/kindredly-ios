/* Blue peek, refined (COO, 2026-11-13: "blue peek 不错但是不是很精致 颜色有点山寨"). What read as
   cheap in round 2: the default saturated blue with a strong light-to-dark run and a white glow,
   four unrelated colours on her (white, cream, pale blue, candy pink), a muddy shadow. Here: one
   hue family for everything, a barely-there gradient, one light from the top left, her white
   shaded in the tile's own hue, the beak the only warm thing.
     node design/app-icon-wren/blue/make-refined.mjs  ->  blue/refined/<tile>-<bird>.png (1024, 180) */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/Users/redbeardlord/Desktop/claude 项目/kindredly/package.json");
const sharp = require("sharp");
const here = dirname(fileURLToPath(import.meta.url));
const BODY = "M40.5,110C40.5,68 72,40 110.5,40C142,40 159.5,64.5 159.5,92.5C163,127.5 142,159 100,159C65,159 40.5,141.5 40.5,110Z";
const POSE = "translate(-64 -18) scale(1.45)"; // her body runs off the foot cleanly (no sliver of tile under her)

/* tiles: a narrow run, top → bottom (about 6–8% lightness), and the shades her white takes from it */
export const TILES = {
  azure: { top: "#2F8CFF", low: "#1971F5", shade: "#E6F0FF", wing: "#B9D3FF", deep: "#0E4FC4" },
  cobalt: { top: "#3866FF", low: "#2650EE", shade: "#E7ECFF", wing: "#B8C6FF", deep: "#1A36B8" },
  cerulean: { top: "#3AA6F0", low: "#2689DB", shade: "#E5F3FD", wing: "#B3DBF7", deep: "#125E9E" },
  ocean: { top: "#2563EB", low: "#1D4FCF", shade: "#E5ECFE", wing: "#B4C8FA", deep: "#13328F" },
};
/* her: the belly either a whisper of the tile (one family) or the faintest warm white; the beak
   a coral that sits with blue rather than candy pink */
export const BIRDS = {
  cool: { belly: "tile", beak: "#FF8197", eye: "#141A3D" },
  warm: { belly: "#FFF6EA", beak: "#FF8197", eye: "#141A3D" },
  /* the finished one: a shaped beak (a soft wedge with a rounded tip, lit from above) instead of a
     hard triangle, which read as a carrot; with her belly, or without it (white needs no belly) */
  fine: { belly: "tile", beak: "#FF8197", eye: "#141A3D", shaped: true },
  clean: { belly: null, beak: "#FF8197", eye: "#141A3D", shaped: true },
  /* the owner, of the wing hanging under the beak in the crop: "嘴下面的那个是什么" — without it,
     or folded against her side where it reads as a wing */
  nowing: { belly: null, beak: "#FF8197", eye: "#141A3D", shaped: true, wing: "none" },
  tucked: { belly: null, beak: "#FF8197", eye: "#141A3D", shaped: true, wing: "tucked" },
};

const svg = (t, b, px) => {
  const belly = b.belly === "tile" ? t.shade : b.belly; // null: none
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${px}" height="${px}">
<defs>
 <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.low}"/></linearGradient>
 <linearGradient id="white" x1="0.25" y1="0.05" x2="0.6" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.62" stop-color="#FFFFFF"/><stop offset="1" stop-color="${t.shade}"/></linearGradient>
 <linearGradient id="wing" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${t.wing}"/><stop offset="1" stop-color="${t.wing}"/></linearGradient>
 <linearGradient id="beak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF96A8"/><stop offset="1" stop-color="#F26A86"/></linearGradient>
 <filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter>
</defs>
<rect width="200" height="200" fill="url(#tile)"/>
<g transform="${POSE}">
 <path d="${BODY}" fill="${t.deep}" opacity="0.18" transform="translate(1.5 4)" filter="url(#lift)"/>
 <path d="${BODY}" fill="url(#white)"/>
${belly ? ` <ellipse cx="96.5" cy="133" rx="36" ry="24" fill="${belly}"/>` : ""}
${b.wing === "none" ? "" : b.wing === "tucked"
  ? ` <path d="M152,104C160,118 157,138 141,149C131,155 121,152 120,145C128,139 138,128 152,104Z" fill="url(#wing)"/>`
  : ` <ellipse cx="149" cy="121" rx="15" ry="28.5" fill="url(#wing)" transform="rotate(-22 149 121)"/>`}
 <circle cx="90" cy="76" r="9.6" fill="${b.eye}"/><circle cx="92.6" cy="73.2" r="2.5" fill="#FFFFFF"/>
 <circle cx="125.5" cy="70" r="10.4" fill="${b.eye}"/><circle cx="128.3" cy="67" r="2.7" fill="#FFFFFF"/>
${b.shaped
  ? ` <path d="M127,83.5C139,84.5 150,88.5 158.5,93C160.6,94.1 160.6,96.4 158.5,97.5C150,102 139,105.5 127,106.5C123.5,99 123.5,91 127,83.5Z" fill="url(#beak)"/>`
  : ` <path d="M128.5,86L158,94.5L128.5,103Z" fill="${b.beak}" stroke="${b.beak}" stroke-width="8" stroke-linejoin="round"/>`}
</g>
</svg>`;
};

const out = join(here, "refined");
mkdirSync(out, { recursive: true });
for (const [tk, t] of Object.entries(TILES))
  for (const [bk, b] of Object.entries(BIRDS)) {
    await sharp(Buffer.from(svg(t, b, 1024))).png().toFile(join(out, `${tk}-${bk}.png`));
    await sharp(Buffer.from(svg(t, b, 180))).png().toFile(join(out, `${tk}-${bk}-180.png`));
  }
console.log("wrote", out);
