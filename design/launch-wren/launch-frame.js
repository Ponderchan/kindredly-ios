/* The launch's frames, as one function of time (design/launch-wren/prototype.html draws it live,
   render.cjs writes it to video). The Swift piece follows these numbers. */
/* One clock, every layer derived from it (as the Swift piece will be: TimelineView). Grid: the
   phone at 393 × 852 points. */
const W = 393, H = 852;
const C = { cobalt: "#2F5BF6", white: "#FFFFFF", shade: "#E7ECFF",
  wing: "#B8C6FF", belly: "#FFE08A", beakTop: "#FF9DAE", beakLow: "#F26A86", eye: "#141A3D", star: "#FFE08A", lift: "#1636B8" };

// Wren, as the icon draws her (design/app-icon-wren/blue/make-final.mjs), on her 200 grid
const BODY = "M40.5,110C40.5,68 72,40 110.5,40C142,40 159.5,64.5 159.5,92.5C163,127.5 142,159 100,159C65,159 40.5,141.5 40.5,110Z";
const BEAK = "M127,83.5C139,84.5 150,88.5 158.5,93C160.6,94.1 160.6,96.4 158.5,97.5C150,102 139,105.5 127,106.5C123.5,99 123.5,91 127,83.5Z";


/* THE LETTER IS WHITE, WREN IS BLUE (owner, 2026-11-13: the white letter with the white icon Wren
   "太白了 … 和wren撞色", then, of kraft: "不要牛皮纸 不行就蓝鸟 peek 白信封"). She is Wren as the
   official art colours her (~/Desktop/wren-official/no-outline: indigo, a deeper wing, a cream
   belly, a pink beak), drawn with the icon's shapes. On the cobalt ground her blue would sink,
   so the open flap is tall enough that her whole head stands against its white. */
