/* Stamps — the REAL backend vocabulary (kindredly/app/system.js), NOT the v20
   prototype's set. The `letters.stamp` column stores these ids, so the iOS app
   must use them verbatim for web↔iOS interop. Presented with v20's StampTile
   visual treatment. 6 categories × 6 = 36 stamps. Localized en/zh/es. */

export type Lang = "en" | "zh" | "es";
export interface Loc {
  en: string;
  zh: string;
  es: string;
}
export const tx = (o: Loc | undefined, lang: Lang): string =>
  (o && (o[lang] || o.en)) || "";

export interface StampCat {
  id: string;
  emoji: string;
  color: string;
  name: Loc;
}
export interface Stamp {
  id: string;
  cat: string;
  emoji: string;
  color: string;
  name: Loc;
  prompt: Loc;
}

export const STAMP_CATEGORIES: StampCat[] = [
  { id: "confessions", emoji: "🕯️", color: "#6B4F9E", name: { en: "Confessions", zh: "坦白", es: "Confesiones" } },
  { id: "almosts", emoji: "💌", color: "#C86E7A", name: { en: "Almosts", zh: "差一点", es: "Casi" } },
  { id: "latenights", emoji: "🌙", color: "#2E3F8C", name: { en: "Late nights", zh: "深夜", es: "Madrugadas" } },
  { id: "small", emoji: "🍵", color: "#6B8A48", name: { en: "Small things", zh: "小事", es: "Pequeñas cosas" } },
  { id: "becoming", emoji: "🧭", color: "#1E948A", name: { en: "Becoming", zh: "成为", es: "Volverse" } },
  { id: "missing", emoji: "🍂", color: "#9A6B3A", name: { en: "Missing", zh: "想念", es: "Añoranza" } },
];

