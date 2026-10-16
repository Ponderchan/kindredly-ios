import { getLang, t } from "../lib/i18n";
import type { PronounId } from "../lib/pronouns";
// the four group names (mood.group.*) moodLabel says
import "./strings-step5-notes";
/* The Kindredly moods — 30 icons designed as colored shapes-with-faces
   (art in data/mood-art.ts). Colors/tones come from that design file.
   `n` = display name; `col` the shape color; `bg` a light plate tint;
   `tone` groups them for palettes. LEGACY_MOOD maps the original 8
   backend ids onto the nearest new id so old journal entries still render.

   WHAT A PAGE STORES (owner, 2026-10-16): one of the thirty faces (FaceId),
   or — when only a group's colour block was tapped — that group alone
   (GroupMoodId: group-calm, group-happy, group-tired, group-low). MoodId is
   either; lib/journal stores it as given and imports MoodId by name, so the
   journal widened with this type and needed no edit. Old pages may also hold
   a legacy id or nothing at all.

   Read a stored value through the helpers at the bottom (moodGroup,
   moodFace, resolveMood, moodArtKey, moodLabel, moodTone, isNamedMood),
   never through getMood alone: getMood is the face table, and it turns a
   group-only value into Calm. */

/** one of the thirty faces */
export type FaceId =
  | "calm"
  | "numb"
  | "content"
  | "in-love"
  | "surprised"
  | "shocked"
  | "frustrated"
  | "stunned"
  | "cheerful"
  | "pleased"
  | "sleepy"
  | "irritable"
  | "amazed"
  | "angry"
  | "okay"
  | "heartbroken"
  | "grumpy"
  | "meh"
  | "smug"
  | "nervous"
  | "drained"
  | "crying"
  | "shy"
  | "mischievous"
  | "unimpressed"
  | "delighted"
  | "excited"
  | "mad"
  | "playful"
  | "over-it";

/** A page that chose only a group's colour, no face. Not the bare group names: "calm" is already a
    face. */
export type GroupMoodId = "group-calm" | "group-happy" | "group-tired" | "group-low";

/** What a journal page stores (lib/journal JournalEntry.mood): a face, or a group alone. */
export type MoodId = FaceId | GroupMoodId;

export type MoodTone = "soft" | "up" | "spark" | "edge" | "low" | "flat";
export interface Mood { id: FaceId; n: string; col: string; bg: string; tone: MoodTone }

