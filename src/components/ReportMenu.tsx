import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { PUNCH } from "../theme/punch";
import { useWrenName } from "../lib/wren-name";
import { blockUser, forgetThread, reportContent } from "../lib/db";
import { LeaveSheet } from "./LeaveSheet";

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
   couldn't, and you stay where you were to try again. */

type Stage = null | "menu" | "block" | "sent" | "failed" | "blockFailed";

export function ReportMenu({
  targetUser,
  context,
  refId,
  snapshot,
  onBlocked,
  ring,
}: {
  targetUser?: string;
  context: "letter" | "thread" | "message";
  refId?: string;
  snapshot?: string;
  onBlocked?: () => void;
  /** the sticker-punch face: a small outlined ring instead of bare dots */
  ring?: boolean;
}) {
  useLang();
  const wren = useWrenName();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>(null);
  const [busy, setBusy] = useState(false);
  /* a correspondence whose other side is gone (account closed) or not yet
     loaded has no one to report or block — no ⋯ at all, rather than a menu
     whose every choice fails. A desk letter always carries its author. */
  const nobody = context === "thread" && !targetUser;

  const report = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await reportContent({ targetUser, context, refId, reason: "other", snapshot });
    setBusy(false);
    setStage(ok ? "sent" : "failed");
  };

  const block = async () => {
    if (busy) return;
    setBusy(true);
    const ok = targetUser ? await blockUser(targetUser) : null;
    setBusy(false);
    if (!ok) {
      setStage("blockFailed");
      return;
    }
    if (context === "thread" && refId) await forgetThread(refId);
    setStage(null);
    onBlocked?.();
  };

  const Row = ({ label, icon, tone = "ink", onPress }: { label: string; icon: "flag" | "ban" | "none"; tone?: "ink" | "red"; onPress: () => void }) => (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 48, backgroundColor: pressed ? "#F3F2FA" : "transparent" })}>
      <View style={{ width: 20, alignItems: "center" }}>
        {icon === "flag" && (
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 22V4" />
            <Path d="M4 4h12l-2 4 2 4H4" />
          </Svg>
        )}
        {icon === "ban" && (
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#C8412E" strokeWidth={1.8} strokeLinecap="round">
            <Circle cx={12} cy={12} r={9} />
            <Line x1={5.6} y1={5.6} x2={18.4} y2={18.4} />
          </Svg>
        )}
      </View>
      <Text style={{ fontFamily: PF.letter, fontSize: 15.5, color: tone === "red" ? "#C8412E" : P.ink }}>{label}</Text>
    </Pressable>
  );

  if (nobody) return null;
  return (
    <>
      <Pressable
        onPress={() => setStage("menu")}
        hitSlop={10}
        style={
          ring
            ? { width: 26, height: 26, borderRadius: 13, borderWidth: 2.2, borderColor: PUNCH.ink, alignItems: "center", justifyContent: "center" }
            : { width: 42, height: 42, alignItems: "center", justifyContent: "center" }
        }
      >
        <Text style={ring ? { fontSize: 12, lineHeight: 14, color: PUNCH.ink, fontFamily: PF.monoSemi } : { fontSize: 20, color: P.ink, fontFamily: PF.mono }}>⋯</Text>
      </Pressable>

      {/* window-level, so it sits over whatever row the ⋯ is in */}
      <Modal visible={stage !== null} transparent animationType="fade" onRequestClose={() => !busy && setStage(null)}>
        <Pressable onPress={() => !busy && setStage(null)} style={{ flex: 1, backgroundColor: "rgba(17,17,19,0.14)" }}>
          {stage !== null && stage !== "block" && (
            <View
              style={{
                position: "absolute",
                top: insets.top + 50,
                right: 16,
                width: 236,
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                paddingVertical: 4,
                shadowColor: "#000",
                shadowOpacity: 0.16,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
              }}
            >
              {stage !== "menu" ? (
                <>
                  {/* the confirmation lives in the same card — no second sheet */}
                  <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: P.ink, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>{stage === "sent" ? t("rp.reported", { wren }) : stage === "failed" ? t("rp.failed") : t("rp.blockFailed")}</Text>
                  <View style={{ height: 1, backgroundColor: P.ink12, marginVertical: 2 }} />
                  <Row label={t("wu.done")} icon="none" onPress={() => setStage(null)} />
                </>
              ) : (
                <>
                  <Row label={busy ? "…" : t("rp.menu.report")} icon="flag" onPress={report} />
                  <Row label={t("rp.menu.block")} icon="ban" tone="red" onPress={() => setStage("block")} />
                  <View style={{ height: 1, backgroundColor: P.ink12, marginVertical: 4 }} />
                  <Row label={t("rp.menu.never")} icon="none" onPress={() => setStage(null)} />
                </>
              )}
            </View>
          )}
        </Pressable>

        <LeaveSheet
          open={stage === "block"}
          title={t("rp.blockTitle")}
          body={t("rp.blockBody")}
          actions={[{ label: busy ? "…" : t("rp.blockConfirm"), kind: "destructive", onPress: block }]}
          cancelLabel={t("set.neverMind")}
          onCancel={() => !busy && setStage(null)}
        />
      </Modal>

    </>
  );
}
