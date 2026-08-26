import type { SupportedLanguage } from "../types";
import type { LangResources } from "./types";
import { EN } from "./en";
import { ES } from "./es";
import { PT } from "./pt";
import { ID } from "./id";

const TABLE: Record<SupportedLanguage, LangResources> = { en: EN, es: ES, pt: PT, id: ID };

/** the resource pack for a resolved language (defaults to English). */
export function resources(lang: SupportedLanguage): LangResources {
  return TABLE[lang] ?? EN;
}

export type { LangResources } from "./types";
export { tokenize, countAny, hasAny } from "./types";