const FACES: Readonly<Record<FaceId, Mood>> = {
  "calm": { id: "calm", n: "Calm", col: "#8FBBD9", bg: "#EFF5F9", tone: "soft" },
  "numb": { id: "numb", n: "Numb", col: "#9AA0AE", bg: "#F0F1F3", tone: "flat" },
  "content": { id: "content", n: "Content", col: "#F3B07A", bg: "#FDF3EC", tone: "soft" },
  "in-love": { id: "in-love", n: "In love", col: "#F2708F", bg: "#FDEAEF", tone: "up" },
  "surprised": { id: "surprised", n: "Surprised", col: "#5FC3D9", bg: "#E8F6F9", tone: "spark" },
  "shocked": { id: "shocked", n: "Shocked", col: "#3FA9D8", bg: "#E4F2F9", tone: "spark" },
  "frustrated": { id: "frustrated", n: "Frustrated", col: "#E4703F", bg: "#FBEAE4", tone: "edge" },
  "stunned": { id: "stunned", n: "Stunned", col: "#8C7BD8", bg: "#EEECF9", tone: "spark" },
  "cheerful": { id: "cheerful", n: "Cheerful", col: "#F6C445", bg: "#FDF6E4", tone: "up" },
  "pleased": { id: "pleased", n: "Pleased", col: "#F0A9B6", bg: "#FCF2F4", tone: "soft" },
  "sleepy": { id: "sleepy", n: "Sleepy", col: "#9C9BD6", bg: "#F1F1F9", tone: "soft" },
  "irritable": { id: "irritable", n: "Irritable", col: "#E0894A", bg: "#FAEEE5", tone: "edge" },
  "amazed": { id: "amazed", n: "Amazed", col: "#F5A93C", bg: "#FDF2E3", tone: "up" },
  "angry": { id: "angry", n: "Angry", col: "#D95440", bg: "#F9E7E4", tone: "edge" },
  "okay": { id: "okay", n: "Okay", col: "#A8B4A0", bg: "#F2F4F1", tone: "flat" },
  "heartbroken": { id: "heartbroken", n: "Heartbroken", col: "#B85670", bg: "#F5E7EA", tone: "low" },
  "grumpy": { id: "grumpy", n: "Grumpy", col: "#B9793F", bg: "#F5ECE4", tone: "edge" },
  "meh": { id: "meh", n: "Meh", col: "#A5A5A5", bg: "#F2F2F2", tone: "flat" },
  "smug": { id: "smug", n: "Smug", col: "#C98BD4", bg: "#F7EEF8", tone: "spark" },
  "nervous": { id: "nervous", n: "Nervous", col: "#7E9BC4", bg: "#ECF1F6", tone: "low" },
  "drained": { id: "drained", n: "Drained", col: "#8A8496", bg: "#EEEDF0", tone: "low" },
  "crying": { id: "crying", n: "Crying", col: "#5E86BE", bg: "#E8EEF5", tone: "low" },
  "shy": { id: "shy", n: "Shy", col: "#F4A0A8", bg: "#FDF1F2", tone: "soft" },
  "mischievous": { id: "mischievous", n: "Mischievous", col: "#B47CD8", bg: "#F4ECF9", tone: "spark" },
  "unimpressed": { id: "unimpressed", n: "Unimpressed", col: "#8E9AA8", bg: "#EFF0F2", tone: "edge" },
  "delighted": { id: "delighted", n: "Delighted", col: "#F7CE3F", bg: "#FDF8E4", tone: "up" },
  "excited": { id: "excited", n: "Excited", col: "#F3743F", bg: "#FDEBE4", tone: "up" },
  "mad": { id: "mad", n: "Mad", col: "#CE3F3F", bg: "#F8E4E4", tone: "edge" },
  "playful": { id: "playful", n: "Playful", col: "#5CC08E", bg: "#E8F6EF", tone: "up" },
  "over-it": { id: "over-it", n: "Over it", col: "#9B93A8", bg: "#F1EFF2", tone: "flat" },
};

/** The thirty faces by id — faces only. Index it with a FaceId: a MoodId (a journal entry's mood
    above all) may be a group id, so it doesn't compile here; such values go through moodTone,
    moodLabel, moodGroup, moodFace, resolveMood or moodArtKey. */
export const MOODS: Readonly<Record<FaceId, Mood>> = FACES;

export const MOOD_IDS: FaceId[] = [
  "calm", "numb", "content", "in-love", "surprised", "shocked", "frustrated", "stunned", "cheerful", "pleased", "sleepy", "irritable", "amazed", "angry", "okay", "heartbroken", "grumpy", "meh", "smug", "nervous", "drained", "crying", "shy", "mischievous", "unimpressed", "delighted", "excited", "mad", "playful", "over-it"
];

/* zh labels (parallel to MOODS) */
export const MOOD_ZH: Record<FaceId, string> = {
  "calm": "平静",
  "numb": "麻木",
  "content": "满足",
  "in-love": "心动",
  "surprised": "惊讶",
  "shocked": "震惊",
  "frustrated": "抓狂",
  "stunned": "错愕",
  "cheerful": "愉悦",
  "pleased": "惬意",
  "sleepy": "困倦",
  "irritable": "烦躁",
  "amazed": "惊叹",
  "angry": "生气",
  "okay": "还行",
  "heartbroken": "心碎",
  "grumpy": "不爽",
  "meh": "无感",
  "smug": "得意",
  "nervous": "忐忑",
  "drained": "疲惫",
  "crying": "大哭",
  "shy": "害羞",
  "mischievous": "窃喜",
  "unimpressed": "不满",
  "delighted": "大笑",
  "excited": "兴奋",
  "mad": "愤怒",
  "playful": "俏皮",
  "over-it": "无语",
};

/* original 8 backend ids → nearest new id (historical data only) */
export const LEGACY_MOOD: Record<string, FaceId> = {
  "tender": "in-love",
  "restless": "irritable",
  "wistful": "sleepy",
  "warm": "content",
  "distant": "numb",
  "bright": "cheerful",
  "heavy": "drained",
};

/** own keys only: "constructor" or "toString" is not a mood */
const has = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

