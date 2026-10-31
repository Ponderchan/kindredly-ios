import type { KMakeFaceChipGroup, KMakeFaceEntry, KMakeFaceStrings } from "../../../modules/kindredly-ui/src/MakeFace";
import type { DrawMode, RefuseReason } from "../../lib/make-face-core";

/* MAKE YOUR OWN FACE, THE WORDS FOR A SCREEN (pure: imports types only, so its node test runs with
   plain node). The page is Swift's (KMakeFacePage); the logic is useMakeFaceModel's; this turns
   where the flow stands into every word the page shows (strings-make-face.ts, mf.*).

   The rejected screen speaks for its reason (no face, a crowd, a minor, unsafe, the words) and
   offers what the reason allows (lib/make-face-core rejectActions); the intro's second row says
   where the reader stands (free, used, First Class); the done page's button is Continue in
   onboarding and Done from Me. */

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** The chips, in their three groups (the design's V4 rows: hair / face / accessories). */
export const CHIP_GROUPS: readonly { id: string; title: string; chips: readonly string[] }[] = [
  { id: "hair", title: "mf.chips.hair", chips: ["curly", "long", "buzz", "braids", "bob"] },
  { id: "face", title: "mf.chips.face", chips: ["freckles", "beard", "brows", "stubble"] },
  { id: "extras", title: "mf.chips.extras", chips: ["glasses", "hoops", "headphones", "beanie"] },
];

export function faceChips(t: TFn): KMakeFaceChipGroup[] {
  return CHIP_GROUPS.map((g) => ({ id: g.id, title: t(g.title), chips: g.chips.map((c) => ({ id: c, label: t(`mf.chip.${c}`) })) }));
}

/** Wren's lines while she paints; "done. look." is the result's own. */
export const genLines = (t: TFn): string[] => [t("mf.gen.1"), t("mf.gen.2"), t("mf.gen.3"), t("mf.gen.4")];

export type QuotaLine = "free" | "used" | "member";

/** the reason's two lines */
const REJECT_KEYS: Record<RefuseReason, string> = {
  no_face: "mf.reject.noFace",
  many_faces: "mf.reject.many",
  minor: "mf.reject.minor",
  unsafe: "mf.reject.unsafe",
  words: "mf.reject.words",
};

/** The rejected screen's button for an action, by the way the face was asked for. */
function rejectLabel(t: TFn, action: "photo" | "words" | null, mode: DrawMode): string {
  if (!action) return "";
  if (action === "photo") return t("mf.reject.tryPhoto");
  return mode === "photo" ? t("mf.reject.useWords") : t("mf.reject.tryWords");
}

export type StringsFacts = {
  quota: QuotaLine;
  entry: KMakeFaceEntry;
  /** the last refusal (rejected screen), or null */
  reason: RefuseReason | null;
  /** how the refused face was asked for */
  mode: DrawMode;
  /** what the rejected screen's two buttons do (rejectActions) */
  reject: { primary: "photo" | "words"; secondary: "photo" | "words" | null };
};

export function faceStrings(t: TFn, f: StringsFacts): KMakeFaceStrings {
  const r = REJECT_KEYS[f.reason ?? "no_face"];
  return {
    closeLabel: t("mf.close"),
    introLine: t("mf.intro.line"),
    introSub: t("mf.intro.sub"),
    introPhoto: t("mf.intro.photo"),
    introQuota: t(f.quota === "member" ? "mf.intro.member" : f.quota === "used" ? "mf.intro.used" : "mf.intro.free"),
    go: t("mf.intro.go"),
    methodTitle: t("mf.method.title"),
    camera: t("mf.method.camera"),
    library: t("mf.method.library"),
    photoSub: t("mf.method.photoSub"),
    wordsRow: t("mf.method.words"),
    wordsSub: t("mf.method.wordsSub"),
    at18: t("mf.method.at18"),
    minorLine: t("mf.method.minor"),
    confirmTitle: t("mf.confirm.title"),
    confirmGuide: t("mf.confirm.guide"),
    retake: t("mf.confirm.retake"),
    usePhoto: t("mf.confirm.use"),
    wordsTitle: t("mf.words.title"),
    wordsPlaceholder: t("mf.words.placeholder"),
    draw: t("mf.words.draw"),
    wordsLabel: t("mf.words.a11y"),
    genLeave: t("mf.gen.leave"),
    knockTitle: t("mf.knock.title"),
    knockBody: t("mf.knock.body"),
    knockWatch: t("mf.knock.watch"),
    knockAllow: t("mf.knock.allow"),
    knockInstead: t("mf.knock.instead"),
    knockWatching: t("mf.knock.watching"),
    knockOn: t("mf.knock.on"),
    knockOff: t("mf.knock.off"),
    knockLeave: t("mf.knock.leave"),
    knockLeaveQuiet: t("mf.knock.leaveQuiet"),
    genLabel: t("mf.gen.a11y"),
    resultLine: t("mf.result.line"),
    resultSub: t("mf.result.sub"),
    resultLabel: t("mf.result.a11y"),
    accept: t("mf.result.accept"),
    another: t("mf.result.another"),
    lock: t("mf.result.lock"),
    instead: t("mf.result.instead"),
    doneTag: t("mf.done.tag"),
    doneLine: t("mf.done.line"),
    doneButton: t(f.entry === "onboarding" ? "mf.done.continue" : "mf.done.done"),
    rejectBadge: t("mf.reject.badge"),
    rejectLine: t(`${r}.line`),
    rejectSub: t(`${r}.sub`),
    rejectPrimary: rejectLabel(t, f.reject.primary, f.mode),
    rejectSecondary: rejectLabel(t, f.reject.secondary, f.mode),
    failedLine: t("mf.failed.line"),
    failedSub: t("mf.failed.sub"),
    retry: t("mf.failed.retry"),
    notNow: t("mf.notNow"),
    quotaTag: t("mf.quota.tag"),
    quotaTitle: t("mf.quota.title"),
    quotaSub: t("mf.quota.sub"),
    quotaCta: t("mf.quota.cta"),
    signinTitle: t("mf.signin.title"),
    signinSub: t("mf.signin.sub"),
    apple: t("mf.signin.apple"),
    google: t("mf.signin.google"),
    later: t("mf.signin.later"),
  };
}
