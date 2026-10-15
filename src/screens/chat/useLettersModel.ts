import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { localeTag, penPalName, time24 } from "../../lib/format";
import { reportContent, sendThreadMessage, signThread, theirLatest, type ThreadMessage } from "../../lib/db";
import { chatSeenRule, useThreadDetail } from "../../lib/thread-detail";
import { copyText } from "../../lib/clipboard";
import { offerTranslate } from "../../lib/lang-guess";
import { track } from "../../lib/track";
import { refreshFingerprint } from "../../lib/aura";
import { noteWrote } from "../../lib/local-push";
import { threadState } from "../../lib/thread-state";
import { useAuth } from "../../lib/auth";
import { useWrenName } from "../../lib/wren-name";
import { alertFail } from "../../lib/fail";
import { useSlow } from "../../components/ui";
import type { KChatPart } from "../../../modules/kindredly-ui/src/Conversation";
import { conversation, isOpening, lettersComposer, type ComposerFacts, type MenuCtx } from "./build-items";
import { introduceOnce, noteDayLabel, useCeremony, useCorrespondentRead, usePendingLines, useTakeBackClock, useTranslations, type ChatUi } from "./useRoomModel";
import "../../data/strings-step5-chat";

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

   Before names these are letters, not chat: copy, translate, report — no
   taking back (a posted letter is posted) and no quoting (a letter is
   answered whole). */

export function useLettersModel(id: string | undefined, { ui }: { ui: ChatUi }) {
  useLang();
  const router = useRouter();
  const wren = useWrenName();
  const auth = useAuth();
  const isDemo = !!id?.startsWith("demo-");

  const lines = usePendingLines();
  const { detail, status, reload } = useThreadDetail(id, { folds: false, markSeen: chatSeenRule, pending: lines.pending });
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
  const [signing, setSigning] = useState(false);
  const { trans, translateLine, hideTranslation } = useTranslations(ui, wren);

  const read = useCorrespondentRead(detail);
  const { ceremony, setCeremony, road, kindredNotice } = useCeremony(id, detail, status, { recentOnly: false });

  /* a deleted correspondent has no number to show: every one of them would otherwise collapse
     onto the same No. (penPalName reads ld.unsigned for them) */
  const name = detail?.revealed ? detail.otherName || t("cm.kindred") : detail ? penPalName(detail.other) : "…";
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
  const menuCtx: MenuCtx = useMemo(
    () => ({ t, isDemo, otherExists: !!detail?.other, nowMs, skewMs: 0, trans, canTranslate: offerTranslate }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDemo, detail?.other, nowMs, trans, getLang()],
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
      await introduceOnce(id, () => setCeremony(true));
    }
  }, [id, isDemo, signing, reload, setCeremony]);

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
      else if (action === "report") void reportLetter(m);
    },
    [translateLine, hideTranslation, reportLetter],
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

  const onDock = useCallback(
    (action: string) => {
      if (action === "sign") ui.thenModal(() => setAskSign(true));
    },
    [ui],
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
    /** the reader's own name for the introduction, or a lower-case "you" in their language */
    myName: auth.handle || t("in.meFallback"),
    /** the day the names met (0020 revealed_at), not today */
    since: detail?.revealedAt ?? new Date().toISOString(),
    theirLatest: theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening),
  };
}

export type LettersModel = ReturnType<typeof useLettersModel>;