/** The face table: a face, a legacy id's face, else Calm — a group-only value too (see moodFace). */
export const getMood = (id?: string | null): Mood => {
  if (!id) return FACES.calm;
  if (has(FACES, id)) return FACES[id as FaceId];
  const alias = has(LEGACY_MOOD, id) ? LEGACY_MOOD[id] : undefined;
  return (alias && FACES[alias]) || FACES.calm;
};

/* localized display names — en is the mood's own `n`; the other eight here.
   The web backend keeps its own copy of `n`; this is display-only.

   A name that agrees in gender (es, pt, fr, it: "Enamorado" / "Enamorada")
   is written { m, f, n }: m for a writer whose pronoun is he, f for she, n
   for they or unset — a neutral wording where the language has a natural
   one, else the grammatical default. Notes are private, so the only person
   who ever reads a page's mood name is the one who wrote it, and the app
   knows their pronoun (lib/pronouns; the root layout hands it over with
   setMoodPronoun). A plain string is the same for everyone. */
type MoodLocName = string | { m: string; f: string; n: string };
const MOOD_LOC: Partial<Record<FaceId, { es: MoodLocName; pt: MoodLocName; id: string; fr: MoodLocName; de: string; it: MoodLocName; ja: string; ko: string }>> = {
  "calm": { es: { m: "Tranquilo", f: "Tranquila", n: "En paz" }, pt: "Em paz", id: "Damai", fr: "Zen", de: "Entspannt", it: { m: "Tranquillo", f: "Tranquilla", n: "In pace" }, ja: "のんびり", ko: "차분함" },
  "numb": { es: "En automático", pt: "No automático", id: "Mati rasa", fr: { m: "Éteint", f: "Éteinte", n: "Éteint" }, de: "Leer", it: { m: "Spento", f: "Spenta", n: "Spento" }, ja: "からっぽ", ko: "멍함" },
  "content": { es: "A gusto", pt: "Contente", id: "Puas", fr: { m: "Serein", f: "Sereine", n: "En paix" }, de: "Zufrieden", it: { m: "Contento", f: "Contenta", n: "Contento" }, ja: "満たされた", ko: "만족" },
  "in-love": { es: { m: "Enamorado", f: "Enamorada", n: "Con mariposas" }, pt: { m: "Apaixonado", f: "Apaixonada", n: "Amando" }, id: "Jatuh cinta", fr: { m: "Amoureux", f: "Amoureuse", n: "Amoureux" }, de: "Verliebt", it: { m: "Innamorato", f: "Innamorata", n: "Innamorato" }, ja: "恋してる", ko: "설렘" },
  "surprised": { es: { m: "Sorprendido", f: "Sorprendida", n: "Sorprendido" }, pt: { m: "Surpreso", f: "Surpresa", n: "Surpresa boa" }, id: "Terkejut", fr: { m: "Surpris", f: "Surprise", n: "Surpris" }, de: "Überrascht", it: { m: "Sorpreso", f: "Sorpresa", n: "Sorpreso" }, ja: "びっくり", ko: "놀람" },
  "shocked": { es: "En shock", pt: "Em choque", id: "Syok", fr: "Sous le choc", de: "Schockiert", it: "Sotto shock", ja: "ショック", ko: "충격" },
  "frustrated": { es: { m: "Frustrado", f: "Frustrada", n: "Frustrado" }, pt: { m: "Frustrado", f: "Frustrada", n: "Frustração" }, id: "Frustrasi", fr: { m: "Frustré", f: "Frustrée", n: "Frustré" }, de: "Frustriert", it: { m: "Frustrato", f: "Frustrata", n: "Frustrato" }, ja: "くやしい", ko: "답답함" },
  "stunned": { es: "Sin palabras", pt: "Sem reação", id: "Linglung", fr: { m: "Déboussolé", f: "Déboussolée", n: "Déboussolé" }, de: "Fassungslos", it: { m: "Spiazzato", f: "Spiazzata", n: "Spiazzato" }, ja: "呆然", ko: "황당함" },
  "cheerful": { es: "Feliz", pt: "Feliz", id: "Ceria", fr: "De bonne humeur", de: "Fröhlich", it: { m: "Allegro", f: "Allegra", n: "Di buonumore" }, ja: "たのしい", ko: "즐거움" },
  "pleased": { es: { m: "Satisfecho", f: "Satisfecha", n: "Satisfecho" }, pt: "Leve", id: "Nyaman", fr: { m: "Content", f: "Contente", n: "Content" }, de: "Wohlig", it: { m: "Soddisfatto", f: "Soddisfatta", n: "Soddisfatto" }, ja: "ほっこり", ko: "흐뭇함" },
  "sleepy": { es: "Con sueño", pt: "Com sono", id: "Mengantuk", fr: "J'ai sommeil", de: "Schläfrig", it: { m: "Assonnato", f: "Assonnata", n: "Assonnato" }, ja: "ねむい", ko: "졸림" },
  "irritable": { es: "Irritable", pt: "Sem paciência", id: "Kesal", fr: "Irritable", de: "Gereizt", it: "Irritabile", ja: "イライラ", ko: "예민함" },
  "amazed": { es: { m: "Asombrado", f: "Asombrada", n: "Asombrado" }, pt: { m: "Maravilhado", f: "Maravilhada", n: "De queixo caído" }, id: "Takjub", fr: { m: "Émerveillé", f: "Émerveillée", n: "Émerveillé" }, de: "Fasziniert", it: { m: "Incantato", f: "Incantata", n: "Incantato" }, ja: "感動", ko: "감탄" },
  "angry": { es: { m: "Enojado", f: "Enojada", n: "Con rabia" }, pt: "Com raiva", id: "Marah", fr: "En colère", de: "Wütend", it: { m: "Arrabbiato", f: "Arrabbiata", n: "Arrabbiato" }, ja: "怒ってる", ko: "화남" },
  "okay": { es: "Bien", pt: "Ok", id: "Oke", fr: "Ça va", de: "Okay", it: "Okay", ja: "まあまあ", ko: "괜찮음" },
  "heartbroken": { es: "Corazón roto", pt: "Na fossa", id: "Patah hati", fr: "Cœur brisé", de: "Todtraurig", it: "Col cuore spezzato", ja: "かなしい", ko: "속상함" },
  "grumpy": { es: "De mal humor", pt: "De mau humor", id: "Cemberut", fr: "Grognon", de: "Mürrisch", it: "Col broncio", ja: "不機嫌", ko: "짜증남" },
  "meh": { es: "Más o menos", pt: "Mais ou menos", id: "Biasa aja", fr: "Bof", de: "Geht so", it: "Così così", ja: "びみょう", ko: "그저 그럼" },
  "smug": { es: { m: "Orgulloso", f: "Orgullosa", n: "Orgulloso" }, pt: "Me achando", id: "Bangga", fr: { m: "Fier de moi", f: "Fière de moi", n: "Fier de moi" }, de: "Stolz", it: "Gongolante", ja: "鼻高々", ko: "우쭐함" },
  "nervous": { es: { m: "Nervioso", f: "Nerviosa", n: "Con nervios" }, pt: "Com ansiedade", id: "Gugup", fr: { m: "Nerveux", f: "Nerveuse", n: "Nerveux" }, de: "Nervös", it: "In ansia", ja: "緊張", ko: "긴장" },
  "drained": { es: { m: "Agotado", f: "Agotada", n: "Sin energía" }, pt: "Sem energia", id: "Lemas", fr: { m: "Vidé", f: "Vidée", n: "Sans énergie" }, de: "Ausgelaugt", it: { m: "Sfinito", f: "Sfinita", n: "Senza forze" }, ja: "ぐったり", ko: "방전" },
  "crying": { es: "Llorando", pt: "Chorando", id: "Menangis", fr: "En larmes", de: "In Tränen", it: "In lacrime", ja: "泣いてる", ko: "눈물" },
  "shy": { es: { m: "Tímido", f: "Tímida", n: "Con vergüenza" }, pt: "Com vergonha", id: "Malu-malu", fr: "Timide", de: "Verlegen", it: { m: "Timido", f: "Timida", n: "Timido" }, ja: "照れてる", ko: "쑥스러움" },
  "mischievous": { es: { m: "Travieso", f: "Traviesa", n: "Travieso" }, pt: "Aprontando", id: "Jahil", fr: "Espiègle", de: "Schelmisch", it: { m: "Birichino", f: "Birichina", n: "Birichino" }, ja: "企んでる", ko: "짓궂음" },
  "unimpressed": { es: "Indiferente", pt: "Indiferente", id: "Sinis", fr: { m: "Blasé", f: "Blasée", n: "Blasé" }, de: "Gelangweilt", it: { m: "Annoiato", f: "Annoiata", n: "Annoiato" }, ja: "冷めてる", ko: "시큰둥함" },
  "delighted": { es: "Radiante", pt: "Rindo à toa", id: "Girang", fr: "Aux anges", de: "Bester Laune", it: "Raggiante", ja: "うれしい", ko: "기쁨" },
  "excited": { es: { m: "Emocionado", f: "Emocionada", n: "Emocionado" }, pt: { m: "Empolgado", f: "Empolgada", n: "Vibrando" }, id: "Bersemangat", fr: "Enthousiaste", de: "Begeistert", it: "Entusiasta", ja: "わくわく", ko: "신남" },
  "mad": { es: { m: "Furioso", f: "Furiosa", n: "Echando chispas" }, pt: { m: "Furioso", f: "Furiosa", n: "Fora de mim" }, id: "Geram", fr: "Hors de moi", de: "Stinksauer", it: { m: "Furioso", f: "Furiosa", n: "Su tutte le furie" }, ja: "キレそう", ko: "분노" },
  "playful": { es: "Bromista", pt: "Zoando", id: "Iseng", fr: { m: "Taquin", f: "Taquine", n: "Taquin" }, de: "Albern", it: { m: "Giocoso", f: "Giocosa", n: "In vena di scherzi" }, ja: "ノリノリ", ko: "장난스러움" },
  "over-it": { es: { m: "Harto", f: "Harta", n: "Hasta la coronilla" }, pt: "De saco cheio", id: "Jenuh", fr: "Ras-le-bol", de: "Bedient", it: { m: "Stufo", f: "Stufa", n: "Stufo" }, ja: "うんざり", ko: "질림" },
};
/** whose pronoun the gendered names agree with: the reader's own (they until it is known) */
let moodPronoun: PronounId = "they";
export function setMoodPronoun(p: PronounId): void {
  moodPronoun = p;
}

