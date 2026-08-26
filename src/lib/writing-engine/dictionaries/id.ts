import type { LangResources } from "./types";

/* Indonesian resources — informal modern Indonesian, NOT just formal
   dictionary Indonesian. The colloquial particles (`sih/deh/kok/dong/kan/
   nih`), the slang pronouns (`gue/gw`), the negations (`gak/nggak`), and
   `wkwk` laughter carry the strongest style signal and must not be discarded
   as noise. `banget` (intensifier) is a strong affect amplifier. */
export const ID: LangResources = {
  // discourse particles are the heart of Indonesian conversational style
  hedges: ["sih", "deh", "kok", "dong", "kan", "nih", "kayak", "kaya", "mungkin", "sebenarnya", "sebenernya", "jadi", "juga", "agak", "kok", "ya", "lah", "aja", "gitu", "gimana", "kali", "soalnya"],
  affectPos: ["senang", "bahagia", "gembira", "seneng", "suka", "cinta", "sayang", "syukur", "bersyukur", "bangga", "lega", "harapan", "senyum", "tersenyum", "tertawa", "ketawa", "indah", "cantik", "keren", "asyik", "seru"],
  affectNeg: ["lelah", "capek", "capai", "cape", "sedih", "menangis", "nangis", "air mata", "sendiri", "sendirian", "sepi", "kesepian", "hampa", "kosong", "cemas", "khawatir", "takut", "sakit", "terluka", "benci", "marah", "kesal", "kecewa", "rindu", "kangen", "hilang", "putus", "stres", "malu", "bersalah", "berat", "dingin", "hancur"],
  laughter: /(wk{2,}|wkwk+|haha+|hehe+|xixi+|hehehe)/i,
  question: /[?]|(kah|kan)\b\s*[?]?\s*$/i,
  ownedFrame: /\b(aku merasa|saya merasa|gue merasa|aku rindu|aku kangen|aku suka|aku benci|aku takut|aku mau)\b/i,
  distanceFrame: /\b(orang yang|tipe orang yang|seseorang yang|melihat diriku)\b/i,
  firstPerson: ["aku", "saya", "gue", "gw", "gua", "ku", "aku", "kami", "kita"],
  outward: ["mereka", "dia", "orang", "seseorang", "semua", "semuanya", "dunia", "luar", "jalan", "jendela", "kamar", "ruangan", "orang-orang"],
  // Indonesian abstracts via ke-...-an / pe-...-an circumfixes and -nya
  abstract: /\b(ke\w+an|pe\w+an|per\w+an)\b/gi,
  detailOpeners: /^(hujan|malam|pagi|langit|di|ada|itu|ini|sebuah|seorang|rumah|kamar|jendela)\b/i,
  quirks: (text, tokens) => {
    const q: string[] = [];
    if ((text.match(/(\.\.\.|…)/g) || []).length >= 2) q.push("ellipses");
    if (/wk{2,}|wkwk+/i.test(text)) q.push("laugh-wkwk");
    // colloquial particles used as a habit — a strong Indonesian style tell
    if (tokens.filter((t) => ["sih", "deh", "dong", "kok", "nih", "aja", "banget"].includes(t)).length >= 2) q.push("particles");
    if (tokens.filter((t) => ["gue", "gw", "gua", "gak", "nggak", "ga", "ngga", "udah", "udh", "aja", "gitu"].includes(t)).length >= 2) q.push("slang-spelling");
    if (/([a-z])\1{2,}/i.test(text)) q.push("stretched-letters"); // "senengggg"
    if (/[a-z]([!?])\1{1,}/i.test(text)) q.push("repeated-punct");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["rindu", "kangen", "hilang", "pergi", "jauh", "kehilangan"] },
    { theme: "tired", words: ["lelah", "capek", "cape", "capai", "letih", "penat", "burnout"] },
    { theme: "family", words: ["ibu", "mama", "bapak", "ayah", "papa", "keluarga", "orangtua", "kakak", "adik", "nenek", "kakek"] },
    { theme: "work", words: ["kerja", "kerjaan", "kantor", "bos", "rapat", "meeting", "shift", "tugas"] },
    { theme: "sleep", words: ["tidur", "ngantuk", "terjaga", "insomnia", "malam", "dini", "kasur", "begadang"] },
    { theme: "loneliness", words: ["sendiri", "sendirian", "sepi", "kesepian", "sunyi"] },
    { theme: "friendship", words: ["teman", "temen", "sahabat", "kawan", "persahabatan"] },
    { theme: "love", words: ["cinta", "sayang", "suka", "gebetan", "kencan", "ciuman", "hati", "jatuh cinta"] },
    { theme: "home", words: ["rumah", "kamar", "dapur", "pintu", "kos", "kosan", "ruang"] },
    { theme: "memory", words: ["ingat", "kenangan", "mengingat", "dulu", "masa kecil", "waktu itu"] },
    { theme: "future", words: ["masa depan", "suatu hari", "rencana", "besok", "nanti", "harapan"] },
    { theme: "small_win", words: ["akhirnya", "berhasil", "bangga", "selesai", "kemajuan", "bisa"] },
    { theme: "uncertainty", words: ["mungkin", "bingung", "hilang", "gatau", "gak tau", "ragu"] },
  ],
};
