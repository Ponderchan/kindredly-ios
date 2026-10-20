import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Modal, PixelRatio, Pressable, Text, View, findNodeHandle, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { P as STATIC_P, PF } from "../theme/post";
import { scrimColor, useTheme } from "../lib/theme";
import { dangerInk } from "../screens/settings/settings-model";
import { useWrenName } from "../lib/wren-name";
import { useReportFlow, type ReportContext, type ReportFlow, type ReportTarget } from "../lib/report-flow";
import { LeaveSheet } from "./LeaveSheet";
import "../data/strings-step5-platform"; // rp.menu.a11y

/* Report / block (App Store requirement for anonymous UGC). Wired to the
   backend reports + blocks tables — three distinct reporters auto-suspend
   a writer server-side.
   ────────────────────────────────────────────────────────────────────────
   A MENU, NOT A LECTURE (owner, 2026-09-20). This used to open a sheet
   with a title, a paragraph about how nobody knows who anyone is, and
   then the two buttons. The person tapping ⋯ has already decided
   something is wrong; what they need is the three choices, the way the
   phone's own ⋯ gives them: report, block, never mind. The card drops
   from the ⋯ itself, so it reads as belonging to the thing it is about.

   Report is one tap and a small confirmation line. Block still asks once,
   in one sentence, because it closes a road both ways.

   A FAILURE SAYS SO (2026-10-10, iOS safety gap 3): a report that didn't
   reach the server used to answer "Reported" all the same, and a block that
   failed walked you out of the room as if it had held. Now the card says it
   couldn't, and you stay where you were to try again.

   TWO PARTS (10a step 5). The flow is lib/report-flow (useReportFlow), so
   a Swift screen's own menu can start it; ReportSheet below draws its
   stages — the card and the block sheet — for any caller, and ReportMenu
   is the ⋯ plus that sheet, for the React Native screens. The card wears
   the theme: the 10a menu card (sf, a 2pt ln outline, a hard 3/3 ln
   shadow), rows in the theme's ink, block in the postal red. The ⋯ is a
   button VoiceOver can name (rp.menu.a11y).

   Midnight (7.1): the dim is black (scrimColor), and block's word takes
   Settings' red for a dark ground.

   LARGE TYPE AND VOICEOVER (a11y pass 2026-10-19, chat-02 / chat-06). The
   rows grow with their words (min 48) instead of overlapping at a fixed 48,
   the type stops at 1.6, and past 1.3 the card widens to the screen less
   32 (at most 320). The card is measured and kept on screen whatever `top`
   asks for (SignatureHold used to assume 200pt). The answer line takes
   VoiceOver's focus when it appears, so "it didn't go through" is heard —
   accessibilityLiveRegion is Android-only. A working row reads its words,
   busy, instead of "…". */

/** Draws a report flow's stages: the three choices, the one-line answer,
    the block question. Render it once per screen, anywhere — it is a
    window-level Modal. `top` places the card (default: just under the
    header, where the ⋯ usually is). `reportLabel` names the report row
    when it is about one thing in particular (identity Phase 2: "Report
    this signature", id2.rp.signature); rp.menu.report otherwise.
    `onDismiss` runs once the card's Modal has finished going (iOS) — a
    caller inside another sheet waits for it before closing that sheet. */
