# Comparison sheet for the blue tiles: big, among the top social apps' colours (flat tiles, no
# marks), and small. python3 design/app-icon-wren/blue/sheet.py  ->  blue/compare.png
import json, os
from PIL import Image, ImageDraw, ImageFont
H = os.path.dirname(os.path.abspath(__file__))
O = os.path.join(H, "out")
data = json.load(open(os.path.join(O, "contrast.json")))
order = ["yellow", "mist", "sky", "clear", "royal", "royalLight", "night"]
def font(sz, bold=False):
    for p in ["/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()
F, FB, FS = font(30), font(36), font(22)
def rounded(im, r):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r, fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0)); out.paste(im, (0, 0), m); return out
# the neighbours: the dominant colour of top US social apps (App Store, Social Networking, free, 2026-11-13)
NB = [("Facebook", "#0866FF"), ("Threads", "#000000"), ("WhatsApp", "#25D366"), ("Discord", "#5865F2"), None, ("Telegram", "#2AABEE"), ("Signal", "#3A76F0"), ("Locket", "#FFB800"), ("Life360", "#8250F0")]
COL = 330; BIG = 260; T = 84; GAP = 22
W = COL * len(order) + 40; Hh = 1180
sheet = Image.new("RGB", (W, Hh), (246, 245, 249)); d = ImageDraw.Draw(sheet)
for i, k in enumerate(order):
    x0 = 20 + i * COL
    big = Image.open(os.path.join(O, f"{k}.png")).convert("RGB").resize((BIG, BIG), Image.LANCZOS)
    sheet.paste(rounded(big, int(BIG * 0.2237)), (x0 + (COL - BIG) // 2, 40), rounded(big, int(BIG * 0.2237)))
    d.text((x0 + 18, 320), data[k]["name"], font=F, fill=(30, 27, 53))
    c = min(data[k]["bodyVsTile"])
    mark, col = ("  ✓ clear", (85, 80, 110)) if c >= 3 else (("  ~ borderline", (176, 112, 20)) if c >= 2.5 else ("  ✗ melts", (190, 40, 60)))
    d.text((x0 + 18, 360), f"Wren vs tile {c}:1" + mark, font=FS, fill=col)
    # the neighbourhood, on a light wallpaper
    gx = x0 + (COL - (3 * T + 2 * GAP)) // 2; gy = 420
    d.rounded_rectangle([x0 + 8, gy - 22, x0 + COL - 8, gy + 3 * (T + 40) + 6], 26, fill=(226, 224, 234))
    small = Image.open(os.path.join(O, f"{k}-180.png")).convert("RGB").resize((T, T), Image.LANCZOS)
    for j, nb in enumerate(NB):
        cx = gx + (j % 3) * (T + GAP); cy = gy + (j // 3) * (T + 40)
        if nb is None:
            sheet.paste(rounded(small, int(T * 0.2237)), (cx, cy), rounded(small, int(T * 0.2237)))
            d.text((cx + 4, cy + T + 6), "Kindredly", font=FS, fill=(30, 27, 53))
        else:
            d.rounded_rectangle([cx, cy, cx + T, cy + T], int(T * 0.2237), fill=nb[1])
            d.text((cx + 4, cy + T + 6), nb[0], font=FS, fill=(110, 106, 130))
    # small: settings-row size and notification size
    sy = 900
    for n, sz in enumerate([58, 40, 29]):
        s2 = Image.open(os.path.join(O, f"{k}-180.png")).convert("RGB").resize((sz, sz), Image.LANCZOS)
        sheet.paste(rounded(s2, int(sz * 0.2237)), (x0 + 30 + n * 90, sy), rounded(s2, int(sz * 0.2237)))
    # on a dark wallpaper
    d.rounded_rectangle([x0 + 8, 990, x0 + COL - 8, 1150], 26, fill=(28, 28, 32))
    sheet.paste(rounded(small, int(T * 0.2237)), (x0 + (COL - T) // 2, 1012), rounded(small, int(T * 0.2237)))
d.text((20, Hh - 26), "neighbours = the dominant colour of each app's icon, as flat tiles (no marks) · top free Social Networking, US App Store, 2026-11-13", font=FS, fill=(110, 106, 130))
sheet.save(os.path.join(H, "compare.png")); print(sheet.size)
