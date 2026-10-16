import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KConversationView, useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import type { KChatCommands, KChatDockAction, KChatItem, KChatPart, KChatStrings } from "../../../modules/kindredly-ui/src/Conversation";
import { SurfaceHost } from "../../components/NativeSurface";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { Introduction } from "../../components/Introduction";
import { RoomIntroduction } from "./RoomIntroduction";
import { LeaveSheet } from "../../components/LeaveSheet";
import { WrenBird } from "../../components/WrenBird";
import { getLang, t, useLang } from "../../lib/i18n";
import { scrimColor, useTheme } from "../../lib/theme";
import { PF } from "../../theme/post";
import { dLong, dShort, fmt } from "../../lib/format";
import { archNameThird } from "../../lib/aura-copy";
import { blurThen } from "../../lib/keyboard";
import { localImageRef, useSignedImageRefs, useSignedUrls } from "../../lib/images";
import { useBirdImageRef } from "../../lib/bird-images";
import { playbackCommandArgs, useVoicePlayback, type VoicePlayback } from "../../lib/voice-playback";
import { useRenderWindow, type RenderWindow } from "../../lib/render-window";
import type { ThreadDetail, ThreadMessage } from "../../lib/db";
import type { SharedSong } from "../../lib/shared-songs";
import { demoMediaUrl } from "../../data/demo";
import "../../data/strings-step5-platform"; // vo.play, vo.pause
import {
  CHAT_WINDOW,
  buildLetterItems,
  buildLettersDock,
  buildRoomDock,
  buildRoomItems,
  indexOfKey,
  windowItems,
  type ComposerFacts,
} from "./build-items";
import { useRoomModel, type ChatUi } from "./useRoomModel";
import { useLettersModel } from "./useLettersModel";
import { ChatHeader } from "./ChatHeader";
import { ReachBand } from "./ReachBand";

/* THE CONVERSATION IN SWIFTUI (10a step 5): the room (RoomNative) and the
   pen-pal chat (LettersNative), each a React Native header (ChatHeader, and
   the reach band before names) over ONE Host holding KConversationView,
   with the React Native modals beside it (the lightbox, the songs shelf,
   the sign sheet, the introduction).

   The model hooks (useRoomModel, useLettersModel) hold every rule and every
   send; the pure builders (build-items) word every row and the dock. This
   file only wires them to the Swift view:

   · the render window (80, +80 near the top, at most 160, sliding beyond:
     the 0b bench), its first row labelled, `rev` bumped when it changes;
   · the commands for everything that changes often: composer (canSend, the
     status line, clearOnSend), setText / focus / blur, scrollTo (an own
     send, a reply begun, a quote jump that widens the window first, a new
     line followed only while at the bottom), playback, all reseeded when
     the view (re)attaches;
   · the one voice player for the voice opening, its link signed (known
     bug 2), moment photos signed and keyed by their storage path, Wren's
     dock snapshots;
   · blurThen before every Alert, picker, sheet and push, so the keyboard
     of a SwiftUI field never strands over the next thing. */

/** the voice opening's playback key */
const VOICE_KEY = "voice:opening";

/** The renderer's side of a ChatUi, and the refs its callbacks read. */
function useChatSurface() {
  const ref = useRef<KScreenHandle>(null);
  /* what the ui's callbacks read at call time (they are made once): the window and the rows */
  const live = useRef<{ win: RenderWindow | null; built: readonly KChatItem[]; reseed: () => void }>({ win: null, built: [], reseed: () => {} });
  const commands = useKCommands<KChatCommands>(ref, { blurOnUnmount: true, onViewAttach: () => live.current.reseed() });
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );
  const ui = useMemo<ChatUi>(() => {
    const later = (ms: number, fn: () => void) => {
      if (ms <= 0) return fn();
      const id = setTimeout(() => {
        timers.current.delete(id);
        fn();
      }, ms);
      timers.current.add(id);
    };
    return {
      focus: (target, delayMs) => later(delayMs, () => commands.send("focus", { target })),
      seedText: (target, value) => commands.send("setText", { target, value }),
      scrollToEnd: (animated, delayMs) =>
        later(delayMs, () => {
          // an own send brings the window back to the newest
          live.current.win?.reset();
          commands.send("scrollTo", { key: "end", animated });
        }),
      jumpTo: (key) => {
        const index = indexOfKey(live.current.built, key);
        if (index < 0) return;
        // a line outside the window: widen it first; Swift jumps once the row is there
        live.current.win?.include(index);
        commands.send("scrollTo", { key, animated: true, highlight: true });
      },
      thenModal: (fn) => blurThen(fn, ref),
    };
  }, [commands]);
  return { ref, commands, ui, live };
}

