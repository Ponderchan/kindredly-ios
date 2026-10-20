import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { KChatFoldHalf, KChatItem, KChatPart } from "../../../modules/kindredly-ui/src/Conversation";
import type { KMenuAction } from "../../../modules/kindredly-ui/src/types";
import { MessageMenu, a11yActions, type MessageAction } from "../../components/MessageMenu";
import { StickerBox } from "../../components/10a/StickerBox";
import { MediaImage } from "../../lib/media";
import { useLetterFamily, useLetterFont, useTheme } from "../../lib/theme";
import { letterFitLines, MONO, PFM } from "../../theme/post";
import { VoiceOpeningCard, type OpeningVoiceRN } from "./VoiceOpeningRN";
import type { A11yNode } from "./useChatListRN";

/* THE CONVERSATION'S ROWS, IN REACT NATIVE (10a step 5, slice chat-rn).
   ────────────────────────────────────────────────────────────────────────
   The room and chat fallbacks draw the very rows the SwiftUI kit draws —
   the same KChatItem records out of build-items (every word, day rule,
   gap, quote, menu and VoiceOver label decided there, once) — in the same
   10a look as KChatRows.swift, on the theme:

   · a room line: mine on the right in ind with the page colour on it,
     theirs on the left on soft with ink (a line around theirs outside
     Classic, where soft barely leaves the page); corners 18 and 5 on the
     tail; padding 10 14; at most 84%; the reader's Letter font at 16 (a line
     is content, owner 2026-10-20). A reply carries its quote (a 2pt rule,
     the speaker in mono 10, two lines in the Letter font, three in a roomy
     face, "taken back" in its italic).
   · a pen-pal letter, as the chat composers' A2 draws it (owner,
     2026-10-18): a card with a 2 ln outline, corners 18, padding 14 16;
     theirs on sf across the whole width, mine on soft (soft2 on Midnight)
     set 40 in from the left. Inside, the head line in mono 500 10 at .14em
     (LETTER 3 · NO. 5422 in mute, LETTER 3 · YOU in ind; the opening WHERE
     IT BEGAN · NO. 5422; with the identity switch on the courier name,
     LETTER 3 · SUNDAY KITE, from build-items), the words in the reader's Letter font at 19 on
     1.35 (owner question 1: pen-pal letters are letters being read;
     Newsreader by default, never a fixed Garamond), and the 24-hour time at
     its foot on the right. The day is a day rule above the card when it
     changes (build-items cards: true). A tap opens the reader; the menu,
     its lift and VoiceOver's frame are the card.
   · a moment (70% square, corners 16, soft2 until it loads), a song (the
     light-outline card, ♪ in ind, title, host, ›) and the shelf link under
     the last one, a fold (sealed on soft with a line, opened on sf with a
     2 ln outline and a 3/3 hard shadow, each half its own menu), a line
     taken back, the voice opening on the screen's one player.

   Long-press menus stay MessageMenu (a Host per row — acceptable for a
   fallback that renders a window of rows); their items are build-items'
   KMenuAction lists and every item runs the model's onItemAction. Each row
   is one VoiceOver element named by its a11yLabel (whose, the words, the
   day) with the menu's items as its actions; a reply's quote jump is a
   named action too (mm.goToQuote), as it is in SwiftUI, and each row hands
   its element to env.a11yRef so the jump can move VoiceOver's focus to the
   line it lands on. A voice opening with no caption still has an element
   naming whose it is and which day (SwiftUI's labelled group), with the
   letter's menu and, in letters, the tap that opens the reader. */

export type RowEnv = {
  /** the list's width less its gutters */
  width: number;
  /** the theme is Classic (theirs bubbles get their line everywhere else) */
  classic: boolean;
  strings: { goToQuote: string; translating: string; photoOpen: string };
  onItemPress: (key: string, part: KChatPart) => void;
  onItemAction: (key: string, action: string) => void;
  /** a moment's picture: its storage path, or a plain address (a demo, a send on its way) */
  photoOf: (key: string) => { path: string | null; uri: string | null };
  voice: OpeningVoiceRN;
  /** each row's VoiceOver element, by key (useChatListRN), for the quote jump's focus */
  a11yRef: (key: string) => (node: A11yNode | null) => void;
};

