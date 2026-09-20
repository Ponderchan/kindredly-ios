#!/usr/bin/env python3
"""The owner's design doc (Store Shots GenZ.dc.html, V1 "Sticker Zine") with
the app's own art dropped in: every placeholder bird becomes the real
WrenBird, the mood faces the real mood art, the stamps the real stamps,
and V2's airmail route (dotted line, three envelopes, the courier at the
end) crosses the phone's shoulder on every screen. Rendered 645×1398 @2x
= 1290×2796, ten screens. python3 genz.py <path-to-dc.html> <out-dir>"""
import os, re, subprocess, sys
S = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, S)
import appdata as A

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEFS = open(S + "/defs.svg.html", encoding="utf8").read()
doc = open(SRC, encoding="utf8").read()

helmet = re.search(r"<helmet>(.*?)</helmet>", doc, re.S).group(1)
secs = [m.start() for m in re.finditer(r"<section", doc)]
v1, v2 = doc[secs[0]:secs[1]], doc[secs[1]:]
frames = lambda v: [m.start() for m in re.finditer(r'<div[^>]*width:645px;height:1398px', v)]
F1, F2 = frames(v1), frames(v2)

def bird(sym, size, style=""):
    return f'<svg viewBox="0 0 200 200" width="{size}" height="{size}"{f" style={chr(34)}{style}{chr(34)}" if style else ""}><use href="#{sym}"/></svg>'

# ── V2's route, with the real courier at its end ───────────────────────
route = re.search(r'<svg viewBox="0 0 645 160".*?</svg>', v2[F2[0]:F2[1]], re.S).group(0)
route = re.sub(r'<g transform="translate\(590 46\)">.*?</g>', '<svg x="486" y="8" viewBox="0 0 200 200" width="58" height="58"><use href="#wren-sticker-fly"/></svg>', route, flags=re.S)
route = route.replace('stroke="#1E1B35" stroke-width="2" stroke-dasharray="4 8" opacity=".55"', 'stroke="#1E1B35" stroke-width="2" stroke-dasharray="4 8" opacity=".6"')

MOODS = {"CALM": "calm", "NUMB": "numb", "CONTENT": "content", "IN LOVE": "in-love", "SURPRISED": "surprised", "SHOCKED": "shocked", "FRUSTRATED": "frustrated", "STUNNED": "stunned", "CHEERFUL": "cheerful", "PLEASED": "pleased", "SLEEPY": "sleepy", "IRRITABLE": "irritable", "AMAZED": "amazed", "ANGRY": "angry", "OKAY": "okay"}
# the journal list's faces are only a colour in the design: colour → mood
FACE_BY_COLOUR = {"#E8E8F6": "sleepy", "#F2A96B": "content", "#F2C33A": "cheerful", "#B6B6C2": "numb", "#FF7AB6": "in-love", "#A9C6F2": "calm"}
STAMPS = {"ORDINARY": "ordinary", "COMFORT": "comfort", "MADE MY DAY": "made-my-day", "OFF MY CHEST": "off-chest", "CRUSH": "crush", "CAN’T SLEEP": "cant-sleep", "CAN'T SLEEP": "cant-sleep"}

