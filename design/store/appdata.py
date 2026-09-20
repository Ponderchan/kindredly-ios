"""The app's own words and art, read straight from the source — so a store
screenshot never says something the app doesn't. strings.ts gives every UI
label in nine languages; stamps.ts the 36 stamps with their names and
colours; moods.ts the thirty moods; mood-art.ts and stamp-art.ts the shapes."""
import json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "src")
LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"]

def _blocks(path):
    s = open(path, encoding="utf8").read()
    heads = [m.start() for m in re.finditer(r"\n  /\* ── ([a-zA-Z-]+) ── \*/\n  \{\n", s)]
    names = re.findall(r"\n  /\* ── ([a-zA-Z-]+) ── \*/\n  \{\n", s)
    out = {}
    for i, start in enumerate(heads):
        end = heads[i + 1] if i + 1 < len(heads) else len(s)
        block = s[start:end]
        d = {}
        for k, v in re.findall(r'^    "([^"]+)": "((?:[^"\\]|\\.)*)",?$', block, re.M):
            d[k] = v.replace('\\"', '"').replace("\\n", "\n")
        out[names[i]] = d
    return out

STRINGS = _blocks(os.path.join(SRC, "data", "strings.ts"))
STRINGS["pt"] = STRINGS.get("pt") or STRINGS.get("pt-BR")

def t(lang, key, **vars):
    v = STRINGS.get(lang, {}).get(key) or STRINGS["en"].get(key) or key
    for k, val in vars.items():
        v = v.replace("{" + k + "}", str(val))
    return v

# ── stamps ──────────────────────────────────────────────────────────────
_st = open(os.path.join(SRC, "data", "stamps.ts"), encoding="utf8").read()
STAMPS = []
for sid, cat, color, names in re.findall(r'\{ id: "([a-z-]+)", cat: "([a-z-]+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})", name: \{([^}]*)\}', _st):
    STAMPS.append({"id": sid, "cat": cat, "color": color, "name": dict(re.findall(r'(\w+): "([^"]*)"', names))})
STAMP_BY_ID = {s["id"]: s for s in STAMPS}

def stamp_name(lang, sid):
    n = STAMP_BY_ID[sid]["name"]
    return n.get(lang) or n["en"]

# ── shapes → svg ────────────────────────────────────────────────────────
def _shape(sh):
    a = []
    if sh.get("f") is not None: a.append(f'fill="{sh["f"]}"')
    if sh.get("s"): a.append(f'stroke="{sh["s"]}"')
    if sh.get("sw"): a.append(f'stroke-width="{sh["sw"]}"')
    if sh.get("lc"): a.append(f'stroke-linecap="{sh["lc"]}"')
    if sh.get("lj"): a.append(f'stroke-linejoin="{sh["lj"]}"')
    if sh.get("da"): a.append(f'stroke-dasharray="{sh["da"]}"')
    if sh.get("o"): a.append(f'opacity="{sh["o"]}"')
    if sh.get("tf"): a.append(f'transform="{sh["tf"]}"')
    attrs = " ".join(a)
    k = sh.get("t", "p")
    if k == "p": return f'<path d="{sh["d"]}" {attrs}/>'
    if k == "c": return f'<circle cx="{sh["cx"]}" cy="{sh["cy"]}" r="{sh["r"]}" {attrs}/>'
    if k == "e": return f'<ellipse cx="{sh["cx"]}" cy="{sh["cy"]}" rx="{sh["rx"]}" ry="{sh["ry"]}" {attrs}/>'
    if k == "r": return f'<rect x="{sh["x"]}" y="{sh["y"]}" width="{sh["w"]}" height="{sh["h"]}" {attrs}/>'
    return ""

def _art_table(fname, const):
    s = open(os.path.join(SRC, "data", fname), encoding="utf8").read()
    m = re.search(const + r"[^=]*=\s*(\{.*\});", s, re.S)
    return json.loads(m.group(1))

STAMP_ART = _art_table("stamp-art.ts", "STAMP_ART")
MOOD_ART = _art_table("mood-art.ts", "MOOD_ART")

def stamp_svg(sid, size):
    shapes = STAMP_ART.get(f"stamp-{sid}")
    if not shapes:
        c = STAMP_BY_ID[sid]["color"]
        return f'<svg width="{size}" height="{size}" viewBox="0 0 64 64"><path d="M8,3h48q5,0 5,5v48q0,5 -5,5H8q-5,0 -5,-5V8q0,-5 5,-5Z" fill="#fff" stroke="{c}" stroke-width="2.4" stroke-dasharray="0.5 5"/><path d="M9,9h46v46H9Z" fill="{c}1c"/></svg>'
    return f'<svg width="{size}" height="{size}" viewBox="0 0 64 64">{"".join(_shape(x) for x in shapes)}</svg>'

def mood_svg(mid, size):
    shapes = MOOD_ART.get(f"mood-{mid}", [])
    return f'<svg width="{size}" height="{size}" viewBox="0 0 60 60">{"".join(_shape(x) for x in shapes)}</svg>'

# ── moods ───────────────────────────────────────────────────────────────
_md = open(os.path.join(SRC, "data", "moods.ts"), encoding="utf8").read()
_mi = _md.index("= [", _md.index("export const MOOD_IDS"))
MOOD_IDS = re.findall(r'"([a-z-]+)"', _md[_mi:_md.index("]", _mi)])
_en_names = dict(re.findall(r'"([a-z-]+)":\s*\{\s*id: "[a-z-]+",\s*n: "([^"]+)"', _md)) or {}
_loc = {}
for mid, body in re.findall(r'\n  "([a-z-]+)": \{ (es: "[^"]*"(?:, \w+: "[^"]*")*) \}', _md):
    _loc[mid] = dict(re.findall(r'(\w+): "([^"]*)"', body))

def mood_name(lang, mid):
    if lang != "en" and mid in _loc and lang in _loc[mid]:
        return _loc[mid][lang]
    if mid in _en_names: return _en_names[mid]
    m = re.search(r'"' + re.escape(mid) + r'":\s*\{[^}]*?n:\s*"([^"]+)"', _md)
    return m.group(1) if m else mid

if __name__ == "__main__":
    print(len(STRINGS), {k: len(v) for k, v in STRINGS.items()})
    print(len(STAMPS), STAMPS[0]["id"], stamp_name("de", "never-told"), len(STAMP_ART), len(MOOD_ART))
    print(MOOD_IDS[:5], mood_name("fr", "calm"), mood_name("en", "over-it"))
    print(t("de", "kd.kindredsN", n=2), "|", t("ja", "gd.kindreds.title"))
