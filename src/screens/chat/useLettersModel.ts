import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { localeTag, time24 } from "../../lib/format";
import { developFor } from "../../lib/mosaic";
import { useWhoBook } from "../../lib/who";
import { lastWriteFail, reportContent, sendThreadMessage, signThread, signThreadV2, theirLatest, type PenSignature, type ThreadMessage } from "../../lib/db";
import { chatSeenRule, useThreadDetail } from "../../lib/thread-detail";
import { copyText } from "../../lib/clipboard";
import { saveToLore } from "../../lib/lore";
import { sheetWords } from "../../components/sheet-chrome";
import { offerTranslate } from "../../lib/lang-guess";
import { track } from "../../lib/track";
import { armRatingAsk } from "../../lib/rating-ask";
import { refreshFingerprint } from "../../lib/aura";
import { noteWrote } from "../../lib/local-push";
import { threadState } from "../../lib/thread-state";
import { useAuth } from "../../lib/auth";
import { checkField } from "../edit-profile/edit-profile-model";
import { isReservedName } from "../../lib/wren-name";
import { useWrenName } from "../../lib/wren-name";
import { alertFail, isRefusal } from "../../lib/fail";
import { useSlow } from "../../components/ui";
import type { KChatPart } from "../../../modules/kindredly-ui/src/Conversation";
import { conversation, isOpening, keptLetterWho, lettersComposer, type ComposerFacts, type MenuCtx } from "./build-items";
import { introduceOnce, noteDayLabel, useCeremony, useCorrespondentRead, usePendingLines, useTakeBackClock, useTranslations, type ChatUi } from "./useRoomModel";
import { afterSign, demoSignResult, nameToSave, setSignDemo, signDemo, type SignOutcome } from "./sign-sheet";
import { penFaceOrNull } from "../../lib/pen-signature";
import "../../data/strings-step5-chat";
import "../../data/strings-identity2";

/* THE PEN-PAL CHAT, AS A MODEL (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   Everything chat/[id].tsx used to do except draw: the correspondence on
   screen (useThreadDetail — cache first, offline-safe; marked seen only
   once names are traded, with the same counter the Kindreds badge reads),
   the letter composer (optimistic, with a client key that survives the
   echo), the sign door and the introduction ceremony, translations and
   reports, the header's state and the reader opened on a tapped letter.
   The SwiftUI conversation (ConversationNative) and the React Native
   fallback (LettersRN) both sit on it.

   Before names these are letters, not chat: copy, translate, keep, report — no
   taking back (a posted letter is posted) and no quoting (a letter is
   answered whole).

   KEEP A LETTER (owner's audit, 2026-11-10): a long press keeps a letter in
   lore, theirs or the reader's own, exactly as a kindred's room keeps a
   line: the same question (rm.keep.*), the same local shelf (lib/lore),
   filed under the name the reader knows them by at that moment (their No.,
   or the courier name with the identity switch on; "You" for the reader's
   own letter). build-items letterMenu says why it was added. */

/* how long a sheet's transparent window takes to go before another window (an alert, the
   ceremony's page sheet) may rise in its place */
const SHEET_GONE_MS = 350;

