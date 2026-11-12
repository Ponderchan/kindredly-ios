import type { ThreadDetail, ThreadMessage } from "../../lib/db";
import type { TFn } from "../../lib/format";
import type { ThreadDetailStatus } from "../../lib/thread-detail-core";
import type { CorrespondentRead, Resonance } from "../../lib/correspondent";
import type { DimKey, DimScore } from "../../lib/hatch-engine";
import { PEN_BASELINE, PEN_H, PEN_W, penOrNull, penPath, penTypedUpright } from "../../lib/pen-signature";
import { developFor, mosaicMask } from "../../lib/mosaic";
import type {
  KKindredPageFact,
  KKindredPageFaceShape,
  KKindredPageLearned,
  KKindredPageOpening,
  KKindredPagePerson,
  KKindredPageResonance,
  KKindredPageSigned,
  KKindredPageState,
} from "../../../modules/kindredly-ui/src/KindredPage";
import { canTalk, faceKind, lettersValue, pageTitle, showsArrivalMosaic, whoBegan } from "./kindred-page";

/* A KINDRED'S PAGE, WORDED FOR SWIFT (2026-10-27, the "kindredpage" switch).
   ────────────────────────────────────────────────────────────────────────
   The SwiftUI page (screens/chat/KindredPageNative, KKindredPageView)
   draws what this file words, from the same reads the React Native page
   (screens/chat/KindredPage) makes: the thread detail, what their letters
   told you (readCorrespondent), how alike you write (resonance), the
   signature, and the facts. The rules stay in ./kindred-page, shared by
   both renderers; this only puts each word in its place, so
   `node src/screens/chat/kindred-page-view.test.ts` can check them.

   The face's picture, the frosted window and the member stamp come from
   hooks (lib/faces, lib/who, lib/member-marks): the host adds them. This
   file only says which shape the face takes. */

/** The copy functions the page reads, injected so plain node can test the builder. */
export type KindredPageCopy = {
  t: TFn;
  locale: string;
  dimLabel: (k: DimKey) => string;
  dimLineThird: (d: DimScore) => string;
  dimSealedThird: (k: DimKey) => string;
  archName: (id: string) => string;
  archDescThird: (id: string) => string;
  /** a day in full (lib/format dLong) */
  dayLong: (iso: string) => string;
};

export type KindredPageInput = {
  detail: ThreadDetail | null;
  status: ThreadDetailStatus;
  identity: boolean;
  /** what their letters told you; null before there is a detail */
  read: CorrespondentRead | null;
  /** how alike you write (after names only); null for none */
  res: Resonance | null;
  /** the stamp it began under: its name ("Tiny win", "#rain") and id; null for none */
  began: { name: string; id: string } | null;
  /** the id the began-under stamp tilts by (the pool letter's, else the thread's) */
  letterId: string;
  /** the letter that started it, or null (never the first reply in its place) */
  opening: ThreadMessage | null;
  /** the opening is a voice letter */
  openingVoice: boolean;
  /** its length, "0:35" */
  openingDuration: string;
  /** the opening's line limit (five, six in a roomier Letter font) */
  openingLines: number;
  /** a kindred's she/he mark and star sign with VoiceOver's words (lib/stranger-who kindredMarks);
      null or absent for none. Read only once names are traded: the mark is a kindred's to see */
  marks?: { mark: "she" | "he" | null; markLabel: string; sign: string | null; signLabel: string } | null;
  /** a frosted window is known for this pen pal (identity on) */
  hasFrost: boolean;
  /** the ⋯ has someone to report */
  canReport: boolean;
  /** the signature can be held for Report / Block */
  holdable: boolean;
  /** FIRST MET AS: the courier name or old number they wore; null for none */
  firstMet: string | null;
};

