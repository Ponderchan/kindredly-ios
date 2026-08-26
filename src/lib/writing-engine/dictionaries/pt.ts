import type { LangResources } from "./types";

/* Portuguese (Brazilian) resources — natural, contemporary BR Portuguese with
   informal register: `tipo/acho que/sei lá` hedges, `kkk/rsrs` laughter,
   `vc/pq/mano` chat quirks. */
export const PT: LangResources = {
  hedges: ["tipo", "talvez", "então", "ainda", "mesmo", "realidade", "verdade", "acho", "sei", "lá", "meio", "bem", "bastante", "muito", "né", "assim", "quase", "sabe", "enfim"],
  affectPos: ["feliz", "contente", "alegre", "animado", "animada", "amor", "amo", "adoro", "grato", "grata", "orgulhoso", "orgulhosa", "incrível", "maravilhoso", "aliviado", "aliviada", "esperança", "sorriso", "sorrir", "rir", "lindo", "bonito", "gostoso"],
  affectNeg: ["cansado", "cansada", "exausto", "exausta", "triste", "chorar", "chorando", "lágrimas", "sozinho", "sozinha", "solitário", "vazio", "vazia", "ansioso", "ansiosa", "ansiedade", "assustado", "assustada", "medo", "preocupado", "preocupada", "dor", "dói", "ódio", "odeio", "bravo", "brava", "raiva", "quebrado", "saudade", "saudades", "sinto", "falta", "pesado", "frio", "estresse", "estressado", "culpa", "vergonha"],
  laughter: /(k{3,}|rs{2,}|haha+|hehe+|kk+|huehue)/i,
  question: /[?]/,
  ownedFrame: /\b(me sinto|me senti|sinto falta|amo|odeio|espero|preciso|quero|tô com saudade|to com saudade)\b/i,
  distanceFrame: /\b(alguém que|a pessoa que|o tipo de pessoa|uma pessoa que|me ver de fora)\b/i,
  firstPerson: ["eu", "me", "mim", "meu", "minha", "meus", "minhas", "comigo", "nós", "gente"],
  outward: ["eles", "elas", "ele", "ela", "gente", "pessoas", "alguém", "todos", "todo", "mundo", "fora", "rua", "janela", "quarto", "sala"],
  abstract: /\b\w+(ção|são|dade|tude|ismo|mento|ança|ência|ura|eza)\b/gi,
  detailOpeners: /^(o|a|os|as|um|uma|tem|isso|esse|essa|aquela|aquele|a chuva|a noite|a manhã|meu|minha|seu|sua)\b/i,
  quirks: (text, tokens) => {
    const q: string[] = [];
    if ((text.match(/(\.\.\.|…)/g) || []).length >= 2) q.push("ellipses");
    if (/(k{3,}|rs{2,})/i.test(text)) q.push("laugh-kkk");
    if (tokens.filter((t) => ["vc", "pq", "tb", "tbm", "q", "mano", "mina", "blz", "pra", "cê"].includes(t)).length >= 2) q.push("chat-spelling");
    if (/[a-zãõáéíóúâêôç]([!?])\1{1,}/i.test(text)) q.push("repeated-punct");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["saudade", "saudades", "falta", "foi", "embora", "longe", "sumiu"] },
    { theme: "tired", words: ["cansado", "cansada", "exausto", "exausta", "esgotado", "acabado"] },
    { theme: "family", words: ["mãe", "mae", "pai", "família", "familia", "pais", "irmão", "irmã", "vó", "vô"] },
    { theme: "work", words: ["trabalho", "trampo", "chefe", "reunião", "escritório", "turno", "job"] },
    { theme: "sleep", words: ["dormir", "sono", "acordado", "acordada", "insônia", "noite", "madrugada", "cama"] },
    { theme: "loneliness", words: ["sozinho", "sozinha", "solitário", "solitária", "ninguém", "isolado"] },
    { theme: "friendship", words: ["amigo", "amiga", "amigos", "amigas", "amizade", "parça"] },
    { theme: "love", words: ["amor", "amo", "crush", "encontro", "beijo", "coração", "paixão", "apaixonado"] },
    { theme: "home", words: ["casa", "lar", "quarto", "cozinha", "porta", "apê", "apartamento", "sala"] },
    { theme: "memory", words: ["lembro", "lembrança", "lembrar", "infância", "antigamente", "costumava"] },
    { theme: "future", words: ["futuro", "algum dia", "plano", "amanhã", "próximo", "esperança"] },
    { theme: "small_win", words: ["finalmente", "consegui", "orgulhoso", "orgulhosa", "terminei", "avanço", "deu certo"] },
    { theme: "uncertainty", words: ["talvez", "confuso", "confusa", "perdido", "perdida", "sei lá", "dúvida"] },
  ],
};
