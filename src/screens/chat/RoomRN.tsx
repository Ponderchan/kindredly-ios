import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, Text, View, useWindowDimensions, type TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { scrimColor, useTheme } from "../../lib/theme";
import { MONO, PF } from "../../theme/post";
import { dLong, dShort } from "../../lib/format";
import { archNameThird } from "../../lib/aura-copy";
import { blurThen } from "../../lib/keyboard";
import { useRenderWindow } from "../../lib/render-window";
import type { ThreadMessage } from "../../lib/db";
import type { SharedSong } from "../../lib/shared-songs";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { TraceTray, traceTrayHeight, type TraceKind } from "../../components/LeaveATrace";
import { PlusGlyph } from "../../components/ComposeTray";
import { WrenBird } from "../../components/WrenBird";
import { ReplyStrip, type ReplyStripHandle } from "../../components/10a";
import "../../data/strings-step5-platform"; // vo.play, vo.pause
import { buildRoomDock, buildRoomItems, windowItems } from "./build-items";
import { useRoomModel, type ChatUi } from "./useRoomModel";
import { RoomIntroduction } from "./RoomIntroduction";
import { ChatHeader } from "./ChatHeader";
import { RoomRowRN, type RowEnv } from "./ChatRowsRN";
import { DockAbove, ExpiredCard, GoneLine, RoundTool } from "./ChatDockRN";
import { useChatListRN } from "./useChatListRN";
import { useKeyboardRN, useKeyboardTray } from "./useKeyboardRN";
import { useOpeningVoiceRN } from "./VoiceOpeningRN";

/* THE ROOM IN REACT NATIVE — the fallback behind the remote switch (10a
   step 5). When app_surfaces turns 'room' off, a binary has no
   KConversationView, or the Swift path fails, room/[id] draws this. It
   must keep working fully and look the part, so it runs on exactly what
   the SwiftUI room runs on:

   · the model (useRoomModel): the thread offline-safe (cache first; an
     offline read keeps what is painted; a thread the server calls missing
     closes in place), every send, every action, the first signer's
     ceremony, expired waiting for the entitlement;
   · the pure builders (build-items): every row's words, day rule, quote,
     menu and VoiceOver label (buildRoomItems), everything above and in
     place of the composer (buildRoomDock), whether the words may go and
     what the status line says (roomComposer) — so the two renderers can't
     drift;
   · the same render window (80, +80 near the top), the same follow rule
     (the end only while you are at it, through the keyboard, the tray and
     a growing composer too) and the same quote jump (useChatListRN);
   · the one voice player for the voice opening (known bug 2);
   · the 10a reply strip (components/10a ReplyStrip, uncontrolled — the
     words live in the field and are seeded only by the model: a clear
     after a send, the words back after a failure), with the plane key and
     Return-to-send, between the Wren tool and the +;
   · the 10a look on the theme (ChatRowsRN, ChatDockRN, the shared React
     Native ChatHeader with its 36pt back chevron and round kindred face),
     the trace tray in the keyboard's place (LeaveATrace's 10a cards; the
     two swap in one commit and the tray rises with the keyboard's timing
     or fades under Reduce Motion — useKeyboardTray).

   Room-specific rules that live in the model and are only drawn here: no
   bubbles' speaker labels and no minute times (the sides say who; the day
   is as precise as a letter has ever been), not an inbox (no typing
   indicator, read receipt or presence), a gone kindred's room readable but
   not actionable. */

/** The fallback's window: grows by 80 toward the top and never slides (a React Native list keeps
    its rows; the SwiftUI kit slides at 160 because every prop change re-sends its rows). */
const RN_WINDOW = { initial: 80, step: 80, anchor: "end" as const };

