import { useEffect, useMemo, useRef } from "react";
import { View, useWindowDimensions } from "react-native";
import { useIsFocused, useRouter } from "expo-router";
import { KIsland, useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KWrenRoomView, type KWrenRoomChip, type KWrenRoomCommands, type KWrenRoomRow, type KWrenRoomStrings } from "../../../modules/kindredly-ui/src/WrenRoom";
import type { KChatTrace } from "../../../modules/kindredly-ui/src/Conversation";
import { SurfaceHost } from "../../components/NativeSurface";
import { SignUpSheet, openSignUpSheet } from "../../components/SignUpSheet";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { ReelSquare } from "../../components/ReelSquare";
import { PostMediaSquare } from "../../components/PostMediaSquare";
import { useSwiftIsland } from "../../components/swift-island";
import type { KPostMediaSlot } from "../../../modules/kindredly-ui/src/MediaPieces";
import type { Reel } from "../../components/guide-reel/kit";
import { GUIDE_HREF, reelOf } from "../../components/guide-reel";
import { useReelSpecs } from "../../components/guide-reel/swift-reels";
import { newsCardOf, newsIdOf, newsReelOf } from "../../components/news-reel";
import { GUIDES, GUIDE_BY_ID, isGuideId, type GuideId } from "../../data/guides";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { dShort } from "../../lib/format";
import { blurThen } from "../../lib/keyboard";
import { useWrenName } from "../../lib/wren-name";
import { useBirdImageRef } from "../../lib/bird-images";
import { useSignedImageRefs } from "../../lib/images";
import { OFFICIAL_NAME, postText, type WrenPostMedia } from "../../lib/wren-desk";
import "../../data/strings-step5-kitrn"; // a11y.back
import { FIRST_CHIPS, wrenItemKey, wrenRoomRows, type WrenSpeakerWords } from "./wren-room-model";
import { useWrenRoom, type WrenRoomUi } from "./useWrenRoom";

/* WREN'S ROOM IN SWIFTUI (2026-10-27): one Host (keeping the keyboard's
   safe area) holding KWrenRoomView, behind the "wrenroom" switch
   (app/room/wren, NativeSurface in mount mode; off by default). The React
   Native room stays the fallback. Everything it decides is useWrenRoom's
   (the loads, the phone's answers, what goes to the makers, the sign-up
   that resumes a send) and wren-room-model's (the transcript, its
   speakers, its day rules); this words each row and wires the taps.

   · the reels stay React Native: each card's square is a KIsland named
     "reel:<row key>" holding ReelSquare with the guide's or the release's
     reel, sized here to the card's inside (the React Native card's: at
     most 360 wide in the 22 gutters, less its 1pt edge). Swift draws the
     card around it, its words and its button. Behind the "reels" switch
     (batch 3, off by default) a reel the Swift player draws goes on the
     card's record instead (components/guide-reel/swift-reels) and its
     island is left out.
   · the field is Swift's: its words come here with every edit; canSend
     goes as the composer command; setText empties it after her answer or
     a mail that went; focus gives it the keyboard for a bug or an idea.
   · the reader's own new line (their mail, her answer, a guide asked for)
     is brought into view wherever they were: scrollTo end once the row is
     in. Otherwise Swift follows the end only while at it.
   · the sign-up sheet and the photo lightbox stay React Native beside the
     Host, the keyboard out of the way first (blurThen), as before every
     alert, the picker and a push.
   · a post's picture or film (0050) is a PostMediaSquare island too, unless
     the "postmedia" switch says Swift draws it (batch 3, 2026-11-09, off by
     default; components/swift-island, marker KPostMediaView): then the view
     gets the square as `media` (KPostMediaSquare: the same fill, animation,
     muted loop and Reduce Motion rule) and the island isn't rendered. */

/** the React Native card's widest */
const CARD_MAX = 360;
/** the transcript's gutters, both sides */
const GUTTERS = 44;

type ReelSlot = { slot: string; reel: Reel; label: string };
/** a post's picture or short film (0050), drawn in the card's square as a React Native island */
type MediaSlot = { slot: string; media: WrenPostMedia };
/** what a row's taps need: the guide or the release behind its card, its picture, its link, the question she guessed from */
type RowTarget = { href: string | null; photo: string | null; link: string | null; question: string | null };

