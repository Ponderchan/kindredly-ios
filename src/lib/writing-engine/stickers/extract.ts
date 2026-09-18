import { resources, tokenize } from "../dictionaries";
import { detectLanguage } from "../resolve-language";
import type { SupportedLanguage } from "../types";
import { lexicon } from "./lexicons";
import type { Piece, PieceFeatures, PieceVerdict, Sentence, Span, TraitId } from "./types";

/* EXTRACT — one piece, read on its own.
   ────────────────────────────────────────────────────────────────────────
   Everything here is per piece: sentences are split with their offsets so
   every verdict can point at the exact words it fired on; rates are per
   piece so one long letter can never outvote five short ones (aggregation
   counts pieces, not hits). A rule answers support / contra / unknown and
   nothing else — "unknown" is the honest answer whenever the piece simply
   does not give the rule a chance to fire either way. */

/* ── revision: same words, same revision; re-pasting is not new evidence ── */
export function contentHash(text: string): string {
  const s = text.toLowerCase().replace(/\s+/g, " ").trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/* ── language: the piece's own stamp, then its own words, never the UI ── */
export function pieceLanguage(p: Piece): SupportedLanguage | null {
  const explicit = (p.lang || "").toLowerCase().split(/[-_]/)[0];
  if (explicit === "en" || explicit === "es" || explicit === "pt" || explicit === "id") return explicit;
  const detected = detectLanguage(p.text);
  if (detected) return detected;
  // English is never "detected" by the marker sets; a Latin-script piece with
  // no es/pt/id markers is read as English. Any other script → neutral only.
  const letters = p.text.match(/\p{L}/gu) || [];
  if (!letters.length) return null;
  const latin = p.text.match(/[A-Za-zÀ-ɏ]/g) || [];
  return latin.length / letters.length >= 0.9 ? "en" : null;
}

/* ── sentences with offsets ── */
const ABBR = new Set(["mr", "mrs", "ms", "dr", "vs", "etc", "st", "no", "sr", "sra", "dra", "jr", "e.g", "i.e", "p.s", "ps"]);

type Ending = Sentence["ending"];
export type SentenceX = Sentence;

export function splitSentences(text: string): SentenceX[] {
  const out: SentenceX[] = [];
  const re = /(\.{3,}|…|[!?！？]+|[。]|\.|\n+)/g;
  let cut = 0;
  let m: RegExpExecArray | null;
  const push = (start: number, end: number, ending: Ending) => {
    // trim to the visible words
    let s = start;
    let e = end;
    while (s < e && /\s/.test(text[s])) s++;
    while (e > s && /\s/.test(text[e - 1])) e--;
    const t = text.slice(s, e);
    const words = tokensWithOffsets(t).length;
    if (!words) return;
    out.push({ start: s, end: e, text: t, words, ending });
  };
  while ((m = re.exec(text))) {
    const tok = m[0];
    const at = m.index;
    let ending: Ending;
    if (tok.startsWith("...") || tok === "…") ending = "ellipsis";
    else if (/[!！]/.test(tok)) ending = "exclaim";
    else if (/[?？]/.test(tok)) ending = "question";
    else if (tok === "。") ending = "period";
    else if (tok === ".") {
      // abbreviation / decimal / initial guards
      const before = text.slice(Math.max(cut, at - 6), at);
      const word = (before.match(/[\p{L}.]+$/u) || [""])[0].toLowerCase();
      const next = text[at + 1] || "";
      const single = /^[a-z]$/i.test(word);
      if (/\d$/.test(before) && /\d/.test(next)) continue; // 3.5
      if (single || ABBR.has(word.replace(/\.$/, ""))) continue; // e.g. / Mr.
      ending = "period";
    } else ending = "none"; // newline
    push(cut, at + (ending === "none" ? 0 : tok.length), ending);
    cut = at + tok.length;
  }
  if (cut < text.length) push(cut, text.length, "none");
  return out;
}

/* ── token spans ── */
interface Tok {
  w: string;
  s: number;
  e: number;
}
function tokensWithOffsets(text: string): Tok[] {
  const out: Tok[] = [];
  const re = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+|[\p{L}']+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const run = m[0];
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(run)) {
      // no spaces between words here: count roughly one word per two
      // characters, so length and rhythm rules read these letters too
      for (let i = 0; i < run.length; i += 2) out.push({ w: run.slice(i, i + 2), s: m.index + i, e: m.index + Math.min(i + 2, run.length) });
    } else out.push({ w: run.toLowerCase(), s: m.index, e: m.index + run.length });
  }
  return out;
}