export const moodName = (id: FaceId): string => {
  const lang = getLang();
  if (lang === "en") return getMood(id).n;
  const v = (MOOD_LOC[id] as Record<string, MoodLocName> | undefined)?.[lang];
  if (!v) return getMood(id).n;
  if (typeof v === "string") return v;
  return (moodPronoun === "she" ? v.f : moodPronoun === "he" ? v.m : v.n) || v.m;
};

/* ── THE FOUR GROUPS (10a, owner 2026-10-15 / 2026-10-16) ─────────────
   10a draws a page's mood as one of four colours with a line face: Calm,
   Happy, Tired, Low. The owner kept the thirty faces as the choices INSIDE
   a group: "四组（平静/开心/累/低落），生气类归「低落」，不加第五组" — the
   angry faces go to Low, there is no fifth group.

   GROUP ONLY (owner, 2026-10-16): tapping a group's colour block and no face
   stores that group itself (MOOD_GROUP_IDS: group-calm …), shown with the
   group's own icon and named by the group ("OCT 14 · 21:37 · Low"). It
   replaced the default face the block used to store (MOOD_GROUP_DEFAULT,
   retired: Calm / Cheerful / Sleepy / Nervous said more than a writer who
   only chose blue). A face page keeps its face, its name and its group,
   worked out from the face every time it is drawn.

   The table below is the owner's (plan doc, 2026-10-15): Unimpressed is
   Tired, anger is Low. A change here moves pages between colours, names and
   tones, so it is a product change, not a refactor.

   The colours are the 10a mood pairs in themes.json "mood" (theme/themes
   MOOD10A, KMood in Swift), the same in every theme; this file stays free
   of them so the pure builders and their node tests can read the table. */

