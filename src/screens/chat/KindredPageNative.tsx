import { useCallback, useEffect, useMemo, useRef } from "react";
import { View, type AccessibilityActionEvent } from "react-native";
import { useNavigation, useRouter, type Href } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KKindredPageView, type KKindredPageFace, type KKindredPageStrings } from "../../../modules/kindredly-ui/src/KindredPage";
import { SurfaceHost } from "../../components/NativeSurface";
import { ReportSheet } from "../../components/ReportMenu";
import { useSignatureHold, type HoldAnchor } from "../../components/SignatureHold";
import { useReportFlow } from "../../lib/report-flow";
import { useThreadMute } from "../../lib/thread-mute";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { letterFitLines } from "../../theme/post";
import { archDescThird, archName, dimLabel, dimLineThird, dimSealedThird } from "../../lib/aura-copy";
import { dLong, localeTag, penPalName } from "../../lib/format";
import { theirLatest } from "../../lib/db";
import { useIdentityOn } from "../../lib/identity";
import { useThreadDetail } from "../../lib/thread-detail";
import { readCorrespondent, resonance } from "../../lib/correspondent";
import { getStamp, sname } from "../../data/stamps";
import { faceRecord, useFaceSource } from "../../lib/faces";
import { stampSpoken, useMemberStamps } from "../../lib/member-marks";
import { useIdentityFirstOn, useWhoBook } from "../../lib/who";
import { isCustomStampId, tagOf, useCustomStamps } from "../../lib/custom-stamps";
import { playbackCommandArgs } from "../../lib/voice-playback";
import { isVoiceLetter, readerLetters } from "./reader";
import { faceKind, firstMetAs, openingLetter, pageFace, talkTo, writingOf, type RouteBelow } from "./kindred-page";
import { buildKindredPageView } from "./kindred-page-view";
import { useOpeningVoiceRN } from "./VoiceOpeningRN";
import "../../data/strings-identity2"; // id2.kd.*, id2.rp.signature
import "../../data/strings-a11y-chat"; // kd.resA11y, kd.resTogether
import "../../data/strings-step5-kitrn"; // a11y.back
import "../../data/strings-step5-platform"; // rp.menu.a11y, vo.play, vo.pause

