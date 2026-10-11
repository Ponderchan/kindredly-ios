// The App Preview as the landing's own film (owner, 2026-10-11: "感觉和web里
// 的那个视频差距很大 … 不用录制 你就做个差不多的"). Builds film.html from the
// web film itself — its phone markup, its stylesheet, its beats — and the
// app's art (wren-family, stamp art, FACE v1), with three changes for the
// store: a poster scene first (frame 0 is the thumbnail), no "sound off /
// pause / progress" foot, and a page-level clock so every frame can be
// rendered exactly (render-film.mjs) and every hit logged for the sound.
//   node design/store/landing/film/make-film.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = "/Users/redbeardlord/Desktop/claude 项目/kindredly/app";
const OUT = path.join(HERE, "..", "out", "film");
fs.mkdirSync(OUT, { recursive: true });

/* the web app's modules are plain ESM; import copies of them */
const TMP = path.join(OUT, ".mods"); fs.mkdirSync(TMP, { recursive: true });
const load = async (rel) => {
  const dst = path.join(TMP, rel.replace(/[\/]/g, "_").replace(/\.js$/, ".mjs"));
  fs.copyFileSync(path.join(WEB, rel), dst);
  return import(pathToFileURL(dst).href);
};
const { WREN_FAMILY } = await load("wren-family.js");
const { STAMP_ART } = await load("stamp-art.js");
// system.js pulls in the rest of the web app; read the stamp rows as text
const SYS = fs.readFileSync(path.join(WEB, "system.js"), "utf8");
const STAMPS = [...SYS.matchAll(/\{ id: "([a-z-]+)", cat: "[a-z]+", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})", name: \{ en: "([^"]+)"/g)].map((m) => ({ id: m[1], color: m[2], name: { en: m[3] } }));
const faces = await load("engine/faces-core.js");

const FZ = (await load("film/copy.js")).FZ.en;
const WREN_KEYS = ["hatchling", "fly", "adult-wink", "adult-delight", "adult-curious", "adult-worry", "adult-happy", "adult-sleepy"];
const STAMP_IDS = ["almost-texted", "situationship", "overthinking", "hot-take", "not-over-it", "cringe", "tiny-win"];
const DATA = {
  wren: Object.fromEntries(WREN_KEYS.map((k) => [k, WREN_FAMILY["wren-sticker-" + k]])),
  art: Object.fromEntries(STAMP_IDS.map((id) => [id, STAMP_ART["stamp-" + id]])),
  stamps: Object.fromEntries(STAMP_IDS.map((id) => { const s = STAMPS.find((x) => x.id === id); return [id, { color: s.color, name: s.name.en }]; })),
  // FACE v1 cells for every seed × develop the film draws
  faces: Object.fromEntries(["no-4207-mara", "you-the-writer"].flatMap((seed) => [0.18, 0.38, 0.58, 0.78, 1].map((d) => [seed + "@" + d, [...faces.visibleCells(seed, d)]]))),
  fz: { ...FZ, free: "penpals matched by how you write" },
};

let phone = fs.readFileSync(path.join(WEB, "film", "Film.jsx"), "utf8");
phone = phone.slice(phone.indexOf("const PHONE = `") + 15, phone.indexOf("`;", phone.indexOf("const PHONE = `")));
// the store film has no foot (sound off · pause) and no progress bar
phone = phone.replace(/<div class="fz-foot">[\s\S]*?<\/div>\n/, "").replace('<span class="fz-bar" id="fzBar"></span>', "");
// the poster: the film's own parts, at rest — a stamped letter, her with a
// delivery, and the landing's line slammed in (it is frame 0, the thumbnail)
const POSTER = `
    <div class="fz-sc on fz-poster" data-s="poster">
      <div class="fz-card fz-let" style="transform:rotate(-3deg);margin-top:18px"><div class="fz-mono"><span class="fz-mi"></span><span>TO A STRANGER</span></div><span id="fzPosterT"></span><span class="fz-stamp" id="fzPosterS" style="opacity:1;transform:rotate(12deg)"></span></div>
      <span class="fz-tag" id="fzPosterTag" style="transform:rotate(-3deg)"></span>
    </div>`;
phone = phone.replace('<div class="fz-sc on" data-s="hatch">', POSTER + '\n    <div class="fz-sc" data-s="hatch">').replace('data-g="launch"', 'data-g="butter"');

const css = fs.readFileSync(path.join(WEB, "film", "film.css"), "utf8");
const Z = 3.42; // the 340-wide film, drawn at this zoom on the 1320×2860 page
const CSS = css + `
html,body{margin:0;width:1320px;height:2860px;overflow:hidden}
body{background:var(--g,#FFD84A);transition:none;font-family:"Instrument Sans",sans-serif}
body::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(30,27,53,.14) 4.8px,transparent 5.4px);background-size:62px 62px}
body[data-g="sky"]{background:linear-gradient(180deg,#8FCBFF 0%,#D6EDFF 72%)}
.kfilm{zoom:${Z};position:absolute;left:50%;top:50%;width:340px;max-width:none;margin:0;padding:0;transform:translate(-50%,-50%)}
/* an iPhone's corners and island on the film's phone */
.kfilm .film-ph{border-radius:52px}
.kfilm .film-ph::after{content:"";position:absolute;left:50%;top:10px;width:92px;height:27px;margin-left:-46px;border-radius:14px;background:#1E1B35;z-index:9}
.kfilm .fz-poster .fz-let{width:100%}
.kfilm .fz-poster .fz-stamp{right:-14px;top:-24px}
.kfilm .fz-bird.posed{transition:none}
.kfilm .fz-stage[data-g="ink"]{background:#1E1B35}
.kfilm .fz-stage[data-g="ink"]::before{background-image:radial-gradient(rgba(255,255,255,.10) 1.4px,transparent 1.6px)}
body[data-g="ink"] .kfilm .film-ph{border-color:#4A4672;box-shadow:9px 9px 0 rgba(0,0,0,.35)}
body[data-g="ink"]::before{background-image:radial-gradient(rgba(255,255,255,.10) 4.8px,transparent 5.4px)}
.kfilm .fz-stage[data-g="ink"] .fz-bird-in svg{filter:drop-shadow(3px 4px 0 rgba(0,0,0,.45))}
.kfilm .fz-sc.fz-poster.on .fz-pop{opacity:1}
.kfilm .fz-slam.instant .w,.kfilm .fz-slam.instant.on .w{animation:none;opacity:1}
`;

const JS = fs.readFileSync(path.join(HERE, "film-logic.js"), "utf8");
const FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Instrument+Sans:wght@400;600&family=IBM+Plex+Mono:wght@600;700&family=Fraunces:ital,opsz,wght@1,9..144,500&display=block";
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>${CSS}</style></head>
<body data-g="butter"><div class="kfilm" id="film" role="img">${phone}</div>
<script>const DATA=${JSON.stringify(DATA)};</script><script>${JS}</script></body></html>`;
fs.writeFileSync(path.join(OUT, "film.html"), html);
console.log("wrote", path.join(OUT, "film.html"));