export type MoodGroup = "calm" | "happy" | "tired" | "low";

/** the four groups, in the owner's order */
export const MOOD_GROUPS: readonly MoodGroup[] = ["calm", "happy", "tired", "low"];

/** every face in its group (5 + 9 + 6 + 10 = 30) — the owner's table (plan doc, 2026-10-15):
    Unimpressed is Tired, anger is Low */
export const MOOD_GROUP_FACES: Readonly<Record<MoodGroup, readonly FaceId[]>> = {
  calm: ["calm", "content", "pleased", "okay", "shy"],
  happy: ["cheerful", "delighted", "excited", "playful", "in-love", "amazed", "surprised", "smug", "mischievous"],
  tired: ["sleepy", "drained", "numb", "meh", "over-it", "unimpressed"],
  low: ["nervous", "crying", "heartbroken", "shocked", "stunned", "frustrated", "irritable", "grumpy", "angry", "mad"],
};

/** what a group-only page stores, per group */
export const MOOD_GROUP_IDS: Readonly<Record<MoodGroup, GroupMoodId>> = {
  calm: "group-calm",
  happy: "group-happy",
  tired: "group-tired",
  low: "group-low",
};

/** each group's display name key (strings-step5-notes) */
export const MOOD_GROUP_KEY: Readonly<Record<MoodGroup, string>> = {
  calm: "mood.group.calm",
  happy: "mood.group.happy",
  tired: "mood.group.tired",
  low: "mood.group.low",
};

