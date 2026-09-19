/* Onboarding story content (from kindredly-v20.jsx — pure narrative, not
   persisted) + Wren's opener/fallback line libraries (from the web
   wren-prompts.js, used for the composer's "Wren suggests" + offline note
   fallbacks). */

import type { MoodId } from "./moods";
import type { Lang } from "./stamps";

/* ── Doorway carousel (4 beats) ── */
export interface Beat {
  k: "arrive" | "voice" | "three" | "roots";
  h1: string;
  h2: string;
  sub: string;
}
export const BEATS: Beat[] = [
  { k: "arrive", h1: "Letters from people", h2: "who write like you.", sub: "No profiles. No photos. No swiping. Just a stranger who writes like you." },
  { k: "voice", h1: "Sorted by how you write,", h2: "not where you live.", sub: "Wren reads your rhythm, your pauses, the shape of your sentences — and finds the closest match." },
  { k: "three", h1: "One letter,", h2: "three doors.", sub: "Every letter goes down three streets at once. The first person to answer is yours." },
  { k: "roots", h1: "Five letters and", h2: "you're no longer strangers.", sub: "Write back and forth five times, and Wren stops keeping your names from each other." },
];

/* ── the three sample letters read during onboarding ── */
export interface HookLetter {
  body: string;
  who: string;
  when: string;
  mood: MoodId;
}
export const HOOK_LETTERS: HookLetter[] = [
  { body: "I keep buying flowers for a table nobody else sits at.", who: "someone in Porto", when: "three days ago", mood: "sleepy" },
  { body: "My father called to ask how to work the new phone. We talked for an hour. Neither of us mentioned the phone again.", who: "someone in Osaka", when: "yesterday", mood: "in-love" },
  { body: "I've started saying good morning to a tree on my walk to work. Out loud. I'm aware of how that sounds.", who: "someone in Bergen", when: "this morning", mood: "calm" },
];

/* ── the three voice samples ("which sounds most like you") ── */
export interface Voice {
  id: "plain" | "winding" | "spare";
  body: string;
  read: string;
}
export const VOICES: Voice[] = [
  { id: "plain", body: "Slept badly. Made coffee. Sat with it until it went cold. That was the whole morning and it was fine.", read: "Short. Unhurried. You don't decorate." },
  { id: "winding", body: "I don't know if it's the season or something in me, but lately I keep noticing how much of a day goes on getting ready to do the thing rather than doing it, and I can't decide whether that's waste or whether that's where the living happens.", read: "Long sentences that think as they go." },
  { id: "spare", body: "The bus was late. A woman shared her umbrella with a stranger. Neither of them said anything the whole time.", read: "You point at things and let them speak." },
];

/* ── sentence-starters for the onboarding "one line from you" step ── */
export const OPENERS = ["Honestly, I just…", "Today has been…", "I'm not sure why I'm here, but…"];

/* ── the seeded day-one letter (a real, unanswered stranger) ── */
export const FIRST_LETTER = {
  alias: "A quiet correspondent",
  place: "Berlin, Germany",
  pronoun: "he/him",
  stampId: "growing",
  body: "I moved cities three weeks ago and I still haven't unpacked the box marked KITCHEN. I've been eating standing up, out of the one bowl I bothered to find.\n\nI think I'm waiting to be sure I'm staying before I let myself arrive.",
  ask: "How long did it take you to unpack somewhere?",
};

/* ── the writing-voice traits shown in VoiceCard ── */
export const VOICE_TRAITS: [string, string, string][] = [
  ["Rhythm", "MELODIC", "Your sentences run about 14 words, then drop to 4. You do that a lot."],
  ["Pace", "UNHURRIED", "Three days between letters, on average. You never answer the same night."],
  ["Vocabulary", "PLAIN & EXACT", "You reach for 'thing' less often than most people here."],
];

/* ── a fake 24-day mood history for the Season bar chart ── */
export const SEASON: MoodId[] = [
  "sleepy", "sleepy", "calm", "calm", "numb", "sleepy", "drained", "drained",
  "drained", "calm", "content", "sleepy", "calm", "calm", "cheerful", "content",
  "sleepy", "calm", "in-love", "sleepy", "calm", "cheerful", "calm", "sleepy",
];


/* ══════════ Wren line libraries (web wren-prompts.js) ══════════ */

export function oneOf(arr: string[], seed?: number): string {
  if (!arr || !arr.length) return "";
  const i = Math.abs(Math.floor(seed == null ? Date.now() / 60000 : seed)) % arr.length;
  return arr[i];
}
export function byLang(pack: Partial<Record<Lang, string[]>>, lang: Lang): string[] {
  return (pack && (pack[lang] || pack.en)) || [];
}