export const STAMPS: Stamp[] = [
  // Confessions (#6B4F9E)
  { id: "never-told", cat: "confessions", emoji: "🕯️", color: "#6B4F9E", name: { en: "Never told anyone", zh: "从没说过", es: "Nunca lo dije" }, prompt: { en: "Something I've never said out loud.", zh: "从没说出口的一句。", es: "Algo que nunca he dicho en voz alta." } },
  { id: "off-chest", cat: "confessions", emoji: "🫧", color: "#6B4F9E", name: { en: "Off my chest", zh: "一吐为快", es: "Desahogo" }, prompt: { en: "I just need to get this out.", zh: "我只是想一吐为快。", es: "Solo necesito soltarlo." } },
  { id: "guilty", cat: "confessions", emoji: "😶‍🌫️", color: "#6B4F9E", name: { en: "Guilty", zh: "心虚", es: "Culpa" }, prompt: { en: "Something I feel bad about.", zh: "一件让我心虚的事。", es: "Algo que me hace sentir mal." } },
  { id: "hot-take", cat: "confessions", emoji: "🌶️", color: "#6B4F9E", name: { en: "Hot take", zh: "暴论", es: "Sin filtro" }, prompt: { en: "An opinion I can't say out loud.", zh: "一个不敢公开说的看法。", es: "Una opinión que no diría en voz alta." } },
  { id: "cringe", cat: "confessions", emoji: "🙈", color: "#6B4F9E", name: { en: "Cringe", zh: "社死", es: "Vergüenza" }, prompt: { en: "The thing I still cringe about.", zh: "至今想起还想钻地缝的事。", es: "Eso que todavía me da vergüenza." } },
  { id: "pretending", cat: "confessions", emoji: "🎭", color: "#6B4F9E", name: { en: "Pretending", zh: "假装没事", es: "Fingiendo" }, prompt: { en: "Something I pretend is fine.", zh: "我假装没事的一件事。", es: "Algo que finjo que está bien." } },
  // Almosts (#C86E7A)
  { id: "almost-texted", cat: "almosts", emoji: "💬", color: "#C86E7A", name: { en: "Almost texted", zh: "差点发出去", es: "Casi le escribo" }, prompt: { en: "A message I keep not sending.", zh: "一条我总没发出去的消息。", es: "Un mensaje que nunca envío." } },
  { id: "situationship", cat: "almosts", emoji: "🫠", color: "#C86E7A", name: { en: "Situationship", zh: "暧昧", es: "Casi algo" }, prompt: { en: "Something with no name yet.", zh: "一段还没有名分的关系。", es: "Algo que aún no tiene nombre." } },
  { id: "not-over-it", cat: "almosts", emoji: "🥀", color: "#C86E7A", name: { en: "Not over it", zh: "没走出来", es: "No lo supero" }, prompt: { en: "Someone I'm still not over.", zh: "一个我还没走出来的人。", es: "Alguien a quien aún no supero." } },
  { id: "unsent", cat: "almosts", emoji: "💌", color: "#C86E7A", name: { en: "Unsent", zh: "未寄出", es: "Sin enviar" }, prompt: { en: "A letter they'll never read.", zh: "一封他永远不会读到的信。", es: "Una carta que nunca leerá." } },
  { id: "crush", cat: "almosts", emoji: "💘", color: "#C86E7A", name: { en: "Crush", zh: "心动", es: "Flechazo" }, prompt: { en: "Someone I can't stop thinking about.", zh: "一个我一直在想的人。", es: "Alguien en quien no dejo de pensar." } },
  { id: "what-if", cat: "almosts", emoji: "🌠", color: "#C86E7A", name: { en: "What if", zh: "如果当初", es: "¿Y si…?" }, prompt: { en: "The version where I said something.", zh: "如果当初我说了呢。", es: "La versión en que sí dije algo." } },
  // Late nights (#2E3F8C)
  { id: "overthinking", cat: "latenights", emoji: "🌀", color: "#2E3F8C", name: { en: "Overthinking", zh: "想太多", es: "Dándole vueltas" }, prompt: { en: "The thought I can't put down.", zh: "一个我放不下的念头。", es: "El pensamiento que no suelto." } },
  { id: "cant-sleep", cat: "latenights", emoji: "🌙", color: "#2E3F8C", name: { en: "Can't sleep", zh: "睡不着", es: "Sin dormir" }, prompt: { en: "It's late and I'm awake.", zh: "夜深了，我还醒着。", es: "Es tarde y sigo despierto." } },
  { id: "intrusive", cat: "latenights", emoji: "💭", color: "#2E3F8C", name: { en: "Intrusive thought", zh: "突然的念头", es: "Pensamiento intruso" }, prompt: { en: "A thought that just barged in.", zh: "一个突然冒出来的念头。", es: "Un pensamiento que entró sin avisar." } },
  { id: "whats-the-point", cat: "latenights", emoji: "🕳️", color: "#2E3F8C", name: { en: "What's the point", zh: "意义是什么", es: "¿Para qué?" }, prompt: { en: "One of those nights.", zh: "又是那样的一个夜晚。", es: "Una de esas noches." } },
  { id: "spiral", cat: "latenights", emoji: "🌪️", color: "#2E3F8C", name: { en: "Spiraling", zh: "钻牛角尖", es: "En espiral" }, prompt: { en: "I can't stop the loop.", zh: "我停不下这个循环。", es: "No puedo parar el bucle." } },
  { id: "too-honest", cat: "latenights", emoji: "🫥", color: "#2E3F8C", name: { en: "Too honest", zh: "太诚实", es: "Demasiado sincero" }, prompt: { en: "Things I only admit at 3am.", zh: "只有凌晨三点才敢承认的事。", es: "Cosas que solo admito a las 3am." } },
  // Small things (#6B8A48)
  { id: "made-my-day", cat: "small", emoji: "☕", color: "#6B8A48", name: { en: "Made my day", zh: "小确幸", es: "Me alegró el día" }, prompt: { en: "The smallest good thing today.", zh: "今天最小的一件好事。", es: "La cosa buena más pequeña de hoy." } },
  { id: "ordinary", cat: "small", emoji: "🍵", color: "#6B8A48", name: { en: "Ordinary", zh: "平常一天", es: "Un día normal" }, prompt: { en: "Just an ordinary day.", zh: "只是普通的一天。", es: "Solo un día cualquiera." } },
  { id: "a-song", cat: "small", emoji: "🎵", color: "#6B8A48", name: { en: "A song", zh: "一首歌", es: "Una canción" }, prompt: { en: "A song on repeat.", zh: "一首单曲循环的歌。", es: "Una canción en bucle." } },
  { id: "outside", cat: "small", emoji: "🌿", color: "#6B8A48", name: { en: "Outside", zh: "出门看到", es: "Afuera" }, prompt: { en: "Something I saw outside.", zh: "我在外面看到的东西。", es: "Algo que vi afuera." } },
  { id: "comfort", cat: "small", emoji: "🧸", color: "#6B8A48", name: { en: "Comfort", zh: "治愈", es: "Consuelo" }, prompt: { en: "My little comfort thing.", zh: "我的小小治愈。", es: "Mi pequeño consuelo." } },
  { id: "tiny-win", cat: "small", emoji: "✅", color: "#6B8A48", name: { en: "Tiny win", zh: "小胜利", es: "Pequeña victoria" }, prompt: { en: "A win nobody else would notice.", zh: "一个别人不会注意到的小胜利。", es: "Una victoria que nadie más notaría." } },
  // Becoming (#1E948A)
  { id: "growing", cat: "becoming", emoji: "🌱", color: "#1E948A", name: { en: "Growing", zh: "在长大", es: "Creciendo" }, prompt: { en: "Something I'm still figuring out.", zh: "一件我还在想明白的事。", es: "Algo que aún estoy descubriendo." } },
  { id: "changed", cat: "becoming", emoji: "🦋", color: "#1E948A", name: { en: "Changed", zh: "变了", es: "He cambiado" }, prompt: { en: "How I'm different now.", zh: "现在的我，哪里不一样了。", es: "En qué soy distinto ahora." } },
  { id: "lost", cat: "becoming", emoji: "🌫️", color: "#1E948A", name: { en: "Lost", zh: "迷茫", es: "Perdido" }, prompt: { en: "The not-knowing.", zh: "那种不知道。", es: "El no saber." } },
  { id: "big-feeling", cat: "becoming", emoji: "🌊", color: "#1E948A", name: { en: "Big feeling", zh: "大情绪", es: "Emoción grande" }, prompt: { en: "A feeling too big to name.", zh: "一种大到说不清的情绪。", es: "Una emoción demasiado grande para nombrar." } },
  { id: "letting-go", cat: "becoming", emoji: "🎈", color: "#1E948A", name: { en: "Letting go", zh: "放下", es: "Soltar" }, prompt: { en: "Something I'm putting down.", zh: "一件我正在放下的东西。", es: "Algo que estoy soltando." } },
  { id: "who-am-i", cat: "becoming", emoji: "🪞", color: "#1E948A", name: { en: "Who am I", zh: "我是谁", es: "Quién soy" }, prompt: { en: "Trying to figure myself out.", zh: "试着搞懂我自己。", es: "Intentando entenderme." } },
  // Missing (#9A6B3A)
  { id: "miss-someone", cat: "missing", emoji: "🥺", color: "#9A6B3A", name: { en: "Miss someone", zh: "想一个人", es: "Extraño a alguien" }, prompt: { en: "Someone I miss.", zh: "一个我想念的人。", es: "Alguien a quien echo de menos." } },
  { id: "homesick", cat: "missing", emoji: "🏠", color: "#9A6B3A", name: { en: "Homesick", zh: "想家", es: "Nostalgia de casa" }, prompt: { en: "Home, or missing it.", zh: "家，或者想家。", es: "El hogar, o extrañarlo." } },
  { id: "grief", cat: "missing", emoji: "🕊️", color: "#9A6B3A", name: { en: "Grief", zh: "失去", es: "Duelo" }, prompt: { en: "Something I lost.", zh: "某样我失去的东西。", es: "Algo que perdí." } },
  { id: "then-now", cat: "missing", emoji: "📼", color: "#9A6B3A", name: { en: "Then vs now", zh: "从前", es: "Antes" }, prompt: { en: "The way things used to be.", zh: "从前的样子。", es: "Cómo eran las cosas antes." } },
  { id: "old-friend", cat: "missing", emoji: "🫂", color: "#9A6B3A", name: { en: "Old friend", zh: "老朋友", es: "Un viejo amigo" }, prompt: { en: "Someone I drifted from.", zh: "一个渐渐走散的人。", es: "Alguien de quien me distancié." } },
  { id: "seasons", cat: "missing", emoji: "🍁", color: "#9A6B3A", name: { en: "Seasons", zh: "季节", es: "Estaciones" }, prompt: { en: "This time of year gets me.", zh: "每到这个季节就会这样。", es: "Esta época del año me afecta." } },
];

export const stampsByCat = (catId: string) =>
  STAMPS.filter((s) => s.cat === catId);
export const getStamp = (id?: string | null): Stamp | null =>
  STAMPS.find((s) => s.id === id) || null;

/** ids shown before "show all 36" in the picker (one per category). */
export const STARTER_STAMPS = [
  "off-chest",
  "crush",
  "cant-sleep",
  "ordinary",
  "growing",
  "miss-someone",
];
