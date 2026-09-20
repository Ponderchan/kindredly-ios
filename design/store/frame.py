#!/usr/bin/env python3
"""Frame the REAL screenshots (design/store/shots/<lang>/NN.png, from
capture.sh) for the store: 1320×2868, the phone at the bottom, the headline
above it, in the language. python3 frame.py all | <lang>"""
import os, subprocess, sys
S = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, S)
from copy2 import COPY, STORY
from build2 import DEFS, bird, envelope, chip, blob, mosaic, INK, PEN, WASH, GREEN
import appdata as A
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"]

HEAD = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@500&family=IBM+Plex+Mono:wght@600&display=block" rel="stylesheet">
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
.head{position:absolute;left:100px;right:100px;top:150px}
.eyebrow{display:inline-block;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:26px;letter-spacing:.22em;color:#3B35E0;border:3px solid #3B35E0;border-radius:999px;padding:12px 26px;margin-bottom:34px;background:#fff}
.inset{position:absolute;left:50px;top:1500px;width:660px;border-radius:44px;overflow:hidden;box-shadow:0 30px 70px rgba(17,17,19,.35);background:#000}
.inset img{width:100%;display:block}
.tag{position:absolute;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:22px;letter-spacing:.2em;color:#fff;background:#111113;border-radius:999px;padding:10px 20px}
.h1{font-family:'Fraunces','Hiragino Mincho ProN','Apple SD Gothic Neo',serif;font-weight:600;line-height:1.02;letter-spacing:-.02em;font-variation-settings:'opsz' 144}
.sub{margin-top:34px;line-height:1.32;color:rgba(17,17,19,.66);max-width:1040px;font-weight:500}
.phone{position:absolute;left:50%;width:990px;height:2150px;margin-left:-495px;top:760px;border-radius:150px;background:#0B0A14;padding:18px;box-shadow:0 60px 120px rgba(17,17,19,.28),0 10px 30px rgba(17,17,19,.2)}
.screen{width:100%;height:100%;border-radius:132px;overflow:hidden;background:#000}
.screen img{width:100%;height:100%;display:block;object-fit:cover}
.float{position:absolute;filter:drop-shadow(0 30px 40px rgba(17,17,19,.22))}
.sticker{display:inline-block;background:#fff;padding:7px;border-radius:999px;box-shadow:0 18px 40px rgba(17,17,19,.22)}
.sticker i{display:block;font-style:normal;font-weight:700;font-size:44px;padding:18px 40px;border-radius:999px;letter-spacing:-.01em}
.blob{position:absolute;border-radius:50%}
</style></head><body><div class="bg"></div><div class="grid"></div>
""" + DEFS

def stamp_chip(lang, sid, rot, x, y):
    st = A.STAMP_BY_ID[sid]
    return chip("#" + A.stamp_name(lang, sid).lower(), st["color"], "#fff", rot, x, y, 40)

# what floats around each frame — two or three pieces of the app's own art,
# top-right of the words and bottom-left on the bezel; nothing over the screen
STICKERS = {
    "01": lambda l: [f'<div class="float" style="left:1010px;top:590px;transform:rotate(12deg)">{bird("wren-sticker-fly",210)}</div>'],
    "02": lambda l: [f'<div class="float" style="left:1030px;top:600px;transform:rotate(10deg)">{A.stamp_svg("crush",190)}</div>'],
    "12": lambda l: [f'<div class="float" style="left:1020px;top:590px;transform:rotate(-8deg)">{bird("wren-sticker-adult-sleepy",210)}</div>'],
    "05": lambda l: [f'<div class="float" style="left:1040px;top:610px;transform:rotate(9deg);background:#fff;padding:18px;border-radius:22px">{mosaic("mira",18,5,PEN)}</div>'],
    "03": lambda l: [chip("#" + COPY[l]["word"], WASH, PEN, -6, 960, 640)],
    "04": lambda l: [chip(A.t(l, "wo.tag"), PEN, "#fff", 8, 1000, 640)],
    "09": lambda l: [f'<div class="float" style="left:1010px;top:590px;transform:rotate(10deg)">{bird("wren-peach-fly",210)}</div>'],
    "07": lambda l: [chip(COPY[l]["night"], INK, "#fff", -8, 960, 640)],
    "06": lambda l: [f'<div class="float" style="left:1030px;top:600px;transform:rotate(12deg)">{A.mood_svg("cheerful",200)}</div>'],
    "10": lambda l: ['<div class="float" style="left:1040px;top:610px;width:150px;height:150px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;transform:rotate(-8deg)"><svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="#111113" stroke-width="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>'],
}

def frame(lang):
    cjk = lang in ("ja", "ko")
    out = f"{S}/v121-real/{lang}"; os.makedirs(out, exist_ok=True)
    for i, (shot, eyebrow, h1, sub) in enumerate(STORY[lang], 1):
        src = f"{S}/shots/{lang}/{shot}.png"
        if not os.path.exists(src):
            print("missing", lang, shot); continue
        n = len(h1)
        h1px = 112 if n <= 30 else 100 if n <= 38 else 88 if n <= 46 else 78
        if cjk: h1px = 88 if n <= 14 else 78 if n <= 20 else 68
        subpx = 42 if len(sub) <= 100 else 38 if len(sub) <= 130 else 35
        if cjk: subpx = 40 if len(sub) <= 48 else 36
        rot = [-4, 3, 0, -3, 3, -3, 0, 3, -4, 0][i - 1]
        inset = ""
        if shot == "12":
            # the island rides along on the lock-screen frame: the top of the home-screen shot
            isl = f"{S}/shots/{lang}/11.png"
            if os.path.exists(isl):
                # the island only: the first 250px of the home screen, cropped to the notch's width
                inset = f'<div class="inset"><div style="height:200px;overflow:hidden"><img src="file://{isl}" style="width:1400px;margin-left:-400px;margin-top:-12px"></div></div><div class="tag" style="left:70px;top:1445px">ON THE ISLAND</div>'
        floats = STICKERS.get(shot, lambda T: [])(lang)
        html = HEAD + "".join(floats) + f'<div class="head"><div class="eyebrow">{eyebrow}</div><div class="h1" style="font-size:{h1px}px">{h1}</div><div class="sub" style="font-size:{subpx}px">{sub}</div></div>' \
             + f'<div class="phone" style="transform:rotate({rot}deg)"><div class="screen"><img src="file://{src}"></div></div>{inset}</body></html>'
        name = f"{i:02d}"
        p = f"{out}/{name}.html"; open(p, "w", encoding="utf8").write(html)
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                        "--window-size=1320,2868", "--virtual-time-budget=12000", f"--screenshot={out}/{name}.png", "file://" + p],
                       check=True, capture_output=True)
        os.remove(p); print("framed", lang, name)

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "en"
    for lang in ([l for l in LANGS if l in STORY] if arg == "all" else [arg]): frame(lang)
