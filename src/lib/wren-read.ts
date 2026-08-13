import type { WrenMood } from "../components/WrenBird";
import { OPENING_MIN } from "./weighted-count";

/* How Wren reads a piece of writing — words, tone, and emoji, in English and
   Chinese. Heavy signals are checked first: if in doubt she'd rather be tender
   than celebrate the wrong thing. Not a classifier, just a companion catching
   the drift. Shared by the composer and the onboarding hatch. */

const HEAVY =
  /(tired|exhausted|drained|sad|down|cry|crying|tears|alone|lonely|lost|empty|numb|anxious|anxiety|scared|afraid|worried|hurt|hurts|hurting|hate|angry|broke|broken|breakup|miss|missing|grief|grieving|depress|overwhelm|stress|can'?t|hopeless|worthless|ashamed|guilt|sick|pain|dying|die|scream|drowning|累|疲惫|难过|伤心|孤独|孤单|一个人|想哭|哭|崩溃|焦虑|害怕|好怕|痛苦|难受|恨|生气|烦|压力|撑不住|无力|麻木|失眠|失去|分手|抑郁|绝望|委屈|自责|愧疚|想念|舍不得|不想活|好难)/i;
const LIGHT =
  /(happy|glad|excited|love|loved|grateful|thankful|great|proud|amazing|wonderful|relieved|relief|joy|celebrat|yay|finally|hopeful|better|smil|laugh|best day|开心|高兴|快乐|喜欢|爱你|感激|感恩|太好了|骄傲|激动|兴奋|放松|治愈|终于|希望|变好|幸福|满足|超棒|棒|美好|感谢)/i;

const HEAVY_TONE = /(唉+|呜+|哎[^呀哟]|叹气|😮‍💨|emo\b)/i;
const LAUGH = /(哈哈+|嘻嘻+|嘿嘿+|嘎嘎+|hhh+|lol|lm+ao|233+|笑死|哈哈哈)/i;
const EXCITED_PUNC = /[!！]{2,}/;
const ELLIPSIS = /(\.{3,}|。{2,}|…+|⋯)/;
const QUESTION = /[?？](\s|["'”’)]|$)|(吗|呢|吧)\s*[?？]?\s*$/;

const HEAVY_EMOJI = ["😢", "😭", "😔", "😞", "😟", "😥", "😩", "😫", "😰", "😨", "💔", "🥺", "😪", "😓", "🥀", "😖", "😣", "🙁", "☹️", "😿", "😮‍💨"];
const LIGHT_EMOJI = ["😊", "😄", "😁", "😆", "🥰", "😍", "🤗", "🎉", "✨", "💛", "💜", "❤️", "❤", "🧡", "💚", "💙", "🙌", "👍", "😌", "🥳", "😂", "🤣", "☺️", "🌈", "🌸", "💫", "⭐", "🌟"];
const CURIOUS_EMOJI = ["🤔", "❓", "❔", "👀", "🧐"];
const has = (t: string, arr: string[]) => arr.some((e) => t.includes(e));

/** Read the drift of a piece of text into one of Wren's moods.
 *  `enough` = has the writer put down at least a line (controls listen→happy). */
export function readMood(text: string, enough = true): WrenMood {
  const t = text.trim();
  if (!t) return "listen"; // she's here, waiting
  if (HEAVY.test(t) || has(t, HEAVY_EMOJI) || HEAVY_TONE.test(t)) return "worry";
  if (LIGHT.test(t) || has(t, LIGHT_EMOJI) || LAUGH.test(t) || EXCITED_PUNC.test(t)) return "delight";
  if (has(t, CURIOUS_EMOJI) || QUESTION.test(t)) return "curious";
  if (ELLIPSIS.test(t)) return "think";
  return enough ? "happy" : "listen";
}

/** Wren's one-line voice for a mood (composer register). */
export function wrenLine(m: WrenMood): string {
  switch (m) {
    case "worry":
      return "I hear you. Take your time.";
    case "delight":
      return "Oh — I love this.";
    case "happy":
      return "Got it. Send whenever you're ready.";
    case "curious":
      return "Ooh — go on, I'm all ears.";
    case "think":
      return "Mm… I'm sitting with that too.";
    case "listen":
    default:
      return "I'm right here, listening.";
  }
}

/** As you write a cold opening, Wren coaxes you past a real line — and the
 *  moment you clear it, the floor turns into the matching itself ("go meet your
 *  kindred"). She isn't a validator; she's getting to know you. Opening only —
 *  replies and letters to yourself never ask this. Buckets are weighted units
 *  ([[weighted-count]]), so one hanzi steps two rungs at a time; that's fine,
 *  four rungs is coarse on purpose. */
export function openingLadder(weighted: number): { line: string; ready: boolean } {
  if (weighted >= OPENING_MIN) return { line: "Okay. I know a little more of you now. Go meet your kindred.", ready: true };
  if (weighted >= 30) return { line: "Almost there. I want one more thought.", ready: false };
  if (weighted >= 15) return { line: "Tell me a little more.", ready: false };
  return { line: "I'm listening…", ready: false };
}

/** Wren's first words to a newly-written line at the hatch (warmer register). */
export function hatchLine(m: WrenMood): string {
  switch (m) {
    case "worry":
      return "I hear you. I've got this one.";
    case "delight":
      return "Oh, I love that you wrote that.";
    case "curious":
      return "Ooh — tell me more, always.";
    case "think":
      return "I'll sit with that, as long as it takes.";
    case "happy":
    case "listen":
    default:
      return "I read every word. I've got you now.";
  }
}