/** The composer's facts go to Swift as a command, only when one changes. */
function useComposerCommand(send: (args: KChatCommands["composer"]) => void, facts: ComposerFacts) {
  const { canSend, status, statusAlarm, clearOnSend } = facts;
  useEffect(() => {
    send({ canSend, status, statusAlarm, clearOnSend });
  }, [send, canSend, status, statusAlarm, clearOnSend]);
}

/** Follow a new line at the end — only while the reader is at the bottom (Swift checks), never on
    the first paint (Swift settles that) and never for a window move. */
function useFollowNewLines(built: readonly KChatItem[], send: (args: KChatCommands["scrollTo"]) => void) {
  const lastKey = built[built.length - 1]?.key;
  const prev = useRef<{ key?: string; n: number }>({ key: undefined, n: 0 });
  useEffect(() => {
    const was = prev.current;
    prev.current = { key: lastKey, n: built.length };
    if (!was.key || !lastKey || was.key === lastKey) return;
    send({ key: "end", animated: built.length - was.n <= 1, onlyAtBottom: true });
    // the rows' length is read with the key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey, send]);
}

/** The voice opening's playable address: signed from storage, or the demo's sample. */
function useOpeningVoice(detail: ThreadDetail | null, isDemo: boolean) {
  const path = detail?.openingMedia ?? null;
  const signed = useSignedUrls("voice-letters", isDemo ? [] : [path]);
  const url = path ? (isDemo ? demoMediaUrl(path) : signed[path] ?? null) : null;
  const voice = useMemo(() => (path ? { key: VOICE_KEY, duration: fmt(detail?.openingDurationS ?? 0) } : null), [path, detail?.openingDurationS]);
  return { url, voice, durationS: detail?.openingDurationS ?? null };
}

/** The playback command for the voice card, never "unavailable" (known bug 2). KVoiceCard takes
    no taps while unavailable, and voice-playback reloads a failed item only on the next press: a
    failed load (offline, a lapsed link) is sent as a card at rest, so that press can come. The
    card is unavailable only while there is no signed link at all (onVoice's own branch). */
function voiceArgs(s: VoicePlayback | null): KChatCommands["playback"] {
  return { ...playbackCommandArgs(s), failed: false };
}

/** The voice card is told again whenever its link changes (signed at last, re-signed every hour,
    gone) and whenever the app comes back to the front (a connection back): whatever the player
    last said, as a card that takes a press. */
function useVoiceLinkArrived(url: string | null, send: () => void) {
  const prev = useRef(url);
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (url === prev.current) return;
    prev.current = url;
    sendRef.current();
  }, [url]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") sendRef.current();
    });
    return () => sub.remove();
  }, []);
}

