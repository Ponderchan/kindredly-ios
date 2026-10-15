import { t } from "../../lib/i18n";
import { dShort } from "../../lib/format";
import type { MeFormat } from "./me-model";

/** The Me model's words (screens/me/me-model): i18n's t, the reader's short date, and
    upper-casing in the reader's locale. Its own module so the components that draw a piece of
    Me (the Aura card on /aura and in the fallback) can use it without the model hook. */
export function meFormat(): MeFormat {
  return { t, dateShort: (d) => dShort(d), upper: (s) => s.toLocaleUpperCase() };
}