/** build-items' menu as MessageMenu actions, each running the model's action for its row */
export const menuActions = (menu: readonly KMenuAction[], key: string, run: (key: string, action: string) => void): MessageAction[] =>
  menu.map((a) => ({ key: a.key, label: a.title, icon: a.icon, destructive: a.destructive, onPress: () => run(key, a.key) }));

const NOOP = () => {};

/* ── shared pieces ───────────────────────────────────────────────────── */

/** "OCT 14", centred, mono 10 in sub (mute fails 4.5:1 at 10pt in Lavender and Paper), a header */
function DayRule({ label, first }: { label: string; first: boolean }) {
  const { t: tk } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: tk.sub, textAlign: "center", marginTop: first ? 0 : 22, marginBottom: 14 }}
    >
      {label}
    </Text>
  );
}

/** translating… under a line, then the translation in sub */
function TranslationLine({ item, half, maxWidth, translating }: { item?: KChatItem; half?: KChatFoldHalf; maxWidth?: number; translating: string }) {
  const { t: tk } = useTheme();
  const face = useLetterFamily();
  const state = item?.translation ?? half?.translation ?? "none";
  const text = item?.translationText ?? half?.translationText ?? "";
  if (state === "busy") {
    return <Text style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: tk.mute, marginTop: 4, paddingHorizontal: 6 }}>{translating}</Text>;
  }
  if (state === "shown" && text) {
    return <Text style={{ maxWidth, ...face, fontSize: 14.5, lineHeight: 21, color: tk.sub, marginTop: 5, paddingHorizontal: 6 }}>{text}</Text>;
  }
  return null;
}

/* ── a room's row ────────────────────────────────────────────────────── */

export function RoomRowRN({ item, first, lit, env, onLayout }: { item: KChatItem; first: boolean; lit: boolean; env: RowEnv; onLayout: (e: LayoutChangeEvent) => void }) {
  return (
    <View onLayout={onLayout} style={{ opacity: lit ? 0.5 : 1 }}>
      {!!item.dayLabel && <DayRule label={item.dayLabel} first={first} />}
      <View style={{ paddingTop: item.gap }}>
        {item.kind === "line" ? (
          <Bubble item={item} env={env} />
        ) : item.kind === "photo" ? (
          <PhotoTile item={item} env={env} />
        ) : item.kind === "song" ? (
          <SongCard item={item} env={env} />
        ) : item.kind === "fold" ? (
          <FoldCard item={item} env={env} />
        ) : item.kind === "recalled" ? (
          <RecallNote item={item} env={env} />
        ) : item.kind === "voice" ? (
          <RoomVoice item={item} env={env} />
        ) : null}
      </View>
    </View>
  );
}

