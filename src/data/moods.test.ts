/* Behaviour lock for data/moods: what a journal page's stored mood means
   now that a page can store a group alone (owner, 2026-10-16) — every
   helper on the thirty faces, the seven legacy ids, a missing or unknown
   value and the four group ids — and then the same group ids fed through
   every builder that reads a page's mood (notes-model's notes, month and
   six squares; the empty-page spark; the private Aura tone stickers), so
   a group alone is never read as Calm by an old getMood() path.

   Old pages must read exactly as before: a face keeps its name, group,
   tone and art; a legacy id reads as its face; a missing or unknown value
   is the Calm colour with the Calm group's icon and no name.

   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/data/moods.test.ts
   data/moods imports lib/i18n (React Native), so a load hook stands in a
   small i18n for this process only (the four group names in English, the
   language from globalThis.__lang, strings() a no-op), and adds ".ts" to
   the extensionless relative imports Metro wants. Every line prints
   ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

const STUBS: Record<string, string> = {
  i18n: `const W = { "mood.group.calm": "Calm", "mood.group.happy": "Happy", "mood.group.tired": "Tired", "mood.group.low": "Low" };
export const t = (k) => W[k] ?? k;
export const getLang = () => globalThis.__lang ?? "en";
export const strings = () => {};`,
};
registerHooks({
  resolve(specifier, context, next) {
    const m = /(?:^|\/)(i18n)$/.exec(specifier);
    if (m) return { url: "moods-stub:" + m[1], shortCircuit: true };
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      // a file, or a folder's index (the writing engine's dictionaries)
      try {
        return next(specifier + ".ts", context);
      } catch {
        return next(specifier + "/index.ts", context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("moods-stub:")) return { format: "module", source: STUBS[url.slice("moods-stub:".length)], shortCircuit: true };
    return next(url, context);
  },
});

const Moods = await import("./moods.ts");
const { MOOD_ART } = await import("./mood-art.ts");
const Notes = await import("../screens/notes/notes-model.ts");
const { journalSpark } = await import("../lib/journal-sparks.ts");
const { usageStickers, EMPTY_COUNTERS } = await import("../lib/usage-stickers.ts");
type Entry = import("../lib/journal").JournalEntry;
type Fmt = import("../screens/notes/notes-model").NotesFormat;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  ok(name + (g === w ? "" : `  (got ${g}, want ${w})`), g === w);
};
const setLang = (l: string) => {
  (globalThis as { __lang?: string }).__lang = l;
};

const G = Moods.MOOD_GROUPS;
const GROUP_IDS = G.map((g) => `group-${g}`);
const LEGACY = Object.keys(Moods.LEGACY_MOOD);
// a missing or unknown value — including keys every object inherits
const NONE: (string | null | undefined)[] = [undefined, null, "", "zzz", "group-", "group-angry", "Group-Calm", "GROUP-LOW", "constructor", "toString", "__proto__", "hasOwnProperty"];

/* ── the tables ───────────────────────────────────────────────────────── */
{
  eq("thirty faces, MOOD_IDS in MOODS' order", [Moods.MOOD_IDS.length, Object.keys(Moods.MOODS).join()], [30, Moods.MOOD_IDS.join()]);
  eq("the four group ids", Object.values(Moods.MOOD_GROUP_IDS), GROUP_IDS);
  ok("no group id is a face (they can't be the bare group names: calm is a face)", GROUP_IDS.every((id) => !(id in Moods.MOODS)) && "calm" in Moods.MOODS);
  ok("MOOD_GROUP_DEFAULT is retired", !("MOOD_GROUP_DEFAULT" in Moods));
  eq("seven legacy ids, each onto a face", [LEGACY.length, LEGACY.every((id) => (Moods.MOOD_IDS as string[]).includes(Moods.LEGACY_MOOD[id]))], [7, true]);
  ok("every face has its art (mood-<id>) in data/mood-art", Moods.MOOD_IDS.every((id) => Array.isArray(MOOD_ART[`mood-${id}`]) && MOOD_ART[`mood-${id}`].length > 0));
}

