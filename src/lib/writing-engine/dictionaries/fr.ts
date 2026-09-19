import type { LangResources } from "./types";

/* French resources — contemporary French as it is actually typed, informal
   register included. Nothing here is English rearranged: `du coup / en vrai
   / bref / genre / enfin` are the real hedges (louder than "maybe" — a
   French sentence hedges with its connectives), `mdr / ptdr / ahah` the
   real laughter, `pk / jsp / bcp / tkt` the real chat spellings. Elided
   forms (j', m', c', qu') tokenize as their bare letter, so `j` and `m`
   count as first person and `c` / `qu` are left alone. */
export const FR: LangResources = {
  hedges: ["peut-être", "sans doute", "du coup", "en vrai", "en fait", "bref", "genre", "enfin", "quand même", "plutôt", "assez", "un peu", "je crois", "je pense", "je sais pas", "je sais pas trop", "j'imagine", "on dirait", "apparemment", "en gros", "disons", "ben", "franchement", "probablement", "presque", "vaguement", "limite", "à peu près", "j'ai l'impression", "on va dire"],
  affectPos: ["heureux", "heureuse", "content", "contente", "joie", "joyeux", "joyeuse", "amour", "aime", "adore", "reconnaissant", "reconnaissante", "fier", "fière", "incroyable", "merveilleux", "merveilleuse", "soulagé", "soulagée", "espoir", "sourire", "souris", "rire", "beau", "belle", "doux", "douce", "tendre", "chaleureux", "chaleureuse", "serein", "sereine", "apaisé", "apaisée", "léger", "légère", "chouette"],
  affectNeg: ["fatigué", "fatiguée", "épuisé", "épuisée", "crevé", "crevée", "triste", "pleurer", "pleuré", "larmes", "seul", "seule", "solitude", "vide", "anxieux", "anxieuse", "angoisse", "angoissé", "angoissée", "peur", "inquiet", "inquiète", "douleur", "mal", "déteste", "colère", "énervé", "énervée", "brisé", "brisée", "manque", "manques", "honte", "culpabilité", "coupable", "stress", "stressé", "stressée", "lourd", "lourde", "froid", "perdu", "perdue", "nul", "nulle", "vidé", "vidée", "blessé", "blessée"],
  laughter: /(mdr+|ptdr+|lol+|ahah+|haha+|hihi+|héhé+|hé hé|xd+|ptdrr)/i,
  question: /\?|\best-ce que\b|\bn['’]est-ce pas\b|\bnon \?|\bhein\b/i,
  ownedFrame: /\b(je me sens|je me suis senti|je me suis sentie|je ressens|tu me manques|il me manque|elle me manque|j['’]aime|je déteste|j['’]espère|j['’]ai besoin|je veux|j['’]ai peur|je crains)\b/i,
  distanceFrame: /\b(quelqu['’]un qui|le genre de personne|une personne qui|la personne que je suis|me voir de l['’]extérieur|de l['’]extérieur)\b/i,
  firstPerson: ["je", "j", "me", "m", "moi", "mon", "ma", "mes", "nous", "notre", "nos", "mien", "mienne"],
  outward: ["ils", "elles", "il", "elle", "gens", "quelqu'un", "monde", "dehors", "rue", "fenêtre", "chambre", "eux", "autres", "voisin", "voisine", "ville"],
  abstract: /\b\w+(tion|sion|ité|té|isme|ance|ence|esse|itude|ure)\b/gi,
  detailOpeners: /^(le|la|les|l'|un|une|des|il y a|il y avait|ce|cette|ces|la pluie|la nuit|le matin|ce matin|ce soir|hier|mon|ma|mes|son|sa|ses|dans|sur|devant)\b/i,
  quirks: (text, tokens) => {
    const q: string[] = [];
    if (/mdr+|ptdr+|ahah+/i.test(text)) q.push("laugh-mdr");
    // chat spellings — repeated to count as a quirk
    if (tokens.filter((t) => ["pk", "pq", "qd", "tt", "bcp", "jsp", "jpp", "tkt", "dsl", "stp", "svp", "auj", "mtn", "pr", "ds", "bjr", "bsr", "slt", "cc"].includes(t)).length >= 2) q.push("chat-spelling");
    // the connective as a tic: "du coup" twice in one breath is a voice
    if ((text.toLowerCase().match(/\bdu coup\b/g) || []).length >= 2) q.push("du-coup");
    // French typography keeps a space before ? ! : ; — a hand that does
    // it on a phone is doing it on purpose
    if ((text.match(/\S [?!;:]/g) || []).length >= 3) q.push("space-before-punct");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["manque", "manques", "manquer", "me manque", "absence", "loin", "parti", "partie", "sans toi"] },
    { theme: "tired", words: ["fatigué", "fatiguée", "épuisé", "épuisée", "crevé", "crevée", "à bout", "lessivé", "lessivée", "vidé", "vidée"] },
    { theme: "family", words: ["maman", "papa", "famille", "parents", "frère", "sœur", "soeur", "mamie", "papi", "grand-mère", "grand-père", "mère", "père"] },
    { theme: "work", words: ["travail", "boulot", "taf", "boss", "patron", "patronne", "réunion", "bureau", "collègue", "collègues", "stage"] },
    { theme: "sleep", words: ["dormir", "sommeil", "réveillé", "réveillée", "insomnie", "nuit", "insomniaque", "lit", "endormir", "trois heures du matin"] },
    { theme: "loneliness", words: ["seul", "seule", "solitude", "personne", "isolé", "isolée", "tout seul", "toute seule"] },
    { theme: "friendship", words: ["ami", "amie", "amis", "amies", "pote", "potes", "amitié", "meilleure amie", "meilleur ami"] },
    { theme: "love", words: ["amour", "aime", "crush", "rendez-vous", "baiser", "cœur", "coeur", "amoureux", "amoureuse", "couple", "ex"] },
    { theme: "home", words: ["maison", "chez moi", "appart", "appartement", "chambre", "cuisine", "porte", "balcon"] },
    { theme: "memory", words: ["souvenir", "souvenirs", "rappelle", "souviens", "enfance", "avant", "à l'époque", "petit", "petite", "quand j'étais"] },
    { theme: "future", words: ["avenir", "futur", "un jour", "plan", "projet", "demain", "prochain", "prochaine", "espoir", "bientôt"] },
    { theme: "small_win", words: ["enfin", "réussi", "réussie", "fier", "fière", "terminé", "fini", "j'ai eu", "victoire", "ça y est"] },
    { theme: "uncertainty", words: ["peut-être", "sais pas", "jsp", "perdu", "perdue", "confus", "confuse", "doute", "aucune idée", "je sais plus"] },
  ],
};
