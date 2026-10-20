import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { getLang, sourceTag, t } from "../../lib/i18n";
import { localeTag, penPalName, postmark } from "../../lib/format";
import { useWhoBook } from "../../lib/who";
import { sendThreadMessage, theirLatest } from "../../lib/db";
import { chatSeenRule, useThreadDetail } from "../../lib/thread-detail";
import { threadState } from "../../lib/thread-state";
import { guessLatin, offerTranslate } from "../../lib/lang-guess";
import { translate } from "../../lib/wren";
import { useWrenName } from "../../lib/wren-name";
import { alertFail } from "../../lib/fail";
import { blurThen } from "../../lib/keyboard";
import { useReportFlow } from "../../lib/report-flow";
import { refreshFingerprint } from "../../lib/aura";
import { noteWrote } from "../../lib/local-push";
import { getStamp } from "../../data/stamps";
import { useMemberStamps } from "../../lib/member-marks";
import { isCustomStampId, tagOf, useCustomStamps } from "../../lib/custom-stamps";
import {
  canWriteHere,
  closedLine,
  correspondentWho,
  heroIndex,
  heroTier,
  isUnsigned,
  letterDate,
  letterLinkKey,
  offersTranslate,
  readerLetters,
  readerTitle,
  replyHint,
  replyCanSend,
  type ReaderFormat,
} from "./reader";

/* THE ONE-LETTER READER'S MODEL (thread/[id]), shared by both renderers:
   the React Native ReaderScreen (the remote switch's fallback) and the
   SwiftUI ReaderNative (KReaderView, the "reader" surface). Everything the
   reader reads, decides and sends lives here, as it used to live in
   ReaderScreen: the thread (useThreadDetail, offline-safe), the hero (the
   letter tapped: ?m=, ?i=), who wrote it (the identity book), the thread's
   state, the stamp and its #topic, the translation of the hero (translated
   once, then toggled), the report / block flow (a block lands on Kindreds),
   and the reply (plain: it goes, then the thread reloads; a demo thread
   never reaches the database).

   What stays with each renderer: how it draws (the face, the stamp, the
   card), where the report card drops from (each measures its own ⋯), the
   one voice player for a voice opening, and its own field (the RN strip,
   the Swift reply bar), which `send` empties through `clear` once the
   letter has gone. */

/** Their language for the capsule: a non-Latin script by its own name, else the Latin guess;
    null when neither is confident (the capsule shows its words alone). */
export function letterLang(body: string): string | null {
  const script = sourceTag(body, "xx");
  if (script !== "XX") return script;
  const latin = guessLatin(body);
  return latin ? latin.toUpperCase() : null;
}

export type ReaderParams = { id?: string; m?: string; i?: string };

