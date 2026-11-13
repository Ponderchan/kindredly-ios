# Wren's 1.0.9 desk post as SQL for the owner to run once 1.0.9 is live.
# usage: python3 design/whats-new-1.0.9/make_sql.py design/whats-new-1.0.9/post.json design/whats-new-1.0.9/post.sql
# post.json names the icon's colour (blue, owner 2026-11-13) in every language: change those words if the icon changes.
import json, sys
p = json.load(open(sys.argv[1]))
order = ["es", "pt", "id", "fr", "de", "it", "ja", "ko"]
def body(x): return x["first"].strip() + "\n\n" + x["rest"].strip()
for k, v in p.items():
    assert "$" not in body(v), k
head = """-- Wren's desk · the 1.0.9 post (what's new). Run ONCE in the Supabase SQL editor, and only
-- after 1.0.9 is approved AND live in the App Store (it says what's in 1.0.9; earlier builds get it too).
-- knock = true: every device with a push token gets it once; the push is the post's first line, in
-- the reader's language. The link makes 1.0.9 (binary 1.2.8) play its what's-new reel under the post
-- (news-reel/v1-0-9, only while the switches meplanet and afterfifteen are on); older builds show
-- the words alone, which is why they say what changed on their own.
-- Same day, suggested: turn the update prompt on for the older binaries (app_surfaces update_prompt).
-- Written natively in eight languages and read blind by native editors (2026-11-13).
insert into public.wren_posts (kind, body, body_i18n, link, knock)
values (
  'update',
$en$""" + body(p["en"]) + "$en$,\n  jsonb_build_object(\n"
rows = []
for l in order:
    rows.append(f"    '{l}', ${l}${body(p[l])}${l}$")
tail = "\n  ),\n  'kindredly:///news/1.0.9',\n  true\n);\n"
open(sys.argv[2], "w").write(head + ",\n".join(rows) + tail)
print("wrote", sys.argv[2])
