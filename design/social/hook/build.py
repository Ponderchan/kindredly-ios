#!/usr/bin/env python3
"""The launch post's video, take 2 (owner, 2026-10-12: "一点都不unique和创意 完全没有hook
和用户看了想下载"). 4:5, 1080×1350, ~15 s.

The hook is a moment nearly everyone has had: 2:14 am, a text to someone you
shouldn't send, thumb over "delete draft?". Then the courier crashes in — YOINK —
and the rest is why that's a good thing: she finds someone who types like you,
they write back, five letters later you trade names. Every line is the landing
film's own (owner-approved) or the product's.

  python3 design/social/hook/build.py   → out/hook.html + out/events.json
  node design/social/launch/render.mjs --page design/social/hook/out/hook.html --size 1080x1350
"""
import os, sys, json, html
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "store", "landing"))
import build as B  # noqa: E402

OUT = os.path.join(HERE, "out"); os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1350

BEATS = [("draft", 0.0, 2.4), ("yoink", 2.4, 4.6), ("rhythm", 4.6, 8.8), ("reply", 8.8, 11.2), ("names", 11.2, 13.2), ("end", 13.2, 15.6)]
DRAFT = "i think about you way more than i should lol"           # the landing film's draft
STRANGER = "ok but why do i always think of the perfect reply 3 hours later lol"
REPLY = "wait. this is literally me. i have one of those texts too 😭"  # the landing film's reply
PAIRS = [("all lowercase", "#FFD84A"), ("3am energy", "#FF9ACB"), ("overthinks it", "#8FEBC0")]

