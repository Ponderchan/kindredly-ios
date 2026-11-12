import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KConversationView, useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import type { KChatCommands, KChatDockAction, KChatFace, KChatHeader, KChatItem, KChatPart, KChatStrings } from "../../../modules/kindredly-ui/src/Conversation";
import { SurfaceHost } from "../../components/NativeSurface";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { LettersIntroduction } from "./LettersIntroduction";
import { RoomIntroduction } from "./RoomIntroduction";
import { LeaveSheet } from "../../components/LeaveSheet";
import { SignSheet } from "./SignSheet";
import { ReportSheet } from "../../components/ReportMenu";
import { useReportFlow } from "../../lib/report-flow";
import { useThreadMute, type ThreadMute } from "../../lib/thread-mute";
import { WrenBird } from "../../components/WrenBird";
import { getLang, hasString, t, useLang } from "../../lib/i18n";
import { scrimColor, useLetterFamily, useTheme } from "../../lib/theme";
import { PFM } from "../../theme/post";
import { dLong, dShort, fmt } from "../../lib/format";
import { archNameThird } from "../../lib/aura-copy";
import { blurThen } from "../../lib/keyboard";
import { localImageRef, useSignedImageRefs, useSignedUrls } from "../../lib/images";
import { useBirdImageRef } from "../../lib/bird-images";
import { faceRecord, threadFaceInput, useFaceSource } from "../../lib/faces";
import { stampSpoken, useMemberStamps } from "../../lib/member-marks";
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
  lettersHeader,
  NO_FACE,
  revealedLettersHeader,
  roomHeader,
  windowItems,
  type ComposerFacts,
} from "./build-items";
import { useRoomModel, type ChatUi } from "./useRoomModel";
import { useLettersModel } from "./useLettersModel";
import { ChatHeader } from "./ChatHeader";
import { useOverlayRenderer } from "../../components/OverlayNativeSurface";
import { SongShelfSwift, type SongShelfProps } from "./SongShelfNative";
import { useSwiftPiece } from "../me/me-pieces";
import { shelfSaysKey, shelfTitleOf, shelfWhoOf } from "./song-shelf";

/* THE CONVERSATION IN SWIFTUI (10a step 5): the room (RoomNative) and the
   pen-pal chat (LettersNative) in ONE Host holding KConversationView, with
   the React Native modals beside it (the lightbox, the songs shelf, the
   sign sheet, the introduction, the report card). Both draw their header in
   Swift now (chat composers, 2026-10-18), its ⋯ opening ReportSheet:
   · the pen-pal chat before names (A2): the face, No. 5422, LETTER 3 OF 5 ·
     THEIRS, and under its rule the reach band, back from live 1.0.4 in
     place of the five dots (owner, 2026-10-19). With the identity switch
     on the same header carries the frosted window, the courier name and
     the ♀/♂ mark and star sign (lettersHeader, from the screen's book), and
     a deleted pen pal's veil becomes the flat veil tile (identity). A
     pen-pal chat that is already revealed keeps the React Native
     ChatHeader (or, behind the "chatheader" switch, Swift's port of it);
   · the room (B): the kindred's portrait, their name, KINDRED SINCE …. The
     React Native header's lore button and "Wren found you two" line are not
     in the owner's B (lore stays a row in Settings).
   The room's Kindreds bar's ✦ opens the openers deck (Sparkle, 2026-10-21):
   useRoomModel holds the walk, the sky and the cap and words the deck, sent
   to Swift as the deck command; its taps come back as onChatDeck.

   The model hooks (useRoomModel, useLettersModel) hold every rule and every
   send; the pure builders (build-items) word every row and the dock. This
   file only wires them to the Swift view:

   · the render window (80, +80 near the top, at most 160, sliding beyond:
     the 0b bench), its first row labelled, `rev` bumped when it changes;
   · the commands for everything that changes often: composer (canSend, the
     status line, clearOnSend), setText / focus / blur, scrollTo (an own
     send, a reply begun, a quote jump that widens the window first, a new
     line followed only while at the bottom), playback, the room's deck, all
     reseeded when the view (re)attaches;
   · the one voice player for the voice opening, its link signed (known
     bug 2), moment photos signed and keyed by their storage path, Wren's
     dock snapshots;
   · blurThen before every Alert, picker, sheet and push, so the keyboard
     of a SwiftUI field never strands over the next thing.

   MUTE (owner's audit, 2026-11-10; the "threadmute" switch, off): with it
   on, the ⋯ card of both conversations carries Mute / Unmute above Report
   and Block (lib/thread-mute; ReportSheet `mute`), and the Swift header
   shows a small bell.slash after the name while muted (withMute). Off, for
   a guest, on a demo thread or with nobody on the other side, nothing here
   changes. The React Native header a revealed pen-pal chat keeps while
   "chatheader" is off (ChatHeader) has its own ⋯ and offers no Mute. */

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
/** A header with the other person's C2 stamp on its face, and VoiceOver told once ("…, First
    Class" / "…, Cofounder No. 7"); the header unchanged when they aren't a member. */
