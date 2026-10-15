import { useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, Keyframe, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused, useNavigation } from "expo-router";
import { MONO, PF } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { letterFamily, useLetterFamily, useTheme } from "../../lib/theme";
import { useLang } from "../../lib/i18n";
import { playbackPosition } from "../../lib/voice-playback";
import type { PoolLetter } from "../../lib/db";
import { TabHeader } from "../../components/TabHeader";
import { DeskStrip } from "../../components/WrenDesk";
import { MosaicId } from "../../components/MosaicId";
import { StampTile } from "../../components/StampTile";
import { AudioCardView } from "../../components/AudioCard";
import { SignalChip } from "../../components/SignalChip";
import { CloseOfDay } from "../../components/CloseOfDay";
import { LetterInFlight } from "../../components/LetterInFlight";
import { WrenBird } from "../../components/WrenBird";
import { useTabBarSpace } from "../../components/NativeTabBar";
import { InkPanel, ReplyStrip, TopicTag, TranslateCapsule, type ReplyStripHandle } from "../../components/10a";
import { overflows, type CardVM, type EnvelopeState } from "./today-cards";
import type { TodayModel } from "./useTodayDesk";

/* THE TODAY TAB IN REACT NATIVE — the remote switch's fallback (10a step 5).
   The old Today, moved here, painted from the theme and fed by the same
   model as the SwiftUI desk (useTodayDesk), so a flip of the "today" row
   changes how the desk is drawn and nothing about what it does: the same
   cards (today-cards: the docket, the topic tag in the stamp's channel
   colours, ONE capsule where translation wins, the voice block that never
   draws its caption as the letter), the same plate (blank while loading,
   CLOSED on a quiet day — which keeps its plate and strip now — ALL READ
   at the end), the same send with every outcome, the same one voice player
   (a letter no longer plays on after a swipe), the same report / block,
   reader and sheets (drawn by the route, over either renderer).

   What stays its own is the drawing: a paging ScrollView, one letter per
   page; the 10a reply strip (uncontrolled, keyed by the letter so each one
   keeps its own words; Return is a new line); the arrival in React Native;
   the blind as the last page with its cord freezing the pager. */

const WINDOW_H = Dimensions.get("window").height;
const WINDOW_W = Dimensions.get("window").width;

/* the first of what she brought back opens the way your letter folded, in reverse */
const UNFOLD = new Keyframe({
  0: { opacity: 0.5, transform: [{ scaleY: 0.55 }] },
  100: { opacity: 1, transform: [{ scaleY: 1 }] },
})
  .duration(520)
  .delay(140);