export type KindredPageView = {
  state: KKindredPageState;
  title: string;
  /** VoiceOver for the ⋯; "" draws no ⋯ */
  moreLabel: string;
  face: { shape: KKindredPageFaceShape; mask: number };
  person: KKindredPagePerson;
  signed: KKindredPageSigned;
  learned: KKindredPageLearned;
  resonance: KKindredPageResonance;
  facts: KKindredPageFact[];
  opening: KKindredPageOpening;
  /** TALK TO {NAME}; "" for no door */
  talk: string;
};

const NO_PERSON: KKindredPagePerson = { revealed: false, heading: "", mark: "", sign: "", headingA11y: "", sub: "", arrival: "", arrivalMask: 0 };
const NO_SIGNED: KKindredPageSigned = {
  show: false,
  label: "",
  name: "",
  typedUpright: false,
  a11y: "",
  hint: "",
  holdable: false,
  path: "",
  boxW: PEN_W,
  boxH: PEN_H,
  baselineY: PEN_BASELINE * PEN_H,
  met: "",
};
const NO_LEARNED: KKindredPageLearned = { show: false, label: "", moments: "", dims: [], sealedLabel: "", sealed: "" };
const NO_RESONANCE: KKindredPageResonance = { show: false, label: "", score: "", rows: [], close: "", far: "" };
const NO_OPENING: KKindredPageOpening = { show: false, label: "", voice: false, duration: "", body: "", lines: 5, who: "" };

function stateOf(detail: ThreadDetail | null, status: ThreadDetailStatus): KKindredPageState {
  if (detail) return "ready";
  if (status === "offline") return "offline";
  if (status === "missing") return "missing";
  return "loading";
}

/** The face's shape, as the React Native page picks it: a kindred round, a closed account the
    veil (the flat tile with the identity switch on), a pen pal their window when one is known,
    else their mosaic, developing with their letters. */
function faceShape(d: ThreadDetail, identity: boolean, hasFrost: boolean): KKindredPageFaceShape {
  const k = faceKind(d);
  if (k === "round") return "round";
  if (k === "veil") return identity ? "tile" : "veil";
  return hasFrost ? "frost" : "mosaic";
}