/* ── isGroupOnly ──────────────────────────────────────────────────────── */
{
  ok("the four group ids are group-only", GROUP_IDS.every((id) => Moods.isGroupOnly(id)));
  ok("no face is group-only", Moods.MOOD_IDS.every((id) => !Moods.isGroupOnly(id)));
  ok("no legacy id is group-only", LEGACY.every((id) => !Moods.isGroupOnly(id)));
  ok("nothing, junk and inherited keys are not group-only", NONE.every((id) => !Moods.isGroupOnly(id)));
  ok("the bare group names are not group-only (calm is a face; happy, tired, low are junk)", ["calm", "happy", "tired", "low"].every((id) => !Moods.isGroupOnly(id)));
}

/* ── moodGroup: group ids first, then the face ────────────────────────── */
{
  eq("a group alone is its own group (never Calm by way of getMood)", GROUP_IDS.map(Moods.moodGroup), [...G]);
  ok("every face is in the group the owner's table puts it in", G.every((g) => Moods.MOOD_GROUP_FACES[g].every((id) => Moods.moodGroup(id) === g)));
  eq("legacy ids by their face (tender, restless, wistful, warm, distant, bright, heavy)", LEGACY.map(Moods.moodGroup), LEGACY.map((id) => Moods.moodGroup(Moods.LEGACY_MOOD[id])));
  eq("…which is happy, low, tired, calm, tired, happy, tired", LEGACY.map(Moods.moodGroup), ["happy", "low", "tired", "calm", "tired", "happy", "tired"]);
  ok("nothing, junk and inherited keys are Calm", NONE.every((id) => Moods.moodGroup(id) === "calm"));
}

/* ── moodFace and resolveMood ─────────────────────────────────────────── */
{
  ok("a face is its own face", Moods.MOOD_IDS.every((id) => Moods.moodFace(id) === id && Moods.resolveMood(id) === id));
  ok("a legacy id is its new face", LEGACY.every((id) => Moods.moodFace(id) === Moods.LEGACY_MOOD[id] && Moods.resolveMood(id) === Moods.LEGACY_MOOD[id]));
  ok("a group alone has no face, and resolves to itself", GROUP_IDS.every((id) => Moods.moodFace(id) === null && Moods.resolveMood(id) === id));
  ok("nothing, junk and inherited keys have no face, and resolve to group-calm", NONE.every((id) => Moods.moodFace(id) === null && Moods.resolveMood(id) === "group-calm"));
}

/* ── moodArtKey ───────────────────────────────────────────────────────── */
{
  ok("a face: mood-<face> (the art it has always drawn)", Moods.MOOD_IDS.every((id) => Moods.moodArtKey(id) === `mood-${id}`));
  eq("a legacy id: its face's art", LEGACY.map(Moods.moodArtKey), LEGACY.map((id) => `mood-${Moods.LEGACY_MOOD[id]}`));
  eq("a group alone: mood-group-<g>", GROUP_IDS.map(Moods.moodArtKey), ["mood-group-calm", "mood-group-happy", "mood-group-tired", "mood-group-low"]);
  ok("nothing, junk and inherited keys: the Calm group's icon", NONE.every((id) => Moods.moodArtKey(id) === "mood-group-calm"));
}

/* ── moodLabel ────────────────────────────────────────────────────────── */
{
  setLang("en");
  ok("a face: its own name, as moodName says it", Moods.MOOD_IDS.every((id) => Moods.moodLabel(id) === Moods.moodName(id) && Moods.moodLabel(id) === Moods.MOODS[id].n));
  eq("a legacy id: its face's name", LEGACY.map(Moods.moodLabel), ["In love", "Irritable", "Sleepy", "Content", "Numb", "Cheerful", "Drained"]);
  eq("a group alone: the group's name (mood.group.*)", GROUP_IDS.map(Moods.moodLabel), ["Calm", "Happy", "Tired", "Low"]);
  ok("nothing, junk and inherited keys: no name", NONE.every((id) => Moods.moodLabel(id) === ""));
  setLang("de");
  eq("a face in the reader's language", [Moods.moodLabel("sleepy"), Moods.moodLabel("wistful")], ["Schläfrig", "Schläfrig"]);
  eq("a group alone goes through t() (this file's stub i18n answers in English)", Moods.moodLabel("group-low"), "Low");
  setLang("en");
}