function withStamp(h: KChatHeader, stamp: string): KChatHeader {
  if (!stamp) return h;
  const spoken = stampSpoken(stamp, t);
  return { ...h, stamp, a11yLabel: h.a11yLabel ? `${h.a11yLabel}, ${spoken}` : spoken };
}

/** A header for a correspondence that offers Mute (lib/thread-mute): its ⋯ named for more than
    report and block, and, while muted, the bell.slash after the name and "Muted" at the end of
    VoiceOver's label. The header unchanged when Mute isn't offered. */
function withMute(h: KChatHeader, mute: ThreadMute): KChatHeader {
  if (!mute.item) return h;
  const moreLabel = h.moreLabel && mute.moreLabel ? mute.moreLabel : h.moreLabel;
  if (!mute.muted) return { ...h, moreLabel };
  return { ...h, moreLabel, muted: true, a11yLabel: h.a11yLabel ? `${h.a11yLabel}, ${mute.spoken}` : mute.spoken };
}

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

export function RoomNative({ id, expiredParam, closingParam, topInset, onBack }: { id: string | undefined; expiredParam?: string; closingParam?: string; topInset?: number; /** held on the Kindreds tab's right page (a folding phone): back closes it there */ onBack?: () => void }) {
  useLang();
  const { key: themeKey, letterFont } = useTheme();
  const safe = useSafeAreaInsets();
  const { ref, commands, ui, live } = useChatSurface();
  const m = useRoomModel(id, { ui, expiredParam, closingParam, onBack });
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
        pickSending: m.pickSending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.stream, m.menuCtx, m.name, m.keyOf, photoOf, opening.voice, detail, m.songs.length, m.conv, lang, m.pickSending],
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
  // the Kindreds bar has the ideas key where the Wren tool stood: no tool snapshot to capture
  const noticeBird = useBirdImageRef("mini");
  const expiredBird = useBirdImageRef("think20");

  /* the header (B): the kindred's face as their Kindreds row draws it (their chosen portrait, the
     glyph when they gave none, the veil once gone), the soft disc while the thread loads */
  const faceSource = useFaceSource(threadFaceInput({ other: detail?.other, otherFace: detail?.otherFace, revealed: true, theirs: detail?.otherCount ?? 0, gone: detail?.gone }));
  const face: KChatFace = detail ? faceRecord(faceSource) : NO_FACE;
  const report = useReportFlow({ context: "thread", targetUser: detail?.gone ? undefined : detail?.other || undefined, refId: id, snapshot: m.theirLatest, onBlocked: m.onBlocked });
  // Mute / Unmute in the ⋯, and the header's bell.slash (null and false while the switch is off)
  const mute = useThreadMute(id, { demo: m.isDemo, someone: !report.nobody });
  const subtitle = detail?.revealedAt ? t("rm.kindredSince", { date: dLong(detail.revealedAt).toUpperCase() }) : archNameThird(m.read?.archetype?.id);
  // C2: the kindred's stamp when they are a member (never once gone)
  const stampOf = useMemberStamps([detail?.other]);
  const stamp = detail && !detail.gone ? stampOf(detail.other) : "";
  const header = useMemo<KChatHeader>(
    () => withMute(withStamp(roomHeader({ t, locale: m.locale, name: m.name, sub: subtitle, face, canReport: !report.nobody, marks: m.kindredMarks }), stamp), mute),
    // face is a fresh record each render; its fields are what change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.name, subtitle, face.kind, face.uri, face.key, face.overscan, face.mask, report.nobody, lang, stamp, mute, m.kindredMarks],
  );
  const headerTop = topInset ?? safe.top;
  const insets = useMemo(() => ({ top: headerTop, bottom: safe.bottom, tabBarRoom: 0 }), [headerTop, safe.bottom]);

  const sendComposer = useCallback((args: KChatCommands["composer"]) => commands.send("composer", args), [commands]);
  const sendScroll = useCallback((args: KChatCommands["scrollTo"]) => commands.send("scrollTo", args), [commands]);
  useComposerCommand(sendComposer, m.composer);
  useFollowNewLines(built, sendScroll);
  // the openers deck, whenever it changes (and on every attach: reseed)
  useEffect(() => {
    commands.send("deck", m.deck);
  }, [commands, m.deck]);

  const voiceState = useRef<VoicePlayback | null>(null);
  const voice = useVoicePlayback({
    onChange: (s) => {
      voiceState.current = s;
      commands.send("playback", voiceArgs(s));
    },
  });

  /* what a remounted view must be told again: the words, the prompt, the composer, the voice,
     the deck */
  live.current.win = win;
  live.current.built = built;
  live.current.reseed = () => {
    commands.send("setText", { target: "body", value: m.text });
    commands.send("setText", { target: "prompt", value: m.mode?.kind === "question" ? m.mode.prompt : "" });
    commands.send("composer", { canSend: m.composer.canSend, status: m.composer.status, statusAlarm: m.composer.statusAlarm, clearOnSend: m.composer.clearOnSend });
    commands.send("playback", voiceArgs(voiceState.current));
    commands.send("deck", m.deck);
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
  /* the dock's presses, and the Swift header's: each of those leaves the screen or covers it, so
     the keyboard goes first (goBack and openPage let go of it themselves) */
  const onDock = (action: KChatDockAction) => {
    if (action === "back") m.goBack();
    else if (action === "page") m.openPage();
    else if (action === "more") ui.thenModal(() => report.openMenu());
    else m.onDock(action);
  };

  const { t: tk } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
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
          header={header}
          strings={strings}
          noticeBird={noticeBird}
          expiredBird={expiredBird}
          onChatReachTop={win.grow}
          onChatReachBottom={win.back}
          onChatItemPress={onItemPress}
          onChatItemAction={m.onItemAction}
          onChatText={m.setText}
          onChatPromptText={m.onPromptText}
          onChatSend={(value, prompt, cleared) => void m.onSend(value, prompt, cleared)}
          onChatTrace={m.onTrace}
          onChatDock={onDock}
          onChatVoice={onVoice}
          onChatDeck={m.onDeck}
        />
      </SurfaceHost>

      {/* the Swift header's ⋯: the card drops just under it */}
      <ReportSheet flow={report} top={headerTop + 62} mute={mute.item} />
      <PhotoLightbox photo={m.photoFull} onClose={() => m.setPhotoFull(null)} />
      <SongShelf open={m.shelf} onClose={() => m.setShelf(false)} songs={m.songs} songSays={m.songSays} name={m.name} />
      <RoomIntroduction m={m} />
    </View>
  );
}

