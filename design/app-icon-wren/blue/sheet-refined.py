# The refined blue peek against the real blue-tile apps (reference icons from the session crawl).
# python3 design/app-icon-wren/blue/sheet-refined.py <ref rows.json> -> blue/compare-refined.png
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
H = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(H, "refined"); G = os.path.join(H, "glass")
rows = {r["name"]: r for r in json.load(open(sys.argv[1]))}; RD = os.path.dirname(os.path.abspath(sys.argv[1]))
def ref(p):
    for n, r in rows.items():
        if n.startswith(p): return Image.open(os.path.join(RD, r["file"])).convert("RGB")
F28, F22, F18 = (ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", z) for z in (28, 22, 18))
def rounded(im, sz):
    im = im.resize((sz, sz), Image.LANCZOS); m = Image.new("L", (sz, sz), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, sz - 1, sz - 1], int(sz * 0.2237), fill=255); return im, m
V = [(os.path.join(G, "blue-peek"), "before (round 2)"), (os.path.join(D, "cobalt-clean"), "A · cobalt, no belly (pick)"), (os.path.join(D, "cobalt-fine"), "B · cobalt, belly"), (os.path.join(D, "ocean-clean"), "C · ocean, no belly")]
COL = 560; s = Image.new("RGB", (len(V) * COL + 20, 1080), (246, 245, 249)); d = ImageDraw.Draw(s)
for i, (f, label) in enumerate(V):
    x0 = 20 + i * COL
    im, m = rounded(Image.open(f + ".png").convert("RGB"), 300); s.paste(im, (x0 + 130, 24), m)
    d.text((x0 + 130, 336), label, font=F28, fill=(30, 27, 53))
    y = 390; d.rounded_rectangle([x0, y, x0 + COL - 40, y + 150], 24, fill=(255, 255, 255))
    im, m = rounded(Image.open(f + ".png").convert("RGB"), 120); s.paste(im, (x0 + 16, y + 15), m)
    d.text((x0 + 152, y + 22), "Kindredly", font=F28, fill=(17, 17, 19)); d.text((x0 + 152, y + 60), "Slow letters to strangers", font=F22, fill=(130, 128, 140))
    NB = ["Facebook", "Bluesky", "Signal", "Messenger", None, "Telegram", "Discord", "LinkedIn", "GroupMe"]
    gy = 570; d.rounded_rectangle([x0, gy, x0 + COL - 40, gy + 420], 28, fill=(226, 224, 234))
    for j, nb in enumerate(NB):
        cx = x0 + 50 + (j % 3) * 170; cy = gy + 24 + (j // 3) * 130
        src = Image.open(f + "-180.png").convert("RGB") if nb is None else ref(nb)
        if src is None: continue
        im, m = rounded(src, 92); s.paste(im, (cx, cy), m); d.text((cx, cy + 96), "Kindredly" if nb is None else nb, font=F18, fill=(60, 58, 72))
d.text((20, 1050), "neighbours: real icons from the US App Store (reference only)", font=F18, fill=(110, 106, 130))
s.save(os.path.join(H, "compare-refined.png")); print(s.size)