/** The words the rows share. */
function useChatStrings(): KChatStrings {
  const lang = getLang();
  return useMemo(
    () => ({ goToQuote: t("mm.goToQuote"), translating: t("mm.translating"), photoOpen: t("ph.open"), playLabel: t("vo.play"), pauseLabel: t("vo.pause") }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
}

/* ── the room ──────────────────────────────────────────────────────────── */

export function RoomNative({ id, expiredParam, closingParam, topInset }: { id: string | undefined; expiredParam?: string; closingParam?: string; topInset?: number }) {
  useLang();
  const { key: themeKey, letterFont } = useTheme();
  const safe = useSafeAreaInsets();
  const { ref, commands, ui, live } = useChatSurface();
  const m = useRoomModel(id, { ui, expiredParam, closingParam });
  const detail = m.detail;
  const lang = getLang();

  /* pictures: moments signed and keyed by their storage path; a demo or a picture still on its
     way keyed by its own address */
  const photoPaths = useMemo(() => (detail?.messages ?? []).filter((x) => x.kind === "photo" && x.mediaPath).map((x) => x.mediaPath as string), [detail]);
  const signedPhotos = useSignedImageRefs("moments", photoPaths);
  const photoOf = useCallback((msg: ThreadMessage) => (msg.mediaPath ? signedPhotos[msg.mediaPath] ?? null : localImageRef(msg.meta?.url)), [signedPhotos]);
  const opening = useOpeningVoice(detail, m.isDemo);

  const built = useMemo(
    () =>
      buildRoomItems(m.stream, {
        ...m.menuCtx,
        locale: m.locale,
        day: m.dayLabel,
        name: m.name,
        keyOf: m.keyOf,
        photoOf,
        voice: opening.voice,
        messages: detail?.messages ?? [],
        songsCount: m.songs.length,
        lastMessage: m.conv[m.conv.length - 1] ?? null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.stream, m.menuCtx, m.name, m.keyOf, photoOf, opening.voice, detail, m.songs.length, m.conv, lang],
  );
  const win = useRenderWindow(built.length, CHAT_WINDOW);
  const items = useMemo(() => windowItems(built, win.start, win.end, "room"), [built, win.start, win.end]);
  const rev = useRev(items);

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
  const strings = useChatStrings();
  const toolBird = useBirdImageRef("curious24");
  const noticeBird = useBirdImageRef("mini");
  const expiredBird = useBirdImageRef("think20");
  const insets = useMemo(() => ({ top: 0, bottom: safe.bottom, tabBarRoom: 0 }), [safe.bottom]);

  const sendComposer = useCallback((args: KChatCommands["composer"]) => commands.send("composer", args), [commands]);
  const sendScroll = useCallback((args: KChatCommands["scrollTo"]) => commands.send("scrollTo", args), [commands]);
  useComposerCommand(sendComposer, m.composer);
  useFollowNewLines(built, sendScroll);

  const voiceState = useRef<VoicePlayback | null>(null);
  const voice = useVoicePlayback({
    onChange: (s) => {
      voiceState.current = s;
      commands.send("playback", voiceArgs(s));
    },
  });

  /* what a remounted view must be told again: the words, the prompt, the composer, the voice */
  live.current.win = win;
  live.current.built = built;
  live.current.reseed = () => {
    commands.send("setText", { target: "body", value: m.text });
    commands.send("setText", { target: "prompt", value: m.mode?.kind === "question" ? m.mode.prompt : "" });
    commands.send("composer", { canSend: m.composer.canSend, status: m.composer.status, statusAlarm: m.composer.statusAlarm, clearOnSend: m.composer.clearOnSend });
    commands.send("playback", voiceArgs(voiceState.current));
  };

  useVoiceLinkArrived(opening.url, () => commands.send("playback", voiceArgs(voiceState.current)));
  const onVoice = (key: string) => {
    if (!opening.url) {
      // no signed link yet (offline): the one case the card shows itself unavailable, until the
      // link arrives (useVoiceLinkArrived)
      commands.send("playback", { ...playbackCommandArgs(null), key, failed: true });
      return;
    }
    voice.toggle(key, opening.url, opening.durationS);
  };
  const onItemPress = (key: string, part: KChatPart) => {
    if (part === "voice") onVoice(key);
    else m.onItemPress(key, part);
  };

  const subtitle = detail?.revealedAt ? t("rm.kindredSince", { date: dLong(detail.revealedAt).toUpperCase() }) : archNameThird(m.read?.archetype?.id);
  const { t: tk } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <ChatHeader
        variant="room"
        detail={detail}
        name={m.name}
        subtitle={subtitle}
        wren={m.wren}
        threadId={id}
        snapshot={m.theirLatest}
        canOpenPage
        topInset={topInset}
        onBack={m.goBack}
        onOpenPage={m.openPage}
        onLore={m.openLore}
        onBlocked={m.onBlocked}
        onBeforeSheet={() => commands.send("blur", {})}
      />
      <SurfaceHost field>
        <KConversationView
          ref={commands.ref}
          theme={themeKey}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          variant="room"
          items={items}
          hasOlder={win.hasMore}
          hasNewer={win.hasBack}
          dock={dock}
          strings={strings}
          toolBird={toolBird}
          noticeBird={noticeBird}
          expiredBird={expiredBird}
          onChatReachTop={win.grow}
          onChatReachBottom={win.back}
          onChatItemPress={onItemPress}
          onChatItemAction={m.onItemAction}
          onChatText={m.setText}
          onChatPromptText={m.onPromptText}
          onChatSend={(value, prompt, cleared) => void m.onSend(value, prompt, cleared)}
          onChatTool={(tool) => {
            if (tool === "wren") m.seedQuestion();
          }}
          onChatTrace={m.onTrace}
          onChatDock={(action: KChatDockAction) => m.onDock(action)}
          onChatVoice={onVoice}
        />
      </SurfaceHost>

      <PhotoLightbox photo={m.photoFull} onClose={() => m.setPhotoFull(null)} />
      <SongShelf open={m.shelf} onClose={() => m.setShelf(false)} songs={m.songs} songSays={m.songSays} name={m.name} />
      <RoomIntroduction m={m} />
    </View>
  );
}

/* THE SHELF — every song either of you left, in order (room/[id].tsx), on the theme.
   On Midnight it is drawn as a sheet rather than more page: under the black dim (lib/theme
   scrimColor) it is sf with LeaveSheet's ln rule on top, and the bird's line inside steps
   down to soft2 — Midnight's soft is sf, so a soft card would vanish into the sheet. The
   light themes keep the page-coloured shelf and the soft card. */
function SongShelf({ open, onClose, songs, songSays, name }: { open: boolean; onClose: () => void; songs: SharedSong[]; songSays: { line: string; evidence: string } | null; name: string }) {
  const { t: tk, dark } = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3), justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} />
        <View style={{ backgroundColor: dark ? tk.sf : tk.bg, maxHeight: "72%", paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: dark ? 1 : 0, borderTopColor: tk.ln }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12 }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: tk.ink }}>
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
              <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1, color: tk.mute }}>{songSays.evidence}</Text>
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
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1, color: tk.mute, marginTop: 3 }}>
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

