#!/usr/bin/env python3
"""App Store screenshots for Kindredly 1.2.1 — 6.9" (1320×2868), rendered by
headless Chrome. Six screens, nine languages. Every phone is an HTML replica
of the real screen (402×874 pt, zoomed), built with the app's own tokens; the
labels inside come from src/data/strings.ts through appdata, the stamps and
moods from their own tables, so nothing on the card is invented.

  python3 build2.py            → en
  python3 build2.py de         → one language
  python3 build2.py all        → all nine
"""
import os, random, subprocess, sys
S = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, S)
import appdata as A
from copy2 import COPY

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEFS = open(S + "/defs.svg.html", encoding="utf8").read()
INK = "#111113"; PEN = "#3B35E0"; WASH = "#ECECFE"; GREEN = "#2E7D4F"; PAPER = "#FFFFFF"; INK40 = "rgba(17,17,19,.4)"; INK60 = "rgba(17,17,19,.6)"; INK12 = "rgba(17,17,19,.12)"

HEAD = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1320px;height:2868px;overflow:hidden}
body{background:#F6F5FF;font-family:'Inter','Hiragino Sans','Apple SD Gothic Neo',system-ui,sans-serif;color:#111113;position:relative}
.bg{position:absolute;inset:0;background:
 radial-gradient(900px 700px at 15% 8%, rgba(59,53,224,.16), transparent 70%),
 radial-gradient(800px 600px at 90% 30%, rgba(242,136,126,.15), transparent 70%),
 radial-gradient(700px 700px at 60% 95%, rgba(140,196,162,.16), transparent 70%),
 linear-gradient(#F8F7FF,#EEEDFB)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(17,17,19,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(17,17,19,.045) 1px,transparent 1px);background-size:60px 60px;mask-image:linear-gradient(#000 40%,transparent 100%)}
.head{position:absolute;left:100px;right:100px;top:190px}
.h1{font-family:'Fraunces','Hiragino Mincho ProN','Apple SD Gothic Neo',serif;font-weight:600;font-size:112px;line-height:1.02;letter-spacing:-.02em;color:#111113;font-variation-settings:'opsz' 144}
.h1 em{font-style:normal;background:linear-gradient(transparent 62%, #C9F26B 62%)}
.sub{margin-top:34px;font-size:42px;line-height:1.32;color:rgba(17,17,19,.66);max-width:1040px;font-weight:500}
.phone{position:absolute;left:50%;width:990px;height:2150px;margin-left:-495px;top:880px;border-radius:150px;background:#0B0A14;padding:18px;box-shadow:0 60px 120px rgba(17,17,19,.28),0 10px 30px rgba(17,17,19,.2)}
.screen{width:100%;height:100%;border-radius:132px;overflow:hidden;background:#ECECFE;position:relative}
.island{position:absolute;left:50%;top:26px;width:290px;height:84px;margin-left:-145px;border-radius:60px;background:#000;z-index:5}
.app{position:absolute;left:0;top:0;width:402px;height:874px;zoom:2.373;background:#ECECFE;font-family:'Inter','Hiragino Sans','Apple SD Gothic Neo',system-ui,sans-serif;color:#111113;overflow:hidden}
.mono{font-family:'IBM Plex Mono','Hiragino Sans','Apple SD Gothic Neo',monospace}
.serif{font-family:'Newsreader','Hiragino Mincho ProN','Apple SD Gothic Neo',serif}
.fr{font-family:'Fraunces','Hiragino Mincho ProN','Apple SD Gothic Neo',serif}
.float{position:absolute;filter:drop-shadow(0 34px 44px rgba(17,17,19,.22))}
.sticker{display:inline-block;background:#fff;padding:7px;border-radius:999px;box-shadow:0 18px 40px rgba(17,17,19,.22)}
.sticker i{display:block;font-style:normal;font-weight:700;font-size:44px;padding:18px 40px;border-radius:999px;letter-spacing:-.01em}
.tab{position:absolute;left:0;right:0;bottom:0;height:84px;background:#fff;border-top:1px solid rgba(30,27,53,.08);display:flex;justify-content:space-around;align-items:flex-start;padding:16px 8px 0 8px}
.tab svg{display:block}
.plus{width:52px;height:52px;border-radius:26px;background:#3B35E0;display:flex;align-items:center;justify-content:center;margin-top:-10px}
.blob{position:absolute;border-radius:50%}
</style></head><body><div class="bg"></div><div class="grid"></div>
""" + DEFS

def bird(sym, size, extra=""):
    return f'<svg viewBox="0 0 200 200" width="{size}" height="{size}" {extra}><use href="#{sym}"/></svg>'

def mosaic(seed, cell=6, cells=5, on=INK, develop=1.0):
    r = random.Random(seed); out = []
    for y in range(cells):
        for x in range(cells):
            if r.random() < 0.5:
                o = 1 if r.random() < develop else 0.18
                out.append(f'<rect x="{x*(cell+1)}" y="{y*(cell+1)}" width="{cell}" height="{cell}" fill="{on}" opacity="{o}"/>')
    w = cells*(cell+1)-1
    return f'<svg viewBox="0 0 {w} {w}" width="{w}" height="{w}" style="display:block">{"".join(out)}</svg>'

def envelope(w, stamp=PEN, rot=0):
    h = int(w*0.66)
    return f'''<svg width="{w}" height="{h}" viewBox="0 0 120 80" style="transform:rotate({rot}deg)">
<rect x="1.5" y="1.5" width="117" height="77" fill="#fff" stroke="#111113" stroke-width="2.5"/>
<path d="M1.5 1.5 L60 44 L118.5 1.5" fill="none" stroke="#111113" stroke-width="2.5"/>
<rect x="90" y="9" width="20" height="18" fill="{stamp}"/></svg>'''

def chip(label, bg, fg, rot, x, y, size=44):
    return f'<div class="sticker" style="position:absolute;left:{x}px;top:{y}px;transform:rotate({rot}deg)"><i style="background:{bg};color:{fg};font-size:{size}px">{label}</i></div>'

def blob(x, y, d, color, rot=0):
    return f'<div class="blob" style="left:{x}px;top:{y}px;width:{d}px;height:{d}px;background:{color};box-shadow:inset 0 0 0 {int(d*0.07)}px rgba(255,255,255,.35);transform:rotate({rot}deg)"></div>'

ICONS = {
 "mail": '<path d="M3 6h18v12H3z M3 6l9 7 9-7" fill="none" stroke="{c}" stroke-width="1.8" stroke-linejoin="round"/>',
 "book": '<path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3z M8 3v18" fill="none" stroke="{c}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="14" cy="12" r="1.6" fill="{c}"/>',
 "chat": '<path d="M4 5h11v8H8l-4 3z M20 9v10l-3-2h-6v-3" fill="none" stroke="{c}" stroke-width="1.8" stroke-linejoin="round"/>',
 "me": '<circle cx="12" cy="8" r="4" fill="none" stroke="{c}" stroke-width="1.8"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6" fill="none" stroke="{c}" stroke-width="1.8"/>',
}
def tabbar(active):
    order = ["mail", "book", None, "chat", "me"]
    cells = []
    for i, k in enumerate(order):
        if k is None:
            cells.append('<div class="plus"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg></div>')
        else:
            c = PEN if (i == active or (i > 2 and i - 1 == active and False)) else INK
            c = PEN if i == active else INK
            cells.append(f'<svg width="30" height="30" viewBox="0 0 24 24">{ICONS[k].format(c=c)}</svg>')
    return f'<div class="tab">{"".join(cells)}</div>'

def phone(inner, rot=0, top=880):
    return f'<div class="phone" style="top:{top}px;transform:rotate({rot}deg)"><div class="screen"><div class="island"></div>{inner}</div></div>'

def pill(text, bg, fg, border=None, size=12.5, font="mono", weight=600):
    b = f"border:1.5px solid {border};" if border else ""
    return f'<span class="{font}" style="display:inline-block;background:{bg};color:{fg};{b}border-radius:999px;padding:4px 10px;font-size:{size}px;font-weight:{weight};letter-spacing:.2px">{text}</span>'

def stamp_chip(sid, lang):
    st = A.STAMP_BY_ID[sid]
    return f'<span class="mono" style="display:inline-block;background:{st["color"]};color:#fff;border:2px solid #111113;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;box-shadow:3px 3px 0 #111113">#{A.stamp_name(lang, sid).lower()}</span>'

def wren_official(size):
    badge = max(16, int(size*0.34))
    return f'''<span style="position:relative;display:inline-block;width:{size}px;height:{size}px"><span style="display:flex;width:{size}px;height:{size}px;border-radius:50%;background:#F3F2FA;border:1px solid {INK12};align-items:center;justify-content:center;overflow:hidden">{bird("wren-sticker-adult-content", int(size*0.66))}</span>
<span style="position:absolute;right:-1px;bottom:-1px;width:{badge}px;height:{badge}px;border-radius:50%;background:{PEN};border:2px solid #fff;display:flex;align-items:center;justify-content:center"><svg width="{int(badge*0.5)}" height="{int(badge*0.5)}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span></span>'''

def render(lang):
    T = COPY[lang]
    t = lambda k, **v: A.t(lang, k, **v)
    outdir = f"{S}/v121/{lang}"; os.makedirs(outdir, exist_ok=True)

    def page(h1, sub, phone_html, floats, out):
        cjk = lang in ("ja", "ko")
        n = len(h1)
        h1px = 112 if n <= 30 else 100 if n <= 38 else 88 if n <= 46 else 78
        if cjk: h1px = 88 if n <= 14 else 78 if n <= 20 else 68
        subpx = 42 if len(sub) <= 100 else 38 if len(sub) <= 130 else 35
        if cjk: subpx = 40 if len(sub) <= 48 else 36
        html = HEAD + f'<div class="head"><div class="h1" style="font-size:{h1px}px">{h1}</div><div class="sub" style="font-size:{subpx}px">{sub}</div></div>' + phone_html + "".join(floats) + "</body></html>"
        p = f"{outdir}/{out}.html"; open(p, "w", encoding="utf8").write(html)
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                        "--window-size=1320,2868", "--virtual-time-budget=14000", f"--screenshot={outdir}/{out}.png", "file://" + p],
                       check=True, capture_output=True)
        os.remove(p)
        print("rendered", lang, out)

    # ── S1 · Today ────────────────────────────────────────────────────────
    plane = f'<span style="display:inline-flex;width:54px;height:36px;border-radius:18px;background:{INK};align-items:center;justify-content:center"><svg width="19" height="19" viewBox="0 0 24 24" fill="#fff"><path d="M3.4 2.6a1 1 0 0 0-1.3 1.2l2.3 7.2a1 1 0 0 0 .8.7l8.3 1.3-8.3 1.3a1 1 0 0 0-.8.7l-2.3 7.2a1 1 0 0 0 1.3 1.2l18-8.4a1 1 0 0 0 0-1.8z"/></svg></span>'
    today = f'''<div class="app">
<div style="margin:0 18px;padding:62px 10px 10px 10px;border-bottom:3px solid {INK};display:flex;justify-content:space-between;align-items:baseline"><span class="mono" style="font-size:14px;letter-spacing:3px;font-weight:600">{t("ld.today")}</span></div>
<div style="margin:12px 18px 0 18px;background:#fff;border:2px solid {INK};border-radius:20px;box-shadow:6px 6px 0 {INK};padding:18px 18px 12px 18px;height:548px;position:relative;overflow:hidden">
<div style="display:flex;align-items:center;gap:10px">{mosaic("s1",4,5)}<span class="mono" style="font-size:10.5px;letter-spacing:1.4px;font-weight:600">SEP.19 · NO.4481</span><span style="flex:1"></span><span style="width:44px;height:44px;display:block;border:2px solid {INK};border-radius:8px;box-shadow:3px 3px 0 {INK};background:#fff;padding:2px">{A.stamp_svg("never-told",36)}</span><span style="width:26px;height:26px;border-radius:13px;border:2.2px solid {INK};display:flex;align-items:center;justify-content:center" class="mono">⋯</span></div>
<div class="serif" style="font-size:21px;line-height:32px;margin-top:22px;height:256px;overflow:hidden">{T["letter"]}</div>
<div style="position:absolute;left:0;right:0;top:262px;height:64px;background:linear-gradient(rgba(255,255,255,0),#fff)"></div>
<div class="mono" style="text-align:center;font-size:11px;letter-spacing:1.6px;color:{PEN};font-weight:600;margin-top:-6px">{t("ld.unfold")}</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px">{stamp_chip("never-told", lang)}<span style="display:inline-block;background:#C9F26B;border:2px solid {INK};border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:600;box-shadow:3px 3px 0 {INK}">◎ {t("ld.close")}</span></div>
<div style="height:2px;background:{INK};margin-top:18px"></div>
<div class="mono" style="display:flex;justify-content:space-between;font-size:11.5px;letter-spacing:.8px;font-weight:600;padding-top:12px"><span style="color:{INK40}">{t("ld.pass")}</span><span style="color:{PEN}">{t("ld.replyArrow")}</span></div></div>
<div style="margin:16px 18px 0 18px;background:#fff;border:2px solid {INK};border-radius:18px;box-shadow:5px 5px 0 {INK};padding:10px 8px 10px 14px;display:flex;align-items:flex-end;gap:10px"><span style="flex:1;font-size:16.5px;line-height:25px;color:{INK}">{T["writeBack"]}</span>{plane}</div>
<div class="mono" style="font-size:10px;letter-spacing:1px;color:{INK40};margin:10px 18px 0 18px;font-weight:600">{t("ld.replyThreadOpens")}</div>
{tabbar(0)}</div>'''
    s1_floats = [
        f'<div class="float" style="left:900px;top:620px;transform:rotate(12deg)">{bird("wren-sticker-fly",300)}</div>',
        f'<div class="float" style="left:60px;top:660px;transform:rotate(-9deg)">{A.stamp_svg("cant-sleep",230)}</div>',
        f'<div class="float" style="left:1080px;top:1420px">{envelope(330, rot=8)}</div>',
        f'<div class="float" style="left:10px;top:2440px">{envelope(230, stamp="#E0483C", rot=-12)}</div>',
        blob(1060, 2380, 150, "#E0483C"),
    ]
    page(T["s1.h"], T["s1.sub"], phone(today, rot=-5, top=900), s1_floats, "01-letters")

    # ── S2 · Compose + stamps ─────────────────────────────────────────────
    def stamp_cell(sid, size=44):
        st = A.STAMP_BY_ID[sid]
        return f'<div style="width:16.66%;display:flex;flex-direction:column;align-items:center;margin-bottom:10px">{A.stamp_svg(sid, size)}<span class="mono" style="font-size:7.5px;letter-spacing:.3px;color:{st["color"]};margin-top:4px;text-align:center;max-width:56px;line-height:10px;overflow:hidden;height:20px">{A.stamp_name(lang, sid).lower()}</span></div>'
    suggested = ["never-told", "grief", "miss-someone", "homesick", "not-over-it", "unsent"]
    rest = [s["id"] for s in A.STAMPS if s["id"] not in suggested][:12]
    ring = lambda inner, on=False: f'<span style="display:inline-flex;width:46px;height:46px;border-radius:23px;border:1.5px solid {PEN if on else INK};align-items:center;justify-content:center">{inner}</span>'
    plus_g = f'<svg width="27" height="27" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="{INK}" stroke-width="2" stroke-linecap="round"/></svg>'
    pencil_g = f'<svg width="27" height="27" viewBox="0 0 34 34"><circle cx="12" cy="12" r="1.6" fill="{PEN}"/><circle cx="22" cy="12" r="1.6" fill="{PEN}"/><path d="M11 20q6 5 12 0" stroke="{PEN}" stroke-width="1.8" fill="none" stroke-linecap="round"/><g transform="rotate(45 24 24)"><rect x="21" y="16" width="6" height="14" fill="#E9B44C" stroke="{INK}" stroke-width="1.2"/><path d="M21 30l3 4 3-4z" fill="{INK}"/></g></svg>'
    compose = f'''<div class="app" style="background:#fff">
<div style="padding:62px 16px 0 16px;display:flex;align-items:center"><span class="mono" style="font-size:17px">✕</span><span class="mono" style="flex:1;text-align:center;font-size:11.5px;letter-spacing:1.8px;font-weight:600">{t("cp.header")}</span><span style="width:20px"></span></div>
<div style="padding:26px 24px 0 24px;font-size:17.5px;line-height:28px;color:{INK}">{T["compose"]}<span style="display:inline-block;width:2px;height:22px;background:{PEN};vertical-align:-4px;margin-left:2px"></span></div>
<div style="position:absolute;left:0;right:0;bottom:296px;padding:10px 14px 12px 14px;display:flex;align-items:center;gap:8px;background:#fff">{ring(plus_g)}{ring(pencil_g, True)}<div style="flex:1;height:52px;border-radius:16px;background:{PEN};color:#fff;display:flex;align-items:center;justify-content:center;gap:10px" class="mono"><span style="font-size:14px">‹</span><span style="font-size:13px;letter-spacing:1.4px;font-weight:600">{t("cp.needStamp")}</span></div></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:296px;background:#F3F2FA;border-top:1px solid {INK12};padding:14px 12px 0 12px;overflow:hidden">
<div class="mono" style="font-size:9px;letter-spacing:1.4px;font-weight:600;color:{INK40};margin-bottom:10px">{t("cp.forThisLetter")}</div>
<div style="display:flex;flex-wrap:wrap">{"".join(stamp_cell(s) for s in suggested)}</div>
<div class="mono" style="font-size:9px;letter-spacing:1.4px;font-weight:600;color:{INK40};margin:4px 0 10px 0">{t("cp.recent")}</div>
<div style="display:flex;flex-wrap:wrap">{"".join(stamp_cell(s) for s in rest)}</div></div></div>'''
    s2_floats = [
        f'<div class="float" style="left:40px;top:660px;transform:rotate(-12deg)">{A.stamp_svg("cant-sleep",250)}</div>',
        f'<div class="float" style="left:960px;top:640px;transform:rotate(10deg)">{A.stamp_svg("crush",230)}</div>',
        chip("#" + A.stamp_name(lang, "off-chest").lower(), "#7A4FD1", "#fff", -8, 40, 1500),
        chip("#" + A.stamp_name(lang, "made-my-day").lower(), "#43903F", "#fff", 7, 980, 1480),
        f'<div class="float" style="left:1070px;top:2560px;transform:rotate(9deg)">{bird("wren-sticker-adult-delight",220)}</div>',
    ]
    page(T["s2.h"], T["s2.sub"], phone(compose, rot=4, top=900), s2_floats, "02-stamps")

    # ── S3 · a kindred's room ─────────────────────────────────────────────
    def bub(text, mine):
        side = "flex-end" if mine else "flex-start"
        bg = PEN if mine else "#F3F2FA"; fg = "#fff" if mine else INK
        br = "18px 18px 5px 18px" if mine else "18px 18px 18px 5px"
        return f'<div style="display:flex;justify-content:{side};margin-top:8px"><div style="max-width:84%;background:{bg};color:{fg};padding:10px 14px;border-radius:{br};font-size:15.5px;line-height:22px">{text}</div></div>'
    def day(d): return f'<div class="mono" style="text-align:center;font-size:9px;letter-spacing:1.4px;color:{INK40};margin-top:18px">{d}</div>'
    face_m = f'<span style="display:flex;width:44px;height:44px;border-radius:22px;background:#F6F5FD;align-items:center;justify-content:center;overflow:hidden"><img src="file://{S}/face.png" style="width:44px;height:44px;object-fit:cover"></span>'
    room = f'''<div class="app" style="background:#fff">
<div style="padding:60px 10px 10px 10px;display:flex;align-items:center;gap:10px"><span class="mono" style="font-size:22px;width:30px;text-align:center">‹</span>{face_m}<div style="flex:1"><div style="font-size:19px;font-weight:600">{T["mira"]}</div><div class="mono" style="font-size:9px;letter-spacing:1.1px;color:{INK40};margin-top:2px">{t("rm.kindredSince", date=T["since"])}</div><div style="display:flex;align-items:center;gap:5px;margin-top:4px">{bird("wren-sticker-adult-content",13)}<span class="fr" style="font-style:italic;font-size:11.5px;color:{INK40}">{t("rm.foundYouTwo", wren="Juno")}</span></div></div><span class="mono" style="font-size:18px;color:{INK40}">⋯</span></div>
<div style="height:1px;background:{INK12}"></div>
<div style="padding:4px 22px 0 22px">{day("SEP 17")}{bub(T["b1"], False)}{day("SEP 18")}{bub(T["b2"], True)}{bub(T["b3"], False)}{day("SEP 19")}{bub(T["b4"], True)}{day("SEP 20")}{bub(T["b5"], False)}</div>
<div style="margin:16px 22px 0 22px;border:1px solid {INK12};padding:13px"><div style="display:flex;align-items:center;gap:8px">{bird("wren-sticker-adult-curious",20)}<span class="mono" style="font-size:9px;letter-spacing:1.2px;color:{INK40};font-weight:500">{t("rm.noticed", wren="JUNO")}</span><span style="flex:1"></span><span class="mono" style="font-size:8.5px;letter-spacing:1px;color:{INK40}">{t("nc.word.ev", a=1, b=1)}</span></div>
<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:7px"><span style="font-size:15.5px;line-height:23px">{t("nc.word.line")}</span>{pill("#"+T["word"], WASH, PEN, PEN)}</div></div>
<div style="position:absolute;left:0;right:0;bottom:0;padding:10px 14px 30px 14px;display:flex;align-items:center;gap:8px;background:#fff">{ring(bird("wren-sticker-adult-curious",24))}<div style="flex:1;height:42px;border-radius:20px;background:#F3F2FA;display:flex;align-items:center;padding:0 14px;color:{INK40};font-size:16px">{t("rm.ph")}</div>{ring(plus_g)}</div></div>'''
    s3_floats = [
        f'<div class="float" style="left:90px;top:680px;transform:rotate(-8deg);background:#fff;padding:22px;border-radius:26px">{mosaic("mira",22,5,PEN)}</div>',
        f'<div class="float" style="left:1000px;top:700px;transform:rotate(9deg);background:#fff;padding:22px;border-radius:26px">{mosaic("row",22,5,"#E0483C")}</div>',
        chip("#" + T["word"], WASH, PEN, -6, 980, 1740),
        f'<div class="float" style="left:0px;top:1560px">{envelope(230, stamp="#8CC4A2", rot=11)}</div>',
        f'<div class="float" style="left:30px;top:2520px;transform:rotate(-10deg)">{bird("wren-sticker-adult-delight",240)}</div>',
        blob(1080, 2440, 140, GREEN),
    ]
    page(T["s3.h"], T["s3.sub"], phone(room, rot=0, top=900), s3_floats, "03-kindreds")

    # ── S4 · Wren's desk ──────────────────────────────────────────────────
    label = lambda txt, own=False: f'<div class="mono" style="font-size:9.5px;letter-spacing:1.2px;font-weight:600;color:{INK40 if own else PEN};margin-top:16px;margin-bottom:5px">{txt}</div>'
    guide_art = f'''<div style="height:150px;background:{WASH};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;margin:0 13px"><span style="display:flex;width:64px;height:64px;border-radius:32px;background:#F6F5FD;align-items:center;justify-content:center">{mosaic("guide-stranger",5,5,INK,0.15)}</span><span class="mono" style="font-size:10px;letter-spacing:1.2px;font-weight:600;color:{INK40}">{t("ga.stranger")}</span></div>'''
    chips = "".join(pill(t(f"gd.{g}.title").upper(), WASH, PEN, PEN, 10) for g in ["letters","kindreds","aura"])
    desk = f'''<div class="app" style="background:#fff">
<div style="padding:60px 10px 10px 10px;display:flex;align-items:center;gap:11px"><span class="mono" style="font-size:22px;width:30px;text-align:center">‹</span>{wren_official(46)}<div><div style="font-size:19px;font-weight:600">Wren</div><div class="mono" style="font-size:9px;letter-spacing:1.1px;color:{INK40};margin-top:2px">{t("wo.role").upper()}</div></div></div>
<div style="height:1px;background:{INK12}"></div>
<div style="padding:12px 22px 0 22px">
{label("WREN · " + t("wo.kind.note"))}<div style="font-size:16px;line-height:24px">{T["welcome"]}</div>
{label(t("ui.you"), True)}<div style="font-size:16px;line-height:24px;color:{INK60}">{T["ask"]}</div>
{label("WREN")}
<div style="border:1px solid {INK12};background:#fff;padding-bottom:12px"><div style="padding:11px 13px 6px 13px"><span class="mono" style="font-size:9px;letter-spacing:1.3px;color:{INK40};font-weight:500">{t("gd.howTo")}</span> <span class="mono" style="font-size:9px;letter-spacing:1.3px;font-weight:600">{t("gd.kindreds.title").upper()}</span></div>{guide_art}
<div style="font-size:15.5px;line-height:23px;padding:12px 13px 0 13px">{t("gd.kindreds.f1")}</div>
<div style="display:flex;align-items:center;padding:12px 13px 0 13px"><span style="display:flex;gap:5px"><span style="width:6px;height:6px;border-radius:3px;background:{PEN}"></span><span style="width:6px;height:6px;border-radius:3px;background:#E4E1FA"></span><span style="width:6px;height:6px;border-radius:3px;background:#E4E1FA"></span></span><span style="flex:1"></span><span class="mono" style="font-size:10.5px;letter-spacing:1.2px;font-weight:600;color:{PEN}">{t("gd.next")} ›</span></div></div>
<div class="mono" style="font-size:10.5px;color:{INK40};margin-top:8px">{t("gd.notIt")} <span style="color:{PEN};font-weight:600">{t("gd.sendOn")} ›</span></div>
<div class="mono" style="font-size:9px;letter-spacing:1.3px;color:{INK40};margin-top:18px;font-weight:500">{t("gd.chips.head")}</div>
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">{chips}</div></div>
<div style="position:absolute;left:0;right:0;bottom:0;padding:10px 14px 30px 14px;display:flex;align-items:center;gap:8px;background:#fff">{ring(plus_g)}<div style="flex:1;height:42px;border-radius:20px;background:#F3F2FA;display:flex;align-items:center;padding:0 14px;color:{INK40};font-size:16px">{t("wo.ph")}</div></div></div>'''
    s4_floats = [
        f'<div class="float" style="left:60px;top:640px;transform:rotate(-10deg)">{bird("wren-sticker-adult-curious",260)}</div>',
        chip(t("wo.tag"), PEN, "#fff", 8, 960, 680, 40),
        chip(t("gd.kindreds.title").upper(), WASH, PEN, -5, 900, 1500, 32),
        f'<div class="float" style="left:20px;top:1640px">{envelope(220, rot=-10)}</div>',
        f'<div class="float" style="left:1040px;top:2460px;transform:rotate(9deg)">{bird("wren-sticker-fly",250)}</div>',
        blob(40, 2440, 150, "#F2887E"),
    ]
    page(T["s4.h"], T["s4.sub"], phone(desk, rot=-3, top=900), s4_floats, "04-wren")

    # ── S5 · the aura (Me) ────────────────────────────────────────────────
    def stk(label, bg, fg, rot):
        return f'<span style="display:inline-block;background:#fff;padding:3px;border-radius:999px;box-shadow:0 5px 12px rgba(17,17,19,.2);transform:rotate({rot}deg)"><span style="display:block;background:{bg};color:{fg};font-weight:700;font-size:12.5px;padding:6px 12px;border-radius:999px">{label}</span></span>'
    me = f'''<div class="app">
<div style="display:flex;justify-content:space-between;align-items:center;padding:62px 22px 4px 22px"><span class="mono" style="font-size:13px;letter-spacing:2.6px;font-weight:600">{t("me.header")}</span><span style="width:30px;height:30px;border-radius:50%;background:#fff;display:block"></span></div>
<div style="display:flex;align-items:center;gap:14px;padding:12px 22px 0 22px"><span style="width:52px;height:52px;border-radius:50%;overflow:hidden;background:#EFEDFA;display:block"><img src="file://{S}/face.png" style="width:52px;height:52px;object-fit:cover"></span><div><div style="font-weight:700;font-size:26px;letter-spacing:-.5px">sol</div><div class="mono" style="font-size:10.5px;letter-spacing:1.2px;color:{INK60};margin-top:6px">{T["stats"]}</div></div></div>
<div style="margin:14px 22px 0 22px;background:#fff;border-radius:16px;display:flex;overflow:hidden;box-shadow:0 2px 8px rgba(17,17,19,.05)">
<div style="width:104px;height:92px;background:#E4E1FA;position:relative"><div style="position:absolute;left:10px;right:10px;top:50px;border-top:2px dashed rgba(59,53,224,.35)"></div><div style="position:absolute;left:30px;top:6px;transform:rotate(-12deg)">{bird("wren-sticker-fledgling",46)}</div></div>
<div style="flex:1;padding:12px 14px;display:flex;flex-direction:column;justify-content:center;gap:5px"><div style="display:flex;align-items:center;gap:8px"><b style="font-size:15px">Juno</b></div><div style="font-size:13px">{T["carrying"]}</div><div style="font-size:11px;color:{INK60}">{T["brb"]}</div></div></div>
<div style="margin:12px 22px 0 22px;background:#fff;border-radius:20px;padding:18px 18px 16px 18px;box-shadow:0 8px 24px rgba(17,17,19,.07)">
<div style="display:flex;gap:14px"><div style="flex:1"><div class="mono" style="font-size:10px;letter-spacing:2.2px;font-weight:600;color:{PEN}">{t("ap.title")}</div><div style="font-size:12px;color:{INK60};margin-top:3px">{T["inYourWords"]}</div><div style="font-weight:700;font-size:30px;line-height:32px;letter-spacing:-1px;margin-top:14px">{T["quietObserver"]}</div></div>
<div style="text-align:right"><div style="font-size:13px;color:{GREEN}">{T["formed"]}</div><div style="width:140px;height:104px;border-radius:12px;overflow:hidden;background:#E4E1FA;margin-top:10px"><img src="file://{S}/01-quiet-observer.png" style="width:140px;height:105px;object-fit:cover"></div></div></div>
<div style="font-size:15px;line-height:22px;margin-top:12px">{T["auraDesc"]}</div>
<div style="display:flex;justify-content:center;gap:8px;margin-top:14px">{stk(T["detail"],"#5B55FF","#fff",-3)}{stk(T["quiet"],"#8CC4A2",INK,2)}{stk(T["open"],"#F2887E",INK,-2)}</div>
<div style="display:flex;gap:8px;margin-top:14px"><div style="flex:1;background:#2E2A6B;border-radius:12px;padding:14px;text-align:center;color:#fff;font-weight:600;font-size:14px">{T["readPortrait"]} →</div><div style="width:52px;border:1.5px solid #DCD9F0;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px">⇧</div></div>
<div class="mono" style="font-size:10px;letter-spacing:1.4px;color:{INK60};text-align:center;margin-top:12px">{T["formedFoot"]}</div></div>
<div style="margin:12px 22px 0 22px;background:#FFFCF3;border-radius:18px;padding:16px 18px;box-shadow:0 8px 24px rgba(17,17,19,.07)"><div class="mono" style="font-size:10.5px;letter-spacing:2.2px;font-weight:600;color:#B08037">● {t("fc.title") if t("fc.title")!="fc.title" else "FIRST CLASS"}</div><div class="fr" style="font-size:18.5px;margin-top:8px">{T["moreRoom"]}</div></div>
{tabbar(4)}</div>'''
    s5_floats = [
        chip(T["night"], INK, "#fff", -8, 60, 620),
        chip(T["detail"], "#5B55FF", "#fff", 6, 880, 700),
        chip(T["open"], "#F2887E", INK, -5, 1090, 1240),
        chip(T["quiet"], "#8CC4A2", INK, 9, 20, 1400),
        f'<div class="float" style="left:20px;top:2640px;transform:rotate(-7deg);background:#fff;padding:12px;border-radius:22px"><img src="file://{S}/26-quiet-diarist.png" style="width:280px;height:210px;border-radius:14px;display:block"></div>',
        f'<div class="float" style="left:1070px;top:2640px;transform:rotate(8deg);background:#fff;padding:10px;border-radius:20px"><img src="file://{S}/33-quick-overthinker.png" style="width:230px;height:172px;border-radius:12px;display:block"></div>',
    ]
    page(T["s5.h"], T["s5.sub"], phone(me, rot=4, top=900), s5_floats, "05-aura")

    # ── S6 · a sealed page ────────────────────────────────────────────────
    def mood_cell(mid):
        return f'<div style="width:20%;display:flex;flex-direction:column;align-items:center;margin-bottom:12px"><span style="display:flex;width:54px;height:54px;align-items:center;justify-content:center">{A.mood_svg(mid,40)}</span><span class="mono" style="font-size:8.5px;letter-spacing:.6px;color:{INK60};margin-top:4px;font-weight:600;max-width:70px;text-align:center;overflow:hidden;white-space:nowrap">{A.mood_name(lang, mid).upper()}</span></div>'
    moods = A.MOOD_IDS[:15]
    face_key = f'<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="{PEN}" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="0.9" fill="{PEN}" stroke="none"/><circle cx="15" cy="10" r="0.9" fill="{PEN}" stroke="none"/><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2"/></svg>'
    sealed = f'''<div class="app" style="background:#fff">
<div style="display:flex;align-items:center;padding:60px 20px 10px 12px"><span class="mono" style="font-size:17px;width:34px;text-align:center">✕</span><span style="font-size:22px;font-weight:700;margin-left:6px">sep 20</span><span style="flex:1"></span><span class="mono" style="font-size:10.5px;letter-spacing:1.4px;color:{INK40}">🔒 {t("je.justForMe")}</span></div>
<div style="padding:10px 20px 0 20px;font-size:19px;line-height:30px;color:{INK}">{T["line"]}</div>
<div style="display:flex;gap:8px;padding:12px 20px 0 20px"><div style="width:48.6%;aspect-ratio:1;border-radius:2px;overflow:hidden;background:#E4E1FA"><img src="file://{S}/01-quiet-observer.png" style="width:100%;height:100%;object-fit:cover"></div><div style="width:48.6%;aspect-ratio:1;border-radius:2px;overflow:hidden;background:#E4E1FA"><img src="file://{S}/26-quiet-diarist.png" style="width:100%;height:100%;object-fit:cover"></div></div>
<div class="mono" style="font-size:10px;letter-spacing:.6px;color:{INK40};padding:12px 20px 0 20px">{t("sc.coverHint")}</div>
<div style="position:absolute;left:0;right:0;bottom:296px;padding:8px 18px 12px 18px;display:flex;align-items:center;gap:10px;background:#fff"><span style="display:inline-flex;width:52px;height:52px;border-radius:26px;border:1.5px solid {PEN};align-items:center;justify-content:center">{face_key}</span><div style="flex:1;height:52px;background:{PEN};color:#fff;display:flex;align-items:center;justify-content:center;gap:10px" class="mono"><span style="font-size:14px">‹</span><span style="font-size:13px;letter-spacing:1.4px;font-weight:600">{t("sc.askMood")}</span></div></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:296px;background:#F3F2FA;border-top:1px solid {INK12};padding:16px 10px 0 10px;display:flex;flex-wrap:wrap;overflow:hidden">{"".join(mood_cell(m) for m in moods)}</div></div>'''
    s6_floats = [
        f'<div class="float" style="left:900px;top:560px;transform:rotate(12deg)">{A.mood_svg("calm",260)}</div>',
        f'<div class="float" style="left:60px;top:600px;transform:rotate(-10deg)">{A.mood_svg("cheerful",230)}</div>',
        '<div class="float" style="left:50px;top:1700px;width:160px;height:160px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center"><svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#111113" stroke-width="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>',
        f'<div class="float" style="left:1110px;top:1640px;transform:rotate(8deg)">{A.mood_svg("in-love",200)}</div>',
        f'<div class="float" style="left:30px;top:2520px;transform:rotate(-9deg)">{bird("wren-sticker-adult-sleepy",240)}</div>',
        blob(1070, 2460, 150, "#E0483C"),
    ]
    page(T["s6.h"], T["s6.sub"], phone(sealed, rot=-4, top=900), s6_floats, "06-sealed")

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "en"
    for lang in (A.LANGS if arg == "all" else [arg]):
        render(lang)