/** A group-only page's tone, for the empty-page sparks and the private Aura tone stickers. Tired is
    flat, on purpose: the default face it replaced (Sleepy) was soft. */
export const MOOD_GROUP_TONE: Readonly<Record<MoodGroup, MoodTone>> = {
  calm: "soft",
  happy: "up",
  tired: "flat",
  low: "low",
};

const GROUP_OF = (() => {
  const out = {} as Record<FaceId, MoodGroup>;
  for (const g of MOOD_GROUPS) for (const id of MOOD_GROUP_FACES[g]) out[id] = g;
  return out;
})();

const GROUP_OF_ID = (() => {
  const out = {} as Record<GroupMoodId, MoodGroup>;
  for (const g of MOOD_GROUPS) out[MOOD_GROUP_IDS[g]] = g;
  return out;
})();

/** A stored value that chose a group and no face. */
export const isGroupOnly = (id?: string | null): id is GroupMoodId => typeof id === "string" && has(GROUP_OF_ID, id);

/** The face a stored value names: a face, or a legacy id's face; null for a group-only value and for
    a missing or unknown one. */
export const moodFace = (id?: string | null): FaceId | null => {
  if (!id) return null;
  if (has(FACES, id)) return id as FaceId;
  return has(LEGACY_MOOD, id) ? LEGACY_MOOD[id] : null;
};

/** A stored value's group. Group ids first (getMood would make them Calm); then the face, the seven
    legacy ids by their face; a missing or unknown value is Calm (the colour a page with no readable
    mood has always been drawn in). */
export const moodGroup = (id?: string | null): MoodGroup => {
  if (isGroupOnly(id)) return GROUP_OF_ID[id];
  return GROUP_OF[getMood(id).id] ?? "calm";
};

/** What a page is drawn as: its face (a legacy id as its new face), its group id when only a group
    was chosen, and group-calm when nothing readable was stored. */
export const resolveMood = (id?: string | null): MoodId => moodFace(id) ?? (isGroupOnly(id) ? id : MOOD_GROUP_IDS.calm);

/** A stored value's art key in data/mood-art: "mood-<face>" for a face (a legacy id by its face),
    "mood-group-<g>" for a group alone, "mood-group-calm" for a missing or unknown value. */
export const moodArtKey = (id?: string | null): string => `mood-${resolveMood(id)}`;

/** Whether a page ever stored a mood this app can name: a face, a legacy id, or a group alone. A page
    without one keeps the Calm colour but shows no mood name ("· Calm" would claim a choice that was
    never made). */
export const isNamedMood = (id?: string | null): boolean => isGroupOnly(id) || moodFace(id) !== null;

/** The name after the date, in the reader's language: the group's name for a group alone, the face's
    name for a face (a legacy id by its face), "" for a missing or unknown value. */
export const moodLabel = (id?: string | null): string => {
  if (isGroupOnly(id)) return t(MOOD_GROUP_KEY[GROUP_OF_ID[id]]);
  const face = moodFace(id);
  return face ? moodName(face) : "";
};

/** A stored value's tone: the group's (MOOD_GROUP_TONE) for a group alone, the face's otherwise (a
    missing or unknown value is Calm's, soft). */
export const moodTone = (id?: string | null): MoodTone => (isGroupOnly(id) ? MOOD_GROUP_TONE[GROUP_OF_ID[id]] : getMood(id).tone);
