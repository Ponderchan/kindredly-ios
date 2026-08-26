import type { LangResources } from "./types";

/* Spanish resources — modern, natural Spanish, incl. informal register.
   Not translated from English: `pues/quizá/en realidad` are the real hedges,
   `jaja` the real laughter, `q/xq/tmb` the real chat quirks. */
export const ES: LangResources = {
  hedges: ["pues", "quizá", "quizás", "tal", "vez", "como", "entonces", "aunque", "todavía", "realidad", "verdad", "bueno", "igual", "capaz", "supongo", "creo", "osea", "o", "sea", "medio", "bastante", "muy"],
  affectPos: ["feliz", "contento", "contenta", "alegre", "emocionado", "emocionada", "amor", "amo", "encanta", "agradecido", "agradecida", "orgulloso", "orgullosa", "increíble", "maravilloso", "aliviado", "aliviada", "ilusión", "esperanza", "sonrisa", "sonreír", "reír", "lindo", "hermoso", "bonito"],
  affectNeg: ["cansado", "cansada", "agotado", "agotada", "triste", "llorar", "lágrimas", "solo", "sola", "solitario", "vacío", "vacía", "ansioso", "ansiosa", "ansiedad", "asustado", "asustada", "miedo", "preocupado", "preocupada", "dolor", "duele", "odio", "enojado", "enojada", "roto", "rota", "extraño", "extraña", "extrañar", "pena", "abrumado", "abrumada", "estrés", "estresado", "avergonzado", "culpa", "pesado", "frío"],
  laughter: /(jaja+|jeje+|jiji+|jaj+|jsjs+)/i,
  question: /[?¿]/,
  ownedFrame: /\b(me siento|me sentí|me siento|extraño|extraña|amo|odio|espero|necesito|quiero)\b/i,
  distanceFrame: /\b(alguien que|la persona que|el tipo de persona|una persona que|verme desde)\b/i,
  firstPerson: ["yo", "me", "mi", "mí", "mis", "conmigo", "nosotros", "nosotras"],
  outward: ["ellos", "ellas", "él", "ella", "gente", "alguien", "todos", "todo", "mundo", "afuera", "calle", "ventana", "cuarto", "habitación"],
  abstract: /\b\w+(ción|sión|dad|tad|ismo|miento|anza|encia|ura|eza)\b/gi,
  detailOpeners: /^(el|la|los|las|un|una|hay|esto|eso|aquella|aquel|la lluvia|la noche|la mañana|mi|su)\b/i,
  quirks: (text, tokens) => {
    const q: string[] = [];
    if (/jaja+|jeje+/i.test(text)) q.push("laugh-jaja");
    // chat spellings — repeated to count as a quirk
    if (tokens.filter((t) => ["q", "xq", "pq", "tmb", "tb", "pa", "xa", "d", "k"].includes(t)).length >= 2) q.push("chat-spelling");
    if (/¿/.test(text) && /\?/.test(text)) q.push("inverted-question");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["extraño", "extraña", "extrañar", "extrañé", "falta", "ausencia", "se fue", "lejos"] },
    { theme: "tired", words: ["cansado", "cansada", "agotado", "agotada", "reventado", "quemado"] },
    { theme: "family", words: ["mamá", "mama", "papá", "papa", "familia", "padres", "hermano", "hermana", "abuela", "abuelo"] },
    { theme: "work", words: ["trabajo", "chamba", "jefe", "jefa", "reunión", "oficina", "turno", "curro"] },
    { theme: "sleep", words: ["dormir", "sueño", "despierto", "despierta", "insomnio", "noche", "madrugada", "cama"] },
    { theme: "loneliness", words: ["solo", "sola", "solitario", "solitaria", "nadie", "aislado"] },
    { theme: "friendship", words: ["amigo", "amiga", "amigos", "amigas", "amistad"] },
    { theme: "love", words: ["amor", "amo", "crush", "cita", "beso", "corazón", "enamorado", "enamorada"] },
    { theme: "home", words: ["casa", "hogar", "cuarto", "habitación", "cocina", "puerta", "departamento"] },
    { theme: "memory", words: ["recuerdo", "recuerdos", "recordar", "infancia", "antes", "solía"] },
    { theme: "future", words: ["futuro", "algún día", "plan", "mañana", "próximo", "esperanza"] },
    { theme: "small_win", words: ["por fin", "logré", "conseguí", "orgulloso", "orgullosa", "terminé", "avance"] },
    { theme: "uncertainty", words: ["quizá", "quizás", "confundido", "confundida", "perdido", "perdida", "nose", "duda"] },
  ],
};
