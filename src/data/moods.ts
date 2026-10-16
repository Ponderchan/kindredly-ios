import { getLang } from "../lib/i18n";
/* The Kindredly moods — 30 icons designed as colored shapes-with-faces
   (art in data/mood-art.ts). Colors/tones come from that design file.
   `n` = display name; `col` the shape color; `bg` a light plate tint;
   `tone` groups them for palettes. LEGACY_MOOD maps the original 8
   backend ids onto the nearest new id so old journal entries still render. */

export type MoodId =
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

export type MoodTone = "soft" | "up" | "spark" | "edge" | "low" | "flat";
export interface Mood { id: MoodId; n: string; col: string; bg: string; tone: MoodTone }

export const MOODS: Record<MoodId, Mood> = {
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

export const MOOD_IDS: MoodId[] = [
  "calm", "numb", "content", "in-love", "surprised", "shocked", "frustrated", "stunned", "cheerful", "pleased", "sleepy", "irritable", "amazed", "angry", "okay", "heartbroken", "grumpy", "meh", "smug", "nervous", "drained", "crying", "shy", "mischievous", "unimpressed", "delighted", "excited", "mad", "playful", "over-it"
];

/* zh labels (parallel to MOODS) */
export const MOOD_ZH: Record<MoodId, string> = {
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
export const LEGACY_MOOD: Record<string, MoodId> = {
  "tender": "in-love",
  "restless": "irritable",
  "wistful": "sleepy",
  "warm": "content",
  "distant": "numb",
  "bright": "cheerful",
  "heavy": "drained",
};

export const getMood = (id?: string | null): Mood => {
  if (!id) return MOODS.calm;
  if (MOODS[id as MoodId]) return MOODS[id as MoodId];
  const alias = LEGACY_MOOD[id];
  return (alias && MOODS[alias]) || MOODS.calm;
};

/* localized display names — en is the mood's own `n`; es/pt/id here.
   The web backend keeps its own copy of `n`; this is display-only. */
const MOOD_LOC: Partial<Record<MoodId, { es: string; pt: string; id: string; fr: string; de: string; it: string; ja: string; ko: string }>> = {
  "calm": { es: "Tranquilo", pt: "Calmo", id: "Tenang", fr: "Calme", de: "Ruhig", it: "Calmo", ja: "おだやか", ko: "차분함" },
  "numb": { es: "Insensible", pt: "Entorpecido", id: "Mati rasa", fr: "Engourdi", de: "Taub", it: "Intorpidito", ja: "無感覚", ko: "무감각" },
  "content": { es: "A gusto", pt: "Contente", id: "Puas", fr: "Serein", de: "Zufrieden", it: "Contento", ja: "満ち足りた", ko: "만족" },
  "in-love": { es: "Enamorado", pt: "Apaixonado", id: "Jatuh cinta", fr: "Amoureux", de: "Verliebt", it: "Innamorato", ja: "恋してる", ko: "사랑에 빠짐" },
  "surprised": { es: "Sorprendido", pt: "Surpreso", id: "Terkejut", fr: "Surpris", de: "Überrascht", it: "Sorpreso", ja: "びっくり", ko: "놀람" },
  "shocked": { es: "Impactado", pt: "Chocado", id: "Kaget", fr: "Choqué", de: "Schockiert", it: "Scioccato", ja: "ショック", ko: "충격" },
  "frustrated": { es: "Frustrado", pt: "Frustrado", id: "Frustrasi", fr: "Frustré", de: "Frustriert", it: "Frustrato", ja: "もどかしい", ko: "답답함" },
  "stunned": { es: "Atónito", pt: "Atônito", id: "Tercengang", fr: "Sidéré", de: "Fassungslos", it: "Sbalordito", ja: "呆然", ko: "멍함" },
  "cheerful": { es: "Alegre", pt: "Alegre", id: "Ceria", fr: "Joyeux", de: "Fröhlich", it: "Allegro", ja: "うきうき", ko: "명랑" },
  "pleased": { es: "Satisfecho", pt: "Satisfeito", id: "Senang", fr: "Ravi", de: "Erfreut", it: "Soddisfatto", ja: "うれしい", ko: "흡족" },
  "sleepy": { es: "Con sueño", pt: "Com sono", id: "Mengantuk", fr: "Somnolent", de: "Schläfrig", it: "Assonnato", ja: "ねむい", ko: "졸림" },
  "irritable": { es: "Irritable", pt: "Irritado", id: "Mudah kesal", fr: "Irritable", de: "Gereizt", it: "Irritabile", ja: "イライラ", ko: "예민함" },
  "amazed": { es: "Asombrado", pt: "Maravilhado", id: "Takjub", fr: "Émerveillé", de: "Verblüfft", it: "Meravigliato", ja: "感動", ko: "경이로움" },
  "angry": { es: "Enojado", pt: "Bravo", id: "Marah", fr: "En colère", de: "Wütend", it: "Arrabbiato", ja: "怒り", ko: "화남" },
  "okay": { es: "Bien", pt: "Ok", id: "Baik saja", fr: "Ça va", de: "Okay", it: "Okay", ja: "まあまあ", ko: "괜찮음" },
  "heartbroken": { es: "Con el corazón roto", pt: "De coração partido", id: "Patah hati", fr: "Le cœur brisé", de: "Gebrochenes Herz", it: "Cuore spezzato", ja: "失恋", ko: "상심" },
  "grumpy": { es: "Gruñón", pt: "Rabugento", id: "Uring-uringan", fr: "Grognon", de: "Mürrisch", it: "Scontroso", ja: "不機嫌", ko: "시무룩" },
  "meh": { es: "Meh", pt: "Meh", id: "Biasa aja", fr: "Bof", de: "Meh", it: "Meh", ja: "びみょう", ko: "그저 그럼" },
  "smug": { es: "Presumido", pt: "Convencido", id: "Puas diri", fr: "Fier de moi", de: "Selbstgefällig", it: "Compiaciuto", ja: "得意げ", ko: "우쭐" },
  "nervous": { es: "Nervioso", pt: "Nervoso", id: "Gugup", fr: "Nerveux", de: "Nervös", it: "Nervoso", ja: "緊張", ko: "긴장" },
  "drained": { es: "Agotado", pt: "Esgotado", id: "Terkuras", fr: "Vidé", de: "Ausgelaugt", it: "Svuotato", ja: "消耗", ko: "탈진" },
  "crying": { es: "Llorando", pt: "Chorando", id: "Menangis", fr: "En larmes", de: "Weinend", it: "In lacrime", ja: "泣いてる", ko: "울고 있음" },
  "shy": { es: "Tímido", pt: "Tímido", id: "Malu-malu", fr: "Timide", de: "Schüchtern", it: "Timido", ja: "照れ", ko: "수줍음" },
  "mischievous": { es: "Travieso", pt: "Travesso", id: "Jahil", fr: "Espiègle", de: "Schelmisch", it: "Birichino", ja: "いたずら心", ko: "장난기" },
  "unimpressed": { es: "Indiferente", pt: "Sem entusiasmo", id: "Datar", fr: "Pas impressionné", de: "Unbeeindruckt", it: "Indifferente", ja: "冷めてる", ko: "시큰둥" },
  "delighted": { es: "Encantado", pt: "Encantado", id: "Girang", fr: "Enchanté", de: "Entzückt", it: "Felicissimo", ja: "大喜び", ko: "기쁨" },
  "excited": { es: "Emocionado", pt: "Empolgado", id: "Bersemangat", fr: "Excité", de: "Aufgeregt", it: "Entusiasta", ja: "わくわく", ko: "신남" },
  "mad": { es: "Furioso", pt: "Furioso", id: "Berang", fr: "Furieux", de: "Sauer", it: "Furioso", ja: "激怒", ko: "격분" },
  "playful": { es: "Juguetón", pt: "Brincalhão", id: "Iseng", fr: "Joueur", de: "Verspielt", it: "Giocoso", ja: "遊び心", ko: "장난스러움" },
  "over-it": { es: "Harto", pt: "De saco cheio", id: "Muak", fr: "Lassé", de: "Fertig damit", it: "Stufo", ja: "もううんざり", ko: "질림" },
};
export const moodName = (id: MoodId): string => {
  const lang = getLang();
  if (lang === "en") return getMood(id).n;
  return (MOOD_LOC[id] as any)?.[lang] || getMood(id).n;
};

/* ── THE FOUR GROUPS (10a, owner 2026-10-15) ───────────────────────────
   10a draws a page's mood as one of four colours with a line face: Calm,
   Happy, Tired, Low. The owner kept the thirty faces as the choices INSIDE
   a group: "四组（平静/开心/累/低落），生气类归「低落」，不加第五组" — the
   angry faces go to Low, there is no fifth group. Storage is unchanged: a
   page still stores one of the thirty MoodIds (or an old legacy id), and its
   group is worked out from that face every time it is drawn.

   The table below is the mapping the owner asked to be shown ("映射表待出给
   他看"); it is built by tone and is a proposal until he signs it off. The
   FIRST face of each group is the one stored when only the colour block is
   tapped (owner question 8's default: Calm / Cheerful / Sleepy / Nervous —
   not Heartbroken, which says more than a writer who only chose blue did).
   That face's name is printed after the date and its tone feeds the
   empty-page sparks and the private Aura tone stickers, so a change here is
   a product change, not a refactor.

   The colours are the 10a mood pairs in themes.json "mood" (theme/themes
   MOOD10A, KMood in Swift), the same in every theme; this file stays free
   of them so the pure builders and their node tests can read the table. */

export type MoodGroup = "calm" | "happy" | "tired" | "low";

/** the four groups, in the owner's order */
export const MOOD_GROUPS: readonly MoodGroup[] = ["calm", "happy", "tired", "low"];

/** every face in its group, the group's default face first (5 + 9 + 6 + 10 = 30) — the owner's
    table (plan doc, 2026-10-15): Unimpressed is Tired, anger is Low */
export const MOOD_GROUP_FACES: Readonly<Record<MoodGroup, readonly MoodId[]>> = {
  calm: ["calm", "content", "pleased", "okay", "shy"],
  happy: ["cheerful", "delighted", "excited", "playful", "in-love", "amazed", "surprised", "smug", "mischievous"],
  tired: ["sleepy", "drained", "numb", "meh", "over-it", "unimpressed"],
  low: ["nervous", "crying", "heartbroken", "shocked", "stunned", "frustrated", "irritable", "grumpy", "angry", "mad"],
};

/** the face stored when a group's colour block is tapped and no face is picked (owner question 8) */
export const MOOD_GROUP_DEFAULT: Readonly<Record<MoodGroup, MoodId>> = {
  calm: MOOD_GROUP_FACES.calm[0],
  happy: MOOD_GROUP_FACES.happy[0],
  tired: MOOD_GROUP_FACES.tired[0],
  low: MOOD_GROUP_FACES.low[0],
};

/** each group's display name key (strings-step5-notes) */
export const MOOD_GROUP_KEY: Readonly<Record<MoodGroup, string>> = {
  calm: "mood.group.calm",
  happy: "mood.group.happy",
  tired: "mood.group.tired",
  low: "mood.group.low",
};

const GROUP_OF = (() => {
  const out = {} as Record<MoodId, MoodGroup>;
  for (const g of MOOD_GROUPS) for (const id of MOOD_GROUP_FACES[g]) out[id] = g;
  return out;
})();

/** A stored mood's group, through getMood: the seven legacy ids map by their face, and a missing
    or unknown value is Calm (the colour a page with no readable mood has always been drawn in). */
export const moodGroup = (id?: string | null): MoodGroup => GROUP_OF[getMood(id).id] ?? "calm";

/** Whether a page ever stored a mood this app can name: one of the thirty, or a legacy id. A page
    without one keeps the Calm colour but shows no mood name ("· Calm" would claim a choice that was
    never made). */
export const isNamedMood = (id?: string | null): boolean => !!id && (id in MOODS || id in LEGACY_MOOD);