export function TodayRN({ model }: { model: TodayModel }) {
  useLang();
  const { t: tk } = useTheme();
  const { view, act } = model;
  const tabH = useTabBarSpace();
  const focused = useIsFocused();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const strip = useRef<ReplyStripHandle>(null);
  const [vh, setVh] = useState(WINDOW_H - 250);
  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {
    const s = Keyboard.addListener("keyboardWillShow", () => setKbOpen(true));
    const h = Keyboard.addListener("keyboardWillHide", () => setKbOpen(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  /* the page height moves (the arrival folds, the keyboard rises) and a
     paged ScrollView keeps its OFFSET, not its page: re-seat the page */
  const idxRef = useRef(view.idx);
  idxRef.current = view.idx;
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: idxRef.current * vh, animated: false });
  }, [vh]);

  // the model's scroll requests (an envelope, the day turning, the tab pressed again)
  const served = useRef(view.scroll.serial);
  useEffect(() => {
    if (view.scroll.serial === served.current) return;
    served.current = view.scroll.serial;
    const i = view.scroll.target === "top" ? 0 : Math.max(0, view.feed.findIndex((l) => l.id === view.scroll.target));
    scrollRef.current?.scrollTo({ y: i * vh, animated: view.scroll.animated });
  }, [view.scroll, view.feed, vh]);

  // after letters leave (a block can take several), the page follows the model's index
  const anchored = useRef(view.anchor.serial);
  useEffect(() => {
    if (view.anchor.serial === anchored.current) return;
    anchored.current = view.anchor.serial;
    scrollRef.current?.scrollTo({ y: view.idx * vh, animated: false });
  }, [view.anchor, view.idx, vh]);

  useEffect(() => {
    const nav = navigation as unknown as { addListener?: (t: string, cb: () => void) => () => void; isFocused?: () => boolean };
    if (!nav.addListener) return;
    return nav.addListener("tabPress", () => {
      if (nav.isFocused?.()) act.toTop();
    });
  }, [navigation, act]);

  const blindActive = focused && view.idx >= view.feed.length - 1;
  const blind = (
    <CloseOfDay sealed={view.sealed} facts={view.facts} onSeal={act.seal} onGrab={act.grab} active={blindActive} />
  );

  if (view.quiet) {
    // nothing waiting — the close of the day, under its plate (CLOSED) and her strip
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
        <TabHeader title={view.strings.title} rightLabel={view.plateRight} />
        <DeskStrip />
        <View style={{ flex: 1, paddingBottom: tabH }}>{blind}</View>
      </SafeAreaView>
    );
  }

  const current = view.current;
  const { state } = view.reply;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
      <TabHeader title={view.strings.title} rightLabel={view.plateRight} />
      <DeskStrip />
      <ArrivalRN open={view.arrival.open} line={view.arrival.line} states={view.arrival.states} labels={view.arrival.labels} values={view.arrival.values} onGoto={act.goto} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1 }} onLayout={(e) => setVh(e.nativeEvent.layout.height)}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            pagingEnabled
            scrollEnabled={!view.held}
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => act.settle(Math.round(e.nativeEvent.contentOffset.y / vh))}
          >
            {view.cards.map((card, i) => (
              <Animated.View key={card.id + (view.freshUnfold && i === 0 ? ":fresh" : "")} entering={view.freshUnfold && i === 0 ? UNFOLD : undefined}>
                <LetterPageRN card={card} letter={view.feed[i]} height={vh} model={model} onReply={() => strip.current?.focus()} />
              </Animated.View>
            ))}
            {/* the blind, once the desk has answered: never "the day is over" while we're still asking */}
            {view.loaded && <View style={{ height: vh, backgroundColor: tk.bg }}>{blind}</View>}
          </ScrollView>
        </View>

        {/* one reply bar, bound to the letter you're on, always the same height */}
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: kbOpen ? 10 : tabH + 6 }}>
          {!view.atEnd && current ? (
            <View style={{ minHeight: 78 }}>
              {view.sending ? (
                <LetterInFlight to={view.flyTo} slow={view.slow} />
              ) : (
                <>
                  <ReplyStrip
                    // each letter keeps its own words; a draft written in the reader comes back with it
                    key={`${current.id}:${view.draftEpoch}`}
                    ref={strip}
                    placeholder={view.strings.placeholder}
                    sendLabel={view.strings.send}
                    initialText={model.draftFor(current.id)}
                    canSend={state.ok && !view.sending}
                    held={state.pouchFull}
                    returnSends={false}
                    onChangeText={(v) => act.changeDraft(current.id, v)}
                    // the words stay until the letter leaves the desk (a failed send keeps them)
                    onSend={(v) => {
                      act.send(current.id, v);
                      return false;
                    }}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 1.4, color: state.hintWarn ? BRAND.postRed : tk.sub, marginTop: 8, marginLeft: 2 }}>{state.hint}</Text>
                </>
              )}
            </View>
          ) : (
            <View style={{ minHeight: 78 }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── one letter, a page ── */

function LetterPageRN({ card, letter, height, model, onReply }: { card: CardVM; letter: PoolLetter; height: number; model: TodayModel; onReply: () => void }) {
  const { t: tk } = useTheme();
  const face = useLetterFamily();
  const italic = useLetterFamily(true);
  const { act, view } = model;
  const s = view.strings;
  const [frameH, setFrameH] = useState(0);
  const [textH, setTextH] = useState(0);
  const folded = !card.isVoice && overflows({ text: card.body, size: card.bodySize, line: card.bodyLine, width: WINDOW_W - 92, frameH, textH });
  const text = { fontSize: card.bodySize, lineHeight: card.bodyLine, color: tk.ink, textAlign: card.bodyCenter ? ("center" as const) : ("auto" as const) };

  return (
    <View style={{ height, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
      <InkPanel
        variant="today"
        style={{ flex: 1, marginRight: 6, marginBottom: 6 }}
        contentStyle={{ flex: 1 }}
      >
        <View
          accessible
          accessibilityLabel={card.a11yLabel}
          accessibilityActions={[
            { name: "reply", label: s.replyA11y },
            ...(card.capsule.kind === "translate" && card.capsule.enabled ? [{ name: "translate", label: card.capsule.label }] : []),
            ...(card.isVoice ? (card.voiceReady ? [{ name: "voice", label: s.play }] : []) : [{ name: "unfold", label: s.unfoldA11y }]),
            ...card.menu.map((m) => ({ name: m.key, label: m.title })),
          ]}
          onAccessibilityAction={(e) => {
            const name = e.nativeEvent.actionName;
            if (name === "reply") onReply();
            else if (name === "translate" || name === "unfold" || name === "voice" || name === "report" || name === "block") act.cardAction(card.id, name);
          }}
          style={{ flex: 1 }}
        >
          <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1 }}>
            {/* the docket: who and when on the left, the stamp they pasted on the right */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <MosaicId seed={letter.author} cell={4.8} gap={1} />
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 0.88, color: tk.ink }}>
                {card.postmark}
              </Text>
              <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 2, borderColor: tk.ln, backgroundColor: tk.sf, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                <StampTile id={card.stampId} w={28} r={0} />
              </View>
              {/* THE POOL IS WHERE REPORT MATTERS MOST: always reachable */}
              {card.menu.length > 0 && (
                <Pressable
                  onPress={() => act.openMenu(card.id)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={s.more}
                  style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: tk.ln, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: tk.ink }}>···</Text>
                </Pressable>
              )}
            </View>

            {/* A PAGE IS ALWAYS ONE SCREEN: a long letter folds, never scrolls in place */}
            <View style={{ flex: 1, overflow: "hidden", justifyContent: folded ? "flex-start" : "center", paddingHorizontal: 10 }} onLayout={(ev) => setFrameH(ev.nativeEvent.layout.height)}>
              {card.isVoice ? (
                <VoiceBlockRN card={card} letter={letter} model={model} italic={italic} />
              ) : (
                <Text style={[text, face]}>{card.body}</Text>
              )}
              {/* the twin — unconstrained, invisible, measured once per text */}
              {!card.isVoice && (
                <Text pointerEvents="none" onLayout={(ev) => setTextH(ev.nativeEvent.layout.height)} style={[text, face, { position: "absolute", left: 10, right: 10, top: 0, opacity: 0, zIndex: -1 }]}>
                  {card.body}
                </Text>
              )}
              {/* A LONG LETTER FADES into its own page colour (the old fade was white: a band on Midnight and Paper) */}
              {folded && <LinearGradient pointerEvents="none" colors={[`${tk.sf}00`, tk.sf]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64 }} />}
            </View>
            {folded && (
              <Pressable onPress={() => act.cardAction(card.id, "unfold")} hitSlop={10} style={({ pressed }) => ({ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12, marginTop: 2, opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.5, color: tk.ind }}>{s.unfold}</Text>
              </Pressable>
            )}

            {/* the stamp's topic, and the one capsule (translation wins) */}
            {(card.topic !== "" || card.capsule.kind !== "none") && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, marginRight: 3 }}>
                {card.topic !== "" ? <TopicTag name={card.topic} colorHex={card.stampHex} /> : <View />}
                {card.capsule.kind === "translate" ? (
                  <TranslateCapsule code={card.capsule.code} label={card.capsule.label} busy={!card.capsule.enabled} onPress={() => act.cardAction(card.id, "translate")} />
                ) : card.capsule.kind === "signal" ? (
                  <SignalChip label={card.capsule.label} glyph={card.capsule.glyph} />
                ) : null}
              </View>
            )}

            <View style={{ height: 2, backgroundColor: tk.ln, marginTop: 14, marginBottom: 10 }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.5, color: tk.ink }}>{s.pass}</Text>
              <Pressable onPress={onReply} hitSlop={14} accessibilityRole="button" accessibilityLabel={s.replyA11y}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.5, color: tk.ind }}>{s.reply}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </InkPanel>
    </View>
  );
}

