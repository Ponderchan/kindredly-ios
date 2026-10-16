import { requireOptionalNativeModule } from "expo";

/* THE READER'S SCRIPT, FOR THE SWIFT TYPE (KType.tallScript). The letter serifs (Newsreader,
   New York, EB Garamond) have no Japanese or Korean glyphs; iOS draws those from its own CJK
   faces, which stand taller than the serif's line, so serif text in ja or ko sat cramped. The
   app tells the Swift side its language once and on every change (the root layout), and serif
   styles then get CJK leading. Typography only: no string crosses here. */

type KindredlyUINative = {
  setTextScript?: (lang: string) => void;
};

/** Hands the app's language to the Swift type. False when this binary's KindredlyUI has no
    such function (Android, or a dev client built before it). */
export function nativeSetTextScript(lang: string): boolean {
  const native = requireOptionalNativeModule<KindredlyUINative>("KindredlyUI");
  if (typeof native?.setTextScript !== "function") return false;
  try {
    native.setTextScript(lang);
    return true;
  } catch (e) {
    console.warn("[kindredly-ui] setTextScript failed:", e);
    return false;
  }
}
