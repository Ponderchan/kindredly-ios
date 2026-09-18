/* Stamps — the REAL backend vocabulary (kindredly/app/system.js), NOT the v20
   prototype's set. The `letters.stamp` column stores these ids, so the iOS app
   must use them verbatim for web↔iOS interop. Presented with v20's StampTile
   visual treatment. 6 categories × 6 = 36 stamps. Localized en/zh/es. */

export type Lang = "en" | "zh" | "es" | "pt" | "id";
export interface Loc {
  en: string;
  zh: string;
  es: string;
  pt: string;
  id: string;
}
export const tx = (o: Loc | undefined, lang: Lang): string =>
  (o && (o[lang] || o.en)) || "";

/* the app-language reader — resolves a stamp Loc in whatever language the
   reader has chosen. RN-side only (data module, not the writing engine). */
import { getLang } from "../lib/i18n";
export const sname = (o: Loc | undefined): string => tx(o, getLang() as Lang);

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
  { id: "confessions", emoji: "🕯️", color: "#6B4F9E", name: { en: "Confessions", zh: "坦白", es: "Confesiones", pt: "Confissões", id: "Pengakuan" } },
  { id: "almosts", emoji: "💌", color: "#C86E7A", name: { en: "Almosts", zh: "差一点", es: "Casi", pt: "Quases", id: "Nyaris" } },
  { id: "latenights", emoji: "🌙", color: "#2E3F8C", name: { en: "Late nights", zh: "深夜", es: "Madrugadas", pt: "Madrugadas", id: "Larut malam" } },
  { id: "small", emoji: "🍵", color: "#6B8A48", name: { en: "Small things", zh: "小事", es: "Pequeñas cosas", pt: "Coisas pequenas", id: "Hal kecil" } },
  { id: "becoming", emoji: "🧭", color: "#1E948A", name: { en: "Becoming", zh: "成为", es: "Volverse", pt: "Tornar-se", id: "Menjadi" } },
  { id: "missing", emoji: "🍂", color: "#9A6B3A", name: { en: "Missing", zh: "想念", es: "Añoranza", pt: "Saudade", id: "Kerinduan" } },
];

