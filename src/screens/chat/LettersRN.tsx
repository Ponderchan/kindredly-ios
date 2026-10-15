import { useEffect, useMemo, useRef } from "react";
import { KeyboardAvoidingView, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { archNameThird } from "../../lib/aura-copy";
import { blurThen } from "../../lib/keyboard";
import { useRenderWindow } from "../../lib/render-window";
import { Introduction } from "../../components/Introduction";
import { LeaveSheet } from "../../components/LeaveSheet";
import { ReplyStrip, type ReplyStripHandle } from "../../components/10a";
import "../../data/strings-step5-platform"; // vo.play, vo.pause
import { buildLetterItems, buildLettersDock, lettersComposer, windowItems } from "./build-items";
import { useLettersModel } from "./useLettersModel";
import type { ChatUi } from "./useRoomModel";
import { ChatHeader } from "./ChatHeader";
import { ReachBand } from "./ReachBand";
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

   · the shared React Native header (ChatHeader: the face developing with
     THEIR letters, a square mosaic for a pen pal and the veil for a gone
     one, the state in its tone — ACCOUNT CLOSED for a gone pen pal, never
     a turn that can't be taken) and the reach band under it (both sides'
     five cells and the one line of who still owes what; none once their
     account is gone);
   · light-outline letter blocks in the reader's Letter font, a tap opening
     the reader on THAT letter, a long press its menu (copy; theirs
     translate and report — a posted letter is posted: no take back, no
     quoting);
   · the dock: the sign door above the status line, the slow note in the
     dock instead of a toast under the keyboard (spec bug 8), the 10a reply
     strip with the plane key and Return-to-send, or the gone line where it
     was.

   The correspondence, seen from Kindreds: a slow chat. The other person's
   face develops in the header with every letter THEY send. Two lenses on
   one correspondence: this is the relationship, the reader is the letter. */

/** The fallback's window: grows by 80 toward the top and never slides. */
const RN_WINDOW = { initial: 80, step: 80, anchor: "end" as const };

export function LettersRN(props: { id?: string; topInset?: number } = {}) {
  useLang();
  const params = useLocalSearchParams<{ id: string }>();
  const id = props.id ?? params.id;
  const router = useRouter();
  const { t: tk, key: themeKey } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const keyboard = useKeyboardRN();
  const lang = getLang();

  const strip = useRef<ReplyStripHandle>(null);
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
          strip.current?.focus();
        }, delayMs);
        timers.current.add(timer);
      },
      seedText: (target, value) => {
        if (target === "body") strip.current?.setText(value);
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
        revealed: !!detail?.revealed,
        gone: !!detail?.gone,
        missing: m.status === "missing",
        myCount: detail?.myCount ?? 0,
        iSigned: !!detail?.iSigned,
        theirSigned: !!detail?.theirSigned,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.name, detail?.revealed, detail?.gone, m.status, detail?.myCount, detail?.iSigned, detail?.theirSigned, lang],
  );
  const open = dock.terminal === "none";
  // the correspondence closed with the keyboard up (their account went, a block): let go
  useEffect(() => {
    if (!open) strip.current?.blur();
  }, [open]);

  const env: RowEnv = {
    width: winW - 32,
    classic: themeKey === "classic",
    strings: { goToQuote: t("mm.goToQuote"), translating: t("mm.translating"), photoOpen: t("ph.open") },
    onItemPress: (key, part) => (part === "voice" ? opening.toggle() : m.onItemPress(key, part)),
    onItemAction: m.onItemAction,
    photoOf: () => ({ path: null, uri: null }),
    voice: opening,
  };

  /** the strip's send: exactly the words it held; the field empties at once and the model puts
      them back if the letter didn't go */
  const onStripSend = (value: string): boolean | void => {
    const clears = lettersComposer({ t, text: value, sending: m.sending, slow: false }).clearOnSend;
    void m.onSend(value, undefined, clears);
    return clears ? undefined : false;
  };

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
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
        onBeforeSheet={() => strip.current?.blur()}
      />
      {/* THE ONE THRESHOLD, SAID ON THE PAGE — both sides of it (owner, 2026-10-10); none once
          names are traded or their account is gone (spec bug 6) */}
      {detail && !detail.revealed && !detail.gone ? <ReachBand myCount={detail.myCount} otherCount={detail.otherCount} other={detail.other || null} /> : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView {...list.listProps} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
          {items.map((item) => (
            <LetterRowRN key={item.key} item={item} lit={list.lit === item.key} env={env} onLayout={list.rowLayout(item.key)} />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 12, paddingBottom: keyboard.up ? 10 : Math.max(10, insets.bottom), backgroundColor: tk.bg }}>
          <DockAbove dock={dock} status={m.composer.status} statusAlarm={m.composer.statusAlarm} onDock={m.onDock} />
          {/* write — unless there is no longer anyone at the other end. 0009 nulls their side when
              an account is deleted; the correspondence stays open to read and stops being somewhere
              you can write */}
          {dock.terminal !== "none" ? (
            <GoneLine text={dock.goneText} />
          ) : (
            <ReplyStrip
              ref={strip}
              /* before names it is a letter you are composing; after, a person you are talking to */
              placeholder={dock.placeholder}
              canSend={m.composer.canSend}
              onSend={onStripSend}
              onChangeText={m.setText}
              initialText={m.text}
              sendLabel={dock.sendLabel}
              style={{ paddingRight: 4, paddingBottom: 4 }}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <LeaveSheet
        open={m.askSign}
        modal
        title={t("ch.sign.title")}
        body={t("ch.sign.body", { name: m.auth.handle || t("ch.sign.fallback") })}
        actions={[{ label: m.signing ? "…" : t("ch.sign.confirm"), kind: "primary", onPress: () => void m.onSign() }]}
        cancelLabel={t("ch.sign.cancel")}
        onCancel={() => !m.signing && m.setAskSign(false)}
      />

      <Introduction
        open={m.ceremony}
        wren={m.wren}
        otherSeed={detail?.other || "anon"}
        otherFace={detail?.otherFace ?? null}
        otherName={detail?.otherName || t("cm.kindred")}
        otherArchetype={m.read?.archetype ? archNameThird(m.read.archetype.id) : null}
        myName={m.myName}
        road={m.road}
        mySeed={m.auth.user?.id || "me"}
        myFace={(m.auth.profile?.avatarId as string) || null}
        notice={m.kindredNotice}
        since={m.since}
        stamp={detail?.stamp ?? null}
        onClose={() => m.setCeremony(false)}
        onTalk={() => {
          m.setCeremony(false);
          router.replace(`/room/${id}`);
        }}
      />
    </View>
  );
}