function Bubble({ item, env }: { item: KChatItem; env: RowEnv }) {
  const { t: tk } = useTheme();
  // the line and its quote are content: the reader's Letter font
  const face = useLetterFamily();
  const goneFace = useLetterFamily(true);
  const quoteLines = letterFitLines(useLetterFont(), 2);
  const max = Math.round(env.width * 0.84);
  const mine = item.mine;
  const q = item.quote;
  const acts = menuActions(item.menu, item.key, env.onItemAction);
  const quoteJump: MessageAction[] = q && q.target ? [{ key: "goToQuote", label: env.strings.goToQuote, icon: "arrow.up", onPress: () => env.onItemPress(item.key, "quote") }] : [];
  return (
    <View style={{ alignItems: mine ? "flex-end" : "flex-start", paddingBottom: 2 }}>
      <MessageMenu actions={acts} radius={18} accessibilityLabel={item.a11yLabel} a11yExtra={quoteJump} a11yRef={env.a11yRef(item.key)}>
        <View
          style={{
            maxWidth: max,
            backgroundColor: mine ? tk.ind : tk.soft,
            borderWidth: !mine && !env.classic ? 1 : 0,
            borderColor: tk.line,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 18,
            borderBottomRightRadius: mine ? 5 : 18,
            borderBottomLeftRadius: mine ? 18 : 5,
            gap: 6,
          }}
        >
          {q && (
            /* the line this one answers: whose, and a few of its words; a tap goes back to it */
            <Pressable
              onPress={q.target ? () => env.onItemPress(item.key, "quote") : undefined}
              onLongPress={NOOP}
              delayLongPress={350}
              disabled={!q.target}
              style={{ flexDirection: "row", gap: 8 }}
            >
              <View style={{ width: 2, backgroundColor: mine ? tk.bg : tk.ind, opacity: mine ? 0.7 : 1 }} />
              <View style={{ flexShrink: 1, gap: 2 }}>
                <Text numberOfLines={1} style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 1, color: mine ? tk.bg : tk.ind, opacity: mine ? 0.85 : 1 }}>
                  {q.speaker}
                </Text>
                <Text numberOfLines={quoteLines} style={{ ...(q.gone ? goneFace : face), fontSize: 13.5, lineHeight: 18, color: mine ? tk.bg : tk.sub, opacity: mine ? 0.85 : 1 }}>
                  {q.excerpt}
                </Text>
              </View>
            </Pressable>
          )}
          <Text style={{ ...face, fontSize: 16, lineHeight: 23, color: mine ? tk.bg : tk.ink }}>{item.body}</Text>
        </View>
      </MessageMenu>
      <TranslationLine item={item} maxWidth={max} translating={env.strings.translating} />
    </View>
  );
}

function PhotoTile({ item, env }: { item: KChatItem; env: RowEnv }) {
  const { t: tk } = useTheme();
  const side = Math.round(env.width * 0.7);
  const acts = menuActions(item.menu, item.key, env.onItemAction);
  const pic = env.photoOf(item.key);
  return (
    <View style={{ alignItems: item.mine ? "flex-end" : "flex-start", paddingBottom: 6 }}>
      <Pressable
        ref={env.a11yRef(item.key)}
        onPress={() => env.onItemPress(item.key, "photo")}
        /* a long-press is the photo's menu, so lifting the finger must not also open it — unless it
           has no menu (still sending), when a slow tap should still open it */
        onLongPress={acts.length ? NOOP : undefined}
        delayLongPress={350}
        accessibilityRole="imagebutton"
        accessibilityLabel={item.a11yLabel || env.strings.photoOpen}
        {...a11yActions(acts)}
      >
        <MessageMenu actions={acts} radius={16}>
          <MediaImage path={pic.path} uri={pic.uri} style={{ width: side, height: side, borderRadius: 16, backgroundColor: tk.soft2 }} />
        </MessageMenu>
      </Pressable>
    </View>
  );
}