/* ── the pen-pal chat ──────────────────────────────────────────────────── */

export function LettersNative({ id, topInset }: { id: string | undefined; topInset?: number }) {
  useLang();
  const router = useRouter();
  const { key: themeKey, letterFont, t: tk } = useTheme();
  const safe = useSafeAreaInsets();
  const { commands, ui, live } = useChatSurface();
  const m = useLettersModel(id, { ui });
  const detail = m.detail;
  const lang = getLang();
  const opening = useOpeningVoice(detail, m.isDemo);

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
  const win = useRenderWindow(built.length, CHAT_WINDOW);
  const items = useMemo(() => windowItems(built, win.start, win.end, "letters"), [built, win.start, win.end]);
  const rev = useRev(items);
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
  const strings = useChatStrings();
  const insets = useMemo(() => ({ top: 0, bottom: safe.bottom, tabBarRoom: 0 }), [safe.bottom]);

  const sendComposer = useCallback((args: KChatCommands["composer"]) => commands.send("composer", args), [commands]);
  const sendScroll = useCallback((args: KChatCommands["scrollTo"]) => commands.send("scrollTo", args), [commands]);
  useComposerCommand(sendComposer, m.composer);
  useFollowNewLines(built, sendScroll);

  const voiceState = useRef<VoicePlayback | null>(null);
  const voice = useVoicePlayback({
    onChange: (s) => {
      voiceState.current = s;
      commands.send("playback", voiceArgs(s));
    },
  });

  live.current.win = win;
  live.current.built = built;
  live.current.reseed = () => {
    commands.send("setText", { target: "body", value: m.text });
    commands.send("composer", { canSend: m.composer.canSend, status: m.composer.status, statusAlarm: m.composer.statusAlarm, clearOnSend: m.composer.clearOnSend });
    commands.send("playback", voiceArgs(voiceState.current));
  };

  useVoiceLinkArrived(opening.url, () => commands.send("playback", voiceArgs(voiceState.current)));
  const onVoice = (key: string) => {
    if (!opening.url) {
      // no signed link yet: unavailable until it arrives (useVoiceLinkArrived)
      commands.send("playback", { ...playbackCommandArgs(null), key, failed: true });
      return;
    }
    voice.toggle(key, opening.url, opening.durationS);
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
        topInset={topInset}
        onBack={m.goBack}
        onOpenPage={m.openPage}
        onBlocked={m.onBlocked}
        onBeforeSheet={() => commands.send("blur", {})}
      />
      {detail && !detail.revealed && !detail.gone ? <ReachBand myCount={detail.myCount} otherCount={detail.otherCount} other={detail.other || null} /> : null}
      <SurfaceHost field>
        <KConversationView
          ref={commands.ref}
          theme={themeKey}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          variant="letters"
          items={items}
          hasOlder={win.hasMore}
          hasNewer={win.hasBack}
          dock={dock}
          strings={strings}
          onChatReachTop={win.grow}
          onChatReachBottom={win.back}
          onChatItemPress={(key, part) => {
            if (part === "voice") onVoice(key);
            else m.onItemPress(key, part);
          }}
          onChatItemAction={m.onItemAction}
          onChatText={m.setText}
          onChatSend={(value, prompt, cleared) => void m.onSend(value, prompt, cleared)}
          onChatDock={(action: KChatDockAction) => m.onDock(action)}
          onChatVoice={onVoice}
        />
      </SurfaceHost>

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