/** every hit of a word/phrase list, as [start,end] marks */
function findAll(text: string, toks: Tok[], list: string[]): [number, number][] {
  const singles = new Set<string>();
  const phrases: string[] = [];
  for (const w of list) (w.includes(" ") ? phrases.push(w) : singles.add(w));
  const marks: [number, number][] = [];
  for (const t of toks) if (singles.has(t.w)) marks.push([t.s, t.e]);
  const lower = text.toLowerCase();
  for (const p of phrases) {
    let i = lower.indexOf(p);
    while (i !== -1) {
      marks.push([i, i + p.length]);
      i = lower.indexOf(p, i + p.length);
    }
  }
  return marks.sort((a, b) => a[0] - b[0]);
}

function findRegex(text: string, re: RegExp): [number, number][] {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  const marks: [number, number][] = [];
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) {
    if (!m[0].length) {
      g.lastIndex++;
      continue;
    }
    marks.push([m.index, m.index + m[0].length]);
  }
  return marks;
}

const sentenceOf = (sents: Sentence[], at: number): Sentence | null => sents.find((s) => at >= s.start && at < s.end) ?? null;

/* ── the read ── */
export function extractPiece(p: Piece): PieceFeatures {
  const text = p.text;
  const lang = pieceLanguage(p);
  const sents = splitSentences(text);
  const toks = tokensWithOffsets(text);
  const words = toks.length;
  const full = words >= 25 && sents.length >= 2;
  const day = p.createdAt ? p.createdAt.slice(0, 10) : "";
  const verdicts: Partial<Record<TraitId, PieceVerdict>> = {};

  const span = (mark: [number, number] | null, fallback?: Sentence): Span | null => {
    const s = mark ? sentenceOf(sents, mark[0]) ?? fallback ?? null : fallback ?? null;
    if (!s) return null;
    return { pieceId: p.id, revision: p.revision, start: s.start, end: s.end, mark: mark ?? undefined, source: p.source };
  };
  const spans = (marks: [number, number][], n = 2): Span[] => {
    const out: Span[] = [];
    const seen = new Set<number>();
    for (const mk of marks) {
      const sp = span(mk);
      if (!sp || seen.has(sp.start)) continue;
      seen.add(sp.start);
      out.push(sp);
      if (out.length >= n) break;
    }
    return out;
  };
  const set = (id: TraitId, verdict: PieceVerdict["verdict"], ev: Span[] = []) => {
    verdicts[id] = { verdict, spans: verdict === "support" ? ev : [] };
  };
  const per100 = (n: number) => (words ? (n / words) * 100 : 0);

  /* ── language-neutral: sentence length, rhythm, punctuation, case, emoji ── */
  const lens = sents.map((s) => s.words);
  if (sents.length >= 3) {
    const sorted = [...lens].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const shortShare = lens.filter((l) => l <= 10).length / lens.length;
    const longShare = lens.filter((l) => l >= 20).length / lens.length;
    const shortest = sents.reduce((a, b) => (b.words < a.words ? b : a));
    const longest = sents.reduce((a, b) => (b.words > a.words ? b : a));
    if (median <= 8 && shortShare >= 0.6) set("short_lines", "support", [span(null, shortest)!]);
    else if (median >= 16) set("short_lines", "contra");
    else set("short_lines", "unknown");
    if (median >= 16 && longShare >= 0.4) set("long_lines", "support", [span(null, longest)!]);
    else if (median <= 8) set("long_lines", "contra");
    else set("long_lines", "unknown");
  }
  if (sents.length >= 4) {
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
    const cv = mean ? sd / mean : 0;
    let swings = 0;
    let swingAt = -1;
    for (let i = 1; i < lens.length; i++) {
      const a = lens[i - 1];
      const b = lens[i];
      if (Math.abs(a - b) >= 6 && Math.max(a, b) / Math.max(1, Math.min(a, b)) >= 2.5) {
        swings++;
        if (swingAt < 0) swingAt = i;
      }
    }
    if (cv <= 0.35) {
      set("steady_beat", "support", [span(null, sents[0])!]);
      set("tempo_shift", "contra");
    } else if (cv >= 0.7 && swings >= 2) {
      set("tempo_shift", "support", [span(null, sents[swingAt - 1])!, span(null, sents[swingAt])!]);
      set("steady_beat", "contra");
    } else {
      set("steady_beat", cv >= 0.7 ? "contra" : "unknown");
      set("tempo_shift", cv <= 0.35 ? "contra" : "unknown");
    }
  }
  // punctuation, per opportunity (a terminal), an ellipsis counted once
  const terminals = sents.filter((s) => s.ending !== "none");
  const periods = terminals.filter((s) => s.ending === "period").length;
  const ellipses = terminals.filter((s) => s.ending === "ellipsis").length + findRegex(text, /(\.{3,}|…)(?!\s*$)/g).filter(([s]) => !terminals.some((t) => t.end === s + 3 || t.end === s + 1)).length;
  const exclaims = terminals.filter((s) => s.ending === "exclaim").length;
  const dashMarks = findRegex(text, /—|–|\s-\s/g);
  const ellipsisMarks = findRegex(text, /\.{3,}|…/g);
  if (terminals.length >= 4) {
    const decorated = exclaims + ellipses + dashMarks.length;
    if (periods / terminals.length >= 0.85 && decorated === 0) set("full_stop", "support", [span(null, terminals[0])!]);
    else if (decorated >= 2) set("full_stop", "contra");
    else set("full_stop", "unknown");
    set("dash_lover", dashMarks.length >= 2 ? "support" : dashMarks.length === 0 ? "contra" : "unknown", spans(dashMarks));
    // commas carry the breathing: 1.5+ per sentence, judged on the sentence with most
    const commaMarks = findRegex(text, /[,，]/g);
    const perSent = commaMarks.length / sents.length;
    if (perSent >= 1.5) {
      const busiest = sents.reduce((a, b) => ((b.text.match(/[,，]/g) || []).length > (a.text.match(/[,，]/g) || []).length ? b : a));
      set("comma_breath", "support", [span(null, busiest)!]);
    } else set("comma_breath", perSent <= 0.4 ? "contra" : "unknown");
    set("ellipsis_keeper", ellipsisMarks.length >= 2 ? "support" : ellipsisMarks.length === 0 ? "contra" : "unknown", spans(ellipsisMarks));
  } else {
    // a short reply still shows a dash or an ellipsis if it has one
    if (dashMarks.length >= 2) set("dash_lover", "support", spans(dashMarks));
    if (ellipsisMarks.length >= 2) set("ellipsis_keeper", "support", spans(ellipsisMarks));
  }
  // case: sentence-initial letters
  const initials = sents.map((s) => s.text.match(/\p{L}/u)?.[0] ?? "").filter(Boolean);
  if (initials.length >= 3) {
    const lower = initials.filter((c) => c === c.toLowerCase() && c !== c.toUpperCase()).length / initials.length;
    if (lower >= 0.8) {
      const first = sents.find((s) => /^\p{Ll}/u.test(s.text))!;
      set("lowercase_loyal", "support", [span([first.start, first.start + 1], first)!]);
    } else if (lower <= 0.2) set("lowercase_loyal", "contra");
    else set("lowercase_loyal", "unknown");
  }
  const emojiMarks = findRegex(text, /\p{Extended_Pictographic}/gu);
  if (words >= 15) set("emoji_accent", emojiMarks.length ? "support" : "contra", spans(emojiMarks));
  else if (emojiMarks.length) set("emoji_accent", "support", spans(emojiMarks));

  /* ── more language-neutral reads ── */
  // digits, times, dates
  const numMarks = findRegex(text, /\d[\d:.,%]*(\s?(am|pm))?/gi);
  if (words >= 20) set("number_person", per100(numMarks.length) >= 1.5 && numMarks.length >= 2 ? "support" : numMarks.length === 0 && words >= 40 ? "contra" : "unknown", spans(numMarks));
  // the whole piece is one sentence
  if (sents.length === 1 && words >= 6 && words <= 40) set("one_liner", "support", [span(null, sents[0])!]);
  else if (sents.length >= 3) set("one_liner", "contra");
  // fragments: three words or fewer
  if (sents.length >= 3) {
    const frags = sents.filter((x) => x.words <= 3);
    set("fragment_fan", frags.length / sents.length >= 0.4 ? "support" : frags.length === 0 ? "contra" : "unknown", frags.length ? [span(null, frags[0])!] : []);
    // questions in the body, not the last line
    const qs = sents.slice(0, -1).filter((x) => x.ending === "question");
    set("question_asker", qs.length >= 2 || (qs.length >= 1 && qs.length / sents.length >= 0.3) ? "support" : qs.length === 0 ? "contra" : "unknown", qs.length ? [span(null, qs[0])!] : []);
  }
  // lists: three or more lines that start with a bullet, a dash or a number
  const listLines = findRegex(text, /^\s*([-•*]|\d{1,2}[.)])\s+\S/gm);
  if (listLines.length >= 3) set("list_maker", "support", spans(listLines, 1));
  else if (words >= 40) set("list_maker", "contra");
  // length of the piece itself
  if (words >= 200) set("slow_burner", "support", [span(null, sents[0])!]);
  else if (words >= 12) set("slow_burner", words <= 80 ? "contra" : "unknown");
  if (words >= 6 && words <= 40 && p.source !== "reply") set("quick_note", "support", [span(null, sents[0])!]);
  else if (words >= 120) set("quick_note", "contra");
  // paragraphs vs a wall
  const paras = text.split(/\n\s*\n/).filter((x) => x.trim().length).length;
  if (words >= 60) {
    set("paragraph_person", paras >= 2 ? "support" : "contra", paras >= 2 ? [span(null, sents[0])!] : []);
    set("wall_of_text", words >= 120 && !/\n/.test(text.trim()) ? "support" : paras >= 2 ? "contra" : "unknown", words >= 120 && !/\n/.test(text.trim()) ? [span(null, sents[0])!] : []);
  }
  // more punctuation
  const bangMarks = findRegex(text, /[!！]+/g);
  const parenMarks = findRegex(text, /\([^()]{2,}\)|（[^（）]{2,}）/g);
  const quoteMarks = findRegex(text, /["“”「][^"“”」]{2,}["“”」]/g);
  const semiMarks = findRegex(text, /;|；/g);
  if (terminals.length >= 3 || words >= 25) {
    set("exclaimer", bangMarks.length >= 2 ? "support" : bangMarks.length === 0 ? "contra" : "unknown", spans(bangMarks));
    set("side_noter", parenMarks.length >= 1 ? "support" : words >= 40 ? "contra" : "unknown", spans(parenMarks));
    set("quote_collector", quoteMarks.length >= 1 ? "support" : words >= 40 ? "contra" : "unknown", spans(quoteMarks));
    set("semicolon", semiMarks.length >= 1 ? "support" : words >= 40 ? "contra" : "unknown", spans(semiMarks));
  }
  if (words >= 60) set("stream_conscious", terminals.length <= 1 ? "support" : terminals.length >= 4 ? "contra" : "unknown", terminals.length <= 1 ? [span(null, sents[0])!] : []);
  // ALL CAPS words (not "I", not acronyms of two letters)
  const capsMarks = findRegex(text, /\b[A-Z]{3,}\b/g).filter(([a, b]) => !/^(LOL|OMG|TBH|IDK|ASAP|USA|UK)$/.test(text.slice(a, b)));
  if (words >= 15) set("caps_locker", capsMarks.length >= 2 ? "support" : capsMarks.length === 0 ? "contra" : "unknown", spans(capsMarks));
  // sooo, yesss — a letter stretched three or more times
  const stretchMarks = findRegex(text, /\b\p{L}*(\p{L})\1{2,}\p{L}*\b/gu).filter(([a, b]) => !/^(www|aaa|iii)$/i.test(text.slice(a, b)));
  if (words >= 15) set("stretcher", stretchMarks.length >= 1 ? "support" : "contra", spans(stretchMarks));
  // P.S.
  const psMarks = findRegex(text, /(^|\n)\s*p\.?\s?s\.?\s*[:：-]?\s*\S/gi);
  if (words >= 20) set("ps_writer", psMarks.length ? "support" : "contra", spans(psMarks, 1));
  // the last line comes back to the first: two shared content words
  if (full && sents.length >= 3) {
    const cw = (t: string) => new Set(tokenize(t).filter((w) => w.length >= 4));
    const a = cw(sents[0].text);
    const shared = [...cw(sents[sents.length - 1].text)].filter((w) => a.has(w));
    set("circle_back", shared.length >= 2 ? "support" : "contra", shared.length >= 2 ? [span(null, sents[sents.length - 1])!] : []);
  }

  /* ── language-bound reads ── */
  if (lang) {
    const res = resources(lang);
    const lex = lexicon(lang);
    const affectAll = res.emotionWords ?? [...res.affectPos, ...res.affectNeg];

    // vocabulary
    const concrete = findAll(text, toks, lex.concrete);
    const abstract = findRegex(text, res.abstract);
    if (words >= 20) {
      if (concrete.length >= 2 && per100(concrete.length) >= 2.5) set("concrete_detail", "support", spans(concrete));
      else if (concrete.length === 0 && words >= 40) set("concrete_detail", "contra");
      else set("concrete_detail", "unknown");
      if (abstract.length >= 2 && per100(abstract.length) >= 3) set("abstract_ideas", "support", spans(abstract));
      else if (abstract.length === 0 && words >= 40) set("abstract_ideas", "contra");
      else set("abstract_ideas", "unknown");
      // long words: nine letters and up
      const longMarks = toks.filter((t) => t.w.length >= 9).map((t) => [t.s, t.e] as [number, number]);
      set("big_words", per100(longMarks.length) >= 6 && longMarks.length >= 2 ? "support" : per100(longMarks.length) <= 1.5 && words >= 40 ? "contra" : "unknown", spans(longMarks));
      // a favourite word, used three times in one piece
      const freq = new Map<string, [number, number][]>();
      for (const t of toks) if (t.w.length >= 5 && !res.hedges.includes(t.w) && !res.firstPerson.includes(t.w)) freq.set(t.w, [...(freq.get(t.w) ?? []), [t.s, t.e]]);
      const fav = [...freq.entries()].filter(([, m]) => m.length >= 3).sort((a, b) => b[1].length - a[1].length)[0];
      set("repeat_word", fav ? "support" : words >= 60 ? "contra" : "unknown", fav ? spans(fav[1]) : []);
    }

    // emotion — only where a feeling is in the room
    const owned = findRegex(text, res.ownedFrame);
    const named = findAll(text, toks, affectAll);
    const pos = findAll(text, toks, res.affectPos);
    const neg = findAll(text, toks, res.affectNeg);
    if (words >= 20 && pos.length + neg.length >= 2) {
      set("sunny_side", pos.length >= 2 && pos.length >= 2 * neg.length ? "support" : neg.length > pos.length ? "contra" : "unknown", spans(pos));
      set("heavy_heart", neg.length >= 2 && neg.length >= 2 * pos.length ? "support" : pos.length > neg.length ? "contra" : "unknown", spans(neg));
      set("both_ways", pos.length >= 1 && neg.length >= 1 ? "support" : "contra", [...spans(pos, 1), ...spans(neg, 1)]);
    }
    if (words >= 20) set("feeling_namer", owned.length >= 1 ? "support" : words >= 40 ? "contra" : "unknown", spans(owned));
    // a feeling has to be in the room before restraint can be read: one
    // named affect word, or two topic words, else the piece is unknown here
    const context = findAll(text, toks, lex.emotionalContext).length;
    if (words >= 20 && (named.length >= 1 || context >= 2)) {
      if (owned.length >= 1 || named.length >= 2) {
        set("heart_open", "support", spans([...owned, ...named]));
        set("quiet_feeling", owned.length >= 1 || named.length >= 3 ? "contra" : "unknown");
      } else {
        set("heart_open", "contra");
        set("quiet_feeling", "support", [span(null, sents[sents.length - 1])!]);
      }
    }

    // perspective
    const first = findAll(text, toks, res.firstPerson);
    const outward = findAll(text, toks, res.outward);
    if (words >= 25) {
      if (per100(first.length) >= 6 && first.length > 2 * outward.length) {
        set("inside_voice", "support", spans(first));
        set("world_watch", "contra");
      } else if (per100(outward.length) >= 3 && outward.length >= first.length) {
        set("world_watch", "support", spans(outward));
        set("inside_voice", "contra");
      } else {
        set("inside_voice", "unknown");
        set("world_watch", "unknown");
      }
    }

    // more perspective
    const second = findAll(text, toks, lex.second);
    const we = findAll(text, toks, lex.we);
    const distance = findRegex(text, res.distanceFrame);
    if (words >= 25) {
      set("you_person", per100(second.length) >= 3 && second.length >= 2 ? "support" : second.length === 0 && words >= 40 ? "contra" : "unknown", spans(second));
      set("we_person", per100(we.length) >= 2 && we.length >= 2 ? "support" : we.length === 0 && words >= 40 ? "contra" : "unknown", spans(we));
      set("third_person", distance.length >= 1 ? "support" : words >= 40 ? "contra" : "unknown", spans(distance));
    }

    // function words
    const hedges = findAll(text, toks, res.hedges);
    const turns = findAll(text, toks, lex.turns);
    const honest = findAll(text, toks, lex.honestly);
    const because = findAll(text, toks, lex.because);
    const andThen = findAll(text, toks, lex.andThen);
    if (words >= 25) {
      set("honestly_person", honest.length >= 1 ? "support" : words >= 40 ? "contra" : "unknown", spans(honest));
      set("reason_giver", because.length >= 2 && per100(because.length) >= 1.5 ? "support" : because.length === 0 && words >= 40 ? "contra" : "unknown", spans(because));
      set("and_then", andThen.length >= 2 && per100(andThen.length) >= 1.5 ? "support" : andThen.length === 0 && words >= 40 ? "contra" : "unknown", spans(andThen));
    }
    if (words >= 25) {
      if (hedges.length >= 2 && per100(hedges.length) >= 2) set("maybe_maker", "support", spans(hedges));
      else if (hedges.length === 0 && words >= 40) set("maybe_maker", "contra");
      else set("maybe_maker", "unknown");
      if (turns.length >= 2 && per100(turns.length) >= 1.5) set("thought_turn", "support", spans(turns));
      else if (turns.length === 0 && words >= 40) set("thought_turn", "contra");
      else set("thought_turn", "unknown");
      if (words >= 40) set("firm_voice", hedges.length === 0 ? "support" : hedges.length >= 2 ? "contra" : "unknown", hedges.length === 0 ? [span(null, sents[0])!] : []);
    }

    // structure — the first sentence, judged on its own
    if (sents.length >= 2 && words >= 12) {
      const s0 = sents[0];
      set("greeter", lex.greeting.test(s0.text.trim()) ? "support" : "contra", lex.greeting.test(s0.text.trim()) ? [span(null, s0)!] : []);
      set("time_stamper", lex.timeOpen.test(s0.text.trim()) ? "support" : "contra", lex.timeOpen.test(s0.text.trim()) ? [span(null, s0)!] : []);
    }
    if (full) {
      const s0 = sents[0];
      const open = s0.text;
      const openConcrete = concrete.filter(([s]) => s >= s0.start && s < s0.end);
      const openOwned = owned.some(([s]) => s >= s0.start && s < s0.end) || lex.stance.test(open);
      const isScene = res.detailOpeners.test(open.trim()) && openConcrete.length >= 1 && !openOwned;
      const isPoint = s0.words <= 14 && openOwned && openConcrete.length === 0;
      if (isScene) {
        set("scene_open", "support", [span(openConcrete[0], s0)!]);
        set("point_first", "contra");
      } else if (isPoint) {
        set("point_first", "support", [span(null, s0)!]);
        set("scene_open", "contra");
      } else {
        set("scene_open", "unknown");
        set("point_first", "unknown");
      }
    }

    // laughter, in this language's own spelling
    const laughs = findRegex(text, res.laughter);
    if (words >= 15) set("laugh_tracker", laughs.length >= 1 ? "support" : "contra", spans(laughs));

    // quirks — the ending, judged on its own
    if (full) {
      const last = sents[sents.length - 1];
      if (last.words >= 3) {
        const lastToks = toks.filter((t) => t.s >= last.start && t.e <= last.end);
        const addressed = lastToks.some((t) => lex.second.includes(t.w));
        const asks = lastToks.length ? lex.askers.includes(lastToks[0].w) : false;
        const isQuestion = last.ending === "question" || /[?？]\s*$/.test(last.text);
        if (isQuestion && (addressed || asks)) set("open_ender", "support", [span(null, last)!]);
        else set("open_ender", "contra");
      }
    }
  }

  return { piece: p, lang, words, sentences: sents, full, verdicts, day };
}
