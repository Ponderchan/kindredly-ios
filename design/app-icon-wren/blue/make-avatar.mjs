/* WREN'S OWN AVATAR, from the app icon's drawing (owner, 2026-11-13: the official Wren's face in
   Kindreds was a small bird on a grey disc, "好难看没有背景而且和下面的头像不搭配"; the icon itself,
   cut round, lost its edge: her white body fills the icon's lower left, white on the white list).
     node design/app-icon-wren/blue/make-avatar.mjs
   writes assets/wren-avatar.png (240, square, opaque: the app draws it round). The icon's art and
   palette (make-final.mjs, copied here so running this never rewrites the icons), posed so the
   whole bird sits in the middle of the round, a little low, cobalt all the way round its edge. */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/Users/redbeardlord/Desktop/claude 项目/kindredly/package.json");
const sharp = require("sharp");
const here = dirname(fileURLToPath(import.meta.url));
const BODY = "M40.5,110C40.5,68 72,40 110.5,40C142,40 159.5,64.5 159.5,92.5C163,127.5 142,159 100,159C65,159 40.5,141.5 40.5,110Z";
const BEAK = "M127,83.5C139,84.5 150,88.5 158.5,93C160.6,94.1 160.6,96.4 158.5,97.5C150,102 139,105.5 127,106.5C123.5,99 123.5,91 127,83.5Z";
/* the body's box is 40.5–163 × 40–159 (centre 101.75, 99.5); at 1.2 its centre goes to (100, 104):
   the farthest of it is about 76 from the round's middle, inside the 100 radius */
const POSE = "translate(-22.1 -15.4) scale(1.2)";
const p = { top: "#3866FF", low: "#2650EE", white: "#FFFFFF", shade: "#E7ECFF", wing: "#B8C6FF", belly: "#FFE08A", beakTop: "#FF96A8", beakLow: "#F26A86", eye: "#141A3D", glint: "#FFFFFF", lift: "#1A36B8", liftA: 0.18 };

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="240" height="240"><defs>
 <linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.low}"/></linearGradient>
 <linearGradient id="w" x1="0.25" y1="0.05" x2="0.6" y2="1"><stop offset="0" stop-color="${p.white}"/><stop offset="0.62" stop-color="${p.white}"/><stop offset="1" stop-color="${p.shade}"/></linearGradient>
 <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.beakTop}"/><stop offset="1" stop-color="${p.beakLow}"/></linearGradient>
 <filter id="l" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter>
</defs>
<rect width="200" height="200" fill="url(#t)"/>
<g transform="${POSE}">
 <path d="${BODY}" fill="${p.lift}" opacity="${p.liftA}" transform="translate(1.5 4)" filter="url(#l)"/>
 <path d="${BODY}" fill="url(#w)"/>
 <ellipse cx="96.5" cy="133" rx="36" ry="24" fill="${p.belly}"/>
 <ellipse cx="149" cy="121" rx="15" ry="28.5" fill="${p.wing}" transform="rotate(-22 149 121)"/>
 <circle cx="90" cy="76" r="9.6" fill="${p.eye}"/><circle cx="92.6" cy="73.2" r="2.5" fill="${p.glint}"/>
 <circle cx="125.5" cy="70" r="10.4" fill="${p.eye}"/><circle cx="128.3" cy="67" r="2.7" fill="${p.glint}"/>
 <path d="${BEAK}" fill="url(#b)"/>
</g></svg>`;

const file = join(here, "..", "..", "..", "assets", "wren-avatar.png");
await sharp(Buffer.from(svg)).flatten({ background: p.low }).png({ compressionLevel: 9 }).toFile(file);
console.log("wrote", file);
