import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KReaderView, type KReaderCommands, type KReaderFaceKind, type KReaderHero, type KReaderLetter, type KReaderStrings } from "../../../modules/kindredly-ui/src/Reader";
import { SurfaceHost } from "../../components/NativeSurface";
import { ReportSheet } from "../../components/ReportMenu";
import { Toast } from "../../components/ui";
import { getLang, hasString, t, useLang } from "../../lib/i18n";
import { useLetterFont, useTheme } from "../../lib/theme";
import { fmt as clock } from "../../lib/format";
import { blurThen } from "../../lib/keyboard";
import { developFor } from "../../lib/mosaic";
import { faceRecord, useFaceSource, type FaceInput } from "../../lib/faces";
import { useSignedUrls } from "../../lib/images";
import { playbackCommandArgs, useVoicePlayback, type VoicePlayback } from "../../lib/voice-playback";
import { keepStampFlow, reportStampFlow } from "../../lib/custom-stamps";
import { paperOf } from "../../data/papers";
import { sname } from "../../data/stamps";
import { demoMediaUrl } from "../../data/demo";
import "../../data/strings-step5-platform"; // rp.menu.a11y, vo.play, vo.pause
import "../../data/strings-step5-kitrn"; // a11y.back
import { isOpening } from "./build-items";
import { capsuleCode, isUnsigned, isVoiceLetter, letterDate, letterLinkKey, postmarkLine, replyCanSend, replyPlaceholder, signatureOf } from "./reader";
import { letterLang, useReaderModel } from "./useReaderModel";

/* THE ONE-LETTER READER IN SWIFTUI (owner-approved 2026-10-20): one Host
   (SurfaceHost field: the keyboard's safe area kept, so the reply bar rides
   it) holding KReaderView, on the model the React Native ReaderScreen draws
   (./useReaderModel), with the React Native report card and the stamp's
   toast beside it. This file only turns the model into Swift's records and
   commands:

   · the hero, every word resolved: the face as lib/faces resolves it (a
     kindred's portrait; a pen pal's developing mosaic, or with the identity
     switch on their frosted window; the veil, the flat tile once the switch
     is on), the postmark or the courier name over the date, the state, the
     stamp, the letter at its tier, the #topic, the translate capsule, the
     toggle and REPLY ↓ — and the PAPER: the opening letter's
     (letters.paper, read through threads.letter; ThreadDetail.openingPaper),
     plain for every reply (a reply has no paper);
   · the earlier letters, signed (with a rev);
   · commands for what changes per keystroke (the send key and the hint),
     the reply's words (cleared once a letter went, reseeded on attach) and
     the one voice player's transitions (the voice opening, signed; known
     bug 2's rule: a failed load is sent as a card at rest, so the next
     press can load it again);
   · the ⋯ opens the React Native ReportSheet (as ConversationNative does),
     dropped from the ⋯'s foot (Swift reports its window y); a stranger's
     photo stamp's Keep / Report runs the same flows as KeepableStamp.

   `paper` (the dev page only) draws the hero on that paper whatever the
   letter says. */

/** the voice opening's playback key */
const VOICE_KEY = "voice:opening";

/** The same value back while its content is the same (JSON), so an unchanged rebuild keeps its identity. */
function useSame<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

/** The playback command, never "unavailable" after a failed load (see the top). */
function voiceArgs(s: VoicePlayback | null): KReaderCommands["playback"] {
  return { ...playbackCommandArgs(s), failed: false };
}

