import { hasDictionary, type ReaderLanguage, type SupportedLanguage } from "../types";
import type { LangResources } from "./types";
import { EN } from "./en";
import { ES } from "./es";
import { PT } from "./pt";
import { ID } from "./id";
import { FR } from "./fr";
import { DE } from "./de";
import { IT } from "./it";
import { JA } from "./ja";
import { KO } from "./ko";

const TABLE: Record<SupportedLanguage, LangResources> = { en: EN, es: ES, pt: PT, id: ID, fr: FR, de: DE, it: IT, ja: JA, ko: KO };

/** the resource pack for a resolved language. A language without one reads
    through English for the language-neutral parts; the callers that would
    misread on that (the dictionary-fed dimensions) check hasDictionary. */
export function resources(lang: ReaderLanguage): LangResources {
  return hasDictionary(lang) ? (TABLE[lang] ?? EN) : EN;
}

export type { LangResources, MatchMode } from "./types";
export { tokenize, countAny, hasAny, countMatches } from "./types";
