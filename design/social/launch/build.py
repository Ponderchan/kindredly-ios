#!/usr/bin/env python3
"""The launch post's video (owner, 2026-10-12: a post like Sage's "the moment Sage
finds a great match, she texts you", for Kindredly — 独特的, good for people).

16:9, 1920×1080, ~23 s. Each beat is one sentence above one piece of the product
moving: the letter, how she reads you, the knock when someone writes back, five
letters each way and the names. Landing hand (white paper, ink, Bricolage 800
lowercase, one acid stripe), the app's own art (wren-family, the stamps), and only
lines already approved (the landing film's, the push copy's, the store's).
Frame 0 is a title card, so whatever thumbnail X picks says what this is.

  python3 design/social/launch/build.py      → out/launch.html + out/events.json
  node design/social/launch/render.mjs       → out/frames/*.jpg
  python3 design/social/launch/sound.py      → out/sound.wav, then the mux (README in render.mjs)
"""
import os, sys, json, html
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "store", "landing"))
import build as B  # noqa: E402  (the store set's symbols, keylines already off)

OUT = os.path.join(HERE, "out"); os.makedirs(OUT, exist_ok=True)
ICON = "file://" + os.path.abspath(os.path.join(HERE, "..", "..", "..", "assets", "icon.png"))

# ── the beats: (id, start, end) in seconds ────────────────────────────────
BEATS = [
    ("title", 0.0, 1.8),
    ("write", 1.8, 6.2),
    ("reads", 6.2, 10.6),
    ("home", 10.6, 15.8),
    ("names", 15.8, 20.2),
    ("end", 20.2, 23.6),
]
HEAD = {
    "write": ("write one honest thing.\nto nobody in particular.", "nobody in particular."),
    "reads": ("she reads how you write,\nnot how you look.", "how you write,"),
    "home": ("a stranger writes back.\nshe flies it home.", "she flies it home."),
    "names": ("five letters each way.\nthen you trade names.", "trade names."),
}
LETTER = "it's 2am and i just reorganised my bookshelf by colour instead of texting him back."
PAIRS = [("all lowercase", "#FFD84A"), ("3am energy", "#FF9ACB"), ("overthinks it", "#8FEBC0")]   # the landing film's
PUSH = ("Pip", "someone wrote back. i flew it here in one go")                                       # the approved push line
REPLY = "wait. this is literally me. i have one of those texts too 😭"                               # the landing film's
DEF = "Kindredly is an anonymous penpal app that matches strangers by how they write."              # DESIGN.md, word for word

