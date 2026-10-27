import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { getLang, t } from "../../lib/i18n";
import { alertFail } from "../../lib/fail";
import { useAuth } from "../../lib/auth";
import { markRoomSeen } from "../../lib/room-seen";
import { setDeskWaiting } from "../../lib/waiting";
import { uploadMoment } from "../../lib/db";
import type { LightboxPhoto } from "../../components/PhotoLightbox";
import { answerFor, fetchAnswers, readAnswersCache, type Answer } from "../../lib/wren-answers";
import { isGuideId, type GuideId } from "../../data/guides";
import { stallReport } from "../../lib/stall-probe";
import { looksBroken } from "../../lib/wren-match";
import {
  WREN_ROOM,
  fetchWrenMail,
  fetchWrenPosts,
  keepLocal,
  readLocal,
  readMailCache,
  readPostsCache,
  sendWrenMail,
  type WrenLocal,
  type WrenMail,
  type WrenMailKind,
  type WrenPost,
} from "../../lib/wren-desk";
import { DEMO_WREN_POSTS } from "../../data/demo";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { buildWrenStream, guideSlugOf, type WrenRoomItem } from "./wren-room-model";

/* WREN'S ROOM, ITS STATE AND ITS SENDS — for the Swift room (WrenRoomNative).
   ────────────────────────────────────────────────────────────────────────
   The React Native room (app/room/wren.tsx, the "wrenroom" switch's
   fallback) holds the same rules inline, and both build the transcript and
   its speakers from wren-room-model. A change to what is loaded, what is
   matched on the phone, what goes to the makers or how a sign-up resumes a
   send belongs in both until the React Native room retires.

   · loaded on every focus: the phone's copy of her posts (and of your mail
     when signed in), then the network; her answers' table refreshed for the
     matcher. Dev store mode: the screenshots' one welcome post.
   · what is in front of you is what you have seen: her posts mark the room
     seen and take her desk off the tab's number.
   · a guide asked for by link (?guide=, a post's "see how", a push) opens
     itself at the foot of the room, once.
   · a plain line is looked up on the phone first (lib/wren-answers): a hit
     is answered at once and kept on this phone; a miss, a bug or an idea goes
     to the makers (a bug carries the phone's diagnostics, and a note that
     reads as something broken counts as a bug). A guest, or an account the
     server doesn't know, gets the sign-up sheet, and the words go on once
     signed in.
   · the ⊕'s three: a picture (any picture: a screenshot for the people who
     can fix what is in it), a bug and an idea (a mode on the field).

   What only a renderer can do comes in as `ui`: bring the reader's own new
   line into view, empty the field, give it the keyboard, and get the
   keyboard out of the way before an alert, the picker or a sheet. */

export type WrenRoomUi = {
  /** something of the reader's own went in (their mail, her answer): bring it into view wherever they were */
  ownLine: () => void;
  /** the room emptied the field (her answer, a mail that went) */
  cleared: () => void;
  /** a bug or an idea was picked: the field takes the keyboard */
  focusField: () => void;
  /** the keyboard out of the way first, then fn (an alert, the photo picker) */
  thenModal: (fn: () => void) => void;
  /** opens the sign-up sheet the way the room does (lib/keyboard first) */
  openSignUp: (show: () => void) => void;
};

/** what the ⊕ hands the makers */
export type WrenHand = "photo" | "bug" | "idea";

