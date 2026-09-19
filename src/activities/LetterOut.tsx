import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { activityBackgroundTint, aspectRatio, font, foregroundStyle, frame, padding, resizable } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";

/* YOUR LETTER IS OUT, ON THE LOCK SCREEN.
   ────────────────────────────────────────────────────────────────────────
   Starts when a letter to a stranger leaves; the server pushes the two
   things that can happen to it — another desk it landed on, a reply — and
   it ends when the reply is read or the day's fare runs out. No arrival
   time, no map, no city: she left the second you pressed send, and the
   waiting is theirs. The only numbers are the ones the database keeps:
   how many strangers have had it on their desk (letter_reads), and whether
   one of them wrote back. Drawn, not told: one small opened envelope per
   desk; a brass envelope, and her landing with it, when a reply is home.

   All text arrives through props, already in the reader's language. The
   server pushes only `reads` and `replied`; the layout picks the sentence. */

export interface LetterOutProps {
  wren: string;
  /** file:// paths in the shared widgets directory */
  bird: string; // her, out with it (flying)
  birdBack: string; // her, landed with the reply
  mini: string; // her small mark, for the island's compact states
  stamp: string; // the mood stamp's emoji
  reads: number;
  replied: boolean;
  eyebrowOut: string; // "MOTH · OUT WITH YOUR LETTER"
  eyebrowBack: string; // "MOTH IS BACK"
  reads0: string; // "Not on a desk yet."
  reads1: string; // "On one stranger's desk."
  readsN: string; // "On {n} strangers' desks."
  looking: string; // "still out — a reply lands on your desk."
  repliedHead: string; // "A stranger wrote back."
  repliedLine: string; // "it's on your desk."
}

const LetterOut = (props: LetterOutProps, env: LiveActivityEnvironment) => {
  "widget";
  const INK = "#111113";
  const INK60 = "#6E6E72";
  const PEN = "#3A3AF5";
  const BRASS = "#E8A63C";
  const WASH = "#ECECFE";
  const onDark = env.isLuminanceReduced;
  const ink = onDark ? "#FFFFFF" : INK;
  const dim = onDark ? "#B6B0E0" : INK60;
  const mono = (size: number, weight: "regular" | "semibold" | "bold" = "regular") => font({ design: "monospaced", size, weight });
  const n = String(props.reads);
  const eyebrow = props.replied ? props.eyebrowBack : props.eyebrowOut;
  const head = props.replied ? props.repliedHead : props.reads === 0 ? props.reads0 : props.reads === 1 ? props.reads1 : props.readsN.replace("{n}", n);
  const line = props.replied ? props.repliedLine : props.looking;
  const picture = props.replied ? props.birdBack : props.bird;
  const her = (px: number) => <Image uiImage={picture} modifiers={[resizable(), aspectRatio({ contentMode: "fit" }), frame({ width: px, height: px })]} />;
  /* the desks it has been on, as marks; past twelve, a count takes over */
  const marks: React.JSX.Element[] = [];
  if (!props.replied) for (let i = 0; i < Math.min(12, props.reads); i++) marks.push(<Image key={"d" + i} systemName="envelope.open.fill" size={9} color={PEN} />);
  const tally = !props.replied && props.reads > 12 ? <Text modifiers={[mono(9, "semibold"), foregroundStyle(PEN), padding({ leading: 4 })]}>{"+" + String(props.reads - 12)}</Text> : null;
  /* the reply itself, a sealed brass envelope, sits with its line */
  const lineRow = (color: string) => (
    <HStack alignment="center" spacing={5}>
      {props.replied ? <Image systemName="envelope.fill" size={11} color={BRASS} /> : null}
      <Text modifiers={[mono(9.5), foregroundStyle(color)]}>{line}</Text>
    </HStack>
  );

  return {
    banner: (
      <HStack alignment="center" spacing={0} modifiers={[padding({ all: 14 }), activityBackgroundTint(WASH)]}>
        {her(56)}
        <VStack alignment="leading" spacing={0} modifiers={[padding({ leading: 12 })]}>
          <HStack spacing={0}>
            <Text modifiers={[mono(9, "semibold"), foregroundStyle(props.replied ? BRASS : dim)]}>{eyebrow}</Text>
            <Spacer />
            <Text modifiers={[font({ size: 13 })]}>{props.stamp}</Text>
          </HStack>
          <Text modifiers={[font({ design: "serif", size: 16 }), foregroundStyle(ink), padding({ top: 5 })]}>{head}</Text>
          {marks.length > 0 ? (
            <HStack alignment="center" spacing={2} modifiers={[padding({ top: 6 })]}>
              {marks}
              {tally}
            </HStack>
          ) : null}
          <VStack modifiers={[padding({ top: 5 })]}>{lineRow(props.replied ? BRASS : dim)}</VStack>
        </VStack>
      </HStack>
    ),
    compactLeading: <Image uiImage={props.mini} modifiers={[resizable(), aspectRatio({ contentMode: "fit" }), frame({ width: 22, height: 22 })]} />,
    /* nothing to count is not a count: the stamp holds the place until a
       desk has had it; then the tally in pen; then the brass envelope */
    compactTrailing: props.replied ? (
      <Image systemName="envelope.fill" size={13} color={BRASS} />
    ) : props.reads === 0 ? (
      <Text modifiers={[font({ size: 13 })]}>{props.stamp}</Text>
    ) : (
      <HStack alignment="center" spacing={3}>
        <Image systemName="envelope.open.fill" size={10} color={PEN} />
        <Text modifiers={[mono(12, "semibold"), foregroundStyle("#FFFFFF")]}>{n}</Text>
      </HStack>
    ),
    minimal: <Image uiImage={props.mini} modifiers={[resizable(), aspectRatio({ contentMode: "fit" }), frame({ width: 22, height: 22 })]} />,
    expandedLeading: <VStack modifiers={[padding({ leading: 4, top: 4 })]}>{her(48)}</VStack>,
    expandedCenter: (
      <VStack alignment="leading" spacing={0} modifiers={[padding({ top: 6 })]}>
        <Text modifiers={[mono(9, "semibold"), foregroundStyle(props.replied ? BRASS : "#B6B0E0")]}>{eyebrow}</Text>
        <Text modifiers={[font({ design: "serif", size: 17 }), foregroundStyle("#FFFFFF"), padding({ top: 3 })]}>{head}</Text>
      </VStack>
    ),
    expandedTrailing: <VStack modifiers={[padding({ trailing: 4, top: 4 })]}><Text modifiers={[font({ size: 24 })]}>{props.stamp}</Text></VStack>,
    expandedBottom: (
      <HStack alignment="center" spacing={2} modifiers={[padding({ horizontal: 4, top: 6, bottom: 4 })]}>
        {marks}
        {tally}
        <Spacer />
        {lineRow(props.replied ? BRASS : "#B6B0E0")}
        {marks.length > 0 ? null : <Spacer />}
      </HStack>
    ),
  };
};

export default createLiveActivity<LetterOutProps>("LetterOut", LetterOut);
