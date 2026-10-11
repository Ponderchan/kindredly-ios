#!/usr/bin/env python3
"""The App Store set for 1.0.3 in the web landing's hand (owner, 2026-10-11:
"结合web landing page的视觉风格 … 重新做一套新的商店图").

Cream paper, Bricolage 800 in lowercase, one acid marker stripe per frame,
ink outlines with hard shadows, colour only in content (the courier, the
stamps, the faces). Inside each iPhone is a real capture from store mode
(design/store/shots/v2/<lang>/), worked over where it helps (owner: "基于你截图
iPhone框架里的内容 … 你可以通过手绘 自己加工 只要有iPhone框架就行").

  python3 design/store/landing/build.py en          one language
  python3 design/store/landing/build.py all         every language in COPY
  python3 design/store/landing/build.py en 03       one frame
Output: design/store/landing/out/<lang>/NN.png at 1320×2868 (6.9")."""
import os, re, subprocess, sys, json, html

HERE = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.dirname(HERE)
DESIGN = os.path.dirname(STORE)
SHOTS = os.path.join(STORE, "shots", "v2")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H = 1320, 2868
MIN_TOP = 900  # a phone that starts any higher would sit whole on the page; these bleed off the bottom

sys.path.insert(0, HERE)
from copy_store import COPY  # noqa: E402

def sheet(path):
    """an SVG symbol sheet, inlined once per page"""
    s = open(path, encoding="utf8").read()
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    return s.replace('<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">', '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute">', 1)

# no white keyline round the courier anywhere on the store set (owner,
# 2026-10-11: "商店图上所有的鸟wren 上不要白色的圈"): the sheet's body outline
# is a 10–10.5px white stroke; drop it here, not in the app's own drawing
WREN = re.sub(r'stroke="#FFFFFF" stroke-width="10(?:\.5)?"', 'stroke="none"', sheet(os.path.join(DESIGN, "wren-family.svg")))
SYMBOLS = WREN + sheet(os.path.join(DESIGN, "stamps-sticker.svg"))

FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Instrument+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500;600&family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500&display=block"

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
:root{--ground:#FFF6E6;--ink:#1E1B35;--cream:#FFF6E6;--paper:#FFFFFF;--muted:#55506E;--butter:#FFD84A;--pink:#FF9ACB;--lilac:#BDB5FF;--mint:#8FEBC0;--acid:#C3E84F;--orange:#FF9E5E;--bird:#5757EC;--pen:#3A34D6;--bw:8px;--sh:18px 18px 0 var(--ink)}
html,body{width:1320px;height:2868px;overflow:hidden}
body{position:relative;background:var(--cream);color:var(--ink);font-family:'Instrument Sans',var(--cjk-ui),system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body.paper{background:var(--paper);--ground:#FFFFFF}
body.night{background:var(--ink);color:#fff;--ground:#1E1B35}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(30,27,53,.16) 3.2px,transparent 3.8px);background-size:46px 46px;background-position:12px 12px}
.night .dots{background-image:radial-gradient(rgba(255,255,255,.10) 3.2px,transparent 3.8px)}
.head{position:absolute;left:96px;right:96px;top:150px;z-index:5}
.h{font-family:'Bricolage Grotesque',var(--cjk-dis),sans-serif;font-weight:800;letter-spacing:-.035em;line-height:.93;text-wrap:balance}
.lang-cjk .h{letter-spacing:-.01em;line-height:1.08;word-break:keep-all}
.mark{background:linear-gradient(transparent 60%,var(--acid) 60%,var(--acid) 94%,transparent 94%);-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:0 .05em;margin:0 -.05em}
.night .mark{background:none;color:var(--acid)}
.sub{margin-top:40px;font-size:46px;line-height:1.32;color:var(--muted);max-width:1060px;text-wrap:balance}
.night .sub{color:rgba(255,255,255,.72)}
.disc{width:124px;height:124px;border-radius:50%;border:var(--bw) solid var(--ink);box-shadow:8px 8px 0 var(--ink);display:flex;align-items:center;justify-content:center;font:800 70px/1 'Bricolage Grotesque',sans-serif;margin-bottom:46px}

/* the phone: an iPhone 17 Pro silhouette in ink, with a hard shadow */
.phone{position:absolute;width:988px;height:2092px;border-radius:172px;background:var(--ink);padding:24px;box-shadow:0 0 0 9px var(--ground),26px 26px 0 9px var(--ink);z-index:2}
.phone::before{content:"";position:absolute;inset:7px;border-radius:165px;border:3px solid rgba(255,255,255,.14);pointer-events:none}
.night .phone{background:#34315A;box-shadow:26px 26px 0 rgba(0,0,0,.35)}
.night .phone::before{border-color:rgba(255,255,255,.22)}
.night .btn{background:#34315A}
.phone .screen{position:relative;width:940px;height:2044px;border-radius:148px;overflow:hidden;background:#fff}
.phone .screen>img{position:absolute;left:0;top:0;width:940px;height:2044px;display:block}
.btn{position:absolute;width:14px;background:var(--ink);border-radius:6px}
.btn.l{left:-12px}.btn.r{right:-12px}

.card{position:absolute;background:var(--paper);border:var(--bw) solid var(--ink);border-radius:40px;box-shadow:var(--sh);z-index:6}
.night .card{box-shadow:18px 18px 0 rgba(0,0,0,.35)}
.night .bubble{box-shadow:12px 12px 0 rgba(0,0,0,.35)}
.mono{font-family:'IBM Plex Mono',var(--cjk-ui),ui-monospace,monospace;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.letter{font-family:'Fraunces',var(--cjk-let),Georgia,serif;font-style:italic;font-weight:500}
.chip{display:inline-block;border:6px solid var(--ink);border-radius:999px;box-shadow:7px 7px 0 var(--ink);font:600 40px/1 'IBM Plex Mono',var(--cjk-ui),monospace;padding:20px 32px 22px;white-space:nowrap}
.bubble{position:absolute;background:#fff;color:var(--ink);border:var(--bw) solid var(--ink);border-radius:48px;box-shadow:12px 12px 0 var(--ink);font:800 58px/1 'Bricolage Grotesque',var(--cjk-dis),sans-serif;letter-spacing:-.02em;padding:30px 44px 36px;z-index:7;white-space:nowrap}
.bubble::after{content:"";position:absolute;width:44px;height:44px;background:#fff;border-right:var(--bw) solid var(--ink);border-bottom:var(--bw) solid var(--ink);bottom:-27px;left:var(--tail,90px);right:var(--tailr,auto);transform:rotate(45deg)}
.sym{display:block}
.z9{z-index:9}
.stage{z-index:2}
"""

CJK = {
    "ja": "--cjk-dis:'Hiragino Sans';--cjk-ui:'Hiragino Sans';--cjk-let:'Hiragino Mincho ProN'",
    "ko": "--cjk-dis:'Apple SD Gothic Neo';--cjk-ui:'Apple SD Gothic Neo';--cjk-let:'AppleMyungjo'",
}
LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"]

def use(sym, size, extra=""):
    return f'<svg class="sym" width="{size}" height="{size}" viewBox="0 0 200 200" style="{extra}"><use href="#{sym}"/></svg>'

def stamp(sid, size, extra=""):
    return f'<svg class="sym" width="{size}" height="{size}" viewBox="0 0 64 64" style="{extra}"><use href="#stamp-{sid}"/></svg>'

def shot(lang, name):
    p = os.path.join(SHOTS, lang, name + ".png")
    if not os.path.exists(p):
        p = os.path.join(SHOTS, "en", name + ".png")
    return "file://" + p

def phone(lang, name, x, y, inner="", k=1.0):
    """an iPhone at (x, y), scaled by k from its top-left; `inner` draws over
    the capture, in screen pixels (940 wide)"""
    btns = ('<i class="btn l" style="top:330px;height:96px"></i><i class="btn l" style="top:480px;height:170px"></i>'
            '<i class="btn l" style="top:680px;height:170px"></i><i class="btn r" style="top:520px;height:260px"></i>'
            '<i class="btn r" style="top:1040px;height:150px"></i>')
    tf = f"transform:scale({k});transform-origin:0 0;" if k != 1 else ""
    return f'<div class="phone" style="left:{x}px;top:{y}px;{tf}">{btns}<div class="screen"><img src="{shot(lang, name)}">{inner}</div></div>'

def mark(text, phrase):
    """the one marked phrase: a marker stripe under its lower third. "\n" in
    the copy is a chosen line break (headlines break where they're said)"""
    ARROW = ('<svg viewBox="0 0 100 60" style="width:.9em;height:.56em;vertical-align:.04em;overflow:visible" fill="none" stroke="currentColor" '
             'stroke-width="15" stroke-linecap="round" stroke-linejoin="round"><path d="M8 30H86M60 6l26 24-26 24"/></svg>')
    esc = lambda t: html.escape(t).replace("\n", "<br>").replace("→", ARROW)
    if not phrase or phrase not in text.replace("\n", " "):
        return esc(text)
    flat = text
    i = flat.replace("\n", " ").index(phrase)
    a, m, b = flat[:i], flat[i:i + len(phrase)], flat[i + len(phrase):]
    return f'{esc(a)}<span class="mark">{esc(m)}</span>{esc(b)}'

def head(c, size, disc=None, sub_size=None, width=None):
    d = f'<div class="disc" style="background:var(--{disc[1]})">{disc[0]}</div>' if disc else ""
    sub = f'<div class="sub" style="{f"font-size:{sub_size}px;" if sub_size else ""}">{html.escape(c["sub"]).replace(chr(10), "<br>")}</div>' if c.get("sub") else ""
    w = f"right:auto;width:{width}px;" if width else ""
    return f'<div class="head" style="{w}">{d}<div class="h" style="font-size:{size}px">{mark(c["h"], c.get("mark"))}</div>{sub}</div>'

def mosaic(seed, cell, cells=5, on="#1E1B35", gap=None):
    import random
    r = random.Random(seed); g = gap if gap is not None else max(2, cell // 6); out = []
    for y in range(cells):
        for x in range(cells):
            if r.random() < 0.5:
                out.append(f'<rect x="{x*(cell+g)}" y="{y*(cell+g)}" width="{cell}" height="{cell}" fill="{on}"/>')
    w = cells * (cell + g) - g
    return f'<svg width="{w}" height="{w}" viewBox="0 0 {w} {w}" style="display:block">{"".join(out)}</svg>'

# ── the frames ──────────────────────────────────────────────────────────────
# Each frame returns (ground, headline, stage, gap). The stage holds the phone
# and what comes out of it, in coordinates whose y=0 is the phone's top edge;
# the page sets the stage `gap` px under wherever the headline ends, so a
# longer headline in another language pushes the phone down instead of into it.

def at(x, y, inner, rot=0, z=8, extra=""):
    return f'<div style="position:absolute;left:{x}px;top:{y}px;z-index:{z};transform:rotate({rot}deg);{extra}">{inner}</div>'

def crop(lang, name, x, y, w, h, k, extra=""):
    """a piece of a capture (in its own 1206-wide pixels), enlarged k times"""
    return (f'<div style="width:{w*k:.0f}px;height:{h*k:.0f}px;overflow:hidden;position:relative;{extra}">'
            f'<img src="{shot(lang, name)}" style="position:absolute;left:{-x*k:.0f}px;top:{-y*k:.0f}px;width:{1206*k:.0f}px;height:{2622*k:.0f}px"></div>')

S = 940 / 1206  # capture px → screen px

def patch(lang, name, x, y, w, h, sx, sy):
    """over the screen (screen px): show the capture's (sx, sy) there instead"""
    return (f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;overflow:hidden">'
            f'<img src="{shot(lang, name)}" style="position:absolute;left:{-sx}px;top:{-sy}px;width:940px;height:2044px"></div>')

def lifted(lang, name, cx, cy, cw, ch, phone_x, pk=1.0, L=1.14, rot=-3, radius=44):
    """a piece of the screen lifted off it: drawn again over where it sits
    (cx, cy, cw, ch in capture px), L times its size in the phone, outlined,
    with the hard shadow. pk is the phone's own scale"""
    inph = S * pk                    # capture px → frame px, inside the phone
    k = inph * L
    x = phone_x + pk * 24 + cx * inph - cw * (k - inph) / 2
    y = pk * 24 + cy * inph - ch * (k - inph) / 2
    return f'<div class="card" style="left:{x:.0f}px;top:{y:.0f}px;padding:0;overflow:hidden;border-radius:{radius}px;transform:rotate({rot}deg)">{crop(lang, name, cx, cy, cw, ch, k)}</div>'

import appstrings as A  # noqa: E402

STAMP_SH = "filter:drop-shadow(12px 12px 0 #1E1B35)"
BIRD_SH = "filter:drop-shadow(12px 14px 0 rgba(30,27,53,.92))"
TRAY = "rgb(243,242,250)"

def white(x, y, w, h, bg="#fff", r=0):
    """cover part of a capture (screen px) with its own ground colour"""
    return f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:{bg};border-radius:{r}px"></div>'

def say_over(x, y, w, h, bg, text, font, color, align="left"):
    """cover a bit of a capture and set the app's own words there again (screen px)"""
    j = {"left": "flex-start", "right": "flex-end", "center": "center"}[align]
    return (f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:{bg};display:flex;align-items:center;justify-content:{j};'
            f'font:{font};color:{color};white-space:nowrap">{html.escape(text)}</div>')

def f01(lang, c):
    """come for a penpal. stay for a kindred spirit. — the desk at 2am, the one
    dark room (DESIGN.md: the dark room is the desk), and her with a delivery"""
    p = c["pop"]
    # the sub stops short of where she flies in (x 930), in every language
    return "night", head(c, c.get("size", 140), sub_size=46).replace('<div class="sub" style="', '<div class="sub" style="max-width:800px;'), \
        phone(lang, "today", 166, 0) + \
        f'<div class="bubble" style="right:440px;top:-150px;transform:rotate(-3deg);--tail:auto;--tailr:56px">{html.escape(p["bubble"])}</div>' + \
        at(930, -300, use("wren-sticker-fly", 380, "filter:drop-shadow(12px 14px 0 rgba(0,0,0,.35))"), 6), 190

def ghost_card(p, x, y, w, rot):
    """the landing's struck-out dating profile: grey words, an ink strike"""
    strike = "text-decoration:line-through;text-decoration-color:var(--ink);"
    return (f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px;padding:32px;border:6px dashed rgba(30,27,53,.55);box-shadow:none;transform:rotate({rot}deg);background:#FBF7EE">'
            f'<div class="mono" style="font-size:25px;color:#8A8799;margin-bottom:20px">{html.escape(p["ghostKick"])}</div>'
            f'<div style="height:{int(w*0.5)}px;border-radius:22px;background:#E9E6F7;position:relative;overflow:hidden"><div style="position:absolute;left:50%;top:18%;width:22%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;background:#C4BEEA"></div><div style="position:absolute;left:50%;top:58%;width:46%;height:60%;transform:translateX(-50%);border-radius:999px 999px 0 0;background:#C4BEEA"></div></div>'
            f'<div style="font:800 50px/1.1 \'Bricolage Grotesque\',var(--cjk-dis),sans-serif;margin-top:22px;color:#8A8799;{strike}text-decoration-thickness:8px">{html.escape(p["ghostName"])}</div>'
            f'<div style="font-size:28px;color:#8A8799;margin-top:8px;{strike}text-decoration-thickness:3px">{html.escape(p["ghostMeta"])}</div></div>')

def letter_card(lang, p, x, y, w, rot):
    """a letter as the landing draws one: number, mosaic, stamp, Fraunces italic"""
    return (f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px;padding:42px 46px 46px;transform:rotate({rot}deg)">'
            f'<div style="display:flex;align-items:center;gap:20px;margin-bottom:24px">{mosaic("no4290", 12)}<span class="mono" style="font-size:28px">No. 4290</span>'
            f'<span style="margin-left:auto">{stamp("made-my-day", 96)}</span></div>'
            f'<div class="letter" style="font-size:44px;line-height:1.3">{html.escape(p["letter"])}</div>'
            f'<div style="margin-top:28px"><span class="chip" style="background:#2E7D4F;color:#fff;font-size:30px;padding:13px 22px 15px;box-shadow:6px 6px 0 var(--ink)">#{html.escape(A.stamp_name(lang, "made-my-day").lower())}</span></div>'
            '<div style="position:absolute;left:-46px;top:-50px;width:116px;height:116px;border-radius:50%;background:var(--pink);border:var(--bw) solid var(--ink);box-shadow:8px 8px 0 var(--ink);display:flex;align-items:center;justify-content:center;font:800 60px/1 sans-serif">✓</div></div>')

def f02(lang, c):
    """no pics, no bios, no swiping. — a profile struck out, a letter instead"""
    p = c["pop"]
    return "cream", head(c, c.get("size", 150), sub_size=46), \
        phone(lang, "kindreds", 410, 0, k=0.86, inner=white(40, 1280, 330, 44) + white(60, 1860, 280, 90)) + ghost_card(p, 48, -40, 390, -4) + letter_card(lang, p, 96, 1150, 700, -3), 150

STICKERS3 = [("st.lowercase_loyalist.name", "#FFD84A", -5), ("st.ellipsis_keeper.name", "#BDB5FF", 4), ("st.laugh_tracker.name", "#8FEBC0", -3),
             ("st.semicolon_enjoyer.name", "#FF9ACB", 5), ("st.plot_twister.name", "#FF9E5E", -4), ("st.question_asker.name", "#FFFFFF", 3)]
def f03(lang, c):
    """what's your writing aura? — the aura, and a sheet of the stickers it gives"""
    p = c["pop"]
    pills = "".join(f'<span class="chip" style="background:{bg};color:var(--ink);font-family:\'Instrument Sans\',var(--cjk-ui),sans-serif;font-weight:600;font-size:46px;transform:rotate({r}deg);box-shadow:5px 5px 0 var(--ink)">{html.escape(A.t(lang, k))}</span>' for k, bg, r in STICKERS3)
    sheet_ = (f'<div class="card" style="left:70px;top:1330px;width:1180px;padding:40px 44px 46px">'
              f'<div class="mono" style="font-size:28px;color:var(--muted);margin-bottom:28px">{html.escape(p["kick"])}</div>'
              f'<div style="display:flex;flex-wrap:wrap;gap:26px 22px">{pills}</div></div>')
    return "cream", head(c, c.get("size", 150), sub_size=46), phone(lang, "aura", 166, 0, inner=white(38, 1250, 866, 110)) + sheet_, 150

def f04(lang, c):
    """step 1 · write one honest thing — the composer with its stamp tray; the
    tray's repeats folded away, stamps spilling off both edges"""
    fix = (white(701, 764, 14, 90)                       # the caret
           + white(787, 1600, 135, 152, TRAY)            # HOT TAKE, twice in the tray
           + white(20, 1762, 160, 160, TRAY))            # a lone CAN'T SLEEP on a third row
    spill = [("never-told", -9, -70, 260), ("crush", 8, 1110, 120), ("almost-texted", 6, -110, 1240), ("homesick", -7, 1100, 1080)]
    out = "".join(at(x, y, stamp(sid, 300), r, extra=STAMP_SH) for sid, r, x, y in spill)
    return "cream", '<div class="dots"></div>' + head(c, c.get("size", 150), disc=("1", "butter"), sub_size=46), \
        phone(lang, "compose-stamps", 166, 0, inner=fix) + out, 150

def envelope_row(n, size=34):
    one = (f'<svg width="{size}" height="{int(size*0.72)}" viewBox="0 0 34 24"><rect x="1.5" y="1.5" width="31" height="21" rx="3" fill="#3A34D6"/>'
           '<path d="M3 4l14 10 14-10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg>')
    return "".join(one for _ in range(n))

def activity_card(lang, p, w):
    """her Live Activity as the lock screen shows it, drawn in the app's own words"""
    moon = '<svg width="54" height="54" viewBox="0 0 24 24"><path d="M15 3a9 9 0 1 0 6 13A7.5 7.5 0 0 1 15 3z" fill="#E8B04A"/></svg>'
    return (f'<div style="width:{w}px;padding:40px 46px 44px 40px;display:flex;gap:30px;align-items:center;background:#fff;border-radius:64px;position:relative">'
            f'<div style="flex:none">{use("wren-sticker-fly", 190)}</div>'
            f'<div style="flex:1;min-width:0"><div class="mono" style="font-size:27px;color:#6E6A88;letter-spacing:.1em">{html.escape(A.t(lang, "la.out.eyebrow", name=p["name"]))}</div>'
            f'<div class="letter" style="font-style:normal;font-size:62px;line-height:1.1;margin:14px 0 16px;color:var(--ink)">{html.escape(A.t(lang, "la.out.readsN", n=7))}</div>'
            f'<div style="display:flex;gap:10px;margin-bottom:18px">{envelope_row(7)}</div>'
            f'<div style="font:500 28px/1.3 \'IBM Plex Mono\',monospace;color:#6E6A88">{html.escape(A.t(lang, "la.out.looking"))}</div></div>'
            f'<div style="position:absolute;right:34px;top:30px">{moon}</div></div>')

def f05(lang, c):
    """step 2 · she carries it — a lock screen drawn flat in the step's pink (no
    stock wallpaper, no simulator carrier), her activity lifted off it"""
    p = c["pop"]
    island = '<div style="position:absolute;left:325px;top:33px;width:290px;height:84px;border-radius:42px;background:#000"></div>'
    bars = ('<svg style="position:absolute;right:62px;top:56px" width="150" height="40" viewBox="0 0 150 40" fill="#1E1B35">'
            '<rect x="0" y="24" width="9" height="13" rx="2"/><rect x="14" y="17" width="9" height="20" rx="2"/><rect x="28" y="10" width="9" height="27" rx="2"/><rect x="42" y="3" width="9" height="34" rx="2"/>'
            '<rect x="88" y="6" width="56" height="28" rx="8" fill="none" stroke="#1E1B35" stroke-width="3"/><rect x="93" y="11" width="46" height="18" rx="4"/></svg>')
    face = (f'<div style="position:absolute;inset:0;background:var(--pink)"></div>{island}{bars}'
            f'<div style="position:absolute;left:0;right:0;top:250px;text-align:center;font:600 54px/1 -apple-system,\'SF Pro Display\',system-ui;color:var(--ink)" data-date="{lang}"></div>'
            f'<div style="position:absolute;left:0;right:0;top:300px;text-align:center;font:700 330px/1 -apple-system,\'SF Pro Rounded\',\'SF Pro Display\',system-ui;letter-spacing:-.02em;color:var(--ink)">9:41</div>'
            + at(250, 810, use("wren-sticker-fly", 440, "filter:drop-shadow(16px 18px 0 rgba(30,27,53,.92))"), -8))
    card = f'<div class="card" style="left:60px;top:1330px;padding:0;border-radius:72px;transform:rotate(-3deg);overflow:hidden">{activity_card(lang, p, 1150)}</div>'
    return "cream", '<div class="dots"></div>' + head(c, c.get("size", 140), disc=("2", "pink"), sub_size=46), \
        phone(lang, "lock", 166, 0, inner=face) + card, 150

def eachway_card(lang, p, x, y, rot):
    """five letters each way, then the two names: the landing's step 3 payoff"""
    cell = 64; g = 16
    row = lambda color: "".join(f'<i style="display:block;width:{cell}px;height:{cell}px;background:{color}"></i>' for _ in range(5))
    return (f'<div class="card" style="left:{x}px;top:{y}px;padding:44px 48px 48px;transform:rotate({rot}deg)">'
            f'<div style="display:grid;grid-template-columns:120px auto;row-gap:22px;column-gap:26px;align-items:center">'
            f'<div style="justify-self:center">{mosaic("no1690", 14, gap=4)}</div><div style="display:flex;gap:{g}px">{row("#3A34D6")}</div>'
            f'<div class="mono" style="font-size:32px;justify-self:center">{html.escape(A.t(lang, "ui.you"))}</div><div style="display:flex;gap:{g}px">{row("#1E1B35")}</div></div>'
            f'<div style="margin-top:34px;background:var(--mint);border:6px solid var(--ink);border-radius:30px;padding:24px 30px;display:flex;align-items:center;gap:26px">'
            f'<div style="width:118px;height:118px;border-radius:50%;background:#fff;border:5px solid var(--ink);display:flex;align-items:center;justify-content:center">{mosaic("no1690", 12, gap=3)}</div>'
            f'<span class="chip" style="background:var(--pink);font-family:\'Bricolage Grotesque\',var(--cjk-dis),sans-serif;font-weight:800;font-size:52px;letter-spacing:-.02em;padding:14px 34px 18px">{html.escape(p["name"])}</span>'
            f'<span class="mono" style="font-size:28px;margin-left:auto">{html.escape(A.t(lang, "mk.ofFive", n=5))}</span></div></div>')

def f06(lang, c):
    """step 3 · five each way → names — their letter that encloses a name"""
    return "cream", '<div class="dots"></div>' + head(c, c.get("size", 140), disc=("3", "mint"), sub_size=46), \
        phone(lang, "thread", 166, 0, inner=white(30, 905, 880, 82)
              + say_over(236, 188, 468, 30, "#fff", A.t("en", "th.inThreadMany", n=11), "400 23.5px/1 'IBM Plex Mono',monospace;letter-spacing:.12em", "rgb(112,112,113)", "center")) + eachway_card(lang, c["pop"], 80, 980, -3), 150

def f07(lang, c):
    """then you get your own room — the room, Pip's note lifted, straight"""
    fix = white(420, 307, 100, 14) + white(0, 1830, 940, 214)  # half an OCT 8 under the header; the composer under the note
    return "cream", head(c, c.get("size", 150), sub_size=46), \
        phone(lang, "room", 166, 0, inner=fix) + lifted(lang, "room", 70, 1986, 1066, 326, 166, L=1.34, rot=0, radius=48), 150

COATS = [("sticker", None), ("moss", "wren.lock.kindred"), ("plush", "wren.lock.plus"), ("peach", "wren.lock.plus"), ("ink", "wren.lock.plus")]
def f08(lang, c):
    """hatch your own courier — her five coats first (the paid ones say so,
    App Store 2.3.2), then her page"""
    def coat(k, lock):
        tag = (f'<span class="mono" style="font-size:20px;letter-spacing:.06em;color:#7A5418;border:3px solid #7A5418;border-radius:999px;padding:6px 12px 7px;white-space:nowrap">{html.escape(A.t(lang, lock))}</span>'
               if lock else '<span style="height:41px"></span>')
        return (f'<div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:206px">{use(f"wren-{k}-adult-content", 170)}'
                f'<span class="mono" style="font-size:30px">{html.escape(A.t(lang, f"skin.{k}.name"))}</span>{tag}</div>')
    paid = f'<div style="width:100%;margin-top:22px;padding-top:20px;border-top:3px solid var(--ink);font:500 28px/1.3 \'Instrument Sans\',var(--cjk-ui),sans-serif;color:var(--muted);text-align:center">{html.escape(c["pop"]["paid"])}</div>'
    rail = f'<div class="card" style="left:56px;top:-210px;padding:30px 22px 24px;z-index:7;width:1110px"><div style="display:flex;gap:6px">{"".join(coat(k, l) for k, l in COATS)}</div>{paid}</div>'
    fix = (say_over(496, 1203, 168, 32, "#fff", "1 kindred", "600 30px/1 -apple-system,'SF Pro Text',system-ui", "#111113")
           + say_over(700, 1470, 190, 26, "rgb(236,236,254)", "OCT 3 · NOW", "400 20.5px/1 'IBM Plex Mono',monospace;letter-spacing:.12em", "rgb(148,148,160)", "right"))
    return "cream", head(c, c.get("size", 150), sub_size=46), phone(lang, "courier", 166, 260, inner=fix) + rail, 300

def menu_overlay(lang):
    """an iOS context menu over the list: the pen pal's row lifted, and the
    two actions the app offers on a pen pal's row,
    row's own actions (the app's words)"""
    icon = {
        "unread": '<path d="M3 7h18v12H3z M3 7l9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="20" cy="6" r="3.2" fill="currentColor"/>',
        "flag": '<path d="M5 21V4M5 4h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
        "hand": '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V5.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 7-6 7-2.5 0-4-1.5-5.5-4L4 13.5a1.4 1.4 0 0 1 2.3-1.6L8 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    }
    item = lambda label, ic, red=False, last=False: (
        f'<div style="display:flex;align-items:center;justify-content:space-between;padding:0 40px;height:118px;font:400 44px/1 -apple-system,system-ui;color:{"#E5484D" if red else "#111"};{"" if last else "border-bottom:1.5px solid rgba(0,0,0,.12)"}">'
        f'<span>{html.escape(label)}</span><svg width="48" height="48" viewBox="0 0 24 24" style="color:{"#E5484D" if red else "#111"}">{icon[ic]}</svg></div>')
    row = crop(lang, "kindreds", 0, 1093, 1206, 259, S * 0.95, "border-radius:40px;background:#fff")  # the No. 3828 row, divider to divider
    return (f'<div style="position:absolute;inset:0;background:rgba(30,27,53,.18);backdrop-filter:blur(14px)"></div>'
            f'<div style="position:absolute;left:23px;top:560px;border-radius:40px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.18)">{row}</div>'
            f'<div style="position:absolute;left:60px;top:800px;width:620px;background:rgba(255,255,255,.96);border-radius:36px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.18)">'
            + item(A.t(lang, "rp.menu.report"), "flag", True) + item(A.t(lang, "rp.menu.block"), "hand", True, True) + '</div>')

def safety_card(p, x, y, w):
    """the landing's safety card: a number, not a name — and four true rows"""
    rows = "".join(f'<div style="padding:26px 0;border-top:3px solid var(--ink);font:800 38px/1.2 \'Bricolage Grotesque\',var(--cjk-dis),sans-serif;letter-spacing:-.015em;text-wrap:balance">{html.escape(r)}</div>' for r in p["rows"])
    return (f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px;padding:36px 44px 14px">'
            f'<div style="background:var(--orange);border:6px solid var(--ink);border-radius:26px;padding:26px 28px;display:flex;align-items:center;gap:26px;margin-bottom:22px">'
            f'<span style="background:#fff;border:5px solid var(--ink);border-radius:18px;padding:12px 18px;display:flex;align-items:center;gap:14px;transform:rotate(-3deg);flex:none">{mosaic("no1968", 9, gap=3)}<span class="mono" style="font-size:30px">No. 1968</span></span>'
            f'<span style="font:800 36px/1.18 \'Bricolage Grotesque\',var(--cjk-dis),sans-serif;letter-spacing:-.015em">{html.escape(p["whoami"])}</span></div>{rows}</div>')

def f09(lang, c):
    """strangers, not sketchy. — the row's long-press menu, and the landing's safety card"""
    return "cream", head(c, c.get("size", 150), sub_size=46), \
        phone(lang, "kindreds", 166, 0, inner=menu_overlay(lang)) + safety_card(c["pop"], 56, 1270, 1090), 150

def f10(lang, c):
    """a journal that never leaves this phone — the sealed notes, the broken
    video tile redrawn as the sea it was"""
    # (the badge says the app's own words)
    sea = (f'<div style="position:absolute;left:500px;top:1370px;width:384px;height:288px;border-radius:18px;overflow:hidden;'
           f'background:linear-gradient(#F4C9A8 0%,#E9A39A 34%,#7FA8C9 35%,#4F7FA8 70%,#2F5A80 100%)">'
           f'<div style="position:absolute;left:0;right:0;top:96px;height:6px;background:rgba(255,255,255,.55)"></div>'
           f'<svg style="position:absolute;left:156px;top:108px" width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="36" fill="rgba(255,255,255,.88)"/><path d="M29 22l22 14-22 14z" fill="#1E1B35"/></svg>'
           f'<span style="position:absolute;right:12px;bottom:12px;background:#111;color:#fff;font:600 24px/1 \'IBM Plex Mono\',monospace;padding:8px 12px;border-radius:10px">0:15</span></div>')
    glyph = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1E1B35" stroke-width="2"><rect x="6.5" y="2" width="11" height="20" rx="2.5"/><path d="M10.5 18.5h3"/></svg>'
    badge = f'<div class="card" style="left:640px;top:-104px;padding:24px 34px 24px 26px;display:flex;align-items:center;gap:20px;border-radius:999px;z-index:7">{glyph}<span class="mono" style="font-size:34px">{html.escape(A.t(lang, "ga.phoneOnly"))}</span></div>'
    wave = say_over(806, 1036, 78, 62, "#fff", "0:42", "600 20px/1 'IBM Plex Mono',monospace", "rgb(112,112,113)", "right")
    return "cream", head(c, c.get("size", 140), sub_size=46), phone(lang, "journal", 166, 0, inner=sea + wave) + badge, 190

FRAMES = {"01": f01, "02": f02, "03": f03, "04": f04, "05": f05, "06": f06, "07": f07, "08": f08, "09": f09, "10": f10}

def render(lang, only=None):
    c_all = COPY[lang]
    out = os.path.join(HERE, "out", lang); os.makedirs(out, exist_ok=True)
    cjk = CJK.get(lang, "--cjk-dis:'Hiragino Sans';--cjk-ui:system-ui;--cjk-let:Georgia")
    for key, fn in FRAMES.items():
        if only and key != only:
            continue
        ground, top, stage, gap = fn(lang, c_all[key])
        max_lines = c_all[key]["h"].count("\n") + 1
        body = (top + f'<div class="stage" style="position:absolute;left:0;top:900px;width:{W}px;height:0">{stage}</div>'
                f'<script>document.querySelectorAll("[data-date]").forEach(e=>{{e.textContent=new Date(2026,9,11).toLocaleDateString(e.dataset.date,{{weekday:"long",month:"long",day:"numeric"}})}});'
                f'document.fonts.ready.then(()=>{{const hd=document.querySelector(".h");let fs=parseFloat(getComputedStyle(hd).fontSize);'
                f'const maxH=fs*{max_lines}*1.1;while((hd.scrollWidth>hd.clientWidth+2||hd.offsetHeight>maxH)&&fs>64){{fs-=3;hd.style.fontSize=fs+"px"}}'
                f'const h=document.querySelector(".head").getBoundingClientRect().bottom;'
                f'document.querySelector(".stage").style.top=Math.max(h+{gap},{MIN_TOP})+"px";document.title="ok"}})</script>')
        page = (f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><link href="{FONTS}" rel="stylesheet">'
                f'<style>{CSS}:root{{{cjk}}}</style></head>'
                f'<body class="{ground} {"lang-cjk" if lang in CJK else ""}">{SYMBOLS}{body}</body></html>')
        p = os.path.join(out, f"{key}.html"); open(p, "w", encoding="utf8").write(page)
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                        f"--window-size={W},{H}", "--virtual-time-budget=15000", "--allow-file-access-from-files",
                        f"--screenshot={out}/{key}.png", "file://" + p], check=True, capture_output=True)
        os.remove(p)
        print("rendered", lang, key)

if __name__ == "__main__":
    args = sys.argv[1:] or ["en"]
    langs = list(COPY) if args[0] == "all" else [args[0]]
    for l in langs:
        render(l, args[1] if len(args) > 1 else None)
