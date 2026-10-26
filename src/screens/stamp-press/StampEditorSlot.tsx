import { markFcThreshold } from "../../lib/fc-rollout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { isKindredlyUIViewAvailable, useKCommands, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KStampEditView, type KStampEditPhase, type KStampEditStrings, type KStampEditSubmit } from "../../../modules/kindredly-ui/src/StampEdit";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { defaultName } from "../../lib/default-name";
import { MOOD_CATEGORIES, sname } from "../../data/stamps";
import {
  DEFAULT_CATEGORY,
  FREE_STAMPS,
  checkStamp,
  fetchStampQuota,
  filtersFor,
  freeOrdinal,
  isCategory,
  isFilter,
  isStoredFilter,
  nearestFilter,
  keepOriginal,
  keepPicture,
  keepsDraft,
  normalizeTopic,
  notePressed,
  phaseFor,
  planOf,
  recolourStamp,
  removeDraft,
  saveDraft,
  type CheckOutcome,
  type PressCategory,
  type PressDraft,
  type RejectReason,
  type StampPlan,
  type StampQuota,
  type StoredFilter,
} from "../../lib/stamp-press";
import { forgetReview, pressInReview, reviewOf } from "../../lib/custom-stamps";
import type { KPressedPhoto } from "./StampPressNative";
import "../../data/strings-stamps2";

/* THE STAMP PRESS EDIT PAGE (build agent B "edit", 2026-10-19). Build agent A's seam: the
   /stamp-press route draws the camera until a photo is pressed, then this, in the same route, so
   Retake is a state change and never a navigation:

     photo     the pressed photo: a file:// JPEG, 1200 × 1600 (3:4), upright, unfiltered, no EXIF
               (Caches/stamp-press/)
     from      where the flow began: "me" | "compose" | "album" | ""
     onRetake  back to the camera (the photo is dropped)
     onClose   leave the whole flow
     editing   (optional) an approved stamp being changed (First Class / Cofounder; src/app/
               stamp-edit.tsx): its id, words, colour and filter, and the picture to start from
               (the original kept on this phone → the filter can change; else the stamp's own
               picture → only the name and the colour can)

   Swift (KStampEditView) draws the page, keeps the #topic / colour / filter while they're being
   chosen, renders the filters and makes the JPEG; this file resolves the words, sends the stamp to
   stamp-check (lib/stamp-press checkStamp) and turns the answer into the page's phase:
     approved     the original is kept for later filter changes, Me is told (notePressed: the
                  "new" sticker and the ready bar), Swift plays "yours ✦" and the flight, then
                  onFlown leaves
     rejected     the reject card (contact: the prototype's words; the name: Edit the name;
                  anything else in the picture: Try another photo). Costs nothing.
     unavailable  503 / offline: kept as a local draft (lib/stamp-press saveDraft), the card says
                  so; Try again sends it again
     quota        Free has made its three (402): the gold door to First Class
     cap / problem  the silent limit, a suspension, a lost session or a broken picture
   Moderation is the server's alone (lead's correction 2): nothing here judges the words.

   IN REVIEW (owner, 2026-10-20: "邮票太慢了 要不先加候审"). A NEW stamp is put in the album the
   moment it is pressed (lib/custom-stamps pressInReview, which also runs the check and keeps the
   picture, the original, the draft and the "new" signal itself, whether or not this page is still
   open). The page waits HANDOFF_MS for the answer: in time, it lands as above (a refusal seen
   here leaves the album again); later, the page lets go — the sticker reads "in review", the
   stamp flies to the album as an approved one would, and the answer lands there (approved →
   the usual "new" sticker and ready bar; refused → "didn't pass" in the album). Edits of an
   approved stamp still wait for their answer here (the stamp is already in the album).

   DEV ONLY (no server needed): name the stamp "dev ok", "dev no", "dev name", "dev full",
   "dev cap" or "dev wait" and the answer is made up here instead of asking (approved, a rejected
   picture, a rejected name, the free quota, the cap, unavailable); "dev slow" and "dev slow no"
   answer after 5 s (approved / a rejected picture), past the hand-off. Ignored in release. */