export function RoomRN(props: { id?: string; expired?: string; closing?: string; topInset?: number } = {}) {
  useLang(); // repaint on language change
  const params = useLocalSearchParams<{ id: string; expired?: string; closing?: string }>();
  const id = props.id ?? params.id;
  const { t: tk, key: themeKey } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const keyboard = useKeyboardRN();
  const lang = getLang();

  const strip = useRef<ReplyStripHandle>(null);
  const promptRef = useRef<TextInput>(null);
  const [promptSeed, setPromptSeed] = useState({ text: "", n: 0 });
  /* the list's own moves, reached by the model's ui through a ref filled below (the list needs the
     rows, which need the model) */
  const listRef = useRef<{ requestEnd: (animated: boolean, delayMs: number) => void; jumpTo: (key: string) => void } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  /* how the model reaches this screen's fields and list */
  const ui = useMemo<ChatUi>(
    () => ({
      focus: (target, delayMs) => {
        const timer = setTimeout(() => {
          timers.current.delete(timer);
          if (target === "body") strip.current?.focus();
          else promptRef.current?.focus();
        }, delayMs);
        timers.current.add(timer);
      },
      seedText: (target, value) => {
        if (target === "body") strip.current?.setText(value);
        else setPromptSeed((s) => ({ text: value, n: s.n + 1 }));
      },
      scrollToEnd: (animated, delayMs) => listRef.current?.requestEnd(animated, delayMs),
      jumpTo: (key) => listRef.current?.jumpTo(key),
      // React Native's own fields: Keyboard.dismiss reaches them (blurThen waits for it to drop)
      thenModal: (fn) => blurThen(fn),
    }),
    [],
  );
  const m = useRoomModel(id, { ui, expiredParam: props.expired ?? params.expired, closingParam: props.closing ?? params.closing });
  const detail = m.detail;
  const opening = useOpeningVoiceRN(detail, m.isDemo);

  /* each row's message, for the pictures (a moment by its storage path, a demo or a send on its
     way by its own address) */
  const msgByKey = useMemo(() => {
    const map = new Map<string, ThreadMessage>();
    for (const it of m.stream) if (it.type === "msg") map.set(m.keyOf(it.msg), it.msg);
    return map;
  }, [m.stream, m.keyOf]);
  const photoOf = useCallback(
    (key: string) => {
      const msg = msgByKey.get(key);
      return { path: msg?.mediaPath ?? null, uri: msg && !msg.mediaPath ? msg.meta?.url ?? null : null };
    },
    [msgByKey],
  );

  const built = useMemo(
    () =>
      buildRoomItems(m.stream, {
        ...m.menuCtx,
        locale: m.locale,
        day: m.dayLabel,
        name: m.name,
        keyOf: m.keyOf,
        photoOf: () => null, // drawn from the message (photoOf above), not a Swift image ref
        voice: opening.voice,
        messages: detail?.messages ?? [],
        songsCount: m.songs.length,
        lastMessage: m.conv[m.conv.length - 1] ?? null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.stream, m.menuCtx, m.name, m.keyOf, opening.voice, detail, m.songs.length, m.conv, lang],
  );
  const win = useRenderWindow(built.length, RN_WINDOW);
  const items = useMemo(() => windowItems(built, win.start, win.end, "room"), [built, win.start, win.end]);
  const list = useChatListRN(items, built, win);
  listRef.current = { requestEnd: list.requestEnd, jumpTo: list.jumpTo };

  const dock = useMemo(
    () =>
      buildRoomDock({
        t,
        locale: m.locale,
        wren: m.wren,
        name: m.name,
        closing: m.closing,
        daysLeft: m.daysLeft,
        mode: m.mode,
        replyTo: m.replyTo,
        notice: m.notice,
        gone: !!detail?.gone,
        missing: m.status === "missing",
        expired: m.expired,
        quietDays: m.quietDays,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.wren, m.name, m.closing, m.daysLeft, m.mode, m.replyTo, m.notice, detail?.gone, m.status, m.expired, m.quietDays, lang],
  );
  const open = dock.terminal === "none";

  /* the room closed (gone, missing, expired) with the keyboard up: let go, and fold the tray */
  const { setTracing } = m;
  useEffect(() => {
    if (open) return;
    strip.current?.blur();
    setTracing(false);
  }, [open, setTracing]);

  const onPart = (key: string, part: Parameters<typeof m.onItemPress>[1]) => {
    if (part === "voice") opening.toggle();
    else m.onItemPress(key, part);
  };
  const env: RowEnv = {
    width: winW - 32,
    classic: themeKey === "classic",
    strings: { goToQuote: t("mm.goToQuote"), translating: t("mm.translating"), photoOpen: t("ph.open") },
    onItemPress: onPart,
    onItemAction: m.onItemAction,
    photoOf,
    voice: opening,
    a11yRef: list.a11yRef,
  };

  /** the strip's send: exactly the words it held. The React Native strip never empties itself
      (it returns false): the model empties the field synchronously when it takes a plain line —
      before its first await — and only once a fold, a song or a bare song link went, and leaves
      the words alone when it refuses. A self-clear would run after a synchronous refusal had put
      them back, and wipe them (Swift's field clears first and gets them back after; the strip's
      order is the other way round). */
  const onStripSend = (value: string): boolean => {
    void m.onSend(value, undefined, false);
    return false;
  };

  /* the trace tray in the keyboard's place: drawn only while the keyboard is down, so the two swap
     in one commit (useKeyboardTray); the list is followed again once the tray's motion settled */
  const tray = useKeyboardTray(keyboard, m.tracing, m.setTracing, list.settleAfter);
  // choosing something to leave is not something you do mid-sentence: the tray takes the keyboard's place
  const togglePlus = () =>
    tray.toggle(() => {
      strip.current?.blur();
      promptRef.current?.blur();
    });
  /** a card: a note, a question or a song hand the keyboard to the field (the tray stays until it
      is up); the moment opens the picker, the tray going down as it does */
  const onPick = (k: TraceKind) => {
    if (k === "moment") tray.close();
    else tray.handOff();
    m.onTrace(k);
  };

  const subtitle = detail?.revealedAt ? t("rm.kindredSince", { date: dLong(detail.revealedAt).toUpperCase() }) : archNameThird(m.read?.archetype?.id);
  const trayOpen = tray.shown && open && dock.traces.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      {/* their mark, always — you are in their room */}
      <ChatHeader
        variant="room"
        detail={detail}
        name={m.name}
        subtitle={subtitle}
        wren={m.wren}
        threadId={id}
        snapshot={m.theirLatest}
        canOpenPage
        topInset={props.topInset}
        onBack={m.goBack}
        onOpenPage={m.openPage}
        onLore={m.openLore}
        onBlocked={m.onBlocked}
        onBeforeSheet={() => strip.current?.blur()}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView {...list.listProps} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
          {items.map((item, i) => (
            <RoomRowRN key={item.key} item={item} first={i === 0} lit={list.lit === item.key} env={env} onLayout={list.rowLayout(item.key)} />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 12, paddingBottom: keyboard.up || trayOpen ? 10 : Math.max(10, insets.bottom), backgroundColor: tk.bg }}>
          <DockAbove
            dock={dock}
            status={m.composer.status}
            statusAlarm={m.composer.statusAlarm}
            onDock={m.onDock}
            prompt={{ seed: promptSeed, ref: promptRef, onChange: m.onPromptText, onFocus: tray.onFieldFocus }}
          />
          {dock.terminal === "gone" ? (
            <GoneLine text={dock.goneText} />
          ) : dock.terminal === "expired" ? (
            <ExpiredCard dock={dock} onDock={m.onDock} />
          ) : (
            /* THE BAR (owner, 2026-09-20; 10a H:124): the courier on the left — she brings a
               question when asked — the reply strip with its plane key (Return sends too), the + on
               the right. The + opens the things to LEAVE (a note, a question, a moment, a song), not
               to attach. */
            <ReplyStrip
              ref={strip}
              placeholder={dock.placeholder}
              canSend={m.composer.canSend}
              onSend={onStripSend}
              onChangeText={m.setText}
              initialText={m.text}
              // the keyboard's rise closes the tray, in the same commit (not the focus, a frame early)
              onFocus={tray.onFieldFocus}
              sendLabel={dock.sendLabel}
              inputProps={{ autoCapitalize: dock.autocapitalize ? "sentences" : "none" }}
              leading={
                <RoundTool label={dock.wrenToolLabel} onPress={m.seedQuestion}>
                  <WrenBird size={24} mood="curious" />
                </RoundTool>
              }
              trailing={
                <RoundTool label={m.tracing ? dock.plusCloseLabel : dock.plusLabel} onPress={togglePlus} onEscape={trayOpen ? tray.close : undefined}>
                  <PlusGlyph size={24} open={m.tracing} color={m.tracing ? tk.ind : tk.ink} />
                </RoundTool>
              }
              style={{ paddingBottom: 4 }}
            />
          )}
        </View>
        {trayOpen && (
          // VoiceOver's escape from a card closes the tray (KTraceTray)
          <View onAccessibilityEscape={tray.close}>
            <TraceTray
              actions={dock.traces.map((tr) => ({ id: tr.key as TraceKind, title: tr.title, sub: tr.subtitle }))}
              onPick={onPick}
              height={traceTrayHeight(keyboard.lastHeight, insets.bottom)}
              bottomInset={insets.bottom}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      <PhotoLightbox photo={m.photoFull} onClose={() => m.setPhotoFull(null)} />
      <RoomIntroduction m={m} />
      <SongShelfRN open={m.shelf} onClose={() => m.setShelf(false)} songs={m.songs} songSays={m.songSays} name={m.name} />
    </View>
  );
}

/* THE SHELF — every song either of you left, in order. A song in a scroll is gone by tomorrow;
   gathered, the same messages become what this product is for: accumulated evidence that you are
   alike, curated by nobody. On the theme, under the 10a dim (lib/theme scrimColor: black on
   Midnight). On Midnight the shelf is sf with LeaveSheet's ln rule on top, and the bird's line
   steps down to soft2 (Midnight's soft is sf), so neither melts into what is under it; the
   light themes keep the page-coloured shelf and the soft card. ConversationNative's SongShelf
   is the same sheet over the Swift room. */
function SongShelfRN({ open, onClose, songs, songSays, name }: { open: boolean; onClose: () => void; songs: SharedSong[]; songSays: { line: string; evidence: string } | null; name: string }) {
  const { t: tk, dark } = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3), justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} />
        <View style={{ backgroundColor: dark ? tk.sf : tk.bg, maxHeight: "72%", paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: dark ? 1 : 0, borderTopColor: tk.ln }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12 }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: MONO.title * 0.14, color: tk.ink }}>
              {t("rm.shelf.title", { name: name.toUpperCase() })}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")}>
              <Text style={{ fontFamily: PF.mono, fontSize: 16, color: tk.mute }}>✕</Text>
            </Pressable>
          </View>
          {!!songSays && (
            <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: dark ? tk.soft2 : tk.soft, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 }}>
              <WrenBird size={18} mood="curious" />
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tk.ink }}>{t(songSays.line === "late" ? "rm.shelf.late" : "rm.shelf.both", { name })}</Text>
              <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.small, letterSpacing: 1, color: tk.mute }}>{songSays.evidence}</Text>
            </View>
          )}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {songs.map((sg) => (
              <Pressable
                key={sg.url}
                onPress={() => void Linking.openURL(sg.url)}
                accessibilityRole="link"
                style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tk.line }}
              >
                <Text style={{ fontSize: 15, color: tk.ind }}>♪</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, color: tk.ink }}>
                    {sg.title || sg.url.replace(/^https?:\/\//, "").split("/")[0]}
                  </Text>
                  <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.small, letterSpacing: 1, color: tk.mute, marginTop: 3 }}>
                    {(sg.mine ? t("ui.you") : name).toUpperCase()} · {dShort(sg.at).toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontFamily: PF.mono, fontSize: 12, color: tk.ind }}>›</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