export function ReaderNative({ id, m, i, topInset, paper: paperOverride }: { id?: string; m?: string; i?: string; topInset?: number; paper?: string }) {
  useLang();
  const { key: themeKey, t: tk } = useTheme();
  const letterFont = useLetterFont();
  const safe = useSafeAreaInsets();
  const r = useReaderModel({ id, m, i });
  const { detail, status, conv, hero, earlier, who, fmt, state, stamp, customId, custom, customTag, translated, shown, tier, offerXl, xlBusy, flow, canWrite, closed, hint, pal, memberStamp, heroDate } = r;
  const lang = getLang();

  const ref = useRef<KScreenHandle>(null);
  const live = useRef<{ reseed: () => void }>({ reseed: () => {} });
  const commands = useKCommands<KReaderCommands>(ref, { blurOnUnmount: true, onViewAttach: () => live.current.reseed() });

  /* ── the face: as lib/faces resolves it ── */
  const unsigned = isUnsigned(detail);
  const kindred = !!detail?.revealed && !unsigned;
  const palFrost = pal?.face.kind === "frost" ? pal.face.spec : null;
  const faceInput: FaceInput = kindred
    ? { role: "kindred", seed: detail?.other, avatarId: detail?.otherFace ?? null }
    : { role: "penpal", seed: unsigned ? null : detail?.other, develop: developFor(detail?.otherCount ?? 0), gone: unsigned, ...(palFrost ? { frost: palFrost } : {}) };
  const face = faceRecord(useFaceSource(faceInput));
  // switch on: the frost (or, for a deleted account, the flat tile) at 34; a kindred's round 28; the bare mosaic 24
  const faceKind: KReaderFaceKind = !detail ? "none" : face.kind === "veil" ? (pal ? "tile" : "veil") : face.kind;
  const faceSize = faceKind === "frost" || faceKind === "tile" ? 34 : kindred ? 28 : 24;

  /* ── the voice opening: one player, its link signed (or the demo's sample) ── */
  const voicePath = detail?.openingMedia ?? null;
  const signed = useSignedUrls("voice-letters", r.isDemo ? [] : [voicePath]);
  const voiceUrl = voicePath ? (r.isDemo ? demoMediaUrl(voicePath) : (signed[voicePath] ?? null)) : null;
  const voiceState = useRef<VoicePlayback | null>(null);
  const voice = useVoicePlayback({
    onChange: (s) => {
      voiceState.current = s;
      commands.send("playback", voiceArgs(s));
    },
  });
  // told again when the link changes (signed at last, re-signed) and when the app comes back
  const lastUrl = useRef(voiceUrl);
  useEffect(() => {
    if (voiceUrl === lastUrl.current) return;
    lastUrl.current = voiceUrl;
    commands.send("playback", voiceArgs(voiceState.current));
  }, [voiceUrl, commands]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") commands.send("playback", voiceArgs(voiceState.current));
    });
    return () => sub.remove();
  }, [commands]);
  const onVoice = (key: string) => {
    if (!voiceUrl) {
      // no signed link yet (offline): unavailable until it arrives
      commands.send("playback", { ...playbackCommandArgs(null), key, failed: true });
      return;
    }
    voice.toggle(key, voiceUrl, detail?.openingDurationS ?? null);
  };

  /* ── the hero ── */
  const heroRecord = useSame<KReaderHero | null>(
    hero && detail
      ? (() => {
          const voiceLetter = isVoiceLetter(hero, detail);
          const you = hero.mine ? t("ui.you") : "";
          return {
            key: r.heroKey,
            // the opening's paper (letters.paper); a reply has none
            paper: paperOverride ?? (isOpening(hero) ? paperOf(detail.openingPaper).id : "plain"),
            faceKind,
            faceUri: face.uri,
            faceKey: face.key,
            faceOverscan: face.overscan,
            faceMask: face.mask,
            faceFrost: face.frost ?? null,
            faceRound: kindred,
            faceSize,
            memberStamp: memberStamp || "",
            name: pal ? pal.name : "",
            mark: pal?.mark ?? null,
            sign: pal?.sign ?? null,
            // the postmark keeps the date; the name above is said once (YOU on your own letter)
            when: pal ? [heroDate, you].filter(Boolean).join(" · ") : "",
            // the number is what you call someone WITHOUT a name; once they have one it replaces it
            postmark: pal ? "" : postmarkLine(hero, detail, fmt),
            state: state?.label ?? "",
            tone: state?.toneKey ?? "mute",
            headA11y: pal ? [pal.spoken, heroDate, you, state?.label ?? ""].filter(Boolean).join(". ") : "",
            stampId: stamp || customId ? detail.stamp : "",
            stampHex: stamp?.color ?? custom?.hex ?? "",
            delivered: !hero.mine,
            stampLetterId: hero.id || detail.letterId || id || "",
            stampA11y: "",
            isVoice: voiceLetter,
            // the voice opening's card, as the hero or among the earlier letters (known bug 2)
            voiceKey: detail.openingMedia ? VOICE_KEY : "",
            voiceDuration: detail.openingMedia ? clock(detail.openingDurationS ?? 0) : "",
            body: voiceLetter ? hero.body : shown,
            size: tier.size,
            line: tier.line,
            center: tier.center,
            topic: stamp ? `#${sname(stamp.name).toLowerCase()}` : customTag && custom ? `#${customTag.toLowerCase()}` : "",
            topicHex: stamp ? stamp.color : custom ? custom.hex : "",
            translates: offerXl,
            translateCode: capsuleCode(letterLang(hero.body), lang.toUpperCase(), translated),
            translateLabel: xlBusy ? t("read.translating") : translated ? t("read.original") : t("read.invite"),
            translateBusy: xlBusy,
            betweenLabel: earlier.length > 0 ? t("th.between", { n: conv.length }) : "",
            hideLabel: t("th.hide"),
            replyLabel: canWrite ? t("ld.replyArrow") : "",
          };
        })()
      : null,
  );

  /* ── the earlier letters: once they have a name, everything they ever wrote is signed with it ── */
  const earlierRecords = useSame<KReaderLetter[]>(
    detail
      ? earlier.map((x) => {
          const signature = signatureOf(x, detail, fmt);
          return {
            key: letterLinkKey(x) || x.date,
            mine: x.mine,
            body: x.body,
            signature,
            isVoice: isVoiceLetter(x, detail),
            a11y: [signature, letterDate(x, detail, fmt), x.body].filter(Boolean).join(". "),
          };
        })
      : [],
  );
  const rev = useRev(earlierRecords);

  const strings = useSame<KReaderStrings>({
    title: r.title,
    backLabel: t("a11y.back"),
    moreLabel: flow.nobody ? "" : t("rp.menu.a11y"),
    offlineTitle: !detail && status === "offline" ? t("net.offline.title") : "",
    offlineBody: !detail && status === "offline" ? t("net.offline.body") : "",
    closed,
    composer: !!detail && !closed,
    placeholder: replyPlaceholder(detail, t, who, hasString),
    sendLabel: t("ld.send"),
    emojiLabel: t("cmp.emoji"),
    playLabel: t("vo.play"),
    pauseLabel: t("vo.pause"),
  });

  /* ── the composer: the send key and the hint, per keystroke ── */
  const canSend = replyCanSend(r.text, r.sending);
  useEffect(() => {
    commands.send("composer", { canSend, hint: hint.text, hintAlarm: hint.alarm });
  }, [commands, canSend, hint.text, hint.alarm]);

  /* what a remounted view must be told again: the words, the composer, the voice */
  live.current.reseed = () => {
    commands.send("setText", { target: "reply", value: r.text });
    commands.send("composer", { canSend, hint: hint.text, hintAlarm: hint.alarm });
    commands.send("playback", voiceArgs(voiceState.current));
  };

  const onSend = (value: string) => {
    // the reader's send is plain: the words stay until the letter went
    r.send(value, () => commands.send("setText", { target: "reply", value: "" }));
  };

  /* ── report / block: the card drops from the ⋯'s foot ── */
  const [reportTop, setReportTop] = useState<number | undefined>(undefined);
  const onMore = (top: number) =>
    blurThen(() => {
      setReportTop(top);
      flow.openMenu();
    }, ref);

  /* a stranger's photo stamp: Keep / Report, as KeepableStamp runs them */
  const onStamp = (action: "keep" | "report") => {
    if (!customId) return;
    const run = action === "keep" ? keepStampFlow(customId, { thread: id ?? null }) : reportStampFlow(customId, null);
    void run.then((line) => {
      if (line) r.setStampLine(line);
    });
  };

  const insets = useMemo(() => ({ top: topInset ?? safe.top, bottom: safe.bottom, tabBarRoom: 0 }), [topInset, safe.top, safe.bottom]);

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <SurfaceHost field>
        <KReaderView
          ref={commands.ref}
          theme={themeKey}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          hero={heroRecord}
          earlier={earlierRecords}
          strings={strings}
          onReaderBack={r.goBack}
          onReaderMore={onMore}
          onReaderTranslate={() => void r.doTranslate()}
          onReaderText={r.setText}
          onReaderSend={onSend}
          onReaderVoice={onVoice}
          onReaderStamp={onStamp}
        />
      </SurfaceHost>
      <ReportSheet flow={flow} top={reportTop} />
      {r.stampLine ? <Toast msg={r.stampLine} bottom={safe.bottom + 90} /> : null}
    </View>
  );
}