/** how long a new stamp's page waits for the check before it hands the stamp to the album */
const HANDOFF_MS = 2000;

export type StampEditorProps = {
  photo: KPressedPhoto;
  from: string;
  onRetake: () => void;
  onClose: () => void;
  editing?: { id: string; topic: string; category: string; filter: string; original: string | null; image: string | null } | null;
};

type Files = KStampEditSubmit;

const DEV_ANSWERS: Record<string, () => CheckOutcome> = {
  "dev ok": () => ({
    kind: "approved",
    plan: null,
    stamp: { id: devUuid(), topic: "dev ok", category: DEFAULT_CATEGORY, filter: "original", gold: false, imagePath: null, version: 1, createdAt: new Date().toISOString() },
  }),
  "dev no": () => ({ kind: "rejected", reason: "nudity", field: "image", plan: null }),
  "dev name": () => ({ kind: "rejected", reason: "contact", field: "topic", plan: null }),
  "dev full": () => ({ kind: "quota", plan: "free" }),
  "dev cap": () => ({ kind: "cap" }),
  "dev wait": () => ({ kind: "unavailable" }),
  "dev slow": () => ({
    kind: "approved",
    plan: null,
    stamp: { id: devUuid(), topic: "dev slow", category: DEFAULT_CATEGORY, filter: "original", gold: false, imagePath: null, version: 1, createdAt: new Date().toISOString() },
  }),
  "dev slow no": () => ({ kind: "rejected", reason: "nudity", field: "image", plan: null }),
};
const devDelay = (topic: string) => (topic.startsWith("dev slow") ? 5000 : 1600);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function devUuid(): string {
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`;
}

function rejectWords(reason: RejectReason): string {
  if (reason === "contact") return t("cs2.chk.contact");
  if (reason === "words") return t("cs2.ed.rejWords");
  return t("cs2.chk.other");
}

/** "OCT 19" in the reader's language, for the letter card's meta line */
function cardDate(lang: string): string {
  try {
    return new Date().toLocaleDateString(lang === "pt" ? "pt-BR" : lang, { month: "short", day: "numeric" }).toUpperCase();
  } catch {
    return "";
  }
}

export function StampEditorSlot({ photo, onRetake, onClose, editing = null }: StampEditorProps) {
  const router = useRouter();
  const lang = useLang();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const screen = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const { user } = useAuth();
  const ent = useEntitlement();

  const [quota, setQuota] = useState<StampQuota | null>(null);
  const [serverPlan, setServerPlan] = useState<StampPlan | null>(null);
  // a 402 "filter" answer: the server sees a lower plan than the phone (a purchase not yet
  // through the webhook); it wins until the next refresh
  const [forced, setForced] = useState<StampPlan | null>(null);
  const [phase, setPhase] = useState<KStampEditPhase>("editing");
  const [reject, setReject] = useState<{ reason: RejectReason; field: "image" | "topic" } | null>(null);
  const [problem, setProblem] = useState<"suspended" | "auth" | "broken" | "editFc" | null>(null);
  const [draft, setDraft] = useState<PressDraft | null>(null);
  const [draftFailed, setDraftFailed] = useState(false);
  const [seed, setSeed] = useState(1);
  // the check outlived HANDOFF_MS: the stamp went to the album "in review"
  const [handedOff, setHandedOff] = useState(false);
  /** this page's stamp in review (its local uuid), kept across Try again / a new photo */
  const job = useRef<string | null>(null);
  const last = useRef<Files | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // the quota (and the plan the server sees) on open and on every return (after the paywall)
  useFocusEffect(
    useCallback(() => {
      let mine = true;
      void fetchStampQuota().then((q) => {
        if (!mine) return;
        setQuota(q);
        if (q) setServerPlan(q.plan);
        setForced(null);
      });
      return () => {
        mine = false;
      };
    }, []),
  );

  // a purchase moves the entitlement: let it win over an older server answer until asked again
  const entPlan = planOf({ premium: ent.premium, cofounder: ent.cofounder });
  const plan: StampPlan = forced ?? (serverPlan && rank(serverPlan) > rank(entPlan) ? serverPlan : entPlan);
  const gold = plan === "cofounder" || !!quota?.gold;
  const original = editing ? editing.original : null;
  const filterEditable = !editing || !!original;
  const startPhoto = editing ? original ?? editing.image ?? "" : photo.uri;

  const insets = useMemo(() => ({ top: screen.top, bottom: screen.bottom, tabBarRoom: 0 }), [screen.top, screen.bottom]);

  // the six mood categories' colours (the seasonal one is not a photo stamp's colour)
  const categories = useMemo(() => MOOD_CATEGORIES.map((c) => ({ id: c.id, hex: c.color, name: sname(c.name) })), [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const filters = useMemo(() => filtersFor(plan).map((f) => ({ id: f.id, name: t(`cs2.ed.f.${f.id}`), locked: f.locked })), [plan, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const meName = useMemo(() => (user?.id ? defaultName(user.id, lang) : null), [user?.id, lang]);
  const ordinal = freeOrdinal(plan, quota ? quota.made : null, !!editing);

  const strings = useMemo<KStampEditStrings>(() => {
    const card = cardFor(phase, problem, draftFailed);
    return {
      title: editing ? t("cs2.ed.titleEdit") : t("cs2.ed.title"),
      retake: editing ? t("cs2.al.cancel") : t("cs2.ed.retake"),
      eyebrow: t("cs2.ed.preview"),
      cardMeta: [cardDate(lang), (meName ?? "").toUpperCase()].filter(Boolean).join(" · "),
      firstLine: t("cs2.ed.sample"),
      topicPlaceholder: t("cs2.ed.topicPh"),
      topicLabel: t("cs2.ed.a11yTopic"),
      aurasClose: t("ld.close").toUpperCase(),
      colourLabel: t("cs2.ed.a11yColours"),
      filterLabel: t("cs2.ed.a11yFilters"),
      submit: editing ? t("cs2.ed.save") : t("cs2.ed.done"),
      checking: t("cs2.chk.checking"),
      keepFC: t("cs2.ed.keepFc"),
      fcRibbon: t("cs2.ed.fcRibbon"),
      fcBadge: t("cs2.ed.fcBadge"),
      lockedHint: t("cs2.ed.a11yFilterFc"),
      freeLine: ordinal ? t("cs2.ed.quota", { n: ordinal, cap: FREE_STAMPS }) : "",
      // no "in review" on the sticker either (owner, 2026-10-20); VoiceOver still says it is being checked
      yours: t("cs2.done.sticker"),
      stampLabel: t("cs2.ed.a11yStampNow"),
      holdHint: t("cs2.ed.a11yHold"),
      selected: "",
      rejectBody: reject ? rejectWords(reject.reason) : "",
      rejectRetry: reject && reject.field === "image" ? t("cs2.chk.tryPhoto") : "",
      rejectRename: reject && (reject.field === "topic" || reject.reason === "contact") ? t("cs2.chk.editName") : "",
      cardTitle: card.title,
      cardBody: card.body,
      cardPrimary: card.primary,
      cardSecondary: card.secondary,
      announce:
        phase === "approved" ? (handedOff ? t("cs2.done.a11yInReview") : t("cs2.chk.a11yPassed")) : phase === "rejected" && reject ? `${t("cs2.chk.a11yFailed")} ${rejectWords(reject.reason)}` : card.body,
    };
  }, [phase, problem, draftFailed, reject, editing, lang, meName, ordinal, handedOff]);

  /* ── the answer → the page ── */

  /** viaJob: a new stamp, whose picture, original, draft and signal pressInReview already took
      care of; the page only shows the answer */
  const land = useCallback(
    async (out: CheckOutcome, files: Files, viaJob = false) => {
      if (!alive.current) return;
      if ("plan" in out && out.plan) setServerPlan(out.plan);
      if (out.kind === "approved") {
        if (!viaJob) {
          if (files.original && !editing) await keepOriginal(out.stamp.id, files.original);
          if (files.image) await keepPicture(out.stamp.id.toLowerCase(), files.image);
          if (draft) await removeDraft(draft.id);
          notePressed(out.stamp);
        }
        setReject(null);
        setPhase("approved");
        return;
      }
      if (out.kind === "rejected") {
        // seen here: it needn't wait in the album too (pressing again puts it back)
        if (viaJob && job.current) forgetReview(`c:${job.current}`);
        setReject({ reason: out.reason, field: out.field });
        setPhase("rejected");
        return;
      }
      if (viaJob) {
        if (keepsDraft(out)) setDraftFailed(!(job.current && reviewOf(`c:${job.current}`)));
      } else if (keepsDraft(out) && !editing) {
        const kept = draft ?? (await saveDraft({ image: files.image, topic: files.topic, category: files.category as PressCategory, filter: files.filter as StoredFilter }));
        if (!alive.current) return;
        setDraft(kept);
        setDraftFailed(!kept);
      }
      if (out.kind === "edit") {
        setProblem("editFc");
        setPhase("quota");
        return;
      }
      if (out.kind === "filter") {
        // the server sees a lower plan than the phone did: back to editing, the filter now locked
        setForced(out.plan ?? "free");
        setPhase("editing");
        return;
      }
      if (out.kind === "suspended") setProblem("suspended");
      else if (out.kind === "auth") setProblem("auth");
      else if (out.kind === "bad" || out.kind === "not_found") setProblem("broken");
      else setProblem(null);
      setPhase(phaseFor(out) as KStampEditPhase);
    },
    [draft, editing],
  );

  const send = useCallback(
    async (files: Files) => {
      if (busy.current) return;
      busy.current = true;
      last.current = files;
      setPhase("checking");
      setReject(null);
      setProblem(null);
      const topic = normalizeTopic(files.topic);
      const category: PressCategory = isCategory(files.category) ? files.category : DEFAULT_CATEGORY;
      // a rename of a stamp whose picture can't be re-filtered sends its own filter back, old ones too
      const filter: StoredFilter = editing && !filterEditable && isStoredFilter(editing.filter) ? editing.filter : isFilter(files.filter) ? files.filter : "original";
      try {
        const dev = __DEV__ ? DEV_ANSWERS[topic.toLowerCase()] : undefined;
        if (!editing) {
          // a new stamp: in the album at once, checked on its own; the page waits a moment
          const j = pressInReview({
            uuid: job.current ?? undefined,
            image: files.image,
            original: files.original || null,
            topic,
            category,
            filter,
            gold,
            answer: dev ? () => sleep(devDelay(topic.toLowerCase())).then(dev) : undefined,
          });
          job.current = j.uuid;
          const first = await Promise.race([j.done, sleep(HANDOFF_MS).then(() => null)]);
          if (!alive.current) return;
          if (first === null) {
            setHandedOff(true);
            setPhase("approved"); // the flight to the album, the sticker reading "in review"
            return;
          }
          await land(first, files, true);
          return;
        }
        // an edit of an approved stamp: the answer is waited for here
        let out: CheckOutcome;
        if (dev) {
          await sleep(1600);
          out = dev();
        } else {
          const imageChanged = filterEditable && filter !== editing.filter;
          const topicChanged = topic !== normalizeTopic(editing.topic);
          const colourChanged = category !== editing.category;
          if (!imageChanged && !topicChanged) {
            const okColour = !colourChanged || (await recolourStamp(editing.id, category));
            out = okColour
              ? { kind: "approved", plan: null, stamp: { id: editing.id, topic, category, filter, gold, imagePath: null, version: 1, createdAt: null } }
              : { kind: "unavailable" };
          } else {
            out = await checkStamp({ image: imageChanged ? files.image : null, topic, category, filter, replace: editing.id });
            if (out.kind === "approved" && colourChanged) await recolourStamp(editing.id, category);
          }
        }
        await land(out, files);
      } finally {
        busy.current = false;
      }
    },
    [editing, filterEditable, gold, land],
  );

  /* ── the page's taps ── */

  const upgrade = useCallback(() => {
    // a First Class gate touched: the Post's letter may come early (lib/fc-rollout)
    void markFcThreshold();
    router.push("/paywall?src=stamp_filter");
  }, [router]);

  const cardPrimary = useCallback(() => {
    if (phase === "quota") return upgrade();
    if (phase === "problem" && problem === "broken") return onRetake();
    onClose();
  }, [phase, problem, upgrade, onRetake, onClose]);

  const cardSecondary = useCallback(() => {
    if (phase === "unavailable" && last.current) {
      const files = draft ? { ...last.current, image: draft.image } : last.current;
      void send(files);
      return;
    }
    if (phase === "quota") {
      setProblem(null);
      setPhase("editing");
      return;
    }
    onClose();
  }, [phase, draft, send, onClose]);

  const reset = useCallback(() => {
    setReject(null);
    setPhase("editing");
  }, []);

  const retake = useCallback(() => {
    if (editing) return onClose();
    onRetake();
  }, [editing, onClose, onRetake]);

  const exportFailed = useCallback(() => {
    setProblem("broken");
    setPhase("problem");
  }, []);

  // a new photo (Retake → press again) starts the page over
  const photoKey = editing ? `edit:${editing.id}` : photo.uri;
  const seen = useRef(photoKey);
  useEffect(() => {
    if (seen.current === photoKey) return;
    seen.current = photoKey;
    setSeed((n) => n + 1);
    setPhase("editing");
    setReject(null);
    setProblem(null);
    setDraft(null);
    setDraftFailed(false);
    setHandedOff(false);
  }, [photoKey]);

  const available = isKindredlyUIViewAvailable("KStampEditView");
  useEffect(() => {
    if (!available) console.log("[stamp-press] this binary has no KStampEditView; the edit page can't open");
  }, [available]);
  if (!available) return <View style={{ flex: 1 }} />;

  return (
    <SurfaceHost field>
      <KStampEditView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={seed}
        strings={strings}
        categories={categories}
        filters={filters}
        filterEditable={filterEditable}
        gold={gold}
        editing={!!editing}
        phase={phase}
        rejectField={reject?.field ?? "image"}
        seed={seed}
        photo={startPhoto}
        topic={editing ? editing.topic : ""}
        category={editing && isCategory(editing.category) ? editing.category : DEFAULT_CATEGORY}
        // a stamp whose original isn't here starts from its own (already filtered) picture: shown as it is
        // (an old look from 2026-10-19 starts on the nearest of today's)
        filter={editing && filterEditable ? nearestFilter(editing.filter) : "original"}
        onRetake={retake}
        onSubmit={(s) => void send(s)}
        onUpgrade={upgrade}
        onReset={reset}
        onFlown={onClose}
        onCardPrimary={cardPrimary}
        onCardSecondary={cardSecondary}
        onExportFailed={exportFailed}
      />
    </SurfaceHost>
  );

  function cardFor(p: KStampEditPhase, why: typeof problem, notKept: boolean): { title: string; body: string; primary: string; secondary: string } {
    switch (p) {
      case "unavailable":
        return { title: t("cs2.ed.later"), body: notKept ? t("cs2.ed.notKept") : t("cs2.chk.unavailable"), primary: t("cs2.ed.ok"), secondary: t("cs2.ed.tryAgain") };
      case "quota":
        return why === "editFc"
          ? { title: "", body: t("cs2.al.editFc"), primary: t("cs2.me.fullCta"), secondary: t("cs2.me.notNow") }
          : { title: t("cs2.me.fullTitle", { cap: FREE_STAMPS }), body: t("cs2.me.fullSub"), primary: t("cs2.me.fullCta"), secondary: t("cs2.me.notNow") };
      case "cap":
        return { title: "", body: t("cs2.chk.cap"), primary: t("cs2.ed.ok"), secondary: "" };
      case "problem":
        if (why === "suspended") return { title: "", body: t("cs2.ed.suspended"), primary: t("cs2.ed.ok"), secondary: "" };
        if (why === "auth") return { title: "", body: t("cs2.ed.signIn"), primary: t("cs2.ed.ok"), secondary: "" };
        return { title: "", body: t("cs2.ed.broken"), primary: t("cs2.chk.tryPhoto"), secondary: t("cs2.al.cancel") };
      default:
        return { title: "", body: "", primary: "", secondary: "" };
    }
  }
}

function rank(p: StampPlan): number {
  return p === "cofounder" ? 2 : p === "first" ? 1 : 0;
}