def transform(frame, n):
    f = frame
    # 1 · the birds: small inline ones perch, the badge and hero ones fly / delight
    def rb(m):
        w = float(m.group(1)); style = m.group(3) or ""
        if w >= 200: return bird("wren-sticker-adult-content", int(w * 0.95), style)
        if w >= 40: return bird("wren-sticker-fly", int(w * 1.15), style)
        return bird("wren-sticker-adult-content", int(w * 1.3), style)
    f = re.sub(r'<svg viewBox="0 0 28 22" width="([\d.]+)" height="([\d.]+)"(?: style="([^"]*)")?>.*?</svg>', rb, f, flags=re.S)
    # 2 · the mood tray (frame 9): the coloured square + drawn face → the real face
    def rm(m):
        mid = MOODS.get(m.group(2).strip())
        if not mid: return m.group(0)
        return f'<span style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;flex:none">{A.mood_svg(mid, 54)}</span>{m.group(1)}{m.group(2)}</span>'
    f = re.sub(r'<span style="width:54px;height:54px;[^"]*">\s*<svg viewBox="0 0 24 24"(?:(?!</svg>).)*</svg>\s*</span>(\s*<span[^>]*>)([A-Z ]+)</span>', rm, f, flags=re.S)
    # the star sticker on frame 9 is a cheerful face
    f = re.sub(r'<svg viewBox="0 0 60 60" width="86" height="86">(?:(?!</svg>).)*</svg>', A.mood_svg("cheerful", 86), f, flags=re.S)
    # 3 · the journal list's faces (frame 10): colour → mood
    def rf(m):
        col = m.group(1); mid = FACE_BY_COLOUR.get(col)
        if not mid: return m.group(0)
        return f'<span style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;flex:none">{A.mood_svg(mid, 30)}</span>'
    f = re.sub(r'<span style="width:30px;height:30px;border-radius:50%;background:(#[0-9A-Fa-f]{6});[^"]*">\s*<svg viewBox="0 0 24 24"(?:(?!</svg>).)*</svg>\s*</span>', rf, f, flags=re.S)
    # 4 · the stamps: dashed boxes with an icon → the real stamp, its label kept
    def rs(m):
        size = m.group(1); label = m.group(3).strip()
        sid = STAMPS.get(label)
        if not sid: return m.group(0)
        return f'<span style="width:{size}px;height:{size}px;display:flex;align-items:center;justify-content:center;flex:none">{A.stamp_svg(sid, int(float(size)))}</span>{m.group(2)}{m.group(3)}</span>'
    f = re.sub(r'<span style="width:([\d.]+)px;height:[\d.]+px;[^"]*border:1\.5px dashed[^"]*">\s*<svg viewBox="0 0 24 24"(?:(?!</svg>).)*</svg>\s*</span>(\s*<span[^>]*>)([^<]{3,24})</span>', rs, f, flags=re.S)
    # the heart in a dashed pink box, wherever it stands alone (frame 2's sticker and its stamp key), is the crush stamp
    f = re.sub(r'<span style="width:([\d.]+)px;height:[\d.]+px;[^"]*border:1\.5px dashed #D63A6F[^"]*">\s*<svg viewBox="0 0 24 24"(?:(?!</svg>).)*</svg>\s*</span>', lambda m: f'<span style="width:{m.group(1)}px;height:{m.group(1)}px;display:flex;flex:none">{A.stamp_svg("crush", int(float(m.group(1))))}</span>', f, flags=re.S)
    # the moon in a dashed box (Today's card, frame 1) is the can't-sleep stamp
    f = re.sub(r'<span style="width:36px;height:36px;[^"]*border:1\.5px dashed #1E1B35[^"]*">\s*<svg viewBox="0 0 24 24"(?:(?!</svg>).)*</svg>\s*</span>', lambda m: f'<span style="width:36px;height:36px;display:flex;flex:none">{A.stamp_svg("cant-sleep", 36)}</span>', f, flags=re.S)
    # 5 · V2's route over the phone's shoulder
    f = re.sub(r'(<div id="zine-\d+"[^>]*>)', lambda m: m.group(1) + route, f, count=1)
    return f

for i, start in enumerate(F1):
    end = F1[i + 1] if i + 1 < len(F1) else len(v1)
    frame = v1[start:end]
    # trim to the frame's own closing: it is the last top-level div before the next frame
    frame = frame[: frame.rfind("</div>") + 6] if i + 1 < len(F1) else frame[: frame.rfind("</div></div></section>")]
    html = f'<!doctype html><html><head><meta charset="utf-8">{helmet}<style>body{{margin:0;background:#F4EFE4;width:645px;height:1398px;overflow:hidden}}</style></head><body>{DEFS}{transform(frame, i + 1)}</body></html>'
    p = f"{OUT}/{i + 1:02d}.html"; open(p, "w", encoding="utf8").write(html)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", "--window-size=645,1398", "--virtual-time-budget=12000", f"--screenshot={OUT}/{i + 1:02d}.png", "file://" + p], check=True, capture_output=True)
    os.remove(p); print("rendered", i + 1)