export function useReaderModel({ id, m: mParam, i: iParam }: ReaderParams) {
  const router = useRouter();
  const wren = useWrenName();
  const isDemo = __DEV__ && !!id?.startsWith("demo-");

  // the room marks seen when you enter it; a pen pal's letters are marked once names are traded
  const { detail, status, reload, mutate } = useThreadDetail(id, { folds: false, markSeen: chatSeenRule });
  const conv = useMemo(() => readerLetters(detail), [detail]);
  const heroIdx = heroIndex(conv, { m: mParam, i: iParam });
  const hero = heroIdx >= 0 ? conv[heroIdx] : null;
  const heroKey = hero ? letterLinkKey(hero) || `i:${heroIdx}` : "";
  const earlier = conv.filter((_, k) => k !== heroIdx);

  /* who wrote it (lib/who): switch off, their number; on, the courier name, and their ♀/♂ and
     star sign asked for (reader correspondentWho) */
  const who = useWhoBook({ uids: detail && !detail.revealed ? [detail.other] : [] });
  const lang = getLang();
  const fmt: ReaderFormat = useMemo(
    () => ({ t, locale: localeTag(), postmark, penPal: (other: string) => penPalName(other, { upper: true, compact: true }), who }),
    // a language change re-renders (the screens call useLang); the locale and t() are read fresh with it
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, who],
  );
  const state = detail
    ? threadState({
        mine: detail.myCount,
        theirs: detail.otherCount,
        revealed: detail.revealed,
        lastSenderMe: !detail.messages.length || !!detail.messages[detail.messages.length - 1]?.mine,
        iSigned: detail.iSigned,
        theirSigned: detail.theirSigned,
        gone: isUnsigned(detail),
      })
    : null;

  const stamp = getStamp(detail?.stamp);
  /* a photo stamp ("c:<uuid>", custom stamps): drawn by Stamp itself; its #topic on its colour */
  const customId = isCustomStampId(detail?.stamp) ? (detail?.stamp as string) : null;
  const custom = useCustomStamps(customId ? [customId] : [])(customId ?? "");
  const customTag = custom ? tagOf(custom) : "";
  /* the line a kept or reported photo stamp leaves for a moment (the toast) */
  const [stampLine, setStampLine] = useState("");
  useEffect(() => {
    if (!stampLine) return;
    const tm = setTimeout(() => setStampLine(""), 2600);
    return () => clearTimeout(tm);
  }, [stampLine]);

  /* ── translation of the hero: translated once, then toggled ── */
  const [xl, setXl] = useState<{ key: string; text: string } | null>(null);
  const [xlOn, setXlOn] = useState(false);
  const [xlBusy, setXlBusy] = useState(false);
  const translated = !!xl && xl.key === heroKey && xlOn;
  const shown = hero ? (translated && xl ? xl.text : hero.body) : "";
  const tier = heroTier(shown);
  const offerXl = offersTranslate(hero, detail, offerTranslate);
  const doTranslate = async () => {
    if (!hero) return;
    if (xl && xl.key === heroKey) {
      setXlOn((v) => !v);
      return;
    }
    if (xlBusy) return;
    setXlBusy(true);
    const out = await translate(hero.body, getLang());
    setXlBusy(false);
    if (out) {
      setXl({ key: heroKey, text: out });
      setXlOn(true);
    } else blurThen(() => Alert.alert(t("th.noTransTitle", { wren }), t("th.noTransBody")));
  };

  /* ── report / block: the ··· in the letter's head; a block lands on Kindreds ── */
  const flow = useReportFlow({
    context: "thread",
    targetUser: detail && !isUnsigned(detail) ? detail.other : undefined,
    refId: id,
    snapshot: theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening),
    onBlocked: () => router.replace("/(tabs)/kindreds"),
  });

  /* ── the reply ── */
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const canWrite = canWriteHere(detail, status);
  const closed = closedLine(detail, status, t);
  const hint = replyHint(text, !!detail?.revealed, t, who.identity);
  /** Sends the reply's words; `clear` empties the renderer's field once they went. Always
      answers false: the reader's send is plain, the words stay until the letter went. */
  const send = (value: string, clear: () => void): boolean => {
    const body = value.trim();
    if (!id || !detail || sending || !canWrite || !replyCanSend(value, false)) return false;
    void (async () => {
      setSending(true);
      if (isDemo) {
        // a demo thread never reaches the database: the reply lands on the page only
        mutate((d) => ({ ...d, myCount: d.myCount + 1, messages: [...d.messages, { id: `demo-r${Date.now()}`, body, mine: true, date: new Date().toISOString() }] }));
        setSending(false);
        clear();
        setText("");
        return;
      }
      const res = await sendThreadMessage(id, body);
      setSending(false);
      if (!res) {
        // the words stay in the field to send again
        blurThen(() => alertFail(t("th.fail.title"), t("th.fail.body"), { context: "thread" }));
        return;
      }
      clear();
      setText("");
      void refreshFingerprint();
      void noteWrote("letter");
      await reload();
    })();
    return false;
  };

  const goBack = () => blurThen(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds")), undefined, { delayMs: 0 });

  // switch on, a pen pal (or no one) as the book gives them; null off, and for a kindred
  const pal = who.identity ? correspondentWho(detail, fmt) : null;
  /* a member's face is a gold perforated stamp (C2); never a closed account */
  const stampUid = detail && !detail.gone && !isUnsigned(detail) ? detail.other || null : null;
  const memberStamp = useMemberStamps([stampUid])(stampUid);
  const heroDate = hero && detail ? letterDate(hero, detail, fmt) : "";
  const title = detail ? readerTitle(conv.length, t) : "";

  return {
    id,
    isDemo,
    detail,
    status,
    conv,
    hero,
    heroKey,
    earlier,
    who,
    fmt,
    state,
    stamp,
    customId,
    custom,
    customTag,
    stampLine,
    setStampLine,
    translated,
    shown,
    tier,
    offerXl,
    xlBusy,
    doTranslate,
    flow,
    text,
    setText,
    sending,
    canWrite,
    closed,
    hint,
    send,
    goBack,
    pal,
    memberStamp,
    heroDate,
    title,
  };
}

export type ReaderModel = ReturnType<typeof useReaderModel>;
