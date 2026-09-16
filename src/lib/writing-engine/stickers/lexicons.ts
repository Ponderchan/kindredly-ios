import type { SupportedLanguage } from "../types";

/* STICKER LEXICONS — the narrow word lists the observation rules lean on.
   ────────────────────────────────────────────────────────────────────────
   Each list is native to its language, not translated, and deliberately
   small: a rule may only claim what its list can actually show. Where a
   language has no list for a signal, the rule returns `unknown` for that
   language rather than borrowing English. */

export interface StickerLexicon {
  /** concrete, seeable, touchable things — objects, places, weather, body,
      food, times of day. Evidence for "starts from small, everyday things". */
  concrete: string[];
  /** turning connectives — the "but" family */
  turns: string[];
  /** addressing the reader: second person */
  second: string[];
  /** question openers (for the ending-invitation read) */
  askers: string[];
  /** opinion / stance frames that mark a point-first opening */
  stance: RegExp;
  /** emotional context: topics where a feeling is in the room even if unnamed */
  emotionalContext: string[];
}

const EN: StickerLexicon = {
  concrete: "window sill door kitchen table chair bed pillow blanket lamp light cup mug coffee tea bread rice soup plate bowl spoon knife fork bottle glass water rain snow wind sun moon sky cloud street road bus train station platform car bike stairs balcony roof garden tree leaf leaves flower grass river sea beach sand rock stone wall floor ceiling corner shelf book page pen pencil paper notebook phone screen keyboard headphones song radio clock watch key coat jacket shoes socks scarf bag pocket hair hands hand fingers face eyes mouth skin dust smoke steam smell noise sound silence morning night evening afternoon midnight dawn shop market cafe park bench dog cat bird plant candle soap towel shower mirror photo box drawer desk".split(" "),
  turns: ["but", "yet", "though", "although", "however", "still", "except", "anyway"],
  second: ["you", "your", "yours", "u", "ur", "yourself"],
  askers: ["what", "how", "do", "does", "did", "have", "has", "would", "could", "is", "are", "was", "were", "any", "anyone", "ever", "which", "who", "where", "when", "why"],
  stance: /\b(i think|i believe|i know|i want|i need|i've decided|i decided|i realised|i realized|i guess|i feel like|honestly|the truth is|here's the thing)\b/i,
  // a feeling in the room, even unnamed. Deliberately no "broken", "lost",
  // "heart": a broken chair and a lost key are furniture, not feelings.
  emotionalContext: "miss missed missing lonely alone tired exhausted love crush cry cried crying scared afraid anxious worried sad happy angry hurt ashamed proud grateful hope hopeless jealous guilt guilty grief numb overwhelmed homesick".split(" "),
};

const ES: StickerLexicon = {
  concrete: "ventana puerta cocina mesa silla cama almohada manta lámpara luz taza café té pan arroz sopa plato vaso botella agua lluvia nieve viento sol luna cielo nube calle camino autobús tren estación coche bici escaleras balcón techo jardín árbol hoja flor hierba río mar playa arena piedra pared suelo esquina estante libro página bolígrafo lápiz papel cuaderno teléfono pantalla auriculares canción reloj llave abrigo chaqueta zapatos bufanda bolso bolsillo pelo manos mano dedos cara ojos boca piel polvo humo olor ruido silencio mañana noche tarde madrugada tienda mercado parque banco perro gato pájaro planta vela espejo foto caja cajón escritorio".split(" "),
  turns: ["pero", "aunque", "sin embargo", "igual", "todavía", "aun así", "excepto"],
  second: ["tú", "tu", "tus", "te", "ti", "usted", "vos", "contigo"],
  askers: ["qué", "cómo", "dónde", "cuándo", "por", "quién", "cuál", "alguien", "alguna", "algún", "tienes", "has", "sabes", "crees"],
  stance: /\b(creo que|pienso que|sé que|quiero|necesito|decidí|me di cuenta|supongo|la verdad es|siento que)\b/i,
  emotionalContext: "extraño extraña solo sola soledad cansado cansada amor corazón llorar lloré miedo ansiedad triste feliz enojado enfadada dolor vergüenza orgullo esperanza perdido perdida roto rota celos culpa duelo abrumado".split(" "),
};

const PT: StickerLexicon = {
  concrete: "janela porta cozinha mesa cadeira cama travesseiro cobertor luminária luz xícara café chá pão arroz sopa prato copo garrafa água chuva neve vento sol lua céu nuvem rua caminho ônibus trem estação carro bicicleta escada varanda telhado jardim árvore folha flor grama rio mar praia areia pedra parede chão canto estante livro página caneta lápis papel caderno celular tela fone música relógio chave casaco jaqueta sapato cachecol bolsa bolso cabelo mãos mão dedos rosto olhos boca pele poeira fumaça cheiro barulho silêncio manhã noite tarde madrugada loja mercado parque banco cachorro gato passarinho planta vela espelho foto caixa gaveta escrivaninha".split(" "),
  turns: ["mas", "porém", "embora", "apesar", "ainda assim", "mesmo assim", "só que", "exceto"],
  second: ["você", "vc", "te", "teu", "tua", "seu", "sua", "contigo", "tu"],
  askers: ["que", "como", "onde", "quando", "por", "quem", "qual", "alguém", "alguma", "algum", "tem", "já", "sabe", "acha"],
  stance: /\b(acho que|penso que|sei que|quero|preciso|decidi|percebi|acho|a verdade é|sinto que)\b/i,
  emotionalContext: "saudade sozinho sozinha solidão cansado cansada amor coração chorar chorei medo ansiedade triste feliz raiva dor vergonha orgulho esperança perdido perdida quebrado ciúme culpa luto sobrecarregado".split(" "),
};

const ID: StickerLexicon = {
  concrete: "jendela pintu dapur meja kursi kasur bantal selimut lampu cahaya cangkir kopi teh roti nasi sup piring gelas botol air hujan angin matahari bulan langit awan jalan bus kereta stasiun mobil sepeda tangga balkon atap taman pohon daun bunga rumput sungai laut pantai pasir batu dinding lantai sudut rak buku halaman pena pensil kertas catatan hp layar earphone lagu jam kunci jaket sepatu syal tas saku rambut tangan jari wajah mata mulut kulit debu asap bau suara sunyi pagi malam sore subuh toko pasar bangku anjing kucing burung tanaman lilin cermin foto kotak laci".split(" "),
  turns: ["tapi", "tetapi", "namun", "padahal", "meskipun", "walaupun", "cuma", "kecuali"],
  second: ["kamu", "lo", "lu", "anda", "kau", "-mu", "kalian"],
  askers: ["apa", "gimana", "bagaimana", "kenapa", "mengapa", "kapan", "dimana", "di", "siapa", "ada", "pernah", "udah", "sudah"],
  stance: /\b(aku rasa|kurasa|aku pikir|aku tahu|aku mau|aku butuh|aku putuskan|aku sadar|sebenarnya|jujur)\b/i,
  emotionalContext: "rindu kangen sendiri sendirian kesepian capek lelah cinta sayang hati nangis menangis takut cemas sedih senang marah sakit malu bangga harapan hilang patah cemburu bersalah duka".split(" "),
};

const ALL: Record<SupportedLanguage, StickerLexicon> = { en: EN, es: ES, pt: PT, id: ID };

export function lexicon(lang: SupportedLanguage): StickerLexicon {
  return ALL[lang] ?? EN;
}