function Chevron({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

function SongCard({ item, env }: { item: KChatItem; env: RowEnv }) {
  const { t: tk } = useTheme();
  const max = Math.round(env.width * 0.86);
  const acts = menuActions(item.menu, item.key, env.onItemAction);
  return (
    <View style={{ alignItems: item.mine ? "flex-end" : "flex-start", paddingBottom: 6 }}>
      <Pressable
        ref={env.a11yRef(item.key)}
        onPress={() => env.onItemPress(item.key, "song")}
        onLongPress={NOOP} // the song menu always has the shelf
        delayLongPress={350}
        accessibilityRole="link"
        accessibilityLabel={item.a11yLabel}
        {...a11yActions(acts)}
      >
        <MessageMenu actions={acts} radius={16}>
          <View
            style={{
              maxWidth: max,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: item.mine ? tk.lav : tk.ln,
              backgroundColor: item.mine ? tk.lav2 : tk.sf,
            }}
          >
            <Text style={{ fontSize: 17, color: tk.ind }}>♪</Text>
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text numberOfLines={1} style={{ ...PFM.monoMed, fontSize: MONO.title, color: tk.ink }}>
                {item.songTitle}
              </Text>
              <Text numberOfLines={1} style={{ ...PFM.monoMed, fontSize: MONO.label, color: tk.mute }}>
                {item.songHost}
              </Text>
            </View>
            <Chevron color={tk.ind} />
          </View>
        </MessageMenu>
      </Pressable>
      {!!item.shelfLink && (
        <Pressable onPress={() => env.onItemPress(item.key, "shelf")} hitSlop={6} accessibilityRole="link" accessibilityLabel={item.shelfLink} style={{ minHeight: 32, justifyContent: "center", marginTop: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: tk.ind }}>{item.shelfLink} ›</Text>
        </Pressable>
      )}
    </View>
  );
}

function FoldCard({ item, env }: { item: KChatItem; env: RowEnv }) {
  const { t: tk } = useTheme();
  const fold = item.fold;
  if (!fold) return null;
  const open = fold.state === "open";
  return (
    <StickerBox
      fill={open ? tk.sf : tk.soft}
      stroke={open ? tk.ln : tk.line}
      lineWidth={open ? 2 : 1.5}
      radius={16}
      shadow={open ? tk.ln : null}
      offset={open ? 3 : 0}
      style={{ marginRight: open ? 3 : 0, marginBottom: open ? 9 : 6 }}
      faceStyle={{ padding: 14 }}
    >
      <Text ref={env.a11yRef(item.key)} accessibilityRole="header" style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: tk.mute }}>
        {fold.kindLabel}
      </Text>
      {!!fold.prompt && <Text style={{ fontSize: 16, lineHeight: 24, color: tk.ink, marginTop: 6 }}>{fold.prompt}</Text>}
      {open ? (
        fold.halves.map((half) => <FoldHalf key={half.key} half={half} env={env} />)
      ) : fold.state === "sealed" && !!fold.answerKey ? (
        <Pressable
          // the model's: it clears a reply chip, sets the mode and focuses the field
          onPress={() => env.onItemPress(item.key, "fold")}
          accessibilityRole="button"
          accessibilityLabel={fold.hint}
          accessibilityActions={[{ name: "answer", label: fold.answerKey }]}
          onAccessibilityAction={() => env.onItemPress(item.key, "fold")}
          hitSlop={6}
          style={{ marginTop: 8, gap: 6 }}
        >
          <Text style={{ fontSize: 13.5, color: tk.sub }}>{fold.hint}</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: tk.ind }}>{fold.answerKey} ›</Text>
        </Pressable>
      ) : fold.hint ? (
        // waiting on them, or a room nothing can be left in: the hint, no door
        <Text style={{ fontSize: 13.5, color: tk.mute, marginTop: 8 }}>{fold.hint}</Text>
      ) : null}
    </StickerBox>
  );
}

function FoldHalf({ half, env }: { half: KChatFoldHalf; env: RowEnv }) {
  const { t: tk } = useTheme();
  const face = useLetterFamily();
  const acts = menuActions(half.menu, half.key, env.onItemAction);
  // the card's padding and outline, the shadow's 3, and the 8 a side the half takes back
  const w = env.width - 3 - 2 * (14 + 2) + 16;
  return (
    <View style={{ marginHorizontal: -8 }}>
      <MessageMenu actions={acts} radius={12} accessibilityLabel={`${half.speaker}, ${half.body}`} a11yRef={env.a11yRef(half.key)}>
        {/* 8 of the card's own padding go into the half, so the lifted copy has a margin and the words don't move */}
        <View style={{ width: w, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4, backgroundColor: tk.sf, borderRadius: 12, gap: 3 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: MONO.label, letterSpacing: 1, color: half.mine ? tk.mute : tk.ind }}>{half.speaker}</Text>
          <Text style={{ ...face, fontSize: 16, lineHeight: 24, color: half.mine ? tk.sub : tk.ink }}>{half.body}</Text>
        </View>
      </MessageMenu>
      <View style={{ paddingHorizontal: 2 }}>
        <TranslationLine half={half} translating={env.strings.translating} />
      </View>
    </View>
  );
}