/* ── gendered names (es, pt, fr, it agree with the writer's pronoun) ─── */
{
  setLang("es");
  Moods.setMoodPronoun("she");
  eq("she: the feminine form", Moods.moodName("in-love"), "Enamorada");
  Moods.setMoodPronoun("he");
  eq("he: the masculine form", Moods.moodName("in-love"), "Enamorado");
  Moods.setMoodPronoun("they");
  eq("they / unset: the neutral wording", Moods.moodName("in-love"), "Con mariposas");
  eq("a name with one form is the same for everyone", Moods.moodName("content"), "A gusto");
  Moods.setMoodPronoun("she");
  eq("languages without gender ignore the pronoun", (setLang("de"), Moods.moodName("in-love")), "Verliebt");
  Moods.setMoodPronoun("they");
  setLang("en");
  eq("English has one name for everyone", Moods.moodName("in-love"), "In love");
}

/* ── moodTone ─────────────────────────────────────────────────────────── */
{
  ok("a face: its own tone", Moods.MOOD_IDS.every((id) => Moods.moodTone(id) === Moods.MOODS[id].tone));
  eq("a legacy id: its face's tone", LEGACY.map(Moods.moodTone), LEGACY.map((id) => Moods.MOODS[Moods.LEGACY_MOOD[id]].tone));
  eq("a group alone: calm soft, happy up, tired flat, low low", GROUP_IDS.map(Moods.moodTone), ["soft", "up", "flat", "low"]);
  ok("tired alone is flat, not the soft of the default face it replaced (Sleepy)", Moods.moodTone("group-tired") === "flat" && Moods.moodTone("sleepy") === "soft");
  ok("nothing, junk and inherited keys: Calm's tone, soft", NONE.every((id) => Moods.moodTone(id) === "soft"));
}

/* ── isNamedMood ──────────────────────────────────────────────────────── */
{
  ok("faces, legacy ids and groups alone are named", [...Moods.MOOD_IDS, ...LEGACY, ...GROUP_IDS].every((id) => Moods.isNamedMood(id)));
  ok("nothing, junk and inherited keys are not", NONE.every((id) => !Moods.isNamedMood(id)));
  ok("named exactly when there is a label", [...Moods.MOOD_IDS, ...LEGACY, ...GROUP_IDS, ...NONE].every((id) => Moods.isNamedMood(id) === (Moods.moodLabel(id) !== "")));
}

/* ── getMood stays the face table ─────────────────────────────────────── */
{
  ok("a face, a legacy id: as before", Moods.getMood("nervous").id === "nervous" && Moods.getMood("heavy").id === "drained");
  ok("a group alone reads as Calm through getMood — which is why every reader goes through the helpers", GROUP_IDS.every((id) => Moods.getMood(id).id === "calm"));
  ok("inherited keys are not moods (they used to slip through MOODS[id])", ["constructor", "toString", "hasOwnProperty"].every((id) => Moods.getMood(id).id === "calm"));
}