/* THE SHELF: SwiftUI's (SongShelfNative, the "songshelf" switch) where it can be, else the React
   Native one below; both write from song-shelf. */
function SongShelf(p: SongShelfProps) {
  const { native, toRN } = useOverlayRenderer("songshelf", "KSongShelfView", p.open);
  return native ? <SongShelfSwift {...p} onFallback={toRN} /> : <SongShelfRN {...p} />;
}

/* THE SHELF — every song either of you left, in order (room/[id].tsx), on the theme.
   On Midnight it is drawn as a sheet rather than more page: under the black dim (lib/theme
   scrimColor) it is sf with LeaveSheet's ln rule on top, and the bird's line inside steps
   down to soft2 — Midnight's soft is sf, so a soft card would vanish into the sheet. The
   light themes keep the page-coloured shelf and the soft card. */
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
              {t("rm.shelf.title", { name })}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} style={{ width: 24, alignItems: "flex-end" }}>
              <Text style={{ ...PFM.mono, fontSize: 16, color: tk.mute }}>✕</Text>
            </Pressable>
          </View>
          {!!songSays && (
            <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: dark ? tk.soft2 : tk.soft, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 }}>
              <WrenBird size={18} mood="curious" />
              <Text style={{ flex: 1, ...face, fontSize: 14, lineHeight: 20, color: tk.ink }}>{t(shelfSaysKey(songSays.line), { name })}</Text>
              <Text style={{ ...PFM.monoMed, fontSize: 9, letterSpacing: 1, color: tk.mute }}>{songSays.evidence}</Text>
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
                    {shelfTitleOf(sg)}
                  </Text>
                  <Text style={{ ...PFM.monoMed, fontSize: 9, letterSpacing: 1, color: tk.mute, marginTop: 3 }}>
                    {shelfWhoOf(sg, name, t("ui.you"), dShort)}
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

/* ── the pen-pal chat ──────────────────────────────────────────────────── */