function RecallNote({ item, env }: { item: KChatItem; env: RowEnv }) {
  const { t: tk } = useTheme();
  return (
    <Text
      ref={env.a11yRef(item.key)}
      accessibilityLabel={item.a11yLabel || item.body}
      style={{ alignSelf: item.mine ? "flex-end" : "flex-start", ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 0.4, color: tk.mute, paddingHorizontal: 6, paddingBottom: 4 }}
    >
      {item.body}
    </Text>
  );
}

/** the voice opening in a room: the card plays; the caption is its title, with the opening
    letter's menu (copy, translate, keep) */
function RoomVoice({ item, env }: { item: KChatItem; env: RowEnv }) {
  const { t: tk } = useTheme();
  // the caption is the voice letter's words: the Letter font's italic
  const captionFace = useLetterFamily(true);
  const max = Math.round(env.width * 0.84);
  const acts = menuActions(item.menu, item.key, env.onItemAction);
  return (
    <View style={{ alignItems: item.mine ? "flex-end" : "flex-start", paddingBottom: 2, gap: 6 }}>
      {!item.body && (
        /* no caption: VoiceOver still hears whose it is and which day, with the letter's menu
           (SwiftUI's labelled group); first in the row and behind the card, which stays its own
           control on top */
        <View ref={env.a11yRef(item.key)} accessible accessibilityLabel={item.a11yLabel} {...a11yActions(acts)} style={StyleSheet.absoluteFill} />
      )}
      <VoiceOpeningCard voice={env.voice} style={{ width: max }} />
      {!!item.body && (
        <MessageMenu actions={acts} radius={8} accessibilityLabel={item.a11yLabel} a11yRef={env.a11yRef(item.key)}>
          <Text style={{ maxWidth: max, ...captionFace, fontSize: 13, lineHeight: 18, color: tk.sub, paddingHorizontal: 6, paddingVertical: 2, textAlign: item.mine ? "right" : "left" }}>
            {item.body}
          </Text>
        </MessageMenu>
      )}
      <TranslationLine item={item} maxWidth={max} translating={env.strings.translating} />
    </View>
  );
}

/* ── a pen-pal letter (chat composers A2, owner 2026-10-18) ─────────────── */

/** a letter card's ground: theirs sf, mine soft (soft2 on Midnight, where soft is sf) */
const cardFill = (tk: { sf: string; soft: string; soft2: string; dark: boolean }, mine: boolean) => (mine ? (tk.dark ? tk.soft2 : tk.soft) : tk.sf);
/** mine stand this far in from the left (A2) */
const MINE_INDENT = 40;

