import type { SupportedLanguage } from "./types";

/* THE ENGINE'S VIEW OF THE APP LANGUAGE.
   ────────────────────────────────────────────────────────────────────────
   The writing engine must know the reader's chosen language, but it must NOT
   import lib/i18n — that pulls in React + AsyncStorage and would make the
   whole engine impossible to unit-test under plain node (the repo's test
   convention). So i18n PUSHES the current language in here whenever it
   changes; the engine only ever reads this tiny holder. Defaults to "en" so
   the engine is correct even before i18n has loaded (and in tests). */

let current: SupportedLanguage = "en";

export function setEngineLanguage(lang: SupportedLanguage): void {
  current = lang;
}

export function engineLanguage(): SupportedLanguage {
  return current;
}
