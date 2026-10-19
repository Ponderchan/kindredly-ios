import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { accessibilityHidden, activityBackgroundTint, aspectRatio, font, foregroundStyle, frame, padding, resizable } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";

/* THE CLOSED WINDOW, ON THE LOCK SCREEN.
   ────────────────────────────────────────────────────────────────────────
   Pulling the blind starts this; it ends itself at the hour she's back.
   It counts to something real — the desk's day turns at that hour — and
   carries only what the blind carries. The day is drawn, not told: one
   small opened envelope per letter that went past the desk, the ones still
   waiting on you in the pen colour. The clock is the system's own timer
   text, so nothing here needs the app awake or a push.

   Everything the layout shows arrives through props, already in the
   reader's language: this function runs in the widget's own runtime and
   can reach neither the catalog nor the theme. */

export interface DayClosedProps {
  /** her name, upper-cased by the app */
  wren: string;
  /** file:// paths in the shared widgets directory: her, and her small mark */
  bird: string;
  mini: string;
  /** letters that went past the desk today; correspondences waiting on you */
  read: number;
  waiting: number;
  /** epoch ms — when she's back (the desk's next turn) */
  backAt: number;
  /** epoch ms — when the blind came down; the timer counts from here */
  since: number;
  /** false past eight hours out: Apple ends an activity at eight hours, and
      a clock the system will freeze is worse than the hour alone */
  timer: boolean;
  eyebrow: string; // "CLOSED FOR TODAY"
  allRead: string; // "All read."
  none: string; // "nothing came past your desk today."
  waitingLine: string; // "2 WAITING ON YOU" or ""
  backIn: string; // "MOTH IS BACK IN"
  backAtLabel: string; // "AT 08:00"
}

const DayClosed = (props: DayClosedProps, env: LiveActivityEnvironment) => {
  "widget";
  const INK = "#111113";
  const INK60 = "#6E6E72";
  const INK35 = "#A3A3A8";
  const PEN = "#3A3AF5";
  const WASH = "#ECECFE";
  const onDark = env.isLuminanceReduced;
  const ink = onDark ? "#FFFFFF" : INK;
  const dim = onDark ? "#B6B0E0" : INK60;
  const mark = onDark ? "#8A86B0" : INK35;
  const mono = (size: number, weight: "regular" | "semibold" | "bold" = "regular") => font({ design: "monospaced", size, weight });
  const interval = { lower: new Date(props.since), upper: new Date(props.backAt) };
  const clock = (size: number, color: string) =>
    props.timer ? (
      <Text timerInterval={interval} countsDown modifiers={[mono(size, "bold"), foregroundStyle(color)]} />
    ) : (
      <Text modifiers={[mono(size, "bold"), foregroundStyle(color)]}>{props.backAtLabel}</Text>
    );
  /* the day as marks: an opened envelope per letter read (fifteen at most
     — that is the whole ration), then the ones waiting on you in pen */
  const marks: React.JSX.Element[] = [];
  const shown = Math.min(15, props.read);
  for (let i = 0; i < shown; i++) marks.push(<Image key={"r" + i} systemName="envelope.open.fill" size={9} color={mark} />);
  for (let i = 0; i < Math.min(5, props.waiting); i++) marks.push(<Image key={"w" + i} systemName="envelope.fill" size={9} color={PEN} />);
  /* VoiceOver (a11y pass): the marks are drawn, not told — the line beside them says the day
     ("All read.", "2 WAITING ON YOU"), so the row is hidden rather than read envelope by envelope,
     and so is her picture */
  const marksRow = (top: number) => <HStack spacing={2} modifiers={[padding({ top }), accessibilityHidden(true)]}>{marks}</HStack>;
  const her = (px: number) => <Image uiImage={props.bird} modifiers={[resizable(), aspectRatio({ contentMode: "fit" }), frame({ width: px, height: px }), accessibilityHidden(true)]} />;

  return {
    banner: (
      <HStack alignment="center" spacing={0} modifiers={[padding({ all: 14 }), activityBackgroundTint(WASH)]}>
        {her(56)}
        <VStack alignment="leading" spacing={0} modifiers={[padding({ leading: 12 })]}>
          <HStack spacing={0}>
            <Text modifiers={[mono(9, "semibold"), foregroundStyle(dim)]}>{props.eyebrow}</Text>
            <Spacer />
            <Text modifiers={[mono(9, "semibold"), foregroundStyle(dim)]}>{props.wren}</Text>
          </HStack>
          {marks.length > 0 ? marksRow(7) : null}
          <HStack alignment="lastTextBaseline" spacing={0} modifiers={[padding({ top: 5 })]}>
            <Text modifiers={[font({ design: "serif", size: 16 }), foregroundStyle(ink)]}>{props.read > 0 ? props.allRead : props.none}</Text>
            {props.waitingLine ? <Text modifiers={[mono(9, "semibold"), foregroundStyle(PEN), padding({ leading: 8 })]}>{props.waitingLine}</Text> : null}
            <Spacer />
            {clock(14, PEN)}
          </HStack>
        </VStack>
      </HStack>
    ),
    compactLeading: <Image uiImage={props.mini} modifiers={[resizable(), aspectRatio({ contentMode: "fit" }), frame({ width: 22, height: 22 })]} />,
    compactTrailing: props.timer ? (
      <Text timerInterval={interval} countsDown modifiers={[mono(12, "semibold"), foregroundStyle("#FFFFFF"), frame({ width: 62 })]} />
    ) : (
      <Text modifiers={[mono(11, "semibold"), foregroundStyle("#FFFFFF")]}>{props.backAtLabel}</Text>
    ),
    minimal: <Image uiImage={props.mini} modifiers={[resizable(), aspectRatio({ contentMode: "fit" }), frame({ width: 22, height: 22 })]} />,
    expandedLeading: <VStack modifiers={[padding({ leading: 4, top: 4 })]}>{her(48)}</VStack>,
    expandedCenter: (
      <VStack alignment="leading" spacing={0} modifiers={[padding({ top: 6 })]}>
        <Text modifiers={[mono(9, "semibold"), foregroundStyle("#B6B0E0")]}>{props.eyebrow}</Text>
        <Text modifiers={[font({ design: "serif", size: 17 }), foregroundStyle("#FFFFFF"), padding({ top: 3 })]}>{props.read > 0 ? props.allRead : props.none}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={0} modifiers={[padding({ trailing: 4, top: 6 })]}>
        {clock(20, "#FFFFFF")}
        <Text modifiers={[mono(8.5, "semibold"), foregroundStyle("#B6B0E0")]}>{props.timer ? props.backAtLabel : props.backIn}</Text>
      </VStack>
    ),
    expandedBottom: (
      <HStack alignment="center" spacing={2} modifiers={[padding({ horizontal: 4, top: 6, bottom: 4 })]}>
        {marks.length > 0 ? marksRow(0) : null}
        {marks.length > 0 ? <Spacer /> : null}
        {props.waitingLine ? <Text modifiers={[mono(9, "semibold"), foregroundStyle("#8A86FF")]}>{props.waitingLine}</Text> : null}
      </HStack>
    ),
  };
};

export default createLiveActivity<DayClosedProps>("DayClosed", DayClosed);
