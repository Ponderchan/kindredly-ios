/* WREN'S FACE, FRONT ON (owner, 2026-11-13, of the avatar made from the icon: "不好看 一点都不像官方的
   agent bot. 这个地方以后要慢慢变成官方的ai agent bot , 要个正脸可爱的"). Her picture in Kindreds'
   list, where everyone else is a face looking out of a coloured circle (the made faces):
     node design/app-icon-wren/blue/make-avatar-front.mjs [out.png] [px]
   writes assets/wren-avatar.png (240, square, full bleed: the list cuts it round) unless told
   otherwise. The icon's palette: cobalt, her white shaded in the ground's hue, a butter belly, a
   coral beak, the wing a tint of the ground. Front on: both eyes, the beak a small coral drop
   between them, blush under them, round as she is, the wings' tips at her sides, the circle's foot
   just touching her belly. On her head a feather that ends in a butter ✦, the sign of the
   official helper she is growing into. */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/Users/redbeardlord/Desktop/claude 项目/kindredly/package.json");
const sharp = require("sharp");
const here = dirname(fileURLToPath(import.meta.url));

const P = { top: "#3D6BFF", low: "#2650EE", white: "#FFFFFF", shade: "#DCE4FF", wing: "#B8C6FF", belly: "#FFE08A", bellyLow: "#FFD25E", beakTop: "#FF9DAE", beakLow: "#F26A86", eye: "#141A3D", glint: "#FFFFFF", blush: "#FF8FA6", star: "#FFE08A" };

/** a four-point star centred on (x, y), `r` to its points, `k` its waist */
const star = (x, y, r, k = 0.3) => {
  const w = r * k;
  return `M${x},${y - r} Q${x + w * 0.35},${y - w * 0.35} ${x + r},${y} Q${x + w * 0.35},${y + w * 0.35} ${x},${y + r} Q${x - w * 0.35},${y + w * 0.35} ${x - r},${y} Q${x - w * 0.35},${y - w * 0.35} ${x},${y - r}Z`;
};

export const avatar = (id = "f") => `<defs>
 <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.top}"/><stop offset="1" stop-color="${P.low}"/></linearGradient>
 <linearGradient id="${id}w" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="${P.white}"/><stop offset="0.58" stop-color="${P.white}"/><stop offset="1" stop-color="${P.shade}"/></linearGradient>
 <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.beakTop}"/><stop offset="1" stop-color="${P.beakLow}"/></linearGradient>
 <linearGradient id="${id}y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.belly}"/><stop offset="1" stop-color="${P.bellyLow}"/></linearGradient>
 <filter id="${id}s" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
<clipPath id="${id}c"><circle cx="100" cy="132" r="72"/></clipPath>
</defs>
<rect width="200" height="200" fill="url(#${id}g)"/>
<!-- the feather on her head, ending in the star -->
<path d="M100,62 C99,50 102,41 108,34" fill="none" stroke="${P.white}" stroke-width="6" stroke-linecap="round"/>
<path d="${star(110, 29, 11)}" fill="${P.star}"/>
<!-- the wings' tips, behind her at her sides -->
<ellipse cx="33" cy="160" rx="11" ry="21" fill="${P.wing}" transform="rotate(28 33 160)"/>
<ellipse cx="167" cy="160" rx="11" ry="21" fill="${P.wing}" transform="rotate(-28 167 160)"/>
<!-- her shadow on the ground, then her: round, as Wren is -->
<circle cx="101" cy="136" r="72" fill="#1636B8" opacity="0.22" filter="url(#${id}s)"/>
<circle cx="100" cy="132" r="72" fill="url(#${id}w)"/>
<!-- the belly -->
<g clip-path="url(#${id}c)"><ellipse cx="100" cy="188" rx="46" ry="34" fill="url(#${id}y)"/></g>
<!-- blush -->
<ellipse cx="61" cy="140" rx="10" ry="6.5" fill="${P.blush}" opacity="0.45"/>
<ellipse cx="139" cy="140" rx="10" ry="6.5" fill="${P.blush}" opacity="0.45"/>
<!-- eyes -->
<circle cx="76" cy="119" r="11.5" fill="${P.eye}"/><circle cx="79.8" cy="115.2" r="3.8" fill="${P.glint}"/><circle cx="72.6" cy="123.2" r="1.5" fill="${P.glint}" opacity="0.9"/>
<circle cx="124" cy="119" r="11.5" fill="${P.eye}"/><circle cx="127.8" cy="115.2" r="3.8" fill="${P.glint}"/><circle cx="120.6" cy="123.2" r="1.5" fill="${P.glint}" opacity="0.9"/>
<!-- the beak, a small drop between them -->
<path d="M89,131 C95,128 105,128 111,131 C108,139 104,145 100,147 C96,145 92,139 89,131Z" fill="url(#${id}b)"/>`;

const svg = (px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${px}" height="${px}">${avatar()}</svg>`;

const file = resolve(process.argv[2] ?? join(here, "..", "..", "..", "assets", "wren-avatar.png"));
const px = Number(process.argv[3] ?? 240);
mkdirSync(dirname(file), { recursive: true });
await sharp(Buffer.from(svg(px))).flatten({ background: P.low }).png().toFile(file);
console.log("wrote", file, px);
