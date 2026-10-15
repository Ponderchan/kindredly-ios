import re, sys
V = sys.argv[1] if len(sys.argv) > 1 else "a"
FAM = open("/Users/redbeardlord/Desktop/claude-projects/kindredly-ios/design/wren-family.svg").read()
ST = open("/Users/redbeardlord/Desktop/claude-projects/kindredly-ios/design/stamp-colours.svg").read()
syms = dict(re.findall(r'<symbol id="([^"]+)"[^>]*>(.*?)</symbol>', FAM, re.S))
stamps = dict(re.findall(r'<symbol id="([^"]+)"[^>]*>(.*?)</symbol>', ST, re.S))
bird = re.sub(r'\s*stroke="#FFFFFF" stroke-width="[\d.]+"', "", syms["base-fly"])   # no white ring (owner)
FONT = "/Users/redbeardlord/Desktop/claude-projects/kindredly-ios/node_modules/@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf"
INK, PAPER, ACID = "#1E1B35", "#FFFFFF", "#C3E84F"
W, H = 2622, 1475

def stamp(name, size):
    return f'<svg class="stamp" viewBox="0 0 64 64" width="{size}" height="{size}">{stamps[name]}</svg>'

def mosaic(seed, cell):
    h = sum(ord(c) * (i + 7) for i, c in enumerate(seed)) & 0xffffffff
    out = []
    for y in range(5):
        for x in range(3):
            h = (h * 1103515245 + 12345) & 0xffffffff
            if (h >> 16) % 100 < 48:
                for xx in {x, 4 - x}:
                    out.append(f'<rect x="{xx*cell}" y="{y*cell}" width="{cell-1}" height="{cell-1}" fill="{INK}"/>')
    return f'<svg width="{5*cell}" height="{5*cell}">{"".join(out)}</svg>'

def card(x, y, w, rot, st, seed, lines):
    h = round(w * 0.72)
    bars = "".join(f'<i style="width:{p}%"></i>' for p in lines)
    return f'''<div class="card" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;transform:translate(-50%,-50%) rotate({rot}deg)">
      <div class="head">{mosaic(seed, round(w/34))}</div>
      <div class="bars">{bars}</div>
      <div class="st">{stamp(st, round(w*0.27))}</div></div>'''

def envelope(x, y, w, rot, st):
    h = round(w * 0.66)
    return f'''<div class="env" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;transform:translate(-50%,-50%) rotate({rot}deg)">
      <svg viewBox="0 0 100 66" preserveAspectRatio="none" width="100%" height="100%"><path d="M3,6 L50,40 L97,6" fill="none" stroke="#D9CFB8" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
      <div class="st">{stamp(st, round(w*0.25))}</div></div>'''

items = [
  envelope(735, 815, 320, -10, "stamp-made-my-day"),
  envelope(1870, 790, 320, 8, "stamp-crush"),
]
# the flight: from the lower-left letter, under and behind her, up to the right-hand letter
path = "M 905 760 C 955 700, 995 675, 1035 665"
path2 = "M 1565 650 C 1630 630, 1680 650, 1712 705"
mark = {"a": f"box-shadow: inset 0 -0.30em 0 {ACID}; color:{PAPER}",
        "b": f"color:{ACID}",
        "c": f"color:{PAPER}"}[V]
html = f'''<!doctype html><meta charset="utf-8"><style>
@font-face {{ font-family: Brico; src: url("file://{FONT}"); font-weight: 800; }}
html,body {{ margin:0; width:{W}px; height:{H}px; background:{INK}; overflow:hidden }}
.stage {{ position:relative; width:{W}px; height:{H}px; }}
.card, .env {{ position:absolute; background:{PAPER}; border-radius:22px; box-shadow: 14px 14px 0 rgba(0,0,0,.35); }}
.env {{ background:#F6F1E4; border-radius:16px }}
.card .head {{ position:absolute; left:8%; top:10% }}
.card .bars {{ position:absolute; left:8%; right:8%; top:40%; display:flex; flex-direction:column; gap:11%; height:46% }}
.card .bars i {{ display:block; height:12px; border-radius:6px; background:rgba(30,27,53,.16) }}
.st {{ position:absolute; right:6%; top:7%; transform: rotate(6deg) }}
.env .st {{ right:7%; top:10% }}
.flight {{ position:absolute; inset:0 }}
.bird {{ position:absolute; left:{W/2 - 320}px; top:330px; width:640px; height:640px; transform: rotate(-6deg) }}
.word {{ position:absolute; left:0; right:0; top:985px; text-align:center; font: 800 250px/1 Brico; letter-spacing:-0.035em; }}
.word span {{ {mark}; padding: 0 .04em }}
</style><div class="stage">
<svg class="flight" width="{W}" height="{H}"><path d="{path}" fill="none" stroke="rgba(255,255,255,.34)" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 26"/><path d="{path2}" fill="none" stroke="rgba(255,255,255,.34)" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 26"/></svg>
{"".join(items)}
<svg class="bird" viewBox="0 0 200 200">{bird}</svg>
<div class="word"><span>kindredly</span></div>
</div>'''
open(f"header-{V}.html", "w").write(html)
