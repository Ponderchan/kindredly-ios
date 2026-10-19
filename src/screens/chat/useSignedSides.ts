import { useMemo } from "react";
import { useAuth } from "../../lib/auth";
import type { PenSignature, ThreadDetail } from "../../lib/db";
import { frostSpec } from "../../lib/frost";
import { getLang, t, useLang } from "../../lib/i18n";
import { penDemo } from "../../lib/pen-signature";
import { signedSides, type SignedPair } from "../../lib/signed-sides";
import { strangerName } from "../../lib/stranger-name";
import { useTheme } from "../../lib/theme";
import { useWhoBook } from "../../lib/who";

/* WHAT EACH SIDE SIGNED, FOR A SCREEN THAT RUNS THE CEREMONY (identity Phase 2).
   The React Native glue over lib/signed-sides (which decides and is
   node-tested): the reader's book for their courier name (lib/who; name()
   directly, the thread is revealed), my own courier name as a stranger's
   courier in my language gives it (salt 0), the windows in this theme, the
   profile's pen name. The pen-pal chat (LettersIntroduction, with what the
   sheet just signed) and the room (RoomIntroduction) both call it, so the
   two ceremonies can't drift. Null with the switch off: today's ritual. */
export function useSignedSides(detail: ThreadDetail | null | undefined, o: { identity: boolean; id?: string | null; signedNow?: PenSignature | null }): SignedPair | null {
  const auth = useAuth();
  const lang = useLang();
  const { dark } = useTheme();
  const book = useWhoBook();
  const demo = __DEV__ && !!o.id?.startsWith("demo-");
  // a demo on a phone that isn't signed in still wears a window and a courier name of its own
  const myUid = auth.user?.id ?? (demo ? "demo-me" : null);
  const handle = auth.handle || "";
  return useMemo(
    () =>
      signedSides({
        detail,
        identity: o.identity,
        demo,
        myUid,
        handle,
        signedNow: o.signedNow ?? null,
        courierOf: (uid) => book.name(uid),
        myCourier: myUid ? strangerName(myUid, { lang: getLang(), unsigned: t("ld.unsigned") }) : "",
        frostOf: (uid) => frostSpec(uid, dark),
        fallbackName: t("cm.kindred"),
        demoSig: penDemo,
      }),
    // the names are in the reader's language (lang) and the windows in this theme (dark)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, o.identity, o.signedNow, demo, myUid, handle, book, dark, lang],
  );
}