export function LetterRowRN({ item, first = false, lit, env, onLayout }: { item: KChatItem; first?: boolean; lit: boolean; env: RowEnv; onLayout: (e: LayoutChangeEvent) => void }) {
  const { t: tk } = useTheme();
  const letterFace = useLetterFamily();
  const captionFace = useLetterFamily(true);
  const acts = menuActions(item.menu, item.key, env.onItemAction);
  const open = () => item.tappable && env.onItemPress(item.key, "body");
  // theirs take the list's whole width, mine all but 40
  const cardW = env.width - (item.mine ? MINE_INDENT : 0);
  /* the card's face: a 2 ln outline, corners 18, padding 14 16 (the outline inside it) */
  const frame = {
    width: cardW,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: tk.ln,
    backgroundColor: cardFill(tk, item.mine),
    gap: 8,
  } as const;
  /* the card's inside: its width less the padding and the outline. The words are hosted by
     MessageMenu (RNHostView matchContents sizes from its children, laid out unbounded), so they
     need this width to wrap and to put the time at the right */
  const inner = cardW - 2 * frame.paddingHorizontal - 2 * frame.borderWidth;
  const head = !!item.head && (
    <Text numberOfLines={1} importantForAccessibility="no" accessibilityElementsHidden style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: item.mine ? tk.ind : tk.mute }}>
      {item.head}
    </Text>
  );
  const time = !!item.timeLabel && <Text style={{ ...PFM.monoMed, fontSize: MONO.label, color: tk.mute, alignSelf: "flex-end" }}>{item.timeLabel}</Text>;

  return (
    <View onLayout={onLayout} style={{ opacity: lit ? 0.5 : 1 }}>
      {!!item.dayLabel && <DayRule label={item.dayLabel} first={first} />}
      <View style={{ marginLeft: item.mine ? MINE_INDENT : 0, marginBottom: 10 }}>
        {!item.head && !!item.speakerLabel && (
          // a letter with no head line (a builder without the cards): its old label above it
          <Text importantForAccessibility="no" accessibilityElementsHidden style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 1, color: tk.mute, marginBottom: 6, marginHorizontal: 2 }}>
            {item.speakerLabel}
          </Text>
        )}
        {item.kind === "voice" ? (
          /* the opening, spoken: the card is its own control; the caption is the letter — a tap opens
             the reader, a long press its menu */
          <View style={frame}>
            {!item.body && !item.timeLabel && (
              /* no caption: the letter is still there for VoiceOver — whose and which day, its menu,
                 the tap that opens the reader (SwiftUI's labelled group) — and a tap on the frame
                 around the card opens it too; behind the card, which stays its own control */
              <Pressable
                ref={env.a11yRef(item.key)}
                onPress={open}
                accessibilityRole={item.tappable ? "button" : undefined}
                accessibilityLabel={item.a11yLabel}
                {...a11yActions(acts)}
                style={StyleSheet.absoluteFill}
              />
            )}
            {head}
            <VoiceOpeningCard voice={env.voice} />
            {(!!item.body || !!item.timeLabel) && (
              <Pressable
                ref={env.a11yRef(item.key)}
                onPress={open}
                onLongPress={NOOP}
                delayLongPress={350}
                accessibilityRole={item.tappable ? "button" : undefined}
                accessibilityLabel={item.a11yLabel}
                {...a11yActions(acts)}
              >
                <MessageMenu actions={acts} radius={8}>
                  {/* the card's own face under the lifted copy (Midnight only, as in SwiftUI) */}
                  <View style={{ width: inner, gap: 6, backgroundColor: tk.dark ? cardFill(tk, item.mine) : "transparent" }}>
                    {!!item.body && <Text style={{ ...captionFace, fontSize: 13, lineHeight: 18, color: tk.sub }}>{item.body}</Text>}
                    {time}
                  </View>
                </MessageMenu>
              </Pressable>
            )}
          </View>
        ) : item.kind === "recalled" ? (
          <RecallNote item={item} env={env} />
        ) : (
          <Pressable
            ref={env.a11yRef(item.key)}
            onPress={open}
            /* a long-press is the letter's menu, so lifting the finger must not also open it */
            onLongPress={NOOP}
            delayLongPress={350}
            accessibilityRole={item.tappable ? "button" : undefined}
            accessibilityLabel={item.a11yLabel}
            {...a11yActions(acts)}
          >
            {/* the menu, its lift and VoiceOver's frame are the card */}
            <MessageMenu actions={acts} radius={18}>
              <View style={frame}>
                {head}
                <Text style={[{ fontSize: 19, lineHeight: 25.65, color: tk.ink }, letterFace]}>{item.body}</Text>
                {time}
              </View>
            </MessageMenu>
          </Pressable>
        )}
        <TranslationLine item={item} maxWidth={cardW} translating={env.strings.translating} />
      </View>
    </View>
  );
}