export const WREN_OPENERS: Record<"letter" | "journal", Partial<Record<Lang, string[]>>> = {
  letter: {
    en: [
      "No one's waiting on the other end yet — so write like no one is.",
      "Say the true thing first. You can soften it after, or not.",
      "Start where it's heaviest; I'll read the rest.",
      "You don't have to make sense. You just have to be honest.",
      "Write the sentence you'd delete by morning. That's the one.",
    ],
    zh: [
      "另一头还没有人在等——就当没人在等那样写。",
      "先把真的那句写下来。之后想软化再软化，不软化也行。",
      "从最重的地方开始，剩下的我来读。",
      "不用讲得通，只要够诚实。",
      "写那句你天亮前会删掉的话——就是它。",
    ],
    es: [
      "Nadie espera al otro lado todavía — así que escribe como si nadie esperara.",
      "Di primero lo verdadero. Luego lo suavizas, o no.",
      "Empieza por donde más pesa; yo leo el resto.",
      "No tiene que tener sentido. Solo tiene que ser honesto.",
      "Escribe la frase que borrarías al amanecer. Esa es.",
    ],
    fr: [
      "Personne n'attend encore de l'autre côté — alors écris comme si personne n'attendait.",
      "Dis d'abord la chose vraie. Tu pourras l'adoucir après, ou pas.",
      "Commence là où c'est le plus lourd ; je lirai le reste.",
      "Pas besoin que ce soit cohérent. Juste honnête.",
      "Écris la phrase que tu effacerais au matin. C'est celle-là.",
    ],
    de: [
      "Am anderen Ende wartet noch niemand — also schreib, als würde niemand warten.",
      "Sag zuerst das Wahre. Abmildern kannst du es danach, oder auch nicht.",
      "Fang da an, wo es am schwersten ist; den Rest lese ich.",
      "Es muss keinen Sinn ergeben. Es muss nur ehrlich sein.",
      "Schreib den Satz, den du bis zum Morgen löschen würdest. Das ist er.",
    ],
    it: [
      "Nessuno aspetta ancora dall'altra parte — quindi scrivi come se nessuno aspettasse.",
      "Di' prima la cosa vera. Puoi ammorbidirla dopo, oppure no.",
      "Comincia da dove pesa di più; il resto lo leggo io.",
      "Non deve avere senso. Deve solo essere sincero.",
      "Scrivi la frase che cancelleresti entro domattina. È quella.",
    ],
    ja: [
      "向こう側にはまだ誰も待っていない — だから、誰も待っていないつもりで書いて。",
      "まず本当のことを言って。やわらげるのはあとでいいし、やわらげなくてもいい。",
      "いちばん重いところからはじめて。残りはわたしが読む。",
      "筋が通っていなくていい。正直でさえあれば。",
      "朝までに消してしまいそうな一文を書いて。それがその一文。",
    ],
    ko: [
      "저편에는 아직 아무도 기다리지 않아 — 그러니 아무도 없는 것처럼 써.",
      "진짜인 말을 먼저 해. 나중에 부드럽게 다듬어도 되고, 안 해도 돼.",
      "가장 무거운 데서 시작해. 나머지는 내가 읽을게.",
      "말이 될 필요는 없어. 솔직하기만 하면 돼.",
      "아침이면 지워 버릴 문장을 써. 바로 그거야.",
    ],
  },
  journal: {
    en: [
      // The strongest thing a companion can say about a private room is that
      // she isn't in it either. It leads because it's the first thing anyone
      // wonders when an AI is standing next to their diary.
      "No one sees this. Not even me.",
      "No one reads this but you. So don't perform.",
      "How the day actually landed — not how it should have.",
      "One true line is a whole page here.",
      "Leave it messy. This room doesn't tidy up after you.",
    ],
    zh: [
      "没人看得见这个。我也看不见。",
      "这里只有你会看。所以别表演。",
      "今天真正落在哪儿——不是它本该怎样。",
      "一句真的，在这里就是一整页。",
      "乱着就好。这个房间不会替你收拾。",
    ],
    es: [
      "Nadie lee esto salvo tú. Así que no actúes.",
      "Cómo cayó el día de verdad — no cómo debería.",
      "Una línea verdadera ya es una página entera aquí.",
      "Déjalo desordenado. Esta habitación no ordena por ti.",
    ],
    pt: [
      "Ninguém vê isto. Nem eu.",
      "Ninguém lê isto além de você. Então não atue.",
      "Como o dia caiu de verdade — não como deveria.",
      "Uma linha verdadeira já é uma página inteira aqui.",
      "Deixe bagunçado. Este cômodo não arruma atrás de você.",
    ],
    id: [
      "Tak ada yang melihat ini. Bahkan aku pun tidak.",
      "Tak ada yang membaca ini selain kamu. Jadi jangan berpura-pura.",
      "Bagaimana hari ini benar-benar terasa — bukan seharusnya.",
      "Satu baris yang jujur sudah jadi satu halaman penuh di sini.",
      "Biarkan berantakan. Ruang ini tak akan merapikan setelahmu.",
    ],
    fr: [
      "Personne ne voit ça. Même pas moi.",
      "Personne ne lit ça à part toi. Alors ne joue pas.",
      "Comment la journée est vraiment tombée — pas comment elle aurait dû.",
      "Une ligne vraie, ici, c'est une page entière.",
      "Laisse-le en désordre. Cette pièce ne range pas derrière toi.",
    ],
    de: [
      "Niemand sieht das. Nicht einmal ich.",
      "Niemand liest das außer dir. Also spiel nichts vor.",
      "Wie der Tag wirklich gelandet ist — nicht, wie er hätte sollen.",
      "Eine wahre Zeile ist hier eine ganze Seite.",
      "Lass es unordentlich. Dieser Raum räumt nicht hinter dir auf.",
    ],
    it: [
      "Nessuno vede questo. Nemmeno io.",
      "Nessuno lo legge tranne te. Quindi non recitare.",
      "Com'è caduta davvero la giornata — non come avrebbe dovuto.",
      "Una riga vera, qui, è una pagina intera.",
      "Lascialo in disordine. Questa stanza non riordina dopo di te.",
    ],
    ja: [
      "これは誰にも見えない。わたしにも。",
      "これを読むのはあなただけ。だから、演じないで。",
      "今日が実際どう着地したか — どう着地すべきだったか、じゃなく。",
      "本当の一行は、ここでは一ページ分。",
      "散らかったままでいい。この部屋はあなたのあとを片づけない。",
    ],
    ko: [
      "아무도 이걸 못 봐. 나조차도.",
      "이걸 읽는 건 너뿐이야. 그러니 연기하지 마.",
      "오늘이 실제로 어떻게 내려앉았는지 — 어땠어야 했는지 말고.",
      "진짜인 한 줄이 여기선 한 페이지야.",
      "어질러진 채로 둬. 이 방은 네 뒤를 치워 주지 않아.",
    ],
  },
};