/* a voice letter: the label, the row drawn from the desk's one player, the caption */
function VoiceBlockRN({ card, letter, model, italic }: { card: CardVM; letter: PoolLetter; model: TodayModel; italic: { fontFamily: string; fontStyle: "normal" | "italic" } }) {
  const { t: tk } = useTheme();
  const st = model.voice.state;
  const mine = st?.key === card.id;
  const playing = !!(mine && st?.playing);
  // while it plays the row moves on by itself (the player only reports transitions)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [playing]);
  const unavailable = !card.voiceReady || (mine && !!st?.failed);
  return (
    <View>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.5, color: tk.ind, marginBottom: 14 }}>{model.view.strings.voiceLetter}</Text>
      <View pointerEvents={unavailable ? "none" : "auto"} style={{ opacity: unavailable ? 0.45 : 1 }}>
        <AudioCardView
          playing={playing}
          positionS={mine ? playbackPosition(st, now) : 0}
          durationS={mine && st ? st.durationS : letter.duration_s ?? 0}
          onToggle={() => model.act.cardAction(card.id, "voice")}
          system
          playLabel={model.view.strings.play}
          pauseLabel={model.view.strings.pause}
        />
      </View>
      {card.caption !== "" && <Text style={[{ fontSize: 15, lineHeight: 24, color: tk.sub, marginTop: 16 }, italic]}>{card.caption}</Text>}
    </View>
  );
}

