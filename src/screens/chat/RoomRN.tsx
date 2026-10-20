import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent, type TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { scrimColor, useLetterFamily, useTheme } from "../../lib/theme";
import { MONO, PFM } from "../../theme/post";
import { dLong, dShort } from "../../lib/format";
import { archNameThird } from "../../lib/aura-copy";
import { blurThen } from "../../lib/keyboard";
import { useRenderWindow } from "../../lib/render-window";
import type { ThreadMessage } from "../../lib/db";
import type { SharedSong } from "../../lib/shared-songs";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { PlayTray, type TraceKind } from "../../components/LeaveATrace";
import { WrenBird } from "../../components/WrenBird";
import { AvatarImage } from "../../components/AvatarImage";
import { StampAvatar } from "../../components/StampAvatar";
import { useMemberStamps } from "../../lib/member-marks";
import { MosaicId } from "../../components/MosaicId";
import { ReportSheet } from "../../components/ReportMenu";
import { useReportFlow } from "../../lib/report-flow";
import { BAR_ABOVE_KEYBOARD, IdeasBubble, KindredBar, type KindredBarHandle } from "../../components/10a";
import "../../data/strings-step5-platform"; // vo.play, vo.pause, cmp.emoji
import { NO_FACE, buildRoomDock, buildRoomItems, roomHeader, windowItems } from "./build-items";
import { useRoomModel, type ChatUi } from "./useRoomModel";
import { RoomIntroduction } from "./RoomIntroduction";
import { ConversationHeaderRN } from "./ConversationHeaderRN";
import { RoomRowRN, type RowEnv } from "./ChatRowsRN";
import { DockAbove, ExpiredCard, GoneLine } from "./ChatDockRN";
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
   · the chat composers' B (owner's final, 2026-10-18), as the SwiftUI room
     draws it:
     - the header (ConversationHeaderRN on build-items roomHeader): ‹, the
       kindred's round face 44 across, their name, KINDRED SINCE … in mute
       capitals, the ⋯ opening the report card. The older header's lore
       button and "Wren found you two" line are not in the owner's B (lore
       stays a row in Settings);
     - the Kindreds bar (components/10a KindredBar, uncontrolled — the
       words live in the field and are seeded only by the model: a clear
       after a send, the words back after a failure, an idea used): the
       ideas key, the capsule with only the field, the emoji key, the +
       (ringless line icons, the owner's rework that evening; the
       keyboard's send key sends); its icons on the 16 gutter, 12 over the
       keyboard or the tray. The ideas key took the Wren tool's place (it
       seeded the question mode: Ask something in the tray still does);
     - the ideas bubble 8 above the bar (IdeasBubble): one sentence from
       the model's ideas (useRoomModel: the 36 stamps' prompts, theirs
       first, in the room's order), ↻ ANOTHER moving on, USE IT → putting
       it in the field as plain words and giving it the keyboard;
     - the + tray in the keyboard's place (LeaveATrace's PlayTray: the four
       plays on their mood fills, 270 over the home inset), a dim over the
       list while it is open (a tap on it closes the tray); the two swap in
       one commit and the tray rises with the keyboard's timing or fades
       under Reduce Motion (useKeyboardTray);
     - THE THREE PANELS SHUT EACH OTHER (Prompt 3): the ideas key lets go
       of the keyboard and shuts the tray, the + lets go of the keyboard
       and shuts the bubble, the field taking the keyboard shuts both, and
       a tap on the list shuts the bubble;
   · the 10a look on the theme for everything else (ChatRowsRN,
     ChatDockRN).

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

  const bar = useRef<KindredBarHandle>(null);
  /* the ideas bubble is up (the screen's own: only the reader sees it) */
  const [ideasOpen, setIdeasOpen] = useState(false);
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
          if (target === "body") bar.current?.focus();
          else promptRef.current?.focus();
        }, delayMs);
        timers.current.add(timer);
      },
      seedText: (target, value) => {
        if (target === "body") bar.current?.setText(value);
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

  /* the room closed (gone, missing, expired) with the keyboard up: let go, and fold the tray and the bubble */
  const { setTracing } = m;
  useEffect(() => {
    if (open) return;
    bar.current?.blur();
    setTracing(false);
    setIdeasOpen(false);
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

  /** the bar's send: exactly the words it held. The React Native bar never empties itself (it
      returns false): the model empties the field synchronously when it takes a plain line — before
      its first await — and only once a fold, a song or a bare song link went, and leaves the words
      alone when it refuses. A self-clear would run after a synchronous refusal had put them back,
      and wipe them (Swift's field clears first and gets them back after; the bar's order is the
      other way round). */
  const onBarSend = (value: string): boolean => {
    void m.onSend(value, undefined, false);
    return false;
  };

  /* the + tray in the keyboard's place: drawn only while the keyboard is down, so the two swap in
     one commit (useKeyboardTray); the list is followed again once the tray's motion settled */
  const tray = useKeyboardTray(keyboard, m.tracing, m.setTracing, list.settleAfter);
  const letGo = () => {
    bar.current?.blur();
    promptRef.current?.blur();
  };
  /* THE THREE PANELS (Prompt 3). The +: choosing something to leave is not something you do
     mid-sentence, so the tray takes the keyboard's place; the bubble goes too */
  const togglePlus = () => {
    setIdeasOpen(false);
    tray.toggle(letGo);
  };
  /** the ideas key: the bubble, which lets go of the keyboard and shuts the tray, or shuts it */
  const toggleIdeas = () => {
    if (ideasOpen) {
      setIdeasOpen(false);
      return;
    }
    letGo();
    tray.close();
    setIdeasOpen(true);
  };
  /** a field took the keyboard: the tray (on the keyboard's rise) and the bubble go */
  const onFieldFocus = () => {
    tray.onFieldFocus();
    setIdeasOpen(false);
  };
  /** USE IT: the bubble goes at once; the model puts the sentence in the field and focuses it */
  const useIdea = () => {
    setIdeasOpen(false);
    m.takeIdea();
  };
  /** a card: a note, a question or a song hand the keyboard to the field (the tray stays until it
      is up); the moment opens the picker, the tray going down as it does */
  const onPick = (key: string) => {
    const k = key as TraceKind;
    if (k === "moment") tray.close();
    else tray.handOff();
    m.onTrace(k);
  };
  /* a tap on the list (not a drag) shuts the bubble: "tap elsewhere" (Prompt 4) */
  const touchAt = useRef<{ x: number; y: number } | null>(null);
  const listTouch = ideasOpen
    ? {
        onTouchStart: (e: GestureResponderEvent) => {
          touchAt.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        },
        onTouchEnd: (e: GestureResponderEvent) => {
          const at = touchAt.current;
          touchAt.current = null;
          if (at && Math.abs(e.nativeEvent.pageX - at.x) < 10 && Math.abs(e.nativeEvent.pageY - at.y) < 10) setIdeasOpen(false);
        },
      }
    : {};

  /* the header (B): their name, KINDRED SINCE … (or how they write), their round face; its ⋯
     starts the report flow, whose card drops just under it */
  const subtitle = detail?.revealedAt ? t("rm.kindredSince", { date: dLong(detail.revealedAt).toUpperCase() }) : archNameThird(m.read?.archetype?.id);
  const report = useReportFlow({ context: "thread", targetUser: detail?.gone ? undefined : detail?.other || undefined, refId: id, snapshot: m.theirLatest, onBlocked: m.onBlocked });
  const header = useMemo(
    // the face is drawn here (roomFace), not from the Swift record
    () => roomHeader({ t, locale: m.locale, name: m.name, sub: subtitle, face: NO_FACE, canReport: !report.nobody }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.name, subtitle, report.nobody, lang],
  );
  const headerTop = props.topInset ?? insets.top;
  /* their face as their Kindreds row draws it: their portrait, the glyph when they gave none, the
     veil once their account is gone; the soft disc while the thread loads */
  /* a member's face is a gold perforated stamp (C2); never a closed account */
  const stampUid = detail && !detail.gone ? detail.other || null : null;
  const stamp = useMemberStamps([stampUid])(stampUid);
  const roomFace = !detail ? (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tk.soft2 }} />
  ) : detail.gone || !detail.other ? (
    <MosaicId seed={null} cell={5.5} gap={1.5} />
  ) : stamp ? (
    <StampAvatar size={44} denom={stamp}>
      {({ size, radius }) => <AvatarImage id={detail.otherFace ?? null} seed={detail.other} size={size} radius={radius ?? undefined} />}
    </StampAvatar>
  ) : (
    <AvatarImage id={detail.otherFace ?? null} seed={detail.other} size={44} />
  );

  /* KeyboardAvoidingView measures the keyboard's overlap from its frame relative to its parent (this
     screen's root): with anything above the screen (the dev page's chips, a stack's header) it came
     out short by the root's distance from the window's top and the bar sat under the keyboard (as in
     LettersRN). The root's place in the window is that offset */
  const root = useRef<View>(null);
  const [rootTop, setRootTop] = useState(0);
  const measureRoot = useCallback(() => {
    root.current?.measureInWindow((_x, y) => {
      if (Number.isFinite(y)) setRootTop((cur) => (Math.abs(cur - y) > 0.5 ? y : cur));
    });
  }, []);

  const trayOpen = tray.shown && open && dock.traces.length > 0;
  const showsIdeas = ideasOpen && open && !!dock.ideasLabel && !!m.idea;
  /* the dim over the list while the tray is up: rgba(30,27,53,.18), Midnight black at .35 */
  const dim = tk.dark ? "rgba(0,0,0,0.35)" : "rgba(30,27,53,0.18)";

  return (
    <View ref={root} onLayout={measureRoot} style={{ flex: 1, backgroundColor: tk.bg }}>
      {/* their mark, always — you are in their room */}
      <ConversationHeaderRN
        model={header}
        roomFace={roomFace}
        stampUid={stampUid}
        topInset={headerTop}
        onBack={m.goBack}
        onPage={m.openPage}
        // the keyboard goes first, then the card drops from the ⋯
        onMore={() => ui.thenModal(() => report.openMenu())}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={rootTop}>
        <View style={{ flex: 1 }} {...listTouch}>
          <ScrollView {...list.listProps} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
            {items.map((item, i) => (
              <RoomRowRN key={item.key} item={item} first={i === 0} lit={list.lit === item.key} env={env} onLayout={list.rowLayout(item.key)} />
            ))}
          </ScrollView>
          {trayOpen && (
            // the dim fades with the tray's own motion (useKeyboardTray's layout animation)
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: dim }]} onPress={tray.close} accessible={false} importantForAccessibility="no" />
          )}
        </View>

        <View style={{ paddingHorizontal: 12, paddingBottom: keyboard.up || trayOpen ? BAR_ABOVE_KEYBOARD : Math.max(10, insets.bottom), backgroundColor: tk.bg }}>
          <DockAbove
            dock={dock}
            status={m.composer.status}
            statusAlarm={m.composer.statusAlarm}
            onDock={m.onDock}
            prompt={{ seed: promptSeed, ref: promptRef, onChange: m.onPromptText, onFocus: onFieldFocus }}
          />
          {dock.terminal === "gone" ? (
            <GoneLine text={dock.goneText} />
          ) : dock.terminal === "expired" ? (
            <ExpiredCard dock={dock} onDock={m.onDock} />
          ) : (
            <>
              {showsIdeas && (
                <IdeasBubble
                  label={dock.ideaLabel}
                  idea={m.idea}
                  another={dock.ideaAnother}
                  use={dock.ideaUse}
                  onAnother={m.nextIdea}
                  onUse={useIdea}
                  onClose={() => setIdeasOpen(false)}
                  // 16 from either edge (the dock's 12 and 4 more), 8 above the bar
                  style={{ marginHorizontal: 4, marginBottom: 8 }}
                />
              )}
              {/* THE BAR (chat composers B): the ideas key, the capsule, the emoji key, the +. The
                  + opens the things to LEAVE (a note, a question, a moment, a song), not to attach. */}
              <KindredBar
                ref={bar}
                placeholder={dock.placeholder}
                autocapitalize={dock.autocapitalize}
                onSend={onBarSend}
                onChangeText={m.setText}
                initialText={m.text}
                emojiLabel={dock.emojiLabel}
                ideasLabel={dock.ideasLabel}
                plusLabel={dock.plusLabel}
                plusCloseLabel={dock.plusCloseLabel}
                ideasOpen={showsIdeas}
                trayOpen={m.tracing}
                onIdeas={toggleIdeas}
                onPlus={togglePlus}
                onCloseIdeas={() => setIdeasOpen(false)}
                onCloseTray={tray.close}
                // the keyboard's rise closes the tray, in the same commit (not the focus, a frame early)
                onFocus={onFieldFocus}
                // the icons 17 from either edge, in line with the 16 gutter: the dock's 12 less 4
                // puts the 44 targets 8 from it, and a 26 icon sits 9 inside its target
                style={{ marginHorizontal: -4 }}
              />
            </>
          )}
        </View>
        {trayOpen && (
          // VoiceOver's escape from a card closes the tray (KChatTray)
          <View onAccessibilityEscape={tray.close}>
            <PlayTray traces={dock.traces} title={dock.trayTitle} onPick={onPick} bottomInset={insets.bottom} />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* the header's ⋯: the card drops just under it */}
      <ReportSheet flow={report} top={headerTop + 62} />
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
  // what Wren says about the songs is her line: the reader's Letter font
  const face = useLetterFamily();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3), justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} />
        <View style={{ backgroundColor: dark ? tk.sf : tk.bg, maxHeight: "72%", paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: dark ? 1 : 0, borderTopColor: tk.ln }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12 }}>
            {/* the sheet's title, System 500 17 centred (the ✕'s width mirrored on the left) */}
            <View style={{ width: 24 }} />
            <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: "500", textAlign: "center", color: tk.ink }}>
              {t("rm.shelf.title", { name: name.toUpperCase() })}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} style={{ width: 24, alignItems: "flex-end" }}>
              <Text style={{ ...PFM.mono, fontSize: 16, color: tk.mute }}>✕</Text>
            </Pressable>
          </View>
          {!!songSays && (
            <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: dark ? tk.soft2 : tk.soft, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 }}>
              <WrenBird size={18} mood="curious" />
              <Text style={{ flex: 1, ...face, fontSize: 14, lineHeight: 20, color: tk.ink }}>{t(songSays.line === "late" ? "rm.shelf.late" : "rm.shelf.both", { name })}</Text>
              <Text style={{ ...PFM.monoMed, fontSize: MONO.small, letterSpacing: 1, color: tk.mute }}>{songSays.evidence}</Text>
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
                  <Text style={{ ...PFM.monoMed, fontSize: MONO.small, letterSpacing: 1, color: tk.mute, marginTop: 3 }}>
                    {(sg.mine ? t("ui.you") : name).toUpperCase()} · {dShort(sg.at).toUpperCase()}
                  </Text>
                </View>
                <Text style={{ ...PFM.mono, fontSize: 12, color: tk.ind }}>›</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