export function LettersNative({ id, topInset, onBack }: { id: string | undefined; topInset?: number; /** held on the Kindreds tab's right page (a folding phone): back closes it there */ onBack?: () => void }) {
  useLang();
  const { key: themeKey, letterFont, t: tk } = useTheme();
  const safe = useSafeAreaInsets();
  const { commands, ui, live } = useChatSurface();
  const m = useLettersModel(id, { ui, onBack });
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
        // the A2 cards: a head line in each, the day as a day rule
        cards: true,
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

  /* the Swift header (A2) while names aren't traded (and while the thread loads); a revealed
     thread seen here keeps the React Native one, or with the "chatheader" switch on (and the
     binary carrying KChatHeaderView; me-pieces useSwiftPiece arms the crash breadcrumb) has that
     same header drawn by Swift (KChatHeaderRevealed, build-items revealedLettersHeader): the
     round face as lib/faces resolves a kindred, the state in its tone, the ⋯ opening the same
     report card ReportMenu opened */
  const revealedSwift = useSwiftPiece("chatheader", !!detail?.revealed) && !!detail?.revealed;
  const swiftHeader = !detail?.revealed || revealedSwift;
  const report = useReportFlow({ context: "thread", targetUser: detail?.gone ? undefined : detail?.other || undefined, refId: id, snapshot: m.theirLatest, onBlocked: m.onBlocked });
  // Mute / Unmute in the ⋯, and the header's bell.slash (null and false while the switch is off)
  const mute = useThreadMute(id, { demo: m.isDemo, someone: !report.nobody });
  // C2: the pen pal's stamp when they are a member (membership only, never who; never once gone)
  const stampOf = useMemberStamps([detail?.other]);
  const stamp = detail && !detail.gone ? stampOf(detail.other) : "";
  // the revealed header's face (a kindred's, as the room's); nobody to resolve until it is drawn
  const revealedFaceSource = useFaceSource(
    threadFaceInput({ other: revealedSwift ? detail?.other : null, otherFace: detail?.otherFace, revealed: true, theirs: detail?.otherCount ?? 0, gone: detail?.gone }),
  );
  const revealedFace: KChatFace = revealedSwift ? faceRecord(revealedFaceSource) : NO_FACE;
  const header = useMemo<KChatHeader | null>(
    () => {
      const h = revealedSwift
        ? withStamp(revealedLettersHeader({ t, name: m.name, face: revealedFace, state: m.state, canOpenPage: m.canOpenPage, canReport: !report.nobody, marks: m.kindredMarks }), stamp)
        : swiftHeader
        ? withStamp({
            ...lettersHeader({
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
            }),
            // the identity switch: a deleted pen pal's veil is the flat veil tile, square like the windows
            identity: m.identity,
          }, stamp)
        : null;
      return h ? withMute(h, mute) : null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      swiftHeader,
      revealedSwift,
      revealedFace.kind,
      revealedFace.uri,
      revealedFace.key,
      revealedFace.overscan,
      revealedFace.mask,
      m.name,
      m.who,
      m.identity,
      detail?.other,
      detail?.myCount,
      detail?.otherCount,
      detail?.theirSigned,
      m.state,
      m.canOpenPage,
      m.kindredMarks,
      report.nobody,
      lang,
      stamp,
      mute,
    ],
  );
  const headerTop = topInset ?? safe.top;
  const strings = useChatStrings();
  // the Swift header sits under the status bar's room; under ChatHeader the Host starts below it
  const insets = useMemo(() => ({ top: swiftHeader ? headerTop : 0, bottom: safe.bottom, tabBarRoom: 0 }), [swiftHeader, headerTop, safe.bottom]);

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

  /* the dock's presses, and the Swift header's: each of those leaves the screen or covers it, so
     the keyboard goes first (goBack and openPage let go of it themselves) */
  const onDock = (action: KChatDockAction) => {
    if (action === "back") m.goBack();
    else if (action === "page") m.openPage();
    else if (action === "more") ui.thenModal(() => report.openMenu());
    else m.onDock(action);
  };

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
      {swiftHeader ? null : (
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
      )}
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
          header={header}
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
          onChatDock={onDock}
          onChatVoice={onVoice}
        />
      </SurfaceHost>

      {/* the Swift header's ⋯: the card drops just under it (the revealed header's where
          ReportMenu's own card dropped: its default top) */}
      {revealedSwift ? <ReportSheet flow={report} mute={mute.item} /> : swiftHeader ? <ReportSheet flow={report} top={headerTop + 62} mute={mute.item} /> : null}
      {/* the KDock door's sheet: identity on, the signing sheet; off, today's ENCLOSE IT confirmation */}
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