const PAPERS = {
  white: { body: "#FFFFFF", flap: "#FFFFFF", inside: "#E8EDFF", line: "#C9D3FF" },
};
const BIRD = { body: "#5757EC", bodyLow: "#4C4CDF", wing: "#4646DB", belly: "#F6E7C9", beakTop: "#F7AFC1", beakLow: "#EE8EA7", eye: "#1E1B33" };
// the flap's length, closed (down over the front) and open (up behind her)
const FLAP = 112;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// a spring's overshoot, settling by x = 1
const backOut = (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const star = (x, y, r) => { const w = r * 0.3 * 0.35;
  return `M${x},${y - r} Q${x + w},${y - w} ${x + r},${y} Q${x + w},${y + w} ${x},${y + r} Q${x - w},${y + w} ${x - r},${y} Q${x - w},${y - w} ${x},${y - r}Z`; };

// the envelope: 244 × 160, its centre a little above the middle (the word sits under it)
const E = { w: 244, h: 160, cx: W / 2, cy: H / 2 };

function frame(t, P, from = 0) {
  P = P || PAPERS.white;
  // the letter comes down onto the cobalt (full), or up out of it in a blink (short)
  const arr = from > 0 ? easeOut(seg(t, from, from + 0.14)) : easeOut(seg(t, 0, 0.22));
  const dropY = from > 0 ? 0 : -22 * (1 - arr);
  const lscale = from > 0 ? 0.97 + 0.03 * arr : 0.94 + 0.06 * arr;
  const L = E.cx - E.w / 2, T = E.cy - E.h / 2, R = L + E.w, B = T + E.h;
  // the whole letter: at rest, then two little hops (something inside), 0.12–0.5
  const hp = seg(t, 0.22, 0.56);
  const hop = t < 0.56 ? Math.sin(hp * Math.PI * 2) * (1 - hp) : 0;
  const hopY = -Math.abs(hop) * 10;
  const hopR = hop * 2.6;
  // the flap opens 0.5–0.78: closed (down over the front) → open (up, behind her)
  const f = easeInOut(seg(t, 0.56, 0.82));
  const flapTipY = T + FLAP - f * FLAP * 2;
  const flapFront = f < 0.5;
  // she rises out of it 0.74–1.08 with an overshoot, and squashes a little as she settles
  const r = seg(t, 0.78, 1.1);
  const rise = r <= 0 ? 0 : backOut(r, 2.0);
  const squash = 1 + Math.sin(seg(t, 1.0, 1.26) * Math.PI) * 0.05;
  // her eyes: shut as she rises, open at 1.0, one blink 1.42–1.54
  const blink = (t > 0.74 && t < 1.02) || (t > 1.44 && t < 1.56) ? 0.12 : 1;
  // she looks at you: the glints move 1.2–1.4
  const look = easeOut(seg(t, 1.22, 1.42));
  // the star pops by her head 1.28–1.5
  const s = seg(t, 1.3, 1.52);
  const starScale = s <= 0 ? 0 : backOut(s, 3);
  const starSpin = (1 - easeOut(s)) * -40;
  // the word and its line
  const wd = easeOut(seg(t, 1.28, 1.64));
  const tg = easeOut(seg(t, 1.42, 1.78));

  // Wren on her 200 grid, (100,100) placed at (cx, wrenY); out to just under her belly's top
  const k = 1.12;
  const wrenY = T + 72 - rise * 78;
  const wren = `<g transform="translate(${E.cx - 4} ${wrenY}) scale(${k / squash} ${k * squash}) translate(-100 -100)">
      <path d="${BODY}" fill="url(#w)"/>
      <ellipse cx="96.5" cy="133" rx="36" ry="24" fill="${BIRD.belly}"/>
      <ellipse cx="149" cy="121" rx="15" ry="28.5" fill="${BIRD.wing}" transform="rotate(-22 149 121)"/>
      <g transform="translate(90 76) scale(1 ${blink})"><circle r="9.6" fill="${BIRD.eye}"/>${blink > .5 ? `<circle cx="${2.6 - look * 4.2}" cy="${-2.8 + look * 0.6}" r="2.6" fill="#fff"/>` : ""}</g>
      <g transform="translate(125.5 70) scale(1 ${blink})"><circle r="10.4" fill="${BIRD.eye}"/>${blink > .5 ? `<circle cx="${2.8 - look * 4.4}" cy="${-3 + look * 0.6}" r="2.8" fill="#fff"/>` : ""}</g>
      <path d="${BEAK}" fill="url(#b)"/>
    </g>`;

  const flap = `<path d="M${L + 2},${T} L${R - 2},${T} Q${E.cx + 16},${flapTipY + (flapTipY > T ? -6 : 6)} ${E.cx},${flapTipY} Q${E.cx - 16},${flapTipY + (flapTipY > T ? -6 : 6)} ${L + 2},${T} Z" fill="${flapFront ? P.flap : P.inside}" stroke="${P.line}" stroke-width="1.3" stroke-linejoin="round"/>`
    + (P.stripes ? `<clipPath id="fc"><path d="M${L + 2},${T} L${R - 2},${T} L${E.cx},${flapTipY} Z"/></clipPath>` : "");
  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="w" x1="0.25" y1="0.05" x2="0.6" y2="1"><stop offset="0" stop-color="${BIRD.body}"/><stop offset="0.62" stop-color="${BIRD.body}"/><stop offset="1" stop-color="${BIRD.bodyLow}"/></linearGradient>
      <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BIRD.beakTop}"/><stop offset="1" stop-color="${BIRD.beakLow}"/></linearGradient>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
      ${P.stripes ? `<pattern id="air" patternUnits="userSpaceOnUse" width="22" height="22" patternTransform="rotate(45)"><rect width="22" height="22" fill="${P.body}"/><rect width="7" height="22" fill="${P.stripes[0]}"/><rect x="11" width="7" height="22" fill="${P.stripes[1]}"/></pattern>` : ""}
    </defs>
    <rect width="${W}" height="${H}" fill="${C.cobalt}"/>
    <g opacity="${arr}" transform="translate(0 ${dropY}) translate(${E.cx} ${E.cy}) scale(${lscale}) translate(${-E.cx} ${-E.cy})"><g transform="translate(0 ${hopY}) rotate(${hopR} ${E.cx} ${B})">
      <ellipse cx="${E.cx}" cy="${B + 16}" rx="${E.w * 0.4}" ry="10" fill="${C.lift}" opacity=".3" filter="url(#soft)"/>
      ${flapFront ? "" : flap}
      ${wren}
      <rect x="${L}" y="${T}" width="${E.w}" height="${E.h}" rx="16" fill="${P.body}"/>
      ${P.stripes ? `<clipPath id="bc"><rect x="${L}" y="${T}" width="${E.w}" height="${E.h}" rx="16"/></clipPath><rect x="${L}" y="${T}" width="${E.w}" height="${E.h}" rx="16" fill="none" stroke="url(#air)" stroke-width="18" clip-path="url(#bc)"/>` : ""}
      <path d="M${L + 10},${B - 8} L${E.cx},${T + E.h * 0.5} L${R - 10},${B - 8}" fill="none" stroke="${P.line}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>
      ${flapFront ? flap : ""}
      <g transform="translate(${E.cx + 78} ${T - 64}) rotate(${starSpin}) scale(${starScale})"><path d="${star(0, 0, 14)}" fill="${C.star}"/></g>
    </g></g>
    <g opacity="${wd}" transform="translate(0 ${(1 - wd) * 10})">
      <text x="${W / 2}" y="${B + 92}" text-anchor="middle" font-family="SF Pro Display, Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="800" font-size="40" letter-spacing="-1.4" fill="#fff">kindredly</text>
    </g>
    <g opacity="${tg}" transform="translate(0 ${(1 - tg) * 8})">
      <text x="${W / 2}" y="${B + 124}" text-anchor="middle" font-family="SF Pro Text, Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="500" font-size="15" fill="#fff">Letters to strangers, carried by a bird.</text>
    </g>
  </svg>`;
  return svg;
}


if (typeof window !== 'undefined') window.LaunchFrame = { frame, PAPERS };
if (typeof module !== 'undefined') module.exports = { frame, PAPERS };
