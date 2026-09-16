#!/usr/bin/env python3
"""App Store screenshots for Kindredly — 6.9" (1320×2868), rendered by headless Chrome.
Every phone screen is an HTML replica of the real screen (402×874 pt, zoomed), built with
the app's own tokens; the floating objects are the app's own artwork (courier symbols,
stamps, stickers, scenes). No user data, no status-bar clocks, no dev-menu bubble."""
import json, os, subprocess, sys
S = os.path.dirname(os.path.abspath(__file__))
LANG = sys.argv[1] if len(sys.argv) > 1 else "en"
OUTDIR = S if LANG == "en" else f"{S}/{LANG}"
os.makedirs(OUTDIR, exist_ok=True)
from copy_ import COPY
T = COPY[LANG]
DEFS = open(S + "/defs.svg.html", encoding="utf8").read()
STAMPS = json.load(open(S + "/stamps.json"))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

INK = "#1E1B35"; PEN = "#3A3AF5"; WASH = "#ECECFE"; PAPER = "#FFFFFF"

HEAD = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1320px;height:2868px;overflow:hidden}
body{background:#F6F5FF;font-family:'Instrument Sans',system-ui,sans-serif;color:#1E1B35;position:relative}
.bg{position:absolute;inset:0;background:
 radial-gradient(900px 700px at 15% 8%, rgba(91,85,255,.16), transparent 70%),
 radial-gradient(800px 600px at 90% 30%, rgba(242,136,126,.14), transparent 70%),
 radial-gradient(700px 700px at 60% 95%, rgba(140,196,162,.14), transparent 70%),
 linear-gradient(#F8F7FF,#EEEDFB)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(30,27,53,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(30,27,53,.045) 1px,transparent 1px);background-size:60px 60px;mask-image:linear-gradient(#000 40%,transparent 100%)}
.head{position:absolute;left:110px;right:110px;top:210px}
.h1{font-family:'Fraunces',serif;font-weight:600;font-size:110px;line-height:1.02;letter-spacing:-.02em;color:#1E1B35;font-variation-settings:'opsz' 144}
.sub{margin-top:36px;font-size:42px;line-height:1.32;color:rgba(30,27,53,.62);max-width:1000px}
.phone{position:absolute;left:50%;width:990px;height:2150px;margin-left:-495px;top:880px;border-radius:150px;background:#0B0A14;padding:18px;box-shadow:0 60px 120px rgba(30,27,53,.28),0 10px 30px rgba(30,27,53,.2)}
.screen{width:100%;height:100%;border-radius:132px;overflow:hidden;background:#ECECFE;position:relative}
.island{position:absolute;left:50%;top:26px;width:290px;height:84px;margin-left:-145px;border-radius:60px;background:#000;z-index:5}
.app{position:absolute;left:0;top:0;width:402px;height:874px;zoom:2.373;background:#ECECFE;font-family:'Instrument Sans',system-ui,sans-serif;color:#1E1B35}
.mono{font-family:'IBM Plex Mono',monospace}
.serif{font-family:'Fraunces',serif;font-variation-settings:'opsz' 18}
.float{position:absolute;filter:drop-shadow(0 34px 44px rgba(30,27,53,.22))}
.sticker{display:inline-block;background:#fff;padding:7px;border-radius:999px;box-shadow:0 18px 40px rgba(30,27,53,.22)}
.sticker i{display:block;font-style:normal;font-weight:700;font-size:44px;padding:18px 40px;border-radius:999px;letter-spacing:-.01em}
.tab{position:absolute;left:0;right:0;bottom:0;height:88px;background:#fff;border-top:1px solid rgba(30,27,53,.12);display:flex;justify-content:space-around;align-items:flex-start;padding-top:14px}
.tab b{width:38px;height:28px;border:2px solid rgba(30,27,53,.45);border-radius:4px;display:block}
.tab b.on{background:#3A3AF5;border-color:#3A3AF5;width:44px;height:34px;border-radius:6px}
</style></head><body><div class="bg"></div><div class="grid"></div>
""" + DEFS

def bird(sym, size, extra=""):
    return f'<svg viewBox="0 0 200 200" width="{size}" height="{size}" {extra}><use href="#{sym}"/></svg>'

def mosaic(seed, cell=6, cells=5, on="#1E1B35"):
    import random
    r = random.Random(seed); out = []
    for y in range(cells):
        for x in range(cells):
            if r.random() < 0.5: out.append(f'<rect x="{x*(cell+1)}" y="{y*(cell+1)}" width="{cell}" height="{cell}" fill="{on}"/>')
    w = cells*(cell+1)-1
    return f'<svg viewBox="0 0 {w} {w}" width="{w}" height="{w}">{"".join(out)}</svg>'

def envelope(w, stamp=PEN, rot=0):
    h = int(w*0.66)
    return f'''<svg width="{w}" height="{h}" viewBox="0 0 120 80" style="transform:rotate({rot}deg)">
<rect x="1.5" y="1.5" width="117" height="77" fill="#fff" stroke="#1E1B35" stroke-width="2.5"/>
<path d="M1.5 1.5 L60 44 L118.5 1.5" fill="none" stroke="#1E1B35" stroke-width="2.5"/>
<rect x="90" y="9" width="20" height="18" fill="{stamp}"/></svg>'''

def chip(label, bg, fg, rot, x, y, size=44):
    return f'<div class="sticker" style="position:absolute;left:{x}px;top:{y}px;transform:rotate({rot}deg)"><i style="background:{bg};color:{fg};font-size:{size}px">{label}</i></div>'

def tabbar(active):
    cells = "".join(f'<b class="{"on" if i==active else ""}"></b>' for i in range(5))
    return f'<div class="tab">{cells}</div>'

def phone(inner, rot=0, top=880):
    return f'<div class="phone" style="top:{top}px;transform:rotate({rot}deg)"><div class="screen"><div class="island"></div>{inner}</div></div>'

def page(h1, sub, phone_html, floats, out):
    html = HEAD + f'<div class="head"><div class="h1">{h1}</div><div class="sub">{sub}</div></div>' + phone_html + "".join(floats) + "</body></html>"
    p = f"{OUTDIR}/{out}.html"; open(p, "w", encoding="utf8").write(html)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    "--window-size=1320,2868", "--virtual-time-budget=12000", f"--screenshot={OUTDIR}/{out}.png", "file://" + p],
                   check=True, capture_output=True)
    print("rendered", out)

# ── S1 · Today ──────────────────────────────────────────────────────────────
today = f'''<div class="app">
<div style="padding:66px 20px 10px 20px;margin:0 16px;border-bottom:1px solid #1E1B35;display:flex;justify-content:space-between"><span class="mono" style="font-size:12.5px;letter-spacing:1.6px;font-weight:600">{T["today"]}</span></div>
<div style="display:flex;gap:12px;padding:12px 22px 10px 22px;align-items:flex-start">{bird("wren-sticker-hatchling",34)}
<div style="flex:1"><div class="serif" style="font-style:italic;font-size:13.5px;line-height:20px;color:rgba(17,17,19,.6)">{T["arrived"]}</div>
<div style="display:flex;gap:9px;margin-top:9px">
<svg width="30" height="28" viewBox="0 -9 30 28"><path d="M3 1 L15 -6 L27 1 Z" fill="#fff" stroke="#3A3AF5" stroke-width="1.3"/><rect x="7.5" y="-5" width="15" height="8" fill="#fff" stroke="#3A3AF5" stroke-width="1.3"/><rect x="1" y="1" width="28" height="17" fill="#fff" stroke="#3A3AF5" stroke-width="1.3"/><rect x="22" y="4" width="4.5" height="4" fill="#3A3AF5"/></svg>
<svg width="30" height="28" viewBox="0 -9 30 28"><rect x="1" y="1" width="28" height="17" fill="#fff" stroke="#111113" stroke-width="1.3"/><path d="M1 1 L15 11 L29 1" fill="none" stroke="#111113" stroke-width="1.3"/><rect x="22" y="4" width="4.5" height="4" fill="#3A3AF5"/></svg>
<svg width="30" height="28" viewBox="0 -9 30 28"><rect x="1" y="1" width="28" height="17" fill="#fff" stroke="#111113" stroke-width="1.3"/><path d="M1 1 L15 11 L29 1" fill="none" stroke="#111113" stroke-width="1.3"/><rect x="22" y="4" width="4.5" height="4" fill="#3A3AF5"/></svg>
</div></div></div>
<div style="margin:0 12px;background:#fff;padding:26px 22px 14px 22px;height:560px;position:relative">
<div style="display:flex;align-items:center;gap:10px">{mosaic("s1",4,5)}<span class="mono" style="font-size:10px;letter-spacing:1.2px;color:rgba(17,17,19,.5)">SEP.16 · NO.5422</span><span style="flex:1"></span><span style="width:44px;height:44px;display:block">{STAMPS["never-told"].replace('width="64" height="64"','width="44" height="44"')}</span><span class="mono" style="color:rgba(17,17,19,.5)">···</span></div>
<div class="serif" style="font-size:22px;line-height:32px;margin-top:38px">{T["letter1"]}</div>
<div style="position:absolute;left:22px;right:22px;bottom:14px">
<span class="mono" style="display:inline-block;border:1px solid #6B4F9E;background:rgba(107,79,158,.14);color:#6B4F9E;font-size:12px;padding:5px 9px">{T["stampNeverTold"]}</span>
<div class="mono" style="font-size:9.5px;letter-spacing:1.2px;color:rgba(17,17,19,.45);margin-top:10px">{T["written9"]}</div>
<div style="height:1px;background:#111113;margin-top:14px"></div>
<div class="mono" style="display:flex;justify-content:space-between;font-size:11.5px;letter-spacing:1.2px;padding-top:12px"><span style="color:rgba(17,17,19,.45)">↑ {T["pass"]}</span><span style="color:#3A3AF5;font-weight:600">{T["reply"]} ↓</span></div></div></div>
<div style="padding:12px 26px 0 26px"><div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid rgba(17,17,19,.5);padding-bottom:8px"><span class="serif" style="font-size:17px;color:rgba(17,17,19,.45)">{T["writeBack"]}</span><span class="mono" style="font-size:11px;letter-spacing:1.4px;color:rgba(17,17,19,.5)">{T["send"]}</span></div><div class="mono" style="font-size:9.5px;letter-spacing:1.2px;color:rgba(17,17,19,.4);margin-top:8px">{T["threadOpens"]}</div></div>
{tabbar(0)}</div>'''

s1_floats = [
    f'<div class="float" style="left:900px;top:560px;transform:rotate(12deg)">{bird("wren-sticker-fly",300)}</div>',
    f'<div class="float" style="left:60px;top:600px;transform:rotate(-9deg)">{STAMPS["cant-sleep"].replace(chr(34)+"64"+chr(34),chr(34)+"230"+chr(34))}</div>',
    f'<div class="float" style="left:1080px;top:1420px">{envelope(330, rot=8)}</div>',
    f'<div class="float" style="left:10px;top:2440px">{envelope(230, stamp="#E0483C", rot=-12)}</div>',
    '<div class="float" style="left:1060px;top:2380px;width:150px;height:150px;border-radius:50%;background:#E0483C;box-shadow:inset 0 0 0 10px rgba(255,255,255,.35)"></div>',
]
page(T["s1.h"], T["s1.sub"], phone(today, rot=-5, top=900), s1_floats, "01-letters")

# ── S2 · the first flight ───────────────────────────────────────────────────
def stop(x, y, label, sub, rot=0):
    return f'''<div style="position:absolute;left:{x-18}px;top:{y-18}px;width:36px;height:36px;border-radius:50%;background:#FBF3C8;border:1.5px solid #1E1B35;display:flex;align-items:center;justify-content:center"><span style="width:7px;height:7px;background:#C86E7A;display:block"></span></div>
<div class="mono" style="position:absolute;left:{x-70}px;top:{y+24}px;width:140px;text-align:center;font-size:8.5px;font-weight:600;letter-spacing:.6px">{label}</div>
<div class="serif" style="position:absolute;left:{x-80}px;top:{y+38}px;width:160px;text-align:center;font-style:italic;font-size:9.5px;color:rgba(30,27,53,.55)">{sub}</div>'''
route = "M78,640 C60,440 140,300 210,250 C280,200 330,160 318,300 C306,440 250,470 300,560 C350,650 190,700 78,640"
chart = f'''<div class="app" style="background:#ECECFE;background-image:linear-gradient(rgba(30,27,53,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(30,27,53,.06) 1px,transparent 1px);background-size:22px 22px">
<div class="serif" style="position:absolute;left:0;right:0;top:82px;text-align:center;font-size:30px;color:rgba(30,27,53,.35)">{T["firstFlight"]}</div>
<div class="mono" style="position:absolute;left:0;right:0;top:124px;text-align:center;font-size:10px;letter-spacing:1.6px;color:rgba(30,27,53,.35)">{T["folded"]}</div>
<svg style="position:absolute;left:0;top:0" width="402" height="874" viewBox="0 0 390 844"><path d="{route}" fill="none" stroke="#3A3AF5" stroke-opacity=".75" stroke-width="2.2" stroke-dasharray="1.5 8" stroke-linecap="round"/></svg>
{stop(210,250,T["st1"],T["st1s"])}{stop(318,300,T["st2"],T["st2s"])}{stop(300,560,T["st3"],T["st3s"])}
<div style="position:absolute;left:60px;top:622px;width:36px;height:36px;border-radius:50%;background:#fff;border:1.5px solid #1E1B35;display:flex;align-items:center;justify-content:center"><span style="width:7px;height:7px;background:#3A3AF5;display:block"></span></div>
<div class="mono" style="position:absolute;left:28px;top:664px;width:100px;text-align:center;font-size:8.5px;font-weight:600;letter-spacing:.6px">{T["yourCity"]}</div>
<div style="position:absolute;left:236px;top:410px;transform:rotate(-16deg)">{bird("wren-sticker-hatchling",92)}</div>
<div style="position:absolute;left:262px;top:486px;transform:rotate(-14deg)">{envelope(60)}</div>
<div class="mono" style="position:absolute;left:0;right:0;top:756px;text-align:center;font-size:9px;letter-spacing:1.6px;color:rgba(30,27,53,.4)">{T["chart"]}</div>
<div class="mono" style="position:absolute;left:0;right:0;bottom:22px;text-align:center;font-size:10px;letter-spacing:1.4px;color:rgba(30,27,53,.4)">{T["skip"]}</div></div>'''
s2_floats = [
    f'<div class="float" style="left:60px;top:560px;transform:rotate(-14deg)">{bird("wren-moss-fly",260)}</div>',
    f'<div class="float" style="left:960px;top:640px;transform:rotate(10deg)">{bird("wren-peach-fly",240)}</div>',
    f'<div class="float" style="left:1010px;top:1700px;transform:rotate(-8deg)">{bird("wren-plush-fly",250)}</div>',
    f'<div class="float" style="left:90px;top:1520px">{envelope(260, rot=-10)}</div>',
    f'<div class="float" style="left:120px;top:2300px">{envelope(200, stamp="#D8A63F", rot=7)}</div>',
]
page(T["s2.h"], T["s2.sub"], phone(chart, rot=0, top=900), s2_floats, "02-courier")

# ── S3 · the aura ───────────────────────────────────────────────────────────
def stk(label, bg, fg, rot):
    return f'<span style="display:inline-block;background:#fff;padding:3px;border-radius:999px;box-shadow:0 5px 12px rgba(30,27,53,.2);transform:rotate({rot}deg)"><span style="display:block;background:{bg};color:{fg};font-weight:700;font-size:12.5px;padding:6px 12px;border-radius:999px">{label}</span></span>'
me = f'''<div class="app">
<div style="display:flex;justify-content:space-between;align-items:center;padding:66px 22px 4px 22px"><span class="mono" style="font-size:13px;letter-spacing:2.6px;font-weight:600">{T["me"]}</span><span style="width:30px;height:30px;border-radius:50%;background:#fff;display:block"></span></div>
<div style="display:flex;align-items:center;gap:14px;padding:12px 22px 0 22px"><span style="width:52px;height:52px;border-radius:50%;overflow:hidden;background:#EFEDFA;display:block"><img src="file://{S}/face.png" style="width:52px;height:52px;object-fit:cover"></span><div><div style="font-weight:700;font-size:26px;letter-spacing:-.5px">sol</div><div class="mono" style="font-size:10.5px;letter-spacing:1.2px;color:rgba(30,27,53,.5);margin-top:6px">{T["stats"]}</div></div></div>
<div style="margin:14px 22px 0 22px;background:#fff;border-radius:16px;display:flex;overflow:hidden;box-shadow:0 2px 8px rgba(30,27,53,.05)">
<div style="width:104px;height:92px;background:#E4E1FA;position:relative"><div style="position:absolute;left:10px;right:10px;top:50px;border-top:2px dashed rgba(91,85,255,.35)"></div><div style="position:absolute;left:8px;top:44px;width:12px;height:12px;border-radius:3px;background:#3A3AF5"></div><div style="position:absolute;right:8px;top:42px;width:14px;height:16px;border:2px solid #3A3AF5;border-radius:3px 3px 0 0"></div><div style="position:absolute;left:30px;top:6px;transform:rotate(-12deg)">{bird("wren-sticker-fledgling",46)}</div><div class="mono" style="position:absolute;left:0;right:0;bottom:6px;text-align:center;font-size:10px;font-weight:600;letter-spacing:1.4px;color:rgba(30,27,53,.45)">{T["day12"]}</div></div>
<div style="flex:1;padding:12px 14px;display:flex;flex-direction:column;justify-content:center;gap:5px"><div style="display:flex;align-items:center;gap:8px"><b style="font-size:15px">Juno</b><span class="mono" style="font-size:10px;letter-spacing:1.2px;font-weight:600;color:#3A3AF5;background:#ECECFE;padding:2px 6px;border-radius:4px">{T["fledgling"]}</span></div><div style="font-size:13px">{T["carrying"]}</div><div style="font-size:11px;color:rgba(30,27,53,.5)">{T["brb"]}</div></div></div>
<div style="margin:12px 22px 0 22px;background:#fff;border-radius:20px;padding:18px 18px 16px 18px;box-shadow:0 8px 24px rgba(30,27,53,.07)">
<div style="display:flex;gap:14px"><div style="flex:1"><div class="mono" style="font-size:10px;letter-spacing:2.2px;font-weight:600;color:#3A3AF5">{T["writingAura"]}</div><div style="font-size:12px;color:rgba(30,27,53,.5);margin-top:3px">{T["inYourWords"]}</div><div style="font-weight:700;font-size:30px;line-height:32px;letter-spacing:-1px;margin-top:14px">{T["quietObserver"]}</div></div>
<div style="text-align:right"><div style="font-size:13px;color:#2E7D4F">{T["formed"]}</div><div style="width:140px;height:104px;border-radius:12px;overflow:hidden;background:#E4E1FA;margin-top:10px"><img src="file://{S}/01-quiet-observer.png" style="width:140px;height:105px;object-fit:cover"></div></div></div>
<div style="font-size:15px;line-height:22px;margin-top:12px">{T["auraDesc"]}</div>
<div style="display:flex;justify-content:center;gap:8px;margin-top:14px">{stk(T["detail"],"#5B55FF","#fff",-3)}{stk(T["quiet"],"#8CC4A2","#1E1B35",2)}{stk(T["open"],"#F2887E","#1E1B35",-2)}</div>
<div style="display:flex;gap:8px;margin-top:14px"><div style="flex:1;background:#2E2A6B;border-radius:12px;padding:14px;text-align:center;color:#fff;font-weight:600;font-size:14px">{T["readPortrait"]} →</div><div style="width:52px;border:1.5px solid #DCD9F0;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px">⇧</div></div>
<div class="mono" style="font-size:10px;letter-spacing:1.4px;color:rgba(30,27,53,.5);text-align:center;margin-top:12px">{T["formedFoot"]}</div></div>
<div style="margin:12px 22px 0 22px;background:#FFFCF3;border-radius:18px;padding:16px 18px;box-shadow:0 8px 24px rgba(30,27,53,.07)"><div class="mono" style="font-size:10.5px;letter-spacing:2.2px;font-weight:600;color:#B08037">● {T["firstClass"]}</div><div class="serif" style="font-size:18.5px;margin-top:8px">{T["moreRoom"]}</div></div>
{tabbar(4)}</div>'''
s3_floats = [
    chip(T["night"], INK, "#fff", -8, 60, 620),
    chip(T["detail"], "#5B55FF", "#fff", 6, 880, 700),
    chip(T["open"], "#F2887E", INK, -5, 1090, 1240),
    chip(T["quiet"], "#8CC4A2", INK, 9, 20, 1400),
    f'<div class="float" style="left:30px;top:2480px;transform:rotate(-7deg);background:#fff;padding:12px;border-radius:22px"><img src="file://{S}/26-quiet-diarist.png" style="width:300px;height:225px;border-radius:14px;display:block"></div>',
    f'<div class="float" style="left:1060px;top:2500px;transform:rotate(8deg);background:#fff;padding:10px;border-radius:20px"><img src="file://{S}/33-quick-overthinker.png" style="width:240px;height:180px;border-radius:12px;display:block"></div>',
]
page(T["s3.h"], T["s3.sub"], phone(me, rot=4, top=900), s3_floats, "03-aura")

# ── S4 · a thread ───────────────────────────────────────────────────────────
def bubble(text, mine, when):
    side = "flex-end" if mine else "flex-start"
    bg = "#3A3AF5" if mine else "#fff"; fg = "#fff" if mine else "#1E1B35"
    return f'<div style="display:flex;flex-direction:column;align-items:{side};margin-top:12px"><div class="serif" style="max-width:290px;background:{bg};color:{fg};padding:12px 14px;border-radius:16px;font-size:15px;line-height:22px;border:{"0" if mine else "1px solid rgba(30,27,53,.1)"}">{text}</div><div class="mono" style="font-size:8.5px;letter-spacing:1px;color:rgba(30,27,53,.4);margin-top:4px">{when}</div></div>'
thread = f'''<div class="app">
<div style="padding:66px 16px 10px 16px;margin:0 16px;border-bottom:1px solid #1E1B35;display:flex;align-items:center;gap:12px"><span class="mono" style="font-size:20px">‹</span>{mosaic("blackberry",5,5)}<div><div class="mono" style="font-size:12px;letter-spacing:1.6px;font-weight:600">{T["comingIntoView"]}</div><div class="mono" style="font-size:9px;letter-spacing:1px;color:rgba(30,27,53,.45);margin-top:3px">{T["threadSub"]}</div></div></div>
<div style="padding:8px 20px 0 20px">
{bubble(T["b1"], False, "SEP 9")}
{bubble(T["b2"], True, "SEP 10")}
{bubble(T["b3"], False, "SEP 11")}
{bubble(T["b4"], True, "SEP 12")}
{bubble(T["b5"], False, "SEP 14")}
<div style="margin-top:16px;border:1px solid #9A7433;background:#FBF6E6;padding:10px 12px;display:flex;align-items:center;gap:10px"><span style="width:10px;height:10px;background:#9A7433;display:block"></span><span class="mono" style="font-size:10px;letter-spacing:1.4px;color:#8A6E20;font-weight:600">{T["nameAwaits"]}</span></div>
</div>
{tabbar(3)}</div>'''
s4_floats = [
    f'<div class="float" style="left:90px;top:600px;transform:rotate(-8deg);background:#fff;padding:22px;border-radius:26px">{mosaic("mira",22,5,PEN)}</div>',
    f'<div class="float" style="left:1000px;top:660px;transform:rotate(9deg);background:#fff;padding:22px;border-radius:26px">{mosaic("row",22,5,"#E0483C")}</div>',
    f'<div class="float" style="left:1110px;top:1560px">{envelope(290, rot=-9)}</div>',
    f'<div class="float" style="left:0px;top:1560px">{envelope(230, stamp="#8CC4A2", rot=11)}</div>',
    f'<div class="float" style="left:30px;top:2520px;transform:rotate(-10deg)">{bird("wren-sticker-adult-delight",240)}</div>',
]
page(T["s4.h"], T["s4.sub"], phone(thread, rot=0, top=900), s4_floats, "04-thread")

# ── S5 · sealed ─────────────────────────────────────────────────────────────
def face(mood):
    return f'<svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="16" fill="#FBF3C8" stroke="#1E1B35" stroke-width="1.4"/><circle cx="12" cy="15" r="1.6" fill="#1E1B35"/><circle cx="22" cy="15" r="1.6" fill="#1E1B35"/><path d="{mood}" fill="none" stroke="#1E1B35" stroke-width="1.6" stroke-linecap="round"/></svg>'
def entry(mood, when, text, seal=False):
    s = '<div style="position:absolute;right:18px;top:18px;width:38px;height:38px;border-radius:50%;background:#E0483C;box-shadow:inset 0 0 0 4px rgba(255,255,255,.4)"></div>' if seal else ""
    return f'<div style="margin:12px 16px 0 16px;background:#fff;padding:18px 18px 20px 18px;position:relative">{s}<div style="display:flex;align-items:center;gap:10px">{face(mood)}<span class="mono" style="font-size:10px;letter-spacing:1.4px;color:rgba(30,27,53,.5)">{when}</span></div><div class="serif" style="font-size:19px;line-height:29px;margin-top:14px">{text}</div></div>'
sealed = f'''<div class="app">
<div style="padding:66px 20px 10px 20px;margin:0 16px;border-bottom:1px solid #1E1B35;display:flex;justify-content:space-between"><span class="mono" style="font-size:12.5px;letter-spacing:1.6px;font-weight:600">{T["sealed"]}</span><span class="mono" style="font-size:12.5px;letter-spacing:1.2px;color:rgba(30,27,53,.5)">06</span></div>
<div class="mono" style="font-size:9.5px;letter-spacing:1.6px;color:rgba(30,27,53,.45);padding:14px 22px 0 22px">{T["moments"]}</div>
{entry("M11 22 q6 5 12 0","SEP 16 · 01:27",T["j1"], True)}
{entry("M11 22 q6 3 12 0","SEP 14 · 22:40",T["j2"])}
{entry("M11 21 h12","SEP 12 · 17:05",T["j3"])}
<div class="serif" style="position:absolute;left:0;right:0;bottom:110px;text-align:center;font-style:italic;font-size:13px;color:rgba(30,27,53,.5)">{T["noOneSees"]}</div>
{tabbar(1)}</div>'''
s5_floats = [
    '<div class="float" style="left:900px;top:560px;width:260px;height:260px;border-radius:50%;background:#E0483C;box-shadow:inset 0 0 0 16px rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;transform:rotate(-12deg)"><span class="serif" style="font-size:120px;color:rgba(255,255,255,.9)">K</span></div>',
    '<div class="float" style="left:90px;top:1520px;width:180px;height:180px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center"><svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#1E1B35" stroke-width="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>',
    f'<div class="float" style="left:1110px;top:1780px;transform:rotate(8deg)">{face("M11 22 q6 5 12 0").replace("34","200")}</div>',
    f'<div class="float" style="left:30px;top:2520px;transform:rotate(-9deg)">{bird("wren-sticker-adult-sleepy" if "wren-sticker-adult-sleepy" in DEFS else "wren-sticker-adult-content",240)}</div>',
]
page(T["s5.h"], T["s5.sub"], phone(sealed, rot=0, top=900), s5_floats, "05-sealed")

# ── S6 · First Class ────────────────────────────────────────────────────────
def benefit(glyph, title, sub):
    return f'<div style="display:flex;align-items:center;gap:12px"><span style="width:26px;height:26px;border-radius:50%;background:#E4E1FA;display:flex;align-items:center;justify-content:center;font-size:11.5px;color:#3A3AF5" class="mono">{glyph}</span><div><div style="font-weight:600;font-size:14.5px">{title}</div><div style="font-size:12px;color:rgba(30,27,53,.55);margin-top:1px">{sub}</div></div></div>'
stripe = "".join(f'<span style="flex:1;background:{"#3A3AF5" if i%4==0 else "#D8A63F" if i%4==2 else "#F9F8FF"}"></span>' for i in range(40))
fc = f'''<div class="app" style="background:#1E1B35;color:#fff">
<div style="padding:66px 14px 0 14px;display:flex;align-items:center"><span style="width:40px;font-size:24px">‹</span><span class="mono" style="flex:1;text-align:center;font-size:12px;letter-spacing:2.6px;font-weight:600;color:#D8A63F">{T["firstClass"]}</span><span style="width:40px"></span></div>
<div class="serif" style="padding:18px 22px 0 22px;font-size:34px;line-height:38px">{T["fcHead"]}</div>
<div style="padding:10px 22px 0 22px;font-size:14.5px;line-height:21px;color:rgba(255,255,255,.62)">{T["fcSub"]}</div>
<div style="margin:20px 22px 0 22px;background:#F9F8FF;border-radius:18px;overflow:hidden;color:#1E1B35"><div style="display:flex;height:6px">{stripe}</div>
<div style="padding:20px 20px 16px 20px"><div class="mono" style="display:flex;justify-content:space-between;font-size:10.5px;letter-spacing:2.2px;color:rgba(30,27,53,.5)"><span>{T["passenger"]}</span><span>{T["messenger"]}</span></div><div style="display:flex;justify-content:space-between;font-weight:700;font-size:22px;letter-spacing:-.4px;margin-top:4px"><span>sol</span><span>Juno</span></div>
<div style="margin-top:16px;display:flex;flex-direction:column;gap:11px">{benefit("◎",T["b1t"],T["b1s"])}{benefit("✉",T["b2t"],T["b2s"])}{benefit("▤",T["b3t"],T["b3s"])}{benefit("✦",T["b4t"],T["b4s"])}</div></div>
<div style="position:relative;border-top:2px dashed #C9C5E6;padding:16px 20px"><span style="position:absolute;left:-10px;top:-11px;width:20px;height:20px;border-radius:50%;background:#1E1B35"></span><span style="position:absolute;right:-10px;top:-11px;width:20px;height:20px;border-radius:50%;background:#1E1B35"></span><div style="font-size:14px;line-height:21px;color:rgba(30,27,53,.65);text-align:center">{T["freeNote"]}</div></div></div>
<div style="position:absolute;left:22px;right:22px;bottom:96px;background:#D8A63F;border-radius:14px;padding:18px;text-align:center;font-weight:700;font-size:15px;color:#1E1B35">{T["board"]} →</div>
<div class="mono" style="position:absolute;left:0;right:0;bottom:62px;text-align:center;font-size:11px;color:rgba(255,255,255,.5)">{T["legal"]}</div></div>'''
s6_floats = [
    f'<div class="float" style="left:900px;top:560px;width:200px;height:230px;background:#FBF9FF;border:5px dashed #D8A63F;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;transform:rotate(8deg)">{bird("wren-sticker-adult-delight",120)}<span class="mono" style="font-size:26px;letter-spacing:4px;font-weight:600;color:#B08037">1ST</span></div>',
    '<div class="float" style="left:70px;top:620px;width:150px;height:150px;border-radius:50%;background:#D8A63F;display:flex;align-items:center;justify-content:center;transform:rotate(-8deg)"><span class="serif" style="font-size:96px;font-weight:600;color:#1E1B35">1</span></div>',
    f'<div class="float" style="left:1090px;top:1500px">{envelope(300, stamp="#D8A63F", rot=-9)}</div>',
    f'<div class="float" style="left:0px;top:1600px">{envelope(220, stamp="#3A3AF5", rot=10)}</div>',
    f'<div class="float" style="left:40px;top:2480px;transform:rotate(-10deg)">{bird("wren-ink-fly",240)}</div>',
    f'<div class="float" style="left:1050px;top:2480px;transform:rotate(9deg)">{bird("wren-peach-fly",220)}</div>',
]
page(T["s6.h"], T["s6.sub"], phone(fc, rot=0, top=900), s6_floats, "06-first-class")