export function useWrenRoom(ui: WrenRoomUi) {
  const params = useLocalSearchParams<{ guide?: string }>();
  const { isGuest } = useAuth();
  const [posts, setPosts] = useState<WrenPost[]>([]);
  const [mail, setMail] = useState<WrenMail[]>([]);
  const [local, setLocal] = useState<WrenLocal[]>([]);
  const [text, setText] = useState("");
  const [photoFull, setPhotoFull] = useState<LightboxPhoto>(null);
  const [sending, setSending] = useState(false);
  const [needsAccount, setNeedsAccount] = useState(false);
  const [allChips, setAllChips] = useState(false);
  const [mode, setMode] = useState<Exclude<WrenMailKind, "note" | "photo"> | null>(null);
  const pendingSend = useRef<string | null>(null);
  // the renderer's callbacks, read at call time
  const uiRef = useRef(ui);
  uiRef.current = ui;

  const load = useCallback(() => {
    let alive = true;
    if (!(__DEV__ && storeMode)) readPostsCache().then((c) => alive && c.length && setPosts(c));
    // merge, don't replace: a guide opened by link can land before this read returns
    readLocal().then((l) => alive && setLocal((cur) => [...l, ...cur.filter((c) => !l.some((x) => x.id === c.id))]));
    if (!isGuest) readMailCache().then((c) => alive && c.length && setMail(c));
    if (__DEV__ && storeMode) {
      setPosts([{ ...DEMO_WREN_POSTS[0], body: DEMO_TEXT[getLang()].welcome, at: new Date(Date.now() - 2 * 3600_000).toISOString() }]);
    } else
      fetchWrenPosts().then((p) => {
        if (!alive) return;
        if (p) setPosts(p);
        else if (__DEV__) setPosts((cur) => (cur.length ? cur : DEMO_WREN_POSTS));
      });
    if (!isGuest) fetchWrenMail().then((m) => alive && m && setMail(m));
    void fetchAnswers();
    return () => {
      alive = false;
    };
  }, [isGuest]);
  useFocusEffect(load);

  /* what is in front of you is what you have seen — and the tab's number stops counting her
     desk now, not the next time Kindreds is opened */
  useEffect(() => {
    if (!posts.length) return;
    void markRoomSeen(WREN_ROOM, posts.length);
    setDeskWaiting(0);
  }, [posts.length]);

  const stream = useMemo<WrenRoomItem[]>(() => buildWrenStream(posts, mail, local), [posts, mail, local]);
  const canSend = text.trim().length > 0 && !sending;

  /* her own answer, kept on this phone */
  const show = async (answer: Answer, q: string | null) => {
    const item: WrenLocal = { id: Date.now(), q, answer, at: new Date().toISOString() };
    uiRef.current.ownLine(); // her answer is brought into view wherever you were
    setLocal((l) => [...l, item]);
    await keepLocal(item);
  };

  /* a guide asked for by link — a post's "see how", or a push — opens itself at the foot of the
     room, once */
  const linked = useRef<string | null>(null);
  useEffect(() => {
    const g = params.guide;
    if (!isGuideId(g) || linked.current === g) return;
    linked.current = g;
    void show({ kind: "guide", guide: g }, __DEV__ && storeMode ? DEMO_TEXT[getLang()].ask : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.guide]);

  const askAccount = () => uiRef.current.openSignUp(() => setNeedsAccount(true));

  const post = async (body: string, kind: WrenMailKind, mediaPath: string | null = null): Promise<boolean> => {
    if (isGuest) {
      pendingSend.current = body;
      askAccount();
      return false;
    }
    setSending(true);
    const r = await sendWrenMail(body, kind, mediaPath);
    setSending(false);
    if (r === true) {
      uiRef.current.ownLine(); // your own mail is brought into view
      setMail((m) => [...m, { id: -Date.now(), kind, body, mediaPath, at: new Date().toISOString(), reply: null, repliedAt: null }]);
      void fetchWrenMail().then((m) => m && setMail(m));
      return true;
    }
    if (r === "unauthorized") {
      pendingSend.current = body;
      askAccount();
    } else {
      uiRef.current.thenModal(() => alertFail(t("wo.fail.title"), t("wo.fail.body")));
    }
    return false;
  };

  const clearField = () => {
    setText("");
    uiRef.current.cleared();
  };

  const send = async (opts: { makers?: boolean; body?: string } = {}) => {
    const body = (opts.body ?? text).trim();
    if (!body || sending) return;
    /* a plain line is looked up first; a bug or an idea is for people */
    if (!mode && !opts.makers) {
      const hit = answerFor(body, await readAnswersCache());
      if (hit) {
        clearField();
        await show(hit, body);
        return;
      }
    }
    /* a bug brings the phone's own evidence with it (lib/stall-probe); a note that reads as
       something broken counts as a bug too */
    const kind: WrenMailKind = mode ?? (looksBroken(body, getLang()) ? "bug" : "note");
    const full = kind === "bug" ? `${body}\n\n— diagnostics —\n${stallReport()}`.slice(0, 2000) : body;
    const ok = await post(full, kind);
    if (ok) {
      clearField();
      setMode(null);
    }
  };

  /* any picture, no ration: a screenshot for the people who can fix what is in it */
  const sendPhoto = async () => {
    if (sending) return;
    if (isGuest) {
      askAccount();
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setSending(true);
    const path = await uploadMoment(res.assets[0].uri);
    setSending(false);
    if (!path) {
      uiRef.current.thenModal(() => alertFail(t("wo.fail.title"), t("wo.fail.body")));
      return;
    }
    await post(t("wo.photo.fallback"), "photo", path);
  };

  /** a card of the ⊕'s tray: a picture opens the picker; a bug or an idea is a mode on the field,
      which takes the keyboard */
  const onHand = (kind: string) => {
    if (kind === "photo") {
      uiRef.current.thenModal(() => void sendPhoto());
      return;
    }
    if (kind === "bug" || kind === "idea") setMode(kind);
    uiRef.current.focusField();
  };

  /** a guide chip */
  const pickGuide = (g: GuideId) => void show({ kind: "guide", guide: g }, null);

  /** a post's link: a guide in the app opens here; anything else in the browser */
  const openLink = (url: string) => {
    const g = guideSlugOf(url);
    if (isGuideId(g)) {
      void show({ kind: "guide", guide: g }, null);
      return;
    }
    uiRef.current.thenModal(() => void Linking.openURL(url));
  };

  /** the guess was wrong: the same words go on to people */
  const notIt = (q: string) => void post(q, "note");

  /** the sign-up sheet signed someone in: what was waiting goes to the makers */
  const onSignedIn = () => {
    setNeedsAccount(false);
    const body = pendingSend.current;
    pendingSend.current = null;
    if (body) void send({ makers: true, body });
  };

  return {
    stream,
    mail,
    text,
    setText,
    sending,
    canSend,
    mode,
    setMode,
    allChips,
    setAllChips,
    needsAccount,
    setNeedsAccount,
    photoFull,
    setPhotoFull,
    send,
    onHand,
    pickGuide,
    openLink,
    notIt,
    onSignedIn,
  };
}