export function useLettersModel(id: string | undefined, { ui }: { ui: ChatUi }) {
  useLang();
  const router = useRouter();
  const wren = useWrenName();
  const auth = useAuth();
  const isDemo = !!id?.startsWith("demo-");

  const lines = usePendingLines();
  const { detail: loaded, status, reload } = useThreadDetail(id, { folds: false, markSeen: chatSeenRule, pending: lines.pending });
  /* A DEMO SIGNATURE THAT WAITS (identity Phase 2, dev pages): a demo thread is read from its
     fixture again on every reload, so the signing sheet's first signature on one is kept here and
     laid over it — the door reads YOU SIGNED · WAITING, as a real thread's would from its row */
  const [demoSigned, setDemoSigned] = useState(false);
  const detail = useMemo(
    () => (loaded && demoSigned && !loaded.iSigned && !loaded.revealed ? { ...loaded, iSigned: true } : loaded),
    [loaded, demoSigned],
  );
  const detailRef = useRef(detail);
  detailRef.current = detail;
  useEffect(() => {
    if (status !== "ok" || !detail) return;
    const ids = new Set<string>();
    for (const m of detail.messages) if (m.id && !lines.keys.current.has(m)) ids.add(m.id);
    lines.prune(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, status]);

  const [text, setTextState] = useState("");
  const textRef = useRef("");
  const setText = useCallback((v: string) => {
    textRef.current = v;
    setTextState(v);
  }, []);
  const putText = useCallback(
    (v: string) => {
      textRef.current = v;
      setTextState(v);
      ui.seedText("body", v);
    },
    [ui],
  );
  const [sending, setSendingState] = useState(false);
  const sendingRef = useRef(false);
  const setSending = (v: boolean) => {
    sendingRef.current = v;
    setSendingState(v);
  };
  const slow = useSlow(sending);
  const [askSign, setAskSign] = useState(false);
  const [signing, setSigningState] = useState(false);
  const signingRef = useRef(false);
  const setSigning = (v: boolean) => {
    signingRef.current = v;
    setSigningState(v);
  };
  /* WHAT I JUST SIGNED WITH (identity Phase 2): the signing sheet sets it once sign_thread (or a
     demo) accepted it, so the ceremony can show my own name, face and drawing before the reload
     brings the published row (detail.mySignedName / mySignedFace / mySig) — and on a demo thread,
     which never reaches the server, instead of it. Null until a signature lands here. */
  const [signedNow, setSignedNow] = useState<PenSignature | null>(null);
  const { trans, translateLine, hideTranslation } = useTranslations(ui, wren);

  const read = useCorrespondentRead(detail);
  const { ceremony, setCeremony, road, kindredNotice } = useCeremony(id, detail, status, { recentOnly: false });

  /* WHO THEY ARE before names (lib/who): switch off, their No. and the mosaic as far as their
     letters have carried it; on, the courier name the reader's list gives them, the frost, and
     their ♀/♂ and star sign once the identity client answers. A deleted correspondent has no
     number to show: every one of them would otherwise collapse onto the same No. (the book
     reads ld.unsigned for them, either way) */
  const book = useWhoBook({ uids: detail && !detail.revealed ? [detail.other] : [] });
  const pal = useMemo(
    () => (detail && !detail.revealed ? book.who(detail.other, { develop: developFor(detail.otherCount) }) : null),
    [book, detail],
  );
  const name = detail?.revealed ? detail.otherName || t("cm.kindred") : pal ? pal.name : "…";
  // read when a kept letter is filed (the name as it reads at that moment)
  const nameRef = useRef(name);
  nameRef.current = name;
  /* the same sentence the list row shows — and ACCOUNT CLOSED for a gone pen pal, never a turn
     that can't be taken (spec bug 6) */
  const state = useMemo(
    () =>
      detail
        ? threadState({
            mine: detail.myCount,
            theirs: detail.otherCount,
            revealed: detail.revealed,
            lastSenderMe: !detail.messages.length || !!detail.messages[detail.messages.length - 1]?.mine,
            iSigned: detail.iSigned,
            theirSigned: detail.theirSigned,
            gone: detail.gone,
          })
        : null,
    // the label is a t() string: a language change re-renders (useLang) and recomputes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, getLang()],
  );

  const conv = useMemo(() => conversation(detail), [detail]);
  const composer: ComposerFacts = lettersComposer({ t, text, sending, slow, offline: status === "offline" && !detail });

  const nowMs = useTakeBackClock(undefined, 0);
  /* readable, not actionable: a gone pen pal or a thread the server calls missing (letters have no
     reply in their menus anyway; the rule is the room's, kept the same here) */
  const canWrite = !detail?.gone && status !== "missing";
  const menuCtx: MenuCtx = useMemo(
    () => ({ t, isDemo, otherExists: !!detail?.other, nowMs, skewMs: 0, trans, canTranslate: offerTranslate, canWrite }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDemo, detail?.other, nowMs, trans, canWrite, getLang()],
  );

  /** OPTIMISTIC — the same contract as the room: the letter appears as you release it; a failure
      drops the ghost and hands your words back. Swift hands over the words it held and whether its
      field emptied itself; the React Native field calls it bare. */
  const onSend = useCallback(
    async (typed?: string, _prompt?: string, cleared = false) => {
      const rawText = typed ?? textRef.current;
      const body = rawText.trim();
      const refuse = () => {
        if (cleared) putText(rawText);
      };
      if (!id || !detailRef.current || sendingRef.current) return refuse();
      if (!lettersComposer({ t, text: rawText, sending: false, slow: false }).canSend) return refuse();
      setSending(true);
      if (cleared) {
        textRef.current = "";
        setTextState("");
      } else putText("");
      const sentAt = new Date().toISOString();
      const line: ThreadMessage = { id: isDemo ? `demo-c${Date.now()}` : undefined, body, mine: true, date: sentAt };
      lines.add(line);
      ui.scrollToEnd(true, 40);
      if (isDemo) {
        setSending(false);
        return;
      }
      const res = await sendThreadMessage(id, body);
      setSending(false);
      if (!res) {
        lines.drop(line);
        putText(rawText);
        void reload();
        ui.thenModal(() => alertFail(t("th.fail.title"), t("th.fail.body"), { context: "thread" }));
        return;
      }
      if (res.id) {
        const echoed = !!detailRef.current?.messages.some((m) => m.id === res.id && !lines.keys.current.has(m));
        lines.settle(line, res.id, res.createdAt, echoed);
      }
      void refreshFingerprint();
      void noteWrote("letter");
      // the realtime echo of our own INSERT reloads and reconciles
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, isDemo, ui, putText, reload, lines.add, lines.drop, lines.settle],
  );

  /** Enclose my name. Whoever signs second completes the reveal and gets the introduction on the
      spot; the first signer gets it when the reveal reaches them (useCeremony, room or chat). */
  const onSign = useCallback(async () => {
    if (!id || signing) return;
    setSigning(true);
    const res = isDemo ? { revealed: true } : await signThread(id);
    setSigning(false);
    setAskSign(false);
    if (!res) {
      alertFail(t("ch.name.fail.title"), t("ch.name.fail.body"), { context: "thread" });
      return;
    }
    await reload();
    if (res.revealed) {
      track("kindred_made");
      if (!isDemo) armRatingAsk("kindred");
      await introduceOnce(id, () => setCeremony(true));
    }
  }, [id, isDemo, signing, reload, setCeremony]);

  /** THE SIGNING SHEET'S SEND (identity on; PHASE2.md §6.3; the rules are sign-sheet.ts). The pen
      name goes to the profile first when it changed (a failure stops there and the sheet stays
      as drawn); then sign_thread through signThreadV2, which falls back to the old direct write
      — typed name and face, no drawing — on a server without 0035. A failure is said plainly and
      the sheet keeps the name, the face and the drawing; a refusal (the thread has gone) closes
      it. The second signature holds the ceremony here and now; the first leaves the door at YOU
      SIGNED · WAITING. A demo thread never reaches the server or the account: it answers itself,
      and its pen name goes to the dev pages' demo mode instead of the profile. onSign (the switch
      off) is untouched. */
  const onSignSheet = useCallback(
    async (s: PenSignature): Promise<SignOutcome> => {
      const d = detailRef.current;
      if (!id || !d || signingRef.current) return "kept";
      const name = s.name.trim();
      setSigning(true);
      const demo = isDemo ? signDemo() : null;
      const save = nameToSave(name, demo ? demo.handle : auth.handle);
      if (save && demo) setSignDemo({ ...demo, handle: save });
      else if (save && !isDemo) {
        const saved = await auth.saveProfile({ handle: save });
        if ("error" in saved) {
          setSigning(false);
          Alert.alert(t("set.cantSave"), t("set.push.saveFail"));
          return "kept";
        }
      }
      const res = isDemo ? demoSignResult(!!d.theirSigned) : await signThreadV2(id, { name, face: s.face, sig: s.sig });
      setSigning(false);
      const next = afterSign(res, !res && isRefusal(lastWriteFail()));
      const fail = () => alertFail(t("ch.name.fail.title"), t("ch.name.fail.body"), { context: "thread" });
      if (next.outcome === "kept") {
        fail();
        return "kept";
      }
      if (next.outcome === "closed") {
        // the sheet's window goes first: an alert raised on it would go with it
        setAskSign(false);
        setTimeout(fail, SHEET_GONE_MS);
        return "closed";
      }
      // what actually travelled: the old direct write (a server without 0035) takes no drawing
      setSignedNow({ name, face: penFaceOrNull(s.face), sig: res?.via === "direct" ? null : s.sig });
      setAskSign(false);
      if (isDemo && next.waiting) setDemoSigned(true);
      await reload();
      if (next.ceremony) {
        // a demo's reveal is not a kindred made: never counted in the real events table
        if (!isDemo) {
          track("kindred_made");
          armRatingAsk("kindred");
        }
        // the sheet's window is dismissed before the ceremony's rises (two at once can drop the second)
        await new Promise((r) => setTimeout(r, SHEET_GONE_MS));
        // a demo plays it every time (the dev pages are run again and again); a real thread once
        if (isDemo) setCeremony(true);
        else await introduceOnce(id, () => setCeremony(true));
      }
      return "signed";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, isDemo, auth.handle, auth.saveProfile, reload, setCeremony],
  );

  const reportLetter = useCallback(
    async (m: ThreadMessage) => {
      const ok = await reportContent({ targetUser: detailRef.current?.other ?? null, context: "message", refId: m.id ?? null, reason: "other", snapshot: m.body });
      ui.thenModal(() => {
        if (ok) Alert.alert(t("rp.reportedTitle"), t("rp.reportedBody", { wren }));
        else Alert.alert(t("rp.failed"), t("rp.failedBody"));
      });
    },
    [ui, wren],
  );

  /* long-press keeps a letter in your lore, as a kindred's room keeps a line (useRoomModel keep):
     asked once, saved on this phone only */
  const keep = useCallback(
    (m: ThreadMessage) => {
      const who = keptLetterWho(m, nameRef.current, t("mm.you"));
      ui.thenModal(() =>
        Alert.alert(t("rm.keep.title"), t("rm.keep.body"), [
          { text: sheetWords(t("set.neverMind")), style: "cancel" },
          {
            text: t("rm.keep.do"),
            onPress: () => {
              if (id) void saveToLore({ threadId: id, who, body: m.body, prompt: null, said: m.date });
            },
          },
        ]),
      );
    },
    [id, ui],
  );

  const targets = useMemo(() => {
    const map = new Map<string, { msg: ThreadMessage; index: number }>();
    conv.forEach((m, index) => map.set(lines.keyOf(m), { msg: m, index }));
    return map;
  }, [conv, lines.keyOf]);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  const onItemAction = useCallback(
    (key: string, action: string) => {
      const target = targetsRef.current.get(key);
      if (!target) return;
      const m = target.msg;
      if (action === "copy") void copyText(m.body);
      else if (action === "translate") void translateLine(key, m.body);
      else if (action === "original") hideTranslation(key);
      else if (action === "keep") keep(m);
      else if (action === "report") void reportLetter(m);
    },
    [translateLine, hideTranslation, keep, reportLetter],
  );

  /** A tapped letter opens the reader on THAT letter: by its id (or "opening"), with the index as
      the fallback a reader built before ?m= still reads. */
  const openLetter = useCallback(
    (key: string) => {
      const target = targetsRef.current.get(key);
      if (!target || !id) return;
      const m = target.msg;
      const mKey = m.id ?? (isOpening(m) ? "opening" : "");
      ui.thenModal(() => router.push(`/thread/${id}?${mKey ? `m=${encodeURIComponent(mKey)}&` : ""}i=${target.index}`));
    },
    [id, router, ui],
  );

  const onItemPress = useCallback(
    (key: string, part: KChatPart) => {
      if (part === "body") openLetter(key);
    },
    [openLetter],
  );

  /* SEND THEM YOUR NAME WITH NO PEN NAME YET — THE SWITCH OFF ONLY. The new onboarding no longer
     asks for one (it is chosen at the first trade; with the identity switch on, the signing sheet
     asks for it, beside the drawn signature, and this prompt never shows), and the
     pen name never falls back to the account's legal name any more (lib/auth). So the first trade
     asks for it right here, with the same rules as Edit profile's field (checkField), saves it to
     the profile, and only then shows the usual confirmation, which names it. iOS's own text
     prompt keeps it in place, in the chat, in the reader's language. */
  const askPenNameThenSign = useCallback(() => {
    Alert.prompt(
      t("set.penPrompt.title"),
      t("set.penPrompt.body"),
      [
        { text: t("ml.cancel"), style: "cancel" },
        {
          text: t("ep.save"),
          onPress: async (raw?: string) => {
            const r = checkField("pen", raw ?? "", "", isReservedName);
            if (!r.save) return;
            const res = await auth.saveProfile({ handle: r.value });
            if ("error" in res) {
              Alert.alert(t("set.cantSave"), t("set.push.saveFail"));
              return;
            }
            ui.thenModal(() => setAskSign(true));
          },
        },
      ],
      "plain-text",
    );
  }, [auth, ui]);

  /* the door's press: switch on, the signing sheet (the pen name, the face and the signature, all
     in one place: no prompt, no ENCLOSE IT); off, exactly as before. The chat's keyboard goes first */
  const onDock = useCallback(
    (action: string) => {
      if (action !== "sign") return;
      if (book.identity) ui.thenModal(() => setAskSign(true));
      else if (!isDemo && !auth.handle.trim()) ui.thenModal(askPenNameThenSign);
      else ui.thenModal(() => setAskSign(true));
    },
    [ui, auth.handle, isDemo, askPenNameThenSign, book.identity],
  );

  const goBack = useCallback(() => ui.thenModal(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds"))), [ui, router]);
  /* the room opens once you know their voice — not only after names; a stranger still has no page */
  const canOpenPage = !!detail?.revealed || read?.stage === "recognizing";
  const openPage = useCallback(() => {
    if (canOpenPage) ui.thenModal(() => router.push(`/kindred/${id}`));
  }, [canOpenPage, ui, router, id]);
  /* after a block the thread is gone: Kindreds, never back to wherever chat was opened from (critic) */
  const onBlocked = useCallback(() => router.replace("/(tabs)/kindreds"), [router]);

  return {
    id,
    isDemo,
    detail,
    status,
    reload,
    name,
    /** the pen pal as the book gives them (name, mark, sign, face, spoken); null once names are traded or before the thread loads */
    who: pal,
    /** the identity switch (the reply bar is addressed to the courier name when on) */
    identity: book.identity,
    wren,
    auth,
    read,
    state,
    conv,
    text,
    setText,
    putText,
    trans,
    translateLine,
    hideTranslation,
    sending,
    slow,
    askSign,
    setAskSign,
    signing,
    onSign,
    /** identity on: the signing sheet's send (sign-sheet.ts afterSign says what each outcome means) */
    onSignSheet,
    /** what this reader just signed with (the sheet sets it); the ceremony prefers the published row's snapshot */
    signedNow,
    setSignedNow,
    composer,
    keyOf: lines.keyOf,
    menuCtx,
    locale: localeTag(),
    dayLabel: noteDayLabel,
    timeLabel: (iso: string) => time24(iso),
    onSend,
    onItemAction,
    onItemPress,
    openLetter,
    onDock,
    reportLetter,
    goBack,
    canOpenPage,
    openPage,
    onBlocked,
    ceremony,
    setCeremony,
    road,
    kindredNotice,
    /** the reader's own pen name for the introduction, or "" (Introduction words that case) */
    myName: auth.handle || "",
    /** the day the names met (0020 revealed_at), not today */
    since: detail?.revealedAt ?? new Date().toISOString(),
    theirLatest: theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening),
  };
}

export type LettersModel = ReturnType<typeof useLettersModel>;