/* ── the first arrival ── */

const ARRIVAL_H = 120;
const WREN_ITALIC = letterFamily("newsreader", true);
const LAND = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -28 }] },
  72: { opacity: 1, transform: [{ translateY: 4 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
})
  .duration(560)
  .delay(80);

function ArrivalRN({ open, line, states, labels, values, onGoto }: { open: boolean; line: string; states: EnvelopeState[]; labels: string[]; values: string[]; onGoto: (i: number) => void }) {
  const { t: tk } = useTheme();
  const p = useSharedValue(open ? 1 : 0);
  const [gone, setGone] = useState(!open);
  useEffect(() => {
    if (open) {
      setGone(false);
      p.value = 1;
      return;
    }
    if (gone) return;
    p.value = withTiming(0, { duration: 380 }, (fin) => {
      if (fin) runOnJS(setGone)(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    maxHeight: p.value * ARRIVAL_H,
    transform: [{ scaleY: 0.35 + 0.65 * p.value }],
  }));
  if (gone) return null;
  return (
    <Animated.View style={[{ overflow: "hidden", paddingHorizontal: 22 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 12, paddingBottom: 10 }}>
        <Animated.View entering={LAND} style={{ paddingTop: 2 }} accessibilityElementsHidden>
          <WrenBird size={34} mood="content" />
        </Animated.View>
        <View style={{ flex: 1 }}>
          {/* her line, in Newsreader italic whatever the Letter font (Wren's lines aren't letters) */}
          <Animated.Text entering={FadeIn.duration(360).delay(320)} style={[{ fontSize: 13.5, lineHeight: 20, color: tk.sub }, WREN_ITALIC]}>
            {line}
          </Animated.Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 9, marginTop: 9 }}>
            {states.map((st, i) => (
              <Animated.View key={i} entering={FadeInDown.duration(320).delay(480 + i * 120)}>
                <Pressable onPress={() => onGoto(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={labels[i]} accessibilityValue={{ text: values[i] }}>
                  <Env state={st} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/* the envelope from the route chart, at glyph size: sealed, open in your hand, or read */
function Env({ state }: { state: EnvelopeState }) {
  const { t: tk } = useTheme();
  const stroke = state === "sealed" ? tk.ln : state === "current" ? tk.ind : tk.mute;
  const up = state !== "sealed";
  return (
    <Svg width={30} height={28} viewBox="0 -9 30 28">
      {up && <Path d="M3 1 L15 -6 L27 1 Z" fill={tk.sf} stroke={stroke} strokeWidth={1.3} strokeLinejoin="round" />}
      {up && <Rect x={7.5} y={-5} width={15} height={8} fill={tk.sf} stroke={stroke} strokeWidth={1.3} />}
      <Rect x={1} y={1} width={28} height={17} fill={tk.sf} stroke={stroke} strokeWidth={1.3} />
      {!up && <Path d="M1 1 L15 11 L29 1" fill="none" stroke={stroke} strokeWidth={1.3} strokeLinejoin="round" />}
      <Rect x={22} y={4} width={4.5} height={4} fill={state === "opened" ? tk.mute : tk.ind} />
    </Svg>
  );
}
