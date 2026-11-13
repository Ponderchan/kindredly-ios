# Round 2 sheet: white Wren on blue, against the real blue-tile social apps (crawled 2026-11-13 from
# the US App Store's Social Networking charts; scratchpad reference only, never shipped).
# python3 design/app-icon-wren/blue/sheet-glass.py <ref rows.json>  ->  blue/compare-glass.png
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
H = os.path.dirname(os.path.abspath(__file__)); G = os.path.join(H, "glass")
rows = {r["name"]: r for r in json.load(open(sys.argv[1]))}
REFDIR = os.path.dirname(os.path.abspath(sys.argv[1]))
def ref(prefix):
    for n, r in rows.items():
        if n.startswith(prefix): return Image.open(os.path.join(REFDIR, r["file"])).convert("RGB")
    raise SystemExit(prefix)
def font(sz, w="Regular"):
    for p in ["/System/Library/Fonts/SFNS.ttf"]:
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()
F36, F28, F22, F18 = font(36), font(28), font(22), font(18)
def rounded(im, size):
    im = im.resize((size, size), Image.LANCZOS)
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], int(size * 0.2237), fill=255)
    return im, m
V = [("blue-peek", "1 · blue · peek"), ("blue-whole", "2 · blue · whole"), ("sky-peek", "3 · sky · peek"), ("sky-whole", "4 · sky · whole")]
W, Hh = 2280, 1560
s = Image.new("RGB", (W, Hh), (246, 245, 249)); d = ImageDraw.Draw(s)
COL = 560
for i, (k, label) in enumerate(V):
    x0 = 20 + i * COL
    im, m = rounded(Image.open(os.path.join(G, f"{k}.png")).convert("RGB"), 300); s.paste(im, (x0 + 110, 30), m)
    d.text((x0 + 110, 345), label, font=F36, fill=(30, 27, 53))
    # the App Store list row, as the owner's screenshot shows them
    y = 410; d.rounded_rectangle([x0, y, x0 + COL - 30, y + 150], 24, fill=(255, 255, 255))
    im, m = rounded(Image.open(os.path.join(G, f"{k}.png")).convert("RGB"), 120); s.paste(im, (x0 + 16, y + 15), m)
    d.text((x0 + 152, y + 22), "Kindredly", font=F28, fill=(17, 17, 19)); d.text((x0 + 152, y + 60), "Slow letters to strangers", font=F22, fill=(130, 128, 140))
    d.rounded_rectangle([x0 + 152, y + 98, x0 + 252, y + 136], 19, fill=(238, 238, 240)); d.text((x0 + 182, y + 104), "Get", font=F22, fill=(10, 122, 255))
    # among the blue-tile social apps on a home screen (light, then dark)
    NB = ["Facebook", "Bluesky", "Signal", "Discord", None, "Roost", "Bottled", "LinkedIn", "GroupMe"]
    for row, (bg, ink) in enumerate([((226, 224, 234), (60, 58, 72)), ((28, 28, 32), (200, 200, 210))]):
        gy = 600 + row * 420; d.rounded_rectangle([x0, gy, x0 + COL - 30, gy + 400], 28, fill=bg)
        for j, nb in enumerate(NB):
            cx = x0 + 40 + (j % 3) * 165; cy = gy + 22 + (j // 3) * 125
            src = Image.open(os.path.join(G, f"{k}-180.png")).convert("RGB") if nb is None else ref(nb)
            im, m = rounded(src, 88); s.paste(im, (cx, cy), m)
            d.text((cx, cy + 92), "Kindredly" if nb is None else nb, font=F18, fill=ink)
    # small sizes
    for n, sz in enumerate([58, 40, 29]):
        im, m = rounded(Image.open(os.path.join(G, f"{k}-180.png")).convert("RGB"), sz); s.paste(im, (x0 + 40 + n * 100, 1500 - sz), m)
d.text((20, Hh - 30), "neighbours: real icons of blue-tile social apps, US App Store charts 2026-11-13 (reference only). Violet was dropped: Roost, a pen-pal app, is a white bird on deep indigo.", font=F18, fill=(110, 106, 130))
s.save(os.path.join(H, "compare-glass.png")); print(s.size)