export function WrenRoomNative({ onBack, paneWidth }: { /** held on the Kindreds tab's right page (a folding phone): back closes it there */ onBack?: () => void; /** …and the page's own width, where the window is wider than the room */ paneWidth?: number } = {}) {
  const lang = useLang();
  const router = useRouter();
  const { key: theme, t: tk } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const win = useWindowDimensions();
  const width = paneWidth ?? win.width;
  const wren = useWrenName();
  const ref = useRef<KScreenHandle>(null);
  const reseed = useRef(() => {});
  const commands = useKCommands<KWrenRoomCommands>(ref, { blurOnUnmount: true, onViewAttach: () => reseed.current() });
  const bird = useBirdImageRef("official");
  const emptyBird = useBirdImageRef("officialCurious");

  /* the reader's own new line: brought into view once its row is in */
  const ownPending = useRef(false);
  const ui = useMemo<WrenRoomUi>(
    () => ({
      ownLine: () => {
        ownPending.current = true;
      },
      cleared: () => commands.send("setText", { target: "body", value: "" }),
      focusField: () => commands.send("focus", { target: "body" }),
      thenModal: (fn) => blurThen(fn, ref),
      openSignUp: (show) => openSignUpSheet(show, ref),
    }),
    [commands],
  );
  const m = useWrenRoom(ui);

  const lastKey = m.stream.length ? wrenItemKey(m.stream[m.stream.length - 1]) : "";
  useEffect(() => {
    if (!ownPending.current) return;
    ownPending.current = false;
    commands.send("scrollTo", { key: "end", animated: true });
  }, [lastKey, commands]);

  useEffect(() => {
    commands.send("composer", { canSend: m.canSend });
  }, [commands, m.canSend]);
  /* a remounted view starts empty: the words and whether they may go */
  reseed.current = () => {
    commands.send("setText", { target: "body", value: m.text });
    commands.send("composer", { canSend: m.canSend });
  };

  const words = useMemo<WrenSpeakerWords>(
    () => ({
      you: t("ui.you"),
      wren: OFFICIAL_NAME.toUpperCase(),
      bug: t("wo.bug.t").toUpperCase(),
      idea: t("wo.idea.t").toUpperCase(),
      event: t("wo.kind.event"),
      note: t("wo.kind.note"),
    }),
    // every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
  const facts = useMemo(() => wrenRoomRows(m.stream, words, (at) => dShort(at).toUpperCase()), [m.stream, words]);

  /* the pictures you sent, signed and keyed by their storage path */
  const photoPaths = useMemo(() => m.mail.filter((x) => x.mediaPath).map((x) => x.mediaPath as string), [m.mail]);
  const photos = useSignedImageRefs("moments", photoPaths);

  const cardWidth = Math.max(0, Math.min(CARD_MAX, width - GUTTERS));
  const reelSide = Math.max(0, cardWidth - 2);

  const built = useMemo(() => {
    const rows: KWrenRoomRow[] = [];
    const reels: ReelSlot[] = [];
    const medias: MediaSlot[] = [];
    const targets = new Map<string, RowTarget>();
    const guideBody = (g: GuideId) => GUIDE_BY_ID[g].frames.map((_, n) => t(`gd.${g}.f${n + 1}`, { wren })).join(" ");
    for (const f of facts) {
      const it = f.item;
      const base = {
        key: f.key,
        dayLabel: f.dayLabel,
        first: f.first,
        label: f.label,
        labelMine: f.labelMine,
        labelUnderDay: f.labelUnderDay,
        question: f.question,
        answerLabel: f.answerLabel,
        mine: f.mine,
      };
      const slot = `reel:${f.key}`;
      if (it.type === "local") {
        const a = it.local.answer;
        const g = a.guide;
        if (g) reels.push({ slot, reel: reelOf(g), label: t(`gd.${g}.title`) });
        rows.push({
          ...base,
          body: a.kind === "text" ? a.text : "",
          hasPhoto: false,
          photo: null,
          link: "",
          card: g
            ? { slot, title: t(`gd.${g}.title`), body: guideBody(g), cta: t(`gd.${g}.cta`), notIt: it.local.q ? t("gd.notIt") : "", sendOn: t("gd.sendOn") }
            : null,
        });
        targets.set(f.key, { href: g ? GUIDE_HREF[g] : null, photo: null, link: null, question: it.local.q });
        continue;
      }
      const photo = it.type === "mail" && it.mail.mediaPath ? it.mail.mediaPath : null;
      const body = it.type === "post" ? postText(it.post) : it.type === "reply" ? it.mail.reply || "" : it.mail.body;
      /* a release's reel plays right under its post; a reel this build doesn't ship leaves the
         words alone, with no dead button */
      const newsId = it.type === "post" ? newsIdOf(it.post.link) : null;
      const news = newsId ? newsCardOf(newsId) : null;
      const newsReel = newsId ? newsReelOf(newsId) : null;
      if (news && newsReel) reels.push({ slot, reel: newsReel, label: body.split("\n")[0] });
      const link = it.type === "post" && !newsId && it.post.link ? it.post.link : null;
      /* a post with a picture or a film (0050) and no release reel: a card like a release's, the
         media in the square, the first line its title, Open going to the link or the full file */
      const media = it.type === "post" && !(news && newsReel) ? it.post.media : null;
      if (media) {
        medias.push({ slot, media });
        const [head, ...rest] = body.split("\n");
        rows.push({ ...base, body: "", hasPhoto: false, photo: null, link: "", card: { slot, title: head, body: rest.join("\n").trim(), cta: `${t("wo.open")} ›`, notIt: "", sendOn: "" } });
        targets.set(f.key, { href: null, photo: null, link: link || media.url, question: null });
        continue;
      }
      rows.push({
        ...base,
        body,
        hasPhoto: !!photo,
        photo: photo ? photos[photo] ?? null : null,
        link: link ? `${t("wo.open")} ›` : "",
        card: news && newsReel ? { slot, title: t(news.title), body: t(news.body), cta: t(news.cta), notIt: "", sendOn: "" } : null,
      });
      targets.set(f.key, { href: news ? news.href : null, photo, link, question: null });
    }
    return { rows, reels, medias, targets };
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, photos, wren, lang]);

  const chips = useMemo<KWrenRoomChip[]>(
    () => (m.allChips ? GUIDES.map((g) => g.id) : FIRST_CHIPS).map((id) => ({ id, title: t(`gd.${id}.title`) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.allChips, lang],
  );

  /* what you hand the makers, on the kindred room's coloured cards: a picture on low's blue, a bug
     on tired's lilac, an idea on happy's yellow */
  const traces = useMemo<KChatTrace[]>(
    () => [
      { key: "photo", glyph: "photo", title: t("wo.photo.t"), subtitle: "", tint: "low" },
      { key: "bug", glyph: "bug", title: t("wo.bug.t"), subtitle: "", tint: "tired" },
      { key: "idea", glyph: "idea", title: t("wo.idea.t"), subtitle: "", tint: "happy" },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  const hasMail = m.mail.length > 0;
  const strings = useMemo<KWrenRoomStrings>(
    () => ({
      name: OFFICIAL_NAME,
      role: t("wo.role").toUpperCase(),
      backLabel: t("a11y.back"),
      emptyLine: t("wo.empty"),
      chipsHead: t("gd.chips.head"),
      moreLabel: m.allChips ? "" : t("gd.chips.more"),
      mailNote: hasMail ? t("wo.mailNote") : "",
      photoOpen: t("ph.open"),
      placeholder: m.mode === "bug" ? t("wo.bug.ph") : m.mode === "idea" ? t("wo.idea.ph") : t("wo.ph"),
      modeLabel: m.mode ? (m.mode === "bug" ? t("wo.bug.t") : t("wo.idea.t")).toUpperCase() : "",
      modeCloseLabel: t("wren.trackClose"),
      // the ⊕ says what it holds (the React Native room's had no name)
      plusLabel: [t("wo.photo.t"), t("wo.bug.t"), t("wo.idea.t")].join(", "),
      plusCloseLabel: t("wren.trackClose"),
      sendLabel: t("ld.send"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, m.allChips, hasMail, m.mode],
  );
  /* batch 3 (behind "reels"): a reel Swift draws goes on its card's record and its island is left
     out; the rest stay React Native islands (components/guide-reel/swift-reels) */
  const focused = useIsFocused();
  const reelSpecs = useReelSpecs(built.reels, focused);
  const rows = useMemo(
    () => (reelSpecs.size ? built.rows.map((r) => (r.card && reelSpecs.has(r.card.slot) ? { ...r, card: { ...r.card, reel: reelSpecs.get(r.card.slot) } } : r)) : built.rows),
    [built.rows, reelSpecs],
  );
  const islandReels = useMemo(() => built.reels.filter((r) => !reelSpecs.has(r.slot)), [built.reels, reelSpecs]);
  const rev = useRev(rows, chips, traces);

  // batch 3: postmedia — the squares Swift draws itself, once its gate has opened
  const mediaIn = useSwiftIsland("postmedia", "KPostMediaView", built.medias.length > 0);
  const swiftMedia = useMemo<KPostMediaSlot[] | undefined>(
    () => (mediaIn === "swift" ? built.medias.map((r) => ({ slot: r.slot, url: r.media.url, kind: r.media.kind })) : undefined),
    [mediaIn, built.medias],
  );

  const target = (key: string) => built.targets.get(key) ?? null;
  const back = () => blurThen(() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds")), ref, { delayMs: 0 });
  const onCardCta = (key: string) => {
    const tg = target(key);
    if (tg?.href) blurThen(() => router.push(tg.href as never), ref, { delayMs: 0 });
    else if (tg?.link) m.openLink(tg.link);
  };
  const onPhoto = (key: string) => {
    const path = target(key)?.photo;
    if (path) blurThen(() => m.setPhotoFull({ path }), ref);
  };
  const onLink = (key: string) => {
    const link = target(key)?.link;
    if (link) m.openLink(link);
  };
  const onNotIt = (key: string) => {
    const q = target(key)?.question;
    if (q) m.notIt(q);
  };
  const onChip = (id: string) => {
    if (isGuideId(id)) m.pickGuide(id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <SurfaceHost field>
        <KWrenRoomView
          ref={commands.ref}
          theme={theme}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          strings={strings}
          bird={bird}
          emptyBird={emptyBird}
          rows={rows}
          chips={chips}
          traces={traces}
          cardWidth={cardWidth}
          onBack={back}
          onText={m.setText}
          onSend={(text) => void m.send({ body: text })}
          onModeClose={() => m.setMode(null)}
          onHand={m.onHand}
          onPhoto={onPhoto}
          onLink={onLink}
          onCardCta={onCardCta}
          onNotIt={onNotIt}
          onChip={onChip}
          onMore={() => m.setAllChips(true)}
          media={swiftMedia}
        >
          {/* every reel on every render, in the transcript's order; a tap starts it over */}
          {/* batch 3: none while Swift draws them (postmedia), or while its gate is opening */}
          {(mediaIn === "rn" ? built.medias : []).map((r) => (
            <KIsland key={r.slot} name={r.slot} interactive style={{ width: reelSide, height: reelSide, borderTopLeftRadius: 17, borderTopRightRadius: 17, overflow: "hidden" }}>
              <PostMediaSquare media={r.media} />
            </KIsland>
          ))}
          {islandReels.map((r) => (
            <KIsland key={r.slot} name={r.slot} interactive style={{ width: reelSide, height: reelSide, borderTopLeftRadius: 17, borderTopRightRadius: 17, overflow: "hidden" }}>
              <ReelSquare reel={r.reel} label={r.label} />
            </KIsland>
          ))}
        </KWrenRoomView>
      </SurfaceHost>
      <PhotoLightbox photo={m.photoFull} onClose={() => m.setPhotoFull(null)} />
      <SignUpSheet open={m.needsAccount} reason={t("wo.signup.reason")} onClose={() => m.setNeedsAccount(false)} onSignedIn={m.onSignedIn} />
    </View>
  );
}