def head_html(bid):
    text, mark = HEAD[bid]
    toks = []
    for li, line in enumerate(text.split("\n")):
        for wi, w in enumerate(line.split()):
            toks.append((w, li > 0 and wi == 0))
    pw = mark.split()
    start = next(i for i in range(len(toks)) if [t[0] for t in toks[i:i + len(pw)]] == pw)
    out = []
    for i, (w, br) in enumerate(toks):
        piece = ("<br>" if br else "") + ('<span class="mk">' if i == start else "") + f'<span class="w" data-n="{i}">{html.escape(w)}</span>'
        if i == start + len(pw) - 1:
            piece += "</span>"
        out.append(piece)
    return f'<div class="h">{" ".join(out)}</div>'

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:#FFFFFF;color:#1E1B35;font-family:'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
:root{--ink:#1E1B35;--acid:#C3E84F;--pink:#FF9ACB;--muted:#55506E}
.beat{position:absolute;inset:0;display:none}
.h{position:absolute;left:0;right:0;top:80px;text-align:center;font:800 92px/1.0 'Bricolage Grotesque',sans-serif;letter-spacing:-.035em;padding:0 120px}
.w{display:inline-block;transform-origin:50% 80%}
.mk{background-image:linear-gradient(var(--acid),var(--acid));background-repeat:no-repeat;background-position:0 88%;background-size:0% 34%;padding:0 .05em;margin:0 -.05em}
.card{position:absolute;background:#fff;border:5px solid var(--ink);border-radius:30px;box-shadow:12px 12px 0 var(--ink)}
.mono{font:700 26px/1 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase}
.letter{font:italic 500 56px/1.34 'Fraunces',Georgia,serif}
.tag{display:inline-block;border:5px solid var(--ink);border-radius:999px;box-shadow:7px 7px 0 var(--ink);font:700 34px/1 'IBM Plex Mono',monospace;padding:14px 24px 16px;white-space:nowrap}
.pop,.thwack{transform-origin:50% 50%}
.caret{display:inline-block;width:4px;height:1em;background:#5757EC;vertical-align:-.12em;margin-left:3px}
.notif{position:absolute;left:50%;width:1060px;margin-left:-530px;border-radius:44px;background:rgba(236,236,242,.97);box-shadow:0 18px 50px rgba(30,27,53,.18);padding:26px 30px;display:flex;gap:22px;align-items:center;font-family:-apple-system,'SF Pro Text',system-ui,sans-serif}
.notif img{width:100px;height:100px;border-radius:24px;flex:none}
.notif .t{display:flex;justify-content:space-between;font-size:36px;font-weight:600}
.notif .t span{font-weight:400;color:rgba(30,27,53,.5);font-size:26px}
.notif .b{font-size:38px;line-height:1.3;margin-top:4px}
.sq{display:inline-block;width:64px;height:64px;border:5px solid rgba(30,27,53,.16);margin-right:16px;vertical-align:middle}
.end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px}
"""

def letter_beat():
    you = B.mosaic("you-the-writer", 9, gap=3)
    return (head_html("write")
            + f'<div class="card" id="letter" style="left:330px;top:400px;width:1260px;padding:50px 64px 62px">'
            + f'<div class="mono" style="display:flex;align-items:center;gap:16px;margin-bottom:26px">{you}<span>to a stranger</span></div>'
            + f'<div class="letter" style="padding-right:150px"><span id="typed"></span><span class="caret" id="caret"></span></div>'
            + f'<div class="thwack" data-at="3.25" data-r="12" style="position:absolute;right:-70px;top:-90px;filter:drop-shadow(8px 8px 0 #1E1B35)">{B.stamp("cant-sleep", 230)}</div>'
            + '<div class="pop" data-at="3.6" data-r="-3" style="position:absolute;left:56px;bottom:-34px"><span class="tag" style="background:#2A3576;color:#fff">#can\'t sleep</span></div>'
            + '</div>')

def reads_beat():
    you = B.mosaic("you-the-writer", 15, gap=4); them = B.mosaic("no-4207", 15, gap=4)
    who = lambda inner, label, x, r, at: (f'<div class="card pop" data-at="{at}" data-r="{r}" style="left:{x}px;top:360px;width:340px;padding:28px;text-align:center">'
                                          f'<div style="display:flex;justify-content:center;margin-bottom:16px">{inner}</div><div style="font:800 34px/1 \'Bricolage Grotesque\',sans-serif">{label}</div></div>')
    pairs = "".join(
        f'<div style="position:absolute;left:0;right:0;top:{650 + i * 112}px;display:flex;justify-content:center;align-items:center;gap:44px">'
        f'<span class="pop tag" data-at="{0.9 + i * 0.32:.2f}" data-r="-2" style="background:{c};width:400px;text-align:center">{html.escape(p)}</span>'
        f'<span class="pop" data-at="{1.0 + i * 0.32:.2f}" data-r="0" style="font:800 48px \'Bricolage Grotesque\',sans-serif">=</span>'
        f'<span class="pop tag" data-at="{1.05 + i * 0.32:.2f}" data-r="2" style="background:{c};width:400px;text-align:center">{html.escape(p)}</span></div>'
        for i, (p, c) in enumerate(PAIRS))
    chip = '<div class="pop" data-at="2.35" data-r="-2" style="position:absolute;left:1470px;top:420px"><span class="tag" style="background:#C3E84F;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:800;font-size:40px">✦ auras close</span></div>'
    return (head_html("reads") + who(you, "you", 500, -3, 0.2) + '<div class="pop" data-at="0.26" data-r="0" style="position:absolute;left:0;right:0;top:450px;text-align:center;font:800 72px \'Bricolage Grotesque\',sans-serif">=</div>'
            + who(them, "No. 4207", 1080, 3, 0.32) + pairs + chip)

def home_beat():
    wren = B.use("wren-sticker-fly", 300, "filter:drop-shadow(10px 12px 0 rgba(30,27,53,.9))")
    return (head_html("home")
            + f'<div id="flyer" style="position:absolute;left:-360px;top:470px;z-index:5">{wren}</div>'
            + f'<div class="notif" id="notif" style="top:360px"><img src="{ICON}"><div style="flex:1;min-width:0"><div class="t"><b>{PUSH[0]}</b><span>now</span></div><div class="b">{html.escape(PUSH[1])}</div></div></div>'
            + f'<div class="card pop" data-at="2.75" data-r="2" style="left:420px;top:610px;width:1080px;padding:40px 52px 48px">'
            + f'<div class="mono" style="display:flex;align-items:center;gap:14px;margin-bottom:18px">{B.mosaic("no-4207", 8, gap=2)}<span>from No. 4207</span></div>'
            + f'<div class="letter" style="font-size:50px">{html.escape(REPLY)}</div></div>')

def names_beat():
    row = lambda who, color: "".join(f'<i class="sq" data-row="{who}" data-i="{i}" style="--c:{color}"></i>' for i in range(5))
    return (head_html("names")
            + '<div class="card" style="left:470px;top:350px;width:400px;height:400px;border-radius:50%;display:flex;align-items:center;justify-content:center"><div id="face"></div></div>'
            + '<div id="count" class="mono" style="position:absolute;left:470px;width:400px;top:800px;text-align:center;font-size:32px">letter 1 / 5</div>'
            + f'<div style="position:absolute;left:980px;top:420px"><div style="margin-bottom:28px"><span class="mono" style="display:inline-block;width:150px;font-size:30px">them</span>{row("them", "#3A34D6")}</div>'
            + f'<div><span class="mono" style="display:inline-block;width:150px;font-size:30px">you</span>{row("you", "#1E1B35")}</div></div>'
            + '<div class="pop" data-at="3.05" data-r="-3" style="position:absolute;left:1130px;top:660px"><span class="tag" style="background:#FF9ACB;font:800 84px/1 \'Bricolage Grotesque\',sans-serif;letter-spacing:-.02em;padding:18px 56px 26px">mara</span></div>')

def title_beat(kind):
    wren = B.use("wren-sticker-adult-happy", 260, "filter:drop-shadow(10px 12px 0 rgba(30,27,53,.9))")
    sub = ('<div style="font:800 64px/1.05 \'Bricolage Grotesque\',sans-serif;letter-spacing:-.03em;text-align:center">anonymous pen pals,<br><span style="background-image:linear-gradient(#C3E84F,#C3E84F);background-repeat:no-repeat;background-position:0 88%;background-size:100% 34%">matched by how you write.</span></div>'
           if kind == "title" else
           f'<div style="font-size:42px;color:#55506E;text-align:center;max-width:1300px;text-wrap:balance">{html.escape(DEF)}</div><div style="font:600 34px/1 \'IBM Plex Mono\',monospace;color:#1E1B35;margin-top:6px">free on iPhone &amp; web · kindredly.io</div>')
    return (f'<div class="end"><div data-idle="wren">{wren}</div>'
            f'<div style="font:800 128px/1 \'Bricolage Grotesque\',sans-serif;letter-spacing:-.045em">kindredly</div>{sub}</div>')

BODY = {"title": title_beat("title"), "write": letter_beat(), "reads": reads_beat(), "home": home_beat(), "names": names_beat(), "end": title_beat("end")}

# what makes a sound, when (seconds, absolute) — for sound.py
def events():
    ev = [{"t": 0.0, "type": "poster"}]
    for bid, a, b in BEATS[1:]:
        ev.append({"t": a, "type": "cut"})
        if bid in HEAD:
            n = len(HEAD[bid][0].split())
            ev += [{"t": round(a + 0.08 + i * 0.065, 3), "type": "slam"} for i in range(n)]
    a = dict((b[0], b[1]) for b in BEATS)
    ev += [{"t": round(a["write"] + 0.9 + i * 0.09, 3), "type": "key"} for i in range(22)]
    ev += [{"t": a["write"] + 3.25, "type": "thwack"}, {"t": a["write"] + 3.6, "type": "pop"}]
    ev += [{"t": round(a["reads"] + x, 3), "type": "pop"} for x in (0.2, 0.32, 0.9, 1.05, 1.22, 1.37, 1.54, 1.69, 2.35)]
    ev += [{"t": a["home"] + 0.5, "type": "whoosh"}, {"t": a["home"] + 1.55, "type": "ding"}, {"t": a["home"] + 2.75, "type": "pop"}]
    ev += [{"t": round(a["names"] + 0.6 + k * 0.4, 3), "type": "count", "k": k} for k in range(5)]
    ev += [{"t": a["names"] + 3.05, "type": "thwack"}, {"t": a["end"], "type": "end"}, {"t": a["write"], "type": "drop"}]
    return sorted(ev, key=lambda e: e["t"])

JS = r"""
const BEATS = __BEATS__, LETTER = __LETTER__;
const T = BEATS[BEATS.length - 1][2];
const clamp = (x) => Math.max(0, Math.min(1, x));
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const outBack = (x, s = 2.4) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
/* a FACE-like mosaic that develops: the same seeded cells, more of them shown */
function face(develop) {
  let s = 4207; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const on = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (rnd() < 0.55) { on.push([r, c]); if (c < 2) on.push([r, 4 - c]); }
  const order = on.map((p, i) => [rnd(), p]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const k = Math.ceil(order.length * develop), cell = 42, gap = 10, sz = 5 * cell + 4 * gap;
  let out = `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">`;
  order.forEach(([r, c], i) => out += `<rect x="${c * (cell + gap)}" y="${r * (cell + gap)}" width="${cell}" height="${cell}" rx="3" fill="#1E1B35" opacity="${i < k ? 1 : 0.07}"/>`);
  return out + "</svg>";
}
let lastFace = -1;
window.render = (t) => {
  let i = 0; while (i < BEATS.length - 1 && t >= BEATS[i + 1][1]) i++;
  const [id, a] = BEATS[i]; const lt = t - a;
  document.querySelectorAll(".beat").forEach((b) => (b.style.display = b.id === "b-" + id ? "block" : "none"));
  const el = document.getElementById("b-" + id);
  // the headline lands word by word, then its stripe
  const ws = el.querySelectorAll(".w");
  ws.forEach((w) => { const p = clamp((lt - (0.08 + +w.dataset.n * 0.065)) / 0.34); w.style.opacity = p > 0 ? 1 : 0; w.style.transform = `translateY(${(1 - outCubic(p)) * 40}px) scale(${0.8 + 0.2 * outBack(p)})`; });
  const land = 0.08 + ws.length * 0.065 + 0.2;
  el.querySelectorAll(".mk").forEach((m) => (m.style.backgroundSize = `${clamp((lt - land) / 0.3) * 100}% 34%`));
  el.querySelectorAll(".pop").forEach((p) => { const q = clamp((lt - +p.dataset.at) / 0.38); p.style.opacity = q > 0 ? 1 : 0; p.style.transform = `rotate(${p.dataset.r || 0}deg) scale(${q > 0 ? Math.max(0, outBack(q, 2.6)) : 0})`; });
  el.querySelectorAll(".thwack").forEach((p) => { const q = clamp((lt - +p.dataset.at) / 0.45); p.style.opacity = q > 0 ? 1 : 0; p.style.transform = `rotate(${(+p.dataset.r || 0) - 24 * (1 - q)}deg) scale(${q > 0 ? 2.4 - 1.4 * outBack(q, 1.6) : 0})`; });
  document.querySelectorAll('[data-idle="wren"]').forEach((w) => (w.style.transform = `translateY(${Math.sin(t * 2.8) * 10}px) rotate(${Math.sin(t * 1.8) * 3}deg)`));
  if (id === "write") {
    const n = Math.floor(clamp((lt - 0.9) / 2.1) * LETTER.length);
    document.getElementById("typed").textContent = LETTER.slice(0, n);
    document.getElementById("caret").style.opacity = n >= LETTER.length ? (Math.floor(lt * 2) % 2 ? 0 : 1) : 1;
  }
  if (id === "home") {
    const f = document.getElementById("flyer"), p = outCubic(clamp((lt - 0.4) / 0.9));
    f.style.left = (-360 + p * 1620) + "px"; f.style.top = (470 - Math.sin(p * Math.PI) * 120) + "px"; f.style.opacity = p >= 1 ? 1 - clamp((lt - 1.4) / 0.2) : 1;
    const n = document.getElementById("notif"), q = clamp((lt - 1.5) / 0.45);
    n.style.opacity = q; n.style.transform = `translateY(${(1 - outBack(q, 1.4)) * -140}px)`;
  }
  if (id === "names") {
    const turns = Math.floor(clamp((lt - 0.6) / 2.0) * 10.999);
    const theirs = Math.floor(turns / 2), mine = Math.ceil(turns / 2);
    document.querySelectorAll(".sq").forEach((q) => { const on = (q.dataset.row === "you" ? mine : theirs) > +q.dataset.i; q.style.background = on ? q.style.getPropertyValue("--c") : "#fff"; q.style.borderColor = on ? q.style.getPropertyValue("--c") : "rgba(30,27,53,.16)"; });
    const dev = [0.18, 0.38, 0.58, 0.78, 1][Math.max(0, Math.min(4, theirs - 1))] * (theirs > 0 ? 1 : 0.6);
    if (dev !== lastFace) { document.getElementById("face").innerHTML = face(dev || 0.12); lastFace = dev; }
    document.getElementById("count").textContent = `letter ${Math.max(1, Math.min(5, theirs || 1))} / 5`;
  }
  return T;
};
const FACES = ['800 80px "Bricolage Grotesque"', '700 22px "IBM Plex Mono"', 'italic 500 40px "Fraunces"', '400 30px "Instrument Sans"'];
window.ready = Promise.all(FACES.map((f) => document.fonts.load(f))).then(() => document.fonts.ready)
  .then(() => Promise.all([...document.images].map((im) => (im.complete ? 0 : im.decode().catch(() => 0)))))
  .then(() => { const miss = FACES.filter((f) => !document.fonts.check(f)); if (miss.length) throw new Error("fonts: " + miss); window.render(0); return T; });
"""

FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Instrument+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500;700&family=Fraunces:ital,opsz,wght@1,9..144,500&display=block"
beats = "".join(f'<div class="beat" id="b-{bid}">{BODY[bid]}</div>' for bid, _, _ in BEATS)
page = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><link href="{FONTS}" rel="stylesheet"><style>{CSS}</style></head>'
        f'<body>{B.SYMBOLS}{beats}<script>{JS.replace("__BEATS__", json.dumps([list(b) for b in BEATS])).replace("__LETTER__", json.dumps(LETTER))}</script></body></html>')
open(os.path.join(OUT, "launch.html"), "w", encoding="utf8").write(page)
json.dump(events(), open(os.path.join(OUT, "events.json"), "w"))
print("wrote", os.path.join(OUT, "launch.html"), f"{BEATS[-1][2]}s")