/* A KINDRED'S PAGE IN SWIFTUI (2026-10-27): one Host holding
   KKindredPageView, behind the "kindredpage" switch (app/kindred/[id],
   NativeSurface in mount mode). The React Native page
   (screens/chat/KindredPage) is the fallback, unchanged, and this host
   makes exactly its reads: the thread detail held offline-safe
   (useThreadDetail), what their letters told you and how alike you write
   (lib/correspondent over kindred-page writingOf), the stamp it began
   under (a photo stamp's #topic too), the face (lib/faces, their frosted
   window from the screen's book, their member stamp), the signature and
   FIRST MET AS (identity Phase 2), and the voice opening on the screen's
   one player (useOpeningVoiceRN; its transitions go to Swift as the
   playback command). Every word is kindred-page-view's.

   What stays in TypeScript: TALK TO's way (back when the room is
   underneath, kindred-page talkTo), the ⋯'s report card (ReportSheet, as
   the room's Swift header opens it), and the held signature's card
   (SignatureHold): Swift reports the slot it was held in, measured here
   from the view holding the Host, and VoiceOver's two actions on it.
   A block lands on Kindreds. Looking at the page doesn't mark anything
   read.

   MUTE (owner's audit, 2026-11-10; the "threadmute" switch, off): with it
   on, the ⋯'s card carries Mute / Unmute above Report and Block, the same
   answer the conversation shows (lib/thread-mute). Off, for a guest or on
   a demo thread, the card is what it was. */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function KindredPageNative({ id }: { id?: string }) {
  const lang = useLang();
  const router = useRouter();
  const navigation = useNavigation();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const isDemo = __DEV__ && !!id?.startsWith("demo-");
  const { detail, status } = useThreadDetail(id, { folds: false });
  const voice = useOpeningVoiceRN(detail, isDemo);
  const identity = useIdentityOn();
  // the book for the frost, and (Phase 2) the courier name under THE NAME THEY SIGNED
  const book = useWhoBook();
  const firstOnAt = useIdentityFirstOn(identity);
  const toKindreds = useCallback(() => router.replace("/(tabs)/kindreds"), [router]);
  // a held signature: Report this signature / Block, about the other side of this thread
  const hold = useSignatureHold({
    threadId: id,
    targetUser: detail && !detail.gone && detail.revealed ? detail.other : null,
    onBlocked: toKindreds,
  });
  const kind = detail ? faceKind(detail) : "veil";
  // the ⋯: the thread's report card, as ReportMenu opens it on the React Native page
  const report = useReportFlow({
    context: "thread",
    targetUser: detail && kind !== "veil" ? detail.other : undefined,
    refId: id,
    snapshot: theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening),
    onBlocked: toKindreds,
  });
  // Mute / Unmute in the ⋯'s card (null while the switch is off, for a guest, on a demo thread)
  const mute = useThreadMute(id, { demo: !!id?.startsWith("demo-"), someone: !report.nobody });

  const writing = useMemo(() => (detail ? writingOf(detail) : null), [detail]);
  const read = useMemo(() => (detail && writing ? readCorrespondent(writing.theirs, detail.revealed) : null), [detail, writing]);
  const res = useMemo(() => (detail?.revealed && writing ? resonance(writing.mine, writing.theirs) : null), [detail, writing]);
  const st = detail ? getStamp(detail.stamp) : null;
  /* a photo stamp it began under ("c:<uuid>"): its #topic is its name; Swift draws it from the registry this fills */
  const customId = detail && isCustomStampId(detail.stamp) ? detail.stamp : null;
  const custom = useCustomStamps(customId ? [customId] : [])(customId ?? "");
  const customName = custom ? tagOf(custom) : "";
  const opening = useMemo(() => openingLetter(readerLetters(detail)), [detail]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const locale = useMemo(() => localeTag(), [lang]);

  // switch on, a pen pal's frosted window (null off, for a kindred, and for no one)
  const frost = detail && pageFace(detail, identity) === "frost" ? book.frost(detail.other) : null;
  /* a member's face is a gold perforated stamp (C2); never a closed account */
  const stampUid = detail && kind !== "veil" && !detail.gone ? detail.other || null : null;
  const stamp = useMemberStamps([stampUid])(stampUid);
  // a kindred's picture: the face they gave, or the glyph (AvatarImage's)
  const picture = faceRecord(useFaceSource({ role: "kindred", seed: kind === "round" ? detail?.other : null, avatarId: kind === "round" ? (detail?.otherFace ?? null) : null }));

  const firstMet =
    detail && identity && detail.revealed
      ? firstMetAs(
          detail,
          (u) => book.name(u, { upper: true }),
          (u) => penPalName(u, { upper: true }),
          firstOnAt,
        )
      : null;
  const began = st && detail ? { name: sname(st.name), id: detail.stamp } : customId ? { name: customName ? `#${customName.toLowerCase()}` : "", id: customId } : null;

  const view = buildKindredPageView(
    {
      detail,
      status,
      identity,
      read,
      res,
      began,
      letterId: detail?.letterId || id || "",
      opening,
      openingVoice: isVoiceLetter(opening, detail),
      openingDuration: voice.voice?.duration ?? "",
      // the opening letter's five lines, six in a roomier face (SF Mono, Garamond)
      openingLines: letterFitLines(letterFont, 5),
      hasFrost: !!frost,
      canReport: !report.nobody,
      holdable: hold.can,
      firstMet,
    },
    { t, locale, dimLabel, dimLineThird, dimSealedThird, archName, archDescThird, dayLong: dLong },
  );

  const face = useSameContent<KKindredPageFace>({
    shape: view.face.shape,
    kind: picture.kind === "image" ? "image" : "placeholder",
    uri: picture.uri,
    key: picture.key,
    overscan: picture.overscan,
    mask: view.face.mask,
    frost: view.face.shape === "frost" ? frost : null,
    stamp: view.face.shape === "tile" || view.face.shape === "veil" ? "" : stamp,
    a11y: stamp && view.face.shape !== "tile" && view.face.shape !== "veil" ? stampSpoken(stamp, t) : "",
  });
  const strings = useSameContent<KKindredPageStrings>({
    title: view.title,
    backLabel: t("a11y.back"),
    // the ⋯ offers more than report and block once Mute is there
    moreLabel: view.moreLabel && mute.moreLabel ? mute.moreLabel : view.moreLabel,
    offlineTitle: t("net.offline.title"),
    offlineBody: t("net.offline.body"),
    missingBody: t("fail.closed.body"),
    playLabel: t("vo.play"),
    pauseLabel: t("vo.pause"),
    reportLabel: t("id2.rp.signature"),
    blockLabel: t("rp.menu.block"),
  });
  const person = useSameContent(view.person);
  const signed = useSameContent(view.signed);
  const learned = useSameContent(view.learned);
  const resonanceCard = useSameContent(view.resonance);
  const facts = useSameContent(view.facts);
  const openingCard = useSameContent(view.opening);
  const rev = useRev(strings, face, person, signed, learned, resonanceCard, facts, openingCard);

  /* the voice opening: the one player's transitions, and again whenever the view (re)attaches */
  const playback = useRef(voice.state);
  playback.current = voice.state;
  const commands = useKCommands(ref, { onViewAttach: () => commands.send("playback", playbackCommandArgs(playback.current)) });
  useEffect(() => {
    commands.send("playback", playbackCommandArgs(voice.state));
  }, [commands, voice.state]);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds")), [router]);
  const onTalk = () => {
    if (!id || !detail) return;
    const state = navigation.getState();
    const below: RouteBelow = state && state.index > 0 ? (state.routes[state.index - 1] as RouteBelow) : null;
    const go = talkTo(detail, id, below);
    if (go.kind === "back") router.back();
    else router.replace(go.href as Href);
  };

  // the held slot, measured from the view holding the Host: SignatureHold's anchor
  const wrap = useRef<View>(null);
  const onHold = (r: { x: number; y: number; width: number; height: number }) => {
    const anchor: HoldAnchor = {
      measureInWindow: (cb) => {
        const v = wrap.current;
        if (!v) return cb(NaN, NaN, r.width, r.height);
        v.measureInWindow((x, y) => cb(x + r.x, y + r.y, r.width, r.height));
      },
    };
    hold.open(anchor);
  };
  // VoiceOver's two actions on the signature, as the React Native page's accessibilityActions
  const onSignatureAction = (name: "report" | "block") => hold.onAction({ nativeEvent: { actionName: name } } as AccessibilityActionEvent);

  return (
    <View ref={wrap} collapsable={false} style={{ flex: 1 }}>
      <SurfaceHost>
        <KKindredPageView
          ref={commands.ref}
          theme={theme}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          strings={strings}
          state={view.state}
          face={face}
          person={person}
          signed={signed}
          learned={learned}
          resonance={resonanceCard}
          facts={facts}
          opening={openingCard}
          voiceUnavailable={!voice.url}
          talk={view.talk}
          onBack={back}
          onMore={report.openMenu}
          onTalk={onTalk}
          onVoice={voice.toggle}
          onHold={onHold}
          onSignatureAction={onSignatureAction}
        />
      </SurfaceHost>
      {/* the ⋯'s card, just under the bar (ReportSheet's own default place) */}
      <ReportSheet flow={report} mute={mute.item} />
      {/* the card under a held signature (window-level) */}
      {hold.sheet}
    </View>
  );
}
