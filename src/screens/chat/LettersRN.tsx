import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { getLang, hasString, t, useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { blurThen } from "../../lib/keyboard";
import { useRenderWindow } from "../../lib/render-window";
import { LettersIntroduction } from "./LettersIntroduction";
import { LeaveSheet } from "../../components/LeaveSheet";
import { SignSheet } from "./SignSheet";
import { ReportSheet } from "../../components/ReportMenu";
import { useReportFlow } from "../../lib/report-flow";
import { BAR_ABOVE_KEYBOARD, REPLY_BAR, ReplyBar, type ReplyBarHandle } from "../../components/10a";
import "../../data/strings-step5-platform"; // vo.play, vo.pause, cmp.emoji
import type { KChatHeader } from "../../../modules/kindredly-ui/src/Conversation";
import { buildLetterItems, buildLettersDock, lettersHeader, windowItems } from "./build-items";
import { useLettersModel } from "./useLettersModel";
import type { ChatUi } from "./useRoomModel";
import { ChatHeader } from "./ChatHeader";
import { ConversationHeaderRN } from "./ConversationHeaderRN";
import { LetterRowRN, type RowEnv } from "./ChatRowsRN";
import { DockAbove, GoneLine } from "./ChatDockRN";
import { useChatListRN } from "./useChatListRN";
import { useKeyboardRN } from "./useKeyboardRN";
import { useOpeningVoiceRN } from "./VoiceOpeningRN";

/* THE PEN-PAL CHAT IN REACT NATIVE — the fallback behind the remote switch
   (10a step 5). When app_surfaces turns 'chat' off, a binary has no
   KConversationView, or the Swift path fails, chat/[id] draws this. It runs
   on exactly what the SwiftUI chat runs on — the model (useLettersModel:
   offline-safe, optimistic letters under a client key, the sign door, the
   introduction, the reader opened by message id, a block landing on
   Kindreds), the pure builders (buildLetterItems, buildLettersDock,
   lettersComposer), the render window and follow rule (useChatListRN), the
   one voice player for a voice opening (known bug 2) — and draws the same
   10a look on the theme:

   · the chat composers' A2 (owner's final, 2026-10-18), as the SwiftUI
     chat draws it: before names, the header with the face developing with
     THEIR letters (FACE v1, the veil for a gone pen pal), No. 5422, LETTER
     3 OF 5 · THEIRS (whose letter is owed; past the letters the state in
     its tone, ACCOUNT CLOSED for a gone one) and the five dots, its ⋯
     opening the report card (ConversationHeaderRN on build-items
     lettersHeader). They say what the reach band said, with the reply
     bar's hint, so the band is not drawn any more. With the identity
     switch on (identity Phase 1) the same header shows their frosted
     window instead, never developing, and the courier name with the ♀/♂
     mark and the star sign after it; the letter cards' heads read LETTER 3
     · SUNDAY KITE and the reply bar writes back to that name (the model's
     `who`, lib/who). A revealed thread seen here keeps the older
     ChatHeader;
   · the letter cards (head line, the words in the reader's Letter font,
     the time; the day as a day rule), a tap opening the reader on THAT
     letter, a long press its menu (copy; theirs translate and report — a
     posted letter is posted: no take back, no quoting);
   · the dock: the sign door above the status line, the slow note in the
     dock instead of a toast under the keyboard (spec bug 8), the reply bar
     (ReplyBar: the reply arrow, the field, the emoji key, the send disc;
     Return sends) 16 from either edge and 12 over the keyboard, with its
     hint over it while it has the keyboard (LETTER 4 OF 5, LETTER 5 OF 5 ·
     ONE MORE AND NAMES, build-items lettersHint) — or the gone line where
     it was.

   The correspondence, seen from Kindreds: a slow chat. The other person's
   face develops in the header with every letter THEY send. Two lenses on
   one correspondence: this is the relationship, the reader is the letter. */

/** The fallback's window: grows by 80 toward the top and never slides. */
const RN_WINDOW = { initial: 80, step: 80, anchor: "end" as const };

export function LettersRN(props: { id?: string; topInset?: number } = {}) {
  useLang();
  const params = useLocalSearchParams<{ id: string }>();
  const id = props.id ?? params.id;
  const { t: tk, key: themeKey } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const keyboard = useKeyboardRN();
  const lang = getLang();

  const bar = useRef<ReplyBarHandle>(null);
  /* the bar has the keyboard: its hint shows */
  const [focused, setFocused] = useState(false);
  const listRef = useRef<{ requestEnd: (animated: boolean, delayMs: number) => void; jumpTo: (key: string) => void } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );
  /* how the model reaches this screen's field and list */
  const ui = useMemo<ChatUi>(
    () => ({
      focus: (target, delayMs) => {
        if (target !== "body") return;
        const timer = setTimeout(() => {
          timers.current.delete(timer);
          bar.current?.focus();
        }, delayMs);
        timers.current.add(timer);
      },
      seedText: (target, value) => {
        if (target === "body") bar.current?.setText(value);
      },
      scrollToEnd: (animated, delayMs) => listRef.current?.requestEnd(animated, delayMs),
      jumpTo: (key) => listRef.current?.jumpTo(key),
      thenModal: (fn) => blurThen(fn),
    }),
    [],
  );
  const m = useLettersModel(id, { ui });
  const detail = m.detail;
  const opening = useOpeningVoiceRN(detail, m.isDemo);

  const built = useMemo(
    () =>
      buildLetterItems(m.conv, {
        ...m.menuCtx,
        locale: m.locale,
        day: m.dayLabel,
        time: m.timeLabel,
        name: m.name,
        keyOf: m.keyOf,
        photoOf: () => null,
        voice: opening.voice,
        // the A2 cards: a head line in each, the day as a day rule
        cards: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.conv, m.menuCtx, m.name, m.keyOf, opening.voice, lang],
  );
  const win = useRenderWindow(built.length, RN_WINDOW);
  const items = useMemo(() => windowItems(built, win.start, win.end, "letters"), [built, win.start, win.end]);
  const list = useChatListRN(items, built, win);
  listRef.current = { requestEnd: list.requestEnd, jumpTo: list.jumpTo };

  const dock = useMemo(
    () =>
      buildLettersDock({
        t,
        name: m.name,
        identity: m.identity,
        has: hasString,
        revealed: !!detail?.revealed,
        gone: !!detail?.gone,
        missing: m.status === "missing",
        myCount: detail?.myCount ?? 0,
        otherCount: detail?.otherCount ?? 0,
        iSigned: !!detail?.iSigned,
        theirSigned: !!detail?.theirSigned,
        locale: m.locale,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.name, m.identity, detail?.revealed, detail?.gone, m.status, detail?.myCount, detail?.otherCount, detail?.iSigned, detail?.theirSigned, lang],
  );

  /* the A2 header while names aren't traded (and while the thread loads); a revealed thread seen
     here keeps ChatHeader. Its ⋯ starts the report flow, whose card drops just under it */
  const a2 = !detail?.revealed;
  const report = useReportFlow({ context: "thread", targetUser: detail?.gone ? undefined : detail?.other || undefined, refId: id, snapshot: m.theirLatest, onBlocked: m.onBlocked });
  const header = useMemo<KChatHeader | null>(
    () =>
      a2
        ? lettersHeader({
            t,
            locale: m.locale,
            name: m.name,
            who: m.who,
            other: detail?.other || null,
            myCount: detail?.myCount ?? 0,
            otherCount: detail?.otherCount ?? 0,
            theirSigned: !!detail?.theirSigned,
            state: m.state,
            canOpenPage: m.canOpenPage,
            canReport: !report.nobody,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a2, m.name, m.who, detail?.other, detail?.myCount, detail?.otherCount, detail?.theirSigned, m.state, m.canOpenPage, report.nobody, lang],
  );
  const headerTop = props.topInset ?? insets.top;
  const open = dock.terminal === "none";
  // the correspondence closed with the keyboard up (their account went, a block): let go
  useEffect(() => {
    if (!open) bar.current?.blur();
  }, [open]);

  const env: RowEnv = {
    width: winW - 32,
    classic: themeKey === "classic",
    strings: { goToQuote: t("mm.goToQuote"), translating: t("mm.translating"), photoOpen: t("ph.open") },
    onItemPress: (key, part) => (part === "voice" ? opening.toggle() : m.onItemPress(key, part)),
    onItemAction: m.onItemAction,
    photoOf: () => ({ path: null, uri: null }),
    voice: opening,
    a11yRef: list.a11yRef,
  };

  /** the bar's send: exactly the words it held. The React Native bar never empties itself (it
      returns false): the model empties the field synchronously when it takes the letter — before
      its first await — puts the words back if the letter didn't go, and leaves them alone when it
      refuses (no thread loaded yet, offline with nothing kept, one already going). A self-clear
      would run after a synchronous refusal had put them back, and wipe them: the letter lost with
      no word said (Swift's field clears first and gets them back after; the bar's order is the
      other way round). */
  const onBarSend = (value: string): boolean => {
    void m.onSend(value, undefined, false);
    return false;
  };

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      {header ? (
        <ConversationHeaderRN
          model={header}
          topInset={headerTop}
          onBack={m.goBack}
          onPage={m.openPage}
          // the keyboard goes first, then the card drops from the ⋯
          onMore={() => ui.thenModal(() => report.openMenu())}
        />
      ) : (
        <ChatHeader
          variant="letters"
          detail={detail}
          name={m.name}
          state={m.state}
          wren={m.wren}
          threadId={id}
          snapshot={m.theirLatest}
          canOpenPage={m.canOpenPage}
          topInset={props.topInset}
          onBack={m.goBack}
          onOpenPage={m.openPage}
          onBlocked={m.onBlocked}
          onBeforeSheet={() => bar.current?.blur()}
        />
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView {...list.listProps} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
          {items.map((item, i) => (
            <LetterRowRN key={item.key} item={item} first={i === 0} lit={list.lit === item.key} env={env} onLayout={list.rowLayout(item.key)} />
          ))}
        </ScrollView>

        {/* the bar rides the keyboard 12 above it; the home indicator's inset (at least 10) below it at rest */}
        <View style={{ paddingHorizontal: 12, paddingBottom: keyboard.up ? BAR_ABOVE_KEYBOARD : Math.max(10, insets.bottom), backgroundColor: tk.bg }}>
          <DockAbove
            dock={dock}
            status={m.composer.status}
            statusAlarm={m.composer.statusAlarm}
            onDock={m.onDock}
            // identity on: the door opens the signing sheet, and VoiceOver says so
            signHint={m.identity ? t("id2.door.hint") : undefined}
          />
          {/* write — unless there is no longer anyone at the other end. 0009 nulls their side when
              an account is deleted; the correspondence stays open to read and stops being somewhere
              you can write */}
          {dock.terminal !== "none" ? (
            <GoneLine text={dock.goneText} />
          ) : (
            <ReplyBar
              ref={bar}
              /* before names you write back; after, a person you are talking to */
              placeholder={dock.placeholder}
              hint={dock.hint}
              showsHint={focused}
              canSend={m.composer.canSend}
              onSend={onBarSend}
              onChangeText={m.setText}
              initialText={m.text}
              sendLabel={dock.sendLabel}
              emojiLabel={dock.emojiLabel}
              inputProps={{ autoCapitalize: dock.autocapitalize ? "sentences" : "none" }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              // 16 from either edge (the dock's 12 and 4 more); the bar's hard shadow hangs 2 right and below
              style={{ marginHorizontal: 4, marginBottom: REPLY_BAR.shadow }}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* the A2 header's ⋯: the card drops just under it */}
      {header ? <ReportSheet flow={report} top={headerTop + 62} /> : null}
      {/* the door's sheet: identity on, the signing sheet (the face, the pen name, the signature);
          off, today's ENCLOSE IT confirmation */}
      {m.identity ? (
        <SignSheet m={m} />
      ) : (
        <LeaveSheet
          open={m.askSign}
          modal
          title={t("ch.sign.title")}
          body={t("ch.sign.body", { name: m.auth.handle || t("ch.sign.fallback") })}
          actions={[{ label: m.signing ? "…" : t("ch.sign.confirm"), kind: "primary", onPress: () => void m.onSign() }]}
          cancelLabel={t("ch.sign.cancel")}
          onCancel={() => !m.signing && m.setAskSign(false)}
        />
      )}

      <LettersIntroduction m={m} />
    </View>
  );
}