/* ── every builder, fed group-<g> ─────────────────────────────────────── */
const fmt: Fmt = {
  t: (k, vars) => {
    const W: Record<string, string> = { "jt.notesN": "{n} notes", "jt.notes1": "1 note", "jt.notesNone": "No notes", "jt.dayA11y": "{date}, {count}", "jt.legendA11y": "{group}, {count}", "jp.write": "Text note", "mood.group.calm": "Calm", "mood.group.happy": "Happy", "mood.group.tired": "Tired", "mood.group.low": "Low" };
    const s = W[k] ?? k;
    return vars ? s.replace(/\{(\w+)\}/g, (m, v) => (v in vars ? String(vars[v]) : m)) : s;
  },
  moodLabel: Moods.moodLabel,
  day: (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
  time: (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(/^24/, "00"),
  longDate: (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
  duration: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
  monthTitle: (d) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  upper: (s) => s.toLocaleUpperCase("en-US"),
};
const NOW = new Date(2026, 9, 16, 12, 0); // Friday 16 October 2026, noon (not a night spark)
const at = (d: number, h = 12) => new Date(2026, 9, d, h, 0).toISOString();
const page = (id: string, d: number, mood: string): Entry => ({ id, date: at(d), type: "text", body: "", mood }) as Entry;
const five = (mood: string) => [1, 2, 3, 4, 5].map((d) => page(`${mood}-${d}`, 16 - d, mood));

for (const g of G) {
  const id = `group-${g}`;
  const name = fmt.t(`mood.group.${g}`);
  const n = Notes.buildNote(page("n", 14, id), fmt);
  eq(`buildNote(${id}): group, mood, icon, labels`, [n.group, n.mood, n.icon, n.label, n.listLabel, n.shortLabel], [g, id, `mood-${id}`, `OCT 14 · 12:00 · ${name}`, `OCT 14 · ${name}`, "OCT 14"]);
  ok(`buildNote(${id}): VoiceOver names the group`, n.a11y.split(", ").includes(name));
  eq(`buildNotes(${id})`, Notes.buildNotes([page("n", 14, id)], fmt).map((x) => [x.group, x.icon]), [[g, `mood-${id}`]]);
  const month = Notes.buildMonth([page("n", 14, id)], { y: 2026, m: 9 }, NOW, 0, fmt);
  const i = G.indexOf(g);
  eq(`buildMonth(${id}): the day in its group, its counts`, [month.days[13].group, month.days[13].mood, month.counts], [g, id, G.map((_, j) => (j === i ? 1 : 0))]);
  eq(`buildMonth(${id}): its legend line`, month.legendA11y[i], `${name}, 1 note`);
  eq(`recentGroups(${id})`, Notes.recentGroups([page("n", 14, id)], NOW), [g]);
  eq(`pagesThisMonth(${id})`, Notes.pagesThisMonth([page("n", 14, id)], NOW), 1);
}

/* the empty-page spark reads the five newest tones: a group alone carries its group's tone */
{
  const HEAVY = ["js.24", "js.23", "js.21", "js.43", "js.22", "js.20", "js.36"]; // PRIVATE + js.36
  const BRIGHT = ["js.12", "js.13", "js.11", "js.8", "js.7", "js.9", "js.14"]; // SMALL + js.14
  ok("journalSpark: five Low alone → the heavy pool", HEAVY.includes(journalSpark(five("group-low"), NOW)));
  ok("journalSpark: five Tired alone → the heavy pool (flat)", HEAVY.includes(journalSpark(five("group-tired"), NOW)));
  ok("journalSpark: five Happy alone → the bright pool", BRIGHT.includes(journalSpark(five("group-happy"), NOW)));
  eq("journalSpark: five Calm alone → what five Calm faces get", journalSpark(five("group-calm"), NOW), journalSpark(five("calm"), NOW));
  eq("journalSpark: a group alone reads like a face of its tone (low: crying, tired: numb, happy: cheerful)", ["group-low", "group-tired", "group-happy"].map((m) => journalSpark(five(m), NOW)), ["crying", "numb", "cheerful"].map((m) => journalSpark(five(m), NOW)));
}

/* the private Aura tone stickers: half the pages in one tone earns its sticker */
{
  const base = (journal: Entry[]) => ({ now: NOW.toISOString(), letters: [], replies: [], threads: [], journal, keptN: 0, dressed: false, named: false, counters: { ...EMPTY_COUNTERS } });
  const tone = (journal: Entry[]) => usageStickers(base(journal)).filter((s) => ["softie", "sunny_logger", "sparkler", "edge_walker", "low_tide_logger", "neutral_logger"].includes(s.id));
  eq("usageStickers: each group alone earns its group's tone sticker, private", G.map((g) => tone(five(`group-${g}`)).map((s) => [s.id, s.private, s.n])), [
    [["softie", true, 5]],
    [["sunny_logger", true, 5]],
    [["neutral_logger", true, 5]],
    [["low_tide_logger", true, 5]],
  ]);
  eq("usageStickers: group alone and faces of the same tone count together (3 Low alone + 2 Crying)", tone([...five("group-low").slice(0, 3), page("c1", 2, "crying"), page("c2", 1, "crying")]).map((s) => [s.id, s.n]), [["low_tide_logger", 5]]);
}

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
