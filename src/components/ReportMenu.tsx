import { useState } from "react";
import { Modal, Pressable, Text } from "react-native";
import { t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { useWrenName } from "../lib/wren-name";
import { blockUser, reportContent } from "../lib/db";
import { LeaveSheet, openLeaveSheet } from "./LeaveSheet";

/* Report / block (App Store requirement for anonymous UGC). Wired to the
   backend reports + blocks tables — three distinct reporters auto-suspend
   a writer server-side.
   ────────────────────────────────────────────────────────────────────────
   THE LAST SYSTEM FURNITURE IN THE APP. This was ActionSheetIOS plus two
   Alert.alerts: rounded grey stacks and system type, in a product made of
   paper and hairlines. LeaveSheet already settled the argument for the
   composer — correct behaviour wearing the wrong face — and safety is the
   worst place to break character: the moment someone reaches for this menu
   is the moment they most need the room to feel like it is being run by
   someone. So the same sheet carries all three steps.

   The order is deliberate. Report is the quiet ruled button, block is the
   red one, and the easiest thing to hit is still NEVER MIND — most people
   who open this menu are looking, not acting. Nothing is reported or
   blocked until the second sheet; the first one only asks. */

type Stage = null | "menu" | "block" | "sent";

export function ReportMenu({
  targetUser,
  context,
  refId,
  snapshot,
  onBlocked,
}: {
  targetUser?: string;
  context: "letter" | "thread" | "message";
  refId?: string;
  snapshot?: string;
  onBlocked?: () => void;
}) {
  useLang();
  const wren = useWrenName();
  const [stage, setStage] = useState<Stage>(null);
  const [busy, setBusy] = useState(false);

  const report = async () => {
    if (busy) return;
    setBusy(true);
    await reportContent({ targetUser, context, refId, reason: "other", snapshot });
    setBusy(false);
    setStage("sent");
  };

  const block = async () => {
    if (busy) return;
    setBusy(true);
    if (targetUser) await blockUser(targetUser);
    setBusy(false);
    setStage(null);
    onBlocked?.();
  };

  return (
    <>
      <Pressable
        onPress={() => openLeaveSheet(() => setStage("menu"))}
        hitSlop={10}
        style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 20, color: P.ink, fontFamily: PF.mono }}>⋯</Text>
      </Pressable>

      {/* The ⋯ lives inside a header ROW, and LeaveSheet positions itself
          against its nearest parent — rendered inline it would open across
          the top of the page. The old ActionSheetIOS was window-level, so
          this never came up. A transparent Modal puts the sheet back at
          window level wherever the ⋯ is mounted. */}
      <Modal
        visible={stage !== null}
        transparent
        animationType="none"
        onRequestClose={() => !busy && setStage(null)}
      >
      <LeaveSheet
        open={stage === "menu"}
        title={t("rp.title")}
        body={t("rp.body", { wren })}
        actions={[
          { label: busy ? "…" : t("rp.report"), kind: "quiet", onPress: report },
          { label: t("rp.block"), kind: "destructive", onPress: () => setStage("block") },
        ]}
        cancelLabel={t("set.neverMind")}
        onCancel={() => !busy && setStage(null)}
      />

      <LeaveSheet
        open={stage === "block"}
        title={t("rp.blockTitle")}
        body={t("rp.blockBody")}
        actions={[{ label: busy ? "…" : t("rp.blockConfirm"), kind: "destructive", onPress: block }]}
        cancelLabel={t("set.neverMind")}
        onCancel={() => !busy && setStage(null)}
      />

      <LeaveSheet
        open={stage === "sent"}
        title={t("rp.reportedTitle")}
        body={t("rp.reportedBody", { wren })}
        actions={[]}
        cancelLabel={t("wu.done")}
        onCancel={() => setStage(null)}
      />
      </Modal>
    </>
  );
}
