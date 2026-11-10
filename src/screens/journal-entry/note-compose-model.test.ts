/* Behaviour lock for the Notes composer's rules (screens/journal-entry/note-compose-model): the
   panels, the mood picks, the seal key, one kind per page, the cards. Not wired to a runner; run by
   hand from the repo root with plain node (Node 22.18+ strips the types):
     node src/screens/journal-entry/note-compose-model.test.ts
   moods.ts reads i18n (AsyncStorage underneath), so i18n is swapped for a stub, and imports
   without an extension get ".ts" (Metro's way). Every line prints ok/FAIL; non-zero exit on a fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/\/lib\/i18n$/.test(specifier))
      return { url: "data:text/javascript,export const strings=()=>{};export const t=(k)=>k;export const getLang=()=>'en';", shortCircuit: true };
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const M = await import("./note-compose-model.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

// ── what the page holds ──
ok("empty page holds nothing", !M.pageHasSomething("  \n", null, 0, null));
ok("words count", M.pageHasSomething("hi", null, 0, null));
ok("a photo counts", M.pageHasSomething("", "photo", 1, null));
ok("an album page with no photos holds nothing", !M.pageHasSomething("", "photo", 0, null));
ok("a recording counts", M.pageHasSomething("", "voice", 0, "file:///a.m4a"));
ok("an empty voice page holds nothing", !M.pageHasSomething("", "voice", 0, null));
ok("a film counts", M.pageHasSomething("", "video", 0, "file:///a.mov"));

// ── the panels ──
ok("＋ opens its panel", M.togglePanel("none", "plus") === "plus");
ok("＋ again closes it", M.togglePanel("plus", "plus") === "none");
ok("the mood key over ＋'s panel swaps them", M.togglePanel("plus", "mood") === "mood");

// ── the mood ──
ok("a group card stores the group itself", M.pickGroup(null, "low") === "group-low");
ok("another group replaces a face", M.pickGroup("shy", "happy") === "group-happy");
ok("the chosen group again keeps its face", M.pickGroup("shy", "calm") === "shy");
ok("the chosen group again keeps the group", M.pickGroup("group-tired", "tired") === "group-tired");
ok("the panel shows Calm before a choice", M.openGroupFor(null) === "calm");
ok("the panel shows the face's group", M.openGroupFor("heartbroken") === "low");
ok("the panel shows a group alone's group", M.openGroupFor("group-happy") === "happy");
ok("a group alone has no chosen face", M.chosenFaceOf("group-low") === "");
ok("a face is the chosen face", M.chosenFaceOf("drained") === "drained");

// ── the seal key ──
ok("nothing on the page: nothing", M.sealAction({ hasSomething: false, busy: false, sealed: false, mood: "calm" }) === "none");
ok("words, no mood: the moods open", M.sealAction({ hasSomething: true, busy: false, sealed: false, mood: null }) === "askMood");
ok("words and a mood: it seals", M.sealAction({ hasSomething: true, busy: false, sealed: false, mood: "group-low" }) === "seal");
ok("sealing already: nothing", M.sealAction({ hasSomething: true, busy: true, sealed: false, mood: "calm" }) === "none");
ok("sealed: nothing", M.sealAction({ hasSomething: true, busy: false, sealed: true, mood: "calm" }) === "none");

// ── one kind per page ──
const on = M.cardsOn("photo", true);
ok("photos on the page: Photo stays on", on.photo && !on.video && !on.voice);
const empty = M.cardsOn("voice", false);
ok("an empty voice page: every card on", empty.photo && empty.video && empty.voice);
ok("Video while photos are there does nothing", M.cardAction("video", "photo", true, 2) === "none");
ok("Photo adds to the album", M.cardAction("photo", "photo", true, 3) === "pickPhotos");
ok("Photo at nine does nothing", M.cardAction("photo", "photo", true, 9) === "none");
ok("Audio turns the Recorder on", M.cardAction("voice", null, false, 0) === "voiceOn");
ok("Audio again takes an empty Recorder away", M.cardAction("voice", "voice", false, 0) === "voiceOff");
ok("Audio again keeps a take", M.cardAction("voice", "voice", true, 0) === "none");
ok("Video on an empty voice page picks a film", M.cardAction("video", "voice", false, 0) === "pickVideo");

// ── the stored type ──
ok("an album is a photo page", M.entryType("photo", 3, false) === "photo");
ok("a kept film is a video page", M.entryType("video", 0, true) === "video");
ok("an empty voice page is a text page", M.entryType("voice", 0, false) === "text");
ok("words alone are a text page", M.entryType(null, 0, false) === "text");

// ── the panel's groups ──
const groups = M.panelGroups((g) => g.toUpperCase(), (id) => `n:${id}`, (s) => s.toUpperCase());
ok("four groups in the owner's order", groups.map((g) => g.group).join() === "calm,happy,tired,low");
ok("all thirty faces", groups.reduce((n, g) => n + g.faces.length, 0) === 30);
ok("Calm's five, in order", groups[0].faces.map((f) => f.id).join() === "calm,content,pleased,okay,shy");
const shy = groups[0].faces[4];
ok("a face's art key", shy.artKey === "mood-shy");
ok("a face's tile name is cased, its VoiceOver name isn't", shy.name === "N:SHY" && shy.a11yLabel === "n:shy");

// ── editing a sealed page (owner's audit, 2026-11-10) ──
{
  const words = M.editSeed({ type: "text", body: "I said no today", mood: "shy" });
  ok("a page of words opens with its words and mood, no media", words.text === "I said no today" && words.mood === "shy" && words.att === null && words.photos.length === 0 && words.mediaUri === null);
  ok("a group alone opens as the group", M.editSeed({ type: "text", body: "x", mood: "group-low" }).mood === "group-low");
  ok("a page with no stored mood opens with none (the save key asks)", M.editSeed({ type: "text", body: "x" }).mood === null);
  ok("an unknown mood opens with none", M.editSeed({ type: "text", body: "x", mood: "zzz" }).mood === null);
  ok("a page from before kinds is a page of words", M.editSeed({ body: "old" }).att === null);

  const album = M.editSeed({ type: "photo", body: "", mood: "calm", media: ["a", "b", "c"], coverIndex: 2, mediaUri: "c" });
  ok("an album opens cover first, the rest as stored", album.att === "photo" && album.photos.join() === "c,a,b");
  ok("a cover index past the album is the first", M.editSeed({ type: "photo", media: ["a", "b"], coverIndex: 9 }).photos.join() === "a,b");
  ok("a page from before albums opens with its one picture", M.editSeed({ type: "photo", mediaUri: "only" }).photos.join() === "only");
  ok("a photo page with no pictures left opens as words", M.editSeed({ type: "photo", body: "w" }).att === null);

  const voice = M.editSeed({ type: "voice", body: "", mood: "tired", mediaUri: "v.m4a", dur: 74 });
  ok("a voice page opens with its recording and length", voice.att === "voice" && voice.mediaUri === "v.m4a" && voice.dur === 74 && voice.photos.length === 0);
  ok("a film opens with its file", M.editSeed({ type: "video", mediaUri: "f.mp4" }).att === "video");
  ok("a voice page whose file is gone opens as words", M.editSeed({ type: "voice", body: "w" }).att === null);

  // ✕ asks only over real edits
  const now = (o: object = {}) => ({ text: words.text, mood: words.mood, att: words.att, photos: words.photos, mediaUri: words.mediaUri, ...o });
  ok("just opened: nothing changed", !M.editChanged(words, now()));
  ok("a word changed", M.editChanged(words, now({ text: "I said yes today" })));
  ok("a space at the end isn't a change (the save trims it)", !M.editChanged(words, now({ text: "I said no today \n" })));
  ok("another mood is a change", M.editChanged(words, now({ mood: "calm" })));
  ok("an empty Recorder opened and left isn't a change", !M.editChanged(words, now({ att: "voice" })));
  ok("a recording made is a change", M.editChanged(words, now({ att: "voice", mediaUri: "new.m4a" })));
  ok("a picture added to a page of words is a change", M.editChanged(words, now({ att: "photo", photos: ["p"] })));

  const anow = (o: object = {}) => ({ text: album.text, mood: album.mood, att: album.att, photos: album.photos, mediaUri: album.mediaUri, ...o });
  ok("an album just opened: nothing changed", !M.editChanged(album, anow()));
  ok("a picture taken off is a change", M.editChanged(album, anow({ photos: ["c", "a"] })));
  ok("another cover (the order) is a change", M.editChanged(album, anow({ photos: ["a", "c", "b"] })));
  ok("a picture swapped for another is a change", M.editChanged(album, anow({ photos: ["c", "a", "x"] })));
  ok("every picture taken off is a change", M.editChanged(album, anow({ att: null, photos: [] })));

  // the album an edit saves
  const stored = { media: ["a", "b", "c"], coverIndex: 2 };
  ok("an album left as it opened is saved as it was stored (order and cover)", JSON.stringify(M.albumToSave(album.photos, album, stored)) === JSON.stringify({ media: ["a", "b", "c"], coverIndex: 2 }));
  ok("a picture taken off: the composer's order, the first the cover", JSON.stringify(M.albumToSave(["c", "a"], album, stored)) === JSON.stringify({ media: ["c", "a"], coverIndex: 0 }));
  ok("another cover: the composer's order, the first the cover", JSON.stringify(M.albumToSave(["a", "c", "b"], album, stored)) === JSON.stringify({ media: ["a", "c", "b"], coverIndex: 0 }));
  ok("a picture added: the composer's order", JSON.stringify(M.albumToSave(["c", "a", "b", "new"], album, stored)) === JSON.stringify({ media: ["c", "a", "b", "new"], coverIndex: 0 }));
  ok("a stored cover index past the album is the first", M.albumToSave(album.photos, album, { media: ["a", "b", "c"], coverIndex: 9 }).coverIndex === 0);
  const single = M.editSeed({ type: "photo", mediaUri: "only" });
  ok("a page from before albums gets one", JSON.stringify(M.albumToSave(single.photos, single, {})) === JSON.stringify({ media: ["only"], coverIndex: 0 }));

  const vnow = (o: object = {}) => ({ text: voice.text, mood: voice.mood, att: voice.att, photos: voice.photos, mediaUri: voice.mediaUri, ...o });
  ok("a voice page just opened: nothing changed", !M.editChanged(voice, vnow()));
  ok("words added to a voice page are a change", M.editChanged(voice, vnow({ text: "what I said" })));
  ok("the recording cleared is a change", M.editChanged(voice, vnow({ mediaUri: null })));
  ok("another recording is a change", M.editChanged(voice, vnow({ mediaUri: "v2.m4a" })));
}

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
