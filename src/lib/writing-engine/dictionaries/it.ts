import type { LangResources } from "./types";

/* Italian resources — spoken Italian as it lands in a text box. The hedges
   are the ones an Italian mouth actually uses: `boh / cioè / tipo / magari
   / insomma / mi sa / diciamo` — louder than "maybe", because they shrug
   as well as soften. `ahah / eheh` is the laughter (an Italian laugh starts
   with the vowel), `xké / cmq / nn / raga` the chat spellings. Apostrophes
   (un po', c'è, l'unica) tokenize as their bare pieces, so "po" and "c"
   are counted where they must be and left alone elsewhere. */
export const IT: LangResources = {
  hedges: ["boh", "cioè", "tipo", "magari", "forse", "insomma", "praticamente", "diciamo", "in realtà", "un po'", "abbastanza", "credo", "penso", "mi sa", "secondo me", "comunque", "alla fine", "in effetti", "quasi", "più o meno", "vabbè", "vabbe", "mah", "non so", "non lo so", "probabilmente", "in un certo senso", "a quanto pare", "sembra"],
  affectPos: ["felice", "contento", "contenta", "gioia", "amore", "amo", "adoro", "grato", "grata", "orgoglioso", "orgogliosa", "incredibile", "meraviglioso", "meravigliosa", "sollevato", "sollevata", "speranza", "sorriso", "sorridere", "ridere", "bello", "bella", "dolce", "tenero", "tenera", "caldo", "calda", "sereno", "serena", "leggero", "leggera", "tranquillo", "tranquilla", "emozionato", "emozionata"],
  affectNeg: ["stanco", "stanca", "esausto", "esausta", "distrutto", "distrutta", "triste", "piangere", "pianto", "lacrime", "solo", "sola", "solitudine", "vuoto", "vuota", "ansioso", "ansiosa", "ansia", "paura", "preoccupato", "preoccupata", "dolore", "male", "odio", "arrabbiato", "arrabbiata", "rotto", "rotta", "manca", "manchi", "mancanza", "vergogna", "colpa", "stress", "stressato", "stressata", "pesante", "freddo", "perso", "persa", "deluso", "delusa", "ferito", "ferita", "nervoso", "nervosa"],
  laughter: /(ahah+|haha+|hahah+|eheh+|hihi+|lol+|xd+|asd+)/i,
  question: /\?|\b(no|vero|giusto)\s*\?/i,
  ownedFrame: /\b(mi sento|mi sono sentito|mi sono sentita|mi manchi|mi manca|mi mancate|amo|odio|spero|ho bisogno|voglio|ho paura|temo)\b/i,
  distanceFrame: /\b(qualcuno che|il tipo di persona|una persona che|la persona che sono|vedermi da fuori|da fuori|come un estraneo|come un['’]estranea)\b/i,
  firstPerson: ["io", "me", "mi", "mio", "mia", "miei", "mie", "noi", "ci", "nostro", "nostra", "nostri", "nostre"],
  outward: ["loro", "lui", "lei", "gente", "qualcuno", "tutti", "mondo", "fuori", "strada", "finestra", "stanza", "camera", "altri", "altre", "vicino", "vicina", "città"],
  abstract: /\b\w+(zione|sione|tà|ismo|mento|anza|enza|ura|ezza|aggine)\b/gi,
  detailOpeners: /^(il|lo|la|i|gli|le|un|una|uno|c['’]è|ci sono|c['’]era|questo|questa|quel|quella|quello|la pioggia|la notte|la mattina|stamattina|stasera|ieri|mio|mia|suo|sua|nella|nel|sulla|sul|davanti)\b/i,
  quirks: (text, tokens) => {
    const q: string[] = [];
    if (/ahah+|eheh+/i.test(text)) q.push("laugh-ahah");
    // chat spellings — repeated to count as a quirk
    if (tokens.filter((t) => ["xké", "xke", "xche", "cmq", "nn", "ke", "xò", "xo", "qlc", "qlcs", "qnd", "tvb", "tvtb", "raga", "cmnq", "grz", "prg", "sn", "cn"].includes(t)).length >= 2) q.push("chat-spelling");
    // the shrug as a tic: two "boh" in one letter is a way of standing
    if (tokens.filter((t) => t === "boh").length >= 2) q.push("boh");
    // "cioè" as the way a thought restarts
    if (tokens.filter((t) => t === "cioè").length >= 2) q.push("cioè");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["manca", "manchi", "mancanza", "mi manca", "mi manchi", "assenza", "lontano", "lontana", "andato via", "senza di te", "nostalgia"] },
    { theme: "tired", words: ["stanco", "stanca", "esausto", "esausta", "distrutto", "distrutta", "sfinito", "sfinita", "a pezzi", "non ce la faccio"] },
    { theme: "family", words: ["mamma", "papà", "papa", "famiglia", "genitori", "fratello", "sorella", "nonna", "nonno", "zia", "zio", "madre", "padre"] },
    { theme: "work", words: ["lavoro", "capo", "riunione", "ufficio", "turno", "collega", "colleghi", "stage", "università", "uni", "esame"] },
    { theme: "sleep", words: ["dormire", "sonno", "sveglio", "sveglia", "insonnia", "notte", "letto", "addormentarmi", "le tre di notte", "svegliarmi"] },
    { theme: "loneliness", words: ["solo", "sola", "solitudine", "nessuno", "isolato", "isolata", "da solo", "da sola"] },
    { theme: "friendship", words: ["amico", "amica", "amici", "amiche", "amicizia", "migliore amica", "migliore amico", "raga"] },
    { theme: "love", words: ["amore", "amo", "crush", "appuntamento", "bacio", "cuore", "innamorato", "innamorata", "coppia", "ex", "insieme"] },
    { theme: "home", words: ["casa", "a casa", "appartamento", "stanza", "camera", "cucina", "porta", "balcone"] },
    { theme: "memory", words: ["ricordo", "ricordi", "ricordare", "infanzia", "prima", "una volta", "da piccolo", "da piccola", "quando ero"] },
    { theme: "future", words: ["futuro", "un giorno", "piano", "piani", "progetto", "domani", "prossimo", "prossima", "speranza", "presto"] },
    { theme: "small_win", words: ["finalmente", "ce l'ho fatta", "riuscito", "riuscita", "orgoglioso", "orgogliosa", "finito", "finita", "vinto", "fatto"] },
    { theme: "uncertainty", words: ["forse", "boh", "non so", "non lo so", "perso", "persa", "confuso", "confusa", "dubbio", "nessuna idea", "chissà"] },
  ],
};