export function ReportSheet({ flow, top, reportLabel, onDismiss }: { flow: ReportFlow; top?: number; reportLabel?: string; onDismiss?: () => void }) {
  useLang();
  const wren = useWrenName();
  const insets = useSafeAreaInsets();
  const { t: tk, dark } = useTheme();
  const { stage, busy } = flow;
  const win = useWindowDimensions();
  const scale = PixelRatio.getFontScale();
  const cardW = scale > 1.3 ? Math.min(win.width - 32, 320) : 236;
  // measured once drawn; before that, three rows at their grown height
  const [cardH, setCardH] = useState<number | null>(null);
  const estH = 8 + 3 * Math.max(48, 15.5 * Math.min(scale, 1.6) * 1.3 + 24) + 9;
  const wantTop = top ?? insets.top + 50;
  const cardTop = Math.max(insets.top + 8, Math.min(wantTop, win.height - (cardH ?? estH) - insets.bottom - 8));
  const answer = stage === "sent" ? t("rp.reported", { wren }) : stage === "failed" ? t("rp.failed") : stage === "blockFailed" ? t("rp.blockFailed") : null;
  const answerRef = useRef<Text>(null);
  useEffect(() => {
    if (!answer) return;
    // the line itself takes the focus (it is read out, and Done is the next swipe)
    const id = setTimeout(() => {
      const node = answerRef.current ? findNodeHandle(answerRef.current) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
      else AccessibilityInfo.announceForAccessibility(answer);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);
  /* Block's word: the postal red is 4.2:1 on Midnight's card, so there it takes Settings' exits'
     red (dangerInk, 5.5:1; 4.7:1 pressed). The ban glyph keeps the postmark red. */
  const red = dark ? dangerInk(tk.ink, STATIC_P.post) : STATIC_P.post;

  // `working`: this row shows "…" while busy (its label is still what VoiceOver says)
  const Row = ({ label, icon, tone = "ink", working = false, onPress }: { label: string; icon: "flag" | "ban" | "none"; tone?: "ink" | "red"; working?: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: busy && working, disabled: busy }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, backgroundColor: pressed ? tk.soft2 : "transparent" })}
    >
      <View style={{ width: 20, alignItems: "center" }}>
        {icon === "flag" && (
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={tk.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 22V4" />
            <Path d="M4 4h12l-2 4 2 4H4" />
          </Svg>
        )}
        {icon === "ban" && (
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={STATIC_P.post} strokeWidth={1.8} strokeLinecap="round">
            <Circle cx={12} cy={12} r={9} />
            <Line x1={5.6} y1={5.6} x2={18.4} y2={18.4} />
          </Svg>
        )}
      </View>
      <Text maxFontSizeMultiplier={1.6} style={{ flexShrink: 1, fontFamily: PF.letter, fontSize: 15.5, color: tone === "red" ? red : tk.ink }}>
        {busy && working ? "…" : label}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible={stage !== null} transparent animationType="fade" onRequestClose={flow.close} onDismiss={onDismiss}>
      <Pressable onPress={flow.close} accessible={false} style={{ flex: 1, backgroundColor: scrimColor(dark, 0.14) }}>
        {stage !== null && stage !== "block" && (
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={flow.close}
            onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
            style={{
              position: "absolute",
              top: cardTop,
              right: 16,
              width: cardW,
              backgroundColor: tk.sf,
              // (owner, 2026-10-20: no black frame) the live app's look — a plain card, large
              // continuous corners, a soft shadow
              borderRadius: 22,
              borderCurve: "continuous",
              paddingVertical: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: dark ? 0.45 : 0.14,
              shadowRadius: 22,
            }}
          >
            {stage !== "menu" ? (
              <>
                {/* the confirmation lives in the same card — no second sheet */}
                <Text ref={answerRef} accessible accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.6} style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: tk.ink, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
                  {answer ?? t("rp.blockFailed")}
                </Text>
                <View style={{ height: 1, backgroundColor: tk.line, marginVertical: 2 }} />
                <Row label={t("wu.done")} icon="none" onPress={flow.close} />
              </>
            ) : (
              <>
                <Row label={reportLabel ?? t("rp.menu.report")} working icon="flag" onPress={() => void flow.report()} />
                <Row label={t("rp.menu.block")} icon="ban" tone="red" onPress={() => flow.askBlock()} />
                <View style={{ height: 1, backgroundColor: tk.line, marginVertical: 4 }} />
                <Row label={t("rp.menu.never")} icon="none" onPress={flow.close} />
              </>
            )}
          </View>
        )}
      </Pressable>

      <LeaveSheet
        open={stage === "block"}
        title={t("rp.blockTitle")}
        body={t("rp.blockBody")}
        actions={[{ label: t("rp.blockConfirm"), busy, kind: "destructive", onPress: () => void flow.block() }]}
        cancelLabel={t("set.neverMind")}
        onCancel={flow.close}
      />
    </Modal>
  );
}

/** The ⋯ that opens Report / Block, with its sheet — for a React Native
    screen. Draws nothing when there is no one to report (a correspondence
    whose other side is gone or not loaded). onBlocked runs once a block
    has held (and a "thread" context's thread is forgotten): the caller
    decides where to go. */
export function ReportMenu({
  targetUser,
  context,
  refId,
  threadId,
  snapshot,
  onBlocked,
  ring,
  reportLabel,
}: {
  targetUser?: string;
  context: ReportContext;
  refId?: string;
  /** the thread to forget after a block, when it isn't refId (a line in a room) */
  threadId?: string;
  snapshot?: ReportTarget["snapshot"];
  onBlocked?: () => void;
  /** the sticker-punch face: a small outlined ring instead of bare dots */
  ring?: boolean;
  /** the report row's words when it is about one thing (ReportSheet) */
  reportLabel?: string;
}) {
  useLang();
  const { t: tk } = useTheme();
  const flow = useReportFlow({ context, targetUser, refId, threadId, snapshot, onBlocked: () => onBlocked?.() });

  if (flow.nobody) return null;
  return (
    <>
      <Pressable
        onPress={flow.openMenu}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("rp.menu.a11y")}
        style={
          ring
            ? { width: 26, height: 26, borderRadius: 13, backgroundColor: tk.soft, alignItems: "center", justifyContent: "center" } // soft, no black ring (owner, 10-20)
            : { width: 42, height: 42, alignItems: "center", justifyContent: "center" }
        }
      >
        <Text style={ring ? { fontSize: 12, lineHeight: 14, color: tk.ink, fontFamily: PF.monoSemi } : { fontSize: 20, color: tk.ink, fontFamily: PF.mono }}>⋯</Text>
      </Pressable>

      {/* window-level, so it sits over whatever row the ⋯ is in */}
      <ReportSheet flow={flow} reportLabel={reportLabel} />
    </>
  );
}
