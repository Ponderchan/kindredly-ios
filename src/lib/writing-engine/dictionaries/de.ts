import type { LangResources } from "./types";

/* German resources — everyday German as it is typed, the modal particles
   included, because they ARE the hedging: `halt / eben / wohl / irgendwie
   / eigentlich` do the work "kind of" does in English. `haha` is
   the laughter; `vllt / kp / iwie / nich` the chat spellings. Compounds
   make the words long, which the baseline (not this file) accounts for.

   One quirk is German's alone: nouns are capitalised, so a hand that
   writes them small — after an article, where a noun must follow — is
   choosing to. It reads as a voice, not a typo, and no other language
   can show it. */
export const DE: LangResources = {
  // the particles that soften a claim — not `ja / so / mal / schon / doch`,
  // which soften everything and would make every German hand a hedger
  hedges: ["vielleicht", "eigentlich", "irgendwie", "halt", "eben", "wohl", "ziemlich", "eher", "glaube", "denke", "schätze", "wahrscheinlich", "vermutlich", "quasi", "sozusagen", "bisschen", "bissl", "naja", "ehrlich gesagt", "keine ahnung", "weiß nicht", "weiss nicht", "im grunde", "an sich", "irgendwas", "irgendwann", "gefühlt", "fast", "relativ", "einigermaßen", "ein stück weit"],
  affectPos: ["glücklich", "froh", "freude", "freue", "freut", "liebe", "lieb", "dankbar", "stolz", "unglaublich", "wunderbar", "wunderschön", "erleichtert", "hoffnung", "lächeln", "lächle", "lachen", "lache", "schön", "warm", "zufrieden", "geborgen", "leicht", "ruhig", "gelassen", "aufgeregt", "begeistert"],
  affectNeg: ["müde", "erschöpft", "kaputt", "fertig", "traurig", "weinen", "weine", "geweint", "tränen", "allein", "alleine", "einsam", "leer", "ängstlich", "angst", "sorge", "sorgen", "schmerz", "weh", "hasse", "wütend", "sauer", "genervt", "gebrochen", "vermisse", "vermisst", "scham", "schuld", "stress", "gestresst", "schwer", "kalt", "verloren", "überfordert", "verletzt", "enttäuscht", "ratlos", "hilflos"],
  laughter: /(haha+|hehe+|hihi+|lol+|xd+|höhö)/i,
  question: /\?|\b(oder|ne|gell|nicht wahr)\s*\?/i,
  ownedFrame: /\b(ich fühle|ich fühl|ich habe mich .{0,20}gefühlt|ich vermisse|ich liebe|ich hasse|ich hoffe|ich brauche|ich brauch|ich will|ich möchte|ich habe angst|ich hab angst|mir fehlt|du fehlst mir)\b/i,
  distanceFrame: /\b(jemand,? der|jemand,? die|die art von mensch|ein mensch,? der|die person,? die|von außen|von aussen|wie ein fremder|wie eine fremde)\b/i,
  firstPerson: ["ich", "mich", "mir", "mein", "meine", "meinen", "meinem", "meiner", "meins", "wir", "uns", "unser", "unsere"],
  outward: ["sie", "er", "leute", "menschen", "jemand", "alle", "welt", "draußen", "draussen", "straße", "strasse", "fenster", "zimmer", "andere", "anderen", "nachbar", "nachbarin", "stadt"],
  abstract: /\b\w+(ung|heit|keit|schaft|tum|nis|ismus|ität|enz|anz)\b/gi,
  detailOpeners: /^(der|die|das|ein|eine|es gibt|es ist|es war|dieser|diese|dieses|der regen|die nacht|der morgen|heute morgen|heute abend|gestern|mein|meine|sein|seine|ihr|ihre|im|am|auf|vor|in der|in dem)\b/i,
  quirks: (text, tokens) => {
    const q: string[] = [];
    if (/haha+|hehe+/i.test(text)) q.push("laugh-haha");
    // chat spellings — repeated to count as a quirk
    if (tokens.filter((t) => ["vllt", "vlt", "evtl", "kp", "ka", "iwie", "iwas", "iwann", "nich", "nix", "eig", "jz", "jetz", "digga", "lg", "hdl", "wsl", "bzw"].includes(t)).length >= 2) q.push("chat-spelling");
    // nouns written small: after an article a noun must follow, so a
    // lowercase word there is the writer's hand, not the grammar's
    const after = [...text.matchAll(/\b(der|die|das|dem|den|des|ein|eine|einen|einem|einer|kein|keine|mein|meine|dein|deine|sein|seine|ihr|ihre|unser|unsere)\s+([^\s.,;:!?]+)/gi)].map((m) => m[2]);
    const small = after.filter((w) => /^[a-zäöüß]/.test(w)).length;
    const big = after.filter((w) => /^[A-ZÄÖÜ]/.test(w)).length;
    if (small >= 3 && small >= big * 2) q.push("lowercase-nouns");
    // the particle as a tic: "halt" three times is a way of talking
    if (tokens.filter((t) => t === "halt").length >= 3) q.push("halt");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["vermisse", "vermisst", "vermissen", "fehlt", "fehlst", "sehnsucht", "weg", "weit weg", "ohne dich", "abschied"] },
    { theme: "tired", words: ["müde", "erschöpft", "kaputt", "fertig", "ausgelaugt", "am ende", "keine energie", "platt"] },
    { theme: "family", words: ["mama", "papa", "mutter", "vater", "familie", "eltern", "bruder", "schwester", "oma", "opa", "geschwister"] },
    { theme: "work", words: ["arbeit", "job", "chef", "chefin", "meeting", "büro", "schicht", "kollege", "kollegin", "kollegen", "praktikum", "uni"] },
    { theme: "sleep", words: ["schlafen", "schlaf", "wach", "schlaflos", "nacht", "nachts", "bett", "einschlafen", "drei uhr morgens", "aufwachen"] },
    { theme: "loneliness", words: ["allein", "alleine", "einsam", "einsamkeit", "niemand", "isoliert", "keiner"] },
    { theme: "friendship", words: ["freund", "freundin", "freunde", "freundinnen", "freundschaft", "beste freundin", "bester freund", "kumpel"] },
    { theme: "love", words: ["liebe", "verliebt", "crush", "date", "kuss", "herz", "beziehung", "ex", "zusammen"] },
    { theme: "home", words: ["zuhause", "zu hause", "wohnung", "wg", "zimmer", "küche", "tür", "balkon", "daheim"] },
    { theme: "memory", words: ["erinnerung", "erinnerungen", "erinnere", "erinnert", "kindheit", "früher", "damals", "als ich klein war"] },
    { theme: "future", words: ["zukunft", "irgendwann", "plan", "pläne", "morgen", "nächste", "nächstes", "hoffnung", "bald"] },
    { theme: "small_win", words: ["endlich", "geschafft", "stolz", "fertig geworden", "hat geklappt", "geklappt", "gewonnen", "hinbekommen"] },
    { theme: "uncertainty", words: ["vielleicht", "keine ahnung", "weiß nicht", "weiss nicht", "verloren", "verwirrt", "zweifel", "unsicher", "kp"] },
  ],
};
