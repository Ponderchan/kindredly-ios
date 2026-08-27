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
  } as Record<Lang, string[]>,
  peek: {
    en: "They're writing slower, and leaning a little closer.",
    zh: "他们写得越来越慢，也越来越靠近了一点。",
    es: "Escriben más despacio, y se acercan un poco.",
  } as Record<Lang, string>,
};