export const STAMPS: Stamp[] = [
  // Confessions (#6B4F9E)
  { id: "never-told", cat: "confessions", emoji: "🕯️", color: "#5B3B8C", name: { en: "Never told anyone", zh: "从没说过", es: "Nunca lo dije", pt: "Nunca contei", id: "Tak pernah cerita" }, prompt: { en: "Something I've never said out loud.", zh: "从没说出口的一句。", es: "Algo que nunca he dicho en voz alta.", pt: "Algo que nunca disse em voz alta.", id: "Sesuatu yang tak pernah kuucapkan." } },
  { id: "off-chest", cat: "confessions", emoji: "🫧", color: "#7A4FD1", name: { en: "Off my chest", zh: "一吐为快", es: "Desahogo", pt: "Desabafo", id: "Curhat" }, prompt: { en: "I just need to get this out.", zh: "我只是想一吐为快。", es: "Solo necesito soltarlo.", pt: "Só preciso botar isso pra fora.", id: "Aku cuma perlu melepaskannya." } },
  { id: "guilty", cat: "confessions", emoji: "😶‍🌫️", color: "#8A4F9C", name: { en: "Guilty", zh: "心虚", es: "Culpa", pt: "Culpa", id: "Rasa bersalah" }, prompt: { en: "Something I feel bad about.", zh: "一件让我心虚的事。", es: "Algo que me hace sentir mal.", pt: "Algo que me deixa mal.", id: "Sesuatu yang membuatku merasa buruk." } },
  { id: "hot-take", cat: "confessions", emoji: "🌶️", color: "#C4306B", name: { en: "Hot take", zh: "暴论", es: "Sin filtro", pt: "Sem filtro", id: "Tanpa filter" }, prompt: { en: "An opinion I can't say out loud.", zh: "一个不敢公开说的看法。", es: "Una opinión que no diría en voz alta.", pt: "Uma opinião que não digo em voz alta.", id: "Pendapat yang tak berani kuucapkan." } },
  { id: "cringe", cat: "confessions", emoji: "🙈", color: "#A8459E", name: { en: "Cringe", zh: "社死", es: "Vergüenza", pt: "Cringe", id: "Malu sendiri" }, prompt: { en: "The thing I still cringe about.", zh: "至今想起还想钻地缝的事。", es: "Eso que todavía me da vergüenza.", pt: "Aquilo que ainda me dá vergonha.", id: "Hal yang masih bikin aku malu." } },
  { id: "pretending", cat: "confessions", emoji: "🎭", color: "#5A48B8", name: { en: "Pretending", zh: "假装没事", es: "Fingiendo", pt: "Fingindo", id: "Pura-pura" }, prompt: { en: "Something I pretend is fine.", zh: "我假装没事的一件事。", es: "Algo que finjo que está bien.", pt: "Algo que finjo que está bem.", id: "Sesuatu yang kupura-pura baik-baik saja." } },
  // Almosts (#C86E7A)
  { id: "almost-texted", cat: "almosts", emoji: "💬", color: "#E05A6A", name: { en: "Almost texted", zh: "差点发出去", es: "Casi le escribo", pt: "Quase mandei", id: "Hampir kirim" }, prompt: { en: "A message I keep not sending.", zh: "一条我总没发出去的消息。", es: "Un mensaje que nunca envío.", pt: "Uma mensagem que nunca envio.", id: "Pesan yang tak pernah kukirim." } },
  { id: "situationship", cat: "almosts", emoji: "🫠", color: "#D14A66", name: { en: "Situationship", zh: "暧昧", es: "Casi algo", pt: "Quase namoro", id: "HTS" }, prompt: { en: "Something with no name yet.", zh: "一段还没有名分的关系。", es: "Algo que aún no tiene nombre.", pt: "Algo que ainda não tem nome.", id: "Sesuatu yang belum ada namanya." } },
  { id: "not-over-it", cat: "almosts", emoji: "🥀", color: "#A63A52", name: { en: "Not over it", zh: "没走出来", es: "No lo supero", pt: "Não superei", id: "Belum move on" }, prompt: { en: "Someone I'm still not over.", zh: "一个我还没走出来的人。", es: "Alguien a quien aún no supero.", pt: "Alguém que ainda não superei.", id: "Seseorang yang belum bisa kulupakan." } },
  { id: "unsent", cat: "almosts", emoji: "💌", color: "#C8506E", name: { en: "Unsent", zh: "未寄出", es: "Sin enviar", pt: "Não enviada", id: "Tak terkirim" }, prompt: { en: "A letter they'll never read.", zh: "一封他永远不会读到的信。", es: "Una carta que nunca leerá.", pt: "Uma carta que ele nunca vai ler.", id: "Surat yang takkan pernah ia baca." } },
  { id: "crush", cat: "almosts", emoji: "💘", color: "#E0447E", name: { en: "Crush", zh: "心动", es: "Flechazo", pt: "Paquera", id: "Gebetan" }, prompt: { en: "Someone I can't stop thinking about.", zh: "一个我一直在想的人。", es: "Alguien en quien no dejo de pensar.", pt: "Alguém em quem não paro de pensar.", id: "Seseorang yang terus kupikirkan." } },
  { id: "what-if", cat: "almosts", emoji: "🌠", color: "#D6604A", name: { en: "What if", zh: "如果当初", es: "¿Y si…?", pt: "E se…", id: "Andai…" }, prompt: { en: "The version where I said something.", zh: "如果当初我说了呢。", es: "La versión en que sí dije algo.", pt: "A versão em que eu disse algo.", id: "Versi di mana aku mengatakannya." } },
  // Late nights (#2E3F8C)
  { id: "overthinking", cat: "latenights", emoji: "🌀", color: "#3A4FD8", name: { en: "Overthinking", zh: "想太多", es: "Dándole vueltas", pt: "Pensando demais", id: "Kebanyakan mikir" }, prompt: { en: "The thought I can't put down.", zh: "一个我放不下的念头。", es: "El pensamiento que no suelto.", pt: "O pensamento que não largo.", id: "Pikiran yang tak bisa kulepas." } },
  { id: "cant-sleep", cat: "latenights", emoji: "🌙", color: "#2A3576", name: { en: "Can't sleep", zh: "睡不着", es: "Sin dormir", pt: "Sem sono", id: "Susah tidur" }, prompt: { en: "It's late and I'm awake.", zh: "夜深了，我还醒着。", es: "Es tarde y sigo despierto.", pt: "É tarde e estou acordado.", id: "Sudah larut dan aku masih terjaga." } },
  { id: "intrusive", cat: "latenights", emoji: "💭", color: "#2F63C9", name: { en: "Intrusive thought", zh: "突然的念头", es: "Pensamiento intruso", pt: "Pensamento intruso", id: "Pikiran random" }, prompt: { en: "A thought that just barged in.", zh: "一个突然冒出来的念头。", es: "Un pensamiento que entró sin avisar.", pt: "Um pensamento que chegou sem avisar.", id: "Pikiran yang muncul tiba-tiba." } },
  { id: "whats-the-point", cat: "latenights", emoji: "🕳️", color: "#4B5680", name: { en: "What's the point", zh: "意义是什么", es: "¿Para qué?", pt: "Qual o sentido", id: "Buat apa" }, prompt: { en: "One of those nights.", zh: "又是那样的一个夜晚。", es: "Una de esas noches.", pt: "Uma dessas noites.", id: "Salah satu malam seperti itu." } },
  { id: "spiral", cat: "latenights", emoji: "🌪️", color: "#3E6AA8", name: { en: "Spiraling", zh: "钻牛角尖", es: "En espiral", pt: "Espiralando", id: "Kepikiran terus" }, prompt: { en: "I can't stop the loop.", zh: "我停不下这个循环。", es: "No puedo parar el bucle.", pt: "Não consigo parar o ciclo.", id: "Aku tak bisa menghentikan putarannya." } },
  { id: "too-honest", cat: "latenights", emoji: "🫥", color: "#3F3A9E", name: { en: "Too honest", zh: "太诚实", es: "Demasiado sincero", pt: "Sincero demais", id: "Terlalu jujur" }, prompt: { en: "Things I only admit at 3am.", zh: "只有凌晨三点才敢承认的事。", es: "Cosas que solo admito a las 3am.", pt: "Coisas que só admito às 3 da manhã.", id: "Hal yang cuma kuakui jam 3 pagi." } },
  // Small things (#6B8A48)
  { id: "made-my-day", cat: "small", emoji: "☕", color: "#43903F", name: { en: "Made my day", zh: "小确幸", es: "Me alegró el día", pt: "Fez meu dia", id: "Bikin senang" }, prompt: { en: "The smallest good thing today.", zh: "今天最小的一件好事。", es: "La cosa buena más pequeña de hoy.", pt: "A menor coisa boa de hoje.", id: "Hal baik terkecil hari ini." } },
  { id: "ordinary", cat: "small", emoji: "🍵", color: "#5F8A4F", name: { en: "Ordinary", zh: "平常一天", es: "Un día normal", pt: "Dia comum", id: "Hari biasa" }, prompt: { en: "Just an ordinary day.", zh: "只是普通的一天。", es: "Solo un día cualquiera.", pt: "Só um dia comum.", id: "Hanya hari biasa." } },
  { id: "a-song", cat: "small", emoji: "🎵", color: "#6B8A20", name: { en: "A song", zh: "一首歌", es: "Una canción", pt: "Uma música", id: "Sebuah lagu" }, prompt: { en: "A song on repeat.", zh: "一首单曲循环的歌。", es: "Una canción en bucle.", pt: "Uma música no repeat.", id: "Sebuah lagu yang kuputar terus." } },
  { id: "outside", cat: "small", emoji: "🌿", color: "#2F7D4F", name: { en: "Outside", zh: "出门看到", es: "Afuera", pt: "Lá fora", id: "Di luar" }, prompt: { en: "Something I saw outside.", zh: "我在外面看到的东西。", es: "Algo que vi afuera.", pt: "Algo que vi lá fora.", id: "Sesuatu yang kulihat di luar." } },
  { id: "comfort", cat: "small", emoji: "🧸", color: "#85873A", name: { en: "Comfort", zh: "治愈", es: "Consuelo", pt: "Aconchego", id: "Bikin nyaman" }, prompt: { en: "My little comfort thing.", zh: "我的小小治愈。", es: "Mi pequeño consuelo.", pt: "Meu pequeno consolo.", id: "Penghiburku yang kecil." } },
  { id: "tiny-win", cat: "small", emoji: "✅", color: "#1E9452", name: { en: "Tiny win", zh: "小胜利", es: "Pequeña victoria", pt: "Pequena vitória", id: "Menang kecil" }, prompt: { en: "A win nobody else would notice.", zh: "一个别人不会注意到的小胜利。", es: "Una victoria que nadie más notaría.", pt: "Uma vitória que ninguém mais notaria.", id: "Kemenangan yang tak disadari orang lain." } },
  // Becoming (#1E948A)
  { id: "growing", cat: "becoming", emoji: "🌱", color: "#1E948A", name: { en: "Growing", zh: "在长大", es: "Creciendo", pt: "Crescendo", id: "Bertumbuh" }, prompt: { en: "Something I'm still figuring out.", zh: "一件我还在想明白的事。", es: "Algo que aún estoy descubriendo.", pt: "Algo que ainda estou entendendo.", id: "Sesuatu yang masih kupahami." } },
  { id: "changed", cat: "becoming", emoji: "🦋", color: "#1A93A4", name: { en: "Changed", zh: "变了", es: "He cambiado", pt: "Mudei", id: "Berubah" }, prompt: { en: "How I'm different now.", zh: "现在的我，哪里不一样了。", es: "En qué soy distinto ahora.", pt: "Como sou diferente agora.", id: "Bagaimana aku berbeda sekarang." } },
  { id: "lost", cat: "becoming", emoji: "🌫️", color: "#3F8585", name: { en: "Lost", zh: "迷茫", es: "Perdido", pt: "Perdido", id: "Bingung" }, prompt: { en: "The not-knowing.", zh: "那种不知道。", es: "El no saber.", pt: "O não-saber.", id: "Rasa tak tahu itu." } },
  { id: "big-feeling", cat: "becoming", emoji: "🌊", color: "#1F7FA8", name: { en: "Big feeling", zh: "大情绪", es: "Emoción grande", pt: "Emoção grande", id: "Perasaan besar" }, prompt: { en: "A feeling too big to name.", zh: "一种大到说不清的情绪。", es: "Una emoción demasiado grande para nombrar.", pt: "Uma emoção grande demais pra nomear.", id: "Perasaan yang terlalu besar untuk dinamai." } },
  { id: "letting-go", cat: "becoming", emoji: "🎈", color: "#1E9A74", name: { en: "Letting go", zh: "放下", es: "Soltar", pt: "Deixando ir", id: "Merelakan" }, prompt: { en: "Something I'm putting down.", zh: "一件我正在放下的东西。", es: "Algo que estoy soltando.", pt: "Algo que estou soltando.", id: "Sesuatu yang sedang kurelakan." } },
  { id: "who-am-i", cat: "becoming", emoji: "🪞", color: "#1C6E7A", name: { en: "Who am I", zh: "我是谁", es: "Quién soy", pt: "Quem sou eu", id: "Siapa aku" }, prompt: { en: "Trying to figure myself out.", zh: "试着搞懂我自己。", es: "Intentando entenderme.", pt: "Tentando me entender.", id: "Mencoba memahami diriku." } },
  // Missing (#9A6B3A)
  { id: "miss-someone", cat: "missing", emoji: "🥺", color: "#B0761C", name: { en: "Miss someone", zh: "想一个人", es: "Extraño a alguien", pt: "Saudade de alguém", id: "Kangen" }, prompt: { en: "Someone I miss.", zh: "一个我想念的人。", es: "Alguien a quien echo de menos.", pt: "Alguém de quem sinto falta.", id: "Seseorang yang kurindukan." } },
  { id: "homesick", cat: "missing", emoji: "🏠", color: "#C2572F", name: { en: "Homesick", zh: "想家", es: "Nostalgia de casa", pt: "Saudade de casa", id: "Kangen rumah" }, prompt: { en: "Home, or missing it.", zh: "家，或者想家。", es: "El hogar, o extrañarlo.", pt: "O lar, ou a falta dele.", id: "Rumah, atau merindukannya." } },
  { id: "grief", cat: "missing", emoji: "🕊️", color: "#7A5236", name: { en: "Grief", zh: "失去", es: "Duelo", pt: "Luto", id: "Duka" }, prompt: { en: "Something I lost.", zh: "某样我失去的东西。", es: "Algo que perdí.", pt: "Algo que perdi.", id: "Sesuatu yang hilang dariku." } },
  { id: "then-now", cat: "missing", emoji: "📼", color: "#9A6B3A", name: { en: "Then vs now", zh: "从前", es: "Antes", pt: "Antes e agora", id: "Dulu vs kini" }, prompt: { en: "The way things used to be.", zh: "从前的样子。", es: "Cómo eran las cosas antes.", pt: "Como as coisas eram antes.", id: "Bagaimana dulu keadaannya." } },
  { id: "old-friend", cat: "missing", emoji: "🫂", color: "#9E7C24", name: { en: "Old friend", zh: "老朋友", es: "Un viejo amigo", pt: "Amigo antigo", id: "Teman lama" }, prompt: { en: "Someone I drifted from.", zh: "一个渐渐走散的人。", es: "Alguien de quien me distancié.", pt: "Alguém de quem me afastei.", id: "Seseorang yang perlahan menjauh." } },
  { id: "seasons", cat: "missing", emoji: "🍁", color: "#B0452B", name: { en: "Seasons", zh: "季节", es: "Estaciones", pt: "Estações", id: "Musim" }, prompt: { en: "This time of year gets me.", zh: "每到这个季节就会这样。", es: "Esta época del año me afecta.", pt: "Esta época do ano me pega.", id: "Musim ini selalu menyentuhku." } },
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
