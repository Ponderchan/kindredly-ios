import { Modal, Pressable, Text, View } from "react-native";
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
   Settings' red for a dark ground. */

/** Draws a report flow's stages: the three choices, the one-line answer,
    the block question. Render it once per screen, anywhere — it is a
    window-level Modal. `top` places the card (default: just under the
    header, where the ⋯ usually is). */
export function ReportSheet({ flow, top }: { flow: ReportFlow; top?: number }) {
  useLang();
  const wren = useWrenName();
  const insets = useSafeAreaInsets();
  const { t: tk, dark } = useTheme();
  const { stage, busy } = flow;
  /* Block's word: the postal red is 4.2:1 on Midnight's card, so there it takes Settings' exits'
     red (dangerInk, 5.5:1; 4.7:1 pressed). The ban glyph keeps the postmark red. */
  const red = dark ? dangerInk(tk.ink, STATIC_P.post) : STATIC_P.post;

  const Row = ({ label, icon, tone = "ink", onPress }: { label: string; icon: "flag" | "ban" | "none"; tone?: "ink" | "red"; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 48, backgroundColor: pressed ? tk.soft2 : "transparent" })}
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
      <Text style={{ fontFamily: PF.letter, fontSize: 15.5, color: tone === "red" ? red : tk.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={stage !== null} transparent animationType="fade" onRequestClose={flow.close}>
      <Pressable onPress={flow.close} accessible={false} style={{ flex: 1, backgroundColor: scrimColor(dark, 0.14) }}>
        {stage !== null && stage !== "block" && (
          <View
            accessibilityViewIsModal
            style={{
              position: "absolute",
              top: top ?? insets.top + 50,
              right: 16,
              width: 236,
              backgroundColor: tk.sf,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: tk.ln,
              paddingVertical: 4,
              // the 10a hard shadow: an offset, no blur (iOS needs radius 0 and full opacity)
              shadowColor: tk.ln,
              shadowOffset: { width: 3, height: 3 },
              shadowOpacity: 1,
              shadowRadius: 0,
            }}
          >
            {stage !== "menu" ? (
              <>
                {/* the confirmation lives in the same card — no second sheet */}
                <Text accessibilityLiveRegion="polite" style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: tk.ink, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
                  {stage === "sent" ? t("rp.reported", { wren }) : stage === "failed" ? t("rp.failed") : t("rp.blockFailed")}
                </Text>
                <View style={{ height: 1, backgroundColor: tk.line, marginVertical: 2 }} />
                <Row label={t("wu.done")} icon="none" onPress={flow.close} />
              </>
            ) : (
              <>
                <Row label={busy ? "…" : t("rp.menu.report")} icon="flag" onPress={() => void flow.report()} />
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
        actions={[{ label: busy ? "…" : t("rp.blockConfirm"), kind: "destructive", onPress: () => void flow.block() }]}
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
            ? { width: 26, height: 26, borderRadius: 13, borderWidth: 2.2, borderColor: tk.ln, alignItems: "center", justifyContent: "center" }
            : { width: 42, height: 42, alignItems: "center", justifyContent: "center" }
        }
      >
        <Text style={ring ? { fontSize: 12, lineHeight: 14, color: tk.ink, fontFamily: PF.monoSemi } : { fontSize: 20, color: tk.ink, fontFamily: PF.mono }}>⋯</Text>
      </Pressable>

      {/* window-level, so it sits over whatever row the ⋯ is in */}
      <ReportSheet flow={flow} />
    </>
  );
}
