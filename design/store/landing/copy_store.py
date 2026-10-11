"""Words for the landing-style store set. English is the master; where a frame
says what the landing already says, the landing's own lines (and, for other
languages, its own translations in web app/l10n/<lang>/home.json) are used.
Labels the app itself draws (coat names, FIRST CLASS, SWAP NAMES?, sticker
names, menu items, the Live Activity) are not here: build.py reads them from
the app's catalogue (appstrings.py), so they match the app in every language.

h = headline ("\n" = a chosen break), mark = the phrase under the acid stripe
(must appear in h), sub = one line under it, pop = words on the drawn pieces."""

COPY = {
  "en": {
    # 01 · the desk at 2am (landing hero h1; the one-line definition, word for word)
    "01": {"h": "come for a penpal.\nstay for a\nkindred spirit.", "mark": "kindred spirit.",
           "sub": "Kindredly is an anonymous penpal app that matches strangers by how they write.",
           "pop": {"bubble": "special delivery!"}},
    # 02 · landing "no pics" block, its lead and its ghost card
    "02": {"h": "no pics, no bios,\nno swiping.", "mark": "no swiping.",
           "sub": "Your words go first. Your face never has to.",
           "pop": {"ghostKick": "every other app", "ghostName": "jess, 24", "ghostMeta": "2 mi away · loves travel",
                   "letter": "the kettle clicked off and nobody came. what does your morning sound like?"}},
    # 03 · landing aura h2; the sub says how the app does it (on the phone)
    "03": {"h": "what's your\nwriting aura?", "mark": "writing aura?",
           "sub": "Read from how you write, on your phone: rhythm, sentence length, how you end a thought.",
           "pop": {"kick": "a few of its 55 stickers"}},
    # 04–06 · the landing's three steps
    "04": {"h": "write one\nhonest thing.", "mark": "honest",
           "sub": "No photo, no bio. A line about your week, and a question underneath it."},
    "05": {"h": "she carries it\nto strangers who\ntype like you.", "mark": "type like you.",
           "sub": "It lands first on the desks of strangers who write the way you do.",
           "pop": {"name": "Pip"}},
    "06": {"h": "5 letters each way\n→ swap names.", "mark": "swap names.",
           "sub": "Letter by letter. After five each way you can trade names, or stay strangers who know each other.",
           "pop": {"name": "mira"}},
    "07": {"h": "then you get\nyour own room.", "mark": "your own room.",
           "sub": "Trade names, and the letters become a room for two."},
    # 08 · landing courier h2 and lead
    "08": {"h": "hatch your\nown courier.", "mark": "own courier.",
           "sub": "She hatches from your first words, carries every letter, and gets dramatic if you ghost her.",
           "pop": {"paid": "Mist, Peach and Night come with First Class, an optional subscription."}},
    # 09 · landing safety block: h2, lead, the number line and its four rows
    "09": {"h": "strangers,\nnot sketchy.", "mark": "not sketchy.",
           "sub": "Be as honest as you like. Nobody here knows who you are unless you tell them.",
           "pop": {"whoami": "you're a number, not a name — until you both decide otherwise.",
                   "rows": ["18+ only", "no pics till you trade names — five letters each way", "report anything, one tap", "block anyone, and they can't reach you again"]}},
    "10": {"h": "a journal that\nnever leaves\nthis phone.", "mark": "never leaves",
           "sub": "Sealed on your iPhone. Never uploaded to us."},
  },
}

# the other eight languages: written natively from the master (writer, then a
# blind editor), landing lines reused verbatim — see copy_l10n.json
import json as _json, os as _os
_P = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "copy_l10n.json")
if _os.path.exists(_P):
    for _lang, _frames in _json.load(open(_P, encoding="utf8")).items():
        _frames = {k: v for k, v in _frames.items() if not k.startswith("_")}
        # what the translators don't touch (Pip's name) carries over from English
        for _k, _f in _frames.items():
            _en = COPY["en"].get(_k, {})
            if "pop" in _en:
                _f["pop"] = {**_en["pop"], **_f.get("pop", {})}
        COPY[_lang] = _frames
