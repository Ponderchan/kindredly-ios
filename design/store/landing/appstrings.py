"""The app's own words, read from src/data/strings.ts and src/data/stamps.ts,
so a label drawn on a store frame says exactly what the app says in that
language (the coat names, FIRST CLASS, SWAP NAMES?, the sticker names …)."""
import os, re
IOS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_SRC = open(os.path.join(IOS, "src", "data", "strings.ts"), encoding="utf8").read()
_MARK = re.compile(r"^  /\* ── ([a-z]{2})(?:-[A-Z]{2})? ── \*/$", re.M)
_BLOCKS = {}
_ms = list(_MARK.finditer(_SRC))
for i, m in enumerate(_ms):
    _BLOCKS[m.group(1)] = _SRC[m.end(): _ms[i + 1].start() if i + 1 < len(_ms) else len(_SRC)]

def t(lang, key, **kw):
    """the app's string for key in lang (English when the language lacks it)"""
    for l in (lang, "en"):
        m = re.search(r'^\s*"' + re.escape(key) + r'":\s*"((?:[^"\\]|\\.)*)"', _BLOCKS.get(l, ""), re.M)
        if m:
            s = m.group(1).encode().decode("unicode_escape").encode("latin1").decode("utf8")
            for k, v in kw.items():
                s = s.replace("{" + k + "}", str(v))
            return s
    raise KeyError(key)

_STAMPS = open(os.path.join(IOS, "src", "data", "stamps.ts"), encoding="utf8").read()
def stamp_name(lang, sid):
    m = re.search(r'\{ id: "' + re.escape(sid) + r'",[^\n]*?name: \{([^}]*)\}', _STAMPS)
    names = dict(re.findall(r'(\w+): "((?:[^"\\]|\\.)*)"', m.group(1)))
    return names.get(lang) or names["en"]

if __name__ == "__main__":
    for l in ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"]:
        print(l, t(l, "wren.lock.plus"), "|", t(l, "skin.plush.name"), "|", t(l, "state.swapNames"), "|", stamp_name(l, "made-my-day"))