export const WREN_FALLBACK = {
  note: {
    en: [
      "The short lines are holding more than they say.",
      "You're letting a thought finish before you stop it.",
      "There's a question under this that isn't asking for an answer.",
      "This isn't looking to be fixed — only read.",
    ],
    zh: [
      "短句里压着更多没说出口的东西。",
      "你在把一个念头想完，而不是急着收尾。",
      "这底下有个问题，但它并不想要答案。",
      "这不是想被解决，只是想被读到。",
    ],
    es: [
      "Las frases cortas guardan más de lo que dicen.",
      "Dejas que un pensamiento termine antes de detenerlo.",
      "Hay una pregunta debajo que no busca respuesta.",
      "Esto no pide ser arreglado — solo leído.",
    ],
    fr: [
      "Les phrases courtes portent plus qu'elles ne disent.",
      "Tu laisses une pensée finir avant de l'arrêter.",
      "Il y a une question là-dessous qui ne demande pas de réponse.",
      "Ça ne cherche pas à être réparé — seulement lu.",
    ],
    de: [
      "Die kurzen Zeilen tragen mehr, als sie sagen.",
      "Du lässt einen Gedanken zu Ende kommen, bevor du ihn stoppst.",
      "Darunter liegt eine Frage, die keine Antwort will.",
      "Das will nicht repariert werden — nur gelesen.",
    ],
    it: [
      "Le righe corte reggono più di quanto dicano.",
      "Lasci che un pensiero finisca prima di fermarlo.",
      "C'è una domanda sotto che non chiede risposta.",
      "Questo non cerca di essere aggiustato — solo letto.",
    ],
    ja: [
      "短い行が、言葉以上のものを抱えている。",
      "止める前に、考えを最後まで言わせている。",
      "この下に、答えを求めていない問いがある。",
      "これは直されたいんじゃない — 読まれたいだけ。",
    ],
    ko: [
      "짧은 줄들이 말하는 것보다 더 많은 걸 품고 있어.",
      "생각을 멈추기 전에 끝까지 가게 두고 있어.",
      "이 아래에 답을 바라지 않는 질문이 있어.",
      "이건 고쳐지길 바라는 게 아니야 — 읽히길 바랄 뿐.",
    ],
  } as Record<Lang, string[]>,
  peek: {
    en: "They're writing slower, and leaning a little closer.",
    zh: "他们写得越来越慢，也越来越靠近了一点。",
    es: "Escriben más despacio, y se acercan un poco.",
    fr: "Ils écrivent plus lentement, et se penchent un peu plus près.",
    de: "Sie schreiben langsamer und lehnen sich ein wenig näher.",
    it: "Scrivono più piano, e si avvicinano un po'.",
    ja: "書くのがゆっくりになって、少し身を寄せてきている。",
    ko: "더 천천히 쓰고, 조금 더 가까이 기울이고 있어.",
  } as Record<Lang, string>,
};