def bird(sym, px, extra=""):
    return B.use(sym, px, "filter:drop-shadow(8px 10px 0 rgba(30,27,53,.9));" + extra)

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden;font-family:'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:#1E1B35}
#world{position:absolute;inset:0}
.beat{position:absolute;inset:0;display:none}
.dots::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(30,27,53,.13) 3px,transparent 3.6px);background-size:44px 44px;pointer-events:none}
.cap{position:absolute;left:64px;right:64px;bottom:96px;font:800 92px/1.0 'Bricolage Grotesque',sans-serif;letter-spacing:-.04em;z-index:20}
.cap .w{display:inline-block;margin-right:.2em;transform-origin:50% 80%}
.cap .hl{background:#fff;border:6px solid #1E1B35;border-radius:22px;padding:0 16px;box-shadow:7px 7px 0 #1E1B35}
.cap.light{color:#fff}
.cap.light .hl{color:#1E1B35;background:#C3E84F;border-color:#C3E84F;box-shadow:none}
#grab .field{border:2px solid #C7C7CC;border-radius:48px;background:#fff;padding:22px 30px;font:36px/1.3 -apple-system,'SF Pro Text',system-ui,sans-serif;color:#111;box-shadow:0 18px 40px rgba(30,27,53,.25)}
.card{position:absolute;background:#fff;border:6px solid #1E1B35;border-radius:34px;box-shadow:12px 12px 0 #1E1B35}
.mono{font:700 26px/1 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase}
.letter{font:italic 500 50px/1.32 'Fraunces',Georgia,serif}
.tag{display:inline-block;border:5px solid #1E1B35;border-radius:999px;box-shadow:6px 6px 0 #1E1B35;font:700 34px/1 'IBM Plex Mono',monospace;padding:14px 24px 16px;white-space:nowrap}
.pop{transform-origin:50% 50%}
.say{position:absolute;background:#fff;border:6px solid #1E1B35;border-radius:30px;box-shadow:7px 7px 0 #1E1B35;font:800 52px/1 'Bricolage Grotesque',sans-serif;letter-spacing:-.02em;padding:18px 28px 24px;white-space:nowrap;z-index:15}
/* the chat, the way a phone draws it */
.chat{position:absolute;left:70px;right:70px;top:90px;height:880px;border-radius:56px;background:#F2F2F7;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45);font-family:-apple-system,'SF Pro Text',system-ui,sans-serif}
.chat .top{height:150px;background:rgba(249,249,251,.96);border-bottom:1px solid rgba(0,0,0,.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.chat .av{width:66px;height:66px;border-radius:50%;background:linear-gradient(#B6B3C7,#8E8AA6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;font-weight:600}
.chat .nm{font-size:26px;font-weight:500;color:#111}
.chat .b{position:absolute;max-width:640px;padding:18px 26px;border-radius:34px;font-size:34px;line-height:1.3}
.chat .b.them{left:30px;background:#E5E5EA;color:#111}
.chat .b.me{right:30px;background:#3478F6;color:#fff}
.chat .field{position:absolute;left:24px;right:24px;bottom:28px;min-height:96px;border:2px solid #C7C7CC;border-radius:48px;background:#fff;padding:22px 30px;font-size:36px;line-height:1.3;color:#111}
.caret{display:inline-block;width:4px;height:1.05em;background:#3478F6;vertical-align:-.15em;margin-left:3px}
.del{position:absolute;left:50%;transform:translateX(-50%);background:#FF4D4D;color:#fff;border:6px solid #1E1B35;border-radius:999px;box-shadow:7px 7px 0 #1E1B35;font:800 46px/1 'Bricolage Grotesque',sans-serif;padding:18px 36px 22px;white-space:nowrap;z-index:12}
.burst{position:absolute;z-index:18}
.half{position:absolute;left:0;right:0;height:50%}
"""

def caption(text, hl=None, light=False):
    ws = text.split()
    out = "".join(f'<span class="w{" hl" if i == hl else ""}" data-n="{i}">{html.escape(w)}</span>' for i, w in enumerate(ws))
    return f'<div class="cap{" light" if light else ""}">{out}</div>'

def draft_card(id_="field", text=DRAFT, extra=""):
    return f'<div class="field" id="{id_}" style="{extra}"><span>{html.escape(text)}</span><span class="caret" data-blink="1"></span></div>'

def chat(field):
    return ('<div class="chat"><div class="top"><div class="av">J</div><div class="nm">him 🫠 ›</div></div>'
            '<div class="b them" style="top:200px">ok goodnight</div>'
            '<div class="b them" style="top:290px">see u around i guess</div>'
            '<div style="position:absolute;left:0;right:0;top:390px;text-align:center;font-size:22px;color:#8E8E93">Read 11:52 PM</div>'
            + field + '</div>')

BODY = {}
BODY["draft"] = ('<div style="position:absolute;inset:0;background:#15131F"></div>'
                 '<div class="mono" style="position:absolute;left:0;right:0;top:34px;text-align:center;color:rgba(255,255,255,.55)">2:14 am</div>'
                 + chat(draft_card())
                 + '<div class="del pop" data-at="-1" data-r="2" style="top:700px">delete draft?</div>'
                 + '<div id="finger" style="position:absolute;left:900px;top:1250px;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:rgba(255,255,255,.55);border:6px solid #1E1B35;z-index:13"></div>'
                 + caption("everyone has one of these.", hl=None, light=True))
BODY["yoink"] = ('<div style="position:absolute;inset:0;background:#FFD84A"></div><div class="dots" style="position:absolute;inset:0"></div>'
                 + chat('')
                 + f'<div id="grab" style="position:absolute;left:94px;top:846px;width:892px;z-index:14">{draft_card("field2", extra="position:relative;left:0;right:0;bottom:0;transform-origin:20% 50%")}</div>'
                 + f'<div id="yb" style="position:absolute;left:1200px;top:600px;z-index:16">{bird("wren-sticker-adult-wink", 360)}</div>'
                 + '<div class="burst pop" data-at="0.42" data-r="-10" style="left:70px;top:150px"><svg width="420" height="420" viewBox="0 0 130 130"><path d="M65 4l11 26 27-12-10 27 29 6-25 16 18 23-29-3 2 29-23-18-23 18 2-29-29 3 18-23-25-16 29-6-10-27 27 12z" fill="#FFD84A" stroke="#1E1B35" stroke-width="4" stroke-linejoin="round"/><text x="65" y="74" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="22" fill="#1E1B35">YOINK!</text></svg></div>'
                 + '<div class="say pop" data-at="0.75" data-r="-3" style="left:560px;top:420px">nope.</div>'
                 + caption("that one's getting delivered.", hl=3))
def half(top, height, label, bg, typed_id):
    return (f'<div style="position:absolute;left:0;right:0;top:{top}px;height:{height}px;background:{bg}"><div class="mono" style="position:absolute;left:64px;top:44px">{label}</div>'
            f'<div class="card" style="left:64px;right:64px;top:96px;padding:28px 34px 34px"><div class="letter" style="font-size:44px"><span id="{typed_id}"></span><span class="caret" style="background:#5757EC"></span></div></div></div>')
TAGS_TOP = [(64, 330, -3), (370, 370, 2), (660, 330, -2)]
TAGS_BOT = [(64, 1180, 2), (370, 1220, -3), (660, 1180, 3)]
BODY["rhythm"] = (half(0, 560, "you · 2:14 am", "#BDB5FF", "tA") + half(790, 560, "a stranger · somewhere else", "#8FEBC0", "tB")
                  + '<div style="position:absolute;left:0;right:0;top:560px;height:230px;background:#1E1B35;z-index:4"></div>'
                  + "".join(f'<div class="pop" data-at="{1.5 + i * 0.32:.2f}" data-r="{TAGS_TOP[i][2]}" style="position:absolute;left:{TAGS_TOP[i][0]}px;top:{TAGS_TOP[i][1]}px;z-index:9"><span class="tag" style="background:{c}">{html.escape(p)}</span></div>'
                            f'<div class="pop" data-at="{1.6 + i * 0.32:.2f}" data-r="{TAGS_BOT[i][2]}" style="position:absolute;left:{TAGS_BOT[i][0]}px;top:{TAGS_BOT[i][1]}px;z-index:9"><span class="tag" style="background:{c}">{html.escape(p)}</span></div>' for i, (p, c) in enumerate(PAIRS))
                  + f'<div id="rb" style="position:absolute;left:-300px;top:470px;z-index:16">{bird("wren-sticker-fly", 220)}</div>')
BODY["rhythm_cap"] = caption("she finds someone who types like you.", hl=4, light=True)
BODY["reply"] = ('<div style="position:absolute;inset:0;background:#FF9ACB"></div><div class="dots" style="position:absolute;inset:0"></div>'
                 + f'<div class="card pop" data-at="0.3" data-r="2" style="left:70px;right:70px;top:240px;padding:44px 50px 54px"><div class="mono" style="display:flex;align-items:center;gap:16px;margin-bottom:24px">{B.mosaic("no-4207", 9, gap=3)}<span>from No. 4207</span></div>'
                 f'<div class="letter">{html.escape(REPLY)}</div></div>'
                 + f'<div style="position:absolute;left:700px;top:80px;z-index:16" data-idle="bob">{bird("wren-sticker-adult-delight", 280)}</div>'
                 + caption("and they write back.", hl=3))
BODY["names"] = ('<div style="position:absolute;inset:0;background:#BDB5FF"></div><div class="dots" style="position:absolute;inset:0"></div>'
                 + '<div class="card" style="left:290px;top:170px;width:500px;height:500px;border-radius:50%;display:flex;align-items:center;justify-content:center"><div id="face"></div></div>'
                 + '<div id="count" class="mono" style="position:absolute;left:0;right:0;top:720px;text-align:center;font-size:34px">letter 1 / 5</div>'
                 + '<div class="pop" data-at="1.3" data-r="-4" style="position:absolute;left:0;right:0;top:790px;text-align:center"><span class="tag" style="background:#FF9ACB;font:800 92px/1 \'Bricolage Grotesque\',sans-serif;letter-spacing:-.02em;padding:18px 56px 28px">mara</span></div>'
                 + caption("5 letters each. then names.", hl=4))
BODY["end"] = ('<div style="position:absolute;inset:0;background:#5757EC"></div>'
               '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;color:#fff;padding:0 60px">'
               f'<div data-idle="bob">{bird("wren-sticker-adult-happy", 320, "filter:drop-shadow(10px 12px 0 rgba(0,0,0,.35))")}</div>'
               '<div style="font:800 150px/1 \'Bricolage Grotesque\',sans-serif;letter-spacing:-.045em">kindredly</div>'
               '<div style="font:800 58px/1.08 \'Bricolage Grotesque\',sans-serif;letter-spacing:-.03em;text-align:center">anonymous pen pals,<br>matched by how you write.</div>'
               '<div class="pop" data-at="0.6" data-r="-2" style="margin-top:20px"><span class="tag" style="background:#FFD84A;color:#1E1B35;font:800 46px/1 \'Bricolage Grotesque\',sans-serif;padding:20px 40px 26px">get kindredly ✦</span></div>'
               '<div style="font:600 32px/1 \'IBM Plex Mono\',monospace;opacity:.8">free on iPhone &amp; web · kindredly.io</div></div>')

JS = r"""
const BEATS = __BEATS__, DRAFT = __DRAFT__, STRANGER = __STRANGER__;
const T = BEATS[BEATS.length - 1][2];
const clamp = (x) => Math.max(0, Math.min(1, x));
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const outBack = (x, s = 2.4) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
function face(develop) {
  let s = 4207; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const on = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (rnd() < 0.55) { on.push([r, c]); if (c < 2) on.push([r, 4 - c]); }
  const order = on.map((p) => [rnd(), p]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const k = Math.ceil(order.length * develop), cell = 58, gap = 14, sz = 5 * cell + 4 * gap;
  let out = `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">`;
  order.forEach(([r, c], i) => (out += `<rect x="${c * (cell + gap)}" y="${r * (cell + gap)}" width="${cell}" height="${cell}" rx="5" fill="#1E1B35" opacity="${i < k ? 1 : 0.07}"/>`));
  return out + "</svg>";
}
let lastDev = -1;
window.render = (t) => {
  let i = 0; while (i < BEATS.length - 1 && t >= BEATS[i + 1][1]) i++;
  const [id, a] = BEATS[i], lt = t - a;
  document.querySelectorAll(".beat").forEach((b) => (b.style.display = b.dataset.b === id ? "block" : "none"));
  const els = document.querySelectorAll(`.beat[data-b="${id}"]`);
  // shake on the yoink and on the name
  const sh = (id === "yoink" && lt > 0.42 && lt < 0.72) || (id === "names" && lt > 1.3 && lt < 1.55) ? Math.sin(lt * 90) * 12 * (1 - clamp((lt % 1) * 2)) : 0;
  document.getElementById("world").style.transform = `translate(${sh}px, ${sh * 0.4}px) rotate(${sh * 0.05}deg)`;
  els.forEach((el) => {
    const ws = el.querySelectorAll(".cap .w"), d0 = id === "draft" ? -9 : id === "rhythm" ? 0.35 : 0.2;
    ws.forEach((w) => { const p = clamp((lt - (d0 + +w.dataset.n * 0.075)) / 0.42); w.style.opacity = p > 0 ? 1 : 0; w.style.transform = `translateY(${(1 - outCubic(p)) * 40}px) scale(${p > 0 ? 1.5 - 0.5 * outBack(p, 1.8) : 1.5}) rotate(${(1 - p) * -7}deg)`; });
    el.querySelectorAll(".pop").forEach((p) => { const q = clamp((lt - +p.dataset.at) / 0.4); p.style.opacity = q > 0 ? 1 : 0; const base = p.classList.contains("del") ? "translateX(-50%) " : ""; p.style.transform = `${base}rotate(${p.dataset.r || 0}deg) scale(${q > 0 ? Math.max(0, outBack(q, 2.6)) : 0})`; });
    el.querySelectorAll("[data-blink]").forEach((c) => (c.style.opacity = Math.floor(t * 2.2) % 2 ? 0 : 1));
  });
  document.querySelectorAll('[data-idle="bob"]').forEach((w) => (w.style.transform = `translateY(${Math.sin(t * 3) * 12}px) rotate(${Math.sin(t * 2) * 3}deg)`));
  if (id === "draft") {
    const d = document.querySelector('.beat[data-b="draft"] .del'); const pulse = 1 + 0.07 * Math.max(0, Math.sin(lt * 9));
    d.style.transform = `translateX(-50%) rotate(2deg) scale(${pulse})`;
    // a thumb drifts to "delete draft?" and is about to press it
    const f = document.getElementById("finger"), p = outCubic(clamp((lt - 0.4) / 1.3)), press = lt > 1.95 ? 0.82 : 1;
    f.style.left = (900 - p * 340) + "px"; f.style.top = (1250 - p * 510) + "px"; f.style.opacity = clamp(lt / 0.3); f.style.transform = `scale(${press})`;
  }
  if (id === "yoink") {
    const b = document.getElementById("yb"), g = document.getElementById("grab");
    const inP = outCubic(clamp(lt / 0.42)), outP = clamp((lt - 1.15) / 0.6);
    const bx = 1200 - inP * 760 + outP * outP * 900, by = 600 + inP * 180 - outP * 520;
    b.style.left = bx + "px"; b.style.top = by + "px";
    if (lt > 0.42) { g.style.left = (94 + (bx - 440) * 0.9) + "px"; g.style.top = (846 + (by - 780)) + "px"; g.style.transform = `rotate(${-6 - outP * 14}deg) scale(${1 - outP * 0.35})`; }
    else { g.style.left = "94px"; g.style.top = "846px"; g.style.transform = "none"; }
  }
  if (id === "rhythm") {
    const nA = Math.floor(clamp(lt / 1.3) * DRAFT.length), nB = Math.floor(clamp((lt - 0.15) / 1.5) * STRANGER.length);
    document.getElementById("tA").textContent = DRAFT.slice(0, nA); document.getElementById("tB").textContent = STRANGER.slice(0, nB);
    const rb = document.getElementById("rb"), p = clamp((lt - 2.0) / 1.6);
    rb.style.left = (-300 + p * 1500) + "px"; rb.style.zIndex = 16; rb.style.top = (470 + Math.sin(p * Math.PI) * -50) + "px";
  }
  if (id === "names") {
    const n = Math.min(5, 1 + Math.floor(clamp(lt / 1.1) * 4.999));
    const dev = [0.18, 0.38, 0.58, 0.78, 1][n - 1];
    if (dev !== lastDev) { document.getElementById("face").innerHTML = face(dev); lastDev = dev; }
    document.getElementById("count").textContent = `letter ${n} / 5`;
  }
  return T;
};
const FACES = ['800 96px "Bricolage Grotesque"', '700 26px "IBM Plex Mono"', 'italic 500 50px "Fraunces"', '400 30px "Instrument Sans"'];
window.ready = Promise.all(FACES.map((f) => document.fonts.load(f))).then(() => document.fonts.ready)
  .then(() => { const miss = FACES.filter((f) => !document.fonts.check(f)); if (miss.length) throw new Error("fonts: " + miss); window.render(0); return T; });
"""

def events():
    a = {b[0]: b[1] for b in BEATS}
    ev = [{"t": 0.0, "type": "night"}] + [{"t": round(0.15 + i * 0.6, 3), "type": "tick"} for i in range(4)] + [{"t": 1.95, "type": "grab"}]
    ev += [{"t": a["yoink"], "type": "drop"}, {"t": a["yoink"] + 0.05, "type": "whoosh"}, {"t": a["yoink"] + 0.42, "type": "yoink"}, {"t": a["yoink"] + 0.75, "type": "say"}, {"t": a["yoink"] + 1.2, "type": "whoosh"}]
    ev += [{"t": round(a["yoink"] + 0.2 + i * 0.075, 3), "type": "slam"} for i in range(4)]
    ev += [{"t": a["rhythm"], "type": "cut"}] + [{"t": round(a["rhythm"] + i * 0.07, 3), "type": "key"} for i in range(22)]
    ev += [{"t": round(a["rhythm"] + 1.5 + i * 0.32, 3), "type": "pop"} for i in range(3)] + [{"t": round(a["rhythm"] + 1.6 + i * 0.32, 3), "type": "pop"} for i in range(3)]
    ev += [{"t": a["rhythm"] + 2.2, "type": "whoosh"}, {"t": a["rhythm"] + 2.75, "type": "ding"}]
    ev += [{"t": round(a["rhythm"] + 0.35 + i * 0.075, 3), "type": "slam"} for i in range(7)]
    ev += [{"t": a["reply"], "type": "cut"}, {"t": a["reply"] + 0.3, "type": "pop"}] + [{"t": round(a["reply"] + 0.2 + i * 0.075, 3), "type": "slam"} for i in range(4)]
    ev += [{"t": a["names"], "type": "cut"}] + [{"t": round(a["names"] + i * 0.275, 3), "type": "count", "k": i} for i in range(5)] + [{"t": a["names"] + 1.3, "type": "thwack"}]
    ev += [{"t": round(a["names"] + 0.2 + i * 0.075, 3), "type": "slam"} for i in range(5)]
    ev += [{"t": a["end"], "type": "end"}, {"t": a["end"] + 0.6, "type": "pop"}]
    return sorted(ev, key=lambda e: e["t"])

FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Instrument+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500;700&family=Fraunces:ital,opsz,wght@1,9..144,500&display=block"
beats = ""
for bid, _, _ in BEATS:
    beats += f'<div class="beat" data-b="{bid}">{BODY[bid]}</div>'
    if bid == "rhythm":
        beats += f'<div class="beat" data-b="rhythm" style="z-index:20">{BODY["rhythm_cap"].replace("class=\"cap light\"", "class=\"cap light\" style=\"bottom:auto;top:588px;font-size:72px;line-height:1.08\"")}</div>'
page = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><link href="{FONTS}" rel="stylesheet"><style>{CSS}</style></head>'
        f'<body>{B.SYMBOLS}<div id="world">{beats}</div><script>'
        + JS.replace("__BEATS__", json.dumps([list(b) for b in BEATS])).replace("__DRAFT__", json.dumps(DRAFT)).replace("__STRANGER__", json.dumps(STRANGER))
        + '</script></body></html>')
open(os.path.join(OUT, "hook.html"), "w", encoding="utf8").write(page)
json.dump(events(), open(os.path.join(OUT, "events.json"), "w"))
print("wrote", os.path.join(OUT, "hook.html"), f"{BEATS[-1][2]}s")