/** Every word on the page, in its place. */
export function buildKindredPageView(i: KindredPageInput, c: KindredPageCopy): KindredPageView {
  const { detail: d, read, res, identity } = i;
  const { t, locale } = c;
  const state = stateOf(d, i.status);
  if (!d) {
    return {
      state,
      title: "",
      moreLabel: i.canReport ? t("rp.menu.a11y") : "",
      face: { shape: "veil", mask: 0 },
      person: NO_PERSON,
      signed: NO_SIGNED,
      learned: NO_LEARNED,
      resonance: NO_RESONANCE,
      facts: [],
      opening: NO_OPENING,
      talk: "",
    };
  }

  const name = d.otherName || t("cm.kindred");
  const shape = faceShape(d, identity, i.hasFrost);

  /* who they are: their name once traded; before, what their writing has told you */
  const arche = read?.archetype?.id ?? null;
  const person: KKindredPagePerson = d.revealed
    ? {
        revealed: true,
        heading: name,
        // a kindred's she/he mark and star sign after the name (never once their account is gone)
        mark: (!d.gone && i.marks?.mark) || "",
        sign: (!d.gone && i.marks?.sign) || "",
        headingA11y: d.gone || !i.marks ? "" : [name, i.marks.markLabel, i.marks.signLabel].filter(Boolean).join(", "),
        sub: "",
        arrival: showsArrivalMosaic(d, identity) ? t("kd.faceArrive") : "",
        arrivalMask: showsArrivalMosaic(d, identity) ? mosaicMask(d.other, 1) : 0,
      }
    : {
        revealed: false,
        mark: "",
        sign: "",
        headingA11y: "",
        heading: arche ? c.archName(arche) : t("kd.stillVoice"),
        sub: arche ? c.archDescThird(arche) : t("kd.notEnough"),
        arrival: "",
        arrivalMask: 0,
      };

  /* THE NAME THEY SIGNED (identity Phase 2): their drawing, or the typed name */
  let signed = NO_SIGNED;
  if (identity && d.revealed) {
    const drawn = penOrNull(d.otherSig);
    signed = {
      ...NO_SIGNED,
      show: true,
      label: t("id2.kd.signed"),
      name,
      typedUpright: penTypedUpright(name),
      a11y: t(drawn ? "id2.kd.drawnA11y" : "id2.kd.typedA11y", { pen: name }),
      hint: i.holdable ? t("id2.kd.holdHint") : "",
      holdable: i.holdable,
      path: drawn ? penPath(drawn) : "",
      met: i.firstMet ? t("id2.kd.firstMet", { name: i.firstMet }) : "",
    };
  }

  /* WHAT THEIR LETTERS HAVE TOLD YOU, the rest sealed under KEEP WRITING */
  const learned: KKindredPageLearned = read?.found.length
    ? {
        show: true,
        label: t("kd.learned"),
        moments: t(read.moments === 1 ? "kd.momentsOne" : "kd.momentsMany", { n: String(read.moments) }),
        dims: read.found.map((x) => ({ key: x.key, label: c.dimLabel(x.key).toUpperCase(), score: x.score, line: c.dimLineThird(x) })),
        sealedLabel: read.sealed.length > 0 ? t("kd.keepWriting") : "",
        sealed: read.sealed
          .slice(0, 4)
          .map((x) => `□ ${c.dimSealedThird(x.key).toLocaleLowerCase(locale)}`)
          .join("   "),
      }
    : NO_LEARNED;

  /* THE RESONANCE MAP: hollow is you, solid is them */
  const resonance: KKindredPageResonance = res
    ? {
        show: true,
        label: t("kd.howAlike"),
        score: `${res.score}%`,
        rows: res.rows.map((r) => ({
          key: r.key,
          label: c.dimLabel(r.key).toLocaleUpperCase(locale),
          mine: r.mine,
          theirs: r.theirs,
          together: r.together,
          a11y: t("kd.resA11y", { label: c.dimLabel(r.key), mine: Math.round(r.mine), theirs: Math.round(r.theirs) }) + (r.together ? `, ${t("kd.resTogether")}` : ""),
        })),
        close: res.closest ? t("kd.resClose", { label: c.dimLabel(res.closest.key).toLocaleLowerCase(locale) }) : "",
        far: res.furthest ? t("kd.resFar", { label: c.dimLabel(res.furthest.key) }) : "",
      }
    : NO_RESONANCE;

  /* the correspondence, as facts */
  const facts: KKindredPageFact[] = [];
  if (d.since) facts.push({ key: "since", label: t("kd.since"), value: c.dayLong(d.since), stamp: "", letterId: "" });
  facts.push({ key: "letters", label: t("kd.letters"), value: lettersValue(d, t), stamp: "", letterId: "" });
  facts.push({ key: "began", label: t("kd.beganUnder"), value: i.began ? i.began.name : "—", stamp: i.began?.id ?? "", letterId: i.began ? i.letterId : "" });

  /* the letter that started it */
  const o = i.opening;
  const opening: KKindredPageOpening = o
    ? {
        show: true,
        label: t("kd.whereBegan"),
        voice: i.openingVoice,
        duration: i.openingVoice ? i.openingDuration : "",
        body: o.body || "",
        lines: i.openingLines,
        who: whoBegan(d, name, t, locale, identity),
      }
    : NO_OPENING;

  return {
    state,
    title: pageTitle(d, t),
    moreLabel: i.canReport ? t("rp.menu.a11y") : "",
    face: { shape, mask: shape === "mosaic" ? mosaicMask(d.other, developFor(d.otherCount)) : 0 },
    person,
    signed,
    learned,
    resonance,
    facts,
    opening,
    talk: canTalk(d, i.status) ? t("kd.talkTo", { name }) : "",
  };
}
